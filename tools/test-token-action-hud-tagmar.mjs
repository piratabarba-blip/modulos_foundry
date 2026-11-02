import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {actorActions,defaults,encode,decode,MODULE_ID} from '../token-action-hud-tagmar/scripts/model.mjs';
import {executeAction,promptResistance} from '../token-action-hud-tagmar/scripts/actions.mjs';
import {createIntegration} from '../token-action-hud-tagmar/scripts/integration.mjs';

const data=process.env.FOUNDRY_DATA??'C:/Users/PIRATA/AppData/Local/FoundryVTT/Data';
const calls=[],settings=new Map(),listeners=new Map();
globalThis.Hooks={callAll:(name,...args)=>{calls.push([name,...args]);for(const cb of listeners.get(name)??[])cb(...args);},once:(name,cb)=>listeners.set(name,[cb])};
Hooks.on=(name,cb)=>listeners.set(name,[...(listeners.get(name)??[]),cb]);
globalThis.ui={notifications:{warn:text=>calls.push(['warn',text])}};
globalThis.game={system:{id:'tagmar_rpg'},user:{id:'gm',isGM:true},
  settings:{get:(id,key)=>settings.get(`${id}.${key}`),register:(id,key,value)=>settings.set(`${id}.${key}`,value.default)},
  i18n:{localize:key=>key},modules:new Map([[MODULE_ID,{id:MODULE_ID,active:true}]]),tokenActionHud:{setting:{tooltips:'full',displayIcons:true},systemManager:{styles:{foundryVTT:{}}}}};
globalThis.canvas={tokens:{controlled:[]}};
globalThis.foundry={applications:{api:{ApplicationV2:class{},HandlebarsApplicationMixin:base=>base,DialogV2:{wait:async()=>null}}},utils:{deepClone:structuredClone,mergeObject:(a,b)=>Object.assign(a,b),isNewerVersion:()=>false}};

const makeItem=(id,type,system={})=>({id,name:'Mesmo nome',type,img:'icons/svg/sword.svg',system,isOwner:true,sort:0,
  sheet:{render:()=>calls.push(['edit',id])},rollTagmarItem(){calls.push(['roll',this.actor.uuid,id]);}});
const makeActor=(type='Personagem',uuid='Actor.a')=>({id:'a',uuid,name:'Teste',type,isOwner:true,system:{bonus_habil:2,ef:{value:30,max:40},rm:5,rf:4,valor_teste:{FOR:7}},items:new Map(),
  sheet:{render:()=>calls.push(['sheet',uuid]),action:id=>calls.push(['troop',id])},
  _rollAtributo:id=>calls.push(['attribute',id]),_rollResistencia:(fa,type)=>calls.push(['resistance',fa,type]),_rollMoral:()=>calls.push(['morale'])});
const attach=(actor,...items)=>{for(const item of items){item.actor=actor;actor.items.set(item.id,item);}actor.items.contents=[...actor.items.values()];return actor;};
const actor=attach(makeActor(),makeItem('one','Combate',{municao:12,dano:{d100:22}}),makeItem('two','Combate'),
  makeItem('skill','Habilidade',{tipo:'profissional',nivel:2,total:5}),makeItem('untrained','Habilidade',{nivel:0,total:17}),
  makeItem('spell','Magia',{nivel:3}),makeItem('tech','Tecnica_Combate',{nivel:2,fa:7}),makeItem('bag','Pertence',{quantidade:2}));
canvas.tokens.controlled=[{actor}];
for(const system of ['tagmar_rpg','tagmar3er-oficial']) {
  game.system.id=system;
  const groups=actorActions(actor);
  assert.equal(groups.get('tagmar-attacks').length,2);
  assert.equal(groups.get('tagmar-skill-profissional')[0].info1.text,'7');
  assert.equal(groups.get('tagmar-skill-geral')[0].info1.text,'-7');
  assert(!actorActions(actor,{hideUntrained:true}).has('tagmar-skill-geral'));
  assert.equal(groups.get('tagmar-resources')[0].info1.text,'30/40');
  await executeAction(actor,encode('item',actor,'two'));
  assert.deepEqual(calls.at(-1),['roll','Actor.a','two']);
  await executeAction(actor,encode('item',actor,'one'),{rightClick:true});
  assert.deepEqual(calls.at(-1),['edit','one']);
  await executeAction(actor,encode('inspect',actor,'bag'));
  assert.deepEqual(calls.at(-1),['edit','bag']);
  await executeAction(actor,encode('attribute',actor,'FOR'));
  assert.deepEqual(calls.at(-1),['attribute','FOR']);
  await executeAction(actor,encode('resistance',actor,'rm'),{askResistance:async()=>9});
  assert.deepEqual(calls.at(-1),['resistance',9,'Magía']);
  await executeAction(actor,encode('resistance',actor,'rf'),{askResistance:async()=>3});
  assert.deepEqual(calls.at(-1),['resistance',3,'Física']);
  const count=calls.length;
  await executeAction(actor,encode('resistance',actor,'rm'),{askResistance:async()=>null});
  assert.equal(calls.length,count,'Cancel must not roll');
  await assert.rejects(executeAction(actor,encode('resistance',actor,'rm'),{askResistance:async()=>NaN}));
  assert.equal(calls.length,count);
}
assert.equal(decode('x'),null);
assert.equal(decode('tagmar|item|%xx|foo'),null);
assert.equal(decode(encode('item',{uuid:'Actor.á|b'},'x')).actorUuid,'Actor.á|b');
const nonOwner={...actor,isOwner:false};
assert.equal(actorActions(nonOwner).size,0);
await assert.rejects(executeAction(nonOwner,encode('item',nonOwner,'one')),/controlar/);
await assert.rejects(executeAction(actor,encode('item',actor,'missing')),/removido/);
await assert.rejects(executeAction(actor,encode('item',{uuid:'Actor.stale'},'one')),/seleção mudou/);
canvas.tokens.controlled=[{actor},{actor}];
await assert.rejects(executeAction(actor,encode('item',actor,'one')),/apenas um token/);
const synthetic=attach(makeActor('NPC','Scene.scene.Token.orc.Actor.a'),makeItem('one','Combate'));
canvas.tokens.controlled=[{actor:synthetic}];
await executeAction(synthetic,encode('item',synthetic,'one'));
assert.deepEqual(calls.at(-1),['roll',synthetic.uuid,'one'],'Use synthetic token actor, not world actor with same ID');
await assert.rejects(executeAction(actor,encode('item',actor,'one')),/token desta ficha/);
await executeAction(synthetic,encode('morale',synthetic));assert.deepEqual(calls.at(-1),['morale']);
canvas.tokens.controlled=[{actor}];
await assert.rejects(executeAction(actor,encode('resistance',actor,'rm'),{askResistance:async()=>{canvas.tokens.controlled=[];actor.isOwner=false;return 4;}}),/controlar/);
actor.isOwner=true;
const vehicle=attach(makeActor('Veiculo'),makeItem('ballista','Arma_Guerra'));
let vehicleCount=0;
assert(actorActions(vehicle).has('tagmar-vehicles'));
await executeAction(vehicle,encode('maneuver',vehicle),{vehicleModule:async()=>({maneuverFromSheet:a=>{assert.equal(a,vehicle);vehicleCount++;}})});
assert.equal(vehicleCount,1);
const troop=makeActor('Tropa');troop.system.aparatos={quantidade:1,nome:'Balistas'};
assert.equal(actorActions(troop,{isGM:true}).get('tagmar-vehicles').length,3);
assert(!actorActions(troop,{isGM:false}).has('tagmar-vehicles'));
await executeAction(troop,encode('troop',troop,'attack'));assert.deepEqual(calls.at(-1),['troop','attack']);
game.user.isGM=false;await assert.rejects(executeAction(troop,encode('troop',troop,'attack')),/mestre/);game.user.isGM=true;

// Use the installed system entry point (both versions), not a reimplementation.
for(const system of ['tagmar_rpg','tagmar3er-oficial']) {
  game.system.id=system;
  const src=await fs.readFile(path.join(data,'systems',system,'modules/tagmarItem.js'),'utf8');
  const context={Item:class{},game,Hooks,ui,console,attackDialog:item=>calls.push(['native-war',item.id])};
  vm.createContext(context);
  vm.runInContext(src.replace(/^import .*;\s*$/gm,'').replace('export class tagmarItem','globalThis.NativeItem = class tagmarItem'),context);
  const item=actor.items.get('one');const original=item.rollTagmarItem;
  item.rollTagmarItem=context.NativeItem.prototype.rollTagmarItem;
  item.rollCombate=()=>calls.push(['native-combat',item.id]);
  canvas.tokens.controlled=[{actor}];
  game.modules.set('tagmar-token-fx',{active:true,api:{handleItemUse:async()=>{calls.push(['fx']);return false;}}});
  const from=calls.length;
  await executeAction(actor,encode('item',actor,item.id));
  assert.deepEqual(calls.slice(from).map(c=>c[0]),['fx','tagmar_itemRoll','native-combat']);
  game.modules.get('tagmar-token-fx').api.handleItemUse=async()=>{calls.push(['automated-fx']);return true;};
  const intercept=calls.length;
  await executeAction(actor,encode('item',actor,item.id));
  assert.deepEqual(calls.slice(intercept).map(c=>c[0]),['automated-fx'],'FX must not roll or animate twice');
  game.modules.delete('tagmar-token-fx');
  item.rollTagmarItem=original;
}

// Extract the real installed Core source map into an isolated test directory.
const coreRoot=await fs.mkdtemp(path.join(os.tmpdir(),'tagmar-hud-core-test-'));
const map=JSON.parse(await fs.readFile(path.join(data,'modules/token-action-hud-core/dist/token-action-hud-core.min.mjs.map'),'utf8'));
for(let i=0;i<map.sources.length;i++) {
  const name=map.sources[i];if(!name.startsWith('../module/'))continue;
  const dest=path.join(coreRoot,name.slice(3));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,map.sourcesContent[i]);
}
const coreImport=name=>import(pathToFileURL(path.join(coreRoot,'module',name)));
const {ActionHandler}=await coreImport('handlers/action-handlers/action-handler.mjs');
const {RollHandler}=await coreImport('handlers/roll-handlers/roll-handler.mjs');
const {SystemManager}=await coreImport('managers/system-manager.mjs');
const {Utils}=await coreImport('core/utils.mjs');
settings.set('token-action-hud-core.displayIcons',true);
settings.set('token-action-hud-core.tooltips','full');
const Integration=createIntegration({ActionHandler,RollHandler,SystemManager,Utils});
const manager=new Integration();manager.registerSettings(()=>{});
const layout=await manager.registerDefaults();assert.deepEqual(layout,defaults());
const buckets=new Map(layout.groups.map(g=>[g.id,{...g,actions:[]}]));
const handler=manager.getActionHandler();
handler.hudManager={actor,actors:[actor],token:{actor},tokens:[{actor}]};
handler.groupHandler={getGroups:({id})=>[buckets.get(id)]};
await handler.buildSystemActions();
const attacks=buckets.get('tagmar-attacks').actions;
assert.equal(attacks.length,2,'Real Core addActions accepts generated groups');
assert.equal(attacks[0].img,'icons/svg/sword.svg');
assert.equal(attacks[0].info1.text,'12');
assert.equal(attacks[0].info3.text,'22');
assert(attacks[0].tooltip.content.includes('ficha'));
const roll=manager.getRollHandler();roll.hudManager={actor,isRightClick:false};
await roll.handleActionClick({button:0},attacks[1].encodedValue);
assert(calls.some(c=>c[0]==='roll'&&c[2]==='two'));
assert.equal(calls.at(-1)[0],'forceUpdateTokenActionHud');
// Core's actual click dispatch reads the encoded button value and invokes ours.
await roll.handleActionClickCore({target:{querySelector:()=>null,closest:()=>({value:attacks[0].encodedValue})}},attacks[0],handler);
await new Promise(resolve=>setImmediate(resolve));
assert(calls.slice(-4).some(c=>c[0]==='roll'&&c[2]==='one'));
handler.hudManager={actor:null,actors:[actor,synthetic]};
await handler.buildSystemActions();
// Handshake is available regardless of module script load order.
await import('../token-action-hud-tagmar/scripts/main.mjs');
Hooks.callAll('tokenActionHudCoreApiReady',{api:{ActionHandler,RollHandler,SystemManager,Utils}});
assert.equal(game.modules.get(MODULE_ID).api.requiredCoreModuleVersion,'2.1');
assert(calls.some(c=>c[0]==='tokenActionHudSystemReady'));

// Dialog labels, cancellation and invalid input do not silently choose a FA.
foundry.applications.api.DialogV2.wait=async config=>{
  assert(config.content.includes('Força de Ataque'));
  assert.equal(config.rejectClose,false);
  assert.equal(config.buttons[1].callback(),null);
  const form={elements:{force:{reportValidity:()=>true,value:'11'}}};
  assert.equal(config.buttons[0].callback(null,{form}),11);
  form.elements.force.value='';assert.throws(()=>config.buttons[0].callback(null,{form}));
  return null;
};
await promptResistance(actor,'rm');
// Export generated data for a browser check with the actual Core templates.
const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../outputs/hud-tagmar-preview');
await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,'test-actions.json'),JSON.stringify([...buckets.values()],null,2));
console.log('PASS: XXX e Oficial; chamadas nativas/FX sem duplicação; ID e token sintético; permissões; RM/RF e cancelamento; veículos/tropas; Core 2.1.2 real; registro e cliques.');
