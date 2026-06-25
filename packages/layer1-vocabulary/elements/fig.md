---
semantic_role: figure
category: frameables
html_output:
  element: fig
  is_html_native: true
  default_attributes: {}
  notes: |
    Figures are HTML-shaped at Layer 1 (#147): the rendered Layer 1
    element is the HTML5-native `<figure>`. The figure handler
    (`handlers/figure.js`) hardcodes its output tagName to `'figure'`,
    so `is_html_native: true` describes that rendered element — the same
    way `<table>` / `<svg>` / `<aside>` are native handler-strategy
    frameables. `html_output.element` retains `fig` as the vocab key
    (the filename stem) and the interpreter's dispatch name: schema-
    strategy entries derive the output tagName from this field, but
    handler-strategy entries control the output tagName in the handler,
    so for `<fig>` this field is the keying signal only, not the
    rendered element. `fig` is also the JATS export target (see
    `jats_counterpart` below); `<figure>` is the canonical HTML /
    authoring name.
enscribe_attributes:
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

        Asset reference (#190): when src is `@id` it pulls in an asset
        declared inside `<data>`, either embedded —
        `<fig #id png>base64</fig>` (the format flag is one of png, jpg,
        jpeg, svg, gif, webp) — or external — `<fig #id src="path" />`. An
        embedded reference resolves to a `data:<mime>;base64,…` URI; an
        external one resolves to the declared path (rebased master-relative
        for a cross-file child) as a plain `<img src="path">`. The placed
        figure adopts the id, so it numbers and cross-references (`<ref @id>`)
        as that id; the `<data>` declaration itself renders nothing.
        Re-placing one asset is legitimate — each `<fig src="@id" />` renders
        and numbers, but only the first adopts the id (the cross-reference
        anchor); give a later placement its own `#id` to reference it. An
        unresolved `@id`, or an embedded format outside the list above,
        renders a visible asset-error rather than a broken image. Assets
        merge project-wide across an assembled document; the same id declared
        in two `<data>` blocks is last-wins with a visible collision flag.
        (JATS `<graphic>` export of assets is the remaining slice.)
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
    caption:
      handled_by: handler
      notes: |
        Optional caption text. The `caption=` kwarg lifts to a `<caption>`
        child tag at the normalize-to-canonical gate (caption-as-content) —
        the same way `<meta>` / `<author>` kwargs lift to their child tags —
        so a `<caption>` child can equivalently be authored directly. The
        figure handler also still accepts the legacy figure-as-pipe-caption
        form: when no `<caption>` child is present, the pipe content becomes
        the caption. (`title=` lifts to a `<title>` child the same way.)
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
    border:
      handled_by: handler
      default: false
      notes: |
        The frameable surface. When +border is set, the rendered
        <figure> gains the `frameable-border` class so theme stylesheets
        can draw the outline box per the frameable convention. Off by
        default.
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
    maps from enscribe's type kwarg.
shorthand_expansions:
  - shorthand: figure
    expands_to: fig
    notes: |
      `<figure>` is an accepted authoring alias for the canonical
      `<fig>`, recorded in `DESIGN.md` §"Frameable elements: a shared
      capability". The normalize-to-canonical gate rewrites
      `<figure>`-authored node tagnames to `fig` before downstream
      plugins run, so the entire pipeline below the gate sees the
      canonical name. Both shorthand_expansions (this vocab-level
      alias) and the gate rewrite exist together because they serve
      different needs: the vocab alias makes `<figure>` survive a
      bypass of the gate (defensive), and the gate rewrite ensures
      tagname-keyed downstream lookups (NUMBERED_TAGNAMES, handler
      routing) see the single canonical name.
shorthand_examples:
  - source: '<fig src=elephant.jpg | An adult African elephant.>'
    layer1_html: '<figure><img alt="An adult African elephant." src="elephant.jpg"><figcaption><span class="figure-label">Figure 1.</span> An adult African elephant.</figcaption></figure>'
    notes: |
      The simplest case. The src kwarg generates the <img>; the pipe
      content generates the figcaption. The alt text defaults to the
      figcaption text when not specified explicitly. The Layer 1
      element is HTML-native <figure> (not the custom-element <fig>)
      because the HTML rendering surface is the HTML5 native element
      while the enscribe canonical name follows JATS's shorter <fig>.
  - source: '<figure src=elephant.jpg | An adult African elephant.>'
    layer1_html: '<figure><img alt="An adult African elephant." src="elephant.jpg"><figcaption><span class="figure-label">Figure 1.</span> An adult African elephant.</figcaption></figure>'
    notes: |
      `<figure>` is the authoring alias. The normalize-to-canonical gate rewrites the
      tagname to `fig` early; the rendered output is the same.
  - source: '<fig #elephant src=elephant.jpg align=right alt="A photograph of an elephant" | An adult African elephant photographed in Tanzania.>'
    layer1_html: '<figure data-align="right" id="elephant"><img alt="A photograph of an elephant" src="elephant.jpg"><figcaption><span class="figure-label">Figure 1.</span> An adult African elephant photographed in Tanzania.</figcaption></figure>'
    notes: |
      The `id` enables cross-referencing with `<ref @elephant>` (or the
      canonical `<ref @fig:elephant>` colon-prefix form). Numbered by
      default; the figcaption gets a "Figure N." label span prepended.
  - source: |
      <fig #revenue-table type=table |
      <table>
        <tr><th>Quarter</th><th>Revenue</th></tr>
        <tr><td>Q1</td><td>$100M</td></tr>
        <tr><td>Q2</td><td>$120M</td></tr>
      </table>
      Quarterly revenue for fiscal year 2024.
      >
    layer1_html: '<figure data-figure-type="table" id="revenue-table"><figcaption><span class="figure-label">Figure 1.</span><table><caption><span class="table-label">Table 1.</span></caption><tbody><tr><th>Quarter</th><th>Revenue</th></tr><tr><td>Q1</td><td>$100M</td></tr><tr><td>Q2</td><td>$120M</td></tr></tbody></table><p>Quarterly revenue for fiscal year 2024.</p></figcaption></figure>'
    notes: |
      A figure without src. The content (a table) is preserved as-is;
      the trailing line becomes the figcaption. Author convention is
      to put the caption text on its own line at the end of the content.
interpreter_strategy: handler
handler_module: ./handlers/figure.js
handler_responsibilities:
  - Generate <img> child element when src kwarg is present.
  - Use alt kwarg as the img's alt attribute, or fall back to the figcaption text.
  - Wrap pipe content (or the trailing line of multi-content figures) as <figcaption>.
  - Preserve any non-caption content (tables, code blocks, equations) as direct children before the figcaption.
  - Handle the type kwarg by setting data-figure-type and potentially adjusting the wrapping.
  - When +border is set, add `frameable-border` to the rendered class list (the frameable surface).
  - Prepend "Figure N." label span to the figcaption when computedNumber is set (uses formatLabel helper).
---

# `<fig>`

A figure represents self-contained content referenced from the main flow — typically an image with a caption, but also tables, code blocks, equations, or any other content worthy of being captioned and numbered.

Under the HTML-shaped direction (#147), the canonical Layer 1 element for figures is the HTML-native `<figure>` — figures are the second migrated group after lists. This entry is keyed `fig`: the JATS-aligned name is retained as the vocab key, the interpreter's dispatch name, and the JATS export target, while `<fig>` and `<figure>` are both accepted authoring forms. Both authoring forms normalize to the same Layer 1 AST (the gate rewrites `<figure>` to the `fig` dispatch node) and render to the same HTML-native `<figure>`.

## Semantic intent

`<fig>` is the canonical academic-publishing "figure" — self-contained content set apart from the main flow with a caption. The semantic role aligns with academic writing's broad use of "figure" to mean any captioned object: images, tables, equations, diagrams, code listings.

The element does double duty:

- For images, `<fig>` wraps an `<img>` (auto-generated from the `src` kwarg) plus a `<figcaption>`.
- For non-image content (tables, code, equations), `<fig>` wraps the content plus a `<figcaption>`.

Both cases produce semantically rich HTML that browsers and screen readers handle natively. The rendered HTML uses HTML5's native `<figure>` element.

## The `<fig>` / `<figure>` names

`<figure>` is the canonical HTML-native Layer 1 element for figures (#147); `<fig>` is retained as the JATS-aligned name in three roles — the vocabulary key, the interpreter's dispatch name, and the JATS export target — and `<fig>` also stays an accepted authoring shorthand. The two names coexist because:

- HTML5 uses `<figure>` natively, so it is the natural canonical element under the HTML-shaped direction, and authors coming from HTML type it directly.
- JATS uses `<fig>` for the same element, so keeping `fig` as the export name and the internal key keeps the export close to pass-through.

The normalize-to-canonical gate rewrites authored `<figure>` to the `fig` dispatch node before any downstream plugin runs (the figure handler then emits HTML-native `<figure>`); the vocabulary entry's `shorthand_expansions` registers `<figure>` as an alias as a secondary safety net. Making the internal dispatch name follow the `<figure>` canonical is a deferred follow-on — it touches the gate's rewrite direction and the tagname-keyed lookups, so it is sequenced separately from this metadata/spec migration.

## Frameable membership

`<fig>` is a member of the frameable class. The shared frameable surface attributes are `id`, `title`, `caption`, `border`, `numbered`. For `<fig>` specifically, the body content is the captioned material (image, table, code, etc.), the caption appears in the `<figcaption>`, and the number is folded into the figcaption as a "Figure N." prefix.

## Why a handler strategy

The `<fig>` transformation cannot be expressed as pure schema:

- The `src` kwarg generates an `<img>` child element, not just an attribute on the output.
- The pipe content becomes a `<figcaption>` child, not children of the `<figure>` directly.
- Multi-content figures (image plus caption, table plus caption, code plus caption) require the handler to distinguish the captioned content from the caption text.
- The `alt` kwarg, when not specified, falls back to the figcaption text — this fallback logic lives in the handler.
- The "Figure N." label is prepended to the figcaption when the figure is numbered (the frameable number-folded-into-label rendering).

The handler at `handlers/figure.js` constructs the appropriate child structure based on which attributes are present and what content the figure contains.

## Authoring patterns

**Image figure (the common case).**

```
<fig src=elephant.jpg | An adult African elephant.>
```

Or the alias form:

```
<figure src=elephant.jpg | An adult African elephant.>
```

The `src` kwarg generates the `<img>`; the pipe content becomes the figcaption. If you don't specify `alt`, the figcaption text is used as the alt text — accessibility falls back to the visible caption.

**Image figure with explicit alt text.**

```
<fig src=elephant.jpg alt="A photograph of an adult elephant standing in tall grass" | An adult African elephant in Tanzania.>
```

When the alt text should be different from the visible caption (more detailed, more descriptive), set it explicitly with the `alt` kwarg.

**Image figure with id and styling.**

```
<fig #fig:elephant src=elephant.jpg align=right width=400px | An adult African elephant.>
```

The `id` enables cross-referencing with `<ref @fig:elephant>`. The `align` and `width` kwargs control rendering layout.

**Table figure.**

```
<fig #revenue-table type=table |
<table>
  <tr><th>Quarter</th><th>Revenue</th></tr>
  <tr><td>Q1</td><td>$100M</td></tr>
</table>
Quarterly revenue for fiscal year 2024.
>
```

A figure without `src`. The content includes whatever is being captioned followed by the caption text. The handler treats the trailing line as the caption.

## Attributes

`src` — image URL. When present, the handler generates an `<img>` child element.

`alt` — alt text for the generated image. Recommended for accessibility. When not specified and `src` is present, the handler falls back to the figcaption text.

`align` — `left`, `right`, `center`, or `full-width`. Layout positioning for the figure.

`width` — suggested rendered width. CSS length values or relative percentages.

`type` — classifies the figure's content for rendering and JATS export. Common values: `image` (default), `table`, `code`, `equation`, `diagram`, `multi-part`.

`+border` — opt-in frame outline box (the frameable surface). Off by default. When set, the rendered `<figure>` gains a `frameable-border` class.

`+numbered` / `-numbered` — controls participation in the document-wide figure sequence. On by default.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<fig>` | `<fig>` |
| `<fig src=foo.jpg>` | `<fig><graphic xlink:href="foo.jpg" /></fig>` |
| `<figcaption>` | `<caption>` |
| `type` kwarg | `fig-type` attribute |
| `align` kwarg | (preserved as data-align; not in JATS) |
| `width` kwarg | (preserved as data-width; not in JATS) |
| `+border` flag | (preserved as data attribute; not in JATS) |

The JATS exporter dispatches based on whether `src` is present:

- With `src`: emit `<fig>` containing `<graphic xlink:href="...">` and `<caption>`.
- Without `src`: emit `<fig>` containing the captioned content and `<caption>`.

## Render-mode lowering

`<fig>` renders as HTML-native `<figure>` and `<figcaption>` — no lowering needed. Custom data attributes (`data-figure-type`, `data-align`, `data-width`) and the optional `frameable-border` class are preserved.

In render mode, the layout attributes can drive CSS:

```css
figure[data-align="right"] {
  float: right;
  margin-left: 1em;
}

figure.frameable-border {
  border: 1px solid #ccc;
  padding: 1em;
}
```

## Design context

The kwarg-vs-child-tag decision for captions follows two `DESIGN.md`
directions (§"Design directions (discovered through implementation)"):

- **"Content gets parsed; arguments don't"** — a `caption="..."`
  containing rich content (citations, math) is content wearing an
  argument's clothing and must be parsed as such.
- **"Caption-bearing elements support two equivalent forms"** — both
  the compact form (`caption="..."` kwarg) and the explicit form
  (`<caption>...</caption>` child) produce identical output. An earlier change implemented the kwarg-form lift to child-tag at the
  normalize-to-canonical gate via `liftFrameableKwargs` backed by
  the `FRAMEABLE_LIFTABLE` registry. For `<fig>` (non-opaque-content
  frameable), the lift fires fully; the handler reads the lifted
  `<caption>` child via `extractFrameableChildren`.

The frameable shared surface itself (id, title, caption, border,
numbered) is the design recorded in `DESIGN.md`
§"Frameable elements: a shared capability".

## See also

- [`<svg>`](svg.md) — inline SVG, also frameable.
- [`<frame>`](frame.md) — the generic frameable wrapper for arbitrary content.
- [`<table>`](table.md) — captioned tables, also frameable.
- [`<code>`](code.md) — for code listings inside figures.
- [`<ref>`](ref.md) — for cross-referencing figures by id.
- [`<aside>`](aside.md) — for tangential content (figures are part of the main argument; asides are not).
