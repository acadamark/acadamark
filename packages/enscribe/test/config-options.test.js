// Global configuration options — verification that the live <config> counter
// suppressors and the hoverPreviewMode render option change output as
// documented (#15).
//
// Scope-related config (note-scope, counter-reset-scope) is exercised by the
// book fixtures (document-44/45/46: chapter-prefixed numbers and per-book-part
// footnote lists). This suite covers the on/off counter suppressors and the
// hover-preview switch, which previously had no direct coverage.

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

function processHtml(source, options = {}) {
  return String(buildEnscribePipeline({ embedResources: false, ...options }).processSync(source));
}

const withConfig = (src, kw) => `${src}\n\n<config ${kw}>\n</config>`;

export function run() {
  // --- number-figures: default labels the figure; =false suppresses it ---
  {
    const figSrc = '<fig #f1 | A cat.>';
    const on = processHtml(figSrc);
    const off = processHtml(withConfig(figSrc, 'number-figures=false'));
    assert.ok(/Figure\s*1\./.test(on), 'number-figures default: "Figure 1." label present');
    assert.ok(!/Figure\s*1\./.test(off), 'number-figures=false: figure label suppressed');
    console.log('PASS: config: number-figures=false suppresses the figure label');
  }

  // --- number-equations: default numbers the display equation; =false suppresses ---
  {
    const eqSrc = '<$$ #e1 | x = 1 $$>';
    const on = processHtml(eqSrc);
    const off = processHtml(withConfig(eqSrc, 'number-equations=false'));
    assert.ok(on !== off, 'number-equations=false changes the equation output');
    assert.ok(/eqn-number|equation-number|\(1\)/.test(on), 'number-equations default: equation numbered');
    assert.ok(!/eqn-number|equation-number|\(1\)/.test(off), 'number-equations=false: equation number suppressed');
    console.log('PASS: config: number-equations=false suppresses the equation number');
  }

  // --- hoverPreviewMode: ONE switch for footnote / ref / cite previews ---
  {
    const noteSrc = 'Body text.<note | The note body.>';
    const inline = processHtml(noteSrc, { hoverPreviewMode: 'inline' });
    const skip = processHtml(noteSrc, { hoverPreviewMode: 'skip' });
    assert.ok(/tippy|popper/i.test(inline), 'hoverPreviewMode inline: bundles Tippy/Popper assets');
    assert.ok(!/tippy|popper/i.test(skip), 'hoverPreviewMode skip: no Tippy/Popper assets');
    assert.ok(/note-list|noteref|note-id/i.test(skip), 'hoverPreviewMode skip: footnote list still rendered');
    console.log('PASS: config: hoverPreviewMode skip omits hover assets but keeps the footnote list');
  }
}
