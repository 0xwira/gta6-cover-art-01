export const formats = { square: [1080, 1080], portrait: [1080, 1350], landscape: [1920, 1080] };

const grids = {
  triptych: [[0,0,55,100], [55,0,45,53], [55,53,45,47]],
  mosaic: [[0,0,39,63], [39,0,61,39], [39,39,61,61], [0,63,39,37]],
  five: [[0,0,43,69], [43,0,57,32], [43,32,57,37], [0,69,62,31], [62,69,38,31]]
};

export function panels(layout, w, h) {
  const edge = Math.min(w,h) * .026;
  return grids[layout].map(([x,y,a,b]) => [
    edge + x / 100 * (w - 2 * edge), edge + y / 100 * (h * .77 - edge),
    a / 100 * (w - 2 * edge), b / 100 * (h * .77 - edge)
  ]);
}

function gradient(ctx, x, y, a, b, stops) {
  const g = ctx.createLinearGradient(x,y,a,b);
  for (const [at,color] of stops) g.addColorStop(at,color);
  return g;
}

function paintPanel(ctx, box, image, crop, strength, unit, index) {
  const [x,y,w,h] = box;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x,y,w,h);
  ctx.clip();
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * crop.zoom;
  const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
  ctx.filter = 'saturate(' + (1 + strength * .5) + ') contrast(' + (1 + strength * .19) + ')';
  ctx.drawImage(image, x + (w-iw)*(1+crop.x)/2, y + (h-ih)*(1+crop.y)/2, iw, ih);
  ctx.filter = 'none';
  ctx.globalAlpha = strength * .56;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = gradient(ctx,x,y,x+w,y+h,[[0,'#ffae63'],[.42,'#ec5f9e'],[1,'#11e3d0']]);
  ctx.fillRect(x,y,w,h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = strength * .28;
  ctx.fillStyle = gradient(ctx,x+w,y,x,y+h,[[0,'#ff9c56'],[.34,'#ff5e8100'],[1,'#28234e']]);
  ctx.fillRect(x,y,w,h);
  ctx.globalAlpha = 1;
  ctx.lineWidth = unit * .014;
  ctx.strokeStyle = '#140f1f';
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle = '#160f20';
  ctx.fillRect(x+unit*.016,y+unit*.016,unit*.046,unit*.026);
  ctx.fillStyle = '#ffe4b7';
  ctx.font = 'bold ' + unit*.016 + 'px monospace';
  ctx.fillText('0'+(index+1),x+unit*.026,y+unit*.035);
  ctx.restore();
}

function lettering(ctx, state, w, h, u) {
  const x = w*.5, y = h*.854;
  const heading = state.title.trim().toUpperCase();
  ctx.save();
  ctx.translate(x,y);
  ctx.transform(1,0,-.14,1,0,0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 ' + Math.min(u*.182,w*.142) + 'px Impact, Arial Black, sans-serif';
  ctx.lineJoin = 'round';
  ctx.lineWidth = u*.014;
  ctx.strokeStyle = '#140f1f';
  ctx.strokeText(heading,0,0,w*.91);
  ctx.fillStyle = '#fb5386';
  ctx.fillText(heading,u*.005,u*.008,w*.91);
  ctx.fillStyle = gradient(ctx,0,-u*.066,0,u*.066,[[0,'#fff5d5'],[.48,'#ffd89a'],[1,'#ff897e']]);
  ctx.fillText(heading,0,0,w*.91);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = '700 ' + u*.024 + 'px monospace';
  ctx.fillStyle = '#8ef6dc';
  ctx.fillText(state.subtitle.trim().toUpperCase(),x,h*.944,w*.76);
  ctx.fillStyle = '#fa738f';
  ctx.fillRect(w*.057,h*.935,w*.071,u*.002);
  ctx.fillRect(w*.872,h*.935,w*.071,u*.002);
}

const texture = document.createElement('canvas');
texture.width = texture.height = 128;
const noise = texture.getContext('2d');
const dots = noise.createImageData(128,128);
let seed = 3217;
for (let i=0;i<dots.data.length;i+=4) {
  seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
  const gray = seed >>> 24;
  dots.data.set([gray,gray,gray,255],i);
}
noise.putImageData(dots,0,0);

export function drawCover(canvas,state) {
  const [w,h] = formats[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d'), u = Math.min(w,h);
  ctx.fillStyle = '#140f1f';
  ctx.fillRect(0,0,w,h);
  panels(state.layout,w,h).forEach((box,i) => {
    const image = state.photos[state.assigned[i] ?? i % state.photos.length]?.image;
    if (image) paintPanel(ctx,box,image,state.crops[i],state.grade/100,u,i);
  });
  const shadow = ctx.createRadialGradient(w*.49,h*.36,u*.16,w*.49,h*.4,Math.hypot(w,h)*.54);
  shadow.addColorStop(0,'#140f1f00');
  shadow.addColorStop(1,'rgba(15,8,25,' + state.vignette*.009 + ')');
  ctx.fillStyle = shadow;
  ctx.fillRect(0,0,w,h);
  lettering(ctx,state,w,h,u);
  ctx.save();
  ctx.globalAlpha = state.grain*.0035;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = ctx.createPattern(texture,'repeat');
  ctx.fillRect(0,0,w,h);
  ctx.restore();
  ctx.strokeStyle = '#e1a295';
  ctx.lineWidth = u*.0014;
  ctx.strokeRect(u*.017,u*.017,w-u*.034,h-u*.034);
}
