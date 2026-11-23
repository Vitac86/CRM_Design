// Local read-only preview. The response contract can be implemented by the CRM backend.
import { createServer } from 'node:http';
import { readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = await fs.realpath(fileURLToPath(new URL('../',import.meta.url)));
const sandbox = {};
for (const name of ['instrument-securities-demo.js','instrument-catalog.js']) {
  runInNewContext(readFileSync(path.join(root,'assets/js/document-wizard',name),'utf8'),sandbox,{filename:name});
}
const catalog = sandbox.CRMInstrumentCatalog;
const apiPath = '/api/order-reference/assets';
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
  '.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf',
  '.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.ico':'image/x-icon'};
function json(res,status,data) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
}

function reference(url,res) {
  if (url.pathname === apiPath) return json(res,200,catalog.mockPage(Object.fromEntries(url.searchParams)));
  const id=decodeURIComponent(url.pathname.slice(apiPath.length+1));
  const date=url.searchParams.get('settlementDate') || '';
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0,10)!==date)) return json(res,400,{error:'Некорректная дата'});
  const detail=catalog.mockDetail(id,date);
  return json(res,detail?200:404,detail || {error:'Актив не найден'});
}

const server = createServer(async (req,res) => {
  if (req.method !== 'GET') return json(res,405,{error:'Метод не поддерживается'});
  try {
    const url=new URL(req.url,'http://localhost');
    if (url.pathname === apiPath || url.pathname.startsWith(apiPath+'/')) return reference(url,res);
    const prefix='/static-uikit/';
    if (!url.pathname.startsWith(prefix)) return json(res,404,{error:'Страница не найдена'});
    const relative=decodeURIComponent(url.pathname.slice(prefix.length)) || 'INDEX.html';
    const file=await fs.realpath(path.resolve(root,relative));
    if (!file.startsWith(root+path.sep)) return json(res,404,{error:'Файл не найден'});
    let content=await fs.readFile(file);
    if (relative==='pages/document-wizard.html') {
      content=content.toString('utf8').replace(/<script src="[^"]*\/instrument-securities-demo\.js"><\/script>/,'')
        .replace('</head>','<meta name="crm-order-reference-api" content="'+apiPath+'">\n</head>');
    }
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(content);
  } catch (error) {
    const missing=['ENOENT','EISDIR','ENOTDIR'].includes(error.code);
    json(res,missing?404:400,{error:missing?'Файл не найден':'Некорректный запрос'});
  }
});
server.listen(Number(process.argv[2] ?? 4178),'127.0.0.1',() => {
  console.log('http://127.0.0.1:'+server.address().port+'/static-uikit/pages/document-wizard.html?subject=c-006');
});
