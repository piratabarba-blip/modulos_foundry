// Tagmar Efeitos Mágicos — Marcos Walker; adaptação de teste autorizada por Pirata.
// Integração visual: não altera dados de combate, duração, cargas ou magias.
export const MODULE_ID = 'tagmar-token-fx';
export const SYSTEM_ID = 'tagmar_rpg';
export const ITEM_TYPES = new Set(['Magia', 'Tecnica_Combate', 'Combate']);
const LIBRARIES = ['tmfx-main', 'tmfx-template'];

export function normalizePresets(value, legacy = false) {
  const input = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
  const unique = new Map();
  for (const entry of input) {
    const preset = typeof entry === 'string'
      ? {name: entry, library: legacy ? 'tmfx-template' : 'tmfx-main'} : entry;
    if (!preset || typeof preset.name !== 'string' || !preset.name.trim()) continue;
    if (!LIBRARIES.includes(preset.library)) continue;
    const clean = {name: preset.name, library: preset.library};
    unique.set(JSON.stringify(clean), clean);
  }
  return [...unique.values()];
}

export function configuration(item) {
  const saved = item.getFlag(MODULE_ID, 'visualFx');
  return {
    automatic: saved?.automatic === true,
    destination: saved?.destination === 'targets' ? 'targets' : 'self',
    presets: saved ? normalizePresets(saved.presets) : normalizePresets(item.getFlag(MODULE_ID, 'magicFx'), true)
  };
}

export function availablePresets(api) {
  return normalizePresets(LIBRARIES.flatMap(library =>
    (api.getPresets(library) ?? []).map(p => ({name: p.name, library}))
  )).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function prefixFor(item) {
  if (!item?.uuid) throw new Error('O item precisa estar salvo antes de receber efeitos.');
  return `${MODULE_ID}:${encodeURIComponent(item.uuid)}:`;
}

export function ownedFilterIds(token, prefixes) {
  const filters = token.document.getFlag('tokenmagic', 'filters');
  if (!Array.isArray(filters)) return [];
  return [...new Set(filters.map(f => f?.tmFilters?.tmFilterId)
    .filter(id => typeof id === 'string' && prefixes.some(prefix => id.startsWith(prefix))))];
}

export function buildParams(item, presets, api) {
  const result = [];
  for (const preset of normalizePresets(presets)) {
    const params = api.getPreset(preset);
    if (!Array.isArray(params) || !params.length) {
      throw new Error(`Efeito não encontrado: ${preset.name} (${preset.library}). Escolha outro na configuração.`);
    }
    const namespace = `${prefixFor(item)}${encodeURIComponent(preset.library)}:${encodeURIComponent(preset.name)}:`;
    for (const [index, original] of params.entries()) {
      if (!original || typeof original.filterType !== 'string') throw new Error(`Efeito inválido: ${preset.name}.`);
      const clone = structuredClone(original);
      // Nunca modificar a biblioteca global nem reutilizar IDs de filtros de terceiros.
      clone.filterId = namespace + encodeURIComponent(original.filterId ?? String(index));
      delete clone.filterInternalId;
      delete clone.filterOwner;
      delete clone.placeableId;
      result.push(clone);
    }
  }
  return result;
}

export function destinationTokens(item, destination, canvas, user) {
  if (!canvas?.ready) throw new Error('Abra uma cena com tokens para testar os efeitos.');
  const placeables = canvas.tokens?.placeables ?? [];
  let tokens;
  if (destination === 'targets') {
    const ids = new Set(Array.from(user.targets ?? []).map(t => t.id));
    tokens = placeables.filter(t => ids.has(t.id));
    if (!tokens.length) throw new Error('Marque pelo menos um alvo antes de usar o efeito.');
  } else {
    const actor = item.actor;
    if (!actor) throw new Error('Coloque o item na ficha de um personagem ou NPC para testar.');
    if (actor.isToken) tokens = placeables.filter(t => t.document.uuid === actor.token?.uuid);
    else {
      const matches = placeables.filter(t => t.actor?.uuid === actor.uuid);
      const selected = matches.filter(t => t.controlled);
      tokens = selected.length === 1 ? selected : matches;
    }
    if (!tokens.length) throw new Error('O personagem deste item não tem token nesta cena.');
    if (tokens.length !== 1) throw new Error('Há vários tokens deste personagem. Selecione somente o token dele que receberá o efeito.');
  }
  if (tokens.some(t => !user.isGM && !t.document.isOwner)) {
    throw new Error('Você não pode alterar um dos tokens escolhidos. Peça ao mestre para aplicar o efeito.');
  }
  return tokens;
}

export async function clearEffects(tokens, prefixes, api, user) {
  const affected = tokens.map(token => ({token, ids: ownedFilterIds(token, prefixes)})).filter(t => t.ids.length);
  if (affected.some(({token}) => !user.isGM && !token.document.isOwner)) {
    throw new Error('Há efeitos em tokens sem sua permissão. Peça ao mestre para removê-los.');
  }
  for (const {token, ids} of affected) {
    for (const id of ids) await api.deleteFilters(token, id);
  }
  return affected.length;
}

export async function applyEffects(item, config, {api, canvas, user}) {
  const params = buildParams(item, config.presets, api);
  if (!params.length) throw new Error('Escolha pelo menos um efeito visual.');
  const tokens = destinationTokens(item, config.destination, canvas, user);
  // Reaplicar substitui só os efeitos deste item nos destinos escolhidos.
  for (const token of tokens) {
    await clearEffects([token], [prefixFor(item)], api, user);
    await api.addUpdateFilters(token, structuredClone(params));
  }
  return tokens.length;
}
