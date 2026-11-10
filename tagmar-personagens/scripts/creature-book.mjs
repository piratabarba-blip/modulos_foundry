// SPDX-License-Identifier: GPL-3.0-or-later
// Livro de Criaturas 3.02, cap. 5, pp. 23–27. Perfis automáticos são sugestões.
export const BOOK_SOURCE='Tagmar — Livro de Criaturas 3.02, capítulo 5, páginas 23–27';
export const COMBATIVENESS=[['auto','Sugerir pelo grupo'],['none','Não combativa — EH zero'],['low','Baixa — base 5'],['medium','Média — base 7'],['high','Alta — base 10'],['extreme','Extrema — base 13']];
export const ORGANIZATIONS=[['group','Em grupo'],['solitary','Naturalmente solitária (+7 na base da EH)']];
export const CORPOREALITIES=[['corporeal','Corpórea — EH usa Físico'],['incorporeal','Incorpórea — EH usa Aura']];
export const CONSTRUCTIONS=[['auto','Sugerir pelo grupo'],['no','Não construída'],['yes','Construída (golem, estátua…)']];
export const MAGIC_SOURCES=[['auto','Sugerir pela inteligência'],['innate','Dons naturais — usos por dia'],['learned','Magias aprendidas — Karma']];
export const DAMAGE_RANGES=[['low','Parte inferior da faixa'],['middle','Meio da faixa'],['high','Parte superior da faixa']];
export const MORALES=[['auto','Sugerir pelo perfil'],['normal','Comum — estágio'],['coward','Covarde — 50% do estágio'],['brave','Destemida — 150% do estágio'],['fearless','Mágica destemida — 200% do estágio'],['none','Sem Moral (não influenciável)']];
const WEIGHTS={tiny:2,small:40,medium:70,large:600,huge:3000};
const HEIGHTS={tiny:.3,small:.8,medium:1.5,large:3,huge:6};
const NATURAL_COLUMNS={mordida:[1,0,-1],garras:[3,0,-3],patadas:[3,0,-4],coice:[2,-1,-5],chifres:[1,-1,-5],punhos:[-1,1,2],bicada:[1,-1,-5],cauda:[0,1,-2],'halito encantado':[1,1,1]};
export const EXTENDED_WEIGHT_MAX=47500;
export const EXTENDED_HEIGHT_MAX=32.5;
const WEIGHT_DAMAGE=[[20,0,4],[50,4,8],[100,8,16],[200,12,20],[350,12,24],[500,12,28],[1000,16,28],[2000,16,32],[3000,20,32],[4500,20,36],[6500,24,40],[9500,24,44]];
const normal=s=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const selected=(rows,value,label)=>{if(!rows.some(x=>x[0]===value))throw Error(`Escolha ${label} válida.`);return value;};
function decimal(value,fallback,min,max,label){if(value===''||value==null)return fallback;const n=Number(String(value).replace(',','.'));if(!Number.isFinite(n)||n<min||n>max)throw Error(`Confira ${label}: use um valor de ${min} a ${max}.`);return n;}
export function bookChoices(d,c){
 const combat=selected(COMBATIVENESS,d.combativeness??'auto','combatividade');
 const constructed=selected(CONSTRUCTIONS,d.construction??'auto','natureza de construção');
 const magicSource=selected(MAGIC_SOURCES,d.magicSource??'auto','origem da magia');
 const directSpeed=decimal(d.speedVb,null,0,50000,'velocidade em VB');
 const legacySpeed=directSpeed===null?decimal(d.speedKmh,null,0,10000,'velocidade antiga'):null;
 const speedVb=directSpeed??(legacySpeed===null?null:Math.round(25*legacySpeed/6*100)/100);
 const uses=decimal(d.usesPerDay,1,1,1000,'usos por dia');if(!Number.isInteger(uses))throw Error('Usos por dia deve ser inteiro.');
 return {...c,book:'3.02',weight:decimal(d.weight,WEIGHTS[c.size],.001,1000000,'peso em kg'),height:decimal(d.height,HEIGHTS[c.size],.01,1000,'altura em metros'),
  combativeness:combat==='auto'?(c.group==='CC'?'none':c.group==='DR'||c.group==='DI'?'extreme':['CDV','DE','MV','RG','HI'].includes(c.group)?'high':c.group==='AD'?'low':'medium'):combat,
  organization:selected(ORGANIZATIONS,d.organization??'group','organização'),corporeality:selected(CORPOREALITIES,d.corporeality??'corporeal','natureza corpórea'),
  constructed:constructed==='auto'?c.group==='CC':constructed==='yes',magicSource:magicSource==='auto'?(c.intellect==='beast'?'innate':'learned'):magicSource,
  damageRange:selected(DAMAGE_RANGES,d.damageRange??'middle','faixa de dano'),moralMode:selected(MORALES,d.moralMode??'auto','Moral'),
  speedVb,usesPerDay:uses};
}
export function physicalEnergy(weight,physique,constructed=false){return Math.floor((constructed?2.5:2)*Math.sqrt(weight))+physique;}
export function heroicEnergy(c,attrs){
 if(c.combativeness==='none')return 0;
 const base={low:5,medium:7,high:10,extreme:13}[c.combativeness];
 return c.stage*(base+(c.organization==='solitary'?7:0)+(c.corporeality==='incorporeal'?attrs.AUR:attrs.FIS));
}
export function creatureMorale(c){
 const mode=c.moralMode==='auto'?(c.constructed||c.group==='MV'?'none':'normal'):c.moralMode;
 if(mode==='fearless'&&!c.magical)throw Error('Moral de 200% é uma opção para criaturas mágicas.');
 return Math.floor(c.stage*({none:0,normal:1,coward:.5,brave:1.5,fearless:2}[mode]));
}
export function damageBand(weight){
 if(weight<2||weight>EXTENDED_WEIGHT_MAX)return null;
 if(weight<=9500)return WEIGHT_DAMAGE.find(x=>weight<=x[0]).slice(1);
 // Extensão autorizada, extraoficial: repete o passo das últimas faixas.
 // +3000 kg por faixa; teto +4 por faixa e piso +4 a cada duas faixas.
 const steps=Math.ceil((weight-9500)/3000);
 return [24+4*Math.floor(steps/2),44+4*steps];
}
export function naturalColumns(name){const n=normal(name),alias={garra:'garras',patada:'patadas',chifre:'chifres',punho:'punhos'};return NATURAL_COLUMNS[alias[n]??n]??null;}
export function naturalDamage(c,rng=()=>.5,variation=false){
 const band=damageBand(c.weight);if(!band)return null;
 const factor=c.damageRange==='low'?0:c.damageRange==='high'?1:variation?rng():.5;
 // Múltiplos de quatro permitem percentuais de 25/50/75% inteiros.
 return Math.min(band[1],Math.max(band[0],4*Math.round((band[0]+factor*(band[1]-band[0]))/4)));
}
export function weaponSizeBonus(height){
 if(height>EXTENDED_HEIGHT_MAX)return null;
 // A tabela publicada chega a 6,50 m; após isso mantém +4 por metro, extraoficial.
 return Math.max(0,Math.ceil(height-2.5))*4;
}
export function setDamageTable(system,base100){for(const key of Object.keys(system.dano_base))system.dano_base[key]=Math.round(Number(key.slice(1))*base100/100);}
