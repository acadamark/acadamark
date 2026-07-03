// Public entry for the ehtml package.
//
// Re-exports the generated vocabulary data module. The data module is
// generated at build time by `build/generate-data-module.js` from
// `elements/*.md` — it is committed to the repo, refreshed by
// `npm run build` here, and guarded against staleness by the
// `pretest` regenerate-and-diff check.

export { VOCABULARY, VOCABULARY_ERRORS } from './data.js';
