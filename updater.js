/* حلالي — التحقق من وجود تحديث (بسيط ومستقرّ، بلا OTA ولا تبديل حِزَم).
   لا يوجد أي تبديل للحزمة داخل التطبيق (سبب عدم الاستقرار سابقاً) — لذا لا
   إعادة تحميل مفاجئة ولا «قفز» بين النسخ إطلاقاً.
   • فحص خلفيّ خفيف يقرأ رقم أحدث نسخة فقط، فإن وُجد أحدث أطلق إشارة
     (نقطة على «المزيد» وإبراز الزر) — دون تنزيل أو تغيير شيء.
   • زر «🔄 تحقق من وجود تحديث» يعرض رابط تنزيل APK الجديد (نسخ يدوي — الأضمن على كل الأجهزة —
     أو محاولة فتح تلقائي في المتصفّح). وبما أن APK موقّع بمفتاح ثابت، يُثبَّت فوق القديم دون حذف ومع حفظ البيانات.
   يعمل داخل تطبيق الجوال وعند توفّر الإنترنت. */
(function () {
  'use strict';
  var VERSION_JSON = 'https://github.com/alaoufi/Hlaly/releases/download/apk-latest/version.json';
  var APK_URL = 'https://github.com/alaoufi/Hlaly/releases/download/apk-latest/hlaly.apk';   // ثابت (احتياطي)
  var latestUrl = null;   // رابط النسخة المرقّمة من version.json (يحمل رقم النسخة)

  function buildNum(v) { var m = String(v || '').match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; }
  function say(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }
  function currentVersion() { return window.MRAH_VERSION || '0'; }
  function isNewer(meta) { return !!(meta && meta.version) && buildNum(meta.version) > buildNum(currentVersion()); }

  // قراءة رقم أحدث نسخة فقط (لا تنزيل حزمة). CapacitorHttp إن توفّر لتفادي CORS، وإلا fetch.
  async function fetchLatest() {
    var P = window.Capacitor && window.Capacitor.Plugins;
    if (P && P.CapacitorHttp) {
      var r = await P.CapacitorHttp.get({ url: VERSION_JSON, headers: { 'Cache-Control': 'no-cache' } });
      var m = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      if (m && m.url) latestUrl = m.url;
      return (m && m.version) ? m : null;
    }
    var resp = await fetch(VERSION_JSON, { cache: 'no-store' });
    var j = await resp.json();
    if (j && j.url) latestUrl = j.url;
    return (j && j.version) ? j : null;
  }

  // ثبت أن التسليم التلقائي لتنزيل APK من داخل تطبيق مُغلَّف (نقر <a target="_blank"> يعترضه WebViewClient ويسلّمه
  // لمتصفّح النظام) قد يُنتج تنزيلاً «عالقاً» على بعض الأجهزة: يصل ١٠٠٪ من الحجم ولا يكتمل/يُفتح أبداً — بينما نسخ
  // نفس الرابط ولصقه يدوياً في شريط عنوان المتصفّح (تنزيل متصفّح عادي، لا عبر تسليم/Intent من تطبيق آخر) يعمل بلا مشاكل.
  // لذا الطريقة الأضمن دائماً هي عرض الرابط للنسخ اليدوي أولاً، مع إبقاء الفتح التلقائي كخيار سريع إضافي (يعمل على أغلب الأجهزة).
  function openDownload() {
    var u = latestUrl || APK_URL;   // النسخة المرقّمة إن توفّرت، وإلا الرابط الثابت
    showDownloadModal(u);
  }
  window.mrahiOpenDownload = openDownload;

  function showDownloadModal(u) {
    try {
      if (typeof openModal !== 'function') { attemptAutoOpen(u); return; }
      openModal('تنزيل التحديث', ''
        + '<div class="muted" style="margin-bottom:10px"><b>الطريقة الأضمن:</b> انسخ رابط التنزيل، افتح متصفّح جهازك (كروم مثلاً)، وألصقه في شريط العنوان.</div>'
        + '<button class="btn" id="upd_copy" style="width:100%;margin-bottom:8px">📋 نسخ رابط التنزيل</button>'
        + '<div class="muted" style="font-size:.82rem;word-break:break-all;background:#f5f5f5;padding:8px;border-radius:8px;margin-bottom:10px">' + u + '</div>'
        + '<button class="btn outline" id="upd_open" style="width:100%">⬇️ محاولة فتح التنزيل تلقائياً</button>'
        + '<div class="muted" style="margin-top:10px;font-size:.85rem">بعد اكتمال التنزيل، افتح الملف من إشعارات النظام أو مجلد التنزيلات لتثبيته. إن ظهر تحذير «Play Protect» (أثناء التنزيل أو التثبيت)، اضغط «مزيد من التفاصيل» ثم «التثبيت على أي حال» — التطبيق آمن وموقّع بمفتاح ثابت. إن علق التنزيل التلقائي عند ١٠٠٪ بلا اكتمال، احذفه من قائمة التنزيلات واستخدم النسخ واللصق اليدوي أعلاه بدلاً منه.</div>', function () {
        var cp = document.getElementById('upd_copy');
        if (cp) cp.addEventListener('click', async function () {
          var ok = false;
          try { if (typeof copyText === 'function') ok = await copyText(u); } catch (e) {}
          say(ok ? 'نُسخ الرابط ✅ — الصقه في متصفّحك' : 'تعذّر النسخ — انسخ الرابط الظاهر أعلاه يدوياً');
        });
        var op = document.getElementById('upd_open');
        if (op) op.addEventListener('click', function () { attemptAutoOpen(u); });
      });
    } catch (e) { attemptAutoOpen(u); }
  }

  function attemptAutoOpen(u) {
    try {
      var a = document.createElement('a');
      a.href = u; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) {
      try { window.open(u, '_blank'); } catch (_) {}
    }
  }

  // زر «تحقق من وجود تحديث»
  async function manualCheck() {
    if (!window.MRAH_APK) { say('التحديث متاح في تطبيق الجوال'); return; }
    if (navigator.onLine === false) { say('لا يوجد اتصال بالإنترنت'); return; }
    say('جارٍ البحث عن تحديث…');
    try {
      var meta = await fetchLatest();
      if (!meta) { say('تعذّر قراءة معلومات التحديث'); return; }
      if (!isNewer(meta)) { say('أنت على آخر نسخة ✅ (' + currentVersion() + ')'); return; }
      window.mrahiUpdateInfo = { version: meta.version };
      try { window.dispatchEvent(new Event('mrahi-update-available')); } catch (e) {}
      say('يوجد تحديث (' + meta.version + ') — يُفتح التنزيل لتثبيته');
      openDownload();
    } catch (e) { say('تعذّر الفحص — حاول لاحقاً'); }
  }
  window.mrahiCheckUpdate = manualCheck;

  // فحص خلفيّ خفيف: إشارة فقط (لا تنزيل ولا تغيير)
  async function bgDetect() {
    if (!window.MRAH_APK || navigator.onLine === false) return;
    try {
      var meta = await fetchLatest();
      if (isNewer(meta)) {
        window.mrahiUpdateInfo = { version: meta.version };
        try { window.dispatchEvent(new Event('mrahi-update-available')); } catch (e) {}
      }
    } catch (e) {}
  }
  function idle(cb) { if (window.requestIdleCallback) window.requestIdleCallback(cb, { timeout: 5000 }); else setTimeout(cb, 600); }
  function scheduleBg() { setTimeout(function () { idle(bgDetect); }, 4000); }

  if (document.readyState === 'complete') scheduleBg();
  else window.addEventListener('load', scheduleBg);
})();
