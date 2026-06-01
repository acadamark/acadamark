# enscribe live-editor demo

A single static page that pairs a [CodeMirror 6](https://codemirror.net/) editor
with the enscribe browser library: type enscribe source on the left, see the
rendered document on the right. It runs entirely in the browser — no server-side
rendering, no install for the reader — and exercises the `render` /
`executeAssets` pair shipped by the browser library (Phase 14 Slice 1–2).

## Run it

The demo loads the library as a plain `<script>` and fetches the sample document
over HTTP, so it must be **served over HTTP from the repository root** (opening
`index.html` over `file://` will not work — the ES-module imports and the
`fetch` both need an HTTP origin).

```sh
# 1. Build the browser bundle the page loads (it is gitignored, so build locally).
cd packages/enscribe
npm run build:lib

# 2. Serve the repository root and open the demo.
cd ../..            # back to the repo root
python3 -m http.server 8000
#   → http://localhost:8000/demo/
```

If the right pane shows a yellow "bundle is not loaded" notice, step 1 hasn't
been run (or wasn't run after a clean checkout): `dist/` is gitignored, so the
bundle exists only after `npm run build:lib`.

## How it works

The page wires three things together:

1. **`window.enscribe`** — the IIFE browser bundle
   (`packages/enscribe/dist/enscribe.browser.global.js`), loaded by
   a classic `<script>` so the global is ready before the demo module runs.
2. **CodeMirror 6** — imported as ES modules from a pinned CDN
   (`esm.sh/codemirror@6`). The demo is a plain-text editor; enscribe syntax
   highlighting is a later addition.
3. **`demo.js`** — on each edit (debounced) it calls `enscribe.render(source)`,
   drops the HTML fragment into the output pane via `innerHTML`, then calls
   `enscribe.executeAssets(outputPane)`.

That last step is the reason `executeAssets` exists. Assigning HTML through
`innerHTML` leaves any injected `<script>` inert (the HTML spec forbids it from
running), so the interactive layer enscribe emits — Tippy/Popper hover-previews
and the live-link DSL bundles (Mermaid/abc) — would never activate.
`executeAssets` walks the inserted subtree and re-runs those scripts in order.
See `packages/enscribe/src/interpreter/browser.js` for the contract.

The default document is the `document-46-reproducible-research` fixture (an
edited volume), fetched from the interpreter's test fixtures so there is a single
source of truth for it.

## Known rough edges (v0.1)

- **Broken figure images.** doc-46 references `commit-graph.png` and
  `notebook-ci.png`, which don't exist in the repository, so those two figures
  render as broken-image placeholders. This is a property of the fixture, not the
  demo.
- **No abc notation in the default document.** doc-46 contains a Mermaid diagram
  but no abc music notation, so the abc live-render path isn't exercised by the
  default content (paste an `<abc | ...>` block to try it).
- **Head assets re-injected per render.** The CSS links and styles in each render
  land inside the output pane and are re-added on every keystroke. Browsers serve
  them from cache, so there's no refetch, but a future pass could hoist the
  stable head assets out of the per-render fragment.
- **Plain-text editing only.** No enscribe grammar highlighting yet.
