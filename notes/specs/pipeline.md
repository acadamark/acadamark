# Pipeline

This document describes the enscribe processing pipeline: what stages run,
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
   to HTML. Enscribe plugins live on one or both dialects.

3. **Named pieces of the ecosystem.** *remark* handles markdown ↔ mdast.
   *rehype* handles HTML ↔ hast. *unified* chains them together.
   *micromark* is the lower-level tokenizer used only when inventing
   genuinely new syntax (the enscribe shorthand). The enscribe
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

An enscribe document goes through six stages to produce HTML output.
The JATS export pipeline branches off after Stage 3:

```
source text
    │
    ▼  Stage 1: Source → mdast
    │  remarkParse + remarkEnscribe
    │
    ▼  Stage 2: Recursive content parsing
    │  remarkRecursiveContent
    │
    ▼  Stage 3: mdast transforms
    │  normalize to canonical → config discovery →
    │  book structure → article structure →
    │  section nesting → citation index → notes → numbering →
    │  apply numbers → ref resolution → cite resolution →
    │  note placement → bibliography
    │
    ├──────────────────────────────────┐
    │                                  │
    ▼  Stage 4 (HTML)                  ▼  Stage 4' (JATS)
    │  mdast → hast                    │  mdast → JATS XML
    │  toHast() with enscribeTag      │  enscribeToJats() — consumes the
    │  custom handler                  │  post-stage-3 mdast directly
    │                                  │
    ▼  Stage 5: Asset injection        ▼  Stage 5' (JATS): metadata defaults
    │  Conditional CSS/JS prepended    │  supplies required JATS attrs
    │  to hast tree                    │  (xml:lang, dtd-version, etc.)
    │                                  │
    ▼  Stage 6: Serialization          ▼  Stage 6' (JATS): XML string
    │  rehypeFormat() → toHtml()       │
    │                                  │
HTML string                       JATS XML string
```

The JATS branch (`@enscribejs/cli` package, landed in `98f2d7f`) consumes the post-stage-3 mdast — the tree is
already JATS-shaped at that point (the structural plugins produced
`<article>`/`<book>` with the appropriate region wrappers; citations
and cross-references are resolved; numbering is in). The package
re-imports the structural plugins from `enscribe/interpreter` to
build the post-stage-3 tree; HTML rendering stays in
`enscribe/interpreter`.

**Stage 5′ (JATS): metadata defaults.** The JATS branch supplies fields the
enscribe document may leave blank, so the output stays DTD-valid. JATS requires
`<article-title>`; when the document has no `<meta>` title (a valid authoring
choice — the title comes only from `<meta>`, per the structural phase above),
the exporter fills the required title with an `Untitled` placeholder. The
placeholder lives in one place — `UNTITLED_TITLE` in
`packages/cli/src/jats-export/index.js`. Other required values (`xml:lang`,
`dtd-version`, the `article-type` default) are supplied the same way.

The pipeline is wired by the `enscribeInterpreter` unified plugin, which
registers all stages (2–6) on a single unified processor. The consumer provides
stage 1 (`remarkParse` + `remarkEnscribe`):

```js
const result = await unified()
  .use(remarkParse)
  .use(remarkEnscribe)
  .use(enscribeInterpreter, options)
  .process(source);
```

**Delegated parser extensions auto-registered by the interpreter.**
`enscribeInterpreter` also calls `this.use(remarkMath)` and
`this.use(remarkGfm)` on the outer processor (and includes both in the inner
processor passed to `remarkRecursiveContent`). This lets the parser tokenize
bare `$x$` / `$$x$$` math and bare GFM pipe tables anywhere in the source —
both at the top level and inside named-tag content. The resulting
`inlineMath` / `math` / `table` nodes are then rewritten to canonical
`enscribeTag` nodes by `enscribeNormalizeToCanonical` (Stage 3's first
plugin), so the rest of the pipeline only sees one node type. See AUD-20 in
`notes/archive/audit-findings-2026-05.md` for the Option-A normalization decision.

---

## 2. Stage 1: Source → mdast

**Plugins:** `remarkParse`, `remarkEnscribe` (consumer-provided).

**Input:** UTF-8 source text.

**Output:** mdast tree where:
- Standard Markdown constructs (paragraphs, emphasis, headings, fenced code,
  etc.) are represented as normal mdast node types.
- Enscribe shorthand tags (`<tag #id .class kwarg=value | content>` and sigil
  forms) are represented as `enscribeTag` nodes with `content` as a raw string.

An `enscribeTag` node after parsing looks like:

```js
{
  type: 'enscribeTag',
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
**Source:** `packages/enscribe/src/parser/recursive-content.js`

**Input:** mdast tree with `enscribeTag` nodes having string `content` fields.

**Output:** mdast tree with `enscribeTag` nodes having `content: Node[]`
(parsed mdast arrays). Opaque-content nodes are unchanged.

**What it does:** For each `enscribeTag` node with `contentHandler === 'default'`,
the raw `content` string is fed through an inner processor (`remarkParse +
remarkEnscribe`) and the resulting mdast is stored back onto the node. After
this step, `node.content` is a proper array of mdast nodes (possibly containing
nested `enscribeTag` nodes).

**Inner processor:** Created by `enscribeInterpreter` and passed as the
`{ processor }` option. It runs the same four parser plugins as the outer
processor — `remarkParse`, `remarkEnscribe`, `remarkMath`, `remarkGfm` —
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
are converted to `enscribeParseError` nodes with `subtype: 'max-recursion-depth'`.

**Parser-stage error nodes.** Max-recursion-depth is one source of
`enscribeParseError`; the parser also produces `enscribeParseError` for
unknown escape sequences and for empty / unterminated `^{}` and `_{}`
shortcuts, and produces `enscribeTagError` for unterminated long-form
constructs and for long-form openings the grammar rejects. Those nodes
are rendered as visible markers by the interpreter's compile-step
handlers (`notes/specs/interpreter.md` §11.5), honoring the
always-renders guarantee.

**Cross-reference:** `notes/specs/recursive-content-spec.md` for the full design,
including the mixed-content (escape-errors) path.

---

## 4. Stage 3: mdast transforms

A sequence of mdast-transform plugins runs in order: the normalization pass,
then configuration discovery, then the structural plugins (article structuring
and section nesting), then the semantic plugins (citation index, notes,
numbering, apply-numbers, ref-resolution, cite-resolution, note-placement,
bibliography). Each is registered on the unified processor in this order and
runs as a unified transform during the `processor.run()` step. The per-plugin
detail follows in §4.0–§4.10.

### Phase 0 — Normalization

#### 4.0 enscribeNormalizeToCanonical

(Exported as `enscribeNormalizeToCanonical`; `enscribeNormalizeMarkdown` is a
backward-compat alias of the same plugin.)

**When:** First in Stage 3, immediately after `remarkRecursiveContent`. By this
point both the outer `remarkParse` run and the inner one (inside
`remarkRecursiveContent`) have completed, so every delegated-parser node and
every pipe-content subtree is present on both surfaces.

**What it does:** The single normalization gate. It coerces *every* authored form
to its canonical Layer 1 shape, so downstream structural and semantic plugins see
exactly one representation per construct. Settled principle: *delegate the lexer,
own the node identity*.

It is **not** a fixed-size pass: it is an **ordered array of
`{ predicate, normalize }` rule groups**, walked per node with **first-match**
semantics (`.find()` — at most one group fires per node, so group order is
load-bearing). The groups — not a number to memorize — fall into these families:

- **Delegated-parser nodes → canonical tags** (the mapping table below):
  `remark-math` / `remark-gfm` nodes become canonical math / table `enscribeTag`
  nodes.
- **Sigil tagnames → vocabulary names** via the tagname↔sigil cipher
  (`#`→`section`, `$`→`inline-math`, `` ` ``→`inline-code`, …).
- **Shorthand expansion** via the shared expansion map
  (`lib/shorthand-expansions.js`, `createShorthandRegistry`): the book-part family
  (`<chapter>`→`<book-part book-part-type="chapter">`, gated on book context) and
  the DSL shorthand family (`<mermaid>`→`<diagram mermaid>`, `<csv>`→`<table csv>`),
  with later-wins+warn clobber and reserved-name rejection (conditional shorthands
  — the book-context `<glossary>` — exempt).
- **Kwarg → child-tag lifts** for structured-element tags (`<meta>` / `<author>`),
  `<config>`, and frameable tags (the shared `caption` / `title` lift).
- **Markdown inline lifts** (`emphasis`→`<i>`, `strong`→`<b>`, …; see
  `notes/specs/idioms.md`).

The delegated-parser group's mapping:

| input node type | from | replacement |
|----------------|------|-------------|
| `inlineMath`   | `remark-math` | `enscribeTag { tagname: '$',  isOpaqueContent: true,  contentHandler: 'math' }` |
| `math`         | `remark-math` | `enscribeTag { tagname: '$$', isOpaqueContent: true,  contentHandler: 'math-display' }` |
| `table`        | `remark-gfm`  | `enscribeTag { tagname: 'table', positional: ['md'], isOpaqueContent: true, contentHandler: 'table' }` |

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

**Cross-reference:** AUD-20 in `notes/archive/audit-findings-2026-05.md` for the
Option-A decision; `packages/enscribe/src/interpreter/plugins/normalize-to-canonical.js`
for the implementation; `notes/specs/interpreter.md` §3.1.5 for the
interpreter-level view.

---

### Phase 1 — Discovery

#### 4.1 enscribeConfigDiscovery

**When:** First after recursive-content parsing. The tree is still flat (not
yet wrapped in article structure).

**What it does:** Reads `<config>` blocks at root level and populates
`file.data.enscribeConfig` with their kwargs. No tree modification.

**Output:** `file.data.enscribeConfig = Map<string, string>`.

**Dependencies:** None (reads tree as-is after recursive-content).

**What must run before:** `remarkRecursiveContent` (so `<config>` node content
is parsed — config kwargs come from the tag's own kwargs, not its content, but
the tree must be stable).

---

### Phase 2 — Structural transformation

#### 4.2 enscribeArticleStructuring

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

**Title.** The article title is promoted from the `<title>` inside `<meta>` to
`<article-title>`. A markdown heading is a *section*, never the title (see
`idioms.md`), so a document with no `<meta>` title has **no** article title —
left blank, a valid authoring choice, not an error. (`index.emd`, a `#`-headed
page with no `<meta>` title, is a live example.) On JATS export a missing title
is filled with a placeholder — see Stage 5′ below.

**Dependencies:** `remarkRecursiveContent` (needs parsed content to read
`<meta>` internals). `enscribeConfigDiscovery` has already run (no dependency
between them — ordering is arbitrary).

**Book and book-part documents:** handled by `enscribeBookStructuring`
(`c7b2b75`), which runs immediately before this
plugin in the pipeline. When `<meta type=book>` or `<meta type=book-part>`
is at root, the book-structuring plugin wraps the tree first; this
article-structuring plugin then detects the already-book-wrapped tree
via its early no-op check and skips silently.

#### 4.2.5 enscribeBookStructuring

**Source:** `packages/enscribe/src/interpreter/plugins/book-structuring.js`

**Purpose:** Wrap the root children of a book document into the Layer 1
book structure: `<book>` containing `<book-front>`, `<book-body>`, and
`<book-back>`. Parallel to `enscribeArticleStructuring` for the BITS
book DTD shape.

**When it runs:** before `enscribeArticleStructuring`. For
`<meta type=article>` (or absent `type`) documents it returns silently;
for `<meta type=book>` / `<meta type=book-part>` it transforms the tree.

**Region routing by `book-part-type`:**

| book-part-type | Placement |
|---|---|
| chapter, part, introduction, conclusion, other | book-body |
| preface, foreword, dedication | book-front |
| appendix, glossary, colophon | book-back |

See `book-part.md` §"Where book-parts appear" for the full table.

**Body absorption:** the parser produces `<chapter | Title>` as a tag
with title content; subsequent paragraphs sit as root-level siblings.
The plugin gathers those siblings into the chapter's content (the
`<chapter | Title>\nbody...\n<chapter | Next>` authoring pattern).

**Per-chapter authorship:** an `<author>` child inside a book-part is
synthesized into a per-book-part `<meta>` wrapper (the edited-volume
case).

**Companion configurable knobs** (added in the same slice; documented
under the consuming plugins below):
- `<config counter-reset-scope>` — controls per-chapter numbering
  resets. See §4.6 `enscribeNumbering`.
- `<config note-scope>` — controls per-book-part footnote collection.
  See §4.9 `enscribeNotePlacement`.

#### 4.3 enscribeSectionNesting

**What it does:** Converts the flat body content into a nested section tree.
Each `section` / `sub-section` / `sub-sub-section` tag becomes a parent that
contains the content following it until the next peer or parent section.
Section titles (pipe content) are promoted to `section-title` /
`sub-section-title` / `sub-sub-section-title` child elements.

**Dependencies:** `enscribeArticleStructuring` (sections must be inside
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

**What it does:** Collects `<data>` nodes wherever they sit in the tree —
at root level in an article, nested inside `<book-body>` in a book — walks
their `<library>` children, reads citation data (BibTeX or CSL-JSON)
from inline content or `src=` files, and stores a citation-js `Cite` instance
in `file.data.enscribeCitations`. Called as an explicit index-build step in
`index.js` via an anonymous plugin wrapper (`enscribeCitationIndex`), not as
`this.use(enscribeLibraryLoad)`. The exported `enscribeLibraryLoad` plugin
wrapper is kept for external callers.

**Format word.** A `<library>`'s payload language is named by the leading format
word — the positional (`<library bibtex | …>`) or the legacy `format=` kwarg. A
named, known format becomes a citation-js `forceType`; omitted → citation-js
auto-detects (the default). This is the storage-host form of the format-word
convention (`notes/specs/format-words.md`).

**Storage host (#24 reframe).** `<library>` (and its `<data>` container) is a
**storage host on the language axis** — purpose `storage`, the format word naming
the payload language, the body the verbatim payload — *not* a `STRUCTURED_ELEMENTS`
member. The language/host model owns the payload; the container shape of `<data>`
stays the open #24 question. See `DESIGN.md` §"The two axes: host and language".

**Output:**
```js
file.data.enscribeCitations = {
  cite: Cite,          // citation-js instance; all entries
  order: [],           // filled by enscribeCiteResolution
  style: string,       // CSL style (from config or default)
}
```

**Dependencies:** `enscribeConfigDiscovery` (reads `citation-style` from
config). It does **not** require a structuring step to have relocated `<data>`:
the deep-collect finds `<data>` at root (article) or in `<book-body>` (book).

**No-op case:** If there are no `<data>` nodes, `file.data.enscribeCitations`
is not set. Cite resolution and bibliography will be no-ops.

#### 4.5 enscribeNotes

**What it does:** Registers note elements (record-only). Walks the tree with
`discover()`, calls `registry.assign('note', id, { numbered: true })` for
each `<note>` node found, and stores `{ node, entry }` pairs in
`file.data.enscribeNotesPending`. `<note>` nodes **stay in the tree** through
steps 4.7–4.9 so that any refs/cites inside note bodies are resolved before
placement. Actual marker splicing and note-list injection happen in
`enscribeNotePlacement` (step 4.10).

**Output:** `file.data.enscribeNotesPending` (array of `{ node, entry }` pairs);
registry note entries with slots claimed (numbers assigned later by step 4.6.5).

**Registry:** `registry.assign('note', id, { numbered: true })` per note node.
Sequential numbers are assigned in `enscribeApplyNumbers` (step 4.6.5).

**Dependencies:** `remarkRecursiveContent` (note content must be parsed mdast),
`enscribeSectionNesting` (tree structure stable).

#### 4.6 enscribeNumbering

**What it does:** Registers `$$` (display-math), `figure`, and `table` nodes
with the registry (record-only); registers `section`, `sub-section`, and
`sub-sub-section` nodes for cross-reference lookup; and registers code-block
sigil nodes (tagname `` ``` ``) under registry type `code` for cross-reference
lookup. Stores `{ node, entry }` pairs for numbered elements in
`file.data.enscribeNumberingPending`.

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

**Output:** `file.data.enscribeNumberingPending`; registry entries for numbered
elements (numbers not yet assigned); `node.registryType` set on each numbered node.

**Dependencies:** `enscribeNotes` (notes claim their registry slots first, so
note numbers are allocated before equation/figure/table numbers — convention,
not a hard dependency since they use separate type counters).

**Numbering decision priority:** `+numbered`/`-numbered` booleans → `numbered=true/false`
kwargs → document config (`number-equations`, etc.) → default `true`.

---

#### 4.6.5 enscribeApplyNumbers

**What it does:** Assigns sequential display numbers to all registered numbered
elements in a single ordered pass, then writes them back to nodes.

**Calls:**
1. `registry.numberRegistry()` — assigns `entry.number` for all registered entries.
2. `fillNumbering(file)` — sets `node.computedNumber = entry.number` for each entry
   in `file.data.enscribeNumberingPending`.

**Output:** `node.computedNumber` set on all registered numbered elements.

**Dependencies:** `enscribeNotes` (step 4.5) and `enscribeNumbering` (step 4.6)
— all registration must be complete before numbering is computed.

**Must precede:** `enscribeRefResolution` (step 4.7) — ref resolution reads
`entry.number` when building reference display text.

#### 4.7 enscribeRefResolution

**What it does:** Replaces every `<ref>` node with a `__ref-marker` (target
found in label index) or `__ref-error` (target not found) internal node.

**Dependency on numbering:** Must run after `enscribeApplyNumbers` (step 4.6.5)
so that all numbered elements have `computedNumber` set and their colon-ids are
in the label index.

**Reference text:** Computed from the id prefix and the entry number. Known
prefixes (`eqn`, `fig`, `note`, `tab`, `sec`, etc.) produce labeled text
("equation 3", "figure 1"). Unknown prefixes produce just the number. Unnumbered
targets produce the label-tail. Config key `ref-prefix-{prefix}` overrides.

**Known limitation:** Only colon-ids are referenceable. Non-colon ids produce
`__ref-error`.

#### 4.8 enscribeCiteResolution

**What it does:** Replaces every `<cite>` node with `__cite-marker` and/or
`__cite-error` internal nodes. Builds `citations.order` (first-cited key order).

**Dependency:** `buildCitationIndex` (step 4.4; needs `file.data.enscribeCitations`).
If citations were not loaded, this plugin is a no-op.

**Citation keys:** Extracted from `node.atRefs` (canonical: `<cite @Smith2020>` or `<cite @Smith2020 @Jones2019>`), `node.positional` (bracketed form: `<cite [@Smith2020, @Jones2019]>`, `@` stripped per item), `node.content` as string (pipe form), or parsed content text (defensive path).

**Mixed case:** When some keys are found and some missing, the replacement is
`[__cite-marker, __cite-error]` — both nodes appear inline in the output.

---

#### 4.9 enscribeNotePlacement

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

**Dependencies:** `enscribeCiteResolution` (step 4.8; note content must be
resolved), `enscribeApplyNumbers` (step 4.6.5; `entry.number` must be set).

---

#### 4.10 enscribeBibliography

**What it does:** Renders the full bibliography via citation-js and injects
a `__bibliography` node into the back-matter region — `<article-back>` for an
article, `<book-back>` for a book. If the author placed an explicit
`<bibliography>` tag, it is replaced in-place. Otherwise, the bibliography is
appended (pushed) to the back-matter region. A book gets a single
document-wide bibliography in `<book-back>`; per-chapter bibliographies are a
deferred post-alpha option (see GitHub Issues). The heading text is `References`
by default, overridable with the `bibliography-heading` config key (HTML-escaped,
since the heading is emitted as a raw node).

**Dependency:** `enscribeCiteResolution` (needs `citations.order` to be
populated with the first-cited key list).

**Empty case:** If `citations.order.length === 0`, any author-placed
`<bibliography>` tag is removed. Nothing else is done.

**id injection:** Each `.csl-entry` div in the bibliography HTML gets
`id="ref-{KEY}"` injected, enabling hover-preview JavaScript to locate
entries by key.

---

## 5. Stage 4: mdast → hast

**Function:** `toHast(tree, { handlers: { enscribeTag: tagHandler }, allowDangerousHtml: true })`
from `mdast-util-to-hast`.

**Not remark-rehype:** The interpreter uses `mdast-util-to-hast` directly.
`remark-rehype` is not installed. The compile step is registered as
`this.compiler` (the standard unified stringify API), not as a rehype plugin.

**What `toHast` does:**

- Standard mdast node types (paragraph, emphasis, heading, etc.) are converted
  by built-in mdast-util-to-hast rules.
- `enscribeTag` nodes call the custom handler registered in `handlers.enscribeTag`.
- Parser-stage error nodes (`enscribeTagError`, `enscribeParseError`) are
  rendered by dedicated compile-step handlers as visible markers
  (`<span class="parse-error">` / `<span class="tag-error">`), honoring
  the always-renders guarantee — see `notes/specs/interpreter.md` §11.5.

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

**What:** CSS and JavaScript nodes prepended to `hast.children`.

**Document fonts:** Prepended on every document unless `documentFontsCss:
'skip'`. In `'inline'` mode: a `<style>` of base64 `@font-face` rules (Inter +
Source Code Pro; self-contained, ~190 KB). In `'link'` mode: a `<link>` to the
document-fonts CDN (`DOCUMENT_FONTS_CDN_URL`, a Google Fonts `css2` request).
Default `'inline'` when `embedResources: true`, else `'link'`.

**KaTeX CSS:** Prepended if the hast tree contains `inline-math` or
`display-math` elements. In `'inline'` mode: a `<style>` block with the full
KaTeX CSS (font URLs replaced with base64 data URIs). In `'link'` mode: a
`<link>` to the CDN. In `'skip'` mode: nothing. Default `'inline'` when
`embedResources: true`, else `'link'`.

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
| `remarkRecursiveContent` | `remarkEnscribe` (string content set) | `node.content` as `Node[]` |
| `enscribeNormalizeToCanonical` | `remarkRecursiveContent` (both outer and inner parses complete) | every authored form coerced to canonical Layer 1 nodes — delegated-parser nodes, sigils, shorthands (book-part + DSL), and kwarg lifts |
| `enscribeConfigDiscovery` | `enscribeNormalizeToCanonical` | `file.data.enscribeConfig` |
| `enscribeArticleStructuring` | `remarkRecursiveContent` | article structure nodes; `<data>` at root |
| `enscribeSectionNesting` | `enscribeArticleStructuring` | nested section tree |
| `buildCitationIndex` | `enscribeConfigDiscovery` | `file.data.enscribeCitations` |
| `enscribeNotes` | `remarkRecursiveContent`, `enscribeSectionNesting` | `file.data.enscribeNotesPending`; registry note slots |
| `enscribeNumbering` | `enscribeNotes` | `file.data.enscribeNumberingPending`; `node.registryType` |
| `enscribeApplyNumbers` | `enscribeNotes`, `enscribeNumbering` | `node.computedNumber`; label index entries |
| `enscribeRefResolution` | `enscribeApplyNumbers` | `__ref-marker`, `__ref-error` |
| `enscribeCiteResolution` | `buildCitationIndex` | `__cite-marker`, `__cite-error`, `citations.order` |
| `enscribeNotePlacement` | `enscribeCiteResolution`, `enscribeApplyNumbers` | `__note-marker`, `__note-list`, `__note-list-item` |
| `enscribeBibliography` | `enscribeCiteResolution` | `__bibliography` |
| compiler (toHast) | all mdast transforms | hast tree |
| asset injection | compiler | CSS/JS nodes prepended to hast |
| serialization | asset injection | HTML string |

**Critical ordering constraints:**

- `remarkRecursiveContent` must precede all structural plugins. Structural
  plugins read node content (e.g., `<meta>` internals, note content) as parsed
  mdast arrays; they cannot work with raw strings.
- `enscribeNormalizeToCanonical` must precede every Phase 1+ plugin. After
  normalization, the structural and semantic plugins only ever see
  `enscribeTag` nodes — never raw `inlineMath`, `math`, or GFM `table` nodes.
  Running any structural plugin first would mean some code paths see two node
  representations for the same construct.
- `enscribeApplyNumbers` must precede `enscribeRefResolution`. Cross-references
  look up by label; labels are only in the registry after `numberRegistry()` has
  assigned numbers and `fillNumbering` has written them to nodes.
- `enscribeCiteResolution` must precede `enscribeBibliography`. The bibliography
  assembles from `citations.order`, which is populated during cite resolution.
- `enscribeCiteResolution` must precede `enscribeNotePlacement`. Note bodies
  may contain `<cite>` tags; those must be resolved before note content is moved
  to article-back.
- `buildCitationIndex` must precede `enscribeCiteResolution`. Cite resolution
  needs the citation-js instance.

---

## 9. Configuration

### 9.1 Plugin options

`enscribeInterpreter(options)` accepts:

| option | type | default | description |
|--------|------|---------|-------------|
| `embedResources` | `boolean` | `false` | Master switch for the two resources enscribe would otherwise inline (document fonts, KaTeX CSS). `false` links them externally (lean); `true` inlines them (self-contained). The per-resource options below override it. Does **not** affect `hoverPreviewMode` or `dslMode`. |
| `documentFontsCss` | `'inline' \| 'link' \| 'skip'` | `embedResources ? 'inline' : 'link'` | Document-fonts (Inter, Source Code Pro) delivery |
| `katexCss` | `'inline' \| 'link' \| 'skip'` | `embedResources ? 'inline' : 'link'` | KaTeX CSS delivery mode |
| `hoverPreviewMode` | `'inline' \| 'link' \| 'skip'` | `'inline'` | Hover preview asset delivery |
| `assetsDir` | `string \| null` | `null` | Base directory for `src=` file paths |

`assetsDir` is required when using `<library src="...">` or `<table src="...">`.
Without it, those elements produce warnings and skip the external file.

**Migration (an earlier change).** The defaults for document fonts and KaTeX CSS
flipped from inline (self-contained) to external `'link'` — output is leaner but
now references the font and KaTeX CDNs. Set `embedResources: true` to restore the
prior self-contained output, or set `documentFontsCss`/`katexCss` individually
(they override `embedResources`). DSL libraries (`dslMode`) and hover-preview
(`hoverPreviewMode`) are *not* driven by `embedResources` and keep their prior
defaults (`'skip'` and `'inline'`); the browser entry (`src/browser.js`) sets
them to `'live-link'` and `'link'` independently.

### 9.2 Document-level config

Authors can override pipeline behavior with `<config>` tags in the document.
These are processed by `enscribeConfigDiscovery` and stored in
`file.data.enscribeConfig`.

| key | type | consumed by | effect |
|-----|------|-------------|--------|
| `citation-style` | CSL style name | `buildCitationIndex` | Citation format (default: `chicago-author-date`) |
| `number-equations` | `'false'` | `enscribeNumbering` | Suppress equation numbering |
| `number-figures` | `'false'` | `enscribeNumbering` | Suppress figure numbering |
| `number-tables` | `'false'` | `enscribeNumbering` | Suppress table numbering |
| `number-boxes` | `'false'` | `enscribeNumbering` | Suppress numbered-`<aside>` ("Box N") numbering |
| `bibliography-heading` | string | `enscribeBibliography` | Override the bibliography heading text (default: `References`) |
| `ref-prefix-eqn` | string | `enscribeRefResolution` | Override "equation" word in ref labels |
| `ref-prefix-fig` | string | `enscribeRefResolution` | Override "figure" word in ref labels |
| *(other `ref-prefix-*` keys)* | string | `enscribeRefResolution` | Override any prefix word |

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

**Stages 2–3:** No `enscribeTag` nodes involved; no transformation.

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

**Stage 1:** `enscribeTag { tagname: 'em', content: 'emphasized', contentHandler: 'default' }`

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
- `enscribeTag { tagname: '$$', id: 'eqn:newton', content: ' F = ma ', isOpaqueContent: true }`
- `enscribeTag { tagname: 'ref', atRefs: ['eqn:newton'], id: null }`

**Stage 2:** `$$` is opaque; skipped. `ref` has no default content to parse.

**Stage 3 — enscribeNumbering:**
- `$$` node: `registryType = 'equation'`, `registry.assign('equation', 'eqn:newton', { numbered: true })` → `entry.number = 1`
- `node.computedNumber = 1`. id `'eqn:newton'` (contains `:`) → added to label index.

**Stage 3 — enscribeRefResolution:**
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

**Stage 1:** `enscribeTag { tagname: 'cite', atRefs: ['Smith2020'], positional: [] }`

**Stage 3 — buildCitationIndex:**
- `file.data.enscribeCitations = { cite: Cite([Smith2020]), order: [], style: 'chicago-author-date' }`

**Stage 3 — enscribeCiteResolution:**
- `extractCiteKeys(node)` → `['Smith2020']` from `node.atRefs`
- `cite.data.find(e => e.id === 'Smith2020')` → found
- `order.push('Smith2020')` → `citations.order = ['Smith2020']`
- `cite.format('citation', { entry: ['Smith2020'], template: 'chicago-author-date', format: 'html', lang: 'en-US' })` → `'(Smith, 2020)'`
- `<cite>` replaced with `__cite-marker { keys: 'Smith2020', html: '(Smith, 2020)' }`

**Stage 3 — enscribeBibliography:**
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

**Stage 1:** `enscribeTag { tagname: 'note', content: 'This is an endnote.' }`

**Stage 2 (remarkRecursiveContent):**
- `'This is an endnote.'` → parsed → `[text("This is an endnote.")]` (single inline node)
- `node.content = [text("This is an endnote.")]`

**Stage 3 — enscribeNotes (register-only):**
- `registry.assign('note', null, { numbered: true })` → `entry = { id: 'note-1' }` (number not yet assigned)
- `file.data.enscribeNotesPending = [{ node: <note>, entry }]`
- `<note>` node **stays in the tree**

**Stage 3 — enscribeApplyNumbers:**
- `registry.numberRegistry()` → `entry.number = 1`
- `fillNumbering(file)` → (no-op for notes; `enscribeNumberingPending` has equations/figures/tables)

**Stage 3 — enscribeNumbering, enscribeRefResolution, enscribeCiteResolution:**
- The `<note>` node is still in the tree at its authored position, so any
  `<ref>` or `<cite>` tags inside `node.content` are resolved here in
  document order — by the time `enscribeNotePlacement` runs, the note's
  content array contains `__ref-marker` / `__cite-marker` nodes rather than
  raw `<ref>` / `<cite>` tags. (This single-note example has no inner
  refs/cites, so these steps are no-ops, but they are the reason
  `enscribeNotePlacement` runs as late as step 4.9.)

**Stage 3 — enscribeNotePlacement:**
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
| `file.data.enscribeConfig` | `Map<string, string>` | `enscribeConfigDiscovery` | `buildCitationIndex`, `enscribeNumbering`, `enscribeRefResolution` |
| `file.data.enscribeRegistry` | registry object | first `ensureRegistry(file)` call | `enscribeNotes`, `enscribeNumbering`, `enscribeApplyNumbers`, `enscribeRefResolution` |
| `file.data.enscribeCitations` | `{ cite, order, style }` | `buildCitationIndex` | `enscribeCiteResolution`, `enscribeBibliography` |
| `file.data.enscribeNotesPending` | array of `{ node, entry }` | `enscribeNotes` | `enscribeNotePlacement` |
| `file.data.enscribeNumberingPending` | array of `{ node, entry }` | `enscribeNumbering` | `enscribeApplyNumbers` |

All three are initialized as needed:
- `enscribeConfig` is set to a new `Map` even if the document has no `<config>`
  blocks (the map is just empty).
- `enscribeRegistry` is created on first `ensureRegistry(file)` call;
  `enscribeNotes` is typically first.
- `enscribeCitations` is only set when at least one `<data>/<library>` block
  is found and successfully parsed.

---

## 12. Asset bundling

By default (`embedResources: false`) the interpreter links document fonts and
KaTeX CSS externally — leaner output that references the font and KaTeX CDNs.
Set `embedResources: true` (or `documentFontsCss`/`katexCss` to `'inline'`
individually) for self-contained HTML that needs no network to render. See
§9.1 for the full precedence and the browser-bundle migration note.

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
  `packages/enscribe/src/interpreter/assets/` handle enscribe-specific
  tooltip behavior.

### 12.3 Body fonts

`patchKatexFontUrls()` is in `src/assets/font-loader.js`. The same file also
exports `getDocumentFontsCss()` (Inter + Source Code Pro as base64-encoded
`@font-face` declarations) and `DOCUMENT_FONTS_CDN_URL` (a Google Fonts `css2`
request for the same families). `index.js` prepends one of them to the document
body per the `documentFontsCss` mode: `'inline'` emits the base64 `<style>`
(self-contained), `'link'` emits a `<link>` to the CDN (the external-by-default
case), `'skip'` emits nothing. Fonts are emitted on every document (body text is
universal) unless `'skip'`.

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
| `enscribeNotePlacement` | `__note-marker` | `<sup>` with link |
| `enscribeNotePlacement` | `__note-list` | `<note-list><ol>` |
| `enscribeNotePlacement` | `__note-list-item` | `<li>` |
| `enscribeRefResolution` | `__ref-marker` | `<a class="ref">` |
| `enscribeRefResolution` | `__ref-error` | `<a class="ref-error">` |
| `enscribeCiteResolution` | `__cite-marker` | `<cite class="cite">` |
| `enscribeCiteResolution` | `__cite-error` | `<cite class="cite-error">` |
| `enscribeBibliography` | `__bibliography` | `<bibliography>` |

The `data` and `library` tagnames (author-written) render as `null` (suppressed):
their content has been consumed by `buildCitationIndex`. As real vocabulary tags
(unlike the `__`-prefixed plugin nodes above), they are suppressed via the
`SUPPRESSED_APPARATUS` set in `interpret-plugin.js` — after the vocabulary lookup
confirms them — not via INTERNAL_REGISTRY (see `interpreter.md` §5.1–5.2).

---

## 14. Client-side rendering (browser library)

Layer 1 documents render in the browser with no build step, via the browser
entry `src/browser.js`. It exports `render(source, options)`
— source string to HTML string — and `renderInto(target, source, options)`,
which assigns that HTML to an element. Both wrap `buildEnscribePipeline` with
browser-safe defaults (external fonts / KaTeX CSS, linked third-party
hover-preview libraries, live-link DSL); a caller can override any of them. For
the live-editor case (#48), the built pipeline is **memoized on the resolved
options**: the build depends only on those options, not on the per-call source
(which arrives via `processSync`), so a live editor re-rendering on each
keystroke reuses one pipeline instead of rebuilding it per render. A changed
option keys a distinct cached pipeline, so a stale one is never served.
Relatedly, the shared compiler detects content assets (math, note markers, ref /
cite links, DSL contract markers) in a **single tree walk** rather than one walk
per asset — both are output-neutral perf changes. tsup bundles the entry into an
ESM module and an IIFE global (`window.enscribe`); see `tsup.config.js`.

The Node-only asset paths (font / KaTeX inlining, `.bib` / CSV / DSL `fs` reads)
are dead code under the browser defaults, but their `fs` / `path` / `url` /
`module` imports must still resolve for the bundle to build and load. esbuild's
`alias` redirects each to a throwing stub (`src/assets/node-builtin-stub.js`):
the import resolves to a harmless binding, and a violated "never called in the
browser" invariant surfaces as a loud, specific error rather than silent
corruption. The alias is keyed in **both** specifier forms — `fs` and `node:fs`,
etc. — so `src/` may import a built-in either way (modern `node:` is preferred);
this also catches bundled dependencies that import built-ins in bare form. Making
the `node:` form reach the alias requires `removeNodeProtocol: false` in the tsup
config, because tsup otherwise externalizes `node:`-prefixed specifiers before
esbuild consults `alias` (an earlier change made the aliasing symmetric and
retired the earlier bare-only convention; the mechanism is documented in
`tsup.config.js` and `src/assets/node-builtin-stub.js`). The
`test/bundle-load.test.js` smoke test is the runtime backstop: it builds the IIFE
bundle and loads it in a browser-like context (jsdom), failing if the bundle
throws at evaluation — the exact class of defect (a top-level `__require("fs")`)
that left the bundle unable to load in a browser.

**Live-mode assets under `renderInto`.** `renderInto` sets
the HTML via `el.innerHTML`, and the HTML spec deliberately leaves
`innerHTML`-injected `<script>` elements inert. The interactive layer enscribe
emits — Tippy/Popper hover-previews and live-link DSL bundles (mermaid / abc) —
is a set of `<script>`s, so under `renderInto` they do not run. The decided
answer is an **opt-in two-step**: `render` (or `renderInto`) produces the markup,
then `executeAssets(target)` walks the inserted subtree and re-creates each
script so the browser executes it — in document order, awaiting each external
load (the scripts carry load-order dependencies: a DSL library before its init,
Popper before Tippy before the hover init), deduplicating externals already
loaded into `<head>`, and finishing with a `mermaid.run()` kick for diagrams
injected after initial load. The library deliberately does **not** auto-execute
injected scripts: running markup-derived JS is the consumer's explicit call, not
a side effect of rendering. The in-browser editor demo (`demo/`) is the worked
example of the `render → executeAssets` pattern.

---

## 15. Cross-references

- `notes/specs/interpreter.md` — handler dispatch, schema dispatch, handler
  implementations, error handling.
- `notes/specs/recursive-content-spec.md` — recursive content parsing design.
- `notes/specs/shorthand-syntax.md` — the authoring syntax at the pipeline input.
- `notes/specs/layer1-naming.md` — vocabulary element naming rules.
- `BUILD.md` — slice plan and roadmap for future pipeline stages.
