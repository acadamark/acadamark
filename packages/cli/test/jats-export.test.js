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
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '@enscribejs/enscribe/parser';
import remarkRecursiveContent from '@enscribejs/enscribe/parser/recursive-content';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import {
  enscribeNormalizeToCanonical,
  enscribeConfigDiscovery,
  enscribeBookStructuring,
  enscribeArticleStructuring,
  enscribeSectionNesting,
  enscribeNotes,
  enscribeNotePlacement,
  enscribeNumbering,
  fillNumbering,
  numberSections,
  enscribeRefResolution,
  enscribeCiteResolution,
  enscribeBibliography,
  buildCitationIndex,
  buildEnscribePipeline,
} from '@enscribejs/enscribe';
import { ensureRegistry } from '@enscribejs/enscribe/core/registry';
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

// ─── Integration: doc-39 minimal article through full pipeline ─────────────

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-39-jats-minimal-article.emd'), 'utf8');

  // Build the post-stage-3 mdast via the interpreter's structural plugins.
  // Mirror the slice 5a-spec'd pipeline: parse + recursive content +
  // normalize + config-discovery + book-structuring + article-structuring +
  // section-nesting. Stages 4+ (cite/note/numbering/etc.) aren't needed
  // for slice 5a's minimal scope.
  const inner = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm)
    .parse(src);

  // Run the transforms in pipeline order. remarkRecursiveContent
  // (stage 2) must run before the structural plugins (stage 3) so
  // pipe-content arrays are populated. The order matches what
  // `enscribe/interpreter`'s `enscribeInterpreter` plugin registers.
  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    .use(enscribeConfigDiscovery)
    .use(enscribeBookStructuring)
    .use(enscribeArticleStructuring)
    .use(enscribeSectionNesting)
    .runSync(tree, file);

  // Export to JATS.
  const jats = enscribeToJats(tree);

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

  const inner = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm)
    .parse(src);

  // Run the same transform pipeline as doc-39 but also include
  // numbering + apply-numbers + ref-resolution so display-math and
  // frameables get computedNumber populated (required for <label>
  // emission per slice 5b).
  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    .use(enscribeConfigDiscovery)
    .use(enscribeBookStructuring)
    .use(enscribeArticleStructuring)
    .use(enscribeSectionNesting)
    .use(enscribeNumbering)
    .use(function applyNumbers() {
      return (t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); numberSections(t, f); };
    })
    .use(enscribeRefResolution)
    .runSync(tree, file);

  const jats = enscribeToJats(tree);

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

  const inner = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm)
    .parse(src);

  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    .use(enscribeConfigDiscovery)
    .use(enscribeBookStructuring)
    .use(enscribeArticleStructuring)
    .use(enscribeSectionNesting)
    .use(enscribeNotes)
    .use(enscribeNumbering)
    .use(function applyNumbers() {
      return (t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); numberSections(t, f); };
    })
    .use(enscribeRefResolution)
    .use(enscribeCiteResolution)
    .use(enscribeNotePlacement)
    .use(enscribeBibliography)
    .runSync(tree, file);

  const jats = enscribeToJats(tree);

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

  const inner = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm)
    .parse(src);

  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    .use(enscribeConfigDiscovery)
    .use(enscribeBookStructuring)
    .use(enscribeArticleStructuring)
    .use(enscribeSectionNesting)
    .use(enscribeNotes)
    .use(enscribeNumbering)
    .use(function applyNumbers() {
      return (t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); numberSections(t, f); };
    })
    .use(enscribeRefResolution)
    .use(enscribeCiteResolution)
    .use(enscribeNotePlacement)
    .use(enscribeBibliography)
    .runSync(tree, file);

  const jats = enscribeToJats(tree);

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

  const inner = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm)
    .parse(src);

  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    .use(enscribeConfigDiscovery)
    .use(enscribeBookStructuring)
    .use(enscribeArticleStructuring)
    .use(enscribeSectionNesting)
    .use(function loadLibrary() {
      return (t, f) => buildCitationIndex(t, f, { assetsDir: FIXTURES_DIR });
    })
    .use(enscribeNotes)
    .use(enscribeNumbering)
    .use(function applyNumbers() {
      return (t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); numberSections(t, f); };
    })
    .use(enscribeRefResolution)
    .use(enscribeCiteResolution)
    .use(enscribeNotePlacement)
    .use(enscribeBibliography)
    .runSync(tree, file);

  const jats = enscribeToJats(tree);

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

  const inner = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm)
    .parse(src);

  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    .use(enscribeConfigDiscovery)
    .use(enscribeBookStructuring)
    .use(enscribeArticleStructuring)
    .use(enscribeSectionNesting)
    .use(function loadLibrary() {
      return (t, f) => buildCitationIndex(t, f, { assetsDir: FIXTURES_DIR });
    })
    .use(enscribeNotes)
    .use(enscribeNumbering)
    .use(function applyNumbers() {
      return (t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); numberSections(t, f); };
    })
    .use(enscribeRefResolution)
    .use(enscribeCiteResolution)
    .use(enscribeNotePlacement)
    .use(enscribeBibliography)
    .runSync(tree, file);

  const jats = enscribeToJats(tree);

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

  const inner = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm)
    .parse(src);

  // Full pipeline incl. numbering so the numbered <svg> gets its <label>.
  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    .use(enscribeConfigDiscovery)
    .use(enscribeBookStructuring)
    .use(enscribeArticleStructuring)
    .use(enscribeSectionNesting)
    .use(enscribeNumbering)
    .use(function applyNumbers() {
      return (t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); numberSections(t, f); };
    })
    .use(enscribeRefResolution)
    .runSync(tree, file);

  const jats = enscribeToJats(tree);

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

  const inner = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm)
    .parse(src);

  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    .use(enscribeConfigDiscovery)
    .use(enscribeBookStructuring)
    .use(enscribeArticleStructuring)
    .use(enscribeSectionNesting)
    .use(enscribeNumbering)
    .use(function applyNumbers() {
      return (t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); numberSections(t, f); };
    })
    .use(enscribeRefResolution)
    .runSync(tree, file);

  const jats = enscribeToJats(tree);

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

  // Use the real pipeline assembly so the table-cell-parse plugin + cite/ref
  // resolution all run in their proper order (this test can't drift from the
  // shipped pipeline the way a hand-mirrored stack can).
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

// ─── Summary ──────────────────────────────────────────────────────────────

console.log('');
if (fail === 0) {
  console.log(`OK: ${pass}/${pass + fail} checks passed`);
  process.exit(0);
} else {
  console.log(`FAILED: ${pass}/${pass + fail} checks passed (${fail} failed)`);
  process.exit(1);
}
