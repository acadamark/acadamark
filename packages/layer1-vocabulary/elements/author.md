---
semantic_role: author
html_output:
  element: author
  is_html_native: false
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    affiliation:
      maps_to: data-affiliation
      notes: |
        Author's institutional affiliation. Maps to JATS <aff> at export.
    orcid:
      maps_to: data-orcid
      notes: |
        Author's ORCID identifier (e.g., 0000-0000-0000-0000).
    email:
      maps_to: data-email
      notes: |
        Author's contact email address.
    corresponding:
      maps_to: data-corresponding
      values: ['true', 'false']
      notes: |
        Boolean flag for the corresponding author. JATS uses
        contrib corresp="yes" for the corresponding author.
content:
  type: prose
  becomes: children
  notes: |
    Author content can be either:
    - Simple: pipe-content as "Given Family" name string.
    - Structured: explicit child elements (<given-names>, <surname>, etc.).
content_handler: default
jats_counterpart:
  element: 'contrib contrib-type="author"'
  notes: |
    JATS uses <contrib contrib-type="author"> for authors. The structural
    JATS form uses <name><given-names>...</given-names><surname>...</surname></name>
    inside <contrib>. The exporter dispatches based on whether the acadamark
    <author> uses simple or structured form.
shorthand_examples:
  - source: '<author | Jane Goodall>'
    layer1_html: '<author>Jane Goodall</author>'
    notes: |
      Simple form. The pipe content is parsed as "Given Family" by JATS
      export heuristics (last word as surname). Most casual authoring
      uses this form.
  - source: '<author orcid=0000-0001-2345-6789 affiliation="Cambridge University" | Jane Goodall>'
    layer1_html: '<author data-orcid="0000-0001-2345-6789" data-affiliation="Cambridge University">Jane Goodall</author>'
    notes: |
      Simple form with attributes. Affiliation, ORCID, and email are
      attached as kwargs. The name still appears as pipe content.
  - source: |
      <author corresponding=true affiliation="Cambridge University">
        <given-names | Jane>
        <surname | Goodall>
        <email | jane@example.com>
      </author>
    layer1_html: |
      <author data-corresponding="true" data-affiliation="Cambridge University">
        <given-names>Jane</given-names>
        <surname>Goodall</surname>
        <email>jane@example.com</email>
      </author>
    notes: |
      Structured form. Used when authors need explicit given/surname
      separation, multiple email addresses, or other structured author
      metadata.
  - source: |
      <meta>
        <author | Jane Goodall>
        <author | David Attenborough>
        <author corresponding=true | Charles Darwin>
      </meta>
    layer1_html: |
      <meta>
        <author>Jane Goodall</author>
        <author>David Attenborough</author>
        <author data-corresponding="true">Charles Darwin</author>
      </meta>
    notes: |
      Multiple authors are sibling <author> elements. The third is the
      corresponding author. The structural plugin groups them in
      JATS export as <contrib-group>.
interpreter_strategy: schema
---

# `<author>`

A document author. Multiple authors are written as multiple sibling `<author>` elements inside `<meta>` (or chapter-level `<meta>` in edited volumes).

## Semantic intent

`<author>` represents one author of a document. Multiple authors are sibling elements; their order reflects authorship order (first author first, etc.).

The element is structured to support both casual and rigorous authoring:

- **Simple form**: pipe content is the author name. Sufficient for most papers.
- **Structured form**: explicit child elements for given name, surname, email, ORCID. Used when scholarly metadata requires precise structure.

## Authoring

**Simple form (most common).**

```
<author | Jane Goodall>
```

The pipe content is the full name. JATS export heuristics parse this as "given name(s) + surname" with the last word as surname. This works correctly for English-style names; non-English name conventions (where surname comes first) need the structured form.

**Simple form with attributes.**

```
<author orcid=0000-0001-2345-6789 affiliation="Cambridge University" | Jane Goodall>
```

Common metadata (affiliation, ORCID, email) attaches as kwargs. The name remains in the pipe content.

**Structured form.**

```
<author corresponding=true affiliation="Cambridge University">
  <given-names | Jane>
  <surname | Goodall>
  <email | jane@example.com>
</author>
```

Used when scholarly metadata requires explicit structure: non-English name conventions, multiple email addresses, multiple affiliations, or precise given/family name separation.

## Multiple authors

Multiple authors are sibling `<author>` elements. No explicit grouping required:

```
<meta>
  <author | Jane Goodall>
  <author | David Attenborough>
  <author | Charles Darwin>
</meta>
```

The JATS exporter wraps siblings in `<contrib-group>` automatically.

## Corresponding author

Mark the corresponding author with `corresponding=true`:

```
<author corresponding=true | Jane Goodall>
```

JATS export uses `corresp="yes"` on the contrib element. Tooling that needs to identify the corresponding author can find this attribute.

## Attributes

`affiliation` — institutional affiliation. Free-form text or a structured reference to a separate `<aff>` element (future).

`orcid` — ORCID identifier. The four-block dashed form (`0000-0000-0000-0000`).

`email` — contact email address.

`corresponding` — boolean flag. `true` marks this author as the corresponding author.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<author>` | `<contrib contrib-type="author">` |
| Simple form pipe content | `<name><given-names>...</given-names><surname>...</surname></name>` (parsed) |
| Structured form children | `<name>` with explicit `<given-names>` and `<surname>` |
| `affiliation` | `<aff>` (structured) or attribute |
| `orcid` | `<contrib-id contrib-id-type="orcid">` |
| `email` | `<email>` |
| `corresponding=true` | `corresp="yes"` attribute on `<contrib>` |

## Render-mode lowering

In render mode, `<author>` lowers to a `<span class="author">` or similar. The visible rendering shows the author name with affiliation and contact info as appropriate for the document type.

## See also

- [`<editor>`](editor.md) — for book editors (different role).
- [`<meta>`](meta.md) — the metadata wrapper that holds authors.
- `<given-names>`, `<surname>`, `<email>` — structured-form sub-elements (briefly documented within this entry; standalone entries can be added if richer documentation is needed).
