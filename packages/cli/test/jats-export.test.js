// JATS-export test suite — the `jats-export` module of @enscribejs/cli.
// (Self-contained monolith; chained after test/run.js in the package `test` script.)
//
// Phase 5 slice 5a (2026-05-29): minimal test suite covering:
//   - mapAttributes lift integration: jatsEmit produces correct
//     target-keyed attribute kv pairs for id / class / kwarg shapes.
//   - article-shaped fixture (doc-39): runs through the interpreter's
//     structural plugins to get the post-stage-3 mdast, then through
//     enscribeToJats, and compares against a snapshot.
//   - DTD validation: invokes xmllint on the produced XML against the
//     JATS Archiving and Interchange 1.3 DTD. Skipped with a console
//     note when xmllint isn't available; not a CI hard requirement
//     for slice 5a (the snapshot pins regression; DTD validation
//     pins correctness when the toolchain has it).

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { strict as assert } from 'node:assert';
// #144: the JATS integration tests build their tree via the real
// buildEnscribePipeline (not a hand-mirrored plugin chain), so they can't drift
// from the shipped pipeline. The structural-plugin / unified / remark imports the
// old hand-assembly needed are gone with it.
import { buildEnscribePipeline, assembleMasterDocument } from '@enscribejs/enscribe';
import { mapAttributes } from '@enscribejs/enscribe/core/map-attributes';
import { jatsEmit, aggregateJatsAttrs } from '../src/jats-export/lib/jats-emit.js';
import { enscribeToJats } from '../src/jats-export/index.js';
import { importJats } from '../src/jats-import/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');
const DTD_DIR = join(__dirname, '..', 'dtd');
const UPDATE_SNAPSHOTS = process.env.ENSCRIBE_UPDATE_SNAPSHOTS === '1';

let pass = 0;
let fail = 0;

function check(name, condition) {
  if (condition) {
    console.log('PASS:', name);
    pass++;
  } else {
    console.log('FAIL:', name);
    fail++;
  }
}

// ─── DTD validation (Phase 5 slice 5d) ────────────────────────────────────
//
// Detect xmllint availability ONCE; cache the result so the per-fixture
// validation call doesn't re-spawn xmllint to probe its presence each
// time. Validation invocation:
//
//   xmllint --noout --valid --nonet --path <DTD_DIR>:<DTD_DIR>/iso9573-13
//           <fixture.xml>
//
// Flags:
//   --noout   suppress reformatted XML output (we only want exit code)
//   --valid   enforce DTD validation (not just well-formedness)
//   --nonet   forbid network fetches — bundled DTDs are the only source
//   --path    where to look for SYSTEM-referenced files. Lists both the
//             dtd/ root and dtd/iso9573-13/ so MathML's bare-name ISO
//             entity references resolve.
//
// xmllint is provided by micromamba (`~/micromamba/bin/xmllint`) — it is NOT a
// system binary, and the ambient PATH is not guaranteed in every environment (a
// Claude Code session may not have micromamba active, and that is not the user's
// to control). So resolve the binary DETERMINISTICALLY — the micromamba path
// first, then a PATH fallback for environments that ship a system xmllint —
// rather than depending on prior activation.
//
// A DTD check that cannot run is a FAILURE, never a silent pass: if no xmllint
// can be found, fail loudly (exit non-zero) so a green run always means these
// checks actually executed. There is deliberately no skip-and-still-green path.
let _xmllintBin = null;
function resolveXmllint() {
  if (_xmllintBin !== null) return _xmllintBin;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [];
  if (home) candidates.push(join(home, 'micromamba', 'bin', 'xmllint'));
  candidates.push('xmllint'); // PATH fallback (e.g. a system-installed xmllint)
  for (const bin of candidates) {
    try {
      execSync(`"${bin}" --version`, { stdio: 'pipe' });
      _xmllintBin = bin;
      return bin;
    } catch { /* try the next candidate */ }
  }
  console.error(
    '\nFATAL: xmllint not found — JATS DTD validation cannot run.\n' +
    '  xmllint is provided by micromamba at ~/micromamba/bin/xmllint (it is NOT a\n' +
    '  system binary). Ensure that path exists, or provide xmllint on PATH.\n' +
    '  A DTD check that cannot run is a failure, not a skip — refusing to report green.\n',
  );
  process.exit(1);
}

function validateWithXmllint(fixtureName, jatsXml) {
  const bin = resolveXmllint();
  const tmpPath = join(FIXTURES_DIR, `.tmp-validate-${fixtureName}.xml`);
  writeFileSync(tmpPath, jatsXml, 'utf8');
  try {
    execSync(
      `"${bin}" --noout --valid --nonet --path "${DTD_DIR}:${DTD_DIR}/iso9573-13" "${tmpPath}"`,
      { stdio: 'pipe' },
    );
    check(`${fixtureName}: DTD-valid (xmllint --valid against bundled DTDs)`, true);
  } catch (err) {
    check(`${fixtureName}: DTD-valid (xmllint --valid against bundled DTDs)`, false);
    const stderr = err.stderr?.toString() ?? err.message;
    // Print the first ~10 lines of xmllint's diagnostic so failures
    // are debuggable from the test output without re-running.
    const lines = stderr.split('\n').slice(0, 12).join('\n');
    console.log('  xmllint:', lines);
  } finally {
    // Remove the temp validation file so test runs don't litter the
    // fixtures dir (now that xmllint is present, this path runs every
    // time — untracked turds would otherwise pollute the output-neutral
    // `git diff test/fixtures/` check).
    try { unlinkSync(tmpPath); } catch { /* already gone */ }
  }
}

// ─── Unit: mapAttributes + jatsEmit shape ─────────────────────────────────

{
  const node = {
    type: 'enscribeTag',
    tagname: 'fake',
    id: 'fig:elephant',
    classes: ['highlight', 'wide'],
    kwargs: { src: 'x.jpg', skipme: 'ignored' },
  };
  const vocab = {
    enscribe_attributes: {
      id:      { maps_to: { html: 'id', jats: 'id' } },
      classes: { maps_to: { html: 'class', jats: 'specific-use' } },
      kwargs: {
        src:    { maps_to: { html: 'src', jats: 'xlink:href' } },
        skipme: { maps_to: { html: 'skipme' } },  // no jats key
      },
    },
  };

  const results = mapAttributes(node, vocab, 'jats', jatsEmit);
  const attrStr = aggregateJatsAttrs(results);

  check(
    'mapAttributes + jatsEmit: id passes through',
    attrStr.includes('id="fig:elephant"'),
  );
  check(
    'mapAttributes + jatsEmit: classes → joined string on specific-use',
    attrStr.includes('specific-use="highlight wide"'),
  );
  check(
    'mapAttributes + jatsEmit: kwarg with jats name renames',
    attrStr.includes('xlink:href="x.jpg"'),
  );
  check(
    'mapAttributes + jatsEmit: kwarg without jats name is skipped',
    !attrStr.includes('skipme'),
  );
}

// ─── #246: enscribeToJats refuses a website at the LIBRARY layer ────────────
// The rule (a site has no JATS/BITS projection) holds for EVERY caller, not just the CLI's
// doExportJats guard — so a direct library consumer can't silently mis-emit an empty <article>.
{
  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const tree = proc.runSync(proc.parse('<meta type=website />\n<nav>\n<item src="home.emd" | Home>\n</nav>'));
  let threw = false; let msg = '';
  try { enscribeToJats(tree); } catch (e) { threw = true; msg = (e && e.message) || String(e); }
  check('#246: enscribeToJats throws on a <meta type=website> tree (no JATS/BITS projection)',
    threw && /no JATS\/BITS projection/.test(msg));
}

// ─── Integration: doc-39 minimal article through full pipeline ─────────────

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-39-jats-minimal-article.emd'), 'utf8');

  // The real pipeline assembly (#144) — this test can't drift from the shipped
  // pipeline the way a hand-mirrored stack can.
  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  // Snapshot.
  const snapshotPath = join(FIXTURES_DIR, 'document-39-jats-minimal-article.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-39-jats-minimal-article.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc39: JATS snapshot matches', jats === expected);
  }

  // Spot-checks for the most distinctive surface features.
  check('doc39: <?xml declaration present', jats.startsWith('<?xml'));
  check('doc39: <!DOCTYPE article PUBLIC JATS 1.3 declaration', jats.includes('JATS-archivearticle1-3.dtd'));
  check('doc39: <article article-type="research-article"', jats.includes('article-type="research-article"'));
  check('doc39: <article xml:lang="en" dtd-version="1.3"',
    jats.includes('xml:lang="en"') && jats.includes('dtd-version="1.3"'));
  check('doc39: <title-group> wraps article-title + subtitle',
    jats.includes('<title-group>') && jats.includes('<article-title>'));
  check('doc39: article-subtitle lifted to JATS <subtitle>',
    jats.includes('<subtitle>'));
  check('doc39: <contrib-group> wraps author', jats.includes('<contrib-group>'));
  check('doc39: <contrib contrib-type="author">',
    jats.includes('<contrib contrib-type="author">'));
  check('doc39: <string-name> for the author', jats.includes('<string-name>'));
  check('doc39: <abstract> emitted', jats.includes('<abstract>'));
  check('doc39: <body> region', jats.includes('<body>'));
  check('doc39: <sec> with <title> for sections', /<sec>\s*<title>/.test(jats));
  check('doc39: inline <italic> from i', jats.includes('<italic>italic</italic>'));
  check('doc39: inline <bold> from b', jats.includes('<bold>bold</bold>'));
  check('doc39: inline <monospace> from inline-code',
    jats.includes('<monospace>inline code</monospace>'));

  // Phase 5 slice 5d: DTD validation against bundled JATS 1.3
  // Archiving DTD. Skip-with-log when xmllint isn't on PATH.
  validateWithXmllint('doc39', jats);
}

// ─── Integration: doc-40 body content (Phase 5 slice 5b) ──────────────────

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-40-jats-body-content.emd'), 'utf8');

  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  const snapshotPath = join(FIXTURES_DIR, 'document-40-jats-body-content.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-40-jats-body-content.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc40: JATS snapshot matches', jats === expected);
  }

  // Spot-checks per slice 5b's added surface.

  // #78: section sec-type emitted directly at the emit site (verbatim raw value,
  // not the html data-sec-type form; custom values like "lists" pass through).
  check('doc40: <sec sec-type="lists"> from <section sec-type=lists>',
    jats.includes('<sec sec-type="lists">'));

  // #55: the ~~…~~ strikethrough idiom lifts to <s> → JATS <strike>.
  check('doc40: <strike> from ~~…~~ (#55 strikethrough idiom)',
    jats.includes('<strike>a struck-out aside</strike>'));

  // #31: <aside> is frameable — type → content-type, title → <caption><title>,
  // bottom caption → trailing <p> inside the box.
  check('doc40: <boxed-text content-type="warning"> from <aside type=warning>',
    jats.includes('<boxed-text content-type="warning"'));
  check('doc40: aside title → <caption><title>Heads up</title></caption>',
    jats.includes('<caption><title>Heads up</title></caption>'));
  check('doc40: aside bottom caption → trailing <p>',
    jats.includes('<p>See the calibration log.</p>'));

  // Lists.
  check('doc40: <list list-type="bullet">', jats.includes('<list list-type="bullet">'));
  check('doc40: <list list-type="order">', jats.includes('<list list-type="order">'));
  check('doc40: <list-item> emitted', jats.includes('<list-item>'));
  check('doc40: <def-list> for <dl>', jats.includes('<def-list>'));
  check('doc40: <def-item> + <term> + <def>',
    jats.includes('<def-item>') && jats.includes('<term>') && jats.includes('<def>'));

  // Math.
  check('doc40: <inline-formula><tex-math>',
    /<inline-formula><tex-math><!\[CDATA\[E = mc\^2\]\]><\/tex-math><\/inline-formula>/.test(jats));
  check('doc40: <disp-formula> with <tex-math> CDATA',
    /<disp-formula[^>]*>[\s\S]*<tex-math><!\[CDATA\[/.test(jats));
  check('doc40: <disp-formula> has <label>',
    /<disp-formula[^>]*>\s*<label>/.test(jats));
  check('doc40: align env wrapped in \\begin{aligned}',
    jats.includes('\\begin{aligned}'));

  // Theorem family.
  check('doc40: <statement content-type="theorem">',
    jats.includes('<statement content-type="theorem"'));
  check('doc40: <statement content-type="proof">',
    jats.includes('<statement content-type="proof"'));
  check('doc40: theorem <label>',
    jats.includes('<label>Theorem 1.</label>'));
  check('doc40: theorem <title> from name kwarg',
    jats.includes('<title>Pythagoras</title>'));
  check('doc40: unnumbered <proof> <label>',
    jats.includes('<label>Proof.</label>'));

  // Frameables.
  check('doc40: <fig> emitted', jats.includes('<fig'));
  check('doc40: <fig> <graphic xlink:href>',
    /<graphic xlink:href="elephant\.jpg"/.test(jats));
  check('doc40: <fig> <caption><p>',
    /<fig[^>]*>[\s\S]*<caption>[\s\S]*<p>An elephant\.<\/p>/.test(jats));
  check('doc40: <table-wrap> emitted', jats.includes('<table-wrap'));
  check('doc40: <table-wrap> <caption>',
    /<table-wrap[^>]*>[\s\S]*<caption>[\s\S]*<p>A small CSV table\.<\/p>/.test(jats));

  // Abstract limitation fix (Q1).
  check('doc40: abstract prose text retained (slice 5b Q1 fix)',
    /<abstract>\s*<p>[\s\S]*This abstract has[\s\S]*<i>italic<\/i>[\s\S]*<b>bold<\/b>/.test(jats) ||
    /<abstract>\s*<p>[\s\S]*This abstract has[\s\S]*<italic>italic<\/italic>[\s\S]*<bold>bold<\/bold>/.test(jats));

  // Phase 5 slice 5d: DTD validation.
  validateWithXmllint('doc40', jats);
}

// ─── Integration: doc-41 cross-refs + footnotes + table rows (slice 5c) ──
//
// Article-shaped fixture exercising the slice 5c added surface:
//   - <ref @id> resolves to <xref ref-type="..." rid="...">text</xref>
//   - <note> resolves to <xref ref-type="fn"> inline + collects into
//     a per-section / article-back <fn-group>
//   - <table csv | data> renders inner <thead>/<tbody> rows
//   - Theorem / equation / figure refs round-trip through their
//     respective ref-types.

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-41-jats-refs-notes-tables.emd'), 'utf8');

  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  const snapshotPath = join(FIXTURES_DIR, 'document-41-jats-refs-notes-tables.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-41-jats-refs-notes-tables.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc41: JATS snapshot matches', jats === expected);
  }

  // Spot-checks per slice 5c's added surface.

  // Cross-references — one per discriminator type.
  check('doc41: <xref ref-type="fig"> for figure ref',
    /<xref ref-type="fig" rid="fig:elephant">/.test(jats));
  check('doc41: <xref ref-type="disp-formula"> for equation ref',
    /<xref ref-type="disp-formula" rid="eqn:euler">/.test(jats));
  check('doc41: <xref ref-type="table"> for table ref',
    /<xref ref-type="table" rid="tab:demo">/.test(jats));
  check('doc41: <xref ref-type="sec"> for section ref',
    /<xref ref-type="sec" rid="sec:intro">/.test(jats));
  check('doc41: <xref ref-type="statement"> for theorem ref',
    /<xref ref-type="statement" rid="thm:pyth">/.test(jats));
  check('doc41: xref text uses pre-computed display text (e.g. "figure 1")',
    /<xref[^>]*rid="fig:elephant">figure 1<\/xref>/.test(jats));

  // Footnotes.
  check('doc41: inline <xref ref-type="fn"> for note marker',
    /<xref ref-type="fn" id="noteref-\d+" rid="[^"]+">\d+<\/xref>/.test(jats));
  check('doc41: <fn-group> emitted', /<fn-group/.test(jats));
  check('doc41: <fn id="..."> with <label>',
    /<fn id="[^"]+">\s*<label>\d+<\/label>/.test(jats));

  // Table rows.
  check('doc41: <table> <thead> <tr> <th> for headers',
    /<thead>\s*<tr>\s*<th>a<\/th>\s*<th>b<\/th>\s*<th>c<\/th>/.test(jats));
  check('doc41: <table> <tbody> <tr> <td> for body rows',
    /<tbody>\s*<tr>\s*<td>1<\/td>\s*<td>2<\/td>\s*<td>3<\/td>/.test(jats));
  check('doc41: second body row present',
    /<td>4<\/td>\s*<td>5<\/td>\s*<td>6<\/td>/.test(jats));

  // Per-section footnote collection (foot-scope default for articles —
  // sections that contain foot-notes get a <fn-group> at section end).
  check('doc41: at least one <fn-group> sits inside a <sec>',
    /<sec[^>]*>[\s\S]*<fn-group[\s\S]*?<\/fn-group>[\s\S]*<\/sec>/.test(jats));

  // Phase 5 slice 5d: DTD validation.
  validateWithXmllint('doc41', jats);
}

// ─── Integration: doc-42 BITS book export (slice 5c) ──────────────────────

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-42-jats-bits-book.emd'), 'utf8');

  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  const snapshotPath = join(FIXTURES_DIR, 'document-42-jats-bits-book.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-42-jats-bits-book.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc42: JATS snapshot matches', jats === expected);
  }

  // Spot-checks for the BITS book path.

  check('doc42: BITS doctype declaration',
    jats.includes('BITS-book2.dtd'));
  check('doc42: <book book-type="book" xml:lang="en" dtd-version="2.0">',
    /<book book-type="book" xml:lang="en" dtd-version="2\.0">/.test(jats));
  check('doc42: <book-meta> with <book-title-group>',
    jats.includes('<book-meta>') && jats.includes('<book-title-group>'));
  check('doc42: <book-title> emitted',
    /<book-title>A BITS Book for JATS Export<\/book-title>/.test(jats));
  check('doc42: <book-subtitle subtitle> emitted',
    jats.includes('<subtitle>Demonstrating Phase 5 slice 5c book path</subtitle>'));
  check('doc42: <front-matter> region for preface', jats.includes('<front-matter>'));
  check('doc42: <preface> named front-matter element (#4)',
    /<preface[ >]/.test(jats));
  check('doc42: <book-body> region for chapters (#4)',
    jats.includes('<book-body>'));
  check('doc42: <book-part book-part-type="chapter">',
    /<book-part book-part-type="chapter"/.test(jats));
  check('doc42: per-book-part <book-part-meta>',
    jats.includes('<book-part-meta>'));
  check('doc42: <book-back> region for appendix',
    jats.includes('<book-back>'));
  check('doc42: <book-part book-part-type="appendix">',
    /<book-part book-part-type="appendix"/.test(jats));
  check('doc42: edited-volume — per-book-part <contrib-group> for Methods',
    /<book-part book-part-type="chapter"[\s\S]*<book-part-meta>[\s\S]*<contrib-group>[\s\S]*<string-name>Guest Author/.test(jats));
  check('doc42: chapter-scope footnotes collected per book-part (in <back>)',
    /<book-part[\s\S]*?<back>\s*<fn-group/.test(jats));
  // Chapter-prefixed cross-ref text. The exact chapter number depends
  // on how the numbering registry counts book-parts (current behavior
  // counts preface as chapter 1 — see drift finding noted in the
  // slice commit message). Pattern-match the chapter-prefixed shape
  // rather than the specific number.
  check('doc42: chapter-prefixed cross-ref text (figure N.M)',
    /<xref[^>]*rid="fig:intro">figure \d+\.\d+<\/xref>/.test(jats));

  // Book-part titles lifted from pipe content.
  check('doc42: <book-part-title> from <chapter | Introduction> pipe content',
    jats.includes('<title>Introduction</title>'));
  check('doc42: <book-part-title> from <preface | About this Book>',
    jats.includes('<title>About this Book</title>'));
  check('doc42: <book-part-title> from <appendix | Notation>',
    jats.includes('<title>Notation</title>'));

  // Phase 5 slice 5d: DTD validation (BITS 2.0 path).
  validateWithXmllint('doc42', jats);
}

// ─── Integration: multi-file BOOK master → DTD-valid BITS (Slice B / #190) ──
//
// doc42 proves a SINGLE-FILE book exports valid BITS. This proves an ASSEMBLED
// multi-file book master does too: the children (a `<preface src>`, two
// `<chapter src>`, an `<appendix src>`) are stitched into one tree by the
// assembler, and the SAME enscribeToJats book path emits BITS — no separate
// multi-file export route. The master-book fixture is shared with render-fixtures
// and the browser/CLI master tests (packages/enscribe/test/fixtures/master-book).

{
  const BOOK_DIR = join(__dirname, '..', '..', 'enscribe', 'test', 'fixtures', 'master-book');
  const proc = buildEnscribePipeline({ assetsDir: BOOK_DIR });
  const tree = assembleMasterDocument({
    source: readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
  });
  const jats = enscribeToJats(proc.runSync(tree));

  const snapshotPath = join(FIXTURES_DIR, 'master-book-bits.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: master-book-bits.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration master-book: BITS snapshot matches', jats === expected);
  }

  // The assembled multi-file book emits the same BITS shape as a single-file book.
  check('master-book: BITS doctype declaration', jats.includes('BITS-book2.dtd'));
  check('master-book: <book book-type="book" …>',
    /<book book-type="book" xml:lang="en" dtd-version="2\.0">/.test(jats));
  check('master-book: <book-title> from the master <meta>',
    jats.includes('<book-title>Field Methods in Savanna Ecology</book-title>'));
  check('master-book: <front-matter> with <preface> (the <preface src> child)',
    jats.includes('<front-matter>') && /<preface[ >]/.test(jats));
  check('master-book: two chapter book-parts in <book-body>',
    jats.includes('<book-body>') &&
    (jats.match(/<book-part book-part-type="chapter"/g) || []).length === 2);
  check('master-book: <book-back> with appendix book-part',
    jats.includes('<book-back>') && /<book-part book-part-type="appendix"/.test(jats));
  check('master-book: per-chapter cross-ref text (figure N.M)',
    /<xref[^>]*rid="fig:transect">figure \d+\.\d+<\/xref>/.test(jats));

  // DTD validation: the assembled book is valid BITS 2.0.
  validateWithXmllint('master-book', jats);
}

// ─── Integration: doc-43 bibliography + external DSLs (slice 5d) ─────────
//
// Article fixture exercising the slice 5d added surface:
//   - <library> with BibTeX content → structured CSL-JSON intermediate
//   - <cite @key> → <xref ref-type="bibr" rid="ref-key">
//   - __bibliography → <ref-list><ref><element-citation> per-field
//     structured citation (author/title/source/year/volume/page/doi)
//   - <mermaid> / <abc> → <fig specific-use="enscribe-dsl-*"> with
//     <alt-text> + <preformat> source preservation
//   - cross-refs to mermaid/abc figures resolve through the figure
//     numbering counter shared with other frameables.

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-43-jats-bibliography-dsls.emd'), 'utf8');

  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  const snapshotPath = join(FIXTURES_DIR, 'document-43-jats-bibliography-dsls.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-43-jats-bibliography-dsls.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc43: JATS snapshot matches', jats === expected);
  }

  // Bibliography: <ref-list> + per-entry <element-citation>.
  check('doc43: <ref-list> emitted in <back>',
    /<back>[\s\S]*<ref-list>[\s\S]*<\/ref-list>[\s\S]*<\/back>/.test(jats));
  check('doc43: <ref-list> has <title>References</title>',
    /<ref-list>\s*<title>References<\/title>/.test(jats));
  check('doc43: <ref id="ref-Smith2020"> emitted',
    /<ref id="ref-Smith2020">/.test(jats));
  check('doc43: <element-citation publication-type="journal"> for article-journal',
    /<element-citation publication-type="journal">/.test(jats));
  check('doc43: <element-citation publication-type="book"> for book',
    /<element-citation publication-type="book">/.test(jats));
  check('doc43: <element-citation publication-type="confproc"> for paper-conference',
    /<element-citation publication-type="confproc">/.test(jats));

  // Person groups + name structure.
  check('doc43: <person-group person-group-type="author"> for authors',
    /<person-group person-group-type="author">/.test(jats));
  check('doc43: <name><surname>Smith</surname><given-names>Jane</given-names>',
    /<name>\s*<surname>Smith<\/surname>\s*<given-names>Jane<\/given-names>\s*<\/name>/.test(jats));
  check('doc43: second author <name>Doe</name>',
    /<surname>Doe<\/surname>\s*<given-names>John<\/given-names>/.test(jats));

  // Title + source.
  check('doc43: <article-title> for journal article',
    /<article-title>On the Behavior of Elephants<\/article-title>/.test(jats));
  check('doc43: <source> for journal name',
    /<source>Journal of Pachyderm Studies<\/source>/.test(jats));
  check('doc43: book title as <source>',
    /<source>Methods in Field Research<\/source>/.test(jats));

  // Year + volume + issue + pages + DOI + publisher.
  check('doc43: <year> emitted', /<year>2020<\/year>/.test(jats));
  check('doc43: <volume> emitted', /<volume>12<\/volume>/.test(jats));
  check('doc43: <issue> emitted', /<issue>3<\/issue>/.test(jats));
  check('doc43: <fpage> + <lpage> from "45-67"',
    /<fpage>45<\/fpage>\s*<lpage>67<\/lpage>/.test(jats));
  check('doc43: <pub-id pub-id-type="doi"> emitted',
    /<pub-id pub-id-type="doi">10\.1234\/jps\.2020\.45<\/pub-id>/.test(jats));
  check('doc43: <publisher-name> emitted',
    /<publisher-name>Academic Press<\/publisher-name>/.test(jats));
  check('doc43: <publisher-loc> emitted',
    /<publisher-loc>New York<\/publisher-loc>/.test(jats));

  // Citation cross-refs from body resolve to bibliography entry ids.
  check('doc43: <xref ref-type="bibr" rid="ref-Smith2020"> in body',
    /<xref ref-type="bibr" rid="ref-Smith2020">/.test(jats));
  check('doc43: <xref ref-type="bibr" rid="ref-Brown2021"> in body',
    /<xref ref-type="bibr" rid="ref-Brown2021">/.test(jats));

  // External DSL emission (mermaid).
  check('doc43: <fig specific-use="enscribe-dsl-mermaid"> for mermaid',
    /<fig[^>]*specific-use="enscribe-dsl-mermaid"/.test(jats));
  check('doc43: mermaid <preformat preformat-type="mermaid-source"> (#4)',
    /<preformat preformat-type="mermaid-source">[\s\S]*graph TD[\s\S]*<\/preformat>/.test(jats));
  check('doc43: mermaid <alt-text> emitted',
    /<alt-text>Mermaid diagram source/.test(jats));
  check('doc43: mermaid <caption> emitted',
    /<fig[^>]*specific-use="enscribe-dsl-mermaid"[\s\S]*<caption>[\s\S]*<p>A simple Mermaid flowchart/.test(jats));

  // External DSL emission (abc).
  check('doc43: <fig specific-use="enscribe-dsl-abc"> for abc',
    /<fig[^>]*specific-use="enscribe-dsl-abc"/.test(jats));
  check('doc43: abc <preformat preformat-type="abc-source"> (#4)',
    /<preformat preformat-type="abc-source">[\s\S]*Twinkle[\s\S]*<\/preformat>/.test(jats));

  // Cross-refs to DSL figures resolve through the figure counter.
  check('doc43: <xref ref-type="fig" rid="fig:flow"> resolves',
    /<xref ref-type="fig" rid="fig:flow">/.test(jats));
  check('doc43: <xref ref-type="fig" rid="fig:tune"> resolves',
    /<xref ref-type="fig" rid="fig:tune">/.test(jats));

  // Phase 5 slice 5d: DTD validation against bundled JATS 1.3 DTD.
  validateWithXmllint('doc43', jats);
}

// ─── Integration: doc-44 alpha cross-feature stress monograph (Phase 6) ───
//
// The alpha integration check's cross-feature artifact, exported via the BITS
// book path. In one book it combines the surface no other fixture exercises
// together: BITS book structure (preface / chapters / appendix + edited-volume
// per-book-part author), a <library> bibliography with <cite> cross-refs
// resolving INSIDE a book (Phase 6 book-bibliography fix — buildCitationIndex
// finds <data> nested in book-body, and the <ref-list> is emitted in
// <book-back>), external DSLs (mermaid + abc), the theorem family, math,
// frameables (fig + CSV table), and per-chapter footnotes (note-scope=chapter
// → per-book-part <fn-group>).

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-44-cross-feature-monograph.emd'), 'utf8');

  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  const snapshotPath = join(FIXTURES_DIR, 'document-44-cross-feature-monograph.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-44-cross-feature-monograph.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc44: JATS snapshot matches', jats === expected);
  }

  // BITS book structure (same surface as doc-42).
  check('doc44: BITS doctype declaration', jats.includes('BITS-book2.dtd'));
  check('doc44: <book ... dtd-version="2.0">',
    /<book book-type="book"[^>]*dtd-version="2\.0">/.test(jats));
  check('doc44: <front-matter> region for preface', jats.includes('<front-matter>'));
  check('doc44: <preface> named front-matter element (#4)',
    /<preface[ >]/.test(jats));
  check('doc44: <book-part book-part-type="chapter">',
    /<book-part book-part-type="chapter"/.test(jats));
  check('doc44: <book-back> region for appendix', jats.includes('<book-back>'));
  check('doc44: <book-part book-part-type="appendix">',
    /<book-part book-part-type="appendix"/.test(jats));
  check('doc44: edited-volume per-book-part <contrib-group> (Guest Author)',
    /<contrib-group>[\s\S]*<string-name>Guest Author/.test(jats));
  check('doc44: <book-part-title> from <chapter | Foundations>',
    jats.includes('<title>Foundations</title>'));

  // Bibliography INSIDE a book (Phase 6 fix): <ref-list> emitted in <book-back>.
  check('doc44: <ref-list> emitted', jats.includes('<ref-list>'));
  check('doc44: <ref-list> sits inside <book-back>',
    /<book-back>[\s\S]*<ref-list>[\s\S]*<\/ref-list>[\s\S]*<\/book-back>/.test(jats));
  check('doc44: <ref id="ref-Benson2007"> emitted', /<ref id="ref-Benson2007">/.test(jats));
  check('doc44: <element-citation publication-type="book"> for Benson2007',
    /<element-citation publication-type="book">/.test(jats));
  check('doc44: <element-citation publication-type="journal"> for Sethares1993',
    /<element-citation publication-type="journal">/.test(jats));
  check('doc44: <xref ref-type="bibr" rid="ref-Benson2007"> in body',
    /<xref ref-type="bibr" rid="ref-Benson2007">/.test(jats));
  check('doc44: <xref ref-type="bibr" rid="ref-Sethares1993"> in body',
    /<xref ref-type="bibr" rid="ref-Sethares1993">/.test(jats));

  // Theorem family: definition (own counter) + theorem + proof (unnumbered).
  check('doc44: theorem → <statement content-type="theorem">',
    /<statement content-type="theorem"/.test(jats));
  check('doc44: definition → <statement content-type="definition">',
    /<statement content-type="definition"/.test(jats));
  check('doc44: proof → <statement content-type="proof">',
    /<statement content-type="proof"/.test(jats));

  // Frameable CSV table → <table-wrap><table>.
  check('doc44: CSV table → <table-wrap>', /<table-wrap/.test(jats));
  check('doc44: CSV table → <table> with rows', /<table>[\s\S]*?<tr>/.test(jats));

  // External DSLs (same surface as doc-43).
  check('doc44: <fig specific-use="enscribe-dsl-mermaid">',
    /<fig[^>]*specific-use="enscribe-dsl-mermaid"/.test(jats));
  check('doc44: <fig specific-use="enscribe-dsl-abc">',
    /<fig[^>]*specific-use="enscribe-dsl-abc"/.test(jats));
  check('doc44: mermaid <preformat preformat-type="mermaid-source"> (#4)',
    /<preformat preformat-type="mermaid-source">/.test(jats));
  check('doc44: abc <preformat preformat-type="abc-source"> (#4)',
    /<preformat preformat-type="abc-source">/.test(jats));

  // Chapter-prefixed cross-references (per-chapter counter resets).
  check('doc44: chapter-prefixed figure cross-ref (figure N.M)',
    /<xref[^>]*rid="fig:circle">figure \d+\.\d+<\/xref>/.test(jats));
  check('doc44: chapter-prefixed table cross-ref (table N.M)',
    /<xref[^>]*rid="tab:ratios">table \d+\.\d+<\/xref>/.test(jats));

  // Per-chapter footnotes: chapter-scope notes collected per book-part.
  check('doc44: per-book-part footnotes (<book-part> ... <back> <fn-group>)',
    /<book-part[\s\S]*?<back>\s*<fn-group/.test(jats));

  // DTD validation (BITS 2.0 path).
  validateWithXmllint('doc44', jats);
}

// ─── Integration: doc-45 inline SVG figure → JATS <graphic> data URI (#86) ──

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-45-jats-svg-figure.emd'), 'utf8');

  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  const snapshotPath = join(FIXTURES_DIR, 'document-45-jats-svg-figure.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-45-jats-svg-figure.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc45: JATS snapshot matches', jats === expected);
  }

  // #86: a captioned/numbered inline <svg> exports as <fig> with a <label>, a
  // <caption>, and a self-contained <graphic> whose xlink:href is a base64 SVG
  // data URI — valid (was a DTD-invalid placeholder) and lossless (was dropped).
  check('doc45: <fig id="fig:circle">', jats.includes('<fig id="fig:circle">'));
  check('doc45: numbered <label>', jats.includes('<label>1</label>'));
  check('doc45: <caption> carries the caption text', jats.includes('<p>A blue circle.</p>'));
  check('doc45: no DTD-invalid placeholder <graphic specific-use="inline-svg">',
    !jats.includes('specific-use="inline-svg"'));
  const gm = jats.match(/<graphic xlink:href="data:image\/svg\+xml;base64,([^"]+)"\/>/);
  check('doc45: <graphic> carries an SVG base64 data-URI xlink:href', !!gm);
  if (gm) {
    const decoded = Buffer.from(gm[1], 'base64').toString('utf8');
    check('doc45: data URI is lossless (full <svg> + the <circle> survive)',
      decoded.includes('<svg ') && decoded.includes('<circle') && decoded.includes('fill="blue"'));
  }

  // DTD validation — the gate this whole fix exists to clear (#86 / #31).
  validateWithXmllint('doc45', jats);
}

// ─── Integration: doc-46 book section/appendix numbering → JATS labels (#57) ─

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-46-jats-section-numbering.emd'), 'utf8');

  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  const snapshotPath = join(FIXTURES_DIR, 'document-46-jats-section-numbering.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-46-jats-section-numbering.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc46: JATS snapshot matches', jats === expected);
  }

  // #57: book defaults on. Chapter/appendix headings get a <label> in their
  // <book-part-meta><title-group> (before <title>); sections get a <sec><label>.
  check('doc46: chapter book-part numbered (<label>1</label>)', jats.includes('<label>1</label>'));
  check('doc46: appendix book-part lettered (<label>A</label>)', jats.includes('<label>A</label>'));
  check('doc46: chapter section <sec> label 1.1', jats.includes('<label>1.1</label>'));
  check('doc46: appendix section <sec> label A.1', jats.includes('<label>A.1</label>'));
  // The <label> lives inside <title-group> before <title> (BITS-valid placement).
  check('doc46: <title-group> carries label before title',
    /<title-group>\s*<label>[^<]+<\/label>\s*<title>/.test(jats));

  validateWithXmllint('doc46', jats);
}

// ─── Integration: doc-55 data-table cell parsing → JATS (#21) ───────────────

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-55-table-cell-parse.emd'), 'utf8');

  // The real pipeline assembly, so the table-cell-parse plugin + cite/ref
  // resolution run in their proper order — the test can't drift from the shipped
  // pipeline (#144).
  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  const snapshotPath = join(FIXTURES_DIR, 'document-55-table-cell-parse.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-55-table-cell-parse.xml)');
  } else {
    check('integration doc55: JATS snapshot matches', jats === readFileSync(snapshotPath, 'utf8'));
  }

  // #21: a parsed column parses in JATS as well as HTML — the archival channel
  // carries the semantics (a link is an <ext-link>, a cross-ref an <xref>, a cite
  // an <xref ref-type="bibr">, inline code <monospace>, inline math <inline-formula>).
  check('doc55: parsed cell link → <ext-link>', /<ext-link[^>]*>the site<\/ext-link>/.test(jats));
  check('doc55: cross-ref in cell → <xref ref-type="fig">',
    jats.includes('<xref ref-type="fig" rid="fig:plot">figure 1</xref>'));
  check('doc55: cite in cell → <xref ref-type="bibr">',
    /<xref ref-type="bibr"[^>]*>smith2020<\/xref>/.test(jats));
  check('doc55: inline code in cell → <monospace>', jats.includes('<monospace>inline code</monospace>'));
  check('doc55: inline math in cell → <inline-formula>',
    jats.includes('<inline-formula><tex-math><![CDATA[x^2]]></tex-math></inline-formula>'));
  // Literal columns stay literal (escaped) in JATS — data payload untouched.
  check('doc55: literal value cell unchanged', jats.includes('<td>3.14</td>'));
  check('doc55: -parse-text cell stays literal in JATS',
    jats.includes('&lt;a https://example.org | this&gt; is not a link'));

  validateWithXmllint('doc55', jats);
}

// ─── Integration: doc-56 import → re-export, cell content survives + DTD-valid (#105) ─

{
  const xml = readFileSync(join(FIXTURES_DIR, 'document-56-jats-cell-content.xml'), 'utf8');
  // Import JATS → run the real pipeline (cell-parse + resolution) → re-export.
  const tree = buildEnscribePipeline({ assetsDir: FIXTURES_DIR }).runSync(importJats(xml));
  const jats = enscribeToJats(tree);

  // A formula / citation / footnote authored inside a <table-wrap> cell survives
  // the import → re-export round-trip into the archival channel.
  check('doc56: cell formula → <inline-formula> in re-export', jats.includes('<inline-formula>'));
  check('doc56: cell citation → <xref ref-type="bibr"> in re-export', /<xref ref-type="bibr"/.test(jats));
  check('doc56: cell footnote → <xref ref-type="fn"> in re-export', /<xref ref-type="fn"/.test(jats));
  validateWithXmllint('doc56', jats);
}

// ─── Integration: doc-57 complex (HTML-layout) table re-export, DTD-valid (#106) ─

{
  const xml = readFileSync(join(FIXTURES_DIR, 'document-57-jats-complex-table.xml'), 'utf8');
  const tree = buildEnscribePipeline({ assetsDir: FIXTURES_DIR }).runSync(importJats(xml));
  const jats = enscribeToJats(tree);

  // The complex table re-exports as a real grid (replacing the old comment
  // placeholder) — spans preserved, cell content converted, no raw verbatim JATS.
  check('doc57: complex table → real <table-wrap>/<table> grid (not placeholder)',
    jats.includes('<table-wrap') && !/<!-- table data; format=raw -->/.test(jats));
  check('doc57: header spans preserved in re-export',
    /<th[^>]*rowspan="2"/.test(jats) && /<th[^>]*colspan="2"/.test(jats));
  check('doc57: cell formula → <inline-formula> in re-export', jats.includes('<inline-formula>'));
  check('doc57: cell cross-ref → <xref ref-type="table"> in re-export', /<xref ref-type="table"/.test(jats));
  check('doc57: cell citation → <xref ref-type="bibr"> in re-export', /<xref ref-type="bibr"/.test(jats));
  validateWithXmllint('doc57', jats);
}

// ─── #107: imported <date> re-exports as a valid <pub-date> ─────────────────

{
  const mk = (dateXml) => `<article article-type="research-article" xml:lang="en" dtd-version="1.3">
<front><article-meta>
<title-group><article-title>Date round-trip</article-title></title-group>
<contrib-group><contrib contrib-type="author"><string-name>A. Author</string-name></contrib></contrib-group>
${dateXml}
<abstract><p>An abstract.</p></abstract>
</article-meta></front>
<body><sec id="s"><title>S</title><p>Body.</p></sec></body>
</article>`;
  const toJats = (xml) => enscribeToJats(buildEnscribePipeline({}).runSync(importJats(xml)));

  // Full date → <year>/<month>/<day> child elements (month/day zero-padded by the
  // importer), positioned before <abstract>; the broken path emitted an invalid
  // `<pub-date or date (in history)>` with the bare date string as text.
  const full = toJats(mk('<pub-date pub-type="epub"><year>2020</year><month>3</month><day>1</day></pub-date>'));
  check('doc107: full date → <pub-date><year><month><day>',
    /<pub-date><year>2020<\/year><month>03<\/month><day>01<\/day><\/pub-date>/.test(full));
  check('doc107: <pub-date> emitted before <abstract>', full.indexOf('<pub-date>') < full.indexOf('<abstract>') && full.includes('<pub-date>'));
  check('doc107: no malformed "pub-date or date" tag', !/pub-date or date/.test(full));
  validateWithXmllint('doc107-full', full);

  // Year-only → <year> only, still valid.
  const yearOnly = toJats(mk('<pub-date><year>1999</year></pub-date>'));
  check('doc107: year-only → <pub-date><year> only',
    /<pub-date><year>1999<\/year><\/pub-date>/.test(yearOnly));
  validateWithXmllint('doc107-year', yearOnly);
}

// ─── heading-is-a-section + title-from-<meta>; JATS "Untitled" default ──────
// A document with no <meta> title is a valid authoring choice: the article title
// comes only from <meta>. It renders with no title and does not error; its JATS
// export fills the required <article-title> with the "Untitled" placeholder so
// the output stays DTD-valid. (See idioms.md + pipeline.md "Stage 5'".)
{
  const src = [
    '<meta type=article>',
    '  <author | A. Author>',
    '</meta>',
    '',
    '# A Section',
    '',
    'Body text with no document title.',
    '',
  ].join('\n');

  // Display: renders with no <article-title>, and does not throw.
  let html = '';
  let threw = false;
  try {
    html = String(buildEnscribePipeline({}).processSync(src));
  } catch {
    threw = true;
  }
  check('no-title: HTML render does not error', !threw);
  check('no-title: HTML has no <article-title> (blank title is a valid choice)',
    !/<article-title\b/.test(html));
  check('no-title: the heading became a <section-title>, not the title',
    html.includes('<section-title>A Section</section-title>'));

  // JATS export via the real pipeline (#144).
  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  check('no-title: JATS fills <article-title>Untitled</article-title>',
    jats.includes('<article-title>Untitled</article-title>'));
  check('no-title: the heading is a <sec> <title>, not the article title',
    jats.includes('<title>A Section</title>'));
  validateWithXmllint('no-title-untitled', jats);
}

// ─── #137: <list> construct → JATS <list> ─────────────────────────────────
//
// Built through buildEnscribePipeline (the canonical assembly the real CLI export
// path runs), so enscribeListStructuring runs and `<list>` lowers to a markdown
// list node, which the exporter emits as <list list-type="bullet|order">.
{
  const src = [
    '<meta type=article>',
    '<title | Lists>',
    '</meta>',
    '',
    '<list>',
    '<li> first item',
    '<li> second item',
    '</list>',
    '',
    '<list ordered>',
    '<li> step one',
    '<li> step two',
    '</list>',
  ].join('\n');
  const proc = buildEnscribePipeline();
  const tree = proc.runSync(proc.parse(src));
  const jats = enscribeToJats(tree);

  check('doc137: <list> → <list list-type="bullet">',
    jats.includes('<list list-type="bullet">'));
  check('doc137: <list ordered> → <list list-type="order">',
    jats.includes('<list list-type="order">'));
  check('doc137: item lowers to <list-item><p>…</p>',
    /<list-item>\s*<p>first item<\/p>\s*<\/list-item>/.test(jats));
  check('doc137: no <ul>/<ol> leak into JATS',
    !jats.includes('<ul>') && !jats.includes('<ol>'));
  validateWithXmllint('doc137-lists', jats);
}

// ─── #100: article appendices → <app-group> / <app> in <back> ───────────────
//
// Built through the full pipeline (buildEnscribePipeline → enscribeToJats), so
// numbering letters the appendices (#57).
{
  const src = [
    '<meta type=article>', '<title | Appendix Test>', '</meta>', '',
    '<config number-sections=true />', '',
    '# Intro', '', 'See <ref @app:a>.', '',
    '<appendix #app:a | Notation>', '', 'Body of A.', '', '## Symbols', '', 'Sub content.', '',
    '<appendix #app:b | Sources>', '', 'Body of B.',
  ].join('\n');
  const proc = buildEnscribePipeline();
  const tree = proc.runSync(proc.parse(src));
  const jats = enscribeToJats(tree);

  check('doc100-appendices: <app-group> present in <back>', jats.includes('<app-group>'));
  check('doc100-appendices: both appendices in ONE <app-group>',
    (jats.match(/<app-group>/g) || []).length === 1 && (jats.match(/<app id=/g) || []).length === 2);
  check('doc100-appendices: <app id="app:a"> with <label>A</label> + <title>',
    /<app id="app:a">\s*<label>A<\/label>\s*<title>Notation<\/title>/.test(jats));
  check('doc100-appendices: <app id="app:b"> lettered B',
    /<app id="app:b">\s*<label>B<\/label>\s*<title>Sources<\/title>/.test(jats));
  check('doc100-appendices: appendix sub-section → <sec> labelled A.1',
    /<sec>\s*<label>A\.1<\/label>\s*<title>Symbols<\/title>/.test(jats));
  check('doc100-appendices: no <book-part> leaks into article JATS', !jats.includes('<book-part'));
  validateWithXmllint('doc100-appendices', jats);
}

// ─── #33 part 2: <marginnote> → <boxed-text content-type="marginnote"> ──────
{
  const src = [
    '<meta type=article>', '<title | Marginnote Test>', '</meta>', '',
    '# Intro', '',
    'A claim that needs a remark.<marginnote #m1 | An aside set in the margin.> It holds.',
  ].join('\n');
  const proc = buildEnscribePipeline();
  const tree = proc.runSync(proc.parse(src));
  const jats = enscribeToJats(tree);

  check('doc-marginnote: <boxed-text content-type="marginnote"> emitted',
    /<boxed-text id="m1" content-type="marginnote"><p>An aside set in the margin\.<\/p><\/boxed-text>/.test(jats));
  check('doc-marginnote: emitted at the authored position (inside the paragraph)',
    /A claim that needs a remark\.<boxed-text/.test(jats));
  validateWithXmllint('doc-marginnote', jats);
}

// ─── Integration: doc-58 <data> asset export (#190 slice 4) ───────────────
// The JATS exporter consumes the same shared canonical tree that
// enscribeAssetResolution already rewrote (interpreter step 5.8), so a body
// <fig src="@id"> arrives with its src already resolved — embedded to a data:
// URI, external to the (rebased) path — and emitFigureJats emits the right
// <graphic xlink:href> with no asset-specific code. This pins that, the DTD
// validity of an embedded-asset data: URI (the inline-SVG precedent), and that
// an unresolved @id does not leak into the export.
{
  const src = readFileSync(join(FIXTURES_DIR, 'document-58-jats-assets-article.emd'), 'utf8');
  const proc = buildEnscribePipeline({ assetsDir: FIXTURES_DIR });
  const jats = enscribeToJats(proc.runSync(proc.parse(src)));

  const snapshotPath = join(FIXTURES_DIR, 'document-58-jats-assets-article.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-58-jats-assets-article.xml)');
  } else {
    check('integration doc58: JATS snapshot matches', jats === readFileSync(snapshotPath, 'utf8'));
  }

  // Embedded raster → a png data: URI on <graphic xlink:href>.
  check('doc58: embedded png → <graphic xlink:href="data:image/png;base64,…">',
    /<fig id="fig:photo">[\s\S]*?<graphic xlink:href="data:image\/png;base64,iVBORw0KGgo[^"]*"\/>/.test(jats));
  // Embedded vector → a svg+xml data: URI (the <fig> src branch, NOT the inline-<svg> branch).
  check('doc58: embedded svg → <graphic xlink:href="data:image/svg+xml;base64,…">',
    /<fig id="fig:vector">[\s\S]*?<graphic xlink:href="data:image\/svg\+xml;base64,PHN2Zy8\+"\/>/.test(jats));
  // External → the declared path on <graphic xlink:href> (a plain path, not data:).
  check('doc58: external → <graphic xlink:href="figures/chart.png">',
    /<fig id="fig:chart">[\s\S]*?<graphic xlink:href="figures\/chart\.png"\/>/.test(jats));
  // Duplicate placement: the asset is placed twice → two <graphic>s, exactly one id="fig:photo".
  check('doc58: re-placed asset → exactly one id="fig:photo"',
    (jats.match(/\bid="fig:photo"/g) || []).length === 1);   // \b excludes <xref rid="…">; DTD-valid confirms no duplicate ID
  check('doc58: re-placed asset → its data: URI appears twice (both placements export)',
    (jats.match(/data:image\/png;base64,iVBORw0KGgo/g) || []).length === 2);
  // The <ref>s resolve to <xref> against the placed figures (id present → DTD-valid IDREFS).
  check('doc58: <ref @fig:photo> → <xref rid="fig:photo">', /<xref [^>]*rid="fig:photo"/.test(jats));
  // An unresolved @id does not leak a broken <graphic> or an error element into the export.
  check('doc58: unresolved @undeclared does not leak into JATS',
    !/undeclared|asset-error|could not resolve/i.test(jats) && !/xlink:href="@/.test(jats));
  validateWithXmllint('doc58', jats);
}

// ─── Integration: cross-file external asset → BITS (#190 slice 4) ─────────
// An external <fig #id src=…> declared in a SUBDIRECTORY chapter is rebased
// master-relative on assembly; exporting the assembled book to BITS carries that
// rebased path straight onto <graphic xlink:href>, and the book is BITS DTD-valid.
{
  const EXT_DIR = join(FIXTURES_DIR, 'master-asset-ext');
  const proc = buildEnscribePipeline({ assetsDir: EXT_DIR });
  const tree = assembleMasterDocument({
    source: readFileSync(join(EXT_DIR, 'master.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(EXT_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: () => {},
  });
  const bits = enscribeToJats(proc.runSync(tree));

  check('book-asset-ext: BITS doctype', bits.includes('BITS-book2.dtd'));
  check('book-asset-ext: cross-file external → <graphic xlink:href="parts/diagram.svg">',
    /<fig id="fig:diagram">[\s\S]*?<graphic xlink:href="parts\/diagram\.svg"\/>/.test(bits));
  check('book-asset-ext: no <data> and no raw @-src leaked into BITS',
    !/<data\b/.test(bits) && !/xlink:href="@/.test(bits));
  validateWithXmllint('book-asset-ext', bits);
}

// ─── Integration: cross-file EMBEDDED asset → BITS (#190 slice 4) ──────────
// The embedded cross-chapter happy path in BITS: an asset declared in chapter 1's
// <data> exports as a data: URI <graphic> at its placement in chapter 2, with a
// chapter-prefixed <label> (2.1). NOTE (slice-4 critic finding, surfaced not fixed):
// this fixture also declares the same id in both chapters, whose duplicate-
// DECLARATION collision flag IS visible in the HTML projection
// (master-document.test.js) but is currently NOT surfaced in JATS/BITS — the same
// omission as an unresolved @id (doc58 above). Whether the canonical archival
// format should carry that integrity warning is an open #190 design question; this
// slice leaves the behavior unchanged and asserts nothing on the flag either way.
{
  const BOOK_DIR = join(FIXTURES_DIR, 'master-asset-book');
  const proc = buildEnscribePipeline({ assetsDir: BOOK_DIR });
  const tree = assembleMasterDocument({
    source: readFileSync(join(BOOK_DIR, 'master.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: () => {},
  });
  const bits = enscribeToJats(proc.runSync(tree));

  check('book-asset-emb: BITS doctype', bits.includes('BITS-book2.dtd'));
  check('book-asset-emb: embedded cross-chapter asset → <graphic xlink:href="data:image/png;base64,…">',
    /<fig id="fig:scatter">[\s\S]*?<graphic xlink:href="data:image\/png;base64,iVBORw0KGgo[^"]*"\/>/.test(bits));
  check('book-asset-emb: chapter-prefixed BITS <label> (2.1)',
    /<fig id="fig:scatter">\s*<label>2\.1<\/label>/.test(bits));
  check('book-asset-emb: no <data> and no raw @-src leaked into BITS',
    !/<data\b/.test(bits) && !/xlink:href="@/.test(bits));
  validateWithXmllint('book-asset-emb', bits);
}

// ─── Summary ──────────────────────────────────────────────────────────────

console.log('');
if (fail === 0) {
  console.log(`OK: ${pass}/${pass + fail} checks passed`);
  process.exit(0);
} else {
  console.log(`FAILED: ${pass}/${pass + fail} checks passed (${fail} failed)`);
  process.exit(1);
}
