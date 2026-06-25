// Numbering plugin — register display-math, figure, table, and section nodes;
// fill display numbers.
//
// Runs after enscribeNotes (notes claim their positions first). Uses the shared
// discover() walk to visit the full mdast tree in document order and register:
//
//   Numbered elements ($$, figure, table):
//     - Calls registry.assign(type, id, { numbered }) to record the entry
//     - Sets node.registryType = 'equation' | 'figure' | 'table' (used by handlers)
//     - Pushes { node, entry } into file.data.enscribeNumberingPending
//     - After registry.numberRegistry() runs, fillNumbering() sets computedNumber
//
//   Section elements (section, sub-section, sub-sub-section) — AUD-09 fix:
//     - Calls registry.assign('section', id, { numbered: false })
//     - Sections with a colon-label id (e.g. sec:intro) land in the registry's
//       label index, so <ref #sec:intro> resolves via ref-resolution.js
//     - numbered: false — sections become findable by label, not sequentially
//       numbered through the registry
//
// The numbering decision for numbered elements follows this priority order:
//   1. +numbered / -numbered boolean kwarg on the tag itself
//   2. numbered=true / numbered=false string kwarg on the tag
//   3. Document-level config: number-equations / number-figures / number-tables
//   4. Default: numbered (true)
//
// The shared discover() walk checks !node.isOpaqueContent before recursing into
// .content arrays, so numbered elements inside opaque-content nodes (e.g. a
// figure textually embedded in a math body) are correctly not registered.
// In practice this case does not arise in valid documents.
//
// fillNumbering(file) (exported):
//   - Reads enscribeNumberingPending and sets node.computedNumber from entry.number

import { VOCABULARY } from '@enscribejs/layer1-vocabulary';
import { ensureRegistry } from '../../core/registry.js';
import { discover } from '../../core/walkers/discover.js';
import { ENSCRIBE_CONFIG, ENSCRIBE_NUMBERING_PENDING } from '../../core/file-data-keys.js';
import { readBoolKwarg } from '../lib/bool-kwarg.js';
import { isEnscribeTag } from '../lib/ast-helpers.js';
import { SECTION_TAGNAMES } from '../lib/section-kinds.js';
import { isBodyBookPart } from '../lib/book-regions.js';
import { resolveConfigEnum } from '../lib/config-helpers.js';

// Maps the canonical post-gate tagname to the registry type used for display
// labels. Post-2026-05-25 (the normalize-to-canonical gate): sigil tagnames
// are rewritten to canonical Layer 1 names before this plugin runs, so the
// keys here are the canonical names ('display-math', not '$$').
//
// SHARED-COUNTER CONVENTION: when several tagnames map to the same
// registry-type string, the registry's per-type `entries` Map collects them
// into one sequence and `numberRegistry()` numbers them in document order.
// Example: theorem/lemma/corollary/proposition all map to 'theorem' so they
// share one counter (amsthm "plain" style); math envs (matrix/cases/align/
// eqnarray) all map to 'equation' so they share the equation counter with
// display-math (and with the long-form <math> tag, semantically equivalent).
const NUMBERED_TAGNAMES = new Map([
  // Math (Phase 3 slice 3a, 2026-05-28): five env tags + <math> long-form
  // join the existing display-math entry, all on the shared 'equation'
  // counter. Each env tag's handler-side equation-number rendering is
  // extended in handlers/math.js by the same slice.
  ['display-math', 'equation'],
  ['math',         'equation'],
  ['matrix',       'equation'],
  ['cases',        'equation'],
  ['align',        'equation'],
  ['eqnarray',     'equation'],
  // Theorem family (Phase 3 slice 3a, 2026-05-28): four propositional
  // tagnames share the 'theorem' counter (amsthm "plain" style);
  // <definition> and <example> get their own counters; <remark> and
  // <proof> stay unnumbered (no entries here). The theorem's own
  // rendered HTML does NOT yet show a "Theorem N." label — the
  // schema-dispatch path doesn't consume node.computedNumber for
  // theorem-family tags. Cross-references DO resolve ("Theorem 3")
  // because the registry entry exists. Visible label rendering on the
  // theorem element itself is slice 3b's work (the frameable-class
  // build will surface the title/label/caption rendering shape).
  ['theorem',      'theorem'],
  ['lemma',        'theorem'],
  ['corollary',    'theorem'],
  ['proposition',  'theorem'],
  ['definition',   'definition'],
  ['example',      'example'],
  // Figures and tables — original Phase 1 entries.
  // 'figure' kept as a NUMBERED_TAGNAMES entry for the pre-gate-rewrite
  // path: nodes reach this plugin AFTER normalize-to-canonical, where
  // 'figure' has been rewritten to 'fig'. So in practice the 'figure'
  // entry below is a defensive backstop, not the live path; the live
  // path goes through 'fig'. Both map to the same 'figure' registry-
  // type counter (Phase 3 slice 3b alias-rewrite design).
  ['fig', 'figure'],
  ['figure', 'figure'],
  ['table', 'table'],
  // Phase 3 slice 3b (2026-05-28): the three new frameable members
  // and the four DSL frameable members all share counters with their
  // closest existing peer.
  ['svg',     'figure'],  // <svg> is a frameable, shares figure counter
  ['mermaid', 'figure'],  // external DSL; figure counter (Ariel's ruling)
  ['abc',     'figure'],  // external DSL; figure counter (Ariel's ruling)
  ['diagram', 'figure'],  // #22 slice 3: the diagram host (engine = format word); figure counter
  ['csv',     'table'],   // standalone CSV → table counter (parallel to <table csv>)
  ['tsv',     'table'],   // standalone TSV → table counter (parallel to <table tsv>)
  // <frame> joins NUMBERED_TAGNAMES in slice 3c with opt-in semantics:
  // it only registers when the author writes +numbered (or
  // numbered=true). The DEFAULT_NUMBERED set below lists tagnames
  // whose `numbered` kwarg defaults to FALSE rather than TRUE
  // (slice 3c addition); the visitor consults that set to flip
  // the default. Frame stays unregistered when no +numbered marker
  // is present.
  ['frame',   'figure'],
  // #31: <aside> joins the frameable class with its OWN 'box' counter
  // ("Box N", config key number-boxes, ref-prefix box) — not the figure
  // counter. Unnumbered by default (NUMBERED_DEFAULT_FALSE below); +numbered
  // opts in. Per-type callout numbering ("Note 1"/"Tip 1") is deferred.
  ['aside',   'box'],
  // #115: <minipage> joins the frameable class with its OWN 'minipage' counter
  // ("Minipage N", config key number-minipages, ref-prefix mp) — not the figure
  // counter (Ariel's ruling: a sealed sub-document is distinct from a figure and
  // must not consume document figure numbers). Unnumbered by default
  // (NUMBERED_DEFAULT_FALSE, derived from vocab numbered.default:false); +numbered
  // opts in. Like 'box', it is NOT in SCOPED_COUNTER_TYPES, so it counts flat
  // (globally) even in books. The minipage node's OWN label is what numbers
  // here; its sealed body is opaque (raw source) so the discover walk never
  // descends into it — body floats never reach this counter.
  ['minipage', 'minipage'],
]);

// Phase 3 slice 3c (2026-05-28): registered tagnames whose `numbered` kwarg
// defaults to FALSE rather than the universal TRUE. Most frameables (<fig>/
// <table>/<frame>/<minipage>/…) default numbered, suppressed with -numbered;
// #272 (2026-06-21) moved <frame> and <minipage> to numbered-by-default,
// leaving <aside> (boxed prose callouts) as the lone unnumbered-by-default
// frameable.
//
// #251: derived from the single declared source — the vocab `numbered` default —
// rather than hand-listed. Scoped to NUMBERED_TAGNAMES (the tagnames this plugin
// registers), so an element the vocab marks unnumbered-by-default but that this
// plugin does not register (e.g. <remark>/<proof>, numbered by handlers/theorem.js,
// never entered in NUMBERED_TAGNAMES) is correctly excluded. The set is computed,
// so flipping a member's vocab `numbered.default` is the only edit needed — this
// list updates with no parallel change here.
//
// Visitor logic: for tagnames in this set, an unset `numbered` kwarg
// resolves to false → the entry registers as unnumbered (label-only
// findability if the node has a colon-id) AND, additionally, frames
// without any colon-id-derived label have no reason to be in the
// registry. The visitor short-circuits and skips registration entirely
// when the resolved numbered is false and the node has no id.
const NUMBERED_DEFAULT_FALSE = new Set(
  [...NUMBERED_TAGNAMES.keys()].filter(
    (tagname) => VOCABULARY[tagname]?.enscribe_attributes?.booleans?.numbered?.default === false,
  ),
);

// Maps registry type to the document-level config key that can suppress numbering.
const CONFIG_KEY = {
  equation: 'number-equations',
  figure: 'number-figures',
  table: 'number-tables',
  theorem: 'number-theorems',
  definition: 'number-definitions',
  example: 'number-examples',
  box: 'number-boxes',
  minipage: 'number-minipages',  // #115: <minipage> own counter suppress key
};

// SECTION_TAGNAMES (the three section depths, registered for cross-reference
// lookup — AUD-09) is the single source of truth in lib/section-kinds.js.

// Phase 4 slice 4a (2026-05-29): tagnames whose registry-type counters
// reset at <book-part> boundaries when counter-reset-scope is 'chapter'
// (book default). Section-level reset adds outermost <section> boundaries
// when scope is 'section'. The set defines WHICH counter types respect
// the scope; types not in this set always count globally (today: all
// numbered types respect scope when the document is a book).
const SCOPED_COUNTER_TYPES = new Set([
  'equation', 'figure', 'table',
  'theorem', 'definition', 'example',
]);

// Phase 5 slice (book-side bugfixes, 2026-05-28): only BODY book-parts
// (chapter, part, introduction, conclusion, other — the default region)
// participate in chapter-counter numbering. Front-matter (preface, foreword,
// dedication) and back-matter (appendix, glossary, colophon, afterword)
// book-parts do NOT increment the chapter counter. The body check is
// `isBodyBookPart` from lib/book-regions.js — the complement of FRONT ∪ BACK —
// so this pass and book-structuring's region routing derive from one source
// and can never disagree.
//
// Without this gate, slice 4a's walker treated all `<book-part>`s
// uniformly, so a preface pushed the first chapter to chapter 2 and a
// chapter-prefixed cross-ref to fig:intro rendered as "figure 2.1"
// instead of "figure 1.1" (visible in doc-38's pre-fix HTML snapshot).

/**
 * Resolve the effective counter-reset-scope for a document, per Phase 4
 * slice 4a config knob.
 *
 * Defaults:
 *   - article documents: 'none' (global counters, current behavior)
 *   - book documents:    'chapter' (per-book-part resets)
 *
 * Overrides via <config counter-reset-scope="...">. Valid values:
 * 'none' | 'chapter' | 'section'.
 *
 * @param {Array} treeChildren — root.children
 * @param {Map|null} config
 * @returns {string} 'none' | 'chapter' | 'section'
 */
// counter-reset-scope: none|chapter|section; default chapter for books, none otherwise.
// The shared resolveConfigEnum (F8) does the read + book-default; the allowed set + the
// two defaults are the only per-setting difference from note-scope.
//
// #246/core: chaptered float scope ('chapter') only makes sense when chapters are NUMBERED — the float
// prefix IS the chapter number. With heading numbering off (the default since the numbering-default
// slice), a book's bookDefault falls back to 'none' so floats number flat ("Figure 1, 2, 3"), not
// "Figure 1.1" against a chapter number that no longer renders. An explicit <config counter-reset-scope=…>
// still wins (an author can force chaptered floats); only the DEFAULT follows the heading scheme.
const COUNTER_RESET_SCOPES = new Set(['none', 'chapter', 'section']);
function resolveCounterResetScope(treeChildren, config) {
  const bookDefault = resolveNumberSections(treeChildren, config) ? 'chapter' : 'none';
  return resolveConfigEnum(treeChildren, config, 'counter-reset-scope', COUNTER_RESET_SCOPES, bookDefault, 'none');
}

/**
 * Unified plugin. Registers display-math, figure, table, and section nodes in
 * the document registry and stores pending { node, entry } pairs in
 * file.data.enscribeNumberingPending. Does NOT assign computedNumber —
 * call fillNumbering(file) after registry.numberRegistry() runs.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeNumbering() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    const config = file?.data?.[ENSCRIBE_CONFIG] ?? null;
    const pending = [];

    const visitors = new Map();

    // Visitors for numbered element types ($$, figure, table).
    for (const [tagname, registryType] of NUMBERED_TAGNAMES) {
      visitors.set(tagname, (node) => {
        const configKey = CONFIG_KEY[registryType];
        // Phase 3 slice 3c (2026-05-28): tagnames in NUMBERED_DEFAULT_FALSE
        // (today: <frame>) default to numbered=false. Authors opt IN with
        // +numbered / numbered=true. For those tags, also skip
        // registration entirely when the resolved numbered is false AND
        // the node has no id — without an id, an unnumbered registry
        // entry has no findability use, and pollutes the registry's
        // figure-type entry list with no-op entries that throw off
        // sibling fixtures' counts.
        const isDefaultFalse = NUMBERED_DEFAULT_FALSE.has(tagname);
        const defaultNumbered = !isDefaultFalse;
        const numbered = readBoolKwarg(
          node, 'numbered', config, configKey, defaultNumbered,
        );
        if (isDefaultFalse && !numbered && !node.id) {
          return;
        }
        const entry = registry.assign(
          registryType,
          node.id || null,
          { numbered, data: {} },
        );
        node.registryType = registryType;  // used by compile-time handlers
        // computedNumber is set later by fillNumbering(), after numberRegistry() runs.
        pending.push({ node, entry });
      });
    }

    // Visitors for section types. Sections are registered with numbered: false —
    // they become findable by label for <ref #sec:...> but are not sequentially
    // numbered through the registry (AUD-09 fix, sections only). The title is stored so a `<ref>` to an
    // UNnumbered section renders the section's title rather than its id-tail (#246/core).
    for (const tagname of SECTION_TAGNAMES) {
      visitors.set(tagname, (node) => {
        registry.assign('section', node.id || null, { numbered: false, data: { title: structuralTitleText(node) } });
      });
    }

    // Visitor for book-parts (chapters / parts / appendices). Registered numbered:false with their
    // title so a cross-ref to a chapter RESOLVES even when section numbering is off (#246/core: a
    // `<ref @ch:methods>` then shows "Methods", not a ref-error). When numbering is ON, numberSections
    // (#57 Layer 2) stamps the chapter/appendix number onto this same entry. Registering here (not only
    // on-demand in stampSection) is what keeps unnumbered chapter refs from breaking.
    visitors.set('book-part', (node) => {
      registry.assign('book-part', node.id || null, { numbered: false, data: { title: structuralTitleText(node) } });
    });

    // Visitor for code-block nodes (canonical tagname 'code-block'; the gate
    // rewrites the sigil ```' to its canonical name before this plugin runs).
    // Code blocks are registered with numbered: false — they become findable
    // by colon-label for <ref @code:snippet> but are not sequentially
    // numbered (G4, PG-6).
    //
    // DELIBERATE REVERSIBLE CHOICE (G4 chat session, 2026-05-23): code blocks
    // are unnumbered. Switching to numbered listings later means changing
    // `numbered: false` to `numbered: true` here, adding `'code-block'` to
    // NUMBERED_TAGNAMES, and adding a CONFIG_KEY entry for 'code' — the same
    // mechanism figures and tables already use.
    visitors.set('code-block', (node) => {
      registry.assign('code', node.id || null, { numbered: false, data: {} });
    });

    // Phase 4 slice 4a (2026-05-29): for books / scoped documents, use a
    // custom walker that tracks the current chapter index and section
    // index, stamping each registered entry's `data.scope` with that
    // context. For articles (scope === 'none'), use the existing
    // discover() walk — no scope tracking, no behavior change.
    const scope = resolveCounterResetScope(tree.children, config);
    if (scope === 'none') {
      discover(tree, visitors);
    } else {
      walkWithScope(tree.children ?? [], visitors, scope);
    }

    if (file?.data) {
      file.data[ENSCRIBE_NUMBERING_PENDING] = pending;
      file.data.enscribeCounterResetScope = scope;
    }
  };
}

/**
 * Phase 4 slice 4a (2026-05-29): scope-aware tree walker. Like discover(),
 * but tracks two contextual counters during the walk:
 *
 *   - chapterIndex: incremented on entering each top-level <book-part>
 *                   (i.e. the outermost book-part being walked into; nested
 *                   parts-containing-chapters use the outermost's index).
 *   - sectionIndex: incremented on entering each outermost <section>
 *                   within the current chapter (book-part), reset to 0
 *                   on each chapter change. Only consulted when
 *                   scope === 'section'.
 *
 * Visitors are called with the node only (matching discover()'s contract);
 * the scope information is attached to the registered entry via the
 * shared `currentScope` closure variable that the visitor closes over.
 * We expose it on `walkWithScope.current` (a module-level reference)
 * before each visitor call so visitors can grab it without changing
 * their signature.
 *
 * @param {Array} nodes
 * @param {Map<string, function>} visitors
 * @param {string} scope — 'chapter' | 'section'
 */
function walkWithScope(nodes, visitors, scope) {
  let chapterIndex = 0;
  let sectionIndex = 0;
  let insideBookPart = false;
  let insideSection = false;

  // Module-level "current scope" the visitor reads. Use the visitors Map's
  // sentinel slot — visitors are functions that close over this enclosing
  // scope through walkWithScope's outer `pending`/`registry`. Since the
  // visitor closures are built in enscribeNumbering(), we rebind them
  // here to wrap them with scope-stamping behavior.
  const wrappedVisitors = new Map();
  for (const [tagname, fn] of visitors) {
    wrappedVisitors.set(tagname, (node) => {
      // Run the original visitor (which calls registry.assign and pushes
      // a pending entry whose entry.data is shared with the registry
      // entry). After the call, the most-recently-pushed entry's data
      // gets the scope stamp.
      fn(node);
      // The visitor's registry.assign produces the entry that just got
      // pushed to `pending`. We can't easily reach into pending here, but
      // we can stash a scope marker on the node itself; the post-pass
      // copies node._scope to entry.data.scope.
      node._scope = { chapter: chapterIndex, section: sectionIndex };
    });
  }

  function visit(node) {
    if (node == null) return;

    // Entering a top-level book-part: increment chapterIndex (only for
    // body-type book-parts — see isBodyBookPart / lib/book-regions.js) and reset
    // sectionIndex. Nested book-parts (parts containing chapters) do NOT
    // get their own chapter index — they use the outermost's index, so
    // figures inside <part 1><chapter 1> count as chapter 1 figures.
    //
    // Front-matter (preface/foreword/dedication) and back-matter
    // (appendix/glossary/colophon) book-parts don't increment the
    // chapter counter — their content gets scope.chapter=0 (no
    // chapter-prefix in cross-refs; sequential global counter in
    // fillNumbering's per-group renumber). Pre-2026-05-28 behavior
    // incremented for all book-parts uniformly, which produced wrong
    // chapter-prefixed cross-ref text (doc-38's "figure 2.1" for
    // fig:intro that should have been "figure 1.1").
    let enteredBookPart = false;
    let enteredSection = false;
    if (isEnscribeTag(node) && node.tagname === 'book-part' && !insideBookPart) {
      const partType = node.kwargs?.type ?? 'other';
      if (isBodyBookPart(partType)) {
        chapterIndex += 1;
        sectionIndex = 0;
      }
      // insideBookPart guards against nested book-parts double-
      // incrementing — flip it regardless of part-type so a body
      // chapter inside a front-matter region still doesn't increment
      // a second time on entry (edge case; not authored today, but
      // the guard is the right shape).
      insideBookPart = true;
      enteredBookPart = true;
    } else if (
      isEnscribeTag(node) && node.tagname === 'section' &&
      !insideSection && scope === 'section'
    ) {
      sectionIndex += 1;
      insideSection = true;
      enteredSection = true;
    }

    if (isEnscribeTag(node)) {
      const visitor = wrappedVisitors.get(node.tagname);
      if (visitor) visitor(node);
      if (Array.isArray(node.content) && !node.isOpaqueContent) {
        for (const child of node.content) visit(child);
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) visit(child);
    }

    if (enteredBookPart) insideBookPart = false;
    if (enteredSection) insideSection = false;
  }

  for (const root of nodes) visit(root);
}

/**
 * Fill computedNumber on each pending node from the registry entry.
 *
 * Must be called after registry.numberRegistry() has run. Reads
 * file.data.enscribeNumberingPending and sets node.computedNumber = entry.number
 * (a positive integer for numbered entries, null for unnumbered).
 *
 * Phase 4 slice 4a (2026-05-29): when the document's counter-reset-scope
 * is 'chapter' or 'section', renumbers entries within each scope before
 * filling. The visitor (walkWithScope) stamped each node with `_scope =
 * { chapter, section }`; we group entries by (type, scope) and assign
 * 1-based per-group numbers. The entry's data.scope is preserved so
 * ref-resolution can render prefix paths ("Figure 1.3").
 *
 * For 'none' scope (default for articles), the original global numbering
 * stands — no renumbering happens.
 *
 * @param {import('vfile').VFile} file
 */
export function fillNumbering(file) {
  const pending = file?.data?.[ENSCRIBE_NUMBERING_PENDING] ?? [];
  const scope = file?.data?.enscribeCounterResetScope ?? 'none';

  if (scope === 'none') {
    for (const { node, entry } of pending) {
      node.computedNumber = entry.number;
    }
    return;
  }

  // Scoped: renumber per (registryType, scope-key) group.
  // First, propagate node._scope onto entry.data.scope so ref-resolution
  // can access it (entries are reachable from the registry's label
  // index by colon-id).
  for (const { node, entry } of pending) {
    if (node._scope) {
      entry.data = entry.data || {};
      entry.data.scope = node._scope;
    }
  }

  // Group pending entries by registry type, then by scope-key. Only
  // scoped-counter types get renumbered; other types (sections, etc.)
  // keep their global numbering.
  const groups = new Map(); // `${type}|${chapter}|${section}` → entries[]
  for (const p of pending) {
    if (!p.entry.numbered) continue;
    const type = p.entry.type;
    if (!SCOPED_COUNTER_TYPES.has(type)) continue;
    const sc = p.entry.data?.scope ?? { chapter: 0, section: 0 };
    const scopeKey = scope === 'chapter'
      ? `${type}|${sc.chapter}`
      : `${type}|${sc.chapter}|${sc.section}`;
    if (!groups.has(scopeKey)) groups.set(scopeKey, []);
    groups.get(scopeKey).push(p);
  }

  // Renumber each group 1-based in document order (pending preserves
  // document order).
  for (const entries of groups.values()) {
    let n = 0;
    for (const p of entries) {
      n += 1;
      p.entry.number = n;
    }
  }

  // Fill computedNumber on nodes from (now-renumbered) entries.
  for (const { node, entry } of pending) {
    node.computedNumber = entry.number;
  }
}

// ─── Section numbering (#57) ─────────────────────────────────────────────────
//
// Optional hierarchical section numbering, computed at build time so the number
// is REAL content (cross-refs render it, JATS carries it, no-JS/archival readers
// see it) — not a CSS counter. Gated by the `number-sections` config key:
// default OFF for articles (preserves byte-identical unnumbered output) and ON
// for books ("2.1 Methods" is standard). When off, numberSections is a no-op, so
// nothing is stamped and emission is unchanged.
//
// The number is a dotted hierarchical string ("3.1.2") — the CANONICAL number.
// Body sections: top component is the section index (articles) or the chapter
// index (books, so "3.1" = chapter 3 §1). It is stamped on the section node (for
// the JATS <sec><label>) AND its title child (for the HTML span via schemaDispatch),
// and written onto the section's registry entry (so cross-refs render it via the
// existing computeRefText — one registry, one source of truth). Presentation
// (separators, "Chapter N" framing) is the theme's job.

const SECTION_TAG_SET = new Set(SECTION_TAGNAMES);

/** Structural children of a node (enscribeTag content, or mdast children). */
function structuralChildren(node) {
  if (Array.isArray(node?.content)) return node.content;
  if (Array.isArray(node?.children)) return node.children;
  return [];
}

function findRegionChild(node, tagname) {
  return structuralChildren(node).find((c) => isEnscribeTag(c, tagname)) ?? null;
}

/** Concatenated text of a node's content (string, or inline/structural array). */
function nodeText(node) {
  if (node == null) return '';
  if (node.type === 'text') return node.value ?? '';
  if (typeof node.content === 'string') return node.content;
  const kids = Array.isArray(node.content) ? node.content : (node.children ?? []);
  return kids.map(nodeText).join('');
}

/**
 * The heading element of a section / book-part: the `${tagname}-title` child — a DIRECT child for a
 * section, or (book-parts) one inside the synthesized `<meta>`. Single source of truth for both
 * stampSection (which writes the number onto it) and the cross-ref title fallback below.
 */
function findTitleNode(node) {
  const titleTag = `${node.tagname}-title`;
  const kids = structuralChildren(node);
  let title = kids.find((c) => isEnscribeTag(c, titleTag));
  if (!title) {
    const meta = kids.find((c) => isEnscribeTag(c, 'meta'));
    if (meta) title = structuralChildren(meta).find((c) => isEnscribeTag(c, titleTag));
  }
  return title ?? null;
}

/** A section / book-part's title text, or null — the cross-ref label when the heading is unnumbered
 *  (#246/core: numbering is opt-in, so a `<ref>` to an unnumbered heading shows its title). */
function structuralTitleText(node) {
  const title = findTitleNode(node);
  if (!title) return null;
  const text = nodeText(title).replace(/\s+/g, ' ').trim();
  return text || null;
}

/**
 * Resolve whether section/heading numbering is on. **Default OFF for every document type**
 * (#246/core) — an author opts IN with `<config number-sections>` (or `=true`). Previously books
 * defaulted ON via a `<book>` heuristic; that heuristic is removed, so a book now renders headings
 * unnumbered unless the document asks for numbers. Float numbering (figures / tables / equations) is
 * independent and stays ON. When a heading is unnumbered, a `<ref>` to it falls back to the heading's
 * TITLE (see computeRefText), so section/book-part registry entries carry their title text for that purpose.
 *
 * (A website composes one page at a time — each page numbers NATIVELY through this same resolver, an
 * article as an article and a book page as a book; #320. Website-wide heading opt-in still waits on
 * master `<config>` threading into the page pass — the tracked follow-on — so a website's pages are
 * unnumbered until each page asks for numbers.)
 */
function resolveNumberSections(treeChildren, config) {
  const cv = config?.get?.('number-sections');
  return cv === true || cv === 'true';
}

/**
 * Resolve the deepest heading level that receives a number (#218). Config `number-depth`
 * (a non-negative integer); default ALL levels (Infinity). INDEPENDENT of `toc-depth`
 * (which bounds the contents LISTING, in the compiler) — a heading may be numbered but not
 * listed, or listed but not numbered. For a book the chapter/appendix heading is level 1
 * and its sections level 2 (so number-depth=2 numbers chapters + their direct sections).
 */
function resolveNumberDepth(config) {
  const n = parseInt(config?.get?.('number-depth'), 10);
  return Number.isFinite(n) && n >= 0 ? n : Infinity;
}

/**
 * Stamp a section's computed number on the node (for JATS), on its title child
 * (for HTML schemaDispatch), and on its registry entry (for cross-refs).
 */
function stampSection(node, num, registry) {
  node.computedSectionNumber = num;
  // The heading element is `${tagname}-title` — section-title / sub-section-title
  // / sub-sub-section-title (a direct child of the section), and (Layer 2)
  // book-part-title for a numbered chapter or appendix (which lives inside the
  // book-part's synthesized <meta>, not as a direct child). The guarded
  // schemaDispatch span renders the number there.
  const titleTag = `${node.tagname}-title`;
  const kids = structuralChildren(node);
  let title = kids.find((c) => isEnscribeTag(c, titleTag));
  if (!title) {
    const meta = kids.find((c) => isEnscribeTag(c, 'meta'));
    if (meta) title = structuralChildren(meta).find((c) => isEnscribeTag(c, titleTag));
  }
  if (title) title.computedSectionNumber = num;
  if (node.id) {
    let entry = registry.findByLabel(node.id);
    // Sections already have a (numbered:false) registry entry from the numbering
    // visitor; book-parts do NOT (#57 Layer 2 registers them here so cross-refs
    // resolve). Create the entry on demand for book-parts.
    if (!entry && node.tagname === 'book-part') {
      entry = registry.assign('book-part', node.id, { numbered: false, data: {} });
    }
    if (entry) entry.number = num; // a string ("1" / "A" / "3.1.2"); computeRefText renders it
  }
}

/**
 * Number a level of the section tree. `prefix` is the parent's number ('' at the
 * article top level, the chapter index for a book chapter, a letter for an
 * appendix — Layer 2). Recurses into each section's nested sub-sections.
 */
function numberSectionLevel(nodes, prefix, registry, maxDepth = Infinity, level = 1) {
  if (level > maxDepth) return; // #218 number-depth: this level (and deeper) is past the cutoff.
  let i = 0;
  for (const n of nodes) {
    if (isEnscribeTag(n) && SECTION_TAG_SET.has(n.tagname)) {
      // #218 +unnumbered: outside the numbered sequence — no number, the counter does NOT advance
      // (the next numbered sibling continues unbroken), and the subtree is unnumbered (not recursed).
      if (n.booleans?.unnumbered) continue;
      i += 1;
      const num = prefix ? `${prefix}.${i}` : String(i);
      stampSection(n, num, registry);
      numberSectionLevel(structuralChildren(n), num, registry, maxDepth, level + 1);
    }
  }
}

/**
 * Section-numbering pass. Runs after numberRegistry()/fillNumbering() (so the
 * section registry entries exist) and before ref-resolution (so cross-refs see
 * the numbers). No-op when numbering is off.
 *
 * @param {import('mdast').Root} tree
 * @param {import('vfile').VFile} file
 */
export function numberSections(tree, file) {
  const config = file?.data?.[ENSCRIBE_CONFIG] ?? null;
  if (!resolveNumberSections(tree.children, config)) return;
  const registry = ensureRegistry(file);
  const maxDepth = resolveNumberDepth(config); // #218: deepest numbered level; default Infinity (all).

  const docRoot = (tree.children ?? []).find(
    (c) => isEnscribeTag(c, 'article') || isEnscribeTag(c, 'book'),
  );
  if (!docRoot) return;

  // A top book-part heading (chapter / appendix / article-appendix) is level 1, its sections level 2.
  // #218: skip a `+unnumbered` part (no label, the counter does NOT advance — caller `continue`s
  // before the idx bump); number the heading only within number-depth (level 1 ≤ maxDepth); its
  // sections recurse at level 2 (so number-depth=2 numbers chapters + their direct sections).
  const numberBookPart = (part, label) => {
    if (maxDepth >= 1) stampSection(part, label, registry);
    numberSectionLevel(structuralChildren(part), label, registry, maxDepth, 2);
  };

  if (isEnscribeTag(docRoot, 'article')) {
    const body = findRegionChild(docRoot, 'article-body');
    if (body) numberSectionLevel(structuralChildren(body), '', registry, maxDepth, 1);
    // #100: article appendices (book-part-type="appendix" in <article-back>, the
    // article projection of <appendix>) join #57's appendix letter scheme — `A`,
    // `A.1` — exactly as book-back appendices do below. Same stamp + section
    // prefix, so "Appendix A" cross-references resolve identically.
    const articleBack = findRegionChild(docRoot, 'article-back');
    if (articleBack) {
      let appendixIdx = 0;
      for (const part of structuralChildren(articleBack)) {
        if (!isEnscribeTag(part, 'book-part')) continue;
        if ((part.kwargs?.type ?? 'other') !== 'appendix') continue;
        if (part.booleans?.unnumbered) continue; // #218: outside the sequence — no letter, no advance.
        const letter = String.fromCharCode(65 + appendixIdx); // A, B, C, …
        appendixIdx += 1;
        numberBookPart(part, letter);
      }
    }
    return;
  }

  // Book: number every book-part heading (#57 Layer 2). Body book-parts
  // (chapters) get an arabic number; the same index prefixes their sections
  // ("3.1"). Book-back appendices get an alphabetic letter; the letter prefixes
  // their sections ("A.1"). Front-matter and non-appendix back-matter
  // (preface / glossary / colophon / …) are conventionally unnumbered, so they
  // are left alone.
  const body = findRegionChild(docRoot, 'book-body');
  if (body) {
    let chapterIdx = 0;
    for (const part of structuralChildren(body)) {
      if (!isEnscribeTag(part, 'book-part')) continue;
      const partType = part.kwargs?.type ?? 'other';
      if (!isBodyBookPart(partType)) continue;
      if (part.booleans?.unnumbered) continue; // #218: +unnumbered chapter — no number, no advance.
      chapterIdx += 1;
      numberBookPart(part, String(chapterIdx)); // chapter number → its sections "N.1"
    }
  }

  const back = findRegionChild(docRoot, 'book-back');
  if (back) {
    let appendixIdx = 0;
    for (const part of structuralChildren(back)) {
      if (!isEnscribeTag(part, 'book-part')) continue;
      if ((part.kwargs?.type ?? 'other') !== 'appendix') continue;
      if (part.booleans?.unnumbered) continue; // #218: outside the sequence — no letter, no advance.
      const letter = String.fromCharCode(65 + appendixIdx); // A, B, C, …
      appendixIdx += 1;
      numberBookPart(part, letter); // appendix letter → its sections "A.1"
    }
  }
}
