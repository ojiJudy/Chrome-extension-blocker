# Market Lens — Chrome extension

A personal-use, Manifest V3 Chrome side-panel extension for TradingView. Supports long, cash-funded trade planning for US/Canadian exchange-listed stocks and ETFs, including microcaps. No OTC, broker integration, automatic trades or borrowing.

## Install
1. Unzip this package to a permanent folder.
2. In Chrome, open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `trading-companion` folder containing `manifest.json`.
5. Pin Market Lens through Chrome's Extensions menu. Open TradingView and click the extension icon to open its sidebar.

The calculator, risk checks, CSV analysis and journal work immediately without a key. This is not a Chrome Web Store publication. Changes to unpacked files require Reload on the extensions page.

## Trade plan
Enter ticker/exchange, currency, timeframe, cash budget, entry, exit and optionally a stop. Enter all amounts in the selected listing currency. CAD and USD are labels, not a conversion service. Currency switching does not convert or clear the amounts. Confirm inputs after switching.

Whole shares are rounded down after allowing half of the entered round-trip fees for entry. Slippage is adverse on **each** side: entry × (1 + slippage%), exit × (1 − slippage%). Remaining cash excludes the exit fee because that is deducted from exit proceeds. Net return uses capital deployed including entry fee. Gross P/L excludes fees/slippage. Planned stop loss includes both fees and the same adverse slippage assumption. Actual gaps and execution can exceed this estimate. Spread is reported separately and must be reflected in fill prices or slippage; do not double-count it.

Optional bid, ask, quote timestamp, average shares per candle and market cap add risk flags. A position at or above 5% of average candle volume, quoted spread at or above 1%, and quote age above 2 minutes trigger screening warnings. These are transparent heuristic thresholds, not validated trading rules. Market cap below 300 million in the selected currency triggers a microcap screen; definitions vary and this is not a legal classification. No float, halt, dilution or order-book feed is present. Those remain explicitly unknown.

## TradingView ticker
“Use TradingView ticker” reads the active TradingView URL's `symbol=EXCHANGE:TICKER`. If absent it looks for an exchange-qualified ticker in the tab title. It never scrapes chart canvas data, brokerage information or cookies. If identification is ambiguous, enter the instrument manually. Exchange choices restrict the UI to supported venues but do **not** independently verify listing status, instrument type or current trading status. Chart interval is manual. A ticker change clears imported candles.

## Candle imports
Use a CSV with header `datetime,open,high,low,close,volume` and numeric prices/volume. ISO timestamps must contain `Z` or a timezone offset and mark candle **open** times. Use exactly the selected interval and instrument. Example:

```csv
datetime,open,high,low,close,volume
2026-11-10T09:30:00-05:00,2.50,2.56,2.48,2.54,120000
2026-11-10T09:35:00-05:00,2.54,2.60,2.52,2.58,160000
```

Import supports plain numeric CSV (no thousands separators), under 2 MB. It rejects invalid bars and duplicate timestamps. Imported-session typical-price VWAP and high/low use the last date's 09:30–16:00 America/New_York bars only. Missing intervals are flagged; import summary always identifies partial-session limitations. Extended-hours bars are excluded from the summary. The chart has been removed; imported candles are summarized as text. Data is in memory until the panel closes. No opening-range, ATR, multi-timeframe or predictive model is implied.

## Gemini research
1. Obtain your own key at https://aistudio.google.com/apikey . Confirm model availability and API billing in your Google account.
2. Open the gear icon. Paste the key, use `auto` or an available Gemini model ID (default `auto`, which discovers compatible models with your key), and Save connection. Use **Test connection & load models** to check key access and discover models. Model-list access does not guarantee generation/Search access.
3. Open AI research. Review the data-sharing description, enter your question and press Send.

The extension calls Google's `generateContent` endpoint directly. Google Search grounding is optional. It renders returned source links and Google's returned Search suggestion entry point in an isolated sandbox, without executing supplied scripts. Returned model text is rendered as text, not HTML. Research may incur API charges. API errors, unsupported models, limits and blocked responses are surfaced, not replaced with fabricated results. There is no included API balance or accuracy guarantee. The API key is used only for authentication and is excluded from journal exports. By default it remains only in the open panel's memory; remembering it stores it in Chrome local extension storage (not an encrypted vault). Use a restricted, low-quota personal key. Do not distribute a package containing your key. A shared/public product should use an authenticated backend instead.

On Send, Google receives the question, selected instrument, trade inputs, derived calculator/risk data and imported candle summary. It does not receive the full CSV, screenshot, TradingView account, history or cookies. News grounding is not a market-data feed. No calibrated forecast probabilities or validated predictive returns are supplied.

## Important live-data limitation
Version 1.3 adds optional Yahoo quote/candle polling (see the version 1.3 section). It is experimental and has unverified delay, not a verified real-time execution feed. Manual inputs/CSV remain available. Real-time US and Canadian coverage—including TSXV/CSE microcaps—requires a separate licensed provider and exchange permissions, to be verified before integration. Search cannot substitute for those prices. No simulated quotes are passed off as live data.

## Journal and privacy
Plans and journal snapshots stay in Chrome local extension storage. Each snapshot includes the current question/research, inputs, calculations and candle summary, but not credentials. Export downloads JSON. Record an actual exit to estimate realized P/L using the saved share count, modeled entry fill and fees. This is not broker-confirmed performance or a backtest. Remove snapshots with Delete or Delete all snapshots. Uninstalling the extension removes extension-local storage. Exported files remain on disk.

## Permissions
- `sidePanel`: sidebar beside the chart.
- `storage`: plan, preferences and journal; optionally your API key.
- `activeTab`, `scripting`: on your click, identify the current TradingView ticker from URL/title only.
- Google API host permission: send research only when requested.

No content script runs automatically; no analytics, external scripts, account access or order placement. Optional Yahoo requests go only to query1.finance.yahoo.com. The panel can open on other pages, but ticker detection is restricted to TradingView.

## Verification
Run `node --test tests/*.mjs` from this folder. Fourteen tests cover fee/slippage math, whole-share limits, stop/CSV validation, risk warnings, API errors, auto model selection and panel wiring with a mock DOM/API. Browser rendering and an authenticated request remain unverified. Chromium UI testing could not run because this environment blocks the browser process socket. An authenticated Gemini request, live TradingView session and an actual Chrome side-panel installation were not tested here; perform the checklist below locally.

## Local acceptance checklist
- Load unpacked with no manifest/service-worker errors, pin and open beside TradingView.
- Enter 1000 budget, 2.50 entry, 2.75 exit, 2.40 stop, no costs: 400 shares, 100 profit, 40 planned loss, 2.5:1 reward/risk.
- Try fees/slippage and insufficient budget; check no overspending and clear validation.
- Select TSX/CAD; confirm all inputs are CAD and ticker is correct.
- Import sample CSV; confirm dated partial-session summary and no live-data claim.
- Send one Gemini question with your key; confirm source links and model/API error handling.
- Save/reopen plan, record actual exit, export JSON and confirm no API key in the export.
- Test a different TradingView chart; confirm instrument and timeframe manually.


## Version 1.1 update and troubleshooting
Replace files in the same original unpacked extension folder, then click Reload at chrome://extensions and close/reopen the sidebar. This preserves the extension ID and local journal. The version on the extensions page should be 1.1.0. Re-enter the key if it was not remembered.

AI research no longer requires a valid calculator result: ticker + key + question are sufficient, and missing trade calculations are disclosed. A pasted key works immediately on Generate even before Save. Auto discovers text models instead of depending on one fixed model ID. The older default migrates to Auto. Visible research errors report missing inputs, authentication/permissions, quota/billing, model availability, blocked/empty responses, network failure and a 60-second timeout per API request. No silent retry or fabricated fallback is used. For Search/tool-support errors, disable Search explicitly and retry. Test connection checks model-list access, not paid generation entitlement.

Forecasts include a user-selected horizon, optional maximum planned loss in listing currency, recommendation (conditional long / WAIT / AVOID), evidence, scenarios, proposed entry/stop/targets, execution checklist and no-trade conditions. A maximum-loss budget guides the AI but does not guarantee fills or cap actual losses. Without current verified data, the model is instructed to WAIT FOR VERIFIED DATA. These are unvalidated generated recommendations, not a live execution signal or improvement in proven predictive accuracy. No chart is rendered. CSV summary remains available as research context.


## Version 1.1.1 ticker fix
Ticker detection requests optional access to TradingView only when you click Use TradingView ticker. Accept Chrome's prompt. This lets it read the active TradingView URL/title after navigation, without broad access to other sites. Missing/malformed addresses and unavailable tabs now return actionable messages instead of an Invalid URL crash. Supports exchange-qualified symbol query parameters, TradingView symbol-page URLs and exchange-qualified tab titles. Ambiguous layouts still require manual ticker/exchange input. No chart canvas, account data or prices are read. Update the original folder and Reload at chrome://extensions; verify version 1.1.1.


## Version 1.2 automatic instrument loading
Opening the sidebar loads the active TradingView ticker automatically. Tab switches and TradingView URL/title changes trigger a refresh, with no AI request. For example `https://www.tradingview.com/chart/OlRufXgQ/?symbol=NASDAQ%3APLCE` loads PLCE / NASDAQ / USD. TradingView host access is now declared so automatic reading can work without a button gesture; Chrome may ask you to approve the added site access when updating. Allow access to TradingView, then Reload and reopen the sidebar. Only public URL/title are read; no price scraping. You can disable Automatically follow the active TradingView ticker for manual entry. The chart interval remains manual. Ambiguous/unavailable identifiers show a status message and retain your prior selection. Verify the instrument before using retained inputs. Changing instrument clears CSV/research, but trade amounts remain your editable proposed inputs.


## Version 1.3 Yahoo prototype
After updating/reloading the extension, open a supported TradingView chart, confirm the auto-loaded ticker/currency, and click **Connect / refresh Yahoo**. No Yahoo API key or Python server is needed. Chrome may request access to query1.finance.yahoo.com when updating. Enable **Refresh every 60 seconds** if desired; it runs only while the sidebar remains open. Disconnect cancels scheduled refreshes and removes Yahoo context from subsequent research. If you stay connected, ticker changes request the newly selected listing. Reopening the panel starts disconnected.

Uses the unofficial Yahoo chart endpoint directly, with no cookies, authentication bypass, login or credentials. Unavailable/denied endpoints are reported; HTTP 429 stops polling. No promise of uptime, complete exchange coverage, usage rights or real-time latency is made. Verify your permitted personal research use with Yahoo. Data is experimental, not broker-confirmed execution data. Requests send only the selected Yahoo symbol and timeframe.

Mapping: US supported listings use the base symbol; TSX adds .TO; TSXV adds .V; CSE adds .CN. Class-share dots convert to hyphens. NEO is not mapped and returns an explicit unsupported-exchange message. Returned symbol, exchange code, currency and stock/ETF type must match or data is rejected. Unusual share classes and provider exchange-code changes may require a mapping update rather than silently using a different listing.

The displayed quote is Yahoo's **regular-session price and timestamp**, not necessarily the latest extended-hours trade. Quote age updates locally; delay/real-time status remains unverified. One-day 1/5/15-minute candles include extended hours in the fetched response, but the AI candle summary uses only available regular-session bars, dated explicitly. Missing/null bars are skipped; gaps are flagged. No chart is displayed. Bid/ask, market cap, order-book depth and halt status are not fetched. Trade inputs are not overwritten: **Use Yahoo price as proposed entry** is an explicit action. Confirm your stop and target after copying a price. Manual bid/ask timestamp is separate from the Yahoo quote timestamp.

On Generate forecast, Google receives the fetched quote metadata and partial-session candle summary in addition to existing context, not the full bar list. The prompt treats this feed as experimental with unverified latency. A failed refresh removes Yahoo context; no fake or silent cached quote is substituted. Older data may remain between successful refreshes with its original timestamp and an age warning. The prototype does not improve proven forecast accuracy.

Testing: mocked Yahoo response validation, exchange/symbol/currency mapping, malformed/empty bars, network/HTTP errors and existing calculator/panel tests. External Yahoo connectivity and a live authenticated Gemini session could not be verified in this environment. To validate locally, connect NASDAQ:PLCE during a session, compare price/timestamp against your broker, switch to a Canadian ticker, test refresh/disconnect and confirm the research context changes accordingly.


## Version 1.4 simplified interface
Three tabs: Trade, Research and Journal. Instrument follows TradingView by default whenever the sidebar opens and on tab/page changes. Editing ticker/exchange immediately pauses following for a manual override; turn Follow TradingView back on to resume. A new sidebar session defaults back to automatic. Where TradingView exposes a unique qualified symbol in the visible chart symbol control, it takes priority; otherwise a qualified page title, URL symbol or symbol-page URL is used. Chart layouts that do not expose an unambiguous identifier still require manual entry. Timeframe remains manual. Host-page UI changes may affect best-effort detection.

Gemini API settings are a collapsed disclosure; open Gemini API connection or Settings. Yahoo connection, fees/slippage, extra risk inputs and detailed trade metrics are expandable. Entry/target are initially blank to avoid presenting sample prices as real quotes. Removed the candle-context/CSV import section and chart entirely. Yahoo-derived indicators remain internal research context when connected. No new market-wide scanner or chat history is included in this UI revision.


## Version 1.5 research workspace
Choose a Research mode: Top price gainers, Still trending upward, High volatility, Catalyst research, Compare long setups, Trade plan or Follow-up. The active TradingView ticker still loads automatically, with manual override.

### Candidate discovery and measured rankings
Open Candidate scan & return window. Enter up to 10 exchange-qualified tickers (e.g. NASDAQ:PLCE, NASDAQ:CURI, TSX:RY), or click Find candidates with web research, then Use tickers from latest answer. Discovery uses Gemini+Search and returns unverified leads with source links—not a complete market ranking. The copy action only recognizes supported exchange-qualified IDs. Review them, select the return window/session, and click Refresh candidate data. Yahoo validates symbol/exchange/currency before calculations. No hidden dividend screen or default market universe is used.

Scanner rankings are explicitly limited to your requested watchlist. Eligible gainers rank positive price returns; upward mode further requires a positive last-up-to-five-bar close slope and a last close at/above the measured-window VWAP; volatility mode ranks observed high-low range divided by the baseline price. These are heuristics, not validated future-return forecasts. Range/volume do not establish liquidity or institutional buying. Spread is unavailable in this Yahoo endpoint and remains unknown. Approximate dollar volume sums close × volume and is denominated in each listing's currency; it is not comparable CAD/USD notional without conversion.

### Exact windows and session separation
Scans request completed one-minute Yahoo bars. Select 30/120/360 minutes or today's selected session. Calculations use exchange-local calendar date and New York session hours (04:00–09:30 premarket, 09:30–16:00 regular, 16:00–20:00 after-hours). These fixed hours do not model early-close calendars. A session must currently be active; no old session is labeled current. A window extending before session start is rejected instead of replaced by a daily return. Today uses the first session candle's open; rolling windows use a close at/before the requested start, within one minute. Actual baseline/end timestamps are displayed; returned windows can differ by up to one minute because of candle alignment. Missing/gapped windows, no session opening candle, or end data over two minutes old are excluded. No synthetic interpolation, dividend return or percent-change field is substituted. At 10:00 regular-session trading there cannot yet be a two-hour regular-session return. Request a shorter window or today's session.

Yahoo access/delays remain unverified. Partial responses and endpoint denials are visible. HTTP 429 stops the remaining scan. Scans run only on request, one symbol at a time, and results are captured against the scan's starting timestamp. Rate limits/network access can make every candidate unavailable. Scans over two minutes old must be refreshed before measured-ranking/comparison research. Unknown corporate actions/split adjustments can distort extreme returns, so verify them before trading. This is not an exchange-wide screener.

### Conversation and evidence
Successful research retains the latest six question/answer pairs locally, including timestamps/instrument context and model text, without keys. Follow-up sends those pairs with the current snapshot to Gemini. Earlier discussion is expandable; New conversation deletes it. Trade-input changes clear the displayed latest answer but do not erase discussion. Historical prices are explicitly historical: the prompt gives the new snapshot precedence. Sources for the latest answer are rendered separately; older saved text may contain model citations but grounding links are not preserved in chat history. Discussion is research context, not a position/order record. A successful response whose local save fails still remains visible.

Prompts require dated sources for catalysts, distinguish news correlation from cause, prohibit inventing interval gains/compliance/short-interest facts and allow WAIT/NO SUITABLE SETUP. These are model instructions, not a guarantee that generated claims are correct. Verify supporting sources and broker data. There is no guaranteed prediction, profit ranking or automatic trading.

Tests cover exact-window arithmetic versus daily return, session boundaries, stale/gapped data, trajectory filtering, watchlist validation, rate-limit stopping and multi-turn API payloads, in addition to prior calculator/API/ticker tests. Browser rendering, Yahoo availability and authenticated Gemini/Search access remain unverified here.


## Version 1.5.1 automatic detection repair
The prior implementation listened mostly for tab URL/title changes; a TradingView chart can change inside the page without either event. Version 1.5.1 adds a TradingView-only content observer plus a three-second sidebar fallback refresh. It reads visible symbol controls/one unambiguous chart legend, then qualified title/URL fallback. Supported 1/5/15-minute intervals are detected when exposed by the visible toolbar. A visible symbol conflicting with a stale URL is rejected instead of applying the wrong instrument. Multi-chart or hidden/unsupported controls may remain ambiguous and require manual override.

UPDATE: replace the files in the ORIGINAL unpacked folder; Reload in chrome://extensions; allow TradingView site access; reload the actual TradingView PAGE too; close and reopen the sidebar. Check v1.5.1 in its header. A newly declared content script starts on page load, so reloading only the extension can leave the already-open page without the observer (the sidebar polling fallback still runs). If blocked, Chrome extension Details > Site access must allow TradingView. No broad access to other websites is requested.

Default auto-follow fills ticker, exchange, inferred listing currency and a supported detected interval. Editing any instrument field pauses auto-follow to protect overrides. No entry/stop/target, bid/ask, account, watchlist or chart-canvas prices are extracted. Prices still require the separate Yahoo connection; they are not read from TradingView. Status names the source and tells you when timeframe could not be read. The observer watches only public DOM identifiers and sends only URL/title, ticker/interval metadata to the extension; no screenshot or trading-account data. No automatic AI request is triggered.
