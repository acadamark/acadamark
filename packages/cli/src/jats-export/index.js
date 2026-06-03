// @enscribejs/cli — Layer 1 → JATS XML.
//
// Phase 5 slice 5a (2026-05-29): foundation slice. Implements minimal
// article export: article scaffolding (article wrapper + title-group +
// front/body/back regions), paragraphs, inline text formatting
// (italic, bold, underline, strikethrough, sub, sup), and section
// nesting. Frameables / lists / math / theorem family / cross-refs /
// notes / bibliography / external DSLs are slices 5b–5d.
//
// CONSUMES: the post-stage-3 mdast tree produced by
// `enscribe/interpreter`'s structural plugins (per Phase 5 Phase 0
// findings Q1.5 — post-stage-3 is the right input because the tree is
// already JATS-shaped after `enscribeArticleStructuring` /
// `enscribeBookStructuring` + section nesting). The slice 5a entry
// point `enscribeToJats` accepts a tree (mdast root) + options and
// returns a JATS XML string.
//
// ATTRIBUTE MAPPING: delegated to `@enscribejs/enscribe/core`'s `mapAttributes`
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

import { VOCABULARY } from '@enscribejs/layer1-vocabulary';
import { mapAttributes } from '@enscribejs/enscribe/core/map-attributes';
import { parseColonId } from '@enscribejs/enscribe/core/colon-id';
// `formatScopedNumber` (render-quality bug-fix arc, JATS analog of slice
// B, 2026-05-29): the shared scoped-number formatter. The `<label>`
// emitters below derive their display number through it so JATS labels
// carry the same chapter prefix as the `<xref>` cross-references that
// resolve to them (RQ-BOOK-M4). It is the SAME helper computeRefText uses
// for the xref text, so the two agree by construction.
import { parseCsv, parseTsv, formatScopedNumber } from '@enscribejs/enscribe';
import { jatsEmit, aggregateJatsAttrs } from './lib/jats-emit.js';

const JATS_ARTICLE_DOCTYPE_DECL =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD v1.3 20210610//EN" ' +
  '"https://jats.nlm.nih.gov/archiving/1.3/JATS-archivearticle1-3.dtd">\n';

// Phase 5 slice 5c (2026-05-28): BITS 2.0 doctype for book documents.
// BITS — Book Interchange Tag Set — is JATS's book extension; book
// documents carry the BITS doctype rather than the article doctype.
// We pin to BITS 2.0 (the most widely supported version in
// validators; 2.1 exists but tooling coverage is thinner).
//
// Phase 5 slice 5d (2026-05-28): SYSTEM identifier corrected from
// `BITS-book2-0.dtd` to `BITS-book2.dtd` (the actual NLM filename;
// the public identifier is unchanged). Confirmed by HEAD-checking
// the URL — `BITS-book2-0.dtd` 404s, `BITS-book2.dtd` 200s.
const BITS_BOOK_DOCTYPE_DECL =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<!DOCTYPE book PUBLIC "-//NLM//DTD BITS Book Interchange DTD v2.0 20151225//EN" ' +
  '"https://jats.nlm.nih.gov/extensions/bits/2.0/BITS-book2.dtd">\n';

/**
 * Export the post-stage-3 mdast tree to JATS XML.
 *
 * Dispatches on the root tag: `<book>` → BITS 2.0 book export,
 * `<article>` → JATS 1.3 article export. The two paths share the
 * per-element emitters (`emitBlock`, `emitInlines`, etc.) — only
 * the outer wrapping and metadata regions differ.
 *
 * @param {object} tree - mdast root, post-stage-3 (enscribe/interpreter
 *                         structural plugins already ran).
 * @param {object} [opts]
 * @param {string} [opts.articleType='research-article'] - JATS
 *                  article-type attribute default. Article-meta values
 *                  override this if present.
 * @param {string} [opts.bookType='book'] - BITS book-type attribute
 *                  default for book documents (e.g. 'monograph',
 *                  'edited-volume').
 * @param {string} [opts.lang='en'] - default xml:lang on the root.
 * @returns {string} JATS XML serialization.
 */
export function enscribeToJats(tree, opts = {}) {
  const articleType = opts.articleType ?? 'research-article';
  const bookType    = opts.bookType    ?? 'book';
  const lang        = opts.lang        ?? 'en';

  // Phase 5 slice 5c: dispatch on the root tag. Book documents take
  // the BITS path; article documents take the JATS Archiving path.
  const bookNode = findTagInChildren(tree.children, 'book');
  if (bookNode) {
    return BITS_BOOK_DOCTYPE_DECL + emitBook(bookNode, bookType, lang);
  }

  const articleNode = findTagInChildren(tree.children, 'article');
  if (!articleNode) {
    // No article or book wrapper — defensive. Wrap whatever's at root
    // in a minimal <article> for export.
    return JATS_ARTICLE_DOCTYPE_DECL +
      `<article article-type="${articleType}" xml:lang="${lang}" dtd-version="1.3">\n` +
      `  <body/>\n` +
      `</article>\n`;
  }

  return JATS_ARTICLE_DOCTYPE_DECL +
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
  // JATS <front> contains <article-meta>. The enscribe <article-front>
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

  const titleNode    = content.find(c => isEnscribeTag(c, 'article-title'));
  const subtitleNode = content.find(c => isEnscribeTag(c, 'article-subtitle'));
  const authorNodes  = content.filter(c => isEnscribeTag(c, 'author'));
  const abstractNode = content.find(c => isEnscribeTag(c, 'abstract'));
  const otherChildren = content.filter(c =>
    !isEnscribeTag(c, 'article-title') &&
    !isEnscribeTag(c, 'article-subtitle') &&
    !isEnscribeTag(c, 'author') &&
    !isEnscribeTag(c, 'abstract')
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
    if (!isEnscribeTagNode(child)) continue;
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

// ─── BITS book emission (Phase 5 slice 5c) ────────────────────────────────

/**
 * Emit a complete BITS 2.0 `<book>` element from the enscribe
 * `<book>` post-stage-3 mdast wrapper.
 *
 * BITS structural mapping (enscribe → BITS):
 *   <book>           → <book book-type="..." xml:lang="..." dtd-version="2.0">
 *   <book-front>     → <book-meta> (from <meta>) + <front-matter> (for
 *                       front-matter parts, emitted as BITS named
 *                       elements <preface>/<foreword>/<dedication>)
 *   <book-body>      → <book-body> (chapter/part/introduction/conclusion
 *                       book-parts)
 *   <book-back>      → <book-back> (appendix/glossary/colophon book-parts
 *                       + bibliography + note-list)
 *
 * Per-book-part:
 *   <book-part>      → <book-part book-part-type="...">
 *                       <book-part-meta> (book-part-title +
 *                                         book-part-subtitle +
 *                                         per-book-part <author> for
 *                                         the edited-volume case)
 *                       <body> (the book-part's content)
 *                       (optional <back> for per-book-part footnotes
 *                        when note-scope=chapter)
 */
function emitBook(bookNode, bookType, lang) {
  const attrs = ` book-type="${bookType}" xml:lang="${lang}" dtd-version="2.0"`;
  const bookFront = findInArticleContent(bookNode, 'book-front');
  const bookBody  = findInArticleContent(bookNode, 'book-body');
  const bookBack  = findInArticleContent(bookNode, 'book-back');

  let out = `<book${attrs}>\n`;
  // <book-meta> from the <meta> tag inside <book-front>, then
  // <front-matter> for any front-matter book-parts (preface, etc.).
  if (bookFront) {
    out += emitBookFrontRegion(bookFront);
  }
  if (bookBody) {
    out += emitBookBodyRegion(bookBody);
  }
  if (bookBack) {
    out += emitBookBackRegion(bookBack);
  }
  out += `</book>\n`;
  return out;
}

/**
 * Emit the BITS `<book-meta>` (from `<meta>`) and `<front-matter>`
 * (for any preface/foreword/dedication book-parts) regions from the
 * enscribe `<book-front>` content. The front-matter parts are emitted
 * as their BITS named elements (`<preface>` / `<foreword>` /
 * `<dedication>`), NOT as `<book-part>`: the BITS `<front-matter>`
 * content model does not admit `<book-part>` (#4: doc42/44).
 */
function emitBookFrontRegion(bookFront) {
  const content = Array.isArray(bookFront.content) ? bookFront.content : [];
  const meta = content.find(c => isEnscribeTag(c, 'meta'));
  const frontParts = content.filter(c =>
    isEnscribeTag(c, 'book-part') &&
    BOOK_FRONT_PART_TYPES.has(c.kwargs?.['book-part-type'] ?? 'other'),
  );

  let out = '';
  if (meta) {
    out += `  <book-meta>\n${emitBookMetaChildren(meta, 4)}  </book-meta>\n`;
  }
  if (frontParts.length > 0) {
    out += `  <front-matter>\n`;
    for (const part of frontParts) {
      out += emitNamedFrontPart(part, 4);
    }
    out += `  </front-matter>\n`;
  }
  return out;
}

/**
 * Emit the BITS `<book-body>` from the enscribe `<book-body>` — wraps
 * the body-level book-parts (chapter / part / introduction /
 * conclusion / other). The element is `<book-body>`, not `<body>`: the
 * BITS `<book>` content model is
 * (collection-meta*, book-meta?, front-matter?, book-body?, book-back?),
 * so the chapters region must be `<book-body>` (#4: doc42/44). The inner
 * per-book-part content body stays `<body>` — that is the book-part
 * model `(book-part-meta?, front-matter?, body?, back?)`.
 */
function emitBookBodyRegion(bookBody) {
  const content = Array.isArray(bookBody.content) ? bookBody.content : [];
  let out = `  <book-body>\n`;
  for (const child of content) {
    if (isEnscribeTag(child, 'book-part')) {
      out += emitBookPart(child, 4);
    } else {
      // Loose body content (per book-structuring.js's tolerance for
      // misplaced content) — best-effort emit as a regular block.
      out += emitBlock(child, 4);
    }
  }
  out += `  </book-body>\n`;
  return out;
}

/**
 * Emit the BITS `<book-back>` from the enscribe `<book-back>`.
 * Contains back-matter book-parts (appendix / glossary / colophon)
 * plus any residual back-matter content (bibliography, note-list).
 */
function emitBookBackRegion(bookBack) {
  const content = Array.isArray(bookBack.content) ? bookBack.content : [];
  let out = `  <book-back>\n`;
  for (const child of content) {
    if (isEnscribeTag(child, 'book-part')) {
      out += emitBookPart(child, 4);
    } else {
      out += emitBlock(child, 4);
    }
  }
  out += `  </book-back>\n`;
  return out;
}

const BOOK_FRONT_PART_TYPES = new Set(['preface', 'foreword', 'dedication']);

/**
 * Emit a single BITS `<book-part>`. The book-part's `<meta>` child
 * (synthesized by `restructureBookPart` in book-structuring.js) becomes
 * `<book-part-meta>`; the remaining content becomes the book-part's
 * `<body>`. If the book-part contains a `__note-list` (chapter-scope
 * footnotes), it's separated and emitted in `<back>` per BITS
 * convention.
 */
function emitBookPart(bookPart, indent) {
  const pad = ' '.repeat(indent);
  const partType = bookPart.kwargs?.['book-part-type'] ?? 'other';
  const id = bookPart.id ? ` id="${escapeXmlAttr(bookPart.id)}"` : '';
  const content = Array.isArray(bookPart.content) ? bookPart.content : [];

  // Slice 5c emitted a local title-lift compensator here (extracting
  // a leading bare-text node into <book-part-title>) because
  // book-structuring.js didn't honor book-part.md L72-80's pipe-
  // content title contract. The book-side bugfix slice
  // (2026-05-28) closed that drift in book-structuring.js itself,
  // so the meta now arrives with a `<book-part-title>` child
  // pre-lifted. The JATS path just reads it.
  const meta = content.find(c => isEnscribeTag(c, 'meta'));
  // Body = everything except meta and per-part note-lists (which
  // move to <back> below).
  const bodyContent = [];
  const backNoteLists = [];
  for (const child of content) {
    if (child === meta) continue;
    if (isEnscribeTag(child, '__note-list')) {
      backNoteLists.push(child);
    } else {
      bodyContent.push(child);
    }
  }

  // <book-part-meta> emission: only when meta has content.
  // BITS allows an empty meta but it's noisier than necessary.
  const hasMetaContent = meta && Array.isArray(meta.content) && meta.content.length > 0;

  let out = `${pad}<book-part book-part-type="${partType}"${id}>\n`;
  if (hasMetaContent) {
    out += `${pad}  <book-part-meta>\n`;
    out += emitBookPartMetaChildren(meta, indent + 4);
    out += `${pad}  </book-part-meta>\n`;
  }
  out += `${pad}  <body>\n`;
  out += emitBodyChildren(bodyContent, indent + 4);
  out += `${pad}  </body>\n`;
  // Per-book-part footnotes (chapter-scope note-position) → <back>.
  if (backNoteLists.length > 0) {
    out += `${pad}  <back>\n`;
    for (const nl of backNoteLists) {
      out += emitFnGroupJats(nl, indent + 4);
    }
    out += `${pad}  </back>\n`;
  }
  out += `${pad}</book-part>\n`;
  return out;
}

// BITS named front-matter parts. <front-matter> admits these named
// elements but NOT <book-part> (#4: doc42/44). Maps the enscribe
// book-part-type kwarg → BITS element name.
const BOOK_FRONT_PART_ELEMENTS = {
  preface: 'preface',
  foreword: 'foreword',
  dedication: 'dedication',
};

/**
 * Emit a BITS named front-matter part (`<preface>` / `<foreword>` /
 * `<dedication>`) from a front-matter book-part. Unlike `<book-part>`,
 * the named parts are non-recursive: their content model is
 * `(book-part-meta?, named-book-part-body?, back?)` — the body is wrapped
 * in `<named-book-part-body>`, not `<body>` (#4). The `book-part-type`
 * kwarg selects the element; an unrecognized type falls back to
 * `emitBookPart` defensively (emitBookFrontRegion only passes
 * BOOK_FRONT_PART_TYPES members, so the fallback is unreachable today).
 */
function emitNamedFrontPart(part, indent) {
  const elName = BOOK_FRONT_PART_ELEMENTS[part.kwargs?.['book-part-type']];
  if (!elName) return emitBookPart(part, indent); // defensive fallback

  const pad = ' '.repeat(indent);
  const id = part.id ? ` id="${escapeXmlAttr(part.id)}"` : '';
  const content = Array.isArray(part.content) ? part.content : [];

  // Same content split as emitBookPart: <meta> → <book-part-meta>;
  // __note-list → <back>; everything else → the body.
  const meta = content.find(c => isEnscribeTag(c, 'meta'));
  const bodyContent = [];
  const backNoteLists = [];
  for (const child of content) {
    if (child === meta) continue;
    if (isEnscribeTag(child, '__note-list')) backNoteLists.push(child);
    else bodyContent.push(child);
  }
  const hasMetaContent = meta && Array.isArray(meta.content) && meta.content.length > 0;

  let out = `${pad}<${elName}${id}>\n`;
  if (hasMetaContent) {
    out += `${pad}  <book-part-meta>\n`;
    out += emitBookPartMetaChildren(meta, indent + 4);
    out += `${pad}  </book-part-meta>\n`;
  }
  // <named-book-part-body> requires (para-level)+ or (sec-level)+; emit
  // it only when there is body content (an empty named part is valid —
  // the body is optional in the model).
  if (bodyContent.length > 0) {
    out += `${pad}  <named-book-part-body>\n`;
    out += emitBodyChildren(bodyContent, indent + 4);
    out += `${pad}  </named-book-part-body>\n`;
  }
  if (backNoteLists.length > 0) {
    out += `${pad}  <back>\n`;
    for (const nl of backNoteLists) {
      out += emitFnGroupJats(nl, indent + 4);
    }
    out += `${pad}  </back>\n`;
  }
  out += `${pad}</${elName}>\n`;
  return out;
}

/**
 * Emit `<book-meta>` children from the book-level `<meta>` tag. The
 * structure parallels `emitArticleMetaChildren` but uses BITS
 * element names: `<book-title-group>` wraps `<book-title>` and
 * `<subtitle>`.
 */
function emitBookMetaChildren(metaNode, indent) {
  const pad = ' '.repeat(indent);
  const content = Array.isArray(metaNode.content) ? metaNode.content : [];

  const titleNode    = content.find(c => isEnscribeTag(c, 'book-title'));
  const subtitleNode = content.find(c => isEnscribeTag(c, 'book-subtitle'));
  const authorNodes  = content.filter(c => isEnscribeTag(c, 'author'));
  const otherChildren = content.filter(c =>
    !isEnscribeTag(c, 'book-title') &&
    !isEnscribeTag(c, 'book-subtitle') &&
    !isEnscribeTag(c, 'author')
  );

  let out = '';
  if (titleNode || subtitleNode) {
    out += `${pad}<book-title-group>\n`;
    if (titleNode) {
      out += `${pad}  <book-title>${emitInlines(titleNode.content)}</book-title>\n`;
    }
    if (subtitleNode) {
      out += `${pad}  <subtitle>${emitInlines(subtitleNode.content)}</subtitle>\n`;
    }
    out += `${pad}</book-title-group>\n`;
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
  // Other lifted children (publisher, doi, isbn, etc.) — best-effort
  // emit via vocab counterpart, same shape as the article path.
  for (const child of otherChildren) {
    if (!isEnscribeTagNode(child)) continue;
    const vocab = VOCABULARY[child.tagname];
    const jatsEl = vocab?.jats_counterpart?.element;
    if (jatsEl) {
      const text = extractText(child.content);
      out += `${pad}<${jatsEl}>${escapeXml(text)}</${jatsEl}>\n`;
    }
  }
  return out;
}

/**
 * Emit `<book-part-meta>` children from a book-part's `<meta>` tag.
 * Per-book-part authorship (the edited-volume case from book.md
 * L287-302) is the main reason this differs from the book-level meta:
 * each chapter can carry its own `<author>`s.
 *
 * The pipe-content title from `<chapter | Origins>` shorthand arrives
 * as a `<book-part-title>` child of `<meta>` already lifted by
 * `book-structuring.js`'s `restructureBookPart` (slice book-side
 * bugfix, 2026-05-28). Slice 5c had a local lift compensator here;
 * removed once the upstream fix landed.
 */
function emitBookPartMetaChildren(metaNode, indent) {
  const pad = ' '.repeat(indent);
  const content = (metaNode && Array.isArray(metaNode.content)) ? metaNode.content : [];

  const titleNode    = content.find(c => isEnscribeTag(c, 'book-part-title'));
  const subtitleNode = content.find(c => isEnscribeTag(c, 'book-part-subtitle'));
  const authorNodes  = content.filter(c => isEnscribeTag(c, 'author'));

  let out = '';
  if (titleNode || subtitleNode) {
    out += `${pad}<title-group>\n`;
    if (titleNode) {
      out += `${pad}  <title>${emitInlines(titleNode.content)}</title>\n`;
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
  return out;
}

function emitBodyChildren(children, indent) {
  // Phase 5 slice 5b (2026-05-29): pre-process to wrap loose inline-
  // shaped content (mdast text nodes, inline enscribeTags) into
  // synthetic paragraphs. Without this, the slice-5a-known abstract
  // limitation drops surrounding prose around bare-markdown-lifted
  // inline tags — emitBlock's default-case path treated each inline
  // enscribeTag as a separate block-context `<p>` and dropped text
  // nodes entirely.
  const grouped = groupInlineRuns(children ?? []);
  let out = '';
  for (const child of grouped) {
    out += emitBlock(child, indent);
  }
  return out;
}

/**
 * Walk a content array and group consecutive inline-shaped nodes (mdast
 * text, inline enscribeTags from the INLINE_MAP set) into synthetic
 * mdast `paragraph` nodes. Block-shaped nodes (sections, headings, p,
 * frameables, lists, math, theorems, etc.) pass through unchanged.
 *
 * The fix for the abstract limitation: bare prose between
 * inline-enscribeTag children becomes paragraph-wrapped rather than
 * dropped, so the JATS emitter's block-context handlers see uniform
 * `<p>`-shaped children at top level.
 */
function groupInlineRuns(children) {
  const out = [];
  let buf = null;
  for (const child of children) {
    if (isInlineShaped(child)) {
      if (!buf) buf = { type: 'paragraph', children: [] };
      buf.children.push(child);
    } else {
      if (buf) { out.push(buf); buf = null; }
      out.push(child);
    }
  }
  if (buf) out.push(buf);
  return out;
}

function isInlineShaped(node) {
  if (node == null) return false;
  if (node.type === 'text') return true;
  if (node.type === 'inlineCode') return true;
  if (!isEnscribeTagNode(node)) return false;
  // Inline enscribeTags from the INLINE_MAP plus inline-math
  // (handled separately by emitInlineFormulaJats but inline-shaped
  // for grouping purposes — its presence in a paragraph shouldn't
  // fragment the paragraph into separate <p>s). Block-level
  // enscribeTags (sections, p, frameables, lists, math envs,
  // theorems) are NOT inline-shaped.
  if (INLINE_MAP[node.tagname]) return true;
  if (node.tagname === 'inline-math') return true;
  if (node.tagname === 'a') return true;
  // Phase 5 slice 5c (2026-05-28): internal-marker nodes injected
  // by ref-resolution / cite-resolution / note-placement render
  // inline (the emitter dispatch in emitInlines produces a single
  // <xref> per marker). Without inline-shaping them, a paragraph
  // like "This refers to <ref @x> and <ref @y>" fragments into
  // four separate <p>s — same bug shape as slice 5b's
  // abstract-limitation fix, surfaced again by slice 5c's surface.
  if (INTERNAL_INLINE_MARKERS.has(node.tagname)) return true;
  return false;
}

// Phase 5 slice 5c: internal-marker tagnames that render inline in
// JATS (each produces a single `<xref>` element via emitInlines).
// `__cite-error` / `__ref-error` render as <italic specific-use="..."/>
// (also inline).
const INTERNAL_INLINE_MARKERS = new Set([
  '__ref-marker', '__ref-error',
  '__cite-marker', '__cite-error',
  '__note-marker',
]);

function emitBlock(node, indent) {
  const pad = ' '.repeat(indent);
  if (!isEnscribeTagNode(node)) {
    // mdast paragraph etc. — handle paragraph; skip unknown.
    if (node.type === 'paragraph') {
      return `${pad}<p>${emitInlines(node.children)}</p>\n`;
    }
    return '';
  }
  // enscribeTag block
  switch (node.tagname) {
    case 'section':
    case 'sub-section':
    case 'sub-sub-section':
      return emitSection(node, indent);
    case 'p':
      return `${pad}<p>${emitInlines(node.content)}</p>\n`;
    // Phase 5 slice 5b — frameables: <fig> / <svg> / <frame> → <fig>
    // (figure-family); <table> / <csv> / <tsv> → <table-wrap>.
    case 'fig':
    case 'svg':
    case 'frame':
      return emitFigureJats(node, indent);
    case 'table':
    case 'csv':
    case 'tsv':
      return emitTableWrapJats(node, indent);
    // Phase 5 slice 5d — external DSLs: <fig> with <alt-text> + <preformat>
    // carrying the verbatim source. See emitDslFigureJats for the per-Q3 shape
    // rationale. #22 slice 3: the canonical node is `diagram` (engine in
    // positional[0]); the legacy `mermaid`/`abc` cases are retained for any
    // pre-gate caller but are dead on the post-gate tree.
    case 'diagram':
    case 'mermaid':
    case 'abc':
      return emitDslFigureJats(node, indent);
    // Phase 5 slice 5b — lists
    case 'ul':
      return emitListJats(node, indent, 'bullet');
    case 'ol':
      return emitListJats(node, indent, 'order');
    case 'dl':
      return emitDefListJats(node, indent);
    case 'glossary':
      return emitDefListJats(node, indent, 'glossary');
    // Phase 5 slice 5b — math
    case 'display-math':
    case 'math':
    case 'matrix':
    case 'cases':
    case 'align':
    case 'eqnarray':
      return emitDispFormulaJats(node, indent);
    // Phase 5 slice 5b — theorem family
    case 'theorem':
    case 'lemma':
    case 'corollary':
    case 'proposition':
    case 'definition':
    case 'example':
    case 'remark':
    case 'proof':
      return emitStatementJats(node, indent);
    case 'blockquote':
      return emitBlockquoteJats(node, indent);
    case 'aside':
      return emitAsideJats(node, indent);
    // Phase 5 slice 5c: footnote collections (built by
    // enscribeNotePlacement) — `__note-list` → `<fn-group>` with one
    // `<fn>` per `__note-list-item`.
    case '__note-list':
      return emitFnGroupJats(node, indent);
    case '__note-list-item':
      // Defensive: a list-item should only appear inside a __note-list
      // (where emitFnGroupJats handles it). Standalone emission is a
      // best-effort <fn>.
      return emitFnJats(node, indent);
    // Phase 5 slice 5d: bibliography → JATS <ref-list> with structured
    // <element-citation> children built from the CSL-JSON entries
    // threaded through by `bibliography.js`.
    case '__bibliography':
      return emitRefListJats(node, indent);
    default: {
      // Unknown / out-of-scope-for-5b block — emit as <p> with the
      // node's text so the document still renders something.
      const text = extractText(node.content);
      if (text) return `${pad}<p>${escapeXml(text)}</p>\n`;
      return '';
    }
  }
}

// ─── Frameable emission (Phase 5 slice 5b) ────────────────────────────────

/**
 * Extract <caption> / <title> child tags from a frameable's content,
 * mirroring the HTML-side `extractFrameableChildren` in
 * `enscribe/interpreter/src/lib/frameable.js`. Falls back to reading
 * caption / title from kwargs when no child tag exists (the same
 * opaque-content fallback the HTML side uses; in JATS export the
 * fallback is uniformly applied since table/csv/tsv/svg etc. all have
 * opaque or mixed content).
 *
 * Returns { caption, title, body } where caption + title are arrays of
 * mdast inline nodes (or null) and body is the remaining content
 * children (mdast nodes, may be empty for opaque-content nodes whose
 * body is a string).
 */
function extractFrameableParts(node) {
  const content = Array.isArray(node.content) ? node.content : [];
  let caption = null;
  let title = null;
  const body = [];
  for (const child of content) {
    if (isEnscribeTag(child, 'caption') && caption == null) {
      caption = Array.isArray(child.content) ? child.content : [];
    } else if (isEnscribeTag(child, 'title') && title == null) {
      title = Array.isArray(child.content) ? child.content : [];
    } else {
      body.push(child);
    }
  }
  // Opaque-content fallback: read from kwargs if no child tag was found.
  if (caption == null && typeof node.kwargs?.caption === 'string') {
    caption = [{ type: 'text', value: node.kwargs.caption }];
  }
  if (title == null && typeof node.kwargs?.title === 'string') {
    title = [{ type: 'text', value: node.kwargs.title }];
  }
  return { caption, title, body };
}

/**
 * Emit a JATS `<fig>` for figure-family frameables (fig / svg / frame).
 * Per JATS Archiving 1.3: `<fig>` contains optional `<label>` (for
 * numbering), optional `<caption>` (with `<title>` and `<p>`s),
 * and the body content (`<graphic>` for image figures; arbitrary
 * structural content for frame).
 */
function emitFigureJats(node, indent) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  let { caption, title, body } = extractFrameableParts(node);
  const number = node.computedNumber ?? null;
  const src = node.kwargs?.src ?? null;

  // Legacy `<fig src=x | caption-text>` form: when src is present
  // and no explicit <caption> child / caption= kwarg supplied a
  // caption, the pipe content IS the caption (HTML side's
  // figure-as-pipe-caption convention). Treat the body content as
  // the caption for JATS too. The body becomes empty since the
  // <graphic> emission below stands in for the figure's content.
  if (src && !caption && body.length > 0) {
    caption = body;
    body = [];
  }

  let out = `${pad}<fig${id}>\n`;
  if (number != null) {
    // chapter-prefixed in books (RQ-BOOK-M4), bare in articles.
    out += `${pad}  <label>${escapeXml(formatScopedNumber(number, node._scope))}</label>\n`;
  }
  if (caption || title) {
    out += `${pad}  <caption>\n`;
    if (title) {
      out += `${pad}    <title>${emitInlines(title)}</title>\n`;
    }
    if (caption) {
      out += `${pad}    <p>${emitInlines(caption)}</p>\n`;
    }
    out += `${pad}  </caption>\n`;
  }
  // Body: for figures with src, emit <graphic xlink:href="..."/>; for
  // svg, emit <graphic> with the SVG content as a comment (full SVG
  // embedding is slice 5e or 5f territory); for frame and other
  // non-image figures, emit body content as paragraphs.
  if (src) {
    out += `${pad}  <graphic xlink:href="${escapeXmlAttr(src)}"/>\n`;
  } else if (node.tagname === 'svg' && typeof node.content === 'string') {
    // SVG source — JATS allows inline graphics via <graphic> with
    // alternative content; for slice 5b we emit a placeholder
    // <graphic> with the source preserved as an attribute comment.
    out += `${pad}  <graphic specific-use="inline-svg"/>\n`;
  } else if (body.length > 0) {
    out += emitBodyChildren(body, indent + 2);
  }
  out += `${pad}</fig>\n`;
  return out;
}

/**
 * Phase 5 slice 5d (2026-05-28): emit a JATS `<fig>` for external-DSL
 * frameables (`<mermaid>`, `<abc>`). The DSL source is preserved
 * verbatim in a `<preformat>` element inside `<fig>`; an `<alt-text>`
 * provides JATS-conventional accessibility text; the figure is marked
 * with `specific-use="enscribe-dsl-{type}"` so downstream tooling
 * (pre-render passes) can identify the source DSL.
 *
 * Per Q3's design recommendation: this is shape "A" enhanced with
 * `<preformat>` for the source (rather than putting source in
 * `<alt-text>`, which is conventionally for accessibility prose).
 * No `<graphic>` placeholder — the source is enough; downstream
 * pre-render passes can replace `<preformat>` with `<graphic>` /
 * `<alternatives>` once the diagram is rendered to an image.
 *
 * JATS 1.3 `<fig>` content model allows `<preformat>` as a permitted
 * block-level child alongside `<label>` / `<caption>`.
 */
function emitDslFigureJats(node, indent) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  // #22 slice 3: the canonical node is `<diagram>` with the engine in the
  // format-word positional; the engine drives the specific-use / preformat-type
  // strings, so a `<diagram mermaid>` exports byte-identically to the legacy
  // `<mermaid>`. The legacy mermaid/abc tagname path is retained as a fallback.
  const dslType = node.tagname === 'diagram'
    ? (node.positional?.[0] ?? 'diagram')
    : node.tagname; // 'mermaid' | 'abc'
  const { caption, title } = extractFrameableParts(node);
  const number = node.computedNumber ?? null;
  const source = typeof node.content === 'string' ? node.content.trim() : '';

  let out = `${pad}<fig${id} specific-use="enscribe-dsl-${dslType}">\n`;
  if (number != null) {
    // chapter-prefixed in books (RQ-BOOK-M4), bare in articles.
    out += `${pad}  <label>${escapeXml(formatScopedNumber(number, node._scope))}</label>\n`;
  }
  if (caption || title) {
    out += `${pad}  <caption>\n`;
    if (title) {
      out += `${pad}    <title>${emitInlines(title)}</title>\n`;
    }
    if (caption) {
      out += `${pad}    <p>${emitInlines(caption)}</p>\n`;
    }
    out += `${pad}  </caption>\n`;
  }
  // JATS-conventional alt-text — short accessibility prose, not the
  // source itself. The source goes into <preformat> below.
  out += `${pad}  <alt-text>${escapeXml(`${dslType[0].toUpperCase()}${dslType.slice(1)} diagram source preserved as preformatted text.`)}</alt-text>\n`;
  // <preformat> carries the verbatim DSL source. The `preformat-type`
  // attribute identifies the DSL so downstream tooling can find and
  // render these blocks (matching `data-enscribe-dsl="mermaid"`
  // identification on the HTML side). It is `preformat-type`, not
  // `content-type`: the JATS/BITS <preformat> ATTLIST declares
  // preformat-type (CDATA) but not content-type (#4: doc43/44).
  if (source) {
    out += `${pad}  <preformat preformat-type="${dslType}-source">${escapeXml(source)}</preformat>\n`;
  }
  out += `${pad}</fig>\n`;
  return out;
}

/**
 * Emit a JATS `<table-wrap>` for table-family frameables (table / csv /
 * tsv). The wrapper carries the caption + label; the inner `<table>`
 * carries the parsed rows.
 */
function emitTableWrapJats(node, indent) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  const { caption, title } = extractFrameableParts(node);
  const number = node.computedNumber ?? null;

  let out = `${pad}<table-wrap${id}>\n`;
  if (number != null) {
    // chapter-prefixed in books (RQ-BOOK-M4), bare in articles.
    out += `${pad}  <label>${escapeXml(formatScopedNumber(number, node._scope))}</label>\n`;
  }
  if (caption || title) {
    out += `${pad}  <caption>\n`;
    if (title) {
      out += `${pad}    <title>${emitInlines(title)}</title>\n`;
    }
    if (caption) {
      out += `${pad}    <p>${emitInlines(caption)}</p>\n`;
    }
    out += `${pad}  </caption>\n`;
  }
  // Inner <table>. Phase 5 slice 5c (2026-05-28): parse the data
  // and emit `<thead>` + `<tbody>` + `<tr>` + `<th>`/`<td>` rows,
  // mirroring the HTML pipeline's `buildTableBodyHast` shape (it
  // produces the same nested structure into hast; we serialize the
  // equivalent into JATS directly). Falls back to a comment-only
  // placeholder when the format is unknown or parsing fails — the
  // table's caption + label still emit so the document remains
  // structured.
  out += emitTableInner(node, indent + 2);
  out += `${pad}</table-wrap>\n`;
  return out;
}

/**
 * Phase 5 slice 5c (2026-05-28): emit the inner `<table>` element
 * with parsed `<thead>` / `<tbody>` rows. JATS table cells use the
 * XHTML model directly (`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` —
 * the same vocabulary), so we can serialize the parsed rows from
 * `parseCsv` / `parseTsv` into XML straight from the {headers, rows}
 * shape.
 *
 * Format detection mirrors `tableHandler` in
 * `enscribe/interpreter/src/handlers/table.js`:
 *   - `<table csv | ...>` / `<table tsv | ...>` — positional format
 *   - `<csv | ...>` / `<tsv | ...>` — tagname is the format
 *   - `<table>` (no format) — escape-hatch raw HTML; emit as comment
 *     placeholder (raw HTML in JATS isn't portable across consumers)
 *
 * Unsupported formats (json / yaml / md) — out of scope for slice 5c;
 * emit comment placeholder. Those formats are less common in
 * publishing pipelines; CSV/TSV is the 80% case for tabular data.
 */
function emitTableInner(node, indent) {
  const pad = ' '.repeat(indent);
  const format = node.tagname === 'table' ? (node.positional?.[0] ?? null)
               : node.tagname;
  const rawData = typeof node.content === 'string' ? node.content : '';
  const hasHeaders = node.booleans?.headers !== false; // default true

  if (!format || rawData.trim() === '') {
    return `${pad}<table>\n${pad}  <!-- table data; format=${format ?? 'raw'} -->\n${pad}</table>\n`;
  }

  const parsers = { csv: parseCsv, tsv: parseTsv };
  const parserFn = parsers[format];
  if (!parserFn) {
    // json / yaml / md not yet handled in JATS path; emit placeholder.
    return `${pad}<table>\n${pad}  <!-- unsupported table format for JATS export: ${escapeXml(format)} -->\n${pad}</table>\n`;
  }

  let parsed;
  try {
    parsed = parserFn(rawData, { hasHeaders });
  } catch (err) {
    return `${pad}<table>\n${pad}  <!-- table parse error: ${escapeXml(err.message)} -->\n${pad}</table>\n`;
  }

  let out = `${pad}<table>\n`;
  if (parsed.headers) {
    out += `${pad}  <thead>\n`;
    out += `${pad}    <tr>\n`;
    for (const cell of parsed.headers) {
      out += `${pad}      <th>${escapeXml(String(cell))}</th>\n`;
    }
    out += `${pad}    </tr>\n`;
    out += `${pad}  </thead>\n`;
  }
  if (parsed.rows.length > 0) {
    out += `${pad}  <tbody>\n`;
    for (const row of parsed.rows) {
      out += `${pad}    <tr>\n`;
      for (const cell of row) {
        out += `${pad}      <td>${escapeXml(String(cell))}</td>\n`;
      }
      out += `${pad}    </tr>\n`;
    }
    out += `${pad}  </tbody>\n`;
  }
  out += `${pad}</table>\n`;
  return out;
}

// ─── List emission (Phase 5 slice 5b) ─────────────────────────────────────

/**
 * Emit JATS `<list list-type="bullet|order">` for `<ul>` / `<ol>`.
 * Iterates `<li>` children and emits `<list-item><p>...</p></list-item>`.
 */
function emitListJats(node, indent, listType) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  const children = Array.isArray(node.content) ? node.content : [];
  let out = `${pad}<list list-type="${listType}"${id}>\n`;
  for (const child of children) {
    if (!isEnscribeTag(child, 'li')) continue;
    out += `${pad}  <list-item>\n`;
    // li content can be inline (single paragraph) or block (nested
    // lists, multi-paragraph). Use emitBodyChildren so the
    // groupInlineRuns pre-pass wraps loose inlines into paragraphs.
    out += emitBodyChildren(child.content, indent + 4);
    out += `${pad}  </list-item>\n`;
  }
  out += `${pad}</list>\n`;
  return out;
}

/**
 * Emit JATS `<def-list>` for `<dl>` (definition list) or `<glossary>`.
 * Pairs consecutive `<dt>` + `<dd>` into `<def-item>`s with `<term>`
 * + `<def>` children. Glossary uses `<def-list content-type="glossary">`.
 */
function emitDefListJats(node, indent, contentType = null) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  const ct = contentType ? ` content-type="${contentType}"` : '';
  const children = Array.isArray(node.content) ? node.content : [];
  let out = `${pad}<def-list${ct}${id}>\n`;
  // For <dl>: iterate dt/dd pairs. For <glossary>: iterate
  // <glossary-entry> children (each wraps a term + def pair).
  if (node.tagname === 'glossary') {
    for (const entry of children) {
      if (!isEnscribeTag(entry, 'glossary-entry')) continue;
      out += emitDefItemFromGlossaryEntry(entry, indent + 2);
    }
  } else {
    // <dl>: pair consecutive dt + dd.
    let i = 0;
    while (i < children.length) {
      if (isEnscribeTag(children[i], 'dt')) {
        const term = children[i];
        const def = (i + 1 < children.length && isEnscribeTag(children[i + 1], 'dd'))
          ? children[i + 1] : null;
        out += `${pad}  <def-item>\n`;
        out += `${pad}    <term>${emitInlines(term.content)}</term>\n`;
        if (def) {
          out += `${pad}    <def>\n`;
          out += emitBodyChildren(def.content, indent + 6);
          out += `${pad}    </def>\n`;
        }
        out += `${pad}  </def-item>\n`;
        i += def ? 2 : 1;
      } else {
        i += 1;
      }
    }
  }
  out += `${pad}</def-list>\n`;
  return out;
}

function emitDefItemFromGlossaryEntry(entry, indent) {
  const pad = ' '.repeat(indent);
  const children = Array.isArray(entry.content) ? entry.content : [];
  // Glossary entries typically wrap a term + a definition.
  const termNode = children.find(c => isEnscribeTag(c, 'term') || isEnscribeTag(c, 'dt'));
  const defChildren = children.filter(c => c !== termNode);
  let out = `${pad}<def-item>\n`;
  if (termNode) {
    out += `${pad}  <term>${emitInlines(termNode.content)}</term>\n`;
  }
  if (defChildren.length > 0) {
    out += `${pad}  <def>\n`;
    out += emitBodyChildren(defChildren, indent + 4);
    out += `${pad}  </def>\n`;
  }
  out += `${pad}</def-item>\n`;
  return out;
}

// ─── Math emission (Phase 5 slice 5b) ─────────────────────────────────────

/**
 * Emit a JATS `<disp-formula>` for display-math, long-form <math>, and
 * the math-environment tags (matrix / cases / align / eqnarray). The
 * TeX source goes verbatim into `<tex-math>`; equation numbers go into
 * `<label>`.
 *
 * For env tags: the handler's wrap-inside convention (HTML side wraps
 * body in `\begin{<env>}…\end{<env>}` before passing to KaTeX) is
 * mirrored here — we emit the same wrapped LaTeX into `<tex-math>`
 * so JATS consumers see standalone LaTeX rather than env-body
 * fragments.
 */
function emitDispFormulaJats(node, indent) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  const rawSource = typeof node.content === 'string' ? node.content.trim() : '';
  // Apply env wrap for math-env tags (matrix/cases/align/eqnarray).
  const envWrap = MATH_ENV_NAMES[node.tagname];
  const texSource = envWrap
    ? `\\begin{${envWrap}}\n${rawSource}\n\\end{${envWrap}}`
    : rawSource;
  const number = node.computedNumber ?? null;

  let out = `${pad}<disp-formula${id}>\n`;
  if (number != null) {
    // chapter-prefixed in books (RQ-BOOK-M4), bare in articles.
    out += `${pad}  <label>(${escapeXml(formatScopedNumber(number, node._scope))})</label>\n`;
  }
  // Use <![CDATA[...]]> wrapping for the TeX source so LaTeX
  // backslash escapes don't need XML-escaping. CDATA can't contain
  // ']]>'; escape it defensively.
  const safeTex = texSource.replace(/]]>/g, ']]]]><![CDATA[>');
  out += `${pad}  <tex-math><![CDATA[${safeTex}]]></tex-math>\n`;
  out += `${pad}</disp-formula>\n`;
  return out;
}

/**
 * Emit a JATS `<inline-formula>` for inline-math. Same TeX-source-in-
 * <tex-math> shape, but inline.
 */
function emitInlineFormulaJats(node) {
  const rawSource = typeof node.content === 'string' ? node.content.trim() : '';
  const safeTex = rawSource.replace(/]]>/g, ']]]]><![CDATA[>');
  return `<inline-formula><tex-math><![CDATA[${safeTex}]]></tex-math></inline-formula>`;
}

const MATH_ENV_NAMES = {
  matrix: 'matrix',
  cases: 'cases',
  align: 'aligned',
  eqnarray: 'aligned',
};

// ─── Theorem family emission (Phase 5 slice 5b) ───────────────────────────

const THEOREM_CONTENT_TYPES = {
  theorem: 'theorem', lemma: 'lemma', corollary: 'corollary',
  proposition: 'proposition', definition: 'definition',
  example: 'example', remark: 'remark', proof: 'proof',
};

const THEOREM_LABEL_PREFIXES = {
  theorem: 'Theorem', lemma: 'Lemma', corollary: 'Corollary',
  proposition: 'Proposition', definition: 'Definition',
  example: 'Example', remark: 'Remark', proof: 'Proof',
};

/**
 * Emit a JATS `<statement content-type="...">` for theorem-family
 * elements. Contains:
 *   - <label>Theorem 1.</label> (or just "Theorem." for unnumbered)
 *   - <title>Pythagoras</title> (optional, from name kwarg)
 *   - body content as <p>s
 */
function emitStatementJats(node, indent) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  const contentType = THEOREM_CONTENT_TYPES[node.tagname] ?? 'other';
  const labelPrefix = THEOREM_LABEL_PREFIXES[node.tagname] ?? node.tagname;
  const number = node.computedNumber ?? null;
  const name = node.kwargs?.name ?? null;

  let out = `${pad}<statement content-type="${contentType}"${id}>\n`;
  // Label: "Theorem N." for numbered, "Remark." / "Proof." for
  // unnumbered (per amsthm convention). Same shape as the HTML
  // formatLabel primitive produces.
  if (number != null) {
    // chapter-prefixed in books (RQ-BOOK-M4), bare in articles.
    out += `${pad}  <label>${escapeXml(`${labelPrefix} ${formatScopedNumber(number, node._scope)}.`)}</label>\n`;
  } else if (contentType === 'remark' || contentType === 'proof') {
    out += `${pad}  <label>${escapeXml(`${labelPrefix}.`)}</label>\n`;
  }
  if (name) {
    out += `${pad}  <title>${escapeXml(String(name))}</title>\n`;
  }
  // Body — uses emitBodyChildren for paragraph-aware emission.
  const body = Array.isArray(node.content) ? node.content : [];
  out += emitBodyChildren(body, indent + 2);
  out += `${pad}</statement>\n`;
  return out;
}

// ─── Blockquote + aside (small additions) ─────────────────────────────────

function emitBlockquoteJats(node, indent) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  let out = `${pad}<disp-quote${id}>\n`;
  out += emitBodyChildren(node.content, indent + 2);
  out += `${pad}</disp-quote>\n`;
  return out;
}

function emitAsideJats(node, indent) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  // content-type comes from the `type` kwarg (round-trip with <aside type=X>);
  // default "aside". This is the <boxed-text content-type="…"> ↔ <aside type="…">
  // mapping (#31).
  const type = node.kwargs?.type ?? 'aside';
  // #31: <aside> is frameable — pull the lifted <title>/<caption> children.
  const { caption, title, body } = extractFrameableParts(node);
  const number = node.computedNumber ?? null;

  let out = `${pad}<boxed-text content-type="${escapeXmlAttr(type)}"${id}>\n`;
  // A numbered aside carries its "Box N" label (the box series); boxed-text
  // permits <label> before <caption>. Unnumbered asides omit it.
  if (number != null) {
    out += `${pad}  <label>${escapeXml(`Box ${formatScopedNumber(number, node._scope)}.`)}</label>\n`;
  }
  // Title → the boxed-text <caption><title>…</title></caption> slot.
  if (title) {
    out += `${pad}  <caption><title>${emitInlines(title)}</title></caption>\n`;
  }
  out += emitBodyChildren(body, indent + 2);
  // A bottom caption has no dedicated slot on <boxed-text>; per the #31
  // decision it defaults to a trailing <p> inside the box.
  if (caption) {
    out += `${pad}  <p>${emitInlines(caption)}</p>\n`;
  }
  out += `${pad}</boxed-text>\n`;
  return out;
}

// ─── Footnote emission (Phase 5 slice 5c) ─────────────────────────────────

/**
 * Map the `__note-list` classes (set by `notePlacement`'s
 * `listClassFor`) to a JATS `<fn-group>` `content-type` attribute.
 * JATS doesn't have an enumerated content-type for "footnotes vs
 * endnotes" — it's a usage hint. We forward the class name as
 * content-type so consumers can distinguish.
 */
function fnGroupContentType(classes) {
  if (!Array.isArray(classes) || classes.length === 0) return null;
  // Single class — pass through. Mixed-class `notes` also passes
  // through unchanged.
  return classes[0];
}

/**
 * Emit a JATS `<fn-group>` for a `__note-list` internal node. The
 * note-placement plugin injects these into the appropriate region
 * (per-section for article foot-notes, per-book-part for book
 * chapter-end notes, residual to article-back / book-back). The
 * emitter just unwraps the list-items into `<fn>` elements.
 */
function emitFnGroupJats(node, indent) {
  const pad = ' '.repeat(indent);
  const contentType = fnGroupContentType(node.classes);
  const ct = contentType ? ` content-type="${contentType}"` : '';
  const items = Array.isArray(node.content) ? node.content : [];
  let out = `${pad}<fn-group${ct}>\n`;
  for (const item of items) {
    if (!isEnscribeTag(item, '__note-list-item')) continue;
    out += emitFnJats(item, indent + 2);
  }
  out += `${pad}</fn-group>\n`;
  return out;
}

/**
 * Emit a single JATS `<fn>` from a `__note-list-item` internal
 * marker. The marker carries:
 *   - `id`           — the note's authored id (e.g. `note:foo` or auto
 *                      `note-3`)
 *   - `kwargs.number` — the display number assigned by the registry
 *   - `kwargs.refId`  — the back-reference id (`noteref-N`) that points
 *                       at the marker location
 *   - `kwargs.sidenote` — true for side notes (no list emission in HTML;
 *                         in JATS we still emit a `<fn>` but flag with
 *                         specific-use)
 *   - `content`       — the resolved note body (mdast)
 *
 * JATS shape: `<fn id="..."><label>N</label><p>body</p></fn>`. The
 * label carries the display number; the body uses `emitBodyChildren`
 * so multi-paragraph notes work and inline content (including
 * resolved refs/cites that ran before note-placement) renders
 * correctly.
 */
function emitFnJats(node, indent) {
  const pad = ' '.repeat(indent);
  const id = node.id ? ` id="${escapeXmlAttr(node.id)}"` : '';
  const number = node.kwargs?.number ?? null;
  const sidenote = node.kwargs?.sidenote === true;
  const specific = sidenote ? ` specific-use="sidenote"` : '';
  let out = `${pad}<fn${id}${specific}>\n`;
  if (number != null) {
    out += `${pad}  <label>${escapeXml(String(number))}</label>\n`;
  }
  out += emitBodyChildren(node.content, indent + 2);
  out += `${pad}</fn>\n`;
  return out;
}

function emitSection(secNode, indent) {
  const pad = ' '.repeat(indent);
  // id and sec-type are emitted directly from the node, matching every other
  // block emitter (statement, fig, fn, blockquote, aside, book-part). The
  // section vocab declares both only for the html target, so mapAttributes('jats')
  // drops them; they are sourced here at the emit site. They are deliberately
  // NOT given a `jats` maps_to in the vocab: emitSection also calls
  // mapAttributes('jats'), so a vocab jats mapping plus this direct emit would
  // write the attribute twice — the double-emit landmine #77 is about.
  //   - id: #4 (doc41 IDREFS).
  //   - sec-type: #78 — the raw kwarg value passes through verbatim (JATS permits
  //     custom sec-type values, so it is not validated against the suggested list,
  //     and it is not the html `data-sec-type` form). Applies to all three section
  //     levels, which all flow through emitSection.
  const id = secNode.id ? ` id="${escapeXmlAttr(secNode.id)}"` : '';
  const secType = secNode.kwargs?.['sec-type']
    ? ` sec-type="${escapeXmlAttr(secNode.kwargs['sec-type'])}"`
    : '';
  const attrs = aggregateJatsAttrs(mapAttributes(
    secNode, VOCABULARY[secNode.tagname], 'jats', jatsEmit
  ));
  const content = Array.isArray(secNode.content) ? secNode.content : [];
  const titleTag = secNode.tagname === 'section' ? 'section-title'
                 : secNode.tagname === 'sub-section' ? 'sub-section-title'
                 : 'sub-sub-section-title';
  const titleNode = content.find(c => isEnscribeTag(c, titleTag));
  const rest = content.filter(c => !isEnscribeTag(c, titleTag));

  let out = `${pad}<sec${id}${secType}${attrs}>\n`;
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

// Enscribe Layer 1 inline element → JATS inline element.
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
    } else if (isEnscribeTagNode(child)) {
      // Phase 5 slice 5b: inline-math gets its own JATS shape.
      if (child.tagname === 'inline-math') {
        out += emitInlineFormulaJats(child);
        continue;
      }
      // Phase 5 slice 5c: cross-references and citations.
      if (child.tagname === '__ref-marker') {
        out += emitXrefMarker(child);
        continue;
      }
      if (child.tagname === '__ref-error') {
        // Render the error inline; JATS has no canonical "broken ref"
        // construct so we emit the same ??ref: ...?? marker the HTML
        // side uses.
        const id = child.kwargs?.targetId ?? '(none)';
        out += `<italic specific-use="ref-error">??ref: ${escapeXml(id)}??</italic>`;
        continue;
      }
      if (child.tagname === '__cite-marker') {
        out += emitCiteMarker(child);
        continue;
      }
      if (child.tagname === '__cite-error') {
        const keys = child.kwargs?.keys ?? '(none)';
        out += `<italic specific-use="cite-error">??cite: ${escapeXml(keys)}??</italic>`;
        continue;
      }
      // Phase 5 slice 5c: inline footnote marker. JATS convention:
      // `<xref ref-type="fn" rid="...">N</xref>`. The `refId` (e.g.
      // `noteref-3`) is the id for back-reference targeting; the
      // `rid` points to the corresponding `<fn id="noteId">` in
      // `<fn-group>`.
      if (child.tagname === '__note-marker') {
        const noteId = child.kwargs?.noteId ?? '';
        const number = child.kwargs?.number ?? '';
        const refId  = child.kwargs?.refId  ?? '';
        out += `<xref ref-type="fn" id="${escapeXmlAttr(refId)}" ` +
               `rid="${escapeXmlAttr(noteId)}">${escapeXml(String(number))}</xref>`;
        continue;
      }
      // <a> → JATS link. An external href maps to <ext-link>; an internal
      // #fragment maps to <xref> (per a.md's JATS mapping). The xlink
      // namespace is already declared on the JATS root (also used by <graphic>).
      if (child.tagname === 'a') {
        const href = child.kwargs?.href ?? '';
        const text = emitInlines(child.content);
        if (href.startsWith('#')) {
          out += `<xref rid="${escapeXmlAttr(href.slice(1))}">${text}</xref>`;
        } else {
          out += `<ext-link ext-link-type="uri" xlink:href="${escapeXmlAttr(href)}">${text}</ext-link>`;
        }
        continue;
      }
      const jatsTag = INLINE_MAP[child.tagname];
      if (jatsTag) {
        out += `<${jatsTag}>${emitInlines(child.content)}</${jatsTag}>`;
      } else {
        // Unknown inline — emit text content only.
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

// ─── Bibliography emission (Phase 5 slice 5d) ─────────────────────────────

/**
 * Map a CSL-JSON entry `type` to the JATS `publication-type`
 * attribute value on `<element-citation>`. Both vocabularies agree
 * on most types, with a few renames (paper-conference → confproc;
 * thesis variants → thesis; webpage → webpage).
 *
 * Unknown types fall back to `'other'` (JATS allows arbitrary
 * publication-type values; using 'other' for unmapped CSL types
 * keeps the attribute present without claiming a specific kind).
 */
const CSL_TYPE_TO_JATS_PUB_TYPE = {
  'article-journal':   'journal',
  'article-magazine':  'magazine',
  'article-newspaper': 'newspaper',
  'article':           'journal',
  'book':              'book',
  'chapter':           'book',
  'paper-conference':  'confproc',
  'thesis':            'thesis',
  'report':            'report',
  'webpage':           'webpage',
  'manuscript':        'preprint',
  'patent':            'patent',
  'software':          'software',
  'dataset':           'data',
};

/**
 * Emit a JATS `<ref-list>` for the `__bibliography` internal node
 * built by `enscribe/interpreter`'s `bibliography.js`. Iterates the
 * structured CSL-JSON entries (`kwargs.cslEntries`, threaded through
 * by slice 5d's bibliography.js change) in document-citation order
 * and emits one `<ref id="ref-KEY"><element-citation>...</element-
 * citation></ref>` per entry.
 *
 * The `<ref>` ids match the `rid="ref-KEY"` cite cross-references
 * produced by `emitCiteMarker` in slice 5c — so JATS readers can
 * follow inline citations to the bibliography.
 *
 * If no CSL entries are present (legacy code path, or no library
 * loaded), emit an empty `<ref-list>`. The HTML-side `bibBodyHtml`
 * isn't passed through because JATS expects structured fields, not
 * HTML-formatted strings.
 */
function emitRefListJats(node, indent) {
  const pad = ' '.repeat(indent);
  const entries = Array.isArray(node.kwargs?.cslEntries) ? node.kwargs.cslEntries : [];
  let out = `${pad}<ref-list>\n`;
  out += `${pad}  <title>References</title>\n`;
  for (const entry of entries) {
    out += emitRefJats(entry, indent + 2);
  }
  out += `${pad}</ref-list>\n`;
  return out;
}

/**
 * Emit a single JATS `<ref>` containing an `<element-citation>` for
 * one CSL-JSON entry. The id matches the `ref-KEY` convention used
 * by the cite-xref emission in slice 5c.
 *
 * Field mapping per Q2 of the slice 5d investigation:
 *   id        → <ref id="ref-{id}">
 *   type      → publication-type attribute (via CSL_TYPE_TO_JATS_PUB_TYPE)
 *   author    → <person-group person-group-type="author"> with <name>s
 *   editor    → <person-group person-group-type="editor"> with <name>s
 *   title     → <article-title> (journal/conference/chapter) or
 *               <source> (book — title IS the source)
 *   container-title → <source> (journal/proceedings name; for books
 *               with a container-title, it's the series name — also
 *               <source>)
 *   issued    → <year>YYYY</year>[<month>MM</month>[<day>DD</day>]]
 *   volume    → <volume>
 *   issue     → <issue>
 *   page      → "1-10" splits to <fpage>1</fpage><lpage>10</lpage>;
 *               single-page "5" emits <fpage>5</fpage> only
 *   DOI       → <pub-id pub-id-type="doi">
 *   publisher → <publisher-name> (inside <publisher>)
 *   publisher-place → <publisher-loc> (inside <publisher>)
 *   URL       → <ext-link ext-link-type="uri" xlink:href="...">URL</ext-link>
 */
function emitRefJats(entry, indent) {
  const pad = ' '.repeat(indent);
  const id = entry.id ?? entry['citation-key'] ?? null;
  const pubType = CSL_TYPE_TO_JATS_PUB_TYPE[entry.type] ?? 'other';
  const isBook  = entry.type === 'book' || entry.type === 'chapter';

  let out = `${pad}<ref id="ref-${escapeXmlAttr(String(id ?? ''))}">\n`;
  out += `${pad}  <element-citation publication-type="${pubType}">\n`;

  // Person groups: authors first, then editors (JATS convention).
  if (Array.isArray(entry.author) && entry.author.length > 0) {
    out += emitPersonGroupJats(entry.author, 'author', indent + 4);
  }
  if (Array.isArray(entry.editor) && entry.editor.length > 0) {
    out += emitPersonGroupJats(entry.editor, 'editor', indent + 4);
  }

  // Title element depends on type:
  //   - For book (no container-title) → title IS the source.
  //   - For chapter (with container-title) → <chapter-title> + container as <source>.
  //   - For everything else → <article-title>.
  if (entry.title) {
    if (entry.type === 'book' && !entry['container-title']) {
      out += `${pad}    <source>${escapeXml(String(entry.title))}</source>\n`;
    } else if (entry.type === 'chapter') {
      out += `${pad}    <chapter-title>${escapeXml(String(entry.title))}</chapter-title>\n`;
    } else {
      out += `${pad}    <article-title>${escapeXml(String(entry.title))}</article-title>\n`;
    }
  }

  // <source> from container-title (skip if already emitted as <source> above).
  if (entry['container-title'] && !(entry.type === 'book' && !entry['container-title'])) {
    out += `${pad}    <source>${escapeXml(String(entry['container-title']))}</source>\n`;
  }

  // Date — from issued.date-parts[0]; emit only the parts present.
  const dateParts = entry.issued?.['date-parts']?.[0];
  if (Array.isArray(dateParts) && dateParts.length > 0) {
    const [year, month, day] = dateParts;
    if (year != null)  out += `${pad}    <year>${escapeXml(String(year))}</year>\n`;
    if (month != null) out += `${pad}    <month>${escapeXml(String(month).padStart(2, '0'))}</month>\n`;
    if (day != null)   out += `${pad}    <day>${escapeXml(String(day).padStart(2, '0'))}</day>\n`;
  }

  // Volume / issue.
  if (entry.volume != null) out += `${pad}    <volume>${escapeXml(String(entry.volume))}</volume>\n`;
  if (entry.issue  != null) out += `${pad}    <issue>${escapeXml(String(entry.issue))}</issue>\n`;

  // Pages — split "first-last" into <fpage>/<lpage>; single page → <fpage> only.
  if (entry.page != null) {
    const pageStr = String(entry.page);
    // Citation-js normalizes "45--67" to "45-67"; split on first hyphen
    // (or en-dash if present).
    const m = pageStr.match(/^(\S+?)\s*[-–]\s*(\S+)$/);
    if (m) {
      out += `${pad}    <fpage>${escapeXml(m[1])}</fpage>\n`;
      out += `${pad}    <lpage>${escapeXml(m[2])}</lpage>\n`;
    } else {
      out += `${pad}    <fpage>${escapeXml(pageStr)}</fpage>\n`;
    }
  }

  // Publisher group — name + location. JATS allows them as siblings
  // (no wrapper required); the element-citation content model accepts
  // either order.
  if (entry.publisher != null) {
    out += `${pad}    <publisher-name>${escapeXml(String(entry.publisher))}</publisher-name>\n`;
  }
  if (entry['publisher-place'] != null) {
    out += `${pad}    <publisher-loc>${escapeXml(String(entry['publisher-place']))}</publisher-loc>\n`;
  }

  // DOI.
  if (entry.DOI != null) {
    out += `${pad}    <pub-id pub-id-type="doi">${escapeXml(String(entry.DOI))}</pub-id>\n`;
  }

  // URL (when no DOI; if both present, DOI is the canonical id and URL is supplementary).
  if (entry.URL != null) {
    const u = escapeXmlAttr(String(entry.URL));
    out += `${pad}    <ext-link ext-link-type="uri" xlink:href="${u}">${escapeXml(String(entry.URL))}</ext-link>\n`;
  }

  // Suppress unused-variable lint warning for isBook; reserved for
  // future chapter-vs-book-title differentiation refinement.
  void isBook;

  out += `${pad}  </element-citation>\n`;
  out += `${pad}</ref>\n`;
  return out;
}

/**
 * Emit a JATS `<person-group>` containing one `<name>` per CSL-JSON
 * person object (`{family, given}` shape). Falls back to
 * `<string-name>` for entries that have neither family nor given
 * (e.g. CSL's `literal` form for organization names like "World
 * Health Organization").
 */
function emitPersonGroupJats(persons, groupType, indent) {
  const pad = ' '.repeat(indent);
  let out = `${pad}<person-group person-group-type="${groupType}">\n`;
  for (const p of persons) {
    if (p == null) continue;
    if (typeof p === 'string') {
      out += `${pad}  <string-name>${escapeXml(p)}</string-name>\n`;
      continue;
    }
    if (p.literal) {
      out += `${pad}  <string-name>${escapeXml(String(p.literal))}</string-name>\n`;
      continue;
    }
    const family = p.family != null ? String(p.family) : null;
    const given  = p.given  != null ? String(p.given)  : null;
    if (family || given) {
      out += `${pad}  <name>\n`;
      if (family) out += `${pad}    <surname>${escapeXml(family)}</surname>\n`;
      if (given)  out += `${pad}    <given-names>${escapeXml(given)}</given-names>\n`;
      out += `${pad}  </name>\n`;
    }
  }
  out += `${pad}</person-group>\n`;
  return out;
}

// ─── Cross-reference + citation emission (Phase 5 slice 5c) ───────────────

/**
 * Map a colon-id prefix (the `eqn` of `eqn:newton`) to the JATS
 * `<xref>` `ref-type` attribute value. This is the JATS-side
 * counterpart of `enscribe/interpreter`'s prefix→display-word
 * dictionary in `ref-resolution.js`.
 *
 * Per JATS Archiving 1.3 enumerated ref-type values used in this
 * project's vocabulary:
 *   - `fig`           — figure-family (fig/svg/frame/mermaid/abc)
 *   - `table`         — table-family (table/csv/tsv)
 *   - `disp-formula`  — display equations
 *   - `sec`           — sections
 *   - `statement`     — theorem family (theorem/lemma/corollary/proposition/
 *                       definition/example/remark/proof)
 *   - `fn`            — footnotes
 *   - `bibr`          — bibliographic references (set directly by
 *                       emitCiteMarker, not via this table)
 *
 * Unknown prefixes fall through to `null`; emitXrefMarker then omits
 * the `ref-type` attribute (JATS allows that — the `rid` alone is
 * enough for consumers to follow the link).
 */
const REF_TYPE_BY_PREFIX = {
  eqn:  'disp-formula',
  fig:  'fig',
  tab:  'table',
  sec:  'sec',
  note: 'fn',
  code: 'fig',           // code-block frameables (PG-6) render as figures in JATS
  thm:  'statement', lem:  'statement', cor:  'statement',
  prop: 'statement', def:  'statement', ex:   'statement',
};

/**
 * Emit a JATS `<xref>` for a resolved `__ref-marker`. The marker
 * carries pre-computed display text (chapter-prefixed for chapter-
 * scope counters per ref-resolution.js's `computeRefText`); we use
 * that as the xref content. `ref-type` is inferred from the target
 * id's colon-prefix (see REF_TYPE_BY_PREFIX) — cleaner than a
 * registry round-trip at emit time, and matches the
 * vocab-declaration of which prefixes mean which kinds.
 */
function emitXrefMarker(node) {
  const targetId = node.kwargs?.targetId ?? '';
  const text = node.kwargs?.text ?? targetId;
  const parsed = parseColonId(targetId);
  const refType = parsed ? REF_TYPE_BY_PREFIX[parsed.prefix] ?? null : null;
  const rt = refType ? ` ref-type="${refType}"` : '';
  return `<xref${rt} rid="${escapeXmlAttr(targetId)}">${escapeXml(text)}</xref>`;
}

/**
 * Emit JATS `<xref ref-type="bibr">` markers for a resolved
 * `__cite-marker`. The marker carries `kwargs.keys` (comma-separated
 * bibtex keys) and `kwargs.html` (the pre-formatted citation HTML
 * from citation-js).
 *
 * JATS convention: one `<xref>` per cited key, each pointing to
 * `rid="ref-KEY"` (matching the id injected into the bibliography by
 * `bibliography.js`'s `formatBibliography`). The xref content is the
 * raw key — JATS consumers typically re-render against the
 * bibliography element rather than relying on the inline text. The
 * pre-rendered citation-js HTML doesn't fit JATS's structured
 * convention (it's HTML-flavored), so we don't pass it through.
 *
 * Keys are joined with "; " between xrefs — the most common JATS
 * convention for multi-cite groupings (matches e.g. "[<xref/>;
 * <xref/>]" patterns in published JATS articles).
 */
function emitCiteMarker(node) {
  const keysStr = node.kwargs?.keys ?? '';
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return '';
  const xrefs = keys.map(k =>
    `<xref ref-type="bibr" rid="ref-${escapeXmlAttr(k)}">${escapeXml(k)}</xref>`,
  );
  return xrefs.join('; ');
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isEnscribeTagNode(node) {
  return node != null && node.type === 'enscribeTag';
}

function isEnscribeTag(node, tagname) {
  return isEnscribeTagNode(node) && node.tagname === tagname;
}

function findTagInChildren(children, tagname) {
  for (const c of children ?? []) {
    if (isEnscribeTag(c, tagname)) return c;
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

/**
 * Escape XML attribute values (used in raw id="..." strings emitted
 * outside the mapAttributes/jatsEmit pathway).
 */
function escapeXmlAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}
