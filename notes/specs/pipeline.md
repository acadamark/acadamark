# Pipeline

This document describes the acadamark processing pipeline: what stages run,
in what order, what each stage produces, and how they depend on each other.
For the implementation details of individual plugins and handlers, see
`notes/specs/interpreter.md`. For the authoring syntax at the source end of the
pipeline, see `notes/specs/shorthand-syntax.md`.

---

## 0. Mental model

Three ideas underlie the pipeline. Names that recur throughout the rest of
this document.

1. **A document is a tree, not a string.** Source text is parsed into a
   tree; transformations rewrite the tree; the tree is serialized back to
   text at the end. Tree transformations compose; regex on strings doesn't.

2. **Two tree dialects.** *mdast* is the markdown AST. *hast* is the HTML
   AST. Markdown parses to mdast; mdast converts to hast; hast serializes
   to HTML. Acadamark plugins live on one or both dialects.

3. **Named pieces of the ecosystem.** *remark* handles markdown ↔ mdast.
   *rehype* handles HTML ↔ hast. *unified* chains them together.
   *micromark* is the lower-level tokenizer used only when inventing
   genuinely new syntax (the acadamark shorthand). The acadamark
   interpreter does not use `remark-rehype` — it converts mdast to hast
   directly via `mdast-util-to-hast`, registered as the unified compiler.

---

## 1. Overview

Conceptually, the interpreter does four things — it **shapes** the tree
(recursive content parsing, normalization, article wrapping, section
nesting), it **indexes** the document's content into the registry
(configuration, citation library, notes, numbered elements,
cross-reference labels), it **numbers** what needs numbering
(equations, figures, tables, notes — one ordered pass per type), and it
**resolves** references and citations against the now-numbered registry.
The structural plugins below (Stage 3) realize that split even though
their phase boundaries are drawn for ordering rather than for conceptual
grouping. Reading the plugins in their pipeline order shows the
implementation; reading them as shape-index-number-resolve shows what
each is doing for the document.

An acadamark document goes through six stages to produce HTML output:

```
source text
    │
    ▼  Stage 1: Source → mdast
    │  remarkParse + remarkAcadamark
    │
    ▼  Stage 2: Recursive content parsing
    │  remarkRecursiveContent
    │
    ▼  Stage 3: mdast transforms (12 plugins)
    │  normalize markdown → config discovery → article structure →
    │  section nesting → citation index → notes → numbering →
    │  apply numbers → ref resolution → cite resolution →
    │  note placement → bibliography
    │
    ▼  Stage 4: mdast → hast
    │  toHast() with acadamarkTag custom handler
    │
    ▼  Stage 5: Asset injection
    │  Conditional CSS/JS prepended to hast tree
    │
    ▼  Stage 6: Serialization
    │  rehypeFormat() → toHtml()
    │
HTML string
```

The pipeline is wired by the `acadamarkInterpreter` unified plugin, which
registers all stages (2–6) on a single unified processor. The consumer provides
stage 1 (`remarkParse` + `remarkAcadamark`):

```js
const result = await unified()
  .use(remarkParse)
  .use(remarkAcadamark)
  .use(acadamarkInterpreter, options)
  .process(source);
```

**Delegated parser extensions auto-registered by the interpreter.**
`acadamarkInterpreter` also calls `this.use(remarkMath)` and
`this.use(remarkGfm)` on the outer processor (and includes both in the inner
processor passed to `remarkRecursiveContent`). This lets the parser tokenize
bare `$x$` / `$$x$$` math and bare GFM pipe tables anywhere in the source —
both at the top level and inside named-tag content. The resulting
`inlineMath` / `math` / `table` nodes are then rewritten to canonical
`acadamarkTag` nodes by `acadamarkNormalizeMarkdown` (Stage 3's first
plugin), so the rest of the pipeline only sees one node type. See AUD-20 in
`notes/archive/audit-findings-2026-05.md` for the Option-A normalization decision.

---

## 2. Stage 1: Source → mdast

**Plugins:** `remarkParse`, `remarkAcadamark` (consumer-provided).

**Input:** UTF-8 source text.

**Output:** mdast tree where:
- Standard Markdown constructs (paragraphs, emphasis, headings, fenced code,
  etc.) are represented as normal mdast node types.
- Acadamark shorthand tags (`<tag #id .class kwarg=value | content>` and sigil
  forms) are represented as `acadamarkTag` nodes with `content` as a raw string.

An `acadamarkTag` node after parsing looks like:

```js
{
  type: 'acadamarkTag',
  tagname: 'em',           // tag name or sigil ('$', '$$', '```', '`')
  id: 'my-id',             // from #my-id, or null
  classes: ['highlight'],  // from .highlight, or []
  kwargs: { lang: 'en' },  // from lang=en
  positional: ['Smith2020'], // positional arguments (before pipe in cite, etc.)
  booleans: { numbered: true }, // from +numbered or -numbered
  content: 'emphasized text',  // raw string between | and >
  contentHandler: 'default',   // 'default' | 'math' | 'math-display' | 'dsl' | 'table'
  isOpaqueContent: false,       // true for math, code, table data
}
```

For sigil tags (`<$ ... $>`, `<$$ ... $$>`, `` <``` ... ``` > ```, `` <` ... `> ``),
`isOpaqueContent` is `true` and `contentHandler` is set to the sigil-specific
handler name. The content string is the raw body (LaTeX source, code text,
table data).

For named tags with pipe content, `contentHandler` is `'default'` and
`isOpaqueContent` is `false`. The content is a raw string to be re-parsed.

**What Stage 1 does not do:** Named-tag content is left as a raw string in
this stage. Stage 2 re-parses it into a structured mdast subtree.

---

## 3. Stage 2: Recursive content parsing

**Plugin:** `remarkRecursiveContent`
**Source:** `packages/remark-acadamark/src/recursive-content.js`

**Input:** mdast tree with `acadamarkTag` nodes having string `content` fields.

**Output:** mdast tree with `acadamarkTag` nodes having `content: Node[]`
(parsed mdast arrays). Opaque-content nodes are unchanged.

**What it does:** For each `acadamarkTag` node with `contentHandler === 'default'`,
the raw `content` string is fed through an inner processor (`remarkParse +
remarkAcadamark`) and the resulting mdast is stored back onto the node. After
this step, `node.content` is a proper array of mdast nodes (possibly containing
nested `acadamarkTag` nodes).

**Inner processor:** Created by `acadamarkInterpreter` and passed as the
`{ processor }` option. It runs the same four parser plugins as the outer
processor — `remarkParse`, `remarkAcadamark`, `remarkMath`, `remarkGfm` —
but does NOT include `remarkRecursiveContent` (this plugin), the
normalization pass, or any structural plugins. Recursion into nested tags
is handled by the plugin's own tree walk. (The structural plugins all run
on the outer tree, after normalization has rewritten any delegated-parser
nodes produced on either surface.)

**Paragraph unwrapping:** Pipe text that resolves to a single paragraph (the
common case for prose content) is unwrapped to its inline children. This means
the node's content is `[text("emphasized text")]`, not
`[paragraph([text("emphasized text")])]`. The wrapping is re-applied during
hast conversion if the element's content type is `block` rather than `prose`.

**Depth limit:** Maximum recursion depth is 10. Nodes that would exceed this
are converted to `acadamarkParseError` nodes with `subtype: 'max-recursion-depth'`.

**Cross-reference:** `notes/specs/recursive-content-spec.md` for the full design,
including the mixed-content (escape-errors) path.

---

## 4. Stage 3: mdast transforms

Twelve plugins run in sequence, transforming the mdast tree. They are registered
on the unified processor in this order and run as unified transforms during
the `processor.run()` step.

### Phase 0 — Normalization

#### 4.0 acadamarkNormalizeMarkdown

**When:** First in Stage 3, immediately after `remarkRecursiveContent`. By
this point both the outer `remarkParse` run and the inner `remarkParse` run
(inside `remarkRecursiveContent`) have completed, so all delegated-parser
nodes (`inlineMath`, `math`, `table`) are present in the tree on both
surfaces.

**What it does:** Walks the tree and rewrites delegated-parser nodes to
canonical `acadamarkTag` nodes so that downstream structural and semantic
plugins see exactly one node type. Settled principle: *delegate the lexer,
own the node identity*.

| input node type | from | replacement |
|----------------|------|-------------|
| `inlineMath`   | `remark-math` | `acadamarkTag { tagname: '$',  isOpaqueContent: true,  contentHandler: 'math' }` |
| `math`         | `remark-math` | `acadamarkTag { tagname: '$$', isOpaqueContent: true,  contentHandler: 'math-display' }` |
| `table`        | `remark-gfm`  | `acadamarkTag { tagname: 'table', positional: ['md'], isOpaqueContent: true, contentHandler: 'table' }` |

For GFM tables, the structured `tableRow`/`tableCell` subtree is serialized
back to a GFM pipe-table string by `gfmTableToPipeString()` so the canonical
node is byte-identical (modulo whitespace) to what an authored `<table md |
...>` tag would carry. Inline markup inside cells (emphasis, links, inline
math) flattens to plain text and produces a `file.message()` warning —
authors who need rich cell content should write `<table md | ...>` directly.

**Dependencies:** `remarkRecursiveContent` (both outer and inner parses must
have completed).

**Must precede:** every structural plugin (Phase 1 onwards) — they all
assume one node type.

**Cross-reference:** AUD-20 in `notes/archive/audit-findings-2026-05.md` for the Option-A
decision; `packages/acadamark-interpreter/src/plugins/normalize-markdown.js`
for the implementation.

---

### Phase 1 — Discovery

#### 4.1 acadamarkConfigDiscovery

**When:** First after recursive-content parsing. The tree is still flat (not
yet wrapped in article structure).

**What it does:** Reads `<config>` blocks at root level and populates
`file.data.acadamarkConfig` with their kwargs. No tree modification.

**Output:** `file.data.acadamarkConfig = Map<string, string>`.

**Dependencies:** None (reads tree as-is after recursive-content).

**What must run before:** `remarkRecursiveContent` (so `<config>` node content
is parsed — config kwargs come from the tag's own kwargs, not its content, but
the tree must be stable).

---

### Phase 2 — Structural transformation

#### 4.2 acadamarkArticleStructuring

**What it does:** Wraps the document in the Layer 1 article structure.
Partitions root children into front / body / back / root-siblings buckets
and builds `<article>`, `<article-front>`, `<article-body>`, `<article-back>`.

After this step:
```
root
  article          (always present)
    article-front  (optional; contains <meta>)
    article-body   (optional; contains all body content)
    article-back   (optional; contains <config>, <bibliography>, <note-list>)
  data             (root sibling; outside <article>)
```

**Dependencies:** `remarkRecursiveContent` (needs parsed content to read
`<meta>` internals). `acadamarkConfigDiscovery` has already run (no dependency
between them — ordering is arbitrary).

**Limitation:** `book` and `book-part` document types are not handled. The
plugin emits a warning and returns without wrapping.

#### 4.3 acadamarkSectionNesting

**What it does:** Converts the flat body content into a nested section tree.
Each `section` / `sub-section` / `sub-sub-section` tag becomes a parent that
contains the content following it until the next peer or parent section.
Section titles (pipe content) are promoted to `section-title` /
`sub-section-title` / `sub-sub-section-title` child elements.

**Dependencies:** `acadamarkArticleStructuring` (sections must be inside
`article-body` for the walk to operate on the right content array).

**Tree shape after this step (example):**
```
article-body
  section
    section-title
      text("Introduction")
    paragraph(...)
    sub-section
      sub-section-title
        text("Background")
      paragraph(...)
  section
    section-title
      text("Methods")
    ...
```

---

### Phase 3 — Semantic processing

#### 4.4 buildCitationIndex

**What it does:** Finds `<data>` nodes at root level (outside `<article>`),
walks their `<library>` children, reads citation data (BibTeX or CSL-JSON)
from inline content or `src=` files, and stores a citation-js `Cite` instance
in `file.data.acadamarkCitations`. Called as an explicit index-build step in
`index.js` via an anonymous plugin wrapper (`acadamarkCitationIndex`), not as
`this.use(acadamarkLibraryLoad)`. The exported `acadamarkLibraryLoad` plugin
wrapper is kept for external callers.

**Output:**
```js
file.data.acadamarkCitations = {
  cite: Cite,          // citation-js instance; all entries
  order: [],           // filled by acadamarkCiteResolution
  style: string,       // CSL style (from config or default)
}
```

**Dependencies:** `acadamarkArticleStructuring` (needs `<data>` at root level).
`acadamarkConfigDiscovery` (reads `citation-style` from config).

**No-op case:** If there are no `<data>` nodes, `file.data.acadamarkCitations`
is not set. Cite resolution and bibliography will be no-ops.

#### 4.5 acadamarkNotes

**What it does:** Registers note elements (record-only). Walks the tree with
`discover()`, calls `registry.assign('note', id, { numbered: true })` for
each `<note>` node found, and stores `{ node, entry }` pairs in
`file.data.acadamarkNotesPending`. `<note>` nodes **stay in the tree** through
steps 4.7–4.9 so that any refs/cites inside note bodies are resolved before
placement. Actual marker splicing and note-list injection happen in
`acadamarkNotePlacement` (step 4.10).

**Output:** `file.data.acadamarkNotesPending` (array of `{ node, entry }` pairs);
registry note entries with slots claimed (numbers assigned later by step 4.6.5).

**Registry:** `registry.assign('note', id, { numbered: true })` per note node.
Sequential numbers are assigned in `acadamarkApplyNumbers` (step 4.6.5).

**Dependencies:** `remarkRecursiveContent` (note content must be parsed mdast),
`acadamarkSectionNesting` (tree structure stable).

#### 4.6 acadamarkNumbering

**What it does:** Registers `$$` (display-math), `figure`, and `table` nodes
with the registry (record-only); registers `section`, `sub-section`, and
`sub-sub-section` nodes for cross-reference lookup; and registers code-block
sigil nodes (tagname `` ``` ``) under registry type `code` for cross-reference
lookup. Stores `{ node, entry }` pairs for numbered elements in
`file.data.acadamarkNumberingPending`.

**Registered types:**

| visitor tagname | registry type | numbered? | purpose |
|-----------------|---------------|-----------|---------|
| `$$`            | `equation`    | yes (config-overridable) | sequential equation numbering |
| `figure`        | `figure`      | yes (config-overridable) | sequential figure numbering |
| `table`         | `table`       | yes (config-overridable) | sequential table numbering |
| `section`, `sub-section`, `sub-sub-section` | `section` | no | label-index entry for `<ref @sec:...>` (AUD-09) |
| `` ``` ``       | `code`        | no | label-index entry for `<ref @code:...>` (G4 / AUD-09) |

Section and code-block entries are `numbered: false` — they land in the
registry's label index (when their `id` contains `:`) so `findByLabel()` can
resolve them, but they do not get a sequential display number.

**Output:** `file.data.acadamarkNumberingPending`; registry entries for numbered
elements (numbers not yet assigned); `node.registryType` set on each numbered node.

**Dependencies:** `acadamarkNotes` (notes claim their registry slots first, so
note numbers are allocated before equation/figure/table numbers — convention,
not a hard dependency since they use separate type counters).

**Numbering decision priority:** `+numbered`/`-numbered` booleans → `numbered=true/false`
kwargs → document config (`number-equations`, etc.) → default `true`.

---

#### 4.6.5 acadamarkApplyNumbers

**What it does:** Assigns sequential display numbers to all registered numbered
elements in a single ordered pass, then writes them back to nodes.

**Calls:**
1. `registry.numberRegistry()` — assigns `entry.number` for all registered entries.
2. `fillNumbering(file)` — sets `node.computedNumber = entry.number` for each entry
   in `file.data.acadamarkNumberingPending`.

**Output:** `node.computedNumber` set on all registered numbered elements.

**Dependencies:** `acadamarkNotes` (step 4.5) and `acadamarkNumbering` (step 4.6)
— all registration must be complete before numbering is computed.

**Must precede:** `acadamarkRefResolution` (step 4.7) — ref resolution reads
`entry.number` when building reference display text.

#### 4.7 acadamarkRefResolution

**What it does:** Replaces every `<ref>` node with a `__ref-marker` (target
found in label index) or `__ref-error` (target not found) internal node.

**Dependency on numbering:** Must run after `acadamarkApplyNumbers` (step 4.6.5)
so that all numbered elements have `computedNumber` set and their colon-ids are
in the label index.

**Reference text:** Computed from the id prefix and the entry number. Known
prefixes (`eqn`, `fig`, `note`, `tab`, `sec`, etc.) produce labeled text
("equation 3", "figure 1"). Unknown prefixes produce just the number. Unnumbered
targets produce the label-tail. Config key `ref-prefix-{prefix}` overrides.

**Known limitation:** Only colon-ids are referenceable. Non-colon ids produce
`__ref-error`.

#### 4.8 acadamarkCiteResolution

**What it does:** Replaces every `<cite>` node with `__cite-marker` and/or
`__cite-error` internal nodes. Builds `citations.order` (first-cited key order).

**Dependency:** `buildCitationIndex` (step 4.4; needs `file.data.acadamarkCitations`).
If citations were not loaded, this plugin is a no-op.

**Citation keys:** Extracted from `node.atRefs` (canonical: `<cite @Smith2020>` or `<cite @Smith2020 @Jones2019>`), `node.positional` (bracketed form: `<cite [@Smith2020, @Jones2019]>`, `@` stripped per item), `node.content` as string (pipe form), or parsed content text (defensive path).

**Mixed case:** When some keys are found and some missing, the replacement is
`[__cite-marker, __cite-error]` — both nodes appear inline in the output.

---

#### 4.9 acadamarkNotePlacement

**What it does:** Splices `__note-marker` nodes in place of `<note>` nodes,
builds `__note-list-item` nodes from the now-resolved note content, and injects
a `__note-list` into `<article-back>`.

**Why after cite-resolution:** `<note>` nodes were left in the tree through
steps 4.7–4.8 so that any refs/cites inside note bodies were resolved. By
step 4.9, note content arrays contain `__ref-marker`/`__cite-marker` nodes
instead of raw `<ref>`/`<cite>` tags.

**Output:** `<note>` nodes replaced by `__note-marker` nodes; a `__note-list`
node containing `__note-list-item` nodes prepended to `article-back.content`.

**Tree walk:** Uses `walkReplace()` from `lib/walk-replace.js`.

**Dependencies:** `acadamarkCiteResolution` (step 4.8; note content must be
resolved), `acadamarkApplyNumbers` (step 4.6.5; `entry.number` must be set).

---

#### 4.10 acadamarkBibliography

**What it does:** Renders the full bibliography via citation-js and injects
a `__bibliography` node into `<article-back>`. If the author placed an explicit
`<bibliography>` tag, it is replaced in-place. Otherwise, the bibliography is
appended (pushed) to article-back.

**Dependency:** `acadamarkCiteResolution` (needs `citations.order` to be
populated with the first-cited key list).

**Empty case:** If `citations.order.length === 0`, any author-placed
`<bibliography>` tag is removed. Nothing else is done.

**id injection:** Each `.csl-entry` div in the bibliography HTML gets
`id="ref-{KEY}"` injected, enabling hover-preview JavaScript to locate
entries by key.

---

## 5. Stage 4: mdast → hast

**Function:** `toHast(tree, { handlers: { acadamarkTag: tagHandler }, allowDangerousHtml: true })`
from `mdast-util-to-hast`.

**Not remark-rehype:** The interpreter uses `mdast-util-to-hast` directly.
`remark-rehype` is not installed. The compile step is registered as
`this.compiler` (the standard unified stringify API), not as a rehype plugin.

**What `toHast` does:**

- Standard mdast node types (paragraph, emphasis, heading, etc.) are converted
  by built-in mdast-util-to-hast rules.
- `acadamarkTag` nodes call the custom handler registered in `handlers.acadamarkTag`.

**The custom handler** dispatches through:

1. INTERNAL_REGISTRY (plugin-created nodes like `__note-marker`)
2. Vocabulary lookup (via sigil translation + `vocabulary.get(key)`)
3. HANDLER_REGISTRY (for `interpreter_strategy: handler` entries)
4. Schema dispatch (for `interpreter_strategy: schema` entries)

For schema elements, hast properties are built from vocabulary attribute
mappings; children are converted from the node's content array.

For handler elements (math, figure, table, code), dedicated handler functions
build the hast tree directly.

`allowDangerousHtml: true` is required for:
- KaTeX HTML output (emitted as raw hast nodes)
- Citation HTML from citation-js (may contain markup like `<i>`)
- Table raw HTML escape-hatch mode
- Bibliography HTML

**See also:** `notes/specs/interpreter.md`, section 5 (Handler dispatch) and
section 6 (Schema dispatch) for full dispatch details.

---

## 6. Stage 5: Asset injection

**When:** After `toHast()` produces the hast tree, before formatting/serialization.

**What:** Conditional CSS and JavaScript nodes prepended to `hast.children`.

**KaTeX CSS:** Prepended if the hast tree contains `inline-math` or
`display-math` elements. In `'inline'` mode: a `<style>` block with the full
KaTeX CSS (font URLs replaced with base64 data URIs). In `'link'` mode: a
`<link>` to the CDN. In `'skip'` mode: nothing.

**Hover preview assets:** Prepended if the hast tree contains any of:
- `<sup>` elements with `data-note-id` (note markers)
- `<a>` elements with `class="ref"` (resolved cross-references)
- `<cite>` elements with `class="cite"` (resolved citations)

In `'inline'` mode: one `<style>` (Tippy.js CSS + hover-preview.css) and one
`<script>` (Popper.js + Tippy.js + hover-preview.js init script). In `'link'`
mode: CDN `<link>` and `<script src>` elements plus local files inline.

**Lazy loading:** All asset content is read from disk on first use and cached
in module-level variables. The assets are not read at all when not needed
(no math → no KaTeX CSS read; no notes/refs/cites → no hover assets read).

---

## 7. Stage 6: Serialization

**Functions:** `rehypeFormat()(hast)` then `toHtml(hast, { allowDangerousHtml: true })`.

**`rehypeFormat`:** Adds indentation and newlines to block-level elements.
Leaves inline content, `<style>` bodies, and `<script>` bodies unchanged.
Result is human-readable HTML.

**`toHtml`:** Serializes the hast tree to a string. `allowDangerousHtml: true`
is required to emit raw-node values verbatim (KaTeX output, citation HTML).

**Output:** A UTF-8 HTML string. Not a full HTML document (no `<html>`,
`<head>`, `<body>` wrappers). The output is a fragment intended to be embedded
in a host page, or used as a standalone body content block.

---

## 8. Plugin ordering and dependencies

The table below summarizes which plugins produce what, and what each one needs
to have run before it.

| Plugin | Must run after | Produces |
|--------|---------------|---------|
| `remarkRecursiveContent` | `remarkAcadamark` (string content set) | `node.content` as `Node[]` |
| `acadamarkNormalizeMarkdown` | `remarkRecursiveContent` (both outer and inner parses complete) | delegated-parser nodes (`inlineMath`, `math`, `table`) rewritten to canonical `acadamarkTag` nodes |
| `acadamarkConfigDiscovery` | `acadamarkNormalizeMarkdown` | `file.data.acadamarkConfig` |
| `acadamarkArticleStructuring` | `remarkRecursiveContent` | article structure nodes; `<data>` at root |
| `acadamarkSectionNesting` | `acadamarkArticleStructuring` | nested section tree |
| `buildCitationIndex` | `acadamarkArticleStructuring`, `acadamarkConfigDiscovery` | `file.data.acadamarkCitations` |
| `acadamarkNotes` | `remarkRecursiveContent`, `acadamarkSectionNesting` | `file.data.acadamarkNotesPending`; registry note slots |
| `acadamarkNumbering` | `acadamarkNotes` | `file.data.acadamarkNumberingPending`; `node.registryType` |
| `acadamarkApplyNumbers` | `acadamarkNotes`, `acadamarkNumbering` | `node.computedNumber`; label index entries |
| `acadamarkRefResolution` | `acadamarkApplyNumbers` | `__ref-marker`, `__ref-error` |
| `acadamarkCiteResolution` | `buildCitationIndex` | `__cite-marker`, `__cite-error`, `citations.order` |
| `acadamarkNotePlacement` | `acadamarkCiteResolution`, `acadamarkApplyNumbers` | `__note-marker`, `__note-list`, `__note-list-item` |
| `acadamarkBibliography` | `acadamarkCiteResolution` | `__bibliography` |
| compiler (toHast) | all mdast transforms | hast tree |
| asset injection | compiler | CSS/JS nodes prepended to hast |
| serialization | asset injection | HTML string |

**Critical ordering constraints:**

- `remarkRecursiveContent` must precede all structural plugins. Structural
  plugins read node content (e.g., `<meta>` internals, note content) as parsed
  mdast arrays; they cannot work with raw strings.
- `acadamarkNormalizeMarkdown` must precede every Phase 1+ plugin. After
  normalization, the structural and semantic plugins only ever see
  `acadamarkTag` nodes — never raw `inlineMath`, `math`, or GFM `table` nodes.
  Running any structural plugin first would mean some code paths see two node
  representations for the same construct.
- `acadamarkApplyNumbers` must precede `acadamarkRefResolution`. Cross-references
  look up by label; labels are only in the registry after `numberRegistry()` has
  assigned numbers and `fillNumbering` has written them to nodes.
- `acadamarkCiteResolution` must precede `acadamarkBibliography`. The bibliography
  assembles from `citations.order`, which is populated during cite resolution.
- `acadamarkCiteResolution` must precede `acadamarkNotePlacement`. Note bodies
  may contain `<cite>` tags; those must be resolved before note content is moved
  to article-back.
- `buildCitationIndex` must precede `acadamarkCiteResolution`. Cite resolution
  needs the citation-js instance.
- `acadamarkArticleStructuring` must precede `buildCitationIndex`. Citation index
  build finds `<data>` by walking `tree.children` — the `<data>` nodes must be there.

---

## 9. Configuration

### 9.1 Plugin options

`acadamarkInterpreter(options)` accepts:

| option | type | default | description |
|--------|------|---------|-------------|
| `katexCss` | `'inline' \| 'link' \| 'skip'` | `'inline'` | KaTeX CSS delivery mode |
| `hoverPreviewMode` | `'inline' \| 'link' \| 'skip'` | `'inline'` | Hover preview asset delivery |
| `assetsDir` | `string \| null` | `null` | Base directory for `src=` file paths |

`assetsDir` is required when using `<library src="...">` or `<table src="...">`.
Without it, those elements produce warnings and skip the external file.

### 9.2 Document-level config

Authors can override pipeline behavior with `<config>` tags in the document.
These are processed by `acadamarkConfigDiscovery` and stored in
`file.data.acadamarkConfig`.

| key | type | consumed by | effect |
|-----|------|-------------|--------|
| `citation-style` | CSL style name | `buildCitationIndex` | Citation format (default: `chicago-author-date`) |
| `number-equations` | `'false'` | `acadamarkNumbering` | Suppress equation numbering |
| `number-figures` | `'false'` | `acadamarkNumbering` | Suppress figure numbering |
| `number-tables` | `'false'` | `acadamarkNumbering` | Suppress table numbering |
| `ref-prefix-eqn` | string | `acadamarkRefResolution` | Override "equation" word in ref labels |
| `ref-prefix-fig` | string | `acadamarkRefResolution` | Override "figure" word in ref labels |
| *(other `ref-prefix-*` keys)* | string | `acadamarkRefResolution` | Override any prefix word |

Boolean-like config values are strings. The string `'false'` suppresses
numbering; any other value (including absent) enables it.

---

## 10. Data flow examples

### 10.1 A plain paragraph

**Source:**
```
Some prose text.
```

**Stage 1 (remarkParse):**
```js
{ type: 'paragraph', children: [{ type: 'text', value: 'Some prose text.' }] }
```

**Stages 2–3:** No `acadamarkTag` nodes involved; no transformation.

**Stage 4 (toHast):** Built-in mdast-util-to-hast rule:
```js
{ type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'Some prose text.' }] }
```

**Output:**
```html
<p>Some prose text.</p>
```

---

### 10.2 An emphasized span

**Source:**
```
<em | emphasized>
```

**Stage 1:** `acadamarkTag { tagname: 'em', content: 'emphasized', contentHandler: 'default' }`

**Stage 2 (remarkRecursiveContent):**
```
inner parse "emphasized" → paragraph([text("emphasized")])
→ extractFromRoot: single paragraph → return paragraph.children
→ node.content = [text("emphasized")]
```

**Stage 4 (toHast, schema dispatch for `em`):**
```
vocab.html_output.element = 'em'
vocab.content.type = 'prose'
convertContent: content is [text("emphasized")] (already inline, no para unwrap needed)
→ { type: 'element', tagName: 'em', properties: {}, children: [text("emphasized")] }
```

**Output:** `<em>emphasized</em>`

---

### 10.3 A numbered equation with a cross-reference

**Source:**
```
<$$ #eqn:newton | F = ma $$>

See <ref @eqn:newton>.
```

**Stage 1:**
- `acadamarkTag { tagname: '$$', id: 'eqn:newton', content: ' F = ma ', isOpaqueContent: true }`
- `acadamarkTag { tagname: 'ref', atRefs: ['eqn:newton'], id: null }`

**Stage 2:** `$$` is opaque; skipped. `ref` has no default content to parse.

**Stage 3 — acadamarkNumbering:**
- `$$` node: `registryType = 'equation'`, `registry.assign('equation', 'eqn:newton', { numbered: true })` → `entry.number = 1`
- `node.computedNumber = 1`. id `'eqn:newton'` (contains `:`) → added to label index.

**Stage 3 — acadamarkRefResolution:**
- `registry.findByLabel('eqn:newton')` → found, `entry.number = 1`
- `computeRefText('eqn:newton', entry, config)` → prefix `eqn` → `DEFAULT_PREFIXES['eqn'] = 'equation'` → text `"equation 1"`
- `<ref>` replaced with `__ref-marker { targetId: 'eqn:newton', text: 'equation 1' }`

**Stage 4 — toHast:**
- `$$` → `mathHandler`: KaTeX renders `F = ma` in display mode; wraps in `<display-math>` with `<span class="equation-number">(1)</span>`.
- `__ref-marker` → `refMarkerHandler`: `<a href="#eqn:newton" class="ref">equation 1</a>`

**Output (simplified):**
```html
<display-math id="eqn:newton">
  ...katex output...
  <span class="equation-number">(1)</span>
</display-math>
<p>See <a href="#eqn:newton" class="ref">equation 1</a>.</p>
```

---

### 10.4 A citation

**Source (assuming `<data><library>` at root with Smith2020 entry):**
```
See <cite @Smith2020>.
```

**Stage 1:** `acadamarkTag { tagname: 'cite', atRefs: ['Smith2020'], positional: [] }`

**Stage 3 — buildCitationIndex:**
- `file.data.acadamarkCitations = { cite: Cite([Smith2020]), order: [], style: 'chicago-author-date' }`

**Stage 3 — acadamarkCiteResolution:**
- `extractCiteKeys(node)` → `['Smith2020']` from `node.atRefs`
- `cite.data.find(e => e.id === 'Smith2020')` → found
- `order.push('Smith2020')` → `citations.order = ['Smith2020']`
- `cite.format('citation', { entry: ['Smith2020'], template: 'chicago-author-date', format: 'html', lang: 'en-US' })` → `'(Smith, 2020)'`
- `<cite>` replaced with `__cite-marker { keys: 'Smith2020', html: '(Smith, 2020)' }`

**Stage 3 — acadamarkBibliography:**
- `citations.order.length === 1` → bibliography is rendered
- bibliography HTML formatted, `id="ref-Smith2020"` injected
- `__bibliography` node injected into article-back

**Stage 4 — toHast:**
- `__cite-marker` → `citeMarkerHandler`: `<cite class="cite" data-keys="Smith2020">(Smith, 2020)</cite>` (raw HTML child)
- `__bibliography` → `bibliographyHandler`: `<bibliography>...</bibliography>`

**Stage 5 — asset injection:**
- `hasCiteLinks(hast)` returns true (found a `<cite>` with class `cite`)
- hover preview assets injected

---

### 10.5 A note

**Source:**
```
Here is some text.<note | This is an endnote.> More text.
```

**Stage 1:** `acadamarkTag { tagname: 'note', content: 'This is an endnote.' }`

**Stage 2 (remarkRecursiveContent):**
- `'This is an endnote.'` → parsed → `[text("This is an endnote.")]` (single inline node)
- `node.content = [text("This is an endnote.")]`

**Stage 3 — acadamarkNotes (register-only):**
- `registry.assign('note', null, { numbered: true })` → `entry = { id: 'note-1' }` (number not yet assigned)
- `file.data.acadamarkNotesPending = [{ node: <note>, entry }]`
- `<note>` node **stays in the tree**

**Stage 3 — acadamarkApplyNumbers:**
- `registry.numberRegistry()` → `entry.number = 1`
- `fillNumbering(file)` → (no-op for notes; `acadamarkNumberingPending` has equations/figures/tables)

**Stage 3 — acadamarkNumbering, acadamarkRefResolution, acadamarkCiteResolution:**
- The `<note>` node is still in the tree at its authored position, so any
  `<ref>` or `<cite>` tags inside `node.content` are resolved here in
  document order — by the time `acadamarkNotePlacement` runs, the note's
  content array contains `__ref-marker` / `__cite-marker` nodes rather than
  raw `<ref>` / `<cite>` tags. (This single-note example has no inner
  refs/cites, so these steps are no-ops, but they are the reason
  `acadamarkNotePlacement` runs as late as step 4.9.)

**Stage 3 — acadamarkNotePlacement:**
- Splices `<note>` → `__note-marker { noteId: 'note-1', number: 1, refId: 'noteref-1' }`
- Builds `__note-list-item` with `content: [text("This is an endnote.")]`
- Prepends `__note-list` with one `__note-list-item` to article-back

**Stage 4 — toHast:**
- `__note-marker` → `noteMarkerHandler`:
  `<sup id="noteref-1" data-note-id="note-1"><a href="#note-1">1</a></sup>`
- `__note-list` → `noteListHandler`: `<note-list class="endnotes"><ol>...</ol></note-list>`
- `__note-list-item` → `noteListItemHandler`:
  `<li id="note-1"><sup>1</sup> This is an endnote. <a href="#noteref-1" class="note-backref" ...>↩</a></li>`

**Stage 5 — asset injection:**
- `hasNoteMarkers(hast)` returns true → hover preview assets injected.

---

## 11. The `file.data` namespace

The unified `VFile` is the shared data bus between plugins. `file.data` fields
set during a pipeline run:

| field | type | set by | read by |
|-------|------|--------|----------|
| `file.data.acadamarkConfig` | `Map<string, string>` | `acadamarkConfigDiscovery` | `buildCitationIndex`, `acadamarkNumbering`, `acadamarkRefResolution` |
| `file.data.acadamarkRegistry` | registry object | first `ensureRegistry(file)` call | `acadamarkNotes`, `acadamarkNumbering`, `acadamarkApplyNumbers`, `acadamarkRefResolution` |
| `file.data.acadamarkCitations` | `{ cite, order, style }` | `buildCitationIndex` | `acadamarkCiteResolution`, `acadamarkBibliography` |
| `file.data.acadamarkNotesPending` | array of `{ node, entry }` | `acadamarkNotes` | `acadamarkNotePlacement` |
| `file.data.acadamarkNumberingPending` | array of `{ node, entry }` | `acadamarkNumbering` | `acadamarkApplyNumbers` |

All three are initialized as needed:
- `acadamarkConfig` is set to a new `Map` even if the document has no `<config>`
  blocks (the map is just empty).
- `acadamarkRegistry` is created on first `ensureRegistry(file)` call;
  `acadamarkNotes` is typically first.
- `acadamarkCitations` is only set when at least one `<data>/<library>` block
  is found and successfully parsed.

---

## 12. Asset bundling

The interpreter produces self-contained HTML by default (`'inline'` modes).

### 12.1 KaTeX

- CSS is read from the installed `katex` npm package.
- Font `url()` references in the CSS are replaced with base64 data URIs via
  `patchKatexFontUrls()`. This makes the CSS work from `file://` URLs and
  offline environments.
- The CDN URL is pinned to the installed KaTeX version and exported as
  `KATEX_CDN_URL`.

### 12.2 Hover previews (Tippy.js + Popper.js)

- UMD bundles are read from the installed npm packages.
- Source map comments (`//# sourceMappingURL=...`) are stripped to avoid
  console warnings about missing `.map` files.
- Custom `hover-preview.css` and `hover-preview.js` in
  `packages/acadamark-interpreter/src/assets/` handle acadamark-specific
  tooltip behavior.

### 12.3 Body fonts

`patchKatexFontUrls()` is in `src/assets/font-loader.js`. The same file also
exports `getDocumentFontsCss()`, which provides Inter and Source Code Pro as
base64-encoded `@font-face` declarations. This is called from `index.js` and
the resulting `<style>` element is prepended to the document body unconditionally
— every rendered document embeds the font data for self-contained output.

### 12.4 Lazy loading

All asset reads are deferred until first use. Module-level cache variables
hold `null` until the first document that needs the asset is processed. This
means:
- Processes that produce no math never read `katex.min.css`.
- Processes that produce no notes/refs/cites never read the Tippy/Popper bundles.

For long-running servers processing many documents, the first document in each
asset category pays the disk read cost; subsequent documents use the cached
content.

---

## 13. Internal node types

Several internal node types (`__*` tagnames) are created by structural plugins
and rendered by INTERNAL_REGISTRY handlers. They are not vocabulary elements
and cannot be authored directly.

| created by | tagname | rendered as |
|-----------|---------|-------------|
| `acadamarkNotePlacement` | `__note-marker` | `<sup>` with link |
| `acadamarkNotePlacement` | `__note-list` | `<note-list><ol>` |
| `acadamarkNotePlacement` | `__note-list-item` | `<li>` |
| `acadamarkRefResolution` | `__ref-marker` | `<a class="ref">` |
| `acadamarkRefResolution` | `__ref-error` | `<a class="ref-error">` |
| `acadamarkCiteResolution` | `__cite-marker` | `<cite class="cite">` |
| `acadamarkCiteResolution` | `__cite-error` | `<cite class="cite-error">` |
| `acadamarkBibliography` | `__bibliography` | `<bibliography>` |

The `data` and `library` tagnames (author-written) are also in INTERNAL_REGISTRY
and render as `null` (suppressed): their content has been consumed by
`buildCitationIndex`.

---

## 14. Future: client-side rendering

The current pipeline is build-time only. All processing runs in Node.js before
the HTML is delivered.

A future client-side rendering path would re-run the pipeline in the browser.
This would require bundling all plugins, the Peggy grammar, the micromark
extension, and the vocabulary into a browser-loadable bundle. No design has
been done for this yet.

The plugin-based unified architecture does not inherently prevent client-side
use; the constraint is the vocabulary loader (`readdirSync` + `readFileSync`)
and the `citation-js` dependency, both of which are currently Node-only.

---

## 15. Cross-references

- `notes/specs/interpreter.md` — handler dispatch, schema dispatch, handler
  implementations, error handling.
- `notes/specs/recursive-content-spec.md` — recursive content parsing design.
- `notes/specs/shorthand-syntax.md` — the authoring syntax at the pipeline input.
- `notes/specs/layer1-naming.md` — vocabulary element naming rules.
- `BUILD.md` — slice plan and roadmap for future pipeline stages.
