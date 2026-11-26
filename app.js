const app=document.querySelector('#app');
const esc=v=>String(v??'NULL').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const table=(cols,rows)=>'<div class="scroll"><table><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const state=await fetch('/api/home').then(r=>r.json());
let filter='All';
const stat=id=>state.progress.find(x=>x.problem===id)||{};
const badge=p=>'<span class="badge '+p.level+'">'+p.level+'</span>';
let collection='',search='',page=0;
const library=state.problems.slice().sort((a,b)=>{
 const order=p=>p.db==='charts'?p.id-330:p.db==='marvel'?p.id-220:p.db==='music'?2*(p.id-10):p.db==='cinema'?2*(p.id-100)+1:1000+p.id;
 return order(a)-order(b);
});
let sequence=library;
function catalog(){
 app.innerHTML=`<section class="mast"><div><p class="kicker">QUERYLAB / SQL STUDIO</p><h1>Practice library</h1><p>From midnight playlists to opening-weekend box offices.</p></div><div class="record" aria-hidden="true"></div></section>
 <section class="collections"><button data-db="charts" class="cover charts"><small>YOUTUBE VIEW COUNTS</small><strong>Global Jukebox</strong></button><button data-db="marvel" class="cover marvel"><small>MARVEL COLLECTION</small><strong>Release desk</strong></button><button data-db="music" class="cover music"><span class="sound" aria-hidden="true">▂▆▃█▅▇▂</span><small>MUSIC COLLECTION</small><strong>Midnight Records</strong></button><button data-db="cinema" class="cover cinema"><span class="frames" aria-hidden="true">◩ ◩ ◩</span><small>CINEMA COLLECTION</small><strong>Silver Screen</strong></button></section>
 <div class="row"><h2>Challenges</h2><small id="count"></small></div><div class="tools"><input id="search" aria-label="Search challenges" placeholder="Search titles or SQL concepts"><select id="collection" aria-label="Collection"><option value="">All collections</option>${Object.entries(state.datasets).map(([k,d])=>'<option value="'+k+'">'+esc(d.label)+'</option>').join('')}</select><select id="level" aria-label="Difficulty">${['All','Easy','Medium','Hard'].map(l=>'<option value="'+l+'">'+(l==='All'?'All difficulties':l)+'</option>').join('')}</select></div><div id="list"></div><div id="pager" class="row"></div>`;
 const field=document.querySelector('#search'),db=document.querySelector('#collection'),level=document.querySelector('#level');
 field.value=search;db.value=collection;level.value=filter;
 function draw(){
 const matches=library.filter(p=>(!collection||p.db===collection)&&(filter==='All'||p.level===filter)&&[p.title,p.concept,p.prompt].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
 sequence=matches;
 document.querySelector('#count').textContent=matches.length+' challenges';
 document.querySelector('#list').innerHTML=matches.slice(page*12,page*12+12).map(p=>`<a class="challenge" href="#problem/${p.id}"><span class="glyph ${p.db}" aria-hidden="true">${p.db==='music'?'♫':p.db==='cinema'?'▥':'▤'}</span><span><strong>${p.title}</strong><small>${esc(state.datasets[p.db].label)} · ${esc(p.concept||'SQL fundamentals')}${stat(p.id).solved?' · ✓ Solved':''}</small></span>${badge(p)}<span aria-hidden="true">↗</span></a>`).join('')||'<p>No challenges match these filters.</p>';
 const pages=Math.ceil(matches.length/12);
 const pager=document.querySelector('#pager');pager.innerHTML=pages>1?`<button id="prev" ${page===0?'disabled':''}>← Previous</button><small>Page ${page+1} of ${pages}</small><button id="next" ${page+1===pages?'disabled':''}>Next →</button>`:'';
 if(pages>1){pager.querySelector('#prev').onclick=()=>{page--;draw()};pager.querySelector('#next').onclick=()=>{page++;draw()}}
 }
 function update(){search=field.value;collection=db.value;filter=level.value;page=0;draw()}
 field.oninput=db.onchange=level.onchange=update;
 document.querySelectorAll('[data-db]').forEach(b=>b.onclick=()=>{db.value=b.dataset.db;field.value='';level.value='All';update();field.scrollIntoView({block:'center'})});
 draw()
}async function post(path,data){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return r.json()}
const accountLink=document.querySelector('#account-link');
function accountForm(register){
 const mode=register?'register':'login';
 app.innerHTML=`<article class="account-panel"><h1>${register?'Create an account':'Sign in'}</h1><form id="account-form"><label>Username<input name="username" required minlength="3" maxlength="32" autocomplete="username"></label><label>Password<input name="password" type="password" required minlength="15" maxlength="128" autocomplete="${register?'new-password':'current-password'}"></label><button class="primary">${register?'Create account':'Sign in'}</button><p role="status"></p></form><a href="${register?'#login':'#register'}">${register?'Already have an account? Sign in':'Create an account'}</a></article>`;
 const form=app.querySelector('#account-form'),button=form.querySelector('button'),status=form.querySelector('[role=status]');
 form.onsubmit=async event=>{
  event.preventDefault();
  button.disabled=true;
  try{
   const result=await post(mode,Object.fromEntries(new FormData(form)));
   if(result.error){status.textContent=result.error;return}
   const home=await fetch('/api/home').then(response=>response.json());
   Object.assign(state,home);
   location.hash=sessionStorage.getItem('after-login')||'#profile';
   sessionStorage.removeItem('after-login');
  }catch{status.textContent='Connection unavailable. Try again.'}
  finally{button.disabled=false}
 };
}function render(){
 const solved=state.progress.filter(x=>x.solved).length;
 const hash=location.hash;
 document.body.classList.toggle('solving',/^#problem\//.test(hash));
 accountLink.textContent=state.account?'Sign out':'Sign in';
 accountLink.href=state.account?'#logout':'#login';
 if(hash==='#logout'){
  post('logout',{}).then(result=>{
   if(result.error)throw Error();
   state.account=null;state.progress=[];location.hash='#catalog';
  }).catch(()=>{app.textContent='Could not sign out. Refresh and try again.'});
  return;
 }
 if(hash==='#login'||hash==='#register'||hash==='#profile'&&!state.account){accountForm(hash==='#register');return}
 if(hash==='#profile'){
 const attempts=state.progress.reduce((n,x)=>n+x.attempts,0);
 app.innerHTML='<section class="hero"><div><small>PERSONAL WORKSPACE</small><h1>My profile</h1><p>Practice history for this browser profile.</p></div><div class="score">'+solved+' / '+state.problems.length+'</div></section><h2>Progress by difficulty</h2><div class="grid">'+['Easy','Medium','Hard'].map(l=>{const ps=state.problems.filter(p=>p.level===l);return '<article>'+l+'<h2>'+ps.filter(p=>stat(p.id).solved).length+' / '+ps.length+' solved</h2></article>'}).join('')+'</div><h2>Submission history · '+attempts+' attempts</h2><article>'+(attempts?table(['Problem','Attempts','Status','Last submitted (UTC)'],state.progress.slice().sort((a,b)=>b.last.localeCompare(a.last)).map(s=>[state.problems.find(p=>p.id===s.problem).title,s.attempts,s.solved?'Solved':'In progress',s.last])):'Submit a query to start tracking your progress.')+'</article>';return;
 }
 const p=state.problems.find(x=>hash==='#problem/'+x.id);
 if(!p){catalog();return}
 const d=state.datasets[p.db];
 const queue=sequence.some(x=>x.id===p.id)?sequence:library;
 const index=queue.findIndex(x=>x.id===p.id);
 const neighbor=(n,label)=>queue[n]?'<a class="btn" href="#problem/'+queue[n].id+'">'+label+'</a>':'<button disabled>'+label+'</button>';
 const tables=()=>d.tables.map(t=>{
 const cols=t.schema.split('(')[1].split(',').map(s=>s.trim().split(' ')[0]);
 return '<details open><summary>'+esc(t.schema.split('(')[0])+'</summary><pre>'+esc(t.schema)+'</pre>'+table(cols,t.rows)+'</details>';
 }).join('');
 app.innerHTML=`<div class="question-nav"><a href="#catalog">Library</a><div>${neighbor(index-1,'Previous')} <small>${index+1} / ${queue.length}</small> ${neighbor(index+1,'Next')}</div></div><div class="qtitle">${badge(p)}<h1>${esc(p.title)}</h1></div><div class="mobile-tabs"><button aria-pressed="true">Question &amp; tables</button><button aria-pressed="false">SQL editor</button></div><div class="workspace"><article class="brief" aria-label="Question and tables" tabindex="0"><small>${esc(d.label)}</small><h2>Brief</h2><p>${esc(p.prompt)}</p>${p.db==='marvel'?'<p class="sources"><a target="_blank" rel="noreferrer" href="https://en.wikipedia.org/wiki/List_of_Marvel_Cinematic_Universe_films">Historical U.S. release dates</a> · <a target="_blank" rel="noreferrer" href="https://www.whenisthenextmcufilm.com/api">Upcoming release feed</a></p><button id="refresh">Refresh release radar</button><p id="feed-status" role="status"></p>':''}${p.db==='charts'?`<p>Selected YouTube uploads. Views were retrieved on November 26, 2026. Each upload is grouped under its first-listed artist. Language describes the recording.</p><p class="sources">${d.tables[0].rows.map(([,name,url])=>'<a target="_blank" rel="noreferrer" href="'+esc(url)+'">'+esc(name)+'</a>').join(' · ')}</p>`:''}<h2>Database tables</h2><div id="schema">${tables()}</div></article><article class="editor"><div class="row"><h2><label for="sql">Query editor</label></h2><small>SQLite</small></div><textarea id="sql" spellcheck="false" placeholder="SELECT ..."></textarea><div class="actions"><button id="run">Run query</button><button id="submit" class="primary">Submit answer</button></div><div aria-live="polite" id="result"></div><hr><button id="solution">View solution</button><div id="answer"></div></article></div>`;
 const workspace=app.querySelector('.workspace');
 app.querySelectorAll('.mobile-tabs button').forEach((b,i)=>b.onclick=()=>{
   workspace.classList.toggle('editing',i===1);
   app.querySelectorAll('.mobile-tabs button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 });
 let version=JSON.stringify(d.tables.at(-1).rows);
 const refresh=app.querySelector('#refresh');
 if(refresh){
   const status=app.querySelector('#feed-status'),schema=app.querySelector('#schema');
   async function sync(){
    refresh.disabled=true;status.textContent='Checking release feed...';
    try{
     const data=await fetch('/api/radar').then(r=>r.json());
     if(!refresh.isConnected)return;
     d.tables.at(-1).rows=data.rows;version=JSON.stringify(data.rows);
     schema.innerHTML=tables();
     status.textContent=data.offline?'Feed unavailable. Showing '+(data.updated?'last fetched data from '+new Date(data.updated).toLocaleString():'the bundled November 2026 snapshot')+'.':'Feed checked '+new Date(data.updated).toLocaleString()+'.';
    }catch{status.textContent='Connection unavailable. Showing the displayed snapshot.'}
    finally{refresh.disabled=false}
   }
   refresh.onclick=sync;sync();
 } const sql=document.querySelector('#sql'),result=document.querySelector('#result'),solution=document.querySelector('#solution');
 sql.value=localStorage.getItem('draft-'+(state.account?.username||'guest')+'-'+p.id)||'';sql.oninput=()=>localStorage.setItem('draft-'+(state.account?.username||'guest')+'-'+p.id,sql.value);
 function lock(){solution.disabled=!stat(p.id).solved;solution.textContent=solution.disabled?'Solution locked · solve to unlock':'View solution'}lock();
 const answer=app.querySelector('#answer');solution.onclick=async()=>{const data=await post('solution',{id:p.id});answer.innerHTML='<pre>'+esc(data.solution||data.error)+'</pre>'};
 const run=document.querySelector('#run'),submit=document.querySelector('#submit');
 async function execute(grade){if(run.disabled)return;
 if(!state.account){sessionStorage.setItem('after-login',location.hash);location.hash='#login';return}run.disabled=submit.disabled=true;result.textContent='Running query…';try{
 const r=await post('query',{id:p.id,sql:sql.value,submit:grade,version});if(r.progress)state.progress=r.progress;
 result.innerHTML='<p class="verdict">'+esc(r.error||(grade?(r.passed?'✓ Accepted':'Wrong answer · check your rows and column order'):'Query complete'))+'</p>'+(r.rows?table(r.columns,r.rows)+'<small>'+r.rows.length+' rows</small>':'');lock()
 }catch{result.textContent='Connection lost. Try again.'}finally{run.disabled=submit.disabled=false}}
 run.onclick=()=>execute(false);submit.onclick=()=>execute(true);sql.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();execute(false)}};
}
window.addEventListener('hashchange',render);render();




