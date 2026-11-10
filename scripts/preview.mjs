import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import './build.mjs';
const {default:worker}=await import('../dist/server/index.js');
const portIndex=process.argv.indexOf('--port');
const port=Number(portIndex<0?process.env.PORT||3000:process.argv[portIndex+1]);
const db=new DatabaseSync(':memory:');
db.exec(readFileSync('drizzle/0000_workspace.sql','utf8'));
const DB={prepare(sql){const query=db.prepare(sql);return {first:()=>query.get(),bind:(...params)=>({run:()=>({meta:query.run(...params)})})};}};
createServer(async (req,res)=>{
  const chunks=[];
  for await (const chunk of req) chunks.push(chunk);
  const response=await worker.fetch(new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined}),{...process.env,DB});
  res.writeHead(response.status,Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port,'0.0.0.0');
