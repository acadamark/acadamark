// enscribe docs-site Quickstart playground (Phase 14 Slice 3a).
//
// Structurally the same as the standalone editor demo (demo/demo.js): a
// CodeMirror 6 editor on the left, live-rendered enscribe on the right,
// re-rendering on edit via the `render → executeAssets` two-step. Two
// differences from the demo:
//
//   • The initial source is the Quickstart article itself. build.js inlines
//     quickstart.emd into the page as `window.__QUICKSTART_SOURCE__` (a
//     JSON-string-escaped literal), so the playground is self-contained — no
//     runtime fetch, which means it also works when the dist/ folder is
//     deployed on its own.
//
//   • The enscribe library (window.enscribe) is loaded by a classic <script>
//     that build.js injects into THIS page's <head> only. The read-only pages
//     ship no editor and no library — the playground is the one heavy page.
//
// CodeMirror 6 is ESM-only, imported from a pinned CDN. Everything comes from
// the single `codemirror` meta-package so there is exactly one
// @codemirror/state instance.

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";

const RENDER_DEBOUNCE_MS = 120;
const outputEl = document.querySelector("#output");

// The library bundle is built locally (gitignored) and copied into dist/assets/
// by build.js. A missing global almost always means `npm run build:lib` hasn't
// been run, so say so actionably instead of throwing a cryptic error.
const enscribe = window.enscribe;
if (!enscribe || typeof enscribe.render !== "function") {
  outputEl.innerHTML =
    '<div class="pg-banner">The enscribe browser bundle is not loaded. Build ' +
    "it, then rebuild the site:<br /><code>cd packages/enscribe-interpreter &amp;&amp; " +
    "npm run build:lib</code><br /><code>npm run docs:build</code><br />then reload " +
    "this page.</div>";
  throw new Error("enscribe browser bundle not found on window.enscribe");
}

function escapeHtml(s) {
  return s.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
  );
}

// render → executeAssets: render() returns an HTML fragment whose injected
// <script> assets are inert once placed via innerHTML; executeAssets() walks the
// subtree and runs them (hover previews, live-link DSL bundles). See browser.js.
async function renderNow(source) {
  let html;
  try {
    html = enscribe.render(source);
  } catch (err) {
    // Mid-edit source is often syntactically incomplete; show the error and keep
    // the editor responsive rather than blanking the pane.
    outputEl.innerHTML = `<pre class="pg-error">${escapeHtml(
      String((err && err.message) || err),
    )}</pre>`;
    return;
  }
  outputEl.innerHTML = html;
  try {
    await enscribe.executeAssets(outputEl);
  } catch (err) {
    console.error("executeAssets failed:", err);
  }
}

let timer = null;
function schedule(source) {
  clearTimeout(timer);
  timer = setTimeout(() => renderNow(source), RENDER_DEBOUNCE_MS);
}

const initialDoc =
  typeof window.__QUICKSTART_SOURCE__ === "string"
    ? window.__QUICKSTART_SOURCE__
    : "<section | Hello, enscribe. Edit me.>\n";

const view = new EditorView({
  doc: initialDoc,
  extensions: [
    basicSetup,
    EditorView.lineWrapping,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) schedule(u.state.doc.toString());
    }),
  ],
  parent: document.querySelector("#editor"),
});

renderNow(view.state.doc.toString());
