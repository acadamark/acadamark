// Main entry for acadamark-interpreter.
//
// Exports the unified plugin `acadamarkInterpreter`, which wires together:
//   1. remarkRecursiveContent  — parses string pipe-content into mdast
//   2. acadamarkConfigDiscovery — Phase 1: discovery (no tree mutation)
//   3. acadamarkArticleStructuring — Phase 2: wraps doc in article structure
//   4. acadamarkSectionNesting — Phase 2: nests section/sub-section/... nodes
//   5. A custom compiler that converts the final mdast → hast → HTML string
//      via mdast-util-to-hast (with the acadamarkTag custom handler) and
//      hast-util-to-html.
//
// WIRING CHOICE
// remark-rehype is not installed in this workspace; we use mdast-util-to-hast
// directly and register a custom `compiler` function on the unified processor.
// This avoids a dependency while keeping the pipeline fully within the unified
// ecosystem convention (parse → run → compile → process).
//
// Consumer usage:
//   import { unified } from 'unified';
//   import remarkParse from 'remark-parse';
//   import remarkAcadamark from 'remark-acadamark';
//   import { acadamarkInterpreter } from 'acadamark-interpreter';
//
//   const result = await unified()
//     .use(remarkParse)
//     .use(remarkAcadamark)
//     .use(acadamarkInterpreter)
//     .process(source);
//
//   console.log(String(result)); // HTML string

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
// Relative path import: remark-acadamark does not re-export this module via
// its package exports field; we access it directly within the workspace.
import remarkRecursiveContent from '../../remark-acadamark/src/recursive-content.js';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';

import { acadamarkConfigDiscovery } from './plugins/config-discovery.js';
import { acadamarkArticleStructuring } from './plugins/article-structuring.js';
import { acadamarkSectionNesting } from './plugins/section-nesting.js';
import { acadamarkTagHandler } from './interpret-plugin.js';

export { acadamarkConfigDiscovery, acadamarkArticleStructuring, acadamarkSectionNesting, acadamarkTagHandler };

/**
 * Unified plugin. Applies the full acadamark pipeline: recursive content
 * parsing, structural plugins, and mdast-to-HTML compilation.
 *
 * @this {import('unified').Processor}
 */
export function acadamarkInterpreter() {
  // Inner processor: used by remarkRecursiveContent to re-parse pipe-content
  // strings. It runs the same parser plugins as the outer processor but does
  // NOT include the structural or compile steps (those only run on the outer
  // tree, not on recursively-parsed subtrees).
  const innerProcessor = unified().use(remarkParse).use(remarkAcadamark);

  // 1. Parse pipe-content strings into mdast children.
  this.use(remarkRecursiveContent, { processor: innerProcessor });

  // 2–4. Structural transformation.
  this.use(acadamarkConfigDiscovery);
  this.use(acadamarkArticleStructuring);
  this.use(acadamarkSectionNesting);

  // 5. Register a compiler: mdast → hast → HTML.
  // `this.compiler` is the standard unified API for registering the
  // stringify step; it is called by processor.stringify() and
  // processor.process().
  this.compiler = function compileToHtml(tree) {
    const hast = toHast(tree, {
      handlers: { acadamarkTag: acadamarkTagHandler },
      allowDangerousHtml: true,
    });
    return toHtml(hast, { allowDangerousHtml: true });
  };
}
