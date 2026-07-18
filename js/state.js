// ============================================================
// ÉTAT GLOBAL MUTABLE
// ============================================================

// Tableaux de la carte courante
let dungeon, visited, enemyMap, itemMap;

// Position et orientation du joueur
let playerX, playerY, playerDir;

// Étage actuel
let currentFloor = 1;

// Nombre de joueurs choisi à l'écran de démarrage (1 ou 2)
let partySize = 2;

// ============================================================
// NIVEAU DE DIFFICULTÉ (Normal = difficulté de référence)
// ============================================================
let difficulty = "Normal"; // "Facile" | "Normal" | "Difficile" | "Expert"

const DIFFICULTY_SETTINGS = {
  Facile: {
    enemyGroupMultiplier: 0.65,  // groupes d'ennemis réduits
    scalingMultiplier:    0.75,  // scaling plus lent
    goldMultiplier:       1.6,
    xpMultiplier:         1.4,
    dropChanceMultiplier: 1.5,
    startingGold:         60,
    startingHpBonus:      12,
    searchRechargeSteps:  45    // pas avant qu'une case se refouille
  },
  Normal: {
    enemyGroupMultiplier: 1.0,
    scalingMultiplier:    1.0,
    goldMultiplier:       1.0,
    xpMultiplier:         1.0,
    dropChanceMultiplier: 1.0,
    startingGold:         25,
    startingHpBonus:      0,
    searchRechargeSteps:  60
  },
  Difficile: {
    enemyGroupMultiplier: 1.35,
    scalingMultiplier:    1.22,
    goldMultiplier:       0.75,
    xpMultiplier:         0.9,
    dropChanceMultiplier: 0.7,
    startingGold:         15,
    startingHpBonus:      -4,
    searchRechargeSteps:  80
  },
  Expert: {
    enemyGroupMultiplier: 1.65,
    scalingMultiplier:    1.45,
    goldMultiplier:       0.55,
    xpMultiplier:         0.75,
    dropChanceMultiplier: 0.45,
    startingGold:         8,
    startingHpBonus:      -8,
    searchRechargeSteps:  100
  }
};

// ============================================================
// MODE IRONMAN — vie unique + score classé (Hall of Fame)
// ============================================================
// `ironmanMode` est choisi à l'écran de difficulté (case à cocher) et
// verrouillé pour toute la partie : la difficulté ne peut plus changer.
// À la mort du groupe, au lieu de la pétrification (resurrect), un écran
// de résultat chiffré s'affiche et le score peut être soumis au Hall of
// Fame. `totalKills` et `defeatedBosses` alimentent le calcul du score.
// Les trois sont persistés dans le save (_serializeState / _applyState).
let ironmanMode    = false;
let totalKills     = 0;          // monstres vaincus (cumul sur la partie)
let defeatedBosses = new Set();  // ids de boss vaincus (faits d'armes)
// UID unique de la partie Ironman en cours — généré au démarrage, persisté
// dans le save, envoyé au Hall of Fame. Empêche le double-classement d'un
// même run (index unique `run_id` côté base). null hors mode Ironman.
let ironmanRunId   = null;

// ── Multijoueur — duel PvP snapshot (cf. .claude/plans/multiplayer.md §5) ──
// mpDuelActive / mpDuelMeta : état transient d'un duel en cours — non
// persisté (un save est refusé en combat). defeatedDuelists : `player_id`
// des adversaires déjà vaincus (anti-farm §5.5) — persisté dans le save.
let mpDuelActive     = false;
let mpDuelMeta       = null;
let defeatedDuelists = new Set();

// ── Mondes parallèles — session de visite (V1a Phase C) ─────
// État transient d'une visite inter-mondes — non persisté (la save
// du visiteur est figée à l'entrée, restaurée à la sortie). Forme :
//   {
//     role:           'visitor',         // toujours 'visitor' en C.1
//     hostId, hostName, hostHouse,        // identité du host visité
//     mySavedState,                       // snapshot de l'état du visiteur, restauré à la sortie
//     remoteHostMeta,                     // métadonnées du host (level, partyNames, currentFloor)
//   }
// Tant que la visite est active, les globaux dungeon/visited/etc.
// contiennent l'état injecté du host (cf. mpApplyVisitSnapshot).
// Cf. .claude/plans/parallel-worlds.md §3.4.
let visitSession = null;

// Mondes parallèles Phase F (§16.7 — toggle d'options pour masquer) :
// le host peut désactiver l'accueil des visites pour jouer concentré.
// Quand `true`, _mpPresenceRow envoie `status='closed'` (filtré par
// mpListAvailableHosts qui n'accepte que `exploring`) et toute demande
// entrante est refusée silencieusement (cf. _mpPollIncomingVisitRequests).
// Persisté dans la save pour rester stable entre sessions.
let visitsClosed = false;

// ── Mondes parallèles Phase G — combat local + amorce économie cross-plan ──
// `inAstralCombat`     : flag global posé par startBattle({astral:true}) pour
//                        que endBattle route les gains vers outremondeEssence
//                        (formule §6.10) au lieu de l'or/XP/drops standards.
//                        Non persisté (un save est refusé en combat).
// `outremondeEssence`  : monnaie cross-plan unique (Phase G/H). Cumulée à
//                        chaque écho vaincu. Persistée dans la save du
//                        visiteur — isolée de player.gold (cf. §6.10).
// `astralCellsDefeated`: Set "x,y" — cellules de la visite courante où un
//                        écho a été dissipé. Reset à mpApplyVisitSnapshot
//                        et à chaque floorSnapshot. Pas persisté.
// `astralFloorKills`   : compteur d'échos vaincus sur l'étage courant de
//                        la visite. Limite §6.8 : 3 par étage. Reset à
//                        chaque floorSnapshot. Pas persisté.
// `astralExileCooldownUntil` : timestamp ms — bloque `Apparition Astrale`
//                        pendant 5 minutes après une défaite astrale
//                        (§6.8). Persisté pour résister au reload.
let inAstralCombat         = false;
let outremondeEssence       = 0;
let astralCellsDefeated     = new Set();
let astralFloorKills        = 0;
let astralExileCooldownUntil = 0;

// ── Mondes parallèles Phase H §6.9/§6.10 — Verrou de Sang + atelier ─────
// `inSealedCombat`      : flag combat de résolution d'un Verrou (côté
//                         host). Routé par endBattle pour mettre à jour
//                         le statut `mp_threats` et distribuer le loot
//                         bonus. Non persisté.
// `outremondeFragments` : compteur de fragments cosmétiques (drop bonus
//                         des Verrous résolus). Persisté.
// `outremondePendingSeals` : tableau de Verrous posés par CE visiteur
//                            (côté visiteur). Forme : { id, hostId,
//                            hostName, monsterId, floor, postedAt }.
//                            La résolution asynchrone se lit via REST
//                            au prochain démarrage. Persisté.
// `hostSealsByFloor`     : Map<floor, [{id, x, y, monster_id,
//                          visitor_name}]> — Verrous actifs côté host
//                          pour l'étage donné. Chargé à l'entrée
//                          d'étage. Non persisté.
// `currentBloodSeal`     : ref du Verrou ciblé par le combat courant
//                          côté host (utilisé par endBattle pour
//                          marquer `resolved`). Non persisté.
let inSealedCombat        = false;
let outremondeFragments   = 0;
let outremondePendingSeals = [];
let hostSealsByFloor      = new Map();
let currentBloodSeal      = null;

// ── Mondes parallèles V1c.1 §6.10 — souvenirs / cosmétiques / sorts ──
// `outremondeMetrics`     : { visitsTotal, uniqueHosts:Set, sealsResolved,
//                            echosDefeated, pilgrimMark: {floor,x,y}|null }
//                           Métriques pour le déblocage automatique des
//                           souvenirs passifs. Persisté (Set sérialisé).
// `outremondeSouvenirs`   : Set des ids de souvenirs débloqués. Les bonus
//                           stat sont appliqués dans recalculateStats().
// `outremondeCosmetics`   : Set des ids de cosmétiques achetés (auras,
//                           portails, fissures). Le coût en essences +
//                           fragments est déduit à l'achat.
// `outremondeActiveAura`,
// `outremondeActivePortalSkin`,
// `outremondeActiveFissureSkin` : id du cosmétique actif par catégorie,
//                                 ou null. Lus par les couches visuelles
//                                 (CSS variables + portal-fx).
let outremondeMetrics = {
  visitsTotal:   0,
  uniqueHosts:   new Set(),
  sealsResolved: 0,
  echosDefeated: 0,
  pilgrimMark:   null
};
let outremondeSouvenirs        = new Set();
let outremondeCosmetics        = new Set();
let outremondeActiveAura       = null;
let outremondeActivePortalSkin = null;
let outremondeActiveFissureSkin = null;

// ============================================================
// VOIX DES HÉROS (barks — ÉTAPE 2, ch05 §5.4)
// ------------------------------------------------------------
// Toggle joueur (comme mute/voice) ; sérialisé comme préférence dans la
// save. `_barkSeen` mémorise les beats one-shot par session (non sérialisé,
// reset au démarrage). Cf. js/hero-barks.js.
let barksEnabled = true;
let _barkSeen    = new Set();

// Biais de génération par Maison V2 (perception déterministe, power-neutral —
// floor-ambiance.js `housePerceptionLine`). Flag de repli : à false, la couche
// V2 est neutralisée (retour au seul V1 cosmétique). Cosmétique pur, non
// sérialisé. `_housePoiSeen` : anti-répétition transient (clé "floor,x,y").
let houseGenBiasEnabled = true;
let _housePoiSeen       = new Set();

// ============================================================
// SYSTÈME DES MAISONS
// ============================================================
let chosenHouse = null;
let housePoints = 0;
let houseTier   = 0;  // 0 = aucun palier atteint, 1-16 = palier de base, 17/18 = Mythe/Apothéose, 19+ = série Apothéose ★ N
// Sample d'intro de la modale de don de Maison joué une seule fois par save
// (cf. .claude/plans/house-post-tier-18.md §4.5). Sérialisé par save.js.
let donationIntroPlayed = false;
// Items Tier 2 / Tier 4 Maison franchis mais pas encore remis. Le Chef de
// Maison (HOUSE_BONUSES[house].headOfHouse) les distribue lors d'une visite
// via specialAction `claim_house_reward`. Le bonus de stats reste appliqué
// immédiatement au franchissement (checkHouseLevelUp). Tier 5 distribue son
// item directement (cinématique post-victoire endgame).
let pendingHouseRewards = new Set();

// ── Architecture 16 paliers (Bronze/Argent/Or × 5 phases + Légende) ──
// Chaque phase narrative (Apprenti → Confirmé → Expert → Maître →
// Virtuose) se décompose en 3 sous-paliers (Bronze, Argent, Or) :
//   • Bronze → +1 LCK
//   • Argent → +1 stat principale
//   • Or     → récompense narrative (item via head-of-house ou quête)
// Le 16ᵉ palier (Légende) est endgame, gated par victoryAchieved dans
// js/main.js — checkHouseLevelUp.
//
// Étape 1bis (.claude/plans/houses-2.0.md §A) : la grille passe de 6 à
// 16 paliers actifs, avec calibration marathon (max 25000 pts ≈ étages
// 25+). Les Or de Confirmé/Expert/Virtuose recevront leurs items
// (set artifacts) en Étape 2/3 ; le placeholder reste vide d'item ici.
// ── Série Apothéose ★ N génératrice (post-tier 18, gold-sink illimité) ──
// Décision .claude/plans/house-post-tier-18.md (amendée 2026-05-25).
// `houseTier` continue d'incrémenter au-delà de 18 ; chaque étoile N
// correspond à `houseTier = 18 + N`. Seuil polynomial doux et bonus à
// quatre cadences (chaque ★ / 2 ★ / 5 ★ / 10 ★). Voir le helper
// `_starGeneratorBonus(N, gen)` ci-dessous et `checkHouseLevelUp`.
function _starGeneratorBonus(n, gen) {
  const b = {};
  b[gen.primaryStat] = 1;
  if (n % 2  === 0) b[gen.secondaryStat] = 1;
  if (n % 5  === 0) b._baseLck = 1;
  if (n % 10 === 0) b[gen.reserveStat] = 5;
  return b;
}
function _starGeneratorMsg(n, bonus, gen) {
  const parts = [`+${bonus[gen.primaryStat]} ${gen.primaryLabel}`];
  if (bonus[gen.secondaryStat]) parts.push(`+${bonus[gen.secondaryStat]} ${gen.secondaryLabel}`);
  if (bonus._baseLck)           parts.push(`+${bonus._baseLck} LCK`);
  if (bonus[gen.reserveStat])   parts.push(`+${bonus[gen.reserveStat]} ${gen.reserveLabel}`);
  return `${gen.emoji} Apothéose ★ ${n} ! ${parts.join(' · ')}`;
}

const HOUSE_BONUSES = {
  Gryffondor: {
    color: '#740001', accent: '#D3A625', emoji: '🦁',
    label: 'Gryffondor',
    desc: 'Bravoure, courage et chevalerie.',
    headOfHouse: 'mcgonagall',
    headOfHouseVoiceKey: 'mcgonagall',
    starGenerator: {
      requiresDarkTier: 2,
      emoji:          '🦁',
      primaryStat:    '_baseAtk', primaryLabel:   'ATK',
      secondaryStat:  '_baseStr', secondaryLabel: 'STR',
      reserveStat:    'hpMax',    reserveLabel:   'PV max',
    },
    tiers: [
      // Phase 1 — Apprenti
      { threshold: 50,    label: 'Apprenti Bronze', bonus: { _baseLck: 1 }, msg: '🦁 Premiers exploits ! +1 LCK' },
      { threshold: 150,   label: 'Apprenti Argent', bonus: { _baseAtk: 1 }, msg: '🦁 Le courage s\'affirme ! +1 ATK' },
      { threshold: 300,   label: 'Apprenti Or',     bonus: { item: 'brassard_lion' }, msg: '🦁 Bravoure éprouvée — le Brassard du Lion vous attend auprès du Pr McGonagall.' },
      // Phase 2 — Confirmé
      { threshold: 500,   label: 'Confirmé Bronze', bonus: { _baseLck: 1 }, msg: '🦁 Lion confirmé ! +1 LCK' },
      { threshold: 800,   label: 'Confirmé Argent', bonus: { _baseAtk: 1 }, msg: '🦁 Crocs aiguisés ! +1 ATK' },
      // Confirmé Or — Set du Lion pièce #2 (heaume_vaillant) via head-of-house.
      { threshold: 1200,  label: 'Confirmé Or',     bonus: { item: 'heaume_vaillant' }, msg: '🦁 Confirmé d\'or ! Le Heaume du Vaillant t\'attend auprès du Pr McGonagall.' },
      // Phase 3 — Expert
      { threshold: 1700,  label: 'Expert Bronze',   bonus: { _baseLck: 1 }, msg: '🦁 Expertise naissante ! +1 LCK' },
      { threshold: 2500,  label: 'Expert Argent',   bonus: { _baseAtk: 1 }, msg: '🦁 Maître d\'armes ! +1 ATK' },
      // Expert Or — récompense legendary NON-set (sword_gryff existant).
      { threshold: 3500,  label: 'Expert Or',       bonus: { item: 'sword_gryff' }, msg: "🦁 L'Épée de Gryffondor vous attend auprès du Pr McGonagall." },
      // Phase 4 — Maître
      { threshold: 4500,  label: 'Maître Bronze',   bonus: { _baseLck: 1 }, msg: '🦁 Maîtrise éprouvée ! +1 LCK' },
      { threshold: 6000,  label: 'Maître Argent',   bonus: { _baseAtk: 1 }, msg: '🦁 Le Lion rugit ! +1 ATK' },
      // Maître Or — Set du Lion pièce #3 (cape_godric) + débloque la quête de Maison.
      { threshold: 8000,  label: 'Maître Or',       bonus: { item: 'cape_godric', unlockSetQuest: true }, msg: '🦁 Maître d\'or ! La Cape de Godric t\'attend auprès du Pr McGonagall — et une quête légendaire s\'ouvre à toi.' },
      // Phase 5 — Virtuose
      { threshold: 10000, label: 'Virtuose Bronze', bonus: { _baseLck: 1 }, msg: '🦁 Virtuose montant ! +1 LCK' },
      { threshold: 13000, label: 'Virtuose Argent', bonus: { _baseAtk: 1 }, msg: '🦁 Virtuose accompli ! +1 ATK' },
      // Virtuose Or — Set artifact #3 = lame_godric (récompense de la quête, item livré ici uniquement si la quête est validée — câblage Étape 3).
      { threshold: 16000, label: 'Virtuose Or',     bonus: {}, msg: '🦁 Virtuose d\'or — la dernière relique attend que tu termines la quête du Lion.' },
      // Phase 6 — Légende (endgame, gated victoryAchieved). Restitue
      // lame_godric (existant) en récompense NON-set + bonus passif.
      { threshold: 25000, label: 'Légende',         bonus: { _baseAtk: 2, _baseLck: 1, legendaryPassive: true, item: 'lame_godric' }, msg: '🦁 Légende vivante de Gryffondor ! +2 ATK +1 LCK · Maîtrise Légendaire éveillée — la Lame de Godric vous attend.' },
      // Phase 7 — Mythe (palier endgame V3, gated Boucle Ténébreuse tier 1 :
      // étages 11+). Enseigne le sort exclusif de Maison à tout le groupe.
      { threshold: 30000, label: 'Mythe',           requiresDarkTier: 1, bonus: { _baseAtk: 2, _baseLck: 1, grantsSpell: 'Patronus Maxima', unlockMytheQuest: true }, msg: '🦁 Mythe vivant de Gryffondor ! +2 ATK +1 LCK · le Patronus Maxima t\'est révélé.' },
      // Phase 8 — Apothéose (palier capstone V3, gated Boucle Ténébreuse
      // tier 2 : étages 21+). Éveille le passif légendaire de Maison —
      // détecté par houseApotheosePassive() (main.js), pas de flag dédié.
      { threshold: 45000, label: 'Apothéose',       requiresDarkTier: 2, bonus: { _baseAtk: 3, _baseLck: 1, grantsSpell: 'Incendio Royal' }, msg: '🦁 Apothéose de Gryffondor ! +3 ATK +1 LCK · Cœur du Lion — +10 % de crit (physique ET sort), +15 % de dégâts critiques, et Élan : chaque crit accorde +8 % de dégâts (cumul, max 5). · Incendio Royal (Premium) t\'est offert.' },
    ]
  },
  Serpentard: {
    color: '#1A472A', accent: '#AAAAAA', emoji: '🐍',
    label: 'Serpentard',
    desc: 'Ambition, ruse et détermination.',
    headOfHouse: 'rogue',
    headOfHouseVoiceKey: 'rogue',
    starGenerator: {
      requiresDarkTier: 2,
      emoji:          '🐍',
      primaryStat:    '_baseMag', primaryLabel:   'MAG',
      secondaryStat:  '_baseInt', secondaryLabel: 'INT',
      reserveStat:    'spMax',    reserveLabel:   'PM max',
    },
    tiers: [
      { threshold: 50,    label: 'Apprenti Bronze', bonus: { _baseLck: 1 }, msg: "🐍 Premier souffle ! +1 LCK" },
      { threshold: 150,   label: 'Apprenti Argent', bonus: { _baseMag: 1 }, msg: "🐍 L'ambition vous galvanise ! +1 MAG" },
      { threshold: 300,   label: 'Apprenti Or',     bonus: { item: 'anneau_serpent' }, msg: "🐍 Ruse affûtée — l'Anneau du Serpent vous attend auprès du Pr Rogue." },
      { threshold: 500,   label: 'Confirmé Bronze', bonus: { _baseLck: 1 }, msg: '🐍 Souffle confirmé ! +1 LCK' },
      { threshold: 800,   label: 'Confirmé Argent', bonus: { _baseMag: 1 }, msg: '🐍 Venin distillé ! +1 MAG' },
      { threshold: 1200,  label: 'Confirmé Or',     bonus: { item: 'pendentif_mamba' }, msg: "🐍 Confirmé d'or ! Le Pendentif du Mamba vous attend auprès du Pr Rogue." },
      { threshold: 1700,  label: 'Expert Bronze',   bonus: { _baseLck: 1 }, msg: '🐍 Expertise discrète ! +1 LCK' },
      { threshold: 2500,  label: 'Expert Argent',   bonus: { _baseMag: 1 }, msg: '🐍 Maître alchimiste ! +1 MAG' },
      { threshold: 3500,  label: 'Expert Or',       bonus: { item: 'locket_slytherin' }, msg: '🐍 Le Médaillon de Serpentard vous attend auprès du Pr Rogue.' },
      { threshold: 4500,  label: 'Maître Bronze',   bonus: { _baseLck: 1 }, msg: '🐍 Maîtrise sombre ! +1 LCK' },
      { threshold: 6000,  label: 'Maître Argent',   bonus: { _baseMag: 1 }, msg: '🐍 Sortilèges affûtés ! +1 MAG' },
      { threshold: 8000,  label: 'Maître Or',       bonus: { item: 'cape_sibylline', unlockSetQuest: true }, msg: "🐍 Maître d'or ! La Cape Sibylline vous attend auprès du Pr Rogue — et une quête sombre s'ouvre à toi." },
      { threshold: 10000, label: 'Virtuose Bronze', bonus: { _baseLck: 1 }, msg: '🐍 Virtuose des ombres ! +1 LCK' },
      { threshold: 13000, label: 'Virtuose Argent', bonus: { _baseMag: 1 }, msg: '🐍 Maître absolu ! +1 MAG' },
      { threshold: 16000, label: 'Virtuose Or',     bonus: {}, msg: '🐍 Virtuose d\'or — la dernière relique attend que tu termines la quête du Serpent.' },
      { threshold: 25000, label: 'Légende',         bonus: { _baseMag: 2, _baseLck: 1, legendaryPassive: true, item: 'bague_salazar' }, msg: '🐍 Légende de Serpentard ! +2 MAG +1 LCK · Maîtrise Légendaire éveillée — la Bague de Salazar vous attend.' },
      { threshold: 30000, label: 'Mythe',           requiresDarkTier: 1, bonus: { _baseMag: 2, _baseLck: 1, grantsSpell: 'Sectumsempra Imperius', unlockMytheQuest: true }, msg: '🐍 Mythe vivant de Serpentard ! +2 MAG +1 LCK · le Sectumsempra Imperius t\'est révélé.' },
      { threshold: 45000, label: 'Apothéose',       requiresDarkTier: 2, bonus: { _baseMag: 3, _baseLck: 1, grantsSpell: "Morsure d'Émeraude" }, msg: '🐍 Apothéose de Serpentard ! +3 MAG +1 LCK · Soif du Serpent — tes sorts offensifs te drainent 15 % des dégâts en PV. · Morsure d\'Émeraude (Premium) t\'est offerte.' },
    ]
  },
  Serdaigle: {
    color: '#0E1A40', accent: '#946B2D', emoji: '🦅',
    label: 'Serdaigle',
    desc: 'Sagesse, intelligence et esprit vif.',
    headOfHouse: 'flitwick',
    headOfHouseVoiceKey: 'flitwick',
    starGenerator: {
      requiresDarkTier: 2,
      emoji:          '🦅',
      primaryStat:    '_baseMag', primaryLabel:   'MAG',
      secondaryStat:  '_baseInt', secondaryLabel: 'INT',
      reserveStat:    'spMax',    reserveLabel:   'PM max',
    },
    tiers: [
      { threshold: 50,    label: 'Apprenti Bronze', bonus: { _baseLck: 1 }, msg: "🦅 Premier savoir ! +1 LCK" },
      { threshold: 150,   label: 'Apprenti Argent', bonus: { _baseMag: 1 }, msg: "🦅 L'intellect s'éveille ! +1 MAG" },
      { threshold: 300,   label: 'Apprenti Or',     bonus: { item: 'plume_aigle' }, msg: "🦅 Esprit acéré — la Plume d'Aigle vous attend auprès du Pr Flitwick." },
      { threshold: 500,   label: 'Confirmé Bronze', bonus: { _baseLck: 1 }, msg: '🦅 Savoir confirmé ! +1 LCK' },
      { threshold: 800,   label: 'Confirmé Argent', bonus: { _baseMag: 1 }, msg: '🦅 Esprit aiguisé ! +1 MAG' },
      { threshold: 1200,  label: 'Confirmé Or',     bonus: { item: 'manteau_encre' }, msg: "🦅 Confirmé d'or ! Le Manteau d'Encre vous attend auprès du Pr Flitwick." },
      { threshold: 1700,  label: 'Expert Bronze',   bonus: { _baseLck: 1 }, msg: '🦅 Expertise reconnue ! +1 LCK' },
      { threshold: 2500,  label: 'Expert Argent',   bonus: { _baseMag: 1 }, msg: '🦅 Maître ès arcanes ! +1 MAG' },
      { threshold: 3500,  label: 'Expert Or',       bonus: { item: 'diademe_serdaigle' }, msg: '🦅 Le Diadème de Serdaigle vous attend auprès du Pr Flitwick.' },
      { threshold: 4500,  label: 'Maître Bronze',   bonus: { _baseLck: 1 }, msg: '🦅 Maîtrise aérienne ! +1 LCK' },
      { threshold: 6000,  label: 'Maître Argent',   bonus: { _baseMag: 1 }, msg: '🦅 Sage accompli ! +1 MAG' },
      { threshold: 8000,  label: 'Maître Or',       bonus: { item: 'oeil_aigle', unlockSetQuest: true }, msg: "🦅 Maître d'or ! L'Œil de l'Aigle vous attend auprès du Pr Flitwick — et un savoir oublié t'appelle." },
      { threshold: 10000, label: 'Virtuose Bronze', bonus: { _baseLck: 1 }, msg: '🦅 Virtuose lettré ! +1 LCK' },
      { threshold: 13000, label: 'Virtuose Argent', bonus: { _baseMag: 1 }, msg: '🦅 Maître des sorts ! +1 MAG' },
      { threshold: 16000, label: 'Virtuose Or',     bonus: {}, msg: '🦅 Virtuose d\'or — la dernière relique attend que tu termines la quête de l\'Aigle.' },
      { threshold: 25000, label: 'Légende',         bonus: { _baseMag: 2, _baseLck: 1, legendaryPassive: true, item: 'codex_rowena' }, msg: '🦅 Légende de Serdaigle ! +2 MAG +1 LCK · Maîtrise Légendaire éveillée — le Codex de Rowena vous attend.' },
      { threshold: 30000, label: 'Mythe',           requiresDarkTier: 1, bonus: { _baseMag: 2, _baseLck: 1, grantsSpell: 'Legilimens', unlockMytheQuest: true }, msg: '🦅 Mythe vivant de Serdaigle ! +2 MAG +1 LCK · le Legilimens t\'est révélé.' },
      { threshold: 45000, label: 'Apothéose',       requiresDarkTier: 2, bonus: { _baseMag: 3, _baseLck: 1, grantsSpell: 'Givre de Rowena' }, msg: '🦅 Apothéose de Serdaigle ! +3 MAG +1 LCK · Esprit de l\'Aigle — le coût de tes sorts baisse de 20 %. · Givre de Rowena (Premium) t\'est offert.' },
    ]
  },
  Poufsouffle: {
    color: '#372E29', accent: '#F0C75E', emoji: '🦡',
    label: 'Poufsouffle',
    desc: 'Loyauté, patience et travail acharné.',
    headOfHouse: 'sprout',
    headOfHouseVoiceKey: 'sprout',
    starGenerator: {
      requiresDarkTier: 2,
      emoji:          '🦡',
      primaryStat:    '_baseDef', primaryLabel:   'DEF',
      secondaryStat:  '_baseEnd', secondaryLabel: 'END',
      reserveStat:    'hpMax',    reserveLabel:   'PV max',
    },
    tiers: [
      { threshold: 50,    label: 'Apprenti Bronze', bonus: { _baseLck: 1 }, msg: '🦡 Premier serment ! +1 LCK' },
      { threshold: 150,   label: 'Apprenti Argent', bonus: { _baseDef: 1 }, msg: '🦡 Résistance naturelle ! +1 DEF' },
      { threshold: 300,   label: 'Apprenti Or',     bonus: { item: 'ceinture_blaireau' }, msg: '🦡 Loyauté récompensée — la Ceinture du Blaireau vous attend auprès du Pr Chourave.' },
      { threshold: 500,   label: 'Confirmé Bronze', bonus: { _baseLck: 1 }, msg: '🦡 Patience confirmée ! +1 LCK' },
      { threshold: 800,   label: 'Confirmé Argent', bonus: { _baseDef: 1 }, msg: '🦡 Carapace renforcée ! +1 DEF' },
      { threshold: 1200,  label: 'Confirmé Or',     bonus: { item: 'cape_loyaute' }, msg: '🦡 Confirmé d\'or ! La Cape de Loyauté vous attend auprès du Pr Chourave.' },
      { threshold: 1700,  label: 'Expert Bronze',   bonus: { _baseLck: 1 }, msg: '🦡 Travail acharné ! +1 LCK' },
      { threshold: 2500,  label: 'Expert Argent',   bonus: { _baseDef: 1 }, msg: '🦡 Indomptable ! +1 DEF' },
      { threshold: 3500,  label: 'Expert Or',       bonus: { item: 'coupe_poufsouffle' }, msg: '🦡 La Coupe de Poufsouffle vous attend auprès du Pr Chourave.' },
      { threshold: 4500,  label: 'Maître Bronze',   bonus: { _baseLck: 1 }, msg: '🦡 Maîtrise tenace ! +1 LCK' },
      { threshold: 6000,  label: 'Maître Argent',   bonus: { _baseDef: 1 }, msg: '🦡 Bouclier vivant ! +1 DEF' },
      { threshold: 8000,  label: 'Maître Or',       bonus: { item: 'coiffe_blaireau', unlockSetQuest: true }, msg: "🦡 Maître d'or ! La Coiffe du Blaireau vous attend auprès du Pr Chourave — et un dernier serment t'attend." },
      { threshold: 10000, label: 'Virtuose Bronze', bonus: { _baseLck: 1 }, msg: '🦡 Virtuose patient ! +1 LCK' },
      { threshold: 13000, label: 'Virtuose Argent', bonus: { _baseDef: 1 }, msg: '🦡 Forteresse vivante ! +1 DEF' },
      { threshold: 16000, label: 'Virtuose Or',     bonus: {}, msg: '🦡 Virtuose d\'or — la dernière relique attend que tu termines la quête du Blaireau.' },
      { threshold: 25000, label: 'Légende',         bonus: { _baseDef: 2, _baseLck: 1, legendaryPassive: true, item: 'bouclier_helga' }, msg: '🦡 Légende de Poufsouffle ! +2 DEF +1 LCK · Maîtrise Légendaire éveillée — le Bouclier de Helga vous attend.' },
      { threshold: 30000, label: 'Mythe',           requiresDarkTier: 1, bonus: { _baseDef: 2, _baseLck: 1, grantsSpell: 'Récolte Magique', unlockMytheQuest: true }, msg: '🦡 Mythe vivant de Poufsouffle ! +2 DEF +1 LCK · la Récolte Magique t\'est révélée.' },
      { threshold: 45000, label: 'Apothéose',       requiresDarkTier: 2, bonus: { _baseDef: 3, _baseLck: 1, grantsSpell: 'Soin du Blaireau' }, msg: '🦡 Apothéose de Poufsouffle ! +3 DEF +1 LCK · Souffle du Blaireau — ton groupe régénère PV et PM à chaque pas et inflige +23 % de dégâts au-dessus de 60 % PV. · Soin du Blaireau (Premium) t\'est offert.' },
    ]
  },
};

// ============================================================
// REFUGES DE MAISON (Chapitre 13 §13.4.3 / §13.9.F P3) — habillage COSMÉTIQUE
// ============================================================
// Le Refuge (CELL.REFUGE) est désormais disponible pour LES QUATRE Maisons
// (cf. dungeon.js), avec une mécanique IDENTIQUE (repos partiel
// REFUGE_HEAL_FRAC = 0.5, 1×/visite, non-interrompu) — équité stricte préservée
// (§13.6 #5). Seuls le nom et le récit changent selon `chosenHouse` ; la teinte
// réutilise HOUSE_BONUSES[h].color/accent/emoji. Poufsouffle conserve le
// « Refuge du Blaireau » canonique (Helga) et son identité profonde (passif
// Souffle du Blaireau, item Cœur du Refuge), non touchés.
const REFUGE_THEMES = {
  Gryffondor:  { name: 'Foyer du Lion',     narrative: "Sous la bannière écarlate, le groupe ranime le feu et panse ses plaies. Le courage se repose pour mieux rugir." },
  Serpentard:  { name: 'Antre du Serpent',  narrative: "Dans l'alcôve d'émeraude, à l'abri des regards, le groupe reprend son souffle. La ruse sait quand se retirer pour mieux frapper." },
  Serdaigle:   { name: "Alcôve de l'Aigle", narrative: "Sous la voûte indigo, le groupe médite et restaure ses forces. L'esprit clair guérit le corps." },
  Poufsouffle: { name: 'Refuge du Blaireau', narrative: "Autour du foyer du Blaireau, le groupe panse ses plaies et reprend son souffle. On ne laisse personne derrière — ici, on tient bon, ensemble." },
};
// Thème cosmétique du refuge pour la Maison active (défaut Poufsouffle/Blaireau
// si chosenHouse absent/inconnu). Pur ; lit HOUSE_BONUSES au runtime.
function refugeTheme() {
  const h = (typeof chosenHouse !== 'undefined' && chosenHouse) ? chosenHouse : 'Poufsouffle';
  const t = (typeof REFUGE_THEMES !== 'undefined' && REFUGE_THEMES[h]) ? REFUGE_THEMES[h] : REFUGE_THEMES.Poufsouffle;
  const hb = (typeof HOUSE_BONUSES !== 'undefined' && HOUSE_BONUSES[h]) ? HOUSE_BONUSES[h] : null;
  return {
    name:      t.name,
    narrative: t.narrative,
    emoji:     hb ? hb.emoji  : '🦡',
    color:     hb ? hb.color  : '#372E29',
    accent:    hb ? hb.accent : '#F0C75E',
    house:     h,
  };
}

// ============================================================
// SYSTÈME DE SETS DE MAISON — 4 pièces par Maison
// ============================================================
// Composition : 1 pièce existante (brassard/anneau/plume/ceinture
// distribuée à Apprenti Or, tier 3) + 3 pièces NOUVELLES créées en
// Étape 2 (Confirmé Or tier 6, Maître Or tier 12, Virtuose Or tier 15
// via quête de Maison). Cf. .claude/plans/houses-2.0.md §B.
//
// Bonus de set appliqués par recalculateStats() à partir de l'Étape 4 :
// 2 pièces → bonus mineur, 3 pièces → bonus moyen, 4 pièces → bonus
// majeur. Les pieceIds restent vides jusqu'à l'Étape 2 (création des
// 3 items NEW par Maison).
const HOUSE_SETS = {
  Gryffondor: {
    setKey:    'gryff_set',
    setLabel:  'Set du Lion',
    pieceIds:  ['brassard_lion', 'heaume_vaillant', 'cape_godric', 'coeur_lion'],
    setBonus2: { bonusAtk: 1, bonusCritChance: 3, bonusCritDamage: 0.10 },
    setBonus3: { bonusAtk: 2, bonusCritChance: 7, bonusCritDamage: 0.15 },
    setBonus4: { bonusAtk: 4, bonusCritChance: 12, bonusCritDamage: 0.25, immuneDisarm: true },
  },
  Serpentard: {
    setKey:    'slyth_set',
    setLabel:  'Set du Serpent',
    pieceIds:  ['anneau_serpent', 'pendentif_mamba', 'cape_sibylline', 'couronne_basilic'],
    setBonus2: { bonusMag: 1, bonusLck: 1, bonusSpellCritChance: 5, bonusSpellCritDamage: 0.10 },
    setBonus3: { bonusMag: 2, bonusLck: 1, bonusSpellCritChance: 5, bonusSpellCritDamage: 0.15 },
    setBonus4: { bonusMag: 4, bonusLck: 2, bonusSpellCritChance: 10, bonusSpellCritDamage: 0.25, spellLifesteal: 0.10 },
  },
  Serdaigle: {
    setKey:    'raven_set',
    setLabel:  "Set de l'Aigle",
    pieceIds:  ['plume_aigle', 'manteau_encre', 'oeil_aigle', 'anneau_savoir'],
    setBonus2: { bonusMag: 1, bonusInt: 1, bonusSpellCritChance: 5, bonusSpellCritDamage: 0.10 },
    setBonus3: { bonusMag: 2, bonusInt: 1, bonusSpellCritChance: 5, bonusSpellCritDamage: 0.15 },
    setBonus4: { bonusMag: 4, bonusInt: 2, bonusSpellCritChance: 10, bonusSpellCritDamage: 0.25, spellCostReduction: 0.10 },
  },
  Poufsouffle: {
    setKey:    'pouf_set',
    setLabel:  'Set du Blaireau',
    pieceIds:  ['ceinture_blaireau', 'cape_loyaute', 'coiffe_blaireau', 'medaillon_helga'],
    setBonus2: { bonusDef: 1, bonusEnd: 1 },
    setBonus3: { bonusDef: 2, bonusEnd: 1 },
    setBonus4: { bonusDef: 4, bonusEnd: 2, regenHp: 2 },
  },
};

// ── État du combat ───────────────────────────────────────────
let inBattle        = false;
let enemyGroup      = [];   // tableau de {…enemyData, currentHp, statusEffects}
let currentBattleChar = 0;  // 0 = Harry, 1 = Hermione
let shieldTurns     = [0, 0]; // bouclier par personnage (Protego)
let guardTurns      = [0, 0]; // posture de Garde — mitigation 50 % sur le prochain coup ennemi
let guardRegenCooldown = [0, 0]; // regen PM de la Garde — disponible 1 tour sur 2 par personnage
let elanStacks      = [0, 0]; // Apothéose Gryffondor — cumul « Élan » par personnage (combat-scoped)
// D5 Célérité (volet AGI) — accumulateur de tempo par personnage (combat-scoped,
// reset startBattle). Monte de c.celerite/round ; chaque franchissement de 1.0
// donne une action sup. (celeriteExtra). Cf. .claude/plans/agi-derived.md §2.3.
let celeriteGauge   = [0, 0]; // jauge fractionnaire de tempo par personnage
let celeriteExtra   = [0, 0]; // actions supplémentaires en réserve ce round
// Familiers invoqués (sort Avis Praesidium — Sorts & Magie 2.0 Lot P2).
// Combat-scoped, NON sérialisé (comme celeriteGauge) : reset par startBattle,
// tické par tickFamiliars (battle.js). Chaque entrée { ownerName, atk, turns, icon }.
let combatFamiliars = [];
let battleTurn      = 0;
// P2 — Artefacts actifs (combat-system-synthesis §2.1) : charges restantes par
// personnage des artefacts à `activeEffect` déclenchables 1×/combat. Map
// idx→charges, combat-scoped (reset par startBattle), NON sérialisé (autoSave
// refusé en combat). Réutilise pendingAction pour le ciblage.
let artifactCharges = {};
// P2 — Positionnement Duo (combat-system-synthesis §1.1). `duoPosture` est
// PERSISTANT (sérialisé, set-and-forget) ; les deux autres sont combat-scoped.
//  - 'phalange' (défensif) : l'avant (party[0]) attire les coups (+20 % d'être
//    ciblé) ; l'arrière, plus fragile, est d'autant moins visé.
//  - 'tenaille' (offensif) : focus-fire — frapper une cible déjà touchée par
//    l'autre héros ce round accorde +15 % de dégâts.
// Solo : posture ignorée (partySize===1). Défaut 'phalange'.
let duoPosture        = 'phalange';
let duoPostureSwitched = false;  // bascule gratuite déjà utilisée ce combat ?
let duoComboMarks      = {};     // marque Tenaille : enemyIdx → heroIdx ayant frappé ce round
// P4 — Modificateurs d'environnement de combat (combat-system-synthesis §1.4).
// Calculés à startBattle depuis le thème d'étage (pur, computeEnvModifiers).
// Combat-scoped, NON sérialisés (comme celeriteGauge). V1 : zone D runique →
// +10 % feu/foudre + action 🌿 « Activer la rune » (étourdit, 1×/combat).
let envModifiers = null;   // { runic, spellElemBonus } ou null hors combat
let envRuneCharge = 0;     // charges de l'action rune restantes ce combat (0 ou 1)
// Palier 17 « Mythe » — état transient de combat (réinitialisé par startBattle).
// Non sérialisés : un combat ne peut pas être sauvegardé (inBattle bloque autoSave/writeSlot).
let legilimensCancelCharges = 0;     // capacités ennemies à annuler (sort Legilimens)
let legilimensCastsThisFight = 0;    // nb de lancers de Legilimens ce combat (coût PM croissant)
let recolteGoldBonus        = false; // or de fin de combat majoré +50 % (sort Récolte Magique)
// ── Sorts & Magie 2.0 — Lot P4 (corruption / temporels) ──────
// Garde-fous 1×/combat + état temporel/corruption combat-scoped, NON sérialisés
// (un combat ne peut être sauvegardé : inBattle bloque autoSave/writeSlot).
// Reset par startBattle. Cf. .claude/plans/spells-magic-system.md §2.2/§2.6.
let echoSpellUsedThisFight  = false; // Écho Fantôme — 1×/combat
let timeRewindUsedThisFight = false; // Tempus Echo + Reliquae Temporis (budget partagé)
let _lastCastSpellByChar    = [null, null]; // dernier sort offensif lancé (Tempus Echo)
let _timeSnapshot           = null;  // snapshot PV/PM de début de round (Reliquae Temporis)
let serpentPactDoubleNext   = false; // Pacte du Serpent — double le prochain sort offensif
let lionHeartActive         = false; // Cœur de Lion — buff de groupe actif ce combat
let _shieldReflect          = [0, 0];// Protego Diabolica — renvoi de coups physiques (par perso)
let badgerOathUsedThisFight = false; // Serment du Blaireau — 1×/combat
// Compteur de corruption du groupe (Lot P4 §2.6) — monte via le contrecoup
// `counter`, majore le power des sorts corrompus ET leur risque. SÉRIALISÉ
// (clé save `corruptionLevel`, comme floorKillCount). Monotone croissant ;
// levier de style endgame réversible. NB : nommé `spellCorruption` (et non
// `corruptionLevel`) pour ne PAS entrer en collision avec la FONCTION globale
// `corruptionLevel(floor, victoryAchieved)` de floor-ambiance.js (corruption
// de LIEU, distincte). La clé sérialisée reste `corruptionLevel` (spec §2.2).
let spellCorruption         = 0;
// Charges de protection « Élixir d'Immunité » (Potions 2.0 — Lot P7 §1.5).
// Chaque charge absorbe le prochain `sideEffect`/gain de corruption d'une
// potion risquée (consommée par les lots P10). Armée par l'effet `ward_charge`
// (inventory.js). SÉRIALISÉE (clé save `wardCharges`). Persistante (non
// combat-scoped) : la garde tient jusqu'à ce qu'elle serve.
let wardCharges             = 0;
// Huile d'arme active par personnage (Potions 2.0 — Lot P12 §1.5/§2.5).
// `weaponOil[idx] = { element, power, turns }` | null. Combat-scoped (reset
// startBattle, NON sérialisé — comme celeriteGauge). Lue par executeAttack.
let weaponOil               = [null, null];
// Écho Temporel (Potions 2.0 — Lot P12) — garde 1×/combat de l'action sup.
// Combat-scoped (reset startBattle, NON sérialisé).
let temporalEchoUsed        = false;
// Vision des Éclats (Potions 2.0 — Lot P12) — pas de fouille aiguisée restants.
// Décrémenté à chaque pas (movement.js — _step). SÉRIALISÉ (clé `visionSearchSteps`).
let visionSearchSteps       = 0;
// Écho Temporel hors combat — snapshot du dernier pas (position + PV/PM), pour
// l'annulation. Transitoire (NON sérialisé, reset par pas/étage/partie).
let _lastStepUndo           = null;
// Ateliers d'alchimie débloqués (Potions 2.0 — Lot P11 §1.9/§2.2).
//   0 = aucun · 1 = Chaudron de Slughorn · 2 = Chaudron des Ruines (endgame).
// Monotone croissant (max des ateliers ouverts). Pilote le bonus de jet de
// l'atelier supérieur (workshopLevel >= 2 → −1 difficulté effective de brassage,
// décision §3.5). Reset à 0 dans startGame ; SÉRIALISÉE (clé save `workshopLevel`).
let workshopLevel           = 0;
// Sélection de cible en combat (cycle producteur → consommateur) :
//  - battle-ui.js — showTargetSelection(actionType)  écrit pendingAction
//  - inventory.js — openBattleSpells onclick         écrit pendingSpell
//                                                    puis appelle showTargetSelection('spell_dmg')
//  - battle-ui.js — target button onclick            lit les 2, exécute, puis remet à null
//  - battle.js    — startBattle()                    reset à null en début de combat
// Contrat : tout code qui MET pendingAction/pendingSpell doit aussi
// déclencher la sélection de cible (showTargetSelection), sinon le state
// reste « pendant » jusqu'au prochain combat.
let pendingAction   = null;
let pendingSpell    = null;
// P6.c — index inventaire du flacon offensif en attente de cible ennemie.
// Posé par useItem (effect:'throw') avec pendingAction='throw_item', lu et
// remis à null par le callback de showTargetSelection.
let pendingThrowIdx = null;

// Monstres rencontrés en combat (bestiaire)
let seenMonsters = new Set();

// Échos temporels perçus (codex « Mémoire des Ruines », P-D5). Set d'IDs
// (cf. TEMPORAL_ECHOES dans floor-ambiance.js). Déverrouillé à l'affichage
// d'un écho en zone D / Boucle (movement.js). Sérialisé comme seenMonsters.
let seenEchoes = new Set();

// Kills cumulés par espèce de monstre — { monsterId: count }.
// Alimente le panneau d'info en combat (révélation progressive des
// caractéristiques / faiblesses / capacités selon le nombre de victoires).
let monsterKills = {};

// ── Codex (journal vivant, Chapitre 12) ──────────────────────
// `unlockedCodexEntries` : ids des entrées NON-créature déjà ouvertes/
// révélées (mémorise l'instant du déverrouillage pour la notification).
// Les entrées créature restent dérivées de seenMonsters/monsterKills
// (pas de double source de vérité). Sérialisé comme seenMonsters.
// `floorReached` : étage maximum atteint (≥ currentFloor), robinet `floor`
// du Codex. Robinet `echo` = `seenEchoes` (déjà existant) — pas de global
// dédié. Cf. .claude/plans/ch12-codex-impl.md.
let unlockedCodexEntries = new Set();
let floorReached         = 1;

// ── Anti-exploit ─────────────────────────────────────────────
// Cases fouillées : Map "x,y" → { at, count }.
//   at    = valeur de stepCount au moment de la fouille
//   count = nombre de fouilles cumulées sur la case
// Une case redevient fouillable après `searchRechargeSteps` pas.
// Réinitialisée par étage.
let searchedCells = new Map();
// Compteur global de pas de marche — pilote la recharge de fouille.
let stepCount = 0;
// Cache des étages déjà visités (pour éviter la régénération des coffres)
let floorDungeons = {};
// Cooldown de repos (nombre de déplacements avant nouveau repos)
let restCooldown = 0;
// Buff Félix Felicis (D5 — Fortune) : nombre de pas d'exploration restants
// pendant lesquels FELIX_POINTS s'ajoutent à la Fortune du groupe. Décrémenté
// dans movement.js — _step, sérialisé. 0 = aucun buff actif.
let felixFortuneSteps = 0;
// Fontaines utilisées sur l'étage courant (clé "x,y") — vidée à chaque
// entrée d'étage : la fontaine se ré-active si l'on quitte puis revient.
let usedFountains = new Set();
// Autels utilisés sur l'étage courant (clé "x,y") — même cycle que
// `usedFountains` : 1 usage par visite d'étage. Voir dungeon-enrichment §2.B.
let usedAltars = new Set();
// Refuges du Blaireau utilisés sur l'étage courant (clé "x,y") — même cycle
// que `usedFountains`. Voir .claude/plans/refuge-poufsouffle.md.
let usedRefuges = new Set();
// Événement de l'étage courant (id de FLOOR_EVENTS) ou null. Tiré à la
// génération, mis en cache par étage et persisté. Voir dungeon-enrichment §4.
let currentFloorEvent = null;
// Murs secrets non révélés de l'étage courant (clés "x,y"). Posés à la
// génération, révélés par searchRoom. Mis en cache + persistés comme
// `searchedCells`. Voir dungeon-enrichment §3.
let secretWalls = new Set();
// Puzzle runique de l'étage courant, ou null. Forme :
// { runes:["x,y"…], barrier:"x,y", order:[idx…]|null, hint:str|null,
//   hintCell:"x,y"|null, solved:bool }. `litRunes` = dalles déjà allumées
// (Set "x,y"). Posés à la génération, mis en cache + persistés comme
// `secretWalls`. Voir dungeon-enrichment-v2.md.
let runePuzzle = null;
let litRunes   = new Set();
// Stèle d'énigme de l'étage courant, ou null. Forme :
// { cell:"x,y", riddleId:str, barrier:"x,y", solved:bool }. Posée à la
// génération, mise en cache + persistée comme `runePuzzle`.
// Voir dungeon-enrichment-v2.md §3.
let runeStele = null;
// Easter egg « Salle sur Demande » (room-of-requirement-easter-egg.md).
// Couples déterministes par étage (seed) : mur « propice » (révélé ou non)
// et tuile de déclenchement (case marchable devant le mur). `requirementPaces`
// compte les passages distincts sur la tuile (porte au 3ᵉ). `requirementRevealed`
// = étages dont la porte est ouverte. `usedRequirementRooms` = refuge déjà
// utilisé pour la visite d'étage courante (clés "x,y", reset comme
// `usedFountains`). `requirementGiftTaken` = objet unique déjà pris (1×/partie).
// `requirementBuffSteps` = pas restants du buff de Confort. Tous sérialisés.
let requirementWalls     = new Map();
let requirementTrigger   = new Map();
let requirementPaces     = new Map();
let requirementRevealed  = new Set();
let usedRequirementRooms = new Set();
let requirementGiftTaken = false;
let requirementBuffSteps = 0;
// V2 (room-of-requirement-v2.md) — thème de la Salle décidé pour la visite
// courante de l'étage : 'refuge' | 'loot' | 'training'. Choix contextuel
// (PV/PM bas → refuge, sac vide → loot, sinon entraînement) mémorisé par
// étage pour rester stable tant que l'overlay est ouvert. Reset à l'entrée
// d'étage (comme `usedRequirementRooms`) → recalcul à la prochaine visite.
let requirementTheme     = new Map();
// V3/V3.1 (room-of-requirement-v3.md) — thèmes dont le trophée cosmétique a déjà
// été collecté DANS CETTE PARTIE (Set de clés de thème, anti-doublon, reset par
// partie). La collection à vie (inter-parties) vit dans le codex localStorage
// (save-slots.js).
let requirementTrophiesTaken = new Set();
// Cellules où le joueur a tué un ennemi, indexées par étage.
// Map<floor, Set<"x,y">>. À chaque retour sur un étage déjà visité, chaque
// entrée a 20 % de chance de re-spawner un ennemi (`_respawnEnemiesOnEntry`).
// Persisté au save.
let defeatedCellsByFloor = new Map();
// Compteur de kills cumulés par étage (Map<floor, kills>). Sert au scaling
// progressif de la difficulté (rollGroupSize) : chaque tranche de 4 kills
// incrémente le « niveau de visite » n. n ≥ 1 augmente la prob duo (+10%/n,
// cap +40 %), n ≥ 5 active la prob trio (+10%/(n-4), cap +40 %). Persisté.
let floorKillCount = new Map();

// ── Jardin d'herbes à récolte passive (Potions P6.b3) ────────
// Jardins cachés non encore révélés, clés "étage,x,y" (qualifiées par
// l'étage car le pool est inter-étages). Posés à la génération, retirés
// par Revelio / searchRoom. Persisté tel quel.
let hiddenGardens = new Set();
// Pool global d'herbes « poussées » mais non encore récoltées. Croît
// après l'éveil (1ʳᵉ découverte) : +1 tous GARDEN_STEP_INTERVAL pas et
// +GARDEN_DESCENT_BONUS par descente, plafonné à GARDEN_CAP. Récolté en
// marchant sur un jardin révélé → herbes du palier de l'étage courant.
let gardenStock = 0;
// Éveil : passe à true à la 1ʳᵉ révélation d'un jardin. Gate l'accumulation.
let gardenDiscovered = false;
const GARDEN_STEP_INTERVAL = 12; // pas par +1 herbe
const GARDEN_DESCENT_BONUS = 2;  // herbes par descente d'étage
const GARDEN_CAP           = 10; // plafond du pool

// ── Pages du grimoire d'Élara (quête manon_grimoire) ─────
// Reliques fixes invisibles, une par étage porteur (2,3,5,7,9).
// pagePlacements : Map<floor, "x,y"> — position posée à la 1re
// génération/visite de l'étage quand la quête est active.
// revealedPages  : Set<floor> — étages dont la page a été dévoilée
// par Revelio (point vert minimap). Les deux sont persistés.
// Cf. .claude/plans/manon-grimoire-pages.md §5.
let pagePlacements = new Map();
let revealedPages  = new Set();

// ── Boutique fixe : stock fini & réassort (anti-farming) ─────
// Stock courant de la boutique fixe (Mme Malkins). `null` = pas encore
// tiré → tirage paresseux à la première ouverture. Tableau d'entrées
// { item, price, sold } : `sold:true` = objet revendu par le joueur,
// rachetable au prix plein mais perdu au réassort.
let shopStock = null;
// Pas effectués depuis le dernier réassort. À 40, le stock est invalidé.
let shopStepsSinceRestock = 0;
// Livres de sorts déjà achetés (toute la partie) — ne réapparaissent
// jamais à l'achat, ni en boutique fixe ni chez les vendeurs. Persisté.
let purchasedSpellbooks = new Set();

// Compteur d'achats des items endgame à prix progressif (rareté sur
// le marché). Incrémenté à l'achat (pas à l'usage). Chaque achat
// applique `basePrice × 1.5^n` au prochain prix affiché. Persisté.
// Voir .claude/plans/game-economy-gold-audit.md §5.6 Piste A.
let endgamePurchases = {};

// Étages déjà visités par le joueur — alimentés par goDeeper/goUp et le
// démarrage de partie (1 = couloir d'entrée). Consommés par la modale de
// téléportation hors combat (Portus) pour proposer la liste des destinations.
// Persisté dans le save.
let visitedFloors = new Set([1]);

// Étages-scènes scénarisés (P5) — étages dont le beat narratif écrit a déjà été
// joué pour cette partie (one-shot). Alimenté par maybeScriptedFloorBeat
// (floor-ambiance.js). Persisté dans le save.
let seenScriptedBeat = new Set();

// Beat « Grande Salle » (Ch.14 §14.3.2) — one-shot joué au premier retour réel
// sur l'étage 1 APRÈS victoire (l'école respire à nouveau). Distinct de
// seenScriptedBeat (qui contient déjà l'étage 1 via seuil_familier pré-victoire).
// Persisté dans le save.
let grandeSalleBeatSeen = false;

// Cooldowns du sort Portus (cf. .claude/plans/teleportation-spell.md §"Itération 2").
//  - portusOocCooldown   : transitions d'étage (escaliers) restantes avant
//                          de pouvoir relancer Portus hors combat. Décrémenté
//                          par goDeeper/goUp.
//  - portusFightCooldown : combats gagnés restants avant de pouvoir relancer
//                          Portus en combat. Décrémenté par endBattle(won=true).
// Persistés dans le save. Reset à startGame.
let portusOocCooldown   = 0;
let portusFightCooldown = 0;

// Cooldown des sorts de soin hors combat (Episkey, Reparo et tout futur sort
// effect:"heal"). Décrémenté dans _step à chaque pas réussi. Partagé entre
// tous les sorts de soin (cf. .claude/plans/teleportation-spell.md §Itération 3).
// Persisté dans le save, reset à startGame.
let healSpellCooldown = 0;

// PNJ placés sur l'étage courant : Map "x,y" → npcId.
// Recalculé à chaque génération d'étage, mis en cache dans floorDungeons.
let npcPlacements = new Map();
// PNJ déjà rencontrés (au moins une fois) — pour distinguer 1ère rencontre vs
// visites suivantes dans les dialogues. Persisté au save.
let seenNpcs = new Set();
// PNJ dont l'action spéciale (ex : Fumseck heal+revive) a été utilisée sur
// l'étage courant — clé `npcId`. Vidé à chaque entrée d'étage (analogue
// `usedFountains`). Pas archivé dans `floorDungeons`.
let usedSpecialNpcs = new Set();

// ── Membres du groupe ────────────────────────────────────────
// `player`, `player2`, `party` sont déclarés `const` pour verrouiller
// l'invariant `party[0] === player` (cf. CLAUDE.md §"Règle d'or" save).
// Toute mutation doit passer par `Object.assign(player, …)` — c'est ce
// que fait `_applyState()` dans save.js. Une réassignation casserait
// les références partagées avec `party` et provoquerait des bugs
// silencieux. Voir .claude/plans/code-improvements.md §A2.
const player = {
  name: "Harry Potter", icon: "🧙", imgSrc: "img/harry.png", class: "Élève de Gryffondor",
  level: 1, xp: 0, xpNext: 50,
  hp: 35, hpMax: 35, sp: 22, spMax: 22,
  str: 9, int: 11, agi: 12, end: 10, lck: 15, mag: 10,
  atk: 5, def: 2,
  // Stats de base (s'incrémentent au level-up, indépendamment de l'équipement).
  // _baseStr/_baseInt/_baseAgi/_baseEnd sont lazy-initialisés au premier appel
  // de recalculateStats() pour préserver les gains des saves antérieures à l'extension.
  _baseAtk: 5, _baseDef: 2, _baseMag: 10, _baseLck: 15,
  gold: 25,
  inventory: [],
  // Besace d'herboriste (partagée) : { herbId: count }, non plafonnée.
  // Recettes de potion connues : tableau d'ids POTION_RECIPES.
  // Voir .claude/plans/farming-potion-system.md.
  herbs: {},
  knownRecipes: [],
  // Pages du grimoire d'Élara récoltées (quête manon_grimoire) :
  // tableau d'ids GRIMOIRE_PAGES, stocké comme une besace (partagé,
  // non plafonné). Voir .claude/plans/manon-grimoire-pages.md.
  grimoirePages: [],
  // 11 slots étendus — voir .claude/plans/equipment-extended.md §2.1
  equipped: {
    wand: null, head: null, body: null, hands: null, feet: null, cloak: null,
    amulet: null, ring1: null, ring2: null, belt: null, trinket: null
  },
  spells: ["Expelliarmus", "Stupefix", "Episkey", "Protego", "Incendio"],
  wand: "Baguette de Houx", armor: "Robe de Gryffondor", acc: ""
};

const player2 = {
  name: "Hermione Granger", icon: "🧙‍♀️", imgSrc: "img/hermione.png", class: "Élève de Gryffondor",
  level: 1, xp: 0, xpNext: 50,
  hp: 28, hpMax: 28, sp: 35, spMax: 35,
  str: 6, int: 17, agi: 10, end: 7, lck: 12, mag: 16,
  atk: 3, def: 2,
  // Stats de base Hermione (idem Harry : _baseStr/Int/Agi/End lazy-init)
  _baseAtk: 3, _baseDef: 2, _baseMag: 16, _baseLck: 12,
  gold: 0, // l'or est partagé via player.gold
  inventory: [], // inventaire partagé via player.inventory
  equipped: {
    wand: null, head: null, body: null, hands: null, feet: null, cloak: null,
    amulet: null, ring1: null, ring2: null, belt: null, trinket: null
  },
  spells: ["Episkey", "Protego", "Incendio", "Accio"],
  wand: "Baguette de Vigne", armor: "Robe de Gryffondor", acc: ""
};

// party[0] et player pointent vers le même objet
const party = [player, player2];

// ============================================================
// ENDGAME — Victoire vs Voldemort Ressuscité
// ============================================================
// `victoryAchieved` passe à true une seule fois quand
// `voldemort_revenu` tombe en combat (cf. js/endgame.js).
// `victoryAt` mémorise l'ISO-date du trigger. Les deux sont
// persistés via _serializeState / _applyState (save.js).
let victoryAchieved = false;
let victoryAt       = null;

// ── Label de fin dérivé (Chapitre 14 §14.6.2, P3) ──────────────────
// `endingType` est un LABEL non-gating décrivant COMMENT la partie s'est
// conclue : null | 'victory' | 'victory_pact' | 'cycle_broken'. Dérivé des
// flags existants par `computeEndingType()` (endgame.js, pur) ; posé à la
// victoire et réconcilié quand `cycleBroken` devient vrai. Source unique de
// l'entrée Codex `epilogue` (robinet `ending`). Persisté via save.js.
let endingType = null;

// ── New Game+ « vrai » (Chapitre 14 P5 cosmétique → challenge) ────
// `ngPlusRun`   : la partie courante est un run Nouvelle Partie+ (opt-in au
//                 démarrage, disponible si le profil a ≥ 1 victoire).
// `ngPlusLevel` : cran NG+ empilable (= nombre de victoires au profil, plafonné
//                 NGPLUS_CAP). Pilote le multiplicateur CHALLENGE appliqué aux
//                 monstres (stats + butin) dans scaleMonster — voir
//                 dungeon-scaling.js / .claude/plans/ngplus-real.md. 0 hors NG+.
// `ngPlusTitle` : titre honorifique affiché dans le HUD pendant la partie.
// ZÉRO HÉRITAGE conservé (équilibrage 13) : aucun or/objet/niveau hérité — seuls
// les ennemis et leurs gains sont renforcés. Sérialisés (save.js). Le profil
// persistant vit dans `js/profile.js` (localStorage, hors save de partie).
let ngPlusRun   = false;
let ngPlusLevel = 0;
let ngPlusTitle = '';

// ── Boucle Ténébreuse — Porteur d'Éclats (V1, Chapitre 11 §11.6.2) ──
// Compteur PERSISTANT d'« Éclats de réalité » glanés en Boucle (étages 11+),
// distinct des 3 `eclat_voute` canon de la trame. Fil de prestige narratif :
// +1 à chaque NOUVEL étage de Boucle le plus profond franchi (anti-farm ;
// movement-floors.js — _maybeAdvanceDarkLoop). Ne gate JAMAIS la descente.
// Le niveau de Boucle `loopNumber` (dungeon-scaling.js) reste DÉRIVÉ de
// floorReached — non persisté. Sérialisé via _serializeState / _applyState.
let accumulatedEclats = 0;
// Éclats consacrés au Sceau ce run (A4) — compteur SÉPARÉ : `accumulatedEclats`
// n'est JAMAIS décrémenté (préserve les seuils Briser-le-Cycle / Codex). Le
// disponible = accumulatedEclats − eclatsSpent. La consécration (Gardien de la
// Boucle) transfère le disponible vers le profil persistant (cosmétique).
let eclatsSpent = 0;

// ── Escape Game via pièges — Poches du Sceau (escape-game-traps.md, Lot 1) ──
// Étage caché temporaire déclenché par un piège (étages 11+, Boucle Ténébreuse).
// Tous sérialisés : un save pris DANS une poche doit pouvoir reprendre (la poche
// est l'état d'étage live, `_escapeSnapshot` garde l'étage source à restaurer).
let inEscapePocket       = false;  // dans une Poche du Sceau ?
let escapePocketType     = null;   // 'echo' (Lot 1) | 'riddle' | 'mirror' (Lot 3)
let escapePocketState    = null;   // { type, solved, progress, sourceFloor }
let _escapeSnapshot      = null;   // instantané de l'étage source (restauré à la sortie)
let escapePocketsCleared = 0;      // stat : poches re-scellées (profil/HoF — Lot 4)
let escapeFoundersCleared = new Set(); // Fondateurs dont une Poche a été re-scellée (Codex — Lot 4)
let corruptionMalusSteps = 0;      // pas de malus « corruption » après échec (Lot 3)
let escapeStepBudget     = 0;      // budget de pas (jauge de corruption — Lot 2)
let escapeStepSpent      = 0;      // pas consommés dans la poche courante (Lot 2)

// Paliers d'Éclats déjà célébrés (héritage visible — ch.11 P0). Anti-doublon
// pour les toasts/cosmétiques de palier (5/10/15) déclenchés dans
// _maybeAdvanceDarkLoop. Pilote aussi l'aura d'Éclats du HUD (eclatAuraTier).
// Sérialisé via _serializeState / _applyState (Array.from), réinit par startGame.
let eclatMilestones = new Set();

// Tuto contextuel du premier combat (LOT D2) — true une fois la bulle
// affichée. Réinitialisé par startGame, persisté via _serializeState /
// _applyState pour ne s'afficher qu'une fois par partie.
let combatTutorialSeen = false;

// Communication du pivot endgame (Chapitre 13 §13.5 Sim 3 / §13.9.E) — true
// une fois le toast « Ici, la puissance se gagne — elle ne tombe plus. » affiché
// à la 1ʳᵉ entrée en Boucle Ténébreuse. One-shot SÉRIALISÉ (une seule fois par
// partie) — distinct du toast d'ambiance _darknessToastShown (session-only).
// Réinitialisé par startGame, persisté via _serializeState / _applyState.
let endgamePivotSeen = false;

// Passif « Hiver Clair » (Manon Acte III) — true une fois l'Acte III remis
// à Manon (fuseAct3). Effet : hors combat, +1 PM par pas d'exploration
// (plafonné spMax). Réinitialisé par startGame, persisté via
// _serializeState / _applyState. Cf. .claude/plans/manon-grimoire-easter-egg.md §7.
let hiverClair = false;

// Maîtrises élémentaires — buffs PERMANENTS de partie octroyés par les
// « Livres de Maîtrise » (un par élément). `elementalMastery[element]` = bonus
// fractionnaire de dégâts (+0.12 par livre lu, un seul livre par élément).
// Lu en combat par `_elementalMasteryBonus` (inventory-core.js). Within-run :
// vit dans la save (jamais dans le profil cross-run — règle zéro-héritage).
// Réinitialisé par startGame, persisté via _serializeState / _applyState.
let elementalMastery = {};

// Easter egg « La Chasse Sans Tête » — true une fois la quête
// `chasse_sans_tete` remise à Sir Patrick (hook dans completeQuest).
// Récompense purement cosmétique : badge sur la fiche perso + ligne
// célébratoire débloquée chez Sir Nicolas. Aucun effet de combat.
// Réinitialisé par startGame, persisté via _serializeState / _applyState.
// Cf. .claude/plans/headless-hunt-easter-egg.md.
let headlessHuntMember = false;

// Easter egg « Les Reliques de la Mort » — true une fois que les trois
// Reliques canon (Baguette de Sureau `wand_elder` + Cape `cloak_invis` +
// Pierre `ring_resurrection`) sont équipées simultanément sur un MÊME héros.
// Récompense purement cosmétique : titre « Maître de la Mort », badge sur la
// fiche perso + révélation narrative jouée une seule fois. Aucun effet de
// combat. Réinitialisé par startGame, persisté via _serializeState /
// _applyState. Cf. .claude/plans/deathly-hallows-easter-egg.md.
let maitreDeLaMort = false;

// « Briser le Cycle » (V3, Chapitre 11 §11.10) — fin optionnelle NON-GATING de
// la Boucle Ténébreuse. `cycleBroken` passe à true au choix « Briser » (jalon IV),
// une fois les 3 jalons remplis (voir la scène du Scellement, porter
// BRISER_ECLAT_SEUIL Éclats, vaincre le boss-miroir « Le Reflet du Mythe »).
// SEUL état persistant ajouté : la progression des jalons est DÉRIVÉE
// (seenEchoes / accumulatedEclats / monsterKills) via briserCycleJalons().
// Cosmétique (badge fiche perso + Codex `cycle_brise`) ; la Boucle reste
// accessible après. Réinitialisé par startGame, persisté via _serializeState /
// _applyState. Cf. js/break-cycle.js + .claude/plans/chapter-11-dark-loop.md.
let cycleBroken = false;

// Quêtes Signature de Maison — flag posé à la remise de la signature
// (completeQuest). Un seul actif par partie (gate `chosenHouse` + étage).
// Levier one-shot lu avant le combat final (voldemort_revenu). Réinitialisé
// par startGame, persisté via _serializeState / _applyState.
// Cf. .claude/plans/house-signature-quests-impl.md.
let gryffSignatureDone = false;
let slythSignatureDone = false;
let ravenSignatureDone = false;
let poufSignatureDone  = false;
// Choix gris du Pacte des Cachots (Serpentard) : 'pact' | 'defiance' | null.
let slythPactChoice    = null;
// Buff de combat one-shot (combat-scoped, NON sérialisé) : pacte de Salazar
// honoré → lifesteal de sort de 15 % pour le groupe. Armé par le levier
// Voldemort, réinitialisé à chaque startBattle (comme recolteGoldBonus).
let slythPactBuff      = false;

// ============================================================
// QUÊTES SECONDAIRES
// ============================================================
// Catalogue des quêtes : voir QUEST_TEMPLATES dans quests.js.
// Runtime :
//   activeQuests        — quêtes acceptées (clones de templates) en cours.
//   availableQuests     — IDs de quêtes débloquées non encore acceptées.
//   completedQuests     — IDs de quêtes rendues (pour PNJ "déjà servi").
//   lastQuestCompletion — { [questId]: playerLevel } au moment de la remise.
//                         Lu par les quêtes répétables pour gérer le cooldown.
let activeQuests        = [];
let availableQuests     = new Set();
let completedQuests     = new Set();
let lastQuestCompletion = {};
