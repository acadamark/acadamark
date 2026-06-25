// Single source of truth for the DOCUMENT-CLASS classification rule.
//
// `<meta type>` declares the document class (article / book / book-part / website). The rule —
// find the first `<meta>` node, read `type`, validate against the vocab-declared set, fall back to
// the default — used to be re-implemented independently at ~6 sites (only doc-type.js validated;
// static-website.js even read the RAW source with a regex that could not skip a `<meta>` inside a
// code example). This is its ONE home (1-C from #316): a pure classifier over a PARSED tree —
// **no VFile**, which is exactly why the pre-pipeline sites that hold only a tree or a source
// string can use it. The explicit-unknown WARNING stays in the enscribeDocTypeResolve plugin,
// which calls this for the rule; this module owns the rule + the declared set, nothing else.
//
// Sibling to section-kinds.js / book-regions.js (the other vocab-derived single-sources) and shared
// the same way — an explicit `./interpreter/lib/...` subpath export — NOT core/, which is vocab-free
// (this needs the vocabulary). The declared set / default are DERIVED from the vocab (meta.md's
// `type` kwarg, the single source) and tied to the engine's handled classes by a load-time EQUALITY
// assertion (the section-kinds.js pattern, coding-conventions §2/§3): if the vocab gains or drops a
// class, this fails loud at LOAD rather than silently classifying a class no structuring/dispatch
// handles.

import { VOCABULARY } from '@enscribejs/layer1-vocabulary';
import { isEnscribeTag } from '../../core/tag.js';

const META_TYPE = VOCABULARY?.meta?.enscribe_attributes?.kwargs?.type ?? {};

/** The declared document classes, derived from the vocab `<meta type>` kwarg (the single source). */
export const DOC_TYPES = Object.freeze(new Set(META_TYPE.values ?? ['article']));

/** The default class when `<meta type>` is absent — the normal article case (no diagnostic). */
export const DEFAULT_DOC_TYPE = META_TYPE.default ?? 'article';

// The classes the engine's structuring + live-dispatch are built around (article → article-structuring,
// book / book-part → book-structuring, website → website-structuring + the browser 3-way mount). Asserted
// EQUAL to the vocab-derived DOC_TYPES at load, both directions — so a vocab change that adds or drops a
// class surfaces HERE as a build-time error (the place to decide whether the new class is handled) instead
// of silently passing validation while no plugin handles it. (The section-kinds.js drift guard.)
const HANDLED_DOC_TYPES = ['article', 'book', 'book-part', 'website'];
{
  const equal = DOC_TYPES.size === HANDLED_DOC_TYPES.length
    && HANDLED_DOC_TYPES.every((t) => DOC_TYPES.has(t));
  if (!equal) {
    throw new Error(
      `classify-doc-type: vocab <meta type> set {${[...DOC_TYPES].join(', ')}} != the engine's handled ` +
      `set {${HANDLED_DOC_TYPES.join(', ')}} — a class was added to or removed from the vocabulary; wire ` +
      `it through the structuring/dispatch (or update HANDLED_DOC_TYPES) before shipping.`,
    );
  }
  if (!DOC_TYPES.has(DEFAULT_DOC_TYPE)) {
    throw new Error(
      `classify-doc-type: default '${DEFAULT_DOC_TYPE}' is not in the declared set {${[...DOC_TYPES].join(', ')}}.`,
    );
  }
}

/**
 * Classify a parsed document tree by its `<meta type>`. The ONE rule: find the first `<meta>`
 * enscribeTag among the tree's top-level children, read `type`, validate against DOC_TYPES, fall
 * back to DEFAULT_DOC_TYPE. Pure — no VFile, no mutation. The caller decides what to do with the
 * result (write file.data, route a live dispatch, refuse a JATS export); the explicit-unknown
 * WARNING lives in the enscribeDocTypeResolve plugin, which reads `raw`/`known` from here to emit it.
 *
 * @param {import('mdast').Root} tree - a PARSED tree (`<meta>` is a top-level child; pre-structuring).
 * @returns {{ type: string, raw: string|null, known: boolean, metaNode: object|null }}
 *   `type` is the normalized (validated + fallback) class; `raw` is the verbatim kwarg (null if there
 *   is no `<meta>` or no `type`); `known` is whether `raw` is a declared class; `metaNode` is the node.
 */
export function classifyDocType(tree) {
  const metaNode = (tree?.children ?? []).find((n) => isEnscribeTag(n, 'meta')) ?? null;
  const raw = metaNode?.kwargs?.type ?? null;
  const known = raw != null && DOC_TYPES.has(raw);
  return { type: known ? raw : DEFAULT_DOC_TYPE, raw, known, metaNode };
}

/**
 * Source-string adapter for the sites that hold a source but no parsed tree yet: `proc.parse(source)`
 * → the tree classifier. `proc.parse` needs NO VFile, which is the whole reason a pre-pipeline site
 * can classify without a pipeline run.
 *
 * @param {string} source - enscribe/markdown source.
 * @param {{ parse: (s: string) => import('mdast').Root }} proc - a configured pipeline (uses its `.parse`).
 * @returns {{ type: string, raw: string|null, known: boolean, metaNode: object|null }} see classifyDocType.
 */
export function classifyDocTypeFromSource(source, proc) {
  return classifyDocType(proc.parse(source));
}
