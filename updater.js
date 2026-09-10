/* حلالي — التحقّق من وجود تحديث وتثبيته (إلزاميّ — يمنع استخدام التطبيق حتى يُحدَّث).
   لا يوجد أي تبديل للحزمة داخل التطبيق نفسه (OTA) — التحديث ملف APK كامل موقَّع بنفس مفتاح
   التوقيع الثابت دائماً، فيُثبَّت فوق النسخة القديمة دون حذف ومع حفظ كل بيانات المستخدم.
   • فحص عند الإقلاع وعند عودة التطبيق للواجهة (إن وُجد إنترنت فقط — لا حجب مطلقاً بلا اتصال).
   • عند وجود نسخة أحدث: بوّابة كاملة الشاشة لا يمكن تجاوزها (لا زرّ إغلاق، لا نقر خارجها يُغلقها،
     وزرّ الرجوع في أندرويد لا يفعل شيئاً أثناء ظهورها) — الخروج الوحيد هو تحديث ناجح.
   • «⬇️ تحديث الآن»: يُنزَّل APK داخل مساحة التطبيق الخاصة (لا يعتمد على مدير تنزيلات النظام —
     وهذا بالضبط ما كان يُعلِّق سابقاً على بعض الأجهزة)، ثم يُفتَح مثبّت النظام عليه مباشرة عبر
     FileProvider + نيّة تثبيت أصلية (إضافة كابسيتور محلية: mrahi-updater). زرّ احتياطي
     «نسخ رابط التنزيل» يبقى متاحاً دائماً لمن يفضّل التنزيل اليدوي عبر المتصفّح. */
(function () {
  'use strict';
  var VERSION_JSON = 'https://github.com/alaoufi/Hlaly/releases/download/apk-latest/version.json';
  var APK_URL = 'https://github.com/alaoufi/Hlaly/releases/download/apk-latest/hlaly.apk';   // ثابت (احتياطي)
  var gateOpen = false;
  var backListenerHandle = null;

  function buildNum(v) { var m = String(v || '').match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; }
  function say(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }
  function currentVersion() { return window.MRAH_VERSION || '0'; }
  function isNewer(meta) { return !!(meta && meta.version) && buildNum(meta.version) > buildNum(currentVersion()); }
  function plugins() { return (window.Capacitor && window.Capacitor.Plugins) || {}; }

  // قراءة رقم أحدث نسخة فقط. CapacitorHttp إن توفّر لتفادي CORS، وإلا fetch.
  async function fetchLatest() {
    var P = plugins();
    if (P.CapacitorHttp) {
      var r = await P.CapacitorHttp.get({ url: VERSION_JSON, headers: { 'Cache-Control': 'no-cache' } });
      var m = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      return (m && m.version) ? m : null;
    }
    var resp = await fetch(VERSION_JSON, { cache: 'no-store' });
    var j = await resp.json();
    return (j && j.version) ? j : null;
  }

  function copyLinkFallback(u, statusEl) {
    var ta = statusEl;
    (async function () {
      var ok = false;
      try { if (typeof copyText === 'function') ok = await copyText(u); } catch (e) {}
      if (ta) ta.textContent = ok ? '✅ نُسخ الرابط — افتح متصفّح جهازك والصقه في شريط العنوان' : 'تعذّر النسخ — انسخ الرابط الظاهر يدوياً';
      say(ok ? 'نُسخ الرابط ✅' : 'تعذّر النسخ');
    })();
  }

  // ينزّل APK داخل مساحة التطبيق الخاصة (لا مدير تنزيلات النظام) مع تقدّم إن أمكن، ثم يعيد المسار المحلّي
  async function downloadApk(url, version, onProgress) {
    var P = plugins();
    if (!P.Filesystem || !P.Filesystem.downloadFile) throw new Error('no-native-download');
    var filename = 'hlaly-' + (version || 'update') + '.apk';
    var relPath = 'mrahi-updates/' + filename;
    var sub = null;
    try {
      if (P.Filesystem.addListener && onProgress) {
        sub = await P.Filesystem.addListener('progress', function (ev) {
          try { onProgress(ev && ev.bytes, ev && ev.contentLength); } catch (e) {}
        });
      }
    } catch (e) { sub = null; }
    try {
      var res = await P.Filesystem.downloadFile({ url: url, path: relPath, directory: 'CACHE', progress: true });
      var raw = (res && res.path) || '';
      return String(raw).replace(/^file:\/\//, '');
    } finally {
      try { if (sub && sub.remove) await sub.remove(); } catch (e) {}
    }
  }

  // يتحقّق من إذن «تثبيت من مصادر غير معروفة»، يفتح إعداده عند الحاجة، ثم يطلب التثبيت الفعلي
  async function installApk(path, statusEl) {
    var P = plugins();
    if (!P.Updater) throw new Error('no-native-installer');
    var can = true;
    try { var r = await P.Updater.canInstall(); can = !r || r.value !== false; } catch (e) {}
    if (!can) {
      if (statusEl) statusEl.textContent = 'فعِّل «السماح بالتثبيت من هذا المصدر» في الشاشة التي فُتحت، ثم اضغط «تحديث الآن» مرّة أخرى.';
      try { await P.Updater.openInstallSettings(); } catch (e) {}
      throw new Error('permission-needed');
    }
    await P.Updater.install({ path: path });
  }

  // ===== بوّابة التحديث الإلزامية =====
  function renderGate(meta) {
    var root = document.getElementById('mrahiForceGate');
    if (!root) {
      root = document.createElement('div');
      root.id = 'mrahiForceGate';
      root.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f2a1a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;overflow:auto;direction:rtl;font-family:inherit';
      document.body.appendChild(root);
    }
    var apkUrl = meta.url || APK_URL;
    root.innerHTML = ''
      + '<div style="font-size:2.6rem;line-height:1;margin-bottom:10px">🔄</div>'
      + '<h2 style="margin:0 0 8px">تحديث مطلوب</h2>'
      + '<div style="opacity:.9;margin-bottom:4px">صدرت نسخة جديدة من حلالي (' + esc(meta.version) + ')</div>'
      + '<div style="opacity:.75;font-size:.85rem;margin-bottom:18px">نسختك الحالية: ' + esc(currentVersion()) + ' — يجب التحديث للمتابعة</div>'
      + '<button id="fg_go" style="width:100%;max-width:320px;padding:16px;border:none;border-radius:12px;background:#2e8b57;color:#fff;font-size:1.1rem;font-weight:700;cursor:pointer">⬇️ تحديث الآن</button>'
      + '<div id="fg_progress" style="width:100%;max-width:320px;margin-top:10px;display:none">'
      + '  <div style="height:8px;border-radius:4px;background:rgba(255,255,255,.2);overflow:hidden"><div id="fg_bar" style="height:100%;width:0%;background:#7bd389"></div></div>'
      + '</div>'
      + '<div id="fg_status" style="margin-top:12px;font-size:.85rem;min-height:1.2em;opacity:.9"></div>'
      + '<div style="margin-top:22px;padding-top:16px;border-top:1px solid rgba(255,255,255,.2);width:100%;max-width:320px">'
      + '  <button id="fg_copy" style="width:100%;padding:10px;border:1px solid rgba(255,255,255,.4);border-radius:10px;background:transparent;color:#fff;cursor:pointer">📋 نسخ رابط التنزيل (تحديث يدوي)</button>'
      + '  <div id="fg_copy_status" style="margin-top:6px;font-size:.78rem;opacity:.85;word-break:break-all"></div>'
      + '</div>'
      + '<div style="margin-top:16px;font-size:.75rem;opacity:.65;max-width:320px">إن ظهر تحذير «Play Protect»، اضغط «مزيد من التفاصيل» ثم «التثبيت على أي حال» — التطبيق آمن وموقَّع بمفتاح ثابت.</div>';

    var goBtn = document.getElementById('fg_go');
    var progBox = document.getElementById('fg_progress');
    var bar = document.getElementById('fg_bar');
    var status = document.getElementById('fg_status');
    var copyBtn = document.getElementById('fg_copy');
    var copyStatus = document.getElementById('fg_copy_status');
    copyStatus.textContent = apkUrl;

    copyBtn.addEventListener('click', function () { copyLinkFallback(apkUrl, copyStatus); });

    goBtn.addEventListener('click', async function () {
      goBtn.disabled = true; goBtn.style.opacity = '.6';
      progBox.style.display = '';
      status.textContent = 'جارٍ التنزيل…';
      try {
        var path = await downloadApk(apkUrl, meta.version, function (got, total) {
          if (total) { var pct = Math.min(100, Math.round((got / total) * 100)); bar.style.width = pct + '%'; status.textContent = 'جارٍ التنزيل… ' + pct + '%'; }
          else { status.textContent = 'جارٍ التنزيل…'; }
        });
        bar.style.width = '100%';
        status.textContent = 'اكتمل التنزيل — يُفتح المثبّت…';
        await installApk(path, status);
        status.textContent = 'أكمل التثبيت من الشاشة التي فُتحت، ثم أعد فتح التطبيق.';
      } catch (e) {
        var msg = String((e && e.message) || e || '');
        if (msg === 'permission-needed') {
          // الرسالة عُرضت بالفعل داخل installApk؛ لا نستبدلها
        } else {
          status.textContent = 'تعذّر التحديث التلقائي — استخدم «نسخ رابط التنزيل» أدناه بدلاً منه.';
        }
        goBtn.disabled = false; goBtn.style.opacity = '';
      }
    });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  async function showGate(meta) {
    if (gateOpen) { renderGate(meta); return; }
    gateOpen = true;
    renderGate(meta);
    // ابتلاع زرّ الرجوع في أندرويد أثناء ظهور البوّابة — لا تنقّل ولا خروج من التطبيق
    try {
      var P = plugins();
      if (P.App && P.App.addListener) backListenerHandle = await P.App.addListener('backButton', function () { /* تجاهل عمداً */ });
    } catch (e) {}
  }

  // زر «تحقق من وجود تحديث» اليدوي (موجود في القوائم) — نفس بوّابة الفحص التلقائي عند وجود تحديث
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
      showGate(meta);
    } catch (e) { say('تعذّر الفحص — حاول لاحقاً'); }
  }
  window.mrahiCheckUpdate = manualCheck;

  // فحص إلزامي: عند الإقلاع وعند عودة التطبيق للواجهة. لا يحجب أبداً بلا إنترنت أو عند فشل الفحص.
  async function forceCheck() {
    if (!window.MRAH_APK || navigator.onLine === false) return;
    try {
      var meta = await fetchLatest();
      if (isNewer(meta)) {
        window.mrahiUpdateInfo = { version: meta.version };
        try { window.dispatchEvent(new Event('mrahi-update-available')); } catch (e) {}
        showGate(meta);
      }
    } catch (e) { /* تجاهل — لا حجب عند فشل الفحص */ }
  }

  function idle(cb) { if (window.requestIdleCallback) window.requestIdleCallback(cb, { timeout: 5000 }); else setTimeout(cb, 600); }
  function scheduleBoot() { setTimeout(function () { idle(forceCheck); }, 3000); }

  if (document.readyState === 'complete') scheduleBoot();
  else window.addEventListener('load', scheduleBoot);

  // إعادة الفحص عند عودة التطبيق من الخلفية للواجهة
  try {
    var P0 = plugins();
    if (P0.App && P0.App.addListener) P0.App.addListener('appStateChange', function (s) { if (s && s.isActive === true) forceCheck(); });
  } catch (e) {}
})();
