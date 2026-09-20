const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
function setup(options = {}) {
  let handler; const sent = [];
  const env = { PUBLIC_BASE_URL: 'https://scorestems.example', DOWNLOAD_SECRET: 'test-only-signing-secret', RESEND_API_KEY: 'test-only', EMAIL_FROM: 'test@scorestems.example', ...options.env };
  const source = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  const fakeFs = { ...fs, existsSync: file => file.endsWith('.zip') ? !options.missingZip : fs.existsSync(file) };
  const module = { exports: {} };
  vm.runInNewContext(source, { require: name => name === './pack-links.json' ? require('./pack-links.json') : name === 'http' ? { createServer: fn => { handler = fn; return {}; } } : name === 'fs' ? fakeFs : require(name), module, __dirname, process: { env }, console, URL, Buffer, AbortSignal, fetch: async (_, init) => { sent.push(JSON.parse(init.body)); return { ok: !options.mailFailure }; } });
  async function request(url, body, method = 'POST', origin = env.PUBLIC_BASE_URL) {
    const req = new EventEmitter(); Object.assign(req, { url, method, headers: {host:'localhost', 'content-type':'application/json', origin}, destroy() {} });
    let status; let output;
    const res = { writeHead(code) { status=code; }, end(data) { output=data; } };
    const done = handler(req,res);
    req.emit('data', JSON.stringify(body)); req.emit('end'); await done;
    return { status, output };
  }
  async function webhook(event, signatureOverride) {
    const raw=JSON.stringify(event); const timestamp=Math.floor(Date.now()/1000);
    const signature=crypto.createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(timestamp+'.'+raw).digest('hex');
    const req={method:'POST',url:'/api/stripe/webhook',headers:{host:'localhost','stripe-signature':signatureOverride || 't='+timestamp+',v1='+signature},async *[Symbol.asyncIterator](){yield Buffer.from(raw);}};
    let status; await handler(req,{writeHead(n){status=n;},end(){}}); return status;
  }
  return { request, sent, env, webhook };
}
test('free request emails the correct Drive link without payment', async () => {
 const app=setup(); const result=await app.request('/api/downloads/request',{pack:'documentary',email:'listener@example.com'});
 assert.equal(result.status,200); assert.equal(JSON.parse(result.output).ok,true);
 assert.equal(app.sent.length,1); assert.match(app.sent[0].html,/No payment is required/);
 const url=new URL(app.sent[0].html.match(/href="([^"]+)"/)[1]);
 assert.equal(url.href, 'https://drive.google.com/file/d/1p_0g5ciEPfsL5Tz5fsDSPMaW8HapsIAl/view');
});
test('invalid pack, email and foreign origin send no email',async()=>{
 const app=setup();
 for(const body of [{pack:'no-synth',email:'a@b.com'},{pack:'documentary',email:'bad'},{pack:'documentary',email:'a@b.com',website:'bot'}]) assert.equal((await app.request('/api/downloads/request',body)).status,400);
 assert.equal((await app.request('/api/downloads/request',{pack:'documentary',email:'a@b.com'},'POST','https://other.example')).status,403);
 assert.equal(app.sent.length,0);
});
test('missing email configuration and provider failures do not report success',async()=>{
 for(const [opts,status] of [[{env:{RESEND_API_KEY:''}},503],[{mailFailure:true},502]]) {
 const app=setup(opts); assert.equal((await app.request('/api/downloads/request',{pack:'documentary',email:'a@b.com'})).status,status);
 }
});
test('recipient rate limit caps repeated email requests',async()=>{
 const app=setup(); for(let i=0;i<3;i++) assert.equal((await app.request('/api/downloads/request',{pack:'documentary',email:'a@b.com'})).status,200);
 assert.equal((await app.request('/api/downloads/request',{pack:'documentary',email:'a@b.com'})).status,429);assert.equal(app.sent.length,3);
});
test('private files and invalid or expired downloads are blocked',async()=>{
 const app=setup();
 for(const url of ['/server.js','/.env','/private-downloads/documentary.zip','/FREE_DOWNLOAD_SETUP.md']) assert.equal((await app.request(url,{},'GET')).status,404);
 for(const signature of ['bad','é'.repeat(64)]) assert.equal((await app.request('/downloads/documentary?expires=9999999999&signature='+signature,{},'GET')).status,403);
 assert.equal((await app.request('/downloads/documentary?expires=1&signature='+'a'.repeat(64),{},'GET')).status,403);
});

test('Stripe webhook validates signatures and only emails paid live checkouts',async()=>{
 const app=setup({env:{STRIPE_WEBHOOK_SECRET:'test-secret'}});
 const event={type:'checkout.session.completed',data:{object:{id:'cs_example',client_reference_id:'thriller',payment_status:'paid',livemode:true,payment_link:'plink_1UH5ocRx6nk19pNizhTsl3P7',customer_details:{email:'buyer@example.com'}}}};
 assert.equal(await app.webhook(event,'t=1,v1=bad'),400);assert.equal(app.sent.length,0);
 event.data.object.payment_status='unpaid';assert.equal(await app.webhook(event),200);assert.equal(app.sent.length,0);
 event.data.object.payment_status='paid';
 event.data.object.livemode=false;assert.equal(await app.webhook(event),200);assert.equal(app.sent.length,0);
 event.data.object.livemode=true;event.data.object.payment_link='unrelated-link';assert.equal(await app.webhook(event),200);assert.equal(app.sent.length,0);
 event.data.object.payment_link='plink_1UH5ocRx6nk19pNizhTsl3P7';assert.equal(await app.webhook(event),200);assert.equal(app.sent.length,1);
 assert.match(app.sent[0].html,/1EHb46bF7VM7zaH_q3oM9OEMd2gOYMBqS/);
});
