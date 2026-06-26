# docs/sources — generators for the vocabulary references

These build the two **generated** vocabulary-reference books that live beside `authoring_guide/` under
`docs/`. They are self-contained: nothing here depends on `docs-site/`, so `docs-site/` can be removed.

| file | role |
|---|---|
| `gen-books.js` | The generator. Reads the vocab source (`packages/layer1-vocabulary/elements/*.md`), and writes `docs/enscribe_vocabulary/` and `docs/layer_1_vocabulary/` — a `<meta type=book>` `index.emd` master + one chapter `.emd` per category. |
| `vocab-extract.js` | Vocab-extraction helpers (read the element frontmatter, the category order, the spec/attributes table). Copied from `docs-site/gen-reference.js` so `docs/` is independent of `docs-site/`. |

## Regenerate

```sh
node docs/sources/gen-books.js
```

Output (committed, regenerable build product):

```
docs/
  enscribe_vocabulary/   # author-facing constructs — registers, arguments, live examples
  layer_1_vocabulary/    # every Layer 1 element — semantic role, HTML projection, attributes, JATS
```

These are **generated** — edit the vocab source (`packages/layer1-vocabulary/elements/*.md`) or `gen-books.js`,
not the produced `.emd`. Re-run the command above after any change to keep them in sync.

## The render gate

Every example is rendered through the engine **before** it is embedded. A clean render ships as the verbatim
`<code>` source + a live, sealed `<minipage>`. A render that errors (`tag-error` / `ref-error` / `??…??`),
is empty for a non-empty source (e.g. `<cite>` under `processSync`), or is apparatus/root-only ships as
source + a note — never a broken box. Examples held back by the gate are recorded in the slice reports under
`~/enscribe-reports/` and mapped to tracking issues (#268, #273, #275, #276, #277).

## Build to HTML

The `.emd` are enscribe source; build them with the CLI (skip dsl-mode needs no engine bundle):

```sh
node packages/cli/bin/enscribe.js build docs/enscribe_vocabulary/index.emd -o <out-dir>
node packages/cli/bin/enscribe.js build docs/layer_1_vocabulary/index.emd  -o <out-dir>
```
