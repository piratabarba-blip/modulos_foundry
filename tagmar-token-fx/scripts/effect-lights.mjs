// Luzes de execução: cada cliente acompanha os efeitos replicados pelo Sequencer.
// Não grava AmbientLight nem altera a configuração de luz dos tokens.
export function effectLightSettings(effect) {
  if(!effect?.data?.name?.startsWith('tagmar-token-fx:'))return null;
  const origin=effect.data.origin;
  if(typeof origin!=='string'||!origin.startsWith('tagmar-fx-light:')||origin.length>512)return null;
  try {
    const raw=JSON.parse(origin.slice('tagmar-fx-light:'.length));
    const radius=value=>Number.isFinite(Number(value))?Math.min(1000,Math.max(0,Number(value))):0;
    const bright=radius(raw.bright),dim=Math.max(bright,radius(raw.dim));
    if(!dim||!/^#[0-9a-f]{6}$/i.test(raw.color))return null;
    return {bright,dim,color:raw.color,projectile:raw.projectile===true};
  }catch{return null;}
}

export function createEffectLightController({getCanvas=()=>canvas,getGame=()=>game,getSourceClass=()=>CONFIG.Canvas.lightSourceClass,now=()=>performance.now(),onError=error=>console.error('Tagmar FX | luz',error)}={}) {
  const entries=new Map();let ticker=null,lastTick=-Infinity;
  const refresh=()=>{const view=getCanvas();if(view?.ready)view.perception.update({refreshLighting:true,refreshVision:true});};
  const stop=()=>{if(ticker){ticker.remove(tick);ticker=null;}};
  function remove(effect,notify=true) {
    const entry=entries.get(effect);
    if(!entry)return;
    entries.delete(effect);
    try{entry.source?.destroy();}catch(error){onError(error);}
    if(!entries.size)stop();
    if(entry.source&&notify)refresh();
  }
  function tick() {
    const time=now();if(time-lastTick<50)return;lastTick=time;
    const view=getCanvas(),user=getGame().user;let changed=false;
    for(const [effect,entry] of entries){
      try{
        if(!view?.ready||effect.destroyed||effect.isDestroyed||effect.data.sceneId!==view.scene.id){changed||=!!entry.source;remove(effect,false);continue;}
        if(!effect.ready||!effect.sprite)continue;
        const doc=entry.config.projectile?effect.targetDocument:effect.sourceDocument;
        const hidden=!!doc?.hidden;
        const users=effect.data.users;
        if(hidden||(Array.isArray(users)&&users.length&&!users.includes(user.id))){
          if(entry.source){entry.source.destroy();entry.source=null;entry.key=null;changed=true;}
          continue;
        }
        const point=entry.config.projectile?effect.targetPosition:effect.worldPosition;
        const scale=view.scene.grid.size/view.scene.grid.distance;
        if(!Number.isFinite(scale)||scale<=0||![point?.x,point?.y].every(Number.isFinite))continue;
        const level=doc?.level?.id??doc?.level??view.level.id;
        const elevation=Number.isFinite(doc?.elevation)?doc.elevation:0;
        const data={x:Math.round(point.x),y:Math.round(point.y),elevation,level,
          bright:entry.config.bright*scale,dim:entry.config.dim*scale,color:entry.config.color,
          alpha:0.35,luminosity:0.5,attenuation:0.5,walls:true,vision:false,angle:360,priority:0};
        const key=JSON.stringify(data);
        if(!entry.source)entry.source=new (getSourceClass())({sourceId:`tagmar-token-fx:light:${effect.id}`});
        if(entry.key!==key){entry.source.initialize(data);entry.key=key;changed=true;}
        if(!view.effects.lightSources.has(entry.source.sourceId)){entry.source.add();changed=true;}
      }catch(error){changed||=!!entry.source;remove(effect,false);onError(error);}
    }
    if(changed)refresh();
  }
  return {
    add(effect){
      const config=effectLightSettings(effect);
      if(!config||entries.has(effect))return;
      entries.set(effect,{config,source:null,key:null});
      if(!ticker){ticker=getCanvas()?.app?.ticker;ticker?.add(tick);}
    },remove,
    clear(){for(const effect of [...entries.keys()])remove(effect,false);stop();lastTick=-Infinity;refresh();},
    tick
  };
}
