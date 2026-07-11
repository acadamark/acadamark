import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '../../src/parser/index.js';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import { enscribeNormalizeToCanonical, gfmTableToParsedCellsTag } from '../../src/interpreter/plugins/normalize-to-canonical.js';
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

  // ── gfmTableToParsedCellsTag: carry-tag unit tests (#280) ─────────────────
  //
  // The GFM table is normalized to a canonical <table md> that CARRIES its parsed cells
  // as `_parsedCells` (no serialize-to-pipe-string + re-parse). Plain cells stay `{ text }`
  // (byte-identical to the old path); markup-bearing cells carry `{ inline }`.

  // --- simple plain-text table → carrier tag with {text} cells, empty content ---
  {
    const tableNode = parseGfmTable('| A | B |\n| - | - |\n| 1 | 2 |');
    assert.ok(tableNode, 'table node found');
    const tag = gfmTableToParsedCellsTag(tableNode, null);
    assert.equal(tag.type, 'enscribeTag', 'returns an enscribeTag');
    assert.equal(tag.tagname, 'table', 'tagname is table');
    assert.deepEqual(tag.positional, ['md'], "positional is ['md']");
    assert.equal(tag.content, '', 'carrier content is empty (handler reads _parsedCells)');
    assert.ok(tag._parsedCells, '_parsedCells stamped');
    assert.deepEqual(tag._parsedCells.headers, ['A', 'B'], 'headers carried as plain text');
    assert.deepEqual(tag._parsedCells.rows, [[{ text: '1' }, { text: '2' }]],
      'plain body cells carried as { text } (byte-identical guarantee)');
    console.log('PASS: normalize-markdown: gfmTableToParsedCellsTag: plain table → {text} cells');
  }

  // --- literal pipe in a cell (authored \|) → unescaped text, no pipe-string round-trip ---
  {
    // remark-gfm parses `\|` in a cell → a text node with value `|`. The carry model stores
    // that text directly (the old path round-tripped it through `\|` escape/unescape to the
    // same string), so the cell text is the bare `|`.
    const tableNode = parseGfmTable('| A\\|B | C |\n| - | - |\n| D | E |');
    assert.ok(tableNode, 'table node found');
    const tag = gfmTableToParsedCellsTag(tableNode, null);
    assert.deepEqual(tag._parsedCells.headers, ['A|B', 'C'], 'literal pipe in header is unescaped text');
    assert.deepEqual(tag._parsedCells.rows, [[{ text: 'D' }, { text: 'E' }]], 'body cells plain');
    console.log('PASS: normalize-markdown: gfmTableToParsedCellsTag: literal pipe is unescaped text');
  }

  // --- body-cell markup → { inline } carried (NOT flattened), no warning ---
  {
    const tableNode = parseGfmTable('| Normal | Plain |\n| - | - |\n| **Bold** | `code` |');
    assert.ok(tableNode, 'table node found');
    const messages = [];
    const fakeFile = { message(msg) { messages.push(msg); } };
    const tag = gfmTableToParsedCellsTag(tableNode, fakeFile);
    const [boldCell, codeCell] = tag._parsedCells.rows[0];
    assert.ok(boldCell.inline, 'bold body cell carries { inline } (markup preserved)');
    assert.ok(!('text' in boldCell), 'markup cell is not a { text } cell');
    assert.ok(Array.isArray(boldCell.inline) && boldCell.inline.length > 0, 'inline mdast is non-empty');
    assert.ok(codeCell.inline, 'inline-code body cell carries { inline }');
    assert.equal(messages.length, 0, 'NO warning — body-cell markup is preserved, not lost');
    console.log('PASS: normalize-markdown: gfmTableToParsedCellsTag: body markup carried as {inline}, no warning');
  }

  // --- header-cell markup → flattened to text + warning (the one residual loss) ---
  {
    const tableNode = parseGfmTable('| **Bold** | Normal |\n| - | - |\n| 1 | 2 |');
    assert.ok(tableNode, 'table node found');
    const messages = [];
    const fakeFile = { message(msg) { messages.push(msg); } };
    const tag = gfmTableToParsedCellsTag(tableNode, fakeFile);
    assert.deepEqual(tag._parsedCells.headers, ['Bold', 'Normal'], 'header markup flattened to text');
    assert.equal(messages.length, 1, 'exactly one warning for header markup loss');
    assert.ok(/header-markup-loss/.test(String(messages[0].ruleId ?? messages[0].source ?? '')) ||
      /HEADER cell contains inline markup/.test(String(messages[0].reason ?? messages[0])),
      'warning names the header markup loss');
    console.log('PASS: normalize-markdown: gfmTableToParsedCellsTag: header markup flattened + warned');
  }

  // --- single-column table → carrier with single-cell rows ---
  {
    const tableNode = parseGfmTable('| Single |\n| - |\n| Row1 |\n| Row2 |');
    assert.ok(tableNode, 'table node found');
    const tag = gfmTableToParsedCellsTag(tableNode, null);
    assert.deepEqual(tag._parsedCells.headers, ['Single'], 'single header');
    assert.deepEqual(tag._parsedCells.rows, [[{ text: 'Row1' }], [{ text: 'Row2' }]], 'two single-cell rows');
    console.log('PASS: normalize-markdown: gfmTableToParsedCellsTag: single-column table');
  }

  // --- header-only table (no body rows) → headers carried, empty rows ---
  {
    // GFM requires a delimiter row, but the table can have zero body rows.
    const tableNode = parseGfmTable('| H1 | H2 |\n| - | - |');
    assert.ok(tableNode, 'table node found');
    const tag = gfmTableToParsedCellsTag(tableNode, null);
    assert.deepEqual(tag._parsedCells.headers, ['H1', 'H2'], 'headers carried');
    assert.deepEqual(tag._parsedCells.rows, [], 'no body rows');
    console.log('PASS: normalize-markdown: gfmTableToParsedCellsTag: header-only table');
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
    // #280: the carrier holds its cells in `_parsedCells`, so `content` is empty — the table
    // handler prefers `_parsedCells` and never reads the carrier content string.
    assert.equal(node.content, '', 'carrier content is empty');
    assert.ok(node._parsedCells, '_parsedCells carried');
    assert.deepEqual(node._parsedCells.headers, ['X', 'Y'], 'headers carried');
    assert.deepEqual(node._parsedCells.rows, [[{ text: 'a' }, { text: 'b' }]], 'body cells carried as {text}');
    console.log('PASS: normalize-markdown: all required fields on normalized table node');
  }

  // --- field-for-field identity with authored <table md | ...> ---
  //
  // The normalization principle: a bare pipe table through remark-gfm
  // + normalization pass must produce a node with the same structure-level
  // fields as an authored <table md | ...> tag.
  //
  // `content` and `_parsedCells` are intentionally NOT compared (and now differ by design):
  // the normalized carrier holds its cells in `_parsedCells` with empty content (#280), while
  // the authored tag holds an unparsed pipe-string in `content`. The structure-level fields
  // below are what must match.
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

  // ── Host accept-set validation (#85) ───────────────────────────────────────
  //
  // The gate validates each format-word host's leading format against
  // HOST_ACCEPT_SETS, emitting a located, non-fatal diagnostic on a miss while
  // still rendering (the node is never removed). Helper: parse authored source,
  // run the gate with a fake file, and return just the accept-set diagnostics.
  function gateAcceptSet(source) {
    const tree = unified().use(remarkParse).use(remarkEnscribe).parse(source);
    const messages = [];
    const file = { data: {}, message(msg, node) { messages.push({ reason: String(msg), node }); } };
    enscribeNormalizeToCanonical()(tree, file);
    const acceptSetMsgs = messages.filter((m) => /is not an accepted .* format/.test(m.reason));
    return { tree, acceptSetMsgs };
  }
  function findHostTag(nodes, tagname) {
    for (const n of nodes ?? []) {
      if (n.type === 'enscribeTag' && n.tagname === tagname) return n;
      const kids = Array.isArray(n.children) ? n.children
        : (Array.isArray(n.content) ? n.content : null);
      if (kids) { const r = findHostTag(kids, tagname); if (r) return r; }
    }
    return null;
  }

  // --- valid format words emit no accept-set diagnostic ---
  {
    for (const src of ['<table csv | a,b>', '<diagram mermaid | graph>', '<library bibtex | @article{k,}>']) {
      const { acceptSetMsgs } = gateAcceptSet(src);
      assert.equal(acceptSetMsgs.length, 0, `valid host format must not warn: ${src}`);
    }
    console.log('PASS: normalize-to-canonical: valid host format words pass accept-set validation');
  }

  // --- out-of-set table format warns, located, and STILL RENDERS (node kept) ---
  {
    const { tree, acceptSetMsgs } = gateAcceptSet('<table xml | a,b>');
    assert.equal(acceptSetMsgs.length, 1, '<table xml> warns exactly once');
    assert.ok(/<table>: "xml" is not an accepted table format/.test(acceptSetMsgs[0].reason),
      'diagnostic names the host and the bad format word');
    assert.ok(/accepted: csv, tsv, json, yaml, md/.test(acceptSetMsgs[0].reason),
      'diagnostic lists the table accept-set');
    assert.ok(acceptSetMsgs[0].node && acceptSetMsgs[0].node.tagname === 'table',
      'diagnostic carries the offending node (so file.message attaches a source location)');
    assert.ok(findHostTag(tree.children, 'table'),
      '<table xml> is NOT removed from the tree — it still renders');
    console.log('PASS: normalize-to-canonical: out-of-set table format warns + still renders');
  }

  // --- diagram + library out-of-set words warn ---
  {
    const d = gateAcceptSet('<diagram mermaidx | graph>');
    assert.equal(d.acceptSetMsgs.length, 1, '<diagram mermaidx> warns');
    assert.ok(/<diagram>: "mermaidx" is not an accepted diagram format/.test(d.acceptSetMsgs[0].reason));
    const l = gateAcceptSet('<library bogus | @article{k,}>');
    assert.equal(l.acceptSetMsgs.length, 1, '<library bogus> warns');
    assert.ok(/<library>: "bogus" is not an accepted library format/.test(l.acceptSetMsgs[0].reason));
    console.log('PASS: normalize-to-canonical: out-of-set diagram + library formats warn');
  }

  // --- library validates the legacy format= kwarg the same way its handler reads it ---
  {
    const ok = gateAcceptSet('<library format=bibtex | @article{k,}>');
    assert.equal(ok.acceptSetMsgs.length, 0, 'library format=bibtex is valid (kwarg form)');
    const bad = gateAcceptSet('<library format=bogus | @article{k,}>');
    assert.equal(bad.acceptSetMsgs.length, 1, 'library format=bogus warns (kwarg form)');
    console.log('PASS: normalize-to-canonical: library validates the legacy format= kwarg too');
  }

  // --- a host with no format word is not flagged (it uses its default) ---
  {
    const bare = gateAcceptSet('<table | x>');
    assert.equal(bare.acceptSetMsgs.length, 0, 'bare <table> (no format word) does not warn');
    console.log('PASS: normalize-to-canonical: a host with no format word is not flagged');
  }

  // --- <data> is deliberately excluded from format-word validation ---
  {
    // <data> carries no format word of its own; its accept-set governs the
    // payload languages of the <library> blocks it contains (validated when each
    // inner <library> is visited), so a bare token on <data> itself never warns.
    const { acceptSetMsgs } = gateAcceptSet('<data bogus | x>');
    assert.equal(acceptSetMsgs.length, 0, '<data> is excluded from format-word validation');
    console.log('PASS: normalize-to-canonical: <data> is excluded from format-word validation');
  }

  // ── #407: GFM footnotes / reference-link definitions are not idioms — literal ──
  {
    const parseGfm = (src) => {
      const tree = unified().use(remarkParse).use(remarkGfm).parse(src);
      enscribeNormalizeMarkdown()(tree);
      return tree;
    };
    // Collect all rendered text, and flag any raw footnote/definition node that survived.
    const texts = (tree) => {
      const out = [];
      (function walk(nodes) {
        for (const n of nodes ?? []) {
          if (n.type === 'text') out.push(n.value);
          if (n.type === 'footnoteReference' || n.type === 'footnoteDefinition' || n.type === 'definition') {
            out.push(`__RAW_${n.type}__`);
          }
          walk(n.children);
        }
      })(tree.children);
      return out.join('|');
    };
    // GFM footnote reference + definition → literal source; body PRESERVED; no live marker.
    {
      const t = texts(parseGfm('The effect was significant.[^1]\n\n[^1]: Wilcoxon, p = 0.003.'));
      assert.ok(t.includes('[^1]'), '#407: footnote reference renders literal [^1]');
      assert.ok(t.includes('[^1]: ') && t.includes('Wilcoxon, p = 0.003.'),
        '#407: footnote definition renders literal, body PRESERVED (not lost)');
      assert.ok(!/__RAW_footnote/.test(t), '#407: no raw footnoteReference/Definition survives normalization');
      console.log('PASS: normalize-to-canonical: #407 GFM footnotes render literal, no content lost');
    }
    // Reference-link definition line → literal source; url PRESERVED; no vanish.
    {
      const t = texts(parseGfm('See [text][ref].\n\n[ref]: https://example.com/paper'));
      assert.ok(t.includes('[ref]: https://example.com/paper'),
        '#407: reference-link definition renders literal, url PRESERVED (not vanished)');
      assert.ok(!/__RAW_definition/.test(t), '#407: no raw definition node survives normalization');
      console.log('PASS: normalize-to-canonical: #407 reference-link definition renders literal');
    }
  }
}
