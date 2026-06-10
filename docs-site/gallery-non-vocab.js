// enscribe docs-site — curated NON-VOCABULARY constructs for the gallery (#143).
//
// The gallery is generated from each vocab entry's `shorthand_examples`, so it
// covers every Layer 1 vocabulary ELEMENT. A few authoring constructs are
// Layer-2 only — they lower to standard HTML and have no vocab entry of their
// own — so the vocab walk misses them. The gallery is the project's completeness
// surface (every construct a user can write, as a look-it-up reference), so this
// curated supplement closes that gap: gen-gallery.js renders these alongside the
// vocab-driven cells, in the same format.
//
// Add a construct here when it has NO vocab element of its own. Do NOT fake one
// into a vocab entry — that breaks the vocab/Layer-1 boundary (e.g. `<list>` is
// Layer-2 authoring that lowers to `<ul>`/`<ol>`/`<li>`).
//
// As of #143 the only such construct is the `<list>` family. Each entry mirrors a
// vocab element's gallery shape: a primary tag (the <h3>), a one-line note (the
// item markers / boundary), and example cells ({ source, notes }) rendered
// identically to vocab examples.

export const NON_VOCAB_CONSTRUCTS = [
  {
    // primary tag shown in the <h3>; matches the vocab elements' `<name>` heading.
    element: 'list',
    // the aliases-style note under the heading: item registers + the Layer-2 boundary.
    note:
      'Item markers come in three registers — the canonical <li>, the <-> / <*> ' +
      'sigils, and the - / * markdown idiom — all interchangeable. Layer-2 ' +
      'authoring: <list> lowers to HTML <ul> / <ol> / <li> and has no Layer 1 ' +
      'vocabulary element of its own, so it lives here rather than in the ' +
      'vocab-driven groups above.',
    examples: [
      {
        source: '<list>\n<li> Canonical marker\n<li> Another item\n</list>',
        notes: 'The canonical <li> item marker.',
      },
      {
        source: '<list>\n<-> Dash sigil marker\n<-> Another item\n</list>',
        notes:
          'The <-> item sigil (its twin <*> is identical). Block-scoped — ' +
          'recognized only at the start of a line inside a list, so an inline ' +
          'arrow in prose (x <- y) is never claimed.',
      },
      {
        source: '<list>\n- Markdown idiom\n- Another item\n</list>',
        notes: 'The markdown item idiom (- or *).',
      },
      {
        source: '<list ordered>\n<li> First\n<li> Second\n</list>',
        notes: 'ordered renders an <ol>.',
      },
      {
        source: '<list ordered marker=lower-roman start=2>\n<li> Starts at "ii",\n<li> then "iii".\n</list>',
        notes: 'marker= sets the CSS list-style-type (passed through); start and reversed control an ordered list’s count.',
      },
      {
        source: '<list>\n<li> Groceries\n<list>\n<li> Apples\n<li> Bread\n</list>\n<li> Errands\n</list>',
        notes: 'A <list> inside an item nests; the outer list resumes at its next marker.',
      },
      {
        source: '<list>\n<li> An item with more to say.\n\nA second paragraph belongs to the same item — it runs to the next marker, no indentation.\n<li> A short item.\n</list>',
        notes: 'An item runs from its marker to the next, so it holds several paragraphs.',
      },
    ],
  },
];
