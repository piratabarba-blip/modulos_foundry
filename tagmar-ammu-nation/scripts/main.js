Hooks.on("renderActorSheet", function (sheet, html, character) {
    html = $(html);
    if (sheet.actor.type !== "Personagem") return;
    let teste = html.find('.combate table').first();
    $('<a class="botaoMunicao"><i class="fab fa-pied-piper-hat"></i><span class="mediaeval">Gestão de munições</span></a>').insertBefore($(teste));
    const actor = sheet.actor;
    html.find(".botaoMunicao").click(function () {
        $.get("/modules/tagmar-ammu-nation/templates/dialogAmmo.hbs", function (data) {
            let dialog = new Dialog({
                title: "Gestão de munições",
                content: data,
                buttons: {},
                render: html => {
                    html = $(html);
                    let flag_municoes = actor.getFlag('tagmar-ammu-nation', 'municoes');
                    if (!flag_municoes) flag_municoes = [];
                    atualizaTable();
                    html.find(".add_municao").click(async function () {
                        let name = html.find('.nome_municao').val();
                        let quant = html.find('.quant_municao').val();
                        if (name && quant) {
                            let find_name = flag_municoes.filter(f => f.nome === name);
                            if (find_name.length > 0) {
                                for (let flag of flag_municoes) {
                                    if (flag.nome === name) {
                                        flag.quant = quant;
                                    }
                                }
                            } else flag_municoes.push({nome: name, quant: quant});
                            await actor.setFlag('tagmar-ammu-nation', 'municoes', flag_municoes);
                            for (let item of actor.items) {
                                let itemFlag = await actor.getFlag('tagmar-ammu-nation', item.name);
                                if (item.type === "Combate" && itemFlag === name) {
                                    await item.update({'system.municao': quant});
                                }
                            }
                            atualizaTable();
                        }
                    });
                    async function atualizaTable (){
                        flag_municoes = await actor.getFlag('tagmar-ammu-nation', 'municoes');
                        if (!flag_municoes) flag_municoes = [];
                        html.find('.nome_municao').val("");
                        html.find('.quant_municao').val("");
                        html.find('.table_municao').html('<tr style="text-align:left;"><th class="mediaeval">Munição</th><th class="mediaeval">Quant</th><th class="mediaeval">Deletar</th></tr>');
                        for (let municao of flag_municoes) {
                            html.find('.table_municao').append("<tr><td class='mediaeval'>"+ municao.nome + "</td><td class='mediaeval'>" + municao.quant + "</td><td><a class='deleteMunicao' data-item-id='"+ municao.nome +"'><i class='fas fa-trash-alt'></i></a></td></tr>");
                        }
                        html.find('.deleteMunicao').click(async function (event) {
                            let new_flag = [];
                            let nome_municao = $(event.currentTarget).data("itemId");
                            for (let mun of flag_municoes) {
                                if (mun.nome != nome_municao) {
                                    new_flag.push(mun);
                                }
                            }
                            if (new_flag.length > 0) await actor.setFlag('tagmar-ammu-nation', 'municoes', new_flag);
                            else await actor.unsetFlag('tagmar-ammu-nation', 'municoes');
                            atualizaTable();
                        });
                    }
                }
            });
            dialog.render(true);
        });
    });
});

Hooks.on("renderItemSheet", async function (sheet, html, item) {
    html = $(html);
    const item_sheet = sheet.item;
    if (item_sheet.type === "Combate" && sheet.actor !== null) {
        let bonus_dano = html.find('.d_dano').first();
        $('<div class="col-md-1"><label><h4 class="mediaeval"><i class="fab fa-pied-piper-hat"></i></h4></label></div><div class="col-md-3"><select name="municoes_mod" class="municoes_mod"><option value=""></option></select></div>').insertAfter($(bonus_dano));
        let municoes_tag = sheet.actor.getFlag('tagmar-ammu-nation', 'municoes');
        if (typeof municoes_tag === 'undefined') return;
        html.find('[name="system.municao"]').prop("readonly", true);
        for (let mun of municoes_tag) {
            html.find('.municoes_mod').append("<option class='mediaeval' value='"+mun.nome+"'>"+mun.nome+"</option>");
        }
        let ammu_item = await sheet.actor.getFlag('tagmar-ammu-nation', item_sheet.name);
        if (ammu_item) html.find('.municoes_mod').val(ammu_item).change();
        else html.find('.municoes_mod').val("").change();
        html.find(".municoes_mod").change(async function () {
            let municao = html.find(".municoes_mod").val();
            if (municao !== "") {
                await sheet.actor.setFlag('tagmar-ammu-nation', item_sheet.name, municao);
                let ammu = {};
                for (let mun of municoes_tag) {
                    if (mun.nome === municao) ammu = mun;
                }
                item_sheet.update({
                    'system.municao': ammu.quant
                });
            } else {
                await sheet.actor.unsetFlag('tagmar-ammu-nation', item_sheet.name);
                item_sheet.update({
                    'system.municao': 0
                });
            }
        });
    }
});

Hooks.on('tagmar_itemRoll', async function (roolItem, user) {
    if (user !== game.user) return;
    if (roolItem.type !== "Combate") return;
    const actor = roolItem.actor;
    let municao_flags = await actor.getFlag('tagmar-ammu-nation', 'municoes');
    if (typeof municao_flags === 'undefined') return;
    let item_flag = await actor.getFlag('tagmar-ammu-nation', roolItem.name);
    if (typeof item_flag === 'undefined') return;
    let new_flag = [];
    for (let mun of municao_flags) {
        if (mun.nome === item_flag) {
            let mun_gast = 0;
            if (roolItem.system.tipo == "") mun_gast = roolItem.system.nivel;
            else mun_gast = 1;
            if (mun.quant > 0) new_flag.push({nome: mun.nome, quant: mun.quant-mun_gast});
            else new_flag.push({nome: mun.nome, quant: 0});
        } else new_flag.push(mun);
    }
    if (new_flag.length > 0) await actor.setFlag('tagmar-ammu-nation', 'municoes', new_flag);
    for (let item of actor.items) {
        let thisItemFlag = await actor.getFlag('tagmar-ammu-nation', item.name);
        if (item.type === "Combate" && thisItemFlag === item_flag && typeof thisItemFlag !== 'undefined' && item.name !== roolItem.name) {
            let ammoFlag = await actor.getFlag('tagmar-ammu-nation', 'municoes');
            let amoFind = ammoFlag.find(f => f.nome === thisItemFlag);
            if (amoFind) {
                await item.update({
                    'system.municao': amoFind.quant
                });
            }
        }
    }
});

Hooks.on('ready', function () {
    if (!["tagmar", "tagmar_rpg", "tagmar3er_oficial"].includes(game.system.id)) return ui.notifications.error("Esse módulo só funciona com o sistema Tagmar, não insista.");
});
