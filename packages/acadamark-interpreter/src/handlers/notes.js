// Note handlers — render internal note nodes created by the notes plugin.
//
// Handler functions correspond to internal node types:
//
//   __note-marker    → <sup id="noteref-N" data-note-id="ID"><a href="#ID">N</a></sup>
//   __note-list      → <note-list class="..."><ol>...</ol></note-list>
//   __note-list-item → <li id="ID" [class="sidenote-fallback"]>
//                        <sup>N</sup> content...
//                        <a href="#noteref-N" class="note-backref">↩</a>
//                      </li>
//
// These nodes are created only by the acadamarkNotes plugin (not by authors).
// They do not have vocabulary entries; they are dispatched via the
// INTERNAL_REGISTRY in interpret-plugin.js before the vocabulary lookup.
//
// note-list uses a dedicated __note-list internal type (not the schema-
// dispatched 'note-list' tagname) so we can control the <ol> wrapper without
// modifying the vocabulary entry or the schema dispatcher.

/**
 * Convert an array of mdast nodes to hast children using the toHast state.
 * Same pattern as convertContent() in interpret-plugin.js.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} parentNode - parent node (for state.one positioning)
 * @param {Array} nodes - array of mdast/acadamarkTag nodes to convert
 * @returns {Array} hast child nodes
 */
function convertNodes(state, parentNode, nodes) {
  return (nodes ?? []).flatMap(child => {
    const h = state.one(child, parentNode);
    if (h == null) return [];
    return Array.isArray(h) ? h : [h];
  });
}

/**
 * Note marker handler.
 * Produces: <sup id="noteref-N" data-note-id="ID"><a href="#ID">N</a></sup>
 *
 * @param {object} _state - unused (no child content to convert)
 * @param {object} node - acadamarkTag with tagname '__note-marker'
 * @returns {import('hast').Element}
 */
export function noteMarkerHandler(_state, node) {
  const { noteId, number, refId } = node.kwargs;
  return {
    type: 'element',
    tagName: 'sup',
    properties: {
      id: refId,
      dataNoteId: noteId,
    },
    children: [
      {
        type: 'element',
        tagName: 'a',
        properties: { href: `#${noteId}` },
        children: [{ type: 'text', value: String(number) }],
      },
    ],
  };
}

/**
 * Note list handler.
 * Produces: <note-list class="..."><ol>items...</ol></note-list>
 *
 * The <ol> uses list-style: none (applied via bundled CSS) because the visible
 * numbering is provided by <sup>N</sup> inside each <li>.
 *
 * @param {object} state
 * @param {object} node - acadamarkTag with tagname '__note-list'
 * @returns {import('hast').Element}
 */
export function noteListHandler(state, node) {
  const liChildren = convertNodes(state, node, node.content);
  return {
    type: 'element',
    tagName: 'note-list',
    properties: {
      className: node.classes,
    },
    children: [
      {
        type: 'element',
        tagName: 'ol',
        properties: {},
        children: liChildren,
      },
    ],
  };
}

/**
 * Note list-item handler.
 * Produces:
 *   <li id="ID" [class="sidenote-fallback"]>
 *     <sup>N</sup> content...
 *     <a href="#noteref-N" class="note-backref" aria-label="back to text">↩</a>
 *   </li>
 *
 * When kwargs.sidenote is true, adds class="sidenote-fallback" to the <li>.
 * This marks items originally authored as placement=side, allowing future
 * margin-positioning themes to extract and reposition them.
 *
 * @param {object} state
 * @param {object} node - acadamarkTag with tagname '__note-list-item'
 * @returns {import('hast').Element}
 */
export function noteListItemHandler(state, node) {
  const { number, refId, sidenote } = node.kwargs;
  const contentChildren = convertNodes(state, node, node.content);

  const props = { id: node.id };
  if (sidenote) props.className = ['sidenote-fallback'];

  return {
    type: 'element',
    tagName: 'li',
    properties: props,
    children: [
      {
        type: 'element',
        tagName: 'sup',
        properties: {},
        children: [{ type: 'text', value: String(number) }],
      },
      { type: 'text', value: ' ' },
      ...contentChildren,
      { type: 'text', value: ' ' },
      {
        type: 'element',
        tagName: 'a',
        properties: {
          href: `#${refId}`,
          className: ['note-backref'],
          ariaLabel: 'back to text',
        },
        children: [{ type: 'text', value: '↩' }],
      },
    ],
  };
}
