// Prévia local: nenhuma ficha é alterada antes do clique de confirmação.
export async function placeArea(config,{canvas,PIXI,document,Hooks,notify}) {
  if(!canvas?.ready)throw Error('Abra uma cena para posicionar a área.');
  const view=canvas.app.canvas??canvas.app.view, sceneId=canvas.scene.id;
  const scale=canvas.scene.grid.size/canvas.scene.grid.distance;
  if(!Number.isFinite(scale)||scale<=0)throw Error('Confira a escala da grade da cena.');
  const graphic=new PIXI.Graphics();graphic.eventMode='none';canvas.stage.addChild(graphic);
  const hint=document.createElement('div');hint.className='tagmar-fx-area-hint';
  hint.textContent='Clique na origem da área. Esc cancela.';document.body.append(hint);
  let origin=null, point={x:0,y:0}, direction=0;
  return new Promise(resolve=>{
    let done=false;
    const cleanup=value=>{
      if(done)return;done=true;
      view.removeEventListener('pointermove',move,true);view.removeEventListener('pointerdown',click,true);
      document.removeEventListener('keydown',key,true);Hooks.off('canvasTearDown',tearDown);
      graphic.destroy();hint.remove();resolve(value);
    };
    const tearDown=Hooks.on('canvasTearDown',()=>cleanup(null));
    function coordinates(event){
      const rect=view.getBoundingClientRect();
      return canvas.stage.toLocal(new PIXI.Point((event.clientX-rect.left)*canvas.app.renderer.screen.width/rect.width,
        (event.clientY-rect.top)*canvas.app.renderer.screen.height/rect.height));
    }
    function draw(){
      const o=origin??point, d=config.distance*scale, a=direction*Math.PI/180;
      graphic.clear().lineStyle(2,0xffc34a,0.9).beginFill(0xffc34a,0.2);
      if(config.shape==='circle')graphic.drawCircle(o.x,o.y,d);
      else if(config.shape==='cone'){
        const points=[o.x,o.y],half=config.angle*Math.PI/360;
        for(let i=0;i<=60;i++){const t=a-half+2*half*i/60;points.push(o.x+d*Math.cos(t),o.y+d*Math.sin(t));}
        graphic.drawPolygon(points);
      }else{
        const w=config.width*scale/2,nx=-Math.sin(a)*w,ny=Math.cos(a)*w,ex=o.x+Math.cos(a)*d,ey=o.y+Math.sin(a)*d;
        graphic.drawPolygon([o.x+nx,o.y+ny,ex+nx,ey+ny,ex-nx,ey-ny,o.x-nx,o.y-ny]);
      }
      graphic.endFill();
    }
    function move(event){point=coordinates(event);if(origin)direction=Math.atan2(point.y-origin.y,point.x-origin.x)*180/Math.PI;draw();}
    function click(event){
      if(event.button!==0)return;event.preventDefault();event.stopImmediatePropagation();
      move(event);
      if(config.shape==='circle')return cleanup({origin:{x:point.x,y:point.y},direction:0,sceneId});
      if(!origin){origin={x:point.x,y:point.y};hint.textContent='Clique para confirmar a direção. Esc cancela.';return;}
      cleanup({origin,direction,sceneId});
    }
    function key(event){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cleanup(null);}}
    view.addEventListener('pointermove',move,true);view.addEventListener('pointerdown',click,true);document.addEventListener('keydown',key,true);
    notify?.('Posicione a área no mapa. Esc cancela.');
  });
}
