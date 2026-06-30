---
semantic_role: inline-code
category: code
html_output:
  element: inline-code
  is_html_native: false
  notes: |
    The vocabulary entry key is "inline-code", but the rendered HTML does NOT
    use an <inline-code> wrapping element. The handler emits <code ...>
    directly, matching the output of markdown backtick spans. The element
    field is used only as a dispatch key for the interpreter.
enscribe_attributes:
  id:
    maps_to: id
    notes: |
      Placed on <code>. Used as cross-reference target.
  classes:
    maps_to: class
    notes: |
      Added to <code> alongside any language class.
content:
  notes: |
    The pipe content is verbatim code source. No markdown idioms or enscribe
    constructs are interpreted inside inline code.
shorthand_examples:
  - source: 'Assign with <` x = 1 `> at the top of the function.'
    layer1_html: '<p>Assign with <code>x = 1 </code>at the top of the function.</p>'
    notes: |
      The single-backtick sigil. With no pipe, the whole body is opaque
      code content rendered as <code> (the same output as a markdown
      backtick span). Whitespace in code is significant and preserved, so
      the pipe-form padding stays INSIDE the <code>. (#327)
  - source: 'Call <` python | factorial(n) `> to recurse.'
    layer1_html: '<p>Call <code class="language-python">factorial(n) </code>to recurse.</p>'
    notes: |
      The first positional token before the pipe is the language, emitted
      as a `language-X` class on the <code> (discoverable by highlighters;
      the interpreter applies no highlighting itself).
interpreter_strategy: handler
handler_module: ./handlers/inline-code.js
jats_counterpart:
  element: monospace
  notes: |
    JATS uses <monospace> for inline code-like content. If a language is
    specified, it is not directly representable in JATS monospace; the
    attribute is dropped on export.
---

# `<inline-code>`

Inline code sigil — an inline code span with optional language, id, and classes.
The content is verbatim code rendered as `<code>`.

## Authoring syntax

```
<` x = 1 `>
<` #my-snippet | x = 1 `>
<` python | factorial(n) `>
<` python #my-snippet .highlighted | factorial(n) `>
```

The first positional token is the optional language (produces `language-X` class).
The `#id` and `.class` tokens follow. The `|` pipe separates attributes from
content. If no pipe is present, the entire sigil body is treated as opaque
content with no language extraction.

## Relationship to `code.md`

`code.md` is the Layer 1 vocabulary entry for the `<code>` HTML element.
`inline-code.md` is the interpreter dispatch entry for the single-backtick
sigil. Both ultimately produce `<code>` in HTML; the separation allows the
sigil dispatch to use a handler while keeping `<code>` as a plain schema
element for direct Layer 1 authoring.

## Notes

- Inline code is not subject to syntax highlighting by default. The
  `language-X` class makes the element discoverable by shiki/prism if
  desired, but no highlighting is applied by the interpreter.
- Inline code does not have a block-level counterpart in this entry;
  use the code-block sigil or markdown fenced code blocks for multi-line code.
