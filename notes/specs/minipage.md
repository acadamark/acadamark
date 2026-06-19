# #115 — minipage: a sealed frameable

## What it is
A LaTeX-style minipage: a box holding self-contained, recursively-processed content that returns
Layer 1. Outwardly it is an ordinary **frameable** (caption, title, opt-in numbering, label, ref-prefix,
the `<figure>` wrapper) — so it is itself cross-referenceable like any float. Inwardly its content is a
**sealed sub-document**: processed in its own pipeline run with its own registry.

The seal is the design. Everything Ariel wants from a minipage falls out of "process the body as its own
sealed sub-interpret" rather than inline:

- **inbound refs to content forbidden** — the body's labels stay in the child registry, never enter the
  parent, so an outside `<ref>` can't reach them (a normal ref-error, no blocking code);
- **private internal numbering** — the body numbers in its own context, doesn't touch document counters;
- **LaTeX-local footnotes** — `note-placement` running inside the sub-tree collects the body's notes at
  the minipage's own boundary, which is exactly the LaTeX bottom-of-minipage behavior.

The one thing paid for is **outbound** refs (body → document): seed the parent registry into the sub-run,
read-only.

## The model that does NOT work (and why)
A vanilla frameable renders its body inline via `recursive-content.js` into the **main** tree (this is what
`<frame>` does). Inline means the body's sections take document numbers, its labels enter the shared
registry (referenceable from outside — the thing we forbid), and its footnotes bubble to the nearest real
section. Sealing that inline would mean hand-carving three separate exceptions (registry exclusion, private
numbering scope, a new box-local note scope). The sealed sub-interpret inverts all three into freebies.

## The one load-bearing subtlety: a one-way registry view
The sub-run gets **read** access to the parent registry (so outbound refs resolve) but its own labels do
**not** merge upward (so inbound stays forbidden and numbering stays private). A read-through parent with a
private child overlay. This single seam is the whole reason one-way is strictly easier than two-way — two-way
would force merging child labels up, unique-id namespacing across minipages, and document-coordinated
numbering, eroding the very seal that makes the rest free.

The minipage resolves its own refs *inside* the sub-run before splicing, so the parent's ref-resolution
treats the finished minipage as an opaque black box carrying exactly one outward-facing label.

## Ordering
1. **Main pass** structures + numbers the main tree. The minipage appears as a frameable and gets its **own**
   outward label/number in the parent registry (so it's referenceable, and one minipage can ref another).
   The main numbering pass does **not** descend into the minipage body — same precedent as `asset-load`
   stripping `<data>` so numbering doesn't consume a figure number, and render-suppressed hosts being walked
   past.
2. **Deferred phase** (after the parent registry is complete): for each minipage, run the sealed sub-interpret
   on its body with read-through access to the parent registry; it does its own structure / numbering / notes
   / ref-resolution internally; produces resolved Layer 1.
3. **Splice** the resolved Layer 1 into the frameable shell.
4. Parent ref-resolution runs over the main tree, seeing each minipage as a resolved black box.

Because the parent registry is complete before any minipage runs, forward and backward outbound refs both
work, and a minipage-in-a-minipage just recurses within the deferred phase.

## No external files
The body is sealed inline content with no outward pulls. `@src`/`<data>` (the asset half — embedded base64
or external image paths) is disallowed inside a minipage. This kills the only infinite-loop vector; a depth
guard already exists (`recursive-content.js` MAX_DEPTH=10; the master's `ENSCRIBE_LOADED_SOURCES`) as backstop.

## Reuse map (what exists vs. what's new)
- **Frameable shell** — reuse `lib/frameable.js` + `core/frameable-elements.js`. The minipage is a new
  frameable member. *(exists)*
- **Sealed sub-interpret** — the master level already runs each child source through
  `processSync(source, { ENSCRIBE_LOADED_SOURCES })` with its own `file.data`/registry and a loop guard.
  Adapt from "a child file at assembly" to "an inline subtree mid-document." *(exists; adapt)*
- **Main-pass skip of the body** — numbering already skips stripped/suppressed subtrees. *(precedent exists)*
- **Local notes** — `note-placement` already groups by scope; running it inside the sub-tree gives
  minipage-local collection. *(exists; consequence)*
- **One-way registry seed + the deferred phase + splice** — the genuinely new wiring. *(new, bounded)*

## Sizing
Moderate, mostly assembly of existing parts — not a pipeline rewrite. The new code is the inline sub-interpret
invocation, the one-way registry seed, the deferred-process-and-splice control flow, and the no-external guard.

## Tests (fixtures)
- outbound ref (body → document section/float) resolves;
- inbound ref (document → body label) produces a normal not-found ref-error;
- private numbering — a figure inside the minipage doesn't advance the document figure counter;
- the minipage's own frameable label is referenceable, and minipage-A → minipage-B resolves;
- footnote inside the minipage renders at the minipage boundary (LaTeX);
- nested minipage;
- an `@src`/external pull inside a minipage is rejected with a visible error.

## The gallery convergence (why this is more than #115)
A sealed minipage is the structural version of the frame/aside skip-rules we've been adding per nav builder
(4ece570 taught the website on-this-page rail to skip demo boxes; the pending fork would teach `collectEntries`
the same). A demo wrapped in a sealed minipage has internals that are invisible to page nav **because they're
in a separate registry**, not because each builder learned to skip `<frame>`. So migrating the gallery/catalog
demo boxes to minipages likely **retires** the skip-list approach rather than extending it.

## Open sequencing call (for Ariel)
This intersects two in-flight things; it should not silently absorb either:
1. **The pending `collectEntries` ToC-leak fork.** Two coherent paths: (a) still land the small `collectEntries`
   frame-skip now as the immediate fix, and let the minipage retire it later when demos migrate; or (b) treat
   the minipage as the real fix and skip the interim `collectEntries` change. (a) keeps the current docs work
   unblocked; (b) avoids writing a skip-rule we plan to delete. Leaning (a) — the minipage is a fresh feature,
   not something to block the docs site on.
2. **The in-flight intros slice.** The minipage is its own feature and worktree (`~/enscribe-wt/minipage`),
   landed independently; it doesn't merge into or hold up the intros slice.
