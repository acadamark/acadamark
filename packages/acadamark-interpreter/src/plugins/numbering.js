// Numbering plugin — register display-math, figure, table, and section nodes;
// fill display numbers.
//
// Runs after acadamarkNotes (notes claim their positions first). Uses the shared
// discover() walk to visit the full mdast tree in document order and register:
//
//   Numbered elements ($$, figure, table):
//     - Calls registry.assign(type, id, { numbered }) to record the entry
//     - Sets node.registryType = 'equation' | 'figure' | 'table' (used by handlers)
//     - Pushes { node, entry } into file.data.acadamarkNumberingPending
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
//   - Reads acadamarkNumberingPending and sets node.computedNumber from entry.number

import { ensureRegistry } from 'acadamark-core/registry';
import { discover } from 'acadamark-core/walkers/discover';
import { ACADAMARK_CONFIG, ACADAMARK_NUMBERING_PENDING } from 'acadamark-core/file-data-keys';
import { readBoolKwarg } from '../lib/bool-kwarg.js';
import { isAcadamarkTag } from '../lib/ast-helpers.js';

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
]);

// Phase 3 slice 3c (2026-05-28): tagnames whose `numbered` kwarg
// defaults to FALSE rather than the universal TRUE. Today only
// <frame> (per frame.md's vocab default: numbered: false). Other
// frameables (<fig>, <table>, etc.) default to numbered=true; their
// authors suppress with -numbered per-instance.
//
// Visitor logic: for tagnames in this set, an unset `numbered` kwarg
// resolves to false → the entry registers as unnumbered (label-only
// findability if the node has a colon-id) AND, additionally, frames
// without any colon-id-derived label have no reason to be in the
// registry. The visitor short-circuits and skips registration entirely
// when the resolved numbered is false and the node has no id.
const NUMBERED_DEFAULT_FALSE = new Set(['frame']);

// Maps registry type to the document-level config key that can suppress numbering.
const CONFIG_KEY = {
  equation: 'number-equations',
  figure: 'number-figures',
  table: 'number-tables',
  theorem: 'number-theorems',
  definition: 'number-definitions',
  example: 'number-examples',
};

// Section tagnames registered for cross-reference lookup (AUD-09).
const SECTION_TAGNAMES = ['section', 'sub-section', 'sub-sub-section'];

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
function resolveCounterResetScope(treeChildren, config) {
  const configValue = config?.get?.('counter-reset-scope');
  if (configValue === 'none' || configValue === 'chapter' || configValue === 'section') {
    return configValue;
  }
  // Look for <book> at root; if present, default to chapter scope.
  for (const child of treeChildren ?? []) {
    if (isAcadamarkTag(child) && child.tagname === 'book') return 'chapter';
  }
  return 'none';
}

/**
 * Unified plugin. Registers display-math, figure, table, and section nodes in
 * the document registry and stores pending { node, entry } pairs in
 * file.data.acadamarkNumberingPending. Does NOT assign computedNumber —
 * call fillNumbering(file) after registry.numberRegistry() runs.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkNumbering() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    const config = file?.data?.[ACADAMARK_CONFIG] ?? null;
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
    // numbered through the registry (AUD-09 fix, sections only).
    for (const tagname of SECTION_TAGNAMES) {
      visitors.set(tagname, (node) => {
        registry.assign('section', node.id || null, { numbered: false, data: {} });
      });
    }

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
      file.data[ACADAMARK_NUMBERING_PENDING] = pending;
      file.data.acadamarkCounterResetScope = scope;
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
  // visitor closures are built in acadamarkNumbering(), we rebind them
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

    // Entering a top-level book-part: increment chapterIndex, reset
    // sectionIndex. Nested book-parts (parts containing chapters) do NOT
    // get their own chapter index — they use the outermost's index, so
    // figures inside <part 1><chapter 1> count as chapter 1 figures.
    let enteredBookPart = false;
    let enteredSection = false;
    if (isAcadamarkTag(node) && node.tagname === 'book-part' && !insideBookPart) {
      chapterIndex += 1;
      sectionIndex = 0;
      insideBookPart = true;
      enteredBookPart = true;
    } else if (
      isAcadamarkTag(node) && node.tagname === 'section' &&
      !insideSection && scope === 'section'
    ) {
      sectionIndex += 1;
      insideSection = true;
      enteredSection = true;
    }

    if (isAcadamarkTag(node)) {
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
 * file.data.acadamarkNumberingPending and sets node.computedNumber = entry.number
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
  const pending = file?.data?.[ACADAMARK_NUMBERING_PENDING] ?? [];
  const scope = file?.data?.acadamarkCounterResetScope ?? 'none';

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
