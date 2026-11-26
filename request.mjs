export async function readJson(req){
 if(req.headers['content-type']?.split(';')[0]!=='application/json')
  throw Object.assign(Error('Expected JSON.'),{status:415});
 const chunks=[];
 let size=0;
 for await(const chunk of req.iterator({destroyOnReturn:false})){
  size+=chunk.length;
  if(size>32768)throw Object.assign(Error('Request is too large.'),{status:413});
  chunks.push(chunk);
 }
 try{
  const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value)) throw Error();
  return value;
 }catch{throw Object.assign(Error('Invalid JSON request.'),{status:400})}
}
