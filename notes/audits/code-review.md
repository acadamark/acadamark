# Deep code review

The method for an intensive, architectural-fit code audit. This is the deep form
of the **code review** reconciliation (`release-audits.md` §1): that document says
*when* a code review runs and *what it produces*; this one specifies *how* to
conduct it. It can also run **standalone, on demand** — not only at a `.x.0`
close — when a subsystem has accreted enough that its fit is in question (for
example, before a large feature lands on a contested area of the trunk).

It is **read-only**. It maps; it does not fix. No code is changed, no fixtures
regenerated, nothing committed during the pass. Its only output is findings,
filed as **GitHub Issues** — per `CONTRIBUTING.md` there is no findings document.
(A deep review's *report*, if one is written to drive the filing, is a transient
working artifact, not a repo document; it is dissolved into Issues and discarded.)

One rule from `CONTRIBUTING.md`'s Maintenance section governs every finding:
before filing anything that originates in an earlier note, observation, or slice,
**re-verify it against the current code** — a prior observation is a lead, not a
fact.

## The question

Not "does it work?" but **"should the big picture have been adjusted to absorb
this case natively?"** A working one-off that signals a missed generalization is
a finding — the recommendation is the refactor toward the general mechanism, not
a note that the one-off is fine.

## The four lenses

Each construct is scored against all four:

- **0 · Category honesty.** Does processing branch on a thing's *kind*, or
  collapse kinds via side-checks (a `tagname === 'x'` test standing in for a kind
  the system already declares)? An invisible kind-boundary is a finding even when
  behavior is correct.
- **1 · Special-case sprawl → consolidation.** A special-case branch for an input
  the general mechanism could handle if adjusted; a parallel path for one concept.
- **2 · Repetition → single source of truth.** The same set/constant/logic
  hand-maintained in several sites with no common origin. Aligned today, drift
  tomorrow.
- **3 · Over-broad → split.** One unit doing many jobs, where adding any one
  feature forces reading all of it and the ordering constraints are implicit.

## Finding classes

Every finding carries a class:

- **`tidiness`** — readability/maintainability only; no behavior is at stake.
- **`latent-risk`** — today's behavior is correct, but the structure invites a
  *silent* future regression: a drift that no existing test would catch until it
  ships wrong output. (The duplicated-constant-that-drifts and the
  parallel-allowlist-out-of-sync smells are the archetypes.) Latent-risk findings
  are prioritized above tidiness.

A finding that requires a **behavior-changing fix** or a **project-sized
restructure** is its own Issue and a design decision — never folded into the
audit, and (if it touches what a spec *means*) a chat-surface design pass before
any slice.

## Method

- **Parallel read-only readers, one per subsystem** (e.g. the gate, config /
  allowlists, numbering+toc, structuring, the compiler, vocab constants). Each
  scores its subsystem against the four lenses and reports its own
  *well-factored* list alongside its findings.
- **Convergence is signal.** Where N independent readers flag the same construct,
  record the count ("flagged by N/M") and treat high convergence as
  high-confidence; the highest-convergence items get direct re-verification.
- **Independently re-verify the load-bearing facts** (by grep / direct re-read)
  before synthesizing — the few claims the whole catalog rests on are checked by
  hand, not taken from a reader's summary.

## Output discipline

- **Findings → Issues**, grouped so that findings sharing a *root and a fix* land
  as one candidate slice. Present the slices in **recommended execution order**,
  cheapest-high-value and latent-risk-removing first.
- **Each slice states its invariant:** what must *not* change (typically
  byte-identical HTML/JATS output — the empty fixture diff is the proof), so a
  refactor is provably output-neutral.
- **Record what was considered and declined.** A deep review's value includes the
  "leave this alone, here's why" verdicts, so a later pass does not re-litigate
  settled structure. These go as a brief note on the relevant Issue (or a single
  discussion Issue) — not a standing file.
- **A well-factored finding is also a finding.** The exemplars the review names as
  the pattern to copy (the single-source registries, the one shared pipeline
  assembly) are recorded so future work imitates them.

## Relationship to the release audit

The release audit (`release-audits.md`) runs five reconciliations at every `.x.0`
close; reconciliation #1 *is* a code review, and this document is its method.
A deep code review may also be commissioned on its own between releases. Either
way, the cadence rule from `CONTRIBUTING.md` holds: findings are routed to the
next `.x.5` consolidation milestone unless one blocks the current `.x.0`, and the
fixes land as slices, never inside the audit pass itself.

## Cross-references

- `release-audits.md` — the five-reconciliation release audit; §1 is the code
  review this method serves.
- `CONTRIBUTING.md` — when the audit runs, how findings are routed (Issues only,
  no findings document), and the `.x.0` → `.x.5` cadence.
- `notes/specs/principles.md` — the working principles a finding is grounded in
  (parser-knows-nothing-about-meaning, always-renders).
