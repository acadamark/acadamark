# Coding conventions (drift prevention)

Read this at the start of any **build or fix** session. It exists because the periodic audit
kept finding the same narrow class of drift — duplicated helpers, parallel constant sets, sets
hand-encoded where a single source already exists. The cause is structural: a bounded-context
agent writes what the current task needs locally rather than hunting for an existing home. These
rules push the default from *add* toward *reuse*, and ask the codebase to resist drift
mechanically rather than leaving it for the next audit.

## 1 · Search before you write
The trunk is more factored than it looks. Before adding a helper, constant, set, or predicate,
search for an existing one and **extend its home rather than open a parallel path**. If you're
about to hand-encode a set that's derivable from a single source (the vocabulary, a config
registry), **derive it** — never re-encode.

## 2 · Known single-source homes — extend, don't fork
Adding a parallel copy of any of these is a regression, not a feature:
- section kinds / section→title → `section-kinds.js` (frozen set + load-time equality assertion against vocab — the pattern to imitate)
- book-region predicate `{book-front, book-body, book-back}` → `lib/book-regions.js`
- HTML text escaping → the single shared `escapeHtml` (do not fork a copy with a different entity set)
- frameable lift/kind registry (`KIND_META` / `FRAMEABLE_LIFTABLE` / `liftedKwargs`) → the frameable registry
- the config-vs-element decision → `booleanHome()`
- caption / cross-reference numbers → `formatScopedNumber`
- asset injection → the single consolidated injector (#229)
- document head asset links (fonts + KaTeX, `'link'` form) → `font-loader.js` `HEAD_ASSET_LINKS` (#297 — the string-form shells, the static-website head and the separate-pages page shell, link EXACTLY this; bound to the CDN-URL constants by a load-time equality assertion)
- parser char codes → the central char-code registry

## 3 · Guard new single-sources
When you derive a set from a source, **bind them with a load-time equality assertion** (the
`section-kinds.js` pattern) so a future session *can't* silently fork a divergent copy. A guard
that fails loud at load or test converts a future audit finding into a build-time error.

## 4 · Fit-check before each commit (the audit's lens, applied early)
Before committing, ask the three architectural-fit questions from `code-review.md`:
- Am I duplicating something that already has a home?
- Am I adding a special-case branch the general mechanism could handle if adjusted?
- Am I placing logic at a stage chosen for convenience rather than where the concept belongs?

A "yes" is a signal to reshape toward the existing mechanism, not to ship the one-off. *Does it
work?* is necessary but not sufficient — the question is whether the big picture should have
absorbed this case natively.

## 5 · This doc is audited
Reconciliation 2 (specs ⇄ code) keeps it honest — a home listed here that has moved or forked is
itself a finding. Trust the list; fix the doc when the audit flags it.

## 6 · Slice reports & worktree lifecycle
Report location and worktree teardown are governed by the canonical **Slice reports & worktree
lifecycle** convention in `session-start.md` — the single source of truth. In short: the slice
report is written to `~/enscribe-reports/slice-report-<task>.md` (outside the repo, **never
committed**), the slice is not done until that report exists, and **the session never removes a
worktree or deletes a branch** — that is Ariel's step, taken after the work is verified. Do not
restate or fork those rules here; if they seem to conflict with anything, follow `session-start.md`
and flag the conflict.
