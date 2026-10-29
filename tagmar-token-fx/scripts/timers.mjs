import {MODULE_ID, prefixFor} from './core.mjs';
import {validVisualArea} from './area-animation.mjs';
const DAY = 86400;
export const TIME_UNITS = {seconds: 1, minutes: 60, hours: 3600, days: DAY};

export function calendarNow(game) {
  const calendar = game.modules.get('tagmar-calendario');
  if (!calendar?.active || typeof calendar.api?.getDate !== 'function') return null;
  const date = calendar.api.getDate();
  const time = Number(game.time?.worldTime);
  if (![date?.year, date?.dayOfYear, time].every(Number.isFinite)) return null;
  return (date.year * 361 + date.dayOfYear) * DAY + ((time % DAY) + DAY) % DAY;
}

export async function startTimedAnimation(item, config, {game, canvas, source, targets}) {
  const now = calendarNow(game);
  if (now === null) throw new Error('Ative o Grande Calendário de Tagmar para usar duração no tempo do jogo.');
  const seconds = Number(config.gameDuration) * TIME_UNITS[config.gameUnit];
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 365 * DAY) throw new Error('Informe uma duração de jogo maior que zero, de até 365 dias.');
  await item.setFlag(MODULE_ID, 'activeJb2a', {
    id: globalThis.foundry.utils.randomID(), startsAt: now, endsAt: now + seconds,
    sceneId: canvas.scene.id, sourceId: source.id, targets: targets.map(token => token.id), config,
    ...(config.mode==='area'?{area:config.area}:{})
  });
  return targets.length;
}

export function validTimer(timer) {
  return timer && typeof timer.id === 'string' && /^[a-zA-Z0-9]{8,32}$/.test(timer.id)
    && Number.isFinite(timer.startsAt) && Number.isFinite(timer.endsAt)
    && timer.endsAt > timer.startsAt && timer.endsAt - timer.startsAt <= 365 * DAY
    && typeof timer.sceneId === 'string' && Array.isArray(timer.targets) && timer.targets.length <= 100
    && (timer.config?.mode!=='area'||validVisualArea(timer.area));
}

// Os prazos ficam no item, não na memória do navegador. Cada cliente desenha seu próprio visual
// temporário; Sequencer não grava efeitos persistentes nem precisa dar permissão sobre o inimigo.
export function createTimerController({getGame, getCanvas, getSequencer, getSequence, normalize, style, onError = console.error}) {
  const items = new Map(), shown = new Map();
  let queue = Promise.resolve();
  const remember = item => {
    if (!item?.uuid) return;
    if (validTimer(item.getFlag(MODULE_ID, 'activeJb2a'))) items.set(item.uuid, item);
    else items.delete(item.uuid);
  };
  function rescan() {
    items.clear();
    const game = getGame();
    for (const actor of game.actors?.contents ?? []) for (const item of actor.items ?? []) remember(item);
    for (const scene of game.scenes?.contents ?? []) for (const token of scene.tokens ?? []) {
      if (token.actorLink) continue;
      for (const item of token.actor?.items ?? []) remember(item);
    }
  }
  async function synchronize() {
    const game = getGame(), canvas = getCanvas(), sequencer = getSequencer(), Sequence = getSequence();
    const now = calendarNow(game);
    const wanted = new Map();
    const gm = [...(game.users ?? [])].filter(user => user.active && user.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
    for (const [uuid, item] of items) {
      const timer = item.getFlag(MODULE_ID, 'activeJb2a');
      if (!validTimer(timer)) { items.delete(uuid); continue; }
      if (now !== null && now >= timer.endsAt) {
        if (game.user?.isGM && gm?.id === game.user.id) {
          // Releia antes de remover: um novo uso pode ter renovado a magia.
          if (item.getFlag(MODULE_ID, 'activeJb2a')?.id === timer.id) await item.unsetFlag(MODULE_ID, 'activeJb2a');
          items.delete(uuid);
        }
        continue;
      }
      if (now === null || now < timer.startsAt || !canvas?.ready || canvas.scene?.id !== timer.sceneId
        || !game.modules.get('sequencer')?.active || typeof Sequence !== 'function'
        || game.settings.get(MODULE_ID, 'jb2aEnabled') === false || game.settings.get('core', 'photosensitiveMode')) continue;
      const config = normalize({getFlag: () => timer.config});
      if (!['self','targets','area'].includes(config.mode) || !sequencer?.Database?.publicFlattenedSimpleEntries?.includes(config.file)) continue;
      if(config.mode==='area')config.area=timer.area;
      const targets = config.mode==='area'?[{id:'area'}]:(canvas.tokens?.placeables ?? []).filter(token => timer.targets.includes(token.id)
        && (game.user.isGM || !token.document.hidden));
      if (!targets.length) continue;
      const name = `${prefixFor(item)}timer:${timer.id}`;
      wanted.set(name, {timer, config, targets, fingerprint: targets.map(t => t.id).sort().join(',')});
    }
    if (!sequencer?.EffectManager) { shown.clear(); return; }
    for (const [name, previous] of shown) {
      const next = wanted.get(name);
      if (!next || (previous.fingerprint !== null && next.fingerprint !== previous.fingerprint)) {
        await sequencer.EffectManager.endEffects({name, sceneId: previous.sceneId}, false);
        shown.delete(name);
      }
    }
    for (const [name, {timer, config, targets, fingerprint}] of wanted) {
      const existing = sequencer.EffectManager.getEffects?.({name, sceneId: timer.sceneId});
      if (existing?.length || shown.has(name)) {
        shown.set(name, {sceneId: timer.sceneId, fingerprint});
        continue;
      }
      const sequence = new Sequence();
      for (const target of targets) {
        const effect = sequence.effect().file(config.file).name(name);
        const styled=style(effect, config, target, target, true);
        if(config.mode!=='area')styled.attachTo(target);
        styled.persist().temporary();
      }
      // A réplica é local e nunca cria flags de persistência do Sequencer.
      shown.set(name, {sceneId: timer.sceneId, fingerprint});
      // A promessa de um efeito persistente só termina quando ele é encerrado.
      // Não bloqueie a fila responsável justamente por encerrar esse efeito.
      try { void Promise.resolve(sequence.play({local: true})).catch(error => { shown.delete(name); onError(error); }); }
      catch (error) { shown.delete(name); throw error; }
    }
  }
  const sync = () => { queue = queue.then(synchronize).catch(onError); return queue; };
  return {sync, refresh() { rescan(); return sync(); }, update(item) { remember(item); return sync(); },
    remove(item) { items.delete(item.uuid); return sync(); }, resetScene() { shown.clear(); return this.refresh(); },
    effectCreated(effect) {
      const {name, sceneId} = effect?.data ?? {};
      if (!name?.startsWith(`${MODULE_ID}:`) || !name.includes(':timer:')) return;
      // Um arquivo lento pode terminar de carregar depois de expirar ou trocar de cena.
      if (!shown.has(name)) shown.set(name, {sceneId, fingerprint: null});
      return sync();
    }};
}
