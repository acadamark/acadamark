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
import { join, dirname, basename } from 'node:path';
import { VFile } from 'vfile';
import { buildEnscribePipeline, assembleMasterDocument, HAS_MASTER_SRC } from '@enscribejs/enscribe';

/**
 * Construct the document render pipeline. The one place `buildEnscribePipeline` is called for a
 * document render (the JATS export / pandoc-import tree renders are a separate, tree-not-source path).
 * @param {object} [pipeOpts] - buildEnscribePipeline options, verbatim (assetsDir, embedResources, …).
 */
export function buildDocumentPipeline(pipeOpts = {}) {
  return buildEnscribePipeline(pipeOpts);
}

/**
 * Render a single ARTICLE document and return the processed VFile — the rendered HTML is
 * `String(file)`, and `file.messages` carries the run's diagnostics for the reporting seam
 * (#402; before this, the file was stringified here and its messages discarded — the
 * write-only channel the audit named at exactly this spot).
 * @param {string|object} source - .emd source text (or a vfile-like `{ value, path, data }`,
 *   for #133 URL srcs and #402 filename provenance).
 * @param {object} [pipeOpts]    - pipeline options, passed through to buildDocumentPipeline.
 * @returns {import('vfile').VFile}
 */
export function renderArticleFile(source, pipeOpts = {}) {
  // #424: assembly is universal — a source carrying src-entries (structural forms or the
  // <include> primitive) assembles BEFORE the pipeline runs, exactly as the browser's
  // renderMasterAsync wrapper branches on the same HAS_MASTER_SRC gate. This is what makes
  // `enscribe render` and a website article page splice includes; a source with no
  // src-bearing tags takes the unchanged processSync path (assembleMasterDocument on such
  // a source is a passthrough, so the gate is a fast-path, not a semantic fork). Paths
  // resolve against assetsDir (the pipeline's existing resolution base), falling back to
  // the source file's own directory.
  const value = typeof source === 'string' ? source : String(source.value ?? '');
  if (HAS_MASTER_SRC.test(value)) {
    const proc = buildDocumentPipeline(pipeOpts);
    const file = new VFile(
      typeof source === 'string'
        ? {}
        : { ...(source.path ? { path: source.path } : {}), ...(source.data ? { data: source.data } : {}) },
    );
    const base = pipeOpts.assetsDir
      ?? (typeof source === 'object' && source.path ? dirname(source.path) : '.');
    const tree = assembleMasterDocument({
      source: value,
      readFile: (p) => readFileSync(p, 'utf8'),
      resolve: (rel) => join(base, rel),
      parse: (s) => proc.parse(s),
      warn: (m) => file.message(m),
      ...(typeof source === 'object' && source.path ? { selfSrc: basename(source.path) } : {}),
    });
    const ran = proc.runSync(tree, file);
    file.value = String(proc.stringify(ran, file));
    return file;
  }
  return buildDocumentPipeline(pipeOpts).processSync(source);
}

/**
 * Render a single ARTICLE document: source → a full standalone HTML string.
 * @param {string|object} source - .emd source text (or a `{ value, data }` vfile-like, for #133 URL srcs).
 * @param {object} [pipeOpts]    - pipeline options, passed through to buildDocumentPipeline.
 */
export function renderArticleDocument(source, pipeOpts = {}) {
  return String(renderArticleFile(source, pipeOpts));
}

/**
 * Render a PRE-PARSED article tree (mdast root) and return the processed VFile — the source-less
 * counterpart of renderArticleFile, for an inline website `<item | Title>` page whose content is
 * authored body nodes, not a child file (#417: the zero-length-splice case of §Transclusion).
 * Skips the parse step (the nodes are already parsed) and runs the same runSync → stringify the
 * source path runs, so an inline page renders byte-identically to the same body written as its own
 * article — AND, like renderArticleFile, carries its run's diagnostics in `file.messages` so an
 * inline page reaches the reporting seam like every other page (#402/#415). `data` seeds the VFile
 * BEFORE the run (the site read-through registry), exactly as the `{ value, data }` source form does.
 * @param {object} tree     - an mdast root `{ type: 'root', children: [...] }`.
 * @param {object} [pipeOpts] - pipeline options (assetsDir, …), verbatim.
 * @param {object} [data]    - VFile data seeded before runSync (e.g. the site registry read-through).
 * @returns {import('vfile').VFile}
 */
export function renderArticleTreeFile(tree, pipeOpts = {}, data = {}) {
  const proc = buildDocumentPipeline(pipeOpts);
  const file = new VFile({ data });
  const ran = proc.runSync(tree, file);              // transforms push diagnostics onto `file`
  file.value = String(proc.stringify(ran, file));    // compile → the vfile's value is the HTML
  return file;                                       // String(file) === HTML; file.messages === diagnostics
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
 * @param {Function} [o.warn]     - (message) => void, for assembler diagnostics. Default (#402):
 *   `file.message` — assembler diagnostics join the document's message stream, so the
 *   reporting seam surfaces them with the master's filename. A caller with its own sink
 *   (the static website's warnings[] account) still passes one.
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
    warn: warn ?? ((m) => file.message(m)),
    // #424: seed the include-cycle chain with the master's own name, so a chain that
    // leads back to the master flags at the first re-entry with the full chain named.
    ...(sourcePath ? { selfSrc: basename(sourcePath) } : {}),
  });
  const numbered = proc.runSync(tree, file);
  return { numbered, file, proc };
}
