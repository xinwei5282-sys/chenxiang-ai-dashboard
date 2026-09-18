import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.mjs';

const initial = { products: [{ archives: 640, views: 10798 }, { archives: 420, views: 5036 }, { archives: 280, views: 2644 }], batches: 186, ai: 2725, processing: 32, trace: 11772 };
const fixed = () => 0.5;

test('初始快照深拷贝且零推进无变化', () => {
  const sim = createSimulation({ random: fixed, now: 1_000 });
  const snap = sim.snapshot();
  assert.deepEqual(snap, initial);
  snap.products[0].archives = 0;
  assert.deepEqual(sim.snapshot(), initial);
  assert.deepEqual(sim.advance(0), { snapshot: initial, events: [] });
});

test('拒绝负数、NaN 和 Infinity', () => {
  const sim = createSimulation();
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => sim.advance(value), /deltaMs/);
  }
});

test('多步推进与单步推进结果一致，事件时间单调且对应增量', () => {
  const one = createSimulation({ random: fixed, now: 10_000 });
  const many = createSimulation({ random: fixed, now: 10_000 });
  const all = one.advance(120_000);
  const events = [...many.advance(30_000).events, ...many.advance(90_000).events];
  assert.deepEqual(many.snapshot(), all.snapshot);
  assert.deepEqual(events, all.events);
  assert.ok(all.events.length > 0);
  assert.ok(all.events.every((event) => event.timestamp >= 10_000 && event.timestamp <= 130_000));
  assert.ok(all.events.every((event) => ['正常', '提示'].includes(event.status)));
  assert.ok(all.events.every((event) => event.kind && event.title && event.note.length <= 11));
});

test('快慢更新都保持非负、产品合计一致，长时间运行数值安全', () => {
  const sim = createSimulation({ random: fixed, now: 0 });
  const result = sim.advance(8 * 60 * 60 * 1000);
  const snap = result.snapshot;
  assert.equal(snap.products.reduce((sum, product) => sum + product.archives, 0), 3260);
  assert.equal(snap.products[1].archives,2340);
  assert.equal(snap.ai,12325);
  assert.equal(snap.batches,906);
  assert.equal(snap.processing,1472);
  assert.equal(snap.trace,16780);
  assert.equal(snap.products[1].views,29720);
  assert.ok(Object.values(snap).filter((v) => typeof v === 'number').every((v) => Number.isSafeInteger(v) && v >= 0));
  assert.ok(snap.products.every((p, index) => p.archives >= initial.products[index].archives && p.views >= initial.products[index].views));
  assert.ok(result.events.some((event) => event.kind === 'trace'));
  assert.ok(result.events.some((event) => event.kind === 'processing'));
  assert.ok(result.events.some((event) => event.kind === 'archive'));
  assert.ok(result.events.some((event) => event.kind === 'batch'));
});

test('快速活动先更新，慢速业务事件与档案和批次增量对应', () => {
  const sim=createSimulation({random:fixed,now:0});
  const fast=sim.advance(7000);
  assert.equal(fast.snapshot.products[1].views,5042);
  assert.equal(fast.snapshot.ai,2727);
  assert.equal(fast.snapshot.products[1].archives,420);
  assert.equal(fast.snapshot.batches,186);
  assert.equal(fast.events.length,0);
  const later=sim.advance(33000);
  assert.equal(later.snapshot.products[1].archives,422);
  assert.equal(later.snapshot.batches,187);
  assert.equal(later.events.filter(e=>e.kind==='archive').length,1);
  assert.equal(later.events.filter(e=>e.kind==='batch').length,1);
});
