// Curated "featured" element lists for the docs-site Vocabulary intro pages
// (#223 slice 3 / #241).
//
// The two Vocabulary intros (Enscribe Shorthand, Layer 1) are LIGHT, curated
// introductions to each register: the idea plus a few live examples, linking
// INTO the comprehensive Documentation catalogs for the full set (IA principle 2,
// notes/docs-site-ia-design.md:44-47). The intro examples are not hand-copied —
// they are pulled from the same vocab source the catalogs use (the docs generator
// looks each tagname up in `@enscribejs/layer1-vocabulary`'s VOCABULARY and renders
// its `shorthand_examples[0]` live), so they cannot drift from the catalog.
//
// "A flagged subset" (IA principle 2) is realised as THESE curated tagname lists,
// guarded in lockstep with the vocab — there is no per-example `featured:` flag in
// the element frontmatter (a possible future enhancement; see the slice-3 finding).
//
// Curation criteria (enforced by featured-elements.test.js):
//   • CANONICAL tagnames only — not shorthand aliases (so headings read the Layer 1
//     element name, e.g. <fig> not its <figure> alias).
//   • CONTEXT-FREE — no `requires-context` element (<cite> needs a bibliography and
//     <book-part> shorthands need a book; both render empty/misleading in isolation).
//   • Carries a usable example — `shorthand_examples[0].source` must exist, and for
//     the Layer 1 list its `.layer1_html` expansion too (the Layer 1 intro DISPLAYS
//     the canonical expansion beside the live render — the "shorthand → Layer 1" form).
//   • Beginner-legible and representative — a section, a figure, a note, math, etc.
//
// The lists live in the enscribe package (not docs-site, which has no test runner)
// so the guard can run in this package's suite, mirroring config-options-doc.js.

/**
 * Featured constructs for the **Enscribe Shorthand** intro — the by-hand authoring
 * register. Shown as authored shorthand source beside its live render.
 */
export const FEATURED_SHORTHAND = [
  'section',
  'sub-section',
  'fig',
  'note',
  'inline-math',
  'abbr',
  'term',
  'theorem',
];

/**
 * Featured constructs for the **Layer 1** intro — the semantic-HTML substrate that
 * shorthand expands to. Each is shown as the shorthand source → its canonical
 * `layer1_html` expansion → one live render (the "shorthand expands to Layer 1" form).
 */
export const FEATURED_LAYER1 = [
  'section',
  'fig',
  'note',
  'inline-math',
  'math',
  'table',
  'theorem',
  'dl',
];
