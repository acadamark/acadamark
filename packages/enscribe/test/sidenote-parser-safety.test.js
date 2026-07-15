// Margin-note parser safety — the sidenote clone must survive a real HTML parse.
//
// The regression this guards (found 2026-07-16): the margin copy was emitted as
// <sidenote><sup>N</sup><p>body</p></sidenote> INSIDE the host paragraph. Serialized
// HTML carries that fine — but a real HTML parser (every browser) force-closes an open
// <p> on a nested <p> start tag (the p-in-button-scope rule), closing the <sidenote>
// with it and EJECTING the note body into the main flow as a sibling paragraph. Result:
// the marker/number floated in the margin while the body rendered in the main text
// column. No test caught it because every assertion ran on the SERIALIZED string, never
// on a parsed DOM. This suite parses the rendered document with JSDOM (a real, spec-
// conformant HTML parser) and asserts DOM containment — red on the pre-fix emission,
// green on the phrasing-safe clone.

import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const render = (src) => String(buildEnscribePipeline({}).processSync(src));

const DOC_WIDE = `<meta type=article>
<title | T>
</meta>

<config note-position=margin />

A paragraph with a note<note | The note body BODYMARK with *emphasis*.> in it, and prose after.
`;

const PER_NOTE = `<meta type=article>
<title | T>
</meta>

Prose with a per-note margin note<note position=margin | Per-note body PERMARK.> inline.
`;

function parsedDom(source) {
  const html = render(source);
  return new JSDOM(html).window.document;
}

export function run() {
  // ── doc-wide note-position=margin ──
  {
    const doc = parsedDom(DOC_WIDE);
    const sn = doc.querySelector('sidenote');
    assert.ok(sn, 'a <sidenote> clone exists in the parsed DOM');
    assert.ok(sn.textContent.includes('BODYMARK'),
      'PARSER SAFETY: the note BODY is inside <sidenote> after a real HTML parse (not ejected into the main flow)');
    // The clone must still sit INSIDE the host paragraph (inline float anchor — the Tufte pattern).
    assert.equal(sn.closest('p')?.tagName, 'P',
      'the <sidenote> stays inside the host paragraph (inline anchor for the margin float)');
    // The body text must NOT appear as a main-flow sibling paragraph (the ejection symptom).
    const strayP = [...doc.querySelectorAll('article p')].find(
      (p) => p.textContent.includes('BODYMARK') && !p.querySelector('sidenote') && !p.closest('sidenote') && !p.closest('note-list'),
    );
    assert.ok(!strayP, 'the note body is NOT a sibling paragraph in the main text column');
    // Inline markup inside the body survives the unwrap.
    assert.ok(sn.querySelector('i'), 'inline markup inside the note body survives in the margin copy');
    // The number and the body share the clone (Tufte: the sup runs into the note text).
    assert.ok(sn.querySelector('sup'), 'the margin copy keeps its note number');
    // The bottom list (the mobile fallback) still carries the full body.
    const li = doc.querySelector('note-list li');
    assert.ok(li && li.textContent.includes('BODYMARK'), 'the bottom note-list fallback still carries the body');
    console.log('PASS: sidenote parser safety — doc-wide margin: body survives a real HTML parse inside <sidenote>');
  }

  // ── per-note position=margin on a default document ──
  {
    const doc = parsedDom(PER_NOTE);
    const sn = doc.querySelector('sidenote');
    assert.ok(sn && sn.textContent.includes('PERMARK'),
      'per-note margin: the body is inside <sidenote> after a real HTML parse');
    assert.equal(sn.closest('p')?.tagName, 'P', 'per-note margin: clone stays inside the host paragraph');
    console.log('PASS: sidenote parser safety — per-note margin: body survives a real HTML parse');
  }

  // ── structural invariant: the clone contains NO element a parser would close a <p> on ──
  {
    const html = render(DOC_WIDE);
    const clone = (html.match(/<sidenote>[\s\S]*?<\/sidenote>/) || [''])[0];
    const closesP = clone.match(/<(address|article|aside|blockquote|details|div|dl|fieldset|figcaption|figure|footer|form|h[1-6]|header|hgroup|hr|main|menu|nav|ol|p|pre|section|summary|table|ul)\b/);
    assert.ok(!closesP, `the emitted clone carries no p-closing block element (found: ${closesP?.[1] ?? 'none'})`);
    console.log('PASS: sidenote parser safety — the emitted clone is phrasing-content only');
  }
}
