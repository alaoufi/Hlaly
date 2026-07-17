/* guard.js — حماية تفعيل جاهزة بالكامل (بلا أي اجتهاد من المطوّر).
   ضعه بجانب index.html، وأضف سطرين في <head>:
       <script src="nacl.min.js"></script>
       <script src="guard.js"></script>
   ثم عدّل PUBLIC_KEY أدناه فقط. سيعرض شاشة تفعيل تلقائياً تغطّي التطبيق حتى يُفعَّل.
   بلا إنترنت. التفعيل مربوط بالجهاز. المولّد (keygen) منفصل — البذرة السرّية ليست هنا. */
(function () {
  'use strict';

  /* ========== عدّل هذا فقط ========== */
  var PUBLIC_KEY = 'REPLACE_WITH_YOUR_PUBLIC_KEY_BASE64';   // من: node keygen.mjs new
  var PREFIX     = 'UNIV1';                                  // نفس بادئة المولّد
  var SALT       = 'app:';                                   // أي نصّ ثابت
  var APP_NAME   = 'التطبيق';                                // اسم يظهر في شاشة التفعيل
  var OWNER_SEED_RECOVERY = true;                            // إتاحة استرجاع المالك ببذرته
  /* ================================= */

  var B32='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', K_DEV='guard_device', K_LIC='guard_license';
  function b32e(b){var t=0,v=0,o='';for(var i=0;i<b.length;i++){v=(v<<8)|b[i];t+=8;while(t>=5){o+=B32[(v>>>(t-5))&31];t-=5;}v&=(1<<t)-1;}if(t>0)o+=B32[(v<<(5-t))&31];return o;}
  function b32d(s){var t=0,v=0,o=[];for(var i=0;i<s.length;i++){var k=B32.indexOf(s[i]);if(k<0)continue;v=(v<<5)|k;t+=5;if(t>=8){o.push((v>>>(t-8))&255);t-=8;}v&=(1<<t)-1;}return Uint8Array.from(o);}
  function norm(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
  function enc(s){return new TextEncoder().encode(s);}
  function b64b(b){var x=atob(b),o=new Uint8Array(x.length);for(var i=0;i<x.length;i++)o[i]=x.charCodeAt(i);return o;}
  function bb64(b){var s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s);}
  function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function lss(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  function genRaw(){var b=new Uint8Array(10);try{(window.crypto||crypto).getRandomValues(b);}catch(e){for(var i=0;i<10;i++)b[i]=Math.floor(Math.random()*256);}return b32e(b);}
  function deviceId(){var r=ls(K_DEV);if(!r||r.length<16){r=genRaw();lss(K_DEV,r);}return r;}
  function pretty(){return deviceId().replace(/(.{4})/g,'$1-').replace(/-$/,'');}
  function verify(code){if(typeof nacl==='undefined')return null;var p=b32d(norm(code));if(p.length!==66)return null;var d=(p[0]<<8)|p[1],sig=p.slice(2);try{return nacl.sign.detached.verify(enc(PREFIX+'|'+norm(deviceId())+'|'+d),sig,b64b(PUBLIC_KEY))?d:null;}catch(e){return null;}}
  function writeRec(d){var t=Date.now();lss(K_LIC,JSON.stringify({d:d,a:t,s:t}));}
  function readRec(){try{return JSON.parse(ls(K_LIC)||'null');}catch(e){return null;}}
  function disabled(){return !PUBLIC_KEY||PUBLIC_KEY.indexOf('REPLACE_')===0;}
  function state(){if(disabled())return'disabled';var r=readRec();if(!r)return'none';var now=Date.now(),eff=Math.max(now,r.s||0);if(eff!==(r.s||0)){r.s=eff;lss(K_LIC,JSON.stringify(r));}if(r.d===0)return'active';return eff<r.a+r.d*86400000?'active':'expired';}
  function recover(hex){if(typeof nacl==='undefined')return false;var h=String(hex||'').trim().toLowerCase().replace(/[^0-9a-f]/g,'');if(h.length!==64)return false;var s=new Uint8Array(32);for(var i=0;i<32;i++)s[i]=parseInt(h.substr(i*2,2),16);try{var kp=nacl.sign.keyPair.fromSeed(s);if(bb64(kp.publicKey)===PUBLIC_KEY){writeRec(0);return true;}}catch(e){}return false;}

  window.AppGuard={deviceId:deviceId,deviceIdPretty:pretty,state:state,
    tryActivate:function(c){var d=verify(c);if(d===null)return{ok:false};writeRec(d);return{ok:true,dur:d};},
    deactivate:function(){try{localStorage.removeItem(K_LIC);}catch(e){}},recoverWithSeed:recover};

  /* ========== شاشة التفعيل التلقائية ========== */
  function showGate(){
    var wrap=document.createElement('div');
    wrap.dir='rtl';
    wrap.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0f2b46;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto';
    wrap.innerHTML='<div style="background:#fff;color:#222;max-width:400px;width:100%;border-radius:16px;padding:22px;box-shadow:0 12px 40px rgba(0,0,0,.4);text-align:center">'
      +'<div style="font-size:2.2rem">🔐</div>'
      +'<h2 style="margin:6px 0 2px">تفعيل '+APP_NAME+'</h2>'
      +'<p style="color:#666;font-size:.9rem;margin:0 0 14px">أرسل «رقم الجهاز» للمطوّر لتصلك رمز التفعيل (يعمل دون إنترنت).</p>'
      +'<div style="font-size:.8rem;color:#888">رقم الجهاز</div>'
      +'<div id="g_dev" style="font-weight:800;font-size:1.15rem;letter-spacing:1px;direction:ltr;margin:4px 0 8px;word-break:break-all">'+pretty()+'</div>'
      +'<button id="g_copy" style="padding:8px 16px;border:1px solid #ccc;border-radius:10px;background:#f5f5f5;cursor:pointer">📋 نسخ رقم الجهاز</button>'
      +'<hr style="margin:16px 0;border:none;border-top:1px solid #eee">'
      +'<input id="g_code" placeholder="أدخل رمز التفعيل" autocomplete="off" style="width:100%;box-sizing:border-box;padding:12px;text-align:center;border:1.5px solid #cfd8dc;border-radius:10px;font:inherit">'
      +'<button id="g_go" style="width:100%;margin-top:10px;padding:12px;border:0;border-radius:10px;background:#2e7d32;color:#fff;font-weight:700;font-size:1rem;cursor:pointer">تفعيل</button>'
      +'<div id="g_msg" style="margin-top:10px;min-height:20px;font-weight:600"></div>'
      +(OWNER_SEED_RECOVERY?'<div id="g_owner" style="margin-top:12px;font-size:.78rem;color:#90a4ae;cursor:pointer;text-decoration:underline">استرجاع المالك (بذرة سرّية)</div>':'')
      +'</div>';
    document.body.appendChild(wrap);
    try{document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';}catch(e){}
    var msg=wrap.querySelector('#g_msg');
    wrap.querySelector('#g_copy').onclick=function(){try{navigator.clipboard&&navigator.clipboard.writeText(deviceId());msg.style.color='#2e7d32';msg.textContent='نُسخ ✓';}catch(e){}};
    wrap.querySelector('#g_go').onclick=function(){
      var r=window.AppGuard.tryActivate(wrap.querySelector('#g_code').value);
      if(r.ok){msg.style.color='#2e7d32';msg.textContent=r.dur===0?'تم التفعيل ✅ (دائم)':'تم التفعيل ✅ ('+r.dur+' يوم)';setTimeout(function(){location.reload();},700);}
      else{msg.style.color='#c62828';msg.textContent='رمز غير صالح لهذا الجهاز.';}
    };
    var ow=wrap.querySelector('#g_owner');
    if(ow)ow.onclick=function(){var s=prompt('بذرة المالك (64 hex):');if(s&&window.AppGuard.recoverWithSeed(s)){location.reload();}else if(s){msg.style.color='#c62828';msg.textContent='بذرة غير مطابقة.';}};
  }

  function boot(){var s=state();if(s==='active'||s==='disabled')return;showGate();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
