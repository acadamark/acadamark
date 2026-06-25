// docs-site — write the generated `.emd` sources from the vocab source (#223 / #246 / #241).
//
// Run by `docs:gen` BEFORE `docs:build` / `docs:build-live`, so build.js (static) and the live website
// type both read the generated `.emd` as ordinary pages — one generated source, both targets. The output
// is build product (regenerated from `layer1-vocabulary/elements/*.md`), gitignored like `dist`/`dist-live`.
//
// Two kinds of generated `.emd`:
//   • the two Documentation catalogs — FULLY generated (`buildLayer1Catalog` / `buildShorthandCatalog`).
//   • the two Vocabulary intros — authored `.template.emd` PROSE with the generated featured examples
//     injected at the `FEATUREDEXAMPLES` marker (`buildFeaturedIntro`). The intro prose is editorial and
//     stays hand-authored; only the example block is generated, so it single-sources with the catalogs.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLayer1Catalog, buildShorthandCatalog, buildFeaturedIntro, buildConfigOptionsEmd } from './gen-reference.js';

const SOURCES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'sources');

// 1) The two Documentation catalogs — fully generated `.emd`.
const l1 = buildLayer1Catalog();
const sh = buildShorthandCatalog();
writeFileSync(join(SOURCES_DIR, 'layer1-catalog.emd'), l1.emd);
writeFileSync(join(SOURCES_DIR, 'shorthand-catalog.emd'), sh.emd);

// 2) The authored templates with a generated block injected at a marker — the two Vocabulary intros (the
// featured examples) and the Rendering guide (the <config> options grid). The served `.emd` (read by build.js
// AND by site.emd's live website type) is build product, gitignored like the catalogs. A FUNCTION replacement
// (not a string) keeps a `$` in the generated content (math `<$ … $>`, etc.) from being misread as a
// replacement pattern; each injection FAILS LOUD if its marker is missing.
const FEATURED = /^FEATUREDEXAMPLES[ \t]*$/m;
const CONFIGGRID = /^CONFIGOPTIONSGRID[ \t]*$/m;
const INJECTED = [
  { template: 'enscribe-shorthand.template.emd', out: 'enscribe-shorthand.emd', marker: FEATURED,  generate: () => buildFeaturedIntro('shorthand'), label: 'shorthand intro' },
  { template: 'layer1.template.emd',             out: 'layer1.emd',             marker: FEATURED,  generate: () => buildFeaturedIntro('layer1'),    label: 'layer1 intro' },
  { template: 'rendering-guide.template.emd',    out: 'rendering-guide.emd',    marker: CONFIGGRID, generate: () => buildConfigOptionsEmd().emd,     label: 'rendering guide' },
];
const injectedStats = [];
for (const { template, out, marker, generate, label } of INJECTED) {
  const tpl = readFileSync(join(SOURCES_DIR, template), 'utf8');
  if (!marker.test(tpl)) {
    throw new Error(`[docs:gen] ${template}: missing injection marker — the page would render no generated block.`);
  }
  writeFileSync(join(SOURCES_DIR, out), tpl.replace(marker, () => generate()));
  injectedStats.push(`${out} (${label})`);
}

console.log(
  `[docs:gen] wrote sources/layer1-catalog.emd (${l1.stats.canonical} canonical elements) + ` +
  `sources/shorthand-catalog.emd (${sh.stats.shorthands} shorthands) + injected: ${injectedStats.join(', ')}`,
);
