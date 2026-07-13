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
import { makeErrorNode, injectBodyErrors } from '../lib/error-injection.js';

// #133: a src string is "remote" (async-only) when it has a URL scheme. Anything
// else is a filesystem path (sync-readable on the CLI; in the browser it is
// resolved against the document base URL and fetched by the pre-load pass).
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

// C1 (#436): the accepted citation-style vocabulary — the warned-default guard for
// `<config citation-style=…>`, mirroring index.js's KNOWN_THEMES guard. A value OUTSIDE this set is a
// typo (e.g. "chicagoo") and warns through the seam + falls to the default; a value inside is passed
// through. The set is the documented styles (cite.md's Citation-styles table + config-options-doc's
// examples) plus citation-js's bundled CSL templates. NOTE the deeper gap this guard does NOT cover:
// only apa / vancouver / harvard1 are actually BUNDLED in citation-js 0.7; the rest (author-year,
// chicago-*, ieee, numbered, …) currently fall back to citation-js's default style at format time.
// That advertised-but-unbundled gap is tracked separately; C1's scope is narrower — catch the
// outright-invalid VALUE, the one true silent survivor of the always-render contract.
const DEFAULT_CITATION_STYLE = 'chicago-author-date';
const KNOWN_CITATION_STYLES = new Set([
  'apa', 'vancouver', 'harvard1',                                          // citation-js bundled CSL templates
  'chicago-author-date', 'chicago',                                        // the default + a common alias
  'author-year', 'numbered', 'footnote', 'endnote', 'inline-author-year',  // cite.md's documented styles
  'ieee',                                                                  // config-options-doc example
]);

/**
 * A visible `__library-error` node (rendered by libraryErrorHandler). always-
 * renders (#133): a failed load / collision / misplacement shows a visible block
 * naming the source, never a silent drop.
 *
 * Exported (#411): the minipage guard emits the boxed-library misplacement flag
 * through this same factory, so every library-placement failure is one family.
 */
export function libraryError(src, message) {
  return makeErrorNode('__library-error', 'src', src, message);
}

/**
 * The #411 misplacement message for a `<library>` inside a minipage: prohibited
 * outright (Ariel: "one document, one library" — LaTeX has no box-local
 * bibliography concept; a box cite resolves against the DOCUMENT's library).
 * Owned here so the misplacement family's wording lives in one home; the
 * minipage guard (plugins/minipage-guard.js) is the enforcement point — it runs
 * before this plugin's classifier, so a boxed library is neutralized (and
 * flagged with THIS message) before collectMisplacedLibraries could flag it
 * with the misleading "move it into <data>" advice, which cannot help in a box.
 *
 * @param {number} citeCount - `<cite>` nodes in the box (the #410-style hint:
 *   the true cause of every one of them failing is on the page).
 */
export function minipageLibraryMessage(citeCount) {
  const hint = citeCount > 0
    ? `; ${citeCount} citation${citeCount === 1 ? '' : 's'} in this box cannot resolve against it`
    : '';
  return `a <library> is not allowed inside a minipage — one document, one library. ` +
    `This one was NOT loaded${hint}. Declare it in the document's <data> block; ` +
    `a cite inside the box resolves against the document's library (#411).`;
}

/** Recursively classify every misplaced `<library>` node (#410: a library LOADS only as a
 * direct child of a `<data>` block — library.md §Placement is a requirement, not a
 * convention). Two misplacement classes, matching the load loop's actual reach:
 *   apparatus — inside `<config>`/`<meta>` (the pre-#410 flag case);
 *   bare      — anywhere else outside a `<data>` block's direct children (body level, or
 *               nested deeper inside `<data>` than the loop reads). Not loaded either way.
 * Data-placed libraries are not collected — the load loop handles them. */
function collectMisplacedLibraries(nodes, ctx = 'body', out = { apparatus: [], bare: [] }) {
  for (const node of nodes ?? []) {
    if (isEnscribeTag(node, 'library')) {
      if (ctx === 'apparatus') out.apparatus.push(node);
      else if (ctx !== 'data') out.bare.push(node);
    }
    // Children's context: apparatus is sticky; a <data> node's DIRECT children are 'data'
    // (the loop loads exactly those); everything else — including a data grandchild's
    // content — is 'body'.
    const childCtx = ctx === 'apparatus' || isEnscribeTag(node, 'config') || isEnscribeTag(node, 'meta')
      ? 'apparatus'
      : isEnscribeTag(node, 'data') ? 'data' : 'body';
    if (isEnscribeTag(node) && Array.isArray(node.content)) collectMisplacedLibraries(node.content, childCtx, out);
    if (Array.isArray(node.children)) collectMisplacedLibraries(node.children, childCtx, out);
  }
  return out;
}

/** Count the document's `<cite>` nodes (for the misplacement hint — every one of them is
 * unable to resolve against a library that was not loaded). Exported (#411): the minipage
 * guard reuses it to count the box's cites for the boxed-library hint. */
export function countCites(nodes, n = 0) {
  for (const node of nodes ?? []) {
    if (isEnscribeTag(node, 'cite')) n++;
    if (isEnscribeTag(node) && Array.isArray(node.content)) n = countCites(node.content, n);
    if (Array.isArray(node.children)) n = countCites(node.children, n);
  }
  return n;
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
 * Exported so the embedded-asset index (plugins/asset-load.js, #190) reuses the
 * same <data> deep-collection the citation index uses.
 *
 * @param {Array} nodes
 * @returns {Array} the <data> tag nodes found
 */
export function collectDataNodes(nodes) {
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

  // #410 (was #133): a <library> loads ONLY from inside a <data> block — library.md
  // §Placement is a requirement. Flag every misplaced one visibly; none are loaded.
  // The bare-placement flag carries the document's cite count — the hint Ariel asked
  // for lives HERE, at the true cause, rather than on each ??cite:…?? marker: one
  // visible alert explains all N failing cites, and no new library-load ↔
  // cite-resolution coupling is needed (the count is a same-plugin tree walk; the
  // enscribeCitations unset-means-no-library contract stays untouched).
  const misplaced = collectMisplacedLibraries(tree.children ?? []);
  for (const mis of misplaced.apparatus) {
    errors.push(libraryError(
      mis.kwargs?.src ?? '',
      '<library> is not allowed inside <config> or <meta> — place it inside a <data> block',
    ));
  }
  if (misplaced.bare.length > 0) {
    const cites = countCites(tree.children ?? []);
    const hint = cites > 0
      ? `; ${cites} citation${cites === 1 ? '' : 's'} in this document cannot resolve against it`
      : '';
    for (const mis of misplaced.bare) {
      errors.push(libraryError(
        mis.kwargs?.src ?? '',
        `a <library> loads only from inside a <data> block — this one was NOT loaded${hint}. Move the <library> into a <data> block.`,
      ));
    }
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
        // #395 (always-renders): EVERY parse failure is a visible error — src-loaded
        // (#133) and inline alike. (Supersedes the earlier inline-stays-a-warning
        // split: with unresolvable cites now rendering ??cite:…?? markers, an invisible
        // inline parse failure would read as "key missing" when the real failure is
        // "the library never parsed" — a misleading hint, worse than none.)
        errors.push(libraryError(libraryNode.kwargs?.src ?? '', `parse failed: ${err.message}`));
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
      const configured = file?.data?.[ENSCRIBE_CONFIG]?.get('citation-style');
      // C1 (#436): an explicitly-configured style outside the accepted vocabulary is a typo that
      // otherwise renders a wrong-style bibliography with ZERO warning — the one true silent survivor
      // of the always-render contract. Warn through the seam like every warned-default (#401) and fall
      // to the default; the bibliography still renders (always-renders). An unset/default value is
      // never "wrong", so only an explicit `configured` is checked.
      if (configured != null && !KNOWN_CITATION_STYLES.has(String(configured))) {
        file?.message?.(
          `config: citation-style="${configured}" is not a recognized citation style — ` +
            `expected one of: ${[...KNOWN_CITATION_STYLES].join(', ')}; the default applies`,
          undefined, 'cite:unknown-style',
        );
      }
      const style = (configured != null && KNOWN_CITATION_STYLES.has(String(configured)))
        ? configured : DEFAULT_CITATION_STYLE;
      file.data = file.data ?? {};
      file.data[ENSCRIBE_CITATIONS] = {
        cite: mergedCite,
        order: [],   // filled by cite-resolution in citation-document order
        style,
      };
    }
  }

  // always-renders: inject any visible load/collision/misplacement errors.
  injectBodyErrors(tree, errors);
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
