// Isolated integration fixture: actual module, engine, templates and Foundry CSS.
// Mocks only the Foundry application lifecycle, settings and users. No world modified.
// node tests/browser.cjs <Foundry resources/app> <runtime node_modules> <output dir>
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [foundryRoot,packages,output]=process.argv.slice(2),root=path.resolve(__dirname,'..');
const {chromium}=require(path.join(packages,'playwright'));
const template=fs.readFileSync(path.join(root,'templates/travel.hbs'),'utf8');
const compactTemplate=fs.readFileSync(path.join(root,'templates/compact.hbs'),'utf8');
const css=fs.readFileSync(path.join(root,'styles/travel.css'),'utf8');
const calendarCSS=fs.readFileSync(path.resolve(root,'../tagmar-calendario/styles/calendar.css'),'utf8');
const nativeCSS=fs.readFileSync(path.join(foundryRoot,'public/css/foundry2.css'),'utf8');
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{
      const url=new URL(route.request().url()),name=path.basename(url.pathname);
      if(['main.mjs','engine.mjs','map-model.mjs','map-library.mjs','map-ui.mjs','map-viewport.mjs','compact.mjs','compact-position.mjs','scene-map.mjs','clock.mjs'].includes(name))return route.fulfill({body:fs.readFileSync(path.join(root,'scripts',name)),contentType:'text/javascript'});
      if(url.pathname.startsWith('/fonts/')){
        const font=path.resolve(foundryRoot,'public','.'+url.pathname);
        if(font.startsWith(path.resolve(foundryRoot,'public','fonts')+path.sep)&&fs.existsSync(font))return route.fulfill({body:fs.readFileSync(font),contentType:name.endsWith('.woff2')?'font/woff2':name.endsWith('.css')?'text/css':'application/octet-stream'});
      }
      if(name==='test-map.webp')return route.fulfill({body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#303f34"/><path d="M0 100H800M0 200H800M0 300H800M200 0V400M400 0V400M600 0V400" stroke="#677b66"/><text x="320" y="60" fill="#ded7b6" font-size="24">Mapa de teste</text></svg>',contentType:'image/svg+xml'});
      if(name==='handlebars.js')return route.fulfill({body:fs.readFileSync(path.join(foundryRoot,'node_modules/handlebars/dist/handlebars.js')),contentType:'text/javascript'});
      if(url.pathname==='/')return route.fulfill({body:`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts/fontawesome/css/all.min.css"><style>${nativeCSS}\n${calendarCSS}\n${css}\nbody{background:#24323b;padding:20px}.application.tagmar-travel{position:relative;width:800px;height:740px;inset:auto}.tagmar-travel .window-content{height:100%;overflow:auto}</style></head><body class="theme-dark"><div id="reference-calendar" class="tagmar-calendar" style="left:-10000px;top:0"><div class="calendar-shell" style="--hud-scale:1.1666666666666667"><div class="hud-controls"><button class="hour-control">H+</button></div></div></div><script src="/handlebars.js"></script></body></html>`,contentType:'text/html'});
      return route.abort();
    });
    await page.goto('http://travel.test/');
    await page.evaluate(async ({template,compactTemplate})=>{
      window.compactTemplate=Handlebars.compile(compactTemplate);window.template=Handlebars.compile(template);window.instances=[];window.events={};window.settings={};window.notifications=[];window.writes=0;window.worldWrites=0;window.writeDelay=0;window.confirmResult=true;
      window.Hooks={once:(name,fn)=>(events[name]??=[]).push(fn),on:(name,fn)=>(events[name]??=[]).push(fn)};
      window.ui={notifications:{info:msg=>notifications.push(msg),warn:msg=>notifications.push(msg)}};
      window.gm={id:'gm1',name:'Mestre',active:true,isGM:true};window.other={id:'gm2',name:'Outro mestre',active:true,isGM:true};
      window.sceneFixture={id:'tagmar-scene',name:'Tagmar — mapa já calibrado',width:1600,height:800,grid:{size:100,distance:10,units:'km',type:0},firstLevel:{id:'level-1',background:{src:'test-map.webp'},textures:{fit:'fill',scaleX:1,scaleY:1}},levels:{contents:[]},view(){throw Error('Scene must not activate');},update(){throw Error('Scene must not change');}};
      window.sceneCollection=new Map([[sceneFixture.id,sceneFixture]]);sceneCollection.contents=[sceneFixture];
      window.game={user:gm,users:[gm,other],scenes:sceneCollection,modules:new Map([['tagmar-viagens',{}]]),settings:{
        register:(module,key,cfg)=>settings[key]={cfg,value:structuredClone(cfg.default)},registerMenu:(_m,_k,cfg)=>window.menu=cfg,
        get:(_module,key)=>structuredClone(settings[key].value),set:async(_module,key,value)=>{
          await new Promise(r=>setTimeout(r,writeDelay));settings[key].value=structuredClone(value);writes++;if(key==='state')worldWrites++;settings[key].cfg.onChange?.(structuredClone(value));
        }
      }};
      class Application {
        constructor(){this.position={...this.constructor.DEFAULT_OPTIONS.position};}
        async _prepareContext(){return {};}_canRender(){} _onRender(){}
        _onClose(){}
        setPosition(position){Object.assign(this.position,position);for(const key of ['left','top','width','height'])if(key in position)this.element.style[key]=typeof position[key]==='number'?position[key]+'px':position[key];return this.position;}
        async render(options={}){
          if(this._canRender()===false)return this;
          this.element??=document.body.appendChild(document.createElement('section'));if(!this.element.isConnected)document.body.appendChild(this.element);
          this.element.className='application tagmar-travel'+(this.constructor.name==='TravelCompact'?' tagmar-travel-compact':'');
          if(this.constructor.name==='TravelCompact'){this.element.style.width='330px';this.element.style.height='auto';}if(!instances.includes(this))instances.push(this);
          const context=await this._prepareContext(options);this.element.innerHTML=`<header class="window-header"><h1 class="window-title">${this.constructor.DEFAULT_OPTIONS.window.title}</h1></header><section class="window-content">${(this.constructor.name==='TravelCompact'?compactTemplateHTML:templateHTML)(context)}</section>`;
          this.rendered=true;
          this.element.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',event=>{
            this.lastAction=this.constructor.DEFAULT_OPTIONS.actions[button.dataset.action].call(this,event,button);
          }));this._onRender(context,options);return this;
        }
        async close(){this._onClose({});this.element?.remove();this.rendered=false;return this;}bringToFront(){}
      }
      window.templateHTML=window.template;window.compactTemplateHTML=window.compactTemplate;
      window.foundry={applications:{api:{ApplicationV2:Application,HandlebarsApplicationMixin:Base=>Base,DialogV2:{confirm:async options=>{window.lastConfirmation=options.content;return confirmResult;}}}}};
      window.module=await import('/main.mjs');window.engine=await import('/engine.mjs');
      for(const fn of events.init)fn();for(const fn of events.ready)fn();
      window.controls={};for(const fn of events.getSceneControlButtons)fn(controls);
      window.app=new module.TravelApp();await app.render();
    },{template,compactTemplate});
    const act=async(command,extra='')=>{
      if(command==='add'&&await page.evaluate(()=>app.view!=='plan')){await page.locator('[data-command="view"][data-value="plan"]').click();await page.evaluate(()=>app.lastAction);}
      if(command==='add'&&await page.locator('.tv-manual-route').count()&&!await page.locator('.tv-manual-route').evaluate(el=>el.open))await page.locator('.tv-manual-route>summary').click();
      await page.locator(`[data-command="${command}"]${extra}`).first().click();
      await page.evaluate(()=>app.lastAction);
    };
    const view=async name=>act('view',`[data-value="${name}"]`);
    const pickProfile=async id=>{await page.locator('[data-profile-picker]').selectOption(id);await page.evaluate(()=>app.lastAction);};
    const appScreenshot=async name=>{await page.evaluate(()=>app.element.querySelector('.window-content').scrollTop=0);await page.screenshot({path:path.join(output,name)});};
    assert.equal(await page.evaluate(()=>controls['tagmar-viagens'].icon),'fa-solid fa-route');
    assert.deepEqual(await page.evaluate(()=>settings.state.value),await page.evaluate(()=>({schema:1,revision:0,trips:[],profiles:engine.defaultProfiles()})),'Clean installation contains no campaign data and exactly four presets');
    assert.equal(await page.evaluate(()=>worldWrites),0,'Startup creates no journeys or world writes');
    assert.equal(await page.evaluate(()=>typeof crypto.randomUUID),'undefined','HTTP LAN fallback exercised');
    assert.deepEqual(await page.locator('.tv-tabs[aria-label="Etapas da viagem"] button').allTextContents(),['Mapa','Planejamento','Acompanhar','Criar transportes']);
    await act('new');assert.equal(await page.evaluate(()=>app.view),'map','New trips start on the map');
    assert.equal(await page.locator('[name="trip.name"]').isVisible(),true,'Name belongs to the Map tab');
    await page.locator('[name="trip.name"]').fill('Caminho de Calco');await act('saveName');
    assert.equal(await page.evaluate(()=>settings.state.value.trips[0].name),'Caminho de Calco');
    await view('track');assert.equal(await page.locator('[data-command="advance"]').first().isDisabled(),true);
    await view('plan');
    assert.equal(await page.locator('[name="trip.name"]').count(),0,'Planning does not duplicate the name editor');
    assert.equal(await page.locator('.tv-manual-route').evaluate(el=>el.open),false,'Manual distance starts collapsed');
    await page.locator('.tv-manual-route>summary').click();
    await page.locator('[name="addDistance"]').fill('123.5');await act('add');
    assert.equal(await page.evaluate(()=>settings.state.value.trips[0].segments[0].distance),123.5);
    assert.equal(await page.locator('.tv-segment-options[open]').count(),0);
    assert.equal(await page.locator('.tv-segment-basics input').first().isVisible(),true);
    await page.locator('.tv-segment-basics input').first().fill('200');
    const helpWrites=await page.evaluate(()=>writes);
    await act('help','[data-value="distance"]');
    assert.match(await page.locator('.tv-help-dialog p').innerText(),/quilômetros/);
    await page.screenshot({path:path.join(output,'travel-help.png')});await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>app.dirty),true);assert.equal(await page.evaluate(()=>writes),helpWrites);
    await view('track');assert.match(await page.evaluate(()=>notifications.at(-1)),/Salve/);
    await act('save');assert.equal(await page.evaluate(()=>settings.state.value.trips[0].segments[0].distance),200);
    assert.equal(await page.evaluate(()=>settings.state.value.trips[0].name),'Caminho de Calco','Saving plan preserves the Map name');
    assert.equal(await page.locator('.tv-segment-timing strong').first().innerText(),'5d 1h 40min','Leg estimate includes daily rest');
    // Completed/started legs preserve prior distance; conditions offer presets or custom values.
    await page.locator('.tv-segment-options>summary').click();
    await page.locator('.tv-conditions>summary').click();
    await page.locator('[data-factor-choice][aria-label="Caminho"]').selectOption('0.65');
    await act('save');assert.equal(await page.evaluate(()=>settings.state.value.trips[0].segments[0].difficulty),.65);
    assert.equal(await page.locator('.tv-segment-options[open]').count(),1);
    await page.locator('[data-factor-choice][aria-label="Caminho"]').selectOption('custom');
    await page.locator('[data-factor-value][name$="difficulty"]').fill('.7');await act('save');
    assert.equal(await page.evaluate(()=>settings.state.value.trips[0].segments[0].difficulty),.7);
    assert.equal(await page.locator('[data-factor-choice][aria-label="Caminho"]').inputValue(),'custom');
    await page.locator('.tv-more>summary').click();await act('delete');await act('example');
    assert.match(await page.locator('.tv-summary').innerText(),/6\.250/);
    await view('map');await page.locator('[name="trip.name"]').fill('<img src=x onerror=alert(1)>');await act('saveName');
    assert.equal(await page.locator('img').count(),0);
    await page.locator('[name="trip.name"]').fill('Expedição de Calco');await act('saveName');await view('plan');
    await page.evaluate(()=>app.element.querySelector('.window-content').scrollTop=0);
    await page.screenshot({path:path.join(output,'travel-planner.png')});
    await view('track');await page.locator('[name="advanceHours"]').fill('12');await act('advance',':not([data-value])');
    assert.equal(await page.evaluate(()=>settings.state.value.trips[0].elapsed),12);
    assert.match(await page.locator('.tv-stage').innerText(),/Descanso/);
    await page.screenshot({path:path.join(output,'travel-tracking.png')});
    await act('pause');assert.equal(await page.locator('[data-command="advance"]').first().isDisabled(),true);
    await act('pause');await act('undo');assert.equal(await page.evaluate(()=>settings.state.value.trips[0].paused),true);
    await act('undo');await act('undo');assert.equal(await page.evaluate(()=>settings.state.value.trips[0].elapsed),0);
    await view('profiles');await pickProfile('default-ship');
    await page.locator('[name="profile.base"]').fill('12');await act('saveProfile');
    assert.equal(await page.evaluate(()=>settings.state.value.trips[0].segments[2].base),8);
    await act('help','[data-value="work"]');assert.match(await page.locator('.tv-help-dialog p').innerText(),/16 h/);await act('closeHelp');
    await page.screenshot({path:path.join(output,'travel-profile.png')});
    await view('map');await page.locator('[name="trip.name"]').fill('Stale');
    await page.evaluate(()=>settings.state.value.revision++);await act('saveName');
    assert.match(await page.evaluate(()=>notifications.at(-1)),/desatualizada/);await act('reload');
    await view('track');await page.evaluate(async()=>{writeDelay=50;await Promise.all([app.run('advance',null,'1'),app.run('advance',null,'1')]);writeDelay=0;});
    assert.equal(await page.evaluate(()=>settings.state.value.trips[0].elapsed),1);
    await view('plan');await page.locator('.tv-more>summary').click();await act('duplicate');
    assert.equal(await page.evaluate(()=>settings.state.value.trips[1].elapsed),0);
    // Dirty route switching must neither overwrite the state nor display the wrong selected trip.
    await view('map');await page.locator('[name="trip.name"]').fill('Pending');
    const original=await page.evaluate(()=>app.selected),different=await page.evaluate(()=>settings.state.value.trips[0].id);
    await page.locator('[data-route-picker]').selectOption(different);await page.evaluate(()=>app.lastAction);
    assert.equal(await page.evaluate(()=>app.selected),original);assert.equal(await page.locator('[data-route-picker]').inputValue(),original);
    await act('reload');
    const count=await page.evaluate(()=>writes);
    await page.evaluate(async()=>{game.user=other;await app.run('new');await app.render();});
    assert.equal(await page.locator('[data-command="saveName"]').isDisabled(),true);
    assert.equal(await page.evaluate(()=>writes),count);
    await page.evaluate(async()=>{game.user={id:'p1',isGM:false};window.playerControls={};for(const fn of events.getSceneControlButtons)fn(playerControls);await app.run('new');});
    assert.equal(await page.evaluate(()=>Object.keys(playerControls).length),0);assert.equal(await page.evaluate(()=>writes),count);
    await page.evaluate(async()=>{game.user=gm;window.beforeReopen=structuredClone(settings.state.value);await app.close();app=new module.TravelApp();await app.render();});
    assert.deepEqual(await page.evaluate(()=>settings.state.value),await page.evaluate(()=>beforeReopen),'Schema 1 journeys/profile/progress/history remain intact');
    // Library: named independent profiles and non-destructive deletion.
    await view('profiles');
    assert.equal(await page.locator('.tv-library-list,.tv-subtabs').count(),0,'No category tabs or transport tiles');
    assert.deepEqual(await page.locator('[data-profile-picker] option').evaluateAll(els=>els.map(e=>e.value)),['default-foot','default-mount','default-cart','default-ship'],'All four existing presets share one list');
    const profilesBeforeDraft=await page.evaluate(()=>JSON.stringify(settings.state.value.profiles));
    const writesBeforeDraft=await page.evaluate(()=>worldWrites);
    await act('newProfile');assert.equal(await page.locator('[data-command="newProfile"]').isDisabled(),true);
    assert.equal(await page.locator('[data-command="deleteProfile"]').isDisabled(),true);
    for(const [type,size,animals]of [['ship',true,false],['cart',true,true],['mount',false,true],['foot',false,false]]){
      await page.locator('[name="profile.type"]').selectOption(type);
      assert.equal(await page.locator('[data-profile-size]').isVisible(),size);
      assert.equal(await page.locator('[data-profile-animals]').isVisible(),animals);
    }
    await page.locator('[name="profile.name"]').fill('Ainda não salvo');
    await page.locator('[name="profile.base"]').fill('-1');await act('saveProfile');
    assert.equal(await page.evaluate(()=>JSON.stringify(settings.state.value.profiles)),profilesBeforeDraft,'Invalid or unsaved creation adds no library records');
    assert.equal(await page.evaluate(()=>worldWrites),writesBeforeDraft);
    await act('cancelProfile');assert.equal(await page.evaluate(()=>app.dirty),false);
    assert.equal(await page.evaluate(()=>JSON.stringify(settings.state.value.profiles)),profilesBeforeDraft);
    await pickProfile('default-ship');assert.equal(await page.locator('[name="profile.base"]').inputValue(),'12','Dropdown loads stored attributes');
    await page.locator('[name="profile.name"]').fill('Alteração pendente');await pickProfile('default-foot');
    assert.equal(await page.locator('[data-profile-picker]').inputValue(),'default-ship','Unsaved edit keeps selection consistent');
    assert.equal(await page.locator('[name="profile.name"]').inputValue(),'Alteração pendente');await act('reload');
    await page.evaluate(()=>confirmResult=false);await act('deleteProfile');
    assert.equal(await page.evaluate(()=>JSON.stringify(settings.state.value.profiles)),profilesBeforeDraft,'Cancel delete preserves selected transport');
    await page.evaluate(()=>confirmResult=true);
    await view('profiles');await pickProfile('default-mount');await act('newProfile');
    await page.locator('[name="profile.type"]').selectOption('mount');await page.locator('[name="profile.name"]').fill('Cavalos leves');await act('saveProfile');
    await appScreenshot('travel-transport-dropdown.png');
    const customProfile=await page.evaluate(()=>app.profileId);await act('copyProfile');await act('saveProfile');
    assert.equal(await page.evaluate(()=>settings.state.value.profiles.filter(p=>p.type==='mount').length),3);
    await act('deleteProfile');assert.equal(await page.evaluate(id=>settings.state.value.profiles.some(p=>p.id===id),customProfile),true);
    // Create a separate itinerary using actual map clicks and natural-image coordinates.
    await act('new');await view('map');
    await act('mapAdd');await page.locator('.tv-map-file-options>summary').click();
    await page.locator('[name="mapSrc"]').fill('test-map.webp');await act('mapLoad');
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).map.width),800);
    await act('mapScale');
    const mapClick=async(x,y)=>{
      const coords=await page.locator('[data-map-host] svg').evaluate((svg,p)=>{const q=new DOMPoint(p.x,p.y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},{x,y});
      await page.mouse.click(coords.x,coords.y);
    };
    await page.locator('[data-map-host]').scrollIntoViewIfNeeded();
    await mapClick(100,100);await mapClick(300,100);
    await page.locator('[name="calibrationKm"]').fill('100');await act('mapSave');
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).map.kmPerPixel),.5);
    await page.locator('[name="mapProfile"]').selectOption(customProfile);await act('mapDraw');
    await page.locator('[data-map-host]').scrollIntoViewIfNeeded();await mapClick(100,100);await mapClick(300,100);await act('mapSave');
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).segments[0].distance),100);
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).segments[0].name),'Cavalos leves');
    await page.locator('[name="mapProfile"]').selectOption('default-ship');await act('mapDraw');
    assert.equal(await page.evaluate(()=>app.mapDraft.points.length),1,'Next leg continues at prior endpoint');
    await page.locator('[data-map-host]').scrollIntoViewIfNeeded();await mapClick(500,100);await act('mapSave');
    assert.ok(Math.abs(await page.evaluate(()=>engine.totals(settings.state.value.trips.at(-1)).distance)-200)<1e-6);
    assert.equal(await page.locator('polyline[role="button"]').count(),2);
    await page.evaluate(()=>app.element.querySelector('.window-content').scrollTop=0);
    await page.screenshot({path:path.join(output,'travel-map.png')});
    // Drag a vertex and save: changing zoom does not change the stored distance.
    await act('mapEdit');await act('mapZoom','[data-value="0.5"]');
    await page.locator('[data-map-host]').scrollIntoViewIfNeeded();
    const drag=await page.locator('[data-map-host] svg').evaluate(svg=>{const m=svg.getScreenCTM();const a=new DOMPoint(300,100).matrixTransform(m),b=new DOMPoint(330,130).matrixTransform(m);return {a:{x:a.x,y:a.y},b:{x:b.x,y:b.y}};});
    await page.mouse.move(drag.a.x,drag.a.y);await page.mouse.down();await page.mouse.move(drag.b.x,drag.b.y,{steps:4});await page.mouse.up();
    const draftBefore=await page.evaluate(()=>structuredClone(app.mapDraft.points));
    assert.ok(Math.abs(draftBefore[1].x-330)<.01,'Dragging changes canonical image coordinates');
    await act('mapSave');assert.deepEqual(await page.evaluate(()=>settings.state.value.trips.at(-1).segments[0].path),draftBefore);
    await view('track');await act('compact');
    const mini=page.locator('.tagmar-travel-compact');assert.equal(await mini.count(),1);
    await mini.locator('[data-command="advance"][data-value="1"]').click();
    await page.evaluate(()=>new Promise(r=>setTimeout(r,100)));
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),1);
    await mini.locator('[data-command="pause"]').click();await page.evaluate(()=>new Promise(r=>setTimeout(r,100)));
    assert.equal(await mini.locator('[data-command="advance"]').first().isDisabled(),true);
    await mini.screenshot({path:path.join(output,'travel-compact.png')});
    await page.evaluate(async()=>{await instances.find(i=>i.constructor.name==='TravelCompact').close();await app.render();});
    assert.equal(await page.evaluate(()=>settings.compactTrip.value),'');
    await view('map');assert.equal(await page.locator('[data-command="mapEdit"]').first().isDisabled(),true);await page.evaluate(()=>app.run('mapEdit',settings.state.value.trips.at(-1).segments[0].id));assert.match(await page.evaluate(()=>notifications.at(-1)),/Duplique/);
    await view('profiles');await pickProfile(customProfile);await act('deleteProfile');
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).segments[0].name),'Cavalos leves','Deleting a transport preserves itinerary snapshot');
    // Regression: an advanced legacy trip without a map still exposes the initial map chooser.
    await act('new');await page.evaluate(()=>{delete settings.state.value.trips.at(-1).map;});await act('add');await view('track');await act('advance',':not([data-value])');
    const prior=await page.evaluate(()=>structuredClone(settings.state.value.trips.at(-1)));
    await view('map');await act('mapAdd');assert.equal(await page.locator('[name="mapSceneId"]').isVisible(),true);
    await page.screenshot({path:path.join(output,'travel-started-chooser.png')});
    await act('mapScene');
    const attached=await page.evaluate(()=>settings.state.value.trips.at(-1));
    assert.equal(attached.map.kmPerPixel,.2);assert.deepEqual(attached.progress,prior.progress);assert.deepEqual(attached.segments,prior.segments);assert.equal(attached.elapsed,prior.elapsed);
    await page.screenshot({path:path.join(output,'travel-scene-attached.png')});
    await act('duplicate');await act('mapDraw');
    await page.locator('[data-map-host]').scrollIntoViewIfNeeded();await mapClick(100,100);await mapClick(200,100);await act('mapSave');
    assert.ok(Math.abs(await page.evaluate(()=>settings.state.value.trips.at(-1).segments.at(-1).distance)-20)<.3,'Scene distance within one screen pixel of ideal click coordinates');
    // Bidirectional shared-clock integration, using the real hooks/actions and simulated world time.
    await page.evaluate(()=>{
      window.pendingClock=[];window.epochOffset=0;
      game.time={worldTime:0,advance:async(delta)=>{game.time.worldTime+=delta;for(const fn of events.updateWorldTime??[])pendingClock.push(Promise.resolve(fn(game.time.worldTime,delta,{},game.user.id)));return game.time.worldTime;}};
      game.modules.set('tagmar-calendario',{active:true,api:{getDate:()=>{const day=Math.floor(game.time.worldTime/86400)+epochOffset;return {year:1500+Math.floor(day/361),dayOfYear:((day%361)+361)%361};}}});
      window.drainClock=async()=>{for(let i=0;i<3;i++){await Promise.all(pendingClock.splice(0));await new Promise(r=>setTimeout(r,0));}};
    });
    await act('new');await act('add');await view('track');await act('linkClock');
    const untouched=await page.evaluate(()=>JSON.stringify(settings.state.value.trips[0]));
    await page.evaluate(async()=>{await game.time.advance(3600);await drainClock();});
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),1);
    await act('advance',':not([data-value])');assert.equal(await page.evaluate(()=>game.time.worldTime),7200);
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),2,'Own time update is not counted twice');
    await act('advance','[data-value="-1"]');assert.equal(await page.evaluate(()=>game.time.worldTime),3600);
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),1);
    await act('pause');await page.evaluate(async()=>{await game.time.advance(3600);await drainClock();});
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),1,'Calendar runs while movement is stopped');
    await act('pause');await act('advance',':not([data-value])');assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),2);
    await act('compact');const syncedMini=page.locator('.tagmar-travel-compact');
    await syncedMini.locator('[data-command="advance"][data-value="-1"]').click();await page.evaluate(()=>drainClock());
    assert.equal(await page.evaluate(()=>game.time.worldTime),7200);assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),1);
    await syncedMini.locator('[data-command="advance"][data-value="1"]').click();await page.evaluate(()=>drainClock());
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),2);
    assert.equal(await page.evaluate(()=>JSON.stringify(settings.state.value.trips[0])),untouched);
    const beforeDay=await page.evaluate(()=>game.time.worldTime);
    await syncedMini.locator('[data-command="advance"][data-value="24"]').click();await page.evaluate(()=>drainClock());
    assert.equal(await page.evaluate(()=>game.time.worldTime),beforeDay+86400);
    await syncedMini.locator('[data-command="advance"][data-value="-24"]').click();await page.evaluate(()=>drainClock());
    assert.equal(await page.evaluate(()=>game.time.worldTime),beforeDay);assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),2);

    await appScreenshot('travel-clock-tracking.png');
    await syncedMini.screenshot({path:path.join(output,'travel-clock-compact.png')});
    // Renaming a running itinerary changes only its name, never clock/progress/history.
    await syncedMini.evaluate(el=>el.style.pointerEvents='none'); // Fixture windows overlap.
    await view('map');
    const beforeRename=await page.evaluate(()=>({trip:structuredClone(settings.state.value.trips.at(-1)),link:structuredClone(settings.state.value.clockLink),time:game.time.worldTime}));
    await page.locator('[name="trip.name"]').fill('Jornada renomeada');await act('saveName');
    assert.deepEqual(await page.evaluate(()=>settings.state.value.trips.at(-1)),{...beforeRename.trip,name:'Jornada renomeada'});
    assert.deepEqual(await page.evaluate(()=>settings.state.value.clockLink),beforeRename.link);
    assert.equal(await page.evaluate(()=>game.time.worldTime),beforeRename.time);
    assert.match(await syncedMini.innerText(),/Jornada renomeada/);
    await view('track');
    await syncedMini.evaluate(el=>el.style.pointerEvents='');
    // Calendar-style HUD: portable client position, icon header, live refresh during a drag.
    assert.equal(await syncedMini.locator('.window-header').isVisible(),false);
    assert.equal(await syncedMini.locator('.tv-mini-header [data-command="unlinkClock"]').isVisible(),true);
    assert.equal(await syncedMini.locator('.tv-mini-header [data-command="open"]').isVisible(),true);
    assert.equal(await syncedMini.locator('.tv-mini-controls [data-command="open"]').count(),0);
    assert.equal(await syncedMini.locator('.tv-mini-header [data-command="advance"]').count(),4);
    assert.equal(await syncedMini.locator('.tv-mini [data-command="advance"]').count(),0);
    const inlineRows=await syncedMini.evaluate(el=>['.tv-mini-phase','.tv-mini-distance'].map(selector=>{
      const [a,b]=el.querySelector(selector).children;
      return {first:a.getBoundingClientRect().top,second:b.getBoundingClientRect().top};
    }));
    assert.ok(inlineRows.every(row=>Math.abs(row.first-row.second)<4),'Phase/leg and distance/remaining share a row');
    assert.ok(await syncedMini.evaluate(el=>el.querySelector('.tv-mini-eta').getBoundingClientRect().top<el.querySelector('.tv-mini-clock').getBoundingClientRect().top),'Arrival appears before current date');
    assert.equal(await syncedMini.evaluate(el=>{const header=el.querySelector('.tv-mini-header');return header.scrollWidth<=header.clientWidth+1;}),true,'Header fits with clock and time shortcuts');

    assert.deepEqual(await syncedMini.locator('[data-command="advance"]').allTextContents(),['D−','H−','H+','D+']);
    const buttons=await syncedMini.locator('[data-command="advance"]').evaluateAll(els=>els.map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top})));
    const calendarButton=await page.locator('#reference-calendar .hour-control').boundingBox();
    assert.ok(buttons.every(b=>Math.abs(b.width-calendarButton.width)<.1&&Math.abs(b.height-calendarButton.height)<.1&&Math.abs(b.top-buttons[0].top)<.1),'Time controls match the actual scaled calendar: '+JSON.stringify({buttons,calendarButton}));
    await page.evaluate(async()=>{settings.state.value.trips.at(-1).name='Viagem para uma cidade de nome muito comprido';await instances.filter(i=>i.constructor.name==='TravelCompact').at(-1).render();});
    assert.match(await syncedMini.locator('.tv-mini-name').innerText(),/nome muito comprido/);
    const beforeMove=await page.evaluate(()=>({state:JSON.stringify(settings.state.value),time:game.time.worldTime}));
    const cross=await syncedMini.locator('.tv-mini-drag').boundingBox();
    await page.mouse.move(cross.x+cross.width/2,cross.y+cross.height/2);await page.mouse.down();
    await page.mouse.move(560,470,{steps:5});
    await page.evaluate(async()=>{const hud=instances.filter(i=>i.constructor.name==='TravelCompact').at(-1);window.capturedHudElement=hud.element;await hud.render({force:true});});
    assert.equal(await page.evaluate(()=>capturedHudElement===instances.filter(i=>i.constructor.name==='TravelCompact').at(-1).element),true,'Refresh waits until the captured drag ends');
    await page.mouse.up();
    await page.waitForFunction(()=>settings.compactPosition.value.left>300);
    let savedHudPosition=await page.evaluate(()=>structuredClone(settings.compactPosition.value));
    assert.deepEqual(await page.evaluate(()=>({state:JSON.stringify(settings.state.value),time:game.time.worldTime})),beforeMove,'Dragging writes client geometry only');
    await page.evaluate(async()=>{const hud=instances.filter(i=>i.constructor.name==='TravelCompact').at(-1);await hud.render();await hud.render();});
    const movedRect=await syncedMini.boundingBox();assert.equal(Math.round(movedRect.x),savedHudPosition.left);assert.equal(Math.round(movedRect.y),savedHudPosition.top);
    const sizeHandle=await syncedMini.locator('.tv-mini-resize').boundingBox();
    await page.mouse.move(sizeHandle.x+sizeHandle.width/2,sizeHandle.y+sizeHandle.height/2);await page.mouse.down();
    await page.mouse.move(sizeHandle.x+sizeHandle.width/2+80,sizeHandle.y+sizeHandle.height/2+40,{steps:5});
    await page.evaluate(async()=>{const hud=instances.find(i=>i.constructor.name==='TravelCompact'&&i.rendered);window.resizingElement=hud.element;await hud.render({force:true});});
    assert.equal(await page.evaluate(()=>resizingElement===instances.find(i=>i.constructor.name==='TravelCompact'&&i.rendered).element),true,'Clock refresh waits for resize to finish');
    await page.mouse.up();await page.waitForFunction(()=>settings.compactPosition.value.width>490);
    savedHudPosition=await page.evaluate(()=>structuredClone(settings.compactPosition.value));
    const enlargedRect=await syncedMini.boundingBox();assert.ok(enlargedRect.width>movedRect.width+70);
    assert.deepEqual(await page.evaluate(()=>({state:JSON.stringify(settings.state.value),time:game.time.worldTime})),beforeMove,'Resizing only changes client presentation preferences');
    await syncedMini.screenshot({path:path.join(output,'travel-calendar-style.png')});
    await syncedMini.locator('[data-command="close"]').click();await page.waitForFunction(()=>settings.compactTrip.value==='');
    assert.equal(await page.locator('.tagmar-travel-compact').count(),0);
    await page.evaluate(async()=>{const prior=instances.filter(i=>i.constructor.name==='TravelCompact').at(-1);window.reopenedHud=new prior.constructor();reopenedHud.selected=prior.selected;await reopenedHud.render();});
    const reopenedRect=await page.locator('.tagmar-travel-compact').boundingBox();
    assert.equal(Math.round(reopenedRect.x),savedHudPosition.left);assert.equal(Math.round(reopenedRect.y),savedHudPosition.top,'A new app instance restores the persisted setting');
    assert.ok(Math.abs(reopenedRect.width-savedHudPosition.width)<1,'A new app instance restores the preferred size');
    await page.setViewportSize({width:500,height:400});
    const fittedHud=await page.locator('.tagmar-travel-compact').boundingBox();
    assert.ok(fittedHud.x>=0&&fittedHud.y>=0&&fittedHud.x+fittedHud.width<=501&&fittedHud.y+fittedHud.height<=401,'Viewport shrink keeps header and controls reachable');
    assert.deepEqual(await page.evaluate(()=>settings.compactPosition.value),savedHudPosition,'Temporary screen fitting does not overwrite the saved position');
    await page.setViewportSize({width:1200,height:1000});await page.evaluate(()=>reopenedHud.close());await act('compact');
    // Editing a calendar date changes its day offset as well as the time of day.
    await page.evaluate(async()=>{epochOffset=30;for(const fn of events.updateSetting??[])pendingClock.push(Promise.resolve(fn({key:'tagmar-calendario.epochOffset'})));await drainClock();});
    assert.equal(await page.evaluate(()=>engine.currentStage(settings.state.value.trips.at(-1)).finished),true);
    await page.evaluate(async()=>{epochOffset=0;for(const fn of events.updateSetting??[])pendingClock.push(Promise.resolve(fn({key:'tagmar-calendario.epochOffset'})));await drainClock();});
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),2);
    // Live ticks project the UI immediately while batching durable writes (15 game seconds).
    const writesBeforeTicks=await page.evaluate(()=>worldWrites);
    await page.evaluate(async()=>{for(let i=0;i<5;i++){await game.time.advance(1);await drainClock();}});
    assert.equal(await page.evaluate(()=>worldWrites),writesBeforeTicks);
    await page.evaluate(async()=>{await game.time.advance(10);await drainClock();});
    assert.equal(await page.evaluate(()=>worldWrites),writesBeforeTicks+1);
    assert.ok(Math.abs(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed)-(2+15/3600))<1e-6);
    await page.evaluate(async()=>{await game.time.advance(-1);await drainClock();});assert.equal(await page.evaluate(()=>worldWrites),writesBeforeTicks+2,'Even a one-second rewind is persisted immediately');
    // Explicit unlink makes subsequent calendar movements independent again.
    await syncedMini.locator('[data-command="unlinkClock"]').click();await page.evaluate(()=>new Promise(r=>setTimeout(r,50)));
    const detached=await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed);
    await page.evaluate(async()=>{await game.time.advance(3600);await drainClock();});
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).elapsed),detached);
    await page.evaluate(async()=>{for(const hud of instances.filter(i=>i.constructor.name==='TravelCompact'&&i.rendered))await hud.close();});
    await page.evaluate(()=>app.element.style.width='480px');await page.setViewportSize({width:540,height:900});
    await page.screenshot({path:path.join(output,'travel-narrow.png')});
    for(const tab of ['plan','map','track','profiles']){
      await view(tab);assert.equal(await page.evaluate(()=>app.element.querySelector('.window-content').scrollWidth<=app.element.querySelector('.window-content').clientWidth+1),true,tab+' no horizontal overflow');
    }
    // Regression: calendar playback must not replace an open native scene select.
    await page.setViewportSize({width:1200,height:1000});await page.evaluate(()=>app.element.style.width='800px');
    await act('new');await act('add');await view('track');await act('linkClock');
    await page.locator('[name="advanceHours"]').fill('3');
    await page.evaluate(async()=>{window.focusedHours=app.element.querySelector('[name="advanceHours"]');await game.time.advance(1);await drainClock();});
    assert.equal(await page.evaluate(()=>focusedHours===app.element.querySelector('[name="advanceHours"]')),true);
    assert.equal(await page.locator('[name="advanceHours"]').inputValue(),'3');
    await act('new');await view('map');
    await page.evaluate(async()=>{sceneCollection.set('alternate-scene',{...sceneFixture,id:'alternate-scene',name:'Outro mapa para escolher'});sceneCollection.contents=[...sceneCollection.values()];await app.render();});
    if(!await page.locator('.tv-map-creator').isVisible())await act('mapAdd');
    const picker=page.locator('[name="mapSceneId"]');await picker.selectOption('alternate-scene');await picker.focus();
    await page.evaluate(async()=>{window.openScenePicker=app.element.querySelector('[name="mapSceneId"]');await game.time.advance(20);await drainClock();});
    assert.equal(await page.evaluate(()=>openScenePicker===app.element.querySelector('[name="mapSceneId"]')),true,'Calendar ticks keep the actual native select element intact');
    assert.equal(await picker.inputValue(),'alternate-scene');
    assert.equal(await page.evaluate(()=>document.activeElement===openScenePicker),true);
    // Remote clock-only writes follow the same lightweight refresh path.
    await page.evaluate(async()=>{settings.state.cfg.onChange(structuredClone(settings.state.value));await drainClock();});
    assert.equal(await page.evaluate(()=>openScenePicker===app.element.querySelector('[name="mapSceneId"]')),true);
    await act('mapScene');await act('mapZoom','[data-value="0.5"]');await act('mapZoom','[data-value="0.5"]');
    await page.evaluate(()=>{const host=app.element.querySelector('[data-map-host]');host.scrollLeft=250;host.scrollTop=200;app.element.querySelector('.window-content').scrollTop=160;});
    const mapViewport=()=>page.evaluate(async()=>{const v=await import('/map-viewport.mjs');return v.captureMapView(app.element);});
    let sourceView=await mapViewport();assert.equal(sourceView.zoom,2);
    const sameMapCenter=async label=>{const current=await mapViewport();assert.ok(Math.abs(current.centerX-sourceView.centerX)<1&&Math.abs(current.centerY-sourceView.centerY)<1,label);};
    for(const command of ['mapScale','mapBack','mapCancel','mapDraw','mapCancel']){
      await page.evaluate(command=>app.run(command),command);await sameMapCenter(command+' preserves map position');
    }
    await page.locator('[name="mapProfile"]').selectOption('default-ship');
    await page.evaluate(()=>app.render({force:true}));assert.equal(await page.locator('[name="mapProfile"]').inputValue(),'default-ship');await sameMapCenter('Re-render preserves map viewport');
    await page.evaluate(async()=>{await app.run('mapDraw');app.mapDraft.points=[{x:200,y:200},{x:350,y:250}];await app.run('mapSave');});
    await sameMapCenter('Saving the route preserves map viewport');
    const savedLeg=await page.evaluate(()=>settings.state.value.trips.at(-1).segments.at(-1).id);
    await page.evaluate(id=>app.run('mapEdit',id),savedLeg);await sameMapCenter('Editing an existing route preserves viewport');
    await page.evaluate(()=>app.run('mapBack'));await sameMapCenter('Removing an edit point preserves viewport');
    await page.evaluate(()=>app.run('mapCancel'));await sameMapCenter('Canceling an edit preserves viewport');
    await page.evaluate(()=>app.run('mapZoom',null,'0.5'));await sameMapCenter('Zooming keeps the same image point centered');
    await page.evaluate(()=>app.run('mapZoom',null,'-0.5'));await sameMapCenter('Zooming back preserves center');
    // Real mouse wheel: the image point under the pointer stays fixed while editing.
    await page.evaluate(id=>app.run('mapEdit',id),savedLeg);
    await page.locator('[data-map-host]').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('[data-route-pin]').first().evaluate(el=>Number(el.getAttribute('r'))<Number(el.previousElementSibling.getAttribute('r'))/2),'Smaller visible pins retain the original drag hit area');
    const anchor=await page.evaluate(()=>{
      const host=app.element.querySelector('[data-map-host]'),svg=host.querySelector('svg'),rect=host.getBoundingClientRect();
      const x=rect.left+host.clientLeft+host.clientWidth*.65,y=rect.top+host.clientTop+host.clientHeight*.35;
      const p=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM().inverse());
      window.wheelSvg=svg;window.wheelElement=app.element;
      return {x,y,imageX:p.x,imageY:p.y,zoom:app.zoom,points:structuredClone(app.mapDraft.points),windowTop:app.element.querySelector('.window-content').scrollTop};
    });
    await page.mouse.move(anchor.x,anchor.y);await page.mouse.wheel(0,-120);
    await page.waitForFunction(zoom=>app.zoom>zoom,anchor.zoom);
    const afterWheel=await page.evaluate(({x,y})=>{const p=new DOMPoint(x,y).matrixTransform(wheelSvg.getScreenCTM().inverse());return {x:p.x,y:p.y,sameSvg:wheelSvg===app.element.querySelector('[data-map-host] svg'),sameElement:wheelElement===app.element,points:app.mapDraft.points,windowTop:app.element.querySelector('.window-content').scrollTop};},anchor);
    assert.ok(Math.abs(afterWheel.x-anchor.imageX)<1&&Math.abs(afterWheel.y-anchor.imageY)<1,'Wheel zoom keeps the mouse over the same map coordinate');
    assert.equal(afterWheel.sameSvg,true);assert.equal(afterWheel.sameElement,true);assert.deepEqual(afterWheel.points,anchor.points);assert.equal(afterWheel.windowTop,anchor.windowTop);
    await page.mouse.wheel(0,120);await page.waitForFunction(zoom=>Math.abs(app.zoom-zoom)<1e-9,anchor.zoom);await sameMapCenter('Wheel zoom out returns to the prior view');
    await page.mouse.wheel(0,-120);await page.waitForFunction(zoom=>app.zoom>zoom,anchor.zoom);

    // Right-button drag works during a route edit and never adds or moves vertices.
    await page.locator('[data-map-host]').screenshot({path:path.join(output,'travel-smaller-pins.png')});
    const panBefore=await page.evaluate(()=>{const host=app.element.querySelector('[data-map-host]'),r=host.getBoundingClientRect();window.panElement=app.element;return {x:r.left+host.clientWidth*.6,y:r.top+host.clientHeight*.55,left:host.scrollLeft,top:host.scrollTop,points:structuredClone(app.mapDraft.points),state:JSON.stringify(settings.state.value)};});
    await page.mouse.move(panBefore.x,panBefore.y);await page.mouse.down({button:'right'});
    await page.mouse.move(panBefore.x-70,panBefore.y-50,{steps:5});
    assert.equal(await page.evaluate(()=>app.mapPanning),true);
    await page.evaluate(()=>app.refreshAutomatically());
    assert.equal(await page.evaluate(()=>app.element===panElement),true,'Refresh keeps the captured map intact');
    await page.mouse.up({button:'right'});
    const panAfter=await page.evaluate(()=>{const host=app.element.querySelector('[data-map-host]');return {left:host.scrollLeft,top:host.scrollTop,points:app.mapDraft.points,panning:app.mapPanning,state:JSON.stringify(settings.state.value),contextBlocked:!host.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}))};});
    assert.ok(Math.abs(panAfter.left-panBefore.left-70)<1&&Math.abs(panAfter.top-panBefore.top-50)<1,'Right drag moves viewport in both axes');
    assert.deepEqual(panAfter.points,panBefore.points);assert.equal(panAfter.state,panBefore.state);assert.equal(panAfter.panning,false);assert.equal(panAfter.contextBlocked,true);
    await page.evaluate(()=>app.run('mapCancel'));sourceView=await mapViewport();
    const snapshotBeforeUI=await page.evaluate(()=>JSON.stringify(settings.state.value));
    await page.evaluate(()=>app.close());
    await page.evaluate(async()=>{window.previousMapTrip=app.selected;app=new module.TravelApp();app.selected=previousMapTrip;app.view='map';await app.render();});
    await sameMapCenter('New application restores last viewed map position');
    assert.equal((await mapViewport()).zoom,sourceView.zoom,'Mouse-wheel zoom is restored after reopening');
    assert.equal(await page.evaluate(()=>JSON.stringify(settings.state.value)),snapshotBeforeUI,'Persisting viewport preferences must not modify trips or paths');
    await page.evaluate(async()=>{await app.run('view',null,'plan');await app.run('view',null,'map');});
    await sameMapCenter('Switching tabs preserves zoom and map center');

    await page.screenshot({path:path.join(output,'travel-map-persistence.png')});
    // Saved maps share definitions only. Reopening and new trips preserve the chosen scale.
    const beforeCreator=await page.evaluate(()=>{window.creatorSvg=app.element.querySelector('[data-map-host] svg');return {state:JSON.stringify(settings.state.value)};});
    await act('mapAdd');assert.equal(await page.locator('.tv-map-creator').isVisible(),true);
    assert.equal(await page.locator('[data-command="mapAdd"]').getAttribute('aria-expanded'),'true');
    assert.ok(await page.locator('.tv-map-creator').evaluate(el=>!!(el.compareDocumentPosition(el.parentElement.querySelector('[name="savedMapId"]'))&Node.DOCUMENT_POSITION_FOLLOWING)),'Map creation stays above saved maps');
    assert.equal(await page.evaluate(()=>JSON.stringify(settings.state.value)),beforeCreator.state,'Opening creator does not save trip state');
    assert.equal(await page.evaluate(()=>creatorSvg===app.element.querySelector('[data-map-host] svg')),true,'Opening creator preserves map DOM');
    await page.locator('[name="mapSaveName"]').fill('Continente <consulta>');await act('mapAdd');await act('mapAdd');assert.equal(await page.locator('[name="mapSaveName"]').inputValue(),'Continente <consulta>','Toggling creator preserves unsaved name');
    await appScreenshot('travel-add-map-top.png');await act('mapStore');
    assert.equal(await page.locator('.tv-map-creator').isVisible(),false,'Creator closes after saving a copy');
    const libraryBefore=await page.evaluate(()=>structuredClone(settings.state.value.mapLibrary));
    const savedDefault=libraryBefore.entries.find(e=>e.id===libraryBefore.lastId);
    assert.equal(savedDefault.name,'Continente <consulta>');
    assert.equal(await page.locator('[name="savedMapId"] option').last().innerText(),'Continente <consulta>');
    const originalMapTrip=await page.evaluate(()=>structuredClone(settings.state.value.trips.find(t=>t.id===app.selected)));
    await act('new');await view('map');
    assert.deepEqual(await page.evaluate(()=>settings.state.value.trips.at(-1).map),{...savedDefault.map,libraryId:savedDefault.id});
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).segments.length),0);
    const manualEntry=libraryBefore.entries.find(e=>e.map.calibration);
    await page.locator('[name="savedMapId"]').selectOption(manualEntry.id);await act('mapUse');
    assert.equal(await page.evaluate(()=>settings.state.value.mapLibrary.lastId),manualEntry.id);
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).map.kmPerPixel),manualEntry.map.kmPerPixel);
    await act('mapScale');await page.evaluate(()=>{app.mapDraft.points=[{x:0,y:0},{x:100,y:0}];});
    await page.locator('[name="calibrationKm"]').fill('10');await act('mapSave');
    assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).map.kmPerPixel),.1);
    assert.deepEqual(await page.evaluate(id=>settings.state.value.trips.find(t=>t.id===id),originalMapTrip.id),originalMapTrip,'Recalibrating a saved map preserves previous journeys');
    await act('new');await view('map');assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).map.kmPerPixel),.1);
    const beforeForget=await page.evaluate(()=>structuredClone(settings.state.value.trips));
    await act('mapForget');assert.deepEqual(await page.evaluate(()=>settings.state.value.trips),beforeForget,'Removing a library entry leaves all trip maps and routes intact');
    const remainingLibrary=await page.evaluate(()=>structuredClone(settings.state.value.mapLibrary));
    await page.evaluate(async()=>{await app.close();app=new module.TravelApp();await app.render();});
    await act('new');assert.equal(await page.evaluate(()=>settings.state.value.trips.at(-1).map.libraryId),remainingLibrary.lastId,'New app reuses persisted last map');
    // Delete is visible from every trip tab; cancelling preserves dirty edits and records.
    await act('add');await view('map');assert.equal(await page.locator('.tv-route-picker [data-command="delete"]').isVisible(),true);
    await page.locator('[name="trip.name"]').fill('Viagem a excluir');
    const beforeDelete=await page.evaluate(()=>structuredClone(settings.state.value));
    await page.evaluate(()=>confirmResult=false);await act('delete');
    assert.deepEqual(await page.evaluate(()=>settings.state.value),beforeDelete);assert.equal(await page.evaluate(()=>app.dirty),true);
    await page.evaluate(()=>confirmResult=true);await act('saveName');await view('track');await act('compact');
    const deletedId=await page.evaluate(()=>app.selected),clockBeforeDelete=await page.evaluate(()=>game.time.worldTime);
    const assetsBeforeDelete=await page.evaluate(()=>({library:structuredClone(settings.state.value.mapLibrary),profiles:structuredClone(settings.state.value.profiles),others:structuredClone(settings.state.value.trips.filter(t=>t.id!==app.selected))}));
    await act('delete');
    assert.equal(await page.evaluate(id=>settings.state.value.trips.some(t=>t.id===id),deletedId),false);
    assert.equal(await page.evaluate(()=>settings.state.value.clockLink),null);assert.equal(await page.evaluate(()=>game.time.worldTime),clockBeforeDelete);
    assert.equal(await page.evaluate(()=>settings.compactTrip.value),'');assert.equal(await page.locator('.tagmar-travel-compact').count(),0);
    assert.deepEqual(await page.evaluate(()=>({library:settings.state.value.mapLibrary,profiles:settings.state.value.profiles,others:settings.state.value.trips})),assetsBeforeDelete);
    await page.evaluate(id=>app.run('select',id),originalMapTrip.id);await view('map');await page.evaluate(()=>app.element.querySelector('.window-content').scrollTop=0);await page.screenshot({path:path.join(output,'travel-saved-maps.png')});
    await view('plan');assert.equal(await page.locator('.tv-manual-route').evaluate(el=>el.open),false);
    const preciseDistance=await page.evaluate(()=>settings.state.value.trips.find(t=>t.id===app.selected).segments[0].distance);
    assert.equal(await page.locator('.tv-segment-basics input').first().inputValue(),String(Number(preciseDistance.toFixed(2))));
    assert.equal(await page.locator('.tv-segment-timing strong').first().innerText(),'2h 38min','Continuous ship estimate has no added rest');await appScreenshot('travel-plan-map-first.png');
    await page.evaluate(()=>app.close());
    assert.deepEqual(errors,[]);
    console.log('PASS: single transport dropdown, four presets, unsaved creation/cancel, type fields, validation, edit/delete preservation, saved map library and calibration reuse, independent journey snapshots, right-button pan during drawing, safe trip deletion with cancellation and clock cleanup, planner/library/map/clock regressions, actual scaled calendar button sizes, HUD drag/resize and persisted width, native select and focus preservation, per-trip viewport persistence, real mouse-wheel zoom anchored to cursor while editing, immutable route coordinates and 480px layout.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
