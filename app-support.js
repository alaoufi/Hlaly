(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MrahiSupport = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const THEMES = new Set(['desert', 'emerald', 'midnight']);
  const NEWBORN_MODES = new Set(['immediate', 'with_mother']);
  const NEWBORN_UNITS = new Set(['days', 'months']);
  const normalizeTheme = value => THEMES.has(value) ? value : 'desert';
  function applyTheme(value, doc) {
    const theme = normalizeTheme(value);
    const target = doc || (typeof document !== 'undefined' ? document : null);
    if (target && target.documentElement) target.documentElement.setAttribute('data-theme', theme);
    return theme;
  }
  function isRecordArray(value) {
    return value == null || (Array.isArray(value) && value.every(row => row && typeof row === 'object' && !Array.isArray(row)));
  }
  function isRestorableSnapshot(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.animals)) return false;
    return ['animals', 'matings', 'pregnancies', 'births', 'vaccineTypes', 'vaccinations', 'treatments'].every(key => isRecordArray(value[key]));
  }
  function shouldShowAnimal(animal, options) {
    if (!animal || animal.status !== 'present' || animal.sex !== 'male') return true;
    return animal.purpose === 'sire' ? !!options.sires : !!options.males;
  }
  function herdVisibility(animals, options) {
    const rows = Array.isArray(animals) ? animals : [];
    const settings = options || {};
    const presentMales = rows.filter(a => a && a.status === 'present' && a.sex === 'male');
    const hasMale = presentMales.some(a => a.purpose !== 'sire');
    const hasSire = presentMales.some(a => a.purpose === 'sire');
    return {
      maleFilter: (!!settings.males && hasMale) || (!!settings.sires && hasSire),
      sireRoute: !!settings.sires && hasSire,
      maleSetting: hasMale,
      sireSetting: hasSire
    };
  }
  function matingIdsForAnimal(matings, animalId) {
    return (Array.isArray(matings) ? matings : []).filter(m => m && m.animal_id === animalId && m.id != null).map(m => m.id);
  }
  function staleActivePregnancyIdsForAnimal(pregnancies, animalId) {
    const active = (Array.isArray(pregnancies) ? pregnancies : [])
      .filter(p => p && p.animal_id === animalId && p.status === 'monitoring' && p.id != null)
      .sort((a, b) => (b.mating_date || '').localeCompare(a.mating_date || '') || Number(b.id) - Number(a.id));
    return active.slice(1).map(p => p.id);
  }
  function normalizeNewbornPolicy(value) {
    const input = value && typeof value === 'object' ? value : {};
    const mode = NEWBORN_MODES.has(input.mode) ? input.mode : 'with_mother';
    const unit = NEWBORN_UNITS.has(input.unit) ? input.unit : 'days';
    const age = Number.isFinite(Number(input.age)) ? Math.max(0, Math.floor(Number(input.age))) : 0;
    return { mode, age, unit };
  }
  function newbornAgeDays(birth, asOf) {
    if (!birth || !asOf) return null;
    const start = new Date(String(birth).slice(0, 10) + 'T00:00:00');
    const end = new Date(String(asOf).slice(0, 10) + 'T00:00:00');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.max(0, Math.floor((end - start) / 86400000));
  }
  function shouldCountNewborn(animal, policy, asOf) {
    if (!animal || animal.source !== 'born') return true;
    const normalized = normalizeNewbornPolicy(policy);
    if (normalized.mode === 'immediate') return true;
    const age = newbornAgeDays(animal.birth, asOf || new Date().toISOString().slice(0, 10));
    if (age == null) return true;
    const threshold = normalized.age * (normalized.unit === 'months' ? 30 : 1);
    return age >= threshold;
  }
  function vaccinationStatus(vaccination, validityDays, asOf) {
    const row = vaccination || {};
    const today = String(asOf || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const date = String(row.date || '').slice(0, 10);
    if (row.schedule_status === 'unconfirmed') return 'unconfirmed';
    const valid = Math.max(0, Number(validityDays) || 0);
    const activeUntil = date && valid ? new Date(date + 'T00:00:00') : null;
    if (activeUntil) {
      activeUntil.setDate(activeUntil.getDate() + valid);
      if (today >= date && today <= activeUntil.toISOString().slice(0, 10)) return 'active';
    }
    if (row.next_due && String(row.next_due).slice(0, 10) > today) return 'upcoming';
    return 'old';
  }

  const vaccinationSpecies = [
    { k: 'sheep', ar: 'الأغنام (الضأن)' }, { k: 'goat', ar: 'الماعز' },
    { k: 'cattle', ar: 'الأبقار' }, { k: 'camel', ar: 'الإبل' }, { k: 'horse', ar: 'الخيول' }
  ];
  const vaccinationGuides = [
    { key: 'fmd', name: 'الحمى القلاعية', species: ['sheep','goat','cattle'], period: 'دورية البرنامج: ٦ أشهر؛ التأسيس يختلف حسب المنتج.', pages: '10–11' },
    { key: 'ppr', name: 'طاعون المجترات الصغيرة', species: ['sheep','goat'], period: 'مرة بالعمر وفق شروط البرنامج؛ لا موعد دوري مفترض.', pages: '13' },
    { key: 'camel-pox', name: 'جدري الإبل', species: ['camel'], period: 'دورية البرنامج: سنوية؛ التعزيز حسب الشركة المصنعة.', pages: '18' },
    { key: 'brucella', name: 'الحمى المالطية (البروسيلا)', species: ['sheep','goat','cattle'], period: 'مرة بالعمر وفق شروط البرنامج واللقاح؛ لا موعد دوري مفترض.', pages: '20' },
    { key: 'clostridia', name: 'التسمم المعوي', species: ['sheep','goat','cattle'], period: 'تأسيس بجرعتين بفاصل ٤–٦ أسابيع ثم تعزيز سنوي؛ لا نستنتج المرحلة من التاريخ.', pages: '22' }
  ];
  function vaccinationChoices(species) { return vaccinationGuides.filter(v => v.species.includes(species)); }
  function validVaccinationDate(date, today) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
    const parsed = new Date(date + 'T12:00:00Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === date && date <= today;
  }
  // A date and disease do not establish the product or primary-series stage.
  function vaccinationNextDue() { return null; }
  function vaccinationReminderDue(row, today) {
    if (!row || !validVaccinationDate(row.next_due, '9999-12-31') || !validVaccinationDate(today, '9999-12-31')) return false;
    const days = Math.round((new Date(row.next_due + 'T12:00:00Z') - new Date(today + 'T12:00:00Z')) / 86400000);
    return days >= 0 && days <= 7;
  }
  function closedPregnancyPatch(status) { return { status, mating_date: null, expected: null }; }
  return { vaccinationSpecies, vaccinationChoices, validVaccinationDate, vaccinationNextDue, vaccinationReminderDue, normalizeTheme, applyTheme, isRestorableSnapshot, shouldShowAnimal, herdVisibility, matingIdsForAnimal, staleActivePregnancyIdsForAnimal, normalizeNewbornPolicy, newbornAgeDays, shouldCountNewborn, vaccinationStatus, closedPregnancyPatch };
});
