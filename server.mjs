import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {radar} from './marvel.mjs';
import {datasets,problems} from './catalog.mjs';
import {accounts} from './auth.mjs';
import {evaluate} from './runner.mjs';
import {readJson} from './request.mjs';

const local=name=>fileURLToPath(new URL(name,import.meta.url));
const port=Number(process.env.PORT||3000);
const production=process.env.NODE_ENV==='production';
const publicOrigin=process.env.PUBLIC_ORIGIN?new URL(process.env.PUBLIC_ORIGIN).origin:'';
const runnerUrl=process.env.RUNNER_URL;
if(production&&(!publicOrigin.startsWith('https://')||!runnerUrl||!process.env.DATABASE_PATH))
 throw Error('Production requires an HTTPS PUBLIC_ORIGIN, RUNNER_URL and persistent DATABASE_PATH.');

const db=new DatabaseSync(process.env.DATABASE_PATH||local('progress.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS attempts(user TEXT, problem INTEGER, passed INTEGER, at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS attempts_user_problem ON attempts(user,problem)');
const auth=accounts(db,production);
const list=db.prepare('SELECT problem,COUNT(*) AS attempts,MAX(passed) AS solved,MAX(at) AS last FROM attempts WHERE user=? GROUP BY problem');
const solved=db.prepare('SELECT 1 FROM attempts WHERE user=? AND problem=? AND passed=1 LIMIT 1');
const insert=db.prepare('INSERT INTO attempts(user,problem,passed) VALUES(?,?,?)');
const publicProblems=problems.map(({solution,...problem})=>problem);
const publicDatasets=Object.fromEntries(Object.entries(datasets).map(([key,data])=>[key,{label:data.label||key,tables:data.tables.map(({schema,rows})=>({schema,rows}))}]));
const files=new Map([['/app.js','text/javascript'],['/style.css','text/css'],['/favicon.png','image/png']]);
const landing=readFileSync(local('index.html'),'utf8').replace('<!--CANONICAL-->',publicOrigin?'<link rel="canonical" href="'+publicOrigin+'/"><meta property="og:url" content="'+publicOrigin+'/">':'');
const limits=new Map();
function limited(key,max){
 const window=Math.floor(Date.now()/60000);
 if(limits.get('window')!==window){limits.clear();limits.set('window',window)}
 if(limits.size>=10000&&!limits.has(key))return true;
 const count=(limits.get(key)||0)+1;
 limits.set(key,count);
 return count>max;
}

http.createServer({requestTimeout:10000,headersTimeout:10000,maxHeaderSize:8192},async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
 const send=(status,type,value)=>res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:value);
 const reply=(status,data)=>send(status,'application/json; charset=utf-8',JSON.stringify(data));
 const path=req.url.split('?')[0];
 try{
  if(req.method==='GET'||req.method==='HEAD'){
   if(path==='/')return send(200,'text/html; charset=utf-8',landing);
   if(files.has(path))return send(200,files.get(path),readFileSync(local(path.slice(1))));
   if(path==='/healthz')return reply(200,{ok:true});
   if(path==='/robots.txt')return send(200,'text/plain','User-agent: *\nDisallow: /api/\n'+(publicOrigin?'Sitemap: '+publicOrigin+'/sitemap.xml\n':''));
   if(path==='/sitemap.xml'&&publicOrigin)return send(200,'application/xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+publicOrigin+'/</loc></url></urlset>');
  }
  const user=auth.get(req);
  if(req.method==='GET'&&path==='/api/home')return reply(200,{problems:publicProblems,datasets:publicDatasets,progress:user?list.all(user.id):[],account:user?{username:user.username}:null});
  if(req.method==='GET'&&path==='/api/radar')return reply(200,await radar());
  if(req.method!=='POST'||!['/api/register','/api/login','/api/logout','/api/query','/api/solution'].includes(path))return reply(404,{error:'Unknown route'});
  const origin=req.headers.origin;
  if(!(publicOrigin?origin===publicOrigin:[`http://localhost:${port}`,`http://127.0.0.1:${port}`].includes(origin)))return reply(403,{error:'Request origin denied.'});
  if(path==='/api/logout'){auth.logout(req,res);return reply(200,{ok:true})}
  if(path==='/api/login'||path==='/api/register'){
   const ip=production?req.headers['x-querylab-client-ip']||'unknown':req.socket.remoteAddress;
   if(limited('auth:'+ip,12)||limited('auth-global',50))return reply(429,{error:'Too many account requests. Try again in a minute.'});
   return reply(...await auth.authenticate(req,res,path==='/api/register',await readJson(req)));
  }
  if(!user)return reply(401,{error:'Sign in to run queries and save progress.'});
  const {id,sql,submit,version}=await readJson(req);
  const problem=problems.find(item=>item.id===id);
  if(!problem)return reply(404,{error:'Unknown problem'});
  if(path==='/api/solution')return solved.get(user.id,id)?reply(200,{solution:problem.solution}):reply(403,{error:'Solve this problem to unlock its solution.'});
  if(typeof sql!=='string'||!sql.trim()||sql.length>20000)return reply(400,{error:'Enter a query up to 20,000 characters.'});
  if(limited('query:'+user.id,30))return reply(429,{error:'Query limit reached. Try again in a minute.'});
  let radarRows;
  if(problem.db==='marvel'){
   radarRows=(await radar()).rows;
   if(version!==JSON.stringify(radarRows))return reply(409,{error:'Release data changed. Refresh the release radar before running this query.'});
  }
  const input={id,sql,radarRows,submit:submit===true};
  let result;
  if(runnerUrl){
   const response=await fetch(runnerUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(4000)});
   if(!response.ok&&response.status!==429)return reply(503,{error:'The SQL runner is unavailable.'});
   result=await response.json();
  }else result=await evaluate(input);
  if(result.busy)return reply(429,{error:result.error});
  if(submit===true)insert.run(user.id,id,result.passed?1:0);
  return reply(200,{...result,progress:list.all(user.id)});
 }catch(error){
  if(!error.status)console.error(error.name,error.code||'request failed');
  return reply(error.status||503,{error:error.status?error.message:'Service temporarily unavailable.'});
 }
}).listen(port,production?'0.0.0.0':'127.0.0.1');
