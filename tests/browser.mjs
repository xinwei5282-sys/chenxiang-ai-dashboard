import { chromium } from '../../prototype/node_modules/@playwright/test/index.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.DASHBOARD_URL||'http://127.0.0.1:4186/';
const executablePath=process.env.BROWSER_EXECUTABLE||'/Users/xinwei/.cache/puppeteer/chrome-headless-shell/mac_arm-148.0.7778.97/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const browser=await chromium.launch({headless:true,executablePath});
const page=await browser.newPage({viewport:{width:1920,height:1080},locale:'zh-CN'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const checks=[];await mkdir('audit',{recursive:true});
const inspectFit=async()=>{
  await page.waitForFunction(()=>Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue('--screen-scale'))-Math.min(innerWidth/1920,innerHeight/1080))<.0001);
  assert(await page.locator('#screen').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}),'整张大屏不得被视口裁切');
  assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1));
  const issues=await page.locator('.screen-grid .panel').evaluateAll(panels=>panels.flatMap(panel=>{
    const b=panel.getBoundingClientRect();
    return [...panel.querySelectorAll('.category-row,.question-list li,.surface-stats,.trace-step,.trace-proof,.trace-product,.product-row')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>b.bottom-2||r.right>b.right+1||r.left<b.left-1;}).map(e=>`${panel.querySelector('h2').textContent}: ${e.className||e.tagName}`);
  }));assert.deepEqual(issues,[],'面板内容不可溢出');
};
try{
  await page.goto(url);await page.getByRole('heading',{name:'广垦沉香数智展示大屏',exact:true}).waitFor();
  assert.equal(await page.locator('.headline-metric').count(),8);
  assert.equal(await page.locator('.screen-grid>.panel').count(),5);
  for(const title of ['知识建设','全链路溯源','内容传播','产品档案','智能问答'])assert(await page.getByRole('heading',{name:title,exact:true}).isVisible());
  assert.equal(await page.locator('nav,[data-tab],[data-panel],[data-trend]').count(),0);checks.push('八指标、中央溯源与四块成果同时可见，无模块切换');
  assert.equal(await page.locator('.category-row').count(),4);assert.equal(await page.locator('.product-row').count(),3);assert.equal(await page.locator('.trace-step').count(),6);assert.equal(await page.locator('.surface-stats>div').count(),3);assert.equal(await page.locator('.maintenance-table,.note,.headline-metric p').count(),0);assert(await page.locator('.trace-product img').evaluate(el=>el.complete&&el.naturalWidth>0));
  checks.push('六环节溯源、知识统计与传播成果同屏，移除维护明细与长说明');
  await page.screenshot({path:'audit/single-screen-1920.png',fullPage:true});await inspectFit();checks.push('1920×1080单屏无滚动及面板溢出');
  const pv=await page.locator('[data-metric="pv"] strong').innerText();
  await page.getByRole('button',{name:'展示设置',exact:true}).click();
  await page.getByLabel('开始日期',{exact:true}).fill('2026-09-08');await page.getByLabel('结束日期',{exact:true}).fill('2026-09-07');
  await page.getByRole('button',{name:'应用到大屏',exact:true}).click();assert.match(await page.locator('#settings-error').innerText(),/开始不晚于结束/);checks.push('设置拦截无效日期');
  await page.getByLabel('开始日期',{exact:true}).fill('2026-09-03');await page.getByLabel('结束日期',{exact:true}).fill('2026-09-09');await page.getByLabel('产品筛选',{exact:true}).selectOption('p1');await page.getByLabel('内容筛选',{exact:true}).selectOption('c1');
  await page.getByRole('button',{name:'应用到大屏',exact:true}).click();assert.notEqual(await page.locator('[data-metric="pv"] strong').innerText(),pv);assert.equal(await page.locator('.product-row').count(),1);assert.equal(await page.locator('.screen-grid>.panel').count(),5);await inspectFit();checks.push('筛选联动全部模块且不改变单屏布局');
  await page.getByRole('button',{name:'展示设置',exact:true}).click();await page.getByRole('button',{name:'恢复默认范围',exact:true}).click();assert.equal(await page.locator('[data-metric="pv"] strong').innerText(),pv);
  await page.getByRole('button',{name:'指标口径与核对',exact:true}).click();assert.match(await page.getByRole('dialog').innerText(),/9 项独立样例核对通过/);await page.keyboard.press('Escape');checks.push('口径核对弹层可打开并关闭');
  await page.getByRole('button',{name:'展示设置',exact:true}).click();assert.equal(await page.getByRole('button',{name:'导出当前汇总',exact:true}).count(),0);await page.getByLabel('演示角色',{exact:true}).selectOption('operator');await page.getByRole('button',{name:'应用到大屏',exact:true}).click();await page.getByRole('button',{name:'展示设置',exact:true}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前汇总',exact:true}).click();const download=await downloadPromise;await download.saveAs('audit/single-screen-export.csv');assert.match(await readFile('audit/single-screen-export.csv','utf8'),/knowledge.published/);await page.keyboard.press('Escape');checks.push('访客无导出，运营可导出业务与知识汇总');
  await page.evaluate(()=>location.hash='knowledge');await page.waitForFunction(()=>location.hash==='');assert.equal(await page.locator('.screen-grid>.panel').count(),5);checks.push('旧分页链接归入同一大屏');
  await page.locator('#toast.visible').waitFor({state:'hidden'});
  await page.setViewportSize({width:1440,height:900});await inspectFit();await page.screenshot({path:'audit/single-screen-1440.png',fullPage:true});checks.push('1440×900整屏等比适配');
  await page.setViewportSize({width:3840,height:2160});await inspectFit();checks.push('4K整屏等比适配');
  assert.deepEqual(errors,[]);checks.push('无浏览器运行错误');await writeFile('audit/browser-report.json',JSON.stringify({url,checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,checks,errors},null,2));
}finally{await browser.close();}
