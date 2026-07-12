// The `enscribe` command-line interface.
//
// A thin layer over the existing pipelines — it adds no capability the library
// does not already have. Two commands for v0.1.0:
//
//   enscribe render <input.emd>        → HTML   (buildEnscribePipeline.processSync)
//   enscribe export-jats <input.emd>   → JATS   (runSync → enscribeToJats)
//   enscribe lift <input.emd>          → canonical Enscribe source
//                                        (liftToCanonicalMdast → serializeCanonical)
//
// The CLI lives in its own package (`@enscribejs/cli`) rather than inside the
// headline `enscribe` library, because the `export-jats` / `import-jats`
// commands need the JATS bridge (the `jats-export` / `jats-import` modules in
// this package), which itself depends on the interpreter — folding the CLI and
// JATS code into `enscribe` would bloat the library and couple it to the
// filesystem-bound CLI surface.

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, cpSync } from 'node:fs';
import { dirname, resolve, join, basename, extname } from 'node:path';
import { createRequire } from 'node:module';
import { buildEnscribePipeline, liftToCanonicalMdast, collectLibrarySources, preloadSources, ENSCRIBE_LOADED_SOURCES, publishBookPages, extractDocumentTitle, extractTitleFromTree } from '@enscribejs/enscribe';
import { emitDocumentShell } from '@enscribejs/enscribe/shell/document-shell.js';
import { escapeHtmlAttr } from '@enscribejs/enscribe/core/escape-html';
import { classifyDocType } from '@enscribejs/enscribe/interpreter/lib/classify-doc-type';
import { VFile } from 'vfile';
import { renderArticleFile, assembleAndNumber } from './render-document.js';
import { createDiagnostics, diagnosticsScript } from './diagnostics.js';
import { buildLiveFolder, buildSingleFile, copyShellAssets } from './build-live.js';
import { buildStaticWebsite } from './static-website.js';
import { enscribeToJats } from './jats-export/index.js';
import { importJats } from './jats-import/index.js';
import { serializeCanonical } from './serialize-canonical.js';
import { detectFormat, runPandoc, findBibtex, convertPandoc, PandocMissingError } from './pandoc-import.js';

const require = createRequire(import.meta.url);
const PKG = require('../package.json');

// Errors of this class carry a user-facing message (missing file, bad flag).
// Anything else that escapes is an unexpected bug and prints with more context.
class CliError extends Error {}

const TOP_HELP = `enscribe — command-line tools for the Enscribe authoring system

Usage:
  enscribe <command> [options]

Commands:
  render <input.emd>       Render an Enscribe document to self-contained HTML
  build <master.emd>       Assemble a multi-file master document, then render it
  export-jats <input.emd>  Export an Enscribe document to JATS 1.3 XML
  import-jats <input.xml>  Import a JATS XML article (→ HTML, or --emd source)
  import <input>           Import LaTeX / Quarto / DOCX / … via pandoc
  lift <input.emd>         Rewrite mixed markdown/sigil source to canonical form
  lower <input.emd>        Rewrite to a shorter form (sigils; --markdown idioms)

Options:
  -h, --help     Show this help
  -v, --version  Show the version

Run 'enscribe <command> --help' for command-specific options.
`;

const LIFT_HELP = `enscribe lift — rewrite a document to canonical Enscribe form

Takes Enscribe source that mixes markdown idioms (\`## Title\`, \`**bold**\`),
sigil shorthands (\`<# Title #>\`), and canonical named tags, and emits
equivalent source in canonical named-tag form (\`<section | Title>\`, \`<b>bold</b>\`).

Usage:
  enscribe lift <input.emd> [options]

Options:
  -o, --output <file>  Write canonical source to <file> (default: stdout)
  --quiet              Suppress warnings
  -h, --help           Show this help

Notes:
  - Opaque math and code use their canonical sigil forms (<$ … $>, <\$\$ … \$\$>,
    <\` … \`>, <\`\`\` … \`\`\`>) — the only forms that preserve verbatim content.
  - Lists re-emit as markdown list syntax; Enscribe has no canonical list tag.
  - Markdown links become <span> (Enscribe has no markdown-link form).
  - Best-effort: common documents round-trip exactly; rare escaping edge cases
    may need manual cleanup.
`;

const IMPORT_JATS_HELP = `enscribe import-jats — import a JATS XML article

Parses a JATS 1.3 article and renders it through Enscribe. By default the output
is a complete, styled, standalone HTML page — doctype, <title> taken from the
article's title, the default stylesheet inlined — pipe it to a file and open it,
nothing else needed. With --emd it is canonical Enscribe source instead.

Usage:
  enscribe import-jats <input.xml> [options]

Options:
  --emd                Output canonical .emd source instead of HTML
  --fragment           Emit the bare eHTML fragment (no doctype/head/stylesheet)
  --css <path-or-url>  Link the given stylesheet from <head> INSTEAD of inlining
                       the default (obtain the default via 'render --emit-css')
  --title <text>       Override the derived page title
  -o, --output <file>  Write to <file> (default: stdout)
  --embed              Self-contained HTML (default; ignored with --emd)
  --no-embed           Link assets externally
  --quiet              Suppress warnings (including dropped-element notes)
  -h, --help           Show this help

Import is deliberately lossy and incremental: this release maps the structural
skeleton and inline formatting; citations, math, figures, tables, and the rest
are dropped with a note (later Phase 13 slices add them).
`;

const IMPORT_HELP = `enscribe import — import LaTeX / Quarto / DOCX / … via pandoc

Shells out to pandoc to read the input, then converts it to Enscribe. By default
the output is a complete, styled, standalone HTML page — doctype, <title> taken
from the document's title, the default stylesheet inlined — pipe it to a file
and open it, nothing else needed. With --emd it is canonical Enscribe source
instead. Requires pandoc on PATH (https://pandoc.org/installing.html).

Usage:
  enscribe import <input> [options]

Options:
  --from <format>      Override format detection (latex, markdown, docx, rst, …)
  --emd                Output canonical .emd source instead of HTML
  --fragment           Emit the bare eHTML fragment (no doctype/head/stylesheet)
  --css <path-or-url>  Link the given stylesheet from <head> INSTEAD of inlining
                       the default (obtain the default via 'render --emit-css')
  --title <text>       Override the derived page title
  -o, --output <file>  Write to <file> (default: stdout)
  --embed              Self-contained HTML (default; ignored with --emd)
  --no-embed           Link assets externally
  --quiet              Suppress warnings (unmapped pandoc nodes)
  -h, --help           Show this help

Format is detected from the extension (.tex .qmd .md .docx .rst .adoc .org …).
Citations resolve when a .bib file is found (the document's bibliography field,
or a single .bib beside the input). LaTeX \\label/\\ref cross-references are not
preserved by pandoc and arrive as plain links/text.
`;

const LOWER_HELP = `enscribe lower — rewrite a document to a shorter authoring form

Takes Enscribe source and lowers canonical named tags to their shorter forms:
sections become sigils (\`<# Title #>\`); with --markdown, headings and bold /
italic / strike also become markdown (\`# Title\`, \`**bold**\`, \`*italic*\`,
\`~~struck~~\`). Elements with no shorter form (\`<u>\`, \`<q>\`, \`<a>\`,
\`<note>\`, \`<cite>\`, \`<ref>\`, the theorem family, …) stay in Enscribe form,
so the output is "as short as possible", not pure markdown.

Usage:
  enscribe lower <input.emd> [options]

Options:
  --markdown           Also use markdown heading/bold/italic/strike forms
  -o, --output <file>  Write to <file> (default: stdout)
  --quiet              Suppress warnings
  -h, --help           Show this help
`;

const RENDER_HELP = `enscribe render — render an Enscribe document to a complete, styled HTML page

The default output is a standalone document: doctype, <title> taken from the
document's own <title> element, and the default stylesheet inlined — pipe it to
a file and open it, nothing else needed.

Usage:
  enscribe render <input.emd> [options]

Examples:
  enscribe render paper.emd -o paper.html      # styled, self-contained page
  enscribe render paper.emd --css house.css    # link YOUR stylesheet instead
  enscribe render --emit-css > enscribe.css    # obtain the default stylesheet
  enscribe render paper.emd --fragment         # bare eHTML for embedding

Options:
  -o, --output <file>  Write to <file> (default: stdout)
  --fragment           Emit the bare eHTML fragment (no doctype/head/stylesheet)
                       for embedding in a host page or pipeline — the pre-1.0
                       default, now opt-in
  --css <path-or-url>  Link the given stylesheet from <head> INSTEAD of inlining
                       the default one (theme a set of documents with one file;
                       pair with --emit-css to start from the default sheet)
  --emit-css           Print the default stylesheet and exit (no input needed)
  --title <text>       Override the derived page title
  --embed              Self-contained math/font assets, inlined (default)
  --no-embed           Link math/font assets from CDNs instead (smaller file,
                       needs network; the document stylesheet is inlined either
                       way — use --css to externalize it)
  --dsl-mode <mode>    Diagram (Mermaid/ABC) rendering: live-inline (default
                       when embedding), live-link (default with --no-embed),
                       static, skip
  --toc                Add a table-of-contents sidebar (--toc=auto to show it
                       only past three sections)
  --theme <name>       Apply a theme: default, modern, or compact (injects the
                       theme's token overrides after the stylesheet)
  --chapter-nav        For a book with --toc, opt into the single-chapter PAGING
                       view (default off — the book renders as one scrolling
                       document with chapter-navigation chrome)
  --quiet              Suppress warnings
  -h, --help           Show this help
`;

const BUILD_HELP = `enscribe build — assemble a multi-file master document, then render it

A master document names its child files with <section src> / <chapter src> entries;
build loads each child (paths relative to the master), stitches them into one tree
in document order, and renders it as an article or book per <meta type>.

A BOOK builds to SEPARATE per-chapter pages by default — one standalone HTML page per
chapter at a per-chapter URL (e.g. 1-introduction.html), plus index.html, each with
the reading-interface chrome and cross-chapter references linking across pages. Pass
-o <dir> to choose the output directory. --single-page builds the whole book as one
HTML file instead. Articles are always single-page.

Usage:
  enscribe build <master.emd> [options]

Options:
  -o, --output <path>  Output file (single-page) or DIRECTORY (separate-pages book)
  --separate-pages     Build a book as separate per-chapter pages (book default)
  --single-page        Build the whole book/article as one HTML file
  --live               Build a self-standing live folder (-o <dir>): the engine
                       renders client-side; ?edit mounts the editor
  --single-file        Emit ONE self-contained .html for one document: the source
                       is embedded (read at mount, no fetch); chrome/display assets
                       load from the web. Editable iff the document is self-contained
  --assets <mode>      Chrome/display asset delivery for --live / --single-file:
                       siblings (default for --live: copy assets flat),
                       cdn (default for --single-file: pinned jsDelivr),
                       inlined (embed engine + CSS + fonts + KaTeX + editor →
                       no network; --single-file opens from file://). External-DSL
                       diagram libs (mermaid/abc) still load from the CDN.
  --embed              Self-contained HTML, assets inlined (default)
  --no-embed           Link assets externally (fonts / KaTeX CSS from CDNs)
  --dsl-mode <mode>    DSL rendering mode: skip, live-link, live-inline, static
  --quiet              Suppress warnings
  -h, --help           Show this help

Note:
  Article and book master assembly both work, with cross-file numbering and
  cross-references resolved across the children. A book builds to separate per-
  chapter pages by default (--single-page for the whole book in one file).
  Cross-file citation/bibliography registry merge and placement markers
  (toc / endnotes / bibliography) are still deferred.
`;

const EXPORT_JATS_HELP = `enscribe export-jats — export an Enscribe document to JATS 1.3 XML

Usage:
  enscribe export-jats <input.emd> [options]

Options:
  -o, --output <file>  Write XML to <file> (default: stdout)
  --package            Emit a self-contained package instead of a lone XML file:
                       <outdir>/<name>.xml plus <outdir>/assets/ holding every
                       external file-backed asset (external <fig src>), with each
                       <graphic xlink:href> rewritten to assets/<name>. Requires
                       -o <dir>. Inline assets (inline SVG, DSL source, embedded
                       base64) stay inline. Without --package, external references
                       are emitted as-authored (they dangle) and a warning is shown.
  --quiet              Suppress warnings
  -h, --help           Show this help
`;

/**
 * Parse a command's argument list: one positional input file, an optional
 * `-o/--output`, and a small set of flags. Hand-rolled — the surface is tiny and
 * a dependency would be heavier than the code it replaces.
 */
function parseCommandArgs(args) {
  const opts = {
    input: null, output: null, help: false,
    embed: undefined, dslMode: undefined, quiet: false, markdown: false, emd: false,
    toc: undefined, theme: undefined, chapterNav: undefined, from: undefined,
    pages: undefined, package: false, assetDelivery: undefined,
    fragment: false, css: undefined, emitCss: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '-o' || a === '--output') {
      opts.output = args[++i];
      if (opts.output == null) throw new CliError('-o/--output needs a file argument');
    } else if (a === '--markdown') opts.markdown = true;
    else if (a === '--emd') opts.emd = true;
    else if (a === '--embed') opts.embed = true;
    else if (a === '--no-embed') opts.embed = false;
    else if (a === '--dsl-mode') {
      opts.dslMode = args[++i];
      const allowed = ['skip', 'live-link', 'live-inline', 'static'];
      if (!allowed.includes(opts.dslMode)) {
        throw new CliError(`--dsl-mode must be one of ${allowed.join(', ')} (got ${opts.dslMode ?? '(none)'})`);
      }
    } else if (a === '--quiet') opts.quiet = true;
    else if (a === '--package') opts.package = true;
    else if (a === '--toc') opts.toc = true;
    else if (a.startsWith('--toc=')) {
      const v = a.slice('--toc='.length);
      if (v !== 'auto' && v !== 'true' && v !== 'false') {
        throw new CliError(`--toc takes 'auto' (or use a bare --toc for always-on); got ${v}`);
      }
      opts.toc = v === 'auto' ? 'auto' : v === 'true';
    } else if (a === '--theme') {
      opts.theme = args[++i];
      if (opts.theme == null) throw new CliError('--theme needs a name (default, modern, compact)');
    } else if (a.startsWith('--theme=')) {
      opts.theme = a.slice('--theme='.length);
    } else if (a === '--chapter-nav') opts.chapterNav = true;
    else if (a === '--no-chapter-nav') opts.chapterNav = false;
    else if (a === '--fragment') opts.fragment = true;
    else if (a === '--css') {
      opts.css = args[++i];
      if (opts.css == null) throw new CliError('--css needs a stylesheet path or URL');
    } else if (a.startsWith('--css=')) opts.css = a.slice('--css='.length);
    else if (a === '--emit-css') opts.emitCss = true;
    else if (a === '--separate-pages') opts.pages = 'separate';
    else if (a === '--single-page') opts.pages = 'single';
    else if (a === '--live') opts.live = true;
    else if (a === '--single-file') opts.singleFile = true;
    else if (a === '--assets' || a.startsWith('--assets=')) {
      // The asset-delivery axis (#363; delivery-modes.md §"Asset delivery"): where the chrome + display
      // assets come from. Honored by --live and --single-file (the modes that admit it); see the build case.
      const v = a.startsWith('--assets=') ? a.slice('--assets='.length) : args[++i];
      const allowed = ['siblings', 'cdn', 'inlined'];
      if (!allowed.includes(v)) {
        throw new CliError(`--assets must be one of ${allowed.join(', ')} (got ${v ?? '(none)'})`);
      }
      opts.assetDelivery = v;
    }
    else if (a === '--edit') opts.edit = true;
    else if (a === '--title') { opts.title = args[++i]; if (opts.title == null) throw new CliError('--title needs a value'); }
    else if (a.startsWith('--title=')) opts.title = a.slice('--title='.length);
    else if (a === '--from' || a === '-f') {
      opts.from = args[++i];
      if (opts.from == null) throw new CliError('--from needs a format (e.g. latex, markdown, docx)');
    } else if (a.startsWith('--from=')) {
      opts.from = a.slice('--from='.length);
    } else if (a.startsWith('-')) throw new CliError(`unknown option: ${a}`);
    else if (opts.input == null) opts.input = a;
    else throw new CliError(`unexpected argument: ${a}`);
  }
  return opts;
}

/** Read the input file, turning fs errors into helpful messages. */
function readInput(input) {
  if (!input) throw new CliError('no input file given (expected an .emd file)');
  try {
    return readFileSync(input, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') throw new CliError(`input file not found: ${input}`);
    if (e.code === 'EISDIR') throw new CliError(`expected a file but got a directory: ${input}`);
    throw new CliError(`could not read ${input}: ${e.message}`);
  }
}

/** Run `fn` with console warnings silenced when `quiet` is set. */
function withQuiet(quiet, fn) {
  if (!quiet) return fn();
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.warn = origWarn;
  }
}

// The DSL render default for every command that emits a STANDALONE HTML document
// (render, import-jats, import). The library default is 'skip' — meant for
// embedding into a host page that wires its own DSL runtime — but a standalone
// document must render its Mermaid / ABC blocks itself, or they ship as
// un-rendered <pre> source (#172). Mirror the KaTeX-CSS / fonts posture:
// embed → self-contained inline, external → CDN link. An explicit --dsl-mode wins.
function standaloneDslMode(opts, embedResources) {
  return opts.dslMode ?? (embedResources ? 'live-inline' : 'live-link');
}

// #395 D2 / #414: the standalone wrap for every command that emits a document
// (render, import, import-jats) — one default, one option surface. The DEFAULT
// output is a complete, styled, standalone page: the rendered fragment wrapped in
// the minimal document shell (doctype/charset/viewport, a real <title>, default.css
// inlined). What a newcomer pipes to a file and opens must look finished, like
// `quarto render` / `pandoc -s`. The fragment keeps carrying its own font/KaTeX
// assets per --embed/--no-embed (the shell adds none).
//   --fragment        the bare-eHTML fragment (for embedding into a host page/pipeline)
//   --css <path-url>  REPLACES the inlined default stylesheet with a <link> (an author
//                     theming N documents wants one stylesheet, not N inlined copies;
//                     the default sheet is obtainable via `render --emit-css`)
//   --title <text>    overrides the derived title (deriveTitle: the document's own
//                     <title>; fallback: the input filename)
// default.css is ~40 KB — small enough to inline under both embed modes (--no-embed
// governs the ~260 KB font/KaTeX payload, not the stylesheet).
function wrapStandalone(html, opts, deriveTitle, messages = []) {
  if (opts.fragment) return html;
  const title = opts.title ?? (deriveTitle() || basename(opts.input, extname(opts.input)));
  const stylesheet = opts.css
    ? `<link rel="stylesheet" href="${escapeHtmlAttr(opts.css)}">`
    : `<style>\n${readDefaultCss()}\n</style>`;
  // #415 (channel 3): the run's diagnostics ride the artifact — a script block that
  // recapitulates them to the viewer's console. Zero messages ⇒ zero bytes. A
  // --fragment output carries none (the shell furniture belongs to the host page).
  return emitDocumentShell(html + diagnosticsScript(messages), { title, stylesheet });
}

// #414: the flag-contradiction checks shared by the three standalone commands.
// --fragment emits no <head> (nothing to link a stylesheet from); --emd emits
// Enscribe source, not HTML, so none of the shell flags apply — refuse rather
// than silently ignore authored intent.
function checkStandaloneFlags(opts) {
  if (opts.fragment && opts.css) {
    throw new CliError('--fragment emits the bare fragment (no <head>), so --css has nowhere to link; use one or the other');
  }
  if (opts.emd && (opts.fragment || opts.css || opts.title)) {
    throw new CliError('--emd emits Enscribe source (no HTML shell), so --fragment/--css/--title do not apply');
  }
}

function doRender(opts, diag) {
  const src = readInput(opts.input);
  // CLI default is self-contained (--embed); the library default is external.
  const pipeOpts = { embedResources: opts.embed ?? true, assetsDir: dirname(resolve(opts.input)) };
  // DSL runtime (mermaid / abc): the CLI produces standalone documents, so it must
  // render by default — otherwise a diagram block ships as un-rendered <pre> source
  // (the library default 'skip' is for embedding into a host that wires its own
  // runtime). Mirror the KaTeX-CSS / fonts posture (embed → self-contained inline;
  // external → CDN link). An explicit --dsl-mode overrides. Math needs no wiring:
  // it is pre-rendered to KaTeX HTML at build time and the CSS rides the same
  // embed/CDN switch (cssMode), so formulas already render.
  pipeOpts.dslMode = standaloneDslMode(opts, pipeOpts.embedResources);
  if (opts.toc !== undefined) pipeOpts.toc = opts.toc;
  if (opts.theme) pipeOpts.theme = opts.theme;
  if (opts.chapterNav !== undefined) pipeOpts.chapterNav = opts.chapterNav;

  // #395 D2 (audit W3): the DEFAULT output is a complete, styled, standalone document.
  // The wrap and its option surface are shared with import / import-jats (#414) —
  // see wrapStandalone below for the full rationale.
  const wrap = (html, messages) => wrapStandalone(html, opts, () => extractDocumentTitle(src), messages);

  // #133: external <library src> loading. Filesystem paths are read synchronously
  // inside the pipeline (assetsDir, unchanged). URL sources need an async fetch, so
  // when any are present this returns a Promise the dispatcher awaits; otherwise it
  // stays synchronous (so the 33 existing sync test call sites are unaffected).
  // #402: the vfile is seeded with the input path (filename provenance on every
  // message) and handed to the diagnostics seam after the run.
  const urlSrcs = collectLibrarySources(src).filter((s) => URL_SCHEME.test(s));
  const renderSync = (data) => {
    const file = withQuiet(opts.quiet, () =>
      renderArticleFile({ value: src, path: opts.input, ...(data ? { data } : {}) }, pipeOpts));
    diag?.report(file);
    return wrap(String(file), file.messages);
  };
  if (urlSrcs.length === 0) return renderSync();
  return preloadSources(urlSrcs, fetchSourceText).then((loaded) =>
    renderSync({ [ENSCRIBE_LOADED_SOURCES]: loaded }),
  );
}

// #133: a src string is a URL (async-only) when it carries a scheme.
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Fetch a library source URL's text; throws (→ a visible error) on a non-OK response. */
async function fetchSourceText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}`);
  return res.text();
}

function doLift(opts) {
  const src = readInput(opts.input);
  // lift runs only parse + recursive-content + the normalize-to-canonical gate
  // (the structural plugins are intentionally NOT run — see liftToCanonicalMdast),
  // then serializes the canonical tree back to source.
  return withQuiet(opts.quiet, () => serializeCanonical(liftToCanonicalMdast(src)));
}

function doLower(opts) {
  const src = readInput(opts.input);
  // Same lift tree; serialize toward a shorter register (shorthand by default,
  // markdown with --markdown).
  const target = opts.markdown ? 'markdown' : 'shorthand';
  return withQuiet(opts.quiet, () => serializeCanonical(liftToCanonicalMdast(src), { target }));
}

function doImportJats(opts, diag) {
  const xml = readInput(opts.input);
  return withQuiet(opts.quiet, () => {
    // #402/#412: the vfile exists BEFORE the importer runs, so import-time drops land
    // on it (a complete account, source lines included — not the old warn-once console
    // note), alongside the transform diagnostics from runSync.
    const file = new VFile({ path: opts.input });
    const tree = importJats(xml, {
      onDropped: (name, line) =>
        file.message(`jats-import: dropped ${name}`, line != null ? { line, column: 1 } : undefined, 'jats-import:dropped'),
    });
    if (opts.emd) { diag?.report(file); return serializeCanonical(tree); }
    // HTML: run the imported mdast tree through the interpreter transforms
    // (.runSync) and the HTML compiler (.stringify), self-contained by default.
    const embedResources = opts.embed ?? true;
    const proc = buildEnscribePipeline({ embedResources, dslMode: standaloneDslMode(opts, embedResources) });
    // #414: same standalone-by-default + --fragment/--css/--title surface as render
    // (#395 D2). The title comes from the imported tree's <title> (JATS
    // <article-title> post-conversion); fallback: the input filename. Derived
    // BEFORE runSync — the interpreter transforms mutate the tree in place and
    // consume the <meta><title> on the way to hast.
    const derivedTitle = extractTitleFromTree(tree);
    const html = proc.stringify(proc.runSync(tree, file), file);
    diag?.report(file);
    return wrapStandalone(html, opts, () => derivedTitle, file.messages);
  });
}

function doImport(opts, diag) {
  if (!opts.input) throw new CliError('no input file given (a .tex / .qmd / .docx / … to import)');
  if (!existsSync(opts.input)) throw new CliError(`input file not found: ${opts.input}`);
  let ast;
  try {
    ast = runPandoc(opts.input, detectFormat(opts.input, opts.from));
  } catch (e) {
    // pandoc-missing, unknown-format, or a pandoc run error → a clean CLI message.
    throw new CliError(e instanceof PandocMissingError ? e.message : `pandoc import failed: ${e.message}`);
  }
  // #402/#412: the vfile exists before bibliography resolution and conversion — an
  // explicitly named bibliography that cannot be read, and every unmapped pandoc node,
  // land on the stream (pandoc's AST carries no positions; the node kind is the
  // provenance the model allows).
  const file = new VFile({ path: opts.input });
  const bibtex = findBibtex(opts.input, ast.meta, (miss) => file.message(`pandoc-import: ${miss}`, undefined, 'pandoc-import:bibliography'));
  return withQuiet(opts.quiet, () => {
    const tree = convertPandoc(ast, {
      bibtex,
      onDropped: (name) => file.message(`pandoc-import: dropped ${name}`, undefined, 'pandoc-import:dropped'),
    });
    if (opts.emd) { diag?.report(file); return serializeCanonical(tree); }
    const embedResources = opts.embed ?? true;
    const proc = buildEnscribePipeline({ embedResources, dslMode: standaloneDslMode(opts, embedResources) });
    // #414: same standalone-by-default + --fragment/--css/--title surface as render
    // (#395 D2). The title comes from the imported tree's <title> (pandoc metadata
    // post-conversion); fallback: the input filename. Derived BEFORE runSync —
    // the interpreter transforms mutate the tree in place and consume the
    // <meta><title> on the way to hast.
    const derivedTitle = extractTitleFromTree(tree);
    const html = proc.stringify(proc.runSync(tree, file), file);
    diag?.report(file);
    return wrapStandalone(html, opts, () => derivedTitle, file.messages);
  });
}

let _defaultCss = null;
/** default.css (the structural stylesheet) inlined into each separate-pages shell. */
function readDefaultCss() {
  if (_defaultCss == null) _defaultCss = readFileSync(require.resolve('@enscribejs/enscribe/default.css'), 'utf8');
  return _defaultCss;
}

function doBuild(opts, diag) {
  // #190 — multi-file master document. Parse the master, load and parse each `src`
  // structure child (`<section src>` / `<chapter src>` / …; paths relative to the
  // master file), assemble into one flat tree, then run the existing render path
  // (which structures it as an article or book per the master's `<meta type>`).
  //
  // P1 (#205): a BOOK builds to SEPARATE per-chapter pages by default — one
  // standalone HTML page per chapter at per-chapter URLs (publishBookPages, reusing
  // L1's renderChapter + the harvested registry, and C's chrome). `--single-page`
  // forces the retained whole-book-in-one-file mode (also L1's reference render);
  // `--separate-pages` forces separate (book-only). Articles are always single-page.
  const source = readInput(opts.input);
  const masterDir = dirname(resolve(opts.input));
  const embedResources = opts.embed ?? true;
  return withQuiet(opts.quiet, () => {
    // Assemble + number once via the shared render path. An explicit VFile (here, the master's path)
    // keeps file.data.enscribeRegistry reachable for the separate-pages publisher's registry harvest.
    // #402: assembler diagnostics join the document's message stream (the warn sink defaults to
    // file.message inside assembleAndNumber) instead of a bare console.warn — they reach all
    // three channels with the master's filename as provenance.
    const { numbered, file, proc } = assembleAndNumber({
      source,
      sourcePath: opts.input ?? 'input.emd',
      masterDir,
      pipeOpts: { embedResources, assetsDir: masterDir, dslMode: standaloneDslMode(opts, embedResources) },
    });
    const isBook = file.data?.enscribeDocType === 'book';
    // #246/#278 — a website master builds to a DIR-PER-PAGE static site: walk the nav and render
    // each page independently (an article via processSync; a book-page via publishBookPages, nested
    // under its dir). The assemble + runSync above only served doc-type detection here; the website
    // emitter re-parses the master and reads each page from its own source. (Pre-#278 this was a
    // silent no-op — a website fell through to the single-page path and stringified an empty wrapper.)
    const isWebsite = file.data?.enscribeDocType === 'website';
    if (isWebsite) {
      // #402: the website builder reports each page's diagnostics through the seam as it
      // renders (channel 1 per page) and injects each page's own recap script (channel 3);
      // its warnings[] account (assembler/nav-level, site-scoped) keeps its console print.
      const { pages, assets, warnings } = buildStaticWebsite({
        masterSource: source,
        masterDir,
        defaultCss: readDefaultCss(),
        diagnostics: diag,
      });
      for (const w of warnings) console.warn(`enscribe build (website): ${w}`);
      return { mode: 'website', pages, assets };
    }
    diag?.report(file);
    // #415 (channel 3): the document's diagnostics ride every emitted page — a
    // separate-pages book is one document split across pages, and any page is an entry
    // point, so each carries the full stream. Zero messages ⇒ zero bytes.
    const script = diagnosticsScript(file.messages);
    const separate = opts.pages === 'separate' || (opts.pages !== 'single' && isBook);
    if (separate) {
      if (!isBook) {
        throw new CliError('--separate-pages is a book-only build; this document is not a <meta type=book>');
      }
      const pages = publishBookPages({ numbered, file, proc, defaultCss: readDefaultCss() });
      if (script) for (const [name, html] of pages) pages.set(name, html + script);
      return { mode: 'separate', pages };
    }
    // Single-page (the retained whole-book / article mode) — the unchanged render path.
    // An assembled-source (--emd) emit is deferred (#190): section titles live in
    // `.content`, which serializeCanonical does not round-trip.
    return { mode: 'single', html: String(proc.stringify(numbered, file)) + script };
  });
}

// Build the post-pipeline mdast tree for JATS export, shared by lone-file + package modes.
// export-jats needs the post-pipeline tree (not HTML): .runSync() runs the transformers; the
// HTML compiler (.processSync) is skipped. The shared buildEnscribePipeline assembly is the same
// one the export test mirrors. Returns the tree + the input dir (external asset srcs resolve
// against it, exactly as the pipeline's assetsDir does).
function exportJatsTree(opts) {
  const src = readInput(opts.input);
  const inputDir = dirname(resolve(opts.input));
  const proc = buildEnscribePipeline({ assetsDir: inputDir });
  const tree = proc.parse(src);
  // #246: a website is HTML-only ("no JATS/BITS — a site isn't a scholarly document"). Refuse the
  // export (the shared classifier over the parsed master — no VFile/assembler needed) rather than
  // let it fall through and mis-emit an empty article JATS. Classify BEFORE runSync mutates the tree.
  if (classifyDocType(tree).type === 'website') {
    throw new CliError('export-jats: websites have no JATS/BITS projection (HTML render only)');
  }
  return { tree: proc.runSync(tree), inputDir };
}

// A fresh asset collector for enscribeToJats's opts.assetPackage (#313). rewrite:true rewrites
// each external figure href to assets/<name> (the package deliverable); rewrite:false leaves
// hrefs as-authored but still records the external refs (so lone-file export can warn they dangle).
function makeAssetPackage(rewrite) {
  return { byName: new Map(), bySrc: new Map(), rewrite };
}

function doExportJats(opts) {
  return withQuiet(opts.quiet, () => {
    const { tree } = exportJatsTree(opts);
    // Collect (do NOT rewrite) external refs so we can warn: in lone-file mode a
    // <graphic xlink:href="path"/> is a dangling reference — the bytes are not carried.
    const pkg = makeAssetPackage(false);
    const xml = enscribeToJats(tree, { assetPackage: pkg });
    if (pkg.byName.size > 0) {
      const list = [...pkg.byName.values()].join(', ');
      console.warn(`enscribe export-jats: ${pkg.byName.size} external asset reference(s) will dangle in lone-file output (${list}). Use --package -o <dir> to copy them into an assets/ package.`);
    }
    return xml;
  });
}

// #313 (JATS asset packaging): emit a self-contained JATS deliverable — <outdir>/<stem>.xml plus
// <outdir>/assets/ holding every external file-backed asset the document references, each figure's
// xlink:href rewritten to assets/<name>. Mirrors buildLiveFolder's mkdirSync + copyFileSync shape.
// Inline cases (inline SVG base64, DSL <preformat>, embedded base64 <data> assets) have no external
// file and are emitted unchanged. Returns a summary for the CLI to report.
function doExportJatsPackage(opts) {
  if (!opts.output) {
    throw new CliError('export-jats --package needs an output directory (-o <dir>)');
  }
  return withQuiet(opts.quiet, () => {
    const { tree, inputDir } = exportJatsTree(opts);
    const outDir = resolve(opts.output);
    const pkg = makeAssetPackage(true);
    const xml = enscribeToJats(tree, { assetPackage: pkg });

    mkdirSync(outDir, { recursive: true });
    // <stem>.xml from the input basename: strip any trailing dots, then the final extension
    // (so "doc.emd" → "doc", "doc.emd." → "doc", a stem-less name → the 'article' fallback).
    const stem = basename(opts.input).replace(/\.+$/, '').replace(/\.[^./\\]+$/, '');
    const xmlName = (stem || 'article') + '.xml';
    writeFileSync(join(outDir, xmlName), xml.endsWith('\n') ? xml : xml + '\n', 'utf8');

    let copied = 0;
    const missing = [];
    if (pkg.byName.size > 0) {
      const assetsDir = join(outDir, 'assets');
      mkdirSync(assetsDir, { recursive: true });
      // pkg.byName is name → the (input-relative) src; resolve against the input dir and copy.
      for (const [name, src] of pkg.byName) {
        try {
          copyFileSync(resolve(inputDir, src), join(assetsDir, name));
          copied++;
        } catch (e) {
          missing.push(src);
          console.warn(`enscribe export-jats: could not copy asset "${src}" (${e.code ?? e.message}) — <graphic xlink:href="assets/${name}"> will dangle`);
        }
      }
    }
    return { outDir, xmlName, referenced: pkg.byName.size, copied, missing };
  });
}

/** Write a command's result to `-o` file or to stdout (with a trailing newline). */
function emit(result, opts, out) {
  if (opts.output) {
    writeFileSync(opts.output, result, 'utf8');
  } else {
    out.write(result.endsWith('\n') ? result : result + '\n');
  }
}

/**
 * The CLI entry point. Returns a process exit code (0 success, 1 error). Writes
 * results to `io.stdout` and diagnostics to `io.stderr` — injectable so tests can
 * drive it without spawning a process.
 *
 * @param {string[]} argv  arguments after the node executable + script (process.argv.slice(2))
 * @param {{ stdout?: NodeJS.WritableStream, stderr?: NodeJS.WritableStream }} [io]
 * @returns {number} exit code
 */
export function run(argv, io = {}) {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;

  const [command, ...rest] = argv;

  // Top-level help / version (also when invoked with no arguments).
  if (command == null || command === '-h' || command === '--help' || command === 'help') {
    out.write(TOP_HELP);
    return 0;
  }
  if (command === '-v' || command === '--version' || command === 'version') {
    out.write(`${PKG.version}\n`);
    return 0;
  }

  try {
    switch (command) {
      case 'render': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(RENDER_HELP); return 0; }
        // --emit-css: print the default stylesheet and exit (audit W3 — the sheet the help
        // references must be obtainable). Needs no input document.
        if (opts.emitCss) { emit(readDefaultCss(), opts, out); return 0; }
        checkStandaloneFlags(opts);
        const diag = createDiagnostics({ quiet: opts.quiet, err });
        const rendered = doRender(opts, diag);
        // #133: doRender returns a Promise only when URL <library src> sources need
        // fetching; otherwise it is the rendered string (the sync path, unchanged).
        if (rendered && typeof rendered.then === 'function') {
          return rendered.then((html) => { emit(html, opts, out); diag.summary(); return 0; });
        }
        emit(rendered, opts, out);
        diag.summary();
        return 0;
      }
      case 'build': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(BUILD_HELP); return 0; }
        // #363: --assets selects the chrome asset-delivery mode (siblings | cdn | inlined). It is honored
        // only by --live and --single-file (the modes that admit it, delivery-modes.md §"Asset delivery").
        // A plain static build references sibling assets by construction, so the flag is rejected there.
        if (opts.assetDelivery && !opts.live && !opts.singleFile) {
          throw new CliError('--assets applies to --live or --single-file (a static build references sibling assets)');
        }
        if (opts.assetDelivery === 'siblings' && opts.singleFile) {
          throw new CliError('--single-file --assets siblings is invalid (a single file has no siblings); use cdn or inlined');
        }
        // --single-file (delivery-modes.md §Single-file): emit ONE self-contained .html that EMBEDS the
        // document's source (read at mount, no fetch of the document) and references chrome/display
        // assets from the web. One file — no sibling assets, no sources folder. Editable iff the
        // document is self-contained (no `<… src>` children); a non-self-contained master is emitted
        // read-only with a warning. Written to -o <file> or stdout, like the ordinary single build.
        if (opts.singleFile) {
          const res = withQuiet(opts.quiet, () =>
            buildSingleFile({ master: opts.input, title: opts.title, edit: opts.edit, delivery: opts.assetDelivery }));
          emit(res.html, opts, out);
          if (!opts.quiet && opts.output) {
            const offline = res.delivery === 'inlined' ? ', inlined → offline (no network)' : ' (assets from the web)';
            out.write(`Wrote a single-file document to ${opts.output} (${res.editable ? 'self-contained → editable' : 'render-only — not self-contained'}${offline})\n`);
          }
          return 0;
        }
        // --live (#215): generate a self-standing LIVE FOLDER (the engine renders the document client-
        // side; ?edit mounts the live edit loop). Copies the master + children + shell assets +
        // engine bundle into -o <dir> and writes the emitted shell. Works for a book OR an article
        // master (#216) — the emitted shell mounts via mountLiveShell, which dispatches by <meta type>.
        if (opts.live) {
          if (!opts.output) {
            throw new CliError('--live writes a live folder — give an output directory with -o <dir>');
          }
          const res = buildLiveFolder({ master: opts.input, outDir: opts.output, title: opts.title, edit: opts.edit, delivery: opts.assetDelivery });
          if (!opts.quiet) {
            const how = res.delivery === 'inlined' ? 'index.html inlines the chrome — no network'
              : res.delivery === 'cdn' ? `index.html + ${res.assets.length} assets from the CDN`
              : `index.html + ${res.assets.length} sibling assets`;
            out.write(`Wrote a live folder to ${opts.output}/ (${res.master} + ${res.children.length} children + ${how}) [${res.delivery}]\n`);
          }
          return 0;
        }
        const diag = createDiagnostics({ quiet: opts.quiet, err });
        const result = doBuild(opts, diag);
        if (result.mode === 'single') {
          emit(result.html, opts, out);
          diag.summary();
          return 0;
        }
        // Website (#278): a dir-per-page static site — many files, so -o is required. Each page's
        // output path nests (a page → <slug>/index.html, a book-page's chapters deeper), so mkdir
        // each parent. Engine assets land at the dist root; co-located page assets travel with the
        // page; a central author assets/ (if present) copies once to the root.
        if (result.mode === 'website') {
          if (!opts.output) {
            throw new CliError('a website build writes many pages — give an output directory with -o <dir>');
          }
          for (const [rel, html] of result.pages) {
            const dest = join(opts.output, rel);
            mkdirSync(dirname(dest), { recursive: true });
            writeFileSync(dest, html, 'utf8');
          }
          // Engine assets need the built dist/ bundle (absent in a dev source tree). The static
          // pages inline their own CSS, so a missing bundle is non-fatal — warn and carry on.
          try { copyShellAssets(opts.output); }
          catch (e) { console.warn(`enscribe build (website): engine assets not copied (${e.message}); pages inline their own CSS`); }
          for (const a of result.assets) {
            const dest = join(opts.output, a.to);
            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(a.from, dest);
          }
          const authorAssets = join(dirname(resolve(opts.input)), 'assets');
          if (existsSync(authorAssets)) cpSync(authorAssets, join(opts.output, 'assets'), { recursive: true });
          if (!opts.quiet) {
            out.write(`Wrote ${result.pages.size} website pages to ${opts.output}/ (home at root; ${result.assets.length} page assets)\n`);
          }
          diag.summary();
          return 0;
        }
        // Separate-pages: write one standalone HTML file per chapter + index.html to
        // the output DIRECTORY (-o is a dir in this mode; N pages can't go to stdout).
        if (!opts.output) {
          throw new CliError('a separate-pages book build writes multiple files — give an output directory with -o <dir>');
        }
        mkdirSync(opts.output, { recursive: true });
        for (const [name, html] of result.pages) {
          writeFileSync(join(opts.output, name), html, 'utf8');
        }
        if (!opts.quiet) out.write(`Wrote ${result.pages.size} pages to ${opts.output}/ (chapter pages + index.html)\n`);
        diag.summary();
        return 0;
      }
      case 'export-jats': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(EXPORT_JATS_HELP); return 0; }
        if (opts.package) {
          const r = doExportJatsPackage(opts);
          if (!opts.quiet) {
            out.write(`Wrote ${join(r.outDir, r.xmlName)}${r.referenced ? ` + ${r.copied}/${r.referenced} asset(s) copied to assets/${r.missing.length ? ` (${r.missing.length} missing)` : ''}` : ' (no external assets)'}\n`);
          }
          return 0;
        }
        emit(doExportJats(opts), opts, out);
        return 0;
      }
      case 'lift': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(LIFT_HELP); return 0; }
        emit(doLift(opts), opts, out);
        return 0;
      }
      case 'lower': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(LOWER_HELP); return 0; }
        emit(doLower(opts), opts, out);
        return 0;
      }
      case 'import-jats': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(IMPORT_JATS_HELP); return 0; }
        checkStandaloneFlags(opts);
        const diag = createDiagnostics({ quiet: opts.quiet, err });
        emit(doImportJats(opts, diag), opts, out);
        diag.summary();
        return 0;
      }
      case 'import': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(IMPORT_HELP); return 0; }
        checkStandaloneFlags(opts);
        const diag = createDiagnostics({ quiet: opts.quiet, err });
        emit(doImport(opts, diag), opts, out);
        diag.summary();
        return 0;
      }
      default:
        err.write(`enscribe: unknown command '${command}'\n\n${TOP_HELP}`);
        return 1;
    }
  } catch (e) {
    if (e instanceof CliError) {
      err.write(`enscribe: ${e.message}\n`);
    } else {
      // Unexpected — surface the message (and stack, which aids bug reports).
      err.write(`enscribe: ${e?.message ?? e}\n${e?.stack ?? ''}\n`);
    }
    return 1;
  }
}
