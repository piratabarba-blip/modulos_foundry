import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {animationCatalog,animationLabel,resolveAnimation} from '../tagmar-token-fx/scripts/animation-labels.mjs';
assert.equal(animationLabel('jb2a.arrow.physical.white.01'),'Flecha · Tipo físico · Cor branca · Variante 01');
assert.equal(animationLabel('jb2a.template_circle.vortex.loop.blue'),'Área circular · Vórtice · Contínuo · Cor azul');
const paths=['jb2a.shield.01.complete.blue','jb2a.template_circle.vortex.loop.blue','jb2a.new_effect.green','jb2a.foo.default','jb2a.foo.standard'];
const catalog=animationCatalog(paths);
for(const row of catalog)assert.equal(resolveAnimation(row.value,catalog),row.path);
assert.equal(resolveAnimation('area circular · vortice · continuo · cor azul',catalog),paths[1]);
assert.equal(resolveAnimation('jb2a.legacy.unknown',catalog),'jb2a.legacy.unknown');
assert.equal(resolveAnimation('Escudo',catalog),''); // texto parcial não seleciona arbitrariamente.
assert.equal(new Set(catalog.map(r=>r.value)).size,paths.length); // colisões permanecem distintas.
if(process.env.TAGMAR_TEST_JB2A){
  // Banco instalado: somente declarações de dados, isoladas, sem Foundry/mundo.
  let source=await readFile(process.env.TAGMAR_TEST_JB2A,'utf8');
  source=source.replace('export async function','async function').replace(/export\s*\{[^}]*\};?/g,'');
  const context=vm.createContext({});
  const data=await vm.runInContext(source+';jb2aFreeDatabase("modules").then(()=>freeDatabase)',context,{timeout:5000});
  const real=[];
  function walk(value,keys){
    if(typeof value==='string'||Array.isArray(value)){real.push(keys.join('.'));return;}
    for(const [key,child] of Object.entries(value??{}))if(!key.startsWith('_'))walk(child,[...keys,key]);
  }
  walk(data,['jb2a']);const translated=animationCatalog(real);
  for(const row of translated)assert.equal(resolveAnimation(row.value,translated),row.path);
  console.log(`PASS: ${translated.length} variantes instaladas mantêm o identificador original após seleção em português.`);
}
console.log('PASS: nomes, cores, fases, acentos, colisões, códigos legados e nomes novos.');
