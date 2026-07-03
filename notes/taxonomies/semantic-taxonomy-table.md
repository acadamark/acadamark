# Semantic taxonomy — element × axis table

The companion to the semantic taxonomy prose: one row per vocabulary element (107), grouped by family.
Where the prose argues *why* an element sits in a family, this table records *what falls out* of that
placement across the cross-cutting dimensions — the same role the document taxonomy's type×axis table plays.

**Columns**
- **Family** — the authorial act (primary classification).
- **Sub-act** — the split within a family (e.g. emphasis-proper vs technical-register), where one exists.
- **Flow** — in-flow (part of the running discourse) vs out-of-flow (set apart / pointed at). "—" = not a
  flow-bearing content element (containers, metadata, apparatus).
- **Pair** — the element's partner across the inline↔block *length* bridge, if it has one (e.g. `q`↔`blockquote`).
- **Addressed?** — carries the set/identity (`@id`) addressing property: can be pointed *at* (◆), points *at*
  a target (→), or n/a (·). This column is owned by the document taxonomy; recorded here, not defined here.
- **Processing class** — how the element is actually handled: **default** (prose/text processor), **handler**
  (a `handler_module`), **DSL/opaque** (content held for a DSL or opaque payload), **sealed** (opaque →
  deferred Enscribe sub-run), **suppressed** (renders to nothing; consumed at build). Derived from the live
  `LANGUAGES` map, `interpreter_strategy`, and `SUPPRESSED_APPARATUS`.
- **Bridge / note** — where **semantic family ≠ processing class**, the named bridge (the anti-drift signal),
  or a placement note.

A row whose **Family** and **Processing class** "disagree" is a **named bridge**, not drift — the table makes
each one visible instead of leaving it buried in prose. Those rows are flagged **⇄**.

---

## 1. Primary prose

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `p` | — | in | — | · | default | The baseline. Prose is one content-language among peers, not privileged. |

## 2. Emphasis & marking

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `em` | emphasis-proper | in | — | · | default | |
| `strong` | emphasis-proper | in | — | · | default | |
| `b` | emphasis-proper | in | — | · | default | |
| `i` | emphasis-proper | in | — | · | default | |
| `u` | emphasis-proper | in | — | · | default | |
| `s` | emphasis-proper | in | — | · | default | |
| `sub` | emphasis-proper | in | — | · | default | |
| `sup` | emphasis-proper | in | — | · | default | |
| `abbr` | technical-register | in | — | · | default | notation-adjacent; stays default (bridge toward fam 6). |
| `kbd` | technical-register | in | — | · | default | notation-adjacent; confirm not routed to a DSL. |
| `samp` | technical-register | in | — | · | default | notation-adjacent. |
| `var` | technical-register | in | — | · | default | notation-adjacent. |
| `output` | technical-register | in | — | · | default | notation-adjacent. |
| `term` | marking (↔ ref) | in | — | → | default | **Open question** — marks a defined term, *may* point at its definition (fam 4 pull). |

## 3. Aside

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `note` | aside | out | — | ◆ | default | One note, three positions (foot/end/margin). `<marginnote>` collapsed here (#333). Marker or spatial adjacency associates it. |
| `aside` | aside container | out | — | · | handler ⇄ | boxed aside; served by `aside.js`. |
| `note-list` | collected-note container | out | — | · | default | |
| `endnotes` | collected-note container | out | — | · | default | |
| `details` | expandable aside | out | — | · | default | reader can expand. |
| `summary` | expandable-aside label | out | — | · | default | the `<details>` label. |

## 4. Quotation & sourcing

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `q` | quotation | in | `blockquote` | · | default | inline form; length picks the form. |
| `blockquote` | quotation | out | `q` | ◆ | handler ⇄ | block form; **frameable in processing** — named bridge (`frame.js`). |
| `cite` | reference (pointer) | in | — | → | handler ⇄ | points at a bib key; real dispatch is resolution-plugin → internal node (see #341 ref/cite). |
| `ref` | reference (pointer) | in | — | → | handler ⇄ | points at an `@id`; same resolution-plugin path as `cite`. |
| `doi` | reference (pointer) | in | — | → | default | points at a DOI target. |
| `a` | reference (link) | in | — | → | handler ⇄ | points at a URL; served by `a.js`. |

## 5. Exhibit

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `fig` | visual exhibit | out | — | ◆ | handler | `figure.js`. |
| `table` | tabular exhibit | out | — | ◆ | DSL/opaque ⇄ | tabular content parsed by a format (`table.js` + `TABLE_FORMATS`). |
| `diagram` | data/visual exhibit | out | — | ◆ | DSL/opaque ⇄ | host for an external engine (mermaid/abc) — language axis. |
| `svg` | visual exhibit | out | — | ◆ | DSL/opaque ⇄ | opaque markup; `svg.js`. |
| `frame` | framed exhibit | out | — | ◆ | handler | `frame.js`. |
| `caption` | exhibit label | out | — | · | default | the exhibit's label; **no coverage disposition yet (#346)**. |
| `minipage` | exhibit-by-use | out | — | ◆ | **sealed** ⇄ | sealed sub-document: opaque at parse → deferred Enscribe sub-run. Named bridge, not drift. |

## 6. Formal statements

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `theorem` | labeled formal claim | in | — | ◆ | handler | `theorem.js` (the formal-statement handler). |
| `lemma` | labeled formal claim | in | — | ◆ | handler | `theorem.js`. |
| `corollary` | labeled formal claim | in | — | ◆ | handler | `theorem.js`. |
| `proposition` | labeled formal claim | in | — | ◆ | handler | `theorem.js`. |
| `definition` | labeled formal claim | in | — | ◆ | handler | `theorem.js`. |
| `proof` | justification | in | — | ◆ | handler | discharges an assertion's obligation. |
| `algorithm` | formal procedure | in | — | ◆ | handler | (element may grow; act is placed). |
| `example` | illustration of a claim | in | — | ◆ | handler ⇄ | **moved from aside (#337)**; shares the `theorem.js` handler (act = fam 6, processing = theorem class). |
| `remark` | illustration of a claim | in | — | ◆ | handler ⇄ | moved from aside (#337); `theorem.js`. |
| `dl` | definitional structure | in | — | ◆ | default ⇄ | **moved from exhibit (#335)**; a *definition list*. Semantic fam 6, processed **block-prose** — one family spanning processing classes. |
| `dt` | definition term | in | — | · | default ⇄ | part of `dl`. |
| `dd` | definition body | in | — | · | default ⇄ | part of `dl`. |
| `glossary` | collection of definitions | out | — | ◆ | default ⇄ | moved from store/exhibit (#335); block-prose processing. Also set-addressed (document taxonomy). |
| `glossary-entry` | definition (in glossary) | in | — | ◆ | default ⇄ | member of `glossary`. |

## 7. Notation

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `inline-math` | math notation | in | `display-math` | · | DSL/opaque | embedded; length bridge to display. |
| `display-math` | math notation | out | `inline-math` | ◆ | DSL/opaque | exhibited. |
| `math` | math notation | out | — | ◆ | DSL/opaque | |
| `align` | math notation | out | — | ◆ | DSL/opaque | |
| `eqnarray` | math notation | out | — | ◆ | DSL/opaque | |
| `matrix` | math notation | out | — | ◆ | DSL/opaque | |
| `cases` | math notation | out | — | ◆ | DSL/opaque | |
| `inline-code` | code/verbatim | in | `code-block` | · | DSL/opaque | embedded; length bridge. |
| `code` | code/verbatim | out | `code-block` | ◆ | DSL/opaque | |
| `code-block` | code/verbatim | out | `inline-code` | ◆ | DSL/opaque | exhibited/verbatim. |

*(Family 7 is where semantics and processing coincide perfectly: foreign formal language ⟺ DSL-owned. No ⇄ rows.)*

## 8. Stores

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `data` | store container | — | — | ◆ | **suppressed** | held side of `@id` addressing; consumed at build, renders to nothing. |
| `library` | bibliography source | — | — | ◆ | **suppressed**/DSL | bibliography payload (citation-js); suppressed apparatus. |
| `dataset` | opaque payload | — | — | ◆ | DSL/opaque | pure storage; never a renderer. |
| `bibliography` | rendered bib | out | — | ◆ | handler | the rendered reference list (cite.js family). |
| `bib-entry` | bib item | out | — | ◆ | default | a single reference entry. |

## 9. Declarations & metadata

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `title` | title | — | — | · | default | |
| `subtitle` | subtitle | — | — | · | default | |
| `article-title` | title (per-level) | — | — | · | default | |
| `article-subtitle` | subtitle (per-level) | — | — | · | default | |
| `book-title` | title (per-level) | — | — | · | default | |
| `book-subtitle` | subtitle (per-level) | — | — | · | default | |
| `book-part-title` | title (per-level) | — | — | · | default | |
| `book-part-subtitle` | subtitle (per-level) | — | — | · | default | |
| `section-title` | title (per-level) | — | — | · | default | |
| `section-subtitle` | subtitle (per-level) | — | — | · | default | |
| `sub-section-title` | title (per-level) | — | — | · | default | |
| `sub-section-subtitle` | subtitle (per-level) | — | — | · | default | |
| `sub-sub-section-title` | title (per-level) | — | — | · | default | |
| `sub-sub-section-subtitle` | subtitle (per-level) | — | — | · | default | |
| `author` | contributor | — | — | · | default | contributor model pending (#338). |
| `editor` | contributor | — | — | · | default | contributor model pending (#338). |
| `name` | contributor field | — | — | · | default | |
| `affiliation` | contributor field | — | — | · | default | |
| `email` | contributor field | — | — | · | default | |
| `orcid` | contributor field | — | — | · | default | |
| `date` | provenance | — | — | · | default | |
| `publication-date` | provenance | — | — | · | default | |
| `license` | provenance | — | — | · | default | |
| `version` | provenance | — | — | · | default | |
| `keywords` | descriptor | — | — | · | default | |
| `subject` | descriptor | — | — | · | default | |
| `lang` | descriptor | — | — | · | default | |
| `abstract` | summary-about | — | — | · | default | the one **prose-carrying** metadata member; may serialize differently for citation. |
| `config` | options | — | — | · | default | document options. |
| `meta` | metadata container | — | — | · | default | holds the metadata block. |

## 10. Structural scaffolding

| Element | Sub-act | Flow | Pair | Addressed? | Processing | Bridge / note |
|---|---|---|---|---|---|---|
| `article` | container | — | — | · | default | |
| `book` | container | — | — | · | default | |
| `book-part` | container | — | — | ◆ | default | |
| `article-front` | region | — | — | · | default | |
| `article-body` | region | — | — | · | default | |
| `article-back` | region | — | — | · | default | |
| `book-front` | region | — | — | · | default | |
| `book-body` | region | — | — | · | default | |
| `book-back` | region | — | — | · | default | |
| `section` | section container | — | — | ◆ | default | holds anything; **not prose** (moved from fam 1). |
| `sub-section` | section container | — | — | ◆ | default | |
| `sub-sub-section` | section container | — | — | ◆ | default | |
| `nav` | website skeleton | — | — | · | default | authored page set; **no coverage disposition yet (#346)**. |
| `nav-group` | website skeleton | — | — | · | default | grouping; #346. |
| `item` | website skeleton | — | — | · | default | page/order; #346. |
| `hr` | lightweight section break | in | — | · | default | a "very light section" — semantic shift, not presentational leftover. |

---

## Reading the ⇄ (semantic ≠ processing) rows — the anti-drift index

Every bridge the prose names now shows as a row-level mismatch:

- **`blockquote`** — quotation (fam 4), but **frameable** in processing. Length/frame bridge.
- **`cite` / `ref` / `a`** — reference (fam 4), handler-dispatched (and cite/ref actually via resolution-plugin → internal node; the #341 guard reconciles the stale `handler_module`).
- **`aside`** — aside (fam 3), handler (`aside.js`).
- **`table` / `diagram` / `svg`** — exhibit (fam 5), but **DSL/opaque** (language axis owns the content).
- **`minipage`** — exhibit (fam 5), but **sealed** sub-document. The one genuinely distinct processing mode.
- **`example` / `remark`** — formal statements (fam 6), on the **theorem handler**.
- **`dl` / `dt` / `dd` / `glossary` / `glossary-entry`** — formal statements (fam 6), processed **block-prose**. The clearest case of *one semantic family spanning several processing classes*.

No ⇄ appears in families 1, 2 (default throughout), or 7 (DSL throughout) — the two ends of the formality spine where semantics and processing coincide exactly. The bridges cluster in the middle families, which is exactly where the two-taxonomy tension lives.

## Coverage / open notes surfaced by tabulating
- **`caption`, `endnotes`, `item`, `minipage`, `nav`, `nav-group`** have no coverage-map disposition (**#346**).
- **`term`** placement is an open question (fam 2 marking vs fam 4 reference).
- **`author`/`editor`** contributor model is pending external-standards research (**#338**).
- **`bibliography` / `bib-entry`** are placed in family 8's orbit (rendered sourcing) — worth confirming
  against family 4 (they are the *rendered* form of what `cite` points at); flagged, not forced.
