// Regression tests for Bar Brawl synchronization. No real worlds/documents accessed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../barbrawl'));
const DEL = Symbol('delete');
const REPLACE = Symbol('replace');
const getProperty = (obj, key) => key.split('.').reduce((value, part) => value?.[part], obj);
const setProperty = (obj, key, value) => {
  const parts = key.split('.'); const leaf = parts.pop();
  for (const part of parts) obj = obj[part] ??= {};
  obj[leaf] = value;
};
const context = vm.createContext({
  console, _del: DEL, _replace: obj => Object.assign(obj, {[REPLACE]: true}),
  foundry: {utils: {getProperty, setProperty, hasProperty: (obj, key) => getProperty(obj, key) !== undefined}},
  CONST: {TOKEN_DISPLAY_MODES: {NONE: 0, CONTROL: 10, OWNER_HOVER: 20, HOVER: 30, OWNER: 40, ALWAYS: 50}}
});
// Load the actual API helpers as well as synchronization, not stubbed bar logic.
const api = fs.readFileSync(path.join(root, 'module/api.js'), 'utf8').replace(/\bexport /g, '');
const sync = fs.readFileSync(path.join(root, 'module/synchronization.js'), 'utf8')
  .replace(/^import[^\n]+\n/, '').replace(/\bexport /g, '');
vm.runInContext(api + '\n' + sync + '\nthis.prepare = prepareUpdate;', context);
const custom = id => ({id, attribute: 'custom', value: 18, max: 33, mincolor: '#aabbcc', maxcolor: '#ddeeff', position: 'top-inner'});
const base = () => ({_source: {displayBars: 50, bar1: {attribute: null}, bar2: {attribute: 'Energias.EF'},
  flags: {barbrawl: {resourceBars: {bar1: custom('bar1'), bar2: {id: 'bar2', attribute: 'Energias.EF'}, bar3: custom('bar3')}}}}});
const light = {bright: 10, dim: 20, color: '#ffaa00', animation: {type: 'torch'}};
function run(doc, changes) {
  const before = JSON.stringify(doc._source);
  const lightBefore = JSON.stringify(changes.light);
  context.prepare(doc, changes);
  assert.equal(JSON.stringify(doc._source), before, 'Existing token source must not be mutated');
  assert.equal(JSON.stringify(changes.light), lightBefore, 'Lighting patch must not be changed');
  return changes;
}
const bars = patch => patch.flags?.barbrawl?.resourceBars;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('OK ' + name); }

test('reproduce: null native attribute with no Bar Brawl patch preserves existing custom bar', () => {
  const patch = run(base(), {bar1: {attribute: null}, light: structuredClone(light)});
  assert.equal(bars(patch).bar1, undefined);
  assert.equal(bars(patch).bar3, undefined);
});
test('light-only updates do not add bar changes', () => {
  const patch = run(base(), {light: structuredClone(light)});
  assert.equal(patch.flags, undefined);
});
test('no flag data and null native bars are safe', () => {
  const patch = run({_source: {displayBars: 50}}, {bar1: {attribute: null}, bar2: {attribute: null}, light});
  assert.equal(Object.keys(bars(patch)).length, 0);
});
test('both custom native slots survive repeated light on/off patches', () => {
  const doc = base(); doc._source.flags.barbrawl.resourceBars.bar2 = custom('bar2');
  for (const bright of [10, 0, 15, 0]) {
    const patch = run(doc, {bar1: {attribute: null}, bar2: {attribute: null}, light: {bright}});
    assert.equal(bars(patch).bar1, undefined); assert.equal(bars(patch).bar2, undefined);
  }
});
test('custom value-only update plus native null keeps resource and clamps value', () => {
  const patch = run(base(), {bar1: {attribute: null}, flags: {barbrawl: {resourceBars: {bar1: {value: 99}}}}});
  assert.equal(bars(patch).bar1.value, 33);
  assert.notEqual(bars(patch).bar1, DEL);
});
test('new custom configuration plus native null remains custom', () => {
  const patch = run(base(), {bar1: {attribute: null}, flags: {barbrawl: {resourceBars: {bar1: custom('bar1')}}}});
  assert.equal(bars(patch).bar1.attribute, 'custom');
});
test('explicit deletion still removes a custom resource', () => {
  const patch = run(base(), {bar1: {attribute: null}, flags: {barbrawl: {resourceBars: {bar1: DEL}}}});
  assert.equal(bars(patch).bar1, DEL);
});
test('None selection still removes a custom resource', () => {
  const patch = run(base(), {flags: {barbrawl: {resourceBars: {bar1: {attribute: ''}}}}});
  assert.equal(bars(patch).bar1, DEL); assert.equal(patch.bar1.attribute, null);
});
test('clearing a linked native resource still works', () => {
  const patch = run(base(), {bar2: {attribute: null}});
  assert.equal(bars(patch).bar2, DEL); assert.equal(bars(patch).bar1, undefined);
});
test('changing a linked resource preserves all other bar settings', () => {
  const patch = run(base(), {bar2: {attribute: 'Energias.EH'}});
  assert.equal(bars(patch).bar2.attribute, 'Energias.EH'); assert.equal(bars(patch).bar1, undefined);
});
test('native value-only update does not replace an attribute with undefined', () => {
  const patch = run(base(), {bar2: {value: 10}});
  assert.equal(bars(patch).bar2, undefined);
});
test('empty native bar still explicitly removes its resource', () => {
  const patch = run(base(), {bar1: {}});
  assert.equal(bars(patch).bar1, DEL);
});
test('new native bar uses raw source visibility without dereferencing _source again', () => {
  const patch = run({_source: {displayBars: 30}}, {bar2: {attribute: 'Energias.EF'}});
  assert.equal(bars(patch).bar2.id, 'bar2'); assert.equal(bars(patch).bar2.attribute, 'Energias.EF');
  assert.equal(bars(patch).bar2.ownerVisibility, 30);
});
test('replacement explicitly removes omitted custom bars', () => {
  const patch = run(base(), {flags: {barbrawl: {replaceBars: true, resourceBars: {bar2: {id: 'bar2', attribute: 'Energias.EF'}}}}});
  assert.equal(bars(patch).bar1, DEL); assert.equal(bars(patch).bar3, DEL);
});
test('clear-all replacement remains available', () => {
  const patch = run(base(), {flags: {barbrawl: {replaceBars: true}}});
  assert.equal(patch.bar1.attribute, null); assert.equal(patch.bar2.attribute, null);
  assert.equal(bars(patch)[REPLACE], true);
});
test('prototype token updates use the same protected synchronization', () => {
  const changes = {prototypeToken: {bar1: {attribute: null}, light: structuredClone(light)}};
  run(base(), changes.prototypeToken);
  assert.equal(bars(changes.prototypeToken).bar1, undefined);
});
console.log(`${passed} regression checks passed; no worlds or actors accessed.`);
