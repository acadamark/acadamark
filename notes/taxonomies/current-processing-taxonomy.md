# Processing taxonomy — Part I: the measured "is" (from code, no overlay)

This is the pure measurement of **how elements are ACTUALLY processed today**, extracted from the element
frontmatter (`content.type` / `contains` / `becomes` / `content_handler`), `dsl-registry.js`, and the
parser — with **no conceptual overlay** and **no "should."** The mapping to the semantic and document
taxonomies, and the "should," come in Part II. The inconsistencies recorded here are *observations*, not yet
judgments.

Measured June 2026 against `main`. 109 elements.

## The processing fields the code actually tracks (the real axes, as-found)

Every element frontmatter carries some of:
- **`content.type`** — observed values: `prose`, `opaque`, `structured`, `opaque-or-structured`, `none`, *(missing)*.
- **`contains`** — `[inline]`, `[block]`, or a list of specific child elements (`[meta, author, …]`), or *(missing)*.
- **`becomes`** — where the pipe content goes: `children`, `figcaption`, `text-content`, `sealed-subdocument`,
  `raw-svg-source`, `parsed entries (…citation system)`, *(missing)*. **This is a real, unnamed processing
  dimension** (the *destination* of content).
- **`content_handler`** — `default`, or a named DSL (`math`, `code`, `diagram`, `table`, `align`, `cases`,
  `matrix`, `eqnarray`, `library`, `minipage`, `svg`, `math-display`), or *(missing)*.

## The clean correspondence (holds across almost all 109)
**`content.type: opaque` ⟺ a non-`default` handler**, and **`prose`/`structured`/`none` ⟺ `handler: default`.**
Processor-ownership is real and almost perfectly tracked by these two fields together. The exceptions are
exactly the drift cases below.

## KEY FINDING — `opaque` is overloaded (two different processing acts, one label)
The measurement shows `content.type: opaque` conflates two unrelated things:
1. **Foreign-processor opaque** — content owned by a *different* processor, never processed as Enscribe prose:
   `math`, `display-math`, `align`, `cases`, `matrix`, `eqnarray`, `code`, `diagram`, `svg`, `table`, `library`.
2. **Isolation opaque** — content that **is** Enscribe prose but is *sealed* from the parent pipeline and
   then processed by the **default** processor in its own recursive pass: **`minipage`** (`becomes:
   sealed-subdocument`; dsl-registry.js:117–125 — held opaque so the main pipeline never descends, floats/labels/
   footnotes don't bubble; then run through the default pipeline in the deferred phase, `minipage-deferred.js`).

So `opaque` is really two axes collapsed:
- **processor**: default-text vs foreign-DSL
- **scope**: in-line-with-parent vs sealed/recursive
`math` = (foreign-DSL, in-line); `minipage` = (default, sealed); `library` = (foreign-DSL, sealed).
The single `opaque` label hides the (default, sealed) case — which is why "is minipage opaque or default?"
had no answer: it is **opaque in scope, default in processor.** Both the spec and the designer's intuition
were each half-right.

## Observed inconsistencies / gaps (punch-list — observations, not yet judged)
1. **`section` has NO content block** (`content.type`, `contains` both missing) — yet `sub-section` /
   `sub-sub-section` declare `structured / [inline]`. The top-level spine element is unspecified while its
   children are specified.
2. **`sub-section` / `sub-sub-section` declare `contains: [inline]`** — but a (sub)section contains *blocks*,
   not inline. Looks wrong (a section holds prose blocks + a heading).
3. **`details`, `dl`, `glossary-entry` declare `structured` + `contains: [inline]`** — "structured container of
   inline" is suspect (details holds blocks; dl holds dt/dd).
4. **`code-block` and `inline-code` have NO `content_handler`** (missing) while `code` has `handler: code`.
   Three code elements, inconsistent handler declaration (the missing ones are the `opaque ⟺ DSL-handler`
   correspondence's only violations).
5. **`table` is `opaque-or-structured`** — the ONLY element with a dual content type (opaque CSV/TSV/JSON when
   a format positional is present; raw-HTML/structural otherwise). A unique-value-of-one — examine whether the
   dual path is principled or a bandaid.
6. **`item` has no `content.type`** at all (navigation).
7. **`marginnote` is category `inline-formatting`, `type: prose`, `contains: [inline]`** — but it was
   established to be *sugar for `<note position=margin>`* (a note is `[block]`). Its processing profile
   (inline) disagrees with that semantic claim — examine (is marginnote really a distinct inline element in
   code, or sugar mis-specced?).
8. **`minipage` category `frameables`, but processor-sealed** (the overload above) — its profile is unique.

## The measured `content.type` distribution (the raw "is" axis)
- **prose** (default processor, interpreted as Enscribe text): the large majority — all inline-formatting,
  titles/metadata text, p, note, aside, blockquote, caption, the theorem family, cite/ref/doi/date, etc.
- **opaque** (non-default handler): the math family, code/inline-code/code-block, diagram, svg, table,
  library, minipage. *(Split by the overload above into foreign-DSL vs isolation.)*
- **structured** (a container of *specific declared child elements*, not free prose): the regions
  (article/book-front/body/back), document containers (article/book/book-part), data, meta, author,
  bibliography/bib-entry, glossary/glossary-entry, dl, details, endnotes, note-list, sub-section(*).
- **none** (genuinely empty — no content): `config`, `hr`.
- **opaque-or-structured**: `table` only.
- **missing**: `section`, `item`.

## The `becomes` axis (content destination — unnamed but real)
- `children` — pipe content becomes the element's children (most prose elements).
- `figcaption` — `fig`: pipe content becomes a `<figcaption>` (the caption sub-part).
- `text-content` — `code`: becomes a text node.
- `sealed-subdocument` — `minipage`: the isolation case.
- `raw-svg-source` — `svg`: raw markup passed through.
- `parsed entries (registered in citation system)` — `library`: harvested into a registry, not rendered in place.
- *(missing)* — the structured/region elements (their content is their declared children, no pipe transform).

`becomes` distinguishes **render-in-place** (`children`, `figcaption`, `text-content`) from **harvest/register**
(`library` → citation system; and by extension `data`/`dataset` → the asset store) from **seal-and-recurse**
(`minipage`). This is the element-scale "store/consumer/render" distinction showing up as a content-destination.

## To do in Part II (the "should" + the mapping — NOT done here)
- Map each measured profile onto the **semantic families** and the **addressing primitives**; where the
  processing profile and the semantic family disagree, that is a **named bridge or drift** (per the
  two-taxonomy principle).
- Resolve `opaque` overload → split into the **processor** axis and the **scope** axis.
- Resolve the punch-list (section gap, the `[inline]` mis-specs, the missing code handlers, `table`'s dual
  type, marginnote-as-sugar, `span` removal).
- Name the **content-destination** axis (`becomes`: render-in-place / harvest-register / seal-recurse).
- Decide the canonical processing-class set the per-element specs should declare and conform to.

---

# Part I-B: the FUNCTION inventory (the real "is" of the engine functions, not the labels)

Per the reframing (the processing taxonomy is the map of minimal engine functions + tag→function routing,
NOT the declarative per-tag fields). Measured against `main`. This is the current operating point in the
optimization landscape (objective: fewest functions/special-cases; constraints: load time, processing time,
coupled cost = per-tag declarative data).

## The measured counts

| function class | count | how tags route to it |
|---|---|---|
| **handlers** (`interpreter/handlers/*.js`) | **18** | via `handler_module:` in element frontmatter |
| **elements with an explicit handler** | **29 / 109** | the other **80** take the DEFAULT path (no handler) |
| **DSL processor targets** (`dsl-registry` LANGUAGES) | **~17** | math, math-display, code, diagram, mermaid, abc, csv, tsv, table, svg, library, dataset, minipage, align, cases, matrix, eqnarray |
| **loader-ish modules** | ~5 core | asset-load, library-load, table(-cell), node-assets, registry |
| **formatter-ish modules** | ~6 | format-html, frameable, registry, scoped-number, sidenotes, parser-errors |

## What the numbers say about the operating point

**1. The system is ALREADY "few functions, many tags" — NOT one-handler-per-tag.**
Only **29 of 109** elements declare a handler; **80 elements (73%) go through the DEFAULT path** (no
dedicated handler — generic prose/structured processing driven by their declarative fields). So the
"as few as possible" instinct is *already substantially realized*: the ~70 prose/metadata/structured
elements share ONE generic path, parameterized by `content.type`/`contains`. **This is direct evidence for
Attack 2:** the declarative fields are NOT residue — they are *exactly* the parameters that let 80 tags
share one function. Delete `content.type` and the default path can't tell prose from structured. The fields
are load-bearing *for the few-functions goal*.

**2. Handler fan-in is mostly 1, with two real generic handlers:**
- `theorem` handler serves **8** tags (theorem/lemma/corollary/proposition/definition/proof/example/remark)
  — a genuine generic-parameterized handler (one function, eight tags, driven by which-theorem-kind data).
- `math` handler serves **7** (math/inline/display/align/cases/matrix/eqnarray) — same pattern.
- The other ~16 handlers are fan-in 1 (a/aside/cite/code/code-block/diagram/figure/frame/inline-code/
  library/minipage/ref/svg/table). Each is a one-tag special case — **candidates to examine for collapse**
  (e.g. could code/code-block/inline-code be ONE handler parameterized by inline-vs-block? could a/cite/ref
  share a "reference-ish" handler?).

**3. The default path is the largest shared function and the least visible.**
80 elements flow through it with no handler file — so it is the most important function in the inventory and
the one most driven by declarative data. Its parameters ARE `content.type` (prose vs structured vs none) and
`contains` (inline vs block vs child-list). This is where the "few-functions ⟺ declarative-data" tradeoff
lives most heavily: the default path is maximally generic, so it needs maximal declarative parameterization.

## What this settles (the tension, against evidence not argument)
- **"content.type is redundant" — FALSE as stated.** It is the dispatch/parameter datum that lets 80 tags
  share the default path and lets the parser decide descend-or-not. It is load-bearing PRECISELY BECAUSE the
  system already minimizes functions. (It MAY be over-specified in places — see the punch-list — but the
  field as a category is not redundant.)
- **"as few functions as possible" — already largely achieved** (29 handlers' worth of special-case + 1 big
  default path for 80 tags). The remaining optimization is the **~16 fan-in-1 handlers**: which are genuine
  special cases (a real distinct behavior) vs. collapsible into a generic parameterized handler.
- **"becomes falls away" — LIKELY TRUE.** It is formatter output; with ~6 formatters it is the formatter's
  concern, not a needed tag-level axis (modulo the parser/harvest cases — library's "register" vs render is
  real and lives in the handler/loader, not in `becomes`).

## The optimization frame (constraints to apply in Part II)
- **Objective:** minimize (handlers + processors + loaders + formatters) and special-cases.
- **Coupled cost:** each function removed by genericization ADDS per-tag declarative data (the default path
  proves it). So the objective is really *minimize total complexity = functions + declarative-config*, not
  functions alone.
- **Constraint — load time:** fewer/shared functions = smaller bundle; but DSL processors (math/code/diagram)
  are heavy and ideally deferred/loaded-on-demand (esp. for live/interactive docs that may not need them
  until interaction).
- **Constraint — processing time:** generic-parameterized functions branch on declarative data at runtime;
  for live/interactive docs this runs in-browser repeatedly, so over-genericization can cost runtime. This
  pressure pushes BACK toward some specialization — the counterweight to "fewest functions."
- **Decision variable:** the granularity of the function network. The ~16 fan-in-1 handlers are the live
  question — collapse (fewer functions, more config, maybe slower generic dispatch) vs. keep (more functions,
  less config, faster specialized paths).

## Part II target (now precise)
Resolve the **~16 fan-in-1 handlers**: for each, is it a real special case or collapsible? Apply the
objective (min functions+config) under the load/processing constraints. Map the result onto the function
taxonomy (recognizer/loader/processor/formatter, ordered = pipeline position). Keep `opaque` as the
parse-time bit. Treat `content.type`/`contains` as the default-path PARAMETERS (keep, possibly tighten),
and `becomes` as formatter output (likely drop as a tag axis).
