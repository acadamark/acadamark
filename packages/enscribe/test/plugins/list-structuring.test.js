// End-to-end tests for the `<list>` construct (#137).
//
// `<list>` is the canonical list element; it lowers to a markdown list node and
// reuses the existing render, so its HTML is identical to a bare markdown list.
// Item markers: the paired sigil `<- … ->` / `<* … *>` (canonical, strict-safe)
// and the `-` / `*` markdown idiom. `<list ordered>` is ordered; `<list>` is
// unordered. See notes/specs/lists.md.
//
// Scope (this slice): single-paragraph items. Multi-paragraph/peer-close, the
// bare `<li>` marker, nesting, and the ordered scheme + start are deferred.
import assert from 'node:assert';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';

const render = (src) =>
  String(buildEnscribePipeline({ embedResources: false, dslMode: 'skip' }).processSync(src));

// Extract the first <ul>…</ul> or <ol>…</ol> block, whitespace-collapsed, so
// equality assertions compare list structure rather than indentation.
const listOf = (html) => {
  const m = html.match(/<(ul|ol)[^>]*>[\s\S]*?<\/\1>/);
  return m ? m[0].replace(/\s+/g, ' ').trim() : '(no list)';
};

export function run() {
  // ── basic: <list> + <- … -> markers → <ul><li> ─────────────────────────────
  {
    const html = render('<list>\n<- first item ->\n<- second item ->\n</list>');
    assert.strictEqual(
      listOf(html),
      '<ul> <li>first item</li> <li>second item</li> </ul>',
      '<list> + <- … -> markers → <ul> with <li> children',
    );
    console.log('PASS: <list> + <- … -> markers → <ul>/<li>');
  }

  // ── <list> + `-` idiom produces the SAME output ────────────────────────────
  {
    const markers = render('<list>\n<- first item ->\n<- second item ->\n</list>');
    const idiom = render('<list>\n- first item\n- second item\n</list>');
    assert.strictEqual(listOf(markers), listOf(idiom), '<- … -> markers and `-` idiom render identically');
    console.log('PASS: <list> + <- … -> markers ≡ <list> + `-` idiom');
  }

  // ── `<* … *>` sigil and `*` idiom behave like `<- … ->` / `-` ───────────────
  {
    const star = render('<list>\n<* a *>\n<* b *>\n</list>');
    const dash = render('<list>\n<- a ->\n<- b ->\n</list>');
    assert.strictEqual(listOf(star), listOf(dash), '<* … *> markers behave like <- … -> markers');
    const starIdiom = render('<list>\n* a\n* b\n</list>');
    assert.strictEqual(listOf(starIdiom), listOf(dash), '`*` idiom behaves like `-` idiom');
    console.log('PASS: <* … *> / * behave like <- … -> / -');
  }

  // ── mixed markers (sigil + idiom) come out as PEERS, not nested ─────────────
  {
    const html = render('<list>\n<- one ->\n- two\n<* three *>\n* four\n</list>');
    assert.strictEqual(
      listOf(html),
      '<ul> <li>one</li> <li>two</li> <li>three</li> <li>four</li> </ul>',
      'mixed markers unify as peer <li> (no nested <ul>)',
    );
    assert.ok(!/<ul>[\s\S]*<ul>/.test(html), 'no double-nested <ul> from mixed markers');
    console.log('PASS: mixed <- … -> / - / <* … *> / * → peer items');
  }

  // ── <list ordered> → <ol> ──────────────────────────────────────────────────
  {
    const html = render('<list ordered>\n<- step one ->\n<- step two ->\n</list>');
    assert.strictEqual(
      listOf(html),
      '<ol> <li>step one</li> <li>step two</li> </ol>',
      '<list ordered> → <ol>',
    );
    console.log('PASS: <list ordered> → <ol>');
  }

  // ── inline tags inside an item are parsed, not literal ──────────────────────
  {
    const html = render('<list>\n<- see <em | this> word ->\n</list>');
    assert.ok(html.includes('<li>see <em>this</em> word</li>'), 'inline <em> inside a marker renders');
    console.log('PASS: inline tag inside <- … -> marker is parsed');
  }

  // ── block-scoped: prose `<-` / `->` is NEVER claimed (the sigil is flow-only)
  {
    const html = render('Map A <- B, then C -> D, done.');
    assert.ok(!html.includes('<li>'), 'prose arrows do not create a list item');
    assert.ok(!html.includes('parse-error'), 'prose `<-` does not raise a parse error');
    // Un-escape entities, then confirm the whole sentence survives in a paragraph.
    const text = html.replace(/&#x3C;/g, '<').replace(/&#x3E;/g, '>');
    assert.ok(text.includes('Map A <- B, then C -> D, done.'), 'the arrow sentence renders verbatim');
    // R-style assignment must survive too.
    const r = render('The value x <- y is assigned.');
    assert.ok(!r.includes('<li>') && !r.includes('parse-error'), '`x <- y` in prose is left literal');
    console.log('PASS: prose `<-` / `->` is not claimed (flow-only sigil)');
  }

  // ── greedy close: an inline `->` inside an item does not close it early ──────
  {
    const html = render('<list>\n<- f maps A -> B ->\n</list>');
    assert.ok(html.includes('<li>f maps A -> B</li>'),
      'the line-final `->` closes; the inline `->` stays content');
    console.log('PASS: inline `->` inside a <- … -> item (greedy line-final close)');
  }

  // ── regression guard: a bare markdown list is byte-identical to <list>+idiom
  {
    const bare = render('- first item\n- second item');
    const wrapped = render('<list>\n- first item\n- second item\n</list>');
    assert.strictEqual(listOf(bare), listOf(wrapped), 'bare `-` list == <list> + `-` idiom (same render path)');
    console.log('PASS: bare `-` list render unchanged (reuses the same path)');
  }
}
