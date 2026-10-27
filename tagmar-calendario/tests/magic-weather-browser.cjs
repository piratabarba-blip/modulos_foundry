const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const [foundryRoot,runtime,output]=process.argv.slice(2);
const {chromium}=require(path.join(runtime,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
  const {magicWeatherFields}=await import(pathToFileURL(path.join(root,'scripts/magic-weather-settings.mjs')));
  const content=magicWeatherFields({date:{absoluteDay:0},worldTime:0,weather:{condition:'rain',temperature:18,wind:12,windDirection:45}});
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    fs.mkdirSync(output,{recursive:true});
    const page=await browser.newPage({viewport:{width:1000,height:800}});
    await page.route('**/*',route=>{
      const name=path.basename(new URL(route.request().url()).pathname);
      if(['magic-weather-settings.mjs','magic-weather.mjs','weather.mjs','daylight.mjs','lunar.mjs','scene-preset.mjs'].includes(name))
        return route.fulfill({body:fs.readFileSync(path.join(root,'scripts',name)),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
      return route.abort();
    });
    await page.setContent(`<html><head><base href="http://calendar-test.local/"><style>${fs.readFileSync(path.join(foundryRoot,'public/css/foundry2.css'),'utf8')}
      ${fs.readFileSync(path.join(root,'styles/calendar.css'),'utf8')}
      body{background:#151a20}.tagmar-calendar-settings{position:absolute;left:210px;top:40px;width:560px}
      </style></head><body class="theme-dark"><div class="application tagmar-calendar-settings"><header class="window-header"><h1 class="window-title">Calendário — clima mágico e iluminação</h1></header>
      <form class="window-content standard-form">${content}<details><summary>Dia e noite — ajustes da cena</summary><p>Latitude e ciclo de iluminação</p></details>
      <footer class="form-footer"><button type="button">Aplicar magia</button><button type="button" disabled>Encerrar magia</button><button type="button">Salvar luz</button></footer></form></div></body></html>`);
    await page.getByLabel('Clima',{exact:true}).selectOption('storm');
    await page.getByLabel('Temperatura (°C)',{exact:true}).fill('15');
    await page.getByLabel('Horas de duração').fill('2');
    await page.getByLabel('Minutos de duração').fill('30');
    const input=await page.evaluate(async()=>{
      const {magicWeatherInput}=await import('http://calendar-test.local/scripts/magic-weather-settings.mjs');
      return magicWeatherInput(document.querySelector('form'));
    });
    assert.equal(input.duration,9000);assert.equal(input.weather.condition,'storm');assert.equal(input.weather.windDirection,45);
    const bounds=await page.locator('.tagmar-calendar-settings').boundingBox();
    assert.ok(bounds.y+bounds.height<=800,'Settings fit on screen');
    assert.ok(await page.locator('form').evaluate(el=>el.scrollWidth<=el.clientWidth),'No horizontal overflow');
    await page.screenshot({path:path.join(output,'magic-weather-settings.png')});
    await page.getByLabel('Horas de duração').fill('0');
    await page.getByLabel('Minutos de duração').fill('0');
    assert.equal(await page.evaluate(async()=>{
      const {magicWeatherInput}=await import('http://calendar-test.local/scripts/magic-weather-settings.mjs');
      try {magicWeatherInput(document.querySelector('form'));return false;} catch{return true;}
    }),true);
    console.log('PASS: weather form controls, duration parsing, zero rejection and settings layout. Native CSS; not a live-world test.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
