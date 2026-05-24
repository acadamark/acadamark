> **Archived 2026-Q2.** The five design directions in this file are integrated into `DESIGN.md` (section "Design directions discovered through implementation") in condensed prose form. This file retains the fuller implementation-detail version — including the YAML sketches and the DD-N numbering that `notes/audit-findings.md` cross-references ("see DD-1/DD-2"). Retained for reference; not a current spec.

---

# Design directions

This file captures architectural directions for acadamark — design decisions and targets that aren't bugs but guide future work. Distinct from `audit-findings.md` (which captures specific issues to address) and from spec documents (which describe the current state).

A direction here represents where the system is going, not where it is. Each direction is filed with rationale and (where relevant) implementation implications.

---

## DD-1: Content gets parsed; arguments don't

**Principle:** The form a value takes in source syntax (kwarg, positional, pipe-content, child element) is incidental. The semantic role determines whether it gets parsed as content.

- **Arguments / parameters / options:** Configuration values. Don't get parsed. Examples: `citation-style="apa"`, `placement="end"`, `src="file.bib"`, `format="csv"`. These are typed strings or enumerations; their content is opaque to the parser/plugin pipeline.

- **Content:** Authored prose-and-structure that may contain tags, citations, math, references, emphasis. Gets parsed recursively. Examples: `caption="..."`, `title="..."`, the body of `<note>`, the cells of a table, the prose between section headings.

**Current state:** Some content-shaped values are kwargs and DON'T get parsed (e.g. `caption="text with <cite Smith2020>"` — the cite tag is treated as literal text). This is wrong.

**Direction:** Vocabulary entries declare each kwarg's role. The interpreter pipeline walks `role: content` kwargs as if they were child nodes, applying the same recursive parsing and plugin treatment.

**Implementation implication:** A small extension to vocabulary entries:
```yaml
kwargs:
  src:
    type: string
    role: argument          # opaque, not parsed
  caption:
    type: string
    role: content           # parsed as acadamark content
```

The cite-resolution, ref-resolution, numbering, and similar plugins iterate over `role: content` kwargs alongside child nodes.

**Affects:** AUD-14 (citations in captions). Probably affects figures, tables, code blocks, and any other element with caption-like attributes.

---

## DD-2: Tags with caption-like content support two equivalent forms

**Principle:** For elements like tables, figures, and code blocks that have both metadata (id, format hint) AND content-like attributes (caption, alt text), authors can choose between a compact form and an explicit form. Both produce equivalent AST.

**Compact form:**
```
<table csv #tab:foo caption="Brief caption text">
A,B,C
1,2,3
</table>
```

**Explicit form:**
```
<table csv #tab:foo>
  <caption>A rich caption with <cite Smith2020>.</caption>
  <data>
    A,B,C
    1,2,3
  </data>
</table>
```

The compact form is convenient when the caption is brief and has no rich content. The explicit form is necessary when:
- The caption needs rich content (citations, math, emphasis) — even if DD-1 lands and the compact form's caption gets parsed, the explicit form is more readable for long captions.
- The author wants visual separation of structural concerns.
- The element has multiple content sections (e.g., a figure with caption + alt text + description).

**Direction:** Both forms work for any element where this distinction makes sense. The handler accepts either and produces the same output. Vocabulary entries document both forms.

**Affects:** Table handler, figure handler, code-block handler, anywhere captions exist. Generalizes DD-1.

**Implementation implication:** Each handler needs to look in both places: `node.kwargs.caption` AND child `<caption>` element. Pick whichever is present (warn if both). The downstream rendering is identical.

---

## DD-3: `<meta>` is for document metadata; `<config>` is for document options

**Principle:** The two are distinct concerns and shouldn't blur.

- **`<meta>`:** Document metadata that appears in or affects the rendered document. Title, subtitle, author, date, affiliations, abstract, keywords, etc. JATS-like in spirit. Renders visibly (the title appears in the rendered output).

- **`<config>`:** Document-level configuration that affects how the document is processed but doesn't appear as content. Citation style, numbering preferences, theme options, etc. Doesn't render visibly.

**Current state:** Boundary is unclear. `<config>` silently accepts metadata kwargs (AUD-13). Author intuition (Copilot's intuition) confused them.

**Direction:** Clear separation. `<meta>` and `<config>` validate their accepted attributes. Unknown attributes warn or error. Spec docs and vocabulary entries make the distinction explicit.

**Affects:** AUD-13. Possibly affects how `<config>` discovery works in the pipeline.

**Implementation implication:** Vocabulary entries for `<meta>` and `<config>` list their accepted kwargs explicitly. Config-discovery plugin validates that `<config>` only contains known config options.

---

## DD-4: All tag forms work for all tags where semantically meaningful

**Principle:** The grammar supports five tag forms (short, pipe-content, multi-line pipe-content, long-form nesting, self-closing). For any given tag, the forms that semantically make sense should ALL work, with equivalent output.

**Current state:** Inconsistent (AUD-15). Some tags work in some forms but not others. Authors have no clear guide.

**Direction:** For each vocabulary tag, document which forms are supported and ensure handlers work for all supported forms. Resolve parser-level conflicts (like AUD-08 where self-closing breaks for DSL_REGISTRY tags).

**Affects:** AUD-08, AUD-15. Probably affects most vocabulary tags to some degree.

**Implementation implication:** Vocabulary entries grow a `supported_forms` declaration. Tests cover each declared form. Parser bugs that prevent declared-supported forms get fixed.

---

## DD-5: Standalone HTML is the build target; client-side rendering is the future target

**Principle:** The current pipeline produces self-contained HTML files. Each rendered document includes all CSS, all fonts, all rendered citations, all hover-preview infrastructure. The HTML can travel — emailed, archived, viewed offline — and renders identically.

**Direction:** This isn't changing. But: a future target is full client-side rendering. Like JupyterLite, an acadamark source document (`.acm` file) loaded in a browser should render to its full presentation without server-side build. This requires:
- The parser to run in the browser.
- Plugins to run in the browser.
- citation-js to run in the browser (already possible).
- The handler pipeline to run in the browser.

**Current state:** Build-time only. The plugins, parser, handlers run in Node.

**Direction:** Post-audit work targets client-side rendering. The build-time pipeline stays as one target; the client-side pipeline becomes a parallel target with shared code.

**Affects:** Major future work. Drives architectural decisions: keep plugin code framework-agnostic, prefer pure functions, avoid Node-specific APIs where possible.

**Implementation implication:** Not slice work yet. But code reviews should keep this future in mind — flag patterns that would resist migration.

---
