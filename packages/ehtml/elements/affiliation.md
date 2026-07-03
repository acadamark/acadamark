---
semantic_role: affiliation
category: metadata
semantic_family: declarations-and-metadata
html_output:
  element: affiliation
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
    notes: |
      Optional id, useful for cross-referencing the affiliation from
      multiple <author> elements (e.g. <author><affiliation #aff1 | …>)
      and reusing the id with subsequent authors.
  classes:
    maps_to: class
content:
  shape:
    contains: [inline]
  becomes: children
  notes: |
    The affiliation as text — typically institution, department, city,
    country. Free-form short prose; inline elements (e.g. <i type=other>
    for italicized institution names) work normally.
jats_counterpart:
  element: aff
  notes: |
    JATS uses <aff> inside <contrib> (the JATS counterpart of <author>).
    Multiple authors sharing an affiliation reference it by id via
    <xref ref-type="aff" rid="...">; the exporter generates the xref
    structure from enscribe's affiliation ids.
shorthand_examples:
  - source: |
      <author>
        <name | Jane Goodall>
        <affiliation | Anthropic>
      </author>
    ehtml: |
      <author>
        <name>Jane Goodall</name>
        <affiliation>Anthropic</affiliation>
      </author>
    notes: |
      Simple author affiliation. The affiliation sits as a sub-element
      of <author>, parallel to other rich-author-metadata elements
      (<orcid>, <email>).
  - source: |
      <author>
        <name | Jane Goodall>
        <affiliation #aff1 | Anthropic, San Francisco, USA>
      </author>
      <author>
        <name | David Attenborough>
        <affiliation #aff1 />
      </author>
    ehtml: |
      <author>
        <name>Jane Goodall</name>
        <affiliation id="aff1">Anthropic, San Francisco, USA</affiliation>
      </author>
      <author>
        <name>David Attenborough</name>
        <affiliation id="aff1"></affiliation>
      </author>
    notes: |
      Shared affiliation. The id on the first affiliation lets
      subsequent authors reference the same one by id via a
      self-closing tag. JATS exporter generates the appropriate
      <xref ref-type="aff" rid="aff1"> structure.
interpreter_strategy: schema
---

# `<affiliation>`

An author's institutional affiliation. A sub-element of `<author>` carrying the institution, department, location, and any other affiliation details.

## Semantic intent

`<affiliation>` records where an author works or is affiliated. Standard parts of scholarly authorship metadata; required by journals and indexers.

The element sits *inside* `<author>` (parallel to `<name>`, `<orcid>`, `<email>`) rather than at `<meta>` level — affiliations are author-specific.

## Authoring

```
<author>
  <name | Jane Goodall>
  <affiliation | Anthropic, San Francisco, USA>
</author>
```

Free-form short prose. Typical content: institution, department, city, country. The exporter parses structured forms when supplying JATS but the authoring surface stays simple.

## Shared affiliations

When multiple authors share an affiliation, give the first `<affiliation>` an id; subsequent authors reference it by id via a self-closing tag:

```
<author>
  <name | Jane Goodall>
  <affiliation #aff1 | Anthropic, San Francisco, USA>
</author>
<author>
  <name | David Attenborough>
  <affiliation #aff1 />
</author>
```

## JATS mapping

| enscribe | JATS |
|---|---|
| `<affiliation>` (with content) | `<aff>` inside `<contrib>` |
| `<affiliation #aff1 />` (id-only reference) | `<xref ref-type="aff" rid="aff1">` inside `<contrib>` |

## See also

- [`<author>`](author.md) — the parent element.
- [`<orcid>`](orcid.md), [`<email>`](email.md) — sibling rich-author-metadata elements.
