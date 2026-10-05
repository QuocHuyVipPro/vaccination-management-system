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
  await click('.cd-action:nth-child(2)'); await heading('Tra cứu người tiêm');
  await nav(3,'Tra cứu người tiêm');
  const count = () => evaluate('document.querySelectorAll(".sp-table tbody tr").length');
  const setGender = async (value) => {
    await evaluate('(() => { const e = document.querySelector("#sp-gender"); e.value = '+JSON.stringify(value)+'; e.dispatchEvent(new Event("change",{bubbles:true})); })()');
    await pause();
  };
  assert.equal(await count(),8);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".cd-stat-value")].map(e=>e.textContent)'),['8','3','6']);
  await fill('#sp-search','NGUYỄN MINH ANH'); assert.equal(await count(),1);
  await fill('#sp-search','  nguyen minh anh  '); assert.equal(await count(),1);
  await fill('#sp-search','0901 234 567'); assert.equal(await count(),2);
  await setGender('Nữ'); assert.equal(await count(),1);
  await click('.sp-view');
  assert.equal(await evaluate('document.querySelector(".sp-modal").open'),true);
  const detail = await evaluate('document.querySelector(".sp-modal").textContent');
  for(const value of ['Nguyễn Minh Anh','12/03/2015','Nữ','0901234567','Bình Dương','Nguyễn Văn An','Em','Không ghi nhận','Không có ghi chú đặc biệt','2 mũi','08/10/2026']) assert.ok(detail.includes(value),value);
  assert.equal(await evaluate('document.querySelectorAll(".sp-modal input,.sp-modal select,.sp-modal textarea").length'),0);
  await evaluate('window.patientCalls=[]; console.log=(...args)=>window.patientCalls.push(args)');
  await click('.sp-history'); await heading('Lịch sử tiêm'); assert.equal(await evaluate('document.querySelector("#sh-patient").value'),'2'); await nav(3,'Tra cứu người tiêm'); await fill('#sp-search','nguyen minh anh'); await click('.sp-view');
  
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await pause(); assert.equal(await evaluate('!!document.querySelector(".sp-modal")'),false);
  await setGender('all'); await fill('#sp-search','le hoang nam'); await click('.sp-view');
  assert.ok(await evaluate('document.querySelector(".sp-modal").textContent.includes("Không có") && document.querySelector(".sp-modal").textContent.includes("Chưa có lịch")'));
  await click('.sp-close');
  await fill('#sp-search','khong tim thay');
  assert.ok(await evaluate('document.querySelector(".sp-empty").textContent.includes("Không tìm thấy người tiêm")'));
  await fill('#sp-search',''); await setGender('Nam'); assert.equal(await count(),4);
  await setGender('Nữ'); assert.equal(await count(),4); await setGender('all');
  assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>/Chỉnh sửa|Xóa/.test(e.textContent))'),false);
  for(const width of [1920,1024,768,375]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),'Overflow '+width);
    await click('.sp-view');
    assert.ok(await evaluate('document.querySelector(".sp-modal").getBoundingClientRect().width <= innerWidth'),'Modal '+width);
    await click('.sp-close');
  }
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".sp-table tbody tr")).display'),'block');
  await nav(2,'Quản lý lịch hẹn'); await nav(1,'Tổng quan'); await nav(3,'Tra cứu người tiêm');
  await click('.cd-notification-button'); assert.equal(await evaluate('document.querySelector(".sd-modal").open'),true); await click('.sd-close');
  await click('.cd-sidebar-bottom button'); assert.equal(await evaluate('!!document.querySelector(".login-page")'),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: Staff patients search/name/phone/gender, 8/3/6 stats, read-only profile data, patient callbacks, Escape, empty state, navigation, alerts, logout, 4 responsive widths.');
} finally { ws.close(); }


