# Bundled DTDs

This directory contains the JATS 1.3 Archiving and Interchange Tag
Set + BITS 2.0 DTD distributions, bundled in git so offline xmllint
validation works without network access at test time.

**Sources** (Phase 5 slice 5d, 2026-05-28):
- JATS 1.3: `https://jats.nlm.nih.gov/archiving/1.3/`
- BITS 2.0: `https://jats.nlm.nih.gov/extensions/bits/2.0/`
- ISO entity sets (those NLM doesn't mirror at root):
  `https://www.w3.org/2003/entities/2007/`
- MathML qname module: `https://www.w3.org/Math/DTD/mathml3/`

**Fetched by**: `../scripts/fetch-dtds.mjs` (one-shot maintenance
script; not part of the test pipeline). Run after JATS/BITS publishes
a new version; commit the updated tree.

**Size**: ~3.6 MB across ~129 files (per the slice 5d Q4 budget of
"a few MB").

**Known dead references** in the upstream DTD source that NLM doesn't
host and that xmllint ignores in practice (they sit in conditional
INCLUDE sections that don't activate for typical JATS articles):
- `JATS-xsi-schema-namespace1-3.ent` — referenced by
  `JATS-archivearticle1-3.dtd`; not on NLM.
- `JATS-mathmlsetup1.ent` — referenced by BITS's modules; BITS uses
  `JATS-mathml3-mathmlsetup1.ent` instead.

**xmllint invocation** (per the test runner):
```
xmllint --noout --valid --nonet \
        --path "dtd:dtd/iso9573-13" \
        fixture.xml
```

The `--path` lists both `dtd/` (the bundled DTD root) and
`dtd/iso9573-13/` (where some MathML-referenced ISO entity sets
live in the NLM source layout).
