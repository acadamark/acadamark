# Table Grammars and Complex Tables: A Comparative Survey

*A survey of how widely used table grammars represent complex structure — column
and row spans, multi-level (spanning) headers, and related features — with their
strengths, weaknesses, common ground, and divergences. Closes with the question
of whether a canonical representation of complex tables exists.*

Prompt:
>Before the design pass, please generate a comprehensive and thorough report as a markdown document that looks at (at a minimum) the table grammars listed below and discuss how they handle complex features such as rowspans, colspans, spanning headings, and other complex features. Discuss the good and bad parts of each grammar. Note where the grammars share common elements and also where they differ. Collect the results into tables where appropriate. Include sources for the information.

---

## 0. Framing: two axes that explain most of the differences

Two distinctions cut across every system below, and naming them up front makes the
rest of the comparison legible.

**Presentation model vs. data model.** Some grammars describe how a table *looks*
(cells, spans, rules, alignment) and carry little or no machine-readable meaning
about what the cells *are*. Others describe the table as *data* (variables,
observations, groupings) and derive the appearance. HTML, LaTeX, CSS Grid, and most
Markdown tables are presentation-oriented. R's **gt** and the "tidy data" lineage
are data-oriented. This is the single biggest reason two systems that both "support
spanning" can feel completely different.

**Concise vs. expressive (vs. authorable).** A flat pipe table is concise but can
only express a rectangular grid. An HTML or grid table is fully expressive but
verbose. ASCII "grid" tables are expressive *and* plain-text but tedious to keep
aligned by hand. No notation is simultaneously terse, fully expressive, and easy to
maintain — which is exactly why Markdown never standardized a spanning table syntax.
Every system below sits at a different point on this trade-off.

A useful mental model for "complex features" throughout: a table is a grid of
*slots*; a spanning cell is *anchored* at one slot (conventionally the
upper-left-most it covers) and then *covers* additional slots. How a grammar names
the anchor and the covered region is most of its complexity story.

---

## 1. HTML tables

### How it handles complex features

HTML uses an explicit cell-merge model. A cell (`<td>` or header `<th>`) carries
`colspan="n"` to cover *n* columns and `rowspan="n"` to cover *n* rows. The cell is
anchored at its upper-left-most position and the covered slots are simply *not*
written as separate cells — the renderer skips over them. Three or more header
levels are built by stacking header rows inside `<thead>` and giving each spanning
header `colspan`/`rowspan`.

HTML also carries genuine *semantics* for accessibility, which most other
presentation grammars lack:

- **`scope`** marks a `<th>` as the header for a `col`, `row`, `colgroup`, or
  `rowgroup`.
- **`headers` + `id`** explicitly associate each data cell with the IDs of the
  header cells that govern it — the escape hatch for tables too complex for `scope`.
- **Structural zones**: `<thead>`/`<tbody>`/`<tfoot>` group rows; `<colgroup>`/`<col>`
  group columns; `<caption>` titles the table.

### Good

- Fully expressive: arbitrary colspan/rowspan, multi-level headers, footers.
- The only widely used presentation grammar with a built-in, standardized model for
  *associating data cells with their headers* (`scope`, `headers`/`id`), which is
  what assistive technology consumes.
- Universal: every browser, and the target most other tools render *into*.

### Bad

- Verbose; hand-authoring a spanned table is laborious and error-prone (omitted
  covered cells must line up mentally with the spans).
- The accessibility model has real ceilings: `scope`-based grouping is effectively
  limited to about two header levels, so deep header hierarchies require the tedious
  `headers`/`id` wiring, and even then screen-reader support for complex tables is
  uneven. Accessibility guidance broadly advises keeping tables simple and spanning
  sparingly.

*Sources: W3C WAI "Tables with Irregular Headers"; S. Ferg, "Techniques for
Accessible HTML Tables" (BLS); University of Virginia and George Mason accessibility
guides.*

---

## 2. CSS Grid

### How it handles complex features

CSS Grid is a **two-dimensional layout system**, not a table data model. It defines
column and row *tracks* on a container, and child items are placed into the
resulting grid. Spanning is expressed two ways:

- **Line-based**: `grid-column: 1 / 4` or `grid-column: 1 / span 3` (and the same
  for `grid-row`) place an item across a range of tracks.
- **Named areas**: `grid-template-areas` draws the layout as quoted strings, one per
  row, with each token naming the area a cell belongs to; repeating a name across
  adjacent cells makes that area span them. Areas **must be rectangular**, and the
  template visually mirrors the intended layout.

### Good

- Spanning is trivial and the `grid-template-areas` notation is unusually readable —
  the source looks like the layout.
- Excellent for *visual* arrangement and responsive reflow (areas can be redefined
  per breakpoint).

### Bad

- **It is not a table.** A grid has no notion of header cells, header-to-data
  association, column/row scope, captions, or head/body/foot zones — none of the
  semantics that make a *data* table meaningful or accessible.
- Source/visual order can diverge from DOM order, and assistive-technology reading
  and tab order follow the DOM, not the visual grid — so using Grid to fake a data
  table actively harms accessibility.
- Best understood here as a *useful contrast*: it shows that "spanning cells" as pure
  visual placement is easy; the hard part of tables is the *semantics* Grid omits.

*Sources: MDN "Basic concepts of grid layout" and "Grid template areas";
CSS-Tricks "A Complete Guide to CSS Grid"; Smashing Magazine "Understanding CSS
Grid: Grid Template Areas."*

---

## 3. LaTeX (tabular and successors)

### How it handles complex features

Core `tabular` is a flat grid (`&` separates columns, `\\` ends rows). Complex
structure comes from commands and packages layered on top:

- **Column spans**: `\multicolumn{n}{align}{text}` merges *n* columns into one cell;
  the cells it covers must be **omitted** from the row.
- **Row spans**: the **multirow** package adds `\multirow{n}{width}{text}`; unlike
  `\multicolumn`, the cells it covers must **not** be omitted (they are left blank),
  which is a frequent source of confusion.
- **Partial rules**: `\cline{i-j}` draws a horizontal rule under only columns *i*–*j*
  (e.g., under just the columns beneath a spanning header).
- **Professional rules**: the **booktabs** package supplies `\toprule`/`\midrule`/
  `\bottomrule` and the convention of no vertical rules — widely treated as the house
  style for good tables.
- **Spanning in both directions at once** (a cell that is both multi-column and
  multi-row) is fiddly in classic LaTeX: it typically requires `\multirow` plus
  repeated `\multicolumn` in the covered rows to keep borders correct, plus `\cline`
  to avoid drawing rules through the spanned text.

The modern **tabularray** package (LaTeX3) unifies this. A single `\SetCell[r=,c=]`
declares both row and column spans, and the package handles vertical centering and
row-height enlargement for multi-row cells automatically — removing most of the
manual `\multirow`/`\multicolumn`/`\cline` bookkeeping. Other niche packages
(`nicematrix`, `makecell`, `tabu`) address adjacent needs.

### Good

- Fully expressive, print-quality output; the de facto standard for scientific and
  mathematical typesetting.
- `tabularray` brings a genuinely cleaner, more uniform spanning model.

### Bad

- Classic `tabular` + `multirow` + `multicolumn` + `cline` is notoriously fiddly;
  the asymmetry (omit covered cells for colspan, keep them for rowspan) trips up
  almost everyone.
- Presentation-only: no machine-readable header/data semantics; extracting structure
  back out of LaTeX source is hard.
- Fragmented across many packages with overlapping scope.

*Sources: CTAN `tabularray` manual; `multirow` v2.3 manual (van Oostrum, Bache,
Leichter); Wikibooks "LaTeX/Tables"; Overleaf "Tables"; booktabs documentation.*

---

## 4. Markdown systems that handle complex tables

Markdown is not one grammar but a family, and they differ sharply on complex tables.

- **CommonMark**: no native tables at all (tables are an extension).
- **GitHub Flavored Markdown (GFM) pipe tables**: a strict rectangular grid — one
  required header row, pipe-delimited cells, alignment colons. **No** colspan,
  **no** rowspan, no multi-line cells, no block content in cells.
- **MultiMarkdown (MMD)**: the main Markdown dialect with a built-in span — column
  spans via consecutive trailing pipes (e.g., `||`). It does **not** offer true
  rowspan. This is the historical exception that proves how rare spanning is in
  Markdown.
- **Pandoc** offers four table syntaxes with different ceilings:
  - *Pipe tables* and *simple tables*: rectangular only; cells cannot span columns,
    rows, or lines, and cannot hold block content.
  - *Multiline tables*: rows and headers may span multiple *lines of text*, but
    cells still cannot span columns or rows.
  - *Grid tables*: ASCII-art tables drawn with `+`, `-`, `=`, and `|`. These are the
    expressive option — cells can hold block content, and (following the reStructured
    Text / docutils grid convention) the **reader now supports rowspan and colspan**
    by merging cells across the grid borders, plus table head/foot. **Writer**
    support for emitting spans is still more limited than reader support.

Underneath the syntaxes, **Pandoc's abstract table model** (the `pandoc-types`
`Table` type, expanded in pandoc 2.10 / pandoc-types 1.21) is itself important: it
can represent attributes, colspans and rowspans, column headers, *multiple* row
headers, and explicit `TableHead`/`TableBody`/`TableFoot` zones. It functions as a
unifying intermediate model that the many readers and writers convert through — i.e.,
a span-capable model decoupled from any one surface syntax.

### Good

- Pipe tables are maximally concise and readable for the simple-grid case (which is
  the overwhelming majority of real Markdown tables).
- Grid tables (and the Pandoc AST behind them) show that plain text *can* express
  full spanning — at a cost.
- The Pandoc AST is a clean, format-independent table model worth borrowing from.

### Bad

- The concise syntax everyone actually uses (GFM/pipe) cannot span at all.
- The syntax that can span (grid tables) is verbose and painful to align and edit by
  hand — the classic concise-vs-expressive wall.
- Fragmentation: "Markdown tables" means very different things across dialects, and
  span support is inconsistent and (for writers) incomplete.

*Sources: Pandoc manual §"Tables"; Pandoc 2.10 release notes (pandoc-types 1.21);
Pandoc issues #1024, #6317, #7957, #8346, #8990 (table model, grid-table spans);
Pandoc DeepWiki "Table Rendering Across Writers."*

---

## 5. R **gt** — a grammar of tables

### How it handles complex features

`gt` ("grammar of tables," explicitly modeled on ggplot2's grammar of graphics) is a
*different kind of thing*: a **compositional, data-first construction grammar**. You
start from a tidy data frame and assemble a display table from a fixed set of
**parts**:

- **Table Header** — title and subtitle.
- **Stub** + **Stubhead** — the left-hand column of row labels, optionally organized
  into **row groups** with row-group labels (the vertical-grouping analogue of a
  spanned row header).
- **Column Labels** — with optional **spanner column labels** via `tab_spanner()`,
  which place a heading above a contiguous run of columns. Spanners can be **nested
  to unlimited levels**, giving true multi-level column headers.
- **Table Body** — the cells, derived from the data frame.
- **Table Footer** — footnotes and source notes.

Crucially, the complex structure in `gt` is *semantic and declarative*: you say
"group these columns under this spanner" or "these rows form this group," and `gt`
renders the spanning HTML/LaTeX. You do **not** hand-merge arbitrary body cells; the
body stays a tidy rectangle, and "spanning" lives in the header (spanners) and the
stub (row groups). It renders to HTML, LaTeX, RTF, and Word.

### Good

- Multi-level spanning headers and row groups are first-class, declarative, and
  composable — the common "scientific table" header complexity is expressed cleanly
  and accessibly, without manual cell math.
- Single description renders to multiple output formats.
- The parts vocabulary (stub, stubhead, spanners, row groups, body, footer) is a
  genuinely useful conceptual model for *what a complex table is made of*.

### Bad

- Not an authoring *syntax* you write by hand in prose — it is R code over a data
  frame.
- It does not target arbitrary free-form body-cell merges; if your table is a
  hand-drawn layout rather than tidy data with structured headers, `gt` is the wrong
  tool.
- Input must essentially be tidy/rectangular to begin with.

*Sources: gt documentation (gt.rstudio.com: `tab_spanner`, `cells_column_spanners`,
reference index); Posit "Great Looking Tables: gt"; CRAN `gt` manual; "gt — a
Grammar of Tables" (The MockUp).*

---

## 6. Side-by-side comparison

### 6.1 Feature matrix

| Feature | HTML | CSS Grid | LaTeX (`tabular`+pkgs / `tabularray`) | Markdown (pipe / grid) | R `gt` |
|---|---|---|---|---|---|
| Column span (colspan) | ✅ `colspan` | ✅ visual (`span`/areas) | ✅ `\multicolumn` / `\SetCell[c=]` | ❌ pipe · ✅ grid (reader) | ✅ via spanners (header) |
| Row span (rowspan) | ✅ `rowspan` | ✅ visual (`span`/areas) | ✅ `\multirow` / `\SetCell[r=]` | ❌ pipe · ✅ grid (reader) | ➖ via row groups, not free cell merge |
| Multi-level / spanning headers | ✅ stacked `<thead>` rows | ➖ visual only | ✅ (manual / cleaner in `tabularray`) | ❌ pipe · ➖ grid | ✅ nested `tab_spanner` (unlimited) |
| Head / body / foot zones | ✅ `thead`/`tbody`/`tfoot` | ❌ | ➖ via rules/packages | ➖ grid (head/foot) | ✅ explicit parts |
| Named columns | ➖ `<col>`/IDs | ✅ area names | ➖ | ❌ | ✅ (data-frame columns) |
| Cell ↔ header association (semantics) | ✅ `scope`, `headers`/`id` | ❌ | ❌ | ❌ | ✅ (structural, by part) |
| Concise hand-authoring | ❌ verbose | ➖ | ❌ verbose | ✅ pipe · ❌ grid | n/a (code) |
| Orientation | presentation (+ a11y semantics) | layout only | presentation | presentation | **data / construction** |

Legend: ✅ first-class · ➖ partial / indirect / with caveats · ❌ not supported.

### 6.2 How spans are *named* (the anchor/cover model)

| System | Span declared on | Covered slots |
|---|---|---|
| HTML | the anchor cell (`colspan`/`rowspan`) | omitted entirely |
| LaTeX `\multicolumn` | the anchor cell | omitted from the row |
| LaTeX `\multirow` | the anchor cell | left **blank** (kept) |
| LaTeX `tabularray` | `\SetCell[r=,c=]` on anchor | handled by the package |
| CSS Grid | the item (`grid-column/row`, or repeated area name) | implied by the rectangle |
| Pandoc grid / AST | cell attributes (colspan/rowspan) | merged across grid borders |
| OASIS CALS (see §7) | the `<entry>` (`namest`/`nameend`, `morerows`) | implied by named columns |

---

## 7. Common ground and divergence

**What they share.** Nearly all of them resolve to the same underlying abstraction:
a rectangular grid of slots, with spanning cells anchored at one slot and covering a
rectangular block of others. They share the head/body/foot idea (HTML, Pandoc, CALS,
gt) and the notion of column definitions that spans reference. The anchor-plus-cover
model in §6.2 is essentially universal — only the *spelling* changes.

**Where they diverge.**

- **Presentation vs. data.** HTML/LaTeX/CSS/Markdown describe appearance; gt and the
  tidy-data lineage describe data and derive appearance. This determines whether
  "complex" means *arbitrary cell merging* (presentation) or *structured headers and
  groups over tidy data* (data).
- **Semantics of headers.** Only HTML (via `scope`/`headers`) and the structured
  models (CALS, gt) carry machine-readable header-to-cell relationships. LaTeX, CSS
  Grid, and plain Markdown carry none — the spanning is purely visual.
- **Concise vs. expressive.** The systems split cleanly: concise-but-flat (GFM/pipe
  Markdown), expressive-but-verbose (HTML, LaTeX, grid Markdown), and
  declarative-over-data (gt). None achieves all three.
- **Covered-cell convention.** Even among the "omit the covered cell" systems there's
  an inconsistency that bites authors: LaTeX omits covered cells for colspan but
  keeps blank ones for rowspan.

---

## 8. Is there a *canonical* representation of complex tables?

Short answer: **there is no single universal one — but there are several
well-established canonical models, and which is "canonical" depends on the purpose.**
It also helps to separate two senses of "canonical" that are often conflated.

### 8.1 Two senses of "canonical"

- **Canonical structure (presentation/interchange):** a standard way to represent a
  complex table's *layout* — spans, headers, zones — so it can move losslessly
  between tools.
- **Canonical form (data/normalization):** a standard *normalized data* shape that a
  messy presentation table is transformed *into* — the tidy/relational "one variable
  per column, one observation per row" form.

The paper you linked — **TableCanoniser** (Xiong, Huang, Wybrow & Wu, CHI 2025,
CC BY 4.0) — is about the **second** sense. It is a *grammar for transforming messy,
non-relational presentation tables into canonical (tidy/relational) tables*, with
interactive, linked visualizations of the transformation specification. Its
"canonical table" is the normalized data form, **not** a canonical syntax for
*authoring* spanning tables. Worth keeping straight, because it answers a different
question than "how should I encode a complex table."

### 8.2 Candidates for a canonical *structure*

- **OASIS CALS / Open Exchange Table Model** (TM 9502:1995). The closest thing to a
  de facto canonical *interchange* model for complex publishing tables. Structure:
  `table → tgroup → colspec* → thead/tbody → row → entry`. Columns are **named**
  (`colspec @colname`); horizontal spans use `namest`/`nameend` (start/end column
  names, inclusive); vertical spans use `morerows` (count of *additional* rows).
  Adopted across DocBook, DITA, and — directly relevant to JATS — as one of the two
  table models JATS permits.
- **The HTML / XHTML table model.** The other table model JATS allows, and the web's
  lingua franca. Spans via `colspan`/`rowspan`, plus the only widely deployed
  *header-association* semantics (`scope`, `headers`/`id`).
- **Pandoc's abstract `Table` AST.** A modern, format-independent model (attributes,
  colspan/rowspan, column headers, multiple row headers, head/body/foot) explicitly
  designed as the common representation many formats convert through.
- **OOXML and ODF** table models (Word/Excel and OpenDocument) — full cell-merge
  models, canonical within their ecosystems.
- **Document-AI logical models** (e.g., the PubTabNet-style HTML logical structure
  used in table-structure-recognition) — a canonical *target* for recovering
  structure from rendered/scanned tables.

### 8.3 Candidates for a canonical *form*

- **Tidy data** (Wickham) — the relational/long normalized form that underlies most
  data tooling.
- **TableCanoniser** and related transformation grammars — tools/grammars to *get*
  messy tables into that form.

### 8.4 Honest synthesis

There is no one universal canonical representation of complex tables. There are
instead a few mature models clustered by purpose:

| Purpose | Canonical-ish model(s) |
|---|---|
| Interchange / publishing of presentation tables | **OASIS CALS**, the **HTML/XHTML table model** (both permitted by JATS) |
| Format-independent intermediate | **Pandoc `Table` AST** |
| Construction / description | **grammar of tables** (gt-style parts), grammar of graphics lineage |
| Data normalization (the "tidy" sense) | **tidy data**, with **TableCanoniser** as a transformation grammar |

If forced to name the single most "canonical" structural representation for *complex
spanning publishing tables*, it is the **CALS / HTML lineage** (named columns +
explicit spans + head/body/foot), with the Pandoc AST as a clean modern unification.
The TableCanoniser line is canonical in the orthogonal, data-normalization sense.

---

## 9. Takeaways relevant to designing a new table grammar

Distilled from the survey, for whoever designs the next concise-yet-expressive table
syntax:

1. **The data model is the solved part.** Borrow a span-capable model that already
   works — Pandoc's `Table` AST or the CALS/HTML model (named columns, anchor +
   `colspan`/`rowspan` or `namest`/`nameend`/`morerows`, explicit head/body/foot).
   The novel work is the *authoring syntax*, not the model.
2. **You will be choosing a point on the concise–expressive curve, not escaping it.**
   Pipe-style concision cannot express spans; full expressiveness implies grid-table
   verbosity. Staging helps: multi-row headers + column spans cover most real
   scientific tables (the common case), with arbitrary body rowspan deferred.
3. **Carry header semantics, not just visual spans.** The thing that separates a real
   table grammar from CSS-Grid-style layout is header-to-cell association (HTML
   `scope`/`headers`, CALS named columns, gt parts). A grammar that only draws spans
   is a layout tool, not a table model.
4. **A "parts" vocabulary scales.** gt's stub / stubhead / spanners / row groups /
   body / footer is a clean way to *name* complexity declaratively, which tends to
   age better than free-form cell merging.

---

## Sources

**HTML tables / accessibility**
- W3C WAI, *Tables with Irregular Headers* — https://www.w3.org/WAI/tutorials/tables/irregular/
- S. Ferg, *Techniques for Accessible HTML Tables* (U.S. BLS) — https://www.bls.gov/osmr/research-papers/2004/pdf/st040250.pdf
- University of Virginia, *Table Accessibility – Basics* — https://digitalaccessibility.virginia.edu/table-accessibility-basics
- George Mason ATI, *Creating Accessible Tables* — https://ati.gmu.edu/web-accessibility/ictaccessibilitystandards/creating-accessible-tables/

**CSS Grid**
- MDN, *Basic concepts of grid layout* — https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Basic_concepts
- MDN, *Grid template areas* — https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Grid_template_areas
- CSS-Tricks, *A Complete Guide to CSS Grid* — https://css-tricks.com/complete-guide-css-grid-layout/
- Smashing Magazine, *Understanding CSS Grid: Grid Template Areas* — https://www.smashingmagazine.com/understanding-css-grid-template-areas/

**LaTeX**
- CTAN, *tabularray* manual — https://ctan.math.illinois.edu/macros/latex/contrib/tabularray/tabularray.pdf
- *multirow* v2.3 manual (van Oostrum, Bache, Leichter) — CTAN `macros/latex/contrib/multirow`
- Wikibooks, *LaTeX/Tables* — https://en.wikibooks.org/wiki/LaTeX/Tables
- Overleaf, *Tables* — https://www.overleaf.com/learn/latex/Tables

**Markdown / Pandoc**
- Pandoc manual, *Tables* — https://pandoc.org/MANUAL.html#tables (demo: https://pandoc.org/demo/example33/8.9-tables.html)
- Pandoc 2.10 release notes (pandoc-types 1.21) — https://github.com/jgm/pandoc/releases/tag/2.10
- Pandoc issues #1024, #6317, #7957, #8346, #8990 — https://github.com/jgm/pandoc/issues/
- Pandoc DeepWiki, *Table Rendering Across Writers* — https://deepwiki.com/jgm/pandoc/6.7-table-rendering-across-writers

**R gt**
- gt documentation — https://gt.rstudio.com/reference/index.html ; `tab_spanner` — https://gt.rstudio.com/reference/tab_spanner.html
- Posit, *Great Looking Tables: gt* — https://posit.co/blog/great-looking-tables-gt-0-2
- CRAN, *gt* package manual — https://cran.r-project.org/web/packages/gt/gt.pdf
- *gt — a Grammar of Tables* (The MockUp) — https://themockup.blog/posts/2020-05-16-gt-a-grammar-of-tables/

**Canonical representations**
- K. Xiong, C. A. Huang, M. Wybrow, Y. Wu, *TableCanoniser: Interactive Grammar-Powered Transformation of Messy, Non-Relational Tables to Canonical Tables*, CHI 2025, CC BY 4.0 — https://doi.org/10.1145/3706598.3714321 (also ResearchGate pub. 391239682)
- OASIS Open Exchange (CALS) Table Model, TM 9502:1995 — http://www.oasis-open.org/specs/a502.htm ; attribute reference (morerows / namest / nameend) via the JATS NLM tag library — https://jats.nlm.nih.gov/options/OASIS/tag-library/19990315/
- JATS `<table-wrap>` (permits both XHTML and OASIS CALS table models) — https://jats.nlm.nih.gov/

*Note: ACM's Digital Library blocked automated access to the TableCanoniser page;
its details here are drawn from the open-access record (DOI/ResearchGate) and the
search index.*