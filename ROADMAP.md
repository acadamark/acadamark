# Roadmap

Where Enscribe is headed. **GitHub milestones are the source of truth** — this file
is the readable plan behind them. If the two disagree, the milestones win and this
file is what needs updating.

## How to read this

- **Releases** are what ships, in order — the *output*. Each carries a theme and
  draws its work from one or more epics.
- **Epics** are the large bodies of work — the *input*. An epic is decomposed into
  slices that land across releases; you never ship "an epic," you ship its slices.
- **Bugs** are triaged by severity, off this roadmap: serious ones get fixed
  immediately (patch releases); minor ones ride the next consolidation pass.

## The path to launch

The spine, in order — each step unblocks the next:

1. **Multi-file / master-document system** — the long pole. A real document spans
   many files; nothing downstream works without it. *Walking skeleton landed;
   cross-file resolution next.*
2. **Dogfood** — build Enscribe's own website and book in the multi-file system.
   The centerpiece demo, not housekeeping: the tool authoring its own docs is the
   proof.
3. **Interchange import** — the on-ramp. Academics arrive with existing documents
   (Quarto, LaTeX, DOCX); import lets them start without retyping. (Export is the
   trust half — no lock-in — but *import* is what gates adoption.)
4. **Paper examples** — a handful of real papers rebuilt in Enscribe, as evidence
   it handles actual scholarship.
5. **Remaining fixes** — the known gaps that block a credible first impression.
6. **Soft launch** to friendlies → **public launch** (Show HN, r/LaTeX, academic
   Bluesky/fedi, Lobsters, and the markup-tool niche — Typst / Asciidoctor / djot
   watchers).

Everything else is roadmap, not a launch gate. Slides, full LaTeX/DOCX fidelity,
and Quarto-perfection are post-launch.

## Releases

> Reconcile the issue lists below against `gh` milestones — these mirror the
> tracker and drift if issues move.

- **v0.5.0 — HTML output.** Layer 1 becomes HTML-shaped; the render projection is
  the display channel. Draws from the HTML-output epic. (#147, #117)
- **JATS.** The archival/semantic export translation, hardened — export gaps,
  `enscribe fetch`, and import round-trip. (#136, #118, #119, #142)
- **v0.6.0 — Advanced layout.** Multi-column, figure placement, the harder display
  surfaces. (#34, #35, #116, #164)
- **Data model.** Config-as-data and the document data block, settled and built.
  (#102, #134, #166, #168)
- **Interchange.** Quarto round-trip + LaTeX/DOCX import-export. Draws from the
  Interchange epic. (#187, #188, #189)
- **Later releases (v0.7.0, v0.8.0).** Post-launch polish and features, held in
  their milestones — browser-bundle trim and arrow typography (#25, #139), then
  presentations/slides (#50), minipage panels (#115), and the MDN-grade
  vocabulary reference (#122).
- **Not planned / icebox.** Out-of-scope and parked items live in the `Not Planned`
  and `future` milestones, not here.

## Epics

The bodies of work feeding the releases, with where each stands:

- **HTML output** — *in progress, mostly delegable.* Figures migrated. Queue:
  frame/diagram, code, cross-refs (output-neutral reconciliations); then the
  genuinely output-changing groups (theorem, math, front-matter). **Sections are
  blocked** on the #40 heading-level decision (see below).
- **Multi-file / master-document** — *in progress, foreground.* Walking skeleton
  assembles `<section src>` children into an article. Next slices, in the loop:
  cross-file citation registry, cross-file numbering/cross-refs, placement markers
  (toc/endnotes/bibliography), then book + website page model.
- **Data model** — *needs Phase-0.* Settle the taxonomy (#166) and the meta-data
  block (#168) before the slices delegate.
- **Interchange** — *needs Phase-0.* Settle import coverage (IX-Q1) — the launch
  on-ramp — before building. Designed in `notes/specs/interchange.md`.

## Pending decisions

The forks that gate delegable work — each a call to make before its epic opens up:

- **#40 — heading-level mapping.** Gates the sections migration in HTML output
  (whether `<section-title>` → `<h2>` etc., against the Rule 3 named-depth-ladder
  decision). Currently parked in the `Not Planned` milestone (re-homed into
  render-mode lowering); unblocking sections means scheduling it, or carving the
  narrower heading-level call out of it.
- **Interchange IX-Q1 — import coverage.** Gates Quarto/LaTeX import (the on-ramp).
- **Data model #166 / #168.** Gate the Data model epic's slices.
