import {castConfiguration} from './cast-rules.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function inferredUse(item,c) {
  if(c.useType)return c.useType;
  if(!item.getFlag('tagmar-token-fx','cast'))return 'custom';
  if(['circle','cone','ray'].includes(c.shape)&&c.enabled)return 'area';
  if(['rm','rf'].includes(c.resolution))return 'resistance';
  if(c.resolution==='none')return item.type==='Tecnica_Combate'?'technique':'effect';
  if(item.type==='Combate')return ['', 'MAG'].includes(item.system?.tipo)?'direct':item.system?.tipo==='P'?'ranged':'melee';
  return 'custom';
}
export function castFields(item) {
  const c=castConfiguration(item);
  c.useType=inferredUse(item,c);
  const input=(key,label,min,max,step='any')=>`<label>${label}<input name="cast_${key}" type="number" min="${min}" max="${max}" step="${step}" value="${c[key]}"></label>`;
  const check=(key,label)=>`<label class="tagmar-fx-auto"><input name="cast_${key}" type="checkbox" ${c[key]?'checked':''}>${label}</label>`;
  const select=(key,label,choices)=>`<label>${label}<select name="cast_${key}">${choices.map(([v,t])=>`<option value="${v}" ${String(c[key])===String(v)?'selected':''}>${t}</option>`).join('')}</select></label>`;
  return `<details class="tagmar-fx-cast" data-combat-item="${item.type==='Combate'}" open><summary>Uso da magia, arma ou técnica</summary>
    ${select('useType','Tipo de uso',[['custom','Personalizado / manter configuração'],['melee','Ataque corpo a corpo'],['ranged','Ataque à distância'],['direct','Magia de ataque direto'],['resistance','Magia com resistência (RM / RF)'],['area','Magia em área'],['effect','Efeito sem teste'],['technique','Técnica de combate']])}
    ${check('enabled','Usar resolução / duração ao clicar no item')}
    <p class="hint" data-use-hint></p>
    <details class="tagmar-fx-section" data-cast-section="targets"><summary>Área e alvos</summary>
    <div class="tagmar-fx-duration-grid">
      ${select('shape','Área / destino',[['circle','Círculo'],['cone','Cone'],['ray','Linha'],['self','Próprio personagem'],['targets','Alvos marcados']])}
      ${select('targetFilter','Quem pode ser atingido',[['all','Todos'],['excludeAllies','Não atingir aliados'],['allies','Somente aliados']])}
      ${input('distance','Raio / comprimento (unidade da cena)',0.1,10000)}
      ${input('width','Largura da linha (unidade da cena)',0.1,10000)}
      ${input('angle','Abertura do cone (graus)',1,360)}
    </div>
    ${check('includeCaster','Incluir o evocador na área')}
    <p class="hint">Aliados: tokens com a mesma disposição Amigável/Hostil do evocador. Neutros não contam como aliados. O filtro vale para área e alvos marcados, inclusive testes, dano e avisos. A opção de incluir o evocador continua independente.</p>
    <p class="hint">Área: clique para fixar o centro/origem; cone e linha exigem outro clique para a direção. Esc cancela. Usa o centro dos tokens; confira paredes, altura e alcance.</p>
    </details>
    <details class="tagmar-fx-section" data-cast-section="resolution"><summary>Resolução e dano</summary>
    <div class="tagmar-fx-duration-grid">
      ${select('resolution','Resolução por alvo',[['rm','Resistência à Magia (RM)'],['rf','Resistência Física (RF)'],['attack','Ataque na tabela'],['none','Sem teste / só duração']])}
      ${input('fa','Força de ataque da resistência',1,1000,1)}
      ${input('column','Coluna do ataque',-7,1000,1)}
      ${input('damage','Dano a 100% (0 = somente efeito)',0,1000000)}
      ${select('resistedDamage','Dano se passar na resistência',[[0,'Nenhum'],[50,'Metade'],[100,'Integral']])}
    </div>
    ${check('defense','Subtrair a defesa ativa do alvo da coluna')}
    <p class="hint" data-item-attack-hint hidden>Coluna e danos vêm deste item da aba Combate, incluindo bônus e penalidades. Alterações na ficha valem no próximo uso. Magia de ataque direto não desconta defesa; armas usam a categoria e o valor de defesa de cada alvo. Não é necessário repetir os valores no FX.</p>
    <p class="hint">RM/RF mostram sucesso ou falha no chat. Resistir impede o aviso de duração. Ataques usam a tabela do Tagmar; críticos exigem resolução manual. Dano 0 apenas faz o teste e/ou registra a duração.</p>
    </details>
    <details class="tagmar-fx-section" data-cast-section="duration"><summary>Duração / aviso na ficha</summary>
    <label>Nome do efeito temporário<input name="cast_effectName" type="text" maxlength="100" value="${esc(c.effectName)}" placeholder="Ex.: Proteção mágica"></label>
    <div class="tagmar-fx-duration-grid">${input('duration','Duração do efeito',0.01,31536000)}${select('unit','Unidade',[['rounds','Rodadas (15 segundos)'],['seconds','Segundos'],['minutes','Minutos'],['hours','Horas'],['days','Dias'],['weeks','Semanas (7 dias)']])}</div>
    <p class="hint">Deixe o nome vazio para uso instantâneo. Com nome, cria um aviso em Efeitos → Tempo de magias e técnicas, com o ícone deste item e tempo restante. Não muda atributos nem aplica condições. Ao acabar, fica inativo como Expirado. Dez rodadas = 150 segundos do jogo.</p>
    </details>
    <details class="tagmar-fx-section" data-cast-section="direction"><summary>Direção do token</summary>
    ${check('rotate','Virar para o alvo ao usar')}
    ${input('offset','Ajuste da imagem (graus; 0 = aponta para baixo)',-360,360)}
    </details>
  </details>`;
}
export function applyUseType(root) {
  const value=key=>root.querySelector(`[name="cast_${key}"]`);
  const type=value('useType').value;
  const resolutions={melee:'attack',ranged:'attack',direct:'attack',resistance:'rm',effect:'none'};
  if(resolutions[type])value('resolution').value=type==='resistance'&&value('resolution').value==='rf'?'rf':resolutions[type];
  if(type==='direct')value('defense').checked=false;
  if(type==='area'&&!['circle','cone','ray'].includes(value('shape').value))value('shape').value='circle';
  if(['melee','ranged'].includes(type))value('shape').value='targets';
  // Escolher um perfil é uma ação explícita; abrir/reabrir nunca redefine dados.
  const section=type==='area'?'targets':['effect','technique'].includes(type)?'duration':'resolution';
  root.querySelector(`[data-cast-section="${section}"]`).open=true;
  updateCastFields(root);
}
export function readCast(root) {
  const values={};
  for(const field of root.querySelectorAll('[name^="cast_"]'))values[field.name.slice(5)]=field.type==='checkbox'?field.checked:field.value;
  return castConfiguration({getFlag:()=>values});
}
export function updateCastFields(root) {
  const c=readCast(root),area=['circle','cone','ray'].includes(c.shape);
  const fromItem=root.querySelector('.tagmar-fx-cast').dataset.combatItem==='true'&&c.resolution==='attack';
  const show=(key,visible)=>{root.querySelector(`[name="cast_${key}"]`).closest('label').hidden=!visible;};
  show('offset',c.rotate);show('distance',area);show('width',c.shape==='ray');show('angle',c.shape==='cone');show('includeCaster',area);
  show('targetFilter',c.shape!=='self');
  show('fa',['rm','rf'].includes(c.resolution));show('resistedDamage',['rm','rf'].includes(c.resolution));show('column',c.resolution==='attack'&&!fromItem);show('defense',c.resolution==='attack'&&!fromItem&&c.useType!=='direct');
  show('damage',!fromItem);root.querySelector('[data-item-attack-hint]').hidden=!fromItem;
  show('duration',Boolean(c.effectName));show('unit',Boolean(c.effectName));
  const fixed=['melee','ranged','direct','effect'].includes(c.useType);
  show('resolution',!fixed);
  for(const option of root.querySelector('[name="cast_resolution"]').options)option.hidden=c.useType==='resistance'&&!['rm','rf'].includes(option.value);
  const hints={melee:'Ataque na tabela com os dados da arma. Marque os alvos no mapa; a distância corpo a corpo é conferida pela mesa.',ranged:'Ataque na tabela com os dados da arma. Configure o projétil em Animação. Alcance é conferido pela mesa.',direct:'Ataque direto na tabela, sem RM/RF. Itens Combate fornecem coluna e danos; alvos ou área são definidos abaixo.',resistance:'Cada alvo testa RM ou RF. Escolha a resistência, a FA e se passar evita todo o dano, metade ou nenhum.',area:'Escolha círculo, cone ou linha, depois a resolução: ataque direto, RM/RF ou sem teste. O visual pode usar Na área posicionada.',effect:'Sem teste: configure alvos e duração. Dano 0 apenas registra o aviso; não altera atributos ou condições.',technique:'Configure o visual e o aviso de duração. A resolução precisa seguir a técnica; não é deduzida pelo nome.',custom:'Mantém suas opções. Abra somente as seções que deseja ajustar.'};
  root.querySelector('[data-use-hint]').textContent=hints[c.useType]??hints.custom;
}
