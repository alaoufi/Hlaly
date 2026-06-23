/* مراح — تحديث محتوى التطبيق (OTA) عبر @capgo/capacitor-updater.
   فلسفة العمل: فتحٌ سريع لا يتأثّر، وفحصٌ خلفيّ لا يُشعَر به.
   • عند الفتح: نستدعي notifyAppReady() المحلي الفوري فقط (بلا أي طلب شبكي)
     لتثبيت النسخة الحالية ومنع تراجعها تلقائياً.
   • بعد اكتمال تحميل الواجهة ودخول الجهاز في الخمول (requestIdleCallback + مهلة)
     يجري فحصٌ خلفيّ صامت — فلا ينافس فتح التطبيق ولا التنقّل.
   • إن وُجد تحديث: يُنزَّل بهدوء ويُهيَّأ، ثم يظهر بانر لطيف يخبر بوجوده،
     ويُطبَّق عند إعادة فتح التطبيق. البيانات المحلية لا تتأثّر.
   • يبقى زر «🔄 تحقق من وجود تحديث» للفحص اليدوي مع رسائل واضحة.
   يعمل داخل تطبيق الجوال وعند توفّر الإنترنت فقط. */
(function () {
  'use strict';
  var VERSION_JSON = 'https://github.com/alaoufi/marahi/releases/download/apk-latest/version.json';

  // رقم البناء (الجزء الأخير من 1.0.N) للمقارنة العددية
  function buildNum(v) { var m = String(v || '').match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; }
  function say(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }

  // بانر لطيف غير معيق يظهر أسفل الشاشة عند توفّر تحديث جاهز (للفحص الخلفي)
  function showUpdateBanner(version) {
    if (document.getElementById('mrahi-upd-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'mrahi-upd-banner';
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;'
      + 'display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;'
      + 'background:linear-gradient(135deg,#2e7d32,#1b5e20);color:#fff;font-size:.92rem;font-weight:700;'
      + 'box-shadow:0 8px 26px rgba(0,0,0,.32);animation:mrahiUpdIn .3s ease;direction:rtl;';
    bar.innerHTML = '<span style="flex:1;line-height:1.5">✨ تحديث جديد جاهز (' + version + ') — يُطبَّق عند إعادة فتح التطبيق</span>'
      + '<button id="mrahi-upd-x" aria-label="إغلاق" style="flex:none;background:rgba(255,255,255,.2);color:#fff;border:none;'
      + 'width:30px;height:30px;border-radius:50%;font-size:1rem;cursor:pointer;line-height:1">✕</button>';
    if (!document.getElementById('mrahi-upd-style')) {
      var st = document.createElement('style'); st.id = 'mrahi-upd-style';
      st.textContent = '@keyframes mrahiUpdIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}';
      document.head.appendChild(st);
    }
    document.body.appendChild(bar);
    var x = document.getElementById('mrahi-upd-x');
    if (x) x.addEventListener('click', function () { bar.remove(); });
  }

  // الفحص: manual=true ⇒ رسائل تأكيدية (الزر). manual=false ⇒ صامت إلا عند توفّر تحديث (الخلفية).
  async function check(manual) {
    var Cap = window.Capacitor;
    if (!Cap || !Cap.Plugins) { if (manual) say('التحديث يعمل داخل تطبيق الجوال فقط'); return; }
    var Updater = Cap.Plugins.CapacitorUpdater;
    var Http = Cap.Plugins.CapacitorHttp;
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
      if (buildNum(meta.version) <= buildNum(current)) { if (manual) say('أنت على آخر نسخة ✅ (' + current + ')'); return; }
      if (manual) say('يوجد تحديث (' + meta.version + ') — يُنزَّل الآن…');
      var bundle = await Updater.download({ url: meta.url, version: meta.version }); // تنزيل هادئ في الخلفية
      await Updater.set(bundle);                                                     // يُفعَّل عند إعادة الفتح
      try { localStorage.setItem('mrahi_applied_version', meta.version); } catch (e) {}
      if (manual) say('تحديث جديد جاهز — سيُطبَّق عند إعادة فتح التطبيق');
      else showUpdateBanner(meta.version);                                           // الخلفية: رسالة لطيفة
    } catch (e) { if (manual) say('تعذّر الفحص — حاول لاحقاً'); /* الخلفية: صامت */ }
  }

  // متاح للاستدعاء اليدوي من زر داخل التطبيق
  window.mrahiCheckUpdate = function () { return check(true); };

  // عند الفتح: تثبيت النسخة الحالية فقط (محلي، فوري، بلا شبكة)
  async function notifyReady() {
    var Cap = window.Capacitor;
    if (!Cap || !Cap.Plugins) return;
    var Updater = Cap.Plugins.CapacitorUpdater;
    if (Updater && Updater.notifyAppReady) { try { await Updater.notifyAppReady(); } catch (e) {} }
  }

  // فحص خلفيّ يُؤجَّل لما بعد التحميل والخمول كي لا يُشعَر بأي بطء
  function idle(cb) {
    if (window.requestIdleCallback) window.requestIdleCallback(cb, { timeout: 5000 });
    else setTimeout(cb, 600);
  }
  function scheduleBg() { setTimeout(function () { idle(function () { check(false); }); }, 4000); }

  notifyReady();
  if (document.readyState === 'complete') scheduleBg();
  else window.addEventListener('load', scheduleBg);
})();
