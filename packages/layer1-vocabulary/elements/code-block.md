---
semantic_role: code-block
html_output:
  element: code-block
  is_html_native: false
  notes: |
    The vocabulary entry key is "code-block", but the rendered HTML does NOT
    use a <code-block> wrapping element. The handler emits <pre><code ...>
    directly, matching the output of markdown fenced code blocks. The element
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
  type: opaque
  notes: |
    The pipe content is verbatim code source. No markdown idioms or enscribe
    constructs are interpreted inside the code block. Newlines are preserved.
interpreter_strategy: handler
handler_module: ./handlers/code-block.js
jats_counterpart:
  element: code
  notes: |
    JATS <code> inside <preformat> for block code. The language attribute
    maps to the JATS language attribute on <code>. Equation numbering and
    cross-references are handled separately.
---

# `<code-block>`

Block code sigil — a fenced code block with optional language, id, and classes.
The content is verbatim code rendered as `<pre><code>`.

## Authoring syntax

```
<``` python | x = 1 + 2 ```>
<``` python #code:example | def f(): return 1 ```>
<``` python .highlighted | print("hello") ```>
```

The first positional token is the language. The `#id` and `.class` tokens follow.
The `|` pipe separates attributes from content. If no pipe is present, the entire
sigil body is treated as opaque content with no language extraction.

## Rendered output

```html
<pre><code class="language-python" id="code:example">def f(): return 1</code></pre>
```

Id and classes are placed on `<code>`, not `<pre>`. The language class
(`language-X`) is added before any sigil-provided classes.

## No-pipe form

```
<``` this is all content ```>
```

renders as:

```html
<pre><code>this is all content</code></pre>
```

No language extraction occurs. If you want a language, use the pipe form.
