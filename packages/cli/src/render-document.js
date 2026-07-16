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
import { buildEnscribePipeline, assembleMasterDocument, hasMasterSrcEntries, spliceBookInterstitial } from '@enscribejs/enscribe';

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
  // <include> primitive) assembles BEFORE the pipeline runs. #426: the gate is STRUCTURAL —
  // parse first, then ask hasMasterSrcEntries(tree); a src-form inside a code fence or
  // inline-code span parses as literal text and can never trigger assembly (the #424
  // regression that leaked the Design page's teaching examples into live tags). Parse-once:
  // a parse is ~50% of a full render (measured), so BOTH branches reuse this one parse —
  // the no-src path runs the already-parsed tree (unified's own processSync sequence:
  // parse → run → stringify on one vfile), and the assembly path hands the tree to the
  // assembler via a memoized parse. Paths resolve against assetsDir (the pipeline's
  // existing resolution base), falling back to the source file's own directory.
  const value = typeof source === 'string' ? source : String(source.value ?? '');
  const proc = buildDocumentPipeline(pipeOpts);
  const file = new VFile(
    typeof source === 'string'
      ? { value }
      : { value, ...(source.path ? { path: source.path } : {}), ...(source.data ? { data: source.data } : {}) },
  );
  const parsed = proc.parse(file);
  let tree = parsed;
  if (hasMasterSrcEntries(parsed)) {
    const base = pipeOpts.assetsDir
      ?? (typeof source === 'object' && source.path ? dirname(source.path) : '.');
    // The assembler's FIRST parse call is the master itself — hand it the parse already in
    // hand, exactly once (a child that happened to be byte-identical must still parse fresh:
    // shared nodes across two splice points would alias under runSync's in-place mutation).
    let masterParseServed = false;
    tree = assembleMasterDocument({
      source: value,
      readFile: (p) => readFileSync(p, 'utf8'),
      resolve: (rel) => join(base, rel),
      parse: (s) => {
        if (!masterParseServed && s === value) { masterParseServed = true; return parsed; }
        return proc.parse(s);
      },
      warn: (m) => file.message(m),
      ...(typeof source === 'object' && source.path ? { selfSrc: basename(source.path) } : {}),
    });
  }
  const ran = proc.runSync(tree, file);
  file.value = String(proc.stringify(ran, file));
  return file;
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
export function assembleAndNumber({ source, sourcePath, masterDir, warn, pipeOpts = {}, fileData, trailingBody }) {
  const proc = buildDocumentPipeline(pipeOpts);
  // The VFile carries the master `source` as its `value` (#451): resolveStrictMode reparses
  // `file.value` to apply the registers-off strict register, and it is the ONLY pass that reads
  // file.value as source (verified). Without it, an assembled document under `strict-mode=sigil|
  // canonical` reparsed the empty string and the swap wiped the whole document to an empty
  // <article>. A single-file book/website reparses faithfully from this; a multi-file master's
  // reparse is detected as unfaithful and skipped (resolveStrictMode's guard), so children survive.
  const file = new VFile({ path: sourcePath, value: source, ...(fileData ? { data: fileData } : {}) });
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
  // #433: a website book page's TRAILING interstitial (marker-7 body) splices into the LAST book-part
  // before numbering, so its figures number in that chapter's scope and its ids are owned by that page.
  // Deep-cloned per call inside the helper — this runs in BOTH phases and runSync mutates in place.
  tree.children = spliceBookInterstitial(tree.children, trailingBody);
  const numbered = proc.runSync(tree, file);
  return { numbered, file, proc };
}
