// Coverage spec-data — the transcribed source-of-truth for the fixture-coverage
// matrix (#5). It mirrors facts that live in `notes/specs/` (render-quality.md
// coverage map + predicates, tag-forms-reference.md, idioms.md, frameable.md).
//
// WHY a transcription and not a live read: the manifest generator runs in the
// test/build step, and the `notes/` leak guard forbids referencing notes/ at
// runtime. Transcribing the spec facts here decouples the test infrastructure
// from notes/ markdown (which mixes tables with prose and would be fragile to
// parse) and keeps the generator deterministic. Element list, kwargs, content
// type, and interpreter strategy are NOT transcribed — they are read live from
// the `VOCABULARY` data module. Register expressibility's sigil half is read
// live from `core/tagname-sigil-map.js`; the markdown half is the IDIOMS table
// below (transcribed from idioms.md, whose live source is the normalization
// registry).
//
// PROVENANCE per table is noted inline. When a notes/spec changes, this file is
// the one place to reconcile (see test/coverage/README.md).

// ── Disposition + area, per element (render-quality.md §2 coverage map) ───────
// disposition ∈ specified | generic-implicit | no-output | deferred-presentation
// area = the RQ-<AREA> code of the render-quality section the row points to.
// NOTE: render-quality uses area code RQ-FRM (not RQ-FRAME).
export const DISPOSITION = {
  // RQ-DOC (§3)
  article: { area: 'RQ-DOC', disposition: 'specified' },
  'article-front': { area: 'RQ-DOC', disposition: 'specified' },
  'article-body': { area: 'RQ-DOC', disposition: 'specified' },
  'article-back': { area: 'RQ-DOC', disposition: 'specified' },
  'article-title': { area: 'RQ-DOC', disposition: 'specified' },
  'article-subtitle': { area: 'RQ-DOC', disposition: 'specified' },
  section: { area: 'RQ-DOC', disposition: 'specified' },
  'sub-section': { area: 'RQ-DOC', disposition: 'specified' },
  'sub-sub-section': { area: 'RQ-DOC', disposition: 'specified' },
  'section-title': { area: 'RQ-DOC', disposition: 'specified' },
  'section-subtitle': { area: 'RQ-DOC', disposition: 'specified' },
  'sub-section-title': { area: 'RQ-DOC', disposition: 'specified' },
  'sub-section-subtitle': { area: 'RQ-DOC', disposition: 'specified' },
  'sub-sub-section-title': { area: 'RQ-DOC', disposition: 'specified' },
  'sub-sub-section-subtitle': { area: 'RQ-DOC', disposition: 'specified' },
  title: { area: 'RQ-DOC', disposition: 'specified' },
  subtitle: { area: 'RQ-DOC', disposition: 'specified' },
  // RQ-META (§4)
  author: { area: 'RQ-META', disposition: 'specified' },
  name: { area: 'RQ-META', disposition: 'specified' },
  meta: { area: 'RQ-META', disposition: 'no-output' },
  config: { area: 'RQ-META', disposition: 'no-output' },
  data: { area: 'RQ-META', disposition: 'no-output' },
  library: { area: 'RQ-META', disposition: 'no-output' },
  affiliation: { area: 'RQ-META', disposition: 'deferred-presentation' },
  orcid: { area: 'RQ-META', disposition: 'deferred-presentation' },
  email: { area: 'RQ-META', disposition: 'deferred-presentation' },
  date: { area: 'RQ-META', disposition: 'deferred-presentation' },
  'publication-date': { area: 'RQ-META', disposition: 'deferred-presentation' },
  doi: { area: 'RQ-META', disposition: 'deferred-presentation' },
  license: { area: 'RQ-META', disposition: 'deferred-presentation' },
  lang: { area: 'RQ-META', disposition: 'deferred-presentation' },
  keywords: { area: 'RQ-META', disposition: 'deferred-presentation' },
  subject: { area: 'RQ-META', disposition: 'deferred-presentation' },
  version: { area: 'RQ-META', disposition: 'deferred-presentation' },
  editor: { area: 'RQ-META', disposition: 'deferred-presentation' },
  // RQ-BLK (§6)
  p: { area: 'RQ-BLK', disposition: 'generic-implicit' },
  blockquote: { area: 'RQ-BLK', disposition: 'specified' },
  quote: { area: 'RQ-BLK', disposition: 'specified' }, // shorthand alias of blockquote
  hr: { area: 'RQ-BLK', disposition: 'specified' },
  ul: { area: 'RQ-BLK', disposition: 'specified' },
  ol: { area: 'RQ-BLK', disposition: 'specified' },
  li: { area: 'RQ-BLK', disposition: 'specified' },
  details: { area: 'RQ-BLK', disposition: 'generic-implicit' },
  summary: { area: 'RQ-BLK', disposition: 'generic-implicit' },
  dl: { area: 'RQ-BLK', disposition: 'generic-implicit' },
  dt: { area: 'RQ-BLK', disposition: 'generic-implicit' },
  dd: { area: 'RQ-BLK', disposition: 'generic-implicit' },
  abstract: { area: 'RQ-BLK', disposition: 'deferred-presentation' },
  glossary: { area: 'RQ-BLK', disposition: 'deferred-presentation' },
  'glossary-entry': { area: 'RQ-BLK', disposition: 'deferred-presentation' },
  'code-block': { area: 'RQ-BLK', disposition: 'deferred-presentation' },
  // RQ-INL (§7)
  em: { area: 'RQ-INL', disposition: 'specified' },
  strong: { area: 'RQ-INL', disposition: 'specified' },
  b: { area: 'RQ-INL', disposition: 'generic-implicit' },
  i: { area: 'RQ-INL', disposition: 'generic-implicit' },
  u: { area: 'RQ-INL', disposition: 'generic-implicit' },
  s: { area: 'RQ-INL', disposition: 'generic-implicit' },
  sub: { area: 'RQ-INL', disposition: 'generic-implicit' },
  sup: { area: 'RQ-INL', disposition: 'generic-implicit' },
  span: { area: 'RQ-INL', disposition: 'generic-implicit' },
  q: { area: 'RQ-INL', disposition: 'generic-implicit' },
  abbr: { area: 'RQ-INL', disposition: 'generic-implicit' },
  kbd: { area: 'RQ-INL', disposition: 'generic-implicit' },
  var: { area: 'RQ-INL', disposition: 'generic-implicit' },
  samp: { area: 'RQ-INL', disposition: 'generic-implicit' },
  output: { area: 'RQ-INL', disposition: 'generic-implicit' },
  code: { area: 'RQ-INL', disposition: 'generic-implicit' },
  term: { area: 'RQ-INL', disposition: 'deferred-presentation' },
  'inline-code': { area: 'RQ-INL', disposition: 'deferred-presentation' },
  // RQ-FRM (§8)
  fig: { area: 'RQ-FRM', disposition: 'specified' },
  figure: { area: 'RQ-FRM', disposition: 'specified' }, // HTML wrapper alias; canonical is fig
  img: { area: 'RQ-FRM', disposition: 'specified' },
  table: { area: 'RQ-FRM', disposition: 'specified' },
  csv: { area: 'RQ-FRM', disposition: 'specified' },
  tsv: { area: 'RQ-FRM', disposition: 'specified' },
  svg: { area: 'RQ-FRM', disposition: 'specified' },
  frame: { area: 'RQ-FRM', disposition: 'specified' },
  aside: { area: 'RQ-FRM', disposition: 'specified' },
  // RQ-DSL (§9)
  mermaid: { area: 'RQ-DSL', disposition: 'specified' },
  abc: { area: 'RQ-DSL', disposition: 'specified' },
  diagram: { area: 'RQ-DSL', disposition: 'specified' }, // live vocab; §9.2 → DSL sweep
  // RQ-MATH (§10)
  'inline-math': { area: 'RQ-MATH', disposition: 'specified' },
  'display-math': { area: 'RQ-MATH', disposition: 'specified' },
  math: { area: 'RQ-MATH', disposition: 'specified' },
  align: { area: 'RQ-MATH', disposition: 'specified' },
  cases: { area: 'RQ-MATH', disposition: 'specified' },
  matrix: { area: 'RQ-MATH', disposition: 'specified' },
  eqnarray: { area: 'RQ-MATH', disposition: 'specified' },
  // RQ-THM (§11)
  theorem: { area: 'RQ-THM', disposition: 'specified' },
  lemma: { area: 'RQ-THM', disposition: 'specified' },
  corollary: { area: 'RQ-THM', disposition: 'specified' },
  proposition: { area: 'RQ-THM', disposition: 'specified' },
  definition: { area: 'RQ-THM', disposition: 'specified' },
  example: { area: 'RQ-THM', disposition: 'specified' },
  remark: { area: 'RQ-THM', disposition: 'specified' },
  proof: { area: 'RQ-THM', disposition: 'specified' },
  // RQ-XREF (§12)
  ref: { area: 'RQ-XREF', disposition: 'specified' },
  cite: { area: 'RQ-XREF', disposition: 'specified' },
  a: { area: 'RQ-XREF', disposition: 'specified' },
  // RQ-NOTE (§13)
  note: { area: 'RQ-NOTE', disposition: 'specified' },
  'note-list': { area: 'RQ-NOTE', disposition: 'specified' },
  // RQ-BIB (§14)
  bibliography: { area: 'RQ-BIB', disposition: 'specified' },
  'bib-entry': { area: 'RQ-BIB', disposition: 'specified' }, // also no-output (dual; §4.3)
  // RQ-BOOK (§15)
  book: { area: 'RQ-BOOK', disposition: 'specified' },
  'book-front': { area: 'RQ-BOOK', disposition: 'specified' },
  'book-body': { area: 'RQ-BOOK', disposition: 'specified' },
  'book-back': { area: 'RQ-BOOK', disposition: 'specified' },
  'book-part': { area: 'RQ-BOOK', disposition: 'specified' },
  'book-title': { area: 'RQ-BOOK', disposition: 'specified' },
  'book-subtitle': { area: 'RQ-BOOK', disposition: 'specified' },
  'book-part-title': { area: 'RQ-BOOK', disposition: 'specified' },
  'book-part-subtitle': { area: 'RQ-BOOK', disposition: 'specified' },
};

// ── Tag-forms support, per element (tag-forms-reference.md) ───────────────────
// Each value is [pipe, slash, long] with markers ✓ (idiomatic) · (uncommon)
// — (unsupported). Elements absent here default to all '—' (treated generated).
export const FORMS = {
  article: ['·', '—', '✓'], book: ['·', '—', '✓'], 'book-part': ['·', '—', '✓'],
  'article-front': ['—', '—', '—'], 'article-body': ['—', '—', '—'], 'article-back': ['—', '—', '—'],
  'book-front': ['—', '—', '—'], 'book-body': ['—', '—', '—'], 'book-back': ['—', '—', '—'],
  section: ['✓', '—', '✓'], 'sub-section': ['✓', '—', '✓'], 'sub-sub-section': ['✓', '—', '✓'],
  'section-title': ['—', '—', '—'], 'section-subtitle': ['—', '—', '—'],
  'sub-section-title': ['—', '—', '—'], 'sub-section-subtitle': ['—', '—', '—'],
  'sub-sub-section-title': ['—', '—', '—'], 'sub-sub-section-subtitle': ['—', '—', '—'],
  'article-title': ['—', '—', '—'], 'article-subtitle': ['—', '—', '—'],
  'book-title': ['—', '—', '—'], 'book-subtitle': ['—', '—', '—'],
  'book-part-title': ['—', '—', '—'], 'book-part-subtitle': ['—', '—', '—'],
  p: ['✓', '—', '✓'], aside: ['✓', '—', '✓'], blockquote: ['✓', '—', '✓'],
  details: ['—', '—', '✓'], summary: ['✓', '—', '✓'], hr: ['—', '✓', '—'],
  note: ['✓', '—', '✓'], 'note-list': ['—', '—', '—'],
  glossary: ['—', '—', '✓'], 'glossary-entry': ['—', '—', '✓'],
  dl: ['—', '—', '✓'], dt: ['✓', '—', '✓'], dd: ['✓', '—', '✓'],
  ol: ['—', '—', '✓'], ul: ['—', '—', '✓'], li: ['✓', '—', '✓'],
  fig: ['✓', '✓', '✓'], svg: ['—', '—', '✓'], frame: ['✓', '—', '✓'],
  table: ['✓', '—', '✓'], csv: ['✓', '—', '✓'], tsv: ['✓', '—', '✓'],
  mermaid: ['✓', '—', '✓'], abc: ['✓', '—', '✓'], img: ['—', '✓', '—'],
  'inline-math': ['✓', '—', '—'], 'display-math': ['✓', '—', '—'],
  math: ['—', '—', '✓'], matrix: ['—', '—', '✓'], cases: ['—', '—', '✓'],
  align: ['—', '—', '✓'], eqnarray: ['—', '—', '✓'],
  'inline-code': ['✓', '—', '—'], code: ['✓', '—', '✓'], 'code-block': ['✓', '—', '✓'],
  a: ['✓', '—', '✓'], b: ['✓', '—', '✓'], i: ['✓', '—', '✓'], em: ['✓', '—', '✓'],
  strong: ['✓', '—', '✓'], u: ['✓', '—', '✓'], s: ['✓', '—', '✓'], sub: ['✓', '—', '✓'],
  sup: ['✓', '—', '✓'], span: ['✓', '—', '✓'], q: ['✓', '—', '✓'], abbr: ['✓', '—', '✓'],
  term: ['✓', '—', '✓'], kbd: ['✓', '—', '✓'], var: ['✓', '—', '✓'], samp: ['✓', '—', '✓'],
  output: ['✓', '—', '✓'],
  cite: ['✓', '✓', '·'], ref: ['·', '✓', '—'], bibliography: ['—', '—', '✓'], 'bib-entry': ['—', '—', '✓'],
  meta: ['—', '·', '✓'], author: ['—', '·', '✓'], config: ['—', '✓', '✓'], data: ['—', '—', '✓'], library: ['—', '✓', '—'],
  title: ['✓', '—', '✓'], subtitle: ['✓', '—', '✓'], name: ['✓', '—', '✓'],
  affiliation: ['✓', '—', '✓'], orcid: ['✓', '—', '✓'], email: ['✓', '—', '✓'],
  date: ['✓', '—', '✓'], 'publication-date': ['✓', '—', '✓'], doi: ['✓', '—', '✓'],
  license: ['✓', '—', '✓'], lang: ['✓', '—', '✓'], version: ['✓', '—', '✓'],
  keywords: ['✓', '—', '✓'], subject: ['✓', '—', '✓'], editor: ['✓', '—', '✓'], abstract: ['✓', '—', '✓'],
  theorem: ['✓', '—', '✓'], lemma: ['✓', '—', '✓'], corollary: ['✓', '—', '✓'],
  proposition: ['✓', '—', '✓'], definition: ['✓', '—', '✓'], example: ['✓', '—', '✓'],
  remark: ['✓', '—', '✓'], proof: ['✓', '—', '✓'],
};
export const FORM_NAMES = ['pipe', 'slash', 'long'];

// Generated / not-authored-directly: every element whose tag-forms row is all '—'.
// These get NO standalone fixture — they are annexed via their parent (§7.4).
export const GENERATED = Object.entries(FORMS)
  .filter(([, m]) => m.every((c) => c === '—'))
  .map(([k]) => k);

// ── Register expressibility, markdown half (idioms.md normalization table) ────
// canonical is universal; sigil is read live from tagname-sigil-map.js. This is
// the bare-markdown idiom → canonical enscribe node mapping.
export const IDIOMS = [
  { bare: '# Heading', tagname: 'section', note: 'depth-1 heading' },
  { bare: '## Heading', tagname: 'sub-section', note: 'depth-2 heading' },
  { bare: '### Heading', tagname: 'sub-sub-section', note: 'depth-3 heading' },
  { bare: '*emphasis*', tagname: 'i', note: 'visual italic, NOT em' },
  { bare: '**strong**', tagname: 'b', note: 'visual bold, NOT strong' },
  { bare: '~~struck~~', tagname: 's', note: 'strikethrough, NOT del' },
  { bare: '`code`', tagname: 'inline-code', note: 'opaque content' },
  { bare: '$x$', tagname: 'inline-math', note: 'opaque content' },
  { bare: '$$x$$', tagname: 'display-math', note: 'opaque content' },
  { bare: '| a | b |', tagname: 'table', note: 'GFM pipe table → <table md>' },
];
// Markdown-expressible elements (lift targets). autolink → a; image is NOT an
// idiom (renders literal) so img is excluded.
export const MARKDOWN_ELEMENTS = [...new Set(IDIOMS.map((i) => i.tagname)), 'a'];
// Canonical-only by decision (a coverage FACT, not a gap): em/strong are
// semantic (markdown stars map to visual i/b); u has no markdown idiom.
export const CANONICAL_ONLY_BY_DECISION = ['em', 'strong', 'u'];

// ── Render-quality predicates (render-quality.md §§3–15.5) ────────────────────
// kind: M (rendered markup) | S (stylesheet/CSS) | O (observable, visual-only).
// `asserts` is a one-line summary for the harness; the predicate id is the
// stable anchor a render-quality bug cites (render-quality.md §0.3).
export const PREDICATES = [
  // RQ-DOC
  { id: 'RQ-DOC-M1', area: 'RQ-DOC', kind: 'M', asserts: 'wrap in <article>; meta→article-front, body→article-body, back→article-back; empty regions suppressed' },
  { id: 'RQ-DOC-M2', area: 'RQ-DOC', kind: 'M', asserts: 'front meta has data-document-type=article; title=<article-title>, subtitle=<article-subtitle> inside meta' },
  { id: 'RQ-DOC-M3', area: 'RQ-DOC', kind: 'M', asserts: 'sections render <section>/<sub-section>/<sub-sub-section> by depth; first child is the matching *-title' },
  { id: 'RQ-DOC-S1', area: 'RQ-DOC', kind: 'S', asserts: 'article-front border-bottom; article-back border-top' },
  { id: 'RQ-DOC-S2', area: 'RQ-DOC', kind: 'S', asserts: 'article-title block/sans/--enscribe-h1-size/700; article-subtitle block/sans/h2/lighter/secondary' },
  { id: 'RQ-DOC-S3', area: 'RQ-DOC', kind: 'S', asserts: 'section titles block/sans/700, descending sizes h2/h3/h4' },
  { id: 'RQ-DOC-S4', area: 'RQ-DOC', kind: 'S', asserts: 'meta[data-document-type] is display:contents' },
  // RQ-META
  { id: 'RQ-META-M1', area: 'RQ-META', kind: 'M', asserts: 'each author renders <author>; multiple are sibling <author> in <meta>' },
  { id: 'RQ-META-M2', area: 'RQ-META', kind: 'M', asserts: '+corresponding normalizes to bare boolean corresponding attr on <author>' },
  { id: 'RQ-META-M3', area: 'RQ-META', kind: 'M', asserts: 'meta/config/data/library emit no body output; meta display:contents, others render null' },
  { id: 'RQ-META-S1', area: 'RQ-META', kind: 'S', asserts: 'author display:inline/sans/secondary; author+author::before content=", "' },
  // RQ-BLK
  { id: 'RQ-BLK-M1', area: 'RQ-BLK', kind: 'M', asserts: 'p<p>; blockquote<blockquote> (quote expands); lists ol/ul>li; hr<hr>; data-*-type preserved' },
  { id: 'RQ-BLK-M2', area: 'RQ-BLK', kind: 'M', asserts: 'details/summary/dl/dt/dd pass through as same HTML tag, data-* preserved' },
  { id: 'RQ-BLK-S1', area: 'RQ-BLK', kind: 'S', asserts: 'blockquote border-left, italic body, secondary, horizontal inset' },
  { id: 'RQ-BLK-S2', area: 'RQ-BLK', kind: 'S', asserts: 'p margin-bottom; lists padding-left' },
  // RQ-INL
  { id: 'RQ-INL-M1', area: 'RQ-INL', kind: 'M', asserts: 'emphasis<em>, strong<strong>; HTML-native inline set passes through' },
  { id: 'RQ-INL-M2', area: 'RQ-INL', kind: 'M', asserts: 'b/i/u/s/sub/sup/span/q/abbr/kbd/var/samp/output/code pass through; data-* preserved; code monospace-styled' },
  { id: 'RQ-INL-S1', area: 'RQ-INL', kind: 'S', asserts: 'strong font-weight:700; em font-style:italic' },
  // RQ-FRM
  { id: 'RQ-FRM-M1', area: 'RQ-FRM', kind: 'M', asserts: 'figure→<figure> wrapping optional <img src alt> + <figcaption>; numbered caption starts <span class="figure-label">Figure N.</span>' },
  { id: 'RQ-FRM-M2', area: 'RQ-FRM', kind: 'M', asserts: 'table→<table> with <caption>; numbered caption <span class="table-label">Table N.</span>; thead/th, tbody/td; csv/tsv → real <table>' },
  { id: 'RQ-FRM-M3', area: 'RQ-FRM', kind: 'M', asserts: 'svg→inline <svg> source preserved; bare emits <svg> alone; captioned wraps in <figure> with figure-label' },
  { id: 'RQ-FRM-M4', area: 'RQ-FRM', kind: 'M', asserts: 'frame→<figure class="frameable-border">; title→<figcaption class="title">; caption→<figcaption>' },
  { id: 'RQ-FRM-M5', area: 'RQ-FRM', kind: 'M', asserts: '+border adds frameable-border class; figures/tables share counter with DSLs and svg' },
  { id: 'RQ-FRM-M6', area: 'RQ-FRM', kind: 'M', asserts: 'title is first child class="title"; caption last child (figure/box); table caption first child caption-side:top' },
  { id: 'RQ-FRM-M7', area: 'RQ-FRM', kind: 'M', asserts: 'numbered-uncaptioned renders label span alone; neither numbered nor captioned → no caption element' },
  { id: 'RQ-FRM-M8', area: 'RQ-FRM', kind: 'M', asserts: 'figure with src: <img> alt from fallback chain (alt= → caption text → body text); <img> always has alt' },
  { id: 'RQ-FRM-M9', area: 'RQ-FRM', kind: 'M', asserts: 'fig/frame always wrap; table/csv/tsv always <table>; svg/mermaid/abc wrap only when captioned/titled/numbered' },
  { id: 'RQ-FRM-M10', area: 'RQ-FRM', kind: 'M', asserts: 'aside keeps <aside>; title <p class="title">, caption <p class="caption">; +border default on; numbered uses box counter; type→data-aside-type' },
  { id: 'RQ-FRM-S1', area: 'RQ-FRM', kind: 'S', asserts: '.figure-label and .table-label font-weight:700' },
  { id: 'RQ-FRM-S2', area: 'RQ-FRM', kind: 'S', asserts: 'figure block/centred/vertical-margin; figcaption/caption small/secondary/left' },
  { id: 'RQ-FRM-S3', area: 'RQ-FRM', kind: 'S', asserts: 'table border-collapse/full-width; th/td bordered; th header-styled; thead th heavier bottom border' },
  { id: 'RQ-FRM-S4', area: 'RQ-FRM', kind: 'S', asserts: '.frameable-border visible outline box (border)' },
  { id: 'RQ-FRM-S5', area: 'RQ-FRM', kind: 'S', asserts: '.title font-weight:700, body-size, primary colour, bottom margin' },
  { id: 'RQ-FRM-S6', area: 'RQ-FRM', kind: 'S', asserts: '.caption small size + secondary colour (boxed-prose bottom caption)' },
  { id: 'RQ-FRM-S7', area: 'RQ-FRM', kind: 'S', asserts: 'callouts: per-type accent border-left-color + tint + ::before icon; colour never sole distinguisher' },
  // RQ-DSL
  { id: 'RQ-DSL-M1', area: 'RQ-DSL', kind: 'M', asserts: 'mermaid→<pre class="mermaid" data-enscribe-dsl="mermaid"> source verbatim' },
  { id: 'RQ-DSL-M2', area: 'RQ-DSL', kind: 'M', asserts: 'abc→<pre class="abc" data-enscribe-dsl="abc"> source verbatim' },
  { id: 'RQ-DSL-M3', area: 'RQ-DSL', kind: 'M', asserts: 'both share figure counter; captioned → sibling <figcaption> with figure-label' },
  { id: 'RQ-DSL-SKIP-M1', area: 'RQ-DSL', kind: 'M', asserts: 'skip mode: contract markup only, no library nodes/init/SVG' },
  { id: 'RQ-DSL-LIVE-M1', area: 'RQ-DSL', kind: 'M', asserts: 'live mode: present DSL gets library (inline or src) + init; absent DSL gets nothing' },
  { id: 'RQ-DSL-LIVE-M2', area: 'RQ-DSL', kind: 'M', asserts: 'live mode: contract markup preserved alongside emitted assets' },
  { id: 'RQ-DSL-LIVE-O1', area: 'RQ-DSL', kind: 'O', asserts: 'observable: in browser with library, sources render to SVG' },
  { id: 'RQ-DSL-STATIC-M1', area: 'RQ-DSL', kind: 'M', asserts: 'abc-static: contract replaced by inline <svg class="enscribe-abc-rendered">; no <pre class="abc">/library/init survive' },
  { id: 'RQ-DSL-STATIC-M2', area: 'RQ-DSL', kind: 'M', asserts: 'abc-static: id carried onto rendered <svg>; anonymous block has no id' },
  { id: 'RQ-DSL-STATIC-O1', area: 'RQ-DSL', kind: 'O', asserts: 'observable: <svg> shows rendered notation offline/JS-disabled' },
  { id: 'RQ-DSL-S1', area: 'RQ-DSL', kind: 'S', asserts: 'mermaid <pre> styled as code block (graceful degradation)' },
  { id: 'RQ-DSL-SOURCE-M1', area: 'RQ-DSL', kind: 'M', asserts: 'show-source: final sibling <details class="enscribe-source"> with "See source" summary + verbatim <pre>; default off byte-identical' },
  { id: 'RQ-DSL-SOURCE-S1', area: 'RQ-DSL', kind: 'S', asserts: 'default theme styles the source disclosure (summary button-like, pre code-block)' },
  // RQ-MATH
  { id: 'RQ-MATH-M1', area: 'RQ-MATH', kind: 'M', asserts: 'inline math→<inline-math> wrapping KaTeX (.katex); never numbered' },
  { id: 'RQ-MATH-M2', area: 'RQ-MATH', kind: 'M', asserts: 'display math→<display-math> wrapping .katex-display; numbered → sibling <span class="equation-number">(N)</span>' },
  { id: 'RQ-MATH-M3', area: 'RQ-MATH', kind: 'M', asserts: 'env tags render own wrapper (<align>/<cases>/<matrix>/<eqnarray>/<math>) around KaTeX' },
  { id: 'RQ-MATH-M4', area: 'RQ-MATH', kind: 'M', asserts: 'output is KaTeX HTML not raw TeX; throwOnError:false → error node not raw source' },
  { id: 'RQ-MATH-S1', area: 'RQ-MATH', kind: 'S', asserts: 'display-math flex+vmargin; .katex-display flex:1; .equation-number flush-right/sans/small/secondary' },
  { id: 'RQ-MATH-S2', area: 'RQ-MATH', kind: 'S', asserts: 'inline-math display:inline' },
  { id: 'RQ-MATH-S3', area: 'RQ-MATH', kind: 'S', asserts: 'env wrappers display blocks + vmargin; equation-number flush-right consistently (intended standard)' },
  // RQ-THM
  { id: 'RQ-THM-M1', area: 'RQ-THM', kind: 'M', asserts: 'each statement own element; first child <span class="{kind}-label"> + space + body' },
  { id: 'RQ-THM-M2', area: 'RQ-THM', kind: 'M', asserts: 'label "Kind N." / "Kind N (Name)." / "Kind."; propositional family shares counter; definition/example own; remark/proof unnumbered unless +numbered' },
  { id: 'RQ-THM-S1', area: 'RQ-THM', kind: 'S', asserts: 'theorem-family elements display:block + vmargin' },
  { id: 'RQ-THM-S2', area: 'RQ-THM', kind: 'S', asserts: '.{kind}-label font-weight:700' },
  // RQ-XREF
  { id: 'RQ-XREF-M1', area: 'RQ-XREF', kind: 'M', asserts: 'resolved ref→<a href="#id" class="ref">TEXT</a>; -link→<span class="ref">TEXT</span>' },
  { id: 'RQ-XREF-M2', area: 'RQ-XREF', kind: 'M', asserts: 'ref text "{prefix} {number}" (figure 3, equation 1, ...); unknown prefix bare number; prefix config-overridable; book chapter-prefixed' },
  { id: 'RQ-XREF-M3', area: 'RQ-XREF', kind: 'M', asserts: 'unresolved ref→<a href="#id" class="ref-error">??ref: id??</a>' },
  { id: 'RQ-XREF-M4', area: 'RQ-XREF', kind: 'M', asserts: 'resolved cite→<cite class="cite" data-keys>; unresolved→<cite class="cite-error" data-keys>??cite: key??</cite>' },
  { id: 'RQ-XREF-S1', area: 'RQ-XREF', kind: 'S', asserts: 'a.ref link colour no wavy underline; a.ref-error error colour wavy underline cursor:help' },
  { id: 'RQ-XREF-S2', area: 'RQ-XREF', kind: 'S', asserts: 'cite.cite cursor:pointer; cite.cite-error error colour' },
  // RQ-NOTE
  { id: 'RQ-NOTE-M1', area: 'RQ-NOTE', kind: 'M', asserts: 'in-text note→<sup id="noteref-N" data-note-id="note-N"><a href="#note-N">N</a></sup>' },
  { id: 'RQ-NOTE-M2', area: 'RQ-NOTE', kind: 'M', asserts: 'collected notes→<note-list> with <ol> in back-matter; class endnotes/footnotes/notes by placement' },
  { id: 'RQ-NOTE-M3', area: 'RQ-NOTE', kind: 'M', asserts: 'each note <li id="note-N"> with <sup>N</sup>, body, backref <a class="note-backref">↩</a>; side adds sidenote-fallback' },
  { id: 'RQ-NOTE-S1', area: 'RQ-NOTE', kind: 'S', asserts: 'note-list block/small/secondary/top-border; ::before content "Notes"; ol list-style none; li hanging indent' },
  { id: 'RQ-NOTE-S2', area: 'RQ-NOTE', kind: 'S', asserts: 'sup[data-note-id] small sans superscript link colour cursor:pointer; .note-backref muted' },
  // RQ-BIB
  { id: 'RQ-BIB-M1', area: 'RQ-BIB', kind: 'M', asserts: 'bibliography→<bibliography> in back-matter with heading + <div class="csl-bib-body"> of <div class="csl-entry">' },
  { id: 'RQ-BIB-M2', area: 'RQ-BIB', kind: 'M', asserts: 'bibliography heading emitted element <h2>References</h2>' },
  { id: 'RQ-BIB-M3', area: 'RQ-BIB', kind: 'M', asserts: 'each entry div carries data-csl-entry-id=KEY and id=ref-KEY' },
  { id: 'RQ-BIB-M4', area: 'RQ-BIB', kind: 'M', asserts: 'no resolved citations → no bibliography emitted; author-placed <bibliography> removed' },
  { id: 'RQ-BIB-S1', area: 'RQ-BIB', kind: 'S', asserts: 'bibliography h2 sans/h3-size/700; .csl-bib-body small; .csl-entry hanging indent + spacing' },
  // RQ-BOOK
  { id: 'RQ-BOOK-M1', area: 'RQ-BOOK', kind: 'M', asserts: 'book→<book> wrapping book-front/body/back; book-part routed by book-part-type' },
  { id: 'RQ-BOOK-M2', area: 'RQ-BOOK', kind: 'M', asserts: 'book title <book-title>; each book-part title <book-part-title> in synthesised per-part <meta>' },
  { id: 'RQ-BOOK-M3', area: 'RQ-BOOK', kind: 'M', asserts: 'edited-volume: <author> at top of book-part absorbed into that part meta, distinct from book author' },
  { id: 'RQ-BOOK-M4', area: 'RQ-BOOK', kind: 'M', asserts: 'scoped numbering: per-chapter renumber; resolved xref chapter-prefixed; target label agrees in HTML and JATS' },
  { id: 'RQ-BOOK-M5', area: 'RQ-BOOK', kind: 'M', asserts: 'note-scope=chapter: footnotes collected per chapter' },
  { id: 'RQ-BOOK-M6', area: 'RQ-BOOK', kind: 'M', asserts: 'single document-wide bibliography at end of book-back' },
  { id: 'RQ-BOOK-S1', area: 'RQ-BOOK', kind: 'S', asserts: 'book-title most prominent; book-part-title chapter-level; regions block (intended standard)' },
  // RQ-TOC
  { id: 'RQ-TOC-M1', area: 'RQ-TOC', kind: 'M', asserts: 'ToC doc carries <nav class="enscribe-toc"> with nested entries; sections carry matching id' },
  { id: 'RQ-TOC-M2', area: 'RQ-TOC', kind: 'M', asserts: 'ToC doc carries scroll-spy <script>; active state runtime; non-ToC doc has neither' },
  { id: 'RQ-TOC-S1', area: 'RQ-TOC', kind: 'S', asserts: 'theme styles scroll-spy active (a[aria-current]/.enscribe-toc-active) + trail' },
];

// Areas in coverage-map order, with the human label.
export const AREAS = [
  ['RQ-DOC', 'Document structure (article)'],
  ['RQ-META', 'Author and meta blocks'],
  ['RQ-BLK', 'Block prose'],
  ['RQ-INL', 'Inline prose'],
  ['RQ-FRM', 'Frameables'],
  ['RQ-DSL', 'External DSLs'],
  ['RQ-MATH', 'Math'],
  ['RQ-THM', 'Theorem family'],
  ['RQ-XREF', 'Cross-references and citations'],
  ['RQ-NOTE', 'Footnotes'],
  ['RQ-BIB', 'Bibliography'],
  ['RQ-BOOK', 'Book documents'],
  ['RQ-TOC', 'Table-of-contents sidebar'],
];
