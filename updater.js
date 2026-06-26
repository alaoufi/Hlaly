/* حلالي — التحقق من وجود تحديث (بسيط ومستقرّ، بلا OTA ولا تبديل حِزَم).
   لا يوجد أي تبديل للحزمة داخل التطبيق (سبب عدم الاستقرار سابقاً) — لذا لا
   إعادة تحميل مفاجئة ولا «قفز» بين النسخ إطلاقاً.
   • فحص خلفيّ خفيف يقرأ رقم أحدث نسخة فقط، فإن وُجد أحدث أطلق إشارة
     (نقطة على «المزيد» وإبراز الزر) — دون تنزيل أو تغيير شيء.
   • زر «🔄 تحقق من وجود تحديث» يفتح صفحة تنزيل APK الجديد في المتصفّح.
     وبما أن APK موقّع بمفتاح ثابت، يُثبَّت فوق القديم دون حذف ومع حفظ البيانات.
   يعمل داخل تطبيق الجوال وعند توفّر الإنترنت. */
(function () {
  'use strict';
  var VERSION_JSON = 'https://github.com/alaoufi/marahi/releases/download/apk-latest/version.json';
  var APK_URL = 'https://github.com/alaoufi/marahi/releases/download/apk-latest/mrah.apk';

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
      return (m && m.version) ? m : null;
    }
    var resp = await fetch(VERSION_JSON, { cache: 'no-store' });
    var j = await resp.json();
    return (j && j.version) ? j : null;
  }

  // فتح صفحة تنزيل APK في متصفّح النظام (يُثبَّت فوق الحالي ويحفظ البيانات)
  function openDownload() {
    try { window.open(APK_URL, '_system'); }
    catch (e) { try { window.open(APK_URL, '_blank'); } catch (_) {} }
  }
  window.mrahiOpenDownload = openDownload;

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
