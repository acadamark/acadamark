// End-to-end tests for the vocabulary-correction slice:
//   • <a> takes the link target as a positional URL (<a URL | text>);
//   • <fig> and <figure> are equivalent;
//   • markdown bracket links [text](url) and images ![alt](url) render as
//     literal text (no longer lifted);
//   • a bare URL / email autolink still lifts to <a> (NOT a removed idiom);
//   • <img> is no longer a vocabulary tag, so author <img> escapes literally.
import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/index.js';

const render = (src) =>
  String(buildEnscribePipeline({ embedResources: false, dslMode: 'skip' }).processSync(src));

const LT = '&#x3C;';

export function run() {
  // ── <a> positional URL ─────────────────────────────────────────────────────
  {
    const html = render('See <a https://example.com | click here> now');
    assert.ok(
      html.includes('<a href="https://example.com">click here</a>'),
      '<a URL | text> maps the positional to href',
    );
    console.log('PASS: <a URL | text> positional URL → href');
  }
  {
    // kwarg href wins over a positional, and unquoted query strings parse.
    const html = render('X <a https://ex.com?a=1&b=2 | q> Y');
    assert.ok(html.includes('href="https://ex.com?a=1&#x26;b=2"'), 'query-string URL works unquoted');
    console.log('PASS: <a> positional query-string URL');
  }

  // ── <fig> ≡ <figure> ───────────────────────────────────────────────────────
  {
    const fig = render('<fig src="photo.jpg" | A caption>');
    const figure = render('<figure src="photo.jpg" | A caption>');
    assert.ok(fig.includes('<figure>') && fig.includes('<img src="photo.jpg"'), '<fig> renders a figure');
    assert.strictEqual(fig, figure, '<fig> and <figure> produce identical output');
    console.log('PASS: <fig> is an alias for <figure>');
  }

  // ── markdown links / images render literally ───────────────────────────────
  {
    const html = render('See [the docs](https://ex.com) now');
    assert.ok(
      html.includes(`${LT}span>[the docs](https://ex.com)`) || html.includes('[the docs](https://ex.com)'),
      'markdown link renders as literal text',
    );
    assert.ok(!/<a [^>]*href="https:\/\/ex\.com"/.test(html), 'markdown link is NOT a clickable <a>');
    console.log('PASS: [text](url) → literal text');
  }
  {
    const html = render('Look [**bold**](https://ex.com) here');
    assert.ok(html.includes('<b>bold</b>'), 'inline formatting inside a former link still renders');
    assert.ok(html.includes('[') && html.includes('](https://ex.com)'), 'brackets/parens show literally');
    console.log('PASS: [**bold**](url) → literal brackets, bold preserved');
  }
  {
    const html = render('Img ![alt text](photo.jpg) here');
    assert.ok(html.includes('![alt text](photo.jpg)'), 'markdown image renders as literal text');
    assert.ok(!html.includes('<img src="photo.jpg"'), 'markdown image is NOT an <img>');
    console.log('PASS: ![alt](url) → literal text');
  }

  // ── autolinks still lift to <a> (not a removed idiom) ──────────────────────
  {
    const html = render('Mail someone@example.com please');
    assert.ok(html.includes('<a href="mailto:someone@example.com">'), 'bare email still autolinks');
    console.log('PASS: bare email autolink → <a href="mailto:...">');
  }
  {
    const html = render('Visit https://example.com today');
    assert.ok(html.includes('<a href="https://example.com">'), 'bare URL still autolinks');
    console.log('PASS: bare URL autolink → <a>');
  }

  // ── <img> is no longer a vocabulary tag → author <img> escapes ─────────────
  {
    const html = render('An <img src="x.jpg"> here');
    assert.ok(html.includes(`${LT}img src="x.jpg">`), 'author <img> escapes to literal text');
    console.log('PASS: <img ...> → escaped literal (no longer a vocab tag)');
  }

  console.log('All links/images tests passed.');
}
