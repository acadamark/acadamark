// acadamark-jats-export — Layer 1 → JATS XML.
//
// Phase 5 slice 5a (2026-05-29): foundation slice. Implements minimal
// article export: article scaffolding (article wrapper + title-group +
// front/body/back regions), paragraphs, inline text formatting
// (italic, bold, underline, strikethrough, sub, sup), and section
// nesting. Frameables / lists / math / theorem family / cross-refs /
// notes / bibliography / external DSLs are slices 5b–5d.
//
// CONSUMES: the post-stage-3 mdast tree produced by
// `acadamark-interpreter`'s structural plugins (per Phase 5 Phase 0
// findings Q1.5 — post-stage-3 is the right input because the tree is
// already JATS-shaped after `acadamarkArticleStructuring` /
// `acadamarkBookStructuring` + section nesting). The slice 5a entry
// point `acadamarkToJats` accepts a tree (mdast root) + options and
// returns a JATS XML string.
//
// ATTRIBUTE MAPPING: delegated to `acadamark-core`'s `mapAttributes`
// (the deferred lift from `6ae6844` that landed in this slice; JATS
// export is the second consumer the deferral waited for). The JATS
// side passes `target = 'jats'` + the `jatsEmit` callback; vocab
// `maps_to.jats` declarations drive the per-attribute renaming.
//
// XML EMISSION: direct string assembly. Slice 5a's scope is small
// enough that a string builder is the right shape; an external XML
// library would add a dependency without simplifying the small set of
// element types the slice covers. Slices 5b–5d may revisit if the
// builder becomes unwieldy as more elements land.
//
// JATS TARGET: 1.3 Archiving and Interchange Tag Set (per Phase 5
// Phase 0 findings Q1.3 recommendation: widest validator support,
// most permissive tag set).

import { VOCABULARY } from 'layer1-vocabulary';
import { mapAttributes } from 'acadamark-core/map-attributes';
import { jatsEmit, aggregateJatsAttrs } from './lib/jats-emit.js';

const JATS_DOCTYPE_DECL =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD v1.3 20210610//EN" ' +
  '"https://jats.nlm.nih.gov/archiving/1.3/JATS-archivearticle1-3.dtd">\n';

/**
 * Export the post-stage-3 mdast tree to JATS XML.
 *
 * @param {object} tree - mdast root, post-stage-3 (acadamark-interpreter
 *                         structural plugins already ran).
 * @param {object} [opts]
 * @param {string} [opts.articleType='research-article'] - JATS
 *                  article-type attribute default. Article-meta values
 *                  override this if present.
 * @param {string} [opts.lang='en'] - default xml:lang on the <article>
 *                  element.
 * @returns {string} JATS XML serialization.
 */
export function acadamarkToJats(tree, opts = {}) {
  const articleType = opts.articleType ?? 'research-article';
  const lang = opts.lang ?? 'en';

  const articleNode = findTagInChildren(tree.children, 'article');
  if (!articleNode) {
    // No article wrapper — defensive. Wrap whatever's at root in a
    // minimal <article> for export. (Slice 5c's BITS book support
    // will add the <book> branch.)
    return JATS_DOCTYPE_DECL +
      `<article article-type="${articleType}" xml:lang="${lang}" dtd-version="1.3">\n` +
      `  <body/>\n` +
      `</article>\n`;
  }

  return JATS_DOCTYPE_DECL +
    emitArticle(articleNode, articleType, lang);
}

// ─── Element emission ─────────────────────────────────────────────────────

function emitArticle(article, articleType, lang) {
  const attrs = ` article-type="${articleType}" xml:lang="${lang}" dtd-version="1.3"`;
  const front = findInArticleContent(article, 'article-front');
  const body  = findInArticleContent(article, 'article-body');
  const back  = findInArticleContent(article, 'article-back');

  let out = `<article${attrs}>\n`;
  if (front) out += emitFront(front);
  if (body)  out += emitBody(body);
  if (back)  out += emitBack(back);
  out += `</article>\n`;
  return out;
}

function emitFront(frontNode) {
  // JATS <front> contains <article-meta>. The acadamark <article-front>
  // contains <meta>; we emit the <meta>'s content as <article-meta>.
  const meta = findInContent(frontNode, 'meta');
  if (!meta) return `  <front><article-meta/></front>\n`;
  return `  <front>\n    <article-meta>\n${emitArticleMetaChildren(meta, 6)}    </article-meta>\n  </front>\n`;
}

function emitArticleMetaChildren(metaNode, indent) {
  // Group title and subtitle into <title-group>; emit author lifted to
  // <contrib-group>; abstract directly; other lifted children as their
  // JATS counterparts via vocab lookup.
  const pad = ' '.repeat(indent);
  const content = Array.isArray(metaNode.content) ? metaNode.content : [];

  const titleNode    = content.find(c => isAcadamarkTag(c, 'article-title'));
  const subtitleNode = content.find(c => isAcadamarkTag(c, 'article-subtitle'));
  const authorNodes  = content.filter(c => isAcadamarkTag(c, 'author'));
  const abstractNode = content.find(c => isAcadamarkTag(c, 'abstract'));
  const otherChildren = content.filter(c =>
    !isAcadamarkTag(c, 'article-title') &&
    !isAcadamarkTag(c, 'article-subtitle') &&
    !isAcadamarkTag(c, 'author') &&
    !isAcadamarkTag(c, 'abstract')
  );

  let out = '';
  if (titleNode || subtitleNode) {
    out += `${pad}<title-group>\n`;
    if (titleNode) {
      out += `${pad}  <article-title>${emitInlines(titleNode.content)}</article-title>\n`;
    }
    if (subtitleNode) {
      out += `${pad}  <subtitle>${emitInlines(subtitleNode.content)}</subtitle>\n`;
    }
    out += `${pad}</title-group>\n`;
  }
  if (authorNodes.length > 0) {
    out += `${pad}<contrib-group>\n`;
    for (const author of authorNodes) {
      out += `${pad}  <contrib contrib-type="author">\n`;
      out += `${pad}    <string-name>${escapeXml(extractText(author.content))}</string-name>\n`;
      out += `${pad}  </contrib>\n`;
    }
    out += `${pad}</contrib-group>\n`;
  }
  if (abstractNode) {
    out += `${pad}<abstract>\n${emitBodyChildren(abstractNode.content, indent + 2)}${pad}</abstract>\n`;
  }
  // Other lifted children (doi, date, license, etc.) — emit by vocab
  // lookup. For slice 5a's minimal scope this is best-effort: emit the
  // JATS counterpart element if vocab declares one; skip if not.
  for (const child of otherChildren) {
    if (!isAcadamarkTagNode(child)) continue;
    const vocab = VOCABULARY[child.tagname];
    const jatsEl = vocab?.jats_counterpart?.element;
    if (jatsEl) {
      const text = extractText(child.content);
      out += `${pad}<${jatsEl}>${escapeXml(text)}</${jatsEl}>\n`;
    }
  }
  return out;
}

function emitBody(bodyNode) {
  return `  <body>\n${emitBodyChildren(bodyNode.content, 4)}  </body>\n`;
}

function emitBack(backNode) {
  return `  <back>\n${emitBodyChildren(backNode.content, 4)}  </back>\n`;
}

function emitBodyChildren(children, indent) {
  let out = '';
  for (const child of children ?? []) {
    out += emitBlock(child, indent);
  }
  return out;
}

function emitBlock(node, indent) {
  const pad = ' '.repeat(indent);
  if (!isAcadamarkTagNode(node)) {
    // mdast paragraph etc. — handle paragraph; skip unknown.
    if (node.type === 'paragraph') {
      return `${pad}<p>${emitInlines(node.children)}</p>\n`;
    }
    return '';
  }
  // acadamarkTag block
  switch (node.tagname) {
    case 'section':
    case 'sub-section':
    case 'sub-sub-section':
      return emitSection(node, indent);
    case 'p':
      return `${pad}<p>${emitInlines(node.content)}</p>\n`;
    default: {
      // Unknown / out-of-scope-for-5a block — emit as <p> with the
      // node's text so the document still renders something. Slices
      // 5b–5d cover frameables, lists, math, etc.
      const text = extractText(node.content);
      if (text) return `${pad}<p>${escapeXml(text)}</p>\n`;
      return '';
    }
  }
}

function emitSection(secNode, indent) {
  const pad = ' '.repeat(indent);
  const attrs = aggregateJatsAttrs(mapAttributes(
    secNode, VOCABULARY[secNode.tagname], 'jats', jatsEmit
  ));
  const content = Array.isArray(secNode.content) ? secNode.content : [];
  const titleTag = secNode.tagname === 'section' ? 'section-title'
                 : secNode.tagname === 'sub-section' ? 'sub-section-title'
                 : 'sub-sub-section-title';
  const titleNode = content.find(c => isAcadamarkTag(c, titleTag));
  const rest = content.filter(c => !isAcadamarkTag(c, titleTag));

  let out = `${pad}<sec${attrs}>\n`;
  if (titleNode) {
    out += `${pad}  <title>${emitInlines(titleNode.content)}</title>\n`;
  }
  for (const child of rest) {
    out += emitBlock(child, indent + 2);
  }
  out += `${pad}</sec>\n`;
  return out;
}

// ─── Inline emission ──────────────────────────────────────────────────────

// Acadamark Layer 1 inline element → JATS inline element.
const INLINE_MAP = {
  'i': 'italic', 'em': 'italic',
  'b': 'bold',   'strong': 'bold',
  'u': 'underline',
  's': 'strike', 'del': 'strike',
  'sub': 'sub',
  'sup': 'sup',
  'inline-code': 'monospace',
  'code': 'monospace',
};

function emitInlines(children) {
  if (!children) return '';
  if (typeof children === 'string') return escapeXml(children);
  let out = '';
  for (const child of children) {
    if (child == null) continue;
    if (child.type === 'text') {
      out += escapeXml(child.value ?? '');
    } else if (isAcadamarkTagNode(child)) {
      const jatsTag = INLINE_MAP[child.tagname];
      if (jatsTag) {
        out += `<${jatsTag}>${emitInlines(child.content)}</${jatsTag}>`;
      } else {
        // Unknown inline — emit text content only for slice 5a's scope.
        // (Slice 5b will add more inline elements.)
        out += emitInlines(child.content);
      }
    } else if (child.type === 'paragraph') {
      // Paragraph inside an inline context (e.g. inside <article-title>'s
      // pipe content). Unwrap.
      out += emitInlines(child.children);
    } else if (Array.isArray(child.children)) {
      out += emitInlines(child.children);
    }
  }
  return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isAcadamarkTagNode(node) {
  return node != null && node.type === 'acadamarkTag';
}

function isAcadamarkTag(node, tagname) {
  return isAcadamarkTagNode(node) && node.tagname === tagname;
}

function findTagInChildren(children, tagname) {
  for (const c of children ?? []) {
    if (isAcadamarkTag(c, tagname)) return c;
  }
  return null;
}

function findInArticleContent(articleNode, tagname) {
  return findTagInChildren(articleNode.content, tagname);
}

function findInContent(parentNode, tagname) {
  return findTagInChildren(parentNode.content, tagname);
}

function extractText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  let text = '';
  for (const child of content) {
    if (child == null) continue;
    if (child.type === 'text') text += child.value ?? '';
    else if (Array.isArray(child.children)) text += extractText(child.children);
    else if (Array.isArray(child.content))  text += extractText(child.content);
  }
  return text;
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
