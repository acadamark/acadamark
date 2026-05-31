# DSL rendering architecture — Phase 0 findings

**Status.** Read-only investigation. No code, spec, design-doc, fixture,
snapshot, or test changes were made by the slice that produced this file. The
file is the deliverable: it is the document slot for the DSL rendering
architecture itself, read by the implementation slicer to know what is being
built and by anyone touching DSL code afterward to understand the design.

**Scope.** Investigates how enscribe renders its two external DSLs — Mermaid
diagrams (`<mermaid>`) and ABC music notation (`<abc>`) — under a **two-mode
architecture (static + live)** plus the existing **skip** behavior. Answers
Q1–Q8 from the Phase 0 prompt.

**Amended post-`d6c595c`.** A chat decision settled the open questions and added
the **registry-based design (Path C)**. The amendment is recorded in the
**"Architecture revision: registry-based design"** section (top) and the four
sections after §Q8 (**Chat-decisions resolved**, **Proposed DESIGN.md
revision**, **Proposed spec ID scheme**, **Implementation slice 1 scope
statement**); the original Q1–Q8 analysis is preserved, with banners where the
revision overrides it. Still read-only: no code, spec, design-doc, fixture,
snapshot, or test changes.

**Naming (locked).** The two new modes are **static** and **live**. The
alternatives considered in chat — "build/client-side," "pre-rendered/loaded,"
"server/browser" — were rejected; this document uses "static" / "live"
throughout, and names the alternatives only here to record the decision against
them.

---

## How to read this

- **Read "Architecture revision: registry-based design" (immediately below)
  first.** It postdates and amends the Q1–Q8 analysis: it records the
  registry-based design (Path C) and the chat decisions that resolved the open
  questions the Q-sections raise. Where the two disagree, the revision wins.
- §1 states the architecture in one picture and the central finding.
- §2–§3 record the **verified** substrate: the existing asset-emit path and the
  DSL handlers as they stand today. Every later claim about "the existing
  mechanism" traces to these.
- §Q1–§Q8 answer the original prompt's questions. Q2 and Q8 carry the load.
- The four sections after §Q8 (**Chat-decisions resolved**, **Proposed DESIGN.md
  revision**, **Proposed spec ID scheme**, **Implementation slice 1 scope
  statement**) are the amendment's copy-ready outputs.
- §"Decisions for chat" is retained as the record of what was asked; all six are
  now **resolved** (see **Chat-decisions resolved**), not open.
- §"Sources" lists external citations (library facts) and the in-repo
  file:line citations for code facts.

---

## Architecture revision: registry-based design

> **Read this first.** This section postdates the Q1–Q8 analysis below and
> amends it. The chat that followed commit `d6c595c` settled the open
> "Decisions for chat" and added one decision the original findings did not
> anticipate: **how** the two modes are wired into the engine. The answer is a
> **registry**. Where the Q-sections below still describe an open choice, this
> section and the four "Proposed…/Chat-decisions resolved" sections after §Q8
> are authoritative.

### The decision: Path C — internal registry, public API deferred

enscribe's interpreter is structured around a **DSL registry**: an internal
table that holds, per external DSL, everything the engine needs to render it.
Mermaid and abc are registered against that table as the initial built-in
consumers. The registration *function* (`registerDsl`) is **not exposed
publicly in v0.1.0** — third parties cannot add DSLs yet. v0.2.0+ exposes and
documents the API, and the existing built-in registrations become its seed.

Two alternatives were rejected:

- **Path A — commit to built-in.** Hard-code mermaid/abc render logic into the
  compiler with no registration seam. Rejected: it bakes a closed set into the
  engine and contradicts DESIGN.md's already-stated "a new processor is added by
  extending the registry."
- **Path B — full extensible mechanism now.** Ship and document `registerDsl`
  as public API in v0.1.0. Rejected: it commits the project to a public
  extension contract before the internal shape has settled against two real
  consumers; premature surface that is expensive to change once published.

**Path C is the middle**: build the seam, prove it with the two built-ins,
defer the public contract. Precedent: R-markdown / Quarto register Mermaid via a
chunk-engine registry rather than baking it into core — the extension point
exists internally long before (and independently of) any third-party use.

**This is continuous with DESIGN.md, not new.** DESIGN.md already names the
mechanism: *"the tag-to-processor mapping is the DSL registry; a new processor
(Mermaid, ABC, executable code) is added by extending the registry"* (`DESIGN.md`
line 150). And the code already realizes that idiom: `interpret-plugin.js`
(lines 78–92) builds `HANDLER_REGISTRY`, a `new Map([...])` keyed by handler
module, assembled at module load from imported handler functions; an
`INTERNAL_REGISTRY` Map (lines 54–67) does the same for internal node types, and
the dispatcher already threads interpreter `opts` to each handler
(`handlerFn(state, node, vocab, opts)`, line 121). Path C's DSL-render registry
is the **same idiom applied to a second concern** — see the next subsection for
why it is a distinct structure, not an extension of `HANDLER_REGISTRY`.

### Q1 — registry shape (chat approves; implementation realizes)

**Two registries, distinct concerns.** `HANDLER_REGISTRY` answers *"what
function turns a `<mermaid>` enscribeTag into contract hast?"* — a **parse /
dispatch** concern, consumed in `enscribeTagHandler` (`interpret-plugin.js`
line 118). The new **DSL-render registry** answers *"for the external DSL named
`mermaid`, what is its container tag, its contract class, its live bundle + CDN
URL + init script, and its optional static renderer?"* — an **asset-emit**
concern, consumed in `compileToHtml` (the §2 injection path), iterated once per
compile to decide what (if anything) to `unshift` or mutate. They share the Map
idiom and the DESIGN.md "registry" framing but are separate tables with separate
consumers. Conflating them would couple parse-time dispatch to view-time asset
policy; keeping them separate keeps each single-purpose.

**Registration record (per DSL).** A plain object:

| Field | Type | mermaid | abc |
|-------|------|---------|-----|
| `name` | string — the `data-enscribe-dsl` value, registry key | `'mermaid'` | `'abc'` |
| `containerTag` | `'pre'` \| `'div'` — must match the handler's `wrapperEl` | `'pre'` | `'div'` |
| `contractClass` | string — scanning class the handler emits | `'mermaid'` | `'abc'` |
| `liveAssets` | `{ bundlePath, cdnUrl, initScript }` | mermaid ESM | abcjs-basic |
| `staticRenderer` | optional `(source) ⇒ svgString`, or omitted | **omitted** (live-only) | real (jsdom) |
| `detector` | optional `(hast) ⇒ boolean`; default keys off `contractClass` / `name` | default | default |

- `liveAssets.bundlePath` — node_modules path read via `readFileSync` for the
  inline variant (the §2 inline-loader pattern). `liveAssets.cdnUrl` — pinned
  CDN URL for the link variant (the §2 CDN-constant pattern).
  `liveAssets.initScript` — the init JS source (mermaid:
  `mermaid.initialize({ startOnLoad: true })`; abc: the `querySelectorAll` →
  `renderAbc` loop, carrying the §Q6 whitespace-strip workaround until M2 is
  fixed).
- `staticRenderer` **omitted for mermaid** is how the registry encodes
  "mermaid is live-only" — the field's absence is the single source of truth the
  mode resolver checks (the §Q2-final fail-explicitly rule).

**Registration mechanism — the existing idiom, not `registerDsl` at runtime.**
For v0.1.0 the registry is a **static `Map` literal built at module load**,
exactly like `HANDLER_REGISTRY`: a `src/dsl/registry.js` module imports the two
registration objects (each DSL exports a `dslRegistration`) and assembles
`const DSL_REGISTRY = new Map([...])`. It exposes internal reads
`getRegisteredDsls()` and `getDsl(name)` for `compileToHtml`. There is **no
runtime `registerDsl(spec)` mutation in v0.1.0** — both DSLs are known at build,
so a literal Map suffices and matches the codebase. The conceptual `registerDsl`
API of Path C is precisely *"let a third party contribute an entry to that Map
at setup time"*; v0.2.0 adds it as a thin additive layer over the same structure
(the built-in literal becomes the seed). This makes the public-API deferral (Q5)
fall out for free — see below.

**One sub-decision surfaced (does not complicate Path C).** Today the handlers
**hardcode** their contract markers (`mermaid.js` lines 42/47 emit
`class="mermaid"` + `data-enscribe-dsl="mermaid"`; `abc.js` likewise). With a
registry those markers would exist in two places: the handler (emit) and the
registry (`contractClass`/`name`, used by the detector and init script).
Options: (a) make the registry the single source and have the handler read its
own registration; (b) leave the handler unchanged and have the registry
**declare markers that must agree**, asserted by a test. **Recommendation: (b)
for Slice 1** — it keeps the handler (and thus the existing fixture output)
untouched, so Slice 1 stays output-neutral at the default; unifying to
single-source is a later cleanup, not load-bearing. Because (b) is a clean
choice, this does **not** trip the Q1 stop-and-report.

### Q5 — public-API deferral, expressed in the v0.1.0 package shape

The deferral is expressed structurally, not just by intent:

- **Not in `exports`.** `enscribe-interpreter/package.json` exposes a single
  entry (`"exports": "./src/index.js"`). The registry module
  (`src/dsl/registry.js`) is **not added to `exports`**, so `registerDsl` /
  `getDsl` are unreachable through the package's public surface. Reachability,
  not just documentation, enforces "internal."
- **Header comment.** The registry module opens with a comment naming it
  internal for v0.1.0 and pointing at the v0.2.0 public-API plan — the
  speculative-lifespan-comment convention from CLAUDE.md.
- **Naming.** No public `registerDsl` export; the internal assembly lives in a
  module whose name (`dsl/registry.js`) and non-export from `index.js` mark the
  boundary. (A `_internal/` subdir was considered but is heavier than the
  existing convention, which marks internals simply by not re-exporting them
  from `index.js`.)

Because v0.1.0 ships a static Map literal with nothing added to `exports`, the
deferral needs no special machinery — there is no public API to hide. v0.2.0's
job is purely additive (expose a setup-time `registerDsl`, document it, keep the
built-ins as the seed). So **Q5 is cleanly expressible in the v0.1.0 package
shape** — the stop-and-report trigger is not met.

### Net effect on the original findings

Path C and the post-`d6c595c` decisions **simplify** the picture the Q-sections
paint:

- **Static-mermaid is dropped.** Mermaid is **live-only**; abc is **live +
  static**. This removes the single heaviest, most-uncertain dependency the
  original §Q2/§Q5 flagged — the young-`isomorphic-mermaid`-vs-~280 MB-Chromium
  decision is now **moot**. Static mode's only new dependency is **jsdom**
  (clean, pure-JS), used by abc alone.
- **Demonstrative fixtures use live-inline.** doc-45/doc-46 are mermaid-only;
  since mermaid is live-only, static was never available for them. They bundle
  the mermaid library inline for self-containment. This overrides the original
  §Q5 "static is the target" recommendation (which was gated on the now-moot Q2
  dependency decision).
- **The slice split holds but lightens.** Slice 1 (registry + live + M2 fix +
  demo-fixture live-inline + spec RQ-DSL-LIVE revision) is unchanged in shape.
  Slice 2 shrinks to **abc-static-only via jsdom** — no Chromium, and no
  async-Mermaid restructuring of the compiler (the async problem was Mermaid's
  alone; abcjs `renderAbc` is synchronous, §Q2, so abc-static runs inside the
  existing synchronous compiler). The async/heavy risks the original §Q8
  isolated into Slice 2 **largely evaporate** with static-mermaid dropped.

See the four sections after §Q8 — **Chat-decisions resolved**, **Proposed
DESIGN.md revision**, **Proposed spec ID scheme**, **Implementation slice 1
scope statement** — for the concrete, copy-ready outputs.

---

## 1. The architecture in one picture

Three modes, all of which honor DESIGN.md's "rendering is the publisher's choice
of tool" stance — the publisher chooses the mode; enscribe never decides to
render on its own:

| Mode | What the emitted HTML contains | Rendering happens | Self-contained? | New deps |
|------|-------------------------------|-------------------|-----------------|----------|
| **skip** (default) | Only the markup contract (`<pre class="mermaid">` / `<div class="abc">`) | Publisher wires it up entirely | n/a (just source) | none |
| **live** | Contract markup **+** the rendering library (inlined or CDN-linked) **+** an init call | In the browser, at view time | inline variant: yes; link variant: needs network | inline variant only |
| **static** | Inline `<svg>` **replacing** the source; no client JS | In Node, at build time | yes | yes (DOM shim; Mermaid needs more) |

**Central finding (drives everything downstream).** The two modes are not
symmetric in cost or in shape:

1. **Shape.** *Live* mode is **additive** — it prepends library/init asset
   nodes as siblings and leaves the contract markup untouched. This is
   *structurally identical* to the existing hover-preview / KaTeX injection
   path (§2), and it is **synchronous**. *Static* mode is a **mutation** — it
   replaces each DSL element's source with rendered SVG. That is a new kind of
   operation, it needs a server-side DOM, and for Mermaid it is **asynchronous**
   (§Q2), which the current synchronous compiler cannot host as written.

2. **Dependency cost.** *abc* static-renders cleanly in Node with only a jsdom
   shim — no headless browser. *Mermaid* has **no mature no-browser static
   path**: the only browserless option (`isomorphic-mermaid`, jsdom + svgdom) is
   young (v0.1.x), and the mature path is Puppeteer/Chromium (~170–282 MB).

These two facts are the reason the implementation should **split live mode
(small, precedent-matching, low/zero new deps) from static mode (heavy, novel,
async)** — see §Q8.

---

## 2. The existing asset-emit path (verified)

All line references are to `packages/enscribe-interpreter/src/index.js` unless
noted.

**Two mode options exist today, and they are the precedent the prompt names.**

- `katexCss: 'inline' (default) | 'link' | 'skip'` and
  `hoverPreviewMode: 'inline' (default) | 'link' | 'skip'` — documented at the
  options doc-comment (lines 50–62) and read at the top of
  `enscribeInterpreter` (lines 340–341). `'inline'` = self-contained, no
  external request; `'link'` = CDN `<link>` / `<script src>`; `'skip'` = emit
  nothing, consumer handles it.

**The compiler is synchronous.** `this.compiler = function compileToHtml(tree)`
(lines 441–486) returns an HTML string; fixtures and tests drive it via
`processor.processSync(...)` (`test/render-fixtures.js` line 82). A synchronous
compiler can host live mode (which only emits tags) but **not** an async
build-time render (Mermaid) without restructuring — see §Q2.

**Injection is additive and node-based.** `compileToHtml`:
1. always `unshift`es a document-fonts `<style>` (line 457);
2. if `cssMode !== 'skip' && hasMathElements(hast)` → `unshift` KaTeX, as
   `makeLinkElement(KATEX_CDN_URL)` in link mode or `makeStyleElement(getKatexCss())`
   inline (lines 462–468);
3. if `hoverMode !== 'skip' && (hasNoteMarkers || hasRefLinks || hasCiteLinks)`
   → `unshift(...buildHoverPreviewAssets(hoverMode))` (lines 472–478);
4. `rehypeFormat()`, then `toHtml(hast, { allowDangerousHtml: true })`.

The injected asset nodes are **siblings prepended to the tree**; the content
elements are never mutated. Live mode fits this exactly. Static mode does not —
it must rewrite the DSL element itself.

**Node builders** (lines 266–302): `makeStyleElement(css)` (inline `<style>`,
raw child), `makeScriptElement(js)` (inline `<script>`, raw child),
`makeLinkElement(href)` (`<link rel=stylesheet>`), `makeScriptSrcElement(src)`
(`<script src>`). A DSL builder reuses these verbatim.

**Detectors** (lines 217–264): `hasMathElements`, `hasNoteMarkers`,
`hasRefLinks`, `hasCiteLinks` — each walks the hast tree recursively via
`(node.children ?? []).some(...)`. DSL detectors (`hasMermaid`, `hasAbc`) follow
the same shape, keying off `class`/`data-enscribe-dsl`.

**The mode builder** `buildHoverPreviewAssets(mode)` (lines 311–328) is the
template for a `buildDslAssets(...)`:
- `'link'` → CDN `<link>`s + `makeScriptSrcElement(CDN_URL)` + an inline init
  `makeScriptElement(...)`;
- `'inline'` → one inline `<style>` (concatenated CSS) + one inline `<script>`
  (concatenated library JS + init).

**CDN URL constants already exist** in the same style a DSL builder would add:
`KATEX_CDN_URL` (jsDelivr, pinned to the installed katex version, line 121),
`POPPER_CDN_JS_URL` / `TIPPY_CDN_JS_URL` / `TIPPY_CDN_CSS_URL` /
`TIPPY_CDN_LIGHT_BORDER_URL` (unpkg, pinned, lines 146–149).

**Inline loaders** (lines 127–213) `readFileSync` library files out of the
resolved npm package dirs (`katex`, `tippy.js`, `@popperjs/core`) or the local
`assets/` dir, lazily cache them, and strip `sourceMappingURL` comments. A
live-**inline** DSL variant would need the same: mermaid/abcjs added as deps and
loaded this way (a static-mode-style cost; see §Q3).

**Current dependencies** (`package.json` lines 13–31) include `@popperjs/core`,
`katex`, `tippy.js`, `rehype-format`, the remark/mdast/hast utilities, and
`citation-js`. They do **not** include `mermaid`, `abcjs`, `jsdom`, `svgdom`,
`puppeteer`, or `playwright`. Any rendering mode beyond skip and live-link adds
at least one of these.

**Bundled assets today** (`src/assets/`): `hover-preview.css`,
`hover-preview.js`, `default.css`, `font-loader.js`, and the `fonts/` woff2 set
(Inter weights + Source Code Pro). No JavaScript *libraries* are vendored into
`assets/`; tippy/popper/katex come from `node_modules` at emit time. A
live-inline DSL variant would either vendor mermaid/abcjs into `assets/` or
`readFileSync` them from `node_modules` (the existing pattern).

---

## 3. The DSL handlers today (verified)

`src/handlers/mermaid.js` (lines 36–62) emits, via the shared `renderFrameable`
helper, `wrapperEl: 'pre'`:

```html
<pre class="mermaid" data-enscribe-dsl="mermaid">…source…</pre>
```

`src/handlers/abc.js` (lines 38–62) emits `wrapperEl: 'div'`:

```html
<div class="abc" data-enscribe-dsl="abc">…source…</div>
```

In both, `bodyHast` is a single text node holding `node.content.trim()` — the
**verbatim** source. Both join the figure counter and may carry a sibling
`<figcaption>` (title above, `Figure N.` caption below). Both handlers run
**synchronously** inside `toHast` during `compileToHtml`.

The `<pre>` vs `<div>` choice is deliberate (Mermaid documents `<pre>`; abcjs
replaces a block element's content with SVG, so `<div>` is natural). It is also
the root of RQ-DSL-M2 (§Q6): the serializer preserves `<pre>` verbatim but
reformats `<div>`.

**DSL content in the fixture corpus** (enumerated, current as of this slice):

- `<mermaid>` blocks: doc-32 (external-dsls), doc-36 (frameable-build), doc-44
  (cross-feature-monograph), doc-45 (calibration), doc-46
  (reproducible-research). The demonstrative fixtures (doc-45, doc-46) and the
  doc-44 stress fixture all use **flowchart-type** Mermaid (`graph LR`), the
  best-supported diagram type for static rendering.
- `<abc>` blocks: doc-32, doc-36, doc-44.

> **Drift corrected in this slice.** The BACKLOG RQ-DSL-M2 entry (filed by
> commit `b4c4b8a`) stated "doc-32 is the only fixture exercising `<abc>`; the
> demonstrative fixtures (and the doc-44 stress fixture) exercise `<mermaid>`
> only." That is inaccurate: `<abc>` is also exercised in doc-36 and doc-44, and
> doc-44 carries **both** DSLs. The BACKLOG parenthetical was corrected in the
> same commit as this file.

---

## Q1 — DESIGN.md alignment

**Reading verified against the text.** DESIGN.md's External-DSL bullet
(`DESIGN.md` line 164) already anticipates *both* render paths:

> "The consumer's browser may render at view time (by loading the rendering
> library from a CDN), or a build-time tooling pass may pre-render to static SVG
> before publication. … rendering is the publisher's choice of tool."

"render at view time (CDN)" **is** live mode; "a build-time tooling pass may
pre-render to static SVG" **is** static mode. So the two-mode architecture does
not *introduce* new paths — it offers enscribe-built ways to exercise the two
paths the design already names. The only shift is **who runs them**: today the
sentence implies the publisher runs both; the architecture lets the publisher
opt enscribe into running either, with **skip remaining the default** so
"publisher wires it up" is preserved verbatim for anyone who does nothing.

**The genuine tension (flag for chat).** The "Included vs external" bullets
(`DESIGN.md` lines 162–164) currently draw the classification line at **render
timing**: included = "renders source content to final output *during
interpretation*… enscribe owns the rendering pipeline end-to-end." By that
wording, **static mode would read as *included*** — it renders to final output
during interpretation and the output is in enscribe's HTML, working without
client JS. That trips the prompt's own Q1 stop-and-report trigger ("the
two-mode architecture genuinely shifts mermaid/abc from external to included").

**Resolution (recommended, needs chat ratification).** The prompt's intended
axis is **semantics-ownership**, not timing: included = the rendering primitive
lives in enscribe's vocabulary tree (matrix/cases/align are math primitives
enscribe owns); external = enscribe never parses the DSL's semantics and
delegates to an outside library. Under the semantics-ownership axis, **static
mode stays external** — enscribe shells out to the mermaid/abcjs library (an
optional dependency) and never learns mermaid/abc semantics; it merely invokes
the external tool at build time instead of leaving it for view time. This does
**not** genuinely reclassify the DSLs — but the **current DESIGN.md wording
would**, so the text must be revised to draw the line at semantics-ownership.
This is a wording clarification, not a design reversal.

> **Superseded.** The drop-in draft below predates the registry decision. The
> authoritative, registry-aware drop-in text is in **Proposed DESIGN.md
> revision** (after §Q8). The draft here is retained because its *axis fix*
> (ownership, not timing) is unchanged and is the reasoning the later section
> builds on.

**Proposed DESIGN.md drop-in text (CC does not edit DESIGN.md in this slice;
chat ratifies, a follow-up slice writes):**

- *Replace the "Included DSLs" bullet* so the axis is ownership, not timing:
  > **Included DSLs.** The rendering primitive lives in enscribe's own
  > vocabulary and pipeline: the handler renders source to final output using
  > machinery enscribe owns and always bundles, and that output is included in
  > enscribe's HTML. Examples: `<math>` and the math-environment tags (KaTeX);
  > `<csv>`/`<tsv>` (Layer-1 tables); `<code>` and the code sigils. The output
  > works without client JavaScript and enscribe owns the rendering end-to-end.

- *Replace the "External DSLs" bullet* to name the three modes as the
  publisher's choice, with the axis on delegation:
  > **External DSLs.** enscribe does not own the rendering and never parses the
  > DSL's semantics into the core; it delegates to an external library. The
  > handler always emits the pass-through markup contract (a wrapper carrying
  > `class` and `data-enscribe-dsl`). Rendering is the publisher's choice of
  > tool, and enscribe offers three ways to exercise that choice:
  > **skip** (default) — emit only the contract, the publisher wires rendering;
  > **live** — also emit the external library (inlined or CDN-linked) so the
  > browser renders the contract markup at view time; **static** — invoke the
  > external library at build time (an optional, opt-in dependency) and inline
  > the resulting SVG. Examples: `<mermaid>`, `<abc>`. In every mode the
  > semantics stay external; only *when* rendering happens and *who* triggers it
  > differ.

- *Add one sentence* reconciling the "don't drag heavyweight browser-shaped
  dependencies into the enscribe build" point (`DESIGN.md` line 166):
  > The libraries that back live and static mode are optional dependencies; the
  > default build (skip mode) pulls none of them, so the engine stays lean
  > unless the publisher asks enscribe to do the rendering.

No other DESIGN.md section bears on this. The "Embedded DSLs: processor
delegation" section (lines 146–154) is consistent as written — it already says a
processor "returns something the browser can render — HTML, SVG, or a rendered
code block," which covers static-mode SVG.

---

## Q2 — static-mode feasibility

### Mermaid (the hard case)

> **Superseded by the architecture revision.** Static-Mermaid is **dropped** —
> Mermaid is live-only (see the top section). The analysis below is retained as
> the *evidence for that decision*: it is **why** Mermaid cannot ship a clean
> browserless static path, not a menu of static options still on the table.

No first-party server-side renderer exists. The options, by dependency weight:

| Option | Latest | Headless browser? | Notes |
|--------|--------|-------------------|-------|
| `@mermaid-js/mermaid-cli` (`mmdc`) | 11.15.0 | **Yes** — Puppeteer peer dep + Chromium (~170 MB macOS / ~282 MB Linux / ~280 MB Win) | Full fidelity, all diagram types; heaviest |
| `mermaid-isomorphic` | 3.1.0 | **Yes** — Playwright + Chromium | Name notwithstanding, still drives a real browser |
| `mermaid` + plain JSDOM | — | n/a | **Not supported / fragile.** Mermaid needs `SVGTextElement.getBBox()` for text layout; JSDOM has no layout engine and does not implement it |
| `isomorphic-mermaid` (tani) | 0.1.1 | **No** — jsdom + **svgdom** (supplies `getBBox`) + dompurify | The **only** browserless path; **young (v0.1.x, single maintainer)** — validate diagram types |

**Answer to the key question:** there is exactly one browserless static path for
Mermaid today — `isomorphic-mermaid` (jsdom + svgdom). Everything mature drives
Puppeteer/Playwright + Chromium. There is no official no-browser renderer.

**Two further constraints specific to Mermaid static rendering:**

- **Async.** `mermaid.render()` returns a Promise. The current compiler is
  synchronous (`processSync`). Static Mermaid therefore cannot run inside
  `compileToHtml` as written — it needs either an async render pass *outside*
  the unified compiler, or switching the pipeline to async `process()` (which
  forces `render-fixtures.js` and the tests off `processSync`). This is a
  real restructuring cost and a reason to isolate static mode (§Q8).
- **Node mutation.** Static rendering must *replace* each `<pre class="mermaid">`
  element's text with `<svg>` — a tree mutation, unlike the additive injection
  of every existing mode.

### abc (the easy case)

abcjs (latest v6 = **6.6.3**) renders to SVG **in Node without a headless
browser**, via a jsdom shim. It has **no native "SVG string" API** — `renderAbc`
renders *into* a DOM element and returns tune metadata, not markup — so the
server-side pattern is: create a jsdom window → render into a jsdom `<div>` →
read back `div.innerHTML` (the injected `<svg>`). The purpose-built
`folkdb/abc-render-svg` package does exactly this with **jsdom as its only
runtime dependency**. abcjs's own `renderAbc` is **synchronous**, so abc static
rendering *could* run inside the current synchronous compiler (unlike Mermaid).

abcjs itself declares **no runtime dependencies**; static abc adds only jsdom.

### Combined static-mode footprint

- **abc:** + `jsdom` (pure JS, moderately heavy transitive tree, no binary
  download). Clean.
- **Mermaid, browserless:** + `mermaid`, `jsdom`, `svgdom`, `dompurify` (via
  `isomorphic-mermaid`) — no binary download, but a **young** top-level package.
- **Mermaid, full-fidelity:** + Puppeteer/Playwright + **~170–282 MB Chromium**.

**Stop-and-report (Q2 trigger met, reported here rather than halting the
findings):** static-mode Mermaid dependencies *are* more invasive than a clean
npm add. The acceptable-vs-not call — *young browserless lib* vs *heavy
Chromium* — is a chat decision (see §"Decisions for chat"). It does not block
writing the findings, but it blocks committing to a static-Mermaid dependency.

---

## Q3 — live-mode feasibility

Live mode emits the library + an init call and leaves the contract markup for
the library to scan. Two variants, mirroring the existing `'inline'`/`'link'`
split.

### Bundle sizes (pinned)

- **Mermaid 11.15.0:** ~628 KB minified (~150 KB gzipped) — large because of
  many diagram renderers.
- **abcjs 6.6.3:** `abcjs-basic-min.js` ~492 KB.
- Combined inline overhead on a document carrying both: ~1.1 MB minified, added
  per DSL-bearing document.

### CDN URLs (link variant, pinned)

- Mermaid (ESM): `https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.esm.min.mjs`
  (unpkg mirrors the same path). Latest stable: **v11 → 11.15.0**, **v10 →
  10.9.6**.
- abcjs: `https://cdn.jsdelivr.net/npm/abcjs@6.6.3/dist/abcjs-basic-min.js`
  (unpkg mirrors).

### Initialization shapes

- **Mermaid** auto-scans `class="mermaid"`:
  ```html
  <script type="module">
    import mermaid from '…/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true });
  </script>
  ```
- **abcjs** has no DOM-scan; the consumer iterates. The contract marker is the
  selector:
  ```html
  <script>
    document.querySelectorAll('div.abc')
      .forEach(el => ABCJS.renderAbc(el, el.textContent /* see Q6 */));
  </script>
  ```

The init shape is the same for inline and link variants — only the
library-source location differs. Live-**link** adds **zero** new enscribe
dependencies (just URL constants); live-**inline** adds `mermaid`/`abcjs` as
deps (no Chromium, no jsdom). Live mode is **fully synchronous** on enscribe's
side — the asynchronous work happens in the browser, not in the compiler.

---

## Q4 — `dslMode` shape

Candidates (from the prompt), assessed against the asymmetry findings:

- **A. Single axis, four values** `'static' | 'live-inline' | 'live-link' | 'skip'`.
  Extends the `katexCss` precedent by adding `'static'`. Compact; mirrors the
  existing single-axis-with-`inline`/`link`-values convention. Conflates
  render-kind and asset-delivery into one enum.
- **B. Two axes** `dslMode: 'static'|'live'|'skip'` + `dslAssets: 'inline'|'link'`.
  Orthogonal and explicit, but `dslAssets` is meaningless for `static`/`skip`,
  so it carries a "only applies when…" caveat.
- **C. Per-DSL** (`mermaidMode` / `abcMode`). Maximum flexibility, most surface.
- **D. Hybrid** — a global `dslMode` default plus optional per-DSL overrides.

**Recommendation: D, with A's value space.** i.e.
`dslMode: 'static'|'live-inline'|'live-link'|'skip'` as the global default,
plus optional `mermaidMode` / `abcMode` overrides taking the same value set.

Rationale: the **per-DSL escape valve is warranted, not premature**, precisely
because of the §Q2 asymmetry — a publisher may reasonably want **`abc: static`**
(clean, jsdom-only) while keeping **`mermaid: live-link`** (to avoid Chromium /
the young browserless lib). A single global axis cannot express that; the
asymmetry is intrinsic to the two libraries, so the configuration should be able
to track it. Using A's value space (rather than B's second axis) keeps the new
option faithful to the existing `inline`/`link`-as-values precedent and avoids a
caveated orthogonal axis.

> **RESOLVED in chat (post-`d6c595c`).** The recommendation is adopted: **D with
> A's value space**, and per-DSL overrides **ship now** (not deferred). Final
> shape:
>
> - Global `dslMode: 'skip' | 'live-inline' | 'live-link' | 'static'`, default
>   **`'skip'`**.
> - Optional per-DSL `mermaidMode` (value space **excludes `'static'`** —
>   mermaid is live-only) and `abcMode` (all four values).
> - Resolution per DSL: `‹dsl›Mode ?? dslMode ?? 'skip'`.
> - **Conflict rule (fail explicitly).** If a DSL resolves to `'static'` but its
>   registration carries no `staticRenderer` (mermaid, when the global default is
>   `'static'` and no `mermaidMode` override is set), the build **throws** an
>   error naming the DSL and suggesting a live mode. Rationale: a silent fallback
>   to live or skip would substitute a tool the publisher did not choose (skip
>   would ship un-rendered diagrams the publisher believed were static) —
>   violating "publisher chooses the tool." Explicit failure surfaces the
>   mismatch at build, where it is cheap.
>
> **Why per-DSL ships now, not later:** the §Q2 asymmetry is intrinsic — mermaid
> is live-only, abc is live+static — so "abc static, mermaid live" is a *normal*
> configuration a publisher will want on day one, and a single global axis cannot
> express it. The escape valve is required, not speculative. The Q4
> stop-and-report is **closed** by this decision.

**Locked:** default = **skip** (current behavior; no silent breakage of
consumers relying on the current emit shape). Static and live are opt-in.

---

## Q5 — demonstrative-fixture rendering mode

> **RESOLVED in chat (post-`d6c595c`): live-inline.** The "static is the target"
> recommendation below is **overridden**. The demonstrative fixtures are
> mermaid-only, and mermaid is now **live-only** — so static was never actually
> available for them. They render **live-inline** (mermaid library bundled into
> each fixture) for self-containment without a network dependency. The three
> ordered options below are retained as the record of the analysis that led
> there; option 3 (live-inline interim) is the adopted answer, no longer an
> "interim."

The demonstrative fixtures with DSL content are **doc-45** and **doc-46**, both
**Mermaid-only**, both **flowchart-type** (`graph LR`). (abc appears only in
test fixtures doc-32 / doc-36 / doc-44, not in the demonstrative pair.)

**Verifying the locked "static for demonstrative fixtures" call against the Q2
weights:**

- *For the diagram type:* flowcharts are the best-supported Mermaid type, so the
  `isomorphic-mermaid` (jsdom+svgdom) maturity risk is **lowest** for exactly
  these fixtures. Static is technically viable for them.
- *For the toolchain:* choosing static pulls a static-Mermaid dependency into
  the dev/test toolchain (`npm run verify` / `render-fixtures.js`) — either the
  young `isomorphic-mermaid` or ~280 MB Chromium. That is the real cost, and it
  is the same unresolved Q2 dependency decision.

**Finding (Q5 trigger met — the choice is not *clearly* static after Q2).**
Static is the philosophically-aligned target (it matches the inlined-fonts /
base64-KaTeX / inlined-hover-preview self-containment value: open the file,
see the diagram, no JS, no network). But it is **gated on the Q2 dependency
decision**, so it is not unconditionally "the right call" yet. Recommended
ordering for chat:

1. **Static via `isomorphic-mermaid`** — self-contained output, no Chromium;
   accept the young-library risk (mitigated here because the fixtures are
   flowcharts). *Preferred if the maturity risk is acceptable.*
2. **Static via Chromium** — self-contained, full fidelity; ~280 MB in CI/dev.
   *Fallback if `isomorphic-mermaid` proves unreliable.*
3. **Live-inline interim** — bundles Mermaid (~628 KB) into each fixture;
   renders on load, offline, no toolchain deps. *Pragmatic interim if static's
   dependency story should not block the demonstrative fixtures.*

Whichever is chosen, `render-fixtures.js` should set the mode **explicitly**
(e.g. `dslMode: 'static'`, or per-DSL) rather than changing the library default,
which stays **skip** so library consumers are unaffected.

---

## Q6 — interaction with RQ-DSL-M2 (abc indentation)

RQ-DSL-M2: the `<div class="abc">` source is reformatted by the hast→HTML
serializer (every line gets the element's indentation); the hast snapshot is
verbatim, so the defect is **serialization-only**. `<pre>` (Mermaid) is treated
as whitespace-sensitive and is immune; `<div>` (abc) is not. Per-mode exposure:

- **static:** routes **around** M2. A static renderer reads the verbatim source
  from the hast text node's `.value` (which is correct — see §3) *before*
  serialization, generates the SVG, and replaces the element. The serializer
  never touches abc source as text. M2 is irrelevant to static mode.
- **live:** **exposed**. The browser reads `el.textContent`, which carries the
  serializer's indentation, and hands it to abcjs. Mitigation is the
  leading-whitespace strip shown in §Q3
  (`el.textContent.replace(/^\s+/gm, '')`) — generally safe for ABC, which is
  line-oriented — but that is a *workaround in the init script*, not a fix.
- **skip:** **most exposed**. The publisher receives the indented source and
  must strip it themselves; the contract promised verbatim and did not deliver.

**Conclusion.** M2 stays a bug regardless of mode — the contract says verbatim
and the serializer violates it. The two-mode architecture **changes its
severity, not its validity**: static routes around it, live mitigates via the
init strip, skip is fully exposed. The clean fix (so live needs no strip hack
and skip-mode publishers get verbatim source) is to make the serializer preserve
the abc source — the BACKLOG entry lists candidate fixes (mark the text node
whitespace-sensitive; wrap in a preserving inner element; or switch the abc
wrapper to `<pre>` as Mermaid uses). **Recommendation:** fix M2 in (or just
before) the **live-mode** slice (Slice 1), since live mode is where the bug
actively breaks rendering; static mode does not need it. The fix itself stays
out of scope for this Phase 0.

> **Post-revision note.** With abc confirmed as the live+static DSL, the chosen
> M2 fix lands in Slice 1 (abc-live) and must not interfere with Slice 2's
> abc-static node-mutation (which reads the verbatim source from the hast text
> node's `.value`, ahead of serialization). All three candidate fixes
> (whitespace-sensitive text node / preserving inner element / `<pre>` wrapper)
> satisfy that — they change serialization, not the in-memory `.value` the
> static renderer reads — so the choice is unconstrained by Slice 2.

---

## Q7 — spec-revision sketch (structure only)

> **ID letters superseded.** The L/T/O predicate-letter sketch in this section
> is replaced by the mode-aware `RQ-DSL-<MODE>-<KIND><N>` scheme — see **Proposed
> spec ID scheme and revision structure** after §Q8. The *structure* below (which
> predicates exist per mode, what "Out of spec" becomes) is carried forward
> intact; only the ID spelling changes.

The current RQ-DSL section (`notes/specs/render-quality.md` §9) defines M1
(mermaid `<pre>` verbatim), M2 (abc `<div>` verbatim), M3 (shared figure counter
/ sibling figcaption), S1 (mermaid `<pre>` styled as code block), and an "Out of
spec" clause punting all rendering to DESIGN.md. Post-architecture, the section
becomes **mode-aware**. Proposed structure (a future spec slice writes the
prose; this is the sketch chat ratifies):

- **Contract predicates (mode-independent).** Keep **M1, M2, M3** — they
  describe the markup contract that is every mode's *input* and skip mode's
  *output*. Reframe them under a "Contract / skip mode" heading.
- **Skip-mode predicates.** Rendered HTML = contract markup only; no asset
  nodes, no SVG. Observable outcome depends entirely on the publisher.
- **Live-mode predicates** (new). Proposed IDs RQ-DSL-**L1**/**L2**:
  - L1 — per-DSL **conditional** asset emission: a present DSL gets its library
    (`<script src>` to the pinned CDN in link variant, or an inline `<script>`
    in inline variant) plus an init call; a document with no DSL gets nothing; a
    mermaid-only document gets only Mermaid assets.
  - L2 — the contract markup is preserved **unchanged** alongside the assets
    (the library scans it).
- **Static-mode predicates** (new). Proposed IDs RQ-DSL-**T1**/**T2**:
  - T1 — each DSL element's source is **replaced** by inline `<svg>`.
  - T2 — no client-side library/init is emitted in static mode (self-contained,
    no JS required).
- **Observable predicates** (new, not snapshot-checkable — visual verification
  only). Proposed IDs RQ-DSL-**O1**/**O2**:
  - O1 (live) — opened in a browser with library access (CDN reachable, or
    inline lib present), sources render to SVG.
  - O2 (static) — opened in any browser, offline, with JS disabled, diagrams /
    music display.
- **Keep S1** (mermaid `<pre>` styled as a code block) — graceful degradation
  for skip/live before the library runs.
- **Revise the "Out of spec" clause.** Replace "a CDN `<script>` … is explicitly
  *not* emitted or enforced by enscribe" with: in **skip** mode (default)
  enscribe emits only the contract; **live** and **static** are opt-in and emit
  assets / inline SVG per L*/T*/O* above. Update the DESIGN.md cross-reference to
  point at the two-mode architecture.

The L/T/O letters avoid colliding with the existing `M` (markup) and `S`
(stylesheet) prefixes; chat finalizes the ID scheme.

---

## Q8 — implementation slicing

The options (A one-big, B by-mode, C infra-then-modes, D static-first, E
live-first), assessed against the findings:

- Live mode is **small, synchronous, precedent-matching** (additive injection
  like hover-preview), and **low/zero new deps** (link = zero; inline = +
  mermaid/abcjs, no Chromium).
- Static mode is **large, async (Mermaid), node-mutating, heavy-dep**, and
  carries the unresolved Chromium-vs-young-lib decision.
- skip needs **no code** — it is the current behavior; "formalizing" it is just
  making it the documented default of the new option.

> **Refined by the architecture revision.** The two-slice split is **ratified**
> but lightened: Slice 1 also builds the **registry** (Path C) and renders the
> demonstrative fixtures **live-inline** (not static); Slice 2 shrinks to
> **abc-static-only via jsdom** — static-mermaid is dropped, so there is **no
> svgdom/Chromium choice and no sync/async restructuring** (the async problem was
> Mermaid's alone). The bullets below are updated to match. The
> **Implementation slice 1 scope statement** after this section is the
> copy-ready version.

**Recommendation: split — a blend of C (infra first) and E (live before
static), in two implementation slices** (plus an already-planned Phase-14
consolidation slice that is not DSL-rendering work):

- **Slice 1 — registry + mode infrastructure + skip default + live mode.** Build
  the **DSL-render registry** (`src/dsl/registry.js`, static Map; mermaid
  registered live-only, abc live+static) per the Q1 shape. Add the `dslMode`
  option + per-DSL overrides (default skip → output-neutral for existing
  fixtures) with the fail-explicitly conflict rule, the `hasMermaid`/`hasAbc`
  detectors, the `buildDslAssets(dsl, mode)` builder, the MERMAID/ABCJS CDN
  constants, and the conditional registry-driven `unshift` in `compileToHtml` —
  all mirroring `buildHoverPreviewAssets` exactly. Live-link is the zero-dep
  core; live-inline (adds mermaid/abcjs) rides along since it is the same builder
  with `readFileSync` loaders. Fix RQ-DSL-M2 here (§Q6). Render the demonstrative
  fixtures **live-inline** (§Q5). Spec: add the `RQ-DSL-SKIP-*` + `RQ-DSL-LIVE-*`
  predicates. **Low risk, precedent-matching, synchronous.**
- **Slice 2 — abc static mode (jsdom).** Static is **abc-only** (mermaid is
  live-only — dropped). Add **jsdom** as the sole new dependency (no svgdom, no
  Chromium), implement abc's `staticRenderer` (render into a jsdom `<div>`, read
  back the injected `<svg>`) and the **node-mutation** that replaces the abc
  element's source with that SVG. abcjs `renderAbc` is **synchronous**, so this
  runs inside the existing synchronous compiler — **no `process()` migration, no
  async render pass**. Spec: add the `RQ-DSL-STATIC-*` predicates. **Much smaller
  than the original Slice 2 once static-mermaid is dropped — one clean dependency,
  one synchronous renderer, one mutation.**

**Why not the others:**

- **A (one big):** even with static-mermaid dropped, bundling registry + live +
  abc-static + the M2 fix + demo fixtures into one commit is too many ways to be
  wrong at once; the registry + live win should land cleanly on its own first.
- **B (three equal by-mode slices):** skip is a no-op, so skip+infra+live
  naturally collapse into one slice.
- **D (static first):** front-loads the node-mutation work and blocks the easy,
  precedent-matching live win behind it for no benefit.
- **E pure (live then static, no infra slice):** essentially the recommendation;
  the only refinement is folding infra + skip-default into Slice 1.

**v0.1.0 / Phase-14 fit.** Phase 14 (`ROADMAP.md` lines 435–478) names a
**client-side rendering library** (in-browser editor/viewer) — the **live**-mode
use case — and **self-contained demonstrative fixtures** — the **static** use
case. Live mode is the smaller first step and directly serves the client-side
library; static serves the demonstrative fixtures. Neither DSL slice has a hard
dependency on unbuilt Phase-14 work; live mode *enables* the client-side library
but does not block on it. So the live-first split also matches the Phase-14
shape. **No Q8 hard dependency on unbuilt work was found.**

---

## Chat-decisions resolved post-`d6c595c`

The six "Decisions for chat" the original findings listed (still printed below
for traceability) were settled in the chat that followed `d6c595c`. Their
resolutions:

1. **DESIGN.md classification axis (Q1) — RESOLVED: ratified.** The
   included/external line is drawn at **semantics-ownership**, not render-timing;
   static mode stays "external." The registry-aware drop-in text is in **Proposed
   DESIGN.md revision** below (it supersedes the §Q1 inline draft).
2. **Static-Mermaid dependency (Q2/Q5) — RESOLVED: dropped.** Mermaid is
   **live-only**. The `isomorphic-mermaid`-vs-Chromium choice is moot. abc is the
   only static-capable DSL (jsdom).
3. **`dslMode` shape (Q4) — RESOLVED: per-DSL with global default (D), A's value
   space, default skip, per-DSL overrides ship now.** See the updated §Q4. Per-DSL
   ships now (not deferred) because the mermaid-live-only / abc-live+static
   asymmetry **cannot be expressed without it** — a single global axis cannot say
   "abc static, mermaid live."
4. **Spec ID scheme (Q7) — RESOLVED in shape: mode-aware.** The L/T/O sketch is
   superseded by `RQ-DSL-<MODE>-<KIND><N>`; see **Proposed spec ID scheme** below.
   (The MODE-token spelling is the one residual proposal, flagged there.)
5. **M2 fix timing (Q6) — RESOLVED: fix in Slice 1.** The candidate fix
   (whitespace-sensitive text node / preserving inner element / `<pre>` wrapper)
   is chosen in Slice 1; it must serve both abc-live (Slice 1) and abc-static
   (Slice 2).
6. **Slicing (Q8) — RESOLVED: two-slice split ratified**, lightened by the
   static-mermaid drop (Slice 2 = abc-static-only, jsdom-only). See updated §Q8
   and **Implementation slice 1 scope statement** below.

**The one decision the original findings did not anticipate — and its
resolution.** *How* the modes wire into the engine: **Path C, the internal DSL
registry** (top section). This is the substantive new content of this amendment.

### What stays open after this amendment (Q7)

Genuinely open — each is a *proposal here*, ratified/realized by a later slice:

- **DESIGN.md text** — proposed below; **not yet written into `DESIGN.md`** (a
  follow-up edit slice writes it). Out of scope here.
- **Spec ID scheme** — proposed below (`RQ-DSL-<MODE>-<KIND><N>`); the MODE-token
  spelling needs a one-line chat nod; **not yet written into `render-quality.md`**
  (a spec slice writes it).
- **Registry shape & API boundary** — chat approves the shape (top section);
  **implementation realizes it** in Slice 1.
- **M2 fix choice** — which of the three candidates; **decided in Slice 1.**

Closed by this amendment (no longer open): the static-Mermaid dependency
decision (dropped), the `dslMode` shape (locked), the demonstrative-fixture mode
(live-inline), and *whether* a registry (yes — Path C).

---

## Proposed DESIGN.md revision

CC does **not** edit `DESIGN.md` in this slice. This is the drop-in text a
follow-up slice writes once chat ratifies. It supersedes the inline draft in §Q1
(which predates the registry decision).

**Axis fix (unchanged from §Q1).** Redraw the included/external line at
**semantics-ownership**, not render-timing, so static mode stays "external."

**Current text** (`DESIGN.md` lines 162–164, verbatim, elided with "…"):

> - **Included DSLs.** The handler renders source content to final output during
>   interpretation, and that output is included in enscribe's HTML. Examples:
>   `<math>` … enscribe owns the rendering pipeline end-to-end.
>
> - **External DSLs.** The handler emits pass-through markup preserving source
>   content; rendering happens *external* to enscribe, by downstream tooling.
>   The consumer's browser may render at view time … or a build-time tooling pass
>   may pre-render to static SVG … rendering is the publisher's choice of tool.

**Replacement — Included DSLs bullet:**

> **Included DSLs.** The rendering primitive lives in enscribe's own vocabulary
> and pipeline: the handler renders source to final output using machinery
> enscribe owns and always bundles, and that output is included in enscribe's
> HTML. Examples: `<math>` and the math-environment tags (KaTeX); `<csv>`/`<tsv>`
> (Layer-1 tables); `<code>` and the code sigils. The output works without client
> JavaScript and enscribe owns the rendering end-to-end.

**Replacement — External DSLs bullet** (names the registry already introduced two
paragraphs above, and the three publisher-selected modes):

> **External DSLs.** enscribe does not own the rendering and never parses the
> DSL's semantics into the core; it delegates to an external library. The handler
> always emits the pass-through markup contract (a wrapper carrying `class` and
> `data-enscribe-dsl`). Each external DSL's registry entry additionally declares
> how enscribe can render it on the publisher's behalf, and the publisher
> chooses per DSL among three modes: **skip** (default) — emit only the contract,
> the publisher wires rendering; **live** — also emit the external library
> (inlined or CDN-linked) so the browser renders the contract markup at view
> time; **static** — invoke the external library at build time (an optional,
> opt-in dependency) and inline the resulting SVG. Examples: `<mermaid>` (live
> only) and `<abc>` (live or static). In every mode the semantics stay external;
> only *when* rendering happens and *who* triggers it differ.

**Add one sentence** after the heavyweight-dependency point (`DESIGN.md` line
166):

> The libraries that back live and static mode are optional dependencies declared
> per DSL in the registry; the default build (skip mode) pulls none of them, so
> the engine stays lean unless the publisher asks enscribe to do the rendering.
> Not every DSL offers every mode — Mermaid's only browserless path needs a
> headless browser, so enscribe registers it live-only; abc registers both.

**Why this is coherent with the existing text, not a reversal.** DESIGN.md
already says (line 150) *"the tag-to-processor mapping is the DSL registry; a new
processor … is added by extending the registry,"* and already says (line 164)
the publisher may render at view time **or** pre-render to static SVG. The
revision (a) corrects the included/external axis to ownership so
static-as-an-enscribe-option does not read as "included," and (b) names the
registry — which DESIGN.md already introduced — as the place each external DSL
declares its render modes. No new concept is added to DESIGN.md; two existing
ones (the registry, the two render paths) are joined.

---

## Proposed spec ID scheme and revision structure

CC does **not** edit `render-quality.md` in this slice. This is the scheme a spec
slice ratifies and writes. It supersedes the §Q7 L/T/O sketch.

### ID scheme

The prompt proposed `RQ-DSL-<MODE>-<KIND><N>` with
MODE ∈ {SKIP, LIVE-INLINE, LIVE-LINK, STATIC}, KIND ∈ {M, S, O}, e.g.
`RQ-DSL-LIVE-INLINE-M1`.

**One refinement recommended (within mode-awareness, not a structural change).**
`LIVE-INLINE` / `LIVE-LINK` contain an internal hyphen, which collides with the
hyphen-as-segment-separator convention (`RQ-DSL-LIVE-INLINE-M1` parses
ambiguously: `…/LIVE/INLINE/M1` or `…/LIVE-INLINE/M1`?). And inline vs link share
**one observable contract** — library present + init call + markup preserved;
only the *asset source* differs (inline `<script>` vs `<script src>`), which one
predicate can describe in prose. So collapse the live variants to a single MODE
token:

> **`RQ-DSL-<MODE>-<KIND><N>`**, MODE ∈ {**SKIP**, **LIVE**, **STATIC**},
> KIND ∈ {**M** markup, **S** stylesheet, **O** observable}, e.g.
> `RQ-DSL-LIVE-M1`, `RQ-DSL-STATIC-M1`, `RQ-DSL-STATIC-O2`, `RQ-DSL-SKIP-M1`.

This stays mode-aware (the prompt's intent), parses unambiguously (every MODE
token is a single word), and keeps the existing single-letter KIND convention
(`M`/`S`/`O`) the rest of `render-quality.md` uses. The inline/link split lives
*inside* a `RQ-DSL-LIVE-*` predicate's prose, not in the ID. **This is a
proposal; chat ratifies the MODE-token spelling.** (It does not trip the Q4
stop-and-report: the change is the token spelling, not the structure.)

### Revision structure (carried from §Q7, re-keyed to the new scheme)

- **Contract / skip mode (mode-independent input + skip output).** Keep the three
  current contract predicates, re-keyed: `RQ-DSL-M1` (mermaid `<pre>` verbatim),
  `RQ-DSL-M2` (abc `<div>` verbatim), `RQ-DSL-M3` (shared figure counter / sibling
  figcaption). Add `RQ-DSL-SKIP-M1`: in skip mode the rendered HTML is the
  contract markup only — no asset nodes, no SVG.
- **Live mode** — `RQ-DSL-LIVE-M1`: a present DSL conditionally gets its library
  (inline `<script>` with bundled source, **or** `<script src>` to the pinned
  CDN) plus an init call; absent DSL → nothing; a mermaid-only document → only
  mermaid assets. `RQ-DSL-LIVE-M2`: the contract markup is preserved unchanged
  alongside the assets. `RQ-DSL-LIVE-O1` (observable, visual-only): opened with
  library access, sources render to SVG.
- **Static mode (abc only)** — `RQ-DSL-STATIC-M1`: the abc element's source is
  **replaced** by inline `<svg>`. `RQ-DSL-STATIC-M2`: no client-side library /
  init is emitted. `RQ-DSL-STATIC-O2` (observable, visual-only): opened offline
  with JS disabled, the notation displays. **No `RQ-DSL-STATIC-*` predicate
  exists for mermaid** — mermaid is live-only; a spec note records that asking for
  static mermaid is a build error (§Q4 fail-explicitly).
- **Keep `RQ-DSL-S1`** (mermaid `<pre>` styled as a code block) — graceful
  degradation for skip/live before the library runs.
- **Revise the "Out of spec" clause** — replace "a CDN `<script>` … is explicitly
  *not* emitted or enforced by enscribe" with: skip (default) emits only the
  contract; live and static are opt-in and emit assets / inline SVG per the
  `RQ-DSL-LIVE-*` / `RQ-DSL-STATIC-*` predicates. Repoint the DESIGN.md
  cross-reference at the registry-based two-mode architecture.

---

## Implementation slice 1 scope statement

Copy-ready for the Slice 1 implementation prompt. (Slice 2 — abc-static via jsdom
— is scoped separately and is **not** part of Slice 1.)

**Goal.** Add the DSL-render registry and **live mode** (inline + link) for both
DSLs, with **skip** as the unchanged default; fix RQ-DSL-M2; render the
demonstrative fixtures live-inline; and add the live + skip spec predicates.

**In scope.**

1. **Registry.** New `src/dsl/registry.js`: a static `Map` built at load (the
   `HANDLER_REGISTRY` idiom, `interpret-plugin.js` 78–92), with `dslRegistration`
   objects for mermaid (live-only: no `staticRenderer`) and abc. Internal reads
   `getRegisteredDsls()` / `getDsl(name)`. **Not** added to `package.json`
   `exports` (Q5). Header comment marks it internal-for-v0.1.0.
2. **Config.** `dslMode: 'skip'|'live-inline'|'live-link'|'static'` (default
   `'skip'`) + optional `mermaidMode` (no `'static'`) / `abcMode` (all four),
   resolved per DSL as `‹dsl›Mode ?? dslMode ?? 'skip'`. If a DSL resolves to
   `'static'` but its registration has no `staticRenderer` (mermaid): **fail
   explicitly** with an error naming the DSL and suggesting a live mode.
3. **Detectors + builder.** `hasMermaid` / `hasAbc` (the §2 detector shape);
   `buildDslAssets(dsl, mode)` mirroring `buildHoverPreviewAssets` — link →
   `<script src>` (+ `<link>` if any) + inline init; inline → inline `<script>`
   (bundled lib + init). Add MERMAID / ABCJS CDN constants (the §2 CDN-constant
   pattern) and, for inline, `readFileSync` loaders + the deps (`mermaid`,
   `abcjs`) — no jsdom, no Chromium.
4. **Injection.** In `compileToHtml`, after the hover-preview block, iterate
   `getRegisteredDsls()`; for each present (detector) DSL whose resolved mode is
   live, `unshift(...buildDslAssets(...))`. Additive, synchronous — the existing
   shape.
5. **M2 fix** (§Q6): make the abc `<div>` source survive serialization verbatim
   (chosen candidate). Must serve abc-live now and abc-static (Slice 2) later.
6. **Demonstrative fixtures.** Render doc-45 / doc-46 **live-inline** (mermaid);
   set the mode explicitly in `render-fixtures.js`, not by changing the library
   default (which stays skip).
7. **Spec.** Add `RQ-DSL-SKIP-*` and `RQ-DSL-LIVE-*` predicates and revise the
   "Out of spec" clause (per the Proposed spec ID scheme).

**Out of scope (Slice 2 or later):** abc **static** mode and its jsdom dependency;
any mermaid static path (dropped); the public `registerDsl` API (v0.2.0); the
DESIGN.md edit (separate edit slice); unifying the handler's hardcoded contract
markers to read from the registry (later cleanup).

**Correctness model.** **Output-neutral at the default** — existing fixtures
render in skip mode, so `git diff test/fixtures/` is empty for everything except
the two demonstrative fixtures, which intentionally move to live-inline
(output-adding, reviewed). Snapshots change only for the live-mode additions and
the M2 fix; regenerate and review per CLAUDE.md.

---

## Decisions for chat

> **All six RESOLVED post-`d6c595c`** — see **Chat-decisions resolved** above for
> the resolutions. This list is retained verbatim as the record of what was
> asked; it is no longer the open-questions list.

Consolidated from the stop-and-report triggers above. Each blocks the
corresponding implementation step, not this findings file.

1. **DESIGN.md classification axis (Q1).** Ratify drawing the included/external
   line at **semantics-ownership** (not render-timing), so static mode stays
   "external." Approve the proposed drop-in text for the two bullets + the
   optional-dependency sentence. A follow-up slice makes the edit.
2. **Static-Mermaid dependency (Q2/Q5).** Choose: young browserless
   `isomorphic-mermaid` (jsdom+svgdom), or mature Chromium (~280 MB), or defer
   static-Mermaid and ship demonstrative fixtures **live-inline** as an interim.
3. **`dslMode` shape (Q4).** Single-axis-values (A-space) vs orthogonal axes
   (B); per-DSL overrides now (D) or deferred. Default **skip** is locked.
4. **Spec ID scheme (Q7).** Ratify the mode-aware structure and the L/T/O
   predicate-letter sketch (or pick another ID scheme).
5. **M2 fix timing (Q6).** Confirm fixing RQ-DSL-M2 inside the live-mode slice
   (Slice 1), and which candidate fix (whitespace-sensitive text node /
   preserving inner element / `<pre>` wrapper).
6. **Slicing (Q8).** Ratify the two-slice split (infra+skip+live, then static).

---

## Sources

**External (library facts; verified against authoritative sources, pinned to
versions):**

- Mermaid bundle size / versions: bundlephobia (`mermaid@11.15.0` ≈ 628 KB min,
  ≈ 150 KB gzip); npm registry dist-tags (v11 → 11.15.0, v10 → 10.9.6).
- Mermaid init + `class="mermaid"` scan: mermaid.js.org usage docs.
- `@mermaid-js/mermaid-cli` 11.15.0 + Puppeteer peer dep: npm registry / GitHub
  README. Chromium download sizes (~170 MB macOS / ~282 MB Linux / ~280 MB Win):
  Puppeteer installation docs (pptr.dev).
- `mermaid-isomorphic` 3.1.0 uses Playwright: npm registry / GitHub README.
- `mermaid` + JSDOM lacks `getBBox`: mermaid GitHub issues #3650 / #260; jsdom
  package docs.
- `isomorphic-mermaid` 0.1.1 (jsdom + svgdom + dompurify, browserless): npm
  registry / GitHub (tani).
- abcjs v6 = 6.6.3; no runtime deps; needs a DOM, no SVG-string API
  (`renderAbc` returns tune data): npm registry (`abcjs@6.6.3`),
  docs.abcjs.net (faq, visual/overview, visual/render-abc-result). Bundle size
  (`abcjs-basic-min.js` ≈ 492 KB): jsDelivr file metadata. Server-side via jsdom:
  `folkdb/abc-render-svg` (jsdom as sole runtime dep). CDN + init: abcjs
  getting-started docs.

**In-repo (code/design facts; file:line):**

- Mode options + sync compiler + additive injection + node builders + detectors
  + CDN constants + inline loaders: `packages/enscribe-interpreter/src/index.js`
  (lines 50–62, 121, 146–149, 127–213, 217–302, 311–328, 340–341, 441–486).
- Handlers: `src/handlers/mermaid.js` (36–62), `src/handlers/abc.js` (38–62).
- Existing registry idiom (the precedent Path C extends): `HANDLER_REGISTRY` /
  `INTERNAL_REGISTRY` static `Map`s + the dispatcher threading `opts` to handlers:
  `packages/enscribe-interpreter/src/interpret-plugin.js` (54–92, 101–134;
  handler dispatch at 117–121).
- Dependencies + single-entry `exports` (Q5 boundary):
  `packages/enscribe-interpreter/package.json` (`exports` line 8; deps 13–31).
- Bundled assets: `packages/enscribe-interpreter/src/assets/`.
- Fixture render invocation (`processSync`, default modes):
  `packages/enscribe-interpreter/test/render-fixtures.js` (77–82).
- DESIGN.md external/included + embedded-DSL, incl. the **"DSL registry … a new
  processor is added by extending the registry"** sentence Path C builds on:
  `DESIGN.md` (146–168; registry sentence at line 150; external-DSL bullet 164;
  `data-enscribe-dsl` contract 168).
- Render-quality §9: `notes/specs/render-quality.md` (435–476).
- RQ-DSL-M2: `BACKLOG.md` (checklist 117–120; detail 428–462).
- Phase 14: `ROADMAP.md` (435–478).
