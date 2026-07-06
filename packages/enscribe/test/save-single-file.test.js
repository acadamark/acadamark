// Self-saving single-file document — pure unit test (#351).
//
// SAVE serializes the edited source back into the single-file vessel by reusing its EXACT structure:
// swap ONLY the `<template id="enscribe-source">` content, touch nothing else. The load-bearing property
// is proved byte-exactly here: since emitSingleFileShell embeds the source ONLY in that template, saving
// vessel-A with source B must produce EXACTLY emitSingleFileShell(source: B) — i.e. the asset-delivery
// mode (inlined vs CDN), the chrome, and the bootstrap are all preserved untouched. (The in-browser
// snapshot + write path — File System Access / download + reopen self-render — is Tier-2 in
// packages/cli/test/delivery-browser.mjs, exercised in a real headless browser.)

import assert from 'node:assert';
import { emitSingleFileShell } from '../src/interpreter/index.js';
import { escapeHtml } from '../src/core/escape-html.js';
import { serializeSavedFile, suggestedFileName } from '../src/master-document/save-single-file.js';
import { renderLiveArticleEditView } from '../src/master-document/live-edit-view.js';

const SRC_A = '<meta type=article title="A" />\n\n<section | Intro>\nHello, with math $E=mc^2$.\n';
const SRC_B = '<meta type=article title="A" />\n\n<section | Intro>\nEdited body with a figure and $x^2$.\n';
// A source that stresses the carrier: entities, a literal </template>, a </script>, and markup.
const SRC_TRICKY = '<meta type=article />\nA & B < C > D; </template> </script> <fig #f png>iVBOR</fig>\n';

// Dummy inlined bytes (the shape emitSingleFileShell expects for inlined delivery). Content is opaque to
// the swap — the point is that whatever chrome the vessel carries is preserved verbatim across a save.
// CRUCIAL regression guard: the engine bytes here CONTAIN the literal `<template id="enscribe-source">`,
// exactly as the REAL bundle does (it carries emitSingleFileShell's own source). The inlined engine sits
// in a <script> AFTER the real template, so a naive first/last-index search would target the wrong copy
// and corrupt the file. The byte-exact assertions below fail loudly if the swap ever hits the engine copy.
const INLINE = {
  engine: 'window.enscribe = {}; /* the bundle carries emitSingleFileShell: <template id="enscribe-source"> */',
  defaultCss: 'body{color:#111}',
  shellCss: '.enscribe-edit-save{}',
  displayHead: '<style>/* fonts + katex */</style>',
  editor: 'export const codeMirrorEditorFactory = () => ({});',
};

export async function run() {
  // ── serializeSavedFile is a byte-exact swap for the CDN vessel (editable) ────────────────────
  {
    const vesselA = emitSingleFileShell({ source: SRC_A, title: 'Doc', editable: true });
    const vesselB = emitSingleFileShell({ source: SRC_B, title: 'Doc', editable: true });
    const saved = serializeSavedFile(vesselA, SRC_B);
    assert.strictEqual(saved, vesselB,
      'saving vessel-A with source B == emitSingleFileShell(source B): only the embedded source changed');
    assert.ok(saved.includes(`<template id="enscribe-source">${escapeHtml(SRC_B)}</template>`),
      'the saved template carries the HTML-escaped edited source (the round-trip carrier)');
    assert.ok(!saved.includes(escapeHtml(SRC_A)), 'the old source is gone from the saved file');
    console.log('PASS: #351 — serializeSavedFile is a byte-exact source swap (CDN vessel, editable)');
  }

  // ── byte-exact for the INLINED (offline) vessel: the inlined chrome is preserved untouched ───
  {
    const vesselA = emitSingleFileShell({ source: SRC_A, title: 'Doc', editable: true, inline: INLINE });
    const vesselB = emitSingleFileShell({ source: SRC_B, title: 'Doc', editable: true, inline: INLINE });
    const saved = serializeSavedFile(vesselA, SRC_B);
    assert.strictEqual(saved, vesselB, 'inlined vessel: the save preserves the inlined chrome, swaps only the source');
    assert.ok(saved.includes(INLINE.engine) && saved.includes(INLINE.displayHead),
      'the inlined engine + display head survive the save (asset-delivery mode preserved: inlined stays inlined)');
    console.log('PASS: #351 — serializeSavedFile preserves the INLINED delivery mode (offline chrome intact)');
  }

  // ── the carrier is robust: entities / </template> / </script> / markup round-trip via escaping ─
  {
    const vesselA = emitSingleFileShell({ source: SRC_A, title: 'Doc', editable: true });
    const saved = serializeSavedFile(vesselA, SRC_TRICKY);
    assert.strictEqual(saved, emitSingleFileShell({ source: SRC_TRICKY, title: 'Doc', editable: true }),
      'a source with </template>, entities, and markup swaps in exactly as emitSingleFileShell would embed it');
    // The literal </template> in the source must be escaped so it cannot terminate the carrier early.
    assert.ok(!saved.includes('</template> </script>'), 'the raw </template> from the source is neutralized (escaped)');
    assert.ok(saved.includes(escapeHtml(SRC_TRICKY)), 'the tricky source is present, HTML-escaped, in the template');
    console.log('PASS: #351 — the embedded-source carrier is robust to </template>, </script>, and entities');
  }

  // ── a non-editable (render-only) single-file is still swappable structurally (guarded elsewhere) ─
  {
    const vesselA = emitSingleFileShell({ source: SRC_A, title: 'Doc', editable: false });
    assert.strictEqual(serializeSavedFile(vesselA, SRC_B),
      emitSingleFileShell({ source: SRC_B, title: 'Doc', editable: false }),
      'the swap is structural — it does not depend on editability');
    console.log('PASS: #351 — serializeSavedFile swaps the source independent of the editability gate');
  }

  // ── a document with no embedded-source template is not a single-file vessel → a clear error ──
  {
    assert.throws(() => serializeSavedFile('<!DOCTYPE html><html><body>no template</body></html>', SRC_B),
      /enscribe-source/, 'serializing a non-single-file document throws a clear error');
    console.log('PASS: #351 — serializeSavedFile rejects a document with no <template id="enscribe-source">');
  }

  // ── suggestedFileName: a filesystem-safe .html name from the title (or a default) ────────────
  {
    assert.strictEqual(suggestedFileName('My Great Paper'), 'My-Great-Paper.html', 'spaces → dashes, case preserved, .html');
    assert.strictEqual(suggestedFileName('a/b:c*?"'), 'a-b-c.html', 'unsafe characters are collapsed to dashes and trimmed');
    assert.strictEqual(suggestedFileName(''), 'enscribe-document.html', 'empty title → a sensible default');
    assert.strictEqual(suggestedFileName('already.html'), 'already.html', 'an existing .html extension is not doubled');
    console.log('PASS: #351 — suggestedFileName yields a filesystem-safe .html name');
  }

  // ── the edit-view chrome: `saveable` gates the Save button + the dirty-tracked status ────────
  {
    const withSave = renderLiveArticleEditView('<article>x</article>', undefined, true);
    assert.ok(withSave.includes('data-edit-save') && withSave.includes('>Save</button>'),
      'saveable → the Save button is rendered');
    assert.ok(withSave.includes('data-edit-status') && withSave.includes('>saved</span>'),
      'saveable → the status starts "saved" (matches the embedded source) and is dirty-trackable');

    const noSave = renderLiveArticleEditView('<article>x</article>', undefined, false);
    assert.ok(!noSave.includes('data-edit-save'), 'not saveable (served/live) → no Save button');
    assert.ok(noSave.includes('preview — unsaved') && !noSave.includes('no save this slice'),
      'not saveable → the preview-only marker, with the stale "no save this slice" wording removed');
    console.log('PASS: #351 — the edit-view Save chrome is gated on `saveable` (single-file only)');
  }
}
