import assert from 'node:assert/strict';
import { createRegistry, ensureRegistry } from 'enscribe-core/registry';

export function run() {
  // --- assign is record-only; numberRegistry fills numbers ---
  {
    const r = createRegistry();
    const e = r.assign('note', null);
    assert.equal(e.number, undefined, 'number is undefined before numberRegistry()');
    r.numberRegistry();
    assert.equal(e.number, 1, 'numberRegistry fills in number');
    console.log('PASS: registry: assign is record-only; numberRegistry fills numbers');
  }

  // --- assign generates sequential numbers per type ---
  {
    const r = createRegistry();
    const e1 = r.assign('note', null);
    const e2 = r.assign('note', null);
    const e3 = r.assign('note', null);
    r.numberRegistry();
    assert.equal(e1.number, 1);
    assert.equal(e2.number, 2);
    assert.equal(e3.number, 3);
    console.log('PASS: registry: assign generates sequential numbers');
  }

  // --- different types have independent sequences ---
  {
    const r = createRegistry();
    const n1 = r.assign('note', null);
    const f1 = r.assign('figure', null);
    const n2 = r.assign('note', null);
    const f2 = r.assign('figure', null);
    r.numberRegistry();
    assert.equal(n1.number, 1);
    assert.equal(n2.number, 2);
    assert.equal(f1.number, 1);
    assert.equal(f2.number, 2);
    console.log('PASS: registry: different types have independent sequences');
  }

  // --- auto-generated ids follow ${type}-${sequence} ---
  {
    const r = createRegistry();
    const e1 = r.assign('note', null);
    const e2 = r.assign('note', null);
    assert.equal(e1.id, 'note-1');
    assert.equal(e2.id, 'note-2');
    console.log('PASS: registry: auto-generated ids follow ${type}-${sequence}');
  }

  // --- author-provided ids are preserved ---
  {
    const r = createRegistry();
    const e = r.assign('note', 'note:important', { data: { placement: 'end' } });
    assert.equal(e.id, 'note:important');
    r.numberRegistry();
    assert.equal(e.number, 1);
    console.log('PASS: registry: author-provided ids are preserved');
  }

  // --- lookup by id returns the entry ---
  {
    const r = createRegistry();
    r.assign('note', null, { data: { placement: 'end' } });
    r.assign('note', 'note:custom', { data: { placement: 'foot' } });
    r.numberRegistry();
    const found = r.lookup('note', 'note:custom');
    assert.ok(found !== null, 'lookup found the entry');
    assert.equal(found.id, 'note:custom');
    assert.equal(found.number, 2);
    assert.deepEqual(found.data, { placement: 'foot' });
    console.log('PASS: registry: lookup returns assigned entry');
  }

  // --- lookup of unknown id returns null ---
  {
    const r = createRegistry();
    r.assign('note', null);
    assert.equal(r.lookup('note', 'not-there'), null);
    assert.equal(r.lookup('equation', 'eq:1'), null);
    console.log('PASS: registry: lookup of unknown id returns null');
  }

  // --- lookup of unknown type returns null ---
  {
    const r = createRegistry();
    assert.equal(r.lookup('figure', 'fig-1'), null);
    console.log('PASS: registry: lookup of unknown type returns null');
  }

  // --- entries returns assignment-order list ---
  {
    const r = createRegistry();
    r.assign('note', null, { data: { placement: 'end' } });
    r.assign('note', 'note:custom', { data: { placement: 'side' } });
    r.assign('note', null, { data: { placement: 'foot' } });
    r.numberRegistry();
    const list = r.entries('note');
    assert.equal(list.length, 3);
    assert.equal(list[0].id, 'note-1');
    assert.equal(list[1].id, 'note:custom');
    assert.equal(list[2].id, 'note-3');
    assert.equal(list[0].number, 1);
    assert.equal(list[1].number, 2);
    assert.equal(list[2].number, 3);
    console.log('PASS: registry: entries returns assignment-order list');
  }

  // --- entries of unknown type returns empty array ---
  {
    const r = createRegistry();
    assert.deepEqual(r.entries('figure'), []);
    console.log('PASS: registry: entries of unknown type returns empty array');
  }

  // --- reset clears all state ---
  {
    const r = createRegistry();
    r.assign('note', null);
    r.assign('figure', null);
    r.reset();
    assert.deepEqual(r.entries('note'), []);
    assert.deepEqual(r.entries('figure'), []);
    const e = r.assign('note', null);
    r.numberRegistry();
    assert.equal(e.number, 1, 'counter restarted after reset');
    console.log('PASS: registry: reset clears all state and restarts counters');
  }

  // --- data payload is stored and retrievable ---
  {
    const r = createRegistry();
    const data = { placement: 'end', content: [{ type: 'text', value: 'hello' }] };
    r.assign('note', 'my-note', { data });
    const found = r.lookup('note', 'my-note');
    assert.deepEqual(found.data, data);
    console.log('PASS: registry: data payload stored and retrievable');
  }

  // --- entry shape includes type field ---
  {
    const r = createRegistry();
    const e = r.assign('equation', 'eqn:newton');
    assert.equal(e.type, 'equation', 'entry.type is set to registry type');
    assert.equal(e.numbered, true, 'entry.numbered defaults to true');
    console.log('PASS: registry: entry shape includes type and numbered fields');
  }

  // --- numbered=false: number is null after numberRegistry, counter does not advance ---
  {
    const r = createRegistry();
    const e1 = r.assign('equation', 'eqn:numbered');
    const e2 = r.assign('equation', 'eqn:unlabeled', { numbered: false });
    const e3 = r.assign('equation', 'eqn:next');
    r.numberRegistry();
    assert.equal(e1.number, 1, 'first numbered equation is 1');
    assert.equal(e2.number, null, 'unnumbered equation has null number');
    assert.equal(e2.numbered, false, 'unnumbered entry has numbered:false');
    assert.equal(e3.number, 2, 'next numbered equation is 2, skipping unnumbered');
    console.log('PASS: registry: numbered=false skips the counter');
  }

  // --- colon-ids are indexed in the label index ---
  {
    const r = createRegistry();
    r.assign('equation', 'eqn:newton');
    r.assign('figure', 'fig:scatter');
    r.assign('note', null);  // auto-id note-1 (no colon, not indexed)
    r.numberRegistry();

    const eqn = r.findByLabel('eqn:newton');
    assert.ok(eqn !== null, 'eqn:newton found in label index');
    assert.equal(eqn.type, 'equation');
    assert.equal(eqn.number, 1);

    const fig = r.findByLabel('fig:scatter');
    assert.ok(fig !== null, 'fig:scatter found in label index');
    assert.equal(fig.type, 'figure');

    assert.equal(r.findByLabel('note-1'), null, 'auto-id without colon not indexed');
    assert.equal(r.findByLabel('eqn:missing'), null, 'missing label returns null');
    console.log('PASS: registry: colon-ids indexed in label index, non-colon ids are not');
  }

  // --- label index is cleared by reset ---
  {
    const r = createRegistry();
    r.assign('equation', 'eqn:newton');
    assert.ok(r.findByLabel('eqn:newton') !== null, 'present before reset');
    r.reset();
    assert.equal(r.findByLabel('eqn:newton'), null, 'absent after reset');
    console.log('PASS: registry: label index cleared by reset');
  }

  // --- ensureRegistry returns transient registry for null file ---
  {
    const r = ensureRegistry(null);
    assert.ok(r, 'ensureRegistry(null) returns a registry');
    r.assign('equation', 'eqn:test');
    assert.ok(r.findByLabel('eqn:test') !== null, 'transient registry works');
    console.log('PASS: registry: ensureRegistry(null) returns transient registry');
  }

  // --- ensureRegistry attaches and reuses registry on file.data ---
  {
    const file = { data: {} };
    const r1 = ensureRegistry(file);
    r1.assign('equation', 'eqn:a');
    const r2 = ensureRegistry(file);
    assert.equal(r1, r2, 'same registry returned on second call');
    assert.ok(r2.findByLabel('eqn:a') !== null, 'state shared across calls');
    console.log('PASS: registry: ensureRegistry reuses registry on file.data');
  }
}
