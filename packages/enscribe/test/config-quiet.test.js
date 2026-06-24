// Page-scoped authoring-warning suppression via <config quiet> (#281).
//
// Teaching/demo pages deliberately show warnings-worthy markup (raw HTML, stray
// apparatus tags) and so emit many vfile authoring warnings on file.messages. A
// document carrying `<config quiet />` suppresses ITS OWN authoring warnings from
// build/console output — the final enscribeQuietSuppression pipeline step clears
// that document's file.messages. It gates EMISSION only: the tree (and so the
// rendered HTML) is byte-identical, and the inline error markers the always-render
// guarantee relies on are tree content, not vfile messages, so they are untouched.
//
// `quiet` is a config BOOLEAN (apparatus-allowlists.js CONFIG_KWARGS), authored in
// the self-closing config form `<config quiet />` (bare boolean → quiet=true, #219);
// `quiet=true` / `quiet=false` are also accepted. The suppression is per-document:
// a quiet page hushes while other pages still warn.

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

let pass = 0;
let fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`PASS: ${label}`); }
  else { fail++; console.log(`FAIL: ${label}`); }
}

// Render a source and return { html, messages }. The body carries two raw-HTML
// passthrough triggers (bare close tags in prose) — warnings-worthy markup that
// emits `normalize-to-canonical:raw-html-passthrough` on file.messages.
const BODY = 'Intro paragraph.\n\nA mention of </code> and a literal </section> in prose.\n\nClosing text.\n';
function run(source) {
  const file = buildEnscribePipeline({}).processSync(source);
  return { html: String(file), messages: file.messages.slice() };
}
const ruleIds = (msgs) => msgs.map((m) => m.ruleId);
const bodyRenders = (html) => /code|section/.test(html) && !/tag-error/.test(html);

// ── 1. The noise exists: a plain doc emits the authoring warnings ────────────
const plain = run(BODY);
check('plain doc emits raw-html-passthrough warnings',
  plain.messages.length >= 2 && ruleIds(plain.messages).every((r) => r === 'raw-html-passthrough'));
check('plain doc renders the warnings-worthy markup inline', bodyRenders(plain.html));

// ── 2. <config quiet /> suppresses THIS doc's messages ───────────────────────
const quiet = run('<config quiet />\n\n' + BODY);
check('<config quiet /> → file.messages is empty (suppressed)', quiet.messages.length === 0);
check('<config quiet /> → content still renders inline (rendering untouched)', bodyRenders(quiet.html));

// bare boolean and explicit =true both suppress
const quietTrue = run('<config quiet=true />\n\n' + BODY);
check('<config quiet=true /> → suppressed', quietTrue.messages.length === 0);

// ── 3. A doc WITHOUT quiet still warns ───────────────────────────────────────
const quietFalse = run('<config quiet=false />\n\n' + BODY);
check('<config quiet=false /> → still warns (not suppressed)', quietFalse.messages.length >= 2);

// keyed on `quiet`, NOT on the mere presence of a <config> block
const otherConfig = run('<config show-source />\n\n' + BODY);
check('<config show-source /> (no quiet) → still warns', otherConfig.messages.length >= 2);

// ── 4. Rendering is untouched: gate emission, not output ─────────────────────
// `<config quiet />` and `<config quiet=false />` render byte-identical HTML
// (config produces no output; only the message stream differs). Proves the
// suppression step never touches the tree.
check('quiet vs non-quiet HTML is byte-identical (emission gated, not rendering)',
  quiet.html === quietFalse.html);

// ── 5. Per-document scope: a quiet page does not silence another page ─────────
// Each document is rendered independently; quieting one must not affect another.
const pageA = run('<config quiet />\n\n' + BODY);   // quiet
const pageB = run(BODY);                            // not quiet
check('multi-page: quiet page A is silent', pageA.messages.length === 0);
check('multi-page: non-quiet page B still warns (sibling unaffected)', pageB.messages.length >= 2);

console.log(`\n${pass}/${pass + fail} config-quiet (#281) tests passed`);
if (fail > 0) process.exit(1);
