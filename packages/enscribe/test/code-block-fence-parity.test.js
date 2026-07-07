// `<code-block>…</code-block>` and its `` ``` `` fence equivalent render byte-identically — regression.
//
// Bug: the same code, authored as a fence (`` ```\ncode\n``` ``) vs the named long-form
// (`<code-block>\ncode\n</code-block>`), rendered differently — the named form kept a leading newline
// right after the opener (`<pre><code>\ncode…`) that the fence stripped (`<pre><code>code…`). They are
// the SAME construct and must render byte-identically.
//
// Fix (from-markdown.js exitEnscribeLongFormTag): strip the single leading newline — the "content on
// the next line" syntactic artifact of the multi-line opener — from a named code-block's content, so it
// matches the fence. Only the first newline is removed (an intentional leading blank line survives), and
// the trailing newline is kept (the fence keeps it too).

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const render = (src) => String(buildEnscribePipeline({ embedResources: false }).processSync(src));
const pre = (h) => (h.match(/<pre>[\s\S]*?<\/pre>/) || ['(no <pre>)'])[0];

export function run() {
  // The two forms produce byte-identical <pre><code> across content shapes.
  const cases = [
    ['standard', '```\ndef f(x):\n    return x\n```', '<code-block>\ndef f(x):\n    return x\n</code-block>'],
    ['single-line', '```\ncode\n```', '<code-block>\ncode\n</code-block>'],
    ['blank-inside (internal blank line preserved)', '```\na\n\nb\n```', '<code-block>\na\n\nb\n</code-block>'],
    ['with language', '```python\nx = 1\n```', '<code-block python>\nx = 1\n</code-block>'],
  ];
  for (const [name, fence, named] of cases) {
    assert.equal(pre(render(named)), pre(render(fence)),
      'the <code-block> and fence forms render byte-identical <pre><code> — ' + name);
  }
  console.log('PASS: <code-block> and the ``` fence render byte-identically (standard, single-line, blank-inside, with language)');

  // Explicitly: the leading newline is stripped, the code line survives, no leading blank <code> line.
  {
    const html = render('<code-block>\ndef f(x):\n    return x\n</code-block>');
    assert.ok(/<pre><code>def f\(x\)/.test(html), 'the named code-block has NO leading newline before the code (matches the fence)');
    assert.ok(html.includes('    return x'), 'internal indentation is preserved verbatim');
    console.log('PASS: the named code-block strips the opener newline, preserving internal indentation');
  }

  // An intentional leading blank line is preserved (only ONE leading newline — the opener artifact — is stripped).
  {
    const named = pre(render('<code-block>\n\nblank first line\n</code-block>'));
    const fence = pre(render('```\n\nblank first line\n```'));
    assert.equal(named, fence, 'an intentional leading blank line survives in both forms (only the opener newline is stripped)');
    console.log('PASS: an intentional leading blank line is preserved (only the opener newline is stripped)');
  }
}
