# Tagmar — Grande Calendário

Módulo para Foundry VTT 14, compatível com `tagmar_rpg`, `tagmar3er_oficial` e `tagmar3er-oficial`.

Versão atual: **0.8.0** — ciclo de dia/noite com suavização visual, testado e aprovado pelo responsável pelo projeto no Foundry VTT **14.369**. Atualiza a versão 0.7.7 sem alterar as preferências já salvas.

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
