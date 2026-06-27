// يولّد library.json من مكتبة الأدوية/التطعيمات داخل app.js (مصدر واحد) — لرفعه على الإصدار
// كي يتمكّن التطبيق من تحديث بياناته من الإنترنت دون إعادة تثبيت.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('app.js', 'utf8');
const grab = (name) => { const m = src.match(new RegExp('const ' + name + ' = (\\[[\\s\\S]*?\\n\\]);')); if (!m) throw new Error('تعذّر إيجاد ' + name); return m[1]; };
// ثوابت مجموعات الأنواع (مطابقة لما في app.js)
const SP_AR = { sheep: ['نعيم', 'حري', 'نجد', 'غنم'], goat: ['ماعز'], camel: ['إبل'], cattle: ['بقر'] };
const spAr = (enArr) => { const out = []; (enArr || []).forEach(s => (SP_AR[s] || []).forEach(a => { if (!out.includes(a)) out.push(a); })); return out; };
const SMALL_RUM = ['نعيم', 'حري', 'نجد', 'غنم', 'ماعز'];
const ALL_LIVE = ['إبل', 'نعيم', 'حري', 'نجد', 'غنم', 'ماعز', 'بقر'];
const SR_CATTLE = SMALL_RUM.concat(['بقر']);
const vaccines = eval(grab('VACCINE_LIB'));
const treatments = eval(grab('TREATMENT_LIB'));
const vm = src.match(/const LIB_DATA_VERSION = (\d+)/);
const version = vm ? +vm[1] : 1;
writeFileSync('library.json', JSON.stringify({ version, vaccines, treatments }));
console.log('✓ library.json: ' + vaccines.length + ' لقاح، ' + treatments.length + ' دواء، نسخة ' + version);
