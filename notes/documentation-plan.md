# Enscribe documentation plan

This document plans the complete documentation set for
Enscribe's v0.1.0 release and beyond. Each section outlines
one document: its purpose, its reader, the assumptions it
makes, and its content structure. The outlines serve as build
targets — comparable to spec predicates or backlog checkboxes.

## Principles

**Write for humans who already know how to write.** Enscribe's
readers know HTML. They know Markdown. Many know LaTeX. They
don't need to be taught what a heading is or why citations
matter. They need to know how Enscribe handles these things
and why they'd choose Enscribe over what they're already using.

**Show, don't explain.** Every concept gets a concrete example
before or alongside its explanation. The example is the
explanation; the prose contextualizes it.

**Respect the reader's time.** Each document has one job. The
Introduction orients. The Quickstart gets you productive. The
Authoring Guide answers "how do I do X." The Vocabulary
Reference answers "what does element Y do." No document tries
to do another document's job.

**The three-layer model is the backbone.** Every feature
discussion shows all three forms where they exist: canonical
named tags, sigil shorthands, and markdown idioms. The reader
learns that these are three ways to say the same thing, not
three different features. This is Enscribe's most distinctive
idea and the documentation should make it intuitive.

**Use Enscribe to write about Enscribe.** Every document is
authored in canonical Enscribe. The documents are themselves
examples of what Enscribe produces. The Quickstart in
particular writes *about* Enscribe *using* Enscribe — every
feature it introduces is exercised in the act of introducing
it.

---

## Document 1: Introduction

### Purpose

Orient a new reader in under five minutes. After reading,
they understand what Enscribe is, what makes it different,
and whether it's worth trying.

### Reader

Someone who has heard of Enscribe (or stumbled onto the site)
and wants to understand what it is. They know HTML and
Markdown. They may know LaTeX or Quarto. They are evaluating
whether Enscribe solves a problem they have.

### Assumptions

- Knows what markup languages are
- Knows Markdown's basic syntax
- Understands the concept of "source → rendered output"
- Does NOT know Enscribe's vocabulary, Layer 1, or the
  three-layer model
- Does NOT need installation instructions here (that's the
  Quickstart)

### Voice

Confident but not salesy. "Here's what this is and why it
exists" rather than "you should use this because." Let the
reader draw their own conclusions from the capabilities.

### Content outline

**1. What Enscribe is** (2-3 sentences)

A structured authoring tool for rich documents. You write in
a shorthand that compiles to semantic HTML. The output is a
self-contained document you can open in any browser.

**2. The three-layer model** (the conceptual anchor)

This is the section that makes Enscribe click. Show the same
content expressed three ways:

- **Canonical named tags.** The explicit form:
  `<section><section-title>Methods</section-title>...</section>`
- **Sigil shorthands.** The terse form:
  `<# Methods #>` or `<## Subsection ##>`
- **Markdown idioms.** The familiar form:
  `## Methods`

All three produce the same Layer 1 output. The reader sees
that Enscribe isn't "another Markdown" — it's a layered
system where Markdown is one input surface.

Then briefly: Layer 1 is the stable vocabulary of custom HTML
elements. It's what Enscribe compiles *to*. It's what renders
in the browser. It's what JATS export reads *from*. The layers
are the architecture; most users write in the top layer
(shorthands + Markdown) and never think about Layer 1 directly.

**3. What you can put in an Enscribe document** (capabilities
survey)

A concise list, each with a one-line example:

- Sections and subsections (with automatic numbering in books)
- Inline and display math (KaTeX)
- Citations and bibliography (structured, CSL-based)
- Footnotes (with hover previews)
- Cross-references (to figures, tables, equations, theorems)
- Figures and images
- Tables (from CSV/TSV data or Markdown)
- Code blocks (syntax-highlighted)
- Theorem family (theorem, lemma, definition, proof, etc.)
- External DSLs (Mermaid diagrams, ABC music notation)
- Blockquotes
- Article and book document forms

Not a tutorial — just "here's the range." Each item links to
the relevant Authoring Guide section for details.

**4. What Enscribe produces**

- Self-contained HTML (email it, open it, no server needed)
- JATS XML (for journal submission and archival)
- The browser library (live rendering in web applications)

**5. Who it's for**

- Academic authors writing papers, theses, technical reports
- Technical writers producing structured documentation
- Anyone who wants richer documents than Markdown provides
  without the weight of LaTeX

**6. Where to go next**

- Quickstart Guide → get productive in 10 minutes
- Authoring Guide → comprehensive reference
- Design Article → how Enscribe works under the hood

### Length target

~800-1200 words. Reads in 3-5 minutes. Not longer.

---

## Document 2: Quickstart Guide

### Purpose

Get a new user from zero to a rendered document in 10-15
minutes. After completing the guide, they've installed
Enscribe, authored a short document exercising the most
important features, and rendered it.

### Reader

Someone who decided to try Enscribe (probably after reading
the Introduction). They know how to use a terminal, install
npm packages, and edit text files. They don't need to be told
what a heading or a footnote is — they need to know Enscribe's
syntax.

### Assumptions

- Has Node.js installed (or knows how to install it)
- Comfortable with a terminal
- Knows HTML + Markdown
- Wants to see results quickly, not read theory
- Will tolerate brief explanations alongside examples but
  loses patience with long digressions

### Voice

Brisk and practical. "Here's how. Here's why. Try it."
Short sentences. Code examples are the primary content;
prose connects them. The guide respects the reader's
competence — it doesn't over-explain things they already
know.

### The self-referential trick

The Quickstart document is *about* Enscribe, written *in*
Enscribe. Every feature it introduces is exercised naturally
in the text itself. The guide doesn't say "here's how to make
a footnote" and then show a disconnected example — it says
something that genuinely needs a footnote, and the footnote
is the example.

This means the content has to be real. The citations reference
real things (the HTML spec, the Markdown spec, the JATS
standard). The table presents real data (a comparison of
authoring forms). The formula is a real formula (not
`E=mc^2` for the hundredth time). The figure is a real figure
(a pipeline diagram or similar).

### Content outline

**1. Installation** (brief)

```
npm install -g @enscribejs/interpreter
```

Or the local-install variant. Confirm the install works:

```
enscribe --version
```

(Note: the CLI may not exist yet in v0.1.0. If not, show the
Node API usage instead: `node -e "import {...} from
'@enscribejs/interpreter'"`. Adjust based on what's actually
shipped.)

**2. Your first document**

Create a file `quickstart.emd`. Start with the document
config:

```
<meta type=article>
<title>Getting Started with Enscribe</title>
<author>Your Name</author>
```

Add a paragraph of prose. Render the document (however
rendering works in v0.1.0 — CLI command, Node script, or the
browser library). Open the result. You have a rendered
article.

**3. Structure: sections and subsections**

Add sections. Show all three forms briefly:

- `<# Section Title #>` (sigil — recommended for quick
  authoring)
- `<section><section-title>Section Title</section-title>
  ...</section>` (canonical — explicit, verbose)
- `## Section Title` (Markdown — familiar, works too)

The guide itself uses sigil form for its own headings,
demonstrating it naturally.

**4. Inline formatting**

Bold, italic, inline code, inline math. Brief — these work
like Markdown. The one new thing: inline math uses `$...$`
(LaTeX convention), and Enscribe renders it via KaTeX.

Show a real formula in context. Not `E=mc^2`. Something the
text actually needs — maybe a complexity bound when
discussing Enscribe's parser, or a statistical formula when
describing a dataset in the table below.

**5. Display math**

The `$$...$$` fence for display equations. Show one.

**6. A table from CSV data**

Introduce CSV tables with `<table csv>`. The table should
present real data the guide needs — perhaps a comparison of
the three authoring layers:

| Layer | Example | When to use |
|---|---|---|
| Canonical | `<section>` | When you need explicit structure |
| Sigil | `<#>` | Quick authoring, most of the time |
| Markdown | `##` | If you're coming from Markdown |

The CSV form is the Enscribe-native way to express this.
Show the source alongside the rendered result.

**7. Figures and images**

Add a figure. The figure should be real — a diagram of the
Enscribe pipeline, or a screenshot, or a conceptual
illustration. Show the `<figure>` tag with a caption.

**8. Footnotes**

Add a footnote naturally. When the guide mentions something
that deserves an aside (a historical note about Markdown's
origin, a clarification about JATS, a caveat about browser
support), make it a footnote. Show the `<note>` tag.

The footnote should demonstrate hover-preview behavior:
"hover over the footnote marker to see its content without
scrolling."

**9. Citations and bibliography**

This is where the guide gets genuinely useful as a
demonstration. Add a `<library>` with 2-3 real references:

- The HTML Living Standard (WHATWG)
- The original Markdown description (John Gruber, 2004)
- The JATS standard (NISO Z39.96)

Cite each naturally in the text when referencing them. The
rendered output shows numbered citations with a bibliography
at the bottom.

Show the `<cite>` tag and the `<library>` block with
structured `<ref>` entries.

**10. Cross-references**

Reference the table from step 6 ("as shown in Table 1") and
the figure from step 7 ("see Figure 1"). Show the `<ref>`
tag. The rendered output shows clickable references that
resolve to the correct targets.

**11. A theorem (or definition)**

If the guide's content supports it, add a definition or
theorem. Maybe a formal definition of "Layer 1" as an
Enscribe `<definition>` block. This demonstrates the
theorem family without forcing a mathematical context.

**12. Code blocks**

Show a code block with syntax highlighting. The content
should be real — a snippet of Enscribe source, or a snippet
of the rendered HTML, or a snippet of the JATS output.

**13. What you've built**

Brief recap: you've authored a document with sections, math,
a table, a figure, footnotes, citations, cross-references,
and a definition — all in under 50 lines of source. The
rendered output is a self-contained HTML file.

**14. Where to go next**

- Authoring Guide → comprehensive reference for every element
- Layer 1 Reference → the output vocabulary
- Design Article → architecture and rationale

### Length target

~2000-3000 words. Takes 10-15 minutes to read and follow
along. Not longer — this is a Quickstart, not a manual.

### What it exercises (checklist)

These features must appear naturally in the guide's own
content:

- [ ] Document config (`<meta>`, `<title>`, `<author>`)
- [ ] At least 3 sections using sigil form (`<#>`, `<##>`)
- [ ] Inline math (`$...$`)
- [ ] Display math (`$$...$$`)
- [ ] A CSV table (`<table csv>`)
- [ ] A figure with caption (`<figure>`)
- [ ] At least 2 footnotes (`<note>`)
- [ ] At least 2 citations (`<cite>`) with a `<library>`
- [ ] At least 1 cross-reference (`<ref>`)
- [ ] At least 1 code block
- [ ] At least 1 theorem-family element (`<definition>` or
  similar)
- [ ] Bold and italic
- [ ] The three-layer comparison shown concretely

---

## Document 3: Authoring Guide

### Purpose

Comprehensive reference for writing in Enscribe. The author
has a specific question — "how do I make a numbered
equation?" or "how do citations work?" — and finds the answer
here. This is the document they keep open while writing.

### Reader

Someone actively authoring an Enscribe document. They've
done the Quickstart (or equivalent). They know Enscribe's
basic concepts. They need specifics: exact syntax, available
arguments, edge cases, the three-layer forms for each
element.

### Assumptions

- Completed the Quickstart or has equivalent familiarity
- Understands the three-layer model
- Looking for answers, not narrative
- Will use the table of contents to jump to the relevant
  section
- Appreciates concise examples over long explanations

### Voice

Reference-style. Each section is self-contained: you can
read just the "Citations" section without reading anything
before it. Examples are prominent. Explanations are brief
and precise. Edge cases and gotchas are noted honestly.

### Content outline

The guide is organized by element category. Each category
section follows the same template:

1. **What it is** (1-2 sentences)
2. **The three forms** (canonical / sigil / markdown, where
   they exist; some elements only have canonical form)
3. **Arguments / kwargs** (if any)
4. **Examples** (source + rendered output description)
5. **Gotchas / edge cases** (if any)
6. **Related elements** (links to other sections)

**Chapter 1: Document structure**
- `<meta>` and document types (`article` vs. `book`)
- `<title>`, `<author>`, `<date>`
- `<config>` and rendering options (`embedResources`,
  `dslMode`, etc.)
- The distinction between article (flat) and book (chaptered)

**Chapter 2: Sections and headings**
- `<section>` / `<#>` / `#` — the three forms
- `<sub-section>` / `<##>` / `##`
- `<sub-sub-section>` / `<###>` / `###`
- Deeper headings (`####`+ pass through as `<h4>`+ per HTML)
- Section IDs and cross-referencing sections
- Section numbering in books (automatic chapter prefix)

**Chapter 3: Inline elements**
- Bold (`**` / `<b>`)
- Italic (`*` / `<i>` / `<em>`)
- Inline code (`` ` ``)
- Inline math (`$...$` / `<$>...</$>`)
- Superscript and subscript (`^{}` / `_{}`)
- Links (`[text](url)`)

**Chapter 4: Block elements**
- Paragraphs (implicit, like Markdown)
- Blockquotes (`>` / `<blockquote>`)
- Code blocks (fenced ``` / `<code-block>`)
- Display math (`$$...$$` / `<$$>...</$$>`)
- Math environments (`align`, `gather`, etc.)

**Chapter 5: Figures and images**
- `<figure>` with `src=` attribute
- Captions
- Figure IDs for cross-referencing
- SVG figures
- The frameable system (figures are frameables)

**Chapter 6: Tables**
- CSV tables (`<table csv>`)
- TSV tables (`<table tsv>`)
- Markdown pipe tables
- Table captions
- Table IDs for cross-referencing

**Chapter 7: Citations and bibliography**
- The `<library>` block
- `<ref>` entries with structured fields (`author`, `title`,
  `year`, `journal`, `volume`, `doi`, etc.)
- The `<cite>` tag (in-text citation)
- Citation rendering (numbered, linked to bibliography)
- Bibliography placement (automatic, end of article;
  `<book-back>` for books)
- Multiple citations
- Citation keys and naming conventions

**Chapter 8: Footnotes**
- `<note>` tag
- Footnote numbering (automatic)
- Footnote placement (end of article; per-chapter in books)
- Hover previews
- Sidenote fallback (when hover isn't available)

**Chapter 9: Cross-references**
- `<ref>` tag (referencing figures, tables, equations,
  theorems, sections)
- ID conventions (`#fig:name`, `#tab:name`, `#eq:name`,
  `#thm:name`)
- How cross-reference text is generated ("Figure 1.2",
  "Theorem 3.1", etc.)
- Scoped numbering in books

**Chapter 10: Theorem family**
- `<theorem>`, `<lemma>`, `<corollary>`, `<proposition>`
- `<definition>`, `<example>`, `<remark>`
- `<proof>`
- Theorem numbering (shared counter for theorem/lemma/
  corollary/proposition; separate for definition)
- Custom theorem-like environments (if supported)
- The pipe form (`<theorem | content>`)
- Block form vs. pipe form

**Chapter 11: External DSLs**
- `<mermaid>` (diagrams)
- `<abc>` (music notation)
- DSL rendering modes (`skip`, `live-inline`, `live-link`,
  `static`)
- How DSL content is preserved vs. rendered

**Chapter 12: Book structure**
- `<book-front>`, `<book-body>`, `<book-back>`
- Chapters and parts
- Per-chapter numbering and scoping
- Per-chapter footnotes
- Book-wide bibliography
- The edited-volume pattern (per-chapter authors)

**Chapter 13: Arguments and the pipe**
- Named arguments / kwargs (`key=value`)
- The pipe form (`<tag | content>`)
- Block form vs. pipe form (when to use each)
- Positional arguments (the qualifying-tag pattern, e.g.
  `<table csv>`)
- Boolean kwargs
- Multi-line content in pipe form

**Chapter 14: Rendering and output**
- The `render()` API
- Rendering options
- Asset handling (embedded vs. linked)
- The browser library
- JATS export (brief — points to separate JATS article)

### Length target

This will be the longest document. Probably 8000-15000 words.
It's a reference, not a read-through — length is acceptable
because readers jump to the section they need.

### Relation to the Quickstart

The Quickstart introduces 12 features briefly. The Authoring
Guide covers every feature comprehensively. Each Quickstart
section should link to the corresponding Authoring Guide
section for details.

---

## Document 4: Layer 1 Vocabulary Reference

### Purpose

MDN-style element-by-element reference for Enscribe's Layer 1
HTML vocabulary. The developer or power user wants to know
exactly what element `<theorem>` produces, what attributes it
accepts, and what can go inside it.

### Reader

A developer integrating with Enscribe's output (styling it,
processing it, converting it). Or a power user who wants to
understand exactly what their document compiles to. This is
the most technical document in the set.

### Assumptions

- Knows HTML well
- Understands custom elements conceptually
- May be reading Enscribe's rendered output and trying to
  understand its structure
- May be writing CSS to style Enscribe documents
- May be building tools that consume Layer 1 output

### Voice

Reference. Terse. Each entry is a self-contained card. No
narrative between entries — the entries are the content. Like
MDN's element reference: element name, category, description,
attributes, content model, example, related elements.

### Content outline

**Introduction** (brief)

What Layer 1 is: the stable output vocabulary of custom HTML
elements. Every Enscribe document compiles to Layer 1. The
elements render in any browser via the default stylesheet.
This reference documents every element.

**Per-element entry template:**

```
## <element-name>

**Category:** (structural / inline / block / frameable /
  theorem-family / metadata / DSL)

**Description:** One-sentence description.

**Attributes:**
- `id` — optional identifier for cross-referencing
- `class` — CSS class (if relevant)
- (element-specific attributes)

**Content model:** What can appear inside this element.

**Authoring forms:**
- Canonical: `<element-name>...</element-name>`
- Sigil: `<sigil>...</sigil>` (if exists)
- Markdown: `markdown form` (if exists)

**Example:**
Source:
```enscribe
(source example)
```

Rendered HTML:
```html
(rendered output)
```

**Related elements:** Links to related entries.
```

**The element catalog** (organized by category):

Structural elements:
- `<article>`, `<book>`, `<book-front>`, `<book-body>`,
  `<book-back>`
- `<section>`, `<section-title>`, `<sub-section>`,
  `<sub-section-title>`, `<sub-sub-section>`,
  `<sub-sub-section-title>`

Metadata elements:
- `<meta>`, `<title>`, `<author>`, `<date>`, `<config>`

Inline elements:
- `<inline-math>`, `<b>`, `<i>`, `<em>`

Block elements:
- `<display-math>`, `<math-environment>`, `<code-block>`,
  `<blockquote>`

Frameable elements:
- `<figure>`, `<table>`, `<frame>`

Theorem family:
- `<theorem>`, `<lemma>`, `<corollary>`, `<proposition>`,
  `<definition>`, `<example>`, `<remark>`, `<proof>`

Citation/bibliography elements:
- `<cite>`, `<library>`, `<bibliography>`

Footnote elements:
- `<note>`, `<footnote-list>`

Cross-reference elements:
- `<ref>`

DSL elements:
- `<mermaid>`, `<abc>`

### Source for this document

The `layer1-vocabulary/elements/*.md` files contain per-
element metadata (frontmatter with element name, category,
HTML output mapping, handler responsibilities, canonical
HTML example). The Layer 1 Reference can be substantially
generated from these files, with human-written descriptions
and examples added.

This is the document most amenable to automation. The
skeleton (element name, category, attributes, content model)
comes from the vocabulary data. The descriptions and examples
are authored.

### Length target

Depends on the number of elements. With ~63 vocabulary
entries, and each entry ~100-200 words, the reference is
~6000-12000 words. Readers never read it end-to-end; they
look up individual elements.

---

## Document 5: JATS Relationship Article

### Purpose

Explain why JATS matters, how Enscribe relates to it, and
what Enscribe's JATS export does. This is a standalone article
for readers interested in the academic-publishing pipeline.

### Reader

An academic author, a journal editor, a librarian, or a
publishing technologist who cares about JATS as an archival/
exchange format. They may be evaluating Enscribe specifically
for its JATS capabilities.

### Assumptions

- Knows what JATS is (at least by name)
- May not know the details of JATS 1.3 Archiving vs. BITS 2.0
- Understands the journal-submission pipeline at a high level
- Wants to know: "If I write in Enscribe, can I submit to a
  JATS-requiring journal?"

### Voice

Informative and slightly more formal than the Quickstart.
This article positions Enscribe in the academic-publishing
ecosystem. It's confident about what Enscribe does well and
honest about what it doesn't do yet.

### Content outline

**1. What JATS is and why it matters**
- The NISO standard for journal-article XML
- Who uses it (PubMed Central, publishers, institutional
  repositories)
- JATS as archival format vs. authoring format (JATS is not
  for writing; it's for depositing)

**2. Enscribe's JATS export**
- Lossless export from Layer 1 to JATS 1.3 Archiving
- What maps cleanly (structured citations, math, sections,
  figures, tables, footnotes, cross-references)
- What maps with caveats (DSL blocks preserved as opaque
  `<preformat>` source)
- Article vs. book (JATS vs. BITS 2.0)

**3. The round-trip vision**
- JATS import (Phase 13, planned)
- The goal: write in Enscribe, export to JATS for submission,
  import JATS from published papers back into Enscribe
- Current state: export works; import is coming

**4. A worked example**
- Show a short Enscribe article
- Show the JATS XML it produces
- Walk through the mapping: this Enscribe element becomes
  that JATS element

**5. Comparison to other JATS workflows**
- LaTeX → JATS (via pandoc or publisher pipelines)
- Word → JATS (via publisher conversion)
- Enscribe → JATS (direct, lossless, author-controlled)

### Length target

~1500-2500 words.

---

## Document sequencing and dependencies

These documents have a reading order but not a strict
authoring dependency. They can be written in parallel or in
any order that suits the author.

**Natural authoring order:**

1. **Introduction** — sets the conceptual framework that all
   other documents reference. Author first or early.
2. **Quickstart** — exercises the most common features. Can be
   authored independently of the Authoring Guide (the
   Quickstart introduces features; the Guide goes deep).
3. **Authoring Guide** — the comprehensive reference. Largest
   document; may be authored chapter-by-chapter.
4. **Layer 1 Reference** — the most mechanical; can be
   partially generated from vocabulary data. Author after the
   vocabulary is stable.
5. **JATS article** — standalone; can be authored at any time.

**Cross-references between documents:**

- Introduction → Quickstart ("get started here")
- Introduction → Authoring Guide ("comprehensive reference")
- Quickstart → Authoring Guide (per-feature deep links)
- Authoring Guide → Layer 1 Reference (for readers who want
  to see the output vocabulary)
- JATS article → Authoring Guide (for JATS-specific
  authoring patterns)

**The multi-file question:**

Documents 1, 2, and 5 are single articles. Document 3
(Authoring Guide) is long enough to be a book but can be a
long article for v0.1.0. Document 4 (Layer 1 Reference) is
reference material that benefits from per-element pages but
can be a single long page for v0.1.0.

For v0.1.0: all documents are single `.emd` files. For post-
v0.1.0 (after Phase 9 multi-file support): the Authoring
Guide becomes a book with chapters; the Layer 1 Reference
may become a generated multi-page site.

---

## Slice mapping

How these documents map to implementation slices:

**Slice 3b (already scoped):** Translate README and DESIGN to
docs-site articles. These become the Introduction (from
README) and the Design Article (from DESIGN). The
Introduction outline above may require expanding the README
translation beyond a literal conversion — the README may not
have the three-layer-model explanation or the capabilities
survey in the form the Introduction needs.

**Slice 3c:** Author the Quickstart Guide per the outline
above. This is genuine authoring work, not translation. The
checklist in the outline is the acceptance criterion.

**Slice 3d:** Author the JATS Relationship Article per the
outline above.

**Slice 3e (new):** Author the Authoring Guide. This is the
largest authoring slice. May split into sub-slices by
chapter grouping:
- 3e-i: Document structure + Sections + Inline + Block
  elements
- 3e-ii: Figures + Tables + Citations + Footnotes +
  Cross-references
- 3e-iii: Theorem family + External DSLs + Book structure +
  Arguments + Rendering

**Slice 3f (new):** Generate the Layer 1 Vocabulary Reference.
Partially automated from `layer1-vocabulary/elements/*.md`.
Requires a generation script plus human-written descriptions.

**Post-v0.1.0:** The Authoring Guide grows into a book (Phase
9). The Layer 1 Reference may become generated multi-page
documentation. The JATS article gets updated when JATS
import lands (Phase 13).

---

## Quality criteria (across all documents)

These apply to every document:

- [ ] Authored in canonical Enscribe (`.emd` format)
- [ ] Renders correctly via the docs-site build
- [ ] Uses the three-layer model where relevant (shows
  canonical, sigil, and markdown forms)
- [ ] Every feature mentioned has a concrete example
- [ ] No feature is explained without being demonstrated
- [ ] Appropriate depth for the document's purpose (the
  Introduction is brief; the Authoring Guide is
  comprehensive)
- [ ] Links to other documents where they'd help the reader
- [ ] Makes correct assumptions about the reader (doesn't
  over-explain what they know; doesn't under-explain what
  they don't)
- [ ] Reads naturally as prose, not as a feature list or
  spec dump
- [ ] Exercises Enscribe's own features in its own content
  where possible (especially the Quickstart)
