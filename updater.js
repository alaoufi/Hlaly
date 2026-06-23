/* مراح — تحديث محتوى التطبيق (OTA) عبر @capgo/capacitor-updater — تصميم مستقرّ.
   المبدأ الحاكم: لا شيء يغيّر التطبيق الجاري إلا بضغطة صريحة من المستخدم.
   • عند الفتح: notifyAppReady() فوراً وبإصرار — يثبّت النسخة الحالية ويمنع
     التراجع التلقائي (rollback) الذي يسبّب «القفز» بين النسخ.
   • فحص خلفيّ خفيف بعد الخمول: يكتشف وجود نسخة أحدث ويُظهر بانراً فقط —
     لا ينزّل ولا يغيّر أي حزمة تلقائياً.
   • التنزيل والتطبيق يحدثان فقط عند ضغط «تحديث الآن» (في البانر) أو زر
     «🔄 تحقق من وجود تحديث»، وبـ next() — فيُطبَّق عند إعادة الفتح بهدوء
     دون إعادة تحميل مفاجئة. البيانات المحلية لا تتأثّر.
   يعمل داخل تطبيق الجوال وعند توفّر الإنترنت فقط. */
(function () {
  'use strict';
  var VERSION_JSON = 'https://github.com/alaoufi/marahi/releases/download/apk-latest/version.json';
  var pendingMeta = null;   // معلومات تحديث مكتشَف بانتظار ضغط المستخدم

  function buildNum(v) { var m = String(v || '').match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; }
  function say(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }
  function plugins() { var Cap = window.Capacitor; return (Cap && Cap.Plugins) || null; }

  // تثبيت النسخة الحالية فوراً ومنع التراجع التلقائي — يُستدعى مبكراً وبإصرار
  function notifyReady() {
    var P = plugins(); if (!P || !P.CapacitorUpdater) return;
    try { var r = P.CapacitorUpdater.notifyAppReady(); if (r && r.catch) r.catch(function () {}); } catch (e) {}
  }

  function currentVersion() {
    var applied = null; try { applied = localStorage.getItem('mrahi_applied_version'); } catch (e) {}
    return applied || window.MRAH_VERSION || '0';
  }
  function isNewer(meta) { return !!(meta && meta.version) && buildNum(meta.version) > buildNum(currentVersion()); }

  // جلب معلومات أحدث نسخة فقط (طلب خفيف، لا ينزّل حزمة)
  async function fetchLatest() {
    var P = plugins(); if (!P || !P.CapacitorHttp) return null;
    var resp = await P.CapacitorHttp.get({ url: VERSION_JSON, headers: { 'Cache-Control': 'no-cache' } });
    var meta = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
    return (meta && meta.version && meta.url) ? meta : null;
  }

  // التنزيل والتطبيق — بفعل المستخدم فقط. next() لا set() (لا إعادة تحميل فورية).
  async function applyUpdate() {
    var P = plugins();
    if (!P || !P.CapacitorUpdater) { say('التحديث يعمل داخل تطبيق الجوال فقط'); return; }
    if (navigator.onLine === false) { say('لا يوجد اتصال بالإنترنت'); return; }
    var U = P.CapacitorUpdater;
    try {
      var meta = pendingMeta || await fetchLatest();
      if (!meta || !isNewer(meta)) { say('أنت على آخر نسخة ✅ (' + currentVersion() + ')'); return; }
      say('يُنزَّل التحديث (' + meta.version + ')…');
      var bundle = await U.download({ url: meta.url, version: meta.version });
      if (U.next) await U.next(bundle); else await U.set(bundle);
      try { localStorage.setItem('mrahi_applied_version', meta.version); } catch (e) {}
      pendingMeta = null;
      var b = document.getElementById('mrahi-upd-banner'); if (b) b.remove();
      say('تحديث جاهز — سيُطبَّق عند إعادة فتح التطبيق');
    } catch (e) { say('تعذّر التحديث — حاول لاحقاً'); }
  }

  // الفحص اليدوي من الزر: يتحقق ويعطي رسالة واضحة، ويبدأ التطبيق إن وُجد جديد
  async function manualCheck() {
    var P = plugins();
    if (!P || !P.CapacitorUpdater) { say('التحديث يعمل داخل تطبيق الجوال فقط'); return; }
    if (navigator.onLine === false) { say('لا يوجد اتصال بالإنترنت'); return; }
    say('جارٍ البحث عن تحديث…');
    try {
      var meta = await fetchLatest();
      if (!meta) { say('تعذّر قراءة معلومات التحديث'); return; }
      if (!isNewer(meta)) { say('أنت على آخر نسخة ✅ (' + currentVersion() + ')'); return; }
      pendingMeta = meta;
      await applyUpdate();
    } catch (e) { say('تعذّر الفحص — حاول لاحقاً'); }
  }
  window.mrahiCheckUpdate = manualCheck;

  // بانر لطيف بزرّ «تحديث الآن» — لا يغيّر شيئاً حتى تضغطه
  function showUpdateBanner(version) {
    if (document.getElementById('mrahi-upd-banner')) return;
    if (!document.getElementById('mrahi-upd-style')) {
      var st = document.createElement('style'); st.id = 'mrahi-upd-style';
      st.textContent = '@keyframes mrahiUpdIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}';
      document.head.appendChild(st);
    }
    var bar = document.createElement('div');
    bar.id = 'mrahi-upd-banner'; bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;'
      + 'display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;'
      + 'background:linear-gradient(135deg,#2e7d32,#1b5e20);color:#fff;font-size:.92rem;font-weight:700;'
      + 'box-shadow:0 8px 26px rgba(0,0,0,.32);animation:mrahiUpdIn .3s ease;direction:rtl;';
    bar.innerHTML = '<span style="flex:1;line-height:1.5">✨ يوجد تحديث جديد (' + version + ')</span>'
      + '<button id="mrahi-upd-go" style="flex:none;background:#fff;color:#1b5e20;border:none;'
      + 'padding:8px 14px;border-radius:10px;font-weight:800;cursor:pointer">تحديث الآن</button>'
      + '<button id="mrahi-upd-x" aria-label="لاحقاً" style="flex:none;background:rgba(255,255,255,.2);color:#fff;border:none;'
      + 'width:30px;height:30px;border-radius:50%;font-size:1rem;cursor:pointer;line-height:1">✕</button>';
    document.body.appendChild(bar);
    var go = document.getElementById('mrahi-upd-go'); if (go) go.addEventListener('click', applyUpdate);
    var x = document.getElementById('mrahi-upd-x'); if (x) x.addEventListener('click', function () { bar.remove(); });
  }

  // فحص خلفيّ: يكتشف فقط ويُظهر البانر — لا ينزّل ولا يغيّر أي حزمة
  async function bgDetect() {
    if (navigator.onLine === false) return;
    try { var meta = await fetchLatest(); if (isNewer(meta)) { pendingMeta = meta; showUpdateBanner(meta.version); } } catch (e) {}
  }
  function idle(cb) { if (window.requestIdleCallback) window.requestIdleCallback(cb, { timeout: 5000 }); else setTimeout(cb, 600); }

  // إقلاع: تثبيت النسخة فوراً وبإصرار، ثم اكتشاف خلفيّ خفيف بعد الخمول
  notifyReady();
  setTimeout(notifyReady, 1500);   // إصرار إضافي تحسّباً لتأخّر تحميل الإضافة
  function scheduleBg() { setTimeout(function () { idle(bgDetect); }, 4000); }
  if (document.readyState === 'complete') scheduleBg();
  else window.addEventListener('load', scheduleBg);
})();
