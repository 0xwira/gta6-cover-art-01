import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const source = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  cpSync(join(source, name), join(destination, name), { recursive: true });
}

function confirmDossierScreenshots(dossierBytes) {
  const dossier = JSON.parse(new TextDecoder().decode(dossierBytes));
  for (const image of dossier.images) {
    const path = join(destination, 'screenshots', image.name);
    let bytes;
    try {
      bytes = statSync(path).size;
    } catch {
      throw new Error(`Dossier screenshot is missing: ${image.name}`);
    }
    if (bytes <= 5 * 1024) {
      throw new Error(`Dossier screenshot is too small: ${image.name} (${bytes} bytes)`);
    }
  }
}

function summarizeCopiedFiles(directory) {
  for (const entry of readdirSync(join(destination, directory), { withFileTypes: true })) {
    const name = join(directory, entry.name);
    if (entry.isDirectory()) {
      summarizeCopiedFiles(name);
    } else if (entry.isFile()) {
      console.log(`${name}: ${statSync(join(destination, name)).size} bytes`);
    }
  }
}

mkdirSync(destination, { recursive: true });
copyTree('app');
copyTree('screenshots');

const dossierBytes = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(destination, 'dossier.json'), dossierBytes);
confirmDossierScreenshots(dossierBytes);
summarizeCopiedFiles('app');
summarizeCopiedFiles('screenshots');
