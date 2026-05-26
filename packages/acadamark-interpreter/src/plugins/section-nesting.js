// Phase 2 — Section nesting plugin.
//
// Converts a flat sequence of section/sub-section/sub-sub-section nodes
// (mixed with body paragraphs, figures, asides, etc.) into a properly nested
// tree where each section contains the content that follows it until the next
// peer-level or parent-level section.
//
// The plugin runs AFTER acadamarkArticleStructuring, so sections are already
// inside <article-body> (or equivalent). It walks the tree looking for any
// acadamarkTag node whose content array contains section-family nodes, then
// applies the nesting algorithm to that array.
//
// Algorithm: single-pass stack. For each node in a content array:
//   - Section node (depth D): pop the stack down to depth < D; add this
//     section to the current parent (or to result if stack empty); push.
//   - Non-section node: add to the innermost open section, or to result.
//
// Title extraction: the section's pipe content (already parsed into an mdast
// child array by remarkRecursiveContent) is promoted to a <section-title>
// (or <sub-section-title>, <sub-sub-section-title>) as the first child.

import { makeTag } from 'acadamark-core/tag';
import { isAcadamarkTag, sectionDepth } from '../lib/ast-helpers.js';

// Map from section tagname to its title element name.
const TITLE_TAG = {
  'section':          'section-title',
  'sub-section':      'sub-section-title',
  'sub-sub-section':  'sub-sub-section-title',
};

// Map from hash-sigil parser tagname to its canonical Layer 1 section
// tagname. The parser emits literal sigils ('#', '##', '###') as the
// tagname of a sigil-form heading; the alpha Phase 1 slice fix at
// acadamark-core/src/sigil-mapping.js translates these at interpret-time
// (vocabulary lookup) but the structural plugins (this one,
// article-structuring) match sections by tagname. Normalize the
// sigil tagname to its canonical Layer 1 name before nesting so the
// rest of the structural pipeline treats sigil and named sections
// identically.
const SIGIL_TO_SECTION_TAGNAME = {
  '#':   'section',
  '##':  'sub-section',
  '###': 'sub-sub-section',
};

/**
 * Recursively walk the tree and rewrite any acadamarkTag whose tagname is a
 * hash sigil ('#'/'##'/'###') to the canonical Layer 1 section name
 * ('section'/'sub-section'/'sub-sub-section'). After this pass, all
 * downstream consumers see one shape — the sigil form is indistinguishable
 * from the named-section form in the AST.
 *
 * @param {Array} nodes - array of sibling nodes to examine
 */
function normalizeSigilSectionNames(nodes) {
  for (const node of nodes) {
    if (isAcadamarkTag(node) && SIGIL_TO_SECTION_TAGNAME[node.tagname]) {
      node.tagname = SIGIL_TO_SECTION_TAGNAME[node.tagname];
    }
    if (isAcadamarkTag(node) && Array.isArray(node.content)) {
      normalizeSigilSectionNames(node.content);
    }
  }
}

/**
 * Extract the title children from a section node's pipe content.
 *
 * After remarkRecursiveContent, the section's content (its pipe text) has been
 * parsed and is an array of mdast nodes — typically a single paragraph wrapping
 * the title text (and any inline acadamarkTag nodes like <em>). We unwrap the
 * paragraph to get the raw inline children.
 */
function extractTitleContent(sectionNode) {
  const content = sectionNode.content ?? [];
  if (content.length === 1 && content[0]?.type === 'paragraph') {
    return content[0].children ?? [];
  }
  // Multiple paragraphs or non-paragraph content: flatten paragraphs, keep others.
  return content.flatMap(n =>
    n?.type === 'paragraph' ? (n.children ?? []) : [n],
  );
}

/**
 * Restructure a flat array of siblings into a nested section tree.
 *
 * @param {Array} siblings - flat array of mdast / acadamarkTag nodes
 * @returns {Array} nested array
 */
function nestSectionArray(siblings) {
  const result = [];
  // stack entries: { depth: number, node: acadamarkTag }
  const stack = [];

  for (const child of siblings) {
    const depth = sectionDepth(child);

    if (depth > 0) {
      // Extract title from the section's existing pipe content.
      const titleContent = extractTitleContent(child);
      const titleNode = makeTag(TITLE_TAG[child.tagname], titleContent);

      // Replace the section's content with just the title element; body
      // content will be appended as we encounter following siblings.
      child.content = [titleNode];

      // Pop the stack: close any open sections at this depth or deeper.
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      // Attach to the innermost open parent, or to the top-level result.
      if (stack.length > 0) {
        stack[stack.length - 1].node.content.push(child);
      } else {
        result.push(child);
      }

      stack.push({ depth, node: child });
    } else {
      // Non-section content: goes into the innermost open section's body.
      if (stack.length > 0) {
        stack[stack.length - 1].node.content.push(child);
      } else {
        result.push(child);
      }
    }
  }

  return result;
}

/**
 * Recursively walk acadamarkTag content trees and apply section nesting
 * wherever a content array contains section-family nodes.
 *
 * We must walk through node.content (not node.children) since
 * unist-util-visit only recurses through .children.
 *
 * @param {Array} nodes - array of sibling nodes to examine
 */
function walkAndNest(nodes) {
  for (const node of nodes) {
    if (!isAcadamarkTag(node)) continue;
    const content = node.content;
    if (!content || !Array.isArray(content)) continue;

    const hasSections = content.some(n => sectionDepth(n) > 0);
    if (hasSections) {
      // Nest this array; the stack algorithm handles all depths in one pass.
      node.content = nestSectionArray(content);
      // Do not recurse into the nested sections — nestSectionArray has already
      // built the full nested structure for all depths in this content array.
    } else {
      // No sections here; recurse to find sections deeper in the tree.
      walkAndNest(content);
    }
  }
}

/**
 * @returns {(tree: import('mdast').Root) => void}
 */
export function acadamarkSectionNesting() {
  return (tree) => {
    // Phase A: rewrite hash-sigil tagnames to canonical Layer 1 section
    // names so the nesting pass and all downstream structural code sees
    // one shape. Companion to the acadamark-core/sigil-mapping
    // PARSER_TO_VOCAB fix that resolved the hash-sigil dispatch bug at
    // the interpret-time vocabulary lookup.
    normalizeSigilSectionNames(tree.children ?? []);
    // Phase B: the existing single-pass nesting algorithm.
    walkAndNest(tree.children ?? []);
  };
}
