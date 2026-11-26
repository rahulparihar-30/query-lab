export async function postgresStore(connectionString){
 const {neon}=await import('@neondatabase/serverless');
 const sql=neon(connectionString);
 await sql.transaction([
  sql`SELECT pg_advisory_xact_lock(771253)`,
  sql`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash BYTEA NOT NULL)`,
  sql`CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires BIGINT NOT NULL)`,
  sql`CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires)`,
  sql`CREATE TABLE IF NOT EXISTS attempts("user" TEXT NOT NULL REFERENCES users(id), problem INTEGER NOT NULL, passed INTEGER NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  sql`CREATE INDEX IF NOT EXISTS attempts_user_problem ON attempts("user",problem)`,
  sql`CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, window_id BIGINT NOT NULL, used INTEGER NOT NULL)`,
  sql`CREATE INDEX IF NOT EXISTS rate_limits_window ON rate_limits(window_id)`
 ]);
 return {
  byName:async name=>(await sql`SELECT id,username,salt,encode(hash,'hex') AS hash FROM users WHERE username=${name}`).map(row=>({...row,hash:Buffer.from(row.hash,'hex')}))[0],
  addUser:async (id,name,salt,hash)=>(await sql`INSERT INTO users VALUES(${id},${name},${salt},decode(${hash.toString('hex')},'hex')) ON CONFLICT(username) DO NOTHING RETURNING id`).length>0,
  session:async (token,now)=>(await sql`SELECT users.id,username FROM sessions JOIN users ON users.id=user_id WHERE token=${token} AND expires>${now}`)[0],
  removeSession:token=>sql`DELETE FROM sessions WHERE token=${token}`,
  cleanup:now=>sql`DELETE FROM sessions WHERE expires<=${now}`,
  addSession:(token,id,expires)=>sql`INSERT INTO sessions VALUES(${token},${id},${expires})`,
  progress:id=>sql`SELECT problem,COUNT(*)::int AS attempts,MAX(passed) AS solved,to_char(MAX(at) AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS') AS last FROM attempts WHERE "user"=${id} GROUP BY problem`,
  solved:async (id,problem)=>(await sql`SELECT 1 FROM attempts WHERE "user"=${id} AND problem=${problem} AND passed=1 LIMIT 1`).length>0,
  attempt:(id,problem,passed)=>sql`INSERT INTO attempts("user",problem,passed) VALUES(${id},${problem},${passed})`,
  async limited(key,max){
   const window=Math.floor(Date.now()/60000);
   const [row]=await sql`INSERT INTO rate_limits VALUES(${key},${window},1)
    ON CONFLICT(key) DO UPDATE SET used=CASE WHEN rate_limits.window_id=EXCLUDED.window_id THEN rate_limits.used+1 ELSE 1 END,window_id=EXCLUDED.window_id RETURNING used`;
   if(Math.random()<0.01)await sql`DELETE FROM rate_limits WHERE window_id<${window-10}`;
   return row.used>max;
  }
 };
}


