import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {makeCalculator,clone} from '../scripts/rules-adapter.mjs';
import {prepareCreature,generateCreature,creatureCreationData} from '../scripts/creatures.mjs';
import {creaturePacks,creatureIndex,loadCreature} from '../scripts/provider.mjs';
const root=process.env.TAGMAR_TEST_SYSTEM??'C:/Users/PIRATA/AppData/Local/FoundryVTT/Data/systems/tagmar_rpg';
const calculator=makeCalculator(await import(pathToFileURL(root+'/modules/sheets/actorUtils.js')),JSON.parse(fs.readFileSync(root+'/template.json','utf8')));
const actors=JSON.parse(fs.readFileSync(process.env.TAGMAR_CREATURES??'outputs/criaturas-variantes-20261109/xxx-creatures.json'));
const source=a=>prepareCreature({actor:a,uuid:`Compendium.active.criaturas-t3er.Actor.${a._id}`,packLabel:'Criaturas'},calculator);
const wolf=source(actors.find(a=>a.name==='Lobo Beta'));
const run=(options={},previous=null,s=wolf)=>generateCreature(s,{factor:150,...options},previous,calculator,()=>.5);
test('todas as 414 criaturas geram cópias fracas, base e fortes sem mutar as fontes',()=>{
 assert.equal(actors.length,414);const before=JSON.stringify(actors);
 for(const raw of actors){const s=source(raw);for(const factor of [50,100,150]){const p=run({factor},null,s);assert.equal(p.actor.type,'NPC');assert.equal(p.actor.items.length,raw.items.length);assert.deepEqual(p.actor.system.atributos,s.actor.system.atributos);assert.equal(p.actor.prototypeToken.width,raw.prototypeToken.width);for(const k of ['ef','eh','karma']){assert.deepEqual(p.actor.system[k],p.actor.system[k+'_npc']);assert.equal(p.actor.system[k].value,p.actor.system[k].max);if(!s.actor.system[k].max)assert.equal(p.actor.system[k].max,0);}
  assert.deepEqual(calculator.calculateCreature(p.actor),p.actor,`${raw.name}: cálculo muda ao reabrir`);
  if(factor===100){for(const k of ['ef','eh','karma','rm','rf','moral','estagio'])assert.deepEqual(p.actor.system[k],s.actor.system[k],`${raw.name} ${k}`);for(const i of p.actor.items)assert.deepEqual(i.system,s.actor.items.find(x=>x._id===i._id).system,`${raw.name} ${i.name}`);}
 }}assert.equal(JSON.stringify(actors),before);
});
test('potência atua nos recursos e ataques; atributos instintivos, movimentos e magias ficam',()=>{
 const weak=run({factor:50}),strong=run({factor:200});assert.ok(weak.actor.system.ef.max<wolf.actor.system.ef.max);assert.ok(strong.actor.system.eh.max>wolf.actor.system.eh.max);assert.equal(strong.actor.system.atributos.INT,-7);
 const attack=a=>a.items.find(i=>i.type==='Combate');assert.ok(attack(strong.actor).system.nivel>attack(weak.actor).system.nivel);assert.ok(attack(strong.actor).system.dano.d100>attack(weak.actor).system.dano.d100);
 assert.equal(strong.actor.system.vb,wolf.actor.system.vb);assert.deepEqual(strong.actor.items.filter(i=>i.type==='Magia'),weak.actor.items.filter(i=>i.type==='Magia'));
});
test('travas conservam recursos, blocos e coluna de ataque em vários sorteios sem acumular',()=>{
 const a=run(),item=a.actor.items.find(i=>i.type==='Combate');const opts={factor:250,locks:{resources:true,stage:true,attacks:true,protection:true,skills:true,powers:true,attributes:true,movement:true,name:true}};
 const b=run(opts,a);assert.equal(b.actor.name,a.actor.name);assert.deepEqual(b.actor.system.ef,a.actor.system.ef);assert.deepEqual(b.actor.items,a.actor.items);assert.equal(b.actor.system.estagio,a.actor.system.estagio);
 const lock={['item:'+item._id]:true};const c=run({factor:250,locks:lock},a),d=run({factor:300,locks:lock},c);
 const col=x=>{const s=x.items.find(i=>i._id===item._id).system;return s.def_l+s.nivel+s.custo;};assert.equal(col(a.actor),col(c.actor));assert.equal(col(c.actor),col(d.actor));
 assert.deepEqual(run({factor:150},b).actor,run({factor:150}).actor);
});
test('nova origem ignora travas antigas; criação renova IDs e limpa estados de campanha',()=>{
 const p=run(),raw=clone(p);raw.actor.flags.other={secret:'campanha'};raw.actor.prototypeToken.flags={other:{secret:true}};raw.actor.effects=[{_id:'active'}];
 const a=creatureCreationData(raw),b=creatureCreationData(raw);assert.equal(a._id,undefined);assert.notEqual(a.items[0]._id,b.items[0]._id);assert.equal(a.flags.other,undefined);assert.deepEqual(a.effects,[]);assert.equal(a.prototypeToken.flags,undefined);assert.equal(a.prototypeToken.actorLink,false);assert.equal(a.prototypeToken.bar1.attribute,'ef_npc');assert.ok(a.system.descricao.includes('Adaptação extraoficial'));assert.ok(a.flags['tagmar-personagens'].creatureVariant.sourceUuid);
 const other=source(actors.find(a=>a.name==='Dragão do Gelo Adulto'));assert.equal(run({factor:100,locks:{resources:true}},p,other).actor.system.ef.max,other.actor.system.ef.max);
 assert.throws(()=>run({factor:NaN}));assert.throws(()=>run({factor:500}));
});
test('fonte com EF negativa aparece para revisão e não cria ator com recurso inválido',()=>{
 const s=source(actors.find(a=>a.name==='Fada')),p=run({factor:100},null,s);assert.equal(p.actor.system.ef.max,-1);assert.ok(p.warnings.some(x=>x.includes('EF máxima -1')));assert.throws(()=>creatureCreationData(p),/EF/);
 p.actor.system.ef.value=p.actor.system.ef.max=8;p.actor.system.ef_npc=clone(p.actor.system.ef);assert.equal(creatureCreationData(p).system.ef.max,8);
});
test('catálogo consulta somente índices e uma criatura escolhida, sem ler banco inteiro nem outro sistema',async()=>{
 let indices=0,docs=0;const key='tagmar_rpg.criaturas-t3er';globalThis.game={user:{isGM:true},system:{id:'tagmar_rpg'},packs:new Map([[key,{documentName:'Actor',collection:key,metadata:{label:'Criaturas'},getIndex:async()=>{indices++;return new Map([['wolf',{_id:'wolf',type:'NPC',name:'Lobo',system:{estagio:2}}],['troop',{_id:'troop',type:'Tropa',name:'Exército'}]]);},getDocument:async()=>{docs++;return {type:'NPC',id:'wolf',toObject:()=>clone(wolf.actor)};}}],['tagmar3er-oficial.criaturas-t3er',{documentName:'Actor',collection:'tagmar3er-oficial.criaturas-t3er'}]])};
 assert.equal(creaturePacks().length,1);assert.equal((await creatureIndex(key)).length,1);await creatureIndex(key);assert.equal(indices,1);assert.equal(docs,0);await loadCreature(key,'wolf');assert.equal(docs,1);await assert.rejects(()=>loadCreature('tagmar3er-oficial.criaturas-t3er','wolf'));game.user.isGM=false;await assert.rejects(()=>loadCreature(key,'wolf'));
});
