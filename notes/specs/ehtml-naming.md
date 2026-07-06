# eHTML Naming Conventions

This document records the conventions for naming Enscribe HTML (eHTML) elements in enscribe. eHTML is the project's primary rich-document HTML vocabulary — a semantically explicit, archival representation that is useful in its own right, not merely a display target for any one interchange schema. These decisions are load-bearing for every plugin downstream — change them only with deliberate intent.

## Four rules

### Rule 1: Container-role naming

Custom elements follow the pattern `<container-role>`, where `container` is the parent the element belongs in, and `role` is what it does there.

Examples:
- `<article-title>` — title of an article
- `<article-subtitle>` — subtitle of an article
- `<section-title>` — title of a section
- `<sub-section-title>` — title of a sub-section

This rule:
- Makes element names self-documenting (no glossary required).
- Encodes the parent–child relationship in the name itself, so misuse is visible.
- Keeps the namespace organized — every element clearly belongs to a family.
- Satisfies W3C's custom-element rule (must contain a hyphen).

### Rule 2: Defer to HTML where HTML is sufficient

If standard HTML already provides an element that does the job, enscribe uses it. Custom elements are added only where HTML genuinely lacks vocabulary.

Stays HTML:
- `<section>`, `<article>`, `<figure>`, `<header>`, `<footer>`, `<aside>`, `<nav>`
- `<figcaption>`
- `<table>`, `<caption>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>`
- `<ul>`, `<ol>`, `<li>`, `<dl>`, `<dt>`, `<dd>`
- `<a>`, `<img>`, `<code>`, `<pre>`, `<blockquote>`, `<em>`, `<strong>`

Custom elements added:
- Title and subtitle vocabulary (`<article-title>`, `<section-title>`, etc.) — HTML has no first-class concept of these.
- Section depth ladder (`<sub-section>`, `<sub-sub-section>`) — HTML's `<section>` is recursive, but enscribe uses named depth (see Rule 3 below).
- Academic constructs (`<theorem>`, `<proof>`, `<lemma>`, `<corollary>`) — reserved eHTML names whose per-element specs are open work in the roadmap.
- Citation and cross-reference vocabulary (`<cite>` already exists in HTML but with weak semantics; enscribe uses it with `data-*` attributes; `<ref>` for cross-references is custom).

### Rule 3: Named section depth ladder

Section depth is named, not derived from heading levels or DOM nesting.

The ladder:

| Element             | Depth | LaTeX equivalent       |
|---------------------|-------|------------------------|
| `<section>`         | 1     | `\section`             |
| `<sub-section>`     | 2     | `\subsection`          |
| `<sub-sub-section>` | 3     | `\subsubsection`       |

If depth 4+ is ever needed *as a named section level*, the ladder extends with `<sub-sub-sub-section>` rather than introducing a different mechanism — future work, not built.

**The `<h4>`–`<h6>` exception (built behavior).** Markdown heading *input* deeper than the three named levels does not silently map to a named section. A markdown heading of depth 4–6 (`#### …` through `###### …`) passes through as a **literal HTML `<h4>`–`<h6>` element**, with an informative diagnostic (`heading depth N exceeds eHTML's three section levels; passed through as <hN>`, source `normalize-to-canonical:heading-depth-out-of-range`). The heading's inline children are preserved (emphasis / code inside an `<h4>` still render). This is a named, narrow exception to eHTML's otherwise-closed vocabulary — see DESIGN.md §"The `<h4>`–`<h6>` exception". It concerns only markdown `#`-heading input; authored `<section>` / `<sub-section>` / `<sub-sub-section>` long-form tags are unaffected.

The corresponding title elements follow the container-role rule:

| Title element              | Lives inside        |
|----------------------------|---------------------|
| `<article-title>`          | `<article>`         |
| `<article-subtitle>`       | `<article>`         |
| `<section-title>`          | `<section>`         |
| `<section-subtitle>`       | `<section>`         |
| `<sub-section-title>`      | `<sub-section>`     |
| `<sub-section-subtitle>`   | `<sub-section>`     |
| `<sub-sub-section-title>`  | `<sub-sub-section>` |
| `<sub-sub-section-subtitle>` | `<sub-sub-section>` |

### Rule 4: Consult the reference mirrors before adding new vocabulary

When extending eHTML with a new element, consult the **reference mirrors** — the established academic-document models: JATS, TEI, RASH, and Scholarly-HTML (W3C). Each is a decades-refined inventory of what academic content needs; enscribe stays close to what they can express rather than reinventing a parallel naming universe. **No single model is privileged.** JATS's [Tag Library](https://jats.nlm.nih.gov/archiving/tag-library/) is the most-developed single reference, so it is the natural *worked example* of how to consult a mirror; TEI's Guidelines, the RASH schema, and the Scholarly-HTML model are references of the same kind — published guidelines/models for the same concepts — and carry equal weight.

The rule is binding, not advisory. Before specifying a new eHTML element:

1. Find the corresponding element in the reference mirrors (or determine that none of them names the concept). JATS's Tag Library is the most-developed place to look; TEI's Guidelines and the RASH / Scholarly-HTML models cover the same ground and are consulted alongside it.
2. Adopt the naming the mirrors converge on where it makes sense, adjusted for HTML conventions and the container-role rule (Rule 1). For instance, JATS's `<article-title>` becomes enscribe's `<article-title>` directly; JATS's `<sec><title>` pattern becomes enscribe's `<section-title>` (because enscribe uses named depth, not nested `<sec>` with `<title>`). Where the mirrors disagree, prefer a name that stays expressible across them.
3. Adopt sensible attribute conventions from the mirrors. For example, JATS uses `<xref ref-type="bibr">` for citations and `<xref ref-type="fig">` for figure references; enscribe may use `<ref>` (for brevity) but could carry the same `ref-type` attribute, or use `data-ref-type`, depending on what the interpreter needs.
4. Document any deliberate divergences in the spec for that element, with rationale.

This rule means that as the eHTML vocabulary grows, it stays close to what the established academic-document models can express rather than drifting into a parallel naming universe — which keeps the exit ramps to those formats tractable. Concretely today, that exit ramp is the shipped `enscribeToJats` export, the one built exporter: staying mirror-aligned keeps it a mostly-mechanical transform rather than a deep restructuring. That JATS is the exporter that exists is a fact about the machinery, not a privileging of JATS in the vocabulary; the other mirrors are prospective export targets on the same footing.

The mirrors also include elements enscribe may not need (JATS's `<related-article>`, `<funding-source>`, `<contrib-group>` with full nesting; TEI's deep editorial apparatus; and so on). Don't add them speculatively. Add elements when authors actually need them.

## Two compilation targets

Enscribe eHTML is the canonical, archival representation: custom-element-rich, semantically explicit, lossless. It is not the only useful output — a downstream **render-mode** lowering produces plain HTML (`<section-title>` → `<h1>`, and so on) for browser display without enscribe's CSS. Render mode is lossy and for display only; semantic mode is for everything else (archival, conversion, downstream tooling). This canonical-vs-render distinction is what lets the eHTML names stay semantically explicit instead of collapsing to presentational HTML.

The render-mode lowering design — the mapping tables and the open title/heading decisions — is a future, unbuilt feature ([#40](https://github.com/enscribejs/enscribe/issues/40)) specified in [`render-mode.md`](render-mode.md).

## Coexistence with raw HTML

Authors can use raw HTML wherever they want — `<h1>`, `<h2>`, hand-nested `<section>`, `<div>` with classes, anything. Enscribe does not lock authors out of HTML's existing vocabulary.

However, enscribe plugins only operate on eHTML named elements. The section-nesting plugin nests `<section>`, `<sub-section>`, `<sub-sub-section>` based on the depth ladder; it does not look at heading levels inside plain `<section>` elements. If you write raw HTML with hand-nested sections, you're responsible for the nesting yourself.

This keeps the rules simple. Enscribe plugins have one job each, with predictable inputs.

## Open decisions

These are flagged here so they don't get re-litigated implicitly later:

- **Render-mode mapping for `<article-title>` + `<section-title>` (the title/section collision), and the `<article-subtitle>` lowering alternatives** — **re-homed to [#40](https://github.com/enscribejs/enscribe/issues/40) (render-mode lowering).** Whether `<section-title>` becomes `<h2>` when `<article-title>` takes `<h1>` (or stays `<h1>` and relies on structure), and whether `<article-subtitle>` lowers to `<p class="subtitle">` or `<h2 class="subtitle">`, are render-mode decisions that can't be made deterministically until the render-mode machinery exists. Their design now lives in [`render-mode.md`](render-mode.md) (the build is tracked by #40), not here — this spec acknowledges the deferral rather than dropping it.

- **`<header>` block usage — resolved (#74): no separate `<header>` wrapper.** The title-block grouping already exists canonically as the `<article-front>` element — rendered as `<article-front>` in HTML and mapped to JATS `<front>`. A separate `<header>` would be *less* semantically specific than `<article-front>`, and, nested inside `<article>`, would not even carry the `banner` landmark role (which applies only to a top-level `<header>`). So `<article-front>` **is** the title-block grouping; enscribe adds no `<header>` wrapper. This keeps the front-matter grouping a single semantically-explicit custom element, per DESIGN.md §534's intentional model (eHTML elements are emitted as raw custom elements). The earlier "wrap the title block in `<header>`?" question is therefore answered **no**.

- **Markdown-input section wrapping.** Plain markdown input (`# Heading`) produces a flat sequence of `<h1>`, `<p>`, `<h2>` etc. with no `<section>` wrappers. If markdown documents should participate in enscribe's section-nesting, a separate plugin (or borrowing `rehype-section`) needs to wrap heading-delimited regions into `<section>` elements first. Or declare that markdown-only input doesn't get section treatment. Decide when building the full pipeline.

- **Theorem-family elements.** `<theorem>`, `<lemma>`, `<corollary>`, `<proposition>`, `<definition>`, `<example>`, `<remark>`, `<proof>` — the standard LaTeX amsthm set plus `<proof>`. Per-element vocabulary specs landed in an earlier change. **Settled against LaTeX amsthm and JATS prior art: no internal element parts** — content is body content (paragraphs and inline) placed directly inside the theorem container, not wrapped in `<theorem-statement>` / `<theorem-proof>` sub-elements. JATS's `<statement content-type="theorem">` is the all-eight counterpart and likewise contains body content directly (plus `<label>` / `<title>` constructed at export). **This "no internal parts" rule governs *archival vocabulary structure*, not render output.** The rendered HTML prepends a generated `<theorem-label>` (e.g. "Theorem 1.") — a **derived-display artifact** (the render's counterpart to the JATS `<label>` "constructed at export"), emitted as a semantic custom element rather than a classed span (the span→custom-element conversion). It is not an authored/archival internal part: JATS still derives its `<label>` from the node's computed number, never from this element, so the rule holds. The earlier speculative "internal parts likely follow the container-role rule" claim is therefore retracted: theorem-family elements are an exception to that rule, because LaTeX and JATS both put content directly inside the container with no internal-part wrappers and enscribe follows. `<proof>` is a peer sibling of theorem-like statements (not nested inside them), matching both LaTeX (`\begin{proof}` is independent) and JATS (`<statement content-type="proof">` is a peer statement).

- **JATS mapping divergences.** As the eHTML vocabulary grows, some elements will deliberately diverge from JATS for good reasons (HTML vs. XML conventions, simpler nesting, different attribute semantics). Each divergence should be documented in the spec for that element. Consolidated interchange-mapping tables (JATS, and alongside it TEI, EPUB, and Scholarly HTML) should appear in the eHTML spec once it's mature, both as documentation and as the basis for the corresponding export plugins. JATS is the most mature scholarly-interchange schema and the best-developed export target today, but it sits on equal footing with the others rather than being privileged above them.

## Why this matters

These conventions are the spine of enscribe's contribution. Markdown extensions accrete idioms because they don't have a unifying naming scheme — every feature gets its own special-case syntax. By committing to container-role naming, defer-to-HTML, named depth, and a **mirror-aligned vocabulary** (close to what JATS, TEI, RASH, and Scholarly-HTML can express, with no single model privileged), enscribe keeps its vocabulary growing in a single coherent direction *and* maintains exit ramps to the established scholarly publishing ecosystem.

When in doubt, two questions to ask:

1. "What container does this belong in, and what role does it play there?" (Container-role rule.)
2. "What do the reference models (JATS, TEI, RASH, Scholarly-HTML) call this, and why?" (Mirror-consultation rule.)

The answers usually converge on a good name.
