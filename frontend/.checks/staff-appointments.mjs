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
try {
  await cdp('Runtime.enable');
  await cdp('Page.navigate',{url:'http://localhost:5173/?preview=staff'});
  for(let i=0;i<50;i++) { if(await evaluate('!!document.querySelector(".staff-dashboard")')) break; await pause(); }
  await nav(2,'Quản lý lịch hẹn');
  const count = () => evaluate('document.querySelectorAll(".sa-table tbody tr").length');
  const stats = () => evaluate('[...document.querySelectorAll(".cd-stat-value")].map(e=>e.textContent)');
  assert.equal(await count(),12);
  assert.deepEqual(await stats(),['12','4','6','2']);
  await fill('#sa-search','le hoang nam'); assert.equal(await count(),1);
  await fill('#sa-date','2026-10-04'); assert.equal(await count(),1);
  await click('.sa-tabs button:nth-child(3)'); assert.equal(await count(),0);
  await click('.sa-tabs button:nth-child(2)'); assert.equal(await count(),1);
  await click('.sa-confirm'); assert.equal(await evaluate('document.querySelector(".sa-modal").open'),true);
  assert.deepEqual(await stats(),['12','4','6','2']);
  await click('.sa-close'); assert.deepEqual(await stats(),['12','4','6','2']);
  await click('.sa-confirm'); await click('.sa-modal footer .cd-button-primary');
  assert.deepEqual(await stats(),['12','3','7','2']);
  await click('.sa-tabs button:first-child'); assert.equal(await count(),1);
  assert.equal(await evaluate('!!document.querySelector(".sa-record")'),true);
  await click('.sa-view'); assert.ok(await evaluate('document.querySelector(".sa-modal").textContent.includes("0912345678")'));
  await click('.sa-close');
  await click('.sa-record'); await heading('Ghi nhận tiêm chủng'); await nav(2,'Quản lý lịch hẹn');
  await fill('#sa-search',''); await fill('#sa-date','');
  await click('.sa-tabs button:nth-child(4)'); assert.equal(await count(),2);
  assert.equal(await evaluate('document.querySelectorAll(".sa-record,.sa-confirm").length'),0);
  await click('.sa-tabs button:nth-child(5)'); assert.equal(await count(),0);
  await click('.sa-tabs button:first-child');
  await click('.sa-date-controls button');
  assert.equal(await evaluate('document.querySelector("#sa-date").value'),await evaluate('new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())'));
  await fill('#sa-date','');
  await click('.cd-sidebar nav button:first-child');
  await nav(2,'Quản lý lịch hẹn'); assert.deepEqual(await stats(),['12','3','7','2']);
  for(const width of [1920,1024,375]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Overflow '+width);
  }
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".sa-table tbody tr")).display'),'block');
  await click('.sa-view');
  assert.ok(await evaluate('document.querySelector(".sa-modal").getBoundingClientRect().width <= innerWidth'));
  await click('.sa-close');
  await click('.cd-sidebar-bottom button'); assert.equal(await evaluate('!!document.querySelector(".login-page")'),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: Staff appointments filters, confirm/cancel modal, details, stats, navigation persistence, actions, Today, mobile cards and responsive widths.');
} finally { ws.close(); }

