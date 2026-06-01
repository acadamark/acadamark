# Phase 8 — display features: Phase 0 findings

Read-only investigation for Phase 8, the three release-blocking display
features: a **table-of-contents sidebar**, **single-chapter book navigation**,
and **additional themes**. No code was changed. This document is the design
baseline for the implementation slices; it ends in a recommended scope and
slicing.

**Verdict up front: proceed.** Neither discipline stop-condition fires — the ToC
sidebar can be an *opt-in* layout that leaves every non-ToC document
byte-identical, and book chapters already render as clean sibling elements. The
work is genuinely new (CSS layout + a little client-side JS) but it grafts onto
the existing architecture without restructuring it.

---

## Architecture baseline (what the investigation established)

These facts shape every recommendation below.

1. **The interpreter emits an article *fragment*, not a full HTML document.**
   `index.js`'s compiler runs `toHast`, prepends asset nodes (`<style>`/`<link>`/
   `<script>` for fonts, KaTeX, hover-previews, DSLs), formats, and serializes.
   The output is `[…assets…, <article>…]` — there is no `<html>`/`<head>`/
   `<body>`. The consumer (the docs-site `template.html`, or a hand-written
   wrapper) supplies the document shell.

2. **The interpreter does NOT inject `default.css`.** It injects fonts/KaTeX/
   hover/DSL assets, but the structural stylesheet (`src/assets/default.css`) is
   *consumer-supplied* — the docs-site copies it to `dist/assets/` and `<link>`s
   it. This is the central fact for theme delivery (Q4).

3. **The default layout is a single centered column.** `default.css` sets
   `body { max-width: 760px; margin: … auto }`. There is no grid/flex page
   wrapper; the article *is* the body content. A sidebar therefore needs either a
   new layout container or fixed positioning (Q1).

4. **Only authored colon-id sections carry an `id`.** Verified: `<# #sec:intro |
   … #>` → `<section id="sec:intro">`, but an unnamed `<# Results #>` →
   `<section>` with **no id**. The ToC generator must assign stable ids to
   anchorless sections (Q2) or it has nothing to link to.

5. **Book chapters are clean sibling elements.** Verified on
   `document-44`: `<book-body>` holds `<book-part book-part-type="chapter">`
   siblings (plus `preface`/etc. parts), each with a `<book-part-title>`.
   Show/hide-one-at-a-time is mechanically simple (Q3).

6. **The theme variable surface is rich but has one real gap.** `default.css`
   exposes ~30 `--enscribe-*` custom properties: colors (15), typography
   (`--enscribe-font-sans`/`-mono`, four text sizes), a four-step heading scale,
   eight spacing steps + three line-heights, and `--enscribe-content-width` /
   `-content-padding`. **Gap:** the *body* font is hardcoded
   (`body { font-family: Georgia, …serif }`) — not a variable — and headings use
   `--enscribe-font-sans` directly. A sans-serif "Modern" theme can't be
   expressed by variable override alone until a `--enscribe-font-body` (and,
   cleaner, `--enscribe-font-heading`) token exists (Q5).

7. **Asset/JS injection has an established pattern.** Math/hover/DSL assets are
   injected at compile time by walking the hast and `unshift`-ing nodes;
   client-side interactivity (Tippy hover) is a `<script>` that runs either
   during normal page parse or via `browser.js`'s `executeAssets(target)` for the
   `innerHTML` path. ToC scroll-spy and chapter-nav JS should follow this exact
   pattern.

---

## Q1 — where the ToC is generated

**Recommendation: build-time (in the interpreter), with an optional client-side
enhancement.**

The interpreter already injects content and already holds the section hierarchy
(post `section-nesting`), so generating the ToC at compile time is the
consistent choice — and it is the only choice that works on the **read-only
docs pages, which ship no JavaScript**. A client-side-only ToC (option B) would
be invisible there.

Concretely, a compile-time step (a late plugin, or a function in the compiler
beside the existing asset injection) walks the section tree, **ensures every
section has an id** (assigning a slug of its title when absent — see Q2),
builds the `<nav>`, and injects it. An *optional* small client-side script can
add active-section highlighting (scroll-spy) the same way hover-previews are
injected — opt-in, not required for the ToC to function.

One subtlety to honor the "always renders" principle and output-neutrality: the
id-assignment mutation must be deterministic and stable (same input → same
slugs), and must only run when the ToC is requested, so documents without a ToC
keep byte-identical output.

## Q2 — ToC HTML structure

A nav landmark with nested lists:

```html
<nav class="enscribe-toc" aria-label="Table of contents">
  <ul>
    <li><a href="#sec:intro">Introduction</a>
      <ul><li><a href="#methods">Methods</a></li></ul>
    </li>
    <li><a href="#results">Results</a></li>
  </ul>
</nav>
```

- One `<li>` per section; nested `<ul>` for sub-sections (two levels deep —
  `section` → `sub-section`; `sub-sub-section` is optional and probably omitted
  to keep the ToC scannable).
- **Books:** the top level is chapters (`book-part-type="chapter"`), each
  nesting its sections — the same nav doubles as the chapter selector for Q3.
- `aria-label` for the landmark; the active entry gets `aria-current="location"`
  when the scroll-spy enhancement is on.
- **Id assignment:** sections without an authored id get
  `id="slug-of-title"`, de-duplicated with a numeric suffix on collision. (Colon
  ids like `sec:intro` are valid HTML ids and already used as `#`-anchors by the
  cross-reference renderer, so reuse them as-is.)

## Q3 — chapter navigation mechanism

**Recommendation: JavaScript (option B).** Chapters are `<book-part
book-part-type="chapter">` siblings, so the script shows one and hides the rest
(a `data-active` attribute or a class), wires prev/next buttons and a chapter
selector (the ToC), syncs the URL hash for deep-linking, and handles ←/→ keys. A
pure-CSS `:target` approach (option A) can't easily express prev/next or
"default to chapter 1," and degrades worse without JS.

This is a self-contained client-side script injected like the hover-preview JS;
in a full standalone book HTML it runs at parse time, and via `executeAssets`
for the `renderInto` path. It only activates for `<book>` documents with
`chapterNav` on — articles are untouched. Front/back parts (preface, colophon)
are non-chapter `book-part`s; decide whether they are their own "chapters" in the
nav or pinned (recommend: list them, typed, alongside chapters).

## Q4 — theme architecture

**Recommendation: custom-property overrides only for v0.1.0** (structural-rule
overrides are post-release). A theme is a small CSS file that re-declares
`:root` `--enscribe-*` tokens, cascaded *after* `default.css`:

```css
/* modern.css */
:root {
  --enscribe-font-body: var(--enscribe-font-sans);  /* sans body */
  --enscribe-content-width: 900px;
  --enscribe-line-height: 1.7;
}
```

**Open design decision for the themes slice (flagged, not decided here):** how
the theme CSS reaches the page. The interpreter does **not** inject `default.css`
today (fact 2). Two clean options:

- **(a) Consumer-supplied** (matches today): the consumer links
  `default.css` then the theme file. Zero interpreter change; the `theme` option
  is advisory. Simplest, and fits the docs-site (it already chooses its links).
- **(b) Interpreter-injected**: a `theme` option injects the theme's
  variable-override CSS through the existing `embedResources` inline/link
  machinery (like fonts). This implies the interpreter should probably also start
  injecting `default.css` as the base, which is a larger ownership change.

Recommend **(a) for v0.1.0** with the `theme` option recorded for forward use,
because it requires no change to the established "consumer owns the structural
stylesheet" boundary. Revisit (b) if/when standalone self-contained output needs
a theme baked in.

## Q5 — `default.css` variable inventory and the gap

Inventory (the theme surface): **color** (`--enscribe-text-primary/-secondary/
-muted`, `-link/-link-hover/-link-visited`, `-bg/-bg-subtle/-bg-code`,
`-border/-border-strong`, `-accent`, `-error`); **type**
(`--enscribe-font-sans/-mono`, `--enscribe-text-base/-sm/-xs/-code`); **heading
scale** (`--enscribe-h1..h4-size`); **spacing** (`--enscribe-line-height`,
`-line-height-heading/-tight`, `--enscribe-space-1..12`); **layout**
(`--enscribe-content-width`, `-content-padding`).

**Prerequisite additions (output-neutral) before themes can differentiate:**

- `--enscribe-font-body` — currently the body serif is hardcoded on `body`; a
  "Modern" sans theme cannot exist without this token. Default it to the current
  Georgia serif stack so existing output is unchanged.
- `--enscribe-font-heading` — headings/titles currently reference
  `--enscribe-font-sans` directly; a dedicated token lets a theme set heading and
  body fonts independently. Default it to the sans stack.
- (Nice-to-have, optional) tokens for heading `font-weight` and `border-radius`,
  which a few rules hardcode (`700`, `3–4px`). Not required for the three target
  themes.

These additions are a small, output-neutral step (proof: an empty fixture diff)
that should land at the head of the themes slice.

## Q6 — integration with the docs site

The docs-site renders with `embedResources: false`, links `default.css`, and
wraps each article in its own chrome (`site.css`: a top nav frame +
`main.article { max-width: 46rem }`). Implications:

- **The ToC sidebar is for standalone rendered documents, not the docs frame.**
  The docs-site already has site-level navigation; a second in-article sidebar
  constrained inside `main.article`'s 46rem column would fight the layout.
  **Recommend the docs-site sets `toc: false`** for v0.1.0 (it can opt the long
  Authoring Guide in later, widening that one page).
- **Themes:** the docs-site links `default.css`; a theme switcher is a
  post-release docs nicety. No conflict — themes are just an alternate linked
  stylesheet.
- **Chapter nav** never applies on the docs-site (no `<book>` pages there).

So the docs-site largely **opts out** of the new features by default; they target
the `enscribe render` / browser-library output a reader views as a standalone
document.

## Q7 — render option surface

New options on the existing options object (read in `enscribeInterpreter(options)`
and forwarded by `browser.js`):

- `toc: boolean | 'auto'` — include the ToC. Recommend default **`'auto'`**:
  on for documents with more than a small threshold of sections (and for all
  books), off for short articles. `false`/`true` force it. (`'auto'` keeps the
  short docs-site pages clean without per-page config.)
- `chapterNav: boolean` — enable chapter navigation; default **on for `<book>`
  documents**, ignored for articles.
- `theme: string` — `'default'` (current) | `'modern'` | `'compact'`. Under Q4
  option (a) this is advisory for v0.1.0; under (b) it drives injection.

These compose with `embedResources`, `dslMode`, etc., exactly as the current
options do.

## Q8 — slicing recommendation

Three independently shippable slices; the ToC is the foundation the chapter
selector reuses.

1. **Slice 1 — ToC sidebar.** The opt-in layout container (a wrapper emitted
   only when the ToC is on, so non-ToC docs stay byte-identical), section-id
   assignment for anchorless sections, build-time ToC generation + injection, the
   `toc` option, and the `default.css` layout rules (`.enscribe-layout` grid +
   `.enscribe-toc`, collapsing to a disclosure menu under a breakpoint). Serves
   articles and books. *Most useful; establishes the layout.*
2. **Slice 2 — additional themes.** First the output-neutral variable additions
   (`--enscribe-font-body`, `--enscribe-font-heading`; Q5), then `modern.css` and
   `compact.css` as variable-override files, the `theme` option, and the Q4
   delivery decision. *CSS-only, lowest risk.*
3. **Slice 3 — chapter navigation.** The `chapterNav` option, the show/hide JS
   over `book-part-type="chapter"` siblings, prev/next + keyboard + hash
   deep-linking, reusing the Slice-1 ToC as the chapter selector. *Book-specific;
   builds on Slice 1.*

**Ordering note:** Slice 1 first (per the prompt — the foundation and the most
universal feature). If a lowest-risk first win is preferred, Slice 2 (themes) can
swap to first, since it touches only CSS and the variable surface and depends on
neither of the others. Slice 3 must follow Slice 1.

Each slice changes visible output, so each needs the visual-verification step
(render fixtures, eyeball in a browser), and each carries the *output-adding*
correctness model (the diff shows exactly the intended new output; non-target
documents — and, for the ToC layout wrapper, every non-ToC document — stay
byte-identical).

---

## Stop-condition assessment

Both discipline stop-conditions were checked and **neither fires**:

- *"CSS can't support a sidebar without restructuring every document."* Avoided:
  the layout container is emitted **only when the ToC is requested**, so the
  single-column `body` baseline is untouched for every existing document. The
  ToC is opt-in (`toc: 'auto'`/`false`), and the docs-site opts out by default.
- *"The book renderer doesn't cleanly separate chapters."* False: chapters are
  `<book-part book-part-type="chapter">` siblings under `<book-body>` (verified),
  which is exactly the structure a show/hide selector wants.

## Out of scope (confirmed not addressed here)

No implementation; the pandoc bridge; npm publish; Phases 7/9/10/11/12. Within
Phase 8, the *post-release* display work (render-mode lowering, multi-column,
margin sidenotes, pagination) is also out of this Phase 0 — these findings cover
only the three release-blocking features.
