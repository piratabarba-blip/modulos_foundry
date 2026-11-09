export const BONUS_CHOICES=[
  ['EH','EH temporária'],['EF','EF temporária'],
  ...['INT','AUR','CAR','FOR','FIS','AGI','PER'].map(k=>[k,k]),
  ['ABS','Absorção máxima'],['DEF','Defesa'],['KMA','Karma máximo'],['VB','Velocidade base'],
  ['RFIS','Resistência física'],['RMAG','Resistência à magia'],
  ['COMBAT','Combate (colunas)'],['SKILL','Habilidades (colunas)']
];
export function bonusEntries(config){
  if(!['bonuses','temporaryEH'].includes(config.resourceMode))return [];
  let rows=Array.isArray(config.bonuses)?config.bonuses:[];
  if(config.resourceMode==='temporaryEH'&&!rows.length)rows=[{attribute:'EH',value:config.temporaryEH}];
  return rows.slice(0,24).filter(r=>BONUS_CHOICES.some(([k])=>k===r?.attribute)&&Number.isFinite(Number(r.value)))
    .map(r=>({attribute:r.attribute,value:Math.max(['EH','EF'].includes(r.attribute)?0:-1000000,Math.min(1000000,Number(r.value)))}));
}
export const bonusTotal=(config,attribute)=>bonusEntries(config).filter(r=>r.attribute===attribute).reduce((n,r)=>n+r.value,0);
export const hasBonuses=config=>bonusEntries(config).some(r=>r.value!==0);
export const nativeBonuses=config=>bonusEntries(config).filter(r=>!['EH','EF','COMBAT','SKILL'].includes(r.attribute)&&r.value!==0);
export const bonusLabel=key=>BONUS_CHOICES.find(([k])=>k===key)?.[1]??key;
