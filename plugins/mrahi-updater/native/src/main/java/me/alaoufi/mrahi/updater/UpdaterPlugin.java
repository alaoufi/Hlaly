package me.alaoufi.mrahi.updater;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * إضافة كابسيتور محلية: تثبيت تحديث حلالي (ملف APK محمَّل مسبقاً إلى مساحة التطبيق الخاصة عبر
 * Filesystem.downloadFile في updater.js) — عبر نيّة ACTION_VIEW ومزوّد ملفات FileProvider، بعد
 * التأكّد من إذن «تثبيت تطبيقات من مصادر غير معروفة» (مطلوب من أندرويد ٨ فما فوق).
 */
@CapacitorPlugin(name = "Updater")
public class UpdaterPlugin extends Plugin {

    // هل يملك التطبيق إذن تثبيت حزم من مصادر غير معروفة؟ (قبل أندرويد ٨ الإذن ثابت عبر الإعدادات العامة، فنُرجع true)
    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean can = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            can = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("value", can);
        call.resolve(ret);
    }

    // يفتح شاشة إعدادات «السماح بالتثبيت من هذا المصدر» الخاصة بالتطبيق (أندرويد ٨+ فقط؛ لا حاجة لها قبل ذلك)
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.resolve();
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "failed to open settings");
        }
    }

    // يثبّت ملف APK محلي (مسار مطلق على الجهاز) عبر نيّة ACTION_VIEW + FileProvider
    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("path required");
            return;
        }
        File file = new File(path);
        if (!file.exists()) {
            call.reject("file not found: " + path);
            return;
        }
        try {
            Context ctx = getContext();
            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            if (intent.resolveActivity(ctx.getPackageManager()) == null) {
                call.reject("no app found to handle install");
                return;
            }
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "install failed");
        }
    }
}
