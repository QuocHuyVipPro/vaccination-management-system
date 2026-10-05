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
async function select(selector,value){await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');await pause();}
async function action(mode){await click('.ai-actions summary');await click('.ai-'+mode);}
const count=()=>evaluate('document.querySelectorAll(".ai-table tbody tr").length');
try {
 await cdp('Runtime.enable');await cdp('Page.navigate',{url:'http://localhost:5173/?preview=admin'});
 for(let i=0;i<50;i++){if(await evaluate('!!document.querySelector(".admin-dashboard")'))break;await pause();}
 await click('.ad-inventory-link');await heading('Quản lý lô & kho');await nav(4,'Quản lý lô & kho');
 assert.equal(await count(),8);assert.equal(await evaluate('document.querySelector(".cd-stat-value").textContent'),'191');
 await fill('#ai-search','HPV240801');assert.equal(await count(),1);
 await action('view');
 assert.ok(await evaluate('[...document.querySelectorAll(".ai-modal dl div")].some(e=>e.querySelector("dt").textContent==="Số lượng đã sử dụng" && e.querySelector("dd").textContent==="25")'));
 await click('.ai-close');await fill('#ai-search','');await select('#ai-vaccine-filter','2');assert.equal(await count(),2);
 await select('#ai-status','empty');assert.equal(await count(),0);await select('#ai-vaccine-filter','all');assert.equal(await count(),1);
 await select('#ai-status','all');await fill('#ai-search','khong ton tai');assert.equal(await count(),0);await fill('#ai-search','');
 await click('.ai-add');await fill('#ai-importDate','');await click('.ai-save');assert.equal(await evaluate('document.querySelectorAll(".ai-error").length'),6);
 await select('#ai-vaccineId','1');await fill('#ai-batchNumber',' hpv240801 ');await fill('#ai-manufactureDate','2026-08-01');await fill('#ai-expiryDate','2026-07-01');await fill('#ai-importedQuantity','-2');await fill('#ai-purchasePrice','-1');await fill('#ai-importDate','2026-10-05');await click('.ai-save');
 assert.equal(await evaluate('document.querySelectorAll(".ai-error").length'),4);
 await fill('#ai-batchNumber','TEST-NEW');await fill('#ai-expiryDate','2027-08-01');await fill('#ai-importedQuantity','20');await fill('#ai-purchasePrice','0');await click('.ai-save');
 assert.equal(await count(),9);assert.equal(await evaluate('document.querySelector(".cd-stat-value").textContent'),'211');
 await fill('#ai-search','TEST-NEW');await action('adjust');await fill('#ai-quantity','-1');await click('.ai-save');assert.equal(await evaluate('document.querySelectorAll(".ai-error").length'),2);
 await fill('#ai-quantity','23');await fill('#ai-reason','Kiểm kê thực tế');await click('.ai-close');assert.ok(await evaluate('document.querySelector(".ai-table tbody tr").textContent.includes("20")'));
 await action('adjust');await fill('#ai-quantity','23');await fill('#ai-reason','Kiểm kê thực tế');await click('.ai-save');
 assert.equal(await evaluate('document.querySelector(".cd-stat-value").textContent'),'214');
 await action('adjust');await fill('#ai-quantity','21');await fill('#ai-reason','Sai lệch số liệu');await click('.ai-save');
 await action('discard');await fill('#ai-quantity','22');await fill('#ai-reason','Hư hỏng');await click('.ai-save');
 assert.ok(await evaluate('!!document.querySelector("#ai-quantity-error")'));
 await fill('#ai-quantity','2');await click('.ai-save');assert.equal(await evaluate('document.querySelector(".cd-stat-value").textContent'),'210');
 await click('.ai-tabs button:nth-child(2)');assert.equal(await count(),8);
 await fill('#ai-transaction-search','TEST-NEW');assert.equal(await count(),4);
 assert.deepEqual(await evaluate('[...document.querySelectorAll(".ai-table tbody tr")].map(e=>e.children[4].textContent)'),['-2','-2','+3','+20']);
 await select('#ai-type','DIEU_CHINH');assert.equal(await count(),2);
 await select('#ai-type','HUY');assert.equal(await count(),1);
 assert.ok(await evaluate('document.querySelector(".ai-table tbody").textContent.includes("Hư hỏng")'));
 await select('#ai-type','all');await fill('#ai-transaction-search','tran thi lan');assert.equal(await count(),1);
 await fill('#ai-transaction-search','no match');assert.equal(await count(),0);await fill('#ai-transaction-search','');
 for(const width of [1920,1024,375,320]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
 assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'transactions '+width);
 await click('.ai-tabs button:first-child');assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'batches '+width);
 await action('adjust');assert.ok(await evaluate('document.querySelector(".ai-modal").scrollWidth<=document.querySelector(".ai-modal").clientWidth'),'modal '+width);await click('.ai-close');
 await click('.ai-tabs button:nth-child(2)');
 }
 await nav(1,'Tổng quan');await nav(2,'Quản lý tài khoản');await nav(3,'Quản lý vắc xin');await nav(4,'Quản lý lô & kho');assert.equal(await count(),9);
 await fill('#ai-search','TEST-NEW');await action('discard');await fill('#ai-quantity','19');await fill('#ai-reason','Loại bỏ hết');await click('.ai-save');
 assert.ok(await evaluate('document.querySelector(".ai-badge").textContent==="Hết hàng"'));
 assert.equal(await count(),1);
 assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>/Xóa lô|Chỉnh sửa/.test(e.textContent))'),false);
 await click('.cd-sidebar-bottom button');assert.ok(await evaluate('!!document.querySelector(".login-page")'));assert.deepEqual(errors,[]);
 console.log('PASS: Inventory navigation, batch filters/details/used qty, import validation/duplicate, adjust up/down/cancel, discard bounds, signed transaction history/search/type filters, state persistence, empty states and four responsive widths.');
} finally {ws.close();}
