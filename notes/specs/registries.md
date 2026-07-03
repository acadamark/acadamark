# The registries — DSL and handler registration (#341)

**Scope:** the two registration subsystems of the interpreter — the **handler registry** (tag → handler
function, the host/role axis) and the **DSL/processor registry** (content-language → processor + assets, the
language axis). It spans `interpret-plugin.js` (`HANDLER_REGISTRY`), `core/dsl-registry.js` (`LANGUAGES`),
`interpreter/dsl/registry.js` (`DSL_REGISTRY`), and `lib/host-accept-sets.js` — not any single file.

Both registries are **explicit tables externalized from the handlers**, not logic baked into code — **two
separate tables, same format**, each with a single source per entry that the code derives its indices from,
plus a load-time guard. They are **not** merged into one table: the handler axis (host/role) and the DSL axis
(language) are the two disjoint lookups of the processing taxonomy and DESIGN.md's host/language model; merging
them would flatten that. Same *pattern*, two *registries*.

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

Also unchanged: the `LANGUAGES` entries that are **not** external-asset DSLs (math/code sigils, matrix/
cases/align/eqnarray, table, library, dataset, svg, minipage, csv/tsv, and the diagram host). Those are
enscribe-native or storage/opaque markers, not `registerDsl` clients. `registerDsl` is for **external-library
DSLs** (today: mermaid, abc). The spec must not force those into a DSL shape they don't fit.

## The design: one registration seed → derived indices

A single declarative **seed** per external DSL is the source of truth. It carries only fs-free DATA (the
`view`'s two Node-only asset functions and the handler reference are attached at the interpreter layer — see
"The core/interpreter split" below), and lives in `core/dsl-registrations.js`:

```
{
  name,                      // 'mermaid' — the key, the data-enscribe-dsl value, the language id
  host,                      // 'diagram' — the host whose accept-set gains `name`
  handler,                   // the dispatching handler-module id (documents the handler-axis cross-link)
  opaqueAtParse: true,       // → derives the LANGUAGES entry (parse-time hold)
  view: {                    // → derives the DSL_REGISTRY record (omit for a DSL with no client assets)
    containerTag, contractClass,
    liveAssets: { cdnUrl, initScript },   // + bundleLoader, attached at the interpreter layer
    staticClass,                          // present only for a DSL with a build-time static renderer
    // staticRenderer is attached at the interpreter layer; null when live-only
  },
}
```

The indices are populated from that one seed: the `LANGUAGES` entry (from `name` + `opaqueAtParse`), the
`HOST_ACCEPT_SETS` membership (from `host`), and the `DSL_REGISTRY` record (from `view`, only if present). The
built-in DSLs (mermaid, abc) are the **seeds** — the literal Maps become "derived from the seeds at module
load." The `handler` field documents which handler dispatches the DSL's content (mermaid/abc share the
`diagram` host handler); it does not mint a HANDLER_REGISTRY entry — that comes from the vocab `handler_module`
on the handler side.

### The core/interpreter split
`LANGUAGES` / `getContentHandler` live in `core/` — the inward-pointing, fs-free foundation (`core.md`) that
imports nothing from `interpreter/`. For the seed to drive the parse-time `LANGUAGES` index it must therefore
be reachable from core, so the seed carries only DATA and lives in `core/dsl-registrations.js`. The two
Node-only asset FUNCTIONS (`liveAssets.bundleLoader`, the `readFileSync` bundle loader; `staticRenderer`, the
jsdom static renderer) cannot live in the fs-free core; they attach at the **interpreter** layer, by name, when
`interpreter/dsl/registry.js`'s `registerDsl` assembles the `DSL_REGISTRY` record (mirroring the existing
`registry.js` / `node-assets.js` data-vs-Node-function split). So "one record" means *data authored once in
core; behavior wired at the interpreter layer* — not one literal object. `registerDsl` stays internal.

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

## Deferred: shorthand/gate derivation

Whether `registerDsl` should also derive the **shorthand/gate** registration in `normalize-to-canonical.js`
(the 4th DSL touch-point) or leave it separate is deferred. Deriving it completes "one place"; but it reaches
into the tagname-rewrite pass, a different subsystem. The built registration covers the three DSL
index-derivations (LANGUAGES, DSL_REGISTRY, HOST_ACCEPT_SETS) plus the guard; shorthand-derivation is a
fast-follow, tracked in GitHub Issues.

## Non-goals

- Not a public/published API this cycle (the `not-in-exports` boundary stays; `registerDsl` is internal until
  a deliberate API decision).
- Not touching the parse-vs-view separation.
- Not migrating the non-DSL native/storage `LANGUAGES` entries (the sigils, math envs, table, library,
  dataset, svg, minipage, csv/tsv, and the diagram host) — they are not `registerDsl` clients.
