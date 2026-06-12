// Master-document assembler (#190; design of record: notes/specs/master-document.md).
//
// Parse a master document, resolve its `src` child references — `<section src>`
// (article) and any book-part src entry `<chapter src>` / `<preface src>` /
// `<appendix src>` / … (book) — by loading + parsing each child file, and stitch
// the children into the structure in document order, producing ONE flat mdast tree
// the existing interpreter pipeline structures and renders.
//
// Document-class-agnostic: the assembler imposes NO wrapper. It passes the
// master's `<meta>` through and emits a flat list of markers + child bodies; the
// pipeline's enscribeDocTypeResolve reads `<meta type>` and the structuring plugins
// build the wrapper (`<article>` for an article, `<book>` + front/body/back for a
// book). So a `<meta type="book">` master assembles into the SAME tree a single-file
// book produces — verified tree/HTML/BITS byte-identical (Slice B Phase-0, #190).
//
// Cross-file numbering + cross-references need NO assembler change: because the
// assembler emits ONE tree, the existing tree-based numbering and ref-resolution
// plugins — run by the pipeline over the assembled tree — number figures/sections
// (per-chapter in a book) and resolve <ref> to targets wherever they live (an
// unresolved ref renders a visible marker).
//
// Deferred to later slices (NOT done here): cross-file citation/bibliography
// registry merge; placement markers (<toc> / <endnotes> / <bibliography>); the
// website page model; embedded-asset coverage in <data>. Those are the spec's
// "decide during the build" judgment slices — see #190.

import { isEnscribeTag } from '../core/tag.js';
import { BOOK_PART_SHORTHANDS } from '../interpreter/plugins/normalize-to-canonical.js';

// The tagnames that, carrying a `src`, name a child file the master assembles in:
// `<section>` (the article spine) plus every book-part shorthand (the book spine).
// BOOK_PART_SHORTHANDS is the gate's own authority for "what expands to a book-part",
// so keying off it means the assembler resolves exactly the tags the gate later
// structures — add a book-part shorthand once and both move together (no drift).
export const MASTER_SRC_TAGS = new Set(['section', ...BOOK_PART_SHORTHANDS]);

/**
 * True iff `node` is a master structure entry that pulls its content from a child
 * file — a MASTER_SRC_TAGS tag carrying a `src`. The single recognition rule the
 * assembler, the browser live-loader, and the fixture/parity discovery all share.
 */
export function isMasterSrcEntry(node) {
  return isEnscribeTag(node) && MASTER_SRC_TAGS.has(node.tagname) && node.kwargs?.src != null;
}

// A cheap source-level pre-check (before any parse): does the text contain a
// MASTER_SRC_TAGS tag with a `src=`? Built from the set so it can't drift from it.
// Used by the browser entry and the fixture renderer to decide "is this a master?".
export const HAS_MASTER_SRC = new RegExp(
  `<(?:${[...MASTER_SRC_TAGS].join('|')})\\b[^>]*\\bsrc\\s*=`,
  'i',
);

// Placement markers the spec defines but no slice assembles yet.
const DEFERRED_MARKERS = new Set(['toc', 'endnotes', 'bibliography', 'endnote-list']);
// Apparatus blocks passed through untouched (their cross-file semantics are
// later slices; here they ride along so a single-file-ish master still renders).
const PASSTHROUGH_APPARATUS = new Set(['meta', 'data', 'config']);

/**
 * Assemble a master document into a single flat mdast tree (the document-class
 * wrapper is imposed downstream by the structuring plugins, not here).
 *
 * @param {object}   opts
 * @param {string}   opts.source    - the master document's .emd source
 * @param {(path: string) => string} opts.readFile - read a child file's source by resolved path
 * @param {(rel: string) => string}  opts.resolve  - resolve a child `src` (relative to the master file) to a path for readFile
 * @param {(source: string) => object} opts.parse  - parse .emd source -> mdast root (the same parser the renderer uses)
 * @param {(msg: string) => void}    [opts.warn]   - diagnostic sink (always-renders: notes, never silent loss)
 * @returns {{ type: 'root', children: object[] }} a flat tree ready for the interpreter pipeline
 */
export function assembleMasterDocument({ source, readFile, resolve, parse, warn = () => {} }) {
  const master = parse(source);
  const out = [];

  for (const node of master.children ?? []) {
    // A `src` structure entry — `<section src>` / `<chapter src>` / `<preface src>`
    // / … : content comes from the child file.
    if (isMasterSrcEntry(node)) {
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
        // child's title comes from the structure entry / its meta, not a stray tag.
        childBody = kids.filter((c) => !(isEnscribeTag(c) && PASSTHROUGH_APPARATUS.has(c.tagname)));
      } catch (err) {
        // Always-renders: a missing/unreadable child becomes a visible note, not
        // a crash. (#190 — robust per-child error reporting is a later refinement.)
        warn(`master: could not load <${node.tagname} src="${src}">: ${err.message}`);
        childBody = [{ type: 'paragraph', children: [{ type: 'text', value: `(could not load ${node.tagname} source "${src}")` }] }];
      }

      // Title precedence (spec): inline pipe override > child file title > "Title Missing".
      const title = pipeTitle || childMetaTitle || 'Title Missing';

      // Emit a structure marker carrying the resolved title (the tagname is
      // preserved, so a `<chapter src>` stays `<chapter>` for the gate to expand
      // into a `<book-part>`), then the child body as following siblings — the flat
      // shape enscribeSectionNesting / enscribeBookStructuring absorb.
      out.push({ ...node, kwargs: stripSrc(node.kwargs), content: title });
      out.push(...childBody);
      continue;
    }

    // A deferred placement marker — drop with a located diagnostic (no slice
    // assembles toc/endnotes/bibliography yet).
    if (isEnscribeTag(node) && DEFERRED_MARKERS.has(node.tagname)) {
      warn(`master: <${node.tagname}> placement marker is deferred to a later slice (#190); not assembled`);
      continue;
    }

    // Everything else — the <meta> (its `type` selects the document class
    // downstream), inline `<section | Title>` markers and their following inline
    // body, <data>, <config> — passes through in document order.
    out.push(node);
  }

  return { type: 'root', children: out };
}

function stripSrc(kwargs) {
  if (!kwargs) return {};
  const { src, ...rest } = kwargs;
  return rest;
}
