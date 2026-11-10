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
   if(/\.(svg|jpg|jpeg|png|webp)$/i.test(name))return route.fulfill({body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#bd9b4f"/><path d="M16 3L27 24H5Z" fill="#444"/></svg>',contentType:'image/svg+xml'});
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts/fontawesome/css/all.min.css"><style>${native}\n${css}\nbody{padding:25px;background:#26343e}.application.tg-generator{position:relative;inset:auto;width:1080px;height:880px}.window-content{flex:1;min-height:0}.window-header{height:32px;padding:6px 10px;background:#171b21;color:#d6b35e}.tg-generator{display:flex;flex-direction:column}</style></head><body class="theme-dark"><script src="/handlebars.js"></script></body></html>`});
   return route.abort();
  });
  await page.goto('http://generator.test/');
  await page.evaluate(async ({hbs,packs,creatures})=>{
   window.events={};window.notifications=[];window.created=[];window.settingWrites=0;window.getDocs=0;window.menus=[];
   window.Hooks={once:(k,fn)=>(events[k]??=[]).push(fn),on:(k,fn)=>(events[k]??=[]).push(fn)};
   window.ui={notifications:{info:x=>notifications.push(x),warn:x=>notifications.push(x),error:x=>notifications.push(x)}};
   window.game={system:{id:'tagmar_rpg'},user:{isGM:true},folders:[{id:'folder1',name:'Gerados',type:'Actor'}],actors:new Map(),modules:new Map([['tagmar-personagens',{}]]),packs:new Map(),settings:{registerMenu:(_m,_k,cfg)=>menus.push(cfg),set:()=>{settingWrites++;throw Error('Não deve gravar configurações da mesa');}}};
   for(const p of packs){const folders=new Map(p.folders.map(f=>[f._id,{...f,id:f._id}])),pack={collection:p.collection,folders,documentName:'Item',getDocuments:async()=>{getDocs++;return p.items.map(raw=>({...raw,id:raw._id,toObject:()=>structuredClone(raw)}));}};game.packs.set(p.collection,pack);}
   window.creatureLoads=0;window.creatureIndices=0;window.creatureFixture=creatures;
   const creatureKey='tagmar_rpg.criaturas-t3er';game.packs.set(creatureKey,{collection:creatureKey,metadata:{name:'criaturas-t3er',label:'Criaturas de Tagmar — Edição Oficial Sincronizada'},documentName:'Actor',getIndex:async()=>{creatureIndices++;return new Map(creatures.map(a=>[a._id,{_id:a._id,name:a.name,type:a.type,system:{estagio:a.system.estagio}}]));},getDocument:async id=>{creatureLoads++;const a=creatures.find(a=>a._id===id);return a?{id,type:a.type,uuid:`Compendium.${creatureKey}.Actor.${id}`,toObject:()=>structuredClone(a)}:null;}});
   window.Actor={create:async(data,options)=>{if(!game.user.isGM)throw Error('Permissão');created.push(structuredClone(data));const actor={id:'new'+created.length,name:data.name,sheet:{render:async()=>{window.sheetOpened=true;}}};game.actors.set(actor.id,actor);return actor;}};
   const compiled=Handlebars.compile(hbs);
   class App{
    async _prepareContext(){return {};}_onRender(){}bringToFront(){}
    async render(){this.element??=document.body.appendChild(document.createElement('section'));this.element.className='application tg-generator';this.element.innerHTML=`<header class="window-header"><i class="window-icon fa-solid fa-user-plus" aria-hidden="true"></i><h1 class="window-title">${this.constructor.DEFAULT_OPTIONS.window.title}</h1><button class="header-control icon fa-solid fa-ellipsis-vertical" data-action="toggleControls"></button><button class="header-control icon fa-solid fa-xmark" data-action="close"></button></header><section class="window-content">${compiled(await this._prepareContext())}</section>`;this.rendered=true;this.element.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',event=>{this.lastAction=this.constructor.DEFAULT_OPTIONS.actions[button.dataset.action]?.call(this,event,button);}));this._onRender();return this;}
   }
   window.foundry={applications:{api:{ApplicationV2:App,HandlebarsApplicationMixin:B=>B}}};
   window.module=await import('/scripts/main.mjs');for(const fn of events.init)fn();for(const fn of events.ready)fn();
   window.app=await module.openGenerator();
  },{hbs,packs:JSON.parse(fs.readFileSync(packsPath,'utf8')),creatures:JSON.parse(fs.readFileSync(process.argv[6]??'outputs/criaturas-variantes-20261109/xxx-creatures.json','utf8')).map(a=>a.name==='Lobo Beta'?a:{_id:a._id,name:a.name,type:a.type,system:{estagio:a.system.estagio}})});
  const act=async selector=>{await page.locator(selector).first().click();await page.evaluate(async()=>{await app.lastAction;});};
  const chooseItem=async(selector,label)=>{const picker=page.locator(selector).locator('..');await picker.locator('input').click();await picker.locator('input').fill(label);await picker.locator('[role=option]').filter({hasText:label}).first().click();};

  assert.equal(await page.evaluate(()=>getDocs),2);
  assert.equal(await page.evaluate(()=>menus[0].restricted),true);
  assert.equal(await page.locator('[data-field=name]').getAttribute('placeholder'),'Digite um nome');
  // Estrutura nativa dos controles do Foundry 14, com atalhos fixos do Tagmar.
  const sidebarResult=await page.evaluate(async()=>{
   const {positionGeneratorShortcut}=await import('/scripts/sidebar.mjs');
   const root=document.createElement('section');root.innerHTML='<menu data-application-part="layers"><li><button class="active" data-control="tokens"></button></li><li><button data-control="tagmar-personagens"></button></li><li><button data-control="sequencer"></button></li><li data-tagmar-shortcut-row="tagmarRolagem"><button></button></li></menu><menu id="scene-controls-tools"><li><button data-tool="select" class="active"></button></li><li><button data-control="tagmar-personagens"></button></li></menu>';
   const menu=root.firstElementChild;let clicks=0,bubbled=0;root.addEventListener('click',()=>bubbled++);
   const open=async()=>{clicks++;};
   const first=positionGeneratorShortcut({},root,open),second=positionGeneratorShortcut({},[root],open);
   const own=menu.querySelector('[data-tg-generator-row]'),button=own.querySelector('button');button.click();await Promise.resolve();
   const order=[...menu.children].map(row=>row.querySelector('button').dataset.control??row.dataset.tagmarShortcutRow??'generator');
   const count=root.querySelectorAll('.tg-generator-shortcut').length;
   const legacy=root.querySelectorAll('[data-control="tagmar-personagens"]').length;
   const active=root.querySelectorAll('.active').length;
   // Outro render do sistema acrescenta atalhos; nosso render coloca o botão no fim.
   const late=root.ownerDocument.createElement('li');late.dataset.tagmarShortcutRow='tagmar-viagens';menu.append(late);
   positionGeneratorShortcut({},root,open);const last=menu.lastElementChild===own;
   menu.querySelector('[data-control="sequencer"]').closest('li').remove();root.querySelectorAll('[data-tagmar-shortcut-row]').forEach(row=>row.remove());
   const fallback=positionGeneratorShortcut({},root,open);
   return {first,second,order,count,legacy,clicks,bubbled,active,last,fallback,gold:button.classList.contains('button'),nativeAction:button.hasAttribute('data-action')||button.hasAttribute('data-control')};
  });
  assert.deepEqual(sidebarResult,{first:true,second:true,order:['tokens','sequencer','tagmarRolagem','generator'],count:1,legacy:0,clicks:1,bubbled:0,active:2,last:true,fallback:true,gold:true,nativeAction:false});
  // O módulo não registra um grupo secundário no Foundry.
  assert.equal(await page.evaluate(()=>(events.getSceneControlButtons??[]).length),0);
  const headerFont=await page.locator('.header-control').first().evaluate(b=>getComputedStyle(b).fontFamily);
  assert.match(headerFont,/Awesome/i);
  assert.ok(await page.locator('.window-header').innerText().then(s=>s.includes('Tagmar - Gerador de Personagens e PNJs')));
  assert.equal(await page.locator('.tg-attribution').count(),0);
  assert.equal(await page.locator('.tg-heading h2').innerText(),' Gerador de Personagens, PNJs e Criaturas');
  await page.locator('[data-field=profession]').selectOption({label:'Mago'});
  await page.evaluate(async()=>{await app.render();});
  await page.locator('[data-field=race]').selectOption({label:'Humano'});
  await page.locator('[data-field=stage]').fill('10');await page.locator('[data-field=stage]').dispatchEvent('change');
  await page.locator('[data-field=specialization]').selectOption({label:'Colégio Elemental'});
  await page.locator('[data-field=name]').fill('Landalfo — teste');await page.locator('[data-field=name]').dispatchEvent('change');
  await act('[data-do=generate]');
  // As quatro abas compartilham categorias; os controles respeitam cada modelo.
  const checkCharacterSkills=async image=>{
   const section=page.locator('details[data-section=skills]');
   if(!await section.evaluate(el=>el.open))await section.locator(':scope > summary').click();
   assert.deepEqual(await section.locator('.tg-skill-group h3').allTextContents(),['Profissional','Manobra','Conhecimento','Subterfúgio','Influência','Geral']);
   assert.equal(await section.locator('[data-skill-key]').count(),42);
   const actorBefore=await page.evaluate(()=>JSON.stringify(app.preview.actor));await page.evaluate(async()=>await app.render());
   assert.equal(await page.evaluate(()=>JSON.stringify(app.preview.actor)),actorBefore);
   const skill=await page.evaluate(()=>{const i=app.preview.actor.items.find(i=>i.type==='Habilidade'&&i.system.nivel>0&&i.name!==app.preview.actor.system.hab_nata);return {key:i.flags['tagmar-personagens'].source,level:i.system.nivel,budget:app.preview.actor.system.pontos_aqui};});
   const row=section.locator(`[data-skill-key="${skill.key}"]`);
   await act(`details[data-section=skills] [data-do=item-down][data-key="${skill.key}"]`);
   assert.equal(await page.evaluate(key=>app.preview.actor.items.find(i=>i.flags['tagmar-personagens']?.source===key).system.nivel,skill.key),skill.level-1);
   assert.ok(await page.evaluate(()=>app.preview.actor.system.pontos_aqui)>skill.budget);
   await act(`details[data-section=skills] [data-do=item-up][data-key="${skill.key}"]`);
   assert.equal(await page.evaluate(()=>app.preview.actor.system.pontos_aqui),skill.budget);
   assert.equal(await row.locator('[data-do=lock]').getAttribute('class').then(s=>s.includes('locked')),true);
   const innate=await page.evaluate(()=>{const i=app.preview.actor.items.find(i=>i.type==='Habilidade'&&i.name===app.preview.actor.system.hab_nata);return i.flags['tagmar-personagens'].source;});
   assert.equal(await section.locator(`[data-skill-key="${innate}"] [data-do=item-up]`).count(),0);
   const geometry=await section.locator('.tg-skill-group').evaluateAll(groups=>groups.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,left:r.left};}));
   assert.equal(geometry[0].top,geometry[1].top);assert.equal(geometry[1].top,geometry[2].top);
   assert.ok(geometry[0].left<geometry[1].left&&geometry[1].left<geometry[2].left);
   assert.equal(await section.locator('.tg-skill-grid').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
   await section.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,image),fullPage:true});
  };
  await checkCharacterSkills('15-personagem-habilidades-agrupadas.png');
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
  await checkCharacterSkills('16-pnj-habilidades-agrupadas.png');
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
  const profileBefore=await page.evaluate(()=>JSON.stringify(app.preview));
  await act('[data-do=tab][data-type=Creature]');
  assert.equal(await page.locator('[data-creature-picker] [role=option]').count(),414);
  assert.equal(await page.evaluate(()=>creatureLoads),0);
  await page.locator('[data-c-search]').fill('lobo');
  const filtered=await page.locator('[data-creature-picker] [role=option]:not([hidden])').count();assert.ok(filtered>1&&filtered<30);
  assert.equal(await page.locator('[data-c-search]').getAttribute('aria-expanded'),'true');
  await page.screenshot({path:path.join(output,'06a-busca-criaturas.png'),fullPage:true});
  await page.locator('[data-c-search]').fill('inexistente-xyz');assert.equal(await page.locator('[data-c-empty]').isVisible(),true);
  await page.locator('[data-c-search]').press('Escape');assert.equal(await page.locator('[data-c-search]').getAttribute('aria-expanded'),'false');
  await page.locator('[data-c-toggle]').click();
  assert.equal(await page.locator('[data-creature-picker] [role=option]:not([hidden])').count(),414);
  await page.locator('[data-c-search]').press('ArrowUp');
  const lastActive=await page.locator('[data-c-search]').getAttribute('aria-activedescendant');assert.equal(lastActive,'tg-creature-option-413');
  const scroll=await page.locator('[role=listbox]').evaluate(el=>el.scrollTop);assert.ok(scroll>0);
  await page.locator('[data-c-search]').fill('lobo');
  const wolfId=await page.evaluate(()=>creatureFixture.find(a=>a.name==='Lobo Beta')._id);
  await page.locator(`[role=option][data-key="${wolfId}"]`).click();
  await page.waitForFunction(id=>app.creature.draft.source===id,wolfId);
  assert.match(await page.locator('[data-c-search]').inputValue(),/Lobo Beta/);
  assert.equal(await page.locator('[data-c-field=source]').inputValue(),wolfId);
  await page.locator('[data-c-search]').fill('Lobo Beta');await page.locator('[data-c-search]').press('ArrowDown');await page.locator('[data-c-search]').press('Enter');
  await page.waitForFunction(id=>app.creature.draft.source===id,wolfId);
  for(const checked of [true,false]){
   await page.locator('[data-c-field=variation]').setChecked(checked);
   await page.waitForFunction(c=>app.creature.draft.variation===c,checked);
   const geometry=await page.locator('.tg-check').evaluate(label=>{const input=label.querySelector('input'),b=input.getBoundingClientRect(),r=label.getBoundingClientRect();return {before:getComputedStyle(input,'::before').display,after:getComputedStyle(input,'::after').display,width:b.width,right:b.right,labelRight:r.right,height:b.height,padding:getComputedStyle(input).padding};});
   assert.equal(geometry.before,'none');assert.equal(geometry.after,'none');assert.equal(geometry.width,18);assert.equal(geometry.height,18);assert.equal(geometry.padding,'0px');assert.ok(geometry.right<geometry.labelRight);
  }
  await act('[data-do=c-generate]');
  assert.equal(await page.evaluate(()=>created.length),2);
  assert.equal(await page.evaluate(()=>creatureLoads),1);
  const variantSkills=page.locator('details[data-section="creature:skills"]');
  if(!await variantSkills.evaluate(el=>el.open))await variantSkills.locator(':scope > summary').click();
  assert.equal(await variantSkills.locator('.tg-skill-group').count(),6);
  const originalSkillCount=await page.evaluate(()=>app.creature.source.actor.items.filter(i=>i.type==='Habilidade').length);
  assert.equal(await variantSkills.locator('tbody tr:has(button)').count(),originalSkillCount);
  const variantBeforeLock=await page.evaluate(()=>JSON.stringify(app.creature.preview.actor));
  const lock=variantSkills.locator('[data-do=c-lock]').filter({has:page.locator('i')}).nth(1);
  const key=await lock.getAttribute('data-key');await act(`details[data-section="creature:skills"] [data-key="${key}"]`);
  assert.equal(await page.evaluate(key=>app.creature.draft.locks[key],key),true);
  assert.equal(await page.evaluate(()=>JSON.stringify(app.creature.preview.actor)),variantBeforeLock);
  await variantSkills.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'17-variante-habilidades-agrupadas.png'),fullPage:true});

  await page.locator('details[data-section="creature:attacks"]>summary').click();
  await page.screenshot({path:path.join(output,'06-criaturas.png'),fullPage:true});
  const ef=await page.evaluate(()=>app.creature.preview.actor.system.ef.max);
  await act('[data-do=c-lock][data-key="resource:ef"]');
  await page.locator('[data-c-search]').fill('Lobo Beta');await page.locator('[data-c-search]').press('Enter');
  await page.waitForFunction(()=>!!app.creature.draft.source&&!document.querySelector('[data-do=c-generate]').disabled);
  assert.equal(await page.evaluate(()=>app.creature.draft.locks['resource:ef']),true);
  assert.equal(await page.evaluate(()=>app.creature.preview.actor.system.ef.max),ef);
  await page.locator('[data-c-field=factor]').fill('50');await page.locator('[data-c-field=factor]').dispatchEvent('change');
  assert.equal(await page.locator('[data-do=c-create]').isDisabled(),true);
  await act('[data-do=c-generate]');
  assert.equal(await page.evaluate(()=>app.creature.preview.actor.system.ef.max),ef);
  await page.locator('[data-c-edit=eh]').fill('99');await page.locator('[data-c-edit=eh]').dispatchEvent('change');
  await page.waitForFunction(()=>app.creature.preview.actor.system.eh.max===99);
  await act('[data-do=c-generate]');assert.equal(await page.evaluate(()=>app.creature.preview.actor.system.eh.max),99);
  await page.locator('[data-c-field=folder]').selectOption('folder1');
  await act('[data-do=c-create]');
  const creatureCreated=await page.evaluate(()=>created.at(-1));assert.equal(creatureCreated.type,'NPC');assert.equal(creatureCreated.folder,'folder1');assert.equal(creatureCreated.system.eh_npc.max,99);assert.ok(creatureCreated.flags['tagmar-personagens'].creatureVariant.sourceUuid);assert.equal(creatureCreated._id,undefined);
  assert.equal(await page.locator('[data-do=c-create]').count(),0);assert.equal(await page.evaluate(()=>creatureIndices),1);
  await act('[data-do=tab][data-type=Personagem]');assert.equal(await page.evaluate(()=>JSON.stringify(app.preview)),profileBefore);
  await act('[data-do=tab][data-type=Creature]');assert.equal(await page.evaluate(()=>app.creature.preview.actor.system.eh.max),99);
  await page.screenshot({path:path.join(output,'07-criatura-criada.png'),fullPage:true});
  const variantBefore=await page.evaluate(()=>JSON.stringify(app.creature.preview));
  await act('[data-do=tab][data-type=NewCreature]');
  assert.equal(await page.locator('.tg-tabs button').count(),4);
  assert.match(await page.locator('[data-type=Creature]').innerText(),/Variação de nível/);
  assert.equal(await page.locator('details[data-section="new:profile"]').evaluate(el=>el.open),false);
  assert.equal(await page.locator('.tg-book-primary').isVisible(),true);
  assert.equal(await page.locator('.tg-options').evaluate(el=>el.querySelector('.tg-book-primary').compareDocumentPosition(el.querySelector('[data-section="new:profile"]'))&Node.DOCUMENT_POSITION_FOLLOWING),4);
  await page.locator('details[data-section="new:profile"]>summary').click();
  await page.locator('[data-n-field=name]').fill('Sentinela de Sal');await page.locator('[data-n-field=name]').dispatchEvent('change');
  await page.locator('[data-n-field=stage]').fill('12');await page.locator('[data-n-field=stage]').dispatchEvent('change');
  await page.locator('[data-n-field=magic]').selectOption('yes');await page.locator('[data-n-field=size]').selectOption('large');
  await page.locator('[data-n-field=speedVb]').fill('40');await page.locator('[data-n-field=speedVb]').dispatchEvent('change');
  await page.locator('[data-n-field=variation]').setChecked(false);
  await act('[data-do=n-generate]');
  assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.system.vb),40);
  assert.equal(await page.locator('[data-n-field=speedKmh]').count(),0);
  assert.equal(await page.evaluate(()=>created.length),3);
  assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.system.estagio),12);
  assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.name),'Sentinela de Sal');
  assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.prototypeToken.width),2);
  await page.locator('[data-n-edit="attr:FOR"]').fill('8');await page.locator('[data-n-edit="attr:FOR"]').dispatchEvent('change');
  await page.waitForFunction(()=>app.newCreature.preview.actor.system.atributos.FOR===8);
  await act('[data-do=n-generate]');assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.system.atributos.FOR),8);
  await page.screenshot({path:path.join(output,'08-criar-do-zero.png'),fullPage:true});
  await page.locator('details[data-section="new:attacks"]>summary').click();
  await page.locator('[data-n-search=attacks]').fill('hálito');
  const attackOption=await page.locator('[data-n-add=attacks] option:not([hidden])').allTextContents();assert.ok(attackOption.length>2);
  await chooseItem('[data-n-add=attacks]','Hálito Flamejante · Criaturas');
  const attackKey=await page.locator('[data-n-add=attacks]').inputValue();
  await act('[data-do=n-add][data-section=attacks]');
  await page.locator(`[data-n-item="${attackKey}"][data-n-prop=damage]`).fill('40');await page.locator(`[data-n-item="${attackKey}"][data-n-prop=damage]`).dispatchEvent('change');
  await page.waitForFunction(key=>!app.busy&&app.newCreature.preview.actor.items.find(i=>i.flags['tagmar-personagens']?.source===key)?.system.dano_base.d100===40,attackKey);
  await act('[data-do=n-generate]');assert.equal(await page.evaluate(key=>app.newCreature.preview.actor.items.find(i=>i.flags['tagmar-personagens']?.source===key).system.dano_base.d100,attackKey),40);
  await page.locator('details[data-section="new:powers"]>summary').click();
  const powerKey=await page.locator('[data-n-add=powers] option').nth(1).getAttribute('value');await chooseItem('[data-n-add=powers]',await page.locator(`[data-n-add=powers] option[value="${powerKey}"]`).innerText());await act('[data-do=n-add][data-section=powers]');
  // Linhas de componentes: nome, total, campos e ações no mesmo eixo.
  for(const block of ['attacks','protection','techniques','powers','gear']){
   const section=page.locator(`details[data-section="new:${block}"]`);
   if(!await section.count())continue;
   if(!await section.evaluate(el=>el.open))await section.locator(':scope > summary').click();
   const rows=section.locator('.tg-new-item');
   for(const row of await rows.all()){
    const geometry=await row.evaluate(el=>{const box=el.getBoundingClientRect(),name=el.querySelector('.tg-component-name').getBoundingClientRect(),actions=el.querySelector('.tg-actions').getBoundingClientRect();return {height:box.height,centerDelta:Math.abs(name.top+name.height/2-actions.top-actions.height/2),fits:el.scrollWidth<=el.clientWidth+1};});
    assert.ok(geometry.height<80);assert.ok(geometry.centerDelta<2);assert.equal(geometry.fits,true);
   }
  }
  const powerRow=page.locator('.tg-new-item').filter({has:page.locator(`[data-n-item="${powerKey}"]`)}).first();
  const powerLevel=powerRow.locator('[data-n-prop=level]');
  await powerLevel.fill('6');await powerLevel.dispatchEvent('change');
  await page.waitForFunction(key=>!app.busy&&app.newCreature.preview.actor.items.find(i=>i.flags['tagmar-personagens']?.source===key)?.system.nivel===6,powerKey);
  assert.equal(await powerRow.locator('.tg-lock').getAttribute('class').then(s=>s.includes('locked')),true);
  await page.locator('details[data-section="new:powers"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'18-linhas-compactas.png'),fullPage:true});
  await page.locator('[data-n-field=folder]').selectOption('folder1');
  await page.screenshot({path:path.join(output,'09-componentes.png'),fullPage:true});
  await act('[data-do=n-create]');
  const newCreature=await page.evaluate(()=>created.at(-1));assert.equal(newCreature.type,'NPC');assert.equal(newCreature.name,'Sentinela de Sal');assert.equal(newCreature.folder,'folder1');assert.ok(newCreature.flags['tagmar-personagens'].newCreature.extraofficial);assert.equal(newCreature.flags['tagmar-personagens'].creatureVariant,undefined);
  await act('[data-do=tab][data-type=Creature]');assert.equal(await page.evaluate(()=>JSON.stringify(app.creature.preview)),variantBefore);
  await act('[data-do=tab][data-type=NewCreature]');assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.name),'Sentinela de Sal');
  // Escolhas antes da primeira prévia e controles independentes por bloco.
  await page.evaluate(async()=>{const {newCreatureState}=await import('/scripts/new-creature.mjs');app.newCreature=newCreatureState();await app.render();});
  assert.equal(await page.locator('[data-n-field=group] option').count(),19);
  // As cópias por profissão ficam ocultas na busca, sem apagar seus documentos.
  for(const [block,name]of [['techniques','Ambidestria'],['powers','Bola de Fogo']]){
   const section=page.locator(`details[data-section="new:${block}"]`);
   if(!await section.evaluate(el=>el.open))await section.locator(':scope > summary').click();
   const input=section.locator('[data-n-search]');await input.click();await input.fill(name);
   assert.equal(await section.locator('[role=option]').count(),1);
   assert.match(await section.locator('[role=option]').getAttribute('title'),/ocultas/);
   if(block==='techniques')await page.screenshot({path:path.join(output,'19-busca-sem-repeticoes.png'),fullPage:true});
   await input.press('Escape');
  }

  await page.locator('[data-n-field=group]').selectOption('RC');
  if(!await page.locator('details[data-section="new:attacks"]').evaluate(el=>el.open))await page.locator('details[data-section="new:attacks"]>summary').click();
  await chooseItem('[data-n-add=attacks]','Cimitarra');
  const chosenWeapon=await page.locator('[data-n-add=attacks]').inputValue();
  await act('[data-do=n-add][data-section=attacks]');assert.equal(await page.evaluate(()=>app.newCreature.preview),null);
  assert.ok(await page.locator('.tg-manual-picks').innerText().then(s=>s.includes('Cimitarra')));
  await page.locator('[data-n-plan=modes][data-n-block=attacks]').selectOption('chosen');
  await act('[data-do=n-generate]');
  assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.items.filter(i=>i.type==='Combate').length),1);
  assert.equal(await page.evaluate(k=>app.newCreature.preview.actor.items.some(i=>i.flags['tagmar-personagens'].source===k),chosenWeapon),true);
  assert.ok(await page.evaluate(()=>app.newCreature.preview.actor.items.some(i=>i.type==='Pertence')));
  await page.screenshot({path:path.join(output,'10-grupos-e-escolhas.png'),fullPage:true});
  await page.locator('[data-n-plan=modes][data-n-block=attacks]').selectOption('random');
  await page.locator('[data-n-plan=counts][data-n-block=attacks]').fill('3');await page.locator('[data-n-plan=counts][data-n-block=attacks]').dispatchEvent('change');
  await act('[data-do=n-generate]');assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.items.filter(i=>i.type==='Combate').length),3);
  await page.locator('[data-n-field=intelligence]').selectOption('beast');await page.locator('[data-n-field=magic]').selectOption('yes');await page.locator('[data-n-field=anatomy]').selectOption('quadruped');
  await act('[data-do=n-generate]');assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.system.atributos.INT),-7);assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.system.karma.max),0);
  // Livro 3.02: campos reais da interface e recálculo após editar atributos.
  assert.equal(await page.locator('.tg-book-primary').isVisible(),true);
  await page.locator('[data-n-field=weight]').fill('600');await page.locator('[data-n-field=weight]').dispatchEvent('change');
  await page.locator('[data-n-field=stage]').fill('12');await page.locator('[data-n-field=stage]').dispatchEvent('change');
  await page.locator('[data-n-field=combativeness]').selectOption('medium');await page.locator('[data-n-field=variation]').setChecked(false);
  await act('[data-do=n-generate]');
  await page.locator('[data-n-edit="attr:FIS"]').fill('2');await page.locator('[data-n-edit="attr:FIS"]').dispatchEvent('change');
  await page.waitForFunction(()=>app.newCreature.preview.actor.system.ef.max===50&&app.newCreature.preview.actor.system.eh.max===108);
  await page.locator('[data-n-field=corporeality]').selectOption('incorporeal');await act('[data-do=n-generate]');
  await page.locator('[data-n-edit="attr:AUR"]').fill('4');await page.locator('[data-n-edit="attr:AUR"]').dispatchEvent('change');
  await page.waitForFunction(()=>app.newCreature.preview.actor.system.eh.max===132);
  await page.locator('[data-n-edit=ef]').fill('999');await page.locator('[data-n-edit=ef]').dispatchEvent('change');
  await page.waitForFunction(()=>app.newCreature.preview.actor.system.ef.max===999);
  await page.locator('[data-n-edit="attr:FIS"]').fill('3');await page.locator('[data-n-edit="attr:FIS"]').dispatchEvent('change');
  await page.waitForFunction(()=>app.newCreature.preview.actor.system.atributos.FIS===3);
  assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.system.ef.max),999);
  const paneBefore=await page.evaluate(()=>{
   const options=app.element.querySelector('.tg-options'),preview=app.element.querySelector('.tg-preview');options.scrollTop=180;preview.scrollTop=140;
   const before=[options.scrollTop,preview.scrollTop];const field=app.element.querySelector('[data-n-field=organization]');field.value='solitary';field.dispatchEvent(new Event('change',{bubbles:true}));return before;
  });
  await page.waitForFunction(()=>app.newCreature.draft.organization==='solitary');
  assert.deepEqual(await page.evaluate(()=>[app.element.querySelector('.tg-options').scrollTop,app.element.querySelector('.tg-preview').scrollTop]),paneBefore);
  assert.equal(await page.locator('details[data-section="new:profile"]').evaluate(el=>el.open),true);
  await act('[data-do=n-generate]');
  assert.equal(await page.evaluate(()=>app.newCreature.preview.actor.system.ef.max),999);
  await page.evaluate(()=>{app.element.querySelector('.tg-options').scrollTop=0;app.element.querySelector('.tg-preview').scrollTop=0;});
  await page.screenshot({path:path.join(output,'11-regras-livro-302.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>created.length),4);
  const newOverflow=await page.locator('.tg-new-creature').evaluate(root=>[...root.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(el=>el.getBoundingClientRect().right>root.getBoundingClientRect().right+1).length);assert.equal(newOverflow,0);
  // Lista completa, agrupada como a ficha: treinar e zerar não apaga linhas.
  if(!await page.locator('details[data-section="new:skills"]').evaluate(el=>el.open))await page.locator('details[data-section="new:skills"]>summary').click();
  assert.equal(await page.locator('.tg-skill-group').count(),6);
  assert.equal(await page.locator('.tg-skill-table tbody tr').count(),42);
  await page.locator('[data-n-plan=modes][data-n-block=skills]').selectOption('none');await act('[data-do=n-generate]');
  assert.equal(await page.locator('.tg-skill-table tbody tr').count(),42);
  const skillKey=await page.locator('.tg-skill-table [data-n-item]').first().getAttribute('data-n-item');
  const skillInput=page.locator(`.tg-skill-table [data-n-item="${skillKey}"]`);
  await skillInput.fill('8');await skillInput.dispatchEvent('change');
  await page.waitForFunction(key=>!app.busy&&app.newCreature.preview.actor.items.find(i=>i.flags['tagmar-personagens']?.source===key)?.system.nivel===8,skillKey);
  assert.equal(await page.locator('[data-n-plan=modes][data-n-block=skills]').inputValue(),'chosen');
  await act('[data-do=n-generate]');assert.equal(await skillInput.inputValue(),'8');
  await act(`.tg-skill-table [data-do=n-remove][data-key="${skillKey}"]`);
  assert.equal(await skillInput.inputValue(),'0');assert.equal(await page.locator('.tg-skill-table tbody tr').count(),42);
  await page.locator('.tg-skill-grid').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.tg-skill-grid').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.screenshot({path:path.join(output,'12-habilidades-completas.png'),fullPage:true});
  // As duas primeiras abas expõem estágio 50 e entregam uma prévia válida.
  await act('[data-do=tab][data-type=Personagem]');await page.locator('[data-field=stage]').fill('50');await page.locator('[data-field=stage]').dispatchEvent('change');
  await act('[data-do=unlock]');await act('[data-do=generate]');
  assert.equal(await page.evaluate(()=>app.preview.actor.system.estagio),50);assert.equal(await page.evaluate(()=>app.preview.ehRolls.length),49);
  await page.screenshot({path:path.join(output,'13-personagem-estagio-50.png'),fullPage:true});
  // Todas as buscas de itens abrem no próprio campo, com teclado e rolagem.
  assert.equal(await page.locator('[data-item-picker]').count(),4);
  for(const picker of await page.locator('[data-item-picker]').all()){
   const section=picker.locator('xpath=ancestor::details[@data-section][1]');if(!await section.evaluate(el=>el.open))await section.locator(':scope > summary').click();
   const add=picker.locator('xpath=ancestor::details[contains(@class,"tg-add")][1]');if(!await add.evaluate(el=>el.open))await add.locator(':scope > summary').click();
   const input=picker.locator('input');await input.click();assert.equal(await input.getAttribute('aria-expanded'),'true');
   await input.fill('xyzzzz-sem-resultado');assert.equal(await picker.locator('.tg-item-options').innerText(),'Nenhum item encontrado.');
   await input.fill('');assert.equal(await picker.locator('[role=option]').evaluateAll(options=>new Set(options.map(o=>o.textContent)).size===options.length),true);await input.press('End');await input.press('Enter');assert.equal(await input.getAttribute('aria-expanded'),'false');
   const count=await picker.locator('select option').count();if(count>1){assert.notEqual(await picker.locator('select').inputValue(),'');}
   await input.click();await input.press('Escape');assert.equal(await input.getAttribute('aria-expanded'),'false');
  }
  const equipment=page.locator('[data-item-search=equipment]');await equipment.click();
  const list=equipment.locator('xpath=ancestor::*[@data-item-picker][1]').locator('[role=listbox]');
  assert.equal(await list.evaluate(el=>el.scrollHeight>el.clientHeight),true);await equipment.press('End');
  assert.equal(await list.evaluate(el=>el.scrollTop>0),true);
  await page.screenshot({path:path.join(output,'14-busca-com-lista-integrada.png'),fullPage:true});
  await equipment.press('Escape');

  await page.evaluate(()=>{game.user.isGM=false;});assert.equal(await page.evaluate(async()=>await module.openGenerator()===undefined),true);
  const controls=await page.evaluate(()=>{const c={};for(const fn of events.getSceneControlButtons??[])fn(c);return c;});assert.deepEqual(controls,{});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify({passed:true,worldActorsCreatedInMock:4,newCreatureTab:true,groupedSkillsAllFourTabs:true,directVb:true,compactComponents:true,uniquePickerChoices:true,creatureIndexLoads:1,creatureDocumentLoads:1,realWorldWrites:0,catalogLoads:2,errors,overflow,newOverflow},null,2));
  console.log('PASS: interface, filtros, travas, edição de níveis, criar Personagem/PNJ, permissão e ausência de gravação na prévia.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
