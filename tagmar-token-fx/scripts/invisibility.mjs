// A condição pertence ao ActiveEffect da magia. O Foundry combina condições de
// efeitos independentes e retira somente esta fonte ao desativá-la ou apagá-la.
// Nunca alterar hidden, alpha, permissões ou a condição manual do personagem.
export const invisibleStatus = () => globalThis.CONFIG?.specialStatusEffects?.INVISIBLE ?? 'invisible';

export function spellStatuses(config, active = true) {
  return config.invisible === true && active ? [invisibleStatus()] : [];
}

export function invisibilityChange(effect, active) {
  if (effect.getFlag('tagmar-token-fx', 'spellTimer')?.invisible !== true) return {};
  const status = invisibleStatus();
  const statuses = new Set(effect.statuses ?? []);
  if (active) statuses.add(status);
  else statuses.delete(status);
  return {statuses: [...statuses]};
}
