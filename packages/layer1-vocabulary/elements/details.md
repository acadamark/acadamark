---
semantic_role: details
category: block-prose
semantic_family: aside
html_output:
  element: details
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    open:
      maps_to: open
      values: ['true', 'false']
      notes: |
        HTML's open attribute on <details>. When present, the disclosure
        is expanded by default. Either +open or open=true form works;
        absence (or -open / open=false) renders collapsed.
content:
  shape:
    - element: summary
      required: false
      contains: [inline]
    - element: __block__
      required: false
      multiple: true
      contains: [block]
  notes: |
    A <details> typically begins with a <summary> (the visible heading
    of the disclosure) and is followed by the body content that the
    summary controls. The body is arbitrary block content; the spec's
    shape marks it as __block__ rather than enumerating allowed
    elements (the body is genuinely open, parallel to <aside>'s prose
    content).
jats_counterpart:
  element: '(no direct JATS counterpart; HTML-native)'
  notes: |
    JATS has no disclosure/collapsible primitive. <details> is an
    HTML-native presentation construct for interactive disclosure of
    content. Recorded honestly as having no JATS counterpart, per the
    <lang> / <kbd> precedent. At JATS export the exporter must decide
    whether to flatten <details> (always-include the body) or drop it;
    the default expectation is to flatten — the body content is
    document-meaningful and should reach the JATS output regardless of
    the HTML-side interactive disclosure.
shorthand_examples:
  - source: |
      <details>
        <summary | More background>
        Additional context for the curious reader. The summary is the
        visible heading; this body shows when the disclosure is opened.
      </details>
    layer1_html: |
      <details>
        <summary>More background</summary>
        <p>Additional context for the curious reader. The summary is the visible heading; this body shows when the disclosure is opened.</p>
      </details>
    notes: |
      The canonical shape: a <summary> for the visible heading,
      followed by the disclosure body. The body is recursively parsed
      as prose / block content.
  - source: |
      <details +open>
        <summary | Always-expanded section>
        This disclosure is expanded by default.
      </details>
    layer1_html: |
      <details open>
        <summary>Always-expanded section</summary>
        <p>This disclosure is expanded by default.</p>
      </details>
    notes: |
      The +open boolean kwarg expands the disclosure by default.
      Maps to HTML's standard open attribute.
interpreter_strategy: schema
---

# `<details>`

A collapsible disclosure section. The browser renders the `<summary>` heading; clicking it toggles the body content's visibility.

## Semantic intent

`<details>` is HTML's native disclosure element — a small interactive widget that hides extra detail behind a clickable summary. Useful for optional context (an aside the reader can skip), spoiler-protected content, step-by-step reveals in tutorials, or any place where the document carries content that not every reader needs to see at once.

The element is HTML-native and renders interactively in the browser without any JavaScript. The `<summary>` child is the always-visible heading; the rest of the children form the body that the summary controls.

## Authoring

```
<details>
  <summary | More background>
  Additional context for the curious reader.
</details>
```

The natural shape is a `<summary>` for the visible heading, followed by the body content.

To open the disclosure by default, set `+open`:

```
<details +open>
  <summary | Always-expanded section>
  This shows expanded on initial render.
</details>
```

## Content

A `<details>` begins with a `<summary>` (recommended; HTML allows omission, in which case the browser shows a default "Details" heading). The remaining children form the body — arbitrary block content (paragraphs, lists, asides, code blocks, etc.).

## JATS mapping

`<details>` has **no direct JATS counterpart** — JATS does not have a disclosure / interactive-toggle construct. Recorded honestly per the `<lang>` / `<kbd>` precedent. The JATS exporter's expected behavior is to *flatten* a `<details>` at export — emit the `<summary>` content followed by the body content, dropping the disclosure mechanic but preserving the textual content. The exact JATS structure for flattening is an export-stage decision (a `<sec>` with the summary as title? a `<boxed-text>`? a `<p>` block?) — recorded as an export-time choice, not an authoring-time one.

## Render-mode lowering

`<details>` is HTML-native; no lowering needed. The browser renders the disclosure widget natively.

In render-mode lowering (the lossy lower to plain HTML), `<details>` may be preserved as-is (modern browsers all support it) or, in the strictest lowering, flattened to a `<section>` containing the summary as a heading and the body as content.

## See also

- [`<summary>`](summary.md) — the disclosure's visible heading.
- [`<aside>`](aside.md) — for tangential content that is always visible (no disclosure mechanic).
