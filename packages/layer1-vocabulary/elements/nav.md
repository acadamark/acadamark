---
semantic_role: navigation
category: navigation
html_output:
  element: nav
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  shape:
    - element: item
      required: false
      contains: [item, nav-group]
    - element: nav-group
      required: false
      contains: [item, nav-group]
interpreter_strategy: schema
related_plugins:
  - name: enscribeWebsiteStructuring
    runs_before: enscribeInterpreter
    purpose: 'Builds the website nav model on file.data from this tree (#246). See notes/specs/master-document.md §"Website structure".'
---

# `<nav>`

A website's navigation tree (#246). A `<meta type=website>` master declares one `<nav>` containing `<item>` (pages) and `<nav-group>` (groups). That single tree is **both** the site's page set and its menu structure — as in Quarto, where one declaration drives the navbar and the sidebar. There is no separate `<page>` element: a nav entry *is* a page.

`<nav>` is a long-form container — written with neither `|` nor `/`, it pairs with its `</nav>` close tag and nests its children by the ordinary close-tag grammar. Its content is `<item>` / `<nav-group>` entries, flush-left.

## How it is consumed

`enscribeWebsiteStructuring` walks this tree and records an ordered model on `file.data` (the page/group tree, with a `?page=` slug per page). The live website render (S2) builds the top bar (the tree's top level) and the automatic sidebar (the whole tree, via the shared #226 list builder) from that model. This element def makes `<nav>`/`<item>`/`<nav-group>` first-class vocabulary (recognized, no unknown-tag diagnostic); the chrome rendering is the website render's job, not a direct Layer 1 lowering.

## See also

- [`<item>`](item.md) — a page entry.
- [`<nav-group>`](nav-group.md) — a grouping entry.
- `notes/specs/master-document.md` §"Website structure".
