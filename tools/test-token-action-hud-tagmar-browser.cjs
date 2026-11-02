const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const app=process.env.TAGMAR_TEST_FOUNDRY||'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app';
const data=process.env.FOUNDRY_DATA||'C:/Users/PIRATA/AppData/Local/FoundryVTT/Data';
const runtime=process.env.TAGMAR_TEST_NODE_MODULES||'C:/Users/PIRATA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const Handlebars=require(require.resolve('handlebars',{paths:[path.join(app,'node_modules')]}));
const {chromium}=require(path.join(runtime,'playwright'));
const moduleRoot=path.resolve(__dirname,'../token-action-hud-tagmar');
const output=path.resolve(__dirname,'../../outputs/hud-tagmar-preview');
(async()=>{
  const {actorActions,defaults}=await import(pathToFileURL(path.join(moduleRoot,'scripts/model.mjs')));
  const actor={uuid:'Actor.fixture',type:'Personagem',name:'Personagem de teste',isOwner:true,system:{ef:{value:30,max:40},eh:{value:25,max:35},karma:{value:18,max:20},absorcao:{value:15,max:18},rm:5,rf:6,valor_teste:{INT:4,AUR:3,CAR:2,FOR:3,FIS:2,AGI:5,PER:4}},items:[]};
  for(const [id,name,type,system,img] of [
    ['bow','Arco de Guerra','Combate',{municao:17,alcance:'160 m',dano:{d100:22}},'icons/weapons/bows/shortbow-recurve.webp'],
    ['sword','Cimitarra','Combate',{municao:0,dano:{d100:18}},'icons/svg/sword.svg'],
    ['fire','Bola de Fogo 5','Combate',{municao:0,alcance:'50 m',dano:{d100:34}},'icons/svg/fire.svg'],
    ['parry','Aparar','Tecnica_Combate',{nivel:4,fa:7},'icons/svg/shield.svg'],
    ['dodge','Esquiva','Tecnica_Combate',{nivel:4,fa:6},'icons/svg/wing.svg'],
    ['light','Manipulação de Luz','Magia',{nivel:3},'icons/svg/light.svg'],
    ['portal','Transporte Dimensional','Magia',{nivel:2},'icons/svg/door-exit.svg'],
    ['nautica','Náutica','Habilidade',{nivel:3,total:6,tipo:'profissional'},'icons/svg/anchor.svg'],
    ['climb','Escalar Superfícies','Habilidade',{nivel:2,total:5,tipo:'manobra'},'icons/svg/mountain.svg'],
    ['medicine','Medicina','Habilidade',{nivel:2,total:4,tipo:'conhecimento'},'icons/svg/regen.svg'],
    ['stealth','Ações Furtivas','Habilidade',{nivel:0,total:0,tipo:'subterfugio'},'icons/svg/mystery-man.svg'],
    ['persuade','Persuasão','Habilidade',{nivel:2,total:4,tipo:'influencia'},'icons/svg/sound.svg'],
    ['nav','Navegação','Habilidade',{nivel:4,total:6,tipo:'geral'},'icons/svg/compass.svg']
  ])actor.items.push({id,name,type,system,img,actor});
  const actions=actorActions(actor);
  const layout=defaults().layout.map(parent=>({...parent,settings:{showTitle:true},level:1,groups:{lists:parent.groups.filter(g=>actions.has(g.id)).map(g=>({...g,level:2,hasActions:true,settings:{showTitle:true},actions:actions.get(g.id),groups:{lists:[],tabs:[]}})),tabs:[]}}));
  const translations=JSON.parse(await fs.readFile(path.join(data,'modules/token-action-hud-core/languages/br.json'),'utf8'));
  Handlebars.registerHelper('ne',(a,b)=>a!==b);
  Handlebars.registerHelper('tokenActionHudCoreTrue',value=>Boolean(value));
  Handlebars.registerHelper('tokenActionHudCoreCap',value=>value);
  Handlebars.registerHelper('tokenActionHudCoreActiveText',()=> '');
  Handlebars.registerHelper('localize',key=>translations[key]??key);
  for(const name of ['action','group','list-subgroup','tab-subgroup'])Handlebars.registerPartial(`modules/token-action-hud-core/templates/${name}.hbs`,await fs.readFile(path.join(data,`modules/token-action-hud-core/templates/${name}.hbs`),'utf8'));
  const template=Handlebars.compile(await fs.readFile(path.join(data,'modules/token-action-hud-core/templates/hud.hbs'),'utf8'));
  const html=template({id:'token-action-hud',scale:1,style:'tah-style-foundry-vtt-dark',hud:{actorId:'fixture',name:'Personagem de teste',groups:layout},collapsibleSubgroups:true});
  let htmlPage=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="/public/css/foundry2.css"><link rel="stylesheet" href="/modules/token-action-hud-core/styles/token-action-hud.css"><link rel="stylesheet" href="/modules/token-action-hud-core/styles/tah-foundry-vtt-dark.css"><link rel="stylesheet" href="/adapter/styles/tagmar.css"><style>body{background:#211d26;padding:35px;font-family:Arial,sans-serif}h1{font-family:Arial,sans-serif;font-size:23px;color:#e3c58c}p{color:#d3cbd5}#token-action-hud-app{position:absolute;left:35px;top:160px;width:auto;max-width:calc(100vw - 70px)}#test-log{position:absolute;bottom:25px;color:#d3cbd5}button{font-size:14px}</style></head><body class="theme-dark"><h1>Token Action HUD Tagmar</h1><p>Prévia visual com os templates e o estilo reais do Core 2.1.2.</p><div id="token-action-hud-app" class="tah-style-foundry-vtt-dark">${html}</div><div id="test-log">Selecione uma categoria.</div><script>document.querySelectorAll('.tah-subgroups-container').forEach(e=>e.classList.add('expand-down'));document.querySelectorAll('.tah-tab-group>.tah-group-button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.tah-tab-group').forEach(e=>e.classList.remove('hover'));button.parentElement.classList.add('hover');}));document.querySelectorAll('.tah-action-button').forEach(button=>button.addEventListener('click',()=>{document.querySelector('#test-log').textContent=button.value;}));</script></body></html>`;
  const server=http.createServer(async(req,res)=>{
    try{
      const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(htmlPage);return;}
      const map=[['/public/',path.join(app,'public')],['/icons/',path.join(app,'public/icons')],['/fonts/',path.join(app,'public/fonts')],['/modules/token-action-hud-core/',path.join(data,'modules/token-action-hud-core')],['/adapter/',moduleRoot]];
      const match=map.find(([prefix])=>url.startsWith(prefix));
      if(!match){res.writeHead(404).end();return;}
      const file=path.resolve(match[1],url.slice(match[0].length));
      if(!file.startsWith(path.resolve(match[1])+path.sep)){res.writeHead(403).end();return;}
      res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'application/octet-stream');res.end(await fs.readFile(file));
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    for(const label of ['Combate','Habilidades','Magias','Testes','Ficha']){
      await page.getByRole('button',{name:label,exact:true}).click();
      const rows=page.locator('.tah-tab-group.hover .tah-action-button');
      assert(await rows.count()>0);
      for(const row of await rows.all()){
        const rect=await row.boundingBox();assert(rect&&rect.x>=0&&rect.y>=0&&rect.x+rect.width<=1200&&rect.y+rect.height<=800,`Clipped ${label}`);
      }
    }
    await page.getByRole('button',{name:'Combate',exact:true}).click();
    const bow=page.locator('.tah-tab-group.hover .tah-action-button').filter({hasText:'Arco de Guerra'});
    await bow.click();assert((await page.locator('#test-log').textContent()).includes('tagmar|item|Actor.fixture|bow'));
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.tah-tagmar-action:hover')).borderTopColor==='rgb(216, 182, 106)');
    await fs.mkdir(output,{recursive:true});await page.screenshot({path:path.join(output,'preview.png')});
    assert.equal(await bow.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(216, 182, 106)');
    await page.getByRole('button',{name:'Habilidades',exact:true}).click();await page.screenshot({path:path.join(output,'skills.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS: templates/CSS reais do Core; cinco categorias; nomes/ícones/valores; seleção; sem cortes em 1200x800.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
