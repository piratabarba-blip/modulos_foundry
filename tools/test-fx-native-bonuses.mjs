import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {syncNativeBonuses} from '../tagmar-token-fx/scripts/native-bonuses.mjs';
import {calendarNow} from '../tagmar-token-fx/scripts/timers.mjs';
const utils=await import(pathToFileURL(process.env.TAGMAR_TEST_UTILS));
const template=JSON.parse(await readFile(process.env.TAGMAR_TEST_SYSTEM+'/template.json','utf8'));
const ID='tagmar-token-fx',docs=(a=[])=>Object.assign(a,{get(id){return this.find(e=>e.id===id);}});
const apply=(o,u)=>{for(const [path,v] of Object.entries(u)){const parts=path.split('.');let node=o;for(const k of parts.slice(0,-1))node=node[k]??={};node[parts.at(-1)]=structuredClone(v);}};
globalThis.game={system:{id:'tagmar_rpg'},settings:{get:()=>false},time:{worldTime:0},modules:new Map([['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:0})}}]])};
function document(data){return {...structuredClone(data),getFlag(s,k){return this.flags?.[s]?.[k];}};}
let id=0;
function actor(type='Personagem',points=true){const a={type,name:'Teste',system:structuredClone(template.Actor.templates.base),flags:{core:{sheetClass:points?'tagmar_rpg.tagmarAltSheet':'tagmar_rpg.tagmarActorSheet'}},items:docs(),effects:docs(),
 getFlag(s,k){return this.flags[s]?.[k];},async update(u){apply(this,u);},
 async createEmbeddedDocuments(kind,data){assert.equal(kind,'Item');const made=data.map(d=>document({...d,id:'i'+(++id)}));this.items.push(...made);return made;},
 async updateEmbeddedDocuments(kind,data){assert.equal(kind,'Item');for(const d of data){const item=this.items.get(d._id);assert(item);for(const [k,v] of Object.entries(d))if(k!=='_id')item[k]=structuredClone(v);}},
 async deleteEmbeddedDocuments(kind,ids){assert.equal(kind,'Item');this.items.splice(0,this.items.length,...this.items.filter(i=>!ids.includes(i.id)));}
};
 // Mesma restrição da coleção embutida no Actor real V14.
 Object.defineProperty(a,'items',{value:a.items,writable:false,configurable:false,enumerable:true});
 assert.throws(()=>new Proxy(a,{get:(_t,k)=>k==='items'?[]:a[k]}).items,TypeError);
 return a;
}
function marker(rows){return document({id:'e'+(++id),name:'Vigor',img:'icons/svg/aura.svg',disabled:false,flags:{[ID]:{spellTimer:{endsAt:calendarNow(game)+30,bonuses:rows}}}});}
for(const points of [true,false]){
 const a=actor('Personagem',points);Object.assign(a.system,{estagio:2});a.system.eh={value:20,max:20,bonusFis:0,deficitFis:0};
 a.items.push(document({id:'race',type:'Raca',name:'Humano',system:{ef_base:10,vb:18}}));
 a.system.carac_final={INT:10,AUR:10,CAR:10,FOR:10,FIS:10,AGI:10,PER:10};
 const e=marker([{attribute:'FOR',value:2},{attribute:'AGI',value:1},{attribute:'RFIS',value:3},{attribute:'DEF',value:1}]);a.effects.push(e);
 await syncNativeBonuses(a,utils);assert.equal(a.items.filter(i=>i.getFlag(ID,'spellBonus')).length,4);
 const forEffect=a.items.find(i=>i.system.atributo==='FOR');assert.equal(forEffect.system.valor,2);assert(forEffect.system.ativo);
 assert.equal(a.system.valor_teste.FOR,8);assert.equal(a.system.rf,5);assert.equal(a.system.d_ativa.valor,2);
 await syncNativeBonuses(a,utils);assert.equal(a.items.filter(i=>i.getFlag(ID,'spellBonus')).length,4);
 assert.equal(a.system.valor_teste.FOR,8); // Não acumula ao renovar/reconciliar.
 e.disabled=true;await syncNativeBonuses(a,utils);assert.equal(a.system.valor_teste.FOR,0);assert.equal(a.system.rf,2);assert.equal(a.system.d_ativa.valor,0);
 e.disabled=false;await syncNativeBonuses(a,utils);assert.equal(a.system.valor_teste.FOR,8);
 a.effects.length=0;await syncNativeBonuses(a,utils);assert.equal(a.items.filter(i=>i.getFlag(ID,'spellBonus')).length,0);assert.equal(a.system.valor_teste.FOR,0);
}
// Retomar depois de uma falha ocorrida após criar os itens, sem duplicá-los.
const interrupted=actor();interrupted.system.eh={value:20,max:20,bonusFis:0,deficitFis:0};
interrupted.effects.push(marker([{attribute:'FOR',value:2}]));
await assert.rejects(()=>syncNativeBonuses(interrupted,{...utils,_preparaEfeitosAtributos(){throw Error('interrompido');}}),/interrompido/);
assert.equal(interrupted.items.length,1);
await syncNativeBonuses(interrupted,utils);assert.equal(interrupted.items.length,1);assert.equal(interrupted.system.valor_teste.FOR,8);
const n=actor('NPC');n.system.atributos.FOR=3;n.system.rm=5;n.system.rf=4;n.system.vb=20;n.system.karma.max=10;
const e=marker([{attribute:'FOR',value:2},{attribute:'RMAG',value:3},{attribute:'DEF',value:2}]);n.effects.push(e);
await syncNativeBonuses(n,utils);assert.equal(n.system.atributos.FOR,5);assert.equal(n.system.valor_teste.FOR,20);assert.equal(n.system.rm,8);assert.equal(n.system.d_ativa.valor,2);
// Reabrir a ficha nativa de PNJ não apaga o bônus de defesa.
const npcUpdates={};utils._attDefesaNPC({document:{...n,defesas:[]},options:{editable:true}},npcUpdates);assert(!Object.hasOwn(npcUpdates,'system.d_ativa.valor'));
e.disabled=true;await syncNativeBonuses(n,utils);assert.equal(n.system.atributos.FOR,3);assert.equal(n.system.rm,5);assert.equal(n.system.d_ativa.valor,0);
n.effects.length=0;await syncNativeBonuses(n,utils);assert.equal(n.items.length,0);assert.equal(n.system.atributos.FOR,3);
console.log('PASS: bônus nativos por pontos/sorteio/PNJ, valores de teste, RF/RM, defesa, não acumular, desativar e remover.');
