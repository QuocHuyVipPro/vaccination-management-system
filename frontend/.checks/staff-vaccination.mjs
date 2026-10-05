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
  await evaluate('(() => { const e=document.querySelector('+JSON.stringify(selector)+'); e.value='+JSON.stringify(value)+'; e.dispatchEvent(new Event("change",{bubbles:true})); })()'); await pause();
}
async function textArea(selector,value) {
  await evaluate('(() => { const e=document.querySelector('+JSON.stringify(selector)+'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(e,'+JSON.stringify(value)+'); e.dispatchEvent(new Event("input",{bubbles:true})); })()'); await pause();
}
const step = () => evaluate('document.querySelector(".sv-stepper [aria-current=step]").textContent');
try {
  await cdp('Runtime.enable');
  await cdp('Page.navigate',{url:'http://localhost:5173/?preview=staff'});
  for(let i=0;i<50;i++) { if(await evaluate('!!document.querySelector(".staff-dashboard")')) break; await pause(); }
  await nav(4,'Ghi nhận tiêm chủng');
  assert.equal(await evaluate('document.querySelectorAll(".sv-choice").length'),6);
  assert.ok((await step()).includes('Chọn lịch hẹn'));
  await click('.sv-next'); assert.ok((await step()).includes('Chọn lịch hẹn'));
  assert.ok(await evaluate('!!document.querySelector("[role=alert]")'));
  await fill('#sv-search','LH20261004003'); assert.equal(await evaluate('document.querySelectorAll(".sv-choice").length'),0);
  await fill('#sv-search','nguyen minh anh'); assert.equal(await evaluate('document.querySelectorAll(".sv-choice").length'),1);
  await click('.sv-choice input'); await click('.sv-next');
  assert.ok((await step()).includes('Kiểm tra thông tin'));
  assert.ok(await evaluate('document.querySelector(".sv-content").textContent.includes("Nguyễn Văn An")'));
  assert.equal(await evaluate('!!document.querySelector(".sv-warning")'),false);
  await click('.sv-next');
  assert.equal(await evaluate('document.querySelectorAll("input[readonly]").length'),2);
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#sv-batch option")].map(e=>e.value)'),['','1','2']);
  await fill('#sv-date',''); await click('.sv-next');
  assert.ok(await evaluate('!!document.querySelector("#sv-date-error") && !!document.querySelector("#sv-batch-error")'));
  await fill('#sv-date','2026-10-08'); await select('#sv-batch','1');
  assert.ok(await evaluate('document.querySelector(".sv-batch-info").textContent.includes("25 liều")'));
  await click('#sv-has-next'); await click('.sv-next');
  assert.ok(await evaluate('!!document.querySelector("#sv-nextDate-error")'));
  await fill('#sv-next-date','2026-10-07'); await click('.sv-next');
  assert.ok((await step()).includes('Ghi nhận tiêm'));
  await fill('#sv-next-date','2026-12-08');
  await textArea('#sv-note','Ghi chú kiểm thử'); await textArea('#sv-reaction','Không ghi nhận');
  await click('.sv-next');
  const summary = await evaluate('document.querySelector(".sv-summary").textContent');
  for(const value of ['Nguyễn Minh Anh','HPV240801','08/10/2026','08/12/2026','Trần Thị Lan','Ghi chú kiểm thử']) assert.ok(summary.includes(value),value);
  await click('.sv-back'); assert.equal(await evaluate('document.querySelector("#sv-note").value'),'Ghi chú kiểm thử');
  await click('#sv-has-next'); await click('.sv-next');
  assert.ok(await evaluate('document.querySelector(".sv-summary section:last-child").textContent.includes("Không có")'));
  for(const width of [1920,1024,375]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    for(let i=4;i>1;i--) { assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'overflow '+width+' step '+i); await click('.sv-back'); }
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'step1 '+width);
    await click('.sv-next'); await click('.sv-next'); await click('.sv-next');
  }
  await evaluate('document.querySelector(".sv-finish").click(); document.querySelector(".sv-finish")?.click()'); await pause();
  assert.equal(await evaluate('document.querySelector(".sv-modal").open'),true);
  assert.ok(await evaluate('document.querySelector(".sv-modal").textContent.includes("Ghi nhận tiêm thành công!")'));
  assert.ok(await evaluate('document.querySelector(".sv-modal").getBoundingClientRect().width <= innerWidth'));
  await evaluate('window.calls=[]; console.log=(...args)=>window.calls.push(args)');
  await click('.sv-history'); await heading('Lịch sử tiêm'); assert.equal(await evaluate('document.querySelector("#sh-patient").value'),'2'); assert.equal(await evaluate('document.querySelectorAll(".sh-table tbody tr").length'),3);
  await nav(1,'Tổng quan');
  await nav(2,'Quản lý lịch hẹn');
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".cd-stat-value")].map(e=>e.textContent)'),['12','4','5','3']);
  await fill('#sa-search','LH20261008001');
  assert.equal(await evaluate('document.querySelector(".sa-table tbody tr").dataset.status'),'completed');
  assert.equal(await evaluate('!!document.querySelector(".sa-record")'),false);
  await fill('#sa-search','tran ngoc mai'); await click('.sa-record'); await heading('Ghi nhận tiêm chủng');
  assert.ok((await step()).includes('Kiểm tra thông tin'));
  assert.ok(await evaluate('document.querySelector(".sv-warning").textContent.includes("Dị ứng hải sản")'));
  await click('.sv-next'); assert.deepEqual(await evaluate('[...document.querySelectorAll("#sv-batch option")].map(e=>e.value)'),['','5']);
  await nav(3,'Tra cứu người tiêm'); await fill('#sp-search','nguyen van an'); await click('.sp-view'); await click('.sp-record');
  await heading('Ghi nhận tiêm chủng');
  assert.ok((await step()).includes('Chọn lịch hẹn'));
  assert.equal(await evaluate('document.querySelectorAll(".sv-choice").length'),1);
  assert.ok(await evaluate('document.querySelector(".sv-choice").textContent.includes("Nguyễn Văn An")'));
  await nav(4,'Ghi nhận tiêm chủng'); assert.equal(await evaluate('document.querySelectorAll(".sv-choice").length'),5);
  await click('.cd-notification-button'); await click('.sd-close');
  await click('.cd-sidebar-bottom button'); assert.equal(await evaluate('!!document.querySelector(".login-page")'),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: Vaccination four steps, confirmed-only selection, search, preselection, patient/allergy data, batch filtering, validation, back-state, next dose toggles, summary, duplicate-submit guard, success, shared completion, callbacks, responsive and logout.');
} finally { ws.close(); }

