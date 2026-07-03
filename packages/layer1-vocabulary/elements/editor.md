---
semantic_role: editor
category: metadata
semantic_family: declarations-and-metadata
html_output:
  element: editor
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    affiliation:
      maps_to: data-affiliation
    orcid:
      maps_to: data-orcid
    email:
      maps_to: data-email
    role:
      maps_to: data-editor-role
      values: [editor, co-editor, series-editor, volume-editor, guest-editor, other]
      default: editor
content:
  shape:
    contains: [inline]
  becomes: children
  notes: |
    Same content model as <author>. Simple form (pipe content as name)
    or structured form (explicit child elements).
jats_counterpart:
  element: 'contrib contrib-type="editor"'
shorthand_examples:
  - source: '<editor | The Editor>'
    layer1_html: '<editor>The Editor</editor>'
  - source: '<editor role=series-editor affiliation="Cambridge University" | Jane Goodall>'
    layer1_html: '<editor data-editor-role="series-editor" data-affiliation="Cambridge University">Jane Goodall</editor>'
interpreter_strategy: schema
---

# `<editor>`

A document editor. Used in edited volumes (anthologies, conference proceedings, multi-author books) where the editor compiles content from multiple authors but isn't the primary author.

## Semantic intent

`<editor>` represents an editorial role distinct from authorship. Common in:

- **Edited volumes**: a book containing chapters by different authors, organized by an editor.
- **Conference proceedings**: papers compiled by program committee chairs.
- **Reference works**: encyclopedias, handbooks, dictionaries with editorial oversight.
- **Series-edited volumes**: works in a publisher's series where the series has its own editor distinct from individual volume editors.

The element follows the same structure as `<author>` — simple form for casual authoring, structured form for rigorous metadata.

## Authoring

```
<meta>
  <title | Selected Topics in Conservation Biology>
  <editor | Jane Goodall>
  <editor | David Attenborough>
</meta>
```

Multiple editors are sibling elements, like authors.

## Editor roles

The `role` kwarg distinguishes between editorial roles:

- `editor` — primary editor (default).
- `co-editor` — joint editor sharing primary responsibility.
- `series-editor` — editor of a publication series.
- `volume-editor` — editor of a specific volume in a series.
- `guest-editor` — guest editor for a special issue or volume.
- `other` — any other editorial role.

In edited volumes, the metadata typically includes the editor(s) at the book level, while individual chapters have their own authors:

```
<book document-type=edited-volume>
  <meta>
    <title | Selected Topics>
    <editor | The Editor>
  </meta>

  <chapter | First Topic>
  <author | First Topic Author>
  Content.

  <chapter | Second Topic>
  <author | Second Topic Author>
  Content.
</book>
```

## Attributes

Same as `<author>`: `affiliation`, `orcid`, `email`, plus `role` for editor type discrimination.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<editor>` | `<contrib contrib-type="editor">` |
| `role=series-editor` | `contrib-type="series-editor"` |
| `role=volume-editor` | `contrib-type="volume-editor"` |
| Other attributes | Same as `<author>` |

## Render-mode lowering

In render mode, `<editor>` lowers to a `<span class="editor">` or similar, with role and affiliation displayed as appropriate.

## See also

- [`<author>`](author.md) — for primary authorship (different role).
- [`<meta>`](meta.md) — the metadata wrapper.
