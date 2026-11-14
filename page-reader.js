// Self-contained: also injected into the TradingView tab by chrome.scripting.
export function readChartPage(){
 const visible=e=>!!e&&e.getClientRects().length>0;
 const clean=s=>(s||'').replace(/[\u200e\u200f\u202a-\u202e]/g,'').trim();
 const qualified=/\b(NASDAQ|NYSEARCA|NYSEAMERICAN|NYSE|AMEX|TSXV|TSX|CSE|NEOE|NEO)\s*:\s*([A-Z0-9][A-Z0-9._-]*)/i;
 const normalize=s=>{const m=clean(s).match(qualified);return m?(m[1].toUpperCase().replace('NYSEAMERICAN','AMEX').replace('NEOE','NEO')+':'+m[2].toUpperCase()):null;};
 const controls=[...document.querySelectorAll('[data-name="header-toolbar-symbol-search"],#header-toolbar-symbol-search')].filter(visible);
 let symbolText=null,chartSymbol=null,source=null;
 for(const control of controls){const candidates=[control,...control.querySelectorAll('[data-symbol],[data-symbol-full]')];for(const e of candidates){for(const name of ['data-symbol-full','data-symbol','title','aria-label']){const q=normalize(e.getAttribute(name));if(q){chartSymbol=q;source='visible chart symbol control';break;}}if(chartSymbol)break;}if(chartSymbol)break;const text=clean(control.textContent);if(/^[A-Z0-9][A-Z0-9._-]*$/i.test(text))symbolText=text.toUpperCase();}
 // Use a single visible legend only; never read a watchlist or arbitrarily choose among charts.
 const legends=[...document.querySelectorAll('[data-name="legend-source-title"]')].filter(visible);
 if(!chartSymbol&&legends.length===1){const legend=legends[0];const q=normalize(legend.getAttribute('data-symbol')||legend.getAttribute('title')||legend.textContent);if(q){chartSymbol=q;source='visible chart legend';}else if(symbolText){const text=clean(legend.parentElement?.textContent);const m=text.match(/(?:^|[·|\s])(NASDAQ|NYSEARCA|NYSEAMERICAN|NYSE|AMEX|TSXV|TSX|CSE|NEOE|NEO)(?=$|[·|\s])/i);if(m){chartSymbol=m[1].toUpperCase().replace('NYSEAMERICAN','AMEX').replace('NEOE','NEO')+':'+symbolText;source='symbol control + single chart legend';}}}
 let interval=null;for(const e of document.querySelectorAll('[data-name="header-toolbar-intervals"],#header-toolbar-intervals')){if(!visible(e))continue;const t=clean(e.textContent);const m=t.match(/^(1|5|15)\s*(m|min|minutes?)?$/i);if(m){interval=m[1];break;}}
 return {url:location.href,title:document.title,chartSymbol,symbolText,interval,source,capturedAt:new Date().toISOString()};
}
