// SPDX-License-Identifier: GPL-3.0-or-later
// Client-only HUD geometry. Never reads or writes a trip or the world clock.
const finite=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function compactPosition(value,defaultWidth=400){
  return {left:finite(value?.left,80),top:finite(value?.top,100),width:clamp(finite(value?.width,finite(defaultWidth,400)),320,720),...(Number.isFinite(value?.bottom)&&value.bottom>0?{bottom:value.bottom}:{})};
}
export function compactGeometry({position,viewportWidth,viewportHeight,height=0}){
  const origin=compactPosition(position),vw=Math.max(1,finite(viewportWidth,1024)),vh=Math.max(1,finite(viewportHeight,768));
  const baseHeight=Math.max(1,finite(height,1));
  const bottom=origin.bottom===undefined?null:clamp(origin.bottom,1,vh);
  const width=Math.min(origin.width,Math.max(1,vw-16),Math.max(1,Math.min(vh-16,bottom??vh))*360/baseHeight),scale=width/360,scaledHeight=baseHeight*scale;
  return {width,height:scaledHeight,scale,left:clamp(origin.left,0,Math.max(0,vw-width)),top:clamp(bottom===null?origin.top:bottom-scaledHeight,0,Math.max(0,vh-scaledHeight))};
}
