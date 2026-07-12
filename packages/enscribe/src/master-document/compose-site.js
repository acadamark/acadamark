// The browser-pure website COMPOSITION core (the live #300, step 1 — #324).
//
// This is `notes/specs/website.md` Phase 1, lifted verbatim out of the CLI's static-website.js so BOTH
// surfaces compose a site the same way: number each page in its OWN native scope (an article as an
// article via the pipeline; a book as a book via the injected assembleAndNumber + prepareBook), harvest
// each page's cross-ref registry, and MERGE every anchor into ONE site registry
// `anchor → { native number, owner, title, type }`. It returns those merge maps plus the
// makeReadThroughRegistry SEED that Phase 2 pre-seeds per page (own numbering shadows; a cross-page
// anchor reads through to the merge for its target's NATIVE number). NOTHING is flattened.
//
// BROWSER-PURE BY CONSTRUCTION (the point of the extraction — a guard locks it; see
// test/compose-site-browser-pure.test.js). It imports **no `node:*`**: the two environment bindings are
// INJECTED, not imported —
//   • `assembleAndNumber` — assemble a book master's `<chapter src>` children + number it. This is the ONE
//     I/O-bearing step (it reads child sources): the static caller passes its readFileSync-based
//     `render-document.js` one; a later live caller passes a fetch-based one (browser.js already
//     fetch-assembles a multi-file book). Injecting it keeps the Node fs out of this module AND avoids a
//     second copy of the assemble+number logic (§2).
//   • `buildPipeline(pipeOpts) → proc` — the engine constructor, supplied by the caller (the static side's
//     buildDocumentPipeline; the live side's configured pipeline). Pure (no I/O), injected so this module
//     stays decoupled from the engine entry and its import graph stays a small, walkable, browser-pure set.
// The article branch needs no I/O (its source is in hand), so the core owns it outright.
//
// Sibling to live-website.js / publish-pages.js (browser-pure by design); the static-website.js Node/fs +
// dir-per-page WRITE side stays in the CLI. The URL scheme is the caller's `destPrefixOf` hook — the one
// legitimate output difference between static (`.html` paths) and live (`?page=` routes), per website.md.

import { VFile } from 'vfile';
import { prepareBook } from './publish-pages.js';
import { harvestCrossRefRegistry } from '../interpreter/lib/cross-ref-registry.js';
import { makeReadThroughRegistry } from '../core/registry.js';
import { ENSCRIBE_REGISTRY } from '../core/file-data-keys.js';

/**
 * Number every page in its native scope, harvest, and merge into one site cross-ref registry; build the
 * read-through seed Phase 2 consumes. (website.md "Phase 1 — number natively, harvest, merge.")
 *
 * @param {object} o
 * @param {Array<{ resolved: { sourcePath: string, pageDir: string }, source: string, slug: string, isBook: boolean }>} o.pages
 *   the resolved pages, in nav order. `resolved.sourcePath`/`pageDir` are opaque to this module (a filesystem
 *   path statically, a fetch key/URL live) — passed through to the pipeline (assetsDir / VFile path) and the
 *   injected assembleAndNumber.
 * @param {(slug: string) => string} o.destPrefixOf  the URL-scheme hook: slug → its output dir prefix
 *   (`''` for the home page). The owner→URL map is built from it; the scheme is the caller's (static vs live).
 * @param {(pipeOpts: object) => { parse: Function, runSync: Function }} o.buildPipeline  the engine constructor.
 * @param {(args: { source: string, sourcePath: string, masterDir: string, warn: Function, pipeOpts: object })
 *   => { numbered: object, file: object }} o.assembleAndNumber  the injected book assemble+number (the I/O step).
 * @param {(message: string) => void} o.warn  diagnostic sink (the static build collects these into `warnings`).
 * @returns {{ siteHarvest: Map, idToOwner: Map, ownerToUrl: Map, bookFnameOwner: Map, seedRegistry: () => object }}
 *   siteHarvest: anchor → { number(native), title, type } (backs the read-through, the ref TEXT);
 *   idToOwner: anchor → ownerKey (the page/chapter-page that OWNS it, for the href);
 *   ownerToUrl: ownerKey → site-relative URL; bookFnameOwner: a chapter-page outPath → its ownerKey;
 *   seedRegistry: () => fresh VFile.data seeding a read-through over the merged registry (one per render).
 */
export function composeSiteRegistry({ pages, destPrefixOf, buildPipeline, assembleAndNumber, warn }) {
  const siteHarvest = new Map();
  const idToOwner = new Map();
  const ownerToUrl = new Map();
  const bookFnameOwner = new Map();

  for (const { resolved, source, tree, slug, isBook } of pages) {
    const destPrefix = destPrefixOf(slug);
    try {
      if (isBook) {
        const { numbered, file } = assembleAndNumber({
          source, sourcePath: resolved.sourcePath, masterDir: resolved.pageDir,
          warn: (m) => warn(`page "${slug}": ${m}`), pipeOpts: { assetsDir: resolved.pageDir },
        });
        // prepareBook assigns chapter <book-part> ids + harvests + maps chapter-id → its `<stem>.html`,
        // WITHOUT rendering. Tag every anchor with the CHAPTER-PAGE it renders on, not one book slug.
        const { registry: harvest, idToUrl } = prepareBook(numbered, file);
        for (const [anchor, e] of harvest) {
          siteHarvest.set(anchor, { number: e.number, title: e.title, type: e.type });
          const fname = e.chapter != null ? idToUrl.get(e.chapter) : null;
          const owner = `${slug}::${fname ?? 'index.html'}`;
          idToOwner.set(anchor, owner);
          ownerToUrl.set(owner, `${destPrefix}${fname ?? 'index.html'}`);
          if (fname) bookFnameOwner.set(`${destPrefix}${fname}`, owner);
        }
      } else {
        const proc = buildPipeline({ assetsDir: resolved.pageDir });
        const file = new VFile({ path: resolved.sourcePath });
        // #417: an inline `<item | Title>` page carries a pre-parsed body tree (no source file); a
        // normal external page carries source. Either numbers natively in its own article scope — the
        // composition MODEL (number-per-page, merge, never flatten) is unchanged, only the input shape.
        const numbered = proc.runSync(tree ?? proc.parse(source), file);   // number only — no render
        ownerToUrl.set(slug, destPrefix);                          // the article's pretty URL ('' = root)
        for (const [anchor, e] of harvestCrossRefRegistry(numbered, file)) {
          siteHarvest.set(anchor, { number: e.number, title: e.title, type: e.type });
          idToOwner.set(anchor, slug);
        }
      }
    } catch (err) {
      warn(`page "${slug}" failed to number for the site registry: ${err.message}`);
    }
  }

  // The read-through PARENT — a page's own numbering shadows; a CROSS-page anchor reads through to here for
  // its target's NATIVE number. `number` is the harvested native-number string and `scope: undefined` makes
  // formatScopedNumber return it verbatim; `title` is the unnumbered-target fallback. (findByLabel is the
  // only method a read-through calls on its parent.)
  const siteParent = {
    findByLabel: (id) => {
      const e = siteHarvest.get(id);
      return e ? { number: e.number, type: e.type, data: { title: e.title, scope: undefined } } : null;
    },
  };
  // A FRESH read-through per render, so the page's own numbering writes locally and only cross-page lookups
  // fall through to the merged site registry.
  const seedRegistry = () => ({ [ENSCRIBE_REGISTRY]: makeReadThroughRegistry(siteParent) });

  return { siteHarvest, idToOwner, ownerToUrl, bookFnameOwner, seedRegistry };
}
