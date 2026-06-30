# Enscribe processing taxonomy (proposed)

How Enscribe processes a tag: the model to reason within, the function classes that do the work, and the
objective that governs how finely to slice them. Companion to the semantic taxonomy (authorial act) and the
document taxonomy (addressing/composition). This is a **reasoning frame and a set of checkable
class-membership claims** — NOT a prescribed function roster. It tells CC how to think about processing and
what good looks like; it does not write the code.

## The generative principle: find the essence

Before classifying or coding any tag, **strip its presentation/surface and find what it IS** — the act it
performs, not how it happens to look or how a prior slice happened to cut it. This rule generated all three
taxonomies (a list is peer-enumeration, not a vertical stack; an exhibit is addressed-not-positioned, not
"interrupts the display"; a paragraph is content-in-a-language, not a privileged default). For processing: a
tag's class is determined by **what must actually happen to its content**, not by an inherited label or how
the current code is sliced. When a new tag appears, ask "what is the essence of its processing?" and classify
from that — so the taxonomy extends itself correctly to tags it has never seen. A surface-driven
classification is the signal to stop and re-derive from essence.

## What Enscribe is (the framing this taxonomy assumes)

Enscribe began as a way to author articles, but it is **not a prose system with extras**. It is a system for
authoring **structured information, of which prose is one kind.** A notebook may be mostly code; a dashboard
may have almost no prose. Text, math, code, data, diagrams, and panels are **peers** — no kind is privileged
in the architecture. The clearest expression of this: prose is processed through the *same* mechanism as
everything else (see the processor lookup below); there is **no privileged default text processor** — prose
is simply the most common entry in a content-language→processor lookup, swappable like any other.

## The objective: legibility against drift

The function network is optimized to be a **legible surface CC can reason against without drifting** — named,
findable, single-purpose seams whose behavior is predictable from the taxonomy. Deliverable performance (load
time, processing time) is **explicitly deferred**: optimizing it now is premature while the engine is in
active development, and the binding constraint today is drift, not speed.

Consequences:
- **Prefer a named, single-purpose function** CC can locate over a generic function that hides several
  behaviors behind a parameter. "As few functions as possible" is a *consideration*, not the objective — it
  can lose to legibility. A function that does one nameable thing is a clean surface; a generic function whose
  behavior depends on flags CC must chase across files is a drift hazard.
- **One rule with no exceptions beats a default-path plus special-paths.** A single uniform mechanism (every
  tag handled the same way) is more legible than "most tags take the default path, some take a special path" —
  the bifurcation is exactly what breeds drift. This is *why* prose goes through the processor lookup like
  everything else: one rule, no privileged case.
- **Declarative per-tag data is good WHEN it makes class-membership explicit and checkable**, and bad when it
  *hides* behavior that should be a named function. The test: does the data make the tag's processing legible
  and conformable, or bury a decision a reader can't see?
- **Conformance must be mechanically checkable.** "This tag is class X; class X processes thus" is a claim an
  audit can verify, so a tag cannot drift from its class without the nonconformance showing. The taxonomy is
  the spec's spec: per-element specs are instances of their processing class.
- **Defer performance, don't design it in.** A lookup on every `<p>` is more work than a hardcoded default,
  but optimizing the hot path (caching, fast-pathing the common entry) is a LATER change that does not touch
  the model. Designing a special case in now to save an unmeasured lookup is premature optimization.

## The pipeline (the stages every tag flows through)

Three stages. A tag's processing is fully described by what happens at each. A function's class is defined by
which stage it serves, so classification and pipeline-position are the same fact.

```
  RECOGNIZE   ->   PROCESS   ->   FORMAT
  (parse: what     (the handler    (emit Layer-1
   tag is this,     completes the   HTML,
   descend into     picture and     recursively)
   its content      transforms it)
   or hold it?)
```

### 1. RECOGNIZE
The parser identifies the tag (name, arguments, content, children) and makes the ONE pre-handler decision:
**descend into the content as Enscribe content, or hold it as an unparsed string?** This is the only
legitimate home of the "opaque" idea — a *parse-time* bit (descend / hold), nothing more. Everything else
about a tag is decided after recognition. (Grounded: the parser skips descending when a node's content is not
ordinary Enscribe content.)

### 2. PROCESS — the handler does the work, via two disjoint lookups + a loader tool
Recognition hands the parsed tag to its **handler**. The handler is found by the first of two **disjoint**
lookups:

- **Tag name -> HANDLER** ("who orchestrates this tag"): `fig` -> figure handler, `diagram` -> diagram
  handler, `minipage` -> minipage handler, `section`/`p` -> their handlers. Relatively few; related tags
  share one (the math handler serves all math tags; the theorem handler serves all theorem-like tags).
- **Content language -> PROCESSOR** ("what engine transforms THIS content"): `abc` -> ABC processor,
  `mermaid` -> mermaid processor, math -> the math processor, prose -> the prose processor, Enscribe ->
  a fresh Enscribe processor instance.

These are **disjoint and orthogonal** because **one handler can dispatch to many processors, chosen by the
content, not the tag.** The single `diagram` handler, handed ABC, looks up the ABC processor; handed mermaid,
looks up the mermaid processor — same handler, different processor, selected by what's inside. Folding them
into one table would force a handler-per-language (a special-case explosion). The handler is the **bridge**:
it is fixed by the tag, inspects the content, and consults the processor lookup to get the right engine.

The handler's job, uniformly, for EVERY tag:
1. **Complete the picture.** If the tag is self-contained, proceed. If it references external content (a
   file, or an `@id` into the store), call the shared **loader** utility to fetch the bytes and complete the
   picture first. Loading is a **tool the handler uses**, not a pipeline stage — consumer-agnostic (returns
   bytes + status; the handler interprets). (Grounded: the asset resolver returns bytes/status; each consumer
   interprets.)
2. **Look up the processor** for its content's language and run it.
3. **Handle the returned result.**

**There is no privileged default processor.** Prose is the entry most tags resolve to, sitting in the SAME
lookup as ABC, mermaid, math, and Enscribe-itself. This is what makes "text is one kind of information" true
in the architecture, and makes prose swappable like any other processor.

**Minipage is not a special case under this model.** The minipage handler consults the processor lookup and
gets back **a fresh instance of the Enscribe processor** — structurally identical to the diagram handler
getting the ABC processor. "The engine running on itself in an isolated sub-document" is just *the processor
the lookup returned happens to be Enscribe.* The one consequence specific to Enscribe-as-processor: because
its output is same-universe Enscribe (sections, floats, labels), it requires **scope-sealing** so the
sub-document's labels/floats/footnotes don't bubble to the parent — and that sealing is the natural
consequence of "the processor is Enscribe," not a special mechanism. (A foreign processor like ABC needs no
sealing: its internals aren't Enscribe and can't leak.)

### 3. FORMAT
A **formatter** emits the result as Layer-1 HTML, recursively. Everything becomes Layer-1 at the end, so a
tag's "what it becomes" is just *what its formatter emits* — a property of the formatter, not a separate
tag-level axis to name and branch on.

## The function classes (ordered = pipeline position)
- **recognizers** (parse-stage) — identify tags; set the descend/hold bit.
- **handlers** (process-stage) — orchestrate a tag: complete the picture (via the loader tool), look up and
  run the processor, handle the result.
- **processors** (process-stage) — transform content of a given language; found via the content-language
  lookup. Prose, ABC, mermaid, math, Enscribe-itself are all entries.
- **formatters** (format-stage) — emit Layer-1, recursively.
- **loader** — a shared TOOL (not a stage, not a class of its own): fetch external/`@id` content,
  consumer-agnostically, when a handler needs to complete the picture.

A tag's **processing class** is its tuple: *(descend-or-hold, handler, processor, formatter)*. Two tags are
the same class iff they share that tuple. The tuple is the **checkable membership claim**, declared per
element and verifiable against the code. (The tag->handler and content-language->processor lookups are the
two declared tables that source it; they are **disjoint**.)

Granularity within a class is set by legibility, not by minimizing count: split a function when it creates a
clearer named seam; share one when behavior is genuinely identical and sharing stays legible.

## Cross-references to the other taxonomies
- **The processor a handler looks up tends to track the semantic family** (semantic substrate): notation ->
  a foreign-language processor (math/ABC/mermaid/...); prose/aside/quotation/metadata -> the prose processor;
  exhibit -> usually prose (the caption) with the exhibited thing often a foreign processor (a diagram) or
  Enscribe-itself (a minipage); stores -> loaded, consumer-interpreted. Where the processor and the semantic
  family DIVERGE, that is a named bridge or drift (the anti-drift diagnostic).
- **The loader realizes the addressing primitives at element scale**: an `@id` load is set/identity
  addressing; the store is set-addressed content (document taxonomy). Same primitive, element scale.

## Open design decisions (real forks — resolve with the designer; not invented here)
1. **fan-in of handlers — keep named or share.** A purely CC-legibility call, NOT a count-minimization one:
   for each tag that *almost* shares behavior with others (e.g. code / code-block / inline-code), decide one
   parameterized handler vs. N named handlers by "which reads more cleanly for CC." Resolved per-case during
   the spec-conforming pass, tie-broken by legibility.
2. **(Settled this pass, recorded for clarity):** loading is a tool, not a stage (handler completes the
   picture); the two lookups are disjoint; prose is a non-privileged entry in the processor lookup; the
   pipeline is recognize -> process -> format.

## Punch-list (current-state corrections — for the audit/refactor, NOT part of the taxonomy)
Surfaced by measurement; to apply when specs are conformed to this taxonomy: `section` missing its content
declaration; `sub-section`/`sub-sub-section` declaring inline content (should be block); `marginnote` as
sugar-for-`<note position=margin>` (not a distinct element); `span` removal (no Enscribe essence); the
code-handler inconsistency. These are corrections to the current code, not statements of the taxonomy.
