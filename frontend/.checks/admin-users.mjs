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
async function select(value) { await evaluate('(()=>{const e=document.querySelector("#au-status");e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()'); await pause(); }
const count = () => evaluate('document.querySelectorAll(".au-table tbody tr").length');
const stats = () => evaluate('[...document.querySelectorAll(".cd-stat-value")].map(e=>e.textContent)');
async function action(name) { await click('.au-actions summary'); await click('.au-'+name); }
try {
 await cdp('Runtime.enable'); await cdp('Page.navigate',{url:'http://localhost:5173/?preview=admin'});
 for(let i=0;i<50;i++){if(await evaluate('!!document.querySelector(".admin-dashboard")'))break;await pause();}
 await click('.cd-action:first-child'); await heading('Quản lý tài khoản'); await nav(2,'Quản lý tài khoản');
 assert.deepEqual(await stats(),['8','5','3','1']); assert.equal(await count(),8);
 await fill('#au-search','nguyen van an'); assert.equal(await count(),1);
 assert.equal(await evaluate('!!document.querySelector(".au-edit")'),false);
 await action('view'); assert.ok(await evaluate('document.querySelector(".au-modal").textContent.includes("nguyenvanan@gmail.com")'));
 assert.equal(await evaluate('document.querySelectorAll(".au-modal input").length'),0); await click('.au-close');
 await fill('#au-search','lan@tiemchungcare.vn'); assert.equal(await count(),1);
 await fill('#au-search','0967890123'); assert.equal(await count(),1);
 await fill('#au-search',''); await select('false'); assert.equal(await count(),1);
 await click('.au-tabs button:nth-child(3)'); assert.equal(await count(),0);
 await select('all'); assert.equal(await count(),3); await click('.au-tabs button:first-child');
 await click('.au-add'); await click('.au-save'); assert.equal(await evaluate('document.querySelectorAll(".au-error").length'),5);
 await fill('#au-fullName','Nhân Viên Kiểm Thử'); await fill('#au-email','invalid'); await fill('#au-phone','0987654321');
 await fill('#au-password','123'); await fill('#au-confirmPassword','456'); await click('.au-save');
 assert.equal(await evaluate('document.querySelectorAll(".au-error").length'),3);
 await fill('#au-email','LAN@TIEMCHUNGCARE.VN'); await fill('#au-password','TestPass123'); await fill('#au-confirmPassword','TestPass123'); await click('.au-save');
 assert.ok(await evaluate('document.querySelector("#au-email-error").textContent.includes("đã được sử dụng")'));
 await fill('#au-email','new.employee@example.com'); await click('.au-save');
 assert.equal(await evaluate('!!document.querySelector(".au-modal")'),false); assert.deepEqual(await stats(),['9','5','4','1']);
 await fill('#au-search','new.employee@example.com'); assert.equal(await count(),1);
 assert.equal(await evaluate('document.body.textContent.includes("TestPass123")'),false);
 await action('view'); assert.equal(await evaluate('document.querySelector(".au-modal").textContent.includes("Mật khẩu")'),false); await click('.au-close');
 await action('edit'); assert.equal(await evaluate('document.querySelectorAll("input[type=password]").length'),0);
 await fill('#au-fullName','Nhân Viên Đã Sửa'); await fill('#au-email','lan@tiemchungcare.vn'); await click('.au-save');
 assert.ok(await evaluate('!!document.querySelector("#au-email-error")')); await fill('#au-email','new.employee@example.com'); await click('.au-save');
 assert.ok(await evaluate('document.querySelector(".au-person").textContent.includes("Đã Sửa")'));
 await action('toggle'); assert.deepEqual(await stats(),['9','5','4','1']); await click('.au-close'); assert.deepEqual(await stats(),['9','5','4','1']);
 await action('toggle'); await click('.au-confirm'); assert.deepEqual(await stats(),['9','5','4','2']);
 assert.equal(await evaluate('document.querySelector(".au-toggle").textContent'),'Mở khóa tài khoản');
 await action('toggle'); await click('.au-confirm'); assert.deepEqual(await stats(),['9','5','4','1']);
 await nav(1,'Tổng quan'); await nav(2,'Quản lý tài khoản'); assert.deepEqual(await stats(),['9','5','4','1']);
 assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>/Xóa|Thêm khách hàng/.test(e.textContent))'),false);
 for(const width of [1920,1024,375,320]) {
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
 assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'overflow '+width);
 await click('.au-add'); assert.ok(await evaluate('document.querySelector(".au-modal").getBoundingClientRect().width<=innerWidth')); await click('.au-close');
 }
 await click('.cd-sidebar-bottom button'); assert.ok(await evaluate('!!document.querySelector(".login-page")'));
 assert.deepEqual(errors,[]);
 console.log('PASS: Admin users navigation, search/role/status, detail, create/edit validation/duplicate email, password exclusion, cancel/lock/unlock, live stats/persistence and four responsive widths.');
} finally { ws.close(); }
