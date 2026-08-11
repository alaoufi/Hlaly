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
  function closedPregnancyPatch(status) { return { status, mating_date: null, expected: null }; }
  return { normalizeTheme, applyTheme, isRestorableSnapshot, shouldShowAnimal, herdVisibility, matingIdsForAnimal, staleActivePregnancyIdsForAnimal, normalizeNewbornPolicy, newbornAgeDays, shouldCountNewborn, closedPregnancyPatch };
});
