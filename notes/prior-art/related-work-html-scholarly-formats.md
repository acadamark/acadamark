# Related work: HTML-native scholarly document vocabularies

Enscribe is not the first attempt to express scholarly documents in HTML rather than in an
XML schema (TEI, JATS, DocBook) or a PDF-targeted format (LaTeX). Two notable prior efforts —
**Scholarly HTML** (W3C Community Group) and **RASH** (Research Articles in Simplified HTML) —
share Enscribe's core premise that the browser is already a capable document renderer and that
HTML can carry scholarly semantics. They differ from Enscribe in scope, in their approach to
semantics, and crucially in whether they address *authoring* at all.

This document situates Enscribe against them. It is descriptive prior-art context, not a claim
of superiority — each project made coherent choices for its goals.

## At a glance

| | **Enscribe** | **Scholarly HTML** | **RASH** |
|---|---|---|---|
| **What it is** | A semantic HTML vocabulary for scholarly/long-form documents **plus** a shorthand authoring syntax | A semantic HTML vocabulary (conventions over HTML) for scholarly articles | A constrained *subset* of HTML (a markup language) for scholarly articles |
| **Origin** | Independent project (A. Balter) | W3C Scholarly HTML Community Group (Siegman, Berjon) | Digital & Semantic Publishing Lab, U. Bologna (Peroni et al.) |
| **Status (as known)** | Active development, pre-1.0 | Community Draft (largely dormant since ~2016) | Published (PeerJ CS, 2017); framework on GitHub |
| **License** | MIT | CC-BY | Open Source + CC |
| **Primary unit** | Article *and* book (multi-chapter) | Article | Article (research paper) |

## Approach to HTML

| | **Enscribe** | **Scholarly HTML** | **RASH** |
|---|---|---|---|
| **Relationship to HTML** | Defines a vocabulary (elements, custom elements, `data-*`, classes); uses the real HTML element where one exists, adds semantics where HTML can't name them | Valid HTML + additional structural rules; an "HTML Vernacular" | A *restricted subset* — ~31–32 HTML elements only, derived by removing/constraining HTML5 |
| **Element count** | Open vocabulary (grows with the spec) | Uses standard HTML elements + roles | Deliberately minimal (~32 elements) |
| **Validation model** | Strict mode (lint) + content-model rules | "HTML is valid" (validation tool aspirational) | RelaxNG grammar (formal, validatable) |
| **Theoretical basis** | Content model (flow/phrasing binary), three-register authoring | schema.org reuse; "avoid ontological drift" | Structural patterns theory for XML documents |

## Semantics

| | **Enscribe** | **Scholarly HTML** | **RASH** |
|---|---|---|---|
| **Semantic mechanism** | Native semantic elements + `data-*`; archival channel is JATS (bidirectional) | RDFa + schema.org + WAI-ARIA / DPUB-ARIA roles | RDFa / RDF (Turtle, RDF/XML, JSON-LD) embeddable in any element + DPUB-ARIA |
| **Citations/references** | First-class (`<cite>`, `<library src>`, CSL-oriented) | `doc-biblioentry` lists with schema.org metadata, readable-citation pattern | Bibliographic markup; RDF-annotatable |
| **Cross-references** | First-class typed refs (`<ref #fig:x>`, typed colon-ids) | Via `rel`/`href` links and roles | Internal links |
| **Math** | LaTeX math → KaTeX/MathJax | MathML 3 (+ required TeX annotation) | MathML |
| **Metadata** | Document `<config>` + front matter | schema.org via RDFa (authors, affiliations, funding, disclosures, etc.) | Embedded RDF |

## Authoring (the biggest differentiator)

| | **Enscribe** | **Scholarly HTML** | **RASH** |
|---|---|---|---|
| **Authoring story** | **A shorthand language** (the Enscribe shorthand): markdown idioms + tag shorthand `<tag #id .class attr=val \| content>`, three registers, compiling losslessly to the vocabulary | None of its own — you hand-write the HTML, or a separate tool targets it (e.g. a DOCX style) | You write the (subset) HTML directly; conversion tools exist (from/to LaTeX, DOCX, ODT via the Framework) |
| **Hand-writing HTML required?** | No — the shorthand is the intended authoring surface | Yes (or external tooling) | Yes (it *is* the HTML, just constrained) |
| **Tooling** | `enscribe` CLI, browser library, live editable site, JATS import/export | Reference prose; validation aspirational | RASH Framework: conversion + extraction + validation tools ("ROCS" online service) |

## Where Enscribe is distinctive

1. **It addresses authoring head-on.** Scholarly HTML and RASH both leave you writing HTML
   (constrained or annotated) by hand, or relying on external converters. Enscribe's shorthand
   is the differentiator: a compact syntax that compiles to the vocabulary, so the
   author never hand-writes the verbose HTML. This is the gap both prior efforts explicitly
   left open (RASH's own evaluation flagged HTML's authoring friction for "less technically
   savvy users").

2. **Books, not just articles.** Both prior efforts target the single research article.
   Enscribe handles multi-chapter books (chapter rails, cross-chapter references, per-chapter
   sources) alongside articles.

3. **JATS as the archival channel, not RDF.** Scholarly HTML and RASH both lean on the RDF
   stack (RDFa/schema.org/Turtle/JSON-LD) for machine semantics. Enscribe instead treats JATS
   as the bidirectional archival/semantic channel and HTML as the display projection — aligning
   with the dominant academic-publishing interchange standard rather than the linked-data stack.

4. **A live, editable rendering target.** Enscribe ships a browser engine and an editable live
   site (the shorthand renders and round-trips in the browser). The prior efforts are
   format/validation specs with batch tooling, not interactive runtimes.

## A note on naming (for the rename discussion)

Worth recording, since it bears on what to call Enscribe's vocabulary layer:

- **"Tag Suite" is the field-standard category word.** JATS = Journal Article *Tag Suite*; the
  mature precedents name themselves as tag suites / vocabularies / encodings / schemas — **not
  as "formats."**
- **"Rich document format" is already taken in this exact space.** The Scholarly HTML spec
  describes *itself* as "a domain-specific rich document format." Reusing that phrasing would
  collide with a W3C community draft in the same domain.
- **"RDF" is unusable as an acronym here.** RDF = Resource Description Framework (W3C), the
  foundation of the semantic-web stack that both prior efforts actually *build on*. An academic
  HTML-document project acronymising to RDF/ERDF/RDTS would read as either ignorance of, or a
  claim to, the RDF stack.
- Both prior efforts also use a **`[name]` + `[name] Framework`** split (RASH the format, the
  RASH Framework the tools). Enscribe has the same shape (the vocabulary vs the shorthand/engine).

## Sources

- Scholarly HTML, W3C Community Draft — https://w3c.github.io/scholarly-html/
- RASH, Peroni et al., *PeerJ Computer Science* 3:e132 (2017) — https://peerj.com/articles/cs-132/
- RASH Framework — https://github.com/essepuntato/rash
