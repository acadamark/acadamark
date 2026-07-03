// End-to-end tests for the `<list>` construct (#140 — open-marker model).
//
// `<list>` is the canonical list element; it lowers to a markdown list node and
// reuses the existing render, so its HTML is identical to a bare markdown list.
// Items are OPEN MARKERS — `<li>` (canonical) or the `<->` / `<*>` sigils — whose
// content is the flow that FOLLOWS the marker, peer-closed by the next marker, a
// nested `<list>`, or `</list>`. The `-` / `*` markdown idiom is also accepted.
// `<list ordered>` is ordered; `marker=` / `start` / `reversed` are display args.
// See notes/specs/lists.md.
import assert from 'node:assert';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';

const render = (src) =>
  String(buildEnscribePipeline({ embedResources: false, dslMode: 'skip' }).processSync(src));

// The first <ul>…</ul> / <ol>…</ol> block, whitespace-collapsed, so equality
// assertions compare list structure rather than indentation.
const listOf = (html) => {
  const m = html.match(/<(ul|ol)[^>]*>[\s\S]*?<\/\1>/);
  return m ? m[0].replace(/\s+/g, ' ').trim() : '(no list)';
};
// The opening <ul …> / <ol …> tag (with its attributes), for display-arg checks.
const openTagOf = (html) => {
  const m = html.match(/<(ul|ol)[^>]*>/);
  return m ? m[0] : '(no list)';
};

export function run() {
  // ── canonical <li> markers → <ul><li> ──────────────────────────────────────
  {
    const html = render('<list>\n<li> first item\n<li> second item\n</list>');
    assert.strictEqual(
      listOf(html),
      '<ul> <li>first item</li> <li>second item</li> </ul>',
      '<list> + <li> markers → <ul> with <li> children',
    );
    console.log('PASS: <list> + <li> markers → <ul>/<li>');
  }

  // ── all registers (<li>, <->, <*>, `-`, `*`) → identical eHTML ────────────
  {
    const li        = render('<list>\n<li> a\n<li> b\n</list>');
    const dash       = render('<list>\n<-> a\n<-> b\n</list>');
    const star       = render('<list>\n<*> a\n<*> b\n</list>');
    const idiom      = render('<list>\n- a\n- b\n</list>');
    const starIdiom  = render('<list>\n* a\n* b\n</list>');
    assert.strictEqual(listOf(li), '<ul> <li>a</li> <li>b</li> </ul>', '<li> baseline');
    assert.strictEqual(listOf(dash), listOf(li), '<-> sigil ≡ <li>');
    assert.strictEqual(listOf(star), listOf(li), '<*> sigil ≡ <li>');
    assert.strictEqual(listOf(idiom), listOf(li), '`-` idiom ≡ <li>');
    assert.strictEqual(listOf(starIdiom), listOf(li), '`*` idiom ≡ <li>');
    console.log('PASS: <li> / <-> / <*> / `-` / `*` all lower to identical eHTML');
  }

  // ── <list ordered> → <ol> ──────────────────────────────────────────────────
  {
    const html = render('<list ordered>\n<li> step one\n<li> step two\n</list>');
    assert.strictEqual(
      listOf(html),
      '<ol> <li>step one</li> <li>step two</li> </ol>',
      '<list ordered> → <ol>',
    );
    console.log('PASS: <list ordered> → <ol>');
  }

  // ── multi-paragraph item (peer-close): the following paragraph joins the item
  {
    const html = render('<list>\n<li> Para one.\n\nPara two.\n<li> Item two\n</list>');
    assert.ok(
      /<li>\s*<p>Para one\.<\/p>\s*<p>Para two\.<\/p>\s*<\/li>/.test(html),
      'an item holds the marker line plus the following paragraph (peer-close)',
    );
    console.log('PASS: multi-paragraph item (peer-close)');
  }

  // ── nested <list> inside an item, outer resumes after it ────────────────────
  {
    const html = render(
      '<list>\n<li> Outer A\n<li> Outer B\n<list>\n<li> Inner 1\n<li> Inner 2\n</list>\n<li> Outer C\n</list>',
    );
    assert.ok(html.includes('<li>Inner 1</li>') && html.includes('<li>Inner 2</li>'), 'inner items render');
    assert.ok(/<ul>[\s\S]*<ul>[\s\S]*<\/ul>[\s\S]*<\/ul>/.test(html), 'a nested <ul> is present');
    assert.ok(html.includes('Outer C'), 'content after the nested list resumes the outer list');
    console.log('PASS: nested <list> → nested <ul> inside the item');
  }

  // ── display args: marker= → list-style-type; start / reversed → <ol> attrs ──
  {
    const bullet = render('<list marker=square>\n<li> a\n</list>');
    assert.ok(openTagOf(bullet).includes('list-style-type: square'), 'marker= sets list-style-type');
    const ord = render('<list ordered marker=lower-roman start=3 reversed>\n<li> x\n<li> y\n</list>');
    const tag = openTagOf(ord);
    assert.ok(tag.includes('list-style-type: lower-roman'), 'ordered marker= sets list-style-type');
    assert.ok(/start="?3"?/.test(tag), 'start=N → <ol start>');
    assert.ok(/\breversed\b/.test(tag), 'reversed → <ol reversed>');
    console.log('PASS: marker= / start / reversed ride to the rendered list');
  }

  // ── unknown marker= falls back to the default (no style emitted) ────────────
  {
    const html = render('<list marker=bogus>\n<li> a\n</list>');
    assert.ok(!openTagOf(html).includes('list-style-type'), 'an unknown marker value is not emitted');
    console.log('PASS: unknown marker= → default (no style)');
  }

  // ── inline tags inside an item are parsed, not literal ──────────────────────
  {
    const html = render('<list>\n<li> see <em | this> word\n</list>');
    assert.ok(html.includes('<li>see <em>this</em> word</li>'), 'inline <em> inside a marker renders');
    console.log('PASS: inline tag inside a <li> item is parsed');
  }

  // ── flow-only: prose `<-` / `->` is NEVER claimed ──────────────────────────
  {
    const html = render('Map A <- B, then C -> D, done.');
    assert.ok(!html.includes('<li>'), 'prose arrows do not create a list item');
    assert.ok(!html.includes('parse-error'), 'prose `<-` does not raise a parse error');
    const text = html.replace(/&#x3C;/g, '<').replace(/&#x3E;/g, '>');
    assert.ok(text.includes('Map A <- B, then C -> D, done.'), 'the arrow sentence renders verbatim');
    const r = render('The value x <- y is assigned.');
    assert.ok(!r.includes('<li>') && !r.includes('parse-error'), '`x <- y` in prose is left literal');
    console.log('PASS: prose `<-` / `->` is not claimed (flow-only markers)');
  }

  // ── the `<list>` container is not itself mis-claimed by the `<li` marker ─────
  {
    const html = render('<list>\n<li> ok\n</list>');
    assert.strictEqual(listOf(html), '<ul> <li>ok</li> </ul>', '<list> parses as the container');
    console.log('PASS: <list> container is not mis-claimed as a marker');
  }

  // ── regression guard: a bare markdown list is byte-identical to <list>+idiom
  {
    const bare = render('- first item\n- second item');
    const wrapped = render('<list>\n- first item\n- second item\n</list>');
    assert.strictEqual(listOf(bare), listOf(wrapped), 'bare `-` list == <list> + `-` idiom (same render path)');
    console.log('PASS: bare `-` list render unchanged (reuses the same path)');
  }
}
