/** The company website: customers talk to the agent; a side panel shows Kavach governing it live. */
export function page(site, kavachUrl) {
  const t = site.theme;
  const cfg = JSON.stringify({ brand: site.brand, agents: site.agents, prompts: site.prompts, kavachUrl, kind: site.kind, id: site.brand.toLowerCase().replace(/[^a-z]/g, '') });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${site.brand} · ${site.kind}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
:root{--bg:${t.bg};--panel:${t.panel};--ink:${t.ink};--acc:${t.accent};--acc2:${t.accent2};--mut:color-mix(in srgb,var(--ink) 58%,transparent);--line:color-mix(in srgb,var(--ink) 13%,transparent);--ok:#5be3a8;--hold:#ffb547;--no:#ff6b6b}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--ink);font:14px/1.5 ${t.font};-webkit-font-smoothing:antialiased;min-height:100vh}
a{color:inherit}.mono{font-family:'JetBrains Mono',monospace;font-size:.85em}
header{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;border-bottom:1px solid var(--line);position:sticky;top:0;background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(14px);z-index:5}
.brand{display:flex;align-items:center;gap:12px}.logo{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--acc),var(--acc2));display:grid;place-items:center;color:#111;font-weight:700}
.brand b{font-family:${t.display};font-size:22px;font-weight:500;letter-spacing:-.02em}.brand span{color:var(--mut);font-size:12.5px;display:block}
.gov{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mut);border:1px solid var(--line);padding:7px 11px;border-radius:999px;text-decoration:none}.gov i{width:7px;height:7px;border-radius:50%;background:var(--ok);box-shadow:0 0 10px var(--ok)}
.hero{padding:34px 28px 10px;max-width:1400px;margin:0 auto}.hero h1{font-family:${t.display};font-weight:500;font-size:44px;letter-spacing:-.03em;line-height:1.05}.hero h1 em{font-style:italic;color:var(--acc)}.hero p{color:var(--mut);margin-top:8px;max-width:640px}
main{display:grid;grid-template-columns:300px minmax(0,1fr) 400px;gap:16px;padding:18px 28px 40px;max-width:1400px;margin:0 auto}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;min-width:0}.card h3{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:10px;display:flex;justify-content:space-between}
select,textarea,button{font:inherit;color:inherit}select{width:100%;background:rgba(0,0,0,.3);border:1px solid var(--line);border-radius:9px;padding:9px 10px}
.kv{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--line);font-size:13px;gap:10px}.kv:last-child{border:0}.kv span{color:var(--mut)}
.big{font-family:${t.display};font-size:32px;letter-spacing:-.02em}
.tabs{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}.tab{border:1px solid var(--line);background:transparent;border-radius:999px;padding:7px 13px;cursor:pointer;display:flex;gap:8px;align-items:center}.tab.on{background:var(--acc);color:#111;border-color:var(--acc)}.tab small{opacity:.7}
.av{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--acc) 25%,transparent);font-size:11px;font-weight:600}.tab.on .av{background:#111;color:var(--acc)}
.chat{min-height:330px;max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:4px 2px 10px}
.msg{max-width:86%;padding:10px 13px;border-radius:14px;animation:in .35s both}.me{align-self:flex-end;background:var(--acc);color:#111;border-bottom-right-radius:4px}.bot{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid var(--line);border-bottom-left-radius:4px}
.sys{align-self:center;font-size:12px;color:var(--mut);text-align:center;max-width:92%}.hold{align-self:stretch;border:1px solid var(--hold);background:color-mix(in srgb,var(--hold) 9%,transparent);border-radius:12px;padding:12px;font-size:13px}.hold b{color:var(--hold)}
.paused{align-self:stretch;border:1px solid var(--no);background:color-mix(in srgb,var(--no) 10%,transparent);border-radius:12px;padding:12px;font-size:13px}
@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1}}
.compose{display:flex;gap:8px;margin-top:8px}textarea{flex:1;min-height:52px;resize:vertical;background:rgba(0,0,0,.3);border:1px solid var(--line);border-radius:12px;padding:10px 12px;outline:none}textarea:focus{border-color:var(--acc)}
.send{background:var(--acc);color:#111;border:0;border-radius:12px;padding:0 18px;font-weight:600;cursor:pointer}.send:disabled{opacity:.5}
.tries{display:flex;flex-direction:column;gap:6px;margin-top:12px}.try{text-align:left;border:1px dashed var(--line);background:transparent;border-radius:10px;padding:8px 10px;cursor:pointer;font-size:12.5px}.try:hover{border-style:solid;border-color:var(--acc)}.try small{display:block;color:var(--mut);font-size:11px;margin-top:2px}
.trace{display:flex;flex-direction:column;gap:8px;max-height:72vh;overflow:auto}.st{border:1px solid var(--line);border-radius:10px;padding:9px 11px;font-size:12.5px;animation:in .35s both}.st .h{display:flex;justify-content:space-between;gap:8px;align-items:center}
.chip{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;border:1px solid currentColor;border-radius:5px;padding:1px 6px;white-space:nowrap}.c-ok{color:var(--ok)}.c-hold{color:var(--hold)}.c-no{color:var(--no)}.c-mut{color:var(--mut)}
.st .r{color:var(--mut);margin-top:4px}.st.think{border-style:dashed;color:var(--mut);font-style:italic}
.dot{display:inline-flex;gap:3px}.dot i{width:5px;height:5px;border-radius:50%;background:var(--acc);animation:b 1.1s infinite}.dot i:nth-child(2){animation-delay:.15s}.dot i:nth-child(3){animation-delay:.3s}@keyframes b{50%{opacity:.2}}
table{width:100%;border-collapse:collapse;font-size:12.5px}td,th{padding:6px 4px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--mut);font-weight:400;font-size:11px}
.flash{animation:fl 1.8s}@keyframes fl{from{background:color-mix(in srgb,var(--ok) 30%,transparent)}to{background:transparent}}
footer{max-width:1400px;margin:0 auto;padding:0 28px 40px;color:var(--mut);font-size:12.5px}footer code{background:rgba(0,0,0,.35);border:1px solid var(--line);border-radius:6px;padding:2px 6px}
@media(max-width:1100px){main{grid-template-columns:1fr}}
</style></head><body>
<header><div class="brand"><div class="logo">${site.brand[0]}</div><div><b>${site.brand}</b><span>${site.kind} · fictional company</span></div></div>
<div style="display:flex;gap:10px;align-items:center"><a class="gov" href="/admin"><span>🔒</span>Staff & admin</a><a class="gov" href="${kavachUrl}/fleet" target="_blank" rel="noopener"><i></i>AI agents governed by Kavach · watch live ↗</a></div></header>
<section class="hero"><h1>${site.tagline.replace(/(\S+)\.$/, '<em>$1.</em>')}</h1><p>Our AI agents handle your request end to end. Anything high-impact waits for one of our people, and every step is on an audit trail you can't edit.</p></section>
<main>
  <div>
    <div class="card"><h3>Signed in as</h3><select id="cust"></select><div id="mine" style="margin-top:12px"></div></div>
    <div class="card" style="margin-top:14px"><h3>Our AI agents</h3><div id="agents"></div></div>
  </div>
  <div class="card"><div class="tabs" id="tabs"></div><div class="chat" id="chat"><div class="sys">Chat with our agent: ask about your account, our policies, fees or timelines, or ask it to do something. It works on our live systems, under Kavach governance.</div></div>
    <div class="compose"><textarea id="text" placeholder="Describe what you need…"></textarea><button class="send" id="send">Send</button></div>
    <div class="tries" id="tries"></div></div>
  <div class="card"><h3>Kavach governance · live <span id="sess" class="mono"></span></h3><div class="trace" id="trace"><div class="st c-mut">Every thought and tool call of our agent appears here as Kavach decides on it.</div></div></div>
</main>
<footer>How ${site.brand} plugged in: each agent got a Kavach key, and every tool call goes through <code>kavach.call(session, tool, args)</code> (<a href="${kavachUrl}/integrate" target="_blank">integration guide ↗</a>). The LLM runs through the Kavach gateway; ${site.brand} never handles the approval logic itself.</footer>
<script>
const C=${cfg};let D={},agent=C.agents[0].id,cust=null,task=null,seen=0,busy=false,H={},lastQ='';const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const inr=n=>'₹'+Math.round(Number(n)||0).toLocaleString('en-IN');
function tabs(){$('#tabs').innerHTML=C.agents.map(a=>'<button class="tab '+(a.id===agent?'on':'')+'" data-a="'+a.id+'"><span class="av">'+esc(a.avatar)+'</span>'+esc(a.name)+' <small>'+esc(a.job)+'</small></button>').join('');document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{agent=b.dataset.a;tabs();tries()})}
function tries(){$('#tries').innerHTML='<div style="font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;margin-top:6px">Try</div>'+C.prompts.filter(p=>p.agent===agent).map((p,i)=>'<button class="try" data-i="'+C.prompts.indexOf(p)+'">'+esc(p.text.replace(/<!--[\\s\\S]*-->/,'⟨hidden instruction⟩'))+'<small>'+esc(p.note)+'</small></button>').join('');document.querySelectorAll('.try').forEach(b=>b.onclick=()=>{const p=C.prompts[+b.dataset.i];if(p.customer){$('#cust').value=p.customer;cust=p.customer;mine()}$('#text').value=p.text})}
function custList(){const cs=D.customers||[];const sel=$('#cust');if(sel.options.length!==cs.length+1){sel.innerHTML='<option value="">— nobody (staff) —</option>'+cs.map(c=>'<option value="'+c.id+'">'+esc(c.name)+' · '+c.id+'</option>').join('');if(!cust&&cs[0]){cust=cs[0].id}sel.value=cust||'';sel.onchange=()=>{cust=sel.value||null;mine()}}}
function mine(){const el=$('#mine');const c=(D.customers||[]).find(x=>x.id===cust);let h='';
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
 if(e.type==='tool'){tr('', '<div class="h"><b class="mono">'+esc(e.tool)+'</b>'+chip(e.decision)+'</div><div class="r mono">'+esc(JSON.stringify(e.args))+'</div><div class="r">'+esc(e.reason||'')+(e.rule?' · <span class="mono">'+esc(e.rule)+'</span>':'')+' · decided in '+(e.gatewayMs??'?')+' ms · ledger #'+esc(e.record)+'</div>');if(e.decision==='BLOCKED'&&!e.paused)add('sys','🛡 Kavach refused <b>'+esc(e.tool.replace(/_/g,' '))+'</b>: '+esc(e.reason))}
 if(e.type==='waiting'){add('hold','<b>Waiting for one of our people to approve</b> ('+esc(e.approvalId)+').<br>'+esc(e.reason)+'<br><span style="color:var(--mut)">They decide on their phone in the Kavach approver app. The agent pauses until then.</span>');tr('', '<div class="h"><b>Phone approval requested</b><span class="chip c-hold">'+esc(e.approvalId)+'</span></div><div class="r">Pushed to on-duty approvers · <a href="'+C.kavachUrl+'/approve/'+esc(e.approvalId)+'" target="_blank">open ↗</a></div>')}
 if(e.type==='approval'){const ok=e.status==='EXECUTED';add('sys',(ok?'✅ Approved by '+esc(e.by)+'. Done exactly as approved.':'⛔ '+esc(e.status.toLowerCase())+(e.by?' by '+esc(e.by):'')));tr('', '<div class="h"><b>'+esc(e.approvalId)+'</b>'+chip(ok?'EXECUTED':e.status)+'</div><div class="r">'+(e.by?'Decided by '+esc(e.by):'')+'</div>')}
 if(e.type==='paused'){add('paused','<b>This agent has been paused by Kavach.</b><br>'+esc(e.text)+'<br><span style="color:var(--mut)">A person from our team will handle your request.</span>');tr('', '<div class="h"><b>Agent paused</b><span class="chip c-no">critical breach</span></div><div class="r">'+esc(e.text)+'</div>')}
 if(e.type==='final'){typing&&typing.remove();typing=null;add('msg bot',esc(e.text).replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>').replace(/[\\[【]([A-Z]{2}-[A-Z]+-\\d+)[\\]】]/g,' <span class="mono" style="font-size:11px;border:1px solid var(--line);border-radius:5px;padding:0 5px;opacity:.8">$1</span>').replace(/\\n/g,'<br>'));const h=(H[agent+':'+(cust||'')]??=[]);h.push({role:'user',content:lastQ},{role:'assistant',content:e.text});if(h.length>12)h.splice(0,h.length-12)}
 if(e.type==='error'){add('sys','⚠ '+esc(e.text))}
 if(typing){$('#chat').appendChild(typing)}
}
$('#send').onclick=async()=>{const text=$('#text').value.trim();if(!text||busy)return;lastQ=text;busy=true;$('#send').disabled=true;add('msg me',esc(text).replace(/&lt;!--[\\s\\S]*--&gt;/,'<span style="opacity:.55">⟨hidden instruction⟩</span>'));$('#text').value='';typing=add('msg bot','<span class="dot"><i></i><i></i><i></i></span>');
 const c=(D.customers||[]).find(x=>x.id===cust);const r=await fetch('/api/task',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({agent,text,customer:c||null,customerName:c?c.name:'Staff',history:H[agent+':'+(cust||'')]||[]})});const j=await r.json();if(!r.ok){add('sys','⚠ '+esc(j.error));busy=false;$('#send').disabled=false;typing.remove();typing=null;return}task=j.id;seen=0;poll()};
$('#text').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#send').click()}});
tabs();tries();load();setInterval(load,4000);
</script></body></html>`;
}
