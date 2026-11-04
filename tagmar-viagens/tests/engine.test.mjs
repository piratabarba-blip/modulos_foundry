import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../scripts/engine.mjs';
function journey(distance=50,base=5,work=8) {
  const t=E.trip();t.segments=[E.segment({...E.defaultProfiles()[0],speedMode:'kmh',base,work},distance)];return t;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('50 km: 10h movimento + 16h descanso; dia 2 às 12h',()=>{
  const t=journey(),e=E.estimate(t);near(e.arrival,26);near(e.moving,10);near(e.resting,16);assert.equal(E.arrival(t,e.arrival),'Dia 2, 12:00');
  assert.equal(t.elapsed,0);assert.deepEqual(t.progress,{});
});
test('40 km: chega às 18h, sem descanso ao final',()=>{
  const t=journey(40),e=E.estimate(t);assert.equal(e.arrival,8);assert.equal(e.resting,0);assert.equal(E.arrival(t,e.arrival),'Dia 1, 18:00');
});
test('barco 500km a 10km/h contínuo: dia 3 às 12h',()=>{
  const t=journey(500,10,24);assert.equal(E.estimate(t).arrival,50);assert.equal(E.arrival(t,50),'Dia 3, 12:00');
});
test('avançar12h:40km e4h descanso; repetir e limitar chegada',()=>{
  const t=E.advance(journey(),12).trip,tot=E.totals(t);near(tot.done,40);near(tot.resting,4);near(tot.remaining,10);
  const result=E.advance(t,24);near(result.used,14);near(result.unused,10);assert.ok(result.arrived);near(E.totals(result.trip).resting,16);
});
test('zero distância; esperas; mudança de transporte inicia ciclo novo',()=>{
  const t=journey(0);t.segments.push(E.segment({...E.defaultProfiles()[0],speedMode:'kmh',base:5,work:8},20));t.segments[0].wait=2;
  const result=E.advance(t,24);near(result.used,6);near(result.unused,18);near(E.totals(result.trip).waiting,2);
  const t2=journey(40);t2.segments.push(E.segment({...t2.segments[0]},40));t2.segments[1].wait=3;
  near(E.estimate(t2).arrival,19);near(E.estimate(t2).resting,0);
});
test('VB e fatores; tamanho/animais não multiplicam velocidade',()=>{
  const s=E.defaultProfiles()[0];near(E.speed(s),4.8);
  s.pace=1.2;s.difficulty=.85;s.load=.8;s.fatigue=.5;near(E.speed(s),4.8*1.2*.85*.8*.5);
  const v=E.speed(s);s.animals=6;s.size='Grande';near(E.speed(s),v);
});
test('zero velocidade bloqueia sem inventar chegada; espera pode avançar',()=>{
  const t=journey(50,0);t.segments[0].wait=2;
  const e=E.estimate(t);assert.equal(e.arrival,null);assert.match(e.blocked,/zero/);
  const a=E.advance(t,24);near(a.used,2);near(a.unused,22);assert.equal(a.arrived,false);
});
test('entradas inválidas rejeitadas',()=>{
  for(const v of [NaN,Infinity,-1,'',null])assert.throws(()=>E.advance(journey(),v));
  for(const key of ['distance','wait','base','work','difficulty']) {
    const t=journey();t.segments[0][key]=-1;assert.throws(()=>E.estimate(t));
  }
  const t=journey();t.departureTime='25:01';assert.throws(()=>E.estimate(t));
  t.departureTime='10:00';t.departureDay=1.5;assert.throws(()=>E.estimate(t));
  t.departureDay=1;t.segments[0].work=0;assert.throws(()=>E.estimate(t));
});
test('desfazer, pausar, duplicar e reabrir preservam estados',()=>{
  const t=journey();const a=E.advance(t,12).trip;assert.deepEqual(E.undo(a),t);
  const loaded=JSON.parse(JSON.stringify(a));assert.deepEqual(E.advance(loaded,5),E.advance(a,5));
  loaded.paused=true;assert.throws(()=>E.advance(loaded,1),/pausada/);
  const copy=E.duplicate(loaded);assert.equal(copy.elapsed,0);assert.equal(copy.paused,false);assert.deepEqual(copy.progress,{});assert.notEqual(copy.segments[0].id,t.segments[0].id);
});
test('mudar velocidade no meio preserva passado e descanso',()=>{
  const t=E.advance(journey(100),12).trip, next=E.clone(t);next.segments[0].base=10;
  const changed=E.savePlan(t,next);near(E.totals(changed).done,40);near(changed.elapsed,12);
  near(E.estimate(changed).remaining,18); //12h restante de descanso +6h de percurso
  assert.deepEqual(E.undo(changed),t);
  for(const key of ['distance','wait','work']){const n=E.clone(t);n.segments[0][key]+=1;assert.throws(()=>E.savePlan(t,n));}
  const n=E.clone(t);n.segments.reverse();n.segments.push(E.segment(E.defaultProfiles()[0]));assert.throws(()=>E.savePlan(t,n));
});
test('perfil copiado; nenhum vínculo retroativo',()=>{
  const p=E.defaultProfiles()[0], s=E.segment(p);p.base=100;assert.equal(s.base,20);
});
test('exemplo:6250km; alterações em trechos futuros preservam histórico',()=>{
  const t=E.example();assert.equal(E.totals(t).distance,6250);
  const a=E.advance(t,5).trip, next=E.clone(a);next.segments[2].base=12;next.segments[2].distance=4000;
  const changed=E.savePlan(a,next);near(E.totals(changed).done,E.totals(a).done);assert.ok(E.estimate(changed).arrival<E.estimate(a).arrival);
});
test('avanços particionados equivalem a avanço único (180 cenários)',()=>{
  for(let i=1;i<=180;i++) {
    const t=journey(i*1.73,.5+i%17,.25+i%24);t.segments[0].wait=i%6;
    t.segments.push(E.segment({...t.segments[0]},10+i));t.segments[1].wait=2;
    const budget=i*2.19, single=E.advance(t,budget).trip;
    let many=t;
    for(let n=0;n<7;n++)many=E.advance(many,budget/7).trip;
    near(many.elapsed,single.elapsed);
    for(const key of ['done','moving','resting','waiting'])near(E.totals(many)[key],E.totals(single)[key]);
  }
});
test('enorme distância calculada sem simulação por hora; histórico limitado',()=>{
  const t=journey(1e7,.01,.01);assert.ok(Number.isFinite(E.estimate(t).arrival));
  let a=journey(5000);for(let i=0;i<30;i++)a=E.advance(a,1).trip;assert.equal(a.history.length,20);
});
test('painel distingue espera, movimento, descanso, reinício e chegada',()=>{
  let t=journey(50);t.segments[0].wait=2;
  assert.equal(E.currentStage(t).label,'Espera antes de partir');near(E.currentStage(t).untilNext,2);
  t=E.advance(t,2).trip;assert.equal(E.currentStage(t).label,'Em deslocamento');near(E.currentStage(t).untilNext,8);
  t=E.advance(t,8).trip;assert.equal(E.currentStage(t).label,'Descanso');near(E.currentStage(t).untilNext,16);
  t=E.advance(t,16).trip;assert.equal(E.currentStage(t).label,'Em deslocamento');near(E.currentStage(t).untilNext,2);
  t=E.advance(t,24).trip;assert.equal(E.currentStage(t).label,'Chegada');assert.equal(E.currentStage(t).finished,true);
  assert.equal(E.currentStage(E.trip()).label,'Sem roteiro');
  assert.equal(E.currentStage(journey(50,0)).label,'Deslocamento bloqueado');
  assert.throws(()=>E.number('   ','Horas'),/número/);
});
