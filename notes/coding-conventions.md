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
- document head asset links (fonts + KaTeX, `'link'` form) → `font-loader.js` `HEAD_ASSET_LINKS` (#297/#296 — EVERY string-form shell links EXACTLY this: the static-website head, the separate-pages page shell, and the live `?edit` shell; bound to the CDN-URL constants by a load-time equality assertion. A website article fragment no longer re-links them either — #296 renders it with `documentFontsCss/katexCss:'skip'`, the head being the sole linker)
- parser char codes → the central char-code registry

## 3 · Guard new single-sources
When you derive a set from a source, **bind them with a load-time equality assertion** (the
`section-kinds.js` pattern) so a future session *can't* silently fork a divergent copy. A guard
that fails loud at load or test converts a future audit finding into a build-time error.

## 4 · Fit-check before each commit (the audit's lens, applied early)
Before committing, ask the three architectural-fit questions from `notes/audits/code-review.md`:
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

## 7 · Root-cause over compensation

Prefer fixing a problem where it originates over adding downstream code whose **only justification** is to
correct an earlier stage's mistake. When stage A produces the *wrong* thing and stage B exists to undo or redo
that mistake, that pair is a **design smell** — the two layers can drift out of sync, a new case can slip past
B, and reasoning requires holding both the mistake and its correction in mind at once. Fix A; delete B.

**The discriminator is WHY, not SHAPE.** "Code that reverses an earlier step" is a shape, and not every
reversal is a smell — banning the shape would break legitimate pipelines and create a different drift. The
actual test is a single question:

> **Can you justify the earlier stage's output on its own terms, without reference to the later one?**
> - **No** — the earlier output is only explicable as "wrong, but a later stage fixes it" → **compensation
>   smell.** Fix it at the source.
> - **Yes** — both stages have an independent reason to exist → **not compensation.** Leave it. It's a
>   pipeline, not a mistake-and-patch.

**Legitimately NOT this smell (do not "fix" these):**
- **Reversible-by-design round-trips** — escape→transport→unescape, normalize→store→denormalize-for-target,
  serialize→deserialize. Neither end is a mistake; the round-trip *is* the design.
- **Distinct jobs that merely resemble undo** — if A's output is correct for A's purpose and B transforms it
  further for B's own purpose, that's two correct jobs. (Test: state A's job without mentioning B. If you can,
  it's fine.)
- **Root fix genuinely out of reach** — e.g. a third-party parser's fixed behavior. The compensation is then
  the correct response; it's a *tolerated stopgap*, not a defect — but **label it** (a comment naming what it
  compensates for and why the root fix was deferred) and flag it for the compensating-layer audit
  (`notes/audits/`) so it's tracked as debt.

**The tell (a lead, not a verdict):** code that *restores / re-adds / re-inserts / puts back / undoes* what a
prior stage removed (or strips what a prior stage wrongly added). The seam-whitespace restore in
`recursive-content.js` (#330) is the canonical smell — the fragment re-parse trims a *meaningful* space (wrong
on its own terms) and a later block re-inserts it. Whitespace is the most common instance; the pattern is
general. But apply the WHY test before treating any tell as a defect.

**Self-limiting clause:** the goal is not to eliminate all reversal. Over-aggressively removing legitimate
two-pass processing is itself a drift this rule does not want. When the earlier stage's output is independently
correct, the "reversal" is a pipeline stage — leave it. This rule targets *mistake-and-patch*, nothing wider.

This is the same instinct as §"single-source homes" and §"guard new single-sources": push the codebase to do
the right thing *by construction* — but only where the earlier stage is genuinely doing the wrong thing.