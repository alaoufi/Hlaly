# تقرير نقل تطبيق أندرويد مراح — MARAHI_ANDROID_MIGRATION_REPORT

> **PHASE 3 — MARAHI ANDROID MIGRATION TO MARAHI REPOSITORY**
> **نسخ آمن فقط** إلى مستودع `alaoufi/marahi`. **لم يُحذف أي شيء من Alaoufi.me.**
> فرع العمل: `marahi-android-migration` (قاعدته `main` = `800ca5b`). **لم تُلمس main. لا force. لا دمج.**
> التاريخ: 2026-06-09

---

## 1) ما الذي تم نسخه
| المصدر | العدد | النوع |
|---|---|---|
| تطبيق أندرويد مراح (Kotlin/Jetpack Compose + Room) | **37 ملفاً** | مشروع Gradle كامل |
| workflow بناء APK | 1 ملف | GitHub Actions |

**تحقّق السلامة:** قورنت كل الـ 37 ملفاً بالمصدر عبر `md5sum` → **مطابقة بالبايت 100%** (شاملةً الملف الثنائي `gradle-wrapper.jar`). **لم يُغيَّر أي منطق في تطبيق مراح.**

## 2) من أين أتى (المصدر)
- المستودع: `alaoufi/Alaoufi.me` — الفرع `claude/sweet-pascal-kwvit3`.
- المسارات الأصلية:
  - `marahi/` (مجلد تطبيق الأندرويد).
  - `.github/workflows/marahi-apk.yml` (workflow البناء).
- طريقة النسخ: `git archive HEAD marahi` (تصدير الملفات **المتتبَّعة فقط** — بلا أي مخلّفات بناء)، ثم نسخ الـ workflow.

## 3) أين وُضِع داخل مستودع marahi
| المصدر في Alaoufi.me | الوجهة في marahi | السبب |
|---|---|---|
| `marahi/**` | **`android/**`** | جذر مستودع marahi مشغول بتطبيق الويب PWA؛ وضع الأندرويد في `android/` يفصله بوضوح ويتجنّب اسماً مكرّراً (`marahi/marahi`) |
| `.github/workflows/marahi-apk.yml` | `.github/workflows/marahi-apk.yml` | نفس الموقع القياسي للـ workflows |

البنية الناتجة:
```
marahi/ (المستودع)
├── android/                     ← تطبيق الأندرويد المنقول (37 ملفاً)
│   ├── app/ (build.gradle.kts, src/main/{AndroidManifest.xml, java/me/alaoufi/marahi/**, res/**})
│   ├── gradle/ (libs.versions.toml, wrapper/gradle-wrapper.{jar,properties})
│   ├── build.gradle.kts · settings.gradle.kts · gradle.properties · gradlew · gradlew.bat · .gitignore · README.md
├── .github/workflows/marahi-apk.yml   ← workflow البناء (بمسارات معدّلة)
└── (ملفات الويب/SQL/docs القائمة — لم تُمَس)
```

## 4) هل عُدِّل الـ workflow؟ — **نعم، المسارات الضرورية فقط (3 أسطر)**
| السطر | قبل | بعد |
|---|---|---|
| `on.push.paths` | `marahi/**` | `android/**` |
| `defaults.run.working-directory` | `marahi` | `android` |
| `Upload APK artifact › path` | `marahi/app/build/outputs/apk/debug/app-debug.apk` | `android/app/build/outputs/apk/debug/app-debug.apk` |

**لم يُغيَّر:** اسم الـ workflow، خطوة JDK 17، خطوة `setup-android` (تثبيت SDK)، أمر البناء `./gradlew assembleDebug`، ولا اسم الـ artifact.

> ⚠️ **ملاحظة (خارج نطاق «المسارات» — لم تُعدَّل عمداً):** مُحفِّز `on.push.branches` ما زال `claude/offline-apk-app-VENky` (فرع خاص بـ Alaoufi.me). داخل مستودع marahi لن يُشغِّل الدفعُ هذا الـ workflow تلقائياً على ذلك الفرع، لكن `workflow_dispatch` (التشغيل اليدوي) يعمل. تعديل فرع المُحفِّز قرارٌ سلوكي **يخصّك** — تركته كما هو التزاماً بحصر التعديل في المسارات.

## 5) حالة البناء — ❌ **غير ممكن في هذه الحاوية (سبب بيئي مؤكَّد، بلا تخمين)**
أُجريت محاولة بناء فعلية (Gradle 8.14.3 نظامي، JDK 21) تحاكي خطوة الـ workflow `./gradlew assembleDebug`. **فشلت خلال ثوانٍ** عند تحليل الإضافات:

```
* What went wrong:
Plugin [id: 'com.android.application', version: '8.6.1', apply: false] was not found
  - could not resolve plugin artifact 'com.android.application:...:8.6.1'
    Searched in: Google, MavenRepo, Gradle Central Plugin Repository
BUILD FAILED in 5s
```

**سببان بيئيّان (لا علاقة لهما بسلامة الكود):**
1. **لا وصول شبكي خارجي** إلى مستودعات `google()` / `mavenCentral()` لتنزيل AGP 8.6.1 وKotlin/Compose/Room وتوزيعة Gradle 8.9 — الحاوية مقيَّدة الشبكة.
2. **Android SDK غير مثبَّت** (`ANDROID_HOME`/`ANDROID_SDK_ROOT` غير معرّفة، لا `sdkmanager`، لا `local.properties`) — مطلوب لبناء أي APK حتى لو نُزّلت الإضافات.

> ✅ **البيئة الصحيحة للبناء = الـ workflow نفسه**: `actions/setup-java@v4` (JDK 17) + `android-actions/setup-android@v3` (SDK) + شبكة CI. **لم أدّعِ نجاح بناء لم أتحقق منه.**

### فحوصات بنيوية أُجريت محلياً (نجحت ✅)
| الفحص | النتيجة |
|---|---|
| `settings.gradle.kts` | `rootProject.name="Marahi"` و`include(":app")` ✓ |
| `build.gradle.kts` (الجذر/app) | يستخدم Version Catalog؛ AGP 8.6.1، Kotlin 2.0.21، KSP، Compose، Room ✓ |
| `gradle/libs.versions.toml` | متّسق مع الإضافات/المكتبات ✓ |
| `AndroidManifest.xml` | صالح: `.MarahiApp` + `MainActivity` (exported, LAUNCHER) + `FileProvider` ✓ |
| `applicationId` / `namespace` | `me.alaoufi.marahi` (متطابقان) · compileSdk 34 · minSdk 26 · Java 17 ✓ |
| `gradle-wrapper.jar` | موجود (43,764 B، ثنائي مُتتبَّع) ✓ · `gradlew` تنفيذي ✓ |

## 6) المتطلبات الناقصة (لإنجاح البناء — كلها متوفّرة في CI)
1. **Android SDK**: المنصة `android-34` + build-tools (يوفّرها `android-actions/setup-android@v3`).
2. **وصول شبكي** إلى Google/Maven + توزيعة Gradle 8.9 (متوفّر في CI).
3. **JDK 17** (الـ workflow يثبّته؛ المحلي هنا 21). لا حاجة لمفاتيح/أسرار — البناء debug غير موقّع.

## 7) خطة التراجع (Rollback)
1. كل التغييرات على فرع `marahi-android-migration` فقط — **`main` في مراح سليم تماماً (`800ca5b`)**.
2. التخلّص من النقل بالكامل: `git checkout main && git branch -D marahi-android-migration` (وإغلاق/حذف الـ PR المسودّة).
3. التراجع عن ملف بعينه: `git checkout main -- <path>` أو `git revert <commit>`.
4. لا دمج ولا force — العملية معكوسة بالكامل، والمصدر في Alaoufi.me يبقى نسخة احتياطية دائمة.

## 8) تأكيد: لم يُحذف شيء من Alaoufi.me ✅
- `Alaoufi.me/marahi/` (تطبيق الأندرويد) — **باقٍ كما هو، لم يُمَس**.
- `Alaoufi.me/.github/workflows/marahi-apk.yml` — **باقٍ كما هو، لم يُمَس**.
- هذه المرحلة **نسخ فقط** إلى مستودع marahi. حذف الأصل من Alaoufi.me مؤجَّل لمرحلة تنظيف لاحقة **بعد** دمج هذا الـ PR وتأكيد نجاح بناء APK في CI.
- لم يُلمَس: `app/api/mrahi-config`، `app/api/migrate`، ملفات الويب/SQL، ولا `main` في أي مستودع.

---

## 9) الخلاصة
نُقِل تطبيق أندرويد مراح (37 ملفاً، مطابقة بالبايت) إلى `android/`، وworkflow بنائه إلى `.github/workflows/` مع تعديل 3 مسارات فقط. البناء المحلي غير ممكن (لا شبكة/لا SDK) — وهذا متوقّع؛ البناء الصحيح عبر CI. **لا حذف من Alaoufi.me، لا لمس main، لا دمج — بانتظار مراجعتك للـ PR المسودّة.**
