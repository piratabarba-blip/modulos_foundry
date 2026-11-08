# Tagmar Efeitos Mágicos 1.4.0 — XXX / Foundry 14

Integração original de **Marcos Walker**. Adaptação por **Vinícius F. Lago (Pirata)**, com autorização do autor confirmada por Pirata. Token Magic FX permanece um projeto independente de SecretFire e colaboradores, sob sua própria licença GPL-3.0.

Restrito ao sistema `tagmar_rpg` (XXX). Não modifica nem dá suporte ao oficial, não contém automações do laboratório e não substitui o Token Magic FX original. A partir do XXX **2.7.0-v14.1-rc.48**, esta integração e Token Magic FX são dependências obrigatórias. Os efeitos continuam desligados por padrão em cada item; a instalação não configura magias automaticamente.

Manifesto de instalação e atualização: https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-token-fx/module.json

O download da integração é versionado. Token Magic FX **0.8.4** é obtido do autor original e é a versão validada para esta publicação; versões posteriores precisam de nova revisão de compatibilidade.

## Como testar

1. Instale o Token Magic FX original **0.8.4** e este módulo. A dependência libWrapper também deve estar ativa.
2. Ative os dois módulos no mundo XXX e recarregue o navegador. Se o Foundry solicitar instalação/ativação das dependências ao atualizar o sistema, aceite.
3. Abra um item **Magia**, **Tecnica_Combate** ou **Combate** na ficha de um personagem ou NPC. Clique em **FX**, no cabeçalho da janela do item.
4. Escolha o próprio personagem/NPC ou os **alvos marcados**, selecione um efeito (por exemplo `glow` ou `fire`) e clique em **Testar**. Isso não rola dados nem salva a configuração.
5. Use **FX → Remover** para retirar os efeitos desse item na cena atual. **Limpar FX** no cabeçalho da ficha remove os efeitos originados pelos itens atuais daquele ator, inclusive sobre alvos, sempre preservando filtros de outras fontes.
6. Para guardar a configuração use **Salvar**. A aplicação automática começa somente quando você marca **Aplicar também ao usar/rolar este item** e salva.

## Animações JB2A

Requer **Sequencer 4.3.0** e **JB2A Free 0.9.4** (versões usadas na conferência) ativos. A biblioteca Patreon também é detectada, mas não foi testada nesta versão. Não instala módulos automaticamente nem copia imagens de bibliotecas. O módulo continua exclusivo do XXX.

1. Em **Configurações do jogo → Tagmar Efeitos Mágicos**, a opção **Usar animações JB2A** permite desligar a integração para o mundo. Cada item continua sem animação até ser configurado.
2. Abra o arco na ficha do personagem e clique em **FX**.
3. Marque **Usar animação neste item** e **Executar também ao usar/rolar este item**.
4. Digite `arrow` na busca e escolha `jb2a.arrow.physical.white.01`. As variantes disponíveis dependem da biblioteca instalada.
5. Escolha **Projétil: atacante → alvos**, selecione o arqueiro na cena, marque um inimigo em outra posição e use **Testar**. O teste não salva a configuração nem rola dados.
6. Reabra o FX, configure e **Salve**. Ao clicar no nome do arco na ficha, o efeito acompanha o início do ataque, independentemente de acerto, erro ou crítico.

**No próprio token** e **Nos alvos marcados** podem exibir uma animação breve, por 0,5 a 15 segundos reais, ou acompanhar uma duração salva no calendário. Projéteis usam a duração do arquivo. **Tamanho** ajusta o visual de 0,1× a 50×. **Raio (casas)** maior que zero substitui esse tamanho: raio 1 ocupa um diâmetro de duas casas, sem modificar a área mecânica da magia. **Tonalizar cor** aplica uma tonalidade; para outra cor original, prefira uma variante da biblioteca quando existir.

### Escudos, fogo e outros efeitos com duração

1. Abra o FX da magia, escolha a animação disponível e marque o uso automático. Para um visual contínuo, prefira uma variante `loop`, quando disponível, em vez de `intro` ou `outro`.
2. Escolha **No próprio token** ou **Nos alvos marcados**.
3. Em **Tempo do efeito**, escolha **Até terminar a duração no calendário** e defina o prazo uma única vez em **Duração / aviso na ficha** (rodadas, segundos, minutos, horas, dias ou semanas). A animação e a luz acompanham esse prazo, inclusive em portais. Salve uma vez para essa magia; não será perguntado a cada uso.
4. Use a magia na ficha. O prazo começa no horário atual do **Grande Calendário de Tagmar**. Relógio parado pausa a contagem; avançar o tempo encerra o visual quando o prazo acaba. Isso acompanha o tempo do jogo, não o tempo real da sessão.
5. Reutilizar o mesmo item renova a duração e substitui seus alvos anteriores. Itens diferentes mantêm prazos separados. **Testar** continua sendo uma prévia breve e não inicia nem renova o prazo salvo.

O prazo ativo é guardado no item e pode ser reconstruído ao recarregar o navegador ou retornar à cena, enquanto não tiver expirado. O mestre conectado limpa os registros expirados. **FX → Remover** ou **Limpar FX** cancela também o prazo, evitando que o visual volte na próxima abertura. Uma macro externa de limpeza do Sequencer encerra somente a imagem, sem cancelar o prazo no item.

Cada participante desenha uma cópia local temporária do visual; mantenha a permissão **Criar efeitos** do Sequencer em **Jogador** (padrão do módulo) para que todos possam vê-la. A integração respeita as permissões e o modo de fotossensibilidade de cada cliente e não muda essas configurações.

A duração é informada pelo mestre conforme o efeito escolhido da magia; não é extraída automaticamente do texto das regras. O temporizador vale para o visual JB2A, não para os filtros Token Magic, que continuam com remoção manual. Um efeito visual de invisibilidade não oculta o token nem aplica condições.

### Script para personalizar

**Lista de animações:** use a seta ao lado da busca para abrir todas as opções. A lista tem altura limitada e barra de rolagem própria, sem cortar os últimos efeitos. Digitar filtra por palavras em português ou pelo código original, sem exigir acentos. Setas, Page Up/Down e Home/End navegam; Enter escolhe e Esc fecha a lista. Também é possível clicar no efeito.

**Tamanho e duração:** o multiplicador visual aceita de 0,1 a 50 (por exemplo, 8×). No próprio token/alvos, um raio maior que zero define o diâmetro em casas e substitui o multiplicador; a interface mostra qual controle está valendo. Use raio 0 para voltar à escala relativa ao token. Salve e use o item novamente para atualizar um efeito ativo. **Duração visual (s)** vale somente para o visual breve, sem calendário; fica oculta para projéteis e para duração pelo calendário. **Testar** continua sendo uma prévia breve em tempo real, sem iniciar o prazo da magia.

A lista de animações JB2A exibe nomes descritivos em português, com cores, fases e variantes: por exemplo **Flecha · Tipo físico · Cor branca · Variante 01**. Procure pelo nome em português e selecione uma opção completa. São traduções dos nomes visuais da biblioteca, não equivalências oficiais de magias de Tagmar. O identificador original continua salvo no item e no script; configurações antigas permanecem compatíveis e você também pode colar um código JB2A. Termos novos ainda desconhecidos são preservados, sem inventar uma tradução.

Expanda **Script gerado — copiar e personalizar**. Os campos de tamanho, raio e cor atualizam o código mostrado. Copie para uma macro **Script** do Foundry para editar livremente. Essa macro é uma prévia independente em segundos reais; ela não altera o FX salvo nem mantém o temporizador do item. A configuração não executa código arbitrário inserido no diálogo.

Sem alvo válido, nenhum projétil é criado e a rolagem segue. Tokens na mesma posição não recebem projéteis de distância zero. Havendo vários tokens do mesmo ator, selecione somente o atacante correto. A origem nunca é um token de outro personagem apenas por estar selecionado. Alvos de outra cena são ignorados.

O modo de fotossensibilidade do Foundry é respeitado e nunca é alterado pela integração. No teste, a configuração informa quando essa proteção, uma dependência ausente ou a opção global impede o efeito. A ausência dos módulos opcionais não bloqueia o ataque.

**FX → Remover** e **Limpar FX** encerram somente os visuais identificados como originados dos respectivos itens, na cena aberta. Macros JB2A externas e filtros de outros módulos são preservados. A validação automatizada usa documentos simulados; a aparência e a sincronização entre participantes precisam do teste na mesa.

## Direção, área e efeitos na ficha

No FX do item, expanda **Direção, área e efeito na ficha**. Todas as opções novas vêm desligadas. **Virar para o alvo** gira o token antes do uso; o ajuste em graus corrige a orientação original da imagem (zero = imagem apontando para baixo). A rotação bloqueada do token é respeitada.

Para testar uma magia em área, marque **Usar resolução / duração ao clicar no item**. Escolha círculo, cone ou linha e as dimensões na unidade da cena (por exemplo metros). Clique no nome da magia na ficha: círculo usa um clique para posicionar o centro; cone/linha usam um clique para a origem e outro para a direção. Esc cancela sem aplicar dano. Também há destinos **Próprio personagem** e **Alvos marcados**, sem desenho de área.

Configure a resolução conforme o efeito escolhido da magia:

- **RM ou RF:** informe a FA, o dano se falhar e se uma resistência bem-sucedida evita todo o dano, metade ou nada. Usa a rolagem nativa de resistência do Tagmar. Uma resistência bem-sucedida sempre evita o aviso de duração.
- **Ataque:** em itens do tipo **Combate**, coluna e danos vêm do próprio item, incluindo bônus e penalidades; os campos duplicados ficam ocultos no FX. Magia de ataque direto não desconta defesa. Armas usam a categoria L/M/P e a defesa ativa de cada alvo. Os danos seguem os valores cadastrados para cada percentual, inclusive quando diferentes de uma simples proporção do dano a 100%. Alterações no item valem no próximo uso. Em itens sem esses dados de combate, informe coluna, dano a 100% e desconto de defesa no FX. Cada alvo tem seu dado e consulta a tabela nativa do sistema. Danos comuns são aplicados automaticamente pela rotina de EH/ABS/EF. Críticos ficam pendentes para a tabela/regra específica, sem inventar um dano automático.
- **Sem teste:** aplica o dano e/ou marcador configurado diretamente, útil para efeitos consentidos ou sem resistência.

O mestre precisa estar conectado e visualizar a cena da magia. Jogadores que controlam o evocador podem solicitar a resolução; o mestre executa as alterações nos demais atores. Os resultados ficam registrados no chat e o mesmo cartão não é processado duas vezes. Se houver falha parcial, o cartão informa a interrupção e guarda os alvos concluídos; confira-os antes de repetir qualquer ação. Tokens vinculados à mesma ficha são considerados uma vez, porque compartilham os recursos.

Ataques de itens **Combate** usam o cartão nativo do sistema para cada alvo: imagem, descrição, coluna, faixa de cor, dano e dado. Não há uma segunda rolagem nem gasto de munição por cartão. O nome do alvo aparece acima, com aviso quando o dano já foi aplicado. **Ações manuais do cartão** conserva os botões nativos para ajustes e críticos; eles continuam atuando nos tokens selecionados no mapa, e aplicar novamente um dano já automático o repetirá. Críticos e falhas críticas recebem também a resolução nativa individual, identificada pelo alvo. A aplicação das consequências continua manual. O resumo da área permanece no chat.

**Nome do efeito temporário** cria um ActiveEffect informativo, com imagem e prazo na ficha. Não aplica bônus, penalidades ou condições por conta própria. Usar novamente a mesma magia renova esse marcador. A duração segue o calendário; **10 rodadas equivalem a 150 segundos**. O Foundry já avança 15 segundos por rodada completa; o Grande Calendário 1.1.3 suspende o avanço em tempo real enquanto há combate iniciado, evitando contagem dupla. Passar de um combatente para outro na mesma rodada não desconta mais 15 segundos. Encerrar o combate permite retomar o relógio automático, se estava ligado. O mestre desativa os marcadores expirados, preservando o aviso Expirado na ficha; apagar manualmente um marcador não é o mesmo que limpar o visual JB2A.

Se houver animação JB2A habilitada, **Exibir como** define seu destino: projétil, próprio token, alvos afetados ou **Na área posicionada**. Quando existe marcador temporário, o visual usa sua mesma duração. Filtros Token Magic não são disparados pela resolução automática. **Testar** no FX continua sendo apenas visual: não causa dano nem cria efeitos nas fichas.

**Na área posicionada:** configure círculo, cone ou linha em **Direção, área e efeito na ficha**, com suas dimensões na unidade da cena, e ative a resolução do item. Ao usar, posicione a área; uma única animação aparece ali, mesmo sem alvos ou se todos resistirem. O raio/multiplicador visual separado fica oculto: o tamanho vem da área. Cone e linha seguem a direção escolhida, e o visual é recortado aos limites da seleção. Escolha um arquivo JB2A adequado à forma; as margens transparentes e o desenho do arquivo podem deixar partes da área sem imagem. A contagem de alvos continua baseada na área, não nos pixels da animação. **Testar** também permite posicionar a área, sem aplicar dano. O visual com calendário fica naquele local, sem acompanhar tokens, e é reconstruído ao retornar à cena até expirar. Neste modo, o campo de script orienta usar o teste/uso do item, pois a posição ainda precisa ser escolhida no mapa.

A seleção usa o **centro do token**, inclusive aliados. Confira alcance da evocação, paredes e altura antes de confirmar a área: não há bloqueio por parede nem cálculo de cobertura. Evocação e gasto de karma continuam sob controle da mesa. Itens do tipo Combate gastam sua munição uma vez por uso, inclusive quando ligados à Gestão de munições; não gastam uma vez por alvo. Um efeito com resistência voluntária ou regras condicionais exige escolher os alvos e a configuração apropriados; não há leitura automática do texto da magia.


### Uso simples: teste, dano e aviso de duração

O FX pode cuidar somente do prazo. Bônus, penalidades, luz e invisibilidade dependem das opções ativadas no item. A descrição do item aparece no cartão de resolução do chat. A configuração é por item; os textos das magias não são interpretados automaticamente.

### Invisibilidade

1. Abra **FX** no item. Escolha **No próprio personagem**, **Nos alvos marcados** ou **Em área**.
2. Em **Resistência e resultado / Resolução e dano**, marque **Tornar o destinatário invisível**. Isso ativa a resolução do item e abre a duração.
3. Para uma magia consentida, escolha **Sem teste / só duração**, dano **0**. Se a regra exigir RM/RF, configure o teste; somente quem receber o efeito fica invisível.
4. Em **Duração / aviso na ficha**, informe o prazo. O nome vazio usa o nome do item. Salve e use normalmente; **Testar** continua sendo apenas visual.
5. A aba **Efeitos** mostra a invisibilidade e o tempo restante. Remover ou desativar o efeito retira sua condição; ao expirar, a condição termina automaticamente.

Usa a condição **Invisível** nativa do Foundry. Ative **Visão dos tokens** na cena para a detecção funcionar. Mestre, dono e sentidos que detectam invisibilidade seguem as regras nativas. A magia não apaga fontes de luz, não muda o botão de ocultação manual e não altera permissões. JB2A é opcional; animações e luzes configuradas separadamente podem continuar visíveis.

Magias diferentes e a condição Invisível colocada manualmente permanecem independentes. Encerrar uma não encerra as outras. Renovar a mesma magia substitui seu próprio prazo. Em RM por turno, um sucesso retira a invisibilidade conforme a opção escolhida; no modo livre neste turno, uma falha posterior pode reaplicá-la. A saída da área segue **Manter o efeito ao sair da área**. Tokens vinculados ao mesmo ator compartilham a condição. Atacar não encerra a magia automaticamente; o mestre decide quando removê-la conforme as regras.

- **Manipulação de Luz por uma hora (exemplo de configuração):** próprio personagem, sem teste, dano 0, nome Manipulação de Luz, duração 1 hora. Confirme a duração real nas regras do efeito escolhido.
- **Amizade em um alvo:** marque o token, escolha Alvos marcados e RM; dano 0, FA e duração conforme a magia. O chat mostra sucesso/falha. Se resistir, não recebe o aviso. Se falhar, recebe o aviso; as consequências ficam com a mesa.
- **Técnica de combate:** mesma configuração de duração, usando o ícone da técnica. Sem teste significa que o uso não faz uma rolagem da técnica; configure Ataque somente quando a resolução escolhida realmente for um ataque. Técnicas sem nível continuam impedidas.
- **Dano instantâneo:** escolha alvo ou área e resolução; deixe o nome do efeito temporário vazio. Nenhum aviso é criado.
- **RF:** use Resistência Física quando a regra pedir RF, com FA e dano configurados. Não troca RF por RM.

A aba **Efeitos → Tempo de magias e técnicas** mostra o ícone, nome e tempo restante. Personagens usam a aba existente; PNJs recebem a aba para estes avisos enquanto o módulo está ativo. A contagem aceita rodadas de 15 segundos, segundos, minutos, horas, dias e semanas de 7 dias (limite total: 365 dias). O prazo continua salvo ao fechar a ficha ou recarregar o Foundry.

Quando o prazo acaba, o aviso fica **Expirado** e inativo. Usar novamente o mesmo item renova o aviso correspondente. O botão de lixeira remove somente aquele aviso; não desfaz consequências narrativas nem limpa animações externas. Os demais efeitos e itens da ficha continuam como estavam. O tempo é atualizado na seção sem forçar reabertura da ficha.

## Limites deliberados

- O fluxo visual normal não aplica dano ou condições. A resolução automática opcional descrita acima aplica apenas o dano e o marcador configurados. No fluxo normal, o gatilho `tagmar_itemRoll` acontece no início do uso do item; cancelar uma rolagem posterior não remove o visual.
- A aplicação automática vem desligada, inclusive em itens com configuração antiga. Presets legados são lidos sem sobrescrever `magicFx`; presets ausentes exigem escolha manual, sem substituição silenciosa.
- JB2A é uma integração opcional, separada dos filtros Token Magic. Projéteis são breves; efeitos no token/alvos podem permanecer pelo prazo configurado, sem alterar resultados ou consumir munição adicional.
- Não usa seleção de tokens de outros atores como destino implícito. Se houver vários tokens vinculados ao mesmo ator, selecione exatamente um deles. Tokens não vinculados são tratados pela ficha de seu próprio ator sintético.
- Filtros Token Magic só podem alterar tokens que o usuário possui; para outros alvos, o mestre aplica o filtro. Animações JB2A podem apontar para inimigos sem editar seus documentos: Sequencer distribui apenas o visual e aplica suas próprias permissões.
- A remoção dos filtros e animações breves atua na cena aberta e nos efeitos identificados por esta versão. Cancelar o temporizador no item também impede sua reconstrução em outra cena. Efeitos antigos sem identificação não são removidos pelo botão da ficha; limpe-os antes de apagar seus itens.
- Filtros Token Magic são persistentes até a remoção manual. Desativar a aplicação automática ou o módulo não apaga filtros já aplicados: limpe-os antes.
- O ID do módulo foi preservado para ler configurações legadas. Não ative outra cópia da integração antiga junto.
- A instalação não ativa módulos nem modifica configurações, atores ou tokens de nenhum mundo.

## Validação

`node tools/test-token-fx.cjs` na raiz do repositório de módulos.

Validação: 17 verificações de lógica; fluxo da interface em navegador isolado; aplicação/remoção de 52 presets com as funções originais do Token Magic 0.8.4. O mantenedor confirmou o funcionamento da interface, iluminação e duração no Foundry 14.369. As rotinas de ataque, resistência, críticos, temporizadores e permissões também têm testes automatizados.

O resumo da resolução aparece ao final, depois dos cartões individuais, com imagem em tamanho normal e o fundo do cartão padrão. Os destinatários privados são preservados. A solicitação inicial só é removida após salvar o resumo e seu registro de resultados; se o envio falhar, o registro concluído permanece na mensagem original.

### Configuração organizada por tipo de uso
No topo, escolha **Tipo de uso**: no próprio personagem, nos alvos marcados, em área, em um ponto do mapa, ataque corpo a corpo, ataque à distância, transformação ou invocação. **Personalizado / manter configuração** preserva escolhas anteriores para consulta e adaptação. As opções relacionadas aparecem conforme o uso; área permite círculo, cone ou linha. Em **Resistência e resultado**, escolha ataque, RM, RF ou somente efeito conforme as regras do item. Magia de ataque direto usa a tabela do Tagmar sem RM/RF e sem descontar a defesa, como antes.

As seções abrem separadamente. Dano e colunas dos itens Combate vêm da ficha. A duração do jogo é configurada uma vez em **Duração / aviso na ficha**; o visual breve continua usando segundos reais. A animação por calendário acompanha o prazo do item. Trocar o tipo não apaga bônus, dano, prazo ou arquivo visual; confira a configuração antes de salvar. Cancelar descarta mudanças. A resolução automática depende da opção explícita, e o perfil não deduz regras pelo nome do item.

### Filtro de aliados
Em **Área e alvos → Quem pode ser atingido**, escolha **Todos** (padrão preservado), **Não atingir aliados** ou **Somente aliados**. Vale na resolução automática, antes de testes, dano e avisos de duração, em círculos/cones/linhas ou alvos marcados. Aliados são tokens com a mesma disposição Amigável (+1) ou Hostil (-1) do evocador, sem relação com propriedade de jogador/mestre. Neutros e disposição secreta não contam como aliados: entram em Não atingir aliados e ficam fora de Somente aliados. Para filtrar, o evocador deve ser Amigável ou Hostil; caso contrário a resolução é interrompida antes de alterar fichas. Próprio personagem ignora o filtro; em área, Incluir o evocador continua necessário para incluí-lo. A animação da área cobre a área inteira, mesmo quando alguns tokens foram excluídos das consequências. Ajuste conforme a regra da magia; o filtro não é deduzido pelo nome.

## Atualização 1.2.0: luz, tempo e consulta dos alvos

Para a versão 1.4.0, use **Tagmar XXX 2.7.0-v14.1-rc.64** ou posterior. Atualize também o Grande Calendário para **1.1.3**. Os arquivos de animação não estão incluídos: JB2A e Sequencer são opcionais e precisam estar ativos para os visuais JB2A.

Em **Animação — JB2A**, marque **Emitir luz na cena** para iluminar o mapa durante o efeito. Defina os raios de luz forte/fraca na unidade da cena e a cor. A luz respeita paredes, acompanha o visual no token e termina com ele. Em área, fica no centro e é circular, mesmo para cone ou linha; em projéteis fica no destino durante a animação. Não substitui a iluminação própria do token nem cria luz permanente na cena.

A aba **Efeitos → Tempo de magias e técnicas** também lista visuais JB2A já ativos, com ícone, nome e prazo restante, inclusive se não foi criado um aviso ActiveEffect separado. Mostra **Visual e iluminação** quando a luz está habilitada. O botão **Encerrar** interrompe o visual e sua luz; aparece para quem pode editar o item. Marcadores informativos separados mantêm seu próprio prazo.

Cada alvo recebe seu cartão normal de ataque e, quando necessário, a resolução de crítico. O resumo aparece por último, em pergaminho opaco. Passe o mouse no nome de um alvo no cartão ou resumo para destacá-lo na cena atual, respeitando a visibilidade do usuário. Os botões manuais continuam disponíveis para ajustes; não aplique novamente dano que o cartão já informa ter aplicado automaticamente.

## Resistência à magia no início do turno

No FX do item, marque **Usar resolução / duração ao clicar no item**. **Usa RM?** seleciona a resistência à magia para qualquer destino (área, alvos marcados ou próprio personagem). Configure a **Força de ataque da resistência** conforme a magia. A opção de RF continua disponível em Resolução e dano, sem repetição automática de RM.

- **Faz RM toda rodada, no início do turno do alvo?** desligado: apenas o teste inicial. As configurações antigas continuam assim.
- Ligado: cada alvo testa ao receber a magia. Quem falhar recebe um aviso com duração; se o nome estiver vazio, usa o nome do item. Preencha a duração, por exemplo 10 rodadas = 150 segundos. O Grande Calendário precisa estar ativo.
- No início do próximo turno de cada alvo afetado, o mestre conectado executa uma nova RM usando a FA salva no lançamento. Passou: o aviso fica **Encerrado: resistiu à magia**, e o visual JB2A com tempo de jogo e sua luz são retirados daquele alvo. Falhou: continua até resistir ou expirar. O dano inicial só se repete quando **Reaplicar dano integral ao falhar na resistência de cada turno** estiver marcado.
- O histórico fica no aviso e evita testes duplicados ao recarregar, repetir eventos ou voltar o turno. Existe no máximo um teste por rodada para cada aviso. Sem combate iniciado não há testes periódicos. O alvo precisa estar no monitor de combate com o mesmo token que recebeu a magia.
- Remover/desativar esse aviso também encerra seu visual associado. Visuais de área são compartilhados: permanecem enquanto houver outro alvo afetado pela mesma conjuração e somem quando o último terminar, ou ao acabar o prazo. Um visual de uma conjuração mais recente não é removido pela anterior.
- Para usar essa opção em uma magia já em andamento, configure o item e use novamente quando apropriado: avisos antigos não ganham repetição retroativamente. Não altera atributos, condições narrativas nem as regras da magia.

Recurso disponível na versão 1.4.0, validado na mesa.
# Transformação em criatura / PNJ

Na configuração **FX** da magia, escolha **Transformação** em tipo de uso. Procure uma criatura/PNJ do mundo pelo nome ou arraste uma ficha de criatura de um compêndio para a área indicada. Defina a duração e salve. O botão **Testar** continua sendo somente uma prévia visual: a transformação acontece ao usar a magia.

O perfil começa com **No próprio token**, sem teste. É possível escolher alvos, área ou RM na mesma configuração. A transformação só é aplicada a quem receber o efeito; passar na RM impede a transformação. Com RM por turno, passar em um teste posterior encerra a forma naquele alvo.

A forma usa os atributos, itens, imagem, tamanho e recursos atuais da criatura escolhida, incluindo sua EF atual. A ficha original e a criatura usada como modelo permanecem preservadas. A troca ocorre apenas no token escolhido, mesmo quando ele estava vinculado à ficha principal; outros tokens do mesmo personagem não mudam junto. Abra a ficha pelo token para usar a forma.

O retorno acontece quando a EF da forma chega a zero ou menos, quando a duração termina, ao encerrar o efeito ou pelo botão **Voltar à forma original**, na aba **Efeitos** da ficha do token. A EF original é restaurada sem receber o dano excedente da forma. Itens e alterações feitos dentro da forma temporária não são transferidos à ficha original. Posição, rotação, visão e luz própria do token são mantidas ao retornar.

É necessário o Grande Calendário e um mestre conectado. O registro de retorno fica salvo no token e é conferido ao reconectar. Não exclua a ficha original enquanto houver tokens transformados. Uma nova transformação exige primeiro retornar à forma original. Disponível no Tagmar XXX com Tagmar FX 1.4.0.


### Portal ou outro visual em um ponto do mapa

1. No FX do item, escolha **Tipo de uso → Em um ponto do mapa**.
2. Em **Posição e tamanho do efeito**, ajuste a largura na unidade da cena e a rotação em graus.
3. Em **Animação — JB2A**, escolha uma animação de portal ou outro visual. O destino fica **No ponto escolhido**.
4. Escolha animação breve ou duração pelo calendário. Opcionalmente, marque **Emitir luz na cena** e ajuste seus raios e cor.
5. Salve e use o item. Uma guia quadrada acompanha o mouse: clique no mapa para confirmar; **Esc** cancela sem aplicar nada. **Testar** posiciona somente uma prévia breve, sem salvar nem iniciar o prazo.

O efeito permanece no ponto escolhido mesmo se o personagem se mover. O efeito com duração de calendário aparece na aba **Efeitos** do evocador, pode ser encerrado ali e termina junto com sua luz. Novo uso do mesmo item renova e reposiciona esse efeito. O mestre precisa estar conectado e visualizar a mesma cena neste modo.

Esse modo não identifica alvos, gasta munição, faz ataques, testes de resistência ou transformações. Um portal visual não teletransporta personagens. Configurações antigas desses recursos são ignoradas enquanto o modo de ponto estiver ativo.


### Filtros avançados do Token Magic

A seção **Token Magic — filtros no token** fica oculta por padrão. Para exibi-la, acesse **Configurações de jogo → Tagmar FX → Mostrar filtros avançados do Token Magic** e reabra o FX do item. A preferência é individual, por cliente. Ocultar a seção não desativa efeitos automáticos, não remove filtros ativos e não apaga configurações salvas. No modo **Em um ponto do mapa**, essa seção permanece oculta porque seus filtros se aplicam a tokens.

### RM por turno, dano e debilitação

**Permanência após sair (02/11/2026):** em **Área**, marque **Manter o efeito ao sair da área até terminar a duração** para áreas com RM por turno. Bônus/penalidades e testes continuam no alvo fora da área, com o prazo original. Voltar não concede RM imediata adicional nem renova o prazo. **Ao passar na RM** continua independente: Encerrar desativa naquele alvo até o fim daquela conjuração (reentrar não reativa); Livre neste turno retira seus ajustes neste turno e volta a testar nos seguintes. Desmarcada, preserva a regra anterior: sair suspende e entrar exige nova RM. Sem RM por turno, avisos e ajustes temporários já permanecem após sair. Transformações não usam este acompanhamento de área.

**Ampliação de 02/11/2026:** os ajustes agora ficam em **Resistência e resultado**, nos campos **Bônus / penalidade de habilidades** e **Bônus / penalidade de combate**. Informe 0 para não alterar, valor negativo para penalidade (−2) ou positivo para bônus (+2), em colunas. Também funcionam com teste inicial único ou sem teste, usando a duração do efeito. Sem nome preenchido, o aviso usa o nome do item. Os bônus manuais da ficha são preservados e somados aos ajustes nas rolagens. Repetir/renovar o mesmo efeito não o acumula; magias diferentes podem somar ajustes. Resistir, sair da área aplicável ou expirar retira o ajuste. Na opção de ficar livre apenas neste turno, retira agora e só volta a aplicar se falhar em novo teste. Configurações antigas de penalidade positiva continuam equivalendo à redução correspondente, e efeitos antigos já ativos permanecem compatíveis. Os valores antigos de penalidade positiva continuam compatíveis; novas configurações usam valores assinados.

Marque **Usa RM?**, **Faz RM toda rodada** e, se a regra escolhida permitir, **Reaplicar dano integral ao falhar na resistência de cada turno**. Informe FA, dano e duração. O dano repetido é integral nas falhas e zero nos sucessos; não depende da cor de um ataque. Desmarcado, mantém o comportamento anterior sem dano repetido.

Em **Ao passar na RM**, escolha ficar livre apenas naquele turno ou encerrar o efeito naquele alvo. Em área, a segunda opção concede imunidade durante a permanência: sair e entrar novamente pede uma nova RM. A área fica fixa onde foi posicionada, aceita novos alvos e usa sua duração original, sem renovar ao entrar. A verificação considera o centro do token, os filtros de aliados e a opção de incluir o evocador; paredes e altura continuam sob avaliação da mesa. Transformações mantêm retorno à forma original ao resistir e não usam essa persistência de área.

Os ajustes são temporários e usados pelas rolagens nativas, sem editar bônus manuais ou níveis dos itens. A aba Efeitos mostra os valores e o estado da resistência. A ficha exibe **Bônus/Penalidade** editável, **Efeito** e **Total** somente para consulta. Dano usa a rotina normal do sistema, inclusive EH, ABS e EF; este recurso não cria um canal especial de dano tóxico.

A repetição exige combate iniciado, calendário e um mestre ativo. No momento da entrada há uma RM; o próximo teste ocorre no turno seguinte elegível, sem repetir a entrada no turno já em curso. Excluir o aviso cancela aquele alvo durante sua permanência; ele poderá receber nova aplicação se sair e voltar. Use novamente o item para renovar/reposicionar a área. Esta configuração não é uma interpretação automática de todas as magias: por exemplo, uma regra que pede RM somente ao entrar não deve ser configurada como RM por turno.

### Invocar criatura / PNJ

1. Como mestre, abra o FX do item e escolha **Invocar criatura / PNJ**. Busque a criatura do mundo ou arraste sua ficha de um compêndio. Ela precisa ter EF atual positiva. Clique em **+ Adicionar criatura escolhida**. Salvar autoriza todas as criaturas da lista para invocações neste mundo.
2. Ajuste a **quantidade** de cada ficha ou adicione outras criaturas. Para três cópias da mesma ficha (exemplo de Replicar), use quantidade **3**. Pode retirar uma linha pelo botão **×**. Limite de 20 criaturas por uso. Configurações antigas de uma criatura continuam funcionando como uma linha de quantidade 1.
3. Configure **Atraso para aparecer (rodadas)**: 0 é imediato, 1 equivale a 15 segundos do jogo, 2 a 30 segundos, e assim por diante. A **duração** começa na chegada prevista, depois do atraso. O calendário é a fonte única de tempo, sem descontar novamente pelo combate. O jogador precisa de acesso de observador aos modelos/compêndios e de controle sobre o evocador.
4. Ao usar o item, posicione cada criatura com a imagem translúcida no mapa. Só depois do último clique a solicitação é enviada. **Esc cancela todo o conjunto**, sem criar fichas nem agendar as anteriores. O botão **Testar** testa só o visual. Atraso e escolhas ficam salvos na cena; fechar o navegador não apaga a espera. Em **Efeitos → Invocações aguardando**, consulte a contagem e, como mestre, cancele o agendamento.
5. Na chegada prevista, um mestre conectado cria as cópias temporárias e tokens desvinculados, com a disposição do evocador e permissão de controle para seus donos. Recursos, armas e imagem vêm dos modelos. As fichas originais não são alteradas. O agendamento usa a configuração salva no momento do uso e confere novamente as permissões e a disponibilidade dos modelos na chegada.
6. Em **Efeitos → Criaturas invocadas**, o evocador e cada criatura mostram o tempo restante. O mestre pode encerrar cada cópia pelo botão de parar. Ao expirar pelo calendário, ou quando o mestre apagar o token, a cópia temporária é removida. A limpeza é retomada ao reconectar; cópias manuais com outra identidade e tokens adicionais sem a marca da invocação são preservados.

JB2A é opcional. A animação aparece nos tokens quando chegam, com tamanho/raio e opacidade configurados. O visual por calendário acompanha o tempo restante; remover uma criatura não apaga o visual das outras. A animação breve só é executada quando a cena está sendo visualizada pelo mestre. Se o relógio saltar além de atraso e duração, nenhuma criatura já expirada é criada. Se houver falha parcial, o agendamento aparece como **Interrompido**, sem repetir automaticamente fichas já criadas: confira a cena antes de lançar novamente. Cancelar um agendamento interrompido não apaga cópias que já chegaram.

Alcance, obstáculos e ocupação do ponto são conferidos pela mesa. A invocação não consome Karma automaticamente, não coloca a criatura na iniciativa e não encerra a invocação por EF zero: vale a duração escolhida ou o encerramento do mestre. A remoção nativa do token também remove sua entrada de combate. Disponível na versão 1.4.0.
