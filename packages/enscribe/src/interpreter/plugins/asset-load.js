// asset-load plugin (#190) — the asset (and, since #313, dataset) half of <data>,
// mirroring the citation half (library-load.js / buildCitationIndex).
//
// #313 slice 1: a <dataset> is a second OPAQUE store declaration that rides this same
// harvest into the same id-keyed store (file.data.enscribeAssets) — one neutral store,
// not a parallel one (notes/specs/data-store.md). It holds raw CSV/JSON/… bytes (+ an
// optional format hint) under its id for an @id consumer to interpret later (slice 2);
// it is pure storage, harvested + stripped here, never rendered. See buildAssetIndex.
//
// An embedded asset is DECLARED inside <data> as a <fig> with an id, a format
// flag (png), and a base64 body:
//
//   <data>
//      <fig #fig:scatter png>iVBORw0KGgo…</fig>
//   </data>
//
// and REFERENCED in the body by setting src to that id behind the @ sigil:
//
//   <fig src="@fig:scatter" />
//
// Two passes, both at the index stage BEFORE numbering (index.js steps 5.7/5.8):
//
//   buildAssetIndex        — deep-collect <data> nodes (collectDataNodes, shared
//                            with the citation index), harvest each embedded <fig>
//                            into file.data.enscribeAssets keyed by id, and STRIP
//                            the declaration from its <data>. Stripping matters:
//                            <data> is render-suppressed (storage-hosts → null at
//                            toHast) but numbering still WALKS it, so an un-stripped
//                            declaration would consume a figure number and a
//                            <ref @id> would resolve to that suppressed declaration
//                            instead of the placed figure (#190 Phase 0).
//
//   enscribeAssetResolution — a body <fig> whose src begins with @ resolves from the
//                            store: rewrite src to a data:<mime>;base64,<payload> URI
//                            and ADOPT the asset id onto the placed figure (unless it
//                            already carries its own id) so the visible figure is the
//                            numbered cross-reference anchor. An unresolved @id /
//                            unsupported format becomes a visible __asset-error,
//                            never a broken @-src <img>.
//
// An asset may instead be EXTERNAL — a <fig> with a src and no body:
//
//   <data>
//      <fig #fig:diagram src="figures/diagram.svg" />
//   </data>
//
// Embedded-vs-external is only about where the bytes live; the body reference is
// the same (<fig src="@id" />). An embedded reference resolves to a data: URI; an
// external one resolves to the declared path (already assembly-rebased master-
// relative for a cross-file child), emitting a plain <img src="path">.
//
// Scope (#190): single-file and cross-file; embedded (png/jpg/jpeg/svg/gif/webp)
// and external assets; re-placement of one asset; JATS <graphic> export (DONE —
// data: URI / rebased path, DTD-valid). FORMAT_MIME below is the embedded media-type
// extension point. (#313 slice 1 adds opaque <dataset> storage to this harvest; the
// fig-shaped @-resolver below is neutralized in slice 2, not here.)

import { ENSCRIBE_ASSETS } from '../../core/file-data-keys.js';
import { isEnscribeTag } from '../lib/ast-helpers.js';
import { makeErrorNode, injectBodyErrors } from '../lib/error-injection.js';
import { collectDataNodes } from './library-load.js';

// #190: the embedded-asset format flag → the image MIME type for the data: URI.
// External assets are format-agnostic (the type follows from the path). Adding a
// media type is a one-line entry here.
const FORMAT_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * Concatenate the text payload of an embedded asset declaration's body. After
 * recursive-content the base64 arrives as mdast text node(s) under node.content
 * (or, defensively, as a raw string). A surrounding {…} wrapper — the spec's
 * placeholder notation, if an author copied it literally — is stripped; base64
 * never contains braces, so this cannot corrupt a real payload.
 */
function collectAssetPayload(content) {
  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n == null) continue;
        if (typeof n.value === 'string') text += n.value;
        if (Array.isArray(n.children)) walk(n.children);
      }
    };
    walk(content);
  }
  text = text.trim();
  if (text.startsWith('{') && text.endsWith('}')) text = text.slice(1, -1).trim();
  return text;
}

/**
 * A visible `__asset-error` node (rendered by assetErrorHandler). always-renders
 * (#190, mirroring __library-error): an unresolved @id / unsupported format / empty
 * payload shows a visible block naming the reference, never a broken <img src="@…">.
 */
export function makeAssetError(ref, message) {
  return makeErrorNode('__asset-error', 'ref', ref, message);
}

/**
 * Turn a <fig> node in place into a visible __asset-error (the resolution path,
 * before numbering — so the error is never counted as a figure).
 *
 * Exported (#115): the minipage no-external guard reuses this to neutralize a
 * forbidden <data>/@src node in a sealed body, so the `__asset-error` shape (and
 * its numbering-safe field clearing) stays defined in one place.
 */
export function assetError(node, ref, message) {
  Object.assign(node, makeAssetError(ref, message));
  node.id = null;
  node.positional = [];
  node.booleans = {};
  node.atRefs = [];
}

/**
 * Extract a `<dataset>`'s OPAQUE payload. A `<dataset>` is opaque
 * (`getContentHandler('dataset')` is non-`default`), so its `content` is the raw,
 * never-markdown-parsed body STRING. A dataset is authored LONG-FORM
 * (`<dataset …>bytes</dataset>` — enforced at harvest, see buildAssetIndex), so the
 * payload is the tag body; trim only the OUTER whitespace (the newline/indent around
 * the body) — exactly as `<library>` (the sibling storage host) trims its payload.
 * `String.trim()` touches only the ends, so a `#`/`*`/`_` INSIDE the payload, and any
 * internal indentation (e.g. pretty JSON), survive untouched; no brace-strip (a JSON
 * `{…}` keeps its braces, unlike an asset base64 payload). The array branch is
 * defensive only — opaque content is a string.
 */
function datasetPayload(content) {
  if (typeof content === 'string') return content.trim();
  let text = '';
  const walk = (nodes) => {
    for (const n of nodes ?? []) {
      if (n == null) continue;
      if (typeof n.value === 'string') text += n.value;
      if (Array.isArray(n.children)) walk(n.children);
    }
  };
  if (Array.isArray(content)) walk(content);
  return text.trim();
}

/**
 * Build the data-store index from store declarations inside <data> nodes, and strip
 * each harvested declaration from its <data>. Writes file.data.enscribeAssets (a Map
 * id → an opaque store entry). Runs at the index stage before numbering. Does not
 * touch <library> nodes (the citation index, which ran first, owns those).
 *
 * Two kinds of declaration share the one store + id namespace (#313 slice 1: one
 * neutral store, not a parallel one — see notes/specs/data-store.md):
 *   - embedded asset  <fig #id fmt>base64</fig>  → { format, base64 }   (#190)
 *   - external asset  <fig #id src="path" />     → { src }              (#190)
 *   - dataset         <dataset #id fmt>bytes</dataset>  → { format, content }  (#313)
 * A `<dataset>` is pure OPAQUE storage: its raw bytes are held under its id (with an
 * optional format hint) for an `@id` consumer to interpret later (slice 2). Nothing
 * renders or interprets it here — like an embedded asset declaration, it is stripped
 * from <data> (render-suppressed but still WALKED by numbering, so an un-stripped
 * declaration could perturb the walk).
 *
 * @param {{ children: Array }} tree
 * @param {import('vfile').VFile} file
 * @param {object} [options]
 * @param {Array|null} [options.dataNodes] Pre-collected <data> nodes (the wave-1 shared
 *   harvest — LIVE references, never copies: the strip below mutates them in place, and
 *   an un-stripped declaration would consume a figure number, #190). Omitted → collect
 *   here (standalone use, tests).
 */
export function buildAssetIndex(tree, file, options = {}) {
  const dataNodes = options.dataNodes ?? collectDataNodes(tree.children ?? []);
  const assets = new Map();
  const errors = [];

  for (const dataNode of dataNodes) {
    if (!Array.isArray(dataNode.content)) continue;
    // Harvest <fig> embedded-asset and <dataset> store declarations; strip them so the
    // render-suppressed declaration is not also walked by numbering.
    dataNode.content = dataNode.content.filter((child) => {
      const isFig = isEnscribeTag(child, 'fig');
      const isDataset = isEnscribeTag(child, 'dataset');       // #313 slice 1: opaque dataset store
      if (!isFig && !isDataset) return true;                   // not a store declaration — leave it
      // A <dataset> must be LONG-FORM: its payload is the <dataset>…</dataset> body. The
      // pipe form <dataset … | bytes> is delimited by the first unescaped `>`, truncating
      // any payload that itself contains `>` (Mermaid `-->`, some JSON, code) — and
      // datasets routinely contain `>`; the long form scans to the explicit `</dataset>`
      // and has no such ambiguity. So a non-long-form <dataset> is a visible authoring
      // error, never a silently-truncated store entry. (from-markdown sets form:'long'
      // only for the <tag>…</tag> body form; pipe/bare/slash are form:'short'.)
      if (isDataset && child.form !== 'long') {
        errors.push(makeAssetError('', `<dataset${child.id ? ` #${child.id}` : ''}> must use the long form <dataset>…</dataset> — the pipe form truncates the payload at the first ">" (e.g. Mermaid's "-->")`));
        return false;                                          // strip; never register a truncated payload
      }
      const id = child.id ?? null;
      if (!id) {
        // #395 (always-renders): an id-less declaration can never be consumed (no @id
        // names it) and <data> renders to nothing, so a vfile warning alone is invisible.
        // Same visible flag its sibling failures (non-long-form, duplicate id) get.
        errors.push(makeAssetError('', `<${child.tagname}> in <data> has no #id — not registered in the data store`));
        return true;                                          // malformed: leave it (inert), flagged
      }
      if (assets.has(id)) {
        // #190 cross-file merge: the same id declared in more than one <data>
        // block (e.g. two chapters of an assembled book). dataNodes are in
        // document order, so the set() below keeps the LAST declaration; emit a
        // visible always-renders collision flag — mirroring library-load's
        // duplicate-citation-key handling, never a silent overwrite. One id
        // namespace across assets + datasets (#313), so a cross-kind clash is caught too.
        errors.push(makeAssetError('', isDataset
          ? `duplicate data-store id "${id}" declared in more than one <data> block — last declaration wins`
          : `duplicate embedded-asset id "${id}" declared in more than one <data> block — last declaration wins`));
      }
      if (isDataset) {
        // Pure opaque storage: the raw bytes + an optional format hint
        // (`<dataset #id csv>…</dataset>` or `format=csv`), stored verbatim for an @id consumer.
        assets.set(id, { format: child.positional?.[0] ?? child.kwargs?.format ?? null, content: datasetPayload(child.content) });
      } else {
        // External (<fig #id src="path" />) vs embedded (<fig #id fmt>base64</fig>):
        // store the (already assembly-rebased) src for external, or the {format,
        // base64} for embedded. resolveFig resolves each accordingly.
        const inlineBody = collectAssetPayload(child.content);
        if (child.kwargs?.src && inlineBody) {
          // #413 L2: a <fig> declaring BOTH a src= and an inline base64 body. First-wins — the src= in
          // the tag HEAD lexically precedes the body — so the external src is kept; the inline payload
          // is ignored. Never silently: a visible duplicate flag (channel 1) + a warning (channel 2).
          errors.push(makeAssetError('', `embedded-asset id "${id}" declares both a src= and an inline base64 body — the external src wins (first in source order); the inline body is ignored`));
          file?.message?.(`asset-load: <fig #${id}> declares both src= and a base64 body — src wins (first-wins), the inline body is ignored`, child, 'asset:src-and-body');
        }
        assets.set(id, child.kwargs?.src
          ? { src: child.kwargs.src }
          : { format: child.positional?.[0] ?? null, base64: inlineBody });
      }
      return false;                                           // strip the declaration
    });
  }

  if (assets.size > 0) {
    file.data = file.data ?? {};
    file.data[ENSCRIBE_ASSETS] = assets;
  }
  // always-renders: inject any duplicate-declaration collision flags into the body.
  injectBodyErrors(tree, errors);
}

/**
 * Consumer-AGNOSTIC `@id` resolution (#313 slice 2 — data-store.md Piece 2, step 1). THE
 * neutral hand-off: given a use-site `src`, look up an `@id` reference in the merged store
 * and return the stored entry (or a not-found signal). It makes NO media assumption — no
 * `data:` URI, no `<img>`, no grid, no parse. Each CONSUMER interprets what it gets back
 * (`<fig>` → an image; `<table>` → a parsed grid; `<diagram>` → engine source; `<code>` →
 * verbatim text; each new consumer, its own reading). Every consumer calls this; the
 * interpretation lives in each consumer, not here.
 *
 *   - `src` not an `@`-ref   → null  (the caller keeps its own non-@ path, e.g. a file src)
 *   - `@id` not in the store → { ref, id, found: false, entry: null }
 *   - `@id` found            → { ref, id, found: true, entry }
 *     `entry` is the raw, UNINTERPRETED store entry:
 *       { format, base64 } embedded image asset | { src } external asset | { format, content } dataset.
 *
 * @param {*} src - the use-site `src` (only a string starting with `@` is an asset reference)
 * @param {Map<string,object>|null} assets - file.data.enscribeAssets
 * @returns {{ ref: string, id: string, found: boolean, entry: object|null }|null}
 */
export function resolveAssetReference(src, assets) {
  if (typeof src !== 'string' || !src.startsWith('@')) return null;
  const id = src.slice(1);
  const entry = assets?.get(id) ?? null;
  return { ref: `@${id}`, id, found: entry != null, entry };
}

/**
 * The `<fig>` CONSUMER's interpretation of an `@id` reference, in place. Calls the neutral
 * resolveAssetReference, then builds its OWN image from the bytes: external → the path;
 * embedded → a `data:<mime>;base64,…` URI. A reference to a <dataset> (tabular data, not an
 * image) is a visible error. **Byte-identical to the pre-split fig output for every asset
 * case** — the data: URI / path construction MOVED here from the resolver; the result is
 * unchanged. `adopted` is the set of asset ids already claimed by an earlier placement.
 */
function resolveFig(node, assets, adopted) {
  const r = resolveAssetReference(node.kwargs?.src, assets);
  if (r == null) return;                                        // not an asset reference — untouched
  const { id, ref, found, entry } = r;

  if (!found) {
    assetError(node, ref, `no asset declared with id "${id}"`);
    return;
  }

  if (entry.src != null) {
    // External asset: the declared (assembly-rebased) path goes straight into the
    // <img src>. External is format-agnostic — the type follows from the path.
    node.kwargs.src = entry.src;
  } else if (entry.content != null) {
    // A <dataset> (opaque tabular data) — a figure cannot render data as an image.
    assetError(node, ref, `"${id}" is a <dataset> (data, not an image) — reference it from a <table src="@${id}">, not a <fig>`);
    return;
  } else {
    // Embedded image asset: rewrite src to a data: URI built from the format flag.
    const mime = entry.format ? FORMAT_MIME[entry.format] : null;
    if (!mime) {
      assetError(node, ref, entry.format
        ? `unsupported embedded-asset format "${entry.format}" (supported: ${Object.keys(FORMAT_MIME).join(', ')})`
        : `embedded asset "${id}" has no format flag (e.g. png)`);
      return;
    }
    if (!entry.base64) {
      assetError(node, ref, `embedded asset "${id}" has no base64 payload`);
      return;
    }
    node.kwargs.src = `data:${mime};base64,${entry.base64}`;
  }

  // Adopt the asset id onto the FIRST placement that has no id of its own; each
  // subsequent placement renders + numbers as its own figure but is NOT the
  // cross-reference anchor — so there is exactly one id="<id>" in the output.
  // Re-placing an asset (the same image twice) is legitimate, not an error; an
  // author who wants to cross-reference a later placement gives it its own #id.
  if (node.id == null && !adopted.has(id)) {
    node.id = id;
    adopted.add(id);
  }
}

/**
 * The `<table src="@id">` CONSUMER's resolution (#313 slice 2 — the second consumer of the
 * neutral hand-off). Calls resolveAssetReference, then HANDS OFF the opaque bytes to the
 * table node so the table handler parses them with its EXISTING CSV/TSV/JSON/… parser — the
 * table owns the PARSE (its interpretation is unchanged; we only deliver the bytes). A
 * dataset's bytes become the table's inline content (with the dataset's format hint when the
 * table named no format word); an external asset becomes a file `src` the handler reads as
 * before. A not-found id — or an embedded IMAGE asset (not tabular) — is the SAME visible
 * `__asset-error` a bad <fig> ref gets (F2.1 closed: the table no longer fails silently). A
 * non-`@` `src` (a real file path) and an inline `<table | …>` are untouched.
 *
 * The bytes go straight from the store to the table parser, in-tree — never serialized then
 * re-parsed (the round-trip invariant, data-store.md Piece 3).
 */
function resolveTableSrc(node, assets, file) {
  const r = resolveAssetReference(node.kwargs?.src, assets);
  if (r == null) return;                                        // not an @-ref — a file path / inline, untouched
  const { id, ref, found, entry } = r;

  if (!found) {
    assetError(node, ref, `no data declared with id "${id}"`);
    return;
  }

  if (entry.content != null) {
    // A <dataset>: hand its opaque bytes to the table as inline content, and supply the
    // dataset's format hint when the table named no format word (`<table src="@id">`).
    node.content = entry.content;
    if (node.kwargs) delete node.kwargs.src;
    if ((node.positional == null || node.positional.length === 0) && entry.format) {
      node.positional = [entry.format];
    }
    // #413 L3: neither side named a format (the table has no format word AND the dataset carries no
    // hint) → the bytes cannot be parsed as a table; the handler would wrap them as raw HTML (garbage).
    // Missing-info: a visible flag naming the miss (channel 1) + a warning (channel 2), rather than a
    // silent mis-render. Replaces the table node with the error (keeps it out of table numbering).
    if ((node.positional == null || node.positional.length === 0) && !entry.format) {
      assetError(node, ref, `<dataset> "${id}" was handed to <table src="@${id}"> but neither names a format (csv/tsv/json/yaml/md) — the data cannot be parsed as a table`);
      file?.message?.(`asset-load: <table src="@${id}"> — neither the table nor the <dataset> names a format; the data cannot be parsed as a table`, node, 'asset:table-no-format');
    }
  } else if (entry.src != null) {
    // An external asset that is a data file: resolve the @id to its path; the table
    // handler reads it through its existing file-path branch.
    node.kwargs.src = entry.src;
  } else {
    // An embedded image asset is not tabular data.
    assetError(node, ref, `"${id}" is an embedded image asset (not tabular data) — reference it from a <fig src="@${id}">, not a <table>`);
  }
}

/**
 * Shared resolve → (dataset bytes | visible error) for the `<diagram>` and `<code>` dataset
 * consumers (#313 consumer wiring). Both read a stored `<dataset>`'s opaque bytes at an `@id`
 * `src` and hand them to their own render (engine source / verbatim code body); the
 * resolve + not-found + wrong-kind shape is identical, so it lives here once (the #349
 * contributor-helper pattern — one helper, its callers stay symmetric). `<table>`'s
 * `resolveTableSrc` predates this and keeps its own copy: it ALSO interprets an external
 * asset as a file `src` (a branch these two lack — their handlers read no files), so it does
 * not fold in cleanly; sharing it would smear the table-only file path across all three.
 *
 *   - `src` not an `@`-ref     → null   (a file path / inline; the node is left untouched)
 *   - `@id` not in the store   → the node becomes a visible `__asset-error`; returns null
 *   - `@id` is NOT a <dataset> → (an embedded image / external asset) visible error; returns null
 *   - `@id` is a <dataset>     → `{ bytes, format, ref }` — the raw bytes + the optional format hint
 *
 * A null return means "do nothing more" for BOTH the untouched and the already-errored case:
 * the node is either a non-`@` src (unchanged) or already rewritten into an `__asset-error`.
 *
 * @param {object} node - the use-site enscribeTag (diagram / code) carrying `kwargs.src`
 * @param {Map<string,object>|null} assets - file.data.enscribeAssets
 * @param {string} consumerName - the consuming element name, for the wrong-kind message
 * @returns {{ bytes: string, format: string|null, ref: string }|null}
 */
function readDatasetSource(node, assets, consumerName) {
  const r = resolveAssetReference(node.kwargs?.src, assets);
  if (r == null) return null;                                   // not an @-ref — untouched
  const { id, ref, found, entry } = r;

  if (!found) {
    assetError(node, ref, `no data declared with id "${id}"`);
    return null;
  }
  if (entry.content == null) {
    // Not a <dataset>: an embedded image asset ({ base64 }) or an external asset ({ src }).
    // These consumers read a stored <dataset>'s bytes only (their handlers read no files), so
    // pointing one at an image / external asset is misuse — the same visible __asset-error a
    // wrong-kind <fig>/<table> ref gets (F2.1: every consumer's kind mismatch is visible).
    const kind = entry.src != null ? 'an external asset' : 'an embedded image asset';
    assetError(node, ref, `"${id}" is ${kind} (not a <dataset>) — a <${consumerName}> reads a stored <dataset> by @id`);
    return null;
  }
  return { bytes: entry.content, format: entry.format ?? null, ref };
}

/**
 * The `<diagram src="@id">` CONSUMER's resolution (#313 consumer wiring). Reads a stored
 * `<dataset>`'s opaque bytes and feeds them as the diagram's ENGINE SOURCE (the string the
 * engine handler otherwise takes from `node.content`) — the diagram host owns the render,
 * unchanged.
 *
 * The format-hint handling DIVERGES from the table on purpose. A table re-parses the bytes
 * with its OWN format word (its word wins; a word/hint disagreement is harmless because the
 * table re-reads the data either way). A diagram's engine renders its source verbatim
 * CLIENT-SIDE and enscribe cannot re-interpret it, so the dataset's format hint is the only
 * guard: a hint that disagrees with the named engine (e.g. a `csv` dataset into a `mermaid`
 * diagram) is a visible asset-error, not a silently-broken render. A diagram that names NO
 * engine is left to the handler's existing "unknown diagram engine" error (a diagram always
 * names its engine; a format-agnostic dataset is not the place to source one). Inline source
 * (a non-`@` `src`, or a `<diagram | …>` body) is untouched.
 */
function resolveDiagramSrc(node, assets, file) {
  const ds = readDatasetSource(node, assets, 'diagram');
  if (ds == null) {
    // #423 (mirrors #421): a FILE-PATH src on <diagram> is unsupported BY DESIGN (the handler
    // reads no files; datasets via @id are the mechanism) — but it used to render a silent empty
    // <pre data-enscribe-dsl>. always-renders: the empty case converts to the visible asset-error
    // flag (the family voice at this exact seam) pointing at the supported mechanism, plus a located
    // seam warning. A node WITH body content (the engine source) keeps rendering it, src warns only.
    const src = node.kwargs?.src;
    const hasBody = (typeof node.content === 'string' && node.content.trim() !== '') ||
      (Array.isArray(node.content) && node.content.length > 0);
    if (src && !String(src).startsWith('@')) {
      const msg = `<diagram src="${src}">: file-path src is not loaded (by design) — source a <dataset> via src="@id" (diagram.md)`;
      file?.message?.(`asset-load: ${msg}`, node, 'asset:unsupported-src');
      if (!hasBody) assetError(node, String(src), msg);
    }
    return;                                                     // non-@ (body untouched) or already errored
  }
  const engine = node.positional?.[0] ?? null;
  if (engine && ds.format && ds.format !== engine) {
    assetError(node, ds.ref, `dataset "${ds.ref}" has format "${ds.format}", which does not match the diagram engine "${engine}" — a <diagram> reads engine source, not ${ds.format} data`);
    return;
  }
  node.content = ds.bytes;
  if (node.kwargs) delete node.kwargs.src;
}

/**
 * The `<code src="@id">` CONSUMER's resolution (#313 consumer wiring). Reads a stored
 * `<dataset>`'s opaque bytes and renders them as the VERBATIM code body (the string the code
 * handler otherwise takes from `node.content`). The dataset's format hint, when present and
 * the `<code>` names no `language`, seeds the `language-X` highlight class — a display hint
 * only; the bytes render verbatim either way (opacity is preserved end to end). Inline body
 * (a non-`@` `src`, or a `<code | …>` body) is untouched.
 */
function resolveCodeSrc(node, assets, file) {
  const ds = readDatasetSource(node, assets, 'code');
  if (ds == null) {
    // #423 (mirrors #421): a FILE-PATH src on inline <code> is unsupported BY DESIGN (the handler
    // reads no files; datasets via @id are the mechanism) — but it used to render a silent empty
    // <code></code>. always-renders: the empty case converts to the visible asset-error flag (the
    // family voice at this exact seam) pointing at the supported mechanism, plus a located seam
    // warning. A node WITH body content keeps rendering its body (visible), src warns only.
    const src = node.kwargs?.src;
    const hasBody = (typeof node.content === 'string' && node.content.trim() !== '') ||
      (Array.isArray(node.content) && node.content.length > 0);
    if (src && !String(src).startsWith('@')) {
      const msg = `<code src="${src}">: file-path src is not loaded (by design) — source a <dataset> via src="@id" (code.md)`;
      file?.message?.(`asset-load: ${msg}`, node, 'asset:unsupported-src');
      if (!hasBody) assetError(node, String(src), msg);
    }
    return;                                                     // non-@ (body untouched) or already errored
  }
  node.content = ds.bytes;
  if (node.kwargs) {
    if (ds.format && node.kwargs.language == null) node.kwargs.language = ds.format;
    delete node.kwargs.src;
  }
}

/**
 * The `<code-block src="@id">` CONSUMER's resolution (Option A — the code-indentation fix). Reads a
 * stored `<dataset>`'s opaque bytes and renders them through the code-block handler's `<pre><code>` —
 * the ONE path where the pipeline preserves author whitespace byte-for-byte, because the pretty-printer
 * (`formatHtml` / rehype-format) skips a `<pre>` subtree while it REFLOWS a bare `<code>` (see
 * `~/enscribe-reports/audit-code-indentation.md`, and the corrected comment in lib/format-html.js).
 * This is therefore the whitespace-safe home for a MULTI-LINE code dataset; `<code src="@id">` renders
 * inline `<code>` and collapses multi-line indentation (the lint below nudges authors here). The
 * dataset's format hint, when the `<code-block>` names no language, seeds the LEADING POSITIONAL —
 * a code-block's language is `positional[0]` (mirroring `<table>`/`<diagram>`), not a `language` kwarg
 * as on inline `<code>`. Inline body (a non-`@` `src`, or a `<code-block …>…</code-block>` body) is untouched.
 */
function resolveCodeBlockSrc(node, assets, file) {
  const ds = readDatasetSource(node, assets, 'code-block');
  if (ds == null) {
    // #421: a FILE-PATH src on <code-block> is unsupported BY DESIGN (the handler reads
    // no files; datasets via @id are the mechanism) — but it used to render a silent
    // empty <pre><code>. always-renders: the empty case converts to the visible
    // asset-error flag (the family voice at this exact seam) pointing at the supported
    // mechanism, plus a located seam warning. A node WITH body content keeps rendering
    // its body (visible), and the ignored src warns only.
    const src = node.kwargs?.src;
    const hasBody = (typeof node.content === 'string' && node.content.trim() !== '') ||
      (Array.isArray(node.content) && node.content.length > 0);
    if (src && !String(src).startsWith('@')) {
      const msg = `<code-block src="${src}">: file-path src is not loaded (by design) — source a <dataset> via src="@id" (code-block.md)`;
      file?.message?.(`asset-load: ${msg}`, node, 'asset:unsupported-src');
      if (!hasBody) assetError(node, String(src), msg);
    }
    return;                                                     // non-@ (body untouched) or already errored
  }
  node.content = ds.bytes;
  if ((node.positional == null || node.positional.length === 0) && ds.format) {
    node.positional = [ds.format];   // dataset format hint → the language positional (code-block reads positional[0])
  }
  if (node.kwargs) delete node.kwargs.src;
}

/**
 * Authoring lint (Option A — code-indentation). A bare `<code>` renders INLINE and its content is
 * reflowed by the pretty-printer (`formatHtml`), so per-line indentation is lost — whereas a
 * `<pre><code>` (the ``` sigil / `<code-block>` / `<code-block src="@id">`) preserves it byte-for-byte.
 * Per Option A (`<code>` is inline-only; authored code renders verbatim only through a code block),
 * this is neither silently reflowed nor silently rewritten: it emits a located, non-fatal build
 * warning (`file.message`) nudging the author to a code block. The code still renders unchanged. Fires
 * only for genuinely multi-line content — an interior newline after trimming the outer whitespace the
 * long form adds — so a single-line `<code>` (inline or long-form) stays quiet. Runs from the resolution
 * walk AFTER `resolveCodeSrc`, so a `<code src="@id">` that pulled a MULTI-LINE `<dataset>` is nudged too.
 */
function lintInlineCodeWhitespace(node, file) {
  if (!isEnscribeTag(node, 'code')) return;
  if (typeof node.content !== 'string' || !node.content.trim().includes('\n')) return;
  file?.message?.(
    'multi-line code in <code> loses its indentation (inline code is reflowed) — use a code block (<``` … ```> or <code-block src="@id"> for a dataset) so the code renders verbatim',
    node,
  );
}

/**
 * The `@id` RESOLUTION PASS (#313): resolve body `@id` references against the store built by
 * buildAssetIndex, dispatching each use-site to its CONSUMER. Every consumer calls the one
 * neutral resolveAssetReference and then interprets what it gets:
 *   - `<fig src="@id">`     → resolveFig (image: data: URI / path; a dataset ref → visible error)
 *   - `<table src="@id">`   → resolveTableSrc (hand the bytes to the table parser; a bad/non-tabular
 *      ref → the SAME visible __asset-error — F2.1 closed)
 *   - `<diagram src="@id">` → resolveDiagramSrc (dataset bytes become the engine source; a
 *      format hint that disagrees with the engine → visible error)
 *   - `<code src="@id">`    → resolveCodeSrc (dataset bytes become the verbatim INLINE code body)
 *   - `<code-block src="@id">` → resolveCodeBlockSrc (dataset bytes → `<pre><code>`, whitespace-preserving)
 * The code/code-block/diagram consumers share readDatasetSource for the resolve→bytes-or-error shape.
 * Runs BEFORE numbering, so a placed figure registers under its adopted id and an errored ref is turned
 * into a non-numbered __asset-error (never counted — this matters for the numbered `<diagram>` too).
 * Use-sites without an `@`-src are untouched (a non-@ table `src` is a file path; output is byte-identical).
 * A new consumer is a trivial new branch here — same resolveAssetReference, its own interpretation.
 *
 * The same walk carries the multi-line-`<code>` authoring lint (lintInlineCodeWhitespace), placed AFTER
 * the dispatch so a `<code src="@id">` resolved to multi-line dataset bytes is nudged like an authored one.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeAssetResolution() {
  return (tree, file) => {
    const assets = file?.data?.[ENSCRIBE_ASSETS] ?? null;
    const adopted = new Set();   // #190 slice 3: ids already adopted by a placement (re-placement is legitimate)

    const walk = (nodes) => {
      for (const node of nodes ?? []) {
        if (!node || typeof node !== 'object') continue;
        if (isEnscribeTag(node, 'fig')) resolveFig(node, assets, adopted);
        else if (isEnscribeTag(node, 'table')) resolveTableSrc(node, assets, file);
        else if (isEnscribeTag(node, 'diagram')) resolveDiagramSrc(node, assets, file);
        else if (isEnscribeTag(node, 'code')) resolveCodeSrc(node, assets, file);
        else if (isEnscribeTag(node, 'code-block')) resolveCodeBlockSrc(node, assets, file);
        // Authoring lint (Option A): warn on a multi-line bare <code> (inline code is reflowed, so its
        // indentation is lost). Runs AFTER resolveCodeSrc so a <code src="@id"> that just pulled a
        // multi-line dataset is nudged too. Non-destructive — a located build warning, no in-tree rewrite.
        lintInlineCodeWhitespace(node, file);
        if (isEnscribeTag(node) && Array.isArray(node.content)) walk(node.content);
        if (Array.isArray(node.children)) walk(node.children);
      }
    };
    walk(tree.children ?? []);
  };
}
