# DSL rendering architecture — Phase 0 findings

**Status.** Read-only investigation. No code, spec, design-doc, fixture,
snapshot, or test changes were made by the slice that produced this file. The
file is the deliverable: it is the document slot for the DSL rendering
architecture itself, read by the implementation slicer to know what is being
built and by anyone touching DSL code afterward to understand the design.

**Scope.** Investigates how acadamark renders its two external DSLs — Mermaid
diagrams (`<mermaid>`) and ABC music notation (`<abc>`) — under a **two-mode
architecture (static + live)** plus the existing **skip** behavior. Answers
Q1–Q8 from the Phase 0 prompt and ends with a consolidated list of decisions
chat must ratify before implementation.

**Naming (locked).** The two new modes are **static** and **live**. The
alternatives considered in chat — "build/client-side," "pre-rendered/loaded,"
"server/browser" — were rejected; this document uses "static" / "live"
throughout, and names the alternatives only here to record the decision against
them.

---

## How to read this

- §1 states the architecture in one picture and the central finding.
- §2–§3 record the **verified** substrate: the existing asset-emit path and the
  DSL handlers as they stand today. Every later claim about "the existing
  mechanism" traces to these.
- §Q1–§Q8 answer the prompt's questions. Q2 and Q8 carry the load.
- §"Decisions for chat" consolidates every point that needs ratification.
- §"Sources" lists external citations (library facts) and the in-repo
  file:line citations for code facts.

---

## 1. The architecture in one picture

Three modes, all of which honor DESIGN.md's "rendering is the publisher's choice
of tool" stance — the publisher chooses the mode; acadamark never decides to
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

All line references are to `packages/acadamark-interpreter/src/index.js` unless
noted.

**Two mode options exist today, and they are the precedent the prompt names.**

- `katexCss: 'inline' (default) | 'link' | 'skip'` and
  `hoverPreviewMode: 'inline' (default) | 'link' | 'skip'` — documented at the
  options doc-comment (lines 50–62) and read at the top of
  `acadamarkInterpreter` (lines 340–341). `'inline'` = self-contained, no
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
the same shape, keying off `class`/`data-acadamark-dsl`.

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
<pre class="mermaid" data-acadamark-dsl="mermaid">…source…</pre>
```

`src/handlers/abc.js` (lines 38–62) emits `wrapperEl: 'div'`:

```html
<div class="abc" data-acadamark-dsl="abc">…source…</div>
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
not *introduce* new paths — it offers acadamark-built ways to exercise the two
paths the design already names. The only shift is **who runs them**: today the
sentence implies the publisher runs both; the architecture lets the publisher
opt acadamark into running either, with **skip remaining the default** so
"publisher wires it up" is preserved verbatim for anyone who does nothing.

**The genuine tension (flag for chat).** The "Included vs external" bullets
(`DESIGN.md` lines 162–164) currently draw the classification line at **render
timing**: included = "renders source content to final output *during
interpretation*… acadamark owns the rendering pipeline end-to-end." By that
wording, **static mode would read as *included*** — it renders to final output
during interpretation and the output is in acadamark's HTML, working without
client JS. That trips the prompt's own Q1 stop-and-report trigger ("the
two-mode architecture genuinely shifts mermaid/abc from external to included").

**Resolution (recommended, needs chat ratification).** The prompt's intended
axis is **semantics-ownership**, not timing: included = the rendering primitive
lives in acadamark's vocabulary tree (matrix/cases/align are math primitives
acadamark owns); external = acadamark never parses the DSL's semantics and
delegates to an outside library. Under the semantics-ownership axis, **static
mode stays external** — acadamark shells out to the mermaid/abcjs library (an
optional dependency) and never learns mermaid/abc semantics; it merely invokes
the external tool at build time instead of leaving it for view time. This does
**not** genuinely reclassify the DSLs — but the **current DESIGN.md wording
would**, so the text must be revised to draw the line at semantics-ownership.
This is a wording clarification, not a design reversal.

**Proposed DESIGN.md drop-in text (CC does not edit DESIGN.md in this slice;
chat ratifies, a follow-up slice writes):**

- *Replace the "Included DSLs" bullet* so the axis is ownership, not timing:
  > **Included DSLs.** The rendering primitive lives in acadamark's own
  > vocabulary and pipeline: the handler renders source to final output using
  > machinery acadamark owns and always bundles, and that output is included in
  > acadamark's HTML. Examples: `<math>` and the math-environment tags (KaTeX);
  > `<csv>`/`<tsv>` (Layer-1 tables); `<code>` and the code sigils. The output
  > works without client JavaScript and acadamark owns the rendering end-to-end.

- *Replace the "External DSLs" bullet* to name the three modes as the
  publisher's choice, with the axis on delegation:
  > **External DSLs.** acadamark does not own the rendering and never parses the
  > DSL's semantics into the core; it delegates to an external library. The
  > handler always emits the pass-through markup contract (a wrapper carrying
  > `class` and `data-acadamark-dsl`). Rendering is the publisher's choice of
  > tool, and acadamark offers three ways to exercise that choice:
  > **skip** (default) — emit only the contract, the publisher wires rendering;
  > **live** — also emit the external library (inlined or CDN-linked) so the
  > browser renders the contract markup at view time; **static** — invoke the
  > external library at build time (an optional, opt-in dependency) and inline
  > the resulting SVG. Examples: `<mermaid>`, `<abc>`. In every mode the
  > semantics stay external; only *when* rendering happens and *who* triggers it
  > differ.

- *Add one sentence* reconciling the "don't drag heavyweight browser-shaped
  dependencies into the acadamark build" point (`DESIGN.md` line 166):
  > The libraries that back live and static mode are optional dependencies; the
  > default build (skip mode) pulls none of them, so the engine stays lean
  > unless the publisher asks acadamark to do the rendering.

No other DESIGN.md section bears on this. The "Embedded DSLs: processor
delegation" section (lines 146–154) is consistent as written — it already says a
processor "returns something the browser can render — HTML, SVG, or a rendered
code block," which covers static-mode SVG.

---

## Q2 — static-mode feasibility

### Mermaid (the hard case)

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
library-source location differs. Live-**link** adds **zero** new acadamark
dependencies (just URL constants); live-**inline** adds `mermaid`/`abcjs` as
deps (no Chromium, no jsdom). Live mode is **fully synchronous** on acadamark's
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

**This is a config-design question (Q4 stop-and-report trigger met).** Chat
decides single-axis-values (A-space) vs orthogonal axes (B), and whether per-DSL
overrides ship now (D) or are deferred until a publisher needs them.

**Locked:** default = **skip** (current behavior; no silent breakage of
consumers relying on the current emit shape). Static and live are opt-in.

---

## Q5 — demonstrative-fixture rendering mode

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
before) the **live-mode** slice, since live mode is where the bug actively
breaks rendering; static mode does not need it. The fix itself stays out of
scope for this Phase 0.

---

## Q7 — spec-revision sketch (structure only)

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
  *not* emitted or enforced by acadamark" with: in **skip** mode (default)
  acadamark emits only the contract; **live** and **static** are opt-in and emit
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

**Recommendation: split — a blend of C (infra first) and E (live before
static), in two implementation slices** (plus an already-planned Phase-14
consolidation slice that is not DSL-rendering work):

- **Slice 1 — mode infrastructure + skip default + live mode.** Add the agreed
  `dslMode` option (default skip → output-neutral for existing fixtures), the
  `hasMermaid`/`hasAbc` detectors, the `buildDslAssets(mode)` builder, the
  MERMAID/ABCJS CDN constants, and the conditional `unshift` in `compileToHtml`
  — all mirroring `buildHoverPreviewAssets` exactly. Live-link is the zero-dep
  core; live-inline (adds mermaid/abcjs) can ride along since it is the same
  builder with `readFileSync` loaders. Fix RQ-DSL-M2 here (§Q6). Spec: add the
  skip + live (L*/O1) predicates. **Low risk, precedent-matching, synchronous.**
- **Slice 2 — static mode.** Add the DOM-shim dependency (jsdom; + svgdom or
  Chromium per the chat decision), resolve the **sync/async** restructuring
  (likely an async render pass distinct from the synchronous compiler, or move
  fixtures/tests to `process()`), implement the **node-mutation** SVG
  replacement, and validate against the fixtures' diagram types. Move the
  demonstrative fixtures to static (§Q5). Spec: add the static (T*/O2)
  predicates. **The heavy, novel, surprise-prone slice — isolated so its
  dependency and async risks do not contaminate the live win.**

**Why not the others:**

- **A (one big):** the static async/dep surprises would gate the easy live win;
  too many ways to be wrong in one commit.
- **B (three equal by-mode slices):** skip is a no-op, so skip+infra+live
  naturally collapse into one slice.
- **D (static first):** front-loads the heaviest, most-uncertain work
  (Chromium/async/maturity) and blocks the easy win.
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

## Decisions for chat

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
  + CDN constants + inline loaders: `packages/acadamark-interpreter/src/index.js`
  (lines 50–62, 121, 146–149, 127–213, 217–302, 311–328, 340–341, 441–486).
- Handlers: `src/handlers/mermaid.js` (36–62), `src/handlers/abc.js` (38–62).
- Dependencies: `packages/acadamark-interpreter/package.json` (13–31).
- Bundled assets: `packages/acadamark-interpreter/src/assets/`.
- Fixture render invocation (`processSync`, default modes):
  `packages/acadamark-interpreter/test/render-fixtures.js` (77–82).
- DESIGN.md external/included + embedded-DSL: `DESIGN.md` (146–168).
- Render-quality §9: `notes/specs/render-quality.md` (435–476).
- RQ-DSL-M2: `BACKLOG.md` (checklist 117–120; detail 428–462).
- Phase 14: `ROADMAP.md` (435–478).
