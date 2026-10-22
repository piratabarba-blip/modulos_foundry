// Modelo opcional de ambientação. Reutiliza os ciclos já usados pelo calendário;
// não atribui massa, distância, órbita ou dimensões oficiais às luas.
export const MOONS = Object.freeze({agmarim:{name:'Agmarim',cycle:28}, armina:{name:'Armina',cycle:90}, denegria:{name:'Denégria',cycle:361}});
export const LUNAR_YEAR_DAYS = 361;
// Pesos de ambientação: 70%, 20%, 10% do máximo combinado. Soma 3 preserva
// a escala de amplitude anterior; não representa massas ou distâncias oficiais.
export const LUNAR_DEFAULT_WEIGHTS = Object.freeze({moonAgmarim:2.1,moonArmina:0.6,moonDenegria:0.3});
// Meia-noite INICIAL de Cruine de 1500, depois de 12 meses de 30 dias.
// Referência de campanha autorizada pelo responsável, não efeméride oficial.
export const LUNAR_EPOCH = Object.freeze({year:1500,dayOfYear:360,hour:0});
export function lunarCalendarDay(date={}) {
  if (Number.isFinite(date.year) && Number.isFinite(date.dayOfYear)) {
    return (date.year-LUNAR_EPOCH.year)*LUNAR_YEAR_DAYS+date.dayOfYear;
  }
  return finite(date.absoluteDay,0,-1e8,1e8);
}
const mod = (n,d) => ((n%d)+d)%d;
const finite = (n,fallback,min,max) => n !== '' && n !== null && Number.isFinite(Number(n)) ? Math.min(max,Math.max(min,Number(n))) : fallback;
export function lunarTime(absoluteDay=0, secondsToday=0) {
  return finite(absoluteDay,0,-1e8,1e8)*24 + mod(finite(secondsToday,0,-1e15,1e15),86400)/3600;
}
export function normalizeLunar(data={}) {
  return {tideModel:'lunar',
    ...Object.fromEntries(Object.entries(LUNAR_DEFAULT_WEIGHTS).map(([key,value])=>[key,finite(data?.[key],value,0,10)])),
    tideLag:finite(data?.tideLag,0,0,12)};
}
// Os ciclos escolhidos pelo responsável são SINÓDICOS (nova até nova).
// Órbitas circulares prógradas: 1/P_sidereal = 1/P_synodic + 1/ano.
// O dia de 24 h é solar; a rotação em relação às estrelas inclui 1/ano.
// Não inferimos massas, raios, estabilidade orbital ou coordenadas oficiais.
export function lunarOrbit(key, absoluteDay=0, secondsToday=0) {
  const moon=MOONS[key];
  if (!moon) return null;
  const days=lunarTime(absoluteDay,secondsToday)/24-LUNAR_EPOCH.dayOfYear;
  const orbitalRate=1/moon.cycle+1/LUNAR_YEAR_DAYS;
  const phaseProgress=mod(0.5+days/moon.cycle,1);
  const skyRate=1-1/moon.cycle;
  return {phasePeriodDays:moon.cycle,orbitalPeriodDays:1/orbitalRate,
    orbitalTurns:days*orbitalRate,orbitalProgress:mod(0.5+days*orbitalRate,1),
    solarProgress:mod(days/LUNAR_YEAR_DAYS,1),phaseProgress,
    illuminatedFraction:(1-Math.cos(phaseProgress*2*Math.PI))/2,
    phaseIndex:Math.round(phaseProgress*8)%8,
    // Equivale a rotação sideral menos translação lunar. A parcela anual cancela.
    skyRate,skyProgress:mod(days*skyRate,1),
    transitPeriodHours:24/skyRate,transitDelayMinutes:(24/skyRate-24)*60};
}
export function lunarSky(key, absoluteDay=0, secondsToday=0) {
  const orbit=lunarOrbit(key,absoluteDay,secondsToday);
  if (!orbit) return null;
  // Três luas cheias no alto em Cruine de 1500 às 00:00.
  const progress=orbit.skyProgress;
  const vertical=Math.cos(progress*2*Math.PI);
  const horizon=Math.abs(vertical)<0.015;
  const above=vertical>0;
  const label=horizon?'No horizonte':vertical>0.985?'No alto do céu':above?'Acima do horizonte':'Abaixo do horizonte';
  return {progress,above,horizon,label,orbit,
    detail:`${label} · Iluminação da face: ${(orbit.illuminatedFraction*100).toFixed(1)}%. Ciclo completo de fases: ${orbit.phasePeriodDays} dias. Volta orbital estimada: ${orbit.orbitalPeriodDays.toFixed(2)} dias. Intervalo entre passagens no alto: ${orbit.transitPeriodHours.toFixed(3)} h. Referência: Cruine de 1500, 00:00, três luas cheias no alto. Modelo circular equatorial prógrado, ano de 361 dias; sem inclinação orbital. Nuvens e luz do dia podem impedir observação; lua nova pode estar acima do horizonte sem ser visível.`};
}

export function lunarTideCurve(time, config={}) {
  const c=normalizeLunar(config);
  const amplitude=finite(config.tideRange,1,0.1,10)/3;
  const weights=[c.moonAgmarim,c.moonArmina,c.moonDenegria];
  let height=0,slope=0,curvature=0;
  Object.values(MOONS).forEach((moon,i)=>{
    // A mesma velocidade aparente de lunarOrbit; não usar o período sideral
    // diretamente com o dia solar, pois isso descontaria a órbita anual duas vezes.
    const rate=4*Math.PI*(1-1/moon.cycle)/24;
    // Duas elevações por volta: no alto e no lado oposto/abaixo do horizonte.
    const angle=mod(rate*(time-LUNAR_EPOCH.dayOfYear*24-c.tideLag),2*Math.PI);
    const a=amplitude*weights[i];
    height+=a*Math.cos(angle); slope-=a*rate*Math.sin(angle); curvature-=a*rate*rate*Math.cos(angle);
  });
  return {height,slope,curvature};
}

function nextExtremum(now,config) {
  // Busca limitada e refinamento por bisseção. Não presume ciclo único de 12h25.
  let left=now+1/3600, a=lunarTideCurve(left,config).slope;
  for(let i=0;i<432;i++) {
    let right=left+1/6;
    const b=lunarTideCurve(right,config).slope;
    if (a*b<0 || (b===0 && a!==0)) {
      const high=a>0;
      for(let j=0;j<28;j++) {
        const mid=(left+right)/2, s=lunarTideCurve(mid,config).slope;
        if ((s>0)===(a>0)) left=mid; else right=mid;
      }
      return {time:(left+right)/2,high};
    }
    left=right;a=b;
  }
  return null;
}

export function lunarTideState({config={},absoluteDay=0,secondsToday=0}={}) {
  const c=normalizeLunar(config), now=lunarTime(absoluteDay,secondsToday);
  const total=c.moonAgmarim+c.moonArmina+c.moonDenegria;
  const curve=lunarTideCurve(now,config), next=total>0?nextExtremum(now,config):null;
  const station=total>0 && Math.abs(curve.slope)<0.0001;
  const label=!total?'Sem influência lunar':station?(curve.curvature<0?'Maré alta':'Maré baixa'):curve.slope>0?'Maré enchendo':'Maré vazando';
  const minutes=next?Math.ceil((next.time*60)-1e-6):null;
  const nextDay=next?Math.floor(minutes/1440)-Math.floor(now/24):null;
  const clock=next?`${String(Math.floor(mod(minutes,1440)/60)).padStart(2,'0')}:${String(mod(minutes,60)).padStart(2,'0')}`:null;
  const event=next?(next.high?'Preamar':'Baixamar'):null;
  return {model:'lunar',label,height:curve.height,nextHigh:next?.high??null,nextHour:clock,nextDay,nextAbsoluteHour:next?.time??null,
    text:`🌊 ${label}${next?` · ${event} ${clock}${nextDay>0?` (+${nextDay}d)`:''}`:''}`,
    detail:`Três luas · Nível relativo: ${curve.height.toFixed(2)} m · Influências: Agmarim ${c.moonAgmarim}, Armina ${c.moonArmina}, Denégria ${c.moonDenegria}. Cada ponto equivale a 1/3 da amplitude configurada. Atraso local: ${c.tideLag} h. Parâmetros fictícios, não massas/tamanhos oficiais. Inclui luas abaixo do horizonte; não prevê profundidade, correntes, vento ou atração solar.`};
}
