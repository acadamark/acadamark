import assert from 'node:assert/strict';
import { acadamarkNotes, fillNotes } from '../../src/plugins/notes.js';
import { ensureRegistry } from '../../src/lib/registry.js';
import { makeTag, isAcadamarkTag } from '../../src/lib/ast-helpers.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function para(value) {
  return { type: 'paragraph', children: [{ type: 'text', value }] };
}

function text(value) {
  return { type: 'text', value };
}

/** Build a note node as acadamarkNotes would see it after remarkRecursiveContent. */
function makeNote(content, { id = null, placement = null, position = null } = {}) {
  const kwargs = {};
  if (placement) kwargs.placement = placement;
  if (position) kwargs.position = position;
  return {
    type: 'acadamarkTag',
    tagname: 'note',
    id,
    classes: [],
    kwargs,
    // After remarkRecursiveContent, a single prose note has a paragraph wrapper.
    content: Array.isArray(content) ? content : [para(content)],
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
    booleans: {},
  };
}

/** Build a minimal article tree wrapping body children. */
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

/** Find all nodes with a given tagname in a node array (shallow+content). */
function findAllTags(nodes, tagname) {
  const found = [];
  for (const n of nodes) {
    if (isAcadamarkTag(n, tagname)) found.push(n);
    if (n.content) found.push(...findAllTags(n.content, tagname));
    if (n.children) found.push(...findAllTags(n.children, tagname));
  }
  return found;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // --- single endnote: marker replaces note inline ---
  {
    const note = makeNote('An important observation.');
    const tree = makeArticleTree(para('Text before.'), note, para('Text after.'));
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const body = getBody(tree);
    // note was replaced by marker
    const markers = findAllTags(body.content, '__note-marker');
    assert.equal(markers.length, 1, 'one marker in body');
    assert.equal(markers[0].kwargs.number, 1, 'marker has number 1');
    assert.ok(markers[0].kwargs.noteId, 'marker has noteId');
    assert.ok(markers[0].kwargs.refId, 'marker has refId');
    // no note or __note-side in body
    assert.equal(findAllTags(body.content, 'note').length, 0, 'no raw note in body');
    assert.equal(findAllTags(body.content, '__note-side').length, 0, 'no side in body');
    console.log('PASS: notes: single endnote marker replaces note inline');
  }

  // --- single endnote: __note-list in article-back ---
  {
    const note = makeNote('An important observation.');
    const tree = makeArticleTree(para('Text.'), note);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const back = getBack(tree);
    const lists = findAllTags(back.content, '__note-list');
    assert.equal(lists.length, 1, 'one __note-list in back');
    const noteList = lists[0];
    assert.ok(noteList.classes.includes('endnotes'), '__note-list has endnotes class');

    const items = noteList.content;
    assert.equal(items.length, 1, 'one list item');
    assert.equal(items[0].tagname, '__note-list-item');
    assert.equal(items[0].kwargs.number, 1);
    console.log('PASS: notes: single endnote note-list in article-back');
  }

  // --- multiple endnotes: sequential numbers ---
  {
    const n1 = makeNote('Note one.');
    const n2 = makeNote('Note two.');
    const n3 = makeNote('Note three.');
    const tree = makeArticleTree(para('A'), n1, para('B'), n2, para('C'), n3);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const body = getBody(tree);
    const markers = findAllTags(body.content, '__note-marker');
    assert.equal(markers.length, 3);
    assert.equal(markers[0].kwargs.number, 1);
    assert.equal(markers[1].kwargs.number, 2);
    assert.equal(markers[2].kwargs.number, 3);

    const back = getBack(tree);
    const list = findAllTags(back.content, '__note-list')[0];
    assert.equal(list.content.length, 3, 'three list items');
    console.log('PASS: notes: multiple endnotes get sequential numbers');
  }

  // --- footnote: goes to article-back with footnotes class ---
  {
    const note = makeNote('A footnote.', { placement: 'foot' });
    const tree = makeArticleTree(para('Text.'), note);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const back = getBack(tree);
    const lists = findAllTags(back.content, '__note-list');
    assert.equal(lists.length, 1);
    assert.ok(lists[0].classes.includes('footnotes'), '__note-list has footnotes class');
    console.log('PASS: notes: footnote collects to article-back with footnotes class');
  }

  // --- sidenote: marker inline, collected to back with sidenote-fallback ---
  {
    const note = makeNote('A sidenote.', { placement: 'side' });
    const tree = makeArticleTree(para('Text.'), note);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const body = getBody(tree);
    const markers = findAllTags(body.content, '__note-marker');
    assert.equal(markers.length, 1, 'one marker in body');
    // No inline side-content node
    assert.equal(findAllTags(body.content, '__note-side').length, 0, 'no __note-side in body');

    // Collected to back with sidenote: true flag
    const back = getBack(tree);
    const lists = findAllTags(back.content, '__note-list');
    assert.equal(lists.length, 1, 'note-list present in back for sidenotes');
    const item = lists[0].content[0];
    assert.equal(item.kwargs.sidenote, true, 'list item has sidenote: true');
    console.log('PASS: notes: sidenote collects to back with sidenote-fallback flag');
  }

  // --- mixed placements share a single document sequence ---
  {
    const n1 = makeNote('End.', { placement: 'end' });
    const n2 = makeNote('Side.', { placement: 'side' });
    const n3 = makeNote('Foot.', { placement: 'foot' });
    const tree = makeArticleTree(para('A'), n1, para('B'), n2, para('C'), n3);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const body = getBody(tree);
    const markers = findAllTags(body.content, '__note-marker');
    assert.equal(markers.length, 3, 'three markers total');
    assert.equal(markers[0].kwargs.number, 1, 'end note is 1');
    assert.equal(markers[1].kwargs.number, 2, 'side note is 2');
    assert.equal(markers[2].kwargs.number, 3, 'foot note is 3');

    // All three placements collect to back
    const back = getBack(tree);
    const lists = findAllTags(back.content, '__note-list');
    assert.equal(lists.length, 1, 'one __note-list for all three placements');
    assert.equal(lists[0].content.length, 3, 'three items (end + side + foot)');
    assert.ok(lists[0].classes.includes('notes'), 'mixed list has notes class');
    console.log('PASS: notes: mixed placements share document sequence');
  }

  // --- author-provided id is preserved ---
  {
    const note = makeNote('A note.', { id: 'note:important' });
    const tree = makeArticleTree(para('Text.'), note);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const body = getBody(tree);
    const marker = findAllTags(body.content, '__note-marker')[0];
    assert.equal(marker.kwargs.noteId, 'note:important', 'author id preserved in marker');

    const back = getBack(tree);
    const item = findAllTags(back.content, '__note-list-item')[0];
    assert.equal(item.id, 'note:important', 'author id preserved in list item');
    console.log('PASS: notes: author-provided id preserved');
  }

  // --- auto-id follows note-N pattern ---
  {
    const note = makeNote('Auto id.');
    const tree = makeArticleTree(para('Text.'), note);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const body = getBody(tree);
    const marker = findAllTags(body.content, '__note-marker')[0];
    assert.equal(marker.kwargs.noteId, 'note-1', 'auto id is note-1');
    console.log('PASS: notes: auto-id follows note-N pattern');
  }

  // --- bidirectional links: marker refId ↔ list item refId ---
  {
    const note = makeNote('Bidirectional.');
    const tree = makeArticleTree(para('Text.'), note);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const body = getBody(tree);
    const marker = findAllTags(body.content, '__note-marker')[0];
    const back = getBack(tree);
    const item = findAllTags(back.content, '__note-list-item')[0];

    // marker.kwargs.refId === item.kwargs.refId (both = 'noteref-1')
    assert.equal(marker.kwargs.refId, `noteref-1`);
    assert.equal(item.kwargs.refId, `noteref-1`);
    // marker.kwargs.noteId === item.id
    assert.equal(marker.kwargs.noteId, item.id);
    console.log('PASS: notes: bidirectional links between marker and list item');
  }

  // --- legacy 'position' kwarg is treated as placement ---
  {
    const note = makeNote('Legacy.', { position: 'side' });
    const tree = makeArticleTree(para('Text.'), note);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    // position=side → sidenote, collects to back with sidenote flag
    const back = getBack(tree);
    const items = findAllTags(back.content, '__note-list-item');
    assert.equal(items.length, 1, 'position=side collected to back');
    assert.equal(items[0].kwargs.sidenote, true, 'sidenote flag set');
    console.log('PASS: notes: legacy position kwarg treated as placement');
  }

  // --- note inside a section is found and replaced ---
  {
    const note = makeNote('Nested note.');
    const section = makeTag('section', [para('Section body.'), note]);
    const tree = makeArticleTree(section);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    // Note should be replaced inside the section
    const allNotes = findAllTags(tree.children, 'note');
    assert.equal(allNotes.length, 0, 'no raw note nodes remain');
    const allMarkers = findAllTags(tree.children, '__note-marker');
    assert.equal(allMarkers.length, 1, 'one marker found inside section');
    console.log('PASS: notes: note inside section is replaced');
  }

  // --- sidenote content is carried into the collected list item ---
  {
    const content = [{ type: 'paragraph', children: [text('A side remark.')] }];
    const note = {
      type: 'acadamarkTag',
      tagname: 'note',
      id: null,
      classes: [],
      kwargs: { placement: 'side' },
      content,
      contentHandler: 'default',
      isOpaqueContent: false,
      positional: [],
      booleans: {},
    };
    const tree = makeArticleTree(para('Text.'), note);
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const back = getBack(tree);
    const item = findAllTags(back.content, '__note-list-item')[0];
    assert.ok(item.content.length > 0, 'list item has content');
    assert.equal(item.content[0].type, 'paragraph');
    assert.equal(item.kwargs.sidenote, true, 'sidenote flag set on item');
    console.log('PASS: notes: sidenote content carried into collected list item');
  }

  // --- note-list is prepended before existing back content ---
  {
    const note = makeNote('Note.');
    const bibliography = makeTag('bibliography', [para('Ref 1.')]);
    const back = makeTag('article-back', [bibliography]);
    const front = makeTag('article-front', []);
    const body = makeTag('article-body', [para('Text.'), note]);
    const article = makeTag('article', [front, body, back]);
    const tree = { type: 'root', children: [article] };
    const file = { data: {} };
    acadamarkNotes()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNotes(tree, file);

    const backContent = tree.children[0].content[2].content;
    assert.equal(backContent[0].tagname, '__note-list', '__note-list is first in back');
    assert.equal(backContent[1].tagname, 'bibliography', 'bibliography follows note-list');
    console.log('PASS: notes: note-list prepended before bibliography in article-back');
  }
}
