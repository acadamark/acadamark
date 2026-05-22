// Tests for the acadamarkNotePlacement plugin — the four required tests from
// R3a Phase 0 §6.2.
//
// Tests:
//   1. <ref> inside <note> content resolves to __ref-marker (not __ref-error)
//   2. <cite> inside <note> content resolves in document order: a note that
//      appears before an inline citation claims the earlier first-cited slot
//   3. Deferred placement produces correct __note-list structure for all three
//      placement modes (end, foot, side) — integration correctness test for R3a
//   4. <ref> inside <note> targeting another note resolves correctly
//
// All tests run the full mid-pipeline sequence:
//   acadamarkNotes → acadamarkNumbering → numberRegistry → fillNumbering
//   → acadamarkRefResolution (or acadamarkCiteResolution) → acadamarkNotePlacement
//
// This is the sequence the index.js pipeline uses. The tests prove that
// notes staying in the tree through resolution is correct.

import assert from 'node:assert/strict';
import Cite from 'citation-js';
import { acadamarkNotes } from '../../src/plugins/notes.js';
import { acadamarkNotePlacement } from '../../src/plugins/note-placement.js';
import { acadamarkNumbering, fillNumbering } from '../../src/plugins/numbering.js';
import { acadamarkRefResolution } from '../../src/plugins/ref-resolution.js';
import { acadamarkCiteResolution } from '../../src/plugins/cite-resolution.js';
import { ensureRegistry } from '../../src/lib/registry.js';
import { makeTag, isAcadamarkTag } from '../../src/lib/ast-helpers.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function para(value) {
  return { type: 'paragraph', children: [{ type: 'text', value }] };
}

function makeNote(content, { id = null, placement = null } = {}) {
  const kwargs = {};
  if (placement) kwargs.placement = placement;
  return {
    type: 'acadamarkTag',
    tagname: 'note',
    id,
    classes: [],
    kwargs,
    content: Array.isArray(content) ? content : [para(content)],
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
    booleans: {},
  };
}

function makeRef(targetId) {
  return {
    type: 'acadamarkTag',
    tagname: 'ref',
    id: targetId,
    classes: [],
    kwargs: {},
    content: [],
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
    booleans: {},
  };
}

function makeCiteNode(keys) {
  return {
    type: 'acadamarkTag',
    tagname: 'cite',
    id: null,
    classes: [],
    kwargs: {},
    content: null,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: keys,
    booleans: {},
  };
}

function makeEquation(id) {
  return {
    type: 'acadamarkTag',
    tagname: '$$',
    id,
    classes: [],
    kwargs: {},
    content: [{ type: 'text', value: 'F = ma' }],
    contentHandler: 'opaque',
    isOpaqueContent: true,
    positional: [],
    booleans: {},
  };
}

function makeArticleTree(...bodyChildren) {
  const body = makeTag('article-body', bodyChildren);
  const front = makeTag('article-front', []);
  const back = makeTag('article-back', []);
  const article = makeTag('article', [front, body, back]);
  return { type: 'root', children: [article] };
}

function getBack(tree) {
  return tree.children[0].content[2]; // article > article-back
}

function getBody(tree) {
  return tree.children[0].content[1]; // article > article-body
}

/** Recursively find all nodes with a given tagname. */
function findAllTags(nodes, tagname) {
  const found = [];
  for (const n of (nodes ?? [])) {
    if (isAcadamarkTag(n, tagname)) found.push(n);
    if (n.content) found.push(...findAllTags(n.content, tagname));
    if (n.children) found.push(...findAllTags(n.children, tagname));
  }
  return found;
}

/** Run the full mid-pipeline sequence without cite-resolution. */
function runPipeline(tree, file) {
  acadamarkNotes()(tree, file);
  acadamarkNumbering()(tree, file);
  ensureRegistry(file).numberRegistry();
  fillNumbering(file);
  acadamarkRefResolution()(tree, file);
  acadamarkNotePlacement()(tree, file);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // ─── Test 1: <ref> inside <note> content resolves to __ref-marker ─────────

  {
    // Build: equation <$$ #eqn:newton>, then note whose content has <ref #eqn:newton>.
    const refNode = makeRef('eqn:newton');
    const noteContent = [{
      type: 'paragraph',
      children: [{ type: 'text', value: 'See ' }, refNode, { type: 'text', value: '.' }],
    }];
    const note = makeNote(noteContent);
    const eq = makeEquation('eqn:newton');

    const tree = makeArticleTree(eq, para('Body text.'), note);
    const file = { data: {}, message: () => {} };

    runPipeline(tree, file);

    // After placement, note content lives in __note-list-item.content.
    const back = getBack(tree);
    const items = findAllTags(back.content, '__note-list-item');
    assert.equal(items.length, 1, 'one list item');

    const refMarkers = findAllTags(items[0].content, '__ref-marker');
    assert.equal(refMarkers.length, 1, '<ref> inside note resolved to __ref-marker');
    assert.equal(refMarkers[0].kwargs.targetId, 'eqn:newton');
    // text should be "equation 1" (DEFAULT_PREFIXES['eqn'] = 'equation')
    assert.equal(refMarkers[0].kwargs.text, 'equation 1');

    const refErrors = findAllTags(items[0].content, '__ref-error');
    assert.equal(refErrors.length, 0, 'no __ref-error in note content');

    // Confirm no raw <ref> nodes remain anywhere in the tree.
    const rawRefs = findAllTags(tree.children, 'ref');
    assert.equal(rawRefs.length, 0, 'no raw <ref> nodes remain');

    console.log('PASS: note-placement: <ref> inside note content resolves to __ref-marker');
  }

  // ─── Test 2: <cite> inside note resolves in document order ───────────────

  {
    // The note appears BEFORE the inline cite paragraph in the document.
    // After R3a, the note-embedded cite is processed first (document order),
    // so smith2023 gets the earlier first-cited slot (order[0]).
    //
    // Before R3a: notes were extracted to article-back before cite-resolution,
    // so the inline cite would be processed first regardless of authored order.
    // This test pins the intended correctness change.

    const citeBibtex = `
@article{smith2023,
  title   = {Smith Paper},
  author  = {Smith, J.},
  year    = {2023},
  journal = {Test Journal}
}
@article{jones2024,
  title   = {Jones Paper},
  author  = {Jones, K.},
  year    = {2024},
  journal = {Other Journal}
}`;
    const citeInstance = new Cite(citeBibtex, { forceType: '@bibtex/text' });

    const noteContent = [{
      type: 'paragraph',
      children: [
        { type: 'text', value: 'See ' },
        makeCiteNode(['smith2023']),
        { type: 'text', value: '.' },
      ],
    }];
    // Note appears first in the document; inline cite for jones2024 appears after.
    const note = makeNote(noteContent);
    const inlineCitePara = {
      type: 'paragraph',
      children: [
        { type: 'text', value: 'Also ' },
        makeCiteNode(['jones2024']),
        { type: 'text', value: '.' },
      ],
    };

    const tree = makeArticleTree(para('Introduction.'), note, inlineCitePara);
    const file = { data: {}, message: () => {} };
    file.data.acadamarkCitations = { cite: citeInstance, order: [], style: 'apa' };

    // Run without ref-resolution (no refs here); run cite-resolution before placement.
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    acadamarkCiteResolution()(tree, file);
    acadamarkNotePlacement()(tree, file);

    // Document order: note (with smith2023) comes before inline (with jones2024).
    // R3a: cites resolve in authored document order.
    const order = file.data.acadamarkCitations.order;
    assert.equal(order[0], 'smith2023', 'note-embedded cite (authored first) gets first-cited slot');
    assert.equal(order[1], 'jones2024', 'inline cite (authored second) gets second slot');

    // The note list item should have a __cite-marker (not raw <cite>).
    const back = getBack(tree);
    const items = findAllTags(back.content, '__note-list-item');
    assert.equal(items.length, 1, 'one list item');
    const citeMarkers = findAllTags(items[0].content, '__cite-marker');
    assert.equal(citeMarkers.length, 1, '<cite> inside note resolved to __cite-marker');

    console.log('PASS: note-placement: <cite> inside note resolves in document order');
  }

  // ─── Test 3: Deferred placement produces correct structure (all 3 modes) ───

  {
    // Integration correctness: run the full pipeline sequence with one note of
    // each placement mode. Verify markers, list items, IDs, bidirectional links,
    // and the CSS class — the same invariants the updated notes.test.js covers
    // for individual modes, but here as a single-pipeline integration pass.

    const noteEnd  = makeNote('An endnote.',  { id: 'note:end',  placement: 'end' });
    const noteFoot = makeNote('A footnote.',  { id: 'note:foot', placement: 'foot' });
    const noteSide = makeNote('A sidenote.',  { id: 'note:side', placement: 'side' });

    const tree = makeArticleTree(
      para('A'), noteEnd,
      para('B'), noteFoot,
      para('C'), noteSide,
    );
    const file = { data: {}, message: () => {} };

    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    acadamarkNotePlacement()(tree, file);

    const body = getBody(tree);
    const back = getBack(tree);

    // Three markers in the body, no raw <note> nodes.
    const markers = findAllTags(body.content, '__note-marker');
    assert.equal(markers.length, 3, 'three markers in body');
    assert.equal(findAllTags(body.content, 'note').length, 0, 'no raw notes remain');

    // Numbers in document order.
    assert.equal(markers[0].kwargs.number, 1, 'end note is 1');
    assert.equal(markers[1].kwargs.number, 2, 'foot note is 2');
    assert.equal(markers[2].kwargs.number, 3, 'side note is 3');

    // IDs preserved.
    assert.equal(markers[0].kwargs.noteId, 'note:end');
    assert.equal(markers[1].kwargs.noteId, 'note:foot');
    assert.equal(markers[2].kwargs.noteId, 'note:side');

    // One __note-list with 'notes' class (mixed placements).
    const lists = findAllTags(back.content, '__note-list');
    assert.equal(lists.length, 1, 'one __note-list');
    assert.ok(lists[0].classes.includes('notes'), 'mixed placements → notes class');
    assert.equal(lists[0].content.length, 3, 'three list items');

    // Bidirectional links.
    for (const [i, marker] of markers.entries()) {
      const item = lists[0].content[i];
      assert.equal(marker.kwargs.refId, `noteref-${i + 1}`, 'marker.refId set');
      assert.equal(item.kwargs.refId, marker.kwargs.refId, 'list item refId matches marker');
      assert.equal(item.id, marker.kwargs.noteId, 'list item id matches marker noteId');
    }

    // Sidenote flag.
    assert.equal(lists[0].content[0].kwargs.sidenote, false, 'end: sidenote=false');
    assert.equal(lists[0].content[1].kwargs.sidenote, false, 'foot: sidenote=false');
    assert.equal(lists[0].content[2].kwargs.sidenote, true,  'side: sidenote=true');

    console.log('PASS: note-placement: deferred placement produces correct structure (all 3 modes)');
  }

  // ─── Test 4: <ref> inside note targeting another note resolves ────────────

  {
    // Two notes: the first has id 'note:galton' (labeled); the second's content
    // includes <ref #note:galton>. The ref should resolve to __ref-marker with
    // text 'note 1' (DEFAULT_PREFIXES['note'] = 'note'; note:galton is number 1).

    const note1 = makeNote('The Galton board observation.', { id: 'note:galton' });
    const refNode = makeRef('note:galton');
    const note2Content = [{
      type: 'paragraph',
      children: [
        { type: 'text', value: 'See ' }, refNode, { type: 'text', value: ' above.' },
      ],
    }];
    const note2 = makeNote(note2Content);

    const tree = makeArticleTree(para('Body.'), note1, para('Later.'), note2);
    const file = { data: {}, message: () => {} };

    // Run: notes registration → numberRegistry → ref-resolution → placement.
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    acadamarkRefResolution()(tree, file);
    acadamarkNotePlacement()(tree, file);

    const back = getBack(tree);
    const items = findAllTags(back.content, '__note-list-item');
    assert.equal(items.length, 2, 'two list items');

    // note1 (note:galton) is item[0]; note2 is item[1].
    assert.equal(items[0].id, 'note:galton', 'first item id is note:galton');

    // The ref inside note2 should be resolved.
    const refMarkers = findAllTags(items[1].content, '__ref-marker');
    assert.equal(refMarkers.length, 1, '<ref #note:galton> inside note2 resolved');
    assert.equal(refMarkers[0].kwargs.targetId, 'note:galton');
    assert.equal(refMarkers[0].kwargs.text, 'note 1', 'text is "note 1"');

    const refErrors = findAllTags(items[1].content, '__ref-error');
    assert.equal(refErrors.length, 0, 'no __ref-error in note2 content');

    console.log('PASS: note-placement: <ref> inside note targeting another note resolves');
  }
}
