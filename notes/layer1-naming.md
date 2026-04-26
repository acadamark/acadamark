# Layer 1 Naming Conventions

This document records the conventions for naming Layer 1 (semantic HTML) elements in acadamark. These decisions are load-bearing for every plugin downstream — change them only with deliberate intent.

## Four rules

### Rule 1: Container-role naming

Custom elements follow the pattern `<container-role>`, where `container` is the parent the element belongs in, and `role` is what it does there.

Examples:
- `<article-title>` — title of an article
- `<article-subtitle>` — subtitle of an article
- `<section-title>` — title of a section
- `<sub-section-title>` — title of a sub-section
- `<figure-caption>` — caption of a figure (alias for HTML's `<figcaption>`)

This rule:
- Makes element names self-documenting (no glossary required).
- Encodes the parent–child relationship in the name itself, so misuse is visible.
- Keeps the namespace organized — every element clearly belongs to a family.
- Satisfies W3C's custom-element rule (must contain a hyphen).

### Rule 2: Defer to HTML where HTML is sufficient

If standard HTML already provides an element that does the job, acadamark uses it. Custom elements are added only where HTML genuinely lacks vocabulary.

Stays HTML:
- `<section>`, `<article>`, `<figure>`, `<header>`, `<footer>`, `<aside>`, `<nav>`
- `<figcaption>` (though `<figure-caption>` is allowed as an alias for naming consistency)
- `<table>`, `<caption>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>`
- `<ul>`, `<ol>`, `<li>`, `<dl>`, `<dt>`, `<dd>`
- `<a>`, `<img>`, `<code>`, `<pre>`, `<blockquote>`, `<em>`, `<strong>`

Custom elements added:
- Title and subtitle vocabulary (`<article-title>`, `<section-title>`, etc.) — HTML has no first-class concept of these.
- Section depth ladder (`<sub-section>`, `<sub-sub-section>`) — HTML's `<section>` is recursive, but acadamark uses named depth (see Rule 3 below).
- Academic constructs (`<theorem>`, `<proof>`, `<lemma>`, `<corollary>`) — to be specified.
- Citation and cross-reference vocabulary (`<cite>` already exists in HTML but with weak semantics; acadamark uses it with `data-*` attributes; `<ref>` for cross-references is custom).

### Rule 3: Named section depth ladder

Section depth is named, not derived from heading levels or DOM nesting.

The ladder:

| Element             | Depth | LaTeX equivalent       |
|---------------------|-------|------------------------|
| `<section>`         | 1     | `\section`             |
| `<sub-section>`     | 2     | `\subsection`          |
| `<sub-sub-section>` | 3     | `\subsubsection`       |

If depth 4+ is ever needed, extend the ladder with `<sub-sub-sub-section>` rather than introducing a different mechanism.

The corresponding title elements follow the container-role rule:

| Title element              | Lives inside        |
|----------------------------|---------------------|
| `<article-title>`          | `<article>`         |
| `<article-subtitle>`       | `<article>`         |
| `<section-title>`          | `<section>`         |
| `<section-subtitle>`       | `<section>`         |
| `<sub-section-title>`      | `<sub-section>`     |
| `<sub-sub-section-title>`  | `<sub-sub-section>` |

### Rule 4: Consult JATS before adding new vocabulary

When extending Layer 1 with a new element, the JATS tag library ([jats.nlm.nih.gov/archiving/tag-library/](https://jats.nlm.nih.gov/archiving/tag-library/)) is the first reference. JATS has spent two decades refining a vocabulary for academic content; acadamark inherits that thinking rather than reinventing it.

The rule is binding, not advisory. Before specifying a new Layer 1 element:

1. Find the corresponding JATS element (or determine that no JATS equivalent exists).
2. Adopt JATS naming where it makes sense, adjusted for HTML conventions and the container-role rule (Rule 1). For instance, JATS's `<article-title>` becomes acadamark's `<article-title>` directly. JATS's `<sec><title>` pattern becomes acadamark's `<section-title>` (because acadamark uses named depth, not nested `<sec>` with `<title>`).
3. Adopt JATS attribute conventions where they're sensible. For example, JATS uses `<xref ref-type="bibr">` for citations and `<xref ref-type="fig">` for figure references. Acadamark may use `<ref>` (for brevity) but could carry the same `ref-type` attribute, or use `data-ref-type`, depending on what the interpreter needs.
4. Document any deliberate divergences in the spec for that element, with rationale.

This rule means that as the Layer 1 vocabulary grows, it stays close to JATS-translatable rather than drifting into a parallel naming universe. Acadamark's planned JATS export plugin (see `BUILD.md`) becomes a mostly-mechanical transform rather than a deep restructuring.

JATS also includes elements acadamark may not need (`<related-article>`, `<funding-source>`, `<contrib-group>` with full nesting, etc.). Don't add them speculatively. Add elements when authors actually need them.

## Two compilation targets

Acadamark Layer 1 is the canonical, archival representation: custom-element-rich, semantically explicit, lossless. But Layer 1 is not the only useful output — for browser display without custom CSS, a *render-mode* lowering is also useful.

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

**Render mode** (an optional downstream plugin, not yet built) lowers title elements to standard heading tags so browsers display them with default styling:

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

Render mode is lossy — once `<section-title>` becomes `<h1>`, the semantic role is no longer recoverable from the output alone. Render mode is for display, semantic mode is for everything else (archival, conversion, downstream tooling).

The mapping is straightforward:

| Layer 1 element             | Render mode lowering |
|-----------------------------|----------------------|
| `<article-title>`           | `<h1>` (top-level)   |
| `<article-subtitle>`        | `<p class="subtitle">` or `<h2 class="subtitle">` |
| `<section-title>`           | `<h1>` if article-title is also present, else `<h1>` |
| `<sub-section-title>`       | `<h2>`               |
| `<sub-sub-section-title>`   | `<h3>`               |

(The exact mapping for `<article-title>` vs `<section-title>` when both are present needs more thought — possibly `<article-title>` becomes `<h1>` and `<section-title>` becomes `<h2>`, shifting everything down by one. Defer to render-mode plugin design.)

## Coexistence with raw HTML

Authors can use raw HTML wherever they want — `<h1>`, `<h2>`, hand-nested `<section>`, `<div>` with classes, anything. Acadamark does not lock authors out of HTML's existing vocabulary.

However, acadamark plugins only operate on Layer 1 named elements. The section-nesting plugin nests `<section>`, `<sub-section>`, `<sub-sub-section>` based on the depth ladder; it does not look at heading levels inside plain `<section>` elements. If you write raw HTML with hand-nested sections, you're responsible for the nesting yourself.

This keeps the rules simple. Acadamark plugins have one job each, with predictable inputs.

## Open decisions

These are flagged here so they don't get re-litigated implicitly later:

- **Render-mode mapping for `<article-title>` + `<section-title>`.** When both are present, do section titles become `<h2>` (because article title takes `<h1>`)? Or do they stay `<h1>` and rely on document structure? Decide when building the render-mode plugin.

- **`<header>` block usage.** When `<article-title>` and `<article-subtitle>` are both present, are they wrapped in `<header>`? Probably yes (matches HTML5 convention), but the shorthand layer needs to either generate the wrapper automatically or expose a `<header | ...>` form.

- **Markdown-input section wrapping.** Plain markdown input (`# Heading`) produces a flat sequence of `<h1>`, `<p>`, `<h2>` etc. with no `<section>` wrappers. If markdown documents should participate in acadamark's section-nesting, a separate plugin (or borrowing `rehype-section`) needs to wrap heading-delimited regions into `<section>` elements first. Or declare that markdown-only input doesn't get section treatment. Decide when building the full pipeline.

- **Theorem-family elements.** `<theorem>`, `<proof>`, `<lemma>`, `<corollary>`, `<definition>`, `<example>` — to be specified. Likely follow the container-role rule for any internal parts (e.g., `<theorem-statement>`, `<theorem-proof>`).

- **Citation and reference vocabulary.** The Layer 1 representation of citations, bibliography entries, and cross-references — to be specified before the citation plugin is built.

- **JATS mapping divergences.** As the Layer 1 vocabulary grows, some elements will deliberately diverge from JATS for good reasons (HTML vs. XML conventions, simpler nesting, different attribute semantics). Each divergence should be documented in the spec for that element. A consolidated "acadamark ↔ JATS mapping table" should appear in the Layer 1 spec once it's mature, both as documentation and as the basis for the JATS export plugin.

## Why this matters

These conventions are the spine of acadamark's contribution. Markdown extensions accrete idioms because they don't have a unifying naming scheme — every feature gets its own special-case syntax. By committing to container-role naming, defer-to-HTML, named depth, and JATS-aligned vocabulary, acadamark keeps its vocabulary growing in a single coherent direction *and* maintains an exit ramp to the established scholarly publishing ecosystem.

When in doubt, two questions to ask:

1. "What container does this belong in, and what role does it play there?" (Container-role rule.)
2. "What does JATS call this, and why?" (JATS-first rule.)

The answers usually converge on a good name.
