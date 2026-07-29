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
// Cross-file citation registry merge IS done here (#190): a child's <data><library>
// survives assembly (hoisted, not stripped) and its src is rewritten master-relative,
// so every library — the master's and any per-chapter ones — joins the ONE project-wide
// registry buildCitationIndex builds over the assembled tree (master-document.md §Citations).
//
// Deferred to later slices (NOT done here): the placement markers (<toc> / <endnotes> /
// <bibliography>); the separate-pages per-chapter bibliography slicing; the website page
// model; remote-URL <library src> (needs the async render path). Those are the spec's
// "decide during the build" judgment slices — see #190.

import { isEnscribeTag } from '../core/tag.js';
import { BOOK_PART_SHORTHANDS } from '../interpreter/plugins/normalize-to-canonical.js';
import { BACK_MATTER_TAGS } from '../interpreter/lib/back-matter.js';

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

/**
 * True iff `node` is an `<include src=…>` — the transclusion primitive (#424;
 * master-document.md §Transclusion point 3): a block-level splice of the named
 * file's content at the call site, opening nothing and closing nothing. The
 * structural `src=` forms are sugar over it.
 */
export function isIncludeEntry(node) {
  return isEnscribeTag(node, 'include') && node.kwargs?.src != null;
}

/**
 * The assembly gate (#426): does this PARSED document carry an actual src-bearing entry —
 * a structural `<section/chapter/… src>` or an `<include src>` — at the level the assembler
 * resolves them (the root)? This is the ONE detection authority, and it is deliberately
 * STRUCTURAL, never textual: a src-form inside a code fence, an inline-code span, or any
 * verbatim context parses as literal text, never as an enscribeTag, so documentation
 * examples can NEVER trigger assembly — by construction, not by pattern-dodging.
 *
 * (Replaces the raw-source HAS_MASTER_SRC regex, which matched src-forms inside the Design
 * page's own fenced teaching examples and routed the whole page through assembly — the #424
 * regression: a path-less re-render, example tags gone live, spurious library-error boxes on
 * the deployed page. The regex is REMOVED, not refined: a smarter pattern would still be
 * text-reading, and the next author documenting any src form would re-trip it. Spec:
 * master-document.md §Transclusion — assembly triggers on parsed structure; verbatim content
 * never triggers it. Detection matches the assembler's own walk exactly: the same two
 * predicates over the same root-level children.)
 *
 * Cost note (measured, 2026-07-13): a parse is ~50% of a full render on real docs pages
 * (Design: 33ms of 60ms), so callers do NOT parse an extra time for detection — every call
 * site parses once and REUSES the tree (runSync on the no-src path; a memoized `parse` into
 * assembleMasterDocument on the src path).
 */
export function hasMasterSrcEntries(tree) {
  return (tree?.children ?? []).some((n) => isMasterSrcEntry(n) || isIncludeEntry(n));
}

/**
 * POSIX-relative composition: a `src` written inside the file at `baseSrc` (a
 * master-relative path, '' for the master itself) resolves against that file's
 * directory — the universal including-file rule (§Path resolution), applied
 * recursively. Absolute paths and URLs pass through.
 */
export function composeRel(baseSrc, src) {
  if (!src || src.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(src)) return src;
  const slash = baseSrc.lastIndexOf('/');
  const dir = slash >= 0 ? baseSrc.slice(0, slash) : '';
  return dir ? `${dir}/${src}` : src;
}

/**
 * The `<include src>` targets of a parsed tree's top level, composed against the
 * file's own (master-relative) path — the discovery primitive the browser's
 * transitive prefetch and the live-folder copy closure share (#424). Deduped,
 * document order.
 */
export function collectIncludeSrcs(tree, baseSrc = '') {
  return [
    ...new Set(
      (tree.children ?? [])
        .filter(isIncludeEntry)
        .map((n) => composeRel(baseSrc, n.kwargs.src)),
    ),
  ];
}

// Placement markers the spec defines but no slice assembles yet.
// #190: <bibliography> is no longer deferred — a master top-level <bibliography> survives
// assembly and routes to back-matter (the book-level bib), and a child's <bibliography> is
// kept in its chapter (split_bib). <toc>/<endnotes> placement remains deferred.
const DEFERRED_MARKERS = new Set(['toc', 'endnotes', 'endnote-list']);
// A child's <meta>/<config> are document-wide apparatus only the MASTER may declare
// (the master's <meta type> picks the document class; its <config> is the doc config),
// so they are stripped from a child. A child's <data> is NOT stripped — it is HOISTED
// so its <library> sources join the project-wide citation registry (#190).
const CHILD_STRIP_APPARATUS = new Set(['meta', 'config']);

/**
 * #472: strip nested child `<meta>`/`<config>` recursively.
 *
 * Top-level strip alone is not enough — config-discovery walks the whole tree
 * (including `content` arrays), so a `<config>` nested inside a child's
 * `<section>` would otherwise survive assembly and become document config.
 * Recursing makes the top-level CHILD_STRIP_APPARATUS rule the whole rule.
 * Preserves #460: a nested `strict-mode` declaration still emits the visible
 * override marker + warn instead of a silent drop.
 */
function stripNestedChildApparatus(node, src, ctx) {
  if (!node || typeof node !== 'object') return node;

  const scrubList = (list) => {
    if (!Array.isArray(list)) return list;
    const out = [];
    for (const n of list) {
      if (isEnscribeTag(n, 'config') && n.kwargs && n.kwargs['strict-mode'] != null) {
        const childMode = String(n.kwargs['strict-mode']);
        ctx.warn(`strict-mode is document-wide: child "${src}" declares strict-mode="${childMode}", which is ignored — the master's <config strict-mode> governs (a child cannot override)`);
        out.push(strictChildOverrideNode(src, childMode));
        continue;
      }
      if (isEnscribeTag(n) && CHILD_STRIP_APPARATUS.has(n.tagname)) continue;
      out.push(stripNestedChildApparatus(n, src, ctx));
    }
    return out;
  };

  let next = node;
  if (Array.isArray(node.content)) {
    const content = scrubList(node.content);
    if (content !== node.content) next = { ...next, content };
  }
  if (Array.isArray(node.children)) {
    const children = scrubList(node.children);
    if (children !== node.children) next = next === node ? { ...next, children } : { ...next, children };
  }
  return next;
}

// Src-bearing apparatus inside a <data> block, for the master-relative rewrite (below).
// Anchored to the opening tag and stopping at the first `|`, so a `src=` inside an inline
// `<library bibtex | …>` body (e.g. a bibtex `url={…src=…}`) is never matched.
const DATA_SRC_RE = /(<(?:library|fig|figure|table|csv|tsv)\b[^>|]*?\bsrc\s*=\s*)("[^"]*"|'[^']*'|[^\s/>|]+)/gi;

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
export function assembleMasterDocument({ source, readFile, resolve, parse, warn = () => {}, selfSrc = '' }) {
  const master = parse(source);
  const ctx = { readFile, resolve, parse, warn };
  // #424: the include chain is seeded with the master's OWN (master-relative) name when the
  // caller knows it, so a chain that leads back to the master (a → b → a where a is the
  // master) flags at the FIRST re-entry. Without it the cycle still terminates — the repeat
  // is caught one traversal later, when a non-master file re-enters the chain — but the
  // marker then names the sub-cycle rather than the full chain. Callers that know their
  // own file name should pass it.
  const rootChain = selfSrc ? [selfSrc] : [];
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
        const loaded = loadFileBody(src, [...rootChain, src], ctx, { chapterScopeBibs: true });
        childBody = loaded.body;
        childMetaTitle = loaded.metaTitle;
      } catch (err) {
        // Always-renders (#413 S1): a missing/unreadable child NEVER crashes the build. BOTH channels:
        // (1) the warn() below → file.message → CLI stderr + recap / browser console (already wired);
        // (2) a visible FLAGGED placeholder in the error family (the ⚠ role=alert block), replacing the
        // former bare unstyled paragraph that read like content. The chapter marker is still emitted
        // below, so the chapter keeps its number/title and renders this placeholder as its body.
        warn(`master: could not load <${node.tagname} src="${src}">: ${err.message}`);
        childBody = [masterSrcErrorNode(src, `could not load ${node.tagname} source "${src}": ${err.message}`)];
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

    // The `<include>` primitive (#424): splice the file's content at the call site,
    // as if typed there — no marker node, no structure. Chain starts empty (the
    // master is the unnamed origin of every include chain).
    if (isIncludeEntry(node)) {
      out.push(...spliceInclude(node, '', rootChain, ctx));
      continue;
    }

    // A deferred placement marker (#413 S3): the assembler does not yet assemble a master-scope
    // <toc>/<endnotes>/<endnote-list>. Always-renders — instead of silently dropping it, leave a
    // visible PLACEHOLDER where it stood (BOTH channels: the warn() below → the stream, and the
    // placeholder → the document), so the author sees the construct was recognized but not built here.
    if (isEnscribeTag(node) && DEFERRED_MARKERS.has(node.tagname)) {
      warn(`master: <${node.tagname}> placement marker is deferred to a later slice (#190); not assembled`);
      out.push(placementPlaceholderNode(`<${node.tagname}> placement in a multi-file (master) build is deferred (#190) — not assembled here`));
      continue;
    }

    // Everything else — the <meta> (its `type` selects the document class
    // downstream), inline `<section | Title>` markers and their following inline
    // body, <data>, <config> — passes through in document order.
    out.push(node);
  }

  return { type: 'root', children: out };
}

/**
 * Load a file and prepare its top-level body for splicing (#190 structural children,
 * #424 includes — one loader, so the sugar and the primitive cannot diverge):
 * strip the file's own <meta>/<config> (document-wide apparatus only the master
 * declares), hoist + rebase its <data>, resolve its own `<include>` entries
 * recursively (paths composed file-relative — §Path resolution), and stamp every
 * body node with the file's directory for the #408 src-rebase pass.
 *
 * @param {string}   src   - the file's master-relative path
 * @param {string[]} chain - the include chain that led here (for cycle detection)
 * @param {object}   ctx   - { readFile, resolve, parse, warn }
 * @param {object}   [o]
 * @param {boolean}  [o.chapterScopeBibs=false] - #190 split_bib: a STRUCTURAL child's
 *   <bibliography> is that chapter's (marked chapter-scoped). An include's is NOT —
 *   included content is "typed there", so its <bibliography> means whatever it would
 *   mean written at the call site.
 * @returns {{ body: object[], metaTitle: string }}
 */
function loadFileBody(src, chain, ctx, { chapterScopeBibs = false } = {}) {
  const tree = ctx.parse(ctx.readFile(ctx.resolve(src)));
  const kids = tree.children ?? [];
  const meta = kids.find((c) => isEnscribeTag(c, 'meta'));
  const metaTitle = meta?.kwargs?.title ?? '';
  const srcSlash = src.lastIndexOf('/');
  const srcDir = srcSlash >= 0 ? src.slice(0, srcSlash) : '';

  const body = [];
  for (const c of kids) {
    // #460: a child's own <config strict-mode> cannot override the master's DOCUMENT-WIDE setting.
    // Doctrine, not silent strip: a visible flag where the declaration stood + a paired warn on the
    // CLI/console, so both channels say the master governs. Only strict-mode is flagged; other config
    // keys are document-wide apparatus stripped as before. The <config> is still stripped below (it
    // does not set the register — the register was applied at assembly, in render-document.js).
    if (isEnscribeTag(c, 'config') && c.kwargs && c.kwargs['strict-mode'] != null) {
      const childMode = String(c.kwargs['strict-mode']);
      ctx.warn(`strict-mode is document-wide: child "${src}" declares strict-mode="${childMode}", which is ignored — the master's <config strict-mode> governs (a child cannot override)`);
      body.push(strictChildOverrideNode(src, childMode));
      continue;
    }
    if (isEnscribeTag(c) && CHILD_STRIP_APPARATUS.has(c.tagname)) continue;
    // A nested `<include>` inside this file: splice it here, file-relative (#424).
    if (isIncludeEntry(c)) {
      body.push(...spliceInclude(c, src, chain, ctx));
      continue;
    }
    let node = c;
    if (isEnscribeTag(c, 'data')) node = rebaseChildData(c, src);
    else if (chapterScopeBibs && isEnscribeTag(c, 'bibliography')) {
      // #190 split_bib: a <bibliography> in a CHILD's body is that chapter's
      // bibliography. Mark it so book-structuring keeps it INSIDE the book-part — a
      // flat sibling is otherwise routed to back-matter (a BACK_MATTER_TAGS boundary).
      node = { ...c, kwargs: { ...c.kwargs, 'chapter-scoped': true } };
    }
    // #408: stamp body nodes with the file's directory so the src-rebase pass
    // (interpreter/plugins/src-rebase.js) resolves body-level relative srcs
    // file-relative — the universal including-file rule. `src` is already
    // master-relative here (composed up the chain), so the stamp is too. A node
    // spliced from a DEEPER include already carries its own (deeper) stamp — keep it.
    // #472: also scrub nested meta/config inside this node (section.content, etc.).
    node = stripNestedChildApparatus(node, src, ctx);
    body.push(srcDir && node._srcDir === undefined ? { ...node, _srcDir: srcDir } : node);
  }
  return { body, metaTitle };
}

/**
 * Splice one `<include src=…>` entry (#424): resolve the target file-relative to the
 * including file, detect cycles against the chain, and return the spliced body nodes
 * (or the visible cycle/load-failure degrade — always-renders, never a silent drop).
 *
 * @param {object}   node    - the include entry node
 * @param {string}   baseSrc - the including file's master-relative path ('' = the master)
 * @param {string[]} chain   - master-relative paths currently being spliced (ancestors)
 * @param {object}   ctx     - { readFile, resolve, parse, warn }
 * @returns {object[]} the nodes to splice in
 */
function spliceInclude(node, baseSrc, chain, ctx) {
  const composed = composeRel(baseSrc, node.kwargs.src);

  // Cycle detection (§Recursion and cycles): the chain of including files is
  // tracked; re-entering a file already being spliced is the one prohibited
  // topology. The offending include renders a visible marker naming the cycle,
  // that splice is skipped, and assembly continues. (The same file included at
  // two DIFFERENT sites is not a cycle — the chain only holds ancestors.)
  if (chain.includes(composed)) {
    const cycle = [...chain.slice(chain.indexOf(composed)), composed];
    const display = cycle.join(' → ');
    ctx.warn(`include: cycle detected — the splice is skipped: ${display}`);
    return [includeErrorNode(node.kwargs.src, `include cycle: ${display}`)];
  }

  try {
    return loadFileBody(composed, [...chain, composed], ctx).body;
  } catch (err) {
    ctx.warn(`include: could not load <include src="${node.kwargs.src}"> (resolved "${composed}"): ${err.message}`);
    return [includeErrorNode(node.kwargs.src, `could not load "${composed}": ${err.message}`)];
  }
}

// A visible `__include-error` marker node (rendered by includeErrorHandler as a
// role=alert block, the asset/library error family's shape). Emitted from the
// assembler straight into the pre-pipeline tree — the interpreter dispatches
// internal-marker tagnames wherever they appear.
function includeErrorNode(src, message) {
  return { type: 'enscribeTag', tagname: '__include-error', kwargs: { src: src ?? '', message }, content: null };
}

// #413 S1: a visible `__master-src-error` marker for a structural child (`<chapter/section/…
// src>`) whose file could not be loaded. Its own tagname (not __include-error) because it is a
// distinct authoring case — a missing STRUCTURAL child, not a failed inline <include> splice — so a
// maintainer grepping the class learns which construct failed; it renders in the SAME role=alert
// family (masterSrcErrorHandler → the name-agnostic family CSS at default.css:469, no new CSS).
// The chapter/section marker itself is still emitted below (keeping its number + title), so this is
// the flagged PLACEHOLDER body in an otherwise-numbered chapter — the always-renders doctrine.
function masterSrcErrorNode(src, message) {
  return { type: 'enscribeTag', tagname: '__master-src-error', kwargs: { src: src ?? '', message }, content: null };
}

// #413 S3: a visible placeholder for a placement marker the assembler recognizes but does not build in
// a multi-file master (a master-scope <toc>/<endnotes>). Rendered by placementPlaceholderHandler in the
// error family's diagnostic-box voice — so the deferred construct leaves a visible trace, never a
// silent drop. Paired with the assembler's warn() so both channels fire.
function placementPlaceholderNode(message) {
  return { type: 'enscribeTag', tagname: '__placement-placeholder', kwargs: { message }, content: null };
}

// #460: strict-mode is DOCUMENT-WIDE — only the master's <config strict-mode> governs. A child that
// declares its own strict-mode gets the doctrine treatment, never a silent strip: a visible flag node
// (rendered by strictChildOverrideHandler in the error family's voice — no new CSS) left where the
// declaration stood, paired with the assembler's warn() so both the page and the CLI/console say the
// same thing. The master's setting still governs; the child's declaration has no effect on the register.
function strictChildOverrideNode(src, mode) {
  const message = `child "${src}" declares strict-mode="${mode}", but strict-mode is document-wide — the master's <config strict-mode> governs (a child cannot override)`;
  return { type: 'enscribeTag', tagname: '__strict-child-override', kwargs: { src: src ?? '', mode: mode ?? '', message }, content: null };
}

function stripSrc(kwargs) {
  if (!kwargs) return {};
  const { src, ...rest } = kwargs;
  return rest;
}

// Rewrite a child-relative asset/library `src` to master-relative: prefix it with the
// child file's directory, so the build's single master-relative resolve (assetsDir =
// masterDir for the CLI, the master URL for the browser preload) finds it. Absolute
// paths and URLs (http:, data:, …) are not child-relative — leave them. POSIX-style
// relative joining only (no node:path — this module runs in the browser too).
function rebaseSrc(childSrc, src) {
  if (!src || src.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(src)) return src;
  const slash = childSrc.lastIndexOf('/');
  const dir = slash >= 0 ? childSrc.slice(0, slash) : '';
  return dir ? `${dir}/${src}` : src;
}

// A hoisted child <data>'s `src`s are authored relative to the child; rewrite them
// master-relative (#190). At parse stage <data> content is a raw string (the recursive
// parser structures it later), so the rewrite is a string transform over the src
// ATTRIBUTES of src-bearing apparatus only (DATA_SRC_RE's pipe guard skips inline content).
function rebaseChildData(dataNode, childSrc) {
  if (typeof dataNode.content !== 'string') return dataNode;
  const content = dataNode.content.replace(DATA_SRC_RE, (_m, pre, val) => {
    const q = (val[0] === '"' || val[0] === "'") ? val[0] : '';
    const raw = q ? val.slice(1, -1) : val;
    return `${pre}${q}${rebaseSrc(childSrc, raw)}${q}`;
  });
  return content === dataNode.content ? dataNode : { ...dataNode, content };
}

/**
 * Splice a book page's TRAILING interstitial content — a website `<item src>`'s marker-7 body, i.e. master
 * content authored after a book item and before the next nav entry — into an assembled (pre-runSync) book
 * tree's children, so it lands in the LAST book-part: the deepest-open-container, "as if typed at the end of
 * that chapter" (#433, the decided rule; the book mirror of the article marker-7 splice). A figure in the
 * interstitial therefore numbers in that chapter's scope and its ids are owned by that chapter's page — the
 * numbering/ownership fall out of the existing structural passes, no provenance threading needed.
 *
 * Insertion goes BEFORE any trailing document-level back-matter run (config / bibliography / note-list — a
 * `BACK_MATTER_TAGS` boundary, matching book-structuring's `assembleBookPartContents`), which resets the
 * absorb cursor: inserting after it would strand the interstitial as a loose `<book-body>` sibling. A
 * chapter-scoped `<bibliography>` is NOT a boundary (it lives inside its chapter), mirroring `isBackMatter`.
 *
 * The body is DEEP-CLONED per call (#428): a website book is assembled + `runSync`'d TWICE (Phase 1 harvest,
 * Phase 2 render), and `runSync` mutates nodes in place and is not idempotent — so each phase must splice a
 * fresh copy of the shared `page.body`, exactly as compose-site clones the article tree seam.
 *
 * @param {Array} children       - the assembled book tree's children (pre-runSync).
 * @param {Array} [trailingBody] - the interstitial mdast nodes; empty/absent → `children` is returned as-is.
 * @returns {Array} a new children list with the interstitial inserted at the deepest-open-container.
 */
export function spliceBookInterstitial(children, trailingBody) {
  if (!Array.isArray(trailingBody) || trailingBody.length === 0) return children;
  const body = structuredClone(trailingBody);
  const isDocBackMatter = (n) =>
    isEnscribeTag(n) && BACK_MATTER_TAGS.has(n.tagname) && !n.kwargs?.['chapter-scoped'];
  let i = children.length;
  while (i > 0 && isDocBackMatter(children[i - 1])) i--;
  return [...children.slice(0, i), ...body, ...children.slice(i)];
}
