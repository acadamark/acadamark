# Recursive content parsing

The enscribe parser produces AST nodes whose content, for prose-bearing constructs, is initially a raw string. Recursive content parsing transforms those strings into structured child nodes by re-feeding them through the same parsing pipeline that produced the outer construct. After this stage, content is `Node[]` — an array of structured AST nodes — for parseable tags, and remains opaque for tags whose content is intended for embedded languages.

## What recursive parsing does

Before recursive parsing, a named-tag node looks like:

```
{
  type: "enscribeTag",
  tagname: "aside",
  contentHandler: "default",
  content: "Text with <ref fig:elephant> and *emphasis*."
  // ... attributes
}
```

The content is an opaque string. Nothing inside has been interpreted.

After recursive parsing, the same node's content is structured:

```
{
  type: "enscribeTag",
  tagname: "aside",
  contentHandler: "default",
  content: [
    { type: "text", value: "Text with " },
    { type: "enscribeTag", tagname: "ref", positional: ["fig:elephant"], ... },
    { type: "text", value: " and " },
    { type: "emphasis", children: [{ type: "text", value: "emphasis" }] },
    { type: "text", value: "." }
  ]
  // ... attributes unchanged
}
```

The string has been parsed; markdown idioms, nested enscribe constructs, and plain text are all represented as proper AST nodes.

## Which tags get recursively parsed

The discriminator is the `contentHandler` field. Tags whose content handler is `"default"` get recursively parsed. Tags with named DSL handlers (`"math"`, `"csv"`, `"mermaid"`, etc.) do not — their content is opaque source for an embedded language and stays as a string.

This means:

- `<aside>`, `<theorem>`, `<note>`, `<table>` (and any other tag with `contentHandler: "default"`): content is recursively parsed.
- `<math>`, `<csv>`, `<mermaid>` (DSL tags): content is preserved verbatim.
- Sigil tags: hash sigils (`<#...#>`) are recursively parsed; math and code sigils are opaque.
- `<aside | text>` short-form: content is recursively parsed (named-tag content always is, when the handler is default).

The `contentHandler` field already encodes this policy. Recursive parsing reads it; it doesn't introduce a new flag.

## The inner parse pipeline

When the recursive-content plugin encounters a node with string content and `contentHandler: "default"`, it re-parses the content string through a unified pipeline passed in as the `{ processor }` option:

```js
use(remarkRecursiveContent, { processor: innerProcessor })
```

The caller constructs `innerProcessor` with the appropriate plugins (e.g., `remarkParse`, `@enscribejs/enscribe/parser`, `remark-math`, `remark-gfm`) and passes it in. This keeps the plugin agnostic about which plugins the outer pipeline uses, and makes the plugin independently testable.

The inner processor should NOT include `remarkRecursiveContent` itself — recursion into nested content is handled by the plugin's own tree walk, not by nesting plugin instances.

The inner parse produces an mdast subtree. The plugin replaces the original string content with the array of child nodes from that subtree, after the shaping rules below.

## Content shape after parsing

The replacement array is not always the inner parse's raw `root.children`. Two shaping rules apply.

### Single-paragraph unwrap

When the inner parse produces a root with exactly one child and that child is a `paragraph`, the plugin returns the **paragraph's inline children**, not the `paragraph` node itself. So `<aside | some text>` yields inline content (text, emphasis, nested tags) directly — matching the structured example above, which has no `paragraph` wrapper. When the root has multiple children, or a single non-paragraph child, the plugin returns the **root's children unchanged**, preserving block-level structure: `<aside | para one\n\npara two>` yields two `paragraph` nodes. (This is the same single-paragraph unwrap the frameable handlers apply when extracting caption / title text.)

### Mixed string-and-error content

Escape processing (`notes/specs/escape-rules-spec.md`) can leave a node's `content` as a **`(string | enscribeParseError)[]` array** rather than a single string — string segments interleaved with error nodes for escape failures. The plugin parses **each string segment independently** through the inner pipeline and **preserves the error nodes in place**. Prose between errors parses correctly and errors do not cascade: one bad escape does not corrupt the parse of the surrounding text.

## Recursion bottom-out

The plugin walks the tree depth-first. For each node with string content and `contentHandler: "default"`, it re-parses. The result may contain new nested `enscribeTag` nodes, which themselves have string content. The plugin recurses into these.

Eventually, content strings contain only plain text (no nested enscribe constructs and no markdown idioms with their own substructure), and the recursion bottoms out.

A maximum recursion depth of 10 is enforced as a sanity check. When a node would be parsed beyond that depth, the plugin **converts the node in place to an `enscribeParseError`**: it sets `subtype: "max-recursion-depth"` and `source: "<tagname>"`, drops the node's `content` / `contentHandler` / `isOpaqueContent` fields, and stops descending. This should never trigger in practice; it guards against infinite loops from malformed input or future bugs.

## The `isOpaqueContent` flag

The flag is set at parse time by `from-markdown.js`, not after recursive parsing:

- `isOpaqueContent: true` — the node's content is intentionally opaque (DSL tags, math sigils, code sigils). Content is a string and stays a string permanently.
- `isOpaqueContent: false` — the node is prose-bearing (default handler). Content begins as a string and is replaced by `Node[]` after the recursive-content plugin runs.

The flag now describes the node's relationship to its content, not the parser's processing stage. A consumer that wants to know "is this content a string or an array?" can check the flag (or check the type of the content field directly).

This may evolve. There may come a time when a finer distinction is useful — "intentionally opaque versus not yet processed versus processed and structured." If that arises, the flag can be replaced with a more expressive enum. For now, the boolean reflects the relevant distinction.

## Error recovery: EOF-only termination

Recursive parsing introduces a content model where paragraphs and blank lines carry meaning. The settled rule — Option A, decided 2026-05-26, recorded in `DESIGN.md` §"Multi-paragraph tag content; unclosed tags terminate at EOF" — is **EOF-only termination**:

- A **blank line inside an open tag is a paragraph break, not a terminator.** Multi-paragraph tag content is allowed: `<aside | First paragraph.\n\nSecond paragraph.>` produces an aside with two paragraph children.
- A tag terminates only on its **explicit closing `>`** or at **EOF**.
- An **unclosed tag** — one whose stream ends without its closer — produces a visible `enscribeTagError` at the tag's opening position; the consumed span (to EOF) renders as the error node's best-effort content.

This holds for both the outer parser (top-level multi-line constructs) and the inner recursive parser (nested constructs inside a content string).

**Blank-line termination was considered and rejected.** An earlier design had a blank line terminate any still-open construct, to bound the error before EOF. It was rejected because detecting "blank line, then resume" reintroduces the blank-line-as-signal heuristic that conflicts directly with multi-paragraph content — the feature EOF-only termination exists to enable. The remaining tradeoff — an unclosed tag near the top of a long document swallows the rest into its error node — is an **acknowledged bounded tradeoff, not a gap** against the always-renders guarantee (`principles.md`): the error renders visibly at the open position, and the conspicuously missing downstream content is itself a strong author signal. Tighter localization remains an incremental future option, not foreclosed by EOF-only. Integration fixtures `document-23-multi-paragraph-tag-content.emd` and `document-24-unclosed-tag-at-eof.emd` pin both halves against regression.

## Implementation note

The recursive-content plugin is a remark plugin (mdast-level transform). It runs after `@enscribejs/enscribe/parser` produces the initial AST and before any rehype plugins.

The plugin walks the tree using `unist-util-visit`. For each `enscribeTag` node with string content and `contentHandler: "default"`:

1. The content string is fed through the unified pipeline passed as the `{ processor }` option (constructed once by the caller, reused for all inner parses).
2. The resulting mdast subtree's children become the node's new content.
3. The walk continues, finding any newly-revealed string-content nodes inside the parsed subtree.

The pipeline construction needs to be careful not to introduce circular references. The recursive-content plugin itself does not appear in the inner pipeline; recursion is handled by the outer walk, not by an inner application of the plugin.

The micromark finder scans a multi-line construct to its closer or, failing that, to EOF; it does **not** terminate at blank lines. Blank lines inside an open construct pass through as ordinary content and become paragraph breaks when the content is recursively parsed (the multi-paragraph content model above). An unterminated construct therefore yields a single `enscribeTagError` spanning the opener to EOF — the EOF-only termination design described in the *Error recovery* section above and in `notes/specs/multiline-spec.md`.

## What's not changed

- Sigil tags' opacity policy is unchanged. Math and code sigils remain opaque regardless of `contentHandler`. Hash sigils are recursively parsed because their semantic role is prose-bearing.
- DSL tags' opacity policy is unchanged. Their content is the source for an embedded language; the recursive-content plugin skips them based on `contentHandler` not being `"default"`.
- The escape rules from the previous slice apply uniformly. Escape sequences inside content are processed by the inner parser when the content is recursively parsed; opaque content is not affected by escape rules at the outer level.
- Multi-line construct support from the previous slice is unchanged; recursive parsing operates on the AST that multi-line parsing produces.
