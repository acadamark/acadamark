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
 * Extract a `<dataset>`'s OPAQUE payload (#313 slice 1). A `<dataset>` is opaque
 * (`getContentHandler('dataset')` is non-`default`), so its `content` is the raw,
 * never-markdown-parsed body STRING. Trim only the OUTER whitespace — the `| ` pipe
 * delimiter leaves a leading space that is syntax, not data — exactly as `<library>`
 * (the sibling storage host) trims its payload. `String.trim()` touches only the ends,
 * so a `#`/`*`/`_` INSIDE the payload, and any internal indentation (e.g. pretty JSON),
 * survive untouched; no brace-strip (a JSON `{…}` keeps its braces, unlike an asset
 * base64 payload). The array branch is defensive only — opaque content is a string.
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
 *   - dataset         <dataset #id fmt | bytes>  → { format, content }  (#313)
 * A `<dataset>` is pure OPAQUE storage: its raw bytes are held under its id (with an
 * optional format hint) for an `@id` consumer to interpret later (slice 2). Nothing
 * renders or interprets it here — like an embedded asset declaration, it is stripped
 * from <data> (render-suppressed but still WALKED by numbering, so an un-stripped
 * declaration could perturb the walk).
 *
 * @param {{ children: Array }} tree
 * @param {import('vfile').VFile} file
 */
export function buildAssetIndex(tree, file) {
  const dataNodes = collectDataNodes(tree.children ?? []);
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
      const id = child.id ?? null;
      if (!id) {
        file?.message?.(`asset-load: <${child.tagname}> in <data> has no #id — not registered in the data store`, child);
        return true;                                          // malformed: leave it (and warn)
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
        // (`<dataset #id csv | …>` or `format=csv`), stored verbatim for an @id consumer.
        assets.set(id, { format: child.positional?.[0] ?? child.kwargs?.format ?? null, content: datasetPayload(child.content) });
      } else {
        // External (<fig #id src="path" />) vs embedded (<fig #id fmt>base64</fig>):
        // store the (already assembly-rebased) src for external, or the {format,
        // base64} for embedded. resolveFig resolves each accordingly.
        assets.set(id, child.kwargs?.src
          ? { src: child.kwargs.src }
          : { format: child.positional?.[0] ?? null, base64: collectAssetPayload(child.content) });
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
 * Resolve one <fig> whose src is an @id asset reference, in place. `adopted` is
 * the set of asset ids already claimed by an earlier placement this run.
 */
function resolveFig(node, assets, adopted) {
  const src = node.kwargs?.src;
  if (typeof src !== 'string' || !src.startsWith('@')) return;  // not an asset reference

  const id = src.slice(1);
  const ref = `@${id}`;
  const asset = assets?.get(id) ?? null;

  if (!asset) {
    assetError(node, ref, `no asset declared with id "${id}"`);
    return;
  }

  if (asset.src != null) {
    // External asset: the declared (assembly-rebased) path goes straight into the
    // <img src>. External is format-agnostic — the type follows from the path.
    node.kwargs.src = asset.src;
  } else {
    // Embedded asset: rewrite src to a data: URI built from the format flag.
    const mime = asset.format ? FORMAT_MIME[asset.format] : null;
    if (!mime) {
      assetError(node, ref, asset.format
        ? `unsupported embedded-asset format "${asset.format}" (supported: ${Object.keys(FORMAT_MIME).join(', ')})`
        : `embedded asset "${id}" has no format flag (e.g. png)`);
      return;
    }
    if (!asset.base64) {
      assetError(node, ref, `embedded asset "${id}" has no base64 payload`);
      return;
    }
    node.kwargs.src = `data:${mime};base64,${asset.base64}`;
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
 * Unified plugin: resolve body <fig src="@id"> references against the asset
 * store built by buildAssetIndex. Runs before numbering so the placed figure
 * registers under the adopted id. Figures without an @-src are untouched
 * (existing output is byte-identical).
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
        if (isEnscribeTag(node) && Array.isArray(node.content)) walk(node.content);
        if (Array.isArray(node.children)) walk(node.children);
      }
    };
    walk(tree.children ?? []);
  };
}
