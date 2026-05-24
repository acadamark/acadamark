# acadamark-interpreter

The acadamark interpreter. Takes an mdast tree containing `acadamarkTag`
nodes (produced by `remark-acadamark`) and emits a self-contained Layer 1
HTML string.

`acadamarkInterpreter` is a unified plugin. It registers a chain of mdast
transforms — discovery, structural transformation, numbering, ref / cite
resolution, note placement, bibliography — and a compiler that bridges
mdast to hast (via `mdast-util-to-hast`, with a custom `acadamarkTag`
handler) and serializes to HTML. CSS, fonts, and conditional JavaScript
for hover previews are inlined into the output so documents render
correctly from `file://` and offline.

## Usage

```js
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
import { acadamarkInterpreter } from 'acadamark-interpreter';

const result = await unified()
  .use(remarkParse)
  .use(remarkAcadamark)
  .use(acadamarkInterpreter)
  .process(source);

console.log(String(result)); // HTML string
```

Options: `katexCss`, `hoverPreviewMode`, `assetsDir`. See
[`notes/specs/interpreter.md`](../../notes/specs/interpreter.md) §12 for details.

## Documentation

- [`STATUS.md`](../../STATUS.md) — current project state.
- [`notes/specs/interpreter.md`](../../notes/specs/interpreter.md) — interpreter
  architecture: plugin chain, handler dispatch, schema dispatch, asset
  injection, error handling.
- [`notes/specs/pipeline.md`](../../notes/specs/pipeline.md) — pipeline stages,
  ordering, dependencies, data-flow examples.
- [`BACKLOG-ROADMAP.md`](../../BACKLOG-ROADMAP.md)
  — open work.
