# Acadamark example document assets

This folder contains image assets for use in acadamark example documents
(`document-5-linear-regression.acm`, `document-6-cross-references.acm`).

## Files included

### `scatter-regression.svg`
Generated scatter plot for the linear regression example. 30 data points
following y = 2 + 0.7x with Gaussian noise (seed=42, reproducible). Includes
the computed regression line and equation annotation (y = 2.00 + 0.67x).

- 500 × 350 viewBox, scales cleanly.
- Pure SVG, no external dependencies, no fonts beyond Georgia/serif fallback.
- Source generator: `generate_scatter.py` (deterministic; re-run to reproduce).

Use in `document-5-linear-regression.acm`:

```
<figure #fig:scatter src="assets/scatter-regression.svg"
        alt="Scatter plot with regression line"
      | A scatter plot of synthetic data with the least-squares regression
        line overlaid.>
```

### `generate_scatter.py`
The Python script that produced `scatter-regression.svg`. Kept in the repo
so the figure can be regenerated or tweaked (different point count, noise
level, regression coefficients, color scheme) without round-tripping
through an external tool.

## Elephant image (you'll need to download manually)

For `document-6-cross-references.acm`, the figure example references an
elephant photo. The sandbox where these assets were generated couldn't
reach Wikimedia's upload server, so the file isn't bundled — but here
are two direct download URLs:

### Option 1: Public domain
**File:** African_elephant_male.jpg (1083 × 735, 98 KB, public domain)
**Page:** https://commons.wikimedia.org/wiki/File:African_elephant_male.jpg
**Direct:** https://upload.wikimedia.org/wikipedia/commons/2/27/African_elephant_male.jpg
**License:** Public domain. No attribution required, though courtesy
attribution to the uploader (Fæ) is fine.

### Option 2: CC-BY-SA 3.0
**File:** African Elephant walking.JPG (CC-BY-SA 3.0)
**Page:** https://commons.wikimedia.org/wiki/File:African_Elephant_walking.JPG
**License:** Creative Commons Attribution-ShareAlike 3.0 Unported.
Photographer: Charles J. Sharp. Requires attribution.

I'd recommend **Option 1** for the example document — public domain means
no attribution dance in the rendered HTML and no license-compatibility
question if acadamark itself is later relicensed.

Once downloaded, rename to `elephant.jpg` (or whatever fits the document)
and drop into this assets folder.

## Future assets

When more example documents need images:

- Generated SVGs (charts, diagrams) live alongside their generator script
  so they're reproducible.
- Photographs come from Wikimedia Commons or other public-domain sources.
  Prefer public domain over CC-BY-SA for example documents to keep
  attribution machinery out of the way.
- Each asset gets one line in this README documenting source and license.
