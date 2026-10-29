# Tagmar Efeitos Mágicos 1.2.0 — XXX / Foundry 14

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

**No próprio token** e **Nos alvos marcados** podem exibir uma animação breve, por 0,5 a 15 segundos reais, ou acompanhar uma duração salva no calendário. Projéteis usam a duração do arquivo. **Tamanho** ajusta o visual de 0,1× a 5×. **Raio (casas)** maior que zero substitui esse tamanho: raio 1 ocupa um diâmetro de duas casas, sem modificar a área mecânica da magia. **Tonalizar cor** aplica uma tonalidade; para outra cor original, prefira uma variante da biblioteca quando existir.

### Escudos, fogo e outros efeitos com duração

1. Abra o FX da magia, escolha a animação disponível e marque o uso automático. Para um visual contínuo, prefira uma variante `loop`, quando disponível, em vez de `intro` ou `outro`.
2. Escolha **No próprio token** ou **Nos alvos marcados**.
3. Em **Tempo do efeito**, escolha **Até terminar a duração no calendário** e informe o número de segundos, minutos, horas ou dias. Salve uma vez para essa magia; não será perguntado a cada uso.
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

O FX pode cuidar somente do prazo, sem modificar atributos, bônus, penalidades, amizade, luz ou invisibilidade de verdade. A descrição do item aparece no cartão de resolução do chat. A configuração é por item; os textos das magias não são interpretados automaticamente.

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
No topo, escolha **Tipo de uso**: corpo a corpo, distância, magia de ataque direto, magia com resistência, magia em área, efeito sem teste ou técnica. **Personalizado / manter configuração** permite ajustar livremente. A escolha de um tipo muda a resolução correspondente (ataque, RM/RF ou sem teste); corpo a corpo/distância usam alvos marcados, e o atalho Magia em área escolhe círculo se ainda não havia círculo/cone/linha. Técnica mantém a resolução para ser conferida conforme sua regra. Bônus, danos, prazos e arquivos de animação não são apagados ao trocar de tipo.
As seções **Área e alvos**, **Resolução e dano**, **Duração / aviso na ficha**, **Direção do token** e **Animação — JB2A** abrem separadamente. RM/RF mostra somente seus campos; ataque Combate usa dados da ficha. Magia direta não usa resistência nem desconto de defesa. Cada seção começa recolhida; escolher um tipo abre a seção relevante. Abrir/reabrir não altera a configuração salva. Cancelar descarta mudanças. A caixa de resolução automática continua sendo uma escolha explícita, e o perfil não adivinha regras pelo nome nem muda sozinho o arquivo visual escolhido.

### Filtro de aliados
Em **Área e alvos → Quem pode ser atingido**, escolha **Todos** (padrão preservado), **Não atingir aliados** ou **Somente aliados**. Vale na resolução automática, antes de testes, dano e avisos de duração, em círculos/cones/linhas ou alvos marcados. Aliados são tokens com a mesma disposição Amigável (+1) ou Hostil (-1) do evocador, sem relação com propriedade de jogador/mestre. Neutros e disposição secreta não contam como aliados: entram em Não atingir aliados e ficam fora de Somente aliados. Para filtrar, o evocador deve ser Amigável ou Hostil; caso contrário a resolução é interrompida antes de alterar fichas. Próprio personagem ignora o filtro; em área, Incluir o evocador continua necessário para incluí-lo. A animação da área cobre a área inteira, mesmo quando alguns tokens foram excluídos das consequências. Ajuste conforme a regra da magia; o filtro não é deduzido pelo nome.

## Atualização 1.2.0: luz, tempo e consulta dos alvos

Use **Tagmar XXX 2.7.0-v14.1-rc.61** ou posterior junto desta versão. Atualize também o Grande Calendário para **1.1.3**. Os arquivos de animação não estão incluídos: JB2A e Sequencer são opcionais e precisam estar ativos para os visuais JB2A.

Em **Animação — JB2A**, marque **Emitir luz na cena** para iluminar o mapa durante o efeito. Defina os raios de luz forte/fraca na unidade da cena e a cor. A luz respeita paredes, acompanha o visual no token e termina com ele. Em área, fica no centro e é circular, mesmo para cone ou linha; em projéteis fica no destino durante a animação. Não substitui a iluminação própria do token nem cria luz permanente na cena.

A aba **Efeitos → Tempo de magias e técnicas** também lista visuais JB2A já ativos, com ícone, nome e prazo restante, inclusive se não foi criado um aviso ActiveEffect separado. Mostra **Visual e iluminação** quando a luz está habilitada. O botão **Encerrar** interrompe o visual e sua luz; aparece para quem pode editar o item. Marcadores informativos separados mantêm seu próprio prazo.

Cada alvo recebe seu cartão normal de ataque e, quando necessário, a resolução de crítico. O resumo aparece por último, em pergaminho opaco. Passe o mouse no nome de um alvo no cartão ou resumo para destacá-lo na cena atual, respeitando a visibilidade do usuário. Os botões manuais continuam disponíveis para ajustes; não aplique novamente dano que o cartão já informa ter aplicado automaticamente.
