# Enscribe design decisions

The settled strategic and product-shape decisions: the target user-facing
experience and the cross-cutting choices that steer it. This is the tier above
`DESIGN.md` — `DESIGN.md` holds the engineering rationale (the layer model, the
pipeline, the JATS relationship); this file holds the product-shape decisions
those mechanics serve. Subsystem specs defer up to here for *what experience the
mechanics build toward*, and hold the mechanics themselves.

## Default views

Enscribe targets a suite of standard, ready-made views — the shapes a user gets
without designing their own. Each is modeled on a familiar exemplar so the
behavior is predictable. Print is out of scope for now; these are browser views.

**Article — optional table of contents, inline or floating.** A single-unit
document with no persistent navigation chrome, so its table of contents *is* its
navigation: `<config toc>` renders a contents listing inline at the top
(`toc-location=body`) or as a floating sticky sidebar (`toc-location=left|right`).
Modeled on a standard journal article or long-form web page.

**Book — persistent navigation, Bookdown / Quarto style.** A multi-chapter
document read in the browser, with navigation chrome always on: a persistent left
chapter rail (chapters, optionally nested to their sections), a right "on this
page" rail of the current chapter's sections, prev/next links, and a cover. The
**left chapter rail is the book's table of contents** — there is no separate
front-matter contents page (that is a print-book artifact). Modeled on the
Bookdown gitbook and Quarto book reading interfaces.

**Website — docs-site navigation, Quarto / Jekyll style.** A page tree read as a
site. It reuses the book's navigation components — a persistent left nav tree (the
page tree in place of the chapter rail) and a right on-this-page rail — and adds
site-level top navigation between sections. Forward work, tracked as the website
document type (#246). Modeled on a Quarto website / Jekyll docs theme.

These are *defaults*, not a ceiling — a user can always style or script their own.
The value is that the common cases need no design work.

**Website chrome: left nav is books-only.** On a website, the left navigation appears on **book** pages
only, where it is the chapter rail (consistent with the book default view). Article pages carry no left
nav. The right side is the page-section nav as usual, and the site nav is the top bar, with grouped menu
items presented as dropdowns. This removes the redundant second site-nav that articles previously
carried on the left, and makes the top bar the single site-navigation surface.

## Table of contents by document class

`<config toc>`'s meaning is **per document class**, because the three views relate
to a contents listing differently:

- **Article** — `<config toc>` *is* the contents listing (inline or floating
  sidebar); an article has no other navigation.
- **Book** — the persistent chapter rail is the table of contents. `<config toc>`
  adds a contents **overview on the cover / landing page** (the Quarto book index
  pattern), not a separate contents page. `toc-location=left|right` is not a second
  book sidebar — the chapter rail already fills that role — so on a book those
  locations emit a located diagnostic rather than a competing sidebar.
- **Website** — the persistent page-tree nav is the table of contents;
  `<config toc>` is the landing / section index. (The website type shipped (#246);
  the website `<config toc>` landing/section-index is a follow-on.)

The mechanics live in `notes/specs/toc-and-numbering.md` (the listing) and
`notes/specs/book-navigation.md` (the rail); this entry is the cross-class shape
they implement.

---

## Why Enscribe — the browser is the environment

The world keeps producing new systems for authoring rich documents — pandoc, Quarto, R Markdown, Bookdown,
Typst, MyST, Obsidian, and more — each with its own toolchain. Enscribe's premise is that we don't need
another one: the environment for writing, rendering, and reading rich documents already exists and is
already under everyone's fingertips — the browser. No separate word processor, web app, or command-line
tool is required to author or view an Enscribe document.

This is why the live and edit-in-place modes are first-class, not add-ons. A document can be opened in the
browser, edited as `.emd`, and — with the planned TiddlyWiki-style save — written back to a `.emd` file or a
Layer 1 HTML file, on a server or the user's own disk. The browser is the editor, the renderer, and the
viewer at once.

The render / serve / edit matrix below is the practical form of this premise: each way of authoring,
rendering, delivering, and editing a document is a way of using the one tool everyone already has.

---

## Ways to make, serve, and edit a document

A document moves along four mostly independent axes. (The detailed "which do I want?" walkthrough belongs in
the docs-site rendering guide; this is the decision of what the axes are and which cells exist.)

### Authoring — how the renderable source comes to be
- **`.emd` shorthand**, rendered by Enscribe — the normal path.
- **Import** from another format: JATS, or anything pandoc handles (LaTeX, Quarto `.qmd`, Markdown, DOCX,
  RST, Org, Typst, Jupyter, HTML, EPUB, ODT). Import emits rendered HTML, or canonical `.emd`.
- **Layer 1 is the rendered output, not an input.** It is browser-native HTML, so it can be authored or
  edited by hand in principle and will display — but the tools do not accept Layer 1 as a render input.

### Render mode — when and where source becomes display HTML

| Mode | What it is | State |
|---|---|---|
| **Static** | Rendered once, ahead of time, to finished HTML | built — articles default to one page; books default to separate per-chapter pages |
| **Live** | A portable *folder* (a shell page plus the `.emd` files); the shell fetches and renders in the browser | built — articles and books |
| **Live — server** | A running server renders on request | not built — Enscribe emits a portable folder; you serve it with any static host |

The live mode is **fetch-based**: it ships a folder and must be served over HTTP, not opened off disk.

**Edit is a toggle, not a separate mode.** On a live page, adding `?edit` to the URL flips that same
page into an editable view — an in-browser editor that re-renders the preview live. It is a switch on
the live shell, not a distinct render mode; **saving** those edits is the forward feature noted below.

**Diagrams (and all DSL content) are never pre-rendered.** DSL-backed content — mermaid, abc, and
intended to include tables and any future DSL — keeps its source verbatim in the page
(`<pre data-enscribe-dsl="…">`) and is rendered live in the browser from that source. It is never baked
to a static SVG; the source stays the source of truth. The website therefore uses a **live** DSL mode
(`live-link` — one shared runtime, loaded once per page — in preference to `live-inline`, which would
bundle the runtime into every page), never `static`.

**`show-source` reveals the DSL source, and should cover every DSL.** `<config show-source>` (default
off) adds a "See source" disclosure exposing the verbatim DSL beneath the rendered output. It is wired
for the diagram family (mermaid, abc) today; the intent is to extend the same shared disclosure helper
to tables and any other DSL-rendered content. *(Diagram-only is the current state, not the end state.)*

### Asset delivery — where the scripts and styles come from
- **Baked in** (self-contained file) or **linked from the web** (CDN). Two values, not three — there is no
  "link to your own server" option.
- This choice governs the **static** output only. The live shell and editor always pull from the web; an
  offline live mode is not built.
- **The static website links shared assets; it does not bake per page.** Where a standalone document may
inline its CSS and runtime for self-containment, the multi-page website links one shared `default.css`
and one shared DSL runtime instead of stamping a copy into each of its pages. Baking per page would
multiply identical bytes across the whole site (tens of pages); linking shared assets is the website's
default.

### Save — keeping edits
- The **TiddlyWiki-style save** — edit `.emd` in the browser and write it back to a `.emd` or Layer 1 file,
  on disk or a server — is the planned forward feature. Today the editor is **preview-only**: edits are not
  persisted, and no finished file yet carries its own source for re-opening.

### Forward work on this matrix
Live-server rendering; the save mechanism; a finished file that embeds its own source (the precondition for
in-document save); and the website `?page=` router (below). Also note: JATS is bidirectional (export as well
as import), and `lift`/`lower` are source-to-source transforms — both belong in the user-facing matrix even
though they sit outside render/serve/edit/save.

---

## Always renders — never block the build on an error

**Enscribe never blocks the build on an error. Every document *always renders*.** A problem surfaces in two
places — **inline**, as an error or warning node at the spot in the rendered output where it occurred (so you
see *where*), and on the **console / CLI** (so you have the log) — but it **never halts rendering or fails the
build**. There is no "compilation failed, no output" state.

**Why this is a deliberate stance.** It is the break from the compile-to-PDF toolchains — LaTeX, and the
markdown-extension stacks — where a single bad construct can block the whole document and you get a log
instead of a paper. Enscribe follows the **scripting-language model** instead: run what you can, report the
problems, never stop the world. You never lose a finished document to one malformed tag.

**It is load-bearing across subsystems** — each one bends to it rather than the reverse:

- a malformed or unknown tag renders as an **inline tag-error** marker, the surrounding content untouched;
- ambiguous shorthand under a strict-mode rung is **flagged inline**, never hard-failed (`<config
  strict-mode=…>` always renders, never errors);
- an unterminated construct yields an **inline error node spanning to EOF** rather than aborting the parse —
  the error renders at its opener and the conspicuously missing downstream content is itself the signal;
- a website slug collision **warns** and degrades only the dependent link / ref / menu-item, never the build
  (see *Page slug is identity* below).

Subsystem specs hold the *mechanics* of each and defer up to this entry for the *why*. The fullest mechanical
statement — the error-node types, localized recovery, and gap-tracking — already lives in
`notes/specs/principles.md` ("the always-renders principle"), which this product decision sits above.

---

## The website — the third document class

A **website** (`<meta type=website>`) is the third document class, alongside article and book: a set of
pages navigated as a site, modelled on a Quarto website / Jekyll docs theme. Output is **HTML only** — a
site is not a scholarly document, so there is no JATS projection.

- **Pages and navigation are one tree.** The master declares a `<nav>` of `<item>`s (pages) and
  `<nav-group>`s (groups — a dropdown in the top bar, an expandable node in the sidebar). An `<item>` is a
  page (external via `src`, or authored inline like a section); a `<nav-group title="…"> … </nav-group>` is
  a long-form container that purely groups — so each tag has one meaning. There is no separate `<page>` tag —
  the nav entry *is* the page, Quarto-style. The one tree feeds both surfaces: the top level becomes the top
  bar; the whole tree feeds the automatic sidebar. The first cut is shallow (one level of grouping); deeper
  nesting comes later. Pages take the short pipe form, groups the long container form — the language's usual
  short-leaf / long-container pattern. The nesting is the website structurer's peer-close (like sections),
  and the sidebar/top bar render through the shared #226 list builder — not parser-level list reuse.
- **Brand and chrome.** The top-bar name and the icon come from `<meta>` (title + icon) — no in-header
  `<title>`/`<icon>` tags. `<footer src>` is site-wide, set once in the master.
- **Routing.** Client-side `?page=slug`, with the browser's back/forward buttons working via history.
  Enscribe ships its **own small router** in this style; when attoweb's router is published as its own
  project, the website can lean on it.
- **Render mode is orthogonal.** The master is a *composition* model — it assembles inline-or-external pages
  into the site — independent of how the site is rendered. A website follows the same static/live grid as
  article and book. The live render was built first (type-agnostic, inheriting the `?edit` toggle); the
  **static pre-rendered projection** (real per-page HTML files) then shipped too ([#278](https://github.com/enscribejs/enscribe/issues/278)
  / [#300](https://github.com/enscribejs/enscribe/issues/300)), so a website builds both ways; `enscribe serve`
  (live-server) remains a later mode. (Tradeoff for the live path: browser-rendered pages aren't plain HTML
  for a search engine; the static projection now backfills that.)
- **Dogfood.** The docs site is the proof: it is rebuilt as a `<meta type=website>` site **before** #223
  reorganizes its content. The bespoke generated pages (gallery, catalogs) stay outside the type for now.

**Flat source, nav owns structure.** Page sources are flat — one directory per page — and the master's
`<nav>` is the single source of truth for site structure. Reorganizing the menu is an edit to `<nav>`,
never a directory move. This keeps reorganization cheap and safe (editing one file, not relocating
trees) and lets the same page appear anywhere in the menu without moving on disk.

**Static URLs are path-style, from nav position.** The static build writes each page at its nav-path
location and addresses it with a pretty trailing-slash URL mirroring the menu hierarchy
(`/references/layer-1/export/`). This requires an HTTP server (the trailing slash resolves to
`index.html` via the host's directory index; `file://` will not). The live SPA keeps its client-side
`?page=slug` routing; the path-style form is the static projection. The cost — moving a page in the
nav changes its public URL — is accepted in exchange for `<nav>` being the one structure authority; in-
site links self-heal (see slug, below), only externally-held URLs break.

**Page slug is identity; nav is position.** A page's stable identity is its *slug*, unique site-wide,
taken from the **first of these that exists**: (1) an explicit **`<meta slug=…>`** in the page source —
the pinned identity; (2) else the page's **`<meta title>`**, slugified; (3) else, last resort, the title
in the nav item (`<item src | Title>`), slugified. Every page should carry a `<meta title>`, so tier 3 is
a rare fallback, not a normal path. The nav supplies *where* a page sits; the page supplies *what* it is.
Authors link with `<a {slug} | label>`, which the builder resolves to the target's path URL; reorganizing
the menu re-resolves every such link untouched.

A slug collision is governed by **Always renders** (above), not by a build failure. Two slugs **derived**
from a title (tier 2 or 3) that collide are **uniquified** (a suffix is appended) so both pages still get
working URLs, with a **warning**. A **hard duplicate** the engine can't cleanly resolve — two pages
**pinned** to the same explicit `<meta slug>` — is **not** a build error: the engine never silently renames a
pinned identity, so instead whatever **depends** on that slug (an `<a {slug}>` link, a cross-ref, a menu
item) **warns and doesn't resolve**, while the page itself **still renders and the build completes**. (A link
to a derived, un-pinned slug also warns — the cue to pin it before a title rename breaks the link.) All
warnings are logged to the console / CLI but never halt rendering. Full model:
`notes/specs/spec-internal-links.md`. *Caveat (status): `<a {slug}>` resolution is implemented on the
**static** build only; the live website still keys identity on the nav-title slug and does not yet resolve
`<a {slug}>` (the markers are inert there) — tracked by #299. (The static build's earlier cross-page
**`<ref>`** regression — the per-page-isolated render that could not resolve a reference across pages — was
#300; it is **fixed** by the composition builder above, and the served `site/dist` is rebuilt on it.) The
decision stands; the live path is the work that catches up to it.*

**A website page is an article or book plus chrome — one render path, composed over a merged site
cross-ref registry (#300 slice 2).** The website is not a second renderer, and it is not a flattening
assembly. Each page renders through the *same* single-document build that produces a standalone article or
book — an article in **article** scope, a book in **book** scope (a book figure stays "2.1", a section
keeps its chapter prefix); nothing is collapsed to a page scope. The website layer orchestrates in two
phases. **Phase 1** numbers every page in its OWN native scope and harvests each page's cross-ref registry,
**merging** them into ONE site registry: `anchor → { native number, the page/chapter-page that owns it }`.
**Phase 2** renders each page natively with its numbering registry pre-seeded to a *read-through* over that
site registry, so a cross-page `<ref>` resolves to its target's **native** number and links to the page (or
book chapter-page) it renders on; the result is then wrapped in chrome. There is deliberately no parallel
website pipeline: anything that renders standalone (citations, math, diagrams, numbering) renders
identically as a website page, by construction, and cross-page references resolve in **every** direction
(article↔article, article↔book). This **replaces** the earlier per-page-**isolated** static render, under
which each page was a separate pass and a cross-page `<ref>` could not resolve — the #300 regression. *(The
live SPA still uses its page-scope `buildWebsiteTree` assembly, which flattens a book to page scope — a
separate surface, tracked by [#314](https://github.com/enscribejs/enscribe/issues/314); the static builder no longer shares it.)*

**Build is committed during development, built in CI once served.** While the docs site is under active
development, the built output is rebuilt and committed on each emitter change (so the tree never drifts
stale). Once it is served via GitHub Pages, the committed build is dropped and `.gitignore`d, and CI
rebuilds it on push — the standard pattern. *(Process as much as design; may instead belong in
`notes/coding-conventions.md`.)*


## Not a decision — recorded for accuracy

**Citations are not website-broken.** Investigated this session: real citations (with a `<library>`)
resolve in the website build identically to a standalone build. The `unknown tag <handler for cite>`
warnings come from documentation pages that cite without a library, and warn the same way standalone —
example-content noise (the #281 class), not a website bug. No action; noted so the trail is accurate.