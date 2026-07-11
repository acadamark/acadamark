// The <cite> interior grammar (#409) — Pandoc's citation item syntax, adopted.
//
// Spec: packages/ehtml/elements/cite.md §"The citation item grammar". The parser captures
// the arguments region verbatim (node.rawArgs, shorthand-syntax.md §Per-tag argument
// interiors); THIS module interprets it — the same capture-then-interpret split as DSL
// content. Items are `prefix @key, locator suffix`, separated by `;` (or by `,` when the
// next token is an @key, so bare-key groups `<cite @a, @b>` stay key groups).
//
// Generic attribute tokens (kwargs `name=value`, `#id`, `.class`, `+`/`-` booleans) parse
// as ordinary attributes wherever they appear; they are skipped here — the citation
// grammar consumes only the remaining prose/keys/punctuation.
//
// Output items carry citeproc citation-item fields {key, prefix, locator, label, suffix}
// — resolved by cite-resolution flowing them straight into citation-js (Phase 0 verified:
// 0.7.22 renders locator/label/prefix/suffix natively through the CSL template).

// Locator vocabulary v1 (cite.md's table): recognized term → CSL label.
export const LOCATOR_TERMS = new Map([
  ['p', 'page'], ['p.', 'page'], ['pp', 'page'], ['pp.', 'page'], ['page', 'page'], ['pages', 'page'],
  ['ch', 'chapter'], ['ch.', 'chapter'], ['chap', 'chapter'], ['chap.', 'chapter'], ['chapter', 'chapter'], ['chapters', 'chapter'],
  ['sec', 'section'], ['sec.', 'section'], ['section', 'section'], ['sections', 'section'], ['§', 'section'],
  ['fig', 'figure'], ['fig.', 'figure'], ['figure', 'figure'], ['figures', 'figure'],
  ['n', 'note'], ['n.', 'note'], ['note', 'note'], ['notes', 'note'],
  ['vol', 'volume'], ['vol.', 'volume'], ['volume', 'volume'], ['volumes', 'volume'],
  ['para', 'paragraph'], ['para.', 'paragraph'], ['paragraph', 'paragraph'], ['¶', 'paragraph'],
]);

// The kwarg long form's locator names (cite.md: page= / chapter= / … set the locator).
export const LOCATOR_KWARGS = new Set(['page', 'chapter', 'section', 'figure', 'note', 'volume', 'paragraph']);

// A locator VALUE token: digits/roman numerals with range/segment punctuation.
const VALUE_TOKEN = /^[0-9ivxlcdm]+(?:[.:–—-][0-9ivxlcdm]+)*[,;]?$/i;

// Generic-attribute tokens to skip: kwargs (quoted or bare values), #id, .class, +/-bools.
const ATTR_TOKEN = /(^|\s)(?:[A-Za-z][\w-]*=(?:"[^"]*"|'[^']*'|[^\s,;]+)|[#.][^\s,;]+|[+-][A-Za-z][\w-]*)(?=\s|$|[,;])/g;

/** Strip generic-attribute tokens from the raw args region, keeping citation prose. */
function citationProse(rawArgs) {
  return String(rawArgs ?? '').replace(ATTR_TOKEN, '$1');
}

/** Split the citation prose into item strings: `;` always separates; `,` separates when
 *  what follows (after whitespace) is an @key — so `@a, @b` is two items, `@a, p. 42` one. */
function splitItems(prose) {
  const items = [];
  let cur = '';
  for (let i = 0; i < prose.length; i++) {
    const c = prose[i];
    if (c === ';') { items.push(cur); cur = ''; continue; }
    if (c === ',' && /^\s*@/.test(prose.slice(i + 1))) { items.push(cur); cur = ''; continue; }
    cur += c;
  }
  items.push(cur);
  return items.map((s) => s.trim()).filter((s) => s !== '');
}

/** Parse one item: `prefix @key, locator suffix`. Returns an item or {malformed: raw}. */
function parseItem(raw) {
  const keyMatches = [...raw.matchAll(/@([^\s,;@]+)/g)];
  if (keyMatches.length !== 1) return { malformed: raw }; // zero or multiple @keys — never guess
  const m = keyMatches[0];
  const key = m[1];
  const prefix = raw.slice(0, m.index).trim();
  let rest = raw.slice(m.index + m[0].length).trim();

  let locator = '';
  let label = '';
  let suffix = '';
  if (rest.startsWith(',')) {
    rest = rest.slice(1).trim();
    const tokens = rest.split(/\s+/).filter(Boolean);
    const term = tokens[0]?.toLowerCase() ?? '';
    let valueStart = -1;
    if (LOCATOR_TERMS.has(term)) {
      label = LOCATOR_TERMS.get(term);
      valueStart = 1;
    } else if (tokens[0] && VALUE_TOKEN.test(tokens[0]) && /^\d/.test(tokens[0])) {
      label = 'page'; // Pandoc's rule: a bare number is a page
      valueStart = 0;
    }
    if (valueStart >= 0) {
      const valueTokens = [];
      let i = valueStart;
      for (; i < tokens.length && VALUE_TOKEN.test(tokens[i]); i++) {
        valueTokens.push(tokens[i].replace(/[,;]+$/, ''));
        if (/[,;]$/.test(tokens[i])) { i++; break; } // value ends at trailing punctuation
      }
      locator = valueTokens.join(', ');
      suffix = tokens.slice(i).join(' ');
      if (!locator) { label = ''; suffix = rest; } // term with no value → all suffix
    } else {
      suffix = rest; // no recognized locator: the whole part is a prose suffix
    }
  } else if (rest !== '') {
    suffix = rest; // trailing prose without a comma reads as a suffix
  }
  return { key, prefix, locator, label, suffix };
}

/**
 * Parse a <cite> interior (the rawArgs region) into citation items.
 *
 * @param {string} rawArgs - node.rawArgs (the args region, verbatim).
 * @returns {{ kind: 'legacy', keys: string[] } |
 *           { kind: 'items', items: object[], malformed: string[] }}
 *   legacy — no '@' anywhere: a plain key list (commas are separators), unchanged
 *   pre-#409 behavior. items — the Pandoc grammar parse.
 */
export function parseCiteInterior(rawArgs) {
  const prose = citationProse(rawArgs).trim();
  if (!prose.includes('@')) {
    const keys = prose.split(/[\s,;]+/).filter(Boolean);
    return { kind: 'legacy', keys };
  }
  const items = [];
  const malformed = [];
  for (const rawItem of splitItems(prose)) {
    const parsed = parseItem(rawItem);
    if (parsed.malformed !== undefined) malformed.push(parsed.malformed);
    else items.push(parsed);
  }
  return { kind: 'items', items, malformed };
}

/**
 * Merge the kwarg long form (page= / …, prefix=, suffix=) into parsed items, per the
 * spec's rules: kwargs address a SINGLE-key cite; with multiple items, or when both the
 * inline grammar and a kwarg carry a locator, the conflict is flagged (never guessed).
 *
 * @returns {{ items: object[], conflicts: string[] }}
 */
export function mergeKwargLocators(items, kwargs = {}) {
  const locatorEntries = Object.entries(kwargs ?? {}).filter(([k]) => LOCATOR_KWARGS.has(k));
  const prefix = kwargs?.prefix;
  const suffix = kwargs?.suffix;
  if (locatorEntries.length === 0 && prefix == null && suffix == null) return { items, conflicts: [] };

  const conflicts = [];
  if (items.length !== 1) {
    conflicts.push(`locator/prefix/suffix kwargs address a single-key cite; this cite has ${items.length} items`);
    return { items, conflicts };
  }
  if (locatorEntries.length > 1) {
    conflicts.push(`multiple locator kwargs (${locatorEntries.map(([k]) => k).join(', ')}) — one locator per cite`);
    return { items, conflicts };
  }
  const item = { ...items[0] };
  if (locatorEntries.length === 1) {
    const [label, value] = locatorEntries[0];
    if (item.locator) {
      conflicts.push(`both the inline grammar ("${item.label} ${item.locator}") and the ${label}= kwarg carry a locator`);
      return { items, conflicts };
    }
    item.label = label;
    item.locator = String(value);
  }
  if (prefix != null) {
    if (item.prefix) { conflicts.push('both inline prose and the prefix= kwarg carry a prefix'); return { items, conflicts }; }
    item.prefix = String(prefix);
  }
  if (suffix != null) {
    if (item.suffix) { conflicts.push('both inline prose and the suffix= kwarg carry a suffix'); return { items, conflicts }; }
    item.suffix = String(suffix);
  }
  return { items: [item], conflicts: [] };
}
