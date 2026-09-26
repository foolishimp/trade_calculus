import { explainObservation, filterEvents, sensitivityStages } from './replay-explainer.js';
import { linearPriceChange } from '../src/linear_sensitivities.js';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:2}).format(value);
const num = value => new Intl.NumberFormat('en-US', {maximumFractionDigits:2}).format(value);
const steps = {evidence:'Evidence', proposal:'Proposal', composition:'Compose', selection:'Select', market:'Reveal market', execution:'Simulate action', outcome:'Outcome'};
const presets = {
  hedged: {label:'Hedged example · primary retained during planning; final sizing still applies', primaryFloor:'1', hedgeMode:'adaptive'},
  free: {label:'Primary reduction allowed · explicit PoC parameters', primaryFloor:'0', hedgeMode:'adaptive'},
  sizing: {label:'Sizing example · original proposal with composition off', primaryFloor:'0', hedgeMode:'off'},
};
const defaults = {strategy:'momentum', lookback:'20', riskWindow:'60', quantity:'1000', cost:'0.05', funding:'0.04', riskMode:'control', tailBudget:'2500', stressBudget:'5000', notionalLimit:'150000', returnFloor:'0', riskAversion:'0.1', hedgeDepth:'2'};

/** Derived presentation only: selection and economics come from replay records. */
export function createDemo({getState, moveTo, rerun}) {
  let cachedRows, events=[], through=-1, selectedId, page=0, lastIndex=-1, stages=[];
  const pageSize=10;
  function drawShock() {
    if(!stages.length)return;
    const move={brent:Number($('brent-shock').value),wti:Number($('wti-shock').value)};
    $('brent-shock-value').textContent=`${money(move.brent)} / bbl`;
    $('wti-shock-value').textContent=`${money(move.wti)} / bbl`;
    $('shock-primary').textContent=money(linearPriceChange(stages[1],move));
    $('shock-selected').textContent=money(linearPriceChange(stages[3],move));
  }
  function render() {
    const {result,index}=getState();if(!result)return;
    if(cachedRows!==result.rows){cachedRows=result.rows;events=[];through=-1;selectedId=undefined;lastIndex=-1;}
    for(let i=through+1;i<=index;i++)events.push(...explainObservation(result.rows,i,result.config));
    through=Math.max(through,index);
    const visible=events.filter(e=>e.index<=index),current=visible.filter(e=>e.index===index);
    if(index!==lastIndex)page=0;lastIndex=index;
    const selected=current.find(e=>e.id===selectedId)??current.find(e=>e.kind==='selection')??current[0];selectedId=selected.id;
    const row=result.rows[index],previous=result.rows[index-1];
    $('prev-day').disabled=index===0;$('next-day').disabled=index===result.rows.length-1;
    const market=[['Brent',row.brent,previous?.brent],['WTI',row.wti,previous?.wti],['Brent − WTI basis',row.basis,previous?.basis]];
    $('landscape-values').innerHTML=market.map(([label,value,prior])=>`<div><small>${label} · USD/bbl</small><strong>${money(value)} <span class="${prior!==undefined&&value<prior?'negative':'positive'}">${prior===undefined?'First observation':`${value-prior>=0?'+':''}${num(value-prior)}`}</span></strong><p>${prior===undefined?'No prior mark':`${money(prior)} known → ${money(value)} revealed`}</p></div>`).join('');
    $('story-summary').textContent=`${row.date}: ${row.riskDecision.reasons.join('. ')}. ${row.tradedBarrels?`The simulated rebalance changes ${num(row.tradedBarrels)} barrels.`:'The book has no quantity change.'} Net outcome at this observation: ${money(row.netPnlUsd)}.`;
    $('decision-journey').innerHTML=current.map((e,i)=>`<button data-event="${escape(e.id)}" class="journey-step ${selected.id===e.id?'selected':''} ${e.phase==='After market reveal'?'revealed':''}" aria-pressed="${selected.id===e.id}"><span>${String(i+1).padStart(2,'0')}</span>${steps[e.kind]}</button>`).join('');
    const matches=filterEvents(visible,$('event-filter').value,$('event-search').value).reverse();
    const pages=Math.max(1,Math.ceil(matches.length/pageSize));page=Math.min(page,pages-1);
    $('event-count').textContent=`${matches.length} matching / ${visible.length} events through ${row.date}`;
    $('event-list').innerHTML=matches.length?matches.slice(page*pageSize,(page+1)*pageSize).map(e=>`<button class="event-row ${e.id===selectedId?'selected':''}" data-event="${escape(e.id)}" aria-pressed="${e.id===selectedId}"><span class="event-date">${e.date}<small>${steps[e.kind]}</small></span><span><b>${escape(e.title)}</b><small>${escape(e.summary)}</small></span><span aria-hidden="true">↗</span></button>`).join(''):'<p class="empty-events">No matching events through this cursor. Clear the search or advance the replay.</p>';
    $('event-page').textContent=`${page+1} / ${pages}`;$('events-newer').disabled=page===0;$('events-older').disabled=page>=pages-1;
    $('event-detail').innerHTML=`<div class="inspector-top"><span class="eyebrow">${selected.date} · ${escape(selected.phase)}</span><span class="pill">${escape(selected.ruleId)}</span></div><h2>${escape(selected.title)}</h2><p class="inspector-summary">${escape(selected.summary)}</p><div class="rule-box"><small>RULE APPLIED</small><code>${escape(selected.rule)}</code></div><p class="inspector-explanation">${escape(selected.explanation)}</p><dl class="event-facts">${selected.facts.map(f=>`<div><dt>${escape(f.label)}</dt><dd>${escape(f.value)}</dd></div>`).join('')}</dl><div class="event-detail-links"><small>EXPLORE THE APPLICATION</small>${selected.links.map(l=>`<a href="#${escape(l.target)}">${escape(l.label)} ↗</a>`).join('')}</div><p class="inspector-footnote">Derived from the simulated replay record. <a href="/definition/rules" target="_blank" rel="noreferrer">Model rules and supplied bindings ↗</a></p>`;
    stages=sensitivityStages(result.rows,index);
    $('sensitivity-values').innerHTML=stages.map(s=>`<tr><th scope="row">${s.label}</th><td>${num(s.brentDelta)}</td><td>${num(s.wtiDelta)}</td><td>${num(s.parallelDelta)}</td><td>${num(s.basisDelta)}</td></tr>`).join('');
    $('sensitivity-context').textContent=`Calculated for ${row.date}; selection evidence through ${row.riskDecision.evidenceThrough??'none yet'}. Model: fixed-quantity Brent/WTI price terms. These derivatives depend on holdings, without a volatility estimate.`;
    drawShock();
  }
  function inspect(id) {
    const {index}=getState(),event=events.find(e=>e.id===id&&e.index<=index);if(!event)return;
    selectedId=id;moveTo(event.index);$('event-inspector').focus({preventScroll:true});
    if(matchMedia('(max-width:850px)').matches)$('event-inspector').scrollIntoView({block:'start'});
  }
  for(const id of ['event-list','decision-journey'])$(id).addEventListener('click',e=>{const b=e.target.closest('[data-event]');if(b)inspect(b.dataset.event);});
  $('event-search').addEventListener('input',()=>{page=0;render();});
  $('event-filter').addEventListener('change',()=>{page=0;render();});
  $('events-newer').addEventListener('click',()=>{page=Math.max(0,page-1);render();$('event-list').scrollTop=0;});
  $('events-older').addEventListener('click',()=>{page++;render();$('event-list').scrollTop=0;});
  $('prev-day').addEventListener('click',()=>moveTo(getState().index-1));
  $('next-day').addEventListener('click',()=>moveTo(getState().index+1));
  $('brent-shock').addEventListener('input',drawShock);$('wti-shock').addEventListener('input',drawShock);
  document.querySelector('.demo-presets').addEventListener('click',async e=>{
    const button=e.target.closest('[data-preset]');if(!button)return;
    const preset=presets[button.dataset.preset];
    for(const [id,value] of Object.entries({...defaults,primaryFloor:preset.primaryFloor,hedgeMode:preset.hedgeMode}))$(id).value=value;
    $('preset-description').textContent=preset.label;$('event-search').value='';$('event-filter').value='all';page=0;
    document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    await rerun();
  });
  $('controls').addEventListener('change',()=>{$('preset-description').textContent='Custom inputs · run the experiment to apply';document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed','false'));});
  function openAnchor() {
    const target=document.getElementById(location.hash.slice(1));if(!target)return;
    for(let el=target;el;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true;
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }
  window.addEventListener('hashchange',openAnchor);
  document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a&&a.hash===location.hash)openAnchor();});
  return {render};
}
