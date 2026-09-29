// Testa as funções originais do Token Magic 0.8.4 com documentos em memória.
// Não inicializa renderizador/Foundry/socket, nem altera arquivos de upstream.
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict');

async function main() {
  const root = path.resolve(process.argv[2]);
  const core = await import(pathToFileURL(path.resolve(__dirname, '../tagmar-token-fx/scripts/core.mjs')));
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'module.json')));
  assert.equal(manifest.version, '0.8.4');
  const source = await fs.readFile(path.join(root, 'module/tokenmagic.js'), 'utf8');
  const presets = await import(pathToFileURL(path.join(root, 'fx/presets/defaultpresets.js')));
  const extract = (start, end) => {
    const at = source.indexOf(start); const until = source.indexOf(end, at + start.length);
    assert(at >= 0 && until > at, 'Formato inesperado na versão upstream');
    return source.slice(at, until);
  };
  const pieces = [
    extract('async function addUpdateFilters(placeable, paramsArray)', '\n\tasync function updateFilters('),
    extract('async function deleteFilters(placeable,', '\n\t// Toggle a preset'),
    extract('function getPresets(libraryName', '\n\tfunction _getPresetTemplateDefaults'),
    extract('function getPreset(presetName)', '\n\tasync function deletePreset')
  ];
  const registry = structuredClone(presets.allPresets); let counter = 0;
  const foundry = {utils: {duplicate: structuredClone, deepClone: structuredClone, randomID: () => `random${++counter}`}};
  const game = {data: {userId: 'test'}, settings: {get: () => registry}};
  const types = Object.fromEntries(registry.flatMap(p => p.params.map(f => [f.filterType, true])));
  const api = new Function('foundry', 'game', 'FilterType', 'PresetsLibrary', 'randomizeParams', 'objectAssign',
    pieces.join('\n') + '\nreturn {addUpdateFilters,deleteFilters,getPresets,getPreset};'
  )(foundry, game, types, presets.PresetsLibrary, () => {}, Object.assign);
  const item = {uuid: 'Actor.test.Item.fire', actor: {uuid: 'Actor.test'}};
  const original = {tmFilterId: 'another-module', tmFilterInternalId: 'external', tmFilterType: 'glow', tmParams: {filterId: 'another-module', filterType: 'glow'}};
  const state = {filters: [{tmFilters: original}], animeInfo: [{tmFilterInternalId: 'external'}]};
  const token = {id: 'token', actor: item.actor, document: {
    id: 'token', isOwner: true, getFlag: (_module, key) => state[key],
    _TMFXgetMaxFilterRank: () => 100, _TMFXgetPlaceableType: () => 'Token',
    _TMFXsetFlag: async value => {state.filters = value;},
    _TMFXunsetFlag: async () => {state.filters = [];},
    _TMFXsetAnimeFlag: async value => {state.animeInfo = value;},
    _TMFXunsetAnimeFlag: async () => {state.animeInfo = [];}
  }};
  const env = {api, canvas: {ready: true, tokens: {placeables: [token]}}, user: {isGM: true}};
  const before = JSON.stringify(registry);
  const choices = core.availablePresets(api); assert(choices.length > 20);
  for (const preset of choices) {
    await core.applyEffects(item, {destination: 'self', presets: [preset]}, env);
    assert(core.ownedFilterIds(token, [core.prefixFor(item)]).length > 0, preset.name);
    assert.deepEqual(state.filters.find(f => f.tmFilters.tmFilterId === 'another-module').tmFilters, original);
    await core.clearEffects([token], [core.prefixFor(item)], api, env.user);
    assert.deepEqual(state.filters, [{tmFilters: original}]);
    assert.deepEqual(state.animeInfo, [{tmFilterInternalId: 'external'}]);
  }
  assert.equal(JSON.stringify(registry), before);
  console.log(`${choices.length} presets originais passaram por aplicação/remoção com APIs originais 0.8.4; filtro externo e biblioteca preservados. Renderização GPU não testada aqui.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
