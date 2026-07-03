// The handler registry — the host/role axis (#341).
//
// HANDLER_REGISTRY maps a vocab tag's `handler_module` id → the handler function
// that turns that tag into output ("which function renders a <table> / <theorem> /
// <figure>"). It answers the host/ROLE question and is a SEPARATE table from the
// DSL/processor registry (the language axis, interpreter/dsl/registry.js): the two
// share the record→derived-Map pattern but are disjoint lookups (see
// notes/specs/registries.md and DESIGN.md's host/language model). They are NOT merged.
//
// SINGLE SOURCE. Each handler has one registration record — its `handlerModule` id
// (the vocab key that dispatches to it) paired with its handler function — and
// HANDLER_REGISTRY is DERIVED from those, so the registry keys are no longer a
// hand-written Map literal that must be co-edited to match the vocab. The vocab
// `handler_module` values (ehtml/elements/*.md) and these ids share this
// source of truth, kept honest by the load-time guard (registries-guard.js): every
// `interpreter_strategy: handler` vocab element must resolve to exactly one entry
// here, and every entry must be claimed by ≥1 vocab element.
//
// NOTE: the plugin-created internal nodes (__ref-marker, __note-list, __bibliography,
// …) are dispatched by a DIFFERENT table, INTERNAL_REGISTRY in interpret-plugin.js;
// they have no vocab entry and are outside this registry.

import { aHandler } from './handlers/a.js';
import { figureHandler } from './handlers/figure.js';
import { mathHandler } from './handlers/math.js';
import { codeHandler } from './handlers/code.js';
import { codeBlockHandler } from './handlers/code-block.js';
import { inlineCodeHandler } from './handlers/inline-code.js';
import { tableHandler } from './handlers/table.js';
// `<csv>` / `<tsv>` retired to gate shorthands → `<table csv>` / `<table tsv>`
// (#22 slice 3); the table handler parses both via its format positional, so no
// standalone csv/tsv handler is dispatched.
// `<diagram>` host (#22 slice 3): the diagram handler delegates to the per-engine
// mermaid/abc render handlers by the format-word positional. The legacy
// <mermaid>/<abc> tags are now gate shorthands → <diagram mermaid|abc>, so no
// mermaid/abc tagname reaches this dispatcher — only `diagram`.
import { diagramHandler } from './handlers/diagram.js';
import { svgHandler } from './handlers/svg.js';
import { frameHandler } from './handlers/frame.js';
import { asideHandler } from './handlers/aside.js';
import { minipageHandler } from './handlers/minipage.js';
import { theoremFamilyHandler } from './handlers/theorem.js';

// One registration record per handler: `handlerModule` (the id declared by the
// vocab entries in `ehtml/elements/<tag>.md`) → `handler` (the fn).
export const HANDLER_REGISTRATIONS = [
  { handlerModule: './handlers/a.js', handler: aHandler },
  { handlerModule: './handlers/figure.js', handler: figureHandler },
  { handlerModule: './handlers/math.js', handler: mathHandler },
  { handlerModule: './handlers/code.js', handler: codeHandler },
  { handlerModule: './handlers/code-block.js', handler: codeBlockHandler },
  { handlerModule: './handlers/inline-code.js', handler: inlineCodeHandler },
  { handlerModule: './handlers/table.js', handler: tableHandler },
  { handlerModule: './handlers/diagram.js', handler: diagramHandler },
  { handlerModule: './handlers/svg.js', handler: svgHandler },
  { handlerModule: './handlers/frame.js', handler: frameHandler },
  { handlerModule: './handlers/aside.js', handler: asideHandler },
  { handlerModule: './handlers/minipage.js', handler: minipageHandler },
  { handlerModule: './handlers/theorem.js', handler: theoremFamilyHandler },
];

/**
 * The runtime handler-dispatch table: `handler_module` id → handler function.
 * Derived from HANDLER_REGISTRATIONS; consumed via `HANDLER_REGISTRY.get(...)` in
 * interpret-plugin.js (that accessor is unchanged).
 */
export const HANDLER_REGISTRY = new Map(
  HANDLER_REGISTRATIONS.map((r) => [r.handlerModule, r.handler]),
);
