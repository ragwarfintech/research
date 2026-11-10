import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const assets={};
for (const [url,file,type] of [['/','index.html','text/html'],['/style.css','style.css','text/css'],['/app.js','app.js','text/javascript'],['/model.js','model.js','text/javascript']]) {
  assets[url]=[type+'; charset=utf-8',await readFile('src/'+file,'utf8')];
}
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await writeFile('dist/server/index.js', 'const assets = '+JSON.stringify(assets)+';\n'+await readFile('src/worker.js','utf8'));
