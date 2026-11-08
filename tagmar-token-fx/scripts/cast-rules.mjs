// Configuração por magia: não tenta interpretar regras a partir da descrição.
export const SPELL_UNITS = {seconds:1, minutes:60, hours:3600, days:86400, weeks:604800, rounds:15};
const number = (v,d,min,max) => Number.isFinite(Number(v)) ? Math.max(min,Math.min(max,Number(v))) : d;
export const adjustmentFor=(c,kind)=>number(c[`${kind}Modifier`]??-number(c[`${kind}Penalty`]??0,0,0,100),0,-100,100)||0;
export const hasAdjustments=c=>Boolean(adjustmentFor(c,'combat')||adjustmentFor(c,'skill'));
export const MAX_SUMMONS=20;
export function summonEntries(config) {
  const entries=Array.isArray(config.summons)?config.summons:
    config.formUuid?[{formUuid:config.formUuid,formName:config.formName,quantity:1}]:[];
  return entries.map(e=>({formUuid:typeof e?.formUuid==='string'?e.formUuid.trim().slice(0,512):'',
    formName:typeof e?.formName==='string'?e.formName.slice(0,200):'',quantity:Number(e?.quantity??1)}));
}
export function expandedSummons(config) {
  const entries=summonEntries(config),total=entries.reduce((n,e)=>n+e.quantity,0);
  if(!entries.length||entries.some(e=>!e.formUuid||!Number.isInteger(e.quantity)||e.quantity<1)||!Number.isFinite(total)||total>MAX_SUMMONS)
    throw Error(`Escolha as criaturas e quantidades inteiras, de 1 a ${MAX_SUMMONS} criaturas por uso.`);
  return entries.flatMap(e=>Array.from({length:e.quantity},()=>({...e,quantity:1})));
}
// Ao abrir itens antigos, preserva o prazo que já governava o efeito.
// Depois de salvar, cast.duration/unit são a única fonte do prazo de jogo.
export function sharedDuration(item) {
  const c=item.getFlag('tagmar-token-fx','cast')??{};
  const a=item.getFlag('tagmar-token-fx','jb2aFx')??{};
  const valid=(value,unit)=>Number.isFinite(Number(value))&&Number(value)>0&&Object.hasOwn(SPELL_UNITS,unit);
  const castValid=valid(c.duration,c.unit);
  const timedCast=c.enabled===true&&(c.useType==='summon'||(c.shape!=='point'&&Boolean(c.effectName||c.repeatRM||c.transform||c.invisible||hasAdjustments(c))));
  if(castValid&&(c.durationShared===true||timedCast))return {duration:Number(c.duration),unit:c.unit};
  if(a.timeMode==='calendar'&&valid(a.gameDuration,a.gameUnit))return {duration:Number(a.gameDuration),unit:a.gameUnit};
  return castValid?{duration:Number(c.duration),unit:c.unit}:null;
}
export function castConfiguration(item) {
  const s=item.getFlag('tagmar-token-fx','cast')??{};
  const duration=sharedDuration(item);
  return {useType:['summon','point','self','targets','melee','ranged','direct','resistance','effect','technique','area','custom','transformation'].includes(s.useType)?s.useType:'',
    summon:s.useType==='summon',
    summons:summonEntries(s),summonDelay:Math.trunc(number(s.summonDelay??0,0,0,10000)),
    enabled:s.enabled===true, rotate:s.rotate===true, offset:number(s.offset??0,0,-360,360),
    invisible:s.invisible===true&&s.useType!=='summon'&&s.shape!=='point',
    transform:s.transform===true,formUuid:typeof s.formUuid==='string'?s.formUuid.trim().slice(0,512):'',
    formName:typeof s.formName==='string'?s.formName.slice(0,200):'',
    shape:s.useType==='summon'?'point':['point','circle','cone','ray','self','targets'].includes(s.shape)?s.shape:'circle',
    pointSize:number(s.pointSize??2,2,0.1,10000),pointRotation:number(s.pointRotation??0,0,-360,360),
    targetFilter:['all','excludeAllies','allies'].includes(s.targetFilter)?s.targetFilter:'all',
    distance:number(s.distance??6,6,0.1,10000), width:number(s.width??2,2,0.1,10000), angle:number(s.angle??90,90,1,360),
    resolution:['rm','rf','attack','none'].includes(s.resolution)?s.resolution:'rm',
    repeatRM:s.repeatRM===true&&(s.resolution??'rm')==='rm',
    repeatDamage:s.repeatDamage===true,
    persistAfterExit:s.persistAfterExit===true,
    rmSuccess:s.rmSuccess==='turn'&&!s.transform?'turn':'end',
    combatPenalty:number(s.combatPenalty??0,0,0,100),
    skillPenalty:number(s.skillPenalty??0,0,0,100),
    combatModifier:adjustmentFor(s,'combat'),skillModifier:adjustmentFor(s,'skill'),
    fa:Math.round(number(s.fa??1,1,1,1000)), column:Math.round(number(s.column??0,0,-7,1000)),
    defense:s.defense===true, damage:number(s.damage??0,0,0,1000000),
    resistedDamage:[0,50,100].includes(Number(s.resistedDamage))?Number(s.resistedDamage):0,
    effectName:typeof s.effectName==='string'?s.effectName.trim().slice(0,100):'',
    durationShared:s.durationShared===true,
    duration:number(duration?.duration??10,10,0.01,31536000), unit:duration?.unit??'rounds',
    includeCaster:s.includeCaster===true};
}
export function secondsFor(config) {return config.duration*SPELL_UNITS[config.unit];}
export function acceptsTarget(source,target,filter='all') {
  if(filter==='all')return true;
  const sourceDoc=source.document??source,targetDoc=target.document??target;
  const side=sourceDoc.disposition;
  if(![1,-1].includes(side))throw Error('Para filtrar aliados, configure o token do evocador como Amigável ou Hostil.');
  const allied=sourceDoc.id===targetDoc.id||targetDoc.disposition===side;
  return filter==='allies'?allied:!allied;
}
export function facingAngle(source,target,offset=0) {
  if(!source||!target||Math.hypot(target.x-source.x,target.y-source.y)<0.01)return null;
  // Foundry: rotação zero aponta para baixo.
  return ((Math.atan2(target.y-source.y,target.x-source.x)*180/Math.PI-90+offset)%360+360)%360;
}
export function insideArea(point,origin,direction,config,pixelsPerUnit) {
  const a=direction*Math.PI/180, dx=point.x-origin.x,dy=point.y-origin.y;
  const x=dx*Math.cos(a)+dy*Math.sin(a), y=-dx*Math.sin(a)+dy*Math.cos(a);
  const distance=config.distance*pixelsPerUnit;
  if(config.shape==='circle')return Math.hypot(x,y)<=distance+0.001;
  if(config.shape==='ray')return x>=-0.001&&x<=distance+0.001&&Math.abs(y)<=config.width*pixelsPerUnit/2+0.001;
  if(config.shape==='cone')return Math.hypot(x,y)<=distance+0.001&&Math.abs(Math.atan2(y,x))*180/Math.PI<=config.angle/2+0.001;
  return false;
}
export function attackResult(table,total,die,damage) {
  total=Math.max(-7,Math.trunc(total));
  let column=total, extra=0;
  if(total>20){column=total%20||20;extra=Math.trunc((total-column)/20)*50;}
  const color=table.find(r=>r[0]===column)?.[die];
  const percents={verde:0,branco:0,amarelo:25,laranja:50,vermelho:75,azul:100,roxo:125,cinza:0};
  if(!Object.hasOwn(percents,color))throw Error('Resultado ausente na tabela de resolução do sistema.');
  const critical=color==='cinza'||color==='verde';
  const percent=critical?0:percents[color]+extra;
  return {column,color,critical,percent,damage:Math.ceil(damage*percent/100)};
}
