> **Archived 2026-Q2.** Hover previews are implemented (Tippy.js + Popper.js, per `notes/hover-preview-investigation.md`). This document is the pre-implementation design exploration. Retained for historical reference; not a current spec.

---

# Hover previews — deferred feature

This document captures the design intent for hover-preview rendering in acadamark. The feature is deferred to a future slice; this note preserves the thinking.

## Status

Deferred. Not in slice 1 or planned subsequent slices. The feature is a render-mode enhancement, not a vocabulary or interpreter concern. Implementation depends on the rendering target (web browser, PDF, print).

The author has prior implementations of similar features in archive/ that serve as reference.

## Purpose

Reduce context switching when reading scholarly content. When a reader encounters a citation, cross-reference, or note, they currently have to scroll or navigate to see the referenced content. Hover previews bring the referenced content to the reader's cursor, dramatically reducing the cognitive cost of following references.

The research support for this is substantial. Head et al. (2021) showed comprehension speedup of approximately 26% when contextual information is shown in place rather than requiring navigation. MyST and similar systems have adopted hover previews specifically for this reason.

## Use cases

Three elements benefit most:

**Citations.** Hovering over a citation marker (`(Goodall 2024)` or `[1]`) shows the full bibliography entry — title, authors, year, journal, abstract if available. Readers can decide whether to follow up without losing their place.

**Cross-references.** Hovering over "Figure 3" shows the figure (or thumbnail) and its caption. Readers can recall what Figure 3 was without scrolling back. Same for sections, equations, tables.

**Notes.** Hovering over a note marker (footnote-style superscript number) shows the note content as a tooltip. Particularly valuable for sidenotes and brief clarifications that don't justify a full footnote scroll.

External links (`<a>`) can also benefit from hover previews showing target document titles, but the implementation depends on access to the target metadata (Wikipedia summaries, GitHub repo descriptions, etc.). This is a separate concern from internal references.

## Design

Two layers, separated for cleanness:

**Layer 1 / interpreter responsibility.** The interpreter attaches the preview content as a data attribute on the rendered element. For example:

```html
<cite data-cite-keys="goodall2024"
      data-preview="Goodall, J. (2024). The Effect of Elephants on Climate. Nature, 612, 234-241."
>(Goodall 2024)</cite>
```

The interpreter has access to the citation registry (the bibliography entries) at render time. It can embed the relevant entry as the preview content.

For cross-references, the interpreter has access to the numbered-elements registry. It can embed the target's title, caption, or summary.

For notes, the interpreter has access to the full note content (which gets placed elsewhere in the document). It can embed the content as preview.

**Layer 2 / client-side responsibility.** A small JavaScript library (or Web Component) reads the data attributes and renders hover previews using CSS positioning and JS event handlers. This layer is rendering-mode-specific: web browser implementations use HTML/CSS/JS; PDF implementations use PDF tooltip features (limited) or don't implement hover at all.

## Data attribute schema

The proposed schema for the data attributes:

| Element | Data attribute | Content |
|---------|----------------|---------|
| `<cite>` | `data-preview` | Full bibliography entry formatted per the citation style. May be JSON-encoded for structured access. |
| `<ref>` | `data-preview` | Target element's title, type, and number. May include a thumbnail URL for figures. |
| `<note>` | `data-preview` | Full note content (HTML-escaped or JSON-encoded). |
| `<a>` (external) | `data-preview` (future) | External target's title and description. Requires fetching at build time. |

The exact attribute name (`data-preview`) and format (string vs JSON) needs to be settled when implementation begins. JSON allows richer previews; plain strings are simpler.

## Render-mode lowering

When the interpreter generates the rendered HTML, the preview attributes are added based on the element's resolved content:

- For `<cite>`: read the entry from the citation registry; format per the citation style's display rule (this is the same logic that produces the inline marker, applied to a different rendering target).
- For `<ref>`: read the target from the numbered-elements registry; produce a brief description of the target (type + number + title).
- For `<note>`: read the note's content; produce a preview-formatted version.

For non-resolvable references (citations to missing entries, cross-references to missing targets), the preview attribute can be omitted or contain an error message.

## Client-side library considerations

The hover-preview JavaScript could be:

**Option A: Pure CSS** using `:hover` and the `title` attribute. Simple but limited (browser-default tooltip styling, no rich HTML inside, no positioning control).

**Option B: Web Component** using custom elements. Self-contained, no external dependencies.

**Option C: Existing library** (something like Tippy.js or Popper.js). More features but adds a dependency.

The author's archive/ implementations are a starting point. The relevant choice depends on whether acadamark wants to provide the JS itself or document the data-attribute schema and let users plug in their own preview library.

A reasonable default: provide a minimal Web Component that reads `data-preview` attributes and shows a tooltip on hover. Users can replace it with anything else they prefer.

## Prior art

The author has prior implementations of hover previews in archive/ documents. Those implementations should be reviewed when this feature is built; they likely contain useful patterns for:

- Tooltip positioning (avoiding viewport overflow).
- Mobile/touch handling (tap-to-show on devices without hover).
- Accessibility (keyboard navigation, screen reader compatibility).
- Performance (avoiding layout thrashing, lazy initialization).

The archive/ documents predate the acadamark project; their hover-preview implementations were standalone. The acadamark implementation can adopt the patterns while integrating with the acadamark rendering pipeline.

## Mobile and accessibility

Hover doesn't work on touch devices. The fallback should be tap-to-show, with a close affordance. The Web Component (Option B above) handles this cleanly.

Screen readers should access the preview content as part of the element's accessible name or description. ARIA attributes (`aria-describedby` pointing to a hidden preview element, or `aria-label` containing the preview) accomplish this. The exact pattern is settled at implementation time.

Keyboard navigation: previews should be focusable and dismissible. Tab to focus, Enter or Space to show, Escape to dismiss.

## Performance

Embedding preview content as data attributes increases HTML size. For documents with many citations, the size impact is noticeable. Mitigations:

- Use shared registries (cite multiple entries that point at the same registry; the registry is loaded once).
- Lazy-load full content when hover happens, instead of embedding it.
- Trim preview content (show first paragraph of an abstract rather than the full abstract).

These are implementation-time concerns, not vocabulary concerns.

## What this means for slice 1

Slice 1 doesn't implement hover previews. The interpreter's design should make adding them later straightforward:

- The interpreter has access to the citation registry, numbered-elements registry, and note content at render time.
- The render-mode lowering for `<cite>`, `<ref>`, and `<note>` is a natural place to attach data attributes.
- The shape of the data attributes is forward-compatible — adding `data-preview` doesn't break anything.

Slice 1 produces elements without preview attributes; a later slice adds them. The architectural cost of "later we add hover previews" is essentially zero given the current design.

## When to implement

Hover previews become valuable when:

- Real documents with substantial citation density exist in acadamark.
- The rendering pipeline supports rich web output (slice 3+ probably).
- A specific use case demands them.

Plausibly slice 4 or after, when the basic citation and cross-reference resolution is solid.

## Related references

- `packages/layer1-vocabulary/elements/cite.md` — citation element that benefits from previews.
- `packages/layer1-vocabulary/elements/ref.md` — cross-reference element.
- `packages/layer1-vocabulary/elements/note.md` — notes that can be previewed.
- archive/ documents — prior implementations of hover previews.
- Head et al. (2021): https://doi.org/10.1145/3411764.3445648 — research support for in-context information display.
