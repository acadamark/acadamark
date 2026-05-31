import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from 'remark-enscribe';
import { enscribeInterpreter, KATEX_CDN_URL, DOCUMENT_FONTS_CDN_URL } from '../src/index.js';

function processHtml(source, options = {}) {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkEnscribe)
      .use(enscribeInterpreter, options)
      .processSync(source),
  );
}

const MATH_SOURCE = '<$$ x^2 $$>';
const NO_MATH_SOURCE = 'Just some text.';

// hast-util-to-html escapes the `&` family-separators in DOCUMENT_FONTS_CDN_URL
// to numeric entities (`&#x26;`), so the raw constant never substring-matches
// serialized HTML. Match the escape-free prefix up to the first `&` instead —
// still distinctive (the Google Fonts css2 Inter request) and robust to whether
// the serializer emits `&#x26;` or `&amp;`.
const FONTS_LINK_PREFIX = DOCUMENT_FONTS_CDN_URL.split('&')[0];

export function run() {
  // --- link mode (default, external-by-default): math doc → <link> present ---
  {
    const html = processHtml(MATH_SOURCE);
    assert.ok(html.includes('<link'), 'link (default): <link> in output');
    assert.ok(html.includes(KATEX_CDN_URL), 'link (default): KaTeX CDN URL in output');
    assert.ok(!html.includes('.katex'), 'link (default): no inline KaTeX CSS');
    console.log('PASS: katex-css: link mode (default) → <link> to KaTeX CDN');
  }

  // --- explicit link same as default ---
  {
    const htmlDefault = processHtml(MATH_SOURCE);
    const htmlExplicit = processHtml(MATH_SOURCE, { katexCss: 'link' });
    assert.equal(htmlDefault, htmlExplicit, 'explicit link = default');
    console.log('PASS: katex-css: explicit katexCss:"link" is identical to default');
  }

  // --- link mode: math doc → <link rel=stylesheet> present ---
  {
    const html = processHtml(MATH_SOURCE, { katexCss: 'link' });
    assert.ok(html.includes('<link'), 'link mode: <link> in output');
    assert.ok(html.includes('rel="stylesheet"'), 'link mode: rel=stylesheet');
    assert.ok(html.includes('katex'), 'link mode: KaTeX CDN URL in href');
    // Document fonts are linked too (external-by-default); no KaTeX CSS inline.
    assert.ok(html.includes(FONTS_LINK_PREFIX), 'link mode: document fonts linked (external-by-default)');
    assert.ok(!html.includes('.katex'), 'link mode: no KaTeX CSS inline (served via <link>)');
    console.log('PASS: katex-css: link mode → <link rel="stylesheet"> to KaTeX CDN');
  }

  // --- skip mode: math doc → no KaTeX CSS; document fonts still linked ---
  {
    const html = processHtml(MATH_SOURCE, { katexCss: 'skip' });
    assert.ok(html.includes(FONTS_LINK_PREFIX), 'skip mode: document fonts still linked');
    assert.ok(!html.includes('.katex'), 'skip mode: no KaTeX CSS (skipped)');
    assert.ok(!html.includes(KATEX_CDN_URL), 'skip mode: no KaTeX <link>');
    console.log('PASS: katex-css: skip mode → no KaTeX CSS emitted; document fonts present');
  }

  // --- no math: document fonts always linked, no KaTeX CSS ---
  {
    const html = processHtml(NO_MATH_SOURCE);
    assert.ok(html.includes(FONTS_LINK_PREFIX), 'no math: document fonts linked');
    assert.ok(!html.includes('.katex'), 'no math: no KaTeX CSS');
    assert.ok(!html.includes(KATEX_CDN_URL), 'no math: no KaTeX <link>');
    console.log('PASS: katex-css: document without math → document fonts linked, no KaTeX CSS');
  }

  // --- linked CSS is prepended before <article> ---
  {
    const html = processHtml(MATH_SOURCE);
    const linkIdx = html.indexOf('<link');
    const articleIdx = html.indexOf('<article>');
    assert.ok(linkIdx !== -1, 'CSS check: <link> present');
    assert.ok(articleIdx !== -1, 'CSS check: <article> present');
    assert.ok(linkIdx < articleIdx, 'linked CSS element appears before <article>');
    console.log('PASS: katex-css: <link> element is prepended before <article>');
  }

  // --- CDN URL is versioned ---
  {
    assert.match(KATEX_CDN_URL, /katex@\d+\.\d+\.\d+/, 'CDN URL has pinned version');
    console.log(`PASS: katex-css: CDN URL is versioned (${KATEX_CDN_URL})`);
  }

  // --- link mode CDN URL matches KATEX_CDN_URL export ---
  {
    const html = processHtml(MATH_SOURCE, { katexCss: 'link' });
    assert.ok(html.includes(KATEX_CDN_URL), 'link mode href matches KATEX_CDN_URL export');
    console.log('PASS: katex-css: link mode href matches exported KATEX_CDN_URL');
  }

  // --- inline math also triggers CSS injection ---
  {
    const inlineMathSource = 'The value is <$ x^2 $> in the equation.';
    const html = processHtml(inlineMathSource);
    assert.ok(html.includes(KATEX_CDN_URL), 'inline math: KaTeX CSS link injected');
    console.log('PASS: katex-css: inline math sigil (<$>) also triggers CSS injection');
  }

  // ── hover-preview.css bundling ──────────────────────────────────────────────

  // --- notes present → hover-preview.css rules are bundled ---
  {
    const src = 'Text.<note | A note.>';
    const html = processHtml(src);
    assert.ok(html.includes('.sidenote-fallback'), 'notes: .sidenote-fallback CSS rule bundled');
    assert.ok(html.includes('note-list ol'), 'notes: note-list ol CSS rule bundled');
    console.log('PASS: katex-css: hover-preview.css rules bundled when notes present');
  }

  // --- no notes → hover-preview.css absent ---
  {
    const html = processHtml('Just text, no notes.');
    assert.ok(!html.includes('.sidenote-fallback'), 'no notes: .sidenote-fallback NOT bundled');
    assert.ok(!html.includes('note-list ol'), 'no notes: note-list ol NOT bundled');
    console.log('PASS: katex-css: hover-preview.css absent when no notes present');
  }

  // --- link mode → hover-preview.css still inlined (local, not on CDN) ---
  {
    const src = 'Text.<note | A note.>';
    const html = processHtml(src, { hoverPreviewMode: 'link' });
    assert.ok(html.includes('.sidenote-fallback'), 'link mode: .sidenote-fallback CSS still inlined');
    console.log('PASS: katex-css: hover-preview.css inlined even in link mode');
  }
}
