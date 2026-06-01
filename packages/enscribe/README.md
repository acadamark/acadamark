# enscribe

The headline Enscribe library: the Layer 1 **core** foundation, the shorthand
**parser** (a remark plugin), and the **interpreter** that compiles `enscribeTag`
mdast nodes into a self-contained Layer 1 HTML string. (Formerly published as
three packages — `@enscribejs/core`, `@enscribejs/remark`, and
`@enscribejs/interpreter` — now consolidated here.)

## Entry points

- `enscribe` — the interpreter entry (`enscribeInterpreter`,
  `buildEnscribePipeline`, the structural plugins, `liftToCanonicalMdast`, …).
  This is the main entry (`"."`).
- `enscribe/parser` — the shorthand parser (the default-exported remark plugin);
  `enscribe/parser/recursive-content` is the recursive-content transform.
- `enscribe/core` — the inward-pointing shared foundation (tag factories,
  registries, walkers, attribute mapping). Per-module subpaths are available
  under `enscribe/core/*` (e.g. `enscribe/core/tag`, `enscribe/core/map-attributes`).
- `enscribe/browser` — the browser façade bundle (`render` / `renderInto` /
  `executeAssets`), built by `npm run build:lib`.
- `enscribe/default.css` — the Layer 1 display stylesheet (for browser viewing;
  it is not emitted by the interpreter).

## Usage (Node)

```js
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from 'enscribe/parser';
import { enscribeInterpreter } from 'enscribe';

const result = await unified()
  .use(remarkParse)
  .use(remarkEnscribe)
  .use(enscribeInterpreter)
  .process(source);

console.log(String(result)); // HTML string
```

Or the one-call helper:

```js
import { buildEnscribePipeline } from 'enscribe';
const html = String(buildEnscribePipeline({ embedResources: true }).processSync(source));
```

Options: `katexCss`, `hoverPreviewMode`, `assetsDir`, `embedResources`,
`dslMode`, `toc`, `theme`. See
[`notes/specs/interpreter.md`](../../notes/specs/interpreter.md) §12 for details.

## Layout

- `src/core/` — the shared foundation (was `@enscribejs/core`).
- `src/parser/` — the shorthand parser; the Peggy grammar lives in
  `grammar/enscribe.peggy`, compiled to `src/parser/generated/parser.js` by
  `build/compile-grammar.js` (was `@enscribejs/remark`).
- `src/interpreter/` — the mdast → HTML interpreter and its bundled assets
  (was `@enscribejs/interpreter`).

## Documentation

- [`STATUS.md`](../../STATUS.md) — current project state.
- [`notes/specs/interpreter.md`](../../notes/specs/interpreter.md) — interpreter
  architecture: plugin chain, handler dispatch, schema dispatch, asset
  injection, error handling.
- [`notes/specs/pipeline.md`](../../notes/specs/pipeline.md) — pipeline stages,
  ordering, dependencies, data-flow examples.
- [`BACKLOG.md`](../../BACKLOG.md) — open work; [`ROADMAP.md`](../../ROADMAP.md)
  — the phase sequence.
