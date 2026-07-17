#!/usr/bin/env node
/* مولّد أكواد التفعيل (Ed25519) — مطابق لآلية التحقّق في license.js.
   يحتاج: npm i tweetnacl
   الاستخدام:
     node keygen.mjs new                          ← ينشئ زوج مفاتيح (عامّ + بذرة سرّية)
     node keygen.mjs code --seed <hex64> --device <ID> [--days N] [--prefix UNIV1]
   المدّة: أيام (0 = دائم). البادئة الافتراضية UNIV1 (اجعلها خاصّة بتطبيقك إن شئت). */
import nacl from 'tweetnacl';

const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // نفس أبجدية license.js
const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const enc = (s) => new TextEncoder().encode(s);
function b32e(bytes) { let bits = 0, v = 0, o = ''; for (const b of bytes) { v = (v << 8) | b; bits += 8; while (bits >= 5) { o += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } v &= (1 << bits) - 1; } if (bits > 0) o += B32[(v << (5 - bits)) & 31]; return o; }
const hex = (b) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (h) => { const o = new Uint8Array(h.length / 2); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; }
const b64 = (b) => Buffer.from(b).toString('base64');
const pretty = (c) => c.replace(/(.{4})/g, '$1-').replace(/-$/, '');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i > -1 ? process.argv[i + 1] : def; }

const cmd = process.argv[2];
if (cmd === 'new') {
  const kp = nacl.sign.keyPair();               // 32-byte seed = أول 32 بايت من secretKey
  const seed = kp.secretKey.slice(0, 32);
  console.log('المفتاح العامّ (ضعه في license.js → PUB_B64):');
  console.log('  ' + b64(kp.publicKey));
  console.log('البذرة السرّية (احتفظ بها في المولّد فقط — لا تضعها في التطبيق):');
  console.log('  ' + hex(seed));
} else if (cmd === 'code') {
  const seedHex = String(arg('seed', '')).toLowerCase().replace(/[^0-9a-f]/g, '');
  const device = norm(arg('device', ''));
  const days = parseInt(arg('days', '0'), 10) || 0;
  const prefix = arg('prefix', 'UNIV1');
  if (seedHex.length !== 64) { console.error('خطأ: --seed يجب أن يكون ٦٤ خانة hex'); process.exit(1); }
  if (!device) { console.error('خطأ: --device مطلوب (رقم الجهاز من التطبيق)'); process.exit(1); }
  const kp = nacl.sign.keyPair.fromSeed(unhex(seedHex));
  const msg = enc(prefix + '|' + device + '|' + days);
  const sig = nacl.sign.detached(msg, kp.secretKey);   // 64 بايت
  const pkt = new Uint8Array(66);
  pkt[0] = (days >>> 8) & 255; pkt[1] = days & 255; pkt.set(sig, 2);
  const code = b32e(pkt);
  console.log('الجهاز: ' + device + ' | المدّة: ' + (days === 0 ? 'دائم' : days + ' يوم') + ' | البادئة: ' + prefix);
  console.log('الكود:  ' + pretty(code));
  console.log('(بلا شرطات): ' + code);
} else {
  console.log('استخدام:\n  node keygen.mjs new\n  node keygen.mjs code --seed <hex64> --device <ID> [--days N] [--prefix UNIV1]');
}
