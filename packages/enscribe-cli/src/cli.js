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
// The CLI lives in its own package (`@enscribejs/cli`) rather than inside
// `@enscribejs/interpreter`, because the `export-jats` command imports
// `@enscribejs/jats-export`, which itself depends on the interpreter — putting
// the CLI in the interpreter would create a dependency cycle.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { buildEnscribePipeline, liftToCanonicalMdast } from '@enscribejs/interpreter';
import { enscribeToJats } from '@enscribejs/jats-export';
import { serializeCanonical } from './serialize-canonical.js';

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
  export-jats <input.emd>  Export an Enscribe document to JATS 1.3 XML
  lift <input.emd>         Rewrite mixed markdown/sigil source to canonical form

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

const RENDER_HELP = `enscribe render — render an Enscribe document to HTML

Usage:
  enscribe render <input.emd> [options]

Options:
  -o, --output <file>  Write HTML to <file> (default: stdout)
  --embed              Self-contained HTML, assets inlined (default)
  --no-embed           Link assets externally (fonts / KaTeX CSS from CDNs)
  --dsl-mode <mode>    DSL rendering mode: skip (default), live-link,
                       live-inline, static
  --quiet              Suppress warnings
  -h, --help           Show this help
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
    embed: undefined, dslMode: undefined, quiet: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '-o' || a === '--output') {
      opts.output = args[++i];
      if (opts.output == null) throw new CliError('-o/--output needs a file argument');
    } else if (a === '--embed') opts.embed = true;
    else if (a === '--no-embed') opts.embed = false;
    else if (a === '--dsl-mode') {
      opts.dslMode = args[++i];
      const allowed = ['skip', 'live-link', 'live-inline', 'static'];
      if (!allowed.includes(opts.dslMode)) {
        throw new CliError(`--dsl-mode must be one of ${allowed.join(', ')} (got ${opts.dslMode ?? '(none)'})`);
      }
    } else if (a === '--quiet') opts.quiet = true;
    else if (a.startsWith('-')) throw new CliError(`unknown option: ${a}`);
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

function doRender(opts) {
  const src = readInput(opts.input);
  // CLI default is self-contained (--embed); the library default is external.
  const pipeOpts = { embedResources: opts.embed ?? true, assetsDir: dirname(resolve(opts.input)) };
  if (opts.dslMode) pipeOpts.dslMode = opts.dslMode;
  return withQuiet(opts.quiet, () =>
    String(buildEnscribePipeline(pipeOpts).processSync(src)),
  );
}

function doLift(opts) {
  const src = readInput(opts.input);
  // lift runs only parse + recursive-content + the normalize-to-canonical gate
  // (the structural plugins are intentionally NOT run — see liftToCanonicalMdast),
  // then serializes the canonical tree back to source.
  return withQuiet(opts.quiet, () => serializeCanonical(liftToCanonicalMdast(src)));
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
        emit(doRender(opts), opts, out);
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
