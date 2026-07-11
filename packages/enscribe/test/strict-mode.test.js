// #36 strict mode — the strictness register switch (`<config strict-mode=…>` /
// the `strictMode` render option), three states: off | sigil | canonical. Each
// value names the LOOSEST register still interpreted.
//
// Mechanism: "parse off; re-parse with the register(s) disabled." 'off' is the
// unchanged single parse (byte-identical default). 'sigil' re-parses with the
// markdown idioms disabled — `*`, `#`, `-`, `>`, `` ` ``, `$…$` pass through
// literal EVERYWHERE (incl. tag pipe bodies) while canonical tags + sigils stay
// live, and would-be-markdown text is flagged. 'canonical' additionally removes
// the sigil register from the finder (the sigil-less enscribeSyntax variant), so
// `<# #>` / `<$ $>` / `<->` / `<*>` are literal too and flagged — leaving only
// canonical named tags; the canonical `<li>` and the `^{}`/`_{}` shortcuts stay
// live. Native inferences (blank-line→paragraph, section nesting) stay on always.

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const html = (src, opts = {}) => String(buildEnscribePipeline(opts).processSync(src));
const cfg = (mode) => `<config strict-mode=${mode} />\n\n`;

const hasFlagCss = (h) => h.includes('md-flag {');
const hasFlagSpan = (h) => h.includes('<md-flag');

export async function run() {
  // ── off (default): all three registers live — today's behavior ───────────────
  {
    const src = '*foo* and # NotHere.\n\n# Heading\n\n- a\n- b\n\n`code`\n\n<# Sig Head #>';
    const h = html(src);
    assert.ok(!h.includes('*foo*'), 'off: *foo* is interpreted (not literal)');
    assert.match(h, /<section-title>\s*<h2>Heading<\/h2>/, 'off: # Heading → canonical section');
    assert.ok(/<ul>|<li>/.test(h), 'off: - a / - b → a list');
    assert.ok(h.includes('<code>code</code>'), 'off: `code` → inline code');
    assert.match(h, /<section-title>\s*<h2>Sig Head<\/h2>/, 'off: <# … #> sigil → section');
    assert.ok(!hasFlagCss(h) && !hasFlagSpan(h), 'off: no lint or flag CSS');
    console.log('PASS: #36 — off (default) interprets all three registers; no lint');
  }

  // ── sigil: markdown off; canonical + sigils stay live; markdown flagged ──────
  {
    const src = cfg('sigil') +
      '*foo* and # Heading\n\n`code`\n\n<# Sig Head #>\n\nText <a http://y | link> and <$ x^2 $>.';
    const h = html(src);
    // markdown register OFF — characters survive literally.
    assert.ok(h.includes('*foo*'), 'sigil: *foo* passes through literal');
    assert.ok(!h.includes('<code>code</code>'), 'sigil: `code` is not inline code');
    assert.ok(!/<section-title>\s*<h2>Heading<\/h2>/.test(h), 'sigil: # Heading is not a section');
    // sigil + canonical registers STILL live.
    assert.match(h, /<section-title>\s*<h2>Sig Head<\/h2>/, 'sigil: <# … #> sigil still interprets');
    assert.ok(h.includes('href="http://y"'), 'sigil: the <a … | …> link still interprets');
    assert.ok(/math/i.test(h) && !h.includes('<$'), 'sigil: the <$ … $> math sigil still interprets');
    // markdown is flagged (sigil is no longer silent — flagging rides any non-off rung).
    assert.ok(hasFlagSpan(h) && hasFlagCss(h), 'sigil: would-be-markdown text is flagged + CSS injected');
    console.log('PASS: #36 — sigil turns markdown off (flagged); canonical + sigils stay live');
  }

  // ── #317/2-F: a markdown IMAGE ![…](…) is flagged too (sugar for <fig>/<img>) ─
  {
    const h = html(cfg('sigil') + 'A plain ! mark, a [text](http://l) link, and an ![alt](http://i) image.');
    // markdown register OFF — neither the image nor the link renders; both are flagged would-be-markdown.
    assert.ok(!h.includes('<img'), 'sigil: the markdown image is NOT rendered (markdown register off)');
    assert.ok(/<md-flag[^>]*>!\[alt\]\(/.test(h),
      'sigil: the image ![…](…) is wrapped in a flag span (2-F: the new pattern)');
    assert.ok(/<md-flag[^>]*>\[text\]\(/.test(h),
      'sigil: a plain link […](…) is still flagged (the optional ! did not break the link form)');
    console.log('PASS: #317/2-F — strict mode flags the markdown image ![…](…), not just links');
  }

  // ── #407: GFM footnotes + reference-link definitions are flagged (always-literal non-idioms) ─
  {
    const h = html(cfg('sigil') + 'The effect held.[^1]\n\n[^1]: Wilcoxon, p = 0.003.\n\n[ref]: http://x');
    // The footnote reference, the footnote definition line, and the ref-link definition line all
    // render literally in every mode (#407); in strict mode they are flagged toward <note>/<^>/<a>.
    assert.ok(!h.includes('user-content-fn'), 'sigil: no live footnote marker is minted (#407)');
    assert.ok(h.includes('Wilcoxon, p = 0.003.'), 'sigil: the footnote body is preserved, not lost (#407)');
    assert.ok(/<md-flag[^>]*>\[\^1\]</.test(h), 'sigil: the footnote reference [^1] is flagged');
    assert.ok(/<md-flag[^>]*>\[\^1\]: </.test(h), 'sigil: the footnote definition line [^1]: is flagged');
    assert.ok(/<md-flag[^>]*>\[ref\]: </.test(h), 'sigil: the reference-link definition line [ref]: is flagged');
    console.log('PASS: #407 — strict mode flags GFM footnote references + definition lines toward <note>/<^>/<a>');
  }

  // ── sigil reaches INTO tag pipe bodies (the nested-gap test) ─────────────────
  {
    const h = html(cfg('sigil') + '<aside | *bar* and # nope>');
    assert.ok(h.includes('*bar*') && h.includes('# nope'), 'sigil: markdown inside a pipe body passes through literal');
    console.log('PASS: #36 — sigil reaches the recursive-content sub-parses (pipe bodies markdown-off too)');
  }

  // ── canonical: markdown AND sigils off; only canonical tags interpret ────────
  {
    const src = cfg('canonical') +
      '*foo* and # Heading\n\n<# Sig Head #>\n\n<$ x $>\n\n<list>\n<li> alpha\n<-> beta\n</list>\n\n' +
      '<section | Canon Sec>\n\nEnergy x^{2} and a_{i}.';
    const h = html(src);
    // markdown literal + flagged.
    assert.ok(h.includes('*foo*'), 'canonical: *foo* literal');
    // sigils literal (escaped in HTML) + flagged.
    assert.ok(h.includes('# Sig Head #'), 'canonical: <# … #> sigil passes through literal');
    assert.ok(!/<section-title>\s*<h2>Sig Head<\/h2>/.test(h), 'canonical: <# … #> is NOT a section');
    // canonical named tags STILL live.
    assert.match(h, /<section-title>\s*<h2>Canon Sec<\/h2>/, 'canonical: <section> still interprets');
    // canonical <li> keeps lists authorable; ^{}/_{} shortcuts stay live.
    assert.ok(/<li>[\s\S]*alpha/.test(h), 'canonical: the canonical <li> list item still interprets');
    assert.ok(h.includes('<sup>2</sup>') && h.includes('<sub>i</sub>'), 'canonical: ^{}/_{} shortcuts stay live');
    // both markdown and sigil text flagged.
    assert.ok(hasFlagSpan(h) && hasFlagCss(h), 'canonical: would-be-markdown + would-be-sigil text flagged');
    console.log('PASS: #36 — canonical turns markdown + sigils off; canonical tags / <li> / ^{}_{} stay live');
  }

  // ── canonical flags sigil-looking text specifically ─────────────────────────
  {
    const h = html(cfg('canonical') + 'See <# Heading #> and <$ math $> below.');
    // the flag span wraps the sigil source (escaped <… in HTML).
    assert.ok(/<md-flag[^>]*>(&#x3C;|&lt;)#/.test(h), 'canonical: <# … #> is wrapped in a flag span');
    console.log('PASS: #36 — canonical flags would-be-sigil text (<# … #>, <$ … $>)');
  }

  // ── native inferences are mode-invariant (always on) ─────────────────────────
  {
    for (const mode of ['off', 'sigil', 'canonical']) {
      const h = html(cfg(mode) + 'Para one.\n\nPara two.\n\n<section | Sec>');
      assert.ok((h.match(/<p>/g) || []).length >= 2, `${mode}: blank line → paragraph (native) stays on`);
      assert.match(h, /<section-title>\s*<h2>Sec<\/h2>/, `${mode}: canonical <section> structure stays on`);
    }
    console.log('PASS: #36 — native inferences (blank-line→paragraph, section structure) are mode-invariant');
  }

  // ── no config + no option → off path; no strict artifacts (byte-identical) ────
  {
    const src = '*x* and # y\n\n- z\n\n<# H #>';
    assert.strictEqual(html(src), html(src, {}), 'no-config render is deterministic');
    const h = html(src);
    assert.ok(!h.includes('*x*'), 'no-config: markdown still interprets (off default)');
    assert.ok(!hasFlagCss(h), 'no-config: no flag CSS injected (byte-identical default surface)');
    console.log('PASS: #36 — no config / no option → off path, no strict artifacts (byte-identical default)');
  }

  // ── precedence: the render option wins over <config> (mirrors note-position) ──
  {
    const offWins = html(cfg('canonical') + '*foo* <# H #>', { strictMode: 'off' });
    assert.ok(!hasFlagSpan(offWins) && !offWins.includes('*foo*'), 'option strictMode:off overrides <config strict-mode=canonical>');
    const optCanon = html('<# H #>', { strictMode: 'canonical' });
    assert.ok(optCanon.includes('# H #') && hasFlagSpan(optCanon), 'option strictMode:canonical applies with no <config>');
    console.log('PASS: #36 — the render option wins over <config strict-mode>; precedence matches note-position');
  }

  // ── invalid value falls back to off ──────────────────────────────────────────
  {
    const h = html('<config strict-mode=bogus />\n\n*foo*');
    assert.ok(!h.includes('*foo*') && !hasFlagCss(h), 'an invalid strict-mode value falls back to off');
    console.log('PASS: #36 — an unrecognized strict-mode value falls back to off');
  }
}
