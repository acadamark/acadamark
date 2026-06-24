// #292 — nested <nav-group> depth-counts in the long-form boundary finder.
//
// A <nav-group> nested inside another <nav-group> must BALANCE: the inner </nav-group> binds to
// the inner open, not the outer, so the inner group + every page inside it survive in the nav
// model. Before the fix the first </nav-group> closed the OUTER group and the inner group (with
// its pages) was orphaned into a tag-error and dropped — so the two-level nav path
// spec-internal-links.md specifies (`references/layer-1/export/`) was not expressible.
//
// The fix has two parts in src/parser/syntax.js, both extending the EXISTING same-name-nestable
// mechanism (no parallel path):
//   1. <nav-group> joins <list> in SELF_NESTABLE_CONTAINERS (the one gate that turns on depth-counting).
//   2. afterOpenGt depth-counts from the FIRST content line, so a nested opener that immediately
//      follows the outer opener (group-in-group, no item between — the spec's case) is counted.
// Every other long-form tag keeps first-close-closes-outer (`<b>a<b>b</b>c</b>` → first </b> closes).

import assert from 'node:assert/strict';
import { VFile } from 'vfile';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { ENSCRIBE_NAV_MODEL } from '../src/core/file-data-keys.js';
import { SELF_NESTABLE_CONTAINERS } from '../src/parser/syntax.js';

const META = '<meta type=website>\n</meta>\n';
function navEntries(navBody) {
  const proc = buildEnscribePipeline({});
  const file = new VFile({ path: 'site.emd', value: META + navBody });
  proc.runSync(proc.parse(META + navBody), file);
  return file.data[ENSCRIBE_NAV_MODEL].entries;
}
const render = (s) => String(buildEnscribePipeline({}).processSync(s));

export function run() {
  // ── #292: the spec's two-level path — group inside group (CONSECUTIVE openers, no item between) ──
  {
    const [refs] = navEntries(
      '<nav>\n<nav-group title="References">\n<nav-group title="Layer 1">\n' +
      '<item src="export" | Export>\n</nav-group>\n</nav-group>\n</nav>',
    );
    assert.equal(refs.kind, 'group');
    assert.equal(refs.title, 'References');
    assert.equal(refs.children.length, 1, 'References nests the Layer 1 group (was dropped pre-#292)');
    const [layer1] = refs.children;
    assert.equal(layer1.kind, 'group');
    assert.equal(layer1.title, 'Layer 1', 'the inner group survives — group-in-group with no item between');
    assert.deepEqual(layer1.children.map((c) => ({ t: c.title, s: c.slug })), [{ t: 'Export', s: 'export' }],
      'the deepest group keeps its page — the `references/layer-1/export/` path is now expressible');
    console.log('PASS: nested <nav-group> (group-in-group) depth-counts — references > layer-1 > export (#292)');
  }

  // ── a nested group with an item BEFORE it, plus a sibling AFTER the nested groups ──
  {
    const entries = navEntries(
      '<nav>\n<item src="a" | A>\n<nav-group title="Outer">\n<item src="b" | B>\n' +
      '<nav-group title="Inner">\n<item src="c" | C>\n</nav-group>\n</nav-group>\n<item src="d" | D>\n</nav>',
    );
    assert.deepEqual(entries.map((e) => e.title), ['A', 'Outer', 'D'],
      'top level: A, Outer group, D — D after the nested groups is a sibling, not swallowed');
    const outer = entries[1];
    assert.deepEqual(outer.children.map((c) => c.title), ['B', 'Inner'], 'Outer nests item B AND the Inner group');
    assert.equal(outer.children[1].kind, 'group');
    assert.deepEqual(outer.children[1].children.map((c) => c.title), ['C'], 'Inner keeps page C');
    console.log('PASS: nested <nav-group> with an item before it + a sibling after — both survive');
  }

  // ── three-level nesting behaves sanely (all consecutive) ──
  {
    const [l1] = navEntries(
      '<nav>\n<nav-group title="L1">\n<nav-group title="L2">\n<nav-group title="L3">\n' +
      '<item src="deep" | Deep>\n</nav-group>\n</nav-group>\n</nav-group>\n</nav>',
    );
    const l2 = l1.children[0];
    const l3 = l2.children[0];
    assert.equal(l1.title, 'L1');
    assert.equal(l2.kind, 'group'); assert.equal(l2.title, 'L2');
    assert.equal(l3.kind, 'group'); assert.equal(l3.title, 'L3');
    assert.deepEqual(l3.children.map((c) => c.title), ['Deep'], 'the depth-3 group holds its page');
    console.log('PASS: three-level <nav-group> nests sanely (L1 > L2 > L3 > Deep)');
  }

  // ── a NON-nestable tag still first-closes (the general rule is unchanged) ──
  {
    // <aside> is long-form but NOT self-nestable: the first </aside> closes the OUTER, so the inner
    // opener (now content) becomes an unclosed tag-error and TRAIL renders OUTSIDE the closed aside.
    // (If <aside> wrongly depth-counted, the outer would scan to EOF and swallow TRAIL.)
    const html = render('<aside>\nOUTER\n<aside>\nINNER\n</aside>\nTRAIL\n');
    assert.match(html, /<\/aside>[\s\S]*<p>TRAIL<\/p>/,
      'a non-nestable <aside> first-closes: TRAIL is a sibling AFTER the closed aside, not swallowed');
    assert.ok(!SELF_NESTABLE_CONTAINERS.has('aside'), '<aside> is not a self-nestable container');
    console.log('PASS: a non-nestable tag (<aside>) still first-closes — the general rule is unchanged');
  }

  // ── the self-nestable set is the single source of truth, exactly {list, nav-group} ──
  {
    assert.deepEqual([...SELF_NESTABLE_CONTAINERS].sort(), ['list', 'nav-group'],
      'SELF_NESTABLE_CONTAINERS is the one gate for which long-form tags depth-count same-name nesting');
    // regression guard for the original member: normal nested <list> (item between) still balances.
    assert.equal((render('<list>\n<li> a\n<list>\n<li> b\n</list>\n<li> c\n</list>').match(/<ul>/g) || []).length, 2,
      'a normal nested <list> still depth-counts → two <ul> (outer + inner)');
    console.log('PASS: SELF_NESTABLE_CONTAINERS = {list, nav-group}; nested <list> still depth-counts');
  }
}
