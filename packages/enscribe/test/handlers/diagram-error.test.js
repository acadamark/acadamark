// C2 (#437) — a diagram with an unknown/absent engine emits the VISIBLE marker family
// (the ⚠ [role=alert] voice shared with asset/library/include errors), not the old bare
// `<pre class="enscribe-error">` with the diagnosis buried in a data- attribute.

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';

const render = (src) => String(buildEnscribePipeline({}).processSync(src));

export function run() {
  // ── an unknown engine → the marker-family block; the source is still shown; the old bare pre is gone ──
  {
    const html = render('<meta type=article title=D />\n\n<diagram bogusengine |\ngraph TD\n  A --> B\n>\n');
    assert.match(html, /<div class="enscribe-diagram-error" role="alert">/, 'C2: unknown engine emits the [role=alert] marker-family block');
    assert.match(html, /⚠ unknown diagram engine/, 'C2: the marker carries the ⚠ diagnostic voice');
    assert.match(html, /mermaid, abc/, 'C2: the marker names the accepted engines');
    assert.match(html, /graph TD/, 'C2: the source is still shown (nothing is lost)');
    assert.doesNotMatch(html, /class="enscribe-error"/, 'C2: the old bare <pre class="enscribe-error"> is gone');
    console.log('PASS: diagram-error (#437) — unknown engine emits the visible marker family, source shown');
  }

  // ── a valid engine (mermaid) renders no error marker ──
  {
    const html = render('<meta type=article title=D />\n\n<diagram mermaid |\ngraph TD\n  A --> B\n>\n');
    assert.doesNotMatch(html, /enscribe-diagram-error/, 'C2: a valid engine renders no error marker');
    console.log('PASS: diagram-error (#437) — a valid engine is untouched');
  }
}
