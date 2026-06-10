# Interpreter Architecture

This document describes how the enscribe interpreter works. It covers what
the interpreter is, how its plugin chain is structured, how tags are dispatched
to hast output, and how assets are bundled. For the pipeline ordering
narrative — what runs when and why — see `notes/specs/pipeline.md`.

For the authoring syntax the interpreter consumes, see
`notes/specs/shorthand-syntax.md`. For the vocabulary elements it renders, see
`packages/layer1-vocabulary/SPEC.md` and the individual entries in
`packages/layer1-vocabulary/elements/`. For the recursive-content plugin
design, see `notes/specs/recursive-content-spec.md`.

---

## 1. What the interpreter is

The interpreter is the transformation layer between a parsed mdast tree and
HTML output. The parser (`@enscribejs/enscribe/parser`) produces an mdast tree in which
enscribe shorthand tags appear as `enscribeTag` nodes. The interpreter takes
that tree and produces a standalone HTML document.

The interpreter is implemented as a unified plugin, `enscribeInterpreter`,
in `packages/enscribe/src/interpreter/`. It is used with `unified`, `remark-parse`,
and `@enscribejs/enscribe/parser`:

```js
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '@enscribejs/enscribe/parser';
import { enscribeInterpreter } from '@enscribejs/enscribe';

const result = await unified()
  .use(remarkParse)
  .use(remarkEnscribe)
  .use(enscribeInterpreter)
  .process(source);

console.log(String(result)); // HTML string
```

Internally, `enscribeInterpreter` registers — on the unified processor — the
recursive-content plugin, the normalization pass, the discovery and structural
plugins, the semantic-processing plugins (notes, numbering, apply-numbers,
ref-resolution, cite-resolution, note-placement, bibliography), and a custom
compiler. (It also registers `remarkMath` and `remarkGfm` on the outer
processor itself, so bare `$x$` math and bare GFM pipe tables are tokenized —
see §2 for the full plugin order and §3.1 for how the same two extensions
are added to the inner processor.) The compiler converts the final mdast tree to hast using
`mdast-util-to-hast` directly (not via `remark-rehype`, which is not
installed), then formats and serializes the hast to an HTML string.

The interpreter does not expose a streaming API or an AST object. Its output
is always a synchronously-computable HTML string (despite unified's `process`
returning a promise — the actual work is synchronous).

---

## 2. Architecture overview

The pipeline has three conceptual phases of mdast transformation, followed by
a compile step.

**Phase 1 — Discovery** (no tree mutation): Read document metadata from
`<config>` blocks; populate `file.data.enscribeConfig`.

**Phase 2 — Structural transformation**: Parse string content into mdast;
wrap the document in the Layer 1 article structure; nest sections.

**Phase 3 — Semantic processing**: Load citation libraries; number notes,
equations, figures, and tables; resolve cross-references and citations;
render the bibliography.

**Compile step**: Convert the final mdast to hast using `toHast()` with a
custom `enscribeTag` handler; inject CSS and JavaScript assets conditionally;
format the hast tree for readable indentation; serialize to HTML.

The plugin registration order in `enscribeInterpreter` is:

```
0a. remarkMath                  (parser extension on outer processor)
0b. remarkGfm                   (parser extension on outer processor)
0c. resolveStrictMode           (#36 — selects the strict-mode register and, off
                                 the loosest rung, re-parses via the sigil /
                                 canonical processors; see notes/specs/strict-mode.md)
    inner processor: remarkParse + remarkEnscribe + remarkMath + remarkGfm
1.   remarkRecursiveContent     (Phase 2 — content parsing; takes inner processor)
1.5. enscribeNormalizeToCanonical (Phase 0 — normalize delegated-parser nodes
                                 to canonical enscribeTag nodes)
2.  enscribeConfigDiscovery    (Phase 1 — discovery)
2.5. enscribeBookStructuring    (Phase 2 — structural; runs before article-structuring
                                 and wraps <meta type=book|book-part> documents; §3.3.5)
3.  enscribeArticleStructuring (Phase 2 — structural)
4.  enscribeSectionNesting     (Phase 2 — structural)
4.5. enscribeListStructuring    (Phase 2 — structural; #137 — lowers <list>/<li> markers
                                 to ul/ol/li; see notes/specs/lists.md)
5.  buildCitationIndex          (Phase 3 — citation index-build; called via anonymous plugin)
5.5. enscribeTableCellParse     (Phase 3 — #21/#105 — opt-in parse of DATA-format table
                                 cells as inline markup; before notes/numbering/refs)
5.6. enscribeHtmlTableCells     (Phase 3 — #108 — re-resolves inline content in raw-HTML
                                 (_htmlTable) cells produced by a JATS import)
6.  enscribeNotes              (Phase 3 — notes; register-only)
7.  enscribeNumbering          (Phase 3 — numbering; register-only)
8.  enscribeApplyNumbers       (Phase 3 — apply display numbers; anonymous plugin)
9.  enscribeRefResolution      (Phase 3 — cross-refs)
10. enscribeCiteResolution     (Phase 3 — citations)
11. enscribeNotePlacement      (Phase 3 — note placement; runs after cite-resolution)
12. enscribeBibliography       (Phase 3 — citations)
    compiler: toHast → rehypeFormat → toHtml
```

Note that `remarkRecursiveContent` (step 1) runs before
`enscribeNormalizeToCanonical` (step 1.5). This is correct: normalization
rewrites nodes produced by the delegated parsers (`remark-math`,
`remark-gfm`), and those nodes are produced on *both* the outer surface and
the inner surface (via the inner processor inside `remarkRecursiveContent`).
Running normalize after recursive-content ensures every delegated-parser
node has surfaced before the rewrite walk. Configuration discovery (step 2)
then runs on a tree whose math and pipe-table nodes are already canonical
`enscribeTag` nodes — so it never has to know about two representations.

`remarkMath` and `remarkGfm` (steps 0a / 0b) are parser-level extensions,
not mdast transforms, and they affect tokenization during the parse pass;
they're listed here so the wiring is visible in one place. The **fractional
step numbers** — `1.5` (`enscribeNormalizeToCanonical`), and likewise `0c`
(`resolveStrictMode`), `2.5` (`enscribeBookStructuring`), `4.5`
(`enscribeListStructuring`), `5.5` (`enscribeTableCellParse`), and `5.6`
(`enscribeHtmlTableCells`) — mark plugins inserted *between* the
originally-numbered steps, so the existing integer step-2 through step-12
references throughout §3 stay unchanged. `enscribeNormalizeToCanonical`'s `1.5`
matches the inline `1.5.` comment in the source
([src/index.js](../../packages/enscribe/src/interpreter/index.js)). Of the
inserted plugins, book-structuring has its own detail in §3.3.5, list-structuring
in `notes/specs/lists.md`, strict-mode in `notes/specs/strict-mode.md`, and the
opt-in table-cell passes `enscribeTableCellParse` / `enscribeHtmlTableCells`
(#21/#105, #108) in §3.5.5 / §3.5.6.

### Tree-walking is centralized in shared single-pass walkers (design property)

Enscribe tree traversal is centralized in a small set of shared
walker helpers. Plugins and output generators that walk the tree do not
write their own descent logic; they call the shared helper that matches
their walk shape (read-only discovery, in-place replacement, in-place
normalization). Each walk is **single-pass by design** — everything a
given traversal needs to accomplish is done in one pass over the tree.

The rationale is maintainability and cohesion. Enscribe trees are not
plain mdast: an `enscribeTag` node's children live on `.content`, not
on `.children`, and opaque-content nodes (math bodies, code, DSL
payloads) must not be descended into. The standard `unist-util-visit`
does not encode either rule. Without centralized helpers, every plugin
would reinvent these descent decisions and they would drift apart over
time (as they did before consolidation — the audit history records
plugin walkers that variously skipped, descended through, or mishandled
opaque content). Routing every walk through one helper per shape keeps
the descent rules in one place and the per-plugin sites uniform.

The single-pass design has a known future pressure point: it may be
revisited if multithreading the interpreter for speed becomes
worthwhile. Multiple passes over disjoint subtrees can be parallelized
more cleanly than a single sequential pass that performs several
unrelated jobs at once. No such work is planned; this caveat is
recorded so the trade is explicit and the design is not mistaken for an
unconditional commitment to single-pass.

The shared walkers themselves live in
`packages/enscribe/src/core/walkers/` (`discover.js`,
`walk-replace.js`, `walk-normalize.js`); their per-plugin use sites are
called out in §3. The centralization originated as an
interpreter-internal property and broadened to span all consumers when
the `@enscribejs/enscribe/core` extraction made the walkers available to other
output generators (the JATS export and any future target);
the multithreading caveat above continues to apply. See
`notes/specs/core.md` for the architecture-decision record
covering this broadening and the package boundaries it sits within.

---

## 3. Plugin chain

### 3.1 remarkRecursiveContent

**Source:** `packages/enscribe/src/parser/recursive-content.js`
(imported directly by the interpreter; not re-exported by @enscribejs/enscribe/parser's
package exports).

**Purpose:** After the parser runs, each `enscribeTag` node's `content`
field holds a raw string — the text between `|` and `>` in the shorthand
syntax. This plugin feeds those strings through an inner parser pipeline
(`remarkParse` + `remarkEnscribe`) to produce structured mdast arrays. After
this step, `node.content` is `Node[]` instead of a string.

**Inner processor:** An independent `unified` instance with the four parsing
plugins `remarkParse`, `remarkEnscribe`, `remarkMath`, and `remarkGfm` —
no structural or compile steps. It is created by `enscribeInterpreter` and
passed to this plugin via the `{ processor }` option. The inner processor
does not include `remarkRecursiveContent` itself; recursion into nested
tags is handled by the plugin's own tree walk. It also does not include
`enscribeNormalizeToCanonical` — normalization runs once on the outer tree
after this plugin has revealed every pipe-content subtree, so
delegated-parser nodes produced inside pipe content are normalized at the
same pass as those produced at the top level.

**What it touches:** Only `enscribeTag` nodes where `contentHandler ===
'default'`. Nodes where `contentHandler !== 'default'` (opaque content such
as math, code, and raw table data) are skipped entirely.

**Paragraph unwrapping:** The inner parser wraps prose in a paragraph node.
For content that is logically inline (a single paragraph of text), the plugin
unwraps the paragraph and stores the paragraph's children directly. Multi-paragraph
content keeps the block structure. The extraction rule is:

- `root.children.length === 1 && root.children[0].type === 'paragraph'`
  → return `paragraph.children` (inline array)
- Otherwise → return `root.children` (block array)

This means `<em | emphasized>` produces an inline children array containing
just the text node `"emphasized"` — not a paragraph wrapper around it.

**Mixed content:** When the parser's escape processing has produced a
`(string | enscribeParseError)[]` array for `node.content`, each string
segment is parsed independently and error nodes are preserved in place.

**Recursion:** After each node's content is parsed, the plugin recursively
visits the newly revealed content to process any nested `enscribeTag` nodes.
Maximum depth is 10 (hard-coded constant `MAX_DEPTH`). Documents in practice
never approach this limit.

**Cross-reference:** `notes/specs/recursive-content-spec.md` for design rationale
and edge cases.

---

### 3.1.5 enscribeNormalizeToCanonical

**Source:** `packages/enscribe/src/interpreter/plugins/normalize-to-canonical.js`
(exported as `enscribeNormalizeToCanonical`; `enscribeNormalizeMarkdown` is kept
as a backward-compat alias of the same plugin).

**Purpose:** The single normalization gate — it coerces every *authored* form to
its canonical Layer 1 shape, so no downstream stage ever sees a non-canonical
node. Its work spans several rule groups (the full group structure is documented
in `notes/specs/pipeline.md` §4.0):

- **Delegated-parser nodes → canonical tags** (the mapping table below):
  `remark-math` / `remark-gfm` nodes become canonical `enscribeTag` math / table
  nodes.
- **Sigil tagnames → vocabulary names** via the tagname↔sigil cipher
  (`#`→`section`, `$`→`inline-math`, `` ` ``→`inline-code`, …).
- **Shorthand expansion** via the shared expansion map
  (`lib/shorthand-expansions.js`, `createShorthandRegistry`): the book-part family
  (`<chapter>`→`<book-part book-part-type="chapter">`, book-context-gated) and the
  DSL shorthand family (`<mermaid>`→`<diagram mermaid>`, `<csv>`→`<table csv>`, …),
  with later-wins+warn clobber and reserved-name rejection.
- **Kwarg → child-tag lifts** for structured-element tags (`<meta>` / `<author>`),
  `<config>`, and frameable tags (`caption` / `title`).
- **Markdown inline lifts** (`emphasis`→`<i>`, `strong`→`<b>`, …; see
  `notes/specs/idioms.md`).

After this pass every math, pipe-table, sigil, shorthand, and markdown-idiom
construct is one canonical node type, indistinguishable from the authored
long-form.

**Host format-word validation (#85):** as a final, observe-only step (after
canonicalization, so gate shorthands have already injected their format
positional), the gate validates each format-word host (`table`, `diagram`,
`library`) against `HOST_ACCEPT_SETS` (`lib/host-accept-sets.js`). A host whose
leading format word is outside its accept-set gets a located `file.message`
diagnostic and **still renders** — validation never mutates the tree or aborts.
See `notes/specs/format-words.md` §"The accept-set lives in the host" for the
mechanism and why `<data>` is excluded.

**Delegated-parser mapping:**

| input node type | from | replacement |
|----------------|------|-------------|
| `inlineMath`   | `remark-math` | `enscribeTag { tagname: '$',  isOpaqueContent: true, contentHandler: 'math' }` |
| `math`         | `remark-math` | `enscribeTag { tagname: '$$', isOpaqueContent: true, contentHandler: 'math-display' }` |
| `table`        | `remark-gfm`  | `enscribeTag { tagname: 'table', positional: ['md'], isOpaqueContent: true, contentHandler: 'table' }` |

**GFM table serialization:** Tables produced by `remark-gfm` are structured
mdast subtrees (`tableRow` → `tableCell` → inline children). The
normalization pass serializes them back to a GFM pipe-table string via
`gfmTableToPipeString()` and stores that string in the canonical node's
opaque `content` field, so the table handler's existing `parseMd` path
re-parses it the same way it would for an authored `<table md | ...>` tag.
Cells containing inline markup (emphasis, links, inline math) flatten to
plain text and a `file.message()` warning is emitted; cells with plain text
only are lossless. Authors who need rich-content cells should write
`<table md | ...>` directly.

**Drift guards at module load:** The normalize module asserts at load time
that `getContentHandler('$')`, `getContentHandler('$$')`, and
`getContentHandler('table')` return the expected handler strings
(`'math'`, `'math-display'`, `'table'`). If `dsl-registry.js` changes,
loading throws a clear error rather than producing silently wrong canonical
nodes.

**Pipeline position:** Step 1.5 — after `remarkRecursiveContent` (both outer
and inner parses have completed and all delegated-parser nodes are present)
and before `enscribeConfigDiscovery` (no structural plugin ever sees an
`inlineMath` / `math` / `table` node).

**Tree walk:** Uses `walkNormalize()` from `lib/walk-normalize.js` — a
pre-order DFS that replaces matching nodes in place (the whole `table`
subtree is replaced before its inline children are visited, so cell
contents are read directly off the original `remark-gfm` nodes during
serialization).

**Cross-reference:** AUD-20 in `notes/archive/audit-findings-2026-05.md` for
the Option-A decision rationale (closure recorded in `STATUS.md`
Milestones); `notes/specs/pipeline.md` §4.0 for the pipeline-level view.

---

### 3.2 enscribeConfigDiscovery

**Source:** `packages/enscribe/src/interpreter/plugins/config-discovery.js`

**Purpose:** Walk root-level `<config>` tags and extract their kwargs into a
`Map<string, string>` stored at `file.data.enscribeConfig`.

**What it does:** Descends the tree — both mdast `children` and
`enscribeTag` `content` — so deeply-nested `<config>` blocks are read, not
only root-level ones. For each `enscribeTag` with `tagname === 'config'`, it reads all
kwargs and adds them to the config map. Later `<config>` blocks override
earlier ones for the same key.

**What it does not do:** It does not modify the tree. Config nodes remain in
the tree (they will be collected into article-back by the structuring plugin,
where the hast handler renders them as null/hidden).

**Keys consumed by downstream plugins:**

| Key | Consumed by | Effect |
|-----|-------------|--------|
| `citation-style` | `buildCitationIndex` | CSL style for citation formatting (default: `chicago-author-date`) |
| `number-equations` | `enscribeNumbering` | Suppress equation numbering document-wide |
| `number-figures` | `enscribeNumbering` | Suppress figure numbering document-wide |
| `number-tables` | `enscribeNumbering` | Suppress table numbering document-wide |
| `number-boxes` | `enscribeNumbering` | Suppress numbered-`<aside>` ("Box N") numbering document-wide |
| `number-sections` | `numberSections` | Turn section numbering on/off (#57; default off for articles, on for books) |
| `bibliography-heading` | `enscribeBibliography` | Override the bibliography heading text (default: `References`) |
| `ref-prefix-{prefix}` | `enscribeRefResolution` | Custom display word for cross-reference labels (e.g., `ref-prefix-eqn=Eq.`) |

Deeply-nested `<config>` blocks (e.g., a `<config>` inside a
`<section>`) **are** read: `visitConfigs` recurses through both mdast
`children` and `enscribeTag` `content` (this closed the formerly-PG-9
"deeply-nested `<config>` not read" gap).

---

### 3.3 enscribeArticleStructuring

**Source:** `packages/enscribe/src/interpreter/plugins/article-structuring.js`

**Purpose:** Wrap the flat list of root children into the Layer 1 article
structure: `<article>` containing `<article-front>`, `<article-body>`, and
`<article-back>`.

**Document type detection:** Looks for `<meta type=...>`. If `type` is absent
or `article`, article structuring proceeds. If `type` is `book` or `book-part`,
a warning is emitted and the plugin returns early (no structural wrapping).

**Title promotion:** `<title>` and `<subtitle>` nodes found inside `<meta>`
content are renamed to `<article-title>` and `<article-subtitle>` in place
(the nodes stay inside `<meta>`).

**Title-after-pipe:** If a bare `<article | Title Text>` tag appears at root
level, its pipe content becomes `<article-title>` inside `<meta>`. If `<meta>`
already has a `<title>` or `<article-title>`, that value wins and a warning
is emitted; the pipe-supplied title is discarded.

**Region classification:** Each root child is assigned to one of four buckets:

| Bucket | Which nodes | Wrapping element |
|--------|-------------|-----------------|
| front | `<meta>` | `<article-front>` |
| back | `<config>`, `<bibliography>`, `<note-list>` | `<article-back>` |
| root siblings | `<data>` | (no wrapping; stay at root) |
| body | everything else | `<article-body>` |

`<data>` nodes hold citation data (read by `buildCitationIndex`). They
are not document content; in an article they stay at root level, outside
`<article>`. `buildCitationIndex` does not depend on that placement — it
deep-collects `<data>` wherever it lands (a book nests it inside
`<book-body>`) — but article-structuring keeps the article case flat.

Empty regions are suppressed. A document with no `<meta>` will have no
`<article-front>`; a document with no back-matter tags will have no
`<article-back>`.

**Tree shape after this step:**

```
root
  article
    article-front (optional)
      meta
        article-title
        ...
    article-body
      [body content]
    article-back (optional)
      config (if present)
      bibliography (if present)
  data (root sibling, not inside article)
```

**Document type detection update:** the warn-and-
skip for `book`/`book-part` types is now a defensive backstop. The
`enscribeBookStructuring` plugin (§3.3.5 below) runs before this one
and wraps book documents into a `<book>` root; article-structuring's
early check then detects the already-book-wrapped tree and skips
silently. The warn-and-skip code path remains as a safety net for the
case where book-structuring somehow didn't fire (e.g. a future test
that disables it).

---

### 3.3.5 enscribeBookStructuring

**Source:** `packages/enscribe/src/interpreter/plugins/book-structuring.js`

**Purpose:** Parallel to `enscribeArticleStructuring` for book
documents. Wraps the root children into the Layer 1 book structure
(`<book>` containing `<book-front>`, `<book-body>`, `<book-back>`)
per the BITS book DTD shape that the `book.md` / `book-part.md`
vocab entries declare.

**Pipeline position:** runs BEFORE `enscribeArticleStructuring`. For
`<meta type=article>` (or absent `type`) documents this plugin is a
no-op and article-structuring does its work. For `<meta type=book>`
or `<meta type=book-part>` documents this plugin transforms the tree;
the subsequent article-structuring detects the already-book-wrapped
tree and skips.

**Region routing by `book-part-type`:**

| book-part-type | Placement |
|---|---|
| chapter, part, introduction, conclusion, other | `<book-body>` |
| preface, foreword, dedication | `<book-front>` |
| appendix, glossary, colophon | `<book-back>` |

Per `book-part.md` §"Where book-parts appear".

**Body absorption:** the parser produces `<chapter | Title>` as a tag
with title content; subsequent paragraphs/sections/figures sit as
root-level siblings. The plugin gathers those siblings into the
chapter's content array — the authoring pattern is
`<chapter | Title>\nbody...\n<chapter | Next>`. The first-pass
`assembleBookPartContents` does this gathering before partition.

**Title promotion and per-book-part `<meta>` synthesis:** inside each
`<book-part>`, the title-after-pipe content lifts to a
`<book-part-title>` inside a synthesized `<meta>` wrapper. The same
synthesis absorbs any `<author>` child at the top of a book-part
(the edited-volume case where a chapter has its own author distinct
from the book-level author).

**Book-part shorthand expansion:** the gate (normalize-to-canonical
§"Group A1.7") expands `<chapter>` / `<part>` / `<appendix>` /
`<preface>` / `<foreword>` / `<introduction>` / `<conclusion>` /
`<glossary>` / `<dedication>` to `<book-part book-part-type="...">`
before this plugin runs — but only when the document is a book
context (signaled by `<meta type=book>` / `<meta type=book-part>` at
root). The book-context flag disambiguates `<glossary>` (which has
two meanings: standalone vocab-glossary container in articles vs.
appendix-shaped book-part in books).

**Tree shape after this step (book document):**

```
root
  book
    book-front
      meta (with book-title, book-subtitle, author, etc.)
      book-part (preface)
        meta (with book-part-title)
        [body content]
    book-body
      book-part (chapter)
        meta (with book-part-title)
        [body content]
      book-part (chapter)
        ...
    book-back
      book-part (appendix)
        meta (with book-part-title)
        [body content]
      bibliography (if present)
```

**Configurable knobs added in the same slice** (consumed by
downstream plugins; documented under each consumer):

- `<config counter-reset-scope>` — `none` / `chapter` / `section`.
  Default `chapter` for books, `none` for articles. See §3.7
  `enscribeNumbering` for the visitor's scope-tracking walk and
  per-scope renumbering logic.
- `<config note-scope>` — `document` / `chapter` / `section`.
  Default `chapter` for books, `section` for articles. See §3.11
  `enscribeNotePlacement` for the collection-unit dispatch.

**Cross-reference rendering with chapter prefix:** numbered entries
in a book document carry an `entry.data.scope = { chapter, section }`
field stamped by the scope-tracking visitor. `ref-resolution.js`'s
`computeRefText` consumes the scope to render "Figure 1.3" (chapter-
prefix) or "Figure 1.2.3" (chapter.section.figure) per the resolved
scope. Articles render "Figure 3" (no prefix) — current behavior
preserved.

**Section numbering (`numberSections`, #57).** Optional, gated by
`<config number-sections>` (default off for articles, on for books). It
runs in `enscribeApplyNumbers` after `fillNumbering` (so section registry
entries exist) and before ref-resolution. A hierarchical counter-stack
walk over the **body** section tree computes each section's **canonical
dotted number** — `1` / `1.1` / `2` for articles, chapter-prefixed
(`3.1` / `3.1.2`) for books. **All book-part headings are numbered**:
body chapters get an arabic number, book-back appendices an alphabetic
letter (`A`, `B`), each prefixing the sections within it (`A.1`). The
number is stamped on the section / book-part node and its title element
(`section-title` / `book-part-title`), and written onto the element's
registry `entry.number` — book-parts are **registered here** (they have
no numbering-visitor entry) so cross-refs resolve. Emission is one
mechanism: the number is real DOM content, a
`<span class="section-number">` prepended in `schemaDispatch` (HTML), and
a `<label>` before `<title>` in JATS — `<sec><label>` for sections and
`<book-part-meta><title-group><label>` for book-parts. Presentation (the
words "Chapter"/"Appendix", separators) is the theme's / the cross-ref
prefix-word's job; the document carries the bare enumerator. When off,
`numberSections` is a no-op — unnumbered output is byte-identical.

---

### 3.4 enscribeSectionNesting

**Source:** `packages/enscribe/src/interpreter/plugins/section-nesting.js`

**Purpose:** Convert a flat sequence of `section` / `sub-section` /
`sub-sub-section` nodes into a properly nested tree where each section contains
the content that follows it until the next peer-level or parent-level section.

**When it runs:** After `enscribeArticleStructuring`. Sections are already
inside `<article-body>`.

**Algorithm:** Single-pass stack. For each node in a content array:

- If the node is a section (depth 1, 2, or 3): pop any open sections at the
  same depth or deeper; attach this section to the innermost remaining open
  parent (or to the top-level result if the stack is empty); push onto the
  stack.
- If the node is not a section: attach it to the innermost open section's
  content, or to the top-level result if no section is open.

**Title extraction:** The section's pipe content (now a parsed mdast array
from `remarkRecursiveContent`) is promoted to a title element as the first
child:

| tagname | title element |
|---------|---------------|
| `section` | `section-title` |
| `sub-section` | `sub-section-title` |
| `sub-sub-section` | `sub-sub-section-title` |

Single-paragraph wrappers are unwrapped: if the pipe content is a single
paragraph, its children are used directly as the title's content.

**Tree walk:** The plugin walks `enscribeTag.content` arrays manually (not
via `unist-util-visit`), because visit only recurses through `.children` and
these nodes use `.content`.

---

### 3.5 buildCitationIndex

**Source:** `packages/enscribe/src/interpreter/plugins/library-load.js`

**Purpose:** Parse BibTeX or CSL-JSON citation data from `<data>/<library>`
nodes, and store a citation-js `Cite` instance in `file.data.enscribeCitations`.
In `enscribeInterpreter`, `buildCitationIndex` is called directly via an anonymous
plugin wrapper (`enscribeCitationIndex`) at step 5 — not through
`this.use(enscribeLibraryLoad)`. The exported `enscribeLibraryLoad` plugin wrapper
is kept for external callers and the test suite.

**Input structure:** `<data>` nodes, deep-collected wherever they sit in the
tree — at root level in an article, nested inside `<book-body>` in a book.
Each `<data>` may contain one or more `<library>` nodes.

**Content sources (checked in order):**

1. `kwargs.src` is set → read an external file at `resolve(assetsDir, src)`.
   The `assetsDir` option must be provided to `enscribeInterpreter`; if it
   is null, a `file.message()` warning is emitted and the library is skipped.
2. `node.content` is a non-whitespace string → use it as inline BibTeX or
   CSL-JSON.
3. Neither → `file.message()` warning, skip.

**Format selection:** The payload language is named by the leading format word —
the positional `<library bibtex | …>` (the canonical format-word form) or the
legacy `format=` kwarg. A named, known format is passed to citation-js as a
`forceType`; when the format word is omitted, citation-js auto-detects (the
default). This is the storage-host form of the format-word convention
(`notes/specs/format-words.md`).

**Storage host, not a structured element (#24 reframe):** `<library>` (and the
`<data>` container that holds it) is a **storage host on the language axis** —
purpose `storage`, the format word naming the payload language, the body the
verbatim payload. It is deliberately *not* a `STRUCTURED_ELEMENTS` member (those
are enscribe-native named-field tags like `<meta>` / `<author>`). The
language/host model owns the payload; the container shape of `<data>` remains the
open #24 question. See `DESIGN.md` §"The two axes: host and language".

**Merging:** Multiple `<library>` nodes are parsed into separate `Cite`
instances, then their `.data` arrays are concatenated and a new merged `Cite`
instance is built from the combined CSL-JSON.

**Output:** `file.data.enscribeCitations`:

```js
{
  cite: Cite,          // citation-js instance with all entries
  order: [],           // first-cited key order (filled by cite-resolution)
  style: string,       // CSL style from config, default 'chicago-author-date'
}
```

**No-library case:** If no `<data>` nodes exist anywhere in the tree, the
plugin returns immediately. `file.data.enscribeCitations` is not set.
Downstream citation plugins check for its presence before proceeding.

---

### 3.5.5 enscribeTableCellParse

**Source:** `packages/enscribe/src/interpreter/plugins/table-cell-parse.js`
**Step:** 5.5 — after `buildCitationIndex`, before `enscribeNotes`.

**What it does:** A data-format table (`<table csv|tsv|json|yaml|md | …>`) holds
*data*, so its cells are **literal by default**. This plugin is the opt-in that
parses selected cells as Enscribe inline markup, stamping the parsed inline mdast
on `node._parsedCells` (#21 / #105). It is a no-op for any table without an
opt-in, so non-opted documents are byte-identical. (Markdown / GFM pipe tables
already inline-parse via `remark-gfm` and are untouched; the no-format raw-HTML
escape-hatch table is §3.5.6's job.)

**Opt-in surface** (precedence: per-table attribute > global config > literal
baseline):
- `+parse-text` — parse every cell.
- `-parse-text` — force every cell literal (overrides a global default).
- `parse-columns="a, b"` — parse only the named columns (matched by header name).
- `<config parse-data-tables=true>` — a doc-wide default; a per-table flag wins.

The all-cells flag goes through `readBoolKwarg` (priority booleans > kwargs >
config > default); `parse-columns` adds named columns on top.

**Why a plugin, and why at step 5.5:** an opted-in cell may contain a `<note>`,
`<ref>`, or `<cite>`, which resolve only if they are tree-resident when the
resolution passes run. So this runs in the mdast phase **before** notes /
numbering / ref / cite resolution, parsing opted-in cells into `_parsedCells`.
The shared walkers (`discover` / `walkReplace`) descend that stamp (§"Tree-walking
is centralized"), so a cell footnote registers / numbers / hoists and a cell
ref / cite resolves exactly like a body one. (#21 originally ran *after* notes,
leaving cell footnotes out of scope; #105 moved it before notes.)

**Data stays literal:** parsing is a READ of `node.content` or the `src=` file —
nothing is written back. A `src=` table needs `assetsDir` (else the cell is left
literal); a parse / read error leaves the table to the handler (which emits the
error table). Both render channels — the HTML table handler and the JATS table
emitter — read `_parsedCells`, so a parsed column parses in both.

**Output:** `node._parsedCells = { headers, rows }`, each cell `{ inline: Node[] }`
(parsed) or `{ text: string }` (literal); header cells stay literal.

---

### 3.5.6 enscribeHtmlTableCells

**Source:** `packages/enscribe/src/interpreter/plugins/html-table-cells.js`
**Step:** 5.6 — immediately after §3.5.5.

**What it does:** Re-resolves Enscribe inline inside a **no-format raw-HTML
`<table>`** (the escape-hatch table) by parsing its HTML grid and stamping
`node._htmlTable` (#108) — the same shape #106 defines. A no-op for any table
that is not a raw-HTML grid, so documents without one are byte-identical.

**The round-trip it closes:** the JATS importer serializes a complex
(HTML-layout) table to `.emd` as the no-format `<table>` escape hatch, whose
cells carry HTML-escaped Enscribe inline *source* (`<cite @k>` →
`&lt;cite @k&gt;`, #106's `htmlGridToSource`). On a fresh render of that `.emd`
the table arrives as an opaque string with **no** `_htmlTable` stamp (the
importer's in-memory stamp does not survive serialization), so the handler's raw
branch would emit literal source. This plugin re-parses the grid, decodes each
cell's source, parses it to canonical inline mdast (the same
`parseInlineCellToMdast` as §3.5.5), and stamps `_htmlTable` — so the shared
walkers descend it and both render channels emit it, with no handler changes. It
also makes a hand-authored raw-HTML `<table>` whose cells carry Enscribe inline
first-class (`<td>see <cite @k></td>` resolves).

**Scope guard:** only a no-format `<table>` (no positional format) whose content
looks like a grid (contains `<tr>`); other raw-HTML content is left as raw
passthrough; a data-format table is left to §3.5.5; a table already carrying
`_htmlTable` / `_parsedCells` (the importer's direct in-memory path, or §3.5.5)
is untouched.

**Output:** `node._htmlTable = { rows: [{ section: 'head' | 'body', cells:
[{ header, inline: Node[], colspan?, rowspan?, align? }] }] }`.

---

### 3.6 enscribeNotes

**Source:** `packages/enscribe/src/interpreter/plugins/notes.js`

**Purpose:** Register note elements (record-only). Walks the tree with `discover()`,
calls `registry.assign('note', id, { numbered: true })` for each `<note>` node
found, and stores `{ node, entry }` pairs in `file.data.enscribeNotesPending`.
`<note>` nodes **stay in the tree** at their authored positions through steps 9–10
so that any refs/cites inside note bodies are resolved before placement. Actual
marker splicing and note-list injection are done by `enscribeNotePlacement` (step 11).

**Placement modes:** Each note has a `placement` kwarg (also accepts `position`
as a legacy alias). The placement value is read here and stored in
`entry.data.placement` for use by `enscribeNotePlacement`. Valid values:

| Value | Class on `<note-list>` | `<li>` class |
|-------|------------------------|--------------|
| `end` (default) | `endnotes` | (none) |
| `foot` | `footnotes` | (none) |
| `side` | `notes` | `sidenote-fallback` |

All placement modes collect notes into a single `__note-list` in
`<article-back>`. Per-section footnote collection — placing `placement=foot`
notes at the bottom of each section rather than aggregating them in
`<article-back>` — is part of the design for the `foot` placement; the
single-list aggregation is the current behavior pending the per-section
walk.

When a document uses more than one placement mode, the class falls back to
`notes` (neutral). This fallback is applied by `enscribeNotePlacement`.

**Registry:** Uses `registry.assign('note', node.id || null, { numbered: true })`
to claim a numbered slot. Sequential numbers are assigned when
`registry.numberRegistry()` runs in `enscribeApplyNumbers` (step 8). The
registry is shared across plugins via `file.data.enscribeRegistry`.

**Tree walk:** Uses `discover()` from `lib/discover.js` — a read-only pre-order
DFS that recurses into `enscribeTag.content` arrays (skipping opaque-content
nodes) and mdast `.children` arrays.

---

### 3.7 enscribeNumbering

**Source:** `packages/enscribe/src/interpreter/plugins/numbering.js`

**Purpose:** Register `$$` (display-math), `figure`, and `table` nodes with
the registry; register `section`, `sub-section`, and `sub-sub-section` nodes
for cross-reference lookup; and register code-block sigil nodes (tagname
`` ``` ``) for cross-reference lookup. Stores `{ node, entry }` pairs for
numbered elements in `file.data.enscribeNumberingPending`. Display numbers
are assigned by `enscribeApplyNumbers` (step 8) after `numberRegistry()`
runs.

**Numbered types and registry keys:**

| tagname | registry type | config disable key |
|---------|---------------|-------------------|
| `$$` | `equation` | `number-equations` |
| `figure` | `figure` | `number-figures` |
| `table` | `table` | `number-tables` |

**Section registration (AUD-09 fix):** `section`, `sub-section`, and
`sub-sub-section` nodes are registered with `numbered: false`. This makes them
findable by label via `registry.findByLabel()` for cross-references (e.g.,
`<ref @sec:intro>`), without assigning sequential numbers.

**Code-block sigil registration (G4 / AUD-09 closure):** `` ``` `` nodes
are registered under registry type `code` with `numbered: false`. A
colon-label id (e.g. `<``` python #code:newton | ... ```>`) lands in the
label index, so `<ref @code:newton>` resolves via the same
`registry.findByLabel()` path that sections use. Plain fenced code blocks
written without a shorthand wrapper are mdast `code` nodes with no
shorthand wrapper and no accessible id, so they remain non-referenceable —
this is a deliberate, reversible choice (closure recorded in `STATUS.md`
Milestones; original entry at `notes/archive/audit-findings-2026-05.md`
AUD-09). Switching to numbered listings later requires
flipping `numbered: false` to `numbered: true` here, adding `'code'` to
`NUMBERED_TAGNAMES`, and adding a `CONFIG_KEY` entry for `'code'`.

**Decision priority (most specific wins):**

1. `+numbered` / `-numbered` boolean kwarg on the tag  
   (stored in `node.booleans.numbered`)
2. `numbered=true` / `numbered=false` string kwarg  
   (stored in `node.kwargs.numbered`)
3. Document-level config key (e.g., `number-equations=false`)
4. Default: numbered (`true`)

This logic is implemented by `readBoolKwarg()` in `lib/bool-kwarg.js`.

**Side effects per numbered element node:**

- `node.registryType = 'equation' | 'figure' | 'table'` (set immediately)
- `file.data.enscribeNumberingPending.push({ node, entry })` (deferred;
  `node.computedNumber` is set by `enscribeApplyNumbers` in step 8)

Unnumbered nodes are still registered (so they appear in the type map for
potential lookup), but receive `number: null` and `numbered: false`.

Entries whose id contains `:` are indexed in the cross-type label index for
cross-reference lookup.

**Tree walk:** Uses `discover()` from `lib/discover.js` (same shared walker as
`enscribeNotes`).

---

### 3.8 enscribeApplyNumbers

**Source:** `packages/enscribe/src/interpreter/index.js` (anonymous plugin defined inline).

**Purpose:** Assign display numbers to all registered numbered elements and write
them back onto the nodes.

**What it calls:**

1. `registry.numberRegistry()` — assigns sequential display numbers to all
   registered entries (equations, figures, tables, notes) in a single ordered pass.
   After this call, `entry.number` is a positive integer for numbered entries,
   `null` for unnumbered.
2. `fillNumbering(file)` (from `plugins/numbering.js`) — reads
   `file.data.enscribeNumberingPending` and sets `node.computedNumber = entry.number`
   on each node.

**Why two calls:** Steps 6–7 (`enscribeNotes`, `enscribeNumbering`) each claim
registry slots during their walks. `numberRegistry()` must run once after all
registration is complete so that numbers are assigned in a single ordered pass.
`fillNumbering` then writes the assigned numbers back to nodes.

**Must run after:** Steps 6 (`enscribeNotes`) and 7 (`enscribeNumbering`) — all
registration must be complete before numbering is computed.

**Must run before:** `enscribeRefResolution` (step 9) — ref resolution reads
`entry.number` when computing reference display text; nodes must have `computedNumber`
set before ref text is built.

---

### 3.9 enscribeRefResolution

**Source:** `packages/enscribe/src/interpreter/plugins/ref-resolution.js`

**Purpose:** Replace each `<ref>` node with either a `__ref-marker` (resolved)
or `__ref-error` (unresolved) internal node.

**When it runs:** After `enscribeApplyNumbers` (step 8). At this point all numbered
elements have `computedNumber` set and their colon-ids are in the label index.

**Target id extraction:**

- `node.atRefs[0]` (canonical: `<ref @eqn:newton>`)
- `node.kwargs.target` (legacy fallback: `<ref target=eqn:newton>`)
- Neither → `__ref-error` with `targetId: '(none)'` and a `file.message()` warning.

**Resolution:** Calls `registry.findByLabel(targetId)`. Only colon-ids (ids
containing `:`) are in the label index — the design intentionally uses the
colon-id convention as the cross-reference namespace (see DESIGN.md, "Design
tensions and accepted tradeoffs"). A `<ref>` targeting a non-colon id always
produces `__ref-error`.

**Reference text computation:**

The display text for a resolved reference is derived from the id prefix and
the entry's number:

| Condition | Display text |
|-----------|-------------|
| Known prefix + numbered | `"equation 3"`, `"figure 1"`, etc. |
| Unknown prefix + numbered | just `"3"` |
| Unnumbered target | label-tail of id (e.g., `"newton"` from `eqn:newton`) |

Built-in prefixes: `eqn` → `equation`, `fig` → `figure`, `note` → `note`,
`tab` → `table`, `sec` → `section`, `code` → `listing`, `thm` → `theorem`,
`lem` → `lemma`, `def` → `definition`, `ex` → `example`.

`code` → `listing` is the G4 addition paired with the code-block sigil
registration in §3.7; closure recorded in `STATUS.md` Milestones
(original AUD-09 entry at `notes/archive/audit-findings-2026-05.md`).

Config key `ref-prefix-{prefix}` overrides a prefix word per-document.

The `format` and `type` kwargs on `<ref>` flow through to `data-ref-format`
and `data-ref-type` attributes on the rendered anchor (the apparatus-tag
reconciliation slice, 2026-05-25). The resolver-generated display text is
still computed from the id prefix and the `DEFAULT_PREFIXES` dictionary;
varying that text per `format` / `type` is future enhancement work, not
required for the kwargs to be honored. The `+link` / `+preview` boolean
flags control the rendered output's anchor-vs-span shape and hover-preview
attachment respectively (both default true). The `+title` flag is reserved.
Author-supplied pipe content in `<ref>` (custom link text override) is
still deferred.

---

### 3.10 enscribeCiteResolution

**Source:** `packages/enscribe/src/interpreter/plugins/cite-resolution.js`

**Purpose:** Replace each `<cite>` node with `__cite-marker` (resolved keys)
and/or `__cite-error` (missing keys) internal nodes.

**When it runs:** After `buildCitationIndex` (step 5). If `file.data.enscribeCitations`
is not set (no library was loaded), the plugin is a no-op.

**Key extraction (tries four sources in order):**

1. `node.atRefs` — canonical: `<cite @Smith2020>` (single key) or `<cite @Smith2020 @Jones2019>` (multiple space-separated atrefs). `@` is stripped by the grammar; `atRefs` contains bare keys.
2. `node.positional` — bracketed form: `<cite [@Smith2020, @Jones2019]>`. Each item is a string with `@` preserved; the resolver strips `@` from each item.
3. `node.content` as a string — pipe form: `<cite | Smith2020,Jones2019>`.
4. `node.content` as a parsed array — text extracted recursively. In practice
   this path cannot currently occur because `<cite>` is not in the DSL
   registry; implemented defensively.

**Dispatch per `<cite>`:**

- All keys found → one `__cite-marker` with `kwargs.html` = citation-js output.
- All keys missing → one `__cite-error` with `kwargs.keys`.
- Mixed → `[__cite-marker, __cite-error]` (both visible in output).

Citation-js `format('citation', ...)` is called with `entry: foundKeys`,
`template: style`, `format: 'html'`, `lang: 'en-US'`.

**Citation order tracking:** First-cited order is recorded in `citations.order`
as keys are resolved. This list drives bibliography assembly.

**CSL-driven ordering.** Multi-key citations are sorted by the CSL processor
(usually alphabetically for author-date styles), not in the authored key
order. Preserving authored order would require post-processing
citation-js's output and is open work in the roadmap.

---

### 3.11 enscribeNotePlacement

**Source:** `packages/enscribe/src/interpreter/plugins/note-placement.js`

**Purpose:** Splice `__note-marker` nodes in place of `<note>` nodes, build
`__note-list-item` nodes from the now-resolved note content, and inject a
`__note-list` into `<article-back>`. This is the placement step that was separated
from `enscribeNotes` in the R3a refactor.

**When it runs:** After `enscribeCiteResolution` (step 10). At this point:
- `<note>` nodes are still in the tree (they stayed through steps 9–10 so their
  content arrays were resolved — refs/cites inside note bodies are now
  `__ref-marker`/`__cite-marker` nodes).
- `entry.number` is set for each note (from step 8).
- `file.data.enscribeNotesPending` holds `{ node, entry }` pairs in document order.

**What replaces an inline `<note>`:** A `__note-marker` internal node:

```js
{
  type: 'enscribeTag',
  tagname: '__note-marker',
  kwargs: {
    noteId: 'note-1',    // assigned id
    number: 1,           // sequential display number (from entry.number)
    refId: 'noteref-1',  // id of the superscript marker element
  },
  content: [],
}
```

**Note list items:** Collected into `__note-list-item` nodes with kwargs:

```js
{ number, refId, sidenote: true|false }
```

The `content` of each `__note-list-item` is the original `<note>` content
(the mdast array from `remarkRecursiveContent`, now containing resolved
`__ref-marker` / `__cite-marker` nodes).

**Note list injection:** A single `__note-list` is prepended (`unshift`) to
`article-back.content`. If no `<article-back>` exists, one is created.
When a document uses more than one placement mode, the class on `<note-list>`
falls back to `notes` (neutral).

**Tree walk:** Uses `walkReplace()` from `lib/walk-replace.js` to splice
`__note-marker` nodes in place of the found `<note>` nodes.

---

### 3.12 enscribeBibliography

**Source:** `packages/enscribe/src/interpreter/plugins/bibliography.js`

**Purpose:** Render the bibliography HTML and inject it into the back-matter
region — `<article-back>` for an article, `<book-back>` for a book.

**When it runs:** After `enscribeCiteResolution` (`citations.order` is populated).

**Empty case:** If `citations.order.length === 0` (no resolved citations), any
author-placed `<bibliography>` tag is removed from the back-matter region. No
bibliography is injected.

**Placement:**

- If the author placed an explicit `<bibliography>` tag in the document
  (which structuring puts in the back-matter region), it is found and replaced
  in-place with a `__bibliography` internal node.
- Otherwise: the back-matter region is found or created — `<article-back>` for
  an article, `<book-back>` for a book — and `__bibliography` is appended
  (`push`) to its content, after notes (which used `unshift`).

**Book placement (design decision, 2026-05-29):** a book gets a **single
document-wide bibliography** placed at the end of `<book-back>`, mirroring the
article path. book-structuring creates `<book-back>` only when there is
back-matter (appendix/glossary); if none exists, bibliography creates one and
appends it to the `<book>`. Per-chapter (chapter-scoped) bibliographies —
scoped the way `note-scope=chapter` scopes footnotes — are a deferred
post-alpha option (filed in GitHub Issues).

**HTML generation:** citation-js `format('bibliography', ...)` with
`template: style`, `format: 'html'`, `lang: 'en-US'`. Each `.csl-entry` div
gets `id="ref-{KEY}"` injected alongside its existing `data-csl-entry-id`
attribute. This gives the hover-preview JavaScript something to look up via
`document.getElementById('ref-KEY')`.

**`__bibliography` kwargs:** `{ headingHtml, bibBodyHtml }`. The heading is
`<h2>{text}</h2>`, where `{text}` is the `bibliography-heading` config value when
set, else `References`. The author-supplied text is HTML-escaped (the heading is
emitted as a raw hast node).

---

## 4. The compile step

The compile step is registered as `this.compiler` in unified (the standard API
for the stringify step). It runs after all mdast-transform plugins complete.

### 4.1 mdast → hast

```js
const hast = toHast(tree, {
  handlers: { enscribeTag: tagHandler },
  allowDangerousHtml: true,
});
```

`toHast` from `mdast-util-to-hast` converts standard mdast nodes via built-in
rules. The `enscribeTag` handler is called for every `enscribeTag` node in
the tree. A custom `html` handler (`htmlNodeHandler`) processes author-written
raw HTML: a tag in the vocabulary passes through, a non-vocabulary tag is
escaped to literal text (no HTML passthrough), and an HTML comment
(`<!-- … -->`) is stripped entirely. `allowDangerousHtml: true` remains set so
the interpreter's own injected raw nodes (KaTeX output, citation HTML, table
raw mode) emit verbatim — it does not re-enable passthrough of author HTML,
which the `html` handler has already converted.

### 4.2 Asset injection

After `toHast` produces the hast tree, the compiler prepends a document-fonts
`<style>` element unconditionally, then conditionally prepends KaTeX CSS
(when math is present) and hover-preview JS+CSS (when notes, refs, or cites
are present). See section 10 for details.

### 4.3 Formatting and serialization

```js
rehypeFormat()(hast);
return toHtml(hast, { allowDangerousHtml: true });
```

`rehypeFormat` adds indentation and line breaks to block elements while leaving
inline content and `<style>` / `<script>` contents untouched.

`toHtml` with `allowDangerousHtml: true` emits raw-node values verbatim (used
for KaTeX output, citation HTML, inline CSS/JS blocks).

---

## 5. Handler dispatch

The custom `enscribeTag` handler is produced by `createEnscribeTagHandler(opts)`
in `packages/enscribe/src/interpreter/interpret-plugin.js`. It is called once
per `enscribeTag` node during `toHast`.

### 5.1 Dispatch order

For each node, the handler performs this sequence:

1. **INTERNAL_REGISTRY lookup** by `node.tagname`. If found, call the registered
   function and return the result (or `null` to suppress the node).

2. **Vocabulary lookup** by `node.tagname` directly. By this point in the
   pipeline, the normalize-to-canonical gate (`plugins/normalize-to-canonical.js`,
   pipeline step 1.5) has rewritten every sigil tagname to its canonical Layer
   1 vocabulary name via the tagname↔sigil map's lift direction — sections
   (`#`/`##`/`###` → `section`/`sub-section`/`sub-sub-section`), math
   (`$`/`$$` → `inline-math`/`display-math`), and code (`` ` ``/` ``` ` →
   `inline-code`/`code-block`). The runtime sigil translation that previously
   lived here (`resolveVocabKey`) was removed when the gate consolidated this
   work; see `DESIGN.md` §"The single gate".

3. If the vocabulary lookup did not find an entry:
   - Emit `warnUnknownTag(tagname)` to console.
   - Return `makeUnknownElement()`, which renders the tag as **literal text**
     reconstructed from the node's parsed parts and emitted as text nodes, so
     the serializer escapes `<`/`>`. An unrecognized tag is not an error and is
     not passed through as HTML; the reader sees the angle brackets. The
     literal is reconstructed in the **same authoring form the author used**,
     read from the node's `form` field (plus `selfClosing` and content
     presence) — not canonicalized to one form:
     - `form: 'long'` → `<tag …>content</tag>`
     - `form: 'short'` with content (pipe form) → `<tag … | content>`
     - `form: 'short'`, `selfClosing` → `<tag … />`
     - `form: 'short'`, no content → `<tag …>` (bare opener)

     So `<glurp>hi</glurp>` displays as `<glurp>hi</glurp>` and `<glurp | hi>`
     as `<glurp | hi>`. When the content was re-parsed into child nodes (the
     default-handler case), the children are still rendered between the literal
     opener and closer, so a *recognized* tag nested inside an unrecognized one
     keeps rendering (e.g. the `<b>` in `<glurp>see <b>bold</b></glurp>`).
     Attribute order and quoting are canonicalized by `reconstructOpener` — the
     echo is form-faithful, not byte-exact. (Same-line long form is a
     recognized authoring spelling — see `shorthand-syntax.md` §"Long-form
     tags"; only the *tagname* is unknown here, not the syntax.)

4. **SUPPRESSED_APPARATUS check.** If the (now-confirmed) vocabulary tag is in
   `SUPPRESSED_APPARATUS` (`<data>` / `<library>`), return `null` — these are real
   vocabulary tags whose body renders to nothing (their content is consumed at
   build time by `library-load.js`). They are kept distinct from INTERNAL_REGISTRY,
   which holds only plugin-created nodes that have no vocabulary entry.

5. If `vocab.interpreter_strategy === 'handler'`:
   - Look up `vocab.handler_module` in HANDLER_REGISTRY.
   - If found, call `handlerFn(state, node, vocab, opts)`.
   - If the handler throws, emit `warnHandlerError()` and fall through to
     schema dispatch.
   - If the module is not in HANDLER_REGISTRY, emit a warning and fall
     through to schema dispatch.

6. **Schema dispatch** (fallback and default for `interpreter_strategy: schema`).

### 5.2 INTERNAL_REGISTRY

The `INTERNAL_REGISTRY` is a `Map<string, fn>` of nodes created by structural
plugins. These nodes do not have vocabulary entries and must be dispatched
before the vocabulary lookup.

| tagname | handler | rendered output |
|---------|---------|----------------|
| `__note-marker` | `noteMarkerHandler` | `<sup id="noteref-N" data-note-id="ID"><a href="#ID">N</a></sup>` |
| `__note-list` | `noteListHandler` | `<note-list class="..."><ol>...</ol></note-list>` |
| `__note-list-item` | `noteListItemHandler` | `<li id="ID">...</li>` |
| `__ref-marker` | `refMarkerHandler` | `<a href="#ID" class="ref">TEXT</a>` |
| `__ref-error` | `refErrorHandler` | `<a href="#ID" class="ref-error">??ref: ID??</a>` |
| `__cite-marker` | `citeMarkerHandler` | `<cite class="cite" data-keys="...">FORMATTED HTML</cite>` |
| `__cite-error` | `citeErrorHandler` | `<cite class="cite-error" data-keys="...">??cite: KEY??</cite>` |
| `__bibliography` | `bibliographyHandler` | `<bibliography>HEADING + BIB HTML</bibliography>` |
| `__library-error` | `libraryErrorHandler` | `<div class="enscribe-library-error" role="alert">...</div>` (#133 — a `<library src>` that could not load; created by `library-load.js`) |

**SUPPRESSED_APPARATUS.** Separately, `<data>` and `<library>` are **real
vocabulary tags** (they have `data.md` / `library.md` entries) whose rendered body
output is suppressed — their content is consumed at build time by
`library-load.js`, so they emit nothing. They are listed in a small
`SUPPRESSED_APPARATUS` set and suppressed in dispatch step 4 (after the vocabulary
lookup confirms them), **not** in INTERNAL_REGISTRY — which is reserved for
plugin-created nodes that have no vocabulary entry, so each registry's name matches
its contract.

### 5.3 HANDLER_REGISTRY

The `HANDLER_REGISTRY` maps vocabulary `handler_module` strings to handler
functions. Elements with `interpreter_strategy: handler` go through this path.

| `handler_module` | handler function | vocabulary key |
|------------------|-----------------|---------------|
| `./handlers/figure.js` | `figureHandler` | `figure` |
| `./handlers/math.js` | `mathHandler` | `inline-math`, `display-math` |
| `./handlers/code.js` | `codeHandler` | `code` |
| `./handlers/code-block.js` | `codeBlockHandler` | `code-block` |
| `./handlers/inline-code.js` | `inlineCodeHandler` | `inline-code` |
| `./handlers/table.js` | `tableHandler` | `table` |
| `./handlers/diagram.js` | `diagramHandler` | `diagram` (engine read from `positional[0]`) |
| `./handlers/svg.js` | `svgHandler` | `svg` |
| `./handlers/frame.js` | `frameHandler` | `frame` |
| `./handlers/theorem.js` | `theoremFamilyHandler` | `theorem`, `lemma`, `corollary`, `proposition`, `definition`, `example`, `remark`, `proof` |
| `./handlers/aside.js` | `asideHandler` | `aside` (frameable boxed-prose member; #31) |

The retired `<mermaid>` / `<abc>` tags have no handler entries of their own:
the gate expands them to `<diagram mermaid>` / `<diagram abc>`, and
`diagramHandler` dispatches on the engine positional to the per-engine render
path. Likewise `<csv>` / `<tsv>` expand to `<table …>` and reach `tableHandler`.

### 5.4 Vocabulary loading

The vocabulary ships as a build-time-generated data module. The interpreter
imports `VOCABULARY` from the `layer1-vocabulary` package and wraps it in a
`Map` at module load (preserving the `vocabulary.get(key)` read-pattern the
dispatch sites use):

```js
import { VOCABULARY } from '@enscribejs/layer1-vocabulary';
const vocabulary = new Map(Object.entries(VOCABULARY));
```

The wrap happens once per Node.js process (at the top of
`interpret-plugin.js`) and is shared across all pipeline invocations in that
process; this is safe because `VOCABULARY` is `Object.freeze`d and
read-only.

The generated data module lives at
`packages/layer1-vocabulary/src/data.js` and is committed to the repo. It
is regenerated by `packages/layer1-vocabulary/build/generate-data-module.js`
(run via `npm run build` in `layer1-vocabulary`) from the source `.md` files
under `packages/layer1-vocabulary/elements/`. A `pretest` staleness guard
in `layer1-vocabulary` regenerates into a temporary path and diffs against
the committed `data.js`, failing CI with a clear instruction if the
committed file has drifted from its source files.

The generator reproduces the loader behavior the runtime once owned: it
reads every `.md` file in `elements/`, parses YAML frontmatter, and keys
by `html_output.element`. Files without frontmatter are tolerated
(lets README/SPEC files live in `elements/` without breaking loading);
malformed YAML fails the build loudly (the developer can and should fix
the source file at build time); duplicate keys warn (later wins).

The generator performs the shorthand-alias post-pass that registers
aliases from each spec's `shorthand_expansions` list. For each
`{ shorthand, expands_to }` pair, the shorthand is added to `VOCABULARY`
as a transparent alias pointing at the same spec object as `expands_to`
(shared reference, matching the loader's prior identity behavior), but
only when three guards hold: `expands_to` is a bare key (contains no
spaces — i.e. it names a vocabulary entry without any attached attribute
clause), `expands_to` is already a primary entry, and `shorthand` is
not. This is what makes `<quote | text>` dispatch to the `<blockquote>`
vocabulary entry rather than falling through to the unknown-tag
fallback. Complex expansions whose `expands_to` carries attribute clauses
(e.g. `book-part book-part-type="chapter"`) are not registered as aliases
— they require attribute-injection at dispatch time and are not handled
by the generator. A shorthand whose name collides with an existing
primary key is reported by the generator and skipped.

---

## 6. Schema dispatch

For elements with `interpreter_strategy: schema`, `schemaDispatch(state, node,
vocab)` builds a hast element mechanically from the vocabulary entry:

```
tagName   = vocab.html_output?.element ?? node.tagname
properties = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit))
children   = convertContent(state, node, vocab)
```

### 6.1 Property mapping (`mapAttributes`)

`mapAttributes(node, vocab, target, emit)`
(`@enscribejs/enscribe/core/map-attributes.js`) is the shared attribute mapper for
both output targets: the HTML side calls it with `target: 'html'` and the
`htmlEmit` callback, aggregating the result via `aggregateHtmlProps`; the JATS
exporter calls the same function with `target: 'jats'`. (The former
`buildProperties` wrapper was removed when this shared lift landed.) For the HTML
target it maps:

1. `node.id` → `properties.id`
2. `node.classes` → `properties.className`
3. For each kwarg in `node.kwargs`:
   - Look up `vocab.enscribe_attributes.kwargs[key]`.
   - If the def has a `maps_to` for the target and does NOT have
     `handled_by: 'handler'`, emit the attribute named `def.maps_to[target]`.
   - Kwargs marked `handled_by: 'handler'` are for handler-strategy elements
     only; schema dispatch ignores them.
4. For each boolean in `node.booleans` (the `+flag` / `-flag` surface), apply
   the same rule as kwargs: look up `vocab.enscribe_attributes.booleans[key]`,
   skip those marked `handled_by: 'handler'` (handler-strategy flags such as
   `+numbered` and `+link`), and require a `maps_to`. A true boolean emits its
   mapped attribute; a false boolean is omitted (HTML boolean-attribute
   semantics) unless the vocab declares a false mapping (not yet a supported
   shape). Today every declared boolean is `handled_by: 'handler'`, so this
   branch maps nothing yet — it completes the kwargs/booleans symmetry so a
   future schema-element boolean with a `maps_to` renders correctly.

### 6.2 Content conversion (`convertContent`)

1. If `node.isOpaqueContent` → return `[]` (content is raw data; not mdast).
2. If `node.content` is not an array → return `[]` (unparsed content; not
   expected after `remarkRecursiveContent` but guarded defensively).
3. If `vocab.content.type === 'prose'` and `content.length === 1` and
   `content[0].type === 'paragraph'` → use `content[0].children` directly
   (paragraph unwrap).
4. Otherwise → use `content` directly.
5. In all cases: `nodes.flatMap(child => state.one(child, node))`.

The paragraph unwrap handles the case where pipe text was re-parsed into a
single-paragraph wrapper. For elements like `<em>`, `<strong>`, `<aside>`,
and `<section-title>`, the content is prose and the paragraph wrapper would
produce `<em><p>text</p></em>` instead of `<em>text</em>`. Unwrapping produces
the correct output.

Multi-paragraph content (e.g., a `<blockquote>` with two paragraphs in its
pipe content) is not unwrapped. The paragraphs appear as block children of
the blockquote element.

---

## 7. Handler implementations

### 7.1 mathHandler

**Source:** `packages/enscribe/src/interpreter/handlers/math.js`

**Input:** `enscribeTag` with `tagname: '$'` (inline) or `'$$'` (display);
`content: string` (opaque LaTeX source); `isOpaqueContent: true`.

**Process:**
1. Extract and trim the LaTeX source from `node.content`.
2. Call `katex.renderToString(latex, { displayMode, throwOnError: false, output: 'html' })`.
   `throwOnError: false` makes KaTeX produce a visible error span rather than
   throwing — documents always render to something.
3. Parse the KaTeX HTML string into hast fragments via `fromHtml(html, { fragment: true })`.
4. Strip position data (positions refer to KaTeX's internal string, not the source document).

**For numbered display-math:** If `node.computedNumber != null`, append a
`<span class="equation-number">(N)</span>` after the KaTeX children.

**Output:** `<inline-math>` or `<display-math>` element with KaTeX children.
These are custom HTML element names, valid in browsers as unregistered custom
elements.

### 7.2 figureHandler

**Source:** `packages/enscribe/src/interpreter/handlers/figure.js`

**Input:** `enscribeTag` with `tagname: 'figure'`; pipe content parsed into
mdast; optional kwargs `src`, `alt`, `align`, `width`, `type`.

**Process:**
1. Build figure properties: `id`, `className`, and schema-mapped kwargs
   (`align` → `data-align`, `width` → `data-width`, `type` → `data-figure-type`).
   The `src` and `alt` kwargs are marked `handled_by: handler` in the vocabulary
   and are not schema-mapped.
2. Convert pipe content to hast for `<figcaption>`. Single-paragraph wrapper
   is unwrapped.
3. If `src` kwarg: prepend `<img src="..." alt="...">` as first child.
   The `alt` value is `node.kwargs.alt ?? extractPlainText(node.content ?? [])`.
4. If numbered (`node.computedNumber != null`): prepend
   `<span class="figure-label">Figure N.</span>` and a space text node before
   the figcaption text.

**Output:** `<figure>` element with optional `<img>` and `<figcaption>`.

### 7.3 tableHandler

**Source:** `packages/enscribe/src/interpreter/handlers/table.js`

**Input:** `enscribeTag` with `tagname: 'table'`; opaque content (raw data
string); `positional[0]` = format word.

**Supported formats:** `csv`, `tsv`, `json`, `yaml`, `md` (GFM pipe table).

**Process:**
1. If no format word: raw HTML pass-through
   (`<table id="...">{{ raw content }}</table>` as a raw hast node).
2. If `kwargs.src`: read file from `join(assetsDir, src)`. Requires `assetsDir`
   option; returns `<table class="table-parse-error">` on failure.
3. Parse the data with the format-specific parser. Returns `{ headers, rows }`.
   `csv` and `tsv` share one RFC-4180-aware parser (quoted fields may contain
   the delimiter and doubled `""` quotes), parameterized by delimiter (`,` for
   csv, a tab for tsv); they do not parse differently.
4. `hasHeaders` determined by `readBoolKwarg(node, 'headers', null, null, true)`
   (default: first row is headers).
5. Build `<table>` with optional `<caption>` (from `kwargs.caption` and/or
   computed number), optional `<thead>`, and `<tbody>`.
6. For numbered tables: `<caption>` prepends
   `<span class="table-label">Table N.</span>`.

**Error handling:** Parse failures produce `<table class="table-parse-error">`
with a visible error message in a `<td>`.

### 7.4 codeBlockHandler

**Source:** `packages/enscribe/src/interpreter/handlers/code-block.js`

**Input:** `enscribeTag` with `` tagname: '```' ``; opaque content; optional
`positional[0]` = language.

**Output:** `<pre><code class="language-X" id="Y">content</code></pre>`.
Id and classes are on `<code>`, not `<pre>`. Language class is prepended to
any sigil-provided classes.

### 7.5 inlineCodeHandler

**Source:** `packages/enscribe/src/interpreter/handlers/inline-code.js`

**Input:** `enscribeTag` with `` tagname: '`' ``; opaque content; optional
`positional[0]` = language.

**Output:** `<code class="language-X" id="Y">content</code>`.

### 7.6 Note handlers

**Source:** `packages/enscribe/src/interpreter/handlers/notes.js`

Three handlers for the three internal note node types:

**`noteMarkerHandler`** (`__note-marker` → inline superscript):
```html
<sup id="noteref-N" data-note-id="ID">
  <a href="#ID">N</a>
</sup>
```

**`noteListHandler`** (`__note-list` → back-matter list):
```html
<note-list class="endnotes|footnotes|notes">
  <ol>
    <!-- note-list-item children -->
  </ol>
</note-list>
```
The `<ol>` uses `list-style: none` from bundled CSS; the visible numbering
comes from the `<sup>` inside each `<li>`.

**`noteListItemHandler`** (`__note-list-item` → individual note):
```html
<li id="ID" [class="sidenote-fallback"]>
  <sup>N</sup> [content...] <a href="#noteref-N" class="note-backref" aria-label="back to text">↩</a>
</li>
```
The `sidenote-fallback` class is present when the original note used
`placement=side`, so that future margin-positioning themes can identify and
reposition these items.

### 7.7 Ref handlers

**Source:** `packages/enscribe/src/interpreter/handlers/ref.js`

**`refMarkerHandler`** (`__ref-marker` → resolved cross-reference):
```html
<a href="#targetId" class="ref">TEXT</a>
```

**`refErrorHandler`** (`__ref-error` → unresolved cross-reference):
```html
<a href="#targetId" class="ref-error">??ref: targetId??</a>
```
Visible in the rendered output. Authors see unresolved refs immediately.

### 7.8 Cite handlers

**Source:** `packages/enscribe/src/interpreter/handlers/cite.js`

**`citeMarkerHandler`** (`__cite-marker` → resolved citation):
```html
<cite class="cite" data-keys="Smith2020">(Smith, 2020)</cite>
```
The citation HTML from citation-js is emitted as a raw node to preserve any
markup citation-js produces (e.g., `<i>` for journal names).

**`citeErrorHandler`** (`__cite-error` → missing citation key):
```html
<cite class="cite-error" data-keys="Smith2020">??cite: Smith2020??</cite>
```

**`bibliographyHandler`** (`__bibliography` → bibliography block):
```html
<bibliography>
  <h2>References</h2>
  <div class="csl-bib-body">
    <div id="ref-KEY" data-csl-entry-id="KEY" class="csl-entry">...</div>
  </div>
</bibliography>
```

---

## 8. The registry

**Source:** `packages/enscribe/src/interpreter/lib/registry.js`

The registry is a per-document numbering and label-lookup service. It is
created per-document by `createRegistry()` and attached to the unified `VFile`
at `file.data.enscribeRegistry`. The convenience function `ensureRegistry(file)`
creates it on first call.

### 8.1 Structure

- **Type map:** Each numbered type (`note`, `equation`, `figure`, `table`) has
  its own independent counter, sequence, and id → entry map.
- **Label index:** A cross-type map of colon-ids to entries.
  Only ids containing `:` are indexed here.

### 8.2 Entry shape

```js
{
  type:     'equation',   // registry type
  id:       'eqn:newton', // author-provided or auto-generated
  number:   3,            // sequential among numbered entries, or null
  numbered: true,         // whether this entry has a visible number
  data:     {},           // caller-supplied payload
}
```

Auto-generated ids take the form `${type}-${sequence}` (e.g., `note-1`,
`equation-2`). These never contain `:` and are never in the label index.

### 8.3 Methods

- `assign(type, id, { numbered, data })` — register an entry, return it.
- `lookup(type, id)` — find by type + id.
- `findByLabel(id)` — find a colon-id across all types.
- `entries(type)` — get all entries of a type in assignment order.
- `numberRegistry()` — assign sequential display numbers to all registered
  entries. Iterates every registered type in insertion order; within each
  type, walks entries in insertion (document) order and assigns the next
  positive integer to entries with `numbered: true`; sets `number: null` for
  entries with `numbered: false`. Called once after all `assign()` calls are
  complete and before any consumer reads `entry.number`. (This is the call
  invoked by `enscribeApplyNumbers` in §3.8.)
- `reset()` — clear all state (used in tests).

### 8.4 Cross-reference resolution

`refResolution` calls `findByLabel(targetId)`. This returns the entry for any
colon-id regardless of type. This is why `<ref #eqn:newton>` works even though
ref-resolution does not know the target is an equation — the label index is
type-agnostic.

---

## 9. The `file.data` namespace

Plugins communicate via `file.data`. Fields set during a pipeline run:

| field | set by | read by |
|-------|--------|---------|
| `file.data.enscribeConfig` | `enscribeConfigDiscovery` | `buildCitationIndex`, `enscribeNumbering`, `enscribeRefResolution` |
| `file.data.enscribeStrictMode` | `resolveStrictMode` (#36) | `remarkRecursiveContent`, the compiler (`index.js`) |
| `file.data.enscribeRegistry` | first `ensureRegistry(file)` call | `enscribeNotes`, `enscribeNumbering`, `enscribeApplyNumbers`, `enscribeRefResolution` |
| `file.data.enscribeCitations` | `buildCitationIndex` | `enscribeCiteResolution`, `enscribeBibliography` |
| `file.data.enscribeLoadedSources` | the caller (browser / CLI) via `processSync` data (#133 — pre-loaded `<library src>` content) | `buildCitationIndex` |
| `file.data.enscribeNotesPending` | `enscribeNotes` | `enscribeNotePlacement` |
| `file.data.enscribeNumberingPending` | `enscribeNumbering` | `enscribeApplyNumbers` |

---

## 10. Asset injection

Asset injection happens post-hast, pre-serialize, inside the compiler. Four
categories of assets are managed: document fonts (every document unless
`documentFontsCss: 'skip'`), KaTeX CSS (conditional on math), hover-preview
JS+CSS (conditional on notes/refs/cites), and lazy-loading machinery shared by
the conditional categories.

### 10.0 Document fonts (every document unless `'skip'`)

**Injected when:** on every rendered document unless `documentFontsCss: 'skip'`.

What is prepended to `hast.children` at the start of the compile step depends on
the `documentFontsCss` mode (default `embedResources ? 'inline' : 'link'`):

| mode | what is injected |
|------|-----------------|
| `'inline'` | a `<style>` from `getDocumentFontsCss()` — base64-embedded `@font-face` declarations for Inter (body/headings) and Source Code Pro (monospace), Latin-subsetted; self-contained, renders from `file://` and where the fonts aren't installed |
| `'link'` | a `<link rel="stylesheet">` to `DOCUMENT_FONTS_CDN_URL` (a Google Fonts `css2` request for the same families) — the external-by-default case |
| `'skip'` | nothing; the consumer supplies the fonts |

The `'inline'` path is the AUD-16 fix; before it, fixture rendering had the
fonts wired in via the render-fixtures shell but external consumers of the
package silently fell back to the system font stack. An earlier change made the
mode selectable and flipped the default to `'link'`; see
`notes/specs/pipeline.md` §9.1 for the option and migration note, and §12.3 for
the same description from the pipeline-stage perspective.

The font assets are read from disk and cached on first call; subsequent
documents reuse the cached string, same as the conditional asset categories
below.

### 10.1 KaTeX CSS

**Injected when:** `hasMathElements(hast)` returns `true` and `katexCss !== 'skip'`.

Detection: `hasMathElements` walks the hast tree looking for elements with
`tagName === 'inline-math'` or `'display-math'`.

| mode | what is injected |
|------|-----------------|
| `'inline'` | `<style>` containing patched KaTeX CSS |
| `'link'` | `<link rel="stylesheet" href="CDN_URL">` |
| `'skip'` | nothing |

The default is `embedResources ? 'inline' : 'link'` (external-by-default since an earlier change).

"Patched" means the font-relative URLs in the raw KaTeX CSS (e.g.,
`url(fonts/KaTeX_Main-Regular.woff2)`) are replaced with base64 data URIs
by `patchKatexFontUrls()` in `src/assets/font-loader.js`. This makes the
CSS fully self-contained; documents render correctly from `file://` URLs and
in offline environments.

The CDN URL is pinned to the installed KaTeX version and exported as
`KATEX_CDN_URL`.

### 10.2 Hover preview assets

**Injected when:** `hasNoteMarkers(hast) || hasRefLinks(hast) || hasCiteLinks(hast)`
returns `true` and `hoverPreviewMode !== 'skip'`.

Detection:
- `hasNoteMarkers`: walks for `tagName === 'sup'` with `properties.dataNoteId`.
- `hasRefLinks`: walks for `tagName === 'a'` with `className.includes('ref')`.
- `hasCiteLinks`: walks for `tagName === 'cite'` with `className.includes('cite')`.

| mode | what is injected |
|------|-----------------|
| `'inline'` (default) | one `<style>` (Tippy CSS + light-border theme + `hover-preview.css`) + one `<script>` (Popper UMD + Tippy UMD + `hover-preview.js`) |
| `'link'` | two `<link>` CDN elements + local `hover-preview.css` inline `<style>` + two `<script src>` CDN elements + local `hover-preview.js` inline `<script>` |
| `'skip'` | nothing |

Popper is included explicitly because Tippy's UMD bundle does not self-contain
Popper — it reads `window.Popper`. Popper must precede Tippy in the script
order.

Source maps are stripped from the Popper and Tippy UMD bundles (via a regex
replace) to avoid harmless 404 console warnings.

The CDN URLs are exported as constants: `POPPER_CDN_JS_URL`, `TIPPY_CDN_JS_URL`,
`TIPPY_CDN_CSS_URL`, `TIPPY_CDN_LIGHT_BORDER_URL`.

### 10.3 Lazy loading

All asset content is lazy-loaded: module-level cache variables (`_katexCss`,
`_tippyCss`, etc.) hold `null` until first access. On first access, the file
is read from disk and cached. Subsequent calls return the cached value.

Assets are prepended to `hast.children` (`unshift`), placing them before the
document body content. CSS elements come before JS elements.

---

## 11. Error handling and failure modes

The guiding principle is the always-renders guarantee defined in
`notes/specs/principles.md`: the document always renders to something, *and*
every error renders visibly at the location where it occurred — both
halves are core, not deferrable. The interpreter currently honors this
guarantee for every error category enumerated in §11.2 below, including
the parser-stage error nodes described in §11.5 (rendered as visible
markers).

### 11.1 Console warnings (`lib/errors.js`)

All warnings use the prefix `[enscribe] warning:`.

| function | when |
|---------|------|
| `warnUnknownTag(tagname)` | A tag is not in the vocabulary |
| `warnHandlerError(tagname, err)` | A handler threw an exception |
| `warnValidation(tagname, msg)` | Vocabulary validation failure |
| `warnTitlePrecedence()` | Both `<meta>` title and pipe title found |
| `warnSkippedDocType(type)` | `book` / `book-part` doc type not handled |

### 11.2 Visible error markers currently emitted

The error categories that the interpreter currently renders as visible
markers in the document body. This is not a complete enumeration of every
error type the system can encounter — see §11.5 for the category that does
not yet render visibly.

| condition | visible marker |
|-----------|---------------|
| Unresolved `<ref>` | `<a class="ref-error" href="#id">??ref: id??</a>` |
| Missing citation key | `<cite class="cite-error" data-keys="k">??cite: k??</cite>` |
| Table parse failure | `<table class="table-parse-error">??table-error: msg??</table>` |
| `<library src>` load failure (#133) | `<div class="enscribe-library-error" role="alert">⚠ could not load library source "src": msg</div>` |

An unknown / non-vocabulary tag is **not** in this table: it is no longer an
error marker. It renders as the literal source text the author typed, with
`<`/`>` escaped (see §5.1). Where its pipe content was re-parsed into mdast, a
recognized tag nested inside it still renders; everything else shows literally.

### 11.3 VFile messages (`file.message()`)

Some plugins use `file.message()` to attach diagnostics to the unified VFile:

- `buildCitationIndex` (step 5): file read failures, empty library, parse errors.
- `enscribeRefResolution`: missing id, target not found.
- `enscribeCiteResolution`: empty `<cite>`, missing keys.
- `enscribeNormalizeToCanonical` (the gate): a host's leading format word is
  outside its accept-set (`HOST_ACCEPT_SETS`) — e.g. `<table xml>`, `<diagram
  mermaidx>`. Located on the offending node; the document still renders (#85).

These messages appear in the `file.messages` array after `process()` resolves.
They do not appear in the HTML output.

### 11.4 Recovery behavior

- Handler throws → fall through to `schemaDispatch` as best-effort recovery.
- Handler module not in HANDLER_REGISTRY → same fallback.
- Vocabulary YAML malformed → skip entry, continue loading others.
- Library parse failure → skip that library, continue with others.
- All citations missing → no bibliography injected; `__cite-error` markers
  appear inline.

### 11.5 Parser-stage error nodes — rendered as visible markers

The parser (`@enscribejs/enscribe/parser`) produces two error node types when source
constructs cannot be parsed: `enscribeTagError` (for example, an
unterminated long-form construct, or a long-form opening whose interior
the grammar rejects) and `enscribeParseError` (for example, an unknown
escape sequence, an empty or unterminated `^{}`/`_{}` shortcut, or a
named-tag content tree exceeding the recursion-depth limit). Their node shapes
are defined canonically elsewhere: `enscribeTagError` in
`notes/specs/shorthand-syntax.md` §"Error nodes", and `enscribeParseError` in
`notes/specs/recursive-content-spec.md` §"The `enscribeParseError` node shape".

The interpreter registers compile-step handlers for both node types
(`enscribeParseError` and `enscribeTagError` in the `toHast` handler
table; `packages/enscribe/src/interpreter/handlers/parser-errors.js`).
They render as house-style visible markers —
`<span class="parse-error">??parse: …??</span>` and
`<span class="tag-error">??tag: …??</span>` — each carrying its source
position.

These markers are the same family as the §11.2 markers above
(`??ref: id??`, `??cite: key??`, the inline table-parse-error marker), so
an authoring mistake the parser caught is visible in the rendered output
at its source position — honoring the core always-renders guarantee in
`notes/specs/principles.md`.

This closed the previously-tracked gap against the guarantee (alpha; commit `e17a892`); `principles.md` records it as closed,
and no gap remains open.

---

## 12. Interpreter options

`enscribeInterpreter(options)` accepts:

| option | type | default | effect |
|--------|------|---------|--------|
| `embedResources` | `boolean` | `false` | Master embed-vs-link switch for document fonts + KaTeX CSS; per-resource options override it. Does not affect `hoverPreviewMode`/`dslMode`. |
| `documentFontsCss` | `'inline' \| 'link' \| 'skip'` | `embedResources ? 'inline' : 'link'` | How document fonts (Inter, Source Code Pro) are delivered |
| `katexCss` | `'inline' \| 'link' \| 'skip'` | `embedResources ? 'inline' : 'link'` | How KaTeX CSS is delivered |
| `hoverPreviewMode` | `'inline' \| 'link' \| 'skip'` | `'inline'` | How hover preview JS/CSS is delivered |
| `assetsDir` | `string \| null` | `null` | Base directory for resolving `src=` paths in `<library src=...>` and `<table src=...>` |
| `dslMode` | `'skip' \| 'live-inline' \| 'live-link' \| 'static'` | `'skip'` | External-DSL (mermaid/abc) render mode for all DSLs (see `render-quality.md` §9) |
| `mermaidMode` / `abcMode` | same value space (`mermaidMode` excludes `'static'`) | falls back to `dslMode` | Per-DSL override of `dslMode` |
| `toc` | `boolean \| 'auto'` | `false` | Table-of-contents sidebar: `true` always, `'auto'` past three top-level sections, `false` none. Layout CSS in `default.css` (`.enscribe-layout--toc`) |
| `theme` | `'default' \| 'modern' \| 'compact'` | `'default'` | Inject a theme's `:root` token overrides inline; also settable via `<config theme=…>` (the option wins) |
| `chapterNav` | `boolean` | on for a book with a ToC | Single-chapter book navigation (progressive-enhancement script); ignored for articles and books without a ToC |

`'inline'` modes produce self-contained HTML; `'link'` modes are leaner but
require network access to the relevant CDN; `'skip'` modes expect the consumer
to provide the assets. Since an earlier change the document-fonts and KaTeX
defaults are external (`'link'`) — set `embedResources: true` to restore
self-contained output (`pipeline.md` §9.1 carries the migration note). The
browser entry (`src/browser.js`) ships these tuned for the client:
`embedResources:false`, `hoverPreviewMode:'link'`, `dslMode:'live-link'`.

---

## 13. Adding a new element

To add a new vocabulary element handled by schema dispatch:

1. Create `packages/layer1-vocabulary/elements/new-element.md` with YAML
   frontmatter containing at minimum:
   ```yaml
   html_output:
     element: new-element
   interpreter_strategy: schema
   content:
     type: prose   # or block, or mixed
   ```
2. The element is immediately available in the next pipeline run. No code
   changes required.

To add a new vocabulary element with custom handler logic:

1. Create the vocabulary entry with `interpreter_strategy: handler` and
   `handler_module: ./handlers/new-element.js`.
2. Create `packages/enscribe/src/interpreter/handlers/new-element.js`
   exporting a handler function `(state, node, vocab, opts) => hastElement`.
3. Add the entry to `HANDLER_REGISTRY` in `interpret-plugin.js`:
   ```js
   ['./handlers/new-element.js', newElementHandler],
   ```

To add a new plugin-created internal node type (no vocabulary entry):

1. Add the internal node type to `INTERNAL_REGISTRY` in `interpret-plugin.js`:
   ```js
   ['__my-internal-type', myInternalHandler],
   ```
2. The handler receives `(state, node)` and returns a hast element (or `null`
   to suppress output).

---

## 14. Source file map

Files reachable from `enscribeInterpreter` at runtime. (The former
`schema/` validation subsystem — `schema/shape-tokens.js`, `schema/validate.js` —
was removed; the gate dispatches on tagname + `interpreter_strategy`, not on a
shape-token validator. See `notes/specs/shape-tokens.md`.)

```
packages/enscribe/src/interpreter/
  index.js                      Main entry; enscribeInterpreter plugin
  interpret-plugin.js           enscribeTag handler; dispatch logic; registries
  plugins/
    normalize-to-canonical.js   enscribeNormalizeToCanonical (step 1.5; alias enscribeNormalizeMarkdown)
    config-discovery.js         enscribeConfigDiscovery
    book-structuring.js         enscribeBookStructuring (books; runs before article-structuring)
    article-structuring.js      enscribeArticleStructuring
    section-nesting.js          enscribeSectionNesting
    list-structuring.js         enscribeListStructuring (#137; lowers <list>/<li> to ul/ol/li)
    library-load.js             buildCitationIndex; enscribeLibraryLoad (wrapper for external callers)
    table-cell-parse.js         enscribeTableCellParse (#21/#105; opt-in DATA-cell inline parse)
    html-table-cells.js         enscribeHtmlTableCells (#108; raw-HTML table cell re-resolution)
    notes.js                    enscribeNotes (register-only)
    note-placement.js           enscribeNotePlacement
    numbering.js                enscribeNumbering
    ref-resolution.js           enscribeRefResolution
    cite-resolution.js          enscribeCiteResolution
    bibliography.js             enscribeBibliography
  handlers/
    math.js                     mathHandler (KaTeX rendering)
    figure.js                   figureHandler
    table.js                    tableHandler (CSV/TSV/JSON/YAML/MD)
    diagram.js                  diagramHandler (delegates to the engine by positional[0])
    svg.js                      svgHandler
    frame.js                    frameHandler
    code.js                     codeHandler
    code-block.js               codeBlockHandler
    inline-code.js              inlineCodeHandler
    theorem.js                  theoremFamilyHandler (theorem/lemma/…/proof)
    aside.js                    asideHandler (frameable boxed-prose member; #31)
    notes.js                    noteMarkerHandler, noteListHandler, noteListItemHandler
    ref.js                      refMarkerHandler, refErrorHandler
    cite.js                     citeMarkerHandler, citeErrorHandler, bibliographyHandler, libraryErrorHandler
  lib/
    registry.js                 createRegistry(); ensureRegistry()
    host-accept-sets.js         HOST_ACCEPT_SETS; hostAcceptsLanguage(host, lang) — consulted by the gate as format-word validation (#85)
    shorthand-expansions.js     createShorthandRegistry() — the gate's shared expansion map
    ast-helpers.js              isEnscribeTag(), sectionDepth(), findTag(), extractPlainText()
    bool-kwarg.js               readBoolKwarg()
    strict-mode.js              resolveStrictMode (step 0c, #36); detectStrictMode, disableMarkdownIdioms, flagStrictText
    discover.js                 discover() — shared read-only pre-order DFS walker
    walk-replace.js             walkReplace() — shared in-place node replacement walker
    walk-normalize.js           walkNormalize() — pre-order DFS used by the gate
    errors.js                   warnUnknownTag(), warnHandlerError(), ...
  assets/
    font-loader.js              patchKatexFontUrls(); getDocumentFontsCss()
    hover-preview.css           CSS for Tippy-based hover previews
    hover-preview.js            JS init for Tippy-based hover previews

packages/enscribe/src/parser/
  recursive-content.js          remarkRecursiveContent (used by interpreter)

packages/layer1-vocabulary/
  elements/                       one .md file per vocabulary element
  SPEC.md                         High-level vocabulary specification
```

---

## 15. Cross-references

- `notes/specs/pipeline.md` — pipeline ordering, plugin dependencies, data flow
  examples.
- `notes/specs/recursive-content-spec.md` — design of the content re-parsing step.
- `notes/specs/shorthand-syntax.md` — the authoring syntax the interpreter consumes.
- `notes/specs/layer1-naming.md` — vocabulary element naming rules.
- `notes/specs/principles.md` — error-recovery philosophy ("documents always render
  to something").
- `ROADMAP.md` and [GitHub Issues](https://github.com/enscribejs/enscribe/issues) — the release plan and the open/future work (the build sequence lives here, not in a `BUILD.md`).
- `packages/layer1-vocabulary/SPEC.md` — vocabulary element specification.
