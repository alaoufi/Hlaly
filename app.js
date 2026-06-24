/* مراح — تطبيق ويب متعدد المستخدمين (Supabase) — مزرعة واحدة مشتركة + صلاحيات تفصيلية */
'use strict';

/* ===== مسميات ===== */
let TYPES = [
  { k: 'camel', ar: 'إبل', gest: 390, puberty: 36, weaning: 12 }, { k: 'sheep', ar: 'غنم', gest: 150, puberty: 7, weaning: 3 },
  { k: 'goat', ar: 'ماعز', gest: 150, puberty: 7, weaning: 3 }, { k: 'cattle', ar: 'بقر', gest: 283, puberty: 15, weaning: 7 },
];
const SEX = [{ k: 'female', ar: 'أنثى' }, { k: 'male', ar: 'ذكر' }];
const STATUS = [{ k: 'present', ar: 'موجودة' }, { k: 'sold', ar: 'مباعة' }, { k: 'dead', ar: 'نافقة' }];
const SOURCE = [{ k: 'purchased', ar: 'مشترى' }, { k: 'born', ar: 'ولادة' }];
const TREAT_FORM = [{ k: 'injection', ar: 'إبر' }, { k: 'oral', ar: 'تجريع' }, { k: 'spray', ar: 'رش' }, { k: 'topical', ar: 'دهن' }];
const IDKIND = [{ k: 'number', ar: 'رقم' }, { k: 'tag', ar: 'وسم' }, { k: 'chip', ar: 'شريحة إلكترونية' }, { k: 'name', ar: 'اسم / مسمى' }, { k: 'color', ar: 'لون / علامة' }];
const PREG = [{ k: 'monitoring', ar: 'تحت المتابعة' }, { k: 'born', ar: 'ولدت' }, { k: 'not_confirmed', ar: 'لم يثبت الحمل' }];
const MODULES = [
  { k: 'animals', ar: 'الحلال' }, { k: 'breeding', ar: 'التلقيح/الولادات' },
  { k: 'vaccines', ar: 'التطعيمات' }, { k: 'treatments', ar: 'العلاجات' },
  { k: 'forum', ar: 'المنتدى' },
];
const arOf = (arr, k) => (arr.find(x => x.k === k) || {}).ar || '—';
const gestOf = (t) => (TYPES.find(x => x.k === t) || TYPES[1]).gest;
const pubertyOf = (t) => (TYPES.find(x => x.k === t) || {}).puberty;   // سن البلوغ (أشهر) أو undefined
const weaningOf = (t) => (TYPES.find(x => x.k === t) || {}).weaning;   // سن الفطام (أشهر) أو undefined

/* ===== أدوات ===== */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = () => document.getElementById('view');
const todayStr = () => new Date().toISOString().slice(0, 10);
function addDays(d, n) { if (!d) return null; const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
function addMonths(d, n) { if (!d || n == null) return null; const x = new Date(d + 'T00:00:00'); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); }
function daysUntil(d) { if (!d) return null; return Math.round((new Date(d + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000); }
// عمر تقريبي نصّي من تاريخ الميلاد (سنة/شهر)
function ageMonths(birth) { if (!birth) return null; const b = new Date(birth + 'T00:00:00'), n = new Date(todayStr() + 'T00:00:00'); let m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth()); if (n.getDate() < b.getDate()) m--; return m < 0 ? 0 : m; }
function ageText(birth) { const m = ageMonths(birth); if (m == null) return null; const y = Math.floor(m / 12), mo = m % 12; if (y && mo) return `${y} سنة و${mo} شهر`; if (y) return `${y} سنة`; return `${mo} شهر`; }
// أطول مدة تحريم لنوع التطعيم (الحليب أو اللحم، مع توافق عمود withdrawal_days القديم)
const vtWithdrawDays = (t) => Math.max(t.milk_withdrawal_days || 0, t.meat_withdrawal_days || 0, t.withdrawal_days || 0);
const fmtDate = (d) => d ? String(d).slice(0, 10).replace(/-/g, '/') : '—';
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }
// نسخ متين للنصّ يعمل في WebView (Clipboard API ثم بديل execCommand). يعيد true عند النجاح.
async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* تجاهل */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select(); try { ta.setSelectionRange(0, text.length); } catch (e) {}
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  } catch (e) { return false; }
}
const val = (id) => (document.getElementById(id) || {}).value || '';
const num = (id) => parseInt(val(id), 10) || 0;

function fInput(label, id, v, type = 'text', extra = '') { return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${esc(v == null ? '' : v)}" ${extra}></div>`; }
function fTextarea(label, id, v) { return `<div class="field"><label>${label}</label><textarea id="${id}">${esc(v || '')}</textarea></div>`; }
function fSelect(label, id, options, selected, blank) {
  const opts = (blank ? `<option value="">${blank}</option>` : '') + options.map(o => `<option value="${o.k}" ${o.k === selected ? 'selected' : ''}>${o.ar}</option>`).join('');
  return `<div class="field"><label>${label}</label><select id="${id}">${opts}</select></div>`;
}
function fAnimalSelect(label, id, selectedId, list, blank = '— اختر —') {
  const opts = `<option value="">${blank}</option>` + list.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${esc(a.code || '—')}${a.name ? ' • ' + esc(a.name) : ''}</option>`).join('');
  return `<div class="field"><label>${label}</label><select id="${id}">${opts}</select></div>`;
}
const row = (k, v) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
const noItem = () => '<div class="muted">لا يوجد</div>';

/* ===== الحالة العامة ===== */
let sb = null;        // عميل Supabase
let me = null;        // صف العضو الحالي (الصلاحيات)
let signupOpen = true; // هل التسجيل (حساب جديد) مفتوح؟ يتحكّم به المدير
let forumEnabled = true;        // المنتدى مُفعّل؟ (يخفيه المدير كاملاً عند التعطيل)
let forumTopicsModsOnly = false; // إنشاء المواضيع للمشرفين فقط؟
let siteVisits = 0;              // عدد زيارات الموقع الإجمالي (يظهر في الرئيسية)
let siteVisitCounted = false;    // احتُسبت زيارة هذه الجلسة؟ (مرة واحدة لكل تحميل)
const viewedTopics = new Set();  // مواضيع احتُسبت مشاهدتها هذه الجلسة (تفادي التكرار)
let sharesOut = [];  // دعوات مشاركة حلالي التي أرسلتُها (أنا المالك)
let sharesIn = [];   // دعوات/حلال مُشارَك معي (أنا المدعوّ)
const C = { animals: [], matings: [], pregnancies: [], births: [], vaccineTypes: [], vaccinations: [], treatments: [], treatmentTypes: [], members: [], backups: [], types: [], tips: [], forumCats: [], forumMods: [], forumBans: [] };
// جداول الحلال المعزولة بالمالك — تُحفظ نسخة خام في C._<key> ويُعرض في التطبيق حلالي فقط
const HERD_KEYS = ['animals', 'matings', 'pregnancies', 'births', 'vaccinations', 'treatments'];
const TABLES = {
  animals: 'mrahi_animals', matings: 'mrahi_matings', pregnancies: 'mrahi_pregnancies',
  births: 'mrahi_births', vaccineTypes: 'mrahi_vaccine_types', vaccinations: 'mrahi_vaccinations',
  treatments: 'mrahi_treatments', treatmentTypes: 'mrahi_treatment_types', members: 'mrahi_members', backups: 'mrahi_backups',
  types: 'mrahi_types',
};
function can(mod, act) { return !!(me && me.is_active && (me.role === 'admin' || (me.perms && me.perms[mod] && me.perms[mod][act]))); }
const isAdmin = () => !!(me && me.role === 'admin' && me.is_active);
// مدير النظام: صلاحية منفصلة عن إدارة المراح، تتحكّم بالمحتوى العام (النصائح والمعلومات)
const isSys = () => !!(me && me.is_active && me.is_sysadmin);
// صف حلال يخصّني؟ (التطبيق يعرض حلالي فقط؛ المدير يرى الكل؛ الحلال المُشارَك يُعرض في شاشة مستقلة)
function mineHerdRow(r) { return !!(me && (me.role === 'admin' || r.owner_id === me.user_id)); }
const animalById = (id) => C.animals.find(a => a.id === id);
// المعرّف الخارجي (الوسم) إن وُجد، وإلا الاسم، وإلا الرقم الداخلي الثابت #id
function display(a) { if (!a) return '—'; if (a.code) return esc(a.code) + (a.name ? ' • ' + esc(a.name) : ''); if (a.name) return esc(a.name); return a.id != null ? '#' + a.id : 'غير مرقّمة'; }
const internalNo = (a) => (a && a.id != null) ? '#' + a.id : '—';

/* ===== طبقة البيانات ===== */
async function loadAll() {
  const keys = Object.keys(TABLES);
  const results = await Promise.all(keys.map(k => sb.from(TABLES[k]).select('*')));
  keys.forEach((k, i) => {
    const data = results[i].error ? [] : (results[i].data || []);
    if (HERD_KEYS.includes(k)) { C['_' + k] = data; C[k] = data.filter(r => mineHerdRow(r)); }
    else C[k] = data;
  });
  // دعوات/مشاركات الحلال (الطرفان فقط يريانها)
  try {
    const sh = await sb.from('mrahi_herd_shares').select('*');
    const all = sh.error ? [] : (sh.data || []);
    sharesOut = all.filter(s => s.owner_id === me.user_id);
    sharesIn = all.filter(s => s.member_id === me.user_id);
  } catch (e) { sharesOut = []; sharesIn = []; }
  // أنواع الحلال القابلة للإدارة (تُحدّث القائمة العامة TYPES)
  try {
    const tr = await sb.from('mrahi_types').select('*');
    C.types = tr.error ? [] : (tr.data || []);
    if (C.types.length) TYPES = C.types.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(t => ({ k: t.key, ar: t.ar, gest: t.gest, puberty: t.puberty, weaning: t.weaning }));
  } catch (e) { /* تجاهل */ }
  await autoSeedTypes();      // تعبئة أنواع الحلال الافتراضية لتصبح قابلة للتعديل (مرة واحدة)
  await autoSeedVaccines();   // تعبئة أولية لأنواع التطعيمات الموصى بها (مرة واحدة) في القاعدة المشتركة
  await autoSeedTreatments(); // تعبئة أولية لأنواع العلاج الموصى بها (مرة واحدة) في القاعدة المشتركة
  // النصائح والمعلومات (محتوى عام يديره مدير النظام)
  try {
    const tp = await sb.from('mrahi_tips').select('*');
    C.tips = tp.error ? [] : (tp.data || []);
  } catch (e) { C.tips = []; }
  // أقسام المنتدى ومشرفوها (محتوى عام)
  try {
    const fc = await sb.from('mrahi_forum_categories').select('*').order('sort', { ascending: true });
    C.forumCats = fc.error ? [] : (fc.data || []);
  } catch (e) { C.forumCats = []; }
  try {
    const fm = await sb.from('mrahi_forum_moderators').select('*');
    C.forumMods = fm.error ? [] : (fm.data || []);
  } catch (e) { C.forumMods = []; }
  try {
    const fb = await sb.from('mrahi_forum_bans').select('*');
    C.forumBans = fb.error ? [] : (fb.data || []);
  } catch (e) { C.forumBans = []; }
  await loadForumSettings();
  await loadSignupOpen();
  try {
    const { data } = await sb.from('mrahi_counters').select('value').eq('key', 'site_visits').maybeSingle();
    if (data && typeof data.value === 'number') siteVisits = data.value;
  } catch (e) { /* تجاهل */ }
  try { await sb.rpc('mrahi_purge_trash'); } catch (e) { /* تنظيف أفضل جهد */ }
}
// التطعيمات الموصى بها لكل نوع بهيمة — تُضاف مرة واحدة في جدول mrahi_vaccine_types
// المشترك فتظهر للجميع. يُحلّ مفتاح النوع من «أنواع الحلال» حسب الاسم العربي.
const RECOMMENDED_VACCINES = [
  ['إبل', 'الجمرة الخبيثة'], ['إبل', 'الحمى القلاعية'], ['إبل', 'الجدري الإبلي'],
  ['حري', 'الحمى القلاعية'], ['حري', 'التهاب الرئة'],
  ['ماعز', 'البروسيلا'], ['ماعز', 'الحمى القلاعية'], ['ماعز', 'الكزاز'],
  ['نجد', 'البروسيلا'], ['نجد', 'الحمى القلاعية'],
  ['نعيم', 'الحمى القلاعية'], ['نعيم', 'الكزاز'],
];
// بذر أنواع الحلال الافتراضية في القاعدة لتصبح قابلة للتعديل (الاسم/مدة الحمل/سن البلوغ/سن الفطام)
async function autoSeedTypes() {
  if (C.types.length) return;                        // توجد أنواع ⇒ لا بذر
  let done = false; try { done = !!localStorage.getItem('mrahi_types_seeded'); } catch (e) { /* تجاهل */ }
  if (done) return;
  let added = 0;
  try {
    let sort = 10;
    for (const t of [
      { key: 'camel', ar: 'إبل', gest: 390, puberty: 36, weaning: 12 },
      { key: 'sheep', ar: 'غنم', gest: 150, puberty: 7, weaning: 3 },
      { key: 'goat', ar: 'ماعز', gest: 150, puberty: 7, weaning: 3 },
      { key: 'cattle', ar: 'بقر', gest: 283, puberty: 15, weaning: 7 },
    ]) { await dbInsert('types', { ...t, sort }); sort += 10; added++; }
  } catch (e) { return; }                            // قد تفشل في القاعدة المشتركة قبل ترقية الأعمدة ⇒ تبقى الافتراضات
  if (added) {
    try { localStorage.setItem('mrahi_types_seeded', '1'); } catch (e) { /* تجاهل */ }
    const r = await sb.from('mrahi_types').select('*');
    C.types = r.error ? C.types : (r.data || []);
    if (C.types.length) TYPES = C.types.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(t => ({ k: t.key, ar: t.ar, gest: t.gest, puberty: t.puberty, weaning: t.weaning }));
  }
}
async function autoSeedVaccines() {
  if (C.vaccineTypes.length) return;                 // توجد بيانات مسبقاً ⇒ لا تعبئة
  let done = false; try { done = !!localStorage.getItem('mrahi_vaccine_types_seeded'); } catch (e) { /* تجاهل */ }
  if (done) return;
  let added = 0;
  try {
    for (const [ar, name] of RECOMMENDED_VACCINES) {
      const t = TYPES.find(x => x.ar === ar);
      if (!t) continue;
      await dbInsert('vaccineTypes', { name, vaccine_name: '', withdrawal_days: 0, species: [t.k], notes: '' });
      added++;
    }
  } catch (e) { return; }                            // غالباً قبل تشغيل الترقية (عمود species) ⇒ يُعاد لاحقاً
  if (added) {
    try { localStorage.setItem('mrahi_vaccine_types_seeded', '1'); } catch (e) { /* تجاهل */ }
    const r = await sb.from(TABLES.vaccineTypes).select('*');
    C.vaccineTypes = r.error ? C.vaccineTypes : (r.data || []);
  }
}
// أنواع العلاج الموصى بها — تُضاف مرة واحدة. الجرعة/مدة الاستخدام/التحريم تُترك فارغة
// عمداً (تُحدَّد حسب نشرة المُنتِج). [الاسم، نوع العلاج، أنواع البهائم، يعالج الأمراض، ملاحظات]
const VT_ALL5 = ['إبل', 'نعيم', 'حري', 'نجد', 'ماعز'];
const VT_SMALL = ['نعيم', 'حري', 'نجد', 'ماعز'];
const RECOMMENDED_TREATMENTS = [
  ['أوكسي تتراسيكلين', 'إبر', VT_ALL5, 'التهابات بكتيرية، التهابات تنفسية، جروح ملوثة', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['تتراسيكلين', 'إبر', VT_ALL5, 'التهابات بكتيرية، التهابات تنفسية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['بنسلين', 'إبر', VT_ALL5, 'التهابات بكتيرية، التهابات الجروح', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['بنسلين ستربتومايسين', 'إبر', VT_ALL5, 'التهابات بكتيرية عامة', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['أموكسيسيلين', 'إبر', VT_ALL5, 'التهابات بكتيرية، التهابات تنفسية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['سيفتيوفور', 'إبر', VT_ALL5, 'التهابات تنفسية، التهابات بكتيرية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['إنروفلوكساسين', 'إبر', VT_ALL5, 'التهابات بكتيرية، التهابات تنفسية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['فلورفينيكول', 'إبر', VT_ALL5, 'التهابات تنفسية، التهابات بكتيرية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['تايلوسين', 'إبر', VT_ALL5, 'التهابات تنفسية، بعض التهابات الضرع', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['تلميكوسين', 'إبر', VT_ALL5, 'التهابات تنفسية', 'يستخدم بحذر وتحت إشراف بيطري'],
  ['لينكومايسين', 'إبر', VT_ALL5, 'التهابات بكتيرية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['سلفاديازين ترايميثوبريم', 'إبر', VT_ALL5, 'التهابات بكتيرية، إسهالات بكتيرية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['ميترونيدازول', 'تجريع', VT_ALL5, 'التهابات معوية، بعض العدوى اللاهوائية', 'حسب وصف الطبيب البيطري'],
  ['ألبندازول', 'تجريع', VT_ALL5, 'ديدان داخلية، ديدان كبدية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['فينبندازول', 'تجريع', VT_ALL5, 'ديدان داخلية، ديدان رئوية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['ليفاميزول', 'تجريع', VT_ALL5, 'ديدان داخلية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['إيفرمكتين', 'إبر', VT_ALL5, 'طفيليات داخلية، طفيليات خارجية، جرب، قمل', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['دورامكتين', 'إبر', VT_ALL5, 'طفيليات داخلية، طفيليات خارجية، جرب', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['موكسيدكتين', 'إبر', VT_ALL5, 'طفيليات داخلية، طفيليات خارجية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['كلوسانتيل', 'تجريع', VT_ALL5, 'ديدان كبدية، بعض الطفيليات', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['نيتروكسينيل', 'إبر', VT_ALL5, 'ديدان كبدية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['برازيكوانتيل', 'تجريع', VT_ALL5, 'ديدان شريطية', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['ديكلوروفوس', 'تجريع', VT_SMALL, 'طفيليات داخلية', 'يستخدم فقط حسب الاعتماد المحلي'],
  ['تولترازوريل', 'تجريع', VT_SMALL, 'كوكسيديا، إسهال صغار', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['ديكلازوريل', 'تجريع', VT_SMALL, 'كوكسيديا', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['أمبروليوم', 'تجريع', VT_SMALL, 'كوكسيديا', 'تحدد الجرعة والتحريم حسب المنتج'],
  ['أميتراز', 'رش', VT_ALL5, 'قراد، جرب، قمل، طفيليات خارجية', 'للاستخدام الخارجي فقط'],
  ['سايبرمثرين', 'رش', VT_ALL5, 'قراد، ذباب، قمل، طفيليات خارجية', 'للاستخدام الخارجي فقط'],
];
async function autoSeedTreatments() {
  if (C.treatmentTypes.length) return;               // توجد بيانات مسبقاً ⇒ لا تعبئة
  let done = false; try { done = !!localStorage.getItem('mrahi_treatment_types_seeded'); } catch (e) { /* تجاهل */ }
  if (done) return;
  const rows = RECOMMENDED_TREATMENTS.map(([name, formAr, sp, treats, notes]) => ({
    name,
    form: (TREAT_FORM.find(f => f.ar === formAr) || {}).k || null,
    dose: '', duration_days: 0, withdrawal_days: 0,
    species: sp.map(ar => (TYPES.find(x => x.ar === ar) || {}).k).filter(Boolean),
    treats, notes,
  }));
  try {
    const { error } = await sb.from(TABLES.treatmentTypes).insert(rows); // إدراج دفعة واحدة (سريع)
    if (error) return;                               // غالباً قبل تشغيل الترقية (جدول/أعمدة) ⇒ يُعاد لاحقاً
  } catch (e) { return; }
  try { localStorage.setItem('mrahi_treatment_types_seeded', '1'); } catch (e) { /* تجاهل */ }
  const r = await sb.from(TABLES.treatmentTypes).select('*');
  C.treatmentTypes = r.error ? C.treatmentTypes : (r.data || []);
}
async function loadSignupOpen() {
  try {
    const { data } = await sb.from('mrahi_settings').select('value').eq('key', 'signup_open').maybeSingle();
    signupOpen = !data || data.value !== false;
  } catch (e) { signupOpen = true; }
}
async function loadForumSettings() {
  try {
    const { data } = await sb.from('mrahi_settings').select('key,value').in('key', ['forum_enabled', 'forum_topics_mods_only']);
    const map = {}; (data || []).forEach(r => map[r.key] = r.value);
    forumEnabled = map.forum_enabled !== false;            // الافتراضي: مُفعّل
    forumTopicsModsOnly = map.forum_topics_mods_only === true; // الافتراضي: للجميع
  } catch (e) { forumEnabled = true; forumTopicsModsOnly = false; }
}
async function setForumSetting(key, value) {
  const { error } = await sb.from('mrahi_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
async function refreshAndRender() { showLoading(true); try { await loadAll(); } catch (e) { toast('خطأ تحميل: ' + e.message); } buildNav(); showLoading(false); render(); }
function showLoading(b) { document.getElementById('loading').classList.toggle('hidden', !b); }

// سلة المحذوفات/الأرشيف: نحفظ لقطة قبل أي حذف أو تعديل (أفضل جهد، لا تُعطّل العملية)
function trashLabel(key, rec) {
  const names = { animals: 'بهيمة', matings: 'تلقيح', pregnancies: 'حمل', births: 'ولادة', vaccineTypes: 'نوع تطعيم', vaccinations: 'تطعيم', treatments: 'علاج', treatmentTypes: 'نوع علاج' };
  const base = names[key] || key;
  let extra = '';
  if (key === 'animals') extra = rec.code || rec.name || '';
  else if (rec.animal_id) { const a = animalById(rec.animal_id); extra = a ? (a.code || a.name || '') : ''; }
  else extra = rec.name || rec.code || '';
  return base + (extra ? ' • ' + extra : '');
}
async function trashSnap(key, id, action) {
  const rec = (C[key] || []).find(x => x.id === id);
  if (!rec) return;
  try { await sb.from('mrahi_trash').insert({ tbl: key, rec_id: id, action, label: trashLabel(key, rec), data: rec, actor_name: (me && me.full_name) || '' }); } catch (e) { /* أفضل جهد */ }
}
async function dbInsert(key, obj) { const { data, error } = await sb.from(TABLES[key]).insert(obj).select().single(); if (error) throw error; return data; }
async function dbUpdate(key, id, obj) { await trashSnap(key, id, 'edit'); const { error } = await sb.from(TABLES[key]).update(obj).eq('id', id); if (error) throw error; }
async function dbDelete(key, id) { await trashSnap(key, id, 'delete'); const { error } = await sb.from(TABLES[key]).delete().eq('id', id); if (error) throw error; }
async function guard(fn) { try { await fn(); } catch (e) { const msg = (e.message || '' + e); toast(/Could not find the table|schema cache/i.test(msg) ? 'هذه الميزة تحتاج تنفيذ سكربت قاعدة البيانات أولاً (راجع التعليمات).' : 'تعذّر الحفظ: ' + msg); return false; } return true; }
// حوار تأكيد احترافي داخل التطبيق (بدل نافذة المتصفح)
function uiConfirm(message, opts = {}) {
  return new Promise(resolve => {
    const root = document.getElementById('confirmRoot');
    const danger = !!opts.danger;
    const title = opts.title || (danger ? 'تأكيد العملية' : 'تأكيد');
    const okText = opts.okText || (danger ? 'متابعة' : 'تأكيد');
    root.innerHTML = `<div class="modal-back cf-back">
      <div class="cf-box">
        <div class="cf-icon ${danger ? 'danger' : ''}">${danger ? '⚠️' : '❓'}</div>
        <div class="cf-title">${title}</div>
        <div class="cf-msg">${message}</div>
        <div class="cf-actions">
          <button class="btn outline" id="cf_no">إلغاء</button>
          <button class="btn ${danger ? 'danger' : ''}" id="cf_yes">${okText}</button>
        </div>
      </div></div>`;
    const done = v => { root.innerHTML = ''; resolve(v); };
    root.querySelector('#cf_yes').addEventListener('click', () => done(true));
    root.querySelector('#cf_no').addEventListener('click', () => done(false));
    root.querySelector('.cf-back').addEventListener('click', e => { if (e.target.classList.contains('cf-back')) done(false); });
  });
}
// تأكيد للعمليات المهمة (حذف/تعديل) — يستنتج النبرة من النص
function confirm2(msg, opts = {}) {
  const danger = opts.danger != null ? opts.danger : /حذف|نفوق|نهائي|استبدال|استعادة/.test(msg);
  return uiConfirm(msg, { danger, okText: opts.okText || (/حذف|نهائي/.test(msg) ? 'حذف' : (danger ? 'متابعة' : 'حفظ')), title: opts.title });
}

/* ===== التوجيه ===== */
function setHash(h) { location.hash = h; }
function goBack() { history.length > 1 ? history.back() : setHash('#/home'); }
const ROUTES = {
  home: { t: 'مراح', back: false, fn: screenHome },
  animals: { t: 'الحلال', back: false, fn: screenAnimals },
  alerts: { t: 'التنبيهات', back: false, fn: screenAlerts },
  more: { t: 'المزيد', back: false, fn: screenMore },
  animal: { t: 'سجل البهيمة', back: true, fn: screenAnimalDetail },
  'animal-edit': { t: 'بهيمة', back: true, fn: screenAnimalEdit },
  mating: { t: 'تلقيح / حمل', back: true, fn: screenMating },
  pregnancies: { t: 'الحمل والمتابعة', back: true, fn: screenPregnancies },
  'vaccine-types': { t: 'أنواع التطعيمات', back: true, fn: screenVaccineTypes },
  vaccinate: { t: 'إعطاء تطعيم', back: true, fn: screenVaccinate },
  'treatment-types': { t: 'أنواع العلاج', back: true, fn: screenTreatmentTypes },
  treat: { t: 'إضافة علاج', back: true, fn: screenTreat },
  bulk: { t: 'عمليات بالجملة', back: true, fn: screenBulk },
  backup: { t: 'النسخ الاحتياطي', back: true, fn: screenBackup },
  members: { t: 'المستخدمون والصلاحيات', back: true, fn: screenMembers },
  types: { t: 'أنواع الحلال', back: true, fn: screenTypes },
  inspect: { t: 'تفقد الحلال', back: true, fn: screenInspect },
  trash: { t: 'سلة المحذوفات', back: true, fn: screenTrash },
  tips: { t: 'النصائح والمعلومات', back: true, fn: screenTips },
  guide: { t: 'دليل الاستخدام', back: true, fn: screenGuide },
  shares: { t: 'مشاركة الحلال', back: true, fn: screenShares },
  'shared-herd': { t: 'حلال مُشارَك', back: true, fn: screenSharedHerd },
  forum: { t: 'المنتدى', back: false, fn: screenForum },
  'forum-admin': { t: 'إعدادات المنتدى', back: true, fn: screenForumAdmin },
  'forum-cat': { t: 'المنتدى', back: true, fn: screenForumCategory },
  'forum-topic': { t: 'الموضوع', back: true, fn: screenForumTopic },
};
function parseHash() { const raw = (location.hash || '#/home').replace(/^#\//, ''); const p = raw.split('/'); return { name: p[0] || 'home', arg: p[1] }; }

function render() {
  if (!me || !me.is_active) { renderPending(); return; }
  const { name, arg } = parseHash();
  const r = ROUTES[name] || ROUTES.home;
  document.getElementById('screenTitle').textContent = r.t;
  document.getElementById('backBtn').classList.toggle('hidden', !r.back);
  const navName = name.indexOf('forum') === 0 ? 'forum' : name;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.route === '#/' + navName));
  document.querySelectorAll('.fab').forEach(f => f.remove());
  teardownForumRealtime();   // أغلق أي اشتراك لحظي عند تغيير الشاشة
  window.scrollTo(0, 0);
  r.fn(arg);
}
function addFab(label, onClick) { document.querySelectorAll('.fab').forEach(f => f.remove()); const f = document.createElement('button'); f.className = 'fab'; f.textContent = label; f.addEventListener('click', onClick); document.body.appendChild(f); }

/* ===== التنبيهات (حسابات) ===== */
const upcomingBirths = () => C.pregnancies.filter(p => p.status === 'monitoring' && p.expected).filter(p => { const d = daysUntil(p.expected); return d !== null && d >= 0 && d <= 7; }).sort((a, b) => (a.expected || '').localeCompare(b.expected || ''));
const upcomingVacc = () => C.vaccinations.filter(v => v.next_due).filter(v => { const d = daysUntil(v.next_due); return d !== null && d >= 0 && d <= 30; }).sort((a, b) => (a.next_due || '').localeCompare(b.next_due || ''));
const activeTreatments = () => C.treatments.filter(t => t.withdrawal_end && daysUntil(t.withdrawal_end) >= 0).sort((a, b) => (a.withdrawal_end || '').localeCompare(b.withdrawal_end || ''));

/* ===== الرئيسية ===== */
function screenHome() {
  const pres = C.animals.filter(a => a.status === 'present');
  const present = pres.length;
  const sold = C.animals.filter(a => a.status === 'sold').length;
  const dead = C.animals.filter(a => a.status === 'dead').length;
  const born = pres.filter(a => a.source === 'born');
  const bornM = born.filter(a => a.sex === 'male').length, bornF = born.filter(a => a.sex === 'female').length;
  const births = upcomingBirths(), vaccs = upcomingVacc(), treats = activeTreatments();
  const hasHerd = can('animals', 'view');
  const roleLabel = isAdmin() ? 'مدير' : (me.account_type === 'visitor' ? 'زائر' : 'صاحب حلال');
  view().innerHTML = `
    <div class="title-lg">مراح</div>
    <div class="muted">أهلاً ${esc(me.full_name || '')} • ${roleLabel}</div>
    ${tipsHomeCards()}
    ${hasHerd ? `<div class="muted" style="font-size:.8rem;margin:2px 0 4px">اضغط أي بطاقة لعرض محتواها</div>
    <div class="stats">
      <div class="stat green" data-sfilter="present" style="cursor:pointer"><div class="n">${present}</div><div class="l">في المراح</div></div>
      <div class="stat amber" data-go="#/alerts" style="cursor:pointer"><div class="n">${births.length}</div><div class="l">ولادات قادمة</div></div>
      <div class="stat blue" data-go="#/alerts" style="cursor:pointer"><div class="n">${vaccs.length}</div><div class="l">تطعيمات قادمة</div></div>
      <div class="stat red" data-go="#/alerts" style="cursor:pointer"><div class="n">${treats.length}</div><div class="l">علاجات حالية</div></div>
    </div>
    <div class="stats" style="grid-template-columns:1fr 1fr 1fr">
      <div class="stat" data-born="male" style="cursor:pointer"><div class="n">${bornM}</div><div class="l">👦 مواليد ذكور</div></div>
      <div class="stat" data-born="female" style="cursor:pointer"><div class="n">${bornF}</div><div class="l">👧 مواليد إناث</div></div>
      <div class="stat" data-born="all" style="cursor:pointer"><div class="n">${bornM + bornF}</div><div class="l">📦 مجموع المواليد</div></div>
    </div>
    <div class="stats" style="grid-template-columns:1fr 1fr 1fr">
      <div class="stat" data-sfilter="sold" style="cursor:pointer"><div class="n">${sold}</div><div class="l">مباعة</div></div>
      <div class="stat" data-sfilter="dead" style="cursor:pointer"><div class="n">${dead}</div><div class="l">نافقة</div></div>
      <div class="stat" data-go="#/inspect" style="cursor:pointer"><div class="n">📊</div><div class="l">إحصائيات</div></div>
    </div>` : ''}
    ${siteVisits ? `<div class="muted site-visits">👁 زيارات الموقع: ${siteVisits.toLocaleString('ar-EG')}</div>` : ''}
    ${sharesIn.filter(s => s.status === 'pending').length ? `<div class="card click hl" data-go="#/shares"><div class="li-title">📨 دعوة لمشاهدة حلال (${sharesIn.filter(s => s.status === 'pending').length})</div><div class="li-sub">عضو يدعوك لمشاهدة حلاله — اضغط للرد</div></div>` : ''}
    ${sharesIn.filter(s => s.status === 'accepted').map(s => `<div class="card click" data-go="#/shared-herd/${s.owner_id}"><div class="li-title">🤝 حلال ${esc(s.owner_name || 'عضو')}</div><div class="li-sub">مُشارَك معك — عرض فقط</div></div>`).join('')}
    ${!hasHerd && forumEnabled && canForumView() ? `<div class="card click" data-go-forum><div class="li-title">💬 المنتدى</div><div class="li-sub">شارك واطرح أسئلتك مع المجتمع</div></div>` : ''}
    ${hasHerd && can('animals', 'edit') && C.animals.length === 0 ? `<div class="card click hl" data-go="#/animal-edit/0"><div class="li-title">➕ أضف أول بهيمة</div><div class="li-sub">ابدأ بإضافة حلالك — تختار النوع (إبل/غنم/ماعز/بقر) داخل النموذج</div></div>` : ''}
    ${hasHerd ? `<div class="search"><input id="q" placeholder="ابحث برقم/وسم/شريحة/اسم البهيمة"></div><div id="qr"></div>` : ''}
    ${can('breeding', 'view') ? `<div class="card"><h3>الولادات القادمة (٧ أيام)</h3>${births.length ? births.map(p => row(display(animalById(p.animal_id)), `${fmtDate(p.expected)} (بعد ${daysUntil(p.expected)} يوم)`)).join('') : noItem()}</div>` : ''}
    ${can('treatments', 'view') ? `<div class="card"><h3>العلاجات الحالية (تحت التحريم)</h3>${treats.length ? treats.map(t => row(display(animalById(t.animal_id)), `${esc(t.med_name)} • ينتهي ${fmtDate(t.withdrawal_end)}`)).join('') : noItem()}</div>` : ''}`;
  { const gf = view().querySelector('[data-go-forum]'); if (gf) gf.addEventListener('click', () => setHash('#/forum')); }
  view().querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => setHash(c.dataset.go)));
  // بطاقات الحالة: تفتح قائمة الحلال مُرشَّحة (في المراح/مباعة/نافقة)
  view().querySelectorAll('[data-sfilter]').forEach(c => c.addEventListener('click', () => { animalFilter = ''; animalSourceFilter = ''; animalSexFilter = ''; animalStatusFilter = c.dataset.sfilter; setHash('#/animals'); }));
  // بطاقات المواليد: تفتح المواليد (مصدر=ولادة) مُرشَّحة بالجنس
  view().querySelectorAll('[data-born]').forEach(c => c.addEventListener('click', () => { animalFilter = ''; animalStatusFilter = 'present'; animalSourceFilter = 'born'; animalSexFilter = c.dataset.born === 'all' ? '' : c.dataset.born; setHash('#/animals'); }));
  const q = document.getElementById('q');
  if (q) q.addEventListener('input', () => {
    const term = q.value.trim().toLowerCase(); const box = document.getElementById('qr');
    if (!term) { box.innerHTML = ''; return; }
    const res = C.animals.filter(a => (a.code || '').toLowerCase().includes(term) || (a.name || '').toLowerCase().includes(term) || (a.pen || '').toLowerCase().includes(term)).slice(0, 8);
    box.innerHTML = res.length ? res.map(animalCard).join('') : '<div class="muted" style="padding:8px">لا نتائج</div>';
    bindCards(box);
  });
  bindTipCards();
}

/* ===== النصائح والمعلومات ===== */
// نختار عنصراً عشوائياً من كل نوع عند كل دخول للرئيسية (تبديل عشوائي للاستفادة)
const pickRandom = (arr) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
function tipCard(item) {
  const isTip = item.kind === 'tip';
  return `<div class="card click tip-card ${isTip ? 'tip' : 'info'}" data-tip="${item.id}">
    <div class="tip-head"><span class="tip-ico">${isTip ? '💡' : 'ℹ️'}</span>
      <span class="tip-tag">${isTip ? 'نصيحة' : 'معلومة'}</span></div>
    <div class="li-title">${esc(item.title)}</div>
    <div class="li-sub">${esc(item.brief)}</div>
    <div class="tip-more">اضغط للتفاصيل ›</div>
  </div>`;
}
function tipsHomeCards() {
  const tips = C.tips.filter(t => t.kind === 'tip' && t.is_active !== false);
  const infos = C.tips.filter(t => t.kind === 'info' && t.is_active !== false);
  const chosen = [pickRandom(tips), pickRandom(infos)].filter(Boolean);
  return chosen.length ? chosen.map(tipCard).join('') : '';
}
function bindTipCards() {
  view().querySelectorAll('[data-tip]').forEach(c => c.addEventListener('click', () => {
    const item = C.tips.find(t => String(t.id) === c.dataset.tip);
    if (item) tipDetailModal(item);
  }));
}
function tipDetailModal(item) {
  const isTip = item.kind === 'tip';
  openModal(`${isTip ? '💡 نصيحة' : 'ℹ️ معلومة'}`, `
    <div class="li-title" style="margin-bottom:8px">${esc(item.title)}</div>
    <div class="tip-detail">${esc(item.detail || item.brief)}</div>`);
}

/* ===== التنبيهات ===== */
function screenAlerts() {
  const births = upcomingBirths(), vaccs = upcomingVacc(), treats = activeTreatments();
  view().innerHTML = `
    <div class="card"><h3>ولادة متوقعة خلال ٧ أيام</h3>${births.length ? births.map(p => row(display(animalById(p.animal_id)), `${fmtDate(p.expected)} • ${daysUntil(p.expected)} يوم`)).join('') : noItem()}</div>
    <div class="card"><h3>انتهاء مدة التحريم (علاجات جارية)</h3>${treats.length ? treats.map(t => row(display(animalById(t.animal_id)), `${esc(t.med_name)} • ينتهي ${fmtDate(t.withdrawal_end)}`)).join('') : noItem()}</div>
    <div class="card"><h3>مواعيد تطعيم قادمة</h3>${vaccs.length ? vaccs.map(v => row(display(animalById(v.animal_id)), fmtDate(v.next_due))).join('') : noItem()}</div>`;
}

/* ===== الحلال ===== */
let animalFilter = '';
let animalStatusFilter = 'present';
let animalSourceFilter = '';   // '' | 'born' | 'purchased'
let animalSexFilter = '';      // '' | 'male' | 'female'
// آخر «رقم مراح» مُدخَل — يُثبَّت تلقائياً في إضافة البهيمة التالية حتى يُغيَّر (إدخال أسرع للدفعات)
let lastPen = (() => { try { return localStorage.getItem('mrahi_last_pen') || ''; } catch (e) { return ''; } })();
function animalCard(a) {
  const st = a.status === 'sold' ? 'sold' : a.status === 'dead' ? 'dead' : '';
  const off = C.animals.filter(x => x.mother_id === a.id || x.father_id === a.id).length;   // عدد مواليدها
  const mother = a.mother_id ? animalById(a.mother_id) : null;
  return `<div class="card click" data-aid="${a.id}">
    <div class="li-title">${display(a)}</div>
    <div class="li-sub">${arOf(TYPES, a.type)} • ${arOf(SEX, a.sex)} • <span class="badge ${st}">${arOf(STATUS, a.status)}</span></div>
    ${a.pen ? `<div class="li-sub">المراح: ${esc(a.pen)}</div>` : ''}
    ${off ? `<div class="li-sub link" data-off="${a.id}">👶 المواليد: ${off} — عرض</div>` : ''}
    ${mother ? `<div class="li-sub link" data-momopen="${a.mother_id}">🤱 الأم: ${display(mother)}</div>` : ''}</div>`;
}
function bindCards(root) {
  root.querySelectorAll('[data-aid]').forEach(c => c.addEventListener('click', () => setHash('#/animal/' + c.dataset.aid)));
  root.querySelectorAll('[data-off]').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); offspringListModal(parseInt(el.dataset.off, 10)); }));
  root.querySelectorAll('[data-momopen]').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); setHash('#/animal/' + el.dataset.momopen); }));
}
// قائمة مواليد أمّ بعينها (من بطاقة البهيمة)
function offspringListModal(motherId) {
  const mother = animalById(motherId);
  const off = C.animals.filter(x => x.mother_id === motherId || x.father_id === motherId).sort((a, b) => (b.birth || '').localeCompare(a.birth || ''));
  openModal('مواليد ' + (mother ? display(mother) : ''),
    `<div class="muted" style="margin-bottom:6px">${off.length} مولود</div>`
    + (off.length ? off.map(o => `<div class="card click" data-aid="${o.id}" style="margin:6px 0"><div class="li-title">${display(o)}</div><div class="li-sub">${arOf(SEX, o.sex)} • ${fmtDate(o.birth)}${o.pen ? ' • ' + esc(o.pen) : ''}</div></div>`).join('') : noItem()),
    () => { document.querySelectorAll('#modalRoot [data-aid]').forEach(c => c.addEventListener('click', () => { closeModal(); setHash('#/animal/' + c.dataset.aid); })); });
}
function screenAnimals() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const chips = `<div class="chips"><span class="chip ${!animalFilter ? 'active' : ''}" data-f="">الكل</span>${TYPES.map(t => `<span class="chip ${animalFilter === t.k ? 'active' : ''}" data-f="${t.k}">${t.ar}</span>`).join('')}</div>`;
  const stChips = `<div class="chips"><span class="chip ${animalStatusFilter === 'present' ? 'active' : ''}" data-s="present">في المراح</span><span class="chip ${animalStatusFilter === 'sold' ? 'active' : ''}" data-s="sold">مباعة</span><span class="chip ${animalStatusFilter === 'dead' ? 'active' : ''}" data-s="dead">نافقة</span><span class="chip ${!animalStatusFilter ? 'active' : ''}" data-s="">الكل</span></div>`;
  const srcChips = `<div class="chips"><span class="chip ${!animalSourceFilter ? 'active' : ''}" data-src="">كل المصادر</span><span class="chip ${animalSourceFilter === 'born' ? 'active' : ''}" data-src="born">👶 مواليد</span><span class="chip ${animalSourceFilter === 'purchased' ? 'active' : ''}" data-src="purchased">🛒 مشترى</span></div>`;
  const sexBanner = animalSexFilter ? `<div class="card hl" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px"><span>الجنس: ${arOf(SEX, animalSexFilter)}</span><button class="btn sm outline" id="clrSex">✕ إلغاء</button></div>` : '';
  const list = C.animals.filter(a => (!animalFilter || a.type === animalFilter) && (!animalStatusFilter || a.status === animalStatusFilter) && (!animalSourceFilter || (a.source || 'purchased') === animalSourceFilter) && (!animalSexFilter || a.sex === animalSexFilter)).sort((a, b) => b.id - a.id);
  const canEdit = can('animals', 'edit');
  // عند خلو الحلال كلياً: حالة ترحيبية بزرّ إضافة واضح. وعند خلو التصنيف فقط: رسالة عادية.
  const empty = C.animals.length === 0
    ? `<div class="center-empty">🐑 لا يوجد حلال بعد.${canEdit ? '<br><button class="btn" id="add_first" style="margin-top:14px">➕ أضف أول بهيمة</button><div class="muted" style="margin-top:8px;font-size:.85rem">تختار النوع (إبل/غنم/ماعز/بقر) داخل النموذج — أضِف ما تشاء من كل نوع.</div>' : ''}</div>`
    : '<div class="center-empty">لا توجد بهائم في هذا التصنيف.</div>';
  const countRow = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span class="muted">العدد: ${list.length}</span>
      ${canEdit ? '<button class="btn sm outline" id="bulkAddBtn">📋 إضافة جماعية</button>' : ''}</div>`;
  view().innerHTML = chips + stChips + srcChips + sexBanner + countRow + (list.length ? list.map(animalCard).join('') : empty);
  view().querySelectorAll('[data-f]').forEach(c => c.addEventListener('click', () => { animalFilter = c.dataset.f; screenAnimals(); }));
  view().querySelectorAll('[data-s]').forEach(c => c.addEventListener('click', () => { animalStatusFilter = c.dataset.s; screenAnimals(); }));
  view().querySelectorAll('[data-src]').forEach(c => c.addEventListener('click', () => { animalSourceFilter = c.dataset.src; screenAnimals(); }));
  { const cs = document.getElementById('clrSex'); if (cs) cs.addEventListener('click', () => { animalSexFilter = ''; screenAnimals(); }); }
  bindCards(view());
  { const af = document.getElementById('add_first'); if (af) af.addEventListener('click', () => setHash('#/animal-edit/0')); }
  { const bb = document.getElementById('bulkAddBtn'); if (bb) bb.addEventListener('click', () => setHash('#/bulk/buy')); }
  if (canEdit) addFab('+ إضافة بهيمة', () => setHash('#/animal-edit/0'));
}

/* ===== إضافة/تعديل بهيمة ===== */
function screenAnimalEdit(arg) {
  if (!can('animals', 'edit')) { view().innerHTML = noPerm(); return; }
  const id = parseInt(arg, 10) || 0;
  const a = id ? animalById(id) : null;
  const females = C.animals.filter(x => x.sex === 'female' && x.id !== id);
  document.getElementById('screenTitle').textContent = id ? 'تعديل بهيمة' : 'إضافة بهيمة';
  view().innerHTML = `
    <div class="card"><h3>البيانات الأساسية</h3>
      ${a ? `<div class="muted" style="margin-bottom:8px">🔒 الرقم الداخلي ${internalNo(a)} — ثابت لا يتغيّر (هوية النظام).</div>` : '<div class="muted" style="margin-bottom:8px">🔒 سيُمنح رقم داخلي ثابت تلقائياً (لا يتغيّر مهما تغيّر الوسم).</div>'}
      ${fSelect('نوع الحلال', 'f_type', TYPES, a ? a.type : (animalFilter || 'sheep'))}
      ${fInput('رقم المراح (الحظيرة)', 'f_pen', a ? a.pen : lastPen)}
      ${fSelect('نوع المعرّف الخارجي', 'f_kind', IDKIND, a ? a.idkind : 'number')}
      ${fInput('المعرّف الخارجي / الوسم (اختياري — قد يتغيّر أو يسقط)', 'f_code', a && a.code)}
      ${fInput('الاسم/المسمى (اختياري)', 'f_name', a && a.name)}
      ${fSelect('الجنس', 'f_sex', SEX, a ? a.sex : 'female')}
      ${fSelect('المصدر', 'f_source', SOURCE, a ? (a.source || 'purchased') : 'purchased')}
      ${fInput('تاريخ الميلاد (اختياري للمشترى)', 'f_birth', a && a.birth, 'date')}
      ${fInput('اللون', 'f_color', a && a.color)}
      ${fSelect('الحالة', 'f_status', STATUS, a ? a.status : 'present')}
      <div id="saleBox">${fInput('تاريخ البيع', 'f_saledate', a && a.sale_date, 'date')}${fInput('سعر البيع', 'f_saleprice', a && a.sale_price, 'number', 'min="0" step="any" inputmode="decimal"')}</div>
      <div id="deadBox">${fInput('تاريخ النفوق', 'f_deaddate', a && a.dead_date, 'date')}</div></div>
    <div class="card"><h3>النسب</h3>
      ${fAnimalSelect('الأم', 'f_mother', a && a.mother_id, females, '— بدون —')}
      ${fInput('الأب / الفحل (اسم أو رقم)', 'f_father', a && a.father_name)}</div>
    <div class="card"><h3>ملاحظات</h3>${fTextarea('ملاحظات', 'f_notes', a && a.notes)}</div>
    <button class="btn" id="saveBtn">حفظ</button>
    ${id ? '<button class="btn danger" id="delBtn">حذف البهيمة</button>' : ''}`;
  const syncExit = () => {
    const s = val('f_status');
    document.getElementById('saleBox').style.display = s === 'sold' ? '' : 'none';
    document.getElementById('deadBox').style.display = s === 'dead' ? '' : 'none';
  };
  document.getElementById('f_status').addEventListener('change', syncExit); syncExit();
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const code = val('f_code').trim(), name = val('f_name').trim();
    // المعرّف الخارجي اختياري — الرقم الداخلي الثابت يميّز البهيمة دائماً
    const status = val('f_status');
    const obj = { type: val('f_type'), pen: val('f_pen').trim(), idkind: val('f_kind'), code, name, sex: val('f_sex'), source: val('f_source'), birth: val('f_birth') || null, color: val('f_color').trim(), status, mother_id: parseInt(val('f_mother'), 10) || null, father_name: val('f_father').trim(), notes: val('f_notes').trim(),
      sale_date: status === 'sold' ? (val('f_saledate') || null) : null,
      sale_price: status === 'sold' && val('f_saleprice') !== '' ? parseFloat(val('f_saleprice')) : null,
      dead_date: status === 'dead' ? (val('f_deaddate') || null) : null };
    if (a && !await confirm2('حفظ التعديل على هذه البهيمة؟ النسخة السابقة ستبقى في سلة المحذوفات.')) return;
    const ok = await guard(async () => { if (a) await dbUpdate('animals', id, obj); else await dbInsert('animals', obj); });
    if (ok) {
      // ثبّت آخر مراح للإضافة التالية (للبهائم الجديدة)
      if (!a) { lastPen = obj.pen || ''; try { localStorage.setItem('mrahi_last_pen', lastPen); } catch (e) {} }
      toast('تم الحفظ'); await loadAll(); goBack();
    }
  });
  if (id) document.getElementById('delBtn').addEventListener('click', async () => {
    if (!await confirm2('حذف هذه البهيمة؟ ستنتقل إلى سلة المحذوفات (يمكن استعادتها خلال ٣٠ يوماً).')) return;
    const ok = await guard(async () => { await dbDelete('animals', id); });
    if (ok) { toast('نُقلت إلى سلة المحذوفات'); await loadAll(); setHash('#/animals'); }
  });
}

/* ===== سجل البهيمة ===== */
function screenAnimalDetail(arg) {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const id = parseInt(arg, 10); const a = animalById(id);
  if (!a) { view().innerHTML = '<div class="center-empty">غير موجودة</div>'; return; }
  document.getElementById('screenTitle').textContent = a.code || 'سجل البهيمة';
  const offspring = C.animals.filter(x => x.mother_id === id || x.father_id === id).sort((x, y) => (y.birth || '').localeCompare(x.birth || ''));
  const matings = C.matings.filter(m => m.animal_id === id).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const pregs = C.pregnancies.filter(p => p.animal_id === id);
  const vaccs = C.vaccinations.filter(v => v.animal_id === id).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const treats = C.treatments.filter(t => t.animal_id === id).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const mother = a.mother_id ? animalById(a.mother_id) : null;
  const vtName = (tid) => { const v = C.vaccineTypes.find(x => x.id === tid); return v ? esc(v.name) : 'تطعيم'; };
  // ملخّص فوري: العمر • المواليد • حالة الحمل • تحت التحريم
  const offCount = C.animals.filter(x => x.mother_id === id || x.father_id === id).length;
  const monPreg = C.pregnancies.find(p => p.animal_id === id && p.status === 'monitoring');
  const withItems = [...treats, ...vaccs].filter(r => r.withdrawal_end && daysUntil(r.withdrawal_end) >= 0).sort((x, y) => (y.withdrawal_end || '').localeCompare(x.withdrawal_end || ''));
  const summary = `<div class="card" style="display:flex;flex-wrap:wrap;gap:6px">
      ${a.birth ? `<span class="badge">🎂 ${ageText(a.birth)}</span>` : ''}
      <span class="badge">${arOf(SEX, a.sex)}</span>
      ${offCount ? `<span class="badge">👶 ${offCount} مولود</span>` : ''}
      ${monPreg ? `<span class="badge">🤰 حامل • ولادة ${fmtDate(monPreg.expected)}</span>` : ''}
      ${withItems.length ? `<span class="badge off">⛔ تحت التحريم حتى ${fmtDate(withItems[0].withdrawal_end)}</span>` : ''}
      ${a.status !== 'present' ? `<span class="badge ${a.status === 'sold' ? 'sold' : 'dead'}">${arOf(STATUS, a.status)}</span>` : ''}
    </div>`;
  view().innerHTML = summary + `
    <div class="card"><h3>البيانات الأساسية</h3>
      ${row('النوع', arOf(TYPES, a.type))}
      ${row('🔒 الرقم الداخلي', internalNo(a) + ' (ثابت لا يتغيّر)')}
      ${row('المعرّف الخارجي (الوسم)', a.code ? esc(a.code) + ' • ' + arOf(IDKIND, a.idkind) : '— غير مرقّمة —')}
      ${a.name ? row('الاسم', esc(a.name)) : ''}
      ${row('الجنس', arOf(SEX, a.sex))}
      ${row('المراح', esc(a.pen) || '—')}
      ${row('المصدر', arOf(SOURCE, a.source || 'purchased'))}
      ${row('تاريخ الميلاد', fmtDate(a.birth))}
      ${a.birth ? row('🎂 العمر', ageText(a.birth)) : ''}
      ${a.birth && pubertyOf(a.type) ? row('🌱 سن البلوغ المتوقّع', fmtDate(addMonths(a.birth, pubertyOf(a.type))) + ' (' + pubertyOf(a.type) + ' شهر)') : ''}
      ${row('اللون', esc(a.color) || '—')}
      ${row('الحالة', arOf(STATUS, a.status))}
      ${(a.source || 'purchased') === 'purchased' && (a.sale_date == null) && a.buy_date ? row('تاريخ الشراء', fmtDate(a.buy_date)) : ''}
      ${(a.source || 'purchased') === 'purchased' && a.buy_price != null ? row('سعر الشراء', a.buy_price) : ''}
      ${a.status === 'sold' ? row('تاريخ البيع', fmtDate(a.sale_date)) + row('سعر البيع', a.sale_price != null ? a.sale_price : '—') : ''}
      ${a.status === 'dead' ? row('تاريخ النفوق', fmtDate(a.dead_date)) : ''}
      ${can('animals', 'edit') ? `<div class="btn-row" style="margin-top:8px">${a.status === 'present'
        ? `<button class="btn sm" id="qSell">💰 تسجيل بيع</button><button class="btn sm danger" id="qDead">📉 تسجيل نفوق</button>`
        : `<button class="btn sm outline" id="qBack">↩ إعادة للمراح</button>`}</div>` : ''}</div>
    <div class="card"><h3>النسب</h3>
      ${row('الأم', mother ? display(mother) : '—')}
      ${row('الأب / الفحل', esc(a.father_name) || '—')}
      ${a.notes ? row('ملاحظات', esc(a.notes)) : ''}</div>
    <div class="card"><h3>أنتجت (${offspring.length})</h3>
      ${can('animals', 'edit') && a.sex === 'female' ? `<button class="btn outline" id="addOffspring">➕ إضافة مواليد (نتاج)</button>` : ''}
      ${offspring.length ? offspring.map(o => `<div class="card click" data-aid="${o.id}" style="margin:6px 0"><div class="li-title">${display(o)}</div><div class="li-sub">${arOf(SEX, o.sex)} • ${fmtDate(o.birth)}</div></div>`).join('') : noItem()}</div>
    ${can('breeding', 'view') ? `<div class="card"><h3>التلقيح والحمل</h3>
      ${can('breeding', 'edit') ? `<button class="btn outline" id="addMating">إضافة تلقيح / متابعة حمل</button>` : ''}
      ${can('breeding', 'edit') && a.sex === 'female' && a.status === 'present' ? `<button class="btn outline" id="addSonar" style="margin-top:6px">🔊 فحص حمل بالسونار</button>` : ''}
      ${matings.map(m => row('تلقيح ' + fmtDate(m.date), 'الفحل: ' + (esc(m.sire_name) || esc(m.sire_code) || '—'))).join('')}
      ${pregs.map(p => row('حمل (' + arOf(PREG, p.status) + ')' + (p.confirmed ? ' 🔊' : ''), 'الولادة التقريبية ' + fmtDate(p.expected) + ' • مدة الحمل ' + p.gest + ' يوم')).join('')}</div>` : ''}
    ${can('vaccines', 'view') ? `<div class="card"><h3>التطعيمات (${vaccs.length})</h3>
      ${can('vaccines', 'edit') ? `<button class="btn outline" id="addVacc">إعطاء تطعيم</button>` : ''}
      ${vaccs.map(v => row(fmtDate(v.date) + ' — ' + vtName(v.type_id), 'تحريم حتى ' + fmtDate(v.withdrawal_end))).join('')}</div>` : ''}
    ${can('treatments', 'view') ? `<div class="card"><h3>العلاجات (${treats.length})</h3>
      ${can('treatments', 'edit') ? `<button class="btn outline" id="addTreat">إضافة علاج</button>` : ''}
      ${treats.map(t => row(esc(t.med_name) + ' (' + fmtDate(t.date) + ')', 'تحريم حتى ' + fmtDate(t.withdrawal_end))).join('')}</div>` : ''}
    <div style="height:30px"></div>`;
  bindCards(view());
  const qs = document.getElementById('qSell'); if (qs) qs.addEventListener('click', () => quickSell(a));
  const qd = document.getElementById('qDead'); if (qd) qd.addEventListener('click', () => quickDead(a));
  const qb = document.getElementById('qBack'); if (qb) qb.addEventListener('click', () => quickRevert(a));
  const ao = document.getElementById('addOffspring'); if (ao) ao.addEventListener('click', () => addOffspringModal(a));
  const am = document.getElementById('addMating'); if (am) am.addEventListener('click', () => setHash('#/mating/' + id));
  const aso = document.getElementById('addSonar'); if (aso) aso.addEventListener('click', () => animalSonarModal(a));
  const av = document.getElementById('addVacc'); if (av) av.addEventListener('click', () => setHash('#/vaccinate/' + id));
  const at = document.getElementById('addTreat'); if (at) at.addEventListener('click', () => setHash('#/treat/' + id));
  if (can('animals', 'edit')) addFab('✎ تعديل', () => setHash('#/animal-edit/' + id));
}

/* ===== إضافة نتاج (مواليد) للأم — إدخال جماعي بترقيم تلقائي وربط بالأم ===== */
function addOffspringModal(mother) {
  openModal('مواليد ' + display(mother), `
    ${fSelect('الجنس', 'of_sex', SEX, 'female')}
    ${fInput('العدد', 'of_count', '', 'number', 'min="1" inputmode="numeric"')}
    ${fInput('تاريخ الميلاد', 'of_birth', todayStr(), 'date')}
    ${fInput('رقم المراح', 'of_pen', mother.pen || lastPen)}
    <div class="chips"><span class="chip active" data-om="none">⭕ بدون ترقيم</span><span class="chip" data-om="num">🔢 بترقيم</span></div>
    <div id="ofNone" class="muted" style="font-size:.82rem">تُضاف بلا رقم — لكلٍّ رقم داخلي ثابت. رقّمها لاحقاً عند الكبر.</div>
    <div id="ofNum" class="hidden">
      ${fInput('بداية الترقيم', 'of_start', '', 'number', 'inputmode="numeric"')}
      ${fInput('بادئة قبل الرقم (اختياري)', 'of_prefix', '')}
      <div id="of_hint" class="muted" style="font-size:.82rem;margin-top:4px"></div></div>
    <button class="btn" id="of_save">➕ إضافة المواليد</button>`, () => {
    let omode = 'none';   // الافتراضي بدون ترقيم — لا نفرض أرقاماً
    const setHint = () => {
      const h = document.getElementById('of_hint'); if (!h) return;
      const s = suggestStart('');
      h.innerHTML = s !== '' ? `آخر رقم مستخدم: ${s - 1} — <button class="btn sm outline" id="of_usehint" style="padding:4px 10px">ابدأ من ${s}</button>` : 'اكتب البداية التي تريدها.';
      const u = document.getElementById('of_usehint'); if (u) u.addEventListener('click', () => { const el = document.getElementById('of_start'); if (el) el.value = String(s); });
    };
    document.querySelectorAll('[data-om]').forEach(c => c.addEventListener('click', () => {
      omode = c.dataset.om;
      document.querySelectorAll('[data-om]').forEach(x => x.classList.toggle('active', x.dataset.om === omode));
      document.getElementById('ofNum').classList.toggle('hidden', omode !== 'num');
      document.getElementById('ofNone').classList.toggle('hidden', omode !== 'none');
      if (omode === 'num') setHint();
    }));
    document.getElementById('of_save').addEventListener('click', async () => {
      let codes;
      const n = parseInt(val('of_count'), 10) || 0; if (n <= 0) { toast('أدخل عدد المواليد'); return; }
      if (omode === 'num') {
        const startRaw = val('of_start').trim();
        if (startRaw === '') { toast('اكتب بداية الترقيم، أو اختر «بدون ترقيم»'); return; }
        codes = genSeq(val('of_prefix'), startRaw, n);
        const existing = new Set(C.animals.map(a => a.code || ''));
        const dups = codes.filter(c => existing.has(c));
        if (dups.length && !await confirm2(`${dups.length} معرّف موجود مسبقاً. أضيفها أيضاً؟`)) return;
      } else {
        codes = new Array(n).fill('');   // بدون ترقيم
      }
      if (!await confirm2(`إضافة ${codes.length} مولوداً وربطها بـ${display(mother)}؟`)) return;
      const pen = val('of_pen').trim();
      const base = { type: mother.type, pen, sex: val('of_sex'), source: 'born', status: 'present', color: '', birth: val('of_birth') || null, mother_id: mother.id, father_name: '', notes: '' };
      const ok = await guard(async () => { for (const code of codes) await dbInsert('animals', { ...base, idkind: idkindFor(code), code, name: '' }); });
      if (ok) { closeModal(); lastPen = pen; try { localStorage.setItem('mrahi_last_pen', pen); } catch (e) {} toast(`أُضيف ${codes.length} مولوداً`); await loadAll(); screenAnimalDetail(String(mother.id)); }
    });
  });
}

/* ===== التلقيح والحمل ===== */
function screenMating(arg) {
  if (!can('breeding', 'edit')) { view().innerHTML = noPerm(); return; }
  const animalId = parseInt(arg, 10) || 0;
  const females = C.animals.filter(a => a.sex === 'female');
  const preset = animalId ? animalById(animalId) : null;
  view().innerHTML = `<div class="card"><h3>سجل التلقيح</h3>
    ${preset ? row('البهيمة', display(preset)) : fAnimalSelect('البهيمة (الأم)', 'm_animal', 0, females)}
    ${fInput('تاريخ التلقيح', 'm_date', todayStr(), 'date')}
    ${fInput('رقم الفحل', 'm_sireCode', '')}
    ${fInput('اسم الفحل', 'm_sireName', '')}
    ${fTextarea('ملاحظات', 'm_notes', '')}
    <div class="check"><input type="checkbox" id="m_preg" checked><label for="m_preg" style="margin:0">بدء متابعة الحمل (يحسب الولادة المتوقعة تلقائياً)</label></div>
    <div class="hint" id="m_hint"></div>
    <button class="btn" id="m_save">حفظ</button></div>`;
  const hint = document.getElementById('m_hint');
  const upd = () => { const a = preset || animalById(parseInt(val('m_animal'), 10)); const d = val('m_date'); hint.textContent = (a && d) ? `مدة الحمل: ${gestOf(a.type)} يوم → الولادة ${fmtDate(addDays(d, gestOf(a.type)))}` : ''; };
  ['m_date', 'm_animal'].forEach(i => { const el = document.getElementById(i); if (el) el.addEventListener('change', upd); });
  upd();
  document.getElementById('m_save').addEventListener('click', async () => {
    const a = preset || animalById(parseInt(val('m_animal'), 10)); const d = val('m_date');
    if (!a) { toast('اختر البهيمة'); return; } if (!d) { toast('أدخل التاريخ'); return; }
    const ok = await guard(async () => {
      await dbInsert('matings', { animal_id: a.id, date: d, sire_code: val('m_sireCode').trim(), sire_name: val('m_sireName').trim(), notes: val('m_notes').trim() });
      if (document.getElementById('m_preg').checked) { const g = gestOf(a.type); await dbInsert('pregnancies', { animal_id: a.id, mating_date: d, gest: g, expected: addDays(d, g), status: 'monitoring', notes: val('m_notes').trim() }); }
    });
    if (ok) { toast('تم الحفظ'); await loadAll(); goBack(); }
  });
}
// جدول الحوامل: الرقم • مدة الحمل (يوم) • الولادة التقريبية • المتبقّي
function pregTable(monitoring) {
  if (!monitoring.length) return '';
  const rows = monitoring.map(p => {
    const a = animalById(p.animal_id);
    const age = p.mating_date ? Math.max(0, -daysUntil(p.mating_date)) : null;   // عمر الحمل الحالي
    const left = daysUntil(p.expected);
    const leftTxt = left == null ? '—' : (left >= 0 ? left + ' يوم' : 'متأخّر ' + (-left));
    return `<tr data-aid="${a ? a.id : ''}" style="cursor:pointer">
      <td>${a ? display(a) : '—'}${p.confirmed ? ' 🔊' : ''}</td>
      <td style="text-align:center">${age != null ? age : p.gest}</td>
      <td style="text-align:center">${fmtDate(p.expected)}</td>
      <td style="text-align:center">${leftTxt}</td></tr>`;
  }).join('');
  return `<div class="card"><h3>📋 جدول الحوامل (${monitoring.length})</h3>
    <div style="overflow-x:auto"><table class="ptable">
      <thead><tr><th>البهيمة</th><th>عمر الحمل (يوم)</th><th>الولادة التقريبية</th><th>المتبقّي</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div class="muted" style="font-size:.8rem;margin-top:6px">🔊 = مؤكّد بالسونار • عمر الحمل يتحدّث يومياً • الولادة = التلقيح/السونار + مدة النوع</div></div>`;
}
function screenPregnancies() {
  if (!can('breeding', 'view')) { view().innerHTML = noPerm(); return; }
  const list = C.pregnancies.slice().sort((a, b) => (a.expected || '').localeCompare(b.expected || ''));
  const monitoring = list.filter(p => p.status === 'monitoring');
  const cards = list.map(p => {
    const a = animalById(p.animal_id);
    const sonarRow = p.confirmed ? row('🔊 فحص السونار', '✅ حامل — ' + fmtDate(p.sonar_date))
      : (p.sonar_date && p.status === 'not_confirmed' ? row('🔊 فحص السونار', 'فارغة — ' + fmtDate(p.sonar_date)) : '');
    const actions = (p.status === 'monitoring' && can('breeding', 'edit')) ? `<div class="btn-row" style="margin-top:8px">
        <button class="btn sm" data-birth="${p.id}">تسجيل ولادة</button>
        <button class="btn sm outline" data-sonar="${p.id}">🔊 فحص بالسونار</button>
        <button class="btn sm outline" data-nope="${p.id}">لم يثبت</button></div>` : '';
    const age = p.mating_date ? Math.max(0, -daysUntil(p.mating_date)) : null;
    return `<div class="card"><h3>${display(a)}</h3>${row('عمر الحمل الحالي', (age != null ? age : '—') + ' يوم')}${row('مدة حمل النوع', p.gest + ' يوم')}${row('الولادة التقريبية', fmtDate(p.expected))}${row('الحالة', arOf(PREG, p.status))}${sonarRow}${actions}</div>`;
  }).join('');
  const startBtn = can('breeding', 'edit') ? '<button class="btn" id="startPreg" style="margin:0 0 8px">🔊 متابعة الحمل بالسونار (إدخال/تعديل)</button>' : '';
  const bulkBtn = (monitoring.length && can('breeding', 'edit')) ? '<button class="btn outline" id="bulkSonar" style="margin:0 0 10px">🔊 فحص جماعي بالسونار</button>' : '';
  const bodyHtml = list.length ? (pregTable(monitoring) + cards) : '<div class="center-empty">لا توجد حالات حمل مسجّلة بعد — ابدأ متابعة حمل بالزر أعلاه.</div>';
  view().innerHTML = startBtn + bulkBtn + bodyHtml;
  { const sp = document.getElementById('startPreg'); if (sp) sp.addEventListener('click', startPregBulkModal); }
  { const bs = document.getElementById('bulkSonar'); if (bs) bs.addEventListener('click', bulkSonarModal); }
  view().querySelectorAll('.ptable tr[data-aid]').forEach(tr => { if (tr.dataset.aid) tr.addEventListener('click', () => setHash('#/animal/' + tr.dataset.aid)); });
  view().querySelectorAll('[data-nope]').forEach(b => b.addEventListener('click', async () => {
    const ok = await guard(async () => { await dbUpdate('pregnancies', parseInt(b.dataset.nope, 10), { status: 'not_confirmed' }); });
    if (ok) { await loadAll(); screenPregnancies(); }
  }));
  view().querySelectorAll('[data-sonar]').forEach(b => b.addEventListener('click', () => sonarModal(C.pregnancies.find(x => x.id === parseInt(b.dataset.sonar, 10)))));
  view().querySelectorAll('[data-birth]').forEach(b => b.addEventListener('click', () => openBirthModal(C.pregnancies.find(x => x.id === parseInt(b.dataset.birth, 10)))));
}
// بدء/تعديل متابعة حمل بالسونار — حفظ تلقائي فور كتابة عمر الحمل.
// مرشّحات: النوع والمراح. الأرقام تصاعدياً. كل صف: الرقم + عمر الحمل + الولادة المتوقّعة.
function startPregBulkModal() {
  const all = C.animals.filter(a => a.status === 'present' && a.sex === 'female');
  if (!all.length) { toast('لا توجد إناث في المراح'); return; }
  const pens = [...new Set(all.map(a => a.pen || '').filter(Boolean))].sort();
  const typesUsed = TYPES.filter(t => all.some(a => a.type === t.k));
  let typeF = '', penF = '';
  const cnum = (a) => { const n = codeNumOf(a); return n == null ? 1e15 : n; };
  const monOf = (id) => C.pregnancies.find(p => p.animal_id === id && p.status === 'monitoring');
  const curAge = (p) => (p && p.mating_date) ? Math.max(0, -daysUntil(p.mating_date)) : null;
  const examinedCount = () => all.filter(a => monOf(a.id)).length;
  const updCount = () => { const el = document.getElementById('pp_done_count'); if (el) el.textContent = `فُحِص: ${examinedCount()} من ${all.length}`; };
  const markSaved = (a, exp) => {
    const row = document.querySelector(`#pp_list .bulk-row[data-id="${a.id}"]`); if (row) { row.style.background = 'color-mix(in srgb, var(--green) 12%, transparent)'; row.style.borderRadius = '8px'; }
    const e = document.querySelector(`[data-exp="${a.id}"]`); if (e) e.textContent = '✅ 📅 ' + fmtDate(exp);
  };
  const rowHtml = (a) => {
    const p = monOf(a.id); const age = curAge(p);
    return `<div class="bulk-row" data-id="${a.id}" data-pen="${esc(a.pen || '')}" data-type="${a.type}" style="gap:10px${p ? ';background:color-mix(in srgb, var(--green) 12%, transparent);border-radius:8px' : ''}">
      <span style="flex:1;font-weight:700">${display(a)}</span>
      <input data-age="${a.id}" type="number" inputmode="numeric" min="1" placeholder="العمر" value="${age != null ? age : ''}" style="width:74px;padding:8px;border:1px solid #ddd;border-radius:8px;text-align:center">
      <span class="muted" data-exp="${a.id}" style="font-size:.76rem;min-width:88px;text-align:left">${p ? '✅ 📅 ' + fmtDate(p.expected) : ''}</span></div>`;
  };
  const applyFilter = () => { const t = (document.getElementById('pp_search').value || '').trim().toLowerCase(); document.querySelectorAll('#pp_list .bulk-row').forEach(r => { const ok = (!typeF || r.dataset.type === typeF) && (!penF || r.dataset.pen === penF) && (!t || r.textContent.toLowerCase().includes(t)); r.style.display = ok ? '' : 'none'; }); };
  const saveAge = async (a, raw) => {
    const age = parseInt(raw, 10) || 0; if (age <= 0) return;     // فارغ ⇒ لا تغيير
    const date = val('pp_date') || todayStr(); const g = gestOf(a.type);
    const conception = addDays(date, -age); const exp = addDays(conception, g);
    const p = monOf(a.id);
    const ok = await guard(async () => {
      if (p) { await dbUpdate('pregnancies', p.id, { mating_date: conception, gest: g, expected: exp, sonar_date: date, confirmed: true, notes: 'سونار — عمر الحمل ' + age + ' يوم' }); Object.assign(p, { mating_date: conception, gest: g, expected: exp, sonar_date: date, confirmed: true }); }
      else { const rec = await dbInsert('pregnancies', { animal_id: a.id, mating_date: conception, gest: g, expected: exp, status: 'monitoring', confirmed: true, sonar_date: date, notes: 'سونار — عمر الحمل ' + age + ' يوم' }); if (rec) C.pregnancies.push(rec); }
    });
    if (ok) { markSaved(a, exp); updCount(); }
  };
  const renderList = () => {
    const list = document.getElementById('pp_list'); if (!list) return;
    list.innerHTML = all.slice().sort((a, b) => cnum(a) - cnum(b) || a.id - b.id).map(rowHtml).join('');   // تصاعدي
    list.querySelectorAll('[data-age]').forEach(el => {
      const a = animalById(parseInt(el.dataset.age, 10));
      el.addEventListener('change', () => saveAge(a, el.value));
      el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const vis = [...list.querySelectorAll('[data-age]')].filter(x => x.offsetParent !== null); const i = vis.indexOf(el); if (vis[i + 1]) vis[i + 1].focus(); else el.blur(); } });
    });
    applyFilter(); updCount();
  };
  const typeChips = typesUsed.length > 1 ? `النوع: <div class="chips"><span class="chip active" data-typef="">الكل</span>${typesUsed.map(t => `<span class="chip" data-typef="${t.k}">${t.ar}</span>`).join('')}</div>` : '';
  const penChips = pens.length > 1 ? `المراح: <div class="chips"><span class="chip active" data-penf="">الكل</span>${pens.map(p => `<span class="chip" data-penf="${esc(p)}">${esc(p)}</span>`).join('')}</div>` : '';
  openModal('🔊 متابعة الحمل بالسونار', `
    ${fInput('تاريخ السونار', 'pp_date', todayStr(), 'date')}
    ${typeChips}
    ${penChips}
    ${fInput('🔍 بحث (رقم)', 'pp_search', '')}
    <div style="display:flex;justify-content:space-between;align-items:center;margin:2px 0">
      <span class="muted" style="font-size:.78rem">اكتب «عمر الحمل» أمام الرقم — يُحفظ تلقائياً.</span>
      <span class="badge" id="pp_done_count">فُحِص: 0</span></div>
    <div style="max-height:44vh;overflow:auto" id="pp_list"></div>
    <button class="btn" id="pp_done" style="margin-top:8px">✓ تم — عرض الجدول</button>`, () => {
    document.querySelectorAll('[data-typef]').forEach(c => c.addEventListener('click', () => { typeF = c.dataset.typef; document.querySelectorAll('[data-typef]').forEach(x => x.classList.toggle('active', x.dataset.typef === typeF)); applyFilter(); }));
    document.querySelectorAll('[data-penf]').forEach(c => c.addEventListener('click', () => { penF = c.dataset.penf; document.querySelectorAll('[data-penf]').forEach(x => x.classList.toggle('active', x.dataset.penf === penF)); applyFilter(); }));
    document.getElementById('pp_search').addEventListener('input', applyFilter);
    document.getElementById('pp_done').addEventListener('click', () => { closeModal(); screenPregnancies(); });
    renderList();
  });
}
// فحص حمل بالسونار من سجل البهيمة: يبدأ حملاً جديداً (مؤكّداً) أو يؤكّد/ينفي القائم
function animalSonarModal(a) {
  const existing = C.pregnancies.find(p => p.animal_id === a.id && p.status === 'monitoring');
  const g = gestOf(a.type);
  const defExp = existing && existing.expected ? existing.expected : addDays(todayStr(), g);
  openModal('🔊 فحص حمل بالسونار — ' + display(a), `
    ${fSelect('النتيجة', 'as_res', [{ k: 'pregnant', ar: 'حامل ✅' }, { k: 'empty', ar: 'فارغة' }], 'pregnant')}
    ${fInput('تاريخ الفحص', 'as_date', todayStr(), 'date')}
    ${fInput('الولادة المتوقّعة (تقريبية — عدّلها حسب السونار)', 'as_exp', defExp, 'date')}
    <button class="btn" id="as_save" style="margin-top:6px">حفظ الفحص</button>`, () => {
    document.getElementById('as_save').addEventListener('click', async () => {
      const res = val('as_res'), date = val('as_date') || todayStr(), exp = val('as_exp') || null;
      const ok = await guard(async () => {
        if (res === 'pregnant') {
          if (existing) await dbUpdate('pregnancies', existing.id, { confirmed: true, sonar_date: date, expected: exp || existing.expected, status: 'monitoring' });
          else await dbInsert('pregnancies', { animal_id: a.id, mating_date: null, gest: g, expected: exp || addDays(date, g), status: 'monitoring', confirmed: true, sonar_date: date, notes: 'فحص سونار' });
        } else if (existing) {
          await dbUpdate('pregnancies', existing.id, { confirmed: false, sonar_date: date, status: 'not_confirmed' });
        }
      });
      if (ok) { closeModal(); toast(res === 'pregnant' ? 'تم تأكيد الحمل بالسونار ✅' : 'سُجّل: فارغة'); await loadAll(); screenAnimalDetail(String(a.id)); }
    });
  });
}
// فحص الحمل بالسونار: حامل ⇒ تأكيد ومتابعة، فارغة ⇒ لم يثبت
function sonarModal(preg) {
  if (!preg) return;
  const mother = animalById(preg.animal_id);
  openModal('🔊 فحص الحمل بالسونار — ' + display(mother), `
    ${fInput('تاريخ الفحص', 's_date', todayStr(), 'date')}
    ${fSelect('النتيجة', 's_res', [{ k: 'pregnant', ar: 'حامل ✅' }, { k: 'empty', ar: 'فارغة (لم يثبت)' }], 'pregnant')}
    <button class="btn" id="s_save" style="margin-top:6px">حفظ الفحص</button>`, () => {
    document.getElementById('s_save').addEventListener('click', async () => {
      const date = val('s_date') || todayStr(), res = val('s_res');
      const patch = res === 'pregnant' ? { confirmed: true, sonar_date: date, status: 'monitoring' } : { confirmed: false, sonar_date: date, status: 'not_confirmed' };
      const ok = await guard(async () => { await dbUpdate('pregnancies', preg.id, patch); });
      if (ok) { closeModal(); toast(res === 'pregnant' ? 'تم تأكيد الحمل بالسونار ✅' : 'سُجّل: لم يثبت الحمل'); await loadAll(); screenPregnancies(); }
    });
  });
}
// فحص سونار جماعي: علّم «الفارغة» فقط، والبقية حامل مؤكّد — بتاريخ واحد
function bulkSonarModal() {
  const mon = C.pregnancies.filter(p => p.status === 'monitoring');
  if (!mon.length) { toast('لا توجد حالات تحت المتابعة'); return; }
  const rows = mon.map(p => { const a = animalById(p.animal_id); return `<label class="bulk-row"><input type="checkbox" data-empty="${p.id}"><span>${a ? display(a) : '—'} <span class="muted">${p.expected ? 'متوقّع ' + fmtDate(p.expected) : ''}</span></span></label>`; }).join('');
  openModal('🔊 فحص جماعي بالسونار', `
    ${fInput('تاريخ الفحص', 'bs_date', todayStr(), 'date')}
    <div class="muted" style="font-size:.85rem;margin:6px 0">علّم «الفارغة» فقط — والبقية تُعتبر حاملاً مؤكّداً.</div>
    <div style="max-height:46vh;overflow:auto">${rows}</div>
    <button class="btn" id="bs_save" style="margin-top:8px">حفظ الفحص للكل</button>`, () => {
    document.getElementById('bs_save').addEventListener('click', async () => {
      const date = val('bs_date') || todayStr();
      const empties = new Set([...document.querySelectorAll('[data-empty]:checked')].map(c => parseInt(c.dataset.empty, 10)));
      if (!await confirm2(`تأكيد فحص ${mon.length} حالة؟ (${empties.size} فارغة، ${mon.length - empties.size} حامل)`)) return;
      const ok = await guard(async () => {
        for (const p of mon) {
          if (empties.has(p.id)) await dbUpdate('pregnancies', p.id, { confirmed: false, sonar_date: date, status: 'not_confirmed' });
          else await dbUpdate('pregnancies', p.id, { confirmed: true, sonar_date: date, status: 'monitoring' });
        }
      });
      if (ok) { closeModal(); toast('تم حفظ الفحص الجماعي'); await loadAll(); screenPregnancies(); }
    });
  });
}
// تسجيل ولادة أسرع: عدّة مواليد (توائم) بترقيم اختياري، مربوطة بالأم
function openBirthModal(preg) {
  const mother = animalById(preg.animal_id);
  openModal('تسجيل ولادة — ' + display(mother), `
    ${fInput('عدد المواليد', 'b_count', '1', 'number', 'min="1" inputmode="numeric"')}
    ${fSelect('الجنس', 'b_sex', SEX, 'female')}
    ${fInput('تاريخ الولادة', 'b_date', todayStr(), 'date')}
    ${fInput('الأب / الفحل', 'b_father', '')}
    <div class="chips"><span class="chip active" data-bom="none">⭕ بدون ترقيم</span><span class="chip" data-bom="num">🔢 بترقيم</span></div>
    <div id="bomNum" class="hidden">
      ${fInput('بداية الترقيم', 'b_start', '', 'number', 'inputmode="numeric"')}
      ${fInput('بادئة (اختياري)', 'b_prefix', '')}
      <div id="b_hint" class="muted" style="font-size:.82rem"></div></div>
    <div class="check"><input type="checkbox" id="b_create" checked><label for="b_create" style="margin:0">إضافة المواليد كبهائم جديدة (مربوطة بالأم)</label></div>
    ${fTextarea('ملاحظات', 'b_notes', '')}
    <button class="btn" id="b_save">حفظ الولادة</button>`, () => {
    let bom = 'none';
    document.querySelectorAll('[data-bom]').forEach(c => c.addEventListener('click', () => {
      bom = c.dataset.bom;
      document.querySelectorAll('[data-bom]').forEach(x => x.classList.toggle('active', x.dataset.bom === bom));
      document.getElementById('bomNum').classList.toggle('hidden', bom !== 'num');
      if (bom === 'num') { const s = suggestStart(''); const el = document.getElementById('b_start'); if (el && el.value.trim() === '' && s !== '') el.value = String(s); const h = document.getElementById('b_hint'); if (h) h.textContent = s !== '' ? `اقتراح يبدأ من ${s} (قابل للتعديل)` : 'اكتب البداية التي تريدها'; }
    }));
    document.getElementById('b_save').addEventListener('click', async () => {
      const n = parseInt(val('b_count'), 10) || 0; if (n <= 0) { toast('أدخل عدد المواليد'); return; }
      const sex = val('b_sex'), date = val('b_date') || todayStr(), father = val('b_father').trim(), notes = val('b_notes').trim(), create = document.getElementById('b_create').checked;
      let codes;
      if (bom === 'num') { const sr = val('b_start').trim(); if (sr === '') { toast('اكتب بداية الترقيم أو اختر «بدون ترقيم»'); return; } codes = genSeq(val('b_prefix'), sr, n); }
      else codes = new Array(n).fill('');
      const ok = await guard(async () => {
        for (const code of codes) {
          let offId = null;
          if (create) { const created = await dbInsert('animals', { type: mother.type, pen: mother.pen || '', idkind: idkindFor(code), code, name: '', sex, source: 'born', birth: date, color: '', status: 'present', mother_id: mother.id, father_name: father, notes }); offId = created.id; }
          await dbInsert('births', { mother_id: mother.id, offspring_id: offId, offspring_code: code, date, sex, father_name: father, notes });
        }
        await dbUpdate('pregnancies', preg.id, { status: 'born' });
      });
      if (ok) { closeModal(); toast(`تم تسجيل الولادة (${n})`); await loadAll(); screenPregnancies(); }
    });
  });
}

/* ===== اختيار متعدد لأنواع البهائم (يُستخدم في أنواع التطعيم/العلاج) ===== */
function fSpecies(selected) {
  const sel = Array.isArray(selected) ? selected : [];
  return `<div class="field"><label>نوع البهيمة (اختيار متعدد — اتركه فارغاً = كل الأنواع)</label>
    <div class="chips" id="sp_box">${TYPES.map(t => `<span class="chip ${sel.includes(t.k) ? 'active' : ''}" data-sp="${t.k}">${t.ar}</span>`).join('')}</div></div>`;
}
function bindSpecies() { document.querySelectorAll('#sp_box [data-sp]').forEach(c => c.addEventListener('click', () => c.classList.toggle('active'))); }
function getSpecies() { return [...document.querySelectorAll('#sp_box [data-sp].active')].map(c => c.dataset.sp); }
function speciesLabel(arr) { return (Array.isArray(arr) && arr.length) ? arr.map(k => arOf(TYPES, k)).join('، ') : 'كل الأنواع'; }

/* ===== أنواع التطعيمات ===== */
function screenVaccineTypes() {
  if (!can('vaccines', 'view')) { view().innerHTML = noPerm(); return; }
  const list = C.vaccineTypes.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  view().innerHTML = (list.length ? list.map(v => `<div class="card">
      <div class="li-title">${esc(v.name)}</div>
      <div class="li-sub">نوع البهيمة: ${esc(speciesLabel(v.species))}</div>
      ${v.usage ? `<div class="li-sub">الاستخدام: ${esc(v.usage)}</div>` : ''}
      ${v.dose ? `<div class="li-sub">الجرعة: ${esc(v.dose)}</div>` : ''}
      ${v.recommended_age ? `<div class="li-sub">العمر الموصى به: ${esc(v.recommended_age)}</div>` : ''}
      ${v.validity_days ? `<div class="li-sub">مدة الفاعلية: ${v.validity_days} يوم</div>` : ''}
      <div class="li-sub">مدة التحريم للحليب: ${v.milk_withdrawal_days || 0} يوم • للحوم: ${v.meat_withdrawal_days || 0} يوم</div>
      ${v.notes ? `<div class="li-sub">${esc(v.notes)}</div>` : ''}
      ${can('vaccines', 'edit') ? `<div class="btn-row" style="margin-top:6px"><button class="btn sm outline" data-edit="${v.id}">تعديل</button><button class="btn sm danger" data-del="${v.id}">حذف</button></div>` : ''}
    </div>`).join('') : '<div class="center-empty">عرّف أنواع التطعيمات مرة واحدة.</div>');
  view().querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => vaccineTypeModal(C.vaccineTypes.find(v => String(v.id) === b.dataset.edit))));
  view().querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('حذف نوع التطعيم؟ سينتقل إلى سلة المحذوفات.')) return;
    const ok = await guard(async () => { await dbDelete('vaccineTypes', parseInt(b.dataset.del, 10)); });
    if (ok) { toast('نُقل إلى سلة المحذوفات'); await loadAll(); screenVaccineTypes(); }
  }));
  if (can('vaccines', 'edit')) addFab('+ نوع تطعيم', () => vaccineTypeModal(null));
}
function vaccineTypeModal(v) {
  openModal(v ? 'تعديل نوع تطعيم' : 'نوع تطعيم جديد', `
    ${fInput('اسم التطعيم', 'vt_name', v && v.name)}
    ${fSpecies(v && v.species)}
    ${fInput('الاستخدام', 'vt_usage', v && v.usage)}
    ${fInput('الجرعة', 'vt_dose', v && v.dose)}
    ${fInput('العمر الموصى به', 'vt_age', v && v.recommended_age)}
    ${fInput('مدة الفاعلية (أيام)', 'vt_valid', v ? v.validity_days : '', 'number', 'min="0"')}
    ${fInput('مدة التحريم للحليب (أيام)', 'vt_milk', v ? v.milk_withdrawal_days : '', 'number', 'min="0"')}
    ${fInput('مدة التحريم للحوم (أيام)', 'vt_meat', v ? v.meat_withdrawal_days : '', 'number', 'min="0"')}
    ${fTextarea('ملاحظات', 'vt_notes', v && v.notes)}
    <button class="btn" id="vt_save">حفظ</button>`, () => {
    bindSpecies();
    document.getElementById('vt_save').addEventListener('click', async () => {
      const name = val('vt_name').trim(); if (!name) { toast('أدخل اسم التطعيم'); return; }
      if (v && !await confirm2('حفظ تعديل نوع التطعيم؟')) return;
      const milk = num('vt_milk'), meat = num('vt_meat');
      const obj = { name, usage: val('vt_usage').trim(), dose: val('vt_dose').trim(), recommended_age: val('vt_age').trim(), validity_days: num('vt_valid'), milk_withdrawal_days: milk, meat_withdrawal_days: meat, withdrawal_days: Math.max(milk, meat), species: getSpecies(), notes: val('vt_notes').trim() };
      const ok = await guard(async () => { if (v) await dbUpdate('vaccineTypes', v.id, obj); else await dbInsert('vaccineTypes', obj); });
      if (ok) { closeModal(); toast('تم الحفظ'); await loadAll(); screenVaccineTypes(); }
    });
  });
}

/* ===== أنواع العلاج (كتالوج) ===== */
function screenTreatmentTypes() {
  if (!can('treatments', 'view')) { view().innerHTML = noPerm(); return; }
  const list = C.treatmentTypes.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">عرّف العلاجات المتكررة مرة واحدة لاستخدامها بسرعة عند تسجيل علاج.</div>`
    + (list.length ? list.map(t => `<div class="card">
      <div class="li-title">${esc(t.name)} <span class="muted" style="font-weight:400">${t.form ? '• ' + arOf(TREAT_FORM, t.form) : ''}</span></div>
      ${t.dose ? `<div class="li-sub">الجرعة: ${esc(t.dose)}</div>` : ''}
      ${t.duration_days ? `<div class="li-sub">مدة استخدام العلاج: ${t.duration_days} يوم</div>` : ''}
      <div class="li-sub">مدة التحريم للحليب واللحم: ${t.withdrawal_days || 0} يوم</div>
      <div class="li-sub">البهيمة: ${esc(speciesLabel(t.species))}</div>
      ${t.treats ? `<div class="li-sub">يعالج الأمراض: ${esc(t.treats)}</div>` : ''}
      ${t.notes ? `<div class="li-sub">${esc(t.notes)}</div>` : ''}
      ${can('treatments', 'edit') ? `<div class="btn-row" style="margin-top:6px"><button class="btn sm outline" data-edit="${t.id}">تعديل</button><button class="btn sm danger" data-del="${t.id}">حذف</button></div>` : ''}
    </div>`).join('') : '<div class="center-empty">لا توجد أنواع علاج — أضِف نوعاً.</div>');
  view().querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => treatmentTypeModal(C.treatmentTypes.find(t => String(t.id) === b.dataset.edit))));
  view().querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('حذف نوع العلاج؟ سينتقل إلى سلة المحذوفات.')) return;
    const ok = await guard(async () => { await dbDelete('treatmentTypes', parseInt(b.dataset.del, 10)); });
    if (ok) { toast('نُقل إلى سلة المحذوفات'); await loadAll(); screenTreatmentTypes(); }
  }));
  if (can('treatments', 'edit')) addFab('+ نوع علاج', () => treatmentTypeModal(null));
}
function treatmentTypeModal(t) {
  openModal(t ? 'تعديل نوع علاج' : 'نوع علاج جديد', `
    ${fInput('اسم العلاج', 'tt_name', t && t.name)}
    ${fSelect('نوع العلاج', 'tt_form', TREAT_FORM, t ? t.form : '', '— اختر —')}
    ${fInput('الجرعة', 'tt_dose', t && t.dose)}
    ${fInput('مدة استخدام العلاج (أيام)', 'tt_dur', t ? t.duration_days : '', 'number', 'min="0"')}
    ${fInput('مدة التحريم للحليب واللحم (أيام)', 'tt_days', t ? t.withdrawal_days : '', 'number', 'min="0"')}
    ${fSpecies(t && t.species)}
    ${fInput('يعالج الأمراض', 'tt_treats', t && t.treats)}
    ${fTextarea('ملاحظات', 'tt_notes', t && t.notes)}
    <button class="btn" id="tt_save">حفظ</button>`, () => {
    bindSpecies();
    document.getElementById('tt_save').addEventListener('click', async () => {
      const name = val('tt_name').trim(); if (!name) { toast('أدخل اسم العلاج'); return; }
      if (t && !await confirm2('حفظ تعديل نوع العلاج؟')) return;
      const obj = { name, form: val('tt_form') || null, dose: val('tt_dose').trim(), duration_days: num('tt_dur'), withdrawal_days: num('tt_days'), species: getSpecies(), treats: val('tt_treats').trim(), notes: val('tt_notes').trim() };
      const ok = await guard(async () => { if (t) await dbUpdate('treatmentTypes', t.id, obj); else await dbInsert('treatmentTypes', obj); });
      if (ok) { closeModal(); toast('تم الحفظ'); await loadAll(); screenTreatmentTypes(); }
    });
  });
}

/* ===== إعطاء تطعيم ===== */
function screenVaccinate(arg) {
  if (!can('vaccines', 'edit')) { view().innerHTML = noPerm(); return; }
  const animalId = parseInt(arg, 10) || 0; const preset = animalId ? animalById(animalId) : null;
  if (!C.vaccineTypes.length) { view().innerHTML = `<div class="center-empty">لا توجد أنواع تطعيمات.</div><button class="btn" id="g">الذهاب لأنواع التطعيمات</button>`; document.getElementById('g').addEventListener('click', () => setHash('#/vaccine-types')); return; }
  const vtMilk = (t) => t.milk_withdrawal_days || 0, vtMeat = (t) => t.meat_withdrawal_days || 0;
  const vtWithdraw = vtWithdrawDays; // أطول مدة تحريم (حليب/لحم)
  const typeOpts = C.vaccineTypes.map(v => ({ k: String(v.id), ar: `${v.name} (${vtWithdraw(v)}ي)` }));
  view().innerHTML = `<div class="card"><h3>بيانات التطعيم</h3>
    ${preset ? row('البهيمة', display(preset)) : fAnimalSelect('البهيمة', 'v_animal', 0, C.animals)}
    ${fSelect('التطعيم', 'v_type', typeOpts, '', '— اختر —')}
    ${fInput('تاريخ التطعيم', 'v_date', todayStr(), 'date')}
    <div class="hint" id="v_hint"></div>
    ${fInput('موعد الجرعة القادمة (اختياري)', 'v_next', '', 'date')}
    ${fTextarea('ملاحظات', 'v_notes', '')}
    <button class="btn" id="v_save">حفظ</button></div>`;
  const hint = document.getElementById('v_hint');
  const upd = () => {
    const t = C.vaccineTypes.find(x => x.id === parseInt(val('v_type'), 10)); const d = val('v_date');
    if (!t || !d) { hint.textContent = ''; return; }
    const parts = [];
    if (vtMilk(t)) parts.push(`تحريم الحليب ينتهي: ${fmtDate(addDays(d, vtMilk(t)))}`);
    if (vtMeat(t)) parts.push(`تحريم اللحم ينتهي: ${fmtDate(addDays(d, vtMeat(t)))}`);
    if (!parts.length && vtWithdraw(t)) parts.push(`انتهاء التحريم: ${fmtDate(addDays(d, vtWithdraw(t)))}`);
    if (t.dose) parts.push(`الجرعة: ${t.dose}`);
    hint.textContent = parts.join(' • ');
    if (t.validity_days && !val('v_next')) document.getElementById('v_next').value = addDays(d, t.validity_days); // اقتراح موعد الجرعة القادمة
  };
  document.getElementById('v_type').addEventListener('change', upd); document.getElementById('v_date').addEventListener('change', upd);
  document.getElementById('v_save').addEventListener('click', async () => {
    const a = preset || animalById(parseInt(val('v_animal'), 10)); const t = C.vaccineTypes.find(x => x.id === parseInt(val('v_type'), 10)); const d = val('v_date');
    if (!a) { toast('اختر البهيمة'); return; } if (!t) { toast('اختر التطعيم'); return; }
    const ok = await guard(async () => { await dbInsert('vaccinations', { animal_id: a.id, type_id: t.id, date: d, withdrawal_end: addDays(d, vtWithdraw(t)), next_due: val('v_next') || null, notes: val('v_notes').trim() }); });
    if (ok) { toast('تم الحفظ'); await loadAll(); goBack(); }
  });
}

/* ===== العلاجات ===== */
function screenTreat(arg) {
  if (!can('treatments', 'edit')) { view().innerHTML = noPerm(); return; }
  const animalId = parseInt(arg, 10) || 0; const preset = animalId ? animalById(animalId) : null;
  view().innerHTML = `<div class="card"><h3>بيانات العلاج</h3>
    ${preset ? row('البهيمة', display(preset)) : fAnimalSelect('البهيمة', 't_animal', 0, C.animals)}
    ${C.treatmentTypes.length ? fSelect('اختر من أنواع العلاج (اختياري)', 't_pick', C.treatmentTypes.map(x => ({ k: String(x.id), ar: x.name })), '', '— للتعبئة التلقائية —') : ''}
    ${fInput('نوع العلاج (مثال: مضاد حيوي)', 't_type', '')}
    ${fInput('اسم العلاج (مثال: أوكسي تترا)', 't_med', '')}
    ${fInput('مدة التحريم (أيام)', 't_days', '', 'number', 'min="0"')}
    ${fInput('تاريخ العلاج', 't_date', todayStr(), 'date')}
    <div class="hint" id="t_hint"></div>
    ${fInput('الإجراء', 't_action', '')}${fTextarea('ملاحظات', 't_notes', '')}
    <button class="btn" id="t_save">حفظ</button></div>`;
  const hint = document.getElementById('t_hint');
  const upd = () => { const days = num('t_days'), d = val('t_date'); hint.textContent = (days > 0 && d) ? `انتهاء التحريم: ${fmtDate(addDays(d, days))}` : ''; };
  document.getElementById('t_days').addEventListener('input', upd); document.getElementById('t_date').addEventListener('change', upd);
  const pick = document.getElementById('t_pick'); if (pick) pick.addEventListener('change', () => {
    const tt = C.treatmentTypes.find(x => String(x.id) === val('t_pick')); if (!tt) return;
    document.getElementById('t_type').value = tt.form ? arOf(TREAT_FORM, tt.form) : (tt.treats || '');
    document.getElementById('t_med').value = tt.name || '';
    document.getElementById('t_days').value = tt.withdrawal_days || '';
    document.getElementById('t_notes').value = [tt.dose ? 'الجرعة: ' + tt.dose : '', tt.treats ? 'يعالج: ' + tt.treats : '', tt.notes || ''].filter(Boolean).join(' — ');
    upd();
  });
  document.getElementById('t_save').addEventListener('click', async () => {
    const a = preset || animalById(parseInt(val('t_animal'), 10)); const d = val('t_date'), days = num('t_days');
    if (!a) { toast('اختر البهيمة'); return; }
    const ok = await guard(async () => { await dbInsert('treatments', { animal_id: a.id, treatment_type: val('t_type').trim(), med_name: val('t_med').trim(), withdrawal_days: days, date: d, withdrawal_end: addDays(d, days), action: val('t_action').trim(), notes: val('t_notes').trim() }); });
    if (ok) { toast('تم الحفظ'); await loadAll(); goBack(); }
  });
}

/* ===== إجراءات سريعة من ملف البهيمة (بيع/نفوق/إعادة) ===== */
function quickSell(a) {
  openModal('تسجيل بيع', `
    ${fInput('تاريخ البيع', 'qs_date', todayStr(), 'date')}
    ${fInput('سعر البيع (اختياري)', 'qs_price', '', 'number', 'min="0" step="any" inputmode="decimal"')}
    <button class="btn" id="qs_save">حفظ البيع</button>`, () => {
    document.getElementById('qs_save').addEventListener('click', async () => {
      if (!await confirm2('تسجيل بيع هذه البهيمة وإخراجها من المراح؟')) return;
      const price = val('qs_price') !== '' ? parseFloat(val('qs_price')) : null;
      const ok = await guard(async () => { await dbUpdate('animals', a.id, { status: 'sold', sale_date: val('qs_date') || null, sale_price: price, dead_date: null }); });
      if (ok) { closeModal(); toast('تم تسجيل البيع'); await loadAll(); screenAnimalDetail(String(a.id)); }
    });
  });
}
function quickDead(a) {
  openModal('تسجيل نفوق', `
    ${fInput('تاريخ النفوق', 'qd_date', todayStr(), 'date')}
    <button class="btn danger" id="qd_save">حفظ النفوق</button>`, () => {
    document.getElementById('qd_save').addEventListener('click', async () => {
      if (!await confirm2('تسجيل نفوق هذه البهيمة وإخراجها من المراح؟')) return;
      const ok = await guard(async () => { await dbUpdate('animals', a.id, { status: 'dead', dead_date: val('qd_date') || null, sale_date: null, sale_price: null }); });
      if (ok) { closeModal(); toast('تم تسجيل النفوق'); await loadAll(); screenAnimalDetail(String(a.id)); }
    });
  });
}
async function quickRevert(a) {
  if (!await confirm2('إعادة هذه البهيمة إلى المراح؟ ستُلغى بيانات البيع/النفوق.')) return;
  const ok = await guard(async () => { await dbUpdate('animals', a.id, { status: 'present', sale_date: null, sale_price: null, dead_date: null }); });
  if (ok) { toast('أُعيدت للمراح'); await loadAll(); screenAnimalDetail(String(a.id)); }
}

/* ===== عمليات بالجملة (قائمة) ===== */
let bulkOp = 'vaccinate';
let bulkRows = [];          // قائمة الرؤوس المُجهَّزة للإضافة الجماعية: {sex, code}
const bulkSel = new Set();
const BULK_PERM = { vaccinate: ['vaccines', 'edit'], mate: ['breeding', 'edit'], treat: ['treatments', 'edit'], sell: ['animals', 'edit'], buy: ['animals', 'add'] };
// توليد معرّفات تسلسلية: بادئة + (start, start+1, …). بلا بداية ⇒ 1..count
function genSeq(prefix, start, count) { const out = []; const s = parseInt(start, 10); for (let i = 0; i < count; i++) { const num = isNaN(s) ? (i + 1) : (s + i); out.push((String(prefix || '') + num).trim()); } return out; }
const idkindFor = (code) => /^\d+$/.test(String(code)) ? 'number' : 'tag';
// اقتراح بداية الترقيم: أكبر رقم مستخدم (ضمن نفس البادئة) + 1. فارغ إن لا يوجد.
function suggestStart(prefix) {
  const p = String(prefix || '');
  let max = 0, found = false;
  for (const a of C.animals) {
    const code = String(a.code || '');
    if (p && code.indexOf(p) !== 0) continue;
    const tail = code.slice(p.length);
    if (/^\d+$/.test(tail)) { const n = parseInt(tail, 10); if (n >= max) { max = n; found = true; } }
  }
  return found ? max + 1 : '';
}
function screenBulk(arg) {
  const ops = [
    { k: 'vaccinate', ar: '💉 تطعيم' }, { k: 'mate', ar: '❤ تلقيح' }, { k: 'treat', ar: '💊 علاج' },
    { k: 'sell', ar: '💰 بيع' }, { k: 'buy', ar: '🛒 إضافة' },
  ].filter(o => can(BULK_PERM[o.k][0], BULK_PERM[o.k][1]));
  if (!ops.length) { view().innerHTML = noPerm(); return; }
  if (arg && ops.find(o => o.k === arg)) bulkOp = arg;          // فتح مباشر على عملية محدّدة (#/bulk/buy)
  else if (!ops.find(o => o.k === bulkOp)) bulkOp = ops[0].k;
  view().innerHTML = `<div class="chips">${ops.map(o => `<span class="chip ${bulkOp === o.k ? 'active' : ''}" data-op="${o.k}">${o.ar}</span>`).join('')}</div><div id="bulkBody"></div>`;
  view().querySelectorAll('[data-op]').forEach(c => c.addEventListener('click', () => { bulkOp = c.dataset.op; bulkSel.clear(); bulkRows = []; screenBulk(); }));
  renderBulkBody();
}
function renderBulkBody() {
  const body = document.getElementById('bulkBody');
  if (bulkOp === 'buy') {
    body.innerHTML = `<div class="card"><h3>حقول مشتركة لكل الرؤوس</h3>
      ${fSelect('نوع الحلال', 'bk_type', TYPES, animalFilter || 'sheep')}
      ${fInput('رقم المراح (الحظيرة)', 'bk_pen', lastPen)}
      ${fSelect('المصدر', 'bk_source', SOURCE, 'born')}
      ${fInput('التاريخ (شراء/ميلاد)', 'bk_date', todayStr(), 'date')}
      ${fInput('اللون (اختياري)', 'bk_color', '')}
      ${fInput('سعر الرأس (اختياري)', 'bk_price', '', 'number', 'min="0" step="any" inputmode="decimal"')}</div>
     <div class="card"><h3>أضِف دفعة</h3>
      ${fSelect('الجنس', 'bk_sex', SEX, 'female')}
      ${fInput('العدد', 'bk_count', '', 'number', 'min="1" inputmode="numeric"')}
      <div class="chips"><span class="chip active" data-bm="none">⭕ بدون ترقيم</span><span class="chip" data-bm="num">🔢 بترقيم</span></div>
      <div id="bmNone" class="muted" style="font-size:.82rem">تُضاف بلا رقم — لكلٍّ رقم داخلي ثابت. رقّمها لاحقاً متى شئت (الصغار/الذكور غالباً لا تُرقَّم).</div>
      <div id="bmNum" class="hidden">
        ${fInput('بداية الترقيم', 'bk_start', '', 'number', 'inputmode="numeric"')}
        ${fInput('بادئة قبل الرقم (اختياري)', 'bk_prefix', '')}
        <div id="bk_hint" class="muted" style="font-size:.82rem;margin-top:4px"></div></div>
      <button class="btn outline" id="bk_addrows" style="margin-top:8px">➕ أضِف للقائمة</button></div>
     <div class="card"><h3>القائمة (<span id="bk_rowcount">0</span>)</h3>
      <div id="bk_rows"></div>
      <div id="bk_renumbar" style="display:none;gap:8px;align-items:center;margin-top:8px">
        ${fInput('رقّم الكل من', 'bk_renum', '', 'number', 'inputmode="numeric"')}
        <button class="btn sm outline" id="bk_renumbtn" style="white-space:nowrap;margin-top:22px">♻ رقّم الكل</button></div>
      <button class="btn" id="bk_save" style="margin-top:8px">💾 حفظ الكل</button></div>`;
    let bmode = 'none';   // الافتراضي: بدون ترقيم — لا نفرض أرقاماً
    const setHint = () => {
      const h = document.getElementById('bk_hint'); if (!h) return;
      const s = suggestStart('');
      const startEl = document.getElementById('bk_start');
      if (startEl && startEl.value.trim() === '' && s !== '') startEl.value = String(s);   // اقتراح أوّلي قابل للتعديل
      h.innerHTML = s !== '' ? `اقتراح يبدأ من ${s} — عدّله، أو عدّل رقم أي سطر في القائمة.` : 'اكتب البداية التي تريدها، ويمكنك تعديل رقم أي سطر لاحقاً.';
    };
    body.querySelectorAll('[data-bm]').forEach(c => c.addEventListener('click', () => {
      bmode = c.dataset.bm;
      body.querySelectorAll('[data-bm]').forEach(x => x.classList.toggle('active', x.dataset.bm === bmode));
      document.getElementById('bmNum').classList.toggle('hidden', bmode !== 'num');
      document.getElementById('bmNone').classList.toggle('hidden', bmode !== 'none');
      if (bmode === 'num') setHint();
    }));
    const renderRows = () => {
      document.getElementById('bk_rowcount').textContent = bulkRows.length;
      document.getElementById('bk_save').textContent = `💾 حفظ الكل (${bulkRows.length})`;
      const box = document.getElementById('bk_rows');
      box.innerHTML = bulkRows.length
        ? bulkRows.map((r, i) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 2px;border-bottom:1px solid #eee">
            <span class="muted" style="min-width:42px">${arOf(SEX, r.sex)}</span>
            <input data-rowcode="${i}" value="${esc(r.code)}" placeholder="بدون رقم — اكتبه إن شئت" inputmode="text" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px;font:inherit">
            <button class="btn sm danger" data-rmrow="${i}">✕</button></div>`).join('')
        : '<div class="muted">لم تُضف رؤوس بعد. اختر الجنس والعدد ثم «أضِف للقائمة».</div>';
      // تعديل رقم أي سطر مباشرةً (بلا إعادة رسم كي لا يفقد التركيز)
      box.querySelectorAll('[data-rowcode]').forEach(el => el.addEventListener('input', () => { const i = parseInt(el.dataset.rowcode, 10); if (bulkRows[i]) bulkRows[i].code = el.value.trim(); }));
      box.querySelectorAll('[data-rmrow]').forEach(b => b.addEventListener('click', () => { bulkRows.splice(parseInt(b.dataset.rmrow, 10), 1); renderRows(); }));
      const bar = document.getElementById('bk_renumbar'); if (bar) bar.style.display = bulkRows.length ? 'flex' : 'none';
    };
    // ♻ رقّم الكل من رقم واحد بضغطة (يغيّر أرقام جميع الرؤوس دفعة واحدة)
    document.getElementById('bk_renumbtn').addEventListener('click', () => {
      if (!bulkRows.length) return;
      const startRaw = val('bk_renum').trim();
      if (startRaw === '') { toast('اكتب رقم البداية'); return; }
      const codes = genSeq(val('bk_prefix'), startRaw, bulkRows.length);
      bulkRows.forEach((r, i) => { r.code = codes[i]; });
      renderRows();
      toast('أُعيد ترقيم الكل');
    });
    document.getElementById('bk_addrows').addEventListener('click', () => {
      const sex = val('bk_sex');
      const n = parseInt(val('bk_count'), 10) || 0; if (n <= 0) { toast('أدخل العدد'); return; }
      if (bmode === 'num') {
        const startRaw = val('bk_start').trim();
        if (startRaw === '') { toast('اكتب بداية الترقيم، أو اختر «بدون ترقيم»'); return; }   // لا نفرض رقماً
        genSeq(val('bk_prefix'), startRaw, n).forEach(code => bulkRows.push({ sex, code }));
        const last = parseInt(startRaw, 10); if (!isNaN(last)) { const el = document.getElementById('bk_start'); if (el) el.value = String(last + n); }  // قدّم البداية للدفعة التالية
      } else {
        for (let i = 0; i < n; i++) bulkRows.push({ sex, code: '' });   // بدون ترقيم
      }
      document.getElementById('bk_count').value = '';
      renderRows();
    });
    document.getElementById('bk_save').addEventListener('click', async () => {
      if (!bulkRows.length) { toast('أضِف رؤوساً للقائمة أولاً'); return; }
      document.querySelectorAll('[data-rowcode]').forEach(el => { const i = parseInt(el.dataset.rowcode, 10); if (bulkRows[i]) bulkRows[i].code = el.value.trim(); });   // التقط أي تعديل
      const existing = new Set(C.animals.map(a => a.code || ''));
      const dups = bulkRows.filter(r => r.code && existing.has(r.code)).map(r => r.code);
      if (dups.length && !await confirm2(`${dups.length} معرّف مكرّر (${dups.slice(0, 4).join('، ')}${dups.length > 4 ? '…' : ''}). متابعة؟`)) return;
      if (!await confirm2(`حفظ ${bulkRows.length} رأساً؟`)) return;
      const pen = val('bk_pen').trim(), src = val('bk_source'), datev = val('bk_date') || null;
      const base = { type: val('bk_type'), pen, source: src, status: 'present', color: val('bk_color').trim(),
        birth: src === 'born' ? datev : null, buy_date: src === 'purchased' ? datev : null,
        buy_price: val('bk_price') !== '' ? parseFloat(val('bk_price')) : null };
      const rows = bulkRows.slice();
      const ok = await guard(async () => { for (const r of rows) await dbInsert('animals', { ...base, sex: r.sex, idkind: idkindFor(r.code), code: r.code, name: '', mother_id: null, father_name: '', notes: '' }); });
      if (ok) { bulkRows.length = 0; lastPen = pen; try { localStorage.setItem('mrahi_last_pen', pen); } catch (e) {} toast(`تم حفظ ${rows.length} رأساً — اضغط أي بهيمة لتعديلها`); bulkSel.clear(); await loadAll(); setHash('#/animals'); }
    });
    renderRows();
    return;
  }
  let form = '';
  if (bulkOp === 'vaccinate') {
    if (!C.vaccineTypes.length) { body.innerHTML = '<div class="center-empty">عرّف أنواع التطعيمات أولاً من «أنواع التطعيمات».</div>'; return; }
    const typeOpts = C.vaccineTypes.map(v => ({ k: String(v.id), ar: `${v.name} (${vtWithdrawDays(v)}ي)` }));
    form = `${fSelect('التطعيم', 'bk_type', typeOpts, '', '— اختر —')}${fInput('تاريخ التطعيم', 'bk_date', todayStr(), 'date')}${fInput('موعد الجرعة القادمة (اختياري)', 'bk_next', '', 'date')}${fTextarea('ملاحظات', 'bk_notes', '')}`;
  } else if (bulkOp === 'mate') {
    form = `${fInput('رقم الفحل', 'bk_sirecode', '')}${fInput('اسم الفحل', 'bk_sirename', '')}${fInput('تاريخ التلقيح', 'bk_date', todayStr(), 'date')}<div class="check"><input type="checkbox" id="bk_preg" checked><label for="bk_preg" style="margin:0">بدء متابعة الحمل لكل بهيمة</label></div>${fTextarea('ملاحظات', 'bk_notes', '')}`;
  } else if (bulkOp === 'treat') {
    form = `${fInput('نوع العلاج', 'bk_ttype', '')}${fInput('اسم العلاج', 'bk_med', '')}${fInput('مدة التحريم (أيام)', 'bk_days', '', 'number', 'min="0"')}${fInput('تاريخ العلاج', 'bk_date', todayStr(), 'date')}${fInput('الإجراء', 'bk_action', '')}${fTextarea('ملاحظات', 'bk_notes', '')}`;
  } else if (bulkOp === 'sell') {
    form = `${fInput('تاريخ البيع', 'bk_date', todayStr(), 'date')}${fInput('سعر البيع للرأس (اختياري)', 'bk_price', '', 'number', 'min="0" step="any" inputmode="decimal"')}`;
  }
  let cands = C.animals.filter(a => a.status === 'present');
  if (bulkOp === 'mate') cands = cands.filter(a => a.sex === 'female');
  cands.sort((a, b) => b.id - a.id);
  const listHtml = cands.length ? cands.map(a => `<label class="bulk-row"><input type="checkbox" data-sel="${a.id}" ${bulkSel.has(a.id) ? 'checked' : ''}><span>${display(a)} <span class="muted">${arOf(TYPES, a.type)}${a.pen ? ' • ' + esc(a.pen) : ''}</span></span></label>`).join('') : '<div class="muted">لا توجد بهائم مطابقة.</div>';
  body.innerHTML = `<div class="card"><h3>بيانات العملية</h3>${form}</div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">اختر البهائم</h3>${cands.length ? '<button class="btn sm outline" id="bk_all">تحديد/إلغاء الكل</button>' : ''}</div>
      ${cands.length ? `${fInput('🔍 بحث (رقم/مراح)', 'bk_search', '')}` : ''}
      <div class="muted" id="bk_count" style="margin:4px 0">المحدد: ${bulkSel.size}</div><div id="bk_list">${listHtml}</div></div>
    <button class="btn" id="bk_apply">تطبيق على المحدد (${bulkSel.size})</button>`;
  const refresh = () => { document.getElementById('bk_count').textContent = 'المحدد: ' + bulkSel.size; document.getElementById('bk_apply').textContent = 'تطبيق على المحدد (' + bulkSel.size + ')'; };
  { const se = document.getElementById('bk_search'); if (se) se.addEventListener('input', () => { const t = se.value.trim().toLowerCase(); body.querySelectorAll('#bk_list .bulk-row').forEach(r => { r.style.display = (!t || r.textContent.toLowerCase().includes(t)) ? '' : 'none'; }); }); }
  body.querySelectorAll('[data-sel]').forEach(cb => cb.addEventListener('change', () => { const id = parseInt(cb.dataset.sel, 10); cb.checked ? bulkSel.add(id) : bulkSel.delete(id); refresh(); }));
  const allBtn = document.getElementById('bk_all'); if (allBtn) allBtn.addEventListener('click', () => { const all = cands.every(a => bulkSel.has(a.id)); cands.forEach(a => all ? bulkSel.delete(a.id) : bulkSel.add(a.id)); renderBulkBody(); });
  document.getElementById('bk_apply').addEventListener('click', bulkApply);
}
async function bulkApply() {
  const ids = [...bulkSel];
  if (!ids.length) { toast('اختر بهيمة واحدة على الأقل'); return; }
  const d = val('bk_date');
  if (!d) { toast('أدخل التاريخ'); return; }
  let vt = null;
  if (bulkOp === 'vaccinate') { vt = C.vaccineTypes.find(x => x.id === parseInt(val('bk_type'), 10)); if (!vt) { toast('اختر التطعيم'); return; } }
  if (!await confirm2(`تطبيق العملية على ${ids.length} بهيمة؟`)) return;
  const notes = document.getElementById('bk_notes') ? val('bk_notes').trim() : '';
  const ok = await guard(async () => {
    for (const id of ids) {
      const a = animalById(id); if (!a) continue;
      if (bulkOp === 'vaccinate') await dbInsert('vaccinations', { animal_id: id, type_id: vt.id, date: d, withdrawal_end: addDays(d, vtWithdrawDays(vt)), next_due: val('bk_next') || null, notes });
      else if (bulkOp === 'mate') { await dbInsert('matings', { animal_id: id, date: d, sire_code: val('bk_sirecode').trim(), sire_name: val('bk_sirename').trim(), notes }); if (document.getElementById('bk_preg').checked) { const g = gestOf(a.type); await dbInsert('pregnancies', { animal_id: id, mating_date: d, gest: g, expected: addDays(d, g), status: 'monitoring', notes }); } }
      else if (bulkOp === 'treat') { const days = num('bk_days'); await dbInsert('treatments', { animal_id: id, treatment_type: val('bk_ttype').trim(), med_name: val('bk_med').trim(), withdrawal_days: days, date: d, withdrawal_end: addDays(d, days), action: val('bk_action').trim(), notes }); }
      else if (bulkOp === 'sell') { const price = val('bk_price') !== '' ? parseFloat(val('bk_price')) : null; await dbUpdate('animals', id, { status: 'sold', sale_date: d, sale_price: price, dead_date: null }); }
    }
  });
  if (ok) { toast(`تم تطبيق العملية على ${ids.length} بهيمة`); bulkSel.clear(); await loadAll(); screenBulk(); }
}

/* ===== المزيد ===== */
const moreOpen = new Set(['herd']);   // التصنيفات المفتوحة (الشائع «الحلال» مفتوح افتراضياً)
function screenMore() {
  const owner = me && me.account_type === 'owner';
  const I = (cond, label, hash) => cond ? [label, hash] : null;
  const np = sharesIn.filter(s => s.status === 'pending').length;
  const cats = [
    { key: 'herd', title: '🐑 الحلال والمتابعة', items: [
      I(can('animals', 'view'), '🔍 تفقد الحلال وإحصائيات', '#/inspect'),
      I(can('animals', 'add'), '📋 إضافة جماعية (دفعة)', '#/bulk/buy'),
      I(can('breeding', 'view'), '🤰 الحمل والمتابعة', '#/pregnancies'),
    ].filter(Boolean) },
    { key: 'health', title: '💉 الصحة (تطعيم وعلاج)', items: [
      I(can('vaccines', 'edit'), '💉 إعطاء تطعيم', '#/vaccinate/0'),
      I(can('vaccines', 'view'), '💉 أنواع التطعيمات', '#/vaccine-types'),
      I(can('treatments', 'edit'), '💊 إضافة علاج', '#/treat/0'),
      I(can('treatments', 'view'), '💊 أنواع العلاج', '#/treatment-types'),
    ].filter(Boolean) },
    { key: 'ops', title: '⚙️ عمليات وبيانات', items: [
      I(can('animals', 'add') || can('animals', 'edit') || can('vaccines', 'edit') || can('treatments', 'edit') || can('breeding', 'edit'), '⚙️ عمليات جماعية (تطعيم/علاج/بيع…)', '#/bulk'),
      I(can('backup', 'view'), '💾 النسخ الاحتياطي', '#/backup'),
      I(!window.MRAH_LOCAL && (can('animals', 'view') || sharesIn.length), `🤝 مشاركة الحلال${np ? ` (${np} دعوة)` : ''}`, '#/shares'),
    ].filter(Boolean) },
    { key: 'guides', title: '📖 الأدلة', items: [
      I(true, '📘 دليل الاستخدام', '#/guide'),
    ].filter(Boolean) },
    { key: 'admin', title: '🛡️ الإدارة', items: [
      I(isAdmin(), '🐑 أنواع الحلال (مدة الحمل/البلوغ)', '#/types'),
      I(isAdmin(), '🗑️ سلة المحذوفات', '#/trash'),
      I(!window.MRAH_LOCAL && isAdmin(), '👥 المستخدمون والصلاحيات', '#/members'),
      I(!window.MRAH_LOCAL && (isAdmin() || isAnyForumMod()), '⚙️ إعدادات المنتدى', '#/forum-admin'),
      I(isSys(), '💡 النصائح والمعلومات', '#/tips'),
      I(window.MRAH_APK, `🔧 وضع قاعدة البيانات (${window.MRAH_LOCAL ? 'محلي' : 'مشترك'}) — تغيير`, '__switch'),
    ].filter(Boolean) },
    { key: 'app', title: '📱 التطبيق', items: [
      I(window.MRAH_APK, '🔄 تحقق من وجود تحديث', '__checkupdate'),
      I(window.MRAH_APK && window.MrahiLicense && window.MrahiLicense.state().state === 'active', '🔐 إلغاء تفعيل هذا الجهاز', '__deactivate'),
    ].filter(Boolean) },
  ].filter(c => c.items.length);

  // عند توفّر تحديث: بطاقة بارزة دائمة أعلى الصفحة (تسهيل)
  const upd = window.mrahiUpdateInfo;
  const topUpdate = (window.MRAH_APK && upd)
    ? `<div class="card click hl" data-go="__checkupdate"><div class="li-title">🔄 يوجد تحديث جديد (${esc(upd.version)}) — نزّله الآن</div><div class="li-sub">يفتح صفحة التنزيل لتثبيت النسخة الجديدة (بياناتك محفوظة)</div></div>`
    : '';

  const ver = window.MRAH_VERSION ? ` • نسخة ${window.MRAH_VERSION}` : '';
  let licLine = '';
  if (window.MRAH_APK && window.MrahiLicense) { const s = window.MrahiLicense.state(); if (s.state === 'active') licLine = `<div>🔐 الترخيص: ${s.permanent ? 'دائم' : 'متبقّ ' + s.daysLeft + ' يوم'}</div>`; }
  const footer = `<div class="muted" style="text-align:center;margin-top:18px;font-size:.85rem">
    <div style="font-weight:700;color:var(--green)">✨ التسهيل · الحفظ · التخطيط</div>
    ${window.MRAH_LOCAL ? 'مراح — تطبيق محلّي • بياناتك على جهازك' : 'مراح — مزرعة مشتركة'}${ver}${licLine}</div>`;

  view().innerHTML = topUpdate + cats.map(c => {
    const open = moreOpen.has(c.key);
    return `<div class="acc-head card click" data-cat="${c.key}" style="display:flex;align-items:center;justify-content:space-between">
        <span class="li-title" style="margin:0">${c.title}</span><span style="color:var(--muted);font-size:1.1rem">${open ? '▾' : '▸'}</span></div>`
      + (open ? `<div style="margin:0 8px 8px">${c.items.map(([l, h]) => `<div class="card click" data-go="${h}" style="margin:6px 0"><div class="li-title">${l}</div></div>`).join('')}</div>` : '');
  }).join('') + footer;

  view().querySelectorAll('[data-cat]').forEach(h => h.addEventListener('click', () => { const k = h.dataset.cat; moreOpen.has(k) ? moreOpen.delete(k) : moreOpen.add(k); screenMore(); }));
  view().querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => {
    const h = c.dataset.go;
    if (h === '__switch') return switchBackend();
    if (h === '__checkupdate') return (typeof window.mrahiCheckUpdate === 'function') ? window.mrahiCheckUpdate() : toast('التحديث متاح في تطبيق الجوال');
    if (h === '__deactivate') return (async () => { if (await confirm2('إلغاء تفعيل هذا الجهاز؟ سيُعاد قفل التطبيق حتى تُدخل رمزاً جديداً. (بياناتك لا تُحذف)')) { window.MrahiLicense.deactivate(); location.reload(); } })();
    setHash(h);
  }));
}

/* ===== دليل الاستخدام (كتاب ثلاثي الأبعاد) ===== */
function guideBooks() {
  // الكتب المتاحة حسب الصلاحيات: الجميع يرى دليل الاستخدام العام،
  // وأصحاب الحلال يرون دليلهم، والمدير يرى دليل الإدارة أيضاً.
  const books = ['visitor'];
  if (can('animals', 'view') || (me && me.account_type === 'owner')) books.push('owner');
  if (isAdmin()) books.push('admin');
  return books;
}
function screenGuide(arg) {
  if (!window.MrahiGuide) { view().innerHTML = '<div class="center-empty">تعذّر تحميل الدليل.</div>'; return; }
  const books = guideBooks();
  // أيقونة (i) في الهيدر تفتح الدليل العام مباشرةً؛ والمدخلات في «المزيد» تفتح كتاب الدور
  const wanted = (arg && books.includes(arg)) ? arg : 'visitor';
  window.MrahiGuide.render(view(), wanted, {
    isAdmin: isAdmin(),
    accountType: (me && me.account_type) || 'owner',
    books: books,
  });
}

/* ===== مشاركة الحلال (دعوة وقبول متبادل) ===== */
const shareStatusAr = (s) => ({ pending: 'بانتظار القبول', accepted: 'مقبولة', declined: 'مرفوضة', revoked: 'مسحوبة' }[s] || s);
async function shareUpdate(id, obj) { const ok = await guard(async () => { const { error } = await sb.from('mrahi_herd_shares').update(obj).eq('id', id); if (error) throw error; }); if (ok) { await loadAll(); screenShares(); } }
async function shareRemove(id) { if (!await confirm2('إزالة هذه المشاركة؟')) return; const ok = await guard(async () => { const { error } = await sb.from('mrahi_herd_shares').delete().eq('id', id); if (error) throw error; }); if (ok) { toast('تمت الإزالة'); await loadAll(); screenShares(); } }

function screenShares() {
  const owner = can('animals', 'view');               // أملك حلالاً أشاركه؟
  const inPending = sharesIn.filter(s => s.status === 'pending');
  const inAccepted = sharesIn.filter(s => s.status === 'accepted');
  const out = sharesOut.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  const inviteCard = owner ? `
    <div class="card"><h3>🤝 دعوة عضو لمشاهدة حلالي</h3>
      <div class="muted" style="font-size:.85rem;margin-bottom:8px">أدخل رقم جوال العضو أو اسم المستخدم الخاص به. سيصله طلب، وبقبوله يطّلع على حلالك <b>للعرض فقط</b> دون تعديل. يمكنك سحب المشاركة في أي وقت.</div>
      <input id="sh_id" placeholder="رقم الجوال أو اسم المستخدم" inputmode="text" autocomplete="off">
      <button class="btn" id="sh_send" style="margin-top:8px">إرسال الدعوة</button>
      <div class="auth-msg" id="sh_msg"></div>
    </div>
    <div class="card"><h3>حلالي المُشارَك (${out.length})</h3>
      ${out.length ? out.map(s => `<div class="share-row">
          <div><div class="li-title sm">${esc(s.member_name || 'عضو')}</div>
            <div class="li-sub"><span class="badge ${s.status === 'accepted' ? '' : 'off'}">${shareStatusAr(s.status)}</span></div></div>
          <div class="btn-row">
            ${s.status === 'accepted' ? `<button class="btn sm danger" data-revoke="${s.id}">سحب الوصول</button>`
              : s.status === 'pending' ? `<button class="btn sm outline" data-rm="${s.id}">إلغاء الدعوة</button>`
              : `<button class="btn sm outline" data-rm="${s.id}">حذف</button>`}
          </div></div>`).join('') : '<div class="muted">لم تُشارك حلالك مع أحد بعد.</div>'}
    </div>` : '';

  const incomingCard = `
    <div class="card"><h3>📨 حلال مُشارَك معي</h3>
      ${inPending.length ? `<div class="muted" style="font-size:.85rem;margin-bottom:6px">دعوات بانتظار ردّك:</div>` + inPending.map(s => `<div class="share-row">
          <div><div class="li-title sm">${esc(s.owner_name || 'عضو')}</div>
            <div class="li-sub">يدعوك لمشاهدة حلاله (عرض فقط)</div></div>
          <div class="btn-row">
            <button class="btn sm" data-accept="${s.id}">قبول</button>
            <button class="btn sm danger" data-decline="${s.id}">رفض</button>
          </div></div>`).join('') : ''}
      ${inAccepted.length ? `<div class="muted" style="font-size:.85rem;margin:8px 0 6px">حلال يمكنك مشاهدته:</div>` + inAccepted.map(s => `<div class="share-row">
          <div><div class="li-title sm">${esc(s.owner_name || 'عضو')}</div>
            <div class="li-sub">عرض فقط</div></div>
          <div class="btn-row">
            <button class="btn sm" data-view="${s.owner_id}">👁 عرض الحلال</button>
            <button class="btn sm outline" data-rm="${s.id}">إزالة</button>
          </div></div>`).join('') : ''}
      ${(!inPending.length && !inAccepted.length) ? '<div class="muted">لا توجد دعوات أو حلال مُشارَك معك.</div>' : ''}
    </div>`;

  view().innerHTML = inviteCard + incomingCard;

  const send = document.getElementById('sh_send');
  if (send) send.addEventListener('click', async () => {
    const msg = document.getElementById('sh_msg'); msg.className = 'auth-msg';
    const id = document.getElementById('sh_id').value.trim();
    if (!id) { msg.classList.add('err'); msg.textContent = 'أدخل رقم الجوال أو اسم المستخدم'; return; }
    send.disabled = true;
    try {
      const { data, error } = await sb.rpc('mrahi_invite_to_herd', { p_identifier: id });
      if (error) throw error;
      if (data && data.ok) { msg.classList.add('ok'); msg.textContent = 'تم إرسال الدعوة بنجاح'; document.getElementById('sh_id').value = ''; await loadAll(); setTimeout(screenShares, 700); }
      else {
        const e = data && data.err;
        msg.classList.add('err');
        msg.textContent = e === 'notfound' ? 'لا يوجد عضو بهذا الرقم أو الاسم'
          : e === 'self' ? 'لا يمكنك دعوة نفسك'
          : e === 'empty' ? 'أدخل رقم الجوال أو اسم المستخدم'
          : 'تعذّر إرسال الدعوة';
      }
    } catch (e) { const msg2 = document.getElementById('sh_msg'); msg2.classList.add('err'); msg2.textContent = 'تعذّر إرسال الدعوة: ' + (e.message || ''); }
    finally { const s = document.getElementById('sh_send'); if (s) s.disabled = false; }
  });

  view().querySelectorAll('[data-accept]').forEach(b => b.addEventListener('click', () => shareUpdate(b.dataset.accept, { status: 'accepted', responded_at: new Date().toISOString() })));
  view().querySelectorAll('[data-decline]').forEach(b => b.addEventListener('click', () => shareUpdate(b.dataset.decline, { status: 'declined', responded_at: new Date().toISOString() })));
  view().querySelectorAll('[data-revoke]').forEach(b => b.addEventListener('click', async () => { if (await confirm2('سحب وصول هذا العضو إلى حلالك؟')) shareUpdate(b.dataset.revoke, { status: 'revoked' }); }));
  view().querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => shareRemove(b.dataset.rm)));
  view().querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setHash('#/shared-herd/' + b.dataset.view)));
}

/* ===== عرض حلال مُشارَك (عرض فقط) ===== */
function screenSharedHerd() {
  const ownerId = parseHash().arg;
  const share = sharesIn.find(s => s.owner_id === ownerId && s.status === 'accepted');
  if (!share) { view().innerHTML = `<div class="center-empty">لا تملك صلاحية مشاهدة هذا الحلال.</div>`; return; }
  const ownerName = share.owner_name || 'عضو';
  const ttl = document.getElementById('screenTitle'); if (ttl) ttl.textContent = 'حلال ' + ownerName;
  const animals = (C._animals || []).filter(a => a.owner_id === ownerId);
  const present = animals.filter(a => a.status === 'present');
  view().innerHTML = `
    <div class="ro-banner">👁 عرض فقط — حلال ${esc(ownerName)}</div>
    <div class="stats">
      <div class="stat green"><div class="n">${present.length}</div><div class="l">في المراح</div></div>
      <div class="stat blue"><div class="n">${animals.length}</div><div class="l">الإجمالي</div></div>
    </div>
    <div class="search"><input id="shq" placeholder="ابحث برقم/اسم/مراح"></div>
    <div class="card"><h3>الحلال (${present.length})</h3><div id="shlist"></div></div>`;
  const listEl = document.getElementById('shlist');
  const drawList = (term) => {
    let arr = present;
    if (term) { const t = term.toLowerCase(); arr = present.filter(a => [a.code, a.name, a.pen].some(x => (x || '').toLowerCase().includes(t))); }
    arr = arr.slice().sort((a, b) => b.id - a.id);
    listEl.innerHTML = arr.length ? arr.map(a => `<div class="card click" data-sa="${a.id}"><div class="li-title">${display(a)}</div><div class="li-sub">${arOf(TYPES, a.type)} • ${arOf(SEX, a.sex)}${a.pen ? ' • المراح: ' + esc(a.pen) : ''}</div></div>`).join('') : noItem();
    listEl.querySelectorAll('[data-sa]').forEach(c => c.addEventListener('click', () => sharedAnimalModal(parseInt(c.dataset.sa, 10), ownerId)));
  };
  drawList('');
  const q = document.getElementById('shq'); if (q) q.addEventListener('input', () => drawList(q.value.trim()));
}

// بطاقة بهيمة من حلال مُشارَك — سجلّ كامل للعرض فقط
function sharedAnimalModal(id, ownerId) {
  const a = (C._animals || []).find(x => x.id === id);
  if (!a) return;
  const f = (arr) => (arr || []).filter(r => r.owner_id === ownerId && r.animal_id === id);
  const mts = f(C._matings).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const prg = f(C._pregnancies);
  const vac = f(C._vaccinations).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const trt = f(C._treatments).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const vtName = (tid) => { const v = C.vaccineTypes.find(x => x.id === tid); return v ? esc(v.name) : 'تطعيم'; };
  const sec = (title, html) => `<div class="card" style="margin:6px 0"><h3>${title}</h3>${html}</div>`;
  openModal('سجل ' + (a.code || 'البهيمة'), `
    <div class="muted" style="margin-bottom:8px">${arOf(TYPES, a.type)} • ${arOf(SEX, a.sex)}${a.birth ? ' • مواليد ' + fmtDate(a.birth) : ''}${a.color ? ' • ' + esc(a.color) : ''}</div>
    ${sec('🤰 التلقيح والحمل', (mts.length || prg.length)
      ? (matingRows(mts) + prg.map(p => row('حمل (' + arOf(PREG, p.status) + ')', p.expected ? 'متوقّع ' + fmtDate(p.expected) : '—')).join(''))
      : noItem())}
    ${sec('💉 التطعيمات', vac.length ? vac.map(v => row(fmtDate(v.date) + ' — ' + vtName(v.type_id), v.withdrawal_end ? 'تحريم حتى ' + fmtDate(v.withdrawal_end) : '—')).join('') : noItem())}
    ${sec('💊 العلاجات', trt.length ? trt.map(t => row(esc(t.med_name) + ' (' + fmtDate(t.date) + ')', t.withdrawal_end ? 'تحريم حتى ' + fmtDate(t.withdrawal_end) : '—')).join('') : noItem())}
  `);
}
function matingRows(mts) { return mts.map(m => row('تلقيح ' + fmtDate(m.date), 'الفحل: ' + (esc(m.sire_name) || esc(m.sire_code) || '—'))).join(''); }

/* ===== النسخ الاحتياطي (تصدير) ===== */
function snapshot() {
  return {
    exportedAt: new Date().toISOString(),
    animals: C.animals, matings: C.matings, pregnancies: C.pregnancies, births: C.births,
    vaccineTypes: C.vaccineTypes, vaccinations: C.vaccinations, treatments: C.treatments,
  };
}
function screenBackup() {
  if (!can('backup', 'view')) { view().innerHTML = noPerm(); return; }
  const counts = `${C.animals.length} بهيمة • ${C.births.length} ولادة • ${C.vaccinations.length} تطعيم • ${C.treatments.length} علاج`;
  const mine = C.backups.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  view().innerHTML = `
    <div class="card"><h3>سجل نسخي الاحتياطية</h3>
      <div class="muted">${counts}</div>
      <button class="btn" id="bk_save">➕ حفظ نسخة الآن (في حسابي)</button>
      <div class="muted" style="font-size:.82rem;margin-top:6px">نسخك خاصة بك — لا يراها بقية المستخدمين.</div>
    </div>
    <div class="card"><h3>نسخي المحفوظة (${mine.length})</h3>
      ${mine.length ? mine.map(b => `<div class="card" style="margin:6px 0">
          <div class="li-title">${esc(b.label || 'نسخة')}</div>
          <div class="li-sub">${fmtDateTime(b.created_at)} • ${b.animals_count || 0} بهيمة</div>
          <div class="btn-row" style="margin-top:6px">
            <button class="btn sm" data-restore="${b.id}">استعادة</button>
            <button class="btn sm outline" data-dl="${b.id}">تنزيل JSON</button>
            <button class="btn sm danger" data-bdel="${b.id}">حذف</button>
          </div></div>`).join('') : '<div class="muted">لا توجد نسخ بعد.</div>'}
    </div>
    <div class="card"><h3>تصدير خارجي</h3>
      <div class="muted">تنزيل نسخة على جهازك أو مشاركتها.</div>
      <button class="btn outline" id="bk_json">📤 تنزيل JSON</button>
      <button class="btn outline" id="bk_csv">📊 تصدير Excel (CSV)</button>
    </div>`;

  document.getElementById('bk_save').addEventListener('click', async () => {
    const label = prompt('اسم النسخة (اختياري):', 'نسخة ' + fmtDateTime(new Date().toISOString())) ?? '';
    const snap = snapshot();
    const ok = await guard(async () => {
      await sb.from('mrahi_backups').insert({ label: label.trim(), payload: snap, animals_count: C.animals.length });
    });
    if (ok) { toast('تم حفظ النسخة في حسابك'); await loadAll(); screenBackup(); }
  });
  view().querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', () => restoreBackup(parseInt(b.dataset.restore, 10))));
  view().querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => {
    const bk = C.backups.find(x => x.id === parseInt(b.dataset.dl, 10));
    if (bk) shareOrDownload('mrahi_backup_' + stamp() + '.json', JSON.stringify(bk.payload, null, 2), 'application/json');
  }));
  view().querySelectorAll('[data-bdel]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('حذف هذه النسخة الاحتياطية؟')) return;
    const ok = await guard(async () => { await sb.from('mrahi_backups').delete().eq('id', parseInt(b.dataset.bdel, 10)); });
    if (ok) { toast('تم الحذف'); await loadAll(); screenBackup(); }
  }));
  document.getElementById('bk_json').addEventListener('click', exportJson);
  document.getElementById('bk_csv').addEventListener('click', exportCsv);
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ar', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
/* استعادة نسخة: تتطلب صلاحيات تعديل على الأقسام لإعادة الكتابة */
async function restoreBackup(id) {
  const bk = C.backups.find(x => x.id === id);
  if (!bk || !bk.payload) { toast('النسخة غير موجودة'); return; }
  if (!isAdmin()) { toast('الاستعادة للمدير فقط (تستبدل بيانات المزرعة)'); return; }
  if (!await confirm2('استعادة هذه النسخة ستستبدل بيانات المزرعة الحالية بالكامل. متابعة؟')) return;
  const p = bk.payload;
  const ok = await guard(async () => {
    // حذف الحالي بترتيب يحترم المفاتيح الأجنبية
    for (const t of ['mrahi_treatments', 'mrahi_vaccinations', 'mrahi_births', 'mrahi_pregnancies', 'mrahi_matings', 'mrahi_vaccine_types']) {
      await sb.from(t).delete().neq('id', -1);
    }
    await sb.from('mrahi_animals').delete().neq('id', -1);
    // إعادة الإدخال مع تعيين معرفات جديدة وربط الأمهات/المواليد
    const idMap = {};
    const ordered = (p.animals || []).slice().sort((a, b) => a.id - b.id);
    for (const a of ordered) {
      const ins = await dbInsert('animals', stripIds(a, ['id', 'mother_id', 'father_id']));
      idMap[a.id] = ins.id;
    }
    // تحديث الروابط الأبوية بعد توفّر كل المعرفات
    for (const a of ordered) {
      const patch = {};
      if (a.mother_id && idMap[a.mother_id]) patch.mother_id = idMap[a.mother_id];
      if (a.father_id && idMap[a.father_id]) patch.father_id = idMap[a.father_id];
      if (Object.keys(patch).length) await dbUpdate('animals', idMap[a.id], patch);
    }
    const vtMap = {};
    for (const v of (p.vaccineTypes || [])) { const ins = await dbInsert('vaccineTypes', stripIds(v, ['id'])); vtMap[v.id] = ins.id; }
    for (const m of (p.matings || [])) await dbInsert('matings', remap(stripIds(m, ['id']), { animal_id: idMap }));
    for (const pr of (p.pregnancies || [])) await dbInsert('pregnancies', remap(stripIds(pr, ['id']), { animal_id: idMap }));
    for (const bt of (p.births || [])) await dbInsert('births', remap(stripIds(bt, ['id']), { mother_id: idMap, offspring_id: idMap }));
    for (const vc of (p.vaccinations || [])) await dbInsert('vaccinations', remap(stripIds(vc, ['id']), { animal_id: idMap, type_id: vtMap }));
    for (const tr of (p.treatments || [])) await dbInsert('treatments', remap(stripIds(tr, ['id']), { animal_id: idMap }));
  });
  if (ok) { toast('تمت الاستعادة'); await loadAll(); setHash('#/home'); render(); }
}
function stripIds(obj, keys) {
  const o = Object.assign({}, obj);
  keys.forEach(k => delete o[k]);
  delete o.created_at; delete o.created_by;
  return o;
}
function remap(obj, maps) {
  const o = Object.assign({}, obj);
  for (const key in maps) {
    if (o[key] != null) o[key] = maps[key][o[key]] || null; // أعِد التعيين أو صفّر المرجع المفقود
  }
  return o;
}
function stamp() { return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'); }
async function shareOrDownload(filename, text, mime) {
  const blob = new Blob([text], { type: mime }); const file = new File([blob], filename, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'نسخة احتياطية — مراح' }); return; } catch (e) {} }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('تم تنزيل الملف');
}
function exportJson() { const data = { exportedAt: new Date().toISOString(), animals: C.animals, matings: C.matings, pregnancies: C.pregnancies, births: C.births, vaccineTypes: C.vaccineTypes, vaccinations: C.vaccinations, treatments: C.treatments }; shareOrDownload('mrahi_backup_' + stamp() + '.json', JSON.stringify(data, null, 2), 'application/json'); }
function exportCsv() {
  const cell = s => { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ['النوع', 'المراح', 'المعرف', 'نوع المعرف', 'الاسم', 'الجنس', 'المصدر', 'تاريخ الميلاد', 'اللون', 'الحالة', 'تاريخ البيع', 'سعر البيع', 'تاريخ النفوق', 'رقم الأم', 'اسم الأب', 'ملاحظات'];
  const rows = C.animals.map(a => [arOf(TYPES, a.type), a.pen, a.code, arOf(IDKIND, a.idkind), a.name, arOf(SEX, a.sex), arOf(SOURCE, a.source || 'purchased'), a.birth, a.color, arOf(STATUS, a.status), a.sale_date || '', a.sale_price != null ? a.sale_price : '', a.dead_date || '', a.mother_id ? (animalById(a.mother_id) || {}).code || '' : '', a.father_name, a.notes].map(cell).join(','));
  shareOrDownload('mrahi_animals_' + stamp() + '.csv', '﻿' + head.join(',') + '\n' + rows.join('\n'), 'text/csv');
}

/* ===== المستخدمون والصلاحيات (للمدير) ===== */
function screenMembers() {
  if (!isAdmin()) { view().innerHTML = noPerm(); return; }
  const list = C.members.slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  view().innerHTML = `
    <div class="card">
      <div class="li-title">🔐 تسجيل الحسابات الجديدة</div>
      <div class="li-sub">${signupOpen ? 'مفتوح — يمكن لأي شخص إنشاء حساب (ثم تفعّله أنت).' : 'مغلق — لا يمكن إنشاء حسابات جديدة الآن.'}</div>
      <button class="btn sm ${signupOpen ? 'danger' : ''}" id="signupToggle" style="margin-top:6px">${signupOpen ? '🔒 إغلاق التسجيل' : '🔓 فتح التسجيل'}</button>
    </div>
    <button class="btn" id="addUser" style="margin-bottom:10px">➕ إضافة مستخدم جديد</button>
    <div class="muted" style="margin-bottom:8px">فعّل المستخدمين وحدّد صلاحياتهم. يمكنك إضافة مستخدم بنفسك، أو يسجّل هو ثم يظهر هنا بانتظار التفعيل.</div>` +
    list.map(m => memberCard(m)).join('');
  view().querySelector('#addUser').addEventListener('click', adminAddUser);
  const tg = view().querySelector('#signupToggle');
  if (tg) tg.addEventListener('click', async () => {
    const ok = await guard(async () => {
      const { error } = await sb.from('mrahi_settings').upsert({ key: 'signup_open', value: !signupOpen, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    });
    if (ok) { signupOpen = !signupOpen; toast(signupOpen ? 'فُتح التسجيل' : 'أُغلق التسجيل'); screenMembers(); }
  });
  list.forEach(m => bindMemberCard(m));
}
function memberCard(m) {
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div><div class="li-title">${esc(m.full_name || '—')}</div>
        <div class="li-sub"><span class="badge ${m.role === 'admin' ? 'role' : ''}">${m.role === 'admin' ? 'مدير المراح' : (m.account_type === 'visitor' ? '👤 زائر' : '🐑 صاحب حلال')}</span>
        ${m.is_sysadmin ? '<span class="badge role">مدير النظام</span>' : ''}
        <span class="badge ${m.is_active ? '' : 'off'}">${m.is_active ? 'مفعّل' : 'موقوف'}</span>
        ${m.user_id === me.user_id ? '<span class="badge">أنت</span>' : ''}</div>
        ${(m.phone || m.username) ? `<div class="li-sub">${m.phone ? '📱 ' + esc(m.phone) : ''}${m.phone && m.username ? ' • ' : ''}${m.username ? '@' + esc(m.username) : ''}</div>` : '<div class="li-sub muted">لا توجد بيانات اتصال</div>'}</div>
    </div>
    <div class="btn-row" style="margin-top:8px">
      <button class="btn sm ${m.is_active ? 'danger' : ''}" data-toggle="${m.user_id}" ${m.user_id === me.user_id ? 'disabled' : ''}>${m.is_active ? 'إيقاف' : 'تفعيل'}</button>
      <button class="btn sm outline" data-role="${m.user_id}" ${m.user_id === me.user_id ? 'disabled' : ''}>${m.role === 'admin' ? 'إنزال لمستخدم' : 'ترقية لمدير'}</button>
      ${isSys() ? `<button class="btn sm outline" data-sys="${m.user_id}">${m.is_sysadmin ? 'سحب إدارة النظام' : 'منح إدارة النظام'}</button>` : ''}
      <button class="btn sm" data-edit="${m.user_id}">✎ تعديل البيانات والصلاحيات</button>
      ${m.user_id === me.user_id ? '' : `<button class="btn sm danger" data-del="${m.user_id}">🗑 حذف المستخدم</button>`}
    </div></div>`;
}
function bindMemberCard(m) {
  const q = (sel) => view().querySelector(sel);
  const tg = q(`[data-toggle="${m.user_id}"]`); if (tg) tg.addEventListener('click', async () => {
    const ok = await guard(async () => { await dbUpdateMember(m.user_id, { is_active: !m.is_active }); }); if (ok) { await loadAll(); screenMembers(); }
  });
  const rl = q(`[data-role="${m.user_id}"]`); if (rl) rl.addEventListener('click', async () => {
    const ok = await guard(async () => { await dbUpdateMember(m.user_id, { role: m.role === 'admin' ? 'member' : 'admin' }); }); if (ok) { await loadAll(); screenMembers(); }
  });
  const sy = q(`[data-sys="${m.user_id}"]`); if (sy) sy.addEventListener('click', async () => {
    if (!await confirm2(m.is_sysadmin ? 'سحب صلاحية إدارة النظام من هذا المستخدم؟' : 'منح هذا المستخدم صلاحية إدارة النظام (النصائح والمعلومات)؟')) return;
    const ok = await guard(async () => { await dbUpdateMember(m.user_id, { is_sysadmin: !m.is_sysadmin }); }); if (ok) { await loadAll(); screenMembers(); }
  });
  const ed = q(`[data-edit="${m.user_id}"]`); if (ed) ed.addEventListener('click', () => adminEditUser(m));
  const dl = q(`[data-del="${m.user_id}"]`); if (dl) dl.addEventListener('click', async () => {
    if (m.user_id === me.user_id) { toast('لا يمكنك حذف حسابك أنت'); return; }
    if (!await confirm2(`حذف المستخدم «${m.full_name || '—'}» نهائياً؟ لن يظهر في القائمة ولن يتمكّن من الدخول. (بيانات الحلال الخاصة به تبقى محفوظة)`, { danger: true })) return;
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_members').delete().eq('user_id', m.user_id); if (error) throw error; });
    if (ok) { toast('تم حذف المستخدم'); await loadAll(); screenMembers(); }
  });
}
async function dbUpdateMember(uid, obj) { const { error } = await sb.from('mrahi_members').update(obj).eq('user_id', uid); if (error) throw error; }

// المدير يعدّل بيانات مستخدم: الاسم/الجوال/اسم المستخدم + الصلاحيات + الرقم السري
function adminEditUser(m) {
  const p = m.perms || {};
  const isAdminUser = m.role === 'admin';
  const permGrid = `<div class="perm-grid">
    <div class="h">القسم</div><div class="h">عرض</div><div class="h">إضافة</div><div class="h">تعديل</div><div class="h">حذف</div>
    ${MODULES.map(mod => `<div>${mod.ar}</div>` + ['view', 'add', 'edit', 'delete'].map(act => `<label><input type="checkbox" data-eu-mod="${mod.k}" data-eu-act="${act}" ${p[mod.k] && p[mod.k][act] ? 'checked' : ''}></label>`).join('')).join('')}
    <div>النسخ الاحتياطي</div><label><input type="checkbox" data-eu-mod="backup" data-eu-act="view" ${p.backup && p.backup.view ? 'checked' : ''}></label><label></label><label></label><label></label>
  </div>`;
  openModal('تعديل بيانات المستخدم', `
    ${fInput('الاسم', 'eu_name', m.full_name || '')}
    ${fInput('رقم الجوال', 'eu_phone', m.phone || '', 'tel', 'inputmode="tel"')}
    ${fInput('اسم المستخدم', 'eu_user', m.username || '', 'text', 'autocomplete="off"')}
    <div class="li-title sm" style="margin:12px 0 4px">🔐 الصلاحيات</div>
    ${isAdminUser ? '<div class="muted" style="font-size:.82rem;margin-bottom:6px">هذا الحساب مدير ويملك كل الصلاحيات تلقائياً. التحديد أدناه يُطبَّق إذا أُنزل لمستخدم.</div>' : ''}
    ${permGrid}
    <div class="li-title sm" style="margin:14px 0 4px">🔑 الرقم السري</div>
    ${fInput('رقم سري جديد (٤ أرقام — اتركه فارغاً لعدم التغيير)', 'eu_pin', '', 'text', 'inputmode="numeric" maxlength="4" autocomplete="off"')}
    <button class="btn" id="eu_save" style="margin-top:12px">حفظ التغييرات</button>
    <div class="muted" style="font-size:.82rem;margin-top:6px">يدخل المستخدم بالجوال أو اسم المستخدم. عند تعيين رقم سري جديد، أبلغه به ليدخل (ويمكنه تغييره لاحقاً).</div>`, () => {
    document.getElementById('eu_save').addEventListener('click', async () => {
      const full_name = val('eu_name').trim();
      const phone = normPhone(val('eu_phone'));
      const username = val('eu_user').trim();
      const pin = val('eu_pin').trim();
      if (!full_name) { toast('أدخل الاسم'); return; }
      if (phone.length < 7) { toast('أدخل رقم جوال صحيح'); return; }
      if (pin && !/^\d{4}$/.test(pin)) { toast('الرقم السري ٤ أرقام'); return; }
      if (!await confirm2('حفظ تعديلات هذا المستخدم؟')) return;
      const perms = {};
      document.querySelectorAll('#modalRoot [data-eu-mod]').forEach(cb => { if (cb.checked) { const mod = cb.dataset.euMod, act = cb.dataset.euAct; perms[mod] = perms[mod] || {}; perms[mod][act] = true; } });
      const update = { full_name, phone, username: username || null, perms };
      const ok = await guard(async () => {
        await dbUpdateMember(m.user_id, update);
        if (pin) {
          const { data, error } = await sb.functions.invoke('admin-set-password', { body: { target_user_id: m.user_id, pin } });
          if (error) throw new Error('تعذّر تغيير الرقم السري — تأكّد من نشر دالة admin-set-password');
          if (data && data.error) throw new Error('تعذّر تغيير الرقم السري: ' + data.error);
        }
      });
      if (ok) { closeModal(); toast('تم حفظ التغييرات'); await loadAll(); screenMembers(); }
    });
  });
}

// المدير يُنشئ حساباً جديداً مباشرةً (عبر عميل مؤقت كي لا تُستبدل جلسة المدير)
function adminAddUser() {
  openModal('إضافة مستخدم جديد', `
    ${fInput('الاسم', 'nu_name', '')}
    ${fInput('رقم الجوال', 'nu_phone', '', 'tel', 'inputmode="tel"')}
    ${fInput('اسم المستخدم (اختياري)', 'nu_user', '', 'text', 'autocomplete="off"')}
    ${fInput('رقم سري مؤقت (٤ أرقام)', 'nu_pin', '', 'text', 'inputmode="numeric" maxlength="4"')}
    <button class="btn" id="nu_save" style="margin-top:6px">إنشاء الحساب</button>
    <div class="muted" style="font-size:.82rem;margin-top:6px">يُنشأ موقوفاً — بعد ظهوره في القائمة فعّله وامنحه الصلاحيات. أعطِه الجوال والرقم السري ليدخل (ويغيّره لاحقاً).</div>`, () => {
    document.getElementById('nu_save').addEventListener('click', async () => {
      const full_name = val('nu_name').trim();
      const phone = normPhone(val('nu_phone'));
      const username = val('nu_user').trim();
      const pin = val('nu_pin').trim();
      if (!full_name) { toast('أدخل الاسم'); return; }
      if (phone.length < 7) { toast('أدخل رقم جوال صحيح'); return; }
      if (!/^\d{4}$/.test(pin)) { toast('الرقم السري ٤ أرقام'); return; }
      const ok = await guard(async () => {
        const tmp = window.supabase.createClient(window.MRAH_CONFIG.SUPABASE_URL, window.MRAH_CONFIG.SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'mrahi_admin_tmp' } });
        const { error } = await tmp.auth.signUp({ email: phoneToEmail(phone), password: pinToPass(pin), options: { data: { full_name, username, phone, app: 'mrahi' } } });
        if (error) throw error;
        try { await tmp.auth.signOut(); } catch (e) { /* تجاهل */ }
      });
      if (ok) { closeModal(); toast('تم إنشاء الحساب — فعّله وامنحه الصلاحيات'); await loadAll(); screenMembers(); }
    });
  });
}

/* ===== تفقد الحلال وإحصائيات ===== */
let inspectTab = 'stats';
let lineageMode = 'flat';   // عرض الأنساب: قائمة (الأم ← مواليدها) أو شجرة متعدّدة الأجيال
let afSex = 'male', afSrc = 'born', afCmp = 'gt', afMonths = 3;   // كشف بالعمر (الجنس/المصدر/المقارنة/الأشهر)
const codeNumOf = (a) => { const m = String(a.code || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : null; };
const aMini = (a) => `<div class="card click" data-aid="${a.id}" style="margin:6px 0"><div class="li-title">${display(a)} <span class="muted" style="font-weight:400">${internalNo(a)}</span></div><div class="li-sub">${arOf(TYPES, a.type)} • ${arOf(SEX, a.sex)}${a.pen ? ' • ' + esc(a.pen) : ''}${a.status !== 'present' ? ' • ' + arOf(STATUS, a.status) : ''}</div></div>`;
function screenInspect() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const tabs = [
    { k: 'stats', ar: '📊 إحصائيات' }, { k: 'index', ar: '🔢 فهرس' }, { k: 'dups', ar: '♻ تكرار الأرقام' },
    { k: 'offspring', ar: '👶 الإنتاج' }, { k: 'agefilter', ar: '🔎 كشف بالعمر' }, { k: 'lineage', ar: '👪 الأنساب' }, { k: 'twins', ar: '👯 التوائم' }, { k: 'gaps', ar: '⚠️ نواقص' },
  ];
  view().innerHTML = `<div class="chips">${tabs.map(t => `<span class="chip ${inspectTab === t.k ? 'active' : ''}" data-it="${t.k}">${t.ar}</span>`).join('')}</div><div id="inspBody"></div>`;
  view().querySelectorAll('[data-it]').forEach(c => c.addEventListener('click', () => { inspectTab = c.dataset.it; screenInspect(); }));
  renderInspect();
}
function renderInspect() {
  const body = document.getElementById('inspBody');
  const A = C.animals;
  const present = A.filter(a => a.status === 'present');
  if (inspectTab === 'stats') {
    const byType = TYPES.map(t => ({ ar: t.ar, n: present.filter(a => a.type === t.k).length })).filter(x => x.n);
    const f = present.filter(a => a.sex === 'female').length, m = present.filter(a => a.sex === 'male').length;
    const sold = A.filter(a => a.status === 'sold').length, dead = A.filter(a => a.status === 'dead').length;
    const bornAll = present.filter(a => a.source === 'born');
    const boughtAll = present.filter(a => (a.source || 'purchased') === 'purchased');
    const bM = bornAll.filter(a => a.sex === 'male').length, bF = bornAll.filter(a => a.sex === 'female').length;
    const pM = boughtAll.filter(a => a.sex === 'male').length, pF = boughtAll.filter(a => a.sex === 'female').length;
    const pens = {}; present.forEach(a => { const p = a.pen || '— بلا مراح'; pens[p] = (pens[p] || 0) + 1; });
    const penList = Object.entries(pens).sort((x, y) => y[1] - x[1]);
    // توزيع الأعمار (في المراح، حسب الميلاد)
    const withBirth = present.filter(a => a.birth);
    const noBirth = present.length - withBirth.length;
    const young = withBirth.filter(a => ageMonths(a.birth) < 6).length;
    const sub = withBirth.filter(a => { const mo = ageMonths(a.birth); return mo >= 6 && mo < 12; }).length;
    const adult = withBirth.filter(a => ageMonths(a.birth) >= 12).length;
    // معدّل التوائم ومتوسط المواليد لكل أم
    const groups = {}; A.forEach(a => { if (a.mother_id && a.birth) { const k = a.mother_id + '|' + a.birth; groups[k] = (groups[k] || 0) + 1; } });
    const gv = Object.values(groups); const multiG = gv.filter(n => n >= 2).length;
    const twinRate = gv.length ? Math.round((multiG / gv.length) * 100) : 0;
    const dams = {}; A.forEach(a => { if (a.mother_id) dams[a.mother_id] = (dams[a.mother_id] || 0) + 1; });
    const damCount = Object.keys(dams).length;
    const avgOff = damCount ? (Object.values(dams).reduce((s, n) => s + n, 0) / damCount).toFixed(1) : '0';
    // تحت التحريم الآن (بهائم لها علاج/تطعيم تحريمه سارٍ)
    const underSet = new Set();
    [...C.treatments, ...C.vaccinations].forEach(r => { if (r.withdrawal_end && daysUntil(r.withdrawal_end) >= 0) underSet.add(r.animal_id); });
    const underNow = present.filter(a => underSet.has(a.id)).length;
    body.innerHTML = `
      <div class="stats">
        <div class="stat green"><div class="n">${present.length}</div><div class="l">في المراح</div></div>
        <div class="stat blue"><div class="n">${f}</div><div class="l">إناث</div></div>
        <div class="stat amber"><div class="n">${m}</div><div class="l">ذكور</div></div>
      </div>
      <div class="card"><h3>حسب النوع</h3>${byType.length ? byType.map(x => row(x.ar, x.n)).join('') : noItem()}</div>
      <div class="card"><h3>👶 الإنتاج (مواليد) — في المراح</h3>${row('ذكور', bM)}${row('إناث', bF)}${row('المجموع', bM + bF)}</div>
      <div class="card"><h3>🛒 المشترى — في المراح</h3>${row('ذكور', pM)}${row('إناث', pF)}${row('المجموع', pM + pF)}</div>
      <div class="card"><h3>🎂 توزيع الأعمار (في المراح)</h3>${row('صغار (أقل من ٦ أشهر)', young)}${row('من ٦ لـ ١٢ شهر', sub)}${row('بالغة (سنة فأكثر)', adult)}${noBirth ? row('بلا تاريخ ميلاد', noBirth) : ''}</div>
      <div class="card"><h3>📈 مؤشّرات الإنتاج</h3>${row('معدّل التوائم', twinRate + '%')}${row('متوسط المواليد لكل أم', avgOff)}${row('عدد الأمهات المنتِجة', damCount)}</div>
      <div class="card"><h3>⛔ تحت التحريم الآن</h3>${row('عدد البهائم', underNow)}</div>
      <div class="card"><h3>الحالة (الكل)</h3>${row('في المراح', present.length)}${row('مباعة', sold)}${row('نافقة', dead)}${row('الإجمالي', A.length)}</div>
      <div class="card"><h3>حسب المراح</h3>${penList.length ? penList.map(([p, n]) => row(p, n)).join('') : noItem()}</div>`;
    return;
  }
  if (inspectTab === 'index') {
    const arr = present.slice().sort((a, b) => { const x = codeNumOf(a), y = codeNumOf(b); if (x == null && y == null) return a.id - b.id; if (x == null) return 1; if (y == null) return -1; return x - y; });
    body.innerHTML = `<div class="muted" style="margin:4px 0 8px">فهرس تسلسلي — ${arr.length} رأس في المراح</div>`
      + (arr.length ? arr.map((a, i) => `<div class="card click" data-aid="${a.id}"><div class="li-title">${i + 1}. ${display(a)} <span class="muted" style="font-weight:400">${internalNo(a)}</span></div><div class="li-sub">${arOf(TYPES, a.type)} • ${arOf(SEX, a.sex)}${a.pen ? ' • ' + esc(a.pen) : ''}</div></div>`).join('') : noItem());
    bindCards(body); return;
  }
  if (inspectTab === 'dups') {
    const map = {}; present.filter(a => a.code).forEach(a => { (map[a.code] = map[a.code] || []).push(a); });
    const dups = Object.entries(map).filter(([, arr]) => arr.length > 1).sort((x, y) => y[1].length - x[1].length);
    body.innerHTML = dups.length
      ? `<div class="muted" style="margin:4px 0 8px">أرقام يتشاركها أكثر من رأس في المراح — راجِعها.</div>` + dups.map(([code, arr]) => `<div class="card"><div class="li-title">⚠️ الرقم «${esc(code)}» مكرّر (${arr.length})</div>${arr.map(aMini).join('')}</div>`).join('')
      : '<div class="center-empty">لا يوجد تكرار في الأرقام ✅</div>';
    bindCards(body); return;
  }
  if (inspectTab === 'offspring') {
    const cnt = {}; A.forEach(a => { if (a.mother_id) cnt[a.mother_id] = (cnt[a.mother_id] || 0) + 1; });
    const moms = Object.entries(cnt).map(([id, n]) => ({ a: animalById(parseInt(id, 10)), n })).filter(x => x.a).sort((x, y) => y.n - x.n);
    body.innerHTML = `<div class="muted" style="margin:4px 0 8px">الأمهات حسب عدد المواليد المسجّلة (${moms.length} أم منتِجة)</div>`
      + (moms.length ? moms.map(({ a, n }) => `<div class="card click" data-aid="${a.id}"><div class="li-title">${display(a)} <span class="muted" style="font-weight:400">${internalNo(a)}</span></div><div class="li-sub">👶 ${n} مولود • ${arOf(TYPES, a.type)}${a.pen ? ' • ' + esc(a.pen) : ''}</div></div>`).join('') : noItem());
    bindCards(body); return;
  }
  if (inspectTab === 'agefilter') {
    const sexChips = `<div class="chips"><span class="chip ${afSex === 'all' ? 'active' : ''}" data-afs="all">الكل</span><span class="chip ${afSex === 'male' ? 'active' : ''}" data-afs="male">♂ ذكور</span><span class="chip ${afSex === 'female' ? 'active' : ''}" data-afs="female">♀ إناث</span></div>`;
    const srcChips = `<div class="chips"><span class="chip ${afSrc === 'all' ? 'active' : ''}" data-afsrc="all">كل المصادر</span><span class="chip ${afSrc === 'born' ? 'active' : ''}" data-afsrc="born">👶 مواليد</span><span class="chip ${afSrc === 'purchased' ? 'active' : ''}" data-afsrc="purchased">🛒 مشترى</span></div>`;
    const cmpChips = `<div class="chips" style="margin:0"><span class="chip ${afCmp === 'gt' ? 'active' : ''}" data-afc="gt">أكبر من</span><span class="chip ${afCmp === 'lt' ? 'active' : ''}" data-afc="lt">أصغر من</span></div>`;
    body.innerHTML = `<div class="card">
        <div class="muted" style="font-size:.82rem">الجنس:</div>${sexChips}
        <div class="muted" style="font-size:.82rem;margin-top:4px">المصدر:</div>${srcChips}
        <div class="muted" style="font-size:.82rem;margin-top:4px">العمر:</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:4px">${cmpChips}<input id="af_m" type="number" inputmode="numeric" min="0" value="${afMonths}" style="width:66px;padding:8px;border:1px solid #ddd;border-radius:8px;text-align:center"><span class="muted">شهر</span></div>
      </div><div id="af_result"></div>`;
    const compute = () => {
      afMonths = parseInt(document.getElementById('af_m').value, 10) || 0;
      let arr = present.filter(a => a.birth);
      if (afSex !== 'all') arr = arr.filter(a => a.sex === afSex);
      if (afSrc !== 'all') arr = arr.filter(a => (a.source || 'purchased') === afSrc);
      arr = arr.filter(a => { const mo = ageMonths(a.birth); return afCmp === 'gt' ? mo > afMonths : mo < afMonths; }).sort((a, b) => ageMonths(b.birth) - ageMonths(a.birth));
      const noB = present.filter(a => !a.birth && (afSex === 'all' || a.sex === afSex) && (afSrc === 'all' || (a.source || 'purchased') === afSrc)).length;
      const res = document.getElementById('af_result');
      res.innerHTML = `<div class="card hl"><div class="li-title">النتيجة: ${arr.length} رأس</div><div class="li-sub">${afSex === 'male' ? 'ذكور' : afSex === 'female' ? 'إناث' : 'الكل'} • ${afSrc === 'born' ? 'مواليد' : afSrc === 'purchased' ? 'مشترى' : 'كل المصادر'} • ${afCmp === 'gt' ? 'أكبر من' : 'أصغر من'} ${afMonths} شهر${noB ? ` • (${noB} بلا ميلاد غير محسوبة)` : ''}</div></div>`
        + (arr.length ? arr.map(a => `<div class="card click" data-aid="${a.id}"><div class="li-title">${display(a)} <span class="muted" style="font-weight:400">🎂 ${ageText(a.birth)}</span></div><div class="li-sub">${arOf(TYPES, a.type)} • ${arOf(SEX, a.sex)}${a.pen ? ' • ' + esc(a.pen) : ''}</div></div>`).join('') : noItem());
      bindCards(res);
    };
    body.querySelectorAll('[data-afs]').forEach(c => c.addEventListener('click', () => { afSex = c.dataset.afs; body.querySelectorAll('[data-afs]').forEach(x => x.classList.toggle('active', x.dataset.afs === afSex)); compute(); }));
    body.querySelectorAll('[data-afsrc]').forEach(c => c.addEventListener('click', () => { afSrc = c.dataset.afsrc; body.querySelectorAll('[data-afsrc]').forEach(x => x.classList.toggle('active', x.dataset.afsrc === afSrc)); compute(); }));
    body.querySelectorAll('[data-afc]').forEach(c => c.addEventListener('click', () => { afCmp = c.dataset.afc; body.querySelectorAll('[data-afc]').forEach(x => x.classList.toggle('active', x.dataset.afc === afCmp)); compute(); }));
    document.getElementById('af_m').addEventListener('input', compute);
    compute(); return;
  }
  if (inspectTab === 'lineage') {
    const cn = (a) => { const n = codeNumOf(a); return n == null ? 1e15 : n; };
    const offBy = {}; A.forEach(a => { if (a.mother_id) (offBy[a.mother_id] = offBy[a.mother_id] || []).push(a); });
    const hasKids = (id) => offBy[id] && offBy[id].length;
    const label = (a) => esc(a.code || ('#' + a.id));
    const clsOf = (a) => a.sex === 'male' ? 'male' : (hasKids(a.id) ? 'mother' : 'female');
    const chip = (a, cls) => `<span class="lin-chip ${cls}" data-aid="${a.id}">${label(a)}</span>`;
    const toggle = `<div class="chips" style="margin-bottom:6px"><span class="chip ${lineageMode === 'flat' ? 'active' : ''}" data-lm="flat">📋 قائمة</span><span class="chip ${lineageMode === 'tree' ? 'active' : ''}" data-lm="tree">🌳 شجرة</span></div>`;
    const legend = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px;align-items:center"><span class="muted" style="font-size:.8rem">الألوان:</span><span class="lin-chip mother">أم</span><span class="lin-chip female">أنثى</span><span class="lin-chip male">ذكر</span></div>`;
    let inner;
    if (lineageMode === 'tree') {
      const sortKids = (arr) => arr.slice().sort((a, b) => cn(a) - cn(b) || a.id - b.id);
      const node = (a, depth, seen) => {
        if (seen.has(a.id)) return ''; seen.add(a.id);
        const kids = sortKids(offBy[a.id] || []);
        return `<div style="margin-inline-start:${depth * 18}px;padding:3px 0;display:flex;align-items:center;gap:6px">${depth ? '<span style="color:var(--muted)">↳</span>' : ''}${chip(a, clsOf(a))}${kids.length ? `<span class="muted" style="font-size:.72rem">(${kids.length})</span>` : ''}</div>`
          + kids.map(k => node(k, depth + 1, seen)).join('');
      };
      const roots = A.filter(a => hasKids(a.id) && (!a.mother_id || !animalById(a.mother_id))).sort((a, b) => cn(a) - cn(b) || a.id - b.id);
      inner = roots.length ? roots.map(r => `<div class="card" style="padding:10px">${node(r, 0, new Set())}</div>`).join('') : '<div class="center-empty">لا توجد أنساب لعرضها بعد.</div>';
    } else {
      const mothers = Object.keys(offBy).map(id => animalById(parseInt(id, 10))).filter(Boolean).sort((a, b) => cn(a) - cn(b) || a.id - b.id);
      inner = mothers.length ? mothers.map(m => {
        const offs = offBy[m.id].slice().sort((a, b) => cn(a) - cn(b) || a.id - b.id);
        return `<div class="card" style="padding:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">${chip(m, 'mother')}<span style="color:var(--muted);font-weight:700">←</span>${offs.map(o => chip(o, o.sex === 'male' ? 'male' : 'female')).join('')}<span class="muted" style="margin-inline-start:auto;font-size:.78rem">${offs.length} مولود</span></div>`;
      }).join('') : '<div class="center-empty">لا توجد أمهات مرتبطة بمواليد بعد.</div>';
    }
    body.innerHTML = toggle + legend + inner;
    body.querySelectorAll('[data-lm]').forEach(c => c.addEventListener('click', () => { lineageMode = c.dataset.lm; renderInspect(); }));
    bindCards(body); return;
  }
  if (inspectTab === 'twins') {
    const groups = {}; A.forEach(a => { if (a.mother_id && a.birth) { const k = a.mother_id + '|' + a.birth; (groups[k] = groups[k] || []).push(a); } });
    const multi = Object.values(groups).filter(g => g.length >= 2).sort((x, y) => y.length - x.length || (y[0].birth || '').localeCompare(x[0].birth || ''));
    const label = (n) => n === 2 ? 'توأم' : n === 3 ? 'ثلاثة توائم' : n === 4 ? 'أربعة توائم' : `${n} توائم`;
    body.innerHTML = multi.length
      ? `<div class="muted" style="margin:4px 0 8px">مواليد مشتركة في الأم وتاريخ الميلاد (${multi.length} حالة)</div>` + multi.map(g => { const mom = animalById(g[0].mother_id); return `<div class="card"><div class="li-title">👯 ${label(g.length)} — ${mom ? display(mom) : 'أم'}</div><div class="li-sub">ميلاد ${fmtDate(g[0].birth)}</div>${g.map(aMini).join('')}</div>`; }).join('')
      : '<div class="center-empty">لا توجد توائم مسجّلة (تحتاج تاريخ ميلاد وأمّاً للمواليد).</div>';
    bindCards(body); return;
  }
  if (inspectTab === 'gaps') {
    const noNum = present.filter(a => !a.code);
    const noBirth = present.filter(a => !a.birth);
    const noMother = present.filter(a => a.source === 'born' && !a.mother_id);
    const sec = (title, arr) => `<div class="card"><h3>${title} (${arr.length})</h3>${arr.length ? arr.slice(0, 60).map(aMini).join('') + (arr.length > 60 ? '<div class="muted">…والمزيد</div>' : '') : '<div class="muted">لا شيء ✅</div>'}</div>`;
    body.innerHTML = sec('🐑 بلا رقم خارجي', noNum) + sec('📅 بلا تاريخ ميلاد', noBirth) + sec('👩 مواليد بلا أم', noMother);
    bindCards(body); return;
  }
}

/* ===== أنواع الحلال (للمدير) ===== */
function screenTypes() {
  if (!isAdmin()) { view().innerHTML = noPerm(); return; }
  const list = (C.types || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">أنواع الحلال المستخدمة عند تسجيل البهائم. مدة الحمل (بالأيام) تُستخدم لحساب موعد الولادة المتوقّع، وسن البلوغ/الفطام (بالأشهر) للمتابعة.</div>`
    + (list.length ? list.map(t => `<div class="card">
        <div class="li-title">${esc(t.ar)}</div>
        <div class="li-sub">🤰 مدة الحمل: ${t.gest} يوم${t.puberty ? ` • 🌱 سن البلوغ: ${t.puberty} شهر` : ''}${t.weaning ? ` • 🍼 سن الفطام: ${t.weaning} شهر` : ''}</div>
        <div class="btn-row" style="margin-top:6px">
          <button class="btn sm outline" data-edit="${t.id}">تعديل</button>
          <button class="btn sm danger" data-del="${t.id}">حذف</button>
        </div></div>`).join('') : '<div class="muted">لا توجد أنواع — أضِف نوعاً.</div>')
    + `<button class="btn" id="addType" style="margin-top:10px">➕ إضافة نوع</button>`;
  view().querySelector('#addType').addEventListener('click', () => typeModal(null));
  view().querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => typeModal((C.types || []).find(t => String(t.id) === b.dataset.edit))));
  view().querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const t = (C.types || []).find(x => String(x.id) === b.dataset.del);   // المعرّف الحقيقي (رقم في المحلي)
    if (!t) { toast('النوع غير موجود'); return; }
    if (!await confirm2('حذف هذا النوع؟ (البهائم المسجّلة مسبقاً لا تتأثر)')) return;
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_types').delete().eq('id', t.id); if (error) throw error; });
    if (ok) { toast('تم الحذف'); await loadAll(); screenTypes(); }
  }));
}
function typeModal(t) {
  const optNum = (id) => { const v = val(id).trim(); return v === '' ? null : (parseInt(v, 10) || null); };
  openModal(t ? 'تعديل نوع' : 'إضافة نوع', `
    ${fInput('الاسم (مثل: خيل)', 'ty_ar', t && t.ar)}
    ${fInput('مدة الحمل (يوم)', 'ty_gest', t ? t.gest : 150, 'number', 'min="0" inputmode="numeric"')}
    ${fInput('سن البلوغ (شهر) — اختياري', 'ty_puberty', t ? t.puberty : '', 'number', 'min="0" inputmode="numeric"')}
    ${fInput('سن الفطام (شهر) — اختياري', 'ty_weaning', t ? t.weaning : '', 'number', 'min="0" inputmode="numeric"')}
    <button class="btn" id="ty_save" style="margin-top:6px">حفظ</button>`, () => {
    document.getElementById('ty_save').addEventListener('click', async () => {
      const ar = val('ty_ar').trim(); const gest = num('ty_gest') || 150;
      const puberty = optNum('ty_puberty'), weaning = optNum('ty_weaning');
      if (!ar) { toast('أدخل الاسم'); return; }
      const ok = await guard(async () => {
        if (t) { const { error } = await sb.from('mrahi_types').update({ ar, gest, puberty, weaning }).eq('id', t.id); if (error) throw error; }
        else {
          const key = 't_' + Date.now().toString(36);
          const sort = (C.types || []).reduce((m, x) => Math.max(m, x.sort || 0), 0) + 10;
          const { error } = await sb.from('mrahi_types').insert({ key, ar, gest, puberty, weaning, sort }); if (error) throw error;
        }
      });
      if (ok) { closeModal(); toast('تم الحفظ'); await loadAll(); screenTypes(); }
    });
  });
}

/* ===== إدارة النصائح والمعلومات (لمدير النظام) ===== */
function screenTips() {
  if (!isSys()) { view().innerHTML = noPerm(); return; }
  const list = (C.tips || []).slice().sort((a, b) => (a.kind || '').localeCompare(b.kind || '') || (b.id || 0) - (a.id || 0));
  const card = (t) => {
    const isTip = t.kind === 'tip';
    return `<div class="card">
      <div class="li-title">${isTip ? '💡' : 'ℹ️'} ${esc(t.title)}
        <span class="badge ${isTip ? '' : 'role'}">${isTip ? 'نصيحة' : 'معلومة'}</span>
        ${t.is_active === false ? '<span class="badge off">موقوفة</span>' : ''}</div>
      <div class="li-sub">${esc(t.brief)}</div>
      <div class="btn-row" style="margin-top:6px">
        <button class="btn sm outline" data-edit="${t.id}">تعديل</button>
        <button class="btn sm danger" data-del="${t.id}">حذف</button>
      </div></div>`;
  };
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">النصيحة يظهر مختصرها في الرئيسية لكل مستخدم بتبديل عشوائي عند كل دخول، والنقر عليها يفتح التفصيل. المعلومة تُعرض بالطريقة نفسها.</div>`
    + (list.length ? list.map(card).join('') : '<div class="muted">لا توجد عناصر — أضِف نصيحة أو معلومة.</div>')
    + `<button class="btn" id="addTip" style="margin-top:10px">➕ إضافة نصيحة / معلومة</button>`;
  view().querySelector('#addTip').addEventListener('click', () => tipModal(null));
  view().querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => tipModal((C.tips || []).find(t => String(t.id) === b.dataset.edit))));
  view().querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('حذف هذا العنصر نهائياً؟')) return;
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_tips').delete().eq('id', parseInt(b.dataset.del, 10)); if (error) throw error; });
    if (ok) { toast('تم الحذف'); await loadAll(); screenTips(); }
  }));
}
function tipModal(t) {
  openModal(t ? 'تعديل' : 'إضافة نصيحة / معلومة', `
    ${fSelect('النوع', 'tp_kind', [{ k: 'tip', ar: '💡 نصيحة' }, { k: 'info', ar: 'ℹ️ معلومة' }], t ? t.kind : 'tip')}
    ${fInput('العنوان', 'tp_title', t && t.title)}
    ${fInput('المختصر (يظهر في الرئيسية)', 'tp_brief', t && t.brief)}
    ${fTextarea('التفصيل (يظهر عند النقر)', 'tp_detail', t && t.detail)}
    <label class="chk" style="display:flex;align-items:center;gap:8px;margin:8px 0">
      <input type="checkbox" id="tp_active" ${!t || t.is_active !== false ? 'checked' : ''}> مُفعّلة (تظهر للمستخدمين)</label>
    <button class="btn" id="tp_save" style="margin-top:6px">حفظ</button>`, () => {
    document.getElementById('tp_save').addEventListener('click', async () => {
      const kind = val('tp_kind') || 'tip';
      const title = val('tp_title').trim();
      const brief = val('tp_brief').trim();
      const detail = val('tp_detail').trim();
      const is_active = document.getElementById('tp_active').checked;
      if (!title) { toast('أدخل العنوان'); return; }
      if (!brief) { toast('أدخل المختصر'); return; }
      if (t && !await confirm2('حفظ التعديل على هذا العنصر؟')) return;
      const ok = await guard(async () => {
        if (t) { const { error } = await sb.from('mrahi_tips').update({ kind, title, brief, detail, is_active }).eq('id', t.id); if (error) throw error; }
        else { const { error } = await sb.from('mrahi_tips').insert({ kind, title, brief, detail, is_active }); if (error) throw error; }
      });
      if (ok) { closeModal(); toast('تم الحفظ'); await loadAll(); screenTips(); }
    });
  });
}

/* ===== سلة المحذوفات / الأرشيف (للمدير) ===== */
async function screenTrash() {
  if (!isAdmin()) { view().innerHTML = noPerm(); return; }
  showLoading(true);
  let list = [];
  try { const { data } = await sb.from('mrahi_trash').select('*').order('created_at', { ascending: false }); list = data || []; } catch (e) { toast('خطأ تحميل السلة'); }
  showLoading(false);
  const actionAr = { delete: 'محذوف', edit: 'نسخة قبل تعديل' };
  const whoOf = (t) => t.actor_name || ((C.members.find(m => m.user_id === t.actor) || {}).full_name) || '—';
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">العناصر المحذوفة والنُّسخ السابقة قابلة للاستعادة. تُحذف نهائياً تلقائياً بعد ٣٠ يوماً، أو احذفها يدوياً بعد التأكّد.</div>`
    + (list.length ? list.map(t => `<div class="card">
        <div class="li-title">${esc(t.label || t.tbl)}</div>
        <div class="li-sub"><span class="badge ${t.action === 'delete' ? 'off' : ''}">${actionAr[t.action] || t.action}</span> ${fmtDateTime(t.created_at)}</div>
        <div class="li-sub">بواسطة: ${esc(whoOf(t))}</div>
        <div class="btn-row" style="margin-top:6px">
          <button class="btn sm" data-rest="${t.id}">استعادة</button>
          <button class="btn sm danger" data-perm="${t.id}">حذف نهائي</button>
        </div></div>`).join('') : '<div class="center-empty">السلة فارغة.</div>');
  view().querySelectorAll('[data-rest]').forEach(b => b.addEventListener('click', () => restoreTrash(list.find(x => String(x.id) === b.dataset.rest))));
  view().querySelectorAll('[data-perm]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('حذف نهائي لا يمكن التراجع عنه إطلاقاً. متأكّد؟')) return;
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_trash').delete().eq('id', parseInt(b.dataset.perm, 10)); if (error) throw error; });
    if (ok) { toast('تم الحذف النهائي'); screenTrash(); }
  }));
}
async function restoreTrash(t) {
  if (!t) return;
  const data = Object.assign({}, t.data); delete data.id; delete data.created_at;
  const ok = await guard(async () => {
    if (t.action === 'edit') { const { error } = await sb.from(TABLES[t.tbl]).update(data).eq('id', t.rec_id); if (error) throw error; }
    else { const { error } = await sb.from(TABLES[t.tbl]).insert(data); if (error) throw error; }
    const { error: de } = await sb.from('mrahi_trash').delete().eq('id', t.id); if (de) throw de;
  });
  if (ok) { toast('تمت الاستعادة'); await loadAll(); screenTrash(); }
}

/* ===== منتدى النقاش ===== */
let forumRT = null;                                   // قناة التحديث اللحظي الحالية
function teardownForumRealtime() { if (forumRT) { try { sb.removeChannel(forumRT); } catch (e) { /* تجاهل */ } forumRT = null; } }
function setupForumRealtime(name, subs) {
  teardownForumRealtime();
  try {
    let ch = sb.channel('forum:' + name);
    subs.forEach(s => { ch = ch.on('postgres_changes', Object.assign({ event: s.event, schema: 'public', table: s.table }, s.filter ? { filter: s.filter } : {}), s.cb); });
    ch.subscribe();
    forumRT = ch;
  } catch (e) { /* التحديث اللحظي اختياري */ }
}
const forumCatById = (id) => (C.forumCats || []).find(c => c.id === id);
const forumCatName = (id) => { const c = forumCatById(id); return c ? c.name : 'عام'; };
let curForumCat = null;   // قسم الموضوع المفتوح حالياً (لعرض شارات المشرفين)
let curForumLocked = false; // هل الموضوع المفتوح مُغلق
let forumShowModTools = localStorage.getItem('mrahi_forum_modtools') !== '0'; // المشرف: إظهار أدوات التحكم بالمواضيع والمشاركات
const forumMemberName = (uid) => { const m = (C.members || []).find(x => x.user_id === uid); return m ? (m.full_name || m.username || 'عضو') : 'عضو'; };
// اسم المشرف للعرض العام — مخزّن في صف الإشراف (لا يتطلّب قراءة دليل الأعضاء)
const forumModName = (m) => m.member_name || forumMemberName(m.user_id);
const forumModsOf = (catId) => (C.forumMods || []).filter(m => m.category_id === catId);
const isAnyForumMod = () => isAdmin() || (C.forumMods || []).some(m => m.user_id === me.user_id);
const isForumMod = (catId) => isAdmin() || (C.forumMods || []).some(m => m.category_id === catId && m.user_id === me.user_id);
const forumModTitle = (catId, uid) => { const m = (C.forumMods || []).find(x => x.category_id === catId && x.user_id === uid); return m ? (m.title || 'مشرف') : null; };
const modBadge = (catId, uid) => { const t = forumModTitle(catId, uid); return t ? ` <span class="badge mod">🛡️ ${esc(t)}</span>` : ''; };
const canForumView = () => can('forum', 'view') || isAnyForumMod();
const forumBanned = () => !!(C.forumBans || []).find(b => b.user_id === me.user_id);
const canForumAddIn = (catId) => !forumBanned() && (can('forum', 'add') || isForumMod(catId));
const canCreateTopic = (catId) => canForumAddIn(catId) && (!forumTopicsModsOnly || isForumMod(catId));
const forumOffMsg = () => '<div class="center-empty" style="padding:30px">🚧 المنتدى متوقّف مؤقتاً.</div>';
const editedMark = (r) => (r && r.updated_at && r.created_at && r.updated_at !== r.created_at) ? ' <span class="muted" style="font-size:.8em">(مُعدّل)</span>' : '';
const fmtBody = (s) => esc(s || '').replace(/\n/g, '<br>');
function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'الآن';
  const m = Math.floor(s / 60); if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60); if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24); if (d < 30) return `قبل ${d} يوم`;
  return fmtDate(String(iso).slice(0, 10));
}
const likeBtn = (col, id, n, mine) => `<button class="like-btn ${mine ? 'liked' : ''}" data-lk="${col}:${id}" data-n="${n}">👍 <span class="lk-n">${n}</span></button>`;
async function forumToggleLike(col, id, btn) {
  const liked = btn.classList.contains('liked');
  try {
    if (liked) { const { error } = await sb.from('mrahi_forum_likes').delete().eq('user_id', me.user_id).eq(col, id); if (error) throw error; }
    else { const obj = { user_id: me.user_id }; obj[col] = id; const { error } = await sb.from('mrahi_forum_likes').insert(obj); if (error && !/duplicate/i.test(error.message || '')) throw error; }
  } catch (e) { toast('تعذّر تسجيل الإعجاب'); return; }
  const n = Math.max(0, parseInt(btn.dataset.n || '0', 10) + (liked ? -1 : 1));
  btn.dataset.n = n; btn.classList.toggle('liked', !liked);
  const span = btn.querySelector('.lk-n'); if (span) span.textContent = n;
}

// شاشة المنتدى: الأقسام + أحدث المواضيع
async function screenForum() {
  if (!forumEnabled) { view().innerHTML = forumOffMsg(); return; }
  if (!canForumView()) { view().innerHTML = noPerm(); return; }
  showLoading(true);
  let cats = (C.forumCats || []).filter(c => !c.is_hidden);
  const counts = {}; let latest = [];
  try {
    const [tc, lt] = await Promise.all([
      sb.from('mrahi_forum_topics').select('category_id'),
      sb.from('mrahi_forum_topics').select('*').order('last_activity', { ascending: false }).limit(6),
    ]);
    (tc.data || []).forEach(r => { counts[r.category_id] = (counts[r.category_id] || 0) + 1; });
    latest = (lt.data || []).filter(t => { const c = forumCatById(t.category_id); return !c || !c.is_hidden; });
  } catch (e) { /* تجاهل */ }
  showLoading(false);
  const catCard = (c) => `<div class="card click forum-cat" data-cat="${c.id}">
      <div class="fc-ico">${esc(c.icon || '💬')}</div>
      <div class="fc-body"><div class="li-title">${esc(c.name)}</div><div class="li-sub">${esc(c.description || '')}</div></div>
      <div class="fc-count">${counts[c.id] || 0}</div>
    </div>`;
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">منتدى مراح — تبادل الخبرات والاستشارات بين الأعضاء.</div>`
    + (latest.length ? `<div class="card"><h3>أحدث المواضيع</h3>${latest.map(t => `<div class="forum-latest" data-topic="${t.id}"><div class="li-title sm">${t.is_pinned ? '📌 ' : ''}${esc(t.title)}</div><div class="li-sub">${esc(forumCatName(t.category_id))} • ${esc(t.author_name || 'عضو')}${modBadge(t.category_id, t.author_id)} • ${timeAgo(t.last_activity)}</div></div>`).join('')}</div>` : '')
    + `<div class="forum-section-h">الأقسام</div>`
    + (cats.length ? cats.map(catCard).join('') : '<div class="center-empty">لا توجد أقسام بعد.</div>');
  view().querySelectorAll('[data-cat]').forEach(c => c.addEventListener('click', () => setHash('#/forum-cat/' + c.dataset.cat)));
  view().querySelectorAll('[data-topic]').forEach(c => c.addEventListener('click', () => setHash('#/forum-topic/' + c.dataset.topic)));
  setupForumRealtime('forum-home', [{ event: '*', table: 'mrahi_forum_topics', cb: () => { if (parseHash().name === 'forum') screenForum(); } }]);
}

// شاشة إعدادات المنتدى (من «المزيد») — التحكم حسب الصلاحيات
async function screenForumAdmin() {
  if (!(isAdmin() || isAnyForumMod())) { view().innerHTML = noPerm(); return; }
  const admin = isAdmin();
  const cats = C.forumCats || [];
  const bans = C.forumBans || [];
  const intro = `<div class="muted" style="margin-bottom:8px">إعدادات المنتدى والتحكم به. للتصفّح والمشاركة استخدم تبويب «المنتدى 💬» في الأسفل.</div>`;
  const enableCard = admin ? `<div class="card">
    <div class="li-title">${forumEnabled ? '🟢 المنتدى مُفعّل' : '🔴 المنتدى مُعطّل'}</div>
    <div class="li-sub">${forumEnabled ? 'ظاهر للأعضاء في الشريط السفلي.' : 'مخفيّ تماماً عن الجميع — لا يظهر التبويب ولا المحتوى.'}</div>
    <button class="btn sm ${forumEnabled ? 'danger' : ''}" id="fa_enable" style="margin-top:6px">${forumEnabled ? '🚫 تعطيل المنتدى' : '✅ تفعيل المنتدى'}</button>
  </div>` : '';

  // عند التعطيل: لا يظهر إلا زر التفعيل
  if (!forumEnabled) {
    view().innerHTML = intro + (admin ? enableCard : '<div class="center-empty" style="padding:24px">🚧 المنتدى متوقّف مؤقتاً.</div>');
    const eb = document.getElementById('fa_enable');
    if (eb) eb.addEventListener('click', () => toggleForumEnabled());
    return;
  }

  const toolsCard = `<div class="card">
    <div class="li-title">🛡️ أدوات التحكم بالمواضيع والمشاركات</div>
    <div class="li-sub">${forumShowModTools ? 'ظاهرة الآن — يظهر زر ⚙️ على المواضيع والمشاركات لإدارتها.' : 'مخفيّة — تتصفّح وتردّ بلا أزرار تحكم.'}</div>
    <button class="btn sm ${forumShowModTools ? 'danger' : ''}" id="fa_tools" style="margin-top:6px">${forumShowModTools ? '🙈 إخفاء أدوات التحكم' : '🛠️ إظهار أدوات التحكم'}</button>
  </div>`;
  const topicModeCard = admin ? `<div class="card">
    <div class="li-title">📝 من يُنشئ المواضيع</div>
    <div class="li-sub">${forumTopicsModsOnly ? 'المشرفون والمدير فقط — الأعضاء يردّون فقط.' : 'كل عضو يملك صلاحية الإضافة.'}</div>
    <button class="btn sm" id="fa_topicmode" style="margin-top:6px">${forumTopicsModsOnly ? '👥 السماح للجميع' : '🛡️ قصْره على المشرفين'}</button>
  </div>` : '';
  const bansCard = admin ? `<div class="card">
    <div class="li-title">🚷 الأعضاء المحظورون</div>
    <div class="li-sub">المحظور لا يستطيع نشر مواضيع أو ردود أو إعجاب.</div>
    <div style="margin-top:6px">${bans.length ? bans.map(b => `<div class="fmod-row"><span>${esc(forumMemberName(b.user_id))}${b.reason ? ' <span class="muted">— ' + esc(b.reason) + '</span>' : ''}</span><button class="btn sm outline" data-unban="${b.user_id}">رفع الحظر</button></div>`).join('') : '<div class="muted">لا أحد محظور.</div>'}</div>
    <button class="btn sm danger" id="fa_ban" style="margin-top:8px">➕ حظر عضو</button>
  </div>` : '';
  let catBlocks = '';
  if (admin) {
    catBlocks = `<div class="forum-section-h">الأقسام والمشرفون</div>`
      + (cats.length ? cats.map(c => {
        const mods = forumModsOf(c.id);
        return `<div class="card">
            <div class="li-title">${esc(c.icon || '💬')} ${esc(c.name)} ${c.is_hidden ? '<span class="badge off">مخفي</span>' : ''}</div>
            ${c.description ? `<div class="li-sub">${esc(c.description)}</div>` : ''}
            <div class="li-sub">${mods.length ? '🛡️ ' + mods.map(m => esc(forumModName(m)) + ' (' + esc(m.title || 'مشرف') + ')').join('، ') : 'لا مشرفين لهذا القسم'}</div>
            <div class="btn-row" style="margin-top:8px">
              <button class="btn sm outline" data-editcat="${c.id}">✎ تعديل</button>
              <button class="btn sm outline" data-mods="${c.id}">👤 المشرفون</button>
              <button class="btn sm ${c.is_hidden ? '' : 'outline'}" data-hidecat="${c.id}" data-cur="${c.is_hidden ? '1' : '0'}">${c.is_hidden ? '👁 إظهار' : '🙈 إخفاء'}</button>
            </div></div>`;
      }).join('') : '<div class="muted">لا أقسام بعد — أضِف قسماً بالزر بالأسفل.</div>');
  }
  view().innerHTML = intro + enableCard + toolsCard + topicModeCard + bansCard + catBlocks;

  const eb = document.getElementById('fa_enable'); if (eb) eb.addEventListener('click', () => toggleForumEnabled());
  const tb = document.getElementById('fa_tools');
  if (tb) tb.addEventListener('click', () => {
    forumShowModTools = !forumShowModTools;
    localStorage.setItem('mrahi_forum_modtools', forumShowModTools ? '1' : '0');
    toast(forumShowModTools ? 'أُظهرت أدوات التحكم' : 'أُخفيت أدوات التحكم'); screenForumAdmin();
  });
  const tm = document.getElementById('fa_topicmode');
  if (tm) tm.addEventListener('click', async () => {
    const ok = await guard(async () => { await setForumSetting('forum_topics_mods_only', !forumTopicsModsOnly); });
    if (ok) { forumTopicsModsOnly = !forumTopicsModsOnly; toast('تم الحفظ'); screenForumAdmin(); }
  });
  const fbn = document.getElementById('fa_ban'); if (fbn) fbn.addEventListener('click', () => forumBanModal());
  view().querySelectorAll('[data-unban]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('رفع الحظر عن هذا العضو؟')) return;
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_bans').delete().eq('user_id', b.dataset.unban); if (error) throw error; });
    if (ok) { toast('رُفع الحظر'); await loadAll(); screenForumAdmin(); }
  }));
  if (admin) {
    view().querySelectorAll('[data-editcat]').forEach(b => b.addEventListener('click', () => forumCatModal(forumCatById(parseInt(b.dataset.editcat, 10)))));
    view().querySelectorAll('[data-mods]').forEach(b => b.addEventListener('click', () => forumModsModal(parseInt(b.dataset.mods, 10))));
    view().querySelectorAll('[data-hidecat]').forEach(b => b.addEventListener('click', async () => {
      const cur = b.dataset.cur === '1';
      const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_categories').update({ is_hidden: !cur }).eq('id', b.dataset.hidecat); if (error) throw error; });
      if (ok) { toast(cur ? 'أُظهر القسم' : 'أُخفي القسم'); await loadAll(); screenForumAdmin(); }
    }));
    addFab('➕ إضافة قسم', () => forumCatModal(null));
  }
}
async function toggleForumEnabled() {
  const next = !forumEnabled;
  const ok = await guard(async () => { await setForumSetting('forum_enabled', next); });
  if (ok) { forumEnabled = next; toast(next ? 'فُعّل المنتدى' : 'عُطّل المنتدى'); buildNav(); screenForumAdmin(); }
}
// حظر عضو من المنتدى (للمدير)
function forumBanModal() {
  const banned = new Set((C.forumBans || []).map(b => b.user_id));
  const candidates = (C.members || []).filter(m => m.is_active && m.role !== 'admin' && !banned.has(m.user_id))
    .map(m => ({ k: m.user_id, ar: (m.full_name || m.username || 'عضو') + (m.username ? ' (@' + m.username + ')' : '') }));
  openModal('حظر عضو من المنتدى', `
    <div class="muted" style="margin-bottom:8px">العضو المحظور يبقى في النظام لكنه لا يستطيع نشر مواضيع أو ردود أو إعجاب في المنتدى.</div>
    ${fSelect('العضو', 'fb_user', candidates, '', '— اختر عضواً —')}
    ${fInput('سبب الحظر (اختياري)', 'fb_reason', '')}
    <button class="btn danger" id="fb_save" style="margin-top:6px">حظر</button>`, () => {
    document.getElementById('fb_save').addEventListener('click', async () => {
      const uid = val('fb_user'); if (!uid) { toast('اختر العضو'); return; }
      const reason = val('fb_reason').trim();
      const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_bans').insert({ user_id: uid, reason }); if (error) throw error; });
      if (ok) { closeModal(); toast('تم حظر العضو'); await loadAll(); screenForumAdmin(); }
    });
  });
}

// شاشة قسم: قائمة المواضيع + بحث + إنشاء موضوع
async function screenForumCategory(catId) {
  if (!forumEnabled) { view().innerHTML = forumOffMsg(); return; }
  if (!canForumView()) { view().innerHTML = noPerm(); return; }
  catId = parseInt(catId, 10);
  const cat = forumCatById(catId);
  document.getElementById('screenTitle').textContent = cat ? cat.name : 'المنتدى';
  showLoading(true);
  let topics = [];
  try { const { data } = await sb.from('mrahi_forum_topics').select('*').eq('category_id', catId).order('is_pinned', { ascending: false }).order('last_activity', { ascending: false }); topics = data || []; } catch (e) { toast('تعذّر تحميل المواضيع'); }
  const likeMap = {};
  try { const ids = topics.map(t => t.id); if (ids.length) { const { data } = await sb.from('mrahi_forum_likes').select('topic_id').in('topic_id', ids); (data || []).forEach(l => { likeMap[l.topic_id] = (likeMap[l.topic_id] || 0) + 1; }); } } catch (e) { /* تجاهل */ }
  showLoading(false);
  const topicRow = (t) => `<div class="card click topic-item" data-topic="${t.id}">
      <div class="li-title">${t.is_pinned ? '<span class="ft-pin">📌</span>' : ''}${t.is_locked ? '<span class="ft-lock">🔒</span>' : ''}${esc(t.title)}</div>
      <div class="li-sub">${esc(t.author_name || 'عضو')}${modBadge(catId, t.author_id)} • ${timeAgo(t.last_activity)}</div>
      <div class="topic-meta"><span>💬 ${t.reply_count || 0}</span><span>👍 ${likeMap[t.id] || 0}</span><span>👁 ${t.view_count || 0}</span></div>
    </div>`;
  const draw = (list) => {
    const box = document.getElementById('ftopics'); if (!box) return;
    box.innerHTML = list.length ? list.map(topicRow).join('') : '<div class="center-empty">لا مواضيع في هذا القسم بعد. كن أول من يبدأ نقاشاً!</div>';
    box.querySelectorAll('[data-topic]').forEach(c => c.addEventListener('click', () => setHash('#/forum-topic/' + c.dataset.topic)));
  };
  const mods = forumModsOf(catId);
  const modsLine = mods.length ? `<div class="forum-mods">🛡️ مشرفو القسم: ${mods.map(m => esc(forumModName(m)) + ' (' + esc(m.title || 'مشرف') + ')').join('، ')}</div>` : '';
  view().innerHTML = `${cat ? `<div class="muted" style="margin-bottom:8px">${esc(cat.icon || '')} ${esc(cat.description || '')}</div>` : ''}
    ${modsLine}
    <div class="search"><input id="fq" placeholder="ابحث في عناوين ومحتوى المواضيع"></div>
    <div id="ftopics"></div>`;
  draw(topics);
  const fq = document.getElementById('fq');
  fq.addEventListener('input', () => { const term = fq.value.trim().toLowerCase(); draw(!term ? topics : topics.filter(t => (t.title || '').toLowerCase().includes(term) || (t.body || '').toLowerCase().includes(term))); });
  if (canCreateTopic(catId)) addFab('➕ موضوع جديد', () => forumTopicModal(catId, null));
  setupForumRealtime('forum-cat-' + catId, [{ event: '*', table: 'mrahi_forum_topics', cb: () => { const q = document.getElementById('fq'); if (parseHash().name === 'forum-cat' && !(q && q.value.trim())) screenForumCategory(catId); } }]);
}

// كتلة ردّ واحد
function postBlock(p, n, mine, canMod, canReply, depth) {
  const own = p.author_id === me.user_id;
  const ind = depth ? `margin-inline-start:${Math.min(depth, 5) * 16}px` : '';
  const showEdit = (own && can('forum', 'edit')) || canMod;
  const showDel = (own && can('forum', 'delete')) || canMod;
  const hasManage = showEdit || showDel || canMod;
  return `<div class="card post${p.is_answer ? ' answer' : ''}${p.is_hidden ? ' hidden-post' : ''}${depth ? ' nested' : ''}" data-post="${p.id}" style="${ind}">
    ${p.is_answer ? '<div class="answer-tag">✅ إجابة معتمدة</div>' : ''}
    ${p.is_hidden ? '<div class="hidden-tag">🚫 مخفية</div>' : ''}
    <div class="post-head"><span class="pa-name">${esc(p.author_name || 'عضو')}${modBadge(curForumCat, p.author_id)}</span><span class="pa-time">${timeAgo(p.created_at)}${editedMark(p)}</span></div>
    <div class="post-body">${fmtBody(p.body)}</div>
    <div class="post-actions">
      ${likeBtn('post_id', p.id, n, mine)}
      ${canReply ? `<button class="btn sm outline" data-reply="${p.id}">↩︎ رد</button>` : ''}
      ${hasManage ? `<button class="btn sm outline" data-mng aria-label="إدارة">⚙️</button>` : ''}
    </div>
    ${hasManage ? `<div class="manage-row hidden">
      ${canMod ? `<button class="btn sm ${p.is_answer ? '' : 'outline'}" data-answer="${p.id}" data-cur="${p.is_answer ? '1' : '0'}">${p.is_answer ? 'إلغاء الاعتماد' : '✅ اعتماد كإجابة'}</button>` : ''}
      ${canMod ? `<button class="btn sm outline" data-hide="${p.id}" data-cur="${p.is_hidden ? '1' : '0'}">${p.is_hidden ? '👁 إظهار' : '🙈 إخفاء'}</button>` : ''}
      ${showEdit ? `<button class="btn sm outline" data-edit-post="${p.id}">✎ تعديل</button>` : ''}
      ${showDel ? `<button class="btn sm danger" data-del-post="${p.id}">🗑 حذف</button>` : ''}
    </div>` : ''}</div>`;
}
function bindReplyEvents(topicId, posts) {
  const box = document.getElementById('freplies'); if (!box) return;
  box.querySelectorAll('[data-lk]').forEach(b => b.addEventListener('click', () => { const [col, id] = b.dataset.lk.split(':'); forumToggleLike(col, id, b); }));
  box.querySelectorAll('[data-mng]').forEach(b => b.addEventListener('click', () => { const row = b.closest('.post').querySelector('.manage-row'); if (row) row.classList.toggle('hidden'); b.classList.toggle('active'); }));
  box.querySelectorAll('[data-reply]').forEach(b => b.addEventListener('click', () => forumReplyModal(topicId, parseInt(b.dataset.reply, 10), () => refreshReplies(topicId))));
  box.querySelectorAll('[data-edit-post]').forEach(b => b.addEventListener('click', () => { const p = posts.find(x => String(x.id) === b.dataset.editPost); if (p) forumPostEditModal(p, () => refreshReplies(topicId)); }));
  box.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', async () => {
    const cur = b.dataset.cur === '1';
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_posts').update({ is_answer: !cur }).eq('id', b.dataset.answer); if (error) throw error; });
    if (ok) { toast(cur ? 'أُلغي الاعتماد' : 'تم اعتماده كإجابة'); refreshReplies(topicId); }
  }));
  box.querySelectorAll('[data-hide]').forEach(b => b.addEventListener('click', async () => {
    const cur = b.dataset.cur === '1';
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_posts').update({ is_hidden: !cur }).eq('id', b.dataset.hide); if (error) throw error; });
    if (ok) { toast(cur ? 'أُظهرت المشاركة' : 'أُخفيت المشاركة'); refreshReplies(topicId); }
  }));
  box.querySelectorAll('[data-del-post]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('حذف هذا الرد وكل الردود المتفرّعة عنه؟')) return;
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_posts').delete().eq('id', b.dataset.delPost); if (error) throw error; });
    if (ok) { toast('تم الحذف'); refreshReplies(topicId); }
  }));
}
async function refreshReplies(topicId) {
  const box = document.getElementById('freplies'); if (!box) return;
  let posts = [];
  try { const { data } = await sb.from('mrahi_forum_posts').select('*').eq('topic_id', topicId).order('created_at', { ascending: true }); posts = data || []; } catch (e) { return; }
  const postLikes = {}, myPostLikes = new Set();
  try { const ids = posts.map(p => p.id); if (ids.length) { const { data } = await sb.from('mrahi_forum_likes').select('post_id,user_id').in('post_id', ids); (data || []).forEach(l => { postLikes[l.post_id] = (postLikes[l.post_id] || 0) + 1; if (l.user_id === me.user_id) myPostLikes.add(l.post_id); }); } } catch (e) { /* تجاهل */ }
  const canMod = isForumMod(curForumCat);
  const canModBtns = canMod && forumShowModTools;
  const canReply = canForumAddIn(curForumCat) && (!curForumLocked || canMod);
  // عرض شجري: كل رد يظهر متبوعاً بالردود المتفرّعة عنه مباشرة
  const renderLevel = (parentId, depth) => posts.filter(p => (p.parent_id || null) === parentId)
    .map(p => postBlock(p, postLikes[p.id] || 0, myPostLikes.has(p.id), canModBtns, canReply, depth) + renderLevel(p.id, depth + 1)).join('');
  box.innerHTML = posts.length ? renderLevel(null, 0) : '<div class="muted" style="text-align:center;padding:10px">لا ردود بعد — كن أول من يردّ.</div>';
  const rc = document.getElementById('rcount'); if (rc) rc.textContent = posts.length;
  bindReplyEvents(topicId, posts);
}

// شاشة الموضوع: التفاصيل + الردود + التحديث اللحظي
async function screenForumTopic(topicId) {
  if (!forumEnabled) { view().innerHTML = forumOffMsg(); return; }
  if (!canForumView()) { view().innerHTML = noPerm(); return; }
  topicId = parseInt(topicId, 10);
  showLoading(true);
  let topic = null;
  try { const { data } = await sb.from('mrahi_forum_topics').select('*').eq('id', topicId).maybeSingle(); topic = data; } catch (e) { /* تجاهل */ }
  let topicLikes = 0, myTopicLike = false;
  try { const { data } = await sb.from('mrahi_forum_likes').select('user_id').eq('topic_id', topicId); topicLikes = (data || []).length; myTopicLike = (data || []).some(l => l.user_id === me.user_id); } catch (e) { /* تجاهل */ }
  showLoading(false);
  if (!topic) { view().innerHTML = '<div class="center-empty">الموضوع غير موجود أو حُذف.</div>'; return; }
  // احتساب مشاهدة الموضوع مرة واحدة لكل جلسة، وإلا نعرض العدد المحمَّل
  if (!viewedTopics.has(topicId)) {
    viewedTopics.add(topicId);
    try { const { data } = await sb.rpc('mrahi_forum_topic_view', { p_topic_id: topicId }); if (typeof data === 'number') topic.view_count = data; } catch (e) { /* تجاهل */ }
  }
  curForumCat = topic.category_id;
  curForumLocked = !!topic.is_locked;
  const canMod = isForumMod(topic.category_id), mineTopic = topic.author_id === me.user_id;
  const canModUI = canMod && forumShowModTools;
  view().innerHTML = `
    <div class="card topic-head">
      <div class="th-title">${topic.is_pinned ? '📌 ' : ''}${topic.is_locked ? '🔒 ' : ''}${esc(topic.title)}</div>
      <div class="li-sub">${esc(topic.author_name || 'عضو')}${modBadge(topic.category_id, topic.author_id)} • ${timeAgo(topic.created_at)}${editedMark(topic)} • ${esc(forumCatName(topic.category_id))} • 👁 ${topic.view_count || 0}</div>
      ${topic.body ? `<div class="post-body">${fmtBody(topic.body)}</div>` : ''}
      <div class="post-actions">
        ${likeBtn('topic_id', topic.id, topicLikes, myTopicLike)}
        ${(((mineTopic && can('forum', 'edit')) || (mineTopic && can('forum', 'delete')) || canModUI)) ? `<button class="btn sm outline" data-mng-topic>⚙️ إدارة</button>` : ''}
      </div>
      <div class="manage-row hidden" id="topicManage">
        ${((mineTopic && can('forum', 'edit')) || canModUI) ? `<button class="btn sm outline" data-edit-topic>✎ تعديل</button>` : ''}
        ${((mineTopic && can('forum', 'delete')) || canModUI) ? `<button class="btn sm danger" data-del-topic>🗑 حذف</button>` : ''}
        ${canModUI ? `<button class="btn sm" data-pin>${topic.is_pinned ? 'إلغاء التثبيت' : '📌 تثبيت'}</button>` : ''}
        ${canModUI ? `<button class="btn sm" data-lock>${topic.is_locked ? '🔓 فتح' : '🔒 إغلاق'}</button>` : ''}
      </div>
    </div>
    <div class="forum-replies-h">الردود (<span id="rcount">${topic.reply_count || 0}</span>)</div>
    <div id="freplies"></div>
    ${forumBanned()
      ? '<div class="center-empty" style="padding:18px">🚷 أنت محظور من المشاركة في المنتدى.</div>'
      : (!canForumAddIn(topic.category_id)
        ? ''
        : (topic.is_locked && !canMod
          ? '<div class="center-empty" style="padding:18px">🔒 هذا الموضوع مغلق ولا يقبل ردوداً جديدة.</div>'
          : `<div class="card composer"><textarea id="freply" placeholder="اكتب ردّك..."></textarea><button class="btn" id="fsend">إرسال الرد</button></div>`))}`;
  // أحداث مستوى الموضوع
  const mt = view().querySelector('[data-mng-topic]'); if (mt) mt.addEventListener('click', () => { const r = document.getElementById('topicManage'); if (r) r.classList.toggle('hidden'); mt.classList.toggle('active'); });
  const lk = view().querySelector('.topic-head [data-lk]'); if (lk) lk.addEventListener('click', () => { const [col, id] = lk.dataset.lk.split(':'); forumToggleLike(col, id, lk); });
  const et = view().querySelector('[data-edit-topic]'); if (et) et.addEventListener('click', () => forumTopicModal(topic.category_id, topic));
  const dt = view().querySelector('[data-del-topic]'); if (dt) dt.addEventListener('click', async () => {
    if (!await confirm2('حذف الموضوع وكل ردوده نهائياً؟')) return;
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_topics').delete().eq('id', topic.id); if (error) throw error; });
    if (ok) { toast('تم الحذف'); setHash(topic.category_id ? '#/forum-cat/' + topic.category_id : '#/forum'); }
  });
  const pin = view().querySelector('[data-pin]'); if (pin) pin.addEventListener('click', async () => {
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_topics').update({ is_pinned: !topic.is_pinned }).eq('id', topic.id); if (error) throw error; });
    if (ok) { toast(topic.is_pinned ? 'أُلغي التثبيت' : 'تم التثبيت'); screenForumTopic(topicId); }
  });
  const lock = view().querySelector('[data-lock]'); if (lock) lock.addEventListener('click', async () => {
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_topics').update({ is_locked: !topic.is_locked }).eq('id', topic.id); if (error) throw error; });
    if (ok) { toast(topic.is_locked ? 'فُتح الموضوع' : 'أُغلق الموضوع'); screenForumTopic(topicId); }
  });
  const send = document.getElementById('fsend');
  if (send) send.addEventListener('click', async () => {
    const ta = document.getElementById('freply'); const body = ta.value.trim();
    if (!body) { toast('اكتب ردّاً'); return; }
    send.disabled = true;
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_posts').insert({ topic_id: topicId, body, author_id: me.user_id, author_name: me.full_name || '' }); if (error) throw error; });
    send.disabled = false;
    if (ok) { ta.value = ''; refreshReplies(topicId); }
  });
  await refreshReplies(topicId);
  // تحديث لحظي للردود
  setupForumRealtime('forum-topic-' + topicId, [{ event: '*', table: 'mrahi_forum_posts', filter: 'topic_id=eq.' + topicId, cb: () => { if (parseHash().name === 'forum-topic') refreshReplies(topicId); } }]);
}

// مودالات المنتدى
function forumTopicModal(catId, t) {
  const cats = (C.forumCats || []).map(c => ({ k: String(c.id), ar: c.name }));
  openModal(t ? 'تعديل الموضوع' : 'موضوع جديد', `
    ${fSelect('القسم', 'ft_cat', cats, String(t ? t.category_id : catId))}
    ${fInput('العنوان', 'ft_title', t && t.title)}
    ${fTextarea('المحتوى', 'ft_body', t && t.body)}
    <button class="btn" id="ft_save" style="margin-top:6px">${t ? 'حفظ' : 'نشر الموضوع'}</button>`, () => {
    document.getElementById('ft_save').addEventListener('click', async () => {
      const category_id = parseInt(val('ft_cat'), 10) || null;
      const title = val('ft_title').trim(), body = val('ft_body').trim();
      if (!title) { toast('أدخل العنوان'); return; }
      const ok = await guard(async () => {
        if (t) { const { error } = await sb.from('mrahi_forum_topics').update({ title, body, category_id, updated_at: new Date().toISOString() }).eq('id', t.id); if (error) throw error; }
        else { const { error } = await sb.from('mrahi_forum_topics').insert({ title, body, category_id, author_id: me.user_id, author_name: me.full_name || '' }); if (error) throw error; }
      });
      if (ok) { closeModal(); toast(t ? 'تم الحفظ' : 'تم نشر الموضوع'); if (t) screenForumTopic(t.id); else setHash('#/forum-cat/' + category_id); }
    });
  });
}
// الرد على مشاركة معيّنة (يظهر متداخلاً تحتها مباشرة)
function forumReplyModal(topicId, parentId, after) {
  openModal('رد على المشاركة', `${fTextarea('ردّك أو توضيحك', 'fr_body', '')}<button class="btn" id="fr_save" style="margin-top:6px">إرسال الرد</button>`, () => {
    document.getElementById('fr_save').addEventListener('click', async () => {
      const body = val('fr_body').trim(); if (!body) { toast('اكتب ردّاً'); return; }
      const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_posts').insert({ topic_id: topicId, parent_id: parentId, body, author_id: me.user_id, author_name: me.full_name || '' }); if (error) throw error; });
      if (ok) { closeModal(); toast('تم إرسال الرد'); if (after) after(); }
    });
  });
}
function forumPostEditModal(p, after) {
  openModal('تعديل الرد', `${fTextarea('المحتوى', 'fp_body', p.body)}<button class="btn" id="fp_save" style="margin-top:6px">حفظ</button>`, () => {
    document.getElementById('fp_save').addEventListener('click', async () => {
      const body = val('fp_body').trim(); if (!body) { toast('اكتب المحتوى'); return; }
      const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_posts').update({ body, updated_at: new Date().toISOString() }).eq('id', p.id); if (error) throw error; });
      if (ok) { closeModal(); toast('تم الحفظ'); if (after) after(); }
    });
  });
}
function forumCatModal(c) {
  openModal(c ? 'تعديل القسم' : 'قسم جديد', `
    ${fInput('الاسم', 'fc_name', c && c.name)}
    ${fInput('الأيقونة (إيموجي)', 'fc_icon', c ? c.icon : '💬')}
    ${fInput('الوصف', 'fc_desc', c && c.description)}
    ${fInput('الترتيب', 'fc_sort', c ? c.sort : 0, 'number')}
    <button class="btn" id="fc_save" style="margin-top:6px">حفظ</button>
    ${c ? '<button class="btn danger" id="fc_del" style="margin-top:8px">حذف القسم</button>' : ''}`, () => {
    document.getElementById('fc_save').addEventListener('click', async () => {
      const name = val('fc_name').trim(); if (!name) { toast('أدخل الاسم'); return; }
      const obj = { name, icon: val('fc_icon').trim() || '💬', description: val('fc_desc').trim(), sort: num('fc_sort') };
      const ok = await guard(async () => { if (c) { const { error } = await sb.from('mrahi_forum_categories').update(obj).eq('id', c.id); if (error) throw error; } else { const { error } = await sb.from('mrahi_forum_categories').insert(obj); if (error) throw error; } });
      if (ok) { closeModal(); toast('تم الحفظ'); await loadAll(); (parseHash().name === 'forum-admin' ? screenForumAdmin() : screenForum()); }
    });
    const del = document.getElementById('fc_del');
    if (del) del.addEventListener('click', async () => {
      if (!await confirm2('حذف القسم؟ ستبقى مواضيعه لكن بلا قسم.')) return;
      const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_categories').delete().eq('id', c.id); if (error) throw error; });
      if (ok) { closeModal(); toast('تم الحذف'); await loadAll(); (parseHash().name === 'forum-admin' ? screenForumAdmin() : screenForum()); }
    });
  });
}

// تحديث الشاشة المناسبة بعد تعديل المشرفين
function forumModsRefresh(catId) { const n = parseHash().name; if (n === 'forum-admin') screenForumAdmin(); else if (n === 'forum-cat') screenForumCategory(catId); }
// إدارة مشرفي قسم (للمدير): تعيين عضو مشرفاً مع تعريف، وإزالته
function forumModsModal(catId) {
  const mods = forumModsOf(catId);
  const candidates = (C.members || []).filter(m => m.is_active).map(m => ({ k: m.user_id, ar: (m.full_name || m.username || 'عضو') + (m.username ? ' (@' + m.username + ')' : '') }));
  openModal('مشرفو القسم', `
    <div class="muted" style="margin-bottom:8px">المشرف يستطيع تثبيت/إغلاق المواضيع وحذف/تعديل أي محتوى داخل هذا القسم فقط، ويظهر تعريفه بجانب اسمه.</div>
    <div id="fmodlist">${mods.length ? mods.map(m => `<div class="fmod-row"><span>${esc(forumModName(m))} <span class="badge mod">🛡️ ${esc(m.title || 'مشرف')}</span></span><button class="btn sm danger" data-rmmod="${m.id}">إزالة</button></div>`).join('') : '<div class="muted">لا مشرفين بعد.</div>'}</div>
    <hr style="border:none;border-top:1px solid #eee;margin:12px 0">
    <div class="li-title sm" style="margin-bottom:6px">➕ تعيين مشرف</div>
    ${fSelect('العضو', 'fm_user', candidates, '', '— اختر عضواً —')}
    ${fInput('التعريف (مثل: بيطري، مربي، خبير أعلاف)', 'fm_title', '')}
    <button class="btn" id="fm_add" style="margin-top:6px">تعيين مشرفاً</button>`, () => {
    document.getElementById('fm_add').addEventListener('click', async () => {
      const uid = val('fm_user'), title = val('fm_title').trim();
      if (!uid) { toast('اختر العضو'); return; }
      const mm = (C.members || []).find(x => x.user_id === uid);
      const member_name = mm ? (mm.full_name || mm.username || '') : '';
      const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_moderators').upsert({ category_id: catId, user_id: uid, title, member_name }, { onConflict: 'category_id,user_id' }); if (error) throw error; });
      if (ok) { closeModal(); toast('تم التعيين'); await loadAll(); forumModsRefresh(catId); }
    });
    document.querySelectorAll('[data-rmmod]').forEach(b => b.addEventListener('click', async () => {
      if (!await confirm2('إزالة هذا المشرف؟')) return;
      const ok = await guard(async () => { const { error } = await sb.from('mrahi_forum_moderators').delete().eq('id', b.dataset.rmmod); if (error) throw error; });
      if (ok) { closeModal(); toast('تمت الإزالة'); await loadAll(); forumModsRefresh(catId); }
    }));
  });
}

/* ===== المودال ===== */
function openModal(title, body, onMount) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `<div class="modal-bg"><div class="modal"><h3>${esc(title)}</h3>${body}<button class="btn outline" id="modalClose" style="margin-top:10px">إلغاء</button></div></div>`;
  root.querySelector('.modal-bg').addEventListener('click', e => { if (e.target.classList.contains('modal-bg')) closeModal(); });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  if (onMount) onMount();
}
function closeModal() { document.getElementById('modalRoot').innerHTML = ''; }

const noPerm = () => '<div class="center-empty">ليست لديك صلاحية الوصول لهذا القسم.<br>راجع مدير النظام.</div>';

/* ===== شاشة بانتظار التفعيل ===== */
function renderPending() {
  document.getElementById('screenTitle').textContent = 'مراح';
  document.getElementById('backBtn').classList.add('hidden');
  document.getElementById('bottomnav').innerHTML = '';
  document.querySelectorAll('.fab').forEach(f => f.remove());
  view().innerHTML = `<div class="center-empty"><div style="font-size:3rem">⏳</div>
    <h3>حسابك بانتظار موافقة المدير</h3>
    <p class="muted">تم إنشاء حسابك كـ«صاحب حلال». بمجرّد موافقة المدير ستتمكّن من الدخول وإدارة حلالك الخاص. أعد تسجيل الدخول بعد التفعيل.</p>
    <div class="muted">${esc((me && me.full_name) || '')}</div></div>`;
}

/* ===== المصادقة ===== */
function buildNav() {
  const tabs = [['#/home', '🏠', 'الرئيسية']];
  if (can('animals', 'view')) tabs.push(['#/animals', '🐑', 'الحلال']);
  if (!window.MRAH_LOCAL && forumEnabled && canForumView()) tabs.push(['#/forum', '💬', 'المنتدى']);
  if (can('animals', 'view') || can('breeding', 'view') || can('vaccines', 'view') || can('treatments', 'view')) tabs.push(['#/alerts', '🔔', 'التنبيهات']);
  tabs.push(['#/more', '☰', 'المزيد']);
  const nav = document.getElementById('bottomnav');
  nav.style.gridTemplateColumns = `repeat(${tabs.length},1fr)`;
  nav.innerHTML = tabs.map(([r, i, l]) => {
    const badge = (r === '#/more' && window.mrahiUpdateInfo) ? '<span class="nav-badge"></span>' : '';
    return `<button class="nav-item" data-route="${r}"><span class="nav-ic">${i}${badge}</span>${l}</button>`;
  }).join('');
  nav.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => setHash(b.dataset.route)));
}
// الدخول بالجوال أو اسم المستخدم — نبني بريداً داخلياً خفياً لكل حساب.
const normPhone = (s) => (s || '').replace(/\D/g, '');           // أرقام فقط
const phoneToEmail = (p) => `${p}@mrahi.app`;                    // بريد داخلي وهمي
const pinToPass = (pin) => `${pin}@Mrahi`;                       // لاحقة ثابتة لتجاوز حد الطول
const PIN_RE = /^\d{4}$/;
// حقل رقم سري مع زر عين لإظهار/إخفاء القيمة
function pinField(label, id) {
  return `<div class="field pw">
    <label>${label}</label>
    <input id="${id}" type="password" inputmode="numeric" maxlength="4" pattern="\\d*" autocomplete="off">
    <button type="button" class="eye" data-eye="${id}" aria-label="إظهار/إخفاء الرقم السري">👁</button>
  </div>`;
}

function renderAuth() {
  document.getElementById('app').classList.add('hidden');
  const box = document.getElementById('auth'); box.classList.remove('hidden');
  let mode = 'signin';
  let acctType = 'owner';   // نوع الحساب عند التسجيل: صاحب حلال / زائر
  function draw() {
    const typeSel = `
      <div class="acct-type">
        <button type="button" id="ty_owner" class="${acctType === 'owner' ? 'active' : ''}">🐑 صاحب حلال</button>
        <button type="button" id="ty_visitor" class="${acctType === 'visitor' ? 'active' : ''}">👤 زائر</button>
      </div>
      <div class="muted acct-hint">${acctType === 'owner'
        ? 'تدير حلالك الخاص (بهائمك، تلقيحك، تطعيماتك…) بخصوصية تامة. يُفعّل حسابك بعد موافقة المدير.'
        : 'تتصفّح وتشارك في المنتدى والنصائح. الدخول فوري بلا انتظار، دون إدارة حلال.'}</div>`;
    box.innerHTML = `<div class="auth-box">
      <div class="logo">🐪</div><h2>مراح</h2><div class="sub">إدارة الحلال — دخول الفريق</div>
      <div class="auth-tabs"><button id="t_in" class="${mode === 'signin' ? 'active' : ''}">دخول</button>${signupOpen ? `<button id="t_up" class="${mode === 'signup' ? 'active' : ''}">حساب جديد</button>` : ''}</div>
      ${signupOpen ? '' : '<div class="muted" style="text-align:center;font-size:.85rem;margin:-4px 0 8px">التسجيل مغلق حالياً. راجع مدير النظام.</div>'}
      ${mode === 'signup'
        ? typeSel +
          fInput('الاسم', 'a_name', '') +
          fInput('رقم الجوال', 'a_phone', '', 'tel', 'inputmode="tel"') +
          fInput('اسم المستخدم (اختياري)', 'a_user', '', 'text', 'autocomplete="off"') +
          pinField('الرقم السري (٤ أرقام)', 'a_pin')
        : fInput('الجوال أو اسم المستخدم', 'a_id', '') +
          pinField('الرقم السري (٤ أرقام)', 'a_pin')}
      <button class="btn" id="a_submit">${mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}</button>
      <div class="auth-msg" id="a_msg"></div>
      ${window.MRAH_APK ? '<button class="btn outline" id="a_switch" style="margin-top:12px">🔧 تغيير وضع قاعدة البيانات</button>' : ''}</div>`;
    { const sw = document.getElementById('a_switch'); if (sw) sw.addEventListener('click', switchBackend); }
    document.getElementById('t_in').addEventListener('click', () => { mode = 'signin'; draw(); });
    { const up = document.getElementById('t_up'); if (up) up.addEventListener('click', () => { mode = 'signup'; draw(); }); }
    { const o = document.getElementById('ty_owner'); if (o) o.addEventListener('click', () => { acctType = 'owner'; draw(); }); }
    { const z = document.getElementById('ty_visitor'); if (z) z.addEventListener('click', () => { acctType = 'visitor'; draw(); }); }
    if (!signupOpen && mode === 'signup') { mode = 'signin'; }
    document.getElementById('a_submit').addEventListener('click', submit);
    box.querySelectorAll('.eye').forEach(b => b.addEventListener('click', () => {
      const inp = document.getElementById(b.dataset.eye);
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      b.textContent = show ? '🙈' : '👁';
    }));
    box.querySelectorAll('input').forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
  }
  async function submit() {
    const msg = document.getElementById('a_msg'); msg.className = 'auth-msg';
    const pin = val('a_pin').trim();
    if (!PIN_RE.test(pin)) { msg.classList.add('err'); msg.textContent = 'الرقم السري يجب أن يكون ٤ أرقام'; return; }
    msg.textContent = '… لحظة';
    try {
      if (mode === 'signin') {
        const ident = val('a_id').trim();
        if (!ident) { msg.classList.add('err'); msg.textContent = 'أدخل الجوال أو اسم المستخدم'; return; }
        // المُعرّف قد يكون جوالاً أو اسم مستخدم → حوّله إلى البريد الداخلي
        const digits = normPhone(ident);
        const { data: email } = await sb.rpc('mrahi_resolve_login', { ident: digits || ident });
        const loginEmail = email || (digits ? phoneToEmail(digits) : null);
        if (!loginEmail) { msg.classList.add('err'); msg.textContent = 'بيانات الدخول غير صحيحة'; return; }
        const { error } = await sb.auth.signInWithPassword({ email: loginEmail, password: pinToPass(pin) });
        if (error) throw error;
      } else {
        const full_name = val('a_name').trim();
        const phone = normPhone(val('a_phone'));
        const username = val('a_user').trim();
        if (!full_name) { msg.classList.add('err'); msg.textContent = 'أدخل الاسم'; return; }
        if (phone.length < 7) { msg.classList.add('err'); msg.textContent = 'أدخل رقم جوال صحيح'; return; }
        const { data, error } = await sb.auth.signUp({
          email: phoneToEmail(phone), password: pinToPass(pin),
          options: { data: { full_name, username, phone, app: 'mrahi', account_type: acctType } },
        });
        if (error) throw error;
        // الزائر: دخول فوري. صاحب الحلال: بانتظار موافقة المدير.
        if (!data.session) {
          msg.classList.add('ok');
          msg.textContent = acctType === 'visitor'
            ? 'تم إنشاء حساب الزائر. سجّل الدخول للمشاركة في المنتدى.'
            : 'تم إنشاء حسابك كصاحب حلال. ينتظر موافقة المدير، ثم سجّل الدخول.';
          mode = 'signin'; return;
        }
      }
    } catch (e) {
      msg.classList.add('err'); msg.textContent = translateAuthError(e.message);
    }
  }
  draw();
}
function translateAuthError(m) {
  if (/Invalid login/i.test(m)) return 'بيانات الدخول غير صحيحة';
  if (/already registered/i.test(m)) return 'رقم الجوال مسجّل مسبقاً';
  if (/duplicate key|unique constraint/i.test(m)) return 'الجوال أو اسم المستخدم مستخدم مسبقاً';
  if (/Database error saving/i.test(m)) return 'الجوال أو اسم المستخدم مستخدم مسبقاً';
  if (/Password should be at least/i.test(m)) return 'الرقم السري قصير';
  if (/Email not confirmed/i.test(m)) return 'أوقِف «تأكيد البريد» في إعدادات Supabase';
  return m;
}

async function enterApp(session) {
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  showLoading(true);
  // تحميل صف العضو الحالي
  const { data: mem } = await sb.from('mrahi_members').select('*').eq('user_id', session.user.id).maybeSingle();
  me = mem || { user_id: session.user.id, full_name: '', role: 'member', is_active: false, perms: {}, is_sysadmin: false, account_type: 'owner' };
  buildNav();   // بعد تحميل الصلاحيات حتى يظهر تبويب المنتدى حسبها
  if (!me.is_active) { showLoading(false); renderPending(); return; }
  try { await loadAll(); } catch (e) { toast('خطأ تحميل: ' + e.message); }
  // احتساب زيارة الموقع مرة واحدة لكل تحميل صفحة (لا يتكرر مع تجديد الجلسة)
  if (!siteVisitCounted) {
    siteVisitCounted = true;
    try { const { data } = await sb.rpc('mrahi_site_visit'); if (typeof data === 'number') siteVisits = data; } catch (e) { /* تجاهل */ }
  }
  buildNav();   // إعادة البناء بعد تحميل إعدادات المنتدى (التفعيل/التعطيل)
  showLoading(false);
  if (!location.hash) location.hash = '#/home';
  render();
}

/* ===== التهيئة ===== */
function configMissing() {
  const c = window.MRAH_CONFIG || {};
  return !c.SUPABASE_URL || c.SUPABASE_URL.includes('YOUR_PROJECT') || !c.SUPABASE_ANON_KEY || c.SUPABASE_ANON_KEY.includes('YOUR_');
}
function showSetup() {
  showLoading(false);
  document.getElementById('app').classList.add('hidden');
  const box = document.getElementById('auth'); box.classList.remove('hidden');
  box.innerHTML = `<div class="auth-box"><div class="logo">⚙️</div><h2>إعداد مطلوب</h2>
    <p class="sub">افتح ملف <b>config.js</b> وضع رابط مشروع Supabase والمفتاح العام (anon key)، ثم أعد التحميل.</p>
    <p class="muted" style="font-size:.85rem">ونفّذ ملف <b>schema.sql</b> في Supabase → SQL Editor لإنشاء الجداول والصلاحيات.</p></div>`;
}

// ===== اختيار قاعدة البيانات (في تطبيق الأندرويد) =====
// يحفظ الاختيار محلياً: 'local' (هذا الجهاز فقط) أو 'cloud' (Supabase مشترك + عنوانه ومفتاحه).
const BK = {
  get: () => { try { return localStorage.getItem('mrahi_backend'); } catch (e) { return null; } },
  set: (v) => { try { localStorage.setItem('mrahi_backend', v); } catch (e) {} },
  cloud: () => { try { return { url: localStorage.getItem('mrahi_cloud_url') || '', key: localStorage.getItem('mrahi_cloud_key') || '' }; } catch (e) { return { url: '', key: '' }; } },
  saveCloud: (url, key) => { try { localStorage.setItem('mrahi_cloud_url', url); localStorage.setItem('mrahi_cloud_key', key); } catch (e) {} },
  reset: () => { try { ['mrahi_backend', 'mrahi_cloud_url', 'mrahi_cloud_key'].forEach(k => localStorage.removeItem(k)); } catch (e) {} },
};

// شاشة الإعداد أول مرة: محلي أو مشترك
function renderBackendChooser() {
  showLoading(false);
  document.getElementById('app').classList.add('hidden');
  const box = document.getElementById('auth'); box.classList.remove('hidden');
  box.innerHTML = `<div class="auth-box">
    <div class="logo">🐪</div><h2>مراح</h2><div class="sub">اختر مكان حفظ بياناتك</div>
    <button class="btn" id="bk_local">📵 محلي على هذا الجهاز<br><span style="font-weight:400;font-size:.8rem;opacity:.85">يعمل بلا إنترنت • بياناتك على جوالك فقط • بلا تسجيل دخول</span></button>
    <button class="btn outline" id="bk_cloud" style="margin-top:10px">☁️ مشترك (عدّة مستخدمين)<br><span style="font-weight:400;font-size:.8rem;opacity:.85">قاعدة Supabase واحدة • تسجيل دخول وصلاحيات • يحدّدها المدير</span></button>
    <div id="bk_cloud_form" class="hidden" style="margin-top:14px;text-align:right">
      <div class="muted" style="font-size:.82rem;margin-bottom:8px">أدخل بيانات مشروع Supabase (من المدير). تُحفظ على هذا الجهاز.</div>
      ${fInput('عنوان المشروع (Project URL)', 'bk_url', '', 'url', 'placeholder="https://xxxx.supabase.co" inputmode="url" autocomplete="off"')}
      ${fInput('المفتاح العام (anon key)', 'bk_key', '', 'text', 'placeholder="eyJ..." autocomplete="off"')}
      <button class="btn" id="bk_connect">اتصال</button>
      <div class="auth-msg" id="bk_msg"></div>
    </div>
  </div>`;
  document.getElementById('bk_local').addEventListener('click', () => { BK.set('local'); startLocalMode(); });
  document.getElementById('bk_cloud').addEventListener('click', () => {
    document.getElementById('bk_cloud_form').classList.remove('hidden');
    document.getElementById('bk_url').focus();
  });
  document.getElementById('bk_connect').addEventListener('click', () => {
    const msg = document.getElementById('bk_msg'); msg.className = 'auth-msg';
    const url = val('bk_url').trim().replace(/\/+$/, '');
    const key = val('bk_key').trim();
    if (!/^https:\/\/.+\.supabase\.co$/i.test(url)) { msg.classList.add('err'); msg.textContent = 'عنوان المشروع غير صحيح (مثال: https://xxxx.supabase.co)'; return; }
    if (key.length < 20) { msg.classList.add('err'); msg.textContent = 'المفتاح العام غير صحيح'; return; }
    BK.saveCloud(url, key); BK.set('cloud');
    window.MRAH_CONFIG = { SUPABASE_URL: url, SUPABASE_ANON_KEY: key };
    startCloudMode();
  });
}

// الوضع المحلي: قاعدة بيانات محلية، مستخدم واحد، بلا تسجيل دخول
async function startLocalMode() {
  window.MRAH_LOCAL = true;
  document.getElementById('auth').classList.add('hidden');
  sb = window.createMrahLocalClient();
  document.getElementById('signoutBtn').classList.add('hidden');
  me = { user_id: 'local', full_name: '', role: 'admin', is_active: true, is_sysadmin: true, perms: {}, account_type: 'owner' };
  forumEnabled = false; signupOpen = false;
  document.getElementById('app').classList.remove('hidden');
  showLoading(true);
  try { await loadAll(); } catch (e) { toast('خطأ تحميل: ' + e.message); }
  buildNav();
  showLoading(false);
  if (!location.hash) location.hash = '#/home';
  render();
}

// الوضع السحابي: Supabase + مصادقة الفريق (الويب، أو التطبيق المشترك)
async function startCloudMode() {
  window.MRAH_LOCAL = false;
  sb = window.supabase.createClient(window.MRAH_CONFIG.SUPABASE_URL, window.MRAH_CONFIG.SUPABASE_ANON_KEY);
  document.getElementById('signoutBtn').classList.remove('hidden');
  document.getElementById('signoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); });
  sb.auth.onAuthStateChange((event, session) => {
    if (session && session.user) { enterApp(session); }
    else { me = null; renderAuth(); }
  });
  await loadSignupOpen();
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) await enterApp(session); else { showLoading(false); renderAuth(); }
}

// تبديل وضع القاعدة لاحقاً (من شاشة «المزيد» في التطبيق)
async function switchBackend() {
  if (!await confirm2('تغيير وضع قاعدة البيانات؟ سيُعاد تشغيل التطبيق لتختار من جديد. (لن تُحذف بياناتك المحلية أو السحابية)')) return;
  if (window.MRAH_LOCAL === false && sb && sb.auth) { try { await sb.auth.signOut(); } catch (e) {} }
  BK.reset();
  location.hash = '';
  location.reload();
}

// ===== بوابة التفعيل (ترخيص مربوط بالجهاز) =====
function renderLicenseGate() {
  showLoading(false);
  document.getElementById('app').classList.add('hidden');
  const box = document.getElementById('auth'); box.classList.remove('hidden');
  const lic = window.MrahiLicense;
  const st = lic.state();
  const expiredMsg = st.state === 'expired' ? '<div class="auth-msg err">انتهت صلاحية الترخيص — أدخل رمزاً جديداً.</div>' : '';
  box.innerHTML = `<div class="auth-box">
    <div class="logo">🔐</div><h2>تفعيل مراح</h2>
    <p class="sub">أرسل «رقم الجهاز» للمالك ليصلك رمز التفعيل، ثم الصقه هنا.</p>
    <div class="field"><label>رقم الجهاز</label>
      <div id="lic_dev" style="font-size:1.35rem;font-weight:800;letter-spacing:2px;text-align:center;color:#1b5e20;background:#f4f6f4;border:1px solid #d8d8d8;border-radius:12px;padding:14px;direction:ltr;-webkit-user-select:text;user-select:text">${lic.deviceIdPretty()}</div>
      <button class="btn outline" id="lic_copy" style="width:100%;margin-top:8px">📋 نسخ رقم الجهاز</button></div>
    ${expiredMsg}
    <div class="field"><label>رمز التفعيل</label><textarea id="lic_key" rows="3" placeholder="الصق رمز التفعيل هنا" style="width:100%"></textarea></div>
    <button class="btn" id="lic_go">تفعيل</button>
    <div class="auth-msg" id="lic_msg"></div>
    <div class="muted" style="margin-top:14px;font-size:.8rem;text-align:center;cursor:pointer" id="lic_owner">أنا المالك</div>
  </div>`;
  document.getElementById('lic_copy').addEventListener('click', async () => { const ok = await copyText(lic.deviceId()); toast(ok ? 'نُسخ رقم الجهاز ✅' : 'تعذّر النسخ — اضغط مطوّلاً على الرقم لتحديده ونسخه يدوياً'); });
  document.getElementById('lic_go').addEventListener('click', () => {
    const msg = document.getElementById('lic_msg'); msg.className = 'auth-msg';
    const r = lic.tryActivate(document.getElementById('lic_key').value);
    if (r.ok) { msg.classList.add('ok'); msg.textContent = r.dur === 0 ? 'تم التفعيل ✅ (ترخيص دائم)' : `تم التفعيل ✅ (${r.dur} يوم)`; setTimeout(() => location.reload(), 800); }
    else { msg.classList.add('err'); msg.textContent = 'رمز غير صالح لهذا الجهاز.'; }
  });
  document.getElementById('lic_owner').addEventListener('click', () => {
    const s = prompt('بذرة المالك (64 hex):'); if (!s) return;
    if (lic.recoverWithSeed(s)) { toast('تم تفعيل المالك (دائم)'); setTimeout(() => location.reload(), 800); } else toast('بذرة غير مطابقة');
  });
}

async function init() {
  document.getElementById('backBtn').addEventListener('click', goBack);
  document.getElementById('guideBtn').addEventListener('click', () => setHash('#/guide'));
  window.addEventListener('hashchange', () => { if (me && me.is_active) render(); });
  // إشارة توفّر تحديث (يطلقها updater.js): نقطة على «المزيد» وإبراز الزر
  const onUpdSignal = () => { if (!me || !me.is_active) return; buildNav(); if (parseHash().name === 'more') render(); };
  window.addEventListener('mrahi-update-available', onUpdSignal);
  window.addEventListener('mrahi-update-applied', onUpdSignal);

  // تطبيق الأندرويد (APK): بوابة التفعيل أولاً (ترخيص مربوط بالجهاز)
  if (window.MRAH_APK) {
    if (window.MrahiLicense) { const s = window.MrahiLicense.state().state; if (s !== 'active' && s !== 'disabled') { renderLicenseGate(); return; } }
    const choice = BK.get();
    if (choice === 'local') { startLocalMode(); return; }
    if (choice === 'cloud') {
      const c = BK.cloud();
      if (c.url && c.key) { window.MRAH_CONFIG = { SUPABASE_URL: c.url, SUPABASE_ANON_KEY: c.key }; startCloudMode(); return; }
    }
    renderBackendChooser();   // أول تشغيل أو إعداد ناقص
    return;
  }

  // الويب: Supabase عبر config.js
  if (configMissing()) { showSetup(); return; }
  startCloudMode();
}

init();
