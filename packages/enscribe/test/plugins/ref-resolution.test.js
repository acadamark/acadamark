import assert from 'node:assert/strict';
import { enscribeRefResolution } from '../../src/interpreter/plugins/ref-resolution.js';
import { ensureRegistry } from '../../src/core/registry.js';
import { makeTag } from '../../src/core/tag.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRef(atRef = null, targetKwarg = null) {
  return {
    type: 'enscribeTag',
    tagname: 'ref',
    id: null,
    atRefs: atRef ? [atRef] : [],
    classes: [],
    kwargs: targetKwarg ? { target: targetKwarg } : {},
    booleans: {},
    content: null,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
  };
}

function para(...children) {
  return { type: 'paragraph', children };
}

function makeArticleTree(...bodyChildren) {
  const body = makeTag('article-body', bodyChildren);
  const front = makeTag('article-front', []);
  const article = makeTag('article', [front, body]);
  return { type: 'root', children: [article] };
}

function getBodyChildren(tree) {
  return tree.children[0].content[1].content; // article > article-body.content
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // --- resolved numbered ref produces __ref-marker with computed text ---
  {
    const file = { data: {} };
    const registry = ensureRegistry(file);
    registry.assign('equation', 'eqn:newton', { numbered: true, data: {} });
    registry.numberRegistry();

    const ref = makeRef('eqn:newton');
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const body = getBodyChildren(tree);
    const paraNode = body[0];
    assert.equal(paraNode.children.length, 1);
    const marker = paraNode.children[0];
    assert.equal(marker.tagname, '__ref-marker', 'ref replaced by __ref-marker');
    assert.equal(marker.kwargs.targetId, 'eqn:newton');
    assert.equal(marker.kwargs.text, 'equation 1', 'text is "equation N" from prefix dict');
    console.log('PASS: ref-resolution: resolved numbered ref → __ref-marker with "equation N"');
  }

  // --- #374: a numbered remark / proof ref shows the labelled word, not a bare number ---
  {
    const file = { data: {} };
    const registry = ensureRegistry(file);
    // remark/proof share the theorem-family counter; the abbreviated id prefixes are rem:/prf:.
    registry.assign('remark', 'rem:obs', { numbered: true, data: {} });
    registry.assign('proof', 'prf:main', { numbered: true, data: {} });
    registry.numberRegistry();

    const tree = makeArticleTree(para(makeRef('rem:obs')), para(makeRef('prf:main')));
    enscribeRefResolution()(tree, file);

    const [remMarker, prfMarker] = getBodyChildren(tree).map((p) => p.children[0]);
    // The bug was a BARE NUMBER (no word); the fix is the labelled word from the prefix dict. Assert the
    // word + a number (not a specific counter value — the theorem-family numbering is numbering.js's job).
    assert.match(remMarker.kwargs.text, /^remark \d+$/, '#374: <ref @rem:…> shows "remark N", not a bare number');
    assert.match(prfMarker.kwargs.text, /^proof \d+$/, '#374: <ref @prf:…> shows "proof N", not a bare number');
    console.log('PASS: #374 ref-resolution: numbered remark/proof refs show "remark N" / "proof N"');
  }

  // --- unnumbered labeled ref produces __ref-marker with label-tail text ---
  {
    const file = { data: {} };
    const registry = ensureRegistry(file);
    registry.assign('equation', 'eqn:energy', { numbered: false, data: {} });
    registry.numberRegistry();

    const ref = makeRef('eqn:energy');
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const marker = getBodyChildren(tree)[0].children[0];
    assert.equal(marker.tagname, '__ref-marker');
    assert.equal(marker.kwargs.targetId, 'eqn:energy');
    assert.equal(marker.kwargs.text, 'energy', 'unnumbered label uses label-tail');
    console.log('PASS: ref-resolution: unnumbered labeled ref → label-tail text');
  }

  // --- config prefix override changes the word ---
  {
    const file = { data: {} };
    const registry = ensureRegistry(file);
    registry.assign('equation', 'eqn:newton', { numbered: true, data: {} });
    // Simulate config override: ref-prefix-eqn="Eq."
    file.data.enscribeConfig = new Map([['ref-prefix-eqn', 'Eq.']]);
    registry.numberRegistry();

    const ref = makeRef('eqn:newton');
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const marker = getBodyChildren(tree)[0].children[0];
    assert.equal(marker.kwargs.text, 'Eq. 1', 'config override applied');
    console.log('PASS: ref-resolution: config ref-prefix-eqn overrides default word');
  }

  // --- unresolved ref becomes __ref-error and emits a warning ---
  {
    const messages = [];
    const file = { data: {}, message: (msg) => messages.push(msg) };
    const ref = makeRef('eqn:missing');
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const paraNode = getBodyChildren(tree)[0];
    const errorNode = paraNode.children[0];
    assert.equal(errorNode.tagname, '__ref-error', 'unresolved ref → __ref-error');
    assert.equal(errorNode.kwargs.targetId, 'eqn:missing');
    assert.ok(messages.length > 0, 'file.message called for unresolved ref');
    console.log('PASS: ref-resolution: unresolved ref → __ref-error + warning');
  }

  // --- ref with no target id becomes __ref-error ---
  {
    const file = { data: {} };
    const ref = makeRef(null, null);  // id=null, no target kwarg
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const paraNode = getBodyChildren(tree)[0];
    const errorNode = paraNode.children[0];
    assert.equal(errorNode.tagname, '__ref-error');
    assert.equal(errorNode.kwargs.targetId, '(none)');
    console.log('PASS: ref-resolution: ref with no target id → __ref-error');
  }

  // --- legacy kwarg form <ref target=eqn:newton> also resolves ---
  {
    const file = { data: {} };
    const registry = ensureRegistry(file);
    registry.assign('equation', 'eqn:newton', { numbered: true, data: {} });
    registry.numberRegistry();

    const ref = makeRef(null, 'eqn:newton');  // id=null, target kwarg set
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const paraNode = getBodyChildren(tree)[0];
    const marker = paraNode.children[0];
    assert.equal(marker.tagname, '__ref-marker');
    assert.equal(marker.kwargs.targetId, 'eqn:newton');
    assert.equal(marker.kwargs.text, 'equation 1');
    console.log('PASS: ref-resolution: legacy target kwarg form resolves');
  }

  // --- ref inside a section content is found ---
  {
    const file = { data: {} };
    const registry = ensureRegistry(file);
    registry.assign('figure', 'fig:scatter', { numbered: true, data: {} });
    registry.numberRegistry();

    const ref = makeRef('fig:scatter');
    const section = makeTag('section', [para(ref)]);
    const tree = makeArticleTree(section);
    enscribeRefResolution()(tree, file);

    // Find the marker deep inside the section
    const sectionNode = tree.children[0].content[1].content[0];
    const innerPara = sectionNode.content[0];
    const marker = innerPara.children[0];
    assert.equal(marker.tagname, '__ref-marker');
    assert.equal(marker.kwargs.text, 'figure 1');
    console.log('PASS: ref-resolution: ref inside section is found and replaced');
  }

  // --- refs to non-colon ids always fail (not in label index) ---
  {
    const file = { data: {} };
    // auto-generated id has no colon — NOT in label index
    const registry = ensureRegistry(file);
    registry.assign('equation', null, { numbered: true, data: {} });
    registry.numberRegistry();

    const ref = makeRef('equation-1');
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const paraNode = getBodyChildren(tree)[0];
    const errorNode = paraNode.children[0];
    assert.equal(errorNode.tagname, '__ref-error', 'non-colon id not referenceable');
    console.log('PASS: ref-resolution: non-colon id not in label index → __ref-error');
  }

  // --- node.atRefs[0] takes priority over node.kwargs.target ---
  {
    const file = { data: {} };
    const registry = ensureRegistry(file);
    registry.assign('equation', 'eqn:primary', { numbered: true, data: {} });
    registry.assign('equation', 'eqn:secondary', { numbered: true, data: {} });
    registry.numberRegistry();

    // Both atRefs and target kwarg set — atRefs wins
    const ref = {
      ...makeRef('eqn:primary'),
      kwargs: { target: 'eqn:secondary' },
    };
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const paraNode = getBodyChildren(tree)[0];
    const marker = paraNode.children[0];
    assert.equal(marker.kwargs.targetId, 'eqn:primary', 'node.atRefs[0] takes priority');
    console.log('PASS: ref-resolution: node.atRefs[0] takes priority over kwargs.target');
  }

  // --- unregistered prefix renders just the number ---
  {
    const file = { data: {} };
    const registry = ensureRegistry(file);
    registry.assign('custom', 'custom:thing', { numbered: true, data: {} });
    registry.numberRegistry();

    const ref = makeRef('custom:thing');
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const marker = getBodyChildren(tree)[0].children[0];
    assert.equal(marker.tagname, '__ref-marker');
    assert.equal(marker.kwargs.text, '1', 'unregistered prefix → just the number');
    console.log('PASS: ref-resolution: unregistered prefix renders just the number');
  }

  // ─── G4 PG-6: code-block cross-reference ─────────────────────────────────

  // --- <ref @code:snippet> resolves to label-tail display text ---
  {
    const file = { data: {} };
    const registry = ensureRegistry(file);
    registry.assign('code', 'code:snippet', { numbered: false, data: {} });
    registry.numberRegistry();

    const ref = makeRef('code:snippet');
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const marker = getBodyChildren(tree)[0].children[0];
    assert.equal(marker.tagname, '__ref-marker', 'code ref replaced by __ref-marker');
    assert.equal(marker.kwargs.targetId, 'code:snippet');
    // Unnumbered (numbered: false) → display text is the label-tail.
    assert.equal(marker.kwargs.text, 'snippet', 'unnumbered code ref displays label-tail');
    console.log('PASS: ref-resolution: <ref @code:snippet> → label-tail "snippet" (PG-6)');
  }

  // --- <ref @code:missing> still produces __ref-error ---
  {
    const file = { data: {} };
    ensureRegistry(file);  // empty registry

    const ref = makeRef('code:missing');
    const tree = makeArticleTree(para(ref));
    enscribeRefResolution()(tree, file);

    const marker = getBodyChildren(tree)[0].children[0];
    assert.equal(marker.tagname, '__ref-error', 'unresolved code ref → __ref-error');
    assert.equal(marker.kwargs.targetId, 'code:missing');
    console.log('PASS: ref-resolution: <ref @code:missing> → __ref-error (PG-6)');
  }
}

