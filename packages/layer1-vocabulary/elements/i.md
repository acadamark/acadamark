---
semantic_role: i
html_output:
  element: i
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-italic-type
      values: [foreign, taxonomic, technical, thought, ship-name, other]
      notes: |
        Optional classification of the italic's role. Useful for
        accessibility tools and stylesheet targeting.
content:
  type: prose
  becomes: children
content_handler: default
jats_counterpart:
  element: italic
  attributes:
    toggle: 'no'
  notes: |
    JATS uses <italic toggle="no"> for italics that assert italic state
    rather than toggling relative to context. This matches <i>'s semantic
    role: a stylistic distinction without emphasis.
shorthand_examples:
  - source: 'The species is <i type=taxonomic | Loxodonta africana>.'
    layer1_html: '<p>The species is <i data-italic-type="taxonomic">Loxodonta africana</i>.</p>'
  - source: 'The French <i type=foreign | tour de force> is impressive.'
    layer1_html: '<p>The French <i data-italic-type="foreign">tour de force</i> is impressive.</p>'
  - source: 'The technical term <i type=technical | mitochondria> refers to organelles.'
    layer1_html: '<p>The technical term <i data-italic-type="technical">mitochondria</i> refers to organelles.</p>'
interpreter_strategy: schema
---

# `<i>`

Italic styling without semantic emphasis. Used for content that conventionally appears in italic — foreign words, biological taxa, technical terms being introduced, ship names, fictional thoughts, alternate voice or mood.

## Semantic intent

`<i>` represents content that is *stylistically distinct* from surrounding prose without carrying emphatic stress. HTML5 redefined the element from its original "italic visual styling" role into a meaningful semantic role: alternate voice, mood, or convention.

Common cases:

- **Foreign words and phrases**: `<i type=foreign | tour de force>`.
- **Biological taxa**: `<i type=taxonomic | Loxodonta africana>`.
- **Technical terms being introduced**: `<i type=technical | mitochondria>` (the first time the term appears in a document).
- **Ship names**: `<i type=ship-name | HMS Beagle>`.
- **Fictional or internal thoughts**: `<i type=thought | I wonder what's for dinner>`.

For semantic emphasis (stress on a word in a sentence), use `<em>` instead. The visual rendering is the same; the meaning is different.

## When to choose `<i>` vs `<em>`

The distinction matters for accessibility and for downstream tooling:

- `<em>` says "the reader should stress this word." Screen readers may apply vocal emphasis. Search and indexing tools may treat the content as significant.
- `<i>` says "this content is conventionally italic for a reason that isn't emphasis." Screen readers don't apply vocal stress. The italic is a typographic convention, not a meaning marker.

Most authors should default to `<em>` (or markdown's `*emphasis*`) for ordinary stress and reach for `<i>` only when the conventional italic-without-emphasis pattern applies.

## Authoring

`<i>` is reached for via the explicit form. Plain markdown's `*...*` produces `<em>`, not `<i>`.

```
The species <i type=taxonomic | Loxodonta africana> is the largest.
```

The `type` kwarg classifies the italic's role for tooling and accessibility.

## Attributes

`type` indicates the conventional reason for italics:

- `foreign` — foreign words or phrases.
- `taxonomic` — biological genus and species names.
- `technical` — technical terms being introduced or specially marked.
- `thought` — internal thoughts in fiction.
- `ship-name` — names of ships, vessels, spacecraft.
- `other` — any other conventional italic use.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<i>` | `<italic toggle="no">` |

The `toggle="no"` indicates the italic state is asserted, not toggled — italic content stays italic even inside an italic context.

## Render-mode lowering

`<i>` is HTML-native; no lowering needed. The `data-italic-type` attribute is preserved for stylesheet targeting.

## See also

- [`<em>`](em.md) — for semantic emphasis (the default for stressed text).
- [`<b>`](b.md) — analogous element for bold-without-importance.
