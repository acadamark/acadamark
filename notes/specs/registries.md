# The registries — DSL and handler registration (#341)

**Scope:** the two registration subsystems of the interpreter — the **handler registry** (tag → handler
function, the host/role axis) and the **DSL/processor registry** (content-language → processor + assets, the
language axis). It spans `interpret-plugin.js` (`HANDLER_REGISTRY`), `core/dsl-registry.js` (`LANGUAGES`),
`interpreter/dsl/registry.js` (`DSL_REGISTRY`), and `lib/host-accept-sets.js` — not any single file.

**Status:** design, for Ariel's review. Becomes `notes/specs/registries.md` on landing.

**Decision on record (Ariel):** both registries become **explicit tables externalized from the handlers**, not
logic baked into code — **two separate tables, same format**, each with a single source per entry that the code
derives its indices from, plus a load-time guard. They are **not** merged into one table: the handler axis
(host/role) and the DSL axis (language) are the two disjoint lookups of the processing taxonomy and DESIGN.md's
host/language model; merging them would flatten that. Same *pattern*, two *registries*. This spec is the *how*.

## The problem, from the code

Adding one external DSL today means hand-editing the same DSL's facts into **four** separate places that must
agree, none of which references the others:

1. **`core/dsl-registry.js` `LANGUAGES`** — parse-time: identifier → content-handler name. Sets
   `isOpaqueContent` (descend vs hold). ~25 entries; most are *not* external-asset DSLs.
2. **`interpreter/dsl/registry.js` `DSL_REGISTRY`** — view-time: name → { containerTag, contractClass,
   liveAssets{ bundleLoader, cdnUrl, initScript }, staticRenderer, staticClass }. Only **2** entries
   (mermaid, abc) — the DSLs needing a client-side JS library.
3. **`interpreter/lib/host-accept-sets.js` `HOST_ACCEPT_SETS`** — host/language axis: which host admits the
   language (e.g. `diagram` admits `mermaid`, `abc`).
4. **A gate shorthand** in `normalize-to-canonical.js` + the **handler** (`HANDLER_REGISTRY` via the vocab
   `handler_module`).

The module comments already name the cost — *"a new engine is a new entry here + a gate shorthand, not a new
vocabulary element"* — and `DSL_REGISTRY`'s header already anticipates *"a public, setup-time `registerDsl` as
a thin additive layer over this same structure."* This spec builds that.

## What must NOT change (the separation to preserve)

The four indices have **different consumers at different lifecycle phases** — parse-time opacity, view-time
asset emit, host validation, tagname rewrite. `DSL_REGISTRY`'s comment is explicit: conflating parse-time
dispatch with view-time asset policy is wrong. So the unification is **one source → many derived indices**, and
the indices stay separate structures with their existing accessors (`getContentHandler`, `getRegisteredDsls`,
`hostAcceptsLanguage`). **Consumers do not change.** This is what makes the refactor low-risk and
behavior-neutral.

Also unchanged: the ~19 `LANGUAGES` entries that are **not** external-asset DSLs (math/code sigils, matrix/
cases/align/eqnarray, table, library, dataset, svg, minipage). Those are enscribe-native or storage/opaque
markers, not `registerDsl` clients. `registerDsl` is for **external-library DSLs** (today: mermaid, abc). The
spec must not force those 19 into a DSL shape they don't fit.

## The design: one registration record → derived indices

A single declarative record per external DSL is the source of truth:

```
registerDsl({
  name,                      // 'mermaid' — the key, the data-enscribe-dsl value, the language id
  host,                      // 'diagram' — the host whose accept-set gains `name`
  handler,                   // reference to the handler (or its module id) — wires HANDLER_REGISTRY dispatch
  opaqueAtParse: true,       // → derives the LANGUAGES entry (parse-time hold)
  view: {                    // → derives the DSL_REGISTRY record (omit for a DSL with no client assets)
    containerTag, contractClass,
    liveAssets: { bundleLoader, cdnUrl, initScript },
    staticRenderer, staticClass,   // staticRenderer: null when live-only (the mode resolver's source of truth)
  },
})
```

`registerDsl` populates, from that one record: the `LANGUAGES` entry (from `name` + `opaqueAtParse`), the
`HOST_ACCEPT_SETS` membership (from `host`), the `DSL_REGISTRY` record (from `view`, only if present), and the
handler dispatch (from `handler`). The built-in DSLs (mermaid, abc) become **seed registrations** — the literal
Maps become "derived from the seed registrations at module load," exactly the "built-in literal becomes the
seed" path the code's header predicts.

### Derivation, not duplication
The indices remain the runtime lookups (unchanged accessors), but they are **built by iterating the
registrations**, not hand-written. A fact about mermaid lives once (its registration); the four indices are
views. That is the anti-drift win: the four can no longer disagree, because they share a source.

## The handler registry (parallel structure, separate table)

`HANDLER_REGISTRY` (`interpret-plugin.js`) maps a vocab tag's `handler_module` → handler function — the
host/role axis ("which function turns a `<table>` / `<theorem>` / `<figure>` tag into output"). ~13 handlers,
covering tags that are mostly **not** DSLs. It is a separate concern from the DSL/processor registry and stays
a separate table.

Today it has the same co-edit drift: adding a handler means hand-editing (a) the vocab file's `handler_module`,
(b) a `HANDLER_REGISTRY` entry, and (c) the handler file — three lists that must agree, unguarded. **They
already disagree:** `ref.md` / `cite.md` declare `handler_module: ./handlers/{ref,cite}.js` with no matching
`HANDLER_REGISTRY` entry (their real handling is plugin → internal-node via `INTERNAL_REGISTRY`), producing a
silent runtime "unknown handler" warn-and-fallthrough. (Filed separately; the guard below catches it.)

Same treatment as the DSL registry, **same record format**: a single source per handler (the handler declares
its own vocab key / `handler_module` id), the `HANDLER_REGISTRY` table is derived from those, and consumers keep
their accessor (`HANDLER_REGISTRY.get(vocab.handler_module)` unchanged). The externalization is: the registry
table stops being a hand-written literal in `interpret-plugin.js` and becomes a derivation over the registered
handlers, so the vocab `handler_module` values and the registry keys share a source.

## The load-time consistency guard (one mechanism, both registries)

Mirror the existing single-source guards (`check-data-fresh`, the `normalize-to-canonical` module-load
assertions). One guard mechanism serves both registries:

- **DSL registry:** for every registration, its derived presence in each index is consistent — a `view`-bearing
  DSL has a `LANGUAGES` entry, a `DSL_REGISTRY` record, and an accept-set membership on its host. A
  registration missing a derived index, or an index entry with no backing registration, fails loudly.
- **Handler registry:** every vocab `handler_module` (for `interpreter_strategy: handler` elements) resolves to
  exactly one `HANDLER_REGISTRY` entry and one handler file, and every `HANDLER_REGISTRY` entry is claimed by at
  least one vocab element. **This assertion catches the ref/cite drift automatically.**

This turns "one place to edit" from a convention into a structural guarantee for both registries.

## Migration sequence (spent once landed — strip to evergreen form at the end)

> **Plan-shaped section.** The steps below describe the one-time transition and are removed when the build
> lands, leaving the standing description above. The build slice's last step de-time-binds this doc.


Because consumers call accessors (`getContentHandler`, `getRegisteredDsls`, `hostAcceptsLanguage`), the change
happens behind them:

1. **Introduce `registerDsl` + the registration records** for mermaid and abc, deriving the same three index
   entries they have today. Point the existing Maps' construction at the derivations (or build alongside and
   assert equality). Accessors unchanged.
2. **Verify byte-identical**: `#304` 157/157, all three suites green. The derived indices must equal today's
   literals exactly.
3. **Delete the now-redundant hand-written literals** for mermaid/abc (their rows in `LANGUAGES`,
   `DSL_REGISTRY`, `HOST_ACCEPT_SETS['diagram']`), leaving the registrations as sole source. Re-verify
   byte-identical.
4. **Add the load-time guard.** Re-verify.

The 19 non-DSL `LANGUAGES` entries stay as they are throughout (they are not `registerDsl` clients); the spec
should state that boundary explicitly so a future contributor doesn't try to force them through `registerDsl`.

## Open sub-question for the build (flag, don't pre-decide)

Whether `registerDsl` should also derive the **shorthand/gate** registration in `normalize-to-canonical.js`
(the 4th touch-point) or leave that separate. Deriving it completes "one place"; but it reaches into the
tagname-rewrite pass, a different subsystem. Recommendation: **scope the first build to the three
index-derivations (LANGUAGES, DSL_REGISTRY, HOST_ACCEPT_SETS) + the guard**, and treat shorthand-derivation as
a fast-follow once the core registration is proven. Note it in the build report.

## Non-goals

- Not a public/published API this cycle (the `not-in-exports` boundary stays; `registerDsl` is internal until
  a deliberate API decision). 
- Not touching the parse-vs-view separation. 
- Not migrating the 19 native/storage language entries.
