import {BIOMES, CONDITIONS, WEATHER_MODES, WIND_DIRECTIONS, normalizeClimate, weatherState, adventureRegion} from "./weather.mjs";
import {LUNAR_DEFAULT_WEIGHTS} from "./lunar.mjs";
import {normalizeDayNight} from './scene-preset.mjs';

const ID = "tagmar-calendario";
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function sceneEnvironmentMarkup(scene,world=globalThis.game?.world) {
  const c = normalizeClimate(scene.getFlag(ID, "climate"));
  const solar = normalizeDayNight(scene.getFlag(ID, "dayNight"));
  const prefix = `flags.${ID}.climate.`;
  let fieldIndex = 0;
  const field = (label, input) => {
    const id = `tagmar-env-${String(scene.id ?? "new").replace(/[^a-zA-Z0-9_-]/g, "")}-${fieldIndex++}`;
    return `<div class="form-group tagmar-environment-field"><label for="${id}">${label}</label>${input.replace(/<(input|select) /, `<$1 id="${id}" `)}</div>`;
  };
  const select = (key, label, choices) => field(label, `<select name="${prefix}${key}">${Object.entries(choices).map(([value, name]) => `<option value="${value}" ${String(c[key]) === value ? "selected" : ""}>${esc(name)}</option>`).join("")}</select>`);
  const input = (key, label, min, max, step = 1) => field(label, `<input name="${prefix}${key}" type="number" data-dtype="Number" min="${min}" max="${max}" step="${step}" value="${c[key]}">`);
  const check = (key, label) => field(label, `<input name="${prefix}${key}" type="checkbox" ${c[key] ? "checked" : ""}>`);
  const latitude = Number.isFinite(Number(solar.latitude)) ? Math.min(90, Math.max(-90, Number(solar.latitude))) : 0;
  return `<legend>Tagmar — Ambiente, clima e marés</legend>
    <p class="hint">Preset padrão: dia/noite, clima automático, efeitos visuais e marés ligados. Simulação de ambientação, sem regras mecânicas. Salve a cena para aplicar; o calendário mostra os dados da cena ativa.</p>
    ${check("indoor", "Mapa interno — somente dia e noite")}
    <p class="hint">Mapa interno mantém somente dia/noite aplicado ao mapa, sem efeitos meteorológicos. O calendário continua mostrando clima e marés como referência externa. Seus parâmetros e a trava nativa de escuridão são preservados.</p>
    ${select("biome", "Bioma", Object.fromEntries(Object.entries(BIOMES).map(([k,v]) => [k,v.label])))}
    <p class="hint">Lago, oceano/região costeira e mar aberto têm perfis próprios de clima. As marés são uma referência regional disponível também em mapas terrestres; não significam que existe água na cena.</p>
    ${field("Latitude (0° = Calco / Equador)", `<input name="flags.${ID}.dayNight.latitude" type="number" data-dtype="Number" min="-90" max="90" step="0.1" value="${latitude}">`)}
    ${input("altitude", "Altitude (metros)", -500, 9000)}
    ${field("Aventura / região climática (automática)", `<input name="${prefix}region" type="text" readonly value="${esc(adventureRegion(world))}">`)}
    <p class="hint">Usa sempre o título do mundo no Foundry. Cenas da mesma aventura e com as mesmas condições geográficas compartilham o clima. Bioma, latitude e altitude ainda podem gerar diferenças locais. Norte: latitude positiva; Sul: negativa.</p>
    ${field("Dia/noite automático nesta cena", `<input name="flags.${ID}.dayNight.enabled" type="checkbox" ${solar.enabled ? "checked" : ""}>`)}
    <p class="hint">A luz exige a opção global do calendário, ligada por padrão. Mapa interno mantém dia/noite; para escuridão fixa, desmarque esta opção ou use a trava nativa.</p>
    <div class="tagmar-outdoor-settings">
    ${select("mode", "Controle do clima", WEATHER_MODES)}
    ${check("visualEffects", "Sincronizar efeitos visuais com o clima")}
    <p class="hint">Ligado por padrão, somente na cena ativa: chuva, tempestade, neblina e neve usam efeitos nativos. Céu limpo/nublado remove o efeito. Não combine com outro controlador. Mapa interno retira o efeito meteorológico nativo; desmarcar retoma o clima configurado. Ao desligar a sincronização num mapa externo, restaura o efeito anterior se ele ainda for o aplicado pelo calendário. Não inclui sons nem relâmpagos adicionais.</p>
    <div class="tagmar-manual-weather">
      ${select("condition", "Condição manual", Object.fromEntries(Object.entries(CONDITIONS).map(([k,v]) => [k,v[0]])))}
      ${input("temperature", "Temperatura manual (°C)", -80, 65)}
      ${input("wind", "Vento manual (km/h)", 0, 150)}
      ${select("windDirection", "Vento vindo de (manual)", WIND_DIRECTIONS)}
      <p class="hint">A direção indica a origem: NE vem do nordeste e segue para sudoeste. No modo automático ela varia suavemente; Manter clima atual congela também a direção. Não gira os efeitos visuais nativos.</p>
    </div>
    <p class="hint">Automático varia ao longo das horas e estações. Manual mantém os valores escolhidos. Manter clima atual congela a condição ao salvar; as marés continuam seguindo o tempo.</p>
    ${check("coastal", "Região costeira")}
    <p class="hint">Clima e marés ficam sempre visíveis no calendário, mesmo sem efeitos no mapa. Desligar o controle do clima mantém a referência automática no HUD. A maré é informativa; não altera água, tokens ou terreno.</p>
    <div class="tagmar-tide-settings">
      <p class="hint">As marés sempre seguem a influência das três luas, com referência em Cruine de 1500 às 00:00.</p>
      ${input("tideRange", "Amplitude em relação ao nível médio (± metros)", 0.1, 10, 0.1)}
      <div class="tagmar-lunar-tides">
        ${input("moonAgmarim", "Influência de Agmarim", 0, 10, 0.1)}
        ${input("moonArmina", "Influência de Armina", 0, 10, 0.1)}
        ${input("moonDenegria", "Influência de Denégria", 0, 10, 0.1)}
        ${input("tideLag", "Atraso local das marés (horas)", 0, 12, 0.25)}
        <button type="button" class="tagmar-reset-lunar-weights">Restaurar influências padrão</button>
        <p class="hint">Padrões de ambientação: Agmarim 2,1; Armina 0,6; Denégria 0,3 (70%, 20%, 10% do máximo combinado). Não são massas ou tamanhos oficiais. Ajustes salvos são preservados; o botão restaura apenas as três influências neste formulário e exige salvar a cena. Zero remove a contribuição daquela lua. Cada ponto produz até 1/3 da amplitude acima. Luas alinhadas, inclusive em lados opostos, podem reforçar a maré. Atraso local desloca a resposta da água, não o céu. Para ver as luas por horário no círculo, ative Posição das luas no céu nas configurações do módulo.</p>
      </div>
    </div>
    <p class="hint">Região costeira altera apenas o perfil climático. As marés do calendário são uma referência permanente. Simulação de ambientação, não regra oficial nem previsão de navegação. Não informa profundidade navegável.</p></div>`;
}

export function renderSceneEnvironment(app, element, isGM) {
  if (!isGM || !app.document) return;
  const root = element?.querySelector ? element : element?.[0];
  // A navegação também possui data-tab="environment". Injete apenas no
  // painel de conteúdo: anexar campos ao link quebra a barra de abas.
  const selector = '.tab[data-group="sheet"][data-tab="environment"]';
  const tab = root?.matches?.(selector) ? root : root?.querySelector(selector);
  if (!tab || tab.querySelector(".tagmar-scene-environment")) return;
  const section = tab.ownerDocument.createElement("fieldset");
  section.className = "tagmar-scene-environment";
  section.innerHTML = sceneEnvironmentMarkup(app.document);
  tab.prepend(section);
  const update = () => {
    const mode = section.querySelector('[name$=".mode"]').value;
    const indoor = section.querySelector('[name$=".indoor"]').checked;
    section.querySelector(".tagmar-manual-weather").hidden = mode !== "manual";
    section.querySelector('.tagmar-outdoor-settings').hidden=indoor;
  };
  section.querySelector('[name$=".indoor"]').addEventListener('change',event=>{
    const biome=section.querySelector('[name$=".biome"]');
    if(!event.target.checked && biome.value==='interior')biome.value='plains';
  });
  section.querySelector('[name$=".biome"]').addEventListener('change',event=>{
    if(event.target.value==='interior')section.querySelector('[name$=".indoor"]').checked=true;
  });
  section.addEventListener("change", update);
  section.querySelector('.tagmar-reset-lunar-weights').addEventListener('click', () => {
    for (const [key,value] of Object.entries(LUNAR_DEFAULT_WEIGHTS)) {
      section.querySelector(`[name$=".${key}"]`).value=value;
    }
  });
  update();
}

// Aceita mudanças expandidas e achatadas do formulário/API. Só modifica flags próprias.
export function prepareEnvironmentUpdate(scene, changes, date, worldTime, isGM,world=globalThis.game?.world) {
  const prefix = `flags.${ID}.`;
  const own = {...changes.flags?.[ID]};
  for (const [key, value] of Object.entries(changes)) {
    if (!key.startsWith(prefix)) continue;
    const [group, field] = key.slice(prefix.length).split(".");
    if (!["climate", "dayNight"].includes(group)) continue;
    own[group] = field ? {...own[group], [field]: value} : value;
  }
  if (!own.climate && !own.dayNight) return;
  if (!isGM) return false;
  const previous = scene.getFlag(ID, "climate") ?? {};
  const solar = normalizeDayNight({...scene.getFlag(ID, "dayNight"), ...own.dayNight});
  const climate = normalizeClimate({...previous, ...own.climate});
  climate.region=adventureRegion(world);
  if (climate.mode === "hold" && (previous.mode !== "hold" || !climate.hold)) {
    const old = {...normalizeClimate(previous),region:adventureRegion(world)};
    const origin = old.mode === "off" || old.indoor ? {...climate, indoor:false, biome:climate.biome==='interior'?'plains':climate.biome, mode: "auto"} : {...old, mode: old.mode === "manual" ? "manual" : "auto"};
    climate.hold = weatherState({config: origin,
      latitude: scene.getFlag(ID, "dayNight")?.latitude ?? solar.latitude,
      absoluteDay: date.absoluteDay, secondsToday: worldTime, sceneId: scene.id});
    // Uma cena antes desligada/interior usa o novo ambiente para a captura.
    climate.hold ??= weatherState({config: {...climate, mode: "auto"}, latitude: solar.latitude,
      absoluteDay: date.absoluteDay, secondsToday: worldTime, sceneId: scene.id});
    if (climate.hold) climate.hold = {condition: climate.hold.condition, temperature: climate.hold.temperature, wind: climate.hold.wind,windDirection:climate.hold.windDirection};
  }
  for (const key of Object.keys(changes)) {
    if (key === `${prefix}climate` || key.startsWith(`${prefix}climate.`) || key === `${prefix}dayNight` || key.startsWith(`${prefix}dayNight.`)) delete changes[key];
  }
  changes.flags ??= {};
  changes.flags[ID] = {...changes.flags[ID]};
  if (own.climate) changes.flags[ID].climate = climate;
  if (own.dayNight) changes.flags[ID].dayNight = {
    ...solar, latitude: Number.isFinite(Number(solar.latitude)) ? Math.min(90, Math.max(-90, Number(solar.latitude))) : 0,
    enabled: solar.enabled === true || solar.enabled === "true" || solar.enabled === "on"
  };
}
