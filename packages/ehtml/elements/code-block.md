---
semantic_role: code-block
category: code
semantic_family: notation
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
  kwargs:
    src:
      notes: |
        An @id reference (Option A / #313) that pulls a stored <dataset> declared in
        <data> and renders its opaque bytes as the code block's verbatim body —
        e.g. <code-block src="@snippet"> renders <dataset #snippet python>…</dataset>.
        This is the WHITESPACE-SAFE home for multi-line code: because the body renders
        as <pre><code>, the pretty-printer preserves the author's indentation
        byte-for-byte (a bare <code src="@id"> renders inline and collapses it — a lint
        nudges authors here). The dataset's format hint, when the <code-block> names no
        language, seeds the language positional (language-X highlight class). An
        unresolved id — or a wrong-kind id (an image or external asset, not a <dataset>)
        — is a visible asset-error. Inline body (the sigil / <code-block …>…</code-block>)
        is unaffected. A file-path src is not read here (the handler reads no files);
        source a <dataset> instead.
content:
  notes: |
    The pipe content is verbatim code source. No markdown idioms or enscribe
    constructs are interpreted inside the code block. Newlines are preserved.
shorthand_examples:
  - source: '<``` python | print("hello, world") ```>'
    ehtml: '<pre><code class="language-python"> print("hello, world") </code></pre>'
    notes: |
      The triple-backtick sigil. The first positional token is the
      language (emitted as a `language-X` class on the <code>); the pipe
      separates it from the verbatim, whitespace-preserving content — the
      pipe-form padding (the spaces around the content) is KEPT, since
      whitespace in code is significant and visible to the reader. (#327)
  - source: '<``` this is all content ```>'
    ehtml: '<pre><code> this is all content </code></pre>'
    notes: |
      The no-pipe form: the entire body is opaque content with no language
      extraction.
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
