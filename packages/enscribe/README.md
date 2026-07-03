# enscribe

The headline Enscribe library: the eHTML **core** foundation, the shorthand
**parser** (a remark plugin), and the **interpreter** that compiles `enscribeTag`
mdast nodes into a self-contained eHTML string. (Formerly published as
three packages — `@enscribejs/core`, `@enscribejs/remark`, and
`@enscribejs/interpreter` — now consolidated here.)

## Entry points

- `@enscribejs/enscribe` — the interpreter entry (`enscribeInterpreter`,
  `buildEnscribePipeline`, the structural plugins, `liftToCanonicalMdast`, …).
  This is the main entry (`"."`).
- `@enscribejs/enscribe/parser` — the shorthand parser (the default-exported remark plugin);
  `@enscribejs/enscribe/parser/recursive-content` is the recursive-content transform.
- `@enscribejs/enscribe/core/*` — the inward-pointing shared foundation (tag factories,
  registries, walkers, attribute mapping), available as per-module subpaths
  (e.g. `@enscribejs/enscribe/core/tag`, `@enscribejs/enscribe/core/map-attributes`).
- `@enscribejs/enscribe/browser` — the browser façade bundle (`render` / `renderInto` /
  `executeAssets`), built by `npm run build:lib`.
- `@enscribejs/enscribe/default.css` — the eHTML display stylesheet (for browser viewing;
  it is not emitted by the interpreter).

## Usage (Node)

```js
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '@enscribejs/enscribe/parser';
import { enscribeInterpreter } from '@enscribejs/enscribe';

const result = await unified()
  .use(remarkParse)
  .use(remarkEnscribe)
  .use(enscribeInterpreter)
  .process(source);

console.log(String(result)); // HTML string
```

Or the one-call helper:

```js
import { buildEnscribePipeline } from '@enscribejs/enscribe';
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
- Open work — [GitHub Issues](https://github.com/enscribejs/enscribe/issues);
  [`ROADMAP.md`](../../ROADMAP.md) — the phase plan and release targets.
