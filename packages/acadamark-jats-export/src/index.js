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
  // Phase 5 slice 5b (2026-05-29): pre-process to wrap loose inline-
  // shaped content (mdast text nodes, inline acadamarkTags) into
  // synthetic paragraphs. Without this, the slice-5a-known abstract
  // limitation drops surrounding prose around bare-markdown-lifted
  // inline tags — emitBlock's default-case path treated each inline
  // acadamarkTag as a separate block-context `<p>` and dropped text
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
 * text, inline acadamarkTags from the INLINE_MAP set) into synthetic
 * mdast `paragraph` nodes. Block-shaped nodes (sections, headings, p,
 * frameables, lists, math, theorems, etc.) pass through unchanged.
 *
 * The fix for the abstract limitation: bare prose between
 * inline-acadamarkTag children becomes paragraph-wrapped rather than
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
  if (!isAcadamarkTagNode(node)) return false;
  // Inline acadamarkTags from the INLINE_MAP plus inline-math
  // (handled separately by emitInlineFormulaJats but inline-shaped
  // for grouping purposes — its presence in a paragraph shouldn't
  // fragment the paragraph into separate <p>s). Block-level
  // acadamarkTags (sections, p, frameables, lists, math envs,
  // theorems) are NOT inline-shaped.
  if (INLINE_MAP[node.tagname]) return true;
  if (node.tagname === 'inline-math') return true;
  return false;
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
 * `acadamark-interpreter/src/lib/frameable.js`. Falls back to reading
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
    if (isAcadamarkTag(child, 'caption') && caption == null) {
      caption = Array.isArray(child.content) ? child.content : [];
    } else if (isAcadamarkTag(child, 'title') && title == null) {
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
    out += `${pad}  <label>${escapeXml(String(number))}</label>\n`;
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
    out += `${pad}  <label>${escapeXml(String(number))}</label>\n`;
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
  // Inner <table>. For slice 5b, emit a minimal placeholder — the
  // table data is stored as opaque CSV/TSV/etc. source in
  // node.content. Slice 5b's scope ends at the structural wrapper;
  // parsing the data and emitting `<thead>`/`<tbody>` from it
  // (mirroring the HTML side's `renderParsedTable`) is a depth-of-
  // implementation choice. For now: emit the table with a comment.
  const fmt = node.tagname === 'table' ? (node.positional?.[0] ?? 'raw')
            : node.tagname;
  out += `${pad}  <table>\n`;
  out += `${pad}    <!-- table data parsed at HTML stage; format=${fmt} -->\n`;
  out += `${pad}  </table>\n`;
  out += `${pad}</table-wrap>\n`;
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
    if (!isAcadamarkTag(child, 'li')) continue;
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
      if (!isAcadamarkTag(entry, 'glossary-entry')) continue;
      out += emitDefItemFromGlossaryEntry(entry, indent + 2);
    }
  } else {
    // <dl>: pair consecutive dt + dd.
    let i = 0;
    while (i < children.length) {
      if (isAcadamarkTag(children[i], 'dt')) {
        const term = children[i];
        const def = (i + 1 < children.length && isAcadamarkTag(children[i + 1], 'dd'))
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
  const termNode = children.find(c => isAcadamarkTag(c, 'term') || isAcadamarkTag(c, 'dt'));
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
    out += `${pad}  <label>(${escapeXml(String(number))})</label>\n`;
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
    out += `${pad}  <label>${escapeXml(`${labelPrefix} ${number}.`)}</label>\n`;
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
  let out = `${pad}<boxed-text content-type="aside"${id}>\n`;
  out += emitBodyChildren(node.content, indent + 2);
  out += `${pad}</boxed-text>\n`;
  return out;
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
      // Phase 5 slice 5b: inline-math gets its own JATS shape
      // (`<inline-formula>` containing `<tex-math>`). Other math
      // tags are block-shaped and shouldn't appear in inline
      // context, but handle defensively.
      if (child.tagname === 'inline-math') {
        out += emitInlineFormulaJats(child);
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
