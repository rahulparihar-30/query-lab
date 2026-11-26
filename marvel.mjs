export const releaseSource='https://www.whenisthenextmcufilm.com/api';
export const historySource='https://en.wikipedia.org/wiki/List_of_Marvel_Cinematic_Universe_films';
const historical={schema:'mcu_films(title TEXT, us_release TEXT, director TEXT)',rows:[
 ['Iron Man','2008-05-02','Jon Favreau'],['The Incredible Hulk','2008-06-13','Louis Leterrier'],['Iron Man 2','2010-05-07','Jon Favreau'],['Thor','2011-05-06','Kenneth Branagh'],['Captain America: The First Avenger','2011-07-22','Joe Johnston'],['The Avengers','2012-05-04','Joss Whedon']
],extra:[['Iron Man 3','2013-05-03','Shane Black'],['Avengers: Age of Ultron','2015-05-01','Joss Whedon']]};
export const savedRows=[['Avengers: Doomsday','2026-12-16','Movie'],['Avengers: Secret Wars','2027-12-15','Movie']];
export const marvel={label:'Marvel release desk',tables:[historical,{schema:'release_radar(title TEXT, feed_release TEXT, production_type TEXT)',rows:savedRows,extra:[]}]};
const entries=[
 ['Easy','Date ordering','Fury needs a watchlist','Nick Fury has one free weekend. Return the historical film titles in U.S. release order, breaking ties by title.','SELECT title FROM mcu_films ORDER BY us_release,title',true],
 ['Easy','Pattern matching','Tony named it after himself again','From the historical films, return titles beginning with Iron Man and their U.S. release dates.', "SELECT title,us_release FROM mcu_films WHERE title LIKE 'Iron Man%'"],
 ['Medium','Aggregation','Someone kept the director’s chair','Return directors credited on more than one historical film, with their film counts.','SELECT director,COUNT(*) FROM mcu_films GROUP BY director HAVING COUNT(*)>1'],
 ['Hard','Window functions','Previously, in this universe…','Return each historical title and the number of days since the preceding U.S. release, using date then title for chronology. Keep NULL for the first film.', 'SELECT title,CAST(julianday(us_release)-julianday(LAG(us_release) OVER(ORDER BY us_release,title)) AS INTEGER) FROM mcu_films'],
 ['Easy','Sorting','The post-credits calendar','The credits are still rolling. From release_radar return the earliest listed production title and feed date, breaking ties by title.','SELECT title,feed_release FROM release_radar ORDER BY feed_release,title LIMIT 1'],
 ['Medium','Date arithmetic','How long is the post-credits scene?','Return the number of days between the earliest and latest dates listed in release_radar. A single listed production means zero days.','SELECT CAST(julianday(MAX(feed_release))-julianday(MIN(feed_release)) AS INTEGER) FROM release_radar'],
 ['Medium','UNION ALL','Multiverse calendar merge','Return title and date from both tables, retaining every entry. Sort by date, then title. Use the date each source reports.','SELECT title,us_release AS day FROM mcu_films UNION ALL SELECT title,feed_release FROM release_radar ORDER BY day,title',true]
];
export const marvelProblems=entries.map(([level,concept,title,prompt,solution,ordered=false],i)=>({id:200+i,db:'marvel',level,concept,title,prompt,solution,ordered}));
let current={rows:savedRows,updated:null},pending,lastAttempt=0,offline=false;
export async function radar(){
 if(!pending && Date.now()-lastAttempt>60000){
  lastAttempt=Date.now();
  pending=(async()=>{
   try{
    const response=await fetch(releaseSource,{signal:AbortSignal.timeout(3500)});
    if(!response.ok) throw Error('Feed unavailable');
    const first=await response.json();
    const rows=[first,first.following_production].filter(Boolean).map(x=>{
     if(typeof x.title!=='string'||!x.title.trim()||typeof x.type!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.release_date)) throw Error('Unexpected release data');
     return [x.title,x.release_date,x.type];
    });
    current={rows,updated:new Date().toISOString()};offline=false;
   }catch{offline=true}finally{pending=null}
  })();
 }
 await pending;
 return {...current,offline};
}
