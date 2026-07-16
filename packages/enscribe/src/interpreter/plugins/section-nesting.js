// Phase 2 — Section nesting plugin.
//
// Converts a flat sequence of section/sub-section/sub-sub-section nodes
// (mixed with body paragraphs, figures, asides, etc.) into a properly nested
// tree where each section contains the content that follows it until the next
// peer-level or parent-level section.
//
// The plugin runs AFTER enscribeArticleStructuring, so sections are already
// inside <article-body> (or equivalent). It walks the tree looking for any
// enscribeTag node whose content array contains section-family nodes, then
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

import { makeTag } from '../../core/tag.js';
import { isEnscribeTag, sectionDepth } from '../lib/ast-helpers.js';
import { SECTION_TITLE_MAP } from '../lib/section-kinds.js';

/**
 * Extract the title children from a section node's pipe content.
 *
 * After remarkRecursiveContent, the section's content (its pipe text) has been
 * parsed and is an array of mdast nodes — typically a single paragraph wrapping
 * the title text (and any inline enscribeTag nodes like <em>). We unwrap the
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
 * @param {Array} siblings - flat array of mdast / enscribeTag nodes
 * @returns {Array} nested array
 */
function nestSectionArray(siblings) {
  const result = [];
  // stack entries: { depth: number, node: enscribeTag }
  const stack = [];

  for (const child of siblings) {
    const depth = sectionDepth(child);

    if (depth > 0) {
      // Extract title from the section's existing pipe content.
      const titleContent = extractTitleContent(child);
      const titleNode = makeTag(SECTION_TITLE_MAP.get(child.tagname), titleContent);

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
 * Recursively walk enscribeTag content trees and apply section nesting
 * wherever a content array contains section-family nodes.
 *
 * We must walk through node.content (not node.children) since
 * unist-util-visit only recurses through .children.
 *
 * @param {Array} nodes - array of sibling nodes to examine
 */
function walkAndNest(nodes) {
  for (const node of nodes) {
    if (!isEnscribeTag(node)) continue;
    const content = node.content;
    if (!content || !Array.isArray(content)) continue;

    // Recurse FIRST, into every member's content, so a container (<aside>,
    // <minipage>, <frame>, …) nested in this array nests its OWN inner sections
    // regardless of whether this array also has sibling sections (#449). Before,
    // a sibling section made this level nest-and-stop, silently leaving a
    // container's inner sections un-nested. Descending here is safe: sections are
    // still flat at this point, so a section member's content is only its parsed
    // pipe title — walkAndNest finds nothing to nest inside it.
    walkAndNest(content);

    // Then nest THIS array's direct sections. The stack algorithm handles all
    // depths of the flat run in one pass; the members it absorbs into section
    // bodies keep the inner nesting the recursion above just applied.
    if (content.some(n => sectionDepth(n) > 0)) {
      node.content = nestSectionArray(content);
    }
  }
}

/**
 * @returns {(tree: import('mdast').Root) => void}
 */
export function enscribeSectionNesting() {
  return (tree) => {
    // By this point the normalize-to-canonical gate has rewritten every
    // sigil tagname and every bare-markdown heading to its canonical
    // section / sub-section / sub-sub-section name, so the nesting
    // algorithm matches purely on canonical tagnames via sectionDepth().
    walkAndNest(tree.children ?? []);
  };
}
