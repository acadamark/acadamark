# Recursive content parsing

The acadamark parser produces AST nodes whose content, for prose-bearing constructs, is initially a raw string. Recursive content parsing transforms those strings into structured child nodes by re-feeding them through the same parsing pipeline that produced the outer construct. After this stage, content is `Node[]` — an array of structured AST nodes — for parseable tags, and remains opaque for tags whose content is intended for embedded languages.

## What recursive parsing does

Before recursive parsing, a named-tag node looks like:

```
{
  type: "acadamarkTag",
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
  type: "acadamarkTag",
  tagname: "aside",
  contentHandler: "default",
  content: [
    { type: "text", value: "Text with " },
    { type: "acadamarkTag", tagname: "ref", positional: ["fig:elephant"], ... },
    { type: "text", value: " and " },
    { type: "emphasis", children: [{ type: "text", value: "emphasis" }] },
    { type: "text", value: "." }
  ]
  // ... attributes unchanged
}
```

The string has been parsed; markdown idioms, nested acadamark constructs, and plain text are all represented as proper AST nodes.

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

The caller constructs `innerProcessor` with the appropriate plugins (e.g., `remarkParse`, `remark-acadamark`, `remark-math`, `remark-gfm`) and passes it in. This keeps the plugin agnostic about which plugins the outer pipeline uses, and makes the plugin independently testable.

The inner processor should NOT include `remarkRecursiveContent` itself — recursion into nested content is handled by the plugin's own tree walk, not by nesting plugin instances.

The inner parse produces an mdast subtree. The plugin replaces the original string content with the array of child nodes from that subtree.

## Recursion bottom-out

The plugin walks the tree depth-first. For each node with string content and `contentHandler: "default"`, it re-parses. The result may contain new nested `acadamarkTag` nodes, which themselves have string content. The plugin recurses into these.

Eventually, content strings contain only plain text (no nested acadamark constructs and no markdown idioms with their own substructure), and the recursion bottoms out.

A maximum recursion depth of 10 is enforced as a sanity check. If a document somehow produces deeper recursion, the plugin emits an `acadamarkParseError` at the deepest node and stops descending. This should never trigger in practice; it exists to prevent infinite loops from malformed input or future bugs.

## The `isOpaqueContent` flag

The flag is set at parse time by `from-markdown.js`, not after recursive parsing:

- `isOpaqueContent: true` — the node's content is intentionally opaque (DSL tags, math sigils, code sigils). Content is a string and stays a string permanently.
- `isOpaqueContent: false` — the node is prose-bearing (default handler). Content begins as a string and is replaced by `Node[]` after the recursive-content plugin runs.

The flag now describes the node's relationship to its content, not the parser's processing stage. A consumer that wants to know "is this content a string or an array?" can check the flag (or check the type of the content field directly).

This may evolve. There may come a time when a finer distinction is useful — "intentionally opaque versus not yet processed versus processed and structured." If that arises, the flag can be replaced with a more expressive enum. For now, the boolean reflects the relevant distinction.

## Error recovery: blank-line termination

**Status: Deferred.** This section describes planned behavior, not current behavior. Blank-line termination error recovery is not yet implemented.

Recursive parsing introduces a content model where paragraphs and blank lines have semantic meaning. This is the architecturally correct moment to introduce localized error recovery for unterminated constructs.

A blank line — a line that contains only whitespace, between two non-blank lines — terminates any open multi-line construct that has not yet found its closer. The unterminated construct emits `acadamarkTagError` at its opener position; parsing resumes from after the blank line.

This means:

```
<figure src=elephant.jpg

paragraph two
```

The `<figure src=elephant.jpg` opener has no `>` closer. Without recovery, this would consume to end-of-document. With blank-line termination, the construct ends at the blank line. The error node contains `<figure src=elephant.jpg`. The text `paragraph two` parses normally as a separate paragraph.

This applies to both:

- The outer parser, when scanning a document for top-level multi-line constructs.
- The inner (recursive) parser, when scanning a content string for nested constructs.

In both cases, blank-line termination provides localized error recovery — errors no longer consume the rest of the surrounding context.

The principle: a document with errors should render the maximum possible correct output. Blank lines are the natural boundary because they already mark paragraph breaks in markdown's content model.

## Implementation note

The recursive-content plugin is a remark plugin (mdast-level transform). It runs after `remark-acadamark` produces the initial AST and before any rehype plugins.

The plugin walks the tree using `unist-util-visit`. For each `acadamarkTag` node with string content and `contentHandler: "default"`:

1. The content string is fed through the unified pipeline passed as the `{ processor }` option (constructed once by the caller, reused for all inner parses).
2. The resulting mdast subtree's children become the node's new content.
3. The walk continues, finding any newly-revealed string-content nodes inside the parsed subtree.

The pipeline construction needs to be careful not to introduce circular references. The recursive-content plugin itself does not appear in the inner pipeline; recursion is handled by the outer walk, not by an inner application of the plugin.

The blank-line termination logic lives in the micromark finder. When scanning a multi-line construct's content, the finder checks each line ending: if the next line is empty or whitespace-only, the construct terminates with `acadamarkTagError`. The grammar receives the truncated content and parses what it can.

## What's not changed

- Sigil tags' opacity policy is unchanged. Math and code sigils remain opaque regardless of `contentHandler`. Hash sigils are recursively parsed because their semantic role is prose-bearing.
- DSL tags' opacity policy is unchanged. Their content is the source for an embedded language; the recursive-content plugin skips them based on `contentHandler` not being `"default"`.
- The escape rules from the previous slice apply uniformly. Escape sequences inside content are processed by the inner parser when the content is recursively parsed; opaque content is not affected by escape rules at the outer level.
- Multi-line construct support from the previous slice is unchanged; recursive parsing operates on the AST that multi-line parsing produces.
