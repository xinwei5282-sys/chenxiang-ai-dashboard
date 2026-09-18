import { chromium } from '../../prototype/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({headless:true,executablePath:'/Users/xinwei/.cache/puppeteer/chrome-headless-shell/mac_arm-148.0.7778.97/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try {
  const page = await browser.newPage({viewport:{width:1671,height:941}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();
  await page.goto('http://127.0.0.1:4187/');
  assert.equal(await page.locator('[data-counter="ai"]').count(),1,'AI服务次数接入模拟更新');
  const read = () => page.evaluate(() => {
    const n=s=>Number(document.querySelector(s).textContent.replaceAll(',',''));
    return {archive:n('.headline-metric:first-child strong'),nodeArchive:n('.trace-node.product [data-counter]'),batches:n('.headline-metric:nth-child(2) strong'),nodeBatch:n('.trace-node.raw [data-counter]'),ai:n('[data-counter="ai"]'),products:[...document.querySelectorAll('.product-copy')].map(e=>[...e.querySelectorAll('b')].map(b=>Number(b.textContent.replaceAll(',','')))),fixed:[document.querySelector('.headline-metric:nth-child(3) strong').textContent,...[...document.querySelectorAll('.nursery small,.base small')].map(e=>e.textContent)]};
  });
  const before=await read();
  const oldRecords=await page.locator('.alert-group:first-child').textContent();
  await page.clock.runFor(55000);
  const after=await read();
  assert(after.ai>before.ai&&after.archive>before.archive&&after.batches>before.batches,'快慢指标均增长');
  assert(after.products.some((p,i)=>p[1]>before.products[i][1]),'商品浏览量增长');
  assert.equal(after.archive,after.products.reduce((n,p)=>n+p[0],0),'档案总量与商品合计一致');
  assert.equal(after.archive,after.nodeArchive,'档案节点与总量一致');
  assert.equal(after.batches,after.nodeBatch,'原料批次与顶部一致');
  assert.deepEqual(after.fixed,before.fixed,'基地数量和六环节保持固定');
  assert.notEqual(await page.locator('.alert-group:first-child').textContent(),oldRecords,'新业务记录进入滚动列表');
  const groups=await page.locator('.alert-group').allTextContents();
  assert.equal(groups[0],groups[1],'两组滚动内容同步');
  const overflow=await page.locator('.product-copy,.metric-content,.alert-copy').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className));
  assert.deepEqual(overflow,[],'增长后文字不溢出');
  await page.screenshot({path:'audit/simulation-20260918.png',animations:'allow'});
  await page.emulateMedia({reducedMotion:'reduce'});
  const reducedBefore=await read();
  await page.clock.runFor(8000);
  assert((await read()).ai>reducedBefore.ai,'减动效模式仍更新数据');
  assert.deepEqual(errors,[]);
  await writeFile('audit/simulation-20260918.json',JSON.stringify({before,after,errors},null,2));
  console.log('模拟增长、跨区域合计、固定指标、动态记录、减动效与文字边界检查通过');
} finally {await browser.close();}
