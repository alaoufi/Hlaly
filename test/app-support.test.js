const test = require('node:test');
const assert = require('node:assert/strict');
const support = require('../app-support.js');

test('defaults to the desert theme and rejects unknown themes', () => {
  assert.equal(support.normalizeTheme(), 'desert');
  assert.equal(support.normalizeTheme('midnight'), 'midnight');
  assert.equal(support.normalizeTheme('unknown'), 'desert');
});

test('accepts only restoration snapshots with record arrays', () => {
  assert.equal(support.isRestorableSnapshot({ animals: [] }), true);
  assert.equal(support.isRestorableSnapshot({ animals: 'bad' }), false);
  assert.equal(support.isRestorableSnapshot(null), false);
});

test('hides male animals until their display option is enabled', () => {
  assert.equal(support.shouldShowAnimal({ status: 'present', sex: 'male', purpose: 'sale' }, { males: false, sires: false }), false);
  assert.equal(support.shouldShowAnimal({ status: 'present', sex: 'male', purpose: 'sire' }, { males: false, sires: true }), true);
  assert.equal(support.shouldShowAnimal({ status: 'present', sex: 'female' }, { males: false, sires: false }), true);
});

test('derives herd controls from enabled settings and present matching records', () => {
  assert.deepEqual(
    support.herdVisibility([], { males: true, sires: true }),
    { maleFilter: false, sireRoute: false, maleSetting: false, sireSetting: false }
  );
  assert.deepEqual(
    support.herdVisibility([{ status: 'present', sex: 'male', purpose: '' }], { males: true, sires: false }),
    { maleFilter: true, sireRoute: false, maleSetting: true, sireSetting: false }
  );
  assert.deepEqual(
    support.herdVisibility([{ status: 'present', sex: 'male', purpose: 'sire' }], { males: false, sires: true }),
    { maleFilter: true, sireRoute: true, maleSetting: false, sireSetting: true }
  );
});

test('selects only mating records belonging to the specified mother', () => {
  assert.deepEqual(
    support.matingIdsForAnimal([{ id: 1, animal_id: 7 }, { id: 2, animal_id: 8 }, { id: 3, animal_id: 7 }], 7),
    [1, 3]
  );
});

test('clears mating dates when a pregnancy is closed', () => {
  assert.deepEqual(support.closedPregnancyPatch('born'), { status: 'born', mating_date: null, expected: null });
  assert.deepEqual(support.closedPregnancyPatch('aborted'), { status: 'aborted', mating_date: null, expected: null });
});

test('keeps only the newest active pregnancy per mother', () => {
  assert.deepEqual(
    support.staleActivePregnancyIdsForAnimal([
      { id: 4, animal_id: 7, status: 'monitoring', mating_date: '2026-05-12' },
      { id: 8, animal_id: 7, status: 'monitoring', mating_date: '2026-07-07' },
      { id: 9, animal_id: 7, status: 'aborted', mating_date: '2026-04-01' },
      { id: 10, animal_id: 8, status: 'monitoring', mating_date: '2026-08-01' }
    ], 7),
    [4]
  );
});

test('normalizes newborn policy and converts months to a day threshold', () => {
  assert.deepEqual(
    support.normalizeNewbornPolicy({ mode: 'with_mother', age: 2, unit: 'months' }),
    { mode: 'with_mother', age: 2, unit: 'months' }
  );
  assert.deepEqual(
    support.normalizeNewbornPolicy({ mode: 'bad', age: -4, unit: 'bad' }),
    { mode: 'with_mother', age: 0, unit: 'days' }
  );
  assert.equal(support.newbornAgeDays('2026-01-01', '2026-02-15'), 45);
});

test('counts newborn immediately or after its configured age', () => {
  const newborn = { source: 'born', birth: '2026-01-01', status: 'present', sex: 'female' };
  assert.equal(support.shouldCountNewborn(newborn, { mode: 'immediate', age: 0, unit: 'days' }, '2026-01-02'), true);
  assert.equal(support.shouldCountNewborn(newborn, { mode: 'with_mother', age: 2, unit: 'months' }, '2026-02-15'), false);
  assert.equal(support.shouldCountNewborn(newborn, { mode: 'with_mother', age: 2, unit: 'months' }, '2026-03-02'), true);
});
