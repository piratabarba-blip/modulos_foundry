const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require(path.join(process.env.TAGMAR_TEST_NODE_MODULES,'playwright'));
(async()=>{
  const root=path.resolve(__dirname,'../tagmar-ammu-nation');
  const source=await fs.readFile(path.join(root,'scripts/main.js'),'utf8');
  const template=await fs.readFile(path.join(root,'templates/dialogAmmo.hbs'),'utf8');
  const jquery=await fs.readFile(path.join(process.env.TAGMAR_TEST_FOUNDRY_APP,'node_modules/jquery/dist/jquery.js'),'utf8');
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.setContent('<style>.deleteMunicao{display:inline-block;width:20px;height:20px}</style><div id="sheet"><div class="combate"><table></table></div></div>');
    await page.addScriptTag({content:jquery});
    await page.evaluate(template=>{
      window.hooks={}; window.Hooks={on:(key,fn)=>hooks[key]=fn};
      window.saved=[];window.itemAmmo=[];
      window.actor={type:'Personagem',items:[{type:'Combate',name:'Arco',update:async d=>itemAmmo.push(d['system.municao'])}],
        getFlag:(_s,key)=>key==='municoes'?structuredClone(saved):key==='Arco'?'Flecha':null,
        setFlag:async(_s,_k,data)=>{saved=structuredClone(data);},unsetFlag:async()=>{saved=[];}};
      $.get=(_url,callback)=>callback(template);
      window.foundry={applications:{api:{DialogV2:{wait:config=>new Promise(resolve=>{
        const root=document.createElement('section');root.innerHTML='<form>'+config.content+'</form>';document.body.append(root);
        const form=root.querySelector('form');
        for(const entry of config.buttons){const button=document.createElement('button');button.type='submit';button.textContent=entry.label;button.dataset.action=entry.action;form.append(button);}
        form.addEventListener('submit',async e=>{e.preventDefault();const entry=config.buttons.find(b=>b.action===e.submitter?.dataset.action)||config.buttons.find(b=>b.default);await entry.callback?.(e,e.submitter,{element:root});root.remove();resolve(entry.action);});
        config.render(null,{element:root});
      })}}}};
    },template);
    await page.addScriptTag({content:source});
    await page.evaluate(()=>hooks.renderActorSheet({actor},document.querySelector('#sheet'),{}));
    await page.locator('.botaoMunicao').click();
    await page.locator('.nome_municao').fill('Flecha');await page.locator('.quant_municao').fill('24');
    await page.locator('.quant_municao').press('Enter');
    await page.waitForFunction(()=>saved[0]?.quant==='24');
    assert.equal(await page.locator('section').count(),1);
    assert.deepEqual(await page.evaluate(()=>itemAmmo),['24']);
    await page.locator('.nome_municao').fill('Flecha');await page.locator('.quant_municao').fill('10');
    await page.locator('.nome_municao').press('Enter');
    await page.waitForFunction(()=>saved[0]?.quant==='10');assert.equal(await page.evaluate(()=>saved.length),1);
    await page.locator('.deleteMunicao').click();await page.waitForFunction(()=>saved.length===0);
    await page.getByRole('button',{name:'Fechar'}).click();assert.equal(await page.locator('section').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: munições em DialogV2; Enter adiciona/atualiza sem fechar, arma sincronizada, exclusão e Fechar sem callback indefinido.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
