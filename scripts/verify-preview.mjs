// Use the existing release configuration without logging or duplicating its credentials.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseApkIdentity } from './apk-identity.mjs';
const root = join(process.env.ANDROID_HOME, 'build-tools');
const versions = readdirSync(root).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
const tool = name => join(root, versions.at(-1), name);
const run = (name,args) => execFileSync(tool(name),args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const release = readFileSync('.github/workflows/android.yml','utf8');
const store = release.match(/--ks-pass pass:([^\s]+)/)?.[1];
const key = release.match(/--key-pass pass:([^\s]+)/)?.[1];
if (!store || !key) throw new Error('Existing signing configuration unavailable');
mkdirSync('preview-output',{recursive:true});
const apk='preview-output/hlaly-preview.apk';
try {
  run('zipalign',['-p','-f','4','android/app/build/outputs/apk/release/app-release-unsigned.apk','preview-aligned.apk']);
  // Credentials travel through child environment, never command arguments or logs.
  execFileSync(tool('apksigner'),['sign','--ks','release.keystore','--ks-pass','env:PREVIEW_STORE_PASS','--key-pass','env:PREVIEW_KEY_PASS','--out',apk,'preview-aligned.apk'],{env:{...process.env,PREVIEW_STORE_PASS:store,PREVIEW_KEY_PASS:key},stdio:'pipe'});
} catch { throw new Error('APK alignment/signing failed (details suppressed to protect credentials)'); }
function inspect(file) {
  const cert=run('apksigner',['verify','--print-certs',file]);
  const badging=run('aapt',['dump','badging',file]);
  return parseApkIdentity(cert, badging);
}
const previous=inspect('previous.apk'), preview=inspect(apk);
if (preview.applicationId !== 'me.alaoufi.mrahi' || preview.applicationId !== previous.applicationId || preview.certificateSha256 !== previous.certificateSha256 || preview.versionCode <= previous.versionCode) throw new Error('APK update compatibility check failed');
const verification={sourceCommit:process.env.GITHUB_SHA,previous,preview,sha256:createHash('sha256').update(readFileSync(apk)).digest('hex'),note:'Package, signature and version verified; on-device data preservation not tested.'};
writeFileSync('preview-output/verification.json',JSON.stringify(verification,null,2));
console.log(JSON.stringify(verification,null,2));
