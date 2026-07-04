# Enscribe design decisions

The settled strategic and product-shape decisions: the target user-facing
experience and the cross-cutting choices that steer it. This is the tier above
`DESIGN.md` — `DESIGN.md` holds the engineering rationale (the layer model, the
pipeline, the interoperability model — JATS, TEI, EPUB, Scholarly HTML); this file holds the product-shape decisions
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
browser, edited as `.emd`, and — with the planned TiddlyWiki-style save — written back to a `.emd` file or an
eHTML file, on a server or the user's own disk. The browser is the editor, the renderer, and the
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
- **eHTML is the rendered output, not an input.** It is browser-native HTML, so it can be authored or
  edited by hand in principle and will display — but the tools do not accept eHTML as a render input.

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
- The **TiddlyWiki-style save** — edit `.emd` in the browser and write it back to a `.emd` or eHTML file,
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
(`/references/eHTML/export/`). This requires an HTTP server (the trailing slash resolves to
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
`notes/specs/spec-internal-links.md`. *Caveat (status): `<a {slug}>` **link** resolution is implemented on the
**static** build only — the live SPA's `data-page-slug` markers are still inert there (bundle-safe live
resolution needs a render-time `<a>`-handler resolver, its own slice — [#318](https://github.com/enscribejs/enscribe/issues/318)).
Live page **identity** has since converged (the live #300, step 2): the live path now loads each page's source and
keys on the pinned/derived slug (tiers 1–2), no longer the nav-title slug; and cross-page `<ref>`s resolve live in
every direction. (The static build's earlier cross-page
**`<ref>`** regression — the per-page-isolated render that could not resolve a reference across pages — was
#300; it is **fixed** by the composition builder above, and the served `site/dist` is rebuilt on it.) The
decision stands; the live path has caught up to it (composition + identity), bar the `<a {slug}>` link slice.*

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
which each page was a separate pass and a cross-page `<ref>` could not resolve — the #300 regression. *(This
composition is now shared by **both** render surfaces — see the next paragraph.)*

**One engine, browser-pure, two adapters (the live #300 — [#314](https://github.com/enscribejs/enscribe/issues/314)
/ [#324](https://github.com/enscribejs/enscribe/issues/324)).** The composition above is a single, **browser-pure**
engine — `composeSiteRegistry` — now called by **both** the static build (a filesystem reader + a `.html`-path URL
scheme) and the live SPA (a `fetch` reader + a `?page=` route scheme). The I/O reader and the URL scheme are the
**only two** injected differences; everything else — numbering each page natively, harvesting, merging the one site
registry, the read-through seed — is the shared engine, so the live path stopped flattening books to page scope
(#314 closed) and a book page now keeps **book** numbering. *"Browser-pure" here means the core **loads cleanly in
the browser bundle**, NOT "zero `node:` imports in its transitive graph":* some engine leaves under
`interpreter/assets/` (e.g. `font-loader.js`) statically import `node:fs`/`url`/`path`, but tsup aliases those
`node:` forms to a throwing stub and the reads sit behind lazy accessors, so they are dead code in the browser. The
browser-purity guard (`packages/enscribe/test/compose-site-browser-pure.test.js`) encodes exactly this distinction —
it permits a `node:` import **only** in those tsup-aliased `interpreter/assets/` leaves and fails it anywhere in
`master-document/`, `core/`, or `interpreter/lib/` — so a future edit can't silently re-Node-ify the core and break
the live path. (Two narrow live lags remain — `<a {slug}>` link resolution and book-page edit mode — see
`notes/specs/website.md` §"Relationships and the live deviation".)

**Build is committed during development, built in CI once served.** While the docs site is under active
development, the built output is rebuilt and committed on each emitter change (so the tree never drifts
stale). Once it is served via GitHub Pages, the committed build is dropped and `.gitignore`d, and CI
rebuilds it on push — the standard pattern. *(Process as much as design; may instead belong in
`notes/coding-conventions.md`.)*


## Reference standards: guide, don't gate

JATS, TEI, and Scholarly HTML are Enscribe's **reference standards** for scholarly document structure. They
*guide* eHTML's design — they are the accumulated wisdom of how scholarly documents are modeled, so Enscribe
consults them when designing elements and aims to translate cleanly to them. They sit **above** output-
convenience formats (LaTeX, Quarto, docx, epub — which inform nothing about eHTML's *shape*; they are export
conveniences, not structural standards) and **alongside each other** as established serialization schemes.

**They guide; they do not gate.** Compliance is desirable, not required at each step. When forward progress
requires eHTML to diverge from a reference standard, Enscribe **diverges, files an issue to restore
compliance later, and proceeds.** Divergence is a tracked, deferrable debt — never a blocker on internal
evolution. The standards shape *where eHTML is going*; they never gate *whether the next step can be taken*.

The distinction is two switches, not one dial: **guidance ON** (design-binding — the standards shape the
target), **gating OFF** (timing-advisory — never blocks a step). This preserves the interop positioning
("Enscribe documents translate cleanly to JATS and TEI") without taxing development velocity.

Consequences:
- The taxonomies and per-element specs do **not** owe a JATS/TEI projection per element. Serialization to a
  reference standard is a downstream translation that consumes the HTML-shaped eHTML (see #147: eHTML is
  HTML-shaped; standards are consulted and exported-to, never shaping). Per-element interop projection lives
  in the **interop cluster** (JATS, TEI, Scholarly HTML, the SPAR ontology mappings, CSL), planned together,
  designed HTML-shape-first.
- JATS-specific work (e.g. `<dataset>` -> JATS, #313 slice 3) is **not** a completion blocker for its epic; it
  is an interop-cluster item, designed alongside TEI.


## eHTML is the primary artifact; JATS is one export among several

**eHTML is a primary rich-document HTML vocabulary — a genuinely useful artifact in its own right, not a
display target for JATS or a projection of it.** A finished eHTML document is browser-native, self-resolving
(see *eHTML resolves its own dynamic elements*), and readable on its own terms; it does not owe its existence
or its value to any downstream schema. This extends *Reference standards: guide, don't gate* above, sharpening
its framing: the reference standards guide eHTML's *shape*, but eHTML is the thing being designed, not a
rendering of one of them.

**JATS is one interchange/export target among several — TEI, EPUB, and Scholarly HTML sit on equal footing
with it.** JATS is not the anchor and not the bridge to scholarly publishing; it is one destination in a set
of equally-positioned ones. It stays accurate and important — it is the most mature scholarly-interchange
schema and the best-developed export today — but it is not privileged above the others in how Enscribe frames
its interoperability.

**Interoperability is high priority, but not first-class.** Translating cleanly to the reference standards
matters and is designed for (the interop cluster: JATS, TEI, Scholarly HTML, CSL, SPAR); it never gates
internal evolution and never ranks above eHTML being a good HTML vocabulary in its own right. Guidance ON,
gating OFF, and no single export schema at the center.


## Contributor model — `author` and `editor` are one structured type (#338)

`<author>` and `<editor>` are the **same kind of thing** — a contributor (a person or institution with a
name, affiliation, ORCID, email) — differentiated only by **role**, never by containment shape. Every
reference standard models it this way: CSL-JSON treats `author`, `editor`, `translator`, and ~20 more roles as
the **same** `NAME_LIST` object (the role is just the field name); JATS uses one `<contrib>` with a
`contrib-type` attribute wrapping the same structured `<name>` / `<aff>` / `<contrib-id>`; BibTeX's `author`
and `editor` are the same name-list type. (Standards-alignment per "Reference standards: guide, don't gate.")

**Decision.** One structured contributor for both, distinguished by a **role label**. The canonical shape is
`<author>`'s **child-tag** form — `name` / `affiliation` / `orcid` / `email` lift to child elements
(`lifts_to_child`) — because the name *parts* must stay machine-addressable for the citation path (citation-js)
and downstream processors; flattening to `data-*` strings throws away exactly that structure. `<editor>` is
unified to that shape; its current flat `data-*` attribute mapping (`data-affiliation`, `data-orcid`,
`data-editor-role`, …) is retired, with `role` staying the distinguishing attribute.

**Name boundary (scoped deliberately).** The structure goes to the **field level** — `name` is a single
`<name>` child, **not** split into `given` / `family` sub-parts. Enscribe's citation path parses the name
string, so field-level structure is enough today; a full CSL/JATS `given`/`family` split is a separate, later
question, not part of this decision.

**Status — implemented (#338).** `<editor>` is unified to `<author>`'s structured contributor model: added to
the `STRUCTURED_ELEMENTS` registry (the real lift authority — the frontmatter `lifts_to_child` alone is
documentary), so `name`/`affiliation`/`orcid`/`email` lift to child tags; `role` stays a scalar that maps to
the `data-role` attribute (the earlier `data-editor-role` flat mapping is retired). JATS export emits
`<contrib contrib-type="ROLE">` in the `contrib-group` alongside authors, and import distinguishes
`contrib-type` back to `<author>`/`<editor>` — round-trip verified, DTD-valid. Name-level parity with author's
JATS export; **full structured-children JATS export (`<aff>`/`<contrib-id>`, and clean `<string-name>` for
structured contributors) remains deferred for BOTH author and editor** — author's `extractText`-based
`<string-name>` concatenates a structured contributor's fields, a pre-existing limitation editor now shares.

---

## Enscribe HTML (eHTML) resolves its own dynamic elements — at build AND at load (one resolver, two entry points)

**Status — decided, not yet implemented.** An audit + scoping pass is queued (after the #328 rename and the
current issue batch) to determine what it takes; this records the target and the shape.

**The point of the framework.** eHTML's reason to exist is that it *resolves its own dynamic elements* — a
`<cite>` becomes a formatted citation, a `<note>` numbers and places itself, a `<ref>` finds its target, a
`<library>` builds a bibliography — via the framework's JavaScript + custom tags. Without that, eHTML is just a
handful of HTML tags. Resolution is the framework.

**Target: a self-contained live document.** A hand-authored eHTML file containing unresolved semantic tags plus
a `<script>` that loads the eHTML runtime should, when opened in a browser, **resolve itself at load time** —
numbering, citation formatting, cross-reference linking, bibliography assembly — with no shorthand compiler and
no build step in the loop. The `.html` file *is* the document. This must work for eHTML that arrives by **any
route**: hand-authored, imported from JATS/another format, or emitted by another system.

**Current state (as coded).** Resolution runs at **shorthand-compile / build time**: the interpreter plugins
(library-load → build-citation-index → notes → note-placement → numbering → ref-resolution → cite-resolution →
bibliography) resolve over an intermediate tree and bake **resolved** HTML. There is already a marker stage
(`__cite-marker`/`__ref-marker` internal nodes) and a browser path that defers *cross-page* refs to navigation
time — so partial live resolution already exists. But single-document resolution is eager/build-time, and the
resolution logic is bound to the compile, so **eHTML not produced by the shorthand compiler does not currently
self-resolve.**

**The decision: keep BOTH modes, via ONE origin-agnostic resolver.**
- **Pre-resolved (static), build-time** — the existing behavior. Needed for fast first paint, no-JS/script-
  stripped contexts, archival/print, crawlers, and **JATS/PDF export** (you cannot export a document whose
  citations only exist after a browser runs). Also the anchor of the existing `live≡static` byte-identity
  invariant.
- **Live-resolving, load-time** — the new capability. Needed for the self-contained hand-authored file, client-
  side authoring/editing, runtime-dynamic content, and eHTML from systems that don't run our build.

These are **not two formats and not two resolvers** — they are the same semantic tags resolved at two entry
points by the **same** resolution logic. Pre-resolved output is the **build-time snapshot of the live mode**.
The implementation target is therefore: make the existing resolver **origin-agnostic** (operate on the element
tree regardless of whether a compiler or a browser produced it) and give it a **browser-load entry point** in
addition to the build entry point. Do **not** build a separate live resolver — two implementations would drift.

**The guard against drift.** The correctness invariant becomes: *a document resolved live, then snapshotted, is
byte-identical to the same document resolved at build.* This generalizes the existing `live≡static` invariant
from cross-page refs to all dynamic elements, and is the design constraint the implementation must hold.

**What the queued audit must find** (read-only, verify-against-code): per resolver (numbering, note-placement,
citation-index, ref/cite-resolution, bibliography) — (1) does it operate on the eHTML element tree, or on a
compile-only intermediate?; (2) does it read parse/build state (file objects, compile-populated registries,
assets dir) that a raw browser-loaded eHTML file wouldn't have?; (3) how much does the existing browser bundle
already resolve client-side?; (4) is the bibliography/citation-js path loadable client-side (cf. the DSL
registry's CDN/bundle-loader machinery for mermaid/abc), or build-only?; (5) the concrete gap list —
"wire the existing pass to a DOM entry point" vs. "genuinely build-only." The intuition is that the machinery
largely exists and needs a DOM entry point plus severing build-only state dependencies; the audit confirms or
refutes that before any implementation.

**Scope correction — the resolver covers ALL build-engine derivations, not just references.** The original
framing named citations / notes / cross-references. That undercounts. The `.emd` build engine performs a whole
class of **derivations** that the eHTML runtime must *also* be able to perform on load, or a hand-authored /
imported / externally-emitted eHTML document is inert (missing its numbers, ToC, labels). The full set the
origin-agnostic resolver must eventually cover:

- **Reference resolution** — cites, refs, notes, bibliography (partially built; browser path exists).
- **Counter-based numbering** — **section numbers**, equation numbers, figure/table numbers, theorem-family
  numbers. Today these are computed at build and *baked in*; the runtime cannot currently derive them.
- **ToC / nav construction** — built from document structure at build; the runtime must be able to construct it.
- **Any other structure-derived output** the build engine produces that isn't authored by hand.

The test for each: *can it run in the browser, from eHTML tags alone, without the shorthand parse or the build
context?* The queued live-resolution audit must inventory **every** build-engine derivation against this test —
not just the reference subset.

**Prerequisite ordering — semantic elements enable live derivation.** The span→custom-element conversion (the
`<span class="section-number">` → `<section-number>` cleanup) is not merely a semantics-hygiene fix; it is a
**precondition** for live derivation. The runtime can *find and populate* a real `<section-number>` element on
load; it cannot do anything with a frozen `<span class="section-number">3.2.1</span>` baked at build. So the
sequence is: **(1) custom semantic elements first** (gives the runtime real targets), **(2) live derivation
second** (the runtime computes into those targets). The two efforts are one architecture: *eHTML is a semantic
format whose engine derives everything the build engine derives, in the browser, from real elements.*

**Relationship to the span audit and the numbering insight.** The span-drift finding (output was
under-semantic: class-strings on meaningless elements) and this derivation-gap finding (capability was
under-portable: locked in the build engine) are two views of the same gap — eHTML received a diminished version
of what the build engine does. Making eHTML a first-class self-sufficient format means closing both: real
elements (span audit) + full derivation at load (this scope correction).

## Not a decision — recorded for accuracy

**Citations are not website-broken.** Investigated this session: real citations (with a `<library>`)
resolve in the website build identically to a standalone build. The `unknown tag <handler for cite>`
warnings come from documentation pages that cite without a library, and warn the same way standalone —
example-content noise (the #281 class), not a website bug. No action; noted so the trail is accurate.

