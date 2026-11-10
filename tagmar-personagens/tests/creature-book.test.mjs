import {test} from 'node:test';
import assert from 'node:assert/strict';
import {physicalEnergy,heroicEnergy,bookChoices,creatureMorale,damageBand,naturalDamage,naturalColumns,weaponSizeBonus,setDamageTable} from '../scripts/creature-book.mjs';
const base={stage:12,size:'large',group:'CM',intellect:'beast',magical:true};
test('EF: mantícora publicada, construída e arredondamento antes do Físico',()=>{
 assert.equal(physicalEnergy(600,2),50);assert.equal(physicalEnergy(600,2,true),63);
 assert.equal(physicalEnergy(100,-1),19);
});
test('EH: todos os exemplos da página 25, organização e atributo correto',()=>{
 const eh=(stage,combativeness,organization,FIS)=>heroicEnergy({stage,combativeness,organization,corporeality:'corporeal'},{FIS,AUR:9});
 assert.equal(eh(1,'none','solitary',5),0);assert.equal(eh(3,'low','solitary',2),42);
 assert.equal(eh(13,'medium','group',3),130);assert.equal(eh(17,'high','solitary',4),357);assert.equal(eh(21,'extreme','solitary',4),504);
 assert.equal(heroicEnergy({stage:12,combativeness:'medium',organization:'group',corporeality:'incorporeal'},{FIS:10,AUR:2}),108);
});
test('tabela de dano por peso, limites, múltiplos e colunas publicadas',()=>{
 for(const [weight,band]of [[2,[0,4]],[20,[0,4]],[20.1,[4,8]],[500,[12,28]],[600,[16,28]],[9500,[24,44]]])assert.deepEqual(damageBand(weight),band);
 assert.equal(damageBand(1),null);assert.equal(damageBand(47501),null);
 assert.equal(naturalDamage({weight:600,damageRange:'low'}),16);assert.equal(naturalDamage({weight:600,damageRange:'high'}),28);
 for(const weight of [2,50,200,600,3000,9500])for(const roll of [0,.1,.5,1]){const n=naturalDamage({weight,damageRange:'middle'},()=>roll,true),[lo,hi]=damageBand(weight);assert.ok(n>=lo&&n<=hi);assert.equal(n%4,0);}
 assert.deepEqual(naturalColumns('Garras'),[3,0,-3]);assert.deepEqual(naturalColumns('Hálito Encantado'),[1,1,1]);assert.equal(naturalColumns('Poder inventado'),null);
 const s={dano_base:{d25:0,d50:0,d75:0,d100:0}};setDamageTable(s,20);assert.deepEqual(s.dano_base,{d25:5,d50:10,d75:15,d100:20});
});
test('armas proporcionais mantêm a tabela e estendem automaticamente até cinco vezes',()=>{
 for(const [height,bonus]of [[2.5,0],[2.51,4],[3.5,4],[3.51,8],[4.51,12],[5.51,16],[6.5,16],[7,20],[32.5,120],[32.51,null]])assert.equal(weaponSizeBonus(height),bonus);
});
test('perfil do livro valida opções; Moral, dons naturais e medidas sugeridas',()=>{
 const c=bookChoices({},base);assert.equal(c.weight,600);assert.equal(c.magicSource,'innate');assert.equal(c.combativeness,'medium');assert.equal(creatureMorale(c),12);
 assert.equal(creatureMorale({...c,moralMode:'fearless'}),24);assert.equal(creatureMorale({...c,moralMode:'coward'}),6);
 assert.throws(()=>creatureMorale({...c,magical:false,moralMode:'fearless'}));
 assert.equal(bookChoices({weight:'600,5'},base).weight,600.5);assert.equal(bookChoices({weight:''},base).weight,600);
 for(const d of [{weight:-1},{weight:0},{height:'bad'},{combativeness:'bad'},{usesPerDay:1.5}])assert.throws(()=>bookChoices(d,base));
});

test('extensão extraoficial conserva fronteiras e cresce em múltiplos de quatro',()=>{
 assert.deepEqual(damageBand(9501),[24,48]);assert.deepEqual(damageBand(12500),[24,48]);assert.deepEqual(damageBand(12501),[28,52]);assert.deepEqual(damageBand(47500),[48,96]);
 let previous=[0,0];for(let weight=9500;weight<=47500;weight+=100){const band=damageBand(weight);assert.ok(band[0]>=previous[0]&&band[1]>=previous[1]);assert.equal(band[0]%4,0);assert.equal(band[1]%4,0);previous=band;}
});
