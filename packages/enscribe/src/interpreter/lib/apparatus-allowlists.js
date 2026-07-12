// Apparatus-tag metadata: the <config> kwarg allowlist + the apparatus tag sets.
//
// Per the apparatus-tag reconciliation (2026-05-25, `578d6f0`), <meta> and
// <config> are both authorable with kwargs, with kwargs accepted against a
// per-tag allowlist and a misuse-feedback hint fired when a kwarg appears on
// the wrong apparatus tag.
//
// HISTORICAL NOTE on <meta>: <meta>'s kwarg allowlist used to live in this
// file (META_KWARGS, META_KWARGS_LIFTED, isMetaKwarg). The 2026-05-27
// structured-element-infrastructure slice moved <meta>'s spec to its
// canonical home — the structured-element registry at
// `@enscribejs/enscribe/core/structured-elements.js`. <meta> is now one of several
// structured-data-container tags (alongside <author>); its kwargs / lifted
// subset / misuse-partner pointer all live in that registry's spec entry.
// The interpreter's lift gate consumes the spec from there.
//
// This file holds <config>'s kwarg allowlist (below) and the apparatus TAG sets
// (which tags are apparatus, and which render — F13, at the foot). <config> is NOT
// a structured-data-container — its content is processing options, not a record of
// named document-descriptive fields, and the authoring surface today is kwargs-only
// (no child-tag form lifted by the gate). <config> stays kwarg-driven and stays here.
//
// The misuse-feedback pairing still works across the file boundary: <meta>'s
// spec (in structured-elements.js) names 'config' as its misusePartnerTag,
// and `isConfigKwarg` (exported from this file) is what the gate consults to
// fire the "did you mean <config>?" hint from the <meta> side. The reverse
// direction — `<meta>`-shaped kwarg on `<config>` — is handled by the
// <config> branch in normalize-to-canonical.js, which consults
// `isStructuredKwarg('meta', key)` (imported from structured-elements).

import { tagnamesInCategory } from './vocab-categories.js';

// ── <config> kwarg allowlist (F11: one typed Map) ─────────────────────────────
//
// Each entry carries TWO facts in one place: its implementation `status` ('live' = a
// plugin consumes it today; 'reserved' = settled future surface, accepted silently, no
// behavior) and its value `type` ('boolean' = a flag, so a BARE `<config X>` resolves to
// `X=true` per #219; 'valued' = requires a value, e.g. toc-depth / theme). Co-locating
// type with the key removes the F11 hazard the parallel CONFIG_BOOLEAN_KWARGS Set had:
// add a boolean key here and forget the Set and it was accepted but never bare-promoted
// (the silent-inert bug #221 had to dodge by hand). `boolean()` / `valued()` make the
// type visible at every entry; the allowlist predicate and isBooleanConfigKwarg both
// derive from this single Map.
// #401: each entry may also carry its VALUE spec (`accepts`), so key-allowlisting and
// value-validation share ONE source — the F11 lesson again (a parallel value table would
// drift exactly like the old CONFIG_BOOLEAN_KWARGS Set did). A `boolean()` key implicitly
// accepts true/false (bare `<config X>` → 'true' per #219); a `valued()` key accepts
// anything unless it names a spec:
//   { enum: [...] }               — one of the listed words
//   { int: { min } }              — an integer ≥ min
//   { enum: [...], int: { min } } — either form (toc-expand: a count, or 'all')
// A key with no spec (citation-style — the CSL style registry is unbounded;
// bibliography-heading, toc-title — free text; the reserved keys) is not value-checked.
// Validation itself is validateConfigValue below; the config-discovery plugin calls it
// as the map is built, so a bad value warns ONCE, at the authored position, through the
// #402 diagnostics seam — and the reader's default still applies (warned-default, never
// silent-default: Ariel's #401 decision).
const boolean = (status = 'live') => ({ status, type: 'boolean' });
const valued = (status = 'live', accepts = null) => ({ status, type: 'valued', accepts });

export const CONFIG_KWARGS = new Map([
  // Live (consumed by current plugins).
  ['citation-style',          valued()],    // library-load.js:253 (builds the styled index; default chicago-author-date)
  ['number-equations',        boolean()],   // numbering.js
  ['number-figures',          boolean()],   // numbering.js
  ['number-tables',           boolean()],   // numbering.js
  ['number-sections',         boolean()],   // numbering.js (#57; default off articles / on books)
  ['number-depth',            valued('live', { int: { min: 0 } })],    // numbering.js (#218; deepest heading level numbered; default all levels; INDEPENDENT of toc-depth)

  // #218: table-of-contents settings — the config-driven contents listing, read in
  // the shared compiler (index.js → lib/toc.js applyConfigToc) so the static build and
  // the live render honor them identically. Default off. Numbering (number-depth) is the
  // sibling half (next slice). See notes/specs/toc-and-numbering.md.
  ['toc',                     boolean()],   // index.js compiler → applyConfigToc (default off)
  ['toc-depth',               valued('live', { int: { min: 1 } })],    // deepest heading level listed (default 3)
  ['toc-title',               valued()],    // heading above the listing (default "Contents")
  ['toc-location',            valued('live', { enum: ['body', 'left', 'right'] })],    // body | left | right (default body)
  ['toc-expand',              valued('live', { int: { min: 0 }, enum: ['all'] })],    // sidebar levels expanded initially (default 1)
  // Phase 3 slice 3a (2026-05-28): the three new theorem-family counter
  // suppressions. Same pattern as number-equations/figures/tables —
  // setting any of these to false in a <config> block suppresses the
  // entire counter for the document.
  ['number-theorems',         boolean()],   // numbering.js (theorem/lemma/corollary/proposition)
  ['number-definitions',      boolean()],   // numbering.js (<definition>)
  ['number-examples',         boolean()],   // numbering.js (<example>)
  ['number-boxes',            boolean()],   // numbering.js (numbered <aside> — the 'box' counter, #31)

  // Phase 4 slice 4a (2026-05-29): two scope knobs for book documents.
  // Articles default to none/section; books default to chapter/chapter.
  // counter-reset-scope: 'none' | 'chapter' | 'section'
  //   none    — global counters across the whole document
  //   chapter — counters reset at each <book-part> boundary
  //   section — counters reset at each <book-part> AND outermost
  //             <section> boundary
  // note-scope: 'document' | 'chapter' | 'section'
  //   document — single back-matter <note-list> (article-back / book-back)
  //   chapter  — per-book-part <note-list> at each chapter's end
  //   section  — per-outermost-section <note-list> (article default;
  //              slice 7001aaa behavior)
  ['counter-reset-scope',     valued('live', { enum: ['none', 'chapter', 'section'] })],    // numbering.js + ref-resolution.js
  ['note-scope',              valued('live', { enum: ['document', 'chapter', 'section'] })],    // note-placement.js
  ['bibliography-heading',    valued()],    // bibliography.js (overrides the "References" heading)

  // #19: reveal the authored DSL source behind a rendered DSL block in a native
  // <details> disclosure. Document-level, default off. Read in index.js's
  // compileToHtml and threaded to the diagram engine handlers (mermaid / abc).
  ['show-source',             boolean()],   // index.js compileToHtml → handlers/{mermaid,abc}.js

  // #21: doc-wide default for whether DATA-format table cells (<table csv|json|…>)
  // parse their cells as Enscribe inline markup. Baseline OFF — data stays literal
  // unless the author opts in (per-table +parse-text / parse-columns, or this set
  // on purpose). Per-table attributes override it. Consumed by the table-cell-parse
  // plugin, which reads it through readBoolKwarg's config layer.
  ['parse-data-tables',       boolean()],   // plugins/table-cell-parse.js

  // #281: page-scoped warning suppression. A document carrying <config quiet /> suppresses
  // ITS OWN authoring warnings (the vfile file.messages stream — raw-HTML passthrough,
  // mis-placed apparatus, …) from build/console output. Gates EMISSION only; rendering and
  // the inline error markers are untouched. The supported way to quiet a teaching/demo page.
  ['quiet',                   boolean()],   // interpreter/index.js enscribeQuietSuppression (#281)

  // #221: book navigation chrome — the chapter rail, prev/next, cover, back-to-top,
  // and pagination unit. Book-only (<meta type=book>), default ON for books (declaring
  // a book opts into book conventions) EXCEPT back-to-top. Read in the shared book model
  // (master-document/book-scaffold.js → resolveBookNavConfig) so the static separate-pages
  // build and the live render honor them identically. Only split-by=chapter is built;
  // section|none are deferred. See notes/specs/book-navigation.md.
  ['chapter-nav',             boolean()],   // book-scaffold → buildChapterRail (the chapter rail)
  ['chapter-nav-depth',       valued('live', { int: { min: 1 } })],    // rail depth: 1 = chapters; >=2 = chapters + their sections
  ['page-navigation',         boolean()],   // prev/next chapter links (chapterNavBar)
  ['cover',                   boolean()],   // cover landing page; off = land on the first chapter
  ['back-to-top',             boolean()],   // scroll-to-top control within a chapter
  ['on-this-page',            boolean()],   // book-scaffold resolveBookNavConfig / lib/toc.js applyBookToc — the per-chapter on-this-page rail (right column); default on; #248
  ['split-by',                valued('live', { enum: ['chapter', 'section', 'none'] })],    // pagination unit: chapter (built) | section | none (deferred)

  // #246: website navigation chrome. The website's primary nav is the sticky TOP bar; the left
  // sidebar (the full nav tree) is an opt-in, default OFF (the top bar suffices for a small site).
  // Read in the live website mount (browser.js mountLiveWebsite → readConfigBool) so the chrome is
  // built with the sidebar column only when the master asks for it. Website-only (<meta type=website>).
  ['sidebar',                 boolean()],   // mountLiveWebsite → buildWebsiteSidebar (the left nav rail; default off)
  // #392: the project-repository URL for the shell chrome's corner (the GitHub mark links here).
  // Free-valued (any URL). Read by the website chrome on BOTH surfaces (the static shell's top bar
  // and mountLiveWebsite's) — absent → no mark, the chrome is unchanged. The corner is the shell's
  // action home (#398's settings gear joins it); `repo` is its first config-driven affordance.
  ['repo',                    valued()],    // website-shell topBarFor + mountLiveWebsite → buildShellActions (the chrome corner's GitHub mark)
  // #392: the slug of the site's live-tour page (the playground door). THAT page's "Open in
  // playground" CTA carries `&edit` — its live twin opens with the editor engaged — while every
  // other page's CTA stays read-mode (the decided read-with-button split; the #365 lazy-editor
  // economy: CodeMirror loads only through this one door or an explicit ?edit).
  ['playground',              valued()],    // static-website liveHrefFor → the try-page CTA opens the live twin editing

  // The remaining keys, enumerated as intended <config> surface by the
  // apparatus-tag reconciliation. Most are now LIVE with a named consumer
  // (see the inline comments). The two still marked 'reserved' —
  // `display-style` and `bibliography-position` — have no consumer yet; the
  // allowlist accepts them so author input is not rejected before that
  // consumer lands.
  ['theme',                   valued('live', { enum: ['modern', 'compact', 'tufte'] })],  // ⇄ index.js KNOWN_THEMES + themes/ dir (guarded by config-discovery.test.js equality, not an import — no cycle)
  ['display-style',           valued('reserved')],
  ['note-position',           valued('live', { enum: ['bottom', 'margin'] })],            // index.js compiler → sidenotes (#33, margin render mode)
  ['heading-tags',            boolean()],           // heading-levels.js (#397; DEFAULT ON — native heading wrap on outline titles)
  ['strict-mode',             valued('live', { enum: ['off', 'sigil', 'canonical'] })],            // strict-mode.js → the strictness register switch (#36):
                                                    // off | sigil | canonical (each names the loosest register on).
  ['bibliography-position',   valued('reserved')],
  // `reference-library` (a config-level external-library declaration) retired:
  // #133 settled that external library sources are the body element `<library
  // src=…>`, NEVER a <config> kwarg — so the reserved placeholder is superseded.
]);

/**
 * Wildcard <config> kwarg prefixes — `ref-prefix-eqn`, `ref-prefix-fig`,
 * etc. Any kwarg starting with one of these prefixes is accepted (live;
 * consumed by ref-resolution.js).
 */
export const CONFIG_KWARG_PREFIXES = ['ref-prefix-'];

/**
 * Predicate: does the given key match a <config>-accepted kwarg?
 */
export function isConfigKwarg(key) {
  if (CONFIG_KWARGS.has(key)) return true;
  return CONFIG_KWARG_PREFIXES.some(prefix => key.startsWith(prefix));
}

/**
 * Predicate: is `key` a BOOLEAN <config> kwarg (so a bare `<config key>` means `key=true`,
 * #219)? Derived from the one allowlist Map — boolean-ness lives WITH the key (F11), so it
 * cannot drift from the accepted set. The VALUED kwargs (`toc-depth`, `theme`, …) return
 * false: a bare valued kwarg is meaningless and stays unrecognized, never a spurious flag.
 */
export function isBooleanConfigKwarg(key) {
  return CONFIG_KWARGS.get(key)?.type === 'boolean';
}

// ── #401: config VALUE validation (one policy, family-wide) ───────────────────
//
// A recognized key whose value fails its spec is a warned-default: the message below
// flows through the #402 diagnostics seam (emitted by config-discovery at the authored
// position) and every reader's existing default/coercion still applies. Warning-channel
// only — never an in-document flag (Ariel's #401/#403 clarification: this family is
// presentation config, not content).

/** Human wording of a spec's accepted values, for the warning text. */
function describeAccepted(entry) {
  if (entry.type === 'boolean') return 'true or false (or the bare flag form)';
  const parts = [];
  if (entry.accepts?.enum) parts.push(entry.accepts.enum.join(', '));
  if (entry.accepts?.int) parts.push(`an integer ≥ ${entry.accepts.int.min}`);
  return parts.join(', or ');
}

/** An integer-shaped string/number (no trailing junk: '2' yes, '2.7'/'two' no). */
function isIntAtLeast(value, min) {
  const s = String(value).trim();
  if (!/^-?\d+$/.test(s)) return false;
  return parseInt(s, 10) >= min;
}

/**
 * Validate a recognized <config> kwarg's VALUE against the allowlist entry's spec.
 * Returns null when acceptable (or when the key is unspecced/unknown/wildcard — key
 * validation is the normalize gate's job, not this one's), else the warning text.
 *
 * @param {string} key
 * @param {*} value - as stored by the parser (bare boolean → 'true' per #219)
 * @returns {string|null}
 */
export function validateConfigValue(key, value) {
  const entry = CONFIG_KWARGS.get(key);
  if (!entry) return null; // unknown / ref-prefix-* wildcard: not this check's job
  if (entry.type === 'boolean') {
    const ok = value === true || value === false || value === 'true' || value === 'false';
    return ok ? null : `config: ${key}="${value}" is not a recognized value — expected ${describeAccepted(entry)}; the default applies`;
  }
  if (!entry.accepts) return null; // free-valued (citation-style, toc-title, …)
  const { enum: words, int } = entry.accepts;
  if (words && words.includes(String(value))) return null;
  if (int && isIntAtLeast(value, int.min)) return null;
  return `config: ${key}="${value}" is not a recognized value — expected ${describeAccepted(entry)}; the default applies`;
}

// ── Apparatus tag sets (F13 set + F14 category-derived suppressed subset) ──────
//
// Apparatus tags are document-apparatus, not body content — they belong at the document
// edges (the positioning check in article-structuring's warnMisplacedApparatus). Of these,
// some RENDER (meta → front matter; config → discovered, then an invisible element) and
// some are STORAGE HOSTS that produce no output (data → a citation registry; library →
// bibtex source) — the hast handler returns null for the latter (interpret-plugin).
//
// APPARATUS_TAGS and RENDERED_APPARATUS stay CURATED: "apparatus" is document-edge-ness, an
// axis orthogonal to vocab category (meta is apparatus but its structured-data-containers
// sibling author is NOT), so neither maps to a category union. Only the SUPPRESSED subset is
// a category — the storage-hosts — so it derives from the vocab (F14): a future storage host
// is auto-suppressed by the vocab, not a hand-edit (R4's "safe default" now enforced).
export const APPARATUS_TAGS = new Set(['meta', 'config', 'data', 'library']);

// The apparatus tags that render/are-handled (curated — see above).
const RENDERED_APPARATUS = new Set(['meta', 'config']);

// Storage-host apparatus — DERIVED from the vocab `category` (the one place category is read
// is lib/vocab-categories.js). A copy, so the exported set is independent of the shared index.
export const SUPPRESSED_APPARATUS = new Set(tagnamesInCategory('storage-hosts'));

// Invariant (load-time cross-check): RENDERED == APPARATUS − SUPPRESSED still holds — i.e. the
// category-derived suppressed set is consistent with the curated apparatus/rendered sets.
// Throws if the vocab storage-hosts category drifts from them (e.g. a storage host that is in
// APPARATUS_TAGS but not the category, or vice-versa within the apparatus set).
{
  const derivedRendered = [...APPARATUS_TAGS].filter((tag) => !SUPPRESSED_APPARATUS.has(tag));
  const consistent =
    derivedRendered.length === RENDERED_APPARATUS.size &&
    derivedRendered.every((tag) => RENDERED_APPARATUS.has(tag));
  if (!consistent) {
    throw new Error(
      `apparatus-allowlists (F14): RENDERED_APPARATUS {${[...RENDERED_APPARATUS].join(', ')}} != ` +
      `APPARATUS_TAGS − SUPPRESSED_APPARATUS {${derivedRendered.join(', ')}} — the vocab ` +
      `'storage-hosts' category drifted from the curated apparatus sets.`,
    );
  }
}
