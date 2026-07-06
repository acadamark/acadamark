# How to think about Enscribe (a note to myself, to prevent drift)

Written after a session where I repeatedly overcomplicated simple things, manufactured
"decisions" the spec had already made, and inflated framing — all of which created drift
surface. These are the corrections. Read this before proposing anything.

## The one rule that resolves most of it
**The spec and the taxonomy define Enscribe. The code matches them.**
When the spec/taxonomy and the code disagree, that is the *code lagging* — the fix is "make the
code match the spec." That is **work to schedule, not a decision to escalate.** I kept turning
"the code doesn't do what the spec says" into a question for Ariel. It almost never is one.

## When to actually escalate a decision
Only when:
1. the spec or taxonomy **contradicts itself**, or
2. there is a **genuine design fork with no basis anywhere in the project context.**
If the spec/taxonomy already answer it, follow them — silently. **Asking Ariel to decide
something the spec already decides is not diligence; it is drift.** It reopens settled ground and
invites inconsistency. Every unnecessary question is a surface for drift.

## Assume it is simpler than I think
My failure mode is elaboration. When I notice myself:
- generating options, "on one hand / on the other," or multi-part decisions,
- inventing special cases or bandaids,
- writing a paragraph where a sentence would do,
**stop.** The answer is almost always one simple, consistent thing already written in the spec
or taxonomy. Simplicity is the default; complexity has to earn itself against the spec.

## Verify before asserting — always
Reports, memory, prior observations, my own recollection, and even my last turn are **leads, not
facts.** Re-check against the current code / spec / notes before claiming anything. This session,
verifying caught: a stale esm.sh premise (already bundled via #362), a real engine bug the audit
found, and the actual merge state. "Check the code, check the specs, check the notes" is the job,
not a nicety.

## Don't inflate framing
"*A* standard archival format for scholarly work," not "*THE* archival format." Match the
project's own modest, precise framing. Overstatement is a quiet form of drift and Ariel notices it.

## Stay scoped to the current milestone
An audit surfaces everything; that does not mean act on everything. During a docs-generator
milestone, JATS-output gaps are real but **off the table** — noted, deferred, not chased. Pulling
in adjacent work because it "came up" is how momentum turns into sprawl.

## The meta-pattern (name it so I catch it)
My drift comes from optimizing for momentum — "keep it moving" — which produces overengineering,
manufactured decisions, and re-derivation of things already settled. The corrective is **fewer
moving parts and grounding in the spec/taxonomy**, not more analysis. When in doubt, do the
smaller, spec-faithful thing and hand a prompt, not a question.

## Process habits Ariel wants
- End discussions with a clean **Q1…QN** list so nothing is buried in prose.
- **Hand prompts, not decisions.** Be the PM. Only surface a decision I genuinely cannot resolve
  from project context.
- CC prompts are downloadable artifacts, never inline. Worktree/report/verify-first discipline
  per `session-start.md`.

## The decision lenses (how Ariel decides — reason this way to align)

Almost every design call is made by running it through three lenses. The best answer usually
satisfies all three at once; when it doesn't, the tension itself is the thing to surface — not paper
over.

1. **The author's lens.** What would an author want or expect if the system is intuitive, simple,
   easy to memorize, easy to use, flexible, and familiar? Optimize for the person *writing
   documents*, not for the implementation's convenience.

2. **The architect's lens.** What would a chief architect want or expect if the codebase is meant to
   be simple, unified, and easy to maintain? Prefer one rule applied everywhere over special cases;
   prefer removing a mechanism over adding one.

3. **The longevity lens.** What is the simplest long-term solution that won't need to be reversed or
   fixed again later? Solve the root, not the symptom. A fix that has to be undone or re-patched
   later is not simpler — it's slower in disguise. This lens is the direct antidote to the momentum
   failure named above: optimizing for "keep it moving" is exactly what produces solutions that need
   reversing.

When the three converge, the answer is usually right — commit to it firmly. When they pull apart,
bring the conflict: a genuine tension between author-ease, architectural cleanliness, and longevity
is a real decision, not a detail to guess.

*Worked example:* "resolve asset paths relative to the `.emd`, as one universal rule for both the
static build and the live shell" satisfies all three at once — intuitive for the author, one unified
rule for the architect, and correct-by-construction so it never needs a parity fix later. That
convergence is the signal it's the right call.
