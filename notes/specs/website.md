# Website: the composition document class

A **website** (`<meta type=website>`) is enscribe's third document class, alongside article and book:
a multi-page site assembled from a master document, where **each page is itself natively an article
or a book**. This spec is the normative blueprint of the website-specific model — how pages compose
into a site, how cross-page references resolve, how page identity and URLs are formed, and the
always-render invariants the site build holds. It sits inside the multi-file frame
`notes/specs/master-document.md` provides (which owns *general* multi-file assembly); this spec owns
what is *website-specific*. Page-slug identity and the `<a {slug}>` link form are owned by
`notes/specs/spec-internal-links.md`; the live/static parity contract by
`notes/specs/render-parity.md`. Output is **HTML only** — a site is not a scholarly document, so
there is no JATS/BITS projection.

## What a website is

The master declares a navigation tree — a `<nav>` of `<item>` pages and `<nav-group>` groups — and
that tree is the single source of truth for site structure (the general nav shape is specified in
`master-document.md` §Website structure). A page's content is an ordinary enscribe document: an
`<item src>` resolves to a page-directory body or a flat `.emd`, and that file is itself a
`<meta type=article>` or a `<meta type=book>` master. A website is therefore **not a second
renderer**: a page renders through the *same* single-document path that produces a standalone article
or book. The website layer is composition *around* those native renders, not a parallel pipeline.

## The composition model

The site is built by **composition over one merged site cross-reference registry**, in two phases.
Nothing is flattened: each page is numbered and rendered in its **own native scope**.

**Phase 1 — number natively, harvest, merge.** Each page is numbered in its own native scope (an
article as an article; a book as a book, with chapters) — *without rendering*. From each page's
numbered tree its cross-reference registry is harvested, and **every anchor is merged into one site
registry** keyed:

> `anchor → { native number, owner, title, type }`

where the *native number* is the string the target's own scope produces (a book figure's `2.1`, an
article figure's `1`), and the *owner* is the page — or, for a book page, the specific chapter-page —
on which the anchor renders.

**Phase 2 — render natively over a read-through.** Each page is rendered natively (article scope or
book scope intact). Before rendering, the page's numbering registry is **seeded as a read-through over
the site registry**: a lookup the page's own scope satisfies is answered locally (its own numbering
shadows), and only a **cross-page** anchor — one the page does not own — falls through to the site
registry, which returns the target's **native** number verbatim (the read-through hands back the
harvested number with no scope re-prefixing, so a book target keeps `2.1` and an article target keeps
`1`). The rendered page's outbound cross-page reference hrefs are then realized to the owner page's URL
(see *URL schemes*).

> **The effect (the rebuild check).** A cross-page `<ref>` resolves to its target's **native**
> number and links to the page (or book chapter-page) that owns it, in **all four directions**:
>
> - article → article: the target renders `figure 1` (article-native); the ref shows `figure 1`.
> - article → book: the target renders `figure 2.1` (the book chapter-native number, **not** a
>   flattened `figure 1`); the ref shows `figure 2.1` and links to that chapter's page.
> - book → article: the book chapter's ref shows the article's `figure 1` and links to its page.
> - book → book: the ref shows the other book's native `figure 1.1` and links to its chapter-page.

Books keep book numbering, articles keep article numbering, and a reference reads its target's number
regardless of which page it sits on.

> **Invariant — a fresh tree per phase (number-twice + in-place mutation).** A page is numbered
> **twice** — in Phase 1 (native, to harvest its native numbers) and again in Phase 2 (over the
> read-through seed, so its *outbound* cross-page refs resolve) — and the engine's `runSync`
> **mutates the tree in place**. So each phase MUST assemble a **fresh** tree from the page's (cached)
> children; the two phases must never share one tree. Sharing it bakes Phase 1's results — including
> its *unresolved* cross-page refs (Phase 1 runs with no seed) — into Phase 2, so a cross-page `<ref>`
> renders as an unresolved marker even though the seed would have resolved it. A re-implementation must
> not "optimize away" the double assembly. The static build gets this for free (it re-reads each page
> from disk per phase); the live path must re-assemble each book page from its cached chapter sources
> per phase (a real bug, hit and fixed in the live #300, step 2 — #314/#324).

## Why composition, not flattening

The decisive design choice is **not** to assemble every page into one page-scope tree. Two reasons,
both load-bearing — a re-implementation must not reintroduce flattening:

1. **Flattening destroys native numbering.** Assembling all pages under one synthetic container forces
   a single page scope onto every page, so a book page's figures renumber to page scope (`figure 1`
   instead of the book-native `figure 2.1`) and lose their chapter prefix. Composition preserves each
   page's native scope precisely because each page is numbered on its own, before merging.
2. **A page-isolated render cannot resolve cross-page references.** The failure mode that motivates the
   merged registry: rendering each page as a wholly separate pass (no shared registry) leaves a
   cross-page `<ref>` with nothing to resolve against — it renders as an unresolved-reference marker.
   The merged site registry + the read-through is what gives every page a view of every other page's
   anchors.

> **The proof-effect.** Under composition an article→book reference shows the book chapter-native
> number (`figure 2.1`). A flattening assembly *cannot* produce that number — it has already collapsed
> the book to page scope. So the `figure 2.1` effect is the observable signature of the composition
> model, and the regression test a rebuild is checked against.

## Page identity (slugs)

A page's stable identity is its **slug**, unique site-wide; the nav supplies *where* a page sits, the
page supplies *what* it is. The slug is the first of these that yields a non-empty value:

1. **pinned** — an explicit `<meta slug>` in the page source (the permanent identity);
2. **derived** — else the page's `<meta title>`, slugified;
3. **nav** — else the nav menu/group title, slugified;

with two last resorts when none of the above applies: the `src` filename stem, then the literal
`page`. (Tiers 1–2 require the page's loaded source; the *nav-model* pass — which has no page sources —
resolves at the nav tier, but **both build surfaces now load each page's source** and resolve at tiers
1–2, so the live/static identity seam is closed; see *Relationships*.)

Slug **collisions are governed by always-render, never a build error**:

- two **derived** slugs that collide are **uniquified** (a suffix appended) so both pages get working
  URLs, with a warning;
- a **pinned** duplicate (two pages with the same explicit `<meta slug>`) is **not** renamed — the
  engine never silently renames a pinned identity — so it warns, and because the two pages then share
  one slug they share one output URL: both are *processed*, but only one is *addressable* (the later
  page in nav order overwrites the earlier at the shared path). The build completes; the accepted cost
  of never renaming a pinned identity is that one of the colliding pages is unreachable.

The full identity model and its collision rules are owned by `spec-internal-links.md`; this section
states how the website build applies them.

## URL schemes and the parity contract

A slug maps to a **nav-path** (the slugified group titles it nests under, then its own slug) and
thence to a URL. **The first nav page is the home page** — by position, the first page entry in the
nav tree, *not* a flag — and it maps to the **empty** nav-path: the dist root statically, the default
route live. Every other page maps to its own nav-path. The two render surfaces realize a nav-path
into a URL through **different schemes, by design**, selected by a scheme hook injected into the one
cross-page href resolver:

- **static** — a dir-per-page tree: each page is written at its nav-path location and addressed by a
  pretty trailing-slash path URL relative to the current page's depth (`../references/export/`); the
  home page (empty nav-path) is the dist root (`index.html`).
- **live** — the single-page app keeps client-side `?page=slug` routing. A book page's CHAPTER is a
  sub-route on the same query: `?page=slug&chapter=<stem>` (the chapter-as-page scheme — analogous to
  the static `<book-dir>/<stem>.html`), and the URL **hash** is purely a section anchor within a
  chapter (`?page=slug&chapter=<stem>#<id>`), so a section is deep-linkable. `&edit` is just another
  query param, so chapter + edit are order-independent.

> **One engine, two adapters, two scheme hooks (the realized form, #324).** Both surfaces run the
> *same* composition engine — `composeSiteRegistry` (Phase 1 above) — and differ in exactly **two**
> injected ways: the **I/O reader** (static reads each page from disk; the live SPA `fetch`es it) and
> the **URL scheme** (the hook here: a `.html` path vs a `?page=` route). The static build and the live
> SPA are two callers of one engine; see *Relationships and the live deviation*.

A cross-page reference's href is realized to the **owner page's** scheme (a reference into a book page
points at the owning chapter-page's file/route — static `<book-dir>/<stem>.html#anchor`, live
`?page=slug&chapter=<stem>#anchor` — with the anchor preserved). A same-page reference into ANOTHER
chapter of the book being served is realized to that chapter's route too (static a sibling
`<stem>.html#anchor`, live `?chapter=<stem>#anchor`); only a SAME-chapter reference keeps a bare
`#anchor` (a pure in-page scroll).

> **Parity contract.** The static and live surfaces are compared on the **display number** and a
> **scheme-normalized owner** — never on raw hrefs, which differ by design (a `.html` path vs a
> `?page=` route). Two references agree when they show the same number and resolve to the same owner
> page once the scheme is normalized away.

This is the seam `render-parity.md` references for the website path; the substantive parity section
there is the follow-on (#319).

## The internal link layer

An authored internal link is `<a {slug} | label>` (recorded by the `<a>` handler as a `data-page-slug`
marker; an external/absolute/fragment href is an ordinary anchor and untouched). The website build
resolves each marker against the site's slug → page map:

- a **resolvable** slug becomes the target page's URL in the current surface's scheme; when the
  authored label is empty the link is auto-labelled from the target page's title;
- a link to a **derived** (un-pinned) slug also resolves, but **warns** — a derived slug is
  title-coupled, so a title rename would silently break the link;
- a **broken** slug (no page has it) **degrades, text-preserving**: the authored label text stays, the
  live href is dropped, and the link is flagged with the unresolved-link marker (the `ref-error`
  styling shared with an unresolved `<ref>`). A warning naming the slug is emitted; the **build
  completes** — a broken authored link never throws.

The `<a {slug}>` form, the slug-source tiers, and the degrade marker are owned by
`spec-internal-links.md`; this section describes the website path's use of them.

## Always-render invariants

Every page **always renders**; no website-specific condition halts the build. In particular:

- a **nav diagnostic** raised by the structurer (a pipe-labelled group, a malformed entry) surfaces as
  a build warning, not a failure;
- a nav `<item src>` that **does not resolve** to a page body is skipped with a warning;
- a **slug collision** uniquifies-or-warns (above), never a build error;
- a **broken cross-page reference** renders the unresolved-reference marker inline (its target page was
  never produced), never a crash;
- a **broken `<a {slug}>`** degrades text-preserving with a warning (above);
- a page that **fails to number or render** is skipped with a warning naming it; the rest of the site
  still builds.

All warnings are surfaced on the console / CLI (the CLI build prints the build's collected warnings)
and never halt rendering. The one boundary is structural rather than content: a master that declares
`<meta type=website>` but resolves to **zero pages** is a build error — there is no site to produce.

## Relationships and the live deviation

- `master-document.md` owns **general multi-file assembly** (the master shape, `src` discovery, the
  one project-wide registry pass); `website.md` owns the **website-specific composition** above.
- `spec-internal-links.md` owns **page-slug identity and the `<a {slug}>` link layer**;
  `render-parity.md` owns the **live/static parity contract**.
- `notes/specs/delivery-modes.md` owns the **delivery-mode model** — how a document is *packaged* and
  reaches a reader (Static / Live / single-file; the shell, the runtime fetch, the asset seam). The
  live website is the **multi-page profile of the Live delivery mode**: `website.md` owns *composition*,
  `delivery-modes.md` owns *packaging/delivery*. Orthogonal — same engine and composition, different
  wrapper.
- **The composition fork is now CLOSED.** The live SPA composes through the *same* engine as the static
  build — `composeSiteRegistry` (the live #300, step 2 — #314/#324): it fetches each page's source (and
  a book page's chapter children), numbers every page in its **native** scope, and resolves cross-page
  `<ref>`s off the one merged registry. Nothing flattens; a book page keeps **book** numbering
  (`figure 2.1`), the composition's observable signature. Page **identity** converged too — the live
  path now loads page sources, so it resolves the pinned/derived slug (tiers 1–2), not just the nav-tier
  slug. The old page-scope `buildWebsiteTree` / `isWebsiteAssembly` assembly is **gone**: the
  parity-corpus slice (**#320**) deleted the flatten (`buildWebsiteTree` / `buildLiveWebsite` /
  `renderLiveWebsitePage`) and the `numbering.js` `'page'`-scope branch, and reworked
  `website-xref.test.js` into a direct static≡live parity corpus that drives the real static build and
  the real live SPA over one corpus (replacing the old flatten mirror).
- **The `<a {slug}>` LINK layer now resolves on BOTH surfaces (#318).** The `<a>` handler still records a
  `data-page-slug` marker, but resolution moved UPSTREAM of serialization: a render-time hast tree-pass
  (`resolvePageSlugLinksInTree`) the compiler runs over the in-memory tree just before stringify, when the
  website builder injects a resolver on `file.data` (`ENSCRIBE_PAGE_LINK_RESOLVER`). So ONE mechanism serves
  static and live — the URL scheme (`.html` path vs `?page=` route) is the injected resolver's, the same
  scheme-hook seam as the cross-page `<ref>` rewriter. This removed the HTML re-parser the old string-pass
  needed (parse5 was a browser-bundle hazard, #25) from the slug-link path entirely; cross-page `<ref>`s — a
  *different*, string-only resolver (`rewriteCrossPageHrefs`) — already resolve live, in every direction.
- **The live edit surface is uniform across page types.** A book PAGE in edit mode edits PER-CHAPTER — the
  same `mountEditLoop` machinery the standalone book mount uses, embedded so the website's own
  `?page=`/`?chapter=`/`#hash` router drives it: `?page=book&chapter=<stem>&edit` assembles the book's chapter
  children and renders the per-chapter edit view, the `?chapter=` route switching the editable chapter (order-
  independent with `&edit`), mirroring how **read** mode renders it as a book. (This closed
  the one earlier live lag, where a book-page edit preview rendered the master standalone — empty chapters.) As
  with the article edit preview, a cross-page `<ref>` to ANOTHER page stays unresolved while editing (the
  standalone-render approximation); the authoritative link is the read render / on reload.

## Cross-references

- `notes/specs/master-document.md` — general multi-file assembly; its §Website summarizes this model
  and points here.
- `notes/specs/spec-internal-links.md` — page-slug identity (the source tiers) and the `<a {slug}>`
  internal-link form + degrade marker.
- `notes/specs/render-parity.md` — the one-engine live/static invariant and the website parity seam
  (display number + scheme-normalized owner).
- `notes/specs/delivery-modes.md` — the delivery-mode model (Static / Live / single-file packaging);
  the live website is the multi-page profile of the Live mode.
- `notes/decisions.md` — "The website — the third document class" (the product-shape decision this
  blueprint serves), its "One engine, browser-pure, two adapters" note (the realized #300 architecture +
  what *browser-pure* means for the engine — the cross-cutting fact), and "Always renders — never block
  the build on an error."
- `notes/specs/toc-and-numbering.md` / `notes/specs/book-navigation.md` — the per-class contents and
  navigation chrome a website page inherits from its native article/book render.

*Implemented by the one browser-pure composition core
`packages/enscribe/src/master-document/compose-site.js` (`composeSiteRegistry`), called by **both**
`packages/cli/src/static-website.js` (the static build, fs reader) and
`packages/enscribe/src/interpreter/browser.js` `mountLiveWebsite` (the live SPA, fetch reader).
`master-document/live-website.js`'s `buildWebsiteTree` flatten was deleted by #320 (the file now holds
only the nav-model flattener + the `?page=` not-found view); `packages/cli/test/website-xref.test.js` proves
static≡live directly over the real composition path. These are non-normative pointers; the model above
is the blueprint.*
