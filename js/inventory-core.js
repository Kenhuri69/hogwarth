// ============================================================
// INVENTAIRE — Cœur : ajout d'objets, matériaux, stats dérivées
// ============================================================
// tryAddItem, _countMaterial/_consumeMaterial, recalculateStats (stats
// effectives = base + équipement + sets + passifs). Chargé AVANT
// inventory.js. recalculateStats() est appelé depuis ~13 modules.
// ============================================================
// Capacité maximale du sac (constante centralisée).
const INVENTORY_MAX = 16;

// ── Stacking des objets empilables ──────────────────────────
// Les objets identiques se regroupent dans une seule case portant un
// compteur `qty`. Une entrée sans `qty` vaut 1 (rétrocompat saves).
// S'empilent : consommables, matériaux (Forge/Biblio/chaudron) et objets
// de quête (Éclat de Lumière…). Équipement et livres de sort restent
// 1/case (état propre par pièce : upgrade, set, sort enseigné). La
// signature inclut l'état de brassage : une potion brassée (potency
// propre) ne fusionne qu'avec une potion brassée identique.
const STACKABLE_TYPES = ['consumable', 'material', 'quest'];
function _itemQty(e) { return (e && e.qty) ? e.qty : 1; }
function _isStackable(item) { return !!item && STACKABLE_TYPES.includes(item.type); }
function _stackKey(item) {
  const pot = (item.brewPotency != null) ? item.brewPotency : '';
  return item.id + '|' + pot + '|' + (item.brewed ? 1 : 0);
}

// Ajoute `item` au sac partagé avec fusion si un stack compatible existe.
// Retourne true si ajouté (fusion ou nouvelle case), false si sac plein
// (aucun stack compatible et 16 cases occupées). Copie défensive à l'ajout.
function _addItemToBag(item) {
  if (_isStackable(item)) {
    const key = _stackKey(item);
    const slot = player.inventory.find(e => e && _isStackable(e) && _stackKey(e) === key);
    if (slot) { slot.qty = _itemQty(slot) + _itemQty(item); return true; }
  }
  if (player.inventory.length >= INVENTORY_MAX) return false;
  const entry = { ...item };
  if (_isStackable(entry)) entry.qty = _itemQty(item);
  player.inventory.push(entry);
  return true;
}

// True si `item` peut être ajouté : fusion possible (stack compatible
// présent) OU une case libre. Permet d'empiler un consommable déjà
// possédé même quand les 16 cases sont occupées.
function _canAddItem(item) {
  if (_isStackable(item)) {
    const key = _stackKey(item);
    if (player.inventory.some(e => e && _isStackable(e) && _stackKey(e) === key)) return true;
  }
  return player.inventory.length < INVENTORY_MAX;
}

// Consomme `n` exemplaires (défaut 1) du stack à l'index `idx` : décrémente
// `qty`, splice la case si épuisée. Retourne le nombre réellement retiré.
function _consumeAt(idx, n = 1) {
  const e = player.inventory[idx];
  if (!e) return 0;
  const q = _itemQty(e);
  if (q > n) { e.qty = q - n; return n; }
  player.inventory.splice(idx, 1);
  return q;
}

// Somme des quantités possédées pour un `id` (toutes cases confondues).
function _countItems(id) {
  if (typeof player === 'undefined' || !player.inventory) return 0;
  return player.inventory.reduce((s, e) => (e && e.id === id) ? s + _itemQty(e) : s, 0);
}

// Retire jusqu'à `n` exemplaires d'un `id`, répartis sur les stacks
// (itération arrière pour un splice sûr). Retourne le nombre retiré.
function _consumeItems(id, n) {
  let removed = 0;
  for (let i = player.inventory.length - 1; i >= 0 && removed < n; i--) {
    const e = player.inventory[i];
    if (!e || e.id !== id) continue;
    const q = _itemQty(e);
    const take = Math.min(q, n - removed);
    if (q > take) e.qty = q - take;
    else player.inventory.splice(i, 1);
    removed += take;
  }
  return removed;
}

// Migration : fusionne les doublons de consommables d'une save legacy
// (exemplaires séparés → un stack `qty`). Idempotent. Préserve l'ordre
// (première occurrence conservée, suivantes absorbées).
function _consolidateInventoryStacks() {
  if (typeof player === 'undefined' || !Array.isArray(player.inventory)) return;
  const seen = new Map(); // stackKey → entrée conservée
  const out = [];
  for (const e of player.inventory) {
    if (!e) continue;
    if (_isStackable(e)) {
      const key = _stackKey(e);
      const kept = seen.get(key);
      if (kept) { kept.qty = _itemQty(kept) + _itemQty(e); continue; }
      e.qty = _itemQty(e);
      seen.set(key, e);
    }
    out.push(e);
  }
  player.inventory = out;
}

// Helper centralisé pour ajouter un item au sac partagé. Accepte un
// item complet ou un id ; gère le cap, copie defensive et message UX.
// Retourne true si l'item a été ajouté, false sinon (sac plein ou id
// inconnu).
function tryAddItem(itemOrId, opts = {}) {
  const item = (typeof itemOrId === 'string')
    ? (typeof ITEMS !== 'undefined' && ITEMS.find(i => i.id === itemOrId))
    : itemOrId;
  if (!item) return false;
  // Les herbes ne vont pas dans le sac 16 slots : elles sont routées vers
  // la besace d'herboriste (player.herbs), non plafonnée.
  if (item.type === 'herb' && typeof addHerb === 'function') {
    addHerb(item.id, 1);
    if (!opts.silent && typeof addMsg === 'function') {
      addMsg(`${item.name} ajoutée à ta besace.`, 'good');
    }
    return true;
  }
  // opts.props : champs additionnels fusionnés dans la copie poussée
  // (ex. `brewed:true` pour une potion issue du chaudron — cf. potions.js).
  // _addItemToBag empile les consommables compatibles (sans consommer de
  // case) et respecte le cap pour les nouvelles cases.
  const merged = { ...item, ...(opts.props || null) };
  if (!_addItemToBag(merged)) {
    if (!opts.silent && typeof addMsg === 'function') {
      addMsg(`Sac plein, ${item.name || 'objet'} non récupéré.`, 'bad');
    }
    return false;
  }
  return true;
}

// Compte les exemplaires d'un matériau (par id) dans le sac partagé.
// Délègue à _countItems (qty-aware : les matériaux empilés somment leur
// `qty`).
function _countMaterial(itemId) {
  return _countItems(itemId);
}

// Retire jusqu'à `n` exemplaires d'un matériau du sac partagé.
// Délègue à _consumeItems (qty-aware : décrémente les stacks).
// Retourne le nombre effectivement retiré.
function _consumeMaterial(itemId, n) {
  return _consumeItems(itemId, n);
}

// ── Calcul des stats réelles (base + équipement) ────────────
// Doit être appelé après chaque équipement et après chaque level-up.
// Itère dynamiquement sur tous les slots de c.equipped pour supporter
// les 11 slots étendus (head, hands, feet, cloak, amulet, ring1, ring2,
// belt, trinket) ainsi que d'éventuels slots legacy (armor, acc) issus
// d'anciennes saves non migrées.
//
// hpMax/spMax sont recalculés ici : `_baseHpMax`/`_baseSpMax` (croissent au
// level-up et à l'allocation END) + Σ bonusHpMax/SpMax de l'équipement.
function recalculateStats() {
  party.forEach(c => {
    // Lazy init des bases secondaires (str/int/agi/end) pour les saves
    // antérieures à l'extension : capture la valeur courante comme base.
    if (c._baseStr === undefined) c._baseStr = c.str;
    if (c._baseInt === undefined) c._baseInt = c.int;
    if (c._baseAgi === undefined) c._baseAgi = c.agi;
    if (c._baseEnd === undefined) c._baseEnd = c.end;
    // Lazy init des PV/PM max de base (Vague B — bonusHpMax/SpMax). Capture
    // la valeur courante : aucun item legacy ne porte ces bonus, donc
    // hpMax/spMax == base au moment de la migration d'une save antérieure.
    if (c._baseHpMax === undefined) c._baseHpMax = c.hpMax;
    if (c._baseSpMax === undefined) c._baseSpMax = c.spMax;

    // Repartir des stats de base (croissent au level-up via _base*)
    c.atk = c._baseAtk;
    c.def = c._baseDef;
    c.mag = c._baseMag;
    c.lck = c._baseLck;
    c.str = c._baseStr;
    c.int = c._baseInt;
    c.agi = c._baseAgi;
    c.end = c._baseEnd;

    // C3a — voie Forge 'crit' : accumulée ici, versée dans critBonus plus bas.
    let forgeCritBonus = 0;
    if (c.equipped) {
      // Itérer sur tous les slots présents (extensible sans toucher au code).
      // Bonus Forge : `upgradeLevel` ajoute +N au bonus principal de l'item
      // (la stat avec la valeur la plus haute parmi atk/def/mag/lck).
      for (const slot of Object.keys(c.equipped)) {
        const item = c.equipped[slot];
        if (!item) continue;
        if (item.bonusAtk) c.atk += item.bonusAtk;
        if (item.bonusDef) c.def += item.bonusDef;
        if (item.bonusMag) c.mag += item.bonusMag;
        if (item.bonusLck) c.lck += item.bonusLck;
        if (item.bonusStr) c.str += item.bonusStr;
        if (item.bonusInt) c.int += item.bonusInt;
        if (item.bonusAgi) c.agi += item.bonusAgi;
        if (item.bonusEnd) c.end += item.bonusEnd;
        // Forge des Ténèbres : +upgradeLevel selon la voie choisie.
        const lvl = item.upgradeLevel | 0;
        if (lvl > 0) {
          if (item.forgePath === 'crit') {
            // Voie Critique : +N % de crit physique par niveau.
            const per = (typeof FORGE_CRIT_PER_LEVEL === 'number') ? FORGE_CRIT_PER_LEVEL : 2;
            forgeCritBonus += lvl * per;
          } else {
            // Voie Puissance (défaut/legacy) : +N sur la stat principale
            // (plus élevée parmi atk/def/mag/lck).
            const bonuses = [
              ['atk', item.bonusAtk | 0],
              ['def', item.bonusDef | 0],
              ['mag', item.bonusMag | 0],
              ['lck', item.bonusLck | 0],
            ];
            bonuses.sort((a, b) => b[1] - a[1]);
            if (bonuses[0][1] > 0) c[bonuses[0][0]] += lvl;
          }
        }
      }
    }

    // P0/P2 — buffs temporaires de stat (potions de buff) : réappliqués ici
    // (source unique de vérité) pour survivre à un recalc déclenché en combat
    // (consommation, équipement…). La base a déjà été remise (c.<stat> =
    // c._base<Stat> plus haut) ; le retrait définitif se fait à l'expiry du
    // statut (tickStatuses), avant tout recalc. Les stats dérivées (dodge/crit)
    // calculées plus bas tiennent donc compte des buffs AGI/LCK actifs.
    if (Array.isArray(c.statusEffects) && typeof BUFF_STAT_BY_ID !== 'undefined') {
      for (const s of c.statusEffects) {
        const stat = BUFF_STAT_BY_ID[s.id];
        if (stat) c[stat] += s.power || 0;
      }
    }

    // Stats dérivées — deux canaux de crit (physique + sort) :
    //   critChance / spellCritChance  : LCK plafonne à 40 %, les bonus
    //     d'équipement/set s'ajoutent par-dessus (peuvent dépasser 40 %).
    //   critMultiplier / spellCritMultiplier : 1.5 + bonusCritDamage cumulés.
    let critBonus = forgeCritBonus, dodgeBonus = 0;
    let critDmgBonus = 0, spellCritBonus = 0, spellCritDmgBonus = 0;
    let hpMaxBonus = 0, spMaxBonus = 0;
    let counterBonus = 0;
    if (c.equipped) {
      for (const item of Object.values(c.equipped)) {
        if (!item) continue;
        if (item.bonusCritChance)      critBonus         += item.bonusCritChance;
        if (item.bonusDodgeChance)     dodgeBonus        += item.bonusDodgeChance;
        if (item.bonusCritDamage)      critDmgBonus      += item.bonusCritDamage;
        if (item.bonusSpellCritChance) spellCritBonus    += item.bonusSpellCritChance;
        if (item.bonusSpellCritDamage) spellCritDmgBonus += item.bonusSpellCritDamage;
        if (item.bonusHpMax)           hpMaxBonus        += item.bonusHpMax;
        if (item.bonusSpMax)           spMaxBonus        += item.bonusSpMax;
        if (item.bonusCounterChance)   counterBonus      += item.bonusCounterChance;
      }
    }

    // Set bonus Ténèbres (endgame Tranche 2 — cf. ENDGAME_PLAN.md §7.8).
    // 2 items équipés → +10 crit, +5 dodge ; 3 items → +15 crit, +10 dodge.
    // Le bonus regenHp 3/3 est appliqué dans applyEquipmentRegen (battle.js).
    c._tenebresSetCount = 0;
    if (typeof TENEBRES_SET !== 'undefined' && c.equipped) {
      const equippedIds = new Set();
      for (const item of Object.values(c.equipped)) {
        if (item && item.id) equippedIds.add(item.id);
      }
      c._tenebresSetCount = TENEBRES_SET.filter(id => equippedIds.has(id)).length;
      if (c._tenebresSetCount >= 2) {
        critBonus += 10; dodgeBonus += 5;
        critDmgBonus += 0.15; spellCritDmgBonus += 0.15;
      }
      if (c._tenebresSetCount >= 3) {
        critBonus += 5; dodgeBonus += 5;
        critDmgBonus += 0.15; spellCritDmgBonus += 0.15;
      }
    }

    // Sets Maison 2.0 — 4 pièces par Maison (cf. .claude/plans/houses-2.0.md
    // §B). Bonus 2/3/4 pièces additifs : applique setBonus2 puis setBonus3
    // puis setBonus4 selon le compte équipé. Stocke le compte sur
    // c._<setKey>Count pour les tests et l'UI.
    if (typeof HOUSE_SETS !== 'undefined' && c.equipped) {
      const equippedIds = new Set();
      for (const item of Object.values(c.equipped)) {
        if (item && item.id) equippedIds.add(item.id);
      }
      for (const houseName of Object.keys(HOUSE_SETS)) {
        const set = HOUSE_SETS[houseName];
        const count = set.pieceIds.filter(id => equippedIds.has(id)).length;
        c['_' + set.setKey + 'Count'] = count;
        const bonuses = [];
        if (count >= 2 && set.setBonus2) bonuses.push(set.setBonus2);
        if (count >= 3 && set.setBonus3) bonuses.push(set.setBonus3);
        if (count >= 4 && set.setBonus4) bonuses.push(set.setBonus4);
        for (const b of bonuses) {
          if (b.bonusAtk) c.atk += b.bonusAtk;
          if (b.bonusDef) c.def += b.bonusDef;
          if (b.bonusMag) c.mag += b.bonusMag;
          if (b.bonusLck) c.lck += b.bonusLck;
          if (b.bonusStr) c.str += b.bonusStr;
          if (b.bonusInt) c.int += b.bonusInt;
          if (b.bonusAgi) c.agi += b.bonusAgi;
          if (b.bonusEnd) c.end += b.bonusEnd;
          if (b.bonusCritChance)      critBonus         += b.bonusCritChance;
          if (b.bonusDodgeChance)     dodgeBonus        += b.bonusDodgeChance;
          if (b.bonusCritDamage)      critDmgBonus      += b.bonusCritDamage;
          if (b.bonusSpellCritChance) spellCritBonus    += b.bonusSpellCritChance;
          if (b.bonusSpellCritDamage) spellCritDmgBonus += b.bonusSpellCritDamage;
          if (b.bonusCounterChance)   counterBonus      += b.bonusCounterChance;
        }
      }
    }

    // Mondes parallèles Phase H §6.10 — Set Voyageur (4 paliers).
    // 5 pièces taggées family:'voyageur'. Bonus 2/3/4/5 pièces cumulatifs
    // (additifs avec les bonus individuels). Le set 5/5 déverrouille la
    // preview du donjon distant — geré côté portal-matchmaking.
    if (c.equipped) {
      let voyageurCount = 0;
      for (const item of Object.values(c.equipped)) {
        if (item && item.family === 'voyageur') voyageurCount++;
      }
      c._voyageurSetCount = voyageurCount;
      if (voyageurCount >= 2) c.lck += 1;
      if (voyageurCount >= 3) spellCritBonus += 5;
      if (voyageurCount >= 4) {
        // regenSp:+2 — additionné en applyEquipmentRegen via une marker
        // stat exposée pour battle.js. On la pose sur c pour usage runtime
        // (cumul avec items qui portent regenSp).
        c._voyageurRegenSpBonus = 2;
      }
      // 5/5 : pas de stat dérivée — l'effet est cosmétique (preview UI).
    }

    // V1c.1 §6.10 — Souvenirs passifs cross-plan. Bonus stat additifs
    // des souvenirs débloqués (cf. OUTREMONDE_SOUVENIRS dans data.js).
    // Appliqué à TOUT le groupe (effet d'âme, pas d'équipement).
    if (typeof _souvenirsBonuses === 'function') {
      const sb = _souvenirsBonuses();
      c.atk += sb.bonusAtk; c.def += sb.bonusDef;
      c.mag += sb.bonusMag; c.lck += sb.bonusLck;
      c.str += sb.bonusStr; c.int += sb.bonusInt;
      c.agi += sb.bonusAgi; c.end += sb.bonusEnd;
    }

    // Rework D1/D2 — conversions stat secondaire → primaire. Appliquées
    // APRÈS base + équipement + sets (sur les stats effectives finales) :
    //   D1 INT→MAG 4:1  · D2 END→DEF 6:1.
    // Le crit physique (calculé ci-dessous) reste piloté par LCK ; la DEF/MAG
    // gagnée n'affecte que mitigation/dégâts de sort. Miroir exact de
    // tools/sim-difficulty.js (recalcEffectiveStats). Cf.
    // .claude/plans/player-stats-balance.md §2 (D1/D2).
    {
      const intDiv = (typeof INT_MAG_DIV === 'number') ? INT_MAG_DIV : 4;
      const endDiv = (typeof END_DEF_DIV === 'number') ? END_DEF_DIV : 6;
      c.mag += Math.floor((c.int || 0) / intDiv);
      c.def += Math.floor((c.end || 0) / endDiv);
    }

    // D5 — Fortune (volet LCK) : stat dérivée pilotant les événements
    // aléatoires hors-crit (drops, or, fouille/coffres, fuite/pièges). Courbe
    // de Hill saturante sur x = LCK + Σ item.bonusFortune. Le buff Félix
    // (felixFortuneSteps) entre dans x au niveau de partyFortune() — transient,
    // décrémenté par pas d'exploration, pas ici. `_fortuneX` (x sans Félix)
    // est mémorisé pour que partyFortune() ré-applique la courbe avec Félix.
    // Cf. .claude/plans/luck-fortune.md §2.1.
    {
      let fortuneBonus = 0;
      if (c.equipped) {
        for (const item of Object.values(c.equipped)) {
          if (item && item.bonusFortune) fortuneBonus += item.bonusFortune;
        }
      }
      c._fortuneX = Math.max(0, (c.lck || 0) + fortuneBonus);
      c.fortune   = _fortuneCurve(c._fortuneX);
    }

    // D5 — Célérité (volet AGI) : stat dérivée = TAUX continu d'actions
    // supplémentaires par round (gain de tour fluide, accumulé en combat par
    // battle.js). Courbe de Hill saturante sur x = AGI + Σ item.bonusCelerite,
    // qui continue de croître au-delà du plafond d'esquive/crit-sort (AGI 75).
    // Cf. .claude/plans/agi-derived.md §2.2. La jauge (celeriteGauge) est
    // combat-scoped (reset startBattle), pas ici.
    {
      let celeriteBonus = 0;
      if (c.equipped) {
        for (const item of Object.values(c.equipped)) {
          if (item && item.bonusCelerite) celeriteBonus += item.bonusCelerite;
        }
      }
      c._celeriteX = Math.max(0, (c.agi || 0) + celeriteBonus);
      c.celerite   = _celeriteCurve(c._celeriteX);
    }

    // Deux canaux de crit. Crit physique : base LCK (plafonne à 40 %).
    // Crit de sort : base AGI (plafonne à 35 %) — rôle offensif de l'AGI.
    // Les bonus équipement/set s'ajoutent PAR-DESSUS (plafond absolu 100 %).
    const lckCrit = Math.min(40, 5 + c.lck * 0.5);
    const agiCrit = Math.min(35, 5 + c.agi * 0.4);
    c.critChance          = Math.max(5, Math.min(100, lckCrit + critBonus));
    c.spellCritChance     = Math.max(5, Math.min(100, agiCrit + spellCritBonus));
    c.dodgeChance         = Math.max(0, Math.min(35, 5 + c.agi * 0.4 + dodgeBonus));
    // Multiplicateurs de crit : 1.5 + Σ bonusCritDamage, capés à 2.5 pour
    // éviter les one-shots de boss (cf. equipment-bonuses-v2.md Vague C).
    c.critMultiplier      = Math.min(2.5, 1.5 + critDmgBonus);
    c.spellCritMultiplier = Math.min(2.5, 1.5 + spellCritDmgBonus);

    // Apothéose Gryffondor (palier 18 — Cœur du Lion) : +10 % de crit
    // physique ET de sort, +15 % de dégâts critiques (physique + sort).
    // Appliqué PAR-DESSUS les plafonds LCK/AGI (40/35) — le taux peut
    // donc dépasser 40 % (plafond absolu 100 %), le multiplicateur 2.5.
    // Le cumul « Élan » est un effet de combat à part (battle.js).
    if (typeof houseApotheosePassive === 'function' && houseApotheosePassive() === 'Gryffondor') {
      c.critChance          = Math.min(100, c.critChance + 10);
      c.spellCritChance     = Math.min(100, c.spellCritChance + 10);
      c.critMultiplier      = Math.min(2.5, c.critMultiplier + 0.15);
      c.spellCritMultiplier = Math.min(2.5, c.spellCritMultiplier + 0.15);
    }

    // END → PV max : chaque point d'END GAGNÉ au-delà de la base (équipement,
    // sets, souvenirs, buffs) donne END_HP_PER PV, aligné sur l'allocation END
    // (+5 PV). L'END de base est déjà incluse dans _baseHpMax (stats de départ),
    // et l'allocation END incrémente _baseEnd ET _baseHpMax directement — donc
    // dériver de (c.end − c._baseEnd) ne double-compte jamais.
    {
      const endHpPer = (typeof END_HP_PER === 'number') ? END_HP_PER : 5;
      hpMaxBonus += endHpPer * Math.max(0, (c.end || 0) - (c._baseEnd || 0));
    }

    // PV/PM max = base (croît au level-up / allocation END) + bonus
    // d'équipement. Le bonus n'affecte PAS hp/sp courants ; au
    // déséquipement, on clamp hp/sp si le max a baissé.
    c.hpMax = c._baseHpMax + hpMaxBonus;
    c.spMax = c._baseSpMax + spMaxBonus;
    if (c.hp > c.hpMax) c.hp = c.hpMax;
    if (c.sp > c.spMax) c.sp = c.spMax;
    // Garde counter-attack : contribution d'équipement à la riposte. La
    // base de 30 % et le plafond de 40 % sont appliqués dans _tryGuardCounter.
    c.counterChance       = counterBonus;
  });
}

// ── Fortune (D5, volet LCK) ──────────────────────────────────
// Courbe de Hill saturante : fortune = ASYMPTOTE × x² / (x² + HALF²).
// Pure (aucune mutation). x = LCK + Σ bonusFortune (+ buff Félix au niveau
// du groupe). La saturation fait que les bonus fixes (Félix +40) réduisent
// la valeur marginale de chaque point de LCK. Cf. luck-fortune.md §2.1.
function _fortuneCurve(x) {
  const a = (typeof FORTUNE_ASYMPTOTE === 'number') ? FORTUNE_ASYMPTOTE : 0.31;
  const h = (typeof FORTUNE_HALF === 'number') ? FORTUNE_HALF : 30;
  const xx = Math.max(0, x || 0);
  return a * (xx * xx) / (xx * xx + h * h);
}

// ── Célérité (D5, volet AGI) ─────────────────────────────────
// Courbe de Hill saturante : celerite = MAX × x² / (x² + HALF²). Pure (aucune
// mutation). x = AGI + Σ bonusCelerite. Renvoie le TAUX d'actions sup. par
// round (fraction [0, MAX)). Le gain de tour est lissé par un accumulateur de
// tempo en combat (battle.js — celeriteGauge), jamais par palier. Cf.
// .claude/plans/agi-derived.md §2.2.
function _celeriteCurve(x) {
  const m = (typeof CELERITE_MAX === 'number') ? CELERITE_MAX : 0.30;
  const h = (typeof CELERITE_HALF === 'number') ? CELERITE_HALF : 45;
  const xx = Math.max(0, x || 0);
  return m * (xx * xx) / (xx * xx + h * h);
}

// Fortune effective du groupe — le membre le plus chanceux fait bénéficier
// tout le groupe (modèle inventaire/or partagés). Le buff Félix
// (felixFortuneSteps > 0) ajoute FELIX_POINTS à x AVANT la courbe, pour
// profiter de la saturation (cf. luck-fortune.md §2.3). Les membres KO
// (hp ≤ 0) sont exclus. Retourne une fraction [0, ~0.31] (+ Félix).
function partyFortune() {
  if (typeof party === 'undefined' || !Array.isArray(party)) return 0;
  const felixActive = (typeof felixFortuneSteps !== 'undefined' && felixFortuneSteps > 0);
  const felixPts = felixActive ? ((typeof FELIX_POINTS === 'number') ? FELIX_POINTS : 40) : 0;
  const n = (typeof partySize === 'number') ? partySize : party.length;
  let best = 0;
  for (const c of party.slice(0, n)) {
    if (!c || c.hp <= 0) continue;
    const baseX = (c._fortuneX != null) ? c._fortuneX : (c.lck || 0);
    const f = _fortuneCurve(baseX + felixPts);
    if (f > best) best = f;
  }
  return best;
}
