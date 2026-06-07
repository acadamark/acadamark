# Downloading JATS articles (with figures) from PMC

The working method, after a long detour. Records what works and why the obvious routes don't.

## What works: the PMC AWS Open Data bucket (anonymous HTTPS)

The bucket `pmc-oa-opendata` is world-readable over plain HTTPS — no AWS account, no keys, no FTP. Each article version lives under a prefix `PMC<id>.<version>` (almost always `.1`) holding the XML, a JSON manifest, the PDF, and all figure/media files side by side.

Base URL: `https://pmc-oa-opendata.s3.amazonaws.com/PMC<id>.1/`

The JSON manifest (`PMC<id>.1.json`) lists `xml_url` and `media_urls` — but as `s3://` URLs. The one non-obvious step is rewriting `s3://pmc-oa-opendata/` to `https://pmc-oa-opendata.s3.amazonaws.com/` and dropping the `?md5=` query.

### The loop

```bash
for id in PMC5428240 PMC9428533 PMC12910011 PMC13060793; do
  mkdir -p "$id"
  base="https://pmc-oa-opendata.s3.amazonaws.com/$id.1"
  curl -sf "$base/$id.1.json" -o "$id/meta.json" || { echo "$id: not v.1"; continue; }
  curl -sf "$base/$id.1.xml"  -o "$id/$id.xml"
  # media URLs are s3:// in the manifest — rewrite to https, drop ?md5
  grep -o 's3://pmc-oa-opendata[^"?]*' "$id/meta.json" \
    | grep -Ev '\.(json|txt|xml)$' \
    | while read u; do
        url="https://pmc-oa-opendata.s3.amazonaws.com/${u#s3://pmc-oa-opendata/}"
        curl -sf "$url" -o "$id/$(basename "$u")"
      done
  echo "$id: $(ls "$id" | wc -l) files"
done
```

Each folder ends up with `PMC<id>.xml` plus the figure images (`*.jpg`/`*.png`), the article PDF, and any supplementary files (`*_ESM.*`, `media-*`). Point the importer at the folder, not the loose XML, so `<graphic>` hrefs resolve.

## What does NOT work (and why we burned time on it)

- **`efetch.fcgi?db=pmc`** returns the article XML *only* — no images. That's why early imports were captions-only.
- **The OA web service** (`oa.fcgi?id=...`) returns the package as an **`ftp://` link only** — no HTTPS variant exists, and the `format` param only filters records, it doesn't change transport.
- **That FTP link** fails on networks that block the FTP protocol (ours does); both curl and wget couldn't open it.
- **Rewriting the FTP path to `https://ftp.ncbi.nlm.nih.gov/...`** 404s — that path isn't mirrored on the HTTPS file host.
- **The old `oa_comm/xml/all/` S3 layout** was moved under a `deprecated/` prefix in April 2026 and is removed August 2026 — don't use it.

So: the AWS per-version bucket is the route. FTP and efetch-alone are dead ends for figures.

## Version caveat
The prefix needs the version (`.1`). If an article 404s on `.1`, list versions with the AWS CLI:
`aws s3api list-objects-v2 --bucket pmc-oa-opendata --prefix "PMC<id>." --delimiter "/" --no-sign-request --query "CommonPrefixes[].Prefix" --output text`

## Note for non-PMC sources
eLife was pulled directly from eLife, not PMC; its figures live in eLife's own package. The PMC recipe above is PMC-specific.
