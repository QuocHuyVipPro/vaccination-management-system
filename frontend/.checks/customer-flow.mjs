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
  await cdp('Page.navigate', { url: 'http://localhost:5173/' });
  for(let i=0;i<50;i++) { if(await evaluate('!!document.querySelector(".login-page")')) break; await pause(); }
  await heading('ĐĂNG NHẬP');
  await click('.login-register-link'); await heading('ĐĂNG KÝ TÀI KHOẢN');
  await click('.register-login-link'); await heading('ĐĂNG NHẬP');
  await click('.login-submit'); await heading('ĐĂNG NHẬP');
  await fill('#email','an@example.com'); await fill('#password','demo123');
  await click('.login-submit'); await heading('Tổng quan');
  for (const [index,name] of [[2,'Hồ sơ người tiêm'],[3,'Đăng ký tiêm'],[4,'Lịch hẹn'],[5,'Lịch sử tiêm'],[6,'Thông báo'],[1,'Tổng quan']]) await nav(index,name);
  await click('.cd-action'); await heading('Đăng ký tiêm');
  assert.equal(await evaluate('document.querySelector(".vr-next").disabled'),true);
  await click('.vr-profile'); await click('.vr-next');
  assert.equal(await evaluate('document.querySelectorAll(".vr-choice:disabled").length'),1);
  await click('.vr-choice'); await click('.vr-next');
  const date = await evaluate('document.querySelector("#vr-date").min');
  await fill('#vr-date',date); await click('.vr-time:not(:disabled)'); await click('.vr-next');
  await click('.vr-actions > button:first-child');
  assert.equal(await evaluate('document.querySelector("#vr-date").value'),date);
  assert.equal(await evaluate('document.querySelectorAll(".vr-time-selected").length'),1);
  await click('.vr-next'); await click('.vr-next');
  assert.equal(await evaluate('document.querySelector(".vr-success").open'),true);
  await click('.vr-success-actions button'); await heading('Lịch hẹn');
  await click('.ap-heading button'); await heading('Đăng ký tiêm');
  await nav(6,'Thông báo'); await click('.nt-item');
  assert.equal(await evaluate('document.querySelector(".nt-modal").open'),true);
  await click('.nt-modal-footer .cd-button-primary'); await heading('Lịch hẹn');
  await click('.cd-notification-button'); await heading('Thông báo');
  await click('.cd-sidebar-bottom button'); await heading('ĐĂNG NHẬP');
  assert.equal(await evaluate('!!document.querySelector(".customer-dashboard")'),false);
  await click('.login-register-link');
  for(const [selector,value] of [['#register-fullName','Demo User'],['#register-email','demo@example.com'],['#register-password','demo123'],['#register-confirmPassword','demo123']]) await fill(selector,value);
  await click('#register-agreeTerms'); await click('.register-submit'); await heading('ĐĂNG NHẬP');
  await fill('#email','demo@example.com'); await fill('#password','demo123'); await click('.login-submit');
  for (const [action,name] of [[2,'Lịch hẹn'],[3,'Lịch sử tiêm']]) {
    await click(`.cd-action:nth-child(${action})`); await heading(name); await nav(1,'Tổng quan');
  }
  await click('.cd-appointment-footer button'); await heading('Lịch hẹn');
  await click('.ap-cancel-button'); assert.equal(await evaluate('document.querySelector(".ap-modal").open'),true);
  await click('.ap-danger'); assert.equal(await evaluate('document.querySelectorAll(".ap-cancelled").length'),1);
  await nav(2,'Hồ sơ người tiêm'); await click('.pp-page-heading button');
  await fill('#pp-fullName','Demo Profile'); await fill('#pp-dateOfBirth','2000-01-01');
  await click('.pp-modal-footer .cd-button-primary'); await heading('Hồ sơ người tiêm');
  assert.equal(await evaluate('document.querySelectorAll(".pp-card").length'),3);
  await click('.pp-card:last-child .pp-card-actions button:last-child'); await fill('#pp-fullName','Edited Profile');
  await click('.pp-modal-footer .cd-button-primary');
  assert.equal(await evaluate('document.querySelector(".pp-card:last-child h2").textContent'),'Edited Profile');
  await nav(6,'Thông báo'); await click('.nt-mark-all');
  assert.equal(await evaluate('document.querySelector(".nt-mark-all").disabled'),true);
  assert.equal(await evaluate('document.querySelectorAll(".cd-nav-count").length'),0);
  for(const width of [1920,1024,375]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    for(const [index,name] of [[1,'Tổng quan'],[2,'Hồ sơ người tiêm'],[3,'Đăng ký tiêm'],[4,'Lịch hẹn'],[5,'Lịch sử tiêm'],[6,'Thông báo']]) {
      if(width<=768) await click('.cd-mobile-toggle');
      await nav(index,name);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), `${name} overflow at ${width}`);
    }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: auth round trip, invalid login, valid login/register, six sidebar pages and active menus, all quick actions, four-step flow/back state/success, appointment cancel/links, profile add/edit, notification modal/bell/read-all, logout, 18 page/viewport overflow checks.');
} finally { ws.close(); }
