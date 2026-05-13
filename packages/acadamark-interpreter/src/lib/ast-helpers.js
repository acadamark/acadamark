// AST helper utilities for the acadamark interpreter structural plugins.
//
// These helpers create and query acadamarkTag nodes — the node type produced by
// remark-acadamark and consumed by the interpreter's structural plugins and
// mdast-to-hast handler.

/**
 * Create a well-formed acadamarkTag node.
 *
 * @param {string} tagname
 * @param {Array} [content] - child nodes (mdast or acadamarkTag)
 * @param {object} [attrs]
 * @param {string|null} [attrs.id]
 * @param {string[]} [attrs.classes]
 * @param {object} [attrs.kwargs]
 * @returns {import('mdast').Node}
 */
export function makeTag(tagname, content = [], { id = null, classes = [], kwargs = {} } = {}) {
  return {
    type: 'acadamarkTag',
    tagname,
    id,
    classes,
    kwargs,
    content,
    contentHandler: 'default',
    isOpaqueContent: false,
  };
}

/**
 * Return true if node is an acadamarkTag, optionally matching a specific
 * tagname (string) or one of several tagnames (string[]).
 */
export function isAcadamarkTag(node, name) {
  if (!node || node.type !== 'acadamarkTag') return false;
  if (name == null) return true;
  if (Array.isArray(name)) return name.includes(node.tagname);
  return node.tagname === name;
}

/**
 * Return the section nesting depth of a node: 1 for section, 2 for
 * sub-section, 3 for sub-sub-section, 0 for anything else.
 */
export function sectionDepth(node) {
  if (!isAcadamarkTag(node)) return 0;
  if (node.tagname === 'section') return 1;
  if (node.tagname === 'sub-section') return 2;
  if (node.tagname === 'sub-sub-section') return 3;
  return 0;
}

/**
 * Return the first node in an array that matches the given tagname, or null.
 */
export function findTag(nodes, name) {
  return nodes.find(n => isAcadamarkTag(n, name)) ?? null;
}

/**
 * Return all nodes in an array that match the given tagname.
 */
export function findAllTags(nodes, name) {
  return nodes.filter(n => isAcadamarkTag(n, name));
}

/**
 * Recursively collect all plain-text values in a node tree (traverses both
 * .content and .children). Used to compute alt-text fallbacks.
 */
export function extractPlainText(nodes) {
  if (!nodes || !Array.isArray(nodes)) return '';
  let text = '';
  for (const node of nodes) {
    if (!node) continue;
    if (node.type === 'text') {
      text += node.value ?? '';
    } else if (node.children && Array.isArray(node.children)) {
      text += extractPlainText(node.children);
    } else if (node.content && Array.isArray(node.content)) {
      text += extractPlainText(node.content);
    }
  }
  return text.trim();
}
