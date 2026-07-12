// Always-render recovery for unclosed long-form tags — regression for the invariant violation.
//
// Bug: a long-form opener with no matching close (`<code-block>` with no `</code-block>`, an unclosed
// `<meta>`, any `<tag>…` that never closes) made the finder consume everything after it to EOF as the
// tag's content, which from-markdown flagged as ONE error whose handler dropped the content — so the
// paragraph BEFORE rendered, a `<tag-error>` appeared, and EVERYTHING AFTER vanished. That violates the
// always-render invariant (malformed input flags inline AND the rest of the document still renders).
//
// Fix (plugins/recover-unclosed-tags.js): split each unclosed long-form error into the flagged opener
// marker + the swallowed content re-parsed as document flow (siblings). These tests pin: the tag flags
// inline, the rest renders, it is GENERAL to all long-form tags, it recurses for nested unclosed tags,
// and it is output-neutral for well-formed documents.

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const render = (src) => String(buildEnscribePipeline({ embedResources: false }).processSync(src));
const flagged = (h) => /<tag-error>/.test(h);

export function run() {
  // --- an unclosed <code-block> flags inline AND the rest of the document renders ---
  {
    const html = render('Para before.\n\n<code-block>\ndef f(x):\n    return x\n\nPara after.');
    assert.ok(html.includes('Para before'), 'the paragraph before the unclosed tag renders');
    assert.ok(flagged(html), 'the unclosed tag flags inline as <tag-error>');
    assert.ok(html.includes('Para after'), 'THE PARAGRAPH AFTER THE UNCLOSED TAG RENDERS (always-render)');
    console.log('PASS: unclosed <code-block> — flags inline, and the rest of the document still renders');
  }

  // --- general to all long-form tags: an unclosed <meta> recovers the same way ---
  {
    const html = render('<meta type=article>\n\nPara after meta.');
    assert.ok(flagged(html), 'the unclosed <meta> flags inline');
    assert.ok(html.includes('Para after meta'), 'the content after an unclosed <meta> renders');
    console.log('PASS: recovery is general to all long-form tags (unclosed <meta>)');
  }

  // --- an unclosed tag swallowing a LIST below it: the list still renders (the "indent breaks" symptom) ---
  {
    const html = render('<code-block>\ncode\n\n<list>\n<li> A\n<li> B\n</list>');
    assert.ok(/<ul>[\s\S]*<li>[\s\S]*<\/ul>/.test(html), 'a list below an unclosed tag still renders (Bug B subsumed the "indent breaks" report)');
    console.log('PASS: a list below an unclosed tag renders (the earlier "indent in a list breaks" was a symptom of this)');
  }

  // --- nested unclosed tags: both flag, and the tail after them renders (recursion) ---
  {
    const html = render('<aside>\ntext\n<code-block>\ncode\n\nTail.');
    assert.equal((html.match(/<tag-error>/g) || []).length, 2, 'both nested unclosed tags flag inline');
    assert.ok(html.includes('Tail'), 'the tail after nested unclosed tags renders');
    console.log('PASS: nested unclosed tags each flag inline and the tail still renders (recursive recovery)');
  }

  // --- output-neutral: a well-formed document is unchanged by the recovery pass ---
  {
    const src = '# Title\n\nA paragraph.\n\n<code-block>\nx = 1\n</code-block>\n\n<aside | a note>';
    const withRecovery = render(src);
    assert.ok(!flagged(withRecovery), 'a well-formed document produces no tag-error');
    assert.ok(/<pre><code>/.test(withRecovery) && withRecovery.includes('x = 1'), 'a closed <code-block> renders its content (unaffected)');
    console.log('PASS: the recovery pass is output-neutral for well-formed documents');
  }

  // ── #412: unknown-tag / handler-error warnings ride the vfile when the compiler has one ──
  {
    const proc = buildEnscribePipeline({ embedResources: false });
    const file = proc.processSync('<article>\n\n# T\n\nAn unknown <wibble | tag> here.\n');
    const unknown = file.messages.filter((m) => m.ruleId === 'unknown-tag' && m.source === 'enscribe');
    assert.equal(unknown.length, 1, 'the unknown-tag warning lands on file.messages (not console)');
    assert.ok(unknown[0].reason.includes('<wibble>'), 'names the tag');
    assert.ok(unknown[0].line != null, 'carries the authored position');
    assert.ok(String(file).includes('wibble'), 'the unknown tag still renders visibly (always-renders)');
    console.log('PASS: #412 — unknown-tag warning joins the message stream with position');
  }
}
