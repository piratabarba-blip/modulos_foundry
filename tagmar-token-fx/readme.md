> Versão XXX/V14: veja [GUIA-XXX.md](GUIA-XXX.md). As instruções abaixo são as originais do módulo legado.

# Token Magic FX -> Efeitos Mágicos Tagmar
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
