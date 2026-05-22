# Known Limitations

This file records limitations that are real constraints on the current
implementation — not bugs, but intentional simplifications or deferred
features. Each entry names the affected area, describes the limitation,
explains why it exists, and points to where the fix belongs.

---

## Parser (remark-acadamark)

### Sigil tags with trailing whitespace before EOL are treated as inline

**What this means:** A sigil tag such as `<$ math $>   ` (trailing spaces
before the end of line) will be matched by the text-position (inline) tokenizer
rather than the flow (block-level) tokenizer. The tag renders inline inside a
paragraph rather than as a standalone block element.

**Example:**

```
<$ E = mc^2 $>   
```

(three trailing spaces before the line ending)

**Workaround:** Remove trailing whitespace after the closing `>` on lines where
a flow tag is intended.

**Why it exists:** The flow tokenizer's `afterClose`/`afterGt` guard rejects the
match when any non-EOL character follows `>`. Trailing spaces are non-EOL
characters, so the flow match is rejected and the text tokenizer takes over.
Refining the guard to skip trailing whitespace is deferred.

**Where the fix belongs:** `packages/remark-acadamark/src/syntax.js` —
`makeSigilTagTokenizer.afterClose` and `makeNamedTagTokenizer.afterGt`.

---

## Notes plugin (acadamark-interpreter)

### Sidenotes render as fallback list items, not margin notes

**What this means:** Notes authored with `placement=side` are collected into
the note-list in `article-back` like endnotes, with a `sidenote-fallback`
class on the `<li>`. They do not appear in the page margin.

**Workaround:** Themes can detect `<li class="sidenote-fallback">` and
reposition items into the margin with CSS or JavaScript.

**Why it exists:** Margin positioning requires knowledge of the page layout
and is inherently display-layer work. The interpreter emits the flag; the
theme provides the repositioning. No built-in margin theme exists yet.

**Where the fix belongs:** A future theme (CSS + JS) that extracts
`.sidenote-fallback` items and positions them alongside their markers.

### Per-section footnote collection is not implemented

**What this means:** Notes authored with `placement=foot` collect into a
single note-list in `article-back`, not at the bottom of the section where
the note appears.

**Why it exists:** Per-section collection requires parent pointers during the
tree walk. The current `walkAndReplace` implementation does not carry parent
context. This is deferred to a later slice.

**Where the fix belongs:** `packages/acadamark-interpreter/src/plugins/notes.js`
— the `walkAndReplace` loop needs a parent-aware variant, and
`findOrCreateArticleBack` needs a `findOrCreateSectionFoot` counterpart.

---

## Asset bundling (acadamark-interpreter)

### KaTeX fonts are not included in inline-CSS mode

**Status: Fixed (2026-Q2 audit, AUD-10 + AUD-11 + AUD-16).**

KaTeX font URLs are now patched to base64 data URIs by `patchKatexFontUrls()` in `src/assets/font-loader.js`. Inter and Source Code Pro body fonts are bundled as subsetted woff2 files via `getDocumentFontsCss()`. Both are wired into `src/index.js`: KaTeX CSS is injected conditionally (when math is present), document fonts are injected unconditionally (every document has body text). Self-contained HTML renders correctly offline from `file://`.

The limitation below was accurate before the font-loader work and is retained for history:

---

## Layer 1 vocabulary

### Custom element tags in HTML output are not registered with the browser

**What this means:** Layer 1 elements such as `<note-list>`, `<article-body>`,
`<article-front>`, etc., are emitted as custom HTML elements without a
corresponding `customElements.define()` call. Browsers treat them as
`HTMLElement` instances, which is fine for CSS targeting but means they have
no built-in behavior or ARIA semantics.

**Why it exists:** Registering custom elements is an application-layer
concern. The interpreter emits HTML; behavior is added by themes or host
applications.

**Where the fix belongs:** Not a bug — by design. Host applications that need
ARIA or interactive behavior should register custom elements themselves.

---

## Cross-reference plugin (Slice 4)

### Only colon-ids are referenceable

**What this means:** `<ref #eqn:model>` resolves correctly. `<ref #figure-3>` (no colon) produces a `ref-error` marker, even if `figure-3` is a valid id in the document.

**Why it exists:** The label index in the registry only stores colon-ids. This is intentional: colon-ids follow the `type:name` convention and unambiguously identify targets across types. Non-colon ids are stored on the registry entry but not in the label index map.

**Workaround:** Use colon-ids for all referenceable elements (`fig:scatter`, `eqn:model`, `sec:methods`, etc.).

**Where the fix belongs:** `packages/acadamark-interpreter/src/lib/registry.js` — extend label index to include all ids, or add a separate `idIndex`. Deferred.

### `format` and `type` kwargs on `<ref>` are ignored

**What this means:** `<ref #eqn:model format=number>` and `<ref #fig:scatter type=figure>` are parsed correctly, but the kwargs have no effect. The rendered label is always the prefix-dictionary default: `equation N` for equations, `figure N` for figures, `note N` for notes (where the prefix word comes from `DEFAULT_PREFIXES` keyed by the id prefix, and may be overridden by `<config ref-prefix-eqn="...">`).

**Why it exists:** Format variants require additional design (how does "number-only" vs "full" rendering differ per type?). Deferred to a later slice.

**Where the fix belongs:** `packages/acadamark-interpreter/src/handlers/ref.js` — `refMarkerHandler` should read `node.kwargs.format` and switch label generation accordingly.

### Author-supplied pipe content in `<ref>` is ignored

**What this means:** `<ref #fig:scatter | see the scatter plot>` is parsed (the pipe content is stored) but the custom text is not used. The handler always generates the automatic label.

**Why it exists:** Custom pipe content requires recursive parsing (the content could contain inline math, etc.), which is deferred to the recursive-content slice.

**Where the fix belongs:** Recursive-content slice — `ref.js` handler should use pipe content as link text when present.

### Note cross-references require colon-ids

**What this means:** Notes with auto-generated ids (`note-1`, `note-2`) cannot be referenced with `<ref>`. Only notes authored with an explicit colon-id (`<note #note:galton | ...>`) are in the label index.

**Why it exists:** Same as the colon-id restriction above. Auto-ids do not contain colons and are therefore not indexed.

**Workaround:** Author notes that need cross-referencing with explicit colon-ids.

---

## Citations plugin (Slice 6)

### Multi-key citations are sorted alphabetically, not in citation order

**What this means:** `<cite Jones2019, Smith2020>` renders in whatever order
chicago-author-date (or the active CSL style) dictates — typically
alphabetical by author surname — rather than the order the keys were written
by the author.

**Example:** `<cite Zhao2021, Adams2010>` may render as "(Adams, 2010; Zhao,
2021)" regardless of the authored key order.

**Why it exists:** citation-js delegates multi-key formatting entirely to the
CSL processor (citeproc-js). For most CSL styles, the processor sorts entries
by author name or date when multiple keys are cited together. Overriding that
sort order would require patching the CSL output or implementing a custom sort
layer on top of citation-js.

**Workaround:** For citation-order-sensitive bibliographies, use a numeric CSL
style such as `vancouver` or `ieee` (which orders by citation sequence, not
author name) via the `<config citation-style="...">` key. Or accept alphabetical
order and note that most author-date styles (APA, Chicago) conventionally sort
multi-key citations alphabetically.

**Where the fix belongs:** Not currently planned. If needed, a post-processing
step in `cite-resolution.js` could intercept `cite.format('citation', ...)` and
reconstruct the output with keys in the authored order.

### `<library src="..."/>` self-closing form is broken for DSL-registry tags

See AUD-08 in `notes/audit-findings.md`. Workaround: use empty-body long-form
`<library src="refs.bib">\n</library>`.
