// DSL render registry — INTERNAL, v0.1.0.
//
// Answers, for an external DSL named `mermaid` / `abc`: what is its container
// tag, its contract class, its live bundle + pinned CDN URL + init script, and
// its (optional) static renderer? This is an *asset-emit* concern, consumed in
// `compileToHtml` (src/index.js) — distinct from `HANDLER_REGISTRY`
// (interpret-plugin.js), which is the *parse/dispatch* concern answering "what
// turns a <mermaid> tag into contract hast?". The two share the static-Map idiom
// but are separate tables with separate consumers; conflating them would couple
// parse-time dispatch to view-time asset policy.
// See notes/archive/phase-findings-2026-05/dsl-rendering-architecture-findings.md §Q1.
//
// INTERNAL boundary (Q5). This module is deliberately NOT added to
// the `enscribe` package's `exports` (which expose only the package's
// public entry). `getDsl` / `getRegisteredDsls` are reachable inside the
// workspace but not through the package's public surface — reachability, not
// just documentation, enforces "internal."
//
// BROWSER-SAFETY split. This module carries NO fs/url/path/module imports, so it
// loads cleanly in a browser bundle (the build slice's boundary; see
// notes/specs/core.md). Every Node-only path it drives — the
// readFileSync bundle loaders and the jsdom-shimmed static abc→SVG renderer —
// lives in ./node-assets.js, imported here only as the function *references* the
// registration records hold. Under the browser façade's `dslMode: 'live-link'`
// default the registry calls neither a bundleLoader nor the staticRenderer, so
// those Node-only bodies never run client-side.
//
// DERIVED FROM SEEDS (#341). `DSL_REGISTRY` is no longer a hand-written literal:
// it is built at module load by iterating the fs-free registration seeds
// (core/dsl-registrations.js) through `registerDsl`, which attaches the Node-only
// asset functions. The built-in DSLs (mermaid, abc) are the seeds; the four DSL
// indices (LANGUAGES, DSL_REGISTRY, HOST_ACCEPT_SETS membership) are views over
// them, so they can no longer drift apart. `registerDsl` stays INTERNAL — a
// public, setup-time registration API remains a deliberate future decision (the
// not-in-`exports` boundary above holds). See notes/specs/registries.md.

import { getMermaidJs, getAbcjsJs, renderAbcStatic } from './node-assets.js';
import { DSL_REGISTRATIONS, MERMAID_CDN_URL, ABCJS_CDN_URL } from '../../core/dsl-registrations.js';

// The pinned CDN URLs now live with the registration seeds in
// core/dsl-registrations.js (the fs-free single source, #341). Re-exported here so
// existing importers (interpreter/index.js barrel, test/cdn-versions.test.js,
// test/dsl/registry.test.js) keep their `./dsl/registry.js` import path.
export { MERMAID_CDN_URL, ABCJS_CDN_URL };

// ─── DSL_REGISTRY: derived from the registration seeds (#341) ──────────────────
// The DSL_REGISTRY record is a VIEW of the core seed: `registerDsl` flattens the
// seed's `view` block into the runtime record shape consumers read
// (containerTag, contractClass, liveAssets{bundleLoader, cdnUrl, initScript},
// staticRenderer, staticClass) and attaches the two Node-only asset functions —
// the readFileSync `bundleLoader` and the jsdom `staticRenderer` — by name. Those
// functions cannot live in the fs-free core seed, so they are wired here, at the
// interpreter layer (mirrors the registry.js / node-assets.js data/function
// split). `staticClass` is emitted only when the seed declares one (mermaid, being
// live-only, has neither a staticRenderer nor a staticClass). See
// notes/specs/registries.md §"The design".
const NODE_ASSETS = {
  mermaid: { bundleLoader: getMermaidJs, staticRenderer: null },
  abc: { bundleLoader: getAbcjsJs, staticRenderer: renderAbcStatic },
};

/**
 * Assemble one DSL_REGISTRY record from a core registration seed, attaching the
 * seed's Node-only asset functions (looked up by name). Behavior-neutral: the
 * record it returns is byte-identical to the hand-written literal it replaced.
 * @param {object} seed a DSL_REGISTRATIONS entry
 * @returns {object} the runtime DSL registration record
 */
function registerDsl(seed) {
  const assets = NODE_ASSETS[seed.name];
  if (!assets) {
    throw new Error(`registerDsl: no Node-only assets registered for DSL '${seed.name}'`);
  }
  const record = {
    name: seed.name,
    containerTag: seed.view.containerTag,
    contractClass: seed.view.contractClass,
    liveAssets: {
      bundleLoader: assets.bundleLoader,
      cdnUrl: seed.view.liveAssets.cdnUrl,
      initScript: seed.view.liveAssets.initScript,
    },
    staticRenderer: assets.staticRenderer,
  };
  if (seed.view.staticClass !== undefined) record.staticClass = seed.view.staticClass;
  return record;
}

const DSL_REGISTRY = new Map(
  DSL_REGISTRATIONS.map((seed) => [seed.name, registerDsl(seed)]),
);

/**
 * Look up a single DSL registration by name.
 * @param {string} name
 * @returns {object|null} the registration record, or null if unregistered.
 */
export function getDsl(name) {
  return DSL_REGISTRY.get(name) ?? null;
}

/**
 * All registered DSL records, in registration order. The asset-injection loop
 * in compileToHtml iterates this once per compile.
 * @returns {object[]}
 */
export function getRegisteredDsls() {
  return [...DSL_REGISTRY.values()];
}

// ─── Mode resolution ──────────────────────────────────────────────────────────

/** The four valid DSL render modes. `skip` is the default. */
export const VALID_DSL_MODES = ['skip', 'live-inline', 'live-link', 'static'];

/**
 * Resolve the render mode for one DSL from the plugin options, applying the
 * precedence `‹name›Mode ?? dslMode ?? 'skip'`. Validates the token only;
 * whether a DSL *supports* the resolved mode (e.g. `static` requires a
 * staticRenderer) is checked at the injection site, where the record is in
 * hand and the DSL's presence in the document is known.
 *
 * @param {string} name      registry key (e.g. 'mermaid')
 * @param {object} [options] the enscribeInterpreter options object
 * @returns {'skip'|'live-inline'|'live-link'|'static'}
 * @throws if the resolved value is not a known mode token.
 */
export function resolveDslMode(name, options = {}) {
  const mode = options[`${name}Mode`] ?? options.dslMode ?? 'skip';
  if (!VALID_DSL_MODES.includes(mode)) {
    throw new Error(
      `Invalid DSL mode '${mode}' for '${name}'. ` +
        `Valid modes: ${VALID_DSL_MODES.join(', ')}.`,
    );
  }
  return mode;
}
