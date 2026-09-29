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
  for (const file of ['scripts/main.js', 'scripts/core.mjs', 'styles/config.css']) {
    routes['/' + file] = await fs.readFile(path.join(root, file));
  }
  const server = http.createServer((req, res) => {
    if (routes[req.url]) {
      res.setHeader('Content-Type', req.url.endsWith('.css') ? 'text/css' : 'text/javascript');
      return res.end(routes[req.url]);
    }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><link rel="stylesheet" href="/styles/config.css"><style>body{background:#16121c;color:#e9dfd2;font:16px Arial;padding:20px}section{width:530px;background:#29232d;padding:20px;border:1px solid #75667b;border-radius:6px}button,select,input{font:inherit}button,select,input[type=search]{padding:7px;background:#403545;color:inherit;border:1px solid #938599;border-radius:3px}input[type=checkbox]{width:18px;height:18px}.hint{font-size:13px;color:#d2c6c5}footer{display:flex;gap:8px;margin-top:16px}button{flex:1}h2{margin-top:0}</style><body></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true, channel: 'msedge'});
    const page = await browser.newPage({viewport: {width: 950, height: 850}});
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async () => {
      window.hooks = new Map(); window.Hooks = {on: (name, fn) => hooks.set(name, fn)};
      window.flags = {}; window.calls = []; window.notices = [];
      window.game = {system: {id: 'tagmar_rpg'}, user: {id: 'gm', isGM: true, targets: new Set()}, modules: new Map([['tokenmagic', {active: true}]])};
      window.ui = {notifications: {info: text => notices.push(text), warn: text => notices.push(text)}};
      const actor = {uuid: 'Actor.test', name: 'Teste', isOwner: true};
      window.item = {uuid: 'Actor.test.Item.glow', type: 'Magia', name: 'Magia — teste visual', actor, isOwner: true,
        getFlag: (_scope, key) => flags[key], setFlag: async (_scope, key, value) => { flags[key] = value; }};
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
      window.openFx = () => { window.done = entry.configureItem(item); };
    });
    await page.evaluate(() => openFx());
    assert.equal(await page.locator('[data-fx-row]').count(), 3);
    assert.equal(await page.locator('[name=fxAutomatic]').isChecked(), false);
    await page.locator('[data-fx-search]').fill('glow');
    assert.equal(await page.locator('[data-fx-row]:visible').count(), 1);
    await page.locator('[data-fx-row]:visible input').check();
    if (process.env.TAGMAR_FX_SCREENSHOT) await page.screenshot({path: process.env.TAGMAR_FX_SCREENSHOT});
    await page.getByRole('button', {name: 'Testar', exact: true}).click();
    await page.evaluate(() => done);
    assert.deepEqual(await page.evaluate(() => calls), ['add']);
    assert.deepEqual(await page.evaluate(() => flags), {});
    await page.evaluate(() => openFx());
    await page.getByRole('button', {name: 'Remover', exact: true}).click();
    await page.evaluate(() => done);
    assert.equal(await page.evaluate(() => token.state.length), 0);
    await page.evaluate(() => openFx());
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
    assert.deepEqual(errors, []);
    console.log('Interface OK: busca, seleção, Testar sem salvar, remoção seletiva, Salvar, reabertura e Cancelar. Nenhum mundo real acessado.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
