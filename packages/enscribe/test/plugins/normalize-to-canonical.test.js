import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '../../src/parser/index.js';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import { enscribeNormalizeToCanonical, gfmTableToPipeString } from '../../src/interpreter/plugins/normalize-to-canonical.js';
// Alias kept locally so the existing test bodies (which use the prior
// function name) need fewer edits. The exported `enscribeNormalizeMarkdown`
// is itself a backward-compat alias for `enscribeNormalizeToCanonical`.
const enscribeNormalizeMarkdown = enscribeNormalizeToCanonical;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse authored enscribe shorthand and return the first content node,
 * AFTER running the normalize-to-canonical gate. This is the post-gate
 * canonical shape — what every downstream stage sees.
 */
function parseAuthoredShorthand(source) {
  const tree = unified().use(remarkParse).use(remarkEnscribe).parse(source);
  // Run the gate so authored sigil tagnames get rewritten to canonical
  // (e.g. authored <$ x $> → tagname 'inline-math' after the gate).
  enscribeNormalizeMarkdown()(tree);
  function findTag(nodes) {
    for (const n of nodes) {
      if (n.type === 'enscribeTag') return n;
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
  enscribeNormalizeMarkdown()(tree);
  function findTag(nodes) {
    for (const n of nodes) {
      if (n.type === 'enscribeTag') return n;
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
    enscribeNormalizeMarkdown()(tree);
    // Find the normalized node inside root > paragraph > children
    const para = tree.children[0];
    const mathNode = para.children.find((n) => n.type === 'enscribeTag');
    assert.ok(mathNode, 'math node found after normalization');
    assert.equal(mathNode.tagname, 'inline-math', 'tagname is canonical inline-math');
    assert.equal(mathNode.content, 'x^2', 'content is LaTeX value');
    assert.equal(mathNode.isOpaqueContent, true, 'isOpaqueContent true');
    assert.equal(mathNode.contentHandler, 'math', 'contentHandler is math');
    console.log('PASS: normalize-to-canonical: bare $...$ normalizes to canonical inline-math node');
  }

  // --- bare $$...$$ normalizes to canonical $$ node ---
  {
    const tree = unified().use(remarkParse).use(remarkMath).parse('\n$$\nx = \\frac{-b}{2a}\n$$\n');
    enscribeNormalizeMarkdown()(tree);
    const mathNode = tree.children.find((n) => n.type === 'enscribeTag');
    assert.ok(mathNode, '$$ math node found after normalization');
    assert.equal(mathNode.tagname, 'display-math', 'tagname is canonical display-math');
    assert.equal(mathNode.isOpaqueContent, true, 'isOpaqueContent true');
    assert.equal(mathNode.contentHandler, 'math-display', 'contentHandler is math-display');
    console.log('PASS: normalize-to-canonical: bare $$...$$ normalizes to canonical display-math node');
  }

  // --- all required fields present on normalized $ node ---
  {
    const node = parseAndNormalize('$a + b$');
    assert.ok(node, 'node found');
    assert.equal(node.type, 'enscribeTag', 'type');
    assert.equal(node.form, 'short', 'form');
    assert.equal(node.tagname, 'inline-math', 'tagname is canonical inline-math');
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
    console.log('PASS: normalize-to-canonical: all required fields present on normalized inline-math node');
  }

  // --- all required fields present on normalized $$ node ---
  {
    const node = parseAndNormalize('\n$$\n\\alpha + \\beta\n$$\n');
    assert.ok(node, 'node found');
    assert.equal(node.type, 'enscribeTag', 'type');
    assert.equal(node.form, 'short', 'form');
    assert.equal(node.tagname, 'display-math', 'tagname is canonical display-math');
    assert.deepEqual(node.positional, [], 'positional');
    assert.deepEqual(node.booleans, {}, 'booleans');
    assert.deepEqual(node.kwargs, {}, 'kwargs');
    assert.equal(node.id, null, 'id');
    assert.deepEqual(node.classes, [], 'classes');
    assert.deepEqual(node.atRefs, [], 'atRefs');
    assert.equal(node.isOpaqueContent, true, 'isOpaqueContent');
    assert.equal(node.selfClosing, false, 'selfClosing');
    assert.equal(node.contentHandler, 'math-display', 'contentHandler');
    console.log('PASS: normalize-to-canonical: all required fields present on normalized display-math node');
  }

  // ── Field-for-field identity with authored shorthand ─────────────────────
  //
  // This is the normalization principle: a bare $x^2$ through remark-math
  // + normalization pass must produce a node indistinguishable from an
  // authored <$ x^2 $> through @enscribejs/enscribe/parser. The exact same fields at
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

  // --- authored sigil node IS rewritten to canonical by group A ---
  {
    // Post-consolidation: authored <$ x $> reaches the gate with
    // tagname '$' (the sigil token) and group A rewrites it to the
    // canonical 'inline-math' so the gate's output is uniform across
    // authored and bare-markdown paths.
    const tree = unified().use(remarkParse).use(remarkEnscribe).parse('<$ x $>');
    enscribeNormalizeMarkdown()(tree);
    function findTag(nodes) {
      for (const n of nodes) {
        if (n.type === 'enscribeTag') return n;
        if (n.children) { const r = findTag(n.children); if (r) return r; }
      }
      return null;
    }
    const after = findTag(tree.children);
    assert.ok(after, 'authored sigil node found post-gate');
    assert.equal(after.type, 'enscribeTag', 'still enscribeTag');
    assert.equal(after.tagname, 'inline-math', 'tagname rewritten to canonical inline-math by group A');
    console.log('PASS: normalize-to-canonical: authored sigil tagname rewritten to canonical by group A');
  }

  // ── math.meta discarded ───────────────────────────────────────────────────

  // --- math.meta field is silently discarded ---
  {
    // remark-math sets math.meta from info string of fenced code blocks:
    // ```math\ntex\n``` → { type: 'math', meta: 'math', value: 'tex' }
    // The canonical enscribeTag has no analog for meta; it is discarded.
    const mathNode = { type: 'math', meta: 'some-meta', value: 'E = mc^2' };
    const tree = { type: 'root', children: [mathNode] };
    enscribeNormalizeMarkdown()(tree);
    const result = tree.children[0];
    assert.equal(result.type, 'enscribeTag', 'normalized to enscribeTag');
    assert.equal(result.tagname, 'display-math', 'tagname is canonical display-math');
    assert.equal(result.content, 'E = mc^2', 'content is the value');
    assert.equal(result.meta, undefined, 'meta not present on normalized node');
    console.log('PASS: normalize-to-canonical: math.meta is silently discarded');
  }

  // ── Tree is unchanged when no math present ────────────────────────────────

  // --- no math nodes: tree is unchanged ---
  {
    const tree = unified().use(remarkParse).use(remarkMath).parse('Just plain text.');
    const jsonBefore = JSON.stringify(tree);
    enscribeNormalizeMarkdown()(tree);
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
  // and return the normalized enscribeTag node.
  function parseGfmAndNormalize(source) {
    const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
    // Pass a fake VFile so file.message() is observable.
    const file = { messages: [], message(msg) { this.messages.push(msg); } };
    enscribeNormalizeMarkdown()(tree, file);
    return {
      node: tree.children.find(n => n.type === 'enscribeTag') ?? null,
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

  // --- bare pipe table normalizes to enscribeTag ---
  {
    const { node } = parseGfmAndNormalize('| X | Y |\n| - | - |\n| a | b |');
    assert.ok(node, 'enscribeTag found after normalization');
    assert.equal(node.tagname, 'table', 'tagname is table');
    console.log('PASS: normalize-markdown: bare pipe table normalizes to enscribeTag');
  }

  // --- all required fields present on normalized table node ---
  {
    const { node } = parseGfmAndNormalize('| X | Y |\n| - | - |\n| a | b |');
    assert.ok(node, 'node found');
    assert.equal(node.type, 'enscribeTag', 'type');
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
    // Authored node: parse <table md | ...> via @enscribejs/enscribe/parser.
    const authoredTree = unified().use(remarkParse).use(remarkEnscribe).parse(
      '<table md | | X | Y |\n| - | - |\n| a | b |\n>',
    );
    function findTag(nodes) {
      for (const n of nodes) {
        if (n.type === 'enscribeTag') return n;
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
  // enscribe <note> system at the parser/normalization level.

  // --- footnoteReference node is not normalized ---
  {
    const tree = unified().use(remarkParse).use(remarkGfm).parse(
      'A note[^1]\n\n[^1]: The footnote text.',
    );
    const before = JSON.stringify(tree);
    const file = { messages: [], message(msg) { this.messages.push(msg); } };
    enscribeNormalizeMarkdown()(tree, file);
    // The footnote nodes should not have been converted to enscribeTag.
    function hasType(nodes, t) {
      for (const n of nodes) {
        if (n.type === t) return true;
        if (n.children && hasType(n.children, t)) return true;
      }
      return false;
    }
    // footnoteReference nodes should still be present (not replaced).
    // (remark-gfm may produce 'footnoteReference' in the paragraph.)
    // We verify no enscribeTag with tagname 'note' was produced.
    function findTagByName(nodes, name) {
      for (const n of nodes) {
        if (n.type === 'enscribeTag' && n.tagname === name) return n;
        if (n.children) { const r = findTagByName(n.children, name); if (r) return r; }
      }
      return null;
    }
    const noteTag = findTagByName(tree.children, 'note');
    assert.equal(noteTag, null, 'footnoteReference not converted to enscribe <note>');
    assert.equal(file.messages.length, 0, 'no warnings from footnote normalization');
    console.log('PASS: normalize-markdown: footnoteReference not normalized (harmless pass-through)');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Apparatus-tag kwarg lift + validation (2026-05-25 reconciliation)
  // ══════════════════════════════════════════════════════════════════════════

  // --- <config> unknown kwarg is dropped + warning emitted ---
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'enscribeTag',
          tagname: 'config',
          kwargs: { 'citation-style': 'apa', 'foo-bar': 'baz' },
          content: null,
        },
      ],
    };
    const messages = [];
    const file = { data: {}, message(msg) { messages.push(msg); } };
    enscribeNormalizeMarkdown()(tree, file);
    const configNode = tree.children[0];
    assert.equal(configNode.kwargs['citation-style'], 'apa', 'known kwarg accepted');
    assert.equal(configNode.kwargs['foo-bar'], undefined, 'unknown kwarg dropped from node');
    assert.equal(messages.length, 1, 'one warning emitted');
    assert.ok(/foo-bar/.test(String(messages[0])), 'warning mentions the offending kwarg name');
    console.log('PASS: normalize-to-canonical: <config> unknown kwarg dropped + warned (AUD-13)');
  }

  // --- <meta>-shaped kwarg on <config> → "did you mean <meta>?" hint ---
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'enscribeTag',
          tagname: 'config',
          kwargs: { title: 'Wrong place' },
          content: null,
        },
      ],
    };
    const messages = [];
    const file = { data: {}, message(msg) { messages.push(msg); } };
    enscribeNormalizeMarkdown()(tree, file);
    const configNode = tree.children[0];
    assert.equal(configNode.kwargs.title, undefined, 'meta kwarg dropped from <config>');
    assert.equal(messages.length, 1);
    assert.ok(/<meta>/.test(String(messages[0])), 'warning suggests <meta>');
    console.log('PASS: normalize-to-canonical: <config> with meta-shaped kwarg hints <meta>');
  }

  // --- <meta> allowlisted kwarg → child tag (the kwarg → child-tag lift) ---
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'enscribeTag',
          tagname: 'meta',
          kwargs: { title: 'The Document', author: 'Ariel' },
          content: [],
        },
      ],
    };
    const file = { data: {} };
    enscribeNormalizeMarkdown()(tree, file);
    const metaNode = tree.children[0];
    // The lifted kwargs are now in content as child tags.
    const titleChild = metaNode.content.find(n => n.tagname === 'title');
    const authorChild = metaNode.content.find(n => n.tagname === 'author');
    assert.ok(titleChild, '<title> child created from title kwarg');
    assert.ok(authorChild, '<author> child created from author kwarg');
    assert.equal(titleChild.content[0].value, 'The Document', 'title content carried through');
    assert.equal(authorChild.content[0].value, 'Ariel', 'author content carried through');
    // The kwargs are gone from the node (lifted, not duplicated).
    assert.equal(metaNode.kwargs.title, undefined, 'title kwarg removed after lift');
    assert.equal(metaNode.kwargs.author, undefined, 'author kwarg removed after lift');
    console.log('PASS: normalize-to-canonical: <meta> kwargs lift to child tags');
  }

  // --- <meta> type kwarg stays as kwarg (not lifted) ---
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'enscribeTag',
          tagname: 'meta',
          kwargs: { type: 'article', title: 'X' },
          content: [],
        },
      ],
    };
    const file = { data: {} };
    enscribeNormalizeMarkdown()(tree, file);
    const metaNode = tree.children[0];
    assert.equal(metaNode.kwargs.type, 'article', 'type kwarg preserved (structural routing)');
    assert.ok(metaNode.content.find(n => n.tagname === 'title'), 'title still lifted');
    console.log('PASS: normalize-to-canonical: <meta> type= kwarg stays as kwarg');
  }

  // --- <config>-shaped kwarg on <meta> → "did you mean <config>?" hint ---
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'enscribeTag',
          tagname: 'meta',
          kwargs: { 'citation-style': 'apa' },
          content: [],
        },
      ],
    };
    const messages = [];
    const file = { data: {}, message(msg) { messages.push(msg); } };
    enscribeNormalizeMarkdown()(tree, file);
    const metaNode = tree.children[0];
    assert.equal(metaNode.kwargs['citation-style'], undefined, 'config kwarg dropped from <meta>');
    assert.equal(messages.length, 1);
    assert.ok(/<config>/.test(String(messages[0])), 'warning suggests <config>');
    console.log('PASS: normalize-to-canonical: <meta> with config-shaped kwarg hints <config>');
  }
}
