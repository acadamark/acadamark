// acadamark-core — the inward-pointing shared foundation.
//
// This barrel re-exports the package's public surface. Consumers may import
// either via the barrel (`import { ... } from 'acadamark-core'`) or via the
// per-module subpath exports declared in package.json (e.g.
// `import { DSL_REGISTRY } from 'acadamark-core/dsl-registry'`).
//
// The package's contents grow as the acadamark-core extraction arc proceeds.

export { DSL_REGISTRY, getContentHandler } from './dsl-registry.js';
export { PARSER_TO_VOCAB, resolveVocabKey } from './sigil-mapping.js';
