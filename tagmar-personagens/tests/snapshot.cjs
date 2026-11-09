// Copia somente os compêndios de referência; leitura nunca abre o banco original.
const fs=require('node:fs/promises'),path=require('node:path');
const {ClassicLevel}=require('C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app/node_modules/classic-level');
const [systemRoot,output]=process.argv.slice(2);
(async()=>{
 await fs.mkdir(output,{recursive:true});const manifest=JSON.parse(await fs.readFile(path.join(systemRoot,'system.json'),'utf8')),packs=[];
 for(const suffix of ['criando-fichas-t3er','terras-selvagens-t3er']){
  const pack=manifest.packs.find(p=>p.name===suffix);if(!pack)continue;
  const dest=path.join(output,'snapshot-'+suffix);await fs.cp(path.join(systemRoot,pack.path),dest,{recursive:true,filter:p=>path.basename(p)!=='LOCK'});
  await fs.writeFile(path.join(dest,'CURRENT'),(await fs.readFile(path.join(dest,'CURRENT'),'utf8')).trim()+'\n');
  const db=new ClassicLevel(await fs.realpath(dest),{valueEncoding:'json',readOnly:true}),items=[],folders=[];
  try{await db.open();for await(const[k,v]of db.iterator()){if(/^!items![^.]+$/.test(k))items.push(v);if(/^!folders![^.]+$/.test(k))folders.push(v);}}finally{await db.close();}
  packs.push({collection:manifest.id+'.'+suffix,realm:suffix==='criando-fichas-t3er'?'reinos':'terras',items,folders});
 }
 await fs.writeFile(path.join(output,'packs.json'),JSON.stringify(packs));console.log(JSON.stringify({id:manifest.id,version:manifest.version,packs:packs.map(p=>({collection:p.collection,items:p.items.length,folderSample:p.folders[0],routeSample:p.items[0]?.flags?.tagmarSync?.route}))}));
})().catch(e=>{console.error(e);process.exitCode=1;});
