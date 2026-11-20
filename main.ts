import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const project = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(destination, { recursive: true });
cpSync(join(project, 'app'), join(destination, 'app'), { recursive: true });
mkdirSync(join(destination, 'screenshots'), { recursive: true });
if (existsSync(join(project, 'screenshots'))) {
  cpSync(join(project, 'screenshots'), join(destination, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(destination, 'dossier.json'), dossier);

// Ensure every screenshot represented by the dossier made it into the handoff intact.
function confirmDossierScreenshots(result) {
  const listedScreenshots = result.images.map(({ name }) => name);
  for (const name of listedScreenshots) {
    const copiedPath = join(destination, 'screenshots', name);
    if (!existsSync(copiedPath)) throw new Error(`Copied screenshot is missing: ${name}`);
    const bytes = statSync(copiedPath).size;
    if (bytes <= 5 * 1024) throw new Error(`Copied screenshot is too small (${bytes} bytes): ${name}`);
    console.log(`${name}: ${bytes} bytes`);
  }
}

confirmDossierScreenshots(JSON.parse(Buffer.from(dossier).toString('utf8')));
