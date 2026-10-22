// Teste isolado dos templates e formulário, sem abrir/modificar um mundo Foundry.
// node .../environment-browser.cjs <Foundry resources/app> <node_modules runtime> <pasta de imagens>
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const [foundryRoot, packages, output] = process.argv.slice(2);
const root = path.resolve(__dirname, '..');
const handlebars = require(path.join(foundryRoot, 'node_modules/handlebars'));
const {chromium} = require(path.join(packages, 'playwright'));
const template = handlebars.compile(fs.readFileSync(path.join(root,'templates/calendar.hbs'),'utf8'));
const css = fs.readFileSync(path.join(root,'styles/calendar.css'),'utf8');
const nativeCss = fs.readFileSync(path.join(foundryRoot,'public/css/foundry2.css'),'utf8');
// Renderiza os templates reais da navegação e do painel; os controles nativos
// são placeholders, pois a DataSchema completa exige um mundo em execução.
handlebars.registerHelper('localize', value => value);
handlebars.registerHelper('formGroup', () => new handlebars.SafeString('<div class="form-group native-placeholder"><label>Controle nativo</label><input type="number" value="0"></div>'));
const tabs = ['basics','grid','levels','visibility','environment','misc'].map(id => ({id,group:'sheet',label:id,active:id==='environment',cssClass:id==='environment'?'active':''}));
const navHtml = handlebars.compile(fs.readFileSync(path.join(foundryRoot,'templates/generic/tab-navigation.hbs'),'utf8'))({tabs,tabClasses:'top-tabs'});
const environmentHtml = handlebars.compile(fs.readFileSync(path.join(foundryRoot,'templates/scene/config/environment.hbs'),'utf8'))({tab:tabs[4]});
(async () => {
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page = await browser.newPage({viewport:{width:1000,height:750}});
    await page.route('**/*', async route => {
      const pathname=new URL(route.request().url()).pathname;
      const scripts=['daylight.mjs','weather.mjs','lunar.mjs','scene-environment.mjs'];
      if(scripts.some(name=>pathname===`/scripts/${name}`)) return route.fulfill({body:fs.readFileSync(path.join(root,pathname)),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
      if(pathname==='/form-data.mjs') return route.fulfill({body:fs.readFileSync(path.join(foundryRoot,'client/applications/ux/form-data-extended.mjs')),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
      if(pathname.endsWith('tagmar-logo-original.png')) return route.fulfill({body:fs.readFileSync(path.join(root,'assets/tagmar-logo-original.png')),contentType:'image/png'});
      return route.abort();
    });
    await page.setContent(`<html><head><base href="http://calendar-test.local/"><style>${nativeCss}\n${css}
      body{background:#1b2028} .scene-config{position:absolute;left:20px;top:20px;width:600px;height:700px}
      </style></head><body class="theme-dark"><form class="application scene-config"><header class="window-header"><h1 class="window-title">Cena: Costa de Calco</h1></header><section class="window-content standard-form"><input name="name" value="Costa de Calco">${navHtml}${environmentHtml}<footer class="form-footer"><button type="submit">Salvar</button></footer></section></form></body></html>`);
    const nativeBefore = await page.locator('.native-placeholder').count();
    const navBefore = await page.locator('nav').innerHTML();
    await page.evaluate(async () => {
      window.foundry={utils:{isElementInstanceOf:(el,type)=>el instanceof type}};
      window.editor = await import('http://calendar-test.local/scripts/scene-environment.mjs');
      window.weather = await import('http://calendar-test.local/scripts/weather.mjs');
      window.lunar = await import('http://calendar-test.local/scripts/lunar.mjs');
      window.FormDataExtended = (await import('http://calendar-test.local/form-data.mjs')).default;
      window.flags={dayNight:{latitude:0,enabled:true},climate:{biome:'tropical',mode:'auto',coastal:true,tides:true,region:'Calco'}};
      window.scene={id:'calco',getFlag:(_id,key)=>flags[key]};
      window.app={document:scene};
      editor.renderSceneEnvironment(app,document.body,false);
    });
    assert.equal(await page.locator('.tagmar-scene-environment').count(),0,'Player cannot configure');
    await page.evaluate(() => {editor.renderSceneEnvironment(app,document.body,true);editor.renderSceneEnvironment(app,document.body,true);});
    assert.equal(await page.locator('.tagmar-scene-environment').count(),1,'No duplicate fields');
    assert.equal(await page.locator('nav').innerHTML(),navBefore,'Navigation must remain untouched (same data-tab on its link)');
    assert.equal(await page.locator('.tab[data-group="sheet"][data-tab="environment"] > .tagmar-scene-environment').count(),1,'Fields belong to the content panel, not its navigation link');
    assert.equal(await page.locator('.native-placeholder').count(),nativeBefore,'Native scene controls preserved');
    const layout = await page.evaluate(() => {
      const nav=document.querySelector('nav').getBoundingClientRect();
      const panel=document.querySelector('.tab[data-tab="environment"]');
      const section=document.querySelector('.tagmar-scene-environment').getBoundingClientRect();
      const footer=document.querySelector('footer').getBoundingClientRect();
      return {navHeight:nav.height,width:section.width,top:section.top,navBottom:nav.bottom,footerBottom:footer.bottom,scrollable:panel.scrollHeight>panel.clientHeight,overflow:getComputedStyle(panel).overflowY};
    });
    assert.ok(layout.navHeight<100,'Navigation remains compact');
    assert.ok(layout.width>450,'Fields use panel width');
    assert.ok(layout.top>=layout.navBottom,'Fields below navigation');
    assert.ok(layout.footerBottom<=750,'Save remains within viewport');
    assert.ok(layout.scrollable && ['auto','scroll'].includes(layout.overflow),'Long settings scroll inside the panel');
    assert.equal(await page.getByLabel('Bioma',{exact:true}).inputValue(),'tropical');
    for(const biome of ['lake','ocean','open_sea']) {
      await page.getByLabel('Bioma',{exact:true}).selectOption(biome);
      assert.equal(await page.getByLabel('Bioma',{exact:true}).inputValue(),biome);
      const data = await page.evaluate(()=>new FormDataExtended(document.querySelector('form')).object);
      assert.equal(data['flags.tagmar-calendario.climate.biome'],biome);
    }
    assert.equal(await page.locator('.tagmar-manual-weather').isVisible(),false);
    assert.equal(await page.getByLabel('Sincronizar efeitos visuais com o clima',{exact:true}).isChecked(),false);
    await page.getByLabel('Sincronizar efeitos visuais com o clima',{exact:true}).check();
    await page.getByLabel('Controle do clima',{exact:true}).selectOption('manual');
    assert.equal(await page.locator('.tagmar-manual-weather').isVisible(),true);
    await page.getByLabel('Condição manual',{exact:true}).selectOption('fog');
    await page.getByLabel('Temperatura manual (°C)',{exact:true}).fill('18');
    await page.getByLabel('Vento manual (km/h)',{exact:true}).fill('6');
    await page.getByLabel('Latitude (0° = Calco / Equador)',{exact:true}).fill('30');
    await page.getByLabel('Dia/noite automático nesta cena',{exact:true}).uncheck();
    assert.equal(await page.locator('.tagmar-lunar-tides').isVisible(),true);
    assert.equal(await page.getByLabel('Modelo das marés',{exact:true}).count(),0);
    assert.equal(await page.getByLabel('Influência de Agmarim',{exact:true}).inputValue(),'2.1');
    await page.getByLabel('Influência de Agmarim',{exact:true}).fill('5');
    await page.getByLabel('Atraso local das marés (horas)',{exact:true}).fill('2');
    await page.getByRole('button',{name:'Restaurar influências padrão',exact:true}).click();
    assert.equal(await page.getByLabel('Influência de Agmarim',{exact:true}).inputValue(),'2.1');
    assert.equal(await page.getByLabel('Influência de Armina',{exact:true}).inputValue(),'0.6');
    assert.equal(await page.getByLabel('Influência de Denégria',{exact:true}).inputValue(),'0.3');
    assert.equal(await page.getByLabel('Atraso local das marés (horas)',{exact:true}).inputValue(),'2');
    await page.getByLabel('Influência de Agmarim',{exact:true}).fill('2');
    await page.getByLabel('Influência de Armina',{exact:true}).fill('0');
    await page.getByLabel('Atraso local das marés (horas)',{exact:true}).fill('1.5');
    const saved=await page.evaluate(() => {
      const data=new FormDataExtended(document.querySelector('form')).object;
      editor.prepareEnvironmentUpdate(scene,data,{absoluteDay:44},43200,true);
      window.flags=data.flags['tagmar-calendario'];
      return data;
    });
    assert.equal(saved.name,'Costa de Calco');
    assert.equal(saved.flags['tagmar-calendario'].dayNight.enabled,false);
    assert.equal(saved.flags['tagmar-calendario'].dayNight.latitude,30);
    assert.equal(saved.flags['tagmar-calendario'].climate.temperature,18);
    assert.equal(saved.flags['tagmar-calendario'].climate.tides,true);
    assert.equal(saved.flags['tagmar-calendario'].climate.visualEffects,true);
    assert.equal(saved.flags['tagmar-calendario'].climate.tideModel,'lunar');
    assert.equal(saved.flags['tagmar-calendario'].climate.moonAgmarim,2);
    assert.equal(saved.flags['tagmar-calendario'].climate.moonArmina,0);
    assert.equal(saved.flags['tagmar-calendario'].climate.tideLag,1.5);
    await page.getByLabel('Sincronizar efeitos visuais com o clima',{exact:true}).uncheck();
    assert.equal(await page.evaluate(()=>new FormDataExtended(document.querySelector('form')).object['flags.tagmar-calendario.climate.visualEffects']),false);
    await page.screenshot({path:path.join(output,'scene-environment.png'),fullPage:true});
    await page.getByLabel('Região costeira',{exact:true}).uncheck();
    assert.equal(await page.locator('.tagmar-tide-settings').isVisible(),false);
    const info=await page.evaluate(()=>weather.environmentInfo(scene,{absoluteDay:44},43200));
    assert.equal(info.rows,2);
    const moon={name:'Crescente',icon:'◑',progress:0.25};
    const skies=await page.evaluate(()=>Object.fromEntries(Object.keys(lunar.MOONS).map(key=>[key,lunar.lunarSky(key,70,43200)])));
    const context={time:'12:00:00',displayDay:15,monthLabel:'Água',year:1500,dayRotation:-168,monthRotation:-30,
      agmarim:{...moon,sky:skies.agmarim},armina:{...moon,sky:skies.armina},denegria:{...moon,sky:skies.denegria},solar:{enabled:true,label:'Dia · Latitude 30°'},
      environment:info,canControl:true,playbackRateLabel:'1×',dayStatus:'Solstício de Verão',
      days:Array.from({length:30},(_,i)=>({number:i+1,angle:i*12,active:i===14}))};
    for(const moonSky of [false,true]) for(const collapsed of [false,true]) {
      await page.setContent(`<html><head><base href="http://calendar-test.local/"><style>*{box-sizing:border-box}body{background:#333942}${css}</style></head><body><section class="tagmar-calendar ${collapsed?'collapsed-mode':''}" style="left:20px;top:20px;--environment-extra:52px">${template({...context,collapsed,moonSky})}</section></body></html>`);
      assert.equal(await page.locator('.lunar-horizon').count(),moonSky?1:0);
      const rotation=await page.locator('.moon-agmarim').getAttribute('style');
      assert.ok(rotation.includes(String(moonSky?skies.agmarim.progress:moon.progress)));
      assert.equal(await page.locator('.environment-row').count(),2);
      const bounds=await page.evaluate(()=>{
        const b=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
        return {day:b('.hud-day-status'),weather:b('.weather-row'),tide:b('.tide-row'),controls:b('.hud-controls'),shell:b('.calendar-shell')};
      });
      assert.ok(bounds.weather.top>=bounds.day.bottom);
      assert.ok(bounds.tide.top>=bounds.weather.bottom);
      assert.ok(bounds.controls.top>=bounds.tide.bottom);
      assert.ok(bounds.controls.bottom<=bounds.shell.bottom);
      assert.equal(bounds.shell.height,collapsed?194:552);
      await page.screenshot({path:path.join(output,`${moonSky?'sky':'phase'}-${collapsed?'compact':'expanded'}-weather.png`)});
    }
    const aligned=await page.evaluate(()=>Object.fromEntries(Object.keys(lunar.MOONS).map(key=>[key,{name:'Cheia',icon:'○',progress:0.5,sky:lunar.lunarSky(key,360,0)}])));
    await page.setContent(`<html><head><base href="http://calendar-test.local/"><style>*{box-sizing:border-box}body{background:#333942}${css}</style></head><body><section class="tagmar-calendar" style="left:20px;top:20px;--environment-extra:0px">${template({...context,...aligned,moonSky:true,collapsed:false,isCruine:true,time:'00:00:00',displayDay:'—',monthLabel:'Cruine',year:1500,dayStatus:'Dia de Cruine',environment:{rows:0},days:[]})}</section></body></html>`);
    for (const key of Object.keys(aligned)) {
      assert.equal(aligned[key].sky.progress,0);
      const icon=page.locator(`.moon-${key} span`);
      assert.ok((await icon.getAttribute('title')).includes('Cheia'));
      assert.equal(await icon.evaluate(el=>el.classList.contains('moon-below')),false);
      const position=await icon.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return {center:a.x+a.width/2,orbitCenter:b.x+b.width/2,top:a.y,mid:b.y+b.height/2};});
      assert.ok(Math.abs(position.center-position.orbitCenter)<1);
      assert.ok(position.top<position.mid);
    }
    await page.screenshot({path:path.join(output,'cruine-1500-alignment.png')});
    console.log('PASS: actual DOM scene fields, native Foundry FormDataExtended, typed values/unchecked boxes, mode controls, no duplicates, player guard, two HUD modes, no overlap and Cruine 1500 aligned full moons. Not a live-world test.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
