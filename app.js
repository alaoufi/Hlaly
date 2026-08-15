/* حلالي — تطبيق أندرويد محلّي بالكامل — قاعدة بيانات على الجهاز (IndexedDB)، بلا إنترنت ولا خادم */
'use strict';

/* ===== مسميات ===== */
let TYPES = [
  { k: 'camel', ar: 'إبل', gest: 390, puberty: 36, weaning: 12 }, { k: 'sheep', ar: 'غنم', gest: 150, puberty: 7, weaning: 3 },
  { k: 'goat', ar: 'ماعز', gest: 150, puberty: 7, weaning: 3 }, { k: 'cattle', ar: 'بقر', gest: 283, puberty: 15, weaning: 7 },
];
const SEX = [{ k: 'female', ar: 'أنثى' }, { k: 'male', ar: 'ذكر' }];
const STATUS = [{ k: 'present', ar: 'موجودة' }, { k: 'sold', ar: 'مباعة' }, { k: 'dead', ar: 'نافقة' }, { k: 'given', ar: 'اهداء' }, { k: 'missing', ar: 'مفقودة' }, { k: 'slaughtered', ar: 'ذُبحت (استهلاك)' }];
// أيقونة كل حالة (للعرض في القوائم)
const STATUS_ICON = { present: '🟢', sold: '💰', dead: '📉', given: '🎁', missing: '🔎', slaughtered: '🔪' };
// حالات الإضافة (كيف دخلت): ولادة/شراء/اهداء
const SOURCE = [{ k: 'born', ar: 'ولادة' }, { k: 'purchased', ar: 'شراء' }, { k: 'gift', ar: 'اهداء' }];
// حالات الإجراء (كيف خرجت): مباعة/نافقة/اهداء (تُعرض عند التعديل فقط)
const EXIT = [{ k: 'sold', ar: 'مباعة' }, { k: 'dead', ar: 'نافقة' }, { k: 'given', ar: 'اهداء' }, { k: 'missing', ar: 'مفقودة' }, { k: 'slaughtered', ar: 'ذُبحت (استهلاك)' }];
// غرض الذكر: فحل يبقى للقطيع، أو معدّ للبيع/التسمين
const MALE_PURPOSE = [{ k: 'sire', ar: '🐏 فحل للقطيع' }, { k: 'sale', ar: '💰 معدّ للبيع' }];
// الغرض العامّ لأي بهيمة (مواليد أو مشترى): تربية أو للبيع
const DESIGN = [{ k: 'raise', ar: '🌱 تربية' }, { k: 'sale', ar: '💰 للبيع' }];
const TREAT_FORM = [{ k: 'injection', ar: 'إبر' }, { k: 'oral', ar: 'تجريع' }, { k: 'spray', ar: 'رش' }, { k: 'topical', ar: 'دهن' }];
const IDKIND = [{ k: 'number', ar: 'رقم' }, { k: 'tag', ar: 'وسم' }, { k: 'chip', ar: 'شريحة إلكترونية' }, { k: 'name', ar: 'اسم / مسمى' }, { k: 'color', ar: 'لون / علامة' }, { k: 'none', ar: 'بدون' }];
const KIND_LABEL = { number: 'الرقم', tag: 'الوسم', chip: 'رقم الشريحة', name: 'الاسم/المسمى' };
// بطاقة حقول مولود واحد ضمن تعدّد المواليد (نفس البنية في شاشة الإضافة ونافذة النتاج) — prefix: 'b'|'ob'
function newbornFieldsHtml(prefix, i, defSex, defBirth) {
  return `<div class="card"><h3>👶 المولود ${i}</h3>`
    + fSelect('نوع المعرّف الخارجي', prefix + '_kind_' + i, IDKIND, 'number')
    + fInput('المعرّف الخارجي / الوسم (اختياري)', prefix + '_code_' + i, '')
    + fSelect('لون الوسم', prefix + '_tagcolor_' + i, strOpts(tagColors()), '')
    + fSelect('شكل الوسم', prefix + '_tagshape_' + i, strOpts(tagShapes()), '')
    + fInput('الاسم / المسمى (اختياري)', prefix + '_name_' + i, '')
    + fSelect('الجنس', prefix + '_sex_' + i, SEX, defSex)
    + `<div id="${prefix}_purposeBox_${i}">${fSelect('غرض الذكر', prefix + '_purpose_' + i, MALE_PURPOSE, '', '— غير محدّد —')}</div>`
    + fSelect('الغرض', prefix + '_des_' + i, DESIGN, '', '— غير محدّد —')
    + fInput('تاريخ الميلاد', prefix + '_birth_' + i, defBirth, 'date')
    + fInput('اللون (اختياري)', prefix + '_color_' + i, '')
    + `</div>`;
}
// ربط منطق إظهار حقول نوع المعرّف وغرض الذكر لبطاقة مولود واحدة (بعد إدراجها في DOM)
function bindNewbornFieldSync(prefix, i) {
  const wrapOf = (fid) => { const el = document.getElementById(fid); return el ? el.closest('.field') : null; };
  const syncKind = () => {
    const k = val(prefix + '_kind_' + i);
    const setW = (fid, show) => { const w = wrapOf(fid); if (w) w.style.display = show ? '' : 'none'; };
    const showCode = ['number', 'tag', 'chip', 'name'].includes(k);
    setW(prefix + '_code_' + i, showCode);
    setW(prefix + '_tagcolor_' + i, ['tag', 'color'].includes(k));
    setW(prefix + '_tagshape_' + i, k === 'tag');
    if (showCode && KIND_LABEL[k]) { const el = document.getElementById(prefix + '_code_' + i); const L = el && el.closest('.field').querySelector('label'); if (L) L.textContent = KIND_LABEL[k] + ' (اختياري — قد يتغيّر أو يسقط)'; }
  };
  const syncPurpose = () => { const pb = document.getElementById(prefix + '_purposeBox_' + i); if (pb) pb.style.display = val(prefix + '_sex_' + i) === 'male' ? '' : 'none'; };
  const ks = document.getElementById(prefix + '_kind_' + i); if (ks) ks.addEventListener('change', syncKind);
  const ss = document.getElementById(prefix + '_sex_' + i); if (ss) ss.addEventListener('change', syncPurpose);
  syncKind(); syncPurpose();
}
const PREG = [{ k: 'monitoring', ar: 'تحت المتابعة' }, { k: 'born', ar: 'ولدت' }, { k: 'not_confirmed', ar: 'لم يثبت الحمل' }, { k: 'aborted', ar: '🩸 أجهضت' }];
const arOf = (arr, k) => (arr.find(x => x.k === k) || {}).ar || '—';
const gestOf = (t) => (TYPES.find(x => x.k === t) || TYPES[1]).gest;
const pubertyOf = (t) => (TYPES.find(x => x.k === t) || {}).puberty;   // سن البلوغ (أشهر) أو undefined
const weaningOf = (t) => (TYPES.find(x => x.k === t) || {}).weaning;   // سن الفطام (أشهر) أو undefined

/* ===== أدوات ===== */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = () => document.getElementById('view');
// تحويل الأرقام العربية/الفارسية إلى لاتينية (منتقي التاريخ في أندرويد العربي قد يُرجعها عربية)
const asciiDigits = (s) => String(s == null ? '' : s).replace(/[٠-٩۰-۹]/g, d => String(d.charCodeAt(0) & 0xf));
// تاريخ اليوم بالتوقيت المحلّي (لا UTC) ليطابق منتقي التاريخ في الجهاز ومقارنات الفترة
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function addDays(d, n) { if (!d) return null; const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
function addMonths(d, n) { if (!d || n == null) return null; const x = new Date(d + 'T00:00:00'); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); }
function daysUntil(d) { if (!d) return null; return Math.round((new Date(d + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000); }
// عمر تقريبي نصّي من تاريخ الميلاد (سنة/شهر)
function ageMonths(birth) { if (!birth) return null; const b = new Date(birth + 'T00:00:00'), n = new Date(todayStr() + 'T00:00:00'); let m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth()); if (n.getDate() < b.getDate()) m--; return m < 0 ? 0 : m; }
function ageText(birth) { const m = ageMonths(birth); if (m == null) return null; const y = Math.floor(m / 12), mo = m % 12; if (y && mo) return `${y} سنة و${mo} شهر`; if (y) return `${y} سنة`; return `${mo} شهر`; }
// عمر احتساب المولود في الحظيرة (لكل نوع، بالأشهر): أصغر منه «يتبع أمّه» ولا يُعدّ في «في الحظيرة» (لكن يبقى ظاهراً)
function loadCountAge() { try { const v = JSON.parse(localStorage.getItem('mrahi_count_age')); return (v && typeof v === 'object') ? v : {}; } catch (e) { return {}; } }
function saveCountAge(o) { try { localStorage.setItem('mrahi_count_age', JSON.stringify(o || {})); } catch (e) {} }
// قاعدة الاحتساب لكل نوع: { age: أشهر, sex: 'both'|'male'|'female' } (تدعم القيمة القديمة كرقم)
function countRuleFor(type) { const v = loadCountAge()[type]; if (v == null) return { mode: 'age', age: 0, sex: 'both' }; if (typeof v === 'number') { return { mode: 'age', age: v > 0 ? v : 0, sex: 'both' }; } const age = parseInt(v.age, 10); return { mode: v.mode === 'manual' ? 'manual' : 'age', age: age > 0 ? age : 0, sex: (v.sex === 'male' || v.sex === 'female') ? v.sex : 'both' }; }
// خيار عام: احتساب الذكور والفحول ضمن عدد الحظيرة (الافتراضي: نعم)
function countIncludeMales() { try { return localStorage.getItem('mrahi_count_males') !== '0'; } catch (e) { return true; } }
function countIncludeSires() { try { return localStorage.getItem('mrahi_count_sires') !== '0'; } catch (e) { return true; } }
// خيار: إظهار المواليد غير المحتسَبة (تتبع أمّها) في قائمة الحلال أيضاً، لا فقط استبعادها من رقم «في الحظيرة». الافتراضي: تظهر.
function showUncountedInList() { try { return localStorage.getItem('mrahi_show_uncounted') !== '0'; } catch (e) { return true; } }
// قفل التعديل/الحذف: حماية إضافية للأمان — مقفول افتراضياً حتى تفتحه بنفسك لفترة محدّدة.
// لا يمنع «الإضافة» إطلاقاً — فقط تعديل/حذف بيانات موجودة (يُطبَّق مركزياً في dbUpdate/dbDelete).
const EDIT_UNLOCK_KEY = 'mrahi_edit_unlock_until';
function isEditLocked() {
  try { const until = parseInt(localStorage.getItem(EDIT_UNLOCK_KEY) || '0', 10); return !(until && Date.now() < until); }
  catch (e) { return true; }   // أي خطأ ⇒ مقفول (آمن افتراضياً)
}
function editUnlockRemainingMs() {
  try { const until = parseInt(localStorage.getItem(EDIT_UNLOCK_KEY) || '0', 10); return Math.max(0, until - Date.now()); } catch (e) { return 0; }
}
function unlockEditFor(minutes) { try { localStorage.setItem(EDIT_UNLOCK_KEY, String(Date.now() + minutes * 60000)); } catch (e) {} }
function lockEditNow() { try { localStorage.removeItem(EDIT_UNLOCK_KEY); } catch (e) {} }
// ترتيب عرض قوائم الحلال (الترقيم/تاريخ الإدخال/العمر) + اتجاه مستقل (تصاعدي/تنازلي) يُطبَّق على الثلاثة — يُضبط من الإعدادات
const SORT_MODES = [{ k: 'entry', ar: 'تاريخ الإدخال' }, { k: 'code', ar: 'الترقيم' }, { k: 'age', ar: 'العمر' }];
const SORT_DIRS = [{ k: 'desc', ar: 'تنازلي (الأحدث/الأكبر أولاً)' }, { k: 'asc', ar: 'تصاعدي (الأقدم/الأصغر أولاً)' }];
function animalSortMode() { try { const v = localStorage.getItem('mrahi_sort'); return ['entry', 'code', 'age'].includes(v) ? v : 'entry'; } catch (e) { return 'entry'; } }
function animalSortDir() { try { const v = localStorage.getItem('mrahi_sort_dir'); return ['asc', 'desc'].includes(v) ? v : 'desc'; } catch (e) { return 'desc'; } }
function sortAnimals(arr) {
  const m = animalSortMode(), mul = animalSortDir() === 'asc' ? 1 : -1, a2 = arr.slice();
  if (m === 'code') a2.sort((x, y) => { const nx = codeNumOf(x), ny = codeNumOf(y); if (nx == null && ny == null) return y.id - x.id; if (nx == null) return 1; if (ny == null) return -1; return mul * (nx - ny); });
  else if (m === 'age') a2.sort((x, y) => { const ax = x.birth ? ageMonths(x.birth) : null, ay = y.birth ? ageMonths(y.birth) : null; if (ax == null && ay == null) return y.id - x.id; if (ax == null) return 1; if (ay == null) return -1; return mul * (ax - ay); });   // أكبر عمر = أقدم ميلاداً
  else a2.sort((x, y) => mul * (x.id - y.id));   // رقم أكبر = دخول أحدث
  return a2;
}
function inHerdCount(a) {
  if (!a || a.status !== 'present') return false;
  if (a.counted === true) return true;    // أُضيفت يدوياً للعدّ
  if (a.counted === false) return false;   // أُخرجت يدوياً من العدّ
  // الذكور: الفحل البالغ لا يخضع لقاعدة «يتبع أمّه» — يُحتسب إن كان الخيار مفعّلاً ويُستبعد إن أُوقف.
  // الفحل الصغير (مولود ولم يبلغ بعد) يبقى يتبع القاعدة العادية كأي ذكر حتى يبلغ.
  // الذكر العادي: يُستبعد إن أُوقف خيار «احتساب الذكور»، وإلا يخضع لقاعدة العمر كالمعتاد.
  if (a.sex === 'male') {
    const stillYoung = a.source === 'born' && a.birth && pubertyOf(a.type) && ageMonths(a.birth) < pubertyOf(a.type);
    if (a.purpose === 'sire' && !stillYoung) return countIncludeSires();
    if (!countIncludeMales()) return false;
  }
  const c = countRuleFor(a.type);
  if (c.sex !== 'both' && a.sex !== c.sex) return true;   // القاعدة لا تنطبق على هذا الجنس
  if (c.mode === 'manual') return a.source !== 'born';     // المواليد تُضاف يدوياً؛ المشترى/الاهداء يُحتسب
  if (!c.age) return true;
  if (!a.birth) return a.source !== 'born';   // مولود بلا تاريخ ميلاد = حديث الولادة، يتبع أمّه ولا يُحتسب حتى يبلغ عمر الاحتساب
  return ageMonths(a.birth) >= c.age;
}
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
// فحول الحظيرة الموجودة حالياً — تُستخدم لملء حقل الفحل تلقائياً في التلقيح/الولادة (يبقى الحقل نصّاً حرّاً لتلقيح من خارج الحظيرة)
const siresList = () => C.animals.filter(a => a.sex === 'male' && a.purpose === 'sire' && a.status === 'present');
function sireSelectHtml(id) {
  const sires = siresList();
  if (!sires.length) return '';
  const opts = '<option value="">— اختر فحلاً من الحظيرة (أو اترك فارغاً واكتب يدوياً لتلقيح خارجي) —</option>' + sires.map(s => `<option value="${s.id}">${display(s)}</option>`).join('');
  return `<div class="field"><select id="${id}">${opts}</select></div>`;
}
// عند اختيار فحل من القائمة: يملأ حقلي رقم/اسم الفحل تلقائياً (تبقى قابلة للتعديل اليدوي)
function bindSireSelect(selectId, codeId, nameId) {
  const el = document.getElementById(selectId); if (!el) return;
  el.addEventListener('change', () => {
    const sid = parseInt(el.value, 10); if (!sid) return;
    const s = animalById(sid); if (!s) return;
    setVal(codeId, s.code || ''); setVal(nameId, s.name || '');
  });
}
// نفس الفكرة لحقل «الأب / الفحل» الموحّد (حقل واحد بدل رقم/اسم منفصلين — يُستخدم في تسجيل الولادة)
function bindSireSelectSingle(selectId, targetId) {
  const el = document.getElementById(selectId); if (!el) return;
  el.addEventListener('change', () => {
    const sid = parseInt(el.value, 10); if (!sid) return;
    const s = animalById(sid); if (!s) return;
    setVal(targetId, (s.code || '') + (s.name ? ' - ' + s.name : ''));
  });
}
const row = (k, v) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
// صفّ سجل قابل للتعديل: عنوان + تفاصيل + زرّ تعديل صغير (للتلقيح/الحمل/التطعيمات/العلاجات)
const editRow = (title, sub, attr, id) => `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #eee">
  <div style="flex:1;min-width:0"><div class="li-title" style="font-size:.95rem">${title}</div><div class="li-sub">${sub}</div></div>
  <button class="btn sm outline" data-${attr}="${id}" style="flex:0 0 auto">✎ تعديل</button></div>`;
const noItem = () => '<div class="muted">لا يوجد</div>';

/* ===== مساعدات إدخال متقدّمة: إدخال صوتي + مسح بالكاميرا ===== */
const setVal = (id, v) => { const el = document.getElementById(id); if (el) { el.value = (v == null ? '' : v); el.dispatchEvent(new Event('change', { bubbles: true })); } };
// موارد الوسائط النشطة (كاميرا/ميكروفون) — تُحرَّر بصرامة عند التنقّل أو الخروج أو الخلفية (منع تسريب الذاكرة/تعليق الجهاز)
const _media = { stream: null, rec: null, scanStop: true, recorder: null };
function releaseMedia() {
  _media.scanStop = true;
  try { if (_media.recorder && _media.recorder.state !== 'inactive') { _media.recorder.onstop = null; _media.recorder.stop(); } } catch (e) {}
  _media.recorder = null;
  try { if (_media.stream) _media.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); } catch (e) {}
  _media.stream = null;
  try { if (_media.rec) { _media.rec.onresult = _media.rec.onerror = _media.rec.onend = null; _media.rec.abort(); } } catch (e) {}
  _media.rec = null;
  try { const mr = document.getElementById('modalRoot'); if (mr && mr.querySelector('#scanVid')) { const v = mr.querySelector('#scanVid'); try { v.pause(); v.srcObject = null; } catch (e) {} mr.innerHTML = ''; } } catch (e) {}
}
const speechAvail = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
// يضيف زر 🎤 بجانب حقل ويملؤه بالتعرّف الصوتي العربي (إن توفّر في الجهاز)
function attachMic(inputId, opts = {}) {
  if (!speechAvail()) return;
  const inp = document.getElementById(inputId); if (!inp || inp.dataset.mic) return; inp.dataset.mic = '1';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'aux-btn mic-btn'; btn.textContent = '🎤'; btn.title = 'إدخال صوتي';
  inp.insertAdjacentElement('afterend', btn);
  btn.addEventListener('click', () => {
    releaseMedia();   // أوقف أي تسجيل/كاميرا سابق
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec; try { rec = new SR(); } catch (e) { toast('التعرّف الصوتي غير متاح'); return; }
    rec.lang = 'ar-SA'; rec.interimResults = false; rec.maxAlternatives = 1;
    _media.rec = rec;
    btn.classList.add('listening'); toast('🎤 تحدّث الآن…');
    const done = () => { btn.classList.remove('listening'); if (_media.rec === rec) _media.rec = null; };
    rec.onresult = (e) => {
      let t = ((e.results[0][0].transcript) || '').trim();
      if (opts.digits) { const dd = asciiDigits(t).replace(/[^\d]/g, ''); if (dd) t = dd; }
      if (opts.append && inp.value.trim()) inp.value = inp.value.trim() + ' ' + t; else inp.value = t;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    };
    rec.onerror = () => { done(); toast('تعذّر التعرّف الصوتي (تحقّق من إذن الميكروفون)'); };
    rec.onend = done;
    try { rec.start(); } catch (e) { done(); }
    setTimeout(() => { try { if (_media.rec === rec) rec.stop(); } catch (e) {} }, 15000);   // أمان: أوقف بعد ١٥ث
  });
}
const scanAvail = () => ('BarcodeDetector' in window) && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const audioRecAvail = () => (typeof MediaRecorder !== 'undefined') && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
// يضيف زر 📷 بجانب حقل لمسح باركود/QR على الوسم بالكاميرا
function attachScan(inputId) {
  if (!scanAvail()) return;
  const inp = document.getElementById(inputId); if (!inp || inp.dataset.scan) return; inp.dataset.scan = '1';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'aux-btn scan-btn'; btn.textContent = '📷'; btn.title = 'مسح الوسم بالكاميرا';
  inp.insertAdjacentElement('afterend', btn);
  btn.addEventListener('click', () => openScanner(v => { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); toast('تم مسح الوسم: ' + v); }));
}
async function openScanner(onCode) {
  releaseMedia();   // أغلق أي كاميرا/تسجيل سابق
  const root = document.getElementById('modalRoot');
  root.innerHTML = `<div class="modal-bg"><div class="modal"><h3>📷 مسح الوسم</h3>
    <video id="scanVid" playsinline muted style="width:100%;border-radius:10px;background:#000;max-height:60vh"></video>
    <div class="muted" style="margin-top:6px">وجّه الكاميرا نحو الباركود/الرمز على الوسم</div>
    <button class="btn outline" id="scanClose" style="margin-top:10px">إلغاء</button></div></div>`;
  const vid = document.getElementById('scanVid');
  let det = null; _media.scanStop = false;
  document.getElementById('scanClose').addEventListener('click', releaseMedia);
  root.querySelector('.modal-bg').addEventListener('click', e => { if (e.target.classList.contains('modal-bg')) releaseMedia(); });
  try {
    _media.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    vid.srcObject = _media.stream; await vid.play();
    det = new window.BarcodeDetector();
  } catch (e) { releaseMedia(); toast('تعذّر فتح الكاميرا (تحقّق من الإذن)'); return; }
  const tick = async () => {
    if (_media.scanStop) return;
    try { const codes = await det.detect(vid); if (codes && codes.length) { const v = (codes[0].rawValue || '').trim(); if (v) { releaseMedia(); onCode(v); return; } } } catch (e) { /* تجاهل إطاراً */ }
    if (!_media.scanStop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ===== الحالة العامة ===== */
let sb = null;        // عميل قاعدة البيانات المحلية (IndexedDB) — واجهة موحّدة from/rpc
let me = null;        // صف العضو الحالي (الصلاحيات)
const C = { animals: [], matings: [], pregnancies: [], births: [], vaccineTypes: [], vaccinations: [], treatments: [], treatmentTypes: [], backups: [], types: [], tips: [], expenses: [], medstock: [] };
// جداول الحلال المعزولة بالمالك — تُحفظ نسخة خام في C._<key> ويُعرض في التطبيق حلالي فقط
const HERD_KEYS = ['animals', 'matings', 'pregnancies', 'births', 'vaccinations', 'treatments', 'expenses', 'medstock'];
const TABLES = {
  animals: 'mrahi_animals', matings: 'mrahi_matings', pregnancies: 'mrahi_pregnancies',
  births: 'mrahi_births', vaccineTypes: 'mrahi_vaccine_types', vaccinations: 'mrahi_vaccinations',
  treatments: 'mrahi_treatments', treatmentTypes: 'mrahi_treatment_types', backups: 'mrahi_backups',
  types: 'mrahi_types',
  expenses: 'mrahi_expenses',
  medstock: 'mrahi_med_stock',
};
function can(mod, act) { return !!(me && me.is_active && (me.role === 'admin' || (me.perms && me.perms[mod] && me.perms[mod][act]))); }
const isAdmin = () => !!(me && me.role === 'admin' && me.is_active);
// مدير النظام: صلاحية منفصلة عن إدارة الحظيرة، تتحكّم بالمحتوى العام (النصائح والمعلومات)
const isSys = () => !!(me && me.is_active && me.is_sysadmin);
// صف حلال يخصّني؟ (التطبيق يعرض حلالي فقط؛ المدير يرى الكل؛ الحلال المُشارَك يُعرض في شاشة مستقلة)
function mineHerdRow(r) { return !!(me && (me.role === 'admin' || r.owner_id === me.user_id)); }
const animalById = (id) => C.animals.find(a => a.id === id);
// المعرّف الخارجي (الوسم) إن وُجد، وإلا الاسم، وإلا الرقم الداخلي الثابت #id
function display(a) { if (!a) return '—'; if (a.code) return esc(a.code) + (a.name ? ' • ' + esc(a.name) : ''); if (a.name) return esc(a.name); return 'غير مرقّمة'; }
const internalNo = () => '';   // الرقم الداخلي للنظام لا يُعرض في الواجهة (داخلي فقط)
// مصطلحات الذكر/الأنثى حسب النوع والعمر (قابلة للتخصيص من الإعدادات؛ العمر غير المعروف = بالغ «أكثر من الحدّ»)
let _terms = null;
function loadTerms() { try { return JSON.parse(localStorage.getItem('mrahi_terms') || '{}') || {}; } catch (e) { return {}; } }
function termsMap() { if (_terms === null) _terms = loadTerms(); return _terms; }
function saveTerms(o) { try { localStorage.setItem('mrahi_terms', JSON.stringify(o)); } catch (e) {} _terms = null; }
function sexTerm(a) {
  const gen = arOf(SEX, a.sex);
  const T = termsMap()[a.type]; if (!T) return gen;
  const thr = parseInt(T.age, 10) || 0;
  const mo = a.birth ? ageMonths(a.birth) : null;
  const young = mo != null && thr > 0 && mo < thr;
  const term = a.sex === 'male' ? (young ? T.ym : T.om) : (young ? T.yf : T.of);
  return (term && String(term).trim()) ? String(term).trim() : gen;
}
// تنبيهات مخصّصة: شرط (عمر بالأشهر و/أو تاريخ) + نطاق (نوع أو بهائم محدّدة) + رسالة
function loadReminders() { try { return JSON.parse(localStorage.getItem('mrahi_reminders') || '[]') || []; } catch (e) { return []; } }
function saveReminders(a) { try { localStorage.setItem('mrahi_reminders', JSON.stringify(a)); } catch (e) {} }
function reminderMatches(r) {
  let list = C.animals.filter(a => a.status === 'present');
  if (r.type) list = list.filter(a => a.type === r.type);
  if (r.animals && r.animals.length) { const s = new Set(r.animals); list = list.filter(a => s.has(a.id)); }
  if (r.months) list = list.filter(a => { const mo = a.birth ? ageMonths(a.birth) : null; return mo != null && mo >= r.months; });
  if (r.date && todayStr() < r.date) list = [];   // تاريخ لم يحن بعد
  return list;
}
function activeReminders() { return loadReminders().filter(r => r.on !== false); }

/* ===== طبقة البيانات ===== */
async function loadAll() {
  const keys = Object.keys(TABLES);
  const results = await Promise.all(keys.map(k => sb.from(TABLES[k]).select('*')));
  keys.forEach((k, i) => {
    const data = results[i].error ? [] : (results[i].data || []);
    if (HERD_KEYS.includes(k)) { C['_' + k] = data; C[k] = data.filter(r => mineHerdRow(r)); }
    else C[k] = data;
  });
  // أنواع الحلال القابلة للإدارة (تُحدّث القائمة العامة TYPES)
  try {
    const tr = await sb.from('mrahi_types').select('*');
    C.types = tr.error ? [] : (tr.data || []);
    if (C.types.length) TYPES = C.types.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(t => ({ k: t.key, ar: t.ar, gest: t.gest, puberty: t.puberty, weaning: t.weaning }));
  } catch (e) { /* تجاهل */ }
  await autoSeedTypes();      // تعبئة أنواع الحلال الافتراضية لتصبح قابلة للتعديل (مرة واحدة)
  await autoSeedVaccines();   // تعبئة أولية لأنواع التطعيمات الموصى بها (مرة واحدة) — أي تثبيت جديد
  await autoSeedTreatments(); // تعبئة أولية لأنواع العلاج الموصى بها (مرة واحدة) — أي تثبيت جديد
  await autoUpgradeLibrary(); // إيصال أي تحديث للمكتبة للأجهزة المُحدّثة تلقائياً (إضافة الناقص فقط)
  // النصائح والمعلومات (محتوى عام يديره مدير النظام)
  try {
    const tp = await sb.from('mrahi_tips').select('*');
    C.tips = tp.error ? [] : (tp.data || []);
  } catch (e) { C.tips = []; }
  try { await sb.rpc('mrahi_purge_trash'); } catch (e) { /* تنظيف أفضل جهد */ }
}
// خرائط أنواع البهائم: من المفاتيح الإنجليزية إلى الأسماء العربية في التطبيق
const SP_AR = { sheep: ['نعيم', 'حري', 'نجد', 'غنم'], goat: ['ماعز'], camel: ['إبل'], cattle: ['بقر'] };
function spAr(enArr) { const out = []; (enArr || []).forEach(s => (SP_AR[s] || []).forEach(a => { if (!out.includes(a)) out.push(a); })); return out; }
const SMALL_RUM = ['نعيم', 'حري', 'نجد', 'غنم', 'ماعز'];                 // الأغنام بأنواعها والماعز
const ALL_LIVE = ['إبل', 'نعيم', 'حري', 'نجد', 'غنم', 'ماعز', 'بقر'];   // كل الأنواع
const SR_CATTLE = SMALL_RUM.concat(['بقر']);                            // أغنام/ماعز + بقر
const VAC_NOTE = 'استرشادي — راجع نشرة المنتج والطبيب البيطري';
const LIB_VERSION = 3;
const LIB_DATA_VERSION = 1;   // ارفعه عند تحديث مكتبة التطعيمات/الأدوية ليصل الجديد تلقائياً للأجهزة المُحدّثة
const LIB_DISCLAIMER = 'ℹ️ بيانات استرشادية من مصادر عامة (WOAH/FAO/FARAD/نشرات الشركات). نشرة المنتج المُستخدَم هي المرجع القانوني، والاستخدام في الماعز/الإبل غالباً خارج التسمية فتُمدَّد مدة التحريم — راجع الطبيب البيطري.';
// مكتبة التطعيمات المُسندة (WOAH/OIE، FAO، نشرات MSD/Ceva، Merck) — تُبذَر مرة واحدة وتُتاح بزر «استيراد المكتبة».
// كل عنصر: { name, species(عربية), usage(الأمراض), age(العمر/المنشّطة/التكرار), valid(أيام الحماية), milk, meat, route, source }
const VACCINE_LIB = [
  { name: 'التسمّم المعوي/الكلوستريديا (متعدد)', species: SR_CATTLE, usage: 'التسمّم المعوي، الكلوة اللينة، الوذمة الخبيثة، الكزاز', age: 'الأولى من ٢-٣ أسابيع (جرعتان)، منشّطة بعد ٤-٦ أسابيع، ثم سنوياً', valid: 365, milk: 0, meat: 0, route: 'تحت الجلد', source: 'MSD Heptavac-P / Ceva Coglavax' },
  { name: 'التسمّم الدموي (الباستريلا)', species: SR_CATTLE, usage: 'التهاب رئوي باستريلي وتسمّم دموي', age: 'من ٣ أسابيع (جرعتان)، منشّطة بعد ٤-٦ أسابيع، ثم سنوياً', valid: 365, milk: 0, meat: 0, route: 'تحت الجلد', source: 'MSD Ovivac-P / Heptavac-P SPC' },
  { name: 'طاعون المجترات الصغيرة (PPR)', species: SMALL_RUM, usage: 'طاعون المجترات الصغيرة (فيروسي)', age: 'من ٤ أشهر، لقاح حي — كل ٣ سنوات', valid: 1095, milk: 0, meat: 0, route: 'تحت الجلد', source: 'FAO/WOAH؛ سلالة Nigeria 75/1' },
  { name: 'جدري الأغنام والماعز', species: SMALL_RUM, usage: 'الجدري (فيروسي)', age: 'من ٣ أشهر (من ٣ أسابيع وقت التفشي)، سنوياً', valid: 365, milk: 0, meat: 0, route: 'تحت الجلد', source: 'WOAH Terrestrial Manual 3.7.12' },
  { name: 'الحمى القلاعية (FMD)', species: SR_CATTLE, usage: 'الحمى القلاعية (فيروسي متعدد العترات)', age: 'من شهرين-٤ أشهر (جرعتان بفارق ٤ أسابيع)، كل ٦ أشهر', valid: 180, milk: 0, meat: 0, route: 'عضلي/تحت الجلد', source: 'WOAH FMD + MSD Vet Manual' },
  { name: 'البروسيلا Rev-1', species: SMALL_RUM, usage: 'الإجهاض المُعدي (بروسيلا) — لقاح حي', age: '٣-٥ أشهر، جرعة واحدة (الملتحمة مفضّلة)', valid: 0, milk: 0, meat: 0, route: 'ملتحمي/تحت الجلد', source: 'WOAH Rev.1 Manual', notes: 'للإناث فقط وبحذر — خطر على الإنسان عند الوخز' },
  { name: 'مرض اللسان الأزرق', species: SR_CATTLE, usage: 'اللسان الأزرق (فيروسي، حسب العترة)', age: 'من شهر واحد، سنوياً', valid: 365, milk: 0, meat: 0, route: 'تحت الجلد', source: 'WOAH؛ نشرات اللقاح المعطّل' },
  { name: 'الجمرة الخبيثة (الأنثراكس)', species: ALL_LIVE, usage: 'الجمرة الخبيثة (جرثومية)', age: '٣-٦ أشهر، سنوياً (كل ٦ أشهر بالمناطق عالية الخطورة)', valid: 365, milk: 0, meat: 21, route: 'تحت الجلد', source: 'Merck Vet Manual + MSD Anthravax', notes: 'لقاح حي (Sterne 34F2)' },
  { name: 'الكزاز (توكسويد)', species: SR_CATTLE, usage: 'الكزاز (المطثية الكزازية)', age: 'من ٣-٤ أسابيع (ضمن مجموعة الكلوستريديا)، سنوياً', valid: 365, milk: 0, meat: 0, route: 'تحت الجلد', source: 'MSU/UNL CDT guidance' },
  { name: 'جدري الإبل', species: ['إبل'], usage: 'جدري الإبل (فيروسي)', age: 'من ٦-٩ أشهر، لقاح حي — حماية عدة سنوات', valid: 1825, milk: 0, meat: 0, route: 'تحت الجلد', source: 'WOAH Terrestrial Manual 3.5.1' },
  { name: 'التهاب الجلد العقدي (LSD)', species: ['بقر'], usage: 'التهاب الجلد العقدي (فيروسي)', age: 'من ٦ أشهر، لقاح حي — سنوياً', valid: 365, milk: 0, meat: 0, route: 'تحت الجلد', source: 'WOAH؛ دراسات مدة المناعة' },
  { name: 'حمى الوادي المتصدّع (RVF)', species: ALL_LIVE, usage: 'حمى الوادي المتصدّع (فيروسي)', age: 'من ٦ أشهر (Smithburn حي — يُتجنّب في الحوامل)، كل ~٣ سنوات', valid: 1095, milk: 0, meat: 0, route: 'تحت الجلد', source: 'WOAH RVF disease card' },
  { name: 'الالتهاب الرئوي البلوري للماعز (CCPP)', species: ['ماعز'], usage: 'ذات الجنب الرئوي المُعدي للماعز (Mccp)', age: 'من ١٠ أسابيع، جرعة واحدة — سنوياً', valid: 365, milk: 0, meat: 0, route: 'تحت الجلد', source: 'WOAH Terrestrial Manual 3.7.4' },
  { name: 'الإجهاض المُعدي/المتدثّرة (EAE)', species: SMALL_RUM, usage: 'الإجهاض الحُبيبي (متدثّرة)', age: 'من ٥ أشهر، قبل التلقيح بـ٤ أسابيع على الأقل', valid: 365, milk: 0, meat: 0, route: 'تحت الجلد/عضلي', source: 'MSD/Ceva EAE SPC' },
  { name: 'داء الكلب (السعار)', species: ALL_LIVE, usage: 'داء الكلب (فيروسي)', age: 'من ٣ أشهر، منشّطة بعد سنة، ثم سنوياً', valid: 365, milk: 0, meat: 0, route: 'عضلي/تحت الجلد', source: 'Merck/MSD Nobivac Rabies' },
];
// تحويل المكتبة إلى صفوف جدول أنواع التطعيمات (تحليل أسماء الأنواع إلى مفاتيحها)
function vaccineRowsFromLib() {
  return VACCINE_LIB.map(v => ({
    name: v.name, usage: v.usage || '', dose: '', recommended_age: v.age || '',
    validity_days: v.valid || 0, milk_withdrawal_days: v.milk || 0, meat_withdrawal_days: v.meat || 0,
    withdrawal_days: Math.max(v.milk || 0, v.meat || 0),
    species: (v.species || []).map(ar => (TYPES.find(x => x.ar === ar) || {}).k).filter(Boolean),
    notes: [v.notes || VAC_NOTE, v.route ? 'طريق الإعطاء: ' + v.route : ''].filter(Boolean).join(' • '),
    source: v.source || '',
  }));
}
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
  } catch (e) { return; }                            // في حال أي خطأ تبقى الأنواع الافتراضية
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
  try {
    const { error } = await sb.from(TABLES.vaccineTypes).insert(vaccineRowsFromLib()); // إدراج دفعة واحدة
    if (error) return;                               // غالباً قبل تشغيل الترقية (عمود species) ⇒ يُعاد لاحقاً
  } catch (e) { return; }
  try { localStorage.setItem('mrahi_vaccine_types_seeded', '1'); } catch (e) { /* تجاهل */ }
  const r = await sb.from(TABLES.vaccineTypes).select('*');
  C.vaccineTypes = r.error ? C.vaccineTypes : (r.data || []);
}
// استيراد يدوي للمكتبة الموصى بها — يضيف الأنواع الناقصة فقط (للمستخدمين الذين بُذِروا سابقاً)
async function importVaccineLib() {
  const have = new Set((C.vaccineTypes || []).map(v => (v.name || '').trim()));
  const toAdd = vaccineRowsFromLib().filter(r => !have.has(r.name.trim()));
  if (!toAdd.length) { toast('مكتبة التطعيمات محدّثة — لا جديد'); return; }
  if (!await confirm2(`إضافة ${toAdd.length} نوع تطعيم موصى به للمكتبة؟`)) return;
  const ok = await guard(async () => { const { error } = await sb.from(TABLES.vaccineTypes).insert(toAdd); if (error) throw error; });
  if (ok) { toast(`أُضيف ${toAdd.length} نوع تطعيم`); await loadAll(); screenVaccineTypes(); }
}
// تطبيع اسم المكتبة لكشف التكرار: إزالة ما بين الأقواس واللاتيني والأرقام والتشكيل وتوحيد الحروف
function libNormName(s) {
  return String(s || '')
    .replace(/[\(（][^)）]*[\)）]/g, ' ')        // ما بين الأقواس (مثل FMD/الأنثراكس)
    .replace(/[A-Za-z0-9\-+./]+/g, ' ')           // اللاتيني والأرقام والرموز (Rev-1, LA200)
    .replace(/[ً-ْ]/g, '')              // التشكيل
    .replace(/[إأآا]/g, 'ا').replace(/[ىي]/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ').trim();
}
// درجة اكتمال إدخال (لاختيار الأنسب للإبقاء عند التكرار)
function libScore(r) {
  let n = 0;
  ['source', 'dose', 'usage', 'treats', 'recommended_age', 'notes'].forEach(k => { if (r[k] && String(r[k]).trim()) n++; });
  if (r.meat_withdrawal_days != null) n++;
  if (r.milk_withdrawal_days != null) n++;
  if (Array.isArray(r.species) && r.species.length) n++;
  if (r.validity_days) n++;
  return n;
}
// كشف التكرار وحذف المكرر (يُبقي الأكمل، وينقل الباقي إلى سلة المحذوفات بعد التأكيد)
function dedupeLibrary(kind) {
  const list = ((kind === 'vaccineTypes' ? C.vaccineTypes : C.treatmentTypes) || []).slice();
  const groups = {};
  list.forEach(r => { const k = libNormName(r.name); if (!k) return; (groups[k] = groups[k] || []).push(r); });
  const removals = [];
  Object.values(groups).forEach(g => {
    if (g.length < 2) return;
    const sorted = g.slice().sort((a, b) => libScore(b) - libScore(a) || (b.id || 0) - (a.id || 0));
    removals.push({ keep: sorted[0], drop: sorted.slice(1) });
  });
  const dropCount = removals.reduce((s, r) => s + r.drop.length, 0);
  if (!dropCount) { toast('لا يوجد تكرار'); return; }
  const html = removals.map(r => `<div style="padding:6px 0;border-bottom:1px solid #eee">
      <div class="li-sub" style="color:var(--green)">✅ يبقى: ${esc(r.keep.name)}</div>
      <div class="li-sub" style="color:#c62828">🗑️ يُحذف: ${r.drop.map(d => esc(d.name)).join('، ')}</div></div>`).join('');
  openModal(`كشف التكرار (${dropCount})`, `<div class="muted" style="margin-bottom:6px">سيُبقى الإدخال الأكمل بياناتٍ، ويُنقل المكرر إلى سلة المحذوفات (يمكن استعادته).</div>${html}<button class="btn danger" id="dedup_go" style="margin-top:8px">حذف المكرر (${dropCount})</button>`, () => {
    document.getElementById('dedup_go').addEventListener('click', async () => {
      const ok = await guard(async () => { for (const r of removals) for (const d of r.drop) await dbDelete(kind, d.id); });
      if (ok) { closeModal(); toast(`حُذف ${dropCount} مكرر`); await loadAll(); (kind === 'vaccineTypes' ? screenVaccineTypes : screenTreatmentTypes)(); }
    });
  });
}
async function importTreatmentLib() {
  const have = new Set((C.treatmentTypes || []).map(t => (t.name || '').trim()));
  const rows = treatmentRowsFromLib().filter(r => !have.has(r.name.trim()));
  if (!rows.length) { toast('مكتبة العلاجات محدّثة — لا جديد'); return; }
  if (!await confirm2(`إضافة ${rows.length} نوع علاج موصى به للمكتبة؟`)) return;
  const ok = await guard(async () => { const { error } = await sb.from(TABLES.treatmentTypes).insert(rows); if (error) throw error; });
  if (ok) { toast(`أُضيف ${rows.length} نوع علاج`); await loadAll(); screenTreatmentTypes(); }
}
// تحويل صفوف library.json (لقاحات/أدوية) إلى صفوف جداول التطبيق
function vaccineRowFromJson(v) {
  return { name: v.name, usage: v.usage || '', dose: '', recommended_age: v.age || '',
    validity_days: v.valid || 0, milk_withdrawal_days: v.milk || 0, meat_withdrawal_days: v.meat || 0,
    withdrawal_days: Math.max(v.milk || 0, v.meat || 0),
    species: (v.species || []).map(ar => (TYPES.find(x => x.ar === ar) || {}).k).filter(Boolean),
    notes: [v.notes || VAC_NOTE, v.route ? 'طريق الإعطاء: ' + v.route : ''].filter(Boolean).join(' • '), source: v.source || '' };
}
function treatmentRowFromJson(t) {
  const formAr = (t.form || '').split('/')[0];
  return { name: t.name, form: (TREAT_FORM.find(f => f.ar === formAr) || {}).k || null, dose: t.dose || '', duration_days: 0,
    withdrawal_days: t.meat == null ? 0 : t.meat, milk_withdrawal_days: t.milk, meat_withdrawal_days: t.meat,
    species: (t.species || []).map(ar => (TYPES.find(x => x.ar === ar) || {}).k).filter(Boolean),
    treats: t.treats || '', notes: t.notes || '', source: t.source || '' };
}
// تحديث مكتبة الأدوية واللقاحات من الإنترنت (إن توفّر) — يضيف الناقص ويحدّث البيانات المُسندة
const LIBRARY_JSON_URL = 'https://github.com/alaoufi/marahi/releases/download/apk-latest/library.json';
async function fetchLibraryJson() {
  try {
    const P = window.Capacitor && window.Capacitor.Plugins;
    if (P && P.CapacitorHttp) { const r = await P.CapacitorHttp.get({ url: LIBRARY_JSON_URL, headers: { 'Cache-Control': 'no-cache' } }); return typeof r.data === 'string' ? JSON.parse(r.data) : r.data; }
    const resp = await fetch(LIBRARY_JSON_URL, { cache: 'no-store' }); return await resp.json();
  } catch (e) { return null; }
}
async function updateLibraryFromInternet(manual) {
  const data = await fetchLibraryJson();
  if (!data || !Array.isArray(data.vaccines) || !Array.isArray(data.treatments)) { if (manual) toast('تعذّر جلب التحديث (تحقّق من الإنترنت)'); return; }
  let stored = 0; try { stored = parseInt(localStorage.getItem('mrahi_lib_online_ver') || '0', 10) || 0; } catch (e) { /* تجاهل */ }
  if (!manual && (data.version || 0) <= stored) return;   // لا جديد (تحديث تلقائي صامت)
  // يُحدَّث الصفّ فقط إن اختلفت بياناته المُسندة (تفادي إعادة كتابة المتطابق وتكدّس الأرشيف)
  const diff = (ex, r, keys) => keys.some(k => String(ex[k] == null ? '' : ex[k]) !== String(r[k] == null ? '' : r[k]));
  const VK = ['usage', 'recommended_age', 'validity_days', 'milk_withdrawal_days', 'meat_withdrawal_days', 'source'];
  const TK = ['form', 'dose', 'withdrawal_days', 'milk_withdrawal_days', 'meat_withdrawal_days', 'treats', 'source'];
  let added = 0, updated = 0;
  const ok = await guard(async () => {
    for (const v of data.vaccines) {
      const r = vaccineRowFromJson(v); const ex = (C.vaccineTypes || []).find(x => (x.name || '').trim() === r.name.trim());
      if (ex) { if (diff(ex, r, VK)) { await dbUpdate('vaccineTypes', ex.id, r, true); updated++; } } else { await dbInsert('vaccineTypes', r); added++; }
    }
    for (const t of data.treatments) {
      const r = treatmentRowFromJson(t); const ex = (C.treatmentTypes || []).find(x => (x.name || '').trim() === r.name.trim());
      if (ex) { if (diff(ex, r, TK)) { await dbUpdate('treatmentTypes', ex.id, r, true); updated++; } } else { await dbInsert('treatmentTypes', r); added++; }
    }
  });
  if (ok) {
    try { localStorage.setItem('mrahi_lib_online_ver', String(data.version || 0)); } catch (e) { /* تجاهل */ }
    await loadAll();
    if (manual) { toast(`تم التحديث من الإنترنت: +${added} جديد، ${updated} مُحدَّث`); if (location.hash.indexOf('vaccine') >= 0) screenVaccineTypes(); else if (location.hash.indexOf('treatment') >= 0) screenTreatmentTypes(); }
  } else if (manual) { toast('تعذّر حفظ التحديث'); }
}
// مكتبة الأدوية المُسندة (FARAD للتحريم، نشرات الشركات/EMA للجرعة، Merck) — تُبذَر مرة واحدة وتُتاح بزر «استيراد المكتبة».
// مدد التحريم تقريبية وللّحم/الحليب؛ الاستخدام في الماعز/الإبل غالباً خارج التسمية فتُمدَّد. نشرة المنتج هي المرجع.
// كل عنصر: { name, form(عربي), species(عربية), dose, treats, meat, milk(null=ممنوع للحليب), source, notes }
const TREATMENT_LIB = [
  { name: 'أوكسي تتراسيكلين (قصير المفعول)', form: 'إبر', species: ALL_LIVE, dose: '٦-١١ ملغم/كغم عضل/وريد كل ٢٤ ساعة', treats: 'التهاب رئوي، عين وردية، عدوى عامة', meat: 22, milk: 4, source: 'FARAD extralabel OTC', notes: 'خارج التسمية بالأغنام/الماعز' },
  { name: 'أوكسي تتراسيكلين طويل المفعول (LA200)', form: 'إبر', species: ALL_LIVE, dose: '٢٠ ملغم/كغم تحت الجلد كل ٤٨-٧٢ ساعة', treats: 'التهاب رئوي، عدوى عامة، كلاميديا', meat: 28, milk: 7, source: 'FARAD/cattle SPC', notes: 'خارج التسمية بالأغنام/الماعز — مدّد الفترة' },
  { name: 'بنسلين بروكايين G', form: 'إبر', species: ALL_LIVE, dose: '٢٠٠٠٠-٤٤٠٠٠ وحدة/كغم عضل كل ٢٤ ساعة', treats: 'عدوى موجبة الغرام، تسمّم معوي، عرج', meat: 9, milk: 2, source: 'FARAD small ruminants', notes: 'الجرعات الأعلى خارج التسمية تُطيل الفترة' },
  { name: 'بنسلين-ستربتومايسين', form: 'إبر', species: ALL_LIVE, dose: '١ مل/٢٥ كغم عضل كل ٢٤ ساعة', treats: 'عدوى عامة مختلطة، تنفسي', meat: 35, milk: 4, source: 'نشرة Norbrook/MSD', notes: 'ستربتومايسين يُطيل فترة اللحم؛ خارج التسمية' },
  { name: 'أموكسيسيلين طويل المفعول', form: 'إبر', species: ALL_LIVE, dose: '١٥ ملغم/كغم عضل كل ٤٨ ساعة', treats: 'تنفسي، التهاب ضرع، عدوى عامة', meat: 28, milk: 4, source: 'MSD Betamox LA؛ EMA MRL', notes: 'خارج التسمية في الماعز عادة' },
  { name: 'سيفتيوفور', form: 'إبر', species: SR_CATTLE, dose: '١-٢ ملغم/كغم تحت الجلد كل ٢٤ ساعة', treats: 'تنفسي، عرج، عدوى حادة', meat: 8, milk: 0, source: 'FARAD؛ Excenel/Naxcel', notes: 'يُمنع رفع الجرعة خارج التسمية' },
  { name: 'إنروفلوكساسين', form: 'إبر', species: ALL_LIVE, dose: '٥ ملغم/كغم تحت الجلد كل ٢٤ ساعة', treats: 'تنفسي، عدوى سالبة الغرام', meat: 14, milk: null, source: 'Baytril SPC؛ EMA', notes: 'الفلوروكينولونات مقيّدة خارج التسمية' },
  { name: 'فلورفينيكول', form: 'إبر', species: SR_CATTLE, dose: '٢٠ ملغم/كغم عضل كل ٤٨ ساعة أو ٤٠ تحت الجلد مرة', treats: 'تنفسي (مانهيميا، باستوريلا)', meat: 30, milk: null, source: 'Nuflor SPC؛ FARAD', notes: 'يُمنع في حيوانات الحليب' },
  { name: 'تايلوسين', form: 'إبر', species: SR_CATTLE, dose: '١٠ ملغم/كغم عضل كل ٢٤ ساعة', treats: 'تنفسي، ميكوبلازما، عرج', meat: 21, milk: 4, source: 'Tylan SPC؛ FARAD', notes: 'خارج التسمية بالأغنام/الماعز' },
  { name: 'تلميكوسين', form: 'إبر', species: ['نعيم', 'حري', 'نجد', 'غنم', 'بقر'], dose: '١٠ ملغم/كغم تحت الجلد مرة واحدة', treats: 'تنفسي (مانهيميا/باستوريلا)', meat: 28, milk: null, source: 'Micotil SPC', notes: 'قاتل للإنسان عند الحقن الخاطئ — تحت الجلد فقط، يُتجنّب بالماعز' },
  { name: 'تولاثرومايسين', form: 'إبر', species: SR_CATTLE, dose: '٢٫٥ ملغم/كغم تحت الجلد مرة واحدة', treats: 'تنفسي، عين وردية، عرج', meat: 35, milk: null, source: 'Draxxin SPC؛ EMA', notes: 'يُمنع في حيوانات الحليب' },
  { name: 'سلفاديازين-ترايميثوبريم', form: 'إبر', species: ALL_LIVE, dose: '١٥ ملغم/كغم عضل/فموي كل ٢٤ ساعة', treats: 'تنفسي، إسهال، عدوى عامة', meat: 14, milk: 3, source: 'Norodine/Tribrissen؛ FARAD', notes: 'خارج التسمية؛ السلفا تُطيل الفترة' },
  { name: 'جنتاميسين', form: 'إبر', species: SR_CATTLE, dose: '٢-٤ ملغم/كغم عضل/وريد كل ٢٤ ساعة', treats: 'عدوى سالبة الغرام حادة، إنتان', meat: 180, milk: null, source: 'FARAD aminoglycosides', notes: 'بقايا كلوية طويلة جداً — يُتجنّب في الغذاء عادة' },
  { name: 'لينكومايسين', form: 'إبر', species: SR_CATTLE, dose: '١٠ ملغم/كغم عضل كل ٢٤ ساعة', treats: 'عرج (تعفّن أظلاف)، عدوى مفاصل', meat: 14, milk: null, source: 'Lincocin SPC', notes: 'سامّ للمجترات إن أُعطي فموياً' },
  { name: 'ألبندازول', form: 'تجريع', species: ALL_LIVE, dose: '٧٫٥-١٠ ملغم/كغم فموي مرة (الماعز ١٥)', treats: 'ديدان معدية معوية ورئوية وكبد', meat: 14, milk: 5, source: 'Valbazen SPC؛ FARAD', notes: 'يُتجنّب أول ٣٠ يوم حمل (مشوّه)' },
  { name: 'فينبندازول', form: 'تجريع', species: ALL_LIVE, dose: '٥-١٠ ملغم/كغم فموي مرة (الماعز أعلى)', treats: 'ديدان معدية معوية ورئوية', meat: 14, milk: 0, source: 'Panacur SPC؛ FARAD', notes: 'آمن نسبياً في الحمل' },
  { name: 'ليفاميزول', form: 'تجريع', species: SR_CATTLE, dose: '٧٫٥ ملغم/كغم فموي مرة', treats: 'ديدان معدية معوية ورئوية', meat: 3, milk: null, source: 'Levacide SPC؛ FARAD', notes: 'هامش أمان ضيّق؛ غالباً ممنوع بالحليب' },
  { name: 'إيفرمكتين', form: 'إبر', species: ALL_LIVE, dose: '٢٠٠ ميكروغم/كغم تحت الجلد/فموي مرة', treats: 'ديدان داخلية وخارجية (جرب، قمل)', meat: 35, milk: null, source: 'Ivomec SPC؛ FARAD', notes: 'يُمنع في حيوانات الحليب' },
  { name: 'دورامكتين', form: 'إبر', species: SR_CATTLE, dose: '٢٠٠ ميكروغم/كغم تحت الجلد/عضل مرة', treats: 'ديدان داخلية وخارجية، جرب', meat: 35, milk: null, source: 'Dectomax SPC', notes: 'يُمنع في حيوانات الحليب' },
  { name: 'موكسيدكتين', form: 'تجريع', species: SR_CATTLE, dose: '٢٠٠ ميكروغم/كغم فموي / ٣٠٠ تحت الجلد', treats: 'ديدان داخلية وخارجية مقاومة', meat: 14, milk: 5, source: 'Cydectin SPC', notes: 'بعض مستحضراته مسموحة بالحليب — تحقّق' },
  { name: 'كلوسانتيل', form: 'تجريع', species: SR_CATTLE, dose: '١٠ ملغم/كغم فموي مرة', treats: 'ديدان كبد (فاشيولا)، هيمونكس، نغف', meat: 28, milk: null, source: 'Flukiver SPC', notes: 'يُمنع في حيوانات الحليب البشري' },
  { name: 'نيتروكسينيل', form: 'إبر', species: SR_CATTLE, dose: '١٠ ملغم/كغم تحت الجلد مرة', treats: 'ديدان كبد بالغة، هيمونكس', meat: 60, milk: null, source: 'Trodax SPC', notes: 'فترة لحم طويلة؛ يُمنع بالحليب' },
  { name: 'تريكلابندازول', form: 'تجريع', species: SR_CATTLE, dose: '١٠ ملغم/كغم فموي مرة', treats: 'ديدان كبد يافعة وبالغة (فاشيولا)', meat: 56, milk: null, source: 'Fasinex SPC', notes: 'يُمنع في حيوانات الحليب' },
  { name: 'برازيكوانتيل', form: 'تجريع', species: ['نعيم', 'حري', 'نجد', 'غنم', 'ماعز', 'إبل'], dose: '٣٫٥-١٥ ملغم/كغم فموي مرة', treats: 'ديدان شريطية (منيزيا)', meat: 28, milk: null, source: 'مركّب درنش (Virbac/Zoetis)', notes: 'غالباً ضمن مركّب — تحقّق المستحضر' },
  { name: 'تولترازوريل', form: 'تجريع', species: SR_CATTLE, dose: '٢٠ ملغم/كغم فموي مرة', treats: 'كوكسيديا (الإيميريا) في الصغار', meat: 42, milk: null, source: 'Baycox SPC', notes: 'يُمنع في حيوانات الحليب' },
  { name: 'ديكلازوريل', form: 'تجريع', species: SR_CATTLE, dose: '١ ملغم/كغم فموي مرة', treats: 'كوكسيديا في الحملان/الجداء', meat: 0, milk: null, source: 'Vecoxan SPC', notes: 'فترة لحم قصيرة/صفر حسب المستحضر' },
  { name: 'أميتراز', form: 'رش', species: ALL_LIVE, dose: 'حسب التخفيف على الجلد', treats: 'قراد، جرب، قمل، طفيليات خارجية', meat: 0, milk: null, source: 'نشرة المنتج', notes: 'للاستخدام الخارجي فقط' },
  { name: 'فلونكسين ميغلومين', form: 'إبر', species: ALL_LIVE, dose: '١٫١-٢٫٢ ملغم/كغم وريد كل ٢٤ ساعة', treats: 'حمى، ألم، التهاب، تسمّم داخلي', meat: 4, milk: 3, source: 'FARAD (وريد ≤٢٫٢ ملغم/كغم)', notes: 'يُفضّل الوريد؛ العضل/تحت الجلد يُطيل الفترة كثيراً' },
  { name: 'ميلوكسيكام', form: 'إبر', species: ALL_LIVE, dose: '٠٫٥ ملغم/كغم تحت الجلد/فموي مرة', treats: 'ألم، التهاب، عرج، بعد الجراحة', meat: 11, milk: 3, source: 'Metacam SPC؛ FARAD', notes: 'خارج التسمية بالأغنام/الماعز' },
  { name: 'كيتوبروفين', form: 'إبر', species: SR_CATTLE, dose: '٣ ملغم/كغم عضل/وريد كل ٢٤ ساعة', treats: 'حمى، ألم، التهاب، عرج', meat: 4, milk: 0, source: 'Ketofen SPC', notes: 'خارج التسمية بالأغنام/الماعز' },
  { name: 'ديكساميثازون', form: 'إبر', species: ALL_LIVE, dose: '٠٫٠٥-٠٫١ ملغم/كغم عضل/وريد مرة', treats: 'التهاب، صدمة، كيتوزس، حساسية', meat: 8, milk: 3, source: 'Dexadreson/Colvasone SPC', notes: 'يُجهض في أواخر الحمل — تجنّب بالحوامل' },
  { name: 'أوكسيتوسين', form: 'إبر', species: ALL_LIVE, dose: '١٠-٢٠ وحدة عضل/وريد حسب الحاجة', treats: 'تحفيز الولادة، احتباس مشيمة، إدرار حليب', meat: 0, milk: 0, source: 'Oxytocin-S SPC', notes: 'لا يُعطى قبل اتساع عنق الرحم' },
  { name: 'فيتامين AD3E', form: 'إبر', species: ALL_LIVE, dose: '١-٢ مل عضل حسب الوزن', treats: 'نقص فيتامينات، خصوبة، مناعة، نمو', meat: 0, milk: 0, source: 'نشرة المنتج', notes: 'تجنّب جرعة A الزائدة' },
  { name: 'مركّب فيتامين ب', form: 'إبر', species: ALL_LIVE, dose: '٢-٥ مل عضل/تحت الجلد حسب الوزن', treats: 'ضعف شهية، نقص ثيامين، داعم عام', meat: 0, milk: 0, source: 'نشرة المنتج', notes: 'صفر فترة غالباً — تحقّق' },
  { name: 'سيلينيوم + فيتامين هـ', form: 'إبر', species: ALL_LIVE, dose: '١ مل/٢٠ كغم عضل/تحت الجلد', treats: 'مرض العضلة البيضاء، خصوبة، نقص سيلينيوم', meat: 0, milk: 0, source: 'Dystosel/Selevit SPC', notes: 'السيلينيوم سامّ بجرعة زائدة — التزم الجرعة' },
  { name: 'كالسيوم (بوروغلوكونات)', form: 'إبر', species: ALL_LIVE, dose: '٥٠-١٠٠ مل وريد بطيء/تحت الجلد', treats: 'حمى الحليب، نقص كالسيوم، تشنّج', meat: 0, milk: 0, source: 'Calcamax/Calciject SPC', notes: 'وريد ببطء مع مراقبة القلب' },
  { name: 'محلول معالجة الجفاف (إلكتروليت)', form: 'تجريع', species: ALL_LIVE, dose: 'حسب الوزن ودرجة الجفاف', treats: 'تعويض السوائل في الإسهال والجفاف', meat: 0, milk: 0, source: 'نشرة المنتج', notes: 'يُعطى مع علاج السبب' },
  { name: 'صبغة اليود (مطهّر)', form: 'دهن', species: ALL_LIVE, dose: 'موضعي على السرّة/الجرح', treats: 'تطهير سرّة المواليد والجروح', meat: 0, milk: 0, source: 'نشرة المنتج', notes: 'للاستخدام الخارجي فقط' },
];
// تحويل مكتبة الأدوية إلى صفوف جدول أنواع العلاج (التحريم المُخزَّن = للّحم، الأهم للبيع/الذبح)
function treatmentRowsFromLib() {
  return TREATMENT_LIB.map(t => {
    const formAr = (t.form || '').split('/')[0];
    return {
      name: t.name, form: (TREAT_FORM.find(f => f.ar === formAr) || {}).k || null,
      dose: t.dose || '', duration_days: 0,
      withdrawal_days: t.meat == null ? 0 : t.meat,
      milk_withdrawal_days: t.milk, meat_withdrawal_days: t.meat,
      species: (t.species || []).map(ar => (TYPES.find(x => x.ar === ar) || {}).k).filter(Boolean),
      treats: t.treats || '', notes: t.notes || '', source: t.source || '',
    };
  });
}
async function autoSeedTreatments() {
  if (C.treatmentTypes.length) return;               // توجد بيانات مسبقاً ⇒ لا تعبئة
  let done = false; try { done = !!localStorage.getItem('mrahi_treatment_types_seeded'); } catch (e) { /* تجاهل */ }
  if (done) return;
  const rows = treatmentRowsFromLib();
  try {
    const { error } = await sb.from(TABLES.treatmentTypes).insert(rows); // إدراج دفعة واحدة (سريع)
    if (error) return;                               // غالباً قبل تشغيل الترقية (جدول/أعمدة) ⇒ يُعاد لاحقاً
  } catch (e) { return; }
  try { localStorage.setItem('mrahi_treatment_types_seeded', '1'); } catch (e) { /* تجاهل */ }
  const r = await sb.from(TABLES.treatmentTypes).select('*');
  C.treatmentTypes = r.error ? C.treatmentTypes : (r.data || []);
}
// ترقية المكتبة تلقائياً: عند رفع LIB_VERSION تُضاف الإدخالات الناقصة فقط (لا تمسّ ما عدّله المستخدم)
async function autoUpgradeLibrary() {
  let cur = 0; try { cur = parseInt(localStorage.getItem('mrahi_lib_version') || '0', 10) || 0; } catch (e) { /* تجاهل */ }
  if (cur >= LIB_VERSION) return;
  try {
    const haveV = new Set((C.vaccineTypes || []).map(v => (v.name || '').trim()));
    const addV = vaccineRowsFromLib().filter(r => !haveV.has(r.name.trim()));
    if (addV.length) { const { error } = await sb.from(TABLES.vaccineTypes).insert(addV); if (error) return; }
    const haveT = new Set((C.treatmentTypes || []).map(t => (t.name || '').trim()));
    const addT = treatmentRowsFromLib().filter(r => !haveT.has(r.name.trim()));
    if (addT.length) { const { error } = await sb.from(TABLES.treatmentTypes).insert(addT); if (error) return; }
  } catch (e) { return; }   // إن فشل (قاعدة غير جاهزة) يُعاد في التحميل التالي
  try { localStorage.setItem('mrahi_lib_version', String(LIB_VERSION)); } catch (e) { /* تجاهل */ }
  try { const rv = await sb.from(TABLES.vaccineTypes).select('*'); if (!rv.error) C.vaccineTypes = rv.data || []; } catch (e) { /* تجاهل */ }
  try { const rt = await sb.from(TABLES.treatmentTypes).select('*'); if (!rt.error) C.treatmentTypes = rt.data || []; } catch (e) { /* تجاهل */ }
}
async function refreshAndRender() {
  showLoading(true); try { await loadAll(); } catch (e) { toast('خطأ تحميل: ' + e.message); } buildNav(); showLoading(false); render();
  // فحص تحديث مكتبة الأدوية/التطعيمات من الإنترنت مرّة واحدة (صامت، لا يعطّل البدء)
  if (!window._libOnlineChecked) { window._libOnlineChecked = 1; setTimeout(() => { try { updateLibraryFromInternet(false); } catch (e) { /* تجاهل */ } }, 4000); }
}
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
function lockedError(msg) { const e = new Error(msg); e.locked = true; return e; }
// bypassLock: تستخدمها فقط تحديثات «إضافة» ضمنية (تسجيل ولادة/سونار/إجهاض/مكتبة تلقائية) — كل تعديل/حذف حقيقي يُقفل افتراضياً
async function dbUpdate(key, id, obj, bypassLock) {
  if (!bypassLock && isEditLocked()) throw lockedError('🔒 التعديل مقفول مؤقّتاً — افتحه من أيقونة ⋮ أعلى الشاشة');
  await trashSnap(key, id, 'edit'); const { error } = await sb.from(TABLES[key]).update(obj).eq('id', id); if (error) throw error;
}
async function dbDelete(key, id) {
  if (isEditLocked()) throw lockedError('🔒 الحذف مقفول مؤقّتاً — افتحه من أيقونة ⋮ أعلى الشاشة');
  await trashSnap(key, id, 'delete'); const { error } = await sb.from(TABLES[key]).delete().eq('id', id); if (error) throw error;
}
async function guard(fn) { try { await fn(); } catch (e) { const msg = (e.message || '' + e); toast(e.locked ? msg : (/Could not find the table|schema cache/i.test(msg) ? 'هذه الميزة تحتاج تنفيذ سكربت قاعدة البيانات أولاً (راجع التعليمات).' : 'تعذّر الحفظ: ' + msg)); return false; } return true; }
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
  home: { t: 'حلالي', back: false, fn: screenHome },
  animals: { t: 'الحلال', back: false, fn: screenAnimals },
  females: { t: 'الإناث', back: false, fn: screenFemales },
  newborns: { t: 'المواليد', back: false, fn: screenNewborns },
  alerts: { t: 'التنبيهات', back: false, fn: screenAlerts },
  quick: { t: 'الأدوات والعمليات', back: true, fn: screenQuickMenu },
  settings: { t: 'الإعدادات والإدارة', back: true, fn: screenSettingsMenu },
  animal: { t: 'سجل البهيمة', back: true, fn: screenAnimalDetail },
  sires: { t: 'فحول المراح', back: false, fn: screenSires },
  control: { t: 'التحكّم والإدارة', back: true, fn: screenControl },
  'animal-edit': { t: 'بهيمة', back: true, fn: screenAnimalEdit },
  mating: { t: 'تلقيح / حمل', back: true, fn: screenMating },
  pregnancies: { t: 'الحمل والمتابعة', back: true, fn: screenPregnancies },
  'vaccine-types': { t: 'أنواع التطعيمات', back: true, fn: screenVaccineTypes },
  vaccinate: { t: 'إعطاء تطعيم', back: true, fn: screenVaccinate },
  'treatment-types': { t: 'أنواع العلاج', back: true, fn: screenTreatmentTypes },
  'vaccine-plan': { t: 'برنامج التطعيم', back: true, fn: screenVaccinePlan },
  medstock: { t: 'مخزون الأدوية واللقاحات', back: true, fn: screenMedStock },
  treat: { t: 'إعطاء علاج', back: true, fn: screenTreat },
  bulk: { t: 'عمليات بالجملة', back: true, fn: screenBulk },
  backup: { t: 'النسخ الاحتياطي', back: true, fn: screenBackup },
  types: { t: 'أنواع الحلال', back: true, fn: screenTypes },
  inspect: { t: 'تفقد الحلال', back: true, fn: screenInspect },
  finance: { t: 'المصروفات والميزانية', back: false, fn: screenFinance },
  fincats: { t: 'أنواع البنود', back: true, fn: screenFinCats },
  taglists: { t: 'شكل ولون الرقم', back: true, fn: screenTagLists },
  terms: { t: 'مصطلحات الذكر والأنثى', back: true, fn: screenTerms },
  reminders: { t: 'تنبيهات مخصّصة', back: true, fn: screenReminders },
  pens: { t: 'الحظائر', back: true, fn: screenPens },
  countage: { t: 'عمر احتساب المولود', back: true, fn: screenCountAge },
  herdsettings: { t: 'إعدادات الحظيرة', back: true, fn: screenHerdSettings },
  contacts: { t: 'دليل التواصل', back: true, fn: screenContacts },
  trash: { t: 'سلة المحذوفات', back: true, fn: screenTrash },
  tips: { t: 'النصائح والمعلومات', back: true, fn: screenTips },
  guide: { t: 'دليل الاستخدام', back: true, fn: screenGuide },
};
function parseHash() { const raw = (location.hash || '#/home').replace(/^#\//, ''); const p = raw.split('/'); return { name: p[0] || 'home', arg: p[1] }; }

function render() {
  if (!me) return;
  const { name, arg } = parseHash();
  const r = ROUTES[name] || ROUTES.home;
  document.getElementById('screenTitle').textContent = r.t;
  document.getElementById('backBtn').classList.toggle('hidden', !r.back);
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.route === '#/' + name));
  document.querySelectorAll('.fab').forEach(f => f.remove());
  releaseMedia();            // حرّر الكاميرا/الميكروفون عند أي تنقّل (منع تسريب الموارد)
  window.scrollTo(0, 0);
  r.fn(arg);
}
function addFab(label, onClick) { document.querySelectorAll('.fab').forEach(f => f.remove()); const f = document.createElement('button'); f.className = 'fab'; f.textContent = label; f.addEventListener('click', onClick); document.body.appendChild(f); }

/* ===== التنبيهات (حسابات) ===== */
const upcomingBirths = () => C.pregnancies.filter(p => p.status === 'monitoring' && p.expected).filter(p => { const d = daysUntil(p.expected); return d !== null && d >= 0 && d <= 7; }).sort((a, b) => (a.expected || '').localeCompare(b.expected || ''));
const upcomingVacc = () => C.vaccinations.filter(v => v.next_due).filter(v => { const d = daysUntil(v.next_due); return d !== null && d >= 0 && d <= 30; }).sort((a, b) => (a.next_due || '').localeCompare(b.next_due || ''));
const activeTreatments = () => C.treatments.filter(t => t.withdrawal_end && daysUntil(t.withdrawal_end) >= 0).sort((a, b) => (a.withdrawal_end || '').localeCompare(b.withdrawal_end || ''));
// جرعات علاج قادمة (next_due) خلال ١٤ يوماً — لتذكير المربي بإكمال كورس العلاج
const upcomingTreatDoses = () => C.treatments.filter(t => t.next_due).filter(t => { const d = daysUntil(t.next_due); return d !== null && d >= 0 && d <= 14; }).sort((a, b) => (a.next_due || '').localeCompare(b.next_due || ''));
// أطول تحريم دواء سارٍ لبهيمة في تاريخ معيّن (من العلاجات والتطعيمات) — للتحذير عند البيع/الذبح/الحلب
function withdrawalActiveOn(animalId, dateStr) {
  const d = asciiDigits(dateStr).slice(0, 10) || todayStr();
  let latest = null;
  const consider = (end) => { const e = asciiDigits(end).slice(0, 10); if (e && e >= d && (!latest || e > latest)) latest = e; };
  C.treatments.filter(t => t.animal_id === animalId).forEach(t => consider(t.withdrawal_end));
  C.vaccinations.filter(v => v.animal_id === animalId).forEach(v => consider(v.withdrawal_end));
  return latest;   // تاريخ نصّي أو null
}

/* ===== الرئيسية ===== */
function screenHome() {
  const pres = C.animals.filter(a => a.status === 'present');
  const present = pres.filter(inHerdCount).length;   // لا يُحتسب المولود أصغر من عمر الاحتساب لنوعه
  const sold = C.animals.filter(a => a.status === 'sold').length;
  const dead = C.animals.filter(a => a.status === 'dead').length;
  const born = pres.filter(a => a.source === 'born' && !inHerdCount(a));   // مواليد حقيقيون فقط (لسّه يتبعون أمّهم ولم يُحتسبوا في الحظيرة بعد)
  const bornM = born.filter(a => a.sex === 'male').length, bornF = born.filter(a => a.sex === 'female').length;
  const births = upcomingBirths(), vaccs = upcomingVacc(), treats = activeTreatments();
  const hasHerd = can('animals', 'view');
  const roleLabel = 'صاحب حلال';
  view().innerHTML = `
    <div class="title-lg">حلالي</div>
    <div class="muted">أهلاً ${esc(me.full_name || '')} • ${roleLabel}</div>
    ${tipsHomeCards()}
    ${hasHerd ? `<div class="muted" style="font-size:.8rem;margin:2px 0 4px">اضغط أي بطاقة لعرض محتواها</div>
    <div class="stats">
      <div class="stat green" data-sfilter="present" style="cursor:pointer"><div class="n">${present}</div><div class="l">في الحظيرة</div></div>
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
    ${hasHerd && can('animals', 'edit') && C.animals.length === 0 ? `<div class="card click hl" data-go="#/animal-edit/0"><div class="li-title">➕ أضف أول بهيمة</div><div class="li-sub">ابدأ بإضافة حلالك — تختار النوع (إبل/غنم/ماعز/بقر) داخل النموذج</div></div>` : ''}
    ${hasHerd ? `<div class="search"><input id="q" placeholder="ابحث برقم/وسم/شريحة/اسم البهيمة"></div><div id="qr"></div>` : ''}
    ${can('breeding', 'view') ? `<div class="card"><h3>الولادات القادمة (٧ أيام)</h3>${births.length ? births.map(p => row(display(animalById(p.animal_id)), `${fmtDate(p.expected)} (بعد ${daysUntil(p.expected)} يوم)`)).join('') : noItem()}</div>` : ''}
    ${can('treatments', 'view') ? `<div class="card"><h3>العلاجات الحالية (تحت التحريم)</h3>${treats.length ? treats.map(t => row(display(animalById(t.animal_id)), `${esc(t.med_name)} • ينتهي ${fmtDate(t.withdrawal_end)}`)).join('') : noItem()}</div>` : ''}`;
  view().querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => setHash(c.dataset.go)));
  // بطاقات الحالة: تفتح قائمة الحلال مُرشَّحة (في الحظيرة/مباعة/نافقة)
  view().querySelectorAll('[data-sfilter]').forEach(c => c.addEventListener('click', () => { animalFilter = ''; animalSourceSel = ALL_SOURCES.slice(); animalSexSel = ALL_SEXES.slice(); animalStatusSel = [c.dataset.sfilter]; saveAnimalFilters(); setHash('#/animals'); }));
  // بطاقات المواليد: تفتح المواليد الحقيقيين فقط (لسّه يتبعون أمّهم) مُرشَّحة بالجنس — نفس عدد البطاقة بالضبط
  view().querySelectorAll('[data-born]').forEach(c => c.addEventListener('click', () => { pendingNewbornFilter = c.dataset.born; setHash('#/animals'); }));
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
  const births = upcomingBirths(), vaccs = upcomingVacc(), treats = activeTreatments(), doses = upcomingTreatDoses();
  const lowMeds = lowStockMeds(), expMeds = expiringMeds();
  const vtName = (id) => { const t = C.vaccineTypes.find(x => x.id === id); return t ? t.name : 'تطعيم'; };
  const medLine = (m) => { const dl = m.expiry ? daysUntil(m.expiry) : null; const ex = dl !== null && dl < 0; return row('💊 ' + esc(m.name), `${m.qty == null ? '' : esc(String(m.qty)) + ' ' + esc(m.unit || '')}${m.expiry ? ` • ${ex ? '⛔ منتهٍ' : 'ينتهي'} ${fmtDate(m.expiry)}` : ''}`); };
  const showMeds = can('treatments', 'view') && (lowMeds.length || expMeds.length);
  // تنبيهات مخصّصة أنشأها المستخدم (تُعرض أولاً)
  const rems = activeReminders().map(r => ({ r, mt: reminderMatches(r) })).filter(x => x.mt.length);
  const remCards = rems.map(({ r, mt }) => `<div class="card" style="background:#ede7f6"><h3>🔔 ${esc(r.title || 'تنبيه')} <span class="muted" style="font-weight:400">(${mt.length})</span></h3>${mt.map(a => `<div class="row click" data-goa="${a.id}"><span class="k">${display(a)}</span><span class="v">${esc(sexTerm(a))}${a.birth ? ' • ' + (ageText(a.birth) || '') : ''}${a.pen ? ' • 🏠 ' + esc(a.pen) : ''}</span></div>`).join('')}</div>`).join('');
  view().innerHTML = remCards + `
    <div class="card" style="background:#fff8e1"><h3>🤰 ولادة متوقعة خلال ٧ أيام</h3>${births.length ? births.map(p => row(display(animalById(p.animal_id)), `${fmtDate(p.expected)} • ${daysUntil(p.expected)} يوم`)).join('') : noItem()}</div>
    <div class="card" style="background:#ffebee"><h3>🚫 انتهاء مدة التحريم (علاجات جارية)</h3>${treats.length ? treats.map(t => row(display(animalById(t.animal_id)), `${esc(t.med_name || '')} • ينتهي ${fmtDate(t.withdrawal_end)} (بعد ${daysUntil(t.withdrawal_end)} يوم)`)).join('') : noItem()}</div>
    <div class="card" style="background:#e8f5e9"><h3>💊 جرعات علاج قادمة (١٤ يوماً)</h3>${doses.length ? doses.map(t => row(display(animalById(t.animal_id)), `${esc(t.med_name || '')} • ${fmtDate(t.next_due)} (بعد ${daysUntil(t.next_due)} يوم)`)).join('') : noItem()}</div>
    <div class="card" style="background:#e3f2fd"><h3>💉 مواعيد تطعيم قادمة (٣٠ يوماً)</h3>${vaccs.length ? vaccs.map(v => row(display(animalById(v.animal_id)), `${esc(vtName(v.type_id))} • ${fmtDate(v.next_due)} (بعد ${daysUntil(v.next_due)} يوم)`)).join('') : noItem()}</div>
    ${showMeds ? `<div class="card click" style="background:#fff3e0" data-go="#/medstock"><h3>📦 مخزون الأدوية واللقاحات (تنبيه)</h3>${lowMeds.length ? `<div class="li-title" style="color:#c62828">نفد/قارب النفاد (${lowMeds.length})</div>${lowMeds.map(medLine).join('')}` : ''}${expMeds.length ? `<div class="li-title" style="color:#e65100;margin-top:6px">قارب/منتهي الصلاحية (${expMeds.length})</div>${expMeds.map(medLine).join('')}` : ''}</div>` : ''}`;
  view().querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => setHash(c.dataset.go)));
  view().querySelectorAll('[data-goa]').forEach(c => c.addEventListener('click', () => setHash('#/animal/' + c.dataset.goa)));
}

/* ===== الحلال ===== */
let animalFilter = '';
function loadFilterArr(k, def) { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : def; } catch (e) { return def; } }
function saveAnimalFilters() { try { localStorage.setItem('mrahi_f_status', JSON.stringify(animalStatusSel)); localStorage.setItem('mrahi_f_source', JSON.stringify(animalSourceSel)); localStorage.setItem('mrahi_f_sex', JSON.stringify(animalSexSel)); } catch (e) {} }
function toggleSel(arr, v) { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
// التبويب المختار في شاشة سجل البهيمة (البيانات/النسب/الإنجاب/المرضي/العلاجات/التطعيمات)
let animalRecTab = 'basic';
// مرشّحات العرض: اختيار متعدّد؛ مصفوفة فارغة = الكل. تُحفظ آخر اختيار.
// فلتر صارم: عدم تحديد أي رقاقة في صفّ = لا يطابق شيئاً (وليس «الكل»). القيم الافتراضية أدناه تختار الكل صراحةً حتى لا تظهر القائمة فارغة أول استخدام.
const ALL_SOURCES = ['born', 'purchased', 'gift', 'sale'];
const ALL_SEXES = ['male', 'female'];
let animalStatusSel = loadFilterArr('mrahi_f_status', ['present']);   // 'present'|'sold'|'dead'|...
let animalSourceSel = loadFilterArr('mrahi_f_source', ALL_SOURCES.slice());
let animalSexSel = loadFilterArr('mrahi_f_sex', ALL_SEXES.slice());
// ترحيل لمرّة واحدة: قديماً كان تفريغ صفّ المصدر/الجنس يعني «الكل» ضمنياً؛ الآن يعني «لا شيء» صراحةً —
// فإن كان المخزَّن سابقاً فارغاً (من السلوك القديم) نعيد تعبئته بـ«الكل» مرّة واحدة فقط، ثم يُحترَم تفريغه لاحقاً كما هو.
function seedAnimalFiltersOnce() {
  try {
    if (localStorage.getItem('mrahi_f_seeded')) return;
    if (!animalSourceSel.length) animalSourceSel = ALL_SOURCES.slice();
    if (!animalSexSel.length) animalSexSel = ALL_SEXES.slice();
    localStorage.setItem('mrahi_f_seeded', '1');
    saveAnimalFilters();
  } catch (e) {}
}
// طلب لمرة واحدة من بطاقات «المواليد» بالرئيسية: يعرض المواليد الحقيقيين فقط (غير المحتسَبين بعد) — يُستهلَك عند أول عرض ثم يُمسح
let pendingNewbornFilter = null;   // 'male'|'female'|'all'|null
// آخر «رقم حظيرة» مُدخَل — يُثبَّت تلقائياً في إضافة البهيمة التالية حتى يُغيَّر (إدخال أسرع للدفعات)
let lastPen = (() => { try { return localStorage.getItem('mrahi_last_pen') || ''; } catch (e) { return ''; } })();
// آخر بهيمة مُدخَلة (لِزر «نسخ من آخر إدخال» — تسريع الإدخال المتكرّر)
let lastAnimal = (() => { try { return JSON.parse(localStorage.getItem('mrahi_last_animal') || 'null'); } catch (e) { return null; } })();
function animalCard(a) {
  const st = a.status === 'sold' ? 'sold' : a.status === 'dead' ? 'dead' : '';
  const off = C.animals.filter(x => x.mother_id === a.id || x.father_id === a.id).length;   // عدد مواليدها
  const mother = a.mother_id ? animalById(a.mother_id) : null;
  // آخر تطعيم قادم/متأخّر لهذه البهيمة + فترة تحريم حية (من علاج أو تطعيم) إن وُجدت
  const nextVacc = a.status === 'present' ? C.vaccinations.filter(v => v.animal_id === a.id && v.next_due).sort((x, y) => (x.next_due || '').localeCompare(y.next_due || ''))[0] : null;
  const wd = a.status === 'present' ? withdrawalActiveOn(a.id, todayStr()) : null;
  return `<div class="card click" data-aid="${a.id}">
    <div class="li-title">${display(a)}</div>
    <div class="li-sub">${arOf(TYPES, a.type)} • ${esc(sexTerm(a))}${a.sex === 'male' && a.purpose ? ' • ' + arOf(MALE_PURPOSE, a.purpose) : ''} • <span class="badge ${st}">${arOf(STATUS, a.status)}</span></div>
    ${a.pen ? `<div class="li-sub">🏠 ${esc(a.pen)}</div>` : ''}
    ${off ? `<div class="li-sub link" data-off="${a.id}">👶 المواليد: ${off} — عرض</div>` : ''}
    ${mother ? `<div class="li-sub link" data-momopen="${a.mother_id}">🤱 الأم: ${display(mother)}</div>` : (a.mother_name ? `<div class="li-sub">🤱 الأم: ${esc(a.mother_name)}</div>` : '')}
    ${nextVacc || wd ? `<div class="li-sub" style="display:flex;gap:6px;flex-wrap:wrap">${nextVacc ? `<span class="badge">💉 ${daysUntil(nextVacc.next_due) < 0 ? 'تطعيم متأخّر منذ' : 'تطعيم قادم'} ${fmtDate(nextVacc.next_due)}</span>` : ''}${wd ? `<span class="badge dead">⛔ تحت التحريم حتى ${fmtDate(wd)}</span>` : ''}</div>` : ''}
    ${a.status === 'present' && !inHerdCount(a) && can('animals', 'edit') ? `<div class="li-sub link" data-count="${a.id}" style="color:var(--green);font-weight:700">➕ احتسابها في الحظيرة (تتبع أمّها)</div>` : ''}</div>`;
}
function bindCards(root) {
  root.querySelectorAll('[data-aid]').forEach(c => c.addEventListener('click', () => setHash('#/animal/' + c.dataset.aid)));
  root.querySelectorAll('[data-off]').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); offspringListModal(parseInt(el.dataset.off, 10)); }));
  root.querySelectorAll('[data-momopen]').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); setHash('#/animal/' + el.dataset.momopen); }));
  root.querySelectorAll('[data-count]').forEach(el => el.addEventListener('click', async (e) => { e.stopPropagation(); const id = parseInt(el.dataset.count, 10); const ok = await guard(async () => { await dbUpdate('animals', id, { counted: true }); }); if (ok) { toast('أُضيفت لعدد الحظيرة'); await loadAll(); render(); } }));
}
// قائمة مواليد أمّ بعينها (من بطاقة البهيمة)
function offspringListModal(motherId) {
  const mother = animalById(motherId);
  const off = C.animals.filter(x => x.mother_id === motherId || x.father_id === motherId).sort((a, b) => (b.birth || '').localeCompare(a.birth || ''));
  animalListModal('مواليد ' + (mother ? display(mother) : ''), off);
}
// نافذة عامة تعرض قائمة بهائم قابلة للنقر (فتح سجل كل واحدة)
function animalListModal(title, list) {
  openModal(title,
    `<div class="muted" style="margin-bottom:6px">${list.length} بهيمة</div>`
    + (list.length ? list.map(o => `<div class="card click" data-aid="${o.id}" style="margin:6px 0"><div class="li-title">${display(o)}</div><div class="li-sub">${esc(sexTerm(o))}${o.birth ? ' • ' + fmtDate(o.birth) : ''}${o.pen ? ' • ' + esc(o.pen) : ''}</div></div>`).join('') : noItem()),
    () => { document.querySelectorAll('#modalRoot [data-aid]').forEach(c => c.addEventListener('click', () => { closeModal(); setHash('#/animal/' + c.dataset.aid); })); });
}
// ربط الفحل بأبنائه/بناته والإناث اللي لقّحها — بمطابقة نصّية (اسم/رقم) مع حقل «الأب» في المواليد وحقلَي الفحل في التلقيح،
// لأن father_id (الربط المباشر) غير مُستخدَم فعلياً في أي شاشة إضافة — يبقى الحقل نصّاً حرّاً دائماً (تلقيح من داخل الحظيرة أو خارجها)
function sireMatchesText(fatherName, sire) {
  const f = String(fatherName || '').trim(); if (!f) return false;
  return f === String(sire.code || '').trim() || f === String(sire.name || '').trim();
}
function sireOffspring(sire) { return C.animals.filter(o => sireMatchesText(o.father_name, sire)); }
function sireMatedFemales(sire) {
  const ids = new Set();
  C.matings.forEach(m => {
    const sc = String(sire.code || '').trim(), sn = String(sire.name || '').trim();
    const mc = String(m.sire_code || '').trim(), mn = String(m.sire_name || '').trim();
    if ((sc && mc === sc) || (sn && mn === sn)) ids.add(m.animal_id);
  });
  return Array.from(ids).map(animalById).filter(Boolean);
}
// رقاقات نوع الحلال المشتركة (تُستخدم في الحلال/الإناث/الفحول/المواليد) — نفس المتغيّر animalFilter يبقى مشتركاً بينها كلها
function typeChipsHtml() { return `<div class="chips"><span class="chip ${!animalFilter ? 'active' : ''}" data-f="">الكل</span>${TYPES.map(t => `<span class="chip ${animalFilter === t.k ? 'active' : ''}" data-f="${t.k}">${t.ar}</span>`).join('')}</div>`; }
function bindTypeChips(rerender) { view().querySelectorAll('[data-f]').forEach(c => c.addEventListener('click', () => { animalFilter = c.dataset.f; rerender(); })); }
function screenAnimals() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  seedAnimalFiltersOnce();
  // استهلاك طلب «مواليد حقيقيون فقط» لمرة واحدة (من بطاقات الرئيسية) — يزول عند أي تفاعل لاحق مع المرشّحات
  let onlyRealNewborn = false;
  if (pendingNewbornFilter !== null) {
    animalFilter = ''; animalStatusSel = ['present']; animalSourceSel = ['born']; animalSexSel = pendingNewbornFilter === 'all' ? ALL_SEXES.slice() : [pendingNewbornFilter];
    saveAnimalFilters(); onlyRealNewborn = true; pendingNewbornFilter = null;
  }
  const chips = `<div class="chips"><span class="chip ${!animalFilter ? 'active' : ''}" data-f="">الكل</span>${TYPES.map(t => `<span class="chip ${animalFilter === t.k ? 'active' : ''}" data-f="${t.k}">${t.ar}</span>`).join('')}</div>`;
  // مرشّحات متعدّدة الاختيار: عدم تحديد أي رقاقة في صفّ = لا تُعرض أي بهيمة (فلتر صارم، ليس «الكل»)
  // مربّع اختيار (☐/☑) ليوضّح أنها متعدّدة الاختيار
  const cb = (on) => (on ? '☑' : '☐') + ' ';
  // بلا زرّ «الكل» — تفريغ الصفّ بالكامل يُخفي كل البهائم حسب هذا الصفّ
  const stChips = `<div class="chips"><span class="chip ${animalStatusSel.includes('present') ? 'active' : ''}" data-s="present">${cb(animalStatusSel.includes('present'))}في الحظيرة</span><span class="chip ${animalStatusSel.includes('sold') ? 'active' : ''}" data-s="sold">${cb(animalStatusSel.includes('sold'))}مباعة</span><span class="chip ${animalStatusSel.includes('dead') ? 'active' : ''}" data-s="dead">${cb(animalStatusSel.includes('dead'))}نافقة</span><span class="chip ${animalStatusSel.includes('given') ? 'active' : ''}" data-s="given">${cb(animalStatusSel.includes('given'))}🎁 اهداء</span><span class="chip ${animalStatusSel.includes('missing') ? 'active' : ''}" data-s="missing">${cb(animalStatusSel.includes('missing'))}🔎 مفقودة</span><span class="chip ${animalStatusSel.includes('slaughtered') ? 'active' : ''}" data-s="slaughtered">${cb(animalStatusSel.includes('slaughtered'))}🔪 ذُبحت</span></div>`;
  const srcChips = `<div class="chips"><span class="chip ${animalSourceSel.includes('born') ? 'active' : ''}" data-src="born">${cb(animalSourceSel.includes('born'))}👶 مواليد</span><span class="chip ${animalSourceSel.includes('purchased') ? 'active' : ''}" data-src="purchased">${cb(animalSourceSel.includes('purchased'))}🛒 شراء</span><span class="chip ${animalSourceSel.includes('gift') ? 'active' : ''}" data-src="gift">${cb(animalSourceSel.includes('gift'))}🎁 اهداء</span><span class="chip ${animalSourceSel.includes('sale') ? 'active' : ''}" data-src="sale">${cb(animalSourceSel.includes('sale'))}💰 للبيع (المعدّ للبيع)</span></div>`;
  const sexChips = `<div class="chips">${SEX.map(s => `<span class="chip ${animalSexSel.includes(s.k) ? 'active' : ''}" data-sex="${s.k}">${cb(animalSexSel.includes(s.k))}${s.k === 'male' ? '♂ ' : '♀ '}${s.ar}</span>`).join('')}</div>`;
  // إخفاء الذكور/الفحول من صفحة الحلال إن أُوقف احتسابهم (يبقون في صفحة الفحول ويظهرون عند تحديد مرشّح «ذكر»)
  const hideMale = (a) => a.status === 'present' && a.sex === 'male' && !animalSexSel.includes('male') && (a.purpose === 'sire' ? !countIncludeSires() : !countIncludeMales());
  // إخفاء المولود غير المحتسَب (يتبع أمّه) من القائمة كلياً إن أُوقف خيار «إظهار المواليد غير المحتسَبة»
  const hideUncounted = (a) => a.status === 'present' && !showUncountedInList() && !inHerdCount(a);
  const list = sortAnimals(C.animals.filter(a => (!animalFilter || a.type === animalFilter) && animalStatusSel.includes(a.status) && animalSourceSel.some(s => s === 'sale' ? (a.designation === 'sale' || a.purpose === 'sale') : (a.source || 'purchased') === s) && animalSexSel.includes(a.sex) && !hideMale(a) && !hideUncounted(a) && (!onlyRealNewborn || (a.source === 'born' && !inHerdCount(a)))));
  const canEdit = can('animals', 'edit');
  // عند خلو الحلال كلياً: حالة ترحيبية بزرّ إضافة واضح. وعند خلو التصنيف فقط: رسالة عادية.
  const empty = C.animals.length === 0
    ? `<div class="center-empty">🐑 لا يوجد حلال بعد.${canEdit ? '<br><button class="btn" id="add_first" style="margin-top:14px">➕ أضف أول بهيمة</button><div class="muted" style="margin-top:8px;font-size:.85rem">تختار النوع (إبل/غنم/ماعز/بقر) داخل النموذج — أضِف ما تشاء من كل نوع.</div>' : ''}</div>`
    : '<div class="center-empty">لا توجد بهائم في هذا التصنيف.</div>';
  const presentInList = list.filter(a => a.status === 'present');
  const countedInList = presentInList.filter(inHerdCount).length;
  const gapInList = presentInList.length - countedInList;
  const countRow = `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="muted">العدد: ${list.length}</span>
        ${canEdit ? '<button class="btn sm outline" id="bulkAddBtn">📋 إضافة جماعية</button>' : ''}</div>
      ${gapInList > 0 ? `<div class="muted" style="font-size:.8rem;margin-top:2px">منها ${countedInList} محتسَبة ضمن «في الحظيرة» بالرئيسية، و${gapInList} غير محتسَبة (صغار تتبع أمّها أو ذكور/فحول مستبعدون حسب الإعدادات) — <span class="link" id="goSmart" style="color:var(--green);cursor:pointer">🧠 التفاصيل</span></div>` : ''}</div>`;
  // عند عرض «الكل»: تُجمَّع البطاقات حسب النوع (كل نوع مستقلّ بعنوانه)؛ وعند تحديد نوع تُعرض مباشرةً
  let listHtml;
  if (!animalFilter) {
    const known = new Set(TYPES.map(t => t.k));
    listHtml = TYPES.map(t => { const g = list.filter(a => a.type === t.k); return g.length ? `<div class="li-title" style="margin:12px 2px 6px;color:var(--green)">🐑 ${esc(t.ar)} (${g.length})</div>` + g.map(animalCard).join('') : ''; }).join('');
    const other = list.filter(a => !known.has(a.type));
    if (other.length) listHtml += `<div class="li-title" style="margin:12px 2px 6px">أخرى (${other.length})</div>` + other.map(animalCard).join('');
  } else { listHtml = list.map(animalCard).join(''); }
  view().innerHTML = chips + stChips + srcChips + sexChips + countRow + (list.length ? listHtml : empty);
  view().querySelectorAll('[data-f]').forEach(c => c.addEventListener('click', () => { animalFilter = c.dataset.f; screenAnimals(); }));
  view().querySelectorAll('[data-s]').forEach(c => c.addEventListener('click', () => { const v = c.dataset.s; if (v === '') animalStatusSel = []; else toggleSel(animalStatusSel, v); saveAnimalFilters(); screenAnimals(); }));
  view().querySelectorAll('[data-src]').forEach(c => c.addEventListener('click', () => { const v = c.dataset.src; if (v === '') animalSourceSel = []; else toggleSel(animalSourceSel, v); saveAnimalFilters(); screenAnimals(); }));
  view().querySelectorAll('[data-sex]').forEach(c => c.addEventListener('click', () => { const v = c.dataset.sex; if (v === '') animalSexSel = []; else toggleSel(animalSexSel, v); saveAnimalFilters(); screenAnimals(); }));
  bindCards(view());
  { const af = document.getElementById('add_first'); if (af) af.addEventListener('click', () => setHash('#/animal-edit/0')); }
  { const bb = document.getElementById('bulkAddBtn'); if (bb) bb.addEventListener('click', () => setHash('#/bulk/buy')); }
  { const gs = document.getElementById('goSmart'); if (gs) gs.addEventListener('click', () => { inspectTab = 'smart'; setHash('#/inspect'); }); }
  if (canEdit) addFab('+ إضافة بهيمة', () => setHash('#/animal-edit/0'));
}

/* ===== قوائم شكل/لون الوسم (قابلة للتعديل من الإعدادات) ===== */
const TAG_COLORS_DEF = ['أحمر', 'أزرق', 'أصفر', 'أخضر', 'أبيض', 'أسود', 'برتقالي'];
const TAG_SHAPES_DEF = ['دائري', 'مربع', 'مستطيل', 'بيضاوي', 'أذن', 'علامة'];
const COLOR_HEX = { 'أحمر': '#e53935', 'أزرق': '#1e88e5', 'أصفر': '#fdd835', 'أخضر': '#43a047', 'أبيض': '#ffffff', 'أسود': '#222', 'برتقالي': '#fb8c00', 'بنفسجي': '#8e24aa', 'وردي': '#ec407a', 'بني': '#6d4c41', 'رمادي': '#9e9e9e' };
function loadList(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } }
function saveList(key, a) { try { localStorage.setItem(key, JSON.stringify(a)); } catch (e) {} }
const tagColors = () => TAG_COLORS_DEF.concat(loadList('mrahi_tag_colors'));
const tagShapes = () => TAG_SHAPES_DEF.concat(loadList('mrahi_tag_shapes'));
const strOpts = (arr) => [{ k: '', ar: '— بدون —' }].concat(arr.map(s => ({ k: s, ar: s })));
const colorDot = (name) => COLOR_HEX[name] ? `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${COLOR_HEX[name]};border:1px solid #bbb;vertical-align:middle;margin-inline-start:4px"></span>` : '';

/* ===== الحظائر: مرتبطة بنوع الحلال، قائمة منسدلة قابلة للإدارة ===== */
// كل حظيرة: { name, type, parent } — type مفتاح نوع الحلال ('' = لأي نوع)، parent اسم حظيرة رئيسية إن كانت هذه فرعاً منها ('' = رئيسية). تُخزَّن في mrahi_pens.
// التقسيم الهرمي بمستوى واحد فقط (رئيسية ← فروع) — يكفي لتقسيم حظيرة واحدة حسب الرعاية (ذكور/إناث صغار/حمل...) مع بقائها حظيرة واحدة منطقياً.
function loadPens() {
  return loadList('mrahi_pens').map(p => typeof p === 'string' ? { name: p.trim(), type: '', parent: '' } : { name: String(p.name == null ? '' : p.name).trim(), type: p.type || '', parent: String(p.parent || '').trim() }).filter(p => p.name);
}
function savePens(arr) { saveList('mrahi_pens', arr); }
// تعبئة/ترقية القائمة من حظائر البهائم الموجودة مرّة واحدة (مع إسناد النوع)
function ensurePensSeeded() {
  let done = false; try { done = !!localStorage.getItem('mrahi_pens_seeded2'); } catch (e) { /* تجاهل */ }
  if (done) return;
  const l = loadPens();
  (C.animals || []).forEach(a => { const nm = String(a.pen == null ? '' : a.pen).trim(); if (!nm) return; const tk = a.type || ''; const ex = l.find(p => p.name === nm); if (ex) { if (!ex.type && tk) ex.type = tk; } else l.push({ name: nm, type: tk, parent: '' }); });
  savePens(l);
  try { localStorage.setItem('mrahi_pens_seeded2', '1'); } catch (e) { /* تجاهل */ }
}
function allPens() { ensurePensSeeded(); return loadPens(); }
// أسماء حظائر نوعٍ معيّن (+ الحظائر غير المخصّصة لنوع)
function pensForType(typeKey) {
  return allPens().filter(p => !p.type || p.type === typeKey).map(p => p.name).filter((p, i, a) => a.indexOf(p) === i).sort((a, b) => a.localeCompare(b, 'ar'));
}
function addPen(name, type, parent) { name = String(name || '').trim(); if (!name) return; const l = loadPens(); if (!l.some(p => p.name === name)) { l.push({ name, type: type || '', parent: parent || '' }); savePens(l); } }
// الحظائر الرئيسية (بلا أب) لنوعٍ معيّن — تُستخدم كخيارات «تنتمي إلى» عند إنشاء فرع
function rootPensForType(typeKey) { return allPens().filter(p => !p.parent && (!p.type || p.type === typeKey)); }
function penChildren(name) { return allPens().filter(p => p.parent === name); }
function penOptions(selected, typeKey) {
  const sel = String(selected == null ? '' : selected).trim(); const names = pensForType(typeKey || '');
  if (sel && !names.includes(sel)) names.unshift(sel);
  return '<option value="">— حدّد الحظيرة —</option>'
    + names.map(p => `<option value="${esc(p)}" ${p === sel ? 'selected' : ''}>${esc(p)}</option>`).join('')
    + '<option value="__new__">➕ حظيرة جديدة…</option>';
}
// حقل الحظيرة بلا عنوان (أول خيار «حدّد الحظيرة» يقوم مقام العنوان)
function penField(id, selected, typeKey) {
  return `<div class="field"><select id="${id}">${penOptions(selected, typeKey)}</select>
    <input id="${id}_new" type="text" placeholder="اكتب اسم الحظيرة الجديدة" style="display:none;margin-top:6px"></div>`;
}
function bindPenField(id) {
  const s = document.getElementById(id), n = document.getElementById(id + '_new'); if (!s || !n) return;
  const upd = () => { const isNew = s.value === '__new__'; n.style.display = isNew ? '' : 'none'; if (isNew) setTimeout(() => n.focus(), 30); };
  s.addEventListener('change', upd); upd();
}
// إعادة بناء خيارات الحظيرة عند تغيير نوع الحلال
function rebuildPen(penId, typeKey) { const s = document.getElementById(penId); if (!s) return; s.innerHTML = penOptions('', typeKey); bindPenField(penId); }
function penValue(id, typeKey) { const s = val(id); if (s === '__new__') { const v = val(id + '_new').trim(); if (v) addPen(v, typeKey || ''); return v; } return s; }

/* ===== إضافة/تعديل بهيمة ===== */
function screenAnimalEdit(arg) {
  if (!can('animals', 'edit')) { view().innerHTML = noPerm(); return; }
  const id = parseInt(arg, 10) || 0;
  const a = id ? animalById(id) : null;
  const females = C.animals.filter(x => x.sex === 'female' && x.id !== id);
  document.getElementById('screenTitle').textContent = id ? 'تعديل بهيمة' : 'إضافة بهيمة';
  view().innerHTML = `
    ${!a && lastAnimal ? '<button class="btn outline" id="cloneLast" style="margin-bottom:8px">📋 نسخ بيانات آخر إدخال</button>' : ''}
    <div class="card"><h3>البيانات الأساسية</h3>
      ${a ? '' : '<div class="muted" style="margin-bottom:8px">المعرّف الخارجي (الوسم) اختياري — يمكنك تركه فارغاً وترقيمها لاحقاً.</div>'}
      ${fSelect('نوع الحلال', 'f_type', TYPES, a ? a.type : (animalFilter || 'sheep'))}
      ${penField('f_pen', a ? a.pen : '', a ? a.type : (animalFilter || 'sheep'))}
      ${fSelect('نوع المعرّف الخارجي', 'f_kind', IDKIND, a ? a.idkind : 'number')}
      ${fInput('المعرّف الخارجي / الوسم (اختياري — قد يتغيّر أو يسقط)', 'f_code', a && a.code)}
      ${fSelect('لون الوسم', 'f_tagcolor', strOpts(tagColors()), a ? (a.tag_color || '') : '')}
      ${fSelect('شكل الوسم', 'f_tagshape', strOpts(tagShapes()), a ? (a.tag_shape || '') : '')}
      ${fInput('الاسم/المسمى (اختياري)', 'f_name', a && a.name)}
      ${fSelect('الجنس', 'f_sex', SEX, a ? a.sex : 'female')}
      <div id="purposeBox">${fSelect('غرض الذكر', 'f_purpose', MALE_PURPOSE, a ? (a.purpose || '') : '', '— غير محدّد —')}</div>
      ${fSelect('المصدر', 'f_source', SOURCE, a ? (a.source || 'purchased') : 'purchased')}
      ${fSelect('الغرض', 'f_design', DESIGN, a ? (a.designation || '') : '', '— غير محدّد —')}
      ${!a ? `<div id="bcountBox">${fInput('عدد المواليد', 'f_bcount', '1', 'number', 'min="1" inputmode="numeric"')}</div>` : ''}
      <div id="buypriceBox">${fInput('سعر الشراء (اختياري)', 'f_buyprice', a && a.buy_price, 'number', 'min="0" step="any" inputmode="decimal"')}</div>
      ${!a ? `<div id="withOffBox" style="display:none">
        <div class="check"><input type="checkbox" id="f_hasoff"><label for="f_hasoff" style="margin:0">هل معها مواليد؟ (جاءت مصحوبة بمواليد عند الشراء)</label></div>
        <div id="offCountsBox" style="display:none">${fInput('عدد المواليد ذكور', 'f_offmale', '0', 'number', 'min="0" inputmode="numeric"')}${fInput('عدد المواليد إناث', 'f_offfemale', '0', 'number', 'min="0" inputmode="numeric"')}</div>
      </div>` : ''}
      ${fInput('تاريخ الميلاد (اختياري للمشترى)', 'f_birth', a && a.birth, 'date')}
      ${fInput('اللون', 'f_color', a && a.color)}
      ${a && a.status !== 'present' ? `${fSelect('الإجراء', 'f_status', EXIT, a.status)}
      <div id="saleBox">${fInput('تاريخ البيع', 'f_saledate', a.sale_date, 'date')}${fInput('سعر البيع', 'f_saleprice', a.sale_price, 'number', 'min="0" step="any" inputmode="decimal"')}</div>
      <div id="deadBox">${fInput('تاريخ النفوق', 'f_deaddate', a.dead_date, 'date')}</div>
      <div id="giftBox">${fInput('تاريخ الإهداء', 'f_giftdate', a.gift_date, 'date')}${fInput('أُهديت إلى (اختياري)', 'f_giftto', a.gift_to)}</div>
      <div id="missingBox">${fInput('تاريخ الفقد', 'f_missdate', a.missing_date, 'date')}</div>
      <div id="slaughterBox">${fInput('تاريخ الذبح', 'f_slaughterdate', a.slaughter_date, 'date')}</div>` : ''}</div>
    <div id="bornRows"></div>
    <div class="card"><h3>النسب</h3>
      <div id="motherSelectBox">${fAnimalSelect('الأم', 'f_mother', a && a.mother_id, females, '— بدون —')}</div>
      <div id="motherTextBox" style="display:none">${fInput('الأم (اسم/وصف — اختياري، من خارج الحظيرة)', 'f_mother_name', a && a.mother_name)}</div>
      ${fInput('الأب / الفحل (اسم أو رقم)', 'f_father', a && a.father_name)}</div>
    <div class="card"><h3>ملاحظات</h3>${fTextarea('ملاحظات', 'f_notes', a && a.notes)}</div>
    <button class="btn" id="saveBtn">حفظ</button>
    ${id ? '<button class="btn danger" id="delBtn">حذف البهيمة</button>' : ''}`;
  const syncExit = () => {
    const s = val('f_status');
    const sb = document.getElementById('saleBox'); if (sb) sb.style.display = s === 'sold' ? '' : 'none';
    const db = document.getElementById('deadBox'); if (db) db.style.display = s === 'dead' ? '' : 'none';
    const gb = document.getElementById('giftBox'); if (gb) gb.style.display = s === 'given' ? '' : 'none';
    const mb = document.getElementById('missingBox'); if (mb) mb.style.display = s === 'missing' ? '' : 'none';
    const slb = document.getElementById('slaughterBox'); if (slb) slb.style.display = s === 'slaughtered' ? '' : 'none';
  };
  { const fs = document.getElementById('f_status'); if (fs) { fs.addEventListener('change', syncExit); syncExit(); } }
  // غرض الذكر يظهر للذكور فقط
  const syncPurpose = () => { const pb = document.getElementById('purposeBox'); if (pb) pb.style.display = val('f_sex') === 'male' ? '' : 'none'; };
  document.getElementById('f_sex').addEventListener('change', syncPurpose); syncPurpose();
  // عدد المواليد يظهر عند الولادة فقط، وسعر الشراء عند المشترى فقط
  // عند «ولادة» وعدد > 1: تُفتح حقول كاملة مستقلّة لكل مولود (جنس/غرض/رقم مختلف لكل واحد)
  const identityFields = ['f_kind', 'f_code', 'f_tagcolor', 'f_tagshape', 'f_name', 'f_sex', 'f_design', 'f_color'];
  const fieldWrap = (fid) => { const el = document.getElementById(fid); return el ? el.closest('.field') : null; };
  // حسب نوع المعرّف الخارجي تظهر الحقول المناسبة فقط («بدون» يخفي حقل المعرّف والوسم)
  const syncKind = () => {
    const k = val('f_kind');
    const setW = (fid, show) => { const w = fieldWrap(fid); if (w) w.style.display = show ? '' : 'none'; };
    const showCode = ['number', 'tag', 'chip', 'name'].includes(k);
    setW('f_code', showCode);
    setW('f_tagcolor', ['tag', 'color'].includes(k));
    setW('f_tagshape', k === 'tag');
    if (showCode && KIND_LABEL[k]) { const el = document.getElementById('f_code'); const L = el && el.closest('.field').querySelector('label'); if (L) L.textContent = KIND_LABEL[k] + ' (اختياري — قد يتغيّر أو يسقط)'; }
  };
  const renderBornRows = () => {
    const box = document.getElementById('bornRows'); if (!box) return;
    const isBorn = val('f_source') === 'born';
    const n = isBorn ? (parseInt(val('f_bcount'), 10) || 1) : 1;
    const multi = !a && isBorn && n > 1;
    identityFields.forEach(fid => { const w = fieldWrap(fid); if (w) w.style.display = multi ? 'none' : ''; });
    const pb = document.getElementById('purposeBox'); if (pb) pb.style.display = multi ? 'none' : (val('f_sex') === 'male' ? '' : 'none');
    if (!multi) { syncKind(); box.innerHTML = ''; return; }
    // كامل حقول الإضافة مستقلّة لكل مولود (نفس عدد المواليد المُدخل)
    const defSex = val('f_sex') || 'female';
    const defBirth = val('f_birth') || todayStr();   // تاريخ ميلاد افتراضي لكل مولود (لتطبيق عمر الاحتساب)
    let html = '';
    for (let i = 1; i <= n; i++) html += newbornFieldsHtml('b', i, defSex, defBirth);
    box.innerHTML = html;
    // ربط منطق نوع المعرّف وغرض الذكر لكل مولود على حدة (نفس منطق الحقول المشتركة)
    for (let i = 1; i <= n; i++) bindNewbornFieldSync('b', i);
  };
  const syncSource = () => {
    const s = val('f_source');
    const bb = document.getElementById('bcountBox'); if (bb) bb.style.display = s === 'born' ? '' : 'none';
    const yb = document.getElementById('buypriceBox'); if (yb) yb.style.display = s === 'purchased' ? '' : 'none';
    const wb = document.getElementById('withOffBox'); if (wb) wb.style.display = s === 'purchased' ? '' : 'none';
    // المشترى: أمّها غالباً من خارج الحظيرة — حقل نصّ حرّ بدل اختيار من القائمة
    const msb = document.getElementById('motherSelectBox'); if (msb) msb.style.display = s === 'purchased' ? 'none' : '';
    const mtb = document.getElementById('motherTextBox'); if (mtb) mtb.style.display = s === 'purchased' ? '' : 'none';
    renderBornRows();
  };
  document.getElementById('f_source').addEventListener('change', syncSource);
  document.getElementById('f_kind').addEventListener('change', syncKind);
  { const bc = document.getElementById('f_bcount'); if (bc) bc.addEventListener('input', renderBornRows); }
  { const ho = document.getElementById('f_hasoff'); if (ho) ho.addEventListener('change', () => { const ocb = document.getElementById('offCountsBox'); if (ocb) ocb.style.display = ho.checked ? '' : 'none'; }); }
  syncSource();
  bindPenField('f_pen');
  document.getElementById('f_type').addEventListener('change', () => rebuildPen('f_pen', val('f_type')));   // حظائر النوع المحدّد فقط
  // إدخال صوتي ومسح بالكاميرا للحقول المناسبة (تظهر الأزرار فقط إن دعمها الجهاز)
  attachMic('f_code', { digits: true }); attachScan('f_code');
  attachMic('f_name'); attachMic('f_color'); attachMic('f_father'); attachMic('f_mother_name'); attachMic('f_notes', { append: true });
  // نسخ بيانات آخر إدخال (للبهائم الجديدة فقط)
  { const cl = document.getElementById('cloneLast'); if (cl) cl.addEventListener('click', () => { const L = lastAnimal || {}; setVal('f_type', L.type); setVal('f_pen', L.pen); setVal('f_kind', L.idkind); setVal('f_sex', L.sex); setVal('f_source', L.source); setVal('f_color', L.color); setVal('f_tagcolor', L.tag_color || ''); setVal('f_tagshape', L.tag_shape || ''); setVal('f_father', L.father_name || ''); rebuildPen('f_pen', L.type || (animalFilter || 'sheep')); setVal('f_pen', L.pen || ''); syncKind(); toast('نُسخت بيانات آخر إدخال'); }); }
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const code = val('f_code').trim(), name = val('f_name').trim();
    // المعرّف الخارجي اختياري — الرقم الداخلي الثابت يميّز البهيمة دائماً
    const status = a ? (val('f_status') || a.status || 'present') : 'present';   // الإضافة دائماً «موجودة»؛ الخروج (بيع/نفوق/اهداء) من الإجراء
    const isPurchased = val('f_source') === 'purchased';
    const obj = { type: val('f_type'), pen: penValue('f_pen', val('f_type')), idkind: val('f_kind'), code, name, tag_color: val('f_tagcolor'), tag_shape: val('f_tagshape'), sex: val('f_sex'), purpose: val('f_sex') === 'male' ? val('f_purpose') : '', source: val('f_source'), designation: val('f_design'), buy_price: isPurchased && val('f_buyprice') !== '' ? parseFloat(val('f_buyprice')) : null, birth: val('f_birth') || null, color: val('f_color').trim(), status,
      // المشترى: أمّها نصّ حرّ (من خارج الحظيرة) بدل ربطها بمعرّف بهيمة موجودة
      mother_id: isPurchased ? null : (parseInt(val('f_mother'), 10) || null),
      mother_name: isPurchased ? val('f_mother_name').trim() : '',
      father_name: val('f_father').trim(), notes: val('f_notes').trim(),
      sale_date: status === 'sold' ? (val('f_saledate') || null) : null,
      sale_price: status === 'sold' && val('f_saleprice') !== '' ? parseFloat(val('f_saleprice')) : null,
      dead_date: status === 'dead' ? (val('f_deaddate') || null) : null,
      gift_date: status === 'given' ? (val('f_giftdate') || null) : null,
      gift_to: status === 'given' ? (val('f_giftto').trim() || null) : null,
      missing_date: status === 'missing' ? (val('f_missdate') || null) : null,
      slaughter_date: status === 'slaughtered' ? (val('f_slaughterdate') || null) : null };
    // نظّف الحقول غير المناسبة لنوع المعرّف («بدون» لا يحفظ رقماً/وسماً)
    if (!['number', 'tag', 'chip', 'name'].includes(obj.idkind)) obj.code = '';
    if (!['tag', 'color'].includes(obj.idkind)) obj.tag_color = '';
    if (obj.idkind !== 'tag') obj.tag_shape = '';
    if (status === 'sold') { const wd = withdrawalActiveOn(id, obj.sale_date || todayStr()); if (wd && !await confirm2(`⚠️ هذه البهيمة تحت تحريم دواء حتى ${fmtDate(wd)} — لا يُنصح ببيعها/ذبحها قبله. متابعة الحفظ كمباعة؟`, { danger: true })) return; }
    if (a && !await confirm2('حفظ التعديل على هذه البهيمة؟ النسخة السابقة ستبقى في سلة المحذوفات.')) return;
    const ok = await guard(async () => {
      if (a) { await dbUpdate('animals', id, obj); return; }
      let n = obj.source === 'born' ? (parseInt(val('f_bcount'), 10) || 1) : 1;   // عدد المواليد
      if (n < 1) n = 1;
      if (obj.source === 'born' && n > 1) {
        // لكل مولود كامل حقوله المستقلّة — الحقول المشتركة (النوع/الحظيرة/المصدر/النسب) من الأعلى
        for (let i = 1; i <= n; i++) {
          const o = Object.assign({}, obj);
          o.buy_price = null;
          o.idkind = val('b_kind_' + i) || 'number';
          o.sex = val('b_sex_' + i) || 'female';
          o.purpose = o.sex === 'male' ? val('b_purpose_' + i) : '';
          o.designation = val('b_des_' + i);
          o.code = val('b_code_' + i).trim();
          o.name = val('b_name_' + i).trim();
          o.tag_color = val('b_tagcolor_' + i);
          o.tag_shape = val('b_tagshape_' + i);
          o.birth = val('b_birth_' + i) || null;
          o.color = val('b_color_' + i).trim();
          // نظّف الحقول غير المناسبة لنوع المعرّف («بدون» لا يحفظ رقماً/وسماً)
          if (!['number', 'tag', 'chip', 'name'].includes(o.idkind)) o.code = '';
          if (!['tag', 'color'].includes(o.idkind)) o.tag_color = '';
          if (o.idkind !== 'tag') o.tag_shape = '';
          await dbInsert('animals', o);
        }
        return;
      }
      const inserted = await dbInsert('animals', obj);
      // مشترى مصحوبة بمواليد: تُنشأ لها بهائم مواليد مستقلّة مربوطة بها كأمّ (لا تُحتسب ضمن كفاءة إنجاجها داخل الحلال)
      if (obj.source === 'purchased') {
        const ho = document.getElementById('f_hasoff');
        if (ho && ho.checked) {
          const nMale = Math.max(0, parseInt(val('f_offmale'), 10) || 0);
          const nFemale = Math.max(0, parseInt(val('f_offfemale'), 10) || 0);
          const offObj = (sex) => ({ type: obj.type, pen: obj.pen, idkind: 'number', code: '', name: '', sex, purpose: '', source: 'purchased', designation: '', buy_price: null, birth: null, color: '', status: 'present', mother_id: inserted.id, father_name: '', notes: 'مولود رافق أمّه عند الشراء' });
          for (let i = 0; i < nMale; i++) await dbInsert('animals', offObj('male'));
          for (let i = 0; i < nFemale; i++) await dbInsert('animals', offObj('female'));
        }
      }
    });
    if (ok) {
      // ثبّت آخر حظيرة وآخر بهيمة للإضافة التالية (للبهائم الجديدة) — تسريع الإدخال المتكرّر
      if (!a) {
        lastPen = obj.pen || ''; try { localStorage.setItem('mrahi_last_pen', lastPen); } catch (e) {}
        lastAnimal = { type: obj.type, pen: obj.pen, idkind: obj.idkind, sex: obj.sex, source: obj.source, color: obj.color, tag_color: obj.tag_color, tag_shape: obj.tag_shape, father_name: obj.father_name };
        try { localStorage.setItem('mrahi_last_animal', JSON.stringify(lastAnimal)); } catch (e) {}
      }
      toast('تم الحفظ'); await loadAll(); goBack();
    }
  });
  if (id) document.getElementById('delBtn').addEventListener('click', async () => {
    if (!await confirm2('حذف هذه البهيمة؟ ستنتقل إلى سلة المحذوفات (يمكن استعادتها خلال ٣٠ يوماً).')) return;
    const ok = await guard(async () => { await dbDelete('animals', id); });
    if (ok) { toast('نُقلت إلى سلة المحذوفات'); await loadAll(); setHash('#/animals'); }
  });
}

/* ===== وسائط البهيمة (صور/فيديو/صوت) — Blob محلي في IndexedDB، لا تُرفع لأي خادم ولا تُحمَّل ضمن ذاكرة التطبيق دفعة واحدة (طلب عند الحاجة فقط) ===== */
async function mediaListFor(animalId) {
  try { const { data } = await sb.from('mrahi_media').select().eq('animal_id', animalId).order('created_at', { ascending: false }); return data || []; }
  catch (e) { return []; }
}
// تصغير الصورة قبل الحفظ (أقصى بُعد 1600px، جودة .82) لتقليل حجم التخزين على الجهاز
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 1600;
      let width = img.naturalWidth, height = img.naturalHeight;
      if (width > maxDim || height > maxDim) { const r = Math.min(maxDim / width, maxDim / height); width = Math.round(width * r); height = Math.round(height * r); }
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob || file); }, 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
async function mediaAddFiles(animalId, files, kind) {
  for (const file of Array.from(files)) {
    let blob = file;
    if (kind === 'photo') { try { blob = await compressImage(file); } catch (e) { blob = file; } }
    await guard(async () => { await sb.from('mrahi_media').insert({ animal_id: animalId, kind, blob, mime: blob.type || file.type || '', created_at: new Date().toISOString() }); });
  }
}
async function mediaDeleteOne(id) {
  if (isEditLocked()) { toast('🔒 الحذف مقفول مؤقّتاً — افتحه من أيقونة ⋮ أعلى الشاشة'); return false; }
  return await guard(async () => { await sb.from('mrahi_media').delete().eq('id', id); });
}
// تسجيل صوتي مباشر داخل التطبيق (بدل فتح تطبيق تسجيل خارجي) — يشارك _media لضمان إيقافه عند أي تنقّل
async function startAudioRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _media.stream = stream;
    const chunks = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec._chunks = chunks;
    rec.start();
    _media.recorder = rec;
    return true;
  } catch (e) { toast('تعذّر الوصول للميكروفون'); return false; }
}
function stopAudioRecording() {
  return new Promise((resolve) => {
    const rec = _media.recorder;
    if (!rec) { resolve(null); return; }
    rec.onstop = () => {
      const blob = new Blob(rec._chunks, { type: rec.mimeType || 'audio/webm' });
      try { rec.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
      if (_media.recorder === rec) _media.recorder = null;
      if (_media.stream === rec.stream) _media.stream = null;
      resolve(blob);
    };
    try { rec.stop(); } catch (e) { resolve(null); }
  });
}
function mediaThumbHtml(m) {
  const url = URL.createObjectURL(m.blob);
  if (m.kind === 'photo') return `<div class="card click" data-medview="${m.id}" style="padding:0;overflow:hidden;position:relative"><img src="${url}" style="width:100%;height:110px;object-fit:cover;display:block"><button class="btn sm danger" data-meddel="${m.id}" style="position:absolute;top:4px;left:4px;padding:2px 8px;line-height:1">✕</button></div>`;
  if (m.kind === 'video') return `<div class="card" style="padding:6px;position:relative;grid-column:1/-1"><video src="${url}" controls style="width:100%;border-radius:8px;display:block"></video><button class="btn sm danger" data-meddel="${m.id}" style="margin-top:6px">🗑️ حذف الفيديو</button></div>`;
  return `<div class="card" style="padding:6px;grid-column:1/-1"><audio src="${url}" controls style="width:100%"></audio><button class="btn sm danger" data-meddel="${m.id}" style="margin-top:6px">🗑️ حذف التسجيل</button></div>`;
}
function mediaViewModal(m) {
  if (!m) return;
  const url = URL.createObjectURL(m.blob);
  openModal('صورة', `<img src="${url}" style="width:100%;border-radius:10px">`);
}
async function refreshMediaList(animalId) {
  const box = document.getElementById('mediaList'); if (!box) return;
  const items = await mediaListFor(animalId);
  const photos = items.filter(m => m.kind === 'photo'), others = items.filter(m => m.kind !== 'photo');
  box.innerHTML = items.length
    ? (photos.length ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${photos.map(mediaThumbHtml).join('')}</div>` : '') + others.map(mediaThumbHtml).join('')
    : noItem();
  box.querySelectorAll('[data-meddel]').forEach(b => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!await confirm2('حذف هذا الملف نهائياً؟ لا يمكن التراجع.', { danger: true })) return;
    const ok = await mediaDeleteOne(parseInt(b.dataset.meddel, 10));
    if (ok) { toast('تم الحذف'); refreshMediaList(animalId); }
  }));
  box.querySelectorAll('[data-medview]').forEach(el => el.addEventListener('click', () => mediaViewModal(items.find(m => m.id === parseInt(el.dataset.medview, 10)))));
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
  const monPreg = pregs.filter(p => p.status === 'monitoring').sort((x, y) => y.id - x.id)[0];   // الأحدث دائماً (لا يبقى معلَّقاً على تلقيح قديم)
  // سطر حالة إنجابية ثابت لا يختفي أبداً: يعكس آخر نشاط (حمل حالي، أو نتيجة آخر تلقيح مهما كانت)
  const reproStatusLine = (() => {
    if (monPreg) return row('🤰 الحالة الحالية', 'حامل — تلقيح ' + fmtDate(monPreg.mating_date) + ' • ولادة متوقّعة ' + fmtDate(monPreg.expected));
    const latestPreg = pregs.slice().sort((x, y) => y.id - x.id)[0];
    if (latestPreg) return row('الحالة الحالية', (latestPreg.status === 'aborted' ? '🩸 آخر حمل انتهى بإجهاض' : latestPreg.status === 'born' ? '👶 آخر حمل انتهى بولادة' : '⭕ لم يثبت آخر حمل') + ' — تلقيح ' + fmtDate(latestPreg.mating_date));
    const latestMating = matings.slice().sort((x, y) => (y.date || '').localeCompare(x.date || ''))[0];
    if (latestMating) return row('الحالة الحالية', 'آخر تلقيح ' + fmtDate(latestMating.date) + ' — بلا متابعة حمل');
    return row('الحالة الحالية', 'لا يوجد تلقيح مسجّل بعد');
  })();
  const withItems = [...treats, ...vaccs].filter(r => r.withdrawal_end && daysUntil(r.withdrawal_end) >= 0).sort((x, y) => (y.withdrawal_end || '').localeCompare(x.withdrawal_end || ''));
  const summary = `<div class="card" style="display:flex;flex-wrap:wrap;gap:6px">
      ${a.birth ? `<span class="badge">🎂 ${ageText(a.birth)}</span>` : ''}
      <span class="badge">${esc(sexTerm(a))}</span>
      ${offCount ? `<span class="badge">👶 ${offCount} مولود</span>` : ''}
      ${a.status === 'present' && !inHerdCount(a) ? `<span class="badge">👶 تتبع أمّها (غير محتسَبة)</span>` : ''}
      ${monPreg ? `<span class="badge">🤰 حامل • ولادة ${fmtDate(monPreg.expected)}</span>` : ''}
      ${withItems.length ? `<span class="badge off">⛔ تحت التحريم حتى ${fmtDate(withItems[0].withdrawal_end)}</span>` : ''}
      ${a.status !== 'present' ? `<span class="badge ${a.status === 'sold' ? 'sold' : a.status === 'dead' ? 'dead' : ''}">${arOf(STATUS, a.status)}</span>` : ''}
    </div>`;
  const breedingAge = (!a.birth || !pubertyOf(a.type) || ageMonths(a.birth) >= pubertyOf(a.type));
  // ===== كفاءة الإنجاب (تُحتسب من النتاج والتلقيح) =====
  const birthDates = Array.from(new Set(offspring.map(o => o.birth).filter(Boolean))).sort();
  const parities = birthDates.length;                                  // عدد الولادات (تواريخ ميلاد مختلفة)
  const abortions = pregs.filter(p => p.status === 'aborted').length;   // عدد الإجهاضات المسجّلة
  // تلقيحات الحمل المُنتهي (بولادة أو إجهاض) تُخفى من العرض — بالمعرّف عند توفّره (دقيق)، أو بالتاريخ كاحتياط للسجلات القديمة/حمل السونار
  const resolvedPregs = pregs.filter(p => p.status === 'aborted' || p.status === 'born');
  const abortedMatingIds = new Set(resolvedPregs.map(p => p.mating_id).filter(Boolean));
  const abortedMatingDates = new Set(resolvedPregs.filter(p => !p.mating_id).map(p => p.mating_date).filter(Boolean));
  const avgLitter = parities ? Math.round((offspring.length / parities) * 10) / 10 : 0;
  let intervalMonths = null;
  if (birthDates.length >= 2) {
    let sum = 0;
    for (let i = 1; i < birthDates.length; i++) { const d1 = new Date(birthDates[i - 1] + 'T00:00:00'), d2 = new Date(birthDates[i] + 'T00:00:00'); sum += (d2 - d1) / 86400000; }
    intervalMonths = Math.round((sum / (birthDates.length - 1)) / 30.4);
  }
  const lastBirth = birthDates.length ? birthDates[birthDates.length - 1] : null;
  const fertilityPct = matings.length ? Math.round((parities / matings.length) * 100) : null;
  const offStats = offspring.length ? `<div class="muted" style="margin:2px 0 6px;font-size:.85rem">🟢 في الحظيرة ${offspring.filter(o => o.status === 'present').length} • 💰 مباعة ${offspring.filter(o => o.status === 'sold').length} • 📉 نافقة ${offspring.filter(o => o.status === 'dead').length} • 🎁 اهداء ${offspring.filter(o => o.status === 'given').length}</div>` : '';
  const offList = offspring.length ? offspring.map(o => { const ic = STATUS_ICON[o.status] || ''; return `<div class="card click" data-aid="${o.id}" style="margin:6px 0"><div class="li-title">${display(o)}</div><div class="li-sub">${esc(sexTerm(o))} • ${fmtDate(o.birth)} • ${ic} ${arOf(STATUS, o.status)}</div></div>`; }).join('') : noItem();

  // ===== محتوى كل سجل =====
  const REC = {};
  REC.lineage = `<div class="card"><h3>🌳 النسب</h3>
      ${row('الأم', mother ? display(mother) : (esc(a.mother_name) || '—'))}
      ${row('الأب / الفحل', esc(a.father_name) || '—')}
      ${a.notes ? row('ملاحظات', esc(a.notes)) : ''}</div>
    <div class="card"><h3>👶 النتاج (${offspring.length})</h3>
      ${offStats}
      ${can('animals', 'edit') && a.sex === 'female' && breedingAge ? `<button class="btn outline" id="addOffspring">➕ إضافة مواليد (نتاج)</button>` : ''}
      ${offList}</div>`;
  REC.repro = `<div class="card"><h3>📊 كفاءة الإنجاب</h3>
      ${row('عدد الولادات', String(parities))}
      ${row('إجمالي المواليد', String(offspring.length))}
      ${parities ? row('متوسط المواليد لكل ولادة', String(avgLitter)) : ''}
      ${intervalMonths != null ? row('متوسط الفترة بين الولادات', intervalMonths + ' شهر تقريباً') : ''}
      ${fertilityPct != null ? row('معدل الإخصاب', fertilityPct + '% (' + parities + ' ولادة ÷ ' + matings.length + ' تلقيح)') : ''}
      ${lastBirth ? row('آخر ولادة', fmtDate(lastBirth)) : ''}
      ${abortions ? row('🩸 عدد الإجهاضات', String(abortions)) : ''}
      ${monPreg ? row('الحمل الحالي', 'ولادة متوقّعة ' + fmtDate(monPreg.expected)) : ''}
      ${!parities && !matings.length && !abortions ? noItem() : ''}</div>
    ${a.sex === 'female' && breedingAge ? `<div class="card"><h3>🤰 التلقيح والحمل (${matings.length})</h3>
      ${reproStatusLine}
      ${can('breeding', 'edit') ? `<button class="btn outline" id="addMating">إضافة تلقيح / متابعة حمل</button>` : ''}
      ${can('breeding', 'edit') && a.status === 'present' ? `<button class="btn outline" id="addSonar" style="margin-top:6px">🔊 فحص حمل بالسونار</button>` : ''}
      ${monPreg && can('breeding', 'edit') ? `<button class="btn outline danger" id="addAbort" style="margin-top:6px">🩸 تسجيل إجهاض</button>` : ''}
      ${matings.filter(m => !abortedMatingIds.has(m.id) && !abortedMatingDates.has(m.date)).map(m => can('breeding', 'edit')
        ? editRow('تلقيح ' + fmtDate(m.date), 'الفحل: ' + (esc(m.sire_name) || esc(m.sire_code) || '—'), 'medit', m.id)
        : row('تلقيح ' + fmtDate(m.date), 'الفحل: ' + (esc(m.sire_name) || esc(m.sire_code) || '—'))).join('')}
      ${pregs.map(p => {
        const sub = p.status === 'aborted'
          ? (p.abort_gest_days != null ? 'عمر الحمل عند الإجهاض ' + p.abort_gest_days + ' يوم' : 'مسجّل') + (p.abort_cause ? ' • السبب: ' + esc(p.abort_cause) : '')
          : 'الولادة التقريبية ' + fmtDate(p.expected) + ' • مدة الحمل ' + p.gest + ' يوم';
        const title = p.status === 'aborted' ? 'حمل (🩸 أجهضت)' : 'حمل (' + arOf(PREG, p.status) + ')' + (p.confirmed ? ' 🔊' : '');
        return can('breeding', 'edit') ? editRow(title, sub, 'pedit', p.id) : row(title, sub);
      }).join('')}
      ${!matings.length && !pregs.length ? noItem() : ''}</div>` : ''}`;
  REC.medical = `<div class="card"><h3>🩺 السجل المرضي (${treats.length})</h3>
      <div class="muted" style="font-size:.82rem;margin-bottom:6px">الحالات التي أصابت البهيمة (مصدرها سجل العلاجات).</div>
      ${treats.length ? treats.map(t => row((t.treatment_type ? esc(t.treatment_type) : (t.med_name ? esc(t.med_name) : 'حالة')) + ' — ' + fmtDate(t.date), [t.action ? 'الإجراء: ' + esc(t.action) : '', t.notes ? esc(t.notes) : ''].filter(Boolean).join(' • ') || '—')).join('') : noItem()}</div>`;
  REC.treat = `<div class="card"><h3>💊 سجل العلاجات (${treats.length})</h3>
      ${can('treatments', 'edit') ? `<button class="btn outline" id="addTreat">إعطاء علاج</button>` : ''}
      ${treats.length ? treats.map(t => can('treatments', 'edit')
        ? editRow(esc(t.med_name || '') + ' (' + fmtDate(t.date) + ')', 'تحريم حتى ' + fmtDate(t.withdrawal_end) + (t.next_due ? ' • جرعة قادمة ' + fmtDate(t.next_due) : ''), 'tedit', t.id)
        : row(esc(t.med_name || '') + ' (' + fmtDate(t.date) + ')', 'تحريم حتى ' + fmtDate(t.withdrawal_end) + (t.next_due ? ' • جرعة قادمة ' + fmtDate(t.next_due) : ''))).join('') : noItem()}</div>`;
  REC.vacc = `<div class="card"><h3>💉 سجل التطعيمات (${vaccs.length})</h3>
      ${can('vaccines', 'edit') ? `<button class="btn outline" id="addVacc">إعطاء تطعيم</button>` : ''}
      ${vaccs.length ? vaccs.map(v => can('vaccines', 'edit')
        ? editRow(fmtDate(v.date) + ' — ' + vtName(v.type_id), 'تحريم حتى ' + fmtDate(v.withdrawal_end), 'vedit', v.id)
        : row(fmtDate(v.date) + ' — ' + vtName(v.type_id), 'تحريم حتى ' + fmtDate(v.withdrawal_end))).join('') : noItem()}</div>`;

  REC.basic = `<div class="card"><h3>📋 البيانات الأساسية</h3>
      ${row('النوع', arOf(TYPES, a.type))}
      ${row('المعرّف الخارجي (الوسم)', a.code ? esc(a.code) + ' • ' + arOf(IDKIND, a.idkind) : '— غير مرقّمة —')}
      ${(a.tag_color || a.tag_shape) ? row('🏷️ لون/شكل الوسم', [a.tag_color ? esc(a.tag_color) + colorDot(a.tag_color) : '', a.tag_shape ? esc(a.tag_shape) : ''].filter(Boolean).join(' • ')) : ''}
      ${a.name ? row('الاسم', esc(a.name)) : ''}
      ${row('الجنس', (function () { var s = sexTerm(a), g = arOf(SEX, a.sex); return esc(s) + (s !== g ? ' <span class="muted">(' + g + ')</span>' : ''); })())}
      ${a.sex === 'male' && a.purpose ? row('غرض الذكر', arOf(MALE_PURPOSE, a.purpose)) : ''}
      ${a.designation ? row('الغرض', arOf(DESIGN, a.designation)) : ''}
      ${row('🏠 المكان', esc(a.pen) || '—')}
      ${row('المصدر', arOf(SOURCE, a.source || 'purchased'))}
      ${((a.source || 'purchased') === 'purchased' && a.buy_price != null) ? row('💵 سعر الشراء', esc(String(a.buy_price))) : ''}
      ${row('تاريخ الميلاد', fmtDate(a.birth))}
      ${a.birth ? row('🎂 العمر', ageText(a.birth)) : ''}
      ${a.birth && pubertyOf(a.type) ? row('🌱 سن البلوغ المتوقّع', fmtDate(addMonths(a.birth, pubertyOf(a.type))) + ' (' + pubertyOf(a.type) + ' شهر)') : ''}
      ${row('اللون', esc(a.color) || '—')}
      ${row('الحالة', arOf(STATUS, a.status))}
      ${(a.source || 'purchased') === 'purchased' && (a.sale_date == null) && a.buy_date ? row('تاريخ الشراء', fmtDate(a.buy_date)) : ''}
      ${a.status === 'sold' ? row('تاريخ البيع', fmtDate(a.sale_date)) + row('سعر البيع', a.sale_price != null ? a.sale_price : '—') : ''}
      ${a.status === 'dead' ? row('تاريخ النفوق', fmtDate(a.dead_date)) : ''}
      ${a.status === 'given' ? row('تاريخ الإهداء', fmtDate(a.gift_date)) + (a.gift_to ? row('أُهديت إلى', esc(a.gift_to)) : '') : ''}
      ${a.status === 'missing' ? row('تاريخ الفقد', fmtDate(a.missing_date)) : ''}
      ${a.status === 'slaughtered' ? row('تاريخ الذبح', fmtDate(a.slaughter_date)) : ''}
      <div class="btn-row" style="margin-top:8px">
        <button class="btn sm outline" id="qShare">📤 مشاركة البطاقة</button>
        ${can('animals', 'edit') && a.sex === 'male' ? (a.purpose === 'sire'
          ? `<button class="btn sm outline" id="qUnsire">↩ إلغاء الفحل</button>`
          : `<button class="btn sm" id="qSire">🐏 تعيينه فحلاً</button>`) : ''}
        ${can('animals', 'edit') ? (a.status === 'present'
          ? `<button class="btn sm" id="qSell">💰 بيع</button><button class="btn sm danger" id="qDead">📉 نفوق</button><button class="btn sm" id="qGift">🎁 إهداء</button><button class="btn sm outline" id="qMissing">🔎 فقد</button><button class="btn sm danger" id="qSlaughter">🔪 ذبح</button>${!inHerdCount(a) ? `<button class="btn sm outline" id="qCount">➕ احتساب</button>` : (a.counted === true ? `<button class="btn sm outline" id="qUncount">➖ إخراج</button>` : '')}`
          : `<button class="btn sm outline" id="qBack">↩ إعادة للحظيرة</button>`) : ''}
      </div></div>`;

  REC.media = `<div class="card"><h3>📷 الوسائط</h3>
      <div class="muted" style="font-size:.82rem;margin-bottom:8px">صور وفيديو وتسجيلات صوتية لهذه البهيمة — محفوظة على جهازك فقط، لا تُرفع لأي خادم.</div>
      ${can('animals', 'edit') ? `<div class="btn-row" style="flex-wrap:wrap">
        <label class="btn sm outline" style="cursor:pointer">📷 إضافة صور<input type="file" id="med_photo" accept="image/*" multiple style="display:none"></label>
        <label class="btn sm outline" style="cursor:pointer">🎥 إضافة فيديو<input type="file" id="med_video" accept="video/*" multiple style="display:none"></label>
        ${audioRecAvail() ? `<button class="btn sm outline" id="med_rec_start">🎙️ تسجيل صوت</button>
        <button class="btn sm danger hidden" id="med_rec_stop">⏹️ إيقاف وحفظ التسجيل</button>` : ''}
      </div>` : ''}
      <div id="mediaList" class="muted" style="margin-top:10px">جارٍ التحميل…</div></div>`;

  // ===== تبويبات مستقلّة: يختار المستخدم التبويب فيظهر وحده =====
  const recTabs = [{ k: 'basic', ar: '📋 البيانات' }];
  if (can('animals', 'view')) recTabs.push({ k: 'lineage', ar: '🌳 النسب' });
  if (can('breeding', 'view')) recTabs.push({ k: 'repro', ar: '🤰 الإنجاب' });
  if (can('treatments', 'view')) recTabs.push({ k: 'medical', ar: '🩺 المرضي' });
  if (can('treatments', 'view')) recTabs.push({ k: 'treat', ar: '💊 العلاجات' });
  if (can('vaccines', 'view')) recTabs.push({ k: 'vacc', ar: '💉 التطعيمات' });
  recTabs.push({ k: 'media', ar: '📷 الوسائط' });
  if (!recTabs.find(t => t.k === animalRecTab)) animalRecTab = 'basic';
  const recChips = `<div class="chips animal-tabs" style="margin:8px 0">${recTabs.map(t => `<span class="chip ${animalRecTab === t.k ? 'active' : ''}" data-rec="${t.k}">${t.ar}</span>`).join('')}</div>`;

  view().innerHTML = summary + recChips + `<div id="recBody">${REC[animalRecTab] || ''}</div><div style="height:30px"></div>`;
  bindCards(view());
  view().querySelectorAll('[data-rec]').forEach(c => c.addEventListener('click', () => { animalRecTab = c.dataset.rec; screenAnimalDetail(String(id)); }));
  if (animalRecTab === 'media') {
    refreshMediaList(id);
    const mp = document.getElementById('med_photo'); if (mp) mp.addEventListener('change', async () => { if (!mp.files.length) return; await mediaAddFiles(id, mp.files, 'photo'); mp.value = ''; toast('تمت الإضافة'); refreshMediaList(id); });
    const mv = document.getElementById('med_video'); if (mv) mv.addEventListener('change', async () => { if (!mv.files.length) return; await mediaAddFiles(id, mv.files, 'video'); mv.value = ''; toast('تمت الإضافة'); refreshMediaList(id); });
    const mrStart = document.getElementById('med_rec_start'), mrStop = document.getElementById('med_rec_stop');
    if (mrStart) mrStart.addEventListener('click', async () => {
      const ok = await startAudioRecording(); if (!ok) return;
      mrStart.classList.add('hidden'); mrStop.classList.remove('hidden'); toast('🎙️ جارٍ التسجيل…');
    });
    if (mrStop) mrStop.addEventListener('click', async () => {
      const blob = await stopAudioRecording();
      mrStop.classList.add('hidden'); mrStart.classList.remove('hidden');
      if (!blob || !blob.size) { toast('لم يُسجَّل شيء'); return; }
      await guard(async () => { await sb.from('mrahi_media').insert({ animal_id: id, kind: 'audio', blob, mime: blob.type || 'audio/webm', created_at: new Date().toISOString() }); });
      toast('تم حفظ التسجيل'); refreshMediaList(id);
    });
  }
  const qs = document.getElementById('qSell'); if (qs) qs.addEventListener('click', () => quickSell(a));
  const qd = document.getElementById('qDead'); if (qd) qd.addEventListener('click', () => quickDead(a));
  const qg = document.getElementById('qGift'); if (qg) qg.addEventListener('click', () => quickGift(a));
  const qc = document.getElementById('qCount'); if (qc) qc.addEventListener('click', async () => { const ok = await guard(async () => { await dbUpdate('animals', a.id, { counted: true }); }); if (ok) { toast('أُضيفت لعدد الحظيرة'); await loadAll(); screenAnimalDetail(String(a.id)); } });
  const qu = document.getElementById('qUncount'); if (qu) qu.addEventListener('click', async () => { const ok = await guard(async () => { await dbUpdate('animals', a.id, { counted: false }); }); if (ok) { toast('أُخرجت من عدد الحظيرة'); await loadAll(); screenAnimalDetail(String(a.id)); } });
  const qb = document.getElementById('qBack'); if (qb) qb.addEventListener('click', () => quickRevert(a));
  const qm = document.getElementById('qMissing'); if (qm) qm.addEventListener('click', () => quickMissing(a));
  const qsl = document.getElementById('qSlaughter'); if (qsl) qsl.addEventListener('click', () => quickSlaughter(a));
  const qsh = document.getElementById('qShare'); if (qsh) qsh.addEventListener('click', () => shareAnimalCard(a));
  const qsi = document.getElementById('qSire'); if (qsi) qsi.addEventListener('click', () => makeSireModal(a));
  const qus = document.getElementById('qUnsire'); if (qus) qus.addEventListener('click', () => unmakeSire(a));
  const ao = document.getElementById('addOffspring'); if (ao) ao.addEventListener('click', () => addOffspringModal(a));
  const am = document.getElementById('addMating'); if (am) am.addEventListener('click', () => setHash('#/mating/' + id));
  const aso = document.getElementById('addSonar'); if (aso) aso.addEventListener('click', () => animalSonarModal(a));
  const aab = document.getElementById('addAbort'); if (aab && monPreg) aab.addEventListener('click', () => abortModal(monPreg));
  const av = document.getElementById('addVacc'); if (av) av.addEventListener('click', () => setHash('#/vaccinate/' + id));
  const at = document.getElementById('addTreat'); if (at) at.addEventListener('click', () => setHash('#/treat/' + id));
  view().querySelectorAll('[data-medit]').forEach(b => b.addEventListener('click', () => { const m = matings.find(x => x.id === parseInt(b.dataset.medit, 10)); if (m) matingEditModal(m); }));
  view().querySelectorAll('[data-pedit]').forEach(b => b.addEventListener('click', () => { const p = pregs.find(x => x.id === parseInt(b.dataset.pedit, 10)); if (p) pregEditModal(p); }));
  view().querySelectorAll('[data-tedit]').forEach(b => b.addEventListener('click', () => { const t = treats.find(x => x.id === parseInt(b.dataset.tedit, 10)); if (t) treatEditModal(t); }));
  view().querySelectorAll('[data-vedit]').forEach(b => b.addEventListener('click', () => { const v = vaccs.find(x => x.id === parseInt(b.dataset.vedit, 10)); if (v) vaccEditModal(v); }));
  if (can('animals', 'edit')) addFab('✎ تعديل', () => setHash('#/animal-edit/' + id));
}

/* ===== إضافة نتاج (مواليد) للأم — عند العدد > 1 تُفتح حقول كاملة مستقلّة لكل مولود، وربط بالأم ===== */
function addOffspringModal(mother) {
  openModal('مواليد ' + display(mother), `
    ${fSelect('الجنس', 'of_sex', SEX, 'female')}
    ${fInput('العدد', 'of_count', '', 'number', 'min="1" inputmode="numeric"')}
    ${fInput('تاريخ الميلاد', 'of_birth', todayStr(), 'date')}
    ${penField('of_pen', mother.pen || '', mother.type)}
    <div id="ofSingle">
      <div id="of_purposeBox">${fSelect('غرض الذكر', 'of_purpose', MALE_PURPOSE, '', '— غير محدّد —')}</div>
      ${fSelect('الغرض', 'of_des', DESIGN, '', '— غير محدّد —')}
      <div class="chips"><span class="chip active" data-om="none">⭕ بدون ترقيم</span><span class="chip" data-om="num">🔢 بترقيم</span></div>
      <div id="ofNone" class="muted" style="font-size:.82rem">تُضاف بلا رقم — رقّمها لاحقاً عند الكبر.</div>
      <div id="ofNum" class="hidden">
        ${fInput('بداية الترقيم', 'of_start', '', 'number', 'inputmode="numeric"')}
        ${fInput('بادئة قبل الرقم (اختياري)', 'of_prefix', '')}
        <div id="of_hint" class="muted" style="font-size:.82rem;margin-top:4px"></div></div>
    </div>
    <div id="ofRows"></div>
    <button class="btn" id="of_save">➕ إضافة المواليد</button>`, () => {
    bindPenField('of_pen');
    // غرض الذكر (في وضع مولود واحد) يظهر للذكور فقط
    const syncOfPurpose = () => { const pb = document.getElementById('of_purposeBox'); if (pb) pb.style.display = val('of_sex') === 'male' ? '' : 'none'; };
    { const os = document.getElementById('of_sex'); if (os) os.addEventListener('change', syncOfPurpose); } syncOfPurpose();
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
    // عند العدد > 1: تُفتح بطاقة كاملة مستقلّة لكل مولود (نفس منطق شاشة الإضافة)
    const renderOfRows = () => {
      const box = document.getElementById('ofRows'); if (!box) return;
      const n = parseInt(val('of_count'), 10) || 0;
      const multi = n > 1;
      const single = document.getElementById('ofSingle'); if (single) single.style.display = multi ? 'none' : '';
      if (!multi) { box.innerHTML = ''; return; }
      const defSex = val('of_sex') || 'female';
      const defBirth = val('of_birth') || todayStr();
      let html = '';
      for (let i = 1; i <= n; i++) html += newbornFieldsHtml('ob', i, defSex, defBirth);
      box.innerHTML = html;
      for (let i = 1; i <= n; i++) bindNewbornFieldSync('ob', i);
    };
    { const oc = document.getElementById('of_count'); if (oc) oc.addEventListener('input', renderOfRows); }
    document.getElementById('of_save').addEventListener('click', async () => {
      const n = parseInt(val('of_count'), 10) || 0; if (n <= 0) { toast('أدخل عدد المواليد'); return; }
      const pen = penValue('of_pen', mother.type);
      const base = { type: mother.type, pen, source: 'born', status: 'present', mother_id: mother.id, father_name: '', notes: '' };
      // العدد > 1: لكل مولود حقوله الكاملة المستقلّة
      if (n > 1) {
        if (!await confirm2(`إضافة ${n} مولوداً وربطها بـ${display(mother)}؟`)) return;
        const ok = await guard(async () => {
          for (let i = 1; i <= n; i++) {
            const o = Object.assign({}, base);
            o.idkind = val('ob_kind_' + i) || 'number';
            o.sex = val('ob_sex_' + i) || 'female';
            o.purpose = o.sex === 'male' ? val('ob_purpose_' + i) : '';
            o.designation = val('ob_des_' + i);
            o.code = val('ob_code_' + i).trim();
            o.name = val('ob_name_' + i).trim();
            o.tag_color = val('ob_tagcolor_' + i);
            o.tag_shape = val('ob_tagshape_' + i);
            o.birth = val('ob_birth_' + i) || null;
            o.color = val('ob_color_' + i).trim();
            if (!['number', 'tag', 'chip', 'name'].includes(o.idkind)) o.code = '';
            if (!['tag', 'color'].includes(o.idkind)) o.tag_color = '';
            if (o.idkind !== 'tag') o.tag_shape = '';
            await dbInsert('animals', o);
          }
        });
        if (ok) { closeModal(); lastPen = pen; try { localStorage.setItem('mrahi_last_pen', pen); } catch (e) {} toast(`أُضيف ${n} مولوداً`); await loadAll(); screenAnimalDetail(String(mother.id)); }
        return;
      }
      // مولود واحد: الحقول المشتركة + خيار الترقيم
      let codes;
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
      const sex = val('of_sex');
      const single = Object.assign({}, base, { sex, purpose: sex === 'male' ? val('of_purpose') : '', designation: val('of_des'), color: '', birth: val('of_birth') || null });
      const ok = await guard(async () => { for (const code of codes) await dbInsert('animals', { ...single, idkind: idkindFor(code), code, name: '' }); });
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
    ${sireSelectHtml('m_sireSel')}
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
  bindSireSelect('m_sireSel', 'm_sireCode', 'm_sireName');
  document.getElementById('m_save').addEventListener('click', async () => {
    const a = preset || animalById(parseInt(val('m_animal'), 10)); const d = val('m_date');
    if (!a) { toast('اختر البهيمة'); return; } if (!d) { toast('أدخل التاريخ'); return; }
    const wantsPreg = document.getElementById('m_preg').checked;
    // إن كان لديها حمل تحت المتابعة من تلقيح سابق ونريد بدء متابعة جديدة: نسأل قبل إنهاء القديم (لا يبقى تلقيحان نشطان معاً)
    const activePreg = wantsPreg ? C.pregnancies.filter(p => p.animal_id === a.id && p.status === 'monitoring').sort((x, y) => y.id - x.id)[0] : null;
    if (activePreg && !await confirm2(`لدى ${display(a)} حمل تحت المتابعة من تلقيح ${fmtDate(activePreg.mating_date)} — إنهاؤه (لم يثبت) وبدء متابعة التلقيح الجديد؟`)) return;
    const ok = await guard(async () => {
      if (activePreg) await dbUpdate('pregnancies', activePreg.id, { status: 'not_confirmed' }, true);   // جزء من بدء تلقيح جديد (إضافة) — لا يُقفل
      const matingRow = await dbInsert('matings', { animal_id: a.id, date: d, sire_code: val('m_sireCode').trim(), sire_name: val('m_sireName').trim(), notes: val('m_notes').trim() });
      if (wantsPreg) { const g = gestOf(a.type); await dbInsert('pregnancies', { animal_id: a.id, mating_id: matingRow.id, mating_date: d, gest: g, expected: addDays(d, g), status: 'monitoring', notes: val('m_notes').trim() }); }
    });
    if (ok) { toast('تم الحفظ'); await loadAll(); goBack(); }
  });
}
// تعديل سجل تلقيح موجود — إن كان مرتبطاً بحمل تحت المتابعة يُحدَّث موعد ولادته تلقائياً من التاريخ الجديد
function matingEditModal(m) {
  const linkedPreg = C.pregnancies.find(p => p.mating_id === m.id && p.status === 'monitoring');
  const allLinkedPregs = C.pregnancies.filter(p => p.mating_id === m.id);
  openModal('تعديل التلقيح', `
    ${fInput('تاريخ التلقيح', 'me_date', m.date, 'date')}
    ${sireSelectHtml('me_sireSel')}
    ${fInput('رقم الفحل', 'me_sireCode', m.sire_code)}
    ${fInput('اسم الفحل', 'me_sireName', m.sire_name)}
    ${fTextarea('ملاحظات', 'me_notes', m.notes)}
    <button class="btn" id="me_save">حفظ التعديل</button>
    <button class="btn danger" id="me_del" style="margin-top:8px">🗑️ حذف التلقيح نهائياً</button>`, () => {
    bindSireSelect('me_sireSel', 'me_sireCode', 'me_sireName');
    document.getElementById('me_save').addEventListener('click', async () => {
      const d = val('me_date'); if (!d) { toast('أدخل التاريخ'); return; }
      const msg = linkedPreg
        ? `⚠️ هذا التلقيح مرتبط بحمل تحت المتابعة — سيُحدَّث موعد الولادة المتوقّعة تلقائياً حسب التاريخ الجديد. متابعة التعديل؟`
        : `⚠️ تعديل بيانات هذا التلقيح؟ سيتغيّر السجل التاريخي المحفوظ.`;
      if (!await confirm2(msg, { danger: true })) return;
      const ok = await guard(async () => {
        await dbUpdate('matings', m.id, { date: d, sire_code: val('me_sireCode').trim(), sire_name: val('me_sireName').trim(), notes: val('me_notes').trim() });
        if (linkedPreg) await dbUpdate('pregnancies', linkedPreg.id, { mating_date: d, expected: addDays(d, linkedPreg.gest) });
      });
      if (ok) { closeModal(); toast('تم تعديل التلقيح'); await loadAll(); screenAnimalDetail(String(m.animal_id)); }
    });
    document.getElementById('me_del').addEventListener('click', async () => {
      const warnPreg = allLinkedPregs.length ? `\n⚠️ سيُحذف معه ${allLinkedPregs.length === 1 ? 'سجل الحمل المرتبط به' : allLinkedPregs.length + ' سجلات الحمل المرتبطة به'} أيضاً.` : '';
      if (!await confirm2(`🗑️ حذف هذا التلقيح نهائياً من هنا؟ سينتقل إلى سلة المحذوفات (يمكن استعادته منها خلال ٣٠ يوماً).${warnPreg}`, { danger: true })) return;
      const ok = await guard(async () => {
        for (const p of allLinkedPregs) await dbDelete('pregnancies', p.id);
        await dbDelete('matings', m.id);
      });
      if (ok) { closeModal(); toast('تم حذف التلقيح نهائياً'); await loadAll(); screenAnimalDetail(String(m.animal_id)); }
    });
  });
}
// تعديل سجل حمل موجود (تصحيح تاريخ/مدة/ملاحظات) — لا يُغيّر الحالة، تلك عبر الأزرار المخصّصة
function pregEditModal(p) {
  openModal('تعديل بيانات الحمل', `
    ${fInput('تاريخ التلقيح', 'pe_date', p.mating_date, 'date')}
    ${fInput('مدة الحمل (يوم)', 'pe_gest', p.gest, 'number', 'min="1" inputmode="numeric"')}
    ${fInput('الولادة المتوقّعة', 'pe_exp', p.expected, 'date')}
    ${fTextarea('ملاحظات', 'pe_notes', p.notes)}
    <button class="btn" id="pe_save">حفظ التعديل</button>
    <button class="btn danger" id="pe_del" style="margin-top:8px">🗑️ حذف سجل الحمل نهائياً</button>`, () => {
    document.getElementById('pe_save').addEventListener('click', async () => {
      const gest = parseInt(val('pe_gest'), 10) || p.gest;
      if (!await confirm2('⚠️ تعديل بيانات هذا الحمل؟ ستتغيّر حسابات موعد الولادة المتعلّقة به.', { danger: true })) return;
      const ok = await guard(async () => { await dbUpdate('pregnancies', p.id, { mating_date: val('pe_date') || null, gest, expected: val('pe_exp') || null, notes: val('pe_notes').trim() }); });
      if (ok) { closeModal(); toast('تم تعديل الحمل'); await loadAll(); (parseHash().name === 'pregnancies' ? screenPregnancies() : screenAnimalDetail(String(p.animal_id))); }
    });
    document.getElementById('pe_del').addEventListener('click', async () => {
      if (!await confirm2('🗑️ حذف سجل الحمل هذا نهائياً من هنا؟ سينتقل إلى سلة المحذوفات (يمكن استعادته منها خلال ٣٠ يوماً). سجل التلقيح المرتبط به يبقى كما هو.', { danger: true })) return;
      const ok = await guard(async () => { await dbDelete('pregnancies', p.id); });
      if (ok) { closeModal(); toast('تم حذف سجل الحمل نهائياً'); await loadAll(); (parseHash().name === 'pregnancies' ? screenPregnancies() : screenAnimalDetail(String(p.animal_id))); }
    });
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
    const actions = can('breeding', 'edit') ? `<div class="btn-row" style="margin-top:8px">
        ${p.status === 'monitoring' ? `<button class="btn sm" data-birth="${p.id}">تسجيل ولادة</button>
        <button class="btn sm outline" data-sonar="${p.id}">🔊 فحص بالسونار</button>
        <button class="btn sm danger" data-abort="${p.id}">🩸 إجهاض</button>
        <button class="btn sm outline" data-nope="${p.id}">لم يثبت</button>` : ''}
        <button class="btn sm outline" data-pgedit="${p.id}">✎ تعديل</button></div>` : '';
    const age = p.mating_date ? Math.max(0, -daysUntil(p.mating_date)) : null;
    const abortRow = p.status === 'aborted' ? row('🩸 الإجهاض', (p.abort_gest_days != null ? 'عمر الحمل عند الإجهاض ' + p.abort_gest_days + ' يوم' : 'مسجّل') + (p.abort_cause ? ' • السبب: ' + esc(p.abort_cause) : ' • بلا سبب مسجّل')) : '';
    const infoRows = p.status === 'aborted' ? abortRow : row('عمر الحمل الحالي', (age != null ? age : '—') + ' يوم') + row('مدة حمل النوع', p.gest + ' يوم') + row('الولادة التقريبية', fmtDate(p.expected));
    return `<div class="card"><h3>${display(a)}</h3>${infoRows}${row('الحالة', arOf(PREG, p.status))}${sonarRow}${actions}</div>`;
  }).join('');
  const startBtn = can('breeding', 'edit') ? '<button class="btn" id="startPreg" style="margin:0 0 8px">🔊 متابعة الحمل بالسونار (إدخال/تعديل)</button>' : '';
  const bulkBtn = (monitoring.length && can('breeding', 'edit')) ? '<button class="btn outline" id="bulkSonar" style="margin:0 0 10px">🔊 فحص جماعي بالسونار</button>' : '';
  const bodyHtml = list.length ? (pregTable(monitoring) + cards) : '<div class="center-empty">لا توجد حالات حمل مسجّلة بعد — ابدأ متابعة حمل بالزر أعلاه.</div>';
  view().innerHTML = startBtn + bulkBtn + bodyHtml;
  { const sp = document.getElementById('startPreg'); if (sp) sp.addEventListener('click', startPregBulkModal); }
  { const bs = document.getElementById('bulkSonar'); if (bs) bs.addEventListener('click', bulkSonarModal); }
  view().querySelectorAll('.ptable tr[data-aid]').forEach(tr => { if (tr.dataset.aid) tr.addEventListener('click', () => setHash('#/animal/' + tr.dataset.aid)); });
  view().querySelectorAll('[data-nope]').forEach(b => b.addEventListener('click', async () => {
    const ok = await guard(async () => { await dbUpdate('pregnancies', parseInt(b.dataset.nope, 10), { status: 'not_confirmed' }, true); });   // تسجيل نتيجة (إضافة) — لا يُقفل
    if (ok) { await loadAll(); screenPregnancies(); }
  }));
  view().querySelectorAll('[data-sonar]').forEach(b => b.addEventListener('click', () => sonarModal(C.pregnancies.find(x => x.id === parseInt(b.dataset.sonar, 10)))));
  view().querySelectorAll('[data-pgedit]').forEach(b => b.addEventListener('click', () => { const p = C.pregnancies.find(x => x.id === parseInt(b.dataset.pgedit, 10)); if (p) pregEditModal(p); }));
  view().querySelectorAll('[data-abort]').forEach(b => b.addEventListener('click', () => abortModal(C.pregnancies.find(x => x.id === parseInt(b.dataset.abort, 10)))));
  view().querySelectorAll('[data-birth]').forEach(b => b.addEventListener('click', () => openBirthModal(C.pregnancies.find(x => x.id === parseInt(b.dataset.birth, 10)))));
}
// بدء/تعديل متابعة حمل بالسونار — حفظ تلقائي فور كتابة عمر الحمل.
// مرشّحات: النوع والحظيرة. الأرقام تصاعدياً. كل صف: الرقم + عمر الحمل + الولادة المتوقّعة.
function startPregBulkModal() {
  const all = C.animals.filter(a => a.status === 'present' && a.sex === 'female');
  if (!all.length) { toast('لا توجد إناث في الحظيرة'); return; }
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
      if (p) { await dbUpdate('pregnancies', p.id, { mating_date: conception, gest: g, expected: exp, sonar_date: date, confirmed: true, notes: 'سونار — عمر الحمل ' + age + ' يوم' }, true); Object.assign(p, { mating_date: conception, gest: g, expected: exp, sonar_date: date, confirmed: true }); }   // تسجيل فحص سونار (إضافة) — لا يُقفل
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
  const penChips = pens.length > 1 ? `🏠 <div class="chips"><span class="chip active" data-penf="">الكل</span>${pens.map(p => `<span class="chip" data-penf="${esc(p)}">${esc(p)}</span>`).join('')}</div>` : '';
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
          if (existing) await dbUpdate('pregnancies', existing.id, { confirmed: true, sonar_date: date, expected: exp || existing.expected, status: 'monitoring' }, true);   // تسجيل فحص سونار (إضافة) — لا يُقفل
          else await dbInsert('pregnancies', { animal_id: a.id, mating_date: null, gest: g, expected: exp || addDays(date, g), status: 'monitoring', confirmed: true, sonar_date: date, notes: 'فحص سونار' });
        } else if (existing) {
          await dbUpdate('pregnancies', existing.id, { confirmed: false, sonar_date: date, status: 'not_confirmed' }, true);   // تسجيل فحص سونار (إضافة) — لا يُقفل
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
      const ok = await guard(async () => { await dbUpdate('pregnancies', preg.id, patch, true); });   // تسجيل فحص سونار (إضافة) — لا يُقفل
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
          if (empties.has(p.id)) await dbUpdate('pregnancies', p.id, { confirmed: false, sonar_date: date, status: 'not_confirmed' }, true);   // فحص سونار (إضافة) — لا يُقفل
          else await dbUpdate('pregnancies', p.id, { confirmed: true, sonar_date: date, status: 'monitoring' }, true);
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
    ${fInput('تاريخ الولادة', 'b_date', todayStr(), 'date')}
    ${sireSelectHtml('b_sireSel')}
    ${fInput('الأب / الفحل', 'b_father', '')}
    <div id="bSingle">
      ${fSelect('الجنس', 'b_sex', SEX, 'female')}
      <div id="b_purposeBox">${fSelect('غرض الذكر', 'b_purpose', MALE_PURPOSE, '', '— غير محدّد —')}</div>
      ${fSelect('الغرض', 'b_des', DESIGN, '', '— غير محدّد —')}
      <div class="chips"><span class="chip active" data-bom="none">⭕ بدون ترقيم</span><span class="chip" data-bom="num">🔢 بترقيم</span></div>
      <div id="bomNum" class="hidden">
        ${fInput('بداية الترقيم', 'b_start', '', 'number', 'inputmode="numeric"')}
        ${fInput('بادئة (اختياري)', 'b_prefix', '')}
        <div id="b_hint" class="muted" style="font-size:.82rem"></div></div>
    </div>
    <div id="bRows"></div>
    <div class="check"><input type="checkbox" id="b_create" checked><label for="b_create" style="margin:0">إضافة المواليد كبهائم جديدة (مربوطة بالأم)</label></div>
    ${fTextarea('ملاحظات', 'b_notes', '')}
    <button class="btn" id="b_save">حفظ الولادة</button>`, () => {
    let bom = 'none';
    bindSireSelectSingle('b_sireSel', 'b_father');
    const syncBPurpose = () => { const pb = document.getElementById('b_purposeBox'); if (pb) pb.style.display = val('b_sex') === 'male' ? '' : 'none'; };
    { const bs = document.getElementById('b_sex'); if (bs) bs.addEventListener('change', syncBPurpose); } syncBPurpose();
    document.querySelectorAll('[data-bom]').forEach(c => c.addEventListener('click', () => {
      bom = c.dataset.bom;
      document.querySelectorAll('[data-bom]').forEach(x => x.classList.toggle('active', x.dataset.bom === bom));
      document.getElementById('bomNum').classList.toggle('hidden', bom !== 'num');
      if (bom === 'num') { const s = suggestStart(''); const el = document.getElementById('b_start'); if (el && el.value.trim() === '' && s !== '') el.value = String(s); const h = document.getElementById('b_hint'); if (h) h.textContent = s !== '' ? `اقتراح يبدأ من ${s} (قابل للتعديل)` : 'اكتب البداية التي تريدها'; }
    }));
    // عند العدد > 1: تُفتح بطاقة كاملة مستقلّة لكل مولود (جنس/غرض/معرّف مختلف لكل واحد)
    const renderBRows = () => {
      const box = document.getElementById('bRows'); if (!box) return;
      const n = parseInt(val('b_count'), 10) || 0;
      const multi = n > 1;
      const single = document.getElementById('bSingle'); if (single) single.style.display = multi ? 'none' : '';
      if (!multi) { box.innerHTML = ''; return; }
      const defBirth = val('b_date') || todayStr();
      let html = '';
      for (let i = 1; i <= n; i++) html += newbornFieldsHtml('nb', i, 'female', defBirth);
      box.innerHTML = html;
      for (let i = 1; i <= n; i++) bindNewbornFieldSync('nb', i);
    };
    { const bc = document.getElementById('b_count'); if (bc) bc.addEventListener('input', renderBRows); }
    document.getElementById('b_save').addEventListener('click', async () => {
      const n = parseInt(val('b_count'), 10) || 0; if (n <= 0) { toast('أدخل عدد المواليد'); return; }
      const date = val('b_date') || todayStr(), father = val('b_father').trim(), notes = val('b_notes').trim(), create = document.getElementById('b_create').checked;
      const base = { type: mother.type, pen: mother.pen || '', source: 'born', status: 'present', mother_id: mother.id, father_name: father, notes };
      // العدد > 1: لكل مولود حقوله الكاملة المستقلّة (جنس/غرض/معرّف)
      if (n > 1) {
        if (!await confirm2(`تسجيل ولادة ${n} مولوداً وربطها بـ${display(mother)}؟`)) return;
        const ok = await guard(async () => {
          for (let i = 1; i <= n; i++) {
            const sex = val('nb_sex_' + i) || 'female';
            const idkind = val('nb_kind_' + i) || 'number';
            const code = val('nb_code_' + i).trim();
            let offId = null;
            if (create) {
              const o = Object.assign({}, base, { idkind, code, name: val('nb_name_' + i).trim(), sex, purpose: sex === 'male' ? val('nb_purpose_' + i) : '', designation: val('nb_des_' + i), tag_color: val('nb_tagcolor_' + i), tag_shape: val('nb_tagshape_' + i), birth: val('nb_birth_' + i) || date, color: val('nb_color_' + i).trim() });
              if (!['number', 'tag', 'chip', 'name'].includes(o.idkind)) o.code = '';
              if (!['tag', 'color'].includes(o.idkind)) o.tag_color = '';
              if (o.idkind !== 'tag') o.tag_shape = '';
              const created = await dbInsert('animals', o); offId = created.id;
            }
            await dbInsert('births', { mother_id: mother.id, offspring_id: offId, offspring_code: code, date, sex, father_name: father, notes });
          }
          await dbUpdate('pregnancies', preg.id, { status: 'born' }, true);   // تسجيل ولادة (إضافة) — لا يُقفل
        });
        if (ok) { closeModal(); toast(`تم تسجيل الولادة (${n})`); await loadAll(); screenPregnancies(); }
        return;
      }
      // مولود واحد: الحقول المشتركة (جنس/غرض) + خيار الترقيم
      const sex = val('b_sex');
      let codes;
      if (bom === 'num') { const sr = val('b_start').trim(); if (sr === '') { toast('اكتب بداية الترقيم أو اختر «بدون ترقيم»'); return; } codes = genSeq(val('b_prefix'), sr, n); }
      else codes = new Array(n).fill('');
      const ok = await guard(async () => {
        for (const code of codes) {
          let offId = null;
          if (create) { const created = await dbInsert('animals', Object.assign({}, base, { idkind: idkindFor(code), code, name: '', sex, purpose: sex === 'male' ? val('b_purpose') : '', designation: val('b_des'), color: '', birth: date })); offId = created.id; }
          await dbInsert('births', { mother_id: mother.id, offspring_id: offId, offspring_code: code, date, sex, father_name: father, notes });
        }
        await dbUpdate('pregnancies', preg.id, { status: 'born' }, true);   // تسجيل ولادة (إضافة) — لا يُقفل
      });
      if (ok) { closeModal(); toast(`تم تسجيل الولادة (${n})`); await loadAll(); screenPregnancies(); }
    });
  });
}
// تسجيل إجهاض — أرشيف فقط (لا يُحتسب مواليد)؛ يُحسب منه عمر الحمل عند الإجهاض
function abortModal(preg) {
  const mother = animalById(preg.animal_id);
  openModal('تسجيل إجهاض — ' + display(mother), `
    <div class="muted" style="font-size:.82rem;margin-bottom:6px">يُسجَّل للأرشيف فقط (لا يُحتسب مواليد) — لمعرفة عدد الإجهاضات وأسبابها. ويُحسب منه عمر الحمل عند الإجهاض.</div>
    ${fInput('سبب الإجهاض (اختياري)', 'ab_cause', '')}
    ${fInput('تاريخ الإجهاض', 'ab_date', todayStr(), 'date')}
    <button class="btn danger" id="ab_save">🩸 حفظ الإجهاض</button>`, () => {
    document.getElementById('ab_save').addEventListener('click', async () => {
      const date = val('ab_date') || todayStr();
      const gestDays = preg.mating_date ? Math.max(0, Math.round((new Date(date + 'T00:00:00') - new Date(preg.mating_date + 'T00:00:00')) / 86400000)) : null;
      const ok = await guard(async () => { await dbUpdate('pregnancies', preg.id, { status: 'aborted', abort_date: date, abort_cause: val('ab_cause').trim() || null, abort_gest_days: gestDays }, true); });   // تسجيل إجهاض (إضافة) — لا يُقفل
      if (ok) { closeModal(); toast('سُجّل الإجهاض'); await loadAll(); (parseHash().name === 'pregnancies' ? screenPregnancies() : screenAnimalDetail(String(preg.animal_id))); }
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
  const bar = `<div class="card" style="background:#fff8e1"><div class="li-sub">${LIB_DISCLAIMER}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button class="btn sm outline" id="vt_plan">🗓️ برنامج التطعيم الموصى به</button>${can('vaccines', 'edit') ? '<button class="btn sm outline" id="vt_import">📚 استيراد المكتبة الموصى بها</button><button class="btn sm outline" id="vt_dedup">🧹 كشف وحذف المكرر</button><button class="btn sm outline" id="vt_libupd">⬇️ تحديث من الإنترنت</button>' : ''}</div>`;
  view().innerHTML = bar + (list.length ? list.map(v => `<div class="card">
      <div class="li-title">${esc(v.name)}</div>
      <div class="li-sub">نوع البهيمة: ${esc(speciesLabel(v.species))}</div>
      ${v.usage ? `<div class="li-sub">الاستخدام: ${esc(v.usage)}</div>` : ''}
      ${v.dose ? `<div class="li-sub">الجرعة: ${esc(v.dose)}</div>` : ''}
      ${v.recommended_age ? `<div class="li-sub">العمر الموصى به: ${esc(v.recommended_age)}</div>` : ''}
      ${v.validity_days ? `<div class="li-sub">مدة الفاعلية: ${v.validity_days} يوم</div>` : ''}
      <div class="li-sub">مدة التحريم للحليب: ${v.milk_withdrawal_days || 0} يوم • للحوم: ${v.meat_withdrawal_days || 0} يوم</div>
      ${v.notes ? `<div class="li-sub">${esc(v.notes)}</div>` : ''}
      ${v.source ? `<div class="li-sub" style="opacity:.7">📚 المصدر: ${esc(v.source)}</div>` : ''}
      ${can('vaccines', 'edit') ? `<div class="btn-row" style="margin-top:6px"><button class="btn sm outline" data-edit="${v.id}">تعديل</button><button class="btn sm danger" data-del="${v.id}">حذف</button></div>` : ''}
    </div>`).join('') : '<div class="center-empty">عرّف أنواع التطعيمات مرة واحدة.</div>');
  { const p = document.getElementById('vt_plan'); if (p) p.addEventListener('click', () => setHash('#/vaccine-plan')); }
  { const im = document.getElementById('vt_import'); if (im) im.addEventListener('click', importVaccineLib); }
  { const lu = document.getElementById('vt_libupd'); if (lu) lu.addEventListener('click', () => updateLibraryFromInternet(true)); }
  { const dd = document.getElementById('vt_dedup'); if (dd) dd.addEventListener('click', () => dedupeLibrary('vaccineTypes')); }
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
    ${fInput('المصدر (اختياري)', 'vt_source', v && v.source)}
    ${fTextarea('ملاحظات', 'vt_notes', v && v.notes)}
    <button class="btn" id="vt_save">حفظ</button>`, () => {
    bindSpecies();
    document.getElementById('vt_save').addEventListener('click', async () => {
      const name = val('vt_name').trim(); if (!name) { toast('أدخل اسم التطعيم'); return; }
      if (v && !await confirm2('حفظ تعديل نوع التطعيم؟')) return;
      const milk = num('vt_milk'), meat = num('vt_meat');
      const obj = { name, usage: val('vt_usage').trim(), dose: val('vt_dose').trim(), recommended_age: val('vt_age').trim(), validity_days: num('vt_valid'), milk_withdrawal_days: milk, meat_withdrawal_days: meat, withdrawal_days: Math.max(milk, meat), species: getSpecies(), source: val('vt_source').trim(), notes: val('vt_notes').trim() };
      const ok = await guard(async () => { if (v) await dbUpdate('vaccineTypes', v.id, obj); else await dbInsert('vaccineTypes', obj); });
      if (ok) { closeModal(); toast('تم الحفظ'); await loadAll(); screenVaccineTypes(); }
    });
  });
}

/* ===== أنواع العلاج (كتالوج) ===== */
function screenTreatmentTypes() {
  if (!can('treatments', 'view')) { view().innerHTML = noPerm(); return; }
  const list = C.treatmentTypes.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const milkLabel = (t) => t.meat_withdrawal_days != null || t.milk_withdrawal_days !== undefined
    ? `لحم ${t.meat_withdrawal_days != null ? t.meat_withdrawal_days + ' يوم' : (t.withdrawal_days || 0) + ' يوم'} • حليب ${t.milk_withdrawal_days == null ? 'يُمنع/غير محدّد' : t.milk_withdrawal_days + ' يوم'}`
    : `${t.withdrawal_days || 0} يوم`;
  view().innerHTML = `<div class="card" style="background:#fff8e1"><div class="li-sub">${LIB_DISCLAIMER}</div></div>`
    + `<div class="muted" style="margin-bottom:8px">عرّف العلاجات المتكررة مرة واحدة لاستخدامها بسرعة عند تسجيل علاج.</div>`
    + `${can('treatments', 'edit') ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button class="btn sm outline" id="tt_import">📚 استيراد المكتبة الموصى بها</button><button class="btn sm outline" id="tt_dedup">🧹 كشف وحذف المكرر</button><button class="btn sm outline" id="tt_libupd">⬇️ تحديث من الإنترنت</button></div>' : ''}`
    + (list.length ? list.map(t => `<div class="card">
      <div class="li-title">${esc(t.name)} <span class="muted" style="font-weight:400">${t.form ? '• ' + arOf(TREAT_FORM, t.form) : ''}</span></div>
      ${t.dose ? `<div class="li-sub">الجرعة: ${esc(t.dose)}</div>` : ''}
      ${t.duration_days ? `<div class="li-sub">مدة استخدام العلاج: ${t.duration_days} يوم</div>` : ''}
      <div class="li-sub">مدة التحريم: ${milkLabel(t)}</div>
      <div class="li-sub">البهيمة: ${esc(speciesLabel(t.species))}</div>
      ${t.treats ? `<div class="li-sub">يعالج الأمراض: ${esc(t.treats)}</div>` : ''}
      ${t.notes ? `<div class="li-sub">${esc(t.notes)}</div>` : ''}
      ${t.source ? `<div class="li-sub" style="opacity:.7">📚 المصدر: ${esc(t.source)}</div>` : ''}
      ${can('treatments', 'edit') ? `<div class="btn-row" style="margin-top:6px"><button class="btn sm outline" data-edit="${t.id}">تعديل</button><button class="btn sm danger" data-del="${t.id}">حذف</button></div>` : ''}
    </div>`).join('') : '<div class="center-empty">لا توجد أنواع علاج — أضِف نوعاً.</div>');
  { const im = document.getElementById('tt_import'); if (im) im.addEventListener('click', importTreatmentLib); }
  { const lu = document.getElementById('tt_libupd'); if (lu) lu.addEventListener('click', () => updateLibraryFromInternet(true)); }
  { const dd = document.getElementById('tt_dedup'); if (dd) dd.addEventListener('click', () => dedupeLibrary('treatmentTypes')); }
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
    ${fInput('مدة التحريم للحوم (أيام)', 'tt_meat', t ? (t.meat_withdrawal_days != null ? t.meat_withdrawal_days : t.withdrawal_days) : '', 'number', 'min="0"')}
    ${fInput('مدة التحريم للحليب (أيام — اتركه فارغاً = يُمنع/غير محدّد)', 'tt_milk', t ? t.milk_withdrawal_days : '', 'number', 'min="0"')}
    ${fSpecies(t && t.species)}
    ${fInput('يعالج الأمراض', 'tt_treats', t && t.treats)}
    ${fInput('المصدر (اختياري)', 'tt_source', t && t.source)}
    ${fTextarea('ملاحظات', 'tt_notes', t && t.notes)}
    <button class="btn" id="tt_save">حفظ</button>`, () => {
    bindSpecies();
    document.getElementById('tt_save').addEventListener('click', async () => {
      const name = val('tt_name').trim(); if (!name) { toast('أدخل اسم العلاج'); return; }
      if (t && !await confirm2('حفظ تعديل نوع العلاج؟')) return;
      const meat = num('tt_meat'); const milk = val('tt_milk') !== '' ? num('tt_milk') : null;
      const obj = { name, form: val('tt_form') || null, dose: val('tt_dose').trim(), duration_days: num('tt_dur'), withdrawal_days: meat, meat_withdrawal_days: meat, milk_withdrawal_days: milk, species: getSpecies(), treats: val('tt_treats').trim(), source: val('tt_source').trim(), notes: val('tt_notes').trim() };
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
  attachMic('v_notes', { append: true });
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
// تعديل تطعيم مُعطى سابقاً — يُعاد احتساب تاريخ انتهاء التحريم من النوع/التاريخ الجديدين
function vaccEditModal(v) {
  const typeOpts = C.vaccineTypes.map(x => ({ k: String(x.id), ar: x.name }));
  openModal('تعديل التطعيم', `
    ${fSelect('التطعيم', 've_type', typeOpts, String(v.type_id), '— اختر —')}
    ${fInput('تاريخ التطعيم', 've_date', v.date, 'date')}
    ${fInput('موعد الجرعة القادمة (اختياري)', 've_next', v.next_due, 'date')}
    ${fTextarea('ملاحظات', 've_notes', v.notes)}
    <button class="btn" id="ve_save">حفظ التعديل</button>`, () => {
    document.getElementById('ve_save').addEventListener('click', async () => {
      const t = C.vaccineTypes.find(x => x.id === parseInt(val('ve_type'), 10)); const d = val('ve_date');
      if (!t) { toast('اختر التطعيم'); return; } if (!d) { toast('أدخل التاريخ'); return; }
      if (!await confirm2('⚠️ تعديل بيانات هذا التطعيم؟ سيُعاد احتساب تاريخ انتهاء التحريم من التاريخ والنوع الجديدين — تحقّق من مدد التحريم قبل أي بيع أو حلب.', { danger: true })) return;
      const ok = await guard(async () => { await dbUpdate('vaccinations', v.id, { type_id: t.id, date: d, withdrawal_end: addDays(d, vtWithdrawDays(t)), next_due: val('ve_next') || null, notes: val('ve_notes').trim() }); });
      if (ok) { closeModal(); toast('تم تعديل التطعيم'); await loadAll(); screenAnimalDetail(String(v.animal_id)); }
    });
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
    ${fInput('كرّر الجرعة بعد (أيام) — اختياري', 't_every', '', 'number', 'min="0"')}
    ${fInput('موعد الجرعة القادمة (اختياري)', 't_next', '', 'date')}
    <div class="hint" id="t_hint"></div>
    ${fInput('الإجراء', 't_action', '')}${fTextarea('ملاحظات', 't_notes', '')}
    <button class="btn" id="t_save">حفظ</button></div>`;
  const hint = document.getElementById('t_hint');
  attachMic('t_med'); attachMic('t_action'); attachMic('t_notes', { append: true });
  const upd = () => {
    const days = num('t_days'), d = val('t_date'); const every = num('t_every');
    if (every > 0 && d && !val('t_next')) document.getElementById('t_next').value = addDays(d, every); // اقتراح موعد الجرعة القادمة
    const parts = [];
    if (days > 0 && d) parts.push(`انتهاء التحريم: ${fmtDate(addDays(d, days))}`);
    if (val('t_next')) parts.push(`الجرعة القادمة: ${fmtDate(val('t_next'))}`);
    hint.textContent = parts.join(' • ');
  };
  document.getElementById('t_days').addEventListener('input', upd); document.getElementById('t_date').addEventListener('change', upd);
  document.getElementById('t_every').addEventListener('input', upd); document.getElementById('t_next').addEventListener('change', upd);
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
    const ok = await guard(async () => { await dbInsert('treatments', { animal_id: a.id, treatment_type: val('t_type').trim(), med_name: val('t_med').trim(), withdrawal_days: days, date: d, withdrawal_end: addDays(d, days), next_due: val('t_next') || null, action: val('t_action').trim(), notes: val('t_notes').trim() }); });
    if (ok) { toast('تم الحفظ'); await loadAll(); goBack(); }
  });
}
// تعديل علاج مُعطى سابقاً — يُعاد احتساب تاريخ انتهاء التحريم من المدة/التاريخ الجديدين
function treatEditModal(t) {
  openModal('تعديل العلاج', `
    ${fInput('نوع العلاج', 'te_type', t.treatment_type)}
    ${fInput('اسم العلاج', 'te_med', t.med_name)}
    ${fInput('مدة التحريم (أيام)', 'te_days', t.withdrawal_days, 'number', 'min="0"')}
    ${fInput('تاريخ العلاج', 'te_date', t.date, 'date')}
    ${fInput('موعد الجرعة القادمة (اختياري)', 'te_next', t.next_due, 'date')}
    ${fInput('الإجراء', 'te_action', t.action)}${fTextarea('ملاحظات', 'te_notes', t.notes)}
    <button class="btn" id="te_save">حفظ التعديل</button>`, () => {
    document.getElementById('te_save').addEventListener('click', async () => {
      const d = val('te_date'), days = num('te_days');
      if (!d) { toast('أدخل التاريخ'); return; }
      if (!await confirm2('⚠️ تعديل بيانات هذا العلاج؟ سيُعاد احتساب تاريخ انتهاء التحريم من المدة والتاريخ الجديدين — تحقّق من مدد التحريم قبل أي بيع أو حلب.', { danger: true })) return;
      const ok = await guard(async () => { await dbUpdate('treatments', t.id, { treatment_type: val('te_type').trim(), med_name: val('te_med').trim(), withdrawal_days: days, date: d, withdrawal_end: addDays(d, days), next_due: val('te_next') || null, action: val('te_action').trim(), notes: val('te_notes').trim() }); });
      if (ok) { closeModal(); toast('تم تعديل العلاج'); await loadAll(); screenAnimalDetail(String(t.animal_id)); }
    });
  });
}

/* ===== برنامج التطعيم الموصى به (استرشادي) ===== */
function screenVaccinePlan() {
  const groups = [['🐑 الأغنام والماعز', SMALL_RUM], ['🐪 الإبل', ['إبل']], ['🐄 البقر', ['بقر']]];
  const inGroup = (v, arr) => (v.species || []).some(s => arr.includes(s));
  let html = '<div class="card" style="background:#fff8e1"><div class="li-sub">⚠️ برنامج استرشادي عام — اضبط المواعيد حسب توصية الطبيب البيطري والوضع الوبائي في منطقتك. مدد التحريم والجرعات تُحدَّد من نشرة المنتج.</div></div>';
  groups.forEach(([title, arr]) => {
    const items = VACCINE_LIB.filter(v => inGroup(v, arr));
    if (!items.length) return;
    html += `<div class="card" style="background:#e3f2fd"><h3>${title}</h3>` + items.map(v =>
      `<div style="padding:7px 0;border-bottom:1px solid #d0e3f0"><div class="li-title">💉 ${esc(v.name)}</div>${v.usage ? `<div class="li-sub">${esc(v.usage)}</div>` : ''}<div class="li-sub">🗓️ ${esc(v.age || 'حسب الإرشاد')}</div>${v.route ? `<div class="li-sub">💉 ${esc(v.route)}</div>` : ''}${v.source ? `<div class="li-sub" style="opacity:.7">📚 ${esc(v.source)}</div>` : ''}</div>`
    ).join('') + '</div>';
  });
  view().innerHTML = html;
}

/* ===== مخزون الأدوية واللقاحات ===== */
const lowStockMeds = () => (C.medstock || []).filter(m => m.low != null && m.low !== '' && (+m.qty || 0) <= (+m.low || 0));
const expiringMeds = () => (C.medstock || []).filter(m => m.expiry && daysUntil(m.expiry) !== null && daysUntil(m.expiry) <= 30);
function screenMedStock() {
  if (!can('treatments', 'view')) { view().innerHTML = noPerm(); return; }
  const list = (C.medstock || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">سجّل أدويتك ولقاحاتك: الكمية، الصلاحية، وحدّ التنبيه عند النفاد. يُنبّهك التطبيق عند النقص أو قرب الانتهاء.</div>`
    + (list.length ? list.map(m => {
      const low = m.low != null && m.low !== '' && (+m.qty || 0) <= (+m.low || 0);
      const dleft = m.expiry ? daysUntil(m.expiry) : null;
      const expired = dleft !== null && dleft < 0, near = dleft !== null && dleft >= 0 && dleft <= 30;
      const bg = expired ? '#ffebee' : (low || near ? '#fff8e1' : 'var(--card)');
      return `<div class="card" style="background:${bg}">
        <div class="li-title">💊 ${esc(m.name)} ${low ? '<span style="color:#c62828;font-weight:400">• نفد/قارب النفاد</span>' : ''}</div>
        <div class="li-sub">الكمية: ${esc(String(m.qty == null ? '—' : m.qty))} ${esc(m.unit || '')}${m.low != null && m.low !== '' ? ` • حدّ التنبيه: ${esc(String(m.low))}` : ''}</div>
        ${m.expiry ? `<div class="li-sub">${expired ? '⛔ منتهي الصلاحية' : (near ? '⚠️ قارب الانتهاء' : 'الصلاحية')}: ${fmtDate(m.expiry)}${dleft !== null ? ` (${expired ? 'منذ ' + (-dleft) : 'بعد ' + dleft} يوم)` : ''}</div>` : ''}
        ${m.notes ? `<div class="li-sub">${esc(m.notes)}</div>` : ''}
        ${can('treatments', 'edit') ? `<div class="btn-row" style="margin-top:6px"><button class="btn sm outline" data-edit="${m.id}">تعديل</button><button class="btn sm danger" data-del="${m.id}">حذف</button></div>` : ''}
      </div>`;
    }).join('') : '<div class="center-empty">لا توجد أدوية مسجّلة بعد — أضِف دواءً.</div>');
  view().querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => medStockModal((C.medstock || []).find(m => String(m.id) === b.dataset.edit))));
  view().querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('حذف هذا الدواء من المخزون؟')) return;
    const ok = await guard(async () => { await dbDelete('medstock', parseInt(b.dataset.del, 10)); });
    if (ok) { toast('حُذف'); await loadAll(); screenMedStock(); }
  }));
  if (can('treatments', 'edit')) addFab('+ دواء/لقاح', () => medStockModal(null));
}
function medStockModal(m) {
  openModal(m ? 'تعديل دواء/لقاح' : 'دواء/لقاح جديد', `
    ${fInput('اسم الدواء/اللقاح', 'ms_name', m && m.name)}
    ${fInput('الكمية', 'ms_qty', m ? m.qty : '', 'number', 'min="0" step="any" inputmode="decimal"')}
    ${fInput('الوحدة (علبة/مل/جرعة)', 'ms_unit', m && m.unit)}
    ${fInput('حدّ التنبيه عند النفاد (اختياري)', 'ms_low', m ? m.low : '', 'number', 'min="0"')}
    ${fInput('تاريخ انتهاء الصلاحية (اختياري)', 'ms_exp', m && m.expiry, 'date')}
    ${fTextarea('ملاحظات', 'ms_notes', m && m.notes)}
    <button class="btn" id="ms_save">حفظ</button>`, () => {
    attachMic('ms_name'); attachMic('ms_notes', { append: true });
    document.getElementById('ms_save').addEventListener('click', async () => {
      const name = val('ms_name').trim(); if (!name) { toast('أدخل اسم الدواء'); return; }
      const obj = { name, qty: val('ms_qty') !== '' ? parseFloat(asciiDigits(val('ms_qty'))) : 0, unit: val('ms_unit').trim(), low: val('ms_low') !== '' ? parseFloat(asciiDigits(val('ms_low'))) : null, expiry: asciiDigits(val('ms_exp')).slice(0, 10) || null, notes: val('ms_notes').trim() };
      const ok = await guard(async () => { if (m) await dbUpdate('medstock', m.id, obj); else await dbInsert('medstock', obj); });
      if (ok) { closeModal(); toast('تم الحفظ'); await loadAll(); screenMedStock(); }
    });
  });
}

/* ===== إجراءات سريعة من ملف البهيمة (بيع/نفوق/إعادة) ===== */
function quickSell(a) {
  openModal('تسجيل بيع', `
    ${fInput('تاريخ البيع', 'qs_date', todayStr(), 'date')}
    ${fInput('سعر البيع (اختياري)', 'qs_price', '', 'number', 'min="0" step="any" inputmode="decimal"')}
    <button class="btn" id="qs_save">حفظ البيع</button>`, () => {
    document.getElementById('qs_save').addEventListener('click', async () => {
      const wd = withdrawalActiveOn(a.id, val('qs_date') || todayStr());
      const msg = wd ? `⚠️ هذه البهيمة تحت تحريم دواء حتى ${fmtDate(wd)} (لا يُنصح ببيعها/ذبحها قبله). تسجيل البيع وإخراجها من الحظيرة؟` : 'تسجيل بيع هذه البهيمة وإخراجها من الحظيرة؟';
      if (!await confirm2(msg, wd ? { danger: true } : {})) return;
      const price = val('qs_price') !== '' ? parseFloat(val('qs_price')) : null;
      const ok = await guard(async () => { await dbUpdate('animals', a.id, { status: 'sold', sale_date: val('qs_date') || null, sale_price: price, dead_date: null, gift_date: null, gift_to: null }); });
      if (ok) { closeModal(); toast('تم تسجيل البيع'); await loadAll(); screenAnimalDetail(String(a.id)); }
    });
  });
}
function quickDead(a) {
  openModal('تسجيل نفوق', `
    ${fInput('تاريخ النفوق', 'qd_date', todayStr(), 'date')}
    <button class="btn danger" id="qd_save">حفظ النفوق</button>`, () => {
    document.getElementById('qd_save').addEventListener('click', async () => {
      if (!await confirm2('تسجيل نفوق هذه البهيمة وإخراجها من الحظيرة؟')) return;
      const ok = await guard(async () => { await dbUpdate('animals', a.id, { status: 'dead', dead_date: val('qd_date') || null, sale_date: null, sale_price: null, gift_date: null, gift_to: null }); });
      if (ok) { closeModal(); toast('تم تسجيل النفوق'); await loadAll(); screenAnimalDetail(String(a.id)); }
    });
  });
}
function quickGift(a) {
  openModal('تسجيل إهداء', `
    ${fInput('تاريخ الإهداء', 'qg_date', todayStr(), 'date')}
    ${fInput('أُهديت إلى (اختياري)', 'qg_to', '')}
    <button class="btn" id="qg_save">حفظ الإهداء</button>`, () => {
    document.getElementById('qg_save').addEventListener('click', async () => {
      if (!await confirm2('تسجيل إهداء هذه البهيمة وإخراجها من الحظيرة؟')) return;
      const ok = await guard(async () => { await dbUpdate('animals', a.id, { status: 'given', gift_date: val('qg_date') || null, gift_to: val('qg_to').trim() || null, sale_date: null, sale_price: null, dead_date: null }); });
      if (ok) { closeModal(); toast('تم تسجيل الإهداء'); await loadAll(); screenAnimalDetail(String(a.id)); }
    });
  });
}
function quickMissing(a) {
  openModal('تسجيل فقد', `
    ${fInput('تاريخ الفقد', 'qm_date', todayStr(), 'date')}
    <div class="muted" style="font-size:.82rem">تُخرَج من عدد الحظيرة وتبقى في السجل — إذا وُجدت أعِدها للحظيرة.</div>
    <button class="btn" id="qm_save">حفظ كمفقودة</button>`, () => {
    document.getElementById('qm_save').addEventListener('click', async () => {
      if (!await confirm2('تسجيل هذه البهيمة كمفقودة وإخراجها من عدد الحظيرة؟')) return;
      const ok = await guard(async () => { await dbUpdate('animals', a.id, { status: 'missing', missing_date: val('qm_date') || null, sale_date: null, sale_price: null, dead_date: null, gift_date: null, gift_to: null, slaughter_date: null }); });
      if (ok) { closeModal(); toast('سُجّلت كمفقودة'); await loadAll(); screenAnimalDetail(String(a.id)); }
    });
  });
}
function quickSlaughter(a) {
  openModal('استهلاك ذاتي (ذبح)', `
    ${fInput('تاريخ الذبح', 'qsl_date', todayStr(), 'date')}
    <button class="btn danger" id="qsl_save">حفظ كذبح شخصي</button>`, () => {
    document.getElementById('qsl_save').addEventListener('click', async () => {
      const wd = withdrawalActiveOn(a.id, val('qsl_date') || todayStr());
      const msg = wd ? `⚠️ هذه البهيمة تحت تحريم دواء حتى ${fmtDate(wd)} — لا يُنصح بذبحها/أكلها قبله. تسجيل الذبح؟` : 'تسجيل ذبح هذه البهيمة للاستهلاك الذاتي وإخراجها من الحظيرة؟';
      if (!await confirm2(msg, wd ? { danger: true } : {})) return;
      const ok = await guard(async () => { await dbUpdate('animals', a.id, { status: 'slaughtered', slaughter_date: val('qsl_date') || null, sale_date: null, sale_price: null, dead_date: null, gift_date: null, gift_to: null, missing_date: null }); });
      if (ok) { closeModal(); toast('سُجّل الذبح'); await loadAll(); screenAnimalDetail(String(a.id)); }
    });
  });
}
async function quickRevert(a) {
  if (!await confirm2('إعادة هذه البهيمة إلى الحظيرة؟ ستُلغى بيانات البيع/النفوق/الإهداء/الفقد/الذبح.')) return;
  const ok = await guard(async () => { await dbUpdate('animals', a.id, { status: 'present', sale_date: null, sale_price: null, dead_date: null, gift_date: null, gift_to: null, missing_date: null, slaughter_date: null }); });
  if (ok) { toast('أُعيدت للحظيرة'); await loadAll(); screenAnimalDetail(String(a.id)); }
}
// مشاركة بطاقة البهيمة كنص جاهز (واتساب/رسائل…)
async function shareAnimalCard(a) {
  const mother = a.mother_id ? animalById(a.mother_id) : null;
  const off = C.animals.filter(x => x.mother_id === a.id || x.father_id === a.id).length;
  const L = [];
  L.push('🐑 بطاقة بهيمة — حلالي');
  L.push('———————————');
  L.push('النوع: ' + arOf(TYPES, a.type));
  L.push('المعرّف: ' + (a.code ? a.code + ' (' + arOf(IDKIND, a.idkind) + ')' : 'غير مرقّمة'));
  if (a.name) L.push('الاسم: ' + a.name);
  L.push('الجنس: ' + sexTerm(a));
  if (a.tag_color || a.tag_shape) L.push('الوسم: ' + [a.tag_color, a.tag_shape].filter(Boolean).join(' / '));
  if (a.color) L.push('اللون: ' + a.color);
  if (a.birth) L.push('الميلاد: ' + fmtDate(a.birth) + (ageText(a.birth) ? ' (' + ageText(a.birth) + ')' : ''));
  L.push('النسب: الأم ' + (mother ? display(mother) : (a.mother_name || '—')) + ' • الأب ' + (a.father_name || '—'));
  if (off) L.push('النتاج: ' + off + ' مولود');
  L.push('الحالة: ' + arOf(STATUS, a.status));
  if (a.notes) L.push('ملاحظات: ' + a.notes);
  const text = L.join('\n');
  try {
    if (navigator.share) { await navigator.share({ title: 'بطاقة ' + display(a), text }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const ok = await copyText(text);
  toast(ok ? 'نُسخت البطاقة — الصقها في أي تطبيق ✅' : 'تعذّرت المشاركة على هذا الجهاز');
}

/* ===== دليل التواصل (زبائن/بيطري/شعبي/موردون…) — محلي على الجهاز ===== */
const CONTACT_CATS = [
  { k: 'buyer', ar: '🛒 زبون/مشتري' }, { k: 'vet', ar: '🩺 طبيب بيطري' },
  { k: 'folk', ar: '🌿 معالج شعبي' }, { k: 'supplier', ar: '📦 مورّد (علف/أدوية)' },
  { k: 'transport', ar: '🚚 نقل/شحن' }, { k: 'other', ar: '👤 أخرى' },
];
function loadContacts() { try { return JSON.parse(localStorage.getItem('mrahi_contacts') || '[]') || []; } catch (e) { return []; } }
function saveContacts(a) { try { localStorage.setItem('mrahi_contacts', JSON.stringify(a)); } catch (e) {} }
const digitsOnly = (s) => String(s || '').replace(/[^\d+]/g, '');
// رقم واتساب دولي: يحوّل 05XXXXXXXX السعودي إلى 9665XXXXXXXX (أفضل جهد)
function waNumber(phone) { let d = String(phone || '').replace(/\D/g, ''); if (d.length === 10 && d.indexOf('05') === 0) d = '966' + d.slice(1); else if (d.length === 9 && d.indexOf('5') === 0) d = '966' + d; return d; }
function screenContacts() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const canEdit = can('animals', 'edit');
  const contacts = loadContacts().slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  const catAr = (k) => (CONTACT_CATS.find(c => c.k === k) || { ar: '👤 أخرى' }).ar;
  const groups = {}; contacts.forEach(c => { (groups[c.category || 'other'] = groups[c.category || 'other'] || []).push(c); });
  let body = '';
  CONTACT_CATS.forEach(cat => {
    const arr = groups[cat.k]; if (!arr || !arr.length) return;
    body += `<div class="card"><h3>${cat.ar} (${arr.length})</h3>` + arr.map(c => {
      const tel = digitsOnly(c.phone), wa = waNumber(c.phone);
      return `<div style="padding:8px 0;border-bottom:1px solid #eee">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span class="li-title" style="font-weight:600">${esc(c.name)}</span>
          ${canEdit ? `<span style="display:flex;gap:6px"><button class="btn sm outline" data-cedit="${c.id}">تعديل</button><button class="btn sm danger" data-cdel="${c.id}">حذف</button></span>` : ''}
        </div>
        ${c.phone ? `<div class="li-sub">📞 ${esc(c.phone)}</div>
          <div class="btn-row" style="margin-top:4px"><a class="btn sm" href="tel:${esc(tel)}">📞 اتصال</a>${wa ? `<a class="btn sm outline" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">💬 واتساب</a>` : ''}</div>` : ''}
        ${c.notes ? `<div class="li-sub">📝 ${esc(c.notes)}</div>` : ''}
      </div>`;
    }).join('') + '</div>';
  });
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">أرقام تواصلك المهمّة محفوظة على جهازك: زبائن، بيطري، معالج شعبي، موردون…</div>
    ${canEdit ? `<button class="btn" id="c_add">➕ إضافة جهة تواصل</button>` : ''}
    ${body || '<div class="muted" style="margin-top:10px">لا يوجد جهات تواصل بعد — أضِف أول جهة.</div>'}`;
  const ca = document.getElementById('c_add'); if (ca) ca.addEventListener('click', () => contactModal(null));
  view().querySelectorAll('[data-cedit]').forEach(b => b.addEventListener('click', () => { const c = loadContacts().find(x => String(x.id) === b.dataset.cedit); if (c) contactModal(c); }));
  view().querySelectorAll('[data-cdel]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('حذف جهة التواصل هذه؟')) return;
    saveContacts(loadContacts().filter(x => String(x.id) !== b.dataset.cdel));
    toast('حُذفت'); screenContacts();
  }));
}
function contactModal(c) {
  openModal(c ? 'تعديل جهة تواصل' : 'إضافة جهة تواصل', `
    ${fInput('الاسم', 'ct_name', c && c.name)}
    ${fSelect('التصنيف', 'ct_cat', CONTACT_CATS, c ? c.category : 'buyer')}
    ${fInput('رقم الجوال', 'ct_phone', c && c.phone, 'tel', 'inputmode="tel"')}
    ${fTextarea('ملاحظات (اختياري)', 'ct_notes', c && c.notes)}
    <button class="btn" id="ct_save">حفظ</button>`, () => {
    document.getElementById('ct_save').addEventListener('click', () => {
      const name = val('ct_name').trim(); if (!name) { toast('اكتب الاسم'); return; }
      const list = loadContacts();
      const obj = { name, category: val('ct_cat'), phone: val('ct_phone').trim(), notes: val('ct_notes').trim() };
      if (c) { const i = list.findIndex(x => String(x.id) === String(c.id)); if (i >= 0) list[i] = Object.assign({}, list[i], obj); }
      else { obj.id = 'c' + new Date().getTime(); list.push(obj); }
      saveContacts(list); closeModal(); toast('تم الحفظ'); screenContacts();
    });
  });
}

/* ===== فحول المراح — كل ذكر غرضه «فحل للقطيع» (شراءً أو مولوداً أو تحويلاً) ===== */
function screenSires() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const sires = C.animals.filter(a => a.sex === 'male' && a.purpose === 'sire' && (!animalFilter || a.type === animalFilter));
  const present = sortAnimals(sires.filter(s => s.status === 'present'));
  const others = sortAnimals(sires.filter(s => s.status !== 'present'));
  const card = (s) => {
    const kids = sireOffspring(s);
    const sons = kids.filter(k => k.sex === 'male').length, daughters = kids.filter(k => k.sex === 'female').length;
    const dams = sireMatedFemales(s);
    const ic = STATUS_ICON[s.status] || '';
    return `<div class="card click" data-aid="${s.id}" style="margin:6px 0">
      <div class="li-title">🐏 ${display(s)}</div>
      <div class="li-sub">${arOf(TYPES, s.type)}${s.birth ? ' • ' + (ageText(s.birth) || '') : ''}${s.pen ? ' • 🏠 ' + esc(s.pen) : ''}${s.status !== 'present' ? ' • ' + ic + ' ' + arOf(STATUS, s.status) : ''}</div>
      ${kids.length ? `<div class="li-sub link" data-kids="${s.id}">👶 نتاجه: ${kids.length} (${sons} ذكور، ${daughters} إناث) — عرض</div>` : ''}
      ${dams.length ? `<div class="li-sub link" data-dams="${s.id}">🐑 لقّح: ${dams.length} أنثى — عرض</div>` : ''}
      <div class="li-sub muted">المصدر: ${arOf(SOURCE, s.source || 'purchased')}</div></div>`;
  };
  view().innerHTML = typeChipsHtml() + `<div class="muted" style="margin:8px 0">فحول القطيع = الذكور المُعيَّنة «🐏 فحل للقطيع» — تُضاف شراءً أو من المواليد، أو تُحوَّل من أي ذكر لاحقاً من سجله.</div>
    <div class="stats" style="grid-template-columns:1fr 1fr"><div class="stat green"><div class="n">${present.length}</div><div class="l">فحول في الحظيرة</div></div><div class="stat"><div class="n">${sires.length}</div><div class="l">إجمالي الفحول</div></div></div>
    ${can('animals', 'add') ? `<button class="btn" id="s_addbuy" style="margin:8px 0">➕ إضافة فحل (شراء)</button>` : ''}
    <div class="card"><h3>🟢 فحول في الحظيرة (${present.length})</h3>${present.length ? present.map(card).join('') : noItem()}</div>
    ${others.length ? `<div class="card"><h3>خارج الحظيرة (${others.length})</h3>${others.map(card).join('')}</div>` : ''}
    <div class="muted" style="font-size:.82rem;margin-top:8px">لتحويل ذكر إلى فحل: افتح سجله ← تبويب «📋 البيانات» ← «🐏 تعيينه فحلاً».<br>الأبناء/البنات والإناث الملقَّحة تُحسَب بمطابقة اسم/رقم الفحل مع حقل «الأب» — راجِعها لو تشابهت الأسماء بين فحلين.</div>`;
  bindCards(view());
  bindTypeChips(screenSires);
  view().querySelectorAll('[data-kids]').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); const s = animalById(parseInt(el.dataset.kids, 10)); if (s) animalListModal('أبناء وبنات 🐏 ' + display(s), sireOffspring(s)); }));
  view().querySelectorAll('[data-dams]').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); const s = animalById(parseInt(el.dataset.dams, 10)); if (s) animalListModal('الإناث التي لقّحها 🐏 ' + display(s), sireMatedFemales(s)); }));
  const ab = document.getElementById('s_addbuy'); if (ab) ab.addEventListener('click', () => { setHash('#/animal-edit/0'); });
}

/* ===== الإناث — البالغات القابلات للتلقيح (منفصلات عن أمّهاتهن) ===== */
let femaleFilter = 'all';   // 'all' | 'mated' | 'produced' | 'notmated'
function screenFemales() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  // بلغت سن النضج حسب نوعها (أو بلا تاريخ ميلاد معروف = تُحسب بالغة احتياطاً)
  const eligible = (a) => a.sex === 'female' && a.status === 'present' && (!animalFilter || a.type === animalFilter) && (!a.birth || !pubertyOf(a.type) || ageMonths(a.birth) >= pubertyOf(a.type));
  const all = C.animals.filter(eligible);
  const matedIds = new Set(C.matings.map(m => m.animal_id));
  const producedIds = new Set(C.animals.filter(x => x.mother_id).map(x => x.mother_id));
  const mated = all.filter(a => matedIds.has(a.id));
  const produced = all.filter(a => producedIds.has(a.id));
  const notMated = all.filter(a => !matedIds.has(a.id));
  const groups = { all, mated, produced, notmated: notMated };
  const list = sortAnimals(groups[femaleFilter] || all);
  const card = (a) => {
    const offs = C.animals.filter(x => x.mother_id === a.id);
    const lastMating = C.matings.filter(m => m.animal_id === a.id).sort((x, y) => (y.date || '').localeCompare(x.date || ''))[0];
    const lastBirthOff = offs.slice().sort((x, y) => (y.birth || '').localeCompare(x.birth || ''))[0];
    const sireInfo = lastMating ? (lastMating.sire_name || lastMating.sire_code) : (lastBirthOff ? lastBirthOff.father_name : '');
    return `<div class="card click" data-aid="${a.id}" style="margin:6px 0">
      <div class="li-title">${display(a)}</div>
      <div class="li-sub">${arOf(TYPES, a.type)}${a.birth ? ' • ' + (ageText(a.birth) || '') : ''}${a.pen ? ' • 🏠 ' + esc(a.pen) : ''}</div>
      ${offs.length ? `<div class="li-sub link" data-off="${a.id}">👶 إنتاجها: ${offs.length}${sireInfo ? ' • آخر فحل: ' + esc(sireInfo) : ''} — عرض</div>` : (sireInfo ? `<div class="li-sub">🐏 آخر تلقيح: ${esc(sireInfo)}</div>` : '')}</div>`;
  };
  const chip = (k, label, n) => `<span class="chip ${femaleFilter === k ? 'active' : ''}" data-ff="${k}">${label} (${n})</span>`;
  view().innerHTML = typeChipsHtml() + `<div class="muted" style="margin:8px 0">الإناث البالغات سنّ النضج (منفصلات عن أمّهاتهن، قابلات للتلقيح)</div>
    <div class="stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat green"><div class="n">${mated.length}</div><div class="l">ملقّحة</div></div>
      <div class="stat blue"><div class="n">${produced.length}</div><div class="l">معها مواليد</div></div>
      <div class="stat amber"><div class="n">${notMated.length}</div><div class="l">لم تُلقّح بعد</div></div>
    </div>
    <div class="chips">${chip('all', 'الكل', all.length)}${chip('mated', 'ملقّحة', mated.length)}${chip('produced', 'معها مواليد', produced.length)}${chip('notmated', 'لم تُلقّح', notMated.length)}</div>
    <div class="muted" style="margin:8px 0">العدد: ${list.length}</div>
    ${list.length ? list.map(card).join('') : noItem()}`;
  view().querySelectorAll('[data-ff]').forEach(c => c.addEventListener('click', () => { femaleFilter = c.dataset.ff; screenFemales(); }));
  bindTypeChips(screenFemales);
  bindCards(view());
  view().querySelectorAll('[data-off]').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); offspringListModal(parseInt(el.dataset.off, 10)); }));
}

/* ===== المواليد — لسّه يتبعون أمّهم (غير محتسَبين في «في الحظيرة») ===== */
let newbornSexFilter = 'all';   // 'all' | 'male' | 'female'
let newbornAgeFilter = 'all';   // 'all' | 'lt1' | '1to3' | '3to6' | 'gt6'
function screenNewborns() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const all = C.animals.filter(a => a.status === 'present' && a.source === 'born' && !inHerdCount(a) && (!animalFilter || a.type === animalFilter));
  const males = all.filter(a => a.sex === 'male');
  const females = all.filter(a => a.sex === 'female');
  const ageBucket = (a) => { if (!a.birth) return 'unknown'; const m = ageMonths(a.birth); if (m < 1) return 'lt1'; if (m < 3) return '1to3'; if (m < 6) return '3to6'; return 'gt6'; };
  const byAge = { lt1: [], '1to3': [], '3to6': [], gt6: [] };
  all.forEach(a => { const b = ageBucket(a); if (byAge[b]) byAge[b].push(a); });
  let list = filterBySex(all, newbornSexFilter);
  if (newbornAgeFilter !== 'all') list = list.filter(a => ageBucket(a) === newbornAgeFilter);
  list = sortAnimals(list);
  const card = (a) => {
    const mother = a.mother_id ? animalById(a.mother_id) : null;
    return `<div class="card click" data-aid="${a.id}" style="margin:6px 0">
      <div class="li-title">${display(a)}</div>
      <div class="li-sub">${esc(sexTerm(a))}${a.birth ? ' • ' + (ageText(a.birth) || '') : ''}</div>
      <div class="li-sub">🤱 الأم: ${mother ? display(mother) : (esc(a.mother_name) || '—')}</div>
      ${a.father_name ? `<div class="li-sub">🐏 الفحل: ${esc(a.father_name)}</div>` : ''}</div>`;
  };
  const sexChip = (k, label, n) => `<span class="chip ${newbornSexFilter === k ? 'active' : ''}" data-nsex="${k}">${label} (${n})</span>`;
  const ageChip = (k, label) => `<span class="chip ${newbornAgeFilter === k ? 'active' : ''}" data-nage="${k}">${label} (${byAge[k] ? byAge[k].length : 0})</span>`;
  view().innerHTML = typeChipsHtml() + `<div class="muted" style="margin:8px 0">مواليد لسّه يتبعون أمّهم ولم يُحتسبوا بعد في «في الحظيرة»</div>
    <div class="stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat"><div class="n">${males.length}</div><div class="l">👦 ذكور</div></div>
      <div class="stat"><div class="n">${females.length}</div><div class="l">👧 إناث</div></div>
      <div class="stat green"><div class="n">${all.length}</div><div class="l">المجموع</div></div>
    </div>
    <div class="chips">${sexChip('all', 'الكل', all.length)}${sexChip('male', '♂ ذكور', males.length)}${sexChip('female', '♀ إناث', females.length)}</div>
    <div class="chips" style="margin-top:6px">${ageChip('all', 'كل الأعمار')}${ageChip('lt1', 'أقل من شهر')}${ageChip('1to3', '١-٣ أشهر')}${ageChip('3to6', '٣-٦ أشهر')}${ageChip('gt6', 'أكبر من ٦ أشهر')}</div>
    <div class="muted" style="margin:8px 0">العدد: ${list.length}</div>
    ${list.length ? list.map(card).join('') : noItem()}`;
  bindTypeChips(screenNewborns);
  view().querySelectorAll('[data-nsex]').forEach(c => c.addEventListener('click', () => { newbornSexFilter = c.dataset.nsex; screenNewborns(); }));
  view().querySelectorAll('[data-nage]').forEach(c => c.addEventListener('click', () => { newbornAgeFilter = c.dataset.nage; screenNewborns(); }));
  bindCards(view());
}
function filterBySex(arr, sex) { return sex === 'all' ? arr : arr.filter(a => a.sex === sex); }
// تعيين ذكر فحلاً (تحويل) مع تحديث معرّفه/اسمه
function makeSireModal(a) {
  openModal('تعيين فحلاً', `
    <div class="muted" style="margin-bottom:8px">تُعيَّن «${display(a)}» فحلاً للقطيع 🐏. يمكنك إعطاؤها اسماً/رقماً الآن.</div>
    ${fSelect('نوع المعرّف', 'ms_kind', IDKIND, a.idkind || 'number')}
    ${fInput('المعرّف / الوسم', 'ms_code', a.code)}
    ${fInput('الاسم (اختياري)', 'ms_name', a.name)}
    <button class="btn" id="ms_save">🐏 تعيين فحلاً</button>`, () => {
    document.getElementById('ms_save').addEventListener('click', async () => {
      const idkind = val('ms_kind'); let code = val('ms_code').trim();
      if (!['number', 'tag', 'chip', 'name'].includes(idkind)) code = '';
      const ok = await guard(async () => { await dbUpdate('animals', a.id, { purpose: 'sire', idkind, code, name: val('ms_name').trim() }); });
      if (ok) { closeModal(); toast('تم تعيينها فحلاً 🐏'); await loadAll(); screenAnimalDetail(String(a.id)); }
    });
  });
}
// إلغاء صفة الفحولة عن ذكر
async function unmakeSire(a) {
  if (!await confirm2('إلغاء صفة الفحل عن هذه البهيمة؟')) return;
  const ok = await guard(async () => { await dbUpdate('animals', a.id, { purpose: '' }); });
  if (ok) { toast('أُلغيت صفة الفحل'); await loadAll(); screenAnimalDetail(String(a.id)); }
}
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
      ${penField('bk_pen', '', animalFilter || 'sheep')}
      ${fSelect('المصدر', 'bk_source', SOURCE, 'born')}
      ${fInput('التاريخ (شراء/ميلاد)', 'bk_date', todayStr(), 'date')}
      ${fInput('اللون (اختياري)', 'bk_color', '')}
      ${fInput('سعر الرأس (اختياري)', 'bk_price', '', 'number', 'min="0" step="any" inputmode="decimal"')}</div>
     <div class="card"><h3>أضِف دفعة</h3>
      ${fSelect('الجنس', 'bk_sex', SEX, 'female')}
      ${fInput('العدد', 'bk_count', '', 'number', 'min="1" inputmode="numeric"')}
      <div class="chips"><span class="chip active" data-bm="none">⭕ بدون ترقيم</span><span class="chip" data-bm="num">🔢 بترقيم</span></div>
      <div id="bmNone" class="muted" style="font-size:.82rem">تُضاف بلا رقم — رقّمها لاحقاً متى شئت (الصغار/الذكور غالباً لا تُرقَّم).</div>
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
    bindPenField('bk_pen');
    { const bt = document.getElementById('bk_type'); if (bt) bt.addEventListener('change', () => rebuildPen('bk_pen', val('bk_type'))); }
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
      const pen = penValue('bk_pen', val('bk_type')), src = val('bk_source'), datev = val('bk_date') || null;
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
    form = `${fInput('نوع العلاج', 'bk_ttype', '')}${fInput('اسم العلاج', 'bk_med', '')}${fInput('مدة التحريم (أيام)', 'bk_days', '', 'number', 'min="0"')}${fInput('تاريخ العلاج', 'bk_date', todayStr(), 'date')}${fInput('موعد الجرعة القادمة (اختياري)', 'bk_tnext', '', 'date')}${fInput('الإجراء', 'bk_action', '')}${fTextarea('ملاحظات', 'bk_notes', '')}`;
  } else if (bulkOp === 'sell') {
    form = `${fInput('تاريخ البيع', 'bk_date', todayStr(), 'date')}${fInput('سعر البيع للرأس (اختياري)', 'bk_price', '', 'number', 'min="0" step="any" inputmode="decimal"')}`;
  }
  let cands = C.animals.filter(a => a.status === 'present');
  if (bulkOp === 'mate') cands = cands.filter(a => a.sex === 'female');
  cands.sort((a, b) => b.id - a.id);
  const listHtml = cands.length ? cands.map(a => `<label class="bulk-row"><input type="checkbox" data-sel="${a.id}" ${bulkSel.has(a.id) ? 'checked' : ''}><span>${display(a)} <span class="muted">${arOf(TYPES, a.type)}${a.pen ? ' • ' + esc(a.pen) : ''}</span></span></label>`).join('') : '<div class="muted">لا توجد بهائم مطابقة.</div>';
  body.innerHTML = `<div class="card"><h3>بيانات العملية</h3>${form}</div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">اختر البهائم</h3>${cands.length ? '<button class="btn sm outline" id="bk_all">تحديد/إلغاء الكل</button>' : ''}</div>
      ${cands.length ? `${fInput('🔍 بحث (رقم/حظيرة)', 'bk_search', '')}` : ''}
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
  // تحذير التحريم عند البيع الجماعي: إن كان بين المحدد بهائم تحت تحريم دواء
  if (bulkOp === 'sell') { const under = ids.filter(id => withdrawalActiveOn(id, d)); if (under.length && !await confirm2(`⚠️ ${under.length} من ${ids.length} بهيمة تحت تحريم دواء في هذا التاريخ (لا يُنصح ببيعها/ذبحها قبل انتهائه). متابعة البيع؟`, { danger: true })) return; }
  if (!await confirm2(`تطبيق العملية على ${ids.length} بهيمة؟`)) return;
  const notes = document.getElementById('bk_notes') ? val('bk_notes').trim() : '';
  const ok = await guard(async () => {
    for (const id of ids) {
      const a = animalById(id); if (!a) continue;
      if (bulkOp === 'vaccinate') await dbInsert('vaccinations', { animal_id: id, type_id: vt.id, date: d, withdrawal_end: addDays(d, vtWithdrawDays(vt)), next_due: val('bk_next') || null, notes });
      else if (bulkOp === 'mate') { await dbInsert('matings', { animal_id: id, date: d, sire_code: val('bk_sirecode').trim(), sire_name: val('bk_sirename').trim(), notes }); if (document.getElementById('bk_preg').checked) { const g = gestOf(a.type); await dbInsert('pregnancies', { animal_id: id, mating_date: d, gest: g, expected: addDays(d, g), status: 'monitoring', notes }); } }
      else if (bulkOp === 'treat') { const days = num('bk_days'); await dbInsert('treatments', { animal_id: id, treatment_type: val('bk_ttype').trim(), med_name: val('bk_med').trim(), withdrawal_days: days, date: d, withdrawal_end: addDays(d, days), next_due: val('bk_tnext') || null, action: val('bk_action').trim(), notes }); }
      else if (bulkOp === 'sell') { const price = val('bk_price') !== '' ? parseFloat(val('bk_price')) : null; await dbUpdate('animals', id, { status: 'sold', sale_date: d, sale_price: price, dead_date: null }); }
    }
  });
  if (ok) { toast(`تم تطبيق العملية على ${ids.length} بهيمة`); bulkSel.clear(); await loadAll(); screenBulk(); }
}

/* ===== قائمتا الهيدر: ⋮ الأدوات والعمليات · ☰ الإعدادات والإدارة ===== */
const menuOpen = { quick: new Set(['breeding']), settings: new Set(['herd']) };   // التصنيفات المفتوحة لكل قائمة
const menuSearch = { quick: '', settings: '' };   // نص البحث الحالي لكل قائمة (يُمسح عند مغادرة الشاشة)
const MENU_BG = { breeding: '#e8f5e9', health: '#e3f2fd', tools: '#fff8e1', herd: '#e8f5e9', security: '#ffebee', data: '#f3e5f5', app: '#eceff1' };
// عارض عام لقائمة أقسام قابلة للطيّ مع بحث نصّي فوري (يشترك بينه ⋮ و☰)
function renderMenuScreen(menuKey, cats, extraHtml) {
  extraHtml = extraHtml || '';
  view().innerHTML = extraHtml
    + `<div class="field" style="margin-bottom:10px"><input id="menuSearchInput" placeholder="🔍 ابحث في القائمة..." value="${esc(menuSearch[menuKey] || '')}"></div>`
    + `<div id="menuBody"></div>`;
  const goHandler = (h) => {
    if (h === '__checkupdate') return (typeof window.mrahiCheckUpdate === 'function') ? window.mrahiCheckUpdate() : toast('التحديث متاح في تطبيق الجوال');
    if (h === '__feedback') { const v = window.MRAH_VERSION || ''; const subj = encodeURIComponent('ملاحظات حلالي' + (v ? ' — نسخة ' + v : '')); const body = encodeURIComponent('اكتب ملاحظتك أو اقتراحك هنا:\n\n\n——————\nنسخة التطبيق: ' + v); location.href = 'mailto:alaoufi@gmail.com?subject=' + subj + '&body=' + body; return; }
    setHash(h);
  };
  const renderBody = () => {
    const body = document.getElementById('menuBody'); if (!body) return;
    const open = menuOpen[menuKey];
    const q = (menuSearch[menuKey] || '').trim().toLowerCase();
    if (q) {
      // نتيجة بحث مسطّحة عبر كل الأقسام (بلا حاجة لفتحها يدوياً)
      const matches = [];
      cats.forEach(c => c.items.forEach(([l, h]) => { if (String(l).toLowerCase().includes(q)) matches.push([l, h, c.title]); }));
      body.innerHTML = matches.length
        ? matches.map(([l, h, ct]) => `<div class="card click" data-go="${h}"><div class="li-title">${l}</div><div class="li-sub muted">${ct}</div></div>`).join('')
        : '<div class="muted" style="padding:12px 4px">لا توجد نتائج مطابقة.</div>';
    } else {
      const visible = cats.filter(c => c.items.length);
      body.innerHTML = visible.map(c => {
        const isOpen = open.has(c.key);
        const bg = MENU_BG[c.key] || 'var(--card)';
        return `<div class="acc-head card click" data-cat="${c.key}" style="display:flex;align-items:center;justify-content:space-between;background:${bg}">
            <span class="li-title" style="margin:0">${c.title}</span><span style="color:var(--muted);font-size:1.1rem">${isOpen ? '▾' : '▸'}</span></div>`
          + (isOpen ? `<div style="margin:0 8px 8px">${c.items.map(([l, h]) => `<div class="card click" data-go="${h}" style="margin:6px 0;background:${bg}"><div class="li-title">${l}</div></div>`).join('')}</div>` : '');
      }).join('');
    }
    body.querySelectorAll('[data-cat]').forEach(h => h.addEventListener('click', () => { const k = h.dataset.cat; open.has(k) ? open.delete(k) : open.add(k); renderBody(); }));
    body.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => goHandler(c.dataset.go)));
  };
  { const si = document.getElementById('menuSearchInput'); if (si) si.addEventListener('input', () => { menuSearch[menuKey] = si.value; renderBody(); }); }
  // عناصر extraHtml (مثل بطاقة التحديث) ثابتة ولا تُعاد رسمتها — تُربط مرّة واحدة فقط هنا لتفادي تكرار المستمعين
  view().querySelectorAll('[data-go]').forEach(c => { if (!c.closest('#menuBody')) c.addEventListener('click', () => goHandler(c.dataset.go)); });
  renderBody();
}
// ⋮ الأدوات والعمليات — كل ما يُستخدم يومياً (الحلال/التكاثر/الصحة/أدوات)
function screenQuickMenu() {
  const I = (cond, label, hash) => cond ? [label, hash] : null;
  const cats = [
    { key: 'breeding', title: '🐑 الحلال والتكاثر', items: [
      I(can('animals', 'view'), '🔍 تفقد الحلال وإحصائيات', '#/inspect'),
      I(can('breeding', 'view'), '🤰 الحمل والمتابعة', '#/pregnancies'),
      I(can('animals', 'add'), '📋 إضافة جماعية (دفعة)', '#/bulk/buy'),
      I(can('animals', 'add') || can('animals', 'edit') || can('vaccines', 'edit') || can('treatments', 'edit') || can('breeding', 'edit'), '⚙️ عمليات جماعية (تطعيم/علاج/بيع…)', '#/bulk'),
    ].filter(Boolean) },
    { key: 'health', title: '💉 الصحة (تطعيم وعلاج)', items: [
      I(can('vaccines', 'edit'), '💉 إعطاء تطعيم', '#/vaccinate/0'),
      I(can('vaccines', 'view'), '💉 أنواع التطعيمات', '#/vaccine-types'),
      I(can('vaccines', 'view'), '🗓️ برنامج التطعيم الموصى به', '#/vaccine-plan'),
      I(can('treatments', 'edit'), '💊 إعطاء علاج', '#/treat/0'),
      I(can('treatments', 'view'), '💊 أنواع العلاج', '#/treatment-types'),
      I(can('treatments', 'view'), '📦 مخزون الأدوية واللقاحات', '#/medstock'),
    ].filter(Boolean) },
    { key: 'tools', title: '🗂️ أدوات أخرى', items: [
      I(can('animals', 'view'), '📇 دليل التواصل (زبائن/بيطري…)', '#/contacts'),
      I(can('backup', 'view'), '💾 النسخ الاحتياطي', '#/backup'),
    ].filter(Boolean) },
  ];
  renderMenuScreen('quick', cats);
}
// ☰ الإعدادات والإدارة — كل ما يُضبط مرّة ونادراً ما يتغيّر
function screenSettingsMenu() {
  const I = (cond, label, hash) => cond ? [label, hash] : null;
  const cats = [
    { key: 'herd', title: '⚙️ إعدادات الحظيرة', items: [
      I(can('animals', 'edit'), '⚙️ أنواع الحلال، الحظائر، الترقيم، التنبيهات…', '#/herdsettings'),
    ].filter(Boolean) },
    { key: 'security', title: '🔐 الأمان', items: [
      I(true, '🔐 التحكّم والإدارة (قفل التعديل)', '#/control'),
    ].filter(Boolean) },
    { key: 'data', title: '🗂️ البيانات والمحتوى', items: [
      I(can('animals', 'view'), '💰 الميزانية', '#/finance'),
      I(can('animals', 'view') || can('breeding', 'view') || can('vaccines', 'view') || can('treatments', 'view'), '🔔 التنبيهات', '#/alerts'),
      I(isAdmin(), '🗑️ سلة المحذوفات', '#/trash'),
      I(isSys(), '💡 النصائح والمعلومات', '#/tips'),
    ].filter(Boolean) },
    { key: 'app', title: '📱 التطبيق والمساعدة', items: [
      I(true, '📘 دليل الاستخدام', '#/guide'),
      I(window.MRAH_APK, '🔄 تحقق من وجود تحديث', '__checkupdate'),
      I(true, '📧 ملاحظات ومقترحات', '__feedback'),
    ].filter(Boolean) },
  ];
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
    حلالي — تطبيق محلّي • بياناتك على جهازك${ver}${licLine}</div>`;
  renderMenuScreen('settings', cats, topUpdate);
  view().insertAdjacentHTML('beforeend', footer);
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
  // شعار التطبيق بالهيدر يعرض الأيقونة فقط؛ مدخل «☰ الإعدادات ← دليل الاستخدام» يفتح كتاب الدور
  const wanted = (arg && books.includes(arg)) ? arg : 'visitor';
  window.MrahiGuide.render(view(), wanted, {
    isAdmin: isAdmin(),
    accountType: (me && me.account_type) || 'owner',
    books: books,
  });
}

/* ===== النسخ الاحتياطي (تصدير) ===== */
function snapshot() {
  return {
    exportedAt: new Date().toISOString(),
    animals: C.animals, matings: C.matings, pregnancies: C.pregnancies, births: C.births,
    vaccineTypes: C.vaccineTypes, vaccinations: C.vaccinations, treatments: C.treatments,
  };
}
// حزمة التطبيق الحقيقية (Capacitor appId) — لعرض المسار الفعلي لملفات النسخ الاحتياطية على الجهاز فقط
const ANDROID_APP_ID = 'me.alaoufi.mrahi';
// نسخ احتياطية كملفات JSON فعلية على الجهاز (مجلد Documents الخاص بالتطبيق) — متاحة فقط داخل تطبيق أندرويد (Capacitor)، لا في متصفح عادي
const BACKUP_DIR = 'mrahi-backups';
function fsPlugin() { try { return (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) || null; } catch (e) { return null; } }
async function saveBackupFile(filename, jsonText) {
  const fs = fsPlugin(); if (!fs) return false;
  try { await fs.writeFile({ path: BACKUP_DIR + '/' + filename, directory: 'DOCUMENTS', data: jsonText, encoding: 'utf8', recursive: true }); return true; }
  catch (e) { return false; }
}
async function listBackupFiles() {
  const fs = fsPlugin(); if (!fs) return [];
  try {
    const res = await fs.readdir({ path: BACKUP_DIR, directory: 'DOCUMENTS' });
    const entries = (res && res.files) || [];
    const out = [];
    for (const e of entries) {
      const name = typeof e === 'string' ? e : e.name;
      if (!name || !name.toLowerCase().endsWith('.json')) continue;
      let mtime = (typeof e === 'object' && e.mtime) || null;
      if (!mtime) { try { const st = await fs.stat({ path: BACKUP_DIR + '/' + name, directory: 'DOCUMENTS' }); mtime = st.mtime; } catch (e2) { /* تجاهل */ } }
      out.push({ name, mtime });
    }
    out.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    return out;
  } catch (e) { return []; }
}
async function readBackupFile(name) {
  const fs = fsPlugin(); if (!fs) return null;
  try { const r = await fs.readFile({ path: BACKUP_DIR + '/' + name, directory: 'DOCUMENTS', encoding: 'utf8' }); return typeof r.data === 'string' ? r.data : null; }
  catch (e) { return null; }
}
async function deleteBackupFile(name) {
  const fs = fsPlugin(); if (!fs) return false;
  try { await fs.deleteFile({ path: BACKUP_DIR + '/' + name, directory: 'DOCUMENTS' }); return true; }
  catch (e) { return false; }
}
// اختيار مجلد دائم (SAF) لحفظ النسخ فيه — إضافة كابسيتور محلية (mrahi-save-folder)؛ يبقى الاختيار محفوظاً حتى يُغيَّر يدوياً
function sfPlugin() { try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SaveFolder) || null; } catch (e) { return null; } }
async function sfGetFolder() { const p = sfPlugin(); if (!p) return null; try { const r = await p.getFolder(); return (r && r.uri) ? r : null; } catch (e) { return null; } }
// طبقة موحَّدة فوق مصدرَي الحفظ: المجلد المخصّص إن اختاره المستخدم، وإلا مجلد Documents الافتراضي داخل التطبيق
async function saveBackupFileSmart(filename, jsonText) {
  const sf = await sfGetFolder();
  if (sf) { try { await sfPlugin().writeFile({ filename, data: jsonText }); return true; } catch (e) { return false; } }
  return await saveBackupFile(filename, jsonText);
}
async function listBackupFilesSmart() {
  const sf = await sfGetFolder();
  if (sf) {
    try {
      const r = await sfPlugin().listFiles();
      const arr = (r && r.files) || [];
      return arr.map(f => ({ name: f.name, mtime: f.mtime })).sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    } catch (e) { return []; }
  }
  return await listBackupFiles();
}
async function readBackupFileSmart(name) {
  const sf = await sfGetFolder();
  if (sf) { try { const r = await sfPlugin().readFile({ filename: name }); return (r && typeof r.data === 'string') ? r.data : null; } catch (e) { return null; } }
  return await readBackupFile(name);
}
async function deleteBackupFileSmart(name) {
  const sf = await sfGetFolder();
  if (sf) { try { await sfPlugin().deleteFile({ filename: name }); return true; } catch (e) { return false; } }
  return await deleteBackupFile(name);
}
function screenBackup() {
  if (!can('backup', 'view')) { view().innerHTML = noPerm(); return; }
  const counts = `${C.animals.length} بهيمة • ${C.births.length} ولادة • ${C.vaccinations.length} تطعيم • ${C.treatments.length} علاج`;
  const mine = C.backups.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const hasFs = !!fsPlugin();
  const hasSf = !!sfPlugin();
  view().innerHTML = `
    <div class="card"><h3>سجل نسخي الاحتياطية</h3>
      <div class="muted">${counts}</div>
      <button class="btn" id="bk_save">➕ حفظ نسخة الآن</button>
      <div class="muted" style="font-size:.82rem;margin-top:6px">📍 ${hasFs ? 'تُحفظ نسخة داخل قاعدة بيانات التطبيق، ونسخة أخرى كملف حقيقي على الجهاز (انظر أسفل) — كلاهما محلي فقط، لا يُرفع لأي خادم.' : 'تُحفظ داخل قاعدة بيانات التطبيق على هذا الجهاز فقط — لا تُرفع لأي خادم ولا يراها أحد غيرك.'} إن مسحت التطبيق أو غيّرت الجهاز تُفقد هذه النسخ، لذا استخدم «مشاركة» بالأسفل لإرسالها (واتساب أو أي تطبيق آخر) أو حفظها خارج الجهاز.</div>
    </div>
    ${hasFs ? `<div class="card"><h3>📁 الملفات المحفوظة على الجهاز</h3>
      ${hasSf ? `<div id="sfPathInfo" class="muted" style="font-size:.82rem;margin-bottom:6px">جارٍ التحميل…</div>
      <div class="btn-row" style="margin-bottom:10px">
        <button class="btn sm outline" id="sf_pick">📂 تغيير مكان الحفظ...</button>
        <button class="btn sm outline" id="sf_clear" style="display:none">↩️ استخدام المسار الافتراضي</button>
      </div>` : `<div class="muted" style="font-size:.82rem;margin-bottom:6px">ملف JSON مستقل لكل نسخة، بتاريخه، داخل مجلد التطبيق على الجهاز. المسار الفعلي: <code>Android/data/${ANDROID_APP_ID}/files/Documents/${BACKUP_DIR}</code> — يمكن الوصول له أيضاً بتوصيل الجهاز بالحاسوب (USB).</div>`}
      <div id="fsBackupList" class="muted">جارٍ التحميل…</div>
    </div>` : ''}
    <div class="card"><h3>نسخي المحفوظة (${mine.length})</h3>
      ${mine.length ? mine.map(b => `<div class="card" style="margin:6px 0">
          <div class="li-title">${esc(b.label || 'نسخة')}</div>
          <div class="li-sub">${fmtDateTime(b.created_at)} • ${b.animals_count || 0} بهيمة</div>
          <div class="btn-row" style="margin-top:6px">
            <button class="btn sm" data-restore="${b.id}">استعادة</button>
            <button class="btn sm outline" data-dl="${b.id}">📤 مشاركة / تنزيل</button>
            <button class="btn sm danger" data-bdel="${b.id}">حذف</button>
          </div></div>`).join('') : '<div class="muted">لا توجد نسخ بعد.</div>'}
    </div>
    <div class="card"><h3>تصدير خارجي</h3>
      <div class="muted">مشاركة نسخة عبر واتساب أو أي تطبيق آخر، أو تنزيلها على جهازك.</div>
      <button class="btn outline" id="bk_json">📤 مشاركة / تنزيل JSON</button>
      <button class="btn outline" id="bk_csv">📊 مشاركة / تصدير Excel (CSV)</button>
    </div>`;

  document.getElementById('bk_save').addEventListener('click', async () => {
    const label = prompt('اسم النسخة (اختياري):', 'نسخة ' + fmtDateTime(new Date().toISOString())) ?? '';
    const snap = snapshot();
    const ok = await guard(async () => {
      await sb.from('mrahi_backups').insert({ label: label.trim(), payload: snap, animals_count: C.animals.length });
    });
    if (ok) {
      if (hasFs) await saveBackupFileSmart('حلالي-نسخة-' + stamp() + '.json', JSON.stringify(snap, null, 2));
      toast('تم حفظ النسخة على هذا الجهاز'); await loadAll(); screenBackup();
    }
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
  if (hasFs) { refreshFsPathInfo(); refreshFsBackupList(); }
  if (hasSf) {
    document.getElementById('sf_pick').addEventListener('click', async () => {
      try {
        const r = await sfPlugin().pickFolder();
        if (r && r.uri) { toast('تم اختيار مجلد الحفظ: ' + (r.name || '')); await refreshFsPathInfo(); await refreshFsBackupList(); }
      } catch (e) { /* ألغى المستخدم الاختيار أو حدث خطأ — لا حاجة لرسالة */ }
    });
    document.getElementById('sf_clear').addEventListener('click', async () => {
      if (!await confirm2('العودة للمسار الافتراضي داخل التطبيق؟ (لن يُحذف أي ملف — فقط يتوقّف استخدام المجلد المخصّص)')) return;
      try { await sfPlugin().clearFolder(); } catch (e) {}
      toast('تم استخدام المسار الافتراضي'); await refreshFsPathInfo(); await refreshFsBackupList();
    });
  }
  document.getElementById('bk_json').addEventListener('click', exportJson);
  document.getElementById('bk_csv').addEventListener('click', exportCsv);
}
// يعرض مكان الحفظ الحالي (مخصّص أو الافتراضي) ويُظهر/يُخفي زر «استخدام المسار الافتراضي»
async function refreshFsPathInfo() {
  const box = document.getElementById('sfPathInfo'); if (!box) return;
  const sf = await sfGetFolder();
  const clearBtn = document.getElementById('sf_clear');
  if (sf) {
    box.innerHTML = '📂 مكان الحفظ الحالي: <b>' + esc(sf.name || 'مجلد مخصّص') + '</b>';
    if (clearBtn) clearBtn.style.display = '';
  } else {
    box.innerHTML = 'المسار الافتراضي: <code>Android/data/' + ANDROID_APP_ID + '/files/Documents/' + BACKUP_DIR + '</code> — اضغط «تغيير مكان الحفظ» لاختيار مجلد آخر (مثل مجلد Drive أو التنزيلات) تُحفظ فيه كل النسخ تلقائياً.';
    if (clearBtn) clearBtn.style.display = 'none';
  }
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ar', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
// جوهر الاستعادة (مشترك بين الاستعادة من نسخة داخلية أو من ملف على الجهاز): يستبدل بيانات المزرعة بالكامل من p
async function applyRestorePayload(p) {
  return await guard(async () => {
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
}
/* استعادة نسخة داخلية: تتطلب صلاحيات تعديل على الأقسام لإعادة الكتابة */
async function restoreBackup(id) {
  const bk = C.backups.find(x => x.id === id);
  if (!bk || !bk.payload) { toast('النسخة غير موجودة'); return; }
  if (!isAdmin()) { toast('الاستعادة للمدير فقط (تستبدل بيانات المزرعة)'); return; }
  if (isEditLocked()) { toast('🔒 الاستعادة مقفولة مؤقّتاً — افتحها من أيقونة ⋮ أعلى الشاشة'); return; }
  if (!await confirm2('استعادة هذه النسخة ستستبدل بيانات المزرعة الحالية بالكامل. متابعة؟')) return;
  const ok = await applyRestorePayload(bk.payload);
  if (ok) { toast('تمت الاستعادة'); await loadAll(); setHash('#/home'); render(); }
}
// عرض/تحديث قائمة الملفات المحفوظة على الجهاز (تحت شاشة النسخ الاحتياطي)
async function refreshFsBackupList() {
  const box = document.getElementById('fsBackupList'); if (!box) return;
  const files = await listBackupFilesSmart();
  box.innerHTML = files.length ? files.map(f => `<div class="card" style="margin:6px 0">
      <div class="li-title">${esc(f.name)}</div>
      <div class="li-sub">${f.mtime ? fmtDateTime(new Date(f.mtime).toISOString()) : '—'}</div>
      <div class="btn-row" style="margin-top:6px">
        <button class="btn sm" data-fsrestore="${esc(f.name)}">استعادة</button>
        <button class="btn sm outline" data-fsshare="${esc(f.name)}">📤 مشاركة</button>
        <button class="btn sm danger" data-fsdel="${esc(f.name)}">حذف</button>
      </div></div>`).join('') : '<div class="muted">لا توجد ملفات محفوظة بعد.</div>';
  box.querySelectorAll('[data-fsrestore]').forEach(b => b.addEventListener('click', () => restoreFromFsFile(b.dataset.fsrestore)));
  box.querySelectorAll('[data-fsshare]').forEach(b => b.addEventListener('click', async () => {
    const txt = await readBackupFileSmart(b.dataset.fsshare);
    if (txt) shareOrDownload(b.dataset.fsshare, txt, 'application/json'); else toast('تعذّرت قراءة الملف');
  }));
  box.querySelectorAll('[data-fsdel]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirm2('حذف هذا الملف نهائياً من الجهاز؟ لا يمكن التراجع عن هذا الإجراء.', { danger: true })) return;
    const ok = await deleteBackupFileSmart(b.dataset.fsdel);
    if (ok) { toast('تم حذف الملف'); refreshFsBackupList(); } else toast('تعذّر الحذف');
  }));
}
// استعادة من ملف محفوظ على الجهاز
async function restoreFromFsFile(name) {
  if (!isAdmin()) { toast('الاستعادة للمدير فقط (تستبدل بيانات المزرعة)'); return; }
  if (isEditLocked()) { toast('🔒 الاستعادة مقفولة مؤقّتاً — افتحها من أيقونة ⋮ أعلى الشاشة'); return; }
  const txt = await readBackupFileSmart(name);
  if (!txt) { toast('تعذّرت قراءة الملف'); return; }
  let p; try { p = JSON.parse(txt); } catch (e) { toast('ملف تالف أو غير صالح'); return; }
  if (!await confirm2('استعادة هذا الملف ستستبدل بيانات المزرعة الحالية بالكامل. متابعة؟', { danger: true })) return;
  const ok = await applyRestorePayload(p);
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
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'نسخة احتياطية — حلالي' }); return; } catch (e) {} }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('تم تنزيل الملف');
}
function exportJson() { const data = { exportedAt: new Date().toISOString(), animals: C.animals, matings: C.matings, pregnancies: C.pregnancies, births: C.births, vaccineTypes: C.vaccineTypes, vaccinations: C.vaccinations, treatments: C.treatments }; shareOrDownload('mrahi_backup_' + stamp() + '.json', JSON.stringify(data, null, 2), 'application/json'); }
function exportCsv() {
  const cell = s => { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ['النوع', 'الحظيرة', 'المعرف', 'نوع المعرف', 'الاسم', 'الجنس', 'المصدر', 'تاريخ الميلاد', 'اللون', 'الحالة', 'تاريخ البيع', 'سعر البيع', 'تاريخ النفوق', 'رقم الأم', 'اسم الأب', 'ملاحظات'];
  const rows = C.animals.map(a => [arOf(TYPES, a.type), a.pen, a.code, arOf(IDKIND, a.idkind), a.name, arOf(SEX, a.sex), arOf(SOURCE, a.source || 'purchased'), a.birth, a.color, arOf(STATUS, a.status), a.sale_date || '', a.sale_price != null ? a.sale_price : '', a.dead_date || '', a.mother_id ? (animalById(a.mother_id) || {}).code || '' : (a.mother_name || ''), a.father_name, a.notes].map(cell).join(','));
  shareOrDownload('mrahi_animals_' + stamp() + '.csv', '﻿' + head.join(',') + '\n' + rows.join('\n'), 'text/csv');
}

/* ===== تفقد الحلال وإحصائيات ===== */
let inspectTab = 'smart';
let inspType = '';   // نوع الحلال المعروض في الإحصائيات (كل نوع مستقلّ)
let entryLogType = '';   // نوع الحلال المعروض في سجل الدخول ('' = كل الأنواع معاً)
let lineageMode = 'flat';   // عرض الأنساب: قائمة (الأم ← مواليدها) أو شجرة متعدّدة الأجيال
let afSex = 'male', afSrc = 'born', afCmp = 'gt', afMonths = 3;   // كشف بالعمر (الجنس/المصدر/المقارنة/الأشهر)
const codeNumOf = (a) => { const m = String(a.code || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : null; };
const aMini = (a) => `<div class="card click" data-aid="${a.id}" style="margin:6px 0"><div class="li-title">${display(a)}</div><div class="li-sub">${arOf(TYPES, a.type)} • ${esc(sexTerm(a))}${a.pen ? ' • ' + esc(a.pen) : ''}${a.status !== 'present' ? ' • ' + arOf(STATUS, a.status) : ''}</div></div>`;
function screenInspect() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const tabs = [
    { k: 'smart', ar: '🧠 تحليل ذكي' }, { k: 'entrylog', ar: '📜 سجل الدخول' }, { k: 'stats', ar: '📊 إحصائيات' }, { k: 'index', ar: '🔢 فهرس' }, { k: 'dups', ar: '♻ تكرار الأرقام' },
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
  if (inspectTab === 'smart') {
    // تحليل ذكي: يفكّك رقم «في الحظيرة» بالرئيسية ويوضّح سبب اختلافه عن عدد قائمة «الحلال»
    const counted = present.filter(inHerdCount);
    const notCounted = present.filter(a => !inHerdCount(a));
    const reasonOf = (a) => {
      if (a.counted === false) return 'manual';
      if (a.sex === 'male') {
        const stillYoung = a.source === 'born' && a.birth && pubertyOf(a.type) && ageMonths(a.birth) < pubertyOf(a.type);
        if (a.purpose === 'sire' && !stillYoung) return 'sire';
        if (!countIncludeMales()) return 'male';
      }
      return 'young';
    };
    const reasons = { manual: 0, sire: 0, male: 0, young: 0 };
    notCounted.forEach(a => { reasons[reasonOf(a)]++; });
    const sold = A.filter(a => a.status === 'sold').length, dead = A.filter(a => a.status === 'dead').length;
    const given = A.filter(a => a.status === 'given').length, missing = A.filter(a => a.status === 'missing').length, slaughtered = A.filter(a => a.status === 'slaughtered').length;
    const byType = TYPES.map(t => {
      const pt = present.filter(a => a.type === t.k);
      if (!pt.length) return null;
      const ct = pt.filter(inHerdCount).length;
      return { t, total: pt.length, counted: ct };
    }).filter(Boolean);
    body.innerHTML = `
      <div class="muted" style="margin:4px 0 8px">يوضّح هذا التحليل مصدر كل رقم، ولماذا قد يختلف عدد «في الحظيرة» بالرئيسية عن «العدد» أعلى قائمة الحلال.</div>
      <div class="card"><h3>🟢 في الحظيرة (رقم الرئيسية)</h3>
        <div class="stats" style="grid-template-columns:1fr 1fr">
          <div class="stat green"><div class="n">${counted.length}</div><div class="l">محتسَبة الآن</div></div>
          <div class="stat"><div class="n">${notCounted.length}</div><div class="l">موجودة وغير محتسَبة</div></div>
        </div>
        ${row('إجمالي الموجود حالياً (كل الحالة present)', String(present.length))}</div>
      ${notCounted.length ? `<div class="card"><h3>❓ لماذا لا تُحتسب هذه الـ${notCounted.length}؟</h3>
        ${reasons.young ? row('👶 صغار لسّه تتبع أمّها (لم تبلغ عمر الاحتساب)', String(reasons.young)) : ''}
        ${reasons.male ? row('♂ ذكور مستبعدة (إعداد «احتساب الذكور» مطفأ)', String(reasons.male)) : ''}
        ${reasons.sire ? row('🐏 فحول مستبعدة (إعداد «احتساب الفحول» مطفأ)', String(reasons.sire)) : ''}
        ${reasons.manual ? row('✋ استُبعدت يدوياً من سجل البهيمة', String(reasons.manual)) : ''}
        <div class="muted" style="font-size:.8rem;margin-top:6px">تظهر هذه البهائم في قائمة «الحلال» ما لم تُخفِها من الإعدادات (احتساب الذكور/الفحول أو إظهار المواليد غير المحتسَبة).</div></div>` : ''}
      <div class="card"><h3>📋 لماذا يختلف «العدد» أعلى قائمة الحلال؟</h3>
        <div class="muted" style="font-size:.85rem">قائمة الحلال تعرض حسب المرشّحات المحدَّدة فيها فقط (نوع/حالة/مصدر/جنس) — قد تشمل مباعة أو نافقة أو غيرها معاً، وقد تُظهر الصغار غير المحتسَبة. لذا «العدد» هناك ليس بالضرورة مطابقاً لعدد «في الحظيرة» بالرئيسية، وهذا طبيعي وليس خطأً.</div></div>
      ${byType.length ? `<div class="card"><h3>حسب النوع</h3>${byType.map(x => row(esc(x.t.ar), `${x.counted} محتسَب من أصل ${x.total} موجود`)).join('')}</div>` : ''}
      <div class="card"><h3>خارج الحظيرة حالياً</h3>
        ${row('مباعة', String(sold))}${row('نافقة', String(dead))}${given ? row('🎁 اهداء', String(given)) : ''}${missing ? row('🔎 مفقودة', String(missing)) : ''}${slaughtered ? row('🔪 ذُبحت', String(slaughtered)) : ''}
        ${row('إجمالي كل السجلات (كل الحالات، كل الوقت)', String(A.length))}</div>`;
    return;
  }
  if (inspectTab === 'entrylog') {
    // سجل دخول الحلال: تسلسل دخول كل بهيمة (الأقدم أولاً) مع مصدرها (ولادة/شراء/اهداء) — الصورة الكاملة لأصل الحلال
    const typeChips = `<div class="chips"><span class="chip ${!entryLogType ? 'active' : ''}" data-etype="">الكل</span>${TYPES.map(t => `<span class="chip ${entryLogType === t.k ? 'active' : ''}" data-etype="${t.k}">${t.ar}</span>`).join('')}</div>`;
    const scoped = entryLogType ? A.filter(a => a.type === entryLogType) : A.slice();
    const arr = scoped.slice().sort((x, y) => (x.created_at || '').localeCompare(y.created_at || '') || x.id - y.id);
    const srcIcon = { born: '👶 ولادة', purchased: '🛒 شراء', gift: '🎁 اهداء' };
    body.innerHTML = typeChips
      + `<div class="muted" style="margin:4px 0 8px">تسلسل دخول ${arr.length} بهيمة للحلال — من الأقدم للأحدث دخولاً، مع مصدر كل واحدة، لتعرف أصل حلالك كاملاً.</div>`
      + (arr.length ? arr.map((a, i) => `<div class="card click" data-aid="${a.id}"><div class="li-title">${i + 1}. ${display(a)}</div><div class="li-sub">${srcIcon[a.source || 'purchased'] || '—'} • ${arOf(TYPES, a.type)} • ${esc(sexTerm(a))}${a.birth ? ' • ' + fmtDate(a.birth) : ''}${a.status !== 'present' ? ' • ' + arOf(STATUS, a.status) : ''}</div></div>`).join('') : noItem());
    body.querySelectorAll('[data-etype]').forEach(c => c.addEventListener('click', () => { entryLogType = c.dataset.etype; renderInspect(); }));
    bindCards(body);
    return;
  }
  if (inspectTab === 'stats') {
    const TK = inspType || (TYPES[0] && TYPES[0].k) || '';
    const typeChips = `<div class="chips">${TYPES.map(t => `<span class="chip ${TK === t.k ? 'active' : ''}" data-itype="${t.k}">${t.ar}</span>`).join('')}</div>`;
    const At = C.animals.filter(a => a.type === TK);          // النوع المحدّد فقط (كل نوع مستقلّ)
    const presentT = At.filter(a => a.status === 'present');
    const inHerdT = presentT.filter(inHerdCount).length;   // العدد المحتسَب (يستثني الصغار أصغر من عمر الاحتساب)
    const f = presentT.filter(a => a.sex === 'female').length, m = presentT.filter(a => a.sex === 'male').length;
    const sold = At.filter(a => a.status === 'sold').length, dead = At.filter(a => a.status === 'dead').length;
    const bornAll = presentT.filter(a => a.source === 'born');
    const boughtAll = presentT.filter(a => (a.source || 'purchased') === 'purchased');
    const bM = bornAll.filter(a => a.sex === 'male').length, bF = bornAll.filter(a => a.sex === 'female').length;
    const pM = boughtAll.filter(a => a.sex === 'male').length, pF = boughtAll.filter(a => a.sex === 'female').length;
    const sire = presentT.filter(a => a.sex === 'male' && a.purpose === 'sire').length;
    const forSale = presentT.filter(a => a.sex === 'male' && a.purpose === 'sale').length;
    const pens = {}; presentT.forEach(a => { const p = a.pen || '— بلا حظيرة'; pens[p] = (pens[p] || 0) + 1; });
    const penList = Object.entries(pens).sort((x, y) => y[1] - x[1]);
    // حظائر رئيسية مقسّمة لفروع (مثلاً حظيرة واحدة مقسّمة حسب الرعاية: ذكور/إناث صغار/حمل) — تُعرض كمربعات بإجمالي كل رئيسية مع فروعها
    const penDefsT = allPens().filter(p => !p.type || p.type === TK);
    const rootsWithKids = penDefsT.filter(p => !p.parent && penDefsT.some(c => c.parent === p.name));
    const penTotal = (nm) => (pens[nm] || 0) + penDefsT.filter(c => c.parent === nm).reduce((s, c) => s + (pens[c.name] || 0), 0);
    const hierBoxesHtml = rootsWithKids.length ? `<div class="card"><h3>🏠 حسب الحظيرة (رئيسية وفروعها)</h3>
        <div class="stats" style="grid-template-columns:repeat(${Math.min(rootsWithKids.length, 3)},1fr)">${rootsWithKids.map(r => `<div class="stat"><div class="n">${penTotal(r.name)}</div><div class="l">${esc(r.name)}</div></div>`).join('')}</div>
        ${rootsWithKids.map(r => `<div style="margin-top:10px">${row('🏠 ' + esc(r.name), penTotal(r.name) + ' (إجمالي)')}${penDefsT.filter(c => c.parent === r.name).sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(c => row('↳ ' + esc(c.name), String(pens[c.name] || 0))).join('')}</div>`).join('')}
      </div>` : '';
    const withBirth = presentT.filter(a => a.birth);
    const noBirth = presentT.length - withBirth.length;
    const young = withBirth.filter(a => ageMonths(a.birth) < 6).length;
    const sub = withBirth.filter(a => { const mo = ageMonths(a.birth); return mo >= 6 && mo < 12; }).length;
    const adult = withBirth.filter(a => ageMonths(a.birth) >= 12).length;
    const groups = {}; At.forEach(a => { if (a.mother_id && a.birth) { const k = a.mother_id + '|' + a.birth; groups[k] = (groups[k] || 0) + 1; } });
    const gv = Object.values(groups); const multiG = gv.filter(n => n >= 2).length;
    const twinRate = gv.length ? Math.round((multiG / gv.length) * 100) : 0;
    const dams = {}; At.forEach(a => { if (a.mother_id) dams[a.mother_id] = (dams[a.mother_id] || 0) + 1; });
    const damCount = Object.keys(dams).length;
    const avgOff = damCount ? (Object.values(dams).reduce((s, n) => s + n, 0) / damCount).toFixed(1) : '0';
    const underSet = new Set();
    [...C.treatments, ...C.vaccinations].forEach(r => { if (r.withdrawal_end && daysUntil(r.withdrawal_end) >= 0) underSet.add(r.animal_id); });
    const underNow = presentT.filter(a => underSet.has(a.id)).length;
    body.innerHTML = typeChips
      + `<div class="muted" style="margin:4px 0 8px">إحصائيات <b>${esc(arOf(TYPES, TK))}</b> — كل نوع مستقلّ</div>
      <div class="stats">
        <div class="stat green"><div class="n">${inHerdT}</div><div class="l">في الحظيرة</div></div>
        <div class="stat blue"><div class="n">${f}</div><div class="l">إناث</div></div>
        <div class="stat amber"><div class="n">${m}</div><div class="l">ذكور</div></div>
      </div>
      ${(sire || forSale) ? `<div class="card"><h3>♂ الذكور حسب الغرض</h3>${row('🐏 فحول للقطيع', sire)}${row('💰 معدّ للبيع', forSale)}</div>` : ''}
      <div class="card"><h3>👶 الإنتاج (مواليد) — في الحظيرة</h3>${row('ذكور', bM)}${row('إناث', bF)}${row('المجموع', bM + bF)}</div>
      <div class="card"><h3>🛒 المشترى — في الحظيرة</h3>${row('ذكور', pM)}${row('إناث', pF)}${row('المجموع', pM + pF)}</div>
      <div class="card"><h3>🎂 توزيع الأعمار (في الحظيرة)</h3>${row('صغار (أقل من ٦ أشهر)', young)}${row('من ٦ لـ ١٢ شهر', sub)}${row('بالغة (سنة فأكثر)', adult)}${noBirth ? row('بلا تاريخ ميلاد', noBirth) : ''}</div>
      <div class="card"><h3>📈 مؤشّرات الإنتاج</h3>${row('معدّل التوائم', twinRate + '%')}${row('متوسط المواليد لكل أم', avgOff)}${row('عدد الأمهات المنتِجة', damCount)}</div>
      <div class="card"><h3>⛔ تحت التحريم الآن</h3>${row('عدد البهائم', underNow)}</div>
      <div class="card"><h3>الحالة (${esc(arOf(TYPES, TK))})</h3>${row('في الحظيرة (محتسَب)', inHerdT)}${presentT.length !== inHerdT ? row('صغار تتبع أمّها (غير محتسَبة)', presentT.length - inHerdT) : ''}${row('مباعة', sold)}${row('نافقة', dead)}${row('الإجمالي', At.length)}</div>
      ${hierBoxesHtml}
      <div class="card"><h3>حسب الحظيرة</h3>${penList.length ? penList.map(([p, n]) => row(p, n)).join('') : noItem()}</div>`;
    body.querySelectorAll('[data-itype]').forEach(c => c.addEventListener('click', () => { inspType = c.dataset.itype; renderInspect(); }));
    return;
  }
  if (inspectTab === 'index') {
    const arr = present.slice().sort((a, b) => { const x = codeNumOf(a), y = codeNumOf(b); if (x == null && y == null) return a.id - b.id; if (x == null) return 1; if (y == null) return -1; return x - y; });
    body.innerHTML = `<div class="muted" style="margin:4px 0 8px">فهرس تسلسلي — ${arr.length} رأس في الحظيرة</div>`
      + (arr.length ? arr.map((a, i) => `<div class="card click" data-aid="${a.id}"><div class="li-title">${i + 1}. ${display(a)}</div><div class="li-sub">${arOf(TYPES, a.type)} • ${esc(sexTerm(a))}${a.pen ? ' • ' + esc(a.pen) : ''}</div></div>`).join('') : noItem());
    bindCards(body); return;
  }
  if (inspectTab === 'dups') {
    const map = {}; present.filter(a => a.code).forEach(a => { (map[a.code] = map[a.code] || []).push(a); });
    const dups = Object.entries(map).filter(([, arr]) => arr.length > 1).sort((x, y) => y[1].length - x[1].length);
    body.innerHTML = dups.length
      ? `<div class="muted" style="margin:4px 0 8px">أرقام يتشاركها أكثر من رأس في الحظيرة — راجِعها.</div>` + dups.map(([code, arr]) => `<div class="card"><div class="li-title">⚠️ الرقم «${esc(code)}» مكرّر (${arr.length})</div>${arr.map(aMini).join('')}</div>`).join('')
      : '<div class="center-empty">لا يوجد تكرار في الأرقام ✅</div>';
    bindCards(body); return;
  }
  if (inspectTab === 'offspring') {
    const cnt = {}; A.forEach(a => { if (a.mother_id) cnt[a.mother_id] = (cnt[a.mother_id] || 0) + 1; });
    const moms = Object.entries(cnt).map(([id, n]) => ({ a: animalById(parseInt(id, 10)), n })).filter(x => x.a).sort((x, y) => y.n - x.n);
    body.innerHTML = `<div class="muted" style="margin:4px 0 8px">الأمهات حسب عدد المواليد المسجّلة (${moms.length} أم منتِجة)</div>`
      + (moms.length ? moms.map(({ a, n }) => `<div class="card click" data-aid="${a.id}"><div class="li-title">${display(a)}</div><div class="li-sub">👶 ${n} مولود • ${arOf(TYPES, a.type)}${a.pen ? ' • ' + esc(a.pen) : ''}</div></div>`).join('') : noItem());
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
        + (arr.length ? arr.map(a => `<div class="card click" data-aid="${a.id}"><div class="li-title">${display(a)} <span class="muted" style="font-weight:400">🎂 ${ageText(a.birth)}</span></div><div class="li-sub">${arOf(TYPES, a.type)} • ${esc(sexTerm(a))}${a.pen ? ' • ' + esc(a.pen) : ''}</div></div>`).join('') : noItem());
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
    const label = (a) => esc(a.code || 'غير مرقّمة');
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

/* ===== المصروفات والميزانية ===== */
const EXP_CATS = [
  { k: 'salary', ar: '👷 رواتب العمال' }, { k: 'hay', ar: '🌾 أعلاف حشائش' }, { k: 'grain', ar: '🌽 أعلاف حبوب' },
  { k: 'treatment', ar: '💊 علاجات' }, { k: 'prevention', ar: '🛡️ وقاية' }, { k: 'lump', ar: '🧾 مصروفات مقطوعة' }, { k: 'other', ar: '➕ أخرى' },
];
const INC_CATS = [
  { k: 'sale_big', ar: '🐑 بيع كبار' }, { k: 'sale_male', ar: '♂ بيع ذكور' }, { k: 'milk', ar: '🥛 حليب/ألبان' }, { k: 'wool', ar: '🧶 صوف/جزّ' }, { k: 'other_in', ar: '➕ إيراد آخر' },
];
// أنواع مخصّصة يضيفها المستخدم من الإعدادات (تُخزَّن محلياً)
function loadFinCats() { try { return JSON.parse(localStorage.getItem('mrahi_fin_cats') || '[]'); } catch (e) { return []; } }
function saveFinCats(a) { try { localStorage.setItem('mrahi_fin_cats', JSON.stringify(a)); } catch (e) {} }
function catsFor(kind) { const def = kind === 'income' ? INC_CATS : EXP_CATS; const cu = loadFinCats().filter(c => c.kind === kind).map(c => ({ k: 'c_' + c.name, ar: c.name })); return def.concat(cu); }
function finCatAr(k) { const f = EXP_CATS.concat(INC_CATS).find(c => c.k === k); if (f) return f.ar; if (String(k).indexOf('c_') === 0) return String(k).slice(2); return k; }
const money = (n) => (Math.round((+n || 0) * 100) / 100).toLocaleString('ar-EG');
let financePeriod = 'month';
// تفكيك تاريخ نصّي «YYYY-MM-DD» مباشرةً (دون كائن Date) — مناعة تامّة من فروق التوقيت
function ymd(date) { const m = /(\d{4})-(\d{2})-(\d{2})/.exec(asciiDigits(date)); return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null; }
function curMonthIdx() { const p = ymd(todayStr()); return p ? p.y * 12 + (p.mo - 1) : 0; }
function monthIdxOf(d) { const p = ymd(d); return p ? p.y * 12 + (p.mo - 1) : null; }
function inPeriod(date, period) {
  const p = ymd(date);
  if (!p) return false;
  if (period === 'all') return true;
  const t = ymd(todayStr());
  if (period === 'year') return p.y === t.y;
  return p.y === t.y && p.mo === t.mo;   // month — مقارنة نصّية للسنة والشهر
}
// عدد الأشهر التي يُحتسب فيها مصروف شهري متكرّر بدأ من startDate ضمن الفترة
function recurMonths(startDate, period) {
  const s = monthIdxOf(startDate); if (s == null) return 0;
  const now = curMonthIdx();
  if (s > now) return 0;
  if (period === 'month') return 1;
  if (period === 'year') { const yStart = new Date(todayStr() + 'T00:00:00').getFullYear() * 12; return Math.max(0, now - Math.max(s, yStart) + 1); }
  return now - s + 1;   // all
}
function monthLabelShort(m) { const y = Math.floor(m / 12), mo = m % 12; return (mo + 1) + '/' + (y % 100); }
// إجماليات الإيراد/المصروف لكل شهر خلال آخر n أشهر
function monthlyTotals(n) {
  const now = curMonthIdx(); const arr = []; const idx = {};
  for (let i = n - 1; i >= 0; i--) { const m = now - i; idx[m] = arr.length; arr.push({ m, short: monthLabelShort(m), inc: 0, exp: 0 }); }
  C.animals.forEach(a => { if (a.status === 'sold' && a.sale_price != null && a.sale_date) { const mi = monthIdxOf(a.sale_date); if (idx[mi] != null) arr[idx[mi]].inc += +a.sale_price || 0; } });
  C.animals.forEach(a => { if (a.buy_price != null && a.buy_date) { const mi = monthIdxOf(a.buy_date); if (idx[mi] != null) arr[idx[mi]].exp += +a.buy_price || 0; } });
  (C.expenses || []).forEach(e => { const amt = +e.amount || 0; const s = monthIdxOf(e.date); if (s == null) return;
    if (e.recurring === 'monthly') { arr.forEach(o => { if (o.m >= s) { if (e.kind === 'income') o.inc += amt; else o.exp += amt; } }); }
    else if (idx[s] != null) { if (e.kind === 'income') arr[idx[s]].inc += amt; else arr[idx[s]].exp += amt; } });
  return arr;
}
function financeExportCSV() {
  const P = financePeriod;
  const cell = (s) => { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = [['النوع', 'البند', 'التاريخ', 'المبلغ', 'ملاحظة']];
  let rev = 0, exp = 0;
  C.animals.filter(a => a.status === 'sold' && a.sale_price != null && inPeriod(a.sale_date, P)).forEach(a => { rows.push(['إيراد', 'بيع حلال ' + display(a), a.sale_date, +a.sale_price || 0, '']); rev += +a.sale_price || 0; });
  (C.expenses || []).filter(e => e.kind === 'income').forEach(e => { const c = e.recurring === 'monthly' ? recurMonths(e.date, P) : (inPeriod(e.date, P) ? 1 : 0); if (!c) return; const t = (+e.amount || 0) * c; rows.push(['إيراد', finCatAr(e.category) + (c > 1 ? ` ×${c}` : ''), e.date, t, e.note || '']); rev += t; });
  (C.expenses || []).filter(e => e.kind !== 'income').forEach(e => { const c = e.recurring === 'monthly' ? recurMonths(e.date, P) : (inPeriod(e.date, P) ? 1 : 0); if (!c) return; const t = (+e.amount || 0) * c; rows.push(['مصروف', finCatAr(e.category) + (c > 1 ? ` ×${c}` : ''), e.date, t, e.note || '']); exp += t; });
  C.animals.filter(a => a.buy_price != null && inPeriod(a.buy_date, P)).forEach(a => { rows.push(['مصروف', 'مشتريات حلال ' + display(a), a.buy_date, +a.buy_price || 0, '']); exp += +a.buy_price || 0; });
  rows.push([]); rows.push(['—', 'إجمالي الإيرادات', '', rev, '']); rows.push(['—', 'إجمالي المصروفات', '', exp, '']); rows.push(['—', 'الصافي', '', rev - exp, '']);
  const csv = '﻿' + rows.map(r => r.map(cell).join(',')).join('\n');
  shareOrDownload('mrahi_finance_' + stamp() + '.csv', csv, 'text/csv');
}
function screenFinance() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const P = financePeriod;
  const periodAr = P === 'month' ? 'هذا الشهر' : P === 'year' ? 'هذه السنة' : 'الإجمالي';
  const entries = C.expenses || [];
  const counted = (e) => e.recurring === 'monthly' ? recurMonths(e.date, P) : (inPeriod(e.date, P) ? 1 : 0);
  // إيرادات تلقائية: بيع الحلال من السجل
  const sales = C.animals.filter(a => a.status === 'sold' && a.sale_price != null && inPeriod(a.sale_date, P));
  const revAuto = sales.reduce((s, a) => s + (+a.sale_price || 0), 0);
  // تكلفة تلقائية: شراء الحلال
  const buyCost = C.animals.filter(a => a.buy_price != null && inPeriod(a.buy_date, P)).reduce((s, a) => s + (+a.buy_price || 0), 0);
  // حركات مُدخلة (إيراد/مصروف)
  const incBy = {}, expBy = {};
  entries.forEach(e => { const c = counted(e); if (!c) return; const t = (+e.amount || 0) * c; if (e.kind === 'income') incBy[e.category] = (incBy[e.category] || 0) + t; else expBy[e.category] = (expBy[e.category] || 0) + t; });
  const revManual = Object.values(incBy).reduce((s, n) => s + n, 0);
  const expManual = Object.values(expBy).reduce((s, n) => s + n, 0);
  const revenue = revAuto + revManual, expTotal = expManual + buyCost, net = revenue - expTotal;
  const chips = `<div class="chips">${[['month', 'هذا الشهر'], ['year', 'هذه السنة'], ['all', 'الإجمالي']].map(([k, ar]) => `<span class="chip ${P === k ? 'active' : ''}" data-fp="${k}">${ar}</span>`).join('')}</div>`;
  const incRows = (revAuto > 0 ? row('🐑 بيع حلال (من السجل)', money(revAuto) + ' ريال') : '') + Object.keys(incBy).filter(k => incBy[k] > 0).map(k => row(finCatAr(k), money(incBy[k]) + ' ريال')).join('');
  const expRows = Object.keys(expBy).filter(k => expBy[k] > 0).map(k => row(finCatAr(k), money(expBy[k]) + ' ريال')).join('') + (buyCost > 0 ? row('🛒 مشتريات حلال (من السجل)', money(buyCost) + ' ريال') : '');
  const incomeEntries = entries.filter(e => e.kind === 'income' && counted(e));
  const expenseEntries = entries.filter(e => e.kind !== 'income' && counted(e));
  const entryCard = (title, arr, bg) => `<div class="card" style="background:${bg}"><h3>${title} (${arr.length})</h3>${arr.length ? arr.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => `<div class="card click" data-exp="${e.id}" style="margin:6px 0"><div class="li-title">${finCatAr(e.category)} — ${money(e.amount)} ريال${e.recurring === 'monthly' ? ' /شهرياً' : ''}</div><div class="li-sub">${fmtDate(e.date)}${e.note ? ' • ' + esc(e.note) : ''}</div></div>`).join('') : noItem()}</div>`;
  const mt = monthlyTotals(12); const cmax = Math.max(1, ...mt.map(d => Math.max(d.inc, d.exp)));
  const chartCard = `<div class="card"><h3>📈 الإيراد/المصروف الشهري</h3><div style="display:flex;gap:6px;overflow-x:auto;align-items:flex-end;padding-top:6px">${mt.map(d => `<div style="display:flex;flex-direction:column;align-items:center;min-width:40px"><div style="display:flex;gap:2px;align-items:flex-end;height:110px"><div style="width:11px;background:var(--green);height:${Math.round(d.inc / cmax * 110)}px;border-radius:3px 3px 0 0"></div><div style="width:11px;background:#e53935;height:${Math.round(d.exp / cmax * 110)}px;border-radius:3px 3px 0 0"></div></div><div class="muted" style="font-size:.64rem;margin-top:4px;white-space:nowrap">${d.short}</div></div>`).join('')}</div><div class="muted" style="font-size:.72rem;margin-top:6px"><span style="color:var(--green)">▮</span> إيراد &nbsp;&nbsp; <span style="color:#e53935">▮</span> مصروف</div></div>`;
  view().innerHTML = chips
    + `<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin:2px 0 8px;flex-wrap:wrap"><span class="muted" style="font-size:.82rem">الفترة: ${periodAr} • بالريال</span><span style="display:flex;gap:6px"><button class="btn sm outline" id="fin_export">🖨️ تصدير</button>${can('animals', 'edit') ? '<button class="btn sm outline" id="fin_cats">⚙️ أنواع البنود</button>' : ''}</span></div>
      <div class="stats" style="grid-template-columns:1fr 1fr 1fr">
        <div class="stat green"><div class="n" style="font-size:1.15rem">${money(revenue)}</div><div class="l">💵 إيرادات</div></div>
        <div class="stat red"><div class="n" style="font-size:1.15rem">${money(expTotal)}</div><div class="l">💸 مصروفات</div></div>
        <div class="stat ${net >= 0 ? 'green' : 'red'}"><div class="n" style="font-size:1.15rem">${money(net)}</div><div class="l">${net >= 0 ? '📈 صافي ربح' : '📉 صافي خسارة'}</div></div>
      </div>
      ${can('animals', 'edit') ? `<div style="display:flex;gap:8px;margin:8px 0"><button class="btn" id="add_inc" style="flex:1;background:var(--green)">➕ إيراد</button><button class="btn" id="add_exp" style="flex:1;background:#c62828">➖ مصروف</button></div>` : ''}
      <div class="card" style="background:#fff8e1"><h3>📊 الموازنة (${periodAr})</h3>
        <div class="li-title" style="color:var(--green)">➕ الإيرادات</div>${incRows || noItem()}${row('إجمالي الإيرادات', money(revenue) + ' ريال')}
        <div class="li-title" style="color:#c62828;margin-top:8px">➖ المصروفات</div>${expRows || noItem()}${row('إجمالي المصروفات', money(expTotal) + ' ريال')}
        <div style="border-top:2px solid #e0d8b8;margin-top:8px;padding-top:6px">${row(net >= 0 ? '✅ صافي الربح' : '⚠️ صافي الخسارة', money(net) + ' ريال')}</div></div>
      ${entryCard('💵 كشف الإيرادات المُدخلة', incomeEntries, '#e8f5e9')}
      <div class="card" style="background:#e3f2fd"><h3>🐑 كشف مبيعات الحلال (${sales.length})</h3>${sales.length ? sales.slice().sort((a, b) => (b.sale_date || '').localeCompare(a.sale_date || '')).map(a => `<div class="card click" data-aid="${a.id}" style="margin:6px 0"><div class="li-title">${display(a)} — ${money(a.sale_price)} ريال</div><div class="li-sub">${fmtDate(a.sale_date)} • ${esc(sexTerm(a))}</div></div>`).join('') : noItem()}</div>
      ${entryCard('💸 كشف المصروفات', expenseEntries, '#ffebee')}
      <div class="card" style="background:#f5f5f5"><h3>📈 الإيراد/المصروف الشهري</h3><div style="display:flex;gap:6px;overflow-x:auto;align-items:flex-end;padding-top:6px">${mt.map(d => `<div style="display:flex;flex-direction:column;align-items:center;min-width:40px"><div style="display:flex;gap:2px;align-items:flex-end;height:110px"><div style="width:11px;background:var(--green);height:${Math.round(d.inc / cmax * 110)}px;border-radius:3px 3px 0 0"></div><div style="width:11px;background:#e53935;height:${Math.round(d.exp / cmax * 110)}px;border-radius:3px 3px 0 0"></div></div><div class="muted" style="font-size:.64rem;margin-top:4px;white-space:nowrap">${d.short}</div></div>`).join('')}</div><div class="muted" style="font-size:.72rem;margin-top:6px"><span style="color:var(--green)">▮</span> إيراد &nbsp;&nbsp; <span style="color:#e53935">▮</span> مصروف</div></div>`;
  view().querySelectorAll('[data-fp]').forEach(c => c.addEventListener('click', () => { financePeriod = c.dataset.fp; screenFinance(); }));
  view().querySelectorAll('[data-exp]').forEach(c => c.addEventListener('click', () => financeEntryModal(entries.find(x => String(x.id) === c.dataset.exp))));
  bindCards(view());
  { const fc = document.getElementById('fin_cats'); if (fc) fc.addEventListener('click', () => setHash('#/fincats')); }
  { const fx = document.getElementById('fin_export'); if (fx) fx.addEventListener('click', financeExportCSV); }
  { const ai = document.getElementById('add_inc'); if (ai) ai.addEventListener('click', () => financeEntryModal(null, 'income')); }
  { const ae = document.getElementById('add_exp'); if (ae) ae.addEventListener('click', () => financeEntryModal(null, 'expense')); }
}
function financeEntryModal(e, preset) {
  let kind = e ? (e.kind === 'income' ? 'income' : 'expense') : (preset === 'income' ? 'income' : 'expense');
  openModal(e ? 'تعديل حركة' : 'إضافة حركة مالية', `
    <div class="chips"><span class="chip ${kind === 'expense' ? 'active' : ''}" data-kind="expense">💸 مصروف</span><span class="chip ${kind === 'income' ? 'active' : ''}" data-kind="income">💵 إيراد</span></div>
    <div id="ex_catwrap">${fSelect('البند', 'ex_cat', catsFor(kind), e ? e.category : catsFor(kind)[0].k)}</div>
    ${fInput('المبلغ (ريال)', 'ex_amt', e ? e.amount : '', 'number', 'min="0" step="any" inputmode="decimal"')}
    ${fInput('التاريخ', 'ex_date', e ? e.date : todayStr(), 'date')}
    ${fInput('ملاحظة (اختياري)', 'ex_note', e && e.note)}
    <div class="check"><input type="checkbox" id="ex_rec" ${e && e.recurring === 'monthly' ? 'checked' : ''}><label for="ex_rec" style="margin:0">متكرّر شهرياً (يُحتسب كل شهر من تاريخه)</label></div>
    <button class="btn" id="ex_save" style="margin-top:6px">حفظ</button>
    ${e ? '<button class="btn danger" id="ex_del" style="margin-top:6px">حذف</button>' : ''}`, () => {
    document.querySelectorAll('[data-kind]').forEach(c => c.addEventListener('click', () => { kind = c.dataset.kind; document.querySelectorAll('[data-kind]').forEach(x => x.classList.toggle('active', x.dataset.kind === kind)); document.getElementById('ex_catwrap').innerHTML = fSelect('البند', 'ex_cat', catsFor(kind), catsFor(kind)[0].k); }));
    document.getElementById('ex_save').addEventListener('click', async () => {
      const amt = val('ex_amt') !== '' ? parseFloat(asciiDigits(val('ex_amt'))) : 0;
      if (!(amt > 0)) { toast('أدخل مبلغاً صحيحاً'); return; }
      const obj = { kind: kind === 'income' ? 'income' : 'expense', category: val('ex_cat'), amount: amt, date: asciiDigits(val('ex_date')).slice(0, 10) || todayStr(), note: val('ex_note').trim(), recurring: document.getElementById('ex_rec').checked ? 'monthly' : '' };
      const ok = await guard(async () => { if (e) await dbUpdate('expenses', e.id, obj); else await dbInsert('expenses', obj); });
      if (ok) { closeModal(); toast('تم الحفظ'); await loadAll(); screenFinance(); }
    });
    const del = document.getElementById('ex_del');
    if (del) del.addEventListener('click', async () => { if (!await confirm2('حذف هذه الحركة؟')) return; const ok = await guard(async () => { await dbDelete('expenses', e.id); }); if (ok) { closeModal(); toast('حُذف'); await loadAll(); screenFinance(); } });
  });
}
// إعدادات أنواع المبيعات والمصروفات (مخصّصة)
function screenFinCats() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const custom = loadFinCats();
  const section = (kind, title, def) => `<div class="card"><h3>${title}</h3>
      ${def.map(c => `<div class="li-sub">• ${c.ar} <span class="muted">(افتراضي)</span></div>`).join('')}
      ${custom.filter(c => c.kind === kind).map(c => `<div class="li-sub" style="display:flex;justify-content:space-between;align-items:center;gap:8px">• ${esc(c.name)} <button class="btn sm danger" data-delcat="${kind}|${esc(c.name)}">حذف</button></div>`).join('')}
      <div style="display:flex;gap:6px;margin-top:8px"><input id="nc_${kind}" placeholder="نوع جديد (مثل: بيع كبار)" style="flex:1"><button class="btn sm" data-addcat="${kind}">➕ إضافة</button></div></div>`;
  view().innerHTML = `<div class="muted" style="margin-bottom:6px">أضِف أنواعاً مخصّصة للمبيعات والمصروفات. الأنواع الافتراضية ثابتة.</div>`
    + section('income', '💵 أنواع المبيعات/الإيرادات', INC_CATS)
    + section('expense', '💸 أنواع المصروفات', EXP_CATS);
  view().querySelectorAll('[data-addcat]').forEach(b => b.addEventListener('click', () => { const kind = b.dataset.addcat; const name = val('nc_' + kind).trim(); if (!name) { toast('اكتب الاسم'); return; } const arr = loadFinCats(); if (arr.some(c => c.kind === kind && c.name === name)) { toast('موجود مسبقاً'); return; } arr.push({ kind, name }); saveFinCats(arr); toast('أُضيف'); screenFinCats(); }));
  view().querySelectorAll('[data-delcat]').forEach(b => b.addEventListener('click', async () => { const i = b.dataset.delcat.indexOf('|'); const kind = b.dataset.delcat.slice(0, i), name = b.dataset.delcat.slice(i + 1); if (!await confirm2('حذف هذا النوع؟ (الحركات المسجّلة به لا تتأثّر)')) return; saveFinCats(loadFinCats().filter(c => !(c.kind === kind && c.name === name))); screenFinCats(); }));
}

// إعدادات قوائم شكل ولون الوسم (إضافة/حذف مخصّصة)
function screenTagLists() {
  if (!can('animals', 'edit')) { view().innerHTML = noPerm(); return; }
  const section = (key, title, def) => {
    const custom = loadList(key);
    return `<div class="card"><h3>${title}</h3>
      ${def.map(s => `<div class="li-sub">• ${esc(s)}${colorDot(s)} <span class="muted">(افتراضي)</span></div>`).join('')}
      ${custom.map(s => `<div class="li-sub" style="display:flex;justify-content:space-between;align-items:center;gap:8px">• ${esc(s)}${colorDot(s)} <button class="btn sm danger" data-dell="${key}|${esc(s)}">حذف</button></div>`).join('')}
      <div style="display:flex;gap:6px;margin-top:8px"><input id="nl_${key}" placeholder="إضافة جديد" style="flex:1"><button class="btn sm" data-addl="${key}">➕ إضافة</button></div></div>`;
  };
  view().innerHTML = `<div class="muted" style="margin-bottom:6px">أضِف ألواناً وأشكالاً للوسم تظهر كقائمة عند إضافة البهيمة. الافتراضية ثابتة.</div>`
    + section('mrahi_tag_colors', '🎨 ألوان الوسم', TAG_COLORS_DEF)
    + section('mrahi_tag_shapes', '🔷 أشكال الوسم', TAG_SHAPES_DEF);
  view().querySelectorAll('[data-addl]').forEach(b => b.addEventListener('click', () => { const key = b.dataset.addl; const name = val('nl_' + key).trim(); if (!name) { toast('اكتب الاسم'); return; } const arr = loadList(key); const def = key === 'mrahi_tag_colors' ? TAG_COLORS_DEF : TAG_SHAPES_DEF; if (def.includes(name) || arr.includes(name)) { toast('موجود مسبقاً'); return; } arr.push(name); saveList(key, arr); toast('أُضيف'); screenTagLists(); }));
  view().querySelectorAll('[data-dell]').forEach(b => b.addEventListener('click', async () => { const i = b.dataset.dell.indexOf('|'); const key = b.dataset.dell.slice(0, i), name = b.dataset.dell.slice(i + 1); if (!await confirm2('حذف هذا الخيار؟ (البهائم المسجّلة به لا تتأثّر)')) return; saveList(key, loadList(key).filter(s => s !== name)); screenTagLists(); }));
}

/* ===== التحكّم والإدارة — قفل التعديل/الحذف للأمان ===== */
const EDIT_LOCK_DURATIONS = [5, 15, 30, 60];   // دقائق — رقائق اختيار جاهزة
function screenControl() {
  const locked = isEditLocked();
  const remain = editUnlockRemainingMs();
  const remainTxt = remain > 0 ? Math.ceil(remain / 60000) + ' دقيقة' : '';
  view().innerHTML = `
    <div class="card" style="text-align:center">
      <div style="font-size:2.6rem">${locked ? '🔒' : '🔓'}</div>
      <h3 style="margin:4px 0">${locked ? 'التعديل والحذف مقفولان الآن' : 'التعديل والحذف مفتوحان مؤقّتاً'}</h3>
      <div class="muted">${locked
        ? 'الإضافة (بهيمة/تطعيم/علاج/تلقيح جديد…) تبقى مسموحة دائماً — القفل يشمل التعديل والحذف فقط.'
        : `يُقفل تلقائياً بعد ${remainTxt}، أو الآن بالزر أدناه.`}</div>
    </div>
    ${locked ? `
    <div class="card"><h3>🔓 فتح التعديل مؤقّتاً</h3>
      <div class="muted" style="font-size:.85rem;margin-bottom:8px">اختر مدة — يُقفل تلقائياً بعدها بلا تدخّل منك.</div>
      <div class="chips">${EDIT_UNLOCK_DURATIONS_CHIPS()}</div></div>`
      : `<button class="btn danger" id="lockNowBtn" style="margin-top:4px">🔒 قفل الآن</button>`}
    <div class="muted" style="font-size:.8rem;margin-top:14px;text-align:center">🔐 حماية إضافية على جهازك — لا علاقة لها بحسابات أو إنترنت.</div>`;
  view().querySelectorAll('[data-unlockmin]').forEach(c => c.addEventListener('click', () => {
    unlockEditFor(parseInt(c.dataset.unlockmin, 10));
    toast(`فُتح التعديل ${c.dataset.unlockmin} دقيقة`); screenControl();
  }));
  const lb = document.getElementById('lockNowBtn'); if (lb) lb.addEventListener('click', () => { lockEditNow(); toast('🔒 قُفل التعديل'); screenControl(); });
}
function EDIT_UNLOCK_DURATIONS_CHIPS() { return EDIT_LOCK_DURATIONS.map(m => `<span class="chip" data-unlockmin="${m}">${m} دقيقة</span>`).join(''); }

/* ===== إعدادات الحظيرة — نقطة دخول واحدة موحّدة، مبوّبة حسب الموضوع ===== */
function screenHerdSettings() {
  if (!can('animals', 'edit')) { view().innerHTML = noPerm(); return; }
  // مجموعات منطقية: عرض القوائم، متابعة الولادات، التصنيف والحظائر، التنبيهات
  const groups = [
    { h: '🔃 عرض القوائم', items: [] },   // بطاقة الترتيب تُدرَج يدوياً بعدها
    { h: '👶 متابعة الولادات', items: [
      ['📅', 'عمر احتساب المولود، والذكور/الفحول، وظهور غير المحتسَب', '#/countage'],
    ] },
    { h: '🐑 التصنيف والحظائر', items: [
      ['🐑', 'أنواع الحلال (إبل/بقر/ماعز/نجدي/حري…) — إضافة/تعديل/حذف', '#/types'],
      ['🏠', 'الحظائر (إضافة/تعديل)', '#/pens'],
      ['🏷️', 'شكل ولون الرقم', '#/taglists'],
      ['🔤', 'مصطلحات الذكر والأنثى', '#/terms'],
    ] },
    { h: '🔔 التنبيهات', items: [
      ['🔔', 'تنبيهات مخصّصة (للبيع/التطعيم…)', '#/reminders'],
    ] },
  ];
  const sec = (title, bodyHtml) => `<div class="muted" style="font-weight:700;margin:14px 2px 6px;font-size:.9rem">${title}</div>${bodyHtml}`;
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">كل إعدادات الحظيرة في مكان واحد، مرتّبة حسب الموضوع.</div>`
    + sec(groups[0].h, `<div class="card"><h3>🔃 ترتيب عرض القوائم</h3>
      ${fSelect('الترتيب حسب', 'hs_sort', SORT_MODES, animalSortMode())}
      ${fSelect('الاتجاه', 'hs_sortdir', SORT_DIRS, animalSortDir())}
      <div class="muted" style="font-size:.8rem">الاتجاه مستقل ويُطبَّق مع أي من الثلاثة (الترقيم/العمر/الإدخال) — على قوائم «الحلال» و«الفحول».</div></div>`)
    + groups.slice(1).map(g => sec(g.h, g.items.map(([ic, label, hash]) => `<div class="card click" data-h="${hash}"><div class="li-title">${ic} ${label}</div></div>`).join(''))).join('');
  { const ss = document.getElementById('hs_sort'); if (ss) ss.addEventListener('change', () => { try { localStorage.setItem('mrahi_sort', ss.value); } catch (e) {} toast('تم تغيير الترتيب'); }); }
  { const sd = document.getElementById('hs_sortdir'); if (sd) sd.addEventListener('change', () => { try { localStorage.setItem('mrahi_sort_dir', sd.value); } catch (e) {} toast('تم تغيير الاتجاه'); }); }
  view().querySelectorAll('[data-h]').forEach(c => c.addEventListener('click', () => setHash(c.dataset.h)));
}
// عمر احتساب المولود في الحظيرة (لكل نوع + لأي جنس تنطبق القاعدة)
function screenCountAge() {
  if (!can('animals', 'edit')) { view().innerHTML = noPerm(); return; }
  const SEXSCOPE = [{ k: 'both', ar: 'كلاهما' }, { k: 'female', ar: 'الإناث' }, { k: 'male', ar: 'الذكور' }];
  const MODES = [{ k: 'age', ar: 'يظهر مع المجموع عند عمر معيّن' }, { k: 'manual', ar: 'لا يظهر — يُضاف يدوياً' }];
  const chk = (v) => v ? 'checked' : '';
  view().innerHTML = `
    <div class="card"><h3>احتساب الذكور والفحول في الحظيرة</h3>
      <div class="muted" style="font-size:.82rem;margin-bottom:8px">اختر إن كانت الذكور والفحول تُحتسب ضمن عدد «في الحظيرة» مع بقية حلالك.</div>
      <label class="check"><input type="checkbox" id="cnt_males" ${chk(countIncludeMales())}> احتساب الذكور مع حلالي في الحظيرة</label>
      <label class="check"><input type="checkbox" id="cnt_sires" ${chk(countIncludeSires())}> احتساب الفحول مع حلالي في الحظيرة</label></div>
    <div class="card"><h3>ظهور المواليد غير المحتسَبة</h3>
      <div class="muted" style="font-size:.82rem;margin-bottom:8px">المولود الأصغر من عمر الاحتساب أدناه «يتبع أمّه» ولا يُحتسب في «في الحظيرة». هذا الخيار يتحكّم هل يظهر في قائمة «الحلال» أيضاً أثناء ذلك.</div>
      <label class="check"><input type="checkbox" id="cnt_showunc" ${chk(showUncountedInList())}> إظهاره في قائمة الحلال (بشارة «تتبع أمّها»)</label></div>
    <div class="muted" style="margin-bottom:8px">لكل نوع: متى يُحتسب المولود ضمن «في الحظيرة». <b>عند عمر</b>: يُضاف تلقائياً عند بلوغه العمر. <b>يدوي</b>: لا يُحتسب حتى تضيفه بنفسك من سجل البهيمة. أصغر من ذلك «يتبع أمّه». المشترى/الاهداء يُحتسب دائماً.</div>
    ${TYPES.map(t => { const r = countRuleFor(t.k); return `<div class="card"><h3>${esc(t.ar)}</h3>${fSelect('طريقة الاحتساب', 'cm_' + t.k, MODES, r.mode)}<div id="cab_${t.k}">${fInput('العمر (أشهر) — صفر = يُحتسب الجميع', 'ca_' + t.k, r.age || '', 'number', 'min="0" inputmode="numeric"')}</div>${fSelect('تنطبق على', 'cas_' + t.k, SEXSCOPE, r.sex)}</div>`; }).join('')}
    <button class="btn" id="ca_save">حفظ</button>`;
  // حقل العمر يظهر فقط في وضع «عند عمر»
  TYPES.forEach(t => { const sel = document.getElementById('cm_' + t.k); const box = document.getElementById('cab_' + t.k); if (!sel) return; const sync = () => { if (box) box.style.display = sel.value === 'age' ? '' : 'none'; }; sel.addEventListener('change', sync); sync(); });
  document.getElementById('ca_save').addEventListener('click', () => {
    const o = {};
    TYPES.forEach(t => { const mode = val('cm_' + t.k) === 'manual' ? 'manual' : 'age'; const n = parseInt(val('ca_' + t.k), 10) || 0; const sex = val('cas_' + t.k) || 'both'; if (mode === 'manual') o[t.k] = { mode: 'manual', age: 0, sex }; else if (n > 0) o[t.k] = { mode: 'age', age: n, sex }; });
    saveCountAge(o);
    try {
      localStorage.setItem('mrahi_count_males', document.getElementById('cnt_males').checked ? '1' : '0');
      localStorage.setItem('mrahi_count_sires', document.getElementById('cnt_sires').checked ? '1' : '0');
      localStorage.setItem('mrahi_show_uncounted', document.getElementById('cnt_showunc').checked ? '1' : '0');
    } catch (e) {}
    toast('تم الحفظ'); goBack();
  });
}
function screenPens() {
  if (!can('animals', 'edit')) { view().innerHTML = noPerm(); return; }
  const pens = allPens();   // [{name,type,parent}]
  const countFor = (nm) => (C.animals || []).filter(a => (a.pen || '') === nm).length;
  const totalFor = (nm) => countFor(nm) + penChildren(nm).reduce((s, c) => s + countFor(c.name), 0);
  const typeAr = (tk) => tk ? arOf(TYPES, tk) : 'أي نوع';
  const groups = {}; pens.forEach(p => { (groups[p.type || ''] = groups[p.type || ''] || []).push(p); });
  const typeSel = `<select id="np_type">${TYPES.map(t => `<option value="${t.k}">${t.ar}</option>`).join('')}<option value="">أي نوع</option></select>`;
  const penRow = (p, isChild, total) => `<div ${isChild ? '' : `class="click" data-penroot="${esc(p.name)}"`} style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #eee${isChild ? ';padding-inline-start:22px' : ''}">
      <span class="li-title" style="font-weight:600">${isChild ? '↳ ' : '🏠 '}${esc(p.name)} <span class="muted" style="font-weight:400;font-size:.8rem">(${total} بهيمة${total !== countFor(p.name) ? ' — إجمالي مع الفروع' : ''})</span></span>
      <span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${countFor(p.name) ? `<button class="btn sm outline" data-penmove="${esc(p.name)}">🔀 نقل</button>` : ''}<button class="btn sm outline" data-penedit="${esc(p.name)}">تعديل</button><button class="btn sm danger" data-pendel="${esc(p.name)}">حذف</button></span></div>`;
  let body = '';
  TYPES.map(t => t.k).concat(['']).forEach(tk => {
    const arr = groups[tk]; if (!arr || !arr.length) return;
    const roots = arr.filter(p => !p.parent).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const orphanBranches = arr.filter(p => p.parent && !arr.some(q => q.name === p.parent));   // أب من مجموعة أخرى أو محذوف — تُعرض مستقلة احتياطاً
    let html = '';
    roots.forEach(p => {
      html += penRow(p, false, totalFor(p.name));
      penChildren(p.name).filter(c => arr.includes(c)).sort((a, b) => a.name.localeCompare(b.name, 'ar')).forEach(c => { html += penRow(c, true, countFor(c.name)); });
    });
    orphanBranches.forEach(p => { html += penRow(p, false, countFor(p.name)); });
    body += `<div class="card"><h3>🐑 ${esc(typeAr(tk))}</h3>${html}</div>`;
  });
  view().innerHTML = `<div class="card" style="background:#fff8e1">
      <h3>🏠 كيف أفتح حظيرة فرعية؟</h3>
      <div class="muted" style="font-size:.85rem;line-height:1.9">
        <b>١)</b> أضِف حظيرة رئيسية من البطاقة تحت (اسم + نوع الحلال).<br>
        <b>٢)</b> بعد إضافتها ستظهر في القائمة أسفل — <b>اضغط عليها هي نفسها</b> (على السطر، ليس على زر تعديل/حذف).<br>
        <b>٣)</b> تفتح نافذة فروعها — اكتب اسم الفرع الجديد واضغط «➕ إضافة حظيرة فرعية».
      </div>
      <div class="muted" style="font-size:.8rem;margin-top:8px">🔀 زر «نقل» على أي حظيرة ينقل بهائمها المحدَّدة لحظيرة أخرى نقلاً كاملاً — لا تبقى أي علاقة بالحظيرة السابقة.</div>
    </div>
    <div class="card"><h3>➕ إضافة حظيرة رئيسية جديدة</h3>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${typeSel}<input id="np_name" placeholder="اسم الحظيرة" style="flex:1;min-width:140px"><button class="btn sm" id="np_add">إضافة</button></div></div>`
    + (body || '<div class="muted">لا توجد حظائر بعد — أضِف أول حظيرة.</div>');
  document.getElementById('np_add').addEventListener('click', async () => {
    const n = val('np_name').trim(); if (!n) { toast('اكتب اسم الحظيرة'); return; }
    if (allPens().some(p => p.name === n)) { await confirm2(`الاسم «${n}» مستخدَم مسبقاً لحظيرة أخرى — اختر اسماً مختلفاً.`, { title: 'الاسم موجود مسبقاً', okText: 'حسناً' }); return; }
    addPen(n, val('np_type'), '');
    toast('أُضيفت'); screenPens();
  });
  view().querySelectorAll('[data-penroot]').forEach(el => el.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;   // لا تفتح الحظيرة عند الضغط على تعديل/حذف/نقل
    penRootModal(el.dataset.penroot);
  }));
  view().querySelectorAll('[data-penedit]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); penRenameModal(b.dataset.penedit); }));
  view().querySelectorAll('[data-pendel]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); penDelete(b.dataset.pendel); }));
  view().querySelectorAll('[data-penmove]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); penMoveModal(b.dataset.penmove); }));
}
// فتح حظيرة رئيسية: عرض فروعها الحالية + إضافة فرع جديد منها مباشرة (الطريقة الأوضح لإضافة فرع)
function penRootModal(name) {
  const cur = allPens().find(p => p.name === name); if (!cur) return;
  const kids = penChildren(name);
  openModal('🏠 ' + name, `
    <div class="muted" style="margin-bottom:8px">${kids.length ? kids.length + ' فرع حالياً' : 'لا توجد فروع بعد'}</div>
    ${kids.length ? kids.map(k => `<div class="card" style="margin:6px 0"><div class="li-title">↳ ${esc(k.name)}</div></div>`).join('') : ''}
    <div class="field" style="margin-top:10px"><label>اسم الفرع الجديد</label><input id="pb_name" placeholder="مثلاً: ذكور / إناث صغار / حمل"></div>
    <button class="btn" id="pb_add">➕ إضافة حظيرة فرعية</button>`, () => {
    document.getElementById('pb_add').addEventListener('click', async () => {
      const n = val('pb_name').trim(); if (!n) { toast('اكتب اسم الفرع'); return; }
      if (allPens().some(p => p.name === n)) { await confirm2(`الاسم «${n}» مستخدَم مسبقاً لحظيرة أخرى (رئيسية أو فرعية) — اختر اسماً مختلفاً.`, { title: 'الاسم موجود مسبقاً', okText: 'حسناً' }); return; }
      addPen(n, cur.type, name);
      toast('أُضيف الفرع'); closeModal(); screenPens();
    });
  });
}
// نقل كل بهائم حظيرة (أو المحدَّد منها) إلى حظيرة أخرى — نقل كامل: pen يُستبدَل بالكامل، لا تبقى أي علاقة بالحظيرة السابقة
function penMoveModal(fromName) {
  const animals = (C.animals || []).filter(a => (a.pen || '') === fromName && a.status === 'present');
  if (!animals.length) { toast('لا توجد بهائم في هذه الحظيرة'); return; }
  const destOpts = allPens().filter(p => p.name !== fromName).map(p => `<option value="${esc(p.name)}">${p.parent ? '↳ ' : '🏠 '}${esc(p.name)}</option>`).join('');
  const rows = animals.map(a => `<label class="bulk-row"><input type="checkbox" data-mv="${a.id}" checked><span>${display(a)} <span class="muted">${arOf(TYPES, a.type)}</span></span></label>`).join('');
  openModal('نقل من 🏠 ' + fromName, `
    <div class="muted" style="margin-bottom:8px">${animals.length} بهيمة — اختر من تريد نقله والحظيرة الجديدة.</div>
    <div class="field"><label>إلى حظيرة</label><select id="pm_dest"><option value="">— اختر —</option>${destOpts}</select></div>
    <div style="margin-top:8px">${rows}</div>
    <button class="btn" id="pm_go" style="margin-top:10px">🔀 نقل المحدَّد</button>`, () => {
    document.getElementById('pm_go').addEventListener('click', async () => {
      const dest = val('pm_dest'); if (!dest) { toast('اختر الحظيرة الجديدة'); return; }
      const ids = [...document.querySelectorAll('[data-mv]:checked')].map(c => parseInt(c.dataset.mv, 10));
      if (!ids.length) { toast('اختر بهيمة واحدة على الأقل'); return; }
      if (!await confirm2(`نقل ${ids.length} بهيمة من «${fromName}» إلى «${dest}»؟ نقل كامل — لن تبقى في «${fromName}».`, { danger: true })) return;
      const ok = await guard(async () => { for (const id of ids) await dbUpdate('animals', id, { pen: dest }); });
      if (ok) { closeModal(); toast('تم النقل'); await loadAll(); screenPens(); }
    });
  });
}
function penRenameModal(oldName) {
  const cur = allPens().find(p => p.name === oldName) || { name: oldName, type: '', parent: '' };
  const parentOptsHtml = (typeKey) => '<option value="">— حظيرة رئيسية (بلا أب) —</option>' + rootPensForType(typeKey).filter(r => r.name !== oldName).map(r => `<option value="${esc(r.name)}" ${r.name === cur.parent ? 'selected' : ''}>فرع من: ${esc(r.name)}</option>`).join('');
  openModal('تعديل الحظيرة', `${fInput('الاسم', 'pe_name', oldName)}${fSelect('نوع الحلال', 'pe_type', TYPES, cur.type, 'أي نوع')}
    <div class="field"><label>تنتمي إلى (اختياري)</label><select id="pe_parent">${parentOptsHtml(cur.type)}</select></div>
    <div class="muted" style="font-size:.82rem;margin-bottom:6px">تغيير الاسم يُحدَّث في البهائم المسجّلة بهذه الحظيرة.</div><button class="btn" id="pe_save">حفظ</button>`, () => {
    { const pt = document.getElementById('pe_type'); if (pt) pt.addEventListener('change', () => { const ps = document.getElementById('pe_parent'); if (ps) ps.innerHTML = parentOptsHtml(val('pe_type')); }); }
    document.getElementById('pe_save').addEventListener('click', async () => {
      const nn = val('pe_name').trim(); if (!nn) { toast('اكتب الاسم'); return; }
      const nt = val('pe_type');
      const np = val('pe_parent');
      if (np === oldName) { toast('لا يمكن أن تكون الحظيرة فرعاً من نفسها'); return; }
      if (np && penChildren(oldName).length) { toast('لا يمكن جعلها فرعاً وهي نفسها تحوي فروعاً — أزل فروعها أولاً'); return; }
      const l = loadPens().map(p => {
        if (p.name === oldName) return { name: nn, type: nt, parent: np };
        if (p.parent === oldName) return Object.assign({}, p, { parent: nn });   // تحديث اسم الأب في فروعها إن غُيّر الاسم
        return p;
      });
      savePens(l.filter((p, i, a) => a.findIndex(q => q.name === p.name) === i));
      let affected = [];
      if (nn !== oldName) {
        affected = (C.animals || []).filter(a => (a.pen || '') === oldName);
        const ok = await guard(async () => { for (const a of affected) await dbUpdate('animals', a.id, { pen: nn }); });
        if (!ok) { toast('تعذّر الحفظ'); return; }
        await loadAll();
      }
      closeModal(); toast(`تم الحفظ${affected.length ? ` (${affected.length} بهيمة)` : ''}`); screenPens();
    });
  });
}
async function penDelete(name) {
  const used = (C.animals || []).filter(a => (a.pen || '') === name).length;
  if (used) { await confirm2(`لا يمكن حذف «${name}» — عليها ${used} بهيمة. انقل البهائم لحظيرة أخرى أو أخرِجها أولاً.`, { title: 'تعذّر الحذف', okText: 'حسناً' }); return; }
  const kids = penChildren(name);
  if (kids.length) { await confirm2(`لا يمكن حذف «${name}» — لديها ${kids.length} فرع (${kids.map(k => k.name).join('، ')}). احذف الفروع أولاً أو انقلها لحظيرة رئيسية أخرى.`, { title: 'تعذّر الحذف', okText: 'حسناً' }); return; }
  if (!await confirm2(`حذف «${name}» من القائمة؟`)) return;
  savePens(loadPens().filter(p => p.name !== name));
  toast('حُذفت'); screenPens();
}

/* ===== تنبيهات مخصّصة (تذكيرات حسب شرط) ===== */
function condText(r) {
  const parts = [];
  if (r.months) parts.push('عند بلوغ ' + r.months + ' شهر');
  if (r.date) parts.push('من تاريخ ' + fmtDate(r.date));
  return parts.join(' + ') || 'دائماً';
}
function scopeText(r) {
  if (r.animals && r.animals.length) return r.animals.length + ' بهيمة محدّدة';
  return r.type ? arOf(TYPES, r.type) : 'كل الأنواع';
}
function screenReminders() {
  if (!can('animals', 'view')) { view().innerHTML = noPerm(); return; }
  const rs = loadReminders();
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">أنشئ تنبيهات مخصّصة: حدّد الرسالة (للبيع/للتطعيم/الفطام…)، والنطاق (نوع كامل أو بهائم تختارها بأرقامها)، والشرط (عند بلوغ عمر معيّن أو من تاريخ). تظهر البهائم المعنيّة في «🔔 التنبيهات».</div>`
    + (rs.length ? rs.map(r => {
      const n = reminderMatches(r).length;
      return `<div class="card"><div class="li-title">🔔 ${esc(r.title || 'تنبيه')} ${r.on === false ? '<span class="muted" style="font-weight:400">(موقوف)</span>' : ''}</div>
        <div class="li-sub">النطاق: ${esc(scopeText(r))}</div>
        <div class="li-sub">الشرط: ${esc(condText(r))}</div>
        <div class="li-sub" style="color:${n ? '#c62828' : 'var(--muted)'}">مطابق الآن: ${n} بهيمة</div>
        ${can('animals', 'edit') ? `<div class="btn-row" style="margin-top:6px"><button class="btn sm outline" data-redit="${r.id}">تعديل</button><button class="btn sm outline" data-rtog="${r.id}">${r.on === false ? 'تفعيل' : 'إيقاف'}</button><button class="btn sm danger" data-rdel="${r.id}">حذف</button></div>` : ''}
      </div>`;
    }).join('') : '<div class="center-empty">لا توجد تنبيهات مخصّصة بعد.</div>');
  view().querySelectorAll('[data-redit]').forEach(b => b.addEventListener('click', () => reminderModal(loadReminders().find(x => String(x.id) === b.dataset.redit))));
  view().querySelectorAll('[data-rtog]').forEach(b => b.addEventListener('click', () => { const l = loadReminders(); const r = l.find(x => String(x.id) === b.dataset.rtog); if (r) { r.on = r.on === false; saveReminders(l); screenReminders(); } }));
  view().querySelectorAll('[data-rdel]').forEach(b => b.addEventListener('click', async () => { if (!await confirm2('حذف هذا التنبيه؟')) return; saveReminders(loadReminders().filter(x => String(x.id) !== b.dataset.rdel)); toast('حُذف'); screenReminders(); }));
  if (can('animals', 'edit')) addFab('+ تنبيه', () => reminderModal(null));
}
function remAnimalRows(typeKey, selected) {
  const sel = selected || [];
  const list = C.animals.filter(a => a.status === 'present' && (!typeKey || a.type === typeKey)).sort((a, b) => (b.birth || '').localeCompare(a.birth || ''));
  return list.length ? list.map(a => {
    const mom = a.mother_id ? animalById(a.mother_id) : null;
    const extra = [esc(sexTerm(a)), a.birth ? 'مواليد ' + fmtDate(a.birth) : '', mom ? '🤱 أم: ' + display(mom) : '', a.pen ? '🏠 ' + esc(a.pen) : ''].filter(Boolean).join(' • ');
    return `<label class="bulk-row"><input type="checkbox" data-rid="${a.id}" ${sel.includes(a.id) ? 'checked' : ''}><span>${display(a)} <span class="muted" style="font-size:.85rem">${extra}</span></span></label>`;
  }).join('') : '<div class="muted" style="padding:6px">لا بهائم مطابقة.</div>';
}
function reminderModal(r) {
  const isEdit = !!r; r = r || {};
  openModal(isEdit ? 'تعديل تنبيه' : 'تنبيه جديد', `
    ${fInput('الرسالة (مثال: للبيع، للتطعيم، الفطام)', 'rem_title', r.title || '')}
    ${fSelect('النوع', 'rem_type', TYPES, r.type || '', '— كل الأنواع —')}
    ${fInput('عند بلوغ العمر (أشهر) — اختياري', 'rem_months', r.months || '', 'number', 'min="0" inputmode="numeric"')}
    ${fInput('أو من تاريخ (اختياري)', 'rem_date', r.date || '', 'date')}
    <div class="check" style="margin:4px 0"><input type="checkbox" id="rem_specific" ${(r.animals && r.animals.length) ? 'checked' : ''}><label for="rem_specific" style="margin:0">تحديد بهائم بعينها (بدل كل النوع)</label></div>
    <div id="rem_box" style="display:${(r.animals && r.animals.length) ? '' : 'none'}"><div class="muted" style="font-size:.82rem;margin-bottom:4px">اختر البهائم (المواليد غير المرقّمة تُعرَّف بأمّها):</div><input id="rem_search" placeholder="🔍 بحث (رقم/أم/حظيرة)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font:inherit;margin-bottom:6px"><div id="rem_list" style="max-height:240px;overflow:auto">${remAnimalRows(r.type || '', r.animals || [])}</div></div>
    <button class="btn" id="rem_save" style="margin-top:8px">💾 حفظ التنبيه</button>`, () => {
    const box = document.getElementById('rem_box');
    const rebuild = () => { document.getElementById('rem_list').innerHTML = remAnimalRows(val('rem_type'), collectRem()); };
    const collectRem = () => [...document.querySelectorAll('#rem_list [data-rid]:checked')].map(c => parseInt(c.dataset.rid, 10));
    document.getElementById('rem_specific').addEventListener('change', (e) => { box.style.display = e.target.checked ? '' : 'none'; });
    document.getElementById('rem_type').addEventListener('change', rebuild);
    { const se = document.getElementById('rem_search'); if (se) se.addEventListener('input', () => { const t = se.value.trim().toLowerCase(); document.querySelectorAll('#rem_list .bulk-row').forEach(rw => { rw.style.display = (!t || rw.textContent.toLowerCase().includes(t)) ? '' : 'none'; }); }); }
    document.getElementById('rem_save').addEventListener('click', () => {
      const title = val('rem_title').trim(); if (!title) { toast('اكتب الرسالة'); return; }
      const months = parseInt(asciiDigits(val('rem_months')), 10) || 0;
      const date = asciiDigits(val('rem_date')).slice(0, 10) || '';
      const specific = document.getElementById('rem_specific').checked;
      const animals = specific ? collectRem() : [];
      if (!months && !date && !specific) { toast('حدّد شرطاً (عمر/تاريخ) أو بهائم بعينها'); return; }
      const list = loadReminders();
      const obj = { id: r.id || (Date.now() + Math.floor(Math.random() * 1000)), title, type: val('rem_type'), months, date, animals, on: r.on !== false };
      if (isEdit) { const i = list.findIndex(x => x.id === r.id); if (i >= 0) list[i] = obj; else list.push(obj); } else list.push(obj);
      saveReminders(list); closeModal(); toast('تم الحفظ'); screenReminders();
    });
  });
}

/* ===== مصطلحات الذكر/الأنثى حسب النوع والعمر ===== */
function screenTerms() {
  if (!can('animals', 'edit')) { view().innerHTML = noPerm(); return; }
  const T = loadTerms();
  view().innerHTML = `<div class="muted" style="margin-bottom:8px">حدّد مصطلح الذكر والأنثى لكل نوع حسب العمر (مثل ماعز: تيس/عنز، وأقل من الحدّ: جدي/جفرة). اترك الحقل فارغاً لاستخدام «ذكر/أنثى». والعمر غير المعروف يُعامَل «أكثر من الحدّ» (بالغ) في جميع الأنواع.</div>`
    + TYPES.map((t, i) => { const c = T[t.k] || {}; return `<div class="card"><h3>🐑 ${esc(t.ar)}</h3>
        ${fInput('الحدّ العمري (بالأشهر)', 'tm_age_' + i, c.age || '', 'number', 'min="0" inputmode="numeric"')}
        <div class="muted" style="margin:6px 0 2px">أقل من الحدّ (صغار):</div>
        ${fInput('الذكر', 'tm_ym_' + i, c.ym || '')}
        ${fInput('الأنثى', 'tm_yf_' + i, c.yf || '')}
        <div class="muted" style="margin:6px 0 2px">أكثر من الحدّ (بالغ / عمر غير معروف):</div>
        ${fInput('الذكر', 'tm_om_' + i, c.om || '')}
        ${fInput('الأنثى', 'tm_of_' + i, c.of || '')}
      </div>`; }).join('')
    + `<button class="btn" id="tm_save">💾 حفظ المصطلحات</button>`;
  document.getElementById('tm_save').addEventListener('click', () => {
    const o = {};
    TYPES.forEach((t, i) => {
      const age = asciiDigits(val('tm_age_' + i)).replace(/\D/g, ''), ym = val('tm_ym_' + i).trim(), yf = val('tm_yf_' + i).trim(), om = val('tm_om_' + i).trim(), of = val('tm_of_' + i).trim();
      if (age || ym || yf || om || of) o[t.k] = { age: age, ym: ym, yf: yf, om: om, of: of };
    });
    saveTerms(o); toast('تم حفظ المصطلحات'); goBack();
  });
}

/* ===== أنواع الحلال (للمدير) ===== */
function screenTypes() {
  if (!can('animals', 'edit')) { view().innerHTML = noPerm(); return; }
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
    const cnt = (C.animals || []).filter(a => a.type === t.key).length;
    if (cnt) { await confirm2(`لا يمكن حذف «${t.ar}» — عليه ${cnt} بهيمة. غيّر نوعها أو أخرِجها أولاً.`, { title: 'تعذّر الحذف', okText: 'حسناً' }); return; }
    if (!await confirm2('حذف هذا النوع؟')) return;
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
  const whoOf = (t) => t.actor_name || '—';
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
    if (isEditLocked()) { toast('🔒 الحذف مقفول مؤقّتاً — افتحه من أيقونة ⋮ أعلى الشاشة'); return; }
    if (!await confirm2('حذف نهائي لا يمكن التراجع عنه إطلاقاً. متأكّد؟')) return;
    const ok = await guard(async () => { const { error } = await sb.from('mrahi_trash').delete().eq('id', parseInt(b.dataset.perm, 10)); if (error) throw error; });
    if (ok) { toast('تم الحذف النهائي'); screenTrash(); }
  }));
}
async function restoreTrash(t) {
  if (!t) return;
  if (isEditLocked()) { toast('🔒 الاستعادة مقفولة مؤقّتاً — افتحها من أيقونة ⋮ أعلى الشاشة'); return; }
  const data = Object.assign({}, t.data); delete data.id; delete data.created_at;
  const ok = await guard(async () => {
    if (t.action === 'edit') { const { error } = await sb.from(TABLES[t.tbl]).update(data).eq('id', t.rec_id); if (error) throw error; }
    else { const { error } = await sb.from(TABLES[t.tbl]).insert(data); if (error) throw error; }
    const { error: de } = await sb.from('mrahi_trash').delete().eq('id', t.id); if (de) throw de;
  });
  if (ok) { toast('تمت الاستعادة'); await loadAll(); screenTrash(); }
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

// عرض أيقونة التطبيق بحجمها الطبيعي (عند الضغط على الشعار في الهيدر)
function showAppIcon() {
  const root = document.getElementById('modalRoot');
  const v = window.MRAH_VERSION ? '?v=' + encodeURIComponent(window.MRAH_VERSION) : '';
  root.innerHTML = `<div class="modal-bg appicon-view"><img src="icon-512.png${v}" alt="حلالي"><div class="appicon-cap">حلالي</div></div>`;
  root.querySelector('.appicon-view').addEventListener('click', closeModal);
}

const noPerm = () => '<div class="center-empty">ليست لديك صلاحية الوصول لهذا القسم.<br>راجع مدير النظام.</div>';

/* ===== شاشة بانتظار التفعيل ===== */
/* ===== المصادقة ===== */
function buildNav() {
  const tabs = [['#/home', '🏠', 'الرئيسية']];
  if (can('animals', 'view')) tabs.push(['#/animals', '🐑', 'الحلال']);
  if (can('animals', 'view')) tabs.push(['#/females', '♀️', 'الإناث']);
  if (can('animals', 'view')) tabs.push(['#/sires', '🐏', 'الفحول']);
  if (can('animals', 'view')) tabs.push(['#/newborns', '👶', 'المواليد']);
  // الميزانية والتنبيهات انتقلتا إلى ☰ الإعدادات والإدارة ← 🗂️ البيانات والمحتوى
  const nav = document.getElementById('bottomnav');
  nav.style.gridTemplateColumns = `repeat(${tabs.length},1fr)`;
  nav.innerHTML = tabs.map(([r, i, l]) => `<button class="nav-item" data-route="${r}"><span class="nav-ic">${i}</span>${l}</button>`).join('');
  nav.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => setHash(b.dataset.route)));
  refreshSettingsBadge();   // شارة تحديث متاح تنتقل لأيقونة ☰ بعد إزالة تبويب «المزيد»
}
// نقطة حمراء على أيقونة ☰ عند توفّر تحديث جديد (بديل شارة تبويب «المزيد» السابقة)
function refreshSettingsBadge() {
  const b = document.getElementById('settingsBtn'); if (!b) return;
  b.innerHTML = '☰' + (window.MRAH_APK && window.mrahiUpdateInfo ? '<span class="nav-badge"></span>' : '');
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

// الوضع المحلي: قاعدة بيانات محلية، مستخدم واحد، بلا تسجيل دخول
async function startLocalMode() {
  window.MRAH_LOCAL = true;
  document.getElementById('auth').classList.add('hidden');
  sb = window.createMrahLocalClient();
  document.getElementById('signoutBtn').classList.add('hidden');
  me = { user_id: 'local', full_name: '', role: 'admin', is_active: true, is_sysadmin: true, perms: {}, account_type: 'owner' };
  document.getElementById('app').classList.remove('hidden');
  showLoading(true);
  try { await loadAll(); } catch (e) { toast('خطأ تحميل: ' + e.message); }
  buildNav();
  showLoading(false);
  if (!location.hash) location.hash = '#/home';
  render();
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
    <div class="logo">🔐</div><h2>تفعيل حلالي</h2>
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
  document.getElementById('guideBtn').addEventListener('click', showAppIcon);   // شعار التطبيق ← عرض الأيقونة بحجمها الطبيعي
  document.getElementById('quickBtn').addEventListener('click', () => setHash('#/quick'));       // ⋮ الأدوات والعمليات
  document.getElementById('settingsBtn').addEventListener('click', () => setHash('#/settings'));  // ☰ الإعدادات والإدارة
  window.addEventListener('hashchange', () => { if (me && me.is_active) render(); });
  // إشارة توفّر تحديث (يطلقها updater.js): نقطة حمراء على أيقونة ☰ وإبراز البطاقة
  const onUpdSignal = () => { if (!me || !me.is_active) return; buildNav(); if (parseHash().name === 'settings') render(); };
  window.addEventListener('mrahi-update-available', onUpdSignal);
  window.addEventListener('mrahi-update-applied', onUpdSignal);
  // تحرير موارد الوسائط (كاميرا/ميكروفون) عند الخلفية أو الخروج — تنظيف عميق للذاكرة
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseMedia(); });
  window.addEventListener('pagehide', releaseMedia);
  window.addEventListener('freeze', releaseMedia);   // WebView bfcache
  try { const P = window.Capacitor && window.Capacitor.Plugins; if (P && P.App && P.App.addListener) P.App.addListener('appStateChange', s => { if (s && s.isActive === false) releaseMedia(); }); } catch (e) {}

  // بوابة التفعيل أولاً (ترخيص مربوط بالجهاز) في تطبيق الأندرويد
  if (window.MRAH_APK && window.MrahiLicense) {
    const s = window.MrahiLicense.state().state;
    if (s !== 'active' && s !== 'disabled') { renderLicenseGate(); return; }
  }
  // التطبيق محلي بالكامل — قاعدة بيانات على الجهاز (IndexedDB)، بلا إنترنت ولا خادم
  startLocalMode();
}

init();
