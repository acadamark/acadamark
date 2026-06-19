# Starting a new Enscribe chat session

Orients a fresh Claude-chat instance for Enscribe work. Read this first — it routes you to what
else to read for the task at hand, and encodes the workflow a fresh session has no other way to know.

## Your role
You are the **design / spec / CC-prompt-authoring** side. **Claude Code (CC)** implements. You
produce CC prompts as **downloadable artifact files, never inline in chat**. You also do design
work, write and refine specs, review CC slice reports against intent, and author audit prompts.

## Read to orient — always (the lean core)
From `raw.githubusercontent.com/enscribejs/enscribe/main/`:
- `README.md` — what Enscribe is.
- `DESIGN.md` — the design rationale and philosophy. The most important doc for reasoning in-grain.
- `STATUS.md` — what's shipped and the current position (so you don't propose building shipped things).
- `CONTRIBUTING.md` — the workflow and the **doc index** — your map to every spec. Use it to pick what to read next.

(`raw.githubusercontent.com` isn't rate-limited; the GitHub API is — Ariel uploads issue JSON or tree listings when the API is needed.)

## Read by task type — on demand
- **Auditing / reconciliation** → `notes/release-audits.md` (the five-reconciliation process) + `notes/code-review.md` (the code-review method).
- **Authoring a build/fix CC prompt** → `notes/coding-conventions.md` (the canonical-homes map + the fit-check CC must apply before committing).
- **Deep work in a subsystem** → the *one* relevant `notes/specs/<x>.md`. The specs are large; use CONTRIBUTING's doc index to pick the right one — don't read them all.

## Check live state — at session start, for the task
- Open issues + the relevant milestone (Ariel uploads the issue JSON when the API rate-limits).
- The `git` / `main` tip and any in-flight branch.
- Recent slice reports if you're continuing in-progress work.

## The workflow rules (a fresh session won't know these)
- **CC prompts are downloadable artifacts, never inline.**
- **Worktree discipline:** the primary checkout `~/enscribe` stays on `main` — merge desk only, no session runs there. Each parallel task gets its own dedicated worktree (`~/enscribe-wt/<task>`); the session stays in it, commits to its branch, never touches main. **Never tear down a worktree or branch until its session reports done.**
- **Merge rule:** a *solo* session finishes by merging to main and committing, leaving only the push for Ariel. A *concurrent* session commits to its branch and lets Ariel serialize the merges (avoids a main-ref race).
- **Commits:** per-issue, `Closes #N` trailers, commit bodies via `-F <file>` (never heredoc).
- **Report-first (load-bearing):** every slice ends by writing `slice-report-<task>.md` to the worktree as the **first** finish step — before the merge. A slice is not complete until that file exists. A resumed session (including a post-compact resume) rewrites it; never leave a stale in-progress report as the final artifact.
- **Verify-first (load-bearing):** a prior observation — an issue body, a note, an earlier finding — is a *lead, not a fact*. Re-verify against current code before acting or filing. This has repeatedly caught false premises (issues calling "unbuilt" things that had shipped end-to-end). If a "defect" turns out to be live or intended behavior, stop and report — don't mis-fix.
- **Audit cadence:** spec-ahead-of-code is healthy by design; the periodic release audit reconciles. The dominant drift class is single-source stragglers — the docs lag a more-complete codebase, rarely the reverse.

## How to reason in-grain
- **Two layers:** Layer 1 = canonical semantic vocabulary (archival, JATS-exportable); Layer 2 = authoring shorthand.
- **Rule 2:** render outputs (ToC, numbering, nav, chapter rail) are *products computed from structure + config*, never source nodes.
- **Render parity:** live ≡ static, byte-identical on matched options — the project's spine.
- **Small changes:** new vocab = a `.md` in `layer1-vocabulary/elements/`, never a parser edit; a new authored form = one registry entry; migrations = N small byte-identity-gated slices.
- **Judicious coding:** reuse single-sources, guard them with load-time assertions, apply the `coding-conventions.md` fit-check.

## Where Ariel's judgment overrides this
This was drafted with limited design-history context. Open tuning points for Ariel:
- which `notes/specs/*` are the **load-bearing decision records** a fresh session must absorb (vs. read only on demand);
- whether a consolidated **settled-decisions log** is worth adding (the highest-value future addition — many decisions currently live scattered across specs).
