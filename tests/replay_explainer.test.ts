import test from 'node:test';
import assert from 'node:assert/strict';
import { replay } from '../src/replay.ts';
import type { ReplayConfig } from '../src/replay.ts';
import { defaultHedgingConfig } from '../src/oil_hedging.ts';
import { defaultReplayPolicy } from '../src/overlays/replay_policy.ts';
import { priceStresses } from '../src/historical_risk.ts';
import { linearOilSensitivities, linearPriceChange } from '../src/linear_sensitivities.js';
import { explainObservation, projectEventLog, filterEvents, sensitivityStages } from '../ui/replay-explainer.js';

const observations = Array.from({length:12}, (_,i)=>({date:`2024-01-${String(i+1).padStart(2,'0')}`, brent:100+i%3, wti:95+i%3+i/10}));
const config: ReplayConfig = {strategy:'buy-hold',lookback:3,riskLookback:3,quantityBarrels:1000,costPerBarrelUsd:.05,fundingAnnualRate:.04,initialCapitalUsd:1000000,
  liquidationDate:'2024-01-12',hedging:{...defaultHedgingConfig,mode:'adaptive',minimumPrimaryScale:1}};
const near = (a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('S-26: a newly revealed shock cannot rewrite pre-decision explanation or earlier events',()=>{
  const original=replay(observations,config);
  const changed=replay(observations.map((r,i)=>i>=7?{...r,brent:-900,wti:900}:r),config);
  const snapshot=JSON.stringify(original);
  assert.deepEqual(projectEventLog(original.rows,6,config),projectEventLog(changed.rows,6,config));
  const before=(events:ReturnType<typeof explainObservation>)=>events.filter(e=>e.phase==='Before market reveal');
  assert.deepEqual(before(explainObservation(original.rows,7,config)),before(explainObservation(changed.rows,7,config)));
  assert.notDeepEqual(explainObservation(original.rows,7,config).find(e=>e.kind==='market'),explainObservation(changed.rows,7,config).find(e=>e.kind==='market'));
  const prefix=replay(observations.slice(0,8),config);
  assert.deepEqual(projectEventLog(original.rows,7,config),projectEventLog(prefix.rows,7,config));
  assert.equal(JSON.stringify(original),snapshot);
});

test('S-26: explanatory attribution uses old holdings and reconciles fills, costs and closure',()=>{
  const trial={...config,quantityBarrels:10,costPerBarrelUsd:.2,fundingAnnualRate:0,liquidationDate:'2024-01-04',
    hedging:{...defaultHedgingConfig,mode:'off' as const},riskPolicy:{...defaultReplayPolicy,mode:'observe' as const}};
  const result=replay([10,12,20,17].map((brent,i)=>({date:`2024-01-0${i+1}`,brent,wti:8})),trial);
  const get=(i:number,kind:string,label:string)=>explainObservation(result.rows,i,trial).find(e=>e.kind===kind)!.facts.find(f=>f.label===label)!.value;
  assert.equal(get(1,'market','Gross holding P&L'),'$0.00');
  assert.equal(get(1,'execution','Brent quantity change'),'10 bbl at $12.00');
  assert.equal(get(1,'execution','Execution cost'),'$2.00');
  assert.equal(get(2,'market','Brent holding contribution'),'$80.00');
  assert.equal(get(3,'execution','Brent quantity change'),'-10 bbl at $17.00');
  assert.equal(get(3,'outcome','Net P&L'),'-$32.00');
  assert.equal(result.summary.netPnlUsd,46);
  const ordered=explainObservation(result.rows,2,trial).map(e=>e.kind);
  assert.ok(ordered.indexOf('selection')<ordered.indexOf('market'));
  assert.ok(ordered.indexOf('market')<ordered.indexOf('execution'));
});

test('S-27: search and category projection are bounded by the cursor, with stable unique event identities',()=>{
  const result=replay(observations,config),events=projectEventLog(result.rows,6,config);
  assert.equal(filterEvents(events,'all','2024-01-12').length,0);
  assert.ok(filterEvents(events,'decisions','TC-RISK-01').length>0);
  assert.ok(filterEvents(events,'execution','').every(e=>e.kind==='execution'&&e.index<=6));
  assert.equal(new Set(events.map(e=>e.id)).size,events.length);
  assert.ok(projectEventLog(result.rows,0,config).every(e=>e.date==='2024-01-01'));
  assert.deepEqual(projectEventLog(result.rows,-1,config),[]);
  assert.throws(()=>projectEventLog(result.rows,12,config),/cursor/);
});

test('S-28: factor deltas match finite price changes and the independent stress calculus',()=>{
  for(const exposure of [{brentBarrels:1000,wtiBarrels:-1000},{brentBarrels:971,wtiBarrels:-936.044},{brentBarrels:-250,wtiBarrels:0}]){
    const s=linearOilSensitivities(exposure,'2024-01-01');
    for(const shock of priceStresses(exposure)) near(linearPriceChange(s,{brent:shock.brentMove,wti:shock.wtiMove}),shock.pnlUsd);
    const value=(b:number,w:number)=>exposure.brentBarrels*b+exposure.wtiBarrels*w;
    near((value(80.01,75)-value(79.99,75))/.02,s.brentDelta);
    near((value(80,75.01)-value(80,74.99))/.02,s.wtiDelta);
    near(value(81,75)-2*value(80,75)+value(79,75),s.gamma.brent);
  }
  const pair=linearOilSensitivities({brentBarrels:1000,wtiBarrels:-1000},null);
  assert.equal(pair.parallelDelta,0);assert.equal(pair.basisDelta,1000);
  assert.equal(linearPriceChange(pair,{brent:5,wti:0}),5000);
  assert.equal(pair.vega,null);assert.equal(pair.theta,null);assert.equal(pair.rho,null);
  assert.throws(()=>linearOilSensitivities({brentBarrels:Infinity,wtiBarrels:0},null),/Finite/);
});

test('S-28: sensitivity stages preserve current holdings, candidate meanings and the evidence cutoff',()=>{
  const result=replay(observations,config);
  const index=result.rows.findIndex(row=>row.strategyModel.plan?.steps.some(s=>s.selectedId?.startsWith('wti')));
  assert.ok(index>0);
  const row=result.rows[index]!,s=sensitivityStages(result.rows,index);
  assert.equal(s[0]!.brentDelta,result.rows[index-1]!.brentPosition);
  assert.equal(s[1]!.brentDelta,row.signal.brentBarrels);
  assert.notEqual(s[2]!.wtiDelta,s[1]!.wtiDelta);
  assert.equal(s[3]!.wtiDelta,row.wtiPosition);
  assert.ok(s.every(stage=>stage.evidenceThrough===row.riskDecision.evidenceThrough));
  const initial=explainObservation(result.rows,1,config).find(e=>e.kind==='composition')!;
  assert.match(initial.title,/awaits evidence/);
});
