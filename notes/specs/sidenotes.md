# Sidenotes — design (margin render mode)

## What it is

A sidenote is not new vocabulary. It is a **render mode** for the footnotes / notes enscribe already has: the note stays the same in the tree and exports to JATS exactly as it does today; only the HTML projection changes — the note's content renders **in the page margin, beside its reference**, instead of collected at the bottom of the document.

This follows the core split: semantics live in the tree (a note is a note), and "bottom vs margin" is a display choice. No new authoring construct, no new JATS, no change to how notes are written.

## Selecting it

A **document-level render option**, `note-position` — set as the `notePosition` render option or per document via `<config note-position=…>` (the option wins, mirroring `theme`). It reuses the existing reserved `note-position` config key. Values: **`bottom`** (default — today's foot-of-document footnotes) and **`margin`**. It's a whole-document mode — every note renders in the margin — not a per-note marking.

## Layout and render

- The footnote **marker stays inline** in the text, unchanged — same marker, same numbering as the existing footnote system.
- The note's **content renders in a wide margin column** (body column + margin column, the Tufte-style layout), added as one layout variant (`.enscribe-layout--margin`) reusing enscribe's existing `.enscribe-layout` / `.enscribe-body` chrome.
- The note floats into the margin near its marker via CSS.
- **Implementation:** the compiler copies each note's rendered content from the bottom `<note-list>` into a `<span class="enscribe-sidenote">` after its marker (the mdast tree is untouched), and injects the sidenote CSS as a scoped `<style>` **only in margin mode**. Default (bottom) output is therefore byte-identical — the mode adds nothing unless selected.

## Mobile

Below a breakpoint, sidenotes **fall back to the existing bottom-of-document footnote rendering** — notes return to the bottom, reusing the rendering that already exists. No new mobile UI.

## Alignment

For v1, CSS float places each note in the margin near its marker. **Precise top-alignment** (lining a note's top up exactly with its marker's line) needs JS measurement and is **deferred** — allowed under enscribe's no-no-JS stance, just not required to ship.

## Unchanged

- **Markers / numbering** — the existing footnote markers and numbering, reused as-is.
- **JATS / semantics** — a sidenote exports identically to a footnote; the margin placement is display-only and never reaches the archival channel.

## Marginnotes — `<marginnote>` (part 2)

A **marginnote** is a distinct construct from the numbered notes above: an **unnumbered aside authored in place**, set in the margin. It is *not* a variant of numbered notes — the numbering / bottom-list collection / sidenote-relocation machinery never touches it.

- **Construct.** `<marginnote | body>` — a canonical inline-form tag (the same `<tag | body>` finder as `<a URL | text>`; args before the pipe, body after). Canonical-only: no sigil and no markdown idiom, so it is inherently strict-safe (always interprets; nothing to ban under #36). Optional `#id`; body is inline content. ("marginnote" is not a CommonMark HTML-block name, so no grammar surgery — a normal vocab entry, keyed by its authoring tagname even though it renders to a shared element.)
- **Render.** In place as `<aside class="enscribe-marginnote">body</aside>` — no relocation pass (the body is already where it is authored). It floats into the **shared margin column** above the breakpoint and falls back to an inline-block aside below it. The margin column is established whenever a marginnote is present, **independent of `note-position`**.
- **JATS.** → `<boxed-text content-type="marginnote">…</boxed-text>` (JATS's sidebar/aside element; the `content-type` marks identity for round-trip). The inline body is wrapped in a `<p>` (boxed-text takes block content).
- **Uncounted.** Not registered as a note: numbering, the bottom list, and the numbered-note JATS are byte-identical whether or not a marginnote is present.

The margin column (`.enscribe-layout--margin`) is shared by sidenotes and marginnotes; a document establishes it if it relocates notes (`note-position=margin`) **or** contains a `<marginnote>`. Its CSS is injected only then, so a non-margin document is byte-identical.

## Deferred

- Precise JS top-alignment of each note (or marginnote) to its marker.
- A tap-to-expand inline mobile mode (instead of the bottom-footnote fallback).
- Multi-paragraph marginnote bodies and marginnote labels.
- Pixel-tuning the combined ToC + margin layout (it lays out without overlap today; precise spacing is a refinement).
