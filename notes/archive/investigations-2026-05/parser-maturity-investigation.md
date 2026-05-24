# Parser Maturity Slice — Phase 0 Investigation

Scope: long-form tag nesting, comma-separated positionals, self-closing
form `<tag />`.  Tests are run against the generated parser; all counts are from
the 97-test baseline in `packages/remark-acadamark/test/test.js`.

---

## Q1  Long-form tag nesting — current state

**Finding: the mechanism already exists. The gap is a DSL_REGISTRY entry.**

`makeLongFormTokenizer(registry)` in `syntax.js` handles `<tagname attrs>\n...
content...\n</tagname>` for any tag in the DSL_REGISTRY. It is registered first
in `flow` hooks, so it takes priority over the short-form tokenizer for any
registered tag. For unregistered tags it calls `nok(code)` and the short-form
tokenizer falls through.

Verified in REPL:

```
<aside>               → registered → form:'long', content:'\ntext content\n'
<data>…</data>        → NOT registered → two separate short-form tags + text
<aside> with nested   → content:'\n<em | bold>\nsome text\n' (verbatim string)
```

Nested tags inside long-form content are preserved verbatim in `node.content`
and are re-parsed by `remarkRecursiveContent` (an interpreter plugin that uses
`unist-util-visit` to find `default`-handler `acadamarkTag` nodes with a
`content` string and re-parses that string through an inner remark processor).
This is the nesting mechanism.

**To make `<data>…</data>` work: add `['data', 'default']` to DSL_REGISTRY.**
No parser, grammar, or from-markdown changes are required for nesting.

---

## Q2  The `node.children` proposal — architectural conflict

The prompt's Step 3 sketch proposes:

```js
{ children: [...],  // populated from recursive parse at parse time
  content: null }
```

**This is incompatible with the existing system and should not be implemented.**

Reasons:

1. `convertContent()` in `interpret-plugin.js` reads `node.content` (after
   `remarkRecursiveContent` has re-parsed it from a string to an array of mdast
   nodes). Changing `content: null` for default-handler long-form tags would
   give every existing handler an empty child list.

2. `remarkRecursiveContent` itself looks for `acadamarkTag` nodes where
   `isOpaqueContent === false` and `typeof node.content === 'string'`. It would
   skip nodes that already have `children`, leaving content unparsed.

3. The existing `content` field is used in two different phases:
   - At parse time: `node.content` is a raw string (verbatim copy of what was
     between the opening and closing tags).
   - After `remarkRecursiveContent`: `node.content` is replaced with an array
     of mdast nodes. `convertContent()` then iterates over that array.
   
   Adding `node.children` at parse time collapses these two phases. All
   downstream code that expects `node.content` as an array after the interpreter
   phase would break.

4. Short-form named tags with pipe content (`<aside | text>`) use the same
   `node.content` field. Moving long-form tags to `children` while short-form
   keeps `content` would create an asymmetric AST that every handler would need
   to compensate for.

**Recommendation: do not change the content model. The existing
`content: string → remarkRecursiveContent → content: Node[]` path achieves the
same nesting goal without touching the AST shape.**

---

## Q3  Grammar location — comma-separated positionals

The grammar rule that needs changing:

```peggy
Attributes
  = _ head:Attribute tail:(_ Attribute)* _ {
      return applyAttributes([head, ...tail.map(([, a]) => a)])
    }
  / _ { return emptyAttrs() }
```

The separator between attrs is `_` (whitespace only: `[ \t\n\r]*`).

`IdentifierCont = [^ \t\n<>|"'\[\],]` excludes `,` — correct, identifiers
cannot contain commas.  But the separator between attributes cannot contain
commas either, so `<cite Smith2020,Jones2019>` fails:

1. Micromark tokenizer accepts the raw string (`,` is not GT, PIPE, or quote;
   it is consumed in `attrSection`). Token emitted: `<cite Smith2020,Jones2019>`.
2. Peggy parses the token. `Attributes` parses `Smith2020` as Positional, then
   `tail:(_ Attribute)*` tries: `_` = empty, `Attribute` tries `Positional` but
   `,` is excluded from `IdentifierStart` → fail. Tail ends. `_` = empty. Then
   `">"` tries to match `,Jones2019>` → fail. Grammar throws.
3. Result: `{}` (tagname undefined, parse error node).

**Fix: change `tail:(_ Attribute)*` to `tail:(_ ","? _ Attribute)*`.**

The `,?` makes the comma optional: `a b` works (space separator), `a,b` works
(comma only), `a, b` and `a ,b` work (mixed). The existing `_` before `,?`
handles `a ,b`. The `_` after handles `a, b`.

This is a one-operator insertion in one grammar rule. Backward compatible:
all existing tests that use space-separated attributes continue to work; the
separator is merely extended.

Side effect: commas are now valid separators between ALL attribute types, not
only positionals. `<tag src=a, href=b>` would also become valid. This seems
consistent with a uniform syntax.

---

## Q4  Self-closing form `<tag />`

**Current behavior** (confirmed in REPL):

```
<tag />        → { tagname:'tag', positional:['/'] }   // slash is positional
<tag src=x />  → { tagname:'tag', kwargs:{src:'x'}, positional:['/'] }
```

`IdentifierStart = [^ \t\n<>|+\-#.="'\[\],]` — `/` is NOT in the exclusion
list. So `/` is a valid IdentifierStart, meaning `<tag />` parses `/` as a
positional.

**To support `<tag />` as self-closing:**

Option A — Grammar-only, modify `IdentifierStart`:

1. Add `/` to `IdentifierStart` exclusion:
   `[^ \t\n<>|+\-#.="'\[\],/]`

2. Add `SelfClosingNamedTag` rule before `NamedTag` in `AcadamarkConstruct`:
   ```peggy
   SelfClosingNamedTag
     = "<" name:TagName attrs:Attributes "/" ">" {
         return makeNode(name, { ...attrs, selfClosing: true })
       }
   ```

   With `/` excluded from `IdentifierStart`, `Attributes` stops before `/`.
   The rule then matches `"/"` `">"` cleanly.

**Collision risk:** The change to `IdentifierStart` breaks `<tag / value>`
patterns where `/` is used as a positional. No test currently uses `/` as a
positional. In practice, `/` as a positional identifier has no semantic use in
the vocabulary. However, this is a semantic grammar change that affects the
character set of valid identifiers.

Option B — Grammar-only, no `IdentifierStart` change (lookahead):

Use Peggy's negative lookahead in `Positional`:
```peggy
Positional
  = !("/" [ \t]* ">") v:Identifier { return { t: 'pos', v } }
```
This rejects `/` as a positional only when it is immediately followed by
optional spaces and `>` — i.e., only in the self-closing position. Existing
uses of `/` as a positional (hypothetical) would remain valid.

**Recommendation: Option B** if self-closing is in scope for this slice. It is
surgical, does not change the identifier alphabet, and handles the `<tag />` and
`<tag src=x />` cases correctly. If self-closing is deferred, `<library src=x |>`
is the available workaround (currently works: pipe with empty content).

**Note**: self-closing applies to short-form tags only (unregistered, or
registered tags where the long-form tokenizer falls through). For a registered
tag like `data`, `<data />` is still valid because the long-form tokenizer
calls `nok(code)` when it sees a line ending after `>` — wait, actually it
REQUIRES a line ending. Without a line ending, `afterOpenGt` calls `nok(code)`
and the short-form tokenizer takes over. So `<data />` on a line by itself IS
handled by the short-form tokenizer and self-closing grammar would apply. Only
`<data>\n…\n</data>` triggers long-form.

---

## Q5  Backward compatibility

97 existing tests are safe under all proposed changes:

- Comma separator change: additive. No existing test uses commas between
  attributes.
- DSL_REGISTRY `data` entry: no existing test uses `<data>` tags.
- Self-closing grammar (either option): no existing test uses `<tag />` as
  a positional-`['/']` form.
- `node.content` model unchanged.
- `node.form === 'long'` and `'short'` unchanged.

Risk area to watch: the existing ML-1 through ML-11 multi-line tests all use
registered tags. Adding `data` to the registry does not affect those tests.

---

## Q6  DSL_REGISTRY entries needed

File: `packages/remark-acadamark/src/dsl-registry.js`

| Tag       | Handler value | Reason                                              |
|-----------|---------------|-----------------------------------------------------|
| `data`    | `'default'`   | Container; nested tags re-parsed by remarkRecursiveContent |
| `library` | NOT added     | Only used short-form (pipe content or `src=`). Adding it creates a long-form ambiguity for `<library src=x>` without a closing tag. The self-closing `<library src=x />` handles the bare-attr form if self-closing is implemented; otherwise `<library src=x | >` already works. |

If `library` is added to the registry, `<library src="refs.bib">` (no pipe,
block context, followed by a newline) would trigger long-form and wait for
`</library>`. This is almost certainly unintended. The `| >` workaround
(`<library src="refs.bib" | >`) avoids the issue without registry addition.

---

## Q7  Multi-line interaction

No change needed. `<data>\n<library | bibtex content>\n</data>` works as soon
as `data` is registered:

1. Long-form tokenizer captures everything between `<data>` and `</data>` as
   `node.content = '\n<library | bibtex content>\n'`.
2. `remarkRecursiveContent` re-parses this string through the inner processor,
   which includes `remarkAcadamark`, so `<library | bibtex content>` becomes
   an `acadamarkTag` node.
3. The `library` handler receives the node normally.

For multi-line BibTeX inside `<library>`:
```
<library |
@article{Smith2020, ...}
@article{Jones2019, ...}
>
```
This is multi-line pipe-content for a short-form tag. Already handled by the
existing ML-* multi-line support.

---

## Summary: recommended implementation plan

| Item                         | Files             | Risk   | Scope?    |
|------------------------------|-------------------|--------|-----------|
| Add `data` to DSL_REGISTRY   | dsl-registry.js   | low    | yes       |
| Comma separator in grammar   | acadamark.peggy   | low    | yes       |
| Self-closing `<tag />`       | acadamark.peggy   | medium | **design question** — see below |
| `node.children` model        | (do not implement)| high   | no        |

### Design question for Ariel

**DQ-PM-1: Self-closing form in scope?**

The authoring need is `<library src="refs.bib" />` as an alternative to
`<library src="refs.bib" | >`. The workaround works but is syntactically
awkward. Two implementation options:

- Option A: change `IdentifierStart` to exclude `/`. Simple, but slightly
  changes the identifier alphabet. In practice, no real-world positional uses
  `/`, but it is a grammar character-set change.
- Option B: negative lookahead on `Positional`. Surgical. Recommend this one.

If self-closing is deferred, document `| >` as the canonical form for
short-form tags with only kwargs and no pipe content. If it is included here,
Option B is ~10 lines of grammar.

**DQ-PM-2: `library` in DSL_REGISTRY?**

If long-form `<library>\n@article{...}\n</library>` is a supported authoring
form (BibTeX content spanning many lines more conveniently than pipe), then
add `['library', 'opaque']` to the registry with the understanding that
`<library src=x>` (no pipe, block-level, on its own line) would then require
`</library>` or the self-closing `/>` form.

If only short-form `<library | bibtex>` is needed (multi-line pipe content
already works), do not add `library` to the registry.
