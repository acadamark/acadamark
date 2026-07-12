# #115 — minipage: a sealed frameable

## What it is
A LaTeX-style minipage: a box holding self-contained, recursively-processed content that returns
eHTML. Outwardly it is an ordinary **frameable** (caption, title, numbering — on by default since #272,
its own `minipage` counter — label, ref-prefix, the `<figure>` wrapper) — so it is itself
cross-referenceable like any float. Inwardly its content is a
**sealed sub-document**: processed in its own pipeline run with its own registry.

The seal is the design. Everything Ariel wants from a minipage falls out of "process the body as its own
sealed sub-interpret" rather than inline:

- **inbound refs to content forbidden** — the body's labels stay in the child registry, never enter the
  parent, so an outside `<ref>` can't reach them (a normal ref-error, no blocking code);
- **private internal numbering** — the body numbers in its own context, doesn't touch document counters;
- **LaTeX-local footnotes** — `note-placement` running inside the sub-tree collects the body's notes at
  the minipage's own boundary, which is exactly the LaTeX bottom-of-minipage behavior.

The things paid for are the **read-throughs** (body → document): the parent label registry is seeded into the
sub-run read-only (outbound refs), and — #411, following LaTeX — the parent **citation index** is seeded the
same way (boxed cites resolve against the document library and feed its bibliography). See "The seal policy"
below for the full three-way table.

## The model that does NOT work (and why)
A vanilla frameable renders its body inline via `recursive-content.js` into the **main** tree (this is what
`<frame>` does). Inline means the body's sections take document numbers, its labels enter the shared
registry (referenceable from outside — the thing we forbid), and its footnotes bubble to the nearest real
section. Sealing that inline would mean hand-carving three separate exceptions (registry exclusion, private
numbering scope, a new box-local note scope). The sealed sub-interpret inverts all three into freebies.

## The seal policy — three-way, LaTeX-verified (#411)

The seal is **not** one uniform wall: each mechanism follows what LaTeX's minipage actually does,
verified empirically on #411 (pdflatex + bibtex, TeX Live 2023 — footnotes render at the box bottom
on their own alphabetic counter; `\label`/`\ref` and `\cite` are document-global; a boxed-only
`\cite` pulls its entry into the bibliography; LaTeX has no box-local bibliography concept). Ariel's
decision, refined 2026-07-12:

> *"Only notes local. Both cross-refs and citations (references) follow global. No local `<data>`
> or `<library>` in a minipage."*

| Mechanism | Seal behavior | LaTeX fidelity |
|---|---|---|
| **Notes** (`<note>`, `<^ …>`) | **Sealed** — box-local counter, collected at the box's own bottom boundary | Exactly LaTeX (`mpfootnote`, letter marks at box bottom). Deliberate; no change ever intended |
| **Cross-references** (`<ref>`) | **Read through, outbound** — a box `<ref>` resolves against the document registry; the box's own labels stay private (inbound forbidden) | LaTeX is two-way; enscribe is deliberately one-way because box numbering is private (see the open sub-question on #411 — outside→inside targeting is undecided, not implemented) |
| **Citations** (`<cite>`) | **Read through** — a box `<cite>` resolves against the DOCUMENT's library (the parent citation index is seeded by reference into the sub-run); boxed cites join the document's first-cited `order`, so they feed the document References (its empty-case gate and any future cited-only rendering read `order` — the contract comment lives at the deferred-phase seeding site in `interpreter/index.js`) | Exactly LaTeX (`\cite` in a minipage resolves globally and its entry joins the bibliography) |
| **Libraries** (`<data>`/`<library>` in the box) | **Prohibited** — never loaded, visibly flagged through the #410 misplacement family with a cite-count hint; one document, one library. A `<bibliography>` marker in a box is removed with a warning (one document, one References) | LaTeX has no box-local bibliography concept — one global cite-key namespace; the prohibition is the honest enscribe rendering of that fact |

## The one load-bearing subtlety: a one-way registry view
The sub-run gets **read** access to the parent registry (so outbound refs resolve) but its own labels do
**not** merge upward (so inbound stays forbidden and numbering stays private). A read-through parent with a
private child overlay. This single seam is the whole reason one-way is strictly easier than two-way — two-way
would force merging child labels up, unique-id namespacing across minipages, and document-coordinated
numbering, eroding the very seal that makes the rest free. (LaTeX's label read-through **is** two-way — it
can afford to be, because its numbering is globally scoped; the collision two-way creates under private box
numbering is the open sub-question posted on #411, deliberately not implemented.) The **citation index**
rides the same seam in the same direction (#411): the parent's `enscribeCitations` is seeded by reference
into the sub-run, read for resolution, with `order` shared so boxed cites feed the document bibliography.

The minipage resolves its own refs *inside* the sub-run before splicing, so the parent's ref-resolution
treats the finished minipage as an opaque black box carrying exactly one outward-facing label.

## Ordering
1. **Main pass** structures + numbers the main tree. The minipage appears as a frameable and gets its **own**
   outward label/number in the parent registry (so it's referenceable, and one minipage can ref another).
   The main pass does **not** descend into the minipage body — see *the held body* below: the body is opaque
   at parse time, so every main-pass walk skips it for free.
2. **Deferred phase** (after the parent registry is complete): for each minipage, run the sealed sub-interpret
   on its body with read-through access to the parent registry; it does its own structure / numbering / notes
   / ref-resolution internally; produces resolved eHTML (resolved mdast).
3. **Splice** the resolved eHTML onto the frameable node (a side-channel field), and the compile-time
   handler renders it inside the `<figure>` shell.
4. Parent ref-resolution runs over the main tree, seeing each minipage as a resolved black box.

Because the parent registry is complete before any minipage runs, forward and backward outbound refs both
work, and a minipage-in-a-minipage just recurses within the deferred phase.

## The held body — opaque at parse (as built)
The body is **held as the raw source string**, opaque at parse time, exactly the way `<math>` / `<code>` /
`<svg>` hold their foreign-language bodies: `minipage` is registered in the parser's `LANGUAGES` map, so
`getContentHandler('minipage')` is non-default and the parser sets `isOpaqueContent: true` and leaves
`node.content` a raw string (the micromark extension still balances nested `<…>` to capture the *full* body —
opacity decides only whether the body is re-parsed, not where it ends).

This is the whole "main pass does not descend" mechanism, and it is **structural, not a maintained skip-list**:
`recursive-content` skips it (so the body is never parsed into the main tree), and the `discover` / `walk-replace`
walks every main-pass plugin uses (numbering, notes, citation/asset index, structuring, ref/cite resolution) all
honor the same `!isOpaqueContent` guard, so none of them can see the body. The minipage *node itself* is still a
walked tag, so it is registered and numbered (its own outward label). This is what the earlier draft of this spec
mislabeled as "the asset-load stripping precedent": stripping is a different, weaker mechanism (asset-load
physically removes `<data>` declarations); the minipage needs nothing removed because the opaque body is never in
the tree to begin with. Opacity must be set at parse — `recursive-content` hardcodes `isOpaqueContent: false` for
default-handler tags, so a later transform cannot un-leak a body it already parsed.

The sub-interpret in the deferred phase is `buildEnscribePipeline(options).runSync(parse(bodySource), childFile)`
with a **fresh** `childFile` — a fresh `file.data` mints a fresh registry via `ensureRegistry`, and *that* is the
seal. (The earlier draft's "the master already runs each child through `processSync(source, {
ENSCRIBE_LOADED_SOURCES })` with its own registry/loop-guard" was inaccurate: the master assembler stitches child
mdast into **one** tree with **one** shared registry — the opposite of a seal — and `ENSCRIBE_LOADED_SOURCES` is a
pre-fetched-content map, not a loop guard. The fresh-VFile-per-run idiom the seal actually borrows is
`live-book.js`'s incremental rebuilder; the subtree-projection idiom is `render-chapter.js`.) `runSync` (not
`processSync`) stops at resolved mdast, so no document-level asset wrappers (fonts / KaTeX / ToC) are injected
into the fragment — the parent compiler renders the spliced body once, so its assets inject once.

The deferred phase runs as a pipeline pass between **apply-numbers** (step 8 — the parent registry is complete
and numbered) and **ref-resolution** (step 9). It stamps the resolved body on `node.minipageResolved`, a
side-channel field the mdast walks do not traverse; `node.content` stays the opaque raw string, so no later parent
pass re-enters the body. The handler reads `node.minipageResolved` at toHast time and splices it as the figure
body. Because the sub-run runs the full pipeline (including this same deferred pass), a nested minipage recurses;
`recursive-content`'s `MAX_DEPTH` resets per fresh run and so does **not** bound nesting, so the deferred phase
carries its own `ENSCRIBE_MINIPAGE_DEPTH` (bound 10) — this is the "loop guard" the master role would have played.

## Outward identity (Ariel's ruling)
A numbered minipage counts in its **own "Minipage N" series** — the `minipage` registry counter, the
`number-minipages` config suppress key, the `mp` ref-prefix (`<ref @mp:x>` → "minipage N") — **not** the figure
counter. A sealed sub-document is distinct from a figure and must never consume a document figure number. Like
`<aside>`'s "Box N", the counter is global (flat), not chapter-scoped. border defaults **true**, numbered defaults
**true** (#272, like `<frame>`; `-numbered` for a layout-only box). Caption / title are **kwarg-only** (`caption=` / `title=`), not child tags —
the body is opaque, so the gate's frameable-lift opaque guard leaves them as kwargs, the same as every other
opaque frameable (`<svg>` / `<table>` / `<csv>`); a `<caption>` written inside the pipe is part of the sealed body.

## No external files
The body is sealed inline content with no outward pulls. `@src` (a body `<fig src="@id">` asset-store reference)
and `<data>` (the declaration host for embedded base64 / external image paths / external `<library>` sources) are
disallowed inside a minipage — these are the outward-pull surface, so forbidding them keeps the box
self-contained; a boxed `<library>` (in `<data>` or bare) is additionally prohibited by the #411 one-document-
one-library rule (see the seal-policy table). A forbidden construct renders a **visible** flag (reject, never
resolve, never a silent drop): an `@src` pull renders a `__asset-error` in place; a `<data>`/`<library>` renders
its flag **injected into the box body** — a `__library-error` from the #410 misplacement family (with the
cite-count hint) for each library, a generic `__asset-error` for other `<data>` content. The body injection is
load-bearing, not a style choice: article-structuring relocates `<data>` to a root *sibling* of the box's
article, and `projectMinipageBody` splices only the article's regions, so an in-place error at the `<data>`
node's position would be **discarded by the projection** (pre-#411 this silently swallowed the flag — a fixed
bug). A plain `<fig src="path.png">` / `<fig src="http://…">` image is **allowed** — it is not an
asset-store pull (no `@`), cannot pull enscribe source, and is outside the forbid. The guard is a pipeline pass
(`enscribeMinipageGuard`) that is a no-op on every normal document and active only on a minipage sub-run (the
`ENSCRIBE_MINIPAGE_SUBRUN` flag), running before the citation/asset index passes so the pull is neutralized before
any of them would resolve it — and before library-load's misplacement classifier, whose "move it into `<data>`"
advice would mislead inside a box.

## Reuse map (what exists vs. what's new)
- **Frameable shell** — reuse `lib/frameable.js` + `core/frameable-elements.js`. The minipage is a new
  frameable member (`FRAMEABLE_LIFTABLE` + `KIND_META` — kept in lockstep by the load-time guard — plus the
  `HANDLER_REGISTRY`, `NUMBERED_TAGNAMES`/`CONFIG_KEY`, and `DEFAULT_PREFIXES` entries). *(exists; extended)*
- **Opaque held body** — reuse the parser's `LANGUAGES` / `getContentHandler` opacity, the same mechanism
  `<math>` / `<code>` / `<svg>` use. *(exists)*
- **Sealed sub-interpret** — `buildEnscribePipeline().runSync(parse(source), freshFile)`; the fresh VFile is the
  seal (fresh registry). Borrows the fresh-VFile idiom from `live-book.js` and subtree-projection from
  `render-chapter.js`. *(exists; composed — NOT the master assembler, which shares one registry)*
- **Local notes** — `note-placement` running inside the sub-run collects the body's notes at the box boundary
  (the sub-run produces a real `<article>` so `<article-back>` is the boundary host). *(exists; consequence)*
- **One-way read-through registry seed + the deferred phase + splice + the no-external guard + the nesting depth
  guard** — the genuinely new wiring. *(new, bounded)*

## Tests (fixtures)
`document-69-minipage` (the sealed self-contained minipage) and `document-70-minipage-outbound` (the one-way
read-through) cover, with HTML assertions + hast snapshots:
- private numbering — a `<fig>` inside the minipage is "Figure 1" in the box's private registry and does not
  advance the document figure counter;
- inbound ref (document → body label) produces a normal `??ref:…??` not-found ref-error;
- the minipage's own frameable label is referenceable, and two minipages each resolve (the "Minipage N" series
  advances);
- footnote inside the minipage renders at the box's bottom boundary (LaTeX);
- nested minipage — each level numbers in its own private registry;
- an `@src` / `<data>` pull inside a minipage is rejected with a visible error;
- outbound ref (body → document section / float) resolves read-through, while inbound stays forbidden (the
  read-through is one-way — child labels never merge up).

## Limitations
- **DOM id namespace — body ids are scope-qualified (#267, implemented).** The seal is at the registry /
  cross-ref level; the DOM-id level is closed by `qualifyScopeIds` (lib/minipage.js), called at the sub-run
  tail (index.js's deferred phase) on the box's **resolved body mdast**, before the handler converts it to hast.
  Every id a box emits — auto `note-N` / `noteref-N`, author colon-ids — is prefixed with the box's
  document-unique slug (`minipageScopeSlug`: the box's own id, else its source position for a bare box), and
  every in-box reference to one (a resolved `<ref>`'s `targetId`, the note marker↔list `noteId` / `refId`) is
  rewritten in lockstep, so the marker↔list and any in-box `<ref>` still resolve. Acting on the structured mdast
  (not the serialized hast) means a `<table>`/`<csv>` colon-id is qualified on `node.id` **before** the handler
  bakes it into a raw-HTML (`type:'raw'`) string — no regex over the literal. Outbound references — targets NOT
  defined in the box (the document labels the sub-run resolves read-through) — are left untouched, so the one-way
  seal holds. **Nesting composes:** the pass descends a nested box's `node.minipageResolved` (already qualified
  with the inner slug by that box's own sub-run), so inner ids also pick up the outer prefix
  (`outer-inner-fig:x`) and a repeated nested example stays unique. Two narrow boundaries remain documented
  rather than guarded: (a) `<svg>`-internal ids (mermaid/abc marker/clip defs, referenced by `url(#id)` this
  does not track) live in the box's string content, which the pass does not descend, so they are left intact and
  two diagram boxes can still share an SVG-internal id; (b) the slug fold is not injective, so two box ids
  differing only by colon-vs-hyphen (`#mp:x` vs `#mp-x`) fold to one slug — pathological, as colon-form is the
  steered convention.
- **Book-typed body (deliberate non-goal).** The body is processed as an article; a `<meta type=book>` body is
  out of scope (`projectMinipageBody` falls back to splicing the resolved root as-is).

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

**Resolution (as landed, #115).** The slice landed on the `minipage` branch through commit 4 (outbound), so
#115 is closed by the merge. Point 2 resolved as expected — minipage landed independently of the intros slice.
Point 1 (the `collectEntries` ToC-leak fork) is untouched here: it is the docs/intros slice's call, explicitly
out of scope for #115. The gallery/catalog demo migration to minipages (which would retire the per-builder
frame/aside skip-rules) remains a separate later slice.
