const $=s=>document.querySelector(s), key='penny-pocket-v1';
const initial=()=>({balance:0,activity:[],debts:[],payments:[],goals:[],theme:0});
let state;try{state=JSON.parse(localStorage.getItem(key))||initial();if(!Array.isArray(state.activity)||!Array.isArray(state.debts)||!Array.isArray(state.payments)||!Number.isSafeInteger(state.balance))state=initial()}catch{state=initial()}
if(!Array.isArray(state.goals)) state.goals=state.goal?[{...state.goal,id:crypto.randomUUID()}]:[];
delete state.goal;
let mode='add',formType='',activeGoalId=null,toastTimer;const cash=c=>(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'}),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{let d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())},days=date=>Math.round((new Date(date+'T00:00:00')-today())/86400000),dateLabel=date=>new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{toast('This browser cannot save changes. Keep this page open.')}render()}
function move(amount,note,date=new Date().toISOString()){state.balance+=amount;state.activity.unshift({id:crypto.randomUUID(),amount,note,date});state.activity=state.activity.slice(0,40)}
function goalBudget(g){
 const now=today(),weekEnd=new Date(now),monthEnd=new Date(now.getFullYear(),now.getMonth()+1,0);
 weekEnd.setDate(now.getDate()+((7-now.getDay())%7));
 const unpaid=[...state.debts,...state.payments];
 const dueBy=end=>unpaid.reduce((total,item)=>!item.date||new Date(item.date+'T00:00:00')<=end?total+item.amount:total,0);
 const weekLeft=state.balance-dueBy(weekEnd),monthLeft=state.balance-dueBy(monthEnd),needed=Math.max(0,g.target-g.saved);
 const possible=monthLeft>=needed;
 return `<details class="goal-budget"><summary>Can I afford this goal this month?</summary><p>${needed===0||possible?'Probably affordable':'Probably not affordable — '+cash(Math.max(0,needed-monthLeft))+' more needed'}</p></details>`;
}
let shownJarBalance=null,jarAnimationToken=0;
const jarParts=balance=>({full:Math.floor(Math.max(0,balance)/10000),remainder:Math.max(0,balance)%10000});
function setJarLevel(cents){const fill=cents/10000;$('#savings-jar').style.setProperty('--jar-cut',`${fill===0?100:92-fill*84}%`)}
function updateJarCount(count){$('#completed-jars').hidden=count===0;$('#jar-count').textContent='×'+count;}
function renderJar(){
 const balance=state.balance,parts=jarParts(balance),previous=shownJarBalance;
 if(previous===balance)return;
 shownJarBalance=balance;const token=++jarAnimationToken,jar=$('#savings-jar');
 jar.getAnimations().forEach(a=>a.cancel());
 jar.setAttribute('aria-label',`${parts.full} full $100 jars, plus ${cash(parts.remainder)} in the current jar. Total ${cash(balance)}.`);
 $('#jar-progress').textContent=`${cash(parts.remainder)} of $100 in this jar`;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(previous===null||reduced){setJarLevel(parts.remainder);updateJarCount(parts.full);return;}
 const before=jarParts(previous);
 if(balance<previous){
   if(parts.full===before.full){setJarLevel(parts.remainder);updateJarCount(parts.full);return;}
   setJarLevel(0);
   setTimeout(()=>{if(token!==jarAnimationToken)return;
     updateJarCount(parts.full);
     const flight=jar.cloneNode(true);flight.removeAttribute('id');flight.setAttribute('aria-hidden','true');flight.classList.add('jar-flight');flight.style.setProperty('--jar-cut','8%');jar.parentElement.appendChild(flight);
     flight.animate([{transform:'translate(145px,-120px) scale(.15)',opacity:0},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:700,easing:'ease-out',fill:'forwards'}).finished.then(()=>{
       flight.remove();if(token!==jarAnimationToken)return;
       const layer=jar.querySelector('.jar-filled');layer.style.transition='none';setJarLevel(10000);void layer.offsetHeight;layer.style.transition='';
       setTimeout(()=>{if(token===jarAnimationToken)setJarLevel(parts.remainder)},50);
     }).catch(()=>flight.remove());
   },before.remainder?1000:0);
   return;
 }

 jar.animate([{transform:'translateY(0)'},{transform:'translateY(-7px)'},{transform:'translateY(0)'}],{duration:650,easing:'ease-out'});
 if(parts.full>before.full){
   setJarLevel(10000);
   setTimeout(()=>{if(token!==jarAnimationToken)return;
     const flight=jar.cloneNode(true);flight.removeAttribute('id');flight.setAttribute('aria-hidden','true');flight.classList.add('jar-flight');jar.parentElement.appendChild(flight);
     flight.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate(145px,-120px) scale(.15)',opacity:0}],{duration:750,easing:'ease-in',fill:'forwards'}).finished.then(()=>flight.remove()).catch(()=>flight.remove());
     const coinLayer=jar.querySelector('.jar-filled');coinLayer.style.transition='none';setJarLevel(0);void coinLayer.offsetHeight;coinLayer.style.transition='';updateJarCount(parts.full);
     setTimeout(()=>{if(token===jarAnimationToken)setJarLevel(parts.remainder)},400);
   },1000);
 }else{updateJarCount(parts.full);setJarLevel(parts.remainder);}
}
function render(){ renderJar();$('#balance').textContent=cash(state.balance);$('#owed').textContent=cash(state.debts.reduce((s,d)=>s+d.amount,0));$('#activity').innerHTML=state.activity.length?state.activity.slice(0,4).map(a=>`<div class="row"><span class="row-icon">${a.amount>0?'↙':'↗'}</span><div class="row-info">${esc(a.note)}<small>${new Date(a.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</small></div><strong class="${a.amount>0?'positive':''}">${a.amount>0?'+':'−'}${cash(Math.abs(a.amount))}</strong></div>`).join(''):'<div class="empty">Your money story starts here.<br>Add your first pennies above.</div>';
$('#debts').innerHTML=state.debts.length?state.debts.map(d=>`<div class="row"><div class="row-info">${esc(d.name)}${d.note?`<small>${esc(d.note)}</small>`:""}${d.date?`<small class="${days(d.date)<=3?'due':''}">Due ${dateLabel(d.date)}${days(d.date)<0?' · Overdue':days(d.date)===0?' · Today':''}</small>`:""}</div><strong>${cash(d.amount)}</strong><button class="small-button" data-pay-debt="${d.id}">Pay back</button></div>`).join(''):'<div class="empty">All clear! No money owed. ✧</div>';
$('#goal-edit').textContent='＋ Add goal';$('#goal').innerHTML=state.goals.length?state.goals.map(g=>`<article class="savings-row"><div class="row"><div class="row-info">${esc(g.name)}<small>${cash(g.saved)} saved of ${cash(g.target)}</small></div><button class="small-button" data-open="goal" data-goal-id="${g.id}" aria-label="Edit ${esc(g.name)}">Edit</button><button class="small-button" data-open="contribute" data-goal-id="${g.id}" aria-label="Add to savings for ${esc(g.name)}">＋ Add to savings</button></div><progress max="${g.target}" value="${g.saved}" aria-label="Savings progress for ${esc(g.name)}"></progress><div class="savings-status"><span>${g.saved>=g.target?'Goal reached! ✨':cash(g.target-g.saved)+' to go'}</span><span>${Math.min(100,Math.floor(g.saved/g.target*100))}%</span></div>${goalBudget(g)}</article>`).join(''):'<div class="empty"><span>✨</span>What are you dreaming of?<br>Add a goal and watch your savings grow.</div>';
$('#payments').innerHTML=state.payments.length?[...state.payments].sort((a,b)=>a.date.localeCompare(b.date)).map(p=>{let n=days(p.date),status=n<0?`${Math.abs(n)} day${n===-1?'':'s'} overdue`:n===0?'Due today':n===1?'Due tomorrow':`In ${n} days`;return `<div class="row"><span class="row-icon">▦</span><div class="row-info">${esc(p.name)}<small class="${n<=3?'due':''}">${dateLabel(p.date)} · ${status}</small></div><strong>${cash(p.amount)}</strong><button class="small-button" data-pay-payment="${p.id}">Pay</button></div>`}).join(''):'<div class="empty">Nothing coming up. Room to breathe. ☁</div>';$('#today').textContent='◷  '+new Date().toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric'});}
function setMode(m){mode=m;$('#add-tab').classList.toggle('active',m==='add');$('#subtract-tab').classList.toggle('active',m==='subtract');$('#add-tab').setAttribute('aria-pressed',m==='add');$('#subtract-tab').setAttribute('aria-pressed',m==='subtract');$('#money-submit').innerHTML=m==='add'?'Add to my piggy bank <span>↗</span>':'Take out of my piggy bank <span>↗</span>'}
$('#add-tab').onclick=()=>setMode('add');$('#subtract-tab').onclick=()=>setMode('subtract');
$('#money-form').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),amount=Math.round(Number(f.get('amount'))*100);if(!Number.isSafeInteger(amount)||amount<=0)return;if(mode==='subtract'&&amount>state.balance)return toast('There isn’t that much in your piggy bank yet.');const date=String(f.get('date'));if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(new Date(date+'T12:00:00').getTime()))return toast('Choose a valid date.');move(mode==='add'?amount:-amount,String(f.get('note')||'').trim()||(mode==='add'?'Money added':'Money taken out'),date+'T12:00:00');save();e.target.reset();resetMoneyDate();toast(mode==='add'?'A little more in your pocket! ✨':'Your piggy bank is up to date.')};
const field=(label,name,type,value='')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0.01" max="9999999" step="0.01"':'maxlength="80"'} required></label>`;
function openForm(type,goalId=null){formType=type;activeGoalId=goalId;let g=state.goals.find(g=>g.id===goalId);if(type==='contribute'&&!g)return;$('#dialog-title').textContent={debt:'Money I owe',goal:'A little dream to save for',payment:'Plan a payment',contribute:g?'Save for '+g.name:'Add to your dream'}[type];$('#dialog-fields').innerHTML=type==='contribute'?field('How much would you like to save? ($)','amount','number'):field(type==='goal'?'What are you saving for?':type==='debt'?'Who do you owe?':'What is the payment for?','name','text',type==='goal'&&g?g.name:'')+field(type==='goal'?'Goal amount ($)':'Amount ($)','amount','number',type==='goal'&&g?g.target/100:'')+(type==='debt'?'<label>What is it for? <span class="optional">(optional)</span><input name="note" maxlength="80" placeholder="Lunch, a borrowed allowance…"></label>':'')+(type==='payment'?field('When is it due?','date','date'):type==='debt'?field('When is it owed?','date','date'):'');$('#dialog-help').textContent=type==='contribute'?'This moves money from your piggy bank into your goal.':type==='debt'?'When you pay it back, we’ll subtract it from your piggy bank.':type==='payment'?'Payments are deducted only when you mark them paid. Reminders appear on this page.':'Your goal savings are kept separate from your piggy bank.';const oldDelete=$('#delete-goal');if(oldDelete)oldDelete.remove();if(type==='goal'&&g){const button=document.createElement('button');button.id='delete-goal';button.type='button';button.className='delete-goal';button.textContent='Delete goal';button.onclick=()=>{if(!confirm('Are you sure you want to delete this goal?'))return;const goal=state.goals.find(item=>item.id===activeGoalId);if(!goal)return;if(goal.saved>0)move(goal.saved,'Returned savings from '+goal.name);state.goals=state.goals.filter(item=>item.id!==goal.id);save();$('#entry-dialog').close();toast(goal.saved>0?'Goal deleted. Your savings are back in your piggy bank.':'Goal deleted.');};$('#entry-form').appendChild(button);$('#dialog-help').textContent+=' If you delete this goal, its savings return to your piggy bank.';}$('#entry-dialog').showModal()}
$('#close-dialog').onclick=()=>$('#entry-dialog').close();document.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.open)openForm(b.dataset.open,b.dataset.goalId||null);for(const kind of ['debt','payment']){let id=b.dataset[kind==='debt'?'payDebt':'payPayment'];if(id){let list=kind==='debt'?state.debts:state.payments,item=list.find(x=>x.id===id);if(!item)return;if(item.amount>state.balance)return toast('Add enough money to your piggy bank first.');move(-item.amount,(kind==='debt'?'Paid back: ':'Paid: ')+item.name);list.splice(list.indexOf(item),1);save();toast('All paid. One less thing to think about!')}}});
$('#entry-form').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),amount=Math.round(Number(f.get('amount'))*100),name=String(f.get('name')||'').trim();if(!Number.isSafeInteger(amount)||amount<=0)return;if(formType!=='contribute'&&!name)return toast('Give it a name first.');if(formType==='contribute'){const g=state.goals.find(g=>g.id===activeGoalId);if(!g)return;if(amount>state.balance)return toast('You can only save what’s in your piggy bank.');move(-amount,'Saved for '+g.name);g.saved+=amount;}else if(formType==='goal'){const g=state.goals.find(g=>g.id===activeGoalId);if(g&&amount<g.saved)return toast('Your target cannot be less than you’ve already saved.');if(g){g.name=name;g.target=amount;}else state.goals.push({id:crypto.randomUUID(),name,target:amount,saved:0});}else{let item={id:crypto.randomUUID(),name,amount};if(formType==='payment'){item.date=String(f.get('date'));if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date))return;state.payments.push(item)}else {item.note=String(f.get('note')||'').trim();item.date=String(f.get('date')||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||!Number.isFinite(new Date(item.date+'T12:00:00').getTime()))return toast('Choose a valid due date.');state.debts.push(item)}}save();$('#entry-dialog').close();toast('Saved. You’re taking care of future you! ♡')};setMode('add');render();setInterval(render,60000);

function resetMoneyDate(){const d=new Date();$('#money-date').value=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
resetMoneyDate();
