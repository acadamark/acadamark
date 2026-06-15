// Helper for reading boolean kwargs from enscribeTag nodes.
//
// Boolean attributes can be expressed in three ways in the authoring syntax:
//   +kwarg        → node.booleans.kwarg === true  (canonical boolean form)
//   -kwarg        → node.booleans.kwarg === false (canonical boolean form)
//   kwarg=true    → node.kwargs.kwarg === 'true'  (string form; less preferred)
//   kwarg=false   → node.kwargs.kwarg === 'false' (string form; less preferred)
//
// Priority: booleans > kwargs > config > default.

import { readConfigBool } from './config-helpers.js';

/**
 * Read a boolean kwarg from a node, falling back to document config then a
 * hardcoded default.
 *
 * @param {object} node       - enscribeTag node
 * @param {string} key        - kwarg name (e.g. 'numbered')
 * @param {Map|null} config   - document config from file.data.enscribeConfig
 * @param {string} configKey  - config map key (e.g. 'number-equations')
 * @param {boolean} [defaultValue=true] - fallback if not set anywhere
 * @returns {boolean}
 */
export function readBoolKwarg(node, key, config, configKey, defaultValue = true) {
  // 1. +key / -key form — already stored as a real boolean.
  if (node.booleans?.[key] !== undefined) {
    return node.booleans[key];
  }
  // 2. key=true / key=false form — stored as the string 'true' or 'false'.
  if (node.kwargs?.[key] !== undefined) {
    return node.kwargs[key] !== 'false';
  }
  // 3. Document-level config override, then 4. the hardcoded default — both via the
  //    config-only boolean reader (F12), so the `!== 'false'` config coercion lives in
  //    exactly one place. Byte-identical: config.has true → `!== 'false'`; absent → default.
  return readConfigBool(config, configKey, defaultValue);
}
