// Runs against a local Edge CDP session; no project dependency required.
import assert from 'node:assert/strict';
const targets = await (await fetch('http://localhost:9223/json/list')).json();
const target = targets.find((item) => item.url === 'about:blank') || targets.find((item) => item.url.startsWith('http://localhost:5173'));
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
});
async function cdp(method, params = {}) {
  const callId = ++id;
  const result = new Promise((resolve) => pending.set(callId, resolve));
  ws.send(JSON.stringify({ id: callId, method, params }));
  const response = await result;
  if (response.error) throw Error(JSON.stringify(response.error));
  return response.result;
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const pause = () => new Promise((resolve) => setTimeout(resolve, 120));
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await pause(); }
async function fill(selector, value) {
  await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await pause();
}
async function heading(expected) { assert.equal(await evaluate('document.querySelector("h1")?.textContent'), expected); }
async function nav(index, expected) {
  await click(`.cd-sidebar nav button:nth-child(${index})`);
  await heading(expected);
  assert.equal(await evaluate('document.querySelectorAll("[aria-current=page]").length'), 1);
  assert.equal(await evaluate('document.querySelector("[aria-current=page] > span").textContent'), expected);
}
async function select(selector,value) {
  await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()'); await pause();
}
const stats = () => evaluate('[...document.querySelectorAll(".cd-stat-value")].map(e=>e.textContent)');
try {
  await cdp('Runtime.enable');
  await cdp('Page.navigate',{url:'http://localhost:5173/?preview=admin'});
  for(let i=0;i<50;i++) { if(await evaluate('!!document.querySelector(".admin-dashboard")')) break; await pause(); }
  await nav(5,'Báo cáo thống kê');
  assert.deepEqual(await stats(),['128','146','87.7%','128 liều']);
  assert.equal(await evaluate('document.querySelectorAll(".ar-bar-column").length'),6);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".ar-bar-column > strong")].map(e=>e.textContent)'),['72','85','91','104','116','128']);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".ar-progress-list")][0].querySelectorAll("strong").length'),4);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".ar-progress-list")][0] && [...document.querySelectorAll(".ar-progress-list")[0].querySelectorAll("strong")].map(e=>e.textContent)'),['128','10','4','4']);
  assert.equal(await evaluate('document.querySelectorAll(".ar-ranking li").length'),5);
  assert.ok(await evaluate('document.querySelector(".ar-ranking").textContent.includes("HPV Gardasil 9")'));
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".ar-user-stats dd")].map(e=>e.textContent)'),['142','13','154','1']);
  assert.equal(await evaluate('document.querySelectorAll(".ar-table tbody tr").length'),5);
  assert.equal(await evaluate('document.querySelectorAll(".ar-stock-list li").length'),3);
  await select('#ar-preset','month');
  assert.equal(await evaluate('document.querySelectorAll(".ar-bar-column").length'),6);
  await click('.ar-apply');
  assert.equal(await evaluate('document.querySelectorAll(".ar-bar-column").length'),1);
  assert.deepEqual(await stats(),['128','146','87.7%','128 liều']);
  await fill('#ar-from','2026-10-31'); await fill('#ar-to','2026-10-01'); await click('.ar-apply');
  assert.ok(await evaluate('document.querySelector("[role=alert]").textContent.includes("Từ ngày")'));
  assert.deepEqual(await stats(),['128','146','87.7%','128 liều']);
  await fill('#ar-from','2026-09-01'); await fill('#ar-to','2026-09-30'); await click('.ar-apply');
  assert.deepEqual(await stats(),['116','133','87.2%','116 liều']);
  assert.equal(await evaluate('document.querySelectorAll(".ar-bar-column").length'),1);
  assert.equal(await evaluate('document.querySelectorAll(".ar-table tbody tr").length'),2);
  assert.equal(await evaluate('document.querySelectorAll(".ar-stock-list li").length'),1);
  await fill('#ar-from','2025-01-01'); await fill('#ar-to','2025-02-01'); await click('.ar-apply');
  assert.deepEqual(await stats(),['0','0','0.0%','0 liều']);
  assert.ok(await evaluate('document.querySelector(".ar-monthly").textContent.includes("Không có dữ liệu")'));
  assert.equal(await evaluate('document.querySelectorAll(".ar-table tbody tr").length'),0);
  await click('.ar-reset');
  assert.deepEqual(await stats(),['128','146','87.7%','128 liều']);
  assert.equal(await evaluate('document.querySelectorAll(".ar-bar-column").length'),6);
  await click('.ar-inventory-link'); await heading('Quản lý lô & kho');
  for(const [index,title] of [[1,'Tổng quan'],[2,'Quản lý tài khoản'],[3,'Quản lý vắc xin'],[4,'Quản lý lô & kho'],[5,'Báo cáo thống kê']]) await nav(index,title);
  assert.equal(await evaluate('document.querySelectorAll("[aria-current=page]").length'),1);
  for(const width of [1920,1024,768,375,320]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Overflow '+width);
    assert.ok(await evaluate('document.querySelector(".ar-bar-chart").scrollWidth<=document.querySelector(".ar-bar-chart").clientWidth'),'Chart '+width);
  }
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".ar-table tbody tr")).display'),'block');
  assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>/Xuất Excel|PDF|In báo cáo|Thêm|Sửa|Xóa/.test(e.textContent))'),false);
  await click('.cd-sidebar-bottom button'); assert.ok(await evaluate('!!document.querySelector(".login-page")'));
  assert.deepEqual(errors,[]);
  console.log('PASS: Admin reports active navigation, applied presets/custom date validation/reset, computed summaries/rate, CSS chart, appointment/top-vaccine/inventory/user stats, filtered recent activity, inventory link, all five Admin pages and five responsive widths.');
} finally { ws.close(); }
