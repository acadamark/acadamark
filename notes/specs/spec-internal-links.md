# Internal page links and page slugs — design

## The problem
Authors link between site pages by hardcoding output paths — `<a href="design.html">` —
which bakes in the dir-per-page layout and the page's current location. When the output
structure or a page's nav position changes, every such link breaks; and a link to a page that
doesn't exist (`demos.html`) passes silently. Authors should reference a page by a stable
identity and let the builder produce the correct URL.

## The model: identity vs position
A page has two independent properties:
- **Identity** — a stable *slug*, living with the page (in its `<meta>`). Invariant under
  reorganization.
- **Position** — where the page sits in the master's `<nav>` tree. Owned by `<nav>`, freely
  reorganized.

Authors reference identity (`<a {slug} | {label}>`); the builder reads position (the nav) and
emits the URL. Reorganizing the menu moves only the emitted URL; every authored link
re-resolves untouched. This is why the slug must **not** come from the nav — if position
supplied identity, a menu move would change the slug and break every link.

> Change from today: the **static** build has made this move — it sources the slug from the
> page's own `<meta>` (explicit `<meta slug=…>`, else the slugified `<meta>` title — full three-tier
> order below; `static-website.js`). The **live** path has not: it still derives the slug from the nav menu
> title (`website-structuring.js`, `assignSlug(title, src)`), so live page identity diverges
> from static until it adopts the `<meta>` slug — tracked by #299. In the end state, in both
> paths, the nav `<item>` keeps `src` (which page) and the menu label (display text) but no
> longer defines the slug.

## Slug — the page's identity
Taken from the **first of these that exists**:
1. **Explicit** — `<meta slug=…>` in the page source, if present. A deliberate, permanent handle,
   independent of title and position — the pinned identity.
2. **Derived from the page title** — else slugify the page's `<meta>` title.
3. **Derived from the nav title** — else, last resort, slugify the title in the page's nav item
   (`<item src | Title>`).

Every page should carry a `<meta>` title, so tier 3 is a rare fallback, not a normal path.

Slugs are **unique site-wide**, but a collision **never blocks the build** — the always-render rule
governs here (the decision in `notes/decisions.md`, "Always renders — never block the build on an
error"; the mechanics in `notes/specs/principles.md`), exactly as it governs tag-errors and unresolved
refs:
- Two slugs **derived** from a title (tier 2 or 3) that collide are **uniquified** — a suffix is
  appended so both pages still get working URLs — with a **warning**.
- A **hard duplicate** the engine can't cleanly resolve — two pages **pinned** to the same explicit
  `<meta slug>` — is **not** a build error. The engine does not silently rename a pinned identity;
  instead whatever **depends** on that slug (an `<a {slug}>` link, a cross-ref, a menu item) **warns and
  does not resolve** (a visible `??…??`-style marker, like an unresolved `<ref>` / `<cite>`), while the
  **page itself still renders and the build completes**.

All warnings are logged to the console / CLI but never halt rendering. (Recorded here is the rule and
the policy — not an algorithm: the uniquification suffix and any pinned-collision tiebreak are the #300
implementation's to reconcile.)

When an `<a {slug}>` resolves to a page whose slug was *derived* (not declared), the build also warns: a
derived slug is title-coupled, so a title rename would silently break the link, and the warning is the
cue to pin it with `<meta slug=…>`.

## Authoring form
- `<a {slug} | {label}>` — a link to the page with that slug; the pipe is the visible text.
- `<a {slug}>` — no pipe; the visible text defaults to the target page's title.
- External links keep the explicit-href form `<a href="https://…" | label>`, unchanged.

## Output URLs — path-style, from nav position
The source tree stays **flat** (one directory per page); the *output* mirrors the nav
hierarchy. Each page is written at its nav-path location: a page under groups
"References → Layer 1" with slug `export` is emitted at `references/layer-1/export/index.html`
and addressed as `/references/layer-1/export/`. Group path segments are the slugified group
titles; the final segment is the page's slug. URLs end in a trailing slash (`/…/`; the server
serves `index.html`) — so the site needs an HTTP server, not `file://`.

Consequence (accepted): a page's URL mirrors its menu position, so moving it in the nav changes
its public URL. In-site links self-heal (they re-resolve by slug); externally-held URLs
(bookmarks, inbound links) to the old path break and would need redirects. This is the
deliberate trade for `<nav>` being the single source of truth — most SSGs decouple URL from
menu to avoid it; this couples them on purpose.

## Resolution — no router
The builder, which already loads each page to render it:
1. **Harvests** each nav page's slug (explicit `<meta slug>`, else the page title, else — last
   resort — the nav title) → a slug → page map; on a collision it applies the always-render policy
   (uniquify a derived collision with a warning; a pinned duplicate leaves the dependent links
   unresolved with a warning), never a build failure.
2. **Walks** the nav tree to compute each page's path (group slugs + page slug).
3. **Resolves** every `<a {slug}>` to the target's path, made relative to the current page's
   depth (`../…`).
4. **Writes** each page's `index.html` at its path location.

Because every URL is a real file at its path, a plain static host serves it directly — **no
router**. *Today this resolution is the **static** build's alone:* it harvests the `<meta>` slug
map and resolves every `<a {slug}>`. The live SPA does **not** yet — an authored `<a {slug}>` is
currently inert there (an unresolved `data-page-slug` marker), and the live router keys on the
nav-title slug rather than the `<meta>` slug (tracked by #299). The intended end state — the
target that work reaches — is that the live SPA resolves the same `<a {slug}>` form through its
existing router, so static and live share the authoring form and the slug map, differing only in
how the URL is produced.

## Errors and warnings
Per **Always renders** (`notes/decisions.md`), every item below surfaces visibly — inline at its
location *and* in the console / CLI log — and **none halts the build**:
- Duplicate slug → **never a build error**. The resolver still wants a unique slug → page map, so a
  *derived* collision is **uniquified** with a **warning**; a *pinned* duplicate (the same explicit
  `<meta slug>` on two pages) leaves the dependent link / ref / menu-item **unresolved with a warning**,
  the pages themselves still rendering.
- `<a {slug}>` with no matching page → the link **degrades, text-preserving**: the authored label stays
  (so the sentence still reads as prose), the live `href` is dropped, and the link carries the
  unresolved-link styling — the `ref-error` marker class, shared with an unresolved `<ref>` — so it is
  visibly flagged. A **warning** names the broken slug on the console / CLI; the **build completes**.
  (The static builder previously hard-`throw`ed on a broken `<a {slug}>`; the always-render decision says
  it must not — a broken authored link is surfaced and degraded, never a failed build.)
- `<a {slug}>` resolving to a *derived* (not declared) slug → **warning** (pin it before a rename bites).

## Scope note
This rides on the static website emitter (#246 / #278). It is engine + builder work: the engine
parses `<a {slug} | label>` and the `<meta slug=…>` kwarg; the builder owns slug harvest,
nav-path computation, link resolution, and the path-style output. Pretty trailing-slash URLs
(`/slug/` not `/slug/index.html`) land with it.
