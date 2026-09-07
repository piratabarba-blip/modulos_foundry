// Limita apenas a apresentação; o tamanho preferido não é sobrescrito ao trocar de tela.
export function hudGeometry({width = 400, collapsed = false, left = -1, top = -1, viewportWidth, viewportHeight}) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const baseHeight = collapsed ? 142 : 500;
  const availableWidth = Math.max(1, viewportWidth - 24);
  const availableHeight = Math.max(1, viewportHeight - 24);
  const preferred = clamp(Number(width) || 400, 320, 720);
  const actualWidth = Math.min(preferred, availableWidth, availableHeight * 360 / baseHeight);
  const scale = actualWidth / 360;
  const height = baseHeight * scale;
  return {
    width: actualWidth, height, scale, baseHeight,
    left: clamp(left < 0 ? 14 : left, 0, Math.max(0, viewportWidth - actualWidth)),
    top: clamp(top < 0 ? viewportHeight - height - 64 : top, 0, Math.max(0, viewportHeight - height))
  };
}
