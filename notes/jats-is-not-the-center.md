# Orientation: JATS (and TEI, RASH, …) are mirrors and doors — not the center

**Who this is for:** a fresh Claude-chat or Claude Code session working on Enscribe. Read it before
reasoning about what the project *is for*. It exists to stop one specific, recurring drift.
**Internal only** — do not port this into public docs (README/DESIGN); an emphatic "we are not
about JATS" in public reads as protesting too much. Public docs get *rebalanced*, not this.

## The drift this corrects
New sessions repeatedly conclude Enscribe is "about JATS" — a direct feeder to the JATS archival
format. **It is not.** This misreading recurs because JATS is named far more often in the docs
than any other reference (~288 mentions across the core docs, vs. a handful each for
TEI/LaTeX/Quarto and **zero** for Scholarly-HTML). That frequency is an accident of JATS's own
verbosity as a specification — **not** a statement of the project's focus. Do not let frequency
become the message.

## What Enscribe actually is
A way to write **HTML-shaped, semantic academic documents.** eHTML is HTML internally and renders
directly in a browser; **that render is the mission.**

## The role of JATS, TEI, RASH, Scholarly-HTML (W3C), LaTeX, Quarto
Two roles — and **neither makes Enscribe "about" any of them:**

- **Requirement mirrors.** They are well-worked-out inventories of what academic documents need.
  Enscribe consulted them to check that eHTML *captures the expectations and requirements of
  academic writing* — a completeness check, not a blueprint. They answer "does eHTML cover what
  serious academic writing needs?" — never "what should eHTML look like?"
- **Export targets.** Some (JATS, TEI, Scholarly-HTML, EPUB) are also formats Enscribe converts
  *to*. Export is a feature reached *from* the HTML-shaped base — a door out, not the room.

None of them shapes eHTML. **eHTML is HTML-shaped, not JATS-shaped.**

## Anti-drift tells — if you catch yourself doing any of these, stop and recenter
- calling JATS "central," "the archival format," or "the mission";
- treating a spec↔code JATS gap as more urgent than it is, or pulling JATS work into a non-JATS
  milestone;
- escalating JATS export fidelity as though it gated the project;
- reaching for JATS as the *sole* example when TEI / RASH / Scholarly-HTML / LaTeX / Quarto are
  equally valid references.

The JATS **machinery** (import/export) is a legitimate feature — leave it be. It is the **framing
and emphasis** that over-center JATS, not the mechanics.

## Status (this is a standing corrective)
Keep this note until the project's own docs no longer over-weight JATS. The removal work it
governs: name the peer models wherever JATS currently stands alone, add Scholarly-HTML (currently
absent), and keep public docs *balanced* rather than defensive. When that rebalancing is done and
JATS no longer dominates by frequency, this note can go.
