// #416 — the `<^ …>` footnote sigil: ergonomic sugar for `<note | …>`.
//
// The construct is a THIN parse-time desugar (from-markdown.js rewrites the source
// prefix `<^` → `<note |`), so the load-bearing guarantee is EQUIVALENCE: `<^ x>`
// must render byte-identical to `<note | x>` for any content x. That equivalence is
// what makes the sigil "no new semantics" — it reuses the note machinery entirely
// (numbering, placement, cross-references, JATS). The other checks guard the parse
// boundary: the sigil must not disturb the `^{…}` / `_{…}` sup/sub TeX shortcuts
// (a `^` NOT after `<`), and it must obey the strict-mode sigil register.

import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const proc = buildEnscribePipeline({});
const render = (src) => String(proc.processSync(src));
const body = (html) => {
  const m = html.match(/<article-body>([\s\S]*?)<\/article-body>/);
  return m ? m[1] : html;
};

export function run() {
  // ── The load-bearing equivalence: `<^ x>` ≡ `<note | x>` for varied content ──
  {
    const cases = [
      'Text.<^ A plain footnote.> More.',
      'Text.<^ A footnote with *emphasis* and `code`.>',
      'Before.<^ a nested <b | bold> word.> after.',           // depth-aware content (nested tag)
      'E.<^ math x^{2} inside a footnote.>',                    // the ^{…} sup shortcut still fires INSIDE
      'First.<^ one.> Second.<^ two.>',                          // two footnotes → independent numbering
    ];
    for (const src of cases) {
      const sugar = body(render(src));
      const longhand = body(render(src.replace(/<\^ /g, '<note | ')));
      assert.equal(sugar, longhand, `#416: <^ …> renders byte-identical to <note | …> for: ${src}`);
    }
    console.log('PASS: #416 — <^ …> is byte-identical to the <note | …> longhand (the sugar==longhand equivalence)');
  }

  // ── It is a REAL footnote (a numbered marker + a collected note), not literal ──
  {
    const h = render('The claim holds.<^ Wilcoxon, p = 0.003.>');
    assert.ok(/data-note-id="note-1"/.test(h), '#416: <^ …> produces a real numbered note marker');
    assert.ok(h.includes('Wilcoxon, p = 0.003.'), '#416: the footnote body is collected and rendered');
    assert.ok(!/&#x3C;\^|&lt;\^/.test(h), '#416: no literal <^ leaks through in the default (off) mode');
    console.log('PASS: #416 — <^ …> renders a real numbered footnote, no literal leak');
  }

  // ── Flow position: `<^ …>` on its own line is claimed (block context) ─────────
  {
    const h = render('Para one.\n\n<^ A standalone footnote.>\n\nPara two.');
    assert.ok(h.includes('A standalone footnote.') && /data-note-id/.test(h),
      '#416: <^ …> is recognized in flow (block) position too');
    console.log('PASS: #416 — <^ …> works in flow position');
  }

  // ── The `^{…}` / `_{…}` sup/sub TeX shortcuts are UNAFFECTED (a `^` not after `<`) ─
  {
    const h = render('Water H_{2}O and x^{2}.');
    assert.ok(/<sup>2<\/sup>/.test(h) && /<sub>2<\/sub>/.test(h),
      '#416: the ^{…}/_{…} sup/sub shortcuts still fire in text position (no collision with <^)');
    console.log('PASS: #416 — the ^{…}/_{…} sup/sub shortcuts are unaffected by the <^ sigil');
  }

  // ── Strict mode: a sigil, so it INTERPRETS in sigil mode, is OFF+flagged in canonical ─
  {
    const cfg = (m) => `<config strict-mode=${m} />\n\n`;
    const sig = render(cfg('sigil') + 'Text.<^ a footnote>');
    assert.ok(/data-note-id/.test(sig) && !/<md-flag/.test(sig),
      '#416: in sigil mode the sigil register is on — <^ …> interprets, unflagged');
    const can = render(cfg('canonical') + 'Text.<^ a footnote>');
    assert.ok(!/data-note-id/.test(can), '#416: in canonical mode the sigil register is off — <^ …> does NOT interpret');
    assert.ok(/&#x3C;\^|&lt;\^/.test(can), '#416: canonical renders <^ …> as literal text');
    assert.ok(/<md-flag[^>]*>&#x3C;\^/.test(can), '#416: canonical flags the literal <^ …> as would-be-sigil');
    console.log('PASS: #416 — strict mode: <^ …> interprets in sigil, literal+flagged in canonical (a well-behaved sigil)');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run();
