import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA_END, DATA_START, contents, metricDefinitions, products, questions, queryData, runSampleCheck, calculateMetrics } from '../src/data.mjs';

test('公开数据字典符合接口约束', () => {
  assert.match(DATA_START, /^2026-\d\d-\d\d$/);
  assert.match(DATA_END, /^2026-\d\d-\d\d$/);
  assert.ok(products.every((item) => item.id && item.name && item.shortName));
  assert.ok(contents.every((item) => ['card', 'geo', 'article'].includes(item.type)));
  assert.ok(questions.every((item) => item.id && item.title && item.category));
  assert.deepEqual(Object.keys(metricDefinitions[0]), ['key', 'label', 'unit', 'definition', 'exclusions']);
});

test('默认查询的总量守恒且趋势、渠道、内容可对账', () => {
  const result = queryData();
  assert.deepEqual(result.coverage, { start: DATA_START, end: DATA_END });
  assert.equal(result.channels.reduce((sum, item) => sum + item.value, 0), result.metrics.pv);
  assert.equal(result.trend.reduce((sum, item) => sum + item.pv, 0), result.metrics.pv);
  assert.equal(result.contentRows.reduce((sum, item) => sum + item.pv, 0), result.metrics.pv);
  assert.equal(result.contentRows.reduce((sum, item) => sum + item.shares, 0), result.metrics.shares);
  assert.equal(result.contentRows.reduce((sum, item) => sum + item.questions, 0), result.metrics.questions);
});

test('空集、无效日期和通用内容筛选安全返回', () => {
  const empty = queryData({ start: '2030-01-01', end: '2030-01-02' });
  assert.equal(empty.metrics.pv, 0);
  assert.equal(empty.metrics.archives, queryData().metrics.archives);
  assert.deepEqual(empty.comparison, { archives: 0, entries: null, pv: null, questions: null, shares: null });
  const invalid = queryData({ start: 'bad', end: '2026-09-09' });
  assert.deepEqual(invalid.coverage, { start: DATA_START, end: DATA_END });
  const common = queryData({ content: contents.find((item) => item.productId === null).id });
  assert.equal(common.metrics.archives, null);
});

test('产品与内容筛选会同步限制事件，且日期边界按北京时间闭开区间', () => {
  const product = products[0];
  const result = queryData({ product: product.id, start: '2026-09-09', end: '2026-09-09' });
  assert.ok(result.metrics.pv >= 0);
  assert.ok(result.productRows.every((row) => row.id === product.id));
  assert.ok(result.contentRows.every((row) => row.productId === product.id));
  assert.equal(result.coverage.start, '2026-09-09');
});

test('固定人工 fixture 覆盖重复、失败、跨日 UV、分享和时区边界', () => {
  const check = runSampleCheck();
  assert.equal(check.passed, true, JSON.stringify(check.checks));
  assert.ok(check.checks.length >= 6);
  assert.ok(check.sampleEvents.some((item) => item.type === 'question_failed'));
});

test('同产品的两篇内容共用档案范围，产品列表严格跟随内容', () => {
  const first=queryData({content:'c1'}), second=queryData({content:'c2'});
  assert.equal(second.metrics.archives,first.metrics.archives);
  assert.ok(second.metrics.archives>0);
  assert.deepEqual(second.productRows.map(p=>p.id),['p1']);
  assert.deepEqual(queryData({content:'missing'}).productRows,[]);
});

test('核对事件的说明可以直接供页面阅读',()=>{
  assert.ok(runSampleCheck().sampleEvents.every(e=>typeof e.detail==='string'));
});

test('跨日请求重复只归入首次成功日，日趋势与总数守恒',()=>{
  const events=[
    {id:'a',date:'2026-09-01T00:00:00+08:00',type:'question',contentId:'c1',requestId:'r1',questionId:'q1'},
    {id:'b',date:'2026-09-02T00:00:00+08:00',type:'question',contentId:'c2',requestId:'r1',questionId:'q1'},
    {id:'c',date:'2026-09-02T01:00:00+08:00',type:'question',contentId:'c2',requestId:'r2',questionId:'q2',status:'failed'},
  ];
  const result=calculateMetrics(events,{start:'2026-09-01',end:'2026-09-02'});
  assert.equal(result.metrics.questions,1);
  assert.deepEqual(result.trend.map(d=>d.questions),[1,0]);
  assert.equal(result.contentRows.reduce((s,c)=>s+c.questions,0),1);
});

test('北京时间边界、事件重复、机器人及失败流量被正确处理',()=>{
  const base={type:'pageview',visitor:'A',contentId:'c1',source:'qr'};
  const events=[
    {...base,id:'before',date:'2026-09-01T15:59:59Z'},
    {...base,id:'start',date:'2026-09-01T16:00:00Z'},
    {...base,id:'start',date:'2026-09-01T16:00:00Z'},
    {...base,id:'bot',date:'2026-09-02T08:00:00Z',bot:true},
    {...base,id:'failed',date:'2026-09-02T08:00:00Z',status:'failed'},
    {...base,id:'end',date:'2026-09-02T16:00:00Z'},
  ];
  const result=calculateMetrics(events,{start:'2026-09-02',end:'2026-09-02'});
  assert.equal(result.metrics.pv,1);assert.equal(result.metrics.uv,1);
  assert.equal(result.trend[0].pv,1);
});

test('同比例为百分比数值，零基数显示无可比数据',()=>{
  const source=[
    {id:'before',type:'pageview',contentId:'c1',date:'2026-09-01T00:00:00+08:00'},
    {id:'a',type:'pageview',contentId:'c1',date:'2026-09-02T00:00:00+08:00'},
    {id:'b',type:'pageview',contentId:'c1',date:'2026-09-02T01:00:00+08:00'},
  ];
  assert.equal(calculateMetrics(source,{start:'2026-09-02',end:'2026-09-02'}).comparison.pv,100);
  assert.equal(calculateMetrics(source,{start:'2026-09-01',end:'2026-09-01'}).comparison.pv,null);
});
