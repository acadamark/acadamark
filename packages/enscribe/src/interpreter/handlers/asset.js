// Asset handler (#190) — renders the internal __asset-error node, the
// always-renders counterpart to __library-error for the embedded-asset half of
// <data>. An unresolved <fig src="@id"> (no such asset / unsupported format /
// empty payload) becomes a visible block naming the reference rather than a
// broken <img src="@…">. Mirrors libraryErrorHandler (handlers/cite.js).

/**
 * Handler for __asset-error nodes (#190): a <fig src="@id"> that could not be
 * resolved against the <data> embedded-asset store. always-renders: a visible
 * block naming the reference, never a broken @-src <img>. Produced in place of
 * the <fig> by enscribeAssetResolution (plugins/asset-load.js).
 *
 * @param {object} _state - mdast-util-to-hast state (unused)
 * @param {object} node   - enscribeTag with tagname '__asset-error'
 * @returns {import('hast').Element}
 */
export function assetErrorHandler(_state, node) {
  const ref = node.kwargs?.ref ?? '';
  const message = node.kwargs?.message ?? 'asset reference could not be resolved';
  const label = ref ? `could not resolve asset reference ${ref}: ${message}` : message;
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['enscribe-asset-error'],
      role: 'alert',
      ...(ref ? { dataRef: ref } : {}),
    },
    children: [{ type: 'text', value: `⚠ ${label}` }],
  };
}
