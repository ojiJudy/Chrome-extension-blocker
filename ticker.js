import {readChartPage} from './page-reader.js';
const allowed=['NASDAQ','NYSE','AMEX','NYSEARCA','TSX','TSXV','CSE','NEO'];
export function parseTradingView(context){
 let u;try{u=new URL(context?.url);}catch{throw Error('Chrome could not read the active tab address. Open TradingView, allow TradingView access when prompted, and try again. You can also enter the ticker manually.');}
 if(u.protocol!=='https:'||!/(^|\.)tradingview\.com$/i.test(u.hostname))throw Error('Open a TradingView chart in the active tab, then try again.');
 let candidate=context.chartSymbol||null;
 if(!candidate)candidate=(context.title||'').match(/\b(NASDAQ|NYSEARCA|NYSE|AMEX|TSXV|TSX|CSE|NEO)\s*:\s*([A-Z0-9._-]+)/i)?.[0]?.replace(/\s/g,'');
 if(!candidate)candidate=u.searchParams.get('symbol');
 if(!candidate){const path=u.pathname.match(/\/symbols\/([^/]+)\/?/);if(path){const decoded=decodeURIComponent(path[1]);const m=decoded.match(/^([A-Z]+)-(.+)$/i);if(m)candidate=m[1]+':'+m[2];}}
 if(!candidate)candidate=(context.title||'').match(/\b(NASDAQ|NYSEARCA|NYSE|AMEX|TSXV|TSX|CSE|NEO)\s*:\s*([A-Z0-9._-]+)/i)?.[0]?.replace(/\s/g,'');
 if(!candidate)throw Error('This TradingView chart does not expose an exchange-qualified ticker in its URL or title. Enter the ticker and exchange manually.');
 const [exchange,symbol,...extra]=candidate.trim().toUpperCase().split(':');
 const titleSymbol=(context.title||'').replace(/[\u200e\u200f]/g,'').match(/^([A-Z][A-Z0-9._-]*)\s+(?:[0-9$€£]|−|—|[-+])/i)?.[1]?.toUpperCase();
 const visibleSymbol=context.symbolText||titleSymbol;
 if(!context.chartSymbol&&visibleSymbol&&visibleSymbol!==symbol)throw Error('Chart shows '+visibleSymbol+' but its URL identifies '+symbol+'. Exchange could not be confirmed for the visible chart. Use manual override rather than applying the old URL ticker.');
 if(extra.length||!allowed.includes(exchange)||!symbol||!/^[A-Z0-9._-]+$/.test(symbol))throw Error('Unsupported or ambiguous listing. Select a supported US/Canadian exchange and ticker manually; OTC is excluded.');
 return {exchange,symbol,currency:['TSX','TSXV','CSE','NEO'].includes(exchange)?'CAD':'USD',...(context.interval?{interval:context.interval}:{}),...(context.source?{source:context.source}:{})};
}
export async function detectTicker(chromeApi){
 if(!chromeApi?.tabs)throw Error('Use this feature in the installed Chrome extension.');
 // Request only TradingView access and do it directly from the button gesture.
 const granted=await chromeApi.permissions.request({origins:['https://*.tradingview.com/*']});
 if(!granted)throw Error('TradingView access was not granted. You can still enter the ticker and exchange manually.');
 return readTicker(chromeApi);
}
export async function readTicker(chromeApi){
 if(!chromeApi?.tabs)throw Error('Automatic ticker loading requires the installed Chrome extension.');
 const [tab]=await chromeApi.tabs.query({active:true,currentWindow:true});
 if(!tab||!Number.isInteger(tab.id))throw Error('No active browser tab found. Open TradingView and try again.');
 let context={url:tab.url,title:tab.title};
 try{const results=await chromeApi.scripting.executeScript({target:{tabId:tab.id},func:readChartPage});context=results?.[0]?.result||context;}catch{if(!context.url)throw Error('TradingView access is unavailable. On chrome://extensions open Market Lens > Details > Site access, allow TradingView, reload the chart, then reopen this sidebar.');}
 return parseTradingView(context);
}
