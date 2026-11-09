// Interface real da integração em DOM de navegador, com DialogV2/Foundry simulados.
// Não abre nem autentica em mundos Foundry. Dependência externa: Playwright.
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require(path.join(process.env.TAGMAR_TEST_NODE_MODULES, 'playwright'));

async function main() {
  const root = path.resolve(__dirname, '../tagmar-token-fx');
  const routes = {};
  for(const name of ['bonus-rules','native-bonuses','temporary-eh','token-actor-lifecycle','invisibility','resistance-areas','resistance-penalties','summoning','summon-jobs','sheet-adjustments'])routes[`/scripts/${name}.mjs`]=await fs.readFile(path.join(root,`scripts/${name}.mjs`));
  routes['/scripts/chat-targets.mjs']=await fs.readFile(path.join(root,'scripts/chat-targets.mjs'));
  routes['/scripts/recurring-resistance.mjs']=await fs.readFile(path.join(root,'scripts/recurring-resistance.mjs'));
  routes['/scripts/transformation.mjs']=await fs.readFile(path.join(root,'scripts/transformation.mjs'));
  routes['/scripts/transformation-ui.mjs']=await fs.readFile(path.join(root,'scripts/transformation-ui.mjs'));
  routes['/scripts/effect-lights.mjs']=await fs.readFile(path.join(root,'scripts/effect-lights.mjs'));
  const publicRoot=path.join(process.env.TAGMAR_TEST_FOUNDRY??'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app','public');
  routes['/css/foundry2.css']=await fs.readFile(path.join(publicRoot,'css/foundry2.css'));
  routes['/ui/parchment.jpg']=await fs.readFile(path.join(publicRoot,'ui/parchment.jpg'));
  for (const file of ['scripts/field-help.mjs', 'scripts/main.js', 'scripts/core.mjs', 'scripts/jb2a.mjs', 'scripts/timers.mjs', 'scripts/cast-rules.mjs', 'scripts/cast-ui.mjs', 'scripts/casts.mjs', 'scripts/item-attack.mjs', 'scripts/attack-chat.mjs', 'scripts/area-preview.mjs', 'scripts/area-animation.mjs', 'scripts/spell-times.mjs', 'scripts/animation-labels.mjs', 'scripts/animation-picker.mjs', 'styles/config.css']) {
    routes['/' + file] = await fs.readFile(path.join(root, file));
  }
  const html = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><link rel="stylesheet" href="/styles/config.css"><style>body{background:#16121c;color:#e9dfd2;font:16px Arial;padding:20px}section{width:530px;background:#29232d;padding:20px;border:1px solid #75667b;border-radius:6px}button,select,input{font:inherit}button,select,input[type=search]{padding:7px;background:#403545;color:inherit;border:1px solid #938599;border-radius:3px}input[type=checkbox]{width:18px;height:18px}.hint{font-size:13px;color:#d2c6c5}footer{display:flex;gap:8px;margin-top:16px}button{flex:1}h2{margin-top:0}</style><body></body></html>';
  const server = http.createServer((req, res) => {
    if (routes[req.url]) {
      res.setHeader('Content-Type', req.url.endsWith('.css') ? 'text/css' : 'text/javascript');
      return res.end(routes[req.url]);
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true, channel: 'chrome'});
    const page = await browser.newPage({viewport: {width: 950, height: 850}});
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.route('http://tagmar-fx.test/**', route => {
      const name = new URL(route.request().url()).pathname;
      return route.fulfill({body: routes[name] ?? html, contentType: routes[name] ? (name.endsWith('.css') ? 'text/css' : name.endsWith('.jpg')?'image/jpeg':'text/javascript') : 'text/html'});
    });
    await page.goto('http://tagmar-fx.test/');
    await page.evaluate(async () => {
      window.hooks = new Map(); window.Hooks = {on: (name, fn) => hooks.set(name, fn)};
      window.flags = {}; window.calls = []; window.notices = [];
      window.game = {system: {id: 'tagmar_rpg'}, user: {id: 'gm', isGM: true, targets: new Set()}, modules: new Map([['tokenmagic', {active: true}]])};
      game.settings={get:(_m,k)=>k==='showTokenMagic'?true:undefined};
      window.ui = {notifications: {info: text => notices.push(text), warn: text => notices.push(text)}};
      const actor = {uuid: 'Actor.test', name: 'Teste', isOwner: true};
      window.item = {uuid: 'Actor.test.Item.glow', type: 'Magia', name: 'Magia — teste visual', actor, isOwner: true,
        getFlag: (_scope, key) => flags[key], setFlag: async (_scope, key, value) => { flags[key] = value; },
        update: async data => {for (const [key, value] of Object.entries(data)) flags[key.split('.').at(-1)] = value;}};
      window.token = {id: 'one', actor, state: [], document: {uuid: 'Scene.test.Token.one', isOwner: true, getFlag: () => token.state}};
      window.canvas = {ready: true, tokens: {placeables: [token]}};
      window.TokenMagic = {
        getPresets: library => library === 'tmfx-main' ? ['electric', 'fire', 'glow'].map(name => ({name})) : [],
        getPreset: () => [{filterId: 'glow', filterType: 'glow'}],
        addUpdateFilters: async (_token, params) => { calls.push('add'); token.state = params.map(p => ({tmFilters: {tmFilterId: p.filterId}})); },
        deleteFilters: async (_token, id) => { calls.push('delete'); token.state = token.state.filter(f => f.tmFilters.tmFilterId !== id); }
      };
      window.foundry = {applications: {api: {DialogV2: {
        wait: config => new Promise(resolve => {
          const element = document.createElement('section'); element.className = 'tagmar-fx-dialog';
          element.innerHTML = `<h2>${config.window.title}</h2><form>${config.content}<footer class="form-footer"></footer></form>`;
          document.body.append(element);
          for (const entry of config.buttons) {
            const button = document.createElement('button'); button.type = 'submit'; button.textContent = entry.label;
            button.dataset.action = entry.action; element.querySelector('footer').append(button);
          }
          element.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault(); const button = event.submitter;
            const entry = config.buttons.find(e => e.action === button.dataset.action);
            const result = await entry.callback(event, button, {element});
            element.remove(); resolve(result ?? entry.action);
          });
          config.render?.(null, {element});
        }), confirm: async () => true
      }}}};
      window.entry = await import('/scripts/main.js');
      window.openFx = (expand=true) => { window.done = entry.configureItem(item); if(expand)for(const d of document.querySelectorAll('.tagmar-fx-section,.tagmar-fx-animation'))d.open=true; };
    });
    await page.evaluate(() => openFx());
    assert.equal(await page.locator('[data-fx-row]').count(), 3);
    assert.equal(await page.locator('[name=fxAutomatic]').isChecked(), false);
    await page.evaluate(()=>{window.helpShown=[];game.tooltip={element:null,activate(element,options){this.element=element;helpShown.push(options.text);},deactivate(){this.element=null;}};});
    const enabledBefore=await page.locator('[name=cast_enabled]').isChecked();
    await page.locator('[data-help-for=cast_enabled]').click();
    assert.equal(await page.locator('[name=cast_enabled]').isChecked(),enabledBefore);
    assert.equal(await page.locator('.tagmar-fx-dialog').count(),1);
    assert((await page.locator('.tagmar-fx-help-tooltip').innerText()).includes('Salv'));
    await page.keyboard.press('Escape');assert.equal(await page.locator('.tagmar-fx-help-tooltip').count(),0);
    await page.locator('[data-help-for=cast_resolution]').focus();
    assert((await page.locator('.tagmar-fx-help-tooltip').innerText()).includes('Sem teste'));
    const outside=await page.evaluate(()=>{const a=document.querySelector('.tagmar-fx-dialog').getBoundingClientRect(),b=document.querySelector('.tagmar-fx-help-tooltip').getBoundingClientRect();return b.left>=a.right||b.right<=a.left||b.bottom<=a.top||b.top>=a.bottom;});assert(outside,'Ajuda fora da janela');
    await page.evaluate(()=>{document.querySelector('.tagmar-fx-dialog').style.cssText='position:absolute;left:380px;top:20px;width:530px';});
    await page.locator('[data-help-for=cast_useType]').click();
    assert.equal(await page.locator('.tagmar-fx-help-tooltip').getAttribute('data-side'),'left');
    assert(await page.evaluate(()=>document.querySelector('.tagmar-fx-help-tooltip').getBoundingClientRect().right<=document.querySelector('.tagmar-fx-dialog').getBoundingClientRect().left));
    if(process.env.TAGMAR_FX_HELP_SCREENSHOT)await page.screenshot({path:process.env.TAGMAR_FX_HELP_SCREENSHOT});
    await page.evaluate(()=>{document.querySelector('.tagmar-fx-dialog').style.cssText='';});
    await page.keyboard.press('Escape');


    await page.locator('.tagmar-fx-tokenmagic summary').click();
    await page.locator('[data-fx-search]').fill('glow');
    assert.equal(await page.locator('[data-fx-row]:visible').count(), 1);
    await page.locator('[data-fx-row]:visible input').check();
    if (process.env.TAGMAR_FX_SCREENSHOT) await page.screenshot({path: process.env.TAGMAR_FX_SCREENSHOT});
    await page.getByRole('button', {name: 'Testar', exact: true}).click();
    await page.evaluate(() => done);
    assert.equal(await page.locator('.tagmar-fx-help-tooltip').count(),0);
    assert.deepEqual(await page.evaluate(() => calls), ['add']);
    assert.deepEqual(await page.evaluate(() => flags), {});
    await page.evaluate(() => openFx());
    await page.getByRole('button', {name: 'Remover', exact: true}).click();
    await page.evaluate(() => done);
    assert.equal(await page.evaluate(() => token.state.length), 0);
    await page.evaluate(() => openFx());
    await page.locator('.tagmar-fx-tokenmagic summary').click();
    await page.locator('[data-fx-row]').filter({hasText: 'fire'}).locator('input').check();
    await page.locator('[name=fxAutomatic]').check();
    await page.locator('[name=fxDestination]').selectOption('targets');
    await page.getByRole('button', {name: 'Salvar', exact: true}).click();
    await page.evaluate(() => done);
    assert.deepEqual(await page.evaluate(() => flags.visualFx), {automatic: true, destination: 'targets', presets: [{name: 'fire', library: 'tmfx-main'}]});
    await page.evaluate(() => openFx());
    assert.equal(await page.locator('[name=fxAutomatic]').isChecked(), true);
    assert.equal(await page.locator('[name=fxDestination]').inputValue(), 'targets');
    assert.equal(await page.locator('[data-fx-row]').filter({hasText: 'fire'}).locator('input').isChecked(), true);
    await page.getByRole('button', {name: 'Cancelar', exact: true}).click(); await page.evaluate(() => done);
    assert.equal(await page.evaluate(() => calls.length), 2);
    await page.evaluate(() => {
      game.modules.set('sequencer', {active:true}); game.modules.set('JB2A_DnD5e', {active:true});
      game.settings = {get: (_m,k) => k==='showTokenMagic'?true:undefined};
      canvas.scene = {id:'test'}; token.center = {x:50,y:50};
      const enemy = {id:'enemy',center:{x:250,y:50},document:{isOwner:false}};
      canvas.tokens.placeables.push(enemy); game.user.targets.add(enemy);
      window.visuals=[];
      window.Sequencer={Database:{publicFlattenedSimpleEntries:['jb2a.arrow.physical.white.01','jb2a.bolt.physical.blue']},EffectManager:{endEffects:async()=>{}}};
      window.Sequence=class {
        effect(){return this;} file(v){this.fileName=v;return this;} name(){return this;}
        atLocation(t){this.source=t.id;return this;} stretchTo(t){this.target=t.id;return this;}
        scale(){return this;} async play(){visuals.push({file:this.fileName,source:this.source,target:this.target});}
      };
      flags.visualFx={automatic:false,destination:'self',presets:[]};
      openFx();
    });
    await page.locator('[name=jbEnabled]').check();
    await page.locator('[name=jbAutomatic]').check();
    await page.locator('[name=jbFile]').fill('jb2a.nonexistent');
    await page.getByRole('button', {name:'Salvar', exact:true}).click();
    assert.equal(await page.locator('.tagmar-fx-dialog').count(),1);
    await page.locator('[name=jbFile]').fill('Flecha · Tipo físico · Cor branca · Variante 01');
    await page.getByRole('button', {name:'Testar', exact:true}).click(); await page.evaluate(()=>done);
    assert.deepEqual(await page.evaluate(()=>visuals),[{file:'jb2a.arrow.physical.white.01',source:'one',target:'enemy'}]);
    assert.equal(await page.evaluate(()=>flags.jb2aFx.enabled),false);
    await page.evaluate(()=>openFx());
    await page.locator('[name=jbEnabled]').check(); await page.locator('[name=jbAutomatic]').check();
    await page.locator('[name=jbFile]').fill('jb2a.arrow.physical.white.01');
    await page.getByRole('button', {name:'Salvar', exact:true}).click(); await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>flags.jb2aFx.automatic),true);
    await page.evaluate(()=>openFx());
    assert.equal(await page.locator('[name=jbFile]').inputValue(),'Flecha · Tipo físico · Cor branca · Variante 01');
    assert.equal(await page.evaluate(()=>flags.jb2aFx.file),'jb2a.arrow.physical.white.01');
    await page.getByRole('button',{name:'Abrir ou fechar lista de animações',exact:true}).click();
    assert.equal(await page.getByRole('option',{name:'Flecha · Tipo físico · Cor branca · Variante 01',exact:true}).count(),1);
    await page.getByRole('option',{name:'Flecha · Tipo físico · Cor branca · Variante 01',exact:true}).click();
    assert(await page.locator('[name=jbTimeMode]').isDisabled());
    await page.locator('[name=jbMode]').selectOption('self');
    assert(await page.locator('[name=jbDuration]').isVisible());
    await page.locator('[name=jbScale]').fill('8');
    await page.locator('[name=jbTimeMode]').selectOption('calendar');
    assert(await page.locator('[name=jbDuration]').isHidden());
    await page.locator('[data-jb-edit-duration]').click();
    assert.equal(await page.locator('[name=jbGameDuration], [name=jbGameUnit]').count(),0);
    await page.locator('[name=cast_duration]').fill('12');
    await page.locator('[name=cast_unit]').selectOption('minutes');
    await page.locator('[name=jbRadius]').fill('2');
    await page.locator('[name=jbTintEnabled]').check();
    await page.locator('[name=jbTint]').fill('#ff4400');
    assert.equal(await page.locator('[name=jbOpacity]').inputValue(),'100');
    await page.locator('[name=jbOpacity]').fill('40');
    assert(await page.locator('[data-jb-light]').isHidden());
    await page.locator('[name=jbLightEnabled]').check();
    await page.locator('[name=jbLightBright]').fill('4');
    await page.locator('[name=jbLightDim]').fill('8');
    await page.locator('[name=jbLightColor]').fill('#ffaa44');
    assert(await page.locator('[name=jbScale]').isDisabled());
    assert(await page.locator('[name=jbScale]').isHidden());
    assert(await page.locator('[name=cast_duration]').isVisible());
    await page.locator('.tagmar-fx-script summary').click();
    assert.match(await page.locator('[data-jb-script]').inputValue(), /#ff4400/);
    assert.match(await page.locator('[data-jb-script]').inputValue(), /"radius": 2/);
    await page.getByRole('button', {name:'Salvar', exact:true}).click(); await page.evaluate(()=>done);
    await page.evaluate(()=>openFx());
    assert.deepEqual(await page.evaluate(()=>[flags.cast.duration,flags.cast.unit,flags.cast.durationShared,flags.jb2aFx.gameDuration,flags.jb2aFx.gameUnit]),[12,'minutes',true,12,'minutes']);
    assert.equal(await page.locator('[name=cast_duration]').inputValue(),'12');
    assert.equal(await page.locator('[name=jbTimeMode]').inputValue(),'calendar');
    assert.equal(await page.locator('[name=jbTint]').inputValue(),'#ff4400');
    assert.equal(await page.locator('[name=jbOpacity]').inputValue(),'40');
    assert.equal(await page.evaluate(()=>flags.jb2aFx.opacity),40);
    await page.locator('[name=jbOpacity]').fill('100');
    assert(await page.locator('[name=jbLightEnabled]').isChecked());
    assert.equal(await page.locator('[name=jbLightBright]').inputValue(),'4');
    assert.equal(await page.locator('[name=jbLightDim]').inputValue(),'8');
    assert.equal(await page.locator('[name=jbLightColor]').inputValue(),'#ffaa44');
    await page.locator('[name=jbTimeMode]').selectOption('animation');
    assert(await page.locator('[name=jbLightBright]').isVisible());
    assert(await page.locator('[name=cast_duration]').isHidden());
    await page.locator('[name=jbTimeMode]').selectOption('calendar');
    assert.equal(await page.evaluate(()=>flags.jb2aFx.scale),8);
    await page.locator('[name=jbRadius]').fill('0');
    assert(await page.locator('[name=jbScale]').isVisible());
    assert.equal(await page.locator('[name=jbScale]').inputValue(),'8');
    await page.locator('[name=cast_rotate]').check();
    await page.locator('[name=cast_enabled]').check();
    await page.locator('[name=cast_useType]').selectOption('area');
    await page.locator('[data-cast-area-shape]').selectOption('cone');
    assert(await page.locator('[name=cast_width]').isHidden());
    assert(await page.locator('[name=cast_angle]').isVisible());
    assert(await page.locator('[name=cast_column]').isHidden());
    await page.locator('[data-cast-section=duration] > summary').click();
    await page.locator('[name=cast_effectName]').fill('Proteção mágica');
    await page.locator('[name=cast_duration]').fill('10');
    await page.locator('[data-cast-section=resolution] > summary').click();
    await page.locator('[name=cast_resolution]').selectOption('rf');
    assert(await page.locator('[name=cast_fa]').isVisible());
    await page.getByRole('button', {name:'Salvar', exact:true}).click(); await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>flags.cast.shape),'cone');
    assert.equal(await page.evaluate(()=>flags.cast.duration),10);
    await page.evaluate(()=>openFx());
    assert.equal(await page.locator('[name=cast_effectName]').inputValue(),'Proteção mágica');
    if (process.env.TAGMAR_FX_SCREENSHOT) await page.screenshot({path:process.env.TAGMAR_FX_SCREENSHOT,fullPage:true});
    await page.getByRole('button', {name:'Cancelar', exact:true}).click(); await page.evaluate(()=>done);
    await page.evaluate(()=>{item.type='Combate';flags.cast.resolution='attack';openFx();});
    assert(await page.locator('[name=cast_column]').isHidden());
    assert(await page.locator('[name=cast_damage]').isHidden());
    assert(await page.locator('[name=cast_defense]').isHidden());
    assert(await page.locator('[data-item-attack-hint]').isVisible());
    await page.locator('[name=jbMode]').selectOption('area');
    assert(await page.locator('[name=jbScale]').isHidden());
    assert(await page.locator('[name=jbRadius]').isHidden());
    assert.match(await page.locator('[data-jb-size-hint]').innerText(),/Uma animação na área posicionada/);
    await page.locator('[name=jbMode]').selectOption('self');
    assert(await page.locator('[name=jbRadius]').isVisible());
    await page.locator('[name=cast_resolution]').selectOption('rm');
    assert(await page.locator('[name=cast_damage]').isVisible());
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    // Interface compacta: abrir não modifica as opções; cada perfil mostra sua resolução.
    const savedBefore=await page.evaluate(()=>JSON.stringify(flags));
    await page.evaluate(()=>openFx(false));
    assert(await page.locator('[name=cast_useType]').isVisible());
    assert(await page.locator('[name=jbFile]').isHidden());
    assert(await page.locator('[name=cast_shape]').isHidden());
    await page.locator('[name=cast_useType]').selectOption('targets');
    await page.locator('[name=cast_resolution]').selectOption('attack');
    assert.equal(await page.locator('[name=cast_resolution]').inputValue(),'attack');
    assert(await page.locator('[name=cast_fa]').isHidden());
    assert(await page.locator('[name=cast_resistedDamage]').isHidden());
    assert(await page.locator('[data-item-attack-hint]').isVisible());
    await page.locator('[name=cast_resolution]').selectOption('rm');
    assert(await page.locator('[name=cast_fa]').isVisible());
    assert(await page.locator('[name=cast_resistedDamage]').isVisible());
    await page.locator('[name=cast_resolution]').selectOption('rf');
    await page.locator('[name=cast_useType]').selectOption('area');
    assert.equal(await page.locator('[name=cast_resolution]').inputValue(),'rf');
    assert(await page.locator('[name=cast_angle]').isVisible());
    await page.locator('[name=cast_useType]').selectOption('melee');
    assert.equal(await page.locator('[name=cast_shape]').inputValue(),'targets');
    assert(await page.locator('[name=cast_angle]').isHidden());
    await page.locator('[name=cast_useType]').selectOption('self');
    await page.locator('[name=cast_resolution]').selectOption('none');
    await page.locator('[data-cast-section=duration] > summary').click();
    assert.equal(await page.locator('[name=cast_resolution]').inputValue(),'none');
    assert(await page.locator('[name=cast_effectName]').isVisible());
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>JSON.stringify(flags)),savedBefore);
    await page.evaluate(()=>openFx(false));
    await page.locator('[name=cast_useType]').selectOption('area');
    await page.locator('[name=cast_targetFilter]').selectOption('allies');
    if(process.env.TAGMAR_FX_COMPACT_SCREENSHOT)await page.screenshot({path:process.env.TAGMAR_FX_COMPACT_SCREENSHOT,fullPage:true});
    await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>flags.cast.useType),'area');
    assert.equal(await page.evaluate(()=>flags.cast.targetFilter),'allies');
    await page.evaluate(()=>openFx(false));
    assert.equal(await page.locator('[name=cast_useType]').inputValue(),'area');
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    // RM é comum a todos os perfis e destinos; repetição fica salva no próprio item.
    await page.evaluate(()=>{flags.cast={enabled:true,useType:'area',shape:'circle',resolution:'attack',effectName:''};openFx(false);});
    assert(!await page.locator('[data-use-rm]').isChecked());
    assert(await page.locator('[name=cast_repeatRM]').isHidden());
    await page.locator('[data-use-rm]').check();
    assert.equal(await page.locator('[name=cast_resolution]').inputValue(),'rm');
    await page.locator('[name=cast_repeatRM]').check();
    await page.locator('[name=cast_repeatDamage]').check();
    await page.locator('[name=cast_rmSuccess]').selectOption('turn');
    await page.locator('[data-cast-section=targets] > summary').click();
    await page.locator('[name=cast_persistAfterExit]').check();
    assert.match(await page.locator('[name=cast_rmSuccess] option[value=end]').innerText(),/até o fim da magia/);
    if(process.env.TAGMAR_PERSISTENCE_SCREENSHOT)await page.locator('[data-cast-section=targets]').screenshot({path:process.env.TAGMAR_PERSISTENCE_SCREENSHOT});
    await page.locator('[data-cast-section=targets] > summary').click();
    await page.locator('[name=cast_combatModifier]').fill('2');
    await page.locator('[name=cast_skillModifier]').fill('-3');
    assert(await page.locator('[name=cast_resistedDamage]').isHidden());
    assert(await page.locator('[name=cast_duration]').isVisible());
    await page.locator('[name=cast_duration]').fill('10');
    await page.locator('[name=cast_unit]').selectOption('rounds');
    if(process.env.TAGMAR_RM_SCREENSHOT)await page.screenshot({path:process.env.TAGMAR_RM_SCREENSHOT,fullPage:true});
    await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>flags.cast.repeatRM),true);
    assert.deepEqual(await page.evaluate(()=>[flags.cast.repeatDamage,flags.cast.rmSuccess,flags.cast.combatModifier,flags.cast.skillModifier,flags.cast.resistedDamage]),[true,'turn',2,-3,0]);
    assert.equal(await page.evaluate(()=>flags.cast.persistAfterExit),true);
    await page.evaluate(()=>openFx());
    assert(await page.locator('[data-use-rm]').isChecked());
    assert(await page.locator('[name=cast_repeatRM]').isChecked());
    for(const shape of ['self','targets','circle','cone','ray']){
      await page.locator('[name=cast_useType]').selectOption(['self','targets'].includes(shape)?shape:'area');
      if(!['self','targets'].includes(shape))await page.locator('[data-cast-area-shape]').selectOption(shape);
      assert.equal(await page.locator('[name=cast_shape]').inputValue(),shape);
      assert(await page.locator('[name=cast_repeatRM]').isChecked());
    }
    await page.locator('[data-use-rm]').uncheck();
    assert(!await page.locator('[name=cast_repeatRM]').isChecked());
    assert(await page.locator('[name=cast_repeatRM]').isHidden());
    assert.equal(await page.locator('[name=cast_resolution]').inputValue(),'none');
    await page.locator('[name=cast_useType]').selectOption('targets');
    await page.locator('[name=cast_resolution]').selectOption('attack');
    await page.locator('[data-use-rm]').check();
    assert.equal(await page.locator('[name=cast_resolution]').inputValue(),'rm');
    await page.locator('[data-use-rm]').uncheck();
    assert.equal(await page.locator('[name=cast_resolution]').inputValue(),'attack');
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>flags.cast.repeatRM),true);
    // Posicionamento real por mouse/teclado em DOM, com desenho PIXI simulado.
    await page.evaluate(async()=>{
      const view=document.createElement('canvas');view.id='map';view.width=600;view.height=400;
      view.style.cssText='position:fixed;left:20px;top:20px;width:600px;height:400px';document.body.append(view);
      window.destroyed=0;window.drawn=[];
      window.PIXI={Point:class{constructor(x,y){this.x=x;this.y=y;}},Graphics:class{
        clear(){return this;}lineStyle(){return this;}beginFill(){return this;}
        drawCircle(...v){drawn.push(['circle',...v]);return this;}drawPolygon(v){drawn.push(['polygon',v]);return this;}
        endFill(){return this;}destroy(){destroyed++;}
      }};
      Hooks.off=(name)=>hooks.delete(name);
      canvas={ready:true,scene:{id:'test',grid:{size:100,distance:1}},app:{canvas:view,renderer:{screen:{width:600,height:400}}},stage:{addChild(){},toLocal:p=>p}};
      const {placeArea}=await import('/scripts/area-preview.mjs');
      window.startArea=shape=>{window.selection=placeArea({shape,distance:2,width:1,angle:90,pointSize:3,pointRotation:45},{canvas,PIXI,document,Hooks});};
      startArea('circle');
    });
    await page.mouse.move(120,120);await page.mouse.click(120,120);
    assert.deepEqual(await page.evaluate(()=>selection),{origin:{x:100,y:100},direction:0,sceneId:'test'});
    await page.evaluate(()=>startArea('cone'));
    await page.mouse.click(120,120);assert.equal(await page.locator('.tagmar-fx-area-hint').count(),1);
    await page.mouse.click(120,220);
    assert.equal((await page.evaluate(()=>selection)).direction,90);
    await page.evaluate(()=>startArea('ray'));await page.mouse.move(220,220);await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>selection),null);
    assert.equal(await page.evaluate(()=>destroyed),3);
    await page.evaluate(()=>startArea('point'));await page.mouse.move(170,160);
    assert((await page.evaluate(()=>drawn)).some(d=>d[0]==='polygon'));
    await page.mouse.click(170,160);
    assert.deepEqual(await page.evaluate(()=>selection),{origin:{x:150,y:140},direction:45,sceneId:'test'});
    await page.evaluate(()=>startArea('point'));await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>selection),null);
    assert.equal(await page.evaluate(()=>destroyed),5);
    assert.equal(await page.locator('.tagmar-fx-area-hint').count(),0);
    await page.evaluate(async()=>{
      document.getElementById('map').remove();
      game.time={worldTime:0};game.modules.set('tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:0})}});
      const {calendarNow}=await import('/scripts/timers.mjs');
      const {renderSpellTimes}=await import('/scripts/spell-times.mjs');
      const effects=[];effects.get=id=>effects.find(e=>e.id===id);
      const marker={id:'one',name:'Manipulação de Luz',img:'icons/svg/aura.svg',disabled:false,getFlag:()=>({endsAt:calendarNow(game)+3600}),delete:async()=>effects.splice(0,1)};
      effects.push(marker);
      window.sheetActor={isOwner:true,effects};window.sheetApp={actor:sheetActor};
      const root=document.createElement('div');root.id='actor-sheet';
      root.innerHTML='<section class="sheet-primary"><nav class="prim-tabs"><a data-tab="efeitos">Efeitos</a></nav><div class="tab active" data-tab="efeitos"><p id="existing-effects">Efeitos originais</p></div></section>';
      document.body.append(root);window.refreshSheet=()=>renderSpellTimes(sheetApp,root);refreshSheet();refreshSheet();
    });
    assert.equal(await page.locator('.tagmar-spell-times').count(),1);
    assert.match(await page.locator('.tagmar-spell-times').innerText(),/Manipulação de Luz[\s\S]*Restam 1 h/);
    assert.equal(await page.locator('#existing-effects').count(),1);
    await page.evaluate(()=>{sheetActor.effects[0].disabled=true;refreshSheet();});
    assert.match(await page.locator('.tagmar-spell-times').innerText(),/Inativo/);
    await page.getByRole('button',{name:'Remover Manipulação de Luz',exact:true}).click();
    assert.match(await page.locator('.tagmar-spell-times').innerText(),/Nenhuma magia/);
    await page.evaluate(async()=>{
      const {calendarNow}=await import('/scripts/timers.mjs');
      const {registerSpellTimes}=await import('/scripts/spell-times.mjs');registerSpellTimes();
      sheetActor.uuid='Actor.test';
      window.visualTimer={id:'timerABC123',startsAt:calendarNow(game),endsAt:calendarNow(game)+3600,sceneId:'test',targets:['one'],config:{mode:'self',lightEnabled:true}};
      window.visualItem={uuid:'Actor.test.Item.light',name:'Manipulação de Luz',img:'icons/svg/light.svg',actor:sheetActor,isOwner:true,getFlag:()=>visualTimer,unsetFlag:async()=>{visualTimer=null;}};
      sheetActor.items=[visualItem];hooks.get('updateItem')(visualItem);
    });
    assert.match(await page.locator('.tagmar-spell-times').innerText(),/Manipulação de Luz[\s\S]*Visual e iluminação[\s\S]*Restam 1 h/);
    await page.evaluate(()=>{game.time.worldTime+=60;hooks.get('updateWorldTime')();});
    assert.match(await page.locator('.tagmar-spell-times').innerText(),/Restam 59 min/);
    await page.evaluate(()=>{visualItem.isOwner=false;refreshSheet();});
    assert.equal(await page.getByRole('button',{name:'Encerrar Manipulação de Luz',exact:true}).count(),0);
    await page.evaluate(()=>{visualItem.isOwner=true;refreshSheet();});
    await page.getByRole('button',{name:'Encerrar Manipulação de Luz',exact:true}).click();
    assert.match(await page.locator('.tagmar-spell-times').innerText(),/Nenhuma magia/);
    await page.evaluate(()=>{
      const root=document.getElementById('actor-sheet');root.querySelector('[data-tab="efeitos"]').remove();
      root.querySelector('.tab').dataset.tab='basico';root.querySelector('.tagmar-spell-times').remove();
      refreshSheet();refreshSheet();
    });
    assert.equal(await page.locator('.prim-tabs [data-tab="efeitos"]').count(),1);
    assert.equal(await page.locator('.tab[data-tab="efeitos"]').count(),1);
    await page.evaluate(async()=>{
      document.getElementById('actor-sheet').remove();
      const root=document.createElement('section');root.className='tagmar-fx-animation';
      root.innerHTML='<div data-animation-picker><div class="tagmar-animation-search"><input name="jbFile" role="combobox" aria-label="Animação"><button type="button" data-animation-toggle>Abrir lista</button></div><div class="tagmar-animation-list" role="listbox"></div><p data-animation-count></p></div>';
      document.body.append(root);
      const {bindAnimationPicker}=await import('/scripts/animation-picker.mjs');
      bindAnimationPicker(root,Array.from({length:500},(_,i)=>({path:`jb2a.shield.blue.${i}`,value:`Escudo · Azul · Variante ${String(i).padStart(3,'0')}`})));
    });
    await page.getByRole('button',{name:'Abrir lista',exact:true}).click();
    const list=page.getByRole('listbox');
    assert.equal(await list.getByRole('option').count(),500);
    assert(await list.evaluate(e=>e.scrollHeight>e.clientHeight&&e.clientHeight<=240&&getComputedStyle(e).overflowY==='scroll'));
    await page.getByRole('combobox').press('End');
    assert(await list.evaluate(e=>e.scrollTop>0));
    await page.getByRole('combobox').press('Enter');
    assert.equal(await page.getByRole('combobox').inputValue(),'Escudo · Azul · Variante 499');
    assert(await list.isHidden());
    await page.getByRole('combobox').fill('escudo 498');
    assert.equal(await list.getByRole('option').count(),1);
    await list.getByRole('option').click();
    assert.equal(await page.getByRole('combobox').inputValue(),'Escudo · Azul · Variante 498');
    await page.getByRole('button',{name:'Abrir lista',exact:true}).click();
    await page.getByRole('combobox').press('Escape');assert(await list.isHidden());
    assert.deepEqual(errors, []);
    await page.evaluate(()=>{
      const style=document.createElement('style');
      style.textContent='.chat-message{--chat-message-background:rgb(231,220,190);--chat-message-border-color:rgb(111,108,102)}.chat-message.whisper{background:rgb(220,220,240)}';
      document.head.prepend(style);
      const message=document.createElement('article');message.id='summary-card';message.className='chat-message whisper';
      message.innerHTML='<section class="tagmar-fx-summary"><div class="tagmar-spell-card"><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22/%3E"></div><h3>Resumo do ataque</h3></section>';
      document.body.append(message);
    });
    assert.equal(await page.locator('#summary-card').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(240, 237, 223)');
    await page.locator('#summary-card img').evaluate(img=>img.decode());
    assert.equal(await page.locator('#summary-card img').evaluate(img=>img.getBoundingClientRect().width),300);
    // CSS real do Foundry 14, inclusive dimensionamento de forms e tema escuro.
    await page.evaluate(async()=>{
      document.body.replaceChildren();document.querySelectorAll('head style').forEach(e=>e.remove());
      document.body.className='theme-dark';
      const link=document.createElement('link');link.rel='stylesheet';link.href='/css/foundry2.css';
      const loaded=new Promise(resolve=>link.onload=resolve);document.head.prepend(link);await loaded;
      flags.cast.shape='circle';openFx(false);
      const dialog=document.querySelector('.tagmar-fx-dialog');dialog.classList.add('application');
      dialog.style.cssText='position:relative;left:20px;top:20px;width:560px;padding:16px;max-height:none;overflow:visible';
      dialog.querySelector('form').classList.add('standard-form');
      for(const key of ['targets','duration','direction'])dialog.querySelector(`[data-cast-section="${key}"]`).open=true;
      dialog.querySelector('.tagmar-fx-animation').open=true;
      const card=document.createElement('article');card.id='actual-summary';card.className='chat-message whisper';
      card.style.cssText='position:absolute;left:610px;top:20px;width:300px;';
      card.innerHTML='<header class="message-header">Donovan Hell — Para: Gamemaster</header><section class="tagmar-fx-summary"><h2 class="mediaeval">Bola de Fogo 5</h2><h3>Resumo do ataque</h3><p>Alvo: vermelho — 75%; dano 27.</p><p>Resultados já aplicados.</p></section>';
      document.body.append(card);
    });
    for(const width of [560,420]){
      await page.locator('.tagmar-fx-dialog').evaluate((e,w)=>e.style.width=w+'px',width);
      const overflows=await page.locator('.tagmar-fx-config :is(input,select,textarea)').evaluateAll(elements=>elements.filter(e=>e.getClientRects().length).flatMap(e=>{
        const r=e.getBoundingClientRect(),p=(e.closest('label')??e.parentElement).getBoundingClientRect(),box=(e.closest('details')??e.closest('form')).getBoundingClientRect();
        return r.right>p.right+1||r.right>box.right+1||r.left<box.left-1?[e.name]:[];
      }));
      assert.deepEqual(overflows,[],`Campos fora das bordas em ${width}px`);
    }
    assert.equal(await page.locator('#actual-summary').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(240, 237, 223)');
    for(const heading of await page.locator('#actual-summary :is(h2,h3)').all())assert.equal(await heading.evaluate(e=>getComputedStyle(e).color),'rgb(25, 24, 19)');
    await page.locator('#actual-summary').evaluate(async e=>{const src=getComputedStyle(e).backgroundImage.match(/url\(["']?(.*?)["']?\)/)[1];const img=new Image();img.src=src;await img.decode();if(!img.naturalWidth)throw Error('Pergaminho ausente');});
    await page.locator('.tagmar-fx-dialog').evaluate(e=>e.style.width='560px');
    if(process.env.TAGMAR_FX_LAYOUT_SCREENSHOT)await page.screenshot({path:process.env.TAGMAR_FX_LAYOUT_SCREENSHOT,fullPage:true});
    if(process.env.TAGMAR_FX_LIGHT_SCREENSHOT)await page.locator('.tagmar-fx-animation').screenshot({path:process.env.TAGMAR_FX_LIGHT_SCREENSHOT});
    await page.evaluate(async()=>{
      document.body.replaceChildren();
      const {targetName,registerChatTargets}=await import('/scripts/chat-targets.mjs');
      const root=document.createElement('div');root.id='targets';root.style.cssText='position:absolute;top:20px;left:20px;color:white';
      root.innerHTML=['one','two','hidden','invisible','blocked','deleted'].map(id=>`<p id="${id}">${targetName('Nome repetido',`Scene.test.Token.${id}`)}</p>`).join('')+`<p id="other">${targetName('Outra cena','Scene.other.Token.one')}</p><p id="prehover">${targetName('Já destacado','Scene.test.Token.prehover')}</p>`;
      document.body.append(root);window.highlights=[];game.user.isGM=false;
      const objects=new Map(['one','two','hidden','invisible','blocked','prehover'].map(id=>[id,{id,visible:true,isVisible:id!=='invisible',document:{hidden:id==='hidden'},hover:id==='prehover',
        _canHover:()=>id!=='blocked',_onHoverIn(){this.hover=true;highlights.push('in:'+id);},_onHoverOut(){this.hover=false;highlights.push('out:'+id);}}]));
      window.canvas={ready:true,scene:{id:'test'},tokens:{get:id=>objects.get(id)}};
      registerChatTargets();
    });
    await page.locator('#one span').hover();assert.deepEqual(await page.evaluate(()=>highlights),['in:one']);
    await page.locator('#two span').hover();assert.deepEqual(await page.evaluate(()=>highlights),['in:one','out:one','in:two']);
    await page.mouse.move(800,400);assert.deepEqual(await page.evaluate(()=>highlights),['in:one','out:one','in:two','out:two']);
    for(const id of ['hidden','invisible','blocked','deleted','other','prehover'])await page.locator(`#${id} span`).hover();
    await page.mouse.move(800,400);assert.equal(await page.evaluate(()=>highlights.length),4);
    await page.locator('#one span').focus();assert.equal(await page.evaluate(()=>highlights.at(-1)),'in:one');
    await page.evaluate(()=>hooks.get('canvasTearDown')());assert.equal(await page.evaluate(()=>highlights.at(-1)),'out:one');
    assert.deepEqual(errors,[]);
    await page.evaluate(()=>{
      document.body.replaceChildren();game.user.isGM=true;item.type='Magia';
      window.creatures=Array.from({length:500},(_,i)=>({uuid:`Actor.wolf${i}`,name:`Lobo ${String(i).padStart(3,'0')}`,type:'NPC',documentName:'Actor',system:{ef_npc:{value:18}},testUserPermission:()=>true}));
      game.actors=creatures;
      window.fromUuid=async uuid=>creatures.find(a=>a.uuid===uuid);
      flags.cast={};openFx(false);
      const d=document.querySelector('.tagmar-fx-dialog');d.classList.add('application');
      d.style.cssText='position:relative;left:20px;top:20px;width:560px;padding:16px;max-height:none;overflow:visible';
      d.querySelector('form').classList.add('standard-form');
    });
    await page.locator('[name=cast_useType]').selectOption('transformation');
    assert(await page.locator('[name=cast_transform]').isChecked());
    assert.equal(await page.locator('[name=jbMode]').inputValue(),'self');
    assert.equal(await page.locator('[name=jbTimeMode]').isDisabled(),false);
    assert.equal(await page.locator('[data-form-list] option').count(),500);
    await page.locator('[data-form-search]').fill('499');
    assert.equal(await page.locator('[data-form-list] option').count(),1);
    await page.locator('[data-form-list]').selectOption('Actor.wolf499');
    await page.waitForFunction(()=>document.querySelector('[name=cast_formUuid]').value==='Actor.wolf499');
    await page.locator('[name=cast_duration]').fill('1');
    await page.locator('[name=cast_unit]').selectOption('hours');
    if(process.env.TAGMAR_TRANSFORM_SCREENSHOT)await page.locator('[data-cast-section=transformation]').screenshot({path:process.env.TAGMAR_TRANSFORM_SCREENSHOT});
    await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
    assert.deepEqual(await page.evaluate(()=>[flags.cast.transform,flags.cast.formUuid,flags.cast.duration,flags.cast.unit]),[true,'Actor.wolf499',1,'hours']);
    await page.evaluate(()=>openFx(false));
    assert.equal(await page.locator('[name=cast_formUuid]').inputValue(),'Actor.wolf499');
    assert.match(await page.locator('[data-form-selected]').innerText(),/Lobo 499/);
    const section=name=>page.locator(`[data-cast-section="${name}"]`);
    assert(await section('resolution').isHidden());
    assert(await section('direction').isHidden());
    assert(await section('transformation').isVisible());
    await page.locator('[data-use-rm]').check();
    assert(await section('resolution').isVisible());
    assert(await page.locator('[name=cast_fa]').isVisible());
    assert(await page.locator('[name=cast_damage]').isHidden());
    await page.locator('[name=cast_repeatRM]').check();
    assert(await page.locator('[name=cast_transform]').isChecked());
    assert(await page.locator('[name=cast_repeatRM]').isChecked());
    assert(await section('targets').isHidden());
    for(const key of ['resolution','transformation','duration'])assert(await section(key).isVisible());
    for(const profile of ['melee','ranged','self','targets','area']){
      await page.locator('[name=cast_useType]').selectOption(profile);
      assert(await section('transformation').isHidden(),profile);
      assert.equal(await page.locator('[name=cast_formUuid]').inputValue(),'Actor.wolf499');
      assert.equal(await page.locator('[name=cast_duration]').inputValue(),'1');
      assert.equal(await page.locator('[name=cast_unit]').inputValue(),'hours');
      assert(await page.locator('[data-cast-destination]').isHidden());
    }
    await page.locator('[name=cast_useType]').selectOption('transformation');
    if(process.env.TAGMAR_FX_PROFILES_SCREENSHOT){
      await page.locator('.tagmar-fx-dialog').evaluate(e=>{e.classList.add('application');e.style.cssText='position:relative;left:20px;top:20px;width:560px;padding:16px;max-height:none;overflow:visible';e.querySelector('form').classList.add('standard-form');});
      await page.locator('.tagmar-fx-dialog').screenshot({path:process.env.TAGMAR_FX_PROFILES_SCREENSHOT});
    }
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>flags.cast.useType),'transformation');
    // Formatos antigos mantêm o destino ao abrir/salvar, sem migração de dados.
    for(const shape of ['self','targets','circle','cone','ray']){
      await page.evaluate(shape=>{flags.cast.shape=shape;openFx(false);},shape);
      const area=!['self','targets'].includes(shape);
      assert.equal(await page.locator('[data-cast-destination]').inputValue(),area?'area':shape);
      assert.equal(await section('targets').isHidden(),!area);
      assert.deepEqual(await page.locator('[data-cast-area-shape] option').evaluateAll(es=>es.map(e=>e.value)),['circle','cone','ray']);
      assert(await page.locator('[data-cast-destination]').isVisible());
      await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
      assert.equal(await page.evaluate(()=>flags.cast.shape),shape);
    }
    await page.evaluate(()=>openFx(false));
    await page.locator('[data-cast-destination]').selectOption('area');
    await page.locator('[data-cast-area-shape]').selectOption('cone');
    await page.locator('[name=cast_distance]').fill('12');
    await page.locator('[data-cast-destination]').selectOption('self');
    assert(await section('targets').isHidden());
    await page.locator('[data-cast-destination]').selectOption('area');
    assert.equal(await page.locator('[name=cast_shape]').inputValue(),'cone');
    assert.equal(await page.locator('[name=cast_distance]').inputValue(),'12');
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>flags.cast.shape),'ray');
    // Perfis antigos são apresentados na lista nova sem alterar regras/destino.
    for(const oldType of ['custom','direct','resistance','effect','technique','melee','ranged'])for(const shape of ['self','targets','circle','cone','ray','point']){
      const before=await page.evaluate(async({oldType,shape})=>{
        flags.cast={useType:oldType,enabled:true,shape,resolution:oldType==='resistance'?'rm':'attack',repeatRM:oldType==='resistance',
          fa:9,column:11,damage:34,defense:true,distance:12,angle:75,width:3,targetFilter:'excludeAllies',includeCaster:true,
          effectName:'Aviso preservado',duration:7,unit:'hours'};
        const {castConfiguration}=await import('/scripts/cast-rules.mjs');const original=castConfiguration(item);delete original.useType;
        openFx(false);return original;
      },{oldType,shape});
      assert.deepEqual(await page.locator('[name=cast_useType] option').evaluateAll(es=>es.map(e=>e.value)),['self','targets','area','point','melee','ranged','transformation','summon']);
      assert(await page.locator('[data-cast-destination]').isHidden());
      assert.equal(await page.locator('[data-cast-section=custom]').count(),0);
      await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
      const after=await page.evaluate(()=>{const result={...flags.cast};delete result.useType;return result;});
      assert.deepEqual(after,{...before,durationShared:true},`${oldType}/${shape}: preservar funcionamento`);
    }
    await page.evaluate(()=>openFx(false));
    await page.locator('[name=cast_useType]').selectOption('self');
    assert.equal(await page.locator('[name=cast_shape]').inputValue(),'self');
    assert(await section('targets').isHidden());
    if(process.env.TAGMAR_FX_UNIFIED_SCREENSHOT){
      await page.locator('.tagmar-fx-dialog').evaluate(e=>{e.classList.add('application');e.style.cssText='position:relative;left:20px;top:20px;width:560px;padding:16px;max-height:none;overflow:visible';e.querySelector('form').classList.add('standard-form');});
      await page.locator('.tagmar-fx-dialog').screenshot({path:process.env.TAGMAR_FX_UNIFIED_SCREENSHOT});
    }
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    await page.evaluate(()=>openFx(false));
    await page.locator('[name=cast_useType]').selectOption('point');
    assert(await section('point').isVisible());
    for(const name of ['targets','resolution','transformation','direction'])assert(await section(name).isHidden());
    assert.equal(await section('duration').isHidden(),await page.locator('[name=jbTimeMode]').inputValue()!=='calendar');
    assert(await page.locator('[data-use-rm]').isHidden());
    assert(await page.locator('[name=cast_targetFilter]').isHidden());
    assert(await page.locator('.tagmar-fx-tokenmagic').isHidden());
    assert.equal(await page.locator('[name=jbMode]').inputValue(),'area');
    assert(await page.locator('[name=jbMode]').isDisabled());
    await page.locator('[name=cast_pointSize]').fill('4');
    await page.locator('[name=cast_pointRotation]').fill('90');
    if(process.env.TAGMAR_FX_POINT_SCREENSHOT){
      await page.locator('.tagmar-fx-dialog').evaluate(e=>{e.classList.add('application');e.style.cssText='position:relative;left:20px;top:20px;width:560px;padding:16px;max-height:none;overflow:visible';e.querySelector('form').classList.add('standard-form');});
      await page.locator('.tagmar-fx-dialog').screenshot({path:process.env.TAGMAR_FX_POINT_SCREENSHOT});
    }
    await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>flags.cast.pointSize),4);
    assert.equal(await page.evaluate(()=>flags.cast.pointRotation),90);
    await page.evaluate(()=>openFx(false));
    assert.equal(await page.locator('[name=cast_useType]').inputValue(),'point');
    await page.locator('[name=cast_useType]').selectOption('self');
    assert.equal(await page.locator('[name=jbMode]').inputValue(),'self');
    assert(!(await page.locator('[name=jbMode]').isDisabled()));
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    // Ocultar a interface preserva filtros salvos e o gatilho automático.
    const savedFilters=await page.evaluate(()=>{
      game.settings.get=()=>undefined;flags.cast={useType:'self',shape:'self',enabled:false};
      flags.visualFx={automatic:true,destination:'self',presets:[{name:'glow',library:'tmfx-main'}]};
      openFx(false);return structuredClone(flags.visualFx);
    });
    assert(await page.locator('.tagmar-fx-tokenmagic').isHidden());
    await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
    assert.deepEqual(await page.evaluate(()=>flags.visualFx),savedFilters);
    await page.evaluate(()=>{game.settings.get=(_m,k)=>k==='showTokenMagic'?true:undefined;openFx(false);});
    assert(await page.locator('.tagmar-fx-tokenmagic').isVisible());
    assert(await page.locator('[name=fxAutomatic]').isChecked());
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    // Portal antigo: duração do visual migra para o único campo, sem exigir nome de aviso.
    await page.evaluate(()=>{
      flags.cast={shape:'point',enabled:true,duration:10,unit:'rounds'};
      flags.jb2aFx={enabled:true,automatic:true,file:'jb2a.arrow.physical.white.01',mode:'area',timeMode:'calendar',gameDuration:2,gameUnit:'hours'};
      openFx(false);
    });
    await page.locator('.tagmar-fx-animation > summary').click();
    await page.locator('[data-jb-edit-duration]').click();
    assert.equal(await page.locator('[name=cast_duration]').inputValue(),'2');
    assert.equal(await page.locator('[name=cast_unit]').inputValue(),'hours');
    assert(await page.locator('[name=cast_effectName]').isHidden());
    assert.equal(await page.locator('[name=jbGameDuration], [name=jbGameUnit]').count(),0);
    await page.locator('[name=cast_duration]').fill('10');
    await page.locator('[name=cast_unit]').selectOption('rounds');
    assert.match(await page.locator('[data-jb-game-duration]').innerText(),/10 rodadas/);
    await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
    assert.deepEqual(await page.evaluate(()=>[flags.cast.durationShared,flags.cast.duration,flags.cast.unit,flags.jb2aFx.gameDuration,flags.jb2aFx.gameUnit]),[true,10,'rounds',150,'seconds']);
    await page.evaluate(()=>openFx(false));
    await page.locator('.tagmar-fx-animation > summary').click();
    await page.locator('[data-jb-edit-duration]').click();
    assert.equal(await page.locator('[name=cast_duration]').inputValue(),'10');
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    // Aviso + animação com a mesma duração; lampejo continua sendo independente.
    await page.evaluate(()=>{
      flags.cast={shape:'targets',enabled:true,effectName:'Sono',duration:1,unit:'hours'};
      flags.jb2aFx={...flags.jb2aFx,mode:'targets',gameDuration:2,gameUnit:'hours'};
      openFx(false);
      for(const sel of ['[data-cast-section="duration"]','.tagmar-fx-animation'])document.querySelector(sel).open=true;
    });
    assert.equal(await page.locator('[name=cast_duration]').inputValue(),'1');
    assert.match(await page.locator('[data-jb-game-duration]').innerText(),/1 hora/);
    if(process.env.TAGMAR_FX_DURATION_SCREENSHOT){
      await page.locator('.tagmar-fx-dialog').evaluate(e=>{e.classList.add('application');e.style.cssText='position:relative;left:20px;top:20px;width:560px;padding:16px;max-height:none;overflow:visible';e.querySelector('form').classList.add('standard-form');});
      await page.locator('.tagmar-fx-dialog').screenshot({path:process.env.TAGMAR_FX_DURATION_SCREENSHOT});
    }
    await page.locator('[name=jbTimeMode]').selectOption('animation');
    assert(await page.locator('[name=cast_duration]').isVisible());
    assert(await page.locator('[name=jbDuration]').isVisible());
    await page.locator('[name=jbDuration]').fill('1');
    await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
    assert.deepEqual(await page.evaluate(()=>[flags.cast.duration,flags.cast.unit,flags.jb2aFx.timeMode,flags.jb2aFx.duration]),[1,'hours','animation',1]);
    // Invisibilidade em Animação — JB2A, independente da animação e da biblioteca.
    await page.evaluate(()=>{flags.cast={useType:'self',shape:'self',resolution:'none',enabled:false};flags.jb2aFx={enabled:false};openFx(false);});
    await page.locator('.tagmar-fx-animation > summary').click();
    assert.equal(await page.locator('[data-cast-section=resolution] [name=cast_invisible]').count(),0);
    assert.equal(await page.locator('.tagmar-fx-animation [name=cast_invisible]').count(),1);
    assert(!await page.locator('[name=jbEnabled]').isChecked());
    await page.locator('[name=cast_invisible]').check();
    assert(await page.locator('[name=cast_enabled]').isChecked());
    assert(await page.locator('[name=cast_duration]').isVisible());
    await page.locator('[name=cast_duration]').fill('1');await page.locator('[name=cast_unit]').selectOption('hours');
    await page.locator('[data-help-for=cast_invisible]').focus();
    assert.match(await page.locator('.tagmar-fx-help-tooltip').innerText(),/Visão dos tokens/);
    await page.keyboard.press('Escape');
    if(process.env.TAGMAR_INVISIBILITY_SCREENSHOT)await page.locator('.tagmar-fx-dialog').screenshot({path:process.env.TAGMAR_INVISIBILITY_SCREENSHOT});
    await page.locator('[data-action=save]').click();await page.evaluate(()=>done);
    assert.deepEqual(await page.evaluate(()=>[flags.cast.invisible,flags.cast.duration,flags.cast.unit,flags.cast.enabled]),[true,1,'hours',true]);
    assert.equal(await page.evaluate(()=>flags.jb2aFx.enabled),false);
    await page.evaluate(()=>openFx(false));
    assert(await page.locator('[name=cast_invisible]').isChecked());
    assert(await page.locator('[name=cast_invisible]').isVisible());
    await page.locator('[name=cast_useType]').selectOption('point');
    assert(!await page.locator('[name=cast_invisible]').isVisible());
    await page.locator('[data-action=cancel]').click();await page.evaluate(()=>done);
    assert.deepEqual(errors,[]);
    await page.evaluate(()=>{
      const oldGet=game.settings.get;window.allowedSummons=[];
      game.settings.get=(m,k)=>k==='summonForms'?allowedSummons:oldGet(m,k);
      game.settings.set=async(m,k,v)=>{if(k==='summonForms')allowedSummons=v;};
      flags.cast={};flags.jb2aFx={enabled:false};openFx(false);
    });
    await page.locator('[name=cast_useType]').selectOption('summon');
    assert(await page.locator('[data-use-rm]').isHidden());
    assert(await page.locator('[name=cast_transform]').isHidden());
    assert(await page.locator('[data-cast-destination]').isHidden());
    assert(await page.locator('[name=cast_duration]').isVisible());
    assert(!await page.locator('[name=jbEnabled]').isChecked());
    await page.locator('[data-form-search]').fill('499');
    await page.locator('[data-form-list]').selectOption('Actor.wolf499');
    await page.waitForFunction(()=>document.querySelector('[name=cast_formUuid]').value==='Actor.wolf499');
    await page.locator('[data-add-summon]').click();
    await page.locator('[data-summon-quantity="0"]').fill('3');
    await page.locator('[name=cast_summonDelay]').fill('2');
    await page.locator('[data-form-search]').fill('498');
    await page.locator('[data-form-list]').selectOption('Actor.wolf498');
    await page.waitForFunction(()=>document.querySelector('[name=cast_formUuid]').value==='Actor.wolf498');
    await page.locator('[data-add-summon]').click();
    assert.equal(await page.locator('[data-summon-row]').count(),2);
    await page.locator('[data-remove-summon="1"]').click();
    assert.equal(await page.locator('[data-summon-row]').count(),1);
    await page.locator('[name=cast_duration]').fill('5');await page.locator('[name=cast_unit]').selectOption('minutes');
    if(process.env.TAGMAR_SUMMON_SCREENSHOT){
      await page.locator('.tagmar-fx-dialog').evaluate(e=>{e.classList.add('application');e.style.cssText='position:relative;width:560px;padding:16px;max-height:none';e.querySelector('form').classList.add('standard-form');});
      await page.locator('.tagmar-fx-dialog').screenshot({path:process.env.TAGMAR_SUMMON_SCREENSHOT});
    }
    await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.evaluate(()=>done);
    assert.deepEqual(await page.evaluate(()=>[flags.cast.summon,flags.cast.duration,flags.cast.unit,allowedSummons]),[true,5,'minutes',['Actor.wolf499']]);
    assert.deepEqual(await page.evaluate(()=>[flags.cast.summonDelay,flags.cast.summons.map(e=>[e.formUuid,e.quantity])]),[2,[['Actor.wolf499',3]]]);
    await page.evaluate(()=>{game.user.isGM=false;openFx(false);});
    assert.equal(await page.locator('[name=cast_useType]').inputValue(),'summon');
    assert.equal(await page.locator('[data-form-list] option').count(),1);
    assert.equal(await page.locator('[data-summon-quantity="0"]').inputValue(),'3');
    assert.equal(await page.locator('[name=cast_summonDelay]').inputValue(),'2');
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>done);
    // Prévia com imagem: confirma no clique e destrói a prévia ao confirmar/cancelar.
    await page.evaluate(async()=>{
      document.body.replaceChildren();const view=document.createElement('canvas');view.style.cssText='position:fixed;left:0;top:0;width:600px;height:400px';document.body.append(view);
      window.spriteState={destroyed:0};
      PIXI.Sprite=class {constructor(){this.anchor={set:()=>{}};this.position={set:(x,y)=>Object.assign(spriteState,{x,y})};}destroy(){spriteState.destroyed++;}};
      foundry.canvas={loadTexture:async()=>({})};
      canvas={ready:true,scene:{id:'preview',grid:{size:100,distance:1}},app:{canvas:view,renderer:{screen:{width:600,height:400}}},stage:{addChild:()=>{},toLocal:p=>p}};
      const {placeArea}=await import('/scripts/area-preview.mjs');
      window.startPreview=()=>placeArea({shape:'point',pointSize:2,pointRotation:0},{canvas,PIXI,document,Hooks,tokenPreview:{src:'token.webp',width:2,height:1}});
      window.placement=startPreview();
    });
    await page.mouse.move(250,200);await page.mouse.click(250,200);
    assert.deepEqual(await page.evaluate(async()=>{const p=await placement;return[p.origin.x,p.origin.y,spriteState.destroyed];}),[250,200,1]);
    await page.evaluate(()=>{window.placement=startPreview();});await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(async()=>await placement),null);assert.equal(await page.evaluate(()=>spriteState.destroyed),2);
    // Uso real do controlador: três cliques geram uma única solicitação; Esc no meio não envia nada.
    await page.evaluate(async()=>{
      game.user.isGM=true;game.user.active=true;game.users=[game.user];game.time={worldTime:0};
      game.modules.set('tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:0})}});
      for(const form of creatures)form.prototypeToken={toObject:()=>({width:1,height:1,texture:{src:'creature.webp'}})};
      foundry.utils={escapeHTML:s=>String(s)};
      item.actor.testUserPermission=()=>true;
      const source={id:'source',actor:item.actor,center:{x:100,y:100},document:{id:'source',isOwner:true},controlled:true};
      canvas.tokens={placeables:[source]};window.submitted=[];
      window.ChatMessage={getSpeaker:()=>({}),create:async data=>{submitted.push(data);return data;}};
      window.useSummon=(await import('/scripts/casts.mjs')).handleItemUse;
      window.usePromise=useSummon(item);
    });
    await page.waitForSelector('.tagmar-fx-area-hint');await page.mouse.click(150,150);
    await page.waitForFunction(()=>spriteState.destroyed===3&&document.querySelector('.tagmar-fx-area-hint'));
    assert.equal(await page.evaluate(()=>submitted.length),0);await page.mouse.click(300,150);
    await page.waitForFunction(()=>spriteState.destroyed===4&&document.querySelector('.tagmar-fx-area-hint'));
    await page.mouse.click(450,150);await page.evaluate(()=>usePromise);
    assert.deepEqual(await page.evaluate(()=>submitted[0].flags['tagmar-token-fx'].castRequest.summonPoints),[{x:150,y:150},{x:300,y:150},{x:450,y:150}]);
    assert.equal(await page.evaluate(()=>submitted.length),1);
    await page.evaluate(()=>{window.usePromise=useSummon(item);});await page.waitForSelector('.tagmar-fx-area-hint');await page.mouse.click(150,250);
    await page.waitForFunction(()=>spriteState.destroyed===6&&document.querySelector('.tagmar-fx-area-hint'));
    await page.keyboard.press('Escape');await page.evaluate(()=>usePromise);assert.equal(await page.evaluate(()=>submitted.length),1);
    await page.evaluate(async()=>{
      const {calendarNow}=await import('/scripts/timers.mjs');
      const {renderSpellTimes}=await import('/scripts/spell-times.mjs');
      const actor=item.actor;actor.effects=[];actor.items=[];game.actors=[];
      canvas.scene.tokens=[];
      canvas.scene.getFlag=(_s,k)=>k==='summonQueue'?[{id:'waiting',name:'Replicar',img:'replicar.webp',status:'waiting',casterUuid:actor.uuid,dueAt:calendarNow(game)+30,entries:[1,2,3]}]:null;
      game.scenes=[canvas.scene];game.scenes.get=id=>game.scenes.find(s=>s.id===id);
      const root=document.createElement('div');root.id='waiting-sheet';
      root.innerHTML='<nav class="prim-tabs"></nav><div class="sheet-primary"><div class="tab active" data-tab="efeitos"></div></div>';document.body.append(root);
      renderSpellTimes({actor},root);
    });
    assert.match(await page.locator('#waiting-sheet').innerText(),/Invocações aguardando/);
    assert.match(await page.locator('#waiting-sheet').innerText(),/3 criatura\(s\)/);
    assert.match(await page.locator('#waiting-sheet').innerText(),/Restam 30 s/);
    await page.locator('[data-cancel-summon]').click();
    assert.equal(await page.evaluate(()=>submitted.at(-1).flags['tagmar-token-fx'].cancelSummon.id),'waiting');
    await page.evaluate(async()=>{
      const {renderSheetAdjustments}=await import('/scripts/sheet-adjustments.mjs');window.showAdjustments=renderSheetAdjustments;
      const root=document.querySelector('#waiting-sheet');
      root.insertAdjacentHTML('afterbegin','<div><label>Habilidades</label><input name="system.bonus_habil" value="0"></div><div><label>Combate</label><input name="system.inf_ataque.bonus" value="0"></div>');
      item.actor.effects=[{name:'Bruma',changes:[{key:'system.tagmarFxSkillAdjustment',value:'-7'},{key:'system.tagmarFxCombatAdjustment',value:'-7'}]}];
      renderSheetAdjustments(item.actor,root);renderSheetAdjustments(item.actor,root);
    });
    assert.equal(await page.locator('[data-tagmar-adjustment]').count(),2);
    for(const kind of ['skill','combat'])for(const output of ['effect','total'])assert.equal(await page.locator(`[data-tagmar-adjustment=${kind}] [data-adjustment-output=${output}]`).inputValue(),'-7');
    assert.equal(await page.locator('[data-adjustment-output][readonly]').count(),4);
    assert.equal(await page.locator('[data-adjustment-output][name]').count(),0);
    assert.equal(await page.locator('[name="system.bonus_habil"]').inputValue(),'0');
    if(process.env.TAGMAR_ADJUSTMENT_SCREENSHOT){
      await page.locator('#waiting-sheet').evaluate(e=>{e.style.cssText='position:relative;z-index:5;width:480px;padding:16px;background:#211b27;color:#eee';e.querySelectorAll('input').forEach(f=>{f.style.cssText='display:block;background:#392f40;color:white;width:100px';});});
      await page.locator('#waiting-sheet').screenshot({path:process.env.TAGMAR_ADJUSTMENT_SCREENSHOT});
    }
    await page.locator('[name="system.inf_ataque.bonus"]').fill('2');
    assert.equal(await page.locator('[data-tagmar-adjustment=combat] [data-adjustment-output=total]').inputValue(),'-5');
    await page.evaluate(()=>{item.actor.effects[0].disabled=true;showAdjustments(item.actor,document.querySelector('#waiting-sheet'));});
    assert.equal(await page.locator('[data-tagmar-adjustment]').count(),2);
    assert.equal(await page.locator('[data-tagmar-adjustment=combat] [data-adjustment-output=effect]').inputValue(),'0');
    assert.equal(await page.locator('[data-tagmar-adjustment=combat] [data-adjustment-output=total]').inputValue(),'2');
    assert.equal(await page.locator('[name="system.inf_ataque.bonus"]').inputValue(),'2');
    // Editor real de múltiplos bônus: dano/EH/EF exclusivos, persistência e reabertura.
    await page.evaluate(()=>{
      document.body.replaceChildren();
      flags.cast={enabled:true,useType:'self',shape:'self',resolution:'none',resourceMode:'damage',damage:12,duration:2,unit:'rounds'};
      flags.jb2aFx={enabled:false};openFx();
    });
    await page.locator('[name="cast_resourceMode"]').selectOption('bonuses');
    assert.equal(await page.locator('[name="cast_damage"]').isVisible(),false);
    assert.equal(await page.locator('[name="cast_damage"]').inputValue(),'0');
    assert.equal(await page.locator('[name="cast_resolution"] option[value=attack]').evaluate(e=>e.disabled),true);
    for(const [key,value] of [['EH','10'],['EF','5'],['FOR','2']]){
      await page.locator('[data-add-bonus]').click();
      const row=page.locator('[data-bonus-row]').last();
      await row.locator('[data-bonus-attribute]').selectOption(key);
      await row.locator('[data-bonus-value]').fill(value);
      await row.locator('[data-bonus-value]').press('Tab');
    }
    assert.equal(await page.locator('[data-bonus-row]').count(),3);
    const saved=await page.evaluate(()=>JSON.parse(document.querySelector('[name="cast_bonuses"]').value));
    assert.deepEqual(saved,[{attribute:'EH',value:10},{attribute:'EF',value:5},{attribute:'FOR',value:2}]);
    await page.locator('[name="cast_resourceMode"]').selectOption('damage');
    assert.equal(await page.locator('[data-bonus-settings]').isVisible(),false);
    await page.locator('[name="cast_resourceMode"]').selectOption('bonuses');
    assert.equal(await page.locator('[data-bonus-row]').count(),3);
    if(process.env.TAGMAR_BONUS_SCREENSHOT){
      await page.evaluate(()=>{document.querySelectorAll('.tagmar-fx-section').forEach(d=>d.open=d.dataset.castSection==='resolution'||d.dataset.castSection==='duration');});
      await page.screenshot({path:process.env.TAGMAR_BONUS_SCREENSHOT,fullPage:true});
    }
    await page.locator('button[data-action="save"]').click();await page.evaluate(()=>done);
    assert.equal(await page.evaluate(()=>flags.cast.damage),0);
    assert.deepEqual(await page.evaluate(()=>flags.cast.bonuses),saved);
    await page.evaluate(()=>openFx());
    assert.equal(await page.locator('[name="cast_resourceMode"]').inputValue(),'bonuses');
    assert.equal(await page.locator('[data-bonus-row]').count(),3);
    await page.locator('[data-bonus-row]').last().locator('[data-remove-bonus]').click();
    assert.equal(await page.locator('[data-bonus-row]').count(),2);
    await page.locator('button[data-action="cancel"]').click();await page.evaluate(()=>done);
    assert.deepEqual(errors,[]);
    console.log('Interface OK: perfis existentes, invocação opcional sem JB2A, autorização GM, lista do jogador, duração, prévia com imagem, clique e Esc. Nenhum mundo real acessado.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
