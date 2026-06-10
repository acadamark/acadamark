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

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { buildEnscribePipeline, liftToCanonicalMdast, collectLibrarySources, preloadSources, ENSCRIBE_LOADED_SOURCES } from '@enscribejs/enscribe';
import { enscribeToJats } from './jats-export/index.js';
import { importJats } from './jats-import/index.js';
import { serializeCanonical } from './serialize-canonical.js';
import { detectFormat, runPandoc, findBibtex, convertPandoc, PandocMissingError } from './pandoc-import.js';
import { assembleMasterDocument } from './master-document/assemble.js';

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
is self-contained HTML; with --emd it is canonical Enscribe source instead.

Usage:
  enscribe import-jats <input.xml> [options]

Options:
  --emd                Output canonical .emd source instead of HTML
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

Shells out to pandoc to read the input, then converts it to Enscribe: rendered
HTML by default, or canonical .emd source with --emd. Requires pandoc on PATH
(https://pandoc.org/installing.html).

Usage:
  enscribe import <input> [options]

Options:
  --from <format>      Override format detection (latex, markdown, docx, rst, …)
  --emd                Output canonical .emd source instead of HTML
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

const RENDER_HELP = `enscribe render — render an Enscribe document to HTML

Usage:
  enscribe render <input.emd> [options]

Options:
  -o, --output <file>  Write HTML to <file> (default: stdout)
  --embed              Self-contained HTML, assets inlined (default)
  --no-embed           Link assets externally (fonts / KaTeX CSS from CDNs)
  --dsl-mode <mode>    DSL rendering mode: skip (default), live-link,
                       live-inline, static
  --toc                Add a table-of-contents sidebar (--toc=auto to show it
                       only past three sections). Needs default.css to display.
  --theme <name>       Apply a theme: default, modern, or compact. Injects the
                       theme's token overrides inline (needs default.css too).
  --chapter-nav        For books with --toc, read one chapter at a time (default
                       on); --no-chapter-nav renders the whole book as one page.
  --quiet              Suppress warnings
  -h, --help           Show this help
`;

const BUILD_HELP = `enscribe build — assemble a multi-file master document, then render it

A master document names its child files with <section src="child.emd"> entries;
build loads each child (paths relative to the master), stitches them into one
article in document order, and renders that combined article to HTML — the same
output 'render' would produce for an equivalent single file.

Usage:
  enscribe build <master.emd> [options]

Options:
  -o, --output <file>  Write HTML to <file> (default: stdout)
  --embed              Self-contained HTML, assets inlined (default)
  --no-embed           Link assets externally (fonts / KaTeX CSS from CDNs)
  --dsl-mode <mode>    DSL rendering mode: skip, live-link, live-inline, static
  --quiet              Suppress warnings
  -h, --help           Show this help

Note:
  First slice (#190) — assembles <section src> children and inline sections into
  one article. Cross-file citations/numbering/cross-references, placement markers
  (toc / endnotes / bibliography), and non-article types are deferred.
`;

const EXPORT_JATS_HELP = `enscribe export-jats — export an Enscribe document to JATS 1.3 XML

Usage:
  enscribe export-jats <input.emd> [options]

Options:
  -o, --output <file>  Write XML to <file> (default: stdout)
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

function doRender(opts) {
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

  // #133: external <library src> loading. Filesystem paths are read synchronously
  // inside the pipeline (assetsDir, unchanged). URL sources need an async fetch, so
  // when any are present this returns a Promise the dispatcher awaits; otherwise it
  // stays synchronous (so the 33 existing sync test call sites are unaffected).
  const urlSrcs = collectLibrarySources(src).filter((s) => URL_SCHEME.test(s));
  const renderSync = (input) =>
    withQuiet(opts.quiet, () => String(buildEnscribePipeline(pipeOpts).processSync(input)));
  if (urlSrcs.length === 0) return renderSync(src);
  return preloadSources(urlSrcs, fetchSourceText).then((loaded) =>
    renderSync({ value: src, data: { [ENSCRIBE_LOADED_SOURCES]: loaded } }),
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

function doImportJats(opts) {
  const xml = readInput(opts.input);
  return withQuiet(opts.quiet, () => {
    const tree = importJats(xml);
    if (opts.emd) return serializeCanonical(tree);
    // HTML: run the imported mdast tree through the interpreter transforms
    // (.runSync) and the HTML compiler (.stringify), self-contained by default.
    const embedResources = opts.embed ?? true;
    const proc = buildEnscribePipeline({ embedResources, dslMode: standaloneDslMode(opts, embedResources) });
    return proc.stringify(proc.runSync(tree));
  });
}

function doImport(opts) {
  if (!opts.input) throw new CliError('no input file given (a .tex / .qmd / .docx / … to import)');
  if (!existsSync(opts.input)) throw new CliError(`input file not found: ${opts.input}`);
  let ast;
  try {
    ast = runPandoc(opts.input, detectFormat(opts.input, opts.from));
  } catch (e) {
    // pandoc-missing, unknown-format, or a pandoc run error → a clean CLI message.
    throw new CliError(e instanceof PandocMissingError ? e.message : `pandoc import failed: ${e.message}`);
  }
  const bibtex = findBibtex(opts.input, ast.meta);
  return withQuiet(opts.quiet, () => {
    const tree = convertPandoc(ast, { bibtex });
    if (opts.emd) return serializeCanonical(tree);
    const embedResources = opts.embed ?? true;
    const proc = buildEnscribePipeline({ embedResources, dslMode: standaloneDslMode(opts, embedResources) });
    return proc.stringify(proc.runSync(tree));
  });
}

function doBuild(opts) {
  // #190 — multi-file master document, walking skeleton. Parse the master, load
  // and parse each <section src> child (paths relative to the master file),
  // assemble into one flat article tree, then run the existing render path.
  const source = readInput(opts.input);
  const masterDir = dirname(resolve(opts.input));
  const embedResources = opts.embed ?? true;
  const proc = buildEnscribePipeline({
    embedResources,
    assetsDir: masterDir,
    dslMode: standaloneDslMode(opts, embedResources),
  });
  return withQuiet(opts.quiet, () => {
    const tree = assembleMasterDocument({
      source,
      readFile: (p) => readFileSync(p, 'utf8'),
      resolve: (rel) => join(masterDir, rel),
      parse: (s) => proc.parse(s),
      warn: (m) => console.warn(m),
    });
    // HTML only this slice. An assembled-source (--emd) emit is deferred: the
    // assembled tree carries section titles in `.content` (what the render path
    // reads), which serializeCanonical does not round-trip — it would emit empty
    // `<section | >` markers. Not worth a serializer change for the skeleton (#190).
    return proc.stringify(proc.runSync(tree));
  });
}

function doExportJats(opts) {
  const src = readInput(opts.input);
  // export-jats needs the post-pipeline mdast tree (not HTML): .runSync() runs
  // the transformers; the HTML compiler (.processSync) is skipped. The shared
  // buildEnscribePipeline assembly is the same one the export test mirrors.
  return withQuiet(opts.quiet, () => {
    const proc = buildEnscribePipeline({ assetsDir: dirname(resolve(opts.input)) });
    const tree = proc.runSync(proc.parse(src));
    return enscribeToJats(tree);
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
        const rendered = doRender(opts);
        // #133: doRender returns a Promise only when URL <library src> sources need
        // fetching; otherwise it is the rendered string (the sync path, unchanged).
        if (rendered && typeof rendered.then === 'function') {
          return rendered.then((html) => { emit(html, opts, out); return 0; });
        }
        emit(rendered, opts, out);
        return 0;
      }
      case 'build': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(BUILD_HELP); return 0; }
        emit(doBuild(opts), opts, out);
        return 0;
      }
      case 'export-jats': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(EXPORT_JATS_HELP); return 0; }
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
        emit(doImportJats(opts), opts, out);
        return 0;
      }
      case 'import': {
        const opts = parseCommandArgs(rest);
        if (opts.help) { out.write(IMPORT_HELP); return 0; }
        emit(doImport(opts), opts, out);
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
