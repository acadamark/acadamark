// asset-load plugin (#190) — the asset half of <data>, mirroring the citation
// half (library-load.js / buildCitationIndex).
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
// Scope (#190 foundation slice): single-file, embedded PNG only. Cross-file merge,
// external <fig #id src=…> assets, media types beyond png, and JATS <graphic>
// export are later slices. FORMAT_MIME below is the one extension point — adding a
// media type is a one-line entry there.

import { ENSCRIBE_ASSETS } from '../../core/file-data-keys.js';
import { isEnscribeTag } from '../lib/ast-helpers.js';
import { collectDataNodes } from './library-load.js';

// #190: the embedded-asset format flag → the image MIME type. PNG only for the
// foundation slice; jpg/jpeg/svg/gif/webp are a one-line add each when those land.
const FORMAT_MIME = {
  png: 'image/png',
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
function assetError(node, ref, message) {
  node.tagname = '__asset-error';
  node.kwargs = { ref: ref ?? '', message };
  node.content = null;
  node.id = null;
  node.positional = [];
  node.booleans = {};
  node.atRefs = [];
}

/**
 * Build the embedded-asset index from <fig> declarations inside <data> nodes,
 * and strip each harvested declaration from its <data>. Writes
 * file.data.enscribeAssets (a Map id → { format, base64 }). Runs at the index
 * stage before numbering. Does not touch <library> nodes (the citation index,
 * which ran first, owns those).
 *
 * @param {{ children: Array }} tree
 * @param {import('vfile').VFile} file
 */
export function buildAssetIndex(tree, file) {
  const dataNodes = collectDataNodes(tree.children ?? []);
  const assets = new Map();

  for (const dataNode of dataNodes) {
    if (!Array.isArray(dataNode.content)) continue;
    // Harvest embedded <fig #id fmt>base64</fig> declarations; strip them so the
    // render-suppressed declaration is not also counted by numbering.
    dataNode.content = dataNode.content.filter((child) => {
      if (!isEnscribeTag(child, 'fig')) return true;          // not an asset decl — leave it
      const id = child.id ?? null;
      if (!id) {
        file?.message?.('asset-load: <fig> in <data> has no #id — not registered as an asset', child);
        return true;                                          // malformed: leave it (and warn)
      }
      assets.set(id, { format: child.positional?.[0] ?? null, base64: collectAssetPayload(child.content) });
      return false;                                           // strip the declaration
    });
  }

  if (assets.size > 0) {
    file.data = file.data ?? {};
    file.data[ENSCRIBE_ASSETS] = assets;
  }
}

/** Resolve one <fig> whose src is an @id asset reference, in place. */
function resolveFig(node, assets) {
  const src = node.kwargs?.src;
  if (typeof src !== 'string' || !src.startsWith('@')) return;  // not an asset reference

  const id = src.slice(1);
  const ref = `@${id}`;
  const asset = assets?.get(id) ?? null;

  if (!asset) {
    assetError(node, ref, `no embedded asset declared with id "${id}"`);
    return;
  }
  const mime = asset.format ? FORMAT_MIME[asset.format] : null;
  if (!mime) {
    assetError(node, ref, asset.format
      ? `unsupported embedded-asset format "${asset.format}" (this slice supports: ${Object.keys(FORMAT_MIME).join(', ')})`
      : `embedded asset "${id}" has no format flag (e.g. png)`);
    return;
  }
  if (!asset.base64) {
    assetError(node, ref, `embedded asset "${id}" has no base64 payload`);
    return;
  }
  // Success: rewrite src to a data: URI; adopt the asset id onto the placed
  // figure (so it numbers + cross-references as that id) unless it already
  // carries an explicit id of its own.
  node.kwargs.src = `data:${mime};base64,${asset.base64}`;
  if (node.id == null) node.id = id;
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

    const walk = (nodes) => {
      for (const node of nodes ?? []) {
        if (!node || typeof node !== 'object') continue;
        if (isEnscribeTag(node, 'fig')) resolveFig(node, assets);
        if (isEnscribeTag(node) && Array.isArray(node.content)) walk(node.content);
        if (Array.isArray(node.children)) walk(node.children);
      }
    };
    walk(tree.children ?? []);
  };
}
