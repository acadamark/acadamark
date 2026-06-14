# Ordinary Least Squares — a single-article live example (#216)

The **article** cell of the live mode-showcase: a self-standing folder that renders one
**single-document article** *live in the browser* from its `.emd` source — the simple-case sibling
of the multi-chapter [`savanna-live`](../savanna-live/) book. An article is **one unit**: no cover,
no chapter rail, no routing — the document just renders, and its cross-references resolve in a single
pass. Read by default; append `?edit` to mount the in-browser edit loop (#211) on the one source.

## What's here

- `article.emd` — the single-file article source (committed). Math-rich and image-free (so every
  local asset resolves with no 404): inline + display math, two labeled equations, and `<ref>`s that
  resolve within the one document.
- `index.html` — the live shell, **generated** by `emitLiveShell` (`assetBase: './'`), committed as
  the deployed-shell proof. It mounts via `mountLiveShell`, which reads `<meta type>` at runtime and
  dispatches this article to the single-document live path.
- The four copied assets (`enscribe.browser.global.js`, `default.css`, `enscribe-shell.css`,
  `editor-codemirror.js`) — build output, **git-ignored**; regenerate them (below). The chrome has
  **no CDN dependency** (only the document-display KaTeX/fonts links are CDN).

## Build + serve

```sh
# from the repo root — copy the assets in + (re)write index.html
enscribe build --live examples/regression-live/article.emd -o examples/regression-live
#   …or: node packages/cli/src/build-live.js  (the buildLiveFolder helper)

# serve it (the shell fetches the .emd; file:// won't)
cd examples/regression-live && python3 -m http.server 8000
#   read:  http://localhost:8000/
#   edit:  http://localhost:8000/?edit
```

Open it → the article renders live (no book chrome); `?edit` mounts CodeMirror + the edit loop —
editing the source re-renders the whole article, and an in-document reference renumbers when you add
a labeled equation before the one it points at. The **same emitted shell** drives this article and
the `savanna-live` book; the only difference is each master's `<meta type>`.
