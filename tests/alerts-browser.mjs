import { chromium } from '../../prototype/node_modules/@playwright/test/index.mjs';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Users/xinwei/.cache/puppeteer/chrome-headless-shell/mac_arm-148.0.7778.97/chrome-headless-shell-mac-arm64/chrome-headless-shell'
});
const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const checks = [];
try {
  await page.goto('http://127.0.0.1:4187/');
  assert.equal(await page.locator('.alert-viewport').count(), 1, '预警具有独立的滚动可视区');
  const structure = await page.locator('.alert-list').evaluate(list => {
    const rows = [...list.querySelectorAll('.alert-group:first-child .alert-row')];
    const copy = [...list.querySelectorAll('.alert-group:nth-child(2) .alert-row')];
    const viewport = list.querySelector('.alert-viewport');
    const track = list.querySelector('.alert-track');
    return {
      rows: rows.map(r => r.textContent.trim()), copy: copy.map(r => r.textContent.trim()),
      viewportHeight: viewport?.getBoundingClientRect().height, rowHeight: rows[0]?.getBoundingClientRect().height,
      trackHeight: track?.getBoundingClientRect().height, hidden: list.querySelector('.alert-group:nth-child(2)')?.getAttribute('aria-hidden')
    };
  });
  assert.equal(structure.rows.length, 20, '第一组预警有20条');
  assert.equal(new Set(structure.rows).size, 20, '第一组预警文本唯一');
  assert.deepEqual(structure.copy, structure.rows, '第二组与第一组内容一致');
  assert.equal(structure.hidden, 'true', '第二组为辅助复制组');
  assert(Math.abs(structure.viewportHeight - 157.5) < 0.2, '可视窗口高157.5px');
  assert(Math.abs(structure.rowHeight - 31.5) < 0.2, '预警行高31.5px');
  assert(Math.abs(structure.trackHeight - 1260) < 1, '轨道含两组共40行');
  checks.push('20条唯一预警、20条一致复制组及5行滚动窗口结构正确');

  const textOverflow = await page.locator('.alert-group:first-child .alert-copy').evaluateAll(es => es.filter(e => e.scrollWidth > e.clientWidth).map(e => e.textContent));
  assert.deepEqual(textOverflow, [], '所有样例文案完整显示，不被省略');
  const firstTransform = await page.locator('.alert-track').evaluate(e => getComputedStyle(e).transform);
  await page.waitForTimeout(180);
  const secondTransform = await page.locator('.alert-track').evaluate(e => getComputedStyle(e).transform);
  assert.notEqual(secondTransform, firstTransform, '滚动动画在真实时间中产生位移');
  const offset = value => Number(value.split(',')[5]?.replace(')', ''));
  assert(offset(secondTransform) < offset(firstTransform), '列表向上移动');
  await page.waitForFunction(() => {const v=document.querySelector('video.forest-scene');return v.readyState>=2&&!v.paused&&v.currentTime>0.1;});
  const videoState = await page.locator('video.forest-scene').evaluate(v => ({ rect: v.getBoundingClientRect().toJSON(), time: v.currentTime, paused: v.paused }));
  await page.waitForTimeout(180);
  const videoAfter = await page.locator('video.forest-scene').evaluate(v => ({ rect: v.getBoundingClientRect().toJSON(), time: v.currentTime, paused: v.paused }));
  assert.equal(videoAfter.rect.x, videoState.rect.x, '视频主场景位置稳定');
  assert(videoAfter.time > videoState.time, '视频主场景继续播放');
  assert.equal(videoAfter.paused, false, '视频主场景未被预警动画影响');

  const seam = await page.locator('.alert-track').evaluate(track => {
    const animation = track.getAnimations().find(a => a.animationName === 'alert-scroll' || a.effect?.getKeyframes().some(k => String(k.transform).includes('translateY')));
    if (!animation) throw new Error('未找到预警滚动动画');
    const sample = currentTime => { animation.currentTime = currentTime; return { transform: getComputedStyle(track).transform, rows: [...document.querySelectorAll('.alert-viewport .alert-row')].filter(row => { const r = row.getBoundingClientRect(); const v = document.querySelector('.alert-viewport').getBoundingClientRect(); return r.bottom > v.top + 0.5 && r.top < v.bottom - 0.5; }).map(row => row.textContent.trim()) }; };
    animation.pause(); return { before: sample(79999), after: sample(80001) };
  });
  assert.notEqual(seam.before.transform, 'none');
  assert.notDeepEqual(seam.before.rows, [], '动画接缝前有可见预警');
  assert.notDeepEqual(seam.after.rows, [], '动画接缝后有可见预警');
  assert.deepEqual(seam.before.rows, seam.after.rows, '循环末尾与开头的可见内容一致，无跳项或空白');
  checks.push('动画运行及79999/80001ms接缝可见内容连续');

  const overflow = await page.locator('.alert-viewport').evaluate(viewport => {
    const vr = viewport.getBoundingClientRect();
    return [...viewport.querySelectorAll('.alert-row')].filter(row => { const r = row.getBoundingClientRect(); return r.bottom > vr.top + .5 && r.top < vr.bottom - .5; }).map(row => ({ right: row.getBoundingClientRect().right, left: row.getBoundingClientRect().left, width: row.getBoundingClientRect().width, copy: row.querySelector('.alert-copy')?.getBoundingClientRect().right, time: row.querySelector('time')?.getBoundingClientRect().left }));
  });
  assert(overflow.length >= 4 && overflow.every(r => r.left >= 0 && r.right <= 420 && r.copy < r.time), '可见预警文字不横向溢出且时间列稳定');
  await page.locator('.alerts-panel').screenshot({ path: 'audit/alerts-scroll-20260918.png', animations: 'allow' });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  assert.equal(await page.locator('.alert-viewport').count(), 1, '预警具有独立的滚动可视区');
  assert.equal(await page.locator('.alert-track').evaluate(e => getComputedStyle(e).animationPlayState), 'paused', '减动效时停止滚动');
  assert.equal(await page.locator('.alert-group:first-child .alert-row').evaluateAll(rows => { const v = document.querySelector('.alert-viewport').getBoundingClientRect(); return rows.filter(row => { const r = row.getBoundingClientRect(); return r.top >= v.top - .5 && r.bottom <= v.bottom + .5; }).length; }), 5, '减动效时保留首5行');
  checks.push('prefers-reduced-motion 下停止动画并保留首5行');
  assert.deepEqual(errors, []);
  await writeFile('audit/alerts-scroll-20260918.json', JSON.stringify({ url: 'http://127.0.0.1:4187/', checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally { await browser.close(); }
