// Void elements (#275): a void tag renders to a NATIVE HTML void element (no closing-tag form) —
// `<hr>` today. Its BARE form (`<hr>`, `<hr type=scene-break>`) must self-close like the `/>` slash
// form, NOT be read as a long-form opener awaiting a `</hr>` that never comes (which greedily
// swallows the rest of the document and errors "long-form tag has no closing tag").
//
// This is NARROWER than the vocab's `content: none` set: `<config>` is also content:none but is a
// non-native apparatus element authored in long-form too (`<config attrs>…</config>`), so it must
// stay long-form-eligible. The guard below pins exactly that distinction.

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { VOID_ELEMENTS } from '../src/parser/syntax.js';
import { VOCABULARY } from '@enscribejs/layer1-vocabulary';

const R = (src) => String(buildEnscribePipeline({}).processSync(src));

// The HTML void elements (no closing-tag form). The parser self-closes the bare form of any enscribe
// element that RENDERS to one of these natively.
const HTML_VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export async function run() {
  // ── Drift guard: VOID_ELEMENTS == every element rendering to a NATIVE HTML void element ──────────
  {
    const renderVoid = Object.entries(VOCABULARY)
      .filter(([, e]) => e?.html_output?.is_html_native && HTML_VOID.has(e?.html_output?.element))
      .map(([name]) => name)
      .sort();
    assert.deepStrictEqual([...VOID_ELEMENTS].sort(), renderVoid,
      `parser VOID_ELEMENTS must list every native-HTML-void element (got parser ${[...VOID_ELEMENTS].sort()} vs vocab ${renderVoid})`);
    // And `<config>` (content:none but non-native, long-form-authored) must NOT be a parser void.
    assert.ok(!VOID_ELEMENTS.has('config'), '<config> is content:none but NOT a parser void (it is long-form-authored)');
    console.log(`PASS: #275 — parser VOID_ELEMENTS == native-HTML-void elements (${renderVoid.join(', ')}); config excluded`);
  }

  // ── bare <hr> self-closes (no error, rest of the document preserved) ────────────────────────────
  {
    const out = R('a\n<hr>\nb');
    assert.ok(/<hr\b[^>]*>/.test(out), 'bare <hr> renders a thematic break');
    assert.ok(!/tag-error|long-form/.test(out), 'bare <hr> does NOT error as a long-form opener');
    assert.ok(/>a</.test(out) && /b/.test(out.replace(/<[^>]*>/g, '')), 'content before AND after a bare <hr> survives (not swallowed)');
    assert.strictEqual(R('a\n<hr>\nb'), R('a\n<hr/>\nb'), 'bare <hr> ≡ <hr/> (same thematic break)');
    // ≡ the markdown thematic break too (in a blank-line context, where `---` is a break not a setext rule).
    assert.strictEqual(R('a\n\n<hr>\n\nb'), R('a\n\n---\n\nb'), 'bare <hr> ≡ the markdown --- thematic break');
    console.log('PASS: #275 — bare <hr> self-closes (≡ <hr/> ≡ ---), content preserved');
  }

  // ── bare <hr type=…> carries its classification kwarg ───────────────────────────────────────────
  {
    for (const t of ['scene-break', 'ornamental']) {
      assert.ok(R(`a\n<hr type=${t}>\nb`).includes(`data-hr-type="${t}"`),
        `bare <hr type=${t}> maps to data-hr-type="${t}"`);
      assert.strictEqual(R(`a\n<hr type=${t}>\nb`), R(`a\n<hr type=${t} />\nb`),
        `bare <hr type=${t}> ≡ its slash form`);
    }
    console.log('PASS: #275 — bare <hr type=…> ≡ its slash form, carries data-hr-type');
  }

  // ── <config> stays long-form-eligible (the non-void content:none case must not regress) ─────────
  {
    const cfg = R('<config title="T" author="A">\n</config>\n\nbody');
    assert.ok(!/tag-error|long-form/.test(cfg), 'long-form <config>…</config> still parses (config is NOT treated as void)');
    console.log('PASS: #275 — <config>…</config> long-form is unaffected (config excluded from the void set)');
  }

  // ── a NON-void tag is unaffected — long-form still works ────────────────────────────────────────
  {
    assert.ok(/<aside\b/.test(R('<aside>\nbody\n</aside>')), 'a non-void <aside>…</aside> long-form still renders');
    console.log('PASS: #275 — non-void long-form tags are unaffected');
  }

  console.log('All void-element (#275) checks passed.');
}
