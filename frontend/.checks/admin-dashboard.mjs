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
async function heading(expected) { assert.equal(await evaluate('document.querySelector("h1")?.textContent'), expected); }
try {
  await cdp('Runtime.enable');
  await cdp('Page.navigate',{url:'http://localhost:5173/?preview=admin'});
  for(let i=0;i<50;i++) { if(await evaluate('!!document.querySelector(".admin-dashboard")')) break; await pause(); }
  await heading('Tổng quan');
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".cd-sidebar nav button span")].map(e=>e.textContent)'),['Tổng quan','Quản lý tài khoản','Quản lý vắc xin','Quản lý lô & kho','Báo cáo thống kê']);
  assert.equal(await evaluate('document.querySelectorAll("[aria-current=page]").length'),1);
  assert.equal(await evaluate('document.querySelector("[aria-current=page]").textContent'),'Tổng quan');
  assert.equal(await evaluate('document.querySelector(".cd-account-name strong").textContent'),'Quản trị viên');
  assert.equal(await evaluate('document.querySelector(".cd-avatar").textContent'),'AD');
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".cd-stat-value")].map(e=>e.textContent)'),['156','203','12','128']);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".ad-inventory strong")].map(e=>e.textContent)'),['485','3','2']);
  assert.equal(await evaluate('document.querySelectorAll(".ad-alerts li").length'),3);
  assert.equal(await evaluate('document.querySelectorAll(".ad-activities li").length'),4);
  assert.equal(await evaluate('document.querySelectorAll(".cd-action").length'),4);
  await click('.cd-sidebar nav button:nth-child(5)'); await heading('Báo cáo thống kê');
  await click('.cd-sidebar nav button:first-child'); await heading('Tổng quan');
  await click('.cd-action:nth-child(4)'); await heading('Báo cáo thống kê');
  await click('.cd-sidebar nav button:first-child'); await heading('Tổng quan');
  await click('.ad-inventory-link'); await heading('Quản lý lô & kho'); await click('.cd-sidebar nav button:first-child');
  await click('.cd-notification-button'); assert.equal(await evaluate('document.activeElement.classList.contains("ad-alert-panel")'),true);
  for(const width of [1920,1024,768,375,320]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Overflow '+width);
    const cols = await evaluate('getComputedStyle(document.querySelector(".cd-statistics")).gridTemplateColumns.split(" ").length');
    assert.equal(cols,width>1024?4:width>768?2:1);
  }
  await click('.cd-mobile-toggle'); assert.equal(await evaluate('document.querySelector(".cd-mobile-toggle").getAttribute("aria-expanded")'),'true');
  await click('.cd-sidebar nav button:first-child');
  assert.equal(await evaluate('document.querySelector(".cd-mobile-toggle").getAttribute("aria-expanded")'),'false');
  await click('.cd-sidebar-bottom button'); assert.ok(await evaluate('!!document.querySelector(".login-page")'));
  assert.deepEqual(errors,[]);
  console.log('PASS: Admin preview/sidebar/header/stats/inventory/alerts/activities/actions, callbacks, notification focus, mobile menu, logout, five responsive widths.');
} finally { ws.close(); }



