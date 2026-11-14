import {fetchYahoo} from './yahoo.js';
const venues=['NASDAQ','NYSE','AMEX','NYSEARCA','TSX','TSXV','CSE'];
export function parseWatchlist(text){const out=[];for(const token of text.split(/[\s,;]+/).filter(Boolean)){const [exchange,symbol,...rest]=token.toUpperCase().split(':');if(rest.length||!venues.includes(exchange)||!symbol||!/^[A-Z0-9][A-Z0-9.-]*$/.test(symbol))throw Error('Use EXCHANGE:TICKER, for example NASDAQ:PLCE or TSX:RY. OTC and unmapped exchanges are excluded.');if(!out.some(x=>x.exchange===exchange&&x.symbol===symbol))out.push({exchange,symbol,currency:['TSX','TSXV','CSE'].includes(exchange)?'CAD':'USD'});}if(!out.length)throw Error('Add at least one candidate ticker.');if(out.length>10)throw Error('Use up to 10 candidates per scan to limit Yahoo requests.');return out;}
function local(time){const f=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hourCycle:'h23',hour:'2-digit',minute:'2-digit'});const p=Object.fromEntries(f.formatToParts(time).map(x=>[x.type,x.value]));return {day:p.year+'-'+p.month+'-'+p.day,minute:Number(p.hour)*60+Number(p.minute)};}
const bounds={premarket:[240,570],regular:[570,960],afterhours:[960,1200]};
export function windowMetrics(rows,{now=Date.now(),session='regular',window='30'}={}){
 const [startMinute,endMinute]=bounds[session]||[];if(startMinute===undefined)throw Error('Select a supported session.');const today=local(now),isWeekend=[0,6].includes(new Date(new Date(now).toLocaleString('en-US',{timeZone:'America/New_York'})).getDay());
 const bars=rows.filter(r=>{const t=local(r.time);return t.day===today.day&&t.minute>=startMinute&&t.minute<endMinute&&r.time+60000<=now;}).sort((a,b)=>a.time-b.time);
 if(!bars.length)return {eligible:false,reason:'No completed one-minute candles in today’s selected session.'};
 const last=bars.at(-1),lastEnd=last.time+60000;
 if(today.minute<startMinute||today.minute>=endMinute||isWeekend)return {eligible:false,reason:'Selected session is not currently active. Historical sessions are not labeled as current momentum.'};
 if(now-lastEnd>120000)return {eligible:false,reason:'Latest completed candle is over two minutes old; current trajectory unverified.'};
 const sessionStart=bars[0].time-(local(bars[0].time).minute-startMinute)*60000;
 const start=window==='today'?sessionStart:now-Number(window)*60000;
 if(!Number.isFinite(start))throw Error('Invalid return window.');
 if(start<sessionStart)return {eligible:false,reason:'Requested window extends outside the selected session. No daily-gain substitution.'};
 let baseline,startTime,active;
 if(window==='today'||start===sessionStart){if(bars[0].time!==sessionStart)return {eligible:false,reason:'Session opening candle missing.'};baseline=bars[0].open;startTime=sessionStart;active=bars;}
 else{const prior=bars.filter(r=>r.time+60000<=start).at(-1);if(!prior||start-(prior.time+60000)>60000)return {eligible:false,reason:'Requested window baseline missing (one-minute tolerance).'};baseline=prior.close;startTime=prior.time+60000;active=bars.filter(r=>r.time+60000>startTime);}
 if(active[0]?.time>startTime)return {eligible:false,reason:'Missing candle immediately after the requested baseline.'};
 if(active.length<3)return {eligible:false,reason:'Not enough completed candles for trend analysis.'};
 if(active.some((r,i)=>i&&r.time-active[i-1].time!==60000))return {eligible:false,reason:'Candle gaps prevent a continuous-window comparison.'};
 const pct=(last.close/baseline-1)*100,high=Math.max(...active.map(r=>r.high)),low=Math.min(...active.map(r=>r.low));let pv=0,volume=0,dollarVolume=0;for(const r of active){pv+=(r.high+r.low+r.close)/3*r.volume;volume+=r.volume;dollarVolume+=r.close*r.volume;}const vwap=volume?pv/volume:null;
 const tail=active.slice(-Math.min(5,active.length));const n=tail.length,meanX=(n-1)/2,meanY=tail.reduce((a,r)=>a+r.close,0)/n;const numerator=tail.reduce((a,r,i)=>a+(i-meanX)*(r.close-meanY),0),denominator=tail.reduce((a,_,i)=>a+(i-meanX)**2,0);const slope=numerator/denominator;
 const trajectory=slope>0&&pct>0&&vwap!==null&&last.close>=vwap?'upward':slope<0?'fading':'mixed';
 return {eligible:true,session,window,baseline,startTime:new Date(startTime).toISOString(),endTime:new Date(lastEnd).toISOString(),asOf:new Date(now).toISOString(),last:last.close,returnPct:pct,rangePct:(high-low)/baseline*100,high,low,volume,dollarVolume,vwap,trajectory,slopeLast5:slope,spread:null,spreadStatus:'Unavailable from Yahoo chart endpoint',dataStatus:'Experimental Yahoo candles; latency unverified. Completed one-minute bars only. No split/corporate-action verification.'};
}
export async function scanCandidates(instruments,options,{fetcher=fetch,onProgress=()=>{}}={}){const results=[];let stopped=false;for(let i=0;i<instruments.length;i++){const x=instruments[i];if(stopped){results.push({...x,metrics:{eligible:false,reason:'Not requested after Yahoo rate limit.'}});continue;}onProgress('Checking '+(i+1)+'/'+instruments.length+' · '+x.exchange+':'+x.symbol);try{const d=await fetchYahoo(x,1,fetcher);results.push({...x,metrics:windowMetrics(d.rows,options),sourceSymbol:d.symbol,receivedAt:d.receivedAt});}catch(e){results.push({...x,metrics:{eligible:false,reason:e.message}});if(/429/.test(e.message))stopped=true;}}
 return {scope:'User-provided watchlist only; not a market-wide ranking.',requested:instruments.length,options,results,completedAt:new Date().toISOString()};}
export function rankedCandidates(scan,mode){let rows=scan.results.filter(x=>x.metrics.eligible);if(mode==='upward')rows=rows.filter(x=>x.metrics.trajectory==='upward');if(mode==='gainers'||mode==='upward')rows=rows.filter(x=>x.metrics.returnPct>0);return [...rows].sort((a,b)=>mode==='volatility'?b.metrics.rangePct-a.metrics.rangePct:b.metrics.returnPct-a.metrics.returnPct);}
