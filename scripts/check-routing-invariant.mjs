// The routing-invariant gate (#404) — the projection layer's analogue of the boundary and freshness
// guards (website.md §"The routing invariant": "the check is the projection layer's analogue of the
// boundary and freshness guards"). A POST-BUILD guard, not a build-time assertion: it builds a corpus
// of multi-page projections to a temp dir and checks the machine-checkable shape the spec names —
//
//   every id in the assembled document appears on exactly one emitted page;
//   every emitted href either resolves to an existing anchor or routes to the not-found view.
//
// WHY a standalone guard (the fit-check the slice was asked to make): the spec itself frames this as
// the sibling of check-boundary / check-examples-fresh / check-docs-fresh — an independent, auditable
// gate over EMITTED OUTPUT, wired into the root `test` script. A build-time assertion would run inside
// every build, coupling the invariant to the build path and firing on partial/aborted builds; a
// post-build guard checks the finished artifact once, the same shape the house guards use.
//
// SCOPE: the check targets NAVIGATION references — `<a class="ref" …>` cross-reference links (what the
// #404 dead-link class is about) and their in-page/cross-page hrefs — NOT every href. Authored demo
// content and code examples in the docs (e.g. a minipage that renders `<a href="#section-2">` to
// illustrate a link, or a `href="#…"` inside a code block) are deliberately excluded: they are content,
// not routing output, and a `ref-error`-marked anchor is the visible-degrade the always-render policy
// already ships (exempt here). Requires the CLI + built engine; fails LOUD if a build fails — never
// skip-and-stay-green.

import { readFileSync, readdirSync, rmSync, mkdtempSync, existsSync } from 'node:fs';
import { join, dirname, relative, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'packages/cli/bin/enscribe.js');
const NOT_FOUND_SLUG = 'not-found'; // kept in sync with live-website.js NOT_FOUND_SLUG

// The corpus — "the docs site build and the book fixtures" (the slice's stated targets). Each is ONE
// multi-page projection. `book` builds apply the extra id-uniqueness clause (a book is one assembled
// document, so a cross-ref anchor must render on exactly one chapter page); a website is a composition
// of independent page-documents, so uniqueness is per-page (HTML-guaranteed) and only the cross-page
// href-resolution clause applies site-wide.
const CORPUS = [
  { master: 'docs-source/index.emd', label: 'docs site (website)', kind: 'website' },
  { master: 'test/routing-invariant/book-front-ref/master.emd', label: 'front-ref book (front-region cross-ref → cover)', kind: 'book' },
  { master: 'packages/cli/test/fixtures/book.emd', label: 'book fixture', kind: 'book' },
  // #424: a separate-pages book whose interlude arrives via <include> — ownership flows
  // through splices (the interlude's anchors are the preceding chapter's), so the invariant
  // holds over transcluded content exactly as over typed content.
  { master: 'test/routing-invariant/include-interlude/master.emd', label: 'interlude-via-include book', kind: 'book' },
  // #405: the DEGRADED corpus entry — a website with one unresolvable nav page. The build must
  // SUCCEED (per-item visible degrade: the failed page ships the failed-page view at its own
  // address) and every emitted href must still resolve — the invariant holding THROUGH failure
  // is the point of the degrade design, so it is gated permanently.
  { master: 'test/routing-invariant/degraded-website/index.emd', label: 'degraded website (one failed page)', kind: 'website' },
  // #433: a website whose book <item src> carries a TRAILING interstitial (a figure), cross-referenced
  // from another page. The interstitial splices into the book's last chapter (deepest-open-container); its
  // id must be OWNED by that chapter's emitted page so the inbound cross-page <ref> resolves — which makes
  // this corpus BITE on ownership (a stranded interstitial anchor would dangle the ref and fail the gate).
  { master: 'test/routing-invariant/website-book-interstitial/index.emd', label: 'website book-item interstitial (→ last chapter, cross-page ref)', kind: 'website' },
];

function htmlFiles(dir) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) out.push(p);
    }
  })(dir);
  return out;
}

const COLON_ID = /^[a-z][\w-]*:[\w:-]+$/i; // a cross-reference anchor id (type:name), e.g. eqn:loose, fig:x

// Every id="…" a page emits.
function idsOf(html) {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
}

// Code blocks/spans render literal HTML examples (a docs page showing `<a class="ref" href="#…">` to
// illustrate the ref element, or a JSDoc comment in a `<pre>` sample). Those are CONTENT, not routing
// output, so strip `<pre>` and inline `<code>` regions before scanning for navigation refs — otherwise
// the gate false-positives on documentation that demonstrates the very syntax it checks.
// `<script>` regions are the same class (#405): an inlined asset's JSDoc comments — the
// hover-preview asset documents `<a class="ref" href="#...">` literally — and the embedded
// diagnostics recap both carry ref-shaped TEXT that is not routing output.
const stripCode = (html) => html
  .replace(/<pre\b[\s\S]*?<\/pre>/gi, '')
  .replace(/<code\b[\s\S]*?<\/code>/gi, '')
  .replace(/<script\b[\s\S]*?<\/script>/gi, '');

// Every NAVIGATION ref anchor: an <a …> whose class word-set includes `ref` but NOT `ref-error` (the
// latter is the intentional visible-degrade), carrying an href. Returns [{ href }]. Attribute order is
// arbitrary, so parse the open tag's attributes rather than assuming a fixed layout.
function navRefs(html) {
  const refs = [];
  for (const m of stripCode(html).matchAll(/<a\s([^>]*)>/g)) {
    const attrs = m[1];
    const cls = /\bclass="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const classes = cls.split(/\s+/);
    if (!classes.includes('ref') || classes.includes('ref-error')) continue;
    const href = /\bhref="([^"]*)"/.exec(attrs)?.[1];
    if (href != null) refs.push({ href });
  }
  return refs;
}

const isExternal = (href) => /^(https?:|mailto:|\?|\/\/)/.test(href);
// The not-found route is a page link whose FINAL path segment is NOT_FOUND_SLUG (e.g. `../not-found/`).
// Match the final segment, not any segment — otherwise a genuinely dead ref to an author page that
// merely lives under a `not-found/…` path would be wrongly exempted (a false negative). NOT_FOUND_SLUG
// is also reserved in the builder, so no author page can occupy it.
const routesToNotFound = (href) => {
  const segs = href.split('#')[0].split('/').filter(Boolean);
  return segs.length > 0 && segs[segs.length - 1] === NOT_FOUND_SLUG;
};

function checkBuild(dir, kind) {
  const violations = [];
  const files = htmlFiles(dir);
  const idsByRel = new Map();
  for (const f of files) idsByRel.set(relative(dir, f), idsOf(readFileSync(f, 'utf8')));

  // Clause 1 (book only): each cross-reference anchor id appears on exactly one emitted page.
  if (kind === 'book') {
    const pagesById = new Map();
    for (const [rel, ids] of idsByRel) {
      for (const id of ids) {
        if (!COLON_ID.test(id)) continue;
        if (!pagesById.has(id)) pagesById.set(id, []);
        pagesById.get(id).push(rel);
      }
    }
    for (const [id, pages] of pagesById) {
      if (pages.length > 1) {
        violations.push(`id "${id}" appears on ${pages.length} emitted pages (${pages.join(', ')}) — ownership must be exactly one page`);
      }
    }
  }

  // Clause 2 (all): every emitted navigation ref href resolves to an existing anchor on its target page,
  // or routes to the not-found view.
  for (const [rel, ids] of idsByRel) {
    for (const { href } of navRefs(readFileSync(join(dir, rel), 'utf8'))) {
      if (isExternal(href) || routesToNotFound(href)) continue;
      const [path, anchor] = href.split('#');
      if (!anchor) continue; // a bare page link (no anchor) — the slug-link layer's concern, not a ref
      if (path === '') {
        // in-page anchor — must exist on THIS page
        if (!ids.has(anchor)) violations.push(`${rel}: in-page ref "#${anchor}" — no such anchor on this page (dead link)`);
      } else {
        // cross-page anchor — resolve the target file relative to this page's dir; anchor must exist there
        const target = normalize(join(dirname(rel), path.endsWith('/') ? `${path}index.html` : path));
        const targetIds = idsByRel.get(target);
        if (!targetIds) violations.push(`${rel}: cross-page ref "${href}" — target page "${target}" was not emitted`);
        else if (!targetIds.has(anchor)) violations.push(`${rel}: cross-page ref "${href}" — anchor "${anchor}" is not on "${target}" (dead link)`);
      }
    }
  }
  return violations;
}

let failed = false;
for (const { master, label, kind } of CORPUS) {
  const masterPath = join(ROOT, master);
  if (!existsSync(masterPath)) {
    console.error(`[routing-invariant] MISSING corpus master: ${master}`);
    failed = true;
    continue;
  }
  const out = mkdtempSync(join(tmpdir(), 'enscribe-routing-'));
  try {
    const r = spawnSync(process.execPath, [CLI, 'build', masterPath, '-o', out], { encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(`[routing-invariant] build FAILED for ${label} (${master}):`);
      console.error(r.stderr || r.stdout);
      failed = true;
      continue;
    }
    const violations = checkBuild(out, kind);
    if (violations.length > 0) {
      failed = true;
      console.error(`\n[routing-invariant] ✗ ${label} — ${violations.length} violation(s):`);
      for (const v of violations) console.error(`    ${v}`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

if (failed) {
  console.error('\n[routing-invariant] FAILED — the routing invariant does not hold (website.md §"The routing invariant").');
  console.error('  Every cross-reference must resolve to an existing anchor on its owning emitted page, or route');
  console.error('  to the not-found view. A dead in-page/cross-page ref means page ownership is not total (#404).');
  process.exit(1);
}
// Quiet success — mirrors check-boundary / check-examples-fresh / check-docs-fresh.
