// The Enscribe SITE's live-playground build (#399) — `npm run build:site-live`.
//
// A thin wrapper over buildLiveFolder that supplies what the ENGINE deliberately does
// not carry: the Enscribe brand favicon (emit-shell.js is general engine code — baking
// a brand mark into its head templates would stamp it on every user's
// `enscribe build --live` output, the same brand ≠ engine-chrome line #393 drew). The
// site build passes the favicon links via the emitters' headExtra parameter and copies
// the icon files in beside the shell; an arbitrary user's live build emits none.

import { copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLiveFolder } from '../packages/cli/src/build-live.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site', 'live');

// The same icon pair the static pages link (#393), flat beside the live shell.
const FAVICON_HEAD = [
  '<link rel="icon" href="favicon.svg" type="image/svg+xml">',
  '<link rel="icon" href="favicon.ico" sizes="any">',
].join('\n');

const res = buildLiveFolder({
  master: join(ROOT, 'docs-source', 'index.emd'),
  outDir: OUT,
  headExtra: FAVICON_HEAD,
});
for (const f of ['favicon.svg', 'favicon.ico']) {
  copyFileSync(join(ROOT, 'docs-source', 'assets', f), join(OUT, f));
}
console.log(`Wrote the live playground to site/live/ (${res.master} + ${res.children.length} children + ${res.assets.length} assets + favicon) [${res.delivery}]`);
