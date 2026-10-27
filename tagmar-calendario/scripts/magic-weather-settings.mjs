import {CONDITIONS, WIND_DIRECTIONS} from './weather.mjs';
import {durationLabel, magicWeatherState, magicDuration} from './magic-weather.mjs';

export function magicWeatherFields({scene, date, worldTime, weather, enabled = true}) {
  const state = magicWeatherState(scene, date, worldTime);
  const current = weather ?? {condition:'clear',temperature:20,wind:0,windDirection:0};
  const options = (entries, selected) => Object.entries(entries).map(([value,label]) =>
    `<option value="${value}" ${String(value) === String(selected) ? 'selected' : ''}>${Array.isArray(label) ? label[0] : label}</option>`).join('');
  const remaining = state.active ? Math.ceil(state.remaining / 60) : 60;
  return `<fieldset class="tagmar-magic-weather"><legend>✨ Clima alterado por magia</legend>
    <p>${state.active ? `Magia ativa · restam ${durationLabel(state.remaining)}.` : 'Nenhuma alteração mágica ativa nesta cena.'}</p>
    <p class="hint">Duração pelo relógio do calendário. Ao terminar, o clima anterior retorna suavemente e volta a evoluir. Dia, noite e marés continuam normalmente.</p>
    ${!enabled ? '<p class="notification warning">Clima desativado globalmente: a magia será registrada, mas só aparecerá ao reativar o clima.</p>' : ''}
    <div class="form-group"><label for="magic-condition">Clima</label><select id="magic-condition" name="magicCondition">${options(CONDITIONS,current.condition)}</select></div>
    <div class="form-group"><label for="magic-temperature">Temperatura (°C)</label><input id="magic-temperature" name="magicTemperature" type="number" min="-80" max="65" value="${current.temperature}"></div>
    <div class="form-group"><label for="magic-wind">Vento (km/h)</label><input id="magic-wind" name="magicWind" type="number" min="0" max="150" value="${current.wind}"></div>
    <div class="form-group"><label for="magic-direction">Vindo de</label><select id="magic-direction" name="magicDirection">${options(WIND_DIRECTIONS,(Math.round((current.windDirection ?? 0)/45)%8)*45)}</select></div>
    <div class="form-group"><label>Duração <span title="Tempo de jogo. O relógio pausado também pausa a duração. Aplicar novamente substitui a magia atual.">(?)</span></label><div class="form-fields">
      <input aria-label="Horas de duração" name="magicHours" type="number" min="0" max="8760" step="1" value="${Math.floor(remaining/60)}"><span>h</span>
      <input aria-label="Minutos de duração" name="magicMinutes" type="number" min="0" max="59" step="1" value="${remaining%60}"><span>min</span></div></div>
    <p class="hint">Somente nesta cena. Mapas internos não recebem partículas; os controles globais e os efeitos visuais da cena continuam sendo respeitados. O mestre define os efeitos da magia, sem cálculo automático de nível.</p>
    </fieldset>`;
}

export function magicWeatherInput(form) {
  const value = name => form.elements.namedItem(name).value;
  return {duration:magicDuration(value('magicHours'),value('magicMinutes')),
    weather:{condition:value('magicCondition'),temperature:Number(value('magicTemperature')),
      wind:Number(value('magicWind')),windDirection:Number(value('magicDirection'))}};
}
