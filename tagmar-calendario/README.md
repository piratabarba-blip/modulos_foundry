# Tagmar — Grande Calendário

Módulo para Foundry VTT 14, compatível com `tagmar_rpg` e `tagmar3er_oficial`.

Versão atual: **0.7.2**.

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
