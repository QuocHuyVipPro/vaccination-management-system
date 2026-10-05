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
async function action(name) { await click('.av-actions summary'); await click('.av-'+name); }
const count = () => evaluate('document.querySelectorAll(".av-table tbody tr").length');
const stats = () => evaluate('[...document.querySelectorAll(".cd-stat-value")].map(e=>e.textContent)');
async function status(value) { await evaluate('(()=>{const e=document.querySelector("#av-status");e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');await pause();}
try {
 await cdp('Runtime.enable'); await cdp('Page.navigate',{url:'http://localhost:5173/?preview=admin'});
 for(let i=0;i<50;i++){if(await evaluate('!!document.querySelector(".admin-dashboard")'))break;await pause();}
 await click('.cd-action:nth-child(2)'); await heading('Quản lý vắc xin'); await nav(3,'Quản lý vắc xin');
 assert.deepEqual(await stats(),['6','4','2']);
 await fill('#av-search','hpv');assert.equal(await count(),1);
 assert.ok(await evaluate('document.querySelector(".av-table").textContent.includes("2.900.000 đ")'));
 await action('view'); assert.ok(await evaluate('document.querySelector(".av-modal").textContent.includes("Sau mũi trước 60 ngày")'));await click('.av-close');
 await fill('#av-search','merck');assert.equal(await count(),2);
 await fill('#av-search','thuy dau');assert.equal(await count(),1);
 await status('false');assert.equal(await count(),0);await status('all');await fill('#av-search','');
 await click('.av-add');await click('.av-save');assert.equal(await evaluate('document.querySelectorAll(".av-error").length'),4);
 await fill('#av-name','  hpv gardasil 9  ');await fill('#av-manufacturer','Demo');await fill('#av-diseasePrevention','Bệnh mẫu');await fill('#av-price','-1');await click('.av-save');
 assert.equal(await evaluate('document.querySelectorAll(".av-error").length'),2);
 await fill('#av-name','Vắc xin thử nghiệm UI');await fill('#av-price','500000');await click('.av-save');
 assert.deepEqual(await stats(),['7','5','2']);await fill('#av-search','thử nghiệm UI');
 await action('edit');await fill('#av-name','Varivax');await click('.av-save');assert.ok(await evaluate('!!document.querySelector("#av-name-error")'));
 await fill('#av-name','Vắc xin thử nghiệm UI');await fill('#av-price','600000');await click('.av-save');
 assert.ok(await evaluate('document.querySelector(".av-table").textContent.includes("600.000 đ")'));
 await action('schedule');assert.ok(await evaluate('document.querySelector(".av-modal").textContent.includes("Vắc xin này chưa có phác đồ tiêm.")'));
 await click('.av-dose-add');await fill('#av-doseNumber','0');await fill('#av-intervalDays','-1');await click('.av-dose-save');
 assert.equal(await evaluate('document.querySelectorAll(".av-error").length'),3);
 await fill('#av-doseNumber','1');await fill('#av-doseName','Mũi đầu tiên');await fill('#av-intervalDays','0');await click('.av-dose-save');
 assert.equal(await evaluate('document.querySelectorAll(".av-dose-list li").length'),1);
 await click('.av-dose-add');await fill('#av-doseNumber','1');await fill('#av-doseName','Mũi 2');await fill('#av-intervalDays','60');await click('.av-dose-save');
 assert.ok(await evaluate('document.querySelector("#av-doseNumber-error").textContent.includes("đã tồn tại")'));
 await fill('#av-doseNumber','2');await click('.av-dose-save');
 await click('.av-dose-list li:nth-child(2) .av-dose-edit');await fill('#av-doseNumber','1');await click('.av-dose-save');assert.ok(await evaluate('!!document.querySelector("#av-doseNumber-error")'));
 await fill('#av-doseNumber','2');await fill('#av-doseName','Mũi nhắc');await fill('#av-intervalDays','90');await click('.av-dose-save');
 assert.ok(await evaluate('document.querySelector(".av-dose-list").textContent.includes("90 ngày")'));
 await click('.av-dose-list li:nth-child(2) .av-dose-delete');assert.equal(await evaluate('document.querySelectorAll(".av-dose-list li").length'),2);
 await click('.av-cancel-delete');assert.equal(await evaluate('document.querySelectorAll(".av-dose-list li").length'),2);
 await click('.av-dose-list li:nth-child(2) .av-dose-delete');await click('.av-confirm-delete');assert.equal(await evaluate('document.querySelectorAll(".av-dose-list li").length'),1);
 await click('.av-close');assert.ok(await evaluate('document.querySelector(".av-table").textContent.includes("1 mũi")'));
 await action('toggle');assert.deepEqual(await stats(),['7','5','2']);await click('.av-close');assert.deepEqual(await stats(),['7','5','2']);
 await action('toggle');await click('.av-confirm');assert.deepEqual(await stats(),['7','4','3']);
 assert.equal(await evaluate('document.querySelector(".av-toggle").textContent'),'Kích hoạt lại');await action('toggle');await click('.av-confirm');assert.deepEqual(await stats(),['7','5','2']);
 await nav(2,'Quản lý tài khoản');await nav(1,'Tổng quan');await nav(3,'Quản lý vắc xin');assert.deepEqual(await stats(),['7','5','2']);
 await fill('#av-search','thử nghiệm UI');await action('view');assert.ok(await evaluate('document.querySelector(".av-modal").textContent.includes("Mũi đầu tiên")'));await click('.av-close');
 assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent.includes("Xóa vắc xin"))'),false);
 for(const width of [1920,1024,375,320]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
 assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'page overflow '+width);
 await action('schedule');await click('.av-dose-add');
 assert.ok(await evaluate('document.querySelector(".av-modal").scrollWidth<=document.querySelector(".av-modal").clientWidth'),'modal overflow '+width);
 await click('.av-close');
 }
 await click('.cd-sidebar-bottom button');assert.ok(await evaluate('!!document.querySelector(".login-page")'));
 assert.deepEqual(errors,[]);
 console.log('PASS: Admin vaccines navigation/search/filter/price, create/edit validation, schedule add/edit/duplicate/negative checks/delete confirmation, status confirmation/reactivation, state persistence, responsive and logout.');
} finally { ws.close(); }
