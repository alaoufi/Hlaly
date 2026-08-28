# قاعدة بيانات حلالي — بنية التخزين المحلي

التطبيق **محلّي بالكامل**: لا يوجد خادم ولا SQL. كل البيانات تُخزَّن على جهاز
المستخدم عبر **IndexedDB** (`local-db.js`) + بعض الإعدادات في **localStorage**.
لا حاجة لأي إعداد قاعدة بيانات خارجية — تُنشأ تلقائياً عند أول تشغيل.

---

## 1) IndexedDB — قاعدة `mrahi_local`

- **اسم القاعدة:** `mrahi_local`
- **رقم النسخة الحالي:** `6`
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
| `mrahi_trash` | `id` | سلة المحذوفات (حذف فعلي فقط — استعادة خلال ٣٠ يوماً) |
| `mrahi_edit_log` | `id` | سجل تعديلات الحقول (قيمة قديمة/جديدة لكل حقل تغيّر، قابل للتراجع) |
| `mrahi_media` | `id` | صور/فيديو/صوت لكل بهيمة |
| `mrahi_notes` | `id` | دفتر الملاحظات العامة (عنوان وتفاصيل) |
| `mrahi_backups` | `id` | النسخ الاحتياطية داخل التطبيق |
| `mrahi_settings` | `key` | إعدادات عامة (مفتاح/قيمة) |
| `mrahi_counters` | `key` | عدّادات (مفتاح/قيمة) |

> متاجر باسم `mrahi_members` و`mrahi_herd_shares` و`mrahi_forum_*` تبقى موجودة
> فارغة (توافقية مع استعلامات قديمة) ولا تُستخدم في التطبيق المحلّي.

### أهم الحقول

**`mrahi_animals`** (البهيمة):
`id` · `type` (نوع الحلال) · `pen_id` (رقم الحظيرة الداخلي الثابت — انظر
`mrahi_pens` أدناه، وليس الاسم) · `idkind` (نوع المعرّف الخارجي:
number/tag/chip/name/color/none) · `code` (المعرّف/الوسم) · `name` · `tag_color`
· `tag_shape` · `sex` (male/female) · `purpose` (للذكور: sire=فحل / sale) ·
`source` (born/purchased/gift) · `designation` (raise/sale) · `buy_price` ·
`birth` (تاريخ الميلاد) · `color` · `status` (present/sold/dead/given/missing/
slaughtered — أي حالة غير present تُخرجها فوراً من كل شاشات الحلال/الفحول/
المواليد إلى شاشة 🗄️ الأرشيف وحدها) · `mother_id` (رابط لبهيمة أخرى) ·
`mother_name` (نصّ حرّ — للمشترى فقط، أمّها من خارج الحظيرة) · `father_name`
(نصّ حرّ دائماً — لا رابط مباشر) · `notes` · `counted` (احتساب يدوي في
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

**`mrahi_edit_log`** (سجل التعديلات — يُنشأ تلقائياً من `dbUpdate`، لا يُنشئه أي
شاشة مباشرة): `tbl` (اسم المفتاح المختصر مثل `animals`/`matings`، لا اسم متجر
IndexedDB) · `rec_id` · `field` · `old_value` · `new_value` · `actor_name` ·
`created_at`. سطر واحد لكل حقل تغيّر فعلياً فقط (لا نسخة كاملة من السجل)؛
التراجع (`revertEditLogEntry`) يعيد الحقل لقيمته القديمة ويحذف السطر نفسه —
لا يُنشئ سطراً جديداً يوثّق التراجع.

**`mrahi_notes`** (دفتر الملاحظات العام، مستقل عن أي بهيمة/حظيرة): `title` ·
`detail` · `created_at`.

---

## 2) localStorage — إعدادات وقوائم خفيفة

| المفتاح | المحتوى |
|---------|---------|
| `mrahi_contacts` | دليل التواصل (زبائن/بيطري/موردون…) |
| `mrahi_festivals` | دليل المهرجانات والفعاليات (اسم/تاريخ/مكان/ملاحظات) |
| `mrahi_external_sires` | فحول خارج المراح (رقم/اسم، صاحبه وجواله، الأب، ملاحظات) — سجل مرجعي فقط، ليست بهائم |
| `mrahi_pens` | الحظائر `[{id,name,type,parentId,notes,system}]` — `id` رقم داخلي ثابت لا يتغيّر أبداً (البهائم تربط به عبر `pen_id` لا بالاسم)، `parentId` لتفرّع الحظيرة (مستوى واحد فقط) |
| `mrahi_pen_id_seq` / `mrahi_pens_id_migrated` | عدّاد `id` التالي للحظائر، وعلم ترحيل لمرّة واحدة من الصيغة القديمة (حظائر بالاسم) |
| `mrahi_reminders` | التنبيهات المخصّصة |
| `mrahi_care_reminders` | تذكيرات الرعاية لكل نوع: أيام الفطام/التحقّق من الحمل/التجفيف |
| `mrahi_tag_colors` / `mrahi_tag_shapes` | ألوان وأشكال الوسم المخصّصة |
| `mrahi_terms` | مصطلحات الذكر/الأنثى لكل نوع وعمر |
| `mrahi_count_age` | قاعدة احتساب المولود لكل نوع (عند عمر معيّن أو يدوي) + حظيرة الوجهة |
| `mrahi_count_males` / `mrahi_count_sires` / `mrahi_show_uncounted` | احتساب الذكور/الفحول ضمن عدد الحظيرة، وإظهار المواليد غير المحتسَبة في القائمة (`0`/`1`) |
| `mrahi_fin_cats` | بنود مالية مخصّصة |
| `mrahi_last_pen` / `mrahi_last_animal` | آخر إدخال (لتسريع الإضافة المتكرّرة) |
| `mrahi_f_source` / `mrahi_f_sex` / `mrahi_f_nopen` | آخر مرشّحات شاشة «🐑 الحلال» (لا يوجد مرشّح حالة — هذه الشاشة تعرض الحلال الحاضر present فقط دائماً) |
| `mrahi_sort` / `mrahi_sort_dir` | ترتيب عرض القوائم (`entry`/`code`/`age`) واتجاهه |
| `mrahi_edit_unlock_until` | وقت انتهاء فتح قفل التعديل المؤقّت (مفتاح `EDIT_UNLOCK_KEY`) — غيابه أو انقضاؤه = مقفول |
| `mrahi_lib_version` / `mrahi_lib_online_ver` | رقم نسخة مكتبة الأدوية/التطعيمات المضمَّنة، وآخر نسخة أُنزلت من الإنترنت |
| `mrahi_notif_asked` | علم طلب صلاحية الإشعارات لمرّة واحدة |
| `mrahi_*_seeded` | أعلام التعبئة الأولية للكتالوجات (أنواع/تطعيمات/علاجات — مرة واحدة) |

الترخيص (تفعيل الجهاز، مفتاح `mrahi_lic`) يُخزَّن أيضاً محلياً — انظر `license.js`.

---

## 3) النسخ الاحتياطي والاستعادة

- داخل التطبيق: **المزيد ← 💾 النسخ الاحتياطي** — حفظ/استعادة + تصدير JSON/CSV.
- لأن كل البيانات على الجهاز، يُنصح المستخدم بأخذ نسخة دورية (وتذكيرها ممكن
  كميزة مستقبلية).
