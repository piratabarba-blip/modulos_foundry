// Prévia aditiva. Não abre nem altera bancos instalados.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base='outputs/gerador-personagens-20261109',out=path.join(base,'listas-ats');fs.mkdirSync(out,{recursive:true});
const norm=s=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const id=s=>crypto.createHash('sha256').update('tagmar-ats-listas-2026:'+s).digest('hex').slice(0,16);
const url='https://tagmar.com.br/downloads/Tagmar%20-%20Livro%20ATS.pdf';
const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(base,'fontes/Tagmar-Livro-ATS.pdf'))).digest('hex');
const descriptions=JSON.parse(fs.readFileSync(path.join(base,'fontes/tecnicas-descricoes-ATS.json')));
const basic=[['Aparar',2],['Ataque Oportuno',1],['Carga',1],['Combate Montado',2],['Combate Não Letal',1],['Concentração',1],['Desviar',2],['Esquiva',1],['Imprevisibilidade',2],['Luta às Cegas',1],['Provocar',2],['Resistência à Dor',2]];
const lists=[
 ['Berserker','01 - Básicas',basic],['Feiticeiro','01 - Básicas',basic],
 ['Ladino','Guilda dos Trapaceiros',[['Confundir Oponentes',1],['Golpe Sujo',2],['Imprevisibilidade',1]]],
 ['Ladino','Guilda dos Caçadores de Recompensa',[['Resistência à Dor',1],['Intimidar',1],['Explorar Ponto Fraco',2]]],
 ['Guerreiro','Academia dos Duelistas',[['Acurar',2],['Ambidestria',1],['Animosidade',1],['Defletir Ataque',2],['Desviar',1],['Duelar',2],['Explorar Ponto Fraco',2],['Inibir Ataque',1],['Leitura da Batalha',1],['Ripostar',2]]],
 ['Guerreiro','Academia dos Guardas',[['Combate com Escudo',1],['Contra-ataque',1],['Desarmar',2],['Guarda Alta',1],['Guardar Posição',2],['Imobilizar',2],['Incapacitar',2],['Ocupar Espaço',1],['Recuo estratégico',2],['Resistência à Dor',1]]]
];
const report={source:url,sourceHash:hash,pdfPages:[51,52],notes:[
 'Listas do livro ATS disponível no site. Raça Sekbete não impõe uma lista profissional própria: usar a profissão e a especialização.',
 'Custos destas cópias vêm da tabela ATS; técnicas homônimas preservam a implementação 3ER instalada. A descrição e a mecânica das técnicas originais não são sobrescritas.',
 'Técnicas exclusivas do suplemento usam a descrição do livro e execução manual; nenhuma consequência de combate nova foi automatizada.',
 'A wiki dos Guardas inclui Heroísmo, que não consta na tabela do PDF: diferença de edição registrada, não incorporada silenciosamente.',
 'Não foi copiada a referência aparentemente incorreta do livro à lista restrita de Ladino para Guerreiros.'
 ],systems:[]};
for(const edition of ['xxx','oficial']){
 const packs=JSON.parse(fs.readFileSync(path.join(base,edition,'packs.json'))),core=packs.find(p=>p.realm==='reinos'),target=packs.find(p=>p.realm==='terras');
 const patch={items:[],folders:[]},root=target.folders.find(f=>f.name==='06 - TÉCNICAS DE COMBATE TERRAS SELVAGENS');if(!root)throw Error('Pasta raiz ausente.');
 const folder=(name,parent,route)=>{const found=target.folders.find(f=>f.name===name&&f.folder===parent)||patch.folders.find(f=>f.name===name&&f.folder===parent);if(found)return found._id;const f={_id:id(route),name,type:'Item',folder:parent,sorting:'a',sort:0,color:'#b6a14f',flags:{tagmarSync:{edition:'Aventuras nas Terras Selvagens',category:'tecnicas-combate',route}}};patch.folders.push(f);return f._id;};
 for(const [profession,specialization,rows]of lists){
  const route=[root.name,profession,specialization],profId=folder(profession,root._id,route.slice(0,2)),folderId=folder(specialization,profId,route);
  for(const [name,cost]of rows){
   const original=core.items.find(i=>i.type==='Tecnica_Combate'&&norm(i.name)===norm(name));let item;
   if(original){item=structuredClone(original);delete item._stats;delete item.flags;}
   else{
    const text=Object.entries(descriptions).find(([n])=>norm(n)===norm(name))?.[1];if(!text)throw Error('Descrição ausente: '+name);
    const attr={Força:'FOR',Físico:'FIS',Agilidade:'AGI',Percepção:'PER',Carisma:'CAR',Intelecto:'INT',Aura:'AUR'}[(text.match(/^Atributo: ([^.\n]+)/)||[])[1]]??'';
    const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    item={name,type:'Tecnica_Combate',img:'icons/svg/sword.svg',system:{custo:cost,nivel:0,ajuste:{atributo:attr,valor:0},bonus:0,fa:0,mecanica:['Desarmar','Imobilizar','Incapacitar','Duelar','Ripostar','Confundir Oponentes'].includes(name)?2:1,duracao:{valor:0,tipo:'Ataque(s)'},teste:'Não',restricao:'Execução e consequências conforme a descrição; avaliação do mestre.',pre_requisito:{valor:'Não',tecnica:''},complemento:'Não',descricao:'<p>'+esc(text).replaceAll('\n','<br>')+'</p>'},effects:[],ownership:{default:0}};
    const req=text.match(/Requisitos: ([\s\S]*?)(?:Mecânica:|Obs\.)/);if(req&&!/^[-.\s]*$/.test(req[1]))item.system.pre_requisito={valor:'Sim',tecnica:req[1].replaceAll('\n',' ').trim()};
   }
   item._id=id(route.join('/')+'/'+name);item.folder=folderId;item.system.custo=cost;item.system.nivel=0;item.system.fa=0;
   item.system.descricao+='<hr><p><strong>Lista de aquisição ATS:</strong> '+profession+' — '+specialization+'. Custo: '+cost+'. Fonte: <a href="'+url+'">Livro ATS, tabelas de técnicas (páginas 51–52 do PDF)</a>. '+(original?'Definição de jogo: técnica homônima da implementação 3ER; esta cópia ajusta sua lista e custo.':'Técnica do suplemento, de resolução manual pelo mestre.')+'</p>';
   item.flags={tagmarSync:{edition:'Aventuras nas Terras Selvagens',category:'tecnicas-combate',sourceUrl:url,sourceHash:hash,sourcePages:[51,52],route,acquisitionList:profession,specialization,acquisitionSource:'livro-ATS',reusedDefinition:original?{collection:core.collection,id:original._id}:null,manualResolution:!original,needsMechanicalReview:!original}};
   if(target.items.some(i=>i._id===item._id))throw Error('ID já existe: '+name);patch.items.push(item);
  }
 }
 target.items.push(...patch.items);target.folders.push(...patch.folders);
 fs.writeFileSync(path.join(out,edition+'-patch.json'),JSON.stringify(patch,null,2));fs.writeFileSync(path.join(out,edition+'-packs.json'),JSON.stringify(packs));
 report.systems.push({edition,collection:target.collection,addedItems:patch.items.length,addedFolders:patch.folders.length,existingItemsUnchanged:true,manualResolution:patch.items.filter(i=>i.flags.tagmarSync.manualResolution).map(i=>i.name)});
}
fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
