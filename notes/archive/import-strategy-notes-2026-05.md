# Import strategy: post-v0.1.0 roadmap considerations

This document analyzes how Enscribe might handle import from
other authoring formats (LaTeX, DOCX, Markdown variants, JATS,
etc.) after v0.1.0 ships. Captured as a notes document for
later roadmap planning; not a current commitment.

## The adoption-friction framing

Import matters more than export for new-user adoption. A
prospective user thinking "I want to try Enscribe and already
have documents in format X" needs a path forward; without one,
they don't try Enscribe at all. Export, by contrast, is a
known-content concern — once a user is invested in Enscribe,
they'll work with what's available.

The import question: who would actually want import, and what
are they coming from?

- **Active LaTeX users** wanting to try Enscribe — source is
  `.tex` files
- **Active Word users** wanting to try Enscribe — source is
  `.docx`
- **Researchers with published papers** wanting to bring them
  into Enscribe — source might be JATS XML (rare) or PDF
  (common, hard)
- **Markdown / Pandoc users** wanting to try Enscribe — source
  is Markdown or pandoc's flavor of Markdown

Each population's "import path" leads to a different
implementation strategy.

## JATS as import hub: half-good

The vision: "Got a LaTeX paper? Convert it to JATS first
(pandoc does this), then JATS-to-Enscribe import. Got DOCX?
Same path." JATS is the bottleneck through which all imports
flow.

Why this is appealing:

- One import implementation (`JATS → Enscribe`) instead of
  many
- JATS is structured XML — easier to parse reliably than raw
  LaTeX or DOCX
- Phase 13 builds this conversion anyway; reusing it for
  imports from other formats is reuse
- JATS preserves more semantic structure than other formats

The problem: **JATS is a destination format, not an origin
format.** Almost nobody authors directly in JATS. They write
in LaTeX, DOCX, or some authoring tool, and *export* to JATS
for journal submission. So the import chain becomes:

`LaTeX → [pandoc] → JATS → [Enscribe importer] → Enscribe`

Two conversions, each lossy. By the time the LaTeX content
has been flattened through pandoc's representation into JATS
XML, then reparsed into Enscribe's vocabulary, you've
accumulated two rounds of fidelity loss. The result probably
looks like a structurally-correct document with lots of small
things wrong: misformatted citations, dropped math
environments, lost custom commands, simplified tables.

The deeper problem: **pandoc's JATS writer isn't great.**
Pandoc generates structurally-valid JATS but uses a limited
subset of the JATS vocabulary. So `LaTeX → pandoc → JATS`
produces a thin JATS that loses things pandoc would have
preserved if you'd gone directly to LaTeX's target format.

What JATS-as-hub *does* work well for: **importing existing
journal-published JATS XML.** Real JATS (from PubMed Central,
publisher archives, journals that publish JATS alongside PDFs)
preserves a lot of structure. The `JATS → Enscribe` conversion
would be high-fidelity for this case.

So the JATS route is excellent for "I want to bring an
existing published paper into Enscribe" but poor for "I have
a LaTeX paper I'm currently writing and want to switch."

## The pandoc bridge for import: more valuable than for export

For export, pandoc-route is a quality compromise — you give
up format-specific polish for breadth. For import, pandoc-
route is much more attractive because:

- You're not in control of the source documents anyway —
  they're whatever quality they are
- Lossy import is acceptable in a way lossy export isn't —
  the user is going to clean up the result manually anyway
- The breadth is genuinely useful: "I have a Markdown file" /
  "I have an RST file" / "I have an AsciiDoc file" all get
  handled

A pandoc reader that consumes pandoc's AST and emits Enscribe
source would be the most leveraged import work possible. One
implementation; dozens of input formats; lossy-but-usable for
each.

## First-class importers per format

For formats where adoption pressure is high enough to justify
the effort, first-class importers produce better results than
the pandoc bridge. The clearest candidates:

- **LaTeX import** — academic source format; first-class
  implementation produces high-fidelity Enscribe; substantial
  work but high value for the academic audience
- **DOCX import** — most-requested by collaborators (Word is
  what reviewers use); pandoc handles DOCX reasonably; first-
  class effort justified by audience size

JATS import (Phase 13) is already planned as first-class.

## Recommended phasing (post-v0.1.0)

**Phase 13 — JATS import.** Already on the roadmap. Highest
fidelity for the specific case it serves. First-class. The
note about lossless JATS export (other than some DSLs)
strengthens this: round-trip JATS-to-Enscribe-to-JATS should
be achievable.

**Phase 15 — Pandoc bridge for import.** Implement a converter
that takes pandoc's AST (JSON-serialized) and emits Enscribe
source. Users run pandoc themselves to convert their format
to pandoc-AST, then Enscribe's tool converts AST to Enscribe.
Wide format coverage with one implementation. Lossy but
useful.

**Phase 16 — LaTeX import as first-class.** For users who
want high-fidelity LaTeX-to-Enscribe conversion beyond what
pandoc produces. Larger effort. The pandoc bridge from Phase
15 covers the basic case; first-class LaTeX import is for
users who care about preserving more structure.

**Phase 17 — DOCX import as first-class** (optional). If
pandoc-bridge DOCX import is insufficient for the Word-
collaborating audience, first-class effort to improve
fidelity.

## Export side: pandoc reader for Enscribe

The natural complement to a pandoc-AST-to-Enscribe importer
is a pandoc reader that takes Enscribe source and emits
pandoc AST. This makes Enscribe a first-class pandoc input
format; pandoc users can convert Enscribe to any of pandoc's
many output targets.

Pandoc reader for Enscribe is leverage in the export
direction: one implementation gives you mediocre-quality
exports to RTF, ODT, EPUB, ICML, RST, MediaWiki, AsciiDoc,
and dozens more.

This pairs well with the import bridge: the same pandoc
ecosystem serves both directions for "good enough" coverage,
while first-class JATS/LaTeX work serves the high-fidelity
cases.

## What this isn't

This document doesn't address:

- PDF import (a separate, much harder problem; OCR territory
  for image-PDFs)
- Markdown variants other than via pandoc (CommonMark, GFM,
  MultiMarkdown, etc. — all routed through pandoc bridge)
- Live import from web-based authoring tools (Google Docs,
  Notion, Obsidian — each its own thing)
- Typst as either source or target (separate analysis; Typst
  export is a candidate for first-class export effort)

## Summary

For broad import coverage with minimal effort, the pandoc
bridge (Phase 15) is the highest-leverage post-v0.1.0 import
work. JATS import (Phase 13) handles the published-paper case
with high fidelity. First-class LaTeX import (Phase 16) and
possibly DOCX import (Phase 17) come later for audiences
needing higher fidelity than the pandoc bridge provides.

The pandoc bridge is bidirectional: a pandoc-AST-to-Enscribe
converter handles import; an Enscribe-to-pandoc-AST converter
(via a pandoc reader for Enscribe) handles export to pandoc's
many targets.

Enscribe's lossless JATS export commitment makes JATS round-
tripping particularly valuable — JATS-to-Enscribe-to-JATS
should preserve content faithfully, modulo some DSL handling.
