// test/id-scoping.test.js — #267: scope-qualified ids inside sealed minipages.
//
// A <minipage> is a sealed sub-run with its OWN private registry, so auto ids
// (note-N / noteref-N) and author colon-ids restart per box. Two minipages — or the
// same example repeated down an assembled book — therefore collide on id="note-1" /
// id="fig:x" in the rendered document (invalid HTML; an in-page anchor resolves to the
// wrong target, first-match-wins). The sub-run scope-qualifies every id emitted inside a
// box with the box's unique slug (minipageScopeSlug + qualifyScopeIds), on the RESOLVED
// MDAST at the sub-run tail — before the body is converted to hast. These regressions
// assert the emitted ids stay UNIQUE and the box's references stay matched, while the
// one-way seal (outbound refs to document labels) is preserved.

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { qualifyScopeIds } from '../src/interpreter/lib/minipage.js';

const render = (s) => String(buildEnscribePipeline({}).processSync(s));
// Real `id=` attributes only — the leading \s excludes data-*-id substrings (e.g. data-note-id).
const idsOf = (h) => [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

function assertNoDuplicateIds(html, label) {
  const seen = new Set();
  const dup = [];
  for (const id of idsOf(html)) { if (seen.has(id)) dup.push(id); else seen.add(id); }
  assert.deepEqual(dup, [], `${label}: duplicate id(s): ${dup.join(', ')}`);
}

export function run() {
  // 1) THE #267 regression: a DOCUMENT footnote and a MINIPAGE footnote both want
  //    "note-1"; the box's is scope-qualified so they don't collide.
  {
    const html = render('Doc<note | A document footnote.>.\n\n<minipage #mp:demo |\nBox<note | A box footnote.>.\n>');
    assertNoDuplicateIds(html, 'doc-footnote + minipage-footnote');
    assert.ok(html.includes('id="note-1"'), 'the document footnote keeps its bare id');
    assert.ok(html.includes('id="mp-demo-note-1"'), 'the box footnote is scope-qualified by the box slug');
    assert.ok(html.includes('id="mp-demo-noteref-1"') && html.includes('href="#mp-demo-note-1"'),
      'the box note marker↔list links are qualified in lockstep');
  }

  // 2) A two-section article with a note in each — global note numbering keeps the ids
  //    unique (note-1, note-2); a guard against a future per-section reset of the id.
  {
    const html = render('<# Intro #>\nA<note | First.>.\n\n<# Methods #>\nB<note | Second.>.');
    assertNoDuplicateIds(html, 'two-section article, a note in each');
  }

  // 3) The assembled-book pattern: the SAME minipage example repeated. Each box restarts
  //    its private note + colon-id counters, so both want note-1 / fig:ex — qualification
  //    keeps them distinct.
  {
    const box = (n) => `<minipage #mp:${n} |\n<fig #fig:ex src=x.png | A figure.>\nNote<note | n.>.\n>`;
    const html = render(box('a') + '\n\n' + box('b'));
    assertNoDuplicateIds(html, 'two identical minipage examples');
  }

  // 4) The one-way seal is preserved: an in-box <ref> to a box-local id resolves
  //    (qualified in lockstep with the id); an OUTBOUND <ref> to a document label is left
  //    as the document anchor, NOT qualified.
  {
    const html = render('<section #sec:m | Methods>\nBody.\n\n<minipage #mp:r |\n<fig #fig:y src=x.png | Local.>\nSee <ref @fig:y> and <ref @sec:m>.\n>');
    assertNoDuplicateIds(html, 'minipage in-box + outbound refs');
    assert.ok(html.includes('href="#mp-r-fig:y"'), 'in-box ref is qualified to the box-local id');
    assert.ok(html.includes('href="#sec:m"'), 'outbound ref keeps the document anchor (seal preserved)');
  }

  // 5) Bare (id-less) minipages still get unique scope slugs (source-position fallback).
  {
    const html = render('<minipage |\n<note | a.>\n>\n\n<minipage |\n<note | b.>\n>');
    assertNoDuplicateIds(html, 'two bare minipages');
  }

  // 6) Unit: qualifyScopeIds acts on the RESOLVED MDAST. A colon-id'd element is qualified on
  //    node.id (so a <table>/<csv> handler later bakes the qualified id straight into its raw
  //    HTML — no regex over the serialized string); an in-box reference (here a __ref-marker's
  //    kwargs.targetId) is rewritten in lockstep; and a node's STRING content (an <svg> body,
  //    opaque DSL) is NOT descended, so an SVG-internal id is left intact — the documented
  //    boundary (SVG marker/clip ids are referenced by url(#id) we don't track).
  {
    const body = [
      { type: 'enscribeTag', tagname: 'table', id: 'tbl:x', kwargs: {}, content: '' },
      { type: 'enscribeTag', tagname: '__ref-marker', kwargs: { targetId: 'tbl:x', text: 'Table 1' } },
      { type: 'enscribeTag', tagname: 'svg', id: 'fig:s', content: '<marker id="arrow"></marker>' },
    ];
    qualifyScopeIds(body, 'box');
    assert.equal(body[0].id, 'box-tbl:x', "a colon-id'd element is scope-qualified on node.id");
    assert.equal(body[1].kwargs.targetId, 'box-tbl:x', 'an in-box ref (kwargs.targetId) is rewritten in lockstep');
    assert.equal(body[2].id, 'box-fig:s', "the <svg> wrapper's own id is qualified");
    assert.ok(body[2].content.includes('id="arrow"'), 'an <svg>-internal id (in string content) is left intact (documented boundary)');
  }

  // 7) Nesting composes: an inner box's ids pick up BOTH the inner and the outer prefix, so the
  //    same nested example repeated down an assembled book stays unique. The inner box's own id
  //    also gets the outer prefix (two outer boxes each holding an <minipage #mp:i> won't collide).
  {
    const html = render('<minipage #mp:o |\nOuter<note | o.>.\n\n<minipage #mp:i |\n<fig #fig:z src=x.png | inner.>\nInner<note | i.>.\nSee <ref @fig:z>.\n>\n>');
    assertNoDuplicateIds(html, 'nested minipages');
    assert.ok(html.includes('id="mp-o-mp-i-note-1"'), 'an inner-box id is double-prefixed (outer-inner)');
    assert.ok(html.includes('id="mp-o-mp:i"'), "the inner box's own id gets the outer prefix");
    assert.ok(html.includes('href="#mp-o-mp-i-fig:z"'), 'an inner in-box ref is qualified in lockstep with the double prefix');
  }

  // 8) End-to-end raw-HTML path: a colon-id'd data table inside a box emits its id INSIDE the
  //    <table>/<csv> raw-HTML escape hatch. Qualifying node.id before conversion (case 6) lands
  //    the box-unique id in that raw string, and an in-box <ref> to it resolves to the same id.
  {
    const html = render('<minipage #mp:t |\n<table #tab:x csv | a,b\n1,2>\nSee <ref @tab:x>.\n>');
    assertNoDuplicateIds(html, 'colon-id table inside a box');
    assert.ok(/\sid="mp-t-tab:x"/.test(html), "the raw-HTML table id is scope-qualified");
    assert.ok(html.includes('href="#mp-t-tab:x"'), 'an in-box ref into the raw table id is rewritten in lockstep');
  }

  console.log('PASS: id-scoping — minipage member ids are scope-qualified; ids stay unique and box references resolve (#267)');
}
