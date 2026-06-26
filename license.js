/* حلالي — التحقّق من ترخيص التفعيل (Ed25519، مطابق لآلية mdk_keygen).
   التطبيق يحمل المفتاح العامّ فقط ويتحقّق محلياً؛ البذرة السرّية تبقى في الـkeygen.
   النصّ المُوقَّع: "MRHL1|<معرّف الجهاز>|<المدّة بالأيام>". المدّة 0 = ترخيص دائم.
   يتطلّب تحميل nacl.min.js (tweetnacl) قبله. يعمل في تطبيق الجوال فقط. */
(function () {
  'use strict';
  var PUB_B64 = 'q6t0BfdSs/AF9EAHkRAwAoaqRwHFp7m052uCRxlwKw4=';   // المفتاح العامّ لحلالي (عامّ — آمن)
  var PREFIX = 'MRHL1';                                            // بادئة حلالي (تطابق الـkeygen)
  var B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function b32e(bytes) { var bits = 0, v = 0, o = ''; for (var i = 0; i < bytes.length; i++) { v = (v << 8) | bytes[i]; bits += 8; while (bits >= 5) { o += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } v &= (1 << bits) - 1; } if (bits > 0) o += B32[(v << (5 - bits)) & 31]; return o; }
  function b32d(str) { var bits = 0, v = 0, o = []; for (var i = 0; i < str.length; i++) { var idx = B32.indexOf(str[i]); if (idx < 0) continue; v = (v << 5) | idx; bits += 5; if (bits >= 8) { o.push((v >>> (bits - 8)) & 255); bits -= 8; } v &= (1 << bits) - 1; } return Uint8Array.from(o); }
  function norm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function enc(s) { return new TextEncoder().encode(s); }
  function b64ToBytes(b64) { var bin = atob(b64); var out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function bytesToB64(b) { var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // معرّف الجهاز: 10 بايت عشوائية ثابتة لهذا التثبيت (16 حرف Base32) — مع بدائل لئلا يفشل أبداً
  function genRaw() {
    var b = new Uint8Array(10);
    try { var c = window.crypto || (typeof crypto !== 'undefined' ? crypto : null); if (c && c.getRandomValues) c.getRandomValues(b); else throw 0; }
    catch (e) { for (var i = 0; i < 10; i++) b[i] = Math.floor(Math.random() * 256); }
    return b32e(b);
  }
  function deviceId() {
    var r = null; try { r = ls('mrahi_dev'); } catch (e) {}
    if (!r || r.length < 16) { r = genRaw(); lss('mrahi_dev', r); }
    return r;
  }
  function deviceIdPretty() { return deviceId().replace(/(.{4})/g, '$1-').replace(/-$/, ''); }

  function verify(code) {
    if (typeof nacl === 'undefined') return null;
    var pkt = b32d(norm(code));
    if (pkt.length !== 66) return null;
    var dur = (pkt[0] << 8) | pkt[1];
    var sig = pkt.slice(2);
    var msg = enc(PREFIX + '|' + deviceId() + '|' + dur);
    try { return nacl.sign.detached.verify(msg, sig, b64ToBytes(PUB_B64)) ? dur : null; } catch (e) { return null; }
  }
  function writeRecord(dur) { var now = Date.now(); lss('mrahi_lic', JSON.stringify({ d: dur, a: now, s: now })); }
  function deactivate() { try { localStorage.removeItem('mrahi_lic'); } catch (e) {} }   // يُعيد القفل (لا يحذف البيانات)
  function readRecord() { try { return JSON.parse(ls('mrahi_lic') || 'null'); } catch (e) { return null; } }
  function tryActivate(code) { var dur = verify(code); if (dur === null) return { ok: false }; writeRecord(dur); return { ok: true, dur: dur }; }
  function disabled() { return !PUB_B64 || PUB_B64.indexOf('REPLACE_') === 0; }
  function state() {
    if (disabled()) return { state: 'disabled' };
    var rec = readRecord();
    if (!rec) return { state: 'none' };
    var now = Date.now(), eff = Math.max(now, rec.s || 0);
    if (eff !== (rec.s || 0)) { rec.s = eff; lss('mrahi_lic', JSON.stringify(rec)); }   // حارس الساعة (لا إرجاع للوراء)
    if (rec.d === 0) return { state: 'active', permanent: true };
    var expiry = rec.a + rec.d * 86400000;
    if (eff < expiry) return { state: 'active', daysLeft: Math.ceil((expiry - eff) / 86400000), expiry: expiry };
    return { state: 'expired', expiry: expiry };
  }
  // استرجاع المالك ببذرته (64 hex) ⇒ تفعيل دائم (ضمانة ألّا يُحبَس المالك)
  function recoverWithSeed(seedHex) {
    if (typeof nacl === 'undefined') return false;
    var h = String(seedHex || '').trim().toLowerCase().replace(/[^0-9a-f]/g, '');
    if (h.length !== 64) return false;
    var seed = new Uint8Array(32); for (var i = 0; i < 32; i++) seed[i] = parseInt(h.substr(i * 2, 2), 16);
    try { var kp = nacl.sign.keyPair.fromSeed(seed); if (bytesToB64(kp.publicKey) === PUB_B64) { writeRecord(0); return true; } } catch (e) {}
    return false;
  }
  window.MrahiLicense = { deviceId: deviceId, deviceIdPretty: deviceIdPretty, state: state, tryActivate: tryActivate, recoverWithSeed: recoverWithSeed, deactivate: deactivate };
})();
