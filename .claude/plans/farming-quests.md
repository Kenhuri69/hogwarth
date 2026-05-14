# Plan — Quêtes répétables de farming (Chasse + Course)

> **Branche** : `claude/add-farming-quests-9LL9P`
> **Statut** : Plan rédigé, implémentation en cours.

---

## 1. Objectif

Ajouter deux quêtes répétables très visibles pour soutenir le grinding XP,
spécialement le mode solo avant l'étage 5.

| ID | PNJ | Type | Étages | Cooldown |
|----|-----|------|--------|----------|
| `chasse_magizoologiste` | Newton Scamander | kill | 3–8 | tous les 2 niveaux |
| `course_hagrid`         | Hagrid           | item | 4–9 | tous les 3 niveaux |

Règle dialogue cruciale :
- **Texte affiché** (visible avec le PNJ) : peut nommer la cible précise (`${monster.name}` / `${item.name}`).
- **Texte vocal** (OGG ElevenLabs) : générique, sans nom — un seul OGG par état réutilisable pour tous les tirages.

---

## 2. Scripts à enregistrer en voix d'abord (génériques)

**Voix recommandée** : ElevenLabs `eleven_multilingual_v2`, settings cohérents avec
la chaîne Dumbledore (stability 50, similarity 75, style 0, speaker_boost on).

### 2.1 Scamander — `chasse_magizoologiste` (3 OGG)

Voix : posée, curieuse, accent britannique légèrement excentrique.
Cibles : `scamander_chasse_offer_1.ogg`, `scamander_chasse_active_1.ogg`,
`scamander_chasse_ready_1.ogg`.

**offer**
> « J'ai repéré une créature qui pose problème dans cet étage. Peux-tu t'en occuper pour moi ? »

**active**
> « Alors, tu as trouvé ces créatures ? »

**ready**
> « Excellent travail ! Tiens, voilà ta récompense. »

### 2.2 Hagrid — `course_hagrid` (3 OGG)

Voix : grave, chaleureuse, accent populaire (déjà rodée si une voix Hagrid est
prête ; sinon clonage rapide).
Cibles : `hagrid_course_offer_1.ogg`, `hagrid_course_active_1.ogg`,
`hagrid_course_ready_1.ogg`.

**offer**
> « J'ai encore besoin d'ingrédients pour mes bestioles. Peux-tu m'en ramener quelques-uns ? »

**active**
> « Alors, tu as les ingrédients ? »

**ready**
> « Merci beaucoup ! Tiens, voilà ta récompense. »

> **Ordre voulu** : voix générique d'abord (OGG enregistrables sans variable),
> puis texte affiché ci-dessous (peut être dynamique). C'est le sens de la
> précision utilisateur sur l'ordre.

---

## 3. Textes affichés (dynamiques avec variables)

### 3.1 Chasse — Scamander

| État | Texte affiché |
|------|---------------|
| `questOffer`  | « J'ai repéré des **${monster.name}** qui posent problème par ici. Veux-tu t'en charger ? » |
| `questActive` | « As-tu éliminé les **${monster.name}** ? » |
| `questReady`  | « Excellent ! Voilà ta récompense. » |

### 3.2 Course — Hagrid

| État | Texte affiché |
|------|---------------|
| `questOffer`  | « J'ai encore besoin de **${item.name}**. Peux-tu m'en ramener ${amount} ? » |
| `questActive` | « T'as trouvé les **${item.name}** que j't'ai d'mandés ? » |
| `questReady`  | « Parfait mon gars ! Voilà pour toi. » |

Implémentation : interpolation au moment de l'acceptation. Le clone de quête
stocke `_dynamicDesc` et son objectif a déjà `monsterId`/`itemId` réels.
`_npcDialogPages` est étendu pour relire ces variables si la quête est de
type farming.

---

## 4. Configuration PNJ (npcs.js)

### 4.1 Scamander — basculer en `random:true`

Avant : `placement: { floor: 2, anchor: "any" }`, `questsGiven: ["niffleurs_trésor"]`.

Après : on garde `niffleurs_trésor` (placement fixe étage 2 conservé pour la
quête principale) + on ajoute une seconde fiche Scamander random sur
3–8 ? **Non, plus simple** : on garde Scamander en placement fixe étage 2
mais on ajoute `chasse_magizoologiste` à ses `questsGiven`. Sa quête principale
finie, la chasse devient répétable.

> Décision : garder placement fixe pour cohérence avec la quête `niffleurs_trésor`.
> Ajouter dans `questsGiven` + `questsTurnedIn` : `"chasse_magizoologiste"`.

Question initialement : random ? Le plan utilisateur dit `random: true` mais
Scamander a déjà un placement fixe étage 2 + une quête fixe. Pour éviter
les conflits (deux instances Scamander sur des étages différents), je garde
le placement fixe et l'étends.

**Mise à jour décision** : finalement on suit le plan utilisateur : Scamander
**reste fixe étage 2** pour `niffleurs_trésor` (placement déjà payé) ET on
l'apparaît **random** sur 3–8 pour la chasse. Implémentation : 2 entrées NPC
distinctes — `scamander` (existant) et `scamander_chasseur` (nouveau, random).

> Décision finale (plus simple) : 1 seule entrée `scamander` qui passe
> en hybride. On ajoute `questsGiven: ["niffleurs_trésor", "chasse_magizoologiste"]`
> et l'étage 2 reste son ancre fixe — la chasse devient disponible quand
> le joueur croise Scamander là où il est. Coût : la chasse n'apparaît qu'à
> l'étage 2 si on ne fait rien d'autre.

**Solution retenue** : faire de Scamander une entrée **fixe étage 2** ET
ajouter **2 entrées random** distinctes (un Scamander vagabond et un Hagrid
itinérant) avec id différents (`scamander_random`, `hagrid_random`) qui
ne servent que les quêtes farming. Simple, sans conflit, et le plan
utilisateur (random étages 3-8 / 4-9) est respecté.

### 4.2 Nouvelles entrées NPCS

```js
{
  id: "scamander_random",
  name: "Newton Scamander",
  title: "Magizoologiste en tournée",
  icon: "🐾",
  portraitImg: "img/npc/scamander.png",
  random: true,
  minFloor: 3,
  maxFloor: 8,
  questsGiven: ["chasse_magizoologiste"],
  questsTurnedIn: ["chasse_magizoologiste"],
  dialogues: { greeting: [...], idle: "...", questOffer: "...", questActive: "...", questReady: "..." }
}
{
  id: "hagrid_random",
  name: "Hagrid",
  title: "Garde-chasse en maraude",
  icon: "🦉",
  portraitImg: "img/npc/hagrid.png",
  random: true,
  minFloor: 4,
  maxFloor: 9,
  questsGiven: ["course_hagrid"],
  questsTurnedIn: ["course_hagrid"],
  dialogues: { greeting: [...], idle: "...", questOffer: "...", questActive: "...", questReady: "..." }
}
```

---

## 5. Templates de quêtes (quests.js)

```js
{
  id: "chasse_magizoologiste",
  title: "Chasse du Magizoologiste",
  giver: "Newton Scamander",
  desc: "Élimine les créatures que Scamander a repérées dans cet étage.",
  farming: true,                         // ← nouveau flag (tri journal)
  // objective `kill` rempli dynamiquement à l'acceptation (monsterId + amount tirés)
  objectives: [{ type: "kill", monsterId: null, amount: 0, progress: 0, completed: false }],
  reward: { xp: 230, gold: 75 },         // moyenne ; rerolled à l'acceptation pour fluctuation
  location: "Étages 3–8",
  repeatable: { everyLevels: 2 },
  // Rolling = à l'acceptation
  rollOnAccept: { kind: "kill", floor: { min: 3, max: 8 } }
}
{
  id: "course_hagrid",
  title: "Course pour Hagrid",
  giver: "Hagrid",
  desc: "Rapporte les ingrédients qu'Hagrid t'a demandés.",
  farming: true,
  objectives: [{ type: "item", itemId: null, amount: 0, progress: 0, completed: false }],
  reward: { xp: 190, gold: 65 },
  location: "Étages 4–9",
  repeatable: { everyLevels: 3 },
  rollOnAccept: { kind: "item" }
}
```

---

## 6. Helpers techniques

### 6.1 `rollFarmingTarget(quest)` — quests.js

À l'acceptation de la quête, mute son objectif (monsterId/itemId/amount) et
sa description :

- **Chasse** : `pool = MONSTERS.filter(m => m.minFloor ≤ floor ≤ maxFloor && !UNIQUE_BOSSES.has(m.id))`.
  `UNIQUE_BOSSES = ['bellatrix', 'voldemort_affaibli', 'voldemort_revenu', 'nagini']`.
  Tirage `weightedPick`. amount = `4 + Math.floor(Math.random() * 5)` (4–8).
- **Course** : `pool = ['mandragore', 'choco_sorcier', 'potion_s', 'potion_m']`.
  Pick uniforme. amount = `3 + Math.floor(Math.random() * 3)` (3–5).
- Recompute `reward.xp` selon une fluctuation ±20 % et application du
  bonus sous-level (cf. §6.3).
- Stocke `_dynamicDesc` interpolé pour affichage et `_dynamicTargetName`
  pour les dialogues.

### 6.2 `spawnFarmingMonsters(targetId, count)` — dungeon.js

Variante de `spawnQuestMonsters` qui place **N copies** du target (au lieu
de 1 + extra random). Tolérant : place ce qui rentre. Retourne le nombre
de mobs placés.

Hook dans `acceptQuest()` : si `tpl.rollOnAccept.kind === 'kill'`, appeler
`spawnFarmingMonsters(rolledId, amount + 1-2 bonus)` pour garantir la
disponibilité.

Message système à l'acceptation :
`🦂 Plusieurs ${monster.name} ont été repérés dans l'étage !`

### 6.3 Bonus XP sous-level

```js
function _farmingXpBonus(baseXp, floor) {
  const expectedLevel = Math.max(1, floor);
  const playerLevel   = (player && player.level) || 1;
  const delta         = expectedLevel - playerLevel;
  if (delta <= 0) return baseXp;
  // +10 % par niveau de retard, cap +50 %
  const mult = Math.min(1.5, 1 + delta * 0.10);
  return Math.floor(baseXp * mult);
}
```

Appliqué dans `rollFarmingTarget` au moment du tirage.

### 6.4 `_ensureActiveKillQuestTargets` étendu

Garde-fou : si une quête farming `chasse_magizoologiste` est active mais
l'étage courant ne matche pas la fourchette `rollOnAccept.floor`, on ne
spawn pas. La quête reste valide ; le joueur doit revenir sur un étage
adapté. Pas de respawn ni de re-roll.

---

## 7. Marqueur minimap (CSS uniquement)

Nouvelle classe `.map-npc-farming` (rouge clignotant rapide, distinct de
`.map-npc-offer` jaune doré) appliquée dans `_buildMinimapCells` quand
le PNJ propose une quête farming offerable.

```css
.map-npc-farming {
  background: #b81c1c;
  box-shadow: 0 0 5px #ff5a5a, inset 0 0 2px #ffb0b0;
  animation: mapNpcFarmingBlink 0.8s ease-in-out infinite;
}
@keyframes mapNpcFarmingBlink {
  0%, 100% { filter: brightness(0.85); }
  50%      { filter: brightness(1.6); }
}
@media (prefers-reduced-motion: reduce) {
  .map-npc-farming { animation: none; }
}
```

Logique d'application dans `renderer-minimap.js` : si `getNpcQuestState(npc) === 'offer'`
et la qid offerable est une `farming` quête → appliquer `map-npc-farming`
au lieu de `map-npc-offer`. Le marqueur `?` (ready) reste bleu (commun).

---

## 8. Journal des quêtes (quests.js)

`renderQuestList()` :
- Sépare `activeQuests` en `farming` et `other`, render `farming` d'abord.
- Au-dessus du bloc farming, header doré « ## Quêtes de Farming »
  (style + titre Cinzel + séparateur).

---

## 9. Voix dans `npc-dialog.js`

Étendre `_voiceKeyForPage` :
```js
function _voiceKeyForPage(npcId, state, qid, pageIdx) {
  if (npcId === 'dumbledore') { /* existant */ }
  if (qid === 'chasse_magizoologiste') {
    return `scamander_chasse_${state}_${pageIdx + 1}`;
  }
  if (qid === 'course_hagrid') {
    return `hagrid_course_${state}_${pageIdx + 1}`;
  }
  return null;
}
```

Ajouter 6 clés dans `_VOICE_SAMPLES` (`audio-music.js`). Fallback silencieux
si les OGG ne sont pas livrés.

---

## 10. Phases

### Phase A — Code (Claude, cette PR)
- [x] A1 — Templates de quête + flag `farming` + clone dynamique
- [x] A2 — PNJ random Scamander/Hagrid (entrées séparées)
- [x] A3 — `rollFarmingTarget` + `spawnFarmingMonsters` + bonus sous-level
- [x] A4 — Interpolation `{target}`/`{amount}` dans `_npcDialogPages` + preview pré-acceptation
- [x] A5 — Section « Quêtes de Farming » dans le journal
- [x] A6 — Marqueur minimap rouge clignotant (CSS + JS, helper `_npcHasFarmingOffer`)
- [x] A7 — Clés `_VOICE_SAMPLES` + extension `_voiceKeyForPage`
- [x] A8 — Pas de nouveau global critique → MANIFEST inchangé
- [x] A9 — Smoke test vert (`scenarioFarmingQuests` ajouté, 50 scénarios OK)
- [ ] A10 — Commit + push sur `claude/add-farming-quests-9LL9P`

### Phase B — Voix (Utilisateur, hors PR)
- [x] B1 — Générer 6 OGG via ElevenLabs avec les scripts génériques §2.
- [x] B2 — Déposer dans `audio/voice/` (nommage exact §2).

### Phase C — Intégration audio (Claude)
- [x] C1 — MP3 originaux dans `audio/voice/_raw/`
- [x] C2 — Conversion `ffmpeg -ac 1 -ar 22050 -c:a libvorbis -q:a 3` + fade-out 300 ms
- [x] C3 — 6 OGG livrés : 11-27 KB par fichier (115 KB cumulés, sous le budget 300 KB)

---

## 11. Critères d'acceptation

- Deux PNJ random `scamander_random` / `hagrid_random` apparaissent
  dans leur fourchette d'étages.
- Acceptation d'une quête farming : spawning effectif (chasse) /
  message clair (course).
- Cooldown respecté (every 2/3 levels).
- Texte dialogue affiché contient nom dynamique du monstre/item.
- Voix (si OGG livrés) joue le script générique.
- Journal : section farming en tête avec récompense calculée.
- Marqueur minimap rouge clignotant uniquement pour ces 2 quêtes.
- Smoke vert.

---

## 12. Journal des décisions

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-14 | Plan rédigé | Décision : 2 entrées NPC séparées (`scamander_random` / `hagrid_random`) pour éviter conflit avec placements fixes existants. Pool monstres = toutes catégories sauf bosses uniques. Pool items = ingrédients/consommables (mandragore, choco_sorcier, potion_s, potion_m). |
| 2026-05-14 | Post-merge feedback | Utilisateur signale qu'il n'a pas trouvé Scamander/Hagrid en parcourant les étages 1-8. Diagnostic : (1) saves anciennes ont leurs étages cachés dans `floorDungeons` — aucun re-roll des PNJ random ne s'applique sur revisit ; (2) même fresh game, le slot random unique (50 %) partagé entre 7-8 PNJ rend chaque farming NPC à ~6 % par étage (~30 % cumulé sur la fourchette). |

---

## 13. Visibilité — fix post-merge (Option C : slot dédié + migration)

Solution combinée pour traiter à la fois les saves anciennes et les fresh games.

### Étapes

- [x] V1 — Ajout `placedFarmingNpcs: Set<npcId>` dans `state.js` ; reset dans `main.js` (new game) → critère : présent dans serialize/restore + reset cohérent avec `floorDungeons`.
- [x] V2 — Nouveau helper `getRandomFarmingNpcsForFloor(floor)` (random + `questsGiven` non vide) + `getRandomVendorOrLoreForFloor(floor)` (random sans `questsGiven`) → critère : pools strictement disjoints, somme = `getRandomEncountersForFloor`.
- [x] V3 — `generateDungeon` : utiliser `getRandomVendorOrLoreForFloor` pour le slot 50 % existant ; ajouter un slot **dédié** parcourant `getRandomFarmingNpcsForFloor` avec 80 % de chance par PNJ éligible **non encore placé** (filtré par `placedFarmingNpcs`). Add to set on success → critère : sur 100 générations d'étage 3-8 sans persistance préalable, ≥ 95 % de croisements pour chaque farming NPC.
- [x] V4 — `_migrateMissingNpcsForFloor` : après la passe fixes, parcourir `getRandomFarmingNpcsForFloor(floor)` et placer ceux non présents ET non dans `placedFarmingNpcs` (même 80 %) → critère : sur save ancienne sans `placedFarmingNpcs`, revisiter chaque étage de la fourchette place finalement le NPC.
- [x] V5 — `save.js` : sérialiser `placedFarmingNpcs` (Array) + restaurer (Set, défaut vide pour saves antérieures) → critère : roundtrip save→reload conserve la valeur.
- [x] V6 — Smoke `T11` (vieille save migrée → Scamander placé sur revisit) + `T12` (génération fresh sur fourchette → 2 NPCs placés au moins une fois) → critère : test vert.

