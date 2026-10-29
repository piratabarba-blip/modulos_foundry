// Coordenadas de cena capturadas no clique; não seguem nenhum token.
export function validVisualArea(area) {
  return area && ['circle','cone','ray'].includes(area.shape)
    && ['x','y','direction','distance','width','angle'].every(k=>Number.isFinite(area[k]))
    && area.distance>0 && area.distance<=1000000 && area.width>0 && area.width<=1000000
    && area.angle>0 && area.angle<=360;
}

export function visualArea(config, placement, scene) {
  const scale=scene.grid.size/scene.grid.distance;
  const area={shape:config.shape,x:placement.origin.x,y:placement.origin.y,direction:placement.direction,
    distance:config.distance*scale,width:config.width*scale,angle:config.angle};
  if(!validVisualArea(area))throw Error('Escolha círculo, cone ou linha e confira as dimensões da área.');
  return area;
}

export function areaGeometry(area) {
  if(!validVisualArea(area))throw Error('Área visual inválida.');
  const d=area.distance,a=area.direction*Math.PI/180;
  if(area.shape==='circle')return {center:{x:area.x,y:area.y},width:d*2,height:d*2,rotation:0,circle:{x:area.x,y:area.y,radius:d}};
  const local=area.shape==='ray'?[[0,-area.width/2],[d,-area.width/2],[d,area.width/2],[0,area.width/2]]:[[0,0]];
  if(area.shape==='cone')for(let i=0;i<=180;i++){
    const t=(-area.angle/2+area.angle*i/180)*Math.PI/180;
    local.push([d*Math.cos(t),d*Math.sin(t)]);
  }
  const xs=local.map(p=>p[0]),ys=local.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  return {center:{x:area.x+cx*Math.cos(a)-cy*Math.sin(a),y:area.y+cx*Math.sin(a)+cy*Math.cos(a)},
    width:maxX-minX,height:maxY-minY,rotation:area.direction,
    points:local.flatMap(([x,y])=>[area.x+x*Math.cos(a)-y*Math.sin(a),area.y+x*Math.sin(a)+y*Math.cos(a)])};
}

export function styleAreaAnimation(effect,area) {
  const g=areaGeometry(area),P=globalThis.PIXI;
  const mask=g.circle?new P.Circle(g.circle.x,g.circle.y,g.circle.radius):new P.Polygon(g.points);
  return effect.atLocation(g.center).size({width:g.width,height:g.height}).rotate(g.rotation).mask(mask);
}
