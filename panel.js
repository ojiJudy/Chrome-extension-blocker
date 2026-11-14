import {parseWatchlist,scanCandidates,rankedCandidates} from './scanner.js';
import {fetchYahoo} from './yahoo.js';
import {detectTicker,readTicker} from './ticker.js';
import {research,listModels} from './ai.js';
import {calculate,risks,analyzeCandles,exchanges} from './core.js';
const $=id=>document.getElementById(id);
const fields=['symbol','exchange','currency','interval','investment','entry','exit','stop','fees','slippage','bid','ask','volume','marketCap','quoteTime'];
const numFields=['investment','entry','exit','stop','fees','slippage','bid','ask','volume','marketCap'];
let result=null,checks=[],apiKey='',journal=[],saveTimer,requestVersion=0;
const storage=globalThis.chrome?.storage?.local;
async function get(k){return storage?(await storage.get(k))[k]:JSON.parse(localStorage.getItem(k)||'null');}
async function set(k,v){if(storage)await storage.set({[k]:v});else localStorage.setItem(k,JSON.stringify(v));}
async function remove(k){if(storage)await storage.remove(k);else localStorage.removeItem(k);}
function notice(t){$('notice').textContent=t;$('notice').style.display='block';setTimeout(()=>$('notice').style.display='none',4000);}
function inputs(){const x=Object.fromEntries(fields.map(id=>[id,$(id).value]));for(const id of numFields)x[id]=x[id]===''?null:Number(x[id]);return x;}
function money(n){return new Intl.NumberFormat('en-CA',{style:'currency',currency:$('currency').value,maximumFractionDigits:2}).format(n);}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function hasTradeInputs(){return $('investment').value!==''&&$('entry').value!==''&&$('exit').value!=='';}
function update(){
 requestVersion++;$('answer').replaceChildren();$('sources').replaceChildren();$('searchEntry').replaceChildren();$('aiStatus').textContent='';
 $('results').replaceChildren();$('risks').replaceChildren();$('calcError').textContent='';
 try{const x=inputs();result=calculate(x);checks=risks(x,result);const hero=el('div',undefined,'hero-result');hero.append(el('small','POTENTIAL NET '+(result.net<0?'LOSS':'PROFIT')+' · '+x.currency),el('strong',money(result.net)),el('small',result.roi.toFixed(2)+'% return on capital used'));$('results').append(hero);
 const grid=el('div',undefined,'metrics');for(const [label,val]of [['Whole shares',result.shares],['Capital used',money(result.capital)],['Unused cash',money(result.unused)],['Gross P/L',money(result.gross)],['Planned stop loss',result.loss===null?'Add a stop':money(result.loss)],['Net reward / risk',result.rr===null?'—':result.rr.toFixed(2)+' : 1'],['Break-even exit',money(result.breakEven)],['Costs + slippage',money(result.gross-result.net)]]){const d=el('div',undefined,'metric');d.append(el('span',label),el('b',String(val)));grid.append(d);}const extra=el('details');extra.append(el('summary','Shares, costs & downside'),grid);$('results').append(extra);
 const extraRisks=el('details');extraRisks.append(el('summary','Other checks & missing data ('+checks.filter(r=>r[0]!=="high").length+')'));for(const[level,title,body]of checks){const d=el('div',undefined,'risk '+level);d.append(el('b',(level==='high'?'⚠ ':level==='unknown'?'? ':'')+title),el('p',body));(level==='high'?$('risks'):extraRisks).append(d);}$('risks').append(extraRisks);$('saveTrade').disabled=false;
 }catch(e){result=null;checks=[];$('calcError').textContent=(!hasTradeInputs())?'Enter investment, entry and target to see potential profit.':e.message;$('saveTrade').disabled=true;}
 clearTimeout(saveTimer);saveTimer=setTimeout(()=>set('plan',Object.fromEntries(fields.map(id=>[id,$(id).value]))).catch(()=>notice('Could not save your inputs.')),300);
}
function clearInstrumentContext(){resetYahooData();requestVersion++;}
for(const id of fields)$(id).addEventListener('input',()=>{if(['symbol','exchange','interval','currency'].includes(id)){$('autoTicker').checked=false;tickerLoadSequence++;$('instrumentStatus').textContent='Manual override active. Turn on Follow TradingView to resume.';}if(['symbol','exchange','interval','currency'].includes(id)){clearInstrumentContext();$('answer').replaceChildren();$('sources').replaceChildren();$('searchEntry').replaceChildren();$('instrumentStatus').textContent=$('autoTicker').checked?'Listing is user-selected; confirm the instrument.':'Manual override active. Turn on Follow TradingView to resume.';if(yahooConnected){clearTimeout(yahooTimer);yahooTimer=setTimeout(loadYahoo,500);}}update();});
$('exchange').addEventListener('change',()=>{$('currency').value=['TSX','TSXV','CSE','NEO'].includes($('exchange').value)?'CAD':'USD';update();});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(t=>t.hidden=t.id!==b.dataset.tab);document.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('selected',t===b));}));
$('settingsToggle').onclick=()=>{$('settings').open=!$('settings').open;if($('settings').open)$('settings').scrollIntoView({behavior:'smooth'});};
$('saveSettings').onclick=async()=>{try{apiKey=$('apiKey').value.trim();const model=$('model').value.trim();if(!/^[a-zA-Z0-9.-]+$/.test(model))throw Error('Enter a valid Gemini model ID.');await set('settings',{model,remember:$('rememberKey').checked});if($('rememberKey').checked)await set('apiKey',apiKey);else await remove('apiKey');$('settingsStatus').textContent='Saved. Connection is tested when you send a question.';}catch(e){$('settingsStatus').textContent=e.message;}};
$('forgetKey').onclick=async()=>{apiKey='';$('apiKey').value='';$('rememberKey').checked=false;await remove('apiKey');await set('settings',{model:$('model').value,remember:false});$('settingsStatus').textContent='API key removed.';};
$('detect').onclick=async()=>{try{
 $('detect').disabled=true;
 const instrument=await detectTicker(globalThis.chrome);
 $('exchange').value=instrument.exchange;$('symbol').value=instrument.symbol;$('currency').value=instrument.currency;if(instrument.interval)$('interval').value=instrument.interval;
 clearInstrumentContext();update();if(yahooConnected)loadYahoo();$('instrumentStatus').textContent='Read '+instrument.exchange+':'+instrument.symbol+' from TradingView. Confirm currency and interval. Listing status is not independently verified.';
 }catch(e){$('instrumentStatus').textContent=e.message;}finally{$('detect').disabled=false;}};
let tickerLoadSequence=0,tickerTimer;
async function autoLoadTicker(){
 if(!$('autoTicker').checked||!globalThis.chrome?.tabs)return;
 const sequence=++tickerLoadSequence;
 try{const instrument=await readTicker(chrome);if(sequence!==tickerLoadSequence||!$('autoTicker').checked)return;
 const changed=$('exchange').value!==instrument.exchange||$('symbol').value!==instrument.symbol||$('currency').value!==instrument.currency||(instrument.interval&&$('interval').value!==instrument.interval);
 if(changed){$('exchange').value=instrument.exchange;$('symbol').value=instrument.symbol;$('currency').value=instrument.currency;if(instrument.interval)$('interval').value=instrument.interval;clearInstrumentContext();update();if(yahooConnected)loadYahoo();}
 $('instrumentStatus').textContent='Auto-loaded '+instrument.exchange+':'+instrument.symbol+' · '+instrument.currency+(instrument.interval?' · '+instrument.interval+' minute chart.':' · Timeframe unavailable; confirm manually.')+(instrument.source?' Source: '+instrument.source+'.':' Source: TradingView URL/title.');
 }catch(e){if(sequence===tickerLoadSequence)$('instrumentStatus').textContent='Auto-load: '+e.message;}
}
function scheduleTicker(){clearTimeout(tickerTimer);tickerTimer=setTimeout(autoLoadTicker,250);}
$('autoTicker').addEventListener('change',async()=>{tickerLoadSequence++;await set('autoTicker',$('autoTicker').checked);if($('autoTicker').checked)autoLoadTicker();else $('instrumentStatus').textContent='Automatic loading off. Enter a ticker manually or use Refresh ticker.';});
if(globalThis.chrome?.tabs){chrome.tabs.onActivated?.addListener(scheduleTicker);chrome.tabs.onUpdated?.addListener((tabId,change,tab)=>{if(tab.active&&(change.url||change.title||change.status==='complete'))scheduleTicker();});}
// DOM changes can occur without any tab URL/title update; observe + poll while open.
if(globalThis.chrome?.runtime?.onMessage)chrome.runtime.onMessage.addListener((message,sender)=>{
 if(message?.type!=='MARKET_LENS_CHART'||!sender.tab||!$('autoTicker').checked)return;
 chrome.tabs.query({active:true,currentWindow:true}).then(([tab])=>{if(tab?.id===sender.tab.id)scheduleTicker();}).catch(()=>{});
});
const tickerPoll=setInterval(()=>{if($('autoTicker').checked&&document.visibilityState!=='hidden')scheduleTicker();},3000);tickerPoll?.unref?.();
globalThis.addEventListener?.('pagehide',()=>{clearInterval(tickerPoll);clearTimeout(tickerTimer);});
let candidateScan=null,conversation=[],scanSequence=0;
const modeQuestions={gainers:'Rank positive price returns in the selected watchlist and exact window. Show timestamps, missing data and execution risks. No dividends.',upward:'Which checked candidates are still trending upward versus fading? Use the measured window and recent candle slope. Allow no suitable setup.',volatility:'Compare observed price range, dollar volume, available spread and execution risk. Do not equate volatility with expected profit.',catalyst:'Find dated, sourced catalysts for these candidates/current ticker. Separate confirmed facts, scheduled events and speculation.',compare:'Compare the measured long setups, catalyst evidence and downside. Give conditional preference or WAIT, with execution risks.',tradeplan:'Assess this ticker for a long trade. Give conditional entry, stop, targets, position size, net return and execution steps. Say WAIT when evidence is insufficient.',followup:''};
function renderConversation(){$('conversation').replaceChildren();for(const t of conversation){const d=el('div',undefined,'conversation-message');d.append(el('b',t.role==='user'?'You':'Research'),el('p',t.text));$('conversation').append(d);}}
function invalidateScan(){scanSequence++;candidateScan=null;$('scan').disabled=false;$('scanResults').replaceChildren();$('scanStatus').textContent='Scan settings changed. Refresh candidate data.';requestVersion++;}
for(const id of ['watchlist','returnWindow','marketSession'])$(id).addEventListener('input',invalidateScan);
$('researchMode').addEventListener('change',()=>{requestVersion++;const mode=$('researchMode').value;if(modeQuestions[mode])$('question').value=modeQuestions[mode];if(['gainers','upward','volatility','compare'].includes(mode))$('candidateSettings').open=true;if(candidateScan)renderScan();});
$('newConversation').onclick=async()=>{conversation=[];renderConversation();$('answer').replaceChildren();$('sources').replaceChildren();$('searchEntry').replaceChildren();await remove('conversation');notice('New conversation started.');};
function renderScan(){if(!candidateScan)return;const ranked=rankedCandidates(candidateScan,$('researchMode').value);const box=$('scanResults');box.replaceChildren();box.append(el('p','Watchlist only · '+ranked.length+'/'+candidateScan.requested+' eligible for this view. Delay unverified.','muted'));if(!ranked.length)box.append(el('p','NO SUITABLE SETUP / insufficient measured data.'));
 for(const r of ranked){const m=r.metrics,d=el('div',undefined,'scan-row');d.append(el('b',r.exchange+':'+r.symbol+' · '+m.returnPct.toFixed(2)+'%'),el('p',m.last.toFixed(4)+' '+r.currency+' · '+m.trajectory+' · range '+m.rangePct.toFixed(2)+'% · approx dollar volume '+m.dollarVolume.toFixed(0)+' '+r.currency,'muted'),el('p','Measured '+m.startTime+' → '+m.endTime,'muted'));box.append(d);}
 const excluded=candidateScan.results.filter(r=>!r.metrics.eligible);if(excluded.length){const details=el('details');details.append(el('summary','Missing / excluded ('+excluded.length+')'));for(const r of excluded)details.append(el('p',r.exchange+':'+r.symbol+' — '+r.metrics.reason,'muted'));box.append(details);}}
$('discover').onclick=async()=>{if($('ask').disabled)return notice('Wait for the current research request to finish.');$('researchMode').value='catalyst';$('search').checked=true;$('question').value='Find up to 10 currently exchange-listed US/Canadian stock or ETF candidates, including microcaps, with dated momentum/catalyst evidence for today. Use EXCHANGE:TICKER identifiers and source links. These are unverified research leads for subsequent Yahoo candle validation, NOT a market-wide top-gainer ranking. Do not invent exact 30-minute/2-hour/6-hour gains, active listing status, live halt status, low float or institutional buying. Exclude known OTC/delisted listings and explain unresolved status. Return fewer or none if evidence is insufficient.';await $('ask').onclick();};
$('useSuggestions').onclick=()=>{const text=$('answer').textContent;const matches=[...text.matchAll(/\b(NASDAQ|NYSEARCA|NYSE|AMEX|TSXV|TSX|CSE):([A-Z0-9][A-Z0-9.-]*)/g)].map(m=>m[0]);const tickers=[...new Set(matches)].slice(0,10);if(!tickers.length)return notice('No supported exchange-qualified tickers found in the latest answer. Enter candidates manually.');$('watchlist').value=tickers.join(', ');invalidateScan();$('candidateSettings').open=true;notice('Unverified suggestions copied. Refresh candidate data to validate.');};
$('scan').onclick=async()=>{const sequence=++scanSequence;try{const list=parseWatchlist($('watchlist').value);$('scan').disabled=true;$('scanStatus').textContent='Requesting experimental Yahoo candles…';const scan=await scanCandidates(list,{now:Date.now(),session:$('marketSession').value,window:$('returnWindow').value},{onProgress:t=>{if(sequence===scanSequence)$('scanStatus').textContent=t;}});if(sequence!==scanSequence)return;candidateScan=scan;requestVersion++;renderScan();$('scanStatus').textContent='Scan completed '+new Date().toLocaleTimeString()+'. Watchlist only; data delays unverified.';await set('watchlist',$('watchlist').value);}catch(e){if(sequence===scanSequence)$('scanStatus').textContent=e.message;}finally{if(sequence===scanSequence)$('scan').disabled=false;}};
function researchError(message){$('researchError').textContent=message;$('aiStatus').textContent=message;}
$('researchSettings').onclick=()=>{$('settings').open=true;$('settings').scrollIntoView({behavior:'smooth'});};
$('testConnection').onclick=async()=>{
 $('testConnection').disabled=true;$('settingsStatus').textContent='Checking API access and available models…';
 try{const key=$('apiKey').value.trim();if(!key)throw Error('Paste your Gemini API key first.');const models=await listModels(key);if(!models.length)throw Error('No compatible text models available.');$('availableModels').replaceChildren(...models.map(m=>{const o=document.createElement('option');o.value=m;return o;}));$('settingsStatus').textContent='Key accepted for model listing. '+models.length+' text models found. Suggested: '+models[0]+'. Generation and Search access are tested when you generate a forecast.';}catch(e){$('settingsStatus').textContent=e.message;}finally{$('testConnection').disabled=false;}
};
$('ask').onclick=async()=>{
 if($('ask').disabled)return;
 $('researchError').textContent='';const question=$('question').value.trim();
 if(!question)return researchError('Enter a research question.');
 const key=$('apiKey').value.trim()||apiKey;
 if(!key){$('settings').open=true;researchError('No API key configured. Paste your key in Connection settings, then generate again.');return;}
 if(!$('symbol').value.trim()&&!['gainers','upward','volatility','compare','catalyst','followup'].includes($('researchMode').value))return researchError('Enter a ticker in Instrument above (for example AAPL), then generate again.');
 const risk=$('maxRisk').value===''?null:Number($('maxRisk').value);if(risk!==null&&(!Number.isFinite(risk)||risk<=0))return researchError('Max planned loss must be positive or left blank.');
 if(['gainers','upward','volatility','compare'].includes($('researchMode').value)&&!candidateScan)return researchError('Add candidates and click Refresh candidate data first.');
 if(['gainers','upward','volatility','compare'].includes($('researchMode').value)&&Date.now()-candidateScan.options.now>120000)return researchError('Candidate scan is over two minutes old. Refresh candidate data for current research.');
 const version=requestVersion,snapshot={researchMode:$('researchMode').value,candidateScan,inputs:inputs(),calculation:result,riskChecks:checks,yahooContext:yahooSnapshot(),forecastHorizon:$('horizon').value,maxPlannedLoss:risk,createdAt:new Date().toISOString(),dataMode:yahooData?'Yahoo experimental + manual inputs. Delay unverified.':'Manual/CSV. No market feed connected.',calculationWarning:result?null:'Trade calculation invalid/incomplete; do not invent position size.'};
 $('ask').disabled=true;$('answer').replaceChildren();$('sources').replaceChildren();$('searchEntry').replaceChildren();$('aiStatus').textContent='Connecting…';
 try{
 const response=await research({key,model:$('model').value.trim()||'auto',question,snapshot,history:conversation,search:$('search').checked,onProgress:t=>$('aiStatus').textContent=t});
 if(version!==requestVersion)throw Error('Trade inputs changed during research. Generate again for the current inputs.');
 $('answer').textContent=response.text;conversation.push({role:'user',text:'['+snapshot.createdAt+' · '+snapshot.researchMode+' · '+snapshot.inputs.exchange+':'+snapshot.inputs.symbol+'] '+question},{role:'model',text:response.text});conversation=conversation.slice(-12);renderConversation();try{await set('conversation',conversation);}catch{notice('Answer received, but conversation could not be saved.');}const candidate=response.candidate;
 const chunks=candidate.groundingMetadata?.groundingChunks||[];
 if(chunks.length)$('sources').append(el('h3','Research sources'));
 for(const chunk of chunks){if(!chunk.web)continue;try{const u=new URL(chunk.web.uri);if(!['https:','http:'].includes(u.protocol))continue;const a=el('a',chunk.web.title||u.hostname,'source');a.href=u.href;a.target='_blank';a.rel='noreferrer';$('sources').append(a);}catch{}}
 const rendered=candidate.groundingMetadata?.searchEntryPoint?.renderedContent;if(rendered){const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');frame.title='Google Search suggestions';frame.srcdoc=rendered;$('searchEntry').append(frame);}
 $('aiStatus').textContent='Generated '+new Date().toLocaleString()+' · '+response.model+' · Context '+new Date(snapshot.createdAt).toLocaleTimeString()+'. '+(chunks.length?'Search sources returned.':'No search sources returned; current facts unverified.')+(response.truncated?' Response incomplete: output limit reached. Ask a shorter question.':'');
 }catch(e){researchError('Research unavailable: '+e.message+' If the error mentions Search/tool support, uncheck Google Search and retry.');}finally{$('ask').disabled=false;}
};
let yahooData=null,yahooSummary=null,yahooConnected=false,yahooTimer,yahooSequence=0;
function yahooSnapshot(){if(!yahooData)return null;const {rows,...quote}=yahooData;return {...quote,candleSummary:yahooSummary};}
function resetYahooData(){yahooSequence++;$('connectYahoo').disabled=false;yahooData=null;yahooSummary=null;$('yahooQuote').replaceChildren();$('useYahooPrice').disabled=true;$('yahooStatus').textContent=yahooConnected?'Instrument/context changed. Refresh Yahoo for matching data.':'Disconnected. No Yahoo data loaded.';}
function scheduleYahoo(){clearTimeout(yahooTimer);if(yahooConnected&&$('yahooAuto').checked)yahooTimer=setTimeout(loadYahoo,60000);}
async function loadYahoo(){
 clearTimeout(yahooTimer);const sequence=++yahooSequence;const x=inputs();$('yahooStatus').textContent='Connecting to Yahoo for '+x.exchange+':'+x.symbol+'…';$('connectYahoo').disabled=true;
 try{const data=await fetchYahoo(x,Number(x.interval));if(sequence!==yahooSequence)return;
 yahooData=data;yahooSummary=null;try{yahooSummary=analyzeCandles(data.rows,Number(x.interval));}catch(e){yahooSummary={unavailable:e.message};}
 renderYahooQuote();$('yahooStatus').textContent='Connected to Yahoo prototype. Delay status unverified; refresh is polling, not guaranteed streaming.';$('useYahooPrice').disabled=false;scheduleYahoo();
 }catch(e){if(sequence!==yahooSequence)return;yahooData=null;yahooSummary=null;$('yahooQuote').replaceChildren();$('useYahooPrice').disabled=true;$('yahooStatus').textContent=e.message+' No Yahoo context will be sent to AI. Automatic refresh stopped.';yahooConnected=false;$('yahooAuto').checked=false;
 }finally{if(sequence===yahooSequence)$('connectYahoo').disabled=false;}
}
function renderYahooQuote(){if(!yahooData)return;const d=yahooData,age=(Date.now()-Date.parse(d.quoteTime))/60000;const box=$('yahooQuote');box.replaceChildren();box.append(el('b',d.symbol+' · '+money(d.price)+' '+d.currency),el('p','Regular-session quote time: '+new Date(d.quoteTime).toLocaleString()+' · Age '+age.toFixed(1)+' min',age>2?'error':'muted'),el('p',d.priceScope+' '+d.delayStatus,'muted'));}

$('connectYahoo').onclick=()=>{yahooConnected=true;loadYahoo();};
$('disconnectYahoo').onclick=()=>{yahooConnected=false;clearTimeout(yahooTimer);$('yahooAuto').checked=false;resetYahooData();$('connectYahoo').disabled=false;};
$('yahooAuto').addEventListener('change',()=>{if($('yahooAuto').checked){yahooConnected=true;loadYahoo();}else clearTimeout(yahooTimer);});
$('useYahooPrice').onclick=()=>{if(!yahooData)return;$('entry').value=String(yahooData.price);update();notice('Yahoo regular-session price copied as proposed entry. Review its timestamp and your stop/target.');};
// Refresh displayed age without requesting new prices.
const ageTimer=setInterval(()=>{if(yahooData)renderYahooQuote();},30000);ageTimer?.unref?.();
globalThis.addEventListener?.('pagehide',()=>{clearTimeout(yahooTimer);clearInterval(ageTimer);});
$('saveTrade').onclick=async()=>{if(!result)return;const x=inputs();if(!x.symbol.trim())return notice('Enter a ticker before saving.');const item={id:crypto.randomUUID(),createdAt:new Date().toISOString(),inputs:x,calculation:result,riskChecks:checks,question:$('question').value,research:$('answer').textContent,actualExit:null};journal.unshift(item);try{await set('journal',journal);renderJournal();notice('Trade snapshot saved.');}catch{journal.shift();notice('Could not save snapshot. Storage may be full.');}};
function renderJournal(){const box=$('entries');box.replaceChildren();if(!journal.length)box.append(el('p','No snapshots yet. Save a trade plan to start.','muted'));for(const item of journal){const d=el('div',undefined,'journal-item');d.append(el('b',item.inputs.exchange+':'+item.inputs.symbol+' · '+item.inputs.currency),el('p',new Date(item.createdAt).toLocaleString()+' · '+item.calculation.shares+' shares · Planned net '+item.calculation.net.toFixed(2)));const label=el('label','Actual exit fill / share');const input=el('input');input.type='number';input.min='0';input.step='any';input.value=item.actualExit??'';label.append(input);const out=el('p');function show(){out.textContent=item.actualExit===null?'No actual result recorded.':'Realized P/L estimate: '+(item.calculation.shares*(item.actualExit-item.inputs.entry*(1+item.inputs.slippage/100))-item.inputs.fees).toFixed(2)+' '+item.inputs.currency+' (modeled entry fill; no FX/taxes).';}show();const save=el('button','Record exit');save.onclick=async()=>{const n=input.value===''?null:Number(input.value);if(n!==null&&(!Number.isFinite(n)||n<=0))return notice('Enter a positive actual exit.');item.actualExit=n;await set('journal',journal);show();notice('Actual exit saved.');};const del=el('button','Delete');del.onclick=async()=>{journal=journal.filter(j=>j.id!==item.id);await set('journal',journal);renderJournal();};d.append(label,save,del,out);box.append(d);}}
$('clearJournal').onclick=async()=>{if(!confirm('Delete all locally saved trade snapshots?'))return;journal=[];await set('journal',journal);renderJournal();};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),trades:journal},null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='market-lens-journal.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
for(const id of ['horizon','maxRisk'])$(id).addEventListener('input',()=>{requestVersion++;$('answer').replaceChildren();$('sources').replaceChildren();$('searchEntry').replaceChildren();$('aiStatus').textContent='Inputs changed. Generate a fresh forecast.';});
async function init(){try{conversation=(await get('conversation'))||[];$('watchlist').value=(await get('watchlist'))||'';renderConversation();$('autoTicker').checked=true;const plan=await get('plan');if(plan)for(const id of fields)if(plan[id]!==undefined)$(id).value=plan[id];const settings=await get('settings');if(settings){$('model').value=settings.model==='gemini-2.5-flash'?'auto':(settings.model||'auto');$('rememberKey').checked=Boolean(settings.remember);}apiKey=(await get('apiKey'))||'';$('apiKey').value=apiKey;journal=(await get('journal'))||[];}catch{notice('Saved state could not be loaded.');}update();renderJournal();await autoLoadTicker();}init();
