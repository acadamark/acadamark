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

> Change from today: the slug is currently derived from the nav menu title
> (`website-structuring.js`, `assignSlug(title, src)`). It moves to the page's own `<meta>`.
> The nav `<item>` keeps `src` (which page) and the menu label (display text), but no longer
> defines the slug.

## Slug — the page's identity
Sourced from the page's own `<meta>`:
1. **Explicit** — `<meta slug=…>` if present. A deliberate, permanent handle, independent of
   title and position.
2. **Derived** — otherwise, slugify the page's `<meta>` title.

Slugs are **unique site-wide**; a collision is a hard build error (the resolver depends on
uniqueness). When an `<a {slug}>` resolves to a page whose slug was *derived* (not declared),
the build warns: a derived slug is title-coupled, so a title rename would silently break the
link, and the warning is the cue to pin it with `<meta slug=…>`.

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
1. **Harvests** each nav page's slug from its `<meta>` (explicit or derived) → a slug → page
   map; hard-errors on a duplicate.
2. **Walks** the nav tree to compute each page's path (group slugs + page slug).
3. **Resolves** every `<a {slug}>` to the target's path, made relative to the current page's
   depth (`../…`).
4. **Writes** each page's `index.html` at its path location.

Because every URL is a real file at its path, a plain static host serves it directly — **no
router**. The live SPA resolves the same `<a {slug}>` form through its existing router; static
and live share the authoring form and the slug map, differing only in how the URL is produced.

## Errors and warnings
- Duplicate slug → **hard error** (uniqueness is load-bearing).
- `<a {slug}>` with no matching page → **error** (a real broken link, unlike today's silent
  passthrough of a bad `href`).
- `<a {slug}>` resolving to a *derived* (not declared) slug → **warning** (pin it before a
  rename bites).

## Scope note
This rides on the static website emitter (#246 / #278). It is engine + builder work: the engine
parses `<a {slug} | label>` and the `<meta slug=…>` kwarg; the builder owns slug harvest,
nav-path computation, link resolution, and the path-style output. Pretty trailing-slash URLs
(`/slug/` not `/slug/index.html`) land with it.
