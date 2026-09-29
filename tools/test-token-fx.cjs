// Sem conexão com mundos ou documentos reais. Node 22+.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

async function main() {
  const root = path.resolve(__dirname, '../tagmar-token-fx');
  const core = await import(pathToFileURL(path.join(root, 'scripts/core.mjs')));
  let checks = 0;
  const test = async (name, action) => { await action(); checks++; console.log(`OK ${name}`); };
  const actor = {uuid: 'Actor.caster', isOwner: true, type: 'Personagem', name: 'Teste'};
  const flags = {};
  const item = {uuid: 'Actor.caster.Item.fire', type: 'Magia', actor, isOwner: true, name: 'Fogo <img onerror=alert(1)>',
    getFlag: (_scope, key) => flags[key], setFlag: async (_scope, key, value) => { flags[key] = value; }};
  const createToken = (id, tokenActor = actor, owner = true) => {
    const state = [{tmFilters: {tmFilterId: 'external-glow', tmFilterType: 'glow'}}];
    return {id, actor: tokenActor, controlled: false, state,
      document: {uuid: `Scene.test.Token.${id}`, isOwner: owner, getFlag: () => state}};
  };
  const caster = createToken('caster');
  const other = createToken('other', {uuid: 'Actor.other'});
  other.controlled = true;
  const canvas = {ready: true, tokens: {placeables: [caster, other]}};
  const user = {id: 'gm', isGM: true, targets: new Set([other])};
  const original = [{filterId: 'shared-glow', filterType: 'glow', color: 123}];
  const calls = [];
  const api = {
    getPresets: library => library === 'tmfx-main' ? [{name: 'glow'}, {name: 'fire'}] : [],
    getPreset: preset => ['glow', 'fire'].includes(preset.name) ? original : undefined,
    addUpdateFilters: async (token, params) => {
      calls.push(['add', token.id]);
      for (const p of params) {
        token.state.push({tmFilters: {tmFilterId: p.filterId, tmFilterType: p.filterType}});
        p.filterId = 'API-mutated-clone';
      }
    },
    deleteFilters: async (token, id) => {
      assert.equal(typeof id, 'string'); assert(id.startsWith('tagmar-token-fx:'));
      calls.push(['delete', token.id, id]);
      const at = token.state.findIndex(f => f.tmFilters.tmFilterId === id);
      if (at >= 0) token.state.splice(at, 1);
    }
  };
  const config = {destination: 'self', automatic: false, presets: [{name: 'glow', library: 'tmfx-main'}]};

  await test('string legada normalizada; automático permanece desligado', () => {
    flags.magicFx = 'fire';
    assert.deepEqual(core.configuration(item), {automatic: false, destination: 'self', presets: [{name: 'fire', library: 'tmfx-template'}]});
    assert.equal(flags.magicFx, 'fire');
  });
  await test('rejeita configurações inválidas e elimina duplicados', () => {
    assert.equal(core.normalizePresets([null, 1, {}, {name: 'x', library: 'unknown'}]).length, 0);
    assert.equal(core.normalizePresets([...config.presets, ...config.presets]).length, 1);
  });
  await test('token selecionado de outro ator nunca recebe efeito próprio', async () => {
    await core.applyEffects(item, config, {api, canvas, user});
    assert.equal(caster.state.length, 2); assert.equal(other.state.length, 1);
  });
  await test('não modifica preset global nem replica efeitos ao reaplicar', async () => {
    await core.applyEffects(item, config, {api, canvas, user});
    assert.equal(original[0].filterId, 'shared-glow'); assert.equal(caster.state.length, 2);
    assert(caster.state.some(f => f.tmFilters.tmFilterId === 'external-glow'));
  });
  await test('dois itens mantêm filtros independentes', async () => {
    const second = {...item, uuid: 'Actor.caster.Item.second'};
    await core.applyEffects(second, config, {api, canvas, user});
    assert.equal(caster.state.length, 3);
    await core.clearEffects(canvas.tokens.placeables, [core.prefixFor(item)], api, user);
    assert.equal(caster.state.length, 2);
    assert.equal(core.ownedFilterIds(caster, [core.prefixFor(second)]).length, 1);
  });
  await test('aplica em alvos e remove mesmo após trocar seleção/alvos', async () => {
    await core.applyEffects(item, {...config, destination: 'targets'}, {api, canvas, user});
    user.targets.clear();
    assert.equal(other.state.length, 2);
    await core.clearEffects(canvas.tokens.placeables, [core.prefixFor(item)], api, user);
    assert.equal(other.state.length, 1);
  });
  await test('sem alvo não cai silenciosamente no token selecionado', async () => {
    await assert.rejects(core.applyEffects(item, {...config, destination: 'targets'}, {api, canvas, user}), /Marque pelo menos/);
  });
  await test('vários tokens exigem seleção explícita do próprio ator', () => {
    const copy = createToken('copy'); canvas.tokens.placeables.push(copy);
    assert.throws(() => core.destinationTokens(item, 'self', canvas, user), /vários tokens/);
    caster.controlled = true;
    assert.deepEqual(core.destinationTokens(item, 'self', canvas, user), [caster]);
    caster.controlled = false; canvas.tokens.placeables.pop();
  });
  await test('NPC sintético não vaza para outros tokens da base', () => {
    const npc = {isToken: true, token: {uuid: other.document.uuid}};
    assert.deepEqual(core.destinationTokens({...item, actor: npc}, 'self', canvas, user), [other]);
  });
  await test('permissão verificada antes de qualquer escrita em alvos', async () => {
    const denied = createToken('denied', {uuid: 'Actor.enemy'}, false); canvas.tokens.placeables.push(denied);
    const before = calls.length;
    await assert.rejects(core.applyEffects(item, {...config, destination: 'targets'}, {
      api, canvas, user: {isGM: false, targets: new Set([other, denied])}
    }), /Peça ao mestre/);
    assert.equal(calls.length, before); canvas.tokens.placeables.pop();
  });
  await test('preset ausente, item sem ator e cena fechada não alteram tokens', async () => {
    const before = calls.length;
    await assert.rejects(core.applyEffects(item, {...config, presets: [{name: 'missing', library: 'tmfx-main'}]}, {api, canvas, user}), /não encontrado/);
    await assert.rejects(core.applyEffects({...item, actor: null}, config, {api, canvas, user}), /Coloque o item/);
    await assert.rejects(core.applyEffects(item, config, {api, canvas: {ready: false}, user}), /Abra uma cena/);
    assert.equal(calls.length, before);
  });

  // Importa o entrypoint real com APIs Foundry simuladas, sem banco/socket.
  const hooks = new Map(); const warnings = [];
  global.Hooks = {on: (name, fn) => hooks.set(name, fn)};
  global.game = {system: {id: core.SYSTEM_ID}, user, modules: new Map([['tokenmagic', {active: true}]])};
  global.canvas = canvas; global.TokenMagic = api;
  global.ui = {notifications: {info: () => {}, warn: m => warnings.push(m)}};
  const entry = await import(pathToFileURL(path.join(root, 'scripts/main.js')));
  await test('oficial não recebe botões nem executa filtros', async () => {
    game.system.id = 'tagmar3er_oficial'; flags.visualFx = {...config, automatic: true};
    const buttons = []; const before = calls.length;
    hooks.get('getItemSheetHeaderButtons')({item, isEditable: true}, buttons);
    hooks.get('getActorSheetHeaderButtons')({actor, isEditable: true}, buttons);
    await hooks.get('tagmar_itemRoll')(item, user);
    assert.equal(buttons.length, 0); assert.equal(calls.length, before);
    game.system.id = core.SYSTEM_ID;
  });
  await test('FX disponível em magia, técnica e combate; ficha só leitura protegida', () => {
    for (const type of core.ITEM_TYPES) {
      const buttons = []; hooks.get('getItemSheetHeaderButtons')({item: {...item, type}, isEditable: true}, buttons);
      assert.equal(buttons[0].label, 'FX');
    }
    const buttons = []; hooks.get('getItemSheetHeaderButtons')({item, isEditable: false}, buttons); assert.equal(buttons.length, 0);
    for (const type of ['Personagem', 'NPC']) {
      const list = []; hooks.get('getActorSheetHeaderButtons')({actor: {...actor, type}, isEditable: true}, list);
      assert.equal(list[0].label, 'Limpar FX');
    }
  });
  await test('Token Magic inativo avisa sem quebrar a rolagem', async () => {
    game.modules.get('tokenmagic').active = false; const before = calls.length;
    const log = console.error; console.error = () => {};
    try { await hooks.get('tagmar_itemRoll')(item, user); } finally { console.error = log; }
    assert.equal(calls.length, before); assert(warnings.at(-1).includes('Ative o Token Magic'));
    game.modules.get('tokenmagic').active = true;
  });
  await test('gatilho só atende o usuário originador e automático habilitado', async () => {
    const before = calls.length;
    await hooks.get('tagmar_itemRoll')(item, {id: 'other-user'});
    flags.visualFx.automatic = false; await hooks.get('tagmar_itemRoll')(item, user);
    assert.equal(calls.length, before);
    flags.visualFx.automatic = true; await hooks.get('tagmar_itemRoll')(item, user);
    assert(calls.length > before);
  });
  await test('HTML da configuração escapa nomes de itens/presets', () => {
    const html = entry.dialogContent(item, config, [{name: '<img src=x onerror=alert(1)>', library: 'tmfx-main'}]);
    assert(!html.includes('<img')); assert(html.includes('&lt;img'));
  });
  await test('manifesto restrito ao XXX, com distribuição versionada própria', async () => {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'module.json')));
    assert.deepEqual(manifest.relationships.systems.map(s => s.id), ['tagmar_rpg']);
    assert.equal(manifest.compatibility.minimum, '14');
    assert.equal(manifest.manifest, 'https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-token-fx/module.json');
    assert(manifest.download.includes(`tagmar-token-fx-v${manifest.version}/tagmar-token-fx.zip`));
    assert.equal(manifest.relationships.requires[0].manifest, 'https://github.com/Feu-Secret/Tokenmagic/releases/download/0.8.4/module.json');
    assert(manifest.authors.some(a => a.name === 'Marcos Walker'));
    for (const file of [...manifest.esmodules, ...manifest.styles]) await fs.access(path.join(root, file));
  });
  console.log(`${checks} verificações passaram. Nenhum mundo real foi acessado.`);
}
main().catch(error => {console.error(error); process.exitCode = 1;});
