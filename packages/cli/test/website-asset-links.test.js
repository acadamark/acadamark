// #296 — a website article page links each document asset (KaTeX + fonts) EXACTLY ONCE, in the page
// head only. The universal shell head (HEAD_ASSET_LINKS via composeWebsiteShellPage) is the single
// source; the embedded article FRAGMENT must no longer re-link them (it used to, via the standalone
// render's injectFonts/injectKaTeX — the #296 double-link). Standalone single-article builds are a
// separate call site (cli.js, embed:true → inline) and keep their self-contained assets.
//
// The article here carries BOTH inline math (→ assets.math true → KaTeX was injected in the fragment
// pre-fix) and a code block, so both assets are exercised. NB the head escapes the fonts URL's `&` as
// `&amp;` while a hast-stringified fragment link would escape it `&#x26;` — so the fragment-absence
// checks use the escaping-agnostic host `fonts.googleapis.com`.

import assert from 'node:assert';
import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildStaticWebsite } from '../src/static-website.js';
import { KATEX_CDN_URL } from '@enscribejs/enscribe';

export function run_tests() {
  const dir = mkdtempSync(join(tmpdir(), 'enscribe-296-'));
  const w = (rel, body) => { const p = join(dir, rel); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, body); };

  w('index.emd', [
    '<meta type=website>', '<title | Asset Site>', '</meta>', '',
    '<nav>',
    '<item src="home" +homepage | Home>',
    '<item src="paper" | Paper>',
    '</nav>',
  ].join('\n'));
  w('home.emd', '<meta type=article>\n<title | Home>\n</meta>\n\nWelcome.');
  // an article with inline math (KaTeX) AND a fenced code block (the code/font path)
  w('paper.emd', [
    '<meta type=article>', '<title | Paper>', '</meta>', '',
    'Mass-energy is $E = mc^2$, integrated:', '',
    '$$\\int_0^1 x\\,dx = \\tfrac12$$', '',
    '```python', 'def f(x):', '    return x + 1', '```', '',
  ].join('\n'));

  const { pages, warnings } = buildStaticWebsite({ masterSource: readFileSync(join(dir, 'index.emd'), 'utf8'), masterDir: dir, defaultCss: '/* css */' });
  assert.ok(!warnings.some((m) => /failed/i.test(m)), `no build failures (warnings: ${warnings.join(' | ')})`);

  const paper = pages.get('paper/index.html');
  assert.ok(paper, 'the paper article page was emitted');
  const headEnd = paper.indexOf('</head>');
  assert.ok(headEnd > 0, 'the article page has a <head>');
  const head = paper.slice(0, headEnd);
  const body = paper.slice(headEnd);

  // sanity: the article really exercises math (else the KaTeX dedup is untested)
  assert.ok(/class="katex/.test(paper), 'the article renders KaTeX math (so the KaTeX asset is exercised)');

  // ── each asset linked EXACTLY ONCE, in the HEAD only ───────────────────────────────────────────
  assert.strictEqual(head.split(`href="${KATEX_CDN_URL}"`).length - 1, 1,
    '#296: the KaTeX CSS is linked exactly once, in the head');
  assert.strictEqual((head.match(/<link[^>]+fonts\.googleapis\.com/g) || []).length, 1,
    '#296: the document fonts are linked exactly once, in the head');

  // ── the article FRAGMENT (body, past </head>) re-links NEITHER ─────────────────────────────────
  assert.ok(!body.includes(KATEX_CDN_URL),
    '#296: the article fragment carries NO KaTeX link — the head is the single source');
  assert.ok(!/fonts\.googleapis\.com/.test(body),
    '#296: the article fragment carries NO document-fonts link (escaping-agnostic check)');

  // ── whole-page totals: each asset appears once across the entire page ───────────────────────────
  assert.strictEqual(paper.split(`href="${KATEX_CDN_URL}"`).length - 1, 1, '#296: KaTeX linked once page-wide');
  assert.strictEqual((paper.match(/<link[^>]+fonts\.googleapis\.com/g) || []).length, 1, '#296: fonts linked once page-wide');

  console.log('PASS: website-asset-links (#296) — a website article links KaTeX + fonts each exactly once (head only); the fragment re-links neither');
}
