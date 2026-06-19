// docs-site — write the generated Documentation catalog `.emd` from the vocab source (#223 / #246).
//
// Run by `docs:gen` BEFORE `docs:build` / `docs:build-live`, so build.js (static) and the live website
// type both read the catalogs as ordinary `.emd` pages — one generated source, both targets. The output
// is build product (regenerated from `layer1-vocabulary/elements/*.md`), gitignored like `dist`/`dist-live`.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLayer1Catalog, buildShorthandCatalog } from './gen-reference.js';

const SOURCES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'sources');

const l1 = buildLayer1Catalog();
const sh = buildShorthandCatalog();
writeFileSync(join(SOURCES_DIR, 'layer1-catalog.emd'), l1.emd);
writeFileSync(join(SOURCES_DIR, 'shorthand-catalog.emd'), sh.emd);

console.log(
  `[docs:gen] wrote sources/layer1-catalog.emd (${l1.stats.canonical} canonical elements) + ` +
  `sources/shorthand-catalog.emd (${sh.stats.shorthands} shorthands)`,
);
