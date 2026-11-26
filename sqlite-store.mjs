import {DatabaseSync} from 'node:sqlite';

export function sqliteStore(path){
 const db=new DatabaseSync(path);
 db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash BLOB NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
  CREATE TABLE IF NOT EXISTS attempts(user TEXT, problem INTEGER, passed INTEGER, at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE INDEX IF NOT EXISTS attempts_user_problem ON attempts(user,problem);
 `);
 return {
  byName:name=>db.prepare('SELECT * FROM users WHERE username=?').get(name),
  addUser:(id,name,salt,hash)=>db.prepare('INSERT INTO users VALUES(?,?,?,?) ON CONFLICT(username) DO NOTHING').run(id,name,salt,hash).changes>0,
  session:(token,now)=>db.prepare('SELECT users.id,users.username FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(token,now),
  removeSession:token=>db.prepare('DELETE FROM sessions WHERE token=?').run(token),
  cleanup:now=>db.prepare('DELETE FROM sessions WHERE expires<=?').run(now),
  addSession:(token,id,expires)=>db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token,id,expires),
  progress:id=>db.prepare('SELECT problem,COUNT(*) AS attempts,MAX(passed) AS solved,MAX(at) AS last FROM attempts WHERE user=? GROUP BY problem').all(id),
  solved:(id,problem)=>db.prepare('SELECT 1 FROM attempts WHERE user=? AND problem=? AND passed=1 LIMIT 1').get(id,problem),
  attempt:(id,problem,passed)=>db.prepare('INSERT INTO attempts(user,problem,passed) VALUES(?,?,?)').run(id,problem,passed)
 };
}
