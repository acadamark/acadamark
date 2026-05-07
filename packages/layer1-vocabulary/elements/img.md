---
semantic_role: img
html_output:
  element: img
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    src:
      maps_to: src
      required: true
      notes: |
        URL of the image. Required.
    alt:
      maps_to: alt
      required: true
      notes: |
        Alternative text for accessibility. Required for images that
        convey meaning. Use empty alt="" for purely decorative images.
    width:
      maps_to: width
    height:
      maps_to: height
    title:
      maps_to: title
content:
  type: none
  notes: |
    The img element is void; it has no content. The alt text is set
    via the alt kwarg, not via content.
content_handler: default
title_after_pipe: false
jats_counterpart:
  element: graphic
  attributes:
    'xlink:href': from src
  notes: |
    JATS uses <graphic> for images, with xlink:href for the URL. The
    alt text maps to <alt-text> child element in JATS, not an attribute.
shorthand_examples:
  - source: '![An adult elephant](elephant.jpg)'
    layer1_html: '<img src="elephant.jpg" alt="An adult elephant" />'
    notes: |
      Plain markdown image syntax produces <img> elements via remark.
  - source: '<img src=elephant.jpg alt="An adult elephant">'
    layer1_html: '<img src="elephant.jpg" alt="An adult elephant" />'
  - source: '<img #elephant src=elephant.jpg alt="An adult African elephant" width=400>'
    layer1_html: '<img id="elephant" src="elephant.jpg" alt="An adult African elephant" width="400" />'
interpreter_strategy: schema
---

# `<img>`

An image embed. Inline reference to an image resource by URL.

## Semantic intent

`<img>` represents an image embedded in the document. The element is void (has no content); the image's source URL is in `src` and the accessibility text is in `alt`.

For captioned images that should be numbered as figures, wrap the image in `<figure>`. Bare `<img>` is for inline images that don't need captions or figure-style numbering — small icons, inline diagrams, decorative images.

## Authoring

**Plain markdown.**

```
![An adult elephant](elephant.jpg)
```

Standard markdown image syntax produces `<img>` via remark.

**Explicit form.**

```
<img src=elephant.jpg alt="An adult elephant">
```

Used when attributes beyond src and alt are needed.

**Captioned image.**

For images that should be numbered and captioned, use `<figure>`:

```
<figure src=elephant.jpg | An adult African elephant.>
```

The `<figure>` element handles caption generation and figure-series numbering. See the `<figure>` vocabulary entry.

## Attributes

`src` is the image URL. Required.

`alt` is alternative text for accessibility. Required for images that convey meaning. Use `alt=""` for purely decorative images that screen readers should ignore.

`width` and `height` set the image's display dimensions. Numeric values are interpreted as pixels.

`title` provides tooltip text on hover.

## Accessibility

The `alt` attribute is required for accessibility. Screen readers announce the alt text in place of the image. Authors should:

- Provide descriptive alt text for images that convey information.
- Use empty alt (`alt=""`) for decorative images that screen readers should skip.
- Avoid alt text like "image of..." or "picture of..."—just describe what's there.

For images with detailed captions where the caption already describes the image, the `<figure>` element is more appropriate than bare `<img>`. The figure's caption serves the same accessibility role as alt text.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<img src="..." alt="...">` | `<graphic xlink:href="..."><alt-text>...</alt-text></graphic>` |

JATS represents alt text as a child element rather than an attribute, so the exporter restructures appropriately.

## Render-mode lowering

`<img>` is HTML-native; no lowering needed.

## See also

- [`<figure>`](figure.md) — for captioned, numbered images.
- Plain markdown image syntax — the natural authoring path for simple images.
