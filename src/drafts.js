const draftFields = ['date','ticker','title','business','financials','valuation','ethics','questions','methodology'];
const draftTool = {
  name:'submit_research_draft',
  description:'Save one unpublished company research draft for human review. Returns the stored ID and review state. Retrying the same date and ticker preserves the original report.',
  inputSchema:{
    type:'object',
    properties:{
      ...Object.fromEntries(draftFields.map(key=>[key,{type:'string',minLength:1,maxLength:4000}])),
      sources:{type:'array',minItems:2,maxItems:12,items:{type:'string',format:'uri'}}
    },
    required:[...draftFields,'sources'],
    additionalProperties:false
  }
};

function normalizeDraft(input) {
  const draft = {};
  for (const key of draftFields) {
    const value = typeof input?.[key] === 'string' ? input[key].trim() : '';
    if (!value || value.length > (['ticker','date','methodology','title'].includes(key) ? 160 : 4000)) {
      throw new Error('Invalid research field: '+key);
    }
    draft[key] = value;
  }
  const date = new Date(draft.date+'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !Number.isFinite(+date) || date.toISOString().slice(0,10)!==draft.date) throw new Error('Use a valid YYYY-MM-DD research date.');
  draft.ticker = draft.ticker.toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9.\-]{0,14}$/.test(draft.ticker)) throw new Error('Use a valid company ticker.');
  if (!Array.isArray(input.sources) || input.sources.length > 12) throw new Error('Provide two to twelve distinct HTTPS source URLs.');
  draft.sources = [...new Set(input.sources.map(source=>{
    const url = typeof source==='string' && source.length<=2000 ? URL.parse(source) : null;
    if (!url || url.protocol!=='https:' || url.username || url.password) throw new Error('Use valid HTTPS source URLs.');
    url.hash='';
    return url.href;
  }))];
  if (draft.sources.length<2) throw new Error('Provide at least two distinct source URLs.');
  return draft;
}

async function researchMcp(request, env, json) {
  const body = await request.text();
  if (body.length>50000) return json({error:'Research request too large'},413);
  let rpc;
  try { rpc = JSON.parse(body); } catch { return json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON'}}); }
  const respond = result=>json({jsonrpc:'2.0',id:rpc?.id??null,result});
  if (rpc?.method==='server/discover') return respond({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
  if (rpc?.method==='tools/list') return respond({tools:[draftTool]});
  if (rpc?.method!=='tools/call' || rpc.params?.name!==draftTool.name) {
    return json({jsonrpc:'2.0',id:rpc?.id??null,error:{code:-32601,message:'Method unavailable'}});
  }
  const email = request.headers.get('oai-authenticated-user-email');
  if (!email || !env.RESEARCH_WRITER_EMAIL || email.toLowerCase()!==env.RESEARCH_WRITER_EMAIL.toLowerCase() || !request.headers.get('oai-authenticated-user-id')) {
    return json({error:'Research writer access required'},403);
  }
  const message = (text,isError=false)=>respond({content:[{type:'text',text}],isError});
  let draft;
  try { draft=normalizeDraft(rpc.params.arguments); } catch (error) { return message(error.message,true); }
  const id = draft.date+':'+draft.ticker;
  try {
    const result = await env.DB.prepare('INSERT OR IGNORE INTO research_drafts (id,research_date,ticker,payload,submitted_by,submitted_at) VALUES (?,?,?,?,?,?)').bind(id,draft.date,draft.ticker,JSON.stringify(draft),email,new Date().toISOString()).run();
    const saved = await env.DB.prepare('SELECT id, decision, submitted_at FROM research_drafts WHERE id = ?').bind(id).first();
    if (!saved) return message('Draft could not be verified.',true);
    return message(JSON.stringify({id:saved.id,status:saved.decision??'draft',submittedAt:saved.submitted_at,created:!!result.meta.changes}));
  } catch {
    return message('Research storage unavailable. Retry with the same date and ticker.',true);
  }
}

async function researchJournal(request, env, json) {
  if (request.method==='GET') {
    const {results} = await env.DB.prepare('SELECT id, payload, decision, reviewer, reviewed_at FROM research_drafts ORDER BY research_date DESC, id').all();
    return json({reports:results.map(row=>({...JSON.parse(row.payload),id:row.id,decision:row.decision,reviewer:row.reviewer,reviewedAt:row.reviewed_at}))});
  }
  if (request.method!=='POST') return json({error:'Method unavailable'},405);
  if (request.headers.get('Origin')!==new URL(request.url).origin || !request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Same-origin JSON required'},403);
  let body;
  try { body = await request.json(); } catch { return json({error:'Invalid review'},400); }
  const {id,decision}=body??{};
  const reviewer=typeof body?.reviewer==='string'?body.reviewer.trim():'';
  if (typeof id!=='string' || id.length>30 || !['published','rejected'].includes(decision) || !reviewer || reviewer.length>120) return json({error:'Provide a reviewer and review decision'},400);
  const result=await env.DB.prepare('UPDATE research_drafts SET decision = ?, reviewer = ?, reviewed_at = ? WHERE id = ? AND decision IS NULL').bind(decision,reviewer,new Date().toISOString(),id).run();
  return result.meta.changes?json({id,decision}):json({error:'This draft is unavailable or already reviewed. Refresh the journal.'},409);
}
