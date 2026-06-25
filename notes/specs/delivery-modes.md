# Delivery modes: how an `.emd` document reaches a reader

An enscribe document (`.emd`) is authored once and can be *delivered* to a reader in several
shapes. This spec is the normative map of those shapes. It owns one question only — **how the
rendered (or renderable) document is packaged and reaches the reader** — and deliberately owns
nothing about *what* the render contains. The render itself (Layer 1 → HTML, composition,
numbering, parity) is owned elsewhere: single-document rendering by `notes/specs/pipeline.md`,
multi-page composition by `notes/specs/website.md`, the live/static equivalence contract by
`notes/specs/render-parity.md`, and the optional plain-HTML lowering by
`notes/specs/render-mode.md` (a distinct, orthogonal concern — *render-mode* is a flavor of the
HTML; a *delivery mode* is how that HTML is packaged). The engine, composition, and `.emd`
semantics are identical across every mode here; that shared center is the premise, not the subject.

## The shape of the space — three modes, two cross-cutting axes

The delivery space is not a flat list. It is **three modes** — distinguished by the properties
that change the artifact's *contract* (does an engine run at read time? where does the content come
from? is a server required?) — and **two axes that cut across the modes** rather than defining
them. The axes are the overlap regions: more than one mode draws from them, so they are specified
once here and referenced by each mode that admits them.

| Mode | Content at read time | Engine at read time | Server required | Capability | Built? |
|---|---|---|---|---|---|
| **Static** | already HTML (pre-rendered) | no | no | view only | yes |
| **Live** | `.emd`, **fetched** from siblings | yes (in browser) | yes (HTTP) | view, or view+edit | yes |
| **Single-file** | `.emd`, **embedded** in the HTML | yes (in browser) | no (`file://` works) | view+edit | **no** |

**The two cross-cutting axes (the overlaps):**

- **Asset delivery** — where the engine bundle and CSS come from: *sibling files*, *CDN*, or
  *inlined*. This is **not** a mode; it is an option a mode selects. Live admits all three;
  single-file admits CDN-or-inlined (it cannot have siblings — it is one file). Static references
  its assets as siblings (and may use CDN for display assets). Because asset delivery spans Live
  *and* single-file, it is a shared axis, not a distinguishing one — an earlier framing that listed
  "live with assets" and "live without assets" as separate modes was conflating this axis with a
  mode boundary. There is one Live mode; asset delivery is a knob on it.
- **Capability** — *view* or *view + edit*. Edit is the in-browser Write/Preview editor (implemented
  in `packages/enscribe/src/master-document/live-edit-view.js`, single-sourced across article and book
  so the two cannot drift — #211/#216; implemented, not separately specced). It requires an engine at
  read time, so Static cannot offer it; that empty cell is principled, not incidental (see §Static).
  Live and single-file both admit edit; the live shell flips it with `?edit` or a `data-enscribe-edit`
  mount attribute.

The discriminators that *do* define a mode are therefore: **(1) is the content pre-rendered or
rendered at read time, (2) is the content fetched or embedded, (3) is a server required.** Those
three are the mode boundaries; asset delivery and capability are options within them.

---

## Mode: Static

**Axis choices:** content = pre-rendered HTML; engine at read time = none; assets = sibling files
(+ CDN for display assets); capability = view only; server = none (any static host).

The document is rendered to HTML at **build time** and delivered as finished pages. No engine runs
in the reader's browser; the page is plain HTML referencing a stylesheet (and, for interactive
display affordances, build-inlined JS — but no composition engine). A multi-page static site is the
website composition (`website.md`) emitted as a dir-per-page tree; a single static document is one
HTML file (plus its asset siblings).

**Why view-only is a boundary, not a limitation.** A static page contains no engine and no `.emd`
source — there is nothing to edit *against* and nothing to re-render *from*. Editing is an
author-time act over source; static is the read-time projection of a past author-time render. The
absence of an edit capability is the definition of the mode, not a missing feature. (This is the
same read-time/author-time boundary the live/static parity contract rests on; `render-parity.md`.)

**Invariants.**
- Output is self-displaying HTML: a reader needs only a browser and the referenced stylesheet; no
  network round-trip to enscribe, no runtime composition.
- Asset references are depth-relative, so the tree is portable to any path on any static host
  (verified property the website build holds).
- Static is the canonical/default delivery for a published site; the other modes are demos or
  handoffs of the same source.

## Mode: Live

**Axis choices:** content = `.emd`, fetched at runtime; engine at read time = yes (in browser);
assets = sibling / CDN / inlined (the asset-delivery axis); capability = view or view+edit; server =
required (the shell fetches over HTTP).

A minimal HTML **shell** — an `index.html` with no body content — loads the engine and, at runtime,
**fetches** the master `.emd` and its children, composes them in the browser, and mounts the result.
One shell drives either kind of document: the runtime dispatch reads `<meta type>` and routes an
article, a book, or a website through the same path (the shell is type-agnostic; the dispatch is the
mounter's job). A live *website* is the multi-page case — the shell fetches the master, follows the
nav for page fetches, and composes exactly as the static build does (`website.md`,
`render-parity.md`); a live *document* is the single-master case. **Same mode, same shell; "website"
is the multi-page profile of Live, not a separate mode.**

**The server requirement is intrinsic.** Live fetches its content (and, unless inlined, its assets)
over HTTP relative to the shell's location. It therefore needs to be *served*, not opened from
`file://`. Removing the server requirement is not an option on Live — it is the boundary that
defines the single-file mode below.

**Asset delivery on Live (the cross-cutting axis, here concretely):**
- *Siblings* — the deployed default: the engine bundle + CSS copied flat alongside the shell, the
  shell's asset base pointing at them. Self-standing folder, no CDN dependency for the chrome.
- *CDN* — the same shell with asset hrefs pointing at a CDN instead of siblings (smaller folder,
  network dependency). Display assets (fonts, KaTeX) are already CDN by default; the engine/CSS
  *could* be too — reachable through the asset seam, but not emitted by a build path today (see
  §"Asset delivery").
- *Inlined* — engine + CSS embedded in the shell (a conceptual profile — **not built today**; see
  §"Asset delivery"). This would make the shell heavier but remove the sibling assets; note that
  inlining *assets* would not by itself make the document single-file, because the **content** is
  still fetched. (Inlined-assets + fetched-content is a valid Live profile in principle;
  embedded-*content* is what crosses into single-file.)

**Capability on Live:** `?edit` (or `data-enscribe-edit` on the mount) selects the Write/Preview
editor; default is read. Edits are preview-only in the current build (in-memory, no save). The edit
view is single-sourced across article and book so the two cannot drift.

**Invariants.**
- The shell body is empty by design; all content arrives at runtime by fetch.
- Content and (sibling/CDN) assets resolve **relative to the shell's location** (`document.baseURI`
  / a relative asset base), so the folder is portable to any served sub-path — e.g. served at
  `/live/` it resolves `/live/…`. Routing is query-string (`?page=`), which is path-agnostic. (This
  portability is what lets the live folder be a sub-path demo of a static site.)
- A live render is equivalent to the static render of the same source on display number and
  scheme-normalized owner (the parity contract; `render-parity.md`).

## Mode: Single-file  *(designed here; not built)*

**Axis choices:** content = `.emd`, **embedded** in the HTML; engine at read time = yes (in
browser); assets = inlined **or** CDN (never siblings — it is one file); capability = view+edit;
server = **none** (`file://` works).

A **single self-contained HTML file** that is both viewer and editor for the document it carries.
You hand the file to someone; they open it (even from disk, no server); it renders, and `?edit` /
the editor toggle gives them Write/Preview over the embedded source. The defining difference from
Live is **embedded content + no server**: where the Live shell *fetches* the master and children,
the single-file artifact *carries* them inside itself, and the engine reads them from there rather
than over the network.

**What this mode reuses (so it is an increment, not a new system).** The edit/preview view, the
runtime dispatch, and the engine-as-one-bundle already exist and are mode-independent. The
single-file mode does **not** invent an editor or a renderer; it changes *content delivery* (embed
instead of fetch) and forecloses the server.

**What this mode requires that does not yet exist (the build gap).**
- **Content embedding** — the master and every child `.emd` carried inside the file (e.g. a
  structured data block the engine reads), and an engine **read-from-embedded** path that
  substitutes for the fetch (the mounter, finding embedded content, must not attempt an HTTP
  fetch). This is the substance of the unbuilt work.
- **Asset self-containment** — to truly open from `file://` with no network, the engine + CSS are
  *inlined* (the file is larger but offline-complete); alternatively they load from *CDN* (smaller
  file, needs network). This is the asset-delivery axis again, restricted to inlined-or-CDN. The
  choice is a product decision and a natural place for a flag (e.g. an inline-everything vs.
  load-from-CDN switch); it is recorded here as an axis, not settled.

**Relationship to zero-build-in-place (the "drop a shell into a source directory" goal).** A shell
that renders a *directory of source in place* (no copy, no build — GitHub issue #288) is the
**degenerate case of this mode with content embedding removed**: instead of carrying the `.emd`
inside, the shell points at sibling `.emd` files already present in the directory. Once single-file
(the harder case — the engine reading content from a non-fetched source) exists, in-place is the
easier case of the same read-path with the source external rather than embedded. The two should
share the "engine reads content from a provided source, not necessarily a fetch" seam. **Status:**
single-file is unbuilt; in-place (#288) depends on its read-from-provided-source seam and is
likewise unbuilt.

**Invariants (target, for when it is built).**
- The file opens and renders with **no server and no sibling files** (the `file://` test) when
  assets are inlined; with only a network dependency when assets are CDN.
- The embedded content is the single source the file renders *and* the source the editor edits — a
  reader's edits act on the carried source, with no external file.
- The rendered output is equivalent to the static/live render of the same source (the parity
  contract extends to this mode).

---

## Cross-cutting axis: Asset delivery

Independent of mode: where the **engine bundle and CSS** (the chrome plumbing) come from. Display
assets (fonts, KaTeX) are a separate, already-CDN concern routed through a single head-asset source;
this axis is the *chrome* assets.

| Value | Who admits it | Shape |
|---|---|---|
| **Siblings** | Static, Live | assets copied flat next to the HTML; href = a relative asset base |
| **CDN** | Live, Single-file | href = a CDN URL; smallest artifact; network dependency |
| **Inlined** | Live, Single-file | engine + CSS embedded in the HTML; largest artifact; offline-complete |

The axis is selected through **one seam** — the shell's asset-href resolution (`resolveShellAssets`
in `emit-shell.js`) — so a new asset profile is a different value at that seam, never a different
shell or a different engine. This is why asset delivery is an axis and not a mode: it changes href
strings, not the artifact's contract.

**Wired vs reachable (verified against code).** Only **siblings** is wired today: it is the deployed
default — `buildLiveFolder` (`build-live.js`) copies the four chrome assets flat next to the shell and
emits it with `assetBase: './'`. **CDN** for the chrome assets is *reachable through the seam* — the
emitter's `assets` parameter accepts any href, so pointing it at a CDN URL would emit CDN `<link>` /
`<script>` references — but **no build path emits it**. **Inlined** chrome assets are **not built**:
the shell only ever emits href / `src` *references*, so inlining is not a value of the href seam at
all — it would need a different shell shape (embedding the engine/CSS content), which does not exist.
(This is the *chrome* assets only; the *display* assets — fonts, KaTeX — are already CDN by default,
routed through the single head-asset source `HEAD_ASSET_LINKS`, independent of this seam.)

## Cross-cutting axis: Capability

Independent of mode: **view** or **view + edit**. Edit is the in-browser Write/Preview editor, single-
sourced across article and book. It requires an engine at read time, so:

| Mode | View | Edit |
|---|---|---|
| Static | yes | **no** (no engine at read time — principled, see §Static) |
| Live | yes | yes (`?edit` / `data-enscribe-edit`) |
| Single-file | yes | yes (the mode's defining use is viewer+editor) |

Edit being available on a mode is a function of "is there an engine at read time," which is exactly
the static-vs-live boundary — so the capability axis is not free-floating; it is gated by the same
discriminator that separates Static from the others.

---

## Status summary

- **Static** — built (canonical/default site delivery; single static documents likewise).
- **Live** — built (shell + fetch + runtime dispatch; `?edit` editor; sibling assets the deployed
  default). Of the chrome asset-delivery profiles, **only siblings is wired** (the deployed default);
  **CDN is reachable through the asset seam** (point the emitter's `assets` at a CDN href) but emitted
  by no build path; **inlined chrome assets are not built** (the shell emits only href / `src`
  references). See §"Asset delivery". (Display assets — fonts/KaTeX — are already CDN, separately.)
- **Single-file** — **designed here, not built.** The gap is content-embedding (+ a
  read-from-embedded engine path) and asset self-containment. Zero-build-in-place (#288) is the
  easier sibling that depends on the same read-from-provided-source seam and is also unbuilt.

This document is the single home for the *delivery-mode model*; whether each mode is built is a
STATUS/ROADMAP question, tracked there. The spec relocates and unifies a model previously implicit
across the shell, the live folder build, and the website spec; it does not extend the render itself.
