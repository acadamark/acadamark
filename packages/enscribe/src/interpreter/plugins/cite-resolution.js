// cite-resolution plugin — replace <cite> nodes with __cite-marker (resolved)
// or __cite-error (unresolvable) internal nodes before hast conversion.
//
// Runs after enscribeLibraryLoad (needs file.data.enscribeCitations) and
// before enscribeBibliography (which reads the citation order built here).
//
// For each <cite> node:
//   - Extract citation keys from node.positional (canonical), node.content
//     string (pipe form), or recursively-parsed content array (text extraction).
//   - No library in scope (file.data.enscribeCitations unset — no <library>, or
//     every source failed to load) → __cite-error with the authored keys (#395).
//     always-renders: an authored cite never silently renders as an empty
//     <cite></cite>; the same visible ??cite: …?? marker a missing key gets.
//   - For each key: check file.data.enscribeCitations.cite.data.find(e => e.id === key).
//     Missing-key format() would throw — pre-check is required.
//   - Found keys → cite.format('citation', ...) → __cite-marker with the HTML.
//   - Missing keys → __cite-error node (visible error in output).
//   - Mixed (some found, some missing) → __cite-marker for found + __cite-error for missing.
//   - Track citation order: first-cited order is recorded in citations.order.
//
// __cite-marker kwargs: { keys: 'all,original,keys', html: '<formatted citation>' }
// __cite-error kwargs:  { keys: 'missing,keys' }
//
// Both set 'keys' to the full original key list so authors can see what was cited.
// __cite-marker.keys = all keys (found+missing when mixed; found-only when all found).
// __cite-error.keys  = only the missing keys (or all if all missing).

import { makeInternalMarker } from '../../core/tag.js';
import { walkReplace } from '../../core/walkers/walk-replace.js';
import { ENSCRIBE_CITATIONS } from '../../core/file-data-keys.js';
import { parseCiteInterior, mergeKwargLocators } from '../lib/cite-items.js';
import { extractPlainText } from '../lib/ast-helpers.js';

// ─── Key extraction ───────────────────────────────────────────────────────────

/**
 * Extract citation keys from a <cite> node.
 *
 * Tries three sources in order:
 *   1. node.atRefs — F1 canonical: <cite @Smith2020, @Jones2019>
 *      Grammar strips the @ prefix; returns plain key strings.
 *   2. node.positional — bracketed-list form: <cite [@smith2017, @jones2023]>
 *      BracketedList produces a nested array: node.positional = [['@s','@j']].
 *      Flatten and strip leading @ from each item.
 *   3. node.content string — pipe form: <cite | Smith2020,Jones2019>
 *   4. node.content array — recursively-parsed (defensive; currently unreachable)
 *
 * This rewrite also supersedes latent bug B-1: the old positional path called
 * .trim() on nested array items, crashing on bracketed-list input. That broken
 * path is replaced by the flatten+strip logic in path 2.
 */
function extractCiteKeys(node) {
  // Path 1: @-prefixed keys via AtRef grammar rule (grammar strips @).
  if (Array.isArray(node.atRefs) && node.atRefs.length > 0) {
    return node.atRefs;
  }
  // Path 2: bracketed-list form — node.positional = [['@smith2017', '@jones2023']]
  // Flatten the nested array and strip leading @ from each item.
  if (Array.isArray(node.positional) && node.positional.length > 0) {
    const flat = [];
    for (const k of node.positional) {
      if (Array.isArray(k)) flat.push(...k);
      else flat.push(k);
    }
    return flat.map(k => (typeof k === 'string' && k.startsWith('@')) ? k.slice(1) : k).filter(Boolean);
  }
  // Path 3: pipe-form content string.
  if (typeof node.content === 'string') {
    return node.content.split(',').map(k => k.trim()).filter(Boolean);
  }
  // Path 4: recursively-parsed content array (defensive; cite not in `LANGUAGES`).
  if (Array.isArray(node.content) && node.content.length > 0) {
    const text = extractPlainText(node.content, { trim: false });
    return text.split(',').map(k => k.trim()).filter(Boolean);
  }
  return [];
}

// ─── Internal node factories ──────────────────────────────────────────────────

function makeCiteMarker(keys, html, styleForm = null) {
  return makeInternalMarker('__cite-marker', {
    kwargs: { keys: keys.join(','), html, ...(styleForm ? { style: styleForm } : {}) },
  });
}

// #418: the per-citation FORM set — the rendering modes of the ONE document-wide
// citation style (never a per-cite CSL-style switch; Ariel 2026-07-13). Names per
// the LaTeX axis and APA/Zotero terminology: parenthetical = \citep (default),
// narrative = \citet (APA "narrative citation"), suppress-author = Zotero's
// Suppress Author / Pandoc [-@k]. year-only/author-only bare forms are parked.
const CITE_FORMS = new Set(['parenthetical', 'narrative', 'suppress-author']);

function makeCiteError(keys) {
  return makeInternalMarker('__cite-error', {
    kwargs: { keys: keys.join(',') },
  });
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

/**
 * Unified plugin. Replaces <cite> nodes with resolved markers or error nodes.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeCiteResolution() {
  return (tree, file) => {
    const citations = file?.data?.[ENSCRIBE_CITATIONS] ?? null;
    const { cite, order, style } = citations ?? {};

    function processCite(node) {
      // #409: the retired custom-text form — pipe/long content on <cite> was silently
      // read as a key list before; it now flags visibly (prefix/suffix carry the intent).
      const contentText = typeof node.content === 'string' ? node.content.trim()
        : Array.isArray(node.content) && node.content.length > 0 ? extractPlainText(node.content, { trim: true })
        : '';
      if (contentText) {
        file?.message?.(`cite-resolution: custom text is not a citation form (use prefix/suffix, #409): "${contentText}"`, node);
        return [makeCiteError([`${contentText} — custom text is not supported; use prefix/suffix`])];
      }

      // #409: parse the interior under the citation item grammar (cite.md). rawArgs is
      // the parser's verbatim capture of the args region; a node without one (synthesized
      // trees) falls back to the legacy key channels.
      let items;
      let malformed = [];
      if (typeof node.rawArgs === 'string' && node.rawArgs.trim() !== '') {
        const parsed = parseCiteInterior(node.rawArgs);
        if (parsed.kind === 'legacy') items = parsed.keys.map((key) => ({ key, prefix: '', locator: '', label: '', suffix: '' }));
        else { items = parsed.items; malformed = parsed.malformed; }
      } else {
        items = extractCiteKeys(node).map((key) => ({ key, prefix: '', locator: '', label: '', suffix: '' }));
      }

      // The kwarg long form (page=/chapter=/…, prefix=, suffix=) merges onto a
      // single-item cite; conflicts and multi-item ambiguity flag, never guess.
      const merged = mergeKwargLocators(items, node.kwargs);
      items = merged.items;
      for (const conflict of merged.conflicts) {
        file?.message?.(`cite-resolution: ${conflict}`, node);
        malformed.push(conflict);
      }
      for (const bad of malformed) {
        file?.message?.(`cite-resolution: malformed citation item (see cite.md's item grammar): "${bad}"`, node);
      }

      const keys = items.map((it) => it.key);

      // #418: resolve the per-citation form. Unknown values are the #401 warned-default
      // (name the kwarg, the value, the accepted set; render parenthetical). narrative is
      // single-work by nature — a multi-key group warns and falls back (split the group
      // to mix forms; one form per <cite>).
      let form = 'parenthetical';
      let formAuthored = false;
      const styleRaw = node.kwargs?.style;
      if (styleRaw != null) {
        if (CITE_FORMS.has(String(styleRaw))) {
          form = String(styleRaw);
          formAuthored = true;
        } else {
          file?.message?.(
            `cite-resolution: style="${styleRaw}" is not a recognized citation form — expected ${[...CITE_FORMS].join(', ')}; the default applies`,
            node, 'cite:invalid-style');
        }
      }
      if (form === 'narrative' && items.length > 1) {
        file?.message?.(
          `cite-resolution: style=narrative is a single-work form — a ${items.length}-key group renders parenthetical (split the group to mix forms)`,
          node, 'cite:narrative-group');
        form = 'parenthetical';
      }

      if (keys.length === 0 && malformed.length === 0) {
        file?.message?.('cite-resolution: <cite> has no keys', node);
        return [makeCiteError(['(empty)'])];
      }
      if (keys.length === 0) {
        // Only malformed items: every one renders its visible marker.
        return malformed.map((bad) => makeCiteError([bad]));
      }

      // #395 D1 (always-renders): no library in scope is not a no-op. The
      // authored keys render the same visible ??cite: …?? marker a missing key
      // gets — one marker system for both failure shapes, never an empty <cite>.
      if (!citations) {
        file?.message?.(`cite-resolution: no <library> in scope for "${keys.join(', ')}"`, node);
        return [makeCiteError(keys)];
      }

      // Partition into found and missing (by each item's key).
      const foundItems = [];
      const missingKeys = [];
      for (const item of items) {
        const entry = cite.data.find(e => e.id === item.key);
        if (entry) foundItems.push(item);
        else missingKeys.push(item.key);
      }
      const foundKeys = foundItems.map((it) => it.key);

      // Warn about missing keys.
      for (const key of missingKeys) {
        file?.message?.(`cite-resolution: key not found in library: "${key}"`, node);
      }

      // Track first-cited order for bibliography assembly.
      for (const key of foundKeys) {
        if (!order.includes(key)) order.push(key);
      }

      // Build replacement nodes.
      const replacements = [];

      if (foundKeys.length > 0) {
        // #409: an item with locator/prefix/suffix flows through citation-js as a full
        // citeproc citation item — the CSL style renders labels, punctuation, and order
        // (Phase 0: 0.7.22 supports this natively). Bare-key parenthetical cites keep the
        // plain key-array call, byte-identical to the pre-#409/#418 render.
        const itemProps = (it, extra = {}) => ({
          id: it.key,
          ...(it.locator ? { locator: it.locator, label: it.label || 'page' } : {}),
          ...(it.prefix ? { prefix: it.prefix.endsWith(' ') ? it.prefix : it.prefix + ' ' } : {}),
          ...(it.suffix ? { suffix: it.suffix.startsWith(' ') ? it.suffix : ' ' + it.suffix } : {}),
          ...extra,
        });
        const fmt = (entry) => cite.format('citation', { entry, template: style, format: 'html', lang: 'en-US' });
        let html;
        try {
          if (form === 'narrative') {
            // #418: the author-in-text composite ("Doe (1999, p. 42)"). citeproc's cluster
            // machinery isn't reachable through citation-js's format('citation'), so the
            // composite is COMPOSED from its two native per-item parts — author-only
            // (carrying the prefix: "see Doe") + suppress-author (carrying the locator and
            // suffix: "(1999, p. 42)") — joined with one space. The CSL style still owns
            // each part's punctuation and localization (the #418 Phase-0 spike).
            const it = foundItems[0];
            const authorPart = fmt([{ id: it.key, 'author-only': true, ...(it.prefix ? { prefix: it.prefix.endsWith(' ') ? it.prefix : it.prefix + ' ' } : {}) }]);
            const parenPart = fmt([itemProps({ ...it, prefix: '' }, { 'suppress-author': true })]);
            html = `${authorPart} ${parenPart}`;
          } else {
            const suppress = form === 'suppress-author';
            const bare = !suppress && foundItems.every((it) => !it.locator && !it.prefix && !it.suffix);
            const entry = bare ? foundKeys : foundItems.map((it) => itemProps(it, suppress ? { 'suppress-author': true } : {}));
            html = fmt(entry);
          }
        } catch (err) {
          // Shouldn't happen (we pre-checked), but defend against it.
          file?.message?.(`cite-resolution: format error: ${err.message}`, node);
          html = `??cite-error: ${foundKeys.join(', ')}??`;
        }
        replacements.push(makeCiteMarker(foundKeys, html, formAuthored ? form : null));
      }

      if (missingKeys.length > 0) {
        replacements.push(makeCiteError(missingKeys));
      }
      for (const bad of malformed) {
        replacements.push(makeCiteError([bad]));
      }

      // If all keys were missing, replacements = [__cite-error]. Good.
      // If some found, some missing: [__cite-marker, __cite-error]. Visible split.
      return replacements;
    }

    walkReplace(tree.children, 'cite', processCite);
  };
}
