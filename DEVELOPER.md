# دليل المطوّر — تطبيق حلالي (مراح)

تطبيق أندرويد **محلّي بالكامل** لإدارة الحلال (إبل/غنم/ماعز/بقر). واجهة ويب
بسيطة (HTML/CSS/JS صِرف بلا أطر عمل) مُغلَّفة عبر **Capacitor** في تطبيق أندرويد،
وقاعدة بيانات محلية عبر **IndexedDB** (بلا خادم ولا إنترنت).

---

## 1) البنية العامة

```
مصدر الواجهة (JS/CSS/HTML)  ──►  scripts/build-www.mjs  ──►  www/  ──►  Capacitor  ──►  APK
```

- **`index.local.html`** — مدخل التطبيق (يُحمَّل داخل WebView).
- **`app.js`** — كل منطق التطبيق (شاشات، بيانات، تنقّل) في ملف واحد.
- **`app.css`** — كل التنسيقات.
- **`local-db.js`** — قاعدة البيانات المحلية (IndexedDB) بواجهة موحّدة `sb`.
- **`guide.js`** — محتوى دليل الاستخدام داخل التطبيق.
- **`license.js`** — تفعيل الجهاز (ترخيص Ed25519 عبر tweetnacl).
- **`updater.js`** — التحقق من وجود تحديث APK (يفتح صفحة التنزيل).
- **`scripts/build-www.mjs`** — يجمّع الأصول في `www/` (يُحقن رقم النسخة).
- **`android/`** — مشروع Capacitor لأندرويد.

> `www/` و`node_modules/` و`android/build` مُولَّدة ولا تُلتزَم في git (انظر
> `.gitignore`).

---

## 2) المتطلبات

- **Node.js** 20+
- **JDK** 17 و**Android SDK** (لبناء APK محلياً) — أو استخدم CI (أسهل).
- تثبيت الاعتماديات: `npm install`

---

## 3) التطوير المحلي

لا يوجد خادم تطوير — عدّل `app.js`/`app.css`/`guide.js` مباشرة.

**فحص سريع للصياغة:**
```bash
node -c app.js && node -c local-db.js && node -c guide.js
```

**تجربة طبقة البيانات المحلية بدون متصفّح** (fake-indexeddb مثبّت):
```js
// نموذج: تحميل local-db.js في Node مع fake-indexeddb، ثم
// const sb = window.createMrahLocalClient();
// await sb.from('mrahi_animals').insert({...}).select().single();
```

**معاينة في المتصفّح:** ابنِ `www/` ثم افتحه بخادم ثابت:
```bash
APP_VERSION=dev npm run build:www
npx http-server www -p 8080   # أو أي خادم ثابت
```

---

## 4) بناء APK

**آلياً (المُوصى به) — GitHub Actions:**
- Workflow: `.github/workflows/android.yml`.
- يُطلَق تلقائياً عند الدفع إلى `main` (أو يدوياً عبر «Run workflow»).
- الخطوات: `npm ci` → `npm run build:www` → `npx cap sync android` →
  `gradlew assembleRelease` → توقيع بمفتاح ثابت → نشر Release على وسم
  `apk-latest` مع `hlaly.apk` و`version.json`.
- **رقم النسخة:** `APP_VERSION = 1.0.<github.run_number>` — يُحقن في اسم النسخة
  و`versionCode` و`version.json` واسم ملف الـ APK.

**يدوياً:**
```bash
APP_VERSION=1.0.0 npm run build:www
npx cap sync android
cd android && ./gradlew assembleRelease
# ثم وقّع الـ APK بمفتاحك الثابت
```

> **التوقيع:** الـ APK موقّع بمفتاح ثابت، فيُثبَّت فوق القديم دون حذف ومع حفظ
> البيانات. **مفتاح التوقيع (keystore) لا يُضمَّن في هذه الحزمة لأسباب أمنية**؛
> احتفظ به وبكلمة مروره بشكل آمن ومنفصل. بدونه لا يمكن نشر تحديث يُثبَّت فوق
> النسخ الحالية.

---

## 5) قاعدة البيانات

انظر **`DATABASE.md`** — تُنشأ تلقائياً (IndexedDB) بلا أي خطوات إعداد. لإضافة
متجر جديد: أضِف اسمه إلى `ID_STORES` (أو `KEY_STORES`) في `local-db.js` وارفع
`DB_VERSION` — الإصلاح الذاتي ينشئ الناقص عند الترقية.

---

## 6) إضافة ميزة (نمط سريع)

معظم الميزات تتبع نفس النمط في `app.js`:
1. **شاشة:** `function screenX(){ … view().innerHTML = `…`; …ربط الأحداث… }`.
2. **مسار:** أضِف مدخلاً في كائن `ROUTES` (مثل `x: { t:'العنوان', back:true, fn: screenX }`)، وافتحها بـ `setHash('#/x')`.
3. **قائمة/تبويب:** بند في `screenMore()` أو أيقونة في `buildNav()`.
4. **بيانات:** استخدم `sb.from('mrahi_<store>')` عبر `dbInsert/dbUpdate/dbDelete`
   ثم `await loadAll()` لإعادة تحميل الكاش `C`.
5. **صلاحيات:** في الوضع المحلي `me` مدير كامل، فالحُرّاس `can(...)` صحيحة دائماً.

---

## 7) الإصدار والنشر

- ادفع/ادمج إلى `main` → يبني CI وينشر APK جديداً تلقائياً.
- إن لم يُطلَق البناء تلقائياً، شغّله يدوياً من تبويب **Actions ← Run workflow**.
- رابط التنزيل الثابت (الأحدث دائماً):
  `https://github.com/<owner>/<repo>/releases/download/apk-latest/hlaly.apk`

---

## 8) ملاحظات

- التطبيق بلا أي اتصال سحابي أو Supabase (أُزيل بالكامل) — كل شيء محلّي.
- لا تضع أسراراً في الكود المصدري. مفاتيح التوقيع والتفعيل تُدار خارج الحزمة.
- الأدلّة تحت `docs/` وداخل التطبيق (`guide.js`).
