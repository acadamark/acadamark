# Executable code — capability vision

**Status: direction, not decision.** This note states *what enscribe is aiming for* with executable code —
the goal, its lineage, and the shape of the problem — so the intent is captured clearly before it is scoped.
It is deliberately **above** both `decisions.md` (which holds *settled* product-shape choices) and the
subsystem specs (which hold *mechanics*). Nothing here is decided; the open questions are listed as open. When
this capability is ready to be built, its decisions move to `decisions.md` and its mechanics to a spec; this
note is the standing statement of the goal they serve.

Related trackers: **#39** (executable code blocks — JS / Arquero / Vega-Lite), **#353** (inline substitution
+ block cells). Both point here for the big-picture goal.

---

## The goal

Code in an enscribe document can **run**, not merely be displayed. An author writes code; enscribe executes it
and incorporates the result into the document — a computed value woven into a sentence, a table built from a
computation, a chart rendered from data, the output of a cell shown beneath it. This turns an enscribe document
from a *description* of a computation into a *live artifact* that carries and can re-run its own computation.

This places enscribe in the lineage of **literate-computing document systems** — Jupyter notebooks, RMarkdown /
knitr, and Quarto — where prose and executable code share one source and the rendered document contains the
code's results.

## Two execution modes (the core of the vision)

The defining lesson from that lineage: those systems run code cells in **two modes**, and a serious system
supports **both**.

1. **Interactive execution.** While authoring or reading in a live environment, the user runs a cell (or the
   whole document) and sees its output in place, then keeps working. This is the notebook experience — edit,
   run, inspect, iterate. In enscribe's terms this is **execution at load / in the browser** (cf. the live
   editor and the browser-as-runtime direction).

2. **Batch / command-line execution.** A non-interactive process executes the document's code and **bakes the
   results into the rendered output** — `quarto render`, `jupyter nbconvert`, knitr's `Rmd → md`. The output
   document is self-contained: it shows the computed results without the reader running anything. In enscribe's
   terms this is **execution at build**, via the CLI.

Enscribe should support **both** — not only the in-browser interactive mode (#39's current "in-browser"
framing is too narrow on this point). An author must be able to `enscribe render`-style bake a document's
computations at the command line **and** run cells interactively in a live session, from the *same* authored
source.

## This is the build-vs-load duality again, applied to code

Enscribe already commits to a **build-time AND load-time** model for resolving a document's dynamic elements —
the "eHTML resolves its own dynamic elements — at build AND at load (one resolver, two entry points)" decision
(`decisions.md`). Numbering, cross-references, notes, and derivations can be resolved either when the CLI
builds the document (static, baked output) or when the browser loads it (live).

Executable code is **the same axis, extended to computation**:

- **Execute at build** (CLI) → baked results in the output (the Quarto/knitr batch mode).
- **Execute at load** (browser) → live, interactive cells (the notebook mode).

So executable code is not a separate, unrelated feature — it is the derivation/resolution duality reaching its
most powerful case: *running arbitrary computation* rather than *resolving structural derivations*. The design
should treat it as one capability with two entry points, the same way the resolver is one mechanism with two
entry points — not two disjoint implementations that risk drifting.

## Two authoring surfaces

From #353, the capability has two surfaces, both of which the two-mode model applies to:

- **Inline substitution** — a short expression that computes a single value woven into prose:
  *"The query found a total of `<code r | num_instances>` instances."* → *"…a total of 42 instances."*
  In-flow, single-value, no multi-line structure.
- **Block cells** — a multi-line code block that runs and shows its output (a value, stdout, a table, a chart,
  or a rendered artifact). This is the notebook cell. (Its body renders through `<pre><code>` — the
  whitespace-faithful path — so authored indentation is preserved verbatim; cf. the code-indentation work.)

## How it composes with existing directions

Executable code is the convergence point of several threads already in motion — it should be built consistently
with them, not as a silo:

- **The data store (#313).** A cell's input data can come from a stored `<dataset>` (`src="@id"`) — the store
  already hands opaque bytes to a typed consumer; an executable cell is another such consumer.
- **The live-resolution direction (`decisions.md`).** The build/load duality above is literally the same
  mechanism; executable code should reuse its "one capability, two entry points, byte-identity between them"
  discipline where a computation is deterministic.
- **The save capability (#351).** A document you edit, run, and persist is the self-contained live notebook —
  the browser-as-word-processor reaching the browser-as-notebook.
- **The zero-build shell (#352).** A site whose pages run their own cells in the browser is the multi-page
  case of load-time execution.

The through-line across all of these: *the browser is a runtime*, and executable code is that principle
reaching arbitrary computation.

## Open questions (explicitly NOT decided here)

These are the real design forks a future Phase 0 must resolve; listing them is the point of this note, not
answering them.

1. **Execution model / where code runs.** In-browser (JS-native; other languages via WASM / pyodide-style
   runtimes)? At build via a Node/CLI runtime? Both, sharing one execution definition? For a deterministic
   computation, does build-baked output have to be byte-identical to a live re-run (the parity invariant), or
   is live-only computation explicitly exempt?
2. **Language surface.** Which languages, and how is the runtime selected/loaded (mirror the DSL registry's
   CDN/bundle machinery — mermaid/abc already load engines client-side)? #39 names JS + Arquero + Vega-Lite as
   the first targets.
3. **The control convention.** #39's `+eval` / `+echo` / `+output` flags — what runs, what source is shown,
   what output is shown. This needs a full definition (and how it reads in the Enscribe shorthand).
4. **Output shaping.** Inline → substitute the value in place. Block → value / stdout / a rendered artifact
   (a table? a figure? an eHTML subtree?) shown below or beside the cell.
5. **State between cells.** Do cells share a runtime/scope (a real notebook kernel) or evaluate independently?
   This is the largest scope fork — independent expressions is far smaller than a shared-kernel notebook.
6. **Security posture.** Arbitrary code execution — in the reader's browser (load mode) and on the author's
   machine (build mode) — is a real attack surface. Sandboxing, opt-in, and a trust model are a hard gate
   before anything ships. #39 flags this; it applies to *both* modes.
7. **Interactive UX in the live environment.** Run-cell affordances, output rendering, error surfacing,
   re-run, and how this integrates with the live editor.

## Not in scope for this note

This note captures the goal and its shape only. It does **not** scope work, choose an execution model, or make
any of the decisions above. When the capability is prioritized, it gets its own Phase 0 (per #39's own "needs
its own Phase 0" note) to answer the open questions; the resulting decisions land in `decisions.md` and the
mechanics in a spec.
