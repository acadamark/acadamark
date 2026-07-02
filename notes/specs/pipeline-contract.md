# The interpreter/pipeline contract

**This document is the single source for the three list-shaped tables that the
interpreter and pipeline share: the plugin roster, the `file.data` namespace, and
the internal node types.** `notes/specs/interpreter.md` and `notes/specs/pipeline.md`
reference this document rather than restating these tables — each was previously
written in both specs and drifted in parallel (a dropped path and a dissolved
field once appeared in both copies; wired plugins were missing from one; a live
internal node type was missing from both). Keeping them in one place, each
**verified against code** (`packages/enscribe/src/interpreter/index.js` for the
roster; `packages/enscribe/src/core/file-data-keys.js` and the per-plugin sources
for the namespace; the `INTERNAL_REGISTRY` for the node types), removes that drift
surface. The interpreter and pipeline specs keep the *prose* that is each one's job
(interpreter: dispatch, handlers, schema, per-plugin algorithm detail, the
descent-order rationale and the centralized-walker design property; pipeline: the
stage/phase narrative, the ordering constraints, and the data-flow examples).

The tables' owning code is the authority; if code and this document disagree, the
code is right and this document has the bug. (A future guard could assert the
roster against `index.js`'s registration order at load/test time — the project's
existing single-source-guard pattern; noted, out of scope here.)

---

## Plugin roster

The plugins registered on `enscribeInterpreter`, in **registration order** (the
authority is the `this.use(...)` sequence in
`packages/enscribe/src/interpreter/index.js`). Step numbers use the interpreter's
fractional convention — integers are the original steps; fractional steps mark
plugins inserted between them, so §3's step references stay stable. Phase legend:
**0** Normalize · **1** Discovery · **2** Structural · **3** Semantic · **compile**.

| Step | Plugin | Phase | Source file | Purpose | Key dependency / `file.data` output |
|------|--------|-------|-------------|---------|-------------------------------------|
| 0a | `remarkMath` | parse | `remark-math` (npm) | Parser extension (outer + inner processor): tokenizes bare `$x$` / `$$x$$` — not an enscribe transform | after `remarkParse`; produces `inlineMath` / `math` nodes (later normalized) |
| 0b | `remarkGfm` | parse | `remark-gfm` (npm) | Parser extension (outer + inner processor): tokenizes bare GFM pipe tables — not an enscribe transform | after `remarkParse`; produces `table` nodes (later normalized) |
| 0c | `resolveStrictMode` | 0 | `src/interpreter/lib/strict-mode.js` | #36 — selects the strict-mode register; off the loosest rung, re-parses the source via the sigil / canonical processors | after `remarkEnscribe` (needs source); writes `file.data.enscribeStrictMode` |
| 1 | `remarkRecursiveContent` | 0 | `src/parser/recursive-content.js` | Re-parses each `enscribeTag`'s raw pipe-content string into an mdast subtree via the inner processor (skips opaque content) | after `remarkEnscribe` (string content set); sets `node.content` to `Node[]` |
| 1.4 | `enscribeDocTypeResolve` | 0 | `src/interpreter/plugins/doc-type.js` | #200 — resolves the document class and stamps `<meta type>` so structural plugins can branch on it | after `remarkRecursiveContent`; writes `file.data.enscribeDocType` |
| 1.5 | `enscribeNormalizeToCanonical` | 0 | `src/interpreter/plugins/normalize-to-canonical.js` | The single normalization gate: coerces every authored form (delegated-parser nodes, sigils, shorthands, kwarg lifts, markdown idioms) to canonical `enscribeTag` nodes | after `remarkRecursiveContent` (both parses complete); must precede every structural plugin |
| 2 | `enscribeConfigDiscovery` | 1 | `src/interpreter/plugins/config-discovery.js` | Collects the kwargs of every `<config>` tag (deep); no tree mutation | after `enscribeNormalizeToCanonical`; writes `file.data.enscribeConfig` |
| 2.4 | `enscribeWebsiteStructuring` | 2 | `src/interpreter/plugins/website-structuring.js` | #246 — owns `<meta type=website>`: builds the nav model on `file.data` (no `<article>`/`<book>` wrapper); byte-identical no-op otherwise; first of the three structurers | after `enscribeConfigDiscovery`; gated on `enscribeDocType === 'website'`; writes `file.data.enscribeNavModel` |
| 2.5 | `enscribeBookStructuring` | 2 | `src/interpreter/plugins/book-structuring.js` | Wraps a `<meta type=book\|book-part>` document into `<book>` front/body/back; no-op otherwise; runs before article-structuring | after `enscribeConfigDiscovery`; produces book structure nodes |
| 3 | `enscribeArticleStructuring` | 2 | `src/interpreter/plugins/article-structuring.js` | Wraps the flat root into `<article>` (front / body / back); promotes `<title>`; `<data>` stays a root sibling | after `remarkRecursiveContent`; skips a book-wrapped tree; produces article structure |
| 4 | `enscribeSectionNesting` | 2 | `src/interpreter/plugins/section-nesting.js` | Converts flat `section` / `sub-section` / `sub-sub-section` runs into a nested tree; promotes pipe titles | after `enscribeArticleStructuring`; produces the nested section tree |
| 4.5 | `enscribeListStructuring` | 2 | `src/interpreter/plugins/list-structuring.js` | #137 — lowers `<list>` / `<li>` (and `-`/`*` idioms) to markdown `ul` / `ol` / `li` | after `enscribeSectionNesting`; before the semantic plugins |
| 4.6 | `enscribeMinipageGuard` | 2 | `src/interpreter/plugins/minipage-guard.js` | #115 — on a **sealed** minipage sub-run, neutralizes a forbidden `@src` / `<data>` external pull to a visible `__asset-error`; no-op on every normal document | after `enscribeNormalizeToCanonical`; active only when `file.data.enscribeMinipageSubrun` is set; before the citation / asset index passes |
| 5 | `enscribeCitationIndex` (anon fn wrapping `buildCitationIndex`) | 3 | `src/interpreter/plugins/library-load.js` | Deep-collects `<data>` / `<library>` nodes, parses BibTeX / CSL-JSON, builds a citation-js `Cite` | after `enscribeConfigDiscovery` (reads `citation-style`); writes `file.data.enscribeCitations` |
| 5.5 | `enscribeTableCellParse` | 3 | `src/interpreter/plugins/table-cell-parse.js` | #21/#105 — opt-in parse of DATA-format table cells as inline markup; no-op without opt-in | after `enscribeCitationIndex`; before notes/numbering/refs |
| 5.6 | `enscribeHtmlTableCells` | 3 | `src/interpreter/plugins/html-table-cells.js` | #108 — re-resolves inline content in raw-HTML (`_htmlTable`) cells from a JATS import; no-op otherwise | after `enscribeTableCellParse`; before `enscribeNotes` |
| 5.7 | `enscribeAssetIndex` (anon fn wrapping `buildAssetIndex`) | 3 | `src/interpreter/plugins/asset-load.js` | #190 — harvests embedded `<fig #id fmt>base64</fig>` declarations from `<data>` into a keyed store and strips each from its `<data>` | after the table-cell passes; before numbering; writes `file.data.enscribeAssets` |
| 5.8 | `enscribeAssetResolution` | 3 | `src/interpreter/plugins/asset-load.js` | #190 — rewrites a body `<fig src="@id" />` to the resolved `data:` URI / external path; unresolved → `__asset-error` | after `enscribeAssetIndex`; before `enscribeNotes` and numbering (so a resolved asset numbers as a figure) |
| 6 | `enscribeNotes` | 3 | `src/interpreter/plugins/notes.js` | Registers `<note>` elements (record-only); `<note>` nodes stay in the tree through resolution | after `remarkRecursiveContent`, `enscribeSectionNesting`; writes `file.data.enscribeNotesPending` |
| 7 | `enscribeNumbering` | 3 | `src/interpreter/plugins/numbering.js` | Registers numbered (`$$` / figure / table) and label-indexed (section / code) elements | after `enscribeNotes`; writes `file.data.enscribeNumberingPending`; sets `node.registryType` |
| 8 | `enscribeApplyNumbers` (anon inline fn) | 3 | `src/interpreter/index.js` (inline) | Single numbering pass: `numberRegistry()` assigns display numbers, `fillNumbering` writes them back, `numberSections` (#57) applies hierarchical section numbers | after `enscribeNotes` + `enscribeNumbering`; before `enscribeRefResolution`; sets `node.computedNumber` + label index |
| 8.5 | `enscribeMinipageDeferred` (anon inline fn) | 3 | `src/interpreter/index.js` (inline; `src/interpreter/lib/minipage.js`) | #115 — sealed sub-interpret of each minipage's held opaque body in its own pipeline run + VFile (read-through parent registry); scope-qualifies ids (#267) | after `enscribeApplyNumbers` (parent registry complete); before `enscribeRefResolution` |
| 9 | `enscribeRefResolution` | 3 | `src/interpreter/plugins/ref-resolution.js` | Replaces each `<ref>` with `__ref-marker` (found) or `__ref-error`; computes display text from id prefix + number | after `enscribeApplyNumbers`; produces `__ref-marker` / `__ref-error` |
| 10 | `enscribeCiteResolution` | 3 | `src/interpreter/plugins/cite-resolution.js` | Replaces each `<cite>` with `__cite-marker` / `__cite-error`; records first-cited key order | after `enscribeCitationIndex`; produces `__cite-marker` / `__cite-error`; fills `citations.order` |
| 11 | `enscribeNotePlacement` | 3 | `src/interpreter/plugins/note-placement.js` | Splices `__note-marker` in place of each `<note>`; builds `__note-list-item`s; injects `__note-list` into back-matter | after `enscribeCiteResolution` + `enscribeApplyNumbers`; produces `__note-marker` / `__note-list` / `__note-list-item` |
| 12 | `enscribeBibliography` | 3 | `src/interpreter/plugins/bibliography.js` | Renders the bibliography via citation-js; injects `__bibliography` into `<article-back>` / `<book-back>` | after `enscribeCiteResolution` (needs `citations.order`); produces `__bibliography` |
| 12.5 | `enscribeQuietSuppression` (anon inline fn) | 3 | `src/interpreter/index.js` (inline) | #281 — a `<config quiet />` document clears its own `file.messages` stream (emission-only; tree/HTML byte-identical); runs last after every message producer | after `enscribeConfigDiscovery` + every producer; clears `file.messages` |
| — | compiler (`toHast`) | compile | `src/interpreter/index.js` (custom `this.compiler`) | Converts the final mdast → hast with the custom `enscribeTag` handler | after all mdast transforms; produces the hast tree |
| — | asset injection | compile | `src/interpreter/index.js` | Prepends conditional CSS/JS (ToC, margin, strict-flag, book scripts, fonts, theme, KaTeX, hover-preview, DSL) | after the compiler; prepends CSS/JS to `hast.children` |
| — | serialization | compile | `src/interpreter/index.js` (`formatHtml` → `hast-util-to-html`) | Formats then serializes the hast tree to the HTML fragment string | after asset injection; produces the HTML string |

**Naming note.** Two rosters entries are registered as *anonymous* plugin
functions that wrap an imported worker: `enscribeCitationIndex` wraps
`buildCitationIndex` (from `library-load.js`), and `enscribeAssetIndex` wraps
`buildAssetIndex` (from `asset-load.js`). Prose that says "buildCitationIndex" /
"buildAssetIndex" is naming the worker; the registered plugin is the `enscribe*`
name above.

---

## The `file.data` namespace

The unified `VFile` is the shared data bus between plugins. The canonical key
registry is `packages/enscribe/src/core/file-data-keys.js` (the `ENSCRIBE_*`
constants); every field below is read/written through a constant except where
noted. "Set by" / "Read by" name the plugins (see the roster for their sources).

| `file.data` field | Type | Set by | Read by |
|-------------------|------|--------|---------|
| `enscribeStrictMode` | `'off' \| 'sigil' \| 'canonical'` | `resolveStrictMode` (#36) | `remarkRecursiveContent`, the compiler |
| `enscribeDocType` | `'article' \| 'book' \| 'book-part' \| 'website'` | `enscribeDocTypeResolve` (#200) | `enscribeArticleStructuring`, `enscribeBookStructuring`, `enscribeWebsiteStructuring`, `enscribeNormalizeToCanonical` |
| `enscribeConfig` | `Map<string, string>` | `enscribeConfigDiscovery` | `enscribeCitationIndex`, `enscribeNumbering`, `enscribeApplyNumbers`, `enscribeRefResolution`, `enscribeNotePlacement`, `enscribeBibliography`, `enscribeHtmlTableCells`, the book/ToC scaffold, the compiler, the website builder |
| `enscribeNavModel` | `{ entries: [...] }` (page/group tree) | `enscribeWebsiteStructuring` (#246) | the live-website render |
| `enscribeCitations` | `{ cite, order, style }` | `enscribeCitationIndex` | `enscribeCiteResolution`, `enscribeBibliography` |
| `enscribeAssets` | `Map<id, { format, base64 }>` | `enscribeAssetIndex` (#190) | `enscribeAssetResolution` |
| `enscribeLoadedSources` | `{ [src]: { content } \| { error } }` | the caller (browser / CLI) via `processSync` data (#133 — pre-loaded `<library src>` / `<table src>`) | `enscribeCitationIndex`, `enscribeHtmlTableCells`, the compiler |
| `enscribeRegistry` | registry object | first `ensureRegistry(file)` call (read-through variants seeded for minipage / site runs) | `enscribeNotes`, `enscribeNumbering`, `enscribeApplyNumbers`, `enscribeRefResolution`, `harvestCrossRefRegistry` |
| `enscribeNotesPending` | array of `{ node, entry }` | `enscribeNotes` | `enscribeNotePlacement` |
| `enscribeNumberingPending` | array of `{ node, entry }` | `enscribeNumbering` | `enscribeApplyNumbers` |
| `enscribeCounterResetScope` (`ENSCRIBE_COUNTER_RESET_SCOPE`) | scope string (`'none'` default) | `enscribeNumbering` | `enscribeApplyNumbers` |
| `enscribeCrossRefRegistry` | `Map<anchor, { number, title, type }>` | `harvestCrossRefRegistry` (#204, master-document render) | a read-only product — runtime consumers read the harvester's return value |
| `enscribeMinipageSubrun` | boolean flag | the minipage deferred phase, on the child VFile (#115) | `enscribeMinipageGuard` |
| `enscribeMinipageDepth` | number (nesting depth) | the minipage deferred phase, on the child VFile (#115) | the minipage deferred phase |
| `enscribePageLinkResolver` | `(slug, { empty }) => { href, label } \| { broken, label }` | the website builder, static / live (#318) | the compiler (last hast mutation before serialization) |

Initialization semantics (per-key, not part of the set/read contract above):

- `enscribeConfig` is set to a new (possibly empty) `Map` even when the document
  has no `<config>` blocks.
- `enscribeRegistry` is created lazily on the first `ensureRegistry(file)` call —
  `enscribeNotes` is typically first.
- `enscribeCitations` is set only when at least one `<data>` / `<library>` block
  is found and successfully parsed.

---

## Internal node types

Internal node types (`__*` tagnames) are created by structural/semantic plugins
and rendered by `INTERNAL_REGISTRY` handlers (defined in
`src/interpreter/interpret-plugin.js`). They have no vocabulary entry, cannot be
authored directly, and are dispatched **before** the vocabulary lookup.

| Internal node type | Produced by | Handler | Rendered output |
|--------------------|-------------|---------|-----------------|
| `__note-marker` | `enscribeNotePlacement` | `noteMarkerHandler` | `<sup id="noteref-N" data-note-id="ID"><a href="#ID">N</a></sup>` |
| `__note-list` | `enscribeNotePlacement` | `noteListHandler` | `<note-list class="..."><ol>...</ol></note-list>` |
| `__note-list-item` | `enscribeNotePlacement` | `noteListItemHandler` | `<li id="ID">…</li>` (inner `<sup>` number + `<a class="note-backref">↩</a>` back-reference) |
| `__ref-marker` | `enscribeRefResolution` | `refMarkerHandler` | `<a href="#ID" class="ref" [data-ref-type] [data-ref-format]>TEXT</a>` — a `<span class="ref">` in `-link` mode |
| `__ref-error` | `enscribeRefResolution` | `refErrorHandler` | `<a href="#ID" class="ref-error">??ref: ID??</a>` |
| `__cite-marker` | `enscribeCiteResolution` | `citeMarkerHandler` | `<cite class="cite" data-keys="...">FORMATTED HTML</cite>` |
| `__cite-error` | `enscribeCiteResolution` | `citeErrorHandler` | `<cite class="cite-error" data-keys="...">??cite: KEY??</cite>` |
| `__bibliography` | `enscribeBibliography` | `bibliographyHandler` | `<bibliography>HEADING + BIB HTML</bibliography>` |
| `__library-error` | `enscribeCitationIndex` (`buildCitationIndex`, in `library-load.js`) | `libraryErrorHandler` | `<div class="enscribe-library-error" role="alert">⚠ …</div>` (#133 — a `<library src>` that could not load) |
| `__asset-error` | `enscribeAssetResolution` (in `asset-load.js`; reused by `minipage-guard.js`) | `assetErrorHandler` | `<div class="enscribe-asset-error" role="alert" [data-ref]>⚠ …</div>` (#190 — a `<fig src="@id">` that could not be resolved) |

**Suppressed apparatus.** Separately, `<data>` and `<library>` are **real
vocabulary tags** (they have `data.md` / `library.md` entries, category
`storage-hosts`) whose rendered body is suppressed — their content is consumed at
build time by `enscribeCitationIndex` (`buildCitationIndex`), so they render to
`null`. They are held in the `SUPPRESSED_APPARATUS` set (derived in
`lib/apparatus-allowlists.js` from the `storage-hosts` category) and suppressed in
dispatch **step 4**, *after* the vocabulary lookup confirms them — **not** in
`INTERNAL_REGISTRY`, which is reserved for plugin-created nodes with no vocabulary
entry, so each registry's name matches its contract.
