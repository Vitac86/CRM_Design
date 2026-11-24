// Local read-only preview. The response contract can be implemented by the CRM backend.
import { createServer } from 'node:http';
import { readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = await fs.realpath(fileURLToPath(new URL('../',import.meta.url)));
const live = process.argv.includes('--live');
let referenceSource;
let port = Number(process.argv[2] ?? 4178);
if (live) {
  referenceSource = await import('./qort/reference.mjs');
  const {settings} = await import('./qort/connection.mjs');
  port = Number(settings().QORT_PORT || 4179);
} else {
  const sandbox = {};
  for (const name of ['instrument-securities-demo.js','instrument-catalog.js']) {
    runInNewContext(readFileSync(path.join(root,'assets/js/document-wizard',name),'utf8'),sandbox,{filename:name});
  }
  const catalog = sandbox.CRMInstrumentCatalog;
  referenceSource = {search:catalog.mockPage, detail:catalog.mockDetail};
}
const apiPath = '/api/order-reference/assets';
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
  '.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf',
  '.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.ico':'image/x-icon'};
function json(res,status,data) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
}

async function reference(url,res) {
  if (url.pathname === apiPath) return json(res,200,await referenceSource.search(Object.fromEntries(url.searchParams)));
  const id=decodeURIComponent(url.pathname.slice(apiPath.length+1));
  const date=url.searchParams.get('settlementDate') || '';
  const tradeDate=url.searchParams.get('tradeDate') || '';
  for (const value of [date,tradeDate]) {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) ||
        new Date(value).toISOString().slice(0,10)!==value)) return json(res,400,{error:'Некорректная дата'});
  }
  const quotation=url.searchParams.get('quotation') || '';
  const accruedCurrency=url.searchParams.get('accruedCurrency') || '';
  if (quotation && !['percent','cash'].includes(quotation) || accruedCurrency && !/^[A-Z]{3}$/.test(accruedCurrency))
    return json(res,400,{error:'Некорректный способ котировки или валюта НКД'});
  const detail=await referenceSource.detail(id,date,{tradeDate,quotation,accruedCurrency});
  return json(res,detail?200:404,detail || {error:'Актив не найден'});
}

const server = createServer(async (req,res) => {
  if (req.method !== 'GET') return json(res,405,{error:'Метод не поддерживается'});
  try {
    const url=new URL(req.url,'http://localhost');
    if (url.pathname === apiPath || url.pathname.startsWith(apiPath+'/')) return await reference(url,res);
    const prefix='/static-uikit/';
    if (!url.pathname.startsWith(prefix)) return json(res,404,{error:'Страница не найдена'});
    const relative=decodeURIComponent(url.pathname.slice(prefix.length)) || 'INDEX.html';
    if (relative.split(/[\\/]/).some(part => part.startsWith('.')) || /^(?:tools|handoff)(?:[\\/]|$)/i.test(relative))
      return json(res,404,{error:'Файл не найден'});
    const file=await fs.realpath(path.resolve(root,relative));
    if (!file.startsWith(root+path.sep)) return json(res,404,{error:'Файл не найден'});
    let content=await fs.readFile(file);
    if (path.relative(root,file).split(path.sep).join('/').toLowerCase()==='pages/document-wizard.html') {
      content=content.toString('utf8').replace(/<script src="[^"]*\/instrument-securities-demo\.js"><\/script>/,'')
        .replace('</head>','<meta name="crm-order-reference-api" content="'+apiPath+'" data-mode="'+(live?'qort':'demo')+'">\n</head>');
    }
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(content);
  } catch (error) {
    if (error.status) return json(res,error.status,{error:error.message});
    const missing=['ENOENT','EISDIR','ENOTDIR'].includes(error.code);
    json(res,missing?404:400,{error:missing?'Файл не найден':'Некорректный запрос'});
  }
});
server.listen(port,'127.0.0.1',() => {
  console.log('http://127.0.0.1:'+server.address().port+'/static-uikit/pages/document-wizard.html?subject=c-006');
});
