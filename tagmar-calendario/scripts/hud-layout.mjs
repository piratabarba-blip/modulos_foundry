// Limita apenas a apresentação; o tamanho preferido não é sobrescrito ao trocar de tela.
export function hudGeometry({width = 400, collapsed = false, environmentRows = 0, left = -1, top = -1, bottom = -1, viewportWidth, viewportHeight}) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const baseHeight = (collapsed ? 142 : 500) + clamp(Number(environmentRows) || 0, 0, 2) * 26;
  const availableWidth = Math.max(1, viewportWidth - 24);
  const anchorBottom=Number.isFinite(bottom)&&bottom>0?clamp(bottom,1,viewportHeight):null;
  const availableHeight = Math.max(1, Math.min(viewportHeight - 24,anchorBottom??viewportHeight));
  const preferred = clamp(Number(width) || 400, 320, 720);
  const actualWidth = Math.min(preferred, availableWidth, availableHeight * 360 / baseHeight);
  const scale = actualWidth / 360;
  const height = baseHeight * scale;
  return {
    width: actualWidth, height, scale, baseHeight,
    left: clamp(left < 0 ? 14 : left, 0, Math.max(0, viewportWidth - actualWidth)),
    top: clamp(anchorBottom!==null?anchorBottom-height:top < 0 ? viewportHeight - height - 64 : top, 0, Math.max(0, viewportHeight - height))
  };
}
