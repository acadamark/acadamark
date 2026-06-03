# Render-mode lowering

Render mode is an optional, downstream lowering of canonical Layer 1 to
plain HTML — `<section-title>` → `<h1>`, `<article-front>` → `<header>`,
and so on — producing output that displays in a browser without
enscribe's stylesheet. It is the third rung of the display ladder
(`DESIGN.md`, the display-ladder section; `render-quality.md` §0.2).

**This feature is designed, not built.** This document is the single
home for the render-mode lowering *design*; whether it is built is a
STATUS question, and the open work is tracked in
[GitHub issue #40](https://github.com/enscribejs/enscribe/issues/40)
(milestone in `ROADMAP.md`). Nothing here is emitted by the current
pipeline. This spec gathers design that previously lived scattered
across `article.md`, `book.md`, `layer1-naming.md`, and an issue
comment; it relocates that design unchanged — it does not extend it.
The two genuinely-open decisions (§"Open decisions") are recorded here
but **settled only when the render-mode machinery is built**, under #40.

---

## Two compilation targets

Enscribe Layer 1 is the canonical, archival representation:
custom-element-rich, semantically explicit, lossless. But Layer 1 is not
the only useful output — for browser display without custom CSS, a
*render-mode* lowering is also useful.

**Semantic mode** (the default) preserves Layer 1 elements:

```html
<section>
  <section-title>Introduction</section-title>
  <p>...</p>
  <sub-section>
    <sub-section-title>Background</sub-section-title>
    <p>...</p>
  </sub-section>
</section>
```

**Render mode** is an optional downstream plugin that lowers title
elements to standard heading tags so browsers display them with default
styling:

```html
<section>
  <h1>Introduction</h1>
  <p>...</p>
  <sub-section>
    <h2>Background</h2>
    <p>...</p>
  </sub-section>
</section>
```

Render mode is lossy — once `<section-title>` becomes `<h1>`, the
semantic role is no longer recoverable from the output alone. Render mode
is for display; semantic mode is for everything else (archival,
conversion, downstream tooling).

---

## Lowering tables

The lowering preserves semantic structure where HTML supports it and
removes wrappers where they don't add value at the rendering layer.

### Article structure

| Layer 1 element | Render-mode lowering |
|----------------|----------------------|
| `<article>` | `<article>` (unchanged) |
| `<article-front>` | `<header>` |
| `<article-body>` | (transparent — children rendered directly) |
| `<article-back>` | `<footer>` |
| `<article-title>` | `<h1>` |
| `<article-subtitle>` | `<p class="subtitle">` (see §"Open decisions") |

### Book structure

| Layer 1 element | Render-mode lowering |
|----------------|----------------------|
| `<book>` | `<article>` |
| `<book-front>` | `<header>` |
| `<book-body>` | (transparent) |
| `<book-back>` | `<footer>` |
| `<book-part>` | `<section class="<type>">` |
| `<book-title>` | `<h1>` |
| `<book-part-title>` | heading element appropriate to depth |

### Title and section hierarchy

| Layer 1 element | Render-mode lowering |
|-----------------------------|----------------------|
| `<article-title>` | `<h1>` (top-level) |
| `<article-subtitle>` | `<p class="subtitle">` or `<h2 class="subtitle">` (see §"Open decisions") |
| `<section-title>` | `<h1>` or `<h2>` (see §"Open decisions" — the collision rule) |
| `<sub-section-title>` | `<h2>` (or `<h3>` if the ladder shifts down) |
| `<sub-sub-section-title>` | `<h3>` (or `<h4>` if the ladder shifts down) |

---

## Open decisions

These two title/heading decisions cannot be settled until the render-mode
machinery exists; they are tracked under #40. The lowering must be
**deterministic** — the render-mode plugin needs one rule, not "more
thought." Recorded here as relocated from the #40 comment; not decided in
this spec.

**1. `<article-title>` + `<section-title>` collision.** When a document
has both an article title and section titles, render-mode lowering must
avoid two competing `<h1>`s. Options:

- `<article-title>` → `<h1>`, and `<section-title>` → `<h2>` (shift the
  whole section ladder down one: `<sub-section-title>` → `<h3>`,
  `<sub-sub-section-title>` → `<h4>`); or
- section titles stay at their natural level and rely on document
  structure / sectioning roots for the outline.

**2. `<article-subtitle>` lowering.** `<article-subtitle>` →
`<p class="subtitle">` or `<h2 class="subtitle">`? The choice interacts
with (1): if `<article-title>` takes `<h1>` and `<section-title>` takes
`<h2>`, a subtitle `<h2 class="subtitle">` would collide with section
titles, arguing for `<p class="subtitle">`.

---

## Cross-references

- `DESIGN.md` — the display ladder (targets 1/2/3); render mode is
  target 3.
- `notes/specs/render-quality.md` §0.2 — render mode is explicitly out
  of scope for the current render-quality predicates (it "gets its own
  predicates when it lands").
- `notes/specs/layer1-naming.md` — the canonical-vs-render-mode
  rationale for Layer 1 naming (semantic mode is canonical; render mode
  is the downstream display target).
- Element docs `article.md` / `book.md` point here for their
  render-mode lowering.
- [GitHub issue #40](https://github.com/enscribejs/enscribe/issues/40) —
  the build work.
