# Runtime data store — spec

## Status

Design recorded; **not** build-now. **Build-on-first-reader**: this stays unstarted until a concrete
runtime consumer needs it (the first interactive/client-side reader). When that reader is built, the
store is built *with* it, shaped to that reader's real need so the read API is validated by a real
caller rather than guessed. Parked in a future milestone; this note is the "blocked until a runtime
reader exists" gate so it isn't built speculatively.

**Additive, never a replacement.** The shipped resolution path stays exactly as it is. Nothing that
renders statically today gains a JS dependency.

## What it is (and is not)

The shipped data store resolves at **build time**: a body use-site (`<fig src="@id">`, and later
`<table … src="@id">`, `<diagram … src="@id">`, `<code … src="@id">`) gets its stored payload baked
into the page before it reaches a browser — an embedded image becomes a `data:` URI, a stored dataset
becomes inline parsed content. This needs no JavaScript and is the right default for static display.
It does not change.

The runtime store solves two problems the build-time path does **not**:

1. **Client-side readers** — a reader that re-reads its source *after* load (an interactive chart that
   re-derives from its CSV when the viewer changes a control; a reader that lazily parses on demand).
2. **Single-copy dedup** — one payload referenced from many use-sites is inlined once per use-site
   today. The runtime store holds it **once**, keyed, and serves every reader from that single entry.

It is **not** a replacement for build-time resolution and **not** a persistence layer. Static readers
keep working with JS off; the runtime store is substrate only for interactive readers and dedup.

## The model — a keyed in-memory store

The store is a **keyed map**: `store.get(id)` returns the stored payload (verbatim bytes/text) for a
`@data:`/`@id` key, plus minimal metadata (mime/format hint if the stored item carries one). That
keyed lookup **is** the "like a filesystem" read — the filesystem feel comes from keyed access, not
from persistence.

- **In-memory**, page-session lifetime. Not persistent by default.
- **Inert payloads.** The store returns raw content; the *reader* interprets it (format, display) —
  the same authoring principle as the static path: storage commits to nothing, the reader types it.
- **Minimal API.** Keep the read surface small and stable (`get(id)` → payload + optional
  format/mime; maybe `has(id)`). Nothing about display lives here.

## Hydration — the data island

At build, the payloads that **runtime** readers need are emitted into the page as a single bounded
**data island** — one inert block (e.g. a `<script type="application/enscribe-data">`-style payload
carrier), holding the keyed payloads — not scattered inline per use-site. On load the store hydrates
from that island once, keyed by id.

This is the runtime mirror of the build-time harvest: the static path strips stored items into a
build-time index and bakes them into use-sites; the runtime path emits the needed payloads into an
on-page island the store reads.

**Only payloads with a runtime consumer go in the island.** Pure-static assets keep baking to
`data:` URIs / inline content as they do now — the island is not a dumping ground for static-only
assets, or it just re-bloats the page.

## The web worker — optional backing, behind the same API

The worker is an **implementation detail behind `store.get`**, not a separate concept the reader sees.
It earns its place only when payloads are large enough that decoding/parsing on the main thread would
jank (large base64 images, big datasets). The store's API is identical whether it is backed by a
main-thread map or a worker; readers never know which.

- Default backing: a main-thread keyed map.
- Worker backing: an internal upgrade for large payloads, transparent to readers.

## Persistence — opt-in only

Default is in-memory, page-session lifetime. **No IndexedDB / localStorage by default.** Persistence
brings quota limits, stale data across document versions (reopen a doc and last version's payload is
still cached), and payloads lingering in the browser after the page closes — and it buys nothing for
the filesystem feel, which is keyed lookup, not durability.

Persistence stays *available* as an explicit author opt-in for large-asset caching across visits, but
it is never the default and always a deliberate choice.

## Dedup

One payload referenced from N use-sites: the island carries it once (keyed); the store serves all N
readers from the single entry, replacing today's N-times inlining — for runtime-read assets.

## Always-renders at runtime

The runtime store never becomes a dependency for content that renders statically today. A runtime
reader whose store read fails degrades **visibly** — an inline error in the reader's place, the
runtime analogue of the static unresolved-asset error — never a blank or a thrown build. Always-renders
holds at runtime exactly as it does at build.

## Flagged for later (do not decide now)

- **Store scope: per-page vs site-wide.** One island per page, or a shared site-wide store across a
  multi-page website (so a payload referenced from several pages hydrates once for the whole site).
  Decide when the first multi-page runtime reader appears; it connects to the website global-pass work.
- **Island encoding.** The exact carrier format (script-tag flavor vs other) is a build-time
  implementation call, made when the first reader is built.
- **Eviction / memory pressure** for very large stores — only if it ever bites.

## Build plan (when the first reader triggers it)

1. The keyed in-memory store + read API (`get`/`has`), main-thread map backing.
2. The build-emitted data island + load-time hydration (only runtime-consumed payloads).
3. Wire the first runtime reader against the API (the reader that triggered the build).
4. Dedup falls out of (1)+(2) — single keyed entry, many readers.
5. Worker backing — added behind the API only if payload size demands it.
6. Persistence opt-in — added only when a large-asset-caching case asks for it.

Items 5 and 6 are explicitly *not* part of the first build unless a real need is already in hand.
