# Plan B — Don récurrent à la Maison (sink endgame illimité)

**Date** : 2026-05-25
**Branche** : `claude/house-tier-plan-launch-6KQ9B`
**Statut** : 🚧 En cours — design amendé 2026-05-25 (série Apothéose ★ N infinie).
**Origine** : Piste B du `.claude/plans/game-economy-gold-audit.md §5.6`,
hors-scope V1, validée en suite.

> Plan vivant (§5 guidelines). Décisions utilisateur 2026-05-25 :
> 1. Lancer ce plan (pas `houses-mythe-tier-v3.md`, déjà livré).
> 2. Bouton don dispo **dès tier 17** (recommandation §4.3).
> 3. Gate `requiresDarkTier: 2` (Option A §3.5).
> 4. Tiers 19+ = **Apothéose ★ N génératif infini** (au lieu de 6 paliers durs 19-24).
> 5. Bonus par étoile : +1 stat principale Maison · bonus complémentaire
>    aux stades multiples de 5 (cadence à valider §3.2).
> 6. Voix off : **1 sample générique par chef** pour toute la série étoile
>    (au lieu de 56 samples). Voir §3.4 réécrit.

---

## 0. Méthodologie

- Sources de vérité utilisées : `js/state.js` (`HOUSE_BONUSES`,
  `housePoints`, `houseTier`), `js/main.js` (`checkHouseLevelUp`),
  `js/quests.js` (`quest_don_*`, `_consumeQuestItems`),
  `js/npc-dialog.js` (action `claim_house_reward`).
- Pas de mesure runtime — analyse statique.
- Cible : joueur en boucle ténébreuse, tous paliers Apothéose validés.

---

## 1. Contexte

### 1.1 Paliers Maison actuels (`HOUSE_BONUSES` — `state.js:116-249`)

Chaque Maison a **18 paliers** (tiers 1-18), chacun débloquant un bonus
stat / item / sort. Thresholds en `housePoints` :

| Tier | Label                  | Threshold | Notes |
|------|------------------------|-----------|-------|
| 1    | Apprenti               | 100       | +1 stat de base |
| ... | ...                    | ...       | (cf. state.js) |
| 14   | Légendaire de Maison   | 12000     | Item legendary |
| 15   | Mythologique           | 18000     | +stat + grantsSpell |
| 16   | Symbole vivant         | 24000     | Set bonus 4/4 |
| 17   | **Mythe**              | **30000** | `requiresDarkTier: 1` (étage 11+) — sort exclusif + `unlockMytheQuest` |
| 18   | **Apothéose**          | **45000** | `requiresDarkTier: 2` (étage 21+) — passif capstone (`houseApotheosePassive`) |

Au-delà du tier 18 : **plus aucun palier**, donc `housePoints` continue
de monter via les kills mais ne débloque rien.

### 1.2 Quête de don actuelle (`quests.js:519-571`)

`unlockHouseMytheQuest(chosenHouse)` déclenche au franchissement du
palier 17 l'apparition de **1 quête** dans `availableQuests`, propre à
la Maison du joueur (`quest_don_gryff` / `_slyth` / `_raven` / `_pouf`).

Objectif unique : `{ type: "donate", amount: 3000, progress: 0 }`.
Coût consommé à la remise (`_consumeQuestItems` `quests.js:1300-1305`).
Récompense : 1200 XP + felix. **One-shot par Maison.**

### 1.3 Source d'or endgame typique

Avec les sinks combo A+E livrés (PR #249) + ajustements (PR #250) :
- Étage 11+ : ~150-200 G/combat (drops + bonus diff + Reliquaire)
- Items pallier acquis → plus rien à acheter en boutique fixe
- Combo A+E draine ~30-50k G mais s'épuise (les Élixirs deviennent
  prohibitifs, les uniques sont consommés)
- Forge + Bibliothèque (cf. Plan C) consomment l'or jusqu'à un cap

**Reste un cas typique** : joueur en boucle 4-5 avec tout maxé, qui
accumule 20-30k G **sans usage**.

---

## 2. Problème à résoudre

**Sink endgame illimité.** Tous les sinks actuels ont un cap :
- Boutique fixe (Portus 2800 G plafonné, items pallier acquis)
- Sinks A+E (Élixirs progressifs cappés par l'or atteignable)
- Forge (5 niveaux max par item × N items équipés ≈ 30k G cumulés)
- Bibliothèque (3 niveaux max par sort × N sorts ≈ 5-8k G cumulés)
- Autel / fontaine (ponctuels)
- Quête de don Mythe (one-shot 3000 G)

Au-delà de ~80-100k G dépensés, **plus rien à drainer**. Le joueur en
très long run (boucle 5+) thésaurise sans choix tactique.

---

## 3. Proposition — Don récurrent au Chef de Maison

### 3.1 Mécanique

Le Chef de Maison (`HOUSE_BONUSES[chosenHouse].headOfHouse` —
McGonagall / Rogue / Flitwick / Sprout) accepte des **dons d'or
illimités** post-tier-17. Chaque don convertit l'or en `housePoints`
selon un taux fixe.

**Taux proposé** : `1 housePoint = 5 G` (1000 G = 200 points).

Justification :
- Au tier 18 (Apothéose, 45000 housePoints), le joueur a typiquement
  cumulé ~150-300 combats endgame en boucle ténébreuse. 1 kill normal
  = 10 housePoints (Normal). Donc 4500 kills équivaut à ce 45000.
- À 1pt = 5G, **9000 G valent 1800 points** — environ 180 kills
  équivalents. Suffisant pour rendre le don attractif mais pas trivial.
- Plafond auto : 50k G ≈ 10000 points = 1 palier endgame complet.

### 3.2 Série « Apothéose ★ N » — paliers génératifs infinis

**Décision 2026-05-25** : au lieu de 6 tiers durs 19-24, le palier 18
(Apothéose) ouvre une série **génératrice infinie** `Apothéose ★ N`.
`houseTier` continue d'incrémenter (19 = ★ 1, 20 = ★ 2, …) ; aucun item
ni sort exclusif au-delà du tier 18 — la série apporte de petits bonus
cumulatifs uniquement.

**Mécanique** : pas d'entrée statique dans `HOUSE_BONUSES[h].tiers[]`
au-delà du tier 18. Un nouveau champ `starGenerator` est ajouté à chaque
Maison ; `checkHouseLevelUp()` boucle dynamiquement quand `houseTier
>= 18`. Cf. §3.5.

#### Formule de seuil (décision 2026-05-25)

**Croissance polynomiale douce : `threshold(★ N) = 45 000 + 15 000 × N + 1 000 × N²`.**

| ★ N   | Seuil cumulé | Don pur si zéro kill (1pt=5G) |
|-------|--------------|-------------------------------|
| ★ 1   | 61 000       | 80 000 G                      |
| ★ 2   | 79 000       | 170 000 G                     |
| ★ 5   | 145 000      | 500 000 G                     |
| ★ 10  | 295 000      | 1 250 000 G                   |
| ★ 20  | 745 000      | 3 500 000 G                   |
| ★ 50  | 3 295 000    | 16 250 000 G                  |

Justification : la composante polynomiale `+1 000 × N²` ajoute une
friction croissante sur les étoiles profondes, ce qui rend les premiers
paliers accessibles (★ 1 ≈ +16k pts depuis Apothéose, atteignable par
une session) et les paliers très profonds quasi-asymptotiques. Empêche
un farm de don industriel qui transformerait ★ 50 en routine.

#### Bonus par étoile (décision 2026-05-25)

Stats principales / secondaires / réserve par Maison :

| Maison | Principale | Secondaire (tous les 2 ★) | Réserve (tous les 10 ★) |
|--------|-----------|----------------------------|--------------------------|
| Gryffondor  | `_baseAtk` | `_baseStr` (force du Lion)   | `hpMax +5`               |
| Serpentard  | `_baseMag` | `_baseInt` (esprit affûté)   | `spMax +5`               |
| Serdaigle   | `_baseMag` | `_baseInt` (sagesse)         | `spMax +5`               |
| Poufsouffle | `_baseDef` | `_baseEnd` (endurance)       | `hpMax +5`               |

Cadence :

| Cadence | Bonus |
|---------|-------|
| Chaque ★ | **+1 stat principale Maison** |
| Tous les 2 ★ (★ 2, 4, 6, …) | **+1 stat secondaire Maison** |
| Tous les 5 ★ (★ 5, 10, 15, …) | **+1 LCK** |
| Tous les 10 ★ (★ 10, 20, …) | **+5 PV max** (Gryff/Pouf) ou **+5 PM max** (Slyth/Serd) |

Cumul à ★ 10 (depuis tier 18) : +10 stat principale · +5 stat secondaire
· +2 LCK · +5 PV/PM max. Power-creep mesuré, identité Maison renforcée.

Pas d'item ni de sort exclusif. Pas de cosmétique — reporté §6 hors-scope.

#### Coût total cumulé

- ★ 10 = 250 000 pts depuis Apothéose = 1,25 M G en don pur.
- ★ 20 = 700 000 pts = 3,5 M G.
- ★ 50 = 3,25 M pts = 16 M G — purement théorique.

Le sink illimité est tenu : aucun "fond" jamais atteint.

### 3.3 UI : dialogue Chef de Maison

Le `headOfHouse` actuel sert déjà à `claim_house_reward` (Phase 2
intermédiaire). Ajouter un nouveau bouton conditionnel :

```
[Chef de Maison] (modal)
  Greeting / questOffer / questActive / questReady ...
  ─ 🛡️ Récupérer la récompense (existant)
  ─ 💰 Faire un don (nouveau, conditionnel sur houseTier >= 17)
        └─ Sous-modale : input numérique + boutons rapides (1000G,
           5000G, 10000G, max) + aperçu pts gagnés + "Confirmer"
```

**Conditions d'apparition** :
- `houseTier >= 17` (palier Mythe atteint) — premier don dispo après
  Mythe, pas avant.
- Joueur a au moins 100 G (sinon bouton grisé).

**Plafond par interaction** : aucun. Le joueur peut donner tout son or
en une fois s'il veut. Risque : tap accidentel → confirmation explicite
au-delà de 5000 G (« Donner 12 500 G ? Cela fera passer ta Maison de
tier 19 à tier 20. Confirmer ? »).

### 3.4 Voix off des Directeurs (samples OGG) — version minimale

**Décision 2026-05-25** : au lieu des 56 samples initialement proposés
(intro / offer × 2 / small × 3 / large / tier 19-24 × 6 + refuse), la
série Apothéose ★ N étant génératrice infinie, on ne peut pas voicer
chaque étoile individuellement. On passe à **8 samples par chef** =
**32 OGG total**.

Tous les dialogues de Directeur sont déjà voicés via
`tools/gen_voice_edge.py` (Microsoft Edge TTS, gratuit).

#### 3.4.1 Convention de naming

`audio/voice/<chef>_donation_<contexte>.ogg`, déclenchée par
`AudioSystem.playVoice('<chef>_donation_<contexte>')`.

Mapping `<chef>` (existant dans `_VOICE_SAMPLES` + `gen_voice_edge.py`) :
| Maison | `<chef>` | Voix Edge TTS |
|--------|----------|---------------|
| Gryffondor  | `mcgonagall` | `de-DE-SeraphinaMultilingualNeural` (rate -7 %, pitch ±0) |
| Serpentard  | `rogue`      | `de-DE-FlorianMultilingualNeural` (rate -12 %, pitch -8 Hz) |
| Serdaigle   | `flitwick`   | `en-US-AndrewMultilingualNeural` (rate +10 %, pitch +24 Hz) |
| Poufsouffle | `sprout`     | `fr-FR-VivienneMultilingualNeural` (rate -3 %, pitch ±0) |

#### 3.4.2 Inventaire des samples par chef (8 × 4 chefs = 32 OGG)

| Contexte | Trigger | Quand |
|----------|---------|-------|
| `donation_intro`   | Apparition du bouton « 💰 Faire un don » la 1ʳᵉ fois | Premier ouvrir du dialogue post-tier-17 |
| `donation_offer`   | Ouverture de `#house-donation-modal` | À chaque ouverture |
| `donation_small`   | Don confirmé < 5 000 G | Après validation |
| `donation_large`   | Don confirmé ≥ 5 000 G | Solennel |
| `donation_refuse`  | Tentative avec < 100 G en poche | Bouton grisé déclenche message |
| `apotheose_star`   | **Franchissement d'une ★ Apothéose** (toutes étoiles) | `checkHouseLevelUp` détecte ★ N atteinte |
| `apotheose_star_first` | **Première étoile ★ 1 spécifiquement** | Plus solennelle, jouée une fois |
| `apotheose_star_milestone` | **Toutes les 10 étoiles** (★ 10, ★ 20, …) | Reconnaissance des paliers profonds |

**Total : 32 samples.** Production via `gen_voice_edge.py` ≈ 2 min de
batch + 5 min de QA d'écoute (le sample `apotheose_star` est joué le plus
souvent — vérifier qu'il reste agréable sur 10-20 répétitions).

#### 3.4.3 Textes proposés — McGonagall (Gryffondor)

Ton : autoritaire, fière, économe, n'aime pas la flatterie mais respecte
le devoir accompli.

- `mcgonagall_donation_intro`
  > « Vous êtes parvenu au cœur de notre Maison, Potter. Si la fortune
  > vous sourit, sachez que Gryffondor accueille les contributions de
  > ses fils et filles les plus fidèles. »
- `mcgonagall_donation_offer`
  > « Que comptez-vous offrir à Gryffondor aujourd'hui ? »
- `mcgonagall_donation_small`
  > « Merci. Chaque galion compte pour les générations à venir. »
- `mcgonagall_donation_large`
  > « Voilà une générosité digne du Lion. Gryffondor n'oublie pas ce
  > que vous faites pour elle aujourd'hui. »
- `mcgonagall_donation_refuse`
  > « Revenez quand vos poches seront plus garnies, Potter. Inutile
  > d'humilier votre Maison. »
- `mcgonagall_apotheose_star_first`
  > « Vous voilà au-delà de tout ce que je pensais voir. Première étoile
  > de l'Apothéose, Potter. Le Lion vous reconnaît parmi les siens. »
- `mcgonagall_apotheose_star`
  > « Une étoile de plus à votre constellation. Continuez, Potter. »
- `mcgonagall_apotheose_star_milestone`
  > « Dix étoiles. Vous franchissez un seuil que peu pourront même
  > apercevoir. Gryffondor s'incline. »

#### 3.4.4 Textes proposés — Rogue (Serpentard)

Ton : sarcastique, lent, intéressé par le pouvoir, méprisant du superflu
mais respectueux du calcul.

- `rogue_donation_intro`
  > « Tiens, Potter. Vous découvrez enfin que l'ambition se paie en or
  > aussi bien qu'en sang. Serpentard accepte vos offrandes. »
- `rogue_donation_offer`
  > « Combien êtes-vous prêt à laisser sur la table aujourd'hui ? »
- `rogue_donation_small`
  > « Soit. Un début. »
- `rogue_donation_large`
  > « Voilà qui ressemble enfin à une ambition. Serpentard saura quoi
  > en faire — soyez assuré que vous ne reverrez pas un galion. »
- `rogue_donation_refuse`
  > « Mendier serait plus digne que ceci. Revenez avec quelque chose
  > à offrir, ou ne revenez pas. »
- `rogue_apotheose_star_first`
  > « Une étoile au revers du Serpent. Vous m'étonnez, Potter. Une fois. »
- `rogue_apotheose_star`
  > « Une étoile de plus. Le venin se distille. Continuez. »
- `rogue_apotheose_star_milestone`
  > « Dix étoiles. Je consens à reconnaître la patience qu'il vous a
  > fallu. Serpentard vous garde. »

#### 3.4.5 Textes proposés — Flitwick (Serdaigle)

Ton : enthousiaste, pédagogue, vif, friand de précision et de chiffres.

- `flitwick_donation_intro`
  > « Oh, mais quelle agréable surprise ! Vous avez atteint le palier
  > qui ouvre nos coffres aux contributions. Serdaigle vous remercie
  > par avance. »
- `flitwick_donation_offer`
  > « Eh bien, eh bien ! Combien souhaitez-vous nous offrir ? »
- `flitwick_donation_small`
  > « Magnifique ! Vous voyez, tout s'additionne. »
- `flitwick_donation_large`
  > « Stupéfiant ! Une telle générosité mérite tous nos honneurs.
  > Serdaigle gravera votre nom dans le marbre. »
- `flitwick_donation_refuse`
  > « Hum, vos poches semblent un peu légères aujourd'hui. Revenez
  > quand le compte y sera, voulez-vous ? »
- `flitwick_apotheose_star_first`
  > « Première étoile ! Le calcul devient passionnant. Vous entrez dans
  > la constellation Serdaigle. »
- `flitwick_apotheose_star`
  > « Une étoile de plus dans votre ciel ! Excellent, excellent. »
- `flitwick_apotheose_star_milestone`
  > « Dix étoiles ! Mathématiquement remarquable. Je consigne ce résultat
  > dans nos archives sur-le-champ. »

#### 3.4.6 Textes proposés — Chourave (Poufsouffle)

Ton : chaleureuse, terrienne, maternelle, voit la valeur des petites
choses.

- `sprout_donation_intro`
  > « Oh, mon cher enfant, comme c'est gentil de penser à nous !
  > Poufsouffle accueille volontiers tout ce que tu voudras partager. »
- `sprout_donation_offer`
  > « Alors, dis-moi, combien souhaites-tu donner à notre Maison ? »
- `sprout_donation_small`
  > « Merci, c'est très généreux. Cela ira aux serres, sois-en sûr. »
- `sprout_donation_large`
  > « Mon Dieu, quelle générosité ! Tu nourriras nos plantes et nos
  > élèves pour des saisons entières. Poufsouffle te bénit. »
- `sprout_donation_refuse`
  > « Allons, allons, ne te mets pas dans l'embarras. Reviens quand
  > tu auras quelques galions de plus. »
- `sprout_apotheose_star_first`
  > « Une première étoile, mon enfant. Comme une fleur qui s'ouvre.
  > Poufsouffle est si fière de toi. »
- `sprout_apotheose_star`
  > « Encore une étoile. Tu fais notre joie. »
- `sprout_apotheose_star_milestone`
  > « Dix étoiles ! Les racines de Poudlard portent ton nom, mon enfant. »

#### 3.4.7 Production des samples (`tools/gen_voice_edge.py`)

Procédure batch :

1. Ajouter les 8 entrées par chef dans le dict `LINES` du tool —
   tuples `("<chef>_<contexte>", "<texte>")`.
2. Lancer :
   ```bash
   python3 tools/gen_voice_edge.py mcgonagall rogue flitwick sprout
   ```
3. QA : écouter `apotheose_star` (joué le plus souvent) + tous les
   `apotheose_star_first/milestone` (4×2 = 8 narrativement critiques).
4. Mettre à jour `_VOICE_SAMPLES` dans `js/audio-music.js`.
5. Précaches PWA : **rien à toucher** (stale-while-revalidate sur audio/).

#### 3.4.8 Trigger côté code (helpers)

Helper unifié à exposer dans `js/house-donation.js` :

```js
function _playDonationVoice(context) {
  const chef = HOUSE_BONUSES[chosenHouse]?.headOfHouseVoiceKey;
  if (!chef) return;
  if (typeof AudioSystem === 'undefined') return;
  if (typeof AudioSystem.playVoice === 'function') {
    AudioSystem.playVoice(`${chef}_${context}`);
  }
}
```

`headOfHouseVoiceKey` à ajouter dans `HOUSE_BONUSES` (state.js) :
`gryff: 'mcgonagall'` / `slyth: 'rogue'` / `raven: 'flitwick'` /
`pouf: 'sprout'`.

Sélection contexte étoile dans `checkHouseLevelUp` :
- ★ 1 → `apotheose_star_first`
- ★ N divisible par 10 (★ 10, 20, 30…) → `apotheose_star_milestone`
- sinon → `apotheose_star`

### 3.5 Effet de levée des étoiles ★ N (génératrice)

**Décision 2026-05-25** : Option A retenue. Gate `requiresDarkTier: 2`
sur la série entière (boucle ténébreuse 2, étages 21+).

Comme la série est génératrice infinie, on n'étend pas `HOUSE_BONUSES[h].tiers[]`
avec 6 entrées hard-codées (option initiale écartée). À la place, on
**ajoute un champ `starGenerator`** à chaque entrée Maison de
`HOUSE_BONUSES`, consommé par `checkHouseLevelUp()` après le franchissement
du tier 18.

```js
// HOUSE_BONUSES.Gryffondor (idem schéma pour les 3 autres) :
starGenerator: {
  requiresDarkTier: 2,           // gate boucle ténébreuse 2 (étages 21+)
  primaryStat:      '_baseAtk',  // ATK / MAG / MAG / DEF selon Maison
  secondaryStat:    '_baseStr',  // STR / INT / INT / END selon Maison
  reserveStat:      'hpMax',     // hpMax / spMax / spMax / hpMax selon Maison
  primaryLabel:     'ATK',       // 'ATK' / 'MAG' / 'MAG' / 'DEF'
  secondaryLabel:   'STR',       // 'STR' / 'INT' / 'INT' / 'END'
  reserveLabel:     'PV max',    // 'PV max' / 'PM max' / 'PM max' / 'PV max'
  thresholdAt: (n) => 45000 + 15000 * n + 1000 * n * n,
  bonusAt:     (n) => {
    const b = { _baseAtk: 1 };
    if (n % 2  === 0) b._baseStr = 1;
    if (n % 5  === 0) b._baseLck = 1;
    if (n % 10 === 0) b.hpMax    = 5;
    return b;
  },
  labelAt: (n) => `Apothéose ★ ${n}`,
  msgAt:   (n, b) => {
    const parts = [];
    if (b._baseAtk) parts.push(`+${b._baseAtk} ATK`);
    if (b._baseStr) parts.push(`+${b._baseStr} STR`);
    if (b._baseLck) parts.push(`+${b._baseLck} LCK`);
    if (b.hpMax)    parts.push(`+${b.hpMax} PV max`);
    return `🦁 Apothéose ★ ${n} ! ${parts.join(' · ')}`;
  },
},
```

L'application du bonus dans `checkHouseLevelUp` traite toutes les clés
de `bonus` de façon générique : les stats `_base*` sont additionnées
sur chaque membre du groupe, et `hpMax` / `spMax` augmentent à la fois
le max et la valeur courante de PV/PM (cf. patch §3.5 ci-dessous).

**Modification de `checkHouseLevelUp()` (main.js)** :

```js
// … (boucle existante sur tiers[] inchangée)

// Série Apothéose ★ N génératrice (post-tier 18)
if (houseTier >= 18 && bonuses.starGenerator) {
  const gen = bonuses.starGenerator;
  const ti = (typeof endgameTierIndex === 'function')
    ? endgameTierIndex(currentFloor) : 0;
  if (ti < gen.requiresDarkTier) return;  // gate boucle ténébreuse 2

  let starN = houseTier - 18;  // étoile actuelle (0 = pas encore atteint)
  while (true) {
    const nextN = starN + 1;
    const threshold = gen.thresholdAt(nextN);
    if (housePoints < threshold) break;

    const bonus = gen.bonusAt(nextN);
    houseTier = 18 + nextN;
    addMsg(gen.msgAt(nextN, bonus), 'magic');
    AudioSystem.playLevelUp();

    party.forEach(c => {
      Object.keys(bonus).forEach(k => {
        if (typeof c[k] !== 'number') return;
        c[k] += bonus[k];
        // hpMax / spMax : on ajoute aussi à la valeur courante (régen
        // implicite à chaque étoile, sans dépasser le nouveau max).
        if (k === 'hpMax') c.hp = Math.min(c.hpMax, c.hp + bonus[k]);
        if (k === 'spMax') c.sp = Math.min(c.spMax, c.sp + bonus[k]);
      });
    });

    // Voix off du chef
    const voiceCtx = (nextN === 1) ? 'apotheose_star_first'
                   : (nextN % 10 === 0) ? 'apotheose_star_milestone'
                   : 'apotheose_star';
    safeCall('_playDonationVoice', voiceCtx);

    starN = nextN;
  }
  recalculateStats();
  updateUI();
}
```

Persistance : `houseTier` continue d'incrémenter au-delà de 18. Aucune
nouvelle variable. Saves antérieures : `houseTier > 18` n'existait pas
jusqu'ici, donc tout save est rétro-compatible. **Migration nulle.**

---

## 4. Risques & vigilances

### 4.1 Power-creep Ironman

Les paliers 19+ donnent des stats. Un run Ironman très long → score
gonflé via dons accumulés. Mitigations :
- Bonus stats des tiers 19-24 sont **modérés** (+1 par tier vs +2-3
  pour Apothéose). Power-creep mesuré.
- Aucun nouveau sort ni item au-delà du tier 18 → pas de game-changer.
- Le score Ironman cape déjà les kills (×12 par étage max), donc
  l'avantage stat se traduit en marge sur les combats, pas en farming
  industriel.

### 4.2 Banking / abuse au moment de la mort

Joueur Ironman qui va mourir → dump 50k G juste avant ? Le score
Ironman inclut l'or (`computeIronmanScore` × 0.5). Mitigation :
- Don retire l'or instantanément (déjà géré par `_consumeQuestItems`
  ailleurs) — l'or dépensé ne compte plus dans le score Ironman.
- Le tier supplémentaire (donc les stats permanentes) booste le score
  par d'autres mécanismes (kills facilités) mais le delta net est
  bénéfique au joueur attentif sans être game-breaking.

### 4.3 UX confusion vs quête de don Mythe

La quête `quest_don_<maison>` (one-shot 3000 G) existe et reste
inchangée. Le **don récurrent** est un mécanisme distinct :
- Avant tier 17 : aucun don possible.
- Tier 17 atteint : quête Mythe apparaît (`unlockMytheQuest`).
  Récompense d'achèvement (1200 XP + felix) reste 1-shot.
- Tier 17 + quête Mythe achevée : **bouton don récurrent débloqué**
  (ou actif en parallèle dès tier 17, à préciser).

Recommandation : **bouton dispo dès tier 17 atteint**, indépendamment
de l'état de la quête Mythe. Les deux co-existent. UX : si la quête
Mythe est encore active, le bouton "Faire un don" l'informe en
priorité (« la quête courante coûte 3000 G — préfères-tu accomplir
celle-ci d'abord ? Bouton continue / Bouton fermer »).

### 4.4 Sauvegarde

Aucun nouveau state requis. `housePoints` et `houseTier` existent déjà.
La sérialisation `_serializeState` n'a pas à changer. **Migration
transparente** des saves antérieures (tier 19+ = étoiles, simplement
débloqués quand les points cumulent et que la boucle ténébreuse 2 est
active).

### 4.5 Tracker `_donationIntroPlayed`

Le sample `donation_intro` ne doit jouer **qu'une fois** par save.
Stockage : nouveau champ booléen `donationIntroPlayed` sur le save
(sérialisé dans `_serializeState`, restauré dans `_applyState`).
Migration des saves antérieures : `donationIntroPlayed: false` par
défaut. Coût : 1 bit, intrusion minimale.

---

## 5. Phasage proposé

> **Critère de succès par étape (§4 guidelines)** : à chaque étape,
> `node tests/smoke.js` reste vert, et le scénario maison passe à vert
> à l'étape 6.

### Étape 1 — `starGenerator` data + checkHouseLevelUp génératif
- [ ] Ajouter le champ `starGenerator` aux 4 entrées `HOUSE_BONUSES`
      (Gryff/Slyth/Serd/Pouf) dans `js/state.js`. Stat principale par
      Maison (ATK/MAG/MAG/DEF). +1 LCK tous les 5 ★.
- [ ] Ajouter `headOfHouseVoiceKey` aux 4 entrées (`mcgonagall`/`rogue`/
      `flitwick`/`sprout`) — utile aussi pour les samples de don.
- [ ] Étendre `checkHouseLevelUp()` (`js/main.js`) : boucle while après
      le forEach tiers[] pour franchir N étoiles en cascade (cf. §3.5).
- [ ] **Vérification** : `node tests/smoke.js` vert. Aucun nouveau test
      pour l'instant (couvert à l'étape 6).

### Étape 2 — Helper `donateGoldToHouse` + état
- [ ] Nouveau fichier `js/house-donation.js` avec `donateGoldToHouse(amount)`,
      `openHouseDonationModal()`, helpers `_playDonationVoice(context)`,
      `_previewDonation(amount)`.
- [ ] Ajout dans `index.html` (ordre : après `npc-dialog.js`, avant `intro.js`).
- [ ] Ajout au MANIFEST `js/loader.js` (`donateGoldToHouse` en fn critique).
- [ ] Ajout `donationIntroPlayed` (let global) à `js/state.js`,
      sérialisé dans `js/save.js` (`_serializeState`/`_applyState`).
- [ ] **Vérification** : `node tests/smoke.js` vert. Pas de cassure du
      loader (manifest complet).

### Étape 3 — Voix off (32 samples OGG)
- [ ] Ajouter les 32 entrées dans `tools/gen_voice_edge.py` (8 × 4 chefs).
- [ ] Batch : `python3 tools/gen_voice_edge.py mcgonagall rogue flitwick sprout`.
- [ ] QA d'écoute : `apotheose_star` (×4) + `apotheose_star_first` (×4)
      + `apotheose_star_milestone` (×4) — 12 samples narrativement critiques.
- [ ] Référencer les 32 OGG dans `_VOICE_SAMPLES` (`js/audio-music.js`).
- [ ] **Vérification** : taille audio/ raisonnable (< 1 Mo nouveau).
      `node tests/pwa-smoke.js` reste vert (le précache audio est SWR).

### Étape 4 — UI modale `#house-donation-modal`
- [ ] HTML statique dans `index.html` (avant `#shop-modal` pour proximité
      logique). Structure : titre + input numérique + 4 boutons rapides
      (1000 / 5000 / 10000 / Max) + zone aperçu (points gagnés, étoile
      suivante, seuil) + boutons "Confirmer" / "Annuler".
- [ ] CSS dans `css/style.css` (réutiliser styles modale existante).
- [ ] Confirmation explicite au-delà de 5000 G via `confirm()` natif.
- [ ] **Vérification** : modale s'ouvre/se ferme proprement, input
      contraint à >= 1 et <= `player.gold`.

### Étape 5 — Intégration dialogue Chef de Maison
- [ ] `js/npc-dialog.js — _npcDialogActions` : ajouter bouton
      « 💰 Faire un don » conditionnel sur `houseTier >= 17` ET PNJ est
      un `headOfHouse`. Action `open_house_donation` → appelle
      `openHouseDonationModal()`.
- [ ] Brancher samples voix off :
  - `donation_intro` : à la **première** ouverture (tracker `donationIntroPlayed`).
  - `donation_offer` : à toute ouverture ultérieure.
  - `donation_small` : après validation `< 5000 G`.
  - `donation_large` : après validation `≥ 5000 G`.
  - `donation_refuse` : si le bouton "Confirmer" est cliqué avec `< 1 G`
    déposable.
  - `apotheose_star_*` : déclenchés par `checkHouseLevelUp` (étape 1).

### Étape 6 — Smoke test
- [ ] Ajouter `scenarioHouseDonationAndStars` à `tests/smoke.js` :
  - T1 : tier 17 atteint, bouton "Faire un don" visible.
  - T2 : tier 16 (Légende) → pas de bouton don.
  - T3 : `donateGoldToHouse(1000)` retire 1000 G + ajoute 200 points.
  - T4 : `donateGoldToHouse(player.gold + 1)` plafonne au max disponible.
  - T5 : franchir tier 18 → `houseTier === 18`.
  - T6 : franchir ★ 1 (don massif jusqu'à 60000 pts) avec étage 22 →
    `houseTier === 19`, +1 stat principale appliquée.
  - T7 : franchir ★ 5 → +1 stat principale + +1 LCK (bonus complémentaire).
  - T8 : mock `AudioSystem.playVoice` pour vérifier la séquence
    d'appels (intro→offer→star_first→star→star_milestone).
  - T9 : gate boucle ténébreuse 2 — étage 12 (boucle 1) bloque les
    étoiles malgré housePoints > 60000.
- [ ] **Vérification** : `node tests/smoke.js` vert avec le nouveau scénario.

### Étape 7 — CLAUDE.md mise à jour
- [ ] Mettre à jour la section « Système des Maisons » : ajouter une
      sous-section « Tier 19+ — Série Apothéose ★ N » avec la formule
      seuil et la cadence du bonus complémentaire.
- [ ] Mettre à jour la section « Loader & helpers » : ajout de
      `donateGoldToHouse`, `openHouseDonationModal` au MANIFEST.

### Étape 8 — Commit + push
- [ ] Plusieurs commits structurés (data / donation / voix / UI /
      intégration / smoke / docs).
- [ ] `git push -u origin claude/house-tier-plan-launch-6KQ9B`.
- [ ] Pas de PR sans demande explicite utilisateur.

---

## 6. Hors-scope (à plan séparé si validé plus tard)

- **Don multi-Maison** (verser à une Maison non-choisie pour leaderboard
  global). Trop complexe vs valeur — pas demandé.
- **Récompenses cosmétiques visibles autres que le portrait** (titres
  affichés au-dessus du nom du perso, etc.). Polish ultérieur.
- **Achievements liés au don** (« Mécène : 100 000 G donnés ») —
  cumulables dans une PR achievements séparée si voulu.

---

## 7. Journal du plan

- **2026-05-25** : création du plan en suite de l'audit or
  (`game-economy-gold-audit.md` §5.6 Piste B). Validation utilisateur
  attendue avant implémentation.
- **2026-05-25** : ajout §3.4 (Voix off des Directeurs) — 56 samples
  OGG à générer via `tools/gen_voice_edge.py`, textes par chef
  respectant le ton canon (McGonagall autoritaire, Rogue sarcastique,
  Flitwick enthousiaste, Chourave maternelle). Phasage repensé en 6
  étapes (production voix avant impl UI).
- **2026-05-25 — amendement majeur (branche `claude/house-tier-plan-launch-6KQ9B`)** :
  décisions utilisateur appliquées —
  - Plan lancé en implémentation.
  - Tiers 19-24 hard-codés → **série Apothéose ★ N génératrice infinie**
    (helper `starGenerator`, `houseTier` continue d'incrémenter).
  - Seuil polynomial doux : `45 000 + 15 000 × N + 1 000 × N²`
    (★ 1 = 61k, ★ 10 = 295k, ★ 50 = 3,3M). Friction croissante anti-farm.
  - Bonus 4 cadences : chaque ★ = +1 stat principale ; tous les 2 ★ =
    +1 stat secondaire (STR/INT/INT/END selon Maison) ; tous les 5 ★ =
    +1 LCK ; tous les 10 ★ = +5 PV max (Gryff/Pouf) ou +5 PM max
    (Slyth/Serd). Pas d'item ni de sort.
  - Voix off : **8 samples par chef = 32 OGG** (au lieu de 56) —
    `donation_intro/offer/small/large/refuse` (5 don) +
    `apotheose_star_first/apotheose_star/apotheose_star_milestone` (3 étoile).
  - Bouton don dispo dès tier 17 (recommandation §4.3 retenue).
  - Gate `requiresDarkTier: 2` (Option A §3.5 retenue).
  - Phasage repensé en **8 étapes** avec critères de vérification par étape.
- **2026-05-25 — implémentation livrée** (branche `claude/house-tier-plan-launch-6KQ9B`) :
  ✅ Étapes 1-7 terminées en une seule passe.
  - `js/state.js` : ajout `donationIntroPlayed`, `starGenerator` +
    `headOfHouseVoiceKey` sur les 4 entrées `HOUSE_BONUSES` + helpers
    purs `_starGeneratorBonus` / `_starGeneratorMsg`.
  - `js/main.js` : extension `checkHouseLevelUp` avec boucle génératrice
    ★ N (cascade, gate `requiresDarkTier:2`). Reset `donationIntroPlayed`
    dans `chooseHouse`.
  - `js/house-donation.js` (NEW) : `donateGoldToHouse`,
    `openHouseDonationModal`, `closeHouseDonationModal`,
    `confirmHouseDonation`, `setHouseDonationAmount`, `_playDonationVoice`,
    `_previewDonationPoints`, `_renderHouseDonationModal`.
  - `js/save.js` : sérialisation `donationIntroPlayed`.
  - `js/ui.js` : `_updateCrestWrap` + `_tierShortLabel` gèrent
    `houseTier > tiers.length` (label « ★ N »).
  - `js/npc-dialog.js` : bouton « 💰 Faire un don » dans le dialogue du
    Chef de Maison quand `houseTier >= 17`.
  - `js/audio-music.js` : 32 entrées dans `_VOICE_SAMPLES`.
  - `js/loader.js` : 4 nouveaux globals critiques dans le MANIFEST
    (`donateGoldToHouse`, `openHouseDonationModal`, `closeHouseDonationModal`,
    `confirmHouseDonation`).
  - `index.html` : modale `#house-donation-modal` + `<script>` +
    cache-bust `npc-dialog.js?v=8` / `audio-music.js?v=3`.
  - `tools/gen_voice_edge.py` : 32 textes ajoutés (8 × 4 chefs).
  - `audio/voice/*.ogg` : 32 OGG générés via Edge TTS + ffmpeg.
  - `CLAUDE.md` : section « Tier 19+ — Série Apothéose ★ N » + section
    « Don à la Maison ».
  - `tests/smoke.js` : nouveau scénario `scenarioHouseDonationAndStars`
    (9 assertions) ; `node tests/smoke.js` reste vert (166 globals au
    loader, +4).
