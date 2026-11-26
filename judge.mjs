import {DatabaseSync, constants as C} from 'node:sqlite';
import {datasets, problems} from './catalog.mjs';
import {readFileSync} from 'node:fs';
const {id,sql,submit,radarRows}=JSON.parse(readFileSync(0,'utf8'));
const p=problems.find(x=>x.id===id), data=datasets[p.db];
function evaluate(hidden){
 const db=new DatabaseSync(':memory:');
 for(const t of data.tables){
   db.exec('CREATE TABLE '+t.schema);
   const placeholders=t.rows[0].map(()=>'?').join(',');
   const insert=db.prepare('INSERT INTO '+t.schema.split('(')[0]+' VALUES ('+placeholders+')');
   const rows=t.schema.startsWith('release_radar(') && radarRows ? radarRows : t.rows;
   for(const row of [...rows,...(hidden?t.extra:[])]) insert.run(...row);
 } db.exec('PRAGMA query_only=ON');
 db.setAuthorizer((action,a,b)=>{
   if(action===C.SQLITE_FUNCTION && !['load_extension','randomblob','zeroblob','printf','format','hex','group_concat','string_agg'].includes(b)) return C.SQLITE_OK;
   return [C.SQLITE_READ,C.SQLITE_SELECT,C.SQLITE_RECURSIVE].includes(action)?C.SQLITE_OK:C.SQLITE_DENY;
 });
 function run(query){
   const stmt=db.prepare(query);
   if(query.slice(stmt.sourceSQL.length).trim()) throw Error('Run one statement at a time.');
   stmt.setReturnArrays(true);
   const columns=stmt.columns().map(c=>c.name), rows=[];
   for(const row of stmt.iterate()){
     if(rows.length>=250 || JSON.stringify(row).length>8000) throw Error('Result exceeds preview limits.');
     rows.push(row);
   }
   return {columns,rows};
 }
 try {
   const result=run(sql);
   if(!submit) return result;
   const expected=run(p.solution);
   const normalize=rows=>{const keys=rows.map(row=>JSON.stringify(row));return JSON.stringify(p.ordered?keys:keys.sort())};
   return {...result,passed:result.columns.length===expected.columns.length && normalize(result.rows)===normalize(expected.rows)};
 } finally {db.close()}
}
try{
 const result=evaluate(false);
 if(submit && result.passed) result.passed=evaluate(true).passed;
 console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({error:error.message}))}


