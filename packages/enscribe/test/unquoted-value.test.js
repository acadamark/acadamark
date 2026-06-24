// Unquoted attribute value beginning with `#` or `.` (#291).
//
// Before the fix, an unquoted value after `=` could not begin with `#` or `.`:
// the grammar's key=value rule failed, the whole `href=#section-2` was swallowed
// as a positional, and the <a> normalize step then promoted that positional to
// href, doubling it (`href="href=#section-2"`). The quoted form was always
// correct. The fix relaxes the unquoted VALUE production (after `=`) to permit a
// leading `#` or `.`, matching the quoted form. See notes/specs/shorthand-syntax.md
// ("Identifiers" + the value-position exception) and grammar/enscribe.peggy
// (UnquotedValue).
//
// The relaxation is scoped to value position only: a bare `#id` / `.class`
// declaration (no `=`) is unchanged, and positionals still use the stricter
// Identifier rule.

import assert from 'node:assert/strict';
import { parse } from '../src/parser/generated/parser.js';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

let pass = 0;
let fail = 0;
function check(label, cond) {
  if (cond) {
    pass++;
    console.log(`PASS: ${label}`);
  } else {
    fail++;
    console.log(`FAIL: ${label}`);
  }
}

// ─── Parser level: isolates the grammar fix ─────────────────────────────────
// parse() returns the enscribeTag node directly (no interpreter involved), so
// these assertions pin the value-production behavior, not <a> normalize.

// The fix: leading `#` / `.` in value position now parse as the value.
{
  const n = parse('<a href=#section-2 | jump>');
  check('parse: href=#section-2 → kwargs.href === "#section-2"', n.kwargs.href === '#section-2');
  check('parse: href=#section-2 → no stray positional',          n.positional.length === 0);
}
{
  const n = parse('<a href=.foo | x>');
  check('parse: href=.foo → kwargs.href === ".foo"',            n.kwargs.href === '.foo');
  check('parse: href=.foo → no stray positional',               n.positional.length === 0);
}

// The fix is general at the grammar level, not <a>-specific.
{
  const n = parse('<x src=#frag | y>');
  check('parse: src=#frag on a non-<a> tag → kwargs.src === "#frag"', n.kwargs.src === '#frag');
}

// No new ambiguity: a declared id AND a `#`-valued href coexist in one tag.
{
  const n = parse('<a #myid href=#frag | x>');
  check('parse: <a #myid href=#frag> → id === "myid"',         n.id === 'myid');
  check('parse: <a #myid href=#frag> → kwargs.href === "#frag"', n.kwargs.href === '#frag');
}

// Guard: quoted values unchanged.
{
  const n = parse('<a href="#section-2" | x>');
  check('parse: quoted href="#section-2" unchanged',           n.kwargs.href === '#section-2');
}

// Guard: plain unquoted values unchanged.
{
  const n = parse('<a href=page.html | x>');
  check('parse: plain href=page.html unchanged',               n.kwargs.href === 'page.html');
}

// Guard: mid-value `#` / `.` were already allowed and still are.
{
  const n = parse('<a href=a#b.c | x>');
  check('parse: mid-value href=a#b.c still works',             n.kwargs.href === 'a#b.c');
}

// Guard: bare `#id` declaration (no `=`) is still an id, never a value.
{
  const n = parse('<section #sec:intro | Intro>');
  check('parse: #sec:intro is an id declaration',              n.id === 'sec:intro');
  check('parse: #sec:intro declaration adds no kwarg',         Object.keys(n.kwargs).length === 0);
}

// Guard: bare `.class` declaration (no `=`) is still a class, never a value.
{
  const n = parse('<frame .wide | body>');
  check('parse: .wide is a class declaration',                 n.classes.includes('wide'));
  check('parse: .wide declaration adds no kwarg',              Object.keys(n.kwargs).length === 0);
}

// ─── End-to-end: proves the doubling is gone through the full pipeline ───────

const r = (s) => String(buildEnscribePipeline({}).processSync(s));
const link = (s) => r(s).match(/<a [^>]*>/)?.[0];

check('render: <a href=#section-2> → href="#section-2" (not doubled)',
  link('<a href=#section-2 | jump>') === '<a href="#section-2">');
check('render: <a href=.foo> → href=".foo" (not doubled)',
  link('<a href=.foo | x>') === '<a href=".foo">');
check('render: combined → id="myid" href="#frag"',
  link('<a #myid href=#frag | x>') === '<a id="myid" href="#frag">');
check('render: quoted href="#section-2" still correct',
  link('<a href="#section-2" | x>') === '<a href="#section-2">');
check('render: plain href=page.html still correct',
  link('<a href=page.html | x>') === '<a href="page.html">');
check('render: <section #sec:intro> → id="sec:intro" (declaration unaffected)',
  /id="sec:intro"/.test(r('<section #sec:intro | Intro>')));
check('render: <frame .wide> → class includes "wide" (declaration unaffected)',
  /class="wide(\s|")/.test(r('<frame .wide | body>')));

console.log(`\n${pass}/${pass + fail} unquoted-value (#291) tests passed`);
if (fail > 0) process.exit(1);
