---
semantic_role: code
category: code
semantic_family: notation
html_output:
  element: code
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
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
    src:
      notes: |
        An @id reference (#313 consumer wiring) that pulls a stored <dataset>
        declared in <data> and renders its opaque bytes as the verbatim code body
        — e.g. <code src="@snippet"> renders the <dataset #snippet python>…</dataset>
        as a code listing. The bytes render verbatim (opaque end to end — a #, *, or
        < in the stored code is never markdown-parsed); the dataset's format hint,
        when the <code> names no language, seeds the language-X highlight class (a
        display hint only). An unresolved id — or a wrong-kind id (an image or
        external asset, not a <dataset>) — is a visible asset-error. Inline body
        (<code | …>) is unaffected. A file-path src is not read here (the code
        handler reads no files); source a <dataset> instead.
content:
  becomes: text-content
  notes: |
    Code content is preserved verbatim. No markdown idioms or enscribe
    constructs are interpreted inside <code> elements.
jats_counterpart:
  element: monospace
  notes: |
    JATS uses <monospace> for inline code-like content. For block-level
    code, JATS uses <code> wrapped in <preformat>. Enscribe's inline
    <code> maps to JATS <monospace>.
shorthand_examples:
  - source: 'The function is `factorial`.'
    ehtml: '<p>The function is <code>factorial</code>.</p>'
    notes: |
      Plain markdown backticks produce inline <code>. The most common
      authoring path.
  - source: 'Use `<`code`>` for inline code.'
    ehtml: '<p>Use <code>&#x3C;</code>code<code>></code> for inline code.</p>'
    notes: |
      The enscribe sigil form. Equivalent to plain markdown backticks
      but supports attributes.
  - source: '<code language=python | def hello(): print("hi")>'
    ehtml: '<code class="language-python">def hello(): print("hi")</code>'
  - source: '<code #factorial-impl language=python | def factorial(n):>'
    ehtml: '<code id="factorial-impl" class="language-python">def factorial(n):</code>'
interpreter_strategy: handler
handler_module: ./handlers/code.js
handler_responsibilities:
  - Pull the opaque content string from `node.content`.
  - Honor the `language` kwarg (mapped to a `language-X` class for
    downstream syntax highlighters).
  - Apply id / classes on the rendered `<code>` element.
  - Emit a `<code>` element with the code text as a single text child.
  - Mirrors handlers/inline-code.js's shape so long-form and sigil
    forms produce consistent output.
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

**Enscribe sigil form.**

```
The function is <`factorial`>.
```

Equivalent to backticks but uses enscribe's sigil syntax. Useful when you need attributes.

**Explicit form with attributes.**

```
<code language=python | factorial(5)>
```

Used when language identification (for syntax highlighting) or other attributes are needed.

## Content

Code content is opaque — preserved verbatim by the parser (contentHandler: "code"), with no markdown or enscribe interpretation. This means:

- Special characters (`<`, `>`, `*`, etc.) appear literally.
- No nested constructs are recognized.
- The content is whatever the author writes between the delimiters.

For block-level code with the same opacity, use the code sigil (`` <`code`> `` for single-line, `` <```code```> `` for multi-line).

## Attributes

`language` identifies the programming language for syntax highlighting. Maps to a class like `language-python`, which downstream syntax highlighters (shiki, prism) recognize.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<code>` (inline) | `<monospace>` |
| `<code>` (block, via sigil) | `<preformat><code>...</code></preformat>` |
| `language` kwarg | `language` attribute on the JATS code element |

## Render-mode lowering

`<code>` is HTML-native; no lowering needed.

## See also

- [`<code-block>`](code-block.md) — for preformatted, multi-line code blocks (renders as `<pre><code>`).
- The code sigil ` <`...`> ` and ` <```...```> ` — for inline and block code with shorthand syntax.
