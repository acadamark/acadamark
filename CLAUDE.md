# Working with Ariel on acadamark

This file is read by Claude Code at the start of every session in this repository. It encodes the working conventions for the acadamark project so that they don't have to be repeated in every prompt.

## Project overview

Acadamark is an academic publishing system that uses HTML+CSS+JS as its substrate and a shorthand authoring syntax on top. The project has two main layers:

- **Layer 1** is a vocabulary of semantic HTML elements for academic content (articles, books, chapters, sections, floats, citations, cross-references, notes, etc.). The Layer 1 spec is the canonical, archival representation of a document.
- **Layer 2** is the shorthand authoring syntax — a uniform tag form `<tag #id .class attr=value | content>` that compiles to Layer 1 HTML, plus selected markdown idioms accepted as shortcuts.

The project is built as a set of plugins on the [unified](https://unifiedjs.com/) ecosystem (remark/rehype). The shorthand parser uses a hybrid approach: a micromark extension finds tag boundaries in the source stream, and a Peggy grammar parses the internals of each tag.

The relevant docs are:
- `README.md` — project premise.
- `DESIGN.md` — design rationale.
- `BUILD.md` — implementation plan.
- `STATUS.md` — current state, what's done, what's next.
- `notes/layer1-naming.md` — Layer 1 vocabulary rules.
- `notes/shorthand-syntax.md` — parser specification.
- `notes/idioms.md` — delegation principle (acadamark hands off to existing parsers wherever possible).
- `notes/recursive-content.md` — recursive parsing of named-tag content (when this file exists).

Read the files relevant to the current task at the start of a session.

## Communication style

**Surface reasoning explicitly.** Why a choice was made matters as much as what was done. When making a non-obvious decision, name the alternatives considered and why one was picked.

**Push back rather than agree.** When there's a real concern about something Ariel has asked for — a design issue, a scope problem, an implementation risk — say so before starting work. Disagreement is part of the work, not an interruption. Reflexive agreement is unwanted and erodes trust over time.

**Slow over fast.** Decisions are made deliberately. Acadamark has been worked on intermittently over years; deliberate decisions are what make it resumable. Speed is not a priority.

**Pacing.** Ariel is a physicist and data scientist with strong design instincts but is not a parser engineer or a JATS expert. When explaining technical details, err toward more words and more examples rather than dense compressed prose. If Ariel says "I don't fully understand," slow down and re-explain with examples rather than glossing.

## Working discipline

**Spec-first.** When implementation reveals a question that the existing specs don't answer, update the spec before coding. Do not paper over ambiguity by guessing what was meant.

**Slice cadence.** Parser work is organized into vertical slices, each with a clear scope. Each slice ends with passing tests and a drift check before the next begins. The current slice plan is in `BUILD.md`. Do not start a new slice while a previous one is incomplete.

**Drift checks at the end of each slice.** Re-read the relevant spec files (`shorthand-syntax.md`, `idioms.md`, `layer1-naming.md`, etc.) against the new code and tests. Report any places where the three have drifted out of agreement. Things to look for:
- Spec language that promises behavior the grammar doesn't implement, or vice versa.
- Examples in the spec that, if turned into tests, would fail against the current grammar.
- Tests that exercise behavior the spec doesn't actually describe.
- Resolved-decisions sections that contradict newer prose elsewhere.

The drift check produces a report; it does not silently fix what it finds. Fixing is a separate, scoped action.

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

The acadamark parser uses a generated Peggy grammar. Tests run against the generated parser, not the grammar source. If the grammar source changes, the parser must be rebuilt before tests can claim to be valid:

```
npm run build:grammar     # or whatever the project script is
npm test
```

Always build before testing when the grammar has been modified. "48/48 pass from a clean rebuild" is the claim that matters; "48/48 pass in the latest run" can be stale.

## What's deferred and why

Several features are deferred to specific later slices. Do not implement them ahead of their slice unless explicitly prompted:

- **Multi-line named tags and multi-line sigil tags.** Single-line only through the current slice. To be addressed in a future slice with its own design pass.
- **Recursive parsing of named-tag content.** Currently named-tag content is an opaque string. The recursive-content slice will turn this into homogeneous `Node[]` content by re-feeding strings through remark. Design is in `notes/idioms.md` and (when written) `notes/recursive-content.md`.
- **Long-form DSL tags** (`<csv>...</csv>`, `<theorem>...</theorem>`). Slice 4.
- **Qualifying-tag pattern** (`<table csv | ...>`). Slice 5.
- **The interpreter** (`acadamarkTagInterpret`). The next major piece after the parser slices, requiring its own design pass.
- **JATS export** (`rehypeAcadamarkToJats`). Phase 3, after the interpreter and Layer 1 vocabulary are settled.

If a current task seems to require any of the above, surface this as a finding before working around it.

## When in doubt

When in doubt about scope, ask. When in doubt about a design choice, surface the options. When in doubt about whether tests cover something, write the test. When in doubt about whether the spec covers something, update the spec.

The principle behind all of these: ambiguity surfaced early is cheap; ambiguity buried in code is expensive.
