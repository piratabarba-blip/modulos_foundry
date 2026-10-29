import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {castConfiguration,secondsFor,facingAngle,insideArea,attackResult,acceptsTarget} from '../tagmar-token-fx/scripts/cast-rules.mjs';
import {resolveRequest,expireMarkers,turnToTarget,handleItemUse} from '../tagmar-token-fx/scripts/casts.mjs';
import {remainingLabel} from '../tagmar-token-fx/scripts/spell-times.mjs';
const root=process.env.TAGMAR_TEST_SYSTEM;
assert(root,'Informe TAGMAR_TEST_SYSTEM');
const sys=await readFile(root+'/modules/tagmar.js','utf8');
const tableText=sys.slice(sys.indexOf('const tabela_resol'),sys.indexOf('Hooks.once'));
// Extrai somente as duas constantes de tabelas, sem iniciar o sistema.
const getArray=name=>{const start=sys.indexOf(`const ${name} = [`),end=sys.indexOf('];',start)+2;assert(start>=0);return vm.runInNewContext(sys.slice(start,end)+`;${name}`);};
const table=getArray('tabela_resol'),rmTable=getArray('table_resFisMag');
assert.equal(secondsFor({duration:10,unit:'rounds'}),150);
assert.equal(secondsFor({duration:1,unit:'weeks'}),604800);
assert.equal(secondsFor({duration:1,unit:'days'}),86400);
assert.equal(remainingLabel(3600),'Restam 1 h');
assert.equal(remainingLabel(0),'Expirado');
assert.equal(remainingLabel(86460),'Restam 1 d 1 min');
assert.equal(facingAngle({x:0,y:0},{x:100,y:0}),270);
assert.equal(facingAngle({x:0,y:0},{x:0,y:100}),0);
assert.equal(facingAngle({x:0,y:0},{x:100,y:0},90),0);
const base={shape:'circle',distance:2,width:1,angle:90};
assert(insideArea({x:200,y:0},{x:0,y:0},0,base,100));
assert(!insideArea({x:201,y:0},{x:0,y:0},0,base,100));
assert(insideArea({x:100,y:50},{x:0,y:0},0,{...base,shape:'cone'},100));
assert(!insideArea({x:-20,y:0},{x:0,y:0},0,{...base,shape:'cone'},100));
assert(insideArea({x:100,y:49},{x:0,y:0},0,{...base,shape:'ray'},100));
assert(!insideArea({x:100,y:51},{x:0,y:0},0,{...base,shape:'ray'},100));
for(let n=1;n<=20;n++){const result=attackResult(table,8,n,40);assert.equal(result.color,table.find(r=>r[0]===8)[n]);}
assert.equal(attackResult(table,8,20,40).critical,true);

const flags={},requests=[],summaries=[],rollMessages=[],warnings=[],damage=[];
const gm={id:'gm',isGM:true,active:true,targets:new Set()},player={id:'p',isGM:false,active:true};
const users=[gm,player];users.get=id=>users.find(u=>u.id===id);
const modules=new Map([['tagmar-token-fx',{active:true}],['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:Math.floor(game.time.worldTime/86400)})}}]]);
globalThis.game={user:gm,users,modules,time:{worldTime:0},tagmar:{tabela_resol:table,table_resFisMag:rmTable},settings:{get:()=>false}};
globalThis.foundry={utils:{escapeHTML:s=>s.replaceAll('<','&lt;')}};
globalThis.ui={notifications:{warn:s=>warnings.push(s),error:s=>warnings.push(s),info(){}}};
globalThis.Hooks={callAll(){}};
globalThis.ChatMessage={getSpeaker:()=>({}),create:async data=>{
  if(data.flags?.['tagmar-token-fx']?.castRequest?.status==='done'){
    summaries.push({data,rollCount:rollMessages.length});return {id:'summary'+summaries.length};
  }
  requests.push(data);
}};
let dice=1;globalThis.Roll=class{async evaluate(){this.total=dice;return this;}async toMessage(data){rollMessages.push(data);}};
const actorText=await readFile(root+'/modules/tagmarActor.js','utf8');
const begin=actorText.indexOf('    async _rollResistencia('),end=actorText.indexOf('    async evalAtrib',begin);
const NativeActor=new Function(`return class {${actorText.slice(begin,end)}}`)();
const makeActor=id=>{
  const a=new NativeActor();Object.assign(a,{uuid:`Actor.${id}`,name:id,system:{rm:5,rf:20,d_ativa:{valor:2}},effects:[],items:[],testUserPermission:()=>true,
    getFlag:()=>undefined,_aplicarDano:async d=>damage.push({id,value:d.valor}),
    createEmbeddedDocuments:async(_type,docs)=>{for(const data of docs){const e={...data,id:`e${a.effects.length}`,getFlag:(m,k)=>e.flags?.[m]?.[k],update:async d=>{Object.assign(e,d);if(Object.hasOwn(d,'flags.tagmar-token-fx.spellTimer.expired'))e.flags['tagmar-token-fx'].spellTimer.expired=d['flags.tagmar-token-fx.spellTimer.expired'];}};a.effects.push(e);}},
    deleteEmbeddedDocuments:async(_type,ids)=>{a.effects=a.effects.filter(e=>!ids.includes(e.id));}});return a;
};
const caster=makeActor('caster'),a=makeActor('a'),b=makeActor('b');caster.isOwner=true;
const makeToken=(id,actor,x)=>({id,name:id,actor,center:{x,y:0},document:{id,actor,actorLink:true,hidden:false,isOwner:true,uuid:`Scene.s.Token.${id}`,update:async d=>{rotations.push(d);}}});
const rotations=[],source=makeToken('source',caster,0),first=makeToken('first',a,100),second=makeToken('second',b,200);
const tokens=[source,first,second];tokens.get=id=>tokens.find(t=>t.id===id)?.document;
const scene={id:'s',tokens,grid:{size:100,distance:1}};const scenes=[scene];scenes.get=id=>id==='s'?scene:null;
game.actors=[caster,a,b];game.scenes=scenes;
globalThis.canvas={ready:true,scene,tokens:{placeables:tokens,controlled:[source]}};
const item={uuid:'Actor.caster.Item.magic',id:'magic',type:'Magia',isOwner:true,name:'Teste',actor:caster,system:{},img:'icons/svg/aura.svg',getFlag:(_m,key)=>flags[key]};
globalThis.fromUuid=async()=>item;
flags.cast={enabled:true,shape:'circle',distance:1.1,resolution:'rm',fa:5,damage:20,effectName:'Proteção',duration:10,unit:'rounds'};
function message(){const f={castRequest:{itemUuid:item.uuid,sourceId:'source',sceneId:'s',origin:{x:150,y:0},direction:0,targets:[],status:'pending'}};return {author:player,whisper:['gm','p'],getFlag:(_m,k)=>f[k],update:async data=>{for(const [k,v] of Object.entries(data)){if(k==='flags.tagmar-token-fx.castRequest.status')f.castRequest.status=v;else if(k==='flags.tagmar-token-fx.castResults')f.castResults=structuredClone(v);}},flags:f};}
let msg=message();await resolveRequest(msg);
assert.match(summaries.at(-1).data.content,/Resumo do ataque/);
assert(!summaries.at(-1).data.content.includes('width="48"'));
assert.deepEqual(summaries.at(-1).data.whisper,['gm','p']);
assert.equal(summaries.at(-1).data.flags['tagmar-token-fx'].castRequest.status,'done');
assert.equal(damage.length,2);assert.equal(a.effects.length,1);assert.equal(b.effects.length,1);
assert.equal(a.effects[0].duration.seconds,150);assert.equal(msg.flags.castRequest.status,'done');
await resolveRequest(msg);assert.equal(damage.length,2); // Não repetir cartão resolvido.
await resolveRequest(message());assert.equal(a.effects.length,1); // Renovação, não empilhamento.
dice=20;msg=message();await resolveRequest(msg);assert.equal(damage.length,4); // Resistência impede dano e novo efeito.
game.time.worldTime=149;await expireMarkers();assert.equal(a.effects.length,1);
game.time.worldTime=150;await expireMarkers();assert.equal(a.effects.length,1);assert.equal(a.effects[0].disabled,true);assert.equal(b.effects[0].disabled,true);
assert.equal(a.effects[0].getFlag('tagmar-token-fx','spellTimer').expired,true);
game.user=player;await resolveRequest(message());assert.equal(damage.length,4);game.user=gm;
caster.testUserPermission=()=>false;await assert.rejects(resolveRequest(message()),/permissão/);caster.testUserPermission=()=>true;
flags.cast={rotate:true,enabled:false};gm.targets=new Set([first]);await turnToTarget(item);assert.equal(rotations.at(-1).rotation,270);
source.document.lockRotation=true;await turnToTarget(item);assert.equal(rotations.length,1);source.document.lockRotation=false;
flags.cast={enabled:true,shape:'self',resolution:'none',effectName:'Teste'};await handleItemUse(item);assert.equal(requests.length,1);assert.deepEqual(requests[0].flags['tagmar-token-fx'].castRequest.targets,['source']);
// Calendário não pode somar segundos de tempo real durante o combate.
const calendar=await readFile(new URL('../tagmar-calendario/scripts/calendar.js',import.meta.url),'utf8');
assert.match(calendar,/if \(game\.combat\?\.started\) return;/);
assert.match(sys,/CONFIG\.time\.roundTime = 15/);
// Exercita a função real do Foundry 14: início, turnos, rodadas e salto de rodadas.
const combatText=await readFile(process.env.TAGMAR_TEST_FOUNDRY+'/client/documents/combat.mjs','utf8');
const methodStart=combatText.indexOf('  getTimeDelta('),methodEnd=combatText.indexOf('\n  }',methodStart)+4;
globalThis.CONFIG={time:{roundTime:15,turnTime:0}};
const CombatClock=new Function(`return class {${combatText.slice(methodStart,methodEnd)}}`)();
const combat=new CombatClock();combat.turns=Array(7);
assert.equal(combat.getTimeDelta(0,null,1,0),0);
assert.equal(combat.getTimeDelta(1,0,1,1),0);
assert.equal(combat.getTimeDelta(1,6,2,0),15);
assert.equal(combat.getTimeDelta(1,0,11,0),150);
// Ataque usa tabela nativa, desconta munição uma vez e não duplica dano
// quando dois tokens vinculados representam a mesma reserva de recursos.
flags.cast={enabled:true,shape:'circle',distance:1.1,resolution:'attack',column:8,damage:40};
item.type='Combate';item.system={municao:10,tipo:'MAG',nivel:8,bonus:'',bonus_magico:0,def_l:0,def_m:0,def_p:0,dano:{d100:40},penalidade:{}};
let ammoUpdates=0;item.update=async d=>{ammoUpdates++;item.system.municao=d['system.municao'];};
tokens.push(makeToken('duplicate',a,150));
dice=table.find(r=>r[0]===8).indexOf('azul');assert(dice>0);
const countBefore=damage.length;await resolveRequest(message());
assert.equal(summaries.at(-1).rollCount,rollMessages.length);
assert.equal(summaries.at(-1).data.flags['tagmar-token-fx'].castResults.length,2);
assert.equal(damage.length,countBefore+2);assert.equal(ammoUpdates,1);assert.equal(item.system.municao,9);
assert.equal(damage.at(-1).value,40);tokens.pop();item.type='Magia';
// Falha no efeito depois do dano deixa registro da aplicação parcial e não repete.
flags.cast={enabled:true,shape:'circle',distance:1.1,resolution:'none',damage:10,effectName:'Teste',duration:10,unit:'rounds'};
const create=a.createEmbeddedDocuments;a.effects=[];a.createEmbeddedDocuments=async()=>{throw Error('Falha simulada no efeito');};
msg=message();const beforePartial=damage.length;
await assert.rejects(resolveRequest(msg),/Falha simulada/);
assert.equal(msg.flags.castRequest.status,'interrupted');
assert.equal(msg.flags.castResults[0].damageApplied,true);
await resolveRequest(msg);assert.equal(damage.length,beforePartial+1);
a.createEmbeddedDocuments=create;
// RF usa a resistência física, diferente da RM. Avisos não modificam atributos.
flags.cast={enabled:true,shape:'circle',distance:1.1,resolution:'rf',fa:5,damage:0,effectName:'Aviso RF',duration:1,unit:'weeks'};
dice=5;msg=message();await resolveRequest(msg);assert(msg.flags.castResults.every(r=>r.description==='Passou na RF'));
dice=1;await resolveRequest(message());assert.equal(a.effects[0].duration.seconds,604800);
assert.deepEqual(a.effects[0].changes,[]);assert.equal(a.effects[0].img,item.img);
// Renovação reativa um aviso expirado; não cria outro igual.
game.time.worldTime+=604800;await expireMarkers();assert(a.effects[0].disabled);
await resolveRequest(message());assert.equal(a.effects.length,1);assert.equal(a.effects[0].disabled,false);
assert.equal(a.effects[0].getFlag('tagmar-token-fx','spellTimer').expired,false);
item.type='Tecnica_Combate';item.system.nivel=0;
await assert.rejects(handleItemUse(item),/possuir nível/);
item.system.nivel=1;flags.cast={enabled:true,shape:'self',resolution:'none',effectName:'Imprevisibilidade',duration:1,unit:'hours'};
await resolveRequest(message());assert.equal(caster.effects[0].name,'Imprevisibilidade');assert.equal(caster.effects[0].duration.seconds,3600);
// Visual único na área: não depende de quantos tokens falharam ou existem nela.
globalThis.PIXI={Circle:class{constructor(x,y,radius){Object.assign(this,{x,y,radius});}},Polygon:class{constructor(points){this.points=points;}}};
const visuals=[];
globalThis.Sequence=class{constructor(){this.effects=[];}effect(){const e={};this.effects.push(e);const chain={};for(const m of ['file','name','atLocation','size','rotate','mask','duration','fadeIn','fadeOut'])chain[m]=(...args)=>{e[m]=args;return chain;};return chain;}async play(){visuals.push(this.effects);}};
globalThis.Sequencer={Database:{publicFlattenedSimpleEntries:['jb2a.fire']}};
modules.set('sequencer',{active:true});modules.set('JB2A_DnD5e',{active:true});
game.settings.get=(_m,k)=>k==='jb2aEnabled';
flags.jb2aFx={enabled:true,mode:'area',file:'jb2a.fire'};
flags.cast={enabled:true,shape:'circle',distance:1.1,resolution:'rf',fa:5};
dice=20;await resolveRequest(message());
assert.equal(visuals.length,1);assert.equal(visuals[0].length,1);
assert.deepEqual(visuals[0][0].atLocation,[{x:150,y:0}]);
assert(Math.abs(visuals[0][0].size[0].width-220)<0.001);
msg=message();msg.flags.castRequest.origin={x:5000,y:5000};await resolveRequest(msg);
assert.equal(visuals.length,2);assert.equal(msg.flags.castResults,undefined);
assert.deepEqual(visuals[1][0].atLocation,[{x:5000,y:5000}]);
flags.cast.shape='self';await assert.rejects(handleItemUse(item),/escolha círculo/);
// Só remove a solicitação após salvar o resumo final; falha de envio conserva o registro.
flags.jb2aFx.enabled=false;flags.cast={enabled:true,shape:'self',resolution:'none'};
let removed=false;msg=message();const previousSummaries=summaries.length;
msg.delete=async()=>{assert.equal(summaries.length,previousSummaries+1);removed=true;};
await resolveRequest(msg);assert(removed);assert.equal(msg.flags.castRequest.status,'done');
const createMessage=ChatMessage.create;ChatMessage.create=async()=>{throw Error('Envio indisponível');};
removed=false;msg=message();msg.delete=async()=>{removed=true;};await resolveRequest(msg);
assert(!removed);assert.equal(msg.flags.castRequest.status,'done');ChatMessage.create=createMessage;
// Filtra antes da resistência, dano e marcador; não depende de quem controla o token.
for(const side of [1,-1]) {
  source.document.disposition=side;first.document.disposition=side;second.document.disposition=-side;
  flags.cast={enabled:true,shape:'circle',distance:1.1,resolution:'none',damage:10,targetFilter:'allies'};
  msg=message();let before=damage.length;await resolveRequest(msg);
  assert.equal(damage.length,before+1);assert.equal(damage.at(-1).id,'a');
  assert.deepEqual(msg.flags.castResults.map(r=>r.actorUuid),[a.uuid]);
  flags.cast.targetFilter='excludeAllies';before=damage.length;await resolveRequest(message());
  assert.equal(damage.length,before+1);assert.equal(damage.at(-1).id,'b');
}
second.document.disposition=0;
assert(acceptsTarget(source,second,'excludeAllies'));assert(!acceptsTarget(source,second,'allies'));
flags.cast.shape='targets';msg=message();msg.flags.castRequest.targets=['first','second'];await resolveRequest(msg);
assert.deepEqual(msg.flags.castResults.map(r=>r.actorUuid),[b.uuid]);
source.document.disposition=0;const beforeInvalid=damage.length;
await assert.rejects(resolveRequest(message()),/Amigável ou Hostil/);assert.equal(damage.length,beforeInvalid);
flags.cast.targetFilter='all';assert(acceptsTarget(source,first,'all'));
flags.cast.shape='self';flags.cast.targetFilter='allies';await resolveRequest(message());
// Dois críticos: ataque + tabela por alvo, todos preservados antes do resumo.
const itemSrc=await readFile(root+'/modules/tagmarItem.js','utf8');
const nativeMethod=(name,next)=>itemSrc.slice(itemSrc.indexOf(`    async ${name}(`),itemSrc.indexOf(`    async ${next}(`)).replace(/let dadosColoridos = await import\([^;]+;/g,'let dadosColoridos = {};');
const CombatItem=new Function(`return class {${nativeMethod('combateToChat','combateToChatPlus')}${nativeMethod('combateToChatPlus','rollCombate')}}`)();
item.combateToChat=CombatItem.prototype.combateToChat;item.combateToChatPlus=CombatItem.prototype.combateToChatPlus;
item._chatActionButtons=()=>({button:'Aplicar 25% Dano',buttonC:''});
item.type='Combate';item.system.tipo='';item.system.descricao='Teste';item.system.municao=10;
game.settings.get=()=>false;
const critStart=sys.indexOf('async function rolarCritico(');
game.tagmar.rolarCritico=new Function(sys.slice(critStart,sys.indexOf('\ndocument.addEventListener',critStart))+';return rolarCritico;')();
Roll.prototype.toMessage=async function(data){await Promise.resolve();rollMessages.push(data);return {id:'roll'+rollMessages.length};};
flags.cast={enabled:true,shape:'circle',distance:1.1,resolution:'attack',targetFilter:'all'};
dice=20;const beforeCritical=rollMessages.length,beforeCriticalDamage=damage.length;
msg=message();await resolveRequest(msg);
assert.equal(damage.length,beforeCriticalDamage);
const cards=rollMessages.slice(beforeCritical);assert.equal(cards.length,4);
assert.match(cards[0].flavor,/Cinza - Crítico/);assert.match(cards[1].flavor,/Rolagem do Crítico/);
assert.match(cards[2].flavor,/Cinza - Crítico/);assert.match(cards[3].flavor,/Rolagem do Crítico/);
assert.match(cards[1].flavor,/Scene.s.Token.first/);assert.match(cards[3].flavor,/Scene.s.Token.second/);
assert(cards.every(c=>JSON.stringify(c.whisper)==='["gm","p"]'));
assert.equal(summaries.at(-1).rollCount,rollMessages.length);
assert(msg.flags.castResults.every(r=>r.criticalMessageId));
assert.match(summaries.at(-1).data.content,/resolução individual/);
assert.match(summaries.at(-1).data.content,/data-token-uuid="Scene.s.Token.first"/);
console.log('PASS: rotação, área, tabela nativa, RM/RF, dano por alvo, permissões, duração e visual único na área inclusive sem alvos ou com resistência bem-sucedida.');
