// Load-time consistency guard for the two registries (#341).
//
// One mechanism, both registries — mirroring the single-source guards
// (spec-data.test.js, coverage-fresh.test.js, check-data-fresh.js). It turns
// "one place to edit" from a convention into a checked structural guarantee, so
// the derived DSL indices and the handler registry can never drift from their
// registration sources or from the vocabulary. See notes/specs/registries.md
// §"The load-time consistency guard".
//
//   DSL registry     — every registration seed is present across each index it
//                      derives (LANGUAGES, DSL_REGISTRY, its host accept-set), and
//                      no index entry is an orphan (every derived entry is backed
//                      by a seed).
//   Handler registry — every vocab element with `interpreter_strategy: handler`
//                      resolves to exactly one HANDLER_REGISTRY entry (and, via the
//                      registration import, one handler file), and every registry
//                      entry is claimed by ≥1 such vocab element. This assertion
//                      catches the ref/cite drift (a declared handler_module with
//                      no registry entry) automatically.

import assert from 'node:assert/strict';
import { VOCABULARY } from '@enscribejs/ehtml';
import { DSL_REGISTRATIONS } from '../src/core/dsl-registrations.js';
import { getContentHandler } from '../src/core/dsl-registry.js';
import { getDsl, getRegisteredDsls } from '../src/interpreter/dsl/registry.js';
import { hostAcceptsLanguage } from '../src/interpreter/lib/host-accept-sets.js';
import { HANDLER_REGISTRY, HANDLER_REGISTRATIONS } from '../src/interpreter/handler-registrations.js';

export function run() {
  // ── DSL registry: each seed consistent across its indices; no orphan ─────────
  const seedNames = new Set(DSL_REGISTRATIONS.map((s) => s.name));
  for (const seed of DSL_REGISTRATIONS) {
    assert.notEqual(
      getContentHandler(seed.name),
      'default',
      `registries guard: DSL '${seed.name}' has no LANGUAGES entry (parse-time opacity would be lost)`,
    );
    if (seed.view) {
      assert.ok(
        getDsl(seed.name),
        `registries guard: DSL '${seed.name}' declares a view but has no DSL_REGISTRY record`,
      );
    }
    assert.ok(
      hostAcceptsLanguage(seed.host, seed.name),
      `registries guard: DSL '${seed.name}' is not in its host '${seed.host}' accept-set`,
    );
  }
  // No orphan DSL_REGISTRY record — every one is backed by a seed.
  for (const dsl of getRegisteredDsls()) {
    assert.ok(
      seedNames.has(dsl.name),
      `registries guard: orphan DSL_REGISTRY record '${dsl.name}' with no registration seed`,
    );
  }

  // ── Handler registry: vocab handler_module ⇄ HANDLER_REGISTRY, both ways ─────
  const claimed = new Set();
  for (const [tag, vocab] of Object.entries(VOCABULARY)) {
    if (!vocab || vocab.interpreter_strategy !== 'handler') continue;
    const mod = vocab.handler_module;
    assert.ok(
      mod && HANDLER_REGISTRY.has(mod),
      `registries guard: vocab <${tag}> declares handler_module '${mod}' with no HANDLER_REGISTRY entry ` +
        `(its real dispatch is elsewhere — fix the vocab frontmatter, or register the handler)`,
    );
    claimed.add(mod);
  }
  for (const { handlerModule } of HANDLER_REGISTRATIONS) {
    assert.ok(
      claimed.has(handlerModule),
      `registries guard: HANDLER_REGISTRY entry '${handlerModule}' is claimed by no vocab element`,
    );
  }

  console.log(
    `PASS: registries guard — ${DSL_REGISTRATIONS.length} DSL seeds consistent across LANGUAGES/DSL_REGISTRY/accept-sets; ` +
      `${HANDLER_REGISTRATIONS.length} handler entries ⇄ vocab handler_module`,
  );
}

// Allow direct invocation (used to demonstrate the guard fires).
if (process.argv[1] && process.argv[1].endsWith('registries-guard.test.js')) run();
