# Orientation: JATS (and TEI, RASH, …) are mirrors and doors — not the center

**Who this is for:** a fresh Claude-chat or Claude Code session working on Enscribe. Read it before
reasoning about what the project *is for*. It exists to stop one specific, recurring drift.
**Internal only** — do not port this into public docs (README/DESIGN); an emphatic "we are not
about JATS" in public reads as protesting too much. Public docs get *rebalanced*, not this.

## The drift this corrects
New sessions repeatedly conclude Enscribe is "about JATS" — a direct feeder to the JATS archival
format. **It is not.** This misreading recurs because JATS is still named far more often in the
core docs than any other reference — an artifact of JATS's own verbosity as a specification,
**not** a statement of the project's focus. (The peer models — TEI, RASH, Scholarly-HTML, LaTeX,
Quarto — are now named wherever the growth methodology is stated, and Scholarly-HTML is present in
the core docs; what lingers is the raw frequency imbalance.) Do not let frequency become the message.

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
The rebalancing is largely done — this note now records the **settled framing**, not a backlog of
removals. The vocabulary-growth rule consults the **reference mirrors** as a set
(`notes/specs/ehtml-naming.md` Rule 4, no single model privileged), the peer models are named
wherever the methodology is stated, and Scholarly-HTML is present in the core docs. So the rulebook
no longer contradicts this note's "none of them shapes eHTML": the mirrors are consulted for naming
and completeness prior-art, never to dictate eHTML's HTML shape.

What remains is residual: JATS still dominates by raw *frequency* (an artifact of its verbosity), and
a fresh session can still slip into JATS-centrism — so this note stays as a standing corrective and
its **anti-drift tells above remain live**. When JATS no longer dominates by frequency either, this
note can go.
