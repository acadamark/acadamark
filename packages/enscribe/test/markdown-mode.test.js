// #36 strict mode — the markdown-register switch (`<config markdown=…>` / the
// `markdown` render option), three states: on | literal | strict.
//
// Mechanism under test (ratified, #36 Phase 0): "parse on; re-parse with markdown
// disabled." 'on' is the unchanged single parse (byte-identical default). 'literal'
// re-parses the source with the markdown-register idioms disabled — `*`, `#`, `-`,
// `>`, `` ` ``, `[](…)`, `$…$` pass through literal EVERYWHERE, including inside
// tag pipe bodies (the recursive-content sub-parses run idioms-off too) — while
// canonical tags and sigils stay live. 'strict' is literal plus a visible lint
// wrapping would-be-markdown text in a flag span (scoped CSS injected only here).
// Native inferences (blank-line → paragraph, section nesting) stay on in all three.

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const html = (src, opts = {}) => String(buildEnscribePipeline(opts).processSync(src));
const cfg = (mode) => `<config markdown=${mode} />\n\n`;

// emphasis renders as <i>/<em> depending on Layer 1 mapping; rather than depend on
// which, the mode-discriminating signal is whether the literal characters survive.
const hasFlagCss = (h) => h.includes('.enscribe-md-flag {');
const hasFlagSpan = (h) => h.includes('class="enscribe-md-flag"');

export async function run() {
  // ── on (default): the markdown register is live — today's behavior ───────────
  {
    // markdown `[t](url)` is NOT an enscribe link idiom (links are <a url | text>),
    // so the register's genuine idioms here are emphasis, heading, list, code.
    const src = '*foo* and # NotHere.\n\n# Heading\n\n- a\n- b\n\n`code` text';
    const h = html(src);
    assert.ok(!h.includes('*foo*'), 'on: *foo* is interpreted (not literal)');
    assert.ok(h.includes('<section-title>Heading</section-title>'), 'on: # Heading → canonical section');
    assert.ok(/<ul>|<li>/.test(h), 'on: - a / - b → a list');
    assert.ok(h.includes('<code>code</code>'), 'on: `code` → inline code');
    assert.ok(!hasFlagCss(h) && !hasFlagSpan(h), 'on: no strict lint or flag CSS');
    console.log('PASS: #36 — on (default) interprets the markdown register; no lint');
  }

  // ── literal: idioms pass through; canonical + sigil stay live ────────────────
  {
    const src = cfg('literal') +
      '*foo* and # NotHere.\n\n# Heading\n\n- a\n- b\n\n`code` text\n\n' +
      '<section | Canon Sec>\n\n<a http://y | sig link> and <$ x^2 $>.';
    const h = html(src);
    // markdown register OFF — characters survive literally.
    assert.ok(h.includes('*foo*'), 'literal: *foo* passes through as literal characters');
    assert.ok(!/<ul>|<li>/.test(h), 'literal: - a / - b is NOT a list');
    assert.ok(!h.includes('<code>code</code>'), 'literal: `code` is not inline code');
    assert.ok(!h.includes('<section-title>Heading</section-title>'), 'literal: # Heading is not a section');
    // canonical + sigil registers STILL live.
    assert.ok(h.includes('<section-title>Canon Sec</section-title>'), 'literal: canonical <section> still interprets');
    assert.ok(h.includes('href="http://y"'), 'literal: the <a … | …> sigil/canonical link still interprets');
    assert.ok(/math/i.test(h) && !h.includes('<$'), 'literal: the <$ … $> math sigil still interprets');
    // literal is silent — no flag.
    assert.ok(!hasFlagCss(h) && !hasFlagSpan(h), 'literal: silent passthrough — no lint or flag CSS');
    console.log('PASS: #36 — literal turns the markdown register off; canonical + sigil stay live; silent');
  }

  // ── literal reaches INTO tag pipe bodies (the nested-gap test) ───────────────
  {
    const h = html(cfg('literal') + '<aside | *bar* and # nope and `c`>');
    assert.ok(h.includes('*bar*'), 'literal: *bar* inside a pipe body passes through literal');
    assert.ok(h.includes('# nope'), 'literal: # inside a pipe body passes through literal');
    assert.ok(!h.includes('<code>c</code>'), 'literal: `c` inside a pipe body is not inline code');
    console.log('PASS: #36 — literal reaches the recursive-content sub-parses (pipe bodies idioms-off too)');
  }

  // ── strict: literal + a visible flag span + scoped CSS (injected only here) ───
  {
    const h = html(cfg('strict') + '*foo* and `code` and [t](http://u).');
    assert.ok(hasFlagSpan(h), 'strict: would-be-markdown text is wrapped in a flag span');
    assert.ok(hasFlagCss(h), 'strict: the flag CSS is injected');
    // the text still renders (always-renders); the flag wraps the literal chars.
    assert.ok(h.includes('>*foo*<'), 'strict: the flagged text still renders (the * chars are present)');
    console.log('PASS: #36 — strict flags inline markdown (*…*, `…`, [..](..)) + injects the flag CSS');
  }

  // ── strict: leading block markers flagged on EVERY line of a literal block ────
  {
    const h = html(cfg('strict') + '# Heading text\n\n- a\n- b\n\n> quoted');
    const spans = (h.match(/class="enscribe-md-flag"/g) || []).length;
    assert.ok(h.includes('# '), 'strict: # leading marker present (literal)');
    // a multi-line literal block collapses to one text node with embedded newlines;
    // both bullets and the heading + quote are each a flagged line start.
    assert.ok(spans >= 4, `strict: every literal line's block marker is flagged (got ${spans} spans)`);
    console.log('PASS: #36 — strict flags leading block markers per line (#, -, >), not just the first');
  }

  // ── strict: the flag reaches pipe-body text too (lint is a uniform hast pass) ─
  {
    const h = html(cfg('strict') + '<aside | *inner*>');
    assert.ok(hasFlagSpan(h) && h.includes('>*inner*<'), 'strict: markdown inside a pipe body is flagged');
    console.log('PASS: #36 — strict lint is uniform: pipe-body markdown is flagged too');
  }

  // ── native inferences are mode-invariant (always on) ─────────────────────────
  {
    for (const mode of ['on', 'literal', 'strict']) {
      const h = html(cfg(mode) + 'Para one.\n\nPara two.\n\n<section | Sec>');
      const paras = (h.match(/<p>/g) || []).length;
      assert.ok(paras >= 2, `${mode}: blank line → paragraph break (native inference) stays on`);
      assert.ok(h.includes('<section-title>Sec</section-title>'), `${mode}: canonical <section> structure stays on`);
    }
    console.log('PASS: #36 — native inferences (blank-line→paragraph, section structure) are mode-invariant');
  }

  // ── no config + no option → on path; byte-identical to a bare render ──────────
  {
    const src = '*x* and # y\n\n- z';
    assert.strictEqual(html(src), html(src, {}), 'no-config render is deterministic');
    const h = html(src);
    assert.ok(!h.includes('*x*'), 'no-config: markdown still interprets (on default)');
    assert.ok(!hasFlagCss(h), 'no-config: no strict CSS injected (byte-identical default surface)');
    console.log('PASS: #36 — no config / no option → on path, no strict artifacts (byte-identical default)');
  }

  // ── precedence: the render option wins over <config> (mirrors note-position) ──
  {
    // option 'on' overrides an in-document strict → no flags.
    const onWins = html(cfg('strict') + '*foo*', { markdown: 'on' });
    assert.ok(!hasFlagSpan(onWins) && !onWins.includes('*foo*'), 'option markdown:on overrides <config markdown=strict>');
    // option 'literal' with no config → literal.
    const optLiteral = html('*foo*', { markdown: 'literal' });
    assert.ok(optLiteral.includes('*foo*'), 'option markdown:literal applies with no <config>');
    console.log('PASS: #36 — the render option wins over <config markdown>; precedence matches note-position');
  }

  // ── invalid value falls back to on (heuristic: only on|literal|strict take) ───
  {
    const h = html('<config markdown=bogus />\n\n*foo*');
    assert.ok(!h.includes('*foo*'), 'an invalid markdown value falls back to on (markdown interprets)');
    console.log('PASS: #36 — an unrecognized markdown value falls back to on');
  }

  // ── round-trip precondition: a literal document carries no markdown ambiguity ─
  //   The lossy round-trip element was the ambiguous markdown `#` (heading vs
  //   text). In literal/strict every heading is either a canonical <section> or
  //   literal text, and emphasis/lists/links are literal — so the Layer-1 form has
  //   no markdown-register construct to lose. (The full serialize→re-parse loop via
  //   the `lift` CLI entry point is NOT exercised here: liftToCanonicalMdast is
  //   hardwired markdown-on and does not honor the mode — see the slice's drift
  //   finding. This asserts the property #36 establishes, not lift's behavior.)
  {
    const h = html(cfg('literal') + '# Was-heading\n\n*was-em* and `was-code`\n\n<section | Real Sec>');
    assert.ok(h.includes('# Was-heading') && h.includes('*was-em*') && h.includes('`was-code`'),
      'literal: would-be-markdown survives as literal text (no ambiguous heading/em/code)');
    assert.ok(h.includes('<section-title>Real Sec</section-title>'),
      'literal: real structure is the canonical <section> (the unambiguous, round-trippable form)');
    console.log('PASS: #36 — literal output is markdown-ambiguity-free (the lossless round-trip precondition)');
  }
}
