import { drawCover, formats, panels } from './cover.js';
import { prepareShot } from './shots.js';

const $ = id => document.getElementById(id);
const canvas = $('cover');
const state = {
  photos: [], assigned: [], crops: Array.from({length:5}, () => ({x:0,y:0,zoom:1})),
  layout:'mosaic', size:'square', title:'NEON HORIZON', subtitle:'THE CITY NEVER SLEEPS',
  grade:84, grain:22, vignette:48
};
let active = 0;
let usingSamples = true;
const cropFields = {'crop-x':'x','crop-y':'y',zoom:'zoom'};
const finish = ['grade','grain','vignette'];
const query = new URLSearchParams(location.search);

async function decode(src,name) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return {image,name};
}

function options(select,labels) {
  select.replaceChildren(...labels.map((label,i) => new Option(label,i)));
}
function range(id,value,suffix='') {
  $(id).value = value;
  $(id).nextElementSibling.value = value + suffix;
}
function sync() {
  const boxes = panels(state.layout,...formats[state.size]);
  options($('panel'),boxes.map((_,i) => '0'+(i+1)));
  $('panel').value = active;
  options($('panel-photo'),state.photos.map(p => p.name));
  $('panel-photo').value = state.assigned[active] ?? active % state.photos.length;
  $('photo-list').textContent = state.photos.map(p => p.name).join(' / ');
  for (const [id,key] of Object.entries(cropFields)) range(id,state.crops[active][key],key==='zoom'?'×':'');
  for (const id of finish) range(id,state[id],'%');
  for (const id of ['title','subtitle']) $(id).value = state[id];
  for (const b of document.querySelectorAll('[data-layout],[data-size]')) {
    const key = b.dataset.layout ? 'layout' : 'size';
    b.setAttribute('aria-pressed',b.dataset[key] === state[key]);
  }
  $('dimensions').textContent = formats[state.size].join(' × ');
}
const redraw = () => drawCover(canvas,state);
const png = () => new Promise((resolve,reject) => canvas.toBlob(blob => {
  if (blob) resolve(blob);
  else reject(new Error('PNG encoding failed'));
},'image/png'));

$('photos').onchange = async ({target}) => {
  const files = Array.from(target.files);
  target.value = '';
  const results = await Promise.allSettled(files.map(async file => {
    const url = URL.createObjectURL(file);
    try { return await decode(url,file.name); }
    finally { URL.revokeObjectURL(url); }
  }));
  const photos = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  if (photos.length) {
    if (usingSamples) {
      state.photos.length = state.assigned.length = 0;
      usingSamples = false;
    }
    state.photos.push(...photos);
    sync();
    redraw();
  }
  const failed = results.length - photos.length;
  $('status').textContent = failed ? failed+' photo(s) could not be opened.' : state.photos.length+' photos ready';
};
$('panel').onchange = e => { active = Number(e.target.value); sync(); };
$('panel-photo').onchange = e => { state.assigned[active] = Number(e.target.value); redraw(); };
canvas.onclick = e => {
  const box = canvas.getBoundingClientRect();
  const x = (e.clientX-box.left)*canvas.width/box.width, y = (e.clientY-box.top)*canvas.height/box.height;
  const i = panels(state.layout,canvas.width,canvas.height).findIndex(([a,b,w,h]) => x>=a && x<a+w && y>=b && y<b+h);
  if (i>=0) { active=i; sync(); }
};
for (const [id,key] of Object.entries(cropFields)) $(id).oninput = e => {
  state.crops[active][key] = Number(e.target.value);
  range(id,e.target.value,key==='zoom'?'×':'');
  redraw();
};
for (const id of finish) $(id).oninput = e => {
  state[id] = Number(e.target.value);
  range(id,state[id],'%');
  redraw();
};
for (const id of ['title','subtitle']) $(id).oninput = e => { state[id]=e.target.value; redraw(); };
for (const b of document.querySelectorAll('[data-layout],[data-size]')) b.onclick = () => {
  if (b.dataset.layout) { state.layout=b.dataset.layout; active=0; }
  if (b.dataset.size) state.size=b.dataset.size;
  sync();
  redraw();
};
$('export').onclick = async () => {
  const [w,h] = formats[state.size];
  try {
    const url = URL.createObjectURL(await png());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'afterglow-'+w+'x'+h+'.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    $('status').textContent = 'PNG ready · '+w+' × '+h;
  } catch (error) { $('status').textContent = error.message; }
};

async function openStudio() {
  const allowed = ['pier','boulevard'];
  const names = (query.get('photos') || allowed.join(',')).split(',').filter(n => allowed.includes(n));
  if (!names.length) names.push(...allowed);
  state.photos = await Promise.all(names.map(n => decode('./samples/'+n+'.jpg',n+'.jpg')));
  if (query.get('shot')) {
    for (const id of ['title','subtitle']) if (query.has(id)) state[id] = query.get(id);
    for (const id of finish) if (query.has(id)) state[id] = Math.min(100,Math.max(0,Number(query.get(id)) || 0));
    if (['triptych','mosaic','five'].includes(query.get('layout'))) state.layout = query.get('layout');
    if (Object.hasOwn(formats,query.get('size'))) state.size = query.get('size');
  }
  sync();
  redraw();
  if (query.has('shot')) await prepareShot(query.get('shot'),canvas,png,state.photos.length);
}
openStudio().catch(error => { $('status').textContent = error.message; console.error(error); });
