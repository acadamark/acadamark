---
semantic_role: a
category: inline-formatting
html_output:
  element: a
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    href:
      maps_to: href
      notes: |
        The URL or fragment identifier the anchor points to. Required
        for hyperlinks; optional for anchors used as link targets.
    target:
      maps_to: target
      values: [_self, _blank, _parent, _top]
      notes: |
        How the link opens. _blank opens in a new tab/window.
    rel:
      maps_to: rel
      notes: |
        Relationship between the current document and the link target.
        Common values: nofollow, noopener, noreferrer, external.
    title:
      maps_to: title
      notes: |
        Tooltip text shown on hover.
  positional:
    - name: href
      notes: |
        The link target as the first positional argument:
        `<a https://example.com | text>`. The normalize-to-canonical gate
        promotes it to the `href` kwarg (the explicit `href=` form wins if
        both are given). Covers ordinary absolute/relative URLs and query
        strings unquoted; a fragment-only target (`#sec`) must use
        `href="#sec"` because a leading `#` is the id sigil, and a URL
        containing `>` or spaces must use the `href="..."` kwarg (there is no
        quoted-positional form).
content:
  type: prose
  becomes: children
  notes: |
    Link text. The visible label for the link.
content_handler: default
jats_counterpart:
  element: ext-link
  attributes:
    'ext-link-type': uri
    'xlink:href': from href
  notes: |
    JATS uses <ext-link> for external links and <xref> for internal
    cross-references. Enscribe's <a> maps to <ext-link> for external
    URLs; for internal references (enscribe id targets), the JATS
    exporter typically transforms the link into an <xref> instead.
shorthand_examples:
  - source: 'See <a https://example.com/docs | the documentation>.'
    layer1_html: '<p>See <a href="https://example.com/docs">the documentation</a>.</p>'
    notes: |
      The positional URL form — the target is the first argument, the pipe
      content is the link text. The most common authoring path. (Markdown
      `[text](url)` is not an enscribe idiom; it renders as literal text.)
  - source: '<a href=https://example.com | the example site>'
    layer1_html: '<a href="https://example.com">the example site</a>'
  - source: '<a href=https://example.com target=_blank rel=noopener | external link>'
    layer1_html: '<a href="https://example.com" target="_blank" rel="noopener">external link</a>'
  - source: '<a href=#section-2 | jump to Section 2>'
    layer1_html: '<a href="#section-2">jump to Section 2</a>'
    notes: |
      Internal links use fragment identifiers pointing at element ids.
interpreter_strategy: schema
---

# `<a>`

Anchor — a hyperlink to another resource (external URL, internal fragment, file, or other target).

## Semantic intent

`<a>` is HTML's element for hyperlinks. The href attribute identifies the target; the content is the visible link text. The element handles both external links (URLs to other sites) and internal links (fragment identifiers pointing at elements within the same document).

## Authoring

**Positional-URL form (most common).**

```
See <a https://example.com/docs | the documentation>.
```

The first argument is the URL; the pipe content is the link text. Bare markdown `[text](url)` is **not** an enscribe idiom — it renders as literal text. (A bare URL or email on its own still autolinks to `<a>` via remark-gfm.)

**Explicit form.**

```
<a href=https://example.com | the example site>
```

Used when attributes beyond href are needed (target, rel, title).

**Internal link.**

```
See <a href=#section-2 | Section 2>.
```

The fragment identifier points at an element with the corresponding id.

## Attributes

`href` is the link target. Required for hyperlinks. Can be:

- An absolute URL (`https://example.com`).
- A relative URL (`./docs/guide.html`).
- A fragment identifier (`#section-id`) pointing at an element in the current document.
- A `mailto:` link (`mailto:author@example.com`).

`target` controls how the link opens. `_blank` opens in a new tab. Other values are rare.

`rel` describes the relationship between the current page and the target. Common values: `nofollow`, `noopener`, `noreferrer`, `external`. Multiple values are space-separated.

`title` provides tooltip text shown on hover.

## Internal vs external links

For external URLs, `<a>` is the natural element. For internal references to numbered elements (figures, equations, sections), `<ref>` is more appropriate because:

- `<ref>` carries semantic meaning ("this is a cross-reference").
- `<ref>` resolves through the cross-reference plugin, generating appropriate link text and number.
- `<ref>` exports to JATS as `<xref>`, which has cross-reference semantics.

Use `<a href=#id>` when you want a generic link that doesn't participate in the numbering or cross-reference system. Use `<ref id>` when the link is a scholarly cross-reference to a numbered element.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<a href="https://...">` | `<ext-link ext-link-type="uri" xlink:href="...">` |
| `<a href="#id">` | typically transformed to `<xref rid="id">` if the target is a numbered element |
| `<a href="mailto:...">` | `<email>` |

The JATS exporter dispatches based on the href value.

## Render-mode lowering

`<a>` is HTML-native; no lowering needed.

## See also

- [`<ref>`](ref.md) — for scholarly cross-references to numbered elements.
- [`<cite>`](cite.md) — for citations to bibliography entries.
