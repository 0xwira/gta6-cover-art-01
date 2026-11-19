/** Reproducible scenes for the kit's local screenshot runner. */
export async function runShot(shot, query, load) {
  const names=(query.get('photos')||query.get('photo')||'pier,boulevard').split(',').map(name=>name.endsWith('.jpg')?name:`${name}.jpg`);
  document.body.classList.add(shot==='cover'?'shot-cover':'shot-editor');
  const drawBefore=window.__posterDrawCount||0;
  await load(names);
  await document.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const canvas=document.getElementById('cover');
  if(window.__shotPhotosDecoded!==names.length)throw new Error('Screenshot photos were not all decoded.');
  if((window.__posterDrawCount||0)<=drawBefore)throw new Error('Screenshot poster was not redrawn after loading photos.');
  const ctx=canvas.getContext('2d'),pixels=[];
  for(let y=0;y<9;y++)for(let x=0;x<9;x++)pixels.push(...ctx.getImageData(Math.floor(canvas.width*(x+.5)/9),Math.floor(canvas.height*(y+.5)/9),1,1).data.slice(0,3));
  const colors=new Set();
  for(let i=0;i<pixels.length;i+=3)colors.add(pixels.slice(i,i+3).join(','));
  if(colors.size<12)throw new Error('Screenshot poster canvas has not been painted.');
  window.__shotReport={photosDecoded:window.__shotPhotosDecoded,drawCount:window.__posterDrawCount,distinctSamples:colors.size,title:document.getElementById('title').value};
  window.__shotReady=true;
}
