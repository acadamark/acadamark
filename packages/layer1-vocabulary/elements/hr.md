---
semantic_role: hr
category: block-prose
html_output:
  element: hr
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-hr-type
      values: [scene-break, section-break, ornamental, decorative, other]
      notes: |
        Optional classification of the thematic break's role. Affects
        rendering (scene breaks render as blank space; ornamental breaks
        render with decorative characters or images).
content:
  type: none
  notes: |
    The hr element is void; it cannot contain content.
content_handler: default
jats_counterpart:
  element: hr
  notes: |
    JATS has no direct equivalent. The closest is using <break-quote-content>
    for similar visual effects, or simply relying on document structure.
    For enscribe-to-JATS export, hr elements are typically replaced with
    a structural break (an empty paragraph or visual marker) since JATS
    prefers explicit semantic structure over thematic breaks.
shorthand_examples:
  - source: '<hr>'
    layer1_html: '<hr />'
  - source: '<hr type=scene-break>'
    layer1_html: '<hr data-hr-type="scene-break" />'
  - source: |
      <p | First paragraph.>

      <hr type=ornamental>

      <p | Second paragraph after a thematic break.>
    layer1_html: |
      <p>First paragraph.</p>
      <hr data-hr-type="ornamental" />
      <p>Second paragraph after a thematic break.</p>
interpreter_strategy: schema
---

# `<hr>`

A thematic break — a horizontal rule indicating a shift in topic, scene, or section. Used to mark a boundary in the document where a more explicit structural element would be heavy-handed.

## Semantic intent

Use `<hr>` for genuine thematic breaks: a scene change in fiction, a topic shift in a long essay, an ornamental separator between sections. Do not use `<hr>` for purely decorative purposes (use CSS for that) or as a substitute for proper section structure.

The element is HTML-native, void (no content), and corresponds exactly to HTML5's `<hr>`.

## When to use

The classic use cases:

- **Scene breaks in fiction**: a moment when the narrative shifts to a different time, place, or perspective without warranting a new chapter.
- **Section breaks in essays**: a shift in topic or argument too small to deserve a `<section>` element of its own.
- **Ornamental separators**: visual breaks between content groups, often rendered with a decorative character or image.

For most academic writing, `<hr>` rarely appears. Section headings handle most structural breaks. The element is more common in fiction, essays, and editorial content.

## Content

The element is void. It has no content and no closing tag. The shorthand form `<hr>` produces a self-closing element directly.

## Attributes

`type` classifies the break's role:

- `scene-break` — narrative scene change.
- `section-break` — topic shift within an essay.
- `ornamental` — decorative break with visual flair.
- `decorative` — synonym for ornamental, mostly for clarity in author intent.
- `other` — anything not covered above.

The classification mostly affects styling. CSS rules can target `hr[data-hr-type="ornamental"]` to add decorative characters or images.

## JATS mapping

JATS has no direct equivalent of `<hr>`. The enscribe-to-JATS exporter handles this case by:

- Dropping the `<hr>` element if the type is `decorative` (purely visual; not semantically meaningful).
- Emitting an empty paragraph with a marker class for `scene-break` or `section-break` (preserving the structural intent).

The exporter's behavior is documented in the JATS export plugin; the choice is one of several places enscribe Layer 1 doesn't fully round-trip to JATS without information loss.

## Authoring patterns

**Simple thematic break.**

```
<hr>
```

**Scene break in fiction.**

```
First scene content.

<hr type=scene-break>

Second scene content.
```

**Ornamental break between essay sections.**

```
<p | The first part of the essay concludes here.>

<hr type=ornamental>

<p | The second part of the essay begins here.>
```

## Render-mode lowering

`<hr>` is HTML-native and doesn't need lowering. The `data-hr-type` attribute is preserved as-is for CSS targeting.

In default browser rendering, `<hr>` displays as a horizontal line. CSS can override this:

```css
hr[data-hr-type="ornamental"]::before {
  content: "❦ ❦ ❦";
  display: block;
  text-align: center;
}

hr[data-hr-type="scene-break"] {
  border: none;
  margin: 2em 0;
}
```

## See also

- [`<p>`](p.md) — for paragraph-level content separation (typically the better choice when there's actual content between).
- [`<section>`](section.md) — for substantial structural breaks deserving a heading.
