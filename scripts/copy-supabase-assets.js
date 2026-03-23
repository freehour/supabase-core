// scripts/copy-supabase-assets.js
// Copies migrations and schemas from @freehour/supabase-core to ./supabase in the consuming package

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find the package root (assume script is in node_modules/@freehour/supabase-core/scripts)
const packageRoot = resolve(__dirname, '..');
const sourceDir = join(packageRoot, 'supabase');
const destDir = resolve(packageRoot, '..', '..', '..', 'supabase');

function copyRecursive(src, dest) {
  if (!existsSync(src)) {
    console.warn(`[WARN] Source does not exist: ${src}`);
    return;
  }
  let stats;
  try {
    stats = statSync(src);
  } catch (err) {
    console.error(`[ERROR] Failed to stat: ${src}`, err);
    return;
  }
  if (stats.isDirectory()) {
    if (!existsSync(dest)) {
      try {
        mkdirSync(dest, { recursive: true });
        console.log(`[INFO] Created directory: ${dest}`);
      } catch (err) {
        console.error(`[ERROR] Failed to create directory: ${dest}`, err);
        return;
      }
    }
    for (const file of readdirSync(src)) {
      copyRecursive(join(src, file), join(dest, file));
    }
  } else {
    try {
      copyFileSync(src, dest);
      console.log(`[INFO] Copied file: ${src} -> ${dest}`);
    } catch (err) {
      console.error(`[ERROR] Failed to copy file: ${src} -> ${dest}`, err);
    }
  }
}

if (process.env.INIT_CWD === process.cwd())
  process.exit(); // Prevent running in the package root

// Copy migrations and schemas folders
for (const folder of ['migrations', 'schemas']) {
  const src = join(sourceDir, folder);
  const dest = join(destDir, folder);
  copyRecursive(src, dest);
}
