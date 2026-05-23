import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import { acadamarkNormalizeMarkdown, gfmTableToPipeString } from '../../src/plugins/normalize-markdown.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse authored acadamark shorthand and return the first content node.
 * Used to produce the "authoritative" node to compare against.
 */
function parseAuthoredShorthand(source) {
  const tree = unified().use(remarkParse).use(remarkAcadamark).parse(source);
  // The parser wraps in root > paragraph; shorthand sigil nodes may be direct
  // children of root or inside a paragraph. Find the first acadamarkTag.
  function findTag(nodes) {
    for (const n of nodes) {
      if (n.type === 'acadamarkTag') return n;
      if (n.children) { const r = findTag(n.children); if (r) return r; }
    }
    return null;
  }
  return findTag(tree.children);
}

/**
 * Parse bare markdown math using remark-math, run the normalization pass,
 * and return the normalized node.
 */
function parseAndNormalize(source) {
  const tree = unified().use(remarkParse).use(remarkMath).parse(source);
  acadamarkNormalizeMarkdown()(tree);
  function findTag(nodes) {
    for (const n of nodes) {
      if (n.type === 'acadamarkTag') return n;
      if (n.children) { const r = findTag(n.children); if (r) return r; }
    }
    return null;
  }
  return findTag(tree.children);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // ── Core normalization ────────────────────────────────────────────────────

  // --- bare $...$ normalizes to canonical $ node ---
  {
    const tree = unified().use(remarkParse).use(remarkMath).parse('Text $x^2$ text.');
    acadamarkNormalizeMarkdown()(tree);
    // Find the normalized node inside root > paragraph > children
    const para = tree.children[0];
    const mathNode = para.children.find((n) => n.type === 'acadamarkTag');
    assert.ok(mathNode, 'math node found after normalization');
    assert.equal(mathNode.tagname, '$', 'tagname is $');
    assert.equal(mathNode.content, 'x^2', 'content is LaTeX value');
    assert.equal(mathNode.isOpaqueContent, true, 'isOpaqueContent true');
    assert.equal(mathNode.contentHandler, 'math', 'contentHandler is math');
    console.log('PASS: normalize-markdown: bare $...$ normalizes to canonical $ node');
  }

  // --- bare $$...$$ normalizes to canonical $$ node ---
  {
    const tree = unified().use(remarkParse).use(remarkMath).parse('\n$$\nx = \\frac{-b}{2a}\n$$\n');
    acadamarkNormalizeMarkdown()(tree);
    const mathNode = tree.children.find((n) => n.type === 'acadamarkTag');
    assert.ok(mathNode, '$$ math node found after normalization');
    assert.equal(mathNode.tagname, '$$', 'tagname is $$');
    assert.equal(mathNode.isOpaqueContent, true, 'isOpaqueContent true');
    assert.equal(mathNode.contentHandler, 'math-display', 'contentHandler is math-display');
    console.log('PASS: normalize-markdown: bare $$$...$$ normalizes to canonical $$ node');
  }

  // --- all required fields present on normalized $ node ---
  {
    const node = parseAndNormalize('$a + b$');
    assert.ok(node, 'node found');
    assert.equal(node.type, 'acadamarkTag', 'type');
    assert.equal(node.form, 'short', 'form');
    assert.equal(node.tagname, '$', 'tagname');
    assert.deepEqual(node.positional, [], 'positional');
    assert.deepEqual(node.booleans, {}, 'booleans');
    assert.deepEqual(node.kwargs, {}, 'kwargs');
    assert.equal(node.id, null, 'id');
    assert.deepEqual(node.classes, [], 'classes');
    assert.deepEqual(node.atRefs, [], 'atRefs');
    assert.equal(node.content, 'a + b', 'content');
    assert.equal(node.isOpaqueContent, true, 'isOpaqueContent');
    assert.equal(node.selfClosing, false, 'selfClosing');
    assert.equal(node.contentHandler, 'math', 'contentHandler');
    console.log('PASS: normalize-markdown: all required fields present on normalized $ node');
  }

  // --- all required fields present on normalized $$ node ---
  {
    const node = parseAndNormalize('\n$$\n\\alpha + \\beta\n$$\n');
    assert.ok(node, 'node found');
    assert.equal(node.type, 'acadamarkTag', 'type');
    assert.equal(node.form, 'short', 'form');
    assert.equal(node.tagname, '$$', 'tagname');
    assert.deepEqual(node.positional, [], 'positional');
    assert.deepEqual(node.booleans, {}, 'booleans');
    assert.deepEqual(node.kwargs, {}, 'kwargs');
    assert.equal(node.id, null, 'id');
    assert.deepEqual(node.classes, [], 'classes');
    assert.deepEqual(node.atRefs, [], 'atRefs');
    assert.equal(node.isOpaqueContent, true, 'isOpaqueContent');
    assert.equal(node.selfClosing, false, 'selfClosing');
    assert.equal(node.contentHandler, 'math-display', 'contentHandler');
    console.log('PASS: normalize-markdown: all required fields present on normalized $$ node');
  }

  // ── Field-for-field identity with authored shorthand ─────────────────────
  //
  // This is the normalization principle: a bare $x^2$ through remark-math
  // + normalization pass must produce a node indistinguishable from an
  // authored <$ x^2 $> through remark-acadamark. The exact same fields at
  // the exact same values — downstream cannot tell the difference.

  // --- normalized $ node matches authored <$ ... $> field-for-field ---
  {
    const authored = parseAuthoredShorthand('<$ x^2 $>');
    const normalized = parseAndNormalize('$x^2$');

    assert.ok(authored, 'authored node found');
    assert.ok(normalized, 'normalized node found');

    // Fields that must match exactly.
    assert.equal(normalized.type,            authored.type,            'type matches');
    assert.equal(normalized.form,            authored.form,            'form matches');
    assert.equal(normalized.tagname,         authored.tagname,         'tagname matches');
    assert.equal(normalized.isOpaqueContent, authored.isOpaqueContent, 'isOpaqueContent matches');
    assert.equal(normalized.selfClosing,     authored.selfClosing,     'selfClosing matches');
    assert.equal(normalized.contentHandler,  authored.contentHandler,  'contentHandler matches');
    assert.equal(normalized.id,              authored.id,              'id matches');
    assert.deepEqual(normalized.positional,  authored.positional,      'positional matches');
    assert.deepEqual(normalized.booleans,    authored.booleans,        'booleans matches');
    assert.deepEqual(normalized.kwargs,      authored.kwargs,          'kwargs matches');
    assert.deepEqual(normalized.classes,     authored.classes,         'classes matches');
    assert.deepEqual(normalized.atRefs,      authored.atRefs,          'atRefs matches');

    // Content: authored has leading/trailing space inside sigil tags trimmed
    // by the parser. Bare $x^2$ via remark-math has no surrounding space.
    // Both values must be valid LaTeX (no outer whitespace difference in meaning).
    assert.equal(normalized.content.trim(), authored.content.trim(), 'content (trimmed) matches');

    console.log('PASS: normalize-markdown: normalized $ node matches authored <$ ... $> field-for-field');
  }

  // --- normalized $$ node matches authored <$$ ... $$> field-for-field ---
  {
    const authored = parseAuthoredShorthand('<$$ \\alpha + \\beta $$>');
    const normalized = parseAndNormalize('\n$$\n\\alpha + \\beta\n$$\n');

    assert.ok(authored, 'authored node found');
    assert.ok(normalized, 'normalized node found');

    assert.equal(normalized.type,            authored.type,            'type matches');
    assert.equal(normalized.form,            authored.form,            'form matches');
    assert.equal(normalized.tagname,         authored.tagname,         'tagname matches');
    assert.equal(normalized.isOpaqueContent, authored.isOpaqueContent, 'isOpaqueContent matches');
    assert.equal(normalized.selfClosing,     authored.selfClosing,     'selfClosing matches');
    assert.equal(normalized.contentHandler,  authored.contentHandler,  'contentHandler matches');
    assert.equal(normalized.id,              authored.id,              'id matches');
    assert.deepEqual(normalized.positional,  authored.positional,      'positional matches');
    assert.deepEqual(normalized.booleans,    authored.booleans,        'booleans matches');
    assert.deepEqual(normalized.kwargs,      authored.kwargs,          'kwargs matches');
    assert.deepEqual(normalized.classes,     authored.classes,         'classes matches');
    assert.deepEqual(normalized.atRefs,      authored.atRefs,          'atRefs matches');
    assert.equal(normalized.content.trim(),  authored.content.trim(),  'content (trimmed) matches');

    console.log('PASS: normalize-markdown: normalized $$ node matches authored <$$ ... $$> field-for-field');
  }

  // ── No-op on already-canonical nodes ─────────────────────────────────────

  // --- authored sigil node is not re-processed ---
  {
    // If authored <$ x $> somehow lands in the tree (it won't via remark-math,
    // but this confirms walkNormalize's predicate doesn't fire on acadamarkTag nodes).
    const authored = parseAuthoredShorthand('<$ x $>');
    // Wrap in a tree to run the pass.
    const tree = { type: 'root', children: [{ type: 'paragraph', children: [authored] }] };
    acadamarkNormalizeMarkdown()(tree);
    // Should be unchanged (acadamarkTag.type !== 'inlineMath').
    const after = tree.children[0].children[0];
    assert.equal(after.type, 'acadamarkTag', 'still acadamarkTag');
    assert.equal(after.tagname, '$', 'tagname unchanged');
    assert.equal(after.content, authored.content, 'content unchanged');
    console.log('PASS: normalize-markdown: authored sigil node not re-processed by normalization');
  }

  // ── math.meta discarded ───────────────────────────────────────────────────

  // --- math.meta field is silently discarded ---
  {
    // remark-math sets math.meta from info string of fenced code blocks:
    // ```math\ntex\n``` → { type: 'math', meta: 'math', value: 'tex' }
    // The canonical acadamarkTag has no analog for meta; it is discarded.
    const mathNode = { type: 'math', meta: 'some-meta', value: 'E = mc^2' };
    const tree = { type: 'root', children: [mathNode] };
    acadamarkNormalizeMarkdown()(tree);
    const result = tree.children[0];
    assert.equal(result.type, 'acadamarkTag', 'normalized to acadamarkTag');
    assert.equal(result.tagname, '$$', 'tagname is $$');
    assert.equal(result.content, 'E = mc^2', 'content is the value');
    assert.equal(result.meta, undefined, 'meta not present on normalized node');
    console.log('PASS: normalize-markdown: math.meta is silently discarded');
  }

  // ── Tree is unchanged when no math present ────────────────────────────────

  // --- no math nodes: tree is unchanged ---
  {
    const tree = unified().use(remarkParse).use(remarkMath).parse('Just plain text.');
    const jsonBefore = JSON.stringify(tree);
    acadamarkNormalizeMarkdown()(tree);
    const jsonAfter = JSON.stringify(tree);
    assert.equal(jsonBefore, jsonAfter, 'tree unchanged when no math present');
    console.log('PASS: normalize-markdown: no math nodes — tree unchanged');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GFM table normalization (Option A, NORM-tables slice)
  // ══════════════════════════════════════════════════════════════════════════

  // Helper: parse source with remark-gfm and find the top-level `table` node.
  function parseGfmTable(source) {
    const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
    return tree.children.find(n => n.type === 'table') ?? null;
  }

  // Helper: parse source with remark-gfm, run the normalization pass,
  // and return the normalized acadamarkTag node.
  function parseGfmAndNormalize(source) {
    const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
    // Pass a fake VFile so file.message() is observable.
    const file = { messages: [], message(msg) { this.messages.push(msg); } };
    acadamarkNormalizeMarkdown()(tree, file);
    return {
      node: tree.children.find(n => n.type === 'acadamarkTag') ?? null,
      file,
    };
  }

  // ── gfmTableToPipeString: serializer unit tests ───────────────────────────

  // --- simple plain-text table serializes correctly ---
  {
    const tableNode = parseGfmTable('| A | B |\n| - | - |\n| 1 | 2 |');
    assert.ok(tableNode, 'table node found');
    const str = gfmTableToPipeString(tableNode, null);
    assert.ok(str.includes('| A | B |'), 'header row present');
    assert.ok(str.includes('| --- | --- |') || str.includes('| --- |'), 'delimiter row present');
    assert.ok(str.includes('| 1 | 2 |'), 'body row present');
    console.log('PASS: normalize-markdown: gfmTableToPipeString: simple plain-text table');
  }

  // --- alignment: left/right/center/null → correct delimiter cells ---
  {
    const tableNode = parseGfmTable('| A | B | C | D |\n| :- | -: | :-: | - |\n| 1 | 2 | 3 | 4 |');
    assert.ok(tableNode, 'table node found');
    const str = gfmTableToPipeString(tableNode, null);
    assert.ok(str.includes(':--'), 'left align delimiter');
    assert.ok(str.includes('--:'), 'right align delimiter');
    assert.ok(str.includes(':-:'), 'center align delimiter');
    assert.ok(str.includes('---'), 'no-align delimiter');
    console.log('PASS: normalize-markdown: gfmTableToPipeString: alignment delimiters');
  }

  // --- pipe in cell text is escaped as \\| ---
  {
    // In GFM, `\|` in a cell is a literal `|`. remark-gfm parses `\|` → text `|`.
    const tableNode = parseGfmTable('| A\\|B | C |\n| - | - |\n| D | E |');
    assert.ok(tableNode, 'table node found');
    const str = gfmTableToPipeString(tableNode, null);
    // The serialized string must have \\| for the cell containing a literal pipe.
    assert.ok(str.includes('\\|'), 'pipe in cell text is escaped');
    console.log('PASS: normalize-markdown: gfmTableToPipeString: pipe in cell text escaped as \\|');
  }

  // --- markup loss warning emitted when emphasis present ---
  {
    const tableNode = parseGfmTable('| **Bold** | Normal |\n| - | - |\n| 1 | 2 |');
    assert.ok(tableNode, 'table node found');
    const messages = [];
    const fakeFile = { message(msg) { messages.push(msg); } };
    const str = gfmTableToPipeString(tableNode, fakeFile);
    assert.ok(messages.length > 0, 'warning emitted for markup');
    assert.ok(typeof str === 'string' && str.length > 0, 'string still produced');
    // The bold text is present as plain text in the output.
    assert.ok(str.includes('Bold'), 'plain text from bold cell is present');
    console.log('PASS: normalize-markdown: gfmTableToPipeString: warning emitted for markup loss');
  }

  // --- no warning for plain-text-only cells ---
  {
    const tableNode = parseGfmTable('| X | Y |\n| - | - |\n| 1 | 2 |');
    assert.ok(tableNode, 'table node found');
    const messages = [];
    const fakeFile = { message(msg) { messages.push(msg); } };
    gfmTableToPipeString(tableNode, fakeFile);
    assert.equal(messages.length, 0, 'no warning for plain-text cells');
    console.log('PASS: normalize-markdown: gfmTableToPipeString: no warning for plain-text cells');
  }

  // --- single-column table serializes correctly ---
  {
    const tableNode = parseGfmTable('| Single |\n| - |\n| Row1 |\n| Row2 |');
    assert.ok(tableNode, 'table node found');
    const str = gfmTableToPipeString(tableNode, null);
    assert.ok(str.includes('| Single |'), 'header present');
    assert.ok(str.includes('| Row1 |'), 'body row 1 present');
    assert.ok(str.includes('| Row2 |'), 'body row 2 present');
    console.log('PASS: normalize-markdown: gfmTableToPipeString: single-column table');
  }

  // --- header-only table (no body rows) serializes correctly ---
  {
    // GFM requires a delimiter row, but the table can have zero body rows.
    const tableNode = parseGfmTable('| H1 | H2 |\n| - | - |');
    assert.ok(tableNode, 'table node found');
    const str = gfmTableToPipeString(tableNode, null);
    const lines = str.split('\n').filter(l => l.trim() !== '');
    assert.equal(lines.length, 2, 'exactly header + delimiter (no body)');
    console.log('PASS: normalize-markdown: gfmTableToPipeString: header-only table');
  }

  // ── Normalization pass: table entry ──────────────────────────────────────

  // --- bare pipe table normalizes to acadamarkTag ---
  {
    const { node } = parseGfmAndNormalize('| X | Y |\n| - | - |\n| a | b |');
    assert.ok(node, 'acadamarkTag found after normalization');
    assert.equal(node.tagname, 'table', 'tagname is table');
    console.log('PASS: normalize-markdown: bare pipe table normalizes to acadamarkTag');
  }

  // --- all required fields present on normalized table node ---
  {
    const { node } = parseGfmAndNormalize('| X | Y |\n| - | - |\n| a | b |');
    assert.ok(node, 'node found');
    assert.equal(node.type, 'acadamarkTag', 'type');
    assert.equal(node.form, 'short', 'form');
    assert.equal(node.tagname, 'table', 'tagname');
    assert.deepEqual(node.positional, ['md'], 'positional');
    assert.deepEqual(node.booleans, {}, 'booleans');
    assert.deepEqual(node.kwargs, {}, 'kwargs');
    assert.equal(node.id, null, 'id');
    assert.deepEqual(node.classes, [], 'classes');
    assert.deepEqual(node.atRefs, [], 'atRefs');
    assert.equal(node.isOpaqueContent, true, 'isOpaqueContent');
    assert.equal(node.selfClosing, false, 'selfClosing');
    assert.equal(node.contentHandler, 'table', 'contentHandler');
    assert.ok(typeof node.content === 'string', 'content is a string');
    assert.ok(node.content.length > 0, 'content is non-empty');
    console.log('PASS: normalize-markdown: all required fields on normalized table node');
  }

  // --- field-for-field identity with authored <table md | ...> ---
  //
  // The normalization principle: a bare pipe table through remark-gfm
  // + normalization pass must produce a node with the same structure-level
  // fields as an authored <table md | ...> tag.
  {
    // Authored node: parse <table md | ...> via remark-acadamark.
    const authoredTree = unified().use(remarkParse).use(remarkAcadamark).parse(
      '<table md | | X | Y |\n| - | - |\n| a | b |\n>',
    );
    function findTag(nodes) {
      for (const n of nodes) {
        if (n.type === 'acadamarkTag') return n;
        if (n.children) { const r = findTag(n.children); if (r) return r; }
      }
      return null;
    }
    const authored = findTag(authoredTree.children);
    assert.ok(authored, 'authored table node found');

    const { node: normalized } = parseGfmAndNormalize('| X | Y |\n| - | - |\n| a | b |');
    assert.ok(normalized, 'normalized node found');

    assert.equal(normalized.type,            authored.type,            'type matches');
    assert.equal(normalized.form,            authored.form,            'form matches');
    assert.equal(normalized.tagname,         authored.tagname,         'tagname matches');
    assert.equal(normalized.isOpaqueContent, authored.isOpaqueContent, 'isOpaqueContent matches');
    assert.equal(normalized.selfClosing,     authored.selfClosing,     'selfClosing matches');
    assert.equal(normalized.contentHandler,  authored.contentHandler,  'contentHandler matches');
    assert.equal(normalized.id,              authored.id,              'id matches');
    assert.deepEqual(normalized.positional,  authored.positional,      'positional matches');
    assert.deepEqual(normalized.booleans,    authored.booleans,        'booleans matches');
    assert.deepEqual(normalized.kwargs,      authored.kwargs,          'kwargs matches');
    assert.deepEqual(normalized.classes,     authored.classes,         'classes matches');
    assert.deepEqual(normalized.atRefs,      authored.atRefs,          'atRefs matches');
    console.log('PASS: normalize-markdown: normalized table node matches authored <table md | ...> field-for-field');
  }

  // ── Footnote harmlessness ─────────────────────────────────────────────────
  //
  // remark-gfm enables GFM footnotes ([^1] / [^1]: ...) in addition to
  // tables. Footnote nodes are NOT matched by any NORMALIZATIONS predicate.
  // They pass through the normalization walk unchanged, falling through to
  // mdast-util-to-hast's built-in footnote handler. No collision with the
  // acadamark <note> system at the parser/normalization level.

  // --- footnoteReference node is not normalized ---
  {
    const tree = unified().use(remarkParse).use(remarkGfm).parse(
      'A note[^1]\n\n[^1]: The footnote text.',
    );
    const before = JSON.stringify(tree);
    const file = { messages: [], message(msg) { this.messages.push(msg); } };
    acadamarkNormalizeMarkdown()(tree, file);
    // The footnote nodes should not have been converted to acadamarkTag.
    function hasType(nodes, t) {
      for (const n of nodes) {
        if (n.type === t) return true;
        if (n.children && hasType(n.children, t)) return true;
      }
      return false;
    }
    // footnoteReference nodes should still be present (not replaced).
    // (remark-gfm may produce 'footnoteReference' in the paragraph.)
    // We verify no acadamarkTag with tagname 'note' was produced.
    function findTagByName(nodes, name) {
      for (const n of nodes) {
        if (n.type === 'acadamarkTag' && n.tagname === name) return n;
        if (n.children) { const r = findTagByName(n.children, name); if (r) return r; }
      }
      return null;
    }
    const noteTag = findTagByName(tree.children, 'note');
    assert.equal(noteTag, null, 'footnoteReference not converted to acadamark <note>');
    assert.equal(file.messages.length, 0, 'no warnings from footnote normalization');
    console.log('PASS: normalize-markdown: footnoteReference not normalized (harmless pass-through)');
  }
}
