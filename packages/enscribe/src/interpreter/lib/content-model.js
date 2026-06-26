// Content-model classification — the #326 single-paragraph wrapping gate's
// data source.
//
// Per `notes/specs/shape-tokens.md` §"Content model and single-paragraph
// wrapping", an element's `content.shape.contains` array IS its content model
// (read as "what it holds"):
//   - phrasing  — `[inline]` (inline only): a <p> is INVALID inside, so a
//     single-paragraph pipe body must UNWRAP to inline children (correctness).
//   - flow      — includes `block`, not `inline` (e.g. `[block]`): a <p> is
//     valid, so a single-paragraph pipe body WRAPS in <p> for consistency with
//     the multi-paragraph case (the #326 decision).
//   - tight/loose — `[inline, block]` (both, e.g. `<item>`): single stays bare.
//
// FLOW_TAGNAMES is the set of tagnames whose content model is flow. It is the
// single signal the parse-time central unwrap (`parser/recursive-content.js`
// `extractFromRoot`) consults: a flow tagname KEEPS its single paragraph;
// everything else unwraps (the prior unconditional behavior). The set is
// DERIVED from the vocabulary — there is no second, hand-maintained list — so
// adding `content.shape.contains` to an element is the only edit needed to
// change its wrapping. The parser stays vocab-agnostic: this set is computed
// here (interpreter band, where VOCABULARY is available) and passed into
// remarkRecursiveContent as an option.
//
// Note on the source-position vs content-model overload (shape-tokens.md):
// `<note>` SITS inline (a marker) but HOLDS block — its `contains: [block]`
// is the "holds" reading, which is the one the wrapping decision needs, so
// `note` is correctly flow here and wraps.

import { VOCABULARY } from '@enscribejs/layer1-vocabulary';

/**
 * Tagnames whose content model is flow (a <p> is valid inside, a bare inline
 * phrase is not) — derived from `content.shape.contains`. Shorthand aliases
 * share their target's spec object, so they classify identically.
 *
 * @type {Set<string>}
 */
export const FLOW_TAGNAMES = new Set(
  Object.entries(VOCABULARY)
    .filter(([, spec]) => {
      const contains = spec?.content?.shape?.contains;
      return (
        Array.isArray(contains) &&
        contains.includes('block') &&
        !contains.includes('inline')
      );
    })
    .map(([tagname]) => tagname),
);
