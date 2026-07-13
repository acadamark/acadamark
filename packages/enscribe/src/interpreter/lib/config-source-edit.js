// #430 — the document tier's source rewrite: set / remove a single <config> kwarg in the .emd SOURCE.
//
// The settings panel's document tier is "a friendly editor over document state" (#398 Q4): changing the
// theme or default variant rewrites the document's <config> block, visible in the source pane. The rewrite
// must be SURGICAL — reformat nothing, never touch prose or a <config> shown inside a code example. So it
// is PARSE-GUIDED and SPAN-BOUNDED, the same shape build-live.js's external-asset embedding uses: locate
// the real <config> node (a parsed node with a source position — a <config> inside a ``` fence is not a
// node, so it is invisible here by construction), then a bounded regex WITHIN that node's exact source
// span. There is no shorthand serializer (the pipeline only goes shorthand→eHTML) and kwargs carry no
// per-kwarg positions, so a bounded-span regex is the tightest safe unit — a whole-document regex would
// be fragile across multiple config blocks and quoting, and parse→set→re-serialize would reflow the file.

/** Collect the real <config> nodes (with source positions), document order. */
function collectConfigNodes(tree) {
  const out = [];
  const visit = (nodes) => {
    for (const n of nodes ?? []) {
      if (!n || typeof n !== 'object') continue;
      if (n.tagname === 'config' && n.position) out.push(n);
      if (Array.isArray(n.children)) visit(n.children);
      if (Array.isArray(n.content)) visit(n.content);
    }
  };
  visit(tree.children ?? []);
  return out;
}

const kwargRe = (key) => new RegExp(`\\s*\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=(?:"[^"]*"|'[^']*'|[^\\s/>]+)`);

/** Set/replace `key=value` within a single `<config …>` source span; insert before the close if absent. */
function setKwargInSpan(span, key, value) {
  const re = kwargRe(key);
  if (re.test(span)) return span.replace(re, ` ${key}=${value}`);
  return span.replace(/\s*\/?>\s*$/, ` ${key}=${value} />`);
}

/** Remove `key=…` from a single `<config …>` source span (leaves `<config />` if it was the only kwarg). */
function removeKwargInSpan(span, key) {
  return span.replace(kwargRe(key), '');
}

/** Where to drop a fresh `<config>` when the document has none: on its own line after the `</meta>` region
 *  (the author-lens home for document metadata), else at the very top. */
function insertFreshConfig(source, key, value) {
  const line = `<config ${key}=${value} />`;
  const metaClose = source.indexOf('</meta>');
  if (metaClose !== -1) {
    const after = metaClose + '</meta>'.length;
    return source.slice(0, after) + `\n\n${line}` + source.slice(after);
  }
  return `${line}\n\n${source}`;
}

/**
 * Return `source` with the `<config>` kwarg `key` set to `value` (or REMOVED when `value` is null/''),
 * editing only the located node's span. When no <config> exists and a value is given, a fresh one is
 * inserted. Idempotent-safe: re-setting the same value is a no-op-shaped rewrite.
 *
 * @param {import('unified').Processor} proc - the pipeline (for `proc.parse` — the raw parse carries
 *   `<config>` as a positioned `enscribeTag` node).
 * @param {string} source - the .emd source.
 * @param {string} key - the config kwarg (e.g. 'theme', 'theme-variant').
 * @param {string|null} value - the new value, or null/'' to remove the kwarg.
 * @returns {string} the rewritten source (unchanged if there is nothing to do).
 */
export function editConfigKwarg(proc, source, key, value) {
  const remove = value == null || value === '';
  const configs = collectConfigNodes(proc.parse(source));
  if (configs.length === 0) return remove ? source : insertFreshConfig(source, key, value);

  const has = (node) => kwargRe(key).test(source.slice(node.position.start.offset, node.position.end.offset));
  // Prefer the LAST config carrying the key (config-discovery's last-wins semantics); else, to SET, the
  // last config; to REMOVE, nothing to do if none carries it.
  const carriers = configs.filter(has);
  const node = carriers.length ? carriers[carriers.length - 1] : (remove ? null : configs[configs.length - 1]);
  if (!node) return source; // removing a key no config has → nothing to do
  const s = node.position.start.offset, e = node.position.end.offset;
  const span = source.slice(s, e);
  const newSpan = remove ? removeKwargInSpan(span, key) : setKwargInSpan(span, key, value);
  return source.slice(0, s) + newSpan + source.slice(e);
}
