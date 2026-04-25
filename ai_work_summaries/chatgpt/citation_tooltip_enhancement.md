https://chatgpt.com/share/8b3aa6bf-086a-4d0a-a196-d648b136198f

````markdown
# Chat Documentation: Citation Rendering, Tooltips, Floating UI, Citation.js, and citeproc-js

## Overall Goal

The goal of this work was to build a browser-based JavaScript system that can:

1. Find all HTML `<cite>` elements in a document.
2. Read one or more citation IDs from each `<cite>` element.
3. Replace the raw citation IDs with formatted inline citations.
4. Generate a tooltip for each citation containing bibliography-style reference entries.
5. Use a real citation library, eventually Citation.js, instead of a dummy `getCitation()` function.
6. Use Floating UI rather than basic CSS positioning so citation tooltips stay properly positioned on the page.
7. Explore whether Citation.js / citeproc-js can generate properly grouped multi-citation output, such as:
   - APA: `(Loomes et al., 2017; Mantzalas et al., 2022)`
   - AMA: `<sup>1-2</sup>`

---

## Initial Citation Tooltip System

We started with a conceptual function:

```js
function getCitation(citation_id, type, style, format)
{
    /* do stuff with citation ids */
    return(html_string)
}
```

The intended use was:

```js
getCitation(citation_id, type="inline", style="Chicago", format="html")
```

The basic HTML looked like:

```html
<section>
  <p>
    These ideas are supported by research
    <cite data-style="Chicago">@jones2021, @smith2016</cite>
  </p>
</section>
```

The goal was:

- Replace each `<cite>` tag’s inner HTML with inline formatted citations.
- Generate a tooltip containing bibliography-formatted entries for the same citation IDs.
- Support multiple citation IDs in one `<cite>` tag.

A working basic approach was developed:

```js
function formatCitations() {
    const citeElements = document.querySelectorAll('cite[data-style]');
    
    citeElements.forEach(el => {
        const dataStyle = el.getAttribute('data-style');
        const citation_ids = el.innerText
            .replace(/@/g, '')
            .split(',')
            .map(id => id.trim());

        const inlineCitations = citation_ids
            .map(id => getCitation(id, "inline", dataStyle, "html"))
            .join(', ');

        const bibliographyList = citation_ids
            .map(id => getCitation(id, "bibliography", dataStyle, "html"))
            .join('');

        el.innerHTML = inlineCitations;

        el.setAttribute('title', `<ul>${bibliographyList}</ul>`);
        el.classList.add('tooltip');
    });
}
```

This worked as a proof of concept, but the tooltip needed better positioning than the native `title` attribute or CSS-only positioning.

---

## Floating UI Tooltip Work

The next goal was to replace the simple tooltip with a proper positioned tooltip using Floating UI.

### Initial Floating UI Problems

Several CDN approaches produced errors.

One early CDN URL caused a MIME-type error:

```html
<script src="https://unpkg.com/@floating-ui/dom@1.0.2/dist/floating-ui.dom.min.js"></script>
```

The browser reported:

```text
The resource was blocked due to MIME type (“text/plain”) mismatch
(X-Content-Type-Options: nosniff).
```

Another attempt produced:

```text
Uncaught ReferenceError: floatingUI is not defined
```

We learned that the global object for the browser build is not `floatingUI`, but usually:

```js
window.FloatingUIDOM
```

However, even after switching to `window.FloatingUIDOM`, other UMD/CDN builds kept producing problems such as:

```text
Uncaught TypeError: e is undefined
```

or:

```text
Uncaught TypeError: Cannot read properties of undefined (reading 'offset')
```

or:

```text
TypeError: a.default.detectStore(...) is undefined
```

These errors appeared to be related to using the wrong CDN build, wrong module format, or incompatible version/export assumptions.

### Working Floating UI Approach

Eventually, the working solution was to use the ES module CDN endpoint from jsDelivr:

```js
import {
    computePosition,
    shift,
    flip,
    offset
} from 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.6.8/+esm';
```

This required the script to be:

```html
<script type="module">
```

The key working Floating UI call became:

```js
computePosition(el, tooltipContent, {
    placement: 'top',
    middleware: [
        offset({ mainAxis: 10 }),
        flip(),
        shift({ padding: 5 })
    ],
}).then(({ x, y }) => {
    Object.assign(tooltipContent.style, {
        left: `${x}px`,
        top: `${y}px`
    });
});
```

### Important Floating UI Lessons

We discovered that:

1. The `+esm` version worked better than the UMD/global script versions.
2. Version `1.6.8` worked.
3. The preferred import syntax is:

```js
import {
    computePosition,
    shift,
    flip,
    offset
} from 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.6.8/+esm';
```

4. `preventOverflow` should not be used here.
   - It was not available as expected.
   - It is deprecated / not part of the correct modern middleware set.
   - `shift()` and `flip()` are the relevant modern middleware for keeping floating elements visible.

A minimal Floating UI example was also created to reproduce the earlier errors for StackOverflow/debugging.

---

## Switching from Dummy `getCitation()` to Citation.js

The next goal was to replace the dummy `getCitation()` function with the Citation.js library.

The HTML document was updated to include real citation IDs:

```html
<cite>Loomes2017</cite>
<cite>Caldwell-Harris2023,GillespieLynch2017</cite>
<cite>Mantzalas2022,Caldwell-Harris2023</cite>
<cite>Pellicano2014,GillespieLynch2017,Loomes2017</cite>
```

The document also included:

```html
<section id="bibliography">
  <h1>References</h1>
  <section id="references-list"></section>
</section>
```

There were two available reference files:

- `library.bib` in BibLaTeX/BibTeX-like format.
- `library.json` in CSL-JSON format.

The first working target was loading `library.bib`.

---

## Citation.js Loading Problems

Several approaches were tried.

### `window.Cite`

Using:

```js
const Cite = window.Cite;
```

or similar global-object approaches consistently produced:

```text
TypeError: Cite is not a constructor
```

This remained a persistent problem.

### ES Module Import Attempts

Attempts to import Citation.js through jsDelivr’s `+esm` endpoint led to dependency errors involving `wikidata-sdk`:

```text
Uncaught SyntaxError: The requested module
'https://cdn.jsdelivr.net/npm/wikidata-sdk@7.14.4/+esm'
doesn't provide an export named: 'simplify'
```

Later we noted that `wikidata-sdk` has been renamed to `wikibase-sdk`, which may explain part of the dependency mismatch.

A minimal example was created to isolate this Citation.js / wikidata-sdk problem.

### Working Citation.js Approach

The method that actually worked in the current environment was:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/citation-js/0.7.14/citation.js"></script>

<script type="module">
    const Cite = require('citation-js');

    import {
        computePosition,
        shift,
        flip,
        offset
    } from 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.6.8/+esm';

    // rest of script
</script>
```

Normally, `require()` is CommonJS and is not expected to work inside browser ES modules. However, in this environment, Citation.js defines or exposes a `require()` mechanism that makes this work.

The user decided to keep the method that works:

```js
const Cite = require('citation-js');
```

rather than the theoretically cleaner approaches that failed.

---

## Working Citation + Floating UI Code

A combined working version was produced using:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/citation-js/0.7.14/citation.js"></script>
```

and:

```js
const Cite = require('citation-js');
```

plus Floating UI imported as:

```js
import {
    computePosition,
    shift,
    flip,
    offset
} from 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.6.8/+esm';
```

The citation library was loaded from `library.bib`:

```js
async function loadReferences() {
    const response = await fetch('library.bib');
    const bibText = await response.text();
    return new Cite(bibText);
}
```

The Citation.js formatting function was:

```js
function getCitation(citationInstance, citation_id, type, style, format) {
    if (type === "inline") {
        return citationInstance.format('citation', {
            entry: citation_id,
            format: 'html',
            template: style,
            lang: 'en-US'
        });
    } else if (type === "bibliography") {
        return citationInstance.format('bibliography', {
            entry: citation_id,
            format: 'html',
            template: style,
            lang: 'en-US'
        });
    }

    return "";
}
```

Each `<cite>` tag was processed by:

```js
const citation_ids = el.innerText
    .split(',')
    .map(id => id.trim());
```

Inline citations were generated with:

```js
const inlineCitations = citation_ids
    .map(id => getCitation(citationInstance, id, "inline", 'apa', "html"))
    .join(', ');
```

Tooltip bibliography entries were generated with:

```js
const bibliographyList = citation_ids
    .map(id => `<li>${getCitation(citationInstance, id, "bibliography", 'apa', "html")}</li>`)
    .join('');
```

The tooltip was created dynamically:

```js
const tooltipContent = document.createElement('div');
tooltipContent.classList.add('tooltip-content');
tooltipContent.innerHTML = `<ul>${bibliographyList}</ul>`;

el.appendChild(tooltipContent);
el.classList.add('tooltip');
```

Floating UI was used on hover:

```js
el.addEventListener('mouseenter', () => {
    tooltipContent.style.display = 'block';

    computePosition(el, tooltipContent, {
        placement: 'top',
        middleware: [
            offset({ mainAxis: 10 }),
            flip(),
            shift({ padding: 5 })
        ],
    }).then(({ x, y }) => {
        Object.assign(tooltipContent.style, {
            left: `${x}px`,
            top: `${y}px`
        });
    }).catch(error => {
        console.error("Error computing position:", error);
    });
});

el.addEventListener('mouseleave', () => {
    tooltipContent.style.display = 'none';
});
```

---

## Multi-Citation Formatting Problem

A separate minimal Citation.js example was created to test whether Citation.js can properly format grouped multi-citations.

The test used:

```js
let single_citation = "Loomes2017";
let double_citation = "Loomes2017,Mantzalas2022";
```

Citation.js produced output like:

```text
single inline APA: (Loomes et al., 2017)
double inline APA: (Loomes et al., 2017),(Mantzalas et al., 2022)
single inline AMA: (Loomes et al., 2017)
double inline AMA: (Loomes et al., 2017),(Mantzalas et al., 2022)
```

But the desired output was:

```text
APA: (Loomes et al., 2017; Mantzalas et al., 2022)
AMA: <sup>1-2</sup>
```

This showed that calling `library.format('citation', ...)` separately for each ID and joining the results is not enough.

The underlying issue is that CSL/citeproc needs to see the entire citation cluster at once to apply style-specific rules for:

- separating citations,
- sorting citations,
- collapsing numeric ranges,
- generating citation numbers,
- formatting grouped parenthetical citations.

---

## citeproc-js Exploration

Because the Citation.js documentation says:

> Citation and bibliography formatting is done with the citeproc-js engine and CSL.

we explored using citeproc-js directly.

### Problems Loading citeproc-js from CDNs

Several CDN paths failed:

```html
<script src="https://cdn.jsdelivr.net/npm/citeproc@1.1.256/citeproc.min.js"></script>
```

produced:

```text
MIME type (“text/plain”) mismatch
```

Another CDN path:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/citeproc/1.1.231/citeproc.min.js"></script>
```

produced:

```text
NS_ERROR_CORRUPTED_CONTENT
MIME type (“text/html”) mismatch
```

A direct GitHub raw link also failed:

```html
<script src="https://raw.githubusercontent.com/Juris-M/citeproc-js/master/citeproc.js"></script>
```

with:

```text
MIME type (“text/plain”) mismatch
```

The reason is that browsers often block scripts when the server sends the wrong MIME type and uses:

```text
X-Content-Type-Options: nosniff
```

### Local citeproc.js

The user then downloaded or served `citeproc.js` locally.

That got past the script-loading problem, but a new error occurred:

```text
Uncaught (in promise) TypeError: xmlObject is null
setupXml citeproc.js:2700
localeConfigure citeproc.js:9341
Engine citeproc.js:3880
```

This indicated that citeproc-js was not receiving a valid XML locale object/string.

The proposed fix was to provide citeproc-js with locale XML files, especially `locales-en-US.xml`, and ensure `retrieveLocale()` returns the actual locale XML text synchronously or in the form expected by citeproc-js.

This part was not yet fully resolved.

---

## Important Lessons Learned

### 1. Floating UI should be used through ESM import

The working Floating UI import is:

```js
import {
    computePosition,
    shift,
    flip,
    offset
} from 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.6.8/+esm';
```

Avoid the older UMD/global scripts for this project.

### 2. Do not use `preventOverflow`

Use:

```js
shift({ padding: 5 })
flip()
offset({ mainAxis: 10 })
```

instead.

### 3. Citation.js global access is unreliable here

This did not work reliably:

```js
const Cite = window.Cite;
```

It produced:

```text
Cite is not a constructor
```

### 4. Citation.js ESM import exposed dependency problems

Importing Citation.js as an ES module exposed an error involving `wikidata-sdk` / `wikibase-sdk`.

### 5. The working Citation.js method is unusual but valid for now

The only working method in the user’s environment was:

```js
<script src="https://cdnjs.cloudflare.com/ajax/libs/citation-js/0.7.14/citation.js"></script>

<script type="module">
    const Cite = require('citation-js');
</script>
```

Even though this is not the usual browser ES module pattern, it works in the current setup.

### 6. Formatting each citation separately is not enough

This approach:

```js
citation_ids.map(id => library.format('citation', { entry: id }))
```

cannot produce proper APA grouped citations or AMA numeric ranges.

To get correct APA / AMA multi-citation behavior, the citation processor needs to receive the whole citation cluster.

---

## What Was Accomplished

1. Built a working citation replacement system for `<cite>` tags.
2. Built dynamically generated tooltips for each citation.
3. Switched from a dummy `getCitation()` function to Citation.js.
4. Loaded references from `library.bib`.
5. Generated inline citations and bibliography-style tooltip entries.
6. Integrated Floating UI successfully using the ESM endpoint.
7. Identified and resolved the major Floating UI import/version problem.
8. Identified that `preventOverflow` should not be used.
9. Identified that Citation.js 0.7.14 via CDN plus `require('citation-js')` works in the current environment.
10. Created minimal examples for:
    - Citation.js constructor/import errors.
    - Floating UI offset/export errors.
    - Citation.js / wikidata-sdk ESM dependency errors.
11. Confirmed that simple Citation.js `format('citation')` calls do not produce proper grouped multi-citation output.
12. Began exploring direct citeproc-js use to solve grouped citation formatting.

---

## Current Working Pattern

The currently working approach is:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/citation-js/0.7.14/citation.js"></script>

<script type="module">
    const Cite = require('citation-js');

    import {
        computePosition,
        shift,
        flip,
        offset
    } from 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.6.8/+esm';

    // rest of citation + tooltip code
</script>
```

This should be treated as the stable working baseline for now.

---

## Remaining Problems

### 1. Proper multi-citation formatting

Current output for multiple APA citations is essentially:

```text
(Loomes et al., 2017),(Mantzalas et al., 2022)
```

Desired APA output:

```text
(Loomes et al., 2017; Mantzalas et al., 2022)
```

Current output for AMA is not AMA-style numeric citation output.

Desired AMA output:

```html
<sup>1-2</sup>
```

### 2. Need citation cluster support

The next task is to figure out whether Citation.js exposes an API for passing a citation cluster rather than one citation ID at a time.

The key question is:

> Can Citation.js send a whole citation cluster to citeproc-js in a way that produces style-correct output?

If Citation.js cannot expose that cleanly, then direct citeproc-js use may be needed.

### 3. citeproc-js locale handling is unresolved

The local citeproc-js file loaded, but `CSL.Engine` failed because the locale XML was missing or not returned in the expected form.

The specific error was:

```text
TypeError: xmlObject is null
```

This likely means `retrieveLocale()` is not supplying valid XML.

---

## Recommended Next Steps

### Step 1: Keep the working baseline

Do not refactor the Citation.js import yet. Keep:

```js
const Cite = require('citation-js');
```

because it works in the current environment.

### Step 2: Improve the tooltip behavior

Possible improvements:

- Limit tooltip width.
- Add padding and readable typography.
- Avoid tooltips being clipped by parent containers.
- Consider appending tooltip elements to `document.body` instead of inside the `<cite>` element.
- Add `strategy: 'fixed'` to Floating UI if needed:

```js
computePosition(el, tooltipContent, {
    placement: 'top',
    strategy: 'fixed',
    middleware: [
        offset({ mainAxis: 10 }),
        flip(),
        shift({ padding: 5 })
    ],
})
```

### Step 3: Generate the full bibliography list

The current code creates tooltip bibliography entries, but the page also includes:

```html
<section id="references-list"></section>
```

Next, collect all unique cited IDs and render a full bibliography into that section.

Possible outline:

```js
const allCitationIds = [...document.querySelectorAll('cite')]
    .flatMap(el => el.innerText.split(',').map(id => id.trim()));

const uniqueCitationIds = [...new Set(allCitationIds)];
```

Then render bibliography entries into `#references-list`.

### Step 4: Investigate Citation.js cluster citation APIs

Look for whether Citation.js can call citeproc-js with a whole cluster rather than one `entry` at a time.

The target behavior is:

```js
formatCitationCluster(["Loomes2017", "Mantzalas2022"], "apa")
```

returning:

```text
(Loomes et al., 2017; Mantzalas et al., 2022)
```

and:

```js
formatCitationCluster(["Loomes2017", "Mantzalas2022"], "american-medical-association")
```

returning something like:

```html
<sup>1,2</sup>
```

or, if collapse is enabled by the CSL style:

```html
<sup>1-2</sup>
```

### Step 5: Continue citeproc-js direct testing only if needed

If Citation.js cannot handle clusters, continue with direct citeproc-js.

To do that, the next technical requirement is to provide:

1. A local `citeproc.js`.
2. Local CSL styles, such as:
   - `apa.csl`
   - `american-medical-association.csl`
3. Local locale XML, especially:
   - `locales-en-US.xml`

Then `retrieveLocale()` must return valid XML text.

### Step 6: Make a minimal citeproc-js test independent of the whole project

Before integrating citeproc-js into the main citation-tooltip system, create a minimal test that only does:

1. Load two CSL-JSON references.
2. Load one CSL style.
3. Load `locales-en-US.xml`.
4. Create a `CSL.Engine`.
5. Format:
   - one APA citation,
   - two APA citations as a cluster,
   - one AMA citation,
   - two AMA citations as a cluster.

Only after that works should it be folded back into the full tooltip/citation-rendering system.

---

## Most Important Current Takeaway

The citation-tooltip system itself is working.

The remaining hard problem is not tooltips or basic Citation.js parsing. The hard problem is getting style-correct grouped citation clusters.

That likely requires either:

1. finding the correct Citation.js API for citation clusters, or
2. using citeproc-js directly with proper CSL style and locale XML setup.
````


