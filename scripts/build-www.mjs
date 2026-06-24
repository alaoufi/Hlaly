// يجمّع ملفات الويب الثابتة في مجلد www/ ليغلّفها Capacitor داخل تطبيق أندرويد.
// النسخة المحلية تستخدم index.local.html (بلا Supabase) وقاعدة بيانات IndexedDB.
import { mkdirSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';

const WWW = 'www';
rmSync(WWW, { recursive: true, force: true });
mkdirSync(WWW, { recursive: true });

copyFileSync('index.local.html', `${WWW}/index.html`);
for (const f of ['app.js', 'app.css', 'guide.js', 'local-db.js', 'updater.js', 'license.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-180.png']) {
  copyFileSync(f, `${WWW}/${f}`);
}
// مكتبة Supabase مُضمّنة محلياً حتى يعمل «الوضع المشترك» دون تحميلها من الإنترنت
copyFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js', `${WWW}/supabase.js`);
// مكتبة tweetnacl (Ed25519) للتحقّق من ترخيص التفعيل
copyFileSync('node_modules/tweetnacl/nacl.min.js', `${WWW}/nacl.min.js`);
// رقم النسخة (يُحقَن في البناء) — يظهر في التطبيق ويُستخدم للتحديث التلقائي
const VERSION = process.env.APP_VERSION || 'dev';
writeFileSync(`${WWW}/version.js`, `window.MRAH_VERSION = ${JSON.stringify(VERSION)};\n`);
console.log(`✓ www/ جاهز للتغليف بـ Capacitor (النسخة ${VERSION})`);
