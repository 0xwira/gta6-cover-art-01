const layouts = {
  triptych: [
    { x: .055, y: .095, w: .55, h: .43, angle: -1.4 },
    { x: .625, y: .095, w: .32, h: .30, angle: 1.2 },
    { x: .625, y: .415, w: .32, h: .30, angle: -1.0 },
  ],
  mosaic: [
    { x: .055, y: .095, w: .43, h: .40, angle: -1.1 },
    { x: .505, y: .095, w: .44, h: .26, angle: 1.0 },
    { x: .505, y: .385, w: .44, h: .34, angle: -.8 },
    { x: .055, y: .515, w: .43, h: .20, angle: .8 },
  ],
  five: [
    { x: .055, y: .095, w: .42, h: .38, angle: -.9 },
    { x: .495, y: .095, w: .45, h: .23, angle: 1 },
    { x: .495, y: .355, w: .45, h: .25, angle: -.7 },
    { x: .055, y: .495, w: .29, h: .22, angle: .8 },
    { x: .365, y: .625, w: .58, h: .09, angle: 0 },
  ],
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function drawPhoto(ctx, photo, rect, crop, unit) {
  const x = rect.x * unit, y = rect.y * unit, w = rect.w * unit, h = rect.h * unit;
  ctx.save();
  ctx.shadowColor = 'rgba(7, 5, 18, .75)';
  ctx.shadowBlur = unit * .018;
  ctx.shadowOffsetY = unit * .008;
  ctx.fillStyle = '#24162f';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (photo) {
    const zoom = Math.max(1, crop.zoom || 1);
    const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
    const pw = photo.naturalWidth * scale, ph = photo.naturalHeight * scale;
    const overflowX = Math.max(0, pw - w), overflowY = Math.max(0, ph - h);
    const dx = x + (w - pw) / 2 - clamp(crop.x || 0, -1, 1) * overflowX / 2;
    const dy = y + (h - ph) / 2 - clamp(crop.y || 0, -1, 1) * overflowY / 2;
    ctx.drawImage(photo, dx, dy, pw, ph);
    const tint = ctx.createLinearGradient(x, y + h, x + w * .8, y);
    tint.addColorStop(0, 'rgba(238, 65, 135, .31)');
    tint.addColorStop(.52, 'rgba(255, 158, 83, .12)');
    tint.addColorStop(1, 'rgba(45, 196, 190, .27)');
    ctx.fillStyle = tint;
    ctx.fillRect(x, y, w, h);
  } else {
    const glow = ctx.createLinearGradient(x, y, x + w, y + h);
    glow.addColorStop(0, '#633660'); glow.addColorStop(.52, '#e36f67'); glow.addColorStop(1, '#1c7780');
    ctx.fillStyle = glow; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,201,136,.7)'; ctx.beginPath(); ctx.arc(x+w*.7,y+h*.3,Math.min(w,h)*.17,0,Math.PI*2); ctx.fill();
    for (let i=0;i<8;i++){const bx=x+w*(.08+i*.12),bh=h*(.2+((i*37)%53)/100);ctx.fillStyle=`rgba(24,19,42,${.45+(i%3)*.12})`;ctx.fillRect(bx,y+h-bh,w*.075,bh);}
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 224, 200, .7)'; ctx.lineWidth = Math.max(1, unit * .0016);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawGrain(ctx, w, h, strength, seed) {
  const count = Math.floor(w * h * strength / 18000);
  let value = seed >>> 0;
  const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  ctx.save();
  for (let i=0; i<count; i++) {
    const x = random()*w, y = random()*h, a = .045 + random()*.12;
    ctx.fillStyle = random()>.48 ? `rgba(255,232,208,${a})` : `rgba(22,15,36,${a})`;
    ctx.fillRect(x,y,Math.max(1,w/900),Math.max(1,h/900));
  }
  ctx.restore();
}

/** Draw an original neon-city collage poster into a canvas at its intrinsic size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const unit = Math.min(w, h);
  ctx.clearRect(0,0,w,h);
  const base = ctx.createLinearGradient(0,0,w,h);
  base.addColorStop(0,'#22152d'); base.addColorStop(.5,'#8b3d57'); base.addColorStop(1,'#111b2b');
  ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
  const wide = w > h * 1.22;
  const layout = layouts[state.layout] || layouts.triptych;
  const panelScale = wide ? .82 : 1;
  const panelOffsetX = wide ? .07 : 0;
  for (let i=0;i<layout.length;i++) {
    const r=layout[i];
    const rect={x:panelOffsetX+r.x*panelScale,y:r.y,w:r.w*panelScale,h:r.h};
    const photoIndex = state.assignments?.[i] ?? i % Math.max(1,state.photos.length);
    drawPhoto(ctx,state.photos[photoIndex]||null,rect,state.crops?.[i]||{},unit);
    const tagSize=unit*.012;
    ctx.save();ctx.font=`800 ${tagSize}px Arial,sans-serif`;ctx.fillStyle='rgba(255,247,232,.9)';ctx.textBaseline='top';ctx.fillText(`FRAME 0${i+1}`,rect.x*unit+unit*.012,rect.y*unit+unit*.012);ctx.restore();
  }
  const grade=clamp(state.grade/100,0,1);
  const wash=ctx.createLinearGradient(0,0,w,h);
  wash.addColorStop(0,`rgba(255,179,105,${.06+grade*.15})`);
  wash.addColorStop(.48,`rgba(255,83,143,${grade*.12})`);
  wash.addColorStop(1,`rgba(13,23,45,${.12+grade*.23})`);
  ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);
  // Fine neon keyline and a small sun-disc motif make the collage feel like a designed print.
  ctx.save();ctx.strokeStyle=`rgba(255,207,161,${.5+grade*.3})`;ctx.lineWidth=unit*.002;
  ctx.strokeRect(unit*.032,unit*.036,w-unit*.064,h-unit*.072);
  ctx.strokeStyle=`rgba(255,104,170,${.36+grade*.35})`;ctx.lineWidth=unit*.0012;
  ctx.beginPath();ctx.arc(w-unit*.09,unit*.075,unit*.022,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(w-unit*.115,unit*.075);ctx.lineTo(w-unit*.065,unit*.075);ctx.moveTo(w-unit*.09,unit*.05);ctx.lineTo(w-unit*.09,unit*.1);ctx.stroke();ctx.restore();
  const lowerY=h*.69;
  const shade=ctx.createLinearGradient(0,lowerY,0,h);
  shade.addColorStop(0,'rgba(15,12,28,0)');shade.addColorStop(.2,'rgba(15,12,28,.64)');shade.addColorStop(1,'rgba(10,9,20,.95)');
  ctx.fillStyle=shade;ctx.fillRect(0,lowerY,w,h-lowerY);
  const title=(state.title||'').trim().toUpperCase();
  if(title){
    let size=unit*(wide?.104:.112);ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.font=`1000 ${size}px Impact,"Arial Narrow",Arial,sans-serif`;
    while(ctx.measureText(title).width>w*.87&&size>unit*.04){size*=.94;ctx.font=`1000 ${size}px Impact,"Arial Narrow",Arial,sans-serif`;}
    ctx.lineWidth=unit*.006;ctx.strokeStyle='rgba(27,13,31,.8)';ctx.shadowColor='rgba(255,84,145,.8)';ctx.shadowBlur=unit*.014;
    ctx.strokeText(title,unit*.075,h*.865);ctx.shadowBlur=0;
    const letters=ctx.createLinearGradient(0,h*.77,0,h*.88);letters.addColorStop(0,'#fff7df');letters.addColorStop(.53,'#ffd18b');letters.addColorStop(1,'#ff78a8');
    ctx.fillStyle=letters;ctx.fillText(title,unit*.075,h*.865);
  }
  const subtitle=(state.subtitle||'').trim().toUpperCase();
  if(subtitle){ctx.save();ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font=`800 ${unit*.019}px Arial,sans-serif`;ctx.fillStyle='#79e5dc';ctx.shadowColor='rgba(69,229,213,.8)';ctx.shadowBlur=unit*.008;ctx.fillText(subtitle,unit*.08,h*.91);ctx.restore();}
  ctx.save();ctx.font=`800 ${unit*.012}px Arial,sans-serif`;ctx.fillStyle='rgba(255,239,225,.76)';ctx.textAlign='right';ctx.fillText('COASTLINE / AFTER DARK',w-unit*.075,h*.91);ctx.restore();
  const vignette=ctx.createRadialGradient(w*.5,h*.44,unit*.19,w*.5,h*.48,Math.max(w,h)*.76);
  vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.68,'rgba(5,5,15,0)');vignette.addColorStop(1,`rgba(5,5,15,${clamp(state.vignette/100,0,1)*.76})`);
  ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  drawGrain(ctx,w,h,clamp(state.grain/100,0,1),0xc17f47);
}
