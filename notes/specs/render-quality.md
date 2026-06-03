# Render Quality

This document specifies what *well-rendered* enscribe HTML output looks like.
It is the standard a rendered enscribe document is held to: which elements
must wrap which content, which CSS classes must appear, and which typographic
behaviours the bundled default theme must produce. Each requirement is written
as a **verifiable predicate** — a statement that can be checked mechanically
against rendered output or against the bundled stylesheet, without authorial
judgement about whether something "looks good".

For *how* the interpreter produces this output — the plugin chain, the handler
dispatch, the exact emission sites — see `notes/specs/interpreter.md`. For the
vocabulary of elements being rendered, see `packages/layer1-vocabulary/SPEC.md`
and the per-element entries under `packages/layer1-vocabulary/elements/`. For
the design rationale behind treating Layer 1 + CSS as the canonical display
target, see the "Layer 1 is canonical; display is a downstream ladder" section
of `DESIGN.md`.

---

## 0. Scope

### 0.1 What this document covers

Enscribe's display model (`DESIGN.md`, the display-ladder section) is a ladder
of three targets:

1. **Layer 1 + CSS, no JavaScript.** Custom Layer 1 elements rendered directly
   by the browser as generic boxes, given structure and typography by a
   stylesheet. This is the default and reaches further than people expect: a
   `<section-title>` given block display and heading-sized type *is* a heading,
   visually.
2. **Layer 1 + CSS + conditionally-injected JavaScript.** For affordances CSS
   cannot provide — hover previews for citations and cross-references. The
   interpreter injects this bundle only when a document contains notes, refs,
   or cites.
3. **Render mode — lossy lowering to plain HTML.** `<section-title>` → `<h1>`,
   and so on, for consumers that cannot accept custom elements.

**This document specifies targets 1 and 2** — the current default output of the
interpreter: custom-element-rich Layer 1 HTML, the bundled
`packages/enscribe/src/interpreter/assets/default.css` theme, and the
conditional hover-preview assets. The class vocabulary referenced throughout is
the vocabulary that `default.css` defines.

### 0.2 What this document does not cover

- **Render mode (target 3).** The lossy lowering to plain `<h1>`/`<h2>` headings
  is deferred work (`ROADMAP.md`, lift-and-lower phase). When it lands it gets
  its own predicates; the lowering table is not specified here.
- **JATS export.** JATS output correctness is enforced by DTD validation in
  `packages/@enscribejs/cli`, not by render predicates. This document is
  about HTML rendering only.
- **Theme variation.** Predicates here are stated against the *bundled default
  theme*. Alternate themes (a roadmap release goal) may restyle freely; they
  are conformant if they satisfy the same *structural* predicates (§1.2) and
  provide *some* rule for each semantic class, not necessarily the same values.
- **External-DSL rendered fidelity.** For `<mermaid>` and `<abc>`, enscribe
  guarantees the *markup contract* (§9) in every mode; the rendered diagram or
  notation is produced by the external library, not by enscribe. In live mode
  enscribe may emit that library (opt-in); in static mode it may inline the
  library's SVG output (opt-in, abc only) — but the rendering itself is always
  the library's, so its fidelity is out of enscribe's spec.

### 0.3 Relationship to fixtures and to bug-filing

The demonstrative fixtures (the article-shaped and book-shaped documents added
alongside this spec) are authored to exercise these predicates against
believable documents. They are rendered to HTML by
`packages/enscribe/test/render-fixtures.js` and their structural
output is pinned by snapshot in `test/integration.test.js`.

This document describes the **intended** rendering. The pinned snapshots
capture the **current** rendering. Where the two disagree — a predicate this
document states but the pipeline or the default theme does not yet satisfy —
the gap is recorded as a render-quality bug in GitHub Issues, cross-referenced
to the predicate id below. Bug-fix slices reconcile current output to the
intended standard; this document is the standard, not a status report, so it
does not enumerate which predicates currently fail.

---

## 1. The predicate model

### 1.1 Two predicate kinds

Every feature below is specified with predicates of two kinds:

- **Markup predicates (`M`).** What HTML the pipeline must emit: the wrapping
  element, the CSS class strings, the `id`/`data-*` attributes, the label and
  number text. Checked against the rendered `.html` (or the hast snapshot).
  These are produced by the interpreter's handlers and structural plugins.
- **Stylesheet predicates (`S`).** What rule the bundled `default.css` must
  contain so that the emitted markup renders as intended: a selector matching
  the emitted element/class, carrying a named CSS property. Checked against
  `default.css`.

The split matters because the two failure modes are different and are fixed in
different files. A feature can emit perfectly correct markup (the `M` predicates
pass) while the default theme has no rule for it (an `S` predicate fails),
leaving a semantically-correct element rendered as undifferentiated inline text.
Separating the predicate kinds makes that failure mode nameable.

Predicate ids follow `RQ-<AREA>-<M|S><n>` (e.g. `RQ-THM-S1`). The area codes
are the section short-names below. Ids are stable anchors: render-quality
bugs in GitHub Issues reference them.

### 1.2 Aesthetics are named by their HTML semantic

This document does not say a heading "looks important". It names the HTML
semantic that *carries* the importance and states it as a checkable property.
"The label is prominent" becomes "`default.css` gives the label selector
`font-weight: 700`". "The block is set off from body prose" becomes "the element
selector carries `display: block` and a non-zero vertical `margin`". A predicate
that cannot be reduced to a named element, class, attribute, or CSS property
does not belong in this document — it belongs to theme design, recorded under
the relevant **Out of spec** heading.

---

## 2. Coverage map

This section is the completeness check: every Layer 1 vocabulary element is
accounted for as one of three dispositions.

- **Specified** — the element has dedicated predicates in §§3–14 below.
- **Generic-implicit** — the element is HTML-native (`is_html_native: true`)
  and passes through as the same HTML tag. Its rendering is the browser default
  plus any `data-*` attribute preserved for theme targeting. One blanket
  predicate covers the whole set (§5.3, §6.2); no per-element predicate is
  written, because there is nothing enscribe-specific to verify beyond
  pass-through.
- **No-output** — the element is consumed by the pipeline and produces no
  rendered body output by design. The predicate is precisely that it emits
  nothing into the body.

| Disposition | Elements | Section |
|---|---|---|
| Specified — document structure | `article`, `article-front/body/back`, `article-title`, `article-subtitle`, `section`/`sub-section`/`sub-sub-section` (+ `-title`/`-subtitle`), `title`, `subtitle` | §3 |
| Specified — author & meta | `author`, `name` | §4 |
| Specified — block prose | `blockquote`, `hr`, `ul`/`ol`/`li` | §6 |
| Specified — inline prose | `em`, `strong` | §7 |
| Specified — frameables | `fig`(`figure`), `img`, `table`, `csv`, `tsv`, `svg`, `frame`, `aside` (boxed prose) | §8 |
| Specified — external DSLs | `mermaid`, `abc` | §9 |
| Specified — math | `inline-math`, `display-math`, `math`, `align`, `cases`, `matrix`, `eqnarray` | §10 |
| Specified — theorem family | `theorem`, `lemma`, `corollary`, `proposition`, `definition`, `example`, `remark`, `proof` | §11 |
| Specified — refs & cites | `ref`, `cite`, `a` | §12 |
| Specified — footnotes | `note`, `note-list` | §13 |
| Specified — bibliography | `bibliography`, `bib-entry` | §14 |
| Specified — book | `book`, `book-front/body/back`, `book-part`, `book-title`, `book-subtitle`, `book-part-title`, `book-part-subtitle` | §15 |
| Generic-implicit (block) | `p`, `details`, `summary`, `dl`, `dt`, `dd` | §6.2 |
| Generic-implicit (inline) | `b`, `i`, `u`, `s`, `sub`, `sup`, `span`, `q`, `abbr`, `kbd`, `var`, `samp`, `output`, `code` | §7.2 |
| No-output | `meta`, `config`, `data`, `library`, `bib-entry` | §4.3, §14 |
| Specified with deferred presentation | `affiliation`, `orcid`, `email`, `date`, `publication-date`, `doi`, `license`, `lang`, `keywords`, `subject`, `version`, `editor`, `abstract`, `term`, `glossary`, `glossary-entry`, `code-block`, `inline-code` | §4.4, §6.3, §7.3 |

The "deferred presentation" row names elements the pipeline emits correctly (or
suppresses correctly) but for which the *default theme* deliberately provides no
dedicated rule yet: they render via browser defaults or via a more generic
selector. Each is called out under an **Out of spec** heading in its section,
with the boundary stated. They are not coverage gaps in this document — they are
explicit deferrals.

> **Completeness note.** Two naming facts the predicates key off: the figure
> element's vocabulary key is `fig` and it renders as HTML `<figure>` (there is
> no `figure.md` vocabulary file; `fig.md` is canonical). Several elements
> render to a tag other than their own name — `inline-code`→`<code>`,
> `code-block`→`<pre><code>`, `csv`/`tsv`→`<table>`, `mermaid`→`<pre>`,
> `abc`→`<pre>`, `frame`→`<figure>`, `ref`→`<a>` — so the predicates below key
> off the *rendered* tag, not the authored element name.

---

## 3. Document structure (article) — `RQ-DOC`

**What it is.** A `<meta type=article>` (or untyped) document is wrapped by the
structuring plugins into the Layer 1 article skeleton.

**Intended rendering.** The three regions read as distinct zones of the page:
front-matter (title block) set off above the body, back-matter (notes,
bibliography) set off below it. The title is the most prominent text on the
page; section titles form a visibly descending heading hierarchy.

**Expected markup:**

```html
<article>
  <article-front>
    <meta data-document-type="article">
      <article-title>…</article-title>
      <article-subtitle>…</article-subtitle>
      <author>…</author>
    </meta>
  </article-front>
  <article-body>
    <section>
      <section-title>…</section-title>
      <p>…</p>
      <sub-section><sub-section-title>…</sub-section-title>…</sub-section>
    </section>
  </article-body>
  <article-back>
    <note-list>…</note-list>
    <bibliography>…</bibliography>
  </article-back>
</article>
```

**Markup predicates:**

- **`RQ-DOC-M1`** — the document is wrapped in `<article>`; front-matter
  (`<meta>`) is inside `<article-front>`, body content inside `<article-body>`,
  back-matter (`<note-list>`, `<bibliography>`, `<config>`) inside
  `<article-back>`. Empty regions are suppressed (a document with no
  back-matter has no `<article-back>`).
- **`RQ-DOC-M2`** — `<meta>` in the front carries `data-document-type="article"`;
  the document title is an `<article-title>` and the subtitle an
  `<article-subtitle>`, both inside `<meta>`.
- **`RQ-DOC-M3`** — sections render as `<section>` / `<sub-section>` /
  `<sub-sub-section>` (by depth), each with its title as a first-child
  `<section-title>` / `<sub-section-title>` / `<sub-sub-section-title>`.

**Stylesheet predicates:**

- **`RQ-DOC-S1`** — `article-front` carries a bottom separation rule
  (`border-bottom`) and `article-back` a top separation rule (`border-top`), so
  the three regions are visually demarcated.
- **`RQ-DOC-S2`** — `article-title` renders `display: block`, sans-serif, at the
  largest heading size (`--enscribe-h1-size`), `font-weight: 700`; `article-subtitle`
  renders block, sans, at `--enscribe-h2-size`, lighter weight, in the secondary
  text colour.
- **`RQ-DOC-S3`** — section titles render `display: block`, sans, `font-weight:
  700`, at descending sizes (`section-title` = `--enscribe-h2-size`,
  `sub-section-title` = `--enscribe-h3-size`, `sub-sub-section-title` =
  `--enscribe-h4-size`), forming a visible hierarchy.
- **`RQ-DOC-S4`** — `<meta data-document-type>` is `display: contents`, so its
  children flow as direct descendants of `<article-front>` for layout.

**Out of spec.** Render-mode lowering of titles to `<h1>`/`<h2>` (§0.2);
visual treatment keyed on `data-sec-type` (theme territory); depth-4+ headings
(`<h4>`/`<h5>`/`<h6>` pass-through), which carry no enscribe-specific
rendering.

---

## 4. Author and meta blocks — `RQ-META`

**What it is.** `<meta>` is the descriptive-metadata container. It holds the
title/subtitle (promoted to `<article-title>`/`<article-subtitle>`, §3), one or
more `<author>` elements, and secondary fields (`affiliation`, `email`,
`orcid`, `date`, `keywords`, …).

**Intended rendering.** Authors render as a byline — a run of names below the
title block. The `<meta>` container itself is invisible (it only groups).

**Markup predicates:**

- **`RQ-META-M1`** — each author renders as an `<author>` element; multiple
  authors are sibling `<author>` elements inside `<meta>`.
- **`RQ-META-M2`** — a per-author `+corresponding` flag normalises to a bare
  boolean `corresponding` attribute on the `<author>` element
  (`<author corresponding>`), the idiomatic HTML boolean-attribute form.

**Stylesheet predicates:**

- **`RQ-META-S1`** — `<author>` renders `display: inline`, sans, in the
  secondary text colour; consecutive authors are separated by a comma-space via
  `author + author::before { content: ", " }`, producing a comma-separated
  byline.

**Out of spec — deferred presentation.** The pipeline emits the secondary meta
fields (`affiliation`, `email`, `orcid`, `date`, `publication-date`, `doi`,
`license`, `keywords`, `subject`, `version`, `editor`) as their Layer 1
elements, but the default theme provides **no dedicated rule** for them and no
link behaviour (an `<email>` is not rendered as a `mailto:` anchor; a `<doi>` or
`<orcid>` is not rendered as a hyperlink). Under `meta { display: contents }`
they flow inline alongside the byline. Dedicated presentation of these fields —
a structured author block with affiliations, linked identifiers — is theme and
future work. This boundary is deliberate: it is named here so a fixture that
includes a realistic author block does not silently imply these fields are
styled.

### 4.3 No-output apparatus

**`RQ-META-M3`** — `<meta>`, `<config>`, and `<data>`/`<library>` produce no
rendered body output. `<meta>` is `display: contents` (its styled children show;
the container does not); `<config>`, `<data>`, and `<library>` are suppressed by
the handler (render to `null`).

---

## 5. Reserved

*(Section number reserved to keep §6 = block prose, §7 = inline prose aligned
with the coverage map; no content.)*

---

## 6. Block prose — `RQ-BLK`

**What it is.** Paragraph-level prose: paragraphs, block quotations, lists,
thematic breaks.

**Markup predicates:**

- **`RQ-BLK-M1`** — paragraphs render `<p>`; block quotations `<blockquote>`
  (the `<quote>` shorthand expands to it); ordered/unordered lists
  `<ol>`/`<ul>` with `<li>` children; thematic breaks `<hr>`. `data-*`
  attributes (`data-list-type`, `data-blockquote-type`, `data-hr-type`) are
  preserved.

**Stylesheet predicates:**

- **`RQ-BLK-S1`** — `blockquote` renders visually distinct from body prose: a
  left border (`border-left`), italic body, secondary text colour, and
  horizontal inset.
- **`RQ-BLK-S2`** — paragraphs carry inter-paragraph spacing (`margin-bottom`);
  lists carry left indentation (`padding-left`).

### 6.2 Generic-implicit block elements

**`RQ-BLK-M2`** — `details`, `summary`, `dl`, `dt`, `dd` pass through
as the same HTML-native tags, with `data-*` attributes preserved. They render
via browser defaults; the spec verifies pass-through, not appearance. (`aside`
is **no longer** generic-implicit: it gained the frameable surface in #31 and is
a specified boxed-prose frameable — see §8.)

### 6.3 Out of spec — deferred presentation

List-marker variants keyed on `ol[data-list-type]` and dedicated styling for
`glossary`/`glossary-entry`/`abstract` sectioning are theme territory: the
markup carries the attributes/classes for a theme to target, and the default
theme does not target them. (Callout styling keyed on `aside[data-aside-type]`
is **no longer** deferred — the default theme now ships per-type callout styling
for the admonition types; see §8, `RQ-FRM-S7`.)

---

## 7. Inline prose — `RQ-INL`

**Markup predicates:**

- **`RQ-INL-M1`** — emphasis renders `<em>`, strong importance `<strong>`. The
  HTML-native inline set passes through unchanged.

**Stylesheet predicates:**

- **`RQ-INL-S1`** — `strong` renders `font-weight: 700`; `em` renders
  `font-style: italic`.

### 7.2 Generic-implicit inline elements

**`RQ-INL-M2`** — `b`, `i`, `u`, `s`, `sub`, `sup`, `span`, `q`, `abbr`, `kbd`,
`var`, `samp`, `output`, and inline `code` pass through as HTML-native tags. The
browser default rendering is correct for these (italic `<var>`, monospace
`<kbd>`/`<samp>`, quotation marks for `<q>`); `data-*` attributes are preserved.
`code` additionally receives dedicated monospace/background styling (§ shared
with code blocks).

### 7.3 Out of spec — deferred presentation

`<term>` is intended to render with emphasis (the vocabulary notes it "typically
italicizes"), but the default theme provides no `term` rule; it renders inline
unstyled. Dedicated `term` styling is a candidate theme rule.

---

## 8. Frameables — `RQ-FRM`

**What it is.** The frameable family interrupts the text flow and may carry an
optional title (rendered above), an optional caption (rendered below), an
optional outline box, and a number folded into the caption (`Figure N.`,
`Table N.`). Members: `fig` (→ `<figure>`), `table`/`csv`/`tsv` (→ `<table>`),
`svg` (→ `<svg>`), `frame` (→ `<figure>`, the shared frameable wrapper), `aside`
(→ `<aside>`, the boxed-prose member with its own `Box` counter and callout
styling), and the external DSLs (§9, which share the figure counter).

**Expected markup (figure):**

```html
<figure>
  <img src="…" alt="…">
  <figcaption><span class="figure-label">Figure 3.</span> caption text</figcaption>
</figure>
```

**Expected markup (table):**

```html
<table>
  <caption><span class="table-label">Table 2.</span> caption text</caption>
  <thead><tr><th>…</th></tr></thead>
  <tbody><tr><td>…</td></tr></tbody>
</table>
```

**Markup predicates:**

- **`RQ-FRM-M1`** — a figure renders `<figure>` wrapping an optional
  `<img src alt>` (when `src` is given) and a `<figcaption>`. When numbered, the
  caption begins with `<span class="figure-label">Figure N.</span>` followed by
  a space, then the caption text. A `name`/title adds a separate
  `<figcaption class="title">` above the body.
- **`RQ-FRM-M2`** — a table renders `<table>` with a `<caption>`; when numbered
  the caption begins `<span class="table-label">Table N.</span>`. Headers render
  `<thead><tr><th>`, body rows `<tbody><tr><td>`. A `csv`/`tsv` block renders a
  real `<table>` — the `<csv>`/`<tsv>` element does not appear in output.
- **`RQ-FRM-M3`** — an `svg` renders an inline HTML-native `<svg>` with source
  preserved. Bare (no caption/title/number) it emits the `<svg>` alone; when
  captioned/numbered the `<svg>` is wrapped in a `<figure>` whose `<figcaption>`
  carries the `figure-label` (`<figcaption>` is not a valid child of `<svg>`, so
  the caption rides on the wrapper).
- **`RQ-FRM-M4`** — a `frame` renders `<figure class="frameable-border">` — a
  bordered callout reusing the shared frameable `<figure>` wrapper, not the
  deprecated HTML `<frame>` frameset element. A title renders as a leading
  `<figcaption class="title">`; a caption renders `<figcaption>`.
- **`RQ-FRM-M5`** — the `+border` flag adds the `frameable-border` class to the
  frameable's wrapper element; figures and tables share one figure/table counter
  respectively with the DSLs and `svg`.
- **`RQ-FRM-M6`** (title/caption ordering) — when present, the **title** is the
  **first child** of the wrapper (rendered above the body) and carries the class
  `title`: `<figcaption class="title">` (figure family), `<caption class="title">`
  (table family), or `<p class="title">` (boxed prose / `aside`). The **caption**
  is the **last child** (after the body) for the figure and boxed-prose families;
  for `<table>` the `<caption>` is emitted as the table's first child (HTML
  requires `<caption>` to precede the rows) and `caption-side: top` keeps it
  visually at the top. The bottom caption is a bare `<figcaption>` / `<caption>`
  for the figure/table families, and a `<p class="caption">` for boxed prose.
- **`RQ-FRM-M7`** (label-only caption) — when a frameable is numbered but has no
  caption text, the caption element renders the label span **alone** —
  `<figcaption><span class="figure-label">Figure N.</span></figcaption>` — never
  an empty or absent caption. When the frameable is neither numbered nor
  captioned, no caption element is emitted at all.
- **`RQ-FRM-M8`** (alt-text fallback) — for a figure with `src`, the `<img>`'s
  `alt` is filled from a fallback chain: the explicit `alt=` kwarg if given, else
  the caption's plain text, else the pipe/body content's plain text. (The
  `<img>` always carries an `alt` attribute.)
- **`RQ-FRM-M9`** (bare-vs-wrapped, generalized) — a frameable adds its wrapper
  only when it carries something to frame. **`fig` and `frame` always wrap** in
  `<figure>` (the figure / bordered box is the construct itself). **`table` /
  `csv` / `tsv` always render** as `<table>`. **`svg`, `mermaid`, `abc` wrap only
  when captioned, titled, or numbered** — bare, they emit the lone `<svg>` /
  pass-through contract. Because `svg` / `mermaid` / `abc` are **numbered by
  default** (they share the figure counter), a bare `<svg>` / `<mermaid>` /
  `<abc>` *is* numbered and therefore frames; `-numbered` (with no caption or
  title) is what yields the truly lone form. (`frame` is unnumbered by default
  but always wraps, because its border/box — not a number — is the point.)
- **`RQ-FRM-M10`** (aside / boxed prose) — an `<aside>` keeps the semantic
  `<aside>` element (it is **not** wrapped in `<figure>`, since `<figcaption>` is
  invalid outside `<figure>`); its title renders `<p class="title">` (first
  child) and its caption `<p class="caption">` (last child), using the same
  `.title`/`.caption` hooks (`RQ-FRM-S5`/`S6`). `+border` (default **on** for
  `<aside>`) adds `frameable-border`. A numbered `<aside>` joins its **own** `Box`
  counter (`<span class="box-label">Box N.</span>`), not the figure counter, and
  is unnumbered by default. The `type` kwarg is preserved as `data-aside-type`.

**Stylesheet predicates:**

- **`RQ-FRM-S1`** — `.figure-label` and `.table-label` render `font-weight: 700`
  (the number/label is prominent within the caption).
- **`RQ-FRM-S2`** — `figure` renders `display: block`, centred, with vertical
  margin; `figcaption` and `caption` render at small size, secondary colour,
  left-aligned (caption text reads as caption, not body).
- **`RQ-FRM-S3`** — `table` renders `border-collapse`, full content width;
  `th`/`td` are bordered; `th` is header-styled (subtle background, sans,
  uppercase, accent colour); `thead th` carries a heavier bottom border.
- **`RQ-FRM-S4`** — the `frameable-border` class renders a visible outline box
  around the frameable (a `border` on `.frameable-border`), setting the bordered
  callout off from the body text around it.
- **`RQ-FRM-S5`** — `.title` (the shared title hook for `<figcaption class="title">`
  / `<caption class="title">` / `<p class="title">`) renders **visually distinct
  from the bottom caption**: `font-weight: 700`, body-size (`--enscribe-text-base`),
  primary text colour, with bottom margin separating it from the body. Without
  this the title would inherit the small/secondary caption look (`RQ-FRM-S2`) and
  be indistinguishable from the caption — so the spec's "title top, caption
  bottom, visually distinct" promise depends on this `S` predicate.
- **`RQ-FRM-S6`** — `.caption` (the boxed-prose bottom caption, `<p class="caption">`)
  renders at the same small size and secondary colour as `figcaption`/`caption`,
  so the `aside`-family caption reads as a caption rather than as body prose.
- **`RQ-FRM-S7`** (callouts) — the default theme styles the admonition `aside`
  types: `aside[data-aside-type="note"|"info"|"tip"|"warning"|"caution"]` each
  render a per-type accent (a `border-left-color` from an `--enscribe-callout-*`
  custom property), a light background tint, and a type icon via `::before`
  (CSS-only — no markup is injected). The generic `sidebar` / `callout` types
  receive no admonition styling (the plain box only). Each variant is signalled
  by three cues — accent, icon, and the title — so colour is never the sole
  distinguisher.

**Out of spec.** Visual application of `figure[data-align]` (left/right float)
and `figure[data-width]` is theme territory — the markup carries the attributes;
the default theme does not float or size. Raw-mode and parse-error table classes
(`table-parse-error`) are error affordances, not part of the well-rendered
contract.

---

## 9. External DSLs — `RQ-DSL`

**What it is.** `<mermaid>` and `<abc>` are *external* DSLs (`DESIGN.md`,
included-vs-external distinction): enscribe never parses the DSL's semantics
into the core. The handler always emits the pass-through **markup contract** — a
wrapper preserving the source verbatim, carrying `class` and
`data-enscribe-dsl`. How that contract reaches a rendered diagram or notation is
a per-DSL **mode** the publisher selects (`DESIGN.md`, registry-based
external-DSL modes); the default is **skip**:

- **skip** (default) — emit only the contract; the publisher wires rendering.
- **live** — also emit the external library (inlined, or `<script src>` to the
  pinned CDN) plus an init call, so the browser renders the contract markup at
  view time.
- **static** (abc only) — invoke the external library at build time and inline
  the resulting SVG; no client library is shipped.

Predicate IDs are **mode-aware**: `RQ-DSL-<MODE>-<KIND><N>`, MODE ∈ {`SKIP`,
`LIVE`, `STATIC`}, KIND ∈ {`M` markup, `S` stylesheet, `O` observable}. The
mode-independent contract predicates keep the bare `RQ-DSL-M<N>` form. The
inline-vs-CDN split inside live mode is one observable contract (library present
+ init + markup preserved; only the asset *source* differs), so it lives inside
the `RQ-DSL-LIVE-*` prose rather than in a separate MODE token.

**Expected markup (the contract, mode-independent):**

```html
<pre class="mermaid" data-enscribe-dsl="mermaid">graph LR
  A --> B</pre>

<pre class="abc" data-enscribe-dsl="abc">X:1
T:Tune
…</pre>
```

**Contract predicates (mode-independent):**

- **`RQ-DSL-M1`** — a `mermaid` block renders `<pre class="mermaid"
  data-enscribe-dsl="mermaid">` with the Mermaid source preserved verbatim as
  text content.
- **`RQ-DSL-M2`** — an `abc` block renders `<pre class="abc"
  data-enscribe-dsl="abc">` with the ABC source preserved verbatim. The wrapper
  is `<pre>` (matching Mermaid): the HTML formatter leaves `<pre>` content
  untouched, so the line-oriented ABC source survives serialization without
  reflow or indentation.
- **`RQ-DSL-M3`** — both share the figure counter; when captioned/numbered, a
  sibling `<figcaption>` carries the `figure-label` (`Figure N.`).

**Skip-mode predicate (the default):**

- **`RQ-DSL-SKIP-M1`** — in skip mode the rendered HTML is the contract markup
  only: no library asset nodes, no init call, no inline SVG.

**Live-mode predicates:**

- **`RQ-DSL-LIVE-M1`** — a present DSL conditionally gets its library — an inline
  `<script>` carrying the bundled source, **or** a `<script src>` to the pinned
  CDN — plus an init call. An absent DSL gets nothing; a mermaid-only document
  gets only mermaid assets (assets are gated on DSL presence).
- **`RQ-DSL-LIVE-M2`** — the contract markup (per `RQ-DSL-M1`/`M2`) is preserved
  unchanged alongside the emitted assets.
- **`RQ-DSL-LIVE-O1`** *(observable, visual-only)* — opened in a browser with
  library access, the sources render to SVG (diagram, notation).

**Static-mode predicates (abc only):**

Static mode is **realized for `abc`**: abc renders headlessly at build time
(abcjs under a jsdom shim — synchronous, so it runs inside the synchronous
compiler), so the view-time page needs no abcjs bundle. mermaid is permanently
live-only (its only browserless render path needs a headless browser);
requesting `static` for mermaid raises the fail-explicitly build error below.

- **`RQ-DSL-STATIC-M1`** — in abc-static mode each `abc` contract element is
  **replaced** (not wrapped) by an inline `<svg class="enscribe-abc-rendered">`
  of the rendered notation: no `<pre class="abc">` / `data-enscribe-dsl="abc"`
  wrapper survives, and no client-side abcjs library or init `<script>` is
  emitted (the render already happened at build time).
- **`RQ-DSL-STATIC-M2`** — an `id` on the `abc` element is carried onto the
  rendered `<svg>` (so cross-references to the block still resolve); an anonymous
  block's `<svg>` carries no id.
- **`RQ-DSL-STATIC-O1`** *(observable, visual-only)* — opened in a browser,
  including offline with JavaScript disabled, the `<svg>` shows the rendered
  notation (it is in the markup, not produced by a script at view time).
- **No `RQ-DSL-STATIC-*` predicate exists for `mermaid`** — mermaid is live-only
  (its only browserless render path needs a headless browser). Asking for static
  mermaid is a **build error**, not a silent skip: the interpreter throws when a
  `static` mode is requested for a DSL with no static renderer, and only when
  that DSL is actually present in the document (the fail-explicitly guard).

**Stylesheet predicates:**

- **`RQ-DSL-S1`** — the `<pre>` carrying Mermaid source is styled as a code
  block (so an un-rendered diagram degrades to readable source, not invisible
  text) — graceful degradation in skip mode and in live mode before the library
  runs. No dedicated rule for `.abc`/`.mermaid` *rendered* output is required of
  the default theme.

**Out of spec.** Rendered diagram/notation fidelity — that is the external
library's job, not enscribe's. Skip (the default) emits only the contract; live
and static are opt-in and emit assets / inline SVG per the `RQ-DSL-LIVE-*` /
`RQ-DSL-STATIC-*` predicates above (`DESIGN.md`, registry-based external-DSL
modes). In skip mode a consumer wires Mermaid (scans `class="mermaid"`) and
abcjs (keys on `data-enscribe-dsl="abc"`) themselves.

---

## 10. Math — `RQ-MATH`

**What it is.** Math is KaTeX-rendered. Inline math (`<$ … $>` / bare `$x$`)
renders in inline mode; display math (`<$$ … $$>` / bare `$$x$$`) and the
environment tags (`align`, `cases`, `matrix`, `eqnarray`) render in display
mode.

**Expected markup:**

```html
<inline-math><span class="katex">…</span></inline-math>

<display-math>
  <span class="katex-display">…</span>
  <span class="equation-number">(7)</span>   <!-- only when numbered -->
</display-math>
```

**Markup predicates:**

- **`RQ-MATH-M1`** — inline math renders `<inline-math>` wrapping KaTeX HTML
  (`<span class="katex">…`); it is never numbered.
- **`RQ-MATH-M2`** — display math renders `<display-math>` wrapping
  `<span class="katex-display">…`; when numbered, a sibling
  `<span class="equation-number">(N)</span>` is appended (parenthesised number,
  no period). Numbering is conditional on the document/element numbering config.
- **`RQ-MATH-M3`** — the environment tags render their own wrapper element
  (`<align>`, `<cases>`, `<matrix>`, `<eqnarray>`, `<math>`) around the
  KaTeX-rendered block.
- **`RQ-MATH-M4`** — rendered output contains KaTeX HTML (a `.katex` /
  `.katex-display` span), not raw TeX source. (`throwOnError: false` means even
  invalid TeX renders to a visible KaTeX error node, never raw source.)

**Stylesheet predicates:**

- **`RQ-MATH-S1`** — `display-math` renders `display: flex` with vertical
  margin; `display-math > .katex-display` grows to fill (`flex: 1`); `display-math
  > .equation-number` renders flush-right (does not grow), sans, small,
  secondary colour.
- **`RQ-MATH-S2`** — `inline-math` renders `display: inline`.
- **`RQ-MATH-S3`** — the environment wrappers (`math`, `align`, `cases`,
  `matrix`, `eqnarray`) render as display blocks with vertical margin, and an
  `.equation-number` contained in any of them is presented consistently with the
  `display-math` case (flush-right). *(The default theme's equation-number rule
  is currently scoped to `display-math >` only; consistency across the
  environment wrappers is the intended standard.)*

**Out of spec.** Equation cross-reference text is specified in §12. Per-line
numbering within an `align` environment (one number per row) is not specified;
the environment renders as a single numbered/unnumbered block.

---

## 11. Theorem family — `RQ-THM`

**What it is.** The amsthm-style statement family: `theorem`, `lemma`,
`corollary`, `proposition` (one shared counter), `definition` and `example`
(each its own counter), `remark` and `proof` (unnumbered by default). Each
renders as a labelled, set-off block.

**Intended rendering.** A theorem reads as a distinct block, set off from the
surrounding prose, opening with a prominent run-in label — `Theorem 1.`,
`Lemma 2 (Pythagoras).`, `Proof.` — followed by the statement body. This is the
conventional theorem-environment look from mathematical typesetting.

**Expected markup:**

```html
<theorem><span class="theorem-label">Theorem 1.</span> statement body…</theorem>
<lemma><span class="lemma-label">Lemma 2 (Pythagoras).</span> …</lemma>
<proof><span class="proof-label">Proof.</span> …</proof>
```

**Markup predicates:**

- **`RQ-THM-M1`** — each statement renders as its own element (`<theorem>`,
  `<lemma>`, `<corollary>`, `<proposition>`, `<definition>`, `<example>`,
  `<remark>`, `<proof>`), whose first child is a `<span class="{kind}-label">`
  (e.g. `theorem-label`, `proof-label`), followed by a space, then the body.
- **`RQ-THM-M2`** — the label text is `Kind N.` when numbered, `Kind N (Name).`
  when a `name` kwarg is present, and `Kind.` when unnumbered (the default for
  `remark`/`proof`). The propositional family shares one counter;
  `definition`/`example` each have their own; `remark`/`proof` are unnumbered
  unless `+numbered`.

**Stylesheet predicates:**

- **`RQ-THM-S1`** — each theorem-family element renders `display: block` with
  vertical margin, so the statement is set off from body prose rather than
  flowing inline.
- **`RQ-THM-S2`** — each `.{kind}-label` span renders with prominence
  (`font-weight: 700`), visually distinguishing the run-in label from the
  statement body.

**Out of spec.** Per-kind theming (coloured rules, background tints); the QED
mark beyond the literal symbol an author writes in the proof body; italicised
statement bodies (an amsthm convention the default theme may adopt but is not
required to).

---

## 12. Cross-references and citations — `RQ-XREF`

**What it is.** `<ref @id>` resolves to a clickable link to a numbered element;
`<cite @key>` resolves to a citation marker tied to the bibliography.

**Expected markup:**

```html
<a href="#fig:priority" class="ref">figure 3</a>
<a href="#eqn:bogus" class="ref-error">??ref: eqn:bogus??</a>
<cite class="cite" data-keys="Smith2020">(Smith 2020)</cite>
<cite class="cite-error" data-keys="bogus">??cite: bogus??</cite>
```

**Markup predicates:**

- **`RQ-XREF-M1`** — a resolved ref renders `<a href="#id" class="ref">TEXT</a>`.
  The `-link` flag renders `<span class="ref">TEXT</span>` instead (no anchor).
- **`RQ-XREF-M2`** — resolved ref text is `{prefix-word} {number}` for a known
  id prefix (`figure 3`, `equation 1`, `table 2`, `section 2.1`, `theorem 4`,
  `listing 1` for code), the bare number for an unknown prefix, and the id's
  label-tail for an unnumbered target. The prefix word is config-overridable per
  document (`ref-prefix-eqn=Eq.` yields `Eq. 3`). In a book the number is
  chapter-prefixed (§15).
- **`RQ-XREF-M3`** — an unresolved ref renders
  `<a href="#id" class="ref-error">??ref: id??</a>` — visible in output, so
  authors see broken references immediately.
- **`RQ-XREF-M4`** — a resolved citation renders `<cite class="cite"
  data-keys="…">` wrapping the CSL-formatted marker; an unresolved citation
  renders `<cite class="cite-error" data-keys="…">??cite: key??</cite>`.

**Stylesheet predicates:**

- **`RQ-XREF-S1`** — `a.ref` renders as a link (link colour, no wavy underline);
  `a.ref-error` renders in the error colour with a wavy underline and
  `cursor: help`.
- **`RQ-XREF-S2`** — `cite.cite` renders `cursor: pointer` (signalling the
  hover-preview affordance); `cite.cite-error` renders in the error colour.

**Out of spec.** Sentence-position capitalisation of the ref prefix word (the
resolver emits the configured word verbatim — "figure 3", not "Figure 3" at a
sentence start); author-supplied custom ref link text; per-`format`/`type`
variation of the resolved text.

---

## 13. Footnotes — `RQ-NOTE`

**What it is.** `<note>` produces an in-text marker and a collected entry in a
note list. Notes are collected per *note-scope* — by section in an article, by
chapter in a book (configurable).

**Expected markup:**

```html
…text<sup id="noteref-1" data-note-id="note-1"><a href="#note-1">1</a></sup>…

<note-list class="endnotes">
  <ol>
    <li id="note-1"><sup>1</sup> note body
      <a href="#noteref-1" class="note-backref" aria-label="back to text">↩</a></li>
  </ol>
</note-list>
```

**Markup predicates:**

- **`RQ-NOTE-M1`** — an in-text note renders
  `<sup id="noteref-N" data-note-id="note-N"><a href="#note-N">N</a></sup>`.
- **`RQ-NOTE-M2`** — collected notes render a `<note-list>` containing an `<ol>`,
  placed in the back-matter region. The `note-list` class reflects placement:
  `endnotes` (default), `footnotes` (placement `foot`), or `notes` (mixed
  placements in one document).
- **`RQ-NOTE-M3`** — each note renders `<li id="note-N">` containing a `<sup>N</sup>`
  marker, the note body, and a backref `<a href="#noteref-N" class="note-backref"
  aria-label="back to text">↩</a>`. A `placement=side` note adds the
  `sidenote-fallback` class to its `<li>`.

**Stylesheet predicates:**

- **`RQ-NOTE-S1`** — `note-list` renders `display: block`, small/secondary, set
  off above by a top border; its "Notes" heading is supplied by
  `note-list::before { content: "Notes" }` (no heading element is emitted); its
  `<ol>` renders `list-style: none` (visible numbering comes from the `<sup>`);
  `note-list li` renders a hanging indent.
- **`RQ-NOTE-S2`** — `sup[data-note-id]` renders a small sans superscript in the
  link colour with `cursor: pointer`; `.note-backref` renders muted.

**Out of spec.** True per-section placement of `foot` notes at the bottom of
each section (current behaviour aggregates into one back-matter list);
margin-positioned sidenotes (the `sidenote-fallback` class marks them for a
future margin theme).

---

## 14. Bibliography — `RQ-BIB`

**What it is.** When a document resolves citations, a bibliography is rendered
into the back-matter region.

**Expected markup:**

```html
<bibliography>
  <h2>References</h2>
  <div class="csl-bib-body">
    <div id="ref-Smith2020" data-csl-entry-id="Smith2020" class="csl-entry">Smith, J. (2020)…</div>
  </div>
</bibliography>
```

**Markup predicates:**

- **`RQ-BIB-M1`** — the bibliography renders a `<bibliography>` element in the
  back-matter region (`<article-back>` for an article, `<book-back>` for a
  book), containing a heading and a `<div class="csl-bib-body">` of
  `<div class="csl-entry">` entries.
- **`RQ-BIB-M2`** — the bibliography heading **is** an emitted element —
  `<h2>References</h2>` (in contrast to the note-list heading, which is a CSS
  pseudo-element).
- **`RQ-BIB-M3`** — each entry div carries both `data-csl-entry-id="KEY"` and an
  injected `id="ref-KEY"` (the hover-preview lookup target).
- **`RQ-BIB-M4`** — when no citations resolve, no bibliography is emitted, and an
  author-placed `<bibliography>` tag is removed.

**Stylesheet predicates:**

- **`RQ-BIB-S1`** — `bibliography h2` renders sans, at `--enscribe-h3-size`,
  `font-weight: 700`; `.csl-bib-body` renders at small size; `.csl-entry`
  renders with a hanging indent and inter-entry spacing.

**Out of spec.** Per-chapter (chapter-scoped) bibliographies in books (a book
gets one document-wide bibliography; per-chapter is deferred); CSL-driven
multi-key citation ordering nuances.

---

## 15. Book documents — `RQ-BOOK`

**What it is.** A `<meta type=book>` document is wrapped into the Layer 1 book
skeleton, with book-parts (chapters, parts, appendices, …) routed into front /
body / back by type. Books differ from articles in four rendering-relevant ways:
chapter-title prominence, per-chapter counter resets, chapter-prefixed
cross-references, and edited-volume (per-chapter) authorship.

**Expected markup:**

```html
<book>
  <book-front>
    <meta data-document-type="book"><book-title>…</book-title><author>…</author></meta>
    <book-part book-part-type="preface"><meta><book-part-title>…</book-part-title></meta>…</book-part>
  </book-front>
  <book-body>
    <book-part book-part-type="chapter">
      <meta><book-part-title>…</book-part-title><author>…</author></meta>
      …chapter content…
    </book-part>
  </book-body>
  <book-back>
    <book-part book-part-type="appendix">…</book-part>
    <bibliography>…</bibliography>
  </book-back>
</book>
```

**Markup predicates:**

- **`RQ-BOOK-M1`** — a book renders `<book>` wrapping `<book-front>` /
  `<book-body>` / `<book-back>`; each division renders `<book-part
  book-part-type="…">`, routed by type (chapter/part/introduction/conclusion →
  body; preface/foreword/dedication → front; appendix/glossary/colophon → back).
- **`RQ-BOOK-M2`** — the book title renders `<book-title>`; each book-part's
  title renders `<book-part-title>` inside a synthesised per-part `<meta>`.
- **`RQ-BOOK-M3`** (edited-volume authorship) — an `<author>` at the top of a
  book-part is absorbed into that book-part's synthesised `<meta>`, distinct
  from the book-level author — so a chapter can carry its own author.
- **`RQ-BOOK-M4`** (scoped numbering) — with the book default
  `counter-reset-scope=chapter`, figures/tables/equations/theorems renumber per
  chapter, and a resolved cross-reference renders chapter-prefixed:
  `figure 1.3` (chapter.figure) or `figure 1.2.3` (chapter.section.figure). The
  caption label on the target carries the *same* chapter-prefixed number as the
  cross-reference resolving to it — a caption reading `Figure 1.3.` is referred
  to as `figure 1.3`, never as a bare `Figure 3.` — so captions and references
  agree. This agreement is output-target-independent: it holds both in the HTML
  rendering (the caption/label and the `<a class="ref">` cross-reference both
  carry the chapter-prefixed number) and in the JATS export (the `<label>` on
  the `<fig>` / `<table-wrap>` / `<disp-formula>` / `<statement>` and the
  `<xref>` resolving to it both carry it). In no output target does a target's
  label show a bare `Figure 3.` while a reference to it shows `figure 1.3`.
- **`RQ-BOOK-M5`** (note scope) — with the book default `note-scope=chapter`,
  footnotes are collected per chapter rather than once for the whole document.
- **`RQ-BOOK-M6`** (bibliography) — a book gets a single document-wide
  bibliography at the end of `<book-back>`.

**Chapter-navigation readiness.** A single-chapter-at-a-time navigation view (a
release display goal, `ROADMAP.md` display phase) needs a stable, machine-findable
per-chapter boundary to page through. `RQ-BOOK-M1` and `RQ-BOOK-M2` provide
exactly that: each chapter is a `<book-part book-part-type="chapter">` with its
title in a predictable `<meta><book-part-title>`. This spec asserts the
*structural hooks* exist; the navigation UI that consumes them is display-phase
work and is out of scope here.

**Stylesheet predicates:**

- **`RQ-BOOK-S1`** — the book structural containers and titles render with
  book-appropriate prominence: `book-title` as the most prominent heading on the
  page (block, at least `--enscribe-h1-size`), `book-part-title` as a chapter-level
  heading (block, prominent, clearly above section-title scale), and
  `book-front`/`book-body`/`book-back` as block regions. *(The default theme's
  article rules do not currently extend to the book elements; book-appropriate
  styling is the intended standard.)*

**Out of spec.** Render-mode lowering of `book-title`→`<h1>`,
`book-part`→`<section class="chapter">` (§0.2); running heads, page numbers,
and other print-book apparatus (no print stylesheet); the navigation UI itself.

---

## 16. Conformance

A rendered document is conformant when every applicable `M` predicate holds
against its rendered HTML and every applicable `S` predicate holds against the
bundled `default.css`. The demonstrative fixtures exercise the predicates
against believable documents; their structural output is pinned by snapshot, so
a regression in any `M` predicate surfaces as a snapshot diff. `S`-predicate
conformance is checked against `default.css` directly.

Gaps between this standard and current output are tracked as render-quality bugs
in GitHub Issues, each referencing the predicate id it fails. This document is
the target; the Issues track the distance to it.

---

## 17. Cross-references

- `DESIGN.md` — the display ladder (targets 1/2/3), the included-vs-external DSL
  distinction, the frameable capability, the article/book distinction.
- `notes/specs/interpreter.md` — how each element above is emitted: handler
  dispatch (§5), schema dispatch (§6), handler implementations (§7), the
  internal-node render table (§5.2), asset injection (§4.2).
- `notes/specs/pipeline.md` — pipeline ordering: when numbering, ref/cite
  resolution, note placement, and bibliography assembly run.
- `packages/layer1-vocabulary/SPEC.md` and `elements/` — the vocabulary each
  predicate renders.
- `packages/enscribe/src/interpreter/assets/default.css` — the class vocabulary
  the `S` predicates are checked against.
