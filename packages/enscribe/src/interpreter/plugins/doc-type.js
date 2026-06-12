// Slice A: resolve the document class ONCE, before the structuring plugins.
//
// `<meta type>` declares the document class (article / book / book-part). It used to be
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

import { VOCABULARY } from '@enscribejs/layer1-vocabulary';
import { isEnscribeTag } from '../../core/tag.js';
import { ENSCRIBE_DOC_TYPE } from '../../core/file-data-keys.js';

// The declared document-class set + default, read from `meta.md`'s vocab (not hardcoded)
// so the vocabulary stays the single source of truth. Today: article / book / book-part.
const META_TYPE = VOCABULARY?.meta?.enscribe_attributes?.kwargs?.type ?? {};
const DECLARED_TYPES = new Set(META_TYPE.values ?? ['article']);
const DEFAULT_TYPE = META_TYPE.default ?? 'article';

/**
 * Resolve the document class from `<meta type>` exactly once, onto
 * `file.data[ENSCRIBE_DOC_TYPE]`.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeDocTypeResolve() {
  return function docTypeResolve(tree, file) {
    const metaNode = (tree.children ?? []).find((n) => isEnscribeTag(n, 'meta'));
    const raw = metaNode?.kwargs?.type;
    let docType = DEFAULT_TYPE;
    if (raw != null) {
      if (DECLARED_TYPES.has(raw)) {
        docType = raw;
      } else {
        // An explicit, undeclared type (`slides`, `dashboard`, a typo): warn and fall
        // back to the default. Mirrors the book-part-type validator's diagnostic.
        file?.message?.(
          `<meta type="${raw}">: unknown document type — expected one of: ` +
            `${[...DECLARED_TYPES].join(', ')}. Rendering as ${DEFAULT_TYPE}.`,
          metaNode,
          'doc-type-resolve:unknown-type',
        );
        docType = DEFAULT_TYPE;
      }
    }
    if (file?.data) file.data[ENSCRIBE_DOC_TYPE] = docType;
  };
}
