/** The company website: a customer dashboard with an AI assistant, and Abhed governing it in plain sight. */
export function page(site, kavachUrl) {
  const t = site.theme;
  const cfg = JSON.stringify({ brand: site.brand, agents: site.agents, prompts: site.prompts, kavachUrl, kind: site.kind, id: site.brand.toLowerCase().replace(/[^a-z]/g, '') });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${site.brand} · ${site.kind}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%278%27 fill=%27${encodeURIComponent(site.theme.brand)}%27/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=${t.fontsQuery}&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:${t.bg};--panel:#fff;--ink:${t.ink};--brand:${t.brand};--brand-2:${t.brand2};--soft:${t.soft};--mut:#5b6270;--mut2:#8a909c;--line:#e3e6eb;--line2:#eef0f3;--ok:#0f7b45;--ok-s:#e7f4ec;--hold:#b25e00;--hold-s:#fdf1e1;--no:#c2261c;--no-s:#fdecea}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--ink);font:14.5px/1.5 ${t.font};-webkit-font-smoothing:antialiased;min-height:100vh}
a{color:inherit;text-decoration:none}.mono{font-family:'JetBrains Mono',monospace;font-size:.84em}.muted{color:var(--mut)}
header{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.hbar{max-width:1360px;margin:0 auto;display:flex;align-items:center;gap:28px;height:66px;padding:0 28px}
.brand{display:flex;align-items:center;gap:11px}.logo{width:34px;height:34px;border-radius:9px;background:var(--brand);display:grid;place-items:center;color:#fff;font-weight:800;font-size:16px;font-family:${t.display}}
.brand b{font-family:${t.display};font-size:20px;font-weight:700;letter-spacing:-.02em}
.hnav{display:flex;gap:22px;color:var(--mut);font-weight:500;font-size:14px}.hnav span:first-child{color:var(--ink);font-weight:700}
.hright{margin-left:auto;display:flex;align-items:center;gap:12px}
.who{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mut);font-weight:600}
select,textarea,button{font:inherit;color:inherit}select{background:#fff;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-weight:600;color:var(--ink)}
.gov{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;border:1px solid var(--line);padding:7px 11px;border-radius:8px;background:#fff}.gov:hover{border-color:var(--brand)}
.gov svg{width:14px;height:14px}
.top{max-width:1360px;margin:0 auto;padding:26px 28px 6px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;align-items:stretch}
.hello h1{font-family:${t.display};font-weight:700;font-size:34px;letter-spacing:-.025em;line-height:1.1}.hello p{color:var(--mut);margin-top:6px;max-width:560px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;min-width:0;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.card h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);font-weight:700;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.acct{margin-top:16px}
.kv{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line2);font-size:13.5px;gap:10px}.kv:last-child{border:0}.kv span{color:var(--mut)}
.big{font-family:${t.display};font-size:36px;font-weight:700;letter-spacing:-.03em;margin-bottom:6px}
.prot{border-color:color-mix(in srgb,var(--brand) 25%,var(--line));background:linear-gradient(var(--soft),#fff 140px)}
.prot h3{color:var(--brand)}
.pstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.pstats div{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px}.pstats b{display:block;font-size:24px;font-weight:800;letter-spacing:-.02em}.pstats span{font-size:12px;color:var(--mut);font-weight:600}
.pstats div:nth-child(1) b{color:var(--no)}.pstats div:nth-child(2) b{color:var(--hold)}
.caught{border-left:3px solid var(--line);padding:6px 0 6px 11px;margin-bottom:8px}.caught.no{border-color:var(--no)}.caught.hold{border-color:var(--hold)}
.caught-h{display:flex;justify-content:space-between;gap:10px;font-size:13.5px}.caught-h span{font-size:12px;font-weight:800;white-space:nowrap}.caught.no .caught-h span{color:var(--no)}.caught.hold .caught-h span{color:var(--hold)}
.caught p{font-size:12.5px;color:var(--mut);margin-top:2px;line-height:1.45}
.pfoot{font-size:12px;color:var(--mut);margin-top:10px;display:flex;justify-content:space-between;gap:10px}
main{max-width:1360px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;padding:18px 28px 40px}
.tabs{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}.tab{border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px 12px;cursor:pointer;display:flex;gap:9px;align-items:center;font-weight:700}.tab small{font-weight:500;color:var(--mut)}.tab.on{border-color:var(--brand);box-shadow:0 0 0 1px var(--brand)}
.av{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:var(--soft);color:var(--brand);font-size:12px;font-weight:800}.tab.on .av{background:var(--brand);color:#fff}
.chat{min-height:320px;max-height:50vh;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:4px 2px 12px}
.msg{max-width:84%;padding:10px 14px;border-radius:14px;animation:in .35s both;line-height:1.5}.me{align-self:flex-end;background:var(--brand);color:#fff;border-bottom-right-radius:4px}.bot{align-self:flex-start;background:#f4f5f7;border:1px solid var(--line2);border-bottom-left-radius:4px}
.sys{align-self:center;font-size:13px;color:var(--mut);text-align:center;max-width:92%}
.hold{align-self:stretch;border:1px solid color-mix(in srgb,var(--hold) 35%,var(--line));background:var(--hold-s);border-radius:12px;padding:12px 14px;font-size:13.5px}.hold b{color:var(--hold)}
.paused{align-self:stretch;border:1px solid color-mix(in srgb,var(--no) 35%,var(--line));background:var(--no-s);border-radius:12px;padding:12px 14px;font-size:13.5px}
@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1}}
.compose{display:flex;gap:8px;margin-top:6px}textarea{flex:1;min-height:52px;resize:vertical;background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;outline:none}textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--soft)}
.send{background:var(--brand);color:#fff;border:0;border-radius:12px;padding:0 22px;font-weight:700;cursor:pointer}.send:disabled{opacity:.5}
.tries{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.try-h{grid-column:1/-1;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-top:4px}.try{text-align:left;border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 12px;cursor:pointer;font-size:13px;line-height:1.4}.try:hover{border-color:var(--brand)}.try small{display:block;color:var(--brand);font-size:11.5px;font-weight:700;margin-top:4px}
.trace{display:flex;flex-direction:column;gap:8px;max-height:68vh;overflow:auto}.st{border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:13px;animation:in .35s both;background:#fff}.st .h{display:flex;justify-content:space-between;gap:8px;align-items:center}
.chip{font-size:11.5px;font-weight:700;border-radius:6px;padding:2px 8px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px}.chip::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.c-ok{color:var(--ok);background:var(--ok-s)}.c-hold{color:var(--hold);background:var(--hold-s)}.c-no{color:var(--no);background:var(--no-s)}.c-mut{color:var(--mut);background:#f4f5f7;border:0}
.st .r{color:var(--mut);margin-top:4px;line-height:1.45}.st.think{border-style:dashed;color:var(--mut);font-style:italic;background:transparent}
.dot{display:inline-flex;gap:3px}.dot i{width:5px;height:5px;border-radius:50%;background:var(--brand);animation:b 1.1s infinite}.dot i:nth-child(2){animation-delay:.15s}.dot i:nth-child(3){animation-delay:.3s}@keyframes b{50%{opacity:.2}}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:7px 4px;border-bottom:1px solid var(--line2);text-align:left}th{color:var(--mut);font-weight:600;font-size:12px}
.flash{animation:fl 1.8s}@keyframes fl{from{background:var(--ok-s)}to{background:transparent}}
footer{max-width:1360px;margin:0 auto;padding:0 28px 40px;color:var(--mut);font-size:13px}footer code{background:#fff;border:1px solid var(--line);border-radius:6px;padding:2px 6px}
#agents .kv b.chip{font-size:11px}
@media(max-width:1100px){main,.top{grid-template-columns:1fr}.hnav{display:none}.tries{grid-template-columns:1fr}.chat{min-height:180px}}@media(max-width:640px){.who-l{display:none}}
@media(max-width:640px){.hbar{gap:12px;padding:0 16px;height:auto;min-height:60px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px}.top,main{padding-left:16px;padding-right:16px}.gov.abhed span{display:none}}
</style></head><body>
<header><div class="hbar">
<div class="brand"><div class="logo">${site.brand[0]}</div><b>${site.brand}</b></div>
<nav class="hnav">${(site.nav || []).map((n) => `<span>${n}</span>`).join('')}</nav>
<div class="hright"><label class="who"><span class="who-l">Signed in as</span> <select id="cust"></select></label>
<a class="gov" href="/admin">Staff &amp; admin</a>
<a class="gov abhed" href="${kavachUrl}/fleet" target="_blank" rel="noopener"><svg viewBox="0 0 31.5 48.5"><path d="M21.5 0L21.5 19.5L31.5 19.5L31.5 29L10 48.5L10 28.5L0.5 28.5L0.5 18.5Z" fill="#0c0e12"/><rect x="0.5" y="18.5" width="9" height="10" fill="#1e44d6"/><rect x="22" y="19.5" width="9.5" height="9.5" fill="#1e44d6"/></svg><span>Protected by Abhed</span></a></div>
</div></header>
<section class="top">
  <div>
    <div class="hello"><h1 id="hello">${site.tagline}</h1><p>${site.intro}</p></div>
    <div class="card acct"><h3>${site.accountTitle || 'Your account'}</h3><div id="mine"></div></div>
  </div>
  <div class="card prot"><h3>Why our AI agents need Abhed <span class="mono" style="text-transform:none;letter-spacing:0;color:var(--mut)">live</span></h3>
    <div class="pstats"><div><b id="p-stop">–</b><span>stopped before running</span></div><div><b id="p-ask">–</b><span>sent to a person</span></div><div><b id="p-act">–</b><span>actions checked</span></div></div>
    <div id="prot"><p class="muted">Loading…</p></div>
    <div class="pfoot"><span>Without Abhed, each of these would have run straight on our systems.</span><span id="p-chain"></span></div>
  </div>
</section>
<main>
  <div class="card"><h3>Ask our assistant</h3><div class="tabs" id="tabs"></div><div class="chat" id="chat"><div class="sys">Ask about your account, our policies, fees or timelines, or ask it to do something. It works on our live systems, under Abhed governance.</div></div>
    <div class="compose"><textarea id="text" placeholder="Type your request…"></textarea><button class="send" id="send">Send</button></div>
    <div class="tries" id="tries"></div></div>
  <div>
    <div class="card"><h3>Abhed governance · live <span id="sess" class="mono"></span></h3><div class="trace" id="trace"><div class="st c-mut">Every thought and tool call of our assistant appears here as Abhed decides on it.</div></div></div>
    <div class="card" style="margin-top:18px"><h3>Our AI agents</h3><div id="agents"></div></div>
  </div>
</main>
<footer>How ${site.brand} plugged in: each agent got an Abhed key, and every tool call goes through <code>abhed.call(session, tool, args)</code> (<a href="${kavachUrl}/integrate" target="_blank" style="text-decoration:underline">integration guide</a>). ${site.brand} is a fictional company.</footer>
<script>
const C=${cfg};let D={},agent=C.agents[0].id,cust=null,task=null,seen=0,busy=false,H={},lastQ='';const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const inr=n=>'₹'+Math.round(Number(n)||0).toLocaleString('en-IN');
function tabs(){$('#tabs').innerHTML=C.agents.map(a=>'<button class="tab '+(a.id===agent?'on':'')+'" data-a="'+a.id+'"><span class="av">'+esc(a.avatar)+'</span>'+esc(a.name)+' <small>'+esc(a.job)+'</small></button>').join('');document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{agent=b.dataset.a;tabs();tries()})}
function tries(){$('#tries').innerHTML='<div class="try-h">Try one of these real customer requests</div>'+C.prompts.filter(p=>p.agent===agent).map((p,i)=>'<button class="try" data-i="'+C.prompts.indexOf(p)+'">'+esc(p.text.replace(/<!--[\\s\\S]*-->/,'⟨hidden instruction⟩'))+'<small>'+esc(p.note)+'</small></button>').join('');document.querySelectorAll('.try').forEach(b=>b.onclick=()=>{const p=C.prompts[+b.dataset.i];if(p.customer){$('#cust').value=p.customer;cust=p.customer;mine()}$('#text').value=p.text})}
function custList(){const cs=D.customers||[];const sel=$('#cust');if(sel.options.length!==cs.length+1){sel.innerHTML='<option value="">— nobody (staff) —</option>'+cs.map(c=>'<option value="'+c.id+'">'+esc(c.name)+' · '+c.id+'</option>').join('');if(!cust&&cs[0]){cust=cs[0].id}sel.value=cust||'';sel.onchange=()=>{cust=sel.value||null;mine()}}}
let mine=function(){const el=$('#mine');const c=(D.customers||[]).find(x=>x.id===cust);let h='';
 if(C.id==='novabank'&&c){const a=(D.accounts||[]).find(x=>x.id===c.id)||{};h='<div class="big">'+inr(a.balance)+'</div><div class="kv"><span>Card</span><b>'+esc(a.cardStatus||'active')+'</b></div><div class="kv"><span>Tier</span><b>'+esc(c.tier)+'</b></div><table><tr><th>Ref</th><th>Amount</th><th>Status</th></tr>'+(D.txns||[]).filter(t=>t.customer===c.id).map(t=>'<tr><td class="mono">'+esc(t.ref)+'</td><td>'+inr(t.amount)+'</td><td>'+esc(t.status)+'</td></tr>').join('')+'</table>'}
 else if(C.id==='sanjeevanihospital'&&c){const p=(D.patients||[]).find(x=>x.id===c.id)||{};h='<div class="kv"><span>Insurer</span><b>'+esc(p.insurer)+'</b></div><div class="kv"><span>Shares records with insurer</span><b>'+(p.consentInsurer?'yes':'no')+'</b></div><table><tr><th>Prescription</th><th>Refills left</th></tr>'+(p.prescriptions||[]).map(r=>'<tr><td>'+esc(r.drug)+'</td><td>'+esc(r.refillsLeft)+'</td></tr>').join('')+'</table><table style="margin-top:8px"><tr><th>Bill</th><th>Amount</th><th>Status</th></tr>'+(D.bills||[]).filter(b=>b.patient===c.id).map(b=>'<tr><td>'+esc(b.for)+'</td><td>'+inr(b.amount)+'</td><td>'+esc(b.status)+'</td></tr>').join('')+'</table>'}
 else if(C.id==='bazaarin'){h='<table><tr><th>Product</th><th>Price</th></tr>'+(D.products||[]).map(p=>'<tr><td>'+esc(p.name)+' <span class="mono" style="color:var(--mut)">'+esc(p.sku)+'</span></td><td><b>'+inr(p.price)+'</b></td></tr>').join('')+'</table>'+(c?'<table style="margin-top:10px"><tr><th>Your order</th><th>Total</th><th>Status</th></tr>'+(D.orders||[]).filter(o=>o.customer===c.id).map(o=>'<tr><td>'+esc(o.id)+' · '+esc(o.item)+'</td><td>'+inr(o.total)+'</td><td>'+esc(o.status)+'</td></tr>').join('')+'</table>':'')}
 if(el.dataset.h!==h){if(el.dataset.h)el.classList.remove('flash'),void el.offsetWidth,el.classList.add('flash');el.dataset.h=h;el.innerHTML=h}}
function agentsPanel(){$('#agents').innerHTML=C.agents.map(a=>{const s=(D.agents||{})[a.id];const st=s?s.status:'…';const tone=st==='ACTIVE'?'c-ok':st==='PAUSED'?'c-no':'c-hold';return '<div class="kv"><span>'+esc(a.name)+' · '+esc(a.job)+'</span><b class="chip '+tone+'">'+esc(st)+'</b></div>'+(s&&s.status==='PAUSED'?'<div style="font-size:11.5px;color:var(--no);margin:-2px 0 6px">'+esc(s.statusReason||'')+'</div>':'')}).join('')}
async function load(){try{D=await (await fetch('/api/data')).json();custList();mine();agentsPanel()}catch(e){}}
function add(cls,html){const d=document.createElement('div');d.className=cls;d.innerHTML=html;$('#chat').appendChild(d);$('#chat').scrollTop=1e9;return d}
function tr(cls,html){const t=$('#trace');if(t.firstChild&&t.firstChild.classList.contains('c-mut'))t.innerHTML='';const d=document.createElement('div');d.className='st '+cls;d.innerHTML=html;t.prepend(d)}
const chip=d=>d==='ALLOWED'||d==='EXECUTED'?'<span class="chip c-ok">'+(d==='ALLOWED'?'allowed':'executed')+'</span>':d==='NEEDS_APPROVAL'?'<span class="chip c-hold">needs a person</span>':'<span class="chip c-no">'+esc(String(d).toLowerCase())+'</span>';
let typing=null;
async function poll(){if(!task)return;const t=await (await fetch('/api/task/'+task)).json();for(const e of t.events.slice(seen)){seen++;show(e)}if(t.status==='done'){busy=false;$('#send').disabled=false;typing&&typing.remove();typing=null;load();return}setTimeout(poll,700)}
function show(e){
 if(e.type==='session'){$('#sess').textContent=e.sessionId;tr('', '<div class="h"><b>Session '+esc(e.sessionId)+' opened</b>'+(e.tainted?'<span class="chip c-hold">tainted</span>':'<span class="chip c-ok">clean</span>')+'</div>'+(e.tainted?'<div class="r">Scanner flagged: '+esc((e.signals||[]).join(', '))+'. Nothing this task reads may leave the company.</div>':'<div class="r">Task scanned for prompt injection before the model saw it.</div>'))}
 if(e.type==='think'&&e.text)tr('think','💭 '+esc(e.text)+'<div class="r mono">'+esc(e.model||'')+' · '+(e.tokens||0)+' tokens · '+(e.ms||0)+' ms</div>');
 if(e.type==='tool'){tr('', '<div class="h"><b class="mono">'+esc(e.tool)+'</b>'+chip(e.decision)+'</div><div class="r mono">'+esc(JSON.stringify(e.args))+'</div><div class="r">'+esc(e.reason||'')+(e.rule?' · <span class="mono">'+esc(e.rule)+'</span>':'')+' · decided in '+(e.gatewayMs??'?')+' ms · ledger #'+esc(e.record)+'</div>');if(e.decision==='BLOCKED'&&!e.paused)add('sys','🛡 Abhed refused <b>'+esc(e.tool.replace(/_/g,' '))+'</b>: '+esc(e.reason))}
 if(e.type==='waiting'){add('hold','<b>Waiting for one of our people to approve</b> ('+esc(e.approvalId)+').<br>'+esc(e.reason)+'<br><span style="color:var(--mut)">They decide on their phone in the Abhed approver app. The agent pauses until then.</span>');tr('', '<div class="h"><b>Phone approval requested</b><span class="chip c-hold">'+esc(e.approvalId)+'</span></div><div class="r">Pushed to on-duty approvers · <a href="'+C.kavachUrl+'/approve/'+esc(e.approvalId)+'" target="_blank">open ↗</a></div>')}
 if(e.type==='approval'){const ok=e.status==='EXECUTED';add('sys',(ok?'✅ Approved by '+esc(e.by)+'. Done exactly as approved.':'⛔ '+esc(e.status.toLowerCase())+(e.by?' by '+esc(e.by):'')));tr('', '<div class="h"><b>'+esc(e.approvalId)+'</b>'+chip(ok?'EXECUTED':e.status)+'</div><div class="r">'+(e.by?'Decided by '+esc(e.by):'')+'</div>')}
 if(e.type==='paused'){add('paused','<b>This agent has been paused by Abhed.</b><br>'+esc(e.text)+'<br><span style="color:var(--mut)">A person from our team will handle your request.</span>');tr('', '<div class="h"><b>Agent paused</b><span class="chip c-no">critical breach</span></div><div class="r">'+esc(e.text)+'</div>')}
 if(e.type==='final'){typing&&typing.remove();typing=null;add('msg bot',esc(e.text).replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>').replace(/[\\[【]([A-Z]{2}-[A-Z]+-\\d+)[\\]】]/g,' <span class="mono" style="font-size:11px;border:1px solid var(--line);border-radius:5px;padding:0 5px;opacity:.8">$1</span>').replace(/\\n/g,'<br>'));const h=(H[agent+':'+(cust||'')]??=[]);h.push({role:'user',content:lastQ},{role:'assistant',content:e.text});if(h.length>12)h.splice(0,h.length-12)}
 if(e.type==='error'){add('sys','⚠ '+esc(e.text))}
 if(typing){$('#chat').appendChild(typing)}
}
$('#send').onclick=async()=>{const text=$('#text').value.trim();if(!text||busy)return;lastQ=text;busy=true;$('#send').disabled=true;add('msg me',esc(text).replace(/&lt;!--[\\s\\S]*--&gt;/,'<span style="opacity:.55">⟨hidden instruction⟩</span>'));$('#text').value='';typing=add('msg bot','<span class="dot"><i></i><i></i><i></i></span>');
 const c=(D.customers||[]).find(x=>x.id===cust);const r=await fetch('/api/task',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({agent,text,customer:c||null,customerName:c?c.name:'Staff',history:H[agent+':'+(cust||'')]||[]})});const j=await r.json();if(!r.ok){add('sys','⚠ '+esc(j.error));busy=false;$('#send').disabled=false;typing.remove();typing=null;return}task=j.id;seen=0;poll()};
$('#text').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#send').click()}});
const ICON={BLOCKED:'Stopped',NEEDS_APPROVAL:'Sent to a person'};
async function protect(){try{const p=await (await fetch('/api/protection')).json();if(!p.available){$('#prot').innerHTML='<p class="muted">Live protection numbers appear when this site is connected to Abhed.</p>';return}
$('#p-stop').textContent=p.stopped;$('#p-ask').textContent=p.asked;$('#p-act').textContent=p.actions;
$('#prot').innerHTML=p.caught.length?p.caught.map(x=>'<div class="caught '+(x.decision==='BLOCKED'?'no':'hold')+'"><div class="caught-h"><b>'+esc(x.actor)+' tried to '+esc(x.action.replace(/_/g,' '))+'</b><span>'+(ICON[x.decision]||x.decision)+'</span></div><p>'+esc(x.reason)+(x.rule?' <span class="mono">'+esc(x.rule)+'</span>':'')+'</p></div>').join(''):'<p class="muted">Nothing risky yet today. Try one of the suggested requests and watch this list.</p>';
$('#p-chain').textContent=p.chain&&p.chain.valid?'Ledger verified: '+p.chain.records+' records, none edited':'';}catch(e){}}
function greet(){const c=(D.customers||[]).find(x=>x.id===cust);const h=new Date().getHours();$('#hello').textContent=(h<12?'Good morning':h<17?'Good afternoon':'Good evening')+(c?', '+c.name.replace(/^(Mr|Mrs|Ms|Dr)\\.\\s*/,'').split(' ')[0]:'')+'.'}
const _mine=mine;mine=function(){_mine();greet()};
tabs();tries();load();setInterval(load,4000);protect();setInterval(protect,8000);
</script></body></html>`;
}
