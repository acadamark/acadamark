// #406 — no note body is ever lost: the improvised end-of-document home.
//
// The bug: when the note-placement pass collected notes but findOrCreateBackMatter
// could make no home (a document with neither an <article> nor a <book> root), the
// built note-list was silently DROPPED — the marker superscripts rendered but the
// bodies they pointed at were gone (an always-renders violation). Ariel #406: the
// renderer improvises a home at the document's END for the three confirmed rootless
// shapes. The acceptance set below is the investigation's three verbatim repros:
// each asserts before→after = body PRESENT in the improvised home, marker links to it.
//
// Folded in: the zero-notes path used to leak a raw <endnotes></endnotes> shell (a
// "marker must never render raw" violation) — it now renders nothing.

import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const render = (src) => String(buildEnscribePipeline({}).processSync(src));

// Assert a note body is present, sits inside a rendered note-list, and its marker
// links to a note id that actually exists in the output (a live marker, not a dead one).
function assertBodyHasHome(html, body, noteN, label) {
  assert.ok(html.includes(body), `${label}: the note body "${body}" is present in the output (not lost)`);
  assert.ok(/<note-list\b/.test(html), `${label}: an improvised note-list home was emitted`);
  // the body sits inside the note-list block (the home), not stranded elsewhere
  const list = html.match(/<note-list[\s\S]*?<\/note-list>/);
  assert.ok(list && list[0].includes(body), `${label}: the body renders inside the note-list home`);
  assert.ok(new RegExp(`id="note-${noteN}"`).test(html), `${label}: note-${noteN} exists as a link target`);
  assert.ok(new RegExp(`href="#note-${noteN}"`).test(html), `${label}: the superscript marker links to #note-${noteN}`);
}

export function run() {
  // ── Repro 1: a website master rendered directly ─────────────────────────────
  {
    const html = render(
      '<meta type=website title="My Site" />\n\n<nav>\n<item | Home>\n\n' +
      'Welcome text with a note.<note | The note body content BRAVO.>\n</nav>\n',
    );
    assertBodyHasHome(html, 'The note body content BRAVO.', 1, '#406 repro-1 (website master)');
    console.log('PASS: #406 — a website master rendered directly keeps its note body (improvised home)');
  }

  // ── Repro 2: a standalone <meta type=book-part> chapter (end + foot notes) ───
  {
    const html = render(
      '<meta type=book-part title="Chapter One" />\n\n# A section\n\n' +
      'End-note text.<note | The note body content CHARLIE-END.>\n\n' +
      'Foot-note text.<note position=foot | The note body content CHARLIE-FOOT.>\n',
    );
    assert.ok(html.includes('The note body content CHARLIE-END.'), '#406 repro-2: the end-note body is present');
    assert.ok(html.includes('The note body content CHARLIE-FOOT.'), '#406 repro-2: the foot-note body is present');
    assert.ok(/<note-list\b/.test(html), '#406 repro-2: an improvised note-list home was emitted');
    assert.ok(/id="note-1"/.test(html) && /id="note-2"/.test(html), '#406 repro-2: both notes exist as link targets');
    assert.ok(/href="#note-1"/.test(html) && /href="#note-2"/.test(html), '#406 repro-2: both markers link to their notes');
    console.log('PASS: #406 — a standalone book-part chapter keeps its end AND foot note bodies (improvised home)');
  }

  // ── Repro 3: a canonical <book-part> at the root of an untyped document ──────
  {
    const html = render('<book-part type=chapter>\n\nText with a note.<note | The note body content ECHO.>\n\n</book-part>\n');
    assertBodyHasHome(html, 'The note body content ECHO.', 1, '#406 repro-3 (root <book-part>)');
    console.log('PASS: #406 — a root-level <book-part> keeps its note body (improvised home)');
  }

  // ── The improvised home reuses the SAME note-list the normal path emits ──────
  {
    // A normal article and a homeless website produce the same note-list structure
    // (class + shape) — the improvised home is not a parallel variant.
    const normal = render('<meta type=article title=A />\n\nText.<note | Normal end note.>\n');
    const improvised = render('<meta type=website title=S />\n\n<nav>\n<item | H>\n\nText.<note | Homeless end note.>\n</nav>\n');
    const cls = (h) => (h.match(/<note-list class="([^"]*)"/) || [])[1];
    assert.equal(cls(improvised), cls(normal), '#406: the improvised note-list uses the same class as the normal end-notes list');
    console.log('PASS: #406 — the improvised home is the SAME note-list structure the normal path emits');
  }

  // ── Zero-notes path: an <endnotes/> marker with no notes renders NOTHING ─────
  {
    const html = render('<meta type=article title=Z />\n\nSome text, no notes at all.\n\n<endnotes />\n');
    assert.ok(!/<endnotes\b/.test(html), '#406: the zero-notes path no longer leaks a raw <endnotes></endnotes> shell');
    assert.ok(!/<note-list\b/.test(html), '#406: zero notes → nothing is emitted (no empty note-list either)');
    console.log('PASS: #406 — a zero-notes <endnotes/> marker renders nothing (no raw leak)');
  }

  // ── Control: the normal (article-rooted) path is unchanged by the fix ────────
  {
    const html = render('<meta type=article title=A />\n\nText.<note | A normal note that already had a home.>\n');
    assert.ok(html.includes('A normal note that already had a home.') && /id="note-1"/.test(html),
      '#406: a normal article still places its notes in article-back (fix is output-neutral there)');
    console.log('PASS: #406 — the normal article/book path is unaffected (output-neutral)');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run();
