// SPDX-License-Identifier: GPL-3.0-or-later
// A ordem visual da ficha é compartilhada pelas quatro abas do gerador.
const GROUPS=[['profissional','Profissional'],['manobra','Manobra'],['conhecimento','Conhecimento'],['subterfugio','Subterfúgio'],['influencia','Influência'],['geral','Geral']];
export function groupSkills(items){
 return [...GROUPS,['other','Outras habilidades']].map(([key,label])=>({key,label,items:items.filter(i=>key==='other'?!GROUPS.some(([g])=>g===i.category):i.category===key).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))})).filter(g=>g.key!=='other'||g.items.length);
}
