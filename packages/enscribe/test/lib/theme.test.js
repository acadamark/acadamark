// Themes (Phase 8 Slice 2).
//
// Covers the output-neutral guarantee (no theme → byte-identical), inline
// injection of the modern / compact token overrides, the <config theme=…>
// path, option-over-config precedence, and the warn-and-fall-back on an
// unknown theme.
import assert from 'node:assert';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';

const render = (src, opts = {}) =>
  String(buildEnscribePipeline({ embedResources: false, ...opts }).processSync(src));

const DOC = `<# Introduction #>\n\nSome body text.`;

export async function run() {
  // ── output-neutral: no theme → byte-identical ───────────────────────────────
  {
    const base = render(DOC);
    assert.equal(render(DOC, { theme: 'default' }), base, "theme:'default' is byte-identical");
    assert.equal(render(DOC, {}), base, 'no theme option is byte-identical');
    assert.ok(!/Modern theme|Compact theme/.test(base), 'no theme CSS leaks into an un-themed render');
    console.log('PASS: no theme → byte-identical, no theme CSS');
  }

  // ── modern / compact inject their token overrides inline ────────────────────
  {
    const modern = render(DOC, { theme: 'modern' });
    assert.ok(/<style>[\s\S]*Modern theme/.test(modern), 'modern.css inlined in a <style>');
    assert.ok(/--enscribe-font-body:\s*var\(--enscribe-font-sans\)/.test(modern), 'modern sets a sans body');
    const compact = render(DOC, { theme: 'compact' });
    assert.ok(/<style>[\s\S]*Compact theme/.test(compact), 'compact.css inlined');
    assert.ok(/--enscribe-content-width:\s*640px/.test(compact), 'compact narrows the measure');
    console.log('PASS: modern / compact inject token overrides');
  }

  // ── themes are always inlined (no canonical CDN URL), embed or not ──────────
  {
    assert.ok(/<style>[\s\S]*Modern theme/.test(render(DOC, { theme: 'modern', embedResources: true })), 'inlined when embed:true');
    assert.ok(/<style>[\s\S]*Modern theme/.test(render(DOC, { theme: 'modern', embedResources: false })), 'inlined when embed:false too');
    console.log('PASS: themes always inlined');
  }

  // ── <config theme=…> + option precedence ────────────────────────────────────
  {
    const cfg = render(`<config theme=modern>\n</config>\n\n${DOC}`);
    assert.ok(/Modern theme/.test(cfg), '<config theme=modern> injects modern');
    const override = render(`<config theme=modern>\n</config>\n\n${DOC}`, { theme: 'compact' });
    assert.ok(/Compact theme/.test(override) && !/Modern theme/.test(override), 'render option overrides <config>');
    console.log('PASS: <config theme> + option precedence');
  }

  // ── unknown theme → warn + fall back to default (no throw) ──────────────────
  {
    const warnings = [];
    const realWarn = console.warn;
    console.warn = (m) => { if (/\[enscribe\]/.test(String(m))) warnings.push(String(m)); };
    let out;
    try { out = render(DOC, { theme: 'neon' }); } finally { console.warn = realWarn; }
    assert.ok(!/Modern theme|Compact theme/.test(out), 'unknown theme injects no theme CSS');
    assert.equal(out, render(DOC), 'unknown theme renders identically to the default');
    assert.ok(warnings.some((w) => /unknown theme 'neon'/.test(w)), 'unknown theme warns');
    console.log('PASS: unknown theme → warn + default (no throw)');
  }

  console.log('All theme tests passed.');
}
