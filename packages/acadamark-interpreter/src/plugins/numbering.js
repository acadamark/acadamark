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
  ['figure', 'figure'],
  ['table', 'table'],
]);

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
        const numbered = readBoolKwarg(node, 'numbered', config, configKey, true);
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

    discover(tree, visitors);

    if (file?.data) {
      file.data[ACADAMARK_NUMBERING_PENDING] = pending;
    }
  };
}

/**
 * Fill computedNumber on each pending node from the registry entry.
 *
 * Must be called after registry.numberRegistry() has run. Reads
 * file.data.acadamarkNumberingPending and sets node.computedNumber = entry.number
 * (a positive integer for numbered entries, null for unnumbered).
 *
 * @param {import('vfile').VFile} file
 */
export function fillNumbering(file) {
  for (const { node, entry } of file?.data?.[ACADAMARK_NUMBERING_PENDING] ?? []) {
    node.computedNumber = entry.number;
  }
}
