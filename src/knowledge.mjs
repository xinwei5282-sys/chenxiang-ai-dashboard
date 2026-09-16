const DAY=86400000;
const DEFAULT_START='2026-08-11',DEFAULT_END='2026-09-09';
export const knowledgeCategories=[
  ['product','产品与系列'],['origin','香型与产地'],['year','年份定义'],['craft','原料与制作工艺'],
  ['certificate','证书与检测'],['culture','品牌与沉香文化'],['benefits','活动与权益'],['etiquette','佩戴与礼赠文化'],
  ['care','佩戴与养护'],['lifestyle','香文化生活'],['faq','消费者常见问题'],['boundary','表达与内容边界'],
].map(([id,label])=>({id,label}));
export const knowledgeDefinitions=[
  {key:'published',label:'已发布知识',unit:'条',definition:'截止结束日期末，最新状态为已发布的knowledge_id去重数；内容修订不新增条目',exclusions:'草稿、待审核、已停用；不将向量切片或版本数计为知识条目'},
  {key:'kbSources',label:'关联来源资料',unit:'份',definition:'筛选范围内知识条目关联的source_id去重数，且资料在截止日期前已入库',exclusions:'同资料多个版本和被多条知识引用不重复计数；不代表所有已上传文件'},
  {key:'kbUpdated',label:'期间维护条目',unit:'条',definition:'期间发生新增、提交审核、发布、发布修订版或停用的knowledge_id去重数',exclusions:'同条目期间多次维护计一条；不是操作次数；草稿维护包含在总数'},
  {key:'kbPending',label:'待审核知识',unit:'条',definition:'截止结束日期末最新状态为待审核的知识条目数',exclusions:'不展示待审核原文；已发布且无待审版本的条目不计入'},
  {key:'kbHitRate',label:'知识检索命中率',unit:'%',definition:'成功问答中返回可用知识片段的检索请求数÷成功问答中实际发起的检索请求数×100%',exclusions:'未调用检索、失败问答不进入分母；无检索显示不适用；不是回答正确率'},
];
const epoch=Date.parse('2026-06-01T00:00:00+08:00');
const time=day=>new Date(epoch+day*DAY+10*3600000).toISOString();
const sources=Array.from({length:186},(_,i)=>({id:`source-${i}`,title:`沉香知识来源资料 ${String(i+1).padStart(3,'0')}`,createdAt:time(Math.floor(i/8))}));
const knowledge=[],events=[];
const categoryCounts=[142,118,76,129,88,103,64,97,176,91,136,48];
for(let i=0;i<1268;i++) {
  const slot=(i*197)%1268;let threshold=0;
  const category=knowledgeCategories[categoryCounts.findIndex(count=>(threshold+=count)>slot)];
  const created=Math.floor(i/1268*99);
  const id=`kb-${String(i+1).padStart(4,'0')}`;
  knowledge.push({id,title:`${category.label} · ${['基础说明','服务指引','常见问题','场景解读'][i%4]} ${String(i+1).padStart(4,'0')}`,category:category.id,productId:[null,'p1','p1','p2','p3'][i%5],sourceIds:[`source-${i%186}`,`source-${(i+37)%186}`],createdAt:time(created)});
  events.push({id:`${id}-create`,knowledgeId:id,at:time(created),type:'create',version:1});
  if(i%20!==0) events.push({id:`${id}-submit`,knowledgeId:id,at:time(created+1),type:'submit',version:1});
  if(i%20>2) {
    events.push({id:`${id}-publish`,knowledgeId:id,at:time(created+2),type:'publish',version:1});
    if(i%5===0) events.push({id:`${id}-revise`,knowledgeId:id,at:time(Math.max(created+4,72+i%28)),type:'revise',version:2});
    if(i%47===0) events.push({id:`${id}-retire`,knowledgeId:id,at:time(created+6),type:'retire',version:2});
  }
}
function validDay(value){const ms=Date.parse(`${value}T00:00:00+08:00`);return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(ms)&&new Date(ms+8*3600000).toISOString().slice(0,10)===value;}
export function calculateKnowledge(source,{start=DEFAULT_START,end=DEFAULT_END,product='all'}={}) {
  if(!validDay(start)||!validDay(end)||start>end) {start=DEFAULT_START;end=DEFAULT_END;}
  const from=Date.parse(`${start}T00:00:00+08:00`),to=Date.parse(`${end}T00:00:00+08:00`)+DAY;
  const records=[...new Map(source.knowledge.filter(k=>Date.parse(k.createdAt)<to&&(product==='all'||(product==='common'?k.productId===null:k.productId===product))).map(k=>[k.id,k])).values()];
  const ids=new Set(records.map(k=>k.id)),seen=new Set();
  const changes=source.events.filter(e=>ids.has(e.knowledgeId)&&Date.parse(e.at)<to).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).filter(e=>{if(seen.has(e.id))return false;seen.add(e.id);return true;});
  const statusesById=new Map(records.map(k=>[k.id,'draft']));
  const states={create:'draft',submit:'pending',publish:'published',revise:'published',retire:'retired'};
  for(const event of changes) if(states[event.type]) statusesById.set(event.knowledgeId,states[event.type]);
  const statuses=[['published','已发布'],['pending','待审核'],['draft','草稿'],['retired','已停用']].map(([id,label])=>({id,label,count:records.filter(k=>statusesById.get(k.id)===id).length}));
  const sourceIds=new Set(records.flatMap(k=>k.sourceIds));
  const sourceCount=new Set(source.sources.filter(s=>sourceIds.has(s.id)&&Date.parse(s.createdAt)<to).map(s=>s.id)).size;
  const period=changes.filter(e=>Date.parse(e.at)>=from);
  const categories=knowledgeCategories.map(c=>({...c,count:records.filter(k=>k.category===c.id).length,published:records.filter(k=>k.category===c.id&&statusesById.get(k.id)==='published').length})).sort((a,b)=>b.count-a.count);
  const updates=period.filter(e=>statusesById.get(e.knowledgeId)==='published'&&['publish','revise'].includes(e.type)).map(e=>{
    const k=records.find(k=>k.id===e.knowledgeId);return {...e,title:k.title,category:knowledgeCategories.find(c=>c.id===k.category)?.label||k.category,label:e.type==='revise'?'发布修订':'首次发布'};
  }).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  return {metrics:{total:records.length,published:statuses.find(s=>s.id==='published').count,pending:statuses.find(s=>s.id==='pending').count,sources:sourceCount,updated:new Set(period.map(e=>e.knowledgeId)).size,newEntries:records.filter(k=>Date.parse(k.createdAt)>=from).length},categories,statuses,updates,scope:product,coverage:{start,end}};
}
export function queryKnowledge(filters={}) {return calculateKnowledge({knowledge,events,sources},filters);}
