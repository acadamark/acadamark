# Theme Investigation (Slice 7)

## What exists now

`render-fixtures.js` embeds minimal `SHELL_CSS` directly in the HTML wrapper. No
`default.css` file exists yet. The interpreter injects only KaTeX CSS and
hover-preview CSS; the shell wrapper provides display rules.

## Confirmed element inventory

### Article structure
- `<article>`, `<article-front>`, `<article-body>`, `<article-back>`
- `<article-title>`, `<article-subtitle>`
- `<meta data-document-type="article">` — the front-matter container; wraps
  title/subtitle/author elements. Needs `display: contents` or `display: block`.
- `<author>` — individual author name. **No `<article-authors>` wrapper element.**
  Design tokens mention `article-authors` but this element does not appear in
  output. Actual element is `<author>` (one per author).

### Section hierarchy
- `<section>`, `<section-title>`
- `<sub-section>`, `<sub-section-title>` (not `sub-section > section-title`)
- `<sub-sub-section>`, `<sub-sub-section-title>`

### Content
- `<p>`, `<em>`, `<strong>`, `<blockquote>`, `<hr>`, `<ul>`, `<ol>`, `<li>`
- `<code>`, `<pre>`, `<code-block>` (enscribe sigil code block)
- `<figure>`, `<figcaption>`, `<img>`
- `<display-math>`, `<inline-math>` (KaTeX content inside)
- `<table>`, `<thead>`, `<tbody>`, `<caption>`, `<th>`, `<td>`

### Citations
- `<cite class="cite">` — resolved citation marker
- `<cite class="cite-error">` — unresolved key error
- `<bibliography>` — container with `<h2>References</h2>` then `.csl-bib-body`
- `.csl-bib-body` → `.csl-entry` divs (not a list)

### Notes
- `<note-list class="notes">` containing `<ol>`
- `<li id="note-N">` with `<sup>N</sup>` prefix and `.note-backref` link
- `<sup data-note-id="N">` — inline note marker in body text
- `.note-backref` — `↩` link at end of each note

### Cross-references
- `<a class="ref">` — resolved cross-reference link
- `<a class="ref-error">` — unresolved reference
- `.equation-number`, `.figure-label`, `.table-label` — label spans in captions

## Design token adjustments needed

- Replace `article-authors` → `author` in the CSS rules.
- Add `meta[data-document-type]` rule (display: block).
- Add `sub-section-title` and `sub-sub-section-title` rules (separate elements,
  not descendant selectors).
- Note: bibliography uses `<h2>` for heading — CSS can target `bibliography h2`.
- `note-list::before` pseudo-element conflicts with rendered `<ol>` content in
  some browsers if not paired with `display: block`. Use class `.notes` selector
  or bare `note-list` element. The "Notes" heading should come from `::before`
  (already in the spec) or be suppressed if there's a heading element.
  Decision: keep `note-list::before` for simplicity.

## hover-preview.css conflicts

`hover-preview.css` sets:
- `.sidenote-fallback { font-style: italic; }`
- `note-list ol { list-style: none; padding-left: 0; margin: 0; }`
- `note-list li { margin-bottom: 0.5em; }`
- `.tippy-box table`, `.tippy-box figure`, `.tippy-content` — all scoped to
  `.tippy-box`, no conflict with document styles.

Conflict risk: `note-list ol` in hover-preview.css and in theme CSS both target
the same element. The theme resets padding-left via its own rule. hover-preview
sets `padding-left: 0`. Since hover-preview.css is injected first (browser reads
in order), the theme can safely override with `padding-left: var(--enscribe-space-6)`
if desired, or the two can agree on `0` with a `text-indent` counter.

Resolution: Both agree on `list-style: none; padding-left: 0`. Use `text-indent`
/ `padding-left` on `li` for hanging indent.

## render-fixtures.js approach

The shell in `render-fixtures.js` wraps each fixture in a `<style>` block.
Plan: replace inline SHELL_CSS with a `<link rel="stylesheet">` pointing to the
new `default.css` file (copying it alongside each HTML, or referencing relative
path). Simplest: copy `default.css` to `test/fixtures/` on render, then use
`<link href="default.css">`. This keeps fixtures self-contained for browser
viewing.

Alternative: keep SHELL_CSS as the theme content but replace its body with the
new design token CSS. This avoids a file-copy step and keeps fixtures portable
(single HTML file). **Prefer this approach** — one less moving part, no file
management, same visual result.
