---
semantic_role: figure
html_output:
  element: figure
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    src:
      handled_by: handler
      notes: |
        URL of an image to embed. The handler generates an <img> child
        element from this kwarg. When src is present, the figure renders
        as an image with a caption.
    alt:
      handled_by: handler
      notes: |
        Alt text for the generated <img> when src is present. Recommended
        for accessibility but not required: when alt is not specified, the
        handler falls back to the figcaption text. Ignored when src is
        absent.
    align:
      maps_to: data-align
      values: [left, right, center, full-width]
      notes: |
        How the figure is positioned in the document flow. Affects
        rendering only; not exported to JATS.
    width:
      maps_to: data-width
      notes: |
        Suggested rendered width. Can be a CSS length (e.g., "300px",
        "50%") or a relative value.
    type:
      maps_to: data-figure-type
      values: [image, table, code, equation, diagram, multi-part, other]
      notes: |
        Optional classification of the figure's content. Maps to JATS
        fig content-type or to wrapping element choices.
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this figure participates in the document-wide figure
        sequence. Use +numbered (default) to number, -numbered to suppress.
        Can also be written as numbered=true / numbered=false.
        The config key number-figures=false suppresses all figures unless
        overridden per-element with +numbered.
content:
  type: prose
  becomes: figcaption
  notes: |
    The pipe content becomes a <figcaption> child of the figure. When
    the figure has an src kwarg, the figcaption appears alongside the
    auto-generated <img>. When no src is present, the figcaption appears
    alongside whatever the author placed inside the figure (a table,
    a code block, an equation, etc.).
content_handler: default
jats_counterpart:
  element: fig
  attributes:
    fig-type: from type
  notes: |
    JATS <fig> wraps <graphic> (the image) and <caption>. When src is
    present, the exporter generates <graphic xlink:href="..."> from the
    src kwarg. The figcaption becomes <caption>. The fig-type attribute
    maps from acadamark's type kwarg.
shorthand_examples:
  - source: '<figure src=elephant.jpg | An adult African elephant.>'
    layer1_html: |
      <figure>
        <img src="elephant.jpg" alt="An adult African elephant." />
        <figcaption>An adult African elephant.</figcaption>
      </figure>
    notes: |
      The simplest case. The src kwarg generates the <img>; the pipe
      content generates the figcaption. The alt text defaults to the
      figcaption text when not specified explicitly.
  - source: '<figure #elephant src=elephant.jpg align=right alt="A photograph of an elephant" | An adult African elephant photographed in Tanzania.>'
    layer1_html: |
      <figure id="elephant" data-align="right">
        <img src="elephant.jpg" alt="A photograph of an elephant" />
        <figcaption>An adult African elephant photographed in Tanzania.</figcaption>
      </figure>
  - source: |
      <figure #revenue-table type=table |
      <table>
        <tr><th>Quarter</th><th>Revenue</th></tr>
        <tr><td>Q1</td><td>$100M</td></tr>
        <tr><td>Q2</td><td>$120M</td></tr>
      </table>
      Quarterly revenue for fiscal year 2024.
      >
    layer1_html: |
      <figure id="revenue-table" data-figure-type="table">
        <table>
          <tr><th>Quarter</th><th>Revenue</th></tr>
          <tr><td>Q1</td><td>$100M</td></tr>
          <tr><td>Q2</td><td>$120M</td></tr>
        </table>
        <figcaption>Quarterly revenue for fiscal year 2024.</figcaption>
      </figure>
    notes: |
      A figure without src. The content (a table) is preserved as-is;
      the trailing line becomes the figcaption. Author convention is
      to put the caption text on its own line at the end of the content.
  - source: |
      <figure #algorithm type=code |
      <code python |
      def factorial(n):
          if n <= 1:
              return 1
          return n * factorial(n - 1)
      >
      A recursive implementation of the factorial function.
      >
    layer1_html: |
      <figure id="algorithm" data-figure-type="code">
        <pre><code class="language-python">def factorial(n):
          if n <= 1:
              return 1
          return n * factorial(n - 1)</code></pre>
        <figcaption>A recursive implementation of the factorial function.</figcaption>
      </figure>
interpreter_strategy: handler
handler_module: ./handlers/figure.js
handler_responsibilities:
  - Generate <img> child element when src kwarg is present.
  - Use alt kwarg as the img's alt attribute, or fall back to the figcaption text.
  - Wrap pipe content (or the trailing line of multi-content figures) as <figcaption>.
  - Preserve any non-caption content (tables, code blocks, equations) as direct children before the figcaption.
  - Handle the type kwarg by setting data-figure-type and potentially adjusting the wrapping.
---

# `<figure>`

A figure represents self-contained content referenced from the main flow — typically an image with a caption, but also tables, code blocks, equations, or any other content worthy of being captioned and numbered.

## Semantic intent

`<figure>` is HTML5's native element for captioned content. The semantic role aligns with academic writing's broad use of "figure" to mean any object outside the main text flow — images, tables, equations, diagrams, code listings.

The element does double duty:

- For images, `<figure>` wraps an `<img>` (auto-generated from the `src` kwarg) plus a `<figcaption>`.
- For non-image content (tables, code, equations), `<figure>` wraps the content plus a `<figcaption>`.

Both cases produce semantically rich HTML that browsers and screen readers handle natively.

## Why a handler strategy

The `<figure>` transformation cannot be expressed as pure schema:

- The `src` kwarg generates an `<img>` child element, not just an attribute on the output.
- The pipe content becomes a `<figcaption>` child, not children of the `<figure>` directly.
- Multi-content figures (image plus caption, table plus caption, code plus caption) require the handler to distinguish the captioned content from the caption text.
- The `alt` kwarg, when not specified, falls back to the figcaption text — this fallback logic lives in the handler.

The handler at `handlers/figure.js` constructs the appropriate child structure based on which attributes are present and what content the figure contains.

## Authoring patterns

**Image figure (the common case).**

```
<figure src=elephant.jpg | An adult African elephant.>
```

The `src` kwarg generates the `<img>`; the pipe content becomes the figcaption. If you don't specify `alt`, the figcaption text is used as the alt text — accessibility falls back to the visible caption.

**Image figure with explicit alt text.**

```
<figure src=elephant.jpg alt="A photograph of an adult elephant standing in tall grass" | An adult African elephant in Tanzania.>
```

When the alt text should be different from the visible caption (more detailed, more descriptive), set it explicitly with the `alt` kwarg.

**Image figure with id and styling.**

```
<figure #elephant src=elephant.jpg align=right width=400px | An adult African elephant.>
```

The `id` enables cross-referencing with `<ref elephant>`. The `align` and `width` kwargs control rendering layout.

**Table figure.**

```
<figure #revenue-table type=table |
<table>
  <tr><th>Quarter</th><th>Revenue</th></tr>
  <tr><td>Q1</td><td>$100M</td></tr>
  <tr><td>Q2</td><td>$120M</td></tr>
</table>
Quarterly revenue for fiscal year 2024.
>
```

A figure without `src`. The content includes whatever is being captioned (a table, in this case) followed by the caption text. The handler treats the trailing line as the caption.

**Code figure.**

```
<figure type=code |
<code python |
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
>
A recursive implementation of the factorial function.
>
```

Code listings as figures get numbered alongside other figures. The `type=code` classification lets renderers and the JATS exporter handle them appropriately.

**Equation figure.**

```
<figure #key-equation type=equation |
<$$ E = mc^2 $$>
Einstein's mass-energy equivalence.
>
```

Numbered equations are figures with `type=equation`. The math content is wrapped with a caption explaining the equation's significance.

## Attributes

`src` — image URL. When present, the handler generates an `<img>` child element. When absent, the figure's content is whatever the author placed inside (tables, code, equations).

`alt` — alt text for the generated image. Recommended for accessibility. When not specified and `src` is present, the handler falls back to the figcaption text.

`align` — `left`, `right`, `center`, or `full-width`. Layout positioning for the figure.

`width` — suggested rendered width. CSS length values or relative percentages.

`type` — classifies the figure's content for rendering and JATS export. Common values: `image` (default), `table`, `code`, `equation`, `diagram`, `multi-part`.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<figure>` | `<fig>` |
| `<figure src=foo.jpg>` | `<fig><graphic xlink:href="foo.jpg" /></fig>` |
| `<figcaption>` | `<caption>` |
| `type` kwarg | `fig-type` attribute |
| `align` kwarg | (preserved as data-align; not in JATS) |
| `width` kwarg | (preserved as data-width; not in JATS) |

The JATS exporter dispatches based on whether `src` is present:

- With `src`: emit `<fig>` containing `<graphic xlink:href="...">` and `<caption>`.
- Without `src`: emit `<fig>` containing the captioned content and `<caption>`. The content (table, code, equation) appears as JATS's structural element for that content type.

## Render-mode lowering

`<figure>` and `<figcaption>` are HTML-native and don't need lowering. Custom data attributes (`data-figure-type`, `data-align`, `data-width`) are preserved.

In render mode, the layout attributes can drive CSS:

```css
figure[data-align="right"] {
  float: right;
  margin-left: 1em;
}

figure[data-align="full-width"] {
  margin-left: -2em;
  margin-right: -2em;
}
```

## See also

- [`<table>`](table.md) — captioned tables can use figure wrapping with `type=table`.
- [`<code>`](code.md) — for code listings inside figures.
- [`<ref>`](ref.md) — for cross-referencing figures by id.
- [`<aside>`](aside.md) — for tangential content (figures are part of the main argument; asides are not).
