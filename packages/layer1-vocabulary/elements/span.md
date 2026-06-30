---
semantic_role: span
category: inline-formatting
html_output:
  element: span
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    style:
      maps_to: style
      notes: |
        Inline CSS styles. Use sparingly; classes are usually preferable.
    title:
      maps_to: title
content:
  shape:
    contains: [inline]
  becomes: children
content_handler: default
jats_counterpart:
  element: styled-content
  notes: |
    JATS uses <styled-content> for generic styled inline content.
    The class attribute maps to JATS's style-type attribute.
shorthand_examples:
  - source: 'Some text <span .highlight | with highlighting> here.'
    layer1_html: '<p>Some text <span class="highlight">with highlighting</span> here.</p>'
  - source: 'Text with <span #key-phrase | a marked phrase> for reference.'
    layer1_html: '<p>Text with <span id="key-phrase">a marked phrase</span> for reference.</p>'
  - source: 'A <span .gloss title="ancient Greek for word" | logos> appears here.'
    layer1_html: '<p>A <span class="gloss" title="ancient Greek for word">logos</span> appears here.</p>'
interpreter_strategy: schema
---

# `<span>`

A generic inline container with no inherent semantic meaning. Used to apply attributes (id, class, style) to a span of text when no more specific element fits.

## Semantic intent

`<span>` is the inline equivalent of `<div>`: a wrapper element that carries no semantics by itself but lets authors attach attributes to a stretch of inline content.

Use `<span>` when:

- You need to apply a class for styling but no semantic element fits.
- You need an id for cross-referencing a specific phrase.
- You need to attach a title (tooltip) to inline text.
- You need to attach data attributes for downstream tooling.

If a more specific semantic element exists for what you're marking (`<em>` for emphasis, `<i>` for foreign words, `<cite>` for citations, `<code>` for code), use that instead. `<span>` is the fallback when nothing else fits.

## Authoring

`<span>` is reached for via the explicit form. There is no plain markdown shortcut.

```
The <span .technical | reproductive isolation> mechanism is well-documented.
```

## Attributes

Standard attributes: `id`, `class`, `style`, `title`. The `style` kwarg is supported but inline styles are generally discouraged in favor of classes plus CSS rules.

Authors can attach any data attribute via the kwargs mechanism (though for the schema-driven path, only the listed attributes have automatic mapping; arbitrary kwargs would need to be passed through, which may require schema extension).

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<span class="X">` | `<styled-content style-type="X">` |

JATS preserves styled inline content via `<styled-content>`. The mapping is reasonable but not perfect — `<span>` is less semantic in HTML than `<styled-content>` is in JATS.

## Render-mode lowering

`<span>` is HTML-native; no lowering needed.

## See also

- [`<em>`](em.md), [`<strong>`](strong.md), [`<i>`](i.md), [`<b>`](b.md) — for stylistic elements with semantic meaning.
- [`<code>`](code.md) — for inline code (a more specific element).
- [`<cite>`](cite.md) — for citations.
