# Tagmar Efeitos Mágicos 1.1.0 — XXX / Foundry 14

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

## Limites deliberados

- Apenas visuais: nada de dano, bônus, duração, cargas, condições ou sucesso automático. O gatilho `tagmar_itemRoll` acontece no início do uso do item, antes de confirmar resultados; cancelar uma rolagem posterior não remove o visual.
- A aplicação automática vem desligada, inclusive em itens com configuração antiga. Presets legados são lidos sem sobrescrever `magicFx`; presets ausentes exigem escolha manual, sem substituição silenciosa.
- Não é um lançador de projéteis entre tokens. Armas usam filtros visuais nos tokens, como magias e técnicas.
- Não usa seleção de tokens de outros atores como destino implícito. Se houver vários tokens vinculados ao mesmo ator, selecione exatamente um deles. Tokens não vinculados são tratados pela ficha de seu próprio ator sintético.
- Jogadores só podem alterar tokens que possuem. Para alvos de terceiros, o mestre aplica o efeito. Não há socket que contorne permissões.
- Remoção atua somente na cena aberta e nos efeitos criados por esta versão. Efeitos antigos sem identificação e efeitos de itens apagados não são removidos pelo botão da ficha. Não apague o item antes de limpar seus efeitos.
- Efeitos são persistentes até a remoção manual. Desativar a aplicação automática ou o módulo não apaga filtros já aplicados: limpe-os antes.
- O ID do módulo foi preservado para ler configurações legadas. Não ative outra cópia da integração antiga junto.
- A instalação não ativa módulos nem modifica configurações, atores ou tokens de nenhum mundo.

## Validação

`node tools/test-token-fx.cjs` na raiz do repositório de módulos.

Validação: 17 verificações de lógica; fluxo da interface em navegador isolado; aplicação/remoção de 52 presets com as funções originais do Token Magic 0.8.4. O usuário também confirmou funcionamento em seu Foundry 14.368 antes de autorizar a publicação.
