---
semantic_role: note
html_output:
  element: note
  is_html_native: false
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
    notes: |
      Auto-generated when not specified. Used as the target for cross-references
      and as the basis for note numbering.
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-note-type
      values: [substantive, technical, editorial, translator, other]
      default: substantive
      notes: |
        Optional classification. Most notes are substantive (authorial commentary).
        Other types appear in specific contexts (translator notes in translated works,
        editorial notes in scholarly editions).
    number:
      maps_to: data-note-number
      notes: |
        Override for the auto-assigned note number. Rarely used; default is
        sequential numbering based on document order.
    position:
      maps_to: data-note-position
      values: [foot, end, side, chapter-end, inline]
      notes: |
        Override the document-level note-position for this specific note.
        Inline keeps the note in-place rather than collecting it elsewhere.
content:
  type: prose
  becomes: children
content_handler: default
jats_counterpart:
  element: fn
  notes: |
    JATS uses <fn> for substantive footnotes regardless of position.
    The placement (foot of page, end of document, end of chapter) is
    a rendering decision, not a structural one. Acadamark follows this:
    <note> is the structural element; placement is determined by the
    document-level note-position setting and the placement plugin.
shorthand_examples:
  - source: 'Some text<note | A substantive note about the text.>.'
    layer1_html: 'Some text<note id="note-1">A substantive note about the text.</note>.'
    notes: |
      Notes are inline in the source, placed at the location where they
      logically belong to the surrounding prose. The id is auto-generated
      from the note's position in the document.
  - source: |
      The argument has empirical support<note |
      Multiple studies confirm this — see Smith 2019, Jones 2020, and Chen 2021
      for representative analyses.>.
    layer1_html: |
      <p>The argument has empirical support<note id="note-1">Multiple studies confirm this — see Smith 2019, Jones 2020, and Chen 2021 for representative analyses.</note>.</p>
    notes: |
      Multi-line note content. The note's pipe content is parsed as prose
      with normal markdown idioms.
  - source: 'A controversial claim<note position=inline | Note kept in place rather than collected.>.'
    layer1_html: 'A controversial claim<note id="note-1" data-note-position="inline">Note kept in place rather than collected.</note>.'
    notes: |
      The position kwarg overrides document-level placement for this note.
interpreter_strategy: schema
related_plugins:
  - name: acadamarkNoteNumbering
    runs_after: acadamarkTagInterpret
    purpose: 'Assigns sequential note numbers and generates reference markers. See notes/plugin-pipeline.md for the full pipeline.'
  - name: acadamarkNotePlacement
    runs_after: acadamarkNoteNumbering
    purpose: 'Moves notes to their rendered position per the document-level note-position setting. See notes/plugin-pipeline.md for the full pipeline.'

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

The `<note>` appears in the source where the author wants the note to attach. The actual rendered position (foot of page, end of document, side margin) is determined by the document-level `note-position` setting, not by where the author placed the source.

This separation means the same source produces different rendered outputs depending on configuration. A document with `note-position=foot` renders notes as page footnotes; the same document with `note-position=end` collects them as endnotes; with `note-position=side` they become side notes.

## Note numbering

Notes are numbered automatically based on document order. The `acadamarkNoteNumbering` plugin walks the document, finds notes in source order, and assigns sequential numbers. The number appears as a visible reference marker (typically a superscript) at the note's source location, and the note itself is labeled with the same number when displayed.

Authors who need to override numbering can specify the `number` kwarg, but this is rare.

## Placement

The document-level `note-position` setting (on `<article>`, `<book>`, or in `<meta>`) determines where notes appear in the rendered output:

| Value | Behavior |
|-------|----------|
| `foot` | Notes collect at the foot of each page (paged output). |
| `end` | Notes collect at the end of the document into a `<note-list>`. |
| `side` | Notes appear in the side margin near their reference point. |
| `chapter-end` | Notes collect at the end of each containing chapter. |

Individual notes can override the document-level setting via the `position` kwarg. The most useful override is `position=inline`, which keeps the note in place rather than collecting it elsewhere. This is occasionally useful for very short asides where collecting would interrupt the reading more than inlining.

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

| acadamark | JATS |
|-----------|------|
| `<note>` | `<fn>` |
| `<note id="...">` | `<fn id="...">` |
| `type` kwarg | `fn-type` attribute (when applicable) |

The cross-reference from prose to a note in JATS uses `<xref ref-type="fn" rid="...">`. Acadamark's `<ref>` produces this when the target is a note.

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

**Note kept inline despite document-level end-positioning.**

```
The claim is uncontroversial<note position=inline | At least, it is uncontroversial in the field.>.
```

In a document where most notes are end-positioned, this specific note stays in place.

## Render-mode lowering

`<note>` is a custom element. In render mode, the rendering depends on placement:

- `position=inline`: lower to `<span class="note">` containing the note text.
- `position=foot`: rendered by the print/CSS pipeline as page footnotes.
- `position=end`: collected by the placement plugin into a `<note-list>` at the document back-matter.
- `position=side`: rendered with CSS-grid or floating positioning.

The note's reference marker (the number that appears in the prose) is generated by the `acadamarkNoteNumbering` plugin and may be a `<sup>` or styled `<a>` depending on rendering mode.

## See also

- [`<note-list>`](note-list.md) — the container for collected end-notes (auto-generated).
- [`<cite>`](cite.md) — for bibliographic citations (different semantic role).
- [`<aside>`](aside.md) — for tangential content kept in place (different semantic intent).
- [`<ref>`](ref.md) — for cross-referencing notes by id.
