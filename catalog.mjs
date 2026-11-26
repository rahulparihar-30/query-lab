export const datasets = {
  clinic: {
    schema: 'patients(id INTEGER, first_name TEXT, city TEXT, height INTEGER)',
    rows: [[1,'Chitra','Pune',164],[2,'Chen','Delhi',181],[3,'Maya','Pune',168],[4,'Arun','Delhi',181],[5,'Cara','Mumbai',159]],
    extra: [[6,'chris','Pune',190],[7,'Anu','Mumbai',190],[8,'Sam','Kochi',155]]
  },
  shop: {
    schema: 'orders(id INTEGER, customer TEXT, region TEXT, amount INTEGER)',
    rows: [[1,'Asha','West',120],[2,'Dev','East',90],[3,'Asha','West',80],[4,'Mina','East',200],[5,'Dev','East',110]],
    extra: [[6,'Lee','North',300],[7,'Mina','East',100],[8,'Asha','West',50]]
  }
};
const entries = [
 ['clinic','Easy','Names starting with C','Return first_name for patients whose name starts with C, ignoring case.',"SELECT first_name FROM patients WHERE first_name LIKE 'C%'"],
 ['clinic','Easy','Cities on the map','Return each distinct city in the patient registry.','SELECT DISTINCT city FROM patients'],
 ['shop','Easy','Large orders','Return id and amount for orders worth at least 100.','SELECT id, amount FROM orders WHERE amount >= 100'],
 ['clinic','Medium','Tallest patients','Return first_name and height for every patient tied for the greatest height.','SELECT first_name, height FROM patients WHERE height = (SELECT MAX(height) FROM patients)'],
 ['clinic','Medium','Busy cities','Return city and patient count for cities with at least two patients.','SELECT city, COUNT(*) FROM patients GROUP BY city HAVING COUNT(*) >= 2'],
 ['shop','Medium','Customer totals','Return customer and total amount spent, highest total first. Break ties by customer name ascending.','SELECT customer, SUM(amount) FROM orders GROUP BY customer ORDER BY SUM(amount) DESC, customer',true],
 ['shop','Hard','Regional leaders','Return region, customer and total spend for all customers tied for highest spend within their region.','WITH totals AS (SELECT region, customer, SUM(amount) AS spend FROM orders GROUP BY region, customer), ranked AS (SELECT *, DENSE_RANK() OVER (PARTITION BY region ORDER BY spend DESC) AS rank FROM totals) SELECT region, customer, spend FROM ranked WHERE rank = 1'],
 ['shop','Hard','Running receipts','Return id, customer and cumulative spend per customer as of each order. Sort by id ascending.','SELECT id, customer, SUM(amount) OVER (PARTITION BY customer ORDER BY id) FROM orders ORDER BY id',true],
 ['clinic','Hard','Above the city average','Return first_name and city for patients taller than the average in their own city.','SELECT first_name, city FROM patients p WHERE height > (SELECT AVG(height) FROM patients q WHERE q.city = p.city)']
];
export const problems = entries.map(([db,level,title,prompt,solution,ordered=false],i)=>({id:i+1,db,level,title,prompt,solution,ordered}));
import {studio,challenges} from './studio.mjs';
for(const [key,d] of Object.entries(studio)){
 datasets[key]=d;
 problems.push(...challenges(key,d,key==='music'?10:100));
}
for(const d of Object.values(datasets)) if(!d.tables) d.tables=[{schema:d.schema,rows:d.rows,extra:d.extra}];
const bonus=[
 [60,'music','Medium','Set operations','Build a two-track encore','Return pairs of track ids whose combined runtime is between 390 and 420 seconds inclusive. Each pair must have different credited artists. Put the smaller id first.','SELECT a.id,b.id FROM tracks a JOIN tracks b ON a.id<b.id AND a.artist_id<>b.artist_id WHERE a.seconds+b.seconds BETWEEN 390 AND 420'],
 [61,'music','Hard','Recursive CTE','Fit the vinyl side','A vinyl side has 600 seconds available. Return the greatest total duration you can fit using distinct tracks, with each track used at most once.','WITH RECURSIVE mixes(last,total) AS (VALUES(0,0) UNION SELECT t.id,total+t.seconds FROM mixes JOIN tracks t ON t.id>last WHERE total+t.seconds<=600) SELECT MAX(total) FROM mixes'],
 [62,'music','Medium','String functions','The crate index','Return id and the first word of each track title. Keep a single-word title in full.',"SELECT id,substr(title,1,instr(title||' ',' ')-1) FROM tracks"],
 [63,'music','Medium','Time formatting','Set-list stopwatch','Return track id and runtime as m:ss, with two digits for seconds.','SELECT id,(seconds/60)||\':\'||substr(\'00\'||(seconds%60),-2) FROM tracks'],
 [150,'cinema','Medium','Self joins','Program a double feature','Return film id pairs of different genres whose combined duration plus a 15-minute intermission fits within 220 minutes. Put the smaller id first.','SELECT a.id,b.id FROM films a JOIN films b ON a.id<b.id AND a.genre<>b.genre WHERE a.minutes+b.minutes+15<=220'],
 [151,'cinema','Easy','Modulo','Book the auditoriums','Each auditorium holds 120 people. Return film id and minimum number of full or partial auditoriums needed for its reported ticket sales. Skip unreported films.','SELECT id,(tickets+119)/120 FROM films WHERE tickets IS NOT NULL'],
 [152,'cinema','Medium','Date functions','Friday premieres','Return title and release date of films that opened on a Friday.',"SELECT title,released FROM films WHERE strftime('%w',released)='5'"],
 [153,'cinema','Hard','Window frames','One-night retrospective','Screen films by director id 1 in release order, breaking ties by film id. Return film id and start time as minutes after doors open, with a 10-minute break between films. The first film starts at minute zero.','SELECT id,COALESCE(SUM(minutes+10) OVER(ORDER BY released,id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) FROM films WHERE director_id=1']
];
for(const [id,db,level,concept,title,prompt,solution] of bonus) problems.push({id,db,level,concept,title,prompt,solution});
import {marvel,marvelProblems} from './marvel.mjs';
datasets.marvel=marvel;
problems.push(...marvelProblems);
import {chartData,chartProblems} from './charts.mjs';
datasets.charts=chartData;
problems.push(...chartProblems);
