# Citations Investigation (Slice 6 Phase 0)

Initial investigation: May 2026. Updated after parser-maturity slice (see revision notes at top of each section that changed).

---

## Q1: citation-js installation

- **Version**: 0.7.22 (current as of npm query)
- **License**: MIT
- **Unpacked size**: ~6.4 MB (transitive deps add ~97 packages)
- **Installation**: `npm install citation-js` in `acadamark-interpreter` — succeeded cleanly
- **Runtime**: Node only; not bundled into HTML output. Used exclusively at interpret time.

**Verdict**: Tractable. Installed and confirmed working.

---

## Q2: citation-js API surface

### BibTeX parsing

```javascript
import Cite from 'citation-js';
const cite = new Cite(bibtexString); // auto-detects format
cite.data.length;           // number of entries
cite.data.map(e => e.id);   // array of entry keys
```

Auto-detection works on BibTeX and CSL JSON strings natively.

### Inline citation formatting

```javascript
cite.format('citation', {
  entry: ['Loomes2017'],
  template: 'chicago-author-date',
  format: 'html',
  lang: 'en-US',
})
// → "(Loomes et al., 2017)"
```

Multiple keys:
```javascript
cite.format('citation', {
  entry: ['Loomes2017', 'Caldwell-Harris2023'],
  template: 'chicago-author-date',
  format: 'html',
})
// → "(Caldwell-Harris & Schwartz, 2023; Loomes et al., 2017)"
```

Note: The `entry` array filters which entries to include, but **does not control output order**. citation-js always outputs alphabetically by author regardless of the `entry` array order. For chicago-author-date this is correct behaviour.

### Missing key behaviour

`cite.format('citation', { entry: ['NONEXISTENT'], ... })` **throws** with `Cannot find entry with id 'NONEXISTENT'`. Must pre-check with `cite.data.find(e => e.id === key)` before calling `format`.

### Bibliography formatting

```javascript
cite.format('bibliography', {
  entry: ['Loomes2017'],          // filter to cited entries only
  template: 'chicago-author-date',
  format: 'html',
  lang: 'en-US',
})
```

Output structure:
```html
<div class="csl-bib-body">
  <div data-csl-entry-id="Loomes2017" class="csl-entry">
    Loomes, M., Hull, L., &amp; Mandy, W. (2017). ...
  </div>
</div>
```

Output is always sorted alphabetically by author — the `entry` array order is **ignored** for bibliography ordering. Per-entry rendering (one key at a time) gives individual HTML snippets that can have `id="ref-{key}"` added.

### Supported styles (out-of-box)

`chicago-author-date`, `apa`, and `harvard1` all work without installing extra CSL files. These are bundled into citation-js. Other styles may require fetching CSL files at runtime.

### CSL JSON auto-detection

Works natively — `new Cite(jsonString)` where the JSON matches the CSL schema is detected and parsed.

---

## Q3: Parser behaviour for new tag forms

**REVISED after parser-maturity slice.** Several findings from the initial investigation are now stale. The parser-maturity slice added: comma-separated positionals, registration of `data` and `library` in DSL_REGISTRY, and self-closing `<tag />` syntax.

| Tag form | Result |
|---|---|
| `<cite Smith2020>` | ✅ `positional: ['Smith2020']` |
| `<cite Smith2020 Jones2019>` | ✅ `positional: ['Smith2020', 'Jones2019']` |
| `<cite Smith2020,Jones2019>` | ✅ `positional: ['Smith2020', 'Jones2019']` (comma separator added) |
| `<cite \| Smith2020,Jones2019>` | ✅ `content: " Smith2020,Jones2019"` |
| `<cite>Smith2020</cite>` (HTML long-form) | ❌ `content: null` — `cite` not in DSL_REGISTRY |
| `<library src="refs.bib">\n</library>` | ✅ `kwargs: { src: 'refs.bib' }, content: '\n'` |
| `<library>\n@article{...}\n</library>` | ✅ long-form, `content: '\n@article{...}\n'`, opaque |
| `<data>\n<library>...\n</library>\n</data>` | ✅ nesting works after recursive-content step |
| `<library src="refs.bib" />` | ❌ `acadamarkTagError` — **new critical finding** |

### RESOLVED: comma-separated positionals now work

Previous finding: "commas break the grammar". Fixed in parser-maturity slice (PM-1..5).
`<cite Smith2020,Jones2019>` → `positional: ['Smith2020', 'Jones2019']`. Both space-separated and comma-separated positionals are canonical.

### RESOLVED: `<data>/<library>` nesting now works

Previous finding: "`<data>` nesting doesn't work". Fixed in parser-maturity slice: `data` and
`library` registered in DSL_REGISTRY. Long-form nesting with `remarkRecursiveContent` now
works correctly.

After `processor.runSync(parser.parse('<data>\n<library>\n@bib\n</library>\n</data>')):`
- `data.content` = array `[libraryNode]`
- `libraryNode.content` = `'\n@bib\n'` (opaque string — `remarkRecursiveContent` skips it)

### NEW critical finding: `<library src="refs.bib" />` self-closing is broken

`<library src="refs.bib" />` inside `<data>` produces `acadamarkTagError`, not a parsed tag.

**Root cause**: `library` is in DSL_REGISTRY. The long-form tokenizer in `syntax.js` takes
precedence for all registered tags at block level. After reading the `/>` (the `/` is consumed
as a regular attribute character, not self-closing signal), the `>` followed by a line ending
triggers long-form mode. It then fails to find `</library>` and produces `acadamarkTagError`.

`syntax.js` has no self-closing awareness — the self-closing recognition happens only in the
Peggy grammar (parse phase), not the micromark tokenizer (scan phase).

**Supported forms for `<library>`:**
1. `<library>\n@article{...}\n</library>` — long-form with inline BibTeX ✓
2. `<library src="refs.bib">\n</library>` — long-form with external file via `src=` ✓
3. `<library src="refs.bib" />` — **broken** (produces acadamarkTagError) ✗

The self-closing `<library />` fix requires modifying `syntax.js` to detect `/>` and suppress
long-form. Deferred to a future slice.

---

## Q4: Article structuring and `<data>` placement

**REVISED after parser-maturity slice.** Nesting now works; the design conflict is resolved.

Current `article-structuring.js`:

```javascript
const BACK_MATTER_TAGS = new Set(['data', 'config', 'bibliography', 'note-list']);
```

`<data>` is in `BACK_MATTER_TAGS` → currently goes to `<article-back>`. But the slice spec
requires `<data>` as a **top-level sibling of `<article>`** at document root (not inside back
matter), because:
1. `<data>` is processed data (citation registry), not rendered document content
2. `library-load` plugin walks `tree.children` directly — cleaner to find it at root

**Required change**:
- Remove `'data'` from `BACK_MATTER_TAGS`
- In the partitioning loop, collect `<data>` nodes separately into `dataSiblings`
- Final: `tree.children = [article, ...dataSiblings]`

`<library>` does NOT need its own BACK_MATTER_TAGS entry — it lives inside `<data>`, which is at root. The library-load plugin walks `<data>.content` directly.

---

## Q5: Notes auto-placement pattern

`notes.js` pattern:
1. Collect note data during a tree walk (`walkAndReplace`)
2. After the walk, call `findOrCreateArticleBack(tree.children)` to get or create the `<article-back>` region
3. Build a `__note-list` node and `back.content.unshift(noteList)` — prepend it to back content

The unshift means notes appear before other back-matter content (like bibliography). If bibliography is also placed in `<article-back>`, it should `push` (append) to appear after notes.

**Spec says** bibliography renders at "end of `<article-body>`". But notes go to `<article-back>`, and JATS convention places `<ref-list>` in `<back>`. Placing bibliography in `<article-back>` (not `<article-body>`) is more consistent with the project's JATS aspirations and with how notes work.

---

## Q6: Injection guard

Current guard in `src/index.js` (after Slice 5 fix):

```javascript
if (hoverMode !== 'skip' && (hasNoteMarkers(hast) || hasRefLinks(hast))) {
```

Both `hasNoteMarkers` and `hasRefLinks` are plain recursive `.some()` walks — no imports, no early exit sentinel. The same pattern applies for `hasCiteLinks`.

For `<cite>` elements, the hast will have `tagName: 'cite'` and `className: ['cite']` (per spec). The new helper:

```javascript
function hasCiteLinks(node) {
  if (
    node.type === 'element' &&
    node.tagName === 'cite' &&
    Array.isArray(node.properties?.className) &&
    node.properties.className.includes('cite')
  ) {
    return true;
  }
  return (node.children ?? []).some(hasCiteLinks);
}
```

Guard becomes: `(hasNoteMarkers(hast) || hasRefLinks(hast) || hasCiteLinks(hast))`.

---

## Design questions for Ariel

### DQ-1: Cite syntax — RESOLVED

Initial finding: "comma-separated positionals don't parse." Fixed in parser-maturity slice.

Both forms now work:
- `<cite Smith2020,Jones2019>` → `positional: ['Smith2020', 'Jones2019']` ✓
- `<cite Smith2020 Jones2019>` → same ✓

Canonical form: positional (space or comma separated). No decision needed from Ariel.

### DQ-2: `<data>` wrapper — RESOLVED

Initial finding: "`<data>/<library>` nesting doesn't work." Fixed in parser-maturity slice.

`<data>\n<library>...\n</library>\n</data>` now works after `remarkRecursiveContent`.
`<data>` as root sibling + `<library>` inside it is achievable and is the implementation plan.

No decision needed from Ariel.

### DQ-3: Bibliography placement — CONFIRMED

Bibliography renders in `<article-back>` (after notes), consistent with JATS and the existing notes pattern. This matches the slice prompt requirement and the `findOrCreateArticleBack` pattern.

### DQ-4 (NEW): `<library src="refs.bib" />` self-closing broken

The self-closing form `<library src="refs.bib" />` does not work (see Q3). Authors must use
long-form syntax even for external-file references:

```
<library src="refs.bib">
</library>
```

This is awkward but functional. Ariel should be aware that the self-closing form is not available
until `syntax.js` is updated. For the slice, document-8 will use inline long-form content.

### DQ-5 (NEW): `library.md` vocab specifies `format` kwarg as required

`library.md` has `format: required: true` with values `[bibtex, csl-json, ris, endnote-xml, other]`. The implementation uses citation-js auto-detection (no `format` needed). Resolution options:
- Make `format` optional (add `default: auto`) in vocab
- Drop `format` entirely from vocab
- Keep `format` required but ignore it in the library-load plugin (bad)

**Recommendation**: Make `format` optional in the vocab with `default: auto-detect`. The library-load plugin reads `format` from kwargs if present, but falls back to auto-detection. This preserves authoring flexibility.

---

## Summary

citation-js is solid and ready to use. Updated summary after parser-maturity slice:

1. **Cite syntax resolved**: both `<cite Smith2020,Jones2019>` and `<cite Smith2020 Jones2019>` work.
2. **`<data>/<library>` nesting resolved**: works after parser-maturity slice. `<data>` should be root sibling, `<library>` inside.
3. **`<library src="refs.bib" />` is broken**: self-closing form not supported for DSL-registered tags. Use `<library src="refs.bib">\n</library>` instead.
4. **bibliography ordering**: citation-js always alphabetises — can't force citation-order with the `entry` array.
5. **bibliography format is `<div>`**: Add `id="ref-{key}"` to each `csl-entry` div for hover preview lookup.
6. **Missing key throws**: Pre-check with `cite.data.find(e => e.id === key)` before formatting.
7. **`library.md` vocab `format` kwarg**: specified as required but implementation uses auto-detect. Make `format` optional.
