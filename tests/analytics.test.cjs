const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const raw = fs.readFileSync(require('node:path').join(__dirname, '../analytics.js'), 'utf8').replace(/const WEBSITE_ID = '[^']*';/, "const WEBSITE_ID = '';").replace(/const SCRIPT_URL = '[^']*';/, "const SCRIPT_URL = '';");
const configured = raw.replace("const WEBSITE_ID = '';", "const WEBSITE_ID = '00000000-0000-4000-8000-000000000000';").replace("const SCRIPT_URL = '';", "const SCRIPT_URL = 'https://cloud.umami.is/script.js';");
function run(options={}) {
 const ids = new Map(), events = [], scripts = [], body = [], nav = [], handlers = {}, store = new Map();
 if(options.pref) store.set('vyper-analytics-consent-v1',options.pref);
 let locked=!!options.locked, observer;
 const element = tag => ({tag,style:{},attrs:{},children:[],listeners:{},setAttribute(k,v){this.attrs[k]=v;},appendChild(el){this.children.push(el); if(el.id)ids.set(el.id,el);},addEventListener(k,f){this.listeners[k]=f;},remove(){ids.delete(this.id);}});
 const context={URL,URLSearchParams,Set,Promise,location:{hostname:options.host||'vyperspace.com',pathname:options.path||'/whitepaper.html',search:options.search||''},navigator:{globalPrivacyControl:!!options.gpc,doNotTrack:options.dnt},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},MutationObserver:class{constructor(cb){observer=cb;}observe(){}disconnect(){observer=null;}},document:{referrer:options.referrer||'https://example.com/private?email=x',documentElement:{classList:{contains:()=>locked}},createElement:element,getElementById:id=>ids.get(id),querySelector:()=>({appendChild:el=>nav.push(el)}),addEventListener:(k,f)=>handlers[k]=f,head:{appendChild:el=>{scripts.push(el);ids.set(el.id,el);}},body:{appendChild:el=>{body.push(el);ids.set(el.id,el);}}}};
 context.window={umami:{track:p=>{events.push(p);return Promise.resolve();}}};
 vm.runInNewContext(options.disabled?raw:configured,context);
 return {events,scripts,body,nav,store,allow(){const b=ids.get('vyper-analytics-choice');b.children[2].listeners.click();},deny(){const b=ids.get('vyper-analytics-choice');b.children[3].listeners.click();},load(){scripts[0].onload();},unlock(){locked=false;observer?.();},privacy(){nav[0].listeners.click();},contact(){handlers.click({target:{closest:()=>({})}});}};
}
test('disabled configuration never loads provider or changes UI',()=>{const r=run({disabled:true});assert.equal(r.scripts.length,0);assert.equal(r.body.length,0);});
test('local preview is not tracked',()=>assert.equal(run({host:'localhost',pref:'yes'}).scripts.length,0));
test('GPC and DNT prevent any provider load',()=>{assert.equal(run({gpc:true,pref:'yes'}).scripts.length,0);assert.equal(run({dnt:'1',pref:'yes'}).scripts.length,0);});
test('no tracking before consent and rejection loads no provider',()=>{const r=run();assert.equal(r.scripts.length,0);r.deny();assert.equal(r.scripts.length,0);});
test('acceptance loads only manually controlled tracker and records page plus opened',()=>{const r=run();r.allow();assert.equal(r.scripts.length,1);assert.equal(r.scripts[0].attrs['data-auto-track'],'false');r.load();assert.equal(r.events.length,2);assert.equal(r.events[1].name,'whitepaper_opened');});
test('locked whitepaper is not recorded as opened',()=>{const r=run({pref:'yes',locked:true});r.load();assert.equal(r.events.length,1);r.unlock();r.unlock();assert.equal(r.events.length,2);});
test('sensitive query/title/referrer content never enters payload',()=>{const r=run({pref:'yes',search:'?email=secret@example.com&utm_campaign=person-name#secret'});r.load();const p=r.events[0];assert.equal(p.url,'/whitepaper.html');assert.equal(p.referrer,'https://example.com');assert.equal(JSON.stringify(p).includes('secret'),false);assert.equal('screen' in p,false);});
test('only opaque campaign codes are retained',()=>{const r=run({pref:'yes',search:'?utm_campaign=vc-001&email=secret@example.com'});r.load();assert.equal(r.events[0].url,'/whitepaper.html?utm_source=outreach&utm_campaign=vc-001');});
test('revoking consent stops future events including clicks',()=>{const r=run({pref:'yes'});r.load();r.privacy();r.deny();r.contact();assert.equal(r.events.length,2);});
test('consent revoked during script load sends nothing',()=>{const r=run();r.allow();r.privacy();r.deny();r.load();assert.equal(r.events.length,0);});
test('ordinary page does not emit a whitepaper event',()=>{const r=run({pref:'yes',path:'/about.html'});r.load();assert.equal(r.events.length,1);});
test('all six site pages include exactly one analytics script',()=>{for(const name of ['index','about','prototype','explorer','references','whitepaper']) {const html=fs.readFileSync(require('node:path').join(__dirname,'../'+name+'.html'),'utf8');assert.equal((html.match(/src="analytics\.js\?v=1"/g)||[]).length,1,name);}});

test('every tracked page exposes privacy controls in a footer',()=>{for(const name of ['index','about','prototype','explorer','references','whitepaper','privacy']) {const html=fs.readFileSync(require('node:path').join(__dirname,'../'+name+'.html'),'utf8');assert.match(html, /<footer[^>]*class="(?:site-footer|orbit-footer)"[\s\S]*?<nav[^>]*>[\s\S]*?href="privacy\.html"/, name);}});
