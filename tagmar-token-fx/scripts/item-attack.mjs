import {attackResult} from './cast-rules.mjs';
const numeric=(value,label)=>{const n=Number(value);if(!Number.isFinite(n))throw Error(`Confira ${label} na ficha do ataque.`);return n;};

export function itemAttackColumn(item,target) {
  const s=item.system,actor=item.actor.system;
  const magic=s.tipo===''||s.tipo==='MAG';
  const category=magic?'L':target.system.d_ativa?.categoria;
  if(!['L','M','P'].includes(category))throw Error('Categoria de defesa do alvo não configurada.');
  const level=numeric(s.nivel,'o nível');
  if(!magic&&level<=0)return -7;
  const attribute=['AUR','FOR','AGI','PER'].includes(s.bonus)?numeric(actor.atributos?.[s.bonus],'o atributo de bônus'):0;
  const total=level+attribute+numeric(s.bonus_magico,'o ajuste de coluna')+numeric(s[`def_${category.toLowerCase()}`],'o ajuste L/M/P')
    +numeric(actor.inf_ataque?.bonus??0,'o bônus/penalidade');
  // Igual a rollCombate: magia direta usa L e não desconta defesa.
  return Math.max(-7,total-(magic?0:numeric(target.system.d_ativa.valor,'a defesa do alvo')));
}

export function itemAttackResult(item,target,table,die) {
  if(item.flags?.tagmarSync?.healTarget||item.flags?.tagmarSync?.healingMode)
    throw Error('Este item é de cura. Use o fluxo de cura da ficha; a automação de dano em área não aplica cura.');
  const total=itemAttackColumn(item,target);
  const result=attackResult(table,total,die,0);
  const penalty=[25,50,75,100].find(n=>item.system.penalidade?.[`p${n}`])??0;
  const percent=result.critical?0:Math.max(0,result.percent-penalty);
  let damage=0;
  if(percent>0){
    const values=item.system.dano;
    if(percent<=300)damage=numeric(values?.[`d${percent}`],`o dano de ${percent}%`);
    else damage=numeric(values?.d25,'o dano de 25%')+(percent/25-1)*(numeric(values?.d50,'o dano de 50%')-numeric(values?.d25,'o dano de 25%'));
  }
  return {...result,percent,damage:Math.max(0,damage),total};
}
