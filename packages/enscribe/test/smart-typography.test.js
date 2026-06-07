// #54: smart typography — display-projection punctuation on the HTML side.
// Prose curls quotes and converts dashes/ellipses; the verbatim-exempt class
// (inline code, code blocks, math) stays byte-identical; one flag disables it.

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const html = (src, opts = {}) =>
  String(buildEnscribePipeline({ embedResources: false, ...opts }).processSync(src));
const region = (h, re) => (h.match(re) || [''])[0];

export function run() {
  // ── prose: quotes curl, --/---/... convert; code + math (adjacent AND inside
  //    the same paragraph) stay byte-identical ───────────────────────────────
  {
    const src =
      'He said "go"--now---stop... it\'s the \'90s. ' +
      'Keep `code "x" -- --- ...` and math $a -- b ... c$ verbatim.';
    const on = html(src);
    const off = html(src, { smartTypography: false });

    // Prose transforms.
    assert.ok(on.includes('“go”'), 'straight double quotes → curly');
    assert.ok(on.includes('–now'), '-- → en dash');
    assert.ok(on.includes('—stop'), '--- → em dash');
    assert.ok(on.includes('stop…'), '... → ellipsis');
    assert.ok(on.includes('it’s'), "apostrophe in it's → ’");
    assert.ok(on.includes('’90s'), "decade '90s → ’90s");

    // Verbatim-exempt: inline code and math regions are byte-identical to the
    // untransformed render (proves the skip).
    assert.equal(region(on, /<code>[\s\S]*?<\/code>/), region(off, /<code>[\s\S]*?<\/code>/),
      'inline code byte-identical (no typography inside)');
    assert.ok(region(on, /<code>[\s\S]*?<\/code>/).includes('code "x" -- --- ...'),
      'inline code keeps straight quotes / dashes / dots');
    assert.equal(region(on, /<inline-math>[\s\S]*?<\/inline-math>/),
      region(off, /<inline-math>[\s\S]*?<\/inline-math>/),
      'inline math byte-identical (no typography inside)');
    console.log('PASS: smart-typography — prose transforms; inline code + math byte-identical');
  }

  // ── fenced code block: every char byte-identical ──────────────────────────
  {
    const src = '```\nkeep "x" -- --- ... and \'y\' verbatim\n```';
    const on = html(src);
    const off = html(src, { smartTypography: false });
    assert.equal(region(on, /<pre[\s\S]*?<\/pre>/), region(off, /<pre[\s\S]*?<\/pre>/),
      'fenced code block byte-identical');
    assert.ok(on.includes('keep "x" -- --- ... and \'y\' verbatim'),
      'code block content keeps typewriter punctuation');
    console.log('PASS: smart-typography — fenced code block byte-identical');
  }

  // ── toggle: smartTypography:false leaves prose untouched ──────────────────
  {
    const off = html('A "quote", a dash--, dots...', { smartTypography: false });
    assert.ok(!/[“”‘’–—…]/.test(off.replace(/<style[\s\S]*?<\/style>/g, '')),
      'smartTypography:false → no typographic substitution anywhere');
    console.log('PASS: smart-typography — disabled by smartTypography:false');
  }
}
