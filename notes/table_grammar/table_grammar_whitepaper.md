# A Dimensional Grammar for Tables

*An overview of the enscribe table model. Draft, v1.*

## Abstract

A table on a page is two things tangled together: a body of data, and a set
of choices about how that data is laid out. Spanning headers, merged cells,
totals rows, nested groupings — almost all of these are the *second* thing,
presentation, wearing the costume of the first. This note describes a model
that pulls the two apart. It decomposes a table into **dimensions** (the
labels and how they group), **facts** (a value at a set of labels), **derived
facts** (values computed from facts), and **display choices** (how all of that
is projected onto a rectangle). The first three are what a table *is*; the
fourth is how it *looks*. The practical payoff for enscribe: tables that look
"complex" turn out to be simple data under elaborate display, which makes them
tractable to write and render going one way — and, going the other way, to read
back from a displayed table well enough to reproduce it faithfully.

## 1. The problem with grids

A grid — rows and columns of cells — is a *layout*, not a data structure. It
has no opinion about what a cell *means*; meaning is smuggled in by visual
convention. A header that spans four columns, a label that spans three rows, a
bold "Total" line, a blank cell that means "same as above" — these are all the
author teaching the reader how to decode the grid, in a language the grid
itself does not speak.

This causes concrete trouble. When enscribe's importer first met the paper's
multi-header tables, it had no way to express the spans in its plain-grid
source, so it fell back to copying the raw HTML verbatim. That froze the cell
contents: formulas, cross-references, and notes that should have been converted
were carried through as literal markup. (The importer no longer does this; the
point here is what grids *invite*, not a current bug.) The "complex table"
problem and the "cell content" problem looked like two bugs. They are one, and
the model below shows why.

## 2. The core move: dimensions were hiding inside the facts

It helps to build the decomposition the way it was actually found, by
derivation rather than decree.

Start with the naive view: a table is just *facts* — values sitting in cells.
A `10` here, a `20` there. But a bare `10` means nothing. It carries meaning
only because of *where* it sits — the row labeled Widgets, the column labeled
North. Those labels, and the way they group, are data too. In a grid they are
implicit, encoded in a cell's *position* rather than written down anywhere. The
first real move is to notice this and pull them out. What had looked like one
thing, "facts," was two things wearing one coat.

Pulling them apart gives four parts:

> 1. **Dimensions** — the labels and how they group. *(This was hiding inside
>    "facts.")*
> 2. **Facts** — a value at a set of labels.
> 3. **Derived facts** — values computed from facts.
> 4. **Display choices** — how all of that gets projected onto a rectangle.

The first three describe the table's content; they have no notion of rows,
columns, or spans. The fourth is the only part that knows the table will be
drawn as a rectangle at all — and it is where essentially all of a table's
apparent complexity lives.

## 3. The parts

### Dimensions

A dimension is a set of **labels** (its members) and, optionally, **how they
group**. Members can be a flat list, or an ordered **outline** — a hierarchy.

This is where the grid's positional encoding gets named and made explicit, and
it is where nesting and spanning live, *entirely*. There is one feature here,
and it shows up on two axes:

- an outline placed on the **column** axis renders as a **spanning header**;
- the same outline placed on the **row** axis renders as **nested row groups**.

A column spanner and a row group are therefore not two features to build. They
are one dimension-outline, projected onto two different axes — which means
moving an outline from one axis to the other turns a spanner into a row group
and back, with no change to the data. A dimension also carries a **display
label**: the name shown for the whole axis, distinct from its members' names.

### Facts

A fact is one value at one coordinate: pick one member from each dimension and
you have located a single fact. Collect them all and you have the table's
irreducible content — the same thing a statistician calls *tidy* or *long*
form, and the same thing a physicist recognizes as the value of a field sampled
at a point in its parameter space. No spans, no headers, no order. Just values
at coordinates.

### Measures — a wrinkle in "value"

So far a fact's value has been a bare number. Two complications make it
richer, and both have the same resolution.

First, a table may record *more than one quantity* side by side — a definition
*and* a value, a mass *and* a length. "Which quantity" is then itself a label,
which is to say a dimension; in tidy-data terms it is the *variable*. So
multiple value-columns are not a new kind of structure — they are one more
dimension, the **measure**, whose members name the quantities.

Second, a value need not be a scalar. It has a **type** — number, text, or
*inline content* — and may carry metadata such as a **unit** (kg, %, per year)
or a number **format**. These annotations attach to the measure (or, for a
single-measure table, to the value directly). The `inline` type is the one that
matters most for enscribe: it is the bridge to cell content, treated in §8.

The upshot: "a value at a set of labels" still holds. We have only admitted
that one of the labels can be *which quantity*, and that the value can be typed
and annotated rather than a bare number.

### Derived facts

Totals, subtotals, means, percentages-of-row — these are not data. They are
*computed* from the facts, by a function over a scope, and then placed
somewhere in the display. Modeling a derived fact as a `(scope, function,
name)` rule and keeping it out of the fact set is what stops a "Total" row from
polluting the data the moment you try to sum or pivot it. This is the same idea
as a pivot table's margins, an OLAP subtotal, or a `gt` summary row: computed,
attached to the display, never mixed into the flow.

### Display choices

Everything about appearance, in three tiers — given its own section next,
because it is where the model earns its keep.

## 4. The three tiers of display

1. **Projection** — which dimensions sit on the row axis and which on the
   column axis. This is the pivot, and it is the powerful tier: the *same*
   facts become a wide crosstab, a tall tidy list, or a nested report depending
   only on this choice. Nothing about the data changes; only its silhouette
   does.
2. **Structure rendering** — span versus repeat for outline levels, member
   order, where derived facts are placed, how absent cells are shown. These are
   the decisions that, in a hand-built grid, look like irreducible structure but
   are really just options.
3. **Cosmetics** — alignment, emphasis, borders, number formatting.

Tier 1 is the conceptual heart. Once projection is a *choice* rather than a
property of the data, the difference between a crosstab and a tidy list stops
being a difference of tables and becomes a difference of *views* of one table.

## 5. The grammar in one example

Here is the whole model in a single small table — two products across two
regions — written as data plus a display spec:

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

`region` is an outline (`Domestic` over `North`/`South`) placed on the column
axis, so it renders as a spanning header:

```
                 Domestic
              North   South
  Widgets        10      20
  Gadgets         5       8
```

Now change *only the display block* — move `region` to the rows and `product`
to the columns:

```yaml
display:
  rows: [region]
  cols: [product]
```

Same facts, transposed silhouette — and because `region` now sits on the row
axis, its `Domestic` outline renders as a row group instead of a spanner:

```
              Widgets   Gadgets
  Domestic
    North        10        5
    South        20        8
```

Or push both dimensions onto the rows and leave the columns empty, and the same
facts come out as a tidy list:

```yaml
display:
  rows: [product, region]
  cols: []
```

```
  Widgets   North   10
            South   20
  Gadgets   North    5
            South    8
```

Three tables, one fact set. The crosstab, the transpose, and the tidy list
differ only in their `display` block. That is the model's central claim made
literal: structure is a projection, not a property of the data.

## 6. A few more examples

**Units force the measure idea (a small scientific table).**

```
            Mass     Length
            (kg)     (cm)
Sample A    1.2       30
Sample B    2.4       45
```

`sample` is a dimension. `Mass` and `Length` are not a dimension you would
pivot on — they are two *measures*, different quantities with different units.
The `(kg)` and `(cm)` are not facts and not styling; they are metadata on the
measures. A model without measures has nowhere to put them; with measures, they
are simply `Mass.unit = kg`, `Length.unit = cm`.

**A four-dimensional table that looks complex (the paper's transmission table).**
In HTML it is a thicket of `rowspan` and `colspan`. In the model it is a clean
cube: dimensions of disease stage, the infected partner's genotype, the
direction of transmission, and the susceptible partner's genotype; one
probability per combination; three dimensions nested on the rows and one on the
columns. The spans were never structure — they were the rendering of those
nested dimensions. One genotype member is written "W/W or Δ32/Δ32": a genuine
combined category, so it is one member with a compound label, not a merge to be
untangled.

**A relational table with rich cells (the paper's parameter table).** Its rows
are keyed by a single dimension, the parameter; its columns are *measures* — a
definition and a value — not a dimension. And the value cells are not numbers:
they hold formulas, cross-references, and notes. That is a measure of type
`inline`, which is exactly the hook §8 turns on.

## 7. The two directions: writing forward, reading back

A grammar like this describes a one-way street that runs perfectly in one
direction and imperfectly in the other, and it is worth being precise about
both.

**Forward — from description to display — is total and deterministic.** Given
the data, the labels, and the display choices, there is exactly one table. No
ambiguity, no guessing. This is the direction *authoring* uses: state what the
data is and how to lay it out, and the rendered table is fully determined.
Everything above describes this direction.

**Backward — from a displayed table to a description — is a different kind of
problem.** Reading an existing grid and recovering a description cannot, in
general, recover the author's *intention*. A row that spans the full width
might be a real category that groups the rows beneath it, or it might be a
decorative divider; the two look identical, so the markup alone cannot say
which. Reading-back is therefore lossy, and its answer is not unique.

But it does not need to recover intention. It only needs to recover *enough to
reproduce the display*. That is a far weaker and entirely reachable goal: find
some description that, run forward, reproduces the original table. Whether that
description names a "real" category or merely a layout grouping does not matter,
because both render the same.

And here the forward direction's determinism pays an unexpected dividend:
**reading-back can check its own work.** Produce a candidate description, run it
forward, and compare the result to the original table. If they match, the
description is correct *for display*, whatever its relationship to the author's
intent. If they do not, fall back to a more literal description and try again.
Reading-back stops being a guess one hopes is right and becomes a search with an
answer key — and the original table is the key.

This gives the grammar a single expressive **range** rather than two competing
systems. At one end sits the most literal description — "draw exactly these
cells in exactly this grid" — which always reproduces the original and is always
safe. At the other sits a more structured description that recovers grouping and
so earns the model's benefits: pivoting, accessibility, restyling. Reading-back
slides along this range, recovering as much structure as the draw-and-check will
bear and no more.

Two kinds of completeness are worth separating. *Display* completeness asks
whether the grammar can reproduce any look; *semantic* completeness asks whether
it can capture any meaning. Reading-back needs only the first, and the literal
end of the range guarantees it. The grammar can be a faithful re-encoder of
appearance without ever claiming to understand what a table means.

One caveat follows. Because reading-back may assert grouping that was only
layout, an imported description can carry structure the original author did not
intend. This never affects faithful redisplay. It bites only if someone imports
a table, then *edits* it, and begins treating a recovered layout-grouping as
though it were real data — a limitation of editing imports, worth documenting,
not a flaw in reproducing them.

## 8. Why this matters for enscribe

- **"Complex" is a display word, not a data word.** A table that looks
  complicated is simple data under elaborate display; the spanning and nesting
  live in the display choices, not the content.
- **The complex-table problem and the cell-content problem are one problem.** A
  fact's value can be inline content — a formula, a cross-reference, a note —
  resolved by the same conversion the document body already uses. Once cells are
  facts with inline values, nothing about a table needs to be held as opaque
  markup.
- **Reading back a published table is redisplay, not interpretation.** The
  importer's job is to find a description that reproduces the table, verified by
  drawing it — not to divine the author's data model. It recovers as much
  structure as the draw-and-check allows, for the accessibility and restyling
  that buys, and falls to a literal description when it cannot be sure.
- **The literal floor is already built.** enscribe's current importer preserves
  a complex table's grid and converts its cell contents — exactly the most
  literal point on the grammar's range. The dimensional model does not replace
  it; it extends the range upward, toward descriptions that recover real
  structure where that is safe.

## 9. Relationship to prior work

The conceptual core is a synthesis, not a discovery. Facts-at-coordinates is
tidy data (Wickham) and the OLAP cube. Display-as-projection is the spirit of
the grammar of graphics carried into tables, as in R's `gt`. The fact/derived
split is the relational model's stance on stored versus computed. Turning a
messy grid back into regular data is the goal of recent work such as
TableCanoniser.

What may be original is narrower and more useful: a concise, human-writable
**authoring language** with a deterministic forward render and a *verifiable*
read-back — one source that compiles to tidy data, a presentation grid, and
archival JATS at once, treating the grid as a projection rather than the source
of truth. That is a design-and-tooling contribution, and its evidence is the
working round-trip in enscribe, not the model on its own.

## 10. Scope

The first version covers dimensions (flat and outline), facts, measures with
metadata including inline values, and a display projection with span/repeat
control — the forward direction in full. Reading back a displayed table is a
verifiable redisplay that recovers structure as far as the draw-and-check
permits and otherwise rests on the literal floor. Deferred for later: rendering
of derived/aggregate facts, arbitrary in-body rowspan, a concise tidy-form
authoring front-end, and any pivot convenience layer. The literal floor —
preserve the grid, convert the cells — is the safe fallback for any layout the
structured end cannot yet express.
