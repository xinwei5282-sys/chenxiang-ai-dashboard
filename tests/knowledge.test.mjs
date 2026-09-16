import test from 'node:test';
import assert from 'node:assert/strict';
import { queryKnowledge, calculateKnowledge } from '../src/knowledge.mjs';
import { queryData } from '../src/data.mjs';

test('知识资产截止日快照、分类与状态合计一致，更新按条目去重',()=>{
  const knowledge=[
    {id:'a',title:'养护',category:'care',productId:'p1',sourceIds:['s1'],createdAt:'2026-08-01T00:00:00+08:00'},
    {id:'b',title:'文化',category:'culture',productId:null,sourceIds:['s1','s2'],createdAt:'2026-09-03T00:00:00+08:00'},
  ];
  const events=[
    {id:'e1',knowledgeId:'a',at:'2026-08-02T00:00:00+08:00',type:'publish',version:1},
    {id:'e2',knowledgeId:'a',at:'2026-09-01T16:00:00Z',type:'revise',version:2},
    {id:'e3',knowledgeId:'a',at:'2026-09-02T12:00:00+08:00',type:'revise',version:3},
    {id:'e3',knowledgeId:'a',at:'2026-09-02T12:00:00+08:00',type:'revise',version:3},
    {id:'e4',knowledgeId:'a',at:'2026-09-03T00:00:00+08:00',type:'retire',version:3},
  ];
  const sources=[{id:'s1',title:'养护手册',createdAt:'2026-08-01T00:00:00+08:00'},{id:'s2',title:'文化资料',createdAt:'2026-09-03T00:00:00+08:00'}];
  const result=calculateKnowledge({knowledge,events,sources},{start:'2026-09-02',end:'2026-09-02'});
  assert.equal(result.metrics.published,1);assert.equal(result.metrics.updated,1);assert.equal(result.metrics.sources,1);
  assert.equal(result.metrics.total,1);assert.equal(result.updates.length,2);
  assert.equal(result.categories.reduce((s,c)=>s+c.count,0),result.metrics.total);
  assert.equal(result.statuses.reduce((s,c)=>s+c.count,0),result.metrics.total);
  assert.equal(calculateKnowledge({knowledge,events,sources},{start:'2026-09-03',end:'2026-09-03',product:'p1'}).metrics.published,0);
});

test('样例知识库支持产品范围、空范围和期间更新筛选',()=>{
  const all=queryKnowledge(),product=queryKnowledge({product:'p1'}),week=queryKnowledge({start:'2026-09-03',end:'2026-09-09'});
  assert.ok(all.metrics.total>product.metrics.total);assert.ok(product.metrics.total>0);
  assert.equal(all.metrics.published,week.metrics.published);
  assert.ok(all.metrics.updated>=week.metrics.updated);
  assert.equal(queryKnowledge({product:'missing'}).metrics.total,0);
  assert.equal(all.categories.reduce((s,c)=>s+c.count,0),all.metrics.total);
  assert.equal(all.statuses.reduce((s,c)=>s+c.count,0),all.metrics.total);
});

test('知识检索命中与未命中合计等于检索请求，不冒充回答正确率',()=>{
  const d=queryData();
  assert.equal(d.knowledgeUsage.hits+d.knowledgeUsage.misses,d.knowledgeUsage.attempts);
  assert.ok(d.knowledgeUsage.attempts<=d.metrics.questions);
  assert.equal(d.knowledgeUsage.gaps.reduce((s,q)=>s+q.count,0),d.knowledgeUsage.misses);
  assert.equal(queryData({product:'missing'}).knowledgeUsage.hitRate,null);
});
