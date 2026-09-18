const INITIAL = {
  products: [{ archives: 640, views: 10798 }, { archives: 420, views: 5036 }, { archives: 280, views: 2644 }],
  batches: 186,
  ai: 2725,
  processing: 32,
  trace: 11772,
};

const TIMERS = [
  { kind: 'views', min: 2_000, max: 5_000 },
  { kind: 'ai', min: 4_000, max: 8_000 },
  { kind: 'trace', min: 8_000, max: 15_000 },
  { kind: 'processing', min: 15_000, max: 25_000 },
  { kind: 'archive', min: 20_000, max: 40_000 },
  { kind: 'batch', min: 30_000, max: 50_000 },
];

const copy = (value) => structuredClone(value);
const integerBetween = (random, min, max) => min + Math.floor(Math.max(0, Math.min(0.999999999, random())) * (max - min + 1));
const increment = (random, min, max) => integerBetween(random, min, max);

export function createSimulation({ random = Math.random, now = Date.now() } = {}) {
  if (typeof random !== 'function' || !Number.isFinite(now)) throw new TypeError('random and now are required');
  const state = copy(INITIAL);
  let elapsed = 0;
  const timers = TIMERS.map((timer) => ({ ...timer, due: integerBetween(random, timer.min, timer.max) }));

  function eventFor(timer, timestamp) {
    let title;
    let note;
    const status = '正常';
    if (timer.kind === 'trace') {
      const amount = increment(random, 1, 3);
      state.trace += amount;
      title = '流通追踪'; note = `新增${amount}条溯源记录`;
    } else if (timer.kind === 'processing') {
      state.processing += 1;
      title = '生产加工'; note = '完成1项加工任务';
    } else if (timer.kind === 'archive') {
      const product = state.products[Math.floor(Math.max(0, Math.min(0.999999999, random())) * state.products.length)];
      const amount = increment(random, 1, 2);
      product.archives += amount;
      title = '产品档案'; note = `新增${amount}份产品档案`;
    } else if (timer.kind === 'batch') {
      state.batches += 1;
      title = '原料入库'; note = '新增1个原料批次';
    } else if (timer.kind === 'views') {
      const product = state.products[Math.floor(Math.max(0, Math.min(0.999999999, random())) * state.products.length)];
      product.views += increment(random, 1, 5);
      return null;
    } else if (timer.kind === 'ai') {
      state.ai += increment(random, 1, 3);
      return null;
    }
    return { kind: timer.kind, status, title, note, timestamp: now + timestamp };
  }

  return {
    snapshot: () => copy(state),
    advance(deltaMs) {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('deltaMs must be a finite non-negative number');
      const target = elapsed + deltaMs;
      const events = [];
      while (true) {
        let next = null;
        for (const timer of timers) if (timer.due <= target && (!next || timer.due < next.due)) next = timer;
        if (!next) break;
        const timestamp = next.due;
        const event = eventFor(next, timestamp);
        if (event) events.push(event);
        next.due += integerBetween(random, next.min, next.max);
      }
      elapsed = target;
      return { snapshot: copy(state), events };
    },
  };
}
