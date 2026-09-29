// Integração original: Marcos Walker. Adaptação XXX/V14 autorizada por Pirata.
import {
  MODULE_ID, SYSTEM_ID, ITEM_TYPES, configuration, availablePresets,
  normalizePresets, prefixFor, clearEffects, applyEffects
} from './core.mjs';

const supported = () => game.system.id === SYSTEM_ID;
const editable = item => supported() && item?.isOwner && ITEM_TYPES.has(item.type);
const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
let pending = Promise.resolve();

function tokenMagic() {
  const api = globalThis.TokenMagic;
  if (!game.modules.get('tokenmagic')?.active || !api
    || ['getPresets', 'getPreset', 'addUpdateFilters', 'deleteFilters'].some(key => typeof api[key] !== 'function')) {
    throw new Error('Ative o Token Magic FX 0.8.4 e recarregue o Foundry para usar os efeitos visuais.');
  }
  return api;
}

// Hooks.callAll não aguarda promises. Capturar erros protege a rolagem original.
function safely(action) {
  return Promise.resolve().then(action).catch(error => {
    console.error(`${MODULE_ID} |`, error);
    ui.notifications.warn(`Efeitos visuais: ${error.message}`);
  });
}

function writeEffects(action) {
  const operation = pending.then(action);
  pending = operation.catch(() => {});
  return operation;
}

function sceneTokens() {
  if (!canvas?.ready) throw new Error('Abra uma cena para remover os efeitos.');
  return canvas.tokens?.placeables ?? [];
}

async function removeFor(items) {
  const prefixes = items.filter(i => ITEM_TYPES.has(i.type)).map(prefixFor);
  const count = await writeEffects(() => clearEffects(sceneTokens(), prefixes, tokenMagic(), game.user));
  ui.notifications.info(count ? `Efeitos removidos de ${count} token(s). Outros filtros foram preservados.`
    : 'Nenhum efeito desta integração para esses itens na cena atual.');
}

export function dialogContent(item, config, choices) {
  const selected = new Set(config.presets.map(p => JSON.stringify(p)));
  return `<div class="tagmar-fx-config">
    <p><strong>${escape(item.name)}</strong> — efeitos visuais XXX.</p>
    <p>Não altera dano, cargas, duração ou regras. Os efeitos permanecem até serem removidos.</p>
    <label>Aplicar em
      <select name="fxDestination">
        <option value="self" ${config.destination === 'self' ? 'selected' : ''}>Token do próprio personagem / NPC</option>
        <option value="targets" ${config.destination === 'targets' ? 'selected' : ''}>Alvos marcados (target)</option>
      </select>
    </label>
    <label class="tagmar-fx-auto"><input type="checkbox" name="fxAutomatic" ${config.automatic ? 'checked' : ''}>
      Aplicar também ao usar/rolar este item</label>
    <p class="hint">O gatilho é o uso do item na ficha, não a confirmação de acerto ou sucesso da magia.</p>
    <label>Procurar efeito <input type="search" data-fx-search placeholder="Ex.: fire, glow, electric"></label>
    <div class="tagmar-fx-presets">${choices.length ? choices.map((preset, index) =>
      `<label data-fx-row><input type="checkbox" name="fxPreset" value="${index}" ${selected.has(JSON.stringify(preset)) ? 'checked' : ''}>
       <span>${escape(preset.name)} <small>(${preset.library === 'tmfx-main' ? 'Token Magic' : 'legado'})</small></span></label>`
    ).join('') : '<p>Nenhum efeito disponível. Confira a instalação do Token Magic.</p>'}</div>
    <p class="hint">Testar não salva a configuração. Remover limpa este item na cena atual, mesmo se você tiver trocado os alvos.</p>
  </div>`;
}

export async function configureItem(item) {
  if (!editable(item)) return;
  const api = tokenMagic();
  const config = configuration(item);
  const choices = normalizePresets([...availablePresets(api), ...config.presets]);
  const read = (button, action) => {
    const form = button.form;
    return {action, config: {
      automatic: form.querySelector('[name="fxAutomatic"]').checked,
      destination: form.querySelector('[name="fxDestination"]').value,
      presets: [...form.querySelectorAll('[name="fxPreset"]:checked')].map(input => choices[Number(input.value)])
    }};
  };
  const result = await foundry.applications.api.DialogV2.wait({
    window: {title: 'Efeitos visuais — XXX'},
    position: {width: 560}, classes: ['tagmar-fx-dialog'],
    content: dialogContent(item, config, choices),
    buttons: [
      {action: 'save', label: 'Salvar', icon: 'fas fa-save', default: true, callback: (_event, button) => read(button, 'save')},
      {action: 'test', label: 'Testar', icon: 'fas fa-play', callback: (_event, button) => read(button, 'test')},
      {action: 'remove', label: 'Remover', icon: 'fas fa-eraser', callback: () => ({action: 'remove'})},
      {action: 'cancel', label: 'Cancelar', callback: () => null}
    ],
    render: (_event, dialog) => {
      const root = dialog.element;
      root.querySelector('[data-fx-search]')?.addEventListener('input', event => {
        const search = event.target.value.toLocaleLowerCase('pt-BR');
        for (const row of root.querySelectorAll('[data-fx-row]')) {
          row.hidden = !row.textContent.toLocaleLowerCase('pt-BR').includes(search);
        }
      });
    }
  });
  if (!result || !editable(item)) return;
  if (result.action === 'save') {
    await item.setFlag(MODULE_ID, 'visualFx', result.config);
    ui.notifications.info('Efeitos visuais salvos somente neste item.');
  } else if (result.action === 'test') {
    const count = await writeEffects(() => applyEffects(item, result.config, {api: tokenMagic(), canvas, user: game.user}));
    ui.notifications.info(`Teste visual aplicado em ${count} token(s). Use FX → Remover para limpar.`);
  } else if (result.action === 'remove') await removeFor([item]);
}

Hooks.on('getItemSheetHeaderButtons', (sheet, buttons) => {
  const item = sheet.item ?? sheet.object;
  if (!editable(item) || !sheet.isEditable) return;
  buttons.unshift({label: 'FX', class: 'tagmar-token-fx-config', icon: 'fas fa-wand-magic-sparkles',
    onclick: () => safely(() => configureItem(item))});
});

Hooks.on('getActorSheetHeaderButtons', (sheet, buttons) => {
  const actor = sheet.actor ?? sheet.object;
  if (!supported() || !actor?.isOwner || !sheet.isEditable || !['Personagem', 'NPC'].includes(actor.type)) return;
  buttons.unshift({label: 'Limpar FX', class: 'tagmar-token-fx-clear', icon: 'fas fa-eraser',
    onclick: () => safely(async () => {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: {title: 'Remover efeitos visuais'},
        content: `<p>Remover os efeitos desta integração originados dos itens de <strong>${escape(actor.name)}</strong> na cena atual? Outros filtros serão preservados.</p>`
      });
      if (confirmed) await removeFor([...actor.items]);
    })});
});

Hooks.on('tagmar_itemRoll', (item, user) => {
  if (!editable(item) || user?.id !== game.user.id) return;
  const config = configuration(item);
  if (!config.automatic || !config.presets.length) return;
  const actorUser = {isGM: game.user.isGM, targets: new Set(game.user.targets)};
  return safely(() => writeEffects(() => applyEffects(item, config, {api: tokenMagic(), canvas, user: actorUser})));
});
