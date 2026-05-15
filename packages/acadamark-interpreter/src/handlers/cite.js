// Cite handlers — render __cite-marker, __cite-error, and __bibliography
// internal nodes to hast.
//
// These internal node types are produced by:
//   - cite-resolution.js  → __cite-marker, __cite-error
//   - bibliography.js     → __bibliography
//
// They are registered in interpret-plugin.js INTERNAL_REGISTRY.
//
// __cite-marker kwargs: { keys, html }
//   Renders: <cite class="cite" data-keys="...">FORMATTED HTML</cite>
//   The `html` string is citation-js output, e.g. "(Smith, 2020)".
//   It is emitted via a raw node to preserve HTML entities and markup
//   that citation-js may produce (e.g., <i> for journal names).
//
// __cite-error kwargs: { keys }
//   Renders: <cite class="cite-error" data-keys="...">??cite: KEY??</cite>
//   Visible error marker so authors see unresolved citations immediately.
//   No hover preview is attached to cite-error elements.
//
// __bibliography kwargs: { headingHtml, bibBodyHtml }
//   Renders: <bibliography><h2>References</h2>{bibBodyHtml}</bibliography>
//   bibBodyHtml is citation-js output with id="ref-KEY" injected on each entry.
//   Emitted as a raw node (allowDangerousHtml: true is already set by the compiler).

/**
 * Handler for __cite-marker nodes (resolved citations).
 *
 * @param {object} _state - mdast-util-to-hast state (unused)
 * @param {object} node   - acadamarkTag with tagname '__cite-marker'
 * @returns {import('hast').Element}
 */
export function citeMarkerHandler(_state, node) {
  const { keys, html } = node.kwargs;

  return {
    type: 'element',
    tagName: 'cite',
    properties: {
      className: ['cite'],
      dataKeys: keys,
    },
    children: [{ type: 'raw', value: html }],
  };
}

/**
 * Handler for __cite-error nodes (unresolved citation keys).
 *
 * @param {object} _state - mdast-util-to-hast state (unused)
 * @param {object} node   - acadamarkTag with tagname '__cite-error'
 * @returns {import('hast').Element}
 */
export function citeErrorHandler(_state, node) {
  const keys = node.kwargs?.keys ?? '(unknown)';

  return {
    type: 'element',
    tagName: 'cite',
    properties: {
      className: ['cite-error'],
      dataKeys: keys,
    },
    children: [{ type: 'text', value: `??cite: ${keys}??` }],
  };
}

/**
 * Handler for __bibliography nodes (the rendered bibliography block).
 *
 * @param {object} _state - mdast-util-to-hast state (unused)
 * @param {object} node   - acadamarkTag with tagname '__bibliography'
 * @returns {import('hast').Element}
 */
export function bibliographyHandler(_state, node) {
  const { headingHtml, bibBodyHtml } = node.kwargs;

  return {
    type: 'element',
    tagName: 'bibliography',
    properties: {},
    children: [
      { type: 'raw', value: headingHtml + bibBodyHtml },
    ],
  };
}
