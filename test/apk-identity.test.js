const test = require('node:test');
const assert = require('node:assert/strict');
test('reads APK identity regardless of field order and extra versionCodeMajor', async () => {
  const {parseApkIdentity} = await import('../scripts/apk-identity.mjs');
  const digest='a'.repeat(64);
  const cert='Signer #1 certificate SHA-256 digest: ' + digest;
  for (const line of [
    "package: name='me.alaoufi.mrahi' versionCode='283' versionName='1.0.283'",
    "package: name='me.alaoufi.mrahi' versionCode='283' versionCodeMajor='0' versionName='1.0.283'",
    "package: versionName='1.0.283' name='me.alaoufi.mrahi' versionCode='283'"
  ]) assert.deepEqual(parseApkIdentity(cert,line), {applicationId:'me.alaoufi.mrahi',versionCode:283,versionName:'1.0.283',certificateSha256:digest});
  assert.throws(()=>parseApkIdentity('',"package: name='me.alaoufi.mrahi' versionCode='283' versionName='1.0.283'"),/Missing APK identity/);
});
