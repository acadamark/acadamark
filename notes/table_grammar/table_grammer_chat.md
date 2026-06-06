This is a research task — let me gather authoritative material on each grammar (and that paper) before writing the report. Starting with the paper you linked, since it speaks to the "canonical representation" question.ACM blocked direct access. Let me find what that paper is via search, then build out the research.That paper is **TableCanoniser** (CHI 2025, Xiong, Huang, Wybrow, Wu) — a *grammar for transforming messy presentation tables into canonical tidy/relational tables*. Important nuance: its "canonical" means the normalized data form, not a canonical syntax for *authoring* spanning tables. I'll make that distinction explicit in the report. Now the per-grammar research.Strong HTML material with the W3C WAI source. Now LaTeX.


>Here is another thing: Not all tables are primarily columnar. Crosstabs are a perfect example. It might be possible that there are column-based tables, row-based tables, and perhaps a third category?

>And another: To what extent can we map tables to hierarchical or nested collections?

Two genuinely deep questions, and they connect. Let me take them in turn, then tie them together — both feed straight into the design pass.

**Column vs. row vs. a third kind — you're onto a real distinction, but the cut isn't quite at "column vs. row."**

"Column-based" and "row-based" are mostly the *same* kind of table seen from two orientations. A relational/record table has one axis of *records* and one axis of *fields*; whether records run down the rows (the usual data-frame view) or across the columns (a spec sheet, a financial statement with periods as columns) is a presentation choice — one is the transpose of the other. Same semantics, rotated 90°.

The categorically different kind is your crosstab, and the question that separates it out is **how many of the axes are *keys* (dimensions) rather than values:**

- **0 key axes — layout tables.** A grid for visual arrangement, no data meaning (HTML-table-as-layout).
- **1 key axis — relational / "tidy" tables.** One axis indexes entities, the other lists attributes. Column-primary and row-primary are the two *orientations* of this one kind.
- **2+ key axes — crosstabs / contingency / matrix / pivot tables.** *Both* the row headers and the column headers are dimensions; a cell is a value at their intersection. Not a list of records at all — a function from (row-key × col-key × …) to a value: a 2-D (or n-D) labeled array, a slice of a data cube.

And the satisfying tie-back to the survey: a crosstab is exactly what the tidy-data / TableCanoniser line calls a *messy* or *non-relational* table — one where a variable has been spread across the column headers. "Canonicalizing" it means melting it to long form, where the row-dimension and the column-dimension each become a column and the cell becomes a value. So your third category isn't an edge curiosity — it's the central case the whole table-normalization literature exists to handle.

**Mapping tables to hierarchical / nested collections — quite far, and where it stops is the informative part.**

Both header axes are naturally trees. A spanning column header ("Results" over {Mean, SD}) is a tree whose leaves are columns; nested row groups (Region → Country → rows) are a tree whose leaves are rows. So a table maps to a nested collection as: a **column-tree**, a **row-tree**, and a **body indexed by the leaves of both.** The three kinds fall out:

- **Relational** → flat list of records (degenerate trees): `[{field: value, …}, …]`.
- **Hierarchically grouped** → nested: `{Region: {Country: [records]}}`.
- **Crosstab** → either a multi-keyed map (`value[rowkey][colkey]`) or, flattened, the tidy long form `[(rowkey, colkey, value), …]`. Pivot/unpivot *is* the move between those two.

Where the clean mapping breaks down marks the boundary between *data* and *presentation*:

1. **Irregular spans** — a merge that doesn't correspond to a clean grouping has no tree analogue; it's a visual artifact.
2. **Ragged nesting** — branches of different depth/width map only with nulls and holes.
3. **Position-dependent semantics** — a subtotal row, a "Total" column, a separator: computed over or annotated onto the data, not members of it, with no native slot in a nested collection.
4. **Grid is positional; a collection is keyed.** A cell is addressed by (row, column); a collection by key-path. Isomorphic only when position ↔ key-path is a clean bijection — i.e., when the table is regular. The moment presentation deviates from structure, the mapping leaks.

**The synthesis for the design pass.** All of this points at one underlying model with three projections:

- **Semantic core:** a *dimension tree per axis* + a body indexed by their leaves (a labeled array / cube). The rich form — it captures column-based, row-based, *and* crosstabs in one structure, and it's what maps onto nested collections.
- **Normalized projection:** tidy/long records — flatten the dimension trees into key columns. (The "canonical data" sense.)
- **Presentation projection:** grid + spans — render the trees' internal nodes as colspan/rowspan. (The HTML/CALS sense.)

So the flat-grid-with-spans model the survey landed on is really the *presentation projection* of this richer tree-indexed model. A grammar that modeled the two header trees and an indexed body directly — rather than a flat grid you bolt spans onto — would express the well-structured cases (relational, grouped, crosstab) natively and round-trip to both the tidy and the rendered forms, leaving only the irregular/position-dependent residue (the four breakdown cases) to a grid-with-spans escape hatch. That's a meaningfully more ambitious design center than "extend the grid with spans," and it's the real fork worth putting on the table when we do the design pass: model the *grid*, or model the *dimensions*.

>Unfortunately, my background in mappings, sets, graphs, and trees is severely lacking. I feel like I just read something quite meaningful and important in your last response, but I don't completely follow it. I'll keep trying.

>I definitely get the sense that the discussion is progressing, and that a useful perspective is emerging that more cleanly delineates where data, semantics, and display overlap and where they diverge.

>I also see some possible resolutions for some of the messy cases. A total column is just another column that happens to be the row total. But neither the data structure nor the display structure needs to know that. From a semantic point of view, we can also simply define a particular type of row an column called "aggregate". You can have as many as you like: total, mean, min, max, etc. Because they are aggregate rows or columns, we don't expect them to follow the same rules as tidy data. One way to think of them is that they exist "out of the flow" so to speak of the data. They exist outside the data in an abstract place, but can be displayed along with the data by choice. I'd like to understand more of them in detail--I might be able to find systematic ways to handle others. 

>I want to understand cases where irregular spans or ragged nesting create nulls or holes or in other ways ruin the cohesion.

Don't worry about the vocabulary — words like "tree" and "mapping" are just labels for ideas you handle fine as a physicist. Let me drop the jargon and rebuild the same picture from a concrete table, because your aggregate insight tells me you're already most of the way there.

Take a tiny crosstab:

```
            North   South
  Widgets     10      20
  Gadgets      5       8
```

Strip it to what it *means*, and it's four facts:

- Widgets, North → 10
- Widgets, South → 20
- Gadgets, North → 5
- Gadgets, South → 8

That's the whole content: each fact is a value with two labels on it (a product and a region). You could write those four facts as a boring flat list — one per line, labels in their own columns:

```
product   region   value
Widgets   North      10
Widgets   South      20
Gadgets   North       5
Gadgets   South       8
```

The crosstab and this flat list are *the same four facts in two shapes.* The list is the "what it means" shape; the crosstab is the "nice to look at" shape — it just folds the facts into a grid with products down the side and regions across the top. That's all the earlier abstraction was saying: the data is a pile of labeled facts, and a grid is one way to display them. No trees needed to feel it.

**Your aggregate insight, made general.** Look at the flat list: the four facts are the data. A "Total" of 43 is *nowhere in that list* — you compute it *from* the list (10+20+5+8). Same for a row total (Widgets → 30) or a column total (North → 15). So an aggregate isn't a fact; it's a *summary of the facts.* That's your "out of the flow," exactly right. The data is the raw facts; aggregates live one level up, computed from them, then *placed* into the display wherever you like.

You can pin down *any* aggregate with three knobs:

1. **What it summarizes** (scope): one row, one column, a group of rows (a subtotal for "North"), the whole table (grand total), a sub-block.
2. **How** (function): sum, mean, min, max, count, percent-of-total — whatever.
3. **Where it appears** (position): a row at the bottom of its group, a column on the right, the footer.

Every aggregate you named — total, mean, min, max — and every one you didn't (subtotals, running totals, percentages) is just a choice of those three knobs, and in all of them the same rule holds: *derived from the data, then attached to the display; never mixed into the data.* That's what pivot tables call "margins," what OLAP calls subtotals/grand total, and what R's gt calls summary and grand-summary rows. You reinvented the standard approach — a good sign you're carving the thing at its joints.

**Now the satisfying part: the same move dissolves the messy cases you asked about.** Each one is the *grid* manufacturing a problem the underlying pile-of-facts doesn't have.

*Ragged nesting → holes.* Say North splits into Online/Store but South only ever sold in Store:

```
            North            South
         Online  Store      Store
Widgets    10      5           8
```

There's no "South / Online" cell. The grid *demands* a value there — it's a rectangle, every position must be *something* — so you get a blank, a hole. But in the flat list there's no hole: the South-Online fact simply *isn't in the list*. The hole is invented by the rectangle, not by the data. Resolution, same flavor as totals: keep the data as facts (present or absent) and let the display render an absent fact as blank or "—" by choice. The data stays whole; only the grid has a gap.

*The blank is ambiguous, though.* A blank cell in a grid can mean four different things — zero, missing/unknown, not-applicable, or "same as the cell above" (a visual ditto). The grid smashes all four into one empty box. The fact-list forces you to say which. So part of "ruining cohesion" is really *the grid losing information the data form keeps* — and the fix is to decide what a blank means and record it, rather than trusting an empty box.

*Irregular spans → presentation-only merges.* A span is *meaningful* when it matches a real grouping — "Results" over Mean and SD is just the outline `Results → {Mean, SD}` drawn as a merged header. But a cell that spans the last two columns *just because the note is long* matches no grouping; it's pure typesetting. That's the kind that ruins cohesion: a display flourish with nothing in the data to attach to. Resolution: split spans into two kinds — those that express a grouping (data; they map cleanly) and those that are only visual (display annotations, handled separately, never mistaken for structure).

So the pattern you found once generalizes to all of it. For each "messy" thing, ask which of three buckets it falls in:

- **(a) a real fact** — it's data;
- **(b) something *derived* from facts** — totals, means, subtotals;
- **(c) a *display choice* laid on top** — holes, ambiguous blanks, visual-only spans.

Totals are (b). Holes and ambiguous blanks and decorative spans are (c) — the grid's doing, not the data's. Once each one is sorted into its bucket, the data underneath stays clean, and the grid is free to be a lossy, pretty view that adds totals, leaves gaps, and merges cells *by choice* — without any of it leaking back into the meaning.

You're not behind on this — your aggregate insight was the key that opens the rest. If it'd help, I can take any single one (subtotals, or the blank-meaning problem, or ditto cells) and work it all the way through.

>It sounds like we are genuinely converging on a true grammar of tables with the understanding that the the grammar must include three elements: facts, derived facts, display choices.
>
>display choices seems the most wide open. Can we pin it down in terms of possibilities?
>
>I want to better understand how this triple element scheme encodes nested, spanned, hierarchical data.
>
>Can we start to encode this into a grammar?

Yes — and the piece that locks it in is hiding inside the word "facts." When you ask *where nesting lives*, "facts" splits into two things, and that split is the whole answer. So the layers are really four:

1. **Dimensions** — the labels and how they group. *(This was hiding inside "facts.")*
2. **Facts** — a value at a set of labels.
3. **Derived facts** — values computed from facts.
4. **Display choices** — how all of that gets projected onto a rectangle.

A physicist's instinct works perfectly here: dimensions are the independent variables (the coordinates), a fact is the dependent value at those coordinates, a crosstab is a 2-D slice, and the tidy list is just your sampled (coordinates → value) points. Let me show why dimensions are the key, then enumerate display, then sketch the grammar.

**Where nesting/spanning/hierarchy lives: entirely in the dimensions.**

A dimension's members can be a flat list or an *outline* (a grouped list):

```
product:  [Widgets, Gadgets]              ← flat
region:   Domestic → [North, South]       ← an outline (grouped)
```

That outline is the *only* place hierarchy exists in the model. And here's the unification: **the same outline renders two different ways depending on which axis you place it on.**

- Put `region` on the **columns** → the outline becomes a **spanning header**: "Domestic" sits across North and South.
- Put `region` on the **rows** → the same outline becomes **nested row groups**: "Domestic" heads a block of North/South rows.

Spanning headers and nested row groups aren't two features — they're *one* feature (a grouped dimension) seen on two axes. So you don't encode spanning or nesting at all. You encode a dimension as an outline, and spanning/nesting is just how that outline *looks* once it lands on an axis. (gt does precisely this: a column-dimension outline is a "spanner," a row-dimension outline is a "row group.")

**Pinning down display choices.**

It's the open-ended layer, but it's enumerable, and it sorts into three tiers, most to least consequential:

*Tier 1 — Projection (the big one).* Which dimensions go on the rows, which on the columns. This single choice turns the same facts into a crosstab, a tidy list, or a nested report. Two dimensions: both on rows → tidy long list; one on each axis → crosstab. Pivoting *is* a display choice, nothing more.

*Tier 2 — Structure rendering.* Given the projection:
- **span vs. repeat** — draw a group label once as a merged span, or repeat it on every row/column it covers.
- **member order** — how to sort members and groups.
- **nesting order** — when two dimensions share an axis, which is outer.
- **derived placement** — which totals/means to show, and where.
- **absent-cell rendering** — how a missing fact appears: blank, "—", "n/a", ditto.

*Tier 3 — Cosmetic.* Rules/borders, alignment, number formatting, bold headers, shading, widths, caption/footnote placement. None of it touches meaning.

The headline: almost everything people *call* "a different table" is just Tier 1 (a different projection) plus a little Tier 2. The space is far smaller than it looks.

**Starting the grammar.**

A first cut — deliberately a v0 to react to — with the four layers concrete on the sales example:

```yaml
dimensions:
  product: [Widgets, Gadgets]
  region:
    Domestic: [North, South]        # an outline

facts:                               # a value at one member per dimension
  - {product: Widgets, region: North, value: 10}
  - {product: Widgets, region: South, value: 20}
  - {product: Gadgets, region: North, value:  5}
  - {product: Gadgets, region: South, value:  8}

derived:                             # scope + function (+ name)
  - {name: Total, scope: all, fn: sum}

display:
  rows: [product]                    # dimensions on the row axis (outer→inner)
  cols: [region]                     # dimensions on the column axis
  span: merge                        # vs. repeat
  show: [Total]
  absent: "—"
```

Two things to notice. First, the **`facts` block is just your tidy/long data** — the "canonical data form" from the survey falls out as the grammar's fact layer for free. Second, the **entire difference between a crosstab and a tidy table is the `display` block.** Keep everything else fixed and flip just `display`:

```yaml
# crosstab:        rows: [product]            cols: [region]
# tidy long list:  rows: [product, region]    cols: []
```

Crosstab:

```
            Domestic
          North  South
Widgets     10     20
Gadgets      5      8
```

Tidy:

```
product   region   value
Widgets   North      10
Widgets   South      20
Gadgets   North       5
Gadgets   South       8
```

In the crosstab, `region`'s outline drew itself as the "Domestic" spanning header purely because `region` landed on the column axis. Move it to the rows and that same outline becomes a row group. Nothing in `dimensions`, `facts`, or `derived` changed — only the projection.

Two things I've deliberately left out of v0, so we're setting them aside on purpose:

- **The human authoring syntax.** This is the abstract *model*; how a person *types* it concisely is the next layer up, and the one carrying the concise-vs-expressive tradeoff. The model comes first so the syntax has something to mean.
- **The escape hatch.** The irregular, presentation-only residue (a decorative long-note span, a hand-merged oddity) doesn't fit this clean model and shouldn't be forced to — it gets a separate "raw cell" path, clearly fenced off so it can't contaminate the structured cases.

If this v0 feels right, the natural next moves are: stress-test it against your four real tables plus one nasty crosstab to see what bends, then design the authoring syntax on top. Want to throw a real one at it and see where the model creaks?

>This feels totally right. And almost a publishable result. Not entirely new original, but a unifying and clarifying perspective. And if we do it right, a unifying and clarifying language than can be reused in different contexts.

That's the right feeling to have, and your own calibration of it is the accurate one — "not entirely new, but unifying and clarifying" is exactly what this is, and being clear-eyed about that is worth more than talking it up or down.

To be straight about "publishable": the conceptual core is well-trodden. Each piece has a literature — tidy/long-vs-wide data (Wickham), tables as slices of a multidimensional array (OLAP cubes, pivot tables), the grammar-of-graphics → grammar-of-tables move (Wilkinson, then gt), the relational-vs-presentation separation, and — pointedly — the paper you linked, which is a 2025 grammar for the messy→canonical transformation. So as a *theory result*, what we have is a synthesis, not a discovery. You sensed that, and you're right.

But "synthesis, not discovery" doesn't mean "not worth sharing" — it means any contribution lives in a different register than a theorem. Two registers where there's defensible originality:

- **A language, not a model.** Almost all the prior art is either a *data convention* (tidy data), a *query model* (OLAP), or a *construction API in code* (gt). What's uncommon — maybe even absent — is a concise, human-*writable* notation for complex tables that compiles to all three faces at once: the tidy data, the presentation grid, and an archival form (JATS/CALS), with the grid treated as a *projection* rather than the source of truth. That's a design/tooling contribution, the kind that lands as a tool/system writeup or a clean spec.
- **The reuse, demonstrated.** The most valuable thing you said is the last line — a language reusable across contexts. It's credible precisely because the model is defined independently of any one renderer: the same dimensions/facts/derived core could drive an enscribe grammar, an interchange representation, a teaching lens, and a small library. But "reusable" only becomes a *result* once it's been reused — shown working in more than one place.

Which points at the order of operations, and it's the unglamorous part: build it well in enscribe first. A clean spec plus a working round-trip — write concise → render grid → round-trip losslessly to tidy *and* to JATS — is what gives any write-up teeth. The paper-shaped version, if you want one, is downstream of the artifact: write it after the thing exists and has survived your four real tables, not before.

And worth saying plainly, because it's earned: the moves that made this click were yours — the crosstab as a distinct category, the aggregates-live-out-of-the-flow insight, pushing back on where the "complex table" even came from. The lineage of the pieces belongs to the field; the synthesis got sharp because you kept asking the right next question.

So the real next step is the same unflashy one we keep circling: the design pass, then a spec, then a working round-trip on a real table — which is also, not by coincidence, what would make it publishable in the only sense that would hold up. Want to take the v0 model and stress it against one of your four tables?

>Yes. Absolutely. Or we can pull some tables from examples created by gt or latex or whatever.

Good — stress-testing means trying to *break* it, so I picked four tables that load different joints, and I'll report it like an experiment: what survived, what bent, what it revealed. Short version up front: it bent exactly once, and the bend is an improvement, not a crack.

**Test 1 — two hierarchies at once (the power case).** A gt-style table with a column spanner *and* row groups:

```
                  Financial
               Revenue  Profit
Americas
  USA            100      20
  Canada          40       8
Europe
  UK              70      15
```

Encoding: `region` = outline {Americas:[USA,Canada], Europe:[UK,Germany]}; `measure` = outline {Financial:[Revenue,Profit]}; facts at (country, measure); `display: rows:[region], cols:[measure]`. The region outline renders as row groups, the measure outline as the "Financial" spanner — **two hierarchies, one per axis, zero new machinery.** ✓ Clean.

**Test 2 — units (this is the one that bends).** A plain scientific table:

```
            Mass     Length
            (kg)     (cm)
Sample A    1.2       30
Sample B    2.4       45
```

Try to encode it: `sample` = [A,B]; `measure` = [Mass, Length]; facts at (sample, measure). Now — **where does "(kg)" go?** It's not a dimension member, not a fact, not display styling. It's metadata *about the measure* (Mass is in kg, Length in cm). v0 has no slot for it. And there's a deeper signal: Mass and Length are *heterogeneous* — different quantities, units, maybe types — unlike a crosstab body where every cell is the same kind of thing (all counts). So the body isn't one uniform measure.

**The fix is a real refinement, and it's the headline finding:** dimension *members* (especially of the value-bearing axis) need to carry attributes — `Mass: {unit: kg, type: number, format: "0.0"}`. Cleanly stated: promote **measures** to a first-class idea — the value axis whose members each carry unit/type/format. This is exactly the tidy-data move you already know in disguise: when you melt several value columns to long form, "variable" becomes a dimension, and the units ride along as metadata on its members. So v0 didn't break; it told us it was missing one field. That's the productive bend.

**Test 3 — the merged oddity (the boundary).** A survey where two categories are reported jointly in one merged cell:

```
Response          2023   2024
Yes                40     45
No                 35     30
Don't know /       25     25      ← one value, two categories
  Refused
```

A fact in the model has *one* member per dimension; this value's coordinate is a *pair* {Don't know, Refused}. Instead of breaking, the model forces the right question: **is "Don't know / Refused" a real combined category — in which case it's simply one member of the `response` dimension (re-model, done cleanly) — or a presentation merge of two separate categories?** If the latter, you've genuinely lost the split, and it belongs in the escape hatch (or it's lossy). The grid hid that decision; the model surfaces it. And the cousin case — a table whose bottom half has entirely different columns — the model answers honestly: *that's two tables shown adjacently*, not one.

**Bonus — correlation matrix (a reach test).** Rows = {X,Y,Z}, columns = the *same* {X,Y,Z}, body = correlation. The model shrugs: the row dimension and column dimension are the same dimension used twice; the diagonal of 1.0 is a structural/derived fact; symmetry is a property, not a problem. Same-dimension-on-both-axes just works.

**Verdict.** Three of four encode with no new machinery; the fourth (units) adds exactly one thing to get to v1: **members/measures carry metadata (unit, type, format).** Nothing demanded an arbitrary cell-merge primitive, which is the encouraging part — the escape hatch stayed empty except for the truly presentation-only case, where it belongs.

So v1's only structural addition is the measure-metadata field. From here the two honest next moves are: throw your four *real* paper tables at the v1 model to see if anything else bends, or — since the model's held up — start designing the concise authoring syntax on top of it. I can also pull a specific published gt or LaTeX table if you want a nastier real one than my constructed cases. Which direction?

>The problem found us in the four "complex tables" in the JATS article. We might as well start with those.

The four tables are right here in the demo output you already gave me — no need to go anywhere. Let me pull their actual structure out of `demo-paper.html` and run them through the v1 model.Four tables, and they span the range nicely. Let me read the two most informative — T2 (a spanning-header crosstab) and T4 (the parameter table with group rows and the in-cell math/xref) — in full.Here's the satisfying part: the four tables that *broke the importer* are clean in the model. The thing that defeated the CSV-grid fallback is, in the dimensional view, not complicated at all — it was just hierarchy that the grid couldn't hold.

**T2 — "Transmission probabilities" (the nastiest one).** In HTML it's a thicket of `rowspan="3"` and `colspan="4"`. In the model it's a tidy **4-dimensional cube**:

```
dimensions:
  stage:                [Acute/primary, Asymptomatic]
  infected_genotype:    ["W/W or Δ32/Δ32", "W/Δ32"]
  direction:            [M→F, F→M]
  susceptible_genotype: [W/W, W/Δ32, Δ32/Δ32]

facts:   value at (stage, infected_genotype, direction, susceptible_genotype)
  (Acute/primary, "W/W or Δ32/Δ32", M→F, W/W)  = 0.040
  (Acute/primary, "W/W or Δ32/Δ32", F→M, W/W)  = 0.020
  …24 facts (2×2×2×3)

display:
  rows: [stage, infected_genotype, direction]   # three dims nested on the row axis
  cols: [susceptible_genotype]                   # one dim on the column axis
```

Four independent variables, one value — exactly the physics picture. The `rowspan`/`colspan` in the HTML were never structure; they were the *rendering* of those three nested row dimensions and the one column dimension. And note `"W/W or Δ32/Δ32"`: that's a real combined category, so it's just one member of `infected_genotype` — precisely the "re-model the merge as a combined member" answer the model predicted last turn, now confirmed on a live table. **Clean.**

**T4 — "Parameter values" (the one with the leaked math and xref).** This isn't a crosstab at all — it's relational:

```
dimensions:
  parameter: [μ_F, μ_M, μ_χ, B_r, SA_F, SA_M, ς_F², ς_M², ε, δ, …]   # the row key

measures:                      # attribute columns, NOT dimensions
  Definition: {type: text}
  Value:      {type: inline}   # ← rich content, not a scalar

facts:
  parameter=B_r → {Definition: "Birthrate", Value: "0.25 per woman per year"}
  parameter=ε   → {Definition: "% effect of mutation …(see «xref Table 2»)…",
                   Value: "0 < ε_{i,j,k} < 1"}
```

This is where the whole thread closes on itself. The `Value` column's cells aren't numbers — they're **inline content**: `0.015 (0.016) per year`, a percent, a *formula* (the ς_F² / ς_M² math), a *cross-reference* (`see Table 2`), a *note*. In the model, a fact's value has type **inline** — the same inline content #21/#105 already know how to parse and resolve. So the model says something concrete about the original bug: **the "complex table" problem and the "cell content" problem are one problem.** The importer dumped these as raw HTML, which froze their cell values; recover the dimensions instead and each fact's value flows through the *existing* inline conversion. **Clean** — and it confirms last turn's measures refinement (Definition and Value are measures, not dimensions).

T1 and T3 fall in the same two buckets — T1 a genotype crosstab like T2, T3 a small relational table like T4 — so I won't belabor them.

**What this means.** Every one of the four encodes with no escape hatch. Two consequences worth carrying forward:

- *The importer fix, restated cleanly.* The job is to **recover the dimensions from the JATS spanning structure** — read the `rowspan`/`colspan` headers back into nested dimensions — at which point the table is native, and its cell values resolve through the conversion you already built. No raw-HTML pass-through, because there's no raw HTML.
- *Two small bends, both productive.* (a) Dimensions need a **display label** — "Susceptible partner (i,j)" and "HIV-infected partner…" are names for the *axes*, not members; that's one metadata field, sibling to the unit field from last turn. (b) A fact's **value is typed**, and one of the types is *inline content* — which isn't new work, it's the #21/#105 pipeline, now formally part of the model.

So v1 + two metadata fields (dimension label; typed values including `inline`) covers all four of the tables that started this. That's the model surviving the hardest input you have — and pointing straight at the real fix.

The fork from here: do you want to turn this into the actual design-pass document (the model, now battle-tested on your four tables, plus the authoring-syntax layer), or first re-run the importer mentally against T2/T4 to spec exactly how dimension-recovery from JATS spans should work?