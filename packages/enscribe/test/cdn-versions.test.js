// CDN version drift guard. The live-link CDN URLs (KATEX_CDN_URL,
// MERMAID_CDN_URL, ABCJS_CDN_URL) pin a version as a hardcoded literal so the
// source modules load in a browser bundle without an fs/require read at module
// load. These literals must stay in sync with the installed package versions:
// the live-link URL must point at the same version that live-inline mode
// bundles. This test reads each installed package.json version and asserts the
// exported CDN URL pins it, so a dependency bump fails loudly until the literal
// is updated.
//
// When this fails: open the named source file and update the version literal to
// the installed version printed in the failure message.
//   katex   → src/index.js          (_katexVersion)
//   mermaid → src/dsl/registry.js    (_mermaidVersion)
//   abcjs   → src/dsl/registry.js    (_abcjsVersion)

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { KATEX_CDN_URL } from '../src/interpreter/index.js';
import { MERMAID_CDN_URL, ABCJS_CDN_URL } from '../src/interpreter/dsl/registry.js';

const require = createRequire(import.meta.url);

export function run() {
  const cases = [
    ['katex', KATEX_CDN_URL, 'src/index.js (_katexVersion)'],
    ['mermaid', MERMAID_CDN_URL, 'src/dsl/registry.js (_mermaidVersion)'],
    ['abcjs', ABCJS_CDN_URL, 'src/dsl/registry.js (_abcjsVersion)'],
  ];
  for (const [pkg, url, where] of cases) {
    const installed = require(`${pkg}/package.json`).version;
    assert.ok(
      url.includes(`${pkg}@${installed}/`),
      `${pkg} CDN URL must pin installed version ${installed}; got "${url}". ` +
        `Update the version literal in ${where}.`,
    );
    console.log(`PASS: cdn-versions: ${pkg} CDN URL pins installed ${installed}`);
  }
}
