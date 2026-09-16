export const DATA_START = '2026-08-11';
export const DATA_END = '2026-09-09';

export const products = [
  { id: 'p1', name: '广垦沉香·海南尖峰岭', shortName: '尖峰岭' },
  { id: 'p2', name: '广垦沉香·鉴真溯源款', shortName: '鉴真款' },
  { id: 'p3', name: '广垦沉香·惠农礼盒', shortName: '惠农礼盒' },
];
export const contents = [
  { id: 'c1', name: '数字生命卡｜尖峰岭', type: 'card', productId: 'p1' },
  { id: 'c2', name: 'GEO 溯源页｜尖峰岭', type: 'geo', productId: 'p1' },
  { id: 'c3', name: '鉴真数字生命卡', type: 'card', productId: 'p2' },
  { id: 'c4', name: '惠农礼盒故事', type: 'article', productId: 'p3' },
  { id: 'c5', name: '广垦沉香知识库', type: 'geo', productId: null },
];
export const questions = [
  { id: 'q1', title: '如何辨别沉香真伪？', category: '鉴别' },
  { id: 'q2', title: '沉香的产地和树龄是什么？', category: '溯源' },
  { id: 'q3', title: '沉香应该如何保存？', category: '养护' },
  { id: 'q4', title: '沉香可以怎样使用？', category: '使用' },
  { id: 'q5', title: '购买后如何验证数字档案？', category: '验证' },
  { id: 'q6', title: '沉香礼盒适合哪些场景？', category: '礼赠' },
];
export const metricDefinitions = [
  { key: 'archives', label: '产品档案数', unit: '个', definition: '截至筛选结束日已发布且与筛选产品关联的去重单品档案数', exclusions: '未发布档案、重复单品、通用内容不适用' },
  { key: 'entries', label: '入口到达', unit: '次', definition: '扫码或 NFC 成功打开入口页的事件数', exclusions: '硬件读取失败、重复上报、不可达事件' },
  { key: 'nfc', label: 'NFC 到达', unit: '次', definition: 'source=nfc 的成功入口到达', exclusions: '仅读取未成功打开' },
  { key: 'qr', label: '扫码到达', unit: '次', definition: 'source=qr 的成功入口到达', exclusions: '扫码失败' },
  { key: 'pv', label: '页面访问', unit: '次', definition: '页面访问事件数，按来源互斥归因', exclusions: '机器人、失败请求、重复重放' },
  { key: 'uv', label: '访客数', unit: '人', definition: '筛选区间内匿名 visitor 去重数', exclusions: '跨天不可相加、无 visitor 的事件' },
  { key: 'questions', label: '问答次数', unit: '次', definition: '按 request_id 去重的成功问题请求，含追问', exclusions: '失败请求、无 request_id' },
  { key: 'shares', label: '内容分享', unit: '次', definition: '分享触发事件数', exclusions: '送达成功回执、失败事件不计入触发' },
  { key: 'hotQuestions', label: '热门问题', unit: '次 / 占比', definition: '成功问题按规范 question_id 聚合并按次数降序排列；占比=该类次数÷有效问答总数', exclusions: '失败问答、重复请求；不展示个人提问原文' },
  { key: 'shareRate', label: '分享触发率', unit: '%', definition: '同一内容、同一筛选范围内分享触发次数÷页面PV×100%', exclusions: 'PV为零显示不适用；不是分享成功率或转化率' },
];

const DAY = 86400000;
const iso = ms => new Date(ms + 8 * 3600000).toISOString().slice(0,10);
const dateMs = date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const ms=Date.parse(`${date}T00:00:00+08:00`);
  return Number.isFinite(ms) && iso(ms)===date ? ms : null;
};
const HISTORY_START='2026-07-12';
const clampRange=(start,end)=>dateMs(start)==null || dateMs(end)==null || start>end || (dateMs(end)-dateMs(start))/DAY>366 ? {start:DATA_START,end:DATA_END} : {start,end};
const contentMap=new Map(contents.map(c=>[c.id,c]));
let randomState=92571;
const random=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return (randomState>>>0)/4294967296;};
const choose=(values,weights)=>{const n=random();let cumulative=0;return values[weights.findIndex(w=>(cumulative+=w)>n)] || values.at(-1);};
const events=[];
for(let day=0;day<60;day++) {
  const ms=dateMs(HISTORY_START)+day*DAY;
  const volume=Math.round(340+day*5+Math.sin(day*1.1)*75+random()*210);
  for(let j=0;j<volume;j++) {
    const content=choose(contents,[.37,.17,.25,.13,.08]);
    const source=choose(['nfc','qr','share','geo','direct'],[.39,.24,.16,.12,.09]);
    const date=new Date(ms+Math.floor(random()*(DAY-10000))).toISOString();
    const visitor=`anon-${Math.floor(random()*4700)}`;
    const base={date,visitor,contentId:content.id,source,bot:j%233===0,status:'ok'};
    const page={...base,id:`pv-${day}-${j}`,type:'pageview'};
    events.push(page);
    if(j%101===0) events.push({...page}); // Delivery retry, same id.
    if(content.productId && ['nfc','qr'].includes(source)) events.push({...base,id:`entry-${day}-${j}`,type:'entry'});
    if(random()<.073) events.push({...base,id:`share-${day}-${j}`,type:'share'});
    if(random()<.139) {
      const q=choose(questions,[.29,.20,.19,.14,.11,.07]);
      const question={...base,id:`ask-${day}-${j}`,type:'question',requestId:`req-${day}-${j}`,questionId:q.id,status:random()<.026?'failed':'ok',retrievalAttempted:j%17!==0,knowledgeHit:j%17!==0&&j%11!==0};
      events.push(question);
      if(j%31===0) events.push({...question,id:`retry-${day}-${j}`});
    }
  }
}
for(const [index,product] of products.entries()) {
  const count=[640,420,280][index];
  for(let n=0;n<count;n++) events.push({id:`a-${product.id}-${n}`,type:'archive',archiveId:`${product.id}-${n}`,productId:product.id,published:true,date:new Date(dateMs(HISTORY_START)+Math.floor(n/count*58)*DAY).toISOString()});
}

// Normalize once before slicing into days, contents or comparison periods.
function normalize(source) {
  const ids=new Set(),requests=new Set();
  return [...source].filter(e=>e.id && Number.isFinite(Date.parse(e.date)) && !e.bot && !e.test && e.status!=='failed' && e.type!=='question_failed')
    .sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))
    .filter(e=>{
      if(ids.has(e.id)) return false; ids.add(e.id);
      if(e.type==='question') {
        if(!e.requestId || requests.has(e.requestId)) return false;
        requests.add(e.requestId);
      }
      return e.type!=='archive' || e.published===true;
    }).map(e=>({...e,ms:Date.parse(e.date),day:iso(Date.parse(e.date))}));
}
function aggregate(list) {
  const pvEvents=list.filter(e=>e.type==='pageview');
  const entries=list.filter(e=>e.type==='entry' && ['nfc','qr'].includes(e.source));
  return {pv:pvEvents.length,uv:new Set(pvEvents.map(e=>e.visitor).filter(Boolean)).size,entries:entries.length,nfc:entries.filter(e=>e.source==='nfc').length,qr:entries.filter(e=>e.source==='qr').length,questions:list.filter(e=>e.type==='question').length,shares:list.filter(e=>e.type==='share').length};
}
function queryNormalized(source,{start=DATA_START,end=DATA_END,product='all',content='all'}={}) {
  const range=clampRange(start,end),from=dateMs(range.start),to=dateMs(range.end)+DAY;
  const selected=contents.filter(c=>(product==='all'||c.productId===product)&&(content==='all'||c.id===content));
  const contentIds=new Set(selected.map(c=>c.id));
  const productIds=new Set(selected.map(c=>c.productId).filter(Boolean));
  const common=selected.length===1 && selected[0].productId===null;
  const archived=source.filter(e=>e.type==='archive'&&productIds.has(e.productId));
  const archiveCount=before=>new Set(archived.filter(e=>e.ms<before).map(e=>e.archiveId)).size;
  const relevant=source.filter(e=>e.type!=='archive'&&contentIds.has(e.contentId));
  const filtered=relevant.filter(e=>e.ms>=from&&e.ms<to);
  const a=aggregate(filtered),metrics={archives:common?null:archiveCount(to),...a};
  const priorFrom=from-(to-from),prior=aggregate(relevant.filter(e=>e.ms>=priorFrom&&e.ms<from));
  const priorComplete=priorFrom>=dateMs(HISTORY_START)&&from<=dateMs(DATA_END)+DAY;
  const comparison=Object.fromEntries(['archives','entries','pv','questions','shares'].map(key=>{
    const before=key==='archives'?(common?null:archiveCount(from)):prior[key];
    return [key,before==null||before===0||(key!=='archives'&&!priorComplete)?null:(metrics[key]-before)/before*100];
  }));
  const daily=new Map();for(const e of filtered){if(!daily.has(e.day))daily.set(e.day,[]);daily.get(e.day).push(e);}
  const trend=[];for(let t=from;t<to;t+=DAY){const date=iso(t),a=aggregate(daily.get(date)||[]);trend.push({date,pv:a.pv,entries:a.entries,questions:a.questions,shares:a.shares});}
  const labels={nfc:'NFC 碰触',qr:'扫码入口',share:'分享回流',geo:'GEO 引流',direct:'直接访问'};
  const channels=Object.entries(labels).map(([id,label])=>({id,label,value:filtered.filter(e=>e.type==='pageview'&&(e.source===id||(id==='direct'&&!Object.hasOwn(labels,e.source)))).length}));
  const contentRows=selected.map(c=>{const a=aggregate(filtered.filter(e=>e.contentId===c.id));return {...c,pv:a.pv,uv:a.uv,shares:a.shares,questions:a.questions,shareRate:a.pv?a.shares/a.pv:0};});
  const hotQuestions=questions.map(q=>{const count=filtered.filter(e=>e.type==='question'&&e.questionId===q.id).length;return {...q,count,ratio:a.questions?count/a.questions:0};}).filter(q=>q.count>0).sort((a,b)=>b.count-a.count);
  const productRows=products.filter(p=>productIds.has(p.id)).map(p=>{
    const a=aggregate(filtered.filter(e=>contentMap.get(e.contentId)?.productId===p.id));
    return {id:p.id,name:p.name,archives:new Set(archived.filter(e=>e.productId===p.id&&e.ms<to).map(e=>e.archiveId)).size,pv:a.pv,entries:a.entries,questions:a.questions,shares:a.shares};
  });
  const requests=filtered.filter(e=>e.type==='question'&&e.retrievalAttempted===true);
  const hits=requests.filter(e=>e.knowledgeHit===true).length;
  const gaps=questions.map(q=>({...q,count:requests.filter(e=>e.knowledgeHit!==true&&e.questionId===q.id).length})).filter(q=>q.count>0).sort((a,b)=>b.count-a.count);
  const knowledgeUsage={attempts:requests.length,hits,misses:requests.length-hits,hitRate:requests.length?hits/requests.length*100:null,gaps};
  return {metrics,comparison,trend,channels,contentRows,hotQuestions,productRows,knowledgeUsage,coverage:range};
}
const normalized=normalize(events);
export function queryData(filters={}) {return queryNormalized(normalized,filters);}
// Same normalization and query path as the dashboard; supplied events enable independent reconciliation.
export function calculateMetrics(source,filters={}) {return queryNormalized(normalize(source),filters);}

export function runSampleCheck() {
  const fixture=[
    {id:'ar1',type:'archive',archiveId:'item-1',productId:'p1',published:true,date:'2026-08-31T00:00:00+08:00',note:'已发布单品档案'},
    {id:'draft',type:'archive',archiveId:'item-2',productId:'p1',published:false,date:'2026-08-31T00:00:00+08:00',note:'草稿不计入档案'},
    {id:'pv-before',type:'pageview',visitor:'A',contentId:'c1',source:'qr',date:'2026-09-01T23:59:59+08:00',note:'前一日；跨日访问同一访客'},
    {id:'pv-start',type:'pageview',visitor:'A',contentId:'c1',source:'nfc',date:'2026-09-01T16:00:00Z',note:'UTC 16:00 = 北京时间次日00:00，计入9月2日'},
    {id:'pv-start',type:'pageview',visitor:'A',contentId:'c1',source:'nfc',date:'2026-09-01T16:00:00Z',note:'同event_id重传，不重复计数'},
    {id:'entry',type:'entry',visitor:'A',contentId:'c1',source:'nfc',date:'2026-09-02T00:00:00+08:00',note:'一次成功NFC入口到达'},
    {id:'pv-second',type:'pageview',visitor:'B',contentId:'c2',source:'geo',date:'2026-09-02T12:00:00+08:00',note:'另一个内容、另一位匿名访客'},
    {id:'bot',type:'pageview',visitor:'bot',contentId:'c1',source:'direct',bot:true,date:'2026-09-02T12:00:01+08:00',note:'机器人，排除'},
    {id:'failed-pv',type:'pageview',visitor:'C',contentId:'c1',status:'failed',date:'2026-09-02T12:00:02+08:00',note:'页面加载失败，排除'},
    {id:'ask',type:'question',visitor:'A',contentId:'c1',requestId:'request-1',questionId:'q1',date:'2026-09-02T13:00:00+08:00',note:'一次成功问题请求'},
    {id:'ask-retry',type:'question',visitor:'A',contentId:'c1',requestId:'request-1',questionId:'q1',date:'2026-09-03T00:00:01+08:00',note:'同request_id跨日重试，归入首次成功日'},
    {id:'ask-failed',type:'question_failed',visitor:'A',contentId:'c1',requestId:'request-2',questionId:'q2',date:'2026-09-02T13:01:00+08:00',note:'问答失败，不计成功问答'},
    {id:'share',type:'share',visitor:'A',contentId:'c1',date:'2026-09-02T14:00:00+08:00',note:'分享触发一次，不代表送达'},
    {id:'share',type:'share',visitor:'A',contentId:'c1',date:'2026-09-02T14:00:00+08:00',note:'分享事件重传，排除'},
    {id:'pv-end',type:'pageview',visitor:'C',contentId:'c1',source:'direct',date:'2026-09-02T16:00:00Z',note:'北京时间9月3日00:00，不计入9月2日'},
  ];
  const day=calculateMetrics(fixture,{start:'2026-09-02',end:'2026-09-02'});
  const two=calculateMetrics(fixture,{start:'2026-09-01',end:'2026-09-02'});
  const three=calculateMetrics(fixture,{start:'2026-09-01',end:'2026-09-03'});
  const scoped=calculateMetrics(fixture,{start:'2026-09-02',end:'2026-09-02',content:'c2'});
  const checks=[
    ['日界线 / 去重 / 无效PV排除',2,day.metrics.pv],
    ['成功问答与跨日请求去重',1,three.metrics.questions],
    ['三日趋势问答求和',1,three.trend.reduce((s,d)=>s+d.questions,0)],
    ['两日UV去重（每日UV之和为3）',2,two.metrics.uv],
    ['分享触发事件去重',1,day.metrics.shares],
    ['NFC入口独立计数',1,day.metrics.entries],
    ['内容c2仅计自身PV',1,scoped.metrics.pv],
    ['关联产品已发布档案去重',1,scoped.metrics.archives],
    ['页面来源合计等于PV',2,day.channels.reduce((s,c)=>s+c.value,0)],
  ].map(([name,expected,actual])=>({name,expected,actual,passed:expected===actual}));
  return {passed:checks.every(c=>c.passed),checks,sampleEvents:fixture.map(e=>({id:e.id,date:e.date,type:e.type,visitor:e.visitor||'—',detail:e.note}))};
}
