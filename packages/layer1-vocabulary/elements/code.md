---
semantic_role: code
html_output:
  element: code
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    language:
      maps_to: 'class (as language-X)'
      notes: |
        The programming language of the code. Maps to a class like
        "language-python" for syntax highlighting via shiki/prism.
content:
  type: opaque
  becomes: text-content
  notes: |
    Code content is preserved verbatim. No markdown idioms or acadamark
    constructs are interpreted inside <code> elements.
content_handler: default
title_after_pipe: false
jats_counterpart:
  element: monospace
  notes: |
    JATS uses <monospace> for inline code-like content. For block-level
    code, JATS uses <code> wrapped in <preformat>. Acadamark's inline
    <code> maps to JATS <monospace>.
shorthand_examples:
  - source: 'The function is `factorial`.'
    layer1_html: '<p>The function is <code>factorial</code>.</p>'
    notes: |
      Plain markdown backticks produce inline <code>. The most common
      authoring path.
  - source: 'Use `<`code`>` for inline code.'
    layer1_html: '<p>Use <code>code</code> for inline code.</p>'
    notes: |
      The acadamark sigil form. Equivalent to plain markdown backticks
      but supports attributes.
  - source: '<code language=python | def hello(): print("hi")>'
    layer1_html: '<code class="language-python">def hello(): print("hi")</code>'
  - source: '<code #factorial-impl language=python | def factorial(n):>'
    layer1_html: '<code id="factorial-impl" class="language-python">def factorial(n):</code>'
interpreter_strategy: schema
---

# `<code>`

Inline code. A snippet of computer code, command, file path, or other text that should be rendered in a monospace font and treated as opaque source.

## Semantic intent

`<code>` represents inline code — short snippets within prose like function names, variable names, command-line invocations, file paths, or any other text that benefits from monospace rendering and is not subject to prose interpretation.

For block-level code (multi-line code listings), use the code sigil ` <```...```> ` or markdown's fenced code blocks.

## Authoring

**Plain markdown backticks (most common).**

```
The function is `factorial`.
```

Single backticks produce `<code>` via remark.

**Acadamark sigil form.**

```
The function is <`factorial`>.
```

Equivalent to backticks but uses acadamark's sigil syntax. Useful when you need attributes.

**Explicit form with attributes.**

```
<code language=python | factorial(5)>
```

Used when language identification (for syntax highlighting) or other attributes are needed.

## Content

Code content is opaque — preserved verbatim, with no markdown or acadamark interpretation. This means:

- Special characters (`<`, `>`, `*`, etc.) appear literally.
- No nested constructs are recognized.
- The content is whatever the author writes between the delimiters.

For block-level code with the same opacity, use the code sigil (`` <`code`> `` for single-line, `` <```code```> `` for multi-line).

## Attributes

`language` identifies the programming language for syntax highlighting. Maps to a class like `language-python`, which downstream syntax highlighters (shiki, prism) recognize.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<code>` (inline) | `<monospace>` |
| `<code>` (block, via sigil) | `<preformat><code>...</code></preformat>` |
| `language` kwarg | `language` attribute on the JATS code element |

## Render-mode lowering

`<code>` is HTML-native; no lowering needed.

## See also

- [`<pre>`](pre.md) — for preformatted code blocks (with `<code>` inside).
- The code sigil ` <`...`> ` and ` <```...```> ` — for inline and block code with shorthand syntax.
