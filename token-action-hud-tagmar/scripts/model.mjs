export const MODULE_ID = 'token-action-hud-tagmar';
export const SUPPORTED_SYSTEMS = ['tagmar_rpg', 'tagmar3er-oficial'];
export const SKILLS = {
  profissional: 'Profissional', manobra: 'Manobra', conhecimento: 'Conhecimento',
  subterfugio: 'Subterfúgio', influencia: 'Influência', geral: 'Geral'
};
export const ATTRIBUTES = {INT:'Intelecto', AUR:'Aura', CAR:'Carisma', FOR:'Força', FIS:'Físico', AGI:'Agilidade', PER:'Percepção'};
export const ROLLABLE_ITEMS = new Set(['Combate', 'Arma_Guerra', 'Habilidade', 'Magia', 'Tecnica_Combate']);
const group = (id, name) => ({id:`tagmar-${id}`, name, type:'system'});
const sections = [
  ['combat', 'Combate', [['attacks','Ataques'],['techniques','Técnicas de combate'],['vehicles','Veículos e tropas']]],
  ['skills', 'Habilidades', Object.entries(SKILLS).map(([key,label])=>[`skill-${key}`,label])],
  ['magic', 'Magias', [['spells','Magias']]],
  ['tests', 'Testes', [['attributes','Atributos'],['resistance','Resistências e moral']]],
  ['sheet', 'Ficha', [['resources','Recursos'],['inventory','Pertences e equipamentos'],['open','Abrir ficha']]]
];
export function defaults() {
  return {
    layout: sections.map(([id,name,children])=>({id:`tagmar-${id}`,nestId:`tagmar-${id}`,name,
      groups:children.map(([key,label])=>({...group(key,label),nestId:`tagmar-${id}_tagmar-${key}`}))})),
    groups: sections.flatMap(([, , children])=>children.map(([key,label])=>group(key,label)))
  };
}
export const escapeHTML = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const info = (text,title)=>({text:String(text),title});
export function itemGroup(item) {
  if(['Combate','Arma_Guerra'].includes(item.type))return 'attacks';
  if(item.type==='Tecnica_Combate')return 'techniques';
  if(item.type==='Magia')return 'spells';
  if(item.type==='Habilidade')return `skill-${Object.hasOwn(SKILLS,item.system.tipo)?item.system.tipo:'geral'}`;
  if(['Pertence','Defesa','Transporte','Efeito'].includes(item.type))return 'inventory';
  return null;
}
export function itemInfo(item) {
  const s=item.system??{};
  if(item.type==='Habilidade')return {info1:info(number(s.nivel)>0?Math.max(-7,number(s.total)+number(item.actor?.system.bonus_habil)):-7,'Total para o teste'),info2:info(`N${number(s.nivel)}`,'Nível')};
  if(item.type==='Tecnica_Combate')return {info1:info(s.fa??0,'FA da técnica'),info2:info(`N${number(s.nivel)}`,'Nível')};
  if(item.type==='Magia')return {info1:info(`N${number(s.nivel)}`,'Nível da magia')};
  if(['Combate','Arma_Guerra'].includes(item.type))return {
    info1:info(s.municao??0,'Munição registrada'),info2:info(s.alcance??'','Alcance'),
    ...(item.type==='Combate' && s.dano?.d100!=null ? {info3:info(s.dano.d100,'Dano de 100% registrado no item')} : {})
  };
  if(s.quantidade!=null)return {info1:info(s.quantidade,'Quantidade')};
  return {};
}
export function encode(action, actor, id='') {
  return ['tagmar',action,encodeURIComponent(actor?.uuid??''),encodeURIComponent(id)].join('|');
}
export function decode(value) {
  const parts=String(value??'').split('|');
  if(parts.length!==4 || parts[0]!=='tagmar')return null;
  try {return {action:parts[1],actorUuid:decodeURIComponent(parts[2]),id:decodeURIComponent(parts[3])};}catch{return null;}
}
/** Build only from the current actor. Never load compendiums or copy world documents. */
export function actorActions(actor,{getImage=doc=>doc.img,hideUntrained=false,isGM=false}={}) {
  const result=new Map();
  const add=(category,action,id,name,extra={})=>{
    const key=`tagmar-${category}`;
    if(!result.has(key))result.set(key,[]);
    result.get(key).push({id:`${action}-${id}`,name,encodedValue:encode(action,actor,id),cssClass:'tah-tagmar-action',...extra});
  };
  if(!actor?.isOwner)return result;
  const items=[...(actor.items?.contents??actor.items??[])].sort((a,b)=>(a.sort??0)-(b.sort??0)||a.name.localeCompare(b.name,'pt-BR'));
  for(const item of items) {
    const category=itemGroup(item);
    if(!category)continue;
    if(hideUntrained && ['Habilidade','Tecnica_Combate'].includes(item.type) && number(item.system.nivel)<=0 && !item.flags?.tagmarSync?.environmentalTechnique)continue;
    const rolls=ROLLABLE_ITEMS.has(item.type);
    add(category,rolls?'item':'inspect',item.id,item.name,{
      img:getImage(item),...itemInfo(item),hasContextMenu:true,
      tooltip:{direction:'RIGHT',content:`<strong>${escapeHTML(item.name)}</strong><p>${rolls?'Clique para usar como na ficha. Botão direito abre o item.':'Clique para abrir o item.'}</p>`}
    });
  }
  const s=actor.system??{};
  if(['Personagem','NPC'].includes(actor.type)) {
    for(const [id,label] of Object.entries(ATTRIBUTES))add('attributes','attribute',id,label,{info1:info(s.valor_teste?.[id]??0,'Valor para teste')});
    add('resistance','resistance','rm','Resistência mágica (RM)',{info1:info(s.rm??0,'RM'),tooltip:{direction:'RIGHT',content:'Informe a Força de Ataque para fazer o teste normal de RM.'}});
    add('resistance','resistance','rf','Resistência física (RF)',{info1:info(s.rf??0,'RF'),tooltip:{direction:'RIGHT',content:'Informe a Força de Ataque para fazer o teste normal de RF.'}});
    if(actor.type==='NPC')add('resistance','morale','','Moral',{info1:info(s.moral??0,'Moral')});
  }
  if(actor.type==='Veiculo')add('vehicles','maneuver','','Manobrar',{tooltip:{direction:'RIGHT',content:'Usa o condutor e os ajustes escolhidos na ficha do veículo.'}});
  if(actor.type==='Tropa' && isGM) {
    const icons=actor.getFlag?.(globalThis.game?.system.id,'troopAttackIcons')??{};
    add('vehicles','troop','attack','Ataque da tropa',{img:getImage({img:icons.attack?.img??actor.img})});
    if(number(s.aparatos?.quantidade)>0)add('vehicles','troop','apparatus',s.aparatos.nome||'Ataque dos aparatos',{img:getImage({img:icons.apparatus?.img??actor.img})});
    add('vehicles','troop','morale','Moral da tropa');
  }
  const pools=actor.type==='Veiculo'?[['absorcao','ABS']]:actor.type==='Tropa'?[['ef','EF'],['absorcao','ABS']]:[['ef','EF'],['eh','EH'],['karma','Karma'],['absorcao','ABS']];
  for(const [key,label] of pools)if(s[key]?.value!=null)add('resources','sheet',key,label,{info1:info(`${s[key].value}/${s[key].max??0}`,'Atual / máximo'),tooltip:{direction:'RIGHT',content:'Valor atual / máximo. Clique para consultar e ajustar na ficha.'}});
  add('open','sheet','','Abrir ficha');
  return result;
}
