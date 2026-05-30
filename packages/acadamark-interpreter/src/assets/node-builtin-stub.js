// Browser-bundle stub for the Node built-ins fs / path / url / module.
//
// src/browser.js statically pulls in modules (index.js, node-assets.js,
// font-loader.js, table.js, library-load.js, …) that import these built-ins for
// their Node-only code paths — inline font/KaTeX embedding, table `src=`,
// library `src=`, DSL static / live-inline rendering. Under the browser façade's
// defaults none of those paths run, so the built-ins are never actually used —
// but the imports must still RESOLVE for the bundle to build and, crucially, to
// load (an unresolved built-in becomes a top-level `__require("fs")` that throws
// the instant the IIFE evaluates, before it can assign `window.acadamark`).
//
// tsup.config.js uses an esbuild `alias` to redirect the fs / path / url / module
// specifiers to this file. The alias only catches BARE specifiers — `node:`-prefixed
// imports are claimed by tsup's node-protocol-plugin before alias runs — so every
// Node-built-in import under src/ is written bare (`from 'fs'`), never `from
// 'node:fs'`; that convention is what makes this stub reachable. Each export is a
// function that throws only when CALLED, so creating the binding at module-init is
// harmless while a violated "never called in the browser" invariant surfaces as a
// loud, specific error instead of silent corruption. (An earlier esbuildPlugins
// stub failed because tsup APPENDS user plugins after its own node externalizer, so
// its onResolve never fired and the bundle shipped a load-time `__require("fs")`;
// the alias, consumed by esbuild core, is what actually intercepts the bare form.
// See the tsup.config.js header.)

const unavailable = (name) => () => {
  throw new Error(`${name} is not available in the acadamark browser bundle`);
};

export const readFileSync = unavailable('fs.readFileSync');
export const fileURLToPath = unavailable('url.fileURLToPath');
export const dirname = unavailable('path.dirname');
export const join = unavailable('path.join');
export const resolve = unavailable('path.resolve');
export const createRequire = unavailable('module.createRequire');

export default {};
