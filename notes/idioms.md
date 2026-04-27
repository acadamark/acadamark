# Acadamark Idioms and the Delegation Principle

Acadamark contributes the parts no existing parser owns: the tagged shorthand, the Layer 1 vocabulary, and the JATS bridge. Everything else is delegated.

## Position

Acadamark is not markdown plus extensions. It is a Layer 1 HTML conventions system. Markdown is accepted as a shortcut idiom because it is familiar and the parsers already exist, but it is not the foundation.

Wherever an existing parser can do work acadamark would otherwise need to do, acadamark delegates. Bare `$x$` is parsed by `remark-math`. Bare `` `code` `` is parsed by remark's code-span tokenizer. Bare `# Heading` is parsed by remark's heading tokenizer. Acadamark only does work the existing parsers cannot do — the tagged shorthand and the Layer 1 vocabulary.

At the interpreter, acadamark sigil tags are converted to the equivalent existing mdast/hast node types where possible. `<$x$>` becomes an `inlineMath` node; `rehype-katex` renders it. `` <`x`> `` becomes an `inlineCode` node; rehype renders it natively. Custom Layer 1 elements are produced only where no existing node type fits.

## The two-layer rule

The delegation principle operates at two distinct layers, with different rules at each:

**At the parser layer.** Acadamark's tokenizer claims `<tag ...>` constructs before any other parser sees them. This is what makes the shorthand work: `<figure | text>` is acadamark, not malformed HTML. Bare markdown idioms (`*emphasis*`, `# heading`, `$x$`) are *not* claimed by acadamark — they are left for the existing parsers to handle.

**At the interpreter layer.** Acadamark sigil tags are converted to existing mdast/hast node types where possible, so that existing rendering plugins (`rehype-katex`, syntax highlighters, etc.) handle them. Custom Layer 1 elements are produced only where no existing node type fits.

These are different rules at different stages and should not be conflated.

## Bare idioms acadamark accepts

The following markdown idioms are accepted in casual mode and produce equivalent Layer 1 output to the corresponding tagged forms. The list is representative, not exhaustive.

| Bare idiom            | Equivalent tagged form           | Layer 1 output                                       |
|-----------------------|----------------------------------|------------------------------------------------------|
| `# Heading`           | `<# Heading #>`                  | `<section-title>Heading</section-title>` (when wrapped in section) |
| `## Heading`          | `<## Heading ##>`                | `<sub-section-title>Heading</sub-section-title>`     |
| `*emphasis*`          | `<em \| emphasis>`               | `<em>emphasis</em>`                                  |
| `**strong**`          | `<strong \| strong>`             | `<strong>strong</strong>`                            |
| `` `code` ``          | `` <`code`> ``                   | `<code>code</code>`                                  |
| ` ```js\ncode\n``` `  | ` <```js \| code```> `           | `<pre><code class="language-js">code</code></pre>`   |
| `$x$`                 | `<$x$>`                          | `inlineMath` mdast node, rendered by KaTeX           |
| `$$x$$`               | `<$$x$$>`                        | `displayMath` mdast node, rendered by KaTeX          |
| `[text](url)`         | `<a url \| text>`                | `<a href="url">text</a>`                             |
| `- item` (list)       | `<list +unordered \| - item>`    | `<ul><li>item</li></ul>`                             |

A few asymmetries worth noting:

- The bare and tagged forms produce identical Layer 1 output only when the surrounding pipeline configuration agrees. Bare `# Heading` produces `<section-title>` wrapped in `<section>` only when section-wrapping is applied to bare markdown headings — this is an open question in `notes/layer1-naming.md`.
- The tagged forms support attributes (`<# #intro | Introduction #>`); the bare forms do not. When attributes are needed, the tagged form is the only option.

## Strict mode (deferred)

Strict mode is a planned configuration that disables all markdown idioms, so only acadamark tagged forms are recognized. Specifically: remark's heading, emphasis, link, list, and code-span tokenizers are bypassed; `remark-math` is disabled; only the acadamark micromark extension and plain text are recognized.

The bare-sigil idioms above are part of casual mode, not the canonical surface. Strict mode is for documents where the author wants the canonical form throughout — typically because the document will be processed by tooling that depends on a consistent shape.

Strict mode is not yet implemented. This section exists to record the intent so the mode is not defined implicitly later.

## Open questions deferred to interpreter design

These are deferred until the relevant component is built. The expected answers are noted but not binding.

- **`<$...$>` rendering path.** When `acadamarkTagInterpret` handles a `$` sigil, does it produce an `inlineMath` mdast node (letting `rehype-katex` render it downstream), or does it call KaTeX directly and emit rendered HTML inline? The delegation principle in this document points toward the first option. To be confirmed when the interpreter is built.

- **`remark-math` inside recursive parsing.** When the recursive-content plugin re-feeds named-tag content through remark, is `remark-math` part of that inner pipeline? If yes, bare `$x$` inside `<aside | text $x$ here>` is treated as inline math. If no, it is literal text. The expected answer is yes, consistent with the delegation principle. To be confirmed when the recursive-content plugin is built.

## Related notes

- `notes/recursive-content.md` — design of the recursive-content plugin that turns string content into homogeneous `Node[]` content.
- `notes/shorthand-syntax.md` — the shorthand syntax specification, including the resolved decision that named-tag content is homogeneous `Node[]` after recursive parsing.
- `notes/layer1-naming.md` — Layer 1 naming conventions and the rule about deferring to HTML where HTML is sufficient (which is the static-vocabulary counterpart to this document's parser-delegation principle).
