const artists=[
 [1,'Justin Bieber','justinbieber'],[2,'Taylor Swift','taylorswift'],
 [3,'Post Malone','postmalone'],[4,'Luis Fonsi','luisfonsi'],[5,'PSY','psy']
];
const recordings=[
 [1,'Sorry',null,'English','2015-10',4185104779],
 [1,'Baby','Ludacris','English','2010-02',3806871552],
 [1,'What Do You Mean?',null,'English','2015-08',2332593388],
 [1,'Love Yourself',null,'English','2015-11',1840150653],
 [2,'Blank Space',null,'English','2014-11',3886632689],
 [2,'Shake It Off',null,'English','2014-08',3755134241],
 [2,'Bad Blood','Kendrick Lamar','English','2015-05',1694363244],
 [2,'Style',null,'English','2015-02',977138398],
 [3,'Sunflower','Swae Lee','English','2018-10',3227931862],
 [3,'Congratulations','Quavo','English','2017-01',1741226374],
 [3,'Circles',null,'English','2019-09',830245586],
 [3,'Better Now',null,'English','2018-10',734091188],
 [4,'Despacito','Daddy Yankee','Spanish','2017-01',9182806293],
 [4,'Despacito (remix audio)','Daddy Yankee, Justin Bieber','Spanish / English','2017-04',694335198],
 [4,'No Me Doy Por Vencido',null,'Spanish','2009-12',363308751],
 [5,'Gangnam Style',null,'Korean','2012-07',6140846330],
 [5,'Gentleman',null,'Korean','2013-04',1771445705]
];
const dated=rows=>rows.map(row=>[...row,'2026-11-26']);
export const chartData={label:'Global Jukebox',tables:[
 {schema:'artists(id INTEGER, name TEXT, source_url TEXT)',rows:artists.map(([id,name,slug])=>[id,name,'https://kworb.net/youtube/artist/'+slug+'.html']),extra:[]},
 {schema:'videos(artist_id INTEGER, title TEXT, collaborators TEXT, language TEXT, published_month TEXT, views INTEGER, retrieved_on TEXT)',rows:dated(recordings),extra:dated([
 [2,'Love Story',null,'English','2009-06',837722888],[3,'White Iverson',null,'English','2015-07',1192625130],[1,'Ghost',null,'English','2021-10',558499077]
 ])}
]};
const tasks=[
 ['Easy','Sorting','The billion-view bouncer','Return titles and views of uploads with at least a billion views. Sort by views descending, then title ascending.','SELECT title,views FROM videos WHERE views>=1000000000 ORDER BY views DESC,title',true],
 ['Easy','Joins','Bieber fever','Return the titles and publication months of videos where Justin Bieber is the primary artist.', "SELECT title,published_month FROM videos JOIN artists ON artists.id=videos.artist_id WHERE name='Justin Bieber'"],
 ['Easy','NULL','No plus-one on the guest list','Return titles of uploads with no credited collaborators in this collection.','SELECT title FROM videos WHERE collaborators IS NULL'],
 ['Medium','GROUP BY','The subtitles department','Return each language label, video count and combined views. Keep the bilingual label as its own group.','SELECT language,COUNT(*),SUM(views) FROM videos GROUP BY language'],
 ['Medium','Aggregation','Swifties versus the spreadsheet','Return each primary artist name and total views across their listed uploads. Sort by total descending, then name ascending.','SELECT name,SUM(views) FROM artists JOIN videos ON artists.id=artist_id GROUP BY artists.id ORDER BY SUM(views) DESC,name',true],
 ['Medium','String filtering','Justin gets a guest pass','Return title and primary artist name for recordings listing Justin Bieber among the collaborators.', "SELECT title,name FROM videos JOIN artists ON artists.id=artist_id WHERE collaborators LIKE '%Justin Bieber%'"],
 ['Hard','Window functions','One headliner per artist','Return artist name, title and views for all uploads tied for the highest views within each primary artist.','WITH ranked AS (SELECT artist_id,title,views,DENSE_RANK() OVER(PARTITION BY artist_id ORDER BY views DESC) r FROM videos) SELECT name,title,views FROM ranked JOIN artists ON artists.id=artist_id WHERE r=1'],
 ['Hard','Percent share','How much of Post is Sunflower?', 'Return the percentage of Post Malone’s listed video views contributed by Sunflower, rounded to two decimal places.', "SELECT ROUND(100.0*SUM(CASE WHEN title='Sunflower' THEN views ELSE 0 END)/SUM(views),2) FROM videos JOIN artists ON artists.id=artist_id WHERE name='Post Malone'"]
];
export const chartProblems=tasks.map(([level,concept,title,prompt,solution,ordered=false],i)=>({id:300+i,db:'charts',level,concept,title,prompt,solution,ordered}));
