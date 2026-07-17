# دمج حماية التفعيل داخل التطبيق (بلا المولّد)

هذه الحزمة تُوضَع **داخل التطبيق** لفرض التفعيل. المولّد (keygen) منفصل ويبقى عندك.
يعمل في أي تطبيق ويب/Capacitor، **بلا إنترنت**، والتفعيل مربوط بالجهاز.

**الملفّات:** `appguard.js` (هذا المتحقّق) + `nacl.min.js` (tweetnacl).

---

## ١) التهيئة
افتح `appguard.js` وعدّل الأعلى:
```js
var PUB_B64 = '<مفتاحك_العامّ_Base64>';   // من: node keygen.mjs new (العامّ فقط)
var PREFIX  = 'UNIV1';                     // نفس بادئة المولّد
var SALT    = 'yourapp:';                  // أي نصّ ثابت
```
> ضع **المفتاح العامّ فقط**. لا تضع البذرة السرّية في التطبيق إطلاقاً.

## ٢) ترتيب التحميل في index.html
```html
<script src="nacl.min.js"></script>
<script src="appguard.js"></script>
<script src="app.js"></script>   <!-- تطبيقك -->
```

## ٣) واجهة `window.AppGuard`
| الدالة | الوصف |
|---|---|
| `deviceIdPretty()` | رقم الجهاز للعرض (١٦ حرفاً بشرطات) |
| `state()` | `{state:'none'|'active'|'expired'|'disabled', permanent?, daysLeft?, expiry?}` |
| `tryActivate(code)` | `{ok:true,dur}` أو `{ok:false}` |
| `deactivate()` | يُعيد القفل (لا يحذف بيانات المستخدم) |
| `recoverWithSeed(hex)` | تفعيل دائم ببذرة المالك (ضمانة ألّا يُحبَس) |

## ٤) البوابة عند بدء التطبيق
```js
(function () {
  var s = window.AppGuard ? AppGuard.state().state : 'disabled';
  if (s === 'active' || s === 'disabled') { startApp(); }   // مفعّل (أو الحماية معطّلة أثناء التطوير)
  else { renderActivationGate(); }                           // 'none' أو 'expired'
})();
```

## ٥) شاشة التفعيل (جاهزة — انسخها وعدّل التنسيق)
```html
<div id="gate" style="max-width:420px;margin:40px auto;font-family:sans-serif;text-align:center;padding:20px">
  <h2>تفعيل التطبيق</h2>
  <p>أرسل «رقم الجهاز» للمطوّر ليعطيك رمز التفعيل:</p>
  <div id="dev" style="font-weight:bold;font-size:1.1rem;letter-spacing:1px;margin:10px 0"></div>
  <button id="copyDev">نسخ رقم الجهاز</button>
  <hr style="margin:16px 0">
  <input id="code" placeholder="أدخل رمز التفعيل" style="width:100%;padding:10px;text-align:center">
  <button id="go" style="margin-top:10px;padding:10px 20px">تفعيل</button>
  <div id="msg" style="margin-top:10px;min-height:20px"></div>
</div>
<script>
  document.getElementById('dev').textContent = AppGuard.deviceIdPretty();
  document.getElementById('copyDev').onclick = function () {
    navigator.clipboard && navigator.clipboard.writeText(AppGuard.deviceId());
  };
  document.getElementById('go').onclick = function () {
    var r = AppGuard.tryActivate(document.getElementById('code').value);
    var m = document.getElementById('msg');
    if (r.ok) { m.style.color = 'green'; m.textContent = r.dur === 0 ? 'تم التفعيل ✅ (دائم)' : 'تم التفعيل ✅ (' + r.dur + ' يوم)'; setTimeout(function(){ location.reload(); }, 800); }
    else { m.style.color = 'red'; m.textContent = 'رمز غير صالح لهذا الجهاز.'; }
  };
</script>
```

## ٦) ملاحظات
- **الفحص عند كل فتح:** `state()` يتضمّن حارس ساعة (`max(now,lastSeen)`) فلا يمدّد
  إرجاعُ تاريخ الجهاز المدّة المؤقّتة.
- **رقم الجهاز:** افتراضياً عشوائي ثابت لكل تثبيت. لتثبيته عبر إعادة التثبيت اشتقّه من عتاد
  الجهاز: `Base32(SHA256(SALT + hardwareId)[0..10])` (يلزم إضافة SHA‑256).
- **إلغاء التفعيل:** زر يستدعي `AppGuard.deactivate()` (يُعيد القفل دون حذف البيانات).
- **المدّة:** `0` دائم، أو أيام (تحدّدها في المولّد).
- **تغيير المفتاح لاحقاً:** التفعيل المخزَّن لا يُعاد التحقّق من كوده، فالمفعَّلون لا يتأثّرون.
- **الأمان:** المفتاح العامّ آمن للنشر؛ لا يُولّد أكواداً. لتوليد الأكواد استخدم المولّد المنفصل.
</content>
