import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pickerChoices} from '../scripts/picker-choices.mjs';
const packs=JSON.parse(fs.readFileSync(process.env.TAGMAR_TEST_PACKS??'outputs/gerador-personagens-20261109/listas-ats/xxx-packs.json','utf8'));
const catalog=packs.flatMap(p=>p.items.map(i=>({...i,key:p.collection+'.'+i._id})));

test('cópias reais de técnicas/magias viram uma opção, sem alterar o catálogo',()=>{
 const before=JSON.stringify(catalog);
 for(const name of ['Ambidestria','Bola de Fogo']){
  const copies=catalog.filter(i=>i.name===name);assert.ok(copies.length>1);
  const choices=pickerChoices(copies);assert.equal(choices.length,1);assert.equal(choices[0].copies,copies.length);assert.equal(choices[0].key,copies[0].key);
  assert.match(choices[0].title,/ocultas/);
  assert.equal(pickerChoices(copies,{excluded:[copies.at(-1)]}).length,0);
 }
 assert.equal(JSON.stringify(catalog),before);
});

test('filtra a profissão antes de consolidar e conserva a chave de aquisição',()=>{
 const copies=catalog.filter(i=>i.name==='Ambidestria'),cheap=copies.find(i=>Number(i.system.custo)===1),expensive=copies.find(i=>Number(i.system.custo)===2);
 assert.ok(cheap&&expensive);
 assert.equal(pickerChoices([expensive])[0].key,expensive.key);
 assert.equal(pickerChoices([cheap])[0].key,cheap.key);
});

test('não confunde tipos ou nomes diferentes; aceita acentos e exclui homônimos adicionados',()=>{
 const items=[{key:'a',name:'Lâmina',type:'Combate'},{key:'b',name:'Lamina',type:'Combate'},{key:'c',name:'Lâmina',type:'Pertence'},{key:'d',name:'Lâmina 2',type:'Combate'}];
 const choices=pickerChoices(items);assert.equal(choices.length,3);assert.equal(new Set(choices.map(i=>i.name)).size,3);
 const excluded=pickerChoices(items,{excluded:[{name:'LAMINA',type:'Combate'}]});assert.equal(excluded.length,2);assert.ok(excluded.some(i=>i.key==='c'));
});
