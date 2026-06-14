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
  HAS_MASTER_SRC,
  buildLiveBook,
  renderLiveChapterView,
  renderLiveCoverView,
  renderLiveChapterEditView,
  renderLiveChapterPreviewBody,
  renderLiveArticleEditView,
  createIncrementalRebuilder,
  resolveHash,
} from './index.js';
import { preloadSources } from './lib/preload-library-sources.js';
import { ENSCRIBE_LOADED_SOURCES } from '../core/file-data-keys.js';
import { isEnscribeTag } from '../core/tag.js';

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
  return String(getPipeline(options).processSync(source));
}

// #133: a <library src> fast-path gate — true only if the source might carry an
// external library source, so renderAsync can short-circuit to the sync render
// for the common (inline / no-src) case without a discovery parse.
const HAS_LIBRARY_SRC = /<library\b[^>]*\bsrc\s*=/i;
// #195: a `<table src>` / `<csv src>` / `<tsv src>` data-source gate — the table analog
// of HAS_LIBRARY_SRC, so renderAsync pre-fetches external table data too.
const HAS_TABLE_SRC = /<(table|csv|tsv)\b[^>]*\bsrc\s*=/i;

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
    getPipeline(options).processSync({ value: source, data: { [ENSCRIBE_LOADED_SOURCES]: loaded } }),
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

// #194: a master-src fast-path gate (HAS_MASTER_SRC, shared with the assembler) —
// true only if the source might be a multi-file master document (a `<section src>` /
// `<chapter src>` / … entry), so renderMasterAsync can short-circuit a non-master
// source to the ordinary (library-aware) async render without a discovery parse.

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
 * Discover a master's top-level `src` structure children — the SAME parser AND the SAME
 * predicate (isMasterSrcEntry) the assembler uses, so the discovered set is exactly the
 * set assembleMasterDocument resolves (one authority, no drift). Deduped child `src`s.
 */
function discoverChildSrcs(proc, source) {
  const masterTree = proc.parse(source);
  return [
    ...new Set(
      (masterTree.children ?? [])
        .filter(isMasterSrcEntry)
        .map((n) => n.kwargs.src),
    ),
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
async function loadAndAssembleMaster(proc, source, childSrcs) {
  const baseUrl = (typeof document !== 'undefined' && document.baseURI) || undefined;
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
    (src) => fetchSourceText(src, baseUrl),
  );
  const tree = assembleMasterDocument({
    source,
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
  if (!HAS_MASTER_SRC.test(source)) return renderAsync(source, options);
  const proc = getPipeline(options);
  const childSrcs = discoverChildSrcs(proc, source);
  if (childSrcs.length === 0) return renderAsync(source, options);
  const { tree, loadedFile } = await loadAndAssembleMaster(proc, source, childSrcs);
  // The loaded map rides one VFile through BOTH runSync (library-load resolves the
  // master's bibliography; numbering and ref/cite resolution) AND stringify (the table
  // handler reads the data via the compiler, which has the VFile — handlers do not). One
  // file so config set during runSync is consistent at stringify too. #197 library + #195
  // table; mirrors the CLI build path, fetched instead of fs-read.
  return String(proc.stringify(proc.runSync(tree, loadedFile), loadedFile));
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
  if (!HAS_MASTER_SRC.test(source)) {
    throw new Error('mountLiveBook: source is not a multi-file master (no `<… src>` chapter children)');
  }
  const proc = getPipeline(pipelineOptions);
  const childSrcs = discoverChildSrcs(proc, source);
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

  // Lazy per-view render cache: the cover (#209) and each chapter's view (content + chrome)
  // are built on first view and reused after — the authoring payoff (render only what you
  // navigate to). The cover is keyed 'cover'; chapters by their index.
  const viewCache = new Map();
  const viewFor = (key) => {
    if (!viewCache.has(key)) {
      viewCache.set(key, key === 'cover' ? renderLiveCoverView(model) : renderLiveChapterView(model, key, ctx));
    }
    return viewCache.get(key);
  };

  let currentKey = null;                          // 'cover' | a chapter index | null (unmounted)
  const route = () => {
    const dest = resolveHash((typeof location !== 'undefined' && location.hash) || '', model);
    if (dest == null) return;                     // unknown anchor owned by no chapter — no-op
    const key = dest.cover ? 'cover' : dest.index;
    if (key !== currentKey) {
      root.innerHTML = viewFor(key);
      currentKey = key;
    }
    // An in-chapter / cross-chapter anchor: scroll to it once its owning chapter is mounted.
    if (!dest.cover && dest.anchor && typeof document !== 'undefined') {
      const anchorEl = document.getElementById(dest.anchor);
      if (anchorEl && typeof anchorEl.scrollIntoView === 'function') anchorEl.scrollIntoView();
    }
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('hashchange', route);
  }
  route();                                        // initial render from the current hash
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
  };
  for (const t of tabs) {
    t.addEventListener('click', () => activate(t.getAttribute('data-edit-tab')));
  }
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
function mountEditLoop({ root, proc, masterSource, childSrcs, loadedFile, editor, debounceMs }) {
  const loaded = loadedFile.data[ENSCRIBE_LOADED_SOURCES] || {};
  // The editable in-memory source map (structure children), seeded from the fetched sources.
  const sources = new Map();
  for (const src of childSrcs) sources.set(src, readPreloadedChild(loaded, src));

  const rebuilder = createIncrementalRebuilder({ masterSource, sources, proc, loadedSources: loaded });
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

  // Re-render ONLY the current chapter's preview pane (leave the editor + tabs intact).
  const updatePreview = () => {
    if (currentKey === 'cover' || currentIndex < 0) return;
    const pane = root.querySelector('[data-edit-pane="preview"]');
    if (pane) pane.innerHTML = renderLiveChapterPreviewBody(model, currentIndex, ctx);
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
    root.innerHTML = renderLiveCoverView(model);
  };

  const route = () => {
    const dest = resolveHash((typeof location !== 'undefined' && location.hash) || '', model);
    if (dest == null) return;
    if (dest.cover) {
      if (currentKey !== 'cover') renderCover();
      return;
    }
    if (currentKey !== dest.index) renderChapterAt(dest.index);
    if (dest.anchor && typeof document !== 'undefined') {
      const anchorEl = document.getElementById(dest.anchor);
      if (anchorEl && typeof anchorEl.scrollIntoView === 'function') anchorEl.scrollIntoView();
    }
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('hashchange', route);
  }
  route();
  return root;
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
  const { editor = null, editDebounceMs, ...pipelineOptions } = options;
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
  const childSrcs = discoverChildSrcs(proc, source);
  const { loadedFile } = await loadAndAssembleMaster(proc, source, childSrcs);
  return mountArticleEditLoop({
    root, proc, masterSource: source, loadedFile, editor,
    debounceMs: editDebounceMs ?? 250,
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
function mountArticleEditLoop({ root, proc, masterSource, loadedFile, editor, debounceMs }) {
  const loaded = loadedFile.data[ENSCRIBE_LOADED_SOURCES] || {};
  let currentSource = masterSource;   // the single editable unit (the master)

  // Synchronous render of the CURRENT source → cheap global pass → stringify, byte-identical to the
  // READ render (renderMasterAsync), so the preview matches the published article. It mirrors
  // renderMasterAsync's OWN top-level branch on HAS_MASTER_SRC: a multi-file article (a `<section src>`
  // entry) ASSEMBLES its in-memory children first (the same assembler read mode uses); a single-file
  // article renders the source DIRECTLY — NOT through the assembler — so deferred placement markers
  // (`<toc>` / `<endnotes>` / `<bibliography>`) survive exactly as read mode's render() leaves them
  // (the assembler drops them; the direct render does not). A fresh VFile each render (the numbering
  // registry must not carry over).
  const renderArticle = (src) => {
    const file = { data: { [ENSCRIBE_LOADED_SOURCES]: loaded } };
    const tree = HAS_MASTER_SRC.test(src)
      ? assembleMasterDocument({
          source: src,
          parse: (s) => proc.parse(s),
          resolve: (rel) => rel,
          readFile: (s) => readPreloadedChild(loaded, s),
          warn: () => {},
        })
      : proc.parse(src);
    return String(proc.stringify(proc.runSync(tree, file), file));
  };

  root.innerHTML = renderLiveArticleEditView(renderArticle(currentSource));
  wireEditTabs(root);

  // Re-render ONLY the preview pane (leave the editor + tabs intact). always-renders: a mid-edit
  // parse/render error surfaces in the pane, never breaking the loop.
  const updatePreview = () => {
    const pane = root.querySelector('[data-edit-pane="preview"]');
    if (!pane) return;
    try {
      pane.innerHTML = renderArticle(currentSource);
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
      onChange: (newSource) => { currentSource = newSource; debouncedRender(); },
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
 * dispatch needs. `book` → the book live path; EVERYTHING else (an article, an absent type, an
 * unknown type) → the article path. That matches the structuring fallback exactly: only a
 * `<meta type=book>` produces a `<book>` (which the book live path needs), and an unknown type falls
 * back to `article` (enscribeDocTypeResolve). A bare kwarg read is enough — no full pipeline run.
 *
 * @param {import('unified').Processor} proc - a configured pipeline (its `.parse`)
 * @param {string} source - the master document's enscribe source
 * @returns {boolean} true iff the master declares `<meta type=book>`
 */
function masterIsBook(proc, source) {
  const meta = (proc.parse(source).children ?? []).find((n) => isEnscribeTag(n, 'meta'));
  return meta?.kwargs?.type === 'book';
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
 * DISPATCH (#216): the shell fetches the master ONCE, reads `<meta type>`, and routes — a book to the
 * existing book live path (mountLiveBook, unchanged), an article to the new article path
 * (mountLiveArticle). The detection is at RUNTIME here, so the emitter that writes the shell stays
 * pure and type-agnostic (no emit-time master read): one emitted shell drives either kind of master,
 * and a document that changes type never needs a re-emit.
 *
 * ON → `editorFactory()` is awaited to build the editor adapter (the host loads CodeMirror THERE —
 * lazily, so READ mode never loads it) and the document mounts in edit mode (#211's `{ editor }`).
 * OFF → it mounts in read mode — byte-identical to the read shell (#209 book / the article render).
 *
 * @param {string|Element} target - a CSS selector or the Element to mount into.
 * @param {string} url - the master's URL (relative to the page) — a book OR an article master.
 * @param {object} [options] - mountLiveBook / mountLiveArticle options (see render()), plus the switch:
 * @param {boolean} [options.edit] - explicit edit flag; overrides the `data-enscribe-edit` attribute.
 * @param {() => (object|Promise<object>)} [options.editorFactory] - builds the editor adapter
 *   (#211 `editor`: `mount(el,{value,onChange}) → {destroy?()}`) when editing is on. Called ONLY
 *   then, so the host can lazy-load CodeMirror and read mode never pulls it in.
 * @returns {Promise<Element>} the mounted element.
 */
export async function mountLiveShell(target, url, options = {}) {
  const { edit, editorFactory, editDebounceMs, ...pipelineOptions } = options;
  const el = typeof target === 'string'
    ? (typeof document !== 'undefined' ? document.querySelector(target) : null)
    : target;
  const editEnabled = edit !== undefined ? !!edit : editAttrOn(el);
  let editor = null;
  if (editEnabled) {
    if (typeof editorFactory !== 'function') {
      throw new Error('mountLiveShell: editing is on but no `editorFactory` was provided to build/load the editor');
    }
    editor = await editorFactory();
  }
  // Fetch the master ONCE, then dispatch on its `<meta type>`. editor === null → read mode
  // (byte-identical to #209 / the article render); an adapter → #211's edit mode (book) / the #216
  // single-unit edit loop (article). editDebounceMs is re-attached so both mounts read it the same.
  const source = await fetchMasterSource(url, 'mountLiveShell');
  const proc = getPipeline(pipelineOptions);
  const mountOptions = { ...pipelineOptions, editor, editDebounceMs };
  return masterIsBook(proc, source)
    ? mountLiveBook(target, source, mountOptions)
    : mountLiveArticle(target, source, mountOptions);
}

/**
 * Back-compat alias for the unified {@link mountLiveShell} (#216). The #213 shell entry was
 * book-specific (`mountLiveBookShell`); the type-agnostic dispatch superseded it. Kept so the
 * earlier emitted shells (and any host calling it directly) keep working — it now also drives an
 * article master, since it delegates to the dispatcher. New shells emit `mountLiveShell`.
 *
 * @param {string|Element} target - a CSS selector or the Element to mount into.
 * @param {string} url - the master's URL (book or article).
 * @param {object} [options] - see {@link mountLiveShell}.
 * @returns {Promise<Element>} the mounted element.
 */
export async function mountLiveBookShell(target, url, options = {}) {
  return mountLiveShell(target, url, options);
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
