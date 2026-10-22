import assert from "node:assert/strict";
import {solarDeclination, solarState, formatSolarHour, createDaylightSync, darknessAnimationOptions} from "../scripts/daylight.mjs";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
for (let day = -361; day < 722; day++) {
  const state = solarState({dayOfYear: day});
  near(state.dayHours, 12);
  near(state.sunrise, 6);
  near(state.sunset, 18);
  near(solarDeclination(day), solarDeclination(day + 361));
}
near(solarDeclination(44), 23.44);
near(solarDeclination(134), 0);
near(solarDeclination(224), -23.44);
near(solarDeclination(314), 0);
for (const latitude of [15, 30, 45, 60]) {
  const summer = solarState({latitude, dayOfYear: 44});
  const winter = solarState({latitude, dayOfYear: 224});
  assert.ok(summer.dayHours > 12 && winter.dayHours < 12);
  near(summer.dayHours + winter.dayHours, 24);
  near(summer.dayHours, solarState({latitude: -latitude, dayOfYear: 224}).dayHours);
  near(solarState({latitude, dayOfYear: 134}).dayHours, 12);
  near(solarState({latitude, dayOfYear: 314}).dayHours, 12);
}
assert.ok(Math.abs(solarDeclination(360) - solarDeclination(0)) < 0.5, "Cruine/year boundary stays continuous");
const at = hour => solarState({secondsToday: hour * 3600});
near(at(0).darkness, 0.85);
near(at(12).darkness, 0);
near(at(5.5).darkness, 0.85);
near(at(6).darkness, 0.425);
near(at(6.5).darkness, 0);
near(at(18).darkness, 0.425);
near(at(18.5).darkness, 0.85);
near(at(-6).darkness, at(18).darkness);
near(at(30).darkness, at(6).darkness);
assert.equal(at(6).phase, "Amanhecer");
assert.equal(at(18).phase, "Entardecer");
for (let i = 331; i < 390; i++) assert.ok(at(i / 60).darkness <= at((i - 1) / 60).darkness);
for (let i = 1051; i < 1110; i++) assert.ok(at(i / 60).darkness >= at((i - 1) / 60).darkness);
for (const latitude of [-90, -80, -30, 0, 30, 80, 90, NaN, Infinity]) {
  for (let day = 0; day <= 361; day += 1) {
    for (const hour of [0, 5.9, 6, 12, 18, 23.9]) {
      const s = solarState({latitude, dayOfYear: day, secondsToday: hour * 3600, twilightMinutes: 240});
      assert.ok(Number.isFinite(s.darkness) && s.darkness >= 0 && s.darkness <= 1);
    }
  }
}
near(solarState({latitude: 90, dayOfYear: 44}).darkness, 0);
near(solarState({latitude: 90, dayOfYear: 224}).darkness, 0.85);
near(solarState({dayDarkness: 0.7, nightDarkness: 0.3}).darkness, 0.7);
assert.equal(formatSolarHour(6), "06:00");
assert.equal(formatSolarHour(24), "00:00");
assert.equal(darknessAnimationOptions(0, 0.85).animateDarkness, 2000);
assert.equal(darknessAnimationOptions(0.85, 0).animateDarkness, 2000);
assert.equal(darknessAnimationOptions(0.4, 0.401).animateDarkness, 750);
assert.equal(darknessAnimationOptions(0.4, 0.401, 0.5).animateDarkness, 500);
assert.equal(darknessAnimationOptions(0, 0.85, 0).animateDarkness, false);
assert.equal(darknessAnimationOptions(0, 0.85, -10).animateDarkness, false);
assert.equal(darknessAnimationOptions(0, 0.85, 999).animateDarkness, 10000);
assert.equal(darknessAnimationOptions(0, 0.85, NaN).animateDarkness, 2000);
// Crepúsculo de três horas: valores contínuos e monotônicos, não degraus.
const dusk = hour => solarState({secondsToday: hour * 3600, twilightMinutes: 180}).darkness;
near(dusk(16.5), 0); near(dusk(18), 0.425); near(dusk(19.5), 0.85);
for (let minute = 991; minute <= 1170; minute++) assert.ok(dusk(minute / 60) > dusk((minute - 1) / 60));

function fixture() {
  const settings = {dayNightEnabled: true, twilightMinutes: 60, dayDarkness: 0, nightDarkness: 0.85};
  const writes = [], errors = [];
  const gm = {id: "a", active: true, isGM: true};
  const secondGM = {id: "b", active: true, isGM: true};
  const scene = {
    config: {enabled: true, latitude: 0},
    environment: {darknessLevel: 0.2, darknessLevelLock: false},
    getFlag() {return this.config;},
    async update(data, options) {
      writes.push({data, options});
      this.environment.darknessLevel = data["environment.darknessLevel"];
    }
  };
  const game = {user: gm, users: [secondGM, gm], scenes: {active: scene}, time: {worldTime: 0}, settings: {get: (_id, key) => settings[key]}};
  const date = {dayOfYear: 44};
  const sync = createDaylightSync({getGame: () => game, getDate: () => date, onError: e => errors.push(e)});
  return {settings, game, scene, writes, errors, sync, date, gm, secondGM};
}
for (const change of [
  f => {f.settings.dayNightEnabled = false;},
  f => {f.scene.config.enabled = false;},
  f => {f.scene.environment.darknessLevelLock = true;},
  f => {f.scene.environment.darknessLock = true;},
  f => {const getFlag = f.scene.getFlag.bind(f.scene); f.scene.getFlag = (id,key) => key === "climate" ? {biome:"interior"} : getFlag(id,key);},
  f => {f.game.scenes.active = undefined;},
  f => {f.game.user = {id: "player", isGM: false};},
  f => {f.game.user = f.secondGM;},
  f => {f.game.users = [];}
]) {
  const f = fixture(); change(f); await f.sync(); assert.equal(f.writes.length, 0);
}
{
  const f = fixture();
  await Promise.all([f.sync(), f.sync(), f.sync()]);
  assert.equal(f.writes.length, 1);
  assert.deepEqual(f.writes[0].data, {"environment.darknessLevel": 0.85});
  assert.equal(f.writes[0].options.tagmarDayNight, true);
  assert.equal(f.writes[0].options.animateDarkness, 2000, "Scene broadcasts the native fade option");
  await f.sync(); assert.equal(f.writes.length, 1, "Unchanged time must not generate writes");
  f.game.time.worldTime = 12 * 3600; await f.sync(); near(f.scene.environment.darknessLevel, 0);
  f.game.time.worldTime = -6 * 3600; await f.sync(); near(f.scene.environment.darknessLevel, 0.425);
  f.scene.config.latitude = 30;
  f.game.time.worldTime = 6 * 3600; await f.sync();
  const summer = f.scene.environment.darknessLevel;
  f.date.dayOfYear = 224; await f.sync(); assert.ok(f.scene.environment.darknessLevel > summer);
  f.gm.active = false; f.game.user = f.secondGM;
  f.game.time.worldTime = 0; await f.sync(); near(f.scene.environment.darknessLevel, 0.85);
}
{
  const f = fixture(); let release;
  const original = f.scene.update.bind(f.scene);
  f.scene.update = async (...args) => {
    await new Promise(resolve => {release = resolve;});
    await original(...args);
    f.scene.update = original;
  };
  const pending = f.sync(); await Promise.resolve();
  f.game.time.worldTime = 43200;
  f.sync(); release(); await pending;
  assert.equal(f.writes.length, 2);
  near(f.scene.environment.darknessLevel, 0);
  assert.equal(f.writes.at(-1).options.animateDarkness, 2000, "Queued jumps retain smooth transitions");
}
{
  const f = fixture(); let release;
  f.scene.update = async () => new Promise(resolve => {release = resolve;});
  const pending = f.sync(); await Promise.resolve();
  const oldScene = f.scene;
  const nextScene = {...oldScene, environment: {darknessLevel: 0.1}, update: async data => f.writes.push(data)};
  f.game.scenes.active = nextScene; f.sync(); release(); await pending;
  assert.equal(f.writes.length, 1, "Queued update follows current active scene");
}
{
  const f = fixture();
  const original = f.scene.update;
  f.scene.update = async () => {throw new Error("network failure");};
  await f.sync(); assert.equal(f.errors.length, 1);
  await f.sync(); assert.equal(f.errors.length, 1, "Repeated failures must not flood notifications");
  f.scene.update = original; await f.sync(); assert.equal(f.writes.length, 1, "Retries on later request");
}
console.log("PASS: equator, solstices/equinoxes, hemispheres, Cruine, twilight, polar bounds, GM election, opt-in/locks, jumps, queue, scene switch and recovery.");
