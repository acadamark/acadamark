# DSL Engines

This document describes how acadamark handles content that is processed by an embedded engine — math, diagrams, tabular data, executable code, and any other case where a region of source is transformed into rendered output by a specialized processor.

## The shape of the problem

Every DSL case has the same structural shape:

A region of source is written in some language. An engine processes the source. The output is embedded in the document.

The differences between cases (math vs. CSV vs. mermaid vs. Python) are:

- The source language.
- The processing engine.
- The output format the engine produces.
- The engine-specific options that control processing or display.

Acadamark unifies these as a single mechanism: the DSL registry plus tag attributes.

## The model

Each DSL is a tag. The tag name names the engine. Content between the opening and closing tags is the engine's source, preserved verbatim by the parser.

```
<csv | name,price
foo,1
bar,2>

<mermaid | graph TD
A --> B>

<math | \frac{x}{y} = \alpha>
```

The DSL registry maps tag names to handler identifiers. The parser tags each acadamarkTag node with `contentHandler: "csv"` (or `"math"`, `"mermaid"`, etc.) based on the registry. The content stays as a string; the recursive-content plugin skips it because the handler is not `"default"`.

The interpreter (a future plugin) reads each acadamarkTag node, looks up the handler, calls the appropriate engine with the content as input, and embeds the engine's output in the rendered HTML.

## Attributes for engine options

Engine-specific options are expressed as acadamark attributes on the tag. The parser preserves attributes verbatim; the interpreter passes them to the engine.

Examples:

```
<csv align="r r l r" header="bold" caption="Revenue by region" | name,price
foo,1
bar,2>

<mermaid theme="dark" | graph TD
A --> B>

<math display="block" | \frac{x}{y} = \alpha>

<python +eval +echo -output | print("hello")>
```

Each engine defines its own attribute vocabulary. There is no global list of "valid engine attributes" — what's valid for `<csv>` (column alignment, header style) is different from what's valid for `<mermaid>` (theme, layout direction) which is different from `<python>` (eval, echo, output, error handling).

This is a deliberate choice. Engines have their own native vocabularies; trying to unify them across engines would force false correspondences. CSV's alignment is not Mermaid's layout direction is not Python's evaluation toggle.

The cost: each engine documents its own attributes. The benefit: each engine's attributes match the engine's actual capabilities and conventions.

## Common attributes that may converge

Some attributes will likely appear across multiple engines because they describe the *output* rather than the engine:

- `caption` — the captioned wrapper for the rendered output (likely produces a `<figure>`).
- `id` — for cross-referencing.
- `class` — for styling.
- `align` (right, left, center) — overall alignment in the document.
- `width`, `height` — sizing of the rendered output.

These are conventionally interpreted by all engines that produce visual output. Not enforced; engines are free to ignore options they don't apply to.

## Execution-control attributes for executable chunks

Executable chunks (Python, R, Julia, JavaScript, etc.) have a class of attributes specific to *execution* rather than display:

- `+eval` / `-eval` — whether to execute the code.
- `+echo` / `-echo` — whether to show the source.
- `+output` / `-output` — whether to show the output.
- `+error` / `-error` — whether to surface errors or suppress them.
- `cache` — caching strategy.
- `dependencies` — what the chunk depends on.

These match the conventions established by RMarkdown, Quarto, and Jupyter. The interpreter or a downstream execution plugin reads these and behaves accordingly.

Execution adds significant complexity (kernels, sandboxing, security, caching). Initial acadamark implementations may not include execution; the attributes are recognized and preserved, but the engine simply emits the source code as a code block until execution support is built.

## Source vs. display: kept fused for now

In the current model, each DSL tag fuses *source language* with *display target*. `<csv>` is both "the source is CSV" and "render as a table." `<mermaid>` is "the source is Mermaid" and "render as a diagram." The engine determines the output.

This works for the common cases but doesn't separate concerns cleanly. The same data could in principle drive multiple displays (a CSV could produce a table or a chart; a JSON could produce a table or a tree view). Authors who want this flexibility currently can't get it from a single tag.

A future enhancement could separate source from display:

```
<csv #revenue-data | name,price
foo,1
bar,2>

<chart source=#revenue-data type="bar">
<table source=#revenue-data style="bordered">
```

This is deferred. The fused model handles most real cases, and adding the split model is straightforward when the need is felt. For now, each DSL tag has one canonical display.

## Default and conventional displays

Each DSL has a canonical display target. The interpreter knows these mappings:

| DSL tag | Default display | Notes |
|---------|-----------------|-------|
| `<math>`, `<$>`, `<$$>` | KaTeX-rendered HTML | Inline or display variant per tag. |
| `<csv>`, `<tsv>` | HTML `<table>` | With styling per attributes. |
| `<json>` | HTML `<table>` if columnar; possibly tree view if hierarchical | Decided by the JSON engine based on shape. |
| `<mermaid>` | SVG (Mermaid output) | Inline SVG, not external image. |
| `<svg>` | SVG (passthrough) | Source is already SVG. |
| `<abc>` | SVG (music notation) | ABC music notation. |
| `<python>`, `<r>`, `<julia>` | Code block + optional output | Output depends on execution attributes. |
| `<code>`, `<` `>` | Highlighted code | Syntax highlighting via shiki/prism. |

This list is the registry's authoritative source for "what does this DSL produce." It expands as new engines are added.

## How the parser, registry, and interpreter compose

1. **Parser.** Recognizes the tag, identifies it via the DSL registry, sets `contentHandler` on the AST node. Content is preserved as a string. Attributes are parsed and stored on the node.

2. **Recursive-content plugin.** Skips DSL tags (their contentHandler is not `"default"`). Their content stays a string and is not parsed as acadamark prose.

3. **Interpreter (future).** For each acadamarkTag node, looks up the contentHandler in the registry to find the engine. Calls the engine with the content string and the attributes. Receives output (HTML, SVG, etc.) and embeds it in the rendered tree.

4. **Engine.** Processes its source according to its attributes. Returns rendered output. The engine knows nothing about acadamark; it just consumes source and options.

## Implementation status

- The parser correctly tags DSL content with `contentHandler` (Slice 4 + recursive-content slice).
- The DSL registry is a minimal map of tag name to handler identifier.
- The interpreter does not yet exist. It is the next major piece of work after the parser.
- Engines (KaTeX, Mermaid, etc.) are external dependencies that the interpreter will integrate.

## What's not changed by this model

- Markdown idioms (` ```python `, ` ```mermaid `, etc. as fenced code blocks) continue to work via remark's existing handling. Acadamark's DSL tags are an alternative authoring path, not a replacement.
- Custom engines can be added by extending the registry. The model is open-ended.
- The execution-control attribute conventions match existing tooling (Quarto, RMarkdown, Jupyter), so authors familiar with those tools can transfer their habits.

## What's deferred

- The interpreter itself.
- Source/display separation for cases where the same data should drive multiple displays.
- Execution support for chunks that need to actually run code.
- Engine-specific attribute documentation (each engine's attribute vocabulary documented with the engine's registry entry).

## Why this matters

The DSL engine model is what makes acadamark a usable academic publishing system. Math, diagrams, data tables, and executable code are all critical for real academic content. By unifying them under a single mechanism (DSL tag + attributes + engine), acadamark gives authors one rule to learn ("write the DSL tag with appropriate attributes") instead of separate idioms for each kind of embedded content.

The simplicity is the point. The same shape handles every embedded language. New engines slot in by adding registry entries. Existing engines evolve their attribute vocabularies independently. The parser, registry, and interpreter form a stable foundation.
