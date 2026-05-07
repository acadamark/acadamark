---
semantic_role: aside
html_output:
  element: aside
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-aside-type
      values: [note, sidebar, callout, warning, tip, info, caution]
      notes: |
        Optional classification of the aside's role. Affects rendering
        (callouts get visual emphasis; sidebars get layout treatment).
        Maps to JATS via boxed-text content-type at export.
content:
  type: prose
  becomes: children
content_handler: default
title_after_pipe: false
jats_counterpart:
  element: 'notes or boxed-text'
  notes: |
    JATS uses different elements depending on type:
    - <notes> for footnote-style asides (typically document-level)
    - <boxed-text> for visually-distinct callouts
    The exporter dispatches based on the type kwarg; default (no type)
    maps to <boxed-text content-type="aside">.
shorthand_examples:
  - source: '<aside | A side note about the elephant.>'
    layer1_html: '<aside>A side note about the elephant.</aside>'
  - source: '<aside type=warning .important | Be careful here.>'
    layer1_html: '<aside data-aside-type="warning" class="important">Be careful here.</aside>'
  - source: |
      <aside type=callout |
      This is a multi-line callout.

      It can contain multiple paragraphs and other content like
      <strong | emphasis> and inline references.
      >
    layer1_html: |
      <aside data-aside-type="callout">
        <p>This is a multi-line callout.</p>
        <p>It can contain multiple paragraphs and other content like <strong>emphasis</strong> and inline references.</p>
      </aside>
interpreter_strategy: schema
---

# `<aside>`

An aside is content tangentially related to the surrounding prose — notes, sidebars, callouts, warnings, tips, tangential observations. Content the reader can skip without losing the main thread.

## Semantic intent

Use `<aside>` for any content the reader can skip without losing the main argument. Footnote-style remarks, sidebars commenting on the main text, callouts emphasizing important points, warnings or tips for the reader. The element is HTML-native and matches HTML5's semantic intent for `<aside>`.

The optional `type` kwarg classifies the aside, which:

- Affects styling (callouts get visual emphasis; sidebars get layout treatment).
- Determines JATS export (footnote-style asides become `<notes>`; callouts become `<boxed-text>`).
- Allows tooling to filter or enumerate (find all warnings; list all sidebars).

## Content

Asides contain prose. Like other prose-bearing elements, content is recursively parsed: nested acadamark constructs, markdown idioms, and inline elements all work normally.

Asides can be inline (single-line) or block-level (multi-line, multi-paragraph).

## Attributes

`type` indicates the aside's role:

- `note` — footnote-style commentary. Renders compactly; in JATS becomes `<notes>`.
- `sidebar` — layout sidebar; commentary running parallel to main text.
- `callout` — visually-distinct emphasized content.
- `warning` — alert about a potential problem.
- `tip` — suggestion or recommendation.
- `info` — informational note.
- `caution` — caution about a subtle issue.

If no type is specified, the aside renders as a generic aside without specific styling.

## JATS mapping

The mapping depends on the type:

| acadamark | JATS |
|-----------|------|
| `<aside>` (no type) | `<boxed-text content-type="aside">` |
| `<aside type=note>` | `<notes>` |
| `<aside type=sidebar>` | `<boxed-text content-type="sidebar">` |
| `<aside type=callout>` | `<boxed-text content-type="callout">` |
| `<aside type=warning>` | `<boxed-text content-type="warning">` |
| `<aside type=tip>` | `<boxed-text content-type="tip">` |
| `<aside type=info>` | `<boxed-text content-type="info">` |
| `<aside type=caution>` | `<boxed-text content-type="caution">` |

The JATS exporter handles the dispatch mechanically based on the type value.

## Authoring patterns

**Inline aside.**

```
<aside | A brief side note.>
```

**Aside with classification.**

```
<aside type=warning | This is a warning the reader should heed.>
```

**Multi-paragraph aside.**

```
<aside type=callout |
The first paragraph of the callout.

The second paragraph of the callout.
>
```

**Aside with id and classes.**

```
<aside #footnote-1 type=note .scholarly | Detailed scholarly note.>
```

## Render-mode lowering

`<aside>` is HTML-native and doesn't need lowering. The `data-aside-type` attribute is preserved as-is.

CSS rules can target `aside[data-aside-type="warning"]`, `aside[data-aside-type="callout"]`, etc. for visual distinction.

## See also

- [`<note>`](note.md) — for inline footnotes (single citations or brief remarks).
- [`<note-list>`](note-list.md) — for collected end-of-document notes.
- [`<blockquote>`](blockquote.md) — for quoted content (different semantic role).
