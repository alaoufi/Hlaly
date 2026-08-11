# سياسة احتساب المواليد Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** إضافة سياسة فورية/مع الأم للمواليد، بعمر رقمي ووحدة يوم/شهر، مع غرض الذكر عند الولادة.

**Architecture:** تبقى البيانات في جدول الحيوانات كما هي، ويُحفظ إعداد العرض محليًا في mrahi_newborn_policy. تُمرر السياسة إلى دالة احتساب مستقلة في app-support.js ويستخدمها inHerdCount وواجهات إعدادات الحظيرة وإضافة المواليد.

**Tech Stack:** JavaScript Capacitor، localStorage، Node test runner، CSS الحالي.

---

### Task 1: اختبار السياسة

**Files:**
- Modify: test/app-support.test.js
- Modify: app-support.js

- [ ] اكتب اختبارات فاشلة لـ normalizeNewbornPolicy, newbornAgeDays, وshouldCountNewborn.
- [ ] شغّل npm.cmd test وتأكد أن الفشل بسبب الدوال غير الموجودة.
- [ ] أضف الدوال في app-support.js مع قبول days/months ورفض الرقم السالب.
- [ ] أعد npm.cmd test وتأكد من نجاح الاختبارات الحالية والجديدة.

### Task 2: ربط الاحتساب والإعدادات

**Files:**
- Modify: app.js
- Modify: app.css

- [ ] أضف قراءة/حفظ mrahi_newborn_policy مع قيمة افتراضية آمنة.
- [ ] اجعل inHerdCount يستعمل السياسة حسب a.type ويحتسب العمر من a.birth.
- [ ] أضف قسم سياسة المواليد إلى screenHerdSettings بحقول الوضع، الرقم، والوحدة لكل نوع.
- [ ] أضف تنسيقًا هادئًا لشبكة الإعدادات دون تغيير ألوان التحذيرات.
- [ ] اختبر يدويًا أن المولود قبل الحد يظهر «يتبع أمه» وبعد الحد يدخل العدد.

### Task 3: غرض الذكور ودليل المستخدم

**Files:**
- Modify: app.js
- Modify: guide.js
- Modify: CHANGELOG.md
- Modify: package.json
- Modify: scripts/build-www.mjs

- [ ] أضف خيارات غرض الذكر في نماذج المولود المفرد والمتعدد: sire, sale، أو فارغ.
- [ ] حدّث دليل الاستخدام وسجل التعديلات، وارفع رقم الإصدار إلى 1.0.139.
- [ ] شغّل node --check app.js, npm.cmd test, npm.cmd run build:www, وnpx.cmd cap sync android.
- [ ] ابنِ APK Release، تحقّق من versionCode 139 والتوقيع، ثم ارفع commit إلى فرع GitHub الحالي.
