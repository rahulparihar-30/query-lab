import {randomBytes, randomUUID, scrypt, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';

const derive=promisify(scrypt);
const digest=value=>createHash('sha256').update(value).digest('hex');
const lifetime=7*24*60*60;
const dummySalt=randomBytes(16).toString('hex');
const dummyHash=randomBytes(64);
const hashPassword=(password,salt)=>derive(password,salt,64,{N:131072,r:8,p:1,maxmem:160*1024*1024});

export function accounts(db,secure){
 db.exec(`
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash BLOB NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
 `);
 const cookieName=secure?'__Host-querylab':'querylab';
 const cookie=(token,age)=>`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
 const tokenOf=req=>req.headers.cookie?.match(new RegExp('(?:^|; *)'+cookieName+'=([a-f0-9]{64})(?:;|$)'))?.[1];
 const byName=db.prepare('SELECT * FROM users WHERE username=?');
 const now=()=>Math.floor(Date.now()/1000);
 let hashing=false;
 return {
  get(req){
   const token=tokenOf(req);
   return token && db.prepare('SELECT users.id,users.username FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(digest(token),now());
  },
  logout(req,res){
   const token=tokenOf(req);
   if(token) db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));
   res.setHeader('Set-Cookie',cookie('',0));
  },
  async authenticate(req,res,register,input){
   const username=typeof input.username==='string'?input.username.trim().toLowerCase():'';
   const password=input.password;
   if(!/^[a-z0-9_]{3,32}$/.test(username)||typeof password!=='string'||password.length<15||password.length>128)
    return [400,{error:'Use a 3–32 character username with letters, numbers or underscores, and a 15–128 character password.'}];
   if(hashing) return [429,{error:'Sign-in is busy. Try again shortly.'}];
   hashing=true;
   try {
    let user=byName.get(username);
    const salt=register?randomBytes(16).toString('hex'):user?.salt||dummySalt;
    const hash=await hashPassword(password,salt);
    if(register){
     if(user)return [409,{error:'That username is unavailable.'}];
     user={id:randomUUID(),username};
     db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(user.id,username,salt,hash);
    }else if(!timingSafeEqual(hash,user?.hash||dummyHash)||!user){
     return [401,{error:'Incorrect username or password.'}];
    }
    this.logout(req,res);
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(now());
    const token=randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,now()+lifetime);
    res.setHeader('Set-Cookie',cookie(token,lifetime));
    return [200,{username}];
   }finally{hashing=false}
  }
 };
}
