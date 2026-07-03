---
semantic_role: subject
category: metadata
semantic_family: declarations-and-metadata
html_output:
  element: subject
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    scheme:
      maps_to: data-subject-scheme
      notes: |
        Optional classification scheme this subject belongs to (e.g.
        "MSC2020" for the AMS Mathematics Subject Classification, "ACM"
        for ACM Computing Classification, "MeSH" for biomedical
        subjects). Identifies the controlled vocabulary the subject
        value is drawn from.
content:
  shape:
    contains: [inline]
  becomes: children
  notes: |
    The subject classifier as text — either a free-form topic ("ecology
    of large mammals") or a controlled-vocabulary identifier ("Q57.32")
    when the scheme kwarg names the vocabulary.
jats_counterpart:
  element: subject
  notes: |
    JATS uses <subj-group><subject>VALUE</subject></subj-group> inside
    <article-meta> to record document subjects. The exporter wraps
    <subject> in the appropriate <subj-group>, optionally setting
    subj-group-type from the scheme kwarg. Multiple <subject> elements
    are allowed for documents with multiple subject classifications.
shorthand_examples:
  - source: |
      <meta>
        <subject | Ecology of large mammals>
      </meta>
    layer1_html: |
      <meta>
        <subject>Ecology of large mammals</subject>
      </meta>
    notes: |
      Free-form subject. Common for general-interest documents.
  - source: |
      <meta>
        <subject scheme=MSC2020 | 92D40>
        <subject scheme=MSC2020 | 92D25>
      </meta>
    layer1_html: |
      <meta>
        <subject data-subject-scheme="MSC2020">92D40</subject>
        <subject data-subject-scheme="MSC2020">92D25</subject>
      </meta>
    notes: |
      Multiple subjects from a controlled vocabulary. The scheme
      identifies the classification system; the JATS exporter
      generates the appropriate <subj-group subj-group-type="..."> wrapper.
interpreter_strategy: schema
---

# `<subject>`

A document subject classifier. Records what the document is *about* in a more formal way than `<keywords>` — either as a free-form topic or as a controlled-vocabulary identifier.

## Semantic intent

`<subject>` records the document's subject. Two common modes:

- **Free-form subject**: a short topic phrase ("Ecology of large mammals", "Quantum field theory"). Useful for general-interest classification.
- **Controlled-vocabulary subject**: a code from a published classification scheme (MSC for mathematics, ACM for computing, MeSH for biomedical), identified by the `scheme` kwarg.

Compare with `<keywords>`: keywords are an author-chosen free-form list; subjects are more formal classifications, often drawn from controlled vocabularies, useful for indexing and search.

## Authoring

```
<meta>
  <subject | Ecology of large mammals>
</meta>
```

or with a scheme:

```
<meta>
  <subject scheme=MSC2020 | 92D40>
</meta>
```

Multiple `<subject>` elements are allowed for documents with multiple subject classifications.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<subject>VALUE</subject>` | `<subj-group><subject>VALUE</subject></subj-group>` (inside `<article-meta>`) |
| `<subject scheme=X>VALUE</subject>` | `<subj-group subj-group-type="X"><subject>VALUE</subject></subj-group>` |

The exporter constructs the wrapping `<subj-group>` and sets `subj-group-type` from the scheme kwarg when present.

## See also

- [`<keywords>`](keywords.md) — sibling document-classifier element; free-form author keywords.
- [`<meta>`](meta.md) — the metadata wrapper.
