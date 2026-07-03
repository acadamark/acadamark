// View-source formatting — visual neutrality (#117).
//
// The rendered eHTML is pretty-printed for readable view-source (rehype-format,
// wrapped enscribe-inline-aware: lib/format-html.js). The HARD constraint is that formatting
// changes ONLY the source text, never the rendering. This gate proves that:
//
//   1. formatHtml is RENDER-NEUTRAL — for every case, the formatted output and the raw
//      (unformatted) output collapse to the SAME significant-whitespace form.
//   2. The whitespace-sensitive contexts are untouched — <pre>/<code> interiors byte-identical,
//      and NO whitespace is inserted inside math output (the KaTeX spans stay on one line).
//   3. It actually fixes the bug — plain rehype-format inserts a render-changing space around a
//      tight inline custom element (`($x$)` → `( x)`); formatHtml does not.
//   4. It still formats — block structure is indented (the readability win).
//
// The render oracle (`renderModel`) is the load-bearing piece: it models TRUE HTML rendering
// significance by treating enscribe's inline custom elements (inline-math, term) as the inline
// elements they are before collapsing whitespace — so it can SEE the spurious space that
// rehype-format/minify-whitespace alone (which mis-classify those customs as block) cannot.

import assert from 'node:assert';
import { fromHtml } from 'hast-util-from-html';
import { minifyWhitespace } from 'hast-util-minify-whitespace';
import { toHtml } from 'hast-util-to-html';
import rehypeFormat from 'rehype-format';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { formatHtml, ENSCRIBE_INLINE_ELEMENTS } from '../src/interpreter/lib/format-html.js';

const html = (tree) => toHtml(tree, { allowDangerousHtml: true });
const parse = (s) => fromHtml(s, { fragment: true });

/**
 * Collapse `source` to its significant-whitespace form, modelling TRUE rendering: enscribe
 * inline custom elements are presented as inline (`<span>`) so whitespace around them is kept
 * iff it renders. Two HTML strings that render identically collapse to the same string here.
 */
function renderModel(source) {
  const tree = parse(source);
  (function swap(node) {
    if (node.type === 'element' && ENSCRIBE_INLINE_ELEMENTS.has(node.tagName)) node.tagName = 'span';
    for (const child of node.children || []) swap(child);
  })(tree);
  minifyWhitespace(tree, { newlines: true });
  return html(tree);
}

// Representative rendered-output snippets (mimicking what the engine emits).
const M = '<inline-math><span class="katex"><span class="mord">x</span></span></inline-math>';
const CASES = {
  'tight inline-math after "("': `<p>See (${M}) ok.</p>`,
  'tight inline-math after "["': `<p>Ref [${M}] here.</p>`,
  'tight inline-math after a word': `<p>the term${M} ends.</p>`,
  'spaced inline-math': `<p>the value ${M} is set.</p>`,
  'tight term after "("': '<p>(<term>gizmo</term>) and a <term>widget</term> too.</p>',
  'display-math (block) between paragraphs':
    '<article><article-body><p>before</p><display-math><span class="katex-display">D</span></display-math><p>after</p></article-body></article>',
  'block structure': '<article><article-body><section><section-title>T</section-title><p>hi</p></section></article-body></article>',
};

export async function run() {
  // ── (1) formatHtml is render-neutral for every case ─────────────────────────────────
  {
    for (const [name, h] of Object.entries(CASES)) {
      const fmt = parse(h);
      formatHtml(fmt);
      assert.strictEqual(renderModel(h), renderModel(html(fmt)),
        `${name}: formatHtml changes only insignificant whitespace (render-neutral)`);
    }
    console.log(`PASS: #117 — formatHtml is render-neutral across ${Object.keys(CASES).length} representative cases`);
  }

  // ── (2) whitespace-sensitive contexts untouched ─────────────────────────────────────
  {
    const pre = parse('<pre><code class="language-js">const x=1;\n  two();\n</code></pre>');
    formatHtml(pre);
    assert.ok(html(pre).includes('const x=1;\n  two();\n'),
      '<pre>/<code> interior whitespace is byte-identical (untouched)');

    const math = parse(`<p>a ${M} b</p>`);
    formatHtml(math);
    assert.ok(html(math).includes(M),
      'inline-math interior stays one line — no whitespace inserted inside the math output');
    console.log('PASS: #117 — <pre>/<code> and math interiors are untouched (byte-identical)');
  }

  // ── (3) it fixes the bug: rehype-format ALONE is NOT neutral; formatHtml is ──────────
  {
    const h = `<p>See (${M}) ok.</p>`;     // tight: math against "("
    const old = parse(h); rehypeFormat()(old);
    const neu = parse(h); formatHtml(neu);
    assert.notStrictEqual(renderModel(h), renderModel(html(old)),
      'rehype-format ALONE inserts a render-changing space around the tight inline math (the bug)');
    assert.strictEqual(renderModel(h), renderModel(html(neu)),
      'formatHtml preserves the rendering of the tight inline math (the fix)');
    console.log('PASS: #117 — the latent `($x$)`→`( x)` spurious-space bug is demonstrated and fixed');
  }

  // ── (4) it still formats block structure (the readability win) ──────────────────────
  {
    const t = parse(CASES['block structure']);
    formatHtml(t);
    const out = html(t);
    assert.ok(/\n\s+<section>/.test(out) && /\n\s+<p>hi<\/p>/.test(out),
      'block structure is indented onto its own lines (readable view-source)');
    console.log('PASS: #117 — block structure is still indented for readable view-source');
  }

  // ── (5) end-to-end through the compiler: tight cases render with no inserted space ───
  {
    const proc = buildEnscribePipeline({});
    const out = String(proc.processSync('<meta type=article title="T" />\n\nSee ($a$) and (<term>g</term>) and $z$ ok.'));
    assert.ok(out.includes('(<inline-math'),
      'pipeline: a tight `($x$)` renders with NO space before <inline-math>');
    assert.ok(out.includes('(<term>g</term>)'),
      'pipeline: a tight `(<term>…)` renders with no inserted space');
    assert.ok(/ <inline-math[^>]*>.*?<\/inline-math> ok\./.test(out),
      'pipeline: a space-surrounded `$z$` keeps its single spaces');
    console.log('PASS: #117 — end-to-end: tight inline math/term render with no spurious whitespace');
  }

  console.log('All view-source formatting visual-neutrality (#117) checks passed.');
}
