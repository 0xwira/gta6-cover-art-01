import { cpSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const source = fileURLToPath(new URL('.',import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const shots = JSON.parse(readFileSync(join(source,'shots.json'),'utf8')) as { name:string }[];

function verifyScreenshots(names: string[]) {
  for (const name of names) {
    let bytes: number;
    try { bytes = statSync(join(output,'screenshots',name)).size; }
    catch { throw new Error('Missing copied screenshot: '+name); }
    if (bytes <= 5120) throw new Error('Copied screenshot is 5 KB or smaller: '+name);
  }
}

function inventory(relative: string) {
  const path = join(output,relative);
  const entry = statSync(path);
  if (entry.isDirectory()) {
    for (const name of readdirSync(path).sort()) inventory(join(relative,name));
  } else console.log(relative+': '+entry.size+' bytes');
}

mkdirSync(output,{recursive:true});
for (const folder of ['app','screenshots']) cpSync(join(source,folder),join(output,folder),{recursive:true});
verifyScreenshots(shots.map(shot => shot.name));
const dossier = buildDossier(output,{
  text_max_bytes:163840,
  screenshots:{max:4,max_bytes:262144},
  app_max_files:993,
  app_max_bytes:50331648,
  app_path_max_bytes:1000
});
verifyScreenshots(JSON.parse(Buffer.from(dossier).toString()).images.map(({name}: {name:string}) => name));
writeFileSync(join(output,'dossier.json'),dossier);
for (const item of ['app','screenshots','dossier.json']) inventory(item);
