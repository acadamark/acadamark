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

  // ── unknown theme → a VFILE MESSAGE (not a raw console.warn), quiet-suppressible ──
  // The warning was a raw console.warn — the one theme diagnostic OFF the message channel,
  // so it carried no provenance and <config quiet> could not govern it. It now rides the
  // vfile stream like every other diagnostic (routed through file.message); the #450
  // two-phase clear suppresses it under <config quiet>. Reachable via the `--theme` render
  // option here; an unknown `<config theme=…>` value is additionally caught, positioned, by
  // config-discovery's value validation (#401).
  {
    const warnings = [];
    const realWarn = console.warn;
    console.warn = (m) => { warnings.push(String(m)); };  // capture ANY console output, not just [enscribe]
    let file, quietFile;
    try {
      file = buildEnscribePipeline({ embedResources: false, theme: 'neon' }).processSync(DOC);
      quietFile = buildEnscribePipeline({ embedResources: false, theme: 'neon' }).processSync(`<config quiet />\n\n${DOC}`);
    } finally { console.warn = realWarn; }
    // (1) No raw console output — the diagnostic is on the message stream now.
    assert.equal(warnings.length, 0, 'unknown theme emits NO raw console output (it rides the vfile stream)');
    // (2) It is a proper vfile message with the theme:unknown origin and a readable reason.
    const msg = file.messages.find((m) => /unknown theme 'neon'/.test(String(m.reason)));
    assert.ok(msg, 'unknown theme yields a vfile message on file.messages');
    assert.equal(msg.source, 'theme', "the message's source is 'theme'");
    assert.equal(msg.ruleId, 'unknown', "the message's ruleId is 'unknown'");
    // (3) Still a graceful fallback: no theme CSS injected, render identical to the default.
    assert.ok(!/Modern theme|Compact theme|Tufte theme/.test(String(file)), 'unknown theme injects no theme CSS');
    assert.equal(String(file), render(DOC), 'unknown theme renders identically to the default');
    // (4) <config quiet> suppresses it (the #450 two-phase clear governs this compile-stage message).
    assert.ok(!quietFile.messages.some((m) => /unknown theme/.test(String(m.reason))),
      'under <config quiet>, the unknown-theme message is suppressed');
    console.log('PASS: unknown theme → vfile message (not console.warn), quiet-suppressible, graceful default');
  }

  // ── tufte: a full-selector theme (#398) — token retune + one structural rule ─
  {
    const tufte = render(DOC, { theme: 'tufte' });
    assert.ok(/<style>[\s\S]*Tufte theme/.test(tufte), 'tufte.css inlined in a <style>');
    assert.ok(/--enscribe-font-body:\s*Palatino/.test(tufte), 'tufte sets a serif (Palatino) body');
    assert.ok(/--enscribe-bg:\s*#fffff8/.test(tufte), 'tufte sets the cream page background');
    // the structural rung: section headings in italic (no token can express font-style)
    assert.ok(/section-title[\s\S]*?font-style:\s*italic/.test(tufte), 'tufte adds the italic section-heading structural rule');
    // chrome-unification (#414): the theme targets the document, not the shell chrome
    assert.ok(!/enscribe-chapter-rail|enscribe-site-|enscribe-book-rail/.test(getThemeOnly(tufte)), 'tufte styles no shell-chrome selector');
    console.log('PASS: tufte — full-selector theme (serif retune + italic-heading structural rule, no chrome)');
  }

  console.log('All theme tests passed.');
}

// The tufte <style> block only (so the chrome-selector assertion tests the THEME, not the
// document's own default.css / chrome, which legitimately carry those selectors).
function getThemeOnly(html) {
  const m = html.match(/<style>([^<]*Tufte theme[\s\S]*?)<\/style>/);
  return m ? m[1] : '';
}
