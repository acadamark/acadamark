# Delivery modes: how an `.emd` document reaches a reader

An enscribe document (`.emd`) is authored once and can be *delivered* to a reader in several
shapes. This spec is the normative map of those shapes. It owns one question only — **how the
rendered (or renderable) document is packaged and reaches the reader** — and deliberately owns
nothing about *what* the render contains. The render itself (eHTML → HTML, composition,
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
| **Single-file** | `.emd` + its referenced assets, **embedded** in the HTML | yes (in browser) | no (only the chrome needs network) | view+edit | **yes** (one document + its assets; chrome from web) |

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

**The single-document static render (`enscribe render`, #395 D2 / audit W3; extended to the
import commands by #414).** Every CLI command that emits a document — `render`, `import`,
`import-jats` — shares one default and one option surface. Each emits a **complete, styled,
standalone page by default**: doctype,
`<html lang>`, charset/viewport, a `<title>` derived from the document's `<title>` element
(fallback: the input filename; `--title` overrides), and the default stylesheet **inlined** —
what an author pipes to a file and opens, matching the expectation set by `quarto render` /
`pandoc -s` (with the toggle pointing the right way for this audience: standalone is the
default, the fragment is the opt-in). The frame is the minimal document shell
(`document-shell.js`, the static sibling of the live shell); the rendered fragment keeps
carrying its own font/KaTeX assets per `--embed`/`--no-embed`, so the shell never double-loads
them. The option surface:
- `--fragment` — the bare eHTML fragment (no doctype/head/stylesheet), for embedding into a
  host page or pipeline; the pre-#395 default, demoted to an explicit choice.
- `--css <path-or-url>` — link the given stylesheet from `<head>` **instead of** inlining the
  default one (replace, not add: an author theming a document set wants one sheet, not N
  inlined copies). Incompatible with `--fragment` (no `<head>` to link from — the CLI errors).
- `--emit-css` — print the default stylesheet and exit, making the referenced sheet obtainable
  (the W3 gap); pairs with `--css` as the customize-from-default workflow.
- The document stylesheet is inlined under BOTH embed modes (`--no-embed` governs the heavy
  font/KaTeX payload, not the small structural sheet); `--css` is the externalization path.
- The import commands (#414) share `--fragment` / `--css` / `--title` with the same semantics;
  their derived title is the imported document's own title (a JATS `<article-title>` / pandoc
  title metadata becomes the enscribe `<title>` post-conversion; fallback: the input filename).
  `--emit-css` stays on `render` (it needs no input document). Their `--emd` output is enscribe
  source, not HTML, so combining it with a shell flag is refused rather than silently ignored.

## Diagnostics (the reporting seam — #402/#415)

The pipeline accumulates diagnostics on the vfile (`file.message(...)` — the unified model);
**every document-emitting command surfaces that one stream through three channels**, all consumed
at one seam (`packages/cli/src/diagnostics.js`); no pipeline plugin knows channels exist.

1. **Terminal, as they occur.** Each document's messages print to stderr when that document's
   run completes — per-document granularity (once for a single document; per page as a website
   builds). Format: **vfile-reporter** (the unified ecosystem's terminal formatter — delegation
   principle; one convention authors already know from remark/rehype tooling).
2. **End-of-run summary.** Grouped by file, then by kind (the producer's `source[:ruleId]`, else
   the `producer:` message-prefix convention), with counts. **Silent when there is nothing to
   say** — a clean run adds zero lines.
3. **Carried into the rendered document (#415).** Build-time diagnostics are serialized into the
   emitted page as a `<script data-enscribe-diagnostics>` block that recapitulates each message
   to the browser console when the document is viewed — the author who ignored (or never saw)
   the terminal finds the messages *at the artifact*. Each entry carries every provenance field
   the producer supplied: `message`, `file`, `line`, `column`, `kind`, `fatal` (#412's
   as-much-provenance-as-possible principle). Console shape:
   `[enscribe] file:line:col — message [kind]` (console.error when fatal, console.warn
   otherwise). **Zero messages ⇒ zero bytes** (no empty script blocks). Escape-safe: every `<`
   in the JSON payload is emitted as `\u003c`, so `</script>`/`<!--` cannot occur in the block.
   A `--fragment` output carries no script (shell furniture belongs to the host page). In a
   separate-pages book, every page carries the document's stream (any page is an entry point);
   a website page carries its own page-scoped stream.

**Live surfaces.** A live/single-file document renders client-side, so its channel-3 equivalent
is direct: the engine's public render façades (`render`, `renderAsync`, `renderInto`,
`renderIntoAsync`, `renderMasterAsync`, `renderMasterIntoAsync`) route the completed run's
messages to the browser console in the same one-line shape
(`lib/diagnostics-format.js`). The live-shell **mount/edit-loop** paths (chapter routers, the
debounced editor re-render) are deliberately not yet wired: a per-keystroke re-render would
re-print the stream on every edit, so their routing needs a dedup/refresh design — scoped out
on #402.

**Quiet semantics — two "quiet" notions, two scopes, both pre-existing:**
- `<config quiet>` (per-document) clears `file.messages` **in-pipeline**
  (`enscribeQuietSuppression`), so all three channels are naturally silent for that document —
  the document opts out entirely, artifact included.
- `--quiet` (per-invocation) silences the **terminal** channels (1 + 2) only. The artifact keeps
  its record (channel 3): #415's point is that the terminal can be ignored — the artifact
  travels with its provenance.

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
  *Page SOURCES are deployed master-relative* (#331): for a multi-page website each page lives in its
  OWN directory — the page master at `<src>/index.emd`, a book page's `<chapter src>` children BESIDE it
  at `<src>/<child>` — so two books with same-named chapters (e.g. each a `frameables.emd`) do not collide
  last-wins in a flat namespace and serve the wrong book's content. The runtime fetches the master at
  `<src>/index.emd` and resolves children with the one `new URL(child, masterUrl)` rule (no fetch fork).
  Co-located ASSETS — `<fig src>` figure images, data files, local `<a href>` targets — are deployed the
  SAME way (#352): **per-folder under the page's own `<src>/`**, mirroring the static dir-per-page tree and
  the source layout, NOT flattened to the shell root. At render the live SPA resolves a page's page-relative
  content references (`<img src>`, `<a href>`, …) against the page's own source dir — a runtime DOM pass
  (`resolveWebsitePageAssets`) scoped to the content region only, so nav / chrome / engine / CSS (and a
  document `<base>`, which would re-target the `?page=` nav and break middle-click / open-in-new-tab) are
  untouched. This does NOT break parity: the website contract compares the display number + scheme-normalized
  owner, *never the raw href* (raw hrefs already differ by design between the `.html`-path and `?page=`-route
  schemes; `render-parity.md` "The website path"). And because each page's assets live under its own `<src>/`
  and resolve page-relative, two pages' same-named DISTINCT assets stay distinct — the old last-wins collision
  is resolved (a deploy move + a page-relative resolve, not the deferred `@id`-store follow-up).
- *CDN* — the same shell with asset hrefs pointing at a CDN instead of siblings (smaller folder,
  network dependency). Display assets (fonts, KaTeX) are already CDN by default; the engine/CSS are too
  under **`--assets cdn`** (#363), which points the emitter's `assets` at the pinned jsDelivr package.
- *Inlined* — engine + CSS (and fonts + KaTeX + the editor) embedded in the shell, built under
  **`--assets inlined`** (#364/#365): a served folder with no network dependency for its chrome. Note
  that inlining *assets* does not by itself make the document single-file, because the **content** is
  still fetched (a live folder still serves its `.emd` content over HTTP); embedded-*content* is what
  crosses into single-file.

**Capability on Live:** `?edit` (or `data-enscribe-edit` on the mount) selects the Write/Preview
editor; default is read. Edits are preview-only in the current build (in-memory, no save). The edit
view is single-sourced across article and book so the two cannot drift.

**Invariants.**
- The shell body is empty by design; all content arrives at runtime by fetch.
- The CHROME (engine bundle, sibling/CDN CSS) resolves **relative to the shell's location**
  (`document.baseURI` / a relative asset base), so the folder is portable to any served sub-path — e.g.
  served at `/live/` it resolves `/live/…`. A page's own CONTENT references, by contrast, resolve relative
  to that page's source dir `<src>/` (#352, `resolveWebsitePageAssets`) — the shell-relative default would
  send `<img src=elephant.jpg>` to the shell root where the per-folder asset no longer sits. Routing is
  query-string (`?page=`), which is path-agnostic. (This portability is what lets the live folder be a
  sub-path demo of a static site.)
- A live render is equivalent to the static render of the same source on display number and
  scheme-normalized owner (the parity contract; `render-parity.md`).

## Mode: Single-file  *(built: one self-contained document, web assets, edit-when-self-contained)*

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

**What is built (the single-document core).**
- **Content embedding + read-from-embedded.** `enscribe build … --single-file` emits ONE `.html` that
  carries the document's `.emd` in an inert `<template id="enscribe-source">` (HTML-escaped, so it
  round-trips exactly via `.content.textContent`). At mount, the engine reads that embedded source via
  **`mountLiveDocument`** — the read-from-provided-source entry that runs the same `<meta type>`
  dispatch + edit switch as the served `mountLiveShell`, only WITHOUT fetching the master. The
  source-provider seam: `mountLiveShell` fetches then delegates to `mountLiveDocument`; the single-file
  shell reads its `<template>` and calls `mountLiveDocument` directly. The child-loader inside
  `loadAndAssembleMaster` is now injectable too (default = fetch), so the same seam carries embedded
  CHILDREN when that lands.
- **Embedded referenced ASSETS (#313 slice 4 — the binary-packaging piece).** A single file carries not
  just the source but the assets the source references, so it renders its figures and data tables when
  opened from anywhere (no dangling external path). EMBEDDED assets (`<fig #id fmt>base64</fig>`) and
  `<dataset>`s already travel — they are bytes inside the `.emd`. For EXTERNAL references, `buildSingleFile`
  (`embedExternalAssets`) reads the files at build (relative to the master dir) and rewrites the source
  in place — a parse-guided edit (each external use-site is a parsed node with a source span, so refs
  inside opaque `<code>` examples are never touched): an external `<fig src="local.png">` becomes a
  `data:<mime>;base64,…` URI (the same form an embedded asset resolves to); an external
  `<table fmt src="local.csv"/>` becomes inline long-form `<table fmt>…bytes…</table>` (the same
  inline-data path `<table fmt | …>` uses). The asset bytes stay opaque; the engine re-parses ordinary
  source at mount (no serialize-then-reparse — the data-store round-trip invariant). An `@id`/`data:`/
  http(s) src is left untouched (already portable). Embedding an external ASSET never changes editability
  — an asset reference is not a `<… src>` STRUCTURE child. (Embedding external STRUCTURE children —
  book chapters / website pages, i.e. site-in-a-file — remains the deferred follow-on below.)
- **Edit-when-self-contained (the principled line).** Edit needs a single source of truth, so the
  file is editable IFF it is **self-contained** — no `<… src>` children (the existing
  `childSrcs.length === 0` test). A self-contained doc wires the editor + honors `?edit`; a master
  with children (or a website) is emitted **render-only** with a warning (its children/pages are not
  embedded — see the widenings below).
- **Save — the self-saving document (#351).** A single-file document's edits are no longer preview-only.
  **Save** serializes the edited source back into the vessel by REUSING its exact structure: the pristine
  file HTML (snapshotted at mount, before the render / editor mutate the DOM) with ONLY the
  `<template id="enscribe-source">` content swapped for the edited source (`serializeSavedFile`). So the
  saved file is the original vessel with a new embedded source — its asset-delivery mode is preserved by
  construction (inlined stays inlined, CDN stays CDN) and it self-renders when reopened; no re-build, no
  re-render. It writes via the **File System Access API** (Chromium/Edge — overwrite the opened file IN
  PLACE, the handle persisted for the session so later saves need no prompt) with a **download fallback**
  everywhere else (Firefox/Safari — a fresh self-contained file); feature-detected, never hard-failing.
  Save is offered ONLY for the single-file vessel — a served/live document stays preview-only (there is
  no file to write back into) — and only when self-contained (editable). The edit-view status
  dirty-tracks `saved` ↔ `unsaved`. The write path (`writeSavedFile`) lives beside `serializeSavedFile`
  in `master-document/save-single-file.js`; the vessel structure is unchanged (no `emitSingleFileShell`
  edit — the pristine HTML is snapshotted at runtime).
- **Assets from the web.** The chrome + display assets (engine, CSS, KaTeX, fonts, CodeMirror) load
  by URL — the file is small (shell + content), no engine inlined. The default source is the
  **pinned, published npm package** on jsDelivr — `cdn.jsdelivr.net/npm/@enscribejs/enscribe@0.4.1/`,
  an **immutable version** (not the moving `@main` git ref the initial stopgap used). The npm tarball
  is not flat, so the four chrome assets are referenced at their real per-package paths (engine + the
  bundled editor in `dist/`, the stylesheets under `src/`), each verified to resolve with the correct MIME
  (`application/javascript` / `text/css`). Bumping the pin is one edit; a self-host or alternate tag is
  the emitter's `assetBase` / `assets` override. (NB: `raw.githubusercontent.com` serves `text/plain`
  + `nosniff`, which browsers refuse to execute — hence jsDelivr.)

**What is still unbuilt (the widenings, recorded as axes, not gaps in the core).**
- **Site-in-a-file** — embedding a MULTI-document master (a book's chapters, a website's pages) in one
  file. The read-path seam already exists (the injectable child loader); what is missing is carrying
  the children inside the file and reading them from there. The core here is ONE document.
- **Inlined assets / offline.** To open from `file://` with **no network at all**, the engine + CSS
  must be *inlined* (larger file, offline-complete) rather than web-loaded. The current build is
  web-assets only; inlined-assets is the asset-delivery axis (inlined-or-CDN), a flag, not built.

**Relationship to zero-build-in-place (#288), corrected.** A shell that renders a *directory of source
in place* (no copy, no build — GitHub issue #288) shares THIS mode's read-from-provided-source seam:
instead of carrying the `.emd` embedded, the shell reads sibling `.emd` files. But the shared seam does
**not** make #288 fall out free, and specifically **not over `file://`**: a `file://` page cannot
`fetch()` sibling files (browsers block `file://` XHR/fetch), so in-place reading of siblings needs an
HTTP server — exactly the server #288 wants to avoid. Over **HTTP**, in-place is near-free (point the
provider at sibling URLs instead of the embedded `<template>`); over `file://` it would need the
children inlined too (the site-in-a-file widening), not just the seam. **Status:** single-file (one
document, web assets) is **built**; site-in-a-file and inlined-offline are unbuilt; #288 over HTTP is
near-free on the seam, #288 over `file://` is not.

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

**All three are wired (verified against code).** The `enscribe build --assets <siblings|cdn|inlined>`
option (#363) selects the value, honored by `--live` and `--single-file`. **Siblings** (the deployed
default for `--live`) copies the four chrome assets flat next to the shell and emits it with
`assetBase: './'` (`buildLiveFolder`). **CDN** (the default for `--single-file`) references the pinned
jsDelivr package (`SINGLE_FILE_ASSETS`) and copies no chrome. **Inlined** *embeds* the engine + CSS
content — a classic `<script>` (IIFE) / `<style>` — rather than referencing it: a different shell shape
the emitter now emits (`emitLiveShell` / `emitSingleFileShell` `inline` bytes path, #364), with the
bundled editor inlined too (carried in an escaped `<template>`, blob-imported lazily; #365). (This is
the *chrome* assets; the *display* assets — fonts, KaTeX — are CDN by default via `HEAD_ASSET_LINKS`
and inlined via its single-source counterpart `getInlineDisplayHead` under `--assets inlined`.)

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
  default). All three chrome asset-delivery profiles are now **wired and author-selectable** via
  `enscribe build --assets <siblings|cdn|inlined>` (#363): **siblings** (default), **cdn** (pinned
  jsDelivr), and **inlined** (engine + CSS + display + editor embedded → a no-network served folder;
  #364/#365). See §"Asset delivery". (Display assets — fonts/KaTeX — are CDN by default, separately.)
- **Single-file** — **built for one self-contained document.** `build --single-file` embeds the `.emd`
  in a `<template>` and mounts it via `mountLiveDocument` (read-from-provided-source, no master fetch);
  editable iff self-contained (`childSrcs.length === 0`), else render-only with a warning; chrome +
  display assets load from the web (the **pinned npm package** `@enscribejs/enscribe@0.4.1` on
  jsDelivr — *not* `raw.githubusercontent.com`, which serves `text/plain`+`nosniff` and won't execute)
  under the **`--assets cdn`** default; **`--assets inlined`** (#364/#365) instead embeds the engine +
  CSS + fonts + KaTeX + the bundled editor so the file opens from `file://` with **no network at all**
  (external-DSL diagram libs still load from the CDN). **Still unbuilt:** site-in-a-file (embedding a
  multi-document master's children). The read-path seam is shared with #288, but #288 does **not** fall
  out free — over `file://` a page cannot fetch siblings, so in-place needs HTTP (or the children
  inlined); only #288-over-HTTP is near-free on the seam.

This document is the single home for the *delivery-mode model*; whether each mode is built is a
STATUS/ROADMAP question, tracked there. The spec relocates and unifies a model previously implicit
across the shell, the live folder build, and the website spec; it does not extend the render itself.
