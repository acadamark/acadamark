// library-load plugin — collect every <data>/<library> node in the tree, parse
// their BibTeX or CSL-JSON content via citation-js, and store the result in
// file.data.enscribeCitations for use by cite-resolution and bibliography.
//
// Runs after document structuring (article- or book-structuring) and before
// enscribeCiteResolution (which needs the loaded citations). <data> is
// deep-collected wherever it lands — at root in an article, nested inside
// <book-body> in a book — so the structuring step's placement does not affect it.
//
// <library> content sources (#133):
//   1. kwargs.src is set → external source. If the async pre-load pass supplied
//      content for this src on file.data[ENSCRIBE_LOADED_SOURCES] (browser/CLI),
//      use it; otherwise a filesystem path is read synchronously (CLI/processSync)
//      and a URL is flagged as needing an async render. The node's own (empty-body)
//      content is ignored.
//   2. node.content is a non-whitespace string → use it as inline BibTeX/CSL.
//   3. Neither → warn; skip this library node.
//
// always-renders (#133): a failed external load (unreachable / 404 / CORS-blocked
// / parse-fail), a duplicate-key collision, or a <library> misplaced inside
// <config>/<meta> renders a visible __library-error block naming the source — it
// is never silently dropped. A successful <library src> renders nothing visible.
//
// Multiple <library> nodes are merged. Their CSL entries are concatenated; a
// citation key defined in more than one source is last-wins with a visible flag.
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
import { ENSCRIBE_CONFIG, ENSCRIBE_CITATIONS, ENSCRIBE_LOADED_SOURCES } from '../../core/file-data-keys.js';
import { isEnscribeTag } from '../lib/ast-helpers.js';

// #133: a src string is "remote" (async-only) when it has a URL scheme. Anything
// else is a filesystem path (sync-readable on the CLI; in the browser it is
// resolved against the document base URL and fetched by the pre-load pass).
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * A visible `__library-error` node (rendered by libraryErrorHandler). always-
 * renders (#133): a failed load / collision / misplacement shows a visible block
 * naming the source, never a silent drop.
 */
function libraryError(src, message) {
  return { type: 'enscribeTag', tagname: '__library-error', kwargs: { src: src ?? '', message }, content: null };
}

/** Recursively collect every `<library>` node sitting inside a `<config>`/`<meta>`. */
function collectMisplacedLibraries(nodes, inApparatus = false, out = []) {
  for (const node of nodes ?? []) {
    const here = inApparatus || isEnscribeTag(node, 'config') || isEnscribeTag(node, 'meta');
    if (here && isEnscribeTag(node, 'library')) out.push(node);
    if (isEnscribeTag(node) && Array.isArray(node.content)) collectMisplacedLibraries(node.content, here, out);
    if (Array.isArray(node.children)) collectMisplacedLibraries(node.children, here, out);
  }
  return out;
}

/**
 * Inject visible error nodes at the top of the document's rendered body so a load
 * failure can never be silently dropped. Targets the first `<article-body>` /
 * `<book-body>`; falls back to the tree root for a bare document.
 */
function injectLibraryErrors(tree, errors) {
  if (errors.length === 0) return;
  let target = null;
  (function find(nodes) {
    for (const n of nodes ?? []) {
      if (target) return;
      if (isEnscribeTag(n, 'article-body') || isEnscribeTag(n, 'book-body')) { target = n; return; }
      if (isEnscribeTag(n) && Array.isArray(n.content)) find(n.content);
      if (Array.isArray(n.children)) find(n.children);
    }
  })(tree.children ?? []);
  if (target) {
    target.content = Array.isArray(target.content) ? target.content : [];
    target.content.unshift(...errors);
  } else {
    tree.children = tree.children ?? [];
    tree.children.unshift(...errors);
  }
}

// #22 slice 3: the `<library>` storage host's format word → the citation-js
// input type it forces. A named format the map doesn't cover (or none) falls
// through to citation-js auto-detect, the default-when-omitted behavior.
// citation-js auto-detects BibTeX reliably, so forcing `@bibtex/text` yields the
// same parse as the bare form — proven by a round-trip unit test. RIS / EndNote
// (which do not auto-detect cleanly) get their forceType when those land.
const FORMAT_FORCETYPE = {
  bibtex: '@bibtex/text',
};

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
  // #133: pre-fetched <library src> content (browser/CLI async pre-load), if any.
  const loaded = file?.data?.[ENSCRIBE_LOADED_SOURCES] ?? null;
  // Visible always-renders errors collected here, injected into the body at the end.
  const errors = [];

  // #133: <library> is a BODY element — never inside <config>/<meta>. Flag any
  // misplaced ones visibly; they are not loaded.
  for (const mis of collectMisplacedLibraries(tree.children ?? [])) {
    errors.push(libraryError(
      mis.kwargs?.src ?? '',
      '<library> is not allowed inside <config> or <meta> — it is a body element (place it in a <data> block or the document body)',
    ));
  }

  // <data> nodes sit at root level in an article (after article-structuring)
  // but are nested inside <book-body> in a book (book-structuring relocates
  // loose body content). Collect them wherever they landed.
  const dataNodes = collectDataNodes(tree.children ?? []);

  const citeInstances = [];

  for (const dataNode of dataNodes) {
    if (!Array.isArray(dataNode.content)) continue;

    for (const libraryNode of dataNode.content) {
      if (!isEnscribeTag(libraryNode, 'library')) continue;

      let content = null;

      if (libraryNode.kwargs?.src) {
        // #133: external source. The node's own (empty-body) content is ignored.
        const src = libraryNode.kwargs.src;
        if (loaded && Object.prototype.hasOwnProperty.call(loaded, src)) {
          // Pre-loaded by the async pass (browser renderAsync / CLI render command).
          const entry = loaded[src];
          if (entry?.error != null) { errors.push(libraryError(src, entry.error)); continue; }
          content = typeof entry?.content === 'string' ? entry.content : '';
          if (!content.trim()) { errors.push(libraryError(src, 'loaded source was empty')); continue; }
        } else if (URL_SCHEME.test(src)) {
          // A remote (URL) source cannot be fetched in a synchronous render.
          errors.push(libraryError(src, 'remote source needs an async render (renderAsync, or the CLI render command); not loaded in a synchronous render'));
          continue;
        } else {
          // Filesystem path: synchronous read (CLI / processSync) — unchanged.
          try {
            content = readFileSync(resolve(assetsDir ?? '.', src), 'utf8');
          } catch (err) {
            errors.push(libraryError(src, err.message));
            continue;
          }
        }
      } else if (typeof libraryNode.content === 'string') {
        const trimmed = libraryNode.content.trim();
        if (trimmed.length > 0) content = trimmed;
      }

      if (!content) {
        // Neither src= nor non-whitespace inline content. Warn and skip.
        file?.message?.('library-load: <library> has no src= kwarg and no inline content', libraryNode);
        continue;
      }

      // #22 slice 3: the format word selects the parser (leading positional
      // `<library bibtex | …>` or the legacy `format=` kwarg); omitted → citation-js
      // auto-detect. A loaded source is parsed strictly as reference DATA — never
      // injected as markup (no-HTML-passthrough).
      const format = libraryNode.positional?.[0] ?? libraryNode.kwargs?.format ?? null;
      const forceType = format ? FORMAT_FORCETYPE[format] : null;
      try {
        citeInstances.push(forceType ? new Cite(content, { forceType }) : new Cite(content));
      } catch (err) {
        // A src-loaded source's parse failure is a visible error (#133); an inline
        // parse failure stays a warning (an authoring mistake, not a load failure).
        if (libraryNode.kwargs?.src) errors.push(libraryError(libraryNode.kwargs.src, `parse failed: ${err.message}`));
        else file?.message?.(`library-load: failed to parse library content: ${err.message}`, libraryNode);
      }
    }
  }

  if (citeInstances.length > 0) {
    const allEntries = citeInstances.flatMap(c => c.data);

    // #133: deterministic key-collision handling. A citation key defined in more
    // than one merged source is last-wins, with a visible flag per collided key.
    // With no collisions the list passes through unchanged → the merged Cite (and
    // all existing output) is byte-identical.
    const lastIndex = new Map();
    allEntries.forEach((e, i) => lastIndex.set(e.id, i));
    const collided = new Set(allEntries.filter((e, i) => lastIndex.get(e.id) !== i).map(e => e.id));
    const entriesForCite = collided.size === 0
      ? allEntries
      : allEntries.filter((e, i) => lastIndex.get(e.id) === i); // keep the last of each key
    for (const id of collided) {
      errors.push(libraryError('', `duplicate citation key "${id}" across <library> sources — last definition wins`));
    }

    let mergedCite = null;
    try {
      mergedCite = new Cite(entriesForCite);
    } catch (err) {
      file?.message?.(`library-load: failed to merge citation entries: ${err.message}`);
    }
    if (mergedCite) {
      const style = file?.data?.[ENSCRIBE_CONFIG]?.get('citation-style') ?? 'chicago-author-date';
      file.data = file.data ?? {};
      file.data[ENSCRIBE_CITATIONS] = {
        cite: mergedCite,
        order: [],   // filled by cite-resolution in citation-document order
        style,
      };
    }
  }

  // always-renders: inject any visible load/collision/misplacement errors.
  injectLibraryErrors(tree, errors);
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
