(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MrahiSupport = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const THEMES = new Set(['desert', 'emerald', 'midnight']);
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
  function closedPregnancyPatch(status) { return { status, mating_date: null, expected: null }; }
  return { normalizeTheme, applyTheme, isRestorableSnapshot, shouldShowAnimal, herdVisibility, matingIdsForAnimal, closedPregnancyPatch };
});

