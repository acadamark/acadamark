// Ref handlers — render __ref-marker and __ref-error internal nodes to hast.
//
// These internal node types are produced by the ref-resolution plugin, which
// runs before hast conversion. The handlers here are registered in
// interpret-plugin.js under the INTERNAL_REGISTRY.
//
// __ref-marker kwargs: { targetId, text }
//   Renders: <a href="#targetId" class="ref">TEXT</a>
//   where TEXT is pre-computed by ref-resolution: "equation 3", "figure 1",
//   "note 2", or label-tail for unnumbered labeled targets.
//
// __ref-error kwargs: { targetId }
//   Renders: <a href="#targetId" class="ref-error">??ref: targetId??</a>
//   Visible in the output so authors see unresolved refs immediately.

/**
 * Handler for __ref-marker nodes (successfully resolved cross-references).
 *
 * @param {object} _state - mdast-util-to-hast state (unused)
 * @param {object} node   - acadamarkTag with tagname '__ref-marker'
 * @returns {import('hast').Element}
 */
export function refMarkerHandler(_state, node) {
  const { targetId, text } = node.kwargs;

  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href: `#${targetId}`,
      className: ['ref'],
    },
    children: [{ type: 'text', value: text }],
  };
}

/**
 * Handler for __ref-error nodes (unresolved cross-references).
 *
 * @param {object} _state - mdast-util-to-hast state (unused)
 * @param {object} node   - acadamarkTag with tagname '__ref-error'
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

