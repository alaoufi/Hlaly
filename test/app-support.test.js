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

