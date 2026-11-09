import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {makeCalculator,clone} from '../scripts/rules-adapter.mjs';
import {catalogEntry} from '../scripts/provider.mjs';
import {sourceKey} from '../scripts/generator.mjs';
import {SIZES,NATURES,FOCUSES,newCreatureState,componentCatalog,generateNewCreature,editNewItem,newCreationData} from '../scripts/new-creature.mjs';
import {editCreature} from '../scripts/creature-ui.mjs';
import {GROUPS,creatureProfile,automaticCandidates} from '../scripts/creature-profiles.mjs';
const root=process.env.TAGMAR_TEST_SYSTEM??'C:/Users/PIRATA/AppData/Local/FoundryVTT/Data/systems/tagmar_rpg';
const calculator=makeCalculator(await import(pathToFileURL(root+'/modules/sheets/actorUtils.js')),JSON.parse(fs.readFileSync(root+'/template.json','utf8')));
const packs=JSON.parse(fs.readFileSync(process.env.TAGMAR_TEST_PACKS??'outputs/gerador-personagens-20261109/listas-ats/xxx-packs.json'));
const all=packs.flatMap(p=>{const pack={collection:p.collection,folders:new Map(p.folders.map(f=>[f._id,{...f,id:f._id}]))};return p.items.map(raw=>catalogEntry({...raw,id:raw._id,toObject:()=>clone(raw)},pack,p.realm,{includeCreatures:true})).filter(Boolean);});
const context={calculator,catalog:all.filter(i=>!i.creatureMaterial),creatureCatalog:all.filter(i=>i.creatureMaterial)},options=()=>({...newCreatureState().draft,variation:false});
test('catálogo separa material natural do catálogo normal de personagens',()=>{
 assert.equal(context.creatureCatalog.filter(i=>i.type==='Combate').length,54);assert.equal(context.creatureCatalog.filter(i=>i.type==='Defesa').length,23);
 assert.ok(context.creatureCatalog.some(i=>i.name==='Mordida'));assert.ok(componentCatalog(context).some(i=>i.type==='Habilidade'));
 assert.ok(context.catalog.every(i=>!i.creatureMaterial));
});
test('gera do zero todos os portes, naturezas e perfis, inclusive estágio zero e cinquenta',()=>{
 const untouched=JSON.stringify(context);
 for(const [size]of SIZES)for(const [nature]of NATURES)for(const [focus]of FOCUSES)for(const stage of [0,10,50]){
  const p=generateNewCreature({...options(),size,nature,focus,stage},null,context,()=>.5),a=p.actor,s=a.system;
  assert.equal(a.type,'NPC');assert.equal(s.estagio,stage);assert.equal(s.raca,'');assert.equal(s.profissao,'');assert.ok(a.items.some(i=>i.type==='Combate'));assert.ok(a.items.some(i=>i.type==='Defesa'));
  for(const k of ['ef','eh','karma']){assert.deepEqual(s[k],s[k+'_npc']);assert.equal(s[k].max,s[k].value);assert.ok(s[k].max>=0);}assert.equal(s.absorcao.max,s.absorcao.value);
  assert.deepEqual(calculator.calculateCreature(a),a);assert.equal(a.prototypeToken.actorLink,false);assert.equal(a.prototypeToken.bar1.attribute,'ef_npc');
  if(nature==='beast')assert.equal(s.atributos.INT,-7);
  if(nature!=='magical')assert.equal(s.karma.max,0);
 }assert.equal(JSON.stringify(context),untouched);
});
test('travas e edições preservam números, ataques, proteções e blocos sem acumular bônus',()=>{
 const d=options(),a=generateNewCreature(d,null,context,()=>.1),att=a.actor.items.find(i=>i.type==='Combate');
 const state={draft:d,preview:a,dirty:false};editCreature({creature:state,context},'eh',99);editCreature({creature:state,context},'attr:FOR',7);
 d.locks.attacks=true;d.locks.protection=true;d.locks.name=true;d.locks.attributes=true;
 const b=generateNewCreature({...d,stage:20,name:'Outro'},state.preview,context,()=>.9);assert.equal(b.actor.system.eh.max,99);assert.equal(b.actor.system.atributos.FOR,7);assert.equal(b.actor.name,a.actor.name);
 const col=p=>{const s=p.actor.items.find(i=>sourceKey(i)===sourceKey(att)).system;return s.def_l+s.nivel+s.custo;};
 // Coluna acompanha o atributo alterado, mas não aumenta de novo por estágio.
 assert.equal(col(b),col(state.preview));
 const c=generateNewCreature({...d,stage:30},b,context,()=>.7);assert.equal(col(c),col(b));
 assert.equal(c.actor.items.find(i=>i.type==='Defesa').system.absorcao,a.actor.items.find(i=>i.type==='Defesa').system.absorcao);
});
test('adiciona, ajusta e remove componentes em cópias, com dano e defesa nativos',()=>{
 const a=generateNewCreature(options(),null,context,()=>.5),catalog=componentCatalog(context),entry=catalog.find(i=>i.type==='Combate'&&!a.actor.items.some(x=>sourceKey(x)===i.key));
 const b=editNewItem(a,context,{action:'add',key:entry.key}),c=editNewItem(b,context,{action:'edit',key:entry.key,field:'damage',value:40});assert.equal(c.actor.items.find(i=>sourceKey(i)===entry.key).system.dano_base.d100,40);
 assert.equal(a.actor.items.length+1,b.actor.items.length);assert.throws(()=>editNewItem(b,context,{action:'add',key:entry.key}));assert.throws(()=>editNewItem(a,context,{action:'add',key:'foreign'}));
 const power=catalog.find(i=>i.type==='Magia'),d=editNewItem(c,context,{action:'add',key:power.key}),e=editNewItem(d,context,{action:'edit',key:power.key,field:'level',value:4});assert.equal(e.actor.items.find(i=>sourceKey(i)===power.key).system.nivel,4);
 assert.equal(editNewItem(e,context,{action:'remove',key:power.key}).actor.items.length,c.actor.items.length);
 assert.deepEqual(calculator.calculateCreature(c.actor),c.actor);
});
test('criação renova IDs, mantém uma origem própria e escapa nome e descrição',()=>{
 const p=generateNewCreature({...options(),name:'Bicho <teste>',description:'<script>alert(1)</script>'},null,context,()=>.5),a=newCreationData(p),b=newCreationData(p);
 assert.ok(a.flags['tagmar-personagens'].newCreature.extraofficial);assert.equal(a.flags['tagmar-personagens'].creatureVariant,undefined);assert.equal(a._id,undefined);assert.notEqual(a.items[0]._id,b.items[0]._id);assert.equal(a.prototypeToken.name,'Bicho <teste>');assert.ok(a.system.descricao.includes('&lt;script&gt;'));assert.ok(!a.system.descricao.includes('<script>'));
 assert.throws(()=>generateNewCreature({...options(),stage:100},null,context));assert.throws(()=>generateNewCreature({...options(),img:'javascript:alert(1)'},null,context));
});

test('19 grupos têm sugestões editáveis e magia é independente do intelecto',()=>{
 assert.equal(GROUPS.length,19);
 for(const [group]of GROUPS){
  const p=generateNewCreature({...options(),group,nature:'auto'},null,context,()=>.5);
  assert.equal(p.choices.group,group);assert.deepEqual(calculator.calculateCreature(p.actor),p.actor);
  if(p.choices.intellect==='beast')assert.equal(p.actor.system.atributos.INT,-7);
 }
 const p=generateNewCreature({...options(),group:'AD',nature:'auto',intelligence:'beast',magic:'yes'},null,context,()=>.5);
 assert.equal(p.actor.system.atributos.INT,-7);assert.ok(p.actor.system.karma.max>0);assert.ok(p.actor.items.some(i=>i.type==='Magia'));
 assert.equal(creatureProfile({...options(),group:'RC',nature:'auto'}).usesTools,true);
 assert.throws(()=>generateNewCreature({...options(),group:'inventado'},null,context));
});

test('escolhas manuais completam com sugestões, modos vazios e quantidades são respeitados',()=>{
 const catalog=componentCatalog(context),manual=catalog.find(i=>i.type==='Combate'&&!i.creatureMaterial&&i.folders[0].startsWith('04'));
 const d={...options(),picks:{attacks:[manual.key]},counts:{attacks:3},modes:{skills:'none',powers:'none',techniques:'none',gear:'none'}};
 const p=generateNewCreature(d,null,context,()=>.5),att=p.actor.items.filter(i=>i.type==='Combate');
 assert.equal(att.length,3);assert.ok(att.some(i=>sourceKey(i)===manual.key));assert.equal(new Set(att.map(i=>i.name)).size,3);
 assert.equal(p.actor.items.some(i=>['Magia','Habilidade','Tecnica_Combate','Pertence'].includes(i.type)),false);
 const chosen=generateNewCreature({...d,modes:{...d.modes,attacks:'chosen'}},null,context,()=>.5);assert.equal(chosen.actor.items.filter(i=>i.type==='Combate').length,1);
 const empty=generateNewCreature({...d,modes:{...d.modes,attacks:'none',protection:'none'}},null,context,()=>.5);assert.equal(empty.actor.items.length,0);assert.equal(empty.actor.system.absorcao.max,0);
 assert.throws(()=>generateNewCreature({...d,counts:{attacks:21}},null,context));assert.throws(()=>generateNewCreature({...d,picks:{attacks:['foreign']}},null,context));
});

test('sorteios respeitam corpo, magia e equipamentos; material comum conserva dados base',()=>{
 const catalog=componentCatalog(context),check=(d)=>{const p=generateNewCreature({...options(),nature:'auto',...d},null,context,()=>.5),auto=automaticCandidates(catalog,p.choices,p.actor.system.atributos);for(const i of p.actor.items)assert.ok(auto[{'Combate':'attacks','Defesa':'protection','Habilidade':'skills','Tecnica_Combate':'techniques','Magia':'powers','Pertence':'gear'}[i.type]].some(e=>e.key===sourceKey(i)));return p;};
 const animal=check({group:'AD'});assert.equal(animal.actor.items.some(i=>['Magia','Pertence'].includes(i.type)),false);assert.ok(animal.actor.items.filter(i=>i.type==='Combate').every(i=>catalog.find(e=>e.key===sourceKey(i)).creatureMaterial));
 const plant=check({group:'CV'});assert.ok(plant.actor.items.filter(i=>i.type==='Combate').every(i=>['Espinhos','Agarrar','Esmagar'].includes(i.name)));assert.ok(plant.actor.items.some(i=>i.type==='Defesa'&&i.name.startsWith('Casca')));
 const armed=check({group:'RC'});assert.ok(armed.actor.items.some(i=>i.type==='Pertence'));assert.ok(armed.actor.items.filter(i=>i.type==='Combate').every(i=>!catalog.find(e=>e.key===sourceKey(i)).creatureMaterial));
 for(const i of armed.actor.items){const source=catalog.find(e=>e.key===sourceKey(i));if(i.type==='Combate')assert.deepEqual(i.system.dano_base,source.system.dano_base);if(i.type==='Defesa')assert.equal(i.system.absorcao,Number(source.system.absorcao)||0);if(i.type==='Pertence')assert.equal(i.system.quant,1);}
 const dragon=check({group:'DR',element:'ice',intelligence:'beast'});assert.equal(dragon.actor.system.atributos.INT,-7);assert.ok(dragon.actor.items.some(i=>i.type==='Magia'));assert.equal(dragon.actor.items.some(i=>i.type==='Pertence'),false);
});

test('completar novamente conserva somente travas e escolhas, sem congelar o resto',()=>{
 const d={...options(),variation:true,group:'RC',nature:'auto'},a=generateNewCreature(d,null,context,()=>.1),att=a.actor.items.find(i=>i.type==='Combate'),key=sourceKey(att);
 d.locks['item:'+key]=true;
 const b=generateNewCreature({...d,stage:15},a,context,()=>.9);assert.equal(b.actor.items.filter(i=>sourceKey(i)===key).length,1);
 const i=b.actor.items.find(i=>sourceKey(i)===key);assert.deepEqual(i.system.dano_base,att.system.dano_base);assert.equal(i.system.def_l+i.system.nivel+i.system.custo,att.system.def_l+att.system.nivel+att.system.custo+Number(b.actor.system.atributos[att.system.bonus]??0)-Number(a.actor.system.atributos[att.system.bonus]??0));
 const empty=generateNewCreature({...d,modes:{attacks:'none'}},b,context,()=>.5);assert.equal(empty.actor.items.some(i=>i.type==='Combate'),false);
 const excluded=generateNewCreature({...d,locks:{},excluded:[key]},b,context,()=>.1);assert.equal(excluded.actor.items.some(i=>sourceKey(i)===key),false);
});
