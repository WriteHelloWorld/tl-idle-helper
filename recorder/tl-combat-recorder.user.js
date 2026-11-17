// ==UserScript==
// @name TL战斗数据记录器
// @namespace https://github.com/YatsukiRenka/tl-idle-helper
// @version 0.1.5
// @description 本地记录自身战斗数据用于评分校准，不上传任何数据。
// @match https://tl.jayczee.top/*
// @match https://tl2.jayczee.top/*
// @match https://tl3.jayczee.top/*
// @run-at document-start
// @sandbox raw
// @grant none
// @noframes
// @homepageURL https://github.com/YatsukiRenka/tl-idle-helper
// @downloadURL https://raw.githubusercontent.com/YatsukiRenka/tl-idle-helper/main/recorder/tl-combat-recorder.user.js
// @updateURL https://raw.githubusercontent.com/YatsukiRenka/tl-idle-helper/main/recorder/tl-combat-recorder.user.js
// ==/UserScript==
(function () {
  'use strict';
  const ATTRS = 'hp mp extAtk intAtk extDef intDef critRate critDef avoidance precision iceAtk fireAtk poisonAtk holyAtk iceDef fireDef poisonDef holyDef'.split(' ');
  const fields = 'battle buff dbl kills rewards exp gold dealt taken deaths potHp potMp healHp healMp'.split(' ');
  const clone = x => JSON.parse(JSON.stringify(x));
  const dangerDefaults = { dead: 0, low: 0, mid: 0, hpSum: 0, hpMin: 1, b3: 0, b10: 0, hpMax: 0, pt: 0 };
  const eventDefaults = () => ({ dot: 0, dotN: 0, exec: 0, monRevive: 0, petCasts: 0, petRevive: 0, heal: 0, healN: 0, p: [0, 0, 0, 0, 0] });
  const round = n => Math.round(n * 10000) / 10000;
  const empty = () => ({ version: 1, configs: {}, skills: {}, rivals: {}, monsters: {}, hours: {}, floats: {} });
  const nums = x => ATTRS.map((k, i) => Number(Array.isArray(x) ? x[i] : x?.[k]) || 0);
  const keyOf = m => [m.templateId, m.level, m.category].join(':');
  const slots = s => (s?.monsterSlots || []).filter(Boolean);
  const solo = s => !s.pet || s.pet.isDead || !(s.pet.currentHp > 0);
  const soloDefaults = () => ({ os: [0, 0, 0, 0, 0], solo: 0 });
  function hash(value) {
    let h = 2166136261;
    for (const c of JSON.stringify(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  function petOf(p) {
    return p ? { name: p.name, level: p.level, base: nums(p.base) } : null;
  }
  function valid(d) {
    if (!d || d.version !== 1) return false;
    return ['configs', 'skills', 'monsters', 'hours', 'floats'].every(k => d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) && Object.values(d.hours).every(b => fields.every(k => Number.isFinite(b?.[k])) && Array.isArray(b.o) && Array.isArray(b.i));
  }
  class Recorder {
    constructor({ now, read, write }) {
      Object.assign(this, { now, read, write, data: empty(), lastWrite: now() });
    }
    activate(c) {
      if (this.roleId === c.roleId) return;
      if (this.roleId !== undefined) this.flush();
      this.roleId = c.roleId;
      this.previous = this.sig = this.exp = undefined;
      this.skill = '';
      this.rivalSessions = new Map();
      try { const d = this.read(this.storageKey()); this.data = valid(d) ? clone(d) : empty(); } catch { this.data = empty(); }
      this.data.rivals ||= {};
      for (const [k, b] of Object.entries(this.data.hours)) this.data.hours[k] = { ...dangerDefaults, ...eventDefaults(), ...soloDefaults(), ...b };
      for (const cfg of Object.values(this.data.configs)) cfg.dots ||= [];
    }
    storageKey() { return 'tl-combat-recorder-v1:' + this.roleId; }
    config(s, c) {
      const skills = (s.player.skills || []).map(x => [x.id, x.level]).sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }));
      const attrs = nums(c.attrs), pet = petOf(s.pet);
      this.sig = hash([c.level, attrs, skills, pet]);
      this.data.configs[this.sig] ||= { first: s.serverTime, last: s.serverTime, level: c.level, sect: c.sect, attrs, skills, pet, out: [], in: [] };
      this.data.configs[this.sig].last = s.serverTime;
      const dots = this.data.configs[this.sig].dots ||= [];
      for (const m of slots(s).filter(m => !m.isDead && m.currentHp > 0)) this.poison(m, dots);
      this.recordSkills(s.player);
      for (const m of slots(s)) {
        if (m.type === 'PLAYER') this.rival(m, s.sessionId);
        else this.data.monsters[keyOf(m)] = [m.name, ...nums(m.base)];
      }
    }
    poison(m, dots) {
      for (const p of m.poisons || []) {
        const damage = Math.round(p.damage * 100) / 100;
        if (p.sourceId !== 'player' || !(damage > 0) || dots.length >= 40 || dots.some(x => x[0] === keyOf(m) && x[1] === damage)) continue;
        dots.push([keyOf(m), damage, p.attack]);
      }
    }
    recordSkills(unit) {
      for (const x of unit.skills || []) this.data.skills[x.id] = clone(Object.fromEntries(['name', 'icon', 'skillType', 'hitCount', 'cd', 'mpCost', 'combatRules', 'effects'].filter(k => x[k] !== undefined).map(k => [k, x[k]])));
    }
    rival(unit, sessionId) {
      this.recordSkills(unit);
      const key = /sect\/([^/]+)/.exec(unit.skills?.[0]?.icon || '')?.[1] || '';
      if (!(key in this.data.rivals) && Object.keys(this.data.rivals).length >= 40) return;
      const sessions = this.rivalSessions.get(key) || new Set();
      const seen = (this.data.rivals[key]?.seen || 0) + Number(!sessions.has(sessionId));
      sessions.add(sessionId);
      this.rivalSessions.set(key, sessions);
      this.data.rivals[key] = { seen, level: unit.level,
        skills: (unit.skills || []).map(x => [x.id, x.level]).sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true })) };
    }
    bucket(t, c) {
      const k = [Math.floor(t / 3600000), c.mapId, this.sig].join('|');
      const b = this.data.hours[k] ||= { ...dangerDefaults, ...eventDefaults(), ...soloDefaults(), ...Object.fromEntries(fields.map(f => [f, 0])), o: [0, 0, 0, 0, 0], i: [0, 0, 0, 0, 0], k: {} };
      b.pt = c.potionThreshold || 0;
      return b;
    }
    packet(p, c) {
      if (!c || c.roleId == null || !p) return;
      this.activate(c);
      if (p.type === 'COMBAT_STATE') this.state(p.data || {}, c);
      else if (this.sig && p.success) this.other(p, c);
      if (this.now() - this.lastWrite >= 300000) this.flush();
    }
    state(s, c) {
      if (s.stage !== 'running' || !s.player) { this.previous = undefined; this.losses = []; return; }
      const prev = this.previous;
      if (prev?.sessionId === s.sessionId && s.sequence <= prev.sequence) return;
      if (prev?.sessionId !== s.sessionId) { this.skill = ''; this.losses = []; }
      this.config(s, c);
      const b = this.bucket(s.serverTime, c);
      const dead = s.player.isDead || !(s.player.currentHp > 0);
      const wasDead = prev && (prev.player.isDead || !(prev.player.currentHp > 0));
      if (dead) {
        if (prev?.sessionId === s.sessionId) {
          b.dead += Math.max(0, Math.min(5000, s.serverTime - prev.serverTime));
          if (!wasDead) b.deaths++;
        }
        this.losses = [];
        this.floating(s, prev, b);
        this.previous = clone(s);
        return;
      }
      if (wasDead) this.previous = undefined;
      this.danger(s, wasDead ? null : prev, b);
      if (!wasDead && prev?.sessionId === s.sessionId) this.delta(prev, s, c, b);
      this.floating(s, prev?.sessionId === s.sessionId ? prev : null, b);
      this.previous = clone(s);
    }
    danger(s, prev, b) {
      const max = s.player.base.hp, fraction = s.player.currentHp / max;
      if (!(max > 0)) return;
      b.hpMin = round(Math.min(b.hpMin, fraction)); b.hpMax = Math.max(b.hpMax, max);
      if (prev?.sessionId !== s.sessionId) return;
      const dt = Math.min(5000, s.serverTime - prev.serverTime);
      if (!(dt > 0)) return;
      b.low += fraction < 0.35 ? dt : 0; b.mid += fraction < 0.6 ? dt : 0; b.hpSum += dt * fraction;
      this.losses.push({ time: s.serverTime, loss: Math.max(0, prev.player.currentHp - s.player.currentHp) });
      this.losses = this.losses.filter(x => x.time > s.serverTime - 10000);
      for (const seconds of [3, 10]) b['b' + seconds] = round(Math.max(b['b' + seconds], this.losses.filter(x => x.time > s.serverTime - seconds * 1000).reduce((n, x) => n + x.loss, 0) / max));
    }
    delta(prev, s, c, b) {
      const dt = Math.min(5000, s.serverTime - prev.serverTime);
      if (dt > 0) {
        b.battle += dt; b.buff += s.player.buffs?.length ? dt : 0; b.dbl += c.doubleExp ? dt : 0;
        if (solo(s)) b.solo += dt;
        b.taken += Math.max(0, prev.player.currentHp - s.player.currentHp);
      }
      if (!prev.player.isDead && s.player.isDead) b.deaths++;
      for (const m of slots(prev)) this.monsterDelta(m, slots(s).find(x => x.id === m.id), b, dt);
    }
    monsterDelta(m, next, b, dt) {
      if (dt > 0) b.dealt += next ? Math.max(0, m.currentHp - next.currentHp) : (!m.isDead ? m.currentHp : 0);
      if (m.type === 'PLAYER' || m.isDead || (next && !next.isDead)) return;
      b.kills++; const k = keyOf(m); b.k[k] = (b.k[k] || 0) + 1;
    }
    discover(e, side) {
      const shape = e.text.replace(/[0-9]+/g, '#').replace(/【[^】]*】/g, '【】');
      const k = [side, e.color || '', shape].join('|');
      if (k in this.data.floats || Object.keys(this.data.floats).length < 80) this.data.floats[k] = (this.data.floats[k] || 0) + 1;
    }
    floating(s, prev, b) {
      const before = b.o.slice();
      const last = new Map(), monsters = [...slots(s), ...slots(prev)];
      for (const e of Array.isArray(s.floating) ? s.floating : []) this.event(e, s, monsters, b, last);
      if (solo(s)) b.os = b.os.map((n, i) => n + b.o[i] - before[i]);
    }
    event(e, s, monsters, b, last) {
      if (!e || typeof e.text !== 'string' || typeof e.ownerId !== 'string') return;
      const incoming = e.ownerId === 'player', m = monsters.find(x => x.id === e.ownerId);
      const pet = e.ownerId === s.pet?.id || e.ownerId.startsWith('pet-player-');
      this.discover(e, incoming ? 'player' : 'monster');
      if (s.player.isDead || !(s.player.currentHp > 0)) return;
      if (this.specialEvent(e, incoming, pet, m, b)) return;
      if (incoming && /^【[^】]*】$/.test(e.text)) { this.skill = e.text.slice(1, -1); return; }
      if (!incoming && !pet && !m) return;
      const a = pet ? b.p : incoming ? b.i : b.o;
      if (e.text === 'Miss') { a[1]++; return; }
      if (!/^[0-9]+!?$/.test(e.text)) return;
      const n = parseInt(e.text, 10);
      if (e.color === '#ff7043') { a[4] += n; if (last.has(e.ownerId)) last.get(e.ownerId)[3] += n; return; }
      const crit = e.text.endsWith('!') ? 1 : 0;
      a[0]++; a[2] += crit; a[3] += n;
      if (pet) return;
      // The number does not say which monster hit; the analysis matches it against every living type.
      const mk = incoming ? [...new Set(slots(s).filter(x => !x.isDead).map(keyOf))].sort().join(',') : keyOf(m);
      last.set(e.ownerId, this.sample(s, incoming, mk, n, crit));
    }
    specialEvent(e, incoming, pet, monster, b) {
      const poison = monster && /^毒 [−-](\d+)$/.exec(e.text);
      if (poison) { b.dot += Number(poison[1]); b.dotN++; return true; }
      if (monster && e.text === '蚀毒处决') { b.exec++; return true; }
      if (monster && e.text === '复活') { b.monRevive++; return true; }
      if (pet && /^【[^】]*】$/.test(e.text)) { b.petCasts++; return true; }
      if (pet && e.text === '复活') { b.petRevive++; return true; }
      if (incoming && /^\+\d+$/.test(e.text)) { b.heal += Number(e.text); b.healN++; return true; }
      return false;
    }
    sample(s, incoming, mk, n, crit) {
      const cfg = this.data.configs[this.sig], base = nums(s.player.base);
      const diff = Object.fromEntries(ATTRS.filter((k, i) => base[i] !== cfg.attrs[i]).map(k => [k, base[ATTRS.indexOf(k)]]));
      const row = [this.skill || '', mk, n, 0, crit, diff], list = incoming ? cfg.in : cfg.out;
      const same = x => x[0] === row[0] && x[1] === mk && x[4] === crit && JSON.stringify(x[5]) === JSON.stringify(diff);
      if (list.length < 120 && list.filter(same).length < 2 &&
          (list.length < 40 || !list.some(x => x[1] === mk && x[4] === crit))) list.push(row);
      return row;
    }
    other(p, c) {
      const d = p.data || {};
      if (p.type === 'COMBAT_REWARD' && d.roleInfo?.role?.id === c.roleId) {
        const b = this.bucket(this.now(), c), exp = Number(d.roleInfo.role.currentExp);
        b.rewards++; b.exp += this.exp === undefined ? 0 : Math.max(0, exp - this.exp); this.exp = exp;
        b.gold += (d.drops || []).filter(x => x.name === '金币').reduce((n, x) => n + Number(x.count), 0);
      }
      if (p.type === 'USE_ITEM_RESPONSE') for (const e of d.effects || []) this.heal(e, c);
    }
    heal(e, c) {
      if (e.type !== 'HEAL' || !['HP', 'MP'].includes(e.attr)) return;
      const b = this.bucket(this.now(), c), suffix = e.attr === 'HP' ? 'Hp' : 'Mp';
      b['pot' + suffix]++; b['heal' + suffix] += Number(e.value) || 0;
    }
    trimHours(count) {
      const keys = Object.keys(this.data.hours).sort((a, b) => Number(a.split('|')[0]) - Number(b.split('|')[0]));
      for (const k of keys.slice(0, count)) delete this.data.hours[k];
    }
    prune() {
      this.trimHours(Math.max(0, Object.keys(this.data.hours).length - 3000));
      const used = new Set(Object.keys(this.data.hours).map(k => k.split('|')[2]));
      const keys = Object.keys(this.data.configs).sort((a, b) => Number(used.has(a)) - Number(used.has(b)) || this.data.configs[a].last - this.data.configs[b].last);
      for (const k of keys.slice(0, Math.max(0, keys.length - 200))) this.dropConfig(k);
      for (const k of Object.keys(this.data.monsters).slice(500)) delete this.data.monsters[k];
    }
    dropConfig(k) {
      delete this.data.configs[k];
      for (const h of Object.keys(this.data.hours)) if (h.split('|')[2] === k) delete this.data.hours[h];
    }
    flush() {
      if (this.roleId === undefined) return;
      this.prune(); this.lastWrite = this.now();
      try { this.write(this.storageKey(), clone(this.data)); } catch {
        this.trimHours(Math.ceil(Object.keys(this.data.hours).length / 5));
        try { this.write(this.storageKey(), clone(this.data)); } catch {}
      }
    }
    clear() { this.data = empty(); this.previous = this.sig = this.exp = undefined; this.skill = ''; this.flush(); }
    summary() {
      const hours = Object.keys(this.data.hours), configs = Object.values(this.data.configs);
      return { battleHours: Object.values(this.data.hours).reduce((n, b) => n + b.battle, 0) / 3600000, configs: configs.length, hours: hours.length, samples: configs.reduce((n, c) => n + c.out.length + c.in.length, 0), bytes: JSON.stringify(this.data).length, since: hours.length ? Math.min(...hours.map(k => Number(k.split('|')[0]))) * 3600000 : null };
    }
    exportData(meta) { return { format: 'tl-combat-data', version: 1, recorder: '0.1.5', exportedAt: this.now(), ...meta, data: clone(this.data) }; }
  }
  if (typeof module !== 'undefined') { module.exports = { Recorder, ATTRS, hash }; return; }
  if (window.__TL_COMBAT_RECORDER__) return;
  window.__TL_COMBAT_RECORDER__ = true;
  let warned = false;
  function safe(fn) { try { return fn(); } catch (e) { if (!warned) { warned = true; console.warn('战斗记录器', e); } } }
  const recorder = new Recorder({ now: Date.now, read: k => JSON.parse(localStorage.getItem(k)), write: (k, d) => localStorage.setItem(k, JSON.stringify(d)) });
  let paused = safe(() => localStorage.getItem('tl-combat-recorder-v1:paused') === 'true');
  function context() {
    const s = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s?.get('character');
    if (s?.role?.id == null) return null;
    let settings = {}; try { settings = JSON.parse(s.role.settings || '{}'); } catch {}
    return { roleId: s.role.id, level: s.role.level, sect: s.role.sect, mapId: s.role.mapId, potionThreshold: settings.hp?.enabled ? settings.hp.threshold : 0, doubleExp: settings.doubleExp?.buffExpireTime > Date.now(), attrs: nums(s.finalAttributes), maps: s.maps || [] };
  }
  const attached = new WeakSet(), Native = window.WebSocket;
  function attach(socket) {
    const u = new URL(socket.url, location.href);
    if (u.pathname !== '/ws' || u.host !== location.host || attached.has(socket)) return;
    attached.add(socket);
    socket.addEventListener('message', e => safe(() => { if (!paused) recorder.packet(JSON.parse(e.data), context()); }));
  }
  safe(() => {
    const send = Native.prototype.send;
    Native.prototype.send = function (...args) { safe(() => attach(this)); return Reflect.apply(send, this, args); };
    window.WebSocket = new Proxy(Native, { construct(target, args, newTarget) { const s = Reflect.construct(target, args, newTarget); safe(() => attach(s)); return s; } });
  });
  window.addEventListener('pagehide', () => safe(() => recorder.flush()));
  function download() {
    const c = context(); if (!c) return;
    recorder.activate(c);
    const client = [...document.scripts].map(s => s.src.split('/').pop()).find(s => /^index-.*[.]js$/.test(s)) || '';
    const maps = c.maps.map(m => Object.fromEntries(['id', 'name', 'reqLevel', 'mapType', 'monsters', 'leaders', 'bosses'].map(k => [k, m[k]])));
    const data = recorder.exportData({ host: location.host, client, role: { level: c.level, sect: c.sect }, maps });
    const a = document.createElement('a'), url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.href = url; a.download = 'tl-combat-data-' + location.hostname + '-' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-') + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function ui() {
    if (!document.body) { setTimeout(() => safe(ui), 100); return; }
    const button = document.createElement('button'), panel = document.createElement('div');
    button.textContent = '数据'; button.style.cssText = 'position:fixed;left:0;top:60%;z-index:2147481000;font-size:12px;background:#111c;color:white';
    panel.style.cssText = 'position:fixed;left:40px;top:60%;z-index:2147481000;font-size:12px;background:#111e;color:white;padding:12px;max-width:330px'; panel.hidden = true;
    const status = document.createElement('div'), info = document.createElement('div'); panel.append(status, info);
    const pause = addButton(panel, '', () => { paused = !paused; recorder.previous = undefined; localStorage.setItem('tl-combat-recorder-v1:paused', String(paused)); refresh(); });
    addButton(panel, '导出数据', download);
    addButton(panel, '清空数据', () => { const c = context(); if (c && confirm('清空本角色已记录的战斗数据？')) { recorder.activate(c); recorder.clear(); refresh(); } });
    const note = document.createElement('p'); note.textContent = '数据只保存在本浏览器，不会上传。导出的文件不含角色名和账号。'; panel.append(note);
    function refresh() {
      const c = context(); if (c) recorder.activate(c);
      const s = recorder.summary(); status.textContent = !c ? '等待角色登录' : paused ? '已暂停' : '记录中';
      info.textContent = `已记录 ${s.battleHours.toFixed(1)} 战斗小时 · ${s.configs} 种配置 · ${s.samples} 条命中样本 · 约 ${Math.ceil(s.bytes / 1024)} KB` + (s.since !== null ? ' 自 ' + new Date(s.since).toISOString().slice(0, 10) + ' 起' : '');
      pause.textContent = paused ? '继续记录' : '暂停记录';
    }
    button.onclick = () => safe(() => { panel.hidden = !panel.hidden; refresh(); });
    setInterval(() => { if (!panel.hidden) safe(refresh); }, 5000); document.body.append(button, panel);
  }
  function addButton(parent, text, fn) { const b = document.createElement('button'); b.textContent = text; b.onclick = () => safe(fn); parent.append(b); return b; }
  safe(ui);
})();
