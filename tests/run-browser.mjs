import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const files=['tests/registration.browser.mjs','tests/browser.mjs','tests/session-switch.browser.mjs','scripts/test_student_house_services_browser.mjs'];
let failures=0;
for(const file of files){const result=spawnSync(process.execPath,[file],{stdio:'inherit',env:{...process.env,NODE_PATH:resolve('tests/node_modules')},timeout:150000});if(result.status!==0){failures++;console.error('FAILED browser scenario file:',file,result.error?.message||'');}}
if(failures)process.exitCode=1;
