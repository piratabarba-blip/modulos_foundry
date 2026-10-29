// Integração opcional. Sequencer distribui os visuais; nenhum documento de token é alterado.
import {MODULE_ID, destinationTokens, prefixFor} from './core.mjs';
import {TIME_UNITS, startTimedAnimation} from './timers.mjs';
import {styleAreaAnimation,validVisualArea} from './area-animation.mjs';

export function animationConfiguration(item) {
  const saved = item.getFlag(MODULE_ID, 'jb2aFx');
  const number = (value, fallback, min, max) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    enabled: saved?.enabled === true,
    automatic: saved?.automatic === true,
    file: typeof saved?.file === 'string' && saved.file.startsWith('jb2a.') ? saved.file.trim() : '',
    mode: ['projectile', 'self', 'targets', 'area'].includes(saved?.mode) ? saved.mode : 'projectile',
    scale: number(saved?.scale ?? 1, 1, 0.1, 50),
    duration: number(saved?.duration ?? 3, 3, 0.5, 15),
    radius: number(saved?.radius ?? 0, 0, 0, 50),
    tint: saved?.tintEnabled === true && /^#[0-9a-f]{6}$/i.test(saved?.tint ?? '') ? saved.tint : '#ffffff',
    tintEnabled: saved?.tintEnabled === true,
    lightEnabled: saved?.lightEnabled === true,
    lightBright: number(saved?.lightBright ?? 3, 3, 0, 1000),
    lightDim: number(saved?.lightDim ?? 6, 6, 0, 1000),
    lightColor: /^#[0-9a-f]{6}$/i.test(saved?.lightColor ?? '') ? saved.lightColor : '#ffcc66',
    timeMode: saved?.timeMode === 'calendar' ? 'calendar' : 'animation',
    gameDuration: number(saved?.gameDuration ?? 1, 1, 0.01, 31536000),
    gameUnit: Object.hasOwn(TIME_UNITS, saved?.gameUnit) ? saved.gameUnit : 'minutes'
  };
}

// Função compartilhada com a macro exportada para manter a mesma interpretação dos controles.
export function styleAnimation(effect, config, source, target, timed = false) {
  if (config.mode === 'projectile') {
    effect = effect.atLocation(source).stretchTo(target).scale(config.scale);
  } else if (config.mode === 'area') {
    effect = styleAreaAnimation(effect,config.area);
    if (!timed) effect = effect.duration(config.duration * 1000);
    effect = effect.fadeIn(150).fadeOut(250);
  } else {
    effect = effect.atLocation(target);
    if (config.radius > 0) effect = effect.size({width: config.radius * 2, height: config.radius * 2}, {gridUnits: true});
    else effect = effect.scaleToObject(config.scale);
    if (!timed) effect = effect.duration(config.duration * 1000);
    effect = effect.fadeIn(150).fadeOut(250);
  }
  if (config.tintEnabled) effect = effect.tint(config.tint);
  if (config.lightEnabled) effect = effect.origin('tagmar-fx-light:' + JSON.stringify({
    bright:config.lightBright, dim:config.lightDim, color:config.lightColor, projectile:config.mode==='projectile'
  }));
  return effect;
}

export function animationScript(config) {
  const normalized = animationConfiguration({getFlag: () => config});
  if(normalized.mode==='area')return '// A área depende da posição escolhida no mapa.\n// Use Testar no FX para posicionar uma prévia sem dano, ou salve e clique no item para usar a magia.';
  const {file, mode, scale, duration, radius, tintEnabled, tint, lightEnabled, lightBright, lightDim, lightColor} = normalized;
  return `// JB2A / Sequencer — macro independente, sem rolagem ou alteração da ficha.
// Edite estes valores. radius: raio visual em casas da grade; 0 usa scale.
// tint é uma tonalização; para outra cor original, escolha outra variante em file.
// A luz real requer o módulo Tagmar FX ativo nos clientes.
const config = ${JSON.stringify({file, mode, scale, duration, radius, tintEnabled, tint, lightEnabled, lightBright, lightDim, lightColor}, null, 2)};

if (!game.modules.get('sequencer')?.active || typeof Sequence !== 'function') {
  return ui.notifications.warn('Ative Sequencer para executar esta macro.');
}
if (game.settings.get('core', 'photosensitiveMode')) {
  return ui.notifications.warn('O modo de fotossensibilidade está ativo para você.');
}
if (!canvas?.ready) return ui.notifications.warn('Abra uma cena.');
if (!Sequencer.Database.publicFlattenedSimpleEntries.includes(config.file)) {
  return ui.notifications.warn('Animação ausente na biblioteca instalada.');
}
const selected = canvas.tokens.controlled;
if (selected.length !== 1 || (!game.user.isGM && !selected[0].document.isOwner)) {
  return ui.notifications.warn('Selecione exatamente um token que você controla.');
}
const source = selected[0];
let targets = config.mode === 'self' ? [source] : canvas.tokens.placeables.filter(t => game.user.targets.has(t));
if (config.mode === 'projectile') targets = targets.filter(t => t.id !== source.id
  && Math.hypot(t.center.x - source.center.x, t.center.y - source.center.y) > 0);
if (!targets.length) return ui.notifications.warn('Marque um alvo válido em outra posição.');

${styleAnimation.toString()}

const sequence = new Sequence();
for (const target of targets) {
  styleAnimation(sequence.effect().file(config.file).name('tagmar-token-fx:macro:jb2a'), config, source, target);
}
await sequence.play();
`;
}

export function animationStatus(game, sequencer, SequenceClass) {
  if (!game.modules.get('sequencer')?.active || !sequencer?.Database || typeof SequenceClass !== 'function') {
    return 'Instale e ative Sequencer para usar animações JB2A.';
  }
  if (!['JB2A_DnD5e', 'jb2a_patreon'].some(id => game.modules.get(id)?.active)) {
    return 'Ative JB2A (gratuito ou Patreon) neste mundo.';
  }
  return '';
}

export function animationChoices(sequencer) {
  return [...new Set((sequencer?.Database?.publicFlattenedSimpleEntries ?? [])
    .filter(path => typeof path === 'string' && path.startsWith('jb2a.')))].sort();
}

export async function playAnimation(item, config, {game, canvas, sequencer, SequenceClass, user = game.user, test = false, area = null, sourceToken = null}) {
  const skip = message => {
    if (test) throw new Error(message);
    return 0;
  };
  if (!config.enabled) return skip('Ative a animação JB2A deste item.');
  const unavailable = animationStatus(game, sequencer, SequenceClass);
  if (unavailable) return skip(unavailable);
  if (game.settings.get(MODULE_ID, 'jb2aEnabled') === false) return skip('A integração JB2A está desligada nas configurações do Tagmar FX.');
  if (game.settings.get('core', 'photosensitiveMode')) return skip('O modo de fotossensibilidade está ativo para você; o Sequencer respeita essa proteção.');
  if (!canvas?.ready || !canvas.scene?.id) return skip('Abra uma cena com tokens.');
  if (!item.isOwner || !item.actor?.isOwner) return skip('Use um item de um personagem que você controla.');
  if (!config.file || !animationChoices(sequencer).includes(config.file)) return skip('Escolha uma animação disponível na biblioteca JB2A instalada.');

  let source=sourceToken;
  try { if(!source) [source] = destinationTokens(item, 'self', canvas, user); }
  catch (error) { return skip(error.message); }
  const sceneId = canvas.scene.id;
  if(config.mode==='area') {
    if(!validVisualArea(area))return skip('Configure e posicione a área da magia para exibir a animação nela.');
    config={...config,area};
  }
  let targets = [source];
  if (config.mode !== 'self' && config.mode !== 'area') {
    const ids = new Set(Array.from(user.targets ?? [], token => token.id));
    targets = (canvas.tokens?.placeables ?? []).filter(token => ids.has(token.id));
    if (config.mode === 'projectile') {
      targets = targets.filter(token => token.id !== source.id && token.center && source.center
        && Math.hypot(token.center.x - source.center.x, token.center.y - source.center.y) > 0);
    }
    if (!targets.length) return skip('Marque outro token, em uma posição diferente, como alvo da animação.');
  }
  // Capturados no começo da execução; não consultar uma seleção que pode mudar depois.
  if (!test && config.mode !== 'projectile' && config.timeMode === 'calendar') {
    return startTimedAnimation(item, config, {game, canvas, source, targets});
  }
  const sequence = new SequenceClass();
  for (const target of targets) {
    const effect = sequence.effect().file(config.file).name(`${prefixFor(item)}jb2a`);
    styleAnimation(effect, config, source, target);
  }
  if (canvas.scene?.id !== sceneId) return 0;
  await sequence.play();
  return targets.length;
}

export async function clearAnimations(items, {canvas, sequencer}) {
  for (const item of items) {
    if (item.getFlag(MODULE_ID, 'activeJb2a') && item.isOwner) await item.unsetFlag(MODULE_ID, 'activeJb2a');
    if (canvas?.ready && sequencer?.EffectManager) await sequencer.EffectManager.endEffects({name: `${prefixFor(item)}jb2a`, sceneId: canvas.scene.id});
  }
}
