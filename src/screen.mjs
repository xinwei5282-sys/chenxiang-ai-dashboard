import { layerIcon } from './layer-assets.mjs';
const host=document.querySelector('#app');
const icon=(name,cls='')=>`<img class="icon ${cls}" src="./assets/icons/${name}.svg" alt=""/>`;
const metrics=[['box-fill','溯源档案','1,340','份'],['file-earmark-text-fill','溯源批次','186','批'],['share-fill','全链路节点','6','个'],['robot','AI 服务次数','2,725','次']];
const abilities=[['book-half','产业知识库','沉香专业知识 · 智能问答'],['leaf-fill','全链路溯源','一物一码 · 来源可查'],['bar-chart-fill','AI 智能分析','产业数据 · 趋势研判'],['shield-fill-check','风险预警','异常识别 · 主动提醒']];
// Fixed demonstration records; these are not live monitoring events.
const alerts=[
 ['预警','种植基地','3号区湿度偏高','09-18 16:32'],
 ['提示','检测证书','2份证书即将到期','09-18 16:25'],
 ['预警','流通追踪','物流节点待更新','09-18 16:18'],
 ['正常','生产加工','2号产线运行正常','09-18 16:10'],
 ['正常','原料入库','新批次已完成登记','09-18 16:02'],
 ['提示','育苗培育','本周巡检待完成','09-18 15:55'],
 ['预警','仓储环境','1号库温度偏高','09-18 15:48'],
 ['正常','品质检测','送检样品已收样','09-18 15:40'],
 ['提示','产品档案','3款产品资料待补充','09-18 15:32'],
 ['正常','芯片绑定','本批次绑定完成','09-18 15:24'],
 ['预警','原料批次','含水率待复核','09-18 15:16'],
 ['提示','设备巡检','采集终端待维护','09-18 15:08'],
 ['正常','种植基地','土壤监测数据正常','09-18 15:00'],
 ['正常','物流配送','礼盒批次已签收','09-18 14:52'],
 ['提示','溯源档案','加工凭证待上传','09-18 14:44'],
 ['预警','数据采集','2号终端上报延迟','09-18 14:36'],
 ['正常','生产加工','本批次包装完成','09-18 14:28'],
 ['提示','仓储管理','香品库存接近下限','09-18 14:20'],
 ['正常','产品档案','马到福来档案更新','09-18 14:12'],
 ['正常','流通追踪','渠道出库记录同步','09-18 14:04']
];
const alertRows=alerts.map(([status,title,note,time])=>`<div class="display-item alert-row"><span class="status-tag ${status==='预警'?'danger':status==='提示'?'info':'normal'}">${status}</span><span class="alert-copy">${title} &nbsp;${note}</span><time>${time}</time></div>`).join('');
const nodes=[['nursery','育苗培育','8个基地｜生长良好',650,354],['base','种植基地','12个基地｜数据正常',835,296],['raw','原料采集','186 批｜可追溯',1021,354],['factory','生产加工','32条记录｜运行正常',1125,503],['product','产品档案','1,340个｜已建档',834,630],['transport','流通追踪','11,772次｜可查询',544,503]];
const products=[['product-madaofulai.png','马到福来','640','10,798'],['product-xiangyunyayun-a.png','祥云雅韵A','420','5,036'],['product-xindengchangming.jpg','心灯长明熏香套装','280','2,644']];
const heading=(name,extra='')=>`<div class="panel-heading"><h2>${name}</h2>${extra}</div>`;
host.innerHTML=`<div id="screen-viewport"><main id="screen" aria-label="广垦沉香AI产业大脑"><video class="forest-scene" data-layer="1" src="./assets/video/valley-sphere-particles-v2-1080p.mp4" poster="./assets/video/valley-sphere-poster.jpg" autoplay muted loop playsinline preload="auto" disablepictureinpicture aria-hidden="true"></video><div class="header-backdrop" data-layer="6" aria-hidden="true"></div><div class="footer-backdrop" data-layer="6" aria-hidden="true"></div><header class="screen-header"><div class="brand"><img class="brand-logo" src="./assets/selected/brand-logo.png" alt="广垦沉香 GUANGKEN CHENXIANG"/></div><div class="screen-title"><h1>广垦沉香 AI 产业大脑</h1><p>全 链 路 溯 源 · 智 能 监 测 · 文 化 传 承</p></div><div class="screen-clock"><img class="brand-slogan" data-layer="10" src="./assets/extracted/chrome/slogan.png" alt="让沉香走进更多人的生活"/><time id="clock"></time></div></header><section class="headline-metrics" aria-label="核心指标">${metrics.map(([img,label,value,unit],i)=>`<div class="display-item headline-metric tech-panel"><span class="metric-icon"><img class="metric-source-icon" data-layer="11" src="./assets/extracted/metrics/${["archive","batch","nodes","ai"][i]}.png" alt="" aria-hidden="true"/></span><span class="metric-content"><span class="metric-label">${label}</span><span class="metric-value"><strong>${value}</strong><small>${unit}</small></span></span></div>`).join('')}</section><section class="panel capability-panel tech-panel">${heading('AI 能力中心')}<div class="capability-list">${abilities.map(([img,title,note],i)=>`<div class="display-item capability"><span class="capability-icon">${layerIcon(["knowledge","traceability","analysis","warning"][i])}</span><span><strong>${title}</strong><small>${note}</small></span></div>`).join('')}</div></section><section class="panel alerts-panel tech-panel">${heading('实时预警')}<div class="alert-list"><div class="alert-viewport"><div class="alert-track"><div class="alert-group">${alertRows}</div><div class="alert-group" aria-hidden="true">${alertRows}</div></div></div></div></section><div class="display-item story-banner tech-panel"><span><strong>源于自然 · 臻于匠心</strong><small>NATURAL ORIGIN · INGENUITY</small></span>${icon('play-circle')}</div><section class="trace-scene" aria-label="六节点全链路溯源"><img class="trace-connections" data-layer="4" src="./assets/extracted/scene/trace-connections.png" alt="" aria-hidden="true"/><p class="trace-intro">从产地到产品<br/>全链路数字化溯源</p>${nodes.map(([id,title,note,x,y])=>`<div class="display-item trace-node ${id}" style="left:${x}px;top:${y}px" aria-label="${title}，${note}"><span class="node-hit" aria-hidden="true">${layerIcon(id)}</span><span class="node-caption"><strong>${title}</strong><small>${note}</small></span></div>`).join('')}<div class="display-item chain-status"><span class="status-backdrop" data-layer="5" aria-hidden="true"></span>${icon('check-circle')}<span>全产业链运行正常 · 暂无异常风险</span></div></section><section class="panel assistant-panel tech-panel">${heading('广垦沉香 AI 助手','<span class="english-caption">AI ASSISTANT</span>')}<div class="display-item assistant-art reference-assistant" aria-label="广垦沉香AI助手数字人"><img src="./assets/selected/reference.png" alt="广垦沉香数字人，一线沉香连接自然与人文"/></div></section><section class="panel products-panel tech-panel">${heading('产品档案 TOP3')}<div class="product-list">${products.map(([img,name,count,pv],i)=>`<div class="display-item product-row"><span class="rank">0${i+1}</span><img class="product-photo" src="./assets/selected/${img}" alt="${name}"/><span class="product-copy"><strong>${name}</strong><span>档案 <b>${count}</b><i>｜</i>浏览 <b>${pv}</b></span></span></div>`).join('')}</div></section><footer class="screen-footer"><div class="footer-inner">${[['patch-check','全链路溯源','TRACEABILITY','trace'],['motherboard','AI 智能分析','AI ANALYSIS','analysis'],['flower2','文化传承','CULTURE','culture'],['buildings-fill','产业赋能','INDUSTRY','industry']].map(([img,title,en,id])=>`<div class="display-item">${icon(img)}<span><strong>${title}</strong><small>${en}</small></span></div>`).join('')}</div></footer></main></div>`;
// Replace atlas/CSS chrome with the measured independent PNG layers.
document.querySelector('.header-backdrop').style.background='url(./assets/extracted/chrome/header-background.png) 0 0 / 1671px 97px no-repeat';
document.querySelector('.footer-backdrop').style.background='url(./assets/extracted/chrome/footer-background.png) 0 0 / 992px 91px no-repeat';
const statusBackdrop=document.querySelector('.status-backdrop');statusBackdrop.style.background='url(./assets/extracted/chrome/status-background.png) 0 0 / 479px 60px no-repeat';statusBackdrop.style.clipPath='none';
const assistantArt=document.querySelector('.reference-assistant');assistantArt.innerHTML='<img class="assistant-background" data-layer="7" src="./assets/extracted/assistant/assistant-scene.png" alt="" aria-hidden="true"><img class="assistant-calligraphy" data-layer="9" src="./assets/extracted/assistant/assistant-calligraphy.png" alt="一线沉香，连接自然与人文"><img class="assistant-character" data-layer="8" src="./assets/extracted/assistant/assistant-character.png" alt="广垦沉香数字人"/>';
// Panel surfaces are independent from their foreground text and controls.
for(const panel of document.querySelectorAll('.tech-panel')){
 const frame=document.createElement('img');
 frame.className='panel-backdrop';frame.dataset.layer='2';frame.setAttribute('aria-hidden','true');
 const files=['metric-archive','metric-batch','metric-nodes','metric-ai','capabilities','alerts','brand-story','assistant','products'];
 const i=[...document.querySelectorAll('.tech-panel')].indexOf(panel); frame.src=`./assets/extracted/panels/${files[i]}.png`; panel.prepend(frame);
}
function fit(){document.documentElement.style.setProperty('--screen-scale',Math.min(innerWidth/1671,innerHeight/941));}
function clock(){document.querySelector('#clock').textContent=new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}
window.addEventListener('resize',fit);fit();clock();setInterval(clock,1000);
