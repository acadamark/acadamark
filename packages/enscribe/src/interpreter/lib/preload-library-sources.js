// #133: shared async pre-load for <library src> external sources.
//
// The interpreter pipeline is synchronous (processSync), but a browser <library
// src> (and any URL source, in either runtime) needs an async fetch that cannot
// run inside it. So the runtime entry points — the browser `renderAsync` and the
// CLI render command — follow a "load-then-fill" pattern:
//
//   1. collectLibrarySources(source)  → the unique <library src> strings
//      (exported from interpreter/index.js; discovers them via liftToCanonicalMdast).
//   2. preloadSources(srcs, loadOne)  → a src → { content } | { error } map
//      (this module; loadOne is the runtime loader: fetch / fs).
//   3. processSync({ value: source, data: { [ENSCRIBE_LOADED_SOURCES]: map } })
//      → buildCitationIndex consumes the map for src nodes; failures render
//        visibly (always-renders).
//
// This keeps the sync pipeline (and the byte-identical inline path) intact; the
// async work is confined to this pre-load step.

/**
 * Load every unique src via `loadOne`, returning a src → result map. always-
 * resolves: a load failure is captured as `{ error }` (never throws), so the
 * downstream sync render can show a visible error for that source rather than
 * aborting the whole document.
 *
 * @param {string[]} srcs - src strings to load (deduped here).
 * @param {(src: string) => Promise<string>} loadOne - runtime loader (fetch / fs read).
 * @returns {Promise<Record<string, { content: string } | { error: string }>>}
 */
export async function preloadSources(srcs, loadOne) {
  const out = {};
  await Promise.all(
    [...new Set(srcs)].map(async (src) => {
      try {
        out[src] = { content: await loadOne(src) };
      } catch (err) {
        out[src] = { error: err?.message ?? String(err) };
      }
    }),
  );
  return out;
}
