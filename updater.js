/* مراح — تحديث تلقائي للمحتوى (OTA) عبر @capgo/capacitor-updater في الوضع اليدوي.
   يفحص أحدث نسخة من إصدار GitHub، وينزّل حزمة الويب الجديدة ويفعّلها عند إعادة
   الفتح — فيتحدّث التطبيق دون إعادة تثبيت APK. البيانات المحلية لا تتأثّر.
   يعمل فقط داخل تطبيق Capacitor وعند توفّر الإنترنت؛ وإلا يبقى التطبيق كما هو. */
(function () {
  'use strict';
  var VERSION_JSON = 'https://github.com/alaoufi/marahi/releases/download/apk-latest/version.json';

  // رقم البناء (الجزء الأخير من 1.0.N) للمقارنة العددية
  function buildNum(v) { var m = String(v || '').match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; }

  async function run() {
    var Cap = window.Capacitor;
    if (!Cap || !Cap.Plugins) return;                 // لسنا داخل تطبيق Capacitor (مثلاً الويب)
    var Updater = Cap.Plugins.CapacitorUpdater;
    var Http = Cap.Plugins.CapacitorHttp;
    // إبلاغ الإضافة أن النسخة الحالية تعمل (يمنع التراجع التلقائي)
    if (Updater && Updater.notifyAppReady) { try { await Updater.notifyAppReady(); } catch (e) {} }
    if (!Updater || !Http) return;
    if (navigator.onLine === false) return;
    try {
      // طلب أصلي (CapacitorHttp) لتفادي قيود CORS
      var resp = await Http.get({ url: VERSION_JSON, headers: { 'Cache-Control': 'no-cache' } });
      var meta = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
      if (!meta || !meta.version || !meta.url) return;
      var applied = null; try { applied = localStorage.getItem('mrahi_applied_version'); } catch (e) {}
      var current = applied || window.MRAH_VERSION || '0';
      if (buildNum(meta.version) <= buildNum(current)) return;     // لا جديد
      var bundle = await Updater.download({ url: meta.url, version: meta.version });
      await Updater.set(bundle);                                   // يُفعّل عند إعادة فتح التطبيق
      try { localStorage.setItem('mrahi_applied_version', meta.version); } catch (e) {}
      try { if (typeof toast === 'function') toast('تحديث جديد جاهز — سيُطبَّق عند إعادة فتح التطبيق'); } catch (e) {}
    } catch (e) { /* تجاهل: يبقى التطبيق على نسخته الحالية */ }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(run, 1500);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(run, 1500); });
})();
