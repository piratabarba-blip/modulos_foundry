const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [runtime,output]=process.argv.slice(2);
const {chromium}=require(path.join(runtime,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    fs.mkdirSync(output,{recursive:true});
    const page=await browser.newPage({viewport:{width:1366,height:768}});
    await page.route('**/hud-tooltips.mjs',route=>route.fulfill({body:fs.readFileSync(path.join(root,'scripts/hud-tooltips.mjs')),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}}));
    const css=fs.readFileSync(path.join(root,'styles/calendar.css'),'utf8');
    const text='🌊 Maré enchendo · Preamar 02:15 — Três luas · Nível relativo: 0,59 m. Influências: Agmarim 2,1, Armina 0,6, Denégria 0,3. Cada ponto equivale a 1/3 da amplitude configurada. Atraso local: 0 h. Parâmetros fictícios, não massas ou tamanhos oficiais. Inclui luas abaixo do horizonte; não prevê profundidade, correntes, vento ou atração solar. Aventura: O Décimo Trono. Referência externa, independente dos efeitos aplicados no mapa. Clique para configurar a cena.';
    for(const c of [
      {name:'below',x:300,y:20,height:200,scale:1,side:'bottom'},
      {name:'bottom-left',x:20,y:540,height:200,scale:1,side:'right'},
      {name:'bottom-right',x:980,y:540,height:200,scale:1,side:'left'},
      {name:'scaled',x:20,y:40,height:552,scale:1.25,side:'right'},
      {name:'wheel-left',x:500,y:40,height:552,scale:1,side:'left',wheel:true},
      {name:'wheel-right',x:500,y:40,height:552,scale:1,side:'right',wheel:true,right:true}
    ]) {
      await page.setContent(`<html><head><base href="http://calendar-test.local/"><style>${css}
        body{background:#333942}.tagmar-calendar{left:${c.x}px;top:${c.y}px}.tagmar-calendar .calendar-shell{height:${c.height}px;--hud-scale:${c.scale}}
        .test-title{color:#ece2c4;text-align:center;margin-top:30px}.test-information{position:absolute;left:10px;right:10px;top:auto;bottom:12px}
        .wheel-target{position:absolute;top:140px;${c.right?'right':'left'}:10px}
      </style></head><body><section class="tagmar-calendar"><div class="calendar-shell"><h2 class="test-title">Calendário Tagmar</h2>
        <button class="wheel-target" title="Dia festivo — descrição do evento">18</button>
        <section class="hud-information test-information"><button class="tide-row environment-row" data-calendar-tip="${text}">🌊 Maré enchendo · Preamar 02:15</button></section>
      </div></section></body></html>`);
      await page.evaluate(async()=>{
        window.tipModule=await import('http://calendar-test.local/hud-tooltips.mjs');
        window.dispose=tipModule.activateCalendarTooltips(document.querySelector('.tagmar-calendar'));
      });
      const target=page.locator(c.wheel?'.wheel-target':'.tide-row');
      await target.hover();
      const tip=page.locator('#tagmar-calendar-day-tooltip');
      await tip.waitFor({state:'visible'});
      assert.equal(await tip.getAttribute('data-side'),c.side,c.name);
      const t=await tip.boundingBox(),h=await page.locator('.calendar-shell').boundingBox();
      assert.ok(t.x>=0&&t.y>=0&&t.x+t.width<=1366.1&&t.y+t.height<=768.1,c.name+' within screen');
      assert.ok(t.x>=h.x+h.width || t.x+t.width<=h.x || t.y>=h.y+h.height || t.y+t.height<=h.y,c.name+' outside calendar');
      if(c.name==='below'||c.name==='bottom-left') await page.screenshot({path:path.join(output,c.name+'.png')});
      await target.focus(); await target.press('Escape');assert.equal(await tip.count(),0);
      await target.blur(); await target.focus();await tip.waitFor({state:'visible'});
      await page.evaluate(()=>dispose());assert.equal(await tip.count(),0);
      assert.equal(await target.getAttribute('aria-describedby'),null);
    }
    // User-authored messages remain inert text.
    await page.evaluate(()=>{
      const target=document.querySelector('.tide-row');
      target.dataset.calendarTip='<img src=x onerror=alert(1)>';
      window.dispose=tipModule.activateCalendarTooltips(document.querySelector('.tagmar-calendar'));
      target.focus();
    });
    assert.equal(await page.locator('#tagmar-calendar-day-tooltip img').count(),0);
    console.log('PASS: below/left/right positions, edge fallback, scaled calendar, focus/Escape/cleanup and inert user text.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
