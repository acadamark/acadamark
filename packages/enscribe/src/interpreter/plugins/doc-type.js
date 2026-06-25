// Slice A: resolve the document class ONCE, before the structuring plugins.
//
// `<meta type>` declares the document class (article / book / book-part / website). It used to be
// read ad-hoc at three sites as `metaNode?.kwargs?.type ?? 'article'` with no validation
// — an *explicitly-set* unknown type (`slides`, a typo) silently rendered as an article,
// no diagnostic. This plugin resolves it once: find `<meta>`, read `type`, validate it
// against the set `meta.md` declares, warn + fall back to `article` on an explicit
// unknown, and store the result on `file.data[ENSCRIBE_DOC_TYPE]`. The structuring
// plugins (and the gate's book-context detection) consume that resolved value; the
// `<book>` / `<article>` wrapper they build is the derived artifact every downstream
// consumer (numbering, ToC, JATS export) keys off.
//
// Absent `<meta type>` is the normal article case → silent `article`, no warning. This
// runs BEFORE enscribeNormalizeToCanonical (which reads the class to gate book-part
// shorthand expansion), so the resolved value is on `file.data` for every later reader.

import { classifyDocType, DOC_TYPES, DEFAULT_DOC_TYPE } from '../lib/classify-doc-type.js';
import { ENSCRIBE_DOC_TYPE } from '../../core/file-data-keys.js';

// The classification RULE (find `<meta>`, read `type`, validate against the vocab-declared set, fall
// back to the default) + the declared set / default now live in the ONE shared home,
// classify-doc-type.js (1-C from #316), which every other site uses too. This plugin keeps the two
// things that are plugin-specific: the explicit-unknown DIAGNOSTIC and the `file.data` write.

/**
 * Resolve the document class from `<meta type>` exactly once, onto
 * `file.data[ENSCRIBE_DOC_TYPE]`. Delegates the rule to the shared classifier; owns the warning.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeDocTypeResolve() {
  return function docTypeResolve(tree, file) {
    const { type, raw, known, metaNode } = classifyDocType(tree);
    if (raw != null && !known) {
      // An explicit, undeclared type (`slides`, `dashboard`, a typo): warn and fall back to the
      // default (the classifier already did the fallback). Mirrors the book-part-type validator.
      file?.message?.(
        `<meta type="${raw}">: unknown document type — expected one of: ` +
          `${[...DOC_TYPES].join(', ')}. Rendering as ${DEFAULT_DOC_TYPE}.`,
        metaNode,
        'doc-type-resolve:unknown-type',
      );
    }
    if (file?.data) file.data[ENSCRIBE_DOC_TYPE] = type;
    // (#300/#299 slice 1) The page-slug is no longer exposed here: the dead `ENSCRIBE_PAGE_SLUG`
    // derivation (set, read by nobody) was retired in favour of the ONE three-tier resolver
    // (resolvePageSlug in website-structuring.js), which the static build reads directly.
  };
}
