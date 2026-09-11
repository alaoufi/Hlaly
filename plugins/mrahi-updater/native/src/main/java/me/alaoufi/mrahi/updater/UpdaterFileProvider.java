package me.alaoufi.mrahi.updater;

import androidx.core.content.FileProvider;

/**
 * فئة فرعية فارغة من FileProvider خاصّة بهذه الإضافة — لا سلوك إضافي، الغرض الوحيد منها
 * أن يكون اسمها (android:name) مختلفاً عن "androidx.core.content.FileProvider" العام.
 * دامج مانيفست أندرويد يُطابق عناصر <provider> بحسب android:name، لا android:authorities —
 * فأي إضافة أخرى (مثل @capacitor/local-notifications) تُعلن مزوّد ملفات بالاسم العام نفسه
 * تتعارض مع أي إعلان آخر بنفس الاسم حتى لو اختلفت السلطة (authority). هذا الحل الموثَّق
 * القياسي عند الحاجة لأكثر من FileProvider في نفس التطبيق.
 */
public class UpdaterFileProvider extends FileProvider {
}
