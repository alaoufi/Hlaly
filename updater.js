/* مراح — تحديث تلقائي للمحتوى (OTA) عبر @capgo/capacitor-updater في الوضع اليدوي.
   يفحص أحدث نسخة من إصدار GitHub، وينزّل حزمة الويب الجديدة ويفعّلها عند إعادة
   الفتح — فيتحدّث التطبيق دون إعادة تثبيت APK. البيانات المحلية لا تتأثّر.
   يعمل فقط داخل تطبيق Capacitor وعند توفّر الإنترنت؛ وإلا يبقى التطبيق كما هو.

   الفحص يجري تلقائياً عند كل فتح (بصمت إن لم يوجد جديد)، ويمكن استدعاؤه يدوياً
   عبر window.mrahiCheckUpdate() — فيعطي رسائل تأكيدية في كل الحالات. */
(function () {
  'use strict';
  var VERSION_JSON = 'https://github.com/alaoufi/marahi/releases/download/apk-latest/version.json';

  // رقم البناء (الجزء الأخير من 1.0.N) للمقارنة العددية
  function buildNum(v) { var m = String(v || '').match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; }
  function say(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }

  // manual=true ⇒ رسائل تأكيدية في كل الحالات. manual=false ⇒ صامت إلا عند توفّر تحديث.
  async function check(manual) {
    var Cap = window.Capacitor;
    if (!Cap || !Cap.Plugins) { if (manual) say('التحديث التلقائي يعمل داخل تطبيق الجوال فقط'); return; }
    var Updater = Cap.Plugins.CapacitorUpdater;
    var Http = Cap.Plugins.CapacitorHttp;
    // إبلاغ الإضافة أن النسخة الحالية تعمل (يمنع التراجع التلقائي) — عند الفحص التلقائي فقط
    if (!manual && Updater && Updater.notifyAppReady) { try { await Updater.notifyAppReady(); } catch (e) {} }
    if (!Updater || !Http) { if (manual) say('تعذّر الوصول لخدمة التحديث'); return; }
    if (navigator.onLine === false) { if (manual) say('لا يوجد اتصال بالإنترنت'); return; }
    if (manual) say('جارٍ البحث عن تحديث…');
    try {
      // طلب أصلي (CapacitorHttp) لتفادي قيود CORS
      var resp = await Http.get({ url: VERSION_JSON, headers: { 'Cache-Control': 'no-cache' } });
      var meta = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
      if (!meta || !meta.version || !meta.url) { if (manual) say('تعذّر قراءة معلومات التحديث'); return; }
      var applied = null; try { applied = localStorage.getItem('mrahi_applied_version'); } catch (e) {}
      var current = applied || window.MRAH_VERSION || '0';
      if (buildNum(meta.version) <= buildNum(current)) {     // لا جديد
        if (manual) say('أنت على آخر نسخة ✅ (' + current + ')');
        return;
      }
      if (manual) say('يوجد تحديث (' + meta.version + ') — يُنزَّل الآن…');
      var bundle = await Updater.download({ url: meta.url, version: meta.version });
      await Updater.set(bundle);                                   // يُفعّل عند إعادة فتح التطبيق
      try { localStorage.setItem('mrahi_applied_version', meta.version); } catch (e) {}
      say('تحديث جديد جاهز — سيُطبَّق عند إعادة فتح التطبيق');
    } catch (e) { if (manual) say('تعذّر الفحص — حاول لاحقاً'); /* وإلا: يبقى التطبيق على نسخته */ }
  }

  // متاح للاستدعاء اليدوي من زر داخل التطبيق
  window.mrahiCheckUpdate = function () { return check(true); };

  function autorun() { check(false); }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(autorun, 1500);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(autorun, 1500); });
})();
