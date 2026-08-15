let votacoes = {
    escolhas: [],
    titulos: [],
    votes: []
};

Hooks.on("getSceneControlButtons", (controls) => {
    const tokenControls = controls.tokens;
    if (!tokenControls) return;
    const tools = tokenControls.tools;
    tools.tagmarVotacao = {
      name: "tagmarVotacao",
      icon: "fas fa-vote-yea",
      title: "Iniciar Votação para todos jogadores.",
      order: Object.keys(tools).length,
      onChange: async () => set_votation(),
      button: true
    };
});

function set_votation(event) {
    let titulos = [];
    votacoes = {
        escolhas: [],
        titulos: [],
        votes: []
    };
    const dialog_html = `
        <label for="titulo">Opção: </label>
        <input type="text" id="titulo" style="width: 250px;"/>
        <input type="button" id="adicionar" value="Adicionar"/>
        <ul id="lista" style="height: 400px; list-style-type: none;"></ul>
    `;
    let dialog = new Dialog({
        title: "Votação",
        content: dialog_html,
        buttons: {
            "enviar": {
                label: "Enviar",
                icon: '<i class="fas fa-check"></i>',
                callback: html => {
                    let checkeds = $("input[type='checkbox']:checked");
                    let escolha = checkeds.length > 0 ? checkeds[0].value: false;
                    const socketData = {
                        type: "vote",
                        user: game.user.name,
                        titulos: titulos,
                        escolha: escolha
                    };
                    votacoes.escolhas.push({user: game.user.name, escolha: escolha});
                    votacoes.titulos = titulos;
                    game.socket.emit('module.tagmartrade', socketData);
                }
            }
        },
        render: html => {
            let titulo = $(html.find("#titulo"));
            let lista = $(html.find("#lista"));
            let addOption = function () {
                lista.append(`<li><input class="check" type="checkbox" value="${titulos.length}"/>${titulo.val()}</li>`);
                titulos.push(titulo.val());
                titulo.val("");
                $(html.find('.check')).change(function (event) {
                    $(html.find('.check')).not(event.currentTarget).prop('checked', false);
                });
            }
            $(html.find("#adicionar")).click(addOption);
            $(html.find("#titulo")).on("keypress", function (event) {
                if (event.which === 13) addOption();
            }); 
        }
    }).render(true);
}

Hooks.on("ready", function () {
    game.socket.on("module.tagmartrade", socketData => {
       if (socketData.type == "vote") recebeSocket(socketData);
       else if (socketData.type == "vote_send") recebeVote(socketData);
    });
});

function recebeVote(socketData) {
    if (game.user.name != socketData.user_ini) return;
    votacoes.escolhas.push({user: socketData.user, escolha: socketData.escolha});
    if (votacoes.escolhas.length >= game.users.filter(u => u.active).length) {
        // todos os votos computados
        for (let titulo_id = 0; titulo_id < votacoes.titulos.length; titulo_id++) {
            votacoes.votes[titulo_id] = 0;
            for (let escolha of votacoes.escolhas) {
                if (parseInt(escolha.escolha) == titulo_id) votacoes.votes[titulo_id] += 1;  
            }    
        }
        let html_chat = "";
        let colors = ["red", "purple", "lime", "teal", "aqua", "chocolate", "darkcyan", "darkgoldenrod", "darkkhaki", "darksalmon", "deeppink", "dodgerblue"];
        let soma_total = 0;
        for (let vote of votacoes.votes) {
            soma_total += vote;
        }
        for (let title of votacoes.titulos) {
            html_chat += `<p>${title}</p>
            <div style="width: 100%; height: 37px; background-color: #ddd;">
              <div style="text-align: right; padding-top: 10px; padding-bottom: 10px; color: white; height: 100%; width: ${(votacoes.votes[votacoes.titulos.indexOf(title)] / soma_total) * 100}%; background-color: ${colors[votacoes.titulos.indexOf(title)]};">${((votacoes.votes[votacoes.titulos.indexOf(title)] / soma_total) * 100).toFixed(1).replace(/\.0+$/,"")}%</div>
            </div>`;
        }        
        ChatMessage.create({
            user: game.user.id,
            content: html_chat
        });
        votacoes = {
            escolhas: [],
            titulos: [],
            votes: []
        };
    }
}

function recebeSocket(socketData) {
    let dialog_html = `<ul style="list-style-type: none; height: 400px;" id="lista"></ul>`;
    let dialog = new Dialog({
        title: `Votação iniciada por ${socketData.user}`,
        content: dialog_html,
        buttons: {
            "enviar": {
                label: "Enviar",
                icon: '<i class="fas fa-check"></i>',
                callback: html => {}
            }
        },
        render: html => {
            for (let titulo of socketData.titulos) {
                $(html.find("#lista")).append(`<li><input type="checkbox" class="check" value="${socketData.titulos.indexOf(titulo)}">${titulo}</li>`);
            }
            $(html.find('.check')).change(function (event) {
                $(html.find('.check')).not(event.currentTarget).prop('checked', false);
            });
        },
        close: html => {
            let checkeds = $("input[type='checkbox']:checked");
            let escolha = checkeds.length > 0 ? checkeds[0].value : false;
            let send_vote = {
                type: "vote_send",
                user: game.user.name,
                user_ini: socketData.user,
                escolha: escolha
            };
            game.socket.emit("module.tagmartrade", send_vote);
        }
    }).render(true);
}
