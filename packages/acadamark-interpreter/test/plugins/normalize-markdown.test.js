import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
import remarkMath from 'remark-math';
import { acadamarkNormalizeMarkdown } from '../../src/plugins/normalize-markdown.js';

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
}
