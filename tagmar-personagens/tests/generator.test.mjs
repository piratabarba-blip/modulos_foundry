import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {makeCalculator,clone,ATTRS} from '../scripts/rules-adapter.mjs';
import {generate,creationData,eligible,availableItems,sourceKey} from '../scripts/generator.mjs';
import {compatibleProfession} from '../scripts/compatibility.mjs';
import {KITS} from '../scripts/kits.mjs';
import {catalogEntry,combineProfessionOptions} from '../scripts/provider.mjs';
const systemRoot=process.env.TAGMAR_TEST_SYSTEM??'C:/Users/PIRATA/AppData/Local/FoundryVTT/Data/systems/tagmar_rpg';
const calculator=makeCalculator(await import(pathToFileURL(systemRoot+'/modules/sheets/actorUtils.js')),JSON.parse(fs.readFileSync(systemRoot+'/template.json','utf8')));
const packsPath=process.env.TAGMAR_TEST_PACKS;
let catalog;
if(packsPath){const packs=JSON.parse(fs.readFileSync(packsPath));catalog=packs.flatMap(p=>{
 const folders=new Map(p.folders.map(f=>[f._id,{...f,id:f._id}])),pack={collection:p.collection,folders};
 return p.items.map(raw=>catalogEntry({...raw,id:raw._id,toObject:()=>clone(raw)},pack,p.realm)).filter(Boolean);
});}else catalog=JSON.parse(fs.readFileSync(new URL('../../../editor-fichas-tagmar/vendor/catalogo-tagmar.json',import.meta.url))).map((i,n)=>({...i,key:String(n),realm:i.source==='Criação de Fichas'?'reinos':'terras',img:i.imgXXX}));
catalog=combineProfessionOptions(catalog);
const type=(t,name)=>catalog.find(i=>i.type===t&&i.name===name),context={catalog,calculator,systemId:systemRoot.endsWith('tagmar_rpg')?'tagmar_rpg':'tagmar3er-oficial'};
function seeded(n){return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
const options=(name='Mago',stage=10)=>({type:'Personagem',race:type('Raca','Humano').key,profession:type('Profissao',name).key,stage,specialization:name==='Mago'?'Colégio Elemental':'',distribution:'profession',ehMode:'roll',locks:{}});
const run=(opts=options(),prev=null,seed=123)=>generate(opts,prev,{...context,rng:seeded(seed)});
test('catálogo real contém origens e caminhos de magia, sem conteúdo de criaturas',()=>{assert.ok(catalog.length>1000);assert.ok(catalog.some(i=>i.type==='Magia'&&i.folders.length>=3));assert.ok(catalog.some(i=>i.type==='Combate'&&/^04/.test(i.folders[0])));});
test('pontos, limites, valores iniciais e estágio coerentes para todas as profissões (1, 10 e 20)',()=>{
 for(const name of [...new Set(catalog.filter(i=>i.type==='Profissao').map(i=>i.name))])for(const stage of [1,10,20]){
  const before=clone(options(name,stage)),r=run(before),s=r.actor.system;
  assert.deepEqual(before,options(name,stage));assert.equal(s.estagio,stage);
  for(const k of ['pontos_aqui','pontos_mag','pontos_comb','pontos_tec'])assert.ok(s[k]>=0,`${name} ${stage} ${k}`);
  assert.ok(calculator.attributeBalance(r.actor)>=0);for(const k of ['ef','eh','karma','absorcao'])assert.equal(s[k].value,s[k].max);
  assert.ok(s.rm>=stage);assert.equal(s.rf,stage+s.atributos.FIS);assert.equal(s.ef.max,type('Raca','Humano').system.ef_base+s.atributos.FIS+s.atributos.FOR);
  assert.equal(s.pontos_estagio.value,calculator.xpForStage(stage));assert.ok(s.pontos_estagio.next>s.pontos_estagio.value);
 }
});
test('EH usa cada d10 e Físico por estágio; média ponderada tem resultado conferível',()=>{
 const r=run(options('Guerreiro',10)),prof=type('Profissao','Guerreiro').system,table=prof.lista_eh;
 const gains=r.ehRolls.map(v=>Number(table[v<=2?'v1':v<=5?'v2':v<=8?'v3':'v4']));
 assert.equal(r.actor.system.eh.max,prof.eh_base+gains.reduce((a,b)=>a+b,0)+r.actor.system.atributos.FIS*10);
 const avg=run({...options('Guerreiro',10),ehMode:'average'});assert.equal(avg.actor.system.eh.max,Math.round(prof.eh_base+9*(table.v1*.2+table.v2*.3+table.v3*.3+table.v4*.2)+avg.actor.system.atributos.FIS*10));
});
test('PNJ tem recursos próprios da ficha NPC e cálculo idêntico ao personagem',()=>{
 const a=run(),b=run({...options(),type:'NPC'});assert.equal(b.actor.type,'NPC');
 for(const k of ['ef','eh','karma']){assert.deepEqual(b.actor.system[k+'_npc'],a.actor.system[k]);}
 assert.equal(b.actor.prototypeToken.actorLink,false);assert.equal(b.actor.prototypeToken.bar1.attribute,'ef_npc');assert.equal(a.actor.prototypeToken.actorLink,true);
});
test('travas preservam raça, profissão, nome, atributos, dados EH, níveis e equipamentos',()=>{
 const a=run({...options(),name:'Tristan'}),sp=a.actor.items.find(i=>i.type==='Magia'),at='INT';
 const locks={race:true,profession:true,name:true,stage:true,specialization:true,eh:true,equipment:true,skills:true,groups:true,['attr:'+at]:true,['item:'+sourceKey(sp)]:true};
 const b=run({...options(),race:'random',profession:'random',name:'Outra',stage:1,locks},a,555);
 for(const key of ['race','profession','stage','specialization'])assert.equal(b.choices[key],a.choices[key]);
 assert.equal(b.actor.name,a.actor.name);assert.equal(b.actor.system.atributos.INT,a.actor.system.atributos.INT);assert.deepEqual(b.ehRolls,a.ehRolls);
 assert.equal(b.actor.items.find(i=>sourceKey(i)===sourceKey(sp)).system.nivel,sp.system.nivel);
 assert.deepEqual(b.actor.items.filter(i=>['Defesa','Combate'].includes(i.type)).map(sourceKey),a.actor.items.filter(i=>['Defesa','Combate'].includes(i.type)).map(sourceKey));
 assert.deepEqual(b.actor.system.grupos,a.actor.system.grupos);
});
test('conflitos de orçamento e de profissão não apagam a prévia anterior',()=>{
 const a=run(),before=clone(a),sp=a.actor.items.find(i=>i.type==='Magia');
 assert.throws(()=>run({...options(),profession:type('Profissao','Guerreiro').key,specialization:'',locks:{['item:'+sourceKey(sp)]:true}},a),/travado/);
 assert.throws(()=>run({...options(),attributes:Object.fromEntries(ATTRS.map(x=>[x,10])),locks:Object.fromEntries(ATTRS.map(x=>['attr:'+x,true]))},a),/ultrapassam/);
 assert.deepEqual(a,before);
 assert.throws(()=>run({...options(),stage:1,locks:{eh:true}},a),/EH/);
});
test('especialização filtra magias, exclui ancestrais/perdidas; sem escola só básicas',()=>{
 const r=run(),prof=type('Profissao','Mago');
 for(const i of r.actor.items.filter(i=>i.type==='Magia')){const src=catalog.find(x=>x.key===sourceKey(i));assert.ok(eligible(src,prof,'Colégio Elemental'));assert.ok(/^07/.test(src.folders[0]));}
 assert.ok(r.actor.items.some(i=>i.type==='Magia')); 
 const basic=run({...options(),specialization:''});assert.ok(basic.actor.items.filter(i=>i.type==='Magia').every(i=>/b[áa]sic/i.test(catalog.find(x=>x.key===sourceKey(i)).folders.at(-1))));
});
test('ficha por pontos é estável ao reabrir e recalcular',()=>{
 const r=run(),again=calculator.calculate(r.actor);assert.deepEqual(again,r.actor);
 for(const x of r.actor.items.filter(i=>i.type==='Habilidade'))assert.equal(x.system.total,x.system.nivel>0?r.actor.system.atributos[x.system.ajuste.atributo]+x.system.nivel+x.system.bonus+x.system.penalidade:-7);
});
test('criar não sobrescreve um ator: IDs de itens novos e entrada intacta',()=>{
 const r=run(),before=clone(r),a=creationData(r,context),b=creationData(r,context);
 assert.ok(!a._id);assert.ok(a.items.every((i,n)=>i._id!==r.actor.items[n]._id&&i._id!==b.items[n]._id));assert.deepEqual(r,before);
 assert.throws(()=>creationData(r,{...context,systemId:'outro'}),/outro sistema/);
});
test('fontes de automação de terceiros não entram nos atores gerados',()=>{
 const modified=catalog.map(clone);modified.forEach(x=>{x.effects=[{changes:[{key:'malicioso',value:5}]}];x.flags={world:{script:'throw 1'}};});
 const r=generate(options(),null,{...context,catalog:modified,rng:seeded(1)});assert.ok(r.actor.items.every(i=>i.effects.length===0&&!i.flags.world));
});
test('várias raças e sementes mantêm os pontos e as travas possíveis',()=>{
 for(const race of catalog.filter(i=>i.type==='Raca'))for(let seed=1;seed<=3;seed++){
  const r=run({...options('Guerreiro',seed===1?1:20),race:race.key},null,seed);assert.ok(calculator.attributeBalance(r.actor)>=0);assert.ok(r.actor.system.atributos.INT>=race.system.mod_racial.INT);
 }
});


test('identidade sugerida fica na ficha e os cadeados preservam ajustes narrativos',()=>{
 const a=run(options('Guerreiro'));assert.equal(a.actor.system.classe_social,'Livre');
 assert.ok(a.actor.system.idade>=18);assert.ok(a.actor.system.peso>0);assert.ok(Number(a.actor.system.altura.replace(',','.'))>0);
 const opts={...options('Guerreiro'),identity:{altura:'1,88',peso:82,idade:33,deus:'Blator'},locks:Object.fromEntries(['altura','peso','idade','deus'].map(k=>['identity:'+k,true]))};
 const b=run(opts,a,987);for(const [k,v]of Object.entries(opts.identity))assert.equal(b.actor.system[k],v);
 assert.equal(creationData(b,context).system.altura,'1,88');
});
test('ordem sacerdotal segue o deus e conflitos não são corrigidos silenciosamente',()=>{
 for(const deity of ['Blator','Ganis','Lena','Cruine','Palier']){
  const r=run({...options('Sacerdote'),specialization:'random',identity:{deus:deity},locks:{'identity:deus':true}},null,14);
  assert.equal(r.actor.system.deus,deity);assert.ok(r.actor.system.especializacao.includes(deity));
 }
 const a=run({...options('Sacerdote'),specialization:'A Ordem de Ganis'});assert.equal(a.actor.system.deus,'Ganis');
 assert.throws(()=>run({...options('Sacerdote'),specialization:'A Ordem de Ganis',identity:{deus:'Lena'},locks:{'identity:deus':true}}),/não correspondem/);
});
test('especializações das Terras Selvagens são acrescentadas sem trocar parâmetros da profissão',()=>{
 const warrior=type('Profissao','Guerreiro');assert.ok(warrior.system.especializacoes.includes('Duelistas'));
 assert.ok(warrior.system.especializacoes.includes('Guardas'));assert.ok(type('Profissao','Ladino').system.especializacoes.includes('Trapaceiros'));
});
if(catalog.some(i=>i.type==='Tecnica_Combate'&&i.folders.includes('Berserker'))){
 test('listas ATS respeitam profissão, custos próprios e precedência da especialização',()=>{
  for(const name of ['Berserker','Feiticeiro']){const list=availableItems(catalog,type('Profissao',name),'','Tecnica_Combate');assert.equal(list.length,12);assert.ok(!list.some(i=>i.name==='Ambidestria'));const r=run(options(name));assert.ok(r.actor.items.some(i=>i.type==='Tecnica_Combate'));}
  const basic=availableItems(catalog,type('Profissao','Guerreiro'),'','Tecnica_Combate');
  const duelist=availableItems(catalog,type('Profissao','Guerreiro'),'Academia dos Duelistas','Tecnica_Combate');
  assert.equal(basic.find(i=>i.name==='Desviar').system.custo,2);assert.equal(duelist.find(i=>i.name==='Desviar').system.custo,1);
  assert.ok(!availableItems(catalog,type('Profissao','Mago'),'','Tecnica_Combate').some(i=>i.name==='Acurar'));
 });
}


test('restrições raciais impedem combinações proibidas e sorteios escolhem pares válidos',()=>{
 const cases=[['Elfo Sombrio','Sacerdote'],['Elfo Sombrio','Feiticeiro'],['Elfo Sombrio','Berserker'],['Anão','Mago'],['Anão','Bardo'],['Anão','Feiticeiro'],['Pequenino','Rastreador'],['Goura','Sacerdote'],['Napói','Mago'],['Sekbete','Bardo'],['Elfo Dourado','Berserker']];
 for(const [race,prof] of cases)assert.throws(()=>run({...options(prof),race:type('Raca',race).key,specialization:''}),/não é permitida/);
 for(const race of catalog.filter(i=>i.type==='Raca')){
  const r=run({...options(),race:race.key,profession:'random',specialization:'random'});
  assert.ok(compatibleProfession(race,type('Profissao',r.actor.system.profissao)));
 }
 for(const profession of catalog.filter(i=>i.type==='Profissao')){
  const r=run({...options(),race:'random',profession:profession.key,specialization:'random'});
  assert.ok(compatibleProfession(type('Raca',r.actor.system.raca),profession));
 }
 for(let seed=1;seed<=20;seed++){
  const r=run({...options(),race:'random',profession:'random',specialization:'random'},null,seed);
  assert.ok(compatibleProfession(type('Raca',r.actor.system.raca),type('Profissao',r.actor.system.profissao)));
 }
 const original=run(),changed=clone(original);changed.choices.race=type('Raca','Anão').key;
 assert.throws(()=>creationData(changed,context),/não é permitida/);
});

test('mago sombrio restringe colégio e mantém travas sem substituir escolhas explícitas',()=>{
 const opts={...options(),race:type('Raca','Elfo Sombrio').key,specialization:'random'};
 const r=run(opts);assert.equal(r.actor.system.especializacao,'Colégio Sombrio');
 assert.throws(()=>run({...opts,specialization:'Colégio Elemental'}),/especialização|Sombrio/);
 const keep=run(options());assert.throws(()=>run({...opts,locks:{specialization:true}},keep),/especialização|Sombrio/);
 assert.equal(run({...opts,specialization:''}).actor.system.especializacao,'');
});

test('magias priorizam nível máximo até o estágio e preservam um nível individual travado',()=>{
 for(const name of ['Mago','Sacerdote','Bardo','Rastreador','Feiticeiro'])for(const stage of [1,10,20]){
  const r=run({...options(name,stage),specialization:'random'}),spells=r.actor.items.filter(i=>i.type==='Magia');
  assert.ok(spells.length);assert.ok(spells.some(i=>i.system.nivel===stage));
  // Uma magia incompleta só sobra quando os pontos restantes não compram mais seu próximo nível.
  for(const sp of spells){assert.ok(sp.system.nivel<=stage);if(sp.system.nivel<stage)assert.ok(r.actor.system.pontos_mag<Number(sp.system.custo));}
 }
 const a=run(),sp=a.actor.items.find(i=>i.type==='Magia');sp.system.nivel=2;a.actor=calculator.calculate(a.actor);
 const b=run({...options(),locks:{['item:'+sourceKey(sp)]:true}},a,44);
 assert.equal(b.actor.items.find(i=>sourceKey(i)===sourceKey(sp)).system.nivel,2);
});

test('kits usam os pertences do sistema e a carga corresponde às quantidades e pesos',()=>{
 for(const kit of KITS){
  const r=run({...options(),kit:kit.key}),items=r.actor.items.filter(i=>i.type==='Pertence');
  assert.equal(items.length,kit.items.length);
  for(const [name,quant] of kit.items){const item=items.find(i=>i.name===name);assert.ok(item,name);assert.equal(item.system.quant,quant);assert.equal(item.system.inTransport,false);}
  const weight=items.reduce((sum,i)=>sum+i.system.quant*i.system.peso,0);
  assert.ok(Math.abs(r.actor.system.carga.value-weight)<1e-8);
 }
 const a=run({...options(),kit:'journey'}),b=run({...options(),kit:'none',locks:{equipment:true}},a,77);
 assert.deepEqual(b.actor.items.filter(i=>i.type==='Pertence'),a.actor.items.filter(i=>i.type==='Pertence'));
 const item=a.actor.items.find(i=>i.type==='Pertence'),c=run({...options(),kit:'journey',locks:{['item:'+sourceKey(item)]:true}},a,78);
 assert.equal(c.actor.items.filter(i=>sourceKey(i)===sourceKey(item)).length,1);
});
