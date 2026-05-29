#!/usr/bin/env node
// Phase 5 slice 5d (2026-05-28): one-shot DTD fetcher for the JATS
// 1.3 Archiving and Interchange + BITS 2.0 distributions.
//
// Recursively crawls SYSTEM-identifier references in each fetched
// DTD/.ent/.mod file and downloads them under the same relative
// path. Handles two subdirectory cases:
//   - `iso9573-13/` (ISO entity sets referenced from MathML modules)
//   - flat root for the bulk of JATS/BITS modules
//
// The fetched tree under `dtd/` is committed to git per the slice 5d
// design call: bundling DTDs (~2 MB total) into the package's git
// history means offline validation works out-of-the-box, no postinstall
// fetch dance. The slice's "DTD validation is a hard requirement"
// becomes "when xmllint is available, validate against bundled DTDs;
// when xmllint is absent, skip with a clear log message."
//
// USAGE
//   node scripts/fetch-dtds.mjs
//
// Idempotent. Run once after JATS/BITS publishes a new DTD; commit
// the updated tree. Not part of the test pipeline — this is a
// maintenance script.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DTD_DIR = join(__dirname, '..', 'dtd');

// Base URLs for the two distributions.
const JATS_BASE = 'https://jats.nlm.nih.gov/archiving/1.3/';
const BITS_BASE = 'https://jats.nlm.nih.gov/extensions/bits/2.0/';

// Entry-point DTDs (recursive crawl roots).
const ENTRY_POINTS = [
  { base: JATS_BASE, rel: 'JATS-archivearticle1-3.dtd' },
  { base: BITS_BASE, rel: 'BITS-book2.dtd' },
];

const fetched = new Set();
let downloads = 0;
let skips = 0;

/**
 * Extract relative SYSTEM identifiers from DTD source. Catches:
 *   "JATS-foo1-3.ent"            — bare filename
 *   "iso9573-13/isoamsa.ent"     — subdirectory path
 * Skips:
 *   http://...  (absolute URLs — handled separately if at all)
 *   https://...
 *
 * Returns an array of relative paths (deduplicated).
 */
function extractRefs(source) {
  const refs = new Set();
  // Match quoted strings ending in .dtd, .ent, or .mod that don't
  // start with a URL scheme.
  const re = /"([^"]+\.(?:dtd|ent|mod))"/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const ref = m[1];
    if (ref.startsWith('http://') || ref.startsWith('https://')) continue;
    if (ref.startsWith('//')) continue;
    refs.add(ref);
  }
  return [...refs];
}

// Filenames the JATS mirror serves from subdirectories rather than
// from the root path. When a SYSTEM identifier from a root-level
// DTD references one of these bare names, the file actually lives
// at the listed subpath. The MathML 3 DTD (which sits at root)
// references the ISO entity sets by bare filename, but NLM serves
// MathML-specific ones at `iso9573-13/`; the rest aren't on NLM at
// all — they're at W3C.
const SUBDIR_FALLBACKS = {
  // MathML-specific ISO entities (only this subset lives at NLM).
  'isoamsa.ent': 'iso9573-13/', 'isoamsb.ent': 'iso9573-13/',
  'isoamsc.ent': 'iso9573-13/', 'isoamsn.ent': 'iso9573-13/',
  'isoamso.ent': 'iso9573-13/', 'isoamsr.ent': 'iso9573-13/',
  'isogrk3.ent': 'iso9573-13/', 'isomfrk.ent': 'iso9573-13/',
  'isomopf.ent': 'iso9573-13/', 'isomscr.ent': 'iso9573-13/',
  'isotech.ent': 'iso9573-13/',
};

// External fallbacks at W3C for the ISO entity sets NLM doesn't
// mirror (general-purpose ISO 8879 / 9573 entities — box drawing,
// Cyrillic, Latin, numeric punctuation, etc.) and for mathml3-qname.
// These are referenced by mathml3.dtd; non-MathML JATS documents
// generally don't trip them, but bundling for completeness so
// xmllint can validate documents with embedded MathML offline.
const EXTERNAL_FALLBACKS = {
  'isobox.ent':  'https://www.w3.org/2003/entities/2007/isobox.ent',
  'isocyr1.ent': 'https://www.w3.org/2003/entities/2007/isocyr1.ent',
  'isocyr2.ent': 'https://www.w3.org/2003/entities/2007/isocyr2.ent',
  'isodia.ent':  'https://www.w3.org/2003/entities/2007/isodia.ent',
  'isolat1.ent': 'https://www.w3.org/2003/entities/2007/isolat1.ent',
  'isolat2.ent': 'https://www.w3.org/2003/entities/2007/isolat2.ent',
  'isonum.ent':  'https://www.w3.org/2003/entities/2007/isonum.ent',
  'isopub.ent':  'https://www.w3.org/2003/entities/2007/isopub.ent',
  'mathml3-qname.mod': 'https://www.w3.org/Math/DTD/mathml3/mathml3-qname.mod',
};

async function fetchOne(base, rel) {
  const key = `${base}|${rel}`;
  if (fetched.has(key)) return;
  fetched.add(key);

  const url = base + rel;
  const localPath = join(DTD_DIR, rel);
  const localDir = dirname(localPath);

  // Skip if already present (idempotent).
  if (existsSync(localPath)) {
    skips++;
  } else {
    let text = null;
    let res = await fetch(url);
    if (res.ok) {
      text = await res.text();
      // Defensive: NCBI returns HTML 404 pages with HTTP 200 for some
      // malformed paths. Treat as miss.
      if (text.trimStart().startsWith('<!DOCTYPE html') || text.trimStart().startsWith('<html')) {
        text = null;
      }
    }
    // Subdirectory fallback for files NLM serves under iso9573-13/
    // or mathml/ even though they're referenced at root.
    if (text == null) {
      const baseName = rel.replace(/.*\//, '');
      const fallbackDir = SUBDIR_FALLBACKS[baseName];
      if (fallbackDir && !rel.includes('/')) {
        const fallbackUrl = base + fallbackDir + baseName;
        const r2 = await fetch(fallbackUrl);
        if (r2.ok) {
          const t2 = await r2.text();
          if (!t2.trimStart().startsWith('<!DOCTYPE html') && !t2.trimStart().startsWith('<html')) {
            text = t2;
            console.log(`  FALLBACK ${fallbackUrl} → dtd/${rel}`);
          }
        }
      }
    }
    // External fallback (W3C, etc.) for files not mirrored on NLM
    // at all — primarily ISO entities and mathml3-qname.mod.
    if (text == null) {
      const baseName = rel.replace(/.*\//, '');
      const externalUrl = EXTERNAL_FALLBACKS[baseName];
      if (externalUrl && !rel.includes('/')) {
        const r3 = await fetch(externalUrl);
        if (r3.ok) {
          const t3 = await r3.text();
          if (!t3.trimStart().startsWith('<!DOCTYPE html') && !t3.trimStart().startsWith('<html')) {
            text = t3;
            console.log(`  EXTERNAL ${externalUrl} → dtd/${rel}`);
          }
        }
      }
    }
    if (text == null) {
      // Some referenced files (e.g. xhtml11.dtd) are external and
      // 404 from the NLM mirror — that's expected; xmllint validation
      // doesn't need them as long as the DOCTYPE doesn't use them.
      console.warn(`  MISS ${res.status} ${url}`);
      return;
    }
    mkdirSync(localDir, { recursive: true });
    writeFileSync(localPath, text, 'utf8');
    downloads++;
    console.log(`  GET ${url} → dtd/${rel} (${text.length}B)`);
  }

  // Recurse into the file's SYSTEM references.
  const content = readFileSync(localPath, 'utf8');
  for (const childRel of extractRefs(content)) {
    // Resolve the child path relative to the current file's directory
    // (xmllint's default SYSTEM resolution rule).
    const childDir = dirname(rel);
    const childRel2 = childDir === '.' ? childRel : join(childDir, childRel);
    await fetchOne(base, childRel2.replace(/\\/g, '/'));
  }
}

console.log('Fetching JATS + BITS DTDs into dtd/...');
for (const entry of ENTRY_POINTS) {
  await fetchOne(entry.base, entry.rel);
}
console.log(`Done. ${downloads} new files; ${skips} already present.`);
