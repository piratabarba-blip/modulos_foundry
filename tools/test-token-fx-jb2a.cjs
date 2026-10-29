const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

(async () => {
  const load = file => import(pathToFileURL(path.resolve(__dirname, '../tagmar-token-fx/scripts', file)));
  const jb = await load('jb2a.mjs');
  const actor = {uuid: 'Actor.archer', isOwner: true};
  const flags = {};
  const item = {uuid: 'Actor.archer.Item.bow', actor, isOwner: true, type: 'Combate', getFlag: (_scope, key) => flags[key]};
  const source = {id: 'archer', actor, center: {x: 50, y: 50}, document: {uuid: 'Scene.s.Token.archer', isOwner: true}};
  const target = {id: 'enemy', actor: {uuid: 'Actor.enemy'}, center: {x: 300, y: 50}, document: {isOwner: false}};
  const canvas = {ready: true, scene: {id: 's'}, tokens: {placeables: [source, target]}};
  const settings = new Map();
  const game = {system: {id: 'tagmar_rpg'}, modules: new Map([['sequencer', {active: true}], ['JB2A_DnD5e', {active: true}]]),
    user: {id: 'player', isGM: false, targets: new Set([target])}, settings: {get: (scope, key) => settings.get(`${scope}.${key}`)}};
  const file = 'jb2a.arrow.physical.white.01';
  const ended = [], played = [];
  const sequencer = {Database: {publicFlattenedSimpleEntries: [file, file, 'other.fire']}, EffectManager: {endEffects: async filter => ended.push(filter)}};
  class Sequence {
    constructor() { this.effects = []; }
    effect() {
      const entry = {}; this.effects.push(entry);
      const methods = ['file','name','atLocation','stretchTo','scale','scaleToObject','duration','fadeIn','fadeOut'];
      const chain = Object.fromEntries(methods.map(method => [method, (...args) => {entry[method] = args; return chain;} ]));
      return chain;
    }
    async play() { played.push(this.effects); }
  }
  const context = {game, canvas, sequencer, SequenceClass: Sequence};
  const config = {enabled: true, automatic: true, file, mode: 'projectile', scale: 1, duration: 3};
  assert.equal(jb.animationConfiguration(item).enabled, false);
  assert.deepEqual(jb.animationChoices(sequencer), [file]);
  assert.equal(await jb.playAnimation(item, config, context), 1);
  assert.equal(played[0][0].atLocation[0], source);
  assert.equal(played[0][0].stretchTo[0], target); // Inimigo sem permissão: somente visual, nenhum update.
  assert(!('duration' in played[0][0]));
  game.user.targets.clear();
  assert.equal(await jb.playAnimation(item, config, context), 0);
  await assert.rejects(jb.playAnimation(item, config, {...context, test: true}), /Marque outro token/);
  game.user.targets.add(source);
  assert.equal(await jb.playAnimation(item, config, context), 0);
  game.user.targets.add(target); target.center = {...source.center};
  assert.equal(await jb.playAnimation(item, config, context), 0);
  target.center = {x: 300, y: 50};
  assert.equal(await jb.playAnimation(item, config, context), 1);
  assert.equal(played.at(-1).length, 1); // Ignora autoalvo sem duplicar o disparo.
  settings.set('core.photosensitiveMode', true);
  assert.equal(await jb.playAnimation(item, config, context), 0);
  await assert.rejects(jb.playAnimation(item, config, {...context, test: true}), /fotossensibilidade/);
  settings.clear(); settings.set('tagmar-token-fx.jb2aEnabled', false);
  assert.equal(await jb.playAnimation(item, config, context), 0); settings.clear();
  game.modules.get('sequencer').active = false;
  assert.equal(await jb.playAnimation(item, config, context), 0);
  await assert.rejects(jb.playAnimation(item, config, {...context, test: true}), /Sequencer/);
  game.modules.get('sequencer').active = true;
  assert.equal(await jb.playAnimation(item, {...config, file: 'jb2a.paid.missing'}, context), 0);
  assert.equal(await jb.playAnimation({...item, isOwner: false}, config, context), 0);
  assert.equal(await jb.playAnimation(item, config, {...context, canvas: {...canvas, ready: false}}), 0);
  const duplicate = {...source, id: 'copy', document: {...source.document, uuid: 'Scene.s.Token.copy'}};
  canvas.tokens.placeables.push(duplicate);
  assert.equal(await jb.playAnimation(item, config, context), 0);
  duplicate.controlled = true;
  await jb.playAnimation(item, config, context);
  assert.equal(played.at(-1)[0].atLocation[0], duplicate);
  canvas.tokens.placeables.pop();
  const synthetic = {...actor, isToken: true, token: {uuid: source.document.uuid}};
  await jb.playAnimation({...item, actor: synthetic}, {...config, mode: 'self'}, context);
  assert.equal(played.at(-1)[0].atLocation[0], source);
  assert.equal(played.at(-1)[0].duration[0], 3000);
  assert(!('stretchTo' in played.at(-1)[0]));
  await jb.clearAnimations([item], context);
  assert.deepEqual(ended, [{name: 'tagmar-token-fx:Actor.archer.Item.bow:jb2a', sceneId: 's'}]);
  flags.jb2aFx = {...config, scale: 999, duration: -7};
  assert.equal(jb.animationConfiguration(item).scale, 50); assert.equal(jb.animationConfiguration(item).duration, .5);
  flags.jb2aFx = {...config,scale:8};assert.equal(jb.animationConfiguration(item).scale,8);
  flags.jb2aFx = config;
  const hooks = new Map(); global.Hooks = {on: (name, callback) => hooks.set(name, callback)};
  global.game = game; global.canvas = canvas; global.Sequencer = sequencer; global.Sequence = Sequence;
  const warnings = []; global.ui = {notifications: {warn: text => warnings.push(text), info() {}}};
  await load('main.js');
  const before = played.length;
  await hooks.get('tagmar_itemRoll')(item, {id: 'other'});
  assert.equal(played.length, before);
  await hooks.get('tagmar_itemRoll')(item, game.user);
  assert.equal(played.length, before + 1);
  flags.jb2aFx = {...config, automatic: false};
  await hooks.get('tagmar_itemRoll')(item, game.user);
  assert.equal(played.length, before + 1);
  flags.jb2aFx = config;
  global.Sequence = class extends Sequence { async play() { throw Error('falha visual simulada'); } };
  const log = console.error; console.error = () => {};
  try { await hooks.get('tagmar_itemRoll')(item, game.user); } finally { console.error = log; }
  assert(warnings.at(-1).includes('falha visual simulada'));
  console.log('PASS JB2A: projétil, alvo distinto, cena, permissões, ator sintético, seleção ambígua, opcionais ausentes, configuração global, fotossensibilidade, limpeza seletiva, duração limitada, gatilho único e falha visual isolada.');
})().catch(error => {console.error(error); process.exitCode = 1;});
