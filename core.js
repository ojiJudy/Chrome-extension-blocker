export const exchanges = ['NASDAQ','NYSE','AMEX','NYSEARCA','TSX','TSXV','CSE','NEO'];
export function calculate(x) {
  const {investment,entry,exit,stop,fees,slippage}=x;
  if (![investment,entry,exit,fees,slippage].every(Number.isFinite)||investment<=0||entry<=0||exit<=0||fees<0||slippage<0||slippage>=100) throw Error('Enter positive investment and prices; fees must be nonnegative and slippage below 100%.');
  if(stop!==null&&(!Number.isFinite(stop)||stop<=0||stop>=entry))throw Error('For a long trade, the stop must be positive and below entry.');
  const slip=slippage/100, buy=entry*(1+slip),sell=exit*(1-slip);
  const shares=Math.max(0,Math.floor((investment-fees/2)/buy));
  const capital=shares*buy+fees/2;
  if(!shares)throw Error('Budget cannot buy one whole share after entry costs.');
  const gross=shares*(exit-entry), net=shares*(sell-buy)-fees;
  const loss=stop===null?null:shares*(buy-stop*(1-slip))+fees;
  return {shares,capital,unused:investment-capital,gross,net,roi:net/capital*100,loss,rr:loss>0?net/loss:null,breakEven:(buy+fees/shares)/(1-slip)};
}
export function risks(x,r) {
 const a=[];
 if(x.marketCap===null)a.push(['unknown','Market cap unknown','Microcap classification cannot be confirmed.']);
 else if(x.marketCap<300)a.push(['high','Microcap exposure','Market cap below 300 million in the selected currency. This is an editable screening convention, not an exchange classification.']);
 if(x.bid!==null&&x.ask!==null){if(x.ask<x.bid||x.bid<=0)a.push(['high','Invalid quote','Ask must be at least bid, and bid positive.']);else {const spread=(x.ask-x.bid)/((x.ask+x.bid)/2)*100;a.push([spread>=1?'high':'info','Quoted spread',spread.toFixed(2)+'% of midpoint. Spread is not automatically added to the calculator; include it in your fill estimates.']);}}
 else a.push(['unknown','Spread unknown','Enter timestamped bid and ask to assess execution costs.']);
 if(x.volume===null)a.push(['unknown','Liquidity unknown','Enter average volume per candle for the selected timeframe.']);
 else if(x.volume<=0)a.push(['high','No reported candle volume','Liquidity cannot support a reliable execution estimate.']);
 else {const pct=r.shares/x.volume*100;a.push([pct>=5?'high':'info','Position / average candle volume',pct.toFixed(1)+'%. This is a participation screen, not an order-book depth estimate.']);}
 if(x.quoteTime){const age=(Date.now()-Date.parse(x.quoteTime))/60000;a.push([!Number.isFinite(age)||age<0?'unknown':age>2?'high':'info','Quote freshness',!Number.isFinite(age)||age<0?'Timestamp is invalid or in the future.':age.toFixed(1)+' minutes old. User-supplied timestamp; feed delay is unverified.']);}else a.push(['unknown','Quote age unknown','No quote timestamp supplied.']);
 if(x.entry<1)a.push(['high','Sub-dollar price','Small price moves can represent large percentage changes.']);
 if(r.net<=0)a.push(['high','No net upside','Target proceeds do not cover estimated transaction costs.']);
 if(r.loss===null)a.push(['unknown','No stop entered','Planned downside and reward-to-risk cannot be calculated.']);
 a.push(['unknown','Halts, dilution and catalyst unverified','Check exchange notices and recent issuer filings. No halt or filing feed is connected.']);
 a.push(['info','Stop execution','Stops may fill beyond the entered price; gaps and halts can exceed planned loss.']);return a;
}
export function parseCandles(text){
 const lines=text.trim().replace(/^\uFEFF/,'').split(/\r?\n/);if(lines.length<3)throw Error('CSV needs a header and at least two candles.');
 const split=l=>l.split(',').map(v=>v.trim().replace(/^"|"$/g,''));const h=split(lines[0]).map(v=>v.toLowerCase());
 const names=['datetime','open','high','low','close','volume'];const ids=names.map(n=>h.indexOf(n));if(ids.some(n=>n<0))throw Error('CSV columns required: datetime,open,high,low,close,volume. Datetimes need a timezone.');
 const rows=lines.slice(1).filter(l=>l.trim()).map((l,i)=>{const v=split(l),d=v[ids[0]];if(!/(Z|[+-]\d\d:\d\d)$/.test(d)||!Number.isFinite(Date.parse(d)))throw Error('Row '+(i+2)+': use an ISO datetime with Z or timezone offset.');const nums=ids.slice(1).map(j=>v[j]===''?NaN:Number(v[j]));const [open,high,low,close,volume]=nums;if(!nums.every(Number.isFinite)||Math.min(open,high,low,close)<=0||volume<0||high<Math.max(open,close,low)||low>Math.min(open,close))throw Error('Invalid OHLCV at row '+(i+2));return {datetime:d,time:Date.parse(d),open,high,low,close,volume};}).sort((a,b)=>a.time-b.time);
 if(rows.some((r,i)=>i&&r.time===rows[i-1].time))throw Error('Duplicate candle timestamps.');return rows;
}
export function analyzeCandles(rows,interval){
 if(rows.length<2)throw Error('At least two candles required.');
 const localDay=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(t);
 const day=localDay(rows.at(-1).time);const session=rows.filter(r=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',hour:'2-digit',minute:'2-digit'}).formatToParts(r.time);const val=t=>Number(parts.find(p=>p.type===t).value);const m=val('hour')*60+val('minute');return localDay(r.time)===day&&m>=570&&m<960;});
 if(session.length<2)throw Error('Need at least two regular-session candles on the final date (09:30–16:00 New York).');
 const valid=session.every((r,i)=>!i||r.time-session[i-1].time===interval*60000);
 let pv=0,vol=0;session.forEach(r=>{pv+=(r.high+r.low+r.close)/3*r.volume;vol+=r.volume;});
 const last=session.at(-1);return {date:day,count:session.length,contiguous:valid,vwap:vol?pv/vol:null,high:Math.max(...session.map(r=>r.high)),low:Math.min(...session.map(r=>r.low)),last:last.close,lastTime:last.datetime,averageVolume:vol/session.length,partial:true,note:'VWAP and range cover imported regular-session candles only. They are not full-session levels unless your file contains the full session to that point. Candle timestamps are assumed to mark bar opens.'};
}
