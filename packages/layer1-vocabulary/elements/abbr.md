---
semantic_role: abbr
category: inline-formatting
html_output:
  element: abbr
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    title:
      maps_to: title
      notes: |
        The abbreviation's expansion. Standard HTML <abbr title="..."> —
        browsers display the expansion as a tooltip on hover. Strongly
        recommended on first use of an abbreviation; optional on
        subsequent uses if the expansion is already in scope.
content:
  shape:
    contains: [inline]
  becomes: children
  notes: |
    The abbreviation as text — typically a short uppercase token
    (DOI, DOM, NASA, CSS, CRISPR). Inline elements may appear in the
    content though this is unusual.
content_handler: default
jats_counterpart:
  element: abbrev
  notes: |
    JATS uses <abbrev> with the expansion typically supplied either
    as the content of a child <def> element or as the title-like
    attribute, depending on the JATS version. The exporter maps
    enscribe's title kwarg to the JATS form the target schema expects.
shorthand_examples:
  - source: 'The <abbr title="Document Object Model" | DOM> is the browser API for HTML.'
    layer1_html: '<p>The <abbr title="Document Object Model">DOM</abbr> is the browser API for HTML.</p>'
    notes: |
      Standard pattern — abbreviation with its expansion as the title
      kwarg. Browsers show the expansion in a hover tooltip.
  - source: 'Using <abbr | CSS> selectors.'
    layer1_html: '<p>Using <abbr>CSS</abbr> selectors.</p>'
    notes: |
      Bare abbreviation, no title. Acceptable when the expansion
      has already been introduced earlier in the document.
interpreter_strategy: schema
---

# `<abbr>`

An abbreviation or acronym. HTML-native inline element. Carries the expansion as the `title` kwarg so browsers can display it on hover and assistive technology can announce it.

## Semantic intent

`<abbr>` marks abbreviations and acronyms (DOI, DOM, NASA, CSS, CRISPR). The semantic role is twofold:

- **Accessibility**: screen readers can announce the expansion, and visual browsers display it as a tooltip on hover.
- **Discoverability**: machine-readable expansion is preserved in the rendered output, useful for indexing and search.

Strongly recommend supplying `title` on first use of an abbreviation; optional on subsequent uses if the expansion is in scope.

## Authoring

```
The <abbr title="Document Object Model" | DOM> is the browser API for HTML.
```

The pipe content is the abbreviation as it appears in prose; the `title` kwarg is the expansion.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<abbr title="X">Y</abbr>` | `<abbrev>` with expansion carried as appropriate (varies by JATS version) |

## See also

- [`<term>`](term.md) — for a *term being introduced* (different semantic role from an abbreviation).
- [`<meta>`](meta.md) — abbreviations defined in metadata are a future possibility, currently scoped via document-glossary work.
