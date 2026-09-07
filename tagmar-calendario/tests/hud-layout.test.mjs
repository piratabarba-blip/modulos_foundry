import assert from 'node:assert/strict';
import {hudGeometry} from '../scripts/hud-layout.mjs';
for (const [viewportWidth,viewportHeight] of [[1920,1080],[1366,768],[2560,1440],[800,600]]) {
  for(const collapsed of [true,false]) for(const width of [320,400,600,720]) {
    const g=hudGeometry({width,collapsed,left:2500,top:1400,viewportWidth,viewportHeight});
    assert(g.width>0 && g.height>0);
    assert(g.left>=0 && g.top>=0);
    assert(g.left+g.width<=viewportWidth+.01);
    assert(g.top+g.height<=viewportHeight+.01);
    assert.equal(g.height,g.baseHeight*g.scale);
  }
}
const preference={width:600,left:40,top:170,viewportWidth:1920,viewportHeight:1080};
assert.equal(hudGeometry(preference).width,600);
assert(hudGeometry({...preference,viewportHeight:768}).width<600);
assert.equal(hudGeometry(preference).width,600,'Limite temporário não altera preferência');
assert.equal(hudGeometry({...preference,collapsed:true,width:320}).width,320);
assert.equal(hudGeometry(preference).width,600,'Compacto não altera largura expandida');
console.log('OK: 4 resoluções, 2 modos, 4 larguras, limites da tela e preferência preservada.');
