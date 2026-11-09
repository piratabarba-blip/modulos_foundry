// Interface real + CSS do Foundry 14; lifecycle e Actor.create são simulados.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [foundryRoot,packages,output,packsPath]=process.argv.slice(2),root=path.resolve(__dirname,'..');
const systemRoot='C:/Users/PIRATA/AppData/Local/FoundryVTT/Data/systems/tagmar_rpg';
const {chromium}=require(path.join(packages,'playwright'));
const hbs=fs.readFileSync(path.join(root,'templates/generator.hbs'),'utf8'),css=fs.readFileSync(path.join(root,'styles/generator.css'),'utf8'),native=fs.readFileSync(path.join(foundryRoot,'public/css/foundry2.css'),'utf8');
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url()),name=path.basename(url.pathname);
   if(url.pathname.startsWith('/scripts/'))return route.fulfill({body:fs.readFileSync(path.join(root,'scripts',name)),contentType:'text/javascript'});
   if(url.pathname.endsWith('/actorUtils.js'))return route.fulfill({body:fs.readFileSync(path.join(systemRoot,'modules/sheets/actorUtils.js')),contentType:'text/javascript'});
   if(name==='template.json')return route.fulfill({body:fs.readFileSync(path.join(systemRoot,name)),contentType:'application/json'});
   if(name==='handlebars.js')return route.fulfill({body:fs.readFileSync(path.join(foundryRoot,'node_modules/handlebars/dist/handlebars.js')),contentType:'text/javascript'});
   if(url.pathname.startsWith('/fonts/')){const file=path.join(foundryRoot,'public',url.pathname);if(fs.existsSync(file))return route.fulfill({body:fs.readFileSync(file),contentType:name.endsWith('.css')?'text/css':'font/woff2'});}
   if(/\.(svg|jpg|jpeg|png|webp)$/.test(name))return route.fulfill({body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#bd9b4f"/><path d="M16 3L27 24H5Z" fill="#444"/></svg>',contentType:'image/svg+xml'});
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts/fontawesome/css/all.min.css"><style>${native}\n${css}\nbody{padding:25px;background:#26343e}.application.tg-generator{position:relative;inset:auto;width:1080px;height:880px}.window-content{flex:1;min-height:0}.window-header{height:32px;padding:6px 10px;background:#171b21;color:#d6b35e}.tg-generator{display:flex;flex-direction:column}</style></head><body class="theme-dark"><script src="/handlebars.js"></script></body></html>`});
   return route.abort();
  });
  await page.goto('http://generator.test/');
  await page.evaluate(async ({hbs,packs})=>{
   window.events={};window.notifications=[];window.created=[];window.settingWrites=0;window.getDocs=0;window.menus=[];
   window.Hooks={once:(k,fn)=>(events[k]??=[]).push(fn),on:(k,fn)=>(events[k]??=[]).push(fn)};
   window.ui={notifications:{info:x=>notifications.push(x),warn:x=>notifications.push(x),error:x=>notifications.push(x)}};
   window.game={system:{id:'tagmar_rpg'},user:{isGM:true},folders:[{id:'folder1',name:'Gerados',type:'Actor'}],actors:new Map(),modules:new Map([['tagmar-personagens',{}]]),packs:new Map(),settings:{registerMenu:(_m,_k,cfg)=>menus.push(cfg),set:()=>{settingWrites++;throw Error('Não deve gravar configurações da mesa');}}};
   for(const p of packs){const folders=new Map(p.folders.map(f=>[f._id,{...f,id:f._id}])),pack={collection:p.collection,folders,documentName:'Item',getDocuments:async()=>{getDocs++;return p.items.map(raw=>({...raw,id:raw._id,toObject:()=>structuredClone(raw)}));}};game.packs.set(p.collection,pack);}
   window.Actor={create:async(data,options)=>{if(!game.user.isGM)throw Error('Permissão');created.push(structuredClone(data));const actor={id:'new'+created.length,name:data.name,sheet:{render:async()=>{window.sheetOpened=true;}}};game.actors.set(actor.id,actor);return actor;}};
   const compiled=Handlebars.compile(hbs);
   class App{
    async _prepareContext(){return {};}_onRender(){}bringToFront(){}
    async render(){this.element??=document.body.appendChild(document.createElement('section'));this.element.className='application tg-generator';this.element.innerHTML=`<header class="window-header"><i class="window-icon fa-solid fa-user-plus" aria-hidden="true"></i><h1 class="window-title">${this.constructor.DEFAULT_OPTIONS.window.title}</h1><button class="header-control icon fa-solid fa-ellipsis-vertical" data-action="toggleControls"></button><button class="header-control icon fa-solid fa-xmark" data-action="close"></button></header><section class="window-content">${compiled(await this._prepareContext())}</section>`;this.rendered=true;this.element.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',event=>{this.lastAction=this.constructor.DEFAULT_OPTIONS.actions[button.dataset.action]?.call(this,event,button);}));this._onRender();return this;}
   }
   window.foundry={applications:{api:{ApplicationV2:App,HandlebarsApplicationMixin:B=>B}}};
   window.module=await import('/scripts/main.mjs');for(const fn of events.init)fn();for(const fn of events.ready)fn();
   window.app=await module.openGenerator();
  },{hbs,packs:JSON.parse(fs.readFileSync(packsPath,'utf8'))});
  const act=async selector=>{await page.locator(selector).first().click();await page.evaluate(async()=>{await app.lastAction;});};
  assert.equal(await page.evaluate(()=>getDocs),2);
  assert.equal(await page.evaluate(()=>menus[0].restricted),true);
  assert.equal(await page.locator('[data-field=name]').getAttribute('placeholder'),'Digite um nome');
  // Estrutura nativa dos controles do Foundry 14, com atalhos fixos do Tagmar.
  const sidebarResult=await page.evaluate(async()=>{
   const {positionGeneratorShortcut}=await import('/scripts/sidebar.mjs');
   const root=document.createElement('section');root.innerHTML='<menu data-application-part="layers"><li><button data-control="tokens"></button></li><li><button data-control="tagmar-personagens"></button></li><li><button data-control="sequencer"></button></li><li data-tagmar-shortcut-row="tagmarRolagem"><button></button></li></menu><menu id="scene-controls-tools"><li><button data-control="tagmar-personagens"></button></li></menu>';
   const menu=root.firstElementChild,own=menu.querySelector('[data-control="tagmar-personagens"]').closest('li');let clicks=0;own.querySelector('button').addEventListener('click',()=>clicks++);
   const first=positionGeneratorShortcut({},root),second=positionGeneratorShortcut({},[root]);own.querySelector('button').click();
   const order=[...menu.children].map(row=>row.querySelector('button').dataset.control??row.dataset.tagmarShortcutRow);
   const count=root.querySelectorAll('[data-control="tagmar-personagens"]').length;
   menu.querySelector('[data-control="sequencer"]').closest('li').remove();
   const fallback=positionGeneratorShortcut({},root);
   const gold=own.querySelector('button').classList.contains('tg-generator-shortcut');
   root.querySelector('[data-tagmar-shortcut-row]').remove();
   const empty=positionGeneratorShortcut({},root);
   return {first,second,order,count,clicks,fallback,gold,empty};
  });
  assert.deepEqual(sidebarResult,{first:true,second:true,order:['tokens','sequencer','tagmarRolagem','tagmar-personagens'],count:2,clicks:1,fallback:true,gold:true,empty:false});
  const headerFont=await page.locator('.header-control').first().evaluate(b=>getComputedStyle(b).fontFamily);
  assert.match(headerFont,/Awesome/i);
  assert.ok(await page.locator('.window-header').innerText().then(s=>s.includes('Tagmar - Gerador de Personagens e PNJs')));
  assert.equal(await page.locator('.tg-attribution').count(),0);
  assert.equal(await page.locator('.tg-heading h2').innerText(),' Gerador de Personagens e PNJs');
  await page.locator('[data-field=profession]').selectOption({label:'Mago'});
  await page.evaluate(async()=>{await app.render();});
  await page.locator('[data-field=race]').selectOption({label:'Humano'});
  await page.locator('[data-field=stage]').fill('10');await page.locator('[data-field=stage]').dispatchEvent('change');
  await page.locator('[data-field=specialization]').selectOption({label:'Colégio Elemental'});
  await page.locator('[data-field=name]').fill('Landalfo — teste');await page.locator('[data-field=name]').dispatchEvent('change');
  await act('[data-do=generate]');
  assert.equal(await page.evaluate(()=>app.preview.actor.name),'Landalfo — teste');
  assert.equal(await page.evaluate(()=>created.length),0);assert.equal(await page.evaluate(()=>getDocs),2);
  await page.screenshot({path:path.join(output,'01-personagem.png'),fullPage:true});
  await act('[data-do=lock][data-key=race]');await act('[data-do=lock][data-key=profession]');await act('[data-do=lock][data-key=stage]');
  const first=await page.evaluate(()=>({choices:app.preview.choices,attrs:app.preview.actor.system.atributos}));
  await act('[data-do=lock][data-key="attr:INT"]');await act('[data-do=generate]');
  assert.deepEqual(await page.evaluate(()=>app.preview.choices),first.choices);assert.equal(await page.evaluate(()=>app.preview.actor.system.atributos.INT),first.attrs.INT);
  await page.locator('details[data-section=spells]>summary').click();
  await page.screenshot({path:path.join(output,'02-magias-travas.png'),fullPage:true});
  // Desce um nível e mantém o nível editado no próximo sorteio.
  await act('details[data-section=spells] [data-do=item-down]:first-of-type');
  const edited=await page.evaluate(()=>{const key=Object.keys(app.optionsDraft.locks).find(k=>k.startsWith('item:'));return {key,level:app.preview.actor.items.find(i=>i.flags['tagmar-personagens'].source===key.slice(5)).system.nivel};});
  await act('[data-do=generate]');assert.equal(await page.evaluate(({key})=>app.preview.actor.items.find(i=>i.flags['tagmar-personagens'].source===key.slice(5)).system.nivel,edited),edited.level);
  // Alteração pendente impede criar uma prévia desatualizada.
  await page.locator('[data-field=name]').fill('Landalfo pronto');await page.locator('[data-field=name]').dispatchEvent('change');
  assert.equal(await page.locator('[data-do=create]').isDisabled(),true);
  await act('[data-do=generate]');await page.locator('[data-field=folder]').selectOption('folder1');await act('[data-do=create]');
  assert.equal(await page.evaluate(()=>created.length),1);assert.equal(await page.evaluate(()=>created[0].folder),'folder1');assert.equal(await page.evaluate(()=>sheetOpened),true);
  await page.evaluate(()=>app.perform('create'));assert.equal(await page.evaluate(()=>created.length),1);
  await act('[data-do=tab][data-type=NPC]');await act('[data-do=generate]');
  await page.screenshot({path:path.join(output,'03-pnj.png'),fullPage:true});
  await act('[data-do=create]');assert.equal(await page.evaluate(()=>created.length),2);assert.equal(await page.evaluate(()=>created[1].type),'NPC');assert.ok(await page.evaluate(()=>created[1].system.ef_npc.max>0));
  await act('[data-do=unlock]');
  await page.locator('[data-field=profession]').selectOption({label:'Sacerdote'});await page.evaluate(async()=>{await app.render();});
  await page.locator('[data-field=specialization]').selectOption('random');
  await page.locator('[data-section=identity]>summary').click();
  await page.locator('[data-field="identity:deus"]').selectOption('Ganis');
  await page.locator('[data-field="identity:altura"]').fill('1,88');await page.locator('[data-field="identity:altura"]').dispatchEvent('change');
  await act('[data-do=generate]');
  assert.equal(await page.evaluate(()=>app.preview.actor.system.deus),'Ganis');
  assert.equal(await page.evaluate(()=>app.preview.actor.system.especializacao),'A Ordem de Ganis');
  assert.equal(await page.evaluate(()=>app.preview.actor.system.altura),'1,88');
  assert.ok(await page.locator('[data-section=identity]').evaluate(el=>el.open));
  await page.screenshot({path:path.join(output,'04-identidade-sacerdote.png'),fullPage:true});
  // Filtros raciais atualizam a interface e o sorteio; kit soma a carga dos pertences.
  await act('[data-do=unlock]');
  await page.locator('[data-field=profession]').selectOption('random');await page.evaluate(async()=>{await app.render();});
  await page.locator('[data-field=race]').selectOption({label:'Elfo Sombrio'});await page.evaluate(async()=>{await app.render();});
  assert.equal(await page.locator('[data-field=profession] option').filter({hasText:'Sacerdote'}).evaluate(option=>option.disabled),true);
  await page.locator('[data-field=profession]').selectOption({label:'Mago'});await page.evaluate(async()=>{await app.render();});
  assert.equal(await page.locator('[data-field=specialization] option').filter({hasText:'Colégio Elemental'}).count(),0);
  await page.locator('[data-field=kit]').selectOption('journey');
  await act('[data-do=generate]');
  assert.equal(await page.evaluate(()=>app.preview.actor.system.especializacao),'Colégio Sombrio');
  const inventory=await page.evaluate(()=>{const a=app.preview.actor;return {weight:a.system.carga.value,total:a.items.filter(i=>i.type==='Pertence').reduce((n,i)=>n+i.system.quant*i.system.peso,0),count:a.items.filter(i=>i.type==='Pertence').length};});
  assert.equal(inventory.count,10);assert.ok(Math.abs(inventory.weight-inventory.total)<1e-8);
  await page.locator('details[data-section=equipment]>summary').click();
  await page.screenshot({path:path.join(output,'05-restricoes-kit.png'),fullPage:true});
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('.tg-generator input,.tg-generator select,.tg-generator .tg-stats')].filter(el=>el.getBoundingClientRect().right>document.querySelector('.tg-generator').getBoundingClientRect().right).length);assert.equal(overflow,0);
  assert.equal(await page.evaluate(()=>settingWrites),0);
  await page.evaluate(()=>{game.user.isGM=false;});assert.equal(await page.evaluate(async()=>await module.openGenerator()===undefined),true);
  const controls=await page.evaluate(()=>{const c={};for(const fn of events.getSceneControlButtons)fn(c);return c;});assert.deepEqual(controls,{});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify({passed:true,worldActorsCreatedInMock:2,realWorldWrites:0,catalogLoads:2,errors,overflow},null,2));
  console.log('PASS: interface, filtros, travas, edição de níveis, criar Personagem/PNJ, permissão e ausência de gravação na prévia.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
