/* مراح — تحديث محتوى التطبيق (OTA) عبر @capgo/capacitor-updater — يدوي بالزر فقط.
   عند الفتح لا يجري أي فحص شبكي (أسرع وأكثر تحكّماً)؛ يُكتفى باستدعاء
   notifyAppReady() المحلي الفوري لتثبيت النسخة الحالية ومنع تراجعها تلقائياً.
   الفحص الفعلي يحدث فقط عند ضغط المستخدم زر «🔄 تحقق من وجود تحديث»،
   فينزّل أحدث حزمة ويب من إصدار GitHub ويفعّلها عند إعادة الفتح. البيانات
   المحلية لا تتأثّر. يعمل داخل تطبيق الجوال وعند توفّر الإنترنت فقط. */
(function () {
  'use strict';
  var VERSION_JSON = 'https://github.com/alaoufi/marahi/releases/download/apk-latest/version.json';

  // رقم البناء (الجزء الأخير من 1.0.N) للمقارنة العددية
  function buildNum(v) { var m = String(v || '').match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; }
  function say(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }

  // عند الفتح: تثبيت النسخة الحالية فقط (محلي، فوري، بلا أي طلب شبكي)
  async function notifyReady() {
    var Cap = window.Capacitor;
    if (!Cap || !Cap.Plugins) return;
    var Updater = Cap.Plugins.CapacitorUpdater;
    if (Updater && Updater.notifyAppReady) { try { await Updater.notifyAppReady(); } catch (e) {} }
  }

  // الفحص اليدوي (بالزر) — يعطي رسائل تأكيدية في كل الحالات
  async function check() {
    var Cap = window.Capacitor;
    if (!Cap || !Cap.Plugins) { say('التحديث يعمل داخل تطبيق الجوال فقط'); return; }
    var Updater = Cap.Plugins.CapacitorUpdater;
    var Http = Cap.Plugins.CapacitorHttp;
    if (!Updater || !Http) { say('تعذّر الوصول لخدمة التحديث'); return; }
    if (navigator.onLine === false) { say('لا يوجد اتصال بالإنترنت'); return; }
    say('جارٍ البحث عن تحديث…');
    try {
      // طلب أصلي (CapacitorHttp) لتفادي قيود CORS
      var resp = await Http.get({ url: VERSION_JSON, headers: { 'Cache-Control': 'no-cache' } });
      var meta = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
      if (!meta || !meta.version || !meta.url) { say('تعذّر قراءة معلومات التحديث'); return; }
      var applied = null; try { applied = localStorage.getItem('mrahi_applied_version'); } catch (e) {}
      var current = applied || window.MRAH_VERSION || '0';
      if (buildNum(meta.version) <= buildNum(current)) { say('أنت على آخر نسخة ✅ (' + current + ')'); return; }
      say('يوجد تحديث (' + meta.version + ') — يُنزَّل الآن…');
      var bundle = await Updater.download({ url: meta.url, version: meta.version });
      await Updater.set(bundle);                                   // يُفعّل عند إعادة فتح التطبيق
      try { localStorage.setItem('mrahi_applied_version', meta.version); } catch (e) {}
      say('تحديث جديد جاهز — سيُطبَّق عند إعادة فتح التطبيق');
    } catch (e) { say('تعذّر الفحص — حاول لاحقاً'); }
  }

  // متاح للاستدعاء اليدوي من زر داخل التطبيق
  window.mrahiCheckUpdate = function () { return check(); };

  // عند الفتح: تثبيت النسخة فقط (لا فحص تلقائي)
  if (document.readyState === 'complete' || document.readyState === 'interactive') notifyReady();
  else window.addEventListener('DOMContentLoaded', notifyReady);
})();
