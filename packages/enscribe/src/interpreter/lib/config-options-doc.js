// Documentation source for the <config> options (#223 slice 2 / #239).
//
// CONFIG_KWARGS (apparatus-allowlists.js, beside this file) is the authority for the
// STRUCTURED facts — which keys exist, and each key's `type` (boolean | valued) and `status`
// (live | reserved). The HUMAN facts a reader needs — a description, the accepted values, the
// default, and the scope — lived only in that Map's code comments (fine for a maintainer,
// useless as a generator source). This module is that human layer, structured so a docs
// Rendering-guide grid can generate from it (it can't drift) and a guard test (config-options-doc.test.js)
// holds it in lockstep with CONFIG_KWARGS: every key documented, no orphans, every `type` matching.
//
// Every fact below was VERIFIED against the consuming plugin named in the Map comment — not
// transcribed. Defaults that differ article-vs-book are stated as such. The one comment that was
// off — citation-style's consumer — is recorded in `verifiedNote` (the config key is read in
// library-load.js, not cite-resolution.js; default chicago-author-date).

/** Family display order for the grid. */
export const CONFIG_FAMILIES = [
  'Numbering',
  'Table of contents',
  'Citations & bibliography',
  'Notes',
  'Heading semantics',
  'Book navigation',
  'Website navigation',
  'Display / DSL / strict',
];

/** One entry per <config> key. `type` mirrors CONFIG_KWARGS (the guard asserts equality);
 *  `values` is null for booleans; `scope` is 'all' or 'book-only'; `reserved` flags the
 *  no-consumer-yet keys. */
export const CONFIG_OPTIONS_DOC = [
  // ── Numbering ────────────────────────────────────────────────────────────────
  { key: 'number-equations', family: 'Numbering', type: 'boolean', values: null, default: 'on', scope: 'all',
    description: 'Number display equations document-wide. Set false to suppress the equation counter.' },
  { key: 'number-figures', family: 'Numbering', type: 'boolean', values: null, default: 'on', scope: 'all',
    description: 'Number figures. Set false to suppress the figure counter.' },
  { key: 'number-tables', family: 'Numbering', type: 'boolean', values: null, default: 'on', scope: 'all',
    description: 'Number tables. Set false to suppress the table counter.' },
  { key: 'number-theorems', family: 'Numbering', type: 'boolean', values: null, default: 'on', scope: 'all',
    description: 'Number the theorem family — theorem / lemma / corollary / proposition share one counter.' },
  { key: 'number-definitions', family: 'Numbering', type: 'boolean', values: null, default: 'on', scope: 'all',
    description: 'Number definitions.' },
  { key: 'number-examples', family: 'Numbering', type: 'boolean', values: null, default: 'on', scope: 'all',
    description: 'Number examples.' },
  { key: 'number-boxes', family: 'Numbering', type: 'boolean', values: null, default: 'off', scope: 'all',
    description: 'Number boxes (numbered <aside>). Boxes are UNnumbered by default — opt a box in with +numbered.' },
  { key: 'number-sections', family: 'Numbering', type: 'boolean', values: null, default: 'off', scope: 'all',
    description: 'Hierarchical heading numbering (1, 1.1, 1.1.1). Off by default for ALL document types (#246/core) — opt in with <config number-sections>. A <ref> to an unnumbered heading shows its title.' },
  { key: 'number-depth', family: 'Numbering', type: 'valued', values: 'a non-negative integer (heading level)', default: 'all levels', scope: 'all',
    description: 'Deepest heading level that receives a number. Independent of toc-depth — a heading can be numbered but not listed, or vice versa.' },
  { key: 'counter-reset-scope', family: 'Numbering', type: 'valued', values: 'none | chapter | section', default: 'none in articles, chapter in books', scope: 'all',
    description: 'Where float / equation / theorem counters reset. none = global; chapter = at each <book-part>; section = also at each outermost <section>.' },

  // ── Table of contents ────────────────────────────────────────────────────────
  { key: 'toc', family: 'Table of contents', type: 'boolean', values: null, default: 'off', scope: 'all',
    description: 'Render the config-driven contents listing (read in the shared compiler, so static and live agree).' },
  { key: 'toc-depth', family: 'Table of contents', type: 'valued', values: 'a positive integer', default: '3', scope: 'all',
    description: 'Deepest heading level shown in the listing.' },
  { key: 'toc-title', family: 'Table of contents', type: 'valued', values: 'any text', default: 'Contents', scope: 'all',
    description: 'Heading shown above the listing.' },
  { key: 'toc-location', family: 'Table of contents', type: 'valued', values: 'body | left | right', default: 'body', scope: 'all',
    description: 'Where the listing sits: body = inline at the top of the document; left / right = a sticky sidebar.' },
  { key: 'toc-expand', family: 'Table of contents', type: 'valued', values: 'an integer, or all | none', default: '1', scope: 'all',
    description: 'How many sidebar levels are expanded initially (sidebar locations only).' },

  // ── Citations & bibliography ─────────────────────────────────────────────────
  { key: 'citation-style', family: 'Citations & bibliography', type: 'valued', values: 'a citation-js / CSL style name (e.g. apa, vancouver, ieee)', default: 'chicago-author-date', scope: 'all',
    description: 'The bibliography and in-text citation style.',
    verifiedNote: 'The config key is read in library-load.js (which builds the styled citation index); cite-resolution.js — the Map comment’s named consumer — formats with the already-resolved style.' },
  { key: 'bibliography-heading', family: 'Citations & bibliography', type: 'valued', values: 'any text', default: 'References', scope: 'all',
    description: 'Overrides the bibliography’s default "References" heading.' },
  { key: 'bibliography-position', family: 'Citations & bibliography', type: 'valued', values: null, default: null, scope: 'all', reserved: true,
    description: 'Reserved — intended to control where the bibliography sits in the document. No consumer yet.' },

  // ── Notes ────────────────────────────────────────────────────────────────────
  { key: 'note-scope', family: 'Notes', type: 'valued', values: 'document | chapter | section', default: 'section in articles, chapter in books', scope: 'all',
    description: 'Where footnotes collect: document = one back-matter list; chapter = per <book-part>; section = per outermost <section>.' },
  { key: 'note-position', family: 'Notes', type: 'valued', values: 'bottom | margin', default: 'bottom', scope: 'all',
    description: 'Render position of numbered notes. bottom = foot of the document; margin = Tufte-style sidenotes in a wide margin column.' },

  // ── Heading semantics (#397) ─────────────────────────────────────────────────
  { key: 'heading-tags', family: 'Heading semantics', type: 'boolean', values: null, default: 'on', scope: 'all',
    description: 'Wrap each outline title\'s inline content in the native heading of its structurally derived level (render-quality.md RQ-DOC-M4). ON is the conforming default; set false only when the host materializes heading semantics itself — off emits no heading wrap at all.' },

  // ── Book navigation (book-only) ──────────────────────────────────────────────
  { key: 'chapter-nav', family: 'Book navigation', type: 'boolean', values: null, default: 'on', scope: 'book-only',
    description: 'The persistent chapter rail (its header is the return-to-cover link).' },
  { key: 'chapter-nav-depth', family: 'Book navigation', type: 'valued', values: '1 = chapters; >=2 = chapters + their sections', default: '1', scope: 'book-only',
    description: 'How deep the chapter rail lists.' },
  { key: 'page-navigation', family: 'Book navigation', type: 'boolean', values: null, default: 'on', scope: 'book-only',
    description: 'Prev / next chapter links at the foot of each chapter.' },
  { key: 'cover', family: 'Book navigation', type: 'boolean', values: null, default: 'on', scope: 'book-only',
    description: 'Show the cover / title page as the landing view. Off = land on the first chapter.' },
  { key: 'back-to-top', family: 'Book navigation', type: 'boolean', values: null, default: 'off', scope: 'book-only',
    description: 'An optional scroll-to-top control within a chapter.' },
  { key: 'on-this-page', family: 'Book navigation', type: 'boolean', values: null, default: 'on', scope: 'book-only',
    description: 'The per-chapter "on this page" rail (the current chapter’s section list, right column). Off drops the reading interface to two columns.' },
  { key: 'split-by', family: 'Book navigation', type: 'valued', values: 'chapter | section | none', default: 'chapter', scope: 'book-only',
    description: 'The pagination unit. Only chapter is built; section and none are specified but deferred.' },

  // ── Website navigation (website-only) ────────────────────────────────────────
  { key: 'sidebar', family: 'Website navigation', type: 'boolean', values: null, default: 'off', scope: 'website-only',
    description: 'The left navigation sidebar (the full nav tree). The sticky top bar is a website’s primary nav; the sidebar is an opt-in second surface — off by default, and the layout reflows to give the content the freed column.' },
  { key: 'repo', family: 'Website navigation', type: 'valued', values: null, default: null, scope: 'website-only',
    description: 'The project-repository URL. The shell chrome’s top-bar corner renders the GitHub mark linking here, on both the static and live surfaces; absent, no mark renders and the chrome is unchanged (#392).' },
  { key: 'playground', family: 'Website navigation', type: 'valued', values: null, default: null, scope: 'website-only',
    description: 'The slug of the site’s live-tour page. That page’s “Open in playground” CTA opens its live twin with the editor engaged; every other page’s CTA stays read-mode — the one door that loads the editor (#392).' },

  // ── Display / DSL / strict ───────────────────────────────────────────────────
  { key: 'theme', family: 'Display / DSL / strict', type: 'valued', values: 'default | modern | compact | tufte', default: 'default', scope: 'all',
    description: 'Inject a theme’s :root token overrides after the base stylesheet. default (or unset) injects nothing.' },
  { key: 'theme-variant', family: 'Display / DSL / strict', type: 'valued', values: 'light | dark | auto', default: 'auto', scope: 'all',
    description: 'The document-tier light/dark default (#398). light/dark pin the variant (data-theme-variant on <html> in standalone builds); auto follows the OS via prefers-color-scheme. The reader-tier switch overrides locally.' },
  { key: 'display-style', family: 'Display / DSL / strict', type: 'valued', values: null, default: null, scope: 'all', reserved: true,
    description: 'Reserved — no consumer yet.' },
  { key: 'show-source', family: 'Display / DSL / strict', type: 'boolean', values: null, default: 'off', scope: 'all',
    description: 'Reveal the authored DSL source behind a rendered diagram (mermaid / abc) in a native <details> disclosure.' },
  { key: 'parse-data-tables', family: 'Display / DSL / strict', type: 'boolean', values: null, default: 'off', scope: 'all',
    description: 'Document-wide default for whether DATA-format table cells (<table csv|json|…>) parse as Enscribe inline markup. Per-table attributes override it.' },
  { key: 'strict-mode', family: 'Display / DSL / strict', type: 'valued', values: 'off | sigil | canonical', default: 'off', scope: 'all',
    description: 'The strictness register switch. off = all registers interpret; sigil = the markdown register is off; canonical = markdown AND sigils are off (only canonical tags).' },
  { key: 'quiet', family: 'Display / DSL / strict', type: 'boolean', values: null, default: 'off', scope: 'all',
    description: 'Suppress THIS document’s authoring warnings (raw-HTML passthrough, mis-placed apparatus, …) from build/console output. Page-scoped — a quiet page hushes while other pages still warn. Gates emission only; rendering and the inline error markers are unchanged. The supported way to quiet teaching/demo pages that deliberately show warnings-worthy markup.' },
].filter((e) => !e.skip);

/** The wildcard <config> kwarg prefix, documented once as a pattern (it is not a fixed key —
 *  any `ref-prefix-<type>` is accepted). */
export const CONFIG_WILDCARD_DOC = {
  pattern: 'ref-prefix-<type>',
  // Numbering, not Citations: ref-prefix-* overrides the CROSS-reference label word for a
  // numbered float (ref-prefix-eqn = "Eq."), consumed by ref-resolution.js — it is unrelated
  // to <cite>/bibliography. It sits beside the float counters it labels.
  family: 'Numbering',
  type: 'valued',
  values: 'any text (e.g. ref-prefix-fig = "Fig.")',
  default: 'the type’s built-in prefix',
  scope: 'all',
  description: 'Override the cross-reference label prefix for a float type — a wildcard pattern (e.g. ref-prefix-eqn, ref-prefix-tbl), not a fixed key.',
};
