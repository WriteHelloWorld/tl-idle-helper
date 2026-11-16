// ==UserScript==
// @name         TL挂机助手
// @namespace    https://github.com/YatsukiRenka/tl-idle-helper
// @version      0.2.14
// @author       YatsukiRenka（基于 doai 的原作与 JimChan 的衍生版）
// @description  日常、挂机、成长、装备回收、宝石与工艺；串行动作、资源预算、原页面战斗及每日版本检查。
// @match        https://tl.jayczee.top/*
// @match        https://tl2.jayczee.top/*
// @match        https://tl3.jayczee.top/*
// @run-at       document-start
// @sandbox      raw
// @grant        none
// @noframes
// @homepageURL  https://github.com/YatsukiRenka/tl-idle-helper
// @downloadURL  https://raw.githubusercontent.com/YatsukiRenka/tl-idle-helper/main/tl-autopilot.user.js
// @updateURL    https://raw.githubusercontent.com/YatsukiRenka/tl-idle-helper/main/tl-autopilot.user.js
// ==/UserScript==
// 基于 doai 的 Greasy Fork 604931「天龙八部挂机版 · 完整托管助手」0.1.5。
// 含 JimChan 的 Greasy Fork 605228「完整托管助手（衍生版）」0.2.0（MIT）的功能：按缺口用药、额度填 0 不限、技能升级受阻原因、装备评分显示。

(() => {
  'use strict';
  const TLPolicy = (() => {
    const WEIGHTS = {
      hp: 0.3,
      mp: 0.2,
      extAtk: 4,
      intAtk: 4,
      extDef: 3,
      intDef: 3,
      critRate: 5,
      precision: 5,
      critDef: 3,
      avoidance: 3,
      iceAtk: 2,
      fireAtk: 2,
      poisonAtk: 2,
      holyAtk: 2,
      iceDef: 1.5,
      fireDef: 1.5,
      poisonDef: 1.5,
      holyDef: 1.5,
    };
    const GEM_ATTR = {
      1: 'hp',
      2: 'mp',
      3: 'extAtk',
      4: 'intAtk',
      5: 'extDef',
      6: 'intDef',
      7: 'precision',
      8: 'avoidance',
      9: 'critRate',
      10: 'critDef',
      11: 'iceAtk',
      12: 'fireAtk',
      13: 'poisonAtk',
      14: 'holyAtk',
      15: 'iceDef',
      16: 'fireDef',
      17: 'poisonDef',
      18: 'holyDef',
    };
    const ENHANCE = [0, 10, 20, 30, 45, 65, 90, 120, 155, 195],
      ENHANCE_RATE = [0, 100, 90, 90, 80, 65, 50, 35, 25, 15];
    const GEM_TYPES = {
      attack: ['希望宝石', '智慧宝石', '玄微宝石', '幻冥宝石'],
      defense: ['生命宝石', '魅力宝石', '命运宝石', '天机宝石'],
    };
    const ATTACK_SLOTS = [1, 6, 8, 7, 11],
      DEFENSE_SLOTS = [3, 10, 2, 9, 4, 5];
    const NPC = {
      arena: 'npc_biwu',
      trial: 'npc_xuefei',
      gem: 'npc_gem_merchant',
      smithy: 'npc_smithy',
      tailor: 'npc_tailor',
      exchange: 'npc_yuci_exchange',
      zl: 'npc_zenlong',
      camp: 'npc_xiaowei',
      wushuang: 'npc_wushuang',
      lottery: 'npc_kuaihuosan',
    };
    // Native TailorShop/YuciExchangeDialog recipes, verified in the post-migration frontend.
    const TAILOR_DEFENSE = [
      10115005, 10210011, 10210012, 10210031, 10210032, 10210051, 10210052, 10211011, 10211012,
      10211031, 10211032, 10211051, 10211052, 10212011, 10212012, 10212031, 10212032, 10212051,
      10212052, 10214011, 10214012, 10221006, 10221016, 10413071,
    ];
    const TAILOR_JEWELRY = [10222006, 10222016, 10223006, 10223016, 10420069];
    const EXCHANGE_SETS = ['御赐精纺套', '御赐熟铜套', '御赐精钢套', '御赐黄金套', '御赐混沌套'];
    const DEFAULTS = {
      version: 2,
      fill: { enabled: true, refill: true },
      resumeAfterReload: false,
      keepAwake: true,
      tickMs: 1000,
      requestTimeoutMs: 10000,
      budget: {
        moneyReserve: 10000,
        expReserve: 0,
        moneyPerDay: 100000,
        skillExpPerDay: 1000000,
        smeltExpPerDay: 1000000,
      },
      battle: { enabled: true, mapId: 0, levelOffset: 5, recoverDeath: true, maxDeathsPerHour: 3 },
      activities: {
        enabled: true,
        zl: true,
        zlRuns: 1,
        camp: true,
        campRuns: 5,
        bear: true,
        bearRuns: 1,
        tianlingClaim: true,
        lotteryDraw: true,
        lotteryBatch: 12,
        tianlingUse: false,
      },
      pets: { enabled: true, summon: true, claim: true, hatch: false, hatchMutant: false,
        keepMinAverage: 118, feed: false, feedKeepExp: 0, refreshMinutes: 10 },
      arena: { enabled: true, like: true, claim: true, challenge: true, maxPerDay: 10,
        maxPowerRatio: 1.1, refreshMinutes: 30, rushMinutes: 10 },
      hidden: { enabled: true, wash: true, washQuality: true, inbox: true, feed: false,
        maxLevel: 100, keepExp: 0, refreshMinutes: 30 },
      potions: {
        enabled: true,
        hpThreshold: 50,
        mpThreshold: 50,
        autoChoose: true,
        autoThreshold: false,
        order: 'fit',
        hpPriority: [],
        mpPriority: [],
      },
      growth: {
        level: true,
        maxLevel: 99,
        skills: true,
        maxSkillLevel: 99,
        skillPriority: [],
        skillBeforeLevel: false,
      },
      gear: {
        scoring: 'combat', targets: 'pool', autoDefense: true, defenseWeight: 0.5, enabled: true,
        minGainPercent: 1, allowBinding: true, fromWarehouse: true, weights: WEIGHTS,
      },
      market: { sort: 'off', showScore: true, bagScore: true, tipScore: true, scoreType: 'combat', bagScoreType: 'combat' },
      sell: {
        enabled: true,
        maxQuality: 1,
        keepSets: true,
        keepFuture: true,
        keepBestBackup: true,
        keepCrafted: true,
        keepTemplateIds: [],
        materialIds: [],
        maxPerDay: 100,
      },
      warehouse: { enabled: false, minQuality: 3, sets: true, perfect: false },
      shop: { enabled: true, minimumStock: 8, targetStock: 30, maxBatch: 20 },
      gems: {
        enabled: true,
        drill: true,
        maxHoles: 1,
        inlay: true,
        synth: true,
        maxLevel: 3,
        minSynthSuccess: 80,
        polish: true,
        replace: false,
        maxPerDay: 20,
      },
      smithy: {
        enabled: true,
        appraisal: true,
        enhance: true,
        targetEnhance: 3,
        minEnhanceSuccess: 90,
        smelt: true,
        allowSmeltEquipped: false,
        investChunk: 5000000,
        repair: true,
        forge: true,
        artifactIds: [],
        maxPerDay: 12,
      },
      craft: {
        enabled: true,
        tailor: true,
        exchange: true,
        targetIds: [],
        minGainPercent: 3,
        maxPerDay: 3,
      },
      reconnect: {
        enabled: true,
        autoReload: false,
        reloadAfterSeconds: 120,
        maxReloadsPerHour: 2,
      },
      updates: { checkDaily: true, remind: true, autoApply: true },
    };
    const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const integer = (v, d = 0) => Math.floor(num(v, d));
    const parse = (v, d) => {
      if (v == null || v === '') return d;
      if (typeof v !== 'string') return v;
      try {
        return JSON.parse(v);
      } catch {
        return d;
      }
    };
    const array = (v) => (Array.isArray(v) ? v : []);
    const clone = (v) => JSON.parse(JSON.stringify(v));
    function merge(base, value) {
      const out = clone(base);
      if (!value || typeof value !== 'object') return out;
      for (const k of Object.keys(base)) {
        if (!(k in value)) continue;
        if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]))
          out[k] = merge(base[k], value[k]);
        else if (Array.isArray(base[k])) out[k] = Array.isArray(value[k]) ? value[k] : out[k];
        else if (typeof base[k] === 'boolean')
          out[k] = typeof value[k] === 'boolean' ? value[k] : out[k];
        else if (typeof base[k] === 'number')
          out[k] = Number.isFinite(Number(value[k])) ? Number(value[k]) : out[k];
        else out[k] = value[k];
      }
      return out;
    }
    function config(value) {
      if (value?.budget && Object.hasOwn(value.budget, 'expPerDay')) {
        const budget = { ...value.budget };
        for (const key of ['skillExpPerDay', 'smeltExpPerDay'])
          if (!Object.hasOwn(budget, key)) budget[key] = budget.expPerDay;
        value = { ...value, budget };
      }
      const p = merge(DEFAULTS, value);
      p.version = 2;
      p.pets.keepMinAverage = Math.max(0, Math.min(200, num(p.pets.keepMinAverage)));
      p.pets.feedKeepExp = Math.max(0, num(p.pets.feedKeepExp));
      p.pets.refreshMinutes = Math.max(2, Math.min(240, num(p.pets.refreshMinutes)));
      if (!['combat', 'linear'].includes(p.gear.scoring)) p.gear.scoring = 'combat';
      if (!['off', 'power', 'combat', 'gain'].includes(p.market.sort)) p.market.sort = 'off';
      for (const key of ['scoreType', 'bagScoreType'])
        if (!['combat', 'power'].includes(p.market[key])) p.market[key] = 'combat';
      const defense = Number(p.gear.defenseWeight);
      p.gear.targets = p.gear.targets === 'map' ? 'map' : 'pool';
      p.gear.autoDefense = typeof p.gear.autoDefense === 'boolean' ? p.gear.autoDefense : true;
      p.gear.defenseWeight = Number.isFinite(defense) ? Math.max(0, Math.min(1, defense)) : 0.5;
      for (const section of Object.values(p))
        if (section && typeof section === 'object' && !Array.isArray(section))
          for (const [k, v] of Object.entries(section))
            if (typeof v === 'number') section[k] = Math.max(0, num(v));
      p.activities.lotteryBatch = Math.max(1, Math.min(100, integer(p.activities.lotteryBatch)));
      p.arena.maxPerDay = integer(p.arena.maxPerDay);
      p.arena.rushMinutes = Math.max(0, Math.min(120, integer(p.arena.rushMinutes)));
      p.arena.maxPowerRatio = Math.max(0.5, Math.min(3, p.arena.maxPowerRatio));
      for (const section of [p.arena, p.hidden])
        section.refreshMinutes = Math.max(5, Math.min(240, section.refreshMinutes));
      p.hidden.maxLevel = Math.max(1, Math.min(100, integer(p.hidden.maxLevel)));
      p.tickMs = Math.max(700, integer(p.tickMs, 1000));
      p.requestTimeoutMs = Math.max(6000, integer(p.requestTimeoutMs, 10000));
      p.warehouse.minQuality = Math.min(5, Math.max(1, integer(p.warehouse.minQuality, 3)));
      p.gems.maxHoles = Math.min(3, integer(p.gems.maxHoles, 1));
      p.gems.maxLevel = Math.min(6, Math.max(1, integer(p.gems.maxLevel, 3)));
      p.smithy.investChunk = Math.max(1000000, integer(p.smithy.investChunk));
      p.smithy.targetEnhance = Math.min(9, integer(p.smithy.targetEnhance, 3));
      p.potions.hpThreshold = Math.max(10, Math.min(80, integer(p.potions.hpThreshold, 50)));
      p.potions.mpThreshold = Math.max(10, Math.min(80, integer(p.potions.mpThreshold, 50)));
      if (!['fit', 'weak', 'strong', 'smart'].includes(p.potions.order)) p.potions.order = 'fit';
      return p;
    }
    const camel = (k) => {
      const s = String(k);
      if (Object.hasOwn(WEIGHTS, s)) return s;
      return (s === s.toUpperCase() ? s.toLowerCase() : s.replace(/([A-Z])/g, '_$1').toLowerCase())
        .replace(/^_/, '')
        .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    };
    function stats(v) {
      const out = {};
      for (const [k, n] of Object.entries(parse(v, {}) || {}))
        if (Number.isFinite(Number(n))) out[camel(k)] = num(n);
      return out;
    }
    function addStats(target, source, factor = 1) {
      for (const [k, n] of Object.entries(source)) {
        if (k === 'allAtk')
          for (const a of ['iceAtk', 'fireAtk', 'poisonAtk', 'holyAtk'])
            target[a] = (target[a] || 0) + n * factor;
        else if (k === 'allDef')
          for (const a of ['iceDef', 'fireDef', 'poisonDef', 'holyDef'])
            target[a] = (target[a] || 0) + n * factor;
        else target[k] = (target[k] || 0) + n * factor;
      }
    }
    const WAREHOUSE_CAPACITY = 200;
    function equipQuality(e) {
      return num(e?.quality ?? template(e).qualityBase ?? 1, 1);
    }
    function setTemplateIds(s) {
      return new Set(
        array(s.equipSets).flatMap((set) => array(parse(set.equipTmplIds, []))).map(num),
      );
    }
    function warehouseEligible(e, p, setIds) {
      const quality = stats(e.appraisalStats);
      return (
        !e.isEquipped && !e.hiddenWeapon && num(e.equipTmpl?.slotType) !== 12 && e.equipTmpl &&
        ((p.warehouse.sets && setIds.has(num(e.tmplId || e.equipTmpl.id))) ||
          equipQuality(e) >= p.warehouse.minQuality ||
          (p.warehouse.perfect && e.isAppraisal &&
            num(quality.extScore) > 1500 && num(quality.intScore) > 1500))
      );
    }
    function slots(eq) {
      const s = parse(eq?.gemSlots, [-1, -1, -1]);
      return Array.isArray(s) && s.length ? s.map((v) => integer(v, -1)) : [-1, -1, -1];
    }
    function template(eq) {
      return eq?.equipTmpl || eq?.tmpl || eq || {};
    }
    function lookup(collection, id) {
      if (collection instanceof Map) return collection.get(num(id)) || collection.get(id);
      return array(collection).find((v) => num(v.id) === num(id));
    }
    function equipmentStats(eq, gemInfos) {
      const t = template(eq),
        base = stats(t.baseStats),
        out = {};
      addStats(out, base, 1 + (ENHANCE[integer(eq?.enhanceLevel)] || 0) / 100);
      addStats(out, stats(eq?.extraStats || t.extraStats));
      const qual = stats(eq?.appraisalStats);
      if (eq?.isAppraisal && [1, 12].includes(num(t.slotType)) && num(t.reqLevel) >= 50) {
        out.extAtk = (out.extAtk || 0) + ((base.extAtk || 0) * (qual.extScore || 0)) / 10000;
        out.intAtk = (out.intAtk || 0) + ((base.intAtk || 0) * (qual.intScore || 0)) / 10000;
      }
      for (const id of slots(eq)) {
        if (id <= 0) continue;
        const gem = lookup(gemInfos, id),
          attr = GEM_ATTR[num(gem?.subType)];
        if (attr) out[attr] = (out[attr] || 0) + num(gem.value);
      }
      return out;
    }
    function scoreStats(values, weights = WEIGHTS) {
      return Object.entries(values).reduce((sum, [k, n]) => sum + num(n) * num(weights[k]), 0);
    }
    const SCORE_UNIT = 10000;
    function characterScore(stats, state, prefs) {
      if (!array(state?.monsters).length) return null;
      const weights = gearWeights(state, prefs), ctx = combatContext(state, prefs);
      const values = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, num(stats?.[k])]));
      if (!ctx || !ctx.weights) return scoreStats(values, weights);
      const value = combatValue(values, ctx), bare = combatValue(equipmentValues([], state, ctx), ctx);
      return positiveValue(value) && positiveValue(bare) ?
        SCORE_UNIT * Math.log(value / bare) : scoreStats(values, weights) * SCORE_UNIT / ctx.scale;
    }
    function equipmentScore(eq, state, prefs) {
      const weights = gearWeights(state, prefs), ctx = combatContext(state, prefs);
      const fallback = () => scoreStats(equipmentStats(eq, state?.gemInfos), weights);
      if (!ctx || !ctx.weights) return fallback();
      const worn = wornBaseline(state, ctx), slot = num(template(eq).slotType);
      if (!worn.slots.has(slot)) {
        const rest = worn.items.filter((e) => num(template(e).slotType) !== slot);
        worn.slots.set(slot, { rest, value: combatValue(equipmentValues(rest, state, ctx), ctx) });
      }
      const base = worn.slots.get(slot);
      const after = combatValue(equipmentValues(base.rest.concat(eq), state, ctx), ctx);
      return positiveValue(base.value) && positiveValue(after) ?
        SCORE_UNIT * Math.log(after / base.value) : fallback() * SCORE_UNIT / ctx.scale;
    }
    const positiveValue = (value) => Number.isFinite(value) && value > 0;
    function gemScoreOrder(state, prefs, tie = () => 0) {
      const scores = new Map();
      const score = (gem) => {
        if (!scores.has(gem)) scores.set(gem, statScore({
          [GEM_ATTR[gem.itemTmpl.subType]]: num(gem.itemTmpl.value),
        }, state, prefs));
        return scores.get(gem);
      };
      return (a, b) => score(b) - score(a) || tie(a, b);
    }
    function statScore(values, state, prefs) {
      const weights = gearWeights(state, prefs), ctx = combatContext(state, prefs);
      if (!ctx || !ctx.weights) return scoreStats(values, weights);
      const next = { ...ctx.me };
      for (const k of Object.keys(WEIGHTS))
        next[k] = Math.max(0, next[k] + num(values[k]) * (ctx.statMult[k] ?? 1));
      const after = combatValue(next, ctx);
      return positiveValue(ctx.value) && positiveValue(after) ?
        SCORE_UNIT * Math.log(after / ctx.value) : scoreStats(values, weights) * SCORE_UNIT / ctx.scale;
    }
    function sumEquipment(items, state) {
      const out = {};
      for (const item of items) addStats(out, equipmentStats(item, state.gemInfos));
      return out;
    }
    function wornBaseline(state, ctx) {
      if (ctx.worn) return ctx.worn;
      const items = array(state.equipments).filter((e) => !!e.isEquipped);
      ctx.worn = { items, stats: sumEquipment(items, state),
        sets: setEffects(items, state), slots: new Map() };
      return ctx.worn;
    }
    function equipmentValues(items, state, ctx) {
      const old = wornBaseline(state, ctx), next = sumEquipment(items, state);
      const sets = setEffects(items, state), values = { ...ctx.me };
      for (const k of Object.keys(WEIGHTS))
        values[k] = Math.max(0, values[k] + (num(next[k]) - num(old.stats[k])) *
          (ctx.statMult[k] ?? 1) + num(sets[k]) - num(old.sets[k]));
      return values;
    }
    function setEffects(eqs, state) {
      const out = {}, worn = new Set(eqs.map((e) => num(e.tmplId || template(e).id)));
      for (const set of array(state.equipSets)) {
        const weapons = [], groups = [];
        for (const id of array(parse(set.equipTmplIds, []))) {
          const t = lookup(state.allEquipTemplates, id) ||
            template(array(state.equipments).concat(eqs).find((e) =>
              num(e.tmplId || template(e).id) === num(id)));
          if (num(t.slotType) === 1) weapons.push(id);
          else groups.push([id]);
        }
        if (weapons.length) groups.push(weapons);
        const members = set.memberGroups ? array(parse(set.memberGroups, [])) : groups;
        const count = members.filter((g) => g.some((id) => worn.has(num(id)))).length;
        const tiers = set.bonusTiers ? array(parse(set.bonusTiers, [])) :
          [{ pieces: members.length, effects: set.effects }];
        for (const tier of tiers)
          if (num(tier.pieces) > 0 && count >= num(tier.pieces))
            addStats(out, stats(tier.effects));
      }
      return out;
    }
    // Recorded combat fits hit × (level-scaled Atk²/(Atk+Def) with crit + capped elements).
    const combatCache = new WeakMap();
    const elements = ['ice', 'fire', 'poison', 'holy'];
    function combatContext(state, prefs) {
      if (!state || !prefs) return null;
      let cache = combatCache.get(state);
      if (!cache) combatCache.set(state, cache = new WeakMap());
      if (cache.has(prefs)) return cache.get(prefs);
      if (prefs.gear?.scoring !== 'combat' || !state.finalAttributes ||
          num(state.finalAttributes.hp) <= 0 || !array(state.monsters).length) {
        cache.set(prefs, null);
        return null;
      }
      const me = Object.fromEntries(Object.keys(WEIGHTS).map((k) =>
        [k, num(state.finalAttributes[k])]));
      me.level = num(state.role?.level);
      const skills = array(state.skills).filter((s) => num(s.currentLevel) > 0 &&
        s.skillDetail && num(s.skillDetail.unlockLevel) <= me.level).map((s) => ({
          ...s.skillDetail, level: num(s.currentLevel),
          effects: array(parse(s.skillDetail.effectConfig, [])),
        }));
      const attacks = skills.filter((s) => num(s.type) === 1 && num(s.cd) > 0);
      const tau = attacks.length ? Math.min(...attacks.map((s) => num(s.cd))) : 0;
      const filler = attacks.find((s) => num(s.cd) === tau);
      const casts = [], buffs = {}, statMult = {};
      const elementMult = Object.fromEntries(elements.map((e) => [e, 1]));
      let used = 0;
      const bonus = (s) => {
        const out = {};
        for (const e of s.effects)
          if (e.type === 'INSTANT' && e.calc === 'PLUS')
            addStats(out, { [camel(e.attr)]: num(e.base) + num(e.grow) * (s.level - 1) });
        return out;
      };
      for (const s of skills) {
        if (num(s.type) === 3) for (const e of s.effects) {
          if (e.calc !== 'MULTIPLY') continue;
          const k = camel(e.attr), el = String(e.attr).replace(/_DMG$/, '').toLowerCase();
          if (e.type === 'PASSIVE_DMG' && elements.includes(el)) elementMult[el] += num(e.base);
          if (e.type === 'PASSIVE_STAT') statMult[k] = (statMult[k] ?? 1) * (1 + num(e.base));
        }
        if (num(s.type) === 2 && num(s.cd) > 0) {
          used += Math.min(1, tau / num(s.cd));
          for (const e of s.effects)
            if (e.type === 'BUFF' && e.target === 'SELF' && e.calc === 'PLUS')
              addStats(buffs, { [camel(e.attr)]: (num(e.base) + num(e.grow) * (s.level - 1)) *
                Math.min(1, num(e.duration) / num(s.cd)) });
        }
        if (attacks.includes(s) && s !== filler) {
          const share = Math.min(1, tau / num(s.cd));
          used += share;
          casts.push({ share, bonus: bonus(s) });
        }
      }
      casts.push({ share: filler ? Math.max(0, 1 - used) : 1, bonus: filler ? bonus(filler) : {} });
      const normal = state.monsters.filter((m) => m.category === 'MONSTER');
      const ctx = { me, targets: (normal.length ? normal : state.monsters).map((m) =>
        ({ level: num(m.level), base: m.base, weight: m.weight })), casts, buffs, elementMult, statMult,
        defenseWeight: prefs.gear.autoDefense && Number.isFinite(state.survival?.weight)
          ? state.survival.weight : prefs.gear.defenseWeight };
      cache.set(prefs, ctx);
      return ctx;
    }
    const MONSTER_CRIT_SCALE = 0.66; // Measured factor; mechanism unknown.
    function combatParts(values, ctx) {
      const plus = (a, b) => Object.fromEntries(Object.keys(WEIGHTS).map((k) =>
        [k, Math.max(0, num(a[k]) + num(b[k]))]));
      const me = plus(values, ctx.buffs);
      const ratio = (a, b) => a + b === 0 ? 0 : a / (a + b);
      const damage = (a, d, la, ld, mult = {}, critScale = 1) => {
        const main = ['ext', 'int'].reduce((sum, t) => {
          const atk = num(a[t + 'Atk']), def = num(d[t + 'Def']);
          return sum + atk * ratio(atk, def);
        }, 0) * (1 + 0.005 * (la - ld));
        const elem = elements.reduce((sum, e) => sum + Math.max(0,
          num(a[e + 'Atk']) - num(d[e + 'Def'])) * 1.5 * (mult[e] ?? 1), 0);
        return ratio(num(a.precision), num(d.avoidance)) *
          (main * (1 + 0.5 * critScale * ratio(num(a.critRate), num(d.critDef))) + elem);
      };
      let out = 0, taken = 0, weight = 0;
      for (const target of ctx.targets) {
        const w = target.weight ?? 1;
        weight += w;
        for (const cast of ctx.casts)
          out += w * cast.share * damage(plus(me, cast.bonus), target.base,
            ctx.me.level, target.level, ctx.elementMult);
        taken += w * damage(target.base, me, target.level, ctx.me.level, {}, MONSTER_CRIT_SCALE);
      }
      return { out: out / weight, taken: taken / weight, hp: me.hp };
    }
    function combatValue(values, ctx) {
      const p = combatParts(values, ctx);
      return p.out * (p.taken > 0 && p.hp > 0 ? (p.hp / p.taken) ** ctx.defenseWeight : 1);
    }
    function combatWeights(state, prefs) {
      const ctx = combatContext(state, prefs);
      if (!ctx) return null;
      if (ctx.weights !== undefined) return ctx.weights;
      const base = combatValue(ctx.me, ctx);
      const delta = (k) => Math.log(combatValue({ ...ctx.me, [k]: ctx.me[k] + 1 }, ctx) / base);
      const ext = delta('extAtk');
      ctx.value = base;
      ctx.scale = 4 / ext;
      ctx.weights = ext > 0 && Number.isFinite(ext) ? Object.fromEntries(
        Object.keys(WEIGHTS).map((k) => [k, k === 'mp' ? 0 : 4 * delta(k) / ext])) : null;
      return ctx.weights;
    }
    function gearWeights(state, prefs) {
      return combatWeights(state, prefs) || prefs?.gear?.weights || WEIGHTS;
    }
    function setScore(eqs, state, prefs) {
      return eqs.reduce((sum, e) => sum + equipmentScore(e, state, prefs), 0) +
        scoreStats(setEffects(eqs, state), prefs.gear.weights);
    }

    function projectedGain(candidate, state, prefs) {
      const equipped = array(state.equipments).filter((e) => !!e.isEquipped),
        slot = num(template(candidate).slotType);
      const next = equipped.filter((e) => num(template(e).slotType) !== slot).concat(candidate);
      if (prefs.gear.scoring === 'combat') {
        const ctx = combatContext(state, prefs);
        if (!ctx) return { current: 0, after: 0, gain: 0, percent: 0, pending: true };
        const values = equipmentValues(next, state, ctx);
        const current = combatValue(ctx.me, ctx), after = combatValue(values, ctx);
        const beforeParts = combatParts(ctx.me, ctx), afterParts = combatParts(values, ctx);
        const percent = (a, b) => a > 0 ? (b - a) / a * 100 : b > 0 ? 100 : 0;
        const survival = (p) => p.taken > 0 ? p.hp / p.taken : 0;
        return { current, after, gain: after - current, percent: percent(current, after),
          outputPercent: percent(beforeParts.out, afterParts.out),
          survivalPercent: percent(survival(beforeParts), survival(afterParts)),
        };
      }
      const current = setScore(equipped, state, prefs),
        after = setScore(next, state, prefs);
      return {
        current,
        after,
        gain: after - current,
        percent: current > 0 ? ((after - current) / current) * 100 : after > 0 ? 100 : 0,
      };
    }
    const countItem = (s, id) =>
      array(s.bagItems)
        .filter((i) => num(i.itemId) === num(id))
        .reduce((n, i) => n + Math.max(0, integer(i.count)), 0);
    const bagItem = (s, id) =>
      array(s.bagItems).find((i) => num(i.itemId) === num(id) && num(i.count) > 0);
    const byFunction = (s, type) =>
      array(s.bagItems).find((i) => num(i.itemTmpl?.functionType) === type && num(i.count) > 0);
    function itemRange(item, kind) {
      const text = String(item?.descTpl || '').replace(/<[^>]+>/g, ' ');
      const range = text.match(
        new RegExp(
          '适用(?:于)?\\s*(\\d+)\\s*级?\\s*(?:至|到|[-~～])\\s*(\\d+)\\s*级\\s*(?:的)?' + kind,
        ),
      );
      if (!range) return null;
      const min = num(range[1]),
        max = num(range[2]);
      return min > 0 && max >= min ? { min, max } : null;
    }
    const drillRange = (item) => itemRange(item, '装备');
    const materialId = (bag) => num(bag?.itemId ?? bag?.itemTmpl?.id);
    function bagUsable(s, bag, quantity = 1, checkLevel = true) {
      const t = bag?.itemTmpl,
        id = materialId(bag);
      return (
        !!t &&
        Number.isSafeInteger(num(bag.id)) &&
        num(bag.id) > 0 &&
        id > 0 &&
        Number.isSafeInteger(id) &&
        (!t.id || num(t.id) === id) &&
        Number.isSafeInteger(num(bag.count)) &&
        num(bag.count) >= quantity &&
        (!checkLevel || num(t.reqLevel) <= num(s.role?.level))
      );
    }
    const materialUsable = (s, bag, quantity = 1) =>
      bagUsable(s, bag, quantity) && num(bag.itemTmpl.type, 3) === 3;
    const charmUsable = (s, bag) => bagUsable(s, bag) && [2, 3].includes(num(bag.itemTmpl.type, 3));
    const materialBag = (s, id) =>
      array(s.bagItems).find((b) => materialId(b) === num(id) && materialUsable(s, b));
    const materialCount = (s, id) =>
      array(s.bagItems)
        .filter((b) => materialId(b) === num(id) && materialUsable(s, b))
        .reduce((n, b) => n + integer(b.count), 0);
    function gemUsable(s, bag) {
      const t = bag?.itemTmpl;
      return (
        bagUsable(s, bag) &&
        num(t.gemLevel) >= 1 &&
        num(t.gemLevel) <= 6 &&
        Number.isInteger(num(t.gemLevel)) &&
        !!GEM_ATTR[num(t.subType)] &&
        GEM_TYPES.attack.concat(GEM_TYPES.defense).includes(t.gemType)
      );
    }
    const gemTemplate = (s, id) => lookup(s.gemInfos, id) || bagItem(s, id)?.itemTmpl || null;
    function materialSupports(bag, kind, level) {
      const range = itemRange(bag?.itemTmpl, kind);
      if (range) return level >= range.min && level <= range.max;
      // Numeric suitability text that cannot be read reliably is not assumed unrestricted.
      return !new RegExp('适用[^。；;\\n]*\\d+[^。；;\\n]*级[^。；;\\n]*' + kind).test(
        String(bag?.itemTmpl?.descTpl || ''),
      );
    }
    function charmCompatible(s, bag, kind, gem) {
      const embedded =
        kind === 'remove' &&
        gem?.itemTmpl &&
        num(gem.itemTmpl.gemLevel) >= 1 &&
        num(gem.itemTmpl.gemLevel) <= 6 &&
        !!GEM_ATTR[num(gem.itemTmpl.subType)];
      if (
        !charmUsable(s, bag) ||
        !(embedded || gemUsable(s, gem)) ||
        !materialSupports(bag, '宝石', num(gem.itemTmpl.gemLevel))
      )
        return false;
      const id = materialId(bag),
        fn = num(bag.itemTmpl.functionType);
      const nativeKinds = {
        5052: 'inlay',
        5053: 'inlay',
        5058: 'synth',
        5059: 'synth',
        5069: 'remove',
        5060: 'polish',
      };
      if (nativeKinds[id] && nativeKinds[id] !== kind) return false;
      if (kind === 'inlay') return id === 5053 && fn === 1;
      if (kind === 'synth') return id === (num(gem.itemTmpl.gemLevel) <= 4 ? 5058 : 5059);
      const expected = kind === 'remove' ? 4 : kind === 'polish' ? 5 : 0,
        known = kind === 'remove' ? 5069 : 5060;
      return !!expected && (id === known || (fn === expected && !!itemRange(bag.itemTmpl, '宝石')));
    }
    function gemCharm(s, kind, gem) {
      return (
        array(s.bagItems)
          .filter((b) => charmCompatible(s, b, kind, gem))
          .sort(
            (a, b) =>
              (itemRange(a.itemTmpl, '宝石')?.max || 6) -
                (itemRange(b.itemTmpl, '宝石')?.max || 6) ||
              num(a.itemTmpl.price) - num(b.itemTmpl.price) ||
              num(a.id) - num(b.id),
          )[0] || null
      );
    }
    function actionSlots(eq) {
      const raw = parse(eq?.gemSlots, eq?.gemSlots == null || eq.gemSlots === '' ? [] : null);
      if (
        !Array.isArray(raw) ||
        (raw.length && raw.length !== 3) ||
        raw.some(
          (v) =>
            !['number', 'string'].includes(typeof v) ||
            !Number.isSafeInteger(num(v, NaN)) ||
            num(v) < -1,
        )
      )
        return null;
      return raw.length ? raw.map(Number) : [-1, -1, -1];
    }
    function tailorMaterialIds(targetId) {
      const min = TAILOR_DEFENSE.includes(num(targetId))
        ? 5008
        : TAILOR_JEWELRY.includes(num(targetId))
          ? 5017
          : 0;
      return min ? Array.from({ length: 8 }, (_, i) => min + i) : [];
    }
    function drillMaterial(s, eq) {
      const level = num(template(eq).reqLevel);
      return (
        array(s.bagItems)
          .map((b) => ({ bag: b, range: drillRange(b.itemTmpl) }))
          .filter(
            ({ bag, range }) =>
              bagUsable(s, bag) &&
              num(bag.itemTmpl?.functionType) === 2 &&
              num(bag.itemTmpl.type, 3) === 3 &&
              range &&
              level >= range.min &&
              level <= range.max,
          )
          .sort(
            (a, b) =>
              a.range.max - b.range.max ||
              num(a.bag.itemTmpl.price) - num(b.bag.itemTmpl.price) ||
              num(a.bag.id) - num(b.bag.id),
          )[0]?.bag || null
      );
    }
    function materialCheck(a, s, prefs = DEFAULTS) {
      const fail = (reason) => ({ ok: false, reason }),
        ok = { ok: true, reason: '' },
        payload = a.payload || {},
        byId = (id) => array(s.bagItems).find((b) => num(b.id) === num(id));
      const equipment = (id) => array(s.equipments).find((e) => num(e.id) === num(id));
      if (a.type.startsWith('GEM_')) {
        if (a.type === 'GEM_SYNTH') {
          const ids = payload.gemBagItemIds;
          if (!Array.isArray(ids) || ids.length < 2 || ids.length > 5)
            return fail('合成需2至5颗相同宝石');
          const amounts = new Map();
          for (const id of ids) amounts.set(num(id), (amounts.get(num(id)) || 0) + 1);
          const bags = [...amounts].map(([id, count]) => ({ bag: byId(id), count }));
          if (bags.some(({ bag, count }) => !gemUsable(s, bag) || !bagUsable(s, bag, count)))
            return fail('合成宝石不存在、等级不可用或数量不足');
          const first = bags[0].bag,
            t = first.itemTmpl;
          if (
            num(t.gemLevel) >= 6 ||
            bags.some(
              ({ bag }) =>
                materialId(bag) !== materialId(first) ||
                num(bag.itemTmpl.gemLevel) !== num(t.gemLevel) ||
                bag.itemTmpl.gemType !== t.gemType ||
                num(bag.itemTmpl.subType) !== num(t.subType),
            )
          )
            return fail('合成宝石必须同模板、同等级，且未达到6级');
          const family = String(t.name || '')
            .replace(/\(\d+级\)$/, '')
            .trim();
          const targets = s.gemInfos instanceof Map ? [...s.gemInfos.values()] : array(s.gemInfos);
          if (
            !targets
              .concat(
                array(s.bagItems)
                  .map((b) => b.itemTmpl)
                  .filter(Boolean),
              )
              .some(
                (v) =>
                  num(v.gemLevel) === num(t.gemLevel) + 1 &&
                  v.gemType === t.gemType &&
                  num(v.subType) === num(t.subType) &&
                  String(v.name || '')
                    .replace(/\(\d+级\)$/, '')
                    .trim() === family,
              )
          )
            return fail('缺少下一等级宝石的模板数据');
          if (
            payload.charmBagItemId != null &&
            !charmCompatible(s, byId(payload.charmBagItemId), 'synth', first)
          )
            return fail('合成符数量、使用等级或宝石等级不匹配');
          return ok;
        }
        if (a.type === 'GEM_POLISH') {
          const gem = byId(payload.gemBagItemId);
          if (
            !gemUsable(s, gem) ||
            !['智慧宝石', '魅力宝石'].includes(gem.itemTmpl.gemType) ||
            String(gem.itemTmpl.name || '').startsWith('纯净')
          )
            return fail('只能雕琢可用的未纯净智慧或魅力宝石');
          return charmCompatible(s, byId(payload.charmBagItemId), 'polish', gem)
            ? ok
            : fail('雕琢符数量、用途或适用等级不匹配');
        }
        const eq = equipment(payload.roleEquipId),
          holes = actionSlots(eq),
          level = num(template(eq).reqLevel);
        if (
          !eq ||
          !Number.isSafeInteger(num(eq.id)) ||
          !holes ||
          level <= 0 ||
          !Number.isInteger(level)
        )
          return fail('装备或孔位数据无法确认');
        if (a.type === 'GEM_DRILL') {
          const bag = byId(payload.materialBagItemId),
            range = drillRange(bag?.itemTmpl);
          if (!holes.includes(-1)) return fail('装备已经没有可打孔的位置');
          return bagUsable(s, bag) &&
            num(bag.itemTmpl.functionType) === 2 &&
            num(bag.itemTmpl.type, 3) === 3 &&
            range &&
            level >= range.min &&
            level <= range.max
            ? ok
            : fail('打孔材料数量、使用等级或装备适用范围不匹配');
        }
        const types = ATTACK_SLOTS.includes(num(template(eq).slotType))
          ? GEM_TYPES.attack
          : DEFENSE_SLOTS.includes(num(template(eq).slotType))
            ? GEM_TYPES.defense
            : [];
        if (a.type === 'GEM_INLAY') {
          const gem = byId(payload.gemBagItemId);
          if (
            !holes.includes(0) ||
            !gemUsable(s, gem) ||
            !types.includes(gem.itemTmpl.gemType) ||
            !materialSupports(gem, '装备', level)
          )
            return fail('镶嵌需要开放孔位、足够宝石及适用部位/等级');
          const current = holes.filter((id) => id > 0).map((id) => gemTemplate(s, id));
          if (current.some((g) => !g) || current.some((g) => g.gemType === gem.itemTmpl.gemType))
            return fail('已镶宝石数据不完整或与新宝石类型重复');
          const charm = byId(payload.charmBagItemId);
          return charmCompatible(s, charm, 'inlay', gem) && materialSupports(charm, '装备', level)
            ? ok
            : fail('镶嵌符数量、用途或适用等级不匹配');
        }
        if (a.type === 'GEM_REMOVE') {
          const index = num(payload.gemSlotIndex, -1),
            old =
              Number.isInteger(index) && index >= 0 && index < 3
                ? gemTemplate(s, holes[index])
                : null;
          if (!old || holes[index] <= 0) return fail('摘除孔位中没有可确认的宝石');
          const oldBag = { id: 1, itemId: old.id, count: 1, itemTmpl: old },
            remove = byId(payload.charmBagItemId);
          if (
            !charmCompatible(s, remove, 'remove', oldBag) ||
            !materialSupports(remove, '装备', level)
          )
            return fail('摘除符数量、用途或宝石/装备适用等级不匹配');
          if (a.replacement) {
            if (!prefs.gems.inlay) return fail('自动镶嵌已关闭，保留原宝石');
            const gem = byId(a.replacement.bagId),
              inlay = gemCharm(s, 'inlay', gem),
              remaining = holes
                .filter((_, i) => i !== index && holes[i] > 0)
                .map((id) => gemTemplate(s, id));
            if (
              !gemUsable(s, gem) ||
              !types.includes(gem.itemTmpl.gemType) ||
              gem.itemTmpl.gemType !== old.gemType ||
              num(gem.itemTmpl.subType) !== num(old.subType) ||
              num(gem.itemTmpl.value) <= num(old.value) ||
              !inlay ||
              !materialSupports(inlay, '装备', level) ||
              !materialSupports(gem, '装备', level) ||
              remaining.some((g) => !g || g.gemType === gem.itemTmpl.gemType)
            )
              return fail('替换宝石、镶嵌符或后续镶嵌条件不足，保留原宝石');
          }
          return ok;
        }
      }
      if (a.type === 'SMITHY_ENHANCE') {
        const eq = equipment(payload.roleEquipId),
          level = num(template(eq).reqLevel),
          next = num(eq?.enhanceLevel) + 1;
        if (!eq || level <= 0 || !Number.isInteger(next) || next < 1 || next > 9)
          return fail('装备等级或强化目标无效');
        const id = level >= 40 ? 5051 : 5050;
        return array(s.bagItems).some(
          (b) => b.id === payload.materialBagId && materialId(b) === id && materialUsable(s, b) && materialSupports(b, '装备', level),
        )
          ? ok
          : fail('缺少该装备等级所需的可用强化精华');
      }
      if (a.type === 'SMITHY_SMELT_START') {
        const eq = equipment(payload.roleEquipId),
          quality = stats(eq?.appraisalStats);
        return eq &&
          num(template(eq).slotType) === 1 &&
          num(template(eq).reqLevel) >= 50 &&
          eq.isAppraisal &&
          num(quality.extScore) > 1500 &&
          num(quality.intScore) > 1500 &&
          (!eq.isEquipped || prefs.smithy.allowSmeltEquipped) &&
          !num(s.role.smeltingItemId)
          ? ok
          : fail('冶炼武器资质、等级、穿戴保护或冶炼状态不符合条件');
      }
      if (a.type === 'SMITHY_SMELT_INVEST' || a.type === 'SMITHY_SMELT_COMPLETE') {
        const remaining = num(s.role.smeltingTargetExp) - num(s.role.smeltingExp),
          amount = num(payload.expAmount);
        if (!num(s.role.smeltingItemId) || num(s.role.smeltingTargetExp) <= 0)
          return fail('当前没有已确认的神器冶炼项目');
        if (a.type === 'SMITHY_SMELT_COMPLETE')
          return remaining <= 0 ? ok : fail('当前冶炼经验尚未完成');
        return Number.isInteger(amount) && amount > 0 && amount <= remaining
          ? ok
          : fail('冶炼经验投入超出当前剩余需求');
      }
      if (a.type === 'SMITHY_REPAIR_ARTIFACT') {
        const section = byId(payload.sectionBagId),
          talisman = byId(payload.talismanBagId),
          id = materialId(section);
        return materialUsable(s, section) &&
          materialUsable(s, talisman) &&
          id >= 5032 &&
          id <= 5037 &&
          materialId(talisman) === id + 6
          ? ok
          : fail('神节与神符数量、使用等级或等级配对不符合条件');
      }
      if (a.type === 'SMITHY_FORGE' || a.type === 'SMITHY_FORGE_PREVIEW') {
        const section = byId(payload.sectionBagId),
          id = materialId(section);
        if (!materialUsable(s, section) || id < 5044 || id > 5049)
          return fail('没有可用的完整连戎神节');
        if (a.type === 'SMITHY_FORGE') {
          const entry = array(s.forgePreviews?.[num(section.id)]).find(
              (e) => num(e.id) === num(payload.targetArtifactId),
            ),
            t =
              entry?.tmpl ||
              entry?.equipTmpl ||
              lookup(s.allEquipTemplates, payload.targetArtifactId);
          if (
            !entry ||
            !t ||
            num(t.id) !== num(payload.targetArtifactId) ||
            num(t.reqLevel) <= 0 ||
            num(t.slotType) < 1 ||
            num(t.slotType) > 11
          )
            return fail('该神节当前打造预览中没有完整的目标神器数据');
        }
        return ok;
      }
      if (a.type === 'CRAFT_EQUIP') {
        const t = lookup(s.allEquipTemplates, payload.targetEquipTmplId),
          ids = tailorMaterialIds(payload.targetEquipTmplId);
        if (
          !t ||
          num(t.reqLevel) <= 0 ||
          num(t.reqLevel) > num(s.role.level) ||
          !ids.includes(num(payload.materialItemTmplId))
        )
          return fail('打造目标等级、材料类别或配方不匹配');
        const bag = materialBag(s, payload.materialItemTmplId);
        return bag && materialSupports(bag, '装备', num(t.reqLevel))
          ? ok
          : fail('打造材料数量、使用等级或装备适用范围不足');
      }
      if (a.type === 'YUCI_EXCHANGE') {
        const t = lookup(s.allEquipTemplates, payload.equipTmplId),
          index = EXCHANGE_SETS.findIndex((name) =>
            array(s.equipSets).some(
              (set) =>
                set.name === name &&
                array(parse(set.equipTmplIds, [])).map(num).includes(num(payload.equipTmplId)),
            ),
          );
        return t &&
          num(s.role.level) >= 10 &&
          num(t.reqLevel) > 0 &&
          num(t.reqLevel) <= num(s.role.level) &&
          index >= 0 &&
          materialCount(s, 5273 + index) >= 5 + index
          ? ok
          : fail('兑换目标、角色等级或对应万灵石数量不足');
      }
      if (a.type === 'BEAR_ENTER')
        return num(s.role.level) >= 30 && materialCount(s, 51002) > 0
          ? ok
          : fail('角色等级或除熊害令牌不足');
      if (a.type === 'SHOP_SELL' && payload.bagItemId != null) {
        const bag = byId(payload.bagItemId),
          count = num(payload.count);
        return Number.isInteger(count) &&
          count > 0 &&
          bagUsable(s, bag, count, false) &&
          prefs.sell.materialIds.map(num).includes(materialId(bag)) &&
          num(bag.itemTmpl.price) > 0
          ? ok
          : fail('出售材料需明确允许，且当前数量和价格可确认');
      }
      if (a.type === 'USE_ITEM')
        return bagUsable(s, byId(payload.bagItemId), num(payload.count, 1)) &&
          num(payload.count, 1) > 0 &&
          Number.isInteger(num(payload.count, 1))
          ? ok
          : fail('物品数量或使用等级不符合条件');
      return ok;
    }
    const roleMap = (s) => array(s.maps).find((m) => num(m.id) === num(s.role?.mapId));
    const costs = (m) => array(m.costs || parse(m.costConfig, []));
    const monsters = (m) => array(m.monsters || parse(m.monsterConfig, []));
    const npcs = (m) => array(parse(m?.npcs, []));
    function townFor(s, npc) {
      if ([NPC.arena, NPC.trial].includes(npc))
        return array(s.maps).find((m) => num(m.id) === 4 &&
          num(m.reqLevel) <= num(s.role.level)) || null;
      const all = array(s.maps).filter(
        (m) =>
          num(m.mapType) === 1 &&
          m.show !== false &&
          num(m.reqLevel) <= num(s.role.level) &&
          (!npc ||
            npcs(m).some(
              (n) => n.id === npc || (npc === NPC.tailor && String(n.name).includes('裁缝')),
            )),
      );
      return (
        all.find((m) => num(m.id) === num(s.role.mapId)) ||
        all.sort((a, b) => num(a.id) - num(b.id))[0] ||
        null
      );
    }
    function farmMap(map) {
      return !!map && num(map.mapType) !== 1 && map.show !== false &&
        costs(map).length === 0 && monsters(map).length > 0 &&
        ![20050, 20051, 20052, 20060, 20061, 20070].includes(num(map.id));
    }
    function poolMaps(s) {
      return array(s.maps).filter((m) => farmMap(m) && num(m.reqLevel) <= num(s.role?.level))
        .sort((a, b) => num(b.reqLevel) - num(a.reqLevel) || num(a.id) - num(b.id)).slice(0, 6);
    }
    function scoreTargets(s, p, lastMap) {
      const templates = s.monsterTemplates || new Map();
      const maps = p.gear.targets === 'map' ? [] : poolMaps(s).filter((m) =>
        array(m.monsters).length && m.monsters.every((v) => templates.has('MONSTER:' + v.monsterId)));
      if (!maps.length) return { source: lastMap.length ? 'map' : 'none',
        mapIds: lastMap.length ? [s.lastMapId] : [], list: lastMap };
      return { source: 'pool', mapIds: maps.map((m) => m.id), list: maps.flatMap((m) => {
        const total = m.monsters.reduce((n, v) => n + num(v.count), 0);
        return m.monsters.map((v) => ({ ...templates.get('MONSTER:' + v.monsterId),
          weight: num(v.count) / total / maps.length }));
      }) };
    }
    const SUSTAIN_LINE = 0.5, LOW_HP_SHARE = 0.05, HP_LINE = 0.35;
    function survivalWeight(totals, healPerSecond) {
      if (!totals || totals.battle < 1800000 || !Number.isFinite(healPerSecond) || healPerSecond <= 0) return null;
      const clamp = (v) => Math.max(0, Math.min(1, v));
      const hours = totals.battle / 3600000, deaths = num(totals.deaths);
      const count = num(totals.hpPotions) + num(totals.mpPotions);
      const income = num(totals.gold) + num(totals.sell);
      const share = count && income ? clamp(num(totals.potion) * num(totals.hpPotions) / count / income) : 0;
      const ratio = clamp(num(totals.hpLost) / (totals.battle / 1000) / healPerSecond);
      const low = num(totals.low) / totals.battle;
      const danger = Math.max(clamp((ratio - SUSTAIN_LINE) / (1 - SUSTAIN_LINE)), clamp(low / LOW_HP_SHARE), deaths > 0 ? 0.5 : 0);
      return { weight: Math.round(clamp(share + danger) * 100) / 100,
        share, ratio, low, deaths, hours, danger, safe: danger === 0 };
    }
    function healPerSecond(s) {
      return potionEffect(potionChoices(s, 'HP')[0], 'HP') / 3;
    }
    function scoringStatus(s, p) {
      const survival = s?.survival || null;
      const auto = !!p.gear.autoDefense && Number.isFinite(survival?.weight);
      const source = s?.scoreTargets?.source || 'none', mapIds = s?.scoreTargets?.mapIds || [];
      return { source, mapIds, mapNames: mapIds.map((id) => array(s.maps).find((m) => num(m.id) === num(id))?.name || String(id)),
        weight: auto ? survival.weight : p.gear.defenseWeight, auto, survival, autoDefense: p.gear.autoDefense };
    }
    function scoringText(s) {
      const target = s.source === 'pool' ? s.mapNames.join('、') :
        s.source === 'map' ? '最近挂机地图 ' + s.mapNames.join('、') : '等待怪物数据';
      const percent = (v) => (v * 100).toFixed(v * 100 < 10 ? 1 : 0);
      const v = s.survival;
      const detail = s.auto ? '自动·' + (v.safe ? '安全' : '吃紧') + '：药费占收入 ' + percent(v.share) + '%，掉血占回血能力 ' +
        percent(v.ratio) + '%，低血量时间 ' + percent(v.low || 0) + '%，近 ' + v.hours.toFixed(1) + ' 战斗小时' + (v.deaths > 0 ? '，有阵亡' : '') :
        s.autoDefense ? '数据不足，用手动值' : '手动';
      return '评分参照：' + target + ' · 生存权重 ' + s.weight + '（' + detail + '）';
    }
    function normalMap(s, prefs, penalty = 0) {
      const eligible = array(s.maps).filter(
        (m) =>
          farmMap(m) && num(m.reqLevel) <= num(s.role.level),
      );
      if (prefs.battle.mapId)
        return eligible.find((m) => num(m.id) === num(prefs.battle.mapId)) || null;
      const level = Math.max(1, num(s.role.level) - prefs.battle.levelOffset - penalty);
      return (
        eligible
          .filter((m) => num(m.reqLevel) <= level)
          .sort((a, b) => num(b.reqLevel) - num(a.reqLevel) || num(a.id) - num(b.id))[0] ||
        eligible.sort((a, b) => num(a.reqLevel) - num(b.reqLevel))[0] ||
        null
      );
    }
    function potionEffect(item, attr) {
      return array(parse(item?.useEffect || item?.use_effect, []))
        .filter((e) => e.type === 'HEAL' && e.attr === attr)
        .reduce((n, e) => n + num(e.value), 0);
    }
    function potionChoices(s, attr) {
      const templates = new Map(array(s.potionTemplates).map((t) => [num(t.id), t]));
      for (const b of array(s.bagItems)) if (b.itemTmpl) templates.set(num(b.itemId), b.itemTmpl);
      return [...templates.values()]
        .filter((t) => num(t.reqLevel) <= num(s.role.level) && potionEffect(t, attr) > 0)
        .sort((a, b) => potionEffect(b, attr) - potionEffect(a, attr));
    }
    function potionOrder(list, attr, s, p) {
      const heal = (t) => potionEffect(t, attr),
        strong = [...list].sort((a, b) => heal(b) - heal(a));
      if (p.potions.order === 'strong') return strong;
      if (p.potions.order === 'weak') return strong.reverse();
      // fit: smallest potion that refills the gap at the trigger threshold first,
      // then the weaker ones strongest-first as fallback when stock runs out.
      const max = num(s.maxAttrs?.[attr === 'HP' ? 'hp' : 'mp']),
        threshold = attr === 'HP' ? p.potions.hpThreshold : p.potions.mpThreshold,
        gap = (max * (100 - threshold)) / 100;
      if (!(gap > 0)) return strong;
      const enough = strong.filter((t) => heal(t) >= gap).reverse(),
        short = strong.filter((t) => heal(t) < gap);
      return enough.concat(short);
    }
    function potionPick(s, p, attr, now = Date.now()) {
      const key = attr === 'HP' ? 'hp' : 'mp';
      if (p.potions.order !== 'smart' || !p.potions.autoChoose || p.potions[key + 'Priority'].length) return null;
      const candidates = potionChoices(s, attr).flatMap((template) => {
        const offer = array(s.shopItems).find((i) => num(i.itemId) === num(template.id) &&
          (i.currencyType == null || num(i.currencyType) === 1) && num(i.price) > 0);
        const heal = potionEffect(template, attr);
        return offer ? [{ template, perSecond: heal / 3, efficiency: heal / num(offer.price) }] : [];
      });
      if (!candidates.length) return null;
      const rates = s.combat, strongest = candidates[0], need = num(rates?.[attr === 'HP' ? 'hpLossPerSec' : 'mpUsePerSec']);
      const result = (c, reason) => ({ template: c.template, need, perSecond: c.perSecond, reason });
      if (!rates || rates.mapId !== s.role.mapId || rates.seconds < 120) return result(strongest, '数据不足');
      if (attr === 'HP' && ((rates.lastLowHpAt > 0 && now - rates.lastLowHpAt < 600000) ||
        (rates.lastDeathAt > 0 && now - rates.lastDeathAt < 1800000))) return result(strongest, '血量过低或刚阵亡，改用最强药');
      const best = candidates.filter((c) => c.perSecond >= 1.25 * need)
        .sort((a, b) => b.efficiency - a.efficiency || b.perSecond - a.perSecond)[0] || strongest;
      const current = candidates.find((c) => num(c.template.id) === num(parse(s.role.settings, {})[key]?.priority?.[0]));
      return result(current && current.perSecond >= 1.05 * need && current.efficiency >= best.efficiency ? current : best, '按实测消耗选择');
    }
    function potionThreshold(s, p, now = Date.now()) {
      const rates = s.combat, configured = p.potions.hpThreshold;
      if (!p.potions.autoThreshold || !rates || rates.mapId !== s.role.mapId || rates.seconds < 120) return configured;
      const hp = parse(s.role.settings, {}).hp || {}, pick = potionPick(s, p, 'HP', now);
      const template = pick?.template || array(hp.priority).map((id) => potionChoices(s, 'HP').find((t) => num(t.id) === num(id) && countItem(s, id) > 0)).find(Boolean);
      const healPct = rates.maxHp > 0 ? potionEffect(template, 'HP') / rates.maxHp * 100 : 0;
      const needed = rates.lastDeathAt > 0 && now - rates.lastDeathAt < 1800000 ? 80 : Math.ceil((2 * rates.worstLoss10Pct - 3 * healPct + 10) / 5) * 5;
      const target = Math.min(80, Math.max(10, configured, needed));
      return hp.threshold >= target && hp.threshold <= target + 10 && hp.threshold >= configured ? hp.threshold : target;
    }
    function potionSettings(s, p, now = Date.now()) {
      const make = (attr) => {
        const explicit = attr === 'HP' ? p.potions.hpPriority : p.potions.mpPriority,
          eligible = new Set(potionChoices(s, attr).map((t) => num(t.id)));
        const pick = potionPick(s, p, attr, now);
        const selected = pick ? [pick.template, ...potionChoices(s, attr)].filter((t) => countItem(s, t.id) > 0).map((t) => num(t.id)) : explicit.length
          ? explicit
          : p.potions.autoChoose
            ? potionOrder(
                potionChoices(s, attr).filter((t) => countItem(s, t.id) > 0),
                attr,
                s,
                p,
              ).map((t) => num(t.id))
            : parse(s.role.settings, {})[attr === 'HP' ? 'hp' : 'mp']?.priority || [];
        return [...new Set(selected.map((v) => num(v)).filter((v) => v > 0 && eligible.has(v)))]
          .slice(0, 6)
          .concat(Array(6).fill(0))
          .slice(0, 6);
      };
      return {
        hp: { enabled: p.potions.enabled, threshold: potionThreshold(s, p, now), priority: make('HP') },
        mp: { enabled: p.potions.enabled, threshold: p.potions.mpThreshold, priority: make('MP') },
      };
    }
    function skillCost(skill) {
      const t = skill.skillDetail || {},
        level = num(skill.currentLevel),
        grow = Math.max(0, level - 1);
      let exp = num(t.baseUpgradeExpCost) + grow * num(t.growExpCost);
      const entry = array(parse(t.expCost, [])).find((e) => num(e.skill_level) === level);
      if (entry && entry.exp != null) exp = num(entry.exp);
      return {
        exp: Math.max(0, exp),
        money: Math.max(0, num(t.baseUpgradeMoneyCost) + grow * num(t.growMoneyCost)),
      };
    }
    function freshLedger(day) {
      return {
        day,
        money: 0,
        exp: 0,
        expAccountingVersion: 2,
        levelExp: 0,
        skillExp: 0,
        smeltExp: 0,
        unclassifiedExp: 0,
        ops: {},
        arena: { attempts: 0, lost: [] },
        activities: { zl: 0, camp: 0, bear: 0 },
        tianlingUsedAt: 0,
        petHatched: [],
        keptEquipIds: [],
      };
    }
    function normalizeLedger(value, day) {
      const source = value && typeof value === 'object' ? clone(value) : freshLedger(day),
        out = { ...freshLedger(day), ...source };
      if (source.expAccountingVersion !== 2) {
        out.levelExp = 0;
        out.skillExp = 0;
        out.smeltExp = 0;
        out.unclassifiedExp = Math.max(0, num(source.exp));
      }
      out.expAccountingVersion = 2;
      for (const key of ['money', 'exp', 'levelExp', 'skillExp', 'smeltExp', 'unclassifiedExp'])
        out[key] = Math.max(0, num(out[key]));
      out.exp = Math.max(out.exp, out.levelExp + out.skillExp + out.smeltExp + out.unclassifiedExp);
      out.ops = out.ops || {};
      out.activities = { zl: 0, camp: 0, bear: 0, ...out.activities };
      out.arena = { attempts: 0, lost: [], ...out.arena };
      out.petHatched = array(out.petHatched);
      out.keptEquipIds = array(out.keptEquipIds);
      return out;
    }
    function experienceCategory(type) {
      return (
        { LEVEL_UP: 'levelExp', UPGRADE_SKILL: 'skillExp', SMITHY_SMELT_INVEST: 'smeltExp' }[
          type
        ] || 'unclassifiedExp'
      );
    }
    function recordExperience(ledger, type, amount) {
      if (ledger.expAccountingVersion !== 2)
        Object.assign(ledger, normalizeLedger(ledger, ledger.day));
      const exp = Math.max(0, num(amount)),
        key = experienceCategory(type);
      ledger.exp = num(ledger.exp) + exp;
      ledger[key] = num(ledger[key]) + exp;
    }
    function experienceBudget(p, ledger, kind) {
      const current = ledger?.expAccountingVersion === 2,
        old = Math.max(0, num(current ? ledger.unclassifiedExp : ledger?.exp));
      const used =
        old + Math.max(0, num(current ? ledger[kind === 'smelt' ? 'smeltExp' : 'skillExp'] : 0));
      const limit = num(p.budget[kind === 'smelt' ? 'smeltExpPerDay' : 'skillExpPerDay']);
      // 0 means unlimited.
      if (limit <= 0) return { used, limit: 0, unlimited: true, remaining: Infinity };
      return { used, limit, remaining: Math.max(0, limit - used) };
    }
    function levelProgress(s, prefs, ledger) {
      if (!s?.role || !num(s.role.id)) return null;
      const p = config(prefs),
        role = s.role,
        level = num(role.level),
        currentExp = num(role.currentExp);
      const tmpl =
          lookup(s.levelTmpls, level) || array(s.levelTmpls).find((t) => num(t.level) === level),
        requiredExp = num(tmpl?.upgradeExp);
      const availableExp = Math.max(0, currentExp - p.budget.expReserve);
      const result = {
        currentLevel: level,
        nextLevel: level + 1,
        currentExp,
        requiredExp,
        availableExp,
        dailyLimit: false,
      };
      const done = (code, reason, ready = false) => ({ ...result, code, reason, ready }),
        fmt = (n) => num(n).toLocaleString('zh-CN');
      if (!p.growth.level) return done('disabled', '自动升级人物已关闭');
      if (level >= p.growth.maxLevel)
        return done('target', '人物已达到目标 ' + fmt(p.growth.maxLevel) + ' 级');
      if (requiredExp <= 0) return done('template', '等待当前等级的升级经验数据');
      if (availableExp < requiredExp)
        return currentExp >= requiredExp
          ? done(
              'exp-reserve',
              '升级需 ' + fmt(requiredExp) + ' 经验；扣除保留经验后可用 ' + fmt(availableExp),
            )
          : done('exp', '升级需 ' + fmt(requiredExp) + ' 经验；当前持有 ' + fmt(currentExp));
      return done(
        'ready',
        '升 ' + fmt(level + 1) + ' 级需 ' + fmt(requiredExp) + ' 经验，升级条件已满足',
        true,
      );
    }
    function budgetBlock(a, s, p, ledger) {
      const money = Math.max(0, num(a.moneyCost)),
        exp = Math.max(0, num(a.expCost)),
        fmt = (n) => Math.floor(num(n)).toLocaleString('zh-CN');
      if (money > 0) {
        const spare = Math.max(0, num(s.role.money) - p.budget.moneyReserve);
        if (money > spare)
          return {
            code: 'money-reserve',
            reason: '需 ' + fmt(money) + ' 金币；扣除保留金币后可用 ' + fmt(spare),
          };
        const left =
          p.budget.moneyPerDay > 0 ? Math.max(0, p.budget.moneyPerDay - num(ledger.money)) : Infinity;
        if (money > left)
          return {
            code: 'money-daily',
            reason: '需 ' + fmt(money) + ' 金币；今日金币预算仅剩 ' + fmt(left),
          };
      }
      if (a.type === 'PET_COMMAND' && a.payload.action === 'feed')
        return num(s.role.currentExp) - exp >= p.pets.feedKeepExp ? null :
          { code: 'exp', reason: '喂养后经验不足保留额度' };
      if (a.type === 'TRIAL_COMMAND' && a.payload.action === 'feed')
        return num(s.role.currentExp) - exp >= p.hidden.keepExp ? null :
          { code: 'exp', reason: '喂养后经验不足保留额度' };
      if (exp > 0) {
        const spare = Math.max(0, num(s.role.currentExp) - p.budget.expReserve);
        if (exp > spare)
          return {
            code: 'exp',
            reason: '需 ' + fmt(exp) + ' 经验；当前可用 ' + fmt(spare),
          };
        if (a.type !== 'LEVEL_UP') {
          const key = experienceCategory(a.type),
            kinds =
              key === 'skillExp' ? ['skill'] : key === 'smeltExp' ? ['smelt'] : ['skill', 'smelt'];
          for (const kind of kinds) {
            const left = experienceBudget(p, ledger, kind).remaining;
            if (exp > left)
              return {
                code: kind + '-daily',
                reason:
                  '需 ' +
                  fmt(exp) +
                  ' 经验；今日' +
                  (kind === 'smelt' ? '冶炼' : '技能') +
                  '经验额度仅剩 ' +
                  fmt(left),
              };
          }
        }
      }
      return null;
    }
    function allowed(a, s, p, ledger) {
      if (a.readOnly) return true;
      if (budgetBlock(a, s, p, ledger)) return false;
      const cap = {
        sell: p.sell.maxPerDay,
        gem: p.gems.maxPerDay,
        smithy: p.smithy.maxPerDay,
        craft: p.craft.maxPerDay,
      }[a.family];
      // 0 means unlimited.
      return cap == null || cap <= 0 || num(ledger.ops[a.family]) < cap;
    }
    function skillCandidates(s, p) {
      const level = num(s.role?.level);
      return array(s.skills)
        .filter(
          (sk) =>
            sk.skillDetail &&
            level >= num(sk.skillDetail.unlockLevel) &&
            num(sk.currentLevel) < Math.min(num(sk.skillDetail.maxLevel), p.growth.maxSkillLevel),
        )
        .sort((a, b) => {
          const ai = p.growth.skillPriority.indexOf(num(a.skillDetail.id)),
            bi = p.growth.skillPriority.indexOf(num(b.skillDetail.id));
          return (
            (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) ||
            num(a.currentLevel) - num(b.currentLevel) ||
            skillCost(a).exp - skillCost(b).exp
          );
        });
    }
    function skillAction(sk) {
      const cost = skillCost(sk);
      return action(
        'UPGRADE_SKILL',
        { roleSkillId: num(sk.id) },
        '升级技能「' + sk.skillDetail.name + '」',
        'growth',
        { moneyCost: cost.money, expCost: cost.expCost || cost.exp, inBattle: true },
      );
    }
    function skillProgress(s, prefs, ledger) {
      if (!s?.role || !num(s.role.id) || !ledger) return null;
      const p = config(prefs);
      const done = (code, reason, ready = false, skill = null) => ({ code, reason, ready, skill });
      if (!p.growth.skills) return done('disabled', '自动升级技能已关闭');
      if (!array(s.skills).length) return done('data', '等待技能数据');
      const list = skillCandidates(s, p);
      if (!list.length)
        return done(
          'target',
          '已解锁技能均达上限（目标 ' + p.growth.maxSkillLevel + ' 级），或尚未到解锁等级',
        );
      for (const sk of list)
        if (!budgetBlock(skillAction(sk), s, p, ledger)) {
          const c = skillCost(sk);
          return done(
            'ready',
            '技能「' +
              sk.skillDetail.name +
              '」Lv.' +
              num(sk.currentLevel) +
              ' 可升级（' +
              num(c.exp).toLocaleString('zh-CN') +
              ' 经验 · ' +
              num(c.money).toLocaleString('zh-CN') +
              ' 金币）',
            true,
            num(sk.id),
          );
        }
      const top = list[0],
        block = budgetBlock(skillAction(top), s, p, ledger);
      return done(
        block.code,
        '技能「' + top.skillDetail.name + '」Lv.' + num(top.currentLevel) + ' 暂不能升级：' + block.reason,
      );
    }
    function action(type, payload, label, family, options = {}) {
      return {
        kind: 'request',
        type,
        payload,
        label,
        family,
        moneyCost: 0,
        expCost: 0,
        readOnly: false,
        requiresTown: false,
        ...options,
        key: type + ':' + JSON.stringify(payload),
      };
    }
    function petScreenable(entry, state) {
      const pet = entry?.pet;
      return !!pet && pet.status === 'OWNED' && pet.form === 'BABY' &&
        pet.level === 1 && pet.rootRank === 0 && pet.learned === 0 &&
        !pet.locked && pet.id !== state.activePetId && Number.isFinite(entry.average);
    }
    function petEggs(s) {
      return array(s.bagItems).filter((item) => num(item.count) > 0 &&
        String(item.itemTmpl?.useEffect || '').includes('HATCH_PET'));
    }
    function arenaRush(prefs, now = Date.now()) {
      // Ranks settle at 00:00 UTC+8.
      const left = 86400000 - (now + 28800000) % 86400000;
      const arena = prefs?.arena;
      return !!(arena && arena.enabled && arena.challenge && arena.rushMinutes > 0 &&
        left <= arena.rushMinutes * 60000);
    }
    function plans(s, prefs, ledger, now = Date.now()) {
      const p = config(prefs),
        out = [];
      if (!s?.role || !num(s.role.id)) return out;
      const add = (a) => {
        if (allowed(a, s, p, ledger) && materialCheck(a, s, p).ok) {
          out.push(a);
          return true;
        }
        return false;
      };
      const role = s.role,
        equipped = array(s.equipments).filter((e) => !!e.isEquipped);
      const pool = poolMaps(s);
      if (p.gear.scoring === 'combat' && p.gear.targets === 'pool' && pool.length &&
          // A monster the server does not return must not cause a request on every tick.
          (now - num(s.monsterTemplatesAt) > 86400000 || (now - num(s.monsterTemplatesAt) > 1800000 && pool.some((m) =>
            m.monsters.some((v) => !s.monsterTemplates?.has('MONSTER:' + v.monsterId)))))) {
        const ids = [...new Set(pool.flatMap((m) => m.monsters.map((v) => v.monsterId)))];
        add(action('GET_MONSTER_TMPL', { refs: ids.map((id) => ({ id, category: 'MONSTER' })) },
          '读取怪物属性', 'read', { readOnly: true }));
      }
      if ((p.potions.enabled || p.gear.scoring === 'combat' && p.gear.autoDefense) && !array(s.potionTemplates).length)
        add(action('GET_POTION_LIST', {}, '获取药品目录', 'read', { readOnly: true }));
      if (p.potions.enabled) {
        const setting = potionSettings(s, p, now);
        const current = parse(role.settings, null);
        if (
          !current || typeof current !== 'object' || Array.isArray(current) ||
          !['hp', 'mp'].every((k) => {
            const a = current[k], b = setting[k];
            return a && typeof a === 'object' && !Array.isArray(a) &&
              a.enabled === b.enabled && a.threshold === b.threshold &&
              Array.isArray(a.priority) && a.priority.length === b.priority.length &&
              b.priority.every((v, i) => a.priority[i] === v);
          })
        )
          add(
            action(
              'UPDATE_SETTINGS',
              { settings: JSON.stringify(setting) },
              '配置内置自动回复',
              'settings',
              { noResponse: true, setting },
            ),
          );
      }
      if (p.activities.enabled) {
        const state = s.activityStatus || {},
          doubleExp = parse(role.settings, null)?.doubleExp;
        // doubleExp.lastClaim is the date of the last claim; once it is today nothing is asked.
        if (p.activities.tianlingClaim && doubleExp?.lastClaim !== ledger.day) {
          if (!state.wushuang)
            add(action('WUSHUANG_STATUS', {}, '查询天灵丹领取状态', 'read', { readOnly: true }));
          else if (!state.wushuang.claimedToday)
            add(action('WUSHUANG_CLAIM', {}, '领取今日天灵丹', 'activity', {
              requiresTown: true,
              npc: NPC.wushuang,
            }));
        }
        if (p.activities.tianlingUse && p.battle.enabled &&
            num(doubleExp?.buffExpireTime) <= now &&
            now - num(ledger.tianlingUsedAt) >= 7200000) {
          const stacks = array(s.bagItems).filter((item) => materialId(item) === 51003 && bagUsable(s, item));
          const pill = stacks.find((item) => !!item.isBound) || stacks[0];
          if (pill)
            add(action('USE_ITEM', { bagItemId: pill.id, count: 1 },
              '使用天灵丹（双倍经验 2 小时）', 'activity', { doubleExp: true }));
        }
        if (p.activities.lotteryDraw && townFor(s, NPC.lottery)) {
          if (!s.lottery || now - s.lottery.at > 600000)
            add(action('ONLINE_LOTTERY_COMMAND', { action: 'open', page: 0 }, '查询在线抽奖次数', 'read', {
              readOnly: true, responseType: 'ONLINE_LOTTERY_RESPONSE',
            }));
          // One chance arrives per 30 minutes online and a draw needs a town trip, so chances
          // are drawn in batches. The game rules keep an unused balance across days.
          else if (s.lottery.enabled && num(s.lottery.balance) > 0 && !arenaRush(p, now) &&
              (num(s.lottery.balance) >= p.activities.lotteryBatch ||
                (num(s.lottery.dailyLimit) > 0 &&
                  num(s.lottery.grantedToday) >= num(s.lottery.dailyLimit)) ||
                num(role.mapId) === num(townFor(s, NPC.lottery).id)))
            add(action('ONLINE_LOTTERY_COMMAND', { action: 'draw' },
              '快活叁在线抽奖（剩余 ' + s.lottery.balance + ' 次）', 'activity', {
                requiresTown: true, npc: NPC.lottery, responseType: 'ONLINE_LOTTERY_RESPONSE',
              }));
        }
        if (
          p.activities.zl &&
          num(role.level) >= 15 &&
          num(ledger.activities.zl) < p.activities.zlRuns
        ) {
          if (!state.zl)
            add(action('ZL_STATUS', {}, '查询珍珑棋局资格', 'read', { readOnly: true }));
          else {
            if (!state.zl.claimedToday)
              add(
                action('ZL_CLAIM_TOKEN', {}, '领取珍珑棋局令牌', 'activity', {
                  requiresTown: true,
                  npc: NPC.zl,
                }),
              );
            if (num(state.zl.tokenCount) > 0)
              add(
                action('ZL_ENTER', {}, '进入珍珑棋局', 'activity', {
                  requiresTown: true,
                  npc: NPC.zl,
                  activity: 'zl',
                }),
              );
          }
        }
        if (
          p.activities.camp &&
          num(role.level) >= 30 &&
          num(ledger.activities.camp) < p.activities.campRuns
        ) {
          if (!state.camp)
            add(action('CAMP_STATUS', {}, '查询伪宋军挑战次数', 'read', { readOnly: true }));
          else if (num(state.camp.remainingToday) > 0)
            add(
              action('CAMP_ENTER', {}, '进入伪宋军领地', 'activity', {
                requiresTown: true,
                npc: NPC.camp,
                activity: 'camp',
              }),
            );
        }
        if (
          p.activities.bear &&
          num(role.level) >= 30 &&
          num(ledger.activities.bear) < p.activities.bearRuns &&
          countItem(s, 51002) > 0
        )
          add(
            action('BEAR_ENTER', {}, '消耗除熊害令牌进入熊林', 'activity', {
              requiresTown: true,
              npc: NPC.camp,
              activity: 'bear',
            }),
          );
      }
      const growth = [],
        progress = levelProgress(s, p, ledger);
      if (progress?.ready)
        growth.push(
          action('LEVEL_UP', {}, '人物升级到 ' + progress.nextLevel + ' 级', 'growth', {
            expCost: progress.requiredExp,
            inBattle: true,
          }),
        );
      if (p.growth.skills) {
        for (const sk of skillCandidates(s, p)) {
          const a = skillAction(sk);
          if (allowed(a, s, p, ledger)) {
            p.growth.skillBeforeLevel ? growth.unshift(a) : growth.push(a);
            break;
          }
        }
      }
      growth.forEach(add);
      if (p.pets.enabled) {
        const state = s.pets, entries = array(state?.pets);
        const request = (name, payload = {}, options = {}) =>
          action('PET_COMMAND', { action: name, petId: '', ...payload },
            '珍兽：' + name, 'pet', { responseType: 'PET_RESPONSE', ...options });
        // Hatching diffs the pet list before and after, so it needs a list read moments ago.
        const hatchWanted = !!state && p.pets.hatch && !array(ledger.petHatched).length &&
          entries.length + num(state.reserved) < state.capacity &&
          petEggs(s).some((item) => p.pets.hatchMutant ||
            !String(item.itemTmpl.name).includes('变异'));
        if (!state || now - state.at >= p.pets.refreshMinutes * 60000 ||
            (hatchWanted && now - state.at >= 30000))
          add(request('list', {}, { readOnly: true, inBattle: true }));
        else if (![20050, 20051, 20052, 20070].includes(num(role.mapId)) &&
            !s.trial?.run && !s.arenaMatch?.active) {
          const pending = entries.find((entry) => array(ledger.petHatched).includes(entry.pet.id) &&
            petScreenable(entry, state));
          const active = entries.find((entry) => entry.pet.id === state.activePetId);
          const best = entries.filter((entry) => entry.pet.status === 'OWNED')
            .sort((a, b) => num(b.combatPower) - num(a.combatPower))[0];
          const egg = petEggs(s).find((item) => p.pets.hatchMutant ||
            !String(item.itemTmpl.name).includes('变异'));
          const cost = num(active?.nextExp) - num(active?.pet.exp);
          if (pending) {
            const keep = pending.average >= p.pets.keepMinAverage;
            add(request(keep ? 'lock' : 'release', { petId: pending.pet.id,
              ...(keep ? { locked: true } : { confirm: true }) }, {
              label: (keep ? '锁定' : '放生') + '珍兽「' + pending.pet.name +
                '」（资质均值 ' + pending.average + '）' }));
          } else if (p.pets.claim && state.pendingRewards > 0) add(request('claimRewards'));
          else if (p.pets.summon && !state.activePetId && best)
            add(request('summon', { petId: best.pet.id, active: true }));
          else if (p.pets.hatch && !array(ledger.petHatched).length && egg &&
              entries.length + num(state.reserved) < state.capacity)
            add(action('USE_ITEM', { bagItemId: egg.id, count: 1 },
              '孵化「' + egg.itemTmpl.name + '」', 'pet', { petHatch: true }));
          else if (p.pets.feed && active && active.pet.level < role.level && cost > 0 &&
              num(role.currentExp) - cost >= p.pets.feedKeepExp)
            add(request('feed', { petId: active.pet.id, mode: 'one' }, { expCost: cost }));
        }
      }
      if (num(role.level) >= 30) {
        const arena = s.arena, board = arena?.board, trial = s.trial;
        const townSafe = ![20050, 20051, 20052, 20070].includes(num(role.mapId)) && !trial?.run;
        const arenaAction = (name, payload = {}, options = {}) =>
          action('ARENA_COMMAND', { action: name, nearby: false, page: 0, token: '',
            ...payload }, '比武：' + name, 'arena', {
            responseType: 'ARENA_RESPONSE', ...options,
          });
        if (p.arena.enabled) {
          const rush = arenaRush(p, now);
          if (!board || now - arena.at >= (rush ? 30000 : p.arena.refreshMinutes * 60000) ||
              board.date !== ledger.day) {
            // Rank-based paging is unverified in the live game.
            const page = num(board?.ownRank) > 21 ? Math.floor((board.ownRank - 2) / 20) : 0;
            add(arenaAction('list', { page }, { readOnly: true, inBattle: true }));
          } else {
            const row = array(board.rows).find((r) => r.canLike);
            if (p.arena.like && !board.liked && row)
              add(arenaAction('like', { targetId: row.roleId, date: board.date }, { inBattle: true }));
            const daily = ledger.arena || { attempts: 0, lost: [] };
            // The server accepts a claim only from the NPC dialog, with the token of `open`.
            if (townSafe && board.eligible !== false && !daily.claimFailed && p.arena.claim &&
                num(board.reward?.count) > 0 && !board.reward.claimed) {
              const ready = arena.token && now - arena.tokenAt < 60000;
              add(arenaAction(ready ? 'claim' : 'open', {
                nearby: true, ...(ready ? { token: arena.token, date: board.date } : {}),
              }, { requiresTown: true, npc: NPC.arena }));
            }
            const target = array(board.rows).filter((r) => r.canChallenge && !r.busy &&
              num(r.combatPower) <= num(s.combatPower) * p.arena.maxPowerRatio &&
              !daily.lost.includes(r.snapshotId)).sort((a, b) => a.rank - b.rank)[0];
            if (townSafe && board.eligible !== false && p.arena.challenge &&
                !s.arenaMatch?.active && target &&
                (rush || !p.arena.maxPerDay || daily.attempts < p.arena.maxPerDay)) {
              const ready = arena.token && now - arena.tokenAt < 60000;
              add(arenaAction(ready ? 'challenge' : 'open', {
                nearby: true, ...(ready ? { token: arena.token, targetId: target.roleId,
                  snapshotId: target.snapshotId } : {}),
              }, { requiresTown: true, npc: NPC.arena, arenaTarget: target }));
            }
          }
        }
        if (num(role.level) >= 50 && p.hidden.enabled) {
          const request = (name, payload = {}, options = {}) =>
            action('TRIAL_COMMAND', { action: name,
              ...(trial ? { revision: trial.revision } : {}), ...payload },
            '暗器：' + name, 'trial', { responseType: 'TRIAL_RESPONSE', ...options });
          if (!trial || now - trial.at >= (trial.run ? 60000 : p.hidden.refreshMinutes * 60000))
            add(request('status', {}, { readOnly: true, inBattle: true }));
          else if (townSafe && trial.weapon && !trial.run) {
            const w = trial.weapon, balances = trial.balances || {};
            const opts = { requiresTown: true, npc: NPC.trial };
            if (p.hidden.inbox && Object.keys(trial.inbox || {}).length)
              add(request('inbox', {}, opts));
            else if (p.hidden.washQuality && num(balances.jade) >= 1 && w.quality < 100)
              add(request('washQuality', {}, opts));
            else {
              const weights = gearWeights(s, p), caps = [10000, 1500, 1500, 750, 15, 100]; // game client of 2026-11-14
              const names = ['hp', 'extAtk', 'intAtk', 'precision', 'critRate', w.element + 'Atk'];
              const indices = array(w.rolls).map((roll, index) => ({ roll, index }))
                .filter((v) => v.roll < 100).sort((a, b) =>
                  num(weights[names[b.index]]) * caps[b.index] -
                  num(weights[names[a.index]]) * caps[a.index]);
              if (p.hidden.wash && num(balances.sand) >= 5 && indices.length)
                add(request('washAttribute', { index: indices[0].index }, opts));
              else {
                const cost = num(trial.nextLevelExp) - num(w.experience);
                if (p.hidden.feed && trial.level < p.hidden.maxLevel && cost > 0 &&
                    num(role.currentExp) - cost >= p.hidden.keepExp)
                  add(request('feed', { targetLevel: trial.level + 1 }, { ...opts, expCost: cost }));
              }
            }
          }
        }
      }

      let gearChosenId = null;
      const warehouseSetIds = setTemplateIds(s);
      if (p.gear.enabled) {
        const candidatesFrom = (items) => array(items)
          .filter(
            (e) =>
              !e.isEquipped &&
              e.equipTmpl &&
              num(e.equipTmpl.reqLevel) <= num(role.level) &&
              num(e.equipTmpl.slotType) > 0 &&
              (!(!e.isBound && num(e.equipTmpl.bindOnEquip) === 1) || p.gear.allowBinding),
          )
          .map((e) => ({ eq: e, gain: projectedGain(e, s, p) }))
          .filter((v) => v.gain.gain > 0 && v.gain.percent >= p.gear.minGainPercent)
          .sort((a, b) => b.gain.gain - a.gain.gain);
        const candidates = candidatesFrom(s.equipments);
        const warehouseCandidates = p.gear.fromWarehouse ? candidatesFrom(s.warehouseEquips) : [];
        const warehouseBest = warehouseCandidates[0];
        if (warehouseBest && (!candidates[0] || warehouseBest.gain.gain > candidates[0].gain.gain)) {
          add(
            action(
              'WAREHOUSE_WITHDRAW',
              { roleEquipId: num(warehouseBest.eq.id) },
              '从仓库取出「' + template(warehouseBest.eq).name + '」准备穿戴',
              'gear',
              { gain: warehouseBest.gain.gain, inBattle: true },
            ),
          );
        } else if (candidates[0]) {
          gearChosenId = num(candidates[0].eq.id);
          add(
            action(
              'EQUIP_ITEM',
              { roleEquipId: num(candidates[0].eq.id) },
              '穿戴「' + template(candidates[0].eq).name + '」',
              'gear',
              { gain: candidates[0].gain.gain, inBattle: true },
            ),
          );
        }
      }
      if (p.warehouse.enabled && num(s.warehouseEquipCount) < WAREHOUSE_CAPACITY) {
        const e = array(s.equipments).find(
          (e) => num(e.id) !== gearChosenId && warehouseEligible(e, p, warehouseSetIds),
        );
        if (e)
          add(
            action(
              'WAREHOUSE_DEPOSIT',
              { roleEquipId: num(e.id) },
              '存入仓库「' + template(e).name + '」',
              'warehouse',
              { inBattle: true },
            ),
          );
      }
      if (p.sell.enabled) {
        const setIds = p.sell.keepSets ? setTemplateIds(s) : new Set();
        const backups = new Set();
        if (p.sell.keepBestBackup)
          for (let slot = 1; slot <= 11; slot++) {
            const best = array(s.equipments)
              .filter((e) => !e.isEquipped && num(template(e).slotType) === slot)
              .sort((a, b) => equipmentScore(b, s, p) - equipmentScore(a, s, p))[0];
            if (best) backups.add(num(best.id));
          }
        // A sale cannot be undone, so no equipment is sold while the combat score has no data
        // and the ranking of backups would rest on the fallback weights.
        const provisional = p.gear.scoring === 'combat' && combatWeights(s, p) === null;
        const sellable = array(s.equipments)
          .filter(
            (e) =>
              !provisional &&
              !e.isEquipped &&
              e.equipTmpl &&
              !e.hiddenWeapon && num(e.equipTmpl.slotType) !== 12 &&
              (!p.warehouse.enabled || !warehouseEligible(e, p, warehouseSetIds)) &&
              num(e.quality, 1) <= p.sell.maxQuality &&
              num(e.enhanceLevel) === 0 &&
              num(e.starLevel) === 0 &&
              !e.isAppraisal &&
              !slots(e).some((id) => id > 0) &&
              num(e.equipTmpl.price) > 0 &&
              (!p.sell.keepFuture || num(e.equipTmpl.reqLevel) <= num(role.level)) &&
              !setIds.has(num(e.tmplId || e.equipTmpl.id)) &&
              !p.sell.keepTemplateIds.map(num).includes(num(e.tmplId || e.equipTmpl.id)) &&
              !backups.has(num(e.id)) &&
              (!p.sell.keepCrafted || !array(ledger.keptEquipIds).includes(num(e.id))),
          )
          .sort((a, b) => equipmentScore(a, s, p) - equipmentScore(b, s, p));
        if (sellable[0])
          add(
            action(
              'SHOP_SELL',
              { roleEquipId: num(sellable[0].id), count: 1 },
              '出售普通装备「' + sellable[0].equipTmpl.name + '」',
              'sell',
              { inBattle: true },
            ),
          );
        else {
          const material = array(s.bagItems).find(
            (i) =>
              !i.hiddenWeapon && num(i.equipTmpl?.slotType) !== 12 &&
              p.sell.materialIds.map(num).includes(num(i.itemId)) &&
              num(i.count) > 0 &&
              num(i.itemTmpl?.price) > 0,
          );
          if (material)
            add(
              action(
                'SHOP_SELL',
                { bagItemId: num(material.id), count: Math.min(integer(material.count), 99) },
                '出售指定材料「' + material.itemTmpl.name + '」',
                'sell',
                { inBattle: true },
              ),
            );
        }
      }
      if (p.shop.enabled) {
        for (const attr of ['HP', 'MP']) {
          const t = potionPick(s, p, attr, now)?.template || potionChoices(s, attr).find((t) =>
            array(s.shopItems).some(
              (i) =>
                num(i.itemId) === num(t.id) &&
                (!i.currencyType || num(i.currencyType) === 1) &&
                num(i.price) > 0,
            ),
          );
          if (!t) continue;
          const owned = countItem(s, t.id),
            restocking = ledger.restock?.[num(t.id)];
          if (owned >= p.shop.targetStock || (owned >= p.shop.minimumStock && !restocking))
            continue;
          const offer = array(s.shopItems).find(
            (i) =>
              num(i.itemId) === num(t.id) &&
              (!i.currencyType || num(i.currencyType) === 1) &&
              num(i.price) > 0,
          );
          const quantity = Math.min(
            p.shop.targetStock - countItem(s, t.id),
            p.shop.maxBatch,
            Math.floor(Math.max(0, num(role.money) - p.budget.moneyReserve) / num(offer.price)),
          );
          if (quantity > 0)
            add(
              action(
                'SHOP_BUY',
                { shopItemId: num(offer.id), count: quantity },
                '补充「' + offer.name + '」×' + quantity,
                'shop',
                {
                  moneyCost: num(offer.price) * quantity,
                  inBattle: true,
                  stockItemId: num(t.id),
                },
              ),
            );
        }
      }
      if (p.gems.enabled) {
        if (p.gems.synth) {
          const grouped = new Map();
          for (const b of array(s.bagItems))
            if (gemUsable(s, b) && num(b.itemTmpl.gemLevel) < p.gems.maxLevel) {
              const group = grouped.get(materialId(b)) || [];
              group.push(b);
              grouped.set(materialId(b), group);
            }
          for (const bags of grouped.values()) {
            const t = bags[0].itemTmpl,
              level = num(t.gemLevel),
              units = bags.reduce((n, b) => n + integer(b.count), 0);
            if (units < 5) continue;
            const charm = gemCharm(s, 'synth', bags[0]);
            const rate = synthRate(level, 5, !!charm);
            if (rate < p.gems.minSynthSuccess) continue;
            const ids = [];
            for (const b of bags) {
              const use = Math.min(integer(b.count), 5 - ids.length);
              for (let n = 0; n < use; n++) ids.push(num(b.id));
            }
            if (ids.length !== 5) continue;
            const payload = { gemBagItemIds: ids };
            if (charm) payload.charmBagItemId = num(charm.id);
            if (
              add(
                action(
                  'GEM_SYNTH',
                  payload,
                  '合成「' + t.name + '」→' + (level + 1) + '级（' + rate + '%）',
                  'gem',
                  { requiresTown: true, npc: NPC.gem, gemUnits: 5 },
                ),
              )
            )
              break;
          }
        }
        if (p.gems.polish) {
          const gems = array(s.bagItems)
            .filter(
              (b) =>
                gemUsable(s, b) &&
                num(b.itemTmpl.gemLevel) <= p.gems.maxLevel &&
                ['智慧宝石', '魅力宝石'].includes(b.itemTmpl.gemType) &&
                !String(b.itemTmpl.name).startsWith('纯净'),
            )
            .sort((a, b) => num(b.itemTmpl.gemLevel) - num(a.itemTmpl.gemLevel));
          for (const gem of gems) {
            const charm = gemCharm(s, 'polish', gem);
            if (
              charm &&
              add(
                action(
                  'GEM_POLISH',
                  { gemBagItemId: num(gem.id), charmBagItemId: num(charm.id) },
                  '雕琢「' + gem.itemTmpl.name + '」',
                  'gem',
                  { requiresTown: true, npc: NPC.gem },
                ),
              )
            )
              break;
          }
        }
        for (const eq of equipped) {
          const all = slots(eq),
            types = ATTACK_SLOTS.includes(num(eq.equipTmpl?.slotType))
              ? GEM_TYPES.attack
              : DEFENSE_SLOTS.includes(num(eq.equipTmpl?.slotType))
                ? GEM_TYPES.defense
                : [];
          if (p.gems.drill && all.filter((v) => v >= 0).length < p.gems.maxHoles) {
            const material = drillMaterial(s, eq);
            if (material)
              add(
                action(
                  'GEM_DRILL',
                  { roleEquipId: num(eq.id), materialBagItemId: num(material.id) },
                  '给「' + template(eq).name + '」打孔',
                  'gem',
                  { requiresTown: true, npc: NPC.gem },
                ),
              );
          }
          const occupied = all
            .filter((v) => v > 0)
            .map((id) => gemTemplate(s, id))
            .filter(Boolean);
          const candidates = array(s.bagItems)
            .filter(
              (b) =>
                gemUsable(s, b) &&
                num(b.itemTmpl.gemLevel) <= p.gems.maxLevel &&
                types.includes(b.itemTmpl.gemType),
            )
            .sort(gemScoreOrder(s, p));
          if (p.gems.inlay && all.includes(0))
            for (const gem of candidates) {
              if (occupied.some((g) => g.gemType === gem.itemTmpl.gemType)) continue;
              const inlay = gemCharm(s, 'inlay', gem);
              if (
                inlay &&
                add(
                  action(
                    'GEM_INLAY',
                    {
                      roleEquipId: num(eq.id),
                      gemBagItemId: num(gem.id),
                      charmBagItemId: num(inlay.id),
                    },
                    '为「' + template(eq).name + '」镶嵌「' + gem.itemTmpl.name + '」',
                    'gem',
                    { requiresTown: true, npc: NPC.gem },
                  ),
                )
              )
                break;
            }
          if (p.gems.replace && p.gems.inlay)
            for (let index = 0; index < all.length; index++) {
              const old = gemTemplate(s, all[index]);
              if (!old) continue;
              const oldBag = { id: 1, itemId: old.id, count: 1, itemTmpl: old },
                remove = gemCharm(s, 'remove', oldBag),
                better = candidates.find(
                  (b) =>
                    b.itemTmpl.gemType === old.gemType &&
                    num(b.itemTmpl.subType) === num(old.subType) &&
                    num(b.itemTmpl.value) > num(old.value) &&
                    gemCharm(s, 'inlay', b),
                );
              if (remove && better)
                add(
                  action(
                    'GEM_REMOVE',
                    {
                      roleEquipId: num(eq.id),
                      gemSlotIndex: index,
                      charmBagItemId: num(remove.id),
                    },
                    '摘除旧宝石，准备替换为「' + better.itemTmpl.name + '」',
                    'gem',
                    {
                      requiresTown: true,
                      npc: NPC.gem,
                      replacement: { equipId: num(eq.id), bagId: num(better.id) },
                    },
                  ),
                );
            }
        }
      }
      if (p.smithy.enabled) {
        if (p.smithy.appraisal) {
          const eq = equipped
            .concat(array(s.equipments).filter((e) => !e.isEquipped))
            .find(
              (e) =>
                num(template(e).slotType) === 1 &&
                num(template(e).reqLevel) >= 50 &&
                !e.isAppraisal,
            );
          if (eq)
            add(
              action(
                'SMITHY_APPRAISAL',
                { roleEquipId: num(eq.id) },
                '鉴定武器「' + template(eq).name + '」',
                'smithy',
                { moneyCost: 10000, requiresTown: true, npc: NPC.smithy },
              ),
            );
        }
        if (p.smithy.enhance)
          for (const eq of equipped) {
            const next = num(eq.enhanceLevel) + 1;
            if (next > p.smithy.targetEnhance || ENHANCE_RATE[next] < p.smithy.minEnhanceSuccess)
              continue;
            const level = num(template(eq).reqLevel),
              essence = level >= 40 ? 5051 : 5050,
              stacks = array(s.bagItems).filter(
                (b) => materialId(b) === essence && materialUsable(s, b) && materialSupports(b, '装备', level),
              ),
              material = stacks.find((b) => b.isBound) || stacks[0];
            if (material)
              add(
                action(
                  'SMITHY_ENHANCE',
                  { roleEquipId: num(eq.id), materialBagId: material.id },
                  '强化「' + template(eq).name + '」至 +' + next,
                  'smithy',
                  { requiresTown: true, npc: NPC.smithy },
                ),
              );
          }
        if (p.smithy.smelt) {
          if (num(role.smeltingItemId) > 0 && num(role.smeltingTargetExp) > 0) {
            const remaining = num(role.smeltingTargetExp) - num(role.smeltingExp);
            if (remaining <= 0)
              add(
                action('SMITHY_SMELT_COMPLETE', {}, '完成神器冶炼', 'smithy', {
                  requiresTown: true,
                  npc: NPC.smithy,
                }),
              );
            else {
              const amount = Math.min(
                remaining,
                Math.max(0, num(role.currentExp) - p.budget.expReserve),
                experienceBudget(p, ledger, 'smelt').remaining,
              );
              // The server accepts the investment during battle. Each answer is a full character
              // snapshot, so exp is invested only once investChunk has accumulated.
              if (amount >= Math.min(remaining, p.smithy.investChunk))
                add(
                  action(
                    'SMITHY_SMELT_INVEST',
                    { expAmount: Math.floor(amount) },
                    '投入冶炼经验 ' + Math.floor(amount),
                    'smithy',
                    { expCost: Math.floor(amount), inBattle: true },
                  ),
                );
            }
          } else {
            const eq = array(s.equipments)
              .filter((e) => !e.hiddenWeapon && num(template(e).slotType) !== 12 &&
                (!p.warehouse.enabled || !warehouseEligible(e, p, warehouseSetIds)) &&
                (p.smithy.allowSmeltEquipped || !e.isEquipped))
              .find(
                (e) =>
                  num(template(e).slotType) === 1 &&
                  num(template(e).reqLevel) >= 50 &&
                  e.isAppraisal &&
                  num(stats(e.appraisalStats).extScore) > 1500 &&
                  num(stats(e.appraisalStats).intScore) > 1500,
              );
            if (eq)
              add(
                action(
                  'SMITHY_SMELT_START',
                  { roleEquipId: num(eq.id) },
                  '用完美资质备用武器开始冶炼',
                  'smithy',
                  { requiresTown: true, npc: NPC.smithy },
                ),
              );
          }
        }
        if (p.smithy.repair)
          for (const section of array(s.bagItems)) {
            const id = materialId(section);
            if (!bagUsable(s, section) || id < 5032 || id > 5037) continue;
            const talisman = materialBag(s, id + 6);
            if (talisman)
              add(
                action(
                  'SMITHY_REPAIR_ARTIFACT',
                  { sectionBagId: num(section.id), talismanBagId: num(talisman.id) },
                  '修复「' + section.itemTmpl?.name + '」',
                  'smithy',
                  { requiresTown: true, npc: NPC.smithy },
                ),
              );
          }
        if (p.smithy.forge)
          for (const section of array(s.bagItems)) {
            if (num(section.count) <= 0 || num(section.itemId) < 5044 || num(section.itemId) > 5049)
              continue;
            const preview = s.forgePreviews?.[num(section.id)];
            if (!preview)
              add(
                action(
                  'SMITHY_FORGE_PREVIEW',
                  { sectionBagId: num(section.id) },
                  '查询可打造神器',
                  'read',
                  { readOnly: true, requiresTown: true, npc: NPC.smithy },
                ),
              );
            else {
              const choices = array(preview)
                .map((entry) => ({
                  entry,
                  t:
                    entry.tmpl || entry.equipTmpl || lookup(s.allEquipTemplates, entry.id) || entry,
                }))
                .filter(
                  (v) =>
                    !p.smithy.artifactIds.length ||
                    p.smithy.artifactIds.map(num).includes(num(v.entry.id)),
                )
                .sort(
                  (a, b) =>
                    scoreStats(stats(b.entry.extraStats || b.t.baseStats), gearWeights(s, p)) -
                    scoreStats(stats(a.entry.extraStats || a.t.baseStats), gearWeights(s, p)),
                );
              const choice = choices[0];
              if (choice && num(choice.entry.id) > 0)
                add(
                  action(
                    'SMITHY_FORGE',
                    { sectionBagId: num(section.id), targetArtifactId: num(choice.entry.id) },
                    '打造神器「' + (choice.t.name || choice.entry.name || choice.entry.id) + '」',
                    'smithy',
                    { requiresTown: true, npc: NPC.smithy },
                  ),
                );
            }
          }
      }
      if (p.craft.enabled) {
        if (p.craft.exchange) {
          const names = ['御赐精纺套', '御赐熟铜套', '御赐精钢套', '御赐黄金套', '御赐混沌套'];
          for (let index = 4; index >= 0; index--) {
            const stone = 5273 + index,
              needed = 5 + index;
            if (num(role.level) < 10 || countItem(s, stone) < needed) continue;
            const set = array(s.equipSets).find((set) => set.name === names[index]);
            if (!set) continue;
            const candidates = array(parse(set.equipTmplIds, []))
              .map((id) => lookup(s.allEquipTemplates, id))
              .filter(
                (t) =>
                  t &&
                  num(t.reqLevel) <= num(role.level) &&
                  (!p.craft.targetIds.length || p.craft.targetIds.map(num).includes(num(t.id))),
              )
              .map((t) => ({ t, gain: projectedGain({ equipTmpl: t, tmplId: num(t.id) }, s, p) }))
              .filter((v) => v.gain.gain > 0 && v.gain.percent >= p.craft.minGainPercent)
              .sort((a, b) => b.gain.gain - a.gain.gain);
            if (candidates[0])
              add(
                action(
                  'YUCI_EXCHANGE',
                  { equipTmplId: num(candidates[0].t.id) },
                  '兑换「' + candidates[0].t.name + '」',
                  'craft',
                  { requiresTown: true, npc: NPC.exchange },
                ),
              );
          }
        }
        if (p.craft.tailor) {
          const candidates = TAILOR_DEFENSE.concat(TAILOR_JEWELRY)
            .filter((id) => !p.craft.targetIds.length || p.craft.targetIds.map(num).includes(id))
            .map((id) => lookup(s.allEquipTemplates, id))
            .filter((t) => t && num(t.reqLevel) <= num(role.level))
            .map((t) => ({ t, gain: projectedGain({ equipTmpl: t, tmplId: num(t.id) }, s, p) }))
            .filter((v) => v.gain.gain > 0 && v.gain.percent >= p.craft.minGainPercent)
            .sort((a, b) => b.gain.gain - a.gain.gain);
          tailorTargets: for (const { t } of candidates) {
            const ids = tailorMaterialIds(t.id),
              materials = array(s.bagItems)
                .filter(
                  (b) =>
                    materialUsable(s, b) &&
                    ids.includes(materialId(b)) &&
                    materialSupports(b, '装备', num(t.reqLevel)),
                )
                .sort((a, b) => materialId(b) - materialId(a));
            for (const material of materials)
              if (
                add(
                  action(
                    'CRAFT_EQUIP',
                    { targetEquipTmplId: num(t.id), materialItemTmplId: materialId(material) },
                    '用材料打造「' + t.name + '」',
                    'craft',
                    { moneyCost: 50000, requiresTown: true, npc: NPC.tailor },
                  ),
                )
              )
                break tailorTargets;
          }
        }
      }
      for (const a of out) {
        if (a.type === 'LEVEL_UP') a.key += ':level=' + num(role.level);
        else if (a.type === 'UPGRADE_SKILL')
          a.key +=
            ':level=' +
            num(s.skills.find((sk) => num(sk.id) === num(a.payload.roleSkillId))?.currentLevel);
      }
      return out;
    }
    function synthRate(level, units, charm) {
      const r = {
        1: [20, 30, 100, 100],
        2: [20, 18, 74, 99],
        3: [15, 15, 60, 85],
        4: [12.5, 12.5, 50, 75],
        5: [10, 10, 40, 65],
      }[level];
      if (!r || units < 2 || units > 5) return 0;
      const base = Math.min(r[2], r[0] + r[1] * (units - 2));
      return charm ? Math.min(r[3], base + 25) : base;
    }
    function signature(s) {
      return JSON.stringify({
        role: [
          s.role?.id,
          s.role?.level,
          s.role?.currentExp,
          s.role?.money,
          s.role?.mapId,
          s.role?.smeltingExp,
          s.role?.smeltingItemId,
          s.role?.settings,
        ],
        eq: array(s.equipments).map((e) => [
          e.id,
          e.tmplId,
          e.quality,
          e.starLevel,
          !!e.isEquipped,
          e.enhanceLevel,
          e.gemSlots,
          e.extraStats,
          e.isAppraisal,
          e.appraisalStats,
        ]),
        bag: array(s.bagItems).map((b) => [
          b.id,
          b.itemId,
          b.count,
          b.extraData,
          b.itemTmpl?.value,
        ]),
        skills: array(s.skills).map((sk) => [sk.id, sk.currentLevel]),
      });
    }
    function mapChoices(maps) {
      const regions = new Map(), hidden = [];
      for (const m of Array.isArray(maps) ? maps : []) {
        if (m.show === false) {
          hidden.push(m);
          continue;
        }
        const region = m.region || '未知区域';
        if (!regions.has(region)) regions.set(region, { level: m.reqLevel, maps: [] });
        const group = regions.get(region);
        group.level = Math.min(group.level, m.reqLevel);
        group.maps.push(m);
      }
      const ordered = [...regions.values()]
        .sort((a, b) => a.level - b.level)
        .flatMap((group) => group.maps)
        .concat(hidden);
      return [
        ['0', '按等级选择免费地图'],
        ...ordered
          .filter((m) =>
            m.mapType !== 1 &&
            array(m.costs).length === 0 &&
            array(m.monsters).length &&
            ![20050, 20051, 20052, 20070].includes(m.id),
          )
          .map((m) => [m.id, `${m.region || '未知区域'} · ${m.name}（Lv.${m.reqLevel}）`]),
      ];
    }
    function fillPicks(mode, s, p, current = {}) {
      const bound = (a, b) => Number(!!b.isBound) - Number(!!a.isBound);
      const bags = array(s.bagItems).filter((b) => materialUsable(s, b)).sort(bound);
      const charms = array(s.bagItems).filter((b) => charmUsable(s, b)).sort(bound);
      const gems = array(s.bagItems).filter((b) => gemUsable(s, b)).sort(bound);
      const eqs = array(s.equipments), equipped = eqs.filter((e) => e.isEquipped)
        .sort((a, b) => num(template(a).slotType) - num(template(b).slotType));
      const id = materialId, level = (b) => num(b?.itemTmpl?.gemLevel);
      const find = (...ids) => ids.map((n) => charms.find((b) => id(b) === n)).find(Boolean);
      const result = (items, message = '没有合适的装备或材料') => {
        items = items.filter(Boolean);
        return { items, message: items.length ? '已放入 ' + items.map((b) => b.itemTmpl?.name || template(b).name || String(b.id)).join('、') : message };
      };
      if (mode === 'GEM_DRILL') {
        const eq = current.selectedEquip || equipped.filter((e) => slots(e).filter((n) => n >= 0).length < 3)
          .sort((a, b) => slots(a).filter((n) => n >= 0).length - slots(b).filter((n) => n >= 0).length)[0];
        const chosen = eq && drillMaterial({ ...s, bagItems: bags }, eq);
        const material = chosen && bags.find((b) => drillMaterial({ ...s, bagItems: [b] }, eq) && drillRange(b.itemTmpl).max === drillRange(chosen.itemTmpl).max && num(b.itemTmpl.price) === num(chosen.itemTmpl.price));
        return material ? result([eq, material]) : result([], '没有可用的打孔材料或装备');
      }
      if (mode === 'GEM_INLAY') {
        const fitting = (e) => gems.filter((b) => (ATTACK_SLOTS.concat(12).includes(num(template(e).slotType)) ? GEM_TYPES.attack : DEFENSE_SLOTS.includes(num(template(e).slotType)) ? GEM_TYPES.defense : []).includes(b.itemTmpl.gemType))
          .filter((b) => !slots(e).some((n) => gemTemplate(s, n)?.gemType === b.itemTmpl.gemType))
          .sort(gemScoreOrder(s, p, bound));
        const eq = current.selectedEquip && slots(current.selectedEquip).includes(0) ? current.selectedEquip : equipped.find((e) => slots(e).includes(0) && fitting(e).length);
        const gem = eq && fitting(eq)[0];
        return gem ? result([eq !== current.selectedEquip && eq, gem, find(5053, 5052)]) : result([], '没有可镶嵌的宝石或空孔');
      }
      if (mode === 'GEM_SYNTH') {
        const selected = array(current.selectedSynthGems), groups = new Map();
        for (const b of gems.filter((b) => level(b) < 6)) groups.set(id(b), (groups.get(id(b)) || []).concat(b));
        const total = (group) => group.reduce((n, b) => n + num(b.count), 0);
        const group = selected.length ? groups.get(id(selected[0])) : [...groups.values()].filter((g) => total(g) >= 2)
          .sort((a, b) => Math.min(5, total(b)) - Math.min(5, total(a)) || level(a[0]) - level(b[0]) || id(a[0]) - id(b[0]))[0];
        const units = (group || []).flatMap((b) => Array(Math.max(0, Math.min(5, num(b.count) - selected.filter((v) => v.id === b.id).length))).fill(b)).slice(0, Math.max(0, 5 - selected.length));
        const gem = selected[0] || group?.[0];
        return result(units.concat(gem && !current.selectedSynthCharm ? find(level(gem) <= 4 ? 5058 : 5059) : null));
      }
      if (mode === 'GEM_REMOVE') {
        if (!current.selectedEquip) return result([], '请先放入装备并点选要摘除的宝石');
        const low = gemTemplate(s, slots(current.selectedEquip)[current.selectedRemoveGemIndex])?.gemLevel === 1;
        const remove = charms.filter((b) => b.itemTmpl.functionType === 4 || id(b) === 5069 || id(b) === 5055);
        return result([low ? remove.find((b) => id(b) !== 5055) : remove.find((b) => id(b) === 5055) || remove[0]]);
      }
      if (mode === 'GEM_POLISH') {
        const gem = gems.filter((b) => ['智慧宝石', '魅力宝石'].includes(b.itemTmpl.gemType) && !String(b.itemTmpl.name).startsWith('纯净')).sort((a, b) => level(b) - level(a))[0];
        return result(gem ? [gem, charms.find((b) => id(b) === 5060 || b.itemTmpl.functionType === 5)] : []);
      }
      if (mode === 'SMITHY_APPRAISAL') return result([eqs.filter((e) => [1, 12].includes(num(template(e).slotType)) && num(template(e).reqLevel) >= 50 && !e.isAppraisal).sort((a, b) => Number(!!b.isEquipped) - Number(!!a.isEquipped))[0]], '没有未鉴定的50级以上武器');
      if (mode === 'SMITHY_REINFORCE') return result([equipped.filter((e) => num(e.enhanceLevel) < 9 && (num(template(e).reqLevel) < 40 ? find(5050) : find(5051, 5079))).sort((a, b) => num(a.enhanceLevel) - num(b.enhanceLevel))[0]]);
      if (mode === 'SMITHY_SMELT') return result([eqs.filter((e) => !e.isEquipped && num(template(e).slotType) === 1 && num(template(e).reqLevel) >= 50 && num(stats(e.appraisalStats).extScore) > 1500 && num(stats(e.appraisalStats).intScore) > 1500).sort((a, b) => num(template(a).reqLevel) - num(template(b).reqLevel))[0]], '没有可冶炼的完美资质武器（已穿戴的不会自动放入）');
      if (mode === 'SMITHY_REPAIR') {
        const complete = (b) => num(stats(b.extraData).repairs) >= 5;
        const section = bags.filter((b) => id(b) >= 5032 && id(b) <= 5037 && (complete(b) || find(id(b) + 6))).sort((a, b) => id(b) - id(a))[0];
        return result([section, section && !complete(section) && find(id(section) + 6)]);
      }
      if (mode === 'SMITHY_FORGE') return result([bags.find((b) => id(b) >= 5044 && id(b) <= 5049)]);
      if (mode === 'TAILOR_ADD_MATERIAL') {
        const min = current.family === 'mithril' ? 5017 : 5008;
        return result([bags.filter((b) => id(b) >= min && id(b) <= min + 7).sort((a, b) => id(b) - id(a))[0]]);
      }
      return result([], '请先在窗口里选择功能页');
    }
    function slotChoices(mode, kind, s, p, current = {}) {
      const bound = (a, b) => Number(!!b.isBound) - Number(!!a.isBound);
      const worn = (a, b) => Number(!!b.isEquipped) - Number(!!a.isEquipped);
      const level = (b) => num(b.itemTmpl?.gemLevel), id = materialId;
      const bags = array(s.bagItems).filter((b) => materialUsable(s, b)).sort(bound);
      const gems = array(s.bagItems).filter((b) => gemUsable(s, b)).sort(bound);
      const eqs = array(s.equipments).slice().sort((a, b) => worn(a, b) || num(template(a).slotType) - num(template(b).slotType));
      const eq = current.selectedEquip;
      if (kind === 'equip') {
        if (mode === 'GEM_DRILL') return eqs.filter((e) => slots(e).filter((n) => n >= 0).length < 3);
        if (mode === 'GEM_INLAY') return eqs.filter((e) => slots(e).includes(0));
        if (mode === 'GEM_REMOVE') return eqs.filter((e) => slots(e).some((n) => n > 0));
      }
      if (kind === 'material' && mode === 'GEM_DRILL') return bags.filter((b) => num(b.itemTmpl.functionType) === 2 && (!eq || materialSupports(b, '装备', num(template(eq).reqLevel))));
      if (kind === 'gem' && mode === 'GEM_INLAY') return gems.filter((b) => !eq || ((ATTACK_SLOTS.concat(12).includes(num(template(eq).slotType)) ? GEM_TYPES.attack : GEM_TYPES.defense).includes(b.itemTmpl.gemType) && !slots(eq).some((n) => gemTemplate(s, n)?.gemType === b.itemTmpl.gemType)))
        .sort(gemScoreOrder(s, p, bound));
      if (kind === 'gem' && mode === 'GEM_SYNTH') {
        const total = (b) => gems.filter((v) => id(v) === id(b)).reduce((n, v) => n + num(v.count), 0);
        return gems.filter((b) => level(b) < 6).sort((a, b) => Number(total(b) >= 2) - Number(total(a) >= 2) || Math.min(5, total(b)) - Math.min(5, total(a)) || level(a) - level(b) || id(a) - id(b) || bound(a, b));
      }
      if (kind === 'gem' && mode === 'GEM_POLISH') return gems.filter((b) => ['智慧宝石', '魅力宝石'].includes(b.itemTmpl.gemType) && !String(b.itemTmpl.name).startsWith('纯净')).sort((a, b) => level(b) - level(a) || bound(a, b));
      if (kind === 'charm') {
        const fn = { GEM_INLAY: 1, GEM_SYNTH: 3, GEM_REMOVE: 4, GEM_POLISH: 5 }[mode];
        const known = { GEM_INLAY: [5053, 5052], GEM_SYNTH: [5058, 5059], GEM_REMOVE: [5055, 5069], GEM_POLISH: [5060] }[mode] || [];
        const low = eq && gemTemplate(s, slots(eq)[current.selectedRemoveGemIndex])?.gemLevel === 1;
        const preferred = mode === 'GEM_SYNTH' && level(current.selectedSynthGems?.[0] || {}) === 5 ? 5059 : known[0];
        return array(s.bagItems).filter((b) => charmUsable(s, b) && (known.includes(id(b)) || fn && num(b.itemTmpl.functionType) === fn) && !(mode === 'GEM_REMOVE' && low && id(b) === 5055))
          .sort((a, b) => Number(id(b) === preferred) - Number(id(a) === preferred) || bound(a, b));
      }
      if (kind !== 'any') return [];
      if (mode === 'SMITHY_APPRAISAL') return eqs.filter((e) => [1, 12].includes(num(template(e).slotType)) && num(template(e).reqLevel) >= 50).sort((a, b) => Number(!!a.isAppraisal) - Number(!!b.isAppraisal) || worn(a, b));
      if (mode === 'SMITHY_REINFORCE') return eqs.filter((e) => num(e.enhanceLevel) < 9).sort((a, b) => worn(a, b) || num(a.enhanceLevel) - num(b.enhanceLevel));
      if (mode === 'SMITHY_SMELT') return eqs.filter((e) => num(template(e).slotType) === 1 && num(template(e).reqLevel) >= 50 && num(stats(e.appraisalStats).extScore) > 1500 && num(stats(e.appraisalStats).intScore) > 1500).sort((a, b) => -worn(a, b) || num(template(a).reqLevel) - num(template(b).reqLevel));
      if (mode === 'SMITHY_REPAIR') return bags.filter((b) => id(b) >= 5032 && id(b) <= 5043).sort((a, b) => id(b) - id(a));
      if (mode === 'SMITHY_FORGE') return bags.filter((b) => id(b) >= 5044 && id(b) <= 5049);
      if (mode === 'TAILOR_ADD_MATERIAL') return bags.filter((b) => id(b) >= 5008 && id(b) <= 5015 || id(b) >= 5017 && id(b) <= 5024).sort((a, b) => (id(b) >= 5017 ? id(b) - 5017 : id(b) - 5008) - (id(a) >= 5017 ? id(a) - 5017 : id(a) - 5008) || bound(a, b));
      return [];
    }
    return {
      fillPicks, slotChoices, charmUsable, charmCompatible,
      WAREHOUSE_CAPACITY,
      mapChoices,
      DEFAULTS,
      WEIGHTS,
      GEM_ATTR,
      NPC,
      config,
      parse,
      num,
      integer,
      array,
      clone,
      stats,
      slots,
      lookup,
      template,
      poolMaps, scoreTargets, survivalWeight, healPerSecond, scoringStatus, scoringText, SUSTAIN_LINE, LOW_HP_SHARE, HP_LINE,
      setEffects, combatContext, combatParts, combatValue, combatWeights, gearWeights, statScore,
      equipmentStats,
      scoreStats,
      equipmentScore, characterScore, SCORE_UNIT,
      projectedGain,
      countItem,
      bagItem,
      byFunction,
      itemRange,
      drillRange,
      drillMaterial,
      bagUsable,
      materialCount,
      materialCheck,
      gemCharm,
      roleMap,
      townFor,
      farmMap,
      normalMap,
      potionEffect,
      potionChoices,
      potionSettings,
      potionPick,
      potionThreshold,
      potionOrder,
      skillCost,
      synthRate,
      petScreenable,
      petEggs,
      freshLedger,
      normalizeLedger,
      recordExperience,
      experienceBudget,
      levelProgress,
      skillProgress,
      allowed,
      plans,
      arenaRush,
      signature,
    };
  })();
  if (typeof module !== 'undefined' && module.exports) module.exports = TLPolicy;

  ('use strict');
  const TLRuntime = (() => {
    const P = TLPolicy,
      PREFIX = 'tl-autopilot-v1',
      CONFIG = PREFIX + ':config',
      RUNNING = PREFIX + ':running';
    const ALLOWED = new Set([
      'ARENA_COMMAND', 'PET_COMMAND', 'TRIAL_COMMAND',
      'ENTER_GAME',
      'ENTER_MAP',
      'EQUIP_ITEM',
      'LEVEL_UP',
      'UPGRADE_SKILL',
      'GET_POTION_LIST',
      'GET_MONSTER_TMPL',
      'UPDATE_SETTINGS',
      'SHOP_BUY',
      'SHOP_SELL',
      'WAREHOUSE_DEPOSIT',
      'WAREHOUSE_WITHDRAW',
      'GEM_DRILL',
      'GEM_INLAY',
      'GEM_SYNTH',
      'GEM_REMOVE',
      'GEM_POLISH',
      'SMITHY_APPRAISAL',
      'SMITHY_ENHANCE',
      'SMITHY_SMELT_START',
      'SMITHY_SMELT_INVEST',
      'SMITHY_SMELT_COMPLETE',
      'SMITHY_REPAIR_ARTIFACT',
      'SMITHY_FORGE_PREVIEW',
      'SMITHY_FORGE',
      'CRAFT_EQUIP',
      'YUCI_EXCHANGE',
      'WUSHUANG_STATUS',
      'WUSHUANG_CLAIM',
      'ZL_STATUS',
      'ZL_CLAIM_TOKEN',
      'ZL_ENTER',
      'CAMP_STATUS',
      'CAMP_ENTER',
      'BEAR_ENTER',
      'ONLINE_LOTTERY_COMMAND',
    ]);
    const readStorage = (key, fallback) => {
      try {
        return P.parse(localStorage.getItem(key), fallback);
      } catch {
        return fallback;
      }
    };
    const writeStorage = (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    };
    const day = () => {
      const d = new Date();
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-');
    };
    const copy = (v) => {
      try {
        return JSON.parse(JSON.stringify(v));
      } catch {
        return null;
      }
    };
    const safeMessage = (value) =>
      String(value || '')
        .replace(
          /((?:password|passwd|digest|ticket|token|authorization|密码|票据|令牌|摘要)\s*[:=：])\s*[^\s,;；]+/gi,
          '$1[redacted]',
        )
        .replace(/\bBearer\s+[A-Za-z0-9_.\/+\-=]+/gi, 'Bearer [redacted]')
        .slice(0, 260);
    function createKeepAwake(name) {
      let held = false, release = null;
      return {
        set(on) {
          if (on && !held && this.supported) {
            try {
              navigator.locks.request(name, { mode: 'shared' }, () => new Promise((resolve) => {
                release = resolve;
              })).catch(() => {
                held = false;
              });
              held = true;
            } catch {
              held = false;
            }
          } else if (!on && held) {
            release?.();
            held = false;
          }
          return held;
        },
        get held() {
          return held;
        },
        get supported() {
          return typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function';
        },
      };
    }
    function createTicker(fn, onFallback) {
      let worker = null, t = 0, ms = 0, mode = 'main';
      if (typeof Worker === 'function')
        try {
          worker = new Worker(URL.createObjectURL(new Blob([
            'let t=0;onmessage=e=>{clearInterval(t);t=e.data>0?setInterval(()=>postMessage(0),e.data):0;};',
          ], { type: 'application/javascript' })));
          mode = 'worker';
          worker.onmessage = () => fn();
          worker.onerror = (e) => {
            if (mode !== 'worker') return;
            e?.preventDefault?.();
            worker.terminate();
            mode = 'main';
            if (ms > 0) t = setInterval(fn, ms);
            onFallback?.(String(e?.message || e));
          };
        } catch {}
      return {
        set(value) {
          ms = value;
          if (mode === 'worker') worker.postMessage(ms);
          else {
            clearInterval(t);
            t = setInterval(fn, ms);
          }
        },
        stop() {
          ms = 0;
          if (mode === 'worker') worker.postMessage(0);
          else clearInterval(t);
        },
        get mode() {
          return mode;
        },
      };
    }
    function scoringState(c, bridge, prefs = P.DEFAULTS) {
      const s = { role: c.role, maps: c.maps, bagItems: c.bagItems,
        potionTemplates: bridge.cache.potions, monsterTemplates: bridge.cache.monsterTemplates,
        lastMapId: bridge.cache.targets.mapId };
      const selected = P.scoreTargets(s, prefs, farmTargets(bridge.cache.targets, c.maps));
      return { monsters: selected.list, scoreTargets: { source: selected.source, mapIds: selected.mapIds },
        monsterTemplates: s.monsterTemplates, monsterTemplatesAt: bridge.cache.monsterTemplatesAt,
        survival: P.survivalWeight(bridge.pressure?.(c.maps), P.healPerSecond(s)) };
    }
    function farmTargets(targets, maps) {
      return P.farmMap(P.array(maps).find((map) => P.num(map.id) === P.num(targets?.mapId)))
        ? Array.from(targets?.list?.values() || []) : [];
    }
    function mergeTargets(targets, mapId, slots, allowed = true) {
      if (!allowed) return false;
      // A packet without monsters (town, idle) must not wipe the last fought map's data.
      const found = slots.filter((slot) => slot && ['MONSTER', 'LEADER', 'BOSS'].includes(slot.category) &&
        slot.base && typeof slot.base === 'object');
      if (!found.length) return false;
      let changed = targets.mapId !== mapId;
      if (changed) { targets.list.clear(); targets.mapId = mapId; }
      for (const slot of found) {
        const key = slot.category + ':' + (slot.templateId ?? slot.name) + ':' + slot.level;
        if (targets.list.has(key)) continue;
        const base = Object.fromEntries(Object.keys(P.WEIGHTS).map((k) => [k, P.num(slot.base[k])]));
        targets.list.set(key, { category: slot.category, level: P.num(slot.level), base });
        if (targets.list.size > 30) targets.list.delete(targets.list.keys().next().value);
        changed = true;
      }
      return changed;
    }
    // USE_ITEM is allowed only for pet hatching or double experience; other uses stay with the player.
    function requestAllowed(action) {
      return ALLOWED.has(action?.type) || (action?.type === 'USE_ITEM' && (action.petHatch === true || action.doubleExp === true));
    }
    function matchesResponse(waiter, packet) {
      if (waiter.doubleExp && (packet.success ?? packet.code === 200) &&
          !packet.data?.effects?.some((effect) => effect.type === 'DOUBLE_EXP_BUFF')) return false;
      return packet.type === waiter.responseType && (!(['ARENA_COMMAND', 'PET_COMMAND', 'ONLINE_LOTTERY_COMMAND'].includes(waiter.type) || waiter.petHatch) ||
        packet.data?.requestId === waiter.requestId);
    }
    const statsFields = 'wall battle exp expBase gold sell potion hpPotions mpPotions kills deaths hpLost mpUsed low'.split(' ');
    const statsTotals = () => Object.fromEntries(statsFields.map((k) => [k, 0]));
    const statsNumber = (value) => {
      const n = Number(value) || 0, a = Math.abs(n);
      if (a >= 100000000) return (n / 100000000).toFixed(2) + '亿';
      if (a >= 10000) return (n / 10000).toFixed(a >= 1000000 ? 1 : 2) + '万';
      return Math.round(n).toLocaleString('zh-CN');
    };
    const statsDuration = (ms) => {
      const m = Math.floor(ms / 60000);
      return (m >= 60 ? Math.floor(m / 60) + '小时' : '') + m % 60 + '分';
    };
    class Stats {
      constructor({ now, read, write }) {
        this.now = now;
        this.write = write;
        this.buckets = {};
        this.window = [];
        this.lastTick = now();
        this.lastWrite = now();
        const saved = read();
        if (saved?.version === 1 && saved.buckets && typeof saved.buckets === 'object' && !Array.isArray(saved.buckets) &&
          Object.entries(saved.buckets).every(([key, b]) => key.split(':').length === 2 &&
            key.split(':').every((v) => v !== '' && Number.isInteger(Number(v))) && b && statsFields.every((k) => k === 'low' && b[k] === undefined || Number.isFinite(b[k]) && b[k] >= 0)))
          this.buckets = Object.fromEntries(Object.entries(saved.buckets).map(([k, b]) => [k, { ...b, low: b.low ?? 0 }]));
        this.prune();
      }
      prune() {
        const hour = Math.floor(this.now() / 3600000);
        for (const key of Object.keys(this.buckets))
          if (Number(key.split(':')[0]) < hour - 71) delete this.buckets[key];
      }
      pressure(isFarmMap) {
        const totals = Object.fromEntries('battle hpLost gold sell potion hpPotions mpPotions deaths low'.split(' ').map((k) => [k, 0]));
        const hours = [...new Set(Object.keys(this.buckets).map((k) => Number(k.split(':')[0])))].sort((a, b) => b - a);
        for (const hour of hours) {
          const buckets = Object.entries(this.buckets).filter(([k]) => Number(k.split(':')[0]) === hour && isFarmMap(Number(k.split(':')[1])));
          for (const [, bucket] of buckets)
            for (const k of Object.keys(totals)) totals[k] += bucket[k];
          if (totals.battle >= 21600000) break;
        }
        return totals;
      }
      bucket(mapId) {
        this.prune();
        const key = Math.floor(this.now() / 3600000) + ':' + (mapId || 0);
        return this.buckets[key] ||= statsTotals();
      }
      save() {
        if (this.now() - this.lastWrite >= 60000) this.flush();
      }
      flush() {
        this.prune();
        this.write({ version: 1, buckets: JSON.parse(JSON.stringify(this.buckets)) });
        this.lastWrite = this.now();
      }
      clear() {
        this.lastLowHpAt = this.lastDeathAt = 0;
        this.buckets = {};
        this.window = [];
        this.previous = null;
        this.exp = this.money = undefined;
        this.lastTick = this.now();
        this.flush();
      }
      tick(mapId) {
        this.bucket(mapId).wall += Math.max(0, Math.min(5000, this.now() - this.lastTick));
        this.lastTick = this.now();
        this.save();
      }
      death(mapId) {
        if (mapId === this.mapId) this.lastDeathAt = this.now();
        this.bucket(mapId).deaths++;
        this.save();
      }
      record(packet, context) {
        // Some packets carry the role of another player (player info, arena snapshots).
        const d = packet.data || {}, sent = d.roleInfo?.role || d.role,
          role = sent && (sent.id == null || sent.id === context.roleId) ? sent : null;
        const b = this.bucket(context.mapId), ok = packet.success !== false && d.success !== false;
        if (packet.type === 'COMBAT_REWARD' && ok) {
          const exp = typeof role?.currentExp === 'number' && this.exp !== undefined ? Math.max(0, role.currentExp - this.exp) : 0;
          b.kills++;
          b.exp += exp;
          b.expBase += exp / (context.doubleExp ? 2 : 1);
          b.gold += (d.drops || []).filter((v) => v.name === '金币').reduce((sum, v) => sum + Number(v.count || 0), 0);
        }
        if (packet.type === 'USE_ITEM_RESPONSE' && ok) this.potions(d, context, b);
        if (packet.type === 'SHOP_SELL_RESPONSE' && ok && this.money !== undefined)
          b.sell += Math.max(0, Number(role?.money ?? this.money) - this.money);
        if (this.mapId !== context.mapId) {
          this.lastLowHpAt = this.lastDeathAt = 0;
          this.mapId = context.mapId;
          this.previous = null;
          this.window = [];
        }
        if (packet.type === 'COMBAT_STATE') this.combat(d, b);
        if (typeof role?.currentExp === 'number') {
          this.exp = role.currentExp;
          this.money = Number(role.money) || 0;
        }
        this.save();
      }
      potions(d, context, b) {
        const effects = (d.effects || []).filter((v) => v.type === 'HEAL');
        for (const effect of effects) {
          if (effect.attr === 'HP') b.hpPotions++;
          if (effect.attr === 'MP') b.mpPotions++;
        }
        if (effects.length) b.potion += context.potionPrice((d.message || '').replace(/^使用了 /, ''));
      }
      combat(d, b) {
        const low = d.player?.base.hp > 0 && d.player.currentHp / d.player.base.hp < P.HP_LINE;
        if (d.stage === 'running' && low) this.lastLowHpAt = d.serverTime;
        const p = this.previous;
        this.previous = d.stage === 'running' && d.player ? d : null;
        if (!this.previous || !p || p.sessionId !== d.sessionId) return;
        const dt = Math.min(5000, d.serverTime - p.serverTime);
        if (!(dt > 0)) return;
        const hpLost = Math.max(0, p.player.currentHp - d.player.currentHp);
        const mpUsed = Math.max(0, p.player.currentMp - d.player.currentMp);
        b.battle += dt;
        if (low) b.low += dt;
        b.hpLost += hpLost;
        b.mpUsed += mpUsed;
        this.window.push({ time: d.serverTime, dt, hpLost, mpUsed, currentHp: d.player.currentHp,
          maxHp: d.player.base.hp, maxMp: d.player.base.mp });
        this.trim();
      }
      trim() {
        const end = Math.max(this.now(), this.window.at(-1)?.time || 0);
        this.window = this.window.filter((v) => v.time > end - 600000);
        return end;
      }
      rates() {
        const end = this.trim(), w = this.window, last = w.at(-1);
        const result = { mapId: 0, seconds: 0, hpLossPerSec: 0, mpUsePerSec: 0, worstLoss10Pct: 0, minHpPct: 0, maxHp: 0, maxMp: 0,
          lastLowHpAt: this.lastLowHpAt || 0, lastDeathAt: this.lastDeathAt || 0 };
        if (!last) return result;
        result.mapId = this.mapId;
        result.maxHp = last.maxHp;
        result.maxMp = last.maxMp;
        result.seconds = w.reduce((sum, v) => sum + v.dt, 0) / 1000;
        result.hpLossPerSec = w.reduce((sum, v) => sum + v.hpLost, 0) / result.seconds;
        result.mpUsePerSec = w.reduce((sum, v) => sum + v.mpUsed, 0) / result.seconds;
        let start = 0, loss = 0, worst = 0;
        for (let i = 0; i < w.length; i++) {
          loss += w[i].hpLost;
          while (w[start].time <= w[i].time - 10000) loss -= w[start++].hpLost;
          worst = Math.max(worst, loss);
        }
        result.worstLoss10Pct = last.maxHp ? worst / last.maxHp * 100 : 0;
        const recent = w.filter((v) => v.time > end - 60000 && v.maxHp > 0);
        result.minHpPct = recent.length ? Math.min(...recent.map((v) => v.currentHp / v.maxHp * 100)) : 0;
        return result;
      }
      summary() {
        this.prune();
        const hour = statsTotals(), previous = statsTotals(), today = statsTotals(), maps = {};
        const h = Math.floor(this.now() / 3600000), date = new Date(this.now()).toDateString();
        const add = (target, b) => statsFields.forEach((k) => target[k] += b[k]);
        for (const [key, b] of Object.entries(this.buckets)) {
          const [time, mapId] = key.split(':');
          if (+time === h) add(hour, b);
          if (+time === h - 1) add(previous, b);
          if (new Date(+time * 3600000).toDateString() === date) add(today, b);
          add(maps[mapId] ||= { ...statsTotals(), mapId: Number(mapId) }, b);
        }
        const recent = { ...hour };
        if (hour.wall < 600000) add(recent, previous);
        return { hour, previous, today, recent, maps: Object.values(maps).filter((b) => b.battle > 0).sort((a, b) => b.battle - a.battle) };
      }
    }
    class Bridge {
      constructor(log) {
        this.log = log;
        this.socket = null;
        this.sessionReady = false;
        this.waiter = null;
        this.sending = false;
        this.lastMessage = 0;
        this.lastClose = 0;
        this.authFailed = false;
        this.manualUntil = 0;
        this.packetTypes = [];
        this.cache = { potions: [], activityStatus: {}, forgePreviews: {}, consignment: new Map() };
        this.cache.monsterTemplates = new Map();
        this.cache.monsterTemplatesAt = 0;
        const monsters = readStorage(PREFIX + ':monsters', null);
        if (Number.isFinite(monsters?.at) && Array.isArray(monsters.list) && monsters.list.every((e) =>
          Array.isArray(e) && e.length === 2 && typeof e[0] === 'string' &&
          typeof e[1]?.category === 'string' && Number.isFinite(e[1]?.level) &&
          Object.keys(P.WEIGHTS).every((k) => Number.isFinite(e[1]?.base?.[k])))) {
          this.cache.monsterTemplates = new Map(monsters.list);
          this.cache.monsterTemplatesAt = monsters.at;
        }
        const saved = readStorage(PREFIX + ':targets', null);
        this.cache.targets = { mapId: null, list: new Map() };
        if (saved && Number.isFinite(saved.mapId) && Array.isArray(saved.list) &&
            saved.list.every((e) => Array.isArray(e) && e.length === 2 &&
              typeof e[0] === 'string' && typeof e[1]?.category === 'string' &&
              Number.isFinite(e[1]?.level) && e[1]?.base &&
              typeof e[1].base === 'object' && !Array.isArray(e[1].base)))
          this.cache.targets = { mapId: saved.mapId, list: new Map(saved.list.slice(-30)) };
        this.onMessage = () => {};
        this.onDisconnect = () => {};
        this.installSocketHook();
      }
      requestError(waiter, code, message, receivedType = null) {
        const error = new Error(safeMessage(message));
        Object.assign(error, {
          code,
          requestType: waiter.type,
          expectedResponseType: waiter.responseType,
          receivedType,
          elapsedMs: Math.max(0, Date.now() - waiter.started),
          packetTypes: this.packetTypes.filter((p) => p.time >= waiter.started).map((p) => p.type),
        });
        return error;
      }
      rejectWaiter(waiter, error) {
        if (this.waiter !== waiter) return;
        this.waiter = null;
        clearTimeout(waiter.timer);
        waiter.reject(error);
      }
      installSocketHook() {
        const Native = window.WebSocket;
        if (typeof Native !== 'function') throw new Error('浏览器没有 WebSocket');
        const bridge = this;
        window.WebSocket = new Proxy(Native, {
          construct(target, args, newTarget) {
            const socket = Reflect.construct(target, args, newTarget);
            let url;
            try {
              url = new URL(String(args[0]), location.href);
            } catch {
              return socket;
            }
            if (
              url.pathname === '/ws' &&
              url.hostname === location.hostname &&
              url.port === location.port
            )
              bridge.attach(socket);
            return socket;
          },
        });
      }
      attach(socket) {
        this.socket = socket;
        this.sessionReady = false;
        this.authFailed = false;
        const send = socket.send;
        const bridge = this;
        socket.send = function (data) {
          if (typeof data === 'string') {
            try {
              const packet = JSON.parse(data);
              if (
                packet.type === 'CONSIGNMENT_LIST' &&
                P.num(packet.payload?.page) === 1 &&
                !packet.payload?.myList
              )
                bridge.cache.consignment.clear();
              if (!bridge.sending && bridge.waiter && !bridge.waiter.petHatch && packet.type === bridge.waiter.type && !['ARENA_COMMAND', 'PET_COMMAND'].includes(packet.type))
                bridge.waiter.interference = true;
            } catch {}
          }
          return Reflect.apply(send, this, [data]);
        };
        socket.addEventListener('open', () => {
          if (this.socket === socket) {
            this.authFailed = false;
            this.log('连接已打开，等待原游戏进入角色');
          }
        });
        socket.addEventListener('close', () => {
          if (this.socket !== socket) return;
          this.sessionReady = false;
          this.lastClose = Date.now();
          if (this.waiter) {
            const waiter = this.waiter;
            this.waiter = null;
            clearTimeout(waiter.timer);
            waiter.reject(new Error('连接中断，已发动作等待新角色快照核对'));
          }
          this.onDisconnect();
        });
        socket.addEventListener('message', (ev) => {
          if (this.socket !== socket || typeof ev.data !== 'string') return;
          let packet;
          try {
            packet = JSON.parse(ev.data);
          } catch {
            return;
          }
          if (typeof packet.type !== 'string') return;
          this.lastMessage = Date.now();
          const type = packet.type;
          if (type === 'COMBAT_STATE' && Array.isArray(packet.data?.monsterSlots) &&
              mergeTargets(this.cache.targets, P.num(this.character()?.role?.mapId),
                packet.data.monsterSlots, P.farmMap(P.array(this.character()?.maps).find(
                  (map) => P.num(map.id) === P.num(this.character()?.role?.mapId)))))
            writeStorage(PREFIX + ':targets', { mapId: this.cache.targets.mapId,
              list: Array.from(this.cache.targets.list) });
          if (
            type === 'LOGIN_FAILED' ||
            (type === 'LOGIN_RESPONSE' && packet.success === false) ||
            (type === 'RECONNECT_RESPONSE' && packet.success === false)
          ) {
            this.authFailed = true;
            this.sessionReady = false;
          }
          if (type === 'ENTER_GAME_RESPONSE' && packet.success && packet.data?.role?.id) {
            this.sessionReady = true;
            this.authFailed = false;
            this.cache.activityStatus = {};
            this.cache.forgePreviews = {};
            this.cache.pets = null;
            this.cache.lottery = null;
            this.cache.arena = null;
            this.cache.arenaMatch = null;
            this.cache.trial = null;
          }
          if (
            type === 'CONSIGNMENT_LIST_RESPONSE' &&
            packet.success &&
            Array.isArray(packet.data?.items)
          ) {
            const market = this.cache.consignment;
            for (const item of packet.data.items)
              if (item && item.id != null) market.set(item.id, item);
            while (market.size > 4000) market.delete(market.keys().next().value);
          }
          if (type === 'GET_MONSTER_TMPL_RESPONSE' && packet.success && Array.isArray(packet.data)) {
            for (const entry of packet.data.filter((e) => e.template))
              this.cache.monsterTemplates.set(entry.category + ':' + entry.id, {
                category: entry.category, level: P.num(entry.template.level),
                base: Object.fromEntries(Object.keys(P.WEIGHTS).map((k) => [k, P.num(entry.template[k])])) });
            this.cache.monsterTemplatesAt = Date.now();
            writeStorage(PREFIX + ':monsters', { at: this.cache.monsterTemplatesAt, list: [...this.cache.monsterTemplates] });
          }
          if (type === 'GET_POTION_LIST_RESPONSE' && packet.success && Array.isArray(packet.data))
            this.cache.potions = copy(packet.data);
          if (
            type === 'ZL_STATUS_RESPONSE' &&
            packet.data &&
            typeof packet.data.claimedToday !== 'undefined' &&
            typeof packet.data.tokenCount !== 'undefined'
          ) {
            this.cache.activityStatus.zl = copy(packet.data);
            (this.cache.activityStamp || (this.cache.activityStamp = {})).zl = Date.now();
          }
          if (
            type === 'CAMP_STATUS_RESPONSE' &&
            packet.data &&
            typeof packet.data.remainingToday !== 'undefined'
          ) {
            this.cache.activityStatus.camp = copy(packet.data);
            (this.cache.activityStamp || (this.cache.activityStamp = {})).camp = Date.now();
          }
          if (type === 'WUSHUANG_STATUS_RESPONSE' && packet.data &&
              typeof packet.data.claimedToday !== 'undefined') {
            this.cache.activityStatus.wushuang = copy(packet.data);
            (this.cache.activityStamp || (this.cache.activityStamp = {})).wushuang = Date.now();
          }
          const data = packet.data;
          const lottery = type === 'ONLINE_LOTTERY_STATE' ? data :
            type === 'ONLINE_LOTTERY_RESPONSE' ? data?.state : null;
          if (lottery && typeof lottery.balance !== 'undefined')
            this.cache.lottery = { ...copy(lottery), at: Date.now() };
          if (type === 'PET_RESPONSE' && data?.state)
            this.cache.pets = { state: copy(data.state), at: Date.now() };
          if (type === 'ARENA_RESPONSE' && data) {
            const arena = this.cache.arena || (this.cache.arena = {});
            if (data.board) Object.assign(arena, { board: copy(data.board), at: Date.now() });
            if (data.action === 'open' && data.token)
              Object.assign(arena, { token: data.token, tokenAt: Date.now() });
          }
          const match = type === 'ARENA_STATE' ? data :
            type === 'ARENA_RESPONSE' && data?.action === 'challenge' ? data.battle : null;
          if (match) this.cache.arenaMatch = { ...copy(match), at: Date.now() };
          if (type === 'TRIAL_RESPONSE' && data?.trial)
            this.cache.trial = { trial: copy(data.trial), at: Date.now() };
          this.packetTypes.push({ type, time: this.lastMessage });
          this.packetTypes = this.packetTypes.slice(-40);
          const waiter = this.waiter;
          if (type === 'ERROR' && waiter)
            this.rejectWaiter(
              waiter,
              this.requestError(
                waiter,
                'SERVER_ERROR',
                waiter.label +
                  '：等待响应时服务器提示“' +
                  safeMessage(packet.message || '操作错误') +
                  '”',
                type,
              ),
            );
          this.recordStats?.(packet);
          this.filler?.response(packet);
          setTimeout(() => {
            try {
              this.syncState(packet);
              this.onMessage(type, packet);
            } catch (error) {
              if (waiter && this.waiter === waiter && matchesResponse(waiter, packet))
                this.rejectWaiter(
                  waiter,
                  this.requestError(
                    waiter,
                    'STATE_SYNC_FAILED',
                    waiter.label +
                      '：已收到响应，但角色状态更新失败（' +
                      safeMessage(error.message) +
                      '）',
                    type,
                  ),
                );
              else this.log('页面状态更新异常：' + safeMessage(error.message), 'warning');
              return;
            }
            if (waiter && this.waiter === waiter && matchesResponse(waiter, packet)) {
              if (waiter.interference)
                this.rejectWaiter(
                  waiter,
                  this.requestError(
                    waiter,
                    'INTERFERENCE',
                    '该动作同时被页面操作触发，暂停以核对结果',
                    type,
                  ),
                );
              else {
                this.waiter = null;
                clearTimeout(waiter.timer);
                waiter.resolve(packet);
              }
            }
          }, 0);
        });
      }
      get connected() {
        return this.socket?.readyState === 1;
      }
      pinia() {
        const app = document.querySelector('#app')?.__vue_app__;
        if (!app?._context?.provides) return null;
        for (const key of Reflect.ownKeys(app._context.provides)) {
          const value = app._context.provides[key];
          if (value?._s instanceof Map && value._s.has('character')) return value;
        }
        return null;
      }
      character() {
        return this.pinia()?._s.get('character') || null;
      }
      stores() {
        return this.pinia()?._s || new Map();
      }
      root() {
        return document.querySelector('#app')?._vnode || this.pinia()?._a?._instance?.vnode || null;
      }
      components() {
        const out = [],
          seen = new Set();
        const walk = (node) => {
          if (!node || typeof node !== 'object' || seen.has(node) || seen.size > 12000) return;
          seen.add(node);
          if (node.component) {
            out.push(node.component);
            walk(node.component.subTree);
          }
          if (Array.isArray(node.children)) node.children.forEach(walk);
          if (node.suspense) {
            walk(node.suspense.activeBranch);
            walk(node.suspense.pendingBranch);
          }
        };
        walk(this.root());
        return out;
      }
      battle() {
        const vm = this.components().find(
          (vm) =>
            vm.props?.player &&
            Array.isArray(vm.props.monsterSlots) &&
            typeof vm.props.stage === 'string',
        );
        return vm
          ? { stage: vm.props.stage, player: vm.props.player, vm }
          : { stage: 'idle', player: null, vm: null };
      }
      setBattle(start) {
        const battle = this.battle();
        if (!start && battle.stage !== 'idle') {
          const stop = battle.vm?.vnode?.props?.onStop;
          if (typeof stop === 'function') {
            stop();
            return true;
          }
        }
        if (start && battle.stage !== 'idle') return true;
        if (!start) return true;
        for (const vm of this.components()) {
          const items = vm.props?.items;
          if (!Array.isArray(items)) continue;
          const item = items.find((i) => i?.label === '战斗'),
            click = vm.vnode?.props?.onClick;
          if (item && typeof click === 'function') {
            click(item);
            return true;
          }
        }
        return false;
      }
      nativeNpc(id) {
        for (const vm of this.components()) {
          const candidates = vm.props?.npcs;
          if (!Array.isArray(candidates)) continue;
          const npc = candidates.find(
            (n) => n.id === id || (id === P.NPC.tailor && String(n.name).includes('裁缝')),
          );
          if (!npc) continue;
          const props = vm.vnode?.props || {};
          const fn = props.onNpcClick || props.onClickNpc || props.onClick;
          if (typeof fn === 'function') {
            fn(npc);
            return true;
          }
        }
        return false;
      }
      closeOwnedWindows() {
        for (const vm of this.components())
          if (
            [
              'GemShop',
              'SmithyShop',
              'TailorShop',
              'YuciExchangeDialog',
              'ShopWindow',
              'Inventory',
            ].includes(vm.type?.__name || vm.type?.name) &&
            vm.props?.modelValue === true &&
            typeof vm.emit === 'function'
          )
            vm.emit('update:modelValue', false);
      }
      state() {
        const c = this.character();
        if (!c?.role?.id) return null;
        const r = c.role,
          role = {};
        for (const k of [
          'id',
          'nickname',
          'level',
          'sect',
          'mapId',
          'money',
          'yuanbao',
          'currentExp',
          'settings',
          'smeltingItemId',
          'smeltingExp',
          'smeltingTargetExp',
        ])
          role[k] = r[k];
        const shop = this.stores().get('shop');
        return {
          role,
          pets: this.cache.pets ? { ...copy(this.cache.pets.state), at: this.cache.pets.at } : null,
          arena: this.cache.arena || null,
          lottery: this.cache.lottery || null,
          combat: this.statsRates?.() || null,
          arenaMatch: this.cache.arenaMatch || null,
          trial: this.cache.trial ? { ...this.cache.trial.trial, at: this.cache.trial.at } : null,
          combatPower: c.combatPower,
          warehouseEquipCount: Array.isArray(c.warehouseEquips) ? c.warehouseEquips.length : 0,
          warehouseEquips: copy(c.warehouseEquips) || [],
          equipments: copy(c.equipments) || [],
          bagItems: copy(c.bagItems) || [],
          skills: copy(c.skills) || [],
          maps: copy(c.maps) || [],
          equipSets: copy(c.equipSets) || [],
          levelTmpls: c.levelTmpls,
          gemInfos: c.gemInfos,
          allEquipTemplates: c.allEquipTemplates,
          shopItems: copy(shop?.items) || [],
          potionTemplates: this.cache.potions,
          finalAttributes: copy(c.finalAttributes),
          ...scoringState(c, this, this.scoringPrefs?.() || P.DEFAULTS),
          maxAttrs: { hp: P.num(c.finalAttributes?.hp), mp: P.num(c.finalAttributes?.mp) },
          activityStatus: this.cache.activityStatus,
          forgePreviews: this.cache.forgePreviews,
        };
      }
      reconnectVisible() {
        for (const s of this.stores().values())
          if (s.reconnectModal) return !!s.reconnectModal.show;
        return false;
      }
      expireActivityStatus() {
        for (const key of ['zl', 'camp', 'wushuang'])
          if (
            this.cache.activityStatus[key] &&
            Date.now() - P.num(this.cache.activityStamp?.[key]) > 300000
          )
            delete this.cache.activityStatus[key];
      }
      syncState(packet) {
        const c = this.character();
        if (!c) return;
        const t = packet.type,
          d = packet.data;
        const direct = [
          'ENTER_GAME',
          'LEVEL_UP',
          'UPGRADE_SKILL',
          'WAREHOUSE_DEPOSIT',
          'WAREHOUSE_WITHDRAW',
          'SHOP_BUY',
          'SHOP_SELL',
          'GEM_DRILL',
          'GEM_INLAY',
          'GEM_SYNTH',
          'GEM_REMOVE',
          'GEM_POLISH',
          'SMITHY_APPRAISAL',
          'SMITHY_ENHANCE',
          'SMITHY_SMELT_START',
          'SMITHY_SMELT_INVEST',
          'SMITHY_SMELT_COMPLETE',
          'SMITHY_REPAIR_ARTIFACT',
          'SMITHY_FORGE',
          'CRAFT_EQUIP',
          'YUCI_EXCHANGE',
          'WUSHUANG_CLAIM',
          'ZL_CLAIM_TOKEN',
          'ZL_ENTER',
          'CAMP_ENTER',
          'BEAR_ENTER',
        ];
        const nested = [
          'ARENA_RESPONSE', 'PET_RESPONSE', 'TRIAL_RESPONSE', 'ONLINE_LOTTERY_RESPONSE',
          'USE_ITEM_RESPONSE',
          'CALC_MONSTER_DROP_RESPONSE',
          'CALC_MAP_DROP_RESPONSE',
        ];
        const snapshot =
          direct.some((v) => t === v + '_RESPONSE') && d?.role
            ? d
            : nested.includes(t) && d?.roleInfo?.role
              ? d.roleInfo
              : null;
        if (
          snapshot &&
          typeof c.setCharacterData === 'function' &&
          (t === 'ENTER_GAME_RESPONSE' ||
            !c.role?.id ||
            P.num(c.role.id) === P.num(snapshot.role.id))
        ) {
          const current = this.state(),
            incoming = {
              role: snapshot.role,
              equipments: snapshot.equipments || [],
              bagItems: snapshot.bagItems || [],
              skills: snapshot.skills || [],
            };
          if (P.signature(current || {}) !== P.signature(incoming)) c.setCharacterData(snapshot);
        } else if (
          t === 'EQUIP_ITEM_RESPONSE' &&
          packet.success &&
          Array.isArray(d) &&
          typeof c.updateEquipments === 'function'
        )
          c.updateEquipments(d);
      }
      request(action, timeout) {
        if (!requestAllowed(action)) return Promise.reject(new Error('动作不在托管接口列表：' + action.type));
        if (!this.connected || !this.sessionReady)
          return Promise.reject(new Error('角色连接尚未恢复'));
        if (this.waiter) return Promise.reject(new Error('上一个动作尚未完成'));
        if (action.type === 'UPDATE_SETTINGS') {
          const c = this.character();
          if (c && action.setting) c.autoPotionSettings = copy(action.setting);
          this.sending = true;
          try {
            this.socket.send(JSON.stringify({ type: action.type, payload: action.payload }));
            if (c?.role && action.setting) {
              const current = P.parse(c.role.settings, {});
              const merged = current && typeof current === 'object' && !Array.isArray(current)
                ? current : {};
              merged.hp = action.setting.hp;
              merged.mp = action.setting.mp;
              c.role.settings = JSON.stringify(merged);
            }
            return Promise.resolve({
              type: 'UPDATE_SETTINGS_SENT',
              success: true,
              optimistic: true,
            });
          } finally {
            this.sending = false;
          }
        }
        if (['ARENA_COMMAND', 'PET_COMMAND', 'TRIAL_COMMAND', 'ONLINE_LOTTERY_COMMAND'].includes(action.type) || action.petHatch)
          action.payload = { ...action.payload, requestId:
            globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
              .replace(/[xy]/g, (c) => {
                const r = Math.floor(Math.random() * 16);
                return (c === 'x' ? r : (r & 3) | 8).toString(16);
              }) };
        return new Promise((resolve, reject) => {
          const waiter = {
            type: action.type,
            label: action.label || action.type,
            responseType: action.responseType || action.type + '_RESPONSE',
            requestId: action.payload.requestId,
            petHatch: action.petHatch,
            doubleExp: action.doubleExp,
            resolve,
            reject,
            interference: false,
            socket: this.socket,
            started: Date.now(),
          };
          waiter.timer = setTimeout(
            () =>
              this.rejectWaiter(
                waiter,
                this.requestError(
                  waiter,
                  'RESPONSE_TIMEOUT',
                  waiter.label + '：响应超时，结果未确认',
                ),
              ),
            timeout,
          );
          this.waiter = waiter;
          this.sending = true;
          try {
            this.socket.send(JSON.stringify({ type: action.type, payload: action.payload }));
          } catch (error) {
            this.rejectWaiter(
              waiter,
              this.requestError(
                waiter,
                'SEND_FAILED',
                waiter.label + '：请求发送失败（' + safeMessage(error.message) + '）',
              ),
            );
          } finally {
            this.sending = false;
          }
        });
      }
    }
    class MarketScore {
      static scoreCache = new WeakMap();
      static scorePrefs(prefs, type) {
        let cached = MarketScore.scoreCache.get(prefs);
        if (!cached) {
          cached = {};
          MarketScore.scoreCache.set(prefs, cached);
        }
        if (!cached[type]) {
          const scoring = type === 'power' ? 'linear' : 'combat';
          const weights = type === 'power' ? P.WEIGHTS : prefs.gear.weights;
          cached[type] = prefs.gear.scoring === scoring && prefs.gear.weights === weights
            ? prefs : { ...prefs, gear: { ...prefs.gear, scoring, weights } };
        }
        return cached[type];
      }
      static equipment(it, state) {
        if (!it) return null;
        if (!(P.num(it.itemType) === 1 || it.equipTmpl)) return null;
        const tmpl =
          it.equipTmpl ||
          state.allEquipTemplates?.get?.(P.num(it.itemId)) ||
          P.lookup(state.allEquipTemplates, it.itemId);
        if (!tmpl) return null;
        return { ...it, equipTmpl: tmpl, tmplId: it.tmplId ?? tmpl.id, isEquipped: 0 };
      }
      sortListings(list, mode, state, prefs) {
        if (mode === 'off' || !state) return null;
        const scoring = MarketScore.scorePrefs(prefs, 'combat');
        if (mode !== 'power' && P.combatWeights(state, scoring) === null) return null;
        const keys = new Map();
        for (const it of list) {
          if (keys.has(it)) continue;
          const eq = MarketScore.equipment(it, state);
          keys.set(it, eq ? { equipment: true, value: mode === 'power'
            ? P.scoreStats(P.equipmentStats(eq, state.gemInfos), P.WEIGHTS)
            : mode === 'combat' ? P.equipmentScore(eq, state, scoring)
            : P.projectedGain(eq, state, scoring).percent } : { equipment: false, value: 0 });
        }
        return (a, b) => {
          if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
          const x = keys.get(a), y = keys.get(b);
          return Number(y.equipment) - Number(x.equipment) || y.value - x.value || (b.id || 0) - (a.id || 0);
        };
      }
      static sortHook(original, isOpen, market) {
        return function (compare) {
          let selected = compare;
          try {
            const prefs = market.controller.prefs;
            if (prefs.market.showScore !== false && prefs.market.sort !== 'off' && isOpen() && this.length) {
              const first = this.find((it) => it != null);
              if (first && typeof first === 'object' && 'sellerName' in first && 'price' in first)
                selected = market.sortListings(this, prefs.market.sort, market.state(), prefs) || compare;
            }
          } catch { selected = compare; }
          return original.call(this, selected);
        };
      }
      constructor(controller) {
        this.controller = controller;
        if (typeof document === 'undefined') return;
        if (!MarketScore.sortInstalled) {
          Array.prototype.sort = MarketScore.sortHook(Array.prototype.sort,
            () => !!document.querySelector('.consignment-window'), this);
          MarketScore.sortInstalled = true;
        }
        if (typeof MutationObserver === 'undefined') return;
        this.timer = 0;
        this.observer = null;
        const boot = () => {
          if (this.observer || !document.documentElement) return;
          this.observer = new MutationObserver(() => this.schedule());
          this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
          });
          this.schedule();
        };
        if (document.documentElement) boot();
        else document.addEventListener('DOMContentLoaded', boot, { once: true });
      }
      schedule() {
        if (this.timer) return;
        this.timer = setTimeout(() => {
          this.timer = 0;
          try {
            this.scan();
          } catch {}
        }, 250);
      }
      read(card) {
        const price = card.querySelector('.price-number');
        let seller = '';
        for (const span of card.querySelectorAll('span')) {
          const m = span.textContent.match(/^\s*卖家:\s*(.*)$/);
          if (m) {
            seller = m[1].trim();
            break;
          }
        }
        return {
          name: (card.querySelector('.item-title')?.textContent || '').trim(),
          seller,
          price: P.num(String(price?.textContent || '').replace(/[^\d.]/g, ''), -1),
          currency: price?.classList.contains('yuanbao-price') ? 2 : 1,
        };
      }
      label(card, state, prefs) {
        const scoringPrefs = MarketScore.scorePrefs(prefs, prefs.market.scoreType);
        const info = this.read(card);
        if (!info.name || info.price < 0) return null;
        const matches = [];
        for (const it of this.controller.bridge.cache.consignment.values())
          if (
            it &&
            String(it.itemName || '').trim() === info.name &&
            String(it.sellerName || '').trim() === info.seller &&
            P.num(it.price) === info.price &&
            P.num(it.currency, 1) === info.currency
          )
            matches.push(it);
        const scored = [];
        for (const it of matches) {
          const eq = MarketScore.equipment(it, state);
          if (!eq) continue;
          scored.push({
            score: P.equipmentScore(eq, state, scoringPrefs),
            gain: P.projectedGain(eq, state, scoringPrefs),
          });
        }
        if (!scored.length) return null;
        const scores = scored.map((v) => Math.round(v.score)),
          min = Math.min(...scores),
          max = Math.max(...scores);
        if (min !== max)
          return {
            text: (prefs.market.scoreType === 'power' ? '战力 ' : '评分 ') + min + '~' + max + (scored[0].gain.pending ? ' · 待数据' : ''),
            color: scored[0].gain.pending ? '#9e9e9e' : '#ffd54f',
            title: (prefs.market.scoreType === 'power' ? '战力 ' : '') + '同名同价有多件不同属性的商品，评分范围 ' + min + '~' + max +
              (scored[0].gain.pending ? '\n实战评分等待战斗数据' : ''),
          };
        const gain = scored[0].gain;
        if (gain.pending || scoringPrefs.gear.scoring === 'combat') {
          const signed = (v) => (v >= 0 ? '+' : '') + v.toFixed(1);
          return { text: '评分 ' + min + (gain.pending ? ' · 待数据' :
            ' · ' + signed(gain.percent) + '%'),
            color: gain.pending ? '#9e9e9e' :
              gain.percent >= P.num(prefs.gear?.minGainPercent, 1) ? '#69f0ae' :
              gain.percent > 0 ? '#c5e1a5' : '#9e9e9e',
            title: '装备评分 ' + min + '\n' + (gain.pending ? '实战评分等待战斗数据' :
              '换上后实战评分 ' + signed(gain.percent) + '%（输出 ' +
              signed(gain.outputPercent) + '%，生存 ' + signed(gain.survivalPercent) + '%）'),
          };
        }
        const g = scored[0].gain,
          pct = g.percent,
          sign = pct > 0 ? '+' : '';
        const color =
          pct >= P.num(prefs.gear?.minGainPercent, 1) ? '#69f0ae' : pct > 0 ? '#c5e1a5' : '#9e9e9e';
        return {
          text: '战力 ' + min + ' · ' + sign + pct.toFixed(1) + '%',
          color,
          title:
            '战力 ' +
            min +
            '\n替换同部位后整套评分 ' +
            Math.round(g.current) +
            ' → ' +
            Math.round(g.after) +
            '（' +
            sign +
            pct.toFixed(1) +
            '%）\n含基础/附加属性、强化、鉴定、宝石与套装；按游戏战力权重',
        };
      }
      tipInfo(item, state, prefs) {
        if (!item?.equipTmpl) return null;
        const combatPrefs = MarketScore.scorePrefs(prefs, 'combat'),
          pending = P.combatWeights(state, combatPrefs) === null,
          compare = !item.isEquipped,
          gain = compare && !pending ? P.projectedGain(item, state, combatPrefs) : null,
          signed = (v) => (v >= 0 ? '+' : '') + v.toFixed(1);
        return {
          power: Math.round(P.equipmentScore(item, state, MarketScore.scorePrefs(prefs, 'power'))),
          score: Math.round(P.equipmentScore(item, state, combatPrefs)),
          pending,
          compare,
          powerUp: compare && P.projectedGain(item, state, MarketScore.scorePrefs(prefs, 'power')).gain > 0,
          combatUp: !!gain && gain.gain > 0,
          title: pending ? '实战评分等待战斗数据' : gain ?
            '换上后实战评分 ' + signed(gain.percent) + '%（输出 ' +
            signed(gain.outputPercent) + '%，生存 ' + signed(gain.survivalPercent) + '%）' : '',
        };
      }
      drawTip(el, info, item) {
        const row = el.querySelector('.tooltip-row');
        if (!info || !row) return;
        const gamePower = [...el.querySelectorAll('.tooltip-power')]
          .find((node) => !node.className.split(/\s+/).includes('tl-tip-score'));
        if (gamePower) return this.drawGameTip(el, gamePower, info, item);
        const sibling = row.nextElementSibling,
          anchor = sibling?.textContent.trim().startsWith('收益') ? sibling : row,
          key = JSON.stringify([item, info]),
          oldPower = el.querySelector('.tl-tip-power'),
          oldLines = el.querySelectorAll('.tl-tip-score');
        if (oldPower && oldPower._tipKey === key && oldLines.length === 2 &&
            anchor.nextElementSibling === oldPower && oldPower.nextElementSibling === oldLines[1]) return;
        for (const node of el.querySelectorAll('.tl-tip-score, .tl-tip-arrow')) node.remove();
        const power = document.createElement('div'),
          line = document.createElement('div');
        power.className = 'tl-tip-score tl-tip-power';
        line.className = 'tl-tip-score';
        for (const node of [power, line]) {
          node.style.cssText = 'color:#ddd0b6;font-size:12px';
          for (const attr of row.attributes)
            if (attr.name.startsWith('data-v-')) node.setAttribute(attr.name, attr.value);
        }
        power.textContent = '战斗力: ' + info.power.toLocaleString();
        power._tipKey = key;
        line.textContent = '实战评分: ' + (info.pending ? '待战斗数据' : info.score.toLocaleString());
        line.title = info.title;
        anchor.parentNode.insertBefore(power, anchor.nextSibling);
        power.parentNode.insertBefore(line, power.nextSibling);
        const arrow = (parent, up) => {
          const span = document.createElement('span');
          span.className = 'tl-tip-arrow';
          span.textContent = up ? ' △' : ' ▽';
          span.style.color = up ? '#69f0ae' : '#ef5350';
          parent.appendChild(span);
        };
        if (info.compare) {
          arrow(power, info.powerUp);
          if (!info.pending) arrow(line, info.combatUp);
        }
      }
      drawGameTip(el, power, info, item) {
        const key = JSON.stringify([item, info]),
          lines = el.querySelectorAll('.tl-tip-score'),
          line = lines[0],
          powerArrows = power.querySelectorAll('.tl-tip-arrow');
        if (lines.length === 1 && line._tipKey === key && power.nextElementSibling === line &&
            powerArrows.length === (info.compare ? 1 : 0) &&
            line.querySelectorAll('.tl-tip-arrow').length === (info.compare && !info.pending ? 1 : 0)) return;
        for (const node of el.querySelectorAll('.tl-tip-score, .tl-tip-arrow')) node.remove();
        const score = document.createElement('div');
        score.className = power.className + ' tl-tip-score';
        for (const attr of power.attributes)
          if (attr.name.startsWith('data-v-')) score.setAttribute(attr.name, attr.value);
        score.textContent = '实战评分: ' + (info.pending ? '待战斗数据' : info.score.toLocaleString());
        score.title = info.title;
        score._tipKey = key;
        power.parentNode.insertBefore(score, power.nextSibling);
        if (!info.compare) return;
        this.tipArrow(power, info.powerUp);
        if (!info.pending) this.tipArrow(score, info.combatUp);
      }
      tipArrow(parent, up) {
        const span = document.createElement('span');
        span.className = 'tl-tip-arrow';
        span.textContent = up ? ' △' : ' ▽';
        span.style.color = up ? '#69f0ae' : '#ef5350';
        parent.appendChild(span);
      }
      profileScore(stats, state, prefs) {
        const value = P.characterScore(stats, state, MarketScore.scorePrefs(prefs, 'combat'));
        return {
          score: Math.round(value),
          pending: value === null,
        };
      }
      state() {
        const c = this.controller.bridge.character();
        return c?.role?.id
          ? {
              role: c.role,
              skills: copy(c.skills),
              finalAttributes: copy(c.finalAttributes),
              ...scoringState(c, this.controller.bridge, this.controller.prefs),
              equipments: c.equipments,
              warehouseEquips: c.warehouseEquips,
              equipSets: c.equipSets,
              gemInfos: c.gemInfos,
              allEquipTemplates: c.allEquipTemplates,
            }
          : null;
      }
      scanSort() {
        const game = document.querySelectorAll('.consignment-window .sort-select')[0], prefs = this.controller.prefs;
        if (prefs.market.showScore === false) {
          for (const node of document.querySelectorAll('.tl-market-sort')) node.remove();
          return;
        }
        if (!game) return;
        let select = game.parentNode.querySelector('.tl-market-sort');
        if (!select) {
          select = document.createElement('select');
          select.className = 'filter-select tl-market-sort';
          for (const attr of game.attributes)
            if (attr.name.startsWith('data-v-')) select.setAttribute(attr.name, attr.value);
          for (const [value, text] of [['off', '脚本排序：关'], ['power', '⚔️ 战斗力从高到低'],
            ['combat', '🎯 实战评分从高到低'], ['gain', '📈 实战提升从高到低']]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
          }
          game.after(select);
          select.addEventListener('change', () => {
            const current = this.controller.prefs;
            this.controller.updateConfig({ ...current, market: { ...current.market, sort: select.value } });
            const value = game.value;
            game.value = Array.from(game.options).find((option) => option.value !== value).value;
            game.dispatchEvent(new Event('change', { bubbles: true }));
            game.value = value;
            game.dispatchEvent(new Event('change', { bubbles: true }));
            this.scanSort();
          });
        }
        select.value = prefs.market.sort;
        select.title = ['combat', 'gain'].includes(prefs.market.sort) &&
          !this.sortListings([], prefs.market.sort, this.state(), prefs)
          ? '实战评分等待战斗数据，暂按游戏排序' : '';
      }
      scan() {
        this.scanSort();
        const cards = document.querySelectorAll('.consignment-window .market-item-card'),
          grids = document.querySelectorAll('.inventory-grid, .warehouse-grid'),
          profiles = document.querySelectorAll('.stats-area'),
          tips = document.querySelectorAll('.tlbb-tooltip');
        if (this.controller.prefs.market.tipScore === false)
          for (const node of document.querySelectorAll('.tl-tip-score, .tl-tip-arrow, .tl-profile-score')) node.remove();
        if (!cards.length && !grids.length && !tips.length && !profiles.length) return;
        const prefs = this.controller.prefs,
          state = this.state();
        if (tips.length && state && prefs.market.tipScore !== false) {
          const items = new Map();
          for (const vm of this.controller.bridge.components())
            if (vm.type?.__name === 'ItemTooltip') items.set(vm.subTree?.el, vm.props.item);
          for (const tip of tips) {
            const item = items.get(tip);
            this.drawTip(tip, this.tipInfo(item, state, prefs), item);
          }
        }
        if (profiles.length && state && prefs.market.tipScore !== false) {
          const instances = Array.from(this.controller.bridge.components()).filter((vm) =>
            vm.type?.__name === 'CharacterProfile' && vm.props?.modelValue);
          for (const el of profiles) {
            const vm = instances.find((v) => v.subTree?.el === el || v.subTree?.el?.contains(el));
            if (!vm && instances.some((v) => v.props.statsOverride != null)) continue;
            const header = el.firstElementChild;
            if (!header) continue;
            const info = this.profileScore(vm?.props.statsOverride ?? state.finalAttributes, state, prefs),
              text = '实战评分 ' + (info.pending ? '待战斗数据' : info.score.toLocaleString());
            let line = el.querySelector('.tl-profile-score');
            if (!line) {
              line = document.createElement('div');
              line.className = 'tl-profile-score';
              const style = getComputedStyle(header);
              line.style.cssText = 'text-align:right;color:#69f0ae;font-size:' + style.fontSize +
                ';font-weight:' + style.fontWeight + ';';
              el.insertBefore(line, header.nextSibling);
            }
            if (line.textContent !== text) line.textContent = text;
          }
        }
        if (cards.length) this.scanMarket(cards, prefs.market?.showScore !== false ? state : null, prefs);
        if (grids.length) this.scanBag(grids, prefs.market?.bagScore !== false ? state : null, prefs);
      }
      // Inventory equip tab: slot i renders the i-th unequipped equipment in store order.
      bagList(grid, state) {
        if (!state) return null;
        const slots = Array.from(grid.children).filter((n) => n.classList?.contains('grid-slot'));
        if (!slots.length) return null;
        let root = grid,
          tab = null;
        for (let i = 0; root && !tab; i++) {
          root = root.parentElement;
          tab = root?.querySelector('.game-tab-button.is-active');
        }
        if (!tab || tab.textContent.trim() !== '装备') return null;
        const warehouse = grid.classList.contains('warehouse-grid'),
          items = P.array(warehouse ? state.warehouseEquips : state.equipments)
            .filter((e) => e.equipTmpl && (warehouse || !e.isEquipped));
        const filled = slots.filter((n) => !n.classList.contains('empty-slot')).length;
        if (filled !== Math.min(items.length, slots.length)) return null;
        return { slots, items };
      }
      bagLabel(eq, state, prefs) {
        const scoringPrefs = MarketScore.scorePrefs(prefs, prefs.market.bagScoreType);
        const score = Math.round(P.equipmentScore(eq, state, scoringPrefs)),
          gain = P.projectedGain(eq, state, scoringPrefs),
          pct = gain.percent,
          sign = pct > 0 ? '+' : '',
          up = pct >= P.num(prefs.gear?.minGainPercent, 1),
          short = score >= 10000 ? (score / 10000).toFixed(score >= 100000 ? 0 : 1) + '万' : String(score);
        if (gain.pending || scoringPrefs.gear.scoring === 'combat') {
          const signed = (v) => (v >= 0 ? '+' : '') + v.toFixed(1);
          return { text: (!gain.pending && pct > 0 ? '▲' : '') + short,
            color: gain.pending ? '#e0e0e0' : up ? '#69f0ae' : pct > 0 ? '#c5e1a5' : '#e0e0e0',
            title: '战力 ' + score + '\n' + (gain.pending ? '实战评分等待战斗数据' :
              '换上后实战评分 ' + signed(pct) + '%（输出 ' + signed(gain.outputPercent) +
              '%，生存 ' + signed(gain.survivalPercent) + '%）'),
          };
        }
        return {
          text: (pct > 0 ? '▲' : '') + short,
          color: up ? '#69f0ae' : pct > 0 ? '#c5e1a5' : '#e0e0e0',
          title:
            '战力 ' +
            score +
            '\n替换同部位后整套 ' +
            Math.round(gain.current) +
            ' → ' +
            Math.round(gain.after) +
            '（' +
            sign +
            pct.toFixed(1) +
            '%）',
        };
      }
      scanBag(grids, state, prefs) {
        for (const grid of grids) {
          const list = this.bagList(grid, state),
            slots = list?.slots || Array.from(grid.querySelectorAll('.grid-slot'));
          slots.forEach((slot, i) => {
            const old = slot.querySelector(':scope > .tl-bag-score'),
              eq = list ? list.items[i] : null,
              want = eq && !slot.classList.contains('empty-slot') ? this.bagLabel(eq, state, prefs) : null;
            if (!want) {
              old?.remove();
              return;
            }
            const el = old || document.createElement('span');
            if (!old) {
              el.className = 'tl-bag-score';
              el.style.cssText =
                'position:absolute;left:1px;bottom:0;font-size:9px;line-height:1;font-weight:700;text-shadow:1px 1px 1px #000,-1px -1px 1px #000;pointer-events:none;z-index:1;white-space:nowrap;';
              slot.appendChild(el);
            }
            if (el.textContent !== want.text) el.textContent = want.text;
            if (el.dataset.color !== want.color) {
              el.dataset.color = want.color;
              el.style.color = want.color;
            }
          });
        }
      }
      scanMarket(cards, state, prefs) {
        for (const card of cards) {
          const row = card.querySelector('.item-title')?.parentElement,
            old = Array.from(card.querySelectorAll('.tl-market-score'));
          const want = state && row ? this.label(card, state, prefs) : null;
          const keep = want && old.find((n) => n.parentElement === row);
          for (const n of old) if (n !== keep) n.remove();
          if (!want) continue;
          const el = keep || document.createElement('span');
          if (!keep) {
            el.className = 'tl-market-score';
            el.style.cssText =
              'font-size:11px;line-height:16px;padding:0 6px;border:1px solid currentColor;border-radius:4px;white-space:nowrap;font-weight:600;';
            row.appendChild(el);
          }
          if (el.textContent !== want.text) el.textContent = want.text;
          if (el.title !== want.title) el.title = want.title;
          if (el.dataset.color !== want.color) {
            el.dataset.color = want.color;
            el.style.color = want.color;
          }
        }
      }
    }
    class Controller {
      constructor() {
        this.prefs = P.config(readStorage(CONFIG, {}));
        writeStorage(CONFIG, this.prefs);
        this.enabled = !!(
          (this.prefs.resumeAfterReload || this.prefs.reconnect.autoReload) &&
          readStorage(RUNNING, false)
        );
        this.reason = '等待游戏角色';
        this.logs = [];
        this.busy = false;
        this.action = null;
        this.suppressed = new Map();
        this.id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
        this.ledger = null;
        this.roleId = 0;
        this.activity = null;
        this.deaths = [];
        this.penalty = 0;
        this.lastDeathKey = '';
        this.lastLocal = 0;
        this.idleSince = 0;
        this.lastSettings = 0;
        this.manualUntil = 0;
        this.reloads = readStorage(PREFIX + ':reloads', []);
        this.bridge = new Bridge((text, level) => this.log(text, level));
        this.bridge.onMessage = (type, packet) => this.received(type, packet);
        this.bridge.recordStats = (packet) => {
          const own = this.bridge.character()?.role,
            sent = packet.data?.roleInfo?.role || packet.data?.role,
            role = sent && (!own || sent.id === own.id) ? sent : own;
          this.ensureStats(role?.id);
          if (!role || !this.stats) return;
          let settings = packet.type === 'COMBAT_REWARD' ? role.settings || {} : {};
          try { if (typeof settings === 'string') settings = JSON.parse(settings); } catch { settings = {}; }
          this.stats.record(packet, { roleId: role.id, mapId: role.mapId,
            doubleExp: settings.doubleExp?.buffExpireTime > Date.now(),
            potionPrice: (name) => Number(arraySafe(this.bridge.cache.potions).find((p) => p.name === name)?.price) || 0 });
        };
        this.bridge.statsRates = () => this.stats?.rates() || null;
        this.bridge.scoringPrefs = () => this.prefs;
        this.bridge.pressure = (maps) => this.stats?.pressure((id) => P.farmMap(P.array(maps).find((m) => P.num(m.id) === id)));
        window.addEventListener('pagehide', () => this.stats?.flush());
        this.bridge.onDisconnect = () => {
          this.reason = '等待原游戏重连';
          if (!this.prefs.reconnect.enabled) this.pause('连接中断，自动恢复已关闭');
        };
        this.paint = () => {};
        this.keepAwake = createKeepAwake(PREFIX + ':keep-awake');
        this.keepAwakeLogged = null;
        this.timer = createTicker(
          () => this.tick().catch((e) => this.pause(e.message)),
          (e) => this.log('Worker 计时失效，改用主线程计时（后台会降频）：' + e, 'warning'),
        );
        this.timer.set(this.prefs.tickMs);
        this.log(
          this.timer.mode === 'worker'
            ? '计时器：Worker（后台不降频）'
            : '计时器：主线程（Worker 不可用，后台会降频）',
        );
        this.installInteractionPause();
        this.market = new MarketScore(this);
      }
      ensureStats(id) {
        if (!id || this.statsRoleId === id) return;
        this.stats?.flush();
        this.statsRoleId = id;
        const key = PREFIX + ':stats:' + id;
        this.stats = new Stats({ now: () => Date.now(), read: () => readStorage(key, null),
          write: (value) => writeStorage(key, value) });
      }
      installInteractionPause() {
        for (const type of ['pointerdown', 'keydown'])
          document.addEventListener(
            type,
            (e) => {
              if (e.isTrusted && !e.composedPath().some((el) => el?.id === 'tl-autopilot-host'))
                this.manualUntil = Date.now() + 5000;
            },
            true,
          );
        document.addEventListener('visibilitychange', () => {
          if (this.enabled) this.tick().catch(() => {});
        });
      }
      log(text, level = 'info') {
        this.logs.unshift({
          time: new Date().toLocaleTimeString(),
          level,
          text: String(text).slice(0, 260),
        });
        this.logs = this.logs.slice(0, 120);
        this.paint();
      }
      ledgerKey() {
        return PREFIX + ':ledger:' + this.roleId + ':' + day();
      }
      saveLedger() {
        if (this.ledger) writeStorage(this.ledgerKey(), this.ledger);
      }
      setRole(id) {
        if (this.roleId !== id || this.ledger?.day !== day()) {
          this.roleId = id;
          this.ledger = P.normalizeLedger(readStorage(this.ledgerKey(), null), day());
          this.saveLedger();
          this.activity = null;
          this.suppressed.clear();
          this.bridge.cache.activityStatus = {};
        }
      }
      leaseKey() {
        return PREFIX + ':lease:' + this.roleId;
      }
      acquireLease() {
        const now = Date.now(),
          lease = readStorage(this.leaseKey(), null);
        if (lease?.id !== this.id && lease?.until > now) return false;
        writeStorage(this.leaseKey(), { id: this.id, until: now + 15000 });
        return readStorage(this.leaseKey(), {}).id === this.id;
      }
      releaseLease() {
        const lease = readStorage(this.leaseKey(), null);
        if (lease?.id === this.id)
          try {
            localStorage.removeItem(this.leaseKey());
          } catch {}
      }
      async start() {
        if (this.busy) {
          this.log('当前动作尚未完成，等待响应后再开始', 'warning');
          return;
        }
        const wasUncertain = !!this.uncertain;
        if (wasUncertain && this.bridge.connected && this.bridge.sessionReady) {
          const s = this.bridge.state();
          if (!s) return;
          this.setRole(P.num(s.role.id));
        this.cleanPetLedger(s.pets);
          this.enabled = false;
          await this.execute({
            kind: 'request',
            type: 'ENTER_GAME',
            payload: {},
            label: '重新读取角色，核对上个动作结果',
            family: 'read',
            moneyCost: 0,
            expCost: 0,
            readOnly: true,
            key: 'reconcile-role',
          });
          if (this.uncertain) return;
        }
        this.enabled = true;
        writeStorage(RUNNING, true);
        this.reason = '正在检查角色与策略';
        if (!wasUncertain) this.suppressed.clear();
        this.log('完整托管已开始');
        this.tick().catch((e) => this.pause(e.message));
      }
      pause(reason = '已暂停托管') {
        this.enabled = false;
        writeStorage(RUNNING, false);
        this.reason = reason;
        this.releaseLease();
        this.log(reason, 'warning');
      }
      stopBattle() {
        const stopped = this.bridge.setBattle(false);
        this.reason = stopped ? '原游戏战斗已停止' : '未找到战斗停止入口';
        this.paint();
        return stopped;
      }
      updateConfig(value) {
        this.prefs = P.config(value);
        this.filler?.schedule();
        writeStorage(CONFIG, this.prefs);
        this.timer.set(this.prefs.tickMs);
        this.lastSettings = 0;
        this.suppressed.clear();
        this.log('策略配置已保存');
        if (this.updates) {
          if (this.prefs.updates.checkDaily) {
            this.updates.start();
            this.updates.check().catch(() => {});
          } else this.updates.stop();
        }
        return copy(this.prefs);
      }
      preview() {
        const s = this.bridge.state();
        if (!s) return [];
        this.setRole(P.num(s.role.id));
        this.cleanPetLedger(s.pets);
        return P.plans(s, this.prefs, this.ledger)
          .map((a) => ({
            type: a.type,
            label: a.label,
            coinCost: a.moneyCost,
            expCost: a.expCost,
            requiresTown: a.requiresTown,
          }))
          .slice(0, 12);
      }
      status() {
        const s = this.bridge.state(),
          battle = this.bridge.battle(),
          today = day(),
          roleId = P.num(s?.role?.id);
        const sourceLedger = roleId
          ? this.roleId === roleId && this.ledger?.day === today
            ? this.ledger
            : readStorage(PREFIX + ':ledger:' + roleId + ':' + today, null)
          : null;
        const ledger = roleId ? P.normalizeLedger(sourceLedger, today) : null;
        const experienceBudgets = ledger
          ? {
              skill: P.experienceBudget(this.prefs, ledger, 'skill'),
              smelt: P.experienceBudget(this.prefs, ledger, 'smelt'),
            }
          : null;
        const skillUp = P.skillProgress(s, this.prefs, ledger);
        if (skillUp?.ready) {
          const sk = P.array(s.skills).find((v) => P.num(v.id) === skillUp.skill);
          const key = 'UPGRADE_SKILL:' + JSON.stringify({ roleSkillId: skillUp.skill }) + ':level=' + P.num(sk?.currentLevel);
          if (!this.enabled) skillUp.reason += '；点击“开始托管”后继续';
          else if ((this.suppressed.get(key) || 0) > Date.now())
            skillUp.reason += '；上次升级未确认，暂缓重试';
          else if (P.levelProgress(s, this.prefs, ledger)?.ready && !this.prefs.growth.skillBeforeLevel)
            skillUp.reason += '；排在人物升级之后';
        }
        const levelUp = P.levelProgress(s, this.prefs, ledger);
        if (levelUp?.ready) {
          const key = 'LEVEL_UP:{}:level=' + levelUp.currentLevel;
          if (!this.enabled)
            Object.assign(levelUp, {
              ready: false,
              code: 'paused',
              reason: '人物升级条件已满足；点击“开始托管”后继续',
            });
          else if (this.uncertain)
            Object.assign(levelUp, {
              ready: false,
              code: 'uncertain',
              reason: '上个动作结果待核对，人物升级暂缓',
            });
          else if ((this.suppressed.get(key) || 0) > Date.now())
            Object.assign(levelUp, {
              ready: false,
              code: 'deferred',
              reason: '上次人物升级尚待复查，暂缓重试',
            });
          else if (
            [20050, 20051, 20052].includes(P.num(s.role.mapId)) ||
            (this.activity && this.activity.mapId === P.num(s.role.mapId))
          )
            Object.assign(levelUp, {
              ready: false,
              code: 'activity',
              reason: '活动结束后继续人物升级',
            });
        }
        return {
          stats: this.stats ? { summary: this.stats.summary(), rates: this.stats.rates() } : null,
          potions: Object.fromEntries(['HP', 'MP'].map((attr) => {
            const pick = s?.role ? P.potionPick(s, this.prefs, attr, Date.now()) : null;
            return [attr.toLowerCase(), pick ? { name: pick.template.name, need: pick.need, perSecond: pick.perSecond, reason: pick.reason } : null];
          })),
          threshold: s?.role ? P.potionThreshold(s, this.prefs, Date.now()) : this.prefs.potions.hpThreshold,
          enabled: this.enabled,
          connected: this.bridge.connected,
          ready: this.bridge.sessionReady,
          reason: this.reason,
          busy: this.busy,
          action: this.action?.label || '',
          role: s?.role
            ? {
                id: s.role.id,
                nickname: s.role.nickname,
                level: s.role.level,
                money: s.role.money,
                currentExp: s.role.currentExp,
                mapId: s.role.mapId,
              }
            : null,
          map: s ? P.roleMap(s)?.name || String(s.role.mapId) : '',
          stage: battle.stage,
          activity: this.activity?.name || '',
          budget: copy(this.prefs.budget),
          experienceBudgets,
          levelUp,
          skillUp,
          arena: s?.arena?.board ? { rank: s.arena.board.ownRank,
            attempts: ledger?.arena.attempts ?? 0, liked: s.arena.board.liked,
            reward: s.arena.board.reward } : null,
          hidden: s?.trial?.weapon ? { level: s.trial.level, quality: s.trial.weapon.quality,
            sand: s.trial.balances?.sand, jade: s.trial.balances?.jade,
            seals: s.trial.balances?.seals } : null,
          ledger: ledger ? copy(ledger) : null,
          lastFailure: this.lastFailure ? copy(this.lastFailure) : null,
          updates: this.updates ? this.updates.status() : null,
          logs: this.logs.slice(0, 40),
          scoring: { mode: this.prefs.gear.scoring,
            ...P.scoringStatus(s, this.prefs),
            pending: this.prefs.gear.scoring === 'combat' && !P.combatWeights(s, this.prefs),
            weights: P.combatWeights(s, this.prefs) },
          pets: { count: s?.pets?.pets.length ?? null, capacity: s?.pets?.capacity ?? null,
            active: s?.pets?.pets.find((entry) => entry.pet.id === s.pets.activePetId) || null,
            eggs: s ? P.petEggs(s).reduce((sum, item) => sum + P.num(item.count), 0) : null,
            list: s?.pets?.pets || null },
          version: '0.2.14',
        };
      }
      received(type, packet) {
        if (type === 'ENTER_GAME_RESPONSE' && packet.success) {
          this.uncertain = false;
          if (this.lastFailure && !this.lastFailure.reconciledAt)
            this.lastFailure.reconciledAt = new Date().toISOString();
          this.reason = this.enabled ? '连接恢复，重新读取角色与计划' : '角色已就绪';
          if (this.enabled) this.log('角色快照已恢复，继续核对托管计划');
        }
        if (type === 'WUSHUANG_CLAIM_RESPONSE' && packet.success)
          this.bridge.cache.activityStatus.wushuang = {
            ...this.bridge.cache.activityStatus.wushuang, claimedToday: true,
          };
        if (type === 'ZL_CLAIM_TOKEN_RESPONSE' && packet.success)
          delete this.bridge.cache.activityStatus.zl;
        if (type === 'ZL_ENTER_RESPONSE' && packet.success)
          delete this.bridge.cache.activityStatus.zl;
        if (type === 'CAMP_ENTER_RESPONSE' && packet.success)
          delete this.bridge.cache.activityStatus.camp;
        this.paint();
      }
      suppress(a, ms = 300000) {
        this.suppressed.set(a.key, Date.now() + ms);
      }
      charge(a) {
        if (a.readOnly || a.noResponse) return;
        this.ledger.money += a.moneyCost || 0;
        P.recordExperience(this.ledger, a.type, a.expCost);
        this.ledger.ops[a.family] = P.num(this.ledger.ops[a.family]) + 1;
        if (a.stockItemId) {
          this.ledger.restock = this.ledger.restock || {};
          this.ledger.restock[a.stockItemId] = true;
        }
        this.saveLedger();
      }
      cleanPetLedger(state) {
        if (!state) return;
        const ids = (this.ledger.petHatched || []).filter((id) =>
          state.pets.some((entry) => entry.pet.id === id && P.petScreenable(entry, state)));
        if (JSON.stringify(ids) !== JSON.stringify(this.ledger.petHatched)) {
          this.ledger.petHatched = ids;
          this.saveLedger();
        }
      }
      async execute(a) {
        if (!this.acquireLease()) {
          this.reason = '此角色已在另一标签页托管';
          return;
        }
        const arenaClaim = a.type === 'ARENA_COMMAND' && a.payload.action === 'claim';
        const lotteryDraw = a.type === 'ONLINE_LOTTERY_COMMAND' && a.payload.action === 'draw';
        const trialAction = a.type === 'TRIAL_COMMAND' && a.payload.action !== 'status',
          trialSignature = () => JSON.stringify(['revision', 'balances', 'inbox', 'weapon', 'level']
            .map((key) => this.bridge.cache.trial?.trial?.[key])),
          trialBefore = trialAction ? trialSignature() : null;
        const petSignature = () => JSON.stringify(['pets', 'activePetId', 'pendingRewards']
          .map((key) => this.bridge.cache.pets?.state?.[key]));
        const petBefore = petSignature();
        const before = this.bridge.state();
        if (!before) return;
        const check = P.materialCheck(a, before, this.prefs);
        if (!check.ok || !P.allowed(a, before, this.prefs, this.ledger)) {
          this.reason = a.label + '：' + (check.ok ? '当前资源或预算不足' : check.reason);
          this.log(this.reason, 'warning');
          this.suppress(a, 60000);
          this.lastLocal = Date.now();
          this.paint();
          return;
        }
        this.busy = true;
        this.action = a;
        this.reason = a.label;
        this.charge(a);
        // Stamped before sending: an unanswered request must not lead to a second pill.
        if (a.doubleExp) {
          this.ledger.tianlingUsedAt = Date.now();
          this.saveLedger();
        }
        this.log(a.label);
        this.paint();
        try {
          const result = await this.bridge.request(a, this.prefs.requestTimeoutMs);
          if (a.petHatch && (result.success ?? result.code === 200)) {
            await this.bridge.request({ type: 'PET_COMMAND', payload: { action: 'list', petId: '' },
              responseType: 'PET_RESPONSE', readOnly: true }, this.prefs.requestTimeoutMs);
            const oldIds = new Set((before.pets?.pets || []).map((entry) => entry.pet.id));
            const added = (this.bridge.state()?.pets?.pets || []).filter((entry) => !oldIds.has(entry.pet.id));
            // Only an unambiguous result is screened: exactly one new pet. Anything else stays untouched.
            if (added.length === 1) {
              this.ledger.petHatched = [...new Set([...(this.ledger.petHatched || []), added[0].pet.id])];
              this.log('孵化成功：' + added[0].speciesName + '，资质均值 ' + added[0].average);
            } else this.log('孵化后新增珍兽数量为 ' + added.length + '，无法确认是哪一只，不做筛选', 'warning');
            this.saveLedger();
          }
          const after = this.bridge.state() || before;
          if (!a.readOnly && !a.noResponse) {
            const extraMoney = Math.max(
                0,
                P.num(before.role.money) - P.num(after.role.money) - (a.moneyCost || 0),
              ),
              extraExp = Math.max(
                0,
                P.num(before.role.currentExp) - P.num(after.role.currentExp) - (a.expCost || 0),
              );
            this.ledger.money += extraMoney;
            P.recordExperience(this.ledger, a.type, extraExp);
          }
          const success = result.success ?? result.code === 200;
          if (!success && a.doubleExp) {
            this.ledger.tianlingUsedAt = 0;
            this.saveLedger();
          }
          if (success && a.type === 'PET_COMMAND' && ['lock', 'release'].includes(a.payload.action))
            this.ledger.petHatched = (this.ledger.petHatched || []).filter((id) => id !== a.payload.petId);
          this.cleanPetLedger(after.pets);
          if (arenaClaim) {
            if (this.bridge.cache.arena) this.bridge.cache.arena.token = '';
            // The action key holds the token, so a refusal is remembered in the ledger:
            // a refused claim costs one town trip a day at most.
            if (!success) this.ledger.arena.claimFailed = true;
          }
          if (a.type === 'ARENA_COMMAND' && a.payload.action === 'challenge') {
            if (this.bridge.cache.arena) this.bridge.cache.arena.token = '';
            if (success && result.data?.battle) {
              this.ledger.arena.attempts++;
              this.arenaPending = { matchId: result.data.battle.matchId,
                target: a.arenaTarget, started: Date.now() };
            }
          }
          if (success && a.stockItemId) {
            if (P.countItem(after, a.stockItemId) <= P.countItem(before, a.stockItemId))
              throw new Error('购药后库存变化未确认');
            if (P.countItem(after, a.stockItemId) >= this.prefs.shop.targetStock)
              delete this.ledger.restock[a.stockItemId];
          }
          if (a.type === 'SMITHY_FORGE_PREVIEW' && Array.isArray(result.data))
            this.bridge.cache.forgePreviews[a.payload.sectionBagId] = copy(result.data);
          if (success && a.activity) {
            this.ledger.activities[a.activity] = P.num(this.ledger.activities[a.activity]) + 1;
            this.activity = {
              name: a.activity,
              mapId: P.num(after.role.mapId),
              started: Date.now(),
            };
          }
          if (success && ['CRAFT_EQUIP', 'SMITHY_FORGE', 'YUCI_EXCHANGE'].includes(a.type)) {
            const oldIds = new Set(before.equipments.map((e) => P.num(e.id)));
            for (const e of after.equipments)
              if (!oldIds.has(P.num(e.id))) this.ledger.keptEquipIds.push(P.num(e.id));
            this.ledger.keptEquipIds = [...new Set(this.ledger.keptEquipIds)].slice(-500);
          }
          if (a.type === 'SMITHY_FORGE')
            delete this.bridge.cache.forgePreviews[a.payload.sectionBagId];
          if (a.noResponse) {
            this.lastSettings = Date.now();
            this.log('自动回复策略已应用');
          } else if (!success) {
            this.log(a.label + '：' + (result.message || '操作未成功'), 'warning');
            // A full bag must not cause a town trip every five minutes.
            this.suppress(a, lotteryDraw || a.type === 'GET_MONSTER_TMPL' ? 1800000 : 300000);
          } else {
            this.log(a.label + '：完成', 'success');
            const reward = lotteryDraw && result.data?.receipt?.reward;
            if (reward) this.log('抽奖获得：' + (['GOLD', 'GIFT'].includes(reward.kind)
              ? P.num(reward.amount).toLocaleString() + ' ' + reward.name
              : reward.name + ' ×' + reward.count + (reward.bound ? '（绑定）' : '（不绑定）')), 'success');
            if (!lotteryDraw && !a.readOnly && !a.activity &&
                !(a.family === 'arena' && ['open', 'list', 'challenge'].includes(a.payload.action)) &&
                (a.type === 'PET_COMMAND' ? petBefore === petSignature() :
                  trialAction ? trialBefore === trialSignature() : P.signature(before) === P.signature(after))) {
              this.suppress(a, 300000);
              this.log('状态没有可确认变化，该动作暂缓复查', 'warning');
            }
          }
          if (
            P.num(after.role.money) < this.prefs.budget.moneyReserve &&
            P.num(before.role.money) >= this.prefs.budget.moneyReserve
          )
            this.pause('金币已低于保留额度，请核对当前资源');
          this.saveLedger();
        } catch (e) {
          if (a.family === 'pet' && String(e.message).includes('请先结束战斗')) {
            this.log(safeMessage(e.message), 'warning');
            this.suppress(a, 300000);
            this.saveLedger();
            return;
          }
          // A lottery request costs at most one chance; an unanswered arena claim costs nothing and must not stop the autopilot.
          if (a.type === 'ONLINE_LOTTERY_COMMAND' || a.type === 'GET_MONSTER_TMPL' || arenaClaim) {
            this.log(safeMessage(e.message), 'warning');
            if (arenaClaim) this.ledger.arena.claimFailed = true;
            else this.suppress(a, 1800000);
            this.saveLedger();
            return;
          }
          this.uncertain = true;
          this.lastFailure = {
            occurredAt: new Date().toISOString(),
            actionType: a.type,
            actionLabel: a.label,
            reason: safeMessage(e.message),
            code: e.code || 'ACTION_ERROR',
            expectedResponseType: e.expectedResponseType || a.type + '_RESPONSE',
            receivedType: e.receivedType || null,
            elapsedMs: e.elapsedMs ?? null,
            packetTypes: e.packetTypes || [],
            resultConfirmed: false,
          };
          this.suppress(a, 3600000);
          this.saveLedger();
          if (!this.bridge.connected && this.prefs.reconnect.enabled)
            this.log(safeMessage(e.message), 'warning');
          else this.pause(safeMessage(e.message) + '；请核对角色后重新开始');
        } finally {
          this.action = null;
          this.busy = false;
          this.lastLocal = Date.now();
          this.paint();
        }
      }
      syncKeepAwake() {
        const want = this.enabled && this.prefs.keepAwake;
        const held = this.keepAwake.set(want);
        const state = held ? 'held' : want && !this.keepAwake.supported ? 'unsupported' : 'off';
        if (state !== this.keepAwakeLogged) {
          const previous = this.keepAwakeLogged;
          this.keepAwakeLogged = state;
          if (state === 'held') this.log('已持有 Web Lock，降低标签页被浏览器睡眠的概率');
          else if (state === 'off' && previous === 'held') this.log('已释放 Web Lock');
          else if (state === 'unsupported') this.log('浏览器不支持 Web Lock，无法防止标签页睡眠', 'warning');
        }
      }
      handleArenaMatch(now = Date.now()) {
        const pending = this.arenaPending, match = this.bridge.cache.arenaMatch;
        if (!pending) {
          if (match?.active && now - match.at >= 130000) {
            this.log('比武等待结果超时，继续托管', 'warning');
            this.bridge.cache.arenaMatch = null;
            return false;
          }
          return !!match?.active;
        }
        if (match?.matchId === pending.matchId && match.active === false) {
          if (match.result?.win)
            this.log('比武胜利：第 ' + match.result.oldRank + ' 名 → 第 ' +
              match.result.newRank + ' 名', 'success');
          else {
            this.log('比武失败：对手 ' + pending.target.nickname, 'warning');
            this.ledger.arena.lost.push(pending.target.snapshotId);
          }
          this.saveLedger();
        } else if (now - pending.started < 130000) return true;
        else this.log('比武等待结果超时，继续托管', 'warning');
        this.arenaPending = null;
        this.bridge.cache.arenaMatch = null;
        if (this.bridge.cache.arena) this.bridge.cache.arena.board = null;
        return false;
      }
      async tick() {
        this.syncKeepAwake();
        const statsRole = this.bridge?.character?.()?.role;
        this.ensureStats(statsRole?.id);
        if (statsRole) this.stats?.tick(statsRole.mapId);
        if (!this.enabled) {
          this.paint();
          return;
        }
        const now = Date.now();
        if (!this.bridge.connected || !this.bridge.sessionReady || this.bridge.reconnectVisible()) {
          this.reason = this.bridge.authFailed
            ? '游戏认证失效，请在原页面重新登录'
            : '等待原游戏连接与角色快照';
          this.maybeReload(now);
          this.paint();
          return;
        }
        if (now < this.manualUntil) {
          this.reason = '检测到手动操作，稍后继续';
          this.paint();
          return;
        }
        const s = this.bridge.state();
        if (!s) {
          this.reason = '等待角色数据';
          this.paint();
          return;
        }
        this.setRole(P.num(s.role.id));
        this.cleanPetLedger(s.pets);
        this.bridge.expireActivityStatus();
        if (!this.acquireLease()) {
          this.reason = '此角色已在另一标签页托管';
          this.paint();
          return;
        }
        if (this.busy || now - this.lastLocal < 1200) return;
        if (this.maybeApplyUpdate(now)) return;
        if (P.num(s.role.mapId) === 20070 || s.trial?.run) {
          const prefs = s.trial?.run ? { ...this.prefs,
            hidden: { ...this.prefs.hidden, enabled: true } } : this.prefs;
          const a = P.plans(s, prefs, this.ledger, now)
            .sort((a, b) => Number(b.type === 'TRIAL_COMMAND') -
              Number(a.type === 'TRIAL_COMMAND')).find((a) =>
            (a.readOnly || a.type === 'UPDATE_SETTINGS') &&
            (this.suppressed.get(a.key) || 0) < now &&
            (a.type !== 'UPDATE_SETTINGS' || now - this.lastSettings > 15000));
          if (a) await this.execute(a);
          this.reason = '无相浮屠试炼中，托管不干预';
          this.paint();
          return;
        }
        if (this.handleArenaMatch(now)) return;
        const runtime = this.bridge.battle(),
          map = P.roleMap(s),
          special =
            [20050, 20051, 20052].includes(P.num(s.role.mapId)) ||
            (this.activity && P.num(s.role.mapId) === this.activity.mapId);
        if (
          runtime.player?.isDead ||
          (runtime.player && P.num(runtime.player.currentHp) <= 0 && runtime.stage !== 'idle')
        ) {
          const key =
            this.roleId +
            ':' +
            (runtime.player.id || 'player') +
            ':' +
            (this.activity?.started || s.role.mapId);
          if (key !== this.lastDeathKey) {
            this.lastDeathKey = key;
            this.deaths = this.deaths.filter((t) => now - t < 3600000);
            this.deaths.push(now);
            this.stats?.death(s.role.mapId);
            this.penalty += 5;
            this.log('检测到阵亡，准备按游戏入口返城', 'warning');
          }
          if (
            !this.prefs.battle.recoverDeath ||
            this.deaths.length >= this.prefs.battle.maxDeathsPerHour
          ) {
            this.pause('阵亡次数达到策略限制');
            return;
          }
          this.bridge.setBattle(false);
          const town = P.townFor(s);
          if (town && P.num(town.id) !== P.num(s.role.mapId))
            await this.execute({
              kind: 'request',
              type: 'ENTER_MAP',
              payload: { mapId: P.num(town.id) },
              label: '阵亡后返回城镇',
              family: 'travel',
              moneyCost: 0,
              expCost: 0,
              key: 'return-town',
            });
          this.lastLocal = now;
          return;
        }
        if (!runtime.player || (!runtime.player.isDead && P.num(runtime.player.currentHp) > 0))
          this.lastDeathKey = '';
        if (this.activity && !special) {
          this.log('活动已离场，继续核对日常次数');
          this.activity = null;
          this.lastDeathKey = '';
          this.bridge.cache.activityStatus = {};
        }
        const rushTown = P.arenaRush(this.prefs, now) && P.num(s.role.level) >= 30
          ? P.townFor(s, P.NPC.arena) : null;
        let plans = P.plans(s, this.prefs, this.ledger, now).filter(
          (a) =>
            (!rushTown || !a.activity) &&
            (this.suppressed.get(a.key) || 0) < now &&
            (!(a.type === 'UPDATE_SETTINGS') || now - this.lastSettings > 15000),
        );
        if (special)
          plans = plans.filter((a) => ['GET_POTION_LIST', 'UPDATE_SETTINGS'].includes(a.type));
        const candidate = plans.find((a) => !a.requiresTown || !!P.townFor(s, a.npc));
        if (candidate) {
          if (
            candidate.type === 'UPDATE_SETTINGS' ||
            (candidate.readOnly && !candidate.requiresTown) ||
            (candidate.inBattle && !candidate.requiresTown)
          ) {
            await this.execute(candidate);
            return;
          }
          if (runtime.stage !== 'idle') {
            this.reason = '暂停一轮战斗，准备 ' + candidate.label;
            this.bridge.setBattle(false);
            this.idleSince = 0;
            this.lastLocal = now;
            this.paint();
            return;
          }
          if (!this.idleSince) {
            this.idleSince = now;
            return;
          }
          if (now - this.idleSince < 1500) return;
          if (candidate.requiresTown) {
            const town = P.townFor(s, candidate.npc);
            if (!town) return;
            if (P.num(town.id) !== P.num(s.role.mapId)) {
              await this.execute({
                kind: 'request',
                type: 'ENTER_MAP',
                payload: { mapId: P.num(town.id) },
                label: '前往「' + town.name + '」办理 ' + candidate.label,
                family: 'travel',
                moneyCost: 0,
                expCost: 0,
                key: 'town:' + town.id,
              });
              return;
            }
            if (candidate.npc && !candidate.readOnly && !['activity', 'arena', 'trial'].includes(candidate.family))
              this.bridge.nativeNpc(candidate.npc);
          }
          await this.execute(candidate);
          return;
        }
        this.idleSince = 0;
        if (rushTown && !special) {
          this.reason = '比武结算前驻守「' + rushTown.name + '」，等待可挑战对手';
          if (runtime.stage !== 'idle') {
            this.bridge.setBattle(false);
            this.lastLocal = now;
          } else if (P.num(rushTown.id) !== P.num(s.role.mapId)) {
            await this.execute({
              kind: 'request',
              type: 'ENTER_MAP',
              payload: { mapId: P.num(rushTown.id) },
              label: '比武结算前返回「' + rushTown.name + '」',
              family: 'travel',
              moneyCost: 0,
              expCost: 0,
              key: 'town:' + rushTown.id,
            });
          }
          this.paint();
          return;
        }
        if (!this.prefs.battle.enabled) {
          this.reason = '当前没有可执行的成长/经济动作';
          this.paint();
          return;
        }
        const target = special ? map : P.normalMap(s, this.prefs, this.penalty);
        if (!target) {
          this.reason = '没有符合等级与地图策略的免费挂机地图';
          this.paint();
          return;
        }
        if (P.num(target.id) !== P.num(s.role.mapId)) {
          if (runtime.stage !== 'idle') {
            this.bridge.setBattle(false);
            this.lastLocal = now;
            return;
          }
          await this.execute({
            kind: 'request',
            type: 'ENTER_MAP',
            payload: { mapId: P.num(target.id) },
            label: '进入挂机地图「' + target.name + '」',
            family: 'travel',
            moneyCost: 0,
            expCost: 0,
            key: 'map:' + target.id,
          });
          return;
        }
        if (runtime.stage === 'idle') {
          this.bridge.closeOwnedWindows();
          const started = this.bridge.setBattle(true);
          this.reason = started ? '已通过原页面开始战斗' : '未找到原页面战斗入口，托管等待';
          this.lastLocal = now;
          this.log(this.reason, started ? 'info' : 'warning');
        } else this.reason = '原游戏正在战斗：' + (map?.name || s.role.mapId);
        this.paint();
      }
      maybeApplyUpdate(now) {
        if (P.arenaRush(this.prefs, now) || !this.prefs.updates.autoApply || !this.enabled || !this.prefs.resumeAfterReload ||
          this.activity || this.arenaPending || P.num(this.bridge.state()?.role.mapId) === 20070 ||
          !this.updates || !TLUpdates.shouldApply(
            readStorage(TLUpdates.KEY, {}), this.updates.currentVersion, now)) return false;
        // Whether Tampermonkey has installed the new version is not visible from here, so a reload is
        // tried once at once, then every 6 hours, 5 times per version.
        this.updates.markApply(now);
        writeStorage(RUNNING, true);
        this.log('发现新版本 v' + this.updates.status().latestVersion + '，刷新页面以启用');
        location.reload();
        return true;
      }
      maybeReload(now) {
        if (
          !this.prefs.reconnect.autoReload ||
          this.bridge.authFailed ||
          !this.bridge.lastClose ||
          now - this.bridge.lastClose < this.prefs.reconnect.reloadAfterSeconds * 1000
        )
          return;
        this.reloads = arraySafe(this.reloads).filter((t) => now - t < 3600000);
        if (this.reloads.length >= this.prefs.reconnect.maxReloadsPerHour) {
          this.reason = '刷新次数已达上限，等待原游戏恢复';
          return;
        }
        this.reloads.push(now);
        writeStorage(PREFIX + ':reloads', this.reloads);
        writeStorage(RUNNING, true);
        location.reload();
      }
    }
    class Filler {
      constructor(controller, doc = document) {
        this.controller = controller;
        this.doc = doc;
        this.memory = {};
        if (this.controller.bridge) this.controller.bridge.filler = this;
      }
      start() {
        this.doc.addEventListener('click', (e) => this.slotClick(e), true);
        this.doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closePicker(); });
        this.watch = setInterval(() => { this.subscribe(); this.checkPicker(); }, 300);
        this.observer = new MutationObserver(() => this.schedule());
        this.observer.observe(this.doc.documentElement, { subtree: true, childList: true });
        this.scan();
      }
      schedule() {
        if (this.timer) return;
        this.timer = setTimeout(() => { this.timer = null; this.scan(); }, 300);
      }
      scan() {
        this.subscribe();
        this.checkPicker();
        if (!this.controller.prefs.fill.enabled) {
          this.doc.querySelectorAll('[data-tl-fill]').forEach((b) => b.remove());
          return;
        }
        this.doc.querySelectorAll('div.gem-shop-window, div.smithy-shop-window, div.tailor-shop-window, section.pet-panel').forEach((root) => this.insert(root));
      }
      insert(root) {
        const header = root.querySelector('div.game-header > div.d-flex.align-center') || root.closest('[class*="window"]')?.querySelector('div.game-header > div.d-flex.align-center');
        if (!header || header.querySelector('[data-tl-fill]')) return;
        const button = this.doc.createElement('button');
        button.type = 'button';
        button.className = 'tl-fill-btn';
        button.setAttribute('data-tl-fill', '');
        button.textContent = '一键放入';
        button.style.cssText = 'font-size:12px;padding:2px 8px;margin-left:8px;border-radius:4px;cursor:pointer';
        for (const event of ['mousedown', 'pointerdown']) button.addEventListener(event, (e) => e.stopPropagation());
        button.addEventListener('click', () => root.matches('section.pet-panel') ? this.pet(root) : this.click());
        header.appendChild(button);
      }
      closePicker() {
        this.picker?.remove();
        this.picker = null;
      }
      checkPicker() {
        if (this.picker && (!this.controller.prefs.fill.enabled || !this.pickerRoot.isConnected || this.controller.bridge.stores().get('interaction')?.mode !== this.pickerMode)) this.closePicker();
      }
      slotClick(e) {
        if (this.picker?.contains(e.target)) return;
        this.closePicker();
        if (e.button !== 0 || !this.controller.prefs.fill.enabled) return;
        const slot = e.target.closest?.('.item-slot');
        const root = slot?.closest('div.gem-shop-window, div.smithy-shop-window, div.tailor-shop-window');
        if (!root || slot.matches('.remove-slot, .highlight-slot')) return;
        if (root.matches('div.tailor-shop-window') && !slot.matches('.cursor-pointer')) return;
        if (!root.matches('div.gem-shop-window')) return setTimeout(() => this.openPicker(slot, root, 'any'), 0);
        const mode = this.controller.bridge.stores().get('interaction')?.mode;
        const kind = slot.matches('.border-purple') ? 'equip' : slot.matches('.border-green') ? 'charm' : slot.matches('.small-slot') ? 'gem' : slot.matches('.border-blue') ? mode === 'GEM_DRILL' ? 'material' : 'gem' : null;
        if (kind) this.openPicker(slot, root, kind);
      }
      openPicker(slot, root, kind) {
        const c = this.controller, stores = c.bridge.stores(), mode = stores.get('interaction')?.mode;
        if (!c.prefs.fill.enabled || !root.isConnected || !(kind === 'any' ? mode?.startsWith('SMITHY_') || mode === 'TAILOR_ADD_MATERIAL' : mode?.startsWith('GEM_'))) return;
        this.closePicker();
        const picker = this.doc.createElement('div'), rect = slot.getBoundingClientRect();
        picker.style.cssText = 'position:absolute;z-index:2147482000;max-height:320px;overflow:auto;width:240px;background:rgba(20,20,24,0.96);border:1px solid #a88a4a;border-radius:4px;font-size:12px;color:#eee';
        const view = this.doc.defaultView || globalThis;
        picker.style.left = Math.max(0, Math.min(rect.left, view.innerWidth - 242)) + (view.scrollX || 0) + 'px';
        picker.style.top = Math.max(0, Math.min(rect.bottom, view.innerHeight - 322)) + (view.scrollY || 0) + 'px';
        const choices = P.slotChoices(mode, kind, c.bridge.state(), c.prefs, stores.get('gemInlay') || {});
        for (const item of choices) picker.appendChild(this.choiceRow(item, mode));
        if (!choices.length) picker.textContent = '背包里没有可放入的物品';
        this.doc.body.appendChild(picker);
        this.picker = picker; this.pickerRoot = root; this.pickerMode = mode;
      }
      choiceRow(item, mode) {
        const row = this.doc.createElement('div'), t = item.itemTmpl || item.equipTmpl;
        row.style.cssText = 'padding:6px;cursor:pointer;display:flex;align-items:center;gap:6px';
        if (t.icon) {
          const icon = this.doc.createElement('img');
          icon.src = t.icon; icon.width = 24; icon.height = 24; row.appendChild(icon);
        }
        const label = this.doc.createElement('span');
        label.textContent = t.name + (item.itemTmpl ? ' ×' + item.count + (item.isBound ? ' 绑定' : '') : (item.isEquipped ? ' 已穿戴' : '') + ' 孔 ' + P.slots(item).filter((n) => n >= 0).length + '/3 +' + P.num(item.enhanceLevel));
        row.appendChild(label);
        row.addEventListener('click', () => { this.choose(item, mode); this.closePicker(); });
        return row;
      }
      choose(item, mode) {
        const stores = this.controller.bridge.stores(), interaction = stores.get('interaction'), g = stores.get('gemInlay');
        if (interaction?.mode !== mode) return;
        if (mode !== 'GEM_SYNTH' || !item.itemTmpl?.gemLevel) return interaction.handleItemClick(this.live(item));
        if (g.selectedSynthGems?.length && g.selectedSynthGems[0].itemId !== item.itemId) { g.clearSynthGems(); g.clearSynthCharm(); }
        const selected = g.selectedSynthGems || [];
        const count = Math.min(5 - selected.length, item.count - selected.filter((b) => b.id === item.id).length);
        for (let n = 0; n < count; n++) if (interaction.handleItemClick(this.live(item)) === false) break;
      }
      subscribe() {
        const g = this.controller.bridge?.stores().get('gemInlay');
        if (!g || this.subscribed === g || !g.$subscribe) return;
        this.subscribed = g;
        g.$subscribe(() => this.remember(g), { flush: 'sync', detached: true });
        this.remember(g);
      }
      remember(g) {
        const fields = ['selectedDrillMaterial', 'selectedCharm', 'selectedSynthCharm', 'selectedRemoveCharm', 'selectedPolishGem', 'selectedPolishCharm', 'selectedSynthGems'];
        for (const field of fields) this.rememberField(g, field);
      }
      rememberField(g, field) {
        const value = field === 'selectedSynthGems' ? g[field]?.[0] : g[field];
        if (value) { this.memory[field] = { itemId: value.itemId, name: value.itemTmpl?.name, count: field === 'selectedSynthGems' ? g[field].length : 1 }; return; }
        const memory = this.memory[field];
        if (!memory) return;
        setTimeout(() => {
          if (this.memory[field] === memory && Date.now() - (this.responseAt || 0) > 1500) delete this.memory[field];
        }, 200);
      }
      response(packet) {
        if (!/^GEM_.*_RESPONSE$/.test(packet.type)) return;
        this.responseAt = Date.now();
        if (packet.success === true) {
          const memory = { ...this.memory };
          setTimeout(() => this.refill(packet.type.replace('_RESPONSE', ''), memory), 100);
        }
      }
      refill(mode, memory) {
        const c = this.controller, stores = c.bridge.stores(), g = stores.get('gemInlay'), interaction = stores.get('interaction');
        if (!c.prefs.fill.enabled || !c.prefs.fill.refill || interaction?.mode !== mode || !g || !this.doc.querySelector('div.gem-shop-window')) return;
        const fields = { GEM_DRILL: ['selectedDrillMaterial'], GEM_INLAY: ['selectedCharm'], GEM_SYNTH: ['selectedSynthGems', 'selectedSynthCharm'], GEM_REMOVE: ['selectedRemoveCharm'], GEM_POLISH: ['selectedPolishGem', 'selectedPolishCharm'] }[mode] || [];
        if (mode === 'GEM_DRILL' && (!g.selectedEquip || P.slots(g.selectedEquip).filter((n) => n >= 0).length >= 3)) return;
        for (const field of fields) this.refillField(mode, field, memory[field], g, interaction);
      }
      refillField(mode, field, memory, g, interaction) {
        if (!memory || (field === 'selectedSynthGems' ? g[field]?.length : g[field])) return;
        const s = this.controller.bridge.state(), kind = field === 'selectedSynthGems' || field === 'selectedPolishGem' ? 'gem' : field === 'selectedDrillMaterial' ? 'material' : 'charm';
        const all = P.slotChoices(mode, kind, s, this.controller.prefs, g).filter((b) => b.itemId === memory.itemId).sort((a, b) => Number(!!b.isBound) - Number(!!a.isBound));
        if (!all.length) {
          if (!memory.exhausted) this.controller.bridge.stores().get('ui')?.showMessage('「' + memory.name + '」已用完', 'info');
          memory.exhausted = true; return;
        }
        if (field === 'selectedSynthCharm' && (!g.selectedSynthGems?.length || !P.charmCompatible(s, all[0], 'synth', g.selectedSynthGems[0]))) return;
        const total = all.reduce((n, b) => n + b.count, 0);
        if (field === 'selectedSynthGems' && total < 2) return;
        let remaining = field === 'selectedSynthGems' ? Math.min(5, memory.count, total) : 1;
        for (const item of all) {
          const count = Math.min(remaining, item.count);
          for (let n = 0; n < count; n++) if (interaction.handleItemClick(this.live(item)) === false) return;
          remaining -= count;
          if (!remaining) break;
        }
      }
      click() {
        const c = this.controller, stores = c.bridge.stores(), interaction = stores.get('interaction');
        if (!interaction) return;
        const current = stores.get('gemInlay') || {}, mode = interaction.mode, state = c.bridge.state();
        if (mode === 'GEM_SYNTH' && !current.selectedSynthGems?.length) {
          current.clearSynthGems?.();
          current.clearSynthCharm?.();
        }
        let picks = P.fillPicks(mode, state, c.prefs, mode === 'TAILOR_ADD_MATERIAL' ? { family: null } : current);
        if (mode === 'TAILOR_ADD_MATERIAL') {
          if (picks.items.length && interaction.handleItemClick(this.live(picks.items[0])) !== false) return stores.get('ui')?.showMessage(picks.message, 'success');
          picks = P.fillPicks(mode, state, c.prefs, { family: 'mithril' });
        }
        for (const item of picks.items) if (interaction.handleItemClick(this.live(item)) === false) return;
        stores.get('ui')?.showMessage(picks.message, picks.items.length ? 'success' : 'warning');
      }
      // bridge.state() holds copies; the game windows keep the store's own objects.
      live(item) {
        const c = this.controller.bridge.character?.();
        const list = item?.equipTmpl ? c?.equipments : c?.bagItems;
        return (Array.isArray(list) && list.find((v) => v.id === item.id)) || item;
      }
      async pet(root) {
        // This route is not exercised live.
        const slot = root.querySelector('button.material-slot');
        if (!slot) return this.controller.bridge.stores().get('ui')?.showMessage('请先选择珍兽并进入提升根骨或打书', 'warning');
        const before = new Set(root.querySelectorAll('button'));
        slot.click();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const options = [...root.querySelectorAll('button')].filter((b) => !before.has(b));
        if (slot.getAttribute('aria-label') !== '放入根骨丹') return options[0]?.click();
        const bags = this.controller.bridge.state().bagItems || [];
        const family = [5025, 5026, 5027].find((id) => options.some((b) => bags.some((item) => item.itemId === id && item.itemTmpl?.name && b.textContent.includes(item.itemTmpl.name))));
        const candidates = bags.filter((b) => b.count > 0 && b.itemId === family);
        const rank = Number(root.textContent.match(/根骨[^0-9]*([0-9]+)/)?.[1] || 0);
        const needed = rank % 3 + 1;
        const best = candidates.slice().sort((a, b) => Number(b.count >= needed) - Number(a.count >= needed) || (a.count >= needed && b.count >= needed ? Number(!!b.isBound) - Number(!!a.isBound) : b.count - a.count))[0];
        options[candidates.indexOf(best)]?.click();
      }
    }
    const arraySafe = (v) => (Array.isArray(v) ? v : []);
    return {
      Filler, Stats, statsNumber, statsDuration, requestAllowed, matchesResponse, mergeTargets, Controller, Bridge, MarketScore, ALLOWED, PREFIX, readStorage, writeStorage, day, safeMessage, createTicker, createKeepAwake,
    };
  })();
  if (typeof module !== 'undefined' && module.exports) module.exports.TLRuntime = TLRuntime;

  ('use strict');
  const TLUpdates = (() => {
    const DAY = 24 * 60 * 60 * 1000,
      KEY = TLRuntime.PREFIX + ':updates',
      PAGE = 'https://github.com/YatsukiRenka/tl-idle-helper/releases',
      API = 'https://api.github.com/repos/YatsukiRenka/tl-idle-helper/releases/latest',
      INSTALL = 'https://raw.githubusercontent.com/YatsukiRenka/tl-idle-helper/main/tl-autopilot.user.js';
    const valid = (v) => typeof v === 'string' && /^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(v);
    function compare(left, right) {
      if (!valid(left) || !valid(right)) throw new Error('版本格式无法识别');
      const a = left.split('.').map(Number),
        b = right.split('.').map(Number);
      for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return Math.sign(a[i] - b[i]);
      return 0;
    }
    function parseNotes(body) {
      if (typeof body !== 'string') return null;
      const sections = [];
      let section;
      for (const line of body.split(/\r?\n/)) {
        if (line.startsWith('## ')) {
          section = { title: line.slice(3).slice(0, 20), items: [] };
          sections.push(section);
        } else if (line.startsWith('- ') && section && section.items.length < 12)
          section.items.push(line.slice(2).slice(0, 200));
      }
      const kept = sections.filter((s) => s.items.length).slice(0, 3);
      return kept.length ? { sections: kept } : null;
    }
    function shouldApply(cache, currentVersion, now) {
      return valid(cache.version) && compare(cache.version, currentVersion) > 0 &&
        (cache.applyVersion !== cache.version ||
          (cache.applyTries < 5 && now - cache.applyAt >= 6 * 60 * 60 * 1000));
    }
    class Checker {
      constructor(controller) {
        this.controller = controller;
        this.currentVersion = '0.2.14';
        this.busy = false;
        this.onChange = () => {};
        this.timer = null;
        this.localError = '';
      }
      status() {
        const cache = TLRuntime.readStorage(KEY, {}),
          newer = valid(cache.version) && compare(cache.version, this.currentVersion) > 0;
        return {
          busy: this.busy,
          currentVersion: this.currentVersion,
          latestVersion: cache.version || null,
          checkedAt: cache.checkedAt || null,
          nextCheckAt: cache.checkedAt ? cache.checkedAt + DAY : null,
          newer,
          notes: cache.notes || null,
          error: cache.error || this.localError,
          dismissed: cache.dismissedVersion === cache.version,
          page: PAGE,
          installUrl: INSTALL,
          apply: {
            tries: cache.applyVersion === cache.version ? cache.applyTries || 0 : 0,
            lastAt: cache.applyVersion === cache.version ? cache.applyAt || null : null,
            exhausted: cache.applyVersion === cache.version && cache.applyTries >= 5,
          },
        };
      }
      start() {
        if (this.timer) return;
        // check() fetches at most once a day. A daily interval would delay a check until almost
        // two days after the last one, so the interval is one hour.
        this.timer = setInterval(() => {
          if (this.controller.prefs.updates.checkDaily) this.check().catch(() => {});
        }, 60 * 60 * 1000);
        if (this.controller.prefs.updates.checkDaily) this.check().catch(() => {});
      }
      stop() {
        clearInterval(this.timer);
        this.timer = null;
      }
      dismiss() {
        const cache = TLRuntime.readStorage(KEY, {});
        cache.dismissedVersion = cache.version || null;
        TLRuntime.writeStorage(KEY, cache);
        this.onChange();
      }
      markApply(now) {
        const cache = TLRuntime.readStorage(KEY, {});
        cache.applyTries = cache.applyVersion === cache.version ? cache.applyTries + 1 : 1;
        cache.applyVersion = cache.version;
        cache.applyAt = now;
        TLRuntime.writeStorage(KEY, cache);
        this.onChange();
      }
      async check(force) {
        const prior = TLRuntime.readStorage(KEY, {});
        if (prior.checkedAt && Date.now() - prior.checkedAt < (force === true ? 60000 : DAY)) return this.status();
        if (this.busy) return this.status();
        if (!navigator.locks?.request) {
          TLRuntime.writeStorage(KEY, {
            ...prior,
            checkedAt: Date.now(),
            error: '请使用油猴管理器检查更新，此浏览器无法协调每日检查',
          });
          this.onChange();
          return this.status();
        }
        await navigator.locks.request(KEY, { ifAvailable: true }, async (lock) => {
          if (!lock) return;
          const cache = TLRuntime.readStorage(KEY, {});
          if (cache.checkedAt && Date.now() - cache.checkedAt < (force === true ? 60000 : DAY)) return;
          this.busy = true;
          const next = { ...cache, checkedAt: Date.now(), error: '' };
          TLRuntime.writeStorage(KEY, next);
          if (TLRuntime.readStorage(KEY, {}).checkedAt !== next.checkedAt) {
            this.localError = '浏览器无法保存每日检查记录，请使用油猴管理器检查更新';
            this.busy = false;
            this.onChange();
            return;
          }
          this.localError = '';
          this.onChange();
          try {
            const response = await fetch(API, {
              credentials: 'omit',
              cache: 'no-store',
              signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw new Error('GitHub 暂无法访问');
            let data;
            try { data = await response.json(); }
            catch { throw new Error('GitHub 版本信息格式异常'); }
            if (!data || typeof data.tag_name !== 'string' ||
              !/^v\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(data.tag_name) ||
              data.draft === true || data.prerelease === true ||
              typeof data.html_url !== 'string' || !data.html_url.startsWith(PAGE + '/'))
              throw new Error('GitHub 版本信息格式异常');
            next.version = data.tag_name.slice(1);
            const notes = parseNotes(data.body);
            next.notes = notes ? { title: 'v' + next.version + ' 更新内容', sections: notes.sections } : null;
          } catch (error) {
            next.error = error.message === 'GitHub 版本信息格式异常'
              ? error.message : 'GitHub 暂无法访问';
          } finally {
            TLRuntime.writeStorage(KEY, next);
            this.busy = false;
            this.onChange();
          }
        });
        return this.status();
      }
    }
    return { Checker, compare, parseNotes, shouldApply, DAY, KEY, PAGE };
  })();

  ('use strict');
  const TLPanel = (() => {
    const esc = (v) =>
      String(v ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      );
    const groups = [
      ['status', '状态'],
      ['stats', '统计'],
      ['battle', '挂机日常'],
      ['growth', '成长装备'],
      ['pets', '珍兽'],
      ['craft', '宝石工艺'],
      ['economy', '出售补药'],
      ['budget', '预算设置'],
      ['updates', '更新'],
      ['logs', '日志高级'],
    ];
    const pathGet = (o, path) => path.split('.').reduce((v, k) => v?.[k], o);
    const pathSet = (o, path, value) => {
      const ks = path.split('.');
      let cur = o;
      for (const k of ks.slice(0, -1)) cur = cur[k];
      cur[ks.at(-1)] = value;
    };
    const BUDGET_CSS =
      '.income-table{width:100%;border-collapse:collapse;font-size:12px}.income-table th,.income-table td{padding:4px;text-align:right}.income-table th:first-child,.income-table td:first-child{text-align:left}' +
      '.budgets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:12px;row-gap:4px;font-size:11px;color:#c3d4b7;line-height:1.55;margin-top:6px}.budgets span{display:block;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.budget-title{font-size:10px;color:#abc7a0}.level-reason{margin-top:6px;color:#e9d5a6;font-size:11px;line-height:1.65;overflow-wrap:anywhere}.tabs button.has-update{color:#f4d37a}.update-summary ul{padding-left:18px;margin:8px 0}.update-summary li{margin:5px 0}.update-summary .notice{margin-bottom:10px}@media(max-height:600px){.tabs{gap:1px}.tabs button{font-size:10px;padding:5px 2px}.summary{padding-top:5px}.budgets{margin-top:4px;row-gap:2px;line-height:1.4}.level-reason{margin-top:4px;line-height:1.5}}';
    const CSS = `:host{all:initial;font-family:"Microsoft YaHei","Segoe UI",sans-serif;color:#e9f0e4;font-size:12px}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #e6c477;outline-offset:2px}.shell{width:390px;max-width:calc(100vw - 24px);background:#183a32f5;border:1px solid #73936d;border-radius:12px;box-shadow:0 8px 28px #0007;pointer-events:auto;overflow:hidden}.head{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;border-bottom:1px solid #456149;background:#20483b}.head strong{color:#f4dfa3;font-size:14px;letter-spacing:.08em}.version{font-size:10px;color:#afc6ab;margin-top:4px}.head button{background:none;color:#d4ddc6;border:0;padding:5px}.controls{display:flex;gap:7px;padding:12px 14px 7px}.btn{padding:8px 13px;border-radius:6px;border:1px solid #71896b;background:#30543f;color:#edf4e7}.btn.primary{background:#dbb862;color:#283d24;border-color:#ecd58d;font-weight:700}.btn.warn{border-color:#8c7257;background:#4c4934}.controls .btn{flex:1;padding:8px 5px;font-size:11px}.summary{padding:7px 15px 12px;line-height:1.8;color:#d1e1c9}.status-line{display:flex;align-items:center;gap:8px;font-size:11px}.dot{width:7px;height:7px;background:#84977a;border-radius:50%;flex-shrink:0}.dot.on{background:#b9df8e}.reason{padding-top:6px;color:#e9d5a6;font-size:12px;overflow-wrap:anywhere}.stats{display:flex;gap:9px;flex-wrap:wrap;color:#abc7a0;font-size:11px;margin-top:6px}.tabs{display:flex;gap:3px;flex-wrap:wrap;padding:0 11px 9px;border-bottom:1px solid #3d5c42}.tabs button{border:0;background:none;color:#abc2a4;padding:6px 7px;border-radius:5px;font-size:11px}.tabs button.active{background:#476447;color:#f1dda2}.body{padding:15px;max-height:min(62vh,600px);overflow:auto;line-height:1.8}.body h3{font-size:12px;color:#eddaaa;margin:0 0 10px;letter-spacing:.03em}.hint{font-size:11px;color:#aeca9e;line-height:1.85;margin:5px 0 13px}.section{border-top:1px solid #3d5c42;padding-top:13px;margin-top:14px}.field{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:9px 0;color:#d1e0c8}.field span{max-width:69%;font-size:12px}.field input[type=number],.field input[type=text],.field select{width:112px;max-width:48%;border:1px solid #668060;background:#244432;color:#ebf1df;border-radius:5px;padding:5px 8px;min-height:30px}.field select.wide{width:200px;max-width:65%;font-size:11px}.field input[type=checkbox]{accent-color:#dcb85f;width:16px;height:16px;flex-shrink:0}.footer{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-top:1px solid #496449;background:#204335}.dirty{font-size:10px;color:#b6ceaa}.footer .btn{font-size:11px;padding:6px 15px}.plan{padding:10px 12px;border:1px solid #607858;background:#2b4b34;border-radius:7px;margin-bottom:8px;font-size:11px;color:#d4e3c7}.plan small{display:block;color:#acc29d;font-size:10px;margin-top:5px}.log{border-bottom:1px solid #355438;padding:8px 0;font-size:11px;color:#c7d9be;overflow-wrap:anywhere}.log time{font-size:10px;color:#98b18a;margin-right:7px}.log.success{color:#b8df91}.log.warning{color:#eed39c}textarea{width:100%;background:#183323;border:1px solid #668060;border-radius:6px;color:#dfeccf;padding:10px;font:11px/1.65 Consolas,monospace;min-height:230px;resize:vertical}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.actions .btn{font-size:11px}.launcher{display:none;background:#dbb862;color:#243b28;border:1px solid #ecd58d;border-radius:22px;padding:11px 16px;box-shadow:0 5px 17px #0006;font-weight:700;pointer-events:auto}.collapsed .shell{display:none}.collapsed .launcher{display:block}.notice{padding:10px 12px;background:#2e4d35;border-left:3px solid #d8b768;font-size:11px;color:#dfe2bd;margin-bottom:12px}.error{color:#ffd9a2;font-size:11px;min-height:17px}.budget-card{display:flex;justify-content:space-between;padding:9px 11px;background:#244734;border-radius:6px;margin:7px 0;font-size:11px;color:#c2d5b2}.shell{display:flex;flex-direction:column;max-height:calc(100vh - 24px)}.head,.controls,.summary,.tabs,.footer{flex-shrink:0}.body{min-height:0;flex:1}@media(max-height:600px){.summary .stats{display:none}.reason{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.summary{padding-bottom:8px}}@media(max-width:700px){.shell{width:350px}.body{max-height:52vh}.field span{font-size:11px}.head{padding:11px 14px}.tabs button{font-size:10px}.summary{padding-bottom:9px}}`;
    class Panel {
      constructor(controller) {
        this.controller = controller;
        this.section = 'status';
        this.pending = TLPolicy.clone(controller.prefs);
        this.dirty = false;
        this.previewPlans = [];
        this.roleKey = '';
        this.mount();
      }
      mount() {
        if (!document.documentElement) {
          setTimeout(() => this.mount(), 10);
          return;
        }
        this.host = document.createElement('div');
        this.host.id = 'tl-autopilot-host';
        Object.assign(this.host.style, {
          position: 'fixed',
          right: '12px',
          top: '12px',
          zIndex: '2147483000',
          pointerEvents: 'none',
        });
        document.documentElement.appendChild(this.host);
        this.root = this.host.attachShadow({ mode: 'open' });
        this.root.innerHTML = `<style>${CSS}</style><div class="wrap"><button class="launcher" type="button">TL挂机助手</button><section class="shell"><header class="head"><div><strong>TL挂机助手</strong><div class="version">完整策略 · v0.2.14</div></div><button type="button" data-action="collapse" aria-label="收起托管面板">─</button></header><div class="controls"><button type="button" class="btn primary" data-action="start">开始托管</button><button type="button" class="btn" data-action="pause">暂停托管</button><button type="button" class="btn warn" data-action="stopBattle">停止战斗</button></div><div class="summary"></div><nav class="tabs">${groups.map(([id, name]) => `<button type="button" data-tab="${id}">${name}</button>`).join('')}</nav><div class="body"></div><footer class="footer"><span class="dirty">配置已保存</span><button type="button" class="btn" data-action="save">保存策略</button></footer></section></div>`;
        this.root.addEventListener('click', (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          const action = b.dataset.action;
          if (b.classList.contains('launcher') || action === 'collapse') {
            this.root.querySelector('.wrap').classList.toggle('collapsed');
            return;
          }
          if (b.dataset.tab) {
            this.section = b.dataset.tab;
            this.renderBody();
            return;
          }
          if (action === 'start') this.controller.start();
          else if (action === 'clearStats' && confirm('清空全部收益统计？')) {
            this.controller.stats?.clear();
            this.renderBody();
          }
          else if (action === 'pause') this.controller.pause();
          else if (action === 'stopBattle') this.controller.stopBattle();
          else if (action === 'save') {
            this.pending = this.controller.updateConfig(this.pending);
            this.dirty = false;
            this.renderBody();
          } else if (action === 'preview') {
            this.previewPlans = this.controller.preview();
            this.renderBody();
          } else if (action === 'defaults') {
            this.pending = TLPolicy.clone(TLPolicy.DEFAULTS);
            this.dirty = true;
            this.renderBody();
          } else if (action === 'export') this.download('天龙托管配置.json', this.pending);
          else if (action === 'diagnostics')
            this.download('天龙托管诊断.json', this.controller.status());
          else if (action === 'applyJson') {
            try {
              this.pending = TLPolicy.config(JSON.parse(this.root.querySelector('textarea').value));
              this.dirty = true;
              this.controller.log('JSON配置已载入，点击保存生效');
              this.renderBody();
            } catch (error) {
              this.root.querySelector('.error').textContent = 'JSON格式错误：' + error.message;
            }
          }
          this.paint();
        });
        this.root.addEventListener('input', (e) => {
          const path = e.target.dataset.path;
          if (!path) return;
          const base = pathGet(TLPolicy.DEFAULTS, path);
          let value =
            e.target.type === 'checkbox'
              ? e.target.checked
              : typeof base === 'number'
                ? Number(e.target.value)
                : Array.isArray(base)
                  ? e.target.value
                      .split(/[,，\s]+/)
                      .map(Number)
                      .filter((n) => Number.isFinite(n) && n > 0)
                  : e.target.value;
          pathSet(this.pending, path, value);
          this.dirty = true;
          this.root.querySelector('.dirty').textContent = '有未保存的配置';
        });
        this.root.addEventListener('click', (e) => {
          const action = e.target.closest('button')?.dataset.action;
          if (action === 'checkUpdate')
            this.controller.updates
              ?.check(true)
              .then(() => this.renderBody())
              .catch(() => {});
          else if (action === 'openUpdate')
            window.open(this.controller.updates.status().page, '_blank', 'noopener,noreferrer');
          else if (action === 'installUpdate')
            window.open(this.controller.updates.status().installUrl, '_blank', 'noopener,noreferrer');
          else if (action === 'dismissUpdate') {
            this.controller.updates?.dismiss();
            this.renderBody();
          }
        });
        this.root.querySelector('style').textContent += BUDGET_CSS;
        this.controller.paint = () => this.paint();
        this.renderBody();
        this.paint();
      }
      field(label, path, options = {}) {
        const value = pathGet(this.pending, path);
        let control;
        if (typeof value === 'boolean')
          control = `<input type="checkbox" data-path="${path}" ${value ? 'checked' : ''} aria-label="${esc(label)}">`;
        else if (options.choices)
          control = `<select class="wide" data-path="${path}" aria-label="${esc(label)}">${options.choices.map(([v, t]) => `<option value="${esc(v)}" ${String(value) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
        else
          control = `<input type="${Array.isArray(value) ? 'text' : 'number'}" data-path="${path}" value="${esc(Array.isArray(value) ? value.join(',') : value)}" min="${options.min ?? 0}" ${options.max != null ? 'max="' + options.max + '"' : ''} ${options.step != null ? 'step="' + options.step + '"' : ''} aria-label="${esc(label)}">`;
        return `<label class="field"><span>${esc(label)}</span>${control}</label>`;
      }
      renderBody() {
        const f = (l, p, o) => this.field(l, p, o),
          s = this.controller.bridge.state(),
          status = this.controller.status();
        let html = '';
        if (this.section === 'stats') {
          html = this.statsHTML(status.stats, s?.maps);
          this.statsKey = html;
          this.statsPaintAt = Date.now();
        }
        if (this.section === 'status') {
          html = `<div class="notice">先在原游戏完成登录，然后开始托管。人物升级按目标等级与保留经验执行；技能升级和冶炼各自使用每日额度。</div><h3>已保存的资源策略</h3><div class="budget-card"><span>金币保留</span><span>${status.budget.moneyReserve.toLocaleString()}</span></div><div class="budget-card"><span>当日金币预算</span><span>${status.budget.moneyPerDay > 0 ? status.budget.moneyPerDay.toLocaleString() : '不限'}</span></div><div class="budget-card"><span>当日技能经验预算</span><span>${status.budget.skillExpPerDay > 0 ? status.budget.skillExpPerDay.toLocaleString() : '不限'}</span></div><div class="budget-card"><span>当日冶炼经验预算</span><span>${status.budget.smeltExpPerDay > 0 ? status.budget.smeltExpPerDay.toLocaleString() : '不限'}</span></div><div class="hint">默认保留强化、镶宝、星级、鉴定装备和套装部件；自动回收品质1的普通装备。宝石默认目标3级，强化默认目标+3。</div><div class="actions"><button class="btn" type="button" data-action="preview">预览下一步计划</button><button class="btn" type="button" data-action="diagnostics">导出当前诊断</button></div><div class="section"><h3>计划预览</h3>${this.previewPlans.length ? this.previewPlans.map((a) => `<div class="plan">${esc(a.label)}<small>预计金币 ${a.coinCost} · 经验 ${a.expCost}${a.requiresTown ? ' · 在对应城镇处理' : ''}</small></div>`).join('') : '<div class="hint">点击预览可查看当前角色满足条件的动作。</div>'}</div>`;
        }
        if (this.section === 'battle') {
          html =
            '<h3>挂机与恢复</h3>' +
            f('自动开始原游戏战斗', 'battle.enabled') +
            f('挂机地图', 'battle.mapId', { choices: TLPolicy.mapChoices(s?.maps) }) +
            f('比角色低几级选图', 'battle.levelOffset') +
            f('阵亡后返城重新选择', 'battle.recoverDeath') +
            f('每小时允许阵亡次数', 'battle.maxDeathsPerHour') +
            '<div class="section"><h3>日常活动</h3>' +
            f('自动完成日常', 'activities.enabled') +
            f('珍珑棋局', 'activities.zl') +
            f('珍珑每日最多进入', 'activities.zlRuns') +
            f('伪宋军领地', 'activities.camp') +
            f('伪宋军每日最多进入', 'activities.campRuns', { max: 5 }) +
            f('熊林', 'activities.bear') +
            f('熊林每日最多进入', 'activities.bearRuns') +
            f('每日领取天灵丹（需回洛阳）', 'activities.tianlingClaim') +
            f('没有双倍经验时自动使用天灵丹', 'activities.tianlingUse') +
            f('自动抽取在线抽奖次数（需回苏州）', 'activities.lotteryDraw') +
            f('攒够多少次抽一次（当天次数发完时也会抽）', 'activities.lotteryBatch') +
            '<div class="hint">珍珑需15级，伪宋军与熊林需30级。令牌、每日次数会结合原游戏返回的资格数据核对。</div></div><div class="section"><h3>比武天梯</h3>' +
            f('自动比武（总开关）', 'arena.enabled') +
            f('每日点赞', 'arena.like') +
            f('领取名次奖励（需回洛阳）', 'arena.claim') +
            f('自动挑战（需回洛阳）', 'arena.challenge') +
            f('每日挑战次数上限（0 不限）', 'arena.maxPerDay') +
            f('只挑战战力不超过自己 × 倍数的对手', 'arena.maxPowerRatio') +
            f('比武榜刷新间隔（分钟）', 'arena.refreshMinutes') +
            f('结算前冲榜分钟数（0 关闭）', 'arena.rushMinutes') +
            '<div class="hint">比武 30 级开放。挑战和领奖需要回洛阳找比武校尉，会中断挂机。点赞不中断。每天 0 点（东八区）结算前的这段时间，托管回洛阳驻守并连续挑战：榜单每 30 秒刷新一次，不受每日挑战次数上限限制，期间不进副本。</div></div>';
        }
        if (this.section === 'growth')
          html =
            '<h3>人物与技能</h3>' +
            f('自动升级人物', 'growth.level') +
            f('人物目标等级', 'growth.maxLevel') +
            f('自动升级技能', 'growth.skills') +
            f('技能最高等级', 'growth.maxSkillLevel') +
            f('技能优先于人物升级', 'growth.skillBeforeLevel') +
            f('优先技能模板ID（逗号分隔）', 'growth.skillPriority') +
            '<div class="section"><h3>装备选择</h3>' +
            f('按评分自动穿戴', 'gear.enabled') +
            f('评分方式', 'gear.scoring', { choices: [['combat', '实战评分（按伤害公式，推荐）'], ['linear', '固定权重（同游戏战力）']] }) +
            f('评分参照的怪物', 'gear.targets', { choices: [['pool', '可进入的最高 6 张挂机地图（推荐）'], ['map', '只看最近挂机的地图']] }) +
            f('按实测战况自动调整生存权重', 'gear.autoDefense') +
            f('生存权重（自动关闭或数据不足时使用；0 只看输出，1 输出与生存并重）', 'gear.defenseWeight', { min: 0, max: 1, step: 0.1 }) +
            f('最低评分增益 %', 'gear.minGainPercent', { step: 0.1 }) +
            f('允许穿戴后绑定', 'gear.allowBinding') +
            f('自动穿戴时也从仓库取出更好的装备', 'gear.fromWarehouse') +
            f('逛摊淘宝显示装备评分', 'market.showScore') +
            f('背包和仓库装备图标显示评分', 'market.bagScore') +
            f('逛摊显示的评分', 'market.scoreType', { choices: [['combat', '实战评分'], ['power', '游戏内战力']] }) +
            f('背包和仓库图标显示的评分', 'market.bagScoreType', { choices: [['combat', '实战评分'], ['power', '游戏内战力']] }) +
            f('装备详情和人物面板显示实战评分', 'market.tipScore') +
            f('逛摊按脚本排序', 'market.sort', { choices: [['off', '关'], ['power', '战斗力从高到低'], ['combat', '实战评分从高到低'], ['gain', '实战提升从高到低']] }) +
            '<div class="hint">评分参照的怪物越多，换地图时分数越稳定；怪物属性每天向服务器读取一次。自动生存权重按门槛计算：安全时只等于生命药费占金币收入的比例（接近 0，防御和抗性几乎不加分）；每秒掉血超过最强生命药回血速度的一半、血量低于 35% 的时间变多、或近 6 个战斗小时内有阵亡时，权重迅速升高，最高为 1。战斗数据不足 30 分钟时用手动值。实战评分每 100 分约等于整体实战能力的 1%；人物面板的实战评分是全身装备的合计贡献，换一件装备后它的变化等于两件装备的分数差。</div>' +
            (status.scoring.mode !== 'combat' ? '' : '<div class="hint">' + esc(TLPolicy.scoringText(status.scoring)) + '</div>') +
            (status.scoring.mode !== 'combat' ? '' : '<div class="hint">' +
              (status.scoring.weights ? '当前实战权重：' +
                ['hp', 'extAtk', 'intAtk', 'extDef', 'intDef', 'critRate', 'critDef',
                  'avoidance', 'precision', 'iceAtk', 'fireAtk', 'poisonAtk', 'holyAtk',
                  'iceDef', 'fireDef', 'poisonDef', 'holyDef'].map((k, i) =>
                  ['气血', '外攻', '内攻', '外防', '内防', '会心', '会防', '闪避', '命中',
                    '冰攻', '火攻', '毒攻', '玄攻', '冰抗', '火抗', '毒抗', '玄抗'][i] +
                  ' ' + status.scoring.weights[k].toFixed(1)).join(' · ') :
                '实战评分等待战斗数据') + '</div>') + '</div><div class="section"><h3>暗器养成</h3>' +
            f('暗器养成（总开关）', 'hidden.enabled') +
            f('自动洗炼属性（5 砂/次）', 'hidden.wash') +
            f('自动洗炼品质（1 玉/次）', 'hidden.washQuality') +
            f('领取暂存奖励', 'hidden.inbox') +
            f('用人物经验喂养暗器', 'hidden.feed') +
            f('暗器目标等级', 'hidden.maxLevel') +
            f('喂养后至少保留经验', 'hidden.keepExp') +
            f('暗器状态刷新间隔（分钟）', 'hidden.refreshMinutes') +
            '<div class="hint">洗炼和喂养需要回洛阳找薛飞，会中断挂机。无相浮屠（300 万金币/轮）不会自动进入；手动进塔时托管不干预。</div></div>';
        if (this.section === 'pets')
          html = '<h3>珍兽</h3>' +
            f('珍兽托管（总开关）', 'pets.enabled') +
            f('没有出战珍兽时让战力最高的出战', 'pets.summon') +
            f('自动领取珍兽掉落', 'pets.claim') +
            f('自动孵蛋并筛选', 'pets.hatch') +
            f('保留的最低资质均值（宝宝满值 120）', 'pets.keepMinAverage', { step: 0.5 }) +
            f('也孵化变异珍兽蛋', 'pets.hatchMutant') +
            f('用人物经验喂养出战珍兽', 'pets.feed') +
            f('喂养后至少保留经验', 'pets.feedKeepExp') +
            f('珍兽状态刷新间隔（分钟）', 'pets.refreshMinutes') +
            '<div class="hint">孵蛋、出战、喂养、领取都要先停止战斗（不用回城）。放生不可恢复：只放生脚本自己刚孵出的、1 级、未锁定、未出战、资质均值低于设定值的普通宝宝；达标的自动锁定。变异和二代珍兽不会被放生。</div>' +
            (status.pets.list?.length ? status.pets.list.map((entry) => '<div>' +
              esc(entry.pet.name) + ' · ' + ({ BABY: '宝宝', SECOND: '二代', MUTANT: '变异' }[entry.pet.form] || '') +
              ' · Lv.' + entry.pet.level + ' · 资质 ' + esc(entry.average) + ' · ' + esc(entry.quality) +
              ' · 战力 ' + esc(entry.combatPower) + (status.pets.active?.pet.id === entry.pet.id ? ' · 出战' : '') +
              (entry.pet.locked ? ' · 锁定' : '') + '</div>').join('') : '尚未读取珍兽数据');
        if (this.section === 'craft')
          html =
            '<h3>宝石策略</h3>' +
            f('在游戏窗口显示“一键放入”按钮', 'fill.enabled') +
            f('完成后自动补回同种符和材料', 'fill.refill') +
            '<div class="hint">宝石、铁匠、裁缝窗口和云飘飘珍兽面板的标题栏出现“一键放入”：按当前功能页把最合适的装备、宝石、符和材料放进槽位，执行仍需自己点。镶嵌、打孔、合成、摘除、雕琢成功后，自动从背包补回刚用掉的同种符、打孔材料和宝石（合成、雕琢），直到用完。</div>' +
            f('启用宝石托管', 'gems.enabled') +
            f('自动打孔', 'gems.drill') +
            f('每件装备目标孔数', 'gems.maxHoles', { max: 3 }) +
            f('自动镶嵌', 'gems.inlay') +
            f('自动合成（每次5颗）', 'gems.synth') +
            f('宝石目标等级', 'gems.maxLevel', { max: 6 }) +
            f('最低合成成功率 %', 'gems.minSynthSuccess', { max: 100 }) +
            f('智慧/魅力宝石雕琢', 'gems.polish') +
            f('摘除旧宝石后替换', 'gems.replace') +
            f('每日宝石操作上限', 'gems.maxPerDay') +
            '<div class="section"><h3>铁匠与神器</h3>' +
            f('启用铁匠托管', 'smithy.enabled') +
            f('自动鉴定50级以上武器', 'smithy.appraisal') +
            f('自动强化穿戴装备', 'smithy.enhance') +
            f('目标强化等级', 'smithy.targetEnhance', { max: 9 }) +
            f('最低强化成功率 %', 'smithy.minEnhanceSuccess', { max: 100 }) +
            f('神器冶炼', 'smithy.smelt') +
            f('允许投入当前穿戴武器', 'smithy.allowSmeltEquipped') +
            f('攒够多少经验投入一次（挂机中直接投入，不回城）', 'smithy.investChunk') +
            f('神节与神符匹配修复', 'smithy.repair') +
            f('完整神节打造神器', 'smithy.forge') +
            f('目标神器ID（留空自动评分）', 'smithy.artifactIds') +
            f('每日铁匠操作上限', 'smithy.maxPerDay') +
            '<div class="section"><h3>裁缝与御赐套装</h3>' +
            f('启用装备打造', 'craft.enabled') +
            f('棉布/秘银打造', 'craft.tailor') +
            f('万灵石兑换套装', 'craft.exchange') +
            f('目标装备ID（留空自动评分）', 'craft.targetIds') +
            f('最低装备评分增益 %', 'craft.minGainPercent', { step: 0.1 }) +
            f('每日打造/兑换上限', 'craft.maxPerDay') +
            '<div class="hint">打造按角色已持有材料处理，目标以当前下发的模板与神器预览为准。</div></div></div>';
        if (this.section === 'economy')
          html =
            '<h3>装备回收</h3>' +
            f('自动出售普通装备', 'sell.enabled') +
            f('允许出售的最高品质数值', 'sell.maxQuality', { max: 5 }) +
            f('出售时排除套装装备', 'sell.keepSets') +
            f('保留尚未达到等级的装备', 'sell.keepFuture') +
            f('保留各部位最佳备用装', 'sell.keepBestBackup') +
            f('保留托管新打造装备', 'sell.keepCrafted') +
            f('额外保留模板ID', 'sell.keepTemplateIds') +
            f('明确允许出售的材料ID', 'sell.materialIds') +
            f('每日出售操作上限', 'sell.maxPerDay') +
            '<div class="hint">穿戴、强化、镶宝、星级和鉴定装备始终保留。材料仅按填写的模板ID处理。</div><div class="section"><h3>自动存入仓库</h3>' +
            f('自动将装备存入仓库', 'warehouse.enabled') +
            f('存仓最低品质（≥此品质）', 'warehouse.minQuality', {
              choices: [
                [1, '白色（1）'],
                [2, '绿色（2）'],
                [3, '蓝色（3）'],
                [4, '紫色（4）'],
                [5, '5 及以上'],
              ],
            }) +
            f('套装装备一律存仓（无视品质）', 'warehouse.sets') +
            f('自动存入双完美资质装备', 'warehouse.perfect') +
            '<div class="hint">只处理背包中未穿戴的装备；可穿戴的更优装备会先穿戴。仓库装备格满 200 时暂停存仓。符合存仓条件的装备不会被自动出售。</div></div><div class="section"><h3>金币补药与自动回复</h3>' +
            f('金币购买等级适用药品', 'shop.enabled') +
            f('少于此数量时补充', 'shop.minimumStock') +
            f('目标库存数量', 'shop.targetStock') +
            f('单次购买最大数量', 'shop.maxBatch') +
            f('自动配置内置用药', 'potions.enabled') +
            f('生命回复阈值 %', 'potions.hpThreshold', { min: 10, max: 80 }) +
            f('内力回复阈值 %', 'potions.mpThreshold', { min: 10, max: 80 }) +
            f('按实测掉血自动抬高生命阈值', 'potions.autoThreshold') +
            f('自动按药效选择优先级', 'potions.autoChoose') +
            f('用药顺序', 'potions.order', {
              choices: [
                ['fit', '按缺口智能选择（推荐）'],
                ['weak', '低级药优先（先清库存）'],
                ['strong', '药效优先'],
                ['smart', '智能（实测消耗下最省金币的药）'],
              ],
            }) +
            f('指定生命药模板ID', 'potions.hpPriority') +
            f('指定内力药模板ID', 'potions.mpPriority') +
            '<div class="hint">回血量长期等于掉血量，阈值高低不改变吃药数量，只决定安全余量。智能顺序按实测的每秒掉血和耗蓝，选回复速度够用、每金币回复最多的药，并改买这种药；血量低于 35% 或阵亡后一段时间内改用最强的药。</div>' +
            '<div class="hint">游戏自动回复每次只用一颗药且有冷却。智能选择会按“最大值×(100%−阈值)”算出触发时的缺口，优先用刚好补满缺口的最小药，补不满的低级药排在后面兜底。填写指定模板ID时按填写顺序。</div></div>';
        if (this.section === 'budget')
          html =
            '<h3>资源预算（本机日期）</h3><div class="hint">人物升级按目标等级和保留经验执行。技能升级、冶炼各有每日额度。向下滚动查看全部设置。</div>' +
            f('保留金币', 'budget.moneyReserve') +
            f('每日金币支出额度', 'budget.moneyPerDay') +
            f('保留经验', 'budget.expReserve') +
            f('每日技能经验额度', 'budget.skillExpPerDay') +
            f('每日冶炼经验额度', 'budget.smeltExpPerDay') +
            '<div class="hint">三项每日额度及各功能的每日操作上限填 0 均表示不限（仍受保留金币、保留经验约束）。保存不会清零已用额度。托管暂停时，保存后需点击“开始托管”。</div><div class="hint legacy-experience-note"></div><div class="section"><h3>恢复与调度</h3>' +
            f('页面刷新后恢复托管', 'resumeAfterReload') +
            f('托管运行时持有 Web Lock（防标签页睡眠）', 'keepAwake') +
            f('连接恢复后继续托管', 'reconnect.enabled') +
            f('长时间断线时刷新页面', 'reconnect.autoReload') +
            f('断线多久后刷新（秒）', 'reconnect.reloadAfterSeconds') +
            f('每小时最多自动刷新', 'reconnect.maxReloadsPerHour') +
            f('策略检查间隔（毫秒）', 'tickMs', { min: 700 }) +
            f('动作响应超时（毫秒）', 'requestTimeoutMs', { min: 6000 }) +
            '<div class="actions"><button type="button" class="btn" data-action="defaults">载入默认策略</button><button type="button" class="btn" data-action="export">导出配置</button></div></div>';
        if (this.section === 'logs')
          html =
            '<h3>最近动作</h3><div class="live-logs">' +
            this.logsHTML(status.logs) +
            '</div><div class="section"><h3>高级配置JSON</h3><div class="hint">修改后先载入，再保存。模板ID与评分权重均保存在本机配置中。</div><textarea spellcheck="false" aria-label="高级配置JSON">' +
            esc(JSON.stringify(this.pending, null, 2)) +
            '</textarea><div class="error"></div><div class="actions"><button type="button" class="btn" data-action="applyJson">载入JSON配置</button><button type="button" class="btn" data-action="export">导出配置</button><button type="button" class="btn" data-action="diagnostics">导出诊断</button></div></div>';
        if (this.section === 'updates') {
          const u = status.updates || { currentVersion: status.version, error: '', notes: null };
          this.updateKey = JSON.stringify(u);
          html =
            '<h3>版本与更新</h3>' +
            f('每天检查 GitHub 上的最新版本', 'updates.checkDaily') +
            f('发现新版本时提醒', 'updates.remind') +
            f('发现新版本后自动刷新页面启用', 'updates.autoApply') +
            this.updateHTML(u);
        }
        this.root.querySelector('.body').innerHTML = html;
        this.root
          .querySelectorAll('[data-tab]')
          .forEach((b) => b.classList.toggle('active', b.dataset.tab === this.section));
        this.root.querySelector('.dirty').textContent = this.dirty
          ? '有未保存的配置'
          : '配置已保存';
      }
      logsHTML(logs) {
        return logs.length
          ? logs
              .map(
                (l) =>
                  `<div class="log ${esc(l.level)}"><time>${esc(l.time)}</time>${esc(l.text)}</div>`,
              )
              .join('')
          : '<div class="hint">暂无动作记录。</div>';
      }
      updateHTML(u) {
        const sections = Array.isArray(u.notes?.sections) ? u.notes.sections : [];
        return `<div class="update-summary"><div class="notice">当前运行 v${esc(u.currentVersion)}${u.latestVersion ? ' · GitHub 最新版本 v' + esc(u.latestVersion) : ''}${u.newer ? '<br>发现新版本。' : ''}</div><div class="hint">新版本由 Tampermonkey 自动安装（默认每天检查一次），页面刷新后生效。托管运行并开启“页面刷新后恢复托管”时，脚本发现新版本会自动刷新页面：立即一次，之后每 6 小时一次，每个版本最多 5 次。想立即更新，点“安装新版本”，在 Tampermonkey 页面确认后刷新游戏。</div>${u.newer && u.apply?.exhausted ? '<div class="hint">已自动刷新 5 次仍是旧版本，请点“安装新版本”。</div>' : ''}${u.notes ? `<h3>${esc(u.notes.title)}</h3>${sections.map((s) => `<div class="hint"><strong>${esc(s.title)}</strong></div><ul>${s.items.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`).join('')}` : u.newer ? '<div class="hint">更新内容暂未读取，可在发布页查看。</div>' : ''}<div class="hint">${u.busy ? '正在读取公开版本信息' : u.error ? esc(u.error) : u.checkedAt ? '最近检查：' + esc(new Date(u.checkedAt).toLocaleString()) : '尚未检查公开版本'}${u.nextCheckAt ? '<br>下次可检查：' + esc(new Date(u.nextCheckAt).toLocaleString()) : ''}<br>自动检查每天一次，手动检查间隔至少 60 秒。</div><div class="actions"><button type="button" class="btn" data-action="checkUpdate">检查更新</button><button type="button" class="btn primary" data-action="openUpdate">打开发布页</button>${u.newer ? '<button type="button" class="btn" data-action="installUpdate">安装新版本</button><button type="button" class="btn" data-action="dismissUpdate">关闭本版提醒</button>' : ''}</div><div class="section"><h3>选择自动更新</h3><div class="hint">在油猴管理面板打开本脚本的设置，启用“检查更新”。实际自动安装由油猴执行；本页的开关控制版本检查和提醒。新版安装后需刷新游戏。</div></div></div>`;
      }
      statsHTML(stats, maps) {
        if (!stats) return '<div class="hint">等待角色数据</div>';
        const fmt = TLRuntime.statsNumber, duration = TLRuntime.statsDuration;
        const rate = (n, time) => fmt(time ? n * 3600000 / time : 0);
        const card = (title, b) => {
          const net = b.gold + b.sell - b.potion;
          const rows = [['经验', fmt(b.exp) + ' · ' + rate(b.exp, b.wall) + '/时'],
            ['击杀金币', fmt(b.gold)], ['出售收入', fmt(b.sell)], ['药费', fmt(b.potion)],
            ['净金币', fmt(net) + ' · ' + rate(net, b.wall) + '/时'],
            ['战斗占比', (b.wall ? b.battle / b.wall * 100 : 0).toFixed(1) + '%'],
            ['击杀', fmt(b.kills)], ['阵亡', fmt(b.deaths)], ['低血量', duration(b.low)], ['用药', '生命 ' + fmt(b.hpPotions) + ' · 内力 ' + fmt(b.mpPotions)]];
          return '<h3>' + title + '</h3>' + rows.map(([label, value]) => `<div class="budget-card"><span>${label}</span><span>${value}</span></div>`).join('');
        };
        const rows = stats.summary.maps.map((b) => {
          const name = (maps || []).find((m) => Number(m.id) === b.mapId)?.name || b.mapId;
          return '<tr>' + [esc(name), duration(b.battle), rate(b.exp, b.battle), rate(b.expBase, b.battle),
            rate(b.gold + b.sell, b.battle), rate(b.potion, b.battle), rate(b.gold + b.sell - b.potion, b.battle), fmt(b.deaths)]
            .map((v) => '<td>' + v + '</td>').join('') + '</tr>';
        }).join('');
        const r = stats.rates;
        const status = this.controller.status();
        return card('近 1 小时', stats.summary.recent) + card('今日', stats.summary.today) + card('上一小时', stats.summary.previous) +
          '<div class="section"><h3>按地图（近 72 小时）</h3><table class="income-table"><thead><tr>' +
          ['地图', '战斗时长', '经验/时', '单倍经验/时', '金币/时', '药费/时', '净金币/时', '阵亡'].map((v) => '<th>' + v + '</th>').join('') +
          '</tr></thead><tbody>' + rows + '</tbody></table></div><div class="hint">当前消耗：' +
          (r.seconds < 60 ? '数据不足' : '每秒掉血 ' + fmt(r.hpLossPerSec) + ' · 每秒耗蓝 ' + fmt(r.mpUsePerSec) + ' · 10 秒最大掉血 ' + Math.round(r.worstLoss10Pct) + '% · 样本 ' + fmt(r.seconds) + ' 秒') +
          ['hp', 'mp'].map((key) => {
            const pick = status.potions[key];
            return pick ? ' · ' + (key === 'hp' ? '生命药 ' : '内力药 ') + esc(pick.name) + '（回复 ' + fmt(pick.perSecond) + '/秒，需要 ' + fmt(pick.need) + '/秒）' : '';
          }).join('') +
          (this.controller.prefs.potions.autoThreshold ? ' · 生命阈值 ' + status.threshold + '%' : '') +
          '</div><button class="btn" type="button" data-action="clearStats">清空统计</button>' +
          '<div class="hint">经验按击杀前后的差值统计；“单倍经验”把天灵丹双倍时段折半，方便比较地图。每小时数值按在线时间折算，地图表按战斗时间折算。</div>';
      }
      paint() {
        if (!this.root) return;
        const s = this.controller.status(),
          fmt = (n) =>
            Math.abs(Number(n || 0)) >= 1e12
              ? Number(n).toExponential(2)
              : Number(n || 0).toLocaleString('zh-CN');
        const u = s.updates,
          tab = this.root.querySelector('[data-tab="updates"]');
        if (tab) {
          tab.classList.toggle('has-update', !!u?.newer);
          tab.textContent = u?.newer ? '更新 · 新' : '更新';
        }
        if (
          u?.newer &&
          !u.dismissed &&
          this.controller.prefs.updates.remind &&
          !this.dirty &&
          this.notifiedVersion !== u.latestVersion
        ) {
          this.notifiedVersion = u.latestVersion;
          this.section = 'updates';
          this.root.querySelector('.wrap').classList.remove('collapsed');
          this.renderBody();
        }
        if (!this.dirty && JSON.stringify(this.pending) !== JSON.stringify(this.controller.prefs)) {
          this.pending = TLPolicy.clone(this.controller.prefs);
          this.renderBody();
        }
        if (this.section === 'updates' && !this.dirty && this.updateKey !== JSON.stringify(u))
          this.renderBody();
        if (this.section === 'stats' && !this.dirty && Date.now() - this.statsPaintAt >= 5000 &&
          this.statsKey !== this.statsHTML(s.stats, this.controller.bridge.state()?.maps)) this.renderBody();
        const card = (kind, label, value) =>
          `<div data-budget="${kind}"><span class="budget-title">${label}</span><span>${value}</span></div>`;
        this.root.querySelector('.summary').innerHTML =
          `<div class="status-line"><span class="dot ${s.ready ? 'on' : ''}"></span><span>${s.enabled ? '托管运行中' : '托管已暂停'} · ${s.ready ? '角色在线' : s.connected ? '等待角色' : '等待连接'}</span></div><div class="reason">${esc(s.reason)}</div><div class="stats">${s.role ? `<span>${esc(s.role.nickname)} · Lv.${s.role.level}</span><span>${esc(s.map)}</span><span>金币 ${fmt(s.role.money)}</span>` : '<span>登录后读取当前角色</span>'}</div>${s.ledger ? `<div class="budgets" aria-label="今日资源预算">${card('money', '今日金币支出', fmt(s.ledger.money) + ' / ' + (s.budget.moneyPerDay > 0 ? fmt(s.budget.moneyPerDay) : '不限'))}${card('exp', '今日经验总投入', fmt(s.ledger.exp))}${card('skill', '技能预算已用', fmt(s.experienceBudgets.skill.used) + ' / ' + (s.experienceBudgets.skill.unlimited ? '不限' : fmt(s.experienceBudgets.skill.limit)))}${card('smelt', '冶炼预算已用', fmt(s.experienceBudgets.smelt.used) + ' / ' + (s.experienceBudgets.smelt.unlimited ? '不限' : fmt(s.experienceBudgets.smelt.limit)))}</div>` : ''}${s.levelUp ? `<div class="level-reason" data-code="${esc(s.levelUp.code)}">${esc(s.levelUp.reason)}</div>` : ''}${s.skillUp ? `<div class="level-reason" data-code="${esc(s.skillUp.code)}">${esc(s.skillUp.reason)}</div>` : ''}`;
        if (s.scoring.mode === 'combat') this.root.querySelector('.summary').innerHTML += '<div>' + esc(TLPolicy.scoringText(s.scoring)) + '</div>';
        if (s.arena) this.root.querySelector('.summary').innerHTML +=
          `<div>比武：第 ${esc(s.arena.rank)} 名 · 今日挑战 ${s.arena.attempts}/${this.controller.prefs.arena.maxPerDay || '不限'} · 点赞 ${s.arena.liked ? '已' : '未'}</div>`;
        this.root.querySelector('.summary').innerHTML += `<div>珍兽：${s.pets.count ?? '?'} / ${s.pets.capacity ?? '?'} · ${s.pets.active ? '出战 ' + esc(s.pets.active.pet.name) + ' Lv.' + s.pets.active.pet.level : '未出战'} · 蛋 ${s.pets.eggs ?? '?'}</div>`;
        if (s.hidden) this.root.querySelector('.summary').innerHTML +=
          `<div>暗器：Lv.${s.hidden.level} · 品质 ${s.hidden.quality}% · 砂 ${s.hidden.sand} · 玉 ${s.hidden.jade} · 印 ${s.hidden.seals}</div>`;
        const income = s.stats?.summary.recent;
        if (income?.wall >= 60000) this.root.querySelector('.summary').innerHTML +=
          `<div>收益：经验 ${TLRuntime.statsNumber(income.exp * 3600000 / income.wall)}/时 · 金币 ${TLRuntime.statsNumber((income.gold + income.sell) * 3600000 / income.wall)}/时 · 药费 ${TLRuntime.statsNumber(income.potion * 3600000 / income.wall)}/时</div>`;
        const old = this.root.querySelector('.legacy-experience-note');
        if (old) {
          old.hidden = !s.ledger?.unclassifiedExp;
          old.textContent = old.hidden
            ? ''
            : '旧版未分类投入 ' +
              fmt(s.ledger.unclassifiedExp) +
              '，已占用技能和冶炼预算；人物升级继续按等级目标执行。';
        }
        this.root.querySelector('.dirty').textContent = this.dirty
          ? '有未保存的配置'
          : '配置已保存 · ' + (s.enabled ? '托管运行中' : '托管已暂停');
        const logs = this.root.querySelector('.live-logs');
        if (logs) logs.innerHTML = this.logsHTML(s.logs);
        const key = s.role?.id || '';
        if (key && key !== this.roleKey && !this.dirty) {
          this.roleKey = key;
          this.renderBody();
        }
      }
      download(name, value) {
        const url = URL.createObjectURL(
            new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }),
          ),
          a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }
    return { Panel };
  })();

  if (
    location.protocol === 'https:' &&
    ((location.hostname === 'tl.jayczee.top' && location.port === '1212') ||
      (location.hostname === 'tl2.jayczee.top' && location.port === '11212') ||
      (location.hostname === 'tl3.jayczee.top' && location.port === '11212')) &&
    window.top === window &&
    !window.__TL_AUTOPILOT_INSTALLED__
  ) {
    window.__TL_AUTOPILOT_INSTALLED__ = true;
    const controller = new TLRuntime.Controller();
    controller.updates = new TLUpdates.Checker(controller);
    const panel = new TLPanel.Panel(controller);
    controller.filler = new TLRuntime.Filler(controller);
    controller.filler.start();
    controller.updates.onChange = () => controller.paint();
    controller.updates.start();
    window.TLAutopilot = Object.freeze({
      start: () => controller.start(),
      pause: () => controller.pause(),
      stopBattle: () => controller.stopBattle(),
      preview: () => controller.preview(),
      status: () => controller.status(),
      getConfig: () => TLPolicy.clone(controller.prefs),
      setConfig: (v) => controller.updateConfig(v),
    });
  }
})();
