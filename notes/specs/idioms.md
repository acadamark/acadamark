# Enscribe Idioms and the Delegation Principle

Enscribe contributes the parts no existing parser owns: the tagged shorthand, the Layer 1 vocabulary, and the JATS bridge. Everything else is delegated. But "delegated" is precise, and this document defines it precisely — because there is a line running through the middle of delegation, and getting that line right is what keeps enscribe from either reinventing wheels or ceding its own vocabulary.

## Position

Enscribe is not markdown plus extensions. It is a Layer 1 HTML conventions system. Markdown is accepted as a shortcut idiom because it is familiar and the parsers already exist, but it is not the foundation.

Wherever an existing parser can do work enscribe would otherwise need to do, enscribe delegates that *work*. Enscribe does not reimplement remark's tokenizers — finding `$x$` in a stream of text, recognizing `# Heading`, tokenizing `` `code` `` — because that work is hard, remark already does it well, and rebuilding it would be reinventing a working wheel.

But delegation stops at the tokenizer. It does not extend to *node identity*. When remark's tokenizer finds a construct that has an enscribe equivalent, the standard node it produces is rewritten into the canonical enscribe form before any downstream plugin runs. The work was delegated; the vocabulary was not.

## The two halves of delegation

Delegation has two halves, and they are decided separately. Conflating them is the mistake this document exists to prevent.

**The lexer.** *Who finds the construct in the source text.* This is delegated to remark by default. `remark-math` finds `$x$`. remark's heading tokenizer finds `# Heading`. remark's code-span tokenizer finds `` `code` ``. Enscribe does not duplicate this. The only exception is a construct for which remark's tokenizer is genuinely inadequate for what enscribe needs — and even then, superseding at the lexer level is a deliberate, per-construct decision, never a reflex. (See "When enscribe supersedes the lexer" below.)

**The node identity.** *What the found construct is called, and therefore what every downstream plugin sees.* This is **not** delegated. A construct that exists in both markdown and enscribe shorthand is canonically the enscribe form. The markdown form is surface shorthand for it. When remark's tokenizer produces a standard node (`inlineMath`, `table`, `heading`, ...) for a construct that has an enscribe equivalent, a **normalization pass** rewrites that node into its canonical `enscribeTag` form. Downstream of normalization, only the enscribe form exists.

The split, stated once: **delegate the lexer; own the node identity.**

Reusing remark's finder is not reinventing the wheel. Accepting remark's *name* for what it found would be ceding the vocabulary — and the vocabulary is the project.

## The two-layer rule

The delegation principle operates at two distinct pipeline layers, with different rules at each.

**At the parser layer.** Enscribe's tokenizer claims `<tag ...>` constructs before any other parser sees them. This is what makes the shorthand work: `<figure | text>` is enscribe, not malformed HTML. Bare markdown idioms (`*emphasis*`, `# heading`, `$x$`) are *not* claimed by enscribe's tokenizer — they are left for remark's existing tokenizers to find. This is the lexer half of delegation.

**At the normalization layer.** After remark's tokenizers have run, a normalization pass rewrites every standard node that has an enscribe equivalent into its canonical `enscribeTag` form. A bare `$x$` that remark-math tokenized into an `inlineMath` node becomes an `enscribeTag` with the `$` sigil identity — the same node a `<$ x $>` sigil tag produces. After normalization, the structural and semantic plugins, the hast conversion, and the eventual JATS export all see one node type per construct. This is the node-identity half of delegation.

These are different rules at different stages and must not be conflated. The parser layer *delegates the finding*. The normalization layer *reclaims the identity*.

(An earlier version of this document stated only the first rule and said enscribe "converts sigil tags to existing node types where possible" — the reverse direction. That was the pre-normalization design, when bare idioms and sigil tags genuinely were separate paths. The normalization pass replaces that: the canonical direction is markdown-node → enscribe-node, not the other way. The rendering plugins downstream — `rehype-katex`, syntax highlighters — still do the rendering work; they are simply driven from the canonical enscribe node, reached through its handler, rather than from a raw markdown node.)

## Bare idioms enscribe accepts

The following markdown idioms are accepted in casual mode. Each is shorthand for the corresponding tagged form: remark's tokenizer finds it, and the normalization pass rewrites it to the canonical enscribe node, so the two columns below converge on *one* node, not two equivalent ones. The list is representative, not exhaustive.

| Bare idiom            | Canonical tagged form    | Canonical enscribe node (after normalization)        |
|-----------------------|--------------------------|------------------------------------------------------|
| `# Heading`           | `<# Heading #>`          | `enscribeTag` tagname `section`                      |
| `## Heading`          | `<## Heading ##>`        | `enscribeTag` tagname `sub-section`                  |
| `### Heading`         | `<### Heading ###>`      | `enscribeTag` tagname `sub-sub-section`              |
| `*emphasis*`          | `<i \| emphasis>`        | `enscribeTag` tagname `i`                            |
| `**strong**`          | `<b \| strong>`          | `enscribeTag` tagname `b`                            |
| `~~struck~~`          | `<s \| struck>`          | `enscribeTag` tagname `s`                            |
| `` `code` ``          | `` <`code`> ``           | `enscribeTag` tagname `inline-code` (opaque content) |
| `$x$`                 | `<$ x $>`                | `enscribeTag` tagname `inline-math` (opaque content) |
| `$$x$$`               | `<$$ x $$>`              | `enscribeTag` tagname `display-math` (opaque content)|
| `\| h \| h \|` (GFM)  | `<table md \| ...>`      | `enscribeTag` tagname `table`, positional `md` (opaque)|

The third column is what the document contains after normalization: a real `enscribeTag`, not a markdown node that happens to render the same. Two points the code makes precise:

- **Markdown emphasis maps to the *visual* tags.** `*x*` normalizes to `<i>` and `**x**` to `<b>` — not the semantic `<em>` / `<strong>`. The semantic tags are reached only by writing them explicitly. Headings of depth 1–3 lift to the section ladder; depths 4–6 pass through as literal `<h4>`–`<h6>` (the named exception). Explicit markdown links `[text](url)` are **not** an idiom — they render as their literal source (a bare URL / email autolink still lifts to `<a>`).
- **Not every markdown construct is normalized.** Fenced code blocks (` ``` `) and bulleted / ordered lists currently render through the native remark→hast path; they are candidate idioms not yet on the normalization registry, so they have no canonical-node row above. Per the registry framing below, whether a construct is normalized *today* is a `STATUS.md` / backlog question, not this document's.

A few points worth noting:

- The bare and tagged forms produce identical output because, after normalization, they *are* the identical node. This is stronger than "equivalent output" — it is node identity.
- The tagged forms support attributes (`<# #intro | Introduction #>`); the bare forms do not. When attributes are needed, the tagged form is the only option. Normalization does not invent attributes; it produces the attribute-free canonical node.
- The principle is universal in intent — it governs every markdown/enscribe overlap. Its implementation is incremental: the normalization pass grows one construct at a time. A construct not yet covered by normalization is a not-yet-done item, never a decision that it was meant to stay a separate path. Whether a given row above is normalized *today* is a question for `STATUS.md` and the backlog, not for this document.

### The normalization pass is a registry, not a switch

Incremental growth is not only a rollout schedule — it is an architectural property of the pass itself. The normalization pass is structured as an open registry of per-construct rewrites: each entry pairs a recognizer for one markdown-form node with the rewrite that produces its canonical enscribe node, and the pass walks the tree applying any entry whose recognizer matches. Adding coverage for a new construct is adding an entry to the registry; it is never a modification to a central dispatch over node types.

The rationale is the same rationale that makes the parser refuse to know about vocabulary (see `principles.md`'s parser-knows-nothing-about-meaning principle): a registry keeps each construct's rewrite local to itself, so adding a construct does not perturb the others; it lets the rollout be genuinely one construct at a time rather than one batched edit; and it keeps the pass's shape stable as coverage grows, instead of accreting branches in a switch that no single reader can hold in their head. The registry form is the structural expression of the incremental principle.

## When enscribe supersedes the lexer

The default is: delegate the lexer. There is one circumstance that overrides the default — a construct for which remark's tokenizer cannot recognize what enscribe needs to treat as that construct.

The example is math. remark-math's tokenizer recognizes delimiter-shaped math: `$...$` and `$$...$$`. It does not recognize environment-shaped math — `\begin{matrix}...\end{matrix}` and similar. Enscribe intends to support a wider LaTeX math surface than the delimiter forms. For the environment forms, there is no remark wheel to reuse, so enscribe provides its own: the DSL long-form tags (`<matrix>`, `<cases>`, `<align>`, `<eqnarray>`) reserved in the DSL registry. That is not superseding remark — it is covering ground remark never covered.

Genuine lexer supersession — enscribe replacing remark's tokenizer for a construct remark *does* tokenize — is reserved for the case where remark's coverage of that construct is inadequate for enscribe's needs. It is a deliberate, per-construct, spec-recorded decision. It is never done reflexively, and it is never done merely to avoid the normalization pass.

The consequence over time: the remark dependency shrinks *gracefully*, not by a hard cut. Each construct stays delegated for as long as remark's tokenizer is an adequate wheel for it. If enscribe eventually supersedes the lexer for enough constructs, the remark dependency falls away on its own — but that is an organic outcome of per-construct adequacy decisions, not a goal pursued for its own sake.

## The rendering question

Rendering is a third thing, separate from both the lexer and the node identity, and it is delegated cleanly. Enscribe does not render math, diagrams, or syntax-highlighted code. KaTeX renders math; Mermaid renders diagrams; Shiki or Prism highlight code. The normalization pass and the canonical node identity do not change this — they change *which node drives the renderer*, not *who renders*. A canonical `$` sigil node reaches KaTeX through enscribe's math handler; a canonical `table` node reaches enscribe's table handler. The renderer is delegated; the node that drives it is enscribe's own. One construct, one canonical node, one rendering path.

## Strict mode

Strict mode is a configuration that disables all markdown idioms, so only enscribe tagged forms are recognized. Specifically: remark's heading, emphasis, link, list, and code-span tokenizers are bypassed; `remark-math` and `remark-gfm` are disabled; only the enscribe micromark extension and plain text are recognized.

Under the normalization model, strict mode is simple to characterize: it is the mode in which there is nothing for the normalization pass to do, because no markdown-form nodes are ever produced. Every construct is authored in its canonical form directly. Strict mode is for documents where the author wants the canonical form throughout — typically because the document will be processed by tooling that depends on a consistent shape.

## Related notes

- `notes/specs/recursive-content-spec.md` — design of the recursive-content plugin that turns string content into homogeneous `Node[]` content.
- `notes/specs/shorthand-syntax.md` — the shorthand syntax specification, including the resolved decision that named-tag content is homogeneous `Node[]` after recursive parsing.
- `notes/specs/layer1-naming.md` — Layer 1 naming conventions and the rule about deferring to HTML where HTML is sufficient (which is the static-vocabulary counterpart to this document's parser-delegation principle).
- `DESIGN.md` — the "Markdown forms are shorthand for the canonical enscribe form" design direction, which states this principle at the design-rationale level.
