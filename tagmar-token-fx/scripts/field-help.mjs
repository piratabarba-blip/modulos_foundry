// Ajuda da configuração; não altera os valores nem executa o item.
const fields = {
  cast_useType: 'Escolhe como usar o item: personagem, alvos, área, ponto fixo, transformação ou invocação. Invocar cria cópias temporárias das criaturas da lista, com controle do evocador, atraso opcional e duração pelo calendário. O mestre autoriza as criaturas ao salvar. Trocar o tipo pode ajustar opções; confira antes de salvar.',
  cast_summonDelay: '0 invoca imediatamente. Cada rodada de atraso equivale a 15 segundos do calendário: 2 = 30 segundos. O prazo da criatura começa na chegada prevista. A espera fica salva na cena, aparece em Efeitos e pode ser cancelada pelo mestre. Precisa de um mestre conectado para executar; se o relógio saltar além de toda a duração, não cria criaturas já expiradas.',
  cast_enabled: 'Ativa a resolução configurada ao usar o item: testes, dano, transformação ou avisos de duração. No modo de ponto, abre o posicionamento do visual. Salvar não executa a magia.',
  cast_targetFilter: 'Aliados são tokens com a mesma disposição Amigável ou Hostil do evocador. Neutros não contam como aliados. Configure a disposição dos tokens; não depende de quem os controla.',
  cast_repeatRM: 'Faz RM ao usar ou entrar na área e no início dos turnos seguintes do alvo. Configure o que acontece ao resistir e se as falhas repetem dano. Sair da área remove a penalidade; entrar novamente exige outra RM. Sem combate iniciado não há repetição por turno.',
  cast_repeatDamage: 'Cada falha aplica novamente o dano integral informado, sem usar percentual de ataque. Sucesso não causa dano neste modo. Usa a aplicação normal de dano do sistema; sair da área ou terminar a magia não cura o dano já sofrido.',
  cast_rmSuccess: 'Livre neste turno: remove a penalidade, mas testa novamente no próximo turno. Encerrar: não testa mais; em área, só volta a testar ao sair e entrar. A duração total da área não é renovada pela entrada.',
  cast_combatPenalty: 'Informe a redução em colunas como número positivo. Exemplo: 2 aplica −2 ao bônus de combate enquanto o alvo estiver afetado. Não acumula a cada turno nem altera o valor manual salvo. Magias diferentes podem somar suas penalidades.',
  cast_combatModifier: 'Ajuste temporário de combate, em colunas: 0 não altera, −2 penaliza em duas colunas, +2 concede duas colunas. Soma ao bônus manual nas rolagens, sem sobrescrevê-lo. Repetições da mesma magia não acumulam; passar na resistência, sair da área ou expirar retira seu ajuste. Magias diferentes podem somar ajustes.',
  cast_skillModifier: 'Ajuste temporário nos testes de habilidades: 0 não altera, números negativos penalizam e positivos dão bônus. Não muda os níveis cadastrados. Usa a duração da magia, mesmo sem RM por turno; resistir retira o ajuste. O mesmo efeito é mantido ou renovado, sem acumular a cada rodada.',
  cast_skillPenalty: 'Redução global nos testes de habilidades, em colunas. Informe número positivo; 0 desativa. Usa um efeito temporário sobre o bônus de habilidades, sem modificar os níveis dos itens. Sai ao resistir, sair da área ou expirar.',
  cast_resolution: 'Ataque na tabela faz uma rolagem por alvo. RM e RF testam a resistência de cada alvo. Sem teste não rola dados: registra a duração e aplica o dano informado, se maior que zero. Para só efeito, use dano 0.',
  cast_fa: 'Força de ataque usada no teste contra RM ou RF do alvo. Preencha conforme o efeito escolhido na regra; não é o dano nem a coluna de um ataque comum.',
  cast_column: 'Coluna usada na tabela de resolução. Em itens da aba Combate, o FX aproveita as colunas e os danos do próprio item, sem precisar repetir estes valores.',
  cast_damage: 'Dano de referência a 100%. O ataque usa o percentual obtido; RM/RF usam a regra escolhida para resistência. Sem teste, o valor é aplicado diretamente. Use 0 para não causar dano.',
  cast_resistedDamage: 'Quando o alvo passa na RM ou RF, define se ainda recebe nenhum dano, metade ou o dano integral. Só escolha redução parcial se a regra da magia permitir. Resistir impede o efeito com duração.',
  cast_defense: 'Desconta o valor de defesa ativa do alvo da coluna manual. Não marque para magia de ataque direto. Nos itens de Combate, a categoria e o cálculo vêm do ataque do sistema.',
  cast_distance: 'Usa a unidade configurada na cena, normalmente metros. No círculo é o raio: 6 significa 12 de diâmetro. No cone ou linha é o comprimento desde a origem.',
  cast_width: 'Largura total da linha na unidade da cena. Exemplo: comprimento 10 e largura 2 formam uma faixa de 10 por 2.',
  cast_angle: 'Abertura do cone em graus. Exemplo: 90 forma um cone de um quarto de volta. A direção é escolhida no segundo clique no mapa.',
  cast_includeCaster: 'Permite incluir o próprio evocador se o centro do token estiver dentro da área. Os filtros de aliados também se aplicam; confira quem será atingido.',
  cast_persistAfterExit: 'Nas áreas com RM por turno, mantém o efeito, ajustes e testes no alvo mesmo fora da área. A duração original não é renovada ao sair ou voltar. Se passar na RM, ainda vale Encerrar neste alvo ou Ficar livre neste turno. Desmarcado, sair suspende o efeito e entrar pede nova RM. Sem RM por turno, avisos e ajustes já duram até o prazo original.',
  cast_pointSize: 'Largura do visual na unidade da cena. A guia quadrada indica o espaço onde a animação será desenhada. Não é uma área de dano e não seleciona alvos.',
  cast_pointRotation: 'Gira a imagem posicionada, em graus. Zero mantém a orientação original do arquivo; 90 gira um quarto de volta.',
  cast_transform: 'Usa a forma de uma criatura/PNJ mantendo a ficha original preservada. Retorna ao terminar a duração, ao chegar a EF 0, ao passar na RM por turno ou ao encerrar manualmente. O dano excedente não passa para a ficha original.',
  cast_effectName: 'Nome do aviso na aba Efeitos. Exemplo: Proteção mágica. Para um uso instantâneo, deixe vazio. RM por turno e transformação usam o nome do item se este campo estiver vazio.',
  cast_duration: 'Prazo único de jogo: aviso, transformação, RM por turno e animação JB2A configurada pelo calendário, inclusive portais. Exemplo: 10 rodadas equivalem a 150 segundos. Segue o calendário; não são segundos reais esperando na tela.',
  cast_unit: 'Unidade da duração: rodada = 15 segundos; minuto = 60 segundos; hora = 60 minutos; dia = 24 horas; semana = 7 dias. A passagem de rodada e o calendário usam a mesma contagem.',
  cast_rotate: 'Gira o token do evocador para o alvo ou para a direção escolhida da área ao usar o item. Requer que a rotação do token não esteja bloqueada.',
  cast_offset: 'Compensa a orientação do desenho do token. No padrão do Foundry, zero aponta para baixo. Ajuste em graus se a imagem ficar de lado ou de costas para o alvo.',
  jbEnabled: 'Ativa a animação JB2A selecionada neste item. Requer JB2A e Sequencer ativos. O visual, sozinho, não causa dano nem aplica condições.',
  jbAutomatic: 'Dispara o visual quando o item é usado/rolado normalmente, mesmo sem acertar. Quando a resolução do FX está ativa, o próprio fluxo da magia controla a execução.',
  jbMode: 'Define onde aparece a animação: projétil entre evocador e alvo, no token, nos alvos ou na área posicionada. Em um ponto do mapa, o visual fica fixo no local escolhido.',
  jbScale: 'Multiplicador do tamanho visual. Exemplo: 2 dobra o tamanho. Não aumenta alcance nem área de dano. Raio visual fixo ou área/ponto usam suas próprias dimensões.',
  jbDuration: 'Tempo da animação breve em segundos reais. Exemplo: 1 mostra um lampejo de um segundo; não significa que a magia dura só isso. No modo calendário, vale a duração de jogo.',
  jbTintEnabled: 'Aplica uma tonalidade sobre a imagem da animação. Não muda a cor da luz. Para um resultado mais fiel, prefira uma variante JB2A da cor desejada.',
  jbTint: 'Cor usada para tonalizar a animação quando Tonalizar cor estiver marcado. Partes escuras da imagem podem continuar escuras.',
  jbRadius: 'Raio visual em casas da grade. Exemplo: 1 produz diâmetro de 2 casas. Zero usa o multiplicador de tamanho do token. Não muda quais tokens recebem o efeito.',
  jbLightEnabled: 'Cria iluminação ao redor do efeito, respeitando as paredes. Apaga quando o visual termina. Não substitui a luz própria do token nem apenas clareia a imagem da animação.',
  jbLightBright: 'Raio de iluminação clara na unidade da cena. Exemplo: 3 ilumina claramente até 3 metros se a cena estiver em metros. Zero desativa a parte clara.',
  jbLightDim: 'Raio total de luz fraca, medido a partir do centro; não é uma distância adicional à luz clara. Exemplo: clara 3 e fraca 6 iluminam até 6. Use total igual ou maior que a luz clara.',
  jbLightColor: 'Cor da iluminação lançada no mapa. É independente da tonalidade e da cor original da animação JB2A.',
  jbOpacity: 'Transparência da animação JB2A: 100% mantém o visual original, 50% o deixa semitransparente e 0% o torna invisível. Não altera o token, a duração, os testes, o dano nem a luz emitida. Salve e use o item novamente para aplicar ao próximo efeito.',
  jbTimeMode: 'Animação breve usa segundos reais. Calendário usa o prazo de Duração / aviso na ficha e pausa quando o relógio para; não precisa informar a duração novamente. Projéteis usam o tempo do arquivo e bloqueiam esta lista. Para liberá-la, escolha No próprio token, Nos alvos marcados ou Na área posicionada em Exibir como. Uma transformação longa pode ter apenas um lampejo breve ao começar.',
  fxDestination: 'Destino dos filtros Token Magic: token do próprio personagem ou alvos marcados. É independente da animação JB2A; filtros permanecem até serem removidos.',
  fxAutomatic: 'Aplica os filtros Token Magic ao usar o item. Ocultar a seção avançada não desativa essa configuração nem remove filtros existentes.'
};
const extra = [
  ['[data-use-rm]', 'Faz um teste de Resistência à Magia em cada alvo. Magia de ataque direto usa a tabela de ataque, sem RM, salvo quando sua regra determinar resistência.'],
  ['[data-cast-area-shape]', 'Círculo: um clique fixa o centro. Cone ou linha: primeiro clique fixa a origem; segundo define a direção. Esc cancela. A seleção usa o centro dos tokens; confira paredes, altura e alcance.'],
  ['[data-cast-destination]', 'Quem pode receber a transformação: o próprio personagem, os alvos marcados ou os tokens dentro de uma área. Cada alvo recebe sua própria transformação e duração.'],
  ['[data-form-search]', 'Digite parte do nome para filtrar criaturas/PNJs do mundo. Selecione a forma na lista ou arraste uma ficha de um compêndio. A transformação usa a ficha e a EF atual dessa criatura.'],
  ['[data-fx-search]', 'Filtra os presets do Token Magic pelo nome. Você pode combinar filtros. Eles não são animações JB2A e precisam do módulo Token Magic ativo.']
];
// Escolhe uma região fora da janela, não apenas ao lado do botão (?).
export function positionHelp(tip, target, root) {
  const box=root.getBoundingClientRect(),anchor=target.getBoundingClientRect();
  const w=window.innerWidth,h=window.innerHeight,gap=10,edge=8;
  const regions=[
    {side:'right',left:Math.max(edge,box.right+gap),top:edge,width:Math.max(0,w-edge-box.right-gap),height:h-edge*2},
    {side:'left',left:edge,top:edge,width:Math.max(0,box.left-gap-edge),height:h-edge*2}
  ].sort((a,b)=>b.width-a.width);
  regions.push(
    {side:'bottom',left:edge,top:Math.max(edge,box.bottom+gap),width:w-edge*2,height:Math.max(0,h-edge-box.bottom-gap)},
    {side:'top',left:edge,top:edge,width:w-edge*2,height:Math.max(0,box.top-gap-edge)}
  );
  let selected;
  for(const region of regions.filter(r=>r.width>=120&&r.height>=32)) {
    tip.style.maxWidth=`${Math.min(340,region.width)}px`;tip.style.maxHeight='none';
    if(tip.getBoundingClientRect().height<=region.height){selected=region;break;}
  }
  selected??=regions.filter(r=>r.width>0&&r.height>0).sort((a,b)=>b.width*b.height-a.width*a.height)[0]
    ??{side:'screen',left:edge,top:edge,width:Math.max(1,w-edge*2),height:Math.max(1,h-edge*2)};
  tip.style.maxWidth=`${Math.min(340,selected.width)}px`;tip.style.maxHeight=`${selected.height}px`;
  const bounds=tip.getBoundingClientRect(),clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  let left=clamp(anchor.left,selected.left,selected.left+selected.width-bounds.width);
  let top=clamp(anchor.top,selected.top,selected.top+selected.height-bounds.height);
  if(selected.side==='right')left=selected.left;
  if(selected.side==='left')left=selected.left+selected.width-bounds.width;
  if(selected.side==='bottom')top=selected.top;
  if(selected.side==='top')top=selected.top+selected.height-bounds.height;
  Object.assign(tip.style,{left:`${left}px`,top:`${top}px`});tip.dataset.side=selected.side;
}
let nextHelpId=0;
export function bindFieldHelp(root) {
  const controller=new AbortController(),options={signal:controller.signal};
  let tooltip,target,previousDescription,hideTimer;
  const hide=()=>{
    clearTimeout(hideTimer);tooltip?.remove();tooltip=null;
    if(target){if(previousDescription===null)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',previousDescription);}
    target=null;
  };
  const deferHide=()=>{clearTimeout(hideTimer);hideTimer=setTimeout(hide,120);};
  const add=(field,text)=>{
    if(!field)return;
    const label=field.closest('label');if(!label||label.querySelector('.tagmar-fx-help'))return;
    const node=[...label.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(!node)return;
    const heading=document.createElement('span');heading.className='tagmar-fx-label';
    const caption=document.createElement('span');caption.dataset.fxLabelText='';caption.textContent=node.textContent.trim();
    const help=document.createElement('button');help.type='button';help.className='tagmar-fx-help';help.textContent='?';
    help.dataset.helpFor=field.name||field.getAttributeNames().find(n=>n.startsWith('data-'));
    help.setAttribute('aria-label',`Ajuda: ${caption.textContent}. ${text}`);
    const show=()=>{
      hide();target=help;previousDescription=help.getAttribute('aria-describedby');
      tooltip=document.createElement('div');tooltip.className='tagmar-fx-help-tooltip';tooltip.id=`tagmar-fx-help-${++nextHelpId}`;
      tooltip.setAttribute('role','tooltip');tooltip.textContent=text;document.body.append(tooltip);
      help.setAttribute('aria-describedby',[previousDescription,tooltip.id].filter(Boolean).join(' '));
      positionHelp(tooltip,help,root);
      tooltip.addEventListener('pointerenter',()=>clearTimeout(hideTimer),options);
      tooltip.addEventListener('pointerleave',deferHide,options);
    };
    help.addEventListener('pointerenter',show,options);help.addEventListener('pointerleave',deferHide,options);
    help.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();show();},options);
    help.addEventListener('focus',show,options);help.addEventListener('blur',hide,options);
    help.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hide();}},options);
    heading.append(caption,help);node.replaceWith(heading);
  };
  for(const [name,text] of Object.entries(fields))add(root.querySelector(`[name="${name}"]`),text);
  for(const [selector,text] of extra)add(root.querySelector(selector),text);
  window.addEventListener('resize',hide,options);
  root.addEventListener('scroll',hide,{...options,capture:true});
  root.addEventListener('change',hide,options);
  root.querySelector('.window-header')?.addEventListener('pointerdown',hide,options);
  return ()=>{hide();controller.abort();};
}
