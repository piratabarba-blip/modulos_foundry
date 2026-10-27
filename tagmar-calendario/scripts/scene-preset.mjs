// Default scene automation. Does not change time, geography or mechanical rules.
const ID = 'tagmar-calendario';
export const flagBoolean = value => value === true || value === 'true' || value === 'on';
export const isIndoor = data => flagBoolean(data?.indoor) || data?.biome === 'interior';
export function normalizeDayNight(data = {}) {
  return {...data, enabled:data.enabled === undefined ? true : flagBoolean(data.enabled),
    latitude:Number.isFinite(Number(data.latitude)) ? Math.min(90,Math.max(-90,Number(data.latitude))) : 0};
}
export function presetSceneChanges(scene) {
  const climate = scene.getFlag(ID,'climate') ?? {};
  return {
    [`flags.${ID}.dayNight`]:{...scene.getFlag(ID,'dayNight'),enabled:true},
    [`flags.${ID}.climate`]:{...climate,indoor:isIndoor(climate),mode:'auto',visualEffects:true,tides:true}
  };
}
function leader(game) {
  const first=game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)[0];
  return game.user?.isGM && first?.id===game.user.id;
}
// One-time, resumable application explicitly requested for existing scenes.
// Snapshot stored BEFORE writing any scene; subsequent logins never reset user choices.
export async function applyScenePreset(game) {
  if(!leader(game) || game.settings.get(ID,'scenePresetVersion')>=1)return {applied:0};
  const scenes=Array.from(game.scenes??[]);
  let backup=structuredClone(game.settings.get(ID,'scenePresetBackup')??{});
  if(!backup.scenes)backup={dayNightEnabled:game.settings.get(ID,'dayNightEnabled'),scenes:{},done:[]};
  backup.done??=[];
  for(const scene of scenes) {
    if(!Object.hasOwn(backup.scenes,scene.id))backup.scenes[scene.id]={
      dayNight:structuredClone(scene.getFlag(ID,'dayNight')??null),
      climate:structuredClone(scene.getFlag(ID,'climate')??null),
      weather:scene.weather??'',darknessLevel:scene.environment?.darknessLevel??null
    };
  }
  await game.settings.set(ID,'scenePresetBackup',backup);
  let applied=0;
  for(const scene of scenes) {
    if(!leader(game))return {applied};
    if(backup.done.includes(scene.id))continue;
    await scene.update(presetSceneChanges(scene),{tagmarScenePreset:true});
    backup.done.push(scene.id);applied++;
    await game.settings.set(ID,'scenePresetBackup',structuredClone(backup));
  }
  if(!leader(game))return {applied};
  // O preset das cenas nunca reativa um interruptor global desligado pelo mestre.
  await game.settings.set(ID,'scenePresetVersion',1);
  return {applied};
}
