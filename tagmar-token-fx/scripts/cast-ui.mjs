import {castConfiguration,hasAdjustments} from './cast-rules.mjs';
import {transformationFields} from './transformation-ui.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function inferredUse(item,c) {
  if(c.summon)return 'summon';
  if(c.shape==='point')return 'point';
  if(c.transform)return 'transformation';
  if(c.shape==='targets'&&['melee','ranged'].includes(c.useType))return c.useType;
  if(['circle','cone','ray'].includes(c.shape))return 'area';
  return c.shape;
}
export function castFields(item) {
  const c=castConfiguration(item);
  c.useType=inferredUse(item,c);
  const input=(key,label,min,max,step='any')=>`<label>${label}<input name="cast_${key}" type="number" min="${min}" max="${max}" step="${step}" value="${c[key]}"></label>`;
  const check=(key,label)=>`<label class="tagmar-fx-auto"><input name="cast_${key}" type="checkbox" ${c[key]?'checked':''}>${label}</label>`;
  const select=(key,label,choices)=>`<label>${label}<select name="cast_${key}">${choices.map(([v,t])=>`<option value="${v}" ${String(c[key])===String(v)?'selected':''}>${t}</option>`).join('')}</select></label>`;
  return `<details class="tagmar-fx-cast" data-combat-item="${item.type==='Combate'}" open><summary>Uso da magia, arma ou técnica</summary>
    ${select('useType','Tipo de uso',[['self','No próprio personagem'],['targets','Nos alvos marcados'],['area','Em área'],['point','Em um ponto do mapa'],['melee','Ataque corpo a corpo'],['ranged','Ataque à distância'],['transformation','Transformação em criatura / PNJ'],['summon','Invocar criatura / PNJ']])}
    <input type="hidden" name="cast_shape" value="${c.shape}">
    ${select('targetFilter','Quem pode ser atingido',[['all','Todos'],['excludeAllies','Não atingir aliados'],['allies','Somente aliados']])}
    <p class="hint" data-target-hint>Aliados: tokens com a mesma disposição Amigável/Hostil do evocador. Neutros não contam como aliados. O filtro vale para testes, dano e avisos.</p>
    ${check('enabled','Usar resolução / duração ao clicar no item')}
    <label class="tagmar-fx-auto"><input type="checkbox" data-use-rm ${c.resolution==='rm'?'checked':''}>Usa RM?</label>
    ${check('repeatRM','Faz RM toda rodada, no início do turno do alvo?')}
    <div data-repeat-settings>
      ${check('repeatDamage','Reaplicar dano integral ao falhar na resistência de cada turno')}
      ${select('rmSuccess','Ao passar na RM', [['end','Encerrar neste alvo (em área: até sair e entrar)'],['turn','Ficar livre neste turno e testar no próximo']])}

    </div>
    <p class="hint" data-rm-hint>Teste ao usar ou entrar na área; depois, no início do turno do alvo. Falha pode repetir o dano integral e aplicar penalidades, sem acumular a cada rodada. Em área, sair remove a penalidade; entrar novamente pede outra RM. Sem combate, não há repetição por turno.</p>
    <p class="hint" data-use-hint></p>
    <details class="tagmar-fx-section" data-cast-section="targets"><summary>Área</summary>
    <div class="tagmar-fx-duration-grid">
      <label>Formato da área<select data-cast-area-shape>${[['circle','Círculo'],['cone','Cone'],['ray','Linha']].map(([v,t])=>`<option value="${v}" ${c.shape===v?'selected':''}>${t}</option>`).join('')}</select></label>
      ${input('distance','Raio / comprimento (unidade da cena)',0.1,10000)}
      ${input('width','Largura da linha (unidade da cena)',0.1,10000)}
      ${input('angle','Abertura do cone (graus)',1,360)}
    </div>
    ${check('includeCaster','Incluir o evocador na área')}
    ${check('persistAfterExit','Manter o efeito ao sair da área até terminar a duração')}
    <p class="hint" data-persistence-hint>Com RM por turno, mantém os ajustes e os testes mesmo fora da área, sem renovar a duração. Se passar na RM, vale o comportamento escolhido em Ao passar na RM. Sem RM por turno, avisos e ajustes com duração já continuam após sair.</p>
    <p class="hint" data-area-hint>Área: clique para fixar o centro/origem; cone e linha exigem outro clique para a direção. Esc cancela. Usa o centro dos tokens; confira paredes, altura e alcance.</p>
    </details>
    <details class="tagmar-fx-section" data-cast-section="resolution"><summary>Resolução e dano</summary>
    <div class="tagmar-fx-duration-grid">
      ${select('resolution','Resolução por alvo',[['rm','Resistência à Magia (RM)'],['rf','Resistência Física (RF)'],['attack','Ataque na tabela'],['none','Sem teste / só duração']])}
      ${input('fa','Força de ataque da resistência',1,1000,1)}
      ${input('column','Coluna do ataque',-7,1000,1)}
      ${input('damage','Dano a 100% (0 = somente efeito)',0,1000000)}
      ${select('resistedDamage','Dano se passar na resistência',[[0,'Nenhum'],[50,'Metade'],[100,'Integral']])}
    </div>
    <div class="tagmar-fx-duration-grid" style="align-items:end">
      ${input('skillModifier','Bônus / penalidade de habilidades',-100,100,1)}
      ${input('combatModifier','Bônus / penalidade de combate',-100,100,1)}
    </div>
    ${check('invisible','Tornar o destinatário invisível')}
    <p class="hint" data-invisibility-hint>Aplica a condição Invisível do Foundry durante a magia. Com Visão dos tokens ativada na cena, a visão normal dos outros tokens não o detecta. Mestre, dono e sentidos especiais seguem as regras nativas. Remover o efeito ou terminar a duração encerra esta invisibilidade.</p>
    ${check('defense','Subtrair a defesa ativa do alvo da coluna')}
    <p class="hint" data-item-attack-hint hidden>Coluna e danos vêm deste item da aba Combate, incluindo bônus e penalidades. Alterações na ficha valem no próximo uso. Magia de ataque direto não desconta defesa; armas usam a categoria e o valor de defesa de cada alvo. Não é necessário repetir os valores no FX.</p>
    <p class="hint">RM/RF mostram sucesso ou falha no chat. 0 não altera; negativos penalizam e positivos dão bônus, em colunas. O mesmo efeito não acumula por turno. Resistir remove seus ajustes. Ataques usam a tabela do Tagmar; críticos exigem resolução manual. Dano 0 apenas faz o teste e/ou registra a duração.</p>
    </details>
    <details class="tagmar-fx-section" data-cast-section="point"><summary>Posição e tamanho do efeito</summary>
    <div class="tagmar-fx-duration-grid">
      ${input('pointSize','Largura do efeito (unidade da cena)',0.1,10000)}
      ${input('pointRotation','Rotação (graus)',-360,360)}
    </div>
    <p class="hint">Uma guia acompanha o mouse. Clique para posicionar; Esc cancela. O visual fica fixo nesse ponto. Não seleciona alvos, causa dano ou transporta personagens. Configure o prazo em Duração / aviso na ficha e a luz em Animação — JB2A.</p>
    </details>
    ${transformationFields(c)}
    <details class="tagmar-fx-section" data-cast-section="duration"><summary>Duração / aviso na ficha</summary>
    <label>Nome do efeito temporário<input name="cast_effectName" type="text" maxlength="100" value="${esc(c.effectName)}" placeholder="Ex.: Proteção mágica"></label>
    <div class="tagmar-fx-duration-grid">${input('duration','Duração do efeito',0.01,31536000)}${select('unit','Unidade',[['rounds','Rodadas (15 segundos)'],['seconds','Segundos'],['minutes','Minutos'],['hours','Horas'],['days','Dias'],['weeks','Semanas (7 dias)']])}</div>
    <p class="hint">Prazo da magia e da animação pelo calendário, inclusive portais. Com ajustes de habilidades/combate, RM por turno, invisibilidade ou transformação, o nome vazio usa o nome do item. O aviso aparece em Efeitos → Tempo de magias e técnicas. Dez rodadas = 150 segundos do jogo.</p>
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
  const previousMode=root.querySelector('[name="jbMode"]');
  if(previousMode?.disabled&&type!=='point')previousMode.value=type==='self'||type==='transformation'?'self':type==='area'?'area':type==='ranged'?'projectile':'targets';
  value('transform').checked=type==='transformation';
  for(const section of root.querySelectorAll('[data-cast-section]'))section.open=false;
  if(type==='summon'){
    value('enabled').checked=true;value('shape').value='point';value('resolution').value='none';
    value('repeatRM').checked=false;value('damage').value=0;
    const mode=root.querySelector('[name="jbMode"]');if(mode)mode.value='area';
    root.querySelector('[data-cast-section="duration"]').open=true;
  }
  if(type==='point'){
    value('enabled').checked=true;value('shape').value='point';value('resolution').value='none';
    value('repeatRM').checked=false;
    const visual=root.querySelector('.tagmar-fx-animation');if(visual)visual.open=true;
    const enabled=root.querySelector('[name="jbEnabled"]');if(enabled)enabled.checked=true;
    const mode=root.querySelector('[name="jbMode"]');if(mode)mode.value='area';
  }
  if(type==='transformation'){
    value('enabled').checked=true;value('resolution').value='none';value('shape').value='self';
    value('damage').value=0;root.querySelector('[data-cast-section="duration"]').open=true;
    const visualMode=root.querySelector('[name="jbMode"]');
    if(visualMode){visualMode.value='self';visualMode.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  if(['melee','ranged'].includes(type))value('resolution').value='attack';
  if(['self','targets'].includes(type))value('shape').value=type;
  if(type==='area')value('shape').value=root.querySelector('[data-cast-area-shape]').value;
  if(['melee','ranged'].includes(type))value('shape').value='targets';
  const shape=value('shape').value;
  root.querySelector('[data-cast-destination]').value=['self','targets'].includes(shape)?shape:'area';
  if(['circle','cone','ray'].includes(shape))root.querySelector('[data-cast-area-shape]').value=shape;
  // Escolher um perfil é uma ação explícita; abrir/reabrir nunca redefine dados.
  const section=type==='summon'||type==='transformation'?'transformation':type==='point'?'point':type==='area'?'targets':'resolution';
  root.querySelector(`[data-cast-section="${section}"]`).open=true;
  updateCastFields(root);
}
export function bindCastDestination(root) {
  const destination=root.querySelector('[data-cast-destination]');
  const areaShape=root.querySelector('[data-cast-area-shape]');
  destination.addEventListener('change',()=>{
    root.querySelector('[name="cast_shape"]').value=destination.value==='area'?areaShape.value:destination.value;
    if(destination.value==='area')root.querySelector('[data-cast-section="targets"]').open=true;
    updateCastFields(root);
  });
  areaShape.addEventListener('change',()=>{
    root.querySelector('[name="cast_shape"]').value=areaShape.value;
    updateCastFields(root);
  });
}
export function readCast(root) {
  const values={};
  for(const field of root.querySelectorAll('[name^="cast_"]'))values[field.name.slice(5)]=field.type==='checkbox'?field.checked:field.value;
  try{values.summons=JSON.parse(values.summons||'[]');}catch{values.summons=[];}
  values.durationShared=true;
  return castConfiguration({getFlag:(_scope,key)=>key==='cast'?values:undefined});
}
export function toggleRM(root) {
  const field=root.querySelector('[name="cast_resolution"]');
  const checkbox=root.querySelector('[data-use-rm]');
  if(checkbox.checked){checkbox.dataset.previousResolution=field.value;field.value='rm';}
  else {
    const type=root.querySelector('[name="cast_useType"]').value;
    field.value=['attack','rf','none'].includes(checkbox.dataset.previousResolution)?checkbox.dataset.previousResolution:
      ['melee','ranged','direct'].includes(type)?'attack':'none';
    root.querySelector('[name="cast_repeatRM"]').checked=false;
  }
  if(checkbox.checked)root.querySelector('[data-cast-section="resolution"]').open=true;
  updateCastFields(root);
}
export function updateCastFields(root) {
  const c=readCast(root),point=c.shape==='point',area=['circle','cone','ray'].includes(c.shape);
  const calendar=root.querySelector('[name="jbTimeMode"]')?.value==='calendar'&&root.querySelector('[name="jbMode"]')?.value!=='projectile';
  const resistance=['rm','rf'].includes(c.resolution);
  const section=(key,visible)=>{root.querySelector(`[data-cast-section="${key}"]`).hidden=!visible;};
  const fromItem=root.querySelector('.tagmar-fx-cast').dataset.combatItem==='true'&&c.resolution==='attack';
  const show=(key,visible)=>{root.querySelector(`[name="cast_${key}"]`).closest('label').hidden=!visible;};
  root.querySelector('[data-use-rm]').checked=c.resolution==='rm';
  (root.querySelector('[name="cast_enabled"]').closest('label').querySelector('[data-fx-label-text]')??root.querySelector('[name="cast_enabled"]').closest('label').lastChild).textContent=c.summon?' Invocar a criatura ao clicar no item':point?' Posicionar o efeito ao clicar no item':' Usar resolução / duração ao clicar no item';
  show('repeatRM',!point&&c.resolution==='rm');
  root.querySelector('[data-repeat-settings]').hidden=point||!c.repeatRM;
  if(c.repeatRM&&c.repeatDamage)root.querySelector('[name="cast_resistedDamage" ]').value='0';
  root.querySelector('[data-use-rm]').closest('label').hidden=point;
  root.querySelector('[data-rm-hint]').hidden=point||c.resolution!=='rm';
  if(c.resolution!=='rm')root.querySelector('[name="cast_repeatRM"]').checked=false;
  root.querySelector('[data-form-settings]').hidden=!c.transform&&!c.summon;
  root.querySelector('[name="cast_transform"]').closest('label').hidden=c.summon;
  root.querySelector('[data-cast-destination]').closest('label').hidden=c.summon;
  root.querySelector('[data-summon-settings]').hidden=!c.summon;
  root.querySelector('[data-cast-section="transformation"] > summary').textContent=c.summon?'Criaturas invocadas':'Transformação em criatura / PNJ';
  root.querySelector('[data-form-rules]').textContent=c.summon?'O mestre salva para autorizar as criaturas. O jogador precisa ter acesso às fichas ou compêndios. Cada cópia recebe controle do evocador e desaparece ao expirar. As fichas originais permanecem intactas.':'Usa a ficha e a EF atual da criatura. A ficha original é preservada. Volta ao acabar a duração, ao chegar a EF zero ou ao resistir em RM por turno. Dano excedente não passa para a original.';
  section('point',point&&!c.summon);
  section('duration',c.summon||!point||calendar);
  const durationHint=root.querySelector('[data-cast-section="duration"] > p.hint');
  if(!durationHint.dataset.original)durationHint.dataset.original=durationHint.textContent;
  durationHint.textContent=c.summon?'Duração contada a partir da chegada prevista, depois do atraso. Aparece em Efeitos do evocador e das criaturas. Ao expirar, remove as cópias temporárias. Dez rodadas = 150 segundos do calendário. Se o relógio saltar além de atraso e duração, a invocação já estará expirada.':durationHint.dataset.original;
  show('effectName',!point);
  section('transformation',c.summon||(!point&&(c.useType==='transformation'||c.transform)));
  section('resolution',!point&&(!c.transform||c.invisible||resistance||c.resolution==='attack'||c.damage>0));
  show('invisible',!point);
  root.querySelector('[data-invisibility-hint]').hidden=point||!c.invisible;
  section('direction',!point&&(c.rotate||c.shape!=='self'));
  section('targets',area);
  show('persistAfterExit',area&&!c.transform&&c.repeatRM);
  root.querySelector('[data-persistence-hint]').hidden=!area||c.transform;
  const successEnd=root.querySelector('[name="cast_rmSuccess"] option[value="end"]');
  successEnd.textContent=c.persistAfterExit&&area?'Encerrar neste alvo até o fim da magia':'Encerrar neste alvo (em área: até sair e entrar)';
  root.querySelector('[data-rm-hint]').textContent=c.persistAfterExit&&area?'Teste ao usar ou entrar na área e no início do turno do alvo, mesmo depois de sair. Falhas mantêm os ajustes sem acumular e podem repetir o dano integral. Resistir segue a opção escolhida acima. Entrar novamente não renova o prazo nem concede um teste extra.':'Teste ao usar ou entrar na área; depois, no início do turno do alvo. Falha pode repetir dano integral e aplicar ajustes sem acumular. Sair remove os ajustes; entrar novamente pede outra RM. Sem combate, não há repetição por turno.';
  root.querySelector('[data-target-hint]').hidden=point||c.shape==='self';
  root.querySelector('[data-cast-section="resolution"] > summary').textContent=fromItem?'Ataque da ficha':resistance?'Resistência e resultado':'Resolução e dano';
  root.querySelector('[data-area-hint]').hidden=!area;
  show('offset',c.rotate);show('distance',area);show('width',c.shape==='ray');show('angle',c.shape==='cone');show('includeCaster',area);
  show('targetFilter',!point&&c.shape!=='self');
  show('fa',resistance);show('resistedDamage',resistance&&!(c.repeatRM&&c.repeatDamage)&&(!c.transform||c.damage>0));show('column',c.resolution==='attack'&&!fromItem);show('defense',c.resolution==='attack'&&!fromItem);
  show('damage',!fromItem&&(!c.transform||c.damage>0));root.querySelector('[data-item-attack-hint]').hidden=!fromItem;
  show('duration',c.summon||calendar||Boolean(c.effectName)||c.repeatRM||c.transform||c.invisible||hasAdjustments(c));show('unit',c.summon||calendar||Boolean(c.effectName)||c.repeatRM||c.transform||c.invisible||hasAdjustments(c));
  const fixed=['melee','ranged'].includes(c.useType)&&c.resolution==='attack';
  show('resolution',!fixed);
  const hints={melee:'Ataque na tabela com os dados da arma. Marque os alvos no mapa; a distância corpo a corpo é conferida pela mesa.',ranged:'Ataque na tabela com os dados da arma. Configure o projétil em Animação. Alcance é conferido pela mesa.',self:'Usa o próprio personagem. Em Resolução e dano, escolha sem teste, ataque, RM ou RF; a duração é configurada separadamente.',targets:'Usa os alvos marcados no mapa. Em Resolução e dano, escolha ataque, RM, RF ou sem teste.',area:'Escolha círculo, cone ou linha, depois a resolução: ataque direto, RM/RF ou sem teste. O visual pode usar Na área posicionada.'};
  root.querySelector('[data-use-hint]').textContent=c.summon?'Adicione criaturas e quantidades; configure atraso e duração. Ao usar, posicione cada cópia. JB2A é opcional e aparece nas criaturas quando chegam.':point?'Posicione um visual fixo no mapa, com duração e luz opcionais. Sem testes, dano ou teletransporte.':c.resolution==='rm'?'Usa RM em cada alvo, conforme a FA configurada. A opção acima define se o teste se repete nos próximos turnos.':c.transform?'Escolha a criatura e a duração. O token usa a nova forma e volta ao normal ao encerrar.':hints[c.useType]??'';
}
