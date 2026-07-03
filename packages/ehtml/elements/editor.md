---
semantic_role: editor
category: structured-data-containers
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
    name:
      lifts_to_child: name
      notes: |
        The editor's name. Authored as a kwarg, lifted at the
        normalize-to-canonical gate to a <name> child tag. Equivalent
        to authoring <name | ...> inside the <editor>'s child-tag form.
    affiliation:
      lifts_to_child: affiliation
      notes: |
        Editor's institutional affiliation. Lifts to <affiliation>.
    orcid:
      lifts_to_child: orcid
      notes: |
        Editor's ORCID identifier. Lifts to <orcid>.
    email:
      lifts_to_child: email
      notes: |
        Editor's contact email address. Lifts to <email>.
    role:
      maps_to: data-role
      values: [editor, co-editor, series-editor, volume-editor, guest-editor, other]
      default: editor
      notes: |
        The editorial role — the one field that distinguishes an
        <editor> from an <author>. Both are the same structured
        contributor type (see notes/decisions.md "Contributor model",
        #338); the role is the differentiating label. A scalar: it
        stays a kwarg/attribute on the canonical eHTML <editor> and is
        NOT lifted to a child tag. Maps to data-role in HTML; JATS
        export uses it as the <contrib contrib-type="..."> value.
content:
  shape:
    - element: name
      required: false
      contains: [inline]
    - element: affiliation
      required: false
      multiple: true
    - element: orcid
      required: false
    - element: email
      required: false
      multiple: true
  notes: |
    <editor> is a structured-data-container tag, unified to <author>'s
    shape (#338): one structured contributor type, differentiated only by
    the role label. It accepts two equivalent authoring forms — kwargs
    (scalar fields) and child tags (structured fields). The
    normalize-to-canonical gate lifts the kwarg form (name / affiliation /
    orcid / email) to the canonical child-tag form; role stays a scalar
    attribute. The name is a single <name> child — no given/family split
    (a separate, later question, per the decision).
jats_counterpart:
  element: 'contrib contrib-type="editor"'
  notes: |
    JATS uses <contrib contrib-type="editor"> for editors, mirroring
    <author>'s <contrib contrib-type="author">. The role kwarg becomes
    the contrib-type value (role=series-editor -> contrib-type="series-editor").
    Enscribe's <name> is a single unparsed string; the exporter emits it
    as <string-name> (mirroring author's name-only contributor export).
    <affiliation>, <orcid>, <email> children have the same JATS
    counterparts as author's (<aff>, <contrib-id contrib-id-type="orcid">,
    <email>).
shorthand_examples:
  - source: '<editor | The Editor>'
    ehtml: '<editor>The Editor</editor>'
    notes: |
      Casual form — the pipe content is the editor's name (text content,
      not lifted to a <name> child), mirroring <author | ...>.
  - source: '<editor role=series-editor name="Jane Goodall" affiliation="Cambridge University" />'
    ehtml: '<editor data-role="series-editor"><name>Jane Goodall</name><affiliation>Cambridge University</affiliation></editor>'
    notes: |
      Kwarg form. name / affiliation / orcid / email lift to child tags at
      the gate (unified to <author>'s shape, #338); role stays a scalar
      attribute (data-role) — the one field that differs from <author>.
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

**Contributor model (#338, unified).** `<author>` and `<editor>` are one structured contributor type, differentiated only by role. The canonical shape is `<author>`'s child-tag form: `name` / `affiliation` / `orcid` / `email` lift to child elements at the normalize-to-canonical gate, and `role` stays a scalar attribute (`data-role`) — the one field that distinguishes an editor from an author. Editor's earlier flat `data-*` mapping (`data-affiliation`, `data-orcid`, `data-editor-role`, …) was the drift; it is retired. The name stays a single `<name>` (no `given`/`family` split — a separate, later question). See `notes/decisions.md` § "Contributor model".

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

Same structured fields as `<author>`: `name`, `affiliation`, `orcid`, `email` — authored as kwargs or child tags, lifted to child tags at the gate. Plus `role` (the editor's editorial role), the one scalar that distinguishes an editor from an author; it stays a `data-role` attribute, never a child.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<editor>` | `<contrib contrib-type="editor">` |
| `role=series-editor` (etc.) | `contrib-type="series-editor"` (the role becomes the contrib-type) |
| `<name>` child / pipe name | `<string-name>` |
| `<affiliation>` child | `<aff>` |
| `<orcid>` child | `<contrib-id contrib-id-type="orcid">` |
| `<email>` child | `<email>` |

Identical to `<author>`'s mapping (see [`<author>`](author.md)), except the contrib-type carries the editorial role.

## Render-mode lowering

In render mode, `<editor>` lowers to a `<span class="editor">` or similar, with role and affiliation displayed as appropriate.

## See also

- [`<author>`](author.md) — for primary authorship (different role).
- [`<meta>`](meta.md) — the metadata wrapper.
