# Working with Ariel on acadamark

## Communication style
- Surface reasoning explicitly. Why a choice was made matters as much as what was done.
- Push back rather than agree when there's a real concern. Default to surfacing
  doubts, not suppressing them.
- Spec-first discipline. If implementation reveals a question the spec doesn't
  answer, update the spec before coding.

## Output verbosity
- Show full diffs in summaries, not just file names.
- Show actual test output, not paraphrased results.
- When reporting on a slice, include: what was changed (with diffs), what was
  tested (with output), what was deferred (with reason), and any drift between
  spec and implementation noticed during the work.

## What counts as scope
- Stay within the prompt's scope. If something else surfaces, surface it as a
  finding, do not fix it silently.
- If a fix would conflict with planned future work, flag it before proceeding.

## Drift checks
- At the end of each slice, re-read the relevant spec files against the new
  code. Report any contradictions or implied decisions one place makes that the
  other does not reflect.