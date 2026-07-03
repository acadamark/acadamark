---
semantic_role: orcid
category: metadata
semantic_family: declarations-and-metadata
html_output:
  element: orcid
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  shape:
    contains: [inline]
  becomes: children
  notes: |
    The ORCID identifier as text. The canonical form is the bare 16-digit
    ID with hyphens (e.g. "0000-0002-1825-0097"); URL form
    ("https://orcid.org/0000-0002-1825-0097") is also accepted but the
    bare form is preferred — tooling can construct the URL when needed.
jats_counterpart:
  element: contrib-id
  attributes:
    contrib-id-type: orcid
  notes: |
    JATS uses <contrib-id contrib-id-type="orcid">ID</contrib-id> inside
    <contrib>. The exporter constructs the contrib-id element with the
    contrib-id-type attribute set to "orcid" from the value in <orcid>.
shorthand_examples:
  - source: |
      <author>
        <name | Jane Goodall>
        <orcid | 0000-0002-1825-0097>
      </author>
    layer1_html: |
      <author>
        <name>Jane Goodall</name>
        <orcid>0000-0002-1825-0097</orcid>
      </author>
    notes: |
      Bare 16-digit ORCID — the canonical form.
  - source: |
      <author>
        <name | Jane Goodall>
        <orcid | https://orcid.org/0000-0002-1825-0097>
      </author>
    layer1_html: '<author><name>Jane Goodall</name><orcid><a href="https://orcid.org/0000-0002-1825-0097">https://orcid.org/0000-0002-1825-0097</a></orcid></author>'
    notes: |
      URL form is accepted but bare form is preferred.
interpreter_strategy: schema
---

# `<orcid>`

An author's ORCID identifier. A persistent identifier for researchers, used widely in scholarly publishing for author disambiguation.

## Semantic intent

`<orcid>` records the author's ORCID (Open Researcher and Contributor ID) — a 16-digit unique identifier issued by ORCID.org that disambiguates authors with the same or similar names across publications, datasets, and other research outputs.

The element sits inside `<author>` as one of the rich-author-metadata sub-elements (parallel to `<affiliation>`, `<email>`).

## Authoring

```
<author>
  <name | Jane Goodall>
  <orcid | 0000-0002-1825-0097>
</author>
```

The bare 16-digit form with hyphens is canonical. The URL form (`https://orcid.org/0000-0002-1825-0097`) is accepted but the bare form is preferred — downstream tooling can construct the URL when needed.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<orcid>0000-0002-1825-0097</orcid>` | `<contrib-id contrib-id-type="orcid">0000-0002-1825-0097</contrib-id>` inside `<contrib>` |

## See also

- [`<author>`](author.md) — the parent element.
- [`<affiliation>`](affiliation.md), [`<email>`](email.md) — sibling rich-author-metadata elements.
