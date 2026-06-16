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

  // ── #139: arrow shorthands `-->`/`<--`/`<-->` → →/←/↔ in prose; literal inside
  //    code / pre; the ordering must beat the `--` en-dash rule and `<-->` must
  //    beat `-->`/`<--`. Additive: only fires on the literal sequences. ──────────
  {
    const on = html('Go a --> b, back b <-- a, both a <--> b.');
    assert.ok(on.includes('a → b'), '`-->` → → (U+2192)');
    assert.ok(on.includes('b ← a'), '`<--` → ← (U+2190)');
    assert.ok(on.includes('a ↔ b'), '`<-->` → ↔ (U+2194)');
    // Ordering guards: the arrows must NOT have been eaten by the en-dash rule
    // (`–>`) nor partially consumed (`<→` / `←>` from `<-->`).
    assert.ok(!/[–—]>/.test(on), 'no `–>`/`—>` — arrows ran before the `--`/`---` dash rules');
    assert.ok(!on.includes('<→') && !on.includes('←>'),
      'no `<→`/`←>` — `<-->` ran before `-->`/`<--`');
    // Plain dashes are untouched by the arrow rules: a bare `--` is still an en dash.
    assert.ok(html('x -- y').includes('x – y'), 'bare `--` still → en dash (arrows did not eat it)');

    // Verbatim-exempt: arrows stay literal inside inline code and fenced blocks.
    // Proven escape-agnostically by byte-identity with the transform off (the `<`
    // in `<--`/`<-->` is HTML-escaped by the serializer either way) plus the
    // absence of any arrow glyph — exactly how the dash/quote skip is proven above.
    const codeSrc = 'Mermaid `A --> B` and `C <-- D` and `E <--> F`.';
    const codeOn = region(html(codeSrc), /<code>[\s\S]*?<\/code>/);
    const codeOff = region(html(codeSrc, { smartTypography: false }), /<code>[\s\S]*?<\/code>/);
    assert.equal(codeOn, codeOff, 'inline code byte-identical (arrows not converted inside code)');
    assert.ok(!/[→←↔]/.test(codeOn), 'no arrow glyph inside inline code');

    const preSrc = '```\nflowchart\n  A --> B\n  B <-- C\n  A <--> D\n```';
    const preOn = region(html(preSrc), /<pre[\s\S]*?<\/pre>/);
    const preOff = region(html(preSrc, { smartTypography: false }), /<pre[\s\S]*?<\/pre>/);
    assert.equal(preOn, preOff, 'fenced code block byte-identical (arrows not converted inside pre)');
    assert.ok(!/[→←↔]/.test(preOn), 'no arrow glyph inside fenced code block');

    // Disabled by the toggle, like the other transforms. (No arrow glyph anywhere
    // proves all three rules stayed off; the `-->` literal — which has no `<` to
    // HTML-escape — survives verbatim.)
    const off = html('a --> b <-- c <--> d', { smartTypography: false });
    assert.ok(!/[→←↔]/.test(off), 'smartTypography:false → no arrow glyph');
    assert.ok(off.includes('a --> b'), 'smartTypography:false → `-->` left literal');
    console.log('PASS: smart-typography — arrows -->/<--/<--> convert in prose, literal in code/pre, toggle-off');
  }

  // ── opaque inline span: an apostrophe immediately after inline code / inline
  //    math CLOSES (option b — the span is a token, word-like for quote context),
  //    regardless of the span's literal last char; a trailing space before a
  //    quote still OPENS. This is the #54 curl-bug fix (was: opening quote because
  //    the span's skipped text never advanced quote context). ──────────────────
  {
    assert.ok(html("Code `x`'s.").includes('<code>x</code>’s'),
      "apostrophe right after inline code closes (`x`'s → ’s)");
    assert.ok(html("Punct `f()`'s.").includes('<code>f()</code>’s'),
      'apostrophe after a punctuation-ending code span still closes (token, not its last char)');
    assert.ok(html("Math $x$'s.").includes('</inline-math>’s'),
      "apostrophe right after inline math closes ($x$'s → ’s)");
    assert.ok(!html("Code `x`'s.").includes('<code>x</code>‘s'),
      'regression guard: no OPENING quote immediately after an inline span (the original #54 bug)');
    assert.ok(html("Space `x` 'q'.").includes('<code>x</code> ‘q’'),
      'span + space + quote opens normally (the trailing space resets context to whitespace)');
    console.log('PASS: smart-typography — apostrophe after opaque inline span closes; span+space opens');
  }

  // ── diagnostic error spans (parse-error / tag-error) display LITERAL grammar /
  //    regex / source tokens — smart typography must leave them byte-identical
  //    (marked data.verbatim at the interpreter). ───────────────────────────────
  {
    const tagErr = region(html('before <u, v> after'), /<span class="tag-error">[\s\S]*?<\/span>/);
    assert.ok(tagErr, 'a malformed tag emits a tag-error span');
    assert.ok(!/[“”‘’]/.test(tagErr), 'tag-error literal tokens are NOT curled');
    assert.ok(tagErr.includes('"'), 'tag-error keeps its straight-quoted grammar tokens');

    const parseErr = region(html('<aside | has \\z escape>'), /<span class="parse-error">[\s\S]*?<\/span>/);
    assert.ok(parseErr, 'an unknown escape in tag content emits a parse-error span');
    assert.ok(!/[“”‘’]/.test(parseErr), 'parse-error literal source fragment is NOT curled');
    assert.ok(parseErr.includes('"'), 'parse-error keeps the straight quotes around its source fragment');
    console.log('PASS: smart-typography — parse-error / tag-error tokens left verbatim');
  }
}
