Hooks.on("renderActorSheet", function (sheet, html, character) {
    html = $(html);
    const actor = sheet.actor ?? character.document;
    if (actor?.type !== "Personagem") return;
    for (let ht of html.find(".movePertence")) {
        if ($(ht).attr('title') === "Mover para Transporte") {
            $('<a style="margin-left:5px;" class="tradePertence" title="Mandar para amigo" data-actor-id="'+ actor.id +'" data-item-id="'+ ht.dataset.itemId +'"><i class="fas fa-handshake"></i></a>').insertAfter(ht);
        }
    }
    html.find(".tradePertence").click(mandaPertence.bind(this));
});

Hooks.on("ready", function () {
    if (game.system.id === "tagmar_rpg" || game.system.id === "tagmar") {
        game.socket.on('module.tagmartrade', tradeData => {
            if (tradeData.type == "trade") recebeSocket(tradeData);
        });
    } else {
        return ui.notifications.error("O módulo Tagmar Transações, só funciona com o sistema Tagmar.");
    }
});

async function recebeSocket(tradeData) {
    if (game.user.character === null) return;
    const targetActor = game.actors.get(tradeData.targetActor);
    if (game.user.character !== targetActor) return;
    const actor = game.actors.get(tradeData.currentActor);
    if (!actor || !tradeData.itemc) return;
    const itemquevai = foundry.utils.deepClone(tradeData.itemc);
    itemquevai.system.quant = tradeData.quant;
    await targetActor.createEmbeddedDocuments("Item", [itemquevai]);
    const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({
            actor: game.user.character
        })
    };
    chatData.content = "<p class='mediaeval'><img src='"+ actor.img +"' style='float: left; margin-left: auto; margin-right: auto; width: 40%;border: 0px;' /><img src='systems/"+ game.system.id +"/assets/TAGMAR FOUNDRY.png' style='float: left;margin-top:25px; margin-left: auto; margin-right: auto; width: 20%;border: 0px;'/><img src='"+ targetActor.img +"' style='float: left; width: 40%; margin-left: auto; margin-right: auto;border: 0px;' /></p><p class='rola_desc' style='display: block;margin-left:auto;margin-right:auto;margin-top:60%;'>"+ "<b>" + actor.name + "</b> acaba de presentear <b>"+ targetActor.name +"</b> com <b>"+ String(tradeData.quant) +"</b> <b>"+ itemquevai.name +"</b>." +"</p>";
    await ChatMessage.create(chatData);
    ui.notifications.info("Você acaba de receber " + tradeData.quant + " " + itemquevai.name + " de " + actor.name);
}

function mandaPertence(event) {
    const currentActor = event.currentTarget.dataset.actorId;
    const itemId = event.currentTarget.dataset.itemId;
    const actor = game.actors.get(currentActor);
    const item = actor?.items.get(itemId);
    if (!actor || !item) {
        return ui.notifications.warn("Não foi possível localizar o pertence selecionado. Reabra a ficha e tente novamente.");
    }
    const itemData = item.toObject();
    const users = game.users.filter(user => user.active && user.character && user !== game.user && !user.isGM);
    if (!users.length) return ui.notifications.warn("É necessário ter outro jogador conectado e com personagem atribuído.");
    let dialog = new Dialog({
        title: "Enviar item para jogador",
        content: "<div><label style='margin-right:10px;' class='mediaeval'>Quantidade:</label><input class='quant' type='number' id='quantPert' style='width:40px;'/><label style='margin-right:10px;margin-left:10px;' class='mediaeval'>Jogador:</label><select id='userSelectx' class='users_names'></select></div>",
        buttons: {
            sim : {
                icon: '<i class="fas fa-check"></i>',
                label: "Enviar",
                callback: async html => {
                    html = $(html);
                    const quant = Number.parseInt(html.find('.quant').val(), 10);
                    const user = game.users.get(html.find('.users_names').val());
                    if (quant > 0 && user?.character) {
                        if (quant > item.system.quant){
                            ui.notifications.warn("Você não pode enviar mais itens que você tem!");
                        } else if (quant === item.system.quant) {
                            const tradeData = {
                                itemc: itemData,
                                currentActor: currentActor,
                                targetActor: user.character.id,
                                quant: quant,
                                type: "trade"
                            };
                            game.socket.emit('module.tagmartrade', tradeData);
                            await actor.deleteEmbeddedDocuments("Item", [itemId]);
                        } else {
                            const tradeData = {
                                itemc: itemData,
                                currentActor: currentActor,
                                targetActor: user.character.id,
                                quant: quant,
                                type: "trade"
                            };
                            game.socket.emit('module.tagmartrade', tradeData);
                            await actor.updateEmbeddedDocuments("Item", [{'_id': item.id, 'system.quant': item.system.quant - quant}]);
                        }
                    } else if (!user?.character) {
                        ui.notifications.warn("Tem que ter outro jogador online!");
                    } else ui.notifications.warn("Escolha um valor maior que zero!");
                }
            },
            nao : {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancelar",
                callback: () => {}
            }
        },
        default: "nao",
        render: html => {
            html = $(html);
            for (let user of users) {
                html.find('.users_names').append("<option value='"+user.id+"'>"+user.name+"</option>");
            }
        },
    });
    dialog.render(true);
}
