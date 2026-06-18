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
  `<config toc>` is the landing / section index. (Forward, with #246.)

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

### Asset delivery — where the scripts and styles come from
- **Baked in** (self-contained file) or **linked from the web** (CDN). Two values, not three — there is no
  "link to your own server" option.
- This choice governs the **static** output only. The live shell and editor always pull from the web; an
  offline live mode is not built.

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

## The website — the third document class

A **website** (`<meta type=website>`) is the third document class, alongside article and book: a set of
pages navigated as a site, modelled on a Quarto website / Jekyll docs theme. Output is **HTML only** — a
site is not a scholarly document, so there is no JATS projection.

- **Pages and navigation are one tree.** The master declares a `<nav>` of `<item>`s (pages) and
  `<nav-group>`s (groups — a dropdown in the top bar, an expandable node in the sidebar). An `<item>` is a
  page (external via `src`, or authored inline like a section); a `<nav-group>` purely groups — so each tag
  has one meaning. There is no separate `<page>` tag — the nav entry *is* the page, Quarto-style. The one
  tree feeds both surfaces: the top level becomes the top bar; the whole tree feeds the automatic sidebar
  (built from the shared #226 list builder). The first cut is shallow (one level of grouping); deeper
  nesting comes later. `<nav>`/`<nav-group>`/`<item>` parse with the existing `<list>`/`<li>` machinery — a
  nav tree is a nested list, so there's no second nested-structure parser.
- **Brand and chrome.** The top-bar name and the icon come from `<meta>` (title + icon) — no in-header
  `<title>`/`<icon>` tags. `<footer src>` is site-wide, set once in the master.
- **Routing.** Client-side `?page=slug`, with the browser's back/forward buttons working via history.
  Enscribe ships its **own small router** in this style; when attoweb's router is published as its own
  project, the website can lean on it.
- **Render mode is orthogonal.** The master is a *composition* model — it assembles inline-or-external pages
  into the site — independent of how the site is rendered. A website follows the same static/live grid as
  article and book. Because the live render is already built and type-agnostic, the **first build cut targets
  the live path** (and inherits the `?edit` toggle); a static pre-rendered projection (real per-page HTML
  files) and `enscribe serve` (live-server) are later modes. (Tradeoff for the live path: browser-rendered
  pages aren't plain HTML for a search engine; the static projection backfills that if/when it matters.)
- **Dogfood.** The docs site is the proof: it is rebuilt as a `<meta type=website>` site **before** #223
  reorganizes its content. The bespoke generated pages (gallery, catalogs) stay outside the type for now.