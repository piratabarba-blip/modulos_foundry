# Token Action HUD Tagmar

Versão **0.1.0** para Foundry VTT 14, Tagmar XXX (`tagmar_rpg`) e Tagmar 3ER Oficial (`tagmar3er-oficial`).

Barra de ações em português para o token selecionado, usando as mesmas funções das fichas. Integração independente com Token Action HUD Core; não é uma cópia do núcleo.

## Instalação e ativação

1. Instale **Token Action HUD Core 2.1.2** (série 2.1) e sua dependência **socketlib**.
2. Em **Módulos Complementares → Instalar Módulo → URL do Manifesto**, cole: https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/token-action-hud-tagmar/module.json
3. No gerenciamento de módulos do mundo, habilite Core, socketlib e Token Action HUD Tagmar.
4. Desative o **Token Action HUD Classic** antigo (`token-action-hud`), se ainda estiver ativo.
5. Selecione **um token que você controla**. As categorias aparecem na barra móvel do Core.

Manifesto do Core: <https://github.com/Larkinabout/fvtt-token-action-hud-core/releases/latest/download/module.json>

O HUD é opcional para os sistemas Tagmar. Ao instalá-lo, aceite a instalação do Core exigido; o Core depende de socketlib. Ative os três no mundo em que desejar usar. Quem testou a prévia local pode instalar pelo manifesto acima para passar a receber atualizações.

## Uso

- **Combate:** ataques e técnicas; armas de guerra usam a configuração de operadores do veículo. Coluna, defesa e bônus continuam sendo os da ficha e dos alvos, como no uso normal.
- **Habilidades:** os seis grupos da ficha, mostrando total e nível. Existe uma configuração para ocultar as habilidades/técnicas sem nível.
- **Magias:** usa o item como na ficha. Uma magia sem automação envia sua descrição; ataques mágicos cadastrados como Combate aparecem em Ataques.
- **Testes:** atributos, RM e RF; as resistências pedem a Força de Ataque. PNJs também têm Moral.
- **Veículos:** Manobrar usa o condutor e ajustes já escolhidos na ficha.
- **Tropas:** mestre pode usar ataque, aparatos e moral, preservando os alvos e a resolução do sistema. Preparativos e batalha guiada continuam na ficha.
- **Ficha:** EF, EH, Karma e ABS para consulta, além dos pertences e equipamentos. Clique nesses recursos para abrir a ficha; não altera valores diretamente.
- Clique esquerdo usa o item; **botão direito abre a ficha do item**.

Sem um token único, as ações específicas não são mostradas para evitar usar a ficha ou o evocador errado. A opção do Core de mostrar o personagem atribuído sem token também permite consultar sua ficha, mas efeitos visuais que exigem token continuam dependendo de um token na cena.

## Integração e manutenção

`rollTagmarItem()` é o ponto de entrada de itens, preservando rolagens, munição, cartões e a integração FX já disponível no sistema. O HUD não calcula dano nem cria um segundo efeito. Os documentos sintéticos dos tokens são respeitados; não se busca um personagem pelo nome.

Não inclui imagens de criaturas, livros, compêndios ou material do XXX. No Oficial, funciona com os itens e recursos presentes nesse sistema. Não adiciona dependência de FX, JB2A ou Token Magic.

O Core continua atualizado por seu próprio projeto. Atualizações da API exigem validação desta integração; a compatibilidade inicial é limitada à série 2.1. As regras e os dados são mantidos pelo sistema Tagmar.

## Validação

Os testes automatizados verificam grupos, identificação por ID, permissões, tokens não vinculados, chamadas nativas, cancelamento de RM/RF e integração com as classes e os templates do Core instalado. A prévia foi testada e aprovada pelo mantenedor no XXX. A compatibilidade com o Oficial foi verificada pelos testes de integração; ainda não houve uma sessão completa de jogadores para validar todas as combinações de módulos.

## Créditos

Integração Tagmar: Vinicius Fernandez (PIRATA). Sistemas Tagmar: Marcos Walker e Vinicius Fernandez. [Projeto Tagmar](https://www.tagmar.com.br/).

[Token Action HUD Core](https://github.com/Larkinabout/fvtt-token-action-hud-core): projeto independente, mantido por seus autores. [Documentação da API](https://github.com/Larkinabout/fvtt-token-action-hud-core/wiki/Developing-a-System-Module).

Código original deste módulo sob licença MIT. Dependências e conteúdo dos sistemas conservam suas próprias licenças.
