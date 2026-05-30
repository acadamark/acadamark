# acadamark docs-site

The acadamark documentation + articles website. Each canonical `.acm` source in
`sources/` is rendered through acadamark and wrapped in a shared site template,
producing a multi-page static site in `dist/` — ready to serve locally or deploy
to GitHub Pages.

This is the **Phase 14 Slice 3a framework**: the build machinery plus three
placeholder pages that exercise it. Real content (the homepage, a written
Quickstart, and articles translated from the README and DESIGN) lands in later
slices.

## Pages

| Source                      | Page                  | Kind       |
| --------------------------- | --------------------- | ---------- |
| `sources/index.acm`         | `index.html`          | read-only  |
| `sources/quickstart.acm`    | `quickstart.html`     | playground |
| `sources/example-article.acm` | `example-article.html` | read-only |

- **Read-only pages** render the acadamark source to a static HTML article and
  carry a "view source on GitHub" link in the footer. They ship no JavaScript.
- **The Quickstart playground** loads CodeMirror and the acadamark browser
  bundle and seeds the editor with its own source, so you can edit acadamark and
  watch it render live. It is the only page that loads the editor or the library.

## Build and preview

```sh
# 1. Build the browser bundle the Quickstart playground loads (gitignored, so
#    build it locally). Skip this if you only care about the read-only pages.
cd packages/acadamark-interpreter
npm run build:lib

# 2. Build the site (from the repo root).
cd ../..
npm run docs:build
#   → writes docs-site/dist/{index,quickstart,example-article}.html + assets/

# 3. Serve dist/ over HTTP and open it. (The Quickstart's ES-module imports need
#    an HTTP origin; file:// will not work.)
python3 -m http.server 8000 --directory docs-site/dist
#   → http://localhost:8000/index.html
```

If the Quickstart shows a yellow "bundle is not loaded" notice, step 1 hasn't
been run (or wasn't re-run after a clean checkout): the bundle lives only in
`packages/acadamark-interpreter/dist/`, which is gitignored, and `docs:build`
copies it into the site's `dist/assets/` when present.

## How the build works

`build.js` (a small Node script, run via `npm run docs:build`):

1. Renders each read-only source with `buildAcadamarkPipeline` (the acadamark
   Node entry) to an HTML fragment.
2. Wraps it in `template.html` — the shared header/nav, the article body, and
   the GitHub-source footer.
3. For the Quickstart, emits a different body (editor + output panes) and inlines
   the source so the playground is self-contained.
4. Copies the static assets (`default.css` — acadamark's theme; `site.css` — the
   site chrome; `quickstart.js`; and the browser bundle if built) into
   `dist/assets/`.

Navigation is hardcoded in `build.js`'s page list; it grows as real pages land.

## Deploying to GitHub Pages

For v0.1.0 the deploy is **manual**: `dist/` is the deployable artifact. Build
it, then publish its contents wherever GitHub Pages serves from for this repo
(e.g. a `gh-pages` branch, or a `docs/` directory the repo's Pages settings point
at). Automated deployment (GitHub Actions → Pages) is a later addition; the build
already produces the artifacts it would publish.

`dist/` is gitignored — it is generated, never committed.

## Relationship to `demo/`

`demo/` (repo root) is the **standalone editor showcase** — one page, the live
editor. `docs-site/` is the **multi-page site**; its Quickstart page reuses the
same editor pattern, but the site as a whole is the documentation surface.
