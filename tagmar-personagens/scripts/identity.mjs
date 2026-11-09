// SPDX-License-Identifier: GPL-3.0-or-later
// Sugestões narrativas editáveis, sem custo, vantagem ou alteração de regras.
const normal=s=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const DEITIES=['Blator','Cambu','Crezir','Crizagom','Cruine','Ganis','Lena','Maira','Palier','Parom','Plandis','Selimom','Sevides'];
const profiles={
 humano:[1.70,70,18,50],anao:[1.35,65,40,150],pequenino:[1.05,25,20,70],
 'meio elfo':[1.65,60,20,70],'elfo dourado':[1.75,60,60,180],'elfo florestal':[1.65,55,50,160],
 'elfo sombrio':[1.55,45,50,160],goura:[1.80,90,12,28],'meio orco':[1.70,70,16,40],napoi:[1.65,40,18,65],sekbete:[2.10,170,40,90]
};
export function suggestIdentity(options,previous,race,profession,specialization,rng,specializations){
 const saved=options.identity??{},locks=options.locks??{},old=previous?.actor.system??{};
 const keep=key=>locks['identity:'+key]?(saved[key]??old[key]):undefined;
 const [height,weight,minAge,maxAge]=profiles[normal(race.name)]??profiles.humano;
 const factor=.9+rng()*.2;
 const identity={classe_social:'Livre',altura:(height*factor).toFixed(2).replace('.',','),peso:Math.round(weight*factor*factor),idade:Math.floor(minAge+rng()*(maxAge-minAge+1)),deus:''};
 for(const key of Object.keys(identity))if(keep(key)!==undefined)identity[key]=keep(key);
 for(const key of ['peso','idade'])if(!Number.isFinite(Number(identity[key]))||Number(identity[key])<0)throw Error('Identidade: '+key+' deve ser um número não negativo.');
 if(!Number.isFinite(Number(String(identity.altura).replace(',','.')))||Number(String(identity.altura).replace(',','.'))<=0)throw Error('Informe uma altura positiva em metros.');
 const priest=normal(profession.name)==='sacerdote';
 if(priest){
  const matchingOrder=deity=>specializations.find(s=>normal(s).split(' ').includes(normal(deity)));
  if(keep('deus')!==undefined){
   if(!matchingOrder(identity.deus))throw Error('Escolha um deus com ordem disponível para o sacerdote.');
   if(specialization&&normal(specialization)!==normal(matchingOrder(identity.deus)))throw Error('O deus travado e a ordem escolhida não correspondem. Ajuste uma das escolhas.');
   specialization=matchingOrder(identity.deus);
  }else if(specialization){
   identity.deus=DEITIES.find(d=>normal(specialization).split(' ').includes(normal(d)))??'';
   if(!identity.deus)throw Error('Não foi possível identificar o deus da ordem escolhida.');
  }else{
   const available=DEITIES.filter(d=>matchingOrder(d));if(!available.length)throw Error('Nenhuma ordem sacerdotal disponível.');
   identity.deus=available[Math.floor(rng()*available.length)];specialization=matchingOrder(identity.deus);
  }
 }else if(keep('deus')===undefined)identity.deus=DEITIES[Math.floor(rng()*DEITIES.length)];
 return {identity,specialization};
}
