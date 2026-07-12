// src/browser.js — browser entry façade.
//
// The library's browser-facing API: turn enscribe source into HTML with one
// call, using browser-safe defaults so nothing tries to read the filesystem.
// This is the tsup entry point (see tsup.config.js); the package.json "browser"
// field swaps hover-preview assets to their build-inlined variant transparently
// inside index.js, so this file stays a thin wrapper over buildEnscribePipeline.
//
// Defaults rationale (Phase 14 Slice 1, "external-by-default" per the ratified
// embedResources design):
//   embedResources: false  → fonts + KaTeX CSS link to CDNs rather than inlining
//                            base64 (avoids fs reads; smaller HTML).
//   hoverPreviewMode: 'link' → third-party Tippy/Popper load from CDN; enscribe's
//                            own hover CSS/JS come from the build-inlined bundle.
//   dslMode: 'live-link'   → mermaid/abc render client-side from CDN scripts
//                            instead of being statically rendered via jsdom.
// A caller can override any of these (e.g. render(src, { embedResources: true })
// for self-contained output), and the finer-grained per-resource options
// (katexCss / documentFontsCss / per-DSL *Mode) still take precedence.

import {
  buildEnscribePipeline,
  collectLibrarySources,
  collectTableSources,
  assembleMasterDocument,
  isMasterSrcEntry,
  isIncludeEntry,
  collectIncludeSrcs,
  hasMasterSrcEntries,
  buildLiveBook,
  renderLiveChapterView,
  renderLiveCoverView,
  renderLiveChapterEditView,
  renderLiveChapterPreviewBody,
  renderLiveArticleEditView,
  createIncrementalRebuilder,
  resolveRoute,
  composeSiteRegistry,
  rewriteCrossPageHrefs,
  resolvePageSlug,
  allocatePageSlug,
  renderNotFoundView,
  pageErrorViewHtml,
  notFoundViewHtml,
  flattenNavPages,
  extractDocumentTitle,
  WEBSITE_SHELL_CSS,
} from './index.js';
import { preloadSources } from './lib/preload-library-sources.js';
import { routeMessagesToConsole } from './lib/diagnostics-format.js';
import { serializeSavedFile, writeSavedFile, suggestedFileName } from '../master-document/save-single-file.js';
import { HAS_TABLE_SRC } from './lib/table-constants.js';
import { ENSCRIBE_LOADED_SOURCES, ENSCRIBE_NAV_MODEL, ENSCRIBE_CONFIG, ENSCRIBE_PAGE_LINK_RESOLVER } from '../core/file-data-keys.js';
import { readConfigBool } from './lib/config-helpers.js';
import { classifyDocType } from './lib/classify-doc-type.js';
import { injectBookNavStyles, bindBackToTop } from './assets/book-nav-asset.js';
import {
  injectWebsiteNavStyles, buildWebsiteTopBar, buildWebsiteSidebar, composeWebsiteShell,
  setActivePage, bindWebsiteNavDismiss, buildShellActions, SHELL_ACTIONS_CSS,
} from './assets/website-nav-asset.js';
import { isEnscribeTag } from '../core/tag.js';

// ── #392: the chrome corner's Edit toggle ─────────────────────────────────────────────────────────
// One binder for every surface that renders the corner. Clicking Edit flips the SAME `?edit` switch
// the URL hack uses (#213 — which keeps working) and reloads: read↔edit with a shareable URL and no
// new mode machinery. Bound on a container (delegation) so a re-rendered corner stays live.
function bindShellEditToggle(container) {
  if (!container || typeof container.addEventListener !== 'function') return;
  if (container.__enscribeEditToggleBound) return;
  container.__enscribeEditToggleBound = true;
  container.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('[data-enscribe-edit-toggle]');
    if (!btn) return;
    const u = new URL(location.href);
    if (u.searchParams.has('edit')) u.searchParams.delete('edit');
    else u.searchParams.set('edit', '');
    location.href = u.toString();
  });
}

// The floating corner for STANDALONE live shells (article/book — no top bar): fixed top-right, the
// same pill the website corner is (and the #398 gear's future home). Injected OUTSIDE the mount root
// (the routers innerHTML-swap the root's content), CSS style-injected idempotently (standalone shells
// never load the website chrome CSS). Edit only — a standalone shell's document is the page (repo
// linkage is the website chrome's `<config repo>` concern; threading it through the three standalone
// mount paths rides the #398 corner slice).
function injectFloatingShellActions() {
  // No document → nothing to inject; no location → nothing the Edit toggle could flip (a jsdom
  // harness without a URL, or a non-browser host) — the corner is chrome for a real navigable page.
  if (typeof document === 'undefined' || typeof location === 'undefined') return;
  if (document.getElementById('enscribe-shell-actions-floating')) return;
  if (!document.getElementById('enscribe-shell-actions-style')) {
    const s = document.createElement('style');
    s.id = 'enscribe-shell-actions-style';
    s.textContent = SHELL_ACTIONS_CSS;
    document.head.appendChild(s);
  }
  const editOn = new URLSearchParams(location.search).has('edit');
  const holder = document.createElement('div');
  holder.id = 'enscribe-shell-actions-floating';
  holder.innerHTML = buildShellActions({ edit: true, editOn, floating: true });
  document.body.appendChild(holder);
  bindShellEditToggle(holder);
}

const BROWSER_DEFAULTS = {
  embedResources: false,
  hoverPreviewMode: 'link',
  dslMode: 'live-link',
};

// #48: memoize the built pipeline. The pipeline build depends only on the
// resolved options (the plugin set is fixed; options configure the interpreter),
// NOT on the source — which arrives later, per call, via processSync. So one
// processor can be reused across every render() that shares options. The
// playground re-renders on each debounced keystroke with stable options, so this
// turns N pipeline builds into 1. A unified processor is reusable across
// processSync calls — per-render state lives on the VFile, never the processor —
// and this was verified output-identical to a fresh build per call. The cache is
// keyed on the resolved options, so changing any option uses (and caches) a
// distinct pipeline; a stale pipeline is never served. Unbounded by design: the
// key space is the set of distinct option combinations a session uses, which is
// tiny (the playground uses one).
const _pipelineCache = new Map();

/**
 * Stable string key for a resolved-options object: entries sorted by name, then
 * JSON-encoded. The documented option values are primitives (booleans / strings
 * / null), so this is a faithful, collision-free key.
 */
function pipelineKey(resolvedOptions) {
  const entries = Object.entries(resolvedOptions).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return JSON.stringify(entries);
}

/**
 * The memoized render pipeline for these options, built (and cached) on first
 * use and reused thereafter. render() and renderInto() go through it. Exported
 * for tests (a reuse / instance-identity check); not part of the documented
 * public surface.
 *
 * @param {object} [options] - pipeline options; override BROWSER_DEFAULTS as needed.
 * @returns {import('unified').Processor}
 */
export function getPipeline(options = {}) {
  const resolved = { ...BROWSER_DEFAULTS, ...options };
  const key = pipelineKey(resolved);
  let processor = _pipelineCache.get(key);
  if (!processor) {
    processor = buildEnscribePipeline(resolved);
    _pipelineCache.set(key, processor);
  }
  return processor;
}

/**
 * Render enscribe source to an HTML string.
 *
 * @param {string} source - enscribe/markdown source text.
 * @param {object} [options] - pipeline options; override BROWSER_DEFAULTS as needed.
 * @returns {string} Serialized HTML.
 */
export function render(source, options = {}) {
  // #402: a live render's diagnostics channel is the console — route the run's
  // messages when it completes (the browser half of the CLI's reporting seam).
  return String(routeMessagesToConsole(getPipeline(options).processSync(source)));
}

// #133: a <library src> fast-path gate — true only if the source might carry an
// external library source, so renderAsync can short-circuit to the sync render
// for the common (inline / no-src) case without a discovery parse.
const HAS_LIBRARY_SRC = /<library\b[^>]*\bsrc\s*=/i;
// #195: the `<table|csv|tsv src>` data-source gate (analog of HAS_LIBRARY_SRC, so
// renderAsync pre-fetches external table data) is HAS_TABLE_SRC, imported from
// lib/table-constants.js (#253) where it is derived from the shared TABLE_TAGS set.

/**
 * Fetch a library source's text, resolving a relative src against the document
 * base URL. Throws (→ a visible error) on a non-OK response or a network/CORS
 * failure — a runtime fact for cross-origin URLs, surfaced, not gated.
 */
async function fetchSourceText(src, baseUrl) {
  const url = baseUrl ? new URL(src, baseUrl).href : src;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}`);
  return res.text();
}

/**
 * Render enscribe source to HTML, loading any external `<library src>` bibliography
 * and `<table src>` / `<csv src>` / `<tsv src>` data sources first (#133, #195). The
 * async counterpart of render(): it pre-fetches each source (relative paths against
 * `document.baseURI`; cross-origin URLs are CORS-limited and surface a visible error),
 * then runs the same synchronous pipeline with the loaded content. Sources that fail to
 * load render a visible error block; the document still renders (always-renders).
 *
 * For a document with no external `src` this is just render() — no fetch, no extra parse.
 *
 * @param {string} source - enscribe/markdown source text.
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Promise<string>} Serialized HTML.
 */
export async function renderAsync(source, options = {}) {
  if (!HAS_LIBRARY_SRC.test(source) && !HAS_TABLE_SRC.test(source)) return render(source, options);
  // #195: library bibliographies and table data both ride the one ENSCRIBE_LOADED_SOURCES
  // bus (src → text); collect and fetch both in one pre-load pass.
  const srcs = [...collectLibrarySources(source), ...collectTableSources(source)];
  if (srcs.length === 0) return render(source, options);
  const baseUrl = (typeof document !== 'undefined' && document.baseURI) || undefined;
  const loaded = await preloadSources(srcs, (src) => fetchSourceText(src, baseUrl));
  return String(
    routeMessagesToConsole(
      getPipeline(options).processSync({ value: source, data: { [ENSCRIBE_LOADED_SOURCES]: loaded } }),
    ),
  );
}

/**
 * renderAsync + write into a DOM element (the async counterpart of renderInto).
 * Like renderInto, the result is assigned via innerHTML, so call executeAssets
 * after this to activate any injected interactive scripts.
 *
 * @param {string|Element} target - a CSS selector or an Element to fill.
 * @param {string} source - enscribe/markdown source text.
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Promise<Element>} The element that was written into.
 */
export async function renderIntoAsync(target, source, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) {
    throw new Error(`renderIntoAsync: target not found: ${String(target)}`);
  }
  el.innerHTML = await renderAsync(source, options);
  return el;
}

// #194/#426: the master-src gate (hasMasterSrcEntries, shared with the assembler) —
// true only if the PARSED tree carries a `<section src>` / `<chapter src>` / … / `<include src>`
// entry, so renderMasterAsync can short-circuit a non-master source to the ordinary
// (library-aware) async render. The gate is STRUCTURAL: a src-form inside a code fence is
// a text node, never an entry, so a page documenting the syntax never trips assembly.

/**
 * Throw on a child source the async pre-load could not supply, so the assembler's
 * own try/catch turns it into a visible inline "(could not load … source …)" note
 * (always-renders). A successful entry returns the fetched child text.
 */
function readPreloadedChild(loaded, src) {
  const entry = loaded[src];
  if (!entry) throw new Error(`child source not preloaded: ${src}`);
  if (entry.error != null) throw new Error(entry.error);
  if (typeof entry.content !== 'string') throw new Error(`child source "${src}" loaded empty`);
  return entry.content;
}

/**
 * Render a multi-file MASTER document live (#194). The browser counterpart of the
 * CLI `enscribe build`: discover the master's top-level `src` structure entries
 * (`<section src>` for an article, `<chapter src>` / `<preface src>` / … for a book),
 * pre-fetch each child (async; relative paths resolve against `document.baseURI`,
 * exactly as <library src> does — the source-agnostic principle: fetch vs fs is just
 * the injected reader), then run the SAME pure `assembleMasterDocument` the CLI uses
 * to stitch the children into one flat tree, and render it through the standard
 * synchronous pipeline (which structures it as an article or book per `<meta type>`).
 * The async-fetch-then-sync-assemble handoff mirrors renderAsync's <library src> pre-load.
 *
 * SINGLE-LEVEL, by design: like the assembler (and the CLI path), only the master's
 * own `src` children are loaded — a `src` entry inside a child rides through
 * unresolved. This keeps browser output byte-identical to the CLI build.
 *
 * always-renders: a child that fails to fetch (404 / network / CORS) renders a
 * visible "(could not load … source …)" note in place; the document still renders.
 * A source with no `src` structure entry is not a master — it falls back to
 * renderAsync (which itself falls back to render() when there is nothing to fetch).
 *
 * Scope: the master's `src` children AND its own `<library src>` bibliography are
 * pre-loaded together in one fetch pass (#197 folded the library into this loader) —
 * the structure children are stitched in by the assembler, the library sources ride to
 * the pipeline on `file.data[ENSCRIBE_LOADED_SOURCES]`. A `src` entry inside a CHILD
 * still rides through unresolved (single-level, per the design note above).
 *
 * @param {string} source - the master document's enscribe source.
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Promise<string>} Serialized HTML of the assembled document.
 */
/**
 * Discover a master's top-level `src` structure children FROM ITS PARSED TREE — the SAME
 * predicate (isMasterSrcEntry) the assembler uses, so the discovered set is exactly the
 * set assembleMasterDocument resolves (one authority, no drift). Deduped child `src`s.
 * Takes the tree (not the source): #426 makes every call site parse ONCE and both gate
 * (hasMasterSrcEntries) and discover from that one parse — a src-form inside a code fence
 * is a text node, never an entry, so it neither gates nor is discovered (by construction).
 */
function discoverChildSrcs(masterTree) {
  return [
    ...new Set([
      ...(masterTree.children ?? [])
        .filter(isMasterSrcEntry)
        .map((n) => n.kwargs.src),
      // #424: the master's own top-level <include> targets join the first fetch wave;
      // includes nested in fetched files are closed over in loadAndAssembleMaster.
      ...collectIncludeSrcs(masterTree),
    ]),
  ];
}

/**
 * Fetch a master's `src` children (+ its own `<library src>` / `<table src>`) in one
 * deduped pass and stitch them into ONE flat tree via the pure assembler. The browser
 * counterpart of the CLI's fs-read-then-assemble — `fetch` vs `fs` is just the injected
 * reader (the assembler is already behind a readFile/resolve/parse seam; #194/#201).
 *
 * Shared by renderMasterAsync (whole-book stringify) and mountLiveBook (per-chapter live
 * render): both need the assembled tree + the loaded-sources carrier; only what they do
 * after — stringify the whole book vs. runSync-then-render-the-current-chapter — differs.
 *
 * @returns {Promise<{ tree: object, loadedFile: { data: object } }>} the assembled tree
 *   and the VFile-shaped carrier holding file.data[ENSCRIBE_LOADED_SOURCES] (the channel
 *   runSync + stringify read: #197 library bibliography, #195 table data).
 */
async function loadAndAssembleMaster(proc, source, childSrcs, loadSource, selfSrc = '') {
  const baseUrl = (typeof document !== 'undefined' && document.baseURI) || undefined;
  // The source-provider seam (single-file / #288): a caller may INJECT how a referenced source is
  // read; the default is the HTTP fetch the served Live modes use. `preloadSources` already takes the
  // loader as a parameter, so this is a one-line substitution — the embedded/in-place read path passes
  // a non-fetch provider here while the website/folder/book modes keep fetching. (For a self-contained
  // single document the list below is empty, so the provider is never invoked — only the master read,
  // handled at the entry, differs; carrying embedded CHILDREN is the site-in-a-file follow-on.)
  const load = loadSource ?? ((src) => fetchSourceText(src, baseUrl));
  // #197 / #195: pre-load the master's OWN `<library src>` bibliography AND `<table src>`
  // data in the SAME pass as its `src` structure children — one deduped fetch. The
  // structure children are consumed by the assembler (readPreloadedChild); library +
  // table sources ride to the pipeline on the VFile via file.data[ENSCRIBE_LOADED_SOURCES]
  // (the channel renderAsync populates, library-load and the table handler read). No
  // second assembler, no new fetch mechanism.
  const librarySrcs = collectLibrarySources(source);
  const tableSrcs = collectTableSources(source);
  const loaded = await preloadSources(
    [...childSrcs, ...librarySrcs, ...tableSrcs],
    load,
  );
  // #424: transitive include closure. A fetched file (a chapter child or an included
  // file) may itself carry <include> entries the initial discovery cannot see; scan each
  // fetched source for them (paths composed file-relative, per §Path resolution) and
  // fetch what is missing, iterating to closure. Already-fetched paths are skipped, so a
  // cyclic graph terminates here too — the assembler renders the visible cycle marker at
  // splice time; this loop only guarantees the sources are present.
  {
    const scanned = new Set();
    for (;;) {
      const pending = [];
      for (const [src, entry] of Object.entries(loaded)) {
        if (scanned.has(src) || entry?.error != null || typeof entry?.content !== 'string') continue;
        scanned.add(src);
        for (const inc of collectIncludeSrcs(proc.parse(entry.content), src)) {
          if (!(inc in loaded)) pending.push(inc);
        }
      }
      if (pending.length === 0) break;
      Object.assign(loaded, await preloadSources([...new Set(pending)], load));
    }
  }
  const tree = assembleMasterDocument({
    source,
    ...(selfSrc ? { selfSrc } : {}),
    parse: (s) => proc.parse(s),
    // The pre-load map is keyed by the raw child src (the URL was resolved against
    // the base at fetch time), so resolve is identity and readFile is a cache hit.
    resolve: (rel) => rel,
    readFile: (src) => readPreloadedChild(loaded, src),
    warn: (m) => {
      if (typeof console !== 'undefined' && console.warn) console.warn(m);
    },
  });
  const loadedFile = { data: { [ENSCRIBE_LOADED_SOURCES]: loaded } };
  return { tree, loadedFile };
}

export async function renderMasterAsync(source, options = {}) {
  const proc = getPipeline(options);
  // #426: structural gate — parse once, then ask the parsed tree. A fenced/inline src-form
  // is literal text, never an entry, so a page that TEACHES `<include src>` renders as the
  // plain article it is (the childSrcs.length===0 fallback already handled the no-entry case;
  // the gate is now correct-by-construction instead of a raw-regex fast-path).
  const masterTree = proc.parse(source);
  if (!hasMasterSrcEntries(masterTree)) return renderAsync(source, options);
  const childSrcs = discoverChildSrcs(masterTree);
  if (childSrcs.length === 0) return renderAsync(source, options);
  const { tree, loadedFile } = await loadAndAssembleMaster(proc, source, childSrcs);
  // The loaded map rides one VFile through BOTH runSync (library-load resolves the
  // master's bibliography; numbering and ref/cite resolution) AND stringify (the table
  // handler reads the data via the compiler, which has the VFile — handlers do not). One
  // file so config set during runSync is consistent at stringify too. #197 library + #195
  // table; mirrors the CLI build path, fetched instead of fs-read.
  const html = String(proc.stringify(proc.runSync(tree, loadedFile), loadedFile));
  routeMessagesToConsole(loadedFile); // #402: the assembled master's diagnostics → console
  return html;
}

/**
 * renderMasterAsync + write into a DOM element (the master-document counterpart of
 * renderIntoAsync). As with renderInto, the HTML is assigned via innerHTML, so call
 * executeAssets afterward to activate any injected interactive scripts.
 *
 * @param {string|Element} target - a CSS selector or an Element to fill.
 * @param {string} source - the master document's enscribe source.
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Promise<Element>} The element that was written into.
 */
export async function renderMasterIntoAsync(target, source, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) {
    throw new Error(`renderMasterIntoAsync: target not found: ${String(target)}`);
  }
  el.innerHTML = await renderMasterAsync(source, options);
  return el;
}

// ─── Chapter-as-page routing helpers (shared by the three live book routers) ─────────────────────────
// A chapter is addressed by the `?chapter=<stem>` QUERY (not the hash); the hash is purely a section
// anchor. These read the current route and intercept query-nav clicks so a chapter link is an SPA nav
// (a history entry → Back walks chapters) rather than a full reload.

/** The current route: the `?chapter=` stem (‹empty› = cover) + the `#` section hash. */
function currentRoute() {
  const search = (typeof location !== 'undefined' && location.search) || '';
  const hash = (typeof location !== 'undefined' && location.hash) || '';
  return { chapter: new URLSearchParams(search).get('chapter') || '', hash };
}

/** Bind the shared query-nav click interceptor on `root`: a `<a href="?…">` (a chapter route, the cover
 *  link, or a cross-chapter / cross-page ref) → pushState the MERGED URL — preserve the current query
 *  (notably `&edit`, and in a website `&page`), overlay the link's `page`/`chapter` (a link without
 *  `chapter` CLEARS it → the cover), carry the link's hash — then `route()`. Without this a `?chapter=`
 *  href would reload the page. `onNav` runs after the pushState (the website closes an open nav dropdown
 *  — the rider). One interceptor, both contexts: a standalone book's links carry no `page` (untouched);
 *  a website's links carry `page` (overlaid). */
function bindRouteNav(root, route, onNav) {
  if (typeof window === 'undefined' || !root || typeof root.addEventListener !== 'function') return;
  root.addEventListener('click', (ev) => {
    const a = ev.target && ev.target.closest && ev.target.closest('a[href^="?"]');
    if (!a) return;
    ev.preventDefault();
    const here = (typeof location !== 'undefined' && location.href) || 'http://localhost/';
    const link = new URL(a.getAttribute('href'), here);
    const next = new URLSearchParams((typeof location !== 'undefined' && location.search) || '');
    const pg = link.searchParams.get('page');
    if (pg != null) next.set('page', pg);                       // website: overlay the target page
    const ch = link.searchParams.get('chapter');
    if (ch) next.set('chapter', ch); else next.delete('chapter'); // a link without chapter → the cover
    if (typeof history !== 'undefined' && typeof history.pushState === 'function') {
      history.pushState(null, '', `?${next}${link.hash}`);
    }
    if (typeof onNav === 'function') onNav();
    route();
  });
}

/**
 * Mount a multi-file BOOK master as a LIVE, hash-routed reading app (live track, L2 —
 * #208). The live counterpart of `enscribe build`'s separate-pages output (P1, #205):
 * where P1 pre-bakes one standalone `.html` per chapter, this fetches the master + its
 * chapter `.emd` children, runs the cheap GLOBAL pass ONCE (numbering + cross-ref
 * resolution — L1, #204; no DOM), then renders + mounts the current VIEW via the SAME
 * renderChapter projection P1 publishes, wrapped in C's reading chrome (#202). The URL
 * hash routes between the cover and the chapters; each view is rendered LAZILY on first
 * view and cached.
 *
 * The chapter render IS renderChapter — so its content matches what P1 publishes for the
 * same chapter (the parity gate). Routing (#209): an empty/root hash lands on the COVER
 * (book-title hero + lede, the live counterpart of P1's `index.html`); a `#stem` hash is a
 * chapter route; a `#anchor` hash routes to the chapter that owns the anchor and scrolls to
 * it. Cross-chapter `<ref>`s keep a bare `#anchor` and the router resolves each to its
 * owning chapter (no cross-page rewrite needed under one mount). Every view carries a
 * return-to-cover masthead (the book title) → the cover route, so a chapter round-trips to
 * the cover exactly as a P1 chapter page round-trips to `index.html`.
 *
 * EDIT LOOP (#203, the epic payoff): pass an `editor` ADAPTER and chapter views become a
 * GitHub-style Write/Preview pane. Editing a chapter's source (debounced) re-parses ONLY
 * that chapter, re-runs the cheap global pass (so cross-chapter refs stay consistent), and
 * re-renders ONLY that chapter's preview — never the whole book. Preview-only: edits live in
 * memory and are lost on reload (no save this slice; an "unsaved" marker says so). Without an
 * `editor`, the view is read-only and byte-identical to #209. Served over HTTP (the shell
 * fetches; `file://` won't): children resolve against `document.baseURI`, like `<library src>`.
 *
 * @param {string|Element} target - a CSS selector or the Element to mount into.
 * @param {string} source - the BOOK master's enscribe source (a `<meta type=book>` with
 *   `<chapter src>` / `<preface src>` / `<appendix src>` children).
 * @param {object} [options] - pipeline options (see render()), plus the live-book options:
 * @param {object} [options.editor] - an editor ADAPTER enabling edit mode:
 *   `editor.mount(paneEl, { value, onChange }) → { destroy?() }`. The engine owns the loop
 *   (source map, debounce, rebuild, preview re-render, tabs); the adapter only creates the
 *   editing surface (e.g. a CodeMirror 6 instance) and calls `onChange(newSource)` on edits.
 * @param {number} [options.editDebounceMs=250] - debounce (ms) before a rebuild on edit.
 * @returns {Promise<Element>} the mounted element (after the initial view renders).
 */
export async function mountLiveBook(target, source, options = {}) {
  const { editor = null, editDebounceMs, ...pipelineOptions } = options;
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!root) {
    throw new Error(`mountLiveBook: target not found: ${String(target)}`);
  }
  const proc = getPipeline(pipelineOptions);
  const masterTree = proc.parse(source);   // #426: parse once — gate + discovery share it
  if (!hasMasterSrcEntries(masterTree)) {
    throw new Error('mountLiveBook: source is not a multi-file master (no `<… src>` chapter children)');
  }
  const childSrcs = discoverChildSrcs(masterTree);
  if (childSrcs.length === 0) {
    throw new Error('mountLiveBook: the master has no `<… src>` chapter children to assemble');
  }
  const { tree, loadedFile } = await loadAndAssembleMaster(proc, source, childSrcs);

  // EDIT MODE (#203): an editor adapter turns chapter views into a Write/Preview editor with
  // the incremental edit loop. Read mode below is untouched (byte-identical to #209).
  if (editor) {
    return mountEditLoop({
      root, proc, masterSource: source, childSrcs, loadedFile, editor,
      debounceMs: editDebounceMs ?? 250,
    });
  }

  // The cheap global pass, ONCE: numbers every target and resolves every cross-reference
  // over the whole book without rendering. One VFile carries the registry from this pass
  // into the harvest AND the loaded sources into each per-chapter stringify.
  const numbered = proc.runSync(tree, loadedFile);
  const ctx = { proc, file: loadedFile };
  const model = buildLiveBook({ numbered, file: loadedFile });
  // #221: inject the active book-nav CSS once (no-op at defaults — a default book adds none).
  injectBookNavStyles(model.bookNav);

  // Lazy per-view render cache: the cover (#209) and each chapter's view (content + chrome)
  // are built on first view and reused after — the authoring payoff (render only what you
  // navigate to). The cover is keyed 'cover'; chapters by their index.
  const viewCache = new Map();
  const viewFor = (key) => {
    if (!viewCache.has(key)) {
      viewCache.set(key, key === 'cover' ? renderLiveCoverView(model, ctx) : renderLiveChapterView(model, key, ctx));
    }
    return viewCache.get(key);
  };

  let currentKey = null;                          // 'cover' | a chapter index | 'not-found' | null (unmounted)
  const route = () => {
    const { chapter, hash } = currentRoute();
    const dest = resolveRoute(chapter, hash, model);
    if (dest == null) {
      // #404 routing invariant point 3: an unknown ?chapter= stem shows the graceful
      // not-found view (the shared body the website router uses) — never a silent
      // no-op/stale view, never a cover fallback. Home = the no-chapter route (the cover).
      root.innerHTML = notFoundViewHtml(`chapter "${String(chapter)}"`, '?');
      currentKey = 'not-found';
      return;
    }
    const key = dest.cover ? 'cover' : dest.index;
    if (key !== currentKey) {
      root.innerHTML = viewFor(key);
      currentKey = key;
      // #221: a <script> inserted via innerHTML does not execute, so bind back-to-top here
      // after each chapter swap (idempotent; a no-op when back-to-top is off or unbuilt).
      if (model.bookNav.backToTop) bindBackToTop();
    }
    // A section anchor: scroll to it once its owning page — a chapter OR the cover
    // (#404: front-region anchors live there) — is mounted.
    if (dest.anchor && typeof document !== 'undefined') {
      const anchorEl = document.getElementById(dest.anchor);
      if (anchorEl && typeof anchorEl.scrollIntoView === 'function') anchorEl.scrollIntoView();
    }
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('popstate', route);   // back/forward over the ?chapter= route (pushState is silent)
    window.addEventListener('hashchange', route); // a #section anchor change → scroll within the chapter
    bindRouteNav(root, route);                    // ?chapter= links are query nav → intercept (no reload)
  }
  route();                                        // initial render from the current ?chapter= + #section
  return root;
}

/** A trailing-edge debounce: coalesce a burst of calls (keystrokes) into one, `ms` after
 *  the last. `.cancel()` drops a pending call (used when navigating away mid-edit). */
function debounce(fn, ms) {
  let timer = null;
  const wrapped = (...args) => {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...args); }, ms);
  };
  wrapped.cancel = () => { if (timer != null) { clearTimeout(timer); timer = null; } };
  return wrapped;
}

/**
 * Wire the Write/Preview tab buttons under `root` (engine-managed; no inline script in the
 * fragment). Shared by the book chapter edit loop and the article edit loop — both mount the SAME
 * `data-edit-tab` / `data-edit-pane` contract (buildEditMain), so the toggle behavior is one source.
 * Clicking a tab marks it active and shows its pane, hiding the other.
 *
 * @param {Element} root - the mounted edit view (holds the `[data-edit-tab]` / `[data-edit-pane]` nodes)
 */
function wireEditTabs(root) {
  const tabs = [...root.querySelectorAll('[data-edit-tab]')];
  const panes = {
    source: root.querySelector('[data-edit-pane="source"]'),
    preview: root.querySelector('[data-edit-pane="preview"]'),
  };
  const activate = (name) => {
    for (const t of tabs) {
      const on = t.getAttribute('data-edit-tab') === name;
      t.classList.toggle('enscribe-edit-tab--active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    if (panes.source) panes.source.hidden = name !== 'source';
    if (panes.preview) panes.preview.hidden = name !== 'preview';
    // Display now defaults to PREVIEW (#editability model), so the editor (source pane) starts HIDDEN;
    // an editor mounted into a `display:none` pane (CodeMirror) measures 0 and lays out wrong until it
    // re-measures. Nudge it on the reveal — CodeMirror re-measures on a window resize — so the editor is
    // correct the first time Source opens. Harmless where the adapter self-measures or the pane was visible.
    if (name === 'source' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new window.Event('resize'));
    }
  };
  for (const t of tabs) {
    t.addEventListener('click', () => activate(t.getAttribute('data-edit-tab')));
  }
}

/**
 * Wire the single-file Save button (#351). Present only for a single-file vessel (the edit view rendered
 * it because `saveContext` was threaded in). On click: serialize the pristine vessel with the CURRENT
 * edited source (reusing the exact structure — asset-delivery mode preserved) and write it out via the
 * File System Access API (in place, overwriting a persisted handle after the first save) or a download
 * fallback. Dirty tracking: `markDirty()` (called from the editor's onChange) flips the status to
 * `unsaved`; a successful save flips it back to `saved`. A cancelled save picker (AbortError) stays dirty.
 *
 * @param {Element} root - the mounted edit view (holds `[data-edit-save]` / `[data-edit-status]`).
 * @param {{pristineHtml:string, getSource:() => string}} ctx - the vessel snapshot + current-source getter.
 * @returns {{markDirty:() => void}} the dirty-tracking hook for the edit loop's onChange.
 */
function wireEditSave(root, { pristineHtml, getSource }) {
  const btn = root.querySelector('[data-edit-save]');
  const status = root.querySelector('[data-edit-status]');
  const setStatus = (dirty) => {
    if (!status) return;
    status.textContent = dirty ? 'unsaved' : 'saved';
    status.title = dirty
      ? 'Unsaved edits — click Save to write them into this self-contained HTML file.'
      : 'Saved — the edited source is written into this self-contained HTML file.';
  };
  const markDirty = () => setStatus(true);
  if (!btn) return { markDirty };

  let fileHandle = null;   // persisted after the first File System Access save → in-place overwrite next time
  const docTitle = (typeof document !== 'undefined' && document.title) || '';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const html = serializeSavedFile(pristineHtml, getSource());
      const res = await writeSavedFile(html, { fileHandle, suggestedName: suggestedFileName(docTitle) });
      if (res.method === 'fsa' && res.handle) fileHandle = res.handle;
      setStatus(false);   // clean — the file now matches the edited source
    } catch (err) {
      // The user dismissing the save picker (AbortError) is not a failure — stay dirty, silently.
      if (!(err && err.name === 'AbortError')) {
        // eslint-disable-next-line no-console
        console.error('enscribe: save failed:', err);
      }
    } finally {
      btn.disabled = false;
    }
  });
  return { markDirty };
}

/**
 * The edit loop (#203). Given the fetched master + children, stand up the incremental
 * rebuilder over an in-memory source map and drive a hash-routed Write/Preview editor:
 * chapter views mount the editor adapter; a debounced edit re-parses only that chapter
 * (rebuilder), re-runs the cheap global pass, and re-renders ONLY the current chapter's
 * preview pane. Other chapters re-render with fresh numbers when navigated to (each
 * navigation renders from the current model — no stale cache). Preview-only: the source map
 * lives in memory; nothing is written back this slice.
 *
 * The engine owns everything except the editing surface itself: the `editor` adapter only
 * turns a mount element into an editor (`mount(el, {value, onChange}) → {destroy?()}`),
 * keeping CodeMirror (a browser-only dependency) out of the engine and out of jsdom — the
 * gate drives this loop through a fake adapter.
 */
function mountEditLoop({ root, proc, masterSource, childSrcs, loadedFile, editor, debounceMs, embedded = false, pageSlug = null, pageSrcDir = null }) {
  const loaded = loadedFile.data[ENSCRIBE_LOADED_SOURCES] || {};
  // The editable in-memory source map (structure children), seeded from the fetched sources.
  const sources = new Map();
  for (const src of childSrcs) sources.set(src, readPreloadedChild(loaded, src));

  const rebuilder = createIncrementalRebuilder({ masterSource, sources, proc, loadedSources: loaded, pageSlug });
  let { model, file } = rebuilder.rebuild();   // the initial (full) build
  let ctx = { proc, file };

  // Chapter index → its source filename. Document-order correlation: the master's `src`
  // children, in order, line up 1:1 with the reading-order chapters (one chapter file per
  // book-part). If they don't (an unusual master), the editor degrades to a read-only notice.
  const mappable = childSrcs.length === model.parts.length;
  const srcForIndex = (idx) => (mappable ? childSrcs[idx] : null);

  let editorHandle = null;     // the live adapter handle for the mounted chapter
  let currentKey = null;       // 'cover' | chapter index
  let currentIndex = -1;       // chapter index when on a chapter view, else -1

  const destroyEditor = () => {
    if (editorHandle && typeof editorHandle.destroy === 'function') {
      try { editorHandle.destroy(); } catch { /* adapter teardown is best-effort */ }
    }
    editorHandle = null;
  };

  // Re-render ONLY the current chapter's preview pane (leave the editor + tabs intact). Run the
  // page-embedded interactivity (scrollspy / on-this-page) so the preview's rail spies like read mode.
  const runPreviewAssets = () => {
    const pane = root.querySelector('[data-edit-pane="preview"]');
    if (pane) { resolveWebsitePageAssets(pane, pageSrcDir); executeAssets(pane).catch(() => {}); }  // #352: page-relative figures in a website book-page edit preview (pageSrcDir is null for a standalone book → no-op)
  };
  const updatePreview = () => {
    if (currentKey === 'cover' || currentIndex < 0) return;
    const pane = root.querySelector('[data-edit-pane="preview"]');
    if (pane) { pane.innerHTML = renderLiveChapterPreviewBody(model, currentIndex, ctx); runPreviewAssets(); }
  };

  const rebuildAndPreview = () => {
    try {
      const next = rebuilder.rebuild();
      model = next.model;
      ctx = { proc, file: next.file };
    } catch (err) {
      // always-renders: keep the loop alive; surface the error in the preview pane.
      const pane = root.querySelector('[data-edit-pane="preview"]');
      const msg = (err && err.message) || String(err);
      if (pane) pane.innerHTML = `<p class="enscribe-edit-error">live edit error: ${msg.replace(/</g, '&lt;')}</p>`;
      return;
    }
    updatePreview();
  };
  const debouncedRebuild = debounce(rebuildAndPreview, debounceMs);

  // The adapter calls this on every edit; swap the source in synchronously (so a fast
  // navigation still sees the edit) and debounce the (re-parse + global pass + re-render).
  const onEditorChange = (newSource) => {
    const src = srcForIndex(currentIndex);
    if (src == null) return;
    sources.set(src, newSource);
    debouncedRebuild();
  };

  const renderChapterAt = (idx) => {
    debouncedRebuild.cancel();
    destroyEditor();
    currentIndex = idx;
    currentKey = idx;
    root.innerHTML = renderLiveChapterEditView(model, idx, ctx);
    wireEditTabs(root);
    runPreviewAssets();
    const mountEl = root.querySelector('[data-edit-pane="source"]');
    const src = srcForIndex(idx);
    if (mountEl && src != null) {
      editorHandle = editor.mount(mountEl, { value: sources.get(src) ?? '', onChange: onEditorChange });
    } else if (mountEl) {
      mountEl.textContent = 'No editable source is mapped to this chapter (the master’s src children and the chapters are not 1:1).';
    }
  };

  const renderCover = () => {
    debouncedRebuild.cancel();
    destroyEditor();
    currentIndex = -1;
    currentKey = 'cover';
    root.innerHTML = renderLiveCoverView(model, ctx);
  };

  const route = () => {
    const { chapter, hash } = currentRoute();
    const dest = resolveRoute(chapter, hash, model);
    if (dest == null) {
      // #404 point 3: unknown ?chapter= → the graceful not-found view (see the read router).
      debouncedRebuild.cancel();
      destroyEditor();
      currentIndex = -1;
      currentKey = 'not-found';
      root.innerHTML = notFoundViewHtml(`chapter "${String(chapter)}"`, '?');
      return;
    }
    if (dest.cover) {
      if (currentKey !== 'cover') renderCover();
    } else if (currentKey !== dest.index) {
      renderChapterAt(dest.index);
    }
    // #404: cover-owned anchors (front-region content) scroll too.
    if (dest.anchor && typeof document !== 'undefined') {
      const anchorEl = document.getElementById(dest.anchor);
      if (anchorEl && typeof anchorEl.scrollIntoView === 'function') anchorEl.scrollIntoView();
    }
  };

  // EMBEDDED (the page-edit unification): when mountLiveWebsite mounts a book PAGE in edit mode it
  // drives the `?page=`/`?chapter=`/`#hash` routing itself (ONE router), so the loop must NOT add its
  // own listeners. Embedded, it exposes `route()` (the host calls it on a `?chapter=`/`#section` change
  // to switch the editable chapter) and `teardown()` (cancel the pending rebuild + destroy the editor
  // when the host navigates away). Standalone (the default) keeps its OWN listeners — popstate +
  // hashchange + the query-nav interceptor (a `?chapter=` rail link is query nav, not a hash change) —
  // and returns the mount element.
  const teardown = () => { debouncedRebuild.cancel(); destroyEditor(); };
  if (!embedded && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('popstate', route);
    window.addEventListener('hashchange', route);
    bindRouteNav(root, route);
  }
  route();
  return embedded ? { root, route, teardown } : root;
}

/**
 * Mount a single-document (ARTICLE) master as a LIVE view (#216) — the simple case the book live
 * mount (mountLiveBook) is the complex counterpart of. An article is ONE unit: there is no cover,
 * no chapter rail, no hash routing, no per-chapter lazy cache — a single render resolves every
 * cross-reference (the standard pipeline's global pass), so the document just renders into the mount.
 *
 *   READ mode → the assembled article, mounted (renderMasterAsync — the SAME path the non-live
 *     renderMasterIntoAsync takes: discover any `<section src>` children, fetch, assemble, render).
 *   EDIT mode (an `editor` adapter) → the #211 Write/Preview loop collapsed to one editable unit:
 *     the master source. Editing it (debounced) re-assembles + re-renders the WHOLE article and
 *     refreshes the Preview pane; references within it stay correct because the single global pass
 *     renumbers + re-resolves on every edit. Preview-only (edits live in memory; no save this slice).
 *
 * Served over HTTP (the shell fetches; `file://` won't): any `<section src>` children resolve
 * against `document.baseURI`, like `<library src>`. A single-file article (no `src` children) needs
 * no fetch beyond the master itself.
 *
 * @param {string|Element} target - a CSS selector or the Element to mount into.
 * @param {string} source - the ARTICLE master's enscribe source (a `<meta type=article>` — or an
 *   absent/other type, which the pipeline structures as an article — optionally with `<section src>`).
 * @param {object} [options] - pipeline options (see render()), plus the live edit options:
 * @param {object} [options.editor] - an editor ADAPTER enabling edit mode (see mountLiveBook).
 * @param {number} [options.editDebounceMs=250] - debounce (ms) before a re-render on edit.
 * @returns {Promise<Element>} the mounted element (after the article renders).
 */
export async function mountLiveArticle(target, source, options = {}) {
  const { editor = null, editDebounceMs, saveContext = null, ...pipelineOptions } = options;
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!root) {
    throw new Error(`mountLiveArticle: target not found: ${String(target)}`);
  }

  // READ mode: the assembled article, mounted. renderMasterAsync handles both a multi-file article
  // (discover + fetch `<section src>` children, then assemble) and a single-file article (no `src`
  // → the ordinary async render) — the simple case needs no model, no router, no chrome.
  if (!editor) {
    root.innerHTML = await renderMasterAsync(source, pipelineOptions);
    return root;
  }

  // EDIT mode (#216): pre-fetch any `<section src>` children (+ the master's own `<library src>` /
  // `<table src>`) ONCE so each edit re-renders synchronously from memory, then run the single-unit
  // edit loop. (A single-file article fetches nothing here — childSrcs is empty.)
  const proc = getPipeline(pipelineOptions);
  const childSrcs = discoverChildSrcs(proc.parse(source));   // #426: structural discovery
  const { loadedFile } = await loadAndAssembleMaster(proc, source, childSrcs);
  return mountArticleEditLoop({
    root, proc, masterSource: source, loadedFile, editor,
    debounceMs: editDebounceMs ?? 250, saveContext,
  });
}

/**
 * The ARTICLE edit loop (#216) — the single-unit collapse of the book's incremental edit loop
 * (mountEditLoop). There is one editable source (the master) and one rendered unit (the article),
 * so there is no chapter rail, no routing, no per-chapter cache, and no source→chapter mapping:
 * editing the master re-assembles + re-renders the whole article into the Preview pane.
 *
 * The render path is the SAME assemble → global pass → stringify that renderMasterAsync runs (minus
 * the fetch — children ride in memory on `loaded`), so the preview matches the published article and
 * the single global pass keeps every in-article cross-reference correct after each edit.
 */
function mountArticleEditLoop({ root, proc, masterSource, loadedFile, editor, debounceMs, saveContext = null }) {
  const loaded = loadedFile.data[ENSCRIBE_LOADED_SOURCES] || {};
  let currentSource = masterSource;   // the single editable unit (the master)

  // Synchronous render of the CURRENT source → cheap global pass → stringify, byte-identical to the
  // READ render (renderMasterAsync), so the preview matches the published article. It mirrors
  // renderMasterAsync's OWN top-level structural branch: a multi-file article (a `<section src>`
  // entry) ASSEMBLES its in-memory children first (the same assembler read mode uses); a single-file
  // article renders the source DIRECTLY — NOT through the assembler — so deferred placement markers
  // (`<toc>` / `<endnotes>` / `<bibliography>`) survive exactly as read mode's render() leaves them
  // (the assembler drops them; the direct render does not). A fresh VFile each render (the numbering
  // registry must not carry over).
  const renderArticle = (src) => {
    const file = { data: { [ENSCRIBE_LOADED_SOURCES]: loaded } };
    // #426: parse once, then branch on the parsed structure. A fenced src-form in the editor
    // buffer is literal text and takes the direct-render branch (which preserves deferred
    // `<toc>`/`<endnotes>`/`<bibliography>` markers the assembler would drop) — so typing a
    // documentation example never flips a single-file article onto the assembly path.
    const parsed = proc.parse(src);
    let masterServed = false;
    const tree = hasMasterSrcEntries(parsed)
      ? assembleMasterDocument({
          source: src,
          parse: (s) => { if (!masterServed && s === src) { masterServed = true; return parsed; } return proc.parse(s); },
          resolve: (rel) => rel,
          readFile: (s) => readPreloadedChild(loaded, s),
          warn: () => {},
        })
      : parsed;
    return String(proc.stringify(proc.runSync(tree, file), file));
  };

  const saveable = !!saveContext;
  root.innerHTML = renderLiveArticleEditView(renderArticle(currentSource), undefined, saveable);
  wireEditTabs(root);
  // #351 — a single-file vessel serializes edits back into itself; wire the Save button + dirty tracking.
  const save = saveable
    ? wireEditSave(root, { pristineHtml: saveContext.pristineHtml, getSource: () => currentSource })
    : null;
  // Run the page-embedded interactivity (scrollspy / on-this-page) in the preview so its rail spies
  // exactly as read mode (executeAssets runs the page's scripts; innerHTML does not).
  const runPreviewAssets = () => {
    const pane = root.querySelector('[data-edit-pane="preview"]');
    if (pane) executeAssets(pane).catch(() => {});
  };
  runPreviewAssets();

  // Re-render ONLY the preview pane (leave the editor + tabs intact). always-renders: a mid-edit
  // parse/render error surfaces in the pane, never breaking the loop.
  const updatePreview = () => {
    const pane = root.querySelector('[data-edit-pane="preview"]');
    if (!pane) return;
    try {
      pane.innerHTML = renderArticle(currentSource);
      runPreviewAssets();
    } catch (err) {
      const msg = (err && err.message) || String(err);
      pane.innerHTML = `<p class="enscribe-edit-error">live edit error: ${msg.replace(/</g, '&lt;')}</p>`;
    }
  };
  const debouncedRender = debounce(updatePreview, debounceMs);

  const mountEl = root.querySelector('[data-edit-pane="source"]');
  if (mountEl) {
    // The adapter reports every edit; swap the source in synchronously and debounce the re-render.
    editor.mount(mountEl, {
      value: currentSource,
      onChange: (newSource) => { currentSource = newSource; if (save) save.markDirty(); debouncedRender(); },
    });
  }
  return root;
}

/**
 * mountLiveBook starting from a master URL: fetch the master source, then mount. The
 * one-call bootstrap an app-shell `index.html` uses
 * (`enscribe.mountLiveBookFromUrl('#root', 'master-book.emd')`). The master URL resolves
 * against the page; its children resolve against `document.baseURI` inside mountLiveBook.
 *
 * @param {string|Element} target - a CSS selector or the Element to mount into.
 * @param {string} url - the master document's URL (relative to the page).
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Promise<Element>} the mounted element.
 */
export async function mountLiveBookFromUrl(target, url, options = {}) {
  const source = await fetchMasterSource(url, 'mountLiveBookFromUrl');
  return mountLiveBook(target, source, options);
}

/**
 * Fetch a master document's source text by URL (page-relative, like an `index.html` bootstrap uses).
 * Throws a `who`-labeled error on a non-OK response. Shared by mountLiveBookFromUrl and the unified
 * mountLiveShell so the one-call bootstraps fetch the master the same way.
 */
async function fetchMasterSource(url, who) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${who}: could not fetch master "${url}": HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}`);
  }
  return res.text();
}

/** Read the `data-enscribe-edit` host switch off a mount element: present = on, UNLESS the
 *  value is an explicit off (`false` / `off` / `0`). Absent (or no element) = off. */
function editAttrOn(el) {
  const v = el && el.dataset ? el.dataset.enscribeEdit : undefined;
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s !== 'false' && s !== 'off' && s !== '0';
}

/**
 * Read a master's document class from its `<meta type>` — the cheap pre-structuring read the shell
 * dispatch needs. Delegates the rule to the shared classifier (1-C from #316); the book/website/
 * article DISPATCH (mountLiveShell, below) stays local — that is a routing concern, not classification.
 * Absent/unknown falls to `article` (the classifier's validated fallback) and a `book-part` master
 * routes via the dispatch's `else` (the article path), both as before — only an explicit `type=book`
 * / `type=website` routes to the book / website mount. Parses the source only (no pipeline run).
 *
 * @param {import('unified').Processor} proc - a configured pipeline (its `.parse`)
 * @param {string} source - the master document's enscribe source
 * @returns {string} the document class: 'article' | 'book' | 'book-part' | 'website'
 */
function masterType(proc, source) {
  return classifyDocType(proc.parse(source)).type;
}

// #352: a website page's figure assets live in the page's OWN source dir (`<src>/elephant.jpg`), and the
// live shell is a SINGLE document at the site root — so a rendered `<img src="elephant.jpg">` (emitted
// page-relative, byte-identical to the static build) resolves against the shell root and 404s. Resolve the
// injected page CONTENT's relative asset URLs against the page's source dir, so the per-folder-deployed
// asset loads (build-live.js copies each page's assets under `<src>/`, mirroring the static tree + the
// source). SCOPED to the content region only — nav / chrome / engine / CSS stay untouched (a document
// `<base>` was rejected: it re-targets the `?page=` nav hrefs and breaks middle-click / open-in-new-tab).
// Parity holds on the terms render-parity.md states — display number + scheme-normalized owner, never the
// raw href — so resolving an asset src (a resource addressed via each surface's scheme) is within contract.
function resolveWebsitePageAssets(container, pageSrcDir) {
  if (!pageSrcDir || !container || typeof container.querySelectorAll !== 'function') return;
  const base = `${String(pageSrcDir).replace(/\/+$/, '')}/`;
  // A PAGE-RELATIVE reference gets the page-dir prefix; a scheme (data:/http:), a root or protocol-relative
  // path, an in-page `#anchor`, a `?page=` route/ref query, or an unresolved `@id` is left exactly as
  // authored. Covers EVERY page-relative content reference the copy side (pageDirAssets) moves per-folder —
  // a figure `<img src>`, a `<source src>`, a local `<a href>` download, an inline-SVG `<image>/<use href>`
  // — so the live content matches the static per-page-dir layout (#352). `?`/`#` are skipped so a content
  // cross-page `<ref>` (`?page=owner#x`) and an in-page anchor stay base-agnostic (never a document `<base>`).
  const NON_RELATIVE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|[#?]|@)/i;
  for (const el of container.querySelectorAll('[src], [href]')) {
    for (const attr of ['src', 'href']) {
      const raw = el.getAttribute(attr);
      if (raw == null || NON_RELATIVE.test(raw)) continue;
      el.setAttribute(attr, base + raw);
    }
  }
}

/**
 * The ONE configurable live-shell entry (#213/#216): read↔edit from a HOST-side switch, dispatching
 * book ↔ article by the master's own `<meta type>`. Editability is a property of the DEPLOYMENT, not
 * the document — the same `.emd` is read-only when published and editable while authored, the
 * difference being WHERE it is served. And mechanically only the host can turn editing on: CodeMirror
 * loads host-side by design (#211, kept out of the engine bundle), so a document `<config>` flag
 * could not load it. So the switch lives here, where the editor is loaded — never in the document.
 *
 * The switch (one knob, two equivalent forms):
 *   - `options.edit` (explicit boolean) wins when provided — the testable core; else
 *   - the `data-enscribe-edit` attribute on the mount element (presence = on; `="false"`/`"off"`/
 *     `"0"` = off) — a declarative, per-mount, build.js-friendly knob with no global mutable state.
 *
 * DISPATCH (#216 / #246 S2c): the shell fetches the master ONCE, reads `<meta type>` (masterType), and
 * routes 3-way — a book → mountLiveBook (unchanged), a website → mountLiveWebsite (#246), else an
 * article → mountLiveArticle. All three receive the same `editor`/`editDebounceMs`. The detection is at
 * RUNTIME here, so the emitter that writes the shell stays pure and type-agnostic (no emit-time master
 * read): one emitted shell drives any kind of master, and a document that changes type never needs a re-emit.
 *
 * ON → `editorFactory()` is awaited to build the editor adapter (the host loads CodeMirror THERE —
 * lazily, so READ mode never loads it) and the document mounts in edit mode (#211's `{ editor }`).
 * OFF → it mounts in read mode — byte-identical to the read shell (#209 book / the article render).
 *
 * @param {string|Element} target - a CSS selector or the Element to mount into.
 * @param {string} url - the master's URL (relative to the page) — a book, website, or article master.
 * @param {object} [options] - mountLiveBook / mountLiveArticle options (see render()), plus the switch:
 * @param {boolean} [options.edit] - explicit edit flag; overrides the `data-enscribe-edit` attribute.
 * @param {() => (object|Promise<object>)} [options.editorFactory] - builds the editor adapter
 *   (#211 `editor`: `mount(el,{value,onChange}) → {destroy?()}`) when editing is on. Called ONLY
 *   then, so the host can lazy-load CodeMirror and read mode never pulls it in.
 * @returns {Promise<Element>} the mounted element.
 */
/**
 * Mount a multi-file WEBSITE master as a LIVE, `?page=`-routed site (#246 S2a). A website is
 * "the book with pages instead of chapters": persistent chrome (top bar / dropdowns / sidebar) over a
 * swapped content region, with a `?page=slug` History router (back/forward) in place of the book's hash
 * router. This slice handles EXTERNAL `<item src>` pages (inline `<item | Title>` body pages are a
 * documented follow-on).
 *
 * Composition is the SHARED browser-pure core composeSiteRegistry (#300/#320 — the SAME core the static
 * build calls): Pass 1 harvests the S1 nav model (the page list), then each external page is fetched FRESH
 * (base-relative) and numbered in its OWN native scope, merged into ONE site cross-ref registry — a book
 * page keeps BOOK numbering ("figure 2.1"), an article its own — so a cross-page `<ref>` resolves to the
 * target's native number, its href rewritten to `?page=owner#anchor`. (The page-scope flatten that once
 * assembled every page under a synthetic `<book>` was DELETED by #320; there is no flatten.)
 *
 * READ mode renders each page natively (article → article, book → a book sub-view with its own `#hash`
 * chapter routing). EDIT mode (an `editor` adapter) gives the page a Write/Preview pane: an article edits
 * as ONE unit, a book PER-CHAPTER (the same machinery the standalone book mount uses) — route() dispatches
 * on page TYPE exactly as the read path does. Persistent chrome + a swapped content region: `route()` swaps
 * ONLY the content region, never `root`.
 *
 * @param {string|Element} target - a CSS selector or the Element to mount into.
 * @param {string} source - the website master's enscribe source (`<meta type=website>` + `<nav>`).
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Promise<Element>} the mounted element (after the initial view renders).
 */
export async function mountLiveWebsite(target, source, options = {}) {
  // #246 S2c: an `editor` adapter enables the per-page edit loop — the CURRENT page edits inside the
  // persistent chrome (only [data-enscribe-content] becomes the Write/Preview region). No editor →
  // read mode, byte-identical to S2b.
  const { editor = null, editDebounceMs, ...pipelineOptions } = options;
  const debounceMs = editDebounceMs ?? 250;
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!root) throw new Error(`mountLiveWebsite: target not found: ${String(target)}`);
  const proc = getPipeline(pipelineOptions);

  // Pass 1 (cheap — the master is just `<meta>` + `<nav>`): harvest the S1 nav model (page list).
  // Read the brand (<meta> title + icon) and the site-wide <footer src> off the master BEFORE
  // runSync mutates it.
  const masterTree = proc.parse(source);
  const masterChildren = masterTree.children ?? [];
  const metaNode = masterChildren.find((n) => isEnscribeTag(n, 'meta'));
  const footerNode = masterChildren.find((n) => isEnscribeTag(n, 'footer') && n.kwargs?.src);
  const brandIcon = metaNode?.kwargs?.icon ?? null;
  const navFile = { data: {} };
  proc.runSync(masterTree, navFile);
  const navModel = navFile.data[ENSCRIBE_NAV_MODEL] ?? { entries: [] };
  // #246 S1.5: the left sidebar is a master opt-in (<config sidebar>), default OFF. The top bar is the
  // website's primary nav; the sidebar is a second surface a larger site asks for. Read off the master's
  // config (config-discovery populated it during the pass-1 runSync above), like the book's nav config.
  const showSidebar = readConfigBool(navFile.data[ENSCRIBE_CONFIG], 'sidebar', false);
  const allPages = flattenNavPages(navModel.entries);
  // #419: an inline `<item | Title>` page is the zero-length-splice case (master-document.md §"Scope note:
  // websites") — a legal page whose BODY is its content, in-hand, with no `src` to fetch. It renders through
  // the SAME source-less tree seam the static build uses (renderArticleTree-shaped: the `pd.tree` render
  // branch below), numbered by composeSiteRegistry's own `tree ?? parse(source)` branch — no live-only path.
  // So it is no longer filtered out and skipped; it flows through the pipeline like any other page (its
  // `fetched` entry short-circuits the fetch, and its `pageData` entry carries the body tree).

  // EAGER PRE-FETCH (the live #300, step 2 — #324). The composition core is SYNCHRONOUS but browser I/O is
  // async, so all fetching happens HERE, up front: every external page source, and for a BOOK page its
  // `<chapter src>` children too (loadAndAssembleMaster — the new fetch level, the #314 substance). For a
  // large site this is the eager-fetch cost: a later progressive/lazy-fill follow-up (noted, not solved here).
  const baseUrl = (typeof document !== 'undefined' && document.baseURI) || undefined;
  // #405 (always-renders at website scale): each page settles INDEPENDENTLY — one bad page
  // must never take down the whole mount. A failed fetch/parse records {p, error}; the model
  // marks the slug as an error page, the router renders the shared failed-page view for it,
  // and every other page mounts normally.
  const fetched = await Promise.all(allPages.map((p) => (async () => {
    if (p.src == null) return { p, inline: true };   // #419: an inline page's body is in-hand — nothing to fetch
    // #331: each website page is deployed in its OWN directory — master at `<src>/index.emd`, its book
    // children BESIDE it (build-live.js). Fetch the master at `<src>/index.emd`, and resolve a book page's
    // chapter children MASTER-RELATIVE (`new URL(childSrc, masterUrl)` → `<src>/<childSrc>`) via the
    // loadAndAssembleMaster `loadSource` seam — NOT against `document.baseURI` (the flat `/live/` root, where
    // two books' same-named `frameables.emd` collided and served the wrong book). Same `new URL(rel, base)`
    // rule everywhere; no fork in fetchSourceText. (Figure ASSETS are now deployed PER-FOLDER under each
    // page's `<src>/` (build-live.js), and `resolveWebsitePageAssets` resolves a page's `<img src>` against
    // that dir at inject time — so the two books' distinct same-named assets stay distinct, #352.)
    const masterPath = `${p.src}/index.emd`;
    const masterUrl = baseUrl ? new URL(masterPath, baseUrl) : undefined;
    const src = await fetchSourceText(masterPath, baseUrl);
    const isBook = classifyDocType(proc.parse(src)).type === 'book';
    // A book page's chapter children are fetched up front; we cache the LOADED child sources (not an
    // assembled tree) and re-assemble a FRESH tree per use — runSync mutates the tree in place, and the
    // book is numbered TWICE (Phase 1 native, then Phase 2 over the seed), so a shared tree would bake
    // Phase 1's results (incl. unresolved cross-page refs) into Phase 2. Same as the static build, which
    // re-reads + re-assembles per phase. The children load MASTER-RELATIVE (the loadSource seam).
    // #424: fetch-assemble for ANY src-bearing page (a book's chapter children, or an
    // article page carrying <include>/src entries — the include closure rides
    // loadAndAssembleMaster). A book keeps only the loaded map (it re-assembles a fresh
    // tree per phase); an ARTICLE page keeps the assembled tree itself and rides the
    // same tree seam the interstitial/inline pages use (static parity, #404 marker 7).
    let loaded = null;
    let assembled = null;
    const srcTree = proc.parse(src);   // #426: one parse — structural gate + discovery
    if (hasMasterSrcEntries(srcTree)) {
      const r = await loadAndAssembleMaster(proc, src, discoverChildSrcs(srcTree),
        (childSrc) => fetchSourceText(childSrc, masterUrl), masterPath);
      loaded = r.loadedFile.data[ENSCRIBE_LOADED_SOURCES];
      if (!isBook) assembled = r.tree;
    }
    return { p, src, isBook, loaded, assembled };
  })().catch((err) => {
    console.warn(`[enscribe] website page "${p.slug ?? p.src}" failed to load: ${err.message} — the rest of the site mounts; this page shows the failed-page view (#405)`);
    return { p, error: err.message };
  })));
  // Assemble a book master to a FRESH pre-runSync tree from its cached (pre-fetched) children — re-parse
  // only, no re-fetch. resolve is identity (the loaded map is keyed by the raw child src).
  const assembleBookTree = (src, loaded) => assembleMasterDocument({
    source: src, parse: (s) => proc.parse(s), resolve: (rel) => rel,
    readFile: (s) => readPreloadedChild(loaded, s), warn: () => {},
  });

  // SLUG IDENTITY (#318): the live path now holds each page's source, so resolvePageSlug reads its
  // `<meta slug>` / `<meta title>` (tiers 1-2), not just the nav title (tier 3) the nav-model pass saw.
  // Remap the nav model's page.slug to the resolved identity (so the chrome links AND the router key on the
  // same slug), exactly as the static build does; collisions always-render (allocatePageSlug).
  const dirOfSrc = (s) => { const i = String(s).lastIndexOf('/'); return i < 0 ? '' : String(s).slice(0, i); };
  const sourceBySlug = new Map();              // slug → source TEXT (the editor's value in edit mode; no re-fetch)
  const loadedBySrc = new Map();               // a book page's src → its cached (pre-fetched) child sources
  const usedSlugs = new Set();
  const pageData = fetched.map(({ p, src, isBook, loaded, assembled, error, inline }) => {
    // #405: a page that failed to fetch/parse becomes an ERROR PAGE in the model — its nav
    // entry stays (the universal shell keeps routing), the router renders the shared
    // failed-page view for its slug, and it is excluded from Phase-1 composition.
    if (error != null) {
      const slug = allocatePageSlug(p.slug || 'page', false, usedSlugs,
        (kind, s) => console.warn(`enscribe website: page slug collision (${kind}: "${s}")`));
      p.slug = slug;
      return { slug, isError: true, errorReason: error, title: p.title || slug };
    }
    // #419: an inline `<item | Title>` page — the zero-length-splice case. Its authored body IS its
    // content (no source file). Parity with the static build's #417 handling (static-website.js): the
    // tree is the body, the slug comes from the nav title (tier 3 — an inline body carries no <meta>),
    // isBook is false. composeSiteRegistry numbers `pd.tree`; the render stringifies `pd.tree` — the
    // SAME source-less seam an external page's marker-7 interstitial tree already uses. No live-only path.
    if (inline) {
      const { slug: baseSlug, pinned, title } = resolvePageSlug({ source: '', navTitle: p.title || p.slug, src: null });
      const slug = allocatePageSlug(baseSlug, pinned, usedSlugs,
        (kind, s) => console.warn(`enscribe website: page slug collision (${kind}: "${s}"${kind === 'pinned' ? ' — pinned slugs are not renamed; the pages collide on ?page=' : ''})`));
      p.slug = slug;
      return {
        resolved: { sourcePath: `${slug}.emd`, pageDir: '' }, source: '',
        tree: { type: 'root', children: p.body ?? [] }, slug, isBook: false,
        title: title || p.title || slug, isDerived: !pinned,
      };
    }
    const { slug: baseSlug, pinned, title } = resolvePageSlug({ source: src, navTitle: p.title || p.slug, src: p.src });
    // #403 (deferred row): the live surface now passes the allocator's collision callback —
    // a pinned <meta slug> duplicate warns instead of silently colliding (static parity).
    const slug = allocatePageSlug(baseSlug, pinned, usedSlugs,
      (kind, s) => console.warn(`enscribe website: page slug collision (${kind}: "${s}"${kind === 'pinned' ? ' — pinned slugs are not renamed; the pages collide on ?page=' : ''})`));
    p.slug = slug;                             // remap the nav model entry → the chrome's ?page= links use it
    sourceBySlug.set(slug, src);
    if (loaded) loadedBySrc.set(p.src, loaded);
    // #404 marker 7 (live surface, mirroring the static build): interstitial master content
    // captured by the website structurer as the entry's `body` JOINS this page — spliced as
    // trailing content of the page's tree, so it numbers within the page (Phase 1 consumes
    // this tree) and renders on it (renderArticleInto consumes it too, the same tree seam
    // the inline-page path uses). No interstitial → tree unset → source path, byte-identical.
    let tree = assembled;   // #424: an article page's include-spliced tree, when present
    if (!isBook && p.body && p.body.length > 0) {
      if (!tree) tree = proc.parse(src);
      tree.children.push(...p.body);
    } else if (isBook && p.body && p.body.length > 0) {
      // Parity with the static build: a book page's insertion point for trailing article-level content
      // is not yet defined, so flag rather than silently drop (the static builder warns here too — this
      // mirrors it on the live surface so content loss is never silent on either).
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`enscribe website: interstitial content after a book <item src="${p.src}"> is captured but not yet rendered — the book-page insertion point is a follow-on (#404 marker 7 covers article pages)`);
      }
    }
    // title + isDerived back the authored `<a {slug}>` auto-label + derived-slug warning (#318), computed the
    // SAME way the static build does (resolvePageSlug's title, else the nav title; un-pinned ⇒ derived).
    return { resolved: { sourcePath: p.src, pageDir: dirOfSrc(p.src) }, source: src, tree, slug, isBook, title: title || p.title || slug, isDerived: !pinned };
  });

  // PHASE 1 — number each page NATIVELY (article as an article; a book as a book, chapters intact), harvest,
  // and MERGE one site cross-ref registry + the read-through seed: the SAME browser-pure composition core the
  // static build calls (master-document/compose-site.js, #324 step 1). The book branch's assembleAndNumber
  // re-assembles a fresh tree from the cached children (the fetch-based reader where the static caller fs-reads).
  const { idToOwner, seedRegistry } = composeSiteRegistry({
    pages: pageData.filter((pd) => !pd.isError),
    destPrefixOf: () => '',                    // the live owner→URL is the owner KEY (?page=slug), not a path prefix
    buildPipeline: (opts) => getPipeline({ ...pipelineOptions, ...opts }),
    assembleAndNumber: ({ source, sourcePath, pipeOpts }) => {
      const loaded = loadedBySrc.get(sourcePath);
      const f = { data: { [ENSCRIBE_LOADED_SOURCES]: loaded } };       // carry the book's loaded library/table sources
      return { numbered: getPipeline({ ...pipelineOptions, ...pipeOpts }).runSync(assembleBookTree(source, loaded), f), file: f };
    },
    warn: (m) => { if (typeof console !== 'undefined' && console.warn) console.warn(`enscribe website: ${m}`); },
  });
  const firstSlug = pageData[0]?.slug ?? null;
  const pageBySlug = new Map(pageData.map((pd) => [pd.slug, pd]));

  // The live cross-page REF resolver (#318 refs; slug-LINKS are a follow-on slice). A `<ref>`'s owner key →
  // the target's PAGE route: a ref whose owner is ANOTHER page becomes `?page=slug[&chapter=stem]#anchor`;
  // an intra-page / same-book-chapter ref stays a bare `#anchor` (live-book's own cross-chapter rewrite
  // handles same-book chapter switches; the in-chapter ones scroll). The owner key for a book chapter is
  // `slug::<stem>.html` (compose-site.js) — so a cross-page ref to a BOOK section carries the owning
  // CHAPTER too (chapter-as-page: the target book's router reads `?chapter=`, the hash is purely the
  // section). An article owner is a bare `slug` (no `::`); a book COVER owner is `slug::index.html` (no
  // chapter). Reuses rewriteCrossPageHrefs (the SAME browser-safe string rewriter the static build uses).
  const pageSlugOfOwner = (owner) => String(owner).split('::')[0];
  // owner → the cross-page route TAIL after the slug: `&chapter=<stem>` for a book chapter, '' otherwise.
  const chapterQueryOfOwner = (owner) => {
    const fname = String(owner).split('::')[1];
    if (!fname || fname === 'index.html') return '';
    return `&chapter=${fname.replace(/\.html$/, '')}`;
  };
  const resolveRefs = (html, thisSlug) => rewriteCrossPageHrefs(html, null, {
    ownerOf: (anchor) => { const o = idToOwner.get(anchor); return o != null && pageSlugOfOwner(o) !== thisSlug ? o : null; },
    hrefFor: (owner, anchor) => `?page=${pageSlugOfOwner(owner)}${chapterQueryOfOwner(owner)}#${anchor}`,
  });
  // The authored `<a {slug}>` LINK resolver (#318) — injected on each page's file.data so the engine resolves
  // the `<a data-page-slug>` markers IN-TREE at render time (resolvePageSlugLinksInTree), the SAME mechanism
  // the static build uses. Only the URL scheme differs (the `?page=` route vs the static `.html` path,
  // website.md): a resolvable slug → `?page=slug` (+ the target's title when the authored label is empty); a
  // missing slug → DEGRADE (the engine drops the href + flags `ref-error`, the label stays) with a console
  // warning; a derived (un-pinned) slug → warn. NO parse5 — the same browser-safety the ref rewriter keeps.
  const warnLink = (m) => { if (typeof console !== 'undefined' && console.warn) console.warn(`enscribe website: ${m}`); };
  const makePageLinkResolver = (currentSlug) => (slug, { empty }) => {
    const pd = pageBySlug.get(slug);
    if (!pd) {
      warnLink(`"${currentSlug}": <a ${slug}> → no page has slug "${slug}" — link rendered inert (always-renders)`);
      return { broken: true, label: empty ? slug : undefined };
    }
    if (pd.isDerived) warnLink(`"${currentSlug}": <a ${slug}> resolves to a DERIVED slug — pin <meta slug="${slug}"> so a title rename does not silently break the link`);
    return { href: `?page=${slug}`, label: empty ? pd.title : undefined };
  };
  // Resolve `?page=` → a page (empty → the first page; unknown → not-found).
  const resolvePage = (search) => {
    const requested = new URLSearchParams(search || '').get('page');
    if (!requested) return { slug: firstSlug, notFound: false };
    return pageBySlug.has(requested) ? { slug: requested, notFound: false } : { slug: requested, notFound: true };
  };

  // The site-wide <footer src>: fetched ONCE (base-relative), rendered OUTSIDE the content region
  // so it survives a page swap. Rendered minimally (its inner article-shell is a later cosmetic
  // refinement); a fetch failure degrades to no footer.
  let footerHtml = '';
  if (footerNode) {
    try {
      const fsrc = await fetchSourceText(footerNode.kwargs.src, baseUrl);
      footerHtml = `<footer class="enscribe-site-footer">${String(proc.stringify(proc.runSync(proc.parse(fsrc), { data: {} })))}</footer>`;
    } catch (err) {
      // #405: a failed footer degrades VISIBLY in its slot, with a console account — never a
      // silent absence.
      console.warn(`enscribe website: <footer src> failed to load: ${err.message}`);
      footerHtml = `<div class="enscribe-footer-error" role="alert">⚠ footer failed to load</div>`;
    }
  }

  // Persistent shell built ONCE from the nav TREE (with groups): the top bar (brand + nav, a
  // <nav-group> → a dropdown), the sidebar (the full tree via buildList), and the footer.
  // route() swaps ONLY `[data-enscribe-content]`, so the chrome survives every page swap.
  injectWebsiteNavStyles();
  // Converge the live shell onto the STATIC website shell: inject the static `.content` region CSS
  // (WEBSITE_SHELL_CSS) so a live page's content lays out identically — a bare article constrained to
  // the reading column, a book/config-toc page carrying its OWN layout untouched. The shell is now
  // nav + content (the page owns its layout); no shell rail, no content-column grid. Idempotent (id).
  if (typeof document !== 'undefined' && !document.getElementById('enscribe-website-shell-style')) {
    const s = document.createElement('style');
    s.id = 'enscribe-website-shell-style';
    s.textContent = WEBSITE_SHELL_CSS;
    document.head.appendChild(s);
  }
  const brand = { title: extractDocumentTitle(source) || '', icon: brandIcon, firstSlug };
  // #392 chrome corner (the live SPA): Edit toggle (flips the same `?edit` switch the URL hack uses —
  // which keeps working) + the GitHub mark when the master carries `<config repo=…>`. The corner is
  // the shell's action home (#398's settings gear joins it here).
  const repoUrl = navFile.data[ENSCRIBE_CONFIG]?.get?.('repo') ?? null;
  const editOn = typeof location !== 'undefined' && new URLSearchParams(location.search).has('edit');
  root.innerHTML = composeWebsiteShell({
    topBar: buildWebsiteTopBar(brand, navModel.entries, buildShellActions({ edit: true, editOn, repoUrl })),
    sidebar: showSidebar ? buildWebsiteSidebar(navModel.entries) : '',
    footer: footerHtml,
  });
  bindShellEditToggle(root);
  if (root.classList && typeof root.classList.add === 'function') root.classList.add('enscribe-site');
  // The top-bar dropdown opens natively (<details>/<summary>); wire the missing dismissal — close on
  // outside-click + Escape — once for the persistent chrome. Document-level + idempotent, so it stays live
  // across every content swap and never double-binds (the static shell gets the same via WEBSITE_DROPDOWN_JS).
  bindWebsiteNavDismiss();
  const contentRegion = root.querySelector('[data-enscribe-content]');

  // Per-page render (website.md Phase 2, lazy). An ARTICLE page renders its source over a FRESH read-through
  // seed (its own numbering shadows; a cross-page anchor reads the merged registry's NATIVE number), cached
  // (hash-independent). A BOOK page renders as a native book SUB-VIEW (#314): re-number the pre-assembled
  // book over the seed → buildLiveBook → render the chapter/cover the `?chapter=` selects (resolveRoute),
  // each chapter cached. executeAssets runs on every FIRST build (innerHTML does not run <script>).
  const articleCache = new Map();              // slug → rendered article HTML (hash-independent)
  const executed = new Set();
  let currentBook = null;                      // { pd, model, ctx, chapterCache, currentKey } when the active READ page is a book
  let currentBookEdit = null;                  // the embedded mountEditLoop handle when the active EDIT page is a book

  const renderArticleInto = (pd) => {
    if (!articleCache.has(pd.slug)) {
      const f = { data: { ...seedRegistry(), [ENSCRIBE_PAGE_LINK_RESOLVER]: makePageLinkResolver(pd.slug) } };
      articleCache.set(pd.slug, resolveRefs(String(proc.stringify(proc.runSync(pd.tree ?? proc.parse(pd.source), f), f)), pd.slug)); // #404 marker 7: the interstitial-spliced tree, when present
    }
    contentRegion.innerHTML = articleCache.get(pd.slug);
    resolveWebsitePageAssets(contentRegion, pd.resolved.sourcePath);   // #352: figure assets resolve page-relative
    if (!executed.has(pd.slug)) { executeAssets(contentRegion); executed.add(pd.slug); }
    // No shell on-this-page rail (maintainer decision): the article owns its layout. A `<config toc>`
    // article renders its OWN contents rail inside the content (exactly as the static site does); a
    // no-config-toc article has no ToC. The shell renders only the nav bar + this content slot.
  };

  // Render the chapter/cover the CURRENT `?chapter=` selects for the active book page; the `#hash` is the
  // section anchor to scroll to. A new chapter swaps the content + executes its assets; the section anchor
  // scrolls once mounted. The book carries its OWN layout (chapter rail + reading column + on-this-page)
  // inside the content slot — the shell adds none.
  const renderBookChapter = () => {
    const b = currentBook;
    const { chapter, hash } = currentRoute();
    const dest = resolveRoute(chapter, hash, b.model);
    if (dest == null) {
      // #404 point 3: an unknown ?chapter= stem on a book page shows the graceful not-found
      // view — the OLD behavior silently fell back to the cover (the exact misrouting the
      // #404 investigation named). Home = this book page's own route.
      contentRegion.innerHTML = notFoundViewHtml(`chapter "${String(chapter)}"`, `?page=${b.pd.slug}`);
      b.currentKey = 'not-found';
      return;
    }
    const key = dest.cover ? 'cover' : dest.index;
    if (key !== b.currentKey) {
      if (!b.chapterCache.has(key)) {
        const view = key === 'cover' ? renderLiveCoverView(b.model, b.ctx) : renderLiveChapterView(b.model, key, b.ctx);
        b.chapterCache.set(key, resolveRefs(view, b.pd.slug));
      }
      contentRegion.innerHTML = b.chapterCache.get(key);
      resolveWebsitePageAssets(contentRegion, b.pd.resolved.sourcePath);   // #352: figure assets resolve page-relative
      b.currentKey = key;
      executeAssets(contentRegion);
    }
    if (dest && dest.anchor && typeof document !== 'undefined') {
      const el = document.getElementById(dest.anchor);
      if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView();
    }
  };

  const renderPageInto = (pd) => {
    if (pd.isBook) {
      const loaded = loadedBySrc.get(pd.resolved.sourcePath);
      // Re-assemble + re-number the book over the read-through SEED (so its OUTBOUND cross-page `<ref>`s
      // resolve to the target's native number) on a FRESH tree (not Phase 1's). loaded sources + the seed +
      // the authored `<a {slug}>` resolver (#318), which the per-chapter stringify resolves in-tree.
      const f = { data: { [ENSCRIBE_LOADED_SOURCES]: loaded, ...seedRegistry(), [ENSCRIBE_PAGE_LINK_RESOLVER]: makePageLinkResolver(pd.slug) } };
      // pageSlug = pd.slug → the book sub-view's rail/route hrefs are fully-qualified `?page=<slug>&chapter=…`
      // (copyable section deep-links), and its cross-chapter refs route within the page.
      currentBook = { pd, model: buildLiveBook({ numbered: proc.runSync(assembleBookTree(pd.source, loaded), f), file: f, pageSlug: pd.slug }), ctx: { proc, file: f }, chapterCache: new Map(), currentKey: null };
      // #420: the website book view composes the same body as a standalone book (arrows,
      // rail, back-to-top markup) but this mount never injected the conditional book-nav
      // CSS — the standalone mount's injectBookNavStyles call has a website counterpart
      // here. Idempotent-update: navigating between books with different nav configs
      // refreshes the one style element.
      injectBookNavStyles(currentBook.model.bookNav);
      renderBookChapter();
    } else {
      currentBook = null;
      renderArticleInto(pd);
    }
  };

  // EDIT mode (#246 S2c), the ARTICLE-page preview renderer (a book page edits PER-CHAPTER via the embedded
  // mountEditLoop in showEditPage, NOT through here): render the page's source into a Write/Preview pane (the
  // SAME wireEditTabs + editor.mount contract the article edit loop uses, browser.js mountArticleEditLoop),
  // inside the persistent chrome. The preview is a STANDALONE render of the edited page (one runSync over JUST
  // that page — NOT the multi-page global pass): the live-preview approximation. Cross-page refs can't resolve
  // standalone, so they show unresolved WHILE EDITING; the authoritative ?page=owner#… link is the read render
  // / on reload (a known, accepted limitation, shared with the book edit preview).
  const renderPageStandalone = (src) => {
    try {
      const f = { data: {} };
      return String(proc.stringify(proc.runSync(proc.parse(src), f), f));
    } catch (err) {
      return `<p class="enscribe-edit-error">live edit error: ${String((err && err.message) || err).replace(/</g, '&lt;')}</p>`;
    }
  };
  let editHandle = null;
  let activeDebounced = null;
  // Tear down the CURRENT page's editor before showing another (or a not-found): cancel its pending
  // preview re-render (else page A's debounced render fires into page B's pane — a cross-page leak)
  // and destroy its editor adapter (else a real CodeMirror instance + its listeners leak). Mirrors
  // mountEditLoop.renderChapterAt (cancel-first) + destroyEditor (guarded destroy). Runs BEFORE any
  // innerHTML wipe so destroy() sees its own DOM.
  const teardownEdit = () => {
    if (activeDebounced) { activeDebounced.cancel(); activeDebounced = null; }
    if (editHandle && typeof editHandle.destroy === 'function') { try { editHandle.destroy(); } catch { /* adapter destroy is best-effort */ } }
    editHandle = null;
  };
  const showEditPage = (slug, notFound) => {
    teardownEdit();                                              // tear down the prior ARTICLE-page editor
    if (currentBookEdit) { currentBookEdit.teardown(); currentBookEdit = null; }  // and a prior BOOK-page editor
    if (notFound || slug == null) { contentRegion.innerHTML = notFound ? renderNotFoundView(slug, { firstSlug }) : ''; return; }
    if (pageBySlug.get(slug)?.isError) {
      // #405: nothing to edit — the page's source never loaded; show the failed-page view.
      contentRegion.innerHTML = pageErrorViewHtml(slug, pageBySlug.get(slug).errorReason, firstSlug ? `?page=${firstSlug}` : '');
      return;
    }
    // Dispatch on page TYPE exactly as READ mode (renderPageInto) does — a book page edits PER-CHAPTER, an
    // article page edits as one unit. (Before the unification this path was book-blind: EVERY page fell to the
    // single-unit branch below, so a book page rendered its UNASSEMBLED master — empty chapters, no rail.)
    const pd = pageBySlug.get(slug);
    if (pd && pd.isBook) {
      // PER-CHAPTER book edit — the SAME machinery the standalone book mount uses (mountEditLoop), EMBEDDED so
      // THIS website's `?page=`/`#hash` router drives it (no second hashchange listener). The book's chapter
      // sources were pre-fetched into loadedBySrc (the eager pre-fetch above), so it assembles + numbers + edits
      // per chapter, mirroring how READ mode's renderPageInto book branch assembles to render. The edit preview
      // is the book rendered STANDALONE (its own registry), so a cross-page ref to ANOTHER page stays unresolved
      // WHILE EDITING — the same accepted limitation as the article edit preview.
      const loaded = loadedBySrc.get(pd.resolved.sourcePath) || {};
      currentBookEdit = mountEditLoop({
        root: contentRegion, proc, masterSource: pd.source,
        childSrcs: discoverChildSrcs(proc.parse(pd.source)),   // #426: structural discovery
        loadedFile: { data: { [ENSCRIBE_LOADED_SOURCES]: loaded } },
        editor, debounceMs, embedded: true, pageSlug: pd.slug, pageSrcDir: pd.resolved.sourcePath,
      });
      return;
    }
    // An ARTICLE page: the single-unit Write/Preview edit (unchanged).
    let currentSource = sourceBySlug.get(slug) ?? '';
    contentRegion.innerHTML = renderLiveArticleEditView(renderPageStandalone(currentSource));
    wireEditTabs(contentRegion);
    // Run the page-embedded interactivity (scrollspy / on-this-page) in the preview so its rail spies
    // exactly as read mode — the preview holds the page's REAL render, and executeAssets runs its
    // scripts (innerHTML does not). Re-run after each edit so the new render's script re-attaches.
    const runPreviewAssets = () => {
      const pane = contentRegion.querySelector('[data-edit-pane="preview"]');
      if (pane) { resolveWebsitePageAssets(pane, pd.resolved.sourcePath); executeAssets(pane).catch(() => {}); }  // #352: figures resolve page-relative in the edit preview too
    };
    runPreviewAssets();
    const updatePreview = () => {
      const pane = contentRegion.querySelector('[data-edit-pane="preview"]');
      if (pane) { pane.innerHTML = renderPageStandalone(currentSource); runPreviewAssets(); }
    };
    activeDebounced = debounce(updatePreview, debounceMs);
    const mountEl = contentRegion.querySelector('[data-edit-pane="source"]');
    editHandle = mountEl
      ? editor.mount(mountEl, { value: currentSource, onChange: (s) => { currentSource = s; activeDebounced(); } })
      : null;
  };

  const scrollToHash = () => {
    const anchor = ((typeof location !== 'undefined' && location.hash) || '').replace(/^#/, '');
    if (anchor && typeof document !== 'undefined') {
      const a = document.getElementById(anchor);
      if (a && typeof a.scrollIntoView === 'function') { a.scrollIntoView(); return; }
    }
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  };

  let currentSlug = null;
  const route = () => {
    const dest = resolvePage((typeof location !== 'undefined' && location.search) || '');
    const { slug } = dest;
    if (slug !== currentSlug) {
      currentBook = null;                                          // leaving any prior page (book or article)
      if (editor) {
        // EDIT mode: the current page's Write/Preview pane. A nav re-renders it and re-mounts the editor
        // with the NEW page's source; the chrome + the editor adapter persist. showEditPage dispatches on
        // page TYPE — an article edits as one unit, a book PER-CHAPTER (the same machinery the standalone
        // book mount uses), exactly as READ mode (renderPageInto) dispatches.
        showEditPage(slug, dest.notFound);
      } else if (dest.notFound) {
        contentRegion.innerHTML = renderNotFoundView(slug, { firstSlug });
      } else if (slug == null) {
        contentRegion.innerHTML = '';
      } else if (pageBySlug.get(slug)?.isError) {
        // #405: the page exists but failed to load — the graceful failed-page view, this page only.
        const pd = pageBySlug.get(slug);
        contentRegion.innerHTML = pageErrorViewHtml(slug, pd.errorReason, firstSlug ? `?page=${firstSlug}` : '');
      } else {
        // Render the page NATIVELY — an article as an article, a book as a book sub-view (#314). The
        // render helpers own executeAssets + the page's own layout (a book carries its own rail).
        renderPageInto(pageBySlug.get(slug));
      }
      currentSlug = slug;
      // move aria-current to the active page in the (persistent) chrome — no rebuild (both modes).
      setActivePage(root, dest.notFound ? null : slug);
    } else if (currentBook && !editor) {
      // SAME book page (READ): the `?chapter=` and/or `#section` changed → switch chapter / scroll (the
      // book sub-view's own routing reads both from the URL).
      renderBookChapter();
    } else if (currentBookEdit) {
      // SAME book page (EDIT): the `?chapter=`/`#section` changed → switch the EDITABLE chapter. The embedded
      // book edit loop owns the per-chapter render + the source→chapter swap; we just drive its router (book
      // sub-routing is a property of the active page being a book, NOT of read-vs-edit mode).
      currentBookEdit.route();
    }
    // An ARTICLE `?page=…#anchor` deep-link scrolls here (after mount); a BOOK page (read or edit) scrolls to its
    // section anchor inside its own router (renderBookChapter / the embedded edit loop) once the chapter mounts.
    if (!currentBook && !currentBookEdit) scrollToHash();
  };

  // The rider: a dropdown item is a `?page=` link INSIDE the open `<details>` panel, so the outside-click /
  // Escape dismissal (bindWebsiteNavDismiss) correctly does NOT fire on it — close any open nav dropdown
  // after a route nav so picking an item navigates AND closes the panel. (Static is moot: a full reload
  // resets the dropdown.) Single dismissal action, shared by every query-nav click via bindRouteNav.
  const closeOpenDropdowns = () => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('details.enscribe-site-dropdown[open]').forEach((d) => d.removeAttribute('open'));
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('popstate', route);   // back/forward — pushState does NOT fire popstate
    // hashchange drives the book sub-view's in-page section scroll (a `#anchor` inside a book page) AND an
    // article's `#anchor` deep-link scroll; route() is a no-op when neither applies.
    window.addEventListener('hashchange', route);
    // Delegated internal nav: any `?…` route link (a `?page=` page link, a `?page=…&chapter=…` chapter route,
    // a cross-page/cross-chapter ref) → pushState (preserving &edit) + route. The shared bindRouteNav owns the
    // merge; the rider closes an open dropdown after the nav.
    bindRouteNav(root, route, closeOpenDropdowns);
  }

  // Initial deep-link: normalize the URL with replaceState (no duplicate history entry), then render.
  if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
    const init = resolvePage((typeof location !== 'undefined' && location.search) || '');
    const params = new URLSearchParams((typeof location !== 'undefined' && location.search) || '');
    if (init.slug != null) {
      params.set('page', init.slug);
      history.replaceState(null, '', `?${params}${(typeof location !== 'undefined' && location.hash) || ''}`);
    }
  }
  route();                                          // initial render from the current ?page=
  return root;
}

export async function mountLiveShell(target, url, options = {}) {
  // The SERVED Live entry: fetch the master ONCE, then mount it via the shared dispatch below. The
  // single-file mode (embedded content) skips the fetch — it reads its carried source and calls
  // `mountLiveDocument` directly. One dispatch, two source providers (fetch here; embedded there).
  const source = await fetchMasterSource(url, 'mountLiveShell');
  return mountLiveDocument(target, source, options);
}

/**
 * Mount a master document from SOURCE ALREADY IN HAND — the read-from-provided-source entry that does
 * NOT fetch the master. The shared core `mountLiveShell` delegates to after its fetch, and the entry
 * the single-file shell calls with the `.emd` it carries embedded (a `<template>` it reads at mount).
 * The 3-way `<meta type>` dispatch and the #213 edit switch are identical to the served path — only
 * WHERE the master source comes from differs (the source-provider seam: fetch vs embedded).
 *
 * @param {string|Element} target - a CSS selector or the Element to mount into.
 * @param {string} source - the master document's enscribe source (already read; not a URL).
 * @param {object} [options] - mountLiveShell options (edit switch, editorFactory, pipeline options).
 * @returns {Promise<Element>} the mounted element.
 */
export async function mountLiveDocument(target, source, options = {}) {
  const { edit, editorFactory, editDebounceMs, ...pipelineOptions } = options;
  const el = typeof target === 'string'
    ? (typeof document !== 'undefined' ? document.querySelector(target) : null)
    : target;
  const editEnabled = edit !== undefined ? !!edit : editAttrOn(el);
  // #351 — SAVE context for a single-file vessel. The embedded-source `<template id="enscribe-source">`
  // is present ONLY in emitSingleFileShell's output (a served shell fetches its master instead), so it is
  // the definitive "this is a self-contained, saveable single-file document" signal. Snapshot the vessel
  // HTML NOW — before the editor mounts or the render fills `#enscribe-book-root` — so SAVE reuses the
  // exact pristine structure (its asset-delivery mode preserved) and swaps ONLY the embedded source. Only
  // an article single-file is editable (editable ⟺ self-contained ⟺ no `<… src>` children; a book's edit
  // loop is a per-`<chapter src>` source map, which a self-contained file has none of), so only the
  // article branch receives it.
  const saveContext = (editEnabled && typeof document !== 'undefined' && document.getElementById('enscribe-source'))
    ? { pristineHtml: '<!DOCTYPE html>\n' + document.documentElement.outerHTML }
    : null;
  // Build the editor adapter on demand (READ mode never loads it), then dispatch 3-way on the master's
  // `<meta type>`. editor === null → read mode (byte-identical to #209 / the article render); an
  // adapter → the edit loop: #211 (book) / #216 (article) / #246 S2c (the website per-page loop).
  let editor = null;
  if (editEnabled) {
    if (typeof editorFactory !== 'function') {
      throw new Error('mountLiveDocument: editing is on but no `editorFactory` was provided to build/load the editor');
    }
    editor = await editorFactory();
  }
  const proc = getPipeline(pipelineOptions);
  const type = masterType(proc, source);
  const mountOptions = { ...pipelineOptions, editor, editDebounceMs };
  // #392: standalone shells (article/book — no top bar) get the FLOATING chrome corner (the Edit
  // toggle; the website type renders the corner inside its own top bar instead).
  if (type !== 'website') injectFloatingShellActions();
  return type === 'book' ? mountLiveBook(target, source, mountOptions)
    : type === 'website' ? mountLiveWebsite(target, source, mountOptions)
    : mountLiveArticle(target, source, { ...mountOptions, saveContext });
}

/**
 * Render enscribe source and write it into a DOM element.
 *
 * @param {string|Element} target - a CSS selector or an Element to fill.
 * @param {string} source - enscribe/markdown source text.
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Element} The element that was written into.
 *
 * LIMITATION (Phase 14 Slice 1): the rendered HTML is assigned via innerHTML,
 * which the HTML spec deliberately prevents from executing any injected
 * <script> elements. So the hover-preview init script and any DSL (mermaid/abc)
 * activation scripts emitted into the fragment will NOT run automatically here.
 * To make an interactive document live, call executeAssets(el) AFTER renderInto
 * (the two-step pattern, Phase 14 Slice 2); or render() a full HTML page the
 * browser parses normally, where the scripts run during parse.
 */
export function renderInto(target, source, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) {
    throw new Error(`renderInto: target not found: ${String(target)}`);
  }
  el.innerHTML = render(source, options);
  return el;
}

/**
 * Activate the enscribe-injected <script> assets inside an element whose HTML
 * was set via innerHTML (renderInto, or a manual `el.innerHTML = render(...)`).
 *
 * Why this exists (Phase 14 Slice 2): innerHTML leaves injected <script>s inert
 * (see renderInto's LIMITATION). The interactive layer enscribe emits — Tippy/
 * Popper hover-previews and the live-link DSL bundles (mermaid/abc) — is a set
 * of <script> elements that therefore never run. executeAssets walks the subtree
 * and re-creates each so the browser executes it, completing the two-step
 * `render → executeAssets` pattern.
 *
 * Scope: this only handles scripts ENSCRIBE itself injects. It is not a general
 * "run every script in this HTML" facility — executing arbitrary markup-derived
 * JS is a consumer's decision, not ours.
 *
 * Three properties make it correct rather than a naive re-inject loop:
 *
 *   1. Order + readiness. The injected scripts have load-order dependencies:
 *      `mermaid.initialize(...)` needs the mermaid lib; the hover-preview init
 *      needs Tippy, which needs Popper. External (src) scripts load
 *      asynchronously, so we process the list in document order and AWAIT each
 *      external script's load before moving on — exactly the blocking, in-order
 *      semantics the browser gives parsed (non-async) scripts. A parallel
 *      Promise.all would run `mermaid.initialize` before `mermaid` exists.
 *
 *   2. Dedup. In a live editor this runs on every edit. Re-fetching and
 *      re-evaluating the multi-megabyte mermaid/Tippy/Popper bundles each
 *      keystroke is wasteful and can re-clobber globals, so an external src
 *      already loaded into <head> is skipped (its global is already there). The
 *      check is <head>-scoped, not whole-document, so the inert original still in
 *      the target subtree is not mistaken for a completed load (see
 *      externalAlreadyLoaded).
 *
 *   3. DSL re-render kick. mermaid's init is `mermaid.initialize({ startOnLoad:
 *      true })`, which only renders on the initial DOMContentLoaded — correct for
 *      a parsed full-page file, but a no-op when markup is injected after load.
 *      So after the scripts run we call `mermaid.run()` to scan for unrendered
 *      diagrams. (abc's init self-renders via its readyState-`else` branch when
 *      re-executed, so it needs no kick.)
 *
 * @param {string|Element} target - a CSS selector or the Element written into.
 * @returns {Promise<Element>} resolves with the element once assets have run.
 */
export async function executeAssets(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) {
    throw new Error(`executeAssets: target not found: ${String(target)}`);
  }

  for (const original of [...el.querySelectorAll('script')]) {
    const src = original.getAttribute('src');
    if (src) {
      if (!externalAlreadyLoaded(src)) {
        await loadExternalScript(original);
      }
    } else {
      runInlineScript(original);
    }
  }

  // DSL re-render kick (property 3). Guarded: a mid-edit invalid diagram makes
  // mermaid.run() reject, which must not break the editor loop.
  if (window.mermaid && typeof window.mermaid.run === 'function') {
    try {
      await window.mermaid.run();
    } catch {
      /* invalid/in-progress diagram source — ignore until the next render */
    }
  }

  return el;
}

/**
 * True if this external src has already been loaded by a prior pass.
 *
 * Scoped to <head> ON PURPOSE: loadExternalScript appends loaded externals to
 * <head>, whereas the inert injected originals sit in the TARGET subtree (in
 * <body>). A whole-document query would match the original `<script src>` against
 * itself and wrongly report "already loaded", so the external library would never
 * actually run (the silent failure that left mermaid/Tippy dead in the editor).
 */
function externalAlreadyLoaded(src) {
  return [...document.head.querySelectorAll('script[src]')].some(
    (s) => s.getAttribute('src') === src || s.src === src,
  );
}

/** Re-create an external <script src>, append to <head>, resolve on load. */
function loadExternalScript(original) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    for (const { name, value } of [...original.attributes]) {
      s.setAttribute(name, value);
    }
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`executeAssets: failed to load ${original.getAttribute('src')}`));
    document.head.appendChild(s);
  });
}

/**
 * Re-create an inline <script> so it executes, replacing the inert original in
 * place (keeping it inside the target subtree, which the next render wipes).
 */
function runInlineScript(original) {
  const s = document.createElement('script');
  s.textContent = original.textContent;
  original.replaceWith(s);
}
