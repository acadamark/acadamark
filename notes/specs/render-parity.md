# Render parity: one engine, byte-identical on matched options

Live (in-browser) and static (CLI) rendering are **one engine, not two**. This
spec is the normative statement of that invariant: the two entry points, the
byte-parity guarantee and exactly what is in and out of it, and the
source-agnostic content rule. The *rationale* — why enscribe uses the browser as
its rendering engine and treats live and static as co-equal modes — lives in
`DESIGN.md` ("Live and static rendering are one engine, not two."); this spec is
the implementation-precise blueprint that direction defers to.

## The two entry points

Both paths compile an `.emd` source to the HTML the browser renders, and both
run the *same* engine:

- **Static / compiled** — the CLI `build` command. `doBuild`
  (`packages/cli/src/cli.js`) constructs the processor with
  `buildEnscribePipeline`, assembles any multi-file master with
  `assembleMasterDocument`, then `runSync` + `stringify`. Content is read from
  disk with Node `fs`.
- **Live / in-browser** — the browser façade
  (`packages/enscribe/src/interpreter/browser.js`): `render` / `renderInto`
  (synchronous), `renderAsync` (pre-fetches `<library src>` bibliographies), and
  `renderMasterAsync` (pre-fetches `<section src>` children of a multi-file
  master). Each obtains its processor from the same `buildEnscribePipeline`, and
  the multi-file path runs the same `assembleMasterDocument`. Content arrives via
  `fetch`.

**One engine.** `buildEnscribePipeline`
(`packages/enscribe/src/interpreter/index.js`) is the single processor factory;
`assembleMasterDocument` (`packages/enscribe/src/master-document/assemble.js`) is
the single multi-file assembler. The CLI and the browser entries call them
*identically*. The assembler is pure over its injected `readFile` / `resolve` /
`parse` — the CLI injects Node `fs` operations, the browser injects a
preloaded-cache lookup over fetched text — so the same assembly logic runs in
both environments without a second code path.

## The invariant

> On the same source with matched options, the live and static entry points
> produce **byte-identical** rendered output.

Stated at the level of intent it is a *perceptual / content equivalence* — the
reader sees the same document regardless of mode — and it is **enforced as
byte-identity on matched options**. "Matched options" is the load-bearing
qualifier (see "Scoped out" below): it isolates the engine from the two surfaces'
deliberately-different *defaults*.

### Granularity: per-chapter ≡ full-render slice (lazy book rendering, L1)

A second byte-identity axis, along granularity rather than live-vs-static. A
render is a cheap **global pass** (`proc.runSync`: structure / number / resolve
cross-references — no HTML rendering) producing a numbered tree, then a **compile**
(`proc.stringify`) that is the expensive part. A book can compile either way from
the *same* numbered tree: **full** (every chapter — the static build, and today's
live render) or **per-chapter** (`renderChapter` compiles one `<book-part>` — the
unit the live lazy path renders on demand). The invariant:

> A chapter compiled in isolation via `renderChapter` is **byte-identical** to that
> chapter's content within the full-book compile.

It holds **by construction**: the global pass bakes every cross-chapter concern
into the tree before any compile (a cross-reference's number is resolved against
the whole-book numbering registry; per-chapter figure numbering and per-chapter
notes are stamped in place), so a `<book-part>` subtree is self-contained and its
compile is a pure projection. The only depth-sensitive detail is `rehype-format`'s
indentation, reproduced by compiling the chapter at its in-context nesting depth
(`book > book-body > book-part`). The harvested cross-reference registry
(`harvestCrossRefRegistry` → `anchor → {number, title, type}`) is the bridge for
the cross-chapter case — a reference whose target chapter was never compiled still
carries its number+title. Enforced by `test/render-chapter-parity.test.js` (see
Audit). This compile-time per-chapter **render** is distinct from the runtime
single-chapter **paging** display mode (`chapterNav`, scoped out below).

## Source-agnostic content

`<table src>`, `<library src>`, and multi-file `<section src>` children resolve
to the **same content regardless of how the bytes arrived** — a Node `fs` read
(static) or a browser `fetch` (live). The engine consumes already-loaded content:
preloaded sources are handed to the pipeline on the shared `VFile` via
`file.data[ENSCRIBE_LOADED_SOURCES]` (the bus key defined in
`src/core/file-data-keys.js`), and the assembler reads through its injected
`readFile`. *How* a `src=` payload was loaded is upstream of, and invisible to,
the engine — so it cannot be a source of divergence.

## What is scoped out of byte-parity

Two classes of difference are deliberately **outside** the byte-parity claim
because they are content-equivalent *packaging*, not divergent *rendering*. They
are option-driven: matching the option brings the two surfaces into byte-parity.

- **Default resource packaging.** The CLI defaults to self-contained output
  (`embedResources: true` — inline fonts, KaTeX CSS, assets); the browser
  defaults to external CDN links (`embedResources: false`). Same option, same
  bytes.
- **Default DSL delivery.** The CLI bakes diagrams statically (or `live-inline`)
  under its default `dslMode`; the browser defaults to `dslMode: 'live-link'`
  (CDN-linked library, rendered client-side). Same `dslMode`, same bytes. (These
  per-DSL `skip` / `live` / `static` modes are specified in
  `notes/specs/render-quality.md`; they intentionally emit *different markup per
  mode* — which is exactly why matching the option is what yields parity.)

The divergences that remain are **environment-gated I/O, not engine
divergences.** The Node-only `fs`/`path` code — asset inlining, `font-loader.js`,
the `<table src>` branch, `library-load.js`, and the DSL `node-assets` loaders —
runs only under Node. In the browser bundle those imports resolve to **throwing
stubs** (`src/interpreter/assets/node-builtin-stub.js`) and their bodies are
unreached dead code under the browser defaults. This is the build/run seam
documented in `notes/specs/core.md` (the browser-safety boundary); the engine on
either side of it is the same.

**Interactivity is not content**, and is also out of scope: the `renderInto`
`innerHTML` write, script/asset activation, live DSL execution (`mermaid.run`),
hover-preview (Tippy/Popper), ToC scroll-spy, the book reading interface's
"on this page" highlighting, and the opt-in single-chapter paging all act on
already-produced content. Parity is a claim about the produced HTML string, not
about the post-render DOM behaviours layered onto it. The book reading interface's
chrome MARKUP (chapter rail, prev/next, on-this-page rail) is by contrast static
content — built at compile time — so it IS inside byte-parity; only its runtime
highlighting/visibility is the interactivity scoped out here.

## Two terminology cautions

- This whole-pipeline **live / static** sense is *not* the per-DSL
  **skip / live / static** rendering modes (`notes/specs/render-quality.md`),
  which choose *when* one external diagram renders and deliberately diverge in
  markup. Matching `dslMode` is precisely what reconciles them.
- **byte-identical** here is the *cross-mode render invariant*. It is distinct
  from the **byte-identical** *vocabulary-migration* invariant (`DESIGN.md`, the
  vocabulary-boundary principle), which holds the HTML *and* JATS output steady
  across a Layer 1 element rename. Same word, different invariant.

## Audit — it holds today

The invariant holds in the current code; the engine is already one, so it is true
by construction rather than by a guard. The **standing automated enforcement** is
the parity test (GitHub issue #193) — a representative corpus rendered both ways
and asserted byte-identical on matched options — now landed as
`packages/enscribe/test/render-parity.test.js`. Current-state evidence that it holds:

- `packages/enscribe/test/render-parity.test.js` (issue #193) — the standing
  guard. For the two multi-file masters it asserts the live `renderMasterAsync`
  (fetch-assemble) output is byte-identical to the static `assembleMasterDocument`
  (fs-assemble) output on matched options; for the single-file corpus it asserts
  the browser `render` is byte-identical to a fresh
  `buildEnscribePipeline().processSync` on matched options. Fixtures needing fetch
  loaders the browser lacks (`<table src>` #195, `<library src>` #196) and the
  static-only abc-bake are excluded with explicit reasons, and a guard fails if an
  exclusion stops naming a real fixture.
- `packages/enscribe/test/master-document-browser.test.js` (issue #194, commit
  `34df233`) — the browser `renderMasterAsync` output is checked against the CLI
  master-document build on the same master + children: continuous cross-file
  figure/section numbering and cross-file `<ref>` resolution, byte-exact. The
  browser-multi-file ≡ CLI byte-parity test.
- `packages/enscribe/test/browser-memo.test.js` — the browser `render` entry is
  byte-identical (`assert.strictEqual`) to a freshly-built
  `buildEnscribePipeline().processSync`: the browser façade adds no divergence
  over the core engine.
- `packages/enscribe/test/library-src.test.js` (issue #133) — a `<library src>`
  bibliography resolves identically whether loaded via Node `fs` (static) or
  browser `fetch` (live): the source-agnostic rule.
- The #192 Phase-0 parity audit — a feature-rich single document rendered static
  (`processSync`) vs the bundled browser `render` on matched options came out
  byte-identical (sections, inline + display math, a figure with id, resolved and
  unresolved cross-refs, a list, an aside).
- `packages/enscribe/test/render-chapter-parity.test.js` (lazy live book rendering,
  L1) — the **granularity** invariant: each `master-book` chapter compiled in
  isolation via `renderChapter` is byte-identical (`assert.strictEqual`) to that
  chapter's `<book-part>` fragment within the full-book compile, and the harvested
  cross-reference registry's number equals the baked cross-ref text. Expected green
  on landing (holds by construction; a standing regression guard for the per-chapter
  render the live lazy path is built on).

## The website path

The static website composition (the CLI build) and the live website (the browser SPA) are a **third
render-producing surface**, beyond this spec's two single-document entry points. Both render each page
through the *same* per-document path — an article natively as an article, a book natively as a book —
over one merged site cross-reference registry (the model is specified in `notes/specs/website.md`).
Their parity is stated differently from the single-document byte-identity above, because the two
surfaces address pages through **deliberately different URL schemes**: the static build writes a
dir-per-page tree of relative `.html` paths; the live SPA routes client-side via `?page=slug`. Raw
hrefs therefore differ by design, and comparing them would always diverge.

> On the same site with matched options, a cross-page reference renders the **same display number** on
> both surfaces and resolves to the **same owner page once the scheme is normalized** — never compared
> as a raw href.

The two load-bearing terms:

- **display number** — the reference's target number is the page's *native* number (a book figure
  "2.1", an article figure "1"), identical on both surfaces because both number each page in its own
  native scope (composition, not flattening — see `website.md`).
- **scheme-normalized owner** — the target is reduced to *which page (or book chapter-page) owns it*,
  with the surface's URL scheme stripped away (`.html` path vs `?page=` route). Two references agree
  when they show the same number and resolve to the same owner.

### One composition path, no flatten

Both surfaces compose a website the **same** way: `composeSiteRegistry` (the browser-pure core in
`master-document/compose-site.js`) numbers each page in its own native scope and merges one site
registry; the static build and the live SPA's `mountLiveWebsite` are its two callers. A book page keeps
**book** numbering on both surfaces — the earlier live deviation, where the SPA flattened all pages into
one synthetic page-scope container (`isWebsiteAssembly`) and renumbered a book page to page scope
([#314](https://github.com/enscribejs/enscribe/issues/314)), is **resolved**: that flatten
(`buildWebsiteTree`/`buildLiveWebsite`/`renderLiveWebsitePage` and the `'page'` counter scope) was
deleted with the parity-corpus slice ([#320](https://github.com/enscribejs/enscribe/issues/320)), so no
re-implementation can reintroduce it. `website.md` specifies the composition model.

### Audit

`packages/cli/test/website-xref.test.js` exercises the website cross-reference effect in all four
directions (article→book, book→article, book→book, within-book) **both ways**: it drives the real static
build (`buildStaticWebsite`) and the real live SPA (`mountLiveWebsite` in jsdom) over the shared p314
corpus and asserts, for every direction, that the **display number is byte-identical static≡live** and
the **owner matches once the scheme is normalized**. The book direction — a book page rendering as a
book with native numbering (`figure 2.1`, not a flattened `figure 1`) on both surfaces — is the
observable signature that the flatten is gone ([#320](https://github.com/enscribejs/enscribe/issues/320)).

## Cross-references

- `notes/specs/website.md` — the website composition model and the live/static website parity seam
  (display number + scheme-normalized owner), specified by the website-path section above.
- `DESIGN.md` — "Live and static rendering are one engine, not two." (the
  rationale; the substrate premise that the browser *is* the renderer).
- `notes/specs/pipeline.md` §14 (Client-side rendering) — the browser entries and
  the shared-pipeline mechanics.
- `notes/specs/core.md` — the build/run (browser-safety) seam and the
  node-builtin stub that gate the environment-specific I/O.
- `notes/specs/render-quality.md` — the per-mode render predicates, including the
  DSL `skip` / `live` / `static` markup that legitimately diverges.
- `notes/specs/master-document.md` — the multi-file assembler design.
- `CONTRIBUTING.md` — the render-path-parity contributor rule (do not touch one
  render path without the other; #193 gates it).
