// Shared visible-error injection for the always-renders apparatus loaders (#316/1-H).
//
// The asset half (asset-load.js) and the citation half (library-load.js) had byte-identical copies
// of (a) a "make a visible error node" factory and (b) a "splice the errors at the top of the rendered
// body" walk. Both are single-sourced here so the two halves can't drift; each plugin wraps them with
// its own tagname/key and its own collision policy. Output-neutral: the produced node shapes and the
// injection point are unchanged.

import { isEnscribeTag } from '../../core/tag.js';

/**
 * A visible `__<x>-error` node (rendered by its error handler). always-renders: an unresolved
 * reference / failed load / collision shows a visible block naming the offending key, never a silent
 * drop. The two callers pass their own tagname + the kwarg key that carries the reference.
 *
 * @param {string} tagname - e.g. '__asset-error' / '__library-error'
 * @param {string} key     - the kwarg name carrying the reference, e.g. 'ref' / 'src'
 * @param {*}      value    - the reference value (coerced; null/undefined → '')
 * @param {string} message  - the human-facing message
 */
export function makeErrorNode(tagname, key, value, message) {
  return { type: 'enscribeTag', tagname, kwargs: { [key]: value ?? '', message }, content: null };
}

/**
 * Inject visible error nodes at the top of the rendered body so a failure is never silently dropped.
 * Targets the first `<article-body>` / `<book-body>`; falls back to the tree root for a bare document.
 * No-op for an empty error list.
 */
export function injectBodyErrors(tree, errors) {
  if (errors.length === 0) return;
  let target = null;
  (function find(nodes) {
    for (const n of nodes ?? []) {
      if (target) return;
      if (isEnscribeTag(n, 'article-body') || isEnscribeTag(n, 'book-body')) { target = n; return; }
      if (isEnscribeTag(n) && Array.isArray(n.content)) find(n.content);
      if (Array.isArray(n.children)) find(n.children);
    }
  })(tree.children ?? []);
  if (target) {
    target.content = Array.isArray(target.content) ? target.content : [];
    target.content.unshift(...errors);
  } else {
    tree.children = tree.children ?? [];
    tree.children.unshift(...errors);
  }
}
