import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
let running=0;
export async function evaluate(input){
 if(running>=2) return {busy:true,error:'The SQL runner is busy. Try again shortly.'};
 running++;
 try{
  return await new Promise(resolve=>{
   const child=execFile(process.execPath,['--max-old-space-size=64',fileURLToPath(new URL('./judge.mjs',import.meta.url))],
    {timeout:2500,maxBuffer:4000000,windowsHide:true,env:process.platform==='win32'?{SystemRoot:process.env.SystemRoot}:{}},
    (error,out)=>{
     if(error)return resolve({error:'Query stopped at the execution limit.'});
     try{resolve(JSON.parse(out))}catch{resolve({error:'Query could not be evaluated.'})}
    });
   child.stdin.on('error',()=>{});
   child.stdin.end(JSON.stringify(input));
  });
 }finally{running--}
}
