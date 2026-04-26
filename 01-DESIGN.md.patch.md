# Patch: DESIGN.md — Add JATS as reference vocabulary and export target

## Change 1: Add a new section after "Layer 1: Semantic HTML conventions" and before "Layer 2: Authoring shorthand"

### New section to insert:

```markdown
## JATS as reference and export target

JATS (Journal Article Tag Suite) is the established XML schema for academic articles, developed by NIH/NLM and used throughout scholarly publishing. JATS has spent two decades refining a vocabulary for academic content — author lists, affiliations, abstracts, structured references, glossaries, funding statements, and much more. Acadamark does not duplicate this work.

Two principles govern acadamark's relationship to JATS:

**JATS as reference vocabulary.** When Layer 1 needs to define a new element, the JATS tag library is the first reference. Acadamark adopts JATS naming and conventions where they're sensible, recognizing that JATS is XML and acadamark is HTML — so exact transcription isn't always right, but the design decisions usually transfer. The goal is to avoid inventing worse versions of decisions JATS already got right. (See `notes/layer1-naming.md` for the binding rule.)

**JATS as first-class export target.** Acadamark Layer 1 HTML compiles to JATS XML via a planned plugin (`rehype-acadamark-to-jats`). This makes acadamark documents submittable to journals and ingestable by the scholarly publishing ecosystem (PubMed, CrossRef, archival systems) without requiring Pandoc as a runtime dependency or hand-conversion.

This is acadamark's bridge to professional publishing. The pitch is not "academic markdown for the web" but "academic markdown for the web that can submit to journals."

What acadamark does *not* do, and where it differs from JATS:

- JATS is XML; acadamark is HTML. JATS documents require a stylesheet or viewer to be readable. Acadamark documents are directly browser-renderable.
- JATS has no authoring syntax. Acadamark's shorthand is what humans actually type.
- JATS rewards completeness; acadamark rewards getting started. Required JATS metadata can be filled with defaults or generated at export time.

Acadamark stays a small subset of JATS in vocabulary terms — perhaps 30 elements where JATS has 200+ — but a subset that compiles cleanly into JATS for downstream use.
```

## Change 2: Update the "What's deliberately out of scope" section

### Find this in DESIGN.md:

```markdown
- A PDF generator. Use Pandoc, Paged.js, or Prince downstream.

The project's contribution is the specification (Layer 1), the shorthand (Layer 2), and the glue plugins that connect them to the existing ecosystem.
```

### Replace with:

```markdown
- A PDF generator. Use Pandoc, Paged.js, or Prince downstream.

JATS export is *in* scope and is a planned deliverable (see "JATS as reference and export target" above). The project's contribution is the specification (Layer 1), the shorthand (Layer 2), the glue plugins that connect them to the existing ecosystem, and the bridge to scholarly publishing via JATS.
```
