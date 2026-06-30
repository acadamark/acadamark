# Conform plan — REVISED after grounding A1/A2 against code

Verify-first against the real specs collapsed much of the original worklist. Corrected picture:

## What collapsed (verify-first catches)
- **A2 (`[inline]` mis-specs) — mostly a FALSE ALARM.** `sub-section`/`sub-sub-section` are correctly specced:
  `type: structured` with a shape of {title `contains:[inline]`, subtitle `[inline]`, body `[block,section]`}.
  The `[inline]` flagged by the scoping regex is on the TITLE sub-part, where inline is CORRECT (a heading is
  inline text). The body correctly holds `[block, section]`. So these are headed-containers, properly declared.
  → Re-verify details/dl/glossary-entry the same way (the `[inline]` is almost certainly on a title/term
  sub-part, not the container). Likely A2 dissolves entirely.
- **A1 (`section` gap) — SMALLER than framed.** `section` DOES declare its shape (section-title +
  `contains:[block, section]`). What it "lacks" is the top-level `content.type` field — which **A3 removes
  anyway**. So A1 is mostly subsumed by A3: don't add a field we're deleting. Residual A1 = ensure section's
  shape declaration is consistent with sub-section's (it largely is).

## What's real
- **A3 (`content.type` dissolves) — the ONE big coherent change**, and it SUBSUMES A1/A2. Removing the
  `content.type` field + redistributing (descend-bit / which-processor / containment-shape) touches ~109
  frontmatter files + the generator + parser. Wide blast radius → **sequential, not concurrent with itself**.
  This is the heart of the conform pass.
- **Nav decision** — `nav`/`nav-group` lack content.type; semantic taxonomy says they're APPARATUS not content.
  Decide whether they're vocabulary elements at all. Small, can fold into A3 or stand alone.

## Concurrency reality
There is NOT much concurrent work on the conform track — it's essentially one big sequential refactor (A3).
What CAN run concurrently right now, independent of each other and of A3:
- **C-corrections** (`tax-corrections`) — docs-only, the marginnote/span taxonomy fixes. READY.
- **B1 handler-boundaries investigation** (`investigate-handler-boundaries`) — read-mostly spike + report,
  informs the later granularity decisions. READY. Concurrent-safe.

## Order
1. **NOW, concurrent:** `tax-corrections` (docs) ‖ `investigate-handler-boundaries` (report). Disjoint, safe.
2. **Then:** design the A3 dissolution slice carefully (it's the big one — grounded, sequential). Fold in
   the residual A1 (section/sub-section consistency) and the nav-as-apparatus decision.
3. **Then:** the deep drift audit, against conformed specs + taxonomies.
