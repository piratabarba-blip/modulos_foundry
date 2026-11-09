// SPDX-License-Identifier: GPL-3.0-or-later
// Fontes: Livro de Regras 3ER, Características Básicas; Livro ATS, pp. 31–32.
const normalize=s=>String(s?.name??s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ALL=['guerreiro','ladino','sacerdote','mago','rastreador','bardo','berserker','feiticeiro'];
const ALLOWED={
 humano:ALL,'meio elfo':ALL,
 'elfo florestal':ALL,'elfo dourado':ALL.filter(p=>p!=='berserker'),
 anao:['guerreiro','ladino','sacerdote'],
 pequenino:ALL.filter(p=>!['mago','rastreador'].includes(p)),
 'elfo sombrio':['guerreiro','ladino','mago','rastreador','bardo'],
 goura:['guerreiro','ladino','feiticeiro'],
 'meio orco':ALL,napoi:ALL.filter(p=>p!=='mago'),
 sekbete:ALL.filter(p=>!['mago','bardo'].includes(p))
};
export function compatibleProfession(race,profession){return !!ALLOWED[normalize(race)]?.includes(normalize(profession));}
export function compatibleSpecialization(race,profession,specialization){
 return normalize(race)!=='elfo sombrio'||normalize(profession)!=='mago'||!specialization||normalize(specialization)==='colegio sombrio';
}
export function assertCompatibility(race,profession,specialization=''){
 if(!compatibleProfession(race,profession))throw Error(`${race.name}: a profissão ${profession.name} não é permitida para esta raça. Escolha outra combinação ou libere a trava.`);
 if(!compatibleSpecialization(race,profession,specialization))throw Error('Elfo Sombrio Mago só pode escolher o Colégio Sombrio. Troque a especialização ou libere a trava.');
}
export function restrictionNote(race){
 const r=normalize(race),allowed=ALLOWED[r];if(!allowed)return '';
 if(r==='elfo sombrio')return 'Elfo Sombrio não pode ser Sacerdote, Berserker ou Feiticeiro. Como Mago, somente Colégio Sombrio (ou lista básica, sem colégio).';
 if(r==='goura')return 'Goura: Guerreiro, Ladino ou Feiticeiro. O único sacerdote do povo, seu líder, é uma exceção narrativa do livro e não entra no sorteio comum.';
 return 'Profissões permitidas: '+allowed.map(p=>p[0].toUpperCase()+p.slice(1)).join(', ')+'.';
}
