// library-load plugin — walk <data>/<library> nodes at document root, parse
// their BibTeX or CSL-JSON content via citation-js, and store the result in
// file.data.acadamarkCitations for use by cite-resolution and bibliography.
//
// Runs after acadamarkArticleStructuring (which extracts <data> to root level)
// and before acadamarkCiteResolution (which needs the loaded citations).
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
// file.data.acadamarkCitations shape:
//   {
//     cite: Cite,                    // citation-js instance with all entries
//     order: [],                     // keys in first-cited order (filled by cite-resolution)
//     style: 'chicago-author-date',  // from config or default
//   }

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Cite from 'citation-js';
import { isAcadamarkTag } from '../lib/ast-helpers.js';

/**
 * Unified plugin. Reads <library> content from <data> root siblings, parses
 * it with citation-js, and stores the result in file.data.acadamarkCitations.
 *
 * @param {object} [options]
 * @param {string|null} [options.assetsDir] Directory for resolving src= paths.
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkLibraryLoad(options = {}) {
  const { assetsDir = null } = options;

  return (tree, file) => {
    // <data> nodes are at root level after article-structuring.
    const dataNodes = (tree.children ?? []).filter(n => isAcadamarkTag(n, 'data'));
    if (dataNodes.length === 0) return;

    // Collect all library content strings.
    // For BibTeX: concatenation produces a valid merged BibTeX file.
    // For CSL-JSON: we parse each entry separately (handled below via per-node Cite).
    const citeInstances = [];

    for (const dataNode of dataNodes) {
      if (!Array.isArray(dataNode.content)) continue;

      for (const libraryNode of dataNode.content) {
        if (!isAcadamarkTag(libraryNode, 'library')) continue;

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
      file?.data?.acadamarkConfig?.get('citation-style') ?? 'chicago-author-date';

    file.data = file.data ?? {};
    file.data.acadamarkCitations = {
      cite: mergedCite,
      order: [],   // filled by cite-resolution in citation-document order
      style,
    };
  };
}
