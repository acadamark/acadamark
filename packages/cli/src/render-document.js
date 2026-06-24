// One shared per-document render path.
//
// Before this module the CLI single-document build (`render` → an article via processSync;
// `build` → a book via assembleMasterDocument + runSync + publishBookPages) and the static-website
// emitter EACH reconstructed `buildEnscribePipeline(...)` + the same article/book render steps on
// their own — two copies of the same render logic ("two parsers"). This module is the single place
// that constructs the document pipeline and runs the article / book render; both callers go through
// it, so there is one render path.
//
// Options are the caller's to set. The pipeline options object is passed STRAIGHT THROUGH to
// buildEnscribePipeline — no whitelisting, no defaults injected here — so a caller gets exactly what
// an inline `buildEnscribePipeline(pipeOpts)` gave it. A standalone build passes the full set
// (embedResources / dslMode / toc / theme / chapterNav / assetsDir); a website page passes only
// `assetsDir` and its other options stay at the library defaults — by design (a 45-page site does not
// inline ~260 KB of KaTeX CSS into every page). The construction is identical either way.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VFile } from 'vfile';
import { buildEnscribePipeline, assembleMasterDocument } from '@enscribejs/enscribe';

/**
 * Construct the document render pipeline. The one place `buildEnscribePipeline` is called for a
 * document render (the JATS export / pandoc-import tree renders are a separate, tree-not-source path).
 * @param {object} [pipeOpts] - buildEnscribePipeline options, verbatim (assetsDir, embedResources, …).
 */
export function buildDocumentPipeline(pipeOpts = {}) {
  return buildEnscribePipeline(pipeOpts);
}

/**
 * Render a single ARTICLE document: source → a full standalone HTML string.
 * @param {string|object} source - .emd source text (or a `{ value, data }` vfile-like, for #133 URL srcs).
 * @param {object} [pipeOpts]    - pipeline options, passed through to buildDocumentPipeline.
 */
export function renderArticleDocument(source, pipeOpts = {}) {
  return String(buildDocumentPipeline(pipeOpts).processSync(source));
}

/**
 * Assemble a multi-file master (loading its `<section/chapter src>` children), construct the pipeline,
 * and run the transforms once — the shared front half of a BOOK build. Returns `{ numbered, file, proc }`
 * so the caller can detect the doc-type off `file.data`, publish per-chapter pages
 * (`publishBookPages({ numbered, file, proc, defaultCss })`), or stringify the single-page form
 * (`proc.stringify(numbered, file)`) — exactly as the inline code did.
 *
 * @param {object}   o
 * @param {string}   o.source     - the master .emd source.
 * @param {string}   o.sourcePath - the master's path (→ the VFile path; reachable for the registry harvest).
 * @param {string}   o.masterDir  - directory the children's `src` paths resolve against.
 * @param {Function} o.warn       - (message) => void, for assembler diagnostics.
 * @param {object}   [o.pipeOpts] - pipeline options, passed through to buildDocumentPipeline.
 * @param {object}   [o.fileData] - seed values for the VFile's `data` BEFORE the run (#300 slice 2: the
 *   static website seeds `enscribeRegistry` with a read-through over the merged SITE registry so a book
 *   chapter's outbound cross-page `<ref>` resolves to the target page's native number). Default: none.
 */
export function assembleAndNumber({ source, sourcePath, masterDir, warn, pipeOpts = {}, fileData }) {
  const proc = buildDocumentPipeline(pipeOpts);
  const file = new VFile({ path: sourcePath, ...(fileData ? { data: fileData } : {}) });
  const tree = assembleMasterDocument({
    source,
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(masterDir, rel),
    parse: (s) => proc.parse(s),
    warn,
  });
  const numbered = proc.runSync(tree, file);
  return { numbered, file, proc };
}
