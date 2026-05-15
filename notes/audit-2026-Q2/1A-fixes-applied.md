# Audit 1A — Fixes Applied

Fixes applied in-place during the Audit 1A reading pass. Each fix is mechanical (stale text corrected or status updated); none involve code changes.

---

## FIX-1: `notes/process.md` — stale test suite count

**Before:** "the full interpreter test suite (14 suites)"
**After:** "the full interpreter test suite (22 suites as of 2026-Q2 audit)"

The interpreter test suite grew from 14 to 22 suites across slices 4–7. The process.md count was never updated. Corrected.

---

## FIX-2: `notes/known-limitations.md` — "KaTeX fonts not included in inline-CSS mode"

**Before:** Active limitation with workaround text directing readers to CDN mode.
**After:** Section marked "Status: Fixed (2026-Q2 audit, AUD-10 + AUD-11)." explaining that `patchKatexFontUrls()` and `getDocumentFontsCss()` in `font-loader.js` now handle this. Original text retained under "retained for history."

KaTeX font URLs are patched to base64 and body fonts (Inter + Source Code Pro) are bundled as woff2 files. This was implemented during the prior session and already logged in AUD-10/AUD-11 but `known-limitations.md` was not updated to reflect it.

---

## NOT FIXED: `aud-12-through-15.md:Zone.Identifier`

The file `notes/aud-12-through-15.md:Zone.Identifier` is a Windows NTFS Alternate Data Stream metadata ghost. There is no corresponding content file — the Zone.Identifier was committed to the repository but the actual `.md` content it accompanied was never committed. AUD-12 through AUD-15 were filed directly into `notes/audit-findings.md` (confirmed by reading that file). No action needed other than noting this stale ghost file exists. Removing it is a cleanup task but not a blocking issue.
