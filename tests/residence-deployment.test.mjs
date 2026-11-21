import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function put(path, contents='fixture') {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, contents);
}
test('Cloudflare release contains browser files, never server/database code or internal reports', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'residence-release-'));
  try {
    const src = join(tmp, 'portal');
    const out = join(tmp, 'output');
    for(const file of ['index.html','admin/index.html','student/index.html','questionnaire/index.html','icons/icon.svg','manifest.webmanifest','sw.js']) put(join(src,file));
    put(join(src,'staff.js'),'browser code');
    put(join(src,'supabase/manage/index.ts'),'NEVER PUBLISH');
    put(join(src,'supabase/migrations/secret.sql'),'NEVER PUBLISH');
    put(join(src,'reports/private-test.txt'),'NEVER PUBLISH');
    put(join(src,'DOCUMENTS-SETUP.md'),'NEVER PUBLISH');
    put(join(src,'icons/icon-192.png'),'PNG');
    const run = spawnSync(process.execPath, [join(root,'scripts/build-residence-pages.mjs')], {
      encoding:'utf8', env:{...process.env,RESIDENCE_SOURCE_DIR:src,RESIDENCE_OUTPUT_DIR:out}
    });
    assert.equal(run.status,0,run.stderr);
    assert.equal(readFileSync(join(out,'student-house-portal/staff.js'),'utf8'),'browser code');
    assert.equal(readFileSync(join(out,'student-house-portal/icons/icon-192.png'),'utf8'),'PNG');
    assert.equal(existsSync(join(out,'student-house-portal/supabase')),false);
    assert.equal(existsSync(join(out,'student-house-portal/reports')),false);
    assert.equal(existsSync(join(out,'student-house-portal/DOCUMENTS-SETUP.md')),false);
    assert.match(readFileSync(join(out,'_headers'),'utf8'),/X-Robots-Tag: noindex/);
    assert.match(readFileSync(join(out,'_redirects'),'utf8'),/\/student-house-portal\/ 302/);
  } finally {rmSync(tmp,{recursive:true,force:true});}
});

test('password recovery redirects stay on the deployed portal origin', () => {
  const portal = readFileSync(join(root, 'student-house-portal/index.html'), 'utf8');
  assert.match(portal, /redirectTo:location\.origin\+'\/student-house-portal\/'/);
  assert.match(portal, /window\.location\.replace\(location\.origin\+'\/student-house-portal\/'/);
  assert.doesNotMatch(portal, /redirectTo:'https:\/\/www\.webu\.sk\/student-house-portal\//);
  for (const mode of ['student','admin','questionnaire']) {
    const entry = readFileSync(join(root, 'student-house-portal', mode, 'index.html'), 'utf8');
    assert.match(entry, /redirectTo:location\.origin\+'\/student-house-portal\/'/);
    assert.match(entry, /window\.location\.replace\(location\.origin\+'\/student-house-portal\/'/);
  }
  const manage = readFileSync(join(root,'student-house-portal/supabase/manage/index.ts'), 'utf8');
  const mail = readFileSync(join(root,'student-house-portal/supabase/residence-mail/index.ts'), 'utf8');
  assert.match(manage, /Deno\.env\.get\('PORTAL_ORIGIN'\)/);
  assert.match(mail, /Deno\.env\.get\('RESIDENCE_PORTAL_BASE_URL'\)/);
});
