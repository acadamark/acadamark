// Tests for #411 — the minipage seal follows LaTeX: cites read through, footnotes
// stay sealed, a boxed library is prohibited.
//
// Covers (end-to-end through the real pipeline — the seal is a pipeline property,
// not a single plugin's):
//   - a boxed <cite> resolves against the DOCUMENT's library (read-through), with
//     #409 locators intact
//   - a boxed cite joins the document's first-cited order: a document whose ONLY
//     cite is boxed still renders the document References (the empty-case gate
//     reads the shared order — the "boxed cites feed the bibliography" contract)
//   - no spurious References inside the box (bibliography suppressed in sub-runs);
//     an authored <bibliography> in a box is removed
//   - a boxed <data><library> is prohibited: never loaded, flagged VISIBLY through
//     the #410 misplacement family with the box-scoped cite-count hint (and the
//     flag survives projection — the pre-#411 silent-vanish bug)
//   - a bare boxed <library> gets the same minipage flag (not #410's misleading
//     "move it into <data>" advice)
//   - notes stay sealed: the box's note renders at the box bottom on its own
//     counter (LaTeX), unchanged by the citation read-through

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';

const LIB = `<data>
<library bibtex>
@article{smith2023, author={Smith, Ann}, title={S}, journal={J}, year={2023}}
@book{jones2024, author={Jones, Bo}, title={T}, publisher={P}, year={2024}}
</library>
</data>`;

function render(source) {
  return String(buildEnscribePipeline({}).processSync(source));
}

export function run() {
  let passed = 0;

  // ── boxed cite resolves through the seal, locator intact ────────────────────
  {
    const html = render(`Doc cite <cite @smith2023>.

<minipage caption="Box" |

Boxed <cite @jones2024, p. 7>.

>

${LIB}`);
    assert.match(html, /\(Smith, 2023\)/, 'document cite resolves');
    assert.match(html, /\(Jones, 2024, p\. 7\)/, 'boxed cite resolves with its #409 locator');
    assert.doesNotMatch(html, /\?\?cite: jones2024\?\?/, 'no boxed cite marker');
    console.log('PASS: boxed <cite> resolves against the document library (locator intact)');
    passed++;
  }

  // ── boxed-only cite feeds the document bibliography (shared order) ──────────
  {
    const html = render(`# T

<minipage caption="Box" |

Only cite: <cite @smith2023>.

>

${LIB}`);
    assert.match(html, /\(Smith, 2023\)/, 'boxed-only cite resolves');
    assert.match(html, /References/, 'document References renders (order fed by the boxed cite)');
    assert.match(html, /csl-entry/, 'bibliography entries present');
    console.log('PASS: a document whose only cite is boxed still renders References (shared order)');
    passed++;
  }

  // ── no References inside the box; authored boxed <bibliography> removed ─────
  {
    const html = render(`<minipage caption="Box" |

Boxed <cite @smith2023>.

<bibliography />

>

${LIB}`);
    const figure = html.slice(html.indexOf('<figure'), html.indexOf('</figure>'));
    assert.doesNotMatch(figure, /References/, 'no References inside the box');
    assert.equal(html.split('References').length - 1, 1, 'exactly one (document) References');
    console.log('PASS: bibliography never renders inside a box; authored boxed marker removed');
    passed++;
  }

  // ── boxed <data><library> prohibited: visible #410-family flag + hint ───────
  {
    const html = render(`<minipage caption="Box" |

<data>
<library bibtex>
@article{local2020, author={Cal, Lo}, title={L}, journal={J}, year={2020}}
</library>
</data>

Boxed <cite @local2020>.

>`);
    assert.match(html, /library-error/, 'the misplacement-family flag renders (not silently dropped)');
    assert.match(html, /not allowed inside a minipage/, 'the minipage message');
    assert.match(html, /one document, one library/, "Ariel's rule in the message");
    assert.match(html, /1 citation in this box cannot resolve/, 'box-scoped cite-count hint');
    assert.match(html, /\?\?cite: local2020\?\?/, 'the boxed cite of the unloaded key shows its honest marker');
    console.log('PASS: boxed <data><library> is prohibited — visible flag, cite-count hint, never loaded');
    passed++;
  }

  // ── bare boxed <library> gets the minipage flag, not the #410 move-advice ───
  {
    const html = render(`<minipage caption="Box" |

<library bibtex>
@article{local2020, author={Cal, Lo}, title={L}, journal={J}, year={2020}}
</library>

>`);
    assert.match(html, /not allowed inside a minipage/, 'minipage message for the bare form');
    assert.doesNotMatch(html, /Move the <library> into a <data> block/i, 'no misleading move-into-data advice in a box');
    console.log('PASS: bare boxed <library> flags with the minipage message');
    passed++;
  }

  // ── notes stay sealed: box note at box bottom, own counter ──────────────────
  {
    const html = render(`Doc note.<note | DOC-NOTE>

<minipage caption="Box" |

Box note.<note | BOX-NOTE>

>

${LIB}`);
    const figure = html.slice(html.indexOf('<figure'), html.indexOf('</figure>'));
    assert.match(figure, /BOX-NOTE/, "the box's note body renders inside the box (sealed, box bottom)");
    assert.doesNotMatch(figure, /DOC-NOTE/, "the document's note does not leak into the box");
    console.log('PASS: notes stay sealed (box-local, box bottom) alongside the citation read-through');
    passed++;
  }

  console.log(`minipage-cites (#411): ${passed}/6 passed`);
}
