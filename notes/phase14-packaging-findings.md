# Phase 14 packaging — architecture findings (Phase 0)

**Status:** Phase 0, read-only. This document is analysis, not status; it makes no
code, spec, design, or fixture change. It produces a recommendation per question
and an implementation-slicing recommendation; chat ratifies before any slice runs.

**Scope.** Phase 14 — the largest v0.1.0 release-blocking phase — covers five
workstreams: (1) the client-side rendering library (Layer 1 only, browser, no
JATS); (2) the bundle/build architecture for that library; (3) a github.io demo
site authored in acadamark itself; (4) the package org-split (monorepo → scoped,
separately-versioned packages) at release time; (5) demonstrative-fixture polish
and corpus consolidation. The project rename rides on top of (3): building the
demo site is the forcing function. This document investigates the architecture of
all five before implementation begins.

**Naming caveat.** The project rename is undecided (Q6). Every package name and
scope below is written with the **current** name `acadamark` as a placeholder.
Read every `@acadamark/…` and bare `acadamark` as **`@<final-name>/…`** and
**`<final-name>`** — the scope token is the project name, and the project name is
a Q6 decision. No name is decided here; this document schedules the decision.

**How to read this.** Sections 1–2 establish the verified ground: the dependency
graph and the browser-safety seam that already exist, with file:line citations.
Sections 3–9 are the Q1–Q7 analyses, each ending in a recommendation and a flag
for what chat must ratify. Section 10 records drift surfaced during the read (all
pre-existing; propose-only). Section 11 collects propose-only revisions. Section
12 is copy-ready slice scope statements. Section 13 is the consolidated
decisions-for-chat list. Section 14 is sources. The reference for this document's
shape is `notes/dsl-rendering-architecture-findings.md`.

---

## 1. Architecture in one picture

The decisive fact for Phase 14 is that **the hard architectural work is already
done.** The package boundaries and the browser-safety seam were drawn — in the
`acadamark-core` ADR (`notes/specs/acadamark-core.md`) and in DESIGN.md — *for*
the client-side build, before it was attempted. DESIGN.md states the seam "is also
the browser-safety boundary … so the eventual client-side build does not need to
redraw the package boundaries" (DESIGN.md line 496). Phase 14 is therefore mostly
*assembly and packaging* of an already-correctly-factored codebase, not a
re-architecture.

The dependency graph (verified against every `package.json`) points inward, with
no cycles and no sideways edges:

```
                      acadamark-core  (v0.1.0, private)
                      no internal deps; browser-safe foundation
                          ▲      ▲      ▲          ▲
            ┌─────────────┘      │      │          └──────────────┐
   layer1-vocabulary   remark-acadamark │              acadamark-jats-export
   (v0.1.0, private)   (v0.2.0, PUBLIC) │              (v0.0.1, private)
   build-time js-yaml  +unified/remark  │              ──────────────┘ │
   only; browser-safe  micromark+Peggy  │       (depends on interpreter + remark
                          ▲             │        + core + layer1 + remark-parse)
                          │             │              │
                          └──── acadamark-interpreter ─┘
                                (v0.0.1, private)
                                heavy/Node deps: katex, mermaid, abcjs,
                                citation-js, jsdom, tippy, popper, js-yaml,
                                hast/mdast utils, rehype-format, remark-gfm/math
```

Three observations fall straight out of this graph:

1. **The JATS boundary is automatic.** `acadamark-jats-export` is a *downstream
   consumer* of the interpreter (it depends on it), not a dependency of it. A
   bundle entry that targets the interpreter's render path never reaches
   jats-export. "Layer 1 only, no JATS in the browser" is not a constraint the
   bundle must enforce — it is a property of the existing arrow directions. The
   future `acadamark-jats-import` sits in the same downstream position and is
   equally out of the browser bundle by construction.

2. **The heavy/Node-coupled mass is concentrated in one package** — the
   interpreter. That is where the browser bundle does its work: it ships the
   interpreter's *browser-safe subset* and replaces or excludes the handful of
   server-only code paths (Section 2). Core, layer1-vocabulary, and the
   remark-acadamark parser are already browser-safe wholesale.

3. **Only `remark-acadamark` is non-private today** (v0.2.0); the other four are
   `private: true`. The org-split (Q4) is in large part a decision about which of
   the remaining four (plus the new browser package) go public, and under what
   scope.

The new client-side library is a **new package** — call it the bare `acadamark`
headline package — built by the bundler from the interpreter's browser-safe
modules, carrying only browser-safe dependencies. It depends (at build time) on
the interpreter's source but ships a self-contained bundle, so a browser consumer
never installs jsdom or the file-loading code paths.

---

## 2. The verified existing path (file:line)

Everything Phase 14 builds on already exists and was read for this document.

**The public API foundation.** `packages/acadamark-interpreter/src/index.js` line
697 exports `buildAcadamarkPipeline(options = {})`, which returns
`unified().use(remarkParse).use(remarkAcadamark).use(acadamarkInterpreter,
options)` — a **synchronous** unified `Processor`. A browser `render()` is one
wrapper away: `buildAcadamarkPipeline(options).processSync(source).toString()`.
The options the pipeline already forwards (index.js lines 693–695) are
`katexCss`, `hoverPreviewMode`, `assetsDir`, plus the DSL-mode options added by
the DSL slice. No new pipeline is needed — the browser library is a thin
source-in/HTML-out façade over this factory.

**The browser-safety seam** (canonical: `notes/specs/acadamark-core.md`). The ADR
classifies every runtime module as BROWSER-SAFE or SERVER-OR-BUILD-ONLY and names
the seam as the browser-safety boundary. The browser-safe set is: the whole of
`acadamark-core`; `remark-acadamark/src/{syntax,from-markdown,recursive-content,
index,generated/parser}.js` (the micromark extension + the generated Peggy
parser); the interpreter's `src/lib/*`, `src/plugins/*` (except `library-load.js`),
`src/handlers/*` (except `table.js`'s `src=` branch), `src/schema/{shape-tokens,
validate}.js`, and `src/interpret-plugin.js`; and `layer1-vocabulary/src/{data,
index}.js`. The remark/unified/micromark/mdast/hast stack these import is
isomorphic by design; KaTeX, tippy, and popper are browser libraries originally.

**The server-only work-list** is the set of paths the bundle must *replace* or
*exclude*. The ADR names four:

- `index.js` asset-injection `fs` reads (KaTeX CSS, `default.css`) — **replace**
  with build-time-inlined string constants.
- `src/assets/font-loader.js` — **replace** with build-time-inlined font data (or
  drop, deferring fonts to the consuming app; see Q1 asset handling).
- `src/handlers/table.js` `<table src=…>` branch (reads an external CSV/TSV file)
  — **exclude**; inline-content tables still render. The `src=` form is a
  build/Node authoring convenience.
- `src/plugins/library-load.js` (reads `.bib` files from disk for citations) —
  **exclude**; in-browser citations resolve from an inline bibliography, not a
  filesystem `.bib`.

A **fifth** server-only site exists and is *not* in the ADR's list (drift —
Section 10b): `src/dsl/registry.js`, added by DSL Slice 2, couples to Node via
`import { readFileSync } from 'fs'` (line 27), `createRequire(import.meta.url)`
(line 32), `require('mermaid/package.json')` / `require('abcjs/package.json')`
(lines 37–38), `import.meta.resolve('mermaid')` + `readFileSync` for the inline
library blobs (lines 61–62, 70–71), and `require('jsdom')` + `require('abcjs')`
for the abc-static path (lines 135–136). The coupling is entirely in the
**inline** and **static** DSL modes; the **live-link** mode (emit a CDN
`<script src>` + an init call) touches none of it and is browser-safe. The browser
library therefore defaults DSL rendering to **live-link** (Q1).

**The standing rule** (acadamark-core.md): "Runtime code that may ship to a
browser stays free of `fs`, `path`, `url`, and other Node built-ins… no new
runtime code should add to this list. Cross-check new slices against the rule."
`dsl/registry.js` added to the list without the cross-check — Section 10b.

**The demonstrative fixtures.** `notes/specs/render-quality.md` lines 65–79: the
article-shaped (`document-45`) and book-shaped (`document-46`) fixtures are
rendered by `packages/acadamark-interpreter/test/render-fixtures.js` and pinned by
snapshot in `test/integration.test.js`. They serve the demonstration role *and*
the regression-pin role simultaneously — relevant to Q5.

**The internal version protocol.** Every internal dependency is `"*"` (the
workspace protocol): interpreter's `package.json` lines 16/23/27 (`acadamark-core`,
`layer1-vocabulary`, `remark-acadamark` all `"*"`); same pattern in jats-export
and remark-acadamark. Publishing requires turning each `"*"` into a real semver
range (Q4 migration cost).

---

## 3. Q1 — client-side library scope and surface

**What "client-side library, Layer 1 only" means as an API.** The library takes
acadamark source and returns rendered Layer 1 HTML, in the browser, with no build
step. It is a thin façade over `buildAcadamarkPipeline` (Section 2):

```js
import { render } from 'acadamark';            // @<final-name> headline package

const html = render(acadamarkSource, {
  dslMode: 'live-link',   // mermaid/abc via CDN <script src> (browser default)
  inlineStyles: false,    // app imports the CSS; true → self-contained HTML
});
// consumer: container.innerHTML = html   (or a renderInto(el, source, opts) helper)
```

`render(source, options) → string` (HTML). A second convenience export
`renderInto(element, source, options)` sets the element's content — the shape an
in-browser editor (Q3) wants. The options are the pipeline's existing ones
(Section 2), minus the Node-only `assetsDir`, plus an `inlineStyles` toggle that
selects the asset strategy below.

**Which dependencies survive the browser bundle.**

- **Survive as-is (browser-safe):** `acadamark-core` (whole); the
  remark-acadamark parser (micromark extension + generated Peggy parser); the
  isomorphic remark/unified/micromark/mdast/hast stack (`unified`, `remark-parse`,
  `remark-gfm`, `remark-math`, `mdast-util-to-hast`, `hast-util-to-html`,
  `hast-util-from-html`); `katex` (a browser library); `tippy.js` + `@popperjs/core`
  (browser libraries, used by the hover-preview assets); `js-yaml` (pure JS,
  browser-safe). These are the bundle's body.

- **Need bundler treatment (inline at build):** the asset reads behind the four
  `✗` paths (Section 2) — KaTeX CSS and `default.css` become bundled string
  constants; fonts either inline or defer to the app (asset-handling decision
  below).

- **Excluded entirely (Node-only / out of Layer-1-render scope):** `jsdom`
  (Node-only; only used by the abc-**static** DSL path and by no browser-safe
  module — excluded with the static path); `library-load.js`'s `.bib` filesystem
  reader and `table.js`'s `src=` CSV/TSV reader (the two `✗` exclusions);
  `dsl/registry.js`'s inline/static coupling (live-link is used instead).

- **Needs verification in the bundle slice (do not assert here):** `citation-js`
  runs in browsers in principle (it is used in browser apps), but its bundle
  weight and whether the inline-bibliography path bundles cleanly is an empirical
  question the bundle slice (Q2) measures. `mermaid`/`abcjs` are *not* bundled at
  all under the live-link default — they load from CDN at view time. I flag these
  rather than assert a clean bundle, consistent with read-only discipline.

**The JATS boundary** is drawn by the dependency graph, not by the bundle
(Section 1, observation 1). The browser package depends on the interpreter's
browser-safe subset and never on `acadamark-jats-export`; JATS code is
unreachable from the render entry. No bundle-level exclusion rule is needed — the
arrow directions already guarantee it. This is the cleanest possible realization
of "JATS is Node-side only," and it is free.

**Asset handling.** Today KaTeX CSS inlines via the asset-mode `fs` read; fonts
load via `font-loader.js`; `default.css` is bundled; mermaid/abc assets come from
DSL live-inline (`readFileSync`) or live-link (CDN). In the browser the two
defensible strategies are:

- **(A) Inline-at-bundle** — the bundler embeds KaTeX CSS, `default.css`, and
  fonts as string constants; `render()` returns *self-contained* HTML. Matches
  the design value "standalone HTML is the build target" (DESIGN.md line 524).
  Cost: a large bundle (fonts dominate).
- **(B) App-provides** — the library returns HTML referencing CSS classes; the
  consuming app imports `acadamark/styles.css` and KaTeX's own CSS. Smaller
  bundle; this is the conventional library shape (KaTeX, CodeMirror ship CSS as a
  separate artifact). Cost: the consumer wires two stylesheets.

**Recommendation:** ship **(B) as the default**, with **(A) available via
`inlineStyles: true`** for the self-contained use-case (e.g. emitting a single
copy-paste HTML file). This mirrors the existing asset-mode toggle philosophy and
keeps the default JS bundle small. The CSS becomes a published artifact
(`acadamark/styles.css`) regardless.

**DSL rendering in the browser.** The browser is the natural home for live DSL
rendering — the libraries load at view time anyway (the BACKLOG note, L815–817).
**Live-link is the browser default**: the registry emits a CDN `<script src>` +
init call (browser-safe; touches none of `dsl/registry.js`'s `fs`/`jsdom`
coupling). Live-inline (bundled mermaid/abc source) is possible but bloats the
bundle by megabytes and is left as a non-default opt-in. Static mode (jsdom) is
Node-only and absent from the browser library entirely. The existing registry
plumbs through `buildAcadamarkPipeline` unchanged; the browser library only fixes
the *default* mode to live-link.

**Q1 chat-ratify:** the API surface (`render` / `renderInto`, the `inlineStyles`
toggle, live-link DSL default) and the asset strategy (B default, A opt-in).

---

## 4. Q2 — bundle architecture

**Bundler choice.** The codebase is pure ESM JavaScript (`type: module`), no
TypeScript. For a *library* (not an app) the conventional tools are rollup, tsup
(a rollup+esbuild wrapper), or esbuild directly. esbuild alone is weak at
multi-format output and declarations; vite's library mode is app-oriented;
webpack is heavy. **Recommendation: tsup** for the first cut — it produces ESM +
a minified bundle with near-zero config, uses esbuild for speed and rollup for the
bundle graph, and generates `.d.ts`. If the asset-inlining (Q1) needs finer
control than tsup's plugin surface allows, drop to **rollup directly** (its plugin
ecosystem includes string/asset inlining). Either is defensible; tsup minimizes
config for a small public surface.

**Output formats.** Two are worth shipping:

- **ESM** — the modern default, for bundler-based consumers (the in-browser
  editor demo, any app that `import`s the library).
- **UMD/IIFE (minified)** — for `<script>`-tag inclusion straight from a CDN, with
  no build step on the consumer's side. This is what the demo-site **Playground**
  page (Q3) loads, and what "no build step" most literally means for a casual
  user.

CJS is low-value (browsers do not consume CJS; Node consumers use the interpreter
package directly) — **omit** it for v0.1.0. **Recommendation: ESM + minified
UMD/IIFE.**

**TypeScript or pure JS.** Stay **pure JS** (consistent with the codebase) and
**ship `.d.ts` declarations**. The public surface is tiny (`render`, `renderInto`,
an options type), so the declarations are cheap to author by hand, or to generate
from JSDoc via `tsc --declaration --allowJs --emitDeclarationOnly`. Declarations
are conventional and improve consumer DX without adopting TS in the source.

**Bundle-size budget.** The decision that *matters* is not a target number — it is
**what is in the bundle versus loaded externally**, and the Q1 recommendations
already make that call: DSL libraries load from CDN (live-link), and CSS/fonts are
app-provided by default (strategy B). That leaves the JS bundle as the render path
(parser + remark stack + interpreter subset + hast→html) plus KaTeX's JS. I do
**not** assert a byte budget here: I have not measured the bundle, and inventing a
figure would be a computable fact with no basis. **The bundle slice measures the
real numbers** (e.g. via `bundlephobia`-style analysis of the actual output) and
sets the budget against them; the design choices above are what keep it small. The
external library sizes the prompt cites (KaTeX ≈ 300 KB; mermaid live-inline
≈ 3 MB; abcjs ≈ 500 KB) are the *reason* live-link and app-provided-CSS are the
defaults — they are the items deliberately kept out of the default bundle.

**Tree-shaking and code-splitting.** The inward dependency graph and ESM output
already support tree-shaking. Sub-path entries like `acadamark/math` are
**overkill for v0.1.0** — the single `render` entry is the whole public surface.
Note the option for later; do not build it now.

**Q2 chat-ratify:** tsup (vs rollup-direct); ESM + UMD/IIFE (CJS omitted); pure JS
+ generated `.d.ts`.

---

## 5. Q3 — demo-site architecture

The github.io site is authored in acadamark and dogfoods the toolchain.

**Hosting model.** github.io serves static files. The modern conventional choice
is a **GitHub Actions workflow that builds to a Pages artifact** (no committed
build output, no `gh-pages` branch to maintain by hand). The site is
**pre-rendered**: the Node-side pipeline renders the `.acm` sources to static HTML
at build time, so the demo site does *not* need the client-side library at view
time — except the one **Playground** page, which loads the UMD bundle for live
rendering.

**Source layout.** A **new workspace package `packages/demo-site/`** holds the
`.acm` sources plus a build script. Keeping it in the monorepo (until the
release-time org-split) means the site is a *living regression surface*: if the
pipeline breaks, the site build breaks in CI. Dogfooding is structural, not
cosmetic — the site content is acadamark source rendered by the real interpreter.

**Build pipeline.** A Node script in `packages/demo-site/` reads the `.acm`
sources, runs `buildAcadamarkPipeline(options).processSync(source).toString()`
(Section 2) per page, writes HTML + the published CSS to a build directory, and
GitHub Actions publishes that directory to Pages on push to the default branch.
CI-driven, not manual.

**Site structure** (the prompt's minimum, refined):

- **Home** — what acadamark is. *The single most name-bearing surface* (Q6).
- **Examples** — `document-45` (article) and `document-46` (book) as live
  rendered pages. These are the demonstrative anchors (Section 2); the Examples
  page is their public home and the reason corpus consolidation (Q5) and the demo
  site are natural neighbors.
- **Docs** — authoring guide; points to the existing specs rather than
  duplicating them.
- **Quick start / Install** — the `import { render }` snippet and the `<script>`
  UMD snippet.
- **Playground** — the in-browser editor: CodeMirror on the left, rendered output
  on the right, driven by the UMD client-side library. The library's showcase and
  the pull-through for the UMD output format (Q2). **Release-near, not
  necessarily the first cut** of the site.
- **About / source link.**

**In-browser editor demo.** A page that loads the UMD bundle + CodeMirror 6, and
on input calls `render(source)` into the output pane. Per the locked input and the
BACKLOG (L815–817), this is the **library's demo application, not a roadmap
phase** — it falls out of the library naturally. It validates the library
end-to-end (parse + render + DSL live-link + KaTeX) in a real browser.

**Naming implications.** The site URL, the home-page title, and every package
scope encode the project name. **Authoring the home page is the rename forcing
function** (Q6) — surfaced explicitly here and scheduled there.

**Q3 chat-ratify:** demo site as `packages/demo-site/` in the monorepo; Actions →
Pages; pre-rendered with a single live Playground page.

---

## 6. Q4 — package org-split

**Multi-repo vs monorepo with separate publishing.** Both are valid. Multi-repo is
the cleanest *public* separation but the highest overhead: cross-package changes
span repos, CI multiplies, and the inward-dep-graph refactors that this project
does routinely become multi-repo PRs. **Monorepo with separate publishing** — keep
the workspace, publish each non-private package under a scope via per-package
release tooling — keeps the developer experience tight (one clone, atomic
cross-package refactors, one CI) while presenting publicly as independent
`@scope/*` packages. This is the pattern Babel, unified, and most comparable
toolchains use. **Recommendation: monorepo with separate publishing.** The
"split" is a *publishing-and-naming* change, not a repository change; "at release
time" (locked input) means flipping the scope + publish config when v0.1.0 ships,
not relocating code.

**Package naming under a scope.** The conventional shape:

| today (private unless noted)    | published as            | audience            |
|---------------------------------|-------------------------|---------------------|
| (new) browser library           | `acadamark` (bare)      | browser app authors |
| `remark-acadamark` (public 0.2) | `@acadamark/remark`     | unified-pipeline authors |
| `acadamark-interpreter`         | `@acadamark/interpreter`| Node full-HTML build |
| `acadamark-jats-export`         | `@acadamark/jats-export`| Node JATS consumers |
| `acadamark-core`                | `@acadamark/core`       | transitive (dep of the above) |
| `layer1-vocabulary`             | `@acadamark/layer1-vocabulary` | transitive |

The **bare `acadamark`** package is the headline client-side library (matching
`import { render } from 'acadamark'`); the rest live under `@acadamark/*`. The
scope token is the Q6 name.

**Public vs internal.** At release, the dependency graph must be installable, so
every package a published package depends on must itself be published —
`acadamark-core` and `layer1-vocabulary` cannot stay `private`. "Internal" becomes
a *documentation* distinction, not a `private` flag: external authors are expected
to import the **browser library**, **remark**, **interpreter**, and **jats-export**
directly; **core** and **layer1-vocabulary** are transitive plumbing they get
automatically. **Recommendation:** publish all six under the scope; document the
four-direct / two-transitive split rather than encoding it as `private`.

**Versioning.** For the v0.1.0 release, ship all packages at **0.1.0 together**
(synchronized) — cleanest for the headline. Post-release, **independent semver per
package** (the conventional pattern; `changesets` is the conventional tool).
Caveat surfaced for chat: `remark-acadamark` is already at **0.2.0** while core
and layer1 are at 0.1.0 and interpreter/jats are at 0.0.1, so the lineage is
*already* independent — synchronizing everything to 0.1.0 would move remark
*backward* in appearance. The cleaner reading may be to let remark keep its
independent line and synchronize only the rest. **Chat ratifies synchronized-at-
release vs. independent-from-the-start.**

**Migration impact** (mechanical, but broad): (1) rename each package
(`acadamark-core` → `@acadamark/core`, etc.); (2) replace every internal `"*"`
ref (Section 2) with a real semver range; (3) flip `private: false` on the
to-publish packages; (4) update every cross-package import string
(`from 'acadamark-core'` → `from '@acadamark/core'`) — this is the **largest
mechanical surface**, touching many files; (5) stand up per-package publishing
(an Actions matrix or `changesets`). The work is contained and output-neutral
(tests pass post-rename), but it is its own slice and should land **after** the
rename decision (Q6) so the scope token is final.

**Q4 chat-ratify:** monorepo-with-separate-publishing (vs multi-repo); the bare-
headline + `@scope/*` naming; synchronized-vs-independent versioning.

---

## 7. Q5 — fixture consolidation

The current fixture corpus (`document-1` … `document-44`, plus the recent
`document-45`/`46` demonstrative anchors and `document-47`/`48` regression
artifacts) accumulated through alpha. Post-v0.1.0 the active corpus should be
smaller and curated.

**Framing — the two roles already coexist.** render-quality.md (lines 65–79)
shows that the demonstrative fixtures (`document-45`/`46`) are *both* the
demonstration surface *and* snapshot-pinned regressions. So the two framings the
prompt names — **regression-pinning** and **demonstration** — are not a
choice between fixtures; they are two roles, and the corpus splits cleanly by role:

- **Demonstration** is `document-45` (article) and `document-46` (book)'s job —
  believable, role-specific documents a reader would accept as real. The locked
  input keeps them canonical. (And, the recent `document-47` abc-static /
  `document-48` slice-C documents are regression artifacts that read as
  demonstrative-adjacent.)
- **Regression-pinning** is the `document-1`…`44` corpus's job: each fixture
  earns its place iff it *uniquely* pins some behavior.

**Recommendation:** make **regression-pinning the criterion for the active
corpus**, with **demonstration carried by the `document-45`/`46` anchors**. Keep a
`document-1`…`44` fixture in the active set iff it is the **sole pin** for a
behavior; archive the rest.

**Target size — deliberately not a number here.** Fixing a count would be (a) a
computable fact with no basis until the audit is done, and (b) a pre-emption of
the audit that *is* the consolidation slice's work. **Recommendation:** the
consolidation slice runs a **behavior-coverage audit** — map each fixture to the
behavior(s) it pins, then keep the minimal covering set plus the demonstrative
anchors. The size falls out of the audit; it is not pre-committed.

**Archive, don't delete.** Move consolidated-out fixtures (source + the
`-expected.json` snapshot) to **`notes/archive/fixtures/`**, readable as
historical reference and out of the test surface. This matches the project's
existing `notes/archive/…` convention (used for design-direction and
authoring-survey docs the BACKLOG cites), is lower-cost than deletion, and
preserves the work without relying on `git` archaeology.

**Test-surface impact — the audit is the safety net.** `integration.test.js`
carries a block per fixture; consolidation shrinks it. The audit makes the
shrink *safe*: for every fixture about to be archived, confirm its behaviors are
still pinned by a surviving fixture; if a fixture is the **only** exerciser of a
behavior, either keep it or migrate that assertion onto a surviving fixture
before archiving. **Correctness model for the consolidation slice:**
output-neutral on the *kept* set (their snapshots do not change), and every
*removed* test block proven redundant by the audit. No coverage is silently
dropped.

**Q5 chat-ratify.** The BACKLOG (L696–707) explicitly flags the **demonstrative
role's final shape** as "a ruling for the chat, not a Claude Code decision," and
records corpus consolidation as deferred pending that ruling. The Phase 14 locked
inputs resolve the *direction* (a curated active set; `document-45`/`46`
canonical), which is the "small believable set" branch of that open question.
What remains for chat: whether a **single comprehensive document** eventually
supersedes the `45`/`46` pair, or whether the pair *is* the demonstrative surface
going forward. This document recommends the pair; chat ratifies. (Either way the
regression-corpus audit above is unaffected.)

---

## 8. Q6 — rename decision sequencing

The rename is pre-release; Phase 14 is the forcing function.

**Latest point it can land without significant cost.** Before the earliest of
three hard commitments, each of which bakes the name into a durable artifact:

1. the **package org-split** (the scope token `@<name>/*` and the bare headline
   package name) — Q4;
2. the **demo site going public** (the URL and the home-page title) — Q3;
3. the **v0.1.0 tag** (release artifacts, published package names).

Since the org-split is "at release time," the demo site precedes or accompanies
release, and the **home page is the forcing function**, the binding deadline is
**before the demo-site content is authored for publication**. Within Phase 14
that is: *after* the client-side library (which can be built under the current
name as an unpublished placeholder — no public commitment) and *before* the
demo-site content slice and the org-split slice.

**Candidate names** (recorded as standing, not adjudicated here): `acadamark`
(current); `RDF` — **ruled out** (collision with the W3C Resource Description
Framework); "Rich Document"-family variants in discussion. No new candidate is
proposed by this document.

**Decision process.** The locked input is "whichever name feels right on the
homepage." That makes the **demo-site framework slice the decision vehicle**:
draft the home page under two or three candidate names and pick the one that
reads right. Recommended schedule:

| Phase 14 slice                 | name posture                                  |
|--------------------------------|-----------------------------------------------|
| Library packaging              | current name as **placeholder**; unpublished  |
| In-browser editor demo         | placeholder                                   |
| **Demo-site framework**        | **rename decision lands here** (home page)    |
| Demo-site content              | final name                                    |
| Org-split (release time)       | final name applied to scope + bare package    |
| Fixture consolidation          | name-independent                              |

The rename **gate** sits between *demo-site framework* and *org-split*; the
demo-site framework slice forces it. **This document schedules the decision; it
does not make it** (out of scope). Chat picks the name when the home page is
drafted.

---

## 9. Q7 — slicing recommendation

**The dependency reality** dictates the order more than any aesthetic choice:

- The **client-side library is the foundation** — the Phase 8 display features
  build on it, the in-browser editor needs it, and the demo-site Playground needs
  its UMD bundle. → **library first.**
- The **demo site** needs the library (Playground) and **forces the rename**.
- The **rename** must precede the **org-split** (the scope token).
- The **org-split** is release-time → **last**.
- **Fixture consolidation** is independent of all of the above (a test-surface
  cleanup) and naturally pairs with the demo site's Examples page (which consumes
  the demonstrative anchors).

Against the prompt's four options: pure **B (bundled-by-concern)** would obscure
the rename gate and the org-split's release-time placement; pure **A
(many-small)** over-fragments the library work; **D (library-first)** is right for
the spine but silent on everything downstream. The fit is **C (sequential-by-
dependency) with a library-first spine** — recommended slices:

1. **Library packaging** (foundation). Browser entry (`render`/`renderInto`); the
   bundle config (tsup, ESM+UMD, `.d.ts`); the asset-replacement work (the four
   `✗` paths + the live-link DSL default); CSS as a separate artifact. Output: a
   publishable-but-unpublished `acadamark` browser package under the placeholder
   name. *This is the slice the BACKLOG already says "gets a Phase 0"; this
   document is most of that Phase 0 — the slice can proceed to an implementation
   prompt.*
2. **In-browser editor demo** (library showcase). CodeMirror + the UMD bundle + a
   render pane. Validates the library end-to-end. Its own slice (CodeMirror
   integration is a distinct surface), small.
3. **Demo-site framework**. The `packages/demo-site/` package, the Node build
   pipeline, Actions → Pages, the site skeleton, the home page. **Forces and lands
   the rename** (Q6).
4. **Demo-site content**. Examples (`45`/`46` live), Docs, Quick start, Playground
   (embeds slice 2). Final name throughout.
5. **Fixture consolidation** (independent; slot near 4). The behavior-coverage
   audit + archive (Q5).
6. **Org-split** (release-time, last). Scope rename, `"*"` → semver, `private`
   flips, publish config. After the rename decision (slice 3).

**Correctness models per slice:** library packaging — *output-adding* (new
package) but *output-neutral on the Node side* (existing fixtures still render
identically through the interpreter); in-browser editor — net-new; demo-site
framework/content — net-new; fixture consolidation — *output-neutral on the kept
set*, each removed block proven redundant; org-split — *output-neutral*
(mechanical rename, tests pass after).

**Q7 chat-ratify:** the six-slice sequential-by-dependency ordering and the
library-first spine.

---

## 10. Drift findings (read-only, propose-only)

Three drift items surfaced during the read. All are **pre-existing** (none
introduced by this investigation), and all are **propose-only** — this slice
edits none of these surfaces.

**(a) `acadamark-jats-export` described as planned/future, though it is built.**
DESIGN.md lines 494–496 say the workspace has "four packages (a fifth,
`acadamark-jats-export`, is planned)" and refers to "the JATS exporter (when it
arrives)." `notes/specs/acadamark-core.md` similarly tags jats-export "(FUTURE)" /
"forthcoming." The package exists: `packages/acadamark-jats-export/package.json`
(v0.0.1, with a real dependency list). **Propose:** a documentation slice updates
both to present tense — five packages; jats-export is built. Bears on Q1/Q4
because the JATS boundary reasoning depends on jats-export being a *real*
downstream package.

**(b) The ADR's server-only (`✗`) list omits `src/dsl/registry.js`.**
`acadamark-core.md` names four server-only paths; `dsl/registry.js` (added by DSL
Slice 2) is a fifth, with `fs`/`createRequire`/`jsdom` coupling in its inline and
static modes (Section 2, file:line). The ADR's standing rule says to "cross-check
new slices against the rule" — that cross-check did not happen when DSL Slice 2
landed. **Propose:** the bundle slice (or a doc slice) adds `dsl/registry.js`'s
inline+static coupling to the ADR's server-only list and records that **live-link
is the browser-safe DSL path**. This is the most consequential drift for Phase 14
— it sits directly on the bundle's work-list (Q1/Q2).

**(c) The ROADMAP Phase 14 section under-documents the phase.** The ROADMAP's
Phase 14 section names only the client-side library, the render-quality spec
(done), the comprehensive demonstrative fixture, and release housekeeping. It does
**not** name the **demo site**, the **org-split**, or the **rename** — all of
which the v0.1.0 restructuring (`5ab1f83`) and this prompt's framing include, and
all of which this document scopes. **Propose:** a ROADMAP slice expands the
Phase 14 narrative to name all five workstreams and record the locked ordering
(Phase 14 → 8 → 13). Out of scope to edit here (only one STATUS line is in scope).

None of (a)–(c) **blocks scoping** the implementation — they are documentation
reconciliations, surfaced for follow-up slices, not stop-and-report blockers.

---

## 11. Proposed revisions (propose-only)

Collected for the follow-up slices that will make them. This slice writes none of
these.

- **DESIGN.md "Package structure" (lines 494–496):** "four packages (a fifth …
  planned)" → "five packages"; drop "when it arrives" for jats-export; the
  browser library is a *sixth* package once Phase 14 ships. (Drift 10a.)
- **`notes/specs/acadamark-core.md`:** present-tense jats-export; **add
  `src/dsl/registry.js` (inline + static modes) to the server-only `✗` list**;
  note live-link as the browser-safe DSL path. (Drift 10b.)
- **ROADMAP Phase 14 section:** name the demo site, org-split, and rename
  workstreams; record the 14 → 8 → 13 ordering. (Drift 10c.)
- **`notes/specs/render-quality.md`:** when the consolidation slice runs, the
  fixture/demonstrative relationship paragraph (lines 65–79) may need a pointer to
  the archived corpus location. (Q5.)

---

## 12. Implementation slice scope statements

Copy-ready for the implementation prompts that follow this Phase 0. Each is
scoped here; only slice 1 was given a Phase 0 by the BACKLOG, and this document
is most of it.

**Slice 1 — Library packaging.** *Goal:* a browser package (`acadamark`, bare,
placeholder name) exporting `render(source, options)` / `renderInto(el, source,
options)` over `buildAcadamarkPipeline`, built by **tsup** to **ESM + minified
UMD** with **`.d.ts`**. *In scope:* the browser entry; the bundle config; the
asset replacement for the four `✗` paths (inline KaTeX CSS + `default.css` as
strings; fonts deferred to the app by default, `inlineStyles: true` for
self-contained); the **live-link DSL default**; CSS shipped as
`acadamark/styles.css`. *Out of scope:* publishing (Q4); live-inline DSL bundling;
the jsdom/static path; TypeScript-in-source. *Correctness:* output-adding (new
package); output-neutral on the Node side (existing fixtures render identically).

**Slice 2 — In-browser editor demo.** *Goal:* a demo app, CodeMirror left +
rendered-output right, on the UMD bundle. *In scope:* the editor page; debounced
`render` calls; loading the UMD build + KaTeX CSS + live-link DSL. *Out of scope:*
hosting it (that is the demo site, slice 4). *Correctness:* net-new.

**Slice 3 — Demo-site framework.** *Goal:* `packages/demo-site/`, the Node build
pipeline (pipeline → static HTML → Pages), the site skeleton, the home page.
*In scope:* the build script; the Actions → Pages workflow; the home page drafted
under candidate names. *Forces and lands the rename (Q6).* *Out of scope:* the
full content set (slice 4). *Correctness:* net-new.

**Slice 4 — Demo-site content.** *Goal:* Examples (`45`/`46` live), Docs, Quick
start, Playground (embeds slice 2). Final name throughout. *Correctness:* net-new.

**Slice 5 — Fixture consolidation.** *Goal:* the behavior-coverage audit; keep the
minimal covering set + the demonstrative anchors; archive the rest to
`notes/archive/fixtures/`. *In scope:* the audit; the archive move; the
`integration.test.js` block pruning with redundancy proven per removed block.
*Out of scope:* deleting anything; changing kept snapshots. *Correctness:*
output-neutral on the kept set; each removed block proven redundant.

**Slice 6 — Org-split (release time).** *Goal:* scope rename (`@acadamark/*` +
bare `acadamark`), `"*"` → semver, `private` flips, per-package publishing.
*In scope:* the renames; the import-string updates; the publish config.
*Out of scope:* any behavior change. *Correctness:* output-neutral (tests pass
after the mechanical rename).

---

## 13. Decisions for chat

Consolidated from the per-question chat-ratify flags. None blocks *this* findings
file; each gates the corresponding implementation slice.

1. **API surface (Q1).** Ratify `render`/`renderInto`, the `inlineStyles` toggle,
   and the live-link DSL default; ratify asset strategy B-default / A-opt-in.
2. **Bundle (Q2).** Ratify tsup (vs rollup-direct), ESM + UMD/IIFE (CJS omitted),
   pure JS + generated `.d.ts`. The byte budget is set by measurement in the
   slice, not pre-committed.
3. **Demo site (Q3).** Ratify `packages/demo-site/` in the monorepo, Actions →
   Pages, pre-rendered + one live Playground page.
4. **Org-split (Q4).** Ratify monorepo-with-separate-publishing (vs multi-repo);
   the bare-headline + `@scope/*` naming; **synchronized-at-release vs.
   independent versioning** (the remark 0.2.0 lineage complicates synchronizing).
5. **Fixture consolidation (Q5).** Ratify regression-pinning framing + archive (not
   delete); **and the still-open BACKLOG ruling** — does a single comprehensive
   document eventually supersede the `45`/`46` demonstrative pair, or is the pair
   the demonstrative surface going forward?
6. **Rename (Q6).** The name itself is decided at the demo-site framework slice,
   not here; ratify the *schedule* (rename gate between demo-site framework and
   org-split).
7. **Slicing (Q7).** Ratify the six-slice sequential-by-dependency ordering with
   the library-first spine.

---

## 14. Sources

**In-repo (code/design/doc facts; file:line) — all read for this document:**

- Public API foundation (`buildAcadamarkPipeline`, sync `Processor`, forwarded
  options): `packages/acadamark-interpreter/src/index.js` (697; 693–695).
- Dependency graph + internal `"*"` protocol + single-entry `exports`:
  `packages/acadamark-interpreter/package.json` (exports line 8; deps 13–34;
  internal `"*"` at 16/23/27); `packages/acadamark-jats-export/package.json`;
  `packages/remark-acadamark/package.json` (the only non-private, v0.2.0);
  `packages/acadamark-core/package.json` (v0.1.0, private, no internal deps);
  `packages/layer1-vocabulary/package.json`.
- Browser-safety seam, browser-safe set, the four `✗` server-only paths, the
  standing client-side-build-constraints rule:
  `notes/specs/acadamark-core.md` (whole).
- The fifth server-only site (`dsl/registry.js` `fs`/`createRequire`/`jsdom`
  coupling; live-link is clean): `packages/acadamark-interpreter/src/dsl/registry.js`
  (27, 32, 37–38, 61–62, 70–71, 135–136).
- Package-structure position + the seam-as-browser-boundary claim + the
  client-side-rendering future direction + the out-of-scope (no new parsers)
  list: `DESIGN.md` (494–496; 524; 528–537).
- Client-side library entry (Layer 1 only, no JATS, in-browser editor as a demo
  not a phase, "gets a Phase 0"): `BACKLOG.md` (806–819).
- Demonstrative fixture entry (`45`/`46` built; "final shape … a ruling for the
  chat"; "corpus consolidation is deferred"): `BACKLOG.md` (677–716).
- Fixture/demonstrative relationship (rendered by `render-fixtures.js`, pinned in
  `integration.test.js`): `notes/specs/render-quality.md` (65–79).
- Findings-doc shape reference: `notes/dsl-rendering-architecture-findings.md`
  (`d6c595c` + `656e82b`).

**External (library facts; named, not measured here):** bundler options (rollup,
tsup, esbuild, vite, webpack); output-format conventions (ESM/UMD/CJS); the
monorepo-with-separate-publishing pattern (Babel, unified) and `changesets`;
external library sizes cited by the prompt (KaTeX ≈ 300 KB, mermaid ≈ 3 MB live-
inline, abcjs ≈ 500 KB) — used as the *rationale* for live-link + app-provided
CSS, to be **measured** by the bundle slice rather than asserted here.
