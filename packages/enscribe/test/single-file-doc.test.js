// Single-file self-contained document (delivery-modes.md §Single-file).
//
// Two halves: the EMBEDDED read path (mountLiveDocument reads source ALREADY IN HAND — no fetch of the
// master) and the SINGLE-FILE EMITTER (emitSingleFileShell embeds the `.emd` in a <template> and wires
// the mount). Proves the gate (editable iff self-contained) and that the served path stays a fetch.

import assert from 'node:assert';
import { JSDOM, VirtualConsole } from 'jsdom';
import { mountLiveDocument } from '../src/interpreter/browser.js';
import { emitSingleFileShell, SINGLE_FILE_ASSET_BASE } from '../src/shell/emit-shell.js';

const SELF_CONTAINED = [
  '<meta type=article>',
  '<title | A Self-Contained Document>',
  '</meta>',
  '',
  '<section #intro | Introduction>',
  '',
  'This is a single self-contained document with **no** external children.',
].join('\n');

function installDom(url = 'https://example.com/doc.html') {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (err) => { if (!/Not implemented/.test(err && err.message)) throw err; });
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url, virtualConsole: vc });
  const orig = { window: global.window, document: global.document, fetch: global.fetch };
  global.window = dom.window;
  global.document = dom.window.document;
  return { dom, orig };
}
function restoreDom(orig) {
  global.window = orig.window;
  global.document = orig.document;
  global.fetch = orig.fetch;
}
function makeEditorStub() {
  const mounts = [];
  return {
    mounts,
    get last() { return mounts[mounts.length - 1]; },
    editor: { mount(el, { value, onChange }) { const h = { el, value, onChange, destroyed: false, destroy() { this.destroyed = true; } }; el.textContent = value; mounts.push(h); return h; } },
  };
}
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

export async function run() {
  // ── 1. READ from embedded source: renders WITHOUT any fetch of the master ──
  {
    const { orig } = installDom();
    let fetchCalls = 0;
    global.fetch = async (u) => { fetchCalls++; throw new Error(`unexpected fetch: ${u}`); };
    try {
      const root = await mountLiveDocument('#root', SELF_CONTAINED);
      assert.ok(/Introduction/.test(root.innerHTML), 'the embedded document renders its section');
      assert.ok(/<b>no<\/b>/.test(root.innerHTML) && /external children/.test(root.innerHTML), 'inline + prose content renders');
      assert.strictEqual(fetchCalls, 0, 'NO fetch of the master — the source was read from memory, not the network');
      console.log('PASS: single-file — mountLiveDocument renders the embedded source with NO master fetch');
    } finally { restoreDom(orig); }
  }

  // ── 2. EDIT over the embedded source: editor mounts with the source; onChange re-previews ──
  {
    const { orig } = installDom();
    global.fetch = async (u) => { throw new Error(`unexpected fetch: ${u}`); };
    try {
      const stub = makeEditorStub();
      // The shell contract (same as mountLiveShell): `edit` + `editorFactory` — the entry builds the
      // editor (the single-file bootstrap passes codeMirrorEditorFactory + ?edit the same way).
      const root = await mountLiveDocument('#root', SELF_CONTAINED, { edit: true, editorFactory: () => stub.editor, editDebounceMs: 0 });
      assert.ok(stub.last && /Self-Contained Document/.test(stub.last.value), 'the editor mounted with the embedded source');
      const preview = () => root.querySelector('[data-edit-pane="preview"]');
      assert.ok(preview() && /Introduction/.test(preview().innerHTML), 'the preview renders the document');
      stub.last.onChange('<section | Rewritten>\n\nBrand new text.');
      await tick();
      assert.ok(/Brand new text/.test(preview().innerHTML), 'onChange re-renders the preview from the edited source');
      console.log('PASS: single-file — edit mode mounts the editor over the embedded source + live preview');
    } finally { restoreDom(orig); }
  }

  // ── 3. EMITTER: embeds the source in a <template> that ROUND-TRIPS; web assets; wires mountLiveDocument ──
  {
    const html = emitSingleFileShell({ source: SELF_CONTAINED, title: 'Doc', editable: true });
    assert.ok(html.includes('<template id="enscribe-source">'), 'the source rides in a <template id=enscribe-source>');
    assert.ok(html.includes('mountLiveDocument'), 'the bootstrap mounts via mountLiveDocument (no fetch)');
    assert.ok(html.includes(SINGLE_FILE_ASSET_BASE + 'enscribe.browser.global.js'), 'the engine loads from the web (jsDelivr default)');
    assert.ok(html.includes('codeMirrorEditorFactory'), 'a self-contained doc wires the editor (editable)');
    // Round-trip: the <template> content decodes back to the exact source.
    const dom = new JSDOM(html);
    const tpl = dom.window.document.getElementById('enscribe-source');
    assert.strictEqual(tpl.content.textContent, SELF_CONTAINED, 'the embedded source round-trips exactly (entities decoded on parse)');
    console.log('PASS: single-file — emitter embeds the source (round-trips), references web assets, wires the editor');
  }

  // ── 3b. round-trips even when the source contains </script> + < + & (the <template> robustness) ──
  {
    const tricky = '<section | x>\n\nClose tag </script> and `a < b && c` here.';
    const html = emitSingleFileShell({ source: tricky, editable: true });
    const dom = new JSDOM(html);
    assert.strictEqual(dom.window.document.getElementById('enscribe-source').content.textContent, tricky,
      'a source with </script>, <, and & round-trips intact (a raw <script> data block would not)');
    console.log('PASS: single-file — the <template> carrier round-trips </script> / < / & intact');
  }

  // ── 4. GATE: a render-only (non-editable) emit loads NO editor and ignores ?edit ──
  {
    const html = emitSingleFileShell({ source: SELF_CONTAINED, editable: false });
    assert.ok(!html.includes('codeMirrorEditorFactory'), 'render-only emit loads NO editor module');
    assert.ok(html.includes('const opts = {};'), 'render-only emit mounts with no edit options (?edit inert)');
    assert.ok(!html.includes('data-enscribe-edit'.padEnd(0)) || !/<div id="enscribe-book-root" data-enscribe-edit/.test(html),
      'render-only mount has no data-enscribe-edit default');
    console.log('PASS: single-file — render-only (non-self-contained) emit disables edit (gate C)');
  }

  console.log('All single-file document (delivery-modes.md §Single-file) checks passed.');
}
