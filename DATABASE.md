# قاعدة بيانات حلالي — بنية التخزين المحلي

التطبيق **محلّي بالكامل**: لا يوجد خادم ولا SQL. كل البيانات تُخزَّن على جهاز
المستخدم عبر **IndexedDB** (`local-db.js`) + بعض الإعدادات في **localStorage**.
لا حاجة لأي إعداد قاعدة بيانات خارجية — تُنشأ تلقائياً عند أول تشغيل.

---

## 1) IndexedDB — قاعدة `mrahi_local`

- **اسم القاعدة:** `mrahi_local`
- **رقم النسخة الحالي:** `4`
- **الإنشاء والترقية:** تلقائي في `local-db.js` (`onupgradeneeded`) — يُنشئ أي متجر
  ناقص ذاتياً (إصلاح ذاتي)، فلا يحتاج المطوّر لأي هجرات يدوية.
- **الواجهة:** `local-db.js` يوفّر `window.createMrahLocalClient()` الذي يحاكي
  واجهة استعلام موحّدة (`from(table).select/insert/update/delete/eq/…`) يستخدمها
  `app.js` عبر المتغيّر `sb`.

### المتاجر (Object Stores)

| المتجر | المفتاح | الوصف |
|--------|---------|-------|
| `mrahi_animals` | `id` (تلقائي) | البهائم (السجل الرئيسي) |
| `mrahi_matings` | `id` | سجلات التلقيح |
| `mrahi_pregnancies` | `id` | متابعة الحمل |
| `mrahi_births` | `id` | الولادات |
| `mrahi_vaccine_types` | `id` | كتالوج أنواع التطعيمات |
| `mrahi_vaccinations` | `id` | التطعيمات المُعطاة |
| `mrahi_treatment_types` | `id` | كتالوج أنواع العلاج/الأدوية |
| `mrahi_treatments` | `id` | العلاجات المُعطاة |
| `mrahi_types` | `id` | أنواع الحلال (مدة الحمل/البلوغ/الفطام) |
| `mrahi_expenses` | `id` | الإيرادات والمصروفات |
| `mrahi_med_stock` | `id` | مخزون الأدوية واللقاحات |
| `mrahi_tips` | `id` | النصائح والمعلومات |
| `mrahi_trash` | `id` | سلة المحذوفات (استعادة خلال ٣٠ يوماً) |
| `mrahi_backups` | `id` | النسخ الاحتياطية داخل التطبيق |
| `mrahi_settings` | `key` | إعدادات عامة (مفتاح/قيمة) |
| `mrahi_counters` | `key` | عدّادات (مفتاح/قيمة) |

> متاجر باسم `mrahi_members` و`mrahi_herd_shares` و`mrahi_forum_*` تبقى موجودة
> فارغة (توافقية مع استعلامات قديمة) ولا تُستخدم في التطبيق المحلّي.

### أهم الحقول

**`mrahi_animals`** (البهيمة):
`id` · `type` (نوع الحلال) · `pen` (الحظيرة) · `idkind` (نوع المعرّف:
number/tag/chip/name/color/none) · `code` (المعرّف/الوسم) · `name` · `tag_color`
· `tag_shape` · `sex` (male/female) · `purpose` (للذكور: sire=فحل / sale) ·
`source` (born/purchased/gift) · `designation` (raise/sale) · `buy_price` ·
`birth` (تاريخ الميلاد) · `color` · `status` (present/sold/dead/given/missing/
slaughtered) · `mother_id` · `father_name` · `notes` · `counted` (احتساب يدوي في
الحظيرة) · تواريخ الخروج: `sale_date`/`sale_price`/`dead_date`/`gift_date`/
`gift_to`/`missing_date`/`slaughter_date`.

**`mrahi_matings`:** `animal_id` · `date` · `sire_code` · `sire_name` · `notes`.

**`mrahi_pregnancies`:** `animal_id` · `mating_date` · `gest` (مدة الحمل بالأيام)
· `expected` (الولادة المتوقعة) · `status` (monitoring/born/not_confirmed/
**aborted**) · `confirmed` · `sonar_date` · `notes`. حقول الإجهاض: `abort_date`
· `abort_cause` (اختياري) · `abort_gest_days` (عمر الحمل عند الإجهاض — يُحسب من
تاريخ الإجهاض ناقص تاريخ التلقيح). الإجهاض **لا يُنشئ مواليد ولا يُحتسب**.

**`mrahi_vaccinations`:** `animal_id` · `type_id` · `date` · `withdrawal_end`
(نهاية التحريم) · `next_due` · `notes`.

**`mrahi_treatments`:** `animal_id` · `treatment_type` (الحالة/السبب — يظهر في
«السجل المرضي») · `med_name` · `withdrawal_days` · `date` · `withdrawal_end` ·
`next_due` · `action` · `notes`.

---

## 2) localStorage — إعدادات وقوائم خفيفة

| المفتاح | المحتوى |
|---------|---------|
| `mrahi_contacts` | دليل التواصل (زبائن/بيطري/موردون…) |
| `mrahi_pens` | قائمة الحظائر `[{name,type}]` |
| `mrahi_reminders` | التنبيهات المخصّصة |
| `mrahi_tag_colors` / `mrahi_tag_shapes` | ألوان وأشكال الوسم المخصّصة |
| `mrahi_terms` | مصطلحات الذكر/الأنثى لكل نوع |
| `mrahi_count_age` | عمر احتساب المولود لكل نوع |
| `mrahi_fin_cats` | بنود مالية مخصّصة |
| `mrahi_last_pen` / `mrahi_last_animal` | آخر إدخال (لتسريع الإضافة) |
| `mrahi_f_status` / `mrahi_f_source` / `mrahi_f_sex` | آخر مرشّحات القائمة |
| `mrahi_sort` | ترتيب عرض القوائم: `entry`/`code`/`age` |
| `mrahi_count_males` / `mrahi_count_sires` | احتساب الذكور/الفحول ضمن عدد الحظيرة (`0`=لا) |
| `mrahi_*_seeded` | أعلام التعبئة الأولية للكتالوجات (مرة واحدة) |

الترخيص (تفعيل الجهاز) يُخزَّن أيضاً محلياً — انظر `license.js`.

---

## 3) النسخ الاحتياطي والاستعادة

- داخل التطبيق: **المزيد ← 💾 النسخ الاحتياطي** — حفظ/استعادة + تصدير JSON/CSV.
- لأن كل البيانات على الجهاز، يُنصح المستخدم بأخذ نسخة دورية (وتذكيرها ممكن
  كميزة مستقبلية).
