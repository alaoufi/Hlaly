/* appguard.js — حماية تفعيل داخل التطبيق (Ed25519، بلا إنترنت، مربوطة بالجهاز).
   يحمل المفتاح العامّ فقط ويتحقّق محلياً. البذرة السرّية تبقى في المولّد (keygen) — ليست هنا.
   المتطلّبات: حمّل nacl.min.js (tweetnacl) قبل هذا الملف. يعمل في أي تطبيق ويب/Capacitor.
   الاستخدام: راجع INAPP_INTEGRATION_GUIDE.md */
(function () {
  'use strict';

  /* ====== ١) الإعدادات — عدّلها لتطبيقك ====== */
  var PUB_B64 = 'REPLACE_WITH_YOUR_PUBLIC_KEY_BASE64';   // من: node keygen.mjs new
  var PREFIX  = 'UNIV1';                                  // نفس بادئة المولّد (اجعلها خاصّة بتطبيقك إن شئت)
  var SALT    = 'yourapp:';                               // ملح اشتقاق رقم الجهاز (أي نصّ ثابت)
  var K_DEV   = 'ag_device';                              // مفتاح تخزين رقم الجهاز
  var K_LIC   = 'ag_license';                             // مفتاح تخزين سجلّ التفعيل

  /* ====== ٢) أدوات ====== */
  var B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function b32e(b){var bits=0,v=0,o='';for(var i=0;i<b.length;i++){v=(v<<8)|b[i];bits+=8;while(bits>=5){o+=B32[(v>>>(bits-5))&31];bits-=5;}v&=(1<<bits)-1;}if(bits>0)o+=B32[(v<<(5-bits))&31];return o;}
  function b32d(s){var bits=0,v=0,o=[];for(var i=0;i<s.length;i++){var k=B32.indexOf(s[i]);if(k<0)continue;v=(v<<5)|k;bits+=5;if(bits>=8){o.push((v>>>(bits-8))&255);bits-=8;}v&=(1<<bits)-1;}return Uint8Array.from(o);}
  function norm(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
  function enc(s){return new TextEncoder().encode(s);}
  function b64ToBytes(b){var x=atob(b),o=new Uint8Array(x.length);for(var i=0;i<x.length;i++)o[i]=x.charCodeAt(i);return o;}
  function bytesToB64(b){var s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s);}
  function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function lss(k,v){try{localStorage.setItem(k,v);}catch(e){}}

  /* ====== ٣) رقم الجهاز (ثابت لكل تثبيت، ١٦ حرف Base32) ====== */
  function genRaw(){var b=new Uint8Array(10);try{(window.crypto||crypto).getRandomValues(b);}catch(e){for(var i=0;i<10;i++)b[i]=Math.floor(Math.random()*256);}return b32e(b);}
  function deviceId(){var r=ls(K_DEV);if(!r||r.length<16){r=genRaw();lss(K_DEV,r);}return r;}
  function deviceIdPretty(){return deviceId().replace(/(.{4})/g,'$1-').replace(/-$/,'');}

  /* ====== ٤) التحقّق والحالة ====== */
  function verify(code){
    if(typeof nacl==='undefined')return null;
    var pkt=b32d(norm(code));if(pkt.length!==66)return null;
    var dur=(pkt[0]<<8)|pkt[1],sig=pkt.slice(2);
    var msg=enc(PREFIX+'|'+norm(deviceId())+'|'+dur);
    try{return nacl.sign.detached.verify(msg,sig,b64ToBytes(PUB_B64))?dur:null;}catch(e){return null;}
  }
  function writeRec(dur){var t=Date.now();lss(K_LIC,JSON.stringify({d:dur,a:t,s:t}));}
  function readRec(){try{return JSON.parse(ls(K_LIC)||'null');}catch(e){return null;}}
  function tryActivate(code){var d=verify(code);if(d===null)return{ok:false};writeRec(d);return{ok:true,dur:d};}
  function deactivate(){try{localStorage.removeItem(K_LIC);}catch(e){}}   // يُعيد القفل، لا يحذف بيانات المستخدم
  function disabled(){return !PUB_B64||PUB_B64.indexOf('REPLACE_')===0;}
  function state(){
    if(disabled())return{state:'disabled'};
    var r=readRec();if(!r)return{state:'none'};
    var now=Date.now(),eff=Math.max(now,r.s||0);
    if(eff!==(r.s||0)){r.s=eff;lss(K_LIC,JSON.stringify(r));}   // حارس الساعة (لا إرجاع للوراء)
    if(r.d===0)return{state:'active',permanent:true};
    var exp=r.a+r.d*86400000;
    return eff<exp?{state:'active',daysLeft:Math.ceil((exp-eff)/86400000),expiry:exp}:{state:'expired',expiry:exp};
  }
  // ضمانة المالك: يدخل بذرته السرّية (64 hex) ⇒ تفعيل دائم (كي لا يُحبَس أبداً)
  function recoverWithSeed(hexSeed){
    if(typeof nacl==='undefined')return false;
    var h=String(hexSeed||'').trim().toLowerCase().replace(/[^0-9a-f]/g,'');if(h.length!==64)return false;
    var seed=new Uint8Array(32);for(var i=0;i<32;i++)seed[i]=parseInt(h.substr(i*2,2),16);
    try{var kp=nacl.sign.keyPair.fromSeed(seed);if(bytesToB64(kp.publicKey)===PUB_B64){writeRec(0);return true;}}catch(e){}
    return false;
  }

  window.AppGuard={deviceId:deviceId,deviceIdPretty:deviceIdPretty,state:state,tryActivate:tryActivate,deactivate:deactivate,recoverWithSeed:recoverWithSeed};
})();
