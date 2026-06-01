// Content-shape validation for the enscribe interpreter.
//
// Validation is deliberately permissive in slice 1: unrecognised children
// produce warnings and are passed through. This allows documents to render
// even when the content model is violated; errors surface at authoring time,
// not at render time.

import { expandTokens } from './shape-tokens.js';
import { warnValidation } from '../lib/errors.js';

/**
 * Validate a list of child nodes against a set of shape tokens.
 *
 * @param {string} parentTagname - the containing element's tag name (for warnings)
 * @param {Array} children - child nodes to validate
 * @param {string[]} containsTokens - token names, e.g. ['inline', 'block']
 * @returns {Array} the same children array (validation is non-destructive)
 */
export function validateChildren(parentTagname, children, containsTokens) {
  if (!containsTokens || containsTokens.length === 0) return children;

  const allowed = expandTokens(containsTokens);
  for (const child of children) {
    if (!child) continue;
    if (child.type === 'enscribeTag') {
      if (!allowed.has(child.tagname)) {
        warnValidation(
          parentTagname,
          `child <${child.tagname}> not in allowed shape [${containsTokens.join(', ')}]`,
        );
      }
    }
    // Standard mdast nodes (paragraph, text, emphasis, etc.) are not
    // checked against shape tokens — they are considered implicitly valid.
  }
  return children;
}

/**
 * Extract the contains-token list from a vocabulary spec's content field.
 * Returns an empty array if the spec has no shape / contains declaration.
 */
export function getContainsTokens(vocab) {
  if (!vocab?.content) return [];
  const shape = vocab.content.shape;
  if (!shape) return [];
  // shape can be an array of { element, contains } objects (structured)
  // or a single { contains } object (prose with shape).
  if (Array.isArray(shape)) {
    // Flatten all contains arrays from each element in the shape
    const tokens = [];
    for (const entry of shape) {
      if (entry.contains) tokens.push(...entry.contains);
    }
    return [...new Set(tokens)];
  }
  if (shape.contains) return shape.contains;
  return [];
}
