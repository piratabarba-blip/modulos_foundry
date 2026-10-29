import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {itemAttackColumn,itemAttackResult} from '../tagmar-token-fx/scripts/item-attack.mjs';
import {attackToChat} from '../tagmar-token-fx/scripts/attack-chat.mjs';
const root=process.env.TAGMAR_TEST_SYSTEM;
const src=await readFile(root+'/modules/tagmarItem.js','utf8');
const system=await readFile(root+'/modules/tagmar.js','utf8');
const start=system.indexOf('const tabela_resol = ['),end=system.indexOf('];',start)+2;
const table=vm.runInNewContext(system.slice(start,end)+';tabela_resol');
const extract=(name,next)=>src.slice(src.indexOf(`    async ${name}(`),src.indexOf(`    async ${next}(`)).replace(/let dadosColoridos = await import\([^;]+;/g,'let dadosColoridos = {};');
const Native=new Function(`return class {${extract('rollCombate','rollTagmarItem')}${extract('combateToChat','combateToChatPlus')}${extract('combateToChatPlus','rollCombate')}}`)();
globalThis.game={user:{id:'gm'},system:{id:'tagmar_rpg'},tagmar:{tabela_resol:table},settings:{get:()=>false}};
globalThis.ChatMessage={getSpeaker:()=>({})};globalThis.Hooks={callAll(){}};
let nativeColumn,flavor;
globalThis.Roll=class{async evaluate(){this.total=10;return this;}};
const target={system:{d_ativa:{categoria:'M',valor:3}}};
const item=new Native();Object.assign(item,{type:'Combate',flags:{},system:{municao:0,bonus:'AUR',bonus_magico:2,def_l:1,def_m:3,def_p:5,nivel:11,tipo:'MAG',penalidade:{},dano:{}},actor:{system:{atributos:{AUR:4},inf_ataque:{cat_def:'M',valor_def:3,bonus:2}}},_chatActionButtons:()=>({button:'',buttonC:''})});
const original=item.combateToChat,plus=item.combateToChatPlus;
item.combateToChat=async(_c,_r,_a,_b,_d,_e,_roll,_ammo,total)=>{nativeColumn=total;};
item.combateToChatPlus=async(_c,_r,_a,_b,_d,_e,_roll,_ammo,total)=>{nativeColumn=total;};
let cases=0;
for(const tipo of ['','MAG','C','P'])for(const nivel of [0,1,11,35])for(const category of ['L','M','P']){
  Object.assign(item.system,{tipo,nivel});target.system.d_ativa.categoria=category;item.actor.system.inf_ataque.cat_def=category;
  await item.rollCombate();assert.equal(itemAttackColumn(item,target),nativeColumn);cases++;
}
item.combateToChat=original;item.combateToChatPlus=plus;
for(let p=25;p<=300;p+=25)item.system.dano[`d${p}`]=p===100?34:p/25*7-1;
Object.assign(item.system,{tipo:'MAG',bonus:'',bonus_magico:0,def_l:0});item.actor.system.inf_ataque.bonus=0;
const roll={toMessage:async data=>{flavor=data.flavor;}};
for(const total of [0,11,21,40,61])for(const penalty of [0,25,75])for(let die=1;die<=20;die++){
  item.system.nivel=total;item.system.penalidade={['p'+penalty]:true};
  const result=itemAttackResult(item,target,table,die);
  const args=[result.column,result.color,penalty===25,false,penalty===75,false,roll,'',total];
  if(total>20)await item.combateToChatPlus(...args,(total-result.column)/20*50);else await item.combateToChat(...args);
  if(!result.critical){const value=Number(flavor.match(/Dano: ([\d.-]+)/)[1]);assert.equal(result.damage,Math.max(0,value),`${total}/${penalty}/${die}`);}
  cases++;
}
item.system.nivel=11;item.system.penalidade={};item.system.dano.d100=34;
const die=table.find(r=>r[0]===11).indexOf('azul');
assert.equal(itemAttackResult(item,target,table,die).damage,34);
item.system.dano.d100=52;assert.equal(itemAttackResult(item,target,table,die).damage,52);
console.log(`PASS: ${cases} comparações com ataque nativo; magia/armas, L/M/P, bônus, nível, percentuais, penalidades e alteração do item.`);
// Exercita os cartões e botões reais do sistema com o adaptador de área.
const Buttons=new Function(`return class {${src.slice(src.indexOf('    _chatActionButtons('),src.indexOf('    async _curaFixaToChat('))}}`)();
item._chatActionButtons=Buttons.prototype._chatActionButtons;
Object.assign(item,{name:'Bola de Fogo 5',img:'icons/fire.webp',id:'fire'});item.system.descricao='Esfera de 6 metros de raio';
globalThis.foundry={utils:{escapeHTML:s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}};
const messages=[],hooks=[];Hooks.callAll=(...args)=>hooks.push(args);
const criticalSource=system.slice(system.indexOf('async function rolarCritico('),system.indexOf('\ndocument.addEventListener',system.indexOf('async function rolarCritico(')));
game.tagmar.rolarCritico=new Function(`${criticalSource};return rolarCritico;`)();
globalThis.Roll=class{async evaluate(){this.total=20;return this;}async toMessage(data){await Promise.resolve();messages.push(data);return {id:'crit'+messages.length};}};
const nativeRoll={toMessage:async data=>messages.push(data)};
for(const total of [11,41])for(const color of ['branco','laranja','cinza','verde']) {
 item.system.nivel=total;
 const row=table.find(r=>r[0]===(total%20||20));
 const result=itemAttackResult(item,target,table,row.indexOf(color));
 const before=hooks.length;
 const beforeCards=messages.length;
 const outcome=await attackToChat(item,{name:'Alvo <teste>',document:{uuid:'Scene.s.Token.target'},actor:{uuid:'Actor.target'}},nativeRoll,result,{whisper:['gm','player'],damageApplied:result.damage>0,requestId:'request'});
 const card=messages[beforeCards];
 assert.deepEqual(card.whisper,['gm','player']);assert.equal(card.flags['tagmar-token-fx'].attackTarget,'Actor.target');
 assert(card.flavor.includes('Alvo &lt;teste&gt;'));assert(card.flavor.includes('Scene.s.Token.target'));assert(card.flavor.includes('icons/fire.webp'));
 assert(card.flavor.includes('Esfera de 6 metros de raio'));assert(card.flavor.includes('background-color:'));
 assert.equal(hooks.length,before+(result.critical?0:1)); // Crítico aguardado, sem repetir o hook.
 if(result.damage>0){assert(card.flavor.includes('Dano já aplicado automaticamente'));assert(card.flavor.includes('<details>'));assert(card.flavor.includes('Aplicar Dano'));}
 if(result.critical){
  assert(card.flavor.includes('<details open>'));assert(card.flavor.includes('Aplicar 25% Dano'));
  assert.equal(messages.length,beforeCards+2);assert(outcome.criticalMessageId);
  const criticalCard=messages.at(-1);
  assert.match(criticalCard.flavor,/Rolagem do Crítico/);
  assert.match(criticalCard.flavor,/Alvo &lt;teste&gt;/);
  assert.deepEqual(criticalCard.whisper,['gm','player']);assert.equal(criticalCard.user,'gm');
  assert.equal(criticalCard.flags['tagmar-token-fx'].criticalResolution,true);
  if(result.color!=='verde'){assert.match(criticalCard.flavor,/<b>Magia:<\/b>/);assert(!criticalCard.flavor.includes('Combate Desarmado'));}
 }
}
assert.equal(messages.length,12);
console.log('PASS: cartões nativos em colunas normais/acima de 20, imagem/descrição/cores, crítico/falha, alvo escapado, privacidade e botões manuais com aviso.');
