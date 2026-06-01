# Phase 3 — frameable elements: Phase 0 findings

**Status:** read-only Phase 0 complete. No implementation; no product
code, no spec, no vocab changes. This file is the artifact the
implementation slice(s) will be built from — same role
`notes/archive/phase-findings-2026-05/phase2-handler-findings.md` played for the Phase 2 handler
bundle.

**Date:** 2026-05-27 (post-`7001aaa`, post-Phase-2-close).
**Recommendation at end:** SPLIT (numbering-extension first, frameable
build second, caption-as-content third). Rationale in the
"Bundle vs split" section.

## Phase 3 scope as inherited

The frameable-class design was settled by `1d100eb` and recorded as
`DESIGN.md` §"Frameable elements: a shared capability." Phase 3 in
ROADMAP.md L153-176 has three items:

1. **Frameable-class Phase 0** *(filed by `1d100eb`)* — this slice.
   Confirms the member list and surfaces per-member shape questions.
2. **Frameable-class build** — the shared capability and per-member
   wiring.
3. **Caption-as-content for `<table>`, `<figure>`, similar (DD-1 /
   DD-2 implementation)** *(formerly AUD-14)* — captions become
   first-class child content so citations inside captions parse
   naturally.

The settled design (`DESIGN.md` L378-410): frameable is a *shared
capability* across distinct elements, not an umbrella element.
Settled members: `<fig>`, `<table>`, `<code>`, `<svg>`, `<mermaid>`,
`<frame>`. Open: "the exact membership list of the frameable class
… the full enumeration of DSL-registry block elements that take the
frameable capability is to be confirmed by the Phase 0."

`DESIGN.md` L388: each frameable element carries "the *identical*
attribute set and the *identical* behavior — title, caption, border,
numbering — because the capability is shared." Authoring "does not
nest an inner content element inside an outer wrapper; the frameable
element *is* the construct."

## Q1.1 — what `1d100eb` filed

**BACKLOG checklist (L122-123):**

> - [ ] **Build the frameable-class capability** `[cross-cutting]`
>   `[alpha]` *(→ roadmap: Phase 3)* *(filed by `1d100eb`)*

**BACKLOG detailed entry (L455-466):**

> ### Build the frameable-class capability
> `[cross-cutting]` `[alpha]` *(→ roadmap: Phase 3)*
>
> A capability shared by `<fig>`, `<table>`, `<code>`, `<svg>`,
> `<mermaid>`, other DSL-registry block elements, plus the generic
> `<frame>`. Settled design (recorded in `DESIGN.md` via `1d100eb`):
> optional outline box, optional title (top), optional caption
> (bottom); numbering folded into caption/title rendering, not a
> separate field. `<figure>` is an accepted authoring alias for the
> canonical `<fig>`, normalized at the lift gate. The build needs a
> Phase 0 first to confirm exact frameable membership and per-member
> shape divergences. *(filed by `1d100eb`)*

**Caption-as-content BACKLOG entry (L119-121, tagged Phase 3):**

> - [ ] **Support caption-as-content for `<table>`, `<figure>`, similar
>   (DD-1 / DD-2 implementation)** `[cross-cutting]` `[alpha]`
>   *(→ roadmap: Phase 3)* *(formerly AUD-14)*

**`1d100eb` commit context**: the frameable section in DESIGN.md was
*recorded* (the design was settled in chat); the slice did not
implement. The recording slice filed both items above for Phase 3.

**Open question named by the filing**: "The exact membership list of
the frameable class … to be confirmed by the Phase 0 (the Phase 0
enumerates current DSL-registry members and rules each one frameable
or not)." This Phase 0 is the answer.

## Q1.2 — vocabulary inventory

`packages/layer1-vocabulary/elements/` holds 107 vocab files. The
candidate frameable elements per the inventory script and DESIGN.md
filing:

| Tag             | caption | numbered | id | content.type | strategy | Note |
|---|---|---|---|---|---|---|
| `figure`        | -       | Y        | Y  | prose       | handler  | The old umbrella; vocab still exists but post-`1d100eb` it's an authoring alias for canonical `<fig>` — alias machinery not yet built |
| `fig`           | MISSING | -        | -  | -           | -        | **Canonical name per DESIGN.md but no vocab entry exists yet** |
| `img`           | -       | -        | Y  | none        | schema   | Void element; not block-frameable on its own per the new design (every image is a `<fig>`) |
| `table`         | Y       | Y        | Y  | opaque      | handler  | Already has caption + numbered |
| `code`          | -       | -        | Y  | opaque      | handler  | Inline-shape today; block code via `code-block` sigil. Listed in DESIGN.md frameable membership |
| `code-block`    | -       | -        | Y  | opaque      | handler  | The block-code sigil's canonical form |
| `svg`           | MISSING | -        | -  | -           | -        | **No vocab entry**; named in DESIGN.md membership |
| `mermaid`       | Y       | -        | Y  | opaque      | handler  | Slice 2c shipped with caption support; not numbered today |
| `abc`           | Y       | -        | Y  | opaque      | handler  | Same shape as mermaid |
| `csv`, `tsv`    | Y       | -        | Y  | opaque      | handler  | Slice 2a shipped with caption support; not numbered today |
| `math`          | -       | -        | Y  | opaque      | handler  | Long-form `<math>` (slice 2b) |
| `display-math`  | -       | Y        | Y  | opaque      | handler  | The numbered block math |
| `matrix`, `cases`, `align`, `eqnarray` | - | - | Y | opaque | handler | Slice 2b math envs; not numbered today |

Settled-frameable per DESIGN.md L386: `<fig>`, `<table>`, `<code>`,
`<svg>`, `<mermaid>`, `<frame>`. Of those, **`<fig>`, `<svg>`, and
`<frame>` have NO vocab entries today** — they need to be created as
part of the Phase 3 build (or a precursor vocab slice).

**Other DSL-registry block elements** to assess for frameability (per
the open membership question):

- `<abc>` — same shape as `<mermaid>` (external DSL, captionable);
  belongs in the frameable class.
- `<csv>`, `<tsv>` — already caption-capable; semantically tables;
  belong in the frameable class (their output IS a `<table>` —
  whether they get their *own* frameable membership or get rendered
  through `<table>`'s frameable capability is a design call recorded
  below in Q1.5).
- `<display-math>` — block-level, numbered, has `id`; semantically a
  numbered float (an "equation"). Belongs in the frameable class
  conceptually but its `<display-math>` rendering shape is *not*
  caption-bearing today — its "label" is the equation number `(N)`
  rendered after the formula. Whether this counts as a frameable
  caption is a design call (Q1.5).
- `<matrix>`, `<cases>`, `<align>`, `<eqnarray>` — block-level math
  envs; not numbered today (Phase 2 slice 2b finding). They render
  via `<math>`'s handler. If they're frameable, they'd carry the
  same numbering/caption capabilities as `<display-math>`.
- `<math>` long-form — equivalent to `<display-math>` semantically.

**Theorem family** (`<theorem>` and its seven siblings — all `prose` /
`schema` strategy, all carry `numbered`): block-level, ID-bearing,
numbered. They are theorem-family elements per `DESIGN.md`. **Are
they frameable?** They share the structural shape (block + ID +
number) but DESIGN.md L386's settled member list does not include
them. The `<theorem>` family conventionally renders as "Theorem 3.2
(Pythagoras):" — a label, but the *whole element is the label*
rather than a separate caption attached to a body. They probably
*are* frameable in the abstract sense but their cross-reference
rendering convention is different from `<fig>`/`<table>`'s (Theorem
N vs. Figure N). Including them in the frameable class extends the
abstraction; excluding them keeps it tighter. **Design call to
record explicitly.**

**Edge cases worth flagging:**

- `<aside>` and `<blockquote>` — block-level, ID-bearing. Not
  caption-bearing today. Could become frameable for numbered
  callout boxes but it's a stretch — these are typically unnumbered
  inline-flow content. Recommendation: NOT frameable.
- `<note>` — block-level when authored as a block; numbered for
  endnote/footnote lists; ID-bearing. Not a candidate frameable —
  it renders inline as a numbered marker plus a list entry, not as
  a captioned float.

## Q1.3 — existing infrastructure survey

### Numbering registry — `packages/enscribe-core/src/registry.js`

The registry is a generic per-type counter. From the header (L1-22):

> Used by structural plugins (notes, equations, figures, tables) to
> assign sequential numbers to document elements, look up entries by
> id, and enumerate all entries of a type.
>
> Each "type" (e.g., "note", "equation", "figure") has its own
> independent numbered counter.

`registry.assign(type, providedId, { numbered, data })` (L62-76) returns
`{ type, id, number: undefined, numbered, data }`. After
`registry.numberRegistry()` runs, `entry.number` is filled in for
numbered entries. Each *type* (string) has its own counter; the
registry doesn't care which tagnames go to which types.

### NUMBERED_TAGNAMES — the tagname→type mapping

In `packages/enscribe-interpreter/src/plugins/numbering.js:43-47`:

```js
const NUMBERED_TAGNAMES = new Map([
  ['display-math', 'equation'],
  ['figure',       'figure'],
  ['table',        'table'],
]);
```

Plus `SECTION_TAGNAMES = ['section', 'sub-section', 'sub-sub-section']`
(L57; sections are registered with `numbered: false` for cross-ref
lookup only).

This is the table that gets *extended* whenever a new tagname needs
counter assignment. Adding the theorem family (or math envs) means
adding entries here. **No per-vocab-entry flag** — the table is
hardcoded in `numbering.js`. Extending it is a small mechanical
edit; the registry generic machinery already supports any number of
types and any number of tagnames per type.

### CONFIG_KEY — per-type config suppression

L51-55:

```js
const CONFIG_KEY = {
  equation: 'number-equations',
  figure:   'number-figures',
  table:    'number-tables',
};
```

The `<config>` per-document numbering-suppression keys. Adding a new
type means adding a config key here too, plus a vocab `notes:`
mention.

### Cross-reference resolution — `ref-resolution.js`

`<ref @id>` looks up the target by colon-id in the label index. The
display text is computed from the id's colon-prefix via
`DEFAULT_PREFIXES` (L40-51):

```js
const DEFAULT_PREFIXES = {
  eqn: 'equation', fig: 'figure', note: 'note', tab: 'table',
  sec: 'section', code: 'listing',
  thm: 'theorem', lem: 'lemma', def: 'definition', ex: 'example',
};
```

Already includes theorem-family prefixes (`thm`, `lem`, `def`, `ex`).
Per-document override via `ref-prefix-{prefix}` config kwarg
(e.g. `ref-prefix-eqn="Eq."`).

A target registered with `numbered: false` renders as its label-tail
("energy" from `#eqn:energy`) instead of a number — already supported
by `computeRefText`.

### Caption handling — figure.md / table.md / handlers

**Figure caption**: `figure.md` declares no `caption` kwarg today.
`handlers/figure.js:25-27` says the pipe content becomes the
figcaption: "for slice 1 we treat all pipe content as the figcaption."
So `<figure src=x.jpg | caption text>` → figcaption is the pipe
content. The figure-as-pipe-caption model.

**Table caption**: `table.md` declares `caption` as a kwarg
(`<table csv caption="Table caption" | data>`). `handlers/table.js`
emits `<caption>caption text</caption>` inside the rendered `<table>`,
with a `Table N.` label prepended when numbered. Two different
caption-acquisition shapes today — figure uses pipe content; table
uses a kwarg.

**Other handlers** (mermaid, abc, csv, tsv) — all use the `caption`
kwarg shape per their slice-2a/2c vocab entries; emit a
`<figcaption>` sibling element after the rendered output.

### Label / id handling

Each handler builds `properties.id = node.id` directly on the
rendered wrapper. Cross-reference resolution uses
`registry.findByLabel(colonId)` which returns the entry; the entry
carries `id` and (after `numberRegistry()`) `number`. Authors use
colon-ids (`fig:scatter`, `tab:revenue`, `eqn:newton`) for cross-
referenceable labels.

## Q1.4 — per-element shared-vs-specific analysis

Per the DESIGN.md design ("identical attribute set and identical
behavior"), the **shared frameable surface** should be:

- **`id`** — cross-reference target (always optional but always
  carried through).
- **`title`** — optional title rendered at top of the frame
  ("Pythagoras" in "Theorem 1.2 (Pythagoras)"; an authored title for
  a figure that wants one beyond the caption).
- **`caption`** — optional caption rendered below the frame, with
  the number-and-label prefix folded into the rendering
  ("Fig. 3: A scatter plot...").
- **`border`** — optional outline box (CSS-level convention; the
  attribute marks intent, theme stylesheets implement).
- **`numbered`** — opt-in boolean (defaults true for frameable
  elements with a registered counter; `-numbered` suppresses).

The **specific surface per member** is the body content and its
rendering:

| Element | Body content | Counter type | JATS counterpart |
|---|---|---|---|
| `<fig>` | image (from `source`) or arbitrary inner content | `figure` | `<fig>` |
| `<table>` | data string (csv/tsv/json/yaml/md) | `table` | `<table-wrap>` |
| `<code>` (block-level usage) | code source | `listing` | `<code>` |
| `<svg>` | inline SVG source | TBD (likely `figure`) | `<graphic>` |
| `<mermaid>`, `<abc>` | DSL source (external rendering) | TBD (likely `figure`) | `<graphic>` |
| `<csv>`, `<tsv>` (standalone) | data source | `table` (shared with `<table>`? or own?) | `<table-wrap>` |
| `<display-math>`, `<math>` (long-form) | LaTeX | `equation` | `<disp-formula>` |
| `<matrix>`/`<cases>`/`<align>`/`<eqnarray>` | LaTeX env body | `equation` (shared) | `<disp-formula>` |
| `<frame>` (generic) | arbitrary inner content | `figure` (probably) | `<boxed-text>` or similar |
| **theorem family** (if frameable) | prose body | `theorem-family` (shared for thm/lem/cor/prop), separate counters for `definition` / `example` | `<statement content-type="X">` |

### Numbering convention per element

Already-numbered tags (NUMBERED_TAGNAMES):
- `display-math` → `equation` counter
- `figure` → `figure` counter
- `table` → `table` counter

Designed-to-be-numbered but **not yet wired** (Phase 0 finding):
- `math` long-form → should share `equation` with `display-math`
- `matrix`, `cases`, `align`, `eqnarray` → should share `equation`
- `code-block` (and `<code>` block usage) → `listing` counter (the
  DEFAULT_PREFIXES already has `code: 'listing'`)
- `theorem`, `lemma`, `corollary`, `proposition` → share
  `theorem-family` counter (per the sub-slice 3 STATUS milestone)
- `definition` → own `definition` counter
- `example` → own `example` counter
- `<mermaid>`, `<abc>`, `<csv>`, `<tsv>`, `<svg>`, `<fig>`, `<frame>`
  → share `figure` counter (or their own, per design call)

The frameable build must reconcile all of these into the NUMBERED_TAGNAMES
table.

## Q1.5 — caption-as-content design question

### Current model (mixed across elements)

- **`<figure>`** (pre-frameable): pipe content IS the caption.
  `<figure src=x.jpg | caption text>` → figcaption is the pipe content.
- **`<table>`**: `caption` kwarg. Value is a plain string.
- **`<mermaid>`, `<abc>`, `<csv>`, `<tsv>`**: `caption` kwarg. Value
  is a plain string. (Slice 2a + 2c convention.)
- **`<display-math>`**: no caption attribute today; the number `(N)`
  appears after the formula as a label.

### Why caption-as-content matters

The AUD-14 BACKLOG entry (L429-453) names the problem:

> citations inside the `caption=` kwarg of `<table>`, `<figure>`, and
> similar elements are not parsed — the kwarg value is a string, cite
> tags inside it remain literal text in the rendered output. Affects
> any kwarg where rich content might be desirable (figure captions,
> alt text, etc.).
>
> Tied to design directions DD-1 ("content gets parsed; arguments
> don't") and DD-2 ("tags with caption-like content support two
> equivalent forms").

The two architectural options from L445-451:

> - **Option A (recommended at filing):** captions become first-class
>   child tags rather than attribute values:
>   `<table #tab:burnout csv | ...> <caption | Risk and protective
>   factors, adapted from <cite Mantzalas2022>>`. Recursive content
>   parsing handles citations naturally. Matches Pandoc/Quarto
>   conventions where captions are markdown blocks.
> - **Option B:** attribute values get recursive parsing —
>   `caption="text <cite key>"` would parse the value as enscribe
>   content. More invasive parser change; affects all attribute values,
>   not just captions.

**Option A is the recommended-at-filing path** and aligns with
DD-1/DD-2 (content gets parsed; arguments don't). For frameable
elements specifically, this means: **`<caption>` becomes a child tag
position in every frameable element**, parallel to how
structured-data containers (`<meta>`, `<author>`) accept child tags.

### Precedents

- **JATS**: `<caption><title>…</title><p>…</p></caption>` is a child
  element of `<fig>`/`<table-wrap>`/etc. **Already child-tag-shaped.**
- **LaTeX**: `\caption{…}` is content-shaped inside the float
  environment.
- **HTML5**: `<figcaption>` is a child of `<figure>`; `<caption>` is
  a child of `<table>`. **Already child-tag-shaped** in HTML5.
- **Pandoc/Quarto**: captions as markdown blocks inside the figure
  syntax. Child-tag-shaped.

All four precedents converge on child-tag captions. Option A matches
all four; Option B does not match any.

### Recommendation

**Adopt Option A**: `<caption>` is a child tag position on every
frameable element. The legacy `caption="..."` kwarg form stays
accepted for backward compat (and for simple plain-text captions
where rich content isn't needed) and lifts to a `<caption>` child
tag at the normalize-to-canonical gate — same kwarg-to-child-tag
pattern the structured-element infrastructure (`<meta>`, `<author>`)
already uses (`beb2fb3`).

The frameable element's render path then sees a uniform
`<caption>` child position regardless of authoring surface.

**Design call to record explicitly during the implementation slice**:
whether to support the kwarg form indefinitely (backward compat) or
eventually deprecate it. Recommendation: keep both forms permanently
(consistent with the dual `<meta>` / `<author>` kwarg+child-tag
pattern).

## Q1.6 — backlog and roadmap state for Phase 3

**ROADMAP Phase 3** (L153-176, verbatim):

> ## Phase 3 — Frameable elements *(alpha — supports lines 1 and 2)*
>
> A capability shared by `<fig>`, `<table>`, `<code>`, `<svg>`,
> `<mermaid>`, other DSL-registry block elements, plus the generic
> `<frame>`. Settled design: optional outline box, optional title (top),
> optional caption (bottom); numbering folded into the caption/title
> rendering, not a separate field. `<figure>` is an accepted authoring
> alias for the canonical `<fig>`, normalized at the lift gate.
>
> The phase runs a **Phase 0 first** to confirm the exact frameable
> membership list and any per-member shape divergences before building.
>
> **Items, in order:**
>
> - **Frameable-class Phase 0** *(filed by `1d100eb`)*. Confirms the
>   member list and surfaces per-member shape questions.
> - **Frameable-class build.** The shared capability and the per-member
>   wiring.
> - **Caption-as-content for `<table>`, `<figure>`, similar (DD-1 / DD-2
>   implementation)** *(formerly AUD-14)*. Captions become first-class
>   child content rather than attribute strings; citations inside
>   captions then parse naturally.
>
> **Exits:** every alpha-tagged frameable element renders with the
> shared capability; captions accept rich content.

**BACKLOG Phase-3-tagged items** (all `[alpha]`):
- `caption-as-content` (L119-121; detailed L429-453) — *(formerly AUD-14)*
- `Build the frameable-class capability` (L122-123; detailed L455-466)

Consistent across views. No drift.

## Q1.7 — intersections with other open work

### Theorem-family numbering

Recorded in the deferred-vocab sub-slice 3 milestone (STATUS.md) as
an escape-hatch finding: "the vocab schema has no mechanism for
declaring 'shares a counter with these other elements' … the
shared-counter wiring is recorded in prose only … The Phase-2
handler will implement the shared-counter wiring by extending
NUMBERED_TAGNAMES (or its replacement)."

The DSL/long-form parser bug fix (`dfdb4f0`) confirmed theorem
family is regular vocabulary, not Phase 2 handler work. The
shared-counter wiring is now **frameable-implementation work** if
the theorem family is rolled into the frameable class, OR
**separate regular-vocabulary work** if it isn't.

### Math-envs numbering

Phase 2 slice 2b deliberately did NOT extend NUMBERED_TAGNAMES for
the math envs (matrix/cases/align/eqnarray) or the long-form
`<math>` — the slice's STATUS note records this as out-of-scope:
"The new tags don't get auto-numbered. The handler's numbering
branch fires only for `display-math` (preserving existing behavior);
the integration of new envs into the numbering registry is regular-
vocabulary work, scheduled separately if needed."

Same bucket: extending NUMBERED_TAGNAMES for math envs is either
frameable-implementation work (if math envs are frameable) or
separate work.

### Author override for footnote-collection depth

Filed `[post-alpha]` in the Phase 2 closure slice (`7001aaa`). Not
related to frameable infrastructure — footnotes have their own
plugin path. Confirmed: not a frameable concern.

### Intersection summary

Both deferred numbering items (theorem family, math envs) intersect
with frameable infrastructure if those elements are in the frameable
class. They share the same mechanical change: **extend
NUMBERED_TAGNAMES (and CONFIG_KEY) to add the new tagnames with
their counter-type assignments.**

The work is small per element (one-line additions to two
hardcoded Maps). The design call is *which counter each new tagname
shares*. Per Q1.4's analysis:

- math envs (matrix, cases, align, eqnarray) + `<math>` long-form
  → share `equation` (with display-math).
- theorem, lemma, corollary, proposition → share `theorem-family`
  (new counter).
- definition → own `definition` counter (new).
- example → own `example` counter (new).
- `<mermaid>`, `<abc>`, `<csv>`, `<tsv>` → share `figure` (with
  figure; treats them as "this is a numbered float of figure type")
  OR own counters per kind (the design call recorded above).

**Recommendation:** bundle the numbering-extension work into Phase 3
as a *precursor slice* to the frameable build. It's mechanical, it
unblocks both theorem and math-env numbering, and it sets up the
NUMBERED_TAGNAMES table the frameable build will already need to
extend for the frameable members.

## Bundle vs split recommendation

**Recommendation: SPLIT into three slices.**

Order: **3a → 3b → 3c.**

- **Slice 3a — Numbering-registry extension.** Add NUMBERED_TAGNAMES
  entries for the theorem family (with shared counter), math envs +
  long-form `<math>` (shared with display-math), and `<code-block>`
  (listing counter). Add the corresponding CONFIG_KEY entries. Extend
  the shared-counter mechanism in `numbering.js` to support multi-
  tagname-to-one-type mappings (the existing Map already does this
  implicitly — multiple keys map to the same value — but the visitor
  loop iterates the map, so each tagname gets its own visitor for
  the same registry-type; that needs verification). Small focused
  slice. Fixture coverage: a document with theorems, math envs, and
  block code — assertions on rendered numbers.
- **Slice 3b — Frameable-class build.** Create `<fig>`, `<svg>`,
  `<frame>` vocab entries (missing today). Reconcile `<figure>` as
  an authoring alias for `<fig>` at the lift gate. Build the shared
  frameable rendering capability: the title-top, caption-bottom,
  border, number-folded-into-label rendering shape. Per-element
  handlers consume the shared capability via a common helper (the
  same pattern slice 2a's `renderParsedTable` established). The
  members per Q1.2: `<fig>`, `<table>`, `<code>` (long-form),
  `<svg>`, `<mermaid>`, `<abc>`, `<csv>`, `<tsv>`, `<frame>`,
  `<display-math>`, `<math>` long-form, math envs. Theorem family
  inclusion: design call recorded in Q1.2; recommend including for
  consistency. Medium slice; the dominant work is the new vocab
  entries (three new tags) + the shared rendering helper.
- **Slice 3c — Caption-as-content (Option A).** Implement
  `<caption>` as a child tag position on every frameable element.
  Lift `caption=` kwarg form to `<caption>` child at the
  normalize-to-canonical gate (per the structured-element
  precedent). Update each frameable handler to read the
  `<caption>` child instead of (or in addition to) the kwarg.
  Recursive content parsing handles citations inside captions
  naturally (the goal of AUD-14). Small-medium slice; touches every
  frameable handler.

Phase 3 closes when all three sub-slices land.

**Alternative — BUNDLE:** doable but creates a large slice (~5-7
new vocab entries + handler refactors across ~10 elements + the
numbering-extension work + caption-as-content). Each sub-slice on
its own has a coherent test surface (slice 3a tests numbering;
slice 3b tests frameable rendering; slice 3c tests caption-as-content
end-to-end). Splitting makes each slice's snapshot audit tractable
and lets each land independently.

### Three sibling cleanup items worth filing or bundling

- **`<author>` `notes/handler_responsibilities` style mismatch** —
  not a frameable concern, but observed during the inventory.
  Several vocab entries use `handler_responsibilities:` (figure,
  table); others don't. Cosmetic; not Phase 3 work.
- **`<figure>` vs `<fig>` alias activation** — the alias machinery
  doesn't exist yet (no lift rule converting `<figure>` → `<fig>`).
  Belongs in slice 3b.
- **Theorem-family `name` kwarg rendering** — sub-slice 3 left the
  `name` kwarg as a `data-name` attribute pass-through; the
  Phase-2 handler that was supposed to render "(Pythagoras)" was
  retired. The frameable-class handler (slice 3b) could pick this
  up as part of the title rendering (the `name` kwarg becomes the
  optional title for theorem-family elements). Bundle into 3b.

## What is recorded vs. what is open

Recorded:
- Q1.1 — the BACKLOG entry the Phase 0 was filed against
- Q1.2 — vocab inventory with the frameable shape per element;
  three missing vocab entries flagged (`<fig>`, `<svg>`, `<frame>`)
- Q1.3 — numbering registry / NUMBERED_TAGNAMES / ref-resolution /
  caption-handling infrastructure with file:line references
- Q1.4 — per-element shared-vs-specific analysis with proposed
  shared frameable surface
- Q1.5 — caption-as-content recommendation (Option A; child-tag
  position with kwarg-form backward-compat via lift)
- Q1.6 — Phase 3 backlog/roadmap state (consistent across views)
- Q1.7 — intersections with deferred numbering work (theorem
  family, math envs) and recommendation to bundle into slice 3a

Open (decisions deferred to implementation slices or chat):
- Theorem family inclusion in the frameable class (Q1.2 design call)
- Counter assignment for each frameable member (Q1.4 table; some
  obvious (math envs → equation), some design calls
  (mermaid/abc/csv/tsv → shared figure or own counters))
- Whether to deprecate the `caption=` kwarg form eventually
  (Q1.5 recommendation: keep permanently)
- Whether `<aside>` / `<blockquote>` are frameable (Q1.2
  recommendation: NOT frameable)
- The shared-counter wiring mechanism in numbering.js (Q1.7 — the
  existing Map structure may already support it; needs verification
  during slice 3a implementation)
