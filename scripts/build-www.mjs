// يجمّع ملفات الويب الثابتة في مجلد www/ ليغلّفها Capacitor داخل تطبيق أندرويد.
// النسخة المحلية تستخدم index.local.html (بلا Supabase) وقاعدة بيانات IndexedDB.
import { mkdirSync, rmSync, copyFileSync } from 'node:fs';

const WWW = 'www';
rmSync(WWW, { recursive: true, force: true });
mkdirSync(WWW, { recursive: true });

copyFileSync('index.local.html', `${WWW}/index.html`);
for (const f of ['app.js', 'app.css', 'guide.js', 'local-db.js', 'icon.svg']) {
  copyFileSync(f, `${WWW}/${f}`);
}
// مكتبة Supabase مُضمّنة محلياً حتى يعمل «الوضع المشترك» دون تحميلها من الإنترنت
copyFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js', `${WWW}/supabase.js`);
console.log('✓ www/ جاهز للتغليف بـ Capacitor');
