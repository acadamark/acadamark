---
semantic_role: note-list
category: block-prose
# Generated output, never authored: notes auto-collect into <note-list> via the
# enscribeNotePlacement plugin — an author never types it. `output-only` excludes
# it from the authoring gallery entirely (contrast `authoring: generated`, which
# is shown there with a "generated" note because an authoring construct produces
# it). This element is output documentation only; it is not an authoring surface
# (#129). The runtime container and notes-collection are unaffected by this flag.
authoring: output-only
html_output:
  element: note-list
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-note-list-type
      values: [end-notes, chapter-notes, footnotes-collected, other]
      default: end-notes
content:
  shape:
    - element: note
      required: false
      multiple: true
      notes: |
        Notes are typically not authored directly inside <note-list>.
        They are placed there by the enscribeNotePlacement plugin
        based on each note's placement (end/foot) and the document's
        note-scope.
jats_counterpart:
  element: fn-group
  notes: |
    JATS uses <fn-group> as the container for collected footnotes.
    The mapping is direct.
interpreter_strategy: schema
generated_by:
  - plugin: enscribeNotePlacement
    when: |
      The document has notes with a collecting placement (end/foot).
      note-scope chooses the unit: "document" places one <note-list> in
      the back-matter, "chapter" one at the end of each chapter/book-part,
      "section" one per section.
---

# `<note-list>`

A container for collected notes. Used to gather end-notes, chapter-notes, or other note collections at a designated location in the rendered output.

## Semantic intent

`<note-list>` is the structural container that gathers `<note>` elements with a collecting `placement` (`end`/`foot`). `note-scope` chooses where they collect: one list in the back-matter (`document`), one per chapter (`chapter`), or one per section (`section`).

This element is **generated output, never authored** (#129). The `enscribeNotePlacement` plugin builds `<note-list>` from the document's `<note>`s based on their `placement` and the document's `note-scope`; an author never types it. It is documented here as a Layer 1 *output* element — for the JATS mapping and render-mode lowering below — not as an authoring surface. The authoring path is `<note>` (see [`<note>`](note.md)); the collection into `<note-list>` is automatic.

## Why it exists

Even though no author writes `<note-list>`, the element is a real structural part of Layer 1 because:

- It needs to appear in the rendered HTML (browsers and JATS export need a container for the collected notes).
- It needs to be the cross-reference target for note references that resolve to "see end-notes" or similar.

The default and only workflow is: write `<note>` inline in your source (notes default to `placement=end`); optionally set `note-scope`; the placement plugin collects the notes into a `<note-list>` automatically.

## Content

A `<note-list>` contains zero or more `<note>` elements. The notes inside have already been numbered by the time they appear here (the numbering plugin runs before the placement plugin).

## Attributes

`type` indicates the kind of note collection:

- `end-notes` — collected end-notes for an entire document.
- `chapter-notes` — collected notes for one chapter.
- `footnotes-collected` — page footnotes pulled into a single block (rare; some print layouts).
- `other` — anything not covered above.

This classification lets CSS and JATS export distinguish between different note collections within the same document.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<note-list>` | `<fn-group>` |
| `<note>` (inside `<note-list>`) | `<fn>` (inside `<fn-group>`) |
| `type` kwarg | `content-type` attribute on `<fn-group>` |

The mapping is direct. JATS's `<fn-group>` is the natural counterpart for collected notes.

## Generation (not authoring)

`<note-list>` is produced entirely by the `enscribeNotePlacement` plugin — there is no authoring form. The author writes `<note>` inline (see [`<note>`](note.md)); each note's `placement` and the document's `note-scope` drive collection; the plugin gathers the notes into a `<note-list>` at the back-matter location or per chapter/section. The container's `type` and `id` come from that placement step, not from authored markup. Because nothing is authored, `<note-list>` carries no `shorthand_examples` and is excluded from the authoring gallery (`authoring: output-only`).

## Render-mode lowering

`<note-list>` is a custom element. In render mode, it lowers to `<aside class="note-list">` or `<section class="note-list">`, depending on what semantic role makes the most sense in the surrounding document.

The `<note>` children inside lower according to their own render-mode rules, typically becoming `<li>` elements within an implicit list, with the note number as a leading marker.

## See also

- [`<note>`](note.md) — the individual note element.
- [`<bibliography>`](bibliography.md) — analogous container for collected bibliographic references (also typically auto-generated).
- [`<article>`](article.md), [`<book>`](book.md) — the containers whose `note-scope` setting governs how collected notes are grouped into `<note-list>`s.
