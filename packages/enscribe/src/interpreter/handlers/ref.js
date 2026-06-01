// Ref handlers — render __ref-marker and __ref-error internal nodes to hast.
//
// These internal node types are produced by the ref-resolution plugin, which
// runs before hast conversion. The handlers here are registered in
// interpret-plugin.js under the INTERNAL_REGISTRY.
//
// __ref-marker kwargs (post-2026-05-25 apparatus-tag reconciliation):
//   targetId    — id of the referenced element
//   text        — pre-computed display text ("equation 3", "figure 1", etc.)
//   refType     — author-supplied type= kwarg (or null); flows to data-ref-type
//   refFormat   — author-supplied format= kwarg (or null); flows to data-ref-format
//   linkFlag    — true (default) emits <a>; false (-link) emits <span>
//   previewFlag — true (default) allows hover-preview; false (-preview) adds
//                 data-no-preview="true" so hover-preview.js skips attachment
//
//   Renders: <a href="#targetId" class="ref" [data-*]>TEXT</a>
//        or  <span class="ref" [data-*]>TEXT</span>      (when -link)
//
// __ref-error kwargs: { targetId }
//   Renders: <a href="#targetId" class="ref-error">??ref: targetId??</a>
//   Visible in the output so authors see unresolved refs immediately.

/**
 * Handler for __ref-marker nodes (successfully resolved cross-references).
 *
 * @param {object} _state - mdast-util-to-hast state (unused)
 * @param {object} node   - enscribeTag with tagname '__ref-marker'
 * @returns {import('hast').Element}
 */
export function refMarkerHandler(_state, node) {
  const { targetId, text, refType, refFormat, linkFlag, previewFlag } = node.kwargs;

  // -link emits a <span> (plain text rendering, no navigable anchor).
  if (linkFlag === false) {
    const properties = { className: ['ref'] };
    if (refType) properties['data-ref-type'] = refType;
    if (refFormat) properties['data-ref-format'] = refFormat;
    if (previewFlag === false) properties['data-no-preview'] = 'true';
    return {
      type: 'element',
      tagName: 'span',
      properties,
      children: [{ type: 'text', value: text }],
    };
  }

  // Default: emit an <a> anchor. Property order preserves the pre-2026-05-25
  // shape (href, className) so existing snapshots stay byte-identical when no
  // new kwargs / flags are authored.
  const properties = {
    href: `#${targetId}`,
    className: ['ref'],
  };
  if (refType) properties['data-ref-type'] = refType;
  if (refFormat) properties['data-ref-format'] = refFormat;
  if (previewFlag === false) properties['data-no-preview'] = 'true';
  return {
    type: 'element',
    tagName: 'a',
    properties,
    children: [{ type: 'text', value: text }],
  };
}

/**
 * Handler for __ref-error nodes (unresolved cross-references).
 *
 * @param {object} _state - mdast-util-to-hast state (unused)
 * @param {object} node   - enscribeTag with tagname '__ref-error'
 * @returns {import('hast').Element}
 */
export function refErrorHandler(_state, node) {
  const targetId = node.kwargs?.targetId ?? '(unknown)';

  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href: `#${targetId}`,
      className: ['ref-error'],
    },
    children: [{ type: 'text', value: `??ref: ${targetId}??` }],
  };
}

