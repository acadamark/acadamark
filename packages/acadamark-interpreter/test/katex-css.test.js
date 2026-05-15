import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
import { acadamarkInterpreter, KATEX_CDN_URL } from '../src/index.js';

function processHtml(source, options = {}) {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkAcadamark)
      .use(acadamarkInterpreter, options)
      .processSync(source),
  );
}

const MATH_SOURCE = '<$$ x^2 $$>';
const NO_MATH_SOURCE = 'Just some text.';

export function run() {
  // --- inline mode (default): math doc → <style> present ---
  {
    const html = processHtml(MATH_SOURCE);
    assert.ok(html.includes('<style>'), 'inline (default): <style> in output');
    assert.ok(html.includes('katex'), 'inline (default): KaTeX CSS in style block');
    assert.ok(!html.includes('<link'), 'inline (default): no <link> in output');
    console.log('PASS: katex-css: inline mode (default) → <style> block with KaTeX CSS');
  }

  // --- explicit inline same as default ---
  {
    const htmlDefault = processHtml(MATH_SOURCE);
    const htmlExplicit = processHtml(MATH_SOURCE, { katexCss: 'inline' });
    assert.equal(htmlDefault, htmlExplicit, 'explicit inline = default');
    console.log('PASS: katex-css: explicit katexCss:"inline" is identical to default');
  }

  // --- link mode: math doc → <link rel=stylesheet> present ---
  {
    const html = processHtml(MATH_SOURCE, { katexCss: 'link' });
    assert.ok(html.includes('<link'), 'link mode: <link> in output');
    assert.ok(html.includes('rel="stylesheet"'), 'link mode: rel=stylesheet');
    assert.ok(html.includes('katex'), 'link mode: KaTeX CDN URL in href');
    assert.ok(!html.includes('<style>'), 'link mode: no <style> block');
    console.log('PASS: katex-css: link mode → <link rel="stylesheet"> to KaTeX CDN');
  }

  // --- skip mode: math doc → no CSS ---
  {
    const html = processHtml(MATH_SOURCE, { katexCss: 'skip' });
    assert.ok(!html.includes('<style>'), 'skip mode: no <style>');
    assert.ok(!html.includes('<link'), 'skip mode: no <link>');
    console.log('PASS: katex-css: skip mode → no CSS emitted');
  }

  // --- no math: no CSS even in inline mode ---
  {
    const html = processHtml(NO_MATH_SOURCE);
    assert.ok(!html.includes('<style>'), 'no math: no <style>');
    assert.ok(!html.includes('<link'), 'no math: no <link>');
    console.log('PASS: katex-css: document without math → no CSS injected');
  }

  // --- CSS is prepended before <article> ---
  {
    const html = processHtml(MATH_SOURCE);
    const styleIdx = html.indexOf('<style>');
    const articleIdx = html.indexOf('<article>');
    assert.ok(styleIdx !== -1, 'CSS check: <style> present');
    assert.ok(articleIdx !== -1, 'CSS check: <article> present');
    assert.ok(styleIdx < articleIdx, 'CSS element appears before <article>');
    console.log('PASS: katex-css: <style> block is prepended before <article>');
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
    assert.ok(html.includes('<style>'), 'inline math: <style> injected');
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
