# Tagmar — Gerador de Personagens e PNJs

## Primeira versão pública do Gerador de Personagens e PNJs

- Módulo opcional para o mestre, compatível com Tagmar XXX e 3ER Oficial no Foundry 14.370.
- Prévia por raça, profissão e estágio, especialização, identidade sugerida, EH e distribuição por pontos.
- Cadeados preservam escolhas ao sortear novamente; criação no mundo somente após conferir.
- Restrições raciais/profissionais, ordens de sacerdotes e listas ATS respeitadas. Magias priorizam o maior nível permitido pelo estágio e orçamento.
- Kits opcionais de pertences, quantidades, pesos e carga. Não desconta moedas automaticamente.
- Visual escuro/dourado e ajudas (?). Sem novas criaturas, armas naturais ou biografias automáticas nesta primeira versão.

Instale pelo module.json e ative no Gerenciamento de Módulos. Atualize o sistema para receber as listas adicionais de técnicas ATS. Usa apenas o catálogo do sistema ativo e não inclui imagens próprias nem dados de campanha.

**Versão 0.1.0 para o mestre · Foundry VTT 14.370**

Módulo separado para montar uma ficha por **raça, profissão e estágio**, conferir uma prévia e preservar escolhas com cadeados. Interface escura com detalhes dourados, seguindo o gerador de tesouros do Tagmar.

## Instalar

Instale pelo [manifesto permanente](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-personagens/module.json). O pacote publicado não inclui fichas de teste nem dados de campanha.

## Abrir

Ative **Tagmar — Gerador de Personagens e PNJs** em **Gerenciamento de Módulos**. Use o ícone de pessoa com `+` na barra esquerda, junto aos atalhos dourados do Tagmar, depois de Viagens quando disponível, ou **Configurações do Jogo → Tagmar — Gerador de Personagens e PNJs → Abrir gerador**. O Sequencer não é uma dependência do gerador.

Macro opcional:

```js
game.modules.get('tagmar-personagens').api.open();
```

O módulo funciona com **Tagmar XXX** (`tagmar_rpg`) ou **Tagmar 3ER Oficial** (`tagmar3er-oficial`). Não requer outros módulos. Usa os compêndios e as funções de cálculo do sistema ativo. Não inclui compêndios ou imagens próprios, nem faz alterações nas fontes do sistema.

## Montar uma ficha

1. Escolha **Personagens** ou **Não Jogadores (PNJs)**.
2. Selecione raça, profissão e estágio entre **1 e 20**. A opção **Aleatória** sorteia apenas combinações de raça/profissão permitidas. Opções incompatíveis ficam desativadas nas listas; escolhas explícitas ou travadas inválidas geram aviso, sem substituir a ficha anterior.
3. A especialização começa em **Aleatória / sugerir**. Você pode escolher uma ou usar **Sem especialização**, para manter apenas as listas básicas. Sacerdotes recebem uma ordem correspondente ao deus sugerido ou escolhido. Ao escolher a escola de uma prévia de profissão aleatória, a profissão correspondente fica selecionada para manter a combinação.
4. Escolha **Priorizar a profissão** ou **Distribuição aleatória**. Ambas usam a compra por pontos do sistema; a segunda não é o método de atributos por sorteio de dados da ficha.
5. Escolha EH sorteada por d10 ou a média ponderada da tabela da profissão. Em **Kit de pertences**, escolha Aventureiro básico, Viagem e acampamento, Estudioso ou Sem kit. Quantidades e pesos são mostrados na prévia e entram na carga.
6. Clique em **Gerar prévia**. Confira atributos, recursos, pontos restantes e listas de itens.
7. Trave o que gostou e clique em **Sortear novamente**. Os blocos abertos e os cadeados ajudam a comparar as escolhas.
8. Escolha uma pasta e clique em **Criar ficha no mundo**. É criado um ator novo, com itens próprios, e sua ficha abre para revisão. Para produzir outra cópia, gere uma nova prévia.

Gerar, editar e sortear a prévia não criam atores nem alteram os compêndios. Não há geração de imagens, chamada a IA ou serviço externo durante o uso.

## Travas e ajustes

- Nome, raça, profissão, estágio e especialização têm cadeados próprios.
- Cada atributo pode ser editado e travado. O valor inclui o modificador racial; os demais atributos são redistribuídos dentro do orçamento.
- Habilidades, técnicas, magias, equipamentos e grupos de armas podem ser travados por bloco. Itens também têm cadeado individual.
- Os botões **+ / −** ajustam o nível de uma habilidade, técnica ou magia e fecham sua trava individual. A habilidade nata acompanha o estágio.
- **Escolher outro item** oferece busca e lista filtrada. Para comprar outro nível sem pontos disponíveis, diminua ou retire outro item primeiro.
- A trava da EH mantém a sequência de resultados d10/médias. Se o Físico mudar, o total de EH muda conforme esse atributo; para alterar o estágio, libere a trava de EH.
- **Identidade sugerida**: classe social Livre, altura em metros, peso em kg, idade e deus. Os números de aparência são sugestões narrativas, editáveis, e não concedem vantagens ou caracterizações. Editar altura, peso, idade ou deus preserva esse campo nos próximos sorteios; o cadeado pode liberá-lo. Uma ordem explícita e um deus travado incompatíveis produzem um aviso.
- Alterações na configuração deixam a criação desativada até gerar novamente. Travas incompatíveis com a raça, profissão ou orçamento produzem um aviso e preservam a prévia anterior.

Uma seleção explícita fica selecionada mesmo sem cadeado. Use **Aleatória** nos seletores para sortear essa escolha. **Abrir todas as travas** libera os cadeados; não muda as seleções dos campos.

## Cálculos e alcance desta primeira versão

A distribuição por profissão é uma **sugestão de construção**, não uma regra nova de Tagmar. Prioriza atributos e habilidades adequados à profissão e favorece os grupos das armas sugeridas. O mestre deve revisar escolhas narrativas, disponibilidade de ensino e acesso à especialização. A compatibilidade racial é conferida pelas tabelas das fontes abaixo, tanto no sorteio quanto antes de criar a ficha.

Os cálculos de orçamento, totais, EF, Karma, resistências, VB, defesa e absorção são obtidos das funções do sistema instalado. Os níveis respeitam o estágio; técnicas de bônus de FA têm limite 10. A EH acumula a base da profissão, seus ganhos por estágio e Físico. A média é ponderada pelas quatro faixas do d10 e arredondada no total.

Na distribuição das magias, o gerador completa a escolhida até o nível do estágio antes de comprar a próxima. Se os pontos não forem suficientes, compra o maior nível possível sem exceder o orçamento; uma trava individual conserva exatamente o nível editado. O nível aprendido respeita o estágio; o total/FA pode ser maior por incluir o atributo.

As magias vêm das listas **comuns**, básicas e da especialização escolhida. Magias ancestrais e perdidas ficam fora do sorteio. Técnicas que declaram outra técnica como pré-requisito ficam para revisão posterior na ficha. Pontos que não puderem ser gastos são mantidos e informados, sem inventar itens.

Equipamentos são sugestões comuns dos Reinos, com verificação dos mínimos de Força/Físico. Os kits também usam os Pertences do compêndio do próprio sistema, com quantidades e pesos originais: roupas, botas, mochila, cantil, pederneiras e iluminação; os kits ampliados acrescentam provisões ou material de escrita. São sugestões, não representam compra por dinheiro nem um kit oficial obrigatório. O gerador não desconta moedas. Itens e o bloco Equipamentos podem ser travados ou retirados; um item travado não é duplicado pelo kit. Armas e armaduras naturais, novas criaturas, caracterizações, genealogia e geração de biografias não fazem parte desta prévia. Confira as sugestões de aparência e complete moedas e história na ficha.

### Raças e profissões permitidas

A tabela básica segue [Características Básicas — Livro de Regras 3ER](https://tagmar.com.br/wiki/Default.aspx?PageName=Livro+de+Regras+-+Caracter%C3%ADsticas+B%C3%A1sicas). As combinações adicionais seguem as páginas impressas 31–32 do [Livro ATS](https://tagmar.com.br/downloads/Tagmar%20-%20Livro%20ATS.pdf), mantendo a edição publicada usada nesta prévia.

- Humanos, Meio-Elfos e Elfos Florestais: as oito profissões.
- Elfos Dourados: todas, exceto Berserker.
- Anões: Guerreiro, Ladino ou Sacerdote.
- Pequeninos: todas, exceto Mago e Rastreador.
- Elfos Sombrios: Guerreiro, Ladino, Mago, Rastreador ou Bardo. Como Mago, só Colégio Sombrio; sem colégio usa apenas a lista básica.
- Gouras: Guerreiro, Ladino ou Feiticeiro. O líder sacerdote é uma exceção narrativa do livro, fora da geração comum de Personagem/PNJ.
- Meio-Orcos: as oito profissões.
- Napóis: todas, exceto Mago.
- Sekbetes: todas, exceto Mago e Bardo.

O limite de nível das magias segue [Magia — Livro de Regras 3ER](https://tagmar.com.br/wiki/Default.aspx?PageName=Livro+de+Regras+-+Magia). Priorizar magias no máximo é a estratégia solicitada para o gerador, não uma obrigação de compra imposta pelas regras.

### Listas das Terras Selvagens

O gerador reúne os nomes de especializações presentes nos dois compêndios, preservando os parâmetros da profissão dos Reinos. Técnicas continuam vindo dos itens instalados, filtradas por profissão e especialização; uma cópia de especialização pode ter custo menor que a básica. Não atribui uma lista profissional apenas pela raça Sekbete.

A prévia de compêndios acrescenta as listas de Berserker, Feiticeiro, Trapaceiros, Caçadores de Recompensa, Duelistas e Guardas, conforme as tabelas das páginas 51–52 do [Livro ATS](https://tagmar.com.br/downloads/Tagmar%20-%20Livro%20ATS.pdf). Mantém as técnicas homônimas atuais e registra a origem dos custos. Técnicas exclusivas do suplemento têm descrição e resolução manual; não implementam consequências novas automaticamente. Existem diferenças entre a wiki em revisão e a tabela do livro, registradas na auditoria; não são sincronizadas silenciosamente.

PNJs recebem os campos próprios de EF, EH e Karma usados pelas fichas e pelo dano no chat; seus tokens são desvinculados. Personagens têm token vinculado e usam a ficha por pontos. O mestre continua responsável por conceder acesso ao jogador.

## Desempenho e dados

O catálogo é carregado somente quando o mestre abre o gerador e fica em cache nessa sessão. Não há temporizador, processamento por rodada ou acompanhamento do calendário. Prévia e cadeados ficam na janela atual, sem guardar dados pessoais no pacote do módulo.

## Validação

Testes do núcleo com cópias dos compêndios instalados nos dois sistemas: profissões e raças, estágios 1/10/20, pontos, EH, filtragem de escolas, travas, IDs novos e recursos de PNJ. Teste de interface isolado com CSS nativo do Foundry: seleção, cadeados, edição, criação simulada de Personagem/PNJ e acesso exclusivo ao mestre. Prévia validada em uso pelo usuário antes da publicação.

## Licença e créditos

Código deste módulo: GPL-3.0-or-later. Usa as funções da implementação de fichas de **Marcos Walker e Vinicius Fernandez**, carregadas do sistema instalado. Conteúdo Tagmar consultado nos compêndios: **Projeto Tagmar**, CC BY-NC-SA 3.0 Brasil, com atribuição, uso não comercial e compartilhamento pela mesma licença. A adaptação consiste na interface de geração e na distribuição sugerida das escolhas.

[Projeto Tagmar](https://www.tagmar.com.br/) · [Licenciamento do Tagmar](https://tagmar.com.br/Licenciamento.aspx) · [Licença CC BY-NC-SA 3.0 BR](https://creativecommons.org/licenses/by-nc-sa/3.0/br/)

O módulo não inclui o Foundry Virtual Tabletop nem afirma endosso de seus desenvolvedores ou do Projeto Tagmar.
