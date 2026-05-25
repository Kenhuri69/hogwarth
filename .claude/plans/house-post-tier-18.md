# Plan B — Don récurrent à la Maison (sink endgame illimité)

**Date** : 2026-05-25
**Branche** : `claude/plans-b-c-endgame-sinks`
**Statut** : ⏳ Plan de design — **aucune modification de code à ce stade**.
**Origine** : Piste B du `.claude/plans/game-economy-gold-audit.md §5.6`,
hors-scope V1, validée en suite.

> ⚠️ Plan vivant (§5 guidelines). Implémentation conditionnée à une
> validation explicite. Tant que pas validé : aucune modification de
> `js/state.js`, `js/quests.js`, `js/npc-dialog.js`, etc.

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

### 3.2 Nouveaux paliers 19+ (capstone séries)

Au-delà d'Apothéose, ajouter une série de paliers cosmétiques /
mini-bonus, accessibles uniquement via don récurrent (les kills à eux
seuls peuvent les atteindre, mais beaucoup plus lentement).

| Tier | Label              | Threshold | Bonus proposé |
|------|--------------------|-----------|---------------|
| 19   | Légende vivante    | 60 000    | +1 stat de base (Maison) + cosmétique : couronne dorée sur portrait |
| 20   | Témoin de l'âge    | 80 000    | +1 stat + halo doré permanent sur portrait |
| 21   | Cœur de Poudlard   | 110 000   | +1 stat + 5 % réduction du coût des sorts |
| 22   | Au-delà des Maisons| 150 000   | +1 stat + +5 % esquive |
| 23   | Aspect mythique    | 200 000   | +1 stat + +10 % regen PV/PM hors combat |
| 24   | Au-delà des dieux  | 300 000   | +2 stats + titre « Aspect mythique »|

**Tous accessibles via combinaison kills + dons.** Le don accélère mais
ne court-circuite pas — c'est un cumul classique.

**Coût total cumulé pour atteindre tier 24** : depuis 45 000 points
(Apothéose) → 300 000 points = 255 000 housePoints supplémentaires.
À 1pt = 5G, **1 275 000 G en don pur** (si zéro kills entre 18 et 24).
Plus réaliste : 100-200k G en don + kills passifs.

Ordre de grandeur : un run très long (50 heures+) peut atteindre tier 22.
Tier 24 est explicitement utopique — c'est un objectif méta.

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

### 3.4 Voix off des Directeurs (samples OGG)

Tous les dialogues de Directeur sont déjà voicés via `tools/gen_voice_edge.py`
(Microsoft Edge TTS, gratuit). Le don récurrent doit livrer **son propre lot
de samples** pour ne pas casser l'immersion (un nouveau bouton silencieux
trancherait avec les greeting/offer/ready/done existants).

#### 3.4.1 Convention de naming

`audio/voice/<chef>_donation_<contexte>_<n>.ogg`, déclenchée par
`AudioSystem.playVoice('<chef>_donation_<contexte>_<n>')`.

Mapping `<chef>` (existant dans `_VOICE_SAMPLES` + `gen_voice_edge.py`) :
| Maison | `<chef>` | Voix Edge TTS |
|--------|----------|---------------|
| Gryffondor  | `mcgonagall` | `de-DE-SeraphinaMultilingualNeural` (rate -7 %, pitch ±0) |
| Serpentard  | `rogue`      | `de-DE-FlorianMultilingualNeural` (rate -12 %, pitch -8 Hz) |
| Serdaigle   | `flitwick`   | `en-US-AndrewMultilingualNeural` (rate +10 %, pitch +24 Hz) |
| Poufsouffle | `sprout`     | `fr-FR-VivienneMultilingualNeural` (rate -3 %, pitch ±0) |

#### 3.4.2 Inventaire des samples par chef (14 par chef × 4 = 56 OGG)

| Contexte | Trigger | Variantes | Quand |
|----------|---------|-----------|-------|
| `donation_intro_1`   | Apparition du bouton « 💰 Faire un don » la 1ʳᵉ fois | 1 | Premier ouvrir du dialogue post-tier-17 |
| `donation_offer_1/2` | Ouverture de `#house-donation-modal` | 2 | À chaque ouverture (aléatoire) |
| `donation_small_1/2/3` | Don confirmé < 5 000 G | 3 | Après validation (aléatoire) |
| `donation_large_1`   | Don confirmé ≥ 5 000 G | 1 | Solennel, jamais randomisé |
| `donation_tier_19_1` | Franchissement tier 19 | 1 | `checkHouseLevelUp` détecte 60 000 pts |
| `donation_tier_20_1` | Franchissement tier 20 | 1 | 80 000 pts |
| `donation_tier_21_1` | Franchissement tier 21 | 1 | 110 000 pts |
| `donation_tier_22_1` | Franchissement tier 22 | 1 | 150 000 pts |
| `donation_tier_23_1` | Franchissement tier 23 | 1 | 200 000 pts |
| `donation_tier_24_1` | Franchissement tier 24 (capstone) | 1 | 300 000 pts |
| `donation_refuse_1`  | Tentative avec < 100 G en poche | 1 | Bouton grisé déclenche message |

**Total : 56 samples.** Production via `gen_voice_edge.py` ≈ 5 min de batch
+ 10 min de QA d'écoute (Edge TTS peut bafouiller sur ponctuation rare).

#### 3.4.3 Textes proposés — McGonagall (Gryffondor)

Ton : autoritaire, fière, économe, n'aime pas la flatterie mais respecte
le devoir accompli.

- `mcgonagall_donation_intro_1`
  > « Vous êtes parvenu au cœur de notre Maison, Potter. Si la fortune
  > vous sourit, sachez que Gryffondor accueille les contributions de
  > ses fils et filles les plus fidèles. »
- `mcgonagall_donation_offer_1`
  > « Que comptez-vous offrir à Gryffondor aujourd'hui ? »
- `mcgonagall_donation_offer_2`
  > « Notre Maison saura faire bon usage de votre or, comme toujours. »
- `mcgonagall_donation_small_1`
  > « Merci. Chaque galion compte pour les générations à venir. »
- `mcgonagall_donation_small_2`
  > « Bien. Continuez ainsi et nul ne pourra contester votre place. »
- `mcgonagall_donation_small_3`
  > « Reçu. Mes encouragements, Potter. »
- `mcgonagall_donation_large_1`
  > « Voilà une générosité digne du Lion. Gryffondor n'oublie pas ce
  > que vous faites pour elle aujourd'hui. »
- `mcgonagall_donation_tier_19_1`
  > « Vous voici Légende vivante de notre Maison. Peu y sont parvenus. »
- `mcgonagall_donation_tier_20_1`
  > « Votre nom traversera les âges, Potter. Témoin des Maisons. »
- `mcgonagall_donation_tier_21_1`
  > « Vous êtes désormais le Cœur de Poudlard. Tâchez d'en être digne. »
- `mcgonagall_donation_tier_22_1`
  > « Au-delà des Maisons. Vous nous appartenez encore, mais à peine. »
- `mcgonagall_donation_tier_23_1`
  > « Aspect mythique. Je n'aurais pas cru voir cela de mon vivant. »
- `mcgonagall_donation_tier_24_1`
  > « Au-delà des dieux mêmes. Que les fondateurs vous accordent leur paix. »
- `mcgonagall_donation_refuse_1`
  > « Revenez quand vos poches seront plus garnies, Potter. Inutile
  > d'humilier votre Maison. »

#### 3.4.4 Textes proposés — Rogue (Serpentard)

Ton : sarcastique, lent, intéressé par le pouvoir, méprisant du superflu
mais respectueux du calcul.

- `rogue_donation_intro_1`
  > « Tiens, Potter. Vous découvrez enfin que l'ambition se paie en or
  > aussi bien qu'en sang. Serpentard accepte vos offrandes. »
- `rogue_donation_offer_1`
  > « Combien êtes-vous prêt à laisser sur la table aujourd'hui ? »
- `rogue_donation_offer_2`
  > « Parlez. Mon temps est précieux, le vôtre… discutable. »
- `rogue_donation_small_1`
  > « Soit. Un début. »
- `rogue_donation_small_2`
  > « Mieux que rien. À peine. »
- `rogue_donation_small_3`
  > « Reçu. Ne vous attendez à aucun remerciement. »
- `rogue_donation_large_1`
  > « Voilà qui ressemble enfin à une ambition. Serpentard saura quoi
  > en faire — soyez assuré que vous ne reverrez pas un galion. »
- `rogue_donation_tier_19_1`
  > « Légende. Le mot est galvaudé. Pour vous, je consens à l'employer. »
- `rogue_donation_tier_20_1`
  > « Témoin de l'âge, Potter. Les ombres de Salazar vous toisent. »
- `rogue_donation_tier_21_1`
  > « Cœur de Poudlard. Le château bat à votre rythme désormais. »
- `rogue_donation_tier_22_1`
  > « Au-delà des Maisons. Vous échappez même à Serpentard. Curieux. »
- `rogue_donation_tier_23_1`
  > « Aspect mythique. Quelque chose en vous échappe au temps. »
- `rogue_donation_tier_24_1`
  > « Au-delà des dieux. Je m'incline, Potter. Une seule fois. »
- `rogue_donation_refuse_1`
  > « Mendier serait plus digne que ceci. Revenez avec quelque chose
  > à offrir, ou ne revenez pas. »

#### 3.4.5 Textes proposés — Flitwick (Serdaigle)

Ton : enthousiaste, pédagogue, vif, friand de précision et de chiffres.

- `flitwick_donation_intro_1`
  > « Oh, mais quelle agréable surprise ! Vous avez atteint le palier
  > qui ouvre nos coffres aux contributions. Serdaigle vous remercie
  > par avance. »
- `flitwick_donation_offer_1`
  > « Eh bien, eh bien ! Combien souhaitez-vous nous offrir ? »
- `flitwick_donation_offer_2`
  > « Chaque galion sera converti en points d'estime, c'est calculé ! »
- `flitwick_donation_small_1`
  > « Magnifique ! Vous voyez, tout s'additionne. »
- `flitwick_donation_small_2`
  > « Très bien, très bien. Continuons. »
- `flitwick_donation_small_3`
  > « Excellent ! Notre bibliothèque vous en sera reconnaissante. »
- `flitwick_donation_large_1`
  > « Stupéfiant ! Une telle générosité mérite tous nos honneurs.
  > Serdaigle gravera votre nom dans le marbre. »
- `flitwick_donation_tier_19_1`
  > « Légende vivante ! Ah, je n'avais pas vu cela depuis Rowena
  > elle-même. Ou presque. »
- `flitwick_donation_tier_20_1`
  > « Témoin de l'âge ! Vous voici inscrit dans les annales. »
- `flitwick_donation_tier_21_1`
  > « Cœur de Poudlard. Imaginez ! Les murs eux-mêmes vous écoutent. »
- `flitwick_donation_tier_22_1`
  > « Au-delà des Maisons. C'est presque… mathématiquement impossible
  > et pourtant, vous y êtes ! »
- `flitwick_donation_tier_23_1`
  > « Aspect mythique. Vous dépassez les équations connues. »
- `flitwick_donation_tier_24_1`
  > « Au-delà des dieux. Je ferme mon livre. Aucune note ne saurait
  > suivre cela. »
- `flitwick_donation_refuse_1`
  > « Hum, vos poches semblent un peu légères aujourd'hui. Revenez
  > quand le compte y sera, voulez-vous ? »

#### 3.4.6 Textes proposés — Chourave (Poufsouffle)

Ton : chaleureuse, terrienne, maternelle, voit la valeur des petites
choses.

- `sprout_donation_intro_1`
  > « Oh, mon cher enfant, comme c'est gentil de penser à nous !
  > Poufsouffle accueille volontiers tout ce que tu voudras partager. »
- `sprout_donation_offer_1`
  > « Alors, dis-moi, combien souhaites-tu donner à notre Maison ? »
- `sprout_donation_offer_2`
  > « Que ce soit beaucoup ou peu, chaque geste compte chez nous. »
- `sprout_donation_small_1`
  > « Merci, c'est très généreux. Cela ira aux serres, sois-en sûr. »
- `sprout_donation_small_2`
  > « Bénédiction sur toi, mon enfant. Les blaireaux n'oublient pas. »
- `sprout_donation_small_3`
  > « Voilà qui fera grand bien. Merci, vraiment. »
- `sprout_donation_large_1`
  > « Mon Dieu, quelle générosité ! Tu nourriras nos plantes et nos
  > élèves pour des saisons entières. Poufsouffle te bénit. »
- `sprout_donation_tier_19_1`
  > « Légende vivante. Toi, parmi les nôtres. Cela me rend si fière. »
- `sprout_donation_tier_20_1`
  > « Témoin de l'âge. Tu as vu plus que beaucoup de fondateurs. »
- `sprout_donation_tier_21_1`
  > « Cœur de Poudlard. Le château t'aime comme nous t'aimons. »
- `sprout_donation_tier_22_1`
  > « Au-delà des Maisons. Mais reviens-nous voir parfois, hein ? »
- `sprout_donation_tier_23_1`
  > « Aspect mythique. Les racines de Poudlard portent ton nom. »
- `sprout_donation_tier_24_1`
  > « Au-delà des dieux. Je n'ai plus rien à t'apprendre, mon enfant. »
- `sprout_donation_refuse_1`
  > « Allons, allons, ne te mets pas dans l'embarras. Reviens quand
  > tu auras quelques galions de plus. »

#### 3.4.7 Production des samples (`tools/gen_voice_edge.py`)

Procédure batch :

1. Ajouter les 14 entrées par chef dans le dict `LINES` du tool —
   tuples `("<chef>_donation_<contexte>_<n>", "<texte>")`.
2. Lancer :
   ```bash
   python3 tools/gen_voice_edge.py mcgonagall rogue flitwick sprout
   ```
3. QA : écouter au moins les `tier_*_1` (6 par chef × 4 = 24 samples
   critiques narrativement). Edge TTS peut bafouiller sur les noms
   propres rares (« Salazar » → « Salazaar »). Régénérer ces samples
   isolément avec ponctuation ajustée si besoin.
4. Mettre à jour `_VOICE_SAMPLES` dans `js/audio-music.js` :
   ```diff
   _VOICE_SAMPLES: {
     // …
   + mcgonagall_donation_intro_1:   'audio/voice/mcgonagall_donation_intro_1.ogg',
   + mcgonagall_donation_offer_1:   'audio/voice/mcgonagall_donation_offer_1.ogg',
   + // … 56 entrées au total
   },
   ```
5. Précaches PWA : **rien à toucher**. La stratégie `audio/` est
   stale-while-revalidate à la demande (cf. CLAUDE.md §PWA) — les
   nouveaux OGG seront cachés au premier déclenchement.

#### 3.4.8 Trigger côté code (helpers)

Helper unifié à exposer dans `house-donation.js` :

```js
function _playDonationVoice(context) {
  const chef = HOUSE_BONUSES[chosenHouse]?.headOfHouseVoiceKey;
  if (!chef) return; // safety
  const key = `${chef}_donation_${context}`;
  if (typeof AudioSystem === 'undefined') return;
  if (typeof AudioSystem.playVoice === 'function') AudioSystem.playVoice(key);
}
```

`headOfHouseVoiceKey` à ajouter dans `HOUSE_BONUSES` (state.js) :
`gryff: 'mcgonagall'` / `slyth: 'rogue'` / `raven: 'flitwick'` /
`pouf: 'sprout'`. Évite le mapping en dur dans le helper et reste
cohérent avec les autres lookups par Maison.

Sélection variant : pour `offer_*` et `small_*`, picker aléatoire :
```js
const variants = { offer: 2, small: 3 };
const n = variants[base] ? 1 + Math.floor(Math.random() * variants[base]) : 1;
_playDonationVoice(`${base}_${n}`);
```

### 3.5 Effet de levée des paliers 19+

`checkHouseLevelUp()` actuel (`main.js:273`) itère sur tous les tiers
configurés. Il suffit d'ajouter les tiers 19-24 dans `HOUSE_BONUSES[house].tiers`
pour que la logique existante s'applique. **Aucun code de gatekeeping
spécifique à écrire**, hors la mécanique de don elle-même.

`requiresDarkTier` pour les tiers 19+ : à débattre.
- Option A : `requiresDarkTier: 2` (même que Apothéose) — tier 19+ ne
  débloque qu'en boucle ténébreuse 2 (étage 21+).
- Option B : `requiresDarkTier: 3` (boucle ténébreuse 3, étage 31+) —
  plus restrictif, mais nécessite de générer du contenu boucle 3.

Recommandation : **Option A** (tier 19+ reste accessible en boucle 2).
Évite de bloquer le don sur du contenu pas encore généré.

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
transparente** des saves antérieures (tier 19-24 simplement débloqués
quand les points cumulent).

---

## 5. Phasage proposé

### Étape 1 — Paliers 19-24 (data)
- [ ] Ajouter les 6 entrées tiers 19-24 dans `HOUSE_BONUSES[house].tiers`
      (state.js) pour chaque Maison. Bonus différenciés par Maison
      (e.g. Gryffondor +ATK/LCK, Serdaigle +MAG/INT, etc.).
- [ ] Adapter `requiresDarkTier: 2` sur tous (Option A retenue).
- [ ] Vérifier que `checkHouseLevelUp` itère correctement — pas de
      changement de code attendu.

### Étape 2 — Mécanique de don
- [ ] Nouveau helper `donateGoldToHouse(amount)` dans un nouveau fichier
      `js/house-donation.js` (ou intégré à `quests.js`) :
      ```js
      function donateGoldToHouse(amount) {
        if (!chosenHouse || houseTier < 17) return false;
        if (!Number.isFinite(amount) || amount < 1) return false;
        const realAmount = Math.min(amount, player.gold | 0);
        if (realAmount < 1) return false;
        player.gold -= realAmount;
        const points = Math.floor(realAmount / 5);
        housePoints += points;
        addMsg(`Don à ${chosenHouse} : −${realAmount} G · +${points} points`, 'magic');
        checkHouseLevelUp();
        updateUI();
        return true;
      }
      ```
- [ ] Ajout du fichier à `index.html` et au MANIFEST `loader.js`.

### Étape 3 — Voix off (samples OGG)
- [ ] Ajouter les 56 entrées (14 × 4 chefs) dans `tools/gen_voice_edge.py`
      (dict `LINES`).
- [ ] Batch génération `python3 tools/gen_voice_edge.py mcgonagall rogue
      flitwick sprout`.
- [ ] QA d'écoute des `tier_*_1` (24 samples critiques).
- [ ] Référencer les 56 OGG dans `_VOICE_SAMPLES` (`js/audio-music.js`).
- [ ] Ajouter `headOfHouseVoiceKey` dans `HOUSE_BONUSES` (`state.js`).

### Étape 4 — UI (modale de don)
- [ ] Nouvelle modale `#house-donation-modal` (CSS + HTML statique
      dans `index.html`).
- [ ] Input numérique + 4 boutons rapides (1000 / 5000 / 10000 / Max).
- [ ] Aperçu live des points gagnés + palier suivant.
- [ ] Confirmation explicite au-delà de 5000 G (modale de safety).

### Étape 5 — Intégration dialogue Chef de Maison
- [ ] `npc-dialog.js — _npcDialogActions` : ajouter le bouton
      « 💰 Faire un don » conditionnel sur `houseTier >= 17`.
- [ ] Le bouton ouvre la modale (`openHouseDonationModal()`).
- [ ] Brancher `_playDonationVoice('intro_1')` à la première ouverture
      (tracker via `localStorage` ou flag `_donationIntroPlayed` du save).
- [ ] Brancher `_playDonationVoice('offer_<n>')` à chaque ouverture
      ultérieure (picker aléatoire 1-2).
- [ ] Brancher `_playDonationVoice('small_<n>')` ou `'large_1'` sur
      validation (seuil 5 000 G).
- [ ] Brancher `_playDonationVoice('tier_<19-24>_1')` dans
      `checkHouseLevelUp` au franchissement.
- [ ] Brancher `_playDonationVoice('refuse_1')` sur clic d'un bouton
      grisé (< 100 G).
- [ ] Smoke test : ajouter un cas dédié dans `tests/smoke.js` (mock
      `AudioSystem.playVoice` pour vérifier la séquence d'appels).

### Étape 6 — Commit + PR
- [ ] 1 commit par étape (révisable).
- [ ] PR groupée vers master avec changelog.

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
