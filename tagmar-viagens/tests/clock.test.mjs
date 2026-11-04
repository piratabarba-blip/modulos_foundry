import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../scripts/engine.mjs';
import * as C from '../scripts/clock.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const ORIGIN=1500*361*86400;
function setup(){const t=E.trip('Viagem');t.segments=[E.segment({...E.defaultProfiles()[0],speedMode:'kmh',base:5},100)];const s={schema:1,revision:0,trips:[t,E.duplicate(t)],profiles:E.defaultProfiles()};C.bind(s,t.id,ORIGIN);return s;}
test('vincular preserva o progresso e avança apenas uma viagem',()=>{
  const s=setup();s.trips[0]=E.advance(s.trips[0],2).trip;s.clockLink=null;C.bind(s,s.trips[0].id,ORIGIN);C.reconcile(s,ORIGIN+3600);
  near(s.trips[0].elapsed,3);near(E.totals(s.trips[0]).done,15);near(s.trips[1].elapsed,0);
});
test('repetir hook não duplica; voltar horas e cruzar dias restaura percurso',()=>{
  const s=setup();C.reconcile(s,ORIGIN+12*3600);near(E.totals(s.trips[0]).done,40);near(E.totals(s.trips[0]).resting,4);
  assert.equal(C.reconcile(s,ORIGIN+12*3600),false);C.reconcile(s,ORIGIN+3600);near(E.totals(s.trips[0]).done,5);
  C.reconcile(s,ORIGIN+25*3600);near(E.totals(s.trips[0]).done,45);near(s.trips[0].elapsed,25);
});
test('antes do vínculo mantém o progresso legado sem inventar histórico',()=>{
  const s=setup();s.trips[0]=E.advance(s.trips[0],3).trip;s.clockLink=null;C.bind(s,s.trips[0].id,ORIGIN);
  C.reconcile(s,ORIGIN-86400);near(s.trips[0].elapsed,3);assert.equal(C.display(s,s.trips[0],ORIGIN-86400).beforeLink,true);
  C.reconcile(s,ORIGIN+3600);near(s.trips[0].elapsed,4);
});
test('pausa congela só a viagem; retomada e retrocesso respeitam o período parado',()=>{
  const s=setup();C.reconcile(s,ORIGIN+3600);s.trips[0].paused=true;C.rebase(s,s.trips[0].id,ORIGIN+3600);
  C.reconcile(s,ORIGIN+3*3600);near(s.trips[0].elapsed,1);s.trips[0].paused=false;C.rebase(s,s.trips[0].id,ORIGIN+3*3600);
  C.reconcile(s,ORIGIN+4*3600);near(s.trips[0].elapsed,2);
  C.reconcile(s,ORIGIN+2*3600);near(s.trips[0].elapsed,1);assert.equal(s.trips[0].paused,true);
  C.reconcile(s,ORIGIN+4*3600);near(s.trips[0].elapsed,2);assert.equal(s.trips[0].paused,false);
});
test('mudança de velocidade só afeta futuro; retorno ao passado usa velocidade anterior',()=>{
  const s=setup();C.reconcile(s,ORIGIN+3600);s.trips[0].segments[0].base=10;C.rebase(s,s.trips[0].id,ORIGIN+3600);
  C.reconcile(s,ORIGIN+2*3600);near(E.totals(s.trips[0]).done,15);C.reconcile(s,ORIGIN+1800);near(E.totals(s.trips[0]).done,2.5);
  C.reconcile(s,ORIGIN+2*3600);near(E.totals(s.trips[0]).done,15);
});
test('chegada preserva horário real quando relógio segue avançando; retrocesso reabre viagem',()=>{
  const s=setup();s.trips[0].segments[0].distance=5;C.rebase(s,s.trips[0].id,ORIGIN);
  C.reconcile(s,ORIGIN+86400);near(s.trips[0].elapsed,1);near(s.clockLink.arrivalAt,ORIGIN+3600);
  C.reconcile(s,ORIGIN+2*86400);near(s.clockLink.arrivalAt,ORIGIN+3600);
  C.reconcile(s,ORIGIN+1800);assert.equal(s.clockLink.arrivalAt,null);near(E.totals(s.trips[0]).done,2.5);
});
test('carregar estado salvo recupera lacuna; ticks não criam histórico crescente',()=>{
  const s=setup();for(let i=1;i<=80;i++)C.reconcile(s,ORIGIN+i);assert.equal(s.clockLink.anchors.length,1);assert.equal(s.trips[0].history.length,0);
  const loaded=JSON.parse(JSON.stringify(s));C.reconcile(loaded,ORIGIN+3600);near(loaded.trips[0].elapsed,1);assert.equal(loaded.revision,0);
});
test('data absoluta inclui Cruine, ano e deslocamento do calendário',()=>{
  const g={time:{worldTime:0},modules:new Map([['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:360})}}]])};
  assert.match(C.format(C.now(g)),/Cruine de 1500/);assert.match(C.format(C.now(g)+86400),/1 de Conflito de 1501/);
  g.time.worldTime=-1;assert.match(C.format(C.now(g)),/23:59/);
});
test('vínculo é opcional, troca preserva viagem anterior e excluir limpa referência',()=>{
  const s=setup(),first=s.trips[0].id;C.reconcile(s,ORIGIN+3600);C.bind(s,s.trips[1].id,ORIGIN+3600);C.reconcile(s,ORIGIN+2*3600);
  near(s.trips.find(t=>t.id===first).elapsed,1);s.trips=s.trips.filter(t=>t.id!==s.clockLink.tripId);C.reconcile(s,ORIGIN+3*3600);assert.equal(s.clockLink,null);
  assert.equal(C.now({modules:new Map()}),null);assert.throws(()=>C.bind(s,first,null));
});
