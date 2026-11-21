/**
 * Build a stand-alone Cloudflare Pages artifact for WEBU Residence.
 * Only browser assets are copied, never Supabase server code, migrations or reports.
 */
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync, writeFileSync, lstatSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.env.RESIDENCE_SOURCE_DIR || join(repoRoot, 'student-house-portal'));
const output = resolve(process.env.RESIDENCE_OUTPUT_DIR || join(repoRoot, '.residence-pages-dist'));
const publicDirectories = ['admin', 'student', 'questionnaire', 'correction', 'icons'];
const allowedExtensions = new Set(['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.svg', '.webmanifest']);
const mustExist = ['index.html', 'admin/index.html', 'student/index.html', 'questionnaire/index.html', 'icons/icon.svg', 'manifest.webmanifest', 'sw.js'];

if (!existsSync(source)) throw new Error('Residence source directory not found: ' + source);
if (output === source || output.startsWith(source + '/')) throw new Error('Output must be outside the source directory');
for (const file of mustExist) if (!existsSync(join(source, file))) throw new Error('Required runtime file missing: ' + file);

rmSync(output, {recursive: true, force: true});
const appOutput = join(output, 'student-house-portal');
mkdirSync(appOutput, {recursive: true});
let files = 0;
function copyPublicFile(file, target) {
  const stat = lstatSync(file);
  if (stat.isSymbolicLink()) throw new Error('Symlinks not permitted in release: ' + file);
  if (!stat.isFile() || !allowedExtensions.has(extname(file).toLowerCase())) return;
  mkdirSync(dirname(target), {recursive: true});
  copyFileSync(file, target);
  files++;
}
function copyPublicFolder(from, to) {
  if (!existsSync(from)) return;
  for (const entry of readdirSync(from, {withFileTypes: true})) {
    const file = join(from, entry.name), target = join(to, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symlinks not permitted in release: ' + file);
    if (entry.isDirectory()) copyPublicFolder(file, target);
    else copyPublicFile(file, target);
  }
}
for (const entry of readdirSync(source, {withFileTypes: true})) {
  if (entry.isFile()) copyPublicFile(join(source, entry.name), join(appOutput, entry.name));
}
for (const folder of publicDirectories) copyPublicFolder(join(source, folder), join(appOutput, folder));

// Preserve the absolute /student-house-portal/... paths used by the existing PWA.
// The main website is neither copied nor modified.
writeFileSync(join(output, 'index.html'), '<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0; url=/student-house-portal/"><title>Student House Bratislava</title></head><body><a href="/student-house-portal/">Otvoriť študentský portál</a></body></html>\n');
writeFileSync(join(output, '_redirects'), '/ /student-house-portal/ 302\n');
writeFileSync(join(output, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  X-Robots-Tag: noindex, nofollow, noarchive\n');
console.log('Residence release prepared: ' + files + ' public assets in ' + output);
