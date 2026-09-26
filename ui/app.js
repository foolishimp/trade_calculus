import { createDemo } from './demo.js';
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(value);
const num = value => new Intl.NumberFormat('en-US', { maximumFractionDigits:0 }).format(value);
const precise = value => new Intl.NumberFormat('en-US', {maximumFractionDigits:2}).format(value);
const short = value => Math.abs(value) >= 1000 ? `${(value/1000).toFixed(0)}k` : Math.abs(value) < 2 && value !== 0 ? value.toFixed(3) : value.toFixed(0);
let result, index = 0, timer, curves = [], ratesRequest = 0, replayRequest = 0;
const demo = createDemo({getState:()=>({result,index}), moveTo:next=>{if(!result)return;stop();index=Math.max(0,Math.min(next,result.rows.length-1));draw();void refreshRates();}, rerun:run});
const escape = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
async function api(path) { const response = await fetch(path); const data = await response.json(); if(!response.ok) throw new Error(data.error || 'Request failed'); return data; }
function chart(target, series, labels, unit = '') {
  const width = Math.max(320, $(target).clientWidth - 30), height = $(target).clientHeight - 6;
  const left=46, right=17, top=22, bottom=27, values=series.flatMap(s=>s.values);
  if(!values.length){$(target).textContent='No observations';return;}
  let min=Math.min(...values), max=Math.max(...values); const pad=(max-min)*.13 || Math.max(Math.abs(max)*.05,1);min-=pad;max+=pad;
  const count=Math.max(...series.map(s=>s.values.length));
  const xValues=labels.map(label=>label.endsWith('d')?parseFloat(label):Date.parse(label));
  const span=xValues.at(-1)-xValues[0];
  const x=i=>left+(width-left-right)*(span>0?(xValues[i]-xValues[0])/span:i/Math.max(count-1,1)), y=v=>top+(height-top-bottom)*(max-v)/(max-min);
  const tick=value=>(max-min)<.1?value.toFixed(3):(max-min)<10?value.toFixed(2):short(value);
  let markup=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(target.replaceAll('-',' '))}; ${escape(unit)}"><title>${escape(unit)}</title>`;
  for(let i=0;i<4;i++){const value=min+(max-min)*i/3, yy=y(value);markup+=`<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" stroke="#edf1f2"/><text x="${left-9}" y="${yy+3}" text-anchor="end" fill="#86959c" font-size="9">${tick(value)}</text>`;}
  if(min<0&&max>0)markup+=`<line x1="${left}" x2="${width-right}" y1="${y(0)}" y2="${y(0)}" stroke="#c4d2d4" stroke-dasharray="3 4"/>`;
  series.forEach(s=>{const points=s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');markup+=`<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linejoin="round"/>`;const last=s.values.at(-1);markup+=`<circle cx="${x(s.values.length-1)}" cy="${y(last)}" r="3" fill="${s.color}"/>`;});
  const indices=[...new Set([0,Math.floor((labels.length-1)/2),labels.length-1])];
  indices.forEach(i=>{markup+=`<text x="${x(i)}" y="${height-6}" text-anchor="${i===0?'start':i===labels.length-1?'end':'middle'}" fill="#86959c" font-size="9">${escape(labels[i])}</text>`;});
  $(target).innerHTML=markup+'</svg>';
}
function drawCurve(){const curve=curves.find(c=>c.family===$('family').value);if(!curve)return;chart('curve-chart',[{values:curve.points.map(p=>p.value),color:'#d78145'}],curve.points.map(p=>`${p.tenorDays}d`),curve.unit);$('curve-unit').textContent=curve.unit; $('curve-chart').title=curve.formula;}
function draw(){
  if(!result)return;const visible=result.rows.slice(0,index+1), row=visible.at(-1), benchmark=result.unhedged.rows.slice(0,index+1);
  $('cursor').value=index;$('cursor-date').textContent=row.date;$('pnl').textContent=money(row.cumulativePnlUsd);$('pnl').className=row.cumulativePnlUsd>=0?'positive':'negative';
  $('return').textContent=`${(100*row.cumulativePnlUsd/result.config.initialCapitalUsd).toFixed(2)}% of ${money(result.config.initialCapitalUsd)} initial capital`;
  $('realized').textContent=money(row.realizedPnlUsd);$('unrealized').textContent=`${money(row.unrealizedPnlUsd)} unrealized`;
  $('drawdown').textContent=money(row.drawdownUsd);$('max-drawdown').textContent=`Peak to cursor: ${money(Math.max(...visible.map(r=>r.drawdownUsd)))}`;
  $('position').textContent=`${precise(row.brentPosition)} / ${precise(row.wtiPosition)}`;
  const decision=row.riskDecision, policy=decision.policy;
  $('risk-action').textContent=`${decision.outcome.replaceAll('-',' ').toUpperCase()} · ${(decision.scale*100).toFixed(1)}%`;
  $('decision-cutoff').textContent=`Evidence through ${decision.evidenceThrough||'none yet'} → selected before the ${row.date} mark. Model: joint historical changes + independent stresses.`;
  $('proposed-size').textContent=`${precise(decision.proposedExposure.brentBarrels)} / ${precise(decision.proposedExposure.wtiBarrels)} bbl`;
  $('selected-size').textContent=`${precise(decision.selectedExposure.brentBarrels)} / ${precise(decision.selectedExposure.wtiBarrels)} bbl`;
  $('allowance').textContent=`×${decision.calibration.multiplier.toFixed(2)}`;
  $('prior-nav').textContent=money(decision.priorNavUsd);
  const metrics=[['Tail loss + costs','tailLossWithCostsUsd',policy.maxExpectedShortfallUsd],['Independent stress + costs','stressLossWithCostsUsd',policy.maxStressLossUsd],['Gross notional at prior marks','grossNotionalUsd',policy.maxGrossNotionalUsd]];
  $('decision-metrics').innerHTML=metrics.map(([label,key,bound])=>`<tr><td>${label}</td><td>${decision.proposedRisk?money(decision.proposedRisk[key]):'Awaiting history'}</td><td>${decision.selectedRisk?money(decision.selectedRisk[key]):'—'}</td><td>${money(Math.min(bound,Math.max(0,decision.priorNavUsd)))}</td></tr>`).join('');
  $('decision-reason').textContent=`${decision.reasons.join('. ')}. Feedback: ${decision.calibration.breaches} breaches in ${decision.calibration.assessedMoves} prior assessed moves${decision.calibration.status==='insufficient-assessments'?' (fewer than 20; allowance remains ×1)':''}.`;
  $('strategy-cards').innerHTML=result.comparisons.map(c=>{const atCursor=c.trajectory[index];return `<article class="strategy-card ${c.id===result.config.strategy?'selected':''}"><div class="eyebrow">${c.id===result.config.strategy?'ACTIVE EXPERIMENT':'COMPARISON'}</div><h3>${escape(c.label)}</h3><p>${escape(c.thesis)}</p><strong class="${atCursor.cumulativePnlUsd>=0?'positive':'negative'}">${money(atCursor.cumulativePnlUsd)}</strong><div class="card-foot"><span>Through ${atCursor.date}</span><span>${atCursor.tradeDays} trade days</span></div><div class="card-foot">${atCursor.interventions} risk interventions</div><button data-strategy="${c.id}">${c.id===result.config.strategy?'Selected':'Explore strategy'} →</button></article>`;}).join('');
  const model=row.strategyModel, plan=model.plan, forecast=model.selectedForecast;
  const adjustments=plan?.steps.filter(s=>s.selectedId).length??0;
  $('strategy-state').textContent=model.status==='planned'?`${adjustments} ADJUSTMENT${adjustments===1?'':'S'}`:model.status.replaceAll('-',' ').toUpperCase();
  $('composition').textContent=`${precise(row.signal.brentBarrels)} / ${precise(row.signal.wtiBarrels)} → ${precise(model.composedExposure.brentBarrels)} / ${precise(model.composedExposure.wtiBarrels)}`;
  $('expected-net').textContent=forecast?money(forecast.expectedNetPnlUsd):'Unavailable';
  $('expected-return').textContent=forecast?.expectedReturnOnPriorNav!=null?`${(100*forecast.expectedReturnOnPriorNav).toFixed(4)}%`:'—';
  $('forecast-note').textContent=forecast?`Estimate from ${forecast.samples} prior joint changes through ${forecast.evidenceThrough}, for the selected exposure's next holding interval. Includes rebalancing cost and three days of funding allowance.`:'Required prior history is unavailable; no zero-risk or expected-return claim is made.';
  $('reference-note').textContent=plan?`Internal good: expected net ≥ ${money(plan.reference.minimumExpectedNetPnlUsd)}, tail loss ≤ ${money(plan.reference.maximumTailLossUsd)}, stress loss ≤ ${money(plan.reference.maximumStressLossUsd)}, gross notional ≤ ${money(plan.reference.maximumGrossNotionalUsd)}. Preference penalty: ${plan.reference.riskAversion}.`:'Adaptive composition is off or awaiting history. The existing sizing policy remains separate.';
  $('homeostatic-deviation').textContent=plan?`${plan.initialState.deviation.toFixed(3)} → ${plan.finalState.deviation.toFixed(3)} → ${model.selectedState.deviation.toFixed(3)}`:'—';
  const gains=plan?.steps.flatMap((step,depth)=>step.gainVector.map(a=>({a,depth,selected:step.selectedId===a.id})))??[];
  $('gain-vector').innerHTML=gains.length?gains.map(({a,depth,selected})=>`<tr><td>${depth+1}. ${escape(a.label)}</td><td>${precise(a.gain.expectedNetGainUsd)}</td><td>${precise(a.gain.tailRiskReductionUsd)}</td><td>${a.gain.deviationReduction.toFixed(4)}</td><td>${precise(a.gain.decisionGainUsd)}</td><td title="${escape(a.reason)}">${selected?'Selected':a.eligible?'Alternative':'No improvement'}</td></tr>`).join(''):'<tr><td colspan="6">No candidate adjustments at this cursor.</td></tr>';
  $('recursive-trace').textContent=plan?`${plan.steps.map((s,i)=>`${i+1}: ${s.gainVector.find(a=>a.id===s.selectedId)?.label??'hold composed book'}`).join(' → ')||'No recursive steps requested'}. Stop: ${plan.stopReason.replaceAll('-',' ')}. Selected exposure is ${model.selectedState.deviation<=1e-10?'inside':'outside'} the supplied reference region after final risk sizing.`:'The gain vector is evaluated before the execution mark is revealed.';
  const risk=row.priceRisk, assessed=visible.filter(r=>r.varBreach!==null), breaches=assessed.filter(r=>r.varBreach).length;
  $('var').textContent=risk?money(risk.varUsd):'Insufficient history';$('es').textContent=risk?money(risk.expectedShortfallUsd):'—';
  $('breaches').textContent=`${breaches} / ${assessed.length}`;
  $('risk-note').textContent=risk?`${risk.samples} joint historical changes through ${risk.evidenceThrough}. Next paired observation; gross price P&L only.`:`Collecting ${result.config.riskLookback??60} price changes for a risk forecast.`;
  $('risk-warning').textContent=row.brentPosition===0&&row.wtiPosition===0?'Flat at this cursor. Move the replay cursor to inspect risk while a position is open.':'Tail estimates cover the sampled window. Basis-break stresses challenge relationships absent from that sample.';
  $('stresses').innerHTML=row.stresses.map(s=>`<tr><td>${escape(s.label)}</td><td class="${s.pnlUsd>=0?'positive':'negative'}">${money(s.pnlUsd)}</td></tr>`).join('');
  const labels=visible.map(r=>r.date);
  chart('history-chart',[{values:visible.map(r=>r.brent),color:'#007e78'},{values:visible.map(r=>r.wti),color:'#d78145'}],labels,'USD/bbl');
  chart('pnl-chart',[{values:visible.map(r=>r.cumulativePnlUsd),color:'#007e78'},{values:benchmark.map(r=>r.cumulativePnlUsd),color:'#9eabb5'},{values:result.uncontrolled.rows.slice(0,index+1).map(r=>r.cumulativePnlUsd),color:'#9380b8'}],labels,'USD');
  $('spot-values').textContent=`Brent $${row.brent.toFixed(2)} · WTI $${row.wti.toFixed(2)} · basis $${row.basis.toFixed(2)}`;
  const totals=visible.reduce((t,r)=>({gross:t.gross+r.grossPnlUsd,cost:t.cost+r.executionCostUsd,funding:t.funding+r.fundingCostUsd}),{gross:0,cost:0,funding:0});
  $('pnl-attribution').textContent=`Gross ${money(totals.gross)} − execution ${money(totals.cost)} − funding ${money(totals.funding)}`;
  $('signal').textContent=`Strategy proposal: ${row.signal.reason}. Risk: ${decision.outcome.replaceAll('-',' ')}.`;
  const trades=visible.filter(r=>r.tradedBarrels>0).slice(-6).reverse();
  $('trades').innerHTML=trades.length?trades.map(r=>`<tr><td>${r.date}</td><td>${r.riskDecision.evidenceThrough||'—'}</td><td>${r.riskDecision.outcome}</td><td>${precise(r.brentPosition)} / ${precise(r.wtiPosition)}</td><td>${money(r.executionCostUsd)}</td></tr>`).join(''):'<tr><td colspan="5">No simulated executions at this cursor.</td></tr>';
  demo.render();
}
async function refreshRates(){if(!result)return;const request=++ratesRequest;const date=result.rows[index].date;const data=await api(`/api/rates?date=${date}`);if(request!==ratesRequest)return;curves=data.curves;drawCurve();}
function stop(){clearInterval(timer);timer=undefined;$('play').textContent='▶ Play';$('play').setAttribute('aria-label','Play historical replay');}
async function run(){
  stop();const request=++replayRequest;$('run').disabled=true;$('error').hidden=true;
  $('run-status').textContent='Calculating the declared example…';document.body.classList.add('calculating');
  document.querySelectorAll('[data-preset]').forEach(b=>b.disabled=true);
  try{
    const params=new URLSearchParams(new FormData($('controls')));const data=await api(`/api/replay?${params}`);if(request!==replayRequest)return;
    result=data;index=Math.min(result.config.riskLookback+1,result.rows.length-1);$('cursor').max=result.rows.length-1;
    $('dataset-label').textContent=`${result.rows[0].date.slice(0,4)}–${result.rows.at(-1).date.slice(0,4)} · ${result.rows.length} paired days`;
    $('source-note').textContent=`${result.metadata.source}. Retrieved ${result.metadata.retrievedAt.slice(0,10)}. ${result.metadata.missingData}.`;
    draw();await refreshRates();
    if($('preset-description').textContent.startsWith('Custom inputs'))$('preset-description').textContent='Custom inputs applied';
  }catch(error){$('error').textContent=error.message;$('error').hidden=false;}finally{if(request===replayRequest){$('run').disabled=false;$('run-status').textContent='';document.body.classList.remove('calculating');document.querySelectorAll('[data-preset]').forEach(b=>b.disabled=false);}}
}
async function evidence(){try{const data=await api(`/api/analysis?reconciled=${$('reconciled').checked}`);const candidate=data.candidates.find(c=>c.candidateId==='basis-50000');$('fill-bound').textContent=`${num(data.knowledge.minimumFilled)}–${num(data.knowledge.maximumFilled)} bbl`;$('fill-loss').textContent=money(candidate.worstRepresentedLossUsd);$('evidence-decision').textContent=data.decision.action==='seek-evidence'?'SEEK EVIDENCE · reconcile execution before further exposure':'CONDITIONAL COMPARISON · reduced package fits supplied bounds';$('evidence-decision').className='decision'+(data.decision.action==='seek-evidence'?' uncertain':'');}catch(error){$('evidence-decision').textContent=error.message;}}
$('controls').addEventListener('submit',event=>{event.preventDefault();void run();});
$('cursor').addEventListener('input',()=>{stop();index=Number($('cursor').value);draw();void refreshRates();});
$('play').addEventListener('click',()=>{if(timer){stop();return;}if(!result)return;if(index>=result.rows.length-1)index=0;$('play').textContent='Ⅱ Pause';$('play').setAttribute('aria-label','Pause historical replay');draw();void refreshRates();timer=setInterval(()=>{index=Math.min(index+1,result.rows.length-1);draw();void refreshRates();if(index===result.rows.length-1)stop();},Number($('play-speed').value));});
$('play-speed').addEventListener('change',stop);
$('reset').addEventListener('click',()=>{stop();index=0;draw();void refreshRates();});
$('family').addEventListener('change',drawCurve);$('reconciled').addEventListener('change',()=>void evidence());
$('strategy-cards').addEventListener('click',event=>{const button=event.target.closest('[data-strategy]');if(button){$('strategy').value=button.dataset.strategy;void run();}});
window.addEventListener('resize',()=>{draw();drawCurve();});
await Promise.all([run(),evidence()]);
