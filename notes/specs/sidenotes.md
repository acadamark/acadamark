# Sidenotes — design (margin render mode)

## What it is

A sidenote is not new vocabulary. It is a **render mode** for the footnotes / notes enscribe already has: the note stays the same in the tree and exports to JATS exactly as it does today; only the HTML projection changes — the note's content renders **in the page margin, beside its reference**, instead of collected at the bottom of the document.

This follows the core split: semantics live in the tree (a note is a note), and "bottom vs margin" is a display choice. No new authoring construct, no new JATS, no change to how notes are written.

## Selecting it

A **document-level render option** (the existing render-mode / config surface), defaulting to today's bottom-of-document footnote rendering. It's a whole-document mode — every note renders in the margin — not a per-note marking. (Exact config key confirmed during the build.)

## Layout and render

- The footnote **marker stays inline** in the text, unchanged — same marker, same numbering as the existing footnote system.
- The note's **content renders in a wide margin column** (body column + margin column, the Tufte-style layout), added as one layout variant reusing enscribe's existing `.enscribe-layout--*` chrome.
- The note floats into the margin near its marker via CSS.

## Mobile

Below a breakpoint, sidenotes **fall back to the existing bottom-of-document footnote rendering** — notes return to the bottom, reusing the rendering that already exists. No new mobile UI.

## Alignment

For v1, CSS float places each note in the margin near its marker. **Precise top-alignment** (lining a note's top up exactly with its marker's line) needs JS measurement and is **deferred** — allowed under enscribe's no-no-JS stance, just not required to ship.

## Unchanged

- **Markers / numbering** — the existing footnote markers and numbering, reused as-is.
- **JATS / semantics** — a sidenote exports identically to a footnote; the margin placement is display-only and never reaches the archival channel.

## Deferred

- Precise JS top-alignment of each note to its marker.
- A tap-to-expand inline mobile mode (instead of the bottom-footnote fallback).
- Unnumbered margin *asides* as a distinct concept (separate from numbered notes), if ever wanted.
- 
