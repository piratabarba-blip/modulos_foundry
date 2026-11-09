import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {consumeTemporaryEH,syncTemporaryEH,temporaryResourceRemaining,wrapEHHealing} from '../tagmar-token-fx/scripts/temporary-eh.mjs';
import {castConfiguration,adjustmentFor} from '../tagmar-token-fx/scripts/cast-rules.mjs';
import {applyMarker,expireMarkers} from '../tagmar-token-fx/scripts/casts.mjs';
import {bonusEntries} from '../tagmar-token-fx/scripts/bonus-rules.mjs';
const ID='tagmar-token-fx';
const docs=(rows=[])=>Object.assign(rows,{get(id){return this.find(e=>e.id===id);}});
const set=(object,changes)=>{for(const [path,value] of Object.entries(changes)){const keys=path.split('.');let node=object;for(const k of keys.slice(0,-1))node=node[k]??={};node[keys.at(-1)]=structuredClone(value);}};
const source=await readFile(process.env.TAGMAR_TEST_SYSTEM+'/modules/tagmarActor.js','utf8');
const start=source.indexOf('    async _aplicarDano('),end=source.indexOf('    _rollTeste(',start);
const Native=new Function('return class {'+source.slice(start,end)+'}')();
wrapEHHealing(Native.prototype);
globalThis.ui={notifications:{info(){}}};globalThis.canvas={interface:{createScrollingText(){}}};
globalThis.game={users:docs([{id:'gm',active:true,isGM:true}]),user:{id:'gm',isGM:true},time:{worldTime:0},
  actors:docs(),scenes:docs(),modules:new Map([['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:0})}}]])};
let sequence=0;
function actor(type='Personagem'){
  const a=new Native();Object.assign(a,{id:'a'+(++sequence),type,name:'Teste',uuid:'Actor.'+sequence,flags:{},effects:docs(),items:docs(),
    system:{eh:{value:20,max:20,bonusFis:0,deficitFis:0},ef:{value:15,max:15},eh_npc:{value:20,max:20},ef_npc:{value:15,max:15},absorcao:{value:0,max:0},v_base:0},
    getFlag(scope,key){return this.flags[scope]?.[key];},
    async update(changes,options={}){consumeTemporaryEH(this,changes,options);set(this,changes);return this;},
    async createEmbeddedDocuments(kind,rows){assert.equal(kind,'ActiveEffect');return rows.map(row=>{const e={...structuredClone(row),id:'e'+(++sequence),parent:this,
      getFlag(scope,key){return this.flags?.[scope]?.[key];},async update(changes){set(this,changes);await syncTemporaryEH(this.parent);},async delete(){this.parent.effects.splice(this.parent.effects.indexOf(this),1);await syncTemporaryEH(this.parent);}};this.effects.push(e);return e;});}
  });game.actors.push(a);return a;
}
const token={center:{x:0,y:0},document:{}};
const item={name:'Vigor',uuid:'Actor.caster.Item.vigor',img:'icons/svg/aura.svg'};
const configuration=(rows,extra={})=>castConfiguration({getFlag:(_s,k)=>k==='cast'?{enabled:true,useType:'targets',shape:'targets',resolution:'none',resourceMode:'bonuses',bonuses:rows,duration:2,unit:'rounds',...extra}:undefined});
const config=configuration([{attribute:'EH',value:10},{attribute:'EF',value:5}],{damage:99,resistedDamage:100});
assert.equal(config.damage,0);assert.equal(config.temporaryEH,10);assert.equal(config.temporaryEF,5);
assert.equal(configuration([{attribute:'EH',value:10}],{resolution:'attack'}).resolution,'none');
assert.equal(castConfiguration({getFlag:()=>({resourceMode:'damage',bonuses:[{attribute:'EH',value:99}],damage:7})}).temporaryEH,0);
assert.deepEqual(bonusEntries({resourceMode:'bonuses',bonuses:[{attribute:'bad',value:2},{attribute:'EH',value:-2}]}),[{attribute:'EH',value:0}]);
assert.equal(adjustmentFor(configuration([{attribute:'COMBAT',value:2}]),'combat'),2);
for(const type of ['Personagem','NPC']){
 const a=actor(type),eh=type==='NPC'?'eh_npc':'eh',ef=type==='NPC'?'ef_npc':'ef';
 await applyMarker(a,item,config,token,'first',[]);
 assert.equal(a.system[eh].value,30);assert.equal(a.system[eh].max,20);
 assert.equal(a.system[ef].value,20);assert.equal(a.system[ef].max,15);
 assert.equal(temporaryResourceRemaining(a,'EH'),10);
 await a._aplicarDano({valor:6,isCura:false,isCritico:false},token);
 assert.equal(a.system[eh].value,24);assert.equal(temporaryResourceRemaining(a,'EH'),4);
 await a._aplicarDano({valor:3,isCura:false,isCritico:true},token);
 assert.equal(a.system[ef].value,17);assert.equal(temporaryResourceRemaining(a,'EF'),2);
 await a._aplicarDano({valor:9,isCura:false,isCritico:false},token);
 assert.equal(a.system[eh].value,15);assert.equal(temporaryResourceRemaining(a,'EH'),0);
 await a._aplicarDano({valor:3,isCura:true,curaTipo:'EF',isCritico:false},token);
 assert.equal(a.system[ef].value,17); // A reserva consumida não volta pela cura.
 await a._aplicarDano({valor:3,isCura:true,curaTipo:'EH',isCritico:false},token);
 assert.equal(a.system[eh].value,18);
 await a.effects[0].delete();assert.equal(a.system[eh].value,18);assert.equal(a.system[ef].value,15);
 assert.equal(temporaryResourceRemaining(a,'EF'),0);
}
const a=actor();
await applyMarker(a,item,config,token,'old',[]);
await a._aplicarDano({valor:6,isCura:false,isCritico:false},token);
await Promise.all([syncTemporaryEH(a),syncTemporaryEH(a)]);assert.equal(a.system.eh.value,24);
await applyMarker(a,item,config,token,'new',[]);assert.equal(a.system.eh.value,30);assert.equal(a.effects.length,1);
await applyMarker(a,item,config,token,'new',[]);assert.equal(a.system.eh.value,30);
const other={...item,uuid:item.uuid+'2'};
await applyMarker(a,other,configuration([{attribute:'EH',value:3}]),token,'other',[]);
assert.equal(a.system.eh.value,33);
await a._aplicarDano({valor:8,isCura:false,isCritico:false},token);
assert.equal(a.system.eh.value,25);
await a.effects[0].delete();assert.equal(a.system.eh.value,23);
await a.effects[0].delete();assert.equal(a.system.eh.value,20);
const b=actor();await applyMarker(b,item,config,token,'expires',[]);
await b._aplicarDano({valor:4,isCura:false,isCritico:false},token);
game.time.worldTime=30;await expireMarkers();assert.equal(b.system.eh.value,20);assert.equal(b.system.ef.value,15);
await expireMarkers();assert.equal(b.system.eh.value,20); // Sem subtração duplicada.
game.time.worldTime=0;
const c=actor();await applyMarker(c,item,config,token,'turn',[]);
await c.effects[0].update({[`flags.${ID}.spellTimer.recurringRM`]:{savedThisTurn:true}});
assert.equal(c.system.eh.value,20);
await c.effects[0].update({[`flags.${ID}.spellTimer.recurringRM`]:{savedThisTurn:false}});
assert.equal(c.system.eh.value,20); // Falhar de novo não reabastece reserva já concedida.
await applyMarker(c,item,config,token,'renew',[]);assert.equal(c.system.eh.value,30);
await c.update({'system.eh.value':0});assert.equal(temporaryResourceRemaining(c,'EH'),0);
await c.effects[0].delete();assert.equal(c.system.eh.value,0);
// A rotina real da ficha conserva o saldo acima do teto normal ao abrir/recalcular.
const utils=await import(pathToFileURL(process.env.TAGMAR_TEST_UTILS));
const d=actor();await applyMarker(d,item,config,token,'native',[]);
assert.equal(utils._calculaEhTemporaria(d,{base:0,efetivo:0},1)['system.eh.value'],30);

const update=utils._calculaEhTemporaria(d,{base:0,efetivo:2},1);await d.update(update);
assert.equal(d.system.eh.value,32);assert.equal(d.system.eh.max,22);assert.equal(temporaryResourceRemaining(d,'EH'),10);
await d.update(utils._calculaEhTemporaria(d,{base:0,efetivo:0},1));
assert.equal(d.system.eh.value,30);assert.equal(temporaryResourceRemaining(d,'EH'),10);
await d.effects[0].delete();assert.equal(d.system.eh.value,20);
console.log('PASS: EH/EF temporárias com dano nativo, críticos, cura, consumo, renovação, não acumular, expiração, remoção e recálculo real.');

// Regra confirmada: encerrar remove apenas excesso, tanto na EH como na EF.
const wounded=actor();wounded.system.eh.value=12;wounded.system.ef.value=6;
await applyMarker(wounded,item,config,token,'wounded',[]);
assert.equal(wounded.system.eh.value,22);assert.equal(wounded.system.ef.value,11);
await wounded._aplicarDano({valor:6,isCura:false,isCritico:false},token);
await wounded._aplicarDano({valor:2,isCura:false,isCritico:true},token);
await wounded.effects[0].delete();
assert.equal(wounded.system.eh.value,16);assert.equal(wounded.system.ef.value,9);
assert.equal(temporaryResourceRemaining(wounded,'EH'),0);assert.equal(temporaryResourceRemaining(wounded,'EF'),0);
const shared=actor();shared.system.eh.value=12;
await applyMarker(shared,item,configuration([{attribute:'EH',value:10}]),token,'sharedA',[]);
await applyMarker(shared,other,configuration([{attribute:'EH',value:5}]),token,'sharedB',[]);
assert.equal(shared.system.eh.value,27);
await shared.effects[0].delete();assert.equal(shared.system.eh.value,25);assert.equal(temporaryResourceRemaining(shared,'EH'),5);
await shared.effects[0].delete();assert.equal(shared.system.eh.value,20);
await syncTemporaryEH(shared);assert.equal(shared.system.eh.value,20);
const woundedExpiry=actor();woundedExpiry.system.eh.value=5;woundedExpiry.system.ef.value=3;
await applyMarker(woundedExpiry,item,config,token,'woundedExpiry',[]);
game.time.worldTime=30;await expireMarkers();
assert.equal(woundedExpiry.system.eh.value,15);assert.equal(woundedExpiry.system.ef.value,8);
await expireMarkers();assert.equal(woundedExpiry.system.eh.value,15);
console.log('PASS: encerramento/expiração preservam EH e EF abaixo do teto, retiram só excesso e respeitam outras reservas.');
