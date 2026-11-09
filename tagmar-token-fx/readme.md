## Bônus temporários nas magias

- Em FX → Resolução e dano, escolha Dano ou Bônus temporários. As alternativas são exclusivas.
- Adicionar bônus permite várias linhas de atributos, recursos, defesa, resistências, velocidade e ajustes de combate/habilidades.
- EH e EF temporárias somam ao valor atual, preservando o máximo normal. O dano consome a reserva primeiro; cura não reabastece a reserva gasta.
- Ao expirar, resistir ou remover o efeito, somente o excesso acima do máximo normal é retirado. Exemplo: máximo 20, atual 26 → 20; atual 16 → 16. Reservas independentes ainda ativas conservam seu prazo.
- A mesma magia não acumula bônus a cada turno. Renovar substitui a reserva restante da mesma fonte.
- Nome, duração restante e saldos ficam na aba Efeitos. Testar continua mostrando somente o visual.
- Correção do recálculo de bônus em atores do Foundry V14, incluindo personagens por pontos, por sorteio e PNJs.

Atualize primeiro o sistema Tagmar XXX e depois o módulo Tagmar Efeitos Mágicos. Compatibilidade verificada: Foundry VTT 14.370. As configurações continuam sendo escolhidas pela mesa; nenhum compêndio é reconfigurado automaticamente. O módulo permanece exclusivo do XXX.

## Invisibilidade com duração

Em **FX → Resistência e resultado**, marque **Tornar o destinatário invisível** e informe a duração. Salve e use a magia. O Foundry aplica sua condição nativa de invisibilidade ao destinatário, conforme a resolução configurada; a aba **Efeitos** mostra a duração restante.

Expirar, desativar ou remover o efeito retira essa fonte da condição. Fontes independentes são preservadas. Compatível com a RM inicial/por turno e a permanência configurada em área.

A cena precisa de **Visão dos tokens**. Mestre, controle do próprio token e sentidos especiais seguem a visibilidade nativa. Não altera ocultação manual, permissões ou luz própria. Atacar não encerra a condição automaticamente. JB2A é opcional e **Testar** continua mostrando apenas visuais.

Exclusivo do Tagmar XXX. Nenhuma alteração de compêndios ou configuração automática de magias. Compatibilidade verificada com Foundry VTT **14.370**.

> Versão atual XXX/V14: **1.5.0**. Consulte [GUIA-XXX.md](GUIA-XXX.md) para instalar, configurar e usar. As instruções abaixo são as originais do módulo legado.

# Token Magic FX -> Efeitos Mágicos Tagmar

### Foundry VTT 14.370 — 05/11/2026

Compatibilidade verificada com Foundry VTT 14.370. O fim de uma transformação ou invocação fecha fichas temporárias e remove referências aos efeitos antigos antes que o Foundry tente gravá-los.

![](page/token-magic.gif)
## Módulo para sistema Tagmar RPG no Foundry Vtt
### Esse módulo depende do [Token Magic FX](https://foundryvtt.com/packages/tokenmagic) e do sistema [Tagmar RPG](https://foundryvtt.com/packages/tagmar) para funcionar.
Adiciona nos itens de Tecnicas de Combate e Magia, a possíbilidade de adicionar filtros FX que serão executados no token sempre que os mesmos são rolados. Para remover os filtros de efeitos basta usar a macro "00 - A - Delete filters on Selected" que vem no compêndio do módulo **Token Magic FX**, ou na ficha de Personagem foi adicionado um ícone ao lado das caixas de busca, nas abas de Combate e Magia.

#### Instalação:
Copiar o link (https://raw.githubusercontent.com/marcoswalker/tagmar-token-fx/master/module.json) e colar na caixa manifest ao instalar módulo no Foundry Vtt. Lembrando que as dependências devem ser instaladas. Depois é só ativar os dois módulos dentro do mundo.

#### Agradecimento (Thanks)
Muito obrigado ao **SecretFire** por desenvolver o **Token Magic FX**.
Many thanks to **SecretFire** for developing the **Token Magic FX**.

#### Criar novos Pressets
Para criar novos pressets bastar preencher a variável "params" e trocar o nome do presset dentro da variável "presetDef" em "name". Depois basta executar apenas uma vez como um macro.
~~~javascript
let params = [];
 
 
let presetDef =
{
    name: "Nome do Presset",
    library: "tmfx-template"
};
TokenMagic.addPreset(presetDef, params);
~~~


#### Deletar Pressets existentes
Para deletar um presset basta mudar o "Nome do Presset" e executar apenas uma vez como uma macro.
~~~javascript
TokenMagic.deletePreset({name:"Nome do Presset",library:"tmfx-template"});
~~~

#### Presset para Metamorphose
Escolha entre os nove tipos e preencha o número referente em "transitionType", mude o endereço da imagem em "targetImagePath", escolha um ID (nome único, sem acento, sem espaço) em "polymorphFilterId" e mude "name" dentro de "presetDef". Basta executar apenas uma vez a macro que fica cadastrado nos Pressets.
~~~javascript
// There is 9 types of metamorphose
// 1 - Simple transition
// 2 - Dreamy
// 3 - Twist
// 4 - Water drop
// 5 - TV Noise
// 6 - Morphing
// 7 - Take off/Put on you disguise!
// 8 - Wind
// 9 - Hologram
 
let transitionType = 6; // Escolhe o tipo de transição aqui, referente aos números de cima
 
let targetImagePath = "icons/svg/mystery-man.svg"; // Troca o endereço da imagem aqui.
 
let polymorphFilterId = "transformaMystery"; // Escolhe um nome ID( único, sem espaços, sem acentos )
 
let params =
[{
    filterType: "polymorph",
    filterId: polymorphFilterId,
    type: transitionType,
    padding: 70,
    magnify: 1,
    imagePath: targetImagePath,
    animated:
    {
        progress:
        {
            active: true,
            animType: "halfCosOscillation",
            val1: 0,
            val2: 100,
            loops: 1,
            loopDuration: 1000
        }
    }
}];
 
let presetDef =
{
    name: "Transforma Mystery Man", // Troca o nome aqui ( nome apresentável )
    library: "tmfx-template"
};
TokenMagic.addPreset(presetDef, params);
~~~


## Bônus temporários por magia

Em **Resolução e dano → Resultado**, escolha **Dano** ou **Bônus temporários**. As alternativas são exclusivas. No modo Bônus, clique em **Adicionar bônus**, escolha o atributo/recurso e informe o valor. É possível adicionar, editar e remover várias linhas na mesma magia.

- **EH e EF temporárias:** somam à quantidade atual sem elevar o máximo normal. Dano que atinge esse recurso consome primeiro a reserva. Cura não reabastece a reserva consumida. Expirar, resistir ou remover o efeito retira somente o excesso acima do máximo normal. Pontos que cabem nesse máximo permanecem. Outras reservas ainda ativas conservam seu próprio prazo.
- **INT, AUR, CAR, FOR, FIS, AGI e PER:** usam os efeitos nativos da ficha. Os valores seguem a mesma interpretação dos itens Efeito, não representam novos pontos comprados.
- **Absorção máxima, defesa, Karma máximo, VB, RF e RM:** ajustes durante o prazo da magia; aumentar um máximo não preenche o recurso atual.
- **Combate e habilidades:** ajustes em colunas, com valores positivos ou negativos.

Defina o prazo em **Duração / aviso na ficha**, salve e use o item. O botão **Testar** continua sendo apenas uma prévia visual. A aba **Efeitos** mostra o nome, o tempo restante e os saldos de EH/EF. Ao encerrar, com máximo 20 e atual 26, fica 20; com atual 16, continua 16. Remover o aviso encerra os bônus ligados àquela magia, preservando efeitos independentes.

Repetir a RM não acumula ajustes nem reabastece EH/EF. Um novo uso da mesma magia renova o prazo e substitui a reserva restante; outras magias permanecem independentes. Esta prévia inclui pequenos ajustes no sistema XXX para preservar as reservas ao recalcular a ficha. Não altera o sistema Oficial nem os compêndios.
