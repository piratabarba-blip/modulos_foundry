# Tagmar — Gerador de Personagens, PNJs e Criaturas

## Versão 0.3.1 — atalho direto na barra

- Um único botão dourado no final da barra esquerda abre diretamente o gerador.
- Não cria um segundo ícone de ferramenta nem altera a camada ou seleção ativa do mapa.
- Funciona no Tagmar XXX e no 3ER Oficial, preservando as quatro abas e as configurações existentes.

**Atualização:** na configuração inicial do Foundry, abra Módulos adicionais e clique em Atualizar no gerador. Não é necessário reinstalar o sistema.

[Instalar pelo manifesto permanente](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-personagens/module.json) · [Baixar a versão 0.3.1](https://github.com/piratabarba-blip/modulos_foundry/releases/tag/tagmar-personagens-v0.3.1)

## Versão 0.3.0 — criação de criaturas e interface revisada

[Instalar ou atualizar pelo manifesto](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-personagens/module.json) · [Baixar a versão 0.3.0](https://github.com/piratabarba-blip/modulos_foundry/releases/tag/tagmar-personagens-v0.3.0)

- Quatro abas: Personagens, PNJs, Variação de nível e Criar sua criatura.
- Criação do zero com fórmulas do Livro de Criaturas 3.02, componentes escolhidos ou sugeridos e travas.
- Personagens/PNJs até estágio 50; ataques naturais em CD e dano por peso/Força. Extensões de porte identificadas como extraoficiais.
- Habilidades nos seis grupos em todas as abas. Personagens, PNJs e criação do zero incluem as 42 habilidades; variações preservam a lista da criatura-base.
- Velocidade informada diretamente em VB, componentes em linhas compactas e buscas na própria caixa, sem nomes repetidos.
- Correção da categoria de defesa vazia, que podia causar ataque na coluna zero; novas fichas usam L quando não havia categoria definida.

**Para mestres:** na configuração inicial do Foundry, abra Módulos adicionais e clique em Atualizar. Se ainda não tiver o módulo, escolha Instalar módulo e use o manifesto acima. Depois ative-o no mundo. O gerador é opcional e usa apenas o catálogo do sistema ativo.


## Criaturas — Variação de nível

Disponível na versão **0.2.0**. Para atualizar, use o botão Atualizar do módulo no Foundry.

Na terceira aba, **Criaturas — Variação de nível**, escolha um compêndio do sistema ativo e digite o nome em **Procurar criatura**: as sugestões aparecem na própria caixa, com rolagem. Selecione com o mouse ou com as setas e Enter; Esc fecha a lista. Informe um nome opcional e uma **potência relativa**: 50% sugere uma versão mais fraca, 100% conserva a base e 150% sugere uma mais forte. Clique em **Gerar prévia** para comparar a original com a variante. O intervalo disponível é de 25% a 300%.

O módulo reaproveita os ataques naturais, armaduras, habilidades, técnicas, magias, textos, tamanho, imagens e movimentos já presentes na ficha escolhida. A lista carrega apenas o índice do compêndio; a ficha completa é lida somente ao gerar a criatura selecionada. Não carrega todas as criaturas e imagens de uma vez.

- **Cadeados:** nome, recursos/estágio, atributos, movimento e blocos de ataques, proteções, habilidades e poderes. Há também travas individuais de valores e itens. Editar um número na prévia fecha sua trava. Trocar de criatura-base limpa as travas anteriores.
- **Comparação:** os valores da original aparecem ao lado dos da variante. Pode ajustar os recursos, estágio, atributos, VB, VBE e iniciativa antes de criar.
- **Variação opcional:** recursos e dano podem variar em até 10% ao gerar novamente. Desligada, o mesmo percentual e as mesmas escolhas produzem os mesmos números.
- **Criar criatura no mundo:** cria um ator novo como **Não Jogador (PNJ)**, com itens próprios e token desvinculado, na pasta escolhida. Os originais, compêndios e atores da campanha não são alterados. Cada cópia registra sua origem e a adaptação na biografia.
- **Oficial e XXX:** usa exclusivamente os compêndios e imagens do sistema ativo. O módulo não acrescenta artes do XXX ao Oficial.

### Como funciona a sugestão de potência

Este é um recurso **extraoficial de construção**, não uma regra de progressão do livro nem uma medida garantida de dificuldade de encontro. Os totais são recalculados pelas mesmas funções usadas pela ficha de PNJ do sistema instalado.

1. EF, EH e Karma máximos são multiplicados pelo percentual. Valores zero continuam zero e a cópia começa com os recursos completos.
2. Dano-base e absorção dos equipamentos são multiplicados pela raiz quadrada da potência, preservando a sequência de danos de cada arma. Não troca o tipo do ataque nem inventa armadura ou poderes.
3. O estágio é multiplicado pela potência. A diferença de estágio ajusta grupos treinados, ataques sem grupo e níveis já treinados de habilidades e técnicas. Habilidades não aprendidas permanecem não aprendidas. RM, RF e Moral recebem essa diferença; defesa dos equipamentos recebe um quarto da diferença, truncado.
4. Atributos, anatomia, deslocamentos e níveis das magias permanecem os da base, salvo edição manual. Descrições de poderes podem mencionar números originais e precisam de revisão do mestre.
5. Uma trava conserva o valor-base do item; seus totais continuam refletindo os atributos. Um ataque individual travado conserva sua coluna mesmo se os demais ataques do grupo mudarem. Cada geração parte da original, sem multiplicar a variante anterior.

Valores inválidos vindos da fonte aparecem para revisão. Por exemplo, uma EF máxima negativa precisa ser corrigida na prévia antes de criar a cópia; o gerador não corrige o compêndio automaticamente.

## Criar sua criatura

### Regras do Livro de Criaturas 3.02

A quarta aba passa a usar o capítulo 5, páginas impressas 23–27, do **Tagmar — Livro de Criaturas 3.02**. Disponível a partir da versão **0.3.0**; não altera a terceira aba de variações nem criaturas já criadas.

- **Construção — Livro 3.02**, visível no topo da quarta aba: peso, altura, combatividade, organização, natureza corpórea/incorpórea, construída ou não, faixa de dano natural, Moral e Velocidade Base (VB) opcional, informada diretamente como na ficha. Campos de medidas vazios usam sugestões por porte, conferíveis na prévia.
- **EF:** `piso(2 × √peso) + Físico`; construída usa `2,5` no lugar de `2`. Valores de recurso abaixo de zero são limitados a zero para permitir a ficha; confira exceções e trave o valor manual.
- **EH:** bases 0/5/7/10/13 para não combativa/baixa/média/alta/extrema. Organização naturalmente solitária soma 7 à base. Soma Físico (corpórea) ou Aura (incorpórea) e multiplica pelo estágio. Não combativa sempre tem zero. O perfil sugerido pelo grupo é editável. Indivíduos excepcionais de raças civilizadas/selvagens podem usar a profissão correspondente: ajuste e trave a EH.
- **Ataques naturais:** colunas publicadas para Mordida, Garras, Patadas, Coice, Chifres, Punhos, Bicada, Cauda e Hálito Encantado; proficiência não excede o estágio. Bônus de Agilidade, ou Aura para o hálito. Dano natural escolhido dentro da faixa de peso (2–9500 kg), em múltiplos de quatro, somando Força pelo cálculo nativo. Hálitos e ataques especiais sem tabela conservam os dados do componente. Extensão extraoficial automática acima de 9500 kg até 47500 kg, conforme descrito ao final.
- **Armas proporcionais à altura:** +4/+8/+12/+16 no dano-base a 100%, nas faixas de altura publicadas entre 2,51 e 6,50 m, para criaturas que usam ferramentas; os percentuais são recalculados. Acima disso, extensão extraoficial automática até 32,50 m, conforme descrito ao final.
- **Proteções:** ABS original preservada. Bônus natural de defesa inicial limitado a 0…3, somado à Agilidade pela ficha. Esta seção do livro não fornece fórmula para ABS. Confira combinações de proteções e exceções.
- **RM/RF:** estágio + Aura/Físico. **Moral:** estágio, opções 50%/150% e 200% para mágicas, ou ausência de Moral. **VB:** valor informado diretamente em metros por rodada de 15 segundos; vazio usa a sugestão pelo perfil. Ausência de Moral não adiciona imunidade automática.
- **Interface:** construção pelo livro sempre aberta; opções anteriores em **Perfil e sugestões**, recolhidas por padrão. As duas colunas preservam a rolagem ao editar campos ou trocar opções; cada aba conserva sua própria posição durante a sessão da janela.
- **Dons naturais:** Karma zero por padrão, frequência diária escolhida pelo mestre e registrada na biografia. Não automatiza contagem nem consumo de usos. Magia aprendida mantém Karma sugerido e ajustável. Níveis e regras específicas exigem conferência do texto.
- Atributos editados atualizam EF/EH e resistências livres. Valores manuais travados prevalecem. As escolhas automáticas de perfil, peso, atributos e repertório são sugestões, não números oficiais nem garantia de equilíbrio.

Fonte: Livro 3.02 fornecido pelo usuário. A [página da wiki](https://tagmar.com.br/wiki/Default.aspx?PageName=Regras%20para%20Cria%C3%A7%C3%B5es%20de%20Criaturas) consultada usa outra orientação de EH, por profissão; a prévia segue expressamente a edição 3.02. Conteúdo do Projeto Tagmar sob CC BY-NC-SA 3.0 Brasil, com os créditos de licenciamento abaixo.

O gerador agora separa **Criaturas — Variação de nível** (adaptação de uma ficha existente) de **Criar sua criatura** (quarta aba, construção do zero). Disponível na versão **0.2.0**.

1. Informe nome, estágio entre 0 e 50, porte e **grupo**. Os 19 nomes de grupos seguem [Criaturas Online do Tagmar](https://tagmar.com.br/Criaturas.aspx): animais, animais gigantes e sombrios; criaturas artificiais, de Dartel, divinas, infernais, místicas e vegetais; dragões e dragões imperiais; elementais, hidras, licantropos, monstros, mortos-vivos e raças civilizadas, gigantes e selvagens.
2. Escolha **inteligência**, **capacidade mágica**, **forma do corpo**, **afinidade** e perfil. Cada campo pode seguir a sugestão do grupo ou uma escolha sua. Irracional sugere INT −7; magia sugere Aura. Dons naturais e magia aprendida são diferenciados na seção de origem das magias. Uma fera irracional também pode ser mágica. Os perfis favorecem equilíbrio, força/resistência ou agilidade/percepção. Não copia um ator do compêndio, nem exige raça ou profissão.
3. Edite os valores e feche os cadeados desejados. Há travas individuais, de atributos, de recursos/movimento e dos blocos de componentes. **Sugerir novamente** preserva essas escolhas. Desligue **Variar os valores sugeridos** para ter sugestões determinísticas; ligada, há variação nos atributos, nas sugestões de dano e nos componentes sorteados. EF e EH continuam seguindo as fórmulas do livro.
4. Antes ou depois de gerar, abra **Armas e ataques naturais**, **Armaduras e proteções naturais**, **Habilidades**, **Técnicas de combate**, **Magias e poderes** e **Pertences e afins**. Procure e adicione componentes exatos do catálogo do sistema ativo. Em cada bloco, escolha **Escolher e completar aleatoriamente**, **Somente minhas escolhas** ou **Não incluir**. No primeiro modo, a quantidade é o total desejado: suas escolhas são mantidas e o restante é sorteado. Se suas escolhas excederem a quantidade, todas são mantidas. Sem opções compatíveis suficientes, o gerador usa as disponíveis e não inventa itens. **Não incluir** esvazia os outros blocos mesmo com travas. Habilidades mantém a lista completa: **Sem níveis treinados** zera os níveis, sem apagar as linhas. Uma trava de bloco mantém a lista atual; uma escolha manual sem trava mantém o item, mas permite recalcular seus valores sugeridos.
5. Em **Imagem e descrição**, pode informar um caminho de imagem disponível no Foundry e escrever aparência, comportamento ou história. O token recebe a mesma imagem. Altura e peso são sugestões pelo porte ou medidas preenchidas em Construção — Livro 3.02. O tamanho do token pode ser revisado na ficha criada.
6. Selecione uma pasta e use **Criar criatura no mundo**. É criado um novo PNJ com itens próprios, sem alterar as fontes. O botão é substituído por **Abrir criatura criada**, evitando uma segunda criação acidental da mesma prévia.

### Limites das sugestões do zero

A criação do zero usa as fórmulas do Livro de Criaturas 3.02 descritas acima, enquanto a escolha automática de atributos, perfil e repertório permanece uma sugestão de construção. Não gasta pontos de personagem nem garante dificuldade de encontro. Ataques, defesa, habilidades, magias e técnicas usam os totais nativos da ficha PNJ.

Peso define EF e a faixa de dano natural. ABS é preservada das proteções; não é multiplicada por porte ou estágio. Armas de criaturas que usam ferramentas podem receber o aumento proporcional à altura previsto no livro. Estágio, combatividade e organização definem EH; o perfil orienta sugestões de atributos e movimento. Modificar o dano-base a 100% redimensiona os outros percentuais. ABS e defesa vêm das proteções escolhidas. Magias naturais mantêm os níveis do material de apoio; magias comuns de criaturas recebem no máximo o estágio ou 20, e técnicas de bônus de FA no máximo 10, antes de ajustes manuais.

### Coerência dos sorteios

Grupo, anatomia, inteligência e afinidade orientam **heurísticas extraoficiais**, não proibições das regras. O grupo apenas fornece valores iniciais: não concede imunidades, genealogia, poderes especiais ou comportamentos de todas as criaturas daquele grupo. As escolhas manuais podem abrir exceções; confira sua adequação antes de criar.

- Feras usam sugestões de ataques naturais e habilidades de percepção/sobrevivência. Uma criatura alada, serpentiforme, aquática, vegetal, amorfa ou artrópode recebe um conjunto diferente de sugestões.
- Armas, armaduras comuns e pertences só entram no sorteio automático de criaturas inteligentes bípedes com mãos; mínimos de Força/Físico dos equipamentos são conferidos. Você pode adicionar equipamentos manualmente a qualquer perfil.
- Técnicas são sugeridas pelo corpo e pelos equipamentos. Técnicas com pré-requisito declarado ficam para escolha manual; o gerador não interpreta todas as condições do texto.
- Magias só são completadas automaticamente em perfis com capacidade mágica e seguem a afinidade. Não sorteia pacotes descritivos de poderes de uma criatura específica como se fossem poderes genéricos. Esses itens continuam disponíveis para escolha manual.
- O catálogo inclui o material **Criando Criaturas** e itens comuns do próprio sistema ativo. As escolhas são cópias e não modificam o compêndio. Sugerir novamente refaz apenas o que está livre; criar no mundo continua sendo uma confirmação separada.

As quatro abas mantêm prévias separadas. Criar ou adaptar criaturas não modifica os personagens que estiver montando nas outras abas. O Oficial usa seu próprio catálogo e suas imagens, sem incorporar arte do XXX.

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
2. Selecione raça, profissão e estágio entre **1 e 50**. A opção **Aleatória** sorteia apenas combinações de raça/profissão permitidas. Opções incompatíveis ficam desativadas nas listas; escolhas explícitas ou travadas inválidas geram aviso, sem substituir a ficha anterior.
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

Testes do núcleo com cópias dos compêndios instalados nos dois sistemas: profissões e raças, estágios 1/10/20/35/50, pontos, EH, filtragem de escolas, travas, IDs novos e recursos de PNJ. Teste de interface isolado com CSS nativo do Foundry: seleção, cadeados, edição, criação simulada de Personagem/PNJ e acesso exclusivo ao mestre. Prévia validada em uso pelo usuário antes da publicação.

## Licença e créditos

Código deste módulo: GPL-3.0-or-later. Usa as funções da implementação de fichas de **Marcos Walker e Vinicius Fernandez**, carregadas do sistema instalado. Conteúdo Tagmar consultado nos compêndios: **Projeto Tagmar**, CC BY-NC-SA 3.0 Brasil, com atribuição, uso não comercial e compartilhamento pela mesma licença. A adaptação consiste na interface de geração e na distribuição sugerida das escolhas.

[Projeto Tagmar](https://www.tagmar.com.br/) · [Licenciamento do Tagmar](https://tagmar.com.br/Licenciamento.aspx) · [Licença CC BY-NC-SA 3.0 BR](https://creativecommons.org/licenses/by-nc-sa/3.0/br/)

O módulo não inclui o Foundry Virtual Tabletop nem afirma endosso de seus desenvolvedores ou do Projeto Tagmar.

## Habilidades completas e progressão até estágio 50

Na aba **Criar sua criatura**, Habilidades usa seis grupos como na ficha: Profissional, Manobra, Conhecimento, Subterfúgio, Influência e Geral. Todas as habilidades do catálogo do sistema ativo são incluídas na criatura, mesmo no nível zero. Quantidade controla somente quais recebem treinamento; **Sem níveis treinados** mantém todas no zero. Edite o nível na linha; o total é calculado pelo sistema. O botão de retorno zera o nível, sem apagar a habilidade. Cadeados preservam escolhas ao gerar novamente. Restrições de uso sem nível continuam nos dados do item.

Ataques naturais usam **CD**, e os grupos utilizados recebem o estágio da criatura. Isso aumenta a coluna de ataque uma única vez, sem somar estágio novamente ao dano. Dano natural usa peso e Força; armas ampliadas usam altura. Edições individuais de proficiência continuam disponíveis como exceções travadas.

A extensão automática solicitada vai até **47500 kg** e **32,50 m**, cinco vezes os máximos publicados. As faixas originais permanecem intactas. Acima de 9500 kg, a extensão extraoficial repete faixas de 3000 kg: teto do dano +4 por faixa, piso +4 a cada duas faixas; mantém múltiplos de quatro. Acima de 6,50 m, armas proporcionais continuam em +4 por faixa de um metro. Essa continuidade é uma estimativa do gerador, não uma fórmula oficial do livro. Fora da extensão, preserve/edite o componente manualmente. Hálitos e ataques especiais sem correspondência mantêm os próprios dados.

**Personagens e PNJs** aceitam estágios de 1 a 50: pontos de aquisição, grupos de armas, XP, resistências e 49 ganhos de EH no estágio 50 seguem os cálculos do sistema instalado. Habilidades e magias acompanham o estágio; técnicas com mecânica de bônus de FA continuam limitadas ao nível 10. Estágio alto não concede poderes divinos automaticamente.

### Defesa do oponente na ficha gerada

As prévias novas inicializam **Def. Oponente** em Leve (L). O schema nativo deixava esse campo vazio, embora a lista mostrasse L; ataques em grupos como CD ficavam na coluna zero até escolher outra categoria. A normalização preserva M/P e os ajustes/valores de defesa já definidos. Para uma criatura criada antes da correção, escolha M e depois L na ficha para gravar a categoria; não é necessário recriar a criatura.

### Busca e escolha na mesma caixa

Nos blocos de Personagens, PNJs e Criar sua criatura, clicar no campo de busca ou começar a digitar abre uma lista filtrada no próprio campo. Escolha pelo mouse ou pelas setas e Enter; Escape recolhe. A lista tem rolagem e abre acima quando falta espaço embaixo. Após escolher, use Adicionar. Nomes são mostrados como texto; o vínculo usa o ID real do compêndio. A busca de criatura-base na terceira aba já mantém esse mesmo comportamento.

### Habilidades agrupadas nas quatro abas

Personagens e PNJs mostram todas as habilidades nos seis grupos da ficha, inclusive as sem nível, mantendo compra por pontos, travas e habilidade nata. Criar sua criatura usa os mesmos grupos. Em Variação de nível, a disposição é igual, mas a comparação Original/Variante conserva somente as habilidades da criatura-base.

Na criação de criaturas, armas, proteções, técnicas, magias e pertences usam linhas compactas: nome, total, campos editáveis e ações lado a lado, com quebra apenas se a janela não comportar o conteúdo. Habilidades mantêm as tabelas agrupadas das quatro abas.

As buscas de componentes mostram uma opção por nome e tipo de item, ocultando as cópias por profissão/lista. O filtro de profissão e especialização continua sendo aplicado antes dessa consolidação. Os compêndios e seus custos não são alterados. Uma magia/técnica já adicionada também oculta suas cópias na lista de adicionar; a dica informa quando há várias origens.
