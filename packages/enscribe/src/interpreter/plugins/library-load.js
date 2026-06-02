// library-load plugin — collect every <data>/<library> node in the tree, parse
// their BibTeX or CSL-JSON content via citation-js, and store the result in
// file.data.enscribeCitations for use by cite-resolution and bibliography.
//
// Runs after document structuring (article- or book-structuring) and before
// enscribeCiteResolution (which needs the loaded citations). <data> is
// deep-collected wherever it lands — at root in an article, nested inside
// <book-body> in a book — so the structuring step's placement does not affect it.
//
// <library> content sources:
//   1. kwargs.src is set → read external file from resolve(assetsDir, src).
//      The node's own content (whitespace from empty-body long-form) is ignored.
//   2. node.content is a non-whitespace string → use it as inline BibTeX/CSL.
//   3. Neither → emit a warning; skip this library node.
//
// Multiple <library> nodes are merged: their content is concatenated before
// passing to citation-js (works for BibTeX; for CSL-JSON arrays, citation-js
// accepts each separately).
//
// file.data.enscribeCitations shape:
//   {
//     cite: Cite,                    // citation-js instance with all entries
//     order: [],                     // keys in first-cited order (filled by cite-resolution)
//     style: 'chicago-author-date',  // from config or default
//   }

// Node built-ins for the server/build path. In the browser bundle these are dead
// code (browser defaults never call them); tsup aliases both the node: and bare
// forms to a throwing stub. See packages/enscribe/src/interpreter/tsup.config.js.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Cite from 'citation-js';
import { ENSCRIBE_CONFIG, ENSCRIBE_CITATIONS } from '../../core/file-data-keys.js';
import { isEnscribeTag } from '../lib/ast-helpers.js';

/**
 * Recursively collect every <data> tag node, in document order.
 *
 * Walks both enscribe-tag content arrays and mdast children so a <data>
 * block is found wherever it lands in the tree. In an article it sits at
 * root level after article-structuring; in a book, book-structuring nests
 * it inside <book-body> (a loose <data> block is body content, not a
 * book-part), so a flat root-level scan would miss it. A <data> never
 * nests inside another <data>, so we do not descend into one.
 *
 * @param {Array} nodes
 * @returns {Array} the <data> tag nodes found
 */
function collectDataNodes(nodes) {
  const out = [];
  for (const node of nodes) {
    if (isEnscribeTag(node, 'data')) {
      out.push(node);
      continue;
    }
    if (isEnscribeTag(node) && Array.isArray(node.content)) {
      out.push(...collectDataNodes(node.content));
    }
    if (Array.isArray(node.children)) {
      out.push(...collectDataNodes(node.children));
    }
  }
  return out;
}

/**
 * Build the citation index from <library> content inside <data> nodes,
 * collected wherever they sit in the tree (see collectDataNodes).
 * Writes file.data.enscribeCitations. Does not modify the tree.
 *
 * Called as an explicit index-build step in index.js — not registered via
 * this.use(). Requires enscribeConfigDiscovery (citation-style from config)
 * to have run first. Does not depend on a structuring step having relocated
 * <data>: deep-collect finds it at root (article) or in <book-body> (book).
 *
 * @param {{ children: Array }} tree
 * @param {import('vfile').VFile} file
 * @param {object} [options]
 * @param {string|null} [options.assetsDir] Directory for resolving src= paths.
 */
export function buildCitationIndex(tree, file, options = {}) {
  const { assetsDir = null } = options;

  // <data> nodes sit at root level in an article (after article-structuring)
  // but are nested inside <book-body> in a book (book-structuring relocates
  // loose body content). Collect them wherever they landed; articles are
  // unaffected (their single root-level <data> is found identically).
  const dataNodes = collectDataNodes(tree.children ?? []);
  if (dataNodes.length === 0) return;

  // Collect all library content strings.
  // For BibTeX: concatenation produces a valid merged BibTeX file.
  // For CSL-JSON: we parse each entry separately (handled below via per-node Cite).
  const citeInstances = [];

  for (const dataNode of dataNodes) {
    if (!Array.isArray(dataNode.content)) continue;

    for (const libraryNode of dataNode.content) {
      if (!isEnscribeTag(libraryNode, 'library')) continue;

      let content = null;

      if (libraryNode.kwargs?.src) {
        // External file via src= kwarg.
        const src = libraryNode.kwargs.src;
        try {
          const filePath = resolve(assetsDir ?? '.', src);
          content = readFileSync(filePath, 'utf8');
        } catch (err) {
          file?.message?.(
            `library-load: failed to read "${src}": ${err.message}`,
            libraryNode,
          );
          continue;
        }
      } else if (typeof libraryNode.content === 'string') {
        const trimmed = libraryNode.content.trim();
        if (trimmed.length > 0) {
          content = trimmed;
        }
      }

      if (!content) {
        // Neither src= nor non-whitespace inline content. Warn and skip.
        file?.message?.(
          'library-load: <library> has no src= kwarg and no inline content',
          libraryNode,
        );
        continue;
      }

      try {
        citeInstances.push(new Cite(content));
      } catch (err) {
        file?.message?.(
          `library-load: failed to parse library content: ${err.message}`,
          libraryNode,
        );
      }
    }
  }

  if (citeInstances.length === 0) return;

  // Merge all Cite instances into one.
  // Each Cite instance has a .data array of CSL-JSON entries.
  // Create a single merged instance from the combined CSL-JSON.
  const allEntries = citeInstances.flatMap(c => c.data);
  let mergedCite;
  try {
    mergedCite = new Cite(allEntries);
  } catch (err) {
    file?.message?.(`library-load: failed to merge citation entries: ${err.message}`);
    return;
  }

  // Get citation style from config (default: chicago-author-date).
  const style =
    file?.data?.[ENSCRIBE_CONFIG]?.get('citation-style') ?? 'chicago-author-date';

  file.data = file.data ?? {};
  file.data[ENSCRIBE_CITATIONS] = {
    cite: mergedCite,
    order: [],   // filled by cite-resolution in citation-document order
    style,
  };
}

/**
 * Unified plugin wrapper around buildCitationIndex.
 * Kept for external callers and the existing test suite.
 *
 * @param {object} [options]
 * @param {string|null} [options.assetsDir] Directory for resolving src= paths.
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeLibraryLoad(options = {}) {
  return (tree, file) => buildCitationIndex(tree, file, options);
}
