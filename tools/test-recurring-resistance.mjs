import assert from 'node:assert/strict';
import {resolveRequest,expireMarkers} from '../tagmar-token-fx/scripts/casts.mjs';
import {repeatResistance,registerRecurringResistance} from '../tagmar-token-fx/scripts/recurring-resistance.mjs';
import {castConfiguration} from '../tagmar-token-fx/scripts/cast-rules.mjs';
import {calendarNow} from '../tagmar-token-fx/scripts/timers.mjs';
import {applyMarker} from '../tagmar-token-fx/scripts/casts.mjs';
import {reconcileResistanceAreas} from '../tagmar-token-fx/scripts/resistance-areas.mjs';
const ID='tagmar-token-fx';
function collection(values=[]){values.get=id=>values.find(v=>v.id===id);return values;}
function assign(target,changes){for(const [path,value] of Object.entries(changes)){
  const keys=path.split('.');let root=target;
  for(const key of keys.slice(0,-1))root=root[key]??=( {} );
  root[keys.at(-1)]=structuredClone(value);
}}
const gm={id:'a',active:true,isGM:true},otherGM={id:'b',active:true,isGM:true},player={id:'p',active:true,isGM:false};
const chat=[],dice=[],damage=[],errors=[],hooks=new Map();
globalThis.Hooks={on:(name,fn)=>{const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list);}};
globalThis.ui={notifications:{warn:text=>errors.push(text),error:text=>errors.push(text)}};
globalThis.foundry={utils:{escapeHTML:s=>s.replaceAll('<','&lt;')}};
globalThis.ChatMessage={getSpeaker:()=>({}),create:async data=>{chat.push(data);return{id:'chat'+chat.length};}};
globalThis.game={user:gm,users:collection([gm,otherGM,player]),time:{worldTime:0},modules:new Map([
  [ID,{active:true}],['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:Math.floor(game.time.worldTime/86400)})}}]
])};
let success=false;
const actor=id=>({id,uuid:'Actor.'+id,name:id,system:{rm:8},effects:collection(),items:[],isOwner:true,
  testUserPermission:()=>true,
  _rollResistencia:async(fa,type,options)=>{dice.push({id,fa,type,options});return {success};},
  _aplicarDano:async data=>damage.push({id,data}),
  async createEmbeddedDocuments(type,docs){for(const data of docs){const e={...structuredClone(data),id:'effect'+this.effects.length,parent:this,
    getFlag:(scope,key)=>e.flags?.[scope]?.[key],async update(changes){assign(e,changes);}};this.effects.push(e);}}
});
const caster=actor('caster'),first=actor('first'),second=actor('second');
const scene={id:'scene',grid:{size:100,distance:1}};
const token=(id,a,x)=>{const d={id,uuid:`Scene.scene.Token.${id}`,name:id,actor:a,actorLink:true,parent:scene};return {id,name:id,actor:a,document:d,center:{x,y:0}};};
const source=token('source',caster,0),a=token('a',first,100),b=token('b',second,200);
scene.tokens=collection([source.document,a.document,b.document]);
game.scenes=collection([scene]);game.actors=collection([caster,first,second]);
globalThis.canvas={ready:true,scene,tokens:{placeables:[source,a,b]}};
const combatants=collection([source,a,b].map(t=>({id:'c'+t.id,actor:t.actor,token:t.document})));
const combat={id:'battle',started:true,round:1,turn:0,combatants};game.combat=combat;
const flags={cast:{enabled:true,shape:'targets',resolution:'rm',repeatRM:true,fa:7,damage:10,duration:10,unit:'rounds'}};
const item={id:'spell',uuid:'Actor.caster.Item.spell',actor:caster,type:'Magia',name:'Amizade',img:'icons/svg/aura.svg',system:{},
  getFlag:(_scope,key)=>flags[key],async setFlag(_scope,key,value){flags[key]=structuredClone(value);},async unsetFlag(_scope,key){delete flags[key];}};
globalThis.fromUuid=async uuid=>uuid===item.uuid?item:null;
let serial=0;
function request(){const state={castRequest:{itemUuid:item.uuid,sourceId:'source',sceneId:'scene',origin:{x:0,y:0},direction:0,targets:['a','b'],status:'pending'}};
  return {id:'cast'+(++serial),author:player,whisper:['a','p'],getFlag:(_s,k)=>state[k],async update(changes){for(const [k,v] of Object.entries(changes)){
    if(k.startsWith('flags.'+ID+'.'))assign(state,{[k.slice(('flags.'+ID+'.').length)]:v});
  }}};
}
const timer=e=>e.getFlag(ID,'spellTimer');
const next=async(round,turn,previous={round,turn:turn-1})=>{
  combat.round=round;combat.turn=turn;
  await repeatResistance(combat,previous,{round,turn,combatantId:combatants[turn].id});
};
await resolveRequest(request());
assert.equal(dice.length,2);assert.equal(damage.length,2);
assert.equal(first.effects[0].name,'Amizade'); // Nome automático com repetição.
assert.equal(timer(first.effects[0]).endsAt-calendarNow(game),150);
assert.equal(timer(first.effects[0]).recurringRM.fa,7);
assert.equal(timer(first.effects[0]).recurringRM.tokenId,'a');
// Alterar item depois não altera FA já aplicada. Falha não repete dano.
flags.cast.fa=20;
await next(1,1);assert.equal(dice.length,3);assert.equal(dice.at(-1).fa,7);assert.equal(damage.length,2);
await next(1,1);assert.equal(dice.length,3);
await next(1,0,{round:1,turn:1});assert.equal(dice.length,3);
await next(1,1);assert.equal(dice.length,3);
// Outro GM/jogador não repete as rolagens do mestre executor.
game.user=otherGM;await next(1,2);game.user=player;await next(1,2);assert.equal(dice.length,3);game.user=gm;
const visual={id:'visualABC',sceneId:'scene',targets:['a','b'],config:{mode:'targets',lightEnabled:true}};
flags.activeJb2a=structuredClone(visual);
for(const target of [first,second])await target.effects[0].update({[`flags.${ID}.spellTimer.visualId`]:visual.id});
success=true;
await next(1,2);assert.equal(dice.length,4);assert(second.effects[0].disabled);assert(timer(second.effects[0]).endedByRM);
assert.deepEqual(flags.activeJb2a.targets,['a']);assert(!first.effects[0].disabled);
await next(2,1);assert.equal(dice.length,5);assert(first.effects[0].disabled);assert(!flags.activeJb2a);
await next(3,1);assert.equal(dice.length,5);
// Reaplicar renova o mesmo marcador e limpa turno/status/visual antigos.
success=false;combat.round=3;combat.turn=0;
await resolveRequest(request());assert.equal(first.effects.length,1);assert(!first.effects[0].disabled);
assert(!timer(first.effects[0]).endedByRM);assert.deepEqual(timer(first.effects[0]).recurringRM.turns,{});
assert.equal(timer(first.effects[0]).visualId,null);
const before=dice.length;
await next(3,1);assert.equal(dice.length,before+1);assert.equal(dice.at(-1).fa,20);
// Duração encerra antes de pedir outra RM.
game.time.worldTime=150;await next(4,2);assert.equal(dice.length,before+1);assert(second.effects[0].disabled);
await expireMarkers();assert(first.effects[0].disabled);
// Nome e duração continuam funcionando com teste único, sem RM por turno.
flags.cast.repeatRM=false;flags.cast.effectName='Teste único';game.time.worldTime=200;
await resolveRequest(request());assert.equal(timer(first.effects[0]).recurringRM,null);
const single=dice.length;await next(5,1);assert.equal(dice.length,single);
// Próprio personagem: não repetir o teste do lançamento no turno já em curso.
flags.cast.repeatRM=true;flags.cast.shape='self';combat.round=6;combat.turn=0;
await resolveRequest(request());const selfCount=dice.length;
await next(6,0,{round:5,turn:2});assert.equal(dice.length,selfCount);
await next(7,0,{round:6,turn:2});assert.equal(dice.length,selfCount+1);
// Registro durável continua depois de reconexão; não depende de variável local.
const copy=structuredClone(timer(caster.effects[0]));caster.effects[0].flags[ID].spellTimer=copy;
await next(7,0,{round:6,turn:2});assert.equal(dice.length,selfCount+1);
// RF/ataque jamais ganham repetição RM por flag antiga.
assert.equal(castConfiguration({getFlag:()=>({resolution:'rf',repeatRM:true})}).repeatRM,false);
assert.equal(castConfiguration({getFlag:()=>({resolution:'attack',repeatRM:true})}).repeatRM,false);
// Visual de área compartilhado só termina quando o último alvo resiste.
flags.cast.shape='targets';combat.round=8;combat.turn=0;await resolveRequest(request());
flags.activeJb2a={...visual,config:{mode:'area'}};
for(const target of [first,second])await target.effects[0].update({[`flags.${ID}.spellTimer.visualId`]:visual.id});
success=true;await next(8,1);assert(flags.activeJb2a);await next(8,2);assert(!flags.activeJb2a);
// Um visual de outra conjuração jamais é removido pela resistência anterior.
success=false;combat.round=9;combat.turn=0;await resolveRequest(request());
timer(first.effects[0]).visualId='oldVisual';flags.activeJb2a={...visual,id:'newVisual'};
success=true;await next(9,1);assert.equal(flags.activeJb2a.id,'newVisual');
// Captura o alvo/turno do evento antes de esperar tarefas da fila.
const tasks=[];registerRecurringResistance(task=>tasks.push(task));
const previous={round:10,turn:0},current={round:10,turn:1,combatantId:'ca'};
success=false;combat.round=10;combat.turn=0;await resolveRequest(request());
const hookCount=dice.length;
hooks.get('combatTurnChange')[0](combat,previous,current);
current.turn=2;current.combatantId='cb';await tasks.shift()();
assert.equal(dice.length,hookCount+1);assert.equal(dice.at(-1).id,'first');
// Remoção manual encerra só o visual relacionado, através da mesma fila.
const removed=first.effects.shift();timer(removed).visualId='manual';
flags.activeJb2a={...visual,id:'manual'};
hooks.get('deleteActiveEffect')[0](removed);await tasks.shift()();
assert.deepEqual(flags.activeJb2a.targets,['b']);
assert.equal(errors.length,0);
console.log('PASS: RM inicial, próximo turno por alvo, teste único, sem dano repetido, GM único, duplicação/retrocesso, renovação, expiração, reconexão, visual/luz individual e área compartilhada.');

// Dano recorrente opt-in e penalidades derivadas, sem acumular nem alterar bônus salvos.
flags.cast={enabled:true,shape:'targets',resolution:'rm',repeatRM:true,repeatDamage:true,rmSuccess:'turn',
  fa:14,damage:15,combatPenalty:2,skillPenalty:3,resistedDamage:100,duration:10,unit:'rounds'};
flags.activeJb2a=undefined;first.effects.length=0;second.effects.length=0;
first.system.inf_ataque={bonus:4};first.system.bonus_habil=5;
success=false;combat.round=20;combat.turn=0;game.time.worldTime=300;
await resolveRequest(request());const initialDamage=damage.length;
assert.deepEqual(first.effects[0].changes.map(c=>[c.key,c.value]),[['system.tagmarFxCombatAdjustment','-2'],['system.tagmarFxSkillAdjustment','-3']]);
await next(20,1);assert.equal(damage.length,initialDamage+1);assert.equal(damage.at(-1).data.valor,15);
await next(20,1);assert.equal(damage.length,initialDamage+1);
success=true;await next(21,1);assert.equal(first.effects[0].changes.length,0);assert(!first.effects[0].disabled);
assert.equal(damage.length,initialDamage+1);
success=false;await next(22,1);assert.equal(first.effects[0].changes.length,2);assert.equal(damage.length,initialDamage+2);
assert.equal(first.system.inf_ataque.bonus,4);assert.equal(first.system.bonus_habil,5);
// Sucesso inicial com modo por turno guarda o próximo teste e não causa dano.
success=true;combat.round=23;combat.turn=0;await resolveRequest(request());
const passedDamage=damage.length;assert.equal(first.effects[0].changes.length,0);
success=false;await next(23,1);assert.equal(damage.length,passedDamage+1);

// Campo persistente: entrada, saída, imunidade até reentrada, duração original.
const sceneFlags={};scene.getFlag=(_s,k)=>sceneFlags[k];scene.setFlag=async(_s,k,v)=>sceneFlags[k]=structuredClone(v);
for(const t of [source,a,b]){t.document.object=t;t.document.disposition=1;}
flags.cast.shape='circle';flags.cast.distance=3;flags.cast.includeCaster=false;flags.cast.rmSuccess='end';
success=true;combat.round=24;combat.turn=0;await resolveRequest(request());
const areaEnd=sceneFlags.resistanceAreas[0].endsAt;
assert(timer(first.effects[0]).recurringRM.immune);const immuneDice=dice.length;
await next(24,1);assert.equal(dice.length,immuneDice);
a.center.x=500;await reconcileResistanceAreas(scene,applyMarker);assert(first.effects[0].disabled);
success=false;a.center.x=100;await reconcileResistanceAreas(scene,applyMarker);
assert(!first.effects[0].disabled);assert(!timer(first.effects[0]).recurringRM.immune);
assert.equal(first.effects[0].changes.length,2);assert.equal(timer(first.effects[0]).endsAt,areaEnd);
// Novo alvo entra depois da conjuração e recebe teste/dano uma vez.
const third=actor('third'),d=token('d',third,150);d.document.object=d;d.document.disposition=1;
scene.tokens.push(d.document);game.actors.push(third);
const entrantsDice=dice.length;await reconcileResistanceAreas(scene,applyMarker);
assert.equal(dice.length,entrantsDice+1);assert.equal(third.effects.length,1);
await reconcileResistanceAreas(scene,applyMarker);assert.equal(dice.length,entrantsDice+1);
// Fora da área não testa no turno; expiração elimina os campos e suas penalidades.
a.center.x=500;await reconcileResistanceAreas(scene,applyMarker);
const outsideDice=dice.length;await next(25,1);assert.equal(dice.length,outsideDice);
game.time.worldTime+=151;await reconcileResistanceAreas(scene,applyMarker);await expireMarkers();
assert.equal(sceneFlags.resistanceAreas.length,0);assert(third.effects[0].disabled);assert.equal(third.effects[0].changes.length,0);
assert.equal(errors.length,0);
console.log('PASS: dano integral opt-in, sucesso inicial/por turno, penalidades não cumulativas, bônus manuais preservados, área persistente, saída/reentrada, novos alvos, imunidade e expiração.');

// Bônus e penalidade assinados também funcionam sem repetição ou nome preenchido.
first.effects.length=0;second.effects.length=0;
flags.cast={enabled:true,shape:'targets',resolution:'none',combatModifier:2,skillModifier:-3,duration:2,unit:'rounds'};
await resolveRequest(request());
assert.equal(first.effects[0].name,item.name);
assert.deepEqual(first.effects[0].changes.map(c=>c.value),['2','-3']);
assert.deepEqual(timer(first.effects[0]).adjustments,{combat:2,skill:-3});
await resolveRequest(request());assert.equal(first.effects.length,1,'Renew same effect instead of stacking');
game.time.worldTime+=31;await expireMarkers();assert(first.effects[0].disabled);
flags.cast={...flags.cast,resolution:'rm',repeatRM:true,rmSuccess:'end'};combat.round=40;combat.turn=0;success=false;
await resolveRequest(request());await next(40,1);assert.deepEqual(first.effects[0].changes.map(c=>c.value),['2','-3']);
success=true;await next(41,1);assert(first.effects[0].disabled);
console.log('PASS: signed modifiers with no test/name, renewal without stacking, expiry and recurring RM removes bonuses and penalties.');

// Adesão opcional: sair preserva bônus/penalidades e a RM continua por turno.
flags.cast={...flags.cast,shape:'circle',distance:3,persistAfterExit:true,duration:10,unit:'rounds'};
a.center.x=100;success=false;combat.round=50;combat.turn=0;
await resolveRequest(request());
const carried=first.effects[0],carriedEnd=timer(carried).endsAt,carriedDice=dice.length;
a.center.x=500;await reconcileResistanceAreas(scene,applyMarker);
assert(!carried.disabled);assert.equal(carried.changes.length,2);assert(timer(carried).recurringRM.leftArea);
const outsideBeforeTurn=dice.length;await next(50,1);assert.equal(dice.length,outsideBeforeTurn+1);assert.equal(carried.changes.length,2);
const beforeReentry=dice.length;
a.center.x=100;await reconcileResistanceAreas(scene,applyMarker);
assert.equal(dice.length,beforeReentry);assert.equal(timer(carried).endsAt,carriedEnd);
a.center.x=500;await reconcileResistanceAreas(scene,applyMarker);
success=true;await next(51,1);assert(carried.disabled);assert(timer(carried).endedByRM);
a.center.x=100;await reconcileResistanceAreas(scene,applyMarker);assert.equal(dice.length,beforeReentry+1);assert(carried.disabled);
// Livre neste turno segue funcionando fora da área, sem acumular e sem renovar.
flags.cast.rmSuccess='turn';success=false;combat.round=52;combat.turn=0;
await resolveRequest(request());const free=first.effects[0],freeEnd=timer(free).endsAt;
a.center.x=500;await reconcileResistanceAreas(scene,applyMarker);
success=true;await next(52,1);assert.equal(free.changes.length,0);assert(!free.disabled);
success=false;await next(53,1);assert.equal(free.changes.length,2);assert.equal(timer(free).endsAt,freeEnd);
game.time.worldTime+=151;await reconcileResistanceAreas(scene,applyMarker);await expireMarkers();assert(free.disabled);
console.log('PASS: optional carry after area exit, outside turn tests, no reentry reroll/renewal, end-on-success, free-turn and expiration outside.');
