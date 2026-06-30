---
semantic_role: endnotes
category: block-prose
authoring: generated
html_output:
  element: endnotes
  is_html_native: false
  default_attributes: {}
  notes: |
    <endnotes> is a placement MARKER: the note-placement plugin replaces it with the
    collected end-notes block (which renders as <note-list>). It is parallel to an
    author-placed <bibliography> — the author writes an empty <endnotes> where the
    notes should render; absent it, the collection lands at its default position.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  shape:
    - element: note
      required: false
      multiple: true
      notes: |
        When the block is rendered the collected notes appear here. Authors do not
        write these directly — the note-placement plugin populates the block.
content_handler: default
jats_counterpart:
  element: fn-group
  notes: |
    The collected end-notes map to a JATS <fn-group>. Per-chapter <endnotes> are an
    HTML display concern; JATS keeps its existing single note handling.
interpreter_strategy: schema
generated_by:
  - plugin: enscribeNotePlacement
    when: |
      The document has notes. The plugin collects notes (per-chapter in a book,
      document-level otherwise) and, when an <endnotes> marker is present, renders
      the collected block at the marker instead of the default position.
related_plugins:
  - name: enscribeNotePlacement
    runs_after: enscribeNotes
    purpose: 'Collects notes and places the rendered <note-list> block — at an <endnotes> marker when present, else at the default (chapter end / back-matter). See notes/specs/pipeline.md.'

---

# `<endnotes>`

The author's **placement marker** for the collected end-notes block. Notes auto-collect (the
collection is generated, not authored, #129); `<endnotes>` only controls *where* the collected
block renders — exactly parallel to an author-placed `<bibliography>`.

## Semantic intent

`<endnotes>` marks where the collected end-notes render. Absent the marker, the collection lands
at its default position: in a **book**, at the end of each chapter (per-chapter); in an
**article**, in `<article-back>`. Writing an empty `<endnotes>` relocates the block to that
position — and in a book, an `<endnotes>` authored **inside a chapter** renders **that chapter's**
collected notes there (the notes twin of per-chapter `split_bib`).

`<endnotes>` is parallel to `<note-list>`: the plugin populates the collected block. Authors don't
write the children directly. `<endnotes>` does not change *which* notes collect or their numbering
(project-wide) — only the rendered block's position. The per-note mode (`end` / `foot` / `side`)
and the `note-position` config are separate and unchanged.

## Authoring patterns

**Per-chapter (book).** A `<endnotes>` at a chapter's end renders that chapter's collected notes:

```
# Chapter One

Body text with a note.<note | A chapter note.>

<endnotes />
```

**Document-level.** A `<endnotes>` placed in the body relocates the whole collected block from
back-matter to that position; per-chapter and document-level markers may coexist.

## Auto-placement

If no `<endnotes>` marker is written, the note-placement plugin places the collected block
automatically — per-chapter at each chapter's end in a book, in `<article-back>` for an article.

## See also

- [`<note>`](note.md) — a single note (the per-note `placement` mode is separate from `<endnotes>`).
- [`<note-list>`](note-list.md) — the generated collection container `<endnotes>` renders.
- [`<bibliography>`](bibliography.md) — the citations-side parallel placement marker.
