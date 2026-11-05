// ActorDelta replacements retire a synthetic Actor. Its sheets must not submit
// to the new (or null) delta, and its effects must leave the in-memory registry.
const list=value=>Array.from(value?.contents??value??[]);
const registry=()=>globalThis.foundry?.documents?.ActiveEffect?.registry;

function currentActor(token){
  if(!token)return null;
  const scene=token.parent;
  if(scene?.tokens?.get&&scene.tokens.get(token.id)!==token)return null;
  if(scene?.id&&globalThis.game?.scenes?.get&&game.scenes.get(scene.id)!==scene)return null;
  return token.actor;
}

export async function closeActorApplications(actor){
  if(!actor)return;
  const applications=new Set(Object.values(actor.apps??{}));
  for(const child of [...list(actor.items),...list(actor.effects)]){
    for(const app of Object.values(child.apps??{}))applications.add(app);
  }
  await Promise.all([...applications].map(app=>app.close({submit:false})));
}

export async function changeTokenActor(token,operation){
  const previous=token.actor;
  await closeActorApplications(previous);
  if(previous?.isToken)registry()?.deleteFromParent(previous);
  try{return await operation();}
  finally{
    const current=currentActor(token);
    if(previous?.isToken&&previous!==current)registry()?.deleteFromParent(previous);
    // Also restores registration if the update failed before changing the token.
    if(current)registry()?.addFromParent(current);
  }
}

export async function sweepRetiredTokenActors(){
  const retired=new Set();
  for(const effect of registry()??[]){
    const actor=effect.actor;
    if(actor?.isToken&&currentActor(actor.token)!==actor){
      registry().delete(effect);
      retired.add(actor);
    }
  }
  for(const app of Object.values(globalThis.ui?.windows??{})){
    const actor=app.actor??app.document?.actor;
    if(actor?.isToken&&currentActor(actor.token)!==actor)retired.add(actor);
  }
  await Promise.all([...retired].map(closeActorApplications));
}

export function registerTokenActorLifecycle(){
  const sweep=()=>{void sweepRetiredTokenActors().catch(error=>console.error('Tagmar FX | Encerramento da ficha temporária',error));};
  Hooks.on('updateToken',(_token,changes)=>{
    if(['actorId','actorLink','delta'].some(key=>Object.hasOwn(changes,key)))sweep();
  });
  for(const hook of ['deleteToken','deleteScene','deleteActor'])Hooks.on(hook,sweep);
  sweep();
}
