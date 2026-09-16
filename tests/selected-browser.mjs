import { chromium } from '../../prototype/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/Users/xinwei/.cache/puppeteer/chrome-headless-shell/mac_arm-148.0.7778.97/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const page=await browser.newPage({viewport:{width:1671,height:941},deviceScaleFactor:1});
const errors=[];const checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
await page.goto('http://127.0.0.1:4187/');await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
if(process.env.CAPTURE_ONLY){
assert.equal(await page.locator('.sample-label').count(),0);
assert.equal(await page.locator('.brand-logo').evaluate(i=>i.complete&&i.naturalWidth===932),true);
assert.deepEqual(await page.locator('img').evaluateAll(es=>es.filter(i=>!i.naturalWidth).map(i=>i.src)),[]);
assert.deepEqual(errors,[]);
await page.screenshot({path:'audit/selected-initial.png'});
await page.locator('.assistant-panel').screenshot({path:'audit/assistant-halo-updated.png'});
await page.addStyleTag({content:'.assistant-panel{visibility:hidden!important}'});
await page.screenshot({path:'audit/forest-seam-render.png',clip:{x:1130,y:185,width:400,height:395}});
console.log('Logo loaded; sample badge removed; assets loaded; no console errors; assistant and forest patch rendered.');
}
else{
assert.deepEqual(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth).map(i=>i.src)),[],'所有素材成功加载');
assert.equal(await page.locator('.headline-metric').count(),4);assert.equal(await page.locator('.metric-source-icon').count(),4);
assert.equal(await page.locator('.metric-icon .icon').count(),0,'不再用通用SVG代替原图指标图标');assert.equal(await page.locator('.trace-node').count(),6);assert.equal(await page.locator('.product-row').count(),3);
assert.equal(await page.locator('[data-layer="3"]').count(),10,'4个AI能力图标和6个溯源图标独立');
assert.equal(await page.locator('.tree-orbit-art').count(),0,'中心树使用视频内画面，不重复叠加');assert.equal(await page.locator('.trace-connections[data-layer="4"]').count(),1,'独立环形轨道连接六节点');assert(await page.locator('.trace-connections').evaluate(i=>i.complete&&i.naturalWidth===1671),'溯源连线素材加载成功');assert.equal(await page.locator('.node-hit img').count(),6);
assert.match(await page.locator('.forest-scene').getAttribute('src'),/valley-sphere-particles-v2-1080p\.mp4$/);
assert.equal(await page.locator('.reference-trace-art').count(),0,'中央不再使用含字截图');
assert(await page.locator('.trace-node small').evaluateAll(els=>els.every(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).visibility==='visible')),'节点状态为可见原生文字');
for(const n of [1,2,3,5,6,7,8,9,10,11])assert(await page.locator(`[data-layer="${n}"]`).count()>0,`第${n}层存在`);
assert.equal(await page.locator('img.panel-backdrop').count(),9);
assert.equal(await page.locator('img[data-layer="3"]').evaluateAll(es=>new Set(es.map(e=>e.src)).size),10);
assert.equal(await page.locator('.reference-assistant img').count(),3);
checks.push('全屏视频包含背景和中心树；6个溯源图标、9框、4个AI图标与助手各层独立');
await page.waitForFunction(()=>{const v=document.querySelector('video.forest-scene');return v.readyState>=2&&!v.paused&&v.currentTime>0.1});
assert(await page.locator('video.forest-scene').evaluate(v=>v.autoplay&&v.muted&&v.loop&&v.playsInline&&!v.controls));
await page.evaluate(()=>{const v=document.querySelector('video.forest-scene');let previous=v.currentTime;window.backgroundLoopObserved=false;v.addEventListener('timeupdate',()=>{if(v.currentTime<previous)window.backgroundLoopObserved=true;previous=v.currentTime});});
await page.waitForFunction(()=>window.backgroundLoopObserved,{},{timeout:12000});
assert(await page.locator('video.forest-scene').evaluate(v=>!v.paused&&!v.ended&&v.error===null));
checks.push('背景视频默认静音自动播放，无控件，实测播放到结尾后自动循环');
await page.screenshot({path:'audit/selected-1671.png'});checks.push('四指标、六溯源节点、三产品缩略图全部加载');
for(const [width,height] of [[1920,1080],[1440,900],[3840,2160]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(100);
 assert(await page.locator('#screen').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1}));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));
 const issues=await page.locator('.capability,.alert-row,.product-row').evaluateAll(els=>els.flatMap(el=>{const p=el.closest('.panel').getBoundingClientRect();return [...el.children].filter(c=>{const r=c.getBoundingClientRect();return r.left<p.left-1||r.right>p.right+1||r.bottom>p.bottom+1}).map(c=>c.className)}));assert.deepEqual(issues,[],'面板内容不越界');
 if(width===1920||width===1440)await page.screenshot({path:`audit/selected-${width}.png`});checks.push(`${width}×${height} 整屏等比适配，面板与视口不溢出`);
}
await page.setViewportSize({width:1671,height:941});
assert.equal(await page.locator('#screen button,#screen a,#screen [data-open],dialog').count(),0);
for(const selector of ['.headline-metric','.capability','.alert-row','.trace-node','.product-row','.assistant-art','.chain-status','.footer-inner>.display-item']){
 const target=page.locator(selector).first();
 const before=await target.evaluate(e=>[getComputedStyle(e).filter,getComputedStyle(e).boxShadow]);
 await target.hover();await target.click();
 assert.deepEqual(await target.evaluate(e=>[getComputedStyle(e).filter,getComputedStyle(e).boxShadow]),before);
 assert.equal(await page.locator('dialog,[role="dialog"]').count(),0);
}
checks.push('大屏无可点击控件；指标、节点、产品、助手及底部内容点击不弹窗，悬停样式不变');
assert.deepEqual(errors,[]);checks.push('浏览器无控制台错误和脚本异常');
await page.goto('http://127.0.0.1:4187/layers.html');
await page.frameLocator('#preview').locator('[data-layer="1"]').waitFor();
await page.locator('[data-only="3"]').click();
assert(await page.frameLocator('#preview').locator('[data-icon="knowledge"]').evaluate(e=>getComputedStyle(e).visibility==='visible'));
assert(await page.frameLocator('#preview').locator('.trace-node small').first().evaluate(e=>getComputedStyle(e).visibility==='hidden'));
await page.screenshot({path:'audit/layers-icons.png'});
await page.locator('[data-only="1"]').click();
assert(await page.frameLocator('#preview').locator('[data-layer="1"]').evaluate(e=>getComputedStyle(e).visibility==='visible'));
assert(await page.frameLocator('#preview').locator('[data-layer="3"]').first().evaluate(e=>getComputedStyle(e).visibility==='hidden'));
await page.screenshot({path:'audit/layers-merged-scene.png'});
await page.locator('#reset').click();
assert(await page.frameLocator('#preview').locator('.trace-node small').first().evaluate(e=>getComputedStyle(e).visibility==='visible'));
checks.push('分层预览可单独显示图标/组合图，背景和文字独立隐藏，恢复正常');
assert.deepEqual(errors,[]);
await page.locator('[data-only="8"]').click();
assert(await page.frameLocator('#preview').locator('[data-layer="8"]').evaluate(e=>getComputedStyle(e).visibility==='visible'));
assert(await page.frameLocator('#preview').locator('[data-layer="7"]').evaluate(e=>getComputedStyle(e).visibility==='hidden'));
await page.screenshot({path:'audit/layers-character.png'});
await page.locator('[data-only="9"]').click();
assert(await page.frameLocator('#preview').locator('[data-layer="9"]').evaluate(e=>getComputedStyle(e).visibility==='visible'));
await page.screenshot({path:'audit/layers-calligraphy.png'});
await page.goto('http://127.0.0.1:4187/cutouts.html');
await page.waitForFunction(()=>document.images.length===32&&[...document.images].every(i=>i.complete&&i.naturalWidth));
assert.equal(await page.locator('a[download]').count(),32);
await page.screenshot({path:'audit/cutouts-gallery.png',fullPage:true});
assert.deepEqual(errors,[]);
checks.push('素材页32张PNG全部加载且有下载链接；数字人可单独显示');
await writeFile('audit/selected-browser-report.json' ,JSON.stringify({url:'http://127.0.0.1:4187/',root:process.cwd(),checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}
}finally{await browser.close()}
