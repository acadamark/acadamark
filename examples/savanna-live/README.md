# Savanna Field Notes — a live-folder example (#215)

The **Live · folder · linked** cell of the mode matrix: a self-standing folder that renders this
two-chapter book **live in the browser** from its `.emd` source. Read by default; append `?edit` to
mount the in-browser edit loop (#211).

## What's here

- `book.emd` + `chapter-one.emd` + `chapter-two.emd` — the book source (committed).
- `index.html` — the live shell, **generated** by `emitLiveShell` (`assetBase: './'`), committed as
  the deployed-shell proof.
- The four copied assets (`enscribe.browser.global.js`, `default.css`, `enscribe-shell.css`,
  `editor-codemirror.js`) — build output, **git-ignored**; regenerate them (below). The chrome has
  **no CDN dependency** (only the document-display KaTeX/fonts links are CDN).

## Build + serve

```sh
# from the repo root — copy the assets in + (re)write index.html
enscribe build --live examples/savanna-live/book.emd -o examples/savanna-live
#   …or: node packages/cli/src/build-live.js  (the buildLiveFolder helper)

# serve it (the shell fetches the .emd; file:// won't)
cd examples/savanna-live && python3 -m http.server 8000
#   read:  http://localhost:8000/
#   edit:  http://localhost:8000/?edit
```

Open it → the cover, chapter rail, and chapters render live; `?edit` mounts CodeMirror + the edit
loop (a debounced edit re-renders only that chapter). Everything but the CodeMirror-from-CDN load is
local — a portable live folder.
