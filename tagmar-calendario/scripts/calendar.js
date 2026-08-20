const MODULE_ID = "tagmar-calendario";
const DAY_SECONDS = 86400;
const YEAR_DAYS = 361;

const MONTHS = [
  ["Mês do Conflito", "Blator", "Verão"],
  ["Mês da Água", "Ganis", "Verão"],
  ["Mês da Paz", "Selimom", "Verão"],
  ["Mês da Semente", "Sevides", "Outono"],
  ["Mês do Ouro", "Cambu", "Outono"],
  ["Mês do Talento", "Parom", "Outono"],
  ["Mês da Paixão", "Plandis", "Inverno"],
  ["Mês do Sangue", "Crezir", "Inverno"],
  ["Mês da Sabedoria", "Palier", "Inverno"],
  ["Mês da Rosa", "Lena", "Primavera"],
  ["Mês da Vida", "Maira", "Primavera"],
  ["Mês da Justiça", "Crisagom", "Primavera"]
];

const WEEKDAYS = ["Anaesi", "Basvo", "Calcato", "Moldio", "Sagaeti", "Saverieto", "Sivonte"];
const PHASES = ["Nova", "Crescente inicial", "Quarto crescente", "Gibosa crescente", "Cheia", "Gibosa minguante", "Quarto minguante", "Minguante final"];
const PHASE_ICONS = ["●", "◔", "◑", "◕", "○", "◕", "◑", "◔"];

const SPECIAL_DATES = {
  "1-2": [["Festival da Bênção Militar", "Blator", true]],
  "1-12": [["Amor da Deusa", "Crezir"]],
  "1-17": [["Adoração a Maira Mon", "Maira"]],
  "2-1": [["Dia do Mar", "Ganis", true]],
  "2-5": [["Jejum da Piedade", "Blator"]],
  "2-11": [["Festa da Carne", "Lena"]],
  "2-15": [["Solstício de Verão", "Astronômico", true]],
  "2-19": [["Culto à Elevação", "Palier"]],
  "3-5": [["Condecoração Póstuma", "Blator"]],
  "3-9": [["Vitória da Justiça", "Crisagom"]],
  "3-15": [["Festa da Prosperidade", "Ganis e Sevides"]],
  "3-20": [["Dia do Amor e Paz", "Selimom", true]],
  "4-2": [["Adoração a Maira Vet", "Maira"]],
  "4-7": [["Festa da Fertilidade", "Sevides", true]],
  "4-13": [["Festa da Purificação de Parom", "Parom"]],
  "4-30": [["Festa da Fartura", "Sevides e Cambu"]],
  "5-1": [["Festa da Fartura", "Sevides e Cambu"]],
  "5-9": [["Dia das Ilusões", "Plandis"]],
  "5-15": [["Equinócio", "Astronômico", true]],
  "5-21": [["Dia da Multiplicação", "Cambu", true]],
  "6-20": [["Jornada da Paz", "Selimom"]],
  "6-24": [["Festa dos Artífices", "Parom", true]],
  "6-30": [["Festa da Colheita", "Liris"]],
  "7-1": [["Noite dos Prazeres", "Lena"]],
  "7-13": [["Batismo de Fogo", "Crezir"]],
  "7-19": [["Representação de Plandis", "Plandis", true]],
  "8-3": [["Festival de Renascimento de Maira", "Maira"]],
  "8-9": [["Festa da Iluminação", "Plandis"]],
  "8-15": [["Solstício de Inverno", "Astronômico", true]],
  "8-23": [["Oferenda de Sangue", "Crezir", true]],
  "9-4": [["Memorial dos Ancestrais", "Crisagom"]],
  "9-6": [["Dia da Magia", "Palier", true]],
  "9-20": [["Adoração a Maira Nil", "Maira"]],
  "10-1": [["Festa do Plantio", "Quiris"]],
  "10-12": [["Festa dos Amantes", "Lena", true]],
  "10-27": [["Festa da Vitória", "Blator"]],
  "11-13": [["Culto à Tríade", "Maira", true]],
  "11-15": [["Equinócio", "Astronômico", true]],
  "11-26": [["Dia da Sobra", "Ganis"]],
  "12-16": [["Festa dos Povos", "Selimom"]],
  "12-27": [["Noite do Entendimento entre os Povos", "Cambu"]],
  "12-29": [["Noite dos Justos", "Crisagom", true]],
  "cruine": [["Festa do Ciclo Natural da Vida", "Cruine", true]]
};

let calendarApp;
let hudInteractionActive = false;
let hudRefreshPending = false;
let playbackTimer;
let playbackRemainder = 0;
let playbackBusy = false;
let lastCalendarSecond;
const PLAYBACK_RATES = [0.25, 0.5, 1, 2, 4];

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function phaseFor(dayIndex, cycle) {
  const progress = modulo(dayIndex, cycle) / cycle;
  const index = Math.floor(progress * 8) % 8;
  return { name: PHASES[index], icon: PHASE_ICONS[index], progress };
}

function eventsFor(monthIndex, day, isCruine = false) {
  const entries = SPECIAL_DATES[isCruine ? "cruine" : `${monthIndex + 1}-${day}`] ?? [];
  return entries.map(([name, deity, major = false]) => ({ name, deity, major }));
}

function customEventKey(year, monthIndex, day, isCruine = false) {
  return isCruine ? `${year}-cruine` : `${year}-${monthIndex + 1}-${day}`;
}

function customEventsFor(year, monthIndex, day, isCruine = false) {
  const all = game.settings.get(MODULE_ID, "customEvents") ?? {};
  return (all[customEventKey(year, monthIndex, day, isCruine)] ?? []).map(event => ({
    ...event,
    name: `${String(event.hour).padStart(2, "0")}:${String(event.minute).padStart(2, "0")}:${String(event.second ?? 0).padStart(2, "0")} — ${event.message}${event.authorName ? ` — ${event.authorName}` : ""}`,
    deity: "Mensagem agendada",
    major: true,
    custom: true
  }));
}

function primaryActiveGM() {
  return game.users.filter(user => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0];
}

async function storeCustomEvent(data, userId) {
  if (!game.user.isGM) return { ok: false, message: "Somente o mestre pode gravar avisos." };
  const user = game.users.get(userId);
  if (!user) return { ok: false, message: "Autor da mensagem não encontrado." };
  const year = Number(data.year);
  const month = Math.clamp(Number(data.month), 1, 13);
  const day = Math.clamp(Number(data.day), 1, 30);
  const hour = Math.clamp(Number(data.hour), 0, 23);
  const minute = Math.clamp(Number(data.minute), 0, 59);
  const second = Math.clamp(Number(data.second), 0, 59);
  const message = String(data.message ?? "").trim().slice(0, 500);
  if (!Number.isFinite(year) || !message) return { ok: false, message: "Data ou mensagem inválida." };
  const key = month === 13 ? `${year}-cruine` : `${year}-${month}-${day}`;
  const all = foundry.utils.deepClone(game.settings.get(MODULE_ID, "customEvents") ?? {});
  all[key] ??= [];
  const occupied = all[key].some(event => Number(event.hour) === hour && Number(event.minute) === minute && Number(event.second ?? 0) === second);
  if (occupied) return { ok: false, message: `Já existe uma mensagem às ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")} nesse dia.` };
  all[key].push({ id: foundry.utils.randomID(), message, hour, minute, second, authorId: user.id, authorName: user.name });
  all[key].sort((a, b) => (a.hour * 3600 + a.minute * 60 + (a.second ?? 0)) - (b.hour * 3600 + b.minute * 60 + (b.second ?? 0)));
  await game.settings.set(MODULE_ID, "customEvents", all);
  return { ok: true, message: "Mensagem agendada com sucesso." };
}

async function requestCustomEvent(data) {
  if (game.user.isGM) {
    const result = await storeCustomEvent(data, game.user.id);
    ui.notifications[result.ok ? "info" : "warn"](result.message);
    return;
  }
  const gm = primaryActiveGM();
  if (!gm) return ui.notifications.warn("É necessário um mestre conectado para agendar a mensagem.");
  game.socket.emit(`module.${MODULE_ID}`, { type: "request-add-event", userId: game.user.id, data });
  ui.notifications.info("Solicitação de mensagem enviada ao mestre.");
}

function eventCalendarSecond(key, event) {
  const epochYear = game.settings.get(MODULE_ID, "epochYear");
  const parts = key.split("-");
  const year = Number(parts[0]);
  const dayOfYear = parts[1] === "cruine" ? 360 : (Number(parts[1]) - 1) * 30 + Number(parts[2]) - 1;
  return ((year - epochYear) * YEAR_DAYS + dayOfYear) * DAY_SECONDS + event.hour * 3600 + event.minute * 60 + Number(event.second ?? 0);
}

function notifyReachedMessages() {
  const date = getCalendarDate();
  const now = date.absoluteDay * DAY_SECONDS + modulo(game.time.worldTime ?? 0, DAY_SECONDS);
  if (lastCalendarSecond === undefined || now <= lastCalendarSecond || now - lastCalendarSecond > DAY_SECONDS) {
    lastCalendarSecond = now;
    return;
  }
  const all = game.settings.get(MODULE_ID, "customEvents") ?? {};
  for (const [key, events] of Object.entries(all)) {
    for (const event of events) {
      const target = eventCalendarSecond(key, event);
      if (target > lastCalendarSecond && target <= now) ui.notifications.info(`📅 ${event.message}${event.authorName ? ` — ${event.authorName}` : ""}`);
    }
  }
  lastCalendarSecond = now;
}

async function advanceWorldTime(seconds) {
  if (!game.user.isGM) return;
  await game.time.advance(seconds);
}

function datePickerMarkup(id, current, withMessage = false) {
  const monthOptions = MONTHS.map(([name], index) => `<option value="${index + 1}" ${current.monthIndex === index ? "selected" : ""}>${index + 1} — ${name}</option>`).join("");
  return `
    <div id="${id}" class="tagmar-date-picker">
      <div class="picker-navigation">
        <button type="button" data-picker-nav="-1" data-tooltip="Mês anterior"><i class="fa-solid fa-chevron-left"></i></button>
        <select name="month">${monthOptions}<option value="13" ${current.isCruine ? "selected" : ""}>13 — Dia de Cruine</option></select>
        <input name="year" type="number" value="${current.year}" aria-label="Ano">
        <button type="button" data-picker-nav="1" data-tooltip="Próximo mês"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="picker-subtitle"></div>
      <div class="picker-weekdays">${WEEKDAYS.map(day => `<span>${day.slice(0, 3)}</span>`).join("")}</div>
      <div class="picker-days"></div>
      <input name="day" type="hidden" value="${current.day ?? 1}">
      <div class="picker-time">
        <label>Horário</label>
        <input name="hour" type="number" min="0" max="23" value="${current.time.slice(0, 2)}" aria-label="Hora">
        <b>:</b>
        <input name="minute" type="number" min="0" max="59" value="${current.time.slice(3, 5)}" aria-label="Minuto">
        <b>:</b>
        <input name="second" type="number" min="0" max="59" value="${current.time.slice(6, 8)}" aria-label="Segundo">
        <small>hora&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;min&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;seg</small>
      </div>
      ${withMessage ? '<div class="picker-scheduled"></div><div class="picker-message"><label>Nova mensagem</label><textarea name="message" rows="3" required placeholder="Ex.: Reunião com o Conselho"></textarea></div>' : ""}
    </div>`;
}

function activateDatePicker(id) {
  let attempts = 0;
  const waiting = setInterval(() => {
    const root = document.getElementById(id);
    if (!root && attempts++ < 100) return;
    clearInterval(waiting);
    if (!root) return;
    const monthInput = root.querySelector('[name="month"]');
    const yearInput = root.querySelector('[name="year"]');
    const dayInput = root.querySelector('[name="day"]');
    const grid = root.querySelector(".picker-days");
    const subtitle = root.querySelector(".picker-subtitle");
    const weekdays = root.querySelector(".picker-weekdays");
    const scheduled = root.querySelector(".picker-scheduled");

    const renderScheduled = () => {
      if (!scheduled) return;
      scheduled.replaceChildren();
      const year = Number(yearInput.value);
      const month = Number(monthInput.value);
      const day = Number(dayInput.value);
      const key = month === 13 ? `${year}-cruine` : `${year}-${month}-${day}`;
      const events = game.settings.get(MODULE_ID, "customEvents")?.[key] ?? [];
      if (!events.length) return;
      const title = document.createElement("strong");
      title.textContent = "Mensagens já agendadas";
      scheduled.append(title);
      for (const event of events) {
        const row = document.createElement("div");
        const text = document.createElement("span");
        text.textContent = `${String(event.hour).padStart(2, "0")}:${String(event.minute).padStart(2, "0")}:${String(event.second ?? 0).padStart(2, "0")} — ${event.message} — ${event.authorName ?? "Autor desconhecido"}`;
        row.append(text);
        if (game.user.isGM) {
          const remove = document.createElement("button");
          remove.type = "button";
          remove.innerHTML = '<i class="fa-solid fa-trash"></i>';
          remove.title = "Apagar mensagem";
          remove.addEventListener("click", async () => {
            const all = foundry.utils.deepClone(game.settings.get(MODULE_ID, "customEvents") ?? {});
            all[key] = (all[key] ?? []).filter(item => item.id !== event.id);
            if (!all[key].length) delete all[key];
            await game.settings.set(MODULE_ID, "customEvents", all);
            renderScheduled();
          });
          row.append(remove);
        }
        scheduled.append(row);
      }
    };

    const render = () => {
      const year = Number(yearInput.value);
      const month = Math.clamp(Number(monthInput.value), 1, 13);
      const isCruine = month === 13;
      grid.replaceChildren();
      weekdays.hidden = isCruine;
      if (isCruine) {
        dayInput.value = 1;
        subtitle.textContent = "Cruine · Renovação · transição entre os anos";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "picker-cruine selected special";
        button.innerHTML = '<i class="fa-solid fa-star"></i><strong>Dia de Cruine</strong><small>Festa do Ciclo Natural da Vida</small>';
        grid.append(button);
        renderScheduled();
        return;
      }
      const [monthName, deity, season] = MONTHS[month - 1];
      subtitle.textContent = `${monthName} · ${deity} · ${season}`;
      const epochYear = game.settings.get(MODULE_ID, "epochYear");
      const firstWeekday = modulo((year - epochYear) * YEAR_DAYS + (month - 1) * 30, 7);
      for (let blank = 0; blank < firstWeekday; blank++) grid.append(document.createElement("span"));
      for (let day = 1; day <= 30; day++) {
        const events = [...eventsFor(month - 1, day), ...customEventsFor(year, month - 1, day)];
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.day = day;
        button.textContent = day;
        button.classList.toggle("selected", Number(dayInput.value) === day);
        button.classList.toggle("special", events.length > 0);
        button.title = events.map(event => event.name).join(" · ");
        button.addEventListener("click", () => {
          dayInput.value = day;
          render();
        });
        grid.append(button);
      }
      renderScheduled();
    };

    root.querySelectorAll("[data-picker-nav]").forEach(button => button.addEventListener("click", () => {
      let month = Number(monthInput.value) + Number(button.dataset.pickerNav);
      let year = Number(yearInput.value);
      if (month < 1) { month = 13; year--; }
      if (month > 13) { month = 1; year++; }
      monthInput.value = month;
      yearInput.value = year;
      dayInput.value = 1;
      render();
    }));
    monthInput.addEventListener("change", () => { dayInput.value = 1; render(); });
    yearInput.addEventListener("change", render);
    render();
  }, 20);
}

function getCalendarDate() {
  const worldSeconds = Math.floor(game.time.worldTime ?? 0);
  const epochYear = game.settings.get(MODULE_ID, "epochYear");
  const epochOffset = game.settings.get(MODULE_ID, "epochOffset");
  const absoluteDay = Math.floor(worldSeconds / DAY_SECONDS) + epochOffset;
  const secondsToday = modulo(worldSeconds, DAY_SECONDS);
  const yearDelta = Math.floor(absoluteDay / YEAR_DAYS);
  const dayOfYear = modulo(absoluteDay, YEAR_DAYS);
  const isCruine = dayOfYear === 360;
  const monthIndex = isCruine ? null : Math.floor(dayOfYear / 30);
  const day = isCruine ? null : modulo(dayOfYear, 30) + 1;
  const hour = Math.floor(secondsToday / 3600);
  const minute = Math.floor((secondsToday % 3600) / 60);
  const second = secondsToday % 60;
  const month = isCruine ? null : MONTHS[monthIndex];

  return {
    absoluteDay,
    year: epochYear + yearDelta,
    dayOfYear,
    displayDayOfYear: dayOfYear + 1,
    isCruine,
    monthIndex,
    day,
    monthName: month?.[0] ?? "Entre os Anos",
    monthLabel: isCruine ? "Cruine" : month[0].replace("Mês do ", "").replace("Mês da ", ""),
    displayDay: isCruine ? "—" : day,
    deity: month?.[1] ?? "Cruine",
    season: month?.[2] ?? "Renovação",
    weekday: isCruine ? "Dia da Renovação" : WEEKDAYS[modulo(absoluteDay, 7)],
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`,
    dayRotation: isCruine ? 0 : -((day - 1) * 12),
    monthRotation: isCruine ? -345 : -(monthIndex * 30),
    agmarim: phaseFor(absoluteDay, 28),
    armina: phaseFor(absoluteDay, 90),
    denegria: phaseFor(absoluteDay, 361)
  };
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class TagmarCalendarApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "tagmar-calendar",
    classes: ["tagmar-calendar"],
    tag: "section",
    position: { width: 360, height: 470 },
    window: {
      title: "Tagmar — Grande Calendário",
      icon: "fa-solid fa-calendar-days",
      minimizable: true,
      resizable: false
    },
    actions: {
      previousDay: TagmarCalendarApp.#previousDay,
      nextDay: TagmarCalendarApp.#nextDay,
      previousHour: TagmarCalendarApp.#previousHour,
      nextHour: TagmarCalendarApp.#nextHour,
      previousMonth: TagmarCalendarApp.#previousMonth,
      nextMonth: TagmarCalendarApp.#nextMonth,
      setDate: TagmarCalendarApp.#setDate,
      addMessage: TagmarCalendarApp.#addMessage,
      togglePlayback: TagmarCalendarApp.#togglePlayback,
      cycleSpeed: TagmarCalendarApp.#cycleSpeed,
      toggleCollapsed: TagmarCalendarApp.#toggleCollapsed,
      closeCalendar: TagmarCalendarApp.#closeCalendar
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/calendar.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const date = getCalendarDate();
    const officialEvents = eventsFor(date.monthIndex, date.day, date.isCruine);
    const customEvents = customEventsFor(date.year, date.monthIndex, date.day, date.isCruine);
    const currentEvents = [...officialEvents, ...customEvents];
    const playbackRate = game.settings.get(MODULE_ID, "playbackRate");
    const collapsed = game.settings.get(MODULE_ID, "hudCollapsed");
    return {
      ...context,
      ...date,
      currentEvents,
      hasEvents: currentEvents.length > 0,
      dayStatus: currentEvents.length ? currentEvents.map(event => event.name).join(" · ") : "Dia comum",
      playbackRunning: game.settings.get(MODULE_ID, "playbackRunning"),
      playbackRate,
      playbackRateLabel: `${String(playbackRate).replace("0.25", "¼").replace("0.5", "½")}×`,
      collapsed,
      canControl: game.user.isGM,
      days: Array.from({ length: 30 }, (_, index) => {
        const official = date.isCruine ? [] : eventsFor(date.monthIndex, index + 1);
        const custom = date.isCruine ? [] : customEventsFor(date.year, date.monthIndex, index + 1);
        const events = [...official, ...custom];
        return {
          number: index + 1,
          angle: index * 12,
          active: !date.isCruine && date.day === index + 1,
          events,
          special: events.length > 0,
          major: events.some(event => event.major)
        };
      })
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.classList.add("hud-mode");
    this.element.classList.toggle("collapsed-mode", game.settings.get(MODULE_ID, "hudCollapsed"));
    this.#applyHudGeometry();
    this.#activateHudDrag();
    this.#activateHudResize();
  }

  #geometry() {
    const width = Math.clamp(Number(game.settings.get(MODULE_ID, "hudWidth")) || 360, 320, 720);
    const scale = width / 360;
    const baseHeight = game.settings.get(MODULE_ID, "hudCollapsed") ? 160 : 470;
    const height = baseHeight * scale;
    const storedLeft = Number(game.settings.get(MODULE_ID, "hudLeft"));
    const storedTop = Number(game.settings.get(MODULE_ID, "hudTop"));
    const left = storedLeft < 0 ? 14 : Math.clamp(storedLeft, 0, Math.max(0, window.innerWidth - width));
    const top = storedTop < 0 ? Math.max(0, window.innerHeight - height - 64) : Math.clamp(storedTop, 0, Math.max(0, window.innerHeight - height));
    return { width, height, scale, baseHeight, left, top };
  }

  #applyHudGeometry(geometry = this.#geometry()) {
    const style = this.element.style;
    style.setProperty("--hud-scale", geometry.scale);
    style.setProperty("left", `${geometry.left}px`, "important");
    style.setProperty("top", `${geometry.top}px`, "important");
    style.setProperty("bottom", "auto", "important");
    style.setProperty("width", `${geometry.width}px`, "important");
    style.setProperty("height", `${geometry.height}px`, "important");
  }

  #activateHudDrag() {
    const handle = this.element.querySelector(".hud-drag-handle");
    if (!handle) return;
    handle.addEventListener("pointerdown", event => {
      event.preventDefault();
      hudInteractionActive = true;
      handle.setPointerCapture(event.pointerId);
      const start = this.#geometry();
      const originX = event.clientX;
      const originY = event.clientY;
      const move = moveEvent => {
        const left = Math.clamp(start.left + moveEvent.clientX - originX, 0, Math.max(0, window.innerWidth - start.width));
        const top = Math.clamp(start.top + moveEvent.clientY - originY, 0, Math.max(0, window.innerHeight - start.height));
        this.#applyHudGeometry({ ...start, left, top });
      };
      const finish = async upEvent => {
        if (handle.hasPointerCapture(upEvent.pointerId)) handle.releasePointerCapture(upEvent.pointerId);
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", finish);
        handle.removeEventListener("pointercancel", finish);
        const rect = this.element.getBoundingClientRect();
        await game.settings.set(MODULE_ID, "hudLeft", Math.round(rect.left));
        await game.settings.set(MODULE_ID, "hudTop", Math.round(rect.top));
        hudInteractionActive = false;
        if (hudRefreshPending) {
          hudRefreshPending = false;
          this.render({ force: true });
        }
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", finish);
    });
  }

  #activateHudResize() {
    const handle = this.element.querySelector(".hud-resize-handle");
    if (!handle) return;
    handle.addEventListener("pointerdown", event => {
      event.preventDefault();
      hudInteractionActive = true;
      handle.setPointerCapture(event.pointerId);
      const start = this.#geometry();
      const originX = event.clientX;
      const move = moveEvent => {
        const width = Math.clamp(start.width + moveEvent.clientX - originX, 320, 720);
        const scale = width / 360;
        this.#applyHudGeometry({ ...start, width, height: start.baseHeight * scale, scale });
      };
      const finish = async upEvent => {
        if (handle.hasPointerCapture(upEvent.pointerId)) handle.releasePointerCapture(upEvent.pointerId);
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", finish);
        handle.removeEventListener("pointercancel", finish);
        await game.settings.set(MODULE_ID, "hudWidth", Math.round(this.element.getBoundingClientRect().width));
        hudInteractionActive = false;
        if (hudRefreshPending) {
          hudRefreshPending = false;
          this.render({ force: true });
        }
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", finish);
    });
  }

  static #previousDay() { return advanceWorldTime(-DAY_SECONDS); }
  static #nextDay() { return advanceWorldTime(DAY_SECONDS); }
  static #previousHour() { return advanceWorldTime(-3600); }
  static #nextHour() { return advanceWorldTime(3600); }
  static #previousMonth() {
    const date = getCalendarDate();
    return advanceWorldTime(-(date.isCruine ? 30 : date.monthIndex === 0 ? 31 : 30) * DAY_SECONDS);
  }
  static #nextMonth() {
    const date = getCalendarDate();
    return advanceWorldTime((date.isCruine ? 1 : date.monthIndex === 11 ? 31 : 30) * DAY_SECONDS);
  }
  static async #togglePlayback() {
    if (!game.user.isGM) return;
    await game.settings.set(MODULE_ID, "playbackRunning", !game.settings.get(MODULE_ID, "playbackRunning"));
  }
  static async #cycleSpeed() {
    if (!game.user.isGM) return;
    const current = game.settings.get(MODULE_ID, "playbackRate");
    const index = PLAYBACK_RATES.indexOf(current);
    await game.settings.set(MODULE_ID, "playbackRate", PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]);
  }
  static async #toggleCollapsed() {
    await game.settings.set(MODULE_ID, "hudCollapsed", !game.settings.get(MODULE_ID, "hudCollapsed"));
  }
  static #closeCalendar() { return this.close(); }

  static async #addMessage() {
    const current = getCalendarDate();
    const pickerId = `tagmar-message-picker-${foundry.utils.randomID()}`;
    const prompt = foundry.applications.api.DialogV2.prompt({
      window: { title: "Agendar mensagem no calendário" },
      content: datePickerMarkup(pickerId, current, true),
      ok: {
        label: "Agendar mensagem",
        callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      }
    });
    activateDatePicker(pickerId);
    const result = await prompt;
    if (!result?.message?.trim()) return;
    const year = Number(result.year);
    const month = Math.clamp(Number(result.month), 1, 13);
    const day = Math.clamp(Number(result.day), 1, 30);
    await requestCustomEvent({
      year,
      month,
      day,
      message: String(result.message).trim(),
      hour: Math.clamp(Number(result.hour), 0, 23),
      minute: Math.clamp(Number(result.minute), 0, 59),
      second: Math.clamp(Number(result.second), 0, 59)
    });
  }

  static async #setDate() {
    if (!game.user.isGM) return;
    const current = getCalendarDate();
    const pickerId = `tagmar-date-picker-${foundry.utils.randomID()}`;
    const prompt = foundry.applications.api.DialogV2.prompt({
      window: { title: "Definir data de Tagmar" },
      content: datePickerMarkup(pickerId, current),
      ok: {
        label: "Aplicar data e horário",
        callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      }
    });
    activateDatePicker(pickerId);
    const result = await prompt;
    if (!result) return;
    const year = Number(result.year);
    const month = Math.clamp(Number(result.month), 1, 13);
    const day = Math.clamp(Number(result.day), 1, 30);
    const hour = Math.clamp(Number(result.hour), 0, 23);
    const minute = Math.clamp(Number(result.minute), 0, 59);
    const second = Math.clamp(Number(result.second), 0, 59);
    const epochYear = game.settings.get(MODULE_ID, "epochYear");
    const targetDay = (year - epochYear) * YEAR_DAYS + (month === 13 ? 360 : (month - 1) * 30 + day - 1);
    const worldSeconds = game.time.worldTime ?? 0;
    const secondsToday = modulo(worldSeconds, DAY_SECONDS);
    const targetSecondsToday = hour * 3600 + minute * 60 + second;
    await game.time.advance(targetSecondsToday - secondsToday);
    const resultingWorldDay = Math.floor((game.time.worldTime ?? 0) / DAY_SECONDS);
    await game.settings.set(MODULE_ID, "epochOffset", targetDay - resultingWorldDay);
  }
}

function openCalendar() {
  calendarApp ??= new TagmarCalendarApp();
  calendarApp.render({ force: true });
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "epochYear", {
    name: "Ano inicial de Tagmar",
    hint: "Ano correspondente ao instante zero do relógio mundial.",
    scope: "world",
    config: true,
    type: Number,
    default: 1500,
    restricted: true
  });
  game.settings.register(MODULE_ID, "epochOffset", {
    name: "Deslocamento interno do calendário",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    restricted: true,
    onChange: () => calendarApp?.render({ force: true })
  });
  game.settings.register(MODULE_ID, "customEvents", {
    name: "Mensagens agendadas do calendário",
    scope: "world",
    config: false,
    type: Object,
    default: {},
    restricted: true,
    onChange: () => calendarApp?.render({ force: true })
  });
  game.settings.register(MODULE_ID, "playbackRunning", {
    name: "Relógio automático ativo",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
    restricted: true,
    onChange: () => calendarApp?.render({ force: true })
  });
  game.settings.register(MODULE_ID, "playbackRate", {
    name: "Velocidade do relógio automático",
    scope: "world",
    config: false,
    type: Number,
    default: 1,
    restricted: true,
    onChange: () => calendarApp?.render({ force: true })
  });
  for (const [key, defaultValue, type] of [["hudLeft", -1, Number], ["hudTop", -1, Number], ["hudWidth", 360, Number], ["hudCollapsed", false, Boolean]]) {
    game.settings.register(MODULE_ID, key, {
      name: key,
      scope: "client",
      config: false,
      type,
      default: defaultValue,
      onChange: key === "hudCollapsed" ? () => calendarApp?.render({ force: true }) : undefined
    });
  }
});

Hooks.on("getSceneControlButtons", controls => {
  const tools = controls.tokens?.tools ?? controls.token?.tools;
  if (!tools) return;
  tools[MODULE_ID] = {
    name: MODULE_ID,
    title: "Grande Calendário de Tagmar",
    icon: "fa-solid fa-calendar-days",
    button: true,
    onChange: openCalendar
  };
});

Hooks.on("updateWorldTime", () => {
  if (hudInteractionActive) hudRefreshPending = true;
  else calendarApp?.render({ force: true });
  notifyReachedMessages();
});
Hooks.once("ready", () => {
  game.modules.get(MODULE_ID).api = { open: openCalendar, getDate: getCalendarDate };
  game.socket.on(`module.${MODULE_ID}`, async payload => {
    if (payload?.type === "event-result" && payload.userId === game.user.id) {
      ui.notifications[payload.result.ok ? "info" : "warn"](payload.result.message);
      return;
    }
    if (payload?.type !== "request-add-event" || !game.user.isGM || primaryActiveGM()?.id !== game.user.id) return;
    const result = await storeCustomEvent(payload.data, payload.userId);
    game.socket.emit(`module.${MODULE_ID}`, { type: "event-result", userId: payload.userId, result });
  });
  const initialDate = getCalendarDate();
  lastCalendarSecond = initialDate.absoluteDay * DAY_SECONDS + modulo(game.time.worldTime ?? 0, DAY_SECONDS);
  clearInterval(playbackTimer);
  playbackTimer = setInterval(async () => {
    if (!game.user.isGM || playbackBusy || !game.settings.get(MODULE_ID, "playbackRunning")) return;
    playbackRemainder += game.settings.get(MODULE_ID, "playbackRate");
    const seconds = Math.floor(playbackRemainder);
    if (seconds < 1) return;
    playbackRemainder -= seconds;
    playbackBusy = true;
    try {
      await game.time.advance(seconds);
    } finally {
      playbackBusy = false;
    }
  }, 1000);
});
