import { drawCover } from './cover.js';
import { runShot } from './shots.js';

const canvas=document.getElementById('cover');
const status=document.getElementById('status');
const fields={title:document.getElementById('title'),subtitle:document.getElementById('subtitle'),grade:document.getElementById('grade'),grain:document.getElementById('grain'),vignette:document.getElementById('vignette')};
const sizeMap={square:[1080,1080,'1080 × 1080'],portrait:[1080,1350,'1080 × 1350'],landscape:[1920,1080,'1920 × 1080']};
const state={photos:[],_photos:[],assignments:[],crops:[],layout:'triptych',grade:78,grain:30,vignette:58,title:fields.title.value,subtitle:fields.subtitle.value,size:'square'};
let activePanel=0;

function selectedPhotoIndex(){return Number(document.getElementById('panel-photo').value)||0;}
function fitCanvas(){const [w,h]=sizeMap[state.size];if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
function redraw(){fitCanvas();drawCover(canvas,state);window.__posterDrawCount=(window.__posterDrawCount||0)+1;}
function setStatus(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
function syncCropControls(){const crop=state.crops[activePanel]||{x:0,y:0,zoom:1};for(const [id,key] of [['crop-x','x'],['crop-y','y'],['zoom','zoom']]){const input=document.getElementById(id);input.value=crop[key];input.nextElementSibling.value=id==='zoom'?`${Number(crop[key]).toFixed(1)}×`:Number(crop[key]).toFixed(2);}}
function refreshPhotoControls(){
  const select=document.getElementById('panel-photo');select.replaceChildren();
  state._photos.forEach((photo,index)=>{const option=document.createElement('option');option.value=index;option.textContent=photo.name;select.append(option);});
  if(!state.photos.length){const option=document.createElement('option');option.value='0';option.textContent='Add a photo to begin';select.append(option);}
  select.value=String(state.assignments[activePanel]??0);
  document.getElementById('panel-name').textContent=`PANEL ${String(activePanel+1).padStart(2,'0')}`;
  const list=document.getElementById('photo-list');list.replaceChildren();
  state._photos.forEach((photo,index)=>{const chip=document.createElement('span');chip.className='photo-chip';chip.textContent=`${index+1} · ${photo.name}`;chip.title=photo.name;list.append(chip);});
  syncCropControls();
}
function updateRange(input){const key=input.id==='grade'?'grade':input.id==='grain'?'grain':input.id==='vignette'?'vignette':input.id==='crop-x'?'x':input.id==='crop-y'?'y':'zoom';const value=Number(input.value);if(key==='x'||key==='y'||key==='zoom'){state.crops[activePanel]??={x:0,y:0,zoom:1};state.crops[activePanel][key]=value;input.nextElementSibling.value=key==='zoom'?`${value.toFixed(1)}×`:value.toFixed(2);}else{state[key]=value;input.nextElementSibling.value=`${value}%`;}redraw();}

document.getElementById('photos').addEventListener('change',async event=>{
  const files=[...event.target.files];
  for(const file of files){if(!file.type.startsWith('image/'))continue;const url=URL.createObjectURL(file);const photo=new Image();photo.src=url;try{await photo.decode();state.photos.push(photo);state._photos.push({image:photo,name:file.name,url});}catch{URL.revokeObjectURL(url);}}
  if(state.photos.length){state.assignments=state.assignments.length?state.assignments:state.photos.map((_,i)=>i);for(let i=0;i<5;i++)state.crops[i]??={x:0,y:0,zoom:1};refreshPhotoControls();redraw();setStatus(`${state.photos.length} photo${state.photos.length===1?'':'s'} ready · assign one to each frame.`);}
  event.target.value='';
});
document.getElementById('panel-photo').addEventListener('change',event=>{state.assignments[activePanel]=Number(event.target.value);redraw();});
for(const input of document.querySelectorAll('input[type="range"]'))input.addEventListener('input',()=>updateRange(input));
for(const key of ['title','subtitle'])fields[key].addEventListener('input',()=>{state[key]=fields[key].value;redraw();});
for(const button of document.querySelectorAll('.template'))button.addEventListener('click',()=>{document.querySelectorAll('.template').forEach(item=>item.classList.toggle('active',item===button));state.layout=button.dataset.layout;activePanel=0;refreshPhotoControls();redraw();});
for(const button of document.querySelectorAll('.size-option'))button.addEventListener('click',()=>{document.querySelectorAll('.size-option').forEach(item=>item.classList.toggle('active',item===button));state.size=button.dataset.size;document.querySelector('#export small').textContent=sizeMap[state.size][2];redraw();});
document.getElementById('panel-photo').addEventListener('focus',()=>{});
document.getElementById('export').addEventListener('click',()=>{const [w,h,dimensions]=sizeMap[state.size];canvas.toBlob(blob=>{if(!blob){setStatus('PNG export failed. Try again.',true);return;}const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`afterglow-${w}x${h}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);setStatus(`Saved afterglow-${w}x${h}.png · ${dimensions} px`);},'image/png');});

// Each panel is selectable from the panel label; clicking the preview cycles active crop targets.
canvas.addEventListener('click',event=>{
  const rect=canvas.getBoundingClientRect(),unit=Math.min(canvas.width,canvas.height);
  const x=(event.clientX-rect.left)/rect.width*canvas.width/unit;
  const y=(event.clientY-rect.top)/rect.height*canvas.height/unit;
  const wide=canvas.width>canvas.height*1.22,panelScale=wide?canvas.width/unit:1,panelOffsetX=0;
  const panels={triptych:[[.055,.095,.55,.43],[.625,.095,.32,.30],[.625,.415,.32,.30]],mosaic:[[.055,.095,.43,.40],[.505,.095,.44,.26],[.505,.385,.44,.34],[.055,.515,.43,.20]],five:[[.055,.095,.42,.38],[.495,.095,.45,.23],[.495,.355,.45,.25],[.055,.495,.29,.22],[.365,.625,.58,.09]]}[state.layout];
  const index=panels.findIndex(([px,py,pw,ph])=>x>=panelOffsetX+px*panelScale&&x<=panelOffsetX+(px+pw)*panelScale&&y>=py&&y<=py+ph);
  if(index<0)return;activePanel=index;refreshPhotoControls();setStatus(`Editing crop for panel ${String(activePanel+1).padStart(2,'0')}.`);
});

const query=new URLSearchParams(location.search);
const shot=query.get('shot');
if(shot){runShot(shot,query,async sampleNames=>{
  for(const name of sampleNames){const img=new Image();img.src=`samples/${name}`;await img.decode();state.photos.push(img);state._photos.push({image:img,name});}
  state.assignments=state._photos.map((_,i)=>i);for(let i=0;i<5;i++)state.crops[i]={x:0,y:0,zoom:1};
  if(query.get('layout')){state.layout=query.get('layout');document.querySelectorAll('.template').forEach(button=>button.classList.toggle('active',button.dataset.layout===state.layout));}
  state.title=query.get('title')||'NEON HORIZON';state.subtitle=query.get('subtitle')||'THE CITY NEVER SLEEPS';fields.title.value=state.title;fields.subtitle.value=state.subtitle;
  state.grade=Number(query.get('grade')||78);state.grain=Number(query.get('grain')||30);state.vignette=Number(query.get('vignette')||58);
  if(query.get('size'))state.size=query.get('size');
  const activeSize=document.querySelector(`.size-option[data-size="${state.size}"]`);if(activeSize){document.querySelectorAll('.size-option').forEach(button=>button.classList.toggle('active',button===activeSize));document.querySelector('#export small').textContent=sizeMap[state.size][2];}
  refreshPhotoControls();redraw();window.__shotPhotosDecoded=state.photos.filter(photo=>photo.complete&&photo.naturalWidth>0).length;
});}else{refreshPhotoControls();redraw();}
