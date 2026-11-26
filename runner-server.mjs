import {createHash,timingSafeEqual} from 'node:crypto';
import http from 'node:http';
import {evaluate} from './runner.mjs';
import {readJson} from './request.mjs';

const token=process.env.RUNNER_TOKEN;
const hash=value=>createHash('sha256').update(value).digest();
const expected=token?hash('Bearer '+token):null;
http.createServer({requestTimeout:10000},async(req,res)=>{
 if(req.method!=='POST'||req.url!=='/evaluate'){res.writeHead(404).end();return}
 if(expected&&!timingSafeEqual(hash(req.headers.authorization||''),expected)){res.writeHead(401).end();return}
 try{
  const input=await readJson(req);
  const result=await evaluate(input);
  res.writeHead(result.busy?429:200,{'Content-Type':'application/json'}).end(JSON.stringify(result));
 }catch(error){res.writeHead(error.status||500).end()}
}).listen(3001,'0.0.0.0');

