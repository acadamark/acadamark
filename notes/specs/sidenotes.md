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
- **Implementation:** the compiler copies each note's rendered content from the bottom `<note-list>` into a `<sidenote>` after its marker (the mdast tree is untouched), and injects the sidenote CSS as a scoped `<style>` **only in margin mode**. Default (bottom) output is therefore byte-identical — the mode adds nothing unless selected.

## Mobile

Below a breakpoint, sidenotes **fall back to the existing bottom-of-document footnote rendering** — notes return to the bottom, reusing the rendering that already exists. No new mobile UI.

## Alignment

For v1, CSS float places each note in the margin near its marker. **Precise top-alignment** (lining a note's top up exactly with its marker's line) needs JS measurement and is **deferred** — allowed under enscribe's no-no-JS stance, just not required to ship.

## Unchanged

- **Markers / numbering** — the existing footnote markers and numbering, reused as-is.
- **JATS / semantics** — a sidenote exports identically to a footnote; the margin placement is display-only and never reaches the archival channel.

## Placement — the note-list always finds a home (#406)

The default (`note-position=bottom`) collects a document's notes into one computed `<note-list>` placed in the back-matter region (`<article-back>` / `<book-back>`), or at an authored `<endnotes>` placement marker. A `<note-list>` is a render *product*, never authored (Rule 2), so it must always find a home — a note body is never dropped for want of one (always-renders). When a document has collected notes but **neither an `<article>` nor a `<book>` root** to hold a back-matter region — the three confirmed rootless shapes: a website master rendered directly, a standalone `<meta type=book-part>` chapter, and a root-level canonical `<book-part>` in an untyped document — the renderer **improvises a home at the document's end**, emitting the *same* `<note-list>` as the last element (not a parallel variant). This is not exempted by margin mode: margin notes still render a below-breakpoint fallback `<note-list>`, which lands in the improvised home too, so both the margin projection and the fallback survive.

An **empty note apparatus renders nothing**, not an empty shell. A document (or chapter) with zero notes emits no `<note-list>` — and any authored `<endnotes>` placement marker with nothing to place is swept so it never reaches output as a raw `<endnotes></endnotes>` (a placement marker must never render raw). This matches the by-design empty-apparatus suppression that an authored `<bibliography>` with zero resolved citations gets — empty apparatus stays invisible.

## Margin notes — `<note position=margin>` (#333)

A **margin note** is a note positioned in the margin — one note type, three positions (`foot`, `end`, `margin`), not a separate element. The former `<marginnote>` element was collapsed into `<note position=margin>` (#333); numbering is independent of position.

- **Construct.** `<note position=margin | body>` (equivalently `placement=margin`; `side` is a legacy alias). A margin note is a `<note>` like any other — numbered, collected, cross-referenceable.
- **Render.** Numbered and collected like any note (a `sidenote-fallback` list item is the below-breakpoint fallback), with its content **also** projected into the margin column beside its marker as a `<sidenote>` — per-note, independent of `note-position`. Above the breakpoint the margin copy floats into the gutter; below it, the copy hides and the bottom `<note-list>` shows.
- **The margin copy is phrasing content — a hard requirement, not a style choice.** The `<sidenote>` is injected *inside the host paragraph* (the inline float anchors the copy at the marker's line — the Tufte pattern), and a spec-conformant HTML parser force-closes an open `<p>` on any nested block start tag (the p-in-button-scope rule), closing the `<sidenote>` with it and **ejecting the note body into the main text column**. So the projection unwraps the copied paragraph(s) to their inline children (consecutive paragraphs joined by a double `<br>`), and the number runs into the note text on one line. A note body that still carries a block element after the unwrap (not producible by the note authoring surface today) is **not relocated** — it stays in the bottom `<note-list>`, with a `sidenote:block-content` warning (never a silent skip, never knowingly-invalid HTML). String-level tests cannot see this failure mode — the serialized HTML looks right and only a real parse destroys it — so the guard (`sidenote-parser-safety.test.js`) asserts DOM containment after a JSDOM parse.
- **JATS.** Position drives the element: `position=margin` → `<boxed-text content-type="marginnote">` at the marker position (the number rides as a `<label>`); `end`/`foot` → `<fn>`. Both round-trip (element → position; numbering is independent). See `note.md`.

The margin column (`.enscribe-layout--margin`) is shared by the document-level `note-position=margin` projection (every note) and per-note margin notes; a document establishes it whenever `applySidenotes` relocated at least one note into the column. Its CSS is injected only then, so a non-margin document is byte-identical.

## Deferred

- Precise JS top-alignment of each margin note to its marker.
- A tap-to-expand inline mobile mode (instead of the bottom-footnote fallback).
- Pixel-tuning the combined ToC + margin layout (it lays out without overlap today; precise spacing is a refinement).
