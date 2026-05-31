# Enscribe's position among rich-document systems

This document situates Enscribe in the landscape of established
authoring systems that handle the same general territory:
structured documents with first-class footnotes, citations,
math, cross-references, theorem-family content, and figures.
It records why Enscribe exists alongside these systems, what it
intends to emulate and adopt, and how it intends to interact
with them.

This is positioning analysis, not a current roadmap commitment.

## The matrix

For each system, the columns name whether the format has
first-class support for the listed element. "First-class"
means the format has dedicated semantic representation, not
just visual styling. A `<theorem>` tag is first-class;
`**Theorem 1.**` styled in bold is not.

| System | Footnotes | Citations (structured) | Cross-references | Math | Theorem-family | Figures | Tables | DSL blocks (preserved source) | First-class HTML rendering | Authoring shorthand | Standardization |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Enscribe** | ✓ | ✓ (CSL) | ✓ (scoped) | ✓ (KaTeX) | ✓ | ✓ | ✓ | ✓ | ✓ (Layer 1) | ✓ (sigils) | — (in development) |
| **JATS** | ✓ | ✓ (structured) | ✓ | ✓ (MathML) | ✓ (`<statement>`) | ✓ | ✓ | ◐ (preserves but as opaque) | ✗ (XML, not rendering format) | ✗ | ✓ (NISO standard) |
| **TEI** | ✓ | ✓ (rich) | ✓ | ◐ (MathML) | ◐ (encodable but informal) | ✓ | ✓ | ✗ | ✗ (XML, not rendering format) | ✗ | ✓ (community standard) |
| **DocBook** | ✓ | ✓ (structured) | ✓ | ◐ (MathML) | ◐ (admonitions; not formal) | ✓ | ✓ | ✗ | ✗ (XML, not rendering format) | ✗ | ✓ (OASIS standard) |
| **LaTeX** | ✓ | ✓ (BibTeX/biblatex) | ✓ | ✓✓ (native) | ✓ (amsthm) | ✓ | ✓ | ◐ (via packages) | ✗ (PDF target) | ◐ (macros) | — (de facto) |
| **DOCX (OOXML)** | ✓ | ◐ (Word-specific) | ✓ | ✓ (OMML) | ✗ (styled paragraphs) | ✓ | ✓ | ✗ | ✗ (Word target) | ✗ | ✓ (ISO/IEC 29500) |
| **ODT** | ✓ | ◐ (citation entries) | ✓ | ✓ (MathML) | ✗ (styled paragraphs) | ✓ | ✓ | ✗ | ✗ (LibreOffice target) | ✗ | ✓ (OASIS standard) |
| **RST (reStructuredText)** | ✓ | ✓ | ✓ | ◐ (via roles) | ✗ (directive convention) | ✓ | ✓ | ✗ | ◐ (Sphinx) | ◐ | — (de facto) |
| **AsciiDoc** | ✓ | ✓ | ✓ | ◐ (via STEM) | ◐ (admonitions) | ✓ | ✓ | ✗ | ◐ (Asciidoctor) | ◐ | — (community spec) |
| **Quarto** | ✓ | ✓ (CSL) | ✓ | ✓ (LaTeX-in-Markdown) | ◐ (custom divs) | ✓ | ✓ | ✓ (executable code) | ◐ (via Pandoc) | ◐ (Markdown-based) | — (single-vendor) |
| **CommonMark + GFM** | ◐ (extension) | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ (spec) |

Legend: ✓ first-class; ✓✓ best-in-class; ◐ partial / via convention or extension; ✗ not supported or significantly worse than first-class.

## What Enscribe brings that others don't

Three things distinguish Enscribe in this landscape:

**1. First-class HTML rendering as the primary target.** JATS,
TEI, and DocBook are XML formats — archival/exchange formats
that require separate stylesheets or pipelines to render. LaTeX
targets PDF. DOCX targets Word. Quarto produces HTML via
Pandoc but the HTML is not the format's *primary* artifact.
Enscribe's Layer 1 vocabulary *is* HTML — every Layer 1 tag is
a custom HTML element that renders in a browser without
intermediary tooling. The rendered article is the canonical
output, not a derived artifact. No other system in the matrix
takes this position.

This means: an Enscribe document is shippable. Email someone
the rendered `.html` and they have the complete article. Open
it in any browser. No build pipeline at view time.

**2. Authoring shorthand that lifts to canonical structure.**
LaTeX has macros (heavyweight, procedural). Markdown variants
have terse syntax (but limited semantic coverage). Enscribe
has both: a sigil-based shorthand for fast authoring, and a
canonical tag form for explicit structure, with deterministic
lifting between them. This is closer to what authors actually
want — quick to write, semantically explicit when needed.

CommonMark gets partial credit here (it has authoring
shorthand) but lacks the rich-element coverage. Quarto and
RST/AsciiDoc have some shorthand for rich elements (math, code
blocks) but their custom-element handling falls back to
directive-style syntax that doesn't lift to canonical
structure.

**3. The unified/remark/rehype pipeline base.** Enscribe's
implementation is built on the unified ecosystem — the same
toolchain that powers MDX, Astro, Docusaurus, Gatsby, and many
modern static-site generators. This means: Enscribe is
composable with that ecosystem. Plugins from remark/rehype can
be added to the pipeline. Output can flow into any unified-
based renderer. The toolchain is JavaScript-native and
serverless-friendly.

LaTeX's toolchain is Perl/TeX-based and large. Pandoc is
Haskell. DocBook tooling is XSLT-based. Word/LibreOffice are
proprietary or large open-source applications. Enscribe is
the only system in the matrix built on the modern JavaScript
content-tooling stack.

## What Enscribe doesn't claim

Honest about what Enscribe is *not* trying to be:

**Not a journal archive format.** JATS is the right tool for
that role. Enscribe targets JATS for lossless export so that
content authored in Enscribe can deposit into JATS-based
archival workflows (PubMed Central, publisher submission,
institutional repositories).

**Not a humanities scholarship platform.** TEI is richer for
manuscript encoding, philological work, historical-document
markup, and humanities-specific apparatus. Enscribe's
vocabulary leans toward STEM-style scholarly articles; TEI
serves humanities-style scholarship better. (Future TEI
export could broaden this, but is not currently planned.)

**Not a typesetting system.** LaTeX produces print-quality
PDF output that Enscribe's HTML rendering does not match for
print contexts. Enscribe expects users who need print-quality
PDF to either accept what HTML-to-PDF tools produce (Prince,
WeasyPrint, browser print) or to use a LaTeX export pipeline
when print fidelity matters. (Future LaTeX export could close
this gap for users who want it.)

**Not a Word replacement.** DOCX is what reviewers and
collaborators use. Enscribe accepts that DOCX export is
necessary for collaboration and intends to support it, but
doesn't claim to replace Word for users who collaborate
heavily with Word users.

**Not a one-vendor ecosystem.** Quarto is a single-vendor
project (Posit). Enscribe is intended to be community-
developable; the Layer 1 vocabulary is a stable target that
multiple implementations could share.

## Why a new system rather than extending an existing one

The natural question: "Why not just extend LaTeX, or add
features to Quarto, or contribute to Pandoc?" The honest
answer:

**Each existing system has architectural commitments that
constrain it.** LaTeX is procedural and macro-based; adding
declarative-semantic features means fighting the architecture.
Pandoc's AST is an opinionated lingua franca; extending it
requires consensus across many input/output format
maintainers. Quarto inherits Pandoc's architecture and adds
single-vendor decisions on top. JATS is a destination format,
not an authoring format. TEI is a community-governed XML
standard with a much larger vocabulary than Enscribe needs.

**Enscribe's specific combination is novel:** rich-element
first-class semantics + HTML as primary target + JavaScript-
native pipeline + authoring shorthand. No existing system
combines these. Each existing system has at least one of
these in some form; none has all four.

**The first-class HTML rendering is the decisive
differentiator.** This is what enables: distributable
documents (mail the .html), live-editable demo sites, browser-
based playgrounds, JavaScript-native composability. Every
other system in the matrix produces a non-HTML primary
artifact (PDF, XML, DOCX) that requires separate rendering
tooling.

## Interaction strategy

Enscribe is not isolationist. Its strategy for interoperating
with the rest of the landscape:

**JATS** — Lossless export (Phase 5 done). Import (Phase 13
planned). Round-trip JATS-to-Enscribe-to-JATS should preserve
content faithfully, modulo some DSL handling. JATS is the
archival/exchange hub.

**LaTeX** — First-class export and import planned (post-
v0.1.0). Targets the academic audience that currently writes
in LaTeX. Math fidelity is the strongest mapping; theorem-
family content also maps cleanly.

**Pandoc** — Bidirectional bridge planned (post-v0.1.0). A
pandoc reader for Enscribe (export to anything pandoc
supports). A pandoc-AST consumer that emits Enscribe (import
from anything pandoc reads). This gives breadth coverage for
formats that don't warrant first-class effort.

**DOCX** — Pandoc bridge handles the basic case. First-class
DOCX export and import is a future consideration if the
collaboration-with-Word-users audience needs higher fidelity.

**TEI** — Not currently planned. A future consideration if
Enscribe broadens into humanities scholarship. The mapping
between Enscribe's vocabulary and TEI's broader vocabulary is
asymmetric (TEI is richer) but a useful subset could be
exported.

**Quarto** — Adjacent rather than interoperating. Quarto and
Enscribe serve similar audiences with different architectural
commitments. Users choose between them based on their tooling
preferences (Pandoc-based vs. unified-based; multi-format-
target vs. HTML-primary).

**DocBook, RST, AsciiDoc** — Reachable through the Pandoc
bridge. Probably not worth first-class effort given audience
sizes.

## Future TEI consideration

If Enscribe broadens scope beyond STEM-leaning scholarship to
include humanities authoring, first-class TEI export becomes
relevant. The mapping considerations:

- TEI's structural vocabulary (front/body/back, divs at
  multiple levels) maps cleanly to Enscribe's book and
  article structures
- TEI's footnote/cross-reference apparatus maps cleanly
- TEI's `<bibl>` / `<biblStruct>` map to Enscribe's structured
  citations
- TEI's `<div type="theorem">` convention is a natural target
  for Enscribe's theorem family
- TEI's rich manuscript-encoding features (variants, witness
  lists, named entities, etymological data) have no
  counterparts in Enscribe — they would simply not be
  generated by Enscribe-to-TEI export

A TEI import would face a similar asymmetry: humanities-
specific markup would either be dropped or stored as opaque
content during import.

This is a Phase 18+ consideration if pursued. Not a near-
term commitment.

## Summary

Enscribe occupies a defensible niche: structured authoring
with first-class rich elements, HTML as primary target,
JavaScript-native pipeline, authoring shorthand that lifts to
canonical structure. No existing system combines these. The
landscape includes excellent systems for adjacent niches —
JATS for archive, LaTeX for print, Quarto for Pandoc-anchored
multi-format publishing, TEI for humanities — and Enscribe
plans to interoperate with each via lossless export (JATS),
first-class converters (LaTeX), or bridges (Pandoc).

The matrix shows Enscribe and Quarto as the closest
competitors. The distinction is architectural: Quarto is
Pandoc-anchored and multi-vendor; Enscribe is unified-anchored
and HTML-primary. The two systems can coexist serving slightly
different preferences within the same broad audience.
