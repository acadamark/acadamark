// Curated "featured" element lists for the docs site's Vocabulary intro pages
// (#223 slice 3 / #241).
//
// The two Vocabulary intros (Enscribe Shorthand, Layer 1) are LIGHT, curated
// introductions to each register: the idea plus a few live examples, linking
// INTO the comprehensive vocabulary reference for the full set. The intro examples
// are not hand-copied — they are pulled from the same vocab source the reference uses
// (each tagname's `shorthand_examples[0]`, the SAME `<code>`/`<frame>` shape), so they
// cannot drift from it. (The original docs-site generator that emitted these intros —
// gen-reference.js's `buildFeaturedIntro` — was archived with the old docs-site; the
// curated lists below and their vocab-lockstep guard remain, the authority for whatever
// docs surface consumes them.)
//
// "A flagged subset" is realised as THESE curated tagname lists, guarded in lockstep
// with the vocab — there is no per-example `featured:` flag in the element frontmatter
// (a possible future enhancement; see the slice-3 finding).
//
// Curation criteria (enforced by featured-elements.test.js):
//   • CANONICAL tagnames only — not shorthand aliases (so headings read the Layer 1
//     element name, e.g. <fig> not its <figure> alias).
//   • CONTEXT-FREE — no `requires-context` element (<cite> needs a bibliography and
//     <book-part> shorthands need a book; both render empty/misleading in isolation).
//   • Carries a usable example — `shorthand_examples[0].source` must exist, and for
//     the Layer 1 list its `.ehtml` expansion too (the Layer 1 intro DISPLAYS the
//     canonical expansion in a three-part shorthand → Layer 1 → rendered form).
//   • Beginner-legible and representative — a section, a figure, a note, math, etc.
//
// The lists live in the enscribe package (which has a test runner) so the guard can
// run in this package's suite, mirroring config-options-doc.js.

/**
 * Featured constructs for the **Enscribe Shorthand** intro — the by-hand authoring
 * register. Shown as authored shorthand source (`<code>`) then its live render (`<frame>`).
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
 * `ehtml` expansion → one live render (the "shorthand expands to Layer 1" form).
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
