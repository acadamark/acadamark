// #33 (part 1) — sidenote render mode (numbered notes in the margin).
//
// A display-only HTML projection: notePosition='margin' (or <config
// note-position=margin>) copies each numbered note's content into a margin
// <span> beside its marker. Markers, numbering, the note tree, and JATS are
// unchanged; the bottom <note-list> stays as the below-breakpoint fallback.

import assert from 'node:assert';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';

const SRC =
  '# Doc\n\nFirst point <note | a footnote about the first point>. ' +
  'Second <note | another note here>.';

const html = (opts) => String(buildEnscribePipeline(opts).processSync(SRC));
const treeJson = (opts) => {
  const p = buildEnscribePipeline(opts);
  return JSON.stringify(p.runSync(p.parse(SRC)));
};
// Extract just the inline note markers, to compare numbering between modes.
const markersOf = (h) =>
  (h.match(/<sup id="noteref-\d+" data-note-id="[^"]+"><a href="#[^"]+">\d+<\/a><\/sup>/g) || []).join('|');

export async function run() {
  const bottom = html({});
  const margin = html({ notePosition: 'margin' });

  // ── default (bottom) mode: no sidenote spans, no margin layout ──────────────
  assert.ok(!bottom.includes('<sidenote>'), 'default mode emits no sidenote spans');
  assert.ok(!bottom.includes('enscribe-layout--margin'), 'default mode emits no margin layout');
  console.log('PASS: default (bottom) note rendering is unchanged');

  // ── margin mode: content projected to the margin, marker + numbering intact ──
  assert.ok(margin.includes('class="enscribe-layout enscribe-layout--margin"'), 'margin mode marks the (shared) margin layout wrapper');
  assert.ok(margin.includes('.enscribe-layout--margin sidenote'), 'margin mode injects the scoped sidenote CSS');
  assert.ok(margin.includes('<sup id="noteref-1" data-note-id="note-1">'), 'inline marker 1 kept');
  assert.ok(margin.includes('<sup id="noteref-2" data-note-id="note-2">'), 'inline marker 2 kept');
  // The margin copy is PHRASING content (the parser-safety fix): the clone lives inside
  // the host <p>, so its copied <p> is unwrapped to inline children — a real HTML parser
  // force-closes a paragraph on a nested <p>, ejecting the note body into the main flow
  // (the margin-note regression). The number now runs into the text on one Tufte line.
  assert.ok(
    /<sidenote><sup>1<\/sup>\s*a footnote about the first point/.test(margin),
    'sidenote 1 carries its number + content into the margin (phrasing, no nested <p>)',
  );
  assert.ok(
    /<sidenote><sup>2<\/sup>\s*another note here/.test(margin),
    'sidenote 2 carries its number + content into the margin (phrasing, no nested <p>)',
  );
  assert.ok(
    !((margin.match(/<sidenote>[^]*?<\/sidenote>/g) ?? []).some((s) => /<p[\s>]/.test(s))),
    'no <p> inside any sidenote clone (a real parser would eject it from the host paragraph)',
  );
  console.log('PASS: margin mode projects note content into the margin, numbering intact');

  // ── mobile fallback: the bottom note-list is still present ──────────────────
  assert.ok(margin.includes('<note-list'), 'margin mode keeps the bottom note-list');
  assert.ok(
    margin.includes('id="note-1"') && margin.includes('class="note-backref"'),
    'the bottom note-list is intact (the below-breakpoint fallback)',
  );
  console.log('PASS: margin mode keeps the bottom note-list for the mobile fallback');

  // ── markers + numbering byte-identical between modes ─────────────────────────
  assert.strictEqual(markersOf(margin), markersOf(bottom), 'note markers + numbering identical between modes');
  console.log('PASS: note markers + numbering identical to the default rendering');

  // ── display-only: the mdast tree (→ JATS + numbering) is byte-identical ──────
  assert.strictEqual(
    treeJson({ notePosition: 'margin' }),
    treeJson({}),
    'note position never changes the mdast tree (so JATS export is identical)',
  );
  console.log('PASS: margin mode is display-only — mdast tree identical (JATS unchanged)');

  // ── the mode is also selectable via <config note-position=margin> ───────────
  const viaConfig = String(
    buildEnscribePipeline({}).processSync('<config note-position=margin />\n\n' + SRC),
  );
  assert.ok(viaConfig.includes('<sidenote>'), '<config note-position=margin> selects margin mode');
  // …and the explicit option wins over config.
  const optionWins = String(
    buildEnscribePipeline({ notePosition: 'bottom' }).processSync('<config note-position=margin />\n\n' + SRC),
  );
  assert.ok(!optionWins.includes('<sidenote>'), 'the notePosition option overrides the <config> setting');
  console.log('PASS: <config note-position=margin> selects the mode; the option overrides it');
}
