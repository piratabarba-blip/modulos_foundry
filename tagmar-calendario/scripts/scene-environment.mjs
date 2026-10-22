import {BIOMES, CONDITIONS, WEATHER_MODES, normalizeClimate, weatherState} from "./weather.mjs";

const ID = "tagmar-calendario";
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function sceneEnvironmentMarkup(scene) {
  const c = normalizeClimate(scene.getFlag(ID, "climate"));
  const solar = scene.getFlag(ID, "dayNight") ?? {};
  const prefix = `flags.${ID}.climate.`;
  let fieldIndex = 0;
  const field = (label, input) => {
    const id = `tagmar-env-${String(scene.id ?? "new").replace(/[^a-zA-Z0-9_-]/g, "")}-${fieldIndex++}`;
    return `<div class="form-group tagmar-environment-field"><label for="${id}">${label}</label>${input.replace(/<(input|select) /, `<$1 id="${id}" `)}</div>`;
  };
  const select = (key, label, choices) => field(label, `<select name="${prefix}${key}">${Object.entries(choices).map(([value, name]) => `<option value="${value}" ${c[key] === value ? "selected" : ""}>${esc(name)}</option>`).join("")}</select>`);
  const input = (key, label, min, max, step = 1) => field(label, `<input name="${prefix}${key}" type="number" data-dtype="Number" min="${min}" max="${max}" step="${step}" value="${c[key]}">`);
  const check = (key, label) => field(label, `<input name="${prefix}${key}" type="checkbox" ${c[key] ? "checked" : ""}>`);
  const latitude = Number.isFinite(Number(solar.latitude)) ? Math.min(90, Math.max(-90, Number(solar.latitude))) : 0;
  return `<legend>Tagmar — Ambiente, clima e marés</legend>
    <p class="hint">Simulação opcional de ambientação, sem regras mecânicas. Salve a configuração da cena para aplicar. Os dados aparecem no calendário da cena ativa, não apenas da cena visualizada.</p>
    ${select("biome", "Bioma", Object.fromEntries(Object.entries(BIOMES).map(([k,v]) => [k,v.label])))}
    <p class="hint">Lago, oceano/região costeira e mar aberto têm perfis próprios de clima. O bioma não liga as marés nem altera suas opções salvas. Para mostrar marés como referência do litoral, marque Região costeira e Mostrar marés abaixo.</p>
    ${field("Latitude (0° = Calco / Equador)", `<input name="flags.${ID}.dayNight.latitude" type="number" data-dtype="Number" min="-90" max="90" step="0.1" value="${latitude}">`)}
    ${input("altitude", "Altitude (metros)", -500, 9000)}
    ${field("Região climática (opcional)", `<input name="${prefix}region" type="text" maxlength="80" value="${esc(c.region)}" placeholder="Ex.: litoral-de-calco">`)}
    <p class="hint">Mesma região e mesmas condições geográficas geram o mesmo clima. Sem nome, cada cena tem sua própria sequência. Norte: latitude positiva; Sul: negativa. A altitude é adicional ao bioma.</p>
    ${field("Dia/noite automático nesta cena", `<input name="flags.${ID}.dayNight.enabled" type="checkbox" ${solar.enabled ? "checked" : ""}>`)}
    <p class="hint">A luz também exige a opção global do calendário. Interior/subterrâneo suspende dia/noite, clima e marés, sem apagar suas preferências.</p>
    ${select("mode", "Controle do clima", WEATHER_MODES)}
    ${check("visualEffects", "Sincronizar efeitos visuais com o clima")}
    <p class="hint">Opcional, somente na cena ativa: chuva, tempestade, neblina e neve usam efeitos nativos. Céu limpo/nublado remove o efeito. Enquanto ligado, o calendário controla o clima visual da cena inteira; não combine com outro controlador. Ao desligar, desativar o clima ou escolher Interior, restaura o efeito anterior se ele ainda for o aplicado pelo calendário. Não inclui sons nem relâmpagos adicionais.</p>
    <div class="tagmar-manual-weather">
      ${select("condition", "Condição manual", Object.fromEntries(Object.entries(CONDITIONS).map(([k,v]) => [k,v[0]])))}
      ${input("temperature", "Temperatura manual (°C)", -80, 65)}
      ${input("wind", "Vento manual (km/h)", 0, 150)}
    </div>
    <p class="hint">Automático varia ao longo das horas e estações. Manual mantém os valores escolhidos. Manter clima atual congela a condição ao salvar; as marés continuam seguindo o tempo.</p>
    ${check("coastal", "Região costeira")}
    ${check("tides", "Mostrar marés")}
    <div class="tagmar-tide-settings">
      ${field("Intervalo entre preamares (minutos)", `<input name="${prefix}tidePeriodMinutes" type="number" data-dtype="Number" min="360" max="1800" step="1" value="${Math.round(c.tidePeriod * 60)}">`)}
      ${input("tideHigh", "Hora da preamar no dia zero do calendário", 0, 23.99, "any")}
      ${input("tideRange", "Amplitude em relação ao nível médio (± metros)", 0.1, 10, 0.1)}
    </div>
    <p class="hint">Marés: onda periódica fictícia ajustável, sem prever as três luas. O padrão é 12h25 entre preamares; a referência inicial é 06:00 no dia zero do calendário (relógio mundial zero, deslocamento zero). Não informa profundidade navegável.</p>`;
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
    const coastal = section.querySelector('[name$=".coastal"]').checked;
    const tides = section.querySelector('[name$=".tides"]').checked;
    section.querySelector(".tagmar-manual-weather").hidden = mode !== "manual";
    section.querySelector(".tagmar-tide-settings").hidden = !coastal || !tides;
  };
  section.addEventListener("change", update);
  update();
}

// Aceita mudanças expandidas e achatadas do formulário/API. Só modifica flags próprias.
export function prepareEnvironmentUpdate(scene, changes, date, worldTime, isGM) {
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
  const solar = {...scene.getFlag(ID, "dayNight"), ...own.dayNight};
  const climate = normalizeClimate({...previous, ...own.climate});
  if (climate.mode === "hold" && (previous.mode !== "hold" || !climate.hold)) {
    const old = normalizeClimate(previous);
    const origin = old.mode === "off" || old.biome === "interior" ? {...climate, mode: "auto"} : {...old, mode: old.mode === "manual" ? "manual" : "auto"};
    climate.hold = weatherState({config: origin,
      latitude: scene.getFlag(ID, "dayNight")?.latitude ?? solar.latitude,
      absoluteDay: date.absoluteDay, secondsToday: worldTime, sceneId: scene.id});
    // Uma cena antes desligada/interior usa o novo ambiente para a captura.
    climate.hold ??= weatherState({config: {...climate, mode: "auto"}, latitude: solar.latitude,
      absoluteDay: date.absoluteDay, secondsToday: worldTime, sceneId: scene.id});
    if (climate.hold) climate.hold = {condition: climate.hold.condition, temperature: climate.hold.temperature, wind: climate.hold.wind};
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
