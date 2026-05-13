# acadamark-interpreter

The acadamark interpreter and structural plugins. Transforms `acadamarkTag` nodes (produced by `remark-acadamark`) into Layer 1 HTML, after running the structural-transformation pipeline described in `notes/plugin-pipeline.md`.

## Status

Slice 1 in progress (May 2026).

Scaffolded so far (independent of pending architectural decisions):

- `src/schema/load-vocabulary.js` — reads Layer 1 vocabulary entries from `packages/layer1-vocabulary/elements/`, parses YAML frontmatter, returns a `Map<tagname, spec>`.
- `src/schema/shape-tokens.js` — `inline` / `block` / `section` token membership lists (per `notes/shape-tokens.md`) and an `expandTokens()` helper.
- `test/fixtures/` — three input `.acm` source fixtures for the integration suite.

Pending:

- The dispatcher (`acadamarkTagInterpret`) — blocked on the architectural question of where the interpreter runs (mdast vs hast) and how `acadamarkTag` nodes bridge `mdast-util-to-hast`.
- The structural plugins (`acadamarkConfigDiscovery`, `acadamarkArticleStructuring`, `acadamarkSectionNesting`) — blocked on whether to reuse `packages/rehype-section-nesting/`.
- The figure handler.
- Expected-output hast JSON for each fixture (depends on the above).

See `BUILD.md` and `STATUS.md` for the broader project context.

## Layout

```
src/
  index.js                       # (pending) main entry
  interpret-plugin.js            # (pending) dispatcher
  plugins/                       # (pending) structural plugins
  handlers/                      # (pending) handler modules
  schema/
    load-vocabulary.js           # vocabulary loader (done)
    shape-tokens.js              # token membership (done)
  lib/                           # (pending) ast/error helpers
test/
  fixtures/
    document-1-minimal.acm      # input fixture (done)
    document-2-realistic.acm    # input fixture (done)
    document-3-edge-cases.acm   # input fixture (done)
  run.js                         # test runner entry (done; runs scaffold tests)
  schema/
    load-vocabulary.test.js
    shape-tokens.test.js
```
