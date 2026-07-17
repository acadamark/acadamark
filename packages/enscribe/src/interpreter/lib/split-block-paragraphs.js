// Split block content out of paragraphs (#464 — the #442 class in normal flow).
//
// A markdown paragraph that contains a block-level construct authored inline —
// `text <aside …> text`, an inline `<fig>`, an injected asset-error box, a diagram —
// is rendered by the default mdast→hast conversion as a single `<p>` wrapping the block.
// A spec-conformant HTML parser then CLOSES the `<p>` at the block and EJECTS it (the
// p-in-button-scope rule), so the serialized markup looks nested but every browser tears
// it apart (the #442 mechanism, here in ordinary document flow). The validity gate
// (validity-html.test.js) catches exactly this.
//
// This pass makes enscribe emit the valid shape the browser would produce anyway: for
// every `<p>` holding content a browser would eject, the paragraph is split so each
// ejected block becomes a SIBLING of the paragraph — `<p>before</p><block/><p>after</p>`
// — with empty/whitespace-only paragraph fragments dropped. Because it emits what the
// browser repairs to, the rendered result is visually unchanged (proven per shape in the
// slice report by comparing the new emission against parse5's reading of the old output).
//
// The predicate is EXACTLY "would a browser eject this from a `<p>`", not "is this
// display:block". Those differ: a `<display-math>` renders as a block box but is a custom
// element a browser keeps INSIDE the `<p>` (no restructuring — valid HTML), as is an
// authored-in-prose mention of `<config>` / `<meta>`. Splitting around those would fragment
// valid prose for no reason. A browser ejects a child iff that child IS an HTML p-closer
// (the WHATWG p-in-button-scope list — mirrored from the gate's P_CLOSERS so the two cannot
// disagree) OR it CONTAINS a p-closer descendant (which closes the `<p>` and drags the child
// out with it). Everything else stays. So this pass restructures a `<p>` on exactly the
// inputs the gate flags — and a seventh block construct is covered by construction.

// The HTML elements whose start tag closes an open `<p>` (WHATWG §13.2.6.4.7) — the same
// set the validity gate uses. A stable HTML fact, not an enscribe list; kept in lockstep.
const P_CLOSERS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
  'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'ul',
]);

/**
 * Would a browser EJECT this node from an enclosing `<p>`? True iff the node is an HTML
 * p-closer, or (transparently through `{type:'root'}` fragments and non-p-closer wrappers)
 * has a p-closer descendant. Text / comments / raw and inline elements return false.
 *
 * @param {import('hast').Node} node
 * @returns {boolean}
 */
export function ejectsFromParagraph(node) {
  if (node.type === 'root') return (node.children ?? []).some(ejectsFromParagraph);
  if (node.type !== 'element') return false;
  if (P_CLOSERS.has(node.tagName)) return true;
  return (node.children ?? []).some(ejectsFromParagraph);
}

/** True if an inline run carries anything visible (drop empty / whitespace-only fragments). */
function runHasContent(run) {
  return run.some((n) => n.type !== 'text' || n.value.trim() !== '');
}

/**
 * Flatten transparent `{type:'root'}` fragments into their children. A handler that emits
 * a multi-node result (a diagram → `<pre>` + `<figcaption>`) returns a hast `root`, which
 * mdast-util-to-hast embeds inside the paragraph and hast-util-to-html serializes by emitting
 * its children — so a root inside a `<p>` effectively inlines them. Flattening lets the split
 * treat each as a paragraph-level child. Byte-neutral (a root is transparent in serialization).
 *
 * @param {import('hast').Node[]} children
 * @returns {import('hast').Node[]}
 */
function flattenRoots(children) {
  const out = [];
  for (const c of children ?? []) {
    if (c.type === 'root') out.push(...flattenRoots(c.children));
    else out.push(c);
  }
  return out;
}

/**
 * Split one `<p>` into an alternating sequence of paragraph fragments (carrying the original
 * `<p>`'s tagName + properties) and the ejected block siblings.
 * @param {import('hast').Element} p
 * @returns {import('hast').Node[]}
 */
function splitParagraph(p) {
  const out = [];
  let run = [];
  const flushRun = () => {
    if (runHasContent(run)) out.push({ ...p, children: run });
    run = [];
  };
  for (const child of flattenRoots(p.children)) {
    if (ejectsFromParagraph(child)) { flushRun(); out.push(child); }
    else run.push(child);
  }
  flushRun();
  return out;
}

/**
 * Walk the hast tree and split every `<p>` that holds content a browser would eject. Bottom-up
 * so a block pulled out of a paragraph has already had its own inner paragraphs corrected.
 * Mutates in place. Byte-identical for a document with no ejectable content in a paragraph.
 *
 * @param {import('hast').Node} node - a hast node (root or element).
 */
export function splitBlockParagraphs(node) {
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) splitBlockParagraphs(child);
  const next = [];
  for (const child of node.children) {
    if (child.type === 'element' && child.tagName === 'p' && flattenRoots(child.children).some(ejectsFromParagraph)) {
      next.push(...splitParagraph(child));
    } else {
      next.push(child);
    }
  }
  node.children = next;
}
