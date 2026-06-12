// Cross-reference registry harvest (lazy live book rendering, L1 — #204).
//
// A book's GLOBAL pass (proc.runSync) numbers every referenceable target and
// resolves every <ref> against the numbering registry (core/registry.js, on
// file.data.enscribeRegistry) — WITHOUT rendering. This harvests that registry,
// plus titles read off the tree, into a self-contained Map:
//
//   anchor (colon-id)  ->  { number, title, type }
//
// It is a READ-ONLY product of the global pass for the per-chapter render and the
// L3 cross-chapter preview: a cross-chapter <ref> whose target chapter is never
// rendered still has its number+title here. It reuses numbering's output and NEVER
// re-numbers — `number` is formatted exactly as a cross-reference renders it (via
// formatScopedNumber), so a harvested number equals the cross-ref text.

import { ENSCRIBE_REGISTRY, ENSCRIBE_CROSSREF_REGISTRY } from '../../core/file-data-keys.js';
import { formatScopedNumber } from './scoped-number.js';
import { isEnscribeTag } from './ast-helpers.js';

const TITLE_TAG_RE = /-title$/;
const clean = (s) => s.replace(/\s+/g, ' ').trim();

/** Concatenated text of an enscribe/mdast node's content (string or inline array). */
function nodeText(node) {
  if (node == null) return '';
  if (node.type === 'text') return node.value ?? '';
  if (typeof node.content === 'string') return node.content;
  const kids = Array.isArray(node.content) ? node.content : (node.children ?? []);
  return kids.map(nodeText).join('');
}

/**
 * The title/caption text of a referenceable node, number-free (the section-number
 * is a hast-render artifact added by schemaDispatch, never present in the mdast
 * title). Sections/book-parts: the `*-title` element (a direct child, or inside a
 * synthesized `<meta>`). Floats (fig/table/equation/…): the caption is the node's
 * own pipe content.
 */
function titleOf(node) {
  const kids = Array.isArray(node.content) ? node.content : [];
  for (const c of kids) {
    if (isEnscribeTag(c) && TITLE_TAG_RE.test(c.tagname)) return clean(nodeText(c));
  }
  for (const c of kids) {
    if (isEnscribeTag(c, 'meta')) {
      for (const g of (Array.isArray(c.content) ? c.content : [])) {
        if (isEnscribeTag(g) && TITLE_TAG_RE.test(g.tagname)) return clean(nodeText(g));
      }
    }
  }
  return clean(nodeText(node));
}

/**
 * Harvest the cross-reference registry from a numbered tree (proc.runSync output).
 *
 * Walks the tree for every colon-id anchor, looks each up in the numbering registry
 * (file.data.enscribeRegistry) for its number + scope + type, and reads its title
 * off the node. The anchor set is exactly the registry's label index (every
 * referenceable target), since the registry was built from these same nodes.
 *
 * `chapter` records the id of the enclosing `<book-part>` (the chapter that OWNS the
 * anchor), or null for an anchor outside any book-part (an article, or book front/
 * back-matter without one). This is the field the separate-pages publisher (P1) and
 * the lazy live path (L2/L3) need to resolve a cross-CHAPTER reference to the page /
 * chapter that owns it. It reads `book-part.id` — anchorless book-parts give null, so
 * a publisher that needs cross-page ownership assigns book-part ids before harvesting.
 *
 * @param {object} tree - the numbered mdast tree
 * @param {object} file - the VFile carrying file.data[ENSCRIBE_REGISTRY]
 * @returns {Map<string, {number: string|null, title: string, type: string, chapter: string|null}>}
 *   also stored on file.data[ENSCRIBE_CROSSREF_REGISTRY]
 */
export function harvestCrossRefRegistry(tree, file) {
  const registry = file?.data?.[ENSCRIBE_REGISTRY] ?? null;
  const out = new Map();

  if (registry) {
    const visit = (node, chapter) => {
      if (node == null) return;
      // Entering a book-part sets the owning chapter for everything inside it.
      const owner = (isEnscribeTag(node, 'book-part')) ? (node.id ?? null) : chapter;
      if (isEnscribeTag(node) && typeof node.id === 'string' && node.id.includes(':') && !out.has(node.id)) {
        const entry = registry.findByLabel(node.id);
        if (entry) {
          out.set(node.id, {
            // formatScopedNumber is the single source of truth computeRefText uses,
            // so the harvested number is exactly the cross-ref display number.
            number: formatScopedNumber(entry.number, entry.data?.scope),
            title: titleOf(node),
            type: entry.type,
            chapter: owner,
          });
        }
      }
      const content = Array.isArray(node.content) ? node.content : null;
      if (content && !node.isOpaqueContent) for (const c of content) visit(c, owner);
      if (Array.isArray(node.children)) for (const c of node.children) visit(c, owner);
    };
    visit(tree, null);
  }

  if (file?.data) file.data[ENSCRIBE_CROSSREF_REGISTRY] = out;
  return out;
}
