// #193 — standing live/static render-parity test.
//
// The render-parity invariant (notes/specs/render-parity.md): on MATCHED options,
// the LIVE render (the browser entry — render() / renderMasterAsync(), driven here
// under a stubbed document.baseURI + fetch, the source-agnostic fetch path) is
// byte-identical to the STATIC render (the Node path — buildEnscribePipeline +
// assembleMasterDocument over the filesystem). Same source, same options, fs-vs-
// fetch I/O, identical output.
//
// The engine is already one (browser.js is a thin wrapper over buildEnscribePipeline,
// and renderMasterAsync runs the same assembleMasterDocument the CLI build uses), so
// this suite is EXPECTED GREEN ON LANDING — a standing regression guard, not a bug
// hunt. A divergence here is a real parity gap to investigate, not to paper over.
//
// Headline coverage: the two multi-file MASTERS (master/, master-xref/), where the
// live (fetch-assemble) and static (fs-assemble) paths are genuinely different I/O.
// Single-file fixtures are near-trivially identical (the same processSync both ways)
// but give cheap standing per-fixture coverage. The EXCLUDED map names every fixture
// the test cannot cover yet, with the reason and the unblocking issue — no silent
// skips, and a guard fails if an entry stops naming a real fixture.

import assert from 'node:assert';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, relative } from 'node:path';
import { render, renderAsync, renderMasterAsync } from '../src/interpreter/browser.js';
import { buildEnscribePipeline, assembleMasterDocument, isMasterSrcEntry, HAS_MASTER_SRC } from '../src/interpreter/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

// Mirror the browser entry's resolved defaults (BROWSER_DEFAULTS in browser.js) so
// the STATIC (Node) side renders on the same options render()/renderMasterAsync()
// resolve to — render-parity is byte-identity on MATCHED options. Kept in sync with
// browser.js (a drift makes this suite fail loudly, which is exactly its job).
const BROWSER_DEFAULTS = { embedResources: false, hoverPreviewMode: 'link', dslMode: 'live-link' };

// Fixtures the parity test cannot cover yet — each with a reason and the unblocking
// issue. The LIVE render of these needs environment-gated external I/O the browser
// cannot do yet, or a static-only packaging deliberately scoped out of byte-parity.
// This list shrinks as the issues land; it is explicit so no exclusion is silent.
const EXCLUDED = {
  'document-47-abc-static': {
    reason:
      "abc 'static' mode bakes inline SVG via jsdom — a build-time, static-only packaging " +
      'scoped OUT of byte-parity (render-parity.md, DSL delivery); the browser default is live-link',
    issue: 'render-parity.md',
  },
};

// Per-fixture options applied to BOTH sides, so a golden that uses a non-default
// option is still a real (matched-option) parity check rather than rendered with
// the wrong options. Most fixtures need nothing here.
const FIXTURE_OPTIONS = {
  'document-54-toc-scrollspy': { toc: true },
  'master-book': { toc: true },
};

const isMaster = (src) => HAS_MASTER_SRC.test(src);

// A single-file fixture with an external `src` — a <library src> bibliography (#196) or a
// <table src> / <csv src> / <tsv src> data file (#195): its LIVE render is the async path
// (renderAsync fetches the source against document.baseURI), its STATIC render reads the
// same file via assetsDir — the source-agnostic check (fs ≡ fetch resolve to the same bytes).
const HAS_EXTERNAL_SRC = /<(library|table|csv|tsv)\b[^>]*\bsrc\s*=/i;
const ASSETS_DIR = join(FIXTURES_DIR, 'assets');

// Recursive .emd walk, skipping the archive/ dir (mirrors render-fixtures.js).
function findEmd(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (f === 'archive') continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...findEmd(p));
    else if (f.endsWith('.emd') || f.endsWith('.enscribe')) out.push(p);
  }
  return out;
}

// The child source paths consumed by master assembly — not standalone fixtures.
function collectConsumedChildren(emdPaths) {
  const consumed = new Set();
  const proc = buildEnscribePipeline({});
  for (const p of emdPaths) {
    const src = readFileSync(p, 'utf8');
    if (!isMaster(src)) continue;
    for (const node of proc.parse(src).children ?? []) {
      if (isMasterSrcEntry(node)) {
        consumed.add(join(dirname(p), node.kwargs.src));
      }
    }
  }
  return consumed;
}

function firstDiffIndex(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

// Byte-identity assert with a debuggable failure: the first differing region.
function assertParity(staticHtml, liveHtml, label) {
  if (staticHtml === liveHtml) return;
  const i = firstDiffIndex(staticHtml, liveHtml);
  const ctx = 80;
  const around = (s) => JSON.stringify(s.slice(Math.max(0, i - ctx), i + ctx));
  assert.fail(
    `render-parity divergence in ${label} at offset ${i} ` +
      `(static ${staticHtml.length} bytes, live ${liveHtml.length} bytes):\n` +
      `  static: …${around(staticHtml)}…\n` +
      `  live:   …${around(liveHtml)}…`,
  );
}

// STATIC master render: fs-assemble through the same pipeline the browser uses.
// `opts` are the per-fixture options (e.g. { toc: true } for a book master) applied
// to BOTH sides, so a chrome-bearing master is a real matched-option parity check.
function staticMaster(masterPath, opts = {}) {
  const src = readFileSync(masterPath, 'utf8');
  const masterDir = dirname(masterPath);
  // assetsDir lets a master's own <library src> resolve via fs (the static side);
  // harmless for masters without one. The live side fetches it (renderMasterAsync).
  const proc = buildEnscribePipeline({ ...BROWSER_DEFAULTS, ...opts, assetsDir: ASSETS_DIR });
  const tree = assembleMasterDocument({
    source: src,
    parse: (s) => proc.parse(s),
    resolve: (rel) => join(masterDir, rel),
    readFile: (p) => readFileSync(p, 'utf8'),
  });
  return String(proc.stringify(proc.runSync(tree)));
}

// Install a document.baseURI + fetch stub serving files off disk from the given dirs
// (searched in order) — the live fetch path. Used for master `src` structure children
// (the master's dir) and for `<library src>` bibliographies (the assets dir). Returns a
// restore fn. Mirrors master-document-browser.test.js.
function installFetchStub(...dirs) {
  const orig = { document: global.document, fetch: global.fetch };
  global.document = { baseURI: 'https://example.com/parity/' };
  global.fetch = async (url) => {
    const name = String(url).split('/').pop();
    for (const d of dirs) {
      const p = join(d, name);
      if (existsSync(p)) {
        return { ok: true, status: 200, statusText: 'OK', text: async () => readFileSync(p, 'utf8') };
      }
    }
    return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
  };
  return () => {
    global.document = orig.document;
    global.fetch = orig.fetch;
  };
}

export async function run() {
  const all = findEmd(FIXTURES_DIR).sort();
  const consumed = collectConsumedChildren(all);
  const masters = all.filter((p) => isMaster(readFileSync(p, 'utf8')));
  const singles = all.filter((p) => !consumed.has(p) && !masters.includes(p));

  // ── Masters: live (fetch-assemble) ≡ static (fs-assemble), matched options ──
  // Per-fixture options (FIXTURE_OPTIONS, keyed by basename) are applied to BOTH
  // sides — e.g. the book master renders with { toc: true } so its three-column
  // reading-interface chrome (Slice C) is parity-checked static≡live, not skipped.
  for (const masterPath of masters) {
    const src = readFileSync(masterPath, 'utf8');
    const opts = FIXTURE_OPTIONS[basename(masterPath, '.emd')] ?? {};
    const staticHtml = staticMaster(masterPath, opts);
    const restore = installFetchStub(dirname(masterPath), ASSETS_DIR);
    let liveHtml;
    try {
      liveHtml = await renderMasterAsync(src, opts); // merges over BROWSER_DEFAULTS internally
    } finally {
      restore();
    }
    assertParity(staticHtml, liveHtml, `master ${relative(FIXTURES_DIR, masterPath)}`);
  }
  console.log(
    `PASS: render-parity (masters) — ${masters.length} multi-file master(s): ` +
      'live fetch-assemble ≡ static fs-assemble, byte-identical',
  );

  // ── Single-file: live render() ≡ static buildEnscribePipeline().processSync() ──
  let checked = 0;
  const excludedHit = [];
  for (const p of singles) {
    const name = basename(p, '.emd');
    if (EXCLUDED[name]) {
      excludedHit.push(name);
      continue;
    }
    const src = readFileSync(p, 'utf8');
    const opts = FIXTURE_OPTIONS[name] ?? {};
    let liveHtml;
    let staticHtml;
    if (HAS_EXTERNAL_SRC.test(src)) {
      // External <library src> (#196) or <table src> (#195): static reads the file via
      // assetsDir; live fetches it through renderAsync. Both must resolve the same bytes.
      staticHtml = String(
        buildEnscribePipeline({ ...BROWSER_DEFAULTS, ...opts, assetsDir: ASSETS_DIR }).processSync(src),
      );
      const restore = installFetchStub(ASSETS_DIR);
      try {
        liveHtml = await renderAsync(src, opts);
      } finally {
        restore();
      }
    } else {
      liveHtml = render(src, opts);
      staticHtml = String(buildEnscribePipeline({ ...BROWSER_DEFAULTS, ...opts }).processSync(src));
    }
    assertParity(staticHtml, liveHtml, `single-file ${name}`);
    checked++;
  }
  console.log(
    `PASS: render-parity (single-file) — ${checked} fixture(s) byte-identical on matched options`,
  );

  // Make the exclusions visible — no silent skips.
  for (const name of excludedHit.sort()) {
    const { reason, issue } = EXCLUDED[name];
    console.log(`  excluded ${name} (${issue}): ${reason}`);
  }

  // Guard the EXCLUDED map against rot: every entry must name a current fixture, so
  // the list shrinks honestly as #195 / #196 land rather than lingering as dead keys.
  for (const name of Object.keys(EXCLUDED)) {
    assert.ok(
      singles.some((p) => basename(p, '.emd') === name),
      `EXCLUDED names "${name}", which is not a current single-file fixture — prune it`,
    );
  }
}
