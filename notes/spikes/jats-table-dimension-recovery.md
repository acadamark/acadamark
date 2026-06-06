# Spike findings — JATS table dimension-recovery (read-only, Phase-0)

*Status: findings report. No production code touched, no fixtures, no commits.
Throwaway probe script: `/tmp/table_spike.py` (walks the source JATS, prints grid
structure; does not import or call the shipped importer). Input: the four
`<table-wrap>` elements (T1–T4) of `packages/cli/test/fixtures/pnas_sample.xml`.*

## TL;DR — the headline finding

The two tables that **most** need a dimensional model (the genuine crosstabs T1
and T2) are exactly the two where recovery is **ambiguous**. The two where
recovery is **confident** (T3, T4) are near-flat relational tables that barely
need the model. So on this paper, native dimensional recovery would confidently
fire only on the tables that least benefit, while the showcase crosstabs fall
back to Design A regardless.

| Table | Shape | Confident dimensional? | Deciding factor |
|---|---|---|---|
| **T1** Children's genotype | 3×3 genotype crosstab | **No → Design A** | column-member labels are in `<td>`, not `<th>`; "corner" stub layout; set-valued cells |
| **T2** Transmission probabilities | 3 row-dims × 1 col-dim | **No → Design A** (strongest) | a whole dimension (disease stage) exists only as single-cell subheading rows; header columns don't align with body columns |
| **T3** Progression rates | 2 row-dims, 1 measure (relational) | **Yes** | clean `<th>` header + first-column blank forward-fill |
| **T4** Parameter values | 1 key + 2 measures (relational) | **Yes** | clean header, no spans/subheadings, unique first-column key |

Every table also carries presentation noise (`<hr/>` divider rows) that any
recovery must discard. None of the four contains a units row or a totals/summary
row — so §8.5 and §8.6 are **not exercised by this paper** (they remain real
general risks, just unproven here).

This is direct evidence for the design review's concern #1: the dimensional
model's payoff on the acceptance set is smaller than §1 implies, because the
hard tables fall back anyway. It strengthens the **two-tier floor** (confident →
native; else → Design A) and argues for the **read-only-spike-first, retire-
Design-A-never** posture.

---

## Per-table findings

### T1 — "Children's genotype" — AMBIGUOUS → Design A

Conceptually a clean crosstab: **Father genotype × Mother genotype → set of
possible children genotypes.**

```
dimensions:
  - name: father_genotype   # ROW
    members: [W/W, W/Δ32, Δ32/Δ32]
  - name: mother_genotype   # COL  (spanner "Mother", colspan=4)
    members: [W/W, W/Δ32, Δ32/Δ32]
measures:
  - name: children_genotypes   # implicit, single; SET-VALUED
    type: inline                # χ symbols w/ subscripts; multiple per cell
facts (sample):
  {father: W/W,    mother: W/W}    -> "χ₁,ⱼ"
  {father: W/Δ32,  mother: W/Δ32}  -> "χ₁,ⱼ, χ₂,ⱼ, χ₃,ⱼ"
display: { rows: [father_genotype], cols: [mother_genotype] }
```

**Ambiguity log:**
- The column-member labels (`W/W`, `W/Δ32`, `Δ32/Δ32`) sit in row 2 as **`<td>`,
  not `<th>`** — the markup gives *no* signal that row 2 is a header. Only
  content inference (these labels reappear as the row-axis members) recovers it.
- "Corner" layout: the stub label "Father" is in row 2 col 1; the row-members
  are in rows 3–5 col 2; rows 3–5 col 1 are **empty**. Header and body interleave.
- The `colspan="4"` spanner ("Mother") covers 4 columns, but there are only 3
  member columns — the count doesn't reconcile (it absorbs the empty stub column).
- The measure values are **set-valued** ("χ₁,ⱼ, χ₂,ⱼ") — not scalars.

**Deciding factor:** column headers in a `<td>` row with no header markup. A
markup-only heuristic mis-reads row 2 as data. → fall back to Design A.

### T2 — "Transmission probabilities" — AMBIGUOUS (strongest) → Design A

Conceptually a 4-way crosstab: **disease stage × infected-partner genotype ×
transmission direction → (susceptible-partner genotype) → probability.**

```
dimensions:
  - name: disease_stage           # ROW — encoded as SUBHEADING ROWS
    members: [Acute/primary, Asymptomatic]
  - name: infected_genotype       # ROW — col 1, blank forward-fill
    members: ["W/W or Δ32/Δ32", "W/Δ32"]    # NOTE: compound/set member
  - name: direction               # ROW — col 2
    members: [M to F, F to M]
  - name: susceptible_genotype    # COL — 3 members (cols 3–5)
    members: [W/W, W/Δ32, Δ32/Δ32]
measures:
  - name: transmission_probability  # implicit, single
    type: number
facts (sample):
  {stage: Acute/primary, infected: "W/W or Δ32/Δ32", dir: M to F, susceptible: W/W} -> 0.040
  {stage: Asymptomatic,  infected: "W/Δ32",          dir: F to M, susceptible: Δ32/Δ32} -> 2.5e-6
display: { rows: [disease_stage, infected_genotype, direction], cols: [susceptible_genotype] }
```

**Ambiguity log:**
- **Disease stage is a whole dimension encoded as single-cell subheading rows**
  (`<td>Acute/primary</td>` alone; probe flagged rows 4 and 9). No colspan, no
  `<th>`, no attribute distinguishes it from a divider or a stray cell.
- **Header/body column misalignment:** header row 0 = 2 cells (effcols 5), row 2
  = 4 `<th>` (effcols 4), body = 5 columns. One header cell ("(ǐ to j)") covers
  the two stub columns (genotype + direction); the markup spans don't reconcile.
- Blank forward-fill on col 1 (infected genotype carried down).
- Compound member "W/W or Δ32/Δ32" (a *set*, treated as one label).
- Em-space (`&#x2003;`) indentation is the only signal grouping the infected-
  genotype rows under a stage subheading.
- Two `<hr/>` rows with **inconsistent** colspans (4 then 5).

**Deciding factor:** a dimension that exists only as subheading rows, invisible
to every markup heuristic. Recovering it requires guessing that single-cell rows
are a categorical axis — exactly the guess the policy forbids. → Design A.

### T3 — "Progression rates" — CONFIDENT (relational) → native candidate

```
dimensions:
  - name: genotype       # col 1, blank forward-fill
    members: [W/W, W/Δ32, Δ32/Δ32]
  - name: disease_stage  # col 2
    members: [A, B]
measures:
  - name: rate           # col 3 ("Males/females" = the measure label; one value, gender-collapsed)
    type: number
facts (all 6):
  {genotype: W/W,     stage: A} -> 3.5      {genotype: W/W,     stage: B} -> 0.16667
  {genotype: W/Δ32,   stage: A} -> 3.5      {genotype: W/Δ32,   stage: B} -> 0.125
  {genotype: Δ32/Δ32, stage: A} -> 3.5      {genotype: Δ32/Δ32, stage: B} -> 0.16667
display: { rows: [genotype, disease_stage], cols: [] }   # long form
```

**Ambiguity log:**
- Drop the `<hr/>` row (row 1).
- Forward-fill col 1's empty `<td/>` (genotype carried down) — probe: 3 empty tds.
- Minor: "Males/females" is the measure label (gender is collapsed, one value),
  not a third dimension. A heuristic could over-split it into a gender dimension;
  here it must not.

**Deciding factor:** clean `<th>` header, consistent 3 columns, first-column
blank forward-fill → an unambiguous 2-dimension long table.

### T4 — "Parameter values" — CONFIDENT (relational) → native candidate

```
dimensions:
  - name: parameter      # col 1 — the key (19 members; degenerate dimension)
    members: [μ_F/μ_M, μ_χ, B_r, SA_F, SA_M, m_F, ς², 1−p_v, I(0), χ(0),
              W/W(0), W/Δ32(0), Δ32/Δ32(0), r_M/r_F, ϕ_F/ϕ_M, ɛ, δ, q]   # symbols carry inline math
measures:
  - name: definition   type: inline   # prose, may contain an <xref> (row 17 → Table 2)
  - name: value        type: inline   # number + unit as prose ("0.015 (0.016) per year")
display: { rows: [parameter], cols: [] }   # 2 measures side-by-side as columns
```

**Ambiguity log:**
- Drop the `<hr/>` row.
- The "Parameter" key is a degenerate dimension (one member per row, no
  aggregation). Modeling choice: key vs dimension — immaterial to rendering.
- **Units live inside the Value cell as prose** ("per year", "%", "per birth") —
  *not* a separate column or header row. No structured unit anywhere.
- Cells carry the inline content this whole effort is about: two `<inline-formula>`
  (rows 7, 8) and one `<xref>` (row 17). These already convert correctly under
  #105/#106.

**Deciding factor:** clean single-row header, no spans, no subheadings, unique
first-column key → flat relational with two measures.

---

## Cross-cutting answers to the design's open questions

**§8.4 — detection heuristics & where they fail.** Markup is *not* a reliable
signal:
- `th`/`td` is unreliable: T1 puts column members in `<td>`; T2 puts them in
  `<th>`. **The same publisher encodes equivalent structures differently within
  one paper.** No heuristic can lean on a markup convention even document-locally.
- `<hr/>` divider rows are universal noise (all four tables) and must be dropped
  before anything else — but they masquerade as `colspan` cells.
- `colspan` spanners are real (T1/T2 column dimensions) but their counts don't
  reconcile with body columns (T1: 4 vs 3; T2: header 4 vs body 5).
- Confident recovery succeeded only on the two tables with a **clean single
  `<th>` header row + (optionally) blank forward-fill** (T3, T4). Everything
  fancier (T1, T2) needed a guess. **2 of 4 hit the fall-back.** This validates
  the standing "never guess → Design A" policy: it fires on exactly the cases
  where it should.

**§8.5 — units.** *Not exercised by this paper.* There is no units header row
anywhere; units are prose inside the value cell ("per year", "%"). So the feared
"second header row = dimension vs units" ambiguity does not arise here — but a
different, unstructured pattern does (unit-as-prose-in-value), which Stage-1
recovery should leave alone (units stay inside the measure value as text).

**§8.6 — totals / derived.** *Not exercised by this paper.* None of T1–T4 has a
total, subtotal, mean, or summary row/column. So Stage 1 does **not** need a
totals policy to import this paper. The general risk stands (totals are common
elsewhere); recommend detect-and-fall-back when a totals row is seen, rather than
admitting it as an ordinary fact — but this is unproven on the acceptance set and
should not block Stage 1.

**§8.8 — compound members.** Confirmed present: T2's "W/W or Δ32/Δ32" is a
set-valued member, and T1's cells are set-valued *values* ("χ₁,ⱼ, χ₂,ⱼ"). Label-
only treatment renders fine but makes them atoms — adequate for display,
insufficient for any later pivot/filter that would need to know the set
membership. Defer the structure; note it the moment derived facts/pivot arrive.

**Concern #2 — non-dimensional shapes.** Found, all genuine (not presentation
residue):
- **Mid-table subheadings as a hidden dimension** (T2 disease stage) — the single
  most important finding. This is a real categorical axis, but it is
  indistinguishable by markup from a divider; it forces T2 to the fall-back.
- **Blank-cell forward-fill** (T2, T3) — a real row-dimension carry-down, must be
  handled by any recovery that claims T3.
- **Corner/interleaved header layout** (T1) — header members in a data row.
- No ragged/keyless tables and no spanning-for-emphasis in this set.

---

## What this means for the design (for human review)

1. **Model-level acceptance assertions** (replacing the already-green grep gate):
   - T3 and T4 must recover the **exact** dimensions/members/measures above and
     render the long/relational form; round-trip must reproduce that structure.
   - T1 and T2 are **negative** assertions: they must take the Design-A fall-back
     (grid preserved, cells converted, zero raw JATS) — *not* be force-fit into a
     wrong dimensional model.

2. **The two-tier floor is the right shape, and the spike sizes it:** on the
   acceptance paper, native recovery confidently covers 2/4, fall-back covers
   2/4, and both tiers pass the grep gate. Design A is load-bearing as the floor,
   not a deprecated path — **do not retire it.**

3. **Reconsider Stage-1 scope (design review concern #1).** The crosstabs that
   showcase the dimensional model (T1, T2) are precisely the ones it can't
   confidently recover from this real input. If the goal is "import this paper
   natively," the dimensional model delivers it for the two tables that barely
   need it. The model's true payoff is **authoring** (Front-end B) and
   **data-tables**, not import of irregular published crosstabs — which argues
   for leading with authoring, where the author resolves the ambiguities the
   importer cannot.

4. **Recovery cannot trust markup.** Any recovery must be **content/position-
   aware** (drop `<hr/>` rows; treat single-cell rows as candidate subheadings;
   forward-fill blanks; infer header-ness from content when `th`/`td` lies). That
   is a substantial heuristic engine, and the spike shows it still bottoms out at
   "fall back" for 2 of 4 real tables — budget accordingly.
