import {seed,workbook,google,periods,colors,columns,names,money,percent,value,csvRow,importObservations,performance,risk,blankExperiment} from './model.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const link=(s,label='View evidence ↗')=>safeUrl(s)?'<a href="'+esc(safeUrl(s))+'" target="_blank" rel="noopener">'+esc(label)+'</a>':'';
const badge=(s,kind='')=>'<span class="pill '+kind+'">'+esc(s)+'</span>';
const btn=(label,action,primary=false)=>'<button class="'+(primary?'primary':'outline')+'" data-action="'+action+'">'+label+'</button>';
const heading=(title,sub,action='')=>'<div class="section-head"><div><h2>'+title+'</h2><p>'+sub+'</p></div>'+action+'</div>';
const card=(body,cls='')=>'<section class="card '+cls+'">'+body+'</section>';
const metric=(label,amount,sub)=>card('<div class="eyebrow">'+label+'</div><strong>'+amount+'</strong><p>'+sub+'</p>','metric');
const table=(headers,rows)=>'<div class="tablewrap"><table><thead><tr>'+headers.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const paths={
 overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 performance:'M3 3v18h18M6 16l5-6 4 3 6-7',
 holdings:'M4 8h16v13H4zM8 8V4h8v4M4 13h16',
 screening:'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11zM8 12l3 3 5-6',
 research:'M4 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4zM14 7a3 3 0 0 1 3-3h4v14h-3a4 4 0 0 0-4 3',
 daily:'M4 6h16v15H4zM8 3v5m8-5v5M4 11h16',
 tracking:'M10 13a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2m2 6a4 4 0 0 0-6 0l-4 4a4 4 0 0 0 6 6l2-2',
 exceptions:'M12 3l10 17H2zM12 9v5m0 3v1',
 about:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-10v6m0-10v1',
 governance:'M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5'
};
const groups=[['EXPERIMENT',['overview','Overview'],['performance','Performance'],['holdings','Holdings & allocation']],['RESEARCH',['screening','Ethical screening'],['research','Research profiles'],['daily','Daily research']],['OPERATIONS',['tracking','Tracking inputs'],['exceptions','Exceptions & reviews'],['governance','Governance'],['about','About Ragwar Fintech']]];
let state,revision=0,experimentId='001',period='1Y',query='',saving=false;
const current=()=>state.experiments.find(x=>x.id===experimentId)??state.experiments[0];
const page=()=>Object.hasOwn(paths,location.hash.slice(1))?location.hash.slice(1):'overview';
const dateNow=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());
const stamp=()=>new Date().toISOString();
const days=s=>s?esc(s):'—';
function toast(message){$('toast').textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').textContent='',4200);}
function history(e,label,note=''){e.history.unshift({date:stamp(),label,note});}
async function persist(next){
 const res=await fetch('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,state:next})});
 const data=await res.json();
 if(!res.ok)throw Error(data.error);
 revision=data.revision;state=next;
}
function intro(title,sub,actions=''){
 return '<div class="titlebar"><div><div class="kicker">Ethical Investments Platform</div><h1>'+title+'</h1><p>'+sub+'</p></div><div class="actions">'+actions+'</div></div>';
}
const boundary='<div class="boundary"><strong>◈ &nbsp; General research</strong><span>Hypothetical capital · Supervised decision support · Individualized advice and broker execution are outside scope.</span></div>';
function allocation(e){
 const classes=e.holdings.reduce((a,h)=>{const k=h.asset.toLowerCase().includes('equity')?'Equities':h.asset.toLowerCase().includes('bond')?'Fixed income':h.asset.toLowerCase()==='cash'?'Cash':'Other';a[k]=(a[k]||0)+h.weight;return a;},{});
 const items=Object.entries(classes);let sum=0;
 const stops=items.map(([,w],i)=>{const start=sum;sum+=w;return colors[i]+' '+start+'% '+Math.min(100,sum)+'%';});
 if(sum<100)stops.push('#34434c '+sum+'% 100%');
 return card(heading('Target allocation','Model weights by asset class')+
 '<div class="allocbody"><div class="ring" style="background:conic-gradient('+stops.join(',')+')"><div><strong>'+sum+'%</strong><small>ALLOCATED</small></div></div><div>'+
 items.map(([k,w],i)=>'<div class="allocrow"><span><i class="swatch" style="background:'+colors[i]+'"></i>'+k+'</span><strong>'+w+'%</strong></div>').join('')+'</div></div>');
}
function chart(e){
 const perf=performance(e.observations,period);
 const points=perf.points;
 const series=points.flatMap(p=>columns.map(k=>p[k]));
 const lo=Math.min(0,...series),hi=Math.max(.001,...series);
 const t=s=>Date.parse(s+'T00:00:00Z');
 const x=p=>40+500*(t(p.date)-t(points[0].date))/(t(points.at(-1).date)-t(points[0].date));
 const y=v=>15+133*(hi-v)/(hi-lo);
 const grids=Array.from({length:5},(_,i)=>'<path d="M40 '+(15+i*33.25)+'H540" stroke="#30404a" stroke-dasharray="3 4"/>'+
 (points.length?'<text x="34" y="'+(18+i*33.25)+'" text-anchor="end" fill="#9db0ba" font-size="9">'+((hi-(hi-lo)*i/4)*100).toFixed(1)+'%</text>':'')).join('');
 const lines=points.length?columns.map((k,i)=>'<polyline fill="none" stroke="'+colors[i]+'" stroke-width="2" points="'+points.map(p=>x(p)+','+y(p[k])).join(' ')+'"/>').join('')+
 '<text x="40" y="166" fill="#9db0ba" font-size="9">'+perf.first.date+'</text><text x="540" y="166" text-anchor="end" fill="#9db0ba" font-size="9">'+perf.last.date+'</text>':'';
 return card(heading('Performance comparison',perf.last?'As of '+esc(perf.last.date)+' · cumulative chart':'Aligned total-return series',
 '<div class="seg" aria-label="Performance period">'+periods.map(p=>'<button data-period="'+p+'" aria-pressed="'+(p===period)+'">'+p+'</button>').join('')+'</div>')+
 '<div class="plot"><svg role="img" aria-label="Cumulative total returns" viewBox="0 0 550 173" preserveAspectRatio="none">'+grids+lines+'</svg>'+
 (!points.length?'<div class="empty"><strong>'+(!perf.last?'Awaiting verified observations':'Insufficient history for '+period)+'</strong><span>'+(!perf.last?'Add dated observations in Tracking Inputs.':'A common start and end observation is required.')+'</span></div>':'')+'</div>'+
 '<div class="legend">'+names.map((n,i)=>'<span><i style="background:'+colors[i]+'"></i>'+n+'</span>').join('')+'</div>');
}
function overview(e){
 const open=e.exceptions.filter(x=>!['Closed','Waived'].includes(x.status)).length;
 return intro('Portfolio Experiment '+esc(e.id),esc(e.title)+' · Research and paper portfolio tracking',btn('＋ New experiment','new',true)+btn('Configure','config'))+boundary+
 '<div class="cards">'+metric('Hypothetical capital',money(e.capital),'USD · initial model capital')+
 metric('Target holdings',e.holdings.length,'Across model allocations')+
 metric('Performance status',e.observations.length?'Tracking':'Awaiting data',e.inception?'Inception '+esc(e.inception):'Verified inception pending')+
 metric('Open exceptions',open,open?'Review items in the register':'No open items')+'</div>'+
 '<div class="dashboard">'+chart(e)+allocation(e)+'</div>'+
 card(heading('Model holdings','Target weights and screening register', '<a class="outline" href="#holdings">View holdings →</a>')+holdTable(e,true));
}
function holdTable(e,compact){
 return e.holdings.length?table(compact?['Ticker / fund','Asset class','Weight','Target capital','Screen']:['Ticker / fund','Asset class','Weight','Target capital','Screen','Expense ratio','Market value','Contribution',''],
 e.holdings.map((h,i)=>{const mv=h.ticker==='CASH'?e.capital*h.weight/100:h.units!=null&&h.price!=null?h.units*h.price:null;
 return ['<strong>'+esc(h.ticker)+'</strong><small>'+esc(h.name)+'</small>',esc(h.asset),h.weight+'%',money(e.capital*h.weight/100),badge(h.status,h.status==='Exception'?'warn':'neutral'),
 ...(!compact?[percent(h.fee==null?null:h.fee/100),money(mv),percent(h.holdingReturn==null?null:h.weight*h.holdingReturn/10000)+(h.returnPeriod?'<small>'+esc(h.returnPeriod)+'</small>':''),btn('Edit','holding:'+i)]:[])];})): '<p>No holdings have been entered.</p>';
}
function performancePage(e){
 const r=risk(e.observations);
 const rows=periods.map(p=>{const v=performance(e.observations,p).returns;
 return [p+(p==='3Y'||p==='5Y'?' ann.':''),...columns.map((_,i)=>percent(v[i])),v.length?((v[0]-v[1])*100).toFixed(2)+' pp':'—'];});
 return intro('Performance','Compare like-for-like total returns and inspect observed risk.')+boundary+'<div class="dashboard">'+chart(e)+card(heading('Risk measures','Based on aligned portfolio and policy benchmark observations')+
 table(['Measure','Observed value'],[['Maximum observed drawdown',percent(r.drawdown)],['Annualized monthly volatility',percent(r.volatility)],['Annualized monthly tracking error',percent(r.tracking)],['Matched monthly returns',r.count??'—']])+
 '<p class="small spaced">Volatility and tracking error require six consecutive-month pairs. Drawdown is based on recorded observations and may miss intra-period declines.</p>')+'</div>'+
 card(heading('Side-by-side returns','Common endpoints. 3Y and 5Y are annualized. The chart displays cumulative returns.')+table(['Period','Portfolio','Policy blend','S&P 500 / '+esc(e.sp),'Russell 1000 / '+esc(e.russell),'Active vs blend'],rows)+
 '<p class="small spaced">'+esc(e.primary)+' · '+esc(e.benchmarkNote)+'</p>');
}
function holdingsPage(e){
 const invested=e.holdings.filter(h=>h.weight>0&&h.ticker!=='CASH');
 const fee=invested.length&&invested.every(h=>h.fee!=null)?invested.reduce((sum,h)=>sum+h.weight*h.fee/10000,0):null;
 return intro('Holdings & allocation','Review model exposures, position values, contribution and expenses.',btn('＋ Add holding','holding',true))+boundary+
 '<div class="split">'+allocation(e)+card(heading('Fee and contribution analysis','Target-weight estimates')+
 '<p>Weighted annual fund expenses <strong>'+percent(fee)+'</strong></p><p class="spaced">Estimated annual dollars <strong>'+money(fee==null?null:fee*e.capital)+'</strong></p>'+
 '<p class="small spaced">Enter dated expense ratios in each holding. Cash is assumed to have zero fund expense. Estimate excludes commissions, spreads, taxes and advisory charges.</p>'+
 '<p class="small spaced">Contribution is target weight × same-period holding total return. Use a single common observation period and treat these estimates as fixed-weight analysis.</p>')+'</div>'+
 card(heading('Position register','Market value uses entered units and last verified price. Cash is shown at its model target.')+holdTable(e,false));
}
function record(title,sub,note,source,actions=''){
 return card('<article class="record"><div class="section-head"><h3>'+esc(title)+'</h3>'+sub+'</div><p>'+esc(note)+'</p><div class="actions">'+link(source)+actions+'</div></article>');
}
function screening(){
 return intro('Ethical screening','Reusable criteria across experiments. Document evidence and review decisions.',btn('＋ Add criterion','criterion',true))+boundary+
 '<div class="records">'+state.criteria.map((r,i)=>record(r.title,badge(r.type,r.type==='Exclusion'?'warn':''),r.rule,r.source,btn('Edit','criterion:'+i))).join('')+'</div>';
}
function research(){
 return intro('Research profiles','Maintain company and fund due diligence, with evidence and screening status.',btn('＋ Add profile','profile',true))+boundary+
 '<div class="actions spaced"><input id="query" class="search" aria-label="Filter profiles" placeholder="Search by ticker, name or type" value="'+esc(query)+'"></div><div id="profiles" class="records spaced">'+profileRecords()+'</div>';
}
function profileRecords(){
 return state.profiles.map((r,i)=>({r,i})).filter(({r})=>(r.ticker+' '+r.title+' '+r.type).toLowerCase().includes(query.toLowerCase()))
 .map(({r,i})=>record(r.ticker+' · '+r.title,badge(r.type+' · '+r.status,r.status==='Exception'?'warn':''),r.note,r.source,btn('Edit','profile:'+i))).join('')||'<p>No matching profiles. Add a company or fund profile to begin.</p>';
}
function daily(){
 return intro('Daily company research','Log company research, source evidence and questions for supervised review.',btn('＋ Add entry','daily',true))+boundary+
 '<div class="records">'+(state.daily.map((r,i)=>({r,i})).sort((a,b)=>b.r.date.localeCompare(a.r.date)).map(({r,i})=>record(r.ticker+' · '+r.title,badge(r.date,'neutral'),r.note,r.source,btn('Edit','daily:'+i))).join('')||
 card('<h2>Research journal</h2><p class="spaced">Add the first entry from the daily company research briefing or from your own due diligence. Record business fundamentals, ethical findings and open questions with the source.</p>'))+'</div>';
}
function tracking(e){
 const forms=e.holdings.filter(h=>h.symbol).map(h=>[esc(h.ticker),esc(h.symbol),days(h.entryDate||e.inception),h.entry??'—',h.units??'—',h.price??'—',days(h.priceDate)]);
 return intro('Tracking inputs','Record verified model entries and aligned return observations.',btn('＋ Enter observations','observations',true))+boundary+
 '<div class="stack">'+card(heading('Google Finance handoff','Use these inputs in your named Google Finance paper portfolio.',btn('↓ Tracking CSV','trackingcsv'))+
 (forms.length?table(['Holding','Exchange ticker','Entry date','Entry price','Units','Last price','Price date'],forms):'<p>Add holdings with exchange tickers to prepare a handoff.</p>')+
 '<p class="small spaced">Verify exchange symbols, dates, share counts and cost basis before entry. Google quotes can be delayed. Historical GOOGLEFINANCE data is unavailable through the Sheets API or Apps Script. '+link(google,'Google documentation ↗')+'</p>')+
 card(heading('Performance observations',e.observations.length+' dated rows · latest '+(e.observations.at(-1)?.date||'pending'),btn('Edit observations','observations'))+
 '<p>Paste a complete CSV of aligned USD total-return index levels with one common date per row. Use a flow-adjusted, fee-consistent portfolio index and reinvested benchmark series. Attach source evidence for the dataset.</p><code class="code spaced">date,portfolio,blend,sp,russell</code>'+
 (e.source?'<p class="spaced">'+link(e.source,'Observation dataset evidence ↗')+'</p>':'')+
 (e.observations.length?'<div class="spaced">'+table(['Date',...names],e.observations.slice(-5).reverse().map(r=>[r.date,...columns.map(k=>r[k])]))+'</div>':''))+'</div>';
}
function exceptions(e){
 return intro('Exceptions & reviews','Assign reviewers, record evidence and track decisions through closure.',btn('＋ Log exception','exception',true))+boundary+
 '<div class="records">'+(e.exceptions.map((r,i)=>record(r.title,badge(r.status,['Open','In review'].includes(r.status)?'warn':''),r.note+'\n\nOwner '+(r.owner||'unassigned')+' · Review date '+(r.due||'pending'),r.source,btn('Review','exception:'+i))).join('')||card('<p>No exceptions have been recorded.</p>'))+'</div>';
}
function governance(e){
 return intro('Governance','Evidence, methodology, human approvals and experiment history.',btn('＋ Add record','governance',true))+boundary+
 '<div class="split">'+card(heading('Methodology v'+esc(e.method),'Experiment '+esc(e.id),btn('Edit configuration','config'))+'<p>'+esc(e.assumptions)+'</p><p class="small spaced">The Ragwar Control Plane is independent of this workspace. Governance entries document human research decisions.</p>')+
 card(heading('Review history','Timestamped workspace changes')+(e.history.length?e.history.map(h=>'<div class="timeline"><strong>'+esc(h.label)+'</strong><br><small>'+esc(h.date.replace('T',' ').slice(0,16))+(h.date.includes('T')?' UTC':'')+' · '+esc(h.note)+'</small></div>').join(''):'<p>No reviews recorded.</p>'))+'</div>'+
 '<div class="records">'+e.governance.map(r=>record(r.title,badge(r.kind),r.note+(r.reviewer?'\n\nReviewer '+r.reviewer:'')+(r.date?' · '+r.date.slice(0,10):''),r.source)).join('')+'</div>';
}
let aboutProfile;
function about(){
 if(!aboutProfile){
  fetch('/api/profile').then(response=>{
   if(!response.ok)throw Error('Profile unavailable');
   return response.json();
  }).then(payload=>{
   aboutProfile=payload;
   if(page()==='about')render();
  }).catch(()=>{
   if(page()==='about')$('profile-content').textContent='The profile could not be loaded. Reload to retry.';
  });
  return intro('About Ragwar Fintech','Investment research workspace')+boundary+card('<p id="profile-content" role="status">Loading profile…</p>');
 }
 const {profile,source}=aboutProfile;
 return intro(esc(profile.name),esc(profile.tagline))+boundary+
 '<div class="stack">'+card(heading('Profile',source==='contentful'?'Published through Contentful':'Built-in profile')+'<p class="break">'+esc(profile.overview)+'</p>')+
 '<div class="split">'+card(heading('Research focus','Portfolio experiments and screening')+'<p class="break">'+esc(profile.researchFocus)+'</p>')+
 card(heading('Methodology','Evidence and human review')+'<p class="break">'+esc(profile.methodology)+'</p>')+'</div></div>';
}
const views={about,overview,performance:performancePage,holdings:holdingsPage,screening,research,daily,tracking,exceptions,governance};
function render(){
 if(!state)return;
 const id=page(),e=current();
 $('nav').innerHTML=groups.map(([g,...links])=>'<div class="navgroup">'+g+'</div>'+links.map(([key,label])=>'<a class="navitem" href="#'+key+'" '+(key===id?'aria-current="page"':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[key]+'"/></svg>'+label+'</a>').join('')).join('');
 $('crumb').textContent=groups.flatMap(g=>g.slice(1)).find(([k])=>k===id)[1];
 $('experiment').innerHTML=state.experiments.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===e.id?'selected':'')+'>Experiment '+esc(x.id)+'</option>').join('');
 $('main').innerHTML=views[id](e);
}
const f=(key,label,type='text',extra={})=>({key,label,type,...extra});
const optional={required:false};
const note=(label='Research notes')=>f('note',label,'textarea');
const source=(required=false)=>f('source','Evidence URL','url',{required});
const statuses=['Pending','Pass','Conditional','Fail','Exception'];
const schema={
 new:['New portfolio experiment',[f('id','Experiment ID','text',{attrs:'pattern="[A-Za-z0-9\\-]{1,16}"'}),f('capital','Hypothetical capital (USD)','number',{attrs:'min="0.01" step="0.01"'}),f('title','Strategy name','text',{full:true})]],
 config:['Experiment configuration',[f('title','Strategy name'),f('capital','Hypothetical capital (USD)','number',{attrs:'min="0.01" step="0.01"'}),f('inception','Verified inception date','date',optional),f('method','Methodology version'),f('primary','Policy benchmark blend','text',{full:true}),f('sp','S&P 500 symbol / proxy'),f('russell','Russell 1000 symbol / proxy'),f('benchmarkNote','Benchmark basis and rebalancing','textarea'),f('assumptions','Assumptions and methodology','textarea')]],
 holding:['Holding details',[f('ticker','Ticker','text',{attrs:'pattern="[A-Za-z0-9.:\\-]{1,24}"'}),f('name','Holding name'),f('asset','Asset class'),f('weight','Target weight (%)','number',{attrs:'min="0" max="100" step="0.01"'}),f('symbol','Google Finance exchange ticker','text',optional),f('status','Screening status',statuses),f('entryDate','Verified entry date','date',optional),f('entry','Entry price (USD)','number',{...optional,attrs:'min="0.000001" step="any"'}),f('units','Model units','number',{...optional,attrs:'min="0" step="any"'}),f('price','Last verified price (USD)','number',{...optional,attrs:'min="0" step="any"'}),f('priceDate','Price date','date',optional),f('fee','Annual expense ratio (%)','number',{...optional,attrs:'min="0" max="100" step="any"'}),f('holdingReturn','Same-period holding total return (%)','number',{...optional,attrs:'min="-100" step="any"'}),f('returnPeriod','Contribution date range','text',optional),source(),note('Screening and input notes')]],
 criterion:['Screening criterion',[f('title','Criterion'),f('type','Type',['Exclusion','Conduct review','Positive screen']),f('rule','Rule and evidence requirements','textarea'),source()]],
 profile:['Research profile',[f('ticker','Ticker'),f('title','Company or fund name'),f('type','Profile type',['Company','Fund']),f('status','Screening status',statuses),note('Business or mandate, fundamentals, risks and ethical findings'),source()]],
 daily:['Daily company research entry',[f('date','Research date','date'),f('ticker','Company ticker'),f('title','Company or research headline','text',{full:true}),note('Business fundamentals, ethical findings and open questions'),source(true)]],
 exception:['Exception review',[f('title','Exception title','text',{full:true}),f('status','Status',['Open','In review','Waived','Closed']),f('due','Next review date','date',optional),f('owner','Owner or reviewer','text',{...optional,full:true}),note('Rationale or review decision'),source()]],
 governance:['Governance record',[f('kind','Record type',['Source','Assumption','Methodology','Approval','Evidence','Review']),f('reviewer','Recorded by / reviewer','text',optional),f('title','Record title','text',{full:true}),note('Decision, scope or evidence summary'),source()]],
 observations:['Performance observations',[f('source','Dataset evidence URL','url'),f('csv','Aligned total-return levels (CSV)','textarea')]]
};
let edit;
function fieldHtml(field,val){
 const {key,label,type,required=true,full,attrs=''}=field;
 const attr=' name="'+key+'" '+(required?'required ':'')+attrs;
 let control;
 if(Array.isArray(type))control='<select'+attr+'>'+type.map(o=>'<option '+(o===val?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select>';
 else if(type==='textarea')control='<textarea'+attr+'>'+esc(val)+'</textarea>';
 else control='<input type="'+type+'"'+attr+' value="'+esc(val)+'">';
 return '<label class="'+(full||type==='textarea'?'full':'')+'">'+esc(label)+control+'</label>';
}
const lists={holding:'holdings',criterion:'criteria',profile:'profiles',daily:'daily',exception:'exceptions',governance:'governance'};
function collection(s,e,key){return s[lists[key]]??e[lists[key]];}
const observationHeader='date,portfolio,blend,sp,russell';
function openEditor(action){
 const [key,pos]=action.split(':');const index=pos==null?null:Number(pos);
 const [title,fields]=schema[key]; const e=current();
 let defaults={};
 if(key==='config')defaults=e;
 else if(key==='observations')defaults={source:e.source,csv:[observationHeader,...e.observations.map(r=>[r.date,...columns.map(k=>r[k])].join(','))].join('\n')};
 else if(index!=null)defaults=collection(state,e,key)[index];
 else if(key==='new')defaults={id:String(Math.max(0,...state.experiments.map(x=>Number(x.id)||0))+1).padStart(3,'0'),capital:100000};
 else if(key==='daily')defaults={date:dateNow()};
 else if(key==='holding')defaults={status:'Pending'};
 edit={key,index};
 $('form-error').textContent='';
 $('formbody').innerHTML='<div class="eyebrow">Research workspace</div><h2>'+title+'</h2>'+
 (key==='observations'?'<p>Replace the full observation series with aligned dated total-return levels. Set the verified inception date first in Configure.</p>':'')+
 '<div class="fields">'+fields.map(field=>fieldHtml(field,defaults[field.key])).join('')+'</div>';
 $('dialog').showModal();
}
function collectForm(key){
 const data=new FormData($('form'));
 return Object.fromEntries(schema[key][1].map(field=>{
  const raw=String(data.get(field.key)??'').trim();
  if(field.required!==false&&!raw)throw Error(field.label+' is required.');
  if(field.type==='url'&&raw&&!safeUrl(raw))throw Error('Use an HTTPS or HTTP evidence URL.');
  return [field.key,field.type==='number'?value(raw):raw];
 }));
}
function editWorkspace(next,key,index,record){
 const e=next.experiments.find(x=>x.id===current().id);
 let selected=e.id;
 if(key==='new'){
  if(next.experiments.some(x=>x.id.toLowerCase()===record.id.toLowerCase()))throw Error('This experiment ID already exists.');
  const created=blankExperiment(record.id,record.title,record.capital);
  history(created,'Created experiment','Hypothetical model capital '+money(created.capital));next.experiments.push(created);selected=created.id;
 }else if(key==='config'){
  if(e.observations.length&&(!record.inception||record.inception>e.observations[0].date))throw Error('Inception must be on or before the earliest observation.');
  const previous={...e};
  Object.assign(e,record);
  const changes=Object.keys(record).filter(k=>record[k]!==previous[k]).map(k=>k+' '+(previous[k]||'pending')+' → '+(record[k]||'pending'));
  if(changes.length)history(e,'Updated experiment configuration',changes.join(' · '));
 }else if(key==='observations'){
  e.observations=importObservations(record.csv,e.inception);
  e.source=record.source;
  e.governance.unshift({kind:'Evidence',title:'Performance observations',source:record.source,note:e.observations.length+' aligned rows · '+e.observations[0].date+' through '+e.observations.at(-1).date+' · methodology v'+e.method});
  history(e,'Replaced observation dataset',e.observations.length+' dated rows');
 }else{
  const target=collection(next,e,key);
  const previous=index==null?null:target[index];
  if(key==='holding'){
   record.ticker=record.ticker.toUpperCase();
   if(target.some((h,i)=>i!==index&&h.ticker===record.ticker))throw Error('This ticker already exists in the experiment.');
   if(target.reduce((sum,h,i)=>sum+(i===index?0:h.weight),0)+record.weight>100.000001)throw Error('Target weights may total at most 100%.');
   if(record.holdingReturn!=null&&!record.returnPeriod)throw Error('Provide a contribution date range for the holding return.');
   if(record.price!=null&&!record.priceDate)throw Error('Provide the date for the last price.');
   if(record.entry!=null&&!record.entryDate&&!e.inception)throw Error('Provide an entry date or configure verified inception.');
   if([record.entry,record.price,record.fee,record.holdingReturn].some(v=>v!=null)&&!record.source)throw Error('Attach evidence for entered prices, expenses or returns.');
  }
  if(key==='exception'&&['Closed','Waived'].includes(record.status)&&(!record.owner||!record.source))throw Error('Closure and waiver require a reviewer and evidence URL.');
  if(key==='governance'&&record.kind==='Approval'&&(!record.reviewer||!record.source))throw Error('Approval requires a reviewer and evidence URL.');
  if(key==='governance')record.date=stamp();
  if(index==null)target.unshift(record);else target[index]=record;
  const description=record.title||record.ticker;
  const review=key==='exception'?' · '+(previous?.status||'New')+' → '+record.status+' · '+(record.owner||'unassigned')+' · '+record.note+(record.source?' · '+record.source:''):'';
  history(e,(index==null?'Added ':'Updated ')+key,description+review);
 }
 return selected;
}
$('form').addEventListener('submit',async event=>{
 event.preventDefault();if(saving)return;
 const {key,index}=edit;const next=structuredClone(state);
 $('form-error').textContent='';
 try{
  const selected=editWorkspace(next,key,index,collectForm(key));
  saving=true;$('submit').disabled=true;$('cancel').disabled=true;
  await persist(next);experimentId=selected;
  $('dialog').close();if(key==='new')location.hash='overview';
  render();toast('Research record saved');
 }catch(error){$('form-error').textContent=error.message;}
 finally{saving=false;$('submit').disabled=false;$('cancel').disabled=false;}
});
$('dialog').addEventListener('cancel',ev=>{if(saving)ev.preventDefault();});
$('cancel').addEventListener('click',()=>$('dialog').close());
function download(name,body,type){
 const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const csvSafe=x=>typeof x==='string'&&/^[\s]*[=+\-@]/.test(x)?"'"+x:x;
function trackingCsv(){
 const e=current();
 const rows=[['Ticker','Google Finance symbol','Entry date','Entry price USD','Units','Cost basis USD','Last price USD','Price date','Evidence URL'],...e.holdings.filter(h=>h.symbol).map(h=>[h.ticker,h.symbol,h.entryDate||e.inception,h.entry,h.units,h.entry!=null&&h.units!=null?h.entry*h.units:null,h.price,h.priceDate,h.source])];
 download('ragwar-'+e.id+'-tracking.csv',rows.map(r=>csvRow(r.map(csvSafe))).join('\r\n'),'text/csv');
}
function exportReport(){
 const e=current();
 const ret=periods.map(p=>{const r=performance(e.observations,p);return [p,...columns.map((_,i)=>percent(r.returns[i]))].join(' | ');});
 const k=risk(e.observations);
 const lines=[
  '# Ragwar Fintech — Portfolio Experiment '+e.id,'',e.title,'','General research · Hypothetical capital · Supervised decision support','',
  'Generated '+stamp(),'Model capital '+money(e.capital),'Inception '+(e.inception||'pending'),'Methodology v'+e.method,e.assumptions,'',
  '## Benchmarks',e.primary,e.sp+' · S&P 500 proxy',e.russell+' · Russell 1000 proxy',e.benchmarkNote,'',
  '## Performance','Data through '+(e.observations.at(-1)?.date||'pending'),'Source '+(e.source||'pending'),'3Y and 5Y returns are annualized.','',
  '| Period | Portfolio | Policy blend | S&P 500 | Russell 1000 |','|---|---|---|---|---|',...ret.map(r=>'| '+r+' |'),'',
  'Drawdown '+percent(k.drawdown)+' · volatility '+percent(k.volatility)+' · tracking error '+percent(k.tracking),'',
  '## Holdings',...e.holdings.map(h=>'- '+h.ticker+' · '+h.name+' · '+h.weight+'% · '+h.status+' · annual expenses '+percent(h.fee==null?null:h.fee/100)+' · estimated contribution '+percent(h.holdingReturn==null?null:h.weight*h.holdingReturn/10000)+' '+(h.returnPeriod||'')+' · '+(h.source||'')+' · '+h.note),'',
  '## Ethical criteria',...state.criteria.map(r=>'- '+r.title+' · '+r.type+' · '+r.rule+' · '+(r.source||'')),'',
  '## Research profiles',...state.profiles.map(r=>'- '+r.ticker+' · '+r.type+' · '+r.status+' · '+r.note+' · '+(r.source||'')),'',
  '## Daily research',...state.daily.map(r=>'- '+r.date+' · '+r.ticker+' · '+r.title+' · '+r.note+' · '+r.source),'',
  '## Exceptions',...e.exceptions.map(r=>'- '+r.title+' · '+r.status+' · '+(r.owner||'unassigned')+' · '+(r.due||'pending')+' · '+r.note+' · '+(r.source||'')),'',
  '## Governance',...e.governance.map(r=>'- '+r.kind+' · '+r.title+' · '+(r.reviewer||'')+' · '+(r.date||'')+' · '+r.note+' · '+(r.source||'')),'',
  '## Review history',...e.history.map(r=>'- '+r.date+' · '+r.label+' · '+r.note)
 ];
 download('ragwar-'+e.id+'-research-report.md',lines.join('\n'),'text/markdown');
 toast('Research report downloaded');
}
$('main').addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button)return;
 if(button.dataset.period){period=button.dataset.period;render();$('main').querySelector('[data-period="'+period+'"]')?.focus();return;}
 const action=button.dataset.action;
 if(action==='trackingcsv')trackingCsv();
 else if(action)openEditor(action);
});
$('main').addEventListener('input',event=>{
 if(event.target.id==='query'){query=event.target.value;$('profiles').innerHTML=profileRecords();}
});
$('experiment').addEventListener('change',event=>{experimentId=event.target.value;render();});
$('export').addEventListener('click',()=>{if(state)exportReport();});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);$('main').focus({preventScroll:true});});
async function load(){
 try{
  const response=await fetch('/api/workspace');
  if(!response.ok)throw Error();
  const payload=await response.json();
  state=payload.state??structuredClone(seed);revision=payload.revision;render();
 }catch{
  $('main').innerHTML=card('<h2>Workspace unavailable</h2><p class="spaced">The research records could not be loaded. Reload to retry.</p>');
 }
}
load();
