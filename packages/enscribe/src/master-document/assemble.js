// Master-document assembler — walking skeleton (first slice of the multi-file
// epic, #190; design of record: notes/specs/master-document.md).
//
// Scope of THIS slice (deliberately thin): parse a master document, resolve its
// `<section src="...">` child references by loading + parsing each child file,
// and stitch the children into the structure in document order, producing ONE
// flat article tree that the existing interpreter pipeline nests and renders.
//
// Cross-file numbering + cross-references (slice 2, #190) need NO assembler
// change: because the assembler emits ONE tree, the existing tree-based
// numbering and ref-resolution plugins — run by the pipeline over the assembled
// tree — number figures/sections continuously across files and resolve <ref> to
// targets wherever they live (an unresolved ref renders a visible marker).
//
// Deferred to later slices (NOT done here): cross-file citation/bibliography
// registry merge; placement markers (<toc> / <endnotes> / <bibliography>);
// document types beyond article (book numbering — e.g. per-chapter restart — and
// the website page model); embedded-asset coverage in <data>. Those are the
// spec's "decide during the build" judgment slices — see #190.

import { isEnscribeTag } from '../core/tag.js';

// Placement markers the spec defines but this slice does not assemble yet.
const DEFERRED_MARKERS = new Set(['toc', 'endnotes', 'bibliography', 'endnote-list']);
// Apparatus blocks passed through untouched (their cross-file semantics are
// later slices; here they ride along so a single-file-ish master still renders).
const PASSTHROUGH_APPARATUS = new Set(['meta', 'data', 'config']);

/**
 * Assemble a master document into a single article mdast tree.
 *
 * @param {object}   opts
 * @param {string}   opts.source    - the master document's .emd source
 * @param {(path: string) => string} opts.readFile - read a child file's source by resolved path
 * @param {(rel: string) => string}  opts.resolve  - resolve a child `src` (relative to the master file) to a path for readFile
 * @param {(source: string) => object} opts.parse  - parse .emd source -> mdast root (the same parser the renderer uses)
 * @param {(msg: string) => void}    [opts.warn]   - diagnostic sink (always-renders: notes, never silent loss)
 * @returns {{ type: 'root', children: object[] }} a flat article tree ready for the interpreter pipeline
 */
export function assembleMasterDocument({ source, readFile, resolve, parse, warn = () => {} }) {
  const master = parse(source);
  const out = [];

  for (const node of master.children ?? []) {
    // A `<section src="...">` entry: content comes from the child file.
    if (isEnscribeTag(node, 'section') && node.kwargs?.src) {
      const src = node.kwargs.src;
      const pipeTitle = typeof node.content === 'string' ? node.content.trim() : '';

      let childBody;
      let childMetaTitle = '';
      try {
        const childTree = parse(readFile(resolve(src)));
        const kids = childTree.children ?? [];
        const childMeta = kids.find((c) => isEnscribeTag(c, 'meta'));
        childMetaTitle = childMeta?.kwargs?.title ?? '';
        // The child's body is everything except its own apparatus blocks; the
        // child's title comes from the section entry / its meta, not a stray tag.
        childBody = kids.filter((c) => !(isEnscribeTag(c) && PASSTHROUGH_APPARATUS.has(c.tagname)));
      } catch (err) {
        // Always-renders: a missing/unreadable child becomes a visible note, not
        // a crash. (#190 — robust per-child error reporting is a later refinement.)
        warn(`master: could not load <section src="${src}">: ${err.message}`);
        childBody = [{ type: 'paragraph', children: [{ type: 'text', value: `(could not load section source "${src}")` }] }];
      }

      // Title precedence (spec): inline pipe override > child file title > "Title Missing".
      const title = pipeTitle || childMetaTitle || 'Title Missing';

      // Emit a section marker carrying the resolved title, then the child body as
      // following siblings — exactly the flat shape enscribeSectionNesting nests.
      out.push({ ...node, kwargs: stripSrc(node.kwargs), content: title });
      out.push(...childBody);
      continue;
    }

    // A deferred placement marker — drop with a located diagnostic (this slice
    // does not assemble toc/endnotes/bibliography).
    if (isEnscribeTag(node) && DEFERRED_MARKERS.has(node.tagname)) {
      warn(`master: <${node.tagname}> placement marker is deferred to a later slice (#190); not assembled`);
      continue;
    }

    // Everything else — the <meta>, inline `<section | Title>` markers and their
    // following inline body, <data>, <config> — passes through in document order.
    out.push(node);
  }

  return { type: 'root', children: out };
}

function stripSrc(kwargs) {
  if (!kwargs) return {};
  const { src, ...rest } = kwargs;
  return rest;
}
