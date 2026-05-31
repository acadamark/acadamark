# Font Investigation (Finding 3, Slice 7 follow-up)

## Problem

Two distinct font-rendering failures observed in browser when viewing rendered fixtures:

1. **Body font**: System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`)
   falls back to the browser default (usually Times New Roman) on WSL/Linux systems because none
   of the named fonts are installed.

2. **KaTeX math font**: KaTeX CSS (`katex.min.css`) references fonts as `url(fonts/KaTeX_*.woff2)`,
   which are relative to the CSS file's location. When the CSS is inlined in a `<style>` block in
   an HTML document, these relative URLs resolve relative to the HTML document's location — not the
   CSS's original location. Since the KaTeX font files are in `node_modules/katex/dist/fonts/` and
   are not copied alongside rendered HTML fixtures, the references fail.

## Approach chosen: base64 inline (Approach A)

Self-contained HTML is enscribe's output philosophy. Two alternatives were considered:

- **Approach A**: Base64-encode all font data into CSS `@font-face` / `url()` declarations.
  Single-file HTML, works from `file://` without a web server, no CORS issues.
  Increases per-file size by ~600KB. Chosen.

- **Approach B**: Copy font files alongside each rendered HTML, use relative paths.
  Multiple files per document, fragile if you move the HTML. Rejected.

## Font choices

### Body / headings: Inter

- Source: `/usr/share/fonts/opentype/inter/Inter-*.otf` (system package `fonts-inter`)
- Weight/style variants bundled: Regular 400, Italic 400, SemiBold 600, Bold 700, BoldItalic 700
- Alternative considered: none needed; Inter is the widely-used screen font pairing well with
  academic typography.

### Monospace (code): Source Code Pro

- Source: `/home/balter/micromamba/fonts/SourceCodePro-Regular.ttf`
- Only Regular 400 bundled; code blocks in enscribe do not currently use italic or bold mono.
- Alternative considered: JetBrains Mono (preferred) — not installed on this system.
  Source Code Pro is an excellent pairing with Inter.

## Subsetting

Full Inter OTF files are 165–191KB each (all Unicode ranges). For academic documents, a Latin
subset suffices. Using `pyftsubset` (from `fonttools`):

```
Unicode ranges subsetted:
  U+0000-00FF  Latin, IPA Extensions, spacing modifiers
  U+0131       dotless i
  U+0152-0153  OE ligatures
  U+02BB-02BC  modifier letter apostrophes
  U+02C6       circumflex accent
  U+02DA       ring above
  U+02DC       small tilde
  U+2000-206F  General Punctuation
  U+2074       superscript 4
  U+20AC       Euro sign
  U+2122       trade mark sign
  U+2212       minus sign
  U+2215       division slash
```

pyftsubset command:
```bash
pyftsubset /path/to/font.otf \
  --output-file=/path/to/out.woff2 \
  --flavor=woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2212,U+2215" \
  --layout-features='*' \
  --no-hinting
```

## File sizes

| File | Raw | Base64 |
|------|-----|--------|
| Inter-Regular.woff2 | 32.8KB | ~44KB |
| Inter-Italic.woff2 | 34.9KB | ~47KB |
| Inter-SemiBold.woff2 | 35.2KB | ~47KB |
| Inter-Bold.woff2 | 35.4KB | ~47KB |
| Inter-BoldItalic.woff2 | 38.2KB | ~51KB |
| SourceCodePro-Regular.woff2 | 13.5KB | ~18KB |
| **Subtotal: document fonts** | **190KB** | **~253KB** |
| KaTeX fonts (20 files) | ~254KB | ~338KB |
| **Total per math-bearing document** | **~444KB** | **~591KB** |

Document-1 (no math): ~270KB HTML — document fonts only  
Document-4 (math): ~651KB HTML — document fonts + KaTeX fonts

## Implementation

### `src/assets/fonts/`

Woff2 files stored here (generated from source fonts; not committed to version control if fonts
are reproducibly generated). Six files: Inter ×5, SourceCodePro-Regular.

### `src/assets/font-loader.js`

Two exports:
- `getDocumentFontsCss()` — generates `@font-face` CSS for Inter and Source Code Pro.
  Reads woff2 files from `src/assets/fonts/`, base64-encodes them. Cached.
- `patchKatexFontUrls(rawCss)` — patches `url(fonts/KaTeX_*.woff2)` in KaTeX CSS with base64
  data URIs. KaTeX font files read from `node_modules/katex/dist/fonts/`. Cached.

### `src/index.js`

`getKatexCss()` now passes the raw KaTeX CSS through `patchKatexFontUrls()` before returning.
No change to public API.

### `test/render-fixtures.js`

`getDocumentFontsCss()` is called at render time. The resulting `@font-face` CSS is prepended
to the shell `<style>` block, before `default.css`.

### `src/assets/default.css`

Font tokens updated:
```css
--enscribe-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...;
--enscribe-font-mono: 'Source Code Pro', ui-monospace, SFMono-Regular, ...;
```
System font fallbacks remain for consumers that use `default.css` without the font loader.

## Deferred

- Bold and Italic Source Code Pro variants — not needed yet; defer until inline code is
  styled with emphasis or until a request arrives.
- JetBrains Mono — preferred long-term if it becomes available; font-loader.js is easy
  to extend.
- Subsetting for extended Unicode (Greek, mathematical operators, etc.) — would require
  expanding the unicode range argument to pyftsubset; defer if a concrete need arises.
