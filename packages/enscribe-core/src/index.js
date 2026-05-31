// enscribe-core — the inward-pointing shared foundation.
//
// This barrel re-exports the package's public surface. Consumers may import
// either via the barrel (`import { ... } from '@enscribejs/core'`) or via the
// per-module subpath exports declared in package.json (e.g.
// `import { DSL_REGISTRY } from '@enscribejs/core/dsl-registry'`).
//
// The package's contents grow as the enscribe-core extraction arc proceeds.

export { DSL_REGISTRY, getContentHandler } from './dsl-registry.js';
export {
  STRUCTURED_ELEMENTS,
  isStructuredElement,
  getStructuredSpec,
} from './structured-elements.js';
export { SIGIL_TO_TAGNAME, TAGNAME_TO_SIGIL, isSigilTagname } from './tagname-sigil-map.js';
export { makeTag, makeOpaqueTag, makeInternalMarker, isEnscribeTag } from './tag.js';
export { makeParseError, makeTagError } from './error-nodes.js';
export { createRegistry, ensureRegistry } from './registry.js';
export { discover } from './walkers/discover.js';
export { walkReplace } from './walkers/walk-replace.js';
export { walkNormalize } from './walkers/walk-normalize.js';
export { isColonId, parseColonId } from './colon-id.js';
export { unwrapSingleParagraph } from './paragraph-unwrap.js';
export * as FileDataKeys from './file-data-keys.js';
