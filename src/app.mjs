import { products, contents, DATA_START, DATA_END, metricDefinitions, queryData, runSampleCheck } from './data.mjs';
import { queryKnowledge, knowledgeDefinitions } from './knowledge.mjs';

const app = document.querySelector('#app');
const dialog = document.querySelector('#detail-dialog');
const fmt = value => value == null ? '—' : Number(value).toLocaleString('zh-CN');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const types = { card: '数字生命卡', geo: 'GEO 页面', article: '文化内容' };
const colors = ['#82b99b', '#cfb77e', '#7b9aa7', '#a5a488', '#a6816e'];
const state = { tab: 'overview', start: DATA_START, end: DATA_END, range: '30', product: 'all', content: 'all', role: 'admin', trend: 'pv', sort: 'pv', contentType: 'all', panel:'knowledge' };
const roles = { admin: '管理员', operator: '运营人员', viewer: '展示访客' };
let data;
let knowledge;
let lastFocus;
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  chart: '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
  check: '<path d="m8 12 3 3 5-6"/><path d="M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6Z"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.chart}</svg>`;
const percentage = (a, b) => b ? (a / b * 100).toFixed(1) : '0.0';
const delta = key => {
  const value = data.comparison?.[key];
  return value == null ? '<span class="muted">暂无可比数据</span>' : `<span class="delta ${value < 0 ? 'negative' : ''}">${value < 0 ? '↘' : '↗'} ${Math.abs(value).toFixed(1)}%</span><span class="muted">${key === 'archives' ? '较上期期末' : '较前一等长周期'}</span>`;
};
const option = (value, label, selected) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`;
const panelTitle = (eyebrow, title, right = '') => `<div class="panel-heading"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2></div>${right}</div>`;
const empty = message => `<div class="empty"><span>暂无数据</span><p>${message}</p><button data-action="reset">重置筛选</button></div>`;

function header() {
  return `<header class="topbar">
    <a class="brand" href="#overview" aria-label="广垦沉香经营总览"><img src="/assets/chenxiang-logo.png" alt="广垦沉香"/><span>数字运营中心<small>DIGITAL OPERATIONS</small></span></a>
    <nav aria-label="主导航">${[['overview','grid','经营总览'],['knowledge','grid','知识库全景'],['content','chart','内容传播'],['validation','check','口径与校验']].map(([id,ic,label]) => `<button data-tab="${id}" class="nav-item ${state.tab === id ? 'active' : ''}" ${!canAccess(id) ? 'disabled title="当前演示角色无权访问"' : ''} ${state.tab === id ? 'aria-current="page"' : ''}>${icon(ic)}${label}${!canAccess(id) ? '<span class="locked">受限</span>' : ''}</button>`).join('')}</nav>
    <div class="header-actions"><span class="demo-badge">样例数据</span><label class="role-label"><span>演示角色</span><select id="role" aria-label="演示角色">${Object.entries(roles).map(([key,label]) => option(key,label,state.role)).join('')}</select></label><button class="icon-button" data-action="fullscreen" aria-label="切换全屏" title="切换全屏">${icon('expand')}</button></div>
  </header>`;
}
function filters() {
  const available = contents.filter(c => state.product === 'all' || c.productId === state.product);
  return `<section class="filterbar" aria-label="数据筛选"><div class="date-filters"><span class="filter-caption">统计周期</span><div class="segmented" aria-label="快捷时间">${[['7','近 7 天'],['30','近 30 天'],['custom','自定义']].map(([id,label]) => `<button data-range="${id}" aria-pressed="${state.range === id}" class="${state.range === id ? 'selected' : ''}">${label}</button>`).join('')}</div><span class="range-label">${state.start.replaceAll('-','.')} — ${state.end.replaceAll('-','.')}</span></div>
    <div class="dimension-filters"><label>产品<select id="product" aria-label="产品筛选">${option('all','全部产品',state.product)}${products.map(p => option(p.id,p.shortName || p.name,state.product)).join('')}</select></label><label>内容<select id="content" aria-label="内容筛选">${option('all','全部内容',state.content)}${available.map(c => option(c.id,c.name,state.content)).join('')}</select></label><button class="text-button reset" data-action="reset">重置</button></div>
    ${state.range === 'custom' ? `<form id="date-form" class="custom-dates"><label>开始日期<input type="date" name="start" aria-label="开始日期" value="${state.start}" min="${DATA_START}" max="${DATA_END}" required/></label><span>至</span><label>结束日期<input type="date" name="end" aria-label="结束日期" value="${state.end}" min="${DATA_START}" max="${DATA_END}" required/></label><button class="small-button" type="submit">应用日期</button><span id="date-error" role="alert"></span><small>样例范围 ${DATA_START} 至 ${DATA_END}（北京时间）</small></form>` : ''}
  </section>`;
}
function metrics() {
  const cards = [
    ['published','已发布知识','条',`关联资料 ${fmt(knowledge.metrics.sources)} 份`],
    ['archives','产品档案数','档','截止期末 · 已发布单品档案'],
    ['entries','扫码 / NFC 访问','次',`NFC ${fmt(data.metrics.nfc)} · 扫码 ${fmt(data.metrics.qr)}`],
    ['pv','页面浏览量','次',`独立访客 UV ${fmt(data.metrics.uv)}`],
    ['questions','AI 问答次数','次','用户提问 · 含有效追问'],
    ['shares','内容分享触发','次','分享操作 · 非成功送达'],
  ];
  return `<section class="metrics" aria-label="核心指标">${cards.map(([key,label,unit,sub], i) => {const value=key==='published'?knowledge.metrics.published:data.metrics[key];return `<article class="metric ${i === 0 ? 'archive-metric' : ''}" data-metric="${key}"><div class="metric-label">${label}<button data-definition="${key}" class="info-button" aria-label="${label}口径">${icon('info')}</button></div><div class="metric-value"><strong>${fmt(value)}</strong><span>${value == null ? '不适用' : unit}</span></div><p>${sub}</p><div class="metric-comparison">${key==='published'?`<span class="delta">${fmt(knowledge.metrics.updated)} 条</span><span class="muted">期间维护</span>`:delta(key)}</div></article>`;}).join('')}</section>`;
}
function trendChart() {
  const points = data.trend;
  if (!points.some(p => p[state.trend])) return empty('当前筛选范围内没有访问或互动记录。');
  const W = 850, H = 215, L = 47, R = 18, T = 18, B = 32;
  const max = Math.max(...points.map(p => p[state.trend]), 1);
  const step = Math.pow(10, Math.floor(Math.log10(max)) - 1);
  const top = Math.ceil(max / step / 4) * step * 4;
  const x = i => L + (W-L-R) * (points.length === 1 ? .5 : i / (points.length-1));
  const y = v => H-B - v/top*(H-T-B);
  const path = points.map((p,i) => `${i ? 'L' : 'M'}${x(i)},${y(p[state.trend])}`).join(' ');
  const ticks = [...new Set([0, Math.floor((points.length-1)*.25), Math.floor((points.length-1)*.5), Math.floor((points.length-1)*.75), points.length-1])];
  return `<div class="trend-chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${{pv:'页面浏览量',entries:'入口访问',questions:'问答次数',shares:'分享触发'}[state.trend]}每日趋势"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#82b99b" stop-opacity=".24"/><stop offset="1" stop-color="#82b99b" stop-opacity="0"/></linearGradient></defs>${[0,1,2,3,4].map(i => `<line x1="${L}" y1="${y(top*i/4)}" x2="${W-R}" y2="${y(top*i/4)}" class="grid-line"/><text x="${L-12}" y="${y(top*i/4)+4}" text-anchor="end">${fmt(top*i/4)}</text>`).join('')}<path d="${path} L${x(points.length-1)},${H-B} L${x(0)},${H-B}Z" fill="url(#chart-fill)"/><path d="${path}" fill="none" stroke="#9dc9ac" stroke-width="2.5" stroke-linejoin="round"/>${points.map((p,i) => `<circle cx="${x(i)}" cy="${y(p[state.trend])}" r="3" fill="#bbd7bd"/><rect x="${x(i)-Math.max(6,(W-L-R)/points.length/2)}" y="${T}" width="${Math.max(12,(W-L-R)/points.length)}" height="${H-B-T}" fill="transparent"><title>${p.date} · ${fmt(p[state.trend])} 次</title></rect>`).join('')}${ticks.map(i => `<text x="${x(i)}" y="${H-6}" text-anchor="middle">${points[i].date.slice(5).replace('-','/')}</text>`).join('')}</svg></div>`;
}
function channelChart() {
  const rows = data.channels;
  const total = rows.reduce((sum,r) => sum+r.value,0);
  let acc = 0;
  const stops = rows.map((r,i) => { const from = acc; acc += Number(percentage(r.value,total)); return `${colors[i%colors.length]} ${from}% ${acc}%`; });
  return `<div class="channel-layout"><div class="donut" role="img" aria-label="页面来源占比" style="background:${total ? `conic-gradient(${stops.join(',')})` : '#29413a'}"><div><span>页面浏览</span><strong>${fmt(total)}</strong><small>PV</small></div></div><ul class="channel-legend">${rows.map((r,i) => `<li><span class="legend-label"><i style="background:${colors[i%colors.length]}"></i>${esc(r.label)}</span><strong>${fmt(r.value)}</strong><small>${percentage(r.value,total)}%</small></li>`).join('')}</ul></div><div class="panel-note">按每次浏览的来源归类 · 各渠道合计 = 页面 PV</div>`;
}
function contentBars() {
  const rows = [...data.contentRows].sort((a,b) => b.pv-a.pv).slice(0,5);
  if (!rows.some(r => r.pv)) return empty('更换产品或内容，查看传播表现。');
  const max = Math.max(...rows.map(r => r.pv),1);
  return `<ol class="content-bars">${rows.map((r,i) => `<li><button data-content-link="${esc(r.id)}"><span class="rank">${String(i+1).padStart(2,'0')}</span><span class="bar-content"><span class="bar-title">${esc(r.name)}<b>${fmt(r.pv)}</b></span><span class="bar-track"><span style="width:${r.pv/max*100}%"></span></span></span></button></li>`).join('')}</ol><div class="panel-note">按页面浏览量排名 · 点击查看内容表现</div>`;
}
function hotQuestions() {
  const rows = data.hotQuestions.slice(0,5);
  if (!rows.length) return empty('当前筛选范围内没有有效提问。');
  return `<ol class="question-list">${rows.map((r,i) => `<li><span class="rank ${i < 3 ? 'gold' : ''}">${String(i+1).padStart(2,'0')}</span><span class="question-name">${esc(r.title)}<small>${esc(r.category)}</small></span><strong>${fmt(r.count)}<small>次</small></strong></li>`).join('')}</ol><div class="panel-note">按标准问题归类 · 展示聚合结果</div>`;
}
function productTable() {
  return `<div class="table-wrap"><table class="product-table"><thead><tr><th>产品 / 系列</th><th>档案</th><th>入口访问</th><th>页面 PV</th></tr></thead><tbody>${data.productRows.map((r,i) => `<tr><td><button data-product-link="${esc(r.id)}"><span class="product-mark mark-${i%3}">${['沉','香','韵'][i%3]}</span><span>${esc(products.find(p=>p.id===r.id)?.shortName || r.name)}</span></button></td><td>${fmt(r.archives)}</td><td>${fmt(r.entries)}</td><td>${fmt(r.pv)}</td></tr>`).join('')}</tbody></table></div><div class="panel-note">档案按单品去重 · 产品名称为演示样例</div>`;
}
function knowledgeMini() {
  const rows=knowledge.categories.filter(c=>c.count>0).slice(0,4),max=Math.max(...rows.map(c=>c.count),1);
  const rate=data.knowledgeUsage.hitRate;
  return `<div class="knowledge-mini"><div class="knowledge-mini-stats">${[[knowledge.metrics.sources,'来源资料 / 份'],[knowledge.metrics.updated,'期间维护 / 条'],[knowledge.metrics.pending,'待审核 / 条']].map(([value,label])=>`<div><strong>${fmt(value)}</strong><span>${label}</span></div>`).join('')}</div><div class="knowledge-mini-categories">${rows.map(c=>`<div><span>${esc(c.label)}</span><div class="kb-track"><i style="width:${c.count/max*100}%"></i></div><b>${fmt(c.count)}</b></div>`).join('')}</div></div><div class="panel-note kb-mini-footer"><span>检索命中 ${rate==null?'—':rate.toFixed(1)+'%'} · 分类 TOP 4</span><button class="text-button" data-tab="knowledge">全景 ${icon('arrow')}</button></div>`;
}
function knowledgeView() {
  const m=knowledge.metrics,u=data.knowledgeUsage,max=Math.max(...knowledge.categories.map(c=>c.count),1);
  const kpis=[['知识条目总量',m.total,'条 · 期末存量'],['已发布知识',m.published,'条 · 可用于对外服务'],['关联来源资料',m.sources,'份 · 按资料编号去重'],['期间维护条目',m.updated,'条 · 多次维护只计一次'],['待审核知识',m.pending,'条 · 期末待审'],['检索命中率',u.hitRate==null?'—':u.hitRate.toFixed(1)+'%','命中检索 ÷ 检索请求']];
  return `<section class="knowledge-kpis" aria-label="知识库指标">${kpis.map(([label,value,note])=>`<article class="kb-kpi"><span class="metric-label">${label}</span><strong>${typeof value==='number'?fmt(value):value}</strong><small>${note}</small></article>`).join('')}</section><section class="knowledge-grid">
    <article class="panel kb-categories">${panelTitle('KNOWLEDGE COVERAGE','沉香知识分类',`<span class="count-badge">${knowledge.categories.filter(c=>c.count>0).length} / 12 类</span>`)}<div class="kb-category-list">${knowledge.categories.map(c=>`<div class="kb-category-row"><span>${esc(c.label)}</span><div class="kb-track"><i style="width:${c.count/max*100}%"></i></div><strong>${fmt(c.count)}</strong></div>`).join('')}</div><p class="kb-scope-note">按期末知识条目计数，含各状态；每条知识归属一个主分类。</p></article>
    <article class="panel kb-lifecycle">${panelTitle('PUBLISHING & SERVICE','从知识沉淀到问答服务')}<div class="kb-status-list">${knowledge.statuses.map(s=>`<div><span>${s.label}</span><strong>${fmt(s.count)} <small>条</small></strong></div>`).join('')}</div><div class="kb-hit-summary"><strong>${u.hitRate==null?'—':u.hitRate.toFixed(1)+'%'}</strong><span>知识检索命中率</span><p>检索请求 ${fmt(u.attempts)} 次 · 命中 ${fmt(u.hits)} 次 · 未命中 ${fmt(u.misses)} 次</p></div><p class="kb-scope-note">只统计成功问答中实际发起的检索。命中表示返回可用知识，不代表回答正确率；草稿与待审核知识不进入对外回答。</p></article>
    <article class="panel kb-maintenance">${panelTitle('KNOWLEDGE UPDATES','近期知识维护',`<span class="count-badge">期间新增 ${fmt(m.newEntries)} 条</span>`)}<div class="table-wrap"><table><thead><tr><th>日期</th><th>知识条目</th><th>类别</th><th>动态</th></tr></thead><tbody>${knowledge.updates.slice(0,5).map(e=>`<tr><td>${new Date(e.at).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit'})}</td><td>${esc(e.title)}</td><td>${esc(e.category)}</td><td>${e.label}<small>v${e.version}</small></td></tr>`).join('')}</tbody></table></div>${knowledge.updates.length?'':empty('当前范围内暂无已发布知识的维护动态。')}<p class="kb-scope-note">仅展示期末已发布知识的公开维护动态；不展示草稿或内部备注。</p></article>
    <article class="panel kb-gaps">${panelTitle('CONTINUOUS IMPROVEMENT','知识待完善方向',`<span class="count-badge">未命中 ${fmt(u.misses)} 次</span>`)}<ol class="kb-gap-list">${u.gaps.slice(0,4).map(q=>`<li><div><strong>${esc(q.title)}</strong><small>${esc(q.category)} · 标准问题分类</small></div><span>${fmt(q.count)} 次</span></li>`).join('')}</ol>${u.gaps.length?'':empty('当前范围内未发现检索未命中问题。')}<p class="kb-scope-note">按检索未命中次数排序，仅展示标准问题标题；可据此补充资料或优化知识匹配。</p></article></section><p class="kb-scope-note">知识资产随截止日期统计；维护条目随起止日期统计。产品筛选限制关联知识，内容筛选映射其关联产品；通用内容统计通用知识。检索表现按所选页面内的问答统计。全部为演示样例。</p>`;
}
function overview() {
  return `${metrics()}<section class="overview-grid"><article class="panel trend-panel">${panelTitle('TRAFFIC & ENGAGEMENT','访问与互动趋势',`<div class="mini-tabs" aria-label="趋势指标">${[['pv','浏览'],['entries','入口'],['questions','问答'],['shares','分享']].map(([k,l])=>`<button data-trend="${k}" class="${state.trend===k?'active':''}" aria-pressed="${state.trend===k}">${l}</button>`).join('')}</div>`)}<div class="chart-context"><span><i class="legend-dot"></i>每日${{pv:'页面浏览',entries:'入口访问',questions:'有效提问',shares:'分享触发'}[state.trend]}</span><span>单位：次 · 北京时间</span></div>${trendChart()}</article>
    <article class="panel channel-panel">${panelTitle('ACQUISITION','页面访问来源')} ${channelChart()}</article>
    <article class="panel products-panel">${panelTitle(state.panel==='knowledge'?'KNOWLEDGE ASSETS':'PRODUCT REACH',state.panel==='knowledge'?'知识库建设成果':'产品触达表现',`<div class="panel-switch" aria-label="建设成果切换"><button data-panel="knowledge" class="${state.panel==='knowledge'?'active':''}" aria-pressed="${state.panel==='knowledge'}">知识库</button><button data-panel="product" class="${state.panel==='product'?'active':''}" aria-pressed="${state.panel==='product'}">产品</button></div>`)}${state.panel==='knowledge'?knowledgeMini():productTable()}</article>
    <article class="panel content-panel">${panelTitle('CONTENT PERFORMANCE','热门传播内容',state.role !== 'viewer' ? `<button class="text-button" data-tab="content">全部 ${icon('arrow')}</button>` : '')}${contentBars()}</article>
    <article class="panel questions-panel">${panelTitle('AI INSIGHTS','大家都在问',`<span class="count-badge">TOP 5</span>`)}${hotQuestions()}</article></section>`;
}
function contentView() {
  const rows = data.contentRows.filter(r => state.contentType === 'all' || r.type === state.contentType).sort((a,b) => b[state.sort]-a[state.sort]);
  const typeCards = Object.entries(types).map(([type,label]) => {
    const matched = data.contentRows.filter(r=>r.type === type);
    const pv = matched.reduce((s,r)=>s+r.pv,0), shares = matched.reduce((s,r)=>s+r.shares,0);
    return `<article class="content-summary"><span class="eyebrow">${{card:'DIGITAL IDENTITY',geo:'GEO PAGES',article:'CULTURE & STORIES'}[type]}</span><h2>${label}</h2><div><strong>${fmt(pv)}</strong><span>页面浏览</span></div><footer><span>分享触发 <b>${fmt(shares)}</b></span><span>分享触发率 <b>${percentage(shares,pv)}%</b></span></footer></article>`;
  }).join('');
  return `<section class="content-summaries">${typeCards}</section><section class="panel content-detail-panel">${panelTitle('CONTENT EXPLORER','内容传播明细',`<div class="table-controls"><label>类型<select id="content-type" aria-label="内容类型">${option('all','全部类型',state.contentType)}${Object.entries(types).map(([k,v])=>option(k,v,state.contentType)).join('')}</select></label><label>排序<select id="sort" aria-label="内容排序">${[['pv','按浏览量'],['shares','按分享量'],['questions','按问答量']].map(([k,v])=>option(k,v,state.sort)).join('')}</select></label></div>`)}
    <div class="table-wrap"><table class="content-table"><thead><tr><th>内容名称</th><th>载体</th><th>浏览量 PV</th><th>访客数 UV</th><th>分享触发</th><th>分享触发率</th><th>问答次数</th><th>查看</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.name)}</strong><small>${esc(products.find(p=>p.id===r.productId)?.name || '通用内容')}</small></td><td><span class="type-tag ${r.type}">${types[r.type]}</span></td><td>${fmt(r.pv)}</td><td>${fmt(r.uv)}</td><td>${fmt(r.shares)}</td><td>${r.pv ? percentage(r.shares,r.pv)+'%' : '—'}</td><td>${fmt(r.questions)}</td><td><button class="icon-button" data-content-detail="${esc(r.id)}" aria-label="查看${esc(r.name)}">${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>${rows.length ? '' : empty('此类型在当前范围内没有内容。')}<div class="table-footnote">UV 在每篇内容内去重，跨内容可能重叠，不可直接相加。分享触发率 = 分享触发次数 ÷ 页面 PV。</div></section><aside class="scope-note">${icon('info')}<p><strong>GEO 数据边界</strong>当前展示已接入 GEO 页面的访问与互动。搜索引擎曝光、排名及 AI 引用需另行接入相应数据源，本屏不作推算。</p></aside>`;
}
function validationView() {
  const check = runSampleCheck();
  return `<section class="validation-intro"><div><span class="eyebrow">ONE SOURCE OF TRUTH</span><h2>每一个数字，都有可核对的口径。</h2><p>展示数据来自同一组确定性样例。以下使用独立小样本验证计数规则。</p></div><span class="check-status ${check.passed?'':'failed'}">${icon('check')}${check.passed ? '样例核对通过' : '样例核对未通过'}</span></section>
    <div class="validation-grid"><section class="panel definitions">${panelTitle('METRIC DICTIONARY','指标口径 · v1.0')}<div class="table-wrap"><table><thead><tr><th>指标</th><th>计算口径</th><th>排除 / 边界</th></tr></thead><tbody>${[...metricDefinitions,...knowledgeDefinitions].map(m=>`<tr><td><strong>${esc(m.label)}</strong><small>${esc(m.unit)}</small></td><td>${esc(m.definition)}</td><td>${esc(m.exclusions)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="panel sample-check">${panelTitle('RECONCILIATION','样例计算核对',`<button class="text-button" data-action="recheck">重新核对</button>`)}<div class="table-wrap"><table><thead><tr><th>核对项</th><th>预期</th><th>实际</th><th>结果</th></tr></thead><tbody>${check.checks.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.expected)}</td><td>${esc(c.actual)}</td><td class="${c.passed ? 'passed' : 'failed'}">${c.passed ? '✓ 一致' : '× 不一致'}</td></tr>`).join('')}</tbody></table></div><button class="sample-expand" data-action="sample">查看用于核对的样例事件 ${icon('arrow')}</button><div class="panel-note">此结果验证计数逻辑，不代表生产数据已完成对账。</div></section></div><section class="panel access-panel">${panelTitle('ACCESS POLICY','角色访问规则',`<span class="demo-badge">原型演示</span>`)}<div class="access-roles">${[['管理员','总览、知识库、传播、校验、汇总导出'],['运营人员','总览、知识库、传播、汇总导出'],['展示访客','总览、知识库展示与筛选']].map(([name,desc])=>`<div><strong>${name}</strong><p>${desc}</p></div>`).join('')}</div><p class="table-footnote">正式版本由服务端会话与接口鉴权控制角色及产品范围；前端角色切换仅用于演示。演示数据不包含个人身份及用户提问原文。</p></section>`;
}
function canAccess(tab) { return state.role === 'admin' || (state.role === 'operator' && tab !== 'validation') || tab === 'overview' || tab === 'knowledge'; }
function render() {
  data = queryData(state);
  const contentProduct=contents.find(c=>c.id===state.content)?.productId;
  const knowledgeProduct=state.content==='all'?state.product:contentProduct===null?'common':contentProduct;
  knowledge=queryKnowledge({...state,product:knowledgeProduct});
  if (!canAccess(state.tab)) state.tab = 'overview';
  document.body.dataset.view=state.tab;
  document.body.dataset.range=state.range;
  const title = {overview:'数字运营总览',content:'内容传播分析',knowledge:'知识库建设与服务全景',validation:'指标口径与数据校验'}[state.tab];
  app.innerHTML = `${header()}<main id="main"><div class="page-heading"><div><div class="page-kicker">GUANGKEN AGARWOOD <span>/</span> ${state.tab === 'overview' ? 'OVERVIEW' : state.tab === 'content' ? 'CONTENT ANALYTICS' : state.tab === 'knowledge' ? 'KNOWLEDGE INTELLIGENCE' : 'DATA ASSURANCE'}</div><h1>${title}</h1></div><div class="page-status"><span><i class="status-dot"></i>样例截至 ${DATA_END} <span class="muted">23:59 · 北京时间</span></span>${state.role !== 'viewer' ? `<button class="outline-button" data-action="export">${icon('download')}导出汇总</button>` : '<span class="viewer-note">展示访客 · 只读展示</span>'}</div></div>${state.tab !== 'validation' ? filters() : ''}${state.tab === 'overview' ? overview() : state.tab === 'content' ? contentView() : state.tab === 'knowledge' ? knowledgeView() : validationView()}<footer class="site-footer"><span>广垦沉香 <span class="footer-sep">/</span> 知识资产 · 产品触达 · 内容传播</span><span>演示数据 · 非实时业务统计<button class="text-button" data-action="methodology">口径说明 ${icon('info')}</button><time id="clock"></time></span></footer></main>`;
  updateClock();
}
function showDialog(title, content) {
  lastFocus = document.activeElement;
  dialog.innerHTML = `<div class="dialog-heading"><div><span class="eyebrow">GUANGKEN · DATA NOTES</span><h2 id="dialog-title">${title}</h2></div><button class="icon-button" data-close aria-label="关闭">${icon('close')}</button></div><div class="dialog-content">${content}</div><div class="dialog-footer"><span>广垦沉香 · 样例数据</span><button class="small-button" data-close>关闭</button></div>`;
  dialog.showModal();
}
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message; element.classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(()=>element.classList.remove('visible'),3500);
}
function navigate(tab) {
  if (!canAccess(tab)) { toast('当前演示角色无权访问此页面'); return; }
  state.tab = tab; history.replaceState(null,'',`#${tab}`); render();
}
function reset() {
  Object.assign(state, {start:DATA_START,end:DATA_END,range:'30',product:'all',content:'all',contentType:'all',panel:'knowledge'});render();
}
function exportCSV() {
  if (state.role === 'viewer') return;
  const cells = value => `"${String(value ?? '不适用').replaceAll('"','""')}"`;
  const rows = [['广垦沉香数字运营中心','样例数据 / 非真实业务统计'],['开始日期',state.start],['结束日期',state.end],['时区','Asia/Shanghai'],['产品',products.find(p=>p.id===state.product)?.name || '全部产品'],['内容',contents.find(c=>c.id===state.content)?.name || '全部内容'],['指标','数值'],...Object.entries({产品档案数:data.metrics.archives,扫码NFC入口访问:data.metrics.entries,NFC访问:data.metrics.nfc,扫码访问:data.metrics.qr,页面PV:data.metrics.pv,访客UV:data.metrics.uv,问答次数:data.metrics.questions,分享触发:data.metrics.shares}),[],['内容名称','类型','PV','UV','分享触发','问答次数'],...data.contentRows.map(r=>[r.name,types[r.type],r.pv,r.uv,r.shares,r.questions]),[],['说明','档案为期末存量；分享为触发操作；GEO不含第三方曝光或AI引用；UV不可跨内容求和']];
  rows.push([],['知识库指标','数值'],...Object.entries({知识条目总量:knowledge.metrics.total,已发布知识:knowledge.metrics.published,关联来源资料:knowledge.metrics.sources,期间维护条目:knowledge.metrics.updated,待审核知识:knowledge.metrics.pending,知识检索请求:data.knowledgeUsage.attempts,知识检索命中:data.knowledgeUsage.hits,知识检索未命中:data.knowledgeUsage.misses,知识检索命中率:data.knowledgeUsage.hitRate==null?'不适用':data.knowledgeUsage.hitRate.toFixed(1)+'%'}),['知识资产范围','内容维度映射关联产品；知识存量按截止日，维护按期间；命中率不是正确率']);
  const blob = new Blob(['\ufeff'+rows.map(r=>r.map(cells).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url;a.download=`广垦沉香-样例汇总-${state.start}-${state.end}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出当前筛选范围的样例汇总');
}
app.addEventListener('click', async event => {
  const b = event.target.closest('button'); if (!b) return;
  if (b.dataset.tab) navigate(b.dataset.tab);
  else if(b.dataset.panel){state.panel=b.dataset.panel;render();}
  else if (b.dataset.range) {
    state.range = b.dataset.range;
    if (state.range !== 'custom') {
      state.end=DATA_END; const date = new Date(`${DATA_END}T00:00:00Z`); date.setUTCDate(date.getUTCDate()-Number(state.range)+1);state.start=date.toISOString().slice(0,10);
    }
    render();
  } else if (b.dataset.trend) {state.trend=b.dataset.trend;render();}
  else if (b.dataset.definition) {
    const m = [...metricDefinitions,...knowledgeDefinitions].find(m=>m.key===b.dataset.definition);
    showDialog(m?.label || '指标口径', `<p>${esc(m?.definition || '以同一组样例事件按当前时间、产品和内容筛选聚合。')}</p><div class="detail-callout">${esc(m?.exclusions || '排除重复、失败和测试流量。')}</div><p>统计时区：北京时间。时间区间包含起始日和结束日，档案数为结束日期末存量。</p>`);
  } else if (b.dataset.productLink) {state.product=b.dataset.productLink;state.content='all';render();toast('已筛选该产品，全部图表同步更新');}
  else if (b.dataset.contentLink) {
    if (state.role === 'viewer') {toast('当前展示角色仅支持总览筛选');return;}
    state.content=b.dataset.contentLink;navigate('content');
  } else if (b.dataset.contentDetail) {
    if (!canAccess('content')) return;
    const row=data.contentRows.find(r=>r.id===b.dataset.contentDetail);
    if (row) showDialog(esc(row.name),`<span class="type-tag">${types[row.type]}</span><div class="detail-stats"><div><span>页面 PV</span><strong>${fmt(row.pv)}</strong></div><div><span>独立访客 UV</span><strong>${fmt(row.uv)}</strong></div><div><span>分享触发</span><strong>${fmt(row.shares)}</strong></div></div><p>统计周期：${state.start} 至 ${state.end}。关联产品：${esc(products.find(p=>p.id===row.productId)?.name || '通用内容')}。</p><div class="detail-callout">${row.type === 'geo' ? 'GEO 页面仅统计已接入页面上的访问与互动，不代表第三方搜索曝光、排名或 AI 引用。' : '分享数据为用户触发分享的操作次数，不代表成功送达。匿名 UV 仅在当前内容及时间范围内去重。'}</div>`);
  } else if (b.dataset.action === 'reset') reset();
  else if (b.dataset.action === 'export') exportCSV();
  else if (b.dataset.action === 'fullscreen') {
    try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('当前浏览器不支持全屏，请使用浏览器全屏功能'); }
  } else if (b.dataset.action === 'methodology') showDialog('统计范围说明',`<p>当前数据为确定性演示样例，覆盖 ${DATA_START} 至 ${DATA_END}，不接入生产系统。各图表和导出使用同一数据源。</p><div class="detail-callout">扫码 / NFC 访问属于入口行为；页面 PV 属于浏览行为，两者不能相加作为总访问。产品档案数按已发布单品去重，不是产品款数。</div><p>匿名访客可能跨设备重复识别。分享表示触发，GEO 不包含第三方曝光与 AI 引用。</p><p>顶部角色切换仅用于演示，正式版本需要服务端登录鉴权及数据范围控制。</p>`);
  else if (b.dataset.action === 'recheck' && state.role === 'admin') { const result=runSampleCheck(); render();toast(result.passed ? `已重新计算，${result.checks.length} 项样例核对一致` : '发现样例数据差异'); }
  else if (b.dataset.action === 'sample' && state.role === 'admin') { const result=runSampleCheck();showDialog('用于核对的样例事件',`<p>这组小样本用于验证计数规则，与经营总览的完整样例数据集独立。</p><div class="table-wrap"><table><thead><tr><th>ID / 时间</th><th>类型</th><th>匿名访客</th><th>说明</th></tr></thead><tbody>${result.sampleEvents.map(e=>`<tr><td>${esc(e.id)}<small>${esc(e.date)}</small></td><td>${esc(e.type)}</td><td>${esc(e.visitor)}</td><td>${esc(e.detail)}</td></tr>`).join('')}</tbody></table></div>`); }
});
app.addEventListener('change', event => {
  const {id,value} = event.target;
  if (id==='role') { state.role=value; if(dialog.open) dialog.close(); if(!canAccess(state.tab)) state.tab='overview';history.replaceState(null,'',`#${state.tab}`);render();toast(`已切换为${roles[value]} · 原型权限演示`); }
  else if (id==='product') {state.product=value;state.content='all';render();}
  else if (id==='content') {state.content=value;render();}
  else if (id==='content-type') {state.contentType=value;render();}
  else if (id==='sort') {state.sort=value;render();}
});
app.addEventListener('submit', event => {
  if (event.target.id !== 'date-form') return;event.preventDefault();
  const form = new FormData(event.target);const start=form.get('start'),end=form.get('end');
  if (!start || !end || start>end || start<DATA_START || end>DATA_END) {document.querySelector('#date-error').textContent='请选择样例范围内、开始不晚于结束的日期。';return;}
  state.start=start;state.end=end;render();toast('已应用日期，全部图表同步更新');
});
dialog.addEventListener('click', event => { if(event.target.closest('[data-close]') || event.target===dialog) dialog.close(); });
dialog.addEventListener('close',()=>lastFocus?.isConnected && lastFocus.focus());
window.addEventListener('hashchange',()=> {const tab=location.hash.slice(1); if(['overview','knowledge','content','validation'].includes(tab)) {if(canAccess(tab)) navigate(tab);else {navigate('overview');toast('当前演示角色无权访问此页面');}}});
function updateClock() {const clock=document.querySelector('#clock');if(clock) clock.textContent=new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});}
if (['overview','knowledge','content','validation'].includes(location.hash.slice(1))) state.tab=location.hash.slice(1);
render();setInterval(updateClock,1000);
