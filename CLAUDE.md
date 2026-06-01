# Working with Ariel on enscribe

This file is read by Claude Code at the start of every session in this repository. It encodes the working conventions for the enscribe project so that they don't have to be repeated in every prompt.

## Documentation system

enscribe's documentation operates under the system defined in `CONTRIBUTING.md` — read it once; it is the canonical definition. Two rules govern every document (one job per document; no computable facts), and the Maintenance section names further rules including the limitations rule and the discussion-is-work rule. **Every implementation slice ends with the coherence check defined in `CONTRIBUTING.md`** — perform it and report its result before committing.

## Project overview

Enscribe is an academic publishing system that uses HTML+CSS+JS as its substrate and a shorthand authoring syntax on top. The project has two main layers:

- **Layer 1** is a vocabulary of semantic HTML elements for academic content (articles, books, chapters, sections, floats, citations, cross-references, notes, etc.). The Layer 1 spec is the canonical, archival representation of a document.
- **Layer 2** is the shorthand authoring syntax — a uniform tag form `<tag #id .class attr=value | content>` that compiles to Layer 1 HTML, plus selected markdown idioms accepted as shortcuts.

The project is built as a set of plugins on the [unified](https://unifiedjs.com/) ecosystem (remark/rehype). The shorthand parser uses a hybrid approach: a micromark extension finds tag boundaries in the source stream, and a Peggy grammar parses the internals of each tag.

The relevant docs are:
- `README.md` — project premise.
- `DESIGN.md` — design rationale.
- `STATUS.md` — current state, what's done, what's next.
- `ROADMAP.md` — the phase plan and release targets. Open work lives in GitHub Issues (by milestone and label).
- `notes/specs/layer1-naming.md` — Layer 1 vocabulary rules.
- `notes/specs/shorthand-syntax.md` — parser specification.
- `notes/specs/idioms.md` — delegation principle (enscribe hands off to existing parsers wherever possible).
- `notes/specs/recursive-content-spec.md` — recursive parsing of named-tag content.

Read the files relevant to the current task at the start of a session.

## Communication style

**Surface reasoning explicitly.** Why a choice was made matters as much as what was done. When making a non-obvious decision, name the alternatives considered and why one was picked.

**Push back rather than agree.** When there's a real concern about something Ariel has asked for — a design issue, a scope problem, an implementation risk — say so before starting work. Disagreement is part of the work, not an interruption. Reflexive agreement is unwanted and erodes trust over time.

**Slow over fast.** Decisions are made deliberately. Enscribe has been worked on intermittently over years; deliberate decisions are what make it resumable. Speed is not a priority.

**Pacing.** Ariel is a physicist and data scientist with strong design instincts but is not a parser engineer or a JATS expert. When explaining technical details, err toward more words and more examples rather than dense compressed prose. If Ariel says "I don't fully understand," slow down and re-explain with examples rather than glossing.

## Working discipline

**Spec-first.** When implementation reveals a question that the existing specs don't answer, update the spec before coding. Do not paper over ambiguity by guessing what was meant.

**Slice cadence.** Work is organized into vertical slices, each with a clear scope. The phase plan lives in `ROADMAP.md`; open work lives in GitHub Issues (by milestone and label). Do not start a new slice while a previous one is incomplete. Every non-trivial slice runs in two artifacts: a **Phase 0** read-only investigation (produces a findings document ending in a "recommended scope" verdict, no code changes), then an **implementation prompt** written from the findings. Phase 0 repeatedly catches things the plan could not have known — do not skip it.

**Correctness models.** Know which one applies before a slice starts:
- *Output-neutral* (most refactor work): proof is an empty fixture diff. `node test/render-fixtures.js` then `git diff test/fixtures/` must be empty. Snapshots must not change.
- *Output-adding* (a new feature): proof is "the diff shows exactly the intended new output and nothing else." Snapshots will change for new fixtures and that is expected and reviewed.
- *Syntax-migration* (e.g. F1): fixture source changes but rendered output does not. Proof is HTML content stable (snapshots may shift on source-position metadata; verify content, not raw bytes).

**Coherence check at the end of each slice.** The check defined in `CONTRIBUTING.md` ends every implementation slice and is reported alongside the diff. It verifies spec ⇄ code, Issues ⇄ code, STATUS, and Rule 2. Drift surfaced by the check is fixed in the same slice; it is not a separate "drift check report" filed for later. (The older single-direction "drift check" — re-reading specs against new code at the end of each slice — is subsumed by the coherence check.)

**Visual verification for visible-output slices.** Tests catch behavioral regressions; they do not catch visual regressions (a note in the wrong place, a code block losing newlines, math rendering as block when it should be inline). When a slice changes visible output, run `npm run verify` in `packages/enscribe` — it runs the full test suite and re-renders the fixture HTML files — then open the affected `test/fixtures/document-N-*.html` in a browser and confirm the rendered output is correct. Tests passing is necessary but not sufficient for visible-output slices. When a slice intentionally changes output, regenerate snapshots with `ENSCRIBE_UPDATE_SNAPSHOTS=1 node test/run.js` and re-run `npm run verify` to confirm the new snapshots match.

**Stay within scope.** If something surfaces during the work that's outside the current prompt's scope, surface it as a finding, do not fix it silently. If a finding would conflict with planned future work, flag the conflict before proceeding.

**Two-surface workflow.** Design discussions, drift analysis, and prompt-crafting happen in chat sessions with Ariel. Tactical implementation happens in Claude Code. The chat produces specs and prompts; Claude Code executes them. When a Claude Code session reveals a real design question, surface it as a finding for the chat to address rather than deciding it unilaterally.

## Output verbosity

**Show diffs, not summaries.** When reporting on a change, include the actual diffs of the files changed, not paraphrased descriptions. Diffs are evidence; descriptions are narration.

**Show test output.** When reporting that tests pass, include the actual test command and its output. "All 48 tests pass" is less useful than the visible result of running the tests.

**Show what was deferred.** When part of a task is deliberately not done, name it explicitly with the reason. "Multi-line sigil tags are not handled here because they're scoped to a future slice" is the right shape; silent omission is not.

**Slice reports include four sections.** When reporting at the end of a slice or significant task:
1. *What changed.* Files modified, with diffs.
2. *What was tested.* Test commands and output.
3. *What was deferred.* What was deliberately not done, with reasons.
4. *Drift findings.* Anything noticed during the work where spec and implementation have gotten out of sync.

## Common patterns and conventions

**Push back before applying speculative fixes.** If a finding could be addressed several ways and the right way isn't obvious, surface the options rather than picking one. Especially when the fix touches the parser, the grammar, or the spec — these are load-bearing and changes propagate.

**No scope creep through "while I'm here."** A prompt that asks for X should produce X. If Y becomes apparent during the work, Y is a finding for a future prompt, not an addition to the current one. The exception is when Y is strictly necessary for X to land cleanly — in which case, surface it and confirm before proceeding.

**Tests must pass before declaring done.** Run the test suite from a clean state at the end of any work that touches code. "Tests passed in the last incremental run" is not the same as "tests pass from scratch." For Peggy-based grammar work, this means rebuilding the generated parser before running tests.

**Comments on speculative or short-lived code.** When writing code that has a known finite lifespan (e.g., a defensive measure that will be replaced when a deferred feature is implemented), comment it explicitly with that lifespan noted. This makes it findable when the deferred feature lands.

**Prefer explicit rules over clever generalizations.** When extending the grammar or the interpreter with similar-but-not-identical rules (e.g., new sigil families with different allowed lengths), prefer explicit rule sets per family over a parameterized generalization. The abstraction can come later if it's needed; premature abstraction obscures the per-family differences.

## What "tests pass" means

The enscribe parser uses a generated Peggy grammar. Tests run against the generated parser, not the grammar source. If the grammar source changes, the parser must be rebuilt before tests can claim to be valid:

```
npm run build:grammar     # or whatever the project script is
npm test
```

Always build before testing when the grammar has been modified. "48/48 pass from a clean rebuild" is the claim that matters; "48/48 pass in the latest run" can be stale.

## What's deferred and why

Deferred features and open work live in GitHub Issues. Do not implement an item ahead of its placement in the roadmap unless explicitly prompted. If a current task seems to require an open item, surface this as a finding before working around it.

## When in doubt

When in doubt about scope, ask. When in doubt about a design choice, surface the options. When in doubt about whether tests cover something, write the test. When in doubt about whether the spec covers something, update the spec.

The principle behind all of these: ambiguity surfaced early is cheap; ambiguity buried in code is expensive.
