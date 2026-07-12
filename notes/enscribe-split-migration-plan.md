# Enscribe — repository split & licensing migration plan

Handoff document. Everything here was decided in discussion; a fresh session should load this and
execute. The organizing principle is **reversibility-first**: each stage is less reversible than the
last, so cheap/safe moves come first and teach the terrain before the expensive ones. **Green CI and
the live Pages deploy must be preserved at every step.**

## The framing (the lofty, and correct, view)
**The language is the normative thing; the engine is one implementation of it.** A format with an
independent definition plus a reference implementation is what a *standard* looks like — which is the
"eHTML is HTML-shaped, a format not a product" positioning we've protected all along. The cut follows
from that: the language is the real project; the engine is machinery that does the dirty work of
rendering.

## Target: three homes, three licenses
1. **`enscribe-language`** — the eHTML vocabulary/specs, the design docs, the notes (incl. CC-guidance),
   and the grammar *if it proves normative* (see Stage 3). **License: open/permissive** (decided: CC-BY 4.0 — see §"License map") — CC-BY (or
   similar) for prose/specs; a permissive code license for anything executable that's part of the
   definition. Rationale: a format must be free to implement anywhere; this matches HTML, JATS, TEI,
   RASH. **Not a judgment call.**
2. **`enscribe-engine`** — interpreter, renderer, editor. **License: MIT.** Rationale: adoption-first —
   the explicit goal is Posit / Microsoft / journals embedding the reference implementation, and MIT
   removes the barrier their legal teams would otherwise hit. (This is Quarto's own GPL→MIT reasoning,
   same reference class.)
3. **`enscribe-convert`** (the pandoc.wasm tool) — **License: GPL** (forced: it bundles the official
   pandoc WASM binary, GPL-v2-or-later). Its own repo. Scoped to a single convert page. Consumes the
   published MIT engine as a dependency; links from the Pages site.

## The licensing firewall (the load-bearing constraint)
GPL is viral. The MIT-adoption goal dies if GPL "reaches through" into the engine. The firewall:
- **Dependency direction, one way, enforced:** `language` depends on nothing; `engine` depends only on
  `language`; `convert` depends on `engine` (and pandoc.wasm). **GPL never flows toward the engine.**
- The **engine has ZERO pandoc dependency** — cannot import, bundle, or require it to render.
- `convert` is a **separately distributable** deliverable (own repo, own LICENSE), so it's defensibly a
  distinct work, not a derivative that infects the engine.
The architecture decision (pandoc.wasm on one page only) and the license split must agree — the
one-page scoping *is* the firewall.

## License map (decided — Ariel, 2026-07-12)

The tentative choices above are now settled. Nothing about the repo's CURRENT licensing
changes before the physical split — everything ships MIT today and continues to; this
section records the decided destination, executed when the repos split.

- **enscribe-language** (the eHTML vocabulary, the shorthand spec, the taxonomies, the
  specs, the authoring docs): **CC-BY 4.0** — maximally implementable, attribution
  required. This follows the actual precedent of document languages: **HTML** (the WHATWG
  spec is CC-BY), **LaTeX** (free, with identity protection), **JATS** (public domain). A
  document language's value is universal implementability; copyleft on a language taxes
  exactly the adoption it needs.
- **enscribe-engine** (interpreter / renderer / editor / CLI): **MIT** — adoptable by
  anyone, including commercial products (the Posit/RStudio and AI-chat-vendor embedding
  cases are the goal, not an accident).
- **enscribe-convert** (import/conversion tooling): **GPL** — the original firewall,
  unchanged: this repo alone absorbs GPL-licensed conversion dependencies (pandoc.wasm),
  quarantined so the license cannot reach the engine.
- **The name** ("enscribe" / "eHTML") is protected by a **conformance clause, not
  copyright**: an implementation may describe itself as enscribe/eHTML-conformant only if
  it passes the language repo's conformance suite. This is the TeX/TRIP model — the
  license protects nothing about the name; the conformance sentence does. The suite is the
  existing engine-conformance test (the vocabulary examples with stored expected renders,
  `example-render.test.js`), which therefore becomes the language repo's PUBLIC definition
  of conformance at the split — it moves to (or is published by) the language repo, with
  the engine consuming it. That relocation is a Stage 2 dependency-map input (today the
  test lives engine-side after the Rule-1 allowlist went to zero).

**The recorded correction.** The original planning conversation had adopted GPL for the
language repo under a misreading of the HTML precedent (treating the language the way
copyleft treats code). The survey above is the correction: the languages that won —
HTML, LaTeX, JATS — are all maximally implementable, protecting identity through
attribution or conformance rather than through copyleft. The GPL keeps exactly one job in
this plan: quarantining GPL conversion dependencies inside enscribe-convert.

**Execution.** License files and package `license` fields change **at the physical split,
not before**; the conformance-clause text ships with the language repo's README/spec at
that time. Until then the monorepo remains uniformly MIT.

## Stage 0 — pre-carve the cut INSIDE the current monorepo (adopt now; low-risk; pure prep)
Do this before anything moves. It makes the eventual split a non-event.
- **Named package boundary:** wherever the engine, the docs generator, or the freshness guards consume a
  language/spec file, route it through a **named package `@enscribe/language`** — imported *by name*,
  never by relative path (`../language/…`). Keep them in one repo as a workspace; the engine depends on
  `@enscribe/language` via the workspace link. Nothing moves; the seam is now where the future cut is.
- **One-way dependency check in CI:** a lint/test that fails if any file in the language layer imports
  from the engine layer. You're "ready to split" when this has been green for a while — discovered
  continuously, not mid-migration.
- **The real work here:** the docs generator and `check-data-fresh` currently read spec files *directly*.
  Converting them to consume `@enscribe/language` by name is Stage 2's dependency-map turned into an
  actual refactor. Do it now, against the boundary, while everything's in one testable repo.

### Stage 0 — as built
The named package is the existing **`@enscribejs/ehtml`** (no umbrella `packages/language` package
earned itself yet — ehtml is the only code-consumable language artifact; the specs-as-artifact
question is Stage 2's). The guard is `scripts/check-boundary.mjs`, wired as `npm run check:boundary`
into the root `test` script and CI. It enforces four rules: language code never imports the engine
(imports, not substrings); language manifests never depend on engine packages; nothing outside the
language layer reaches `packages/ehtml` internals by path (consumption is by package name only); and
engine-side code never reads the prose surface (`notes/`, `DESIGN.md`) by filesystem path — comments
citing specs as source-of-record are fine.

The crossings, as tracked by the guard's allowlists:
- Rule 1/1b (language→engine): **empty — the Stage 1 precondition is met.** The one crossing that
  existed — `packages/ehtml/test/example-render.test.js` plus its `@enscribejs/enscribe`
  devDependency, the engine-conformance test — was relocated to the engine layer
  (`packages/enscribe/test/example-render.test.js`), where it consumes the vocabulary in the
  sanctioned direction, by package name. The standing rule: the Rule 1/1b allowlists must be
  empty for the split to proceed; any future entry is temporary by definition.
- Rule 2b (engine→prose): `packages/enscribe/test/coverage/gen-spec-data.mjs` — the spec→artifact
  generator reads three `notes/specs/` files at generation/drift-check time (never on the shipped
  test path). This is the Stage-2 "specs as a published artifact" question in live form; **the
  Stage 2 dependency map decides its home, and the entry must be resolved before the physical
  split.**

## Stage 1 — split out the non-code (notes + docs) → into `enscribe-language`
Safest first move: notes/docs have no imports, no build, nothing depends on them at runtime. Decided:
**docs + notes live in the language repo** (they're the open, non-code side of the real thing).
- **Required sub-decision (do NOT treat as plain `git mv`):** the notes (`reasoning-discipline.md`,
  `session-start.md`, `jats-is-not-the-center.md`, the decision lenses, `CLAUDE.md`) are what keep Claude
  and CC oriented. Moving them out naively breaks the collaboration — CC stops reading them. Choose a
  continuity mechanism: a git submodule of the language repo into the code repo, OR a synced copy, OR
  keep `CLAUDE.md` + a thin pointer in the code repo while the deeper notes live in language. Whatever's
  chosen, **every future CC session must still reliably read the guidance.** Make CC keeping this a
  priority an explicit directive.

## Stage 2 — down to specs + code; produce the dependency map
With the meta gone, the specs↔code coupling becomes *visible*. **Stage 2's deliverable is a map, not a
move:** every place code depends on a spec file (the generator reading `elements/*.md`,
`check-data-fresh`, `data.js` generation). If Stage 0 was done well, most of this is already routed
through `@enscribe/language`, so the map should mostly confirm a clean boundary — and reveal whether the
specs can move to their own repo cheaply or need a published-artifact boundary (specs published as a
package the engine consumes). Decide the spec-split here, informed by the map.

## Stage 3 — the Peggy grammar: language or engine? (decide AFTER Stage 2)
The grammar straddles the line: it *defines* valid shorthand (spec-like) but is *executable code the
engine runs* (implementation-like). The deciding question: **is the grammar the normative definition, or
an implementation detail?**
- If the normative prose specs (`shorthand-syntax.md`, `idioms.md`, the strict-mode rules) are the source
  of truth and the grammar is *one way to implement* them → grammar goes with the **engine** (MIT).
- If the grammar IS the definition → it goes with the **language** (permissive), and the engine consumes
  it. **Lean: implementation → engine**, because the project has consistently written normative prose
  specs with code matching them. Confirm against the Stage 2 map.

## `enscribe-convert` — its own GPL repo (can happen in parallel, anytime)
Move the pandoc.wasm convert tool to a separate GPL repo. It consumes the published MIT engine, loads
`pandoc.wasm` lazily (only when a user imports a file), and links from the Pages docs site. Its `convert`
return gives `mediaFiles` (extracted images as blobs) — feed those into the per-folder `<fig>` assets;
`query({query:"input-formats"})` lets the UI offer exactly the readers the binary has. (This is a
separate design note of its own — the import-architecture note — but the *repo* is part of this split.)

## Sequencing — WHEN
- **Stage 0 now** — pure prep inside the monorepo, low-risk, and it makes everything after cheap.
- **Stages 1–3 and the physical repo splits: after the first feedback round** (recommended). The split
  serves adopters and lawyers, not the first readers whose reactions you actually want — and it's a big
  inward-facing infra project that produces nothing a reader sees. Get eyes on the live site first.
  Exception: if any first-round viewers are the *institutional* adopters for whom the licensing story
  matters on day one, pull the split earlier.

## Invariants for every stage
- Green CI and the live Pages deploy stay intact at each step — verify against the CI sequence (Node 22),
  not local.
- The one-way dependency check stays green — nothing crosses the firewall the wrong way.
- Each stage is independently revertible; land them one at a time.
