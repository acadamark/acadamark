# Lists — design

## The construct

A list is an explicit container, closed explicitly:

```
<list>
<- first item ->
<- second item ->
</list>
```

`<list>` is the canonical element — JATS-shaped, exporting to `<list>` / `<list-item>`. `<ul>` and `<ol>` are **HTML render output only**: never authoring vocabulary, never shorthands, and never present in the canonical layer or in JATS.

Ordered lists take the `ordered` arg; unordered is the default:

```
<list ordered>
<- first ->
<- second ->
</list>
```

## Items

Inside a `<list>`, an item is written in one of two registers:

- **Sigil — `<- content ->`** (and the alternate `<* content *>`). Strict-safe. A paired sigil — opening with `<-` (or `<*`) and closing with the line-final `->` (or `*>`). The dash mirrors the `-` idiom, so a dash means "item" in both. A single-paragraph item. **Block-scoped** (see *The item sigil is block-scoped*) — unlike `<# … #>` / `<$ … $>`, it is recognized only at flow position, never inline.
- **Markdown idiom — `- content`.** Non-strict only. Existing behavior, kept.

Bare `- items` with no `<list>` wrapper remain the pure-markdown convenience for throwaway lists (non-strict, closed by markdown's own blank-line rule).

The canonical *named* marker — a bare `<li>` — is deferred (see *Deferred*).

## Why a sigil, not `<li>`

`<li>` is a CommonMark HTML-block tag, so a bare `<li>` or a pipe-less `<li content>` is claimed by remark's HTML-block tokenizer before enscribe sees it. Recognizing it as an item marker would mean special-casing `li` in the flow tokenizers — a grammar change that breaks the finder's tagname-agnostic invariant.

The sigil carries no tag name: `<-` trips no HTML-block condition, so `<- content ->` is additive recognition — no collision, no tokenizer surgery. It needs no pipe because sigils take no args. (In canonical tags the pipe is the finder's claim-delimiter that beats the HTML-block tokenizer, not an args separator — which is exactly why a pipe-less `<li content>` is *not* free.)

## The item sigil is block-scoped

Unlike the other sigils (`<# … #>`, `<$ … $>`, `` <` … `> ``), which are recognized inline as well as at block level, the item sigil is recognized **only at flow (block) position** — a marker on its own line inside a `<list>`. It is never claimed inline in prose. This is deliberate and load-bearing: `<-` and `->` are common in ordinary prose (R's `x <- y`, arrows, comparisons), and an inline sigil would mis-claim them — `x <- y` would raise a parse error and `A <- B … C -> D` would be mangled. Block-scoping keeps all prose `<-` / `->` safe, because the finder only looks for the marker at the start of a line.

The closer is the **line-final** `->` (or `*>`): the marker matches greedily to the last `->` on its line, so an inline arrow *inside* an item (`<- f maps A -> B ->`) does not close it early — only the trailing `->` closes, and `f maps A -> B` is the content. An item that must itself end in a literal `->` / `*>` uses the other sigil or the `-` idiom.

## The explicit closer

`</list>` is mandatory. It keeps the construct strict-safe (balanced tags), bounds the list without leaning on blank-line or indentation rules, and is where nesting and multi-paragraph items attach when they land.

## Layer 1, render, JATS

- **Canonical:** `<list>` + items.
- **HTML render:** hast `<ul>` / `<ol>` + `<li>` — the same output the markdown `-` path already produces, so the render is inherited. `<list>` and `<- … ->` normalize into that path; no second emitter.
- **JATS export:** `<list list-type="bullet">` (unordered) or `list-type="order"` (ordered), with `<list-item>` children. `<ul>` / `<ol>` never appear here.

## Strict mode (#36)

Lists were the gap that blocked strict mode. It closes here: the sigil `<- … ->` is a strict-safe item form (canonical and sigil registers both interpret under strict; only markdown idioms are disabled), so strict mode can ban the bare `-` idiom the way it bans every other idiom — authors write `<- … ->` instead.

## Deferred

One later, deliberate slice — these share a single mechanism, so they ship together:

- **Bare `<li content>` canonical marker.** Requires the grammar change above (claiming `li` ahead of remark's HTML-block tokenizer). Restores the canonical *named* item form.
- **Peer-close multi-paragraph items**, no indentation: everything from one marker to the next is the item. This is the *open-marker* model — a marker that stays open rather than closing. (The paired sigil `<- … ->` is explicitly bounded; the deferred bare `<li>` is not, which is exactly what peer-close keys off.) Inline-bounded items (this slice) and peer-close items are marker-exclusive, so this is a redesign of the item, not an add-on.
- **Tag-based nesting** (a `<list>` inside an item). Needs items that hold block content — i.e. peer-close — so it travels with the above. Meanwhile the `-` idiom nests via markdown indentation in non-strict mode.
- **`style`** (ordered marker scheme: decimal / alpha / roman → `<ol type>` or CSS) and **`start`** (→ `<ol start>`).
- Per-item id, loose / tight rendering, nested-scheme auto-variation.

## Build notes

- Reuse the markdown `-` → hast `<ul>` / `<ol>` render path; `<list>` and `<- … ->` normalize into the same hast.
- `<-` / `<*` recognition is additive — a dedicated **flow-only** tokenizer (NOT the inline sigil set), so prose `<-` / `->` is never claimed; no HTML-block collision (`<-` is not a tag name) and no grammar change. The closer matches the line-final `->` (greedy), so an inline arrow inside an item is content, not an early close.
- **Regression guard:** bare `-` markdown lists stay byte-identical. Item handling is scoped to `<list>` content and the sigil; top-level bare `-` lists are untouched (empty `test/fixtures/` diff).
- Authored `<ul>` / `<ol>` / `<li>` are **not** vocabulary — there are no `ul` / `ol` / `li` Layer 1 entries. An authored `<ul>` is therefore an unknown tag and escapes to literal text (the unknown-tag path); the rendered `<ul>` / `<ol>` / `<li>` arise only from lowering `<list>` to a markdown list. A regression test guards the literal-escape behaviour.