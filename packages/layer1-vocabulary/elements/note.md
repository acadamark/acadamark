---
semantic_role: note
category: block-prose
html_output:
  element: note
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
    notes: |
      Auto-generated when not specified. Used as the target for cross-references
      and as the basis for note numbering.
  classes:
    maps_to: class
  kwargs:
    placement:
      maps_to: data-note-placement
      values: [end, foot, side]
      default: end
      notes: |
        Determines where the note content is collected. "end" collects at
        article-back; "foot" collects at article-back (distinguished from "end"
        by CSS class on the note-list); "side" renders the content
        inline-adjacent to the marker. Document-wide default is "end".
    position:
      maps_to: data-note-placement
      values: [end, foot, side]
      notes: |
        Legacy alias for "placement" (same values, same data-note-placement
        output). Retained for backwards compatibility; "placement" is preferred
        for new documents.
    type:
      maps_to: data-note-type
      values: [substantive, technical, editorial, translator, other]
      default: substantive
      notes: |
        Optional classification. Most notes are substantive (authorial commentary).
content:
  type: prose
  becomes: children
content_handler: default
interpreter_strategy: schema
jats_counterpart:
  element: fn
  notes: |
    JATS uses <fn> for substantive footnotes regardless of position.
    The placement (foot of page, end of document, end of chapter) is
    a rendering decision, not a structural one.
shorthand_examples:
  - source: 'Some text<note | A substantive note about the text.>.'
    layer1_html: 'Some text<note id="note-1">A substantive note about the text.</note>.'
  - source: 'A claim<note placement=foot | A footnote.>.'
    layer1_html: '<p>A claim<note id="note-1" data-note-placement="foot">A footnote.</note>.</p>'
  - source: 'A definition<note placement=side | Inline-adjacent note.>.'
    layer1_html: '<p>A definition<note id="note-1" data-note-placement="side">Inline-adjacent note.</note>.</p>'
related_plugins:
  - name: enscribeNotes
    runs_after: enscribeSectionNesting
    purpose: |
      Assigns sequential numbers, replaces <note> nodes with markers,
      collects content into <note-list> at the appropriate location.
---

# `<note>`

A note is a substantive remark, qualification, or commentary that extends the main argument without belonging in the main flow. Substantive footnotes, endnotes, side notes, marginalia.


## Semantic intent

Use `<note>` for authorial content that deserves a place in the document but would interrupt the main argument if left inline. Common uses:

- Qualifications ("Though see X for a counterargument").
- Tangential observations ("This effect was first noted by Y in 1923").
- Technical details that interrupt the main flow ("The exact value depends on the measurement method").
- Editorial remarks in scholarly editions.
- Translator notes in translated works.

`<note>` is **not** for bibliographic citations rendered as footnotes. Citations use `<cite>`; the rendering style (inline author-year, inline numeric, footnote, endnote) is a citation-style concern handled by the citation resolver, not a use of `<note>`.

## Authoring

Notes are written inline at the location where they logically belong to the surrounding prose:

```
The claim has empirical support<note | Multiple studies confirm this — see Smith 2019, Jones 2020, and Chen 2021.>.
```

The `<note>` appears in the source where the author wants the note to attach. Where the note's content ends up — collected into a `<note-list>`, or set inline-adjacent in the margin — is determined by the note's `placement` (with the document's `note-scope`) and the document-level `note-position` render mode, not by where the author placed the source.

This separation means the same source produces different rendered outputs depending on configuration. A note with `placement=end` (the default) collects into the back-matter `<note-list>`; `placement=foot` marks it as a footnote (collected per the document's `note-scope` unit); `placement=side` renders it inline-adjacent as a sidenote. Independently, `note-position=margin` projects every numbered note into the page margin (Tufte sidenotes).

## Note numbering

Notes are numbered automatically based on document order. The `enscribeNoteNumbering` plugin walks the document, finds notes in source order, and assigns sequential numbers. The number appears as a visible reference marker (typically a superscript) at the note's source location, and the note itself is labeled with the same number when displayed.

Authors who need to override numbering can specify the `number` kwarg, but this is rare.

## Placement

Two independent settings govern where a note's content ends up.

**Per-note `placement`** — a kwarg on the individual `<note>` (`position` is a legacy alias). It selects the note's collection target:

| Value | Behavior |
|-------|----------|
| `end` (default) | Collected into the back-matter `<note-list>`. |
| `foot` | Marked as a footnote (note-list class `footnotes`); collected per the document's `note-scope` unit. |
| `side` | Rendered inline-adjacent to its marker as a sidenote. |

**Document-level `note-scope`** (`document` \| `chapter` \| `section`) chooses the collection *unit* for `end`/`foot` notes: one `<note-list>` at the document end, one per chapter, or one per section.

**Document-level `note-position`** (`bottom` default \| `margin`) is a separate render mode: `margin` projects every numbered note into the page margin (#33); `bottom` keeps them at the document foot. See [`<article>`](article.md) and [`<config>`](config.md).

True per-page paged footnotes (notes physically at the bottom of each printed page) need print pagination and are not yet built.

## Cross-referencing notes

Notes can be cross-referenced using `<ref>` and the note's id:

```
We addressed this concern earlier<note #methodology | Our methodology section explains the data collection procedure.>.

Later, we revisit the issue (see <ref methodology>).
```

The `id` on `<note>` is either author-supplied (as `#methodology` above) or auto-generated. Cross-references resolve to the note number in the rendered output.

## Attributes

`type` classifies the note's content:

- `substantive` — authorial commentary (default; usually omitted).
- `technical` — technical detail or qualification.
- `editorial` — editorial remark in a scholarly edition.
- `translator` — translator's note in a translated work.
- `other` — anything not covered above.

The classification mostly affects rendering. Different note types may render differently in print or use different visual markers.

`number` overrides the auto-assigned note number. Almost never needed; only for documents that need explicit non-sequential numbering.

`position` overrides the document-level placement for this specific note.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<note>` | `<fn>` |
| `<note id="...">` | `<fn id="...">` |
| `type` kwarg | `fn-type` attribute (when applicable) |

The cross-reference from prose to a note in JATS uses `<xref ref-type="fn" rid="...">`. Enscribe's `<ref>` produces this when the target is a note.

## Authoring patterns

**Inline substantive note.**

```
The result was striking<note | This was the most surprising finding of the study.>.
```

**Note with explicit id for cross-referencing.**

```
The methodology was rigorous<note #methodology | The procedure followed standard randomized controlled trial protocols.>.

We discuss this further in the methods section, building on the points outlined above (<ref methodology>).
```

**Note with type classification.**

```
The translation preserves the original metaphor<note type=translator | The original Greek phrase carries connotations not fully captured in English.>.
```

**Note set in the margin (sidenote) rather than collected.**

```
The claim is uncontroversial<note placement=side | At least, it is uncontroversial in the field.>.
```

In a document where most notes collect into the back-matter list, this specific note renders inline-adjacent in the margin instead.

## Render-mode lowering

`<note>` is a custom element. In render mode, the rendering depends on its `placement`:

- `placement=end` (default): collected by the placement plugin into a `<note-list>` at the document back-matter.
- `placement=foot`: collected per the document's `note-scope` unit; the `<note-list>` carries the `footnotes` class. (True per-page paged footnotes need print pagination — not yet built.)
- `placement=side`: rendered inline-adjacent to its marker as a sidenote (CSS float/grid).

The note's reference marker (the number that appears in the prose) is generated by the `enscribeNoteNumbering` plugin and may be a `<sup>` or styled `<a>` depending on rendering mode.

## See also

- [`<note-list>`](note-list.md) — the container for collected end-notes (auto-generated).
- [`<cite>`](cite.md) — for bibliographic citations (different semantic role).
- [`<aside>`](aside.md) — for tangential content kept in place (different semantic intent).
- [`<ref>`](ref.md) — for cross-referencing notes by id.
