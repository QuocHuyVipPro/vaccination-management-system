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
  await evaluate('(() => {const e=document.querySelector('+JSON.stringify(selector)+'); e.value='+JSON.stringify(value)+'; e.dispatchEvent(new Event("change",{bubbles:true}));})()'); await pause();
}
const count = () => evaluate('document.querySelectorAll(".sh-table tbody tr").length');
try {
  await cdp('Runtime.enable');
  await cdp('Page.navigate',{url:'http://localhost:5173/?preview=staff'});
  for(let i=0;i<50;i++) { if(await evaluate('!!document.querySelector(".staff-dashboard")')) break; await pause(); }
  for(const [index,title] of [[1,'Tổng quan'],[2,'Quản lý lịch hẹn'],[3,'Tra cứu người tiêm'],[4,'Ghi nhận tiêm chủng'],[5,'Lịch sử tiêm']]) await nav(index,title);
  assert.equal(await count(),8);
  assert.equal(await evaluate('document.querySelector(".cd-stat-value").textContent'),'8');
  await fill('#sh-search','nguyen minh anh'); assert.equal(await count(),2);
  await fill('#sh-search','HPV Gardasil'); assert.equal(await count(),1);
  await fill('#sh-search','VAX260301'); assert.equal(await count(),3);
  await select('#sh-patient','1'); assert.equal(await count(),1);
  await select('#sh-vaccine','Prevenar 13'); assert.equal(await count(),0);
  await click('.sh-reset'); assert.equal(await count(),8);
  await fill('#sh-from','2026-09-15'); await fill('#sh-to','2026-09-15'); assert.equal(await count(),1);
  await click('.sh-view');
  const detail = await evaluate('document.querySelector(".sh-modal").textContent');
  for(const value of ['Nguyễn Văn An','15/06/2005','Vaxigrip Tetra','Mũi 1','15/09/2026','VAX260301','Trần Thị Lan','Đau nhẹ tại vị trí tiêm','Đã ghi nhận phản ứng sau tiêm','Không có lịch mũi tiếp theo']) assert.ok(detail.includes(value),value);
  assert.equal(await evaluate('document.querySelectorAll(".sh-modal input,.sh-modal select,.sh-modal textarea").length'),0);
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27}); await pause();
  assert.equal(await evaluate('!!document.querySelector(".sh-modal")'),false);
  await fill('#sh-from','2026-10-01'); assert.equal(await count(),0);
  assert.ok(await evaluate('!!document.querySelector("#sh-date-error")'));
  await click('.sh-reset');
  await select('#sh-patient','2'); await select('#sh-vaccine','HPV Gardasil 9');
  await fill('#sh-from','2026-08-08'); await fill('#sh-to','2026-08-08'); assert.equal(await count(),1);
  await click('.sh-view'); assert.ok(await evaluate('document.querySelector(".sh-modal").textContent.includes("08/10/2026")')); await click('.sh-close');
  await click('.sh-reset'); await select('#sh-patient','8'); assert.equal(await count(),0);
  assert.ok(await evaluate('document.querySelector(".sh-empty").textContent.includes("Thử thay đổi từ khóa hoặc bộ lọc.")'));
  await click('.sh-reset');
  assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>/Chỉnh sửa|Xóa/.test(e.textContent))'),false);
  for(const width of [1920,1024,768,375]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Overflow '+width);
    await click('.sh-view');
    assert.ok(await evaluate('document.querySelector(".sh-modal").getBoundingClientRect().width<=innerWidth'));
    await click('.sh-close');
  }
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".sh-table tbody tr")).display'),'block');
  await nav(3,'Tra cứu người tiêm'); await fill('#sp-search','nguyen minh anh'); await click('.sp-view'); await click('.sp-history');
  await heading('Lịch sử tiêm'); assert.equal(await evaluate('document.querySelector("#sh-patient").value'),'2'); assert.equal(await count(),2);
  await nav(5,'Lịch sử tiêm'); assert.equal(await count(),8);
  await nav(2,'Quản lý lịch hẹn'); await fill('#sa-search','LH20261008001'); await click('.sa-record');
  await heading('Ghi nhận tiêm chủng'); await click('.sv-next'); await select('#sv-batch','1');
  await click('#sv-has-next'); await fill('#sv-next-date','2026-12-08'); await click('.sv-next'); await click('.sv-finish');
  await click('.sv-history'); await heading('Lịch sử tiêm');
  assert.equal(await evaluate('document.querySelector("#sh-patient").value'),'2'); assert.equal(await count(),3);
  assert.equal(await evaluate('document.querySelector(".cd-stat-value").textContent'),'9');
  await click('.sh-view');
  const created = await evaluate('document.querySelector(".sh-modal").textContent');
  for(const value of ['Nguyễn Minh Anh','12/03/2015','Mũi 2','HPV240801','30/08/2027','08/10/2026','08/12/2026']) assert.ok(created.includes(value),value);
  await click('.sh-close'); await nav(1,'Tổng quan'); await nav(5,'Lịch sử tiêm'); assert.equal(await count(),9);
  await click('.cd-notification-button'); await click('.sd-close');
  await click('.cd-sidebar-bottom button'); assert.ok(await evaluate('!!document.querySelector(".login-page")'));
  assert.deepEqual(errors,[]);
  console.log('PASS: five Staff pages, history search and combined filters/reset/date bounds, modal data/read-only/Escape, empty state, patient navigation, completed vaccination to persisted history, 4 responsive widths, logout.');
} finally { ws.close(); }
