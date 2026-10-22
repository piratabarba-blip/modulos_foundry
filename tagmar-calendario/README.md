# Tagmar — Grande Calendário

Módulo para Foundry VTT 14, compatível com `tagmar_rpg`, `tagmar3er_oficial` e `tagmar3er-oficial`.

Versão estável **1.0.0**, para Foundry VTT **14.369**. Inclui dia/noite gradual, ambiente, clima por bioma e latitude, marés e efeitos visuais nativos com esmaecimento configurável. O responsável pelo projeto aprovou o resultado visual na mesa em **22/10/2026** e autorizou esta publicação. As automações são opcionais por cena e não alteram regras nem compêndios.

## Instalação e atualização

No Foundry, abra **Módulos adicionais → Instalar módulo** e cole o [manifesto de instalação](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-calendario/module.json). Se já estiver instalado, use o botão de atualização do módulo. Ative **Tagmar — Grande Calendário** no mundo e mantenha **libWrapper ativo** para a troca de clima sem redesenhar o mapa. Recarregue também os navegadores dos jogadores após atualizar.

As preferências salvas são preservadas. A sincronização visual do clima permanece desligada por padrão até ser autorizada na cena. Para configurar, siga as seções abaixo.

## Ambiente, clima e marés

Em **Configurar cena → Ambiente**, use a seção **Tagmar — Ambiente, clima e marés**. É necessário salvar a cena para aplicar; fechar/cancelar não grava. As preferências ficam nas flags do módulo na cena. A sincronização visual, se autorizada, também controla `scene.weather` usando os efeitos nativos. Não modifica regras nem compêndios.

### Escolher a região

- **Bioma:** floresta tropical, floresta temperada, savana/campos, deserto, pântano, lago, oceano/região costeira, mar aberto, tundra/região polar, montanha ou interior/subterrâneo.
- **Ambientes aquáticos:** lago tem perfil úmido e menor variação diária de temperatura; oceano/região costeira e mar aberto reduzem ainda mais essa variação, com maior exposição ao vento em mar aberto. São parâmetros fictícios de ambientação, não previsão meteorológica. Escolher um bioma não ativa marés nem redefine opções existentes. Para marés de referência do litoral, habilite Região costeira e Mostrar marés; o modelo não calcula ondas ou correntes oceânicas. Lago novo permanece sem marés por padrão.
- **Latitude:** a mesma já usada pelo dia/noite. Zero representa Calco no Equador por hipótese de ambientação; valores positivos ao norte, negativos ao sul.
- **Altitude:** metros acima do nível do mar. Altitudes maiores reduzem a temperatura no modelo; o bioma montanha não define uma altitude automaticamente.
- **Região climática:** nome opcional. Duas cenas com o mesmo nome e parâmetros geográficos usam a mesma sequência; sem nome, a sequência é própria de cada cena.
- **Região costeira:** influencia umidade/amplitude térmica e permite mostrar marés. É independente do bioma.
- **Dia/noite automático:** mantém o controle já existente, também disponível no botão de sol. Continua exigindo a opção global do calendário.

Interior/subterrâneo suspende clima, marés e atualizações automáticas da escuridão, sem apagar preferências. Não restaura a escuridão anterior: ajuste a iluminação manualmente se necessário. A automação é por cena inteira, não por andar.

### Modos de clima

- **Desligado:** não mostra a linha de clima nem gera alterações.
- **Automático:** gera céu limpo, nuvens, neblina, chuva leve, chuva, tempestade ou neve conforme condições simuladas. Temperatura e vento variam continuamente; os nomes mudam ao cruzar limiares. Neve automática exige temperatura calculada de até 1 °C.
- **Manual:** mantém condição, temperatura e vento escolhidos pelo mestre, inclusive combinações incomuns deliberadas.
- **Manter clima atual:** captura o clima ao salvar e o mantém até trocar de modo. Salvar novamente sem sair desse modo não faz novo sorteio. Se não existia clima visível, usa o novo ambiente como referência. As marés não congelam com o clima.

O cálculo é determinístico por região e instante do calendário: recarregar, entrar depois ou retroceder a data não sorteia novamente. Usa frentes interpoladas de 6–24 horas; saltar muitos dias calcula diretamente o destino. O cálculo informativo não grava dados nem faz chamadas externas ou tabelas aleatórias no chat. A integração visual opcional grava somente quando precisa mudar o efeito ou seu registro de restauração. Todos os usuários calculam a mesma informação da **cena ativa**, inclusive se o mestre estiver visualizando outra cena.

### Faixas abaixo de dias comuns/festivos

Quando habilitadas, aparecem até duas linhas, tanto no HUD completo quanto no compacto:

```text
🌦️ Chuva leve · 18 °C · Vento fraco
🌊 Maré enchendo · Preamar 16:20
```

Passe o mouse/foco para detalhes. O mestre pode clicar para abrir a aba Ambiente da cena ativa; jogadores só consultam. O HUD cresce apenas pelo espaço das linhas ativadas e continua respeitando os limites da tela.

### Marés: modelo simplificado e ajustável

Marque **Região costeira** e **Mostrar marés**. O padrão é um ciclo de **745 minutos (12h25)** entre preamares, com amplitude de **±1 metro** relativa ao nível médio. A preamar de referência ocorre às **06:00 do dia zero do calendário** (relógio mundial zero e deslocamento zero). Hora decimal: 6,5 significa 06h30. O calendário mostra a condição atual e o próximo extremo (preamar ou baixamar); `(+1d)` indica o dia seguinte.

Esse modelo não tenta inferir a gravitação das três luas nem representa tábua real, profundidade navegável ou regra oficial de Tagmar. É uma onda periódica fictícia, sem previsão de ressacas ou efeito do vento. O mestre pode ajustar período, referência e amplitude para a costa da campanha.

### Escopo e testes

### Efeitos visuais nativos (opcional)

Na cena ativa, marque **Sincronizar efeitos visuais com o clima** e salve. Desligado por padrão, inclusive nas cenas existentes. Funciona com os modos Automático, Manual e Manter clima atual.

| Condição do calendário | Efeito nativo |
| --- | --- |
| Chuva leve / Chuva | `rain` |
| Tempestade | `rainStorm` (alternativa: `rain`) |
| Neblina | `fog` |
| Neve | `snow` |
| Neve com vento a partir de 35 km/h | `blizzard` (alternativa: `snow`) |
| Céu limpo / Parcialmente nublado / Nublado | Sem efeito (`weather: ""`) |

O limiar de nevasca é uma escolha visual de ambientação, não uma regra oficial. Só usa IDs presentes no `CONFIG.weatherEffects`; se um efeito não existir, mantém o atual. Não acrescenta sons, relâmpagos, penalidades ou mudanças na iluminação. Não altera a neblina de exploração (fog of war).

Apenas o GM ativo eleito grava o efeito na **cena ativa**, via atualização normal do documento compartilhado. Jogadores recebem essa atualização sem ganhar permissões. Não há gravação a cada segundo se o efeito continua igual. O desempenho/configuração gráfica de cada cliente pode afetar a aparência. A integração controla a cena inteira, não espaços internos ou andares individuais; não a habilite em mapas internos/mistos se quiser evitar esse efeito geral. Não use outro módulo controlando `scene.weather` ao mesmo tempo.

Antes da primeira alteração, registra o efeito anterior em `flags.tagmar-calendario.weatherVisualState`. Ao desligar a sincronização, escolher clima Desligado ou bioma Interior/subterrâneo, restaura esse efeito **somente se a cena ainda estiver com o último efeito aplicado pelo calendário**; uma escolha manual posterior é preservada. Apaga o registro ao concluir a restauração. Se o efeito antigo deixou de existir, restaura sem efeito. Em cenas inativas essa reconciliação aguarda a próxima ativação. Desativar/desinstalar o módulo inteiro não executa restauração: desligue a opção nas cenas antes ou ajuste o efeito nativo manualmente.

A iluminação continua sob controle independente do dia/noite. Para testar rapidamente, use clima Manual, selecione Chuva, marque a sincronização, salve e ative a cena; depois experimente Tempestade, Neve e Céu limpo.

#### Transição suave e troca de camada

Em **Configurações do jogo → Tagmar — Grande Calendário → Suavização dos efeitos de clima (segundos)**, escolha de 0 a 10 segundos reais. Padrão: **3 segundos**, divididos em 1,5 segundo para o efeito atual desaparecer e 1,5 segundo para o novo surgir. Se não houver efeito anterior, só há a entrada. Zero mantém a troca imediata. Não é mistura simultânea dos dois efeitos.

Deixe **Trocar clima sem redesenhar o mapa** ligado (padrão) e **libWrapper ativo no mundo**, carregado tanto pelo mestre quanto pelos jogadores. A integração usa um WRAPPER em `CONFIG.Scene.documentClass.prototype._onUpdate`, somente para atualizações próprias contendo clima, flags do calendário e metadados de revisão. O documento `scene.weather` continua persistido normalmente, permitindo entrada tardia/reconexão. Apenas a cópia dos argumentos entregue à rotina visual deixa de conter o gatilho `weather` do redraw; os dados originais dos hooks permanecem intactos. Em seu lugar é chamada `canvas.weather.initializeEffects` e concluída a entrada suave.

Atualizações manuais do clima, mudanças de dimensões, visão, tokens ou dados de terceiros continuam pelo fluxo nativo. Sem libWrapper, com a opção desmarcada ou se a troca falhar, o modo nativo permanece disponível e pode apresentar a piscada do redesenho. Nenhum arquivo do Foundry/libWrapper é alterado. Evite outros controladores simultâneos de clima; módulos que também envolvem `_onUpdate` podem exigir testes de compatibilidade.

`_stats` (incluindo sua forma achatada) é aceito e repassado normalmente: são metadados do servidor, não uma alteração visual extra. Os testes incluem esses metadados nos clientes simulados. Para investigar nova piscada, execute no console de cada cliente `game.modules.get("tagmar-calendario").api.getWeatherDiagnostics()`. O relatório local indica registro do wrapper, opção habilitada e as últimas 12 decisões: `layer-swapped` (camada), `native-path` (caminho nativo, com motivo) ou `native-fallback` (falha na troca). Não envia diagnósticos nem registra conteúdo de fichas/mundos; registra IDs de cena, nomes dos campos, alvo e horário. Clientes devem recarregar após atualizar o módulo.

O mestre envia uma flag transitória autenticada pelo mecanismo de documentos (`weatherTransition`), espera a saída e revalida cena, mestre eleito, configuração e condição antes de gravar o novo efeito. A flag é removida na conclusão/cancelamento. Cada cliente esmaece apenas o contêiner nativo de clima via alpha. O wrapper não modifica tokens, visão, máscaras ou iluminação.

Troca de cena ou configuração cancela o alvo antigo; um watchdog local restaura a opacidade se a atualização falhar ou o GM desconectar. Clientes que entrarem depois da preparação recebem o estado atual, sem reproduzir uma transição passada. O esmaecimento básico não exige outro módulo, mas o modo sem redraw exige libWrapper ativo. A validação automatizada cobre o ciclo de destruição/construção nativo simulado e dois clientes com troca de camada; o resultado visual também foi aprovado pelo responsável na mesa. Testes automatizados não garantem compatibilidade com toda combinação de módulos.

Testes da integração visual: `node tagmar-calendario/tests/weather-effects.test.mjs`, `node tagmar-calendario/tests/weather-transition.test.mjs` e `node tagmar-calendario/tests/weather-layer-swap.test.mjs`.

Teste mestre/jogador: ambos na mesma cena ativa, sincronização visual ligada, clima Manual. Alterne Chuva → Tempestade → Neve → Céu limpo, aguardando cada transição; confirme ausência de piscada, posição/seleção dos tokens preservada e visão do jogador inalterada. Recarregue o jogador para confirmar o efeito persistido. Teste mudar de cena durante o fade e desligar a sincronização. Se houver problema, desmarque a troca sem redraw e informe os erros do console.

Testes: `node tagmar-calendario/tests/weather.test.mjs`, além dos testes de dia/noite, inicialização e geometria. O teste `environment-browser.cjs` usa o formulário nativo `FormDataExtended` da instalação local e os templates reais em navegador isolado para validar campos, tipos, caixas desmarcadas e layout. Não equivale a teste multiplayer dentro do Foundry.

Roteiro de regressão: salvar/cancelar a configuração de uma cena de teste; habilitar clima e costa; avançar horas/dias/estações; experimentar manual/congelado; trocar de cena; confirmar interior excluído e dia/noite preservado; comparar mestre/jogador; conferir HUD compacto e reabrir a configuração para confirmar persistência.

## Dia, noite e estações

A passagem do tempo pode controlar a escuridão da **cena ativa**, para todos os usuários. Funciona com o relógio automático, botões de avanço/retorno e definição manual de data. Não altera regras, compêndios, fases lunares ou datas comemorativas.

### Ativar em uma cena de teste

1. Faça um backup do módulo instalado e use um mundo/cena de teste.
2. Ative **Ciclo automático de dia e noite** em **Configurações de Jogo → Tagmar — Grande Calendário**. O padrão é desligado.
3. Ative a cena desejada (apenas visualizá-la como mestre não a torna ativa).
4. No calendário, clique no novo botão de **sol**, marque **Esta cena acompanha o calendário** e escolha a latitude. O botão fica disponível somente para mestres, inclusive no HUD compacto.
5. Para Calco, use **0°**, tratando-a como situada no Equador por escolha de ambientação. O modelo mantém nascer do sol às 06:00 e pôr às 18:00 ao longo do ano.
6. Para regiões mais afastadas, use por exemplo **+30°**: dias mais longos no verão do calendário e menores no inverno. Valores negativos representam o hemisfério oposto e invertem a variação. Não foram atribuídas coordenadas oficiais a outros locais.
7. Passe o mouse sobre a hora para consultar fase solar, nascer/pôr do sol, latitude e estado da automação.

O amanhecer e o entardecer duram, por padrão, **60 minutos do jogo**, centrados no nascer/pôr do sol. Em Calco, isso significa 05:30–06:30 e 17:30–18:30. Para transições de **três horas**, configure **180 minutos**: 04:30–07:30 e 16:30–19:30. A escuridão varia continuamente de **0 (dia)** a **0,85 (noite)**; duração e intensidades são configuráveis.

Cada mudança também usa a **animação nativa de escuridão do Foundry**: por padrão, um fade de **2 segundos reais**, inclusive nos saltos manuais de horário. A opção **Suavização visual da iluminação (segundos)** permite 0–10 segundos; 0 desliga a animação. Pequenos ajustes (até 0,01 de escuridão) usam no máximo 0,75 segundo para terminar antes do próximo tick do relógio. Saltos grandes levam suavemente à condição do destino, sem reproduzir as horas puladas. As preferências de duração do crepúsculo já salvas não são sobrescritas.

### Estações e limites do modelo

Esta é uma simulação opcional de ambientação: usa inclinação de 23,44° como aproximação inspirada na Terra, meio-dia solar às 12:00 e os quatro marcos já existentes no calendário: 15/Água, 15/Ouro, 15/Sangue e 15/Vida. Inclui o Dia de Cruine na passagem anual. Não modela longitude, refração, relevo, clima ou luz das três luas. Latitude zero tem dias de 12 horas; os polos podem ter dia/noite contínuos. Os rótulos tradicionais das estações no calendário são preservados mesmo no hemisfério oposto.

### Controle do mestre e segurança

- Cada cena precisa ser autorizada individualmente. Cenas inativas não são gravadas; ao ativá-las, recebem o horário atual se estiverem autorizadas.
- Cavernas e interiores devem ficar desmarcados. O ciclo é por cena, não por andar; não configure uma cena mista como exterior se desejar escuridão independente nos interiores.
- A **trava de escuridão** da cena pausa a sincronização. Desative o ciclo da cena ou a opção global antes de fazer ajustes manuais permanentes.
- Desligar o ciclo mantém a escuridão atual; não restaura automaticamente o valor anterior. Nenhuma cena é apagada ou recriada.
- Apenas um mestre ativo grava a iluminação e avança o relógio automático. Sem mestre conectado, não há novas gravações. Jogadores recebem as atualizações normais da cena e não ganham permissões de edição.
- O módulo grava somente `environment.darknessLevel`, conforme a [API de ambiente de cena do Foundry V14](https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.SceneEnvironmentData.html). Não muda luz global, luzes de tokens, tochas, visão, neblina ou níveis. Esses ajustes existentes influenciam o resultado visual.
- Desative outros controladores automáticos de escuridão nessa cena (por exemplo, sliders vinculados a outro relógio). A integração não tenta sobrescrever ou reconfigurar módulos de terceiros.
- A atualização é arredondada a 0,001 e não grava valores repetidos. Pedidos durante uma gravação são agrupados e aplicam o estado mais recente.

### Validação

Testes locais: `node tagmar-calendario/tests/daylight.test.mjs`, `node tagmar-calendario/tests/startup.test.mjs` e `node tagmar-calendario/tests/hud-layout.test.mjs`. Passaram os testes de cálculo, permissões, fila, hooks, troca de cena e relógio com dois mestres. O template Handlebars/CSS foi renderizado em navegador isolado nos modos aberto e compacto; isso não substitui o teste visual dentro do Foundry.

Conferência com o código instalado da versão 14.369: o campo efetivo da trava é `environment.darknessLock`; também reconhecemos `darknessLevelLock`, nome apresentado na documentação da API. Não são regravados nenhum desses campos pelo módulo.

As prévias beta.1 e beta.2 foram instaladas localmente; o responsável pelo projeto aprovou o resultado e autorizou a publicação da 0.8.0. Os cenários automatizados não equivalem a uma confirmação de teste multiplayer ao vivo. Para regressão em outras mesas, conferir: madrugada/meio-dia/crepúsculos; salto de data entre os dois solstícios em latitude 0 e +30; troca de cena; cavernas excluídas; trava; relógio com dois mestres; reentrada de jogadores; HUD aberto/compacto.

## Abertura automática ao entrar no mundo

Em **Configurações de Jogo → Tagmar — Grande Calendário**, o mestre pode controlar **Abrir automaticamente ao entrar no mundo**. A opção vem ativada e vale para todos os usuários do mundo, inclusive jogadores que entrarem depois.

O calendário abre ao entrar ou recarregar o mundo, preservando posição, tamanho e modo compacto salvos em cada cliente. Alterar a opção afeta as próximas entradas; não força janelas sobre usuários já conectados. Cada pessoa pode fechá-lo durante a sessão e reabri-lo pelo botão do calendário.

A abertura não muda a data, não inicia o relógio e não altera permissões. Atualizações de horário e avisos não reabrem um calendário fechado manualmente.

Teste: `node tagmar-calendario/tests/startup.test.mjs`.

## Ajuste visual 0.7.5

- Campo do dia ampliado para exibir números maiores sem corte, tanto no Tagmar XXX quanto no Tagmar 3ER Oficial.
- Nenhuma regra de calendário ou de sistema foi alterada.

## Ajustes visuais 0.7.4

- Textos de data, hora, luas e eventos ampliados, mantendo paleta e famílias de fontes.
- Modo compacto mostra somente os três ícones lunares no cabeçalho; nomes/fases continuam no título dos ícones.
- Dias marcados mostram festividades e mensagens agendadas ao passar o mouse ou receber foco pelo teclado. Mensagens são exibidas como texto, não HTML.
- Larguras independentes para modo aberto e compacto, salvas por cliente. A preferência anterior de largura é preservada.
- Ajuste automático à área disponível ao trocar de resolução, sem sobrescrever a largura escolhida.
- Novas instalações começam em 400 px. A largura mínima preferida é 320 px; telas menores podem limitar a apresentação.
- Teste de geometria: `node tagmar-calendario/tests/hud-layout.test.mjs` a partir do repositório de módulos.

Calendário, datas, fases, agendamento e permissões do Mestre não tiveram suas regras alteradas.

## O que já funciona

- calendário oficial de 12 meses com 30 dias;
- Dia de Cruine como dia extraordinário entre os anos;
- relógio sincronizado com `game.time.worldTime`;
- fases calculadas de Agmarim (28 dias), Armina (90 dias) e Denégria (361 dias);
- controles de mestre para avançar dia/hora ou definir uma data;
- botão nas ferramentas de Token e API para macros;
- roda vetorial original, sem incorporar arte de terceiros.
- símbolo central original do T de Tagmar em forma de machado.
- datas comemorativas, solstícios e equinócios oficiais destacados na roda.
- HUD único em semicírculo, sem moldura, livremente reposicionável e redimensionável.
- marca de Tagmar fornecida pelo responsável pelo projeto, incorporada sem deformação ou alteração visual.
- mensagens agendadas por data e horário, controle por mês e relógio automático de ¼× a 4×.
- modo minimizado persistente que mantém apenas informações, luas, eventos e controles.
- jogadores podem solicitar avisos públicos; o mestre valida, administra e mantém o controle exclusivo do tempo.

## Instalação

Use este manifesto no instalador de módulos do Foundry:

`https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-calendario/module.json`

O sistema Tagmar também declara este módulo como dependência obrigatória e pode oferecê-lo automaticamente durante a instalação.

Para instalação manual, copie a pasta `tagmar-calendario` para `Data/modules`, reinicie o Foundry e ative **Tagmar — Grande Calendário** no mundo de Tagmar.

Para abrir por macro:

```js
game.modules.get("tagmar-calendario").api.open();
```

As regras do calendário devem ser conferidas com as fontes oficiais do Tagmar antes da versão estável.
