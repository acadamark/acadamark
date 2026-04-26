/**
 * @import {Root, Element, ElementContent, RootContent} from 'hast'
 */

/**
 * The acadamark section depth ladder. Depth is determined entirely by the
 * tag name — heading levels (h1..h6) are not consulted. This matches the
 * LaTeX model where \section, \subsection, \subsubsection are distinct
 * commands rather than one command at different depths.
 *
 * If you ever need depth 4+, add `'sub-sub-sub-section': 4` here. The
 * algorithm scales with no other changes.
 *
 * @type {Record<string, number>}
 */
const SECTION_DEPTHS = {
  'section': 1,
  'sub-section': 2,
  'sub-sub-section': 3,
};

/**
 * Rehype plugin: nest flat acadamark section elements based on the named
 * depth ladder.
 *
 * Input: a tree where <section>, <sub-section>, and <sub-sub-section>
 * elements appear as siblings. The author writes them flat — like LaTeX's
 * \section{}, which doesn't require explicit closing.
 *
 * Output: a tree where deeper sections nest inside shallower ones. A
 * <sub-section> nests inside the preceding <section>; a <sub-sub-section>
 * nests inside the preceding <sub-section>; and so on. A new section at
 * the same or shallower depth closes any deeper open sections.
 *
 * Non-section content (paragraphs, figures, etc.) attaches to the
 * currently-deepest open section. Content before the first section stays
 * at the top level.
 *
 * The plugin recurses into all container elements (article, body, etc.)
 * so flat sections work whether they're at the root or wrapped.
 *
 * The plugin is idempotent: running it on already-nested input is a no-op.
 *
 * Plain HTML headings (<h1>..<h6>) and hand-nested <section> elements with
 * heading children are deliberately NOT treated specially. This plugin
 * operates on acadamark Layer 1 (semantic) HTML, where depth is named.
 * Heading-level-driven nesting belongs to a separate concern (markdown
 * input via remark-rehype, or render-mode lowering).
 */
export default function rehypeSectionNesting() {
  /**
   * @param {Root} tree
   */
  return function transform(tree) {
    tree.children = nestSections(tree.children);
  };
}

/**
 * Restructure a flat list of children so that section-like elements nest
 * based on their depth in SECTION_DEPTHS. Recurses into non-section
 * elements (article, body, div, main, ...) so flat sections inside any
 * container get nested too.
 *
 * @template {RootContent | ElementContent} T
 * @param {T[]} children
 * @returns {T[]}
 */
function nestSections(children) {
  /** @type {T[]} */
  const result = [];

  // Stack of currently-open sections. The deepest open section is at the
  // top. Each entry pairs the section element with its depth from the
  // ladder.
  /** @type {Array<{ section: Element, depth: number }>} */
  const stack = [];

  for (const child of children) {
    const depth = sectionDepth(child);

    if (depth !== null) {
      // It's a section-like element. Recurse into its existing children
      // first so the plugin is idempotent on already-nested input.
      const sectionEl = /** @type {Element} */ (child);
      sectionEl.children = nestSections(sectionEl.children);

      // Pop any open sections at this depth or deeper. A new <section>
      // closes any open <sub-section>, <sub-sub-section>, etc.
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      attachToCurrent(child, stack, result);
      stack.push({ section: sectionEl, depth });
    } else {
      // Non-section content. Recurse into containers so nested flat
      // sections still get nested.
      if (child.type === 'element') {
        child.children = nestSections(child.children);
      }
      attachToCurrent(child, stack, result);
    }
  }

  return result;
}

/**
 * Attach a node to the currently-open section if there is one, otherwise
 * to the result list (top level of the current scope).
 *
 * @template {RootContent | ElementContent} T
 * @param {T} node
 * @param {Array<{ section: Element, depth: number }>} stack
 * @param {T[]} result
 */
function attachToCurrent(node, stack, result) {
  if (stack.length === 0) {
    result.push(node);
  } else {
    const parent = stack[stack.length - 1].section;
    /** @type {ElementContent[]} */ (parent.children).push(
      /** @type {ElementContent} */ (node),
    );
  }
}

/**
 * Return the depth of a section-like element, or null if the node isn't
 * a section-like element at all.
 *
 * @param {RootContent | ElementContent} node
 * @returns {number | null}
 */
function sectionDepth(node) {
  if (node.type !== 'element') return null;
  const depth = SECTION_DEPTHS[node.tagName];
  return depth ?? null;
}
