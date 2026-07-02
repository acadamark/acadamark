---
semantic_role: lang
category: metadata
html_output:
  element: lang
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
    The document's primary language, typically as a BCP 47 / ISO 639-1
    language tag (e.g. "en", "en-US", "fr", "ja"). Free-form language
    names ("English", "French") are accepted but the tag form is
    preferred for machine readability.
jats_counterpart:
  element: '(no direct element; maps to xml:lang attribute)'
  notes: |
    JATS does not have a dedicated <lang> element. Language is expressed
    via the xml:lang attribute, typically on the <article> root or on
    <title-group> for language-specific titles. The exporter reads the
    value from <meta>'s <lang> and emits it as an xml:lang attribute on
    the appropriate JATS container — there is no <lang> element in the
    JATS output. Verified: JATS 1.3 uses xml:lang on the root element
    rather than a child element for the document's primary language.
shorthand_examples:
  - source: |
      <meta>
        <lang | en-US>
      </meta>
    layer1_html: |
      <meta>
        <lang>en-US</lang>
      </meta>
    notes: |
      BCP 47 language tag. The Layer 1 form preserves the value as a
      child element of <meta>; downstream consumers (the JATS exporter,
      the render-mode lowering) project it where each format expects.
  - source: '<meta lang="fr" />'
    layer1_html: |
      <meta>
        <lang>fr</lang>
      </meta>
    notes: |
      Kwarg-form authoring lifts to the child-tag form at the gate.
interpreter_strategy: schema
---

# `<lang>`

The document's primary language. Carries a language tag (preferably BCP 47 / ISO 639-1) that downstream consumers project to the appropriate format-specific construct.

## Semantic intent

`<lang>` records the document's primary language. Used by HTML's `<html lang="…">` attribute (for accessibility tools, browser hyphenation, search engines), JATS's `xml:lang` attribute, and any other format that distinguishes languages.

Enscribe records language as a Layer 1 *element* rather than an attribute because the apparatus-tag architecture treats `<meta>` content as structured child elements. Downstream lowerings project the value to whatever attribute or element the target format uses.

## Authoring

Two equivalent forms:

```
<meta>
  <lang | en-US>
</meta>
```

or:

```
<meta lang="en-US" />
```

BCP 47 / ISO 639-1 tags are preferred: `en`, `en-US`, `en-GB`, `fr`, `de`, `ja`, `zh-Hant`. Free-form language names ("English", "Spanish") are accepted but lose machine readability.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<lang>en-US</lang>` | `xml:lang="en-US"` attribute on the appropriate container (typically the `<article>` root) |

JATS does not have a dedicated `<lang>` element; language is an attribute. The exporter reads the `<lang>` value from `<meta>` and emits it as `xml:lang` on the appropriate container.

## Render-mode lowering

In render mode, the language becomes the HTML `<html lang="…">` attribute on the document root, enabling browser features that depend on language (hyphenation, screen reader pronunciation, etc.).

## See also

- [`<meta>`](meta.md) — the metadata wrapper that holds the language.
- [`<doi>`](doi.md), [`<license>`](license.md), [`<version>`](version.md), [`<keywords>`](keywords.md) — sibling document-metadata fields.
