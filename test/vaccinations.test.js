const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../app-support');
test('filters disease choices by species without treating missing species as all', () => {
 assert.ok(api.vaccinationChoices('camel').every(v => v.key === 'camel-pox'));
 assert.ok(api.vaccinationChoices('sheep').some(v => v.key === 'ppr'));
 assert.ok(!api.vaccinationChoices('cattle').some(v => v.key === 'ppr'));
 assert.deepEqual(api.vaccinationChoices('horse'), []);
 assert.deepEqual(api.vaccinationChoices('unknown'), []);
 assert.equal(api.vaccinationSpecies.length, 5);
});
test('never substitutes a periodic interval for an unknown primary series', () => {
 for (const species of api.vaccinationSpecies) for (const v of api.vaccinationChoices(species.k)) {
  assert.equal(api.vaccinationNextDue(v, '2026-11-01'), null);
 }
 assert.equal(api.vaccinationStatus({date:'2026-11-01',schedule_status:'unconfirmed'},365,'2026-11-04'),'unconfirmed');
});
test('validates real past dates including leap days', () => {
 assert.equal(api.validVaccinationDate('2024-02-29','2026-11-04'),true);
 for (const date of ['', '2025-02-29', '2026-02-30', '2026-13-01','2027-01-01']) assert.equal(api.validVaccinationDate(date,'2026-11-04'),false);
});
test('reminders start seven calendar days before a known due date', () => {
 for (const [due, expected] of [['2026-11-12',false],['2026-11-11',true],['2026-11-04',true],['2026-11-03',false],[null,false],['bad',false]]) {
  assert.equal(api.vaccinationReminderDue({next_due:due},'2026-11-04'),expected);
 }
 assert.equal(api.vaccinationReminderDue({next_due:'2027-01-02'},'2026-12-26'),true);
});

const vm = require('node:vm');
const fs = require('node:fs');
test('registration screen filters animals, validates and saves without invented next dose', async () => {
 const elements = {};
 const element = id => elements[id] ||= {value:'',innerHTML:'',disabled:false,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}};
 const animals=[{id:1,type:'sheep',status:'present'},{id:2,type:'camel',status:'present'}];
 const C={animals,vaccineTypes:[]}; const saved=[];
 const context={window:{MrahiSupport:api},document:{getElementById:element},C,
  can:()=>true,animalById:id=>animals.find(a=>a.id===id),view:()=>element('view'),
  fSelect:()=>'',fInput:()=>'',fAnimalSelect:(label,id,selected,list)=>JSON.stringify(list),
  todayStr:()=> '2026-11-04',val:id=>element(id).value,esc:String,toast:()=>{},
  guard:async fn=>{await fn();return true;},loadAll:async()=>{},goBack:()=>{},
  dbInsert:async(table,row)=>{saved.push({table,row}); if(table==='vaccineTypes') C.vaccineTypes.push({...row,id:3});}
 };
 const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
 vm.createContext(context); vm.runInContext(source.slice(source.indexOf('function screenVaccinate(arg)'),source.indexOf('function screenHerdVaccinate()')),context);
 context.screenVaccinate();
 element('v_species').value='sheep'; element('v_species').handlers.change();
 assert.match(element('v_animals').innerHTML, /sheep/); assert.doesNotMatch(element('v_animals').innerHTML,/camel/);
 element('v_type').value='clostridia'; element('v_type').handlers.change();
 element('v_animal').value='1'; element('v_date').value='2026-11-04';
 await element('v_save').handlers.click();
 const row=saved.find(x=>x.table==='vaccinations').row;
 assert.equal(row.animal_id,1); assert.equal(row.next_due,null); assert.equal(row.schedule_status,'unconfirmed');
 element('v_species').value='camel'; element('v_species').handlers.change();
 assert.doesNotMatch(element('v_type').innerHTML,/clostridia/);
 element('v_species').value='horse'; element('v_species').handlers.change();
 assert.equal(element('v_save').disabled,true);
});
