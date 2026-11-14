const suffix={NASDAQ:'',NYSE:'',AMEX:'',NYSEARCA:'',TSX:'.TO',TSXV:'.V',CSE:'.CN'};
const exchangeCodes={NASDAQ:['NMS','NGM','NCM','NASDAQ'],NYSE:['NYQ','NYSE'],AMEX:['ASE','AMEX'],NYSEARCA:['PCX','NYSEARCA'],TSX:['TOR','TSX'],TSXV:['VAN','TSXV'],CSE:['CNQ','CSE']};
export function yahooSymbol(exchange,symbol){if(!(exchange in suffix))throw Error('Yahoo prototype mapping is not configured for this exchange. Select a supported listing; no guessed fallback is used.');if(!/^[A-Z0-9][A-Z0-9.-]*$/i.test(symbol.trim()))throw Error('Enter a valid stock ticker before connecting.');return symbol.trim().toUpperCase().replaceAll('.','-')+suffix[exchange];}
export function parseYahoo(data,{exchange,symbol,currency}){
 if(data.chart?.error)throw Error(data.chart.error.description||'Yahoo rejected this symbol.');const r=data.chart?.result?.[0],m=r?.meta;if(!m)throw Error('Yahoo returned no data for this listing.');const expected=yahooSymbol(exchange,symbol);
 if(m.symbol?.toUpperCase()!==expected)throw Error('Yahoo symbol mismatch. Returned '+m.symbol+'; expected '+expected+'.');
 if(m.currency!==currency)throw Error('Currency mismatch: Yahoo returned '+m.currency+', selected '+currency+'. Confirm the listing.');
 if(!['EQUITY','ETF'].includes(m.instrumentType))throw Error('Yahoo instrument is not a supported stock/ETF.');
 if(!exchangeCodes[exchange]?.includes(m.exchangeName?.toUpperCase()))throw Error('Yahoo exchange could not be verified ('+(m.exchangeName||'unknown')+'). No data applied.');
 const q=r.indicators?.quote?.[0]||{},rows=[];for(let i=0;i<(r.timestamp||[]).length;i++){const time=r.timestamp[i]*1000;const values=['open','high','low','close','volume'].map(k=>q[k]?.[i]);if(!Number.isFinite(time)||!values.every(Number.isFinite))continue;const[open,high,low,close,volume]=values;if(Math.min(open,high,low,close)<=0||volume<0||high<Math.max(open,close,low)||low>Math.min(open,close))continue;rows.push({datetime:new Date(time).toISOString(),time,open,high,low,close,volume});}
 const price=Number.isFinite(m.regularMarketPrice)?m.regularMarketPrice:null,time=Number.isFinite(m.regularMarketTime)?new Date(m.regularMarketTime*1000).toISOString():null;
 if(price===null||price<=0||!time)throw Error('Yahoo returned no valid timestamped regular-session price.');
 return {source:'Yahoo Finance — experimental unofficial endpoint',symbol:expected,exchange,currency,price,quoteTime:time,receivedAt:new Date().toISOString(),exchangeName:m.fullExchangeName||m.exchangeName,delayStatus:'Unverified: a recent timestamp does not confirm real-time entitlement or delivery latency.',priceScope:'Regular-session price; may differ from the latest pre/post-market trade.',rows};
}
export async function fetchYahoo(instrument,interval,fetcher=fetch){const symbol=yahooSymbol(instrument.exchange,instrument.symbol);if(![1,5,15].includes(Number(interval)))throw Error('Unsupported candle interval.');
 let res;try{res=await fetcher('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?interval='+interval+'m&range=1d&includePrePost=true',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});}catch(e){throw Error(e.name==='TimeoutError'?'Yahoo request timed out. Try again later.':'Yahoo connection failed. Check connectivity and extension site access.');}
 if(!res.ok)throw Error('Yahoo HTTP '+res.status+'. '+([401,403].includes(res.status)?'Endpoint access was denied; this prototype does not bypass authentication.':res.status===429?'Rate limited. Auto-refresh has stopped; retry later.':'Try again later.'));
 let data;try{data=await res.json();}catch{throw Error('Yahoo returned an unreadable response.');}return parseYahoo(data,instrument);
}
