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

function makeCiteMarker(keys, html) {
  return makeInternalMarker('__cite-marker', {
    kwargs: { keys: keys.join(','), html },
  });
}

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
      const keys = extractCiteKeys(node);

      if (keys.length === 0) {
        file?.message?.('cite-resolution: <cite> has no keys', node);
        return [makeCiteError(['(empty)'])];
      }

      // #395 D1 (always-renders): no library in scope is not a no-op. The
      // authored keys render the same visible ??cite: …?? marker a missing key
      // gets — one marker system for both failure shapes, never an empty <cite>.
      if (!citations) {
        file?.message?.(`cite-resolution: no <library> in scope for "${keys.join(', ')}"`, node);
        return [makeCiteError(keys)];
      }

      // Partition into found and missing.
      const foundKeys = [];
      const missingKeys = [];
      for (const key of keys) {
        const entry = cite.data.find(e => e.id === key);
        if (entry) {
          foundKeys.push(key);
        } else {
          missingKeys.push(key);
        }
      }

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
        let html;
        try {
          html = cite.format('citation', {
            entry: foundKeys,
            template: style,
            format: 'html',
            lang: 'en-US',
          });
        } catch (err) {
          // Shouldn't happen (we pre-checked), but defend against it.
          file?.message?.(`cite-resolution: format error: ${err.message}`, node);
          html = `??cite-error: ${foundKeys.join(', ')}??`;
        }
        replacements.push(makeCiteMarker(foundKeys, html));
      }

      if (missingKeys.length > 0) {
        replacements.push(makeCiteError(missingKeys));
      }

      // If all keys were missing, replacements = [__cite-error]. Good.
      // If some found, some missing: [__cite-marker, __cite-error]. Visible split.
      return replacements;
    }

    walkReplace(tree.children, 'cite', processCite);
  };
}
