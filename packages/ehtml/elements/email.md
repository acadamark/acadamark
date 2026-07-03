---
semantic_role: email
category: metadata
semantic_family: declarations-and-metadata
html_output:
  element: email
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
    The email address as text (e.g. "jane@example.org"). No special
    parsing — the value passes through verbatim.
jats_counterpart:
  element: email
  notes: |
    JATS uses <email> inside <contrib> for author contact email.
    Direct one-to-one mapping.
shorthand_examples:
  - source: |
      <author>
        <name | Jane Goodall>
        <email | jane@example.org>
      </author>
    ehtml: '<author><name>Jane Goodall</name><email><a href="mailto:jane@example.org">jane@example.org</a></email></author>'
    notes: |
      Author contact email. Common in journal article metadata for
      the corresponding author (see also the +corresponding boolean
      kwarg on <author>).
interpreter_strategy: schema
---

# `<email>`

An author's contact email address. A sub-element of `<author>` carrying the email as a scalar value.

## Semantic intent

`<email>` records the author's contact email. Standard in scholarly publishing, particularly for the corresponding author. The element sits inside `<author>` as one of the rich-author-metadata sub-elements (parallel to `<affiliation>`, `<orcid>`).

## Authoring

```
<author>
  <name | Jane Goodall>
  <email | jane@example.org>
</author>
```

The value is the email address as text. No special parsing — it passes through verbatim.

## Corresponding-author marker

A separate `+corresponding` boolean kwarg on `<author>` marks an author as the corresponding contact (the JATS `corresp="yes"` convention). The two are independent: an author may have an `<email>` without being the corresponding author, and vice versa.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<email>jane@example.org</email>` | `<email>jane@example.org</email>` inside `<contrib>` |

Direct one-to-one mapping.

## Render-mode lowering

In render mode, the email typically displays in the author block as a `mailto:` link: `<a href="mailto:jane@example.org">jane@example.org</a>`.

## See also

- [`<author>`](author.md) — the parent element.
- [`<affiliation>`](affiliation.md), [`<orcid>`](orcid.md) — sibling rich-author-metadata elements.
