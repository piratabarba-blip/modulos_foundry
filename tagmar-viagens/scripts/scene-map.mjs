// SPDX-License-Identifier: GPL-3.0-or-later
// Read-only snapshot of scene background + usable grid scale; never activates a scene.
import {imagePath,mapImage} from './map-model.mjs';
import {number} from './engine.mjs';
const UNITS={km:1,kms:1,quilometro:1,quilometros:1,kilometer:1,kilometers:1,kilometre:1,kilometres:1,m:.001,metro:.001,metros:.001,meter:.001,meters:.001,metre:.001,metres:.001,mi:1.609344,milha:1.609344,milhas:1.609344,mile:1.609344,miles:1.609344,ft:.0003048,foot:.0003048,feet:.0003048,pe:.0003048,pes:.0003048,yd:.0009144,yard:.0009144,yards:.0009144,jarda:.0009144,jardas:.0009144,cm:.00001};
export function sceneSource(scene){
  if(!scene)throw Error('Selecione uma cena.');
  const levels=scene.levels?.contents??scene.levels??[];
  const list=Array.isArray(levels)?levels:Array.from(levels.values?.()??[]);
  const first=scene.firstLevel??list.find(l=>l.id===scene.initialLevel)??list[0];
  const level=first?.background?.src?first:list.find(l=>l.background?.src);
  // V14 Level avoids the deprecated Scene#background getter.
  const background=level?.background??(!scene.levels?scene.background:null);
  if(!background?.src)throw Error('Essa cena não tem uma imagem de fundo. Imagens colocadas somente como tiles precisam ser escolhidas pelo seletor.');
  return {sceneId:scene.id,sceneName:String(scene.name??'Cena'),levelId:level?.id??null,src:imagePath(background.src),width:scene.width,height:scene.height,grid:{size:scene.grid?.size,distance:scene.grid?.distance,units:scene.grid?.units,type:scene.grid?.type??0},textures:{...(level?.textures??background)}};
}
export function sceneMap(source,image){
  const map=mapImage(source.src,image.width,image.height);
  map.sourceScene={id:source.sceneId,name:source.sceneName,levelId:source.levelId};
  const unit=String(source.grid.units??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.\s]/g,'');
  let reason;
  try{
    if(!Object.hasOwn(UNITS,unit))throw Error('A unidade da escala da cena não foi reconhecida. Calibre por dois pontos.');
    if(source.grid.type>1)throw Error('A grade hexagonal precisa de calibração por dois pontos nesta versão.');
    const sceneWidth=number(source.width,'Largura da cena',1,50000),sceneHeight=number(source.height,'Altura da cena',1,50000);
    const size=number(source.grid.size,'Tamanho da grade',1,10000),step=number(source.grid.distance,'Distância da grade',Number.MIN_VALUE,1e7);
    const tex=source.textures,fit=tex.fit??'fill',rx=sceneWidth/map.width,ry=sceneHeight/map.height;
    let sx,sy;
    switch(fit){
      case 'fill':sx=rx;sy=ry;break;
      case 'cover':sx=sy=Math.max(rx,ry);break;
      case 'contain':sx=sy=Math.min(rx,ry);break;
      case 'width':sx=sy=rx;break;
      case 'height':sx=sy=ry;break;
      default:throw Error('O ajuste de imagem dessa cena precisa de calibração manual.');
    }
    sx*=Math.abs(Number(tex.scaleX??1));sy*=Math.abs(Number(tex.scaleY??1));
    if(!Number.isFinite(sx)||!Number.isFinite(sy)||sx<=0||sy<=0||Math.abs(sx-sy)>Math.max(sx,sy)*1e-6)throw Error('A imagem da cena tem proporções diferentes nos dois eixos. Calibre a imagem por dois pontos.');
    map.kmPerPixel=step*UNITS[unit]/size*sx;
    number(map.kmPerPixel,'Escala importada',Number.MIN_VALUE,1e7);
    map.sceneScale={distance:step,units:String(source.grid.units),size,fit};
  }catch(error){map.kmPerPixel=0;reason=error.message;}
  return {map,warning:reason??null};
}
