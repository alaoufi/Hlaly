package me.alaoufi.mrahi.savefolder;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * إضافة كابسيتور محلية: يختار المستخدم مجلداً دائماً على الجهاز (عبر منتقي أندرويد الرسمي — Storage Access
 * Framework)، وتُحفظ فيه ملفات النسخ الاحتياطية مباشرةً. الإذن يبقى محفوظاً عبر إعادة التشغيل (persistable
 * URI permission) حتى يغيّره المستخدم أو يمسح بيانات التطبيق.
 */
@CapacitorPlugin(name = "SaveFolder")
public class SaveFolderPlugin extends Plugin {

    private static final String PREFS = "mrahi_save_folder";
    private static final String KEY_URI = "folder_uri";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // فتح منتقي المجلدات (SAF) — يطلب من المستخدم اختيار مجلد، ويحفظ الإذن الدائم عليه
    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION |
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(call, intent, "pickFolderResult");
    }

    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("cancelled");
            return;
        }
        Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("no uri");
            return;
        }
        try {
            getContext()
                .getContentResolver()
                .takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        } catch (Exception e) {
            // أفضل جهد — بعض الأجهزة/الموفّرين لا يدعمون الإذن الدائم لكل مسار
        }
        prefs().edit().putString(KEY_URI, uri.toString()).apply();
        DocumentFile df = DocumentFile.fromTreeUri(getContext(), uri);
        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        ret.put("name", df != null && df.getName() != null ? df.getName() : String.valueOf(uri.getLastPathSegment()));
        call.resolve(ret);
    }

    // المجلد المحفوظ حالياً (إن وُجد وما زال الإذن ساري المفعول)
    @PluginMethod
    public void getFolder(PluginCall call) {
        JSObject ret = new JSObject();
        String uriStr = prefs().getString(KEY_URI, null);
        if (uriStr == null) {
            ret.put("uri", (String) null);
            call.resolve(ret);
            return;
        }
        Uri uri = Uri.parse(uriStr);
        DocumentFile df = DocumentFile.fromTreeUri(getContext(), uri);
        if (df == null || !df.canWrite()) {
            ret.put("uri", (String) null);
            call.resolve(ret);
            return;
        }
        ret.put("uri", uriStr);
        ret.put("name", df.getName() != null ? df.getName() : String.valueOf(uri.getLastPathSegment()));
        call.resolve(ret);
    }

    // إلغاء اختيار المجلد المخصّص والعودة للمسار الافتراضي داخل التطبيق
    @PluginMethod
    public void clearFolder(PluginCall call) {
        String uriStr = prefs().getString(KEY_URI, null);
        if (uriStr != null) {
            try {
                getContext()
                    .getContentResolver()
                    .releasePersistableUriPermission(
                        Uri.parse(uriStr),
                        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    );
            } catch (Exception e) {
                // تجاهل
            }
        }
        prefs().edit().remove(KEY_URI).apply();
        call.resolve();
    }

    // فتح المجلد المخصّص المختار في أي تطبيق ملفات يدعم عرض مجلدات SAF — أفضل جهد؛ يفشل بوضوح إن لم يوجد
    // تطبيق مناسب على الجهاز (لا يمكن فتح المسار الافتراضي داخل مساحة التطبيق بهذه الطريقة، فقط مجلد مخصّص مختار)
    @PluginMethod
    public void openFolder(PluginCall call) {
        String uriStr = prefs().getString(KEY_URI, null);
        if (uriStr == null) {
            call.reject("no folder selected");
            return;
        }
        try {
            Uri treeUri = Uri.parse(uriStr);
            Uri docUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, DocumentsContract.getTreeDocumentId(treeUri));
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(docUri, "vnd.android.document/directory");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            if (intent.resolveActivity(getContext().getPackageManager()) == null) {
                call.reject("no app found to open the folder");
                return;
            }
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "open failed");
        }
    }

    private DocumentFile getTree() {
        String uriStr = prefs().getString(KEY_URI, null);
        if (uriStr == null) return null;
        return DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
    }

    // كتابة ملف نصّي (JSON) داخل المجلد المختار، مع استبدال أي ملف بنفس الاسم
    @PluginMethod
    public void writeFile(PluginCall call) {
        String filename = call.getString("filename");
        String data = call.getString("data", "");
        if (filename == null) {
            call.reject("filename required");
            return;
        }
        DocumentFile tree = getTree();
        if (tree == null) {
            call.reject("no folder selected");
            return;
        }
        try {
            DocumentFile existing = tree.findFile(filename);
            if (existing != null) existing.delete();
            DocumentFile newFile = tree.createFile("application/json", filename);
            if (newFile == null) {
                call.reject("create failed");
                return;
            }
            OutputStream os = getContext().getContentResolver().openOutputStream(newFile.getUri());
            if (os == null) {
                call.reject("open stream failed");
                return;
            }
            try {
                os.write(data.getBytes(StandardCharsets.UTF_8));
            } finally {
                os.close();
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "write failed");
        }
    }

    // سرد ملفات JSON داخل المجلد المختار (اسم/تاريخ آخر تعديل/حجم)
    @PluginMethod
    public void listFiles(PluginCall call) {
        JSArray arr = new JSArray();
        DocumentFile tree = getTree();
        if (tree != null) {
            try {
                for (DocumentFile f : tree.listFiles()) {
                    String name = f.getName();
                    if (f.isFile() && name != null && name.toLowerCase().endsWith(".json")) {
                        JSObject o = new JSObject();
                        o.put("name", name);
                        o.put("mtime", f.lastModified());
                        o.put("size", f.length());
                        arr.put(o);
                    }
                }
            } catch (Exception e) {
                // تجاهل — تُعاد قائمة فارغة أو جزئية
            }
        }
        JSObject ret = new JSObject();
        ret.put("files", arr);
        call.resolve(ret);
    }

    // قراءة محتوى ملف نصّي من المجلد المختار
    @PluginMethod
    public void readFile(PluginCall call) {
        String filename = call.getString("filename");
        if (filename == null) {
            call.reject("filename required");
            return;
        }
        DocumentFile tree = getTree();
        if (tree == null) {
            call.reject("no folder selected");
            return;
        }
        DocumentFile f = tree.findFile(filename);
        if (f == null) {
            call.reject("not found");
            return;
        }
        try {
            InputStream is = getContext().getContentResolver().openInputStream(f.getUri());
            if (is == null) {
                call.reject("open stream failed");
                return;
            }
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int n;
            try {
                while ((n = is.read(chunk)) != -1) buf.write(chunk, 0, n);
            } finally {
                is.close();
            }
            JSObject ret = new JSObject();
            ret.put("data", buf.toString("UTF-8"));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "read failed");
        }
    }

    // حذف ملف من المجلد المختار
    @PluginMethod
    public void deleteFile(PluginCall call) {
        String filename = call.getString("filename");
        if (filename == null) {
            call.reject("filename required");
            return;
        }
        DocumentFile tree = getTree();
        if (tree != null) {
            DocumentFile f = tree.findFile(filename);
            if (f != null) f.delete();
        }
        call.resolve();
    }
}
