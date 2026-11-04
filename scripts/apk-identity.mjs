export function parseApkIdentity(cert, badging) {
  const certificateSha256 = cert.match(/certificate SHA-256 digest:\s*([a-fA-F0-9]{64})/)?.[1]?.toLowerCase();
  const packageLine = badging.split(/\r?\n/).find(line => line.startsWith('package:')) || '';
  const applicationId = packageLine.match(/\bname='([^']+)'/)?.[1];
  const versionCode = packageLine.match(/\bversionCode='(\d+)'/)?.[1];
  const versionName = packageLine.match(/\bversionName='([^']*)'/)?.[1];
  if (!certificateSha256 || !applicationId || !versionCode || versionName == null) {
    throw new Error('Missing APK identity: ' + JSON.stringify({ certificate: !!certificateSha256, applicationId: !!applicationId, versionCode: !!versionCode, versionName: versionName != null }));
  }
  return { applicationId, versionCode: Number(versionCode), versionName, certificateSha256 };
}
