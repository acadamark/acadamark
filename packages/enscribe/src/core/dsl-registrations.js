// The external-library DSL registration seeds — the single source of truth (#341).
//
// A **registration seed** is the once-authored, fs-free DATA describing one
// external-library DSL (today: mermaid, abc). The three DSL indices are VIEWS
// derived from these seeds, not hand-written:
//
//   - LANGUAGES        (core/dsl-registry.js)      ← name + opaqueAtParse
//   - HOST_ACCEPT_SETS (interpreter/lib/host-accept-sets.js) ← host
//   - DSL_REGISTRY     (interpreter/dsl/registry.js) ← view (+ Node-only fns)
//
// WHY THIS LIVES IN core/. `LANGUAGES` / `getContentHandler` are in core, the
// inward-pointing fs-free foundation (notes/specs/core.md) that imports nothing
// from `interpreter/`. For the seed to drive the parse-time `LANGUAGES` index it
// must therefore be reachable from core — so the seed carries only fs-free DATA.
// The Node-only asset FUNCTIONS (`liveAssets.bundleLoader`, `staticRenderer`) and
// the handler dispatch live at the interpreter layer and are attached there, by
// name, when `interpreter/dsl/registry.js` assembles the `DSL_REGISTRY` record
// (mirrors the existing registry.js / node-assets.js data/function split). See
// notes/specs/registries.md §"The design".
//
// A seed's `view` block carries the view-time asset DATA (container tag, contract
// class, the CDN url + init script, static class). Its two Node-only companions —
// the `bundleLoader` (readFileSync) and `staticRenderer` (jsdom) — are NOT here;
// they attach at the interpreter layer.

// ─── Pinned CDN URLs ────────────────────────────────────────────────────────
// Pinned versions for the CDN (live-link) URLs — literals, not require reads, so
// this module loads in a browser bundle. The live-link URL must match the
// live-inline bundled version; test/cdn-versions.test.js asserts these equal the
// installed package versions, so a dependency bump fails loudly there. Same idiom
// as KATEX_CDN_URL in interpreter/assets/font-loader.js.
const _mermaidVersion = '10.9.6';
const _abcjsVersion = '6.6.3';

/** jsDelivr URL for the Mermaid UMD bundle, pinned to the installed version. */
export const MERMAID_CDN_URL = `https://cdn.jsdelivr.net/npm/mermaid@${_mermaidVersion}/dist/mermaid.min.js`;
/** jsDelivr URL for the abcjs browser bundle, pinned to the installed version. */
export const ABCJS_CDN_URL = `https://cdn.jsdelivr.net/npm/abcjs@${_abcjsVersion}/dist/abcjs-basic-min.js`;

// ─── Init scripts ─────────────────────────────────────────────────────────────
// The init JS emitted (inline or alongside a <script src>) so the live library
// renders the contract markup at view time.

// Mermaid self-registers a DOMContentLoaded handler from `startOnLoad: true` and
// scans for `class="mermaid"`, so no explicit run() / readiness guard is needed.
// #413 L6: guard against a failed CDN load — if the library never arrived (offline / CDN down),
// the global is undefined; run nothing rather than throw an uncaught ReferenceError (the CDN
// <script src>'s onerror already flagged the failure on both channels).
const MERMAID_INIT = `if (typeof mermaid !== 'undefined') { mermaid.initialize({ startOnLoad: true }); }`;

// abcjs does NOT scan the DOM: the consumer must find each marked element and
// call ABCJS.renderAbc on its source. The assets are prepended (unshift) ahead
// of the DSL elements, so this script can run before they parse — hence the
// readyState guard (the hover-preview.js init pattern). `el.textContent` reads
// the verbatim source the <pre> container preserves (this is why the M2 fix —
// abc's <div> → <pre> — is a prerequisite for abc-live: a <div> source is
// reflowed by the formatter and would feed abcjs corrupted notation).
const ABCJS_INIT = `(function () {
  function renderAll() {
    if (typeof ABCJS === 'undefined') { return; }   /* #413 L6: CDN failed → the onerror flagged it; render nothing rather than throw */
    document.querySelectorAll('[data-enscribe-dsl="abc"]').forEach(function (el) {
      ABCJS.renderAbc(el, el.textContent);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})();`;

// ─── Registration seeds ─────────────────────────────────────────────────────
// One seed per external-library DSL. Fields:
//   name          — the data-enscribe-dsl value, the LANGUAGES key, the DSL_REGISTRY key.
//   host          — the host whose accept-set gains `name` (mermaid/abc → 'diagram').
//   handler       — the handler-module id that dispatches this DSL's content (the
//                   `diagram` host handler; documented cross-link to the handler axis —
//                   the HANDLER_REGISTRY entry itself comes from the vocab handler_module,
//                   this does not mint one).
//   opaqueAtParse — true → the parser holds the content opaque (derives the LANGUAGES entry).
//   view          — the view-time asset DATA (fs-free); the Node-only bundleLoader/
//                   staticRenderer attach at the interpreter layer. `staticClass` is
//                   present only on a DSL that has a build-time static renderer.
export const DSL_REGISTRATIONS = [
  {
    name: 'mermaid',
    host: 'diagram',
    handler: './handlers/diagram.js',
    opaqueAtParse: true,
    view: {
      containerTag: 'pre',
      contractClass: 'mermaid',
      liveAssets: { cdnUrl: MERMAID_CDN_URL, initScript: MERMAID_INIT },
      // Mermaid is LIVE-ONLY (its browserless render path needs a headless
      // browser); it has no staticRenderer and no staticClass.
    },
  },
  {
    name: 'abc',
    host: 'diagram',
    handler: './handlers/diagram.js',
    opaqueAtParse: true,
    view: {
      containerTag: 'pre',
      contractClass: 'abc',
      liveAssets: { cdnUrl: ABCJS_CDN_URL, initScript: ABCJS_INIT },
      // Class the emit path adds to the inlined <svg> for static abc render.
      staticClass: 'enscribe-abc-rendered',
    },
  },
];

// ─── Pure derivations (fs-free; the parse-time + host indices read these) ──────

/**
 * The parse-time LANGUAGES entries derived from the seeds: `[name, name]` for
 * every seed held opaque at parse. The value is the content-handler name, which
 * for an external-library DSL equals its `name`. Consumed by core/dsl-registry.js.
 * @returns {Array<[string, string]>}
 */
export function deriveDslLanguageEntries() {
  return DSL_REGISTRATIONS
    .filter((r) => r.opaqueAtParse)
    .map((r) => [r.name, r.name]);
}

/**
 * Host → the set of DSL `name`s it admits, derived from the seeds' `host` field.
 * Consumed by interpreter/lib/host-accept-sets.js to build the accept-set for
 * each DSL host (today: `diagram` → {mermaid, abc}).
 * @returns {Map<string, Set<string>>}
 */
export function deriveDslHostMemberships() {
  const byHost = new Map();
  for (const r of DSL_REGISTRATIONS) {
    if (!byHost.has(r.host)) byHost.set(r.host, new Set());
    byHost.get(r.host).add(r.name);
  }
  return byHost;
}
