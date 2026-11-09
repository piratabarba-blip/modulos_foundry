// SPDX-License-Identifier: GPL-3.0-or-later
// Pure travel model. Hours and kilometres, never Foundry world time.
export const TYPES = {foot: "A pé", mount: "Montaria / carga", cart: "Carroça", ship: "Embarcação"};
export const FACTORS = {
  difficulty: [[1,"Fácil"],[0.85,"Médio"],[0.65,"Difícil"],[0.45,"Muito difícil"],[0.25,"Absurdo"]],
  pace: [[0.8,"Cauteloso"],[1,"Normal"],[1.2,"Apressado"]],
  load: [[1,"Leve"],[0.8,"Carregado"],[0.6,"Muito carregado"]],
  fatigue: [[1,"Descansado"],[0.8,"Cansado"],[0.5,"Exausto"]]
};
const EPS = 1e-9;
export const clone = value => structuredClone(value);
export function id() {
  if(typeof globalThis.foundry?.utils?.randomID==='function')return globalThis.foundry.utils.randomID();
  if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();
  // getRandomValues remains available on HTTP LAN games where randomUUID is absent.
  if(typeof globalThis.crypto?.getRandomValues==='function')return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
  throw Error('Não foi possível criar o identificador da viagem. Reabra pelo Foundry.');
}
export function number(value, label, min=0, max=1e7) {
  if ((typeof value === "string" && !value.trim()) || value === null || typeof value === "boolean") throw Error(`${label}: informe um número.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw Error(`${label}: use um valor entre ${min} e ${max}.`);
  return n;
}
export function parameters(data) {
  if (!Object.hasOwn(TYPES, data.type)) throw Error("Transporte inválido.");
  if (!["vb", "kmh"].includes(data.speedMode)) throw Error("Unidade de velocidade inválida.");
  const result = {...data};
  result.base = number(data.base, "VB / velocidade", 0, 10000);
  result.work = number(data.work, "Horas de deslocamento por dia", 0.01, 24);
  for (const key of Object.keys(FACTORS)) result[key] = number(data[key], key, 0, 5);
  result.animals = number(data.animals ?? 0, "Animais", 0, 1000);
  if (!Number.isInteger(result.animals)) throw Error("Quantidade de animais deve ser inteira.");
  result.size = String(data.size || "Médio").slice(0, 40);
  result.name = String(data.name || TYPES[data.type]).trim().slice(0, 120);
  return result;
}
export function speed(data) {
  const p = parameters(data);
  return p.base * (p.speedMode === "vb" ? 0.24 : 1) * p.pace * p.difficulty * p.load * p.fatigue;
}
export function defaultProfiles() {
  return Object.entries(TYPES).map(([type,name]) => ({
    id: `default-${type}`, name, type, speedMode: type === "ship" ? "kmh" : "vb",
    base: type === "ship" ? 8 : 20, work: type === "ship" ? 24 : 8,
    pace: 1, difficulty: 1, load: 1, fatigue: 1, size: "Médio", animals: type === "cart" ? 2 : type === "mount" ? 1 : 0
  }));
}
export function segment(profile, distance=50) {
  return {...parameters(clone(profile)), id:id(), distance, wait:0};
}
export function progress() { return {km:0, moving:0, resting:0, waiting:0, cycle:0}; }
export function trip(name="Nova viagem") {
  return {id:id(), name, departureDay:1, departureTime:"10:00", dateLabel:"", segments:[], progress:{}, elapsed:0, paused:false, history:[]};
}
export function example() {
  const t=trip("Expedição: estrada, carroça e mar");
  const p=defaultProfiles();
  t.segments=[segment(p[0],250),segment(p[2],1000),segment(p[3],5000)];
  t.segments[1].wait=2; t.segments[2].wait=12;
  return t;
}
export function validate(t) {
  number(t.departureDay,"Dia de partida",1,1e7);
  if (!Number.isInteger(Number(t.departureDay))) throw Error("Dia de partida deve ser inteiro.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.departureTime)) throw Error("Horário de partida inválido.");
  if (!Array.isArray(t.segments) || t.segments.length>100) throw Error("Use até 100 trechos por viagem.");
  const ids=new Set();
  for (const s of t.segments) {
    if (!s.id || ids.has(s.id)) throw Error("Identificador de trecho repetido ou ausente.");
    ids.add(s.id); parameters(s); number(s.distance,"Distância"); number(s.wait,"Espera",0,1e6);
  }
  return t;
}
export function complete(s,p=progress()) { return p.km >= s.distance-EPS && (p.waitSkipped || p.waiting >= s.wait-EPS); }
export function totals(t) {
  let distance=0, done=0, moving=0, resting=0, waiting=0;
  for(const s of t.segments) {
    const p=t.progress[s.id]??progress();
    distance+=s.distance; done+=p.km; moving+=p.moving; resting+=p.resting; waiting+=p.waiting;
  }
  return {distance,done,remaining:Math.max(0,distance-done),moving,resting,waiting};
}
export function currentStage(t) {
  const index=t.segments.findIndex(s=>!complete(s,t.progress[s.id]));
  if(index<0)return {finished:t.segments.length>0,name:t.segments.length?'Viagem concluída':'Adicione um trecho',label:t.segments.length?'Chegada':'Sem roteiro',untilNext:null};
  const s=t.segments[index],p=t.progress[s.id]??progress(),v=speed(s);
  const base={index:index+1,name:s.name,type:s.type,done:p.km,remaining:Math.max(0,s.distance-p.km),speed:v,finished:false};
  if(!p.waitSkipped&&p.waiting<s.wait-EPS)return {...base,label:'Espera antes de partir',untilNext:s.wait-p.waiting};
  if(v<=EPS)return {...base,label:'Deslocamento bloqueado',untilNext:null};
  const cycle=p.cycle>=24-EPS?0:p.cycle;
  if(cycle>=s.work-EPS)return {...base,label:'Descanso',untilNext:24-cycle};
  return {...base,label:'Em deslocamento',untilNext:Math.min(s.work-cycle,Math.max(0,s.distance-p.km)/v)};
}
// Every segment starts its own work/rest cycle. Waiting is before its first work period.
// Whole cycles are skipped arithmetically: even extremely long trips stay bounded.
function consume(t, budget) {
  let left=budget, blocked=null;
  for (const s of t.segments) {
    const p=t.progress[s.id]??=progress();
    if (complete(s,p)) continue;
    const waiting=p.waitSkipped?0:Math.min(left, Math.max(0,s.wait-p.waiting));
    p.waiting+=waiting; t.elapsed+=waiting; left-=waiting;
    if (left<=EPS) break;
    const v=speed(s);
    if (s.distance-p.km>EPS && v<=EPS) {blocked=`${s.name}: velocidade efetiva zero.`;break;}
    let guard=0;
    while (!complete(s,p) && left>EPS) {
      if (++guard>12) throw Error("Não foi possível avançar este trecho com segurança.");
      let distance=s.distance-p.km;
      if (p.cycle>=24-EPS) p.cycle=0;
      if (p.cycle<=EPS && distance>v*s.work+EPS && left>=24) {
        // Leave the last cycle for normal processing: never rest after final arrival.
        const cycles=Math.min(Math.max(0,Math.ceil(distance/(v*s.work)-EPS)-1),Math.floor(left/24));
        if(cycles>0) {
          p.km+=cycles*v*s.work; p.moving+=cycles*s.work; p.resting+=cycles*(24-s.work);
          t.elapsed+=cycles*24; left-=cycles*24; distance=s.distance-p.km;
        }
      }
      if(left<=EPS)break;
      if(p.cycle < s.work-EPS) {
        const hours=Math.min(left,s.work-p.cycle,distance/v);
        p.km=Math.min(s.distance,p.km+hours*v); p.moving+=hours; p.cycle+=hours;
        t.elapsed+=hours; left-=hours;
      } else {
        const hours=Math.min(left,24-p.cycle);
        p.resting+=hours; p.cycle+=hours; t.elapsed+=hours; left-=hours;
      }
    }
    if(left<=EPS) break;
  }
  return {used: t.elapsed, unused:left, blocked, arrived:t.segments.length>0 && t.segments.every(s=>complete(s,t.progress[s.id]))};
}
export function checkpoint(t, label) {
  const {history,...before}=clone(t);
  t.history=[...(t.history??[]),{label,before}].slice(-20);
}
export function advance(input, hours) {
  validate(input); number(hours,"Horas a avançar",0.001,1e6);
  if(input.paused)throw Error("A viagem está pausada. Retome antes de avançar.");
  if(!input.segments.length)throw Error("Adicione pelo menos um trecho.");
  const t=clone(input), before=t.elapsed;
  checkpoint(t,`Avanço de ${hours} h`);
  const result=consume(t,hours); result.used=t.elapsed-before;
  if(result.used<=EPS) t.history=input.history??[];
  return {trip:t,...result};
}
// Clock reconciliation projects from a durable anchor, without one undo entry per tick.
// Correct position in kilometres without inventing movement/rest/waiting hours.
export function adjustDistance(input,km){
  validate(input);number(km,'Ajuste de distância',-1e7,1e7);
  if(!input.segments.length)throw Error('Adicione pelo menos um trecho.');
  const sum=totals(input),target=Math.max(0,Math.min(sum.distance,sum.done+Number(km)));
  const t=clone(input);if(Math.abs(target-sum.done)<=EPS)return t;
  checkpoint(t,`Posição ajustada em ${formatNumber(target-sum.done)} km (sem passar tempo)`);
  const oldIndex=currentStage(input).index;let left=target;
  for(const s of t.segments){
    const p=t.progress[s.id]??=progress();p.km=Math.max(0,Math.min(s.distance,left));
    if(left>EPS||(target>EPS&&target>=sum.distance-EPS))p.waitSkipped=true;else delete p.waitSkipped;
    left=Math.max(0,left-s.distance);
  }
  const newIndex=currentStage(t).index;
  if(newIndex!==oldIndex&&newIndex){for(let i=newIndex-1;i<t.segments.length;i++)(t.progress[t.segments[i].id]??=progress()).cycle=0;}
  return t;
}
export function started(t){return t.elapsed>EPS||totals(t).done>EPS;}
export function project(input,hours) {
  validate(input);number(hours,'Tempo do calendário',0,1e12);
  const t=clone(input);
  if(!t.paused&&t.segments.length&&hours>0)consume(t,hours);
  return t;
}
export function estimate(t) {
  validate(t);
  if(!t.segments.length)return {remaining:null,arrival:null,blocked:"Adicione trechos."};
  const projected=clone(t), before=t.elapsed;
  const result=consume(projected,Infinity);
  return {...totals(projected), remaining:result.blocked?null:projected.elapsed-before, arrival:result.blocked?null:projected.elapsed,
    blocked:result.blocked};
}
export function undo(input) {
  const t=clone(input), last=t.history.pop();
  if(!last)throw Error("Nada para desfazer.");
  return {...last.before,history:t.history};
}
export function duplicate(input) {
  const t=clone(input); t.id=id();t.name=`${t.name} (cópia)`;t.elapsed=0;t.progress={};t.history=[];t.paused=false;
  for(const s of t.segments)s.id=id();
  return t;
}
export function savePlan(input, candidate) {
  const t=clone(candidate); validate(t);
  if(started(input)) {
    if(t.departureDay!==input.departureDay || t.departureTime!==input.departureTime)throw Error("A partida fica fixa após o primeiro avanço.");
    if(t.segments.map(s=>s.id).join()!==input.segments.map(s=>s.id).join())throw Error("Após iniciar, não adicione, remova ou reordene trechos. Duplique para outro roteiro.");
    for(let i=0;i<input.segments.length;i++) {
      const old=input.segments[i], next=t.segments[i], p=input.progress[old.id]??progress();
      if(complete(old,p) && JSON.stringify(old)!==JSON.stringify(next))throw Error("Trechos concluídos não podem ser alterados.");
      if((p.km>EPS||p.moving+p.resting+p.waiting>EPS) && (next.distance!==old.distance || next.wait!==old.wait || next.work!==old.work)) {
        throw Error("No trecho iniciado, mantenha distância, espera e jornada. Ajuste somente a velocidade e os fatores restantes.");
      }
    }
  }
  t.progress=clone(input.progress);t.elapsed=input.elapsed;t.paused=input.paused;t.history=clone(input.history);
  checkpoint(t,"Edição do roteiro");
  // Undo must restore the old plan, not the newly edited one.
  const {history,...before}=clone(input); t.history.at(-1).before=before;
  return t;
}
export function formatNumber(n) {return Number(n).toLocaleString("pt-BR",{maximumFractionDigits:2});}
export function duration(hours) {
  if(hours===null || !Number.isFinite(hours))return "Indisponível";
  const minutes=Math.round(hours*60), days=Math.floor(minutes/1440), h=Math.floor(minutes%1440/60), m=minutes%60;
  return `${days?`${days}d `:""}${h}h ${String(m).padStart(2,"0")}min`;
}
export function arrival(t, hours) {
  if(hours===null)return "Indisponível";
  const [h,m]=t.departureTime.split(":").map(Number);
  const minutes=Math.round((Number(t.departureDay)-1)*1440+h*60+m+hours*60);
  return `Dia ${Math.floor(minutes/1440)+1}, ${String(Math.floor(minutes%1440/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
}
