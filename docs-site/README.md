# enscribe docs-site

The enscribe documentation + articles website. Each canonical `.emd` source in
`sources/` is rendered through enscribe and wrapped in a shared site template,
producing a multi-page static site in `dist/` — ready to serve locally or deploy
to GitHub Pages.

This is the docs-site **build framework** plus the site's content: a homepage, a
written Quickstart playground, full articles translated from the README and DESIGN,
the Authoring Guide, the Layer 1 vocabulary reference, a generated coverage gallery,
and the JATS demo papers. The page set, order, and nav labels come from the `<nav>`
in `sources/index.emd` — a `<meta type=website>` master — which `build.js` reads as
the single source of truth (it keeps no second page list). Adding a page is one
`<item src>` entry there.

## Pages

| Source                         | Page                    | Kind        |
| ------------------------------ | ----------------------- | ----------- |
| `sources/index.emd`            | _(website master — the `<nav>`)_ | manifest |
| `sources/home.emd`             | `index.html`            | read-only   |
| `sources/design.emd`           | `design.html`           | read-only   |
| `sources/quickstart.emd`       | `quickstart.html`       | playground  |
| `sources/authoring-guide.emd`  | `authoring-guide.html`  | read-only   |
| `sources/layer1-reference.emd` | `layer1-reference.html` | read-only   |
| _(generated)_                  | `gallery.html`          | gallery     |
| `sources/jats.emd`             | `jats.html`             | read-only   |
| _(generated)_                  | `demos.html` + `demo/*.html` | demo index |

- **Read-only pages** render the enscribe source to a static HTML article and
  carry a "view source on GitHub" link in the footer. They ship no JavaScript.
- **The Quickstart playground** loads CodeMirror and the enscribe browser
  bundle and seeds the editor with its own source, so you can edit enscribe and
  watch it render live. It is the only page that loads the editor or the library.
- **The Gallery** is generated (no `.emd` source): it walks the Layer 1 vocabulary
  and renders a live example per element, grouped by category, as a coverage surface.
- **The Demos** are real published articles imported from JATS by `enscribe
  import-jats` and rendered to standalone pages under `dist/demo/`, with `demos.html`
  indexing them.

## The live companion (`/live`)

Alongside the pre-built static site, the build emits a **live** companion under
`dist/live/` — the same docs, rendered **client-side** from their `.emd` source instead
of baked to HTML (#207). The static site stays the default; `/live` is purely additive.
Each source-bearing page gets a deep-linked "open this page live →" affordance in its
static footer (with a one-click `?edit` into the in-browser editor).

- One **uniform shell per page** (`emitLiveShell` → `mountLiveShell`, #215/#216): it fetches
  the page's `.emd` and renders it in the browser, auto-detecting article vs. book at runtime
  — so today's article pages and a future book page (the guide-as-book) use the very same shell.
- The shell assets — the ~3 MB engine bundle plus the small shell CSS and editor-adapter files
  (the set is defined once by `SHELL_ASSET_SPECS` in `@enscribejs/cli/build-live`) — are copied
  **once** to `dist/live/assets/`, never duplicated per page, and every shell's `assetBase` points
  there. Each page's `.emd` source (and any `<… src>` children) is copied beside the shells, which
  fetch it at runtime.
- Shells are emitted **read by default**; `?edit` flips to the CodeMirror editor at runtime
  (loaded host-side only then). `/live` is emitted only when the browser bundle is present
  (same gate as the Quickstart playground); without it, `/live` is skipped and no links appear,
  so the static site is unchanged.

Only pages with a single `.emd` source go live — the generated Gallery and Demos pages have no
single source, so they have no live counterpart.

**Known limitation (this slice).** A live page renders the article through the engine's browser
defaults, so it does **not** show the per-page on-this-page **table-of-contents sidebar** that the
static page adds (the static build passes a `toc` render option the uniform shell does not inject).
The content is otherwise identical — the same pipeline, the same external-resource / hover / DSL
options. Carrying the static site's per-page render options into the live shell is a later
enhancement (it would touch the shell emitter, kept out of this build-orchestration slice).

## Build and preview

```sh
# 1. Build the browser bundle the Quickstart playground loads (gitignored, so
#    build it locally). Skip this if you only care about the read-only pages.
cd packages/enscribe
npm run build:lib

# 2. Build the site (from the repo root).
cd ../..
npm run docs:build
#   → writes docs-site/dist/*.html (index, design, quickstart, authoring-guide,
#     layer1-reference, gallery, jats, demos) + dist/demo/*.html + assets/
#     + dist/live/ (the live companion: one shell per source page + shared assets)

# 3. Serve dist/ over HTTP and open it. (The Quickstart's ES-module imports — and
#    every /live shell's — need an HTTP origin; file:// will not work.)
python3 -m http.server 8000 --directory docs-site/dist
#   → http://localhost:8000/index.html   (static)  ·  /live/index.html  (live)
```

If the Quickstart shows a yellow "bundle is not loaded" notice, step 1 hasn't
been run (or wasn't re-run after a clean checkout): the bundle lives only in
`packages/enscribe/dist/`, which is gitignored, and `docs:build`
copies it into the site's `dist/assets/` when present.

## How the build works

`build.js` (a small Node script, run via `npm run docs:build`):

1. Renders each read-only source with `buildEnscribePipeline` (the enscribe
   Node entry) to an HTML fragment.
2. Wraps it in `template.html` — the shared header/nav, the article body, and
   the GitHub-source footer.
3. For the Quickstart, emits a different body (editor + output panes) and inlines
   the source so the playground is self-contained.
4. Copies the static assets (`default.css` — enscribe's theme; `site.css` — the
   site chrome; `quickstart.js`; and the browser bundle if built) into
   `dist/assets/`.
5. Emits the live companion (`dist/live/`, #207) when the browser bundle is present:
   a `mountLiveShell` shell per source page (`emitLiveShell`, `assetBase` → the shared
   `dist/live/assets/`), the four shell assets copied once, and each page's `.emd`
   source copied beside its shell. Adds the static→live footer link to each source page.

Navigation comes from the `<nav>` in `sources/index.emd` (the website master);
`build.js` reads that nav for the page set, order, and labels — adding a page is one
`<item src>` entry there, no `build.js` edit.

## Deploying to GitHub Pages

The deploy is currently **manual**: `dist/` is the deployable artifact. Build
it, then publish its contents wherever GitHub Pages serves from for this repo
(e.g. a `gh-pages` branch, or a `docs/` directory the repo's Pages settings point
at). Automated deployment (GitHub Actions → Pages) is a later addition; the build
already produces the artifacts it would publish.

`dist/` is gitignored — it is generated, never committed.

## Relationship to `demo/`

`demo/` (repo root) is the **standalone editor showcase** — one page, the live
editor. `docs-site/` is the **multi-page site**; its Quickstart page reuses the
same editor pattern, but the site as a whole is the documentation surface.
