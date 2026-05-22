# Specified but Not Implemented

Inventory of features that are specified in spec documents or vocabulary entries
but are not yet built in the codebase. Produced by a read-only investigation pass
(June 2026). Every item is code-verified: the code is the authority.

**Scope:** `packages/remark-acadamark/`, `packages/acadamark-interpreter/`,
`packages/layer1-vocabulary/`, and the spec documents under `notes/`. Does not
cover test coverage gaps, cosmetic issues, or documentation staleness (those are
in separate sections at the end).

**Not included here:** Purely speculative ideas, features explicitly listed as
"future if needed," or design work that hasn't reached spec stage.

---

## Summary

| Category | Count |
|---|---|
| Deferred features (whole capabilities, unbuilt) | 22 |
| Partial gaps (feature mostly built, one clause missing) | 12 |
| Doc-staleness findings | 5 |
| Open questions flagged in specs (not yet decided) | 2 |

AUD-tracked items are noted with their AUD number. All others are untracked.

---

## Deferred features

These are complete capabilities (parser feature, interpreter plugin, vocabulary
element set, export pipeline) that are specified in a document but have no
implementation.

---

### DF-1: Inline TeX shortcuts (`^{...}` and `_{...}`)

**Spec:** `notes/inline-tex-shortcuts-spec.md`  
**Code checked:** Full grep of `remark-acadamark/src/` and `acadamark-interpreter/src/` for `superscript`, `subscript`, `caret`, `underscore`. No matches.  
**AUD status:** Untracked.

The spec is decision-complete: `^{...}` → `<sup>`, `_{...}` → `<sub>`. Content
between braces is recursively parsed. `^` and `_` are significant only when
immediately followed by `{`; bare `^`/`_` without `{` are a parse error. Single-
character shorthand (`x^2` without braces) is explicitly not supported.

Note from `notes/shape-tokens.md`: "When math sigils and inline-TeX shortcuts are
implemented, they also belong to `inline`." Confirms unimplemented status.

The `<sup>` and `<sub>` vocabulary elements are fully specified (`sup.md`,
`sub.md`) and their `interpreter_strategy: schema` means they would work via the
schema-driven handler the moment the parser emits them. The gap is in the parser
only.

---

### DF-2: Strict mode

**Spec:** `notes/idioms.md` — "Planned configuration that disables all markdown
idioms… Strict mode is not yet implemented."  
**Code checked:** `grep -r "strict"` over both packages. No matches.  
**AUD status:** Untracked.

When enabled, strict mode would disable all markdown pass-through idioms (bullet
lists, `# Heading`, `**bold**`, etc.) and require explicit acadamark shorthand for
everything. Intended for authors who want unambiguous document syntax.

---

### DF-3: Verbatim HTML passthrough escape (`<html-passthrough>`)

**Spec:** `notes/shorthand-syntax.md` line 819 — "a verbatim-passthrough escape
mechanism (e.g., `<html-passthrough>...</html-passthrough>`) is planned but not
yet specified. Deferred to a later phase."  
**Code checked:** `grep -r "html-passthrough\|htmlPassthrough"` over both packages.
No matches.  
**AUD status:** Untracked.

Described only as "planned." The spec section that would describe it hasn't been
written yet (the document itself says "not yet specified"). Included here because
the intention is documented and the feature name is established.

---

### DF-4: Multi-file authoring

**Spec:** `notes/multi-file-authoring-deferred.md`  
**Code checked:** No `<include>` tag in DSL_REGISTRY; no include plugin in
`acadamark-interpreter/src/plugins/`. No `acadamark.yml` discovery.  
**AUD status:** Untracked.

Planned mechanism: project-config (`acadamark.yml`) plus `<include src="...">` tag
for composing multi-file documents. Cross-file cross-references require project-
wide registries. Explicitly deferred; the spec file describes the design intent.

---

### DF-5: Multi-column display

**Spec:** `notes/multi-column-display-deferred.md`  
**Code checked:** No column-related config options in `config-discovery.js`; no
column layout logic in the interpreter.  
**AUD status:** Untracked.

Planned `<config><columns count=2>` mechanism plus per-region override. A render-
mode concern (CSS columns or grid). Explicitly deferred.

---

### DF-6: Presentation / slide elements

**Spec:** `notes/slide-element-deferred.md` — "Not yet specified."  
**Code checked:** No `presentation`, `slide`, or `slide-notes` entries in
DSL_REGISTRY or vocabulary elements.  
**AUD status:** Untracked.

Placeholder only: `<presentation>` + `<slide>` + `<slide-notes>`. The spec file
says "Needs design pass before implementation." Included because a spec file
exists and reserves the names.

---

### DF-7: `@`-sigil reference syntax

**Spec:** `notes/at-sigil-reference-proposal.md` — "Proposed. Not implemented,
not scheduled."  
**Code checked:** `@` is not in `SIGIL_CHARS` in `syntax.js`; no `@` rule in
`acadamark.peggy`.  
**AUD status:** Untracked.

Would unify `<ref>` and `<cite>` under `@key` syntax, with `#` only for id
assignment. Related to AUD-09 redesign. Explicitly unscheduled.

---

### DF-8: `<csv>` and `<tsv>` standalone shortcut tags

**Spec:** `packages/layer1-vocabulary/elements/table.md` shorthand_examples
reference `<csv | name,price\n...>`. `packages/remark-acadamark/src/dsl-registry.js`
registers `['csv', 'csv']` and `['tsv', 'tsv']`.  
**Code checked:** `packages/acadamark-interpreter/src/handlers/` — no `csv.js` or
`tsv.js` handler. Using `<csv | ...>` falls through to `warnUnknownTag`.  
**AUD status:** AUD-05 (tracked), AUD-07 (table.md example misleads authors).

`<table csv | ...>` works (table handler dispatches on `positional[0]`). The
standalone `<csv>` form is registered in the parser but has no interpreter handler.

---

### DF-9: `<mermaid>` and `<abc>` DSL handlers

**Spec:** `packages/remark-acadamark/src/dsl-registry.js` — both registered with
named handlers (`'mermaid'`, `'abc'`). `notes/dsl-engines.md` lists them as
planned DSL engines.  
**Code checked:** `ls packages/acadamark-interpreter/src/handlers/` — no
`mermaid.js` or `abc.js`. Using `<mermaid>...</mermaid>` falls through to
`warnUnknownTag`.  
**AUD status:** Untracked.

The parser produces valid `acadamarkTag` nodes for these; no interpreter handler
exists.

---

### DF-10: Math environment DSL handlers (`<matrix>`, `<cases>`, `<align>`, `<eqnarray>`)

**Spec:** `packages/remark-acadamark/src/dsl-registry.js` — all four registered.
`notes/dsl-engines.md` describes the intended rendering approach (pass content to
KaTeX within the appropriate environment wrapper).  
**Code checked:** `ls packages/acadamark-interpreter/src/handlers/` — no handler
files for these. The existing `math.js` handler handles `<$>` and `<$$>` sigil
forms only.  
**AUD status:** Untracked.

The inline math and display math forms (`<$ | ... $>`, `<$$ | ... $$>`) are
implemented. These multi-line math environment forms are not.

---

### DF-11: `<theorem>` DSL handler and theorem-family vocabulary

**Spec (two parts):**
- Parser: `packages/remark-acadamark/src/dsl-registry.js` registers `['theorem', 'theorem']`. `notes/dsl-engines.md` describes rendering intent.
- Vocabulary: `packages/layer1-vocabulary/SPEC.md` — "Not in the minimal set today. Listed to reserve the slot. To be specified in a separate design pass." `notes/layer1-naming.md` open decisions section: "to be specified."

**Code checked:** No `theorem.js` handler in `acadamark-interpreter/src/handlers/`.
DSL_REGISTRY comment: "theorem-family elements (proof, lemma, corollary,
definition, example) omitted pending Layer 1 vocabulary specification."  
**AUD status:** Untracked.

Two separate gaps: (a) `<theorem>` has a DSL_REGISTRY entry but no handler, and
(b) `<proof>`, `<lemma>`, `<corollary>`, `<definition>`, `<example>` have neither
a DSL_REGISTRY entry nor vocabulary specs yet.

---

### DF-12: Book and book-part document structuring

**Spec:** Vocabulary entries exist for `book.md`, `book-part.md`, `book-front.md`,
`book-body.md`, `book-back.md`, `book-part-title.md`, `book-part-subtitle.md`,
`book-subtitle.md`, `book-title.md` (confirmed from `elements/` directory listing).
The vocab entries include content shape definitions.  
**Code checked:** `packages/acadamark-interpreter/src/plugins/article-structuring.js`
lines 118–119: `if (docType === 'book' || docType === 'book-part') { warnSkippedDocType(docType); }` — processing stops there; no structural wrapping is done.  
**AUD status:** Untracked (noted in `notes/known-limitations.md`).

All `book`-type documents silently produce no structured output. The vocabulary
is specified; the structuring plugin has not been extended beyond `article`.

---

### DF-13: Deferred vocabulary elements — metadata

**Spec:** `packages/layer1-vocabulary/SPEC.md` — each marked "Deferred — to be
specified when the relevant slice arrives."  
**Elements:** `<keywords>`, `<publication-date>`  
**Code checked:** No entries in `elements/` directory for these names.  
**AUD status:** Untracked.

---

### DF-14: Deferred vocabulary elements — definition lists

**Spec:** `packages/layer1-vocabulary/SPEC.md` — "Deferred — to be specified
when the relevant slice arrives." `notes/layer1-naming.md` lists `<dl>`, `<dt>`,
`<dd>` in the "stays HTML" group (Rule 2), indicating the vocabulary will defer
to native HTML elements.  
**Elements:** `<dl>`, `<dt>`, `<dd>`  
**Code checked:** No entries in `elements/` directory for these names; no handler
in `acadamark-interpreter/src/handlers/`.  
**AUD status:** Untracked.

---

### DF-15: Deferred vocabulary elements — inline semantic

**Spec:** `packages/layer1-vocabulary/SPEC.md` — each marked "Deferred."  
**Elements:** `<abbr>`, `<term>`, `<glossary>`, `<glossary-entry>`  
**Code checked:** No entries in `elements/` directory for these names.  
**AUD status:** Untracked.

---

### DF-16: Blank-line termination error recovery

**Spec:** `notes/recursive-content-spec.md` — explicit "Status: Deferred" section.
"The micromark finder needs to check each line ending and terminate open constructs
at blank lines for localized error recovery."  
**Code checked:** `syntax.js` — no blank-line check in the body scanner; a tag
opened before a blank line will consume across the blank line or to EOF.  
**AUD status:** Untracked.

The current behavior when an unterminated construct spans a blank line is listed
in `notes/known-limitations.md`.

---

### DF-17: Qualifying-tag pattern for non-table DSL tags

**Spec:** `notes/shorthand-syntax.md` example 15 and resolved decisions; `BUILD.md`
Slice 5 — "Qualifying-tag pattern `<table csv>…</table>` — First-positional DSL
dispatch works."  
**Code checked:** `packages/acadamark-interpreter/src/handlers/table.js` dispatches
on `node.positional[0]` for `csv`, `tsv`, `json`, `yaml`, `md`. Tests confirm
`<table csv | ...>` works. No equivalent dispatch logic in any other handler.  
**AUD status:** Untracked.

The qualifying-tag pattern is **implemented for `<table>`** — the table handler
reads `positional[0]` to select the data format. The BUILD.md Slice 5 status is
stale. However, the general pattern (qualifying a different tag with a DSL
engine name) is not documented as a supported feature for tags other than `table`.
No other handler uses positional[0] as a format qualifier. This item records that
the general pattern is not established beyond the table case.

---

### DF-18: JATS export (`rehypeAcadamarkToJats`)

**Spec:** `BUILD.md` Phase 3, section 7; `notes/layer1-naming.md` Rule 4 (JATS-
first naming); every vocabulary `.md` file has a `jats_counterpart` field.  
**Code checked:** `grep -r "jats\|toJats" packages/` (excluding `jats_counterpart`
field mentions). No plugin, no package, no implementation.  
**AUD status:** Untracked.

The vocabulary is JATS-aligned by design. The export plugin is Phase 3 work.

---

### DF-19: Render-mode lowering plugin

**Spec:** `notes/layer1-naming.md` — "Render mode is for display, semantic mode is
for everything else (archival, conversion, downstream tooling). Render mode is an
optional downstream plugin, **not yet built**." Every vocabulary entry has a
`render_mode` or equivalent lowering specification.  
**Code checked:** `grep -r "renderMode\|render.mode\|lower\|h1.*section-title"` in
`packages/acadamark-interpreter/src/`. No matches.  
**AUD status:** Untracked.

Render-mode lowering converts `<section-title>` → `<h1>`, `<sub-section-title>` →
`<h2>`, etc. for plain-browser display. The mapping table is in per-element vocab
files. The plugin is not built.

---

### DF-20: GFM pipe-table syntax (`remark-gfm`)

**Spec:** `BUILD.md` initial dependency list includes `remark-gfm`. `packages/
layer1-vocabulary/elements/table.md` mentions it as an authoring path.  
**Code checked:** `grep "remark-gfm" packages/*/package.json`. No matches; not
installed.  
**AUD status:** AUD-06 (tracked).

Plain markdown pipe-table syntax (`| h1 | h2 |\n|---|---|`) requires `remark-gfm`.
The `<table md | ...>` form is a working alternative via the table handler's `md`
format parser.

---

### DF-21: Self-closing tag form for DSL_REGISTRY tags (`<tag />`)

**Spec:** `notes/shorthand-syntax.md` — self-closing form is part of the grammar
(`SelfClosingNamedTag` rule in `acadamark.peggy`). The form `<library src="file"/>` is
a natural authoring pattern.  
**Code checked:** `packages/remark-acadamark/src/syntax.js` — the long-form
tokenizer (activated for all DSL_REGISTRY tags) does not check for `/>` before
committing to long-form mode, so it produces `acadamarkTagError` for
`<library src="file"/>`.  
**AUD status:** AUD-08 (tracked).

---

### DF-22: `remark-math` / bare `$...$` math shorthand inside recursive parsing

**Spec:** `BUILD.md` initial dependency list includes `remark-math`. `notes/idioms.md`
flags as an open question: "whether bare `$x$` inside `<aside | ...>` is treated
as inline math."  
**Code checked:** `grep "remark-math" packages/*/package.json`. No matches; not
installed. The `<$ | x $>` sigil form works; bare `$x$` produces paragraph text.  
**AUD status:** Untracked. (See Open Questions section — the integration with
recursive parsing is undecided.)

---

## Partial gaps

These are features that are built and working in the common case, but with one
documented clause that is explicitly deferred or missing.

---

### PG-1: Per-section footnote collection

**What works:** All notes are collected and placed in `article-back` as a numbered
list. Footnotes, endnotes, and sidenotes are all collected.  
**What's missing:** Notes with `placement=foot` are supposed to collect per-section
(at the bottom of each section) rather than at the end of the document.  
**Spec:** Implicit in the `placement` kwarg semantics; noted in `notes/known-limitations.md`.  
**Code checked:** `packages/acadamark-interpreter/src/plugins/notes.js` line 11
comment: "simplified: per-section footnote collection is deferred."  
**AUD status:** Untracked.

---

### PG-2: Sidenotes as margin notes

**What works:** Notes with `placement=side` are numbered and collected into
`article-back` with a `sidenote: true` kwarg. The CSS could in principle style them
differently.  
**What's missing:** Sidenotes are supposed to appear in the page margin alongside
their reference point, not at the end of the document.  
**Spec:** `notes/known-limitations.md`.  
**Code checked:** `packages/acadamark-interpreter/src/plugins/note-placement.js`
lines 118–124: `sidenote` kwarg is set but all notes go to `article-back`
regardless.  
**AUD status:** Untracked.

---

### PG-3: `<ref>` `format` and `type` kwargs

**What works:** `<ref #id>` resolves the target and produces a formatted reference
like "figure 3" or "equation 1".  
**What's missing:** `format=` and `type=` kwargs on `<ref>` are accepted by the
parser and stored in the node, but the ref-resolution plugin and ref.js handler
ignore them entirely.  
**Spec:** `notes/known-limitations.md`.  
**Code checked:** `packages/acadamark-interpreter/src/plugins/ref-resolution.js`
and `src/handlers/ref.js` — no `kwargs.format` or `kwargs.type` logic present.  
**AUD status:** Untracked.

---

### PG-4: Author-supplied pipe content in `<ref>` ignored

**What works:** `<ref #id>` resolves and renders the auto-computed label.  
**What's missing:** `<ref #id | custom text>` — the pipe content (author-supplied
link text) is accepted by the parser, but ref.js ignores `node.content` entirely
and uses only the pre-computed `text` kwarg from ref-resolution.  
**Spec:** `notes/known-limitations.md`.  
**Code checked:** `packages/acadamark-interpreter/src/handlers/ref.js` — handler
only reads `node.kwargs.text`.  
**AUD status:** Untracked.

---

### PG-5: `<ref>` `+link`, `+preview`, `+title` boolean flags ignored

**What works:** `<ref #id>` resolves and produces an `<a>` element.  
**What's missing:** The booleans `+link`, `+preview`, `+title` are parsed and stored
in `node.booleans`, but ref.js and ref-resolution.js do not read them. The rendered
output is identical regardless of which flags are set.  
**Spec:** `notes/shorthand-syntax.md` examples 18–19 show these flags; `notes/hover-preview-investigation.md` described the hover-preview feature.  
**Code checked:** `packages/acadamark-interpreter/src/handlers/ref.js` — no
`node.booleans` access.  
**AUD status:** Untracked.

---

### PG-6: Code-block ids not referenceable via `<ref>`

**What works:** Section ids with colon-prefixed labels (`<## #sec:intro | ...>`)
are registered in the numbering registry and resolve correctly via `<ref #sec:intro>`.  
**What's missing:** Code-block ids (`<code #code:snippet | ...>`) are not registered
in the numbering plugin; `<ref #code:...>` always produces a ref-error.  
**Spec:** AUD-09 description: "Code-block registration: deferred."  
**Code checked:** `packages/acadamark-interpreter/src/plugins/numbering.js` — no
`code` visitor.  
**AUD status:** AUD-09 (partially tracked; section fix is done, code-block is open).

---

### PG-7: Note cross-references require colon-ids

**What works:** `<ref #note:fn1>` resolves if the note has `id="note:fn1"` (a
colon-prefixed label).  
**What's missing:** Auto-generated note ids (e.g., `note-1`, `note-2`) are not
registered in the label index. `<ref #note-1>` always produces a ref-error.  
**Spec:** `notes/known-limitations.md`.  
**Code checked:** `packages/acadamark-interpreter/src/plugins/ref-resolution.js`
— only the label index (colon-ids) is used; auto-ids are not populated there.  
**AUD status:** Untracked.

---

### PG-8: Multi-key citation key ordering

**What works:** Multi-key citations (`<cite [jones2001, smith2022]>`) are formatted
by citation-js and rendered.  
**What's missing:** Key order within a multi-key cite is alphabetical (citation-js
default), not preserved from the author's input order.  
**Spec:** `notes/known-limitations.md`.  
**Code checked:** `packages/acadamark-interpreter/src/plugins/cite-resolution.js`
— keys passed to `cite.format()` in author order; sorting is by citation-js
internally.  
**AUD status:** Untracked.

---

### PG-9: Deeply-nested `<config>` not read

**What works:** A `<config>` tag at `tree.children` level (top-level child of the
document) has its kwargs read.  
**What's missing:** `<config>` nested inside `<meta>` or inside a section is
silently ignored.  
**Spec:** `notes/interpreter.md` (pre-R4 description). `notes/known-limitations.md`.  
**Code checked:** `packages/acadamark-interpreter/src/plugins/config-discovery.js`
line 20 comment: "Deeply-nested `<config>` blocks are deferred."  
**AUD status:** Untracked.

---

### PG-10: Bibliography section heading hardcoded

**What works:** The bibliography section is generated and placed in `article-back`.  
**What's missing:** The section heading is hardcoded as `<h2>References</h2>`. There
is no config kwarg to change it (e.g., `<config bibliography-heading="Bibliography">`).  
**Spec:** No spec document specifies this as configurable; it is a gap relative to
the general config-driven design.  
**Code checked:** `packages/acadamark-interpreter/src/plugins/bibliography.js`
line 152: `const bibNode = makeBibliographyNode('<h2>References</h2>', bibBodyHtml)`.  
**AUD status:** Untracked.

---

### PG-11: Trailing whitespace before EOL treated as inline

**What works:** Sigil tags and named tags parse correctly when the line has no
trailing whitespace.  
**What's missing:** A sigil tag like `<# Heading #> ` (trailing space after `>`)
is not recognized as a flow construct; the text tokenizer picks it up as inline
instead.  
**Spec:** `notes/known-limitations.md`.  
**Code checked:** `packages/remark-acadamark/src/syntax.js` — `afterClose` rejects
when `code !== null && !markdownLineEnding(code)` in flow position; a space
after `>` is `code !== null` and not a line ending, so `nok` is called.  
**AUD status:** Untracked.

---

### PG-12: Escape sequences for `^`, `_`, `{`, `}` not yet decided

**What works:** Acadamark-significant escapes (`\<`, `\|`, `\\`) and ASCII
punctuation pass-through escapes (`\[`, `\*`, etc.) are implemented.  
**What's missing:** The behavior of `\^`, `\_`, `\{`, `\}` is explicitly marked
"not yet decided" in the spec — they currently match the pass-through rule (stored
as `\^` etc. for remark to handle), but this will need revision when inline-TeX
shortcuts (DF-1) are implemented.  
**Spec:** `notes/escape-rules-spec.md` — final section notes these four characters
as "not yet decided; depends on inline-TeX shortcuts feature."  
**Code checked:** `packages/remark-acadamark/grammar/acadamark.peggy`
`ContentItem` rule — `^`, `_`, `{`, `}` fall into the pass-through branch
(`[!-/:-=?@\[\\\]^_`{-~]`) and are emitted as `\X`.  
**AUD status:** Untracked.

---

### ~~PG-13: Markdown pass-through escapes inside named-tag content~~ — CLOSED

**Verified resolved (June 2026) by test RC-14 in `test-recursive.js`.**
`\*` inside `<figure | text with \*asterisk\*>` correctly produces literal
`*asterisk*` — no backslash, no emphasis — once `remarkRecursiveContent` re-feeds
the content through remark. CommonMark escape processing runs on the stored `\X`
string and emits the literal character.

**What works:** `\<`, `\|`, `\\` inside named-tag content emit the literal
character. ASCII punctuation escapes (`\*`, `\[`, etc.) are stored as `\X`
strings and then processed by CommonMark when `remarkRecursiveContent` re-parses
the content. The end-to-end path is complete.  
**Spec:** `notes/escape-rules-spec.md` — "temporary state" note is now obsolete;  
the temporary state has ended.  
**AUD status:** Untracked. Closed by RC-14.

---

## Doc-staleness findings

These are documentation files whose content no longer matches the codebase.
Fixing them is a doc-audit slice task, not a code change.

---

### DS-1: `notes/interpreter.md` — pre-R1-R4 pipeline description

Describes a 9-plugin pipeline. The actual post-R4 pipeline has 12 structural
steps plus an explicit `buildCitationIndex` call. Pipeline step 5 is still
labelled `acadamarkLibraryLoad`; no mention of `notePlacement`, `applyNumbers`,
`discover()`, `walkReplace()`, or the R4 refactor. **AUD-02** covers the related
`notes/interpreter-design.md` diagram.

---

### DS-2: `notes/pipeline.md` — pre-R1-R4 pipeline description

Describes a 6-stage model with 9 plugins. Same staleness issues as DS-1.

---

### DS-3: `BUILD.md` — shorthand parser slice table is stale

The slice table in `BUILD.md` shows:
- Slice 3: "Next"
- Slices 3.5, 4, 5, 6, 7: "—"

All of these slices are implemented. The table's Status and Done-when columns
describe the target state, not the current state. `BUILD.md` line 11 acknowledges
"The shorthand parser is feature-complete through Slice 4 plus recursive content
parsing, escape rules, and multi-line constructs" — but the table itself was not
updated.

---

### DS-4: `notes/interpreter-design.md` (archived?) — pipeline diagram drift

A pipeline diagram shows the interpreter as a rehype plugin. Actual implementation
uses mdast-level transforms before `toHast`, not a rehype plugin. **AUD-02** (tracked).

---

### DS-5: `notes/hover-previews-deferred.md` — feature is now implemented

The file describes hover previews as deferred future work. The feature has been
implemented. **AUD-03** (tracked).

---

## Open questions

These items appear in spec documents as explicitly undecided. They are not yet
"specified" in the sense that a decision has been made; they are recorded here
so they are not lost.

---

### OQ-1: `remark-math` integration with recursive content parsing

**Where:** `notes/idioms.md`. "Whether bare `$x$` inside `<aside | ...>` is treated
as inline math is an open question. `remark-math` is not currently a workspace
dependency."  
**BUILD.md** lists `remark-math` as a planned dependency, implying the intention
is to support it.  
**Current state:** `<$ | x $>` sigil form works. Bare `$x$` is plain text.  
**Decision needed:** Whether to install `remark-math` and thread it into the
recursive-content remark pipeline, and whether that interacts cleanly with the
`<$>` sigil form.

---

### OQ-2: Render-mode heading-level assignment for `<article-title>` + `<section-title>` coexistence

**Where:** `notes/layer1-naming.md` open decisions. "When both are present, do
section titles become `<h2>` (because article title takes `<h1>`)? Or do they stay
`<h1>` and rely on document structure?"  
**Current state:** Render-mode lowering plugin (DF-19) is not built, so this is
pre-implementation.  
**Decision needed:** Before implementing DF-19, settle the heading-level assignment
rule.

---

*End of document.*
