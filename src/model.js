export const workbook='';
export const google='https://support.google.com/docs/answer/3093281';
export const periods=['MTD','QTD','1Y','3Y','5Y'];
export const colors=['#75ddbc','#8eabf1','#eac079','#c293dc'];
export const columns=['portfolio','blend','sp','russell'];
export const names=['Portfolio','Policy benchmark','S&P 500 proxy','Russell 1000 proxy'];
const holdings=[
 ['ESGV','Vanguard ESG U.S. Stock ETF','US equity',40,'BATS:ESGV','Conditional','Review current constituents and controversies.'],
 ['VSGX','Vanguard ESG International Stock ETF','International equity',25,'BATS:VSGX','Conditional','Review regional exposures and controversies.'],
 ['SUSC','iShares ESG Aware USD Corporate Bond ETF','US corporate bonds',20,'NASDAQ:SUSC','Conditional','Confirm issuer exclusions against Ragwar policy before inception.'],
 ['BNDX','Vanguard Total International Bond ETF','International bonds',10,'NASDAQ:BNDX','Exception','No dedicated ethical exclusion screen. Replace or document a waiver before inception.'],
 ['CASH','Cash reserve','Cash',5,'','Pass','Verify deposit or counterparty exposure.']
].map(([ticker,name,asset,weight,symbol,status,note])=>({ticker,name,asset,weight,symbol,status,note}));
export function blankExperiment(id,title,capital){
 return {id,title,capital,inception:'',primary:'65% VT / 30% BND / 5% cash',sp:'SPY',russell:'IWB',benchmarkNote:'Policy blend rebalanced monthly. Equity proxies provide context and differ from the balanced policy mix.',method:'1.0',assumptions:'USD. Use aligned total-return levels. Portfolio index must already reflect time weighting, reinvested distributions and transaction costs. Cash earns zero unless an observed yield is recorded.',holdings:[],observations:[],exceptions:[],governance:[],history:[],source:''};
}
export const seed={
 experiments:[{...blankExperiment('001','Balanced ethical strategy',100000),holdings,
 assumptions:'USD. 12-month horizon with monthly observations. Review quarterly and rebalance if allocation drifts more than 5 percentage points. Use time-weighted total return with dividend reinvestment and transaction cost deduction. Assume zero cash return unless yield is recorded. Freeze targets and prices at inception and record subsequent changes prospectively.',
 exceptions:[{title:'BNDX ethical screen exception',status:'Open',owner:'',due:'',note:'The workbook identifies BNDX as an unscreened international bond allocation. Replacement or explicit waiver is pending before inception.',source:workbook}],
 governance:[
 {kind:'Source',title:'Experiment 001 workbook',note:'Source for model capital, target holdings, screening register and benchmark policy. Entry prices and units are pending. Empty-input workbook outputs are excluded.',source:workbook},
 {kind:'Methodology',title:'Performance and policy v1.0',note:'Use aligned USD total-return index levels. Apply identical period boundaries. Annualize 3Y and 5Y from actual elapsed time. Policy benchmark rebalances monthly.',source:workbook},
 {kind:'Approval',title:'Model approval recorded in workbook',note:'Workbook marks the model approved and entry pending. No reviewer name or approval timestamp was provided.',source:workbook},
 {kind:'Source',title:'Google Finance tracking documentation',note:'Manual tracking reference. Verify data rights and instrument coverage before professional use.',source:google},
 {kind:'Source',title:'SPY fund profile',note:'S&P 500 ETF proxy. Proxy returns can differ from index returns.',source:'https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-500-etf-trust-spy'},
 {kind:'Source',title:'IWB fund profile',note:'Russell 1000 ETF proxy. Proxy returns can differ from index returns.',source:'https://www.ishares.com/us/products/239707/ishares-russell-1000-etf'}],
 history:[{label:'Imported approved model and open screening exception',date:'2026-11-06',note:'Workbook record · entry data pending'}]}],
 criteria:[
 ...['Tobacco','Alcohol','Gambling','Adult entertainment','Controversial weapons','Fossil fuel producers'].map(title=>({title,type:'Exclusion',rule:'Review issuer or fund look-through exposure. Document scope, evidence and any exception.',source:workbook})),
 ...['Labor practices','Human rights','Anti-corruption','Environmental controversies'].map(title=>({title,type:'Conduct review',rule:'Review material controversies and the issuer response. Record evidence and reassess quarterly.',source:workbook}))],
 profiles:holdings.filter(h=>h.ticker!=='CASH').map(h=>({ticker:h.ticker,title:h.name,type:'Fund',status:h.status,note:h.note,source:workbook})),daily:[]
};
export const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'—';
export const percent=n=>Number.isFinite(n)?(100*n).toFixed(2)+'%':'—';
export const value=n=>n===''||n==null?null:Number(n);
export function csvRow(row){return row.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',');}
export function parseCsv(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&c===','){row.push(field.trim());field='';}
  else if(!quoted&&c==='\n'){row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw Error('Close the quoted CSV field.');
 row.push(field.trim());if(row.some(Boolean))rows.push(row);return rows;
}
export function importObservations(text,inception){
 if(!inception)throw Error('Set the experiment inception date before recording performance.');
 const [head,...rows]=parseCsv(text);
 if(head?.join(',').toLowerCase()!=='date,portfolio,blend,sp,russell'||!rows.length)throw Error('Use the provided header and at least one observation.');
 if(rows.length>5000)throw Error('Enter at most 5,000 observations.');
 const seen=new Set();
 return rows.map(([date,...levels])=>{
  const d=new Date(date+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+d)||d.toISOString().slice(0,10)!==date||date<inception||seen.has(date)||levels.length!==4||levels.some(v=>!v||!Number.isFinite(+v)||+v<=0))throw Error('Check unique dates on or after inception and four positive index levels per row. Invalid row: '+date);
  seen.add(date);
  return {date,...Object.fromEntries(columns.map((key,i)=>[key,+levels[i]]))};
 }).sort((a,b)=>a.date.localeCompare(b.date));
}
const iso=d=>d.toISOString().slice(0,10);
export function performance(rows,period){
 const last=rows.at(-1);
 if(!last)return {points:[],returns:[],last:null};
 const d=new Date(last.date+'T00:00:00Z');
 const year=d.getUTCFullYear(), month=d.getUTCMonth(), day=d.getUTCDate();
 const years=parseInt(period,10);
 const targetYear=year-years;
 const cut=period==='MTD'?new Date(Date.UTC(year,month,0)):
  period==='QTD'?new Date(Date.UTC(year,Math.floor(month/3)*3,0)):
  new Date(Date.UTC(targetYear,month,Math.min(day,new Date(Date.UTC(targetYear,month+1,0)).getUTCDate())));
 const cutoff=iso(cut);
 const first=rows.findLast(r=>r.date<=cutoff);
 if(!first||first===last||(cut-new Date(first.date+'T00:00:00Z'))/86400000>7)return {points:[],returns:[],last};
 const elapsed=(d-new Date(first.date+'T00:00:00Z'))/86400000/365.2425;
 const points=rows.filter(r=>r.date>=first.date).map(r=>({date:r.date,...Object.fromEntries(columns.map(k=>[k,r[k]/first[k]-1]))}));
 return {points,last,first,returns:columns.map(k=>elapsed>0&&years>=3?(last[k]/first[k])**(1/elapsed)-1:last[k]/first[k]-1)};
}
export function risk(rows){
 if(rows.length<2)return {};
 let peak=rows[0].portfolio,drawdown=0;
 for(const row of rows){peak=Math.max(peak,row.portfolio);drawdown=Math.min(drawdown,row.portfolio/peak-1);}
 const monthly=[...new Map(rows.map(r=>[r.date.slice(0,7),r])).values()].filter(r=>{
  const [y,m]=r.date.split('-').map(Number);
  return new Date(Date.UTC(y,m,0)).getUTCDate()-Number(r.date.slice(-2))<=4;
 });
 const returns=[],active=[];
 for(let i=1;i<monthly.length;i++){
  const a=monthly[i-1],b=monthly[i];
  const monthIndex=r=>Number(r.date.slice(0,4))*12+Number(r.date.slice(5,7));
  if(monthIndex(b)-monthIndex(a)!==1)continue;
  const r=b.portfolio/a.portfolio-1;
  returns.push(r);active.push(r-(b.blend/a.blend-1));
 }
 const sd=xs=>{const mean=xs.reduce((a,b)=>a+b,0)/xs.length;return Math.sqrt(xs.reduce((sum,x)=>sum+(x-mean)**2,0)/(xs.length-1));};
 return {drawdown,count:returns.length,volatility:returns.length>=6?sd(returns)*Math.sqrt(12):null,tracking:returns.length>=6?sd(active)*Math.sqrt(12):null};
}
