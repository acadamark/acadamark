// acadamark in-browser editor demo (Phase 14 Slice 2).
//
// Left pane: a CodeMirror 6 plain-text editor seeded with the doc-46 fixture.
// Right pane: the rendered acadamark output, refreshed on edit.
//
// Two moving parts and how they load:
//
//   • acadamark library — the IIFE bundle (window.acadamark), pulled in by a
//     classic <script> in index.html. Because that script is classic and this
//     file is a deferred module, window.acadamark is guaranteed ready here.
//
//   • CodeMirror 6 — ESM-only, imported below from a pinned CDN. Everything
//     comes from the single `codemirror` meta-package so there is exactly one
//     @codemirror/state instance (importing @codemirror/state separately is the
//     classic way to end up with two, which breaks the editor). The doc and
//     extensions go straight on the EditorView config, which builds the state
//     internally — so no separate EditorState import is needed.
//
// Render strategy: a warm render of doc-46 measures well under 100 ms, so we
// re-render on every edit rather than diffing, and just coalesce bursts of
// keystrokes with a short debounce to avoid blocking the main thread mid-type.

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";

const SAMPLE_URL =
  "../packages/acadamark-interpreter/test/fixtures/document-46-reproducible-research.acm";
const RENDER_DEBOUNCE_MS = 120;

const outputEl = document.querySelector("#output");

// The library is built locally and gitignored, so a missing global almost
// always means the bundle wasn't built. Say so, actionably, instead of throwing
// a cryptic "render is not a function".
const acadamark = window.acadamark;
if (!acadamark || typeof acadamark.render !== "function") {
  outputEl.innerHTML =
    '<div class="demo-banner">The acadamark browser bundle is not loaded. Build ' +
    "it first:<br /><code>cd packages/acadamark-interpreter &amp;&amp; npm run " +
    "build:lib</code><br />then reload this page.</div>";
  throw new Error("acadamark browser bundle not found on window.acadamark");
}

function escapeHtml(s) {
  return s.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
  );
}

// render → executeAssets: render() returns an HTML fragment whose injected
// <script> assets are inert once placed via innerHTML; executeAssets() walks the
// subtree and runs them (hover-previews, live-link DSL bundles). See browser.js.
async function renderNow(source) {
  let html;
  try {
    html = acadamark.render(source);
  } catch (err) {
    // Mid-edit source is often syntactically incomplete; show the error and keep
    // the editor responsive rather than blanking the pane.
    outputEl.innerHTML = `<pre class="demo-error">${escapeHtml(
      String((err && err.message) || err),
    )}</pre>`;
    return;
  }
  outputEl.innerHTML = html;
  try {
    await acadamark.executeAssets(outputEl);
  } catch (err) {
    console.error("executeAssets failed:", err);
  }
}

let timer = null;
function schedule(source) {
  clearTimeout(timer);
  timer = setTimeout(() => renderNow(source), RENDER_DEBOUNCE_MS);
}

// Seed the editor with doc-46. Top-level await is fine in a module.
let initialDoc = "";
try {
  const res = await fetch(SAMPLE_URL);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  initialDoc = await res.text();
} catch (err) {
  // Most likely cause: opened over file:// or not served from the repo root, so
  // the fixture path doesn't resolve. Fall back to a tiny inline document.
  initialDoc =
    "<!-- Could not load the doc-46 sample: " +
    String(err) +
    "\n     Serve the repository root over HTTP so the fixture path resolves\n" +
    "     (see demo/README.md). -->\n\n" +
    "<section | Hello, acadamark. Edit me.>\n";
}

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
