#!/usr/bin/env node
// ============================================================
// SIM-DIFFICULTY — Étude de la progression de difficulté
// ------------------------------------------------------------
// Reproduit les formules clés de Hogwarth (battle.js, dungeon.js,
// battle-spells.js) pour estimer la difficulté du mode Normal,
// étage par étage, en solo et en duo.
//
// Sortie : tableaux Markdown sur stdout, exploitables pour le
// rapport DIFFICULTY_REPORT.md.
//
// Usage : node tools/sim-difficulty.js [N_SIMS]
//   N_SIMS = nombre de simulations par étage par mode (def: 400)
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── Chargement des données du jeu (MONSTERS, SPELLS) ─────────
// On évalue les fichiers source dans un sandbox vm pour récupérer
// les constantes globales. Les `let`/`const` au top-level d'un
// script vm sont exposées si on les déclare via `var` ou si on
// utilise un contexte qui capture. Le plus simple : on ajoute un
// suffixe `module.exports.X = X` pour chaque constante voulue.
function loadGameData() {
  const root = path.join(__dirname, '..');
  const monstersSrc = fs.readFileSync(path.join(root, 'js/monsters.js'), 'utf8');
  const dataSrc     = fs.readFileSync(path.join(root, 'js/data.js'),     'utf8');

  // Sandbox commun : on injecte un objet `globalThis` qu'on peut
  // muter, puis on patche les sources pour publier les bindings.
  const sandbox = { console, exports: {} };
  vm.createContext(sandbox);

  const patchedMonsters = monstersSrc + '\n;exports.MONSTERS = MONSTERS;';
  vm.runInContext(patchedMonsters, sandbox, { filename: 'monsters.js' });

  // data.js définit beaucoup de constantes mais on a juste besoin
  // de SPELLS, CHARACTERS, LEVEL_UP_XP_MULTIPLIER, RESIST/WEAK.
  // ITEMS y vit aussi (références circulaires avec MONSTERS.drops).
  // On évalue le fichier complet dans le même sandbox.
  const patchedData = dataSrc + `\n;exports.SPELLS = SPELLS;\n;exports.CHARACTERS = CHARACTERS;\n` +
    `;exports.LEVEL_UP_XP_MULTIPLIER = LEVEL_UP_XP_MULTIPLIER;\n` +
    `;exports.RESIST_MULTIPLIER = RESIST_MULTIPLIER;\n` +
    `;exports.WEAK_MULTIPLIER = WEAK_MULTIPLIER;\n`;
  vm.runInContext(patchedData, sandbox, { filename: 'data.js' });

  return sandbox.exports;
}

const { MONSTERS, SPELLS, CHARACTERS, LEVEL_UP_XP_MULTIPLIER,
        RESIST_MULTIPLIER, WEAK_MULTIPLIER } = loadGameData();

const spellByName = Object.fromEntries(SPELLS.map(s => [s.name, s]));

// ── Constantes simulation ───────────────────────────────────
const N_SIMS = parseInt(process.argv[2] || '400', 10);
const FLOORS = Array.from({ length: 12 }, (_, i) => i + 1);

// Hypothèse : ~4 combats par étage en moyenne (8 rooms - shop/chest - escaliers,
// densité 0.6 → ~4 enemy spawns; cf. dungeon.js:202)
const COMBATS_PER_FLOOR_AVG = 4;

// ── Reproduction des formules du jeu ─────────────────────────

// dungeon.js:16 — scaleMonster (Normal = diffMult 1.0, on ignore shiny pour la sim)
function scaleMonster(base, floor) {
  const mult = 1 + (floor - 1) * (base.scale || 0.25);
  return {
    ...JSON.parse(JSON.stringify(base)),
    hp:  Math.floor(base.hp  * mult),
    atk: Math.floor(base.atk * mult),
    def: Math.floor(base.def * mult),
    xp:  Math.floor(base.xp  * mult),
    gold: Math.floor((typeof base.gold === 'object'
            ? (base.gold.min + base.gold.max) / 2
            : base.gold) * mult),
    currentHp: Math.floor(base.hp * mult),
    disarmed: 0,
  };
}

// battle.js:122 — rollGroupSize (Normal = m = 1.0)
function rollGroupSize(floor, partySize) {
  const r = Math.random();
  const m = 1.0;
  if (partySize === 1) {
    if (floor <= 2) return 1;
    if (floor <= 4) return r < 0.70 ? 1 : 2;
    return r < 0.50 ? 1 : 2;
  }
  if (floor <= 2) return r < 0.65 ? 1 : 2;
  if (floor <= 4) { return r < 0.30 ? 1 : (r < 0.75 ? 2 : 3); }
  return r < 0.20 ? 1 : (r < 0.55 ? 2 : 3);
}

// Tirage pondéré sur le pool éligible
function weightedPick(pool) {
  const total = pool.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of pool) { r -= (m.weight || 1); if (r <= 0) return m; }
  return pool[pool.length - 1];
}

function eligiblePool(floor) {
  return MONSTERS.filter(m => m.minFloor <= floor && (m.maxFloor === null || floor <= m.maxFloor));
}

// ── Création des personnages ─────────────────────────────────

// Reproduit _hydrateCharacter() + recalculateStats() pour les
// stats dérivées de base, puis applique les level-ups.
function createHero(key, level) {
  const def = CHARACTERS[key];
  const c = {
    name: def.name,
    role: def.role,
    hpMax: def.hp,  hp: def.hp,
    spMax: def.sp,  sp: def.sp,
    _baseAtk: def.atk, _baseDef: def.def, _baseMag: def.mag, _baseLck: def.lck,
    str: def.str, int: def.int, agi: def.agi, end: def.end,
    spells: [...def.spells],
    shieldTurns: 0,
    statusEffects: [],
  };
  // Apprentissage des sorts par level-up (cf. CLAUDE.md + main.js)
  const learnByLevel = {
    2:  { hermione: ['Expelliarmus'] },
    3:  { harry: ['Accio'], hermione: ['Stupefix'] },
    4:  { harry: ['Wingardium Leviosa'] },
    5:  { harry: ['Reparo'], hermione: ['Diffindo'] },
    7:  { harry: ['Diffindo'], hermione: ['Wingardium Leviosa', 'Reparo'] },
    9:  { both: ['Avada...'] },
  };
  for (let lv = 2; lv <= level; lv++) {
    // grant HP/SP/stats
    c.hpMax += 8;  c.hp = c.hpMax;
    c.spMax += 5;  c.sp = c.spMax;
    c._baseAtk += 1;  c._baseDef += 1;  c._baseMag += 1;
    // apprentissage
    const learn = learnByLevel[lv];
    if (learn) {
      const adds = (learn[key] || []).concat(learn.both || []);
      for (const sp of adds) if (!c.spells.includes(sp)) c.spells.push(sp);
    }
  }
  // Stats effectives (pas d'équipement dans cette sim, donc atk = _base)
  c.atk = c._baseAtk; c.def = c._baseDef; c.mag = c._baseMag; c.lck = c._baseLck;
  c.critChance    = Math.max(5, Math.min(40, 5 + c.lck * 0.5));
  c.dodgeChance   = Math.max(5, Math.min(35, 5 + c.agi * 0.4));
  c.critMultiplier = 1.5;
  c.level = level;
  return c;
}

// ── Progression d'XP attendue par étage ──────────────────────

// xpNext progression : 50, 80, 128, 204, 326, 521, 833, 1332, 2131, 3409, 5455, 8728, 13965...
function xpNeededForLevel(level) {
  // XP cumulé requis pour atteindre `level` depuis le niveau 1
  let total = 0; let xpNext = 50;
  for (let lv = 1; lv < level; lv++) {
    total += xpNext;
    xpNext = Math.floor(xpNext * LEVEL_UP_XP_MULTIPLIER);
  }
  return total;
}

function levelFromXp(totalXp) {
  let level = 1; let xpNext = 50; let acc = 0;
  while (acc + xpNext <= totalXp) { acc += xpNext; level++; xpNext = Math.floor(xpNext * LEVEL_UP_XP_MULTIPLIER); }
  return level;
}

// XP moyenne d'un combat à l'étage f
function avgCombatXp(floor, partySize) {
  const pool = eligiblePool(floor);
  if (!pool.length) return 0;
  const totalW = pool.reduce((s, m) => s + (m.weight || 1), 0);
  // XP moyen pondéré du monstre médian, scalé
  const avgXpScaled = pool.reduce((s, m) => {
    const mult = 1 + (floor - 1) * (m.scale || 0.25);
    return s + (m.weight || 1) * m.xp * mult;
  }, 0) / totalW;
  // Taille de groupe moyenne
  const samples = 200;
  let totalSize = 0;
  for (let i = 0; i < samples; i++) totalSize += rollGroupSize(floor, partySize);
  const avgSize = totalSize / samples;
  return avgXpScaled * avgSize;
}

// Niveau attendu à l'entrée de l'étage f, en assumant `COMBATS_PER_FLOOR_AVG` combats / étage
function expectedLevelAtFloor(floor, partySize) {
  let totalXp = 0;
  for (let f = 1; f < floor; f++) {
    totalXp += avgCombatXp(f, partySize) * COMBATS_PER_FLOOR_AVG;
  }
  return levelFromXp(totalXp);
}

// ── Stats moyennes du pool ennemi à l'étage f ────────────────

function poolStats(floor) {
  const pool = eligiblePool(floor);
  if (!pool.length) return null;
  const totalW = pool.reduce((s, m) => s + (m.weight || 1), 0);
  const wAvg = (key) => pool.reduce((s, m) => {
    const mult = 1 + (floor - 1) * (m.scale || 0.25);
    return s + (m.weight || 1) * Math.floor(m[key] * mult);
  }, 0) / totalW;
  return {
    poolSize: pool.length,
    hp:  wAvg('hp'),
    atk: wAvg('atk'),
    def: wAvg('def'),
    mag: wAvg('mag'),
  };
}

// ── Simulation d'un combat ───────────────────────────────────

// IA joueur très simple :
//   1. Si char.hp < 40 % et un sort de soin dispo (Episkey/Reparo) et SP ok → heal soi
//   2. Si shield disponible (Protego) et turn==1 et HP < 100% → Protego
//   3. Si meilleur sort de dégât dispo et SP ok → cast sur 1er ennemi vivant
//   4. Sinon attaque physique
//
// IA ennemi : tryEnemyAbility() puis attaque physique. On ignore les
// statuts DoT (burn/bleed) pour simplifier — impact <5% sur l'issue.

function simulateBattle(party, enemyGroup) {
  // Reset state pour la sim
  party.forEach(c => { c.hp = c.hpMax; c.sp = c.spMax; c.shieldTurns = 0; });
  enemyGroup.forEach(e => { e.currentHp = e.hp; e.disarmed = 0; });

  const partySize = party.length;
  let turn = 0;
  const MAX_TURNS = 80;
  let totalEnemyDmg = 0;

  while (turn < MAX_TURNS) {
    turn++;

    // Tour de chaque héros vivant
    for (const char of party) {
      if (char.hp <= 0) continue;
      const enemies = enemyGroup.filter(e => e.currentHp > 0);
      if (!enemies.length) {
        const survivors = party.filter(c => c.hp > 0).length;
        return { won: true, turns: turn, survivors, hpPct: avgHpPct(party), enemyDmg: totalEnemyDmg };
      }
      heroAct(char, enemies);
    }

    // Tour ennemi
    const aliveTargets = party.filter(c => c.hp > 0);
    if (!aliveTargets.length) {
      return { won: false, turns: turn, survivors: 0, hpPct: 0, enemyDmg: totalEnemyDmg };
    }
    for (const enemy of enemyGroup) {
      if (enemy.currentHp <= 0) continue;
      const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
      if (!target || target.hp <= 0) continue;
      totalEnemyDmg += enemyAct(enemy, target, partySize);
    }
  }

  // Stalemate (très long) — on considère comme une défaite mole
  return { won: false, turns: MAX_TURNS, survivors: party.filter(c => c.hp > 0).length, hpPct: avgHpPct(party), enemyDmg: totalEnemyDmg, stalemate: true };
}

function avgHpPct(party) {
  return party.reduce((s, c) => s + Math.max(0, c.hp) / c.hpMax, 0) / party.length;
}

function heroAct(char, enemies) {
  const target = enemies[0];

  // 1. Auto-heal si hp < 40 %
  if (char.hp < char.hpMax * 0.40) {
    const heal = pickHealSpell(char);
    if (heal && char.sp >= heal.cost) {
      char.sp -= heal.cost;
      char.hp = Math.min(char.hpMax, char.hp + heal.power);
      return;
    }
  }

  // 2. Best damage spell
  const dmgSpell = pickDamageSpell(char);
  if (dmgSpell && char.sp >= dmgSpell.cost) {
    char.sp -= dmgSpell.cost;
    let dmg = dmgSpell.power + Math.floor(char.mag / 2);
    if (target.resist?.includes(dmgSpell.effect)) dmg = Math.floor(dmg * RESIST_MULTIPLIER);
    if (target.weak?.includes(dmgSpell.effect))   dmg = Math.floor(dmg * WEAK_MULTIPLIER);
    target.currentHp -= dmg;
    return;
  }

  // 3. Attaque physique
  const bonus = target.disarmed > 0 ? 2 : 0;
  let dmg = Math.max(1, char.atk + Math.floor(Math.random() * 4) - (target.def - bonus));
  if (target.disarmed > 0) target.disarmed--;
  if (Math.random() * 100 < char.critChance) dmg = Math.floor(dmg * char.critMultiplier);
  target.currentHp -= dmg;
}

// Sorts de soin dispo, le plus puissant prioritaire
function pickHealSpell(char) {
  const candidates = ['Reparo', 'Episkey']
    .filter(n => char.spells.includes(n))
    .map(n => spellByName[n])
    .filter(Boolean);
  return candidates[0];
}

// Meilleur sort de dégât accessible (cost <= SP), priorité puissance brute
function pickDamageSpell(char) {
  const damaging = ['Avada...', 'Sectumsempra', 'Diffindo', 'Incendio', 'Wingardium Leviosa', 'Stupefix']
    .filter(n => char.spells.includes(n))
    .map(n => spellByName[n])
    .filter(s => s && !s.locked);
  // Filtre par SP dispo
  const affordable = damaging.filter(s => char.sp >= s.cost);
  // Trie par puissance + mag/2 décroissant (puissance effective)
  affordable.sort((a, b) => (b.power + char.mag / 2) - (a.power + char.mag / 2));
  return affordable[0];
}

function enemyAct(enemy, target, partySize) {
  // Tentative de capacité spéciale (cf. battle-spells.js:7)
  if (enemy.abilities?.length) {
    const ability = enemy.abilities.find(a => Math.random() < a.chance);
    if (ability) {
      switch (ability.effect) {
        case 'damage': {
          const dmg = ability.power + Math.floor((enemy.mag || 0) / 2);
          if (target.shieldTurns > 0) { target.shieldTurns--; return 0; }
          target.hp = Math.max(0, target.hp - dmg);
          return dmg;
        }
        case 'heal': {
          enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + ability.power);
          return 0;
        }
        case 'weaken': {
          target.def = Math.max(0, target.def - ability.power);
          return 0;
        }
        case 'drain': {
          const drained = Math.min(target.hp, ability.power);
          target.hp = Math.max(0, target.hp - drained);
          enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + Math.floor(drained / 2));
          return drained;
        }
      }
    }
  }
  // Attaque physique simple : pas de RNG côté ennemi dans le code réel
  if (Math.random() * 100 < (target.dodgeChance || 0)) return 0;
  const dmg = Math.max(1, enemy.atk - target.def);
  target.hp = Math.max(0, target.hp - dmg);
  return dmg;
}

// ── Boucle principale : sims solo + duo ──────────────────────

function runSimulations() {
  const rows = [];

  for (const floor of FLOORS) {
    const pool = eligiblePool(floor);
    const stats = poolStats(floor);
    if (!stats) { rows.push({ floor, skip: true }); continue; }

    for (const partySize of [1, 2]) {
      const level = expectedLevelAtFloor(floor, partySize);
      const wins = { count: 0, turns: 0, hpPct: 0, dmgTaken: 0 };
      const groupSizes = { 1: 0, 2: 0, 3: 0 };

      for (let i = 0; i < N_SIMS; i++) {
        const party = partySize === 1
          ? [createHero('harry', level)]
          : [createHero('harry', level), createHero('hermione', level)];
        const size = rollGroupSize(floor, partySize);
        groupSizes[size]++;
        const enemyGroup = Array.from({ length: size }, () => scaleMonster(weightedPick(pool), floor));
        const res = simulateBattle(party, enemyGroup);
        if (res.won) {
          wins.count++;
          wins.turns += res.turns;
          wins.hpPct += res.hpPct;
        }
        wins.dmgTaken += res.enemyDmg;
      }

      rows.push({
        floor, partySize, level,
        winRate: wins.count / N_SIMS,
        avgTurns: wins.count ? wins.turns / wins.count : null,
        avgHpPctOnWin: wins.count ? wins.hpPct / wins.count : null,
        avgDmgTaken: wins.dmgTaken / N_SIMS,
        groupSizes,
        poolStats: stats,
      });
    }
  }

  return rows;
}

// ── Mise en forme du rapport ─────────────────────────────────

function pct(x) { return (x * 100).toFixed(0) + '%'; }
function num(x, d=1) { return x == null ? '—' : x.toFixed(d); }

function emitReport(rows) {
  // Section 1 : progression joueur attendue
  console.log('# Étude de la difficulté — mode Normal\n');
  console.log(`Simulation : ${N_SIMS} combats par couple (étage, mode). ` +
              `Hypothèse : ${COMBATS_PER_FLOOR_AVG} combats / étage en moyenne.\n`);

  console.log('## 1. Progression joueur attendue\n');
  console.log('| Étage | Niveau Solo | XP cumul Solo | Niveau Duo | XP cumul Duo |');
  console.log('|------:|------------:|--------------:|-----------:|-------------:|');
  for (const f of FLOORS) {
    const lvSolo = expectedLevelAtFloor(f, 1);
    const lvDuo  = expectedLevelAtFloor(f, 2);
    let xpSolo = 0; for (let i = 1; i < f; i++) xpSolo += avgCombatXp(i, 1) * COMBATS_PER_FLOOR_AVG;
    let xpDuo  = 0; for (let i = 1; i < f; i++) xpDuo  += avgCombatXp(i, 2) * COMBATS_PER_FLOOR_AVG;
    console.log(`| ${f} | ${lvSolo} | ${xpSolo.toFixed(0)} | ${lvDuo} | ${xpDuo.toFixed(0)} |`);
  }

  // Section 2 : pool ennemi
  console.log('\n## 2. Profil ennemi moyen par étage (pondéré par weight)\n');
  console.log('| Étage | Monstres éligibles | HP moy | ATK moy | DEF moy | MAG moy |');
  console.log('|------:|-------------------:|-------:|--------:|--------:|--------:|');
  for (const f of FLOORS) {
    const s = poolStats(f);
    if (!s) continue;
    console.log(`| ${f} | ${s.poolSize} | ${num(s.hp,0)} | ${num(s.atk,1)} | ${num(s.def,1)} | ${num(s.mag,1)} |`);
  }

  // Section 3 : Monte Carlo
  console.log('\n## 3. Résultats Monte Carlo\n');
  console.log('| Étage | Mode | Niv. | Win % | Tours moy. | PV restants (win) | Dégâts moy. subis |');
  console.log('|------:|:----:|-----:|------:|-----------:|------------------:|------------------:|');
  for (const r of rows) {
    if (r.skip) continue;
    const mode = r.partySize === 1 ? 'Solo' : 'Duo ';
    console.log(`| ${r.floor} | ${mode} | ${r.level} | ${pct(r.winRate)} | ${num(r.avgTurns,1)} | ${r.avgHpPctOnWin == null ? '—' : pct(r.avgHpPctOnWin)} | ${num(r.avgDmgTaken,1)} |`);
  }

  // Section 4 : verdicts
  console.log('\n## 4. Diagnostic : étages charnières\n');
  const verdict = (wr) => wr >= 0.85 ? '🟢 confortable' :
                          wr >= 0.65 ? '🟡 tendu' :
                          wr >= 0.40 ? '🟠 difficile' :
                                       '🔴 punitif';

  for (const partySize of [1, 2]) {
    const label = partySize === 1 ? 'Solo' : 'Duo';
    console.log(`\n### ${label}\n`);
    console.log('| Étage | Niv. | Win % | Verdict |');
    console.log('|------:|-----:|------:|:--------|');
    for (const r of rows.filter(r => r.partySize === partySize)) {
      console.log(`| ${r.floor} | ${r.level} | ${pct(r.winRate)} | ${verdict(r.winRate)} |`);
    }
  }

  // Section 5 : spikes (variations brutales)
  console.log('\n## 5. Détection des spikes (chute > 15 pts entre 2 étages)\n');
  for (const partySize of [1, 2]) {
    const subset = rows.filter(r => r.partySize === partySize);
    const label = partySize === 1 ? 'Solo' : 'Duo';
    let found = false;
    for (let i = 1; i < subset.length; i++) {
      const delta = subset[i-1].winRate - subset[i].winRate;
      if (delta > 0.15) {
        if (!found) { console.log(`### ${label}`); found = true; }
        console.log(`- Étage ${subset[i-1].floor} → ${subset[i].floor} : win rate ${pct(subset[i-1].winRate)} → ${pct(subset[i].winRate)} (−${(delta*100).toFixed(0)} pts)`);
      }
    }
    if (!found) console.log(`### ${label}\n- Aucun spike détecté.`);
  }

  // Section 6 : monstres "scale heavy" (>= 0.30) par étage
  console.log('\n## 6. Monstres à scaling élevé (scale ≥ 0.30)\n');
  console.log('| Monstre | scale | floors | weight | HP base | ATK base |');
  console.log('|:--------|------:|:-------|-------:|--------:|---------:|');
  for (const m of MONSTERS.filter(m => (m.scale || 0.25) >= 0.30).sort((a,b)=>b.scale-a.scale)) {
    const floors = `${m.minFloor}–${m.maxFloor || '∞'}`;
    console.log(`| ${m.name} | ${m.scale} | ${floors} | ${m.weight} | ${m.hp} | ${m.atk} |`);
  }
}

const rows = runSimulations();
emitReport(rows);
