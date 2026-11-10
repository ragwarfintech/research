const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export default {async fetch(request, env) {
  const path = new URL(request.url).pathname;
  const json = (body,status=200) => Response.json(body,{status,headers});
  if (path === '/mcp' && request.method === 'POST') return researchMcp(request, env, json);
  if (path === '/api/research-journal') {
    try { return await researchJournal(request, env, json); }
    catch { return json({error:'Research journal unavailable'},503); }
  }
  if (request.method === 'GET' && assets[path]) {
    const [type, body] = assets[path];
    return new Response(body, {headers:{...headers,'Content-Type':type,'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'self'"}});
  }
  if (path === '/api/profile' && request.method === 'GET') {
    return Response.json(await getResearchProfile(env), {headers});
  }
  if (path !== '/api/workspace') return new Response('Not found',{status:404});
  try {
    if (request.method === 'GET') {
      const row = await env.DB.prepare('SELECT revision, payload FROM workspace WHERE id = 1').first();
      return json(row ? {revision:row.revision,state:JSON.parse(row.payload)} : {revision:0,state:null});
    }
    if (request.method !== 'PUT') return json({error:'Method unavailable'},405);
    if (request.headers.get('Origin') !== new URL(request.url).origin || !request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Same-origin JSON required'},403);
    const raw = await request.text();
    if (raw.length > 800000) return json({error:'Workspace size limit reached'},413);
    const {revision,state} = JSON.parse(raw);
    if (!Number.isSafeInteger(revision) || revision < 0 || !Array.isArray(state?.experiments) || !Array.isArray(state?.profiles) || !Array.isArray(state?.criteria) || !Array.isArray(state?.daily)) return json({error:'Invalid workspace'},400);
    const payload = JSON.stringify(state);
    const result = revision === 0
      ? await env.DB.prepare('INSERT OR IGNORE INTO workspace VALUES (1,1,?)').bind(payload).run()
      : await env.DB.prepare('UPDATE workspace SET revision = revision + 1, payload = ? WHERE id = 1 AND revision = ?').bind(payload, revision).run();
    return result.meta.changes ? json({revision:revision+1}) : json({error:'Workspace changed in another tab. Reload and retry.'},409);
  } catch (error) {
    console.error(error.message);
    return json({error:'Workspace storage is unavailable'},503);
  }
}};
