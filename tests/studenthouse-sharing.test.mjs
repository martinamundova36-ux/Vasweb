import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const main = fs.readFileSync('student-house-portal/index.html', 'utf8');
const share = fs.readFileSync('student-house-portal/share.js', 'utf8');
const native = fs.readFileSync('android-studenthouse/app/src/main/java/sk/studenthouse/app/MainActivity.java', 'utf8');

test('share JavaScript syntax is valid', () => assert.doesNotThrow(() => new vm.Script(share)));
test('all portal entry variants expose share button and WEBU credit', () => {
  for (const path of ['student-house-portal/index.html', 'student-house-portal/student/index.html', 'student-house-portal/admin/index.html', 'student-house-portal/questionnaire/index.html']) {
    const html = fs.readFileSync(path, 'utf8');
    assert.match(html, /id="shareStudenthouse"/);
    assert.match(html, /Created by <a href="https:\/\/www\.webu\.sk\/"/);
    assert.match(html, /student-house-portal\/share\.js/);
  }
});
test('share payload is a fixed public app link, never current page URL', () => {
  assert.match(share, /const publicUrl = 'https:\/\/www\.webu\.sk\/student-house-portal\/'/);
  assert.doesNotMatch(share, /location\.href\s*[,;}\)]|location\.search|location\.hash|document\.URL|document\.location/);
  assert.match(share, /navigator\.share\(shareData\)/);
  assert.match(native, /Intent\.ACTION_SEND/);
  assert.match(native, /"studenthouse-share"\.equalsIgnoreCase\(uri\.getScheme\(\)\)/);
  assert.match(native, /send\.putExtra\(Intent\.EXTRA_TEXT/);
  assert.doesNotMatch(native, /addJavascriptInterface/);
});

test('full Student House Bratislava branding in installable and Android apps', () => {
  const manifest = JSON.parse(fs.readFileSync('student-house-portal/manifest.webmanifest', 'utf8'));
  const androidManifest = fs.readFileSync('android-studenthouse/app/src/main/AndroidManifest.xml', 'utf8');
  const offline = fs.readFileSync('student-house-portal/offline.html', 'utf8');
  const install = fs.readFileSync('student-house-portal/install.js', 'utf8');
  assert.equal(manifest.name, 'Student House Bratislava');
  assert.equal(manifest.short_name, 'Student House Bratislava');
  assert.match(androidManifest, /android:label="Student House Bratislava"/);
  assert.match(main, /content="Student House Bratislava"/);
  assert.match(main, /Zdieľať Student House Bratislava/);
  assert.match(main, /Nainštalovať Student House Bratislava/);
  assert.match(share, /title: 'Student House Bratislava'/);
  assert.match(offline, /<h1>Student House Bratislava<\/h1>/);
  assert.match(install, /Student House Bratislava v Chrome/);
  assert.match(native, /Intent\.EXTRA_SUBJECT, "Student House Bratislava"/);
});


test('Student House app and share preview never use root WEBU favicon', () => {
  const pages = ['student-house-portal/index.html', 'student-house-portal/student/index.html', 'student-house-portal/admin/index.html', 'student-house-portal/questionnaire/index.html', 'student-house-portal/offline.html', 'student-house-portal/correction/index.html', 'student-house-portal/preview.html'];
  for (const path of pages) {
    const html = fs.readFileSync(path, 'utf8');
    assert.ok(html.includes('href="/student-house-portal/icons/icon.svg"'), path + ' has Student House icon');
    assert.ok(!html.includes('href="/favicon'), path + ' must not use WEBU root icon');
    assert.ok(!html.includes('href="/apple-touch-icon.png"'), path + ' must not use WEBU Apple icon');
  }
  for (const path of pages.slice(0, 4)) {
    const html = fs.readFileSync(path, 'utf8');
    assert.ok(html.includes('property="og:image" content="https://www.webu.sk/student-house-portal/icons/icon-512.png"'), path + ' has share image');
    assert.ok(html.includes('property="og:site_name" content="Student House Bratislava"'), path + ' has Student House brand');
    assert.ok(!html.includes('by WEBU</title>'), path + ' title must not contain WEBU');
  }
  assert.ok(!share.includes('Created by WEBU'), 'Share message must not display WEBU');
  assert.ok(!native.includes('Created by WEBU'), 'Native share message must not display WEBU');
});
