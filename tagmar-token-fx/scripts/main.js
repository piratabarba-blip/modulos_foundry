// Integração original: Marcos Walker. Adaptação XXX/V14 autorizada por Pirata.
import {
  MODULE_ID, SYSTEM_ID, ITEM_TYPES, configuration, availablePresets,
  normalizePresets, prefixFor, clearEffects, applyEffects
} from './core.mjs';
import {animationConfiguration, animationStatus, animationChoices, animationScript, styleAnimation, playAnimation, clearAnimations} from './jb2a.mjs';
import {createTimerController} from './timers.mjs';
import {castFields,readCast,updateCastFields,applyUseType} from './cast-ui.mjs';
import {registerCasts} from './casts.mjs';
import {registerSpellTimes} from './spell-times.mjs';
import {animationCatalog,resolveAnimation} from './animation-labels.mjs';
import {bindAnimationPicker} from './animation-picker.mjs';
import {placeArea} from './area-preview.mjs';
import {visualArea} from './area-animation.mjs';
import {registerChatTargets} from './chat-targets.mjs';
import {createEffectLightController} from './effect-lights.mjs';

const supported = () => game.system.id === SYSTEM_ID;
const editable = item => supported() && item?.isOwner && ITEM_TYPES.has(item.type);
const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
let pending = Promise.resolve();
let timerController;
let lightController;

Hooks.on('ready', () => {
  if (!supported()) return;
  registerCasts();
  registerChatTargets();
  lightController=createEffectLightController();
  registerSpellTimes();
  timerController = createTimerController({getGame: () => game, getCanvas: () => canvas,
    getSequencer: () => globalThis.Sequencer, getSequence: () => globalThis.Sequence,
    normalize: animationConfiguration, style: styleAnimation,
    onError: error => console.error(`${MODULE_ID} | temporizador`, error)});
  void timerController.refresh();
});
Hooks.on('updateWorldTime', () => timerController?.sync());
Hooks.on('canvasReady', () => timerController?.resetScene());
Hooks.on('sequencerEffectManagerReady', () => timerController?.sync());
Hooks.on('createSequencerEffect', effect => timerController?.effectCreated(effect));
Hooks.on('createSequencerEffect', effect => lightController?.add(effect));
Hooks.on('endedSequencerEffect', effect => lightController?.remove(effect));
Hooks.on('canvasTearDown', () => lightController?.clear());
Hooks.on('updateItem', item => timerController?.update(item));
Hooks.on('createItem', item => timerController?.update(item));
Hooks.on('deleteItem', item => timerController?.remove(item));
Hooks.on('updateActor', () => timerController?.refresh());
Hooks.on('deleteActor', () => timerController?.refresh());
Hooks.on('updateToken', () => timerController?.refresh());
Hooks.on('deleteToken', () => timerController?.refresh());
Hooks.on('updateSetting', setting => {
  if (setting.key?.startsWith('tagmar-calendario.') || setting.key?.startsWith(`${MODULE_ID}.`)) void timerController?.sync();
});

Hooks.on('init', () => game.settings.register(MODULE_ID, 'jb2aEnabled', {
  name: 'Usar animações JB2A',
  hint: 'Permite animações configuradas no botão FX dos itens. Requer JB2A e Sequencer ativos; cada item começa sem animação.',
  scope: 'world', config: true, type: Boolean, default: true
}));

function animationContext() {
  return {game, canvas, sequencer: globalThis.Sequencer, SequenceClass: globalThis.Sequence};
}

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
  if (game.modules.get('tokenmagic')?.active) {
    await writeEffects(() => clearEffects(sceneTokens(), prefixes, tokenMagic(), game.user));
  }
  await clearAnimations(items, animationContext());
  ui.notifications.info('Limpeza concluída para este item/personagem na cena atual. Efeitos de outras fontes foram preservados.');
}

export function dialogContent(item, config, choices, animation = animationConfiguration(item), paths = [], unavailable = '') {
  const selected = new Set(config.presets.map(p => JSON.stringify(p)));
  const catalog=animationCatalog(paths);
  const animationName=catalog.find(row=>row.path===animation.file)?.value??animation.file;
  return `<div class="tagmar-fx-config">
    <p><strong>${escape(item.name)}</strong> — efeitos visuais XXX.</p>
    <p>Configure os visuais e, se desejar, a resolução automática. Sem automação, o visual dispara ao usar/rolar, independentemente de acertar.</p>
    ${castFields(item)}
    <details class="tagmar-fx-animation"><summary>Animação — JB2A</summary>
      ${unavailable ? `<p class="hint">${escape(unavailable)} As opções salvas são preservadas.</p>` : '<p class="hint">Biblioteca instalada disponível. Escolha o efeito e como ele aparece.</p>'}
      <label class="tagmar-fx-auto"><input type="checkbox" name="jbEnabled" ${animation.enabled ? 'checked' : ''}>Usar animação neste item</label>
      <label class="tagmar-fx-auto"><input type="checkbox" name="jbAutomatic" ${animation.automatic ? 'checked' : ''}>Executar também ao usar/rolar este item</label>
      <div class="tagmar-animation-picker" data-animation-picker>
        <span>Animação</span>
        <div class="tagmar-animation-search"><input type="search" name="jbFile" role="combobox" aria-label="Animação" aria-autocomplete="list" aria-expanded="false" value="${escape(animationName)}" placeholder="Procure flecha, escudo, fogo, azul…" autocomplete="off"><button type="button" data-animation-toggle title="Abrir ou fechar lista de animações" aria-label="Abrir ou fechar lista de animações">▾</button></div>
        <div class="tagmar-animation-list" role="listbox" aria-label="Animações disponíveis" hidden></div>
        <p class="hint" data-animation-count aria-live="polite" hidden></p>
      </div>
      <p class="hint">Nomes descritivos em português, baseados nos efeitos da biblioteca instalada. Você também pode colar o código JB2A original.</p>
      <div class="tagmar-fx-animation-grid">
        <label>Exibir como<select name="jbMode">
          <option value="projectile" ${animation.mode === 'projectile' ? 'selected' : ''}>Projétil: atacante → alvos</option>
          <option value="self" ${animation.mode === 'self' ? 'selected' : ''}>No próprio token</option>
          <option value="targets" ${animation.mode === 'targets' ? 'selected' : ''}>Nos alvos marcados</option>
          <option value="area" ${animation.mode === 'area' ? 'selected' : ''}>Na área posicionada</option>
        </select></label>
        <label>Tamanho (×)<input name="jbScale" type="number" value="${animation.scale}" min="0.1" max="50" step="0.1" title="Multiplicador visual, de 0,1 a 50. No token, 1 acompanha seu tamanho; 8 usa oito vezes esse tamanho."></label>
        <label>Duração visual (s)<input name="jbDuration" type="number" value="${animation.duration}" min="0.5" max="15" step="0.5"></label>
      </div>
      <div class="tagmar-fx-animation-grid">
        <label class="tagmar-fx-auto"><input type="checkbox" name="jbTintEnabled" ${animation.tintEnabled ? 'checked' : ''}>Tonalizar cor</label>
        <label>Cor<input name="jbTint" type="color" value="${animation.tint}"></label>
        <label>Raio (casas)<input name="jbRadius" type="number" value="${animation.radius}" min="0" max="50" step="0.1"></label>
      </div>
      <p class="hint">Raio visual: 1 = diâmetro de 2 casas. Zero usa o tamanho relativo ao token. Não altera a área da magia. A cor tonaliza a imagem; prefira outra variante JB2A quando disponível.</p>
      <p class="hint" data-jb-size-hint></p>
      <label class="tagmar-fx-auto"><input type="checkbox" name="jbLightEnabled" ${animation.lightEnabled?'checked':''}>Emitir luz na cena</label>
      <div data-jb-light ${animation.lightEnabled?'':'hidden'}>
        <div class="tagmar-fx-duration-grid">
          <label>Raio de luz clara<input name="jbLightBright" type="number" min="0" max="1000" step="0.5" value="${animation.lightBright}"></label>
          <label>Raio total de luz fraca<input name="jbLightDim" type="number" min="0" max="1000" step="0.5" value="${animation.lightDim}"></label>
        </div>
        <label>Cor da luz<input name="jbLightColor" type="color" value="${animation.lightColor}"></label>
        <p class="hint">Raios na unidade da cena (normalmente metros). A luz respeita paredes, acompanha o efeito no token ou fica na área e apaga com ele. Em projéteis, ilumina o destino durante a animação; não acompanha a ponta da flecha. Não substitui a luz própria do token. Zero nos dois raios não emite luz.</p>
      </div>
      <label>Tempo do efeito<select name="jbTimeMode">
        <option value="animation" ${animation.timeMode !== 'calendar' ? 'selected' : ''}>Animação breve (segundos reais)</option>
        <option value="calendar" ${animation.timeMode === 'calendar' ? 'selected' : ''}>Até terminar a duração no calendário</option>
      </select></label>
      <div class="tagmar-fx-duration-grid" data-jb-game-duration>
        <label>Duração da magia<input name="jbGameDuration" type="number" value="${animation.gameDuration}" min="0.01" step="any"></label>
        <label>Unidade<select name="jbGameUnit">${[['seconds','Segundos'],['minutes','Minutos'],['hours','Horas'],['days','Dias']].map(([key,label]) => `<option value="${key}" ${animation.gameUnit === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      </div>
      <p class="hint">Calendário: para efeitos no token, alvos ou área. Informe a duração do efeito escolhido na magia; o relógio parado pausa a contagem. Novo uso renova e substitui o efeito anterior deste item. Projéteis usam o tempo do arquivo.</p>
      <p class="hint">Testar mostra uma prévia breve, sem iniciar o prazo da magia. Não aplica regras, invisibilidade nem condições.</p>
      <details class="tagmar-fx-script"><summary>Script gerado — copiar e personalizar</summary>
        <p class="hint">Prévia independente em segundos reais. Ajuste os campos acima ou copie para uma macro do tipo Script e edite livremente. A macro copiada não fica vinculada ao item nem ao temporizador do calendário.</p>
        <textarea data-jb-script readonly rows="9" aria-label="Script gerado JB2A">${escape(animationScript(animation))}</textarea>
        <button type="button" data-jb-copy>Copiar script</button>
      </details>
    </details>
    <details class="tagmar-fx-tokenmagic" ${config.presets.length ? 'open' : ''}><summary>Token Magic — filtros no token</summary>
    <p class="hint">Filtros permanecem até serem removidos. Podem ser combinados com a animação JB2A.</p>
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
    </details>
    <p class="hint">Testar não salva a configuração. Remover limpa este item na cena atual, mesmo se você tiver trocado os alvos.</p>
  </div>`;
}

export async function configureItem(item) {
  if (!editable(item)) return;
  const api = game.modules.get('tokenmagic')?.active ? tokenMagic() : null;
  const config = configuration(item);
  const choices = normalizePresets([...(api ? availablePresets(api) : []), ...config.presets]);
  const animation = animationConfiguration(item);
  const paths = animationChoices(globalThis.Sequencer);
  const catalog=animationCatalog(paths);
  const unavailable = animationStatus(game, globalThis.Sequencer, globalThis.Sequence);
  const readAnimation = form => animationConfiguration({getFlag: () => ({
      enabled: form.querySelector('[name="jbEnabled"]').checked,
      automatic: form.querySelector('[name="jbAutomatic"]').checked,
      file: resolveAnimation(form.querySelector('[name="jbFile"]').value,catalog),
      mode: form.querySelector('[name="jbMode"]').value,
      scale: form.querySelector('[name="jbScale"]').value,
      duration: form.querySelector('[name="jbDuration"]').value,
      radius: form.querySelector('[name="jbRadius"]').value,
      tintEnabled: form.querySelector('[name="jbTintEnabled"]').checked,
      tint: form.querySelector('[name="jbTint"]').value,
      lightEnabled: form.querySelector('[name="jbLightEnabled"]').checked,
      lightBright: form.querySelector('[name="jbLightBright"]').value,
      lightDim: form.querySelector('[name="jbLightDim"]').value,
      lightColor: form.querySelector('[name="jbLightColor"]').value,
      timeMode: form.querySelector('[name="jbTimeMode"]').value,
      gameDuration: form.querySelector('[name="jbGameDuration"]').value,
      gameUnit: form.querySelector('[name="jbGameUnit"]').value
    })});
  const read = (button, action) => {
    const form = button.form;
    const animation = readAnimation(form);
    if (action === 'save' && animation.enabled && !unavailable && !paths.includes(animation.file)) {
      ui.notifications.warn('Escolha uma animação da lista JB2A antes de salvar.');
      return null;
    }
    return {action, animation, cast: readCast(form), config: {
      automatic: form.querySelector('[name="fxAutomatic"]').checked,
      destination: form.querySelector('[name="fxDestination"]').value,
      presets: [...form.querySelectorAll('[name="fxPreset"]:checked')].map(input => choices[Number(input.value)])
    }};
  };
  const result = await foundry.applications.api.DialogV2.wait({
    window: {title: 'Efeitos visuais — XXX'},
    position: {width: 560}, classes: ['tagmar-fx-dialog'],
    content: dialogContent(item, config, choices, animation, paths, unavailable),
    buttons: [
      {action: 'save', label: 'Salvar', icon: 'fas fa-save', default: true, callback: (_event, button) => read(button, 'save')},
      {action: 'test', label: 'Testar', icon: 'fas fa-play', callback: (_event, button) => read(button, 'test')},
      {action: 'remove', label: 'Remover', icon: 'fas fa-eraser', callback: () => ({action: 'remove'})},
      {action: 'cancel', label: 'Cancelar', callback: () => null}
    ],
    render: (_event, dialog) => {
      const root = dialog.element;
      root.querySelector('[name="cast_useType"]').addEventListener('change',()=>applyUseType(root));
      root.querySelector('.tagmar-fx-cast').addEventListener('input',()=>updateCastFields(root));
      root.querySelector('.tagmar-fx-cast').addEventListener('change',()=>updateCastFields(root));
      updateCastFields(root);
      bindAnimationPicker(root,catalog);
      const fileInput = root.querySelector('[name="jbFile"]');
      const preview = () => {
        const config = readAnimation(root);
        const projectile = config.mode === 'projectile';
        const area = config.mode === 'area';
        const calendar = !projectile && config.timeMode === 'calendar';
        const fixedRadius = !projectile && config.radius > 0;
        root.querySelector('[name="jbRadius"]').disabled = projectile || area;
        root.querySelector('[data-jb-light]').hidden = !root.querySelector('[name="jbLightEnabled"]').checked;
        root.querySelector('[name="jbRadius"]').closest('label').hidden = area;
        root.querySelector('[name="jbScale"]').disabled = fixedRadius || area;
        root.querySelector('[name="jbScale"]').closest('label').hidden = fixedRadius || area;
        root.querySelector('[name="jbDuration"]').closest('label').hidden = projectile || calendar;
        root.querySelector('[name="jbDuration"]').disabled = projectile || calendar;
        root.querySelector('[data-jb-size-hint]').textContent = area
          ? 'Uma animação na área posicionada, com as dimensões de Direção, área e efeito na ficha. Escolha círculo, cone ou linha nessa seção e ative a resolução para usar o item. Testar permite posicionar somente o visual, sem dano. Prefira um arquivo JB2A de área compatível com a forma escolhida.'
          : fixedRadius
          ? `Tamanho definido pelo raio: diâmetro de ${config.radius * 2} casas. Use raio 0 para voltar ao multiplicador.`
          : projectile ? 'Tamanho multiplica o visual do projétil; o comprimento acompanha a distância até o alvo.'
          : 'Tamanho multiplica a imagem em relação ao token. Salve e use o item novamente para atualizar o visual ativo.';
        root.querySelector('[name="jbTimeMode"]').disabled = projectile;
        root.querySelector('[data-jb-game-duration]').hidden = !calendar;
        root.querySelector('[data-jb-script]').value = animationScript(config);
      };
      root.querySelector('.tagmar-fx-animation').addEventListener('input', preview);
      root.querySelector('.tagmar-fx-animation').addEventListener('change', preview);
      root.querySelector('[data-jb-copy]').addEventListener('click', async event => {
        event.preventDefault(); event.stopPropagation();
        const field = root.querySelector('[data-jb-script]');
        try { await navigator.clipboard.writeText(field.value); ui.notifications.info('Script copiado. Cole em uma macro do tipo Script para editar.'); }
        catch { field.focus(); field.select(); ui.notifications.info('Script selecionado. Use Ctrl+C para copiar.'); }
      });
      preview();
      fileInput.addEventListener('input', () => fileInput.setCustomValidity(''));
      root.querySelector('[data-action="save"]')?.addEventListener('click', event => {
        if (root.querySelector('[name="jbEnabled"]').checked && !unavailable && !paths.includes(resolveAnimation(fileInput.value,catalog))) {
          event.preventDefault(); event.stopImmediatePropagation();
          fileInput.setCustomValidity('Escolha uma animação da lista JB2A instalada.');
          fileInput.reportValidity();
        }
      }, {capture: true});
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
    await item.update({[`flags.${MODULE_ID}.visualFx`]: result.config, [`flags.${MODULE_ID}.jb2aFx`]: result.animation, [`flags.${MODULE_ID}.cast`]: result.cast});
    ui.notifications.info('Configuração de FX e magia salva somente neste item.');
  } else if (result.action === 'test') {
    const actions = [];
    if (result.config.presets.length) actions.push(safely(() => writeEffects(() => applyEffects(item, result.config, {api: tokenMagic(), canvas, user: game.user}))));
    if (result.animation.enabled) actions.push(safely(async () => {
      let area=null;
      if(result.animation.mode==='area'){
        if(!['circle','cone','ray'].includes(result.cast.shape))throw Error('Escolha círculo, cone ou linha na configuração da área.');
        const placement=await placeArea(result.cast,{canvas,PIXI,document,Hooks,notify:t=>ui.notifications.info(t)});
        if(!placement)return;
        area=visualArea(result.cast,placement,canvas.scene);
      }
      return playAnimation(item, result.animation, {...animationContext(), test: true,area});
    }));
    if (!actions.length) ui.notifications.warn('Escolha uma animação JB2A ou um filtro Token Magic para testar.');
    await Promise.all(actions);
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
  const animation = animationConfiguration(item);
  const actorUser = {isGM: game.user.isGM, targets: new Set(game.user.targets)};
  const actions = [];
  if (config.automatic && config.presets.length) actions.push(safely(() => writeEffects(() => applyEffects(item, config, {api: tokenMagic(), canvas, user: actorUser}))));
  if (animation.enabled && animation.automatic) actions.push(safely(() => playAnimation(item, animation, {...animationContext(), user: actorUser})));
  return Promise.all(actions);
});
