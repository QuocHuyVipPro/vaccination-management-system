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
try {
  await cdp('Runtime.enable');
  await cdp('Page.navigate',{url:'http://localhost:5173/?preview=staff'});
  for(let i=0;i<50;i++) { if(await evaluate('!!document.querySelector(".staff-dashboard")')) break; await pause(); }
  assert.equal(await evaluate('document.querySelectorAll(".cd-sidebar nav button").length'),5);
  assert.equal(await evaluate('document.querySelectorAll("[aria-current=page]").length'),1);
  assert.equal(await evaluate('document.querySelector(".cd-account-name strong").textContent'),'Trần Thị Lan');
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".cd-stat-value")].map(e=>e.textContent)'),['12','4','7','3']);
  assert.equal(await evaluate('document.querySelectorAll(".sd-appointments > li").length'),4);
  assert.equal(await evaluate('document.querySelectorAll(".cd-action").length'),3);
  await click('.sd-row-actions .cd-text-button');
  assert.equal(await evaluate('document.querySelector(".sd-modal").open'),true);
  await click('.sd-close');
  await click('.sd-row-actions .cd-button-primary');
  assert.equal(await evaluate('document.querySelectorAll(".sd-pending").length'),0);
  assert.equal(await evaluate('document.querySelectorAll(".cd-stat-value")[1].textContent'),'3');
  await click('.sd-alert-link'); assert.equal(await evaluate('document.querySelector(".sd-modal").open'),true); await click('.sd-close');
  for(const width of [1920,1024,375]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),`Overflow at ${width}`);
  }
  await click('.cd-mobile-toggle');
  assert.equal(await evaluate('document.querySelector(".cd-mobile-toggle").getAttribute("aria-expanded")'),'true');
  await click('.cd-sidebar-bottom button');
  assert.equal(await evaluate('!!document.querySelector(".login-page")'),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: Staff menu/header/stats/list/actions, appointment detail/confirmation, vaccine alerts, mobile menu, logout and 3 responsive widths.');
} finally { ws.close(); }
