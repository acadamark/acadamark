# Hover-preview extension: Phase 0 investigation

Slice: hover preview on cross-reference links (`a.ref`).
Date: 2026-05-13.

---

## Q1: What does the current hover-preview.js look like?

`src/assets/hover-preview.js` is an IIFE using ES5-style `var` throughout.
The init function queries `sup[data-note-id]` elements, then for each one:
- reads `data-note-id` attribute to find the target note id
- calls `document.getElementById(noteId)` to get the `<li>` from the note-list
- calls `getNoteContent(noteEl)` which: clones the element, removes `<sup>` and `.note-backref`, returns `clone.innerHTML.trim()`
- calls `tippy(marker, { content, allowHTML: true, interactive: true, placement: 'top', theme: 'light-border', maxWidth: 400, appendTo: document.body })`

`interactive: true` for notes allows the pointer to move into the tooltip without it disappearing.

The IIFE runs `init()` immediately or on `DOMContentLoaded`.

---

## Q2: Actual rendered structures

From `document-6-cross-references.html`:

### Display-math (numbered, labeled)
```html
<display-math id="eqn:newton">
  <span class="katex-display">...(KaTeX HTML)...</span>
  <span class="equation-number">(1)</span>
</display-math>
```
The `.equation-number` span is a direct child of `display-math`, after the `katex-display` span.

### Display-math (unnumbered labeled — no equation-number span)
```html
<display-math id="eqn:energy">
  <span class="katex-display">...(KaTeX HTML)...</span>
</display-math>
```
No `.equation-number` span present.

### Figure (numbered, labeled)
```html
<figure id="fig:elephant">
  <img src="assets/elephant.jpg" alt="An African elephant photographed in Tanzania.">
  <figcaption>
    <span class="figure-label">Figure 1.</span>
    An African elephant photographed in Tanzania.
  </figcaption>
</figure>
```

### Figure (unnumbered labeled — no figure-label span)
```html
<figure id="fig:lion">
  <img src="assets/elephant.jpg" alt="Another elephant...">
  <figcaption>Another elephant...</figcaption>
</figure>
```

### Note list item
```html
<li id="note:galton">
  <sup>1</sup>
  Galton coined the term "regression" in 1886...
  <a href="#noteref-1" class="note-backref" aria-label="back to text">↩</a>
</li>
```

### Ref links (resolved and error)
```html
<a href="#eqn:newton" class="ref">Eq. 1</a>
<a href="#fig:elephant" class="ref">figure 1</a>
<a href="#note:galton" class="ref">note 1</a>
<a href="#eqn:nonexistent" class="ref-error">??ref: eqn:nonexistent??</a>
```

---

## Q3: Does `a.ref[href^="#"]` exclude `a.ref-error`?

Yes. Confirmed by reading the rendered HTML:
- Resolved refs: `class="ref"` (single class)
- Error refs: `class="ref-error"` (single class, different value)

The selector `a.ref[href^="#"]` requires the element to have the class `ref`. Elements with class `ref-error` do not have class `ref`, so they are excluded. **No `.ref-error` elements will get tooltips.**

---

## Q4: Will KaTeX render correctly inside a Tippy tooltip?

KaTeX produces rendered HTML that depends on CSS class selectors (`.katex`, `.katex-display`, etc.). That CSS is bundled into the page. Tippy appends tooltips to `document.body` by default (and we set `appendTo: document.body` explicitly). Since the KaTeX CSS is already scoped by class names in the page stylesheet — not by DOM ancestry — cloning the KaTeX HTML into a tooltip div works correctly. **No special handling required.**

---

## Q5: Figure preview content shape

Show image + caption (option a). The `<figure>` clone contains both. The `.figure-label` span ("Figure N.") is removed since the link text already says "figure 1" — redundant in a tooltip.

After removing `.figure-label`, the `figcaption` starts with a space then the caption text. Trimming the figcaption text is not strictly necessary; the CSS handles visual spacing.

Content is `clone.outerHTML` (the full `<figure>` element). The tooltip CSS constrains image width via `max-width: 100%`.

Note: `<img src="assets/elephant.jpg">` uses a relative URL. This will resolve relative to the document's location. When the HTML file is served from the same directory, this works correctly.

---

## Q6: Tooltip sizes

- **Note tooltips:** `maxWidth: 400`. Unchanged from slice 3.
- **Equation tooltips:** `maxWidth: 500`. Equations can be wider than notes; extra room reduces overflow risk.
- **Figure tooltips:** `maxWidth: 420`. Slightly wider than notes to give images space. Image is constrained within by CSS (`max-width: 100%`).

Tippy default `maxWidth` is 350. We set it explicitly for all three types.

---

## Implementation plan

### hover-preview.js changes

Inside the existing IIFE, add after `getNoteContent`:

1. `getEquationContent(el)` — clones `display-math`, removes `.equation-number`, returns `clone.innerHTML.trim()`
2. `getFigureContent(el)` — clones `figure`, removes `.figure-label`, returns `clone.outerHTML`
3. `getRefTargetContent(targetEl)` — dispatches by `tagName.toLowerCase()`: `display-math` → equation, `figure` → figure, `li` → note (reuses `getNoteContent`), else outerHTML fallback
4. `attachNoteTooltip(marker)` — extracted from current `init` body; same Tippy options
5. `attachRefTooltip(linkEl)` — gets href, looks up element, dispatches content extractor, calls tippy with appropriate maxWidth; `interactive: false` (refs don't need pointer-into-tooltip)
6. Refactored `init` — calls both querySelectorAll loops

### hover-preview.css changes

Add figure-specific styles inside the existing IIFE-bundled CSS:

```css
.tippy-box figure { margin: 0; }
.tippy-box figure img { max-width: 100%; height: auto; display: block; }
.tippy-box figure figcaption { font-size: 0.9em; margin-top: 0.5em; color: #555; }
```

### document-6 changes

No changes needed. Existing content already has refs to equation (`eqn:newton`), figure (`fig:elephant`), note (`note:galton`), and error cases. Good coverage.

---

## Selector choice: `tagName.toLowerCase()` vs `matches()`

Using `tagName.toLowerCase()` is more explicit for custom elements (`display-math`) and avoids any edge cases with `matches()` on non-HTML4 tag names in older browsers. Note that `display-math` is a custom element, not a standard HTML tag — `tagName` returns `'DISPLAY-MATH'` in uppercase for HTML elements, so `.toLowerCase()` normalizes it.
