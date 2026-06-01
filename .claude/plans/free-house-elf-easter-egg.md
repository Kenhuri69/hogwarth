# Plan — Easter egg « Dobby & la chaussette »

> Statut : **proposition** (non implémenté). 5ᵉ easter egg pressenti
> (après l'arc Manon livré, et les plans « Chasse Sans Tête », « Salle sur
> Demande », « Reliques de la Mort »). Registre : **attendrissant /
> comique**. Canon HP : un elfe de maison est **libéré** quand son maître
> lui offre un vêtement — une chaussette suffit (Dobby).

## 0. Acquis de l'existant

- **Monstre** : `elfe_rebelle` « Elfe de Maison Rebelle » (`être magique`)
  existe déjà (`monsters.js`). C'est la cible de l'egg.
- **Précédent mécanique** : les **potions jetables** (`item.effect === 'throw'`)
  ciblent un ennemi en combat via `showTargetSelection('throw_item')` →
  `throwItemAtEnemy(invIdx, enemyIdx)` (`inventory.js` + `battle.js`). On
  calque ce flux pour « offrir une chaussette ».
- **Sortie pacifique** : `doFlee()` montre qu'on peut clore un combat
  proprement par `endBattle(false)` — **aucun crédit de kill** (ni quête
  `kill`, ni `totalKills` Ironman). C'est exactement ce qu'il faut pour une
  libération non violente.

## 1. Principe : désamorcer un combat par un geste tendre

```
(a) RUMEUR                  (b) GESTE EN COMBAT          (c) GRATITUDE
Un fantôme / la fiche    →  en plein combat contre     →  l'elfe pleure de joie,
bestiaire souffle que       l'Elfe de Maison Rebelle,     cesse le combat (fin
ces elfes rêvent de         lui OFFRIR une chaussette     pacifique, zéro kill)
liberté ; une chaussette    (objet ciblé, comme un        et laisse un PRÉSENT
les affranchit              flacon jeté)                  reconnaissant
```

- **(a) Rumeur (couche egg).** Aucune quête. Le **descriptif de l'objet
  chaussette** (« Dit-on qu'un elfe asservi qui en reçoit une est libéré ? »)
  + une ligne d'ambiance (fantôme `idleRandom` ou lore bestiaire de
  l'elfe) suffisent à faire le lien.
- **(b) Geste.** En combat, utiliser la **Chaussette** (objet, onglet
  « 🧪 Objet ») sur l'Elfe de Maison Rebelle. Modèle strict du flacon jeté
  (`effect:"gift"`, ciblage `showTargetSelection`).
- **(c) Gratitude.** Sur un ennemi **libérable**, la chaussette met fin au
  combat **sans le tuer** ; l'elfe, ravi (« Maître a donné une chaussette !
  [Elfe] est libre ! »), laisse un présent. La **première libération de la
  partie** offre un souvenir unique + le titre « Ami des Elfes ».

## 2. Architecture — réemploi du flux d'objet ciblé

### Objet « Chaussette » (data.js)
```js
{ id:"chaussette", name:"Chaussette dépareillée", icon:"🧦",
  desc:"Une chaussette orpheline. Dit-on qu'un elfe de maison asservi qui en
        reçoit une est aussitôt libéré…",
  effect:"gift",            // nouveau : objet « offert » à un ennemi en combat
  price:5 }                 // dérisoire — vendue en boutique (moyen d'accès)
```
- **Accès** : entrée boutique (`SHOP_CATALOG`, `minFloor:1` ou 2, prix
  dérisoire) → moyen d'acquisition + indice (le descriptif). Option : aussi
  droppable.

### Cible « libérable » — data-driven (monsters.js)
Plutôt que coder l'id en dur, ajouter un champ **`liberable:true`** sur
`elfe_rebelle`. Le mécanisme cible tout monstre `liberable` → extensible
(autres elfes) sans toucher au code.

### Geste en combat (réemploi `throw`)
- `inventory.js — useItem` : router `item.effect === 'gift'` comme `'throw'`
  (combat requis ; `showTargetSelection('gift_item')` ou cible unique
  directe).
- `battle.js — giftSockToEnemy(invIdx, enemyIdx)` (jumeau de
  `throwItemAtEnemy`) :
  - **cible `liberable`** : consomme la chaussette, narratif joyeux,
    `endBattle(false)` (sortie pacifique, **pas de kill**), distribue le
    présent (§ Récompense). `seenMonsters` reste alimenté (rencontre).
  - **cible non libérable** : gag comique (« Le [monstre] fixe la
    chaussette, perplexe… puis la piétine. ») — **tour consommé mais
    chaussette NON consommée** (indulgent, réutilisable). `advanceBattleChar`.
- `battle-ui.js` : ajouter le dispatch `'gift_item'` à la sélection de cible
  (parallèle de `'throw_item'`).

### Récompense (gratitude)
- **Chaque libération** : présent **modeste** (un peu d'or + chance d'un
  consommable) — **pas de levier de combat**. Pas de crédit de kill (anti-
  farm Ironman/quêtes garanti par `endBattle(false)`).
- **1ʳᵉ libération de la partie** : **souvenir unique** (ex. trinket
  cosmétique « Chaussette de Dobby », à arbitrer) + flag `amiDesElfes`
  (badge « 🧦 Ami des Elfes » fiche perso) + scène attendrissante.
- **Garde-fou anti-farm** : libérations répétées (elfes respawnés) → présent
  **symbolique/dégressif** (remerciement, or minime). Le vrai gain est la
  1ʳᵉ fois + la scène. (À arbitrer §3.)

### État (state.js, sérialisé)
| Variable | Rôle |
|----------|------|
| `amiDesElfes` (bool) | 1ʳᵉ libération faite (souvenir + scène jouée une fois). Sérialisé ; reset `false` `startGame` |

> Optionnel V2 : compteur `elvesFreed` (int) pour une gratitude croissante.
> V1 : un seul flag, minimal.

### Hook / rumeur (egg surface)
- **Descriptif de la Chaussette** (instruction implicite) — déjà ci-dessus.
- + 1 ligne d'ambiance : `idleRandom` d'un fantôme lore **ou** `lore`/
  `anecdote` de l'elfe au bestiaire (« Asservi par un sortilège ; un simple
  vêtement briserait sa chaîne… »). Réemploi pur des champs existants.

## 3. Décisions à acter (⚠️ avant implémentation)

| Sujet | Proposition |
|-------|-------------|
| **Cible libérable** | ✅ champ data-driven **`liberable:true`** sur `elfe_rebelle` (pas d'id en dur) |
| **Accès à la chaussette** | ✅ **boutique** (prix dérisoire, descriptif-indice) ; drop optionnel |
| **Chaussette sur non-elfe** | ✅ gag, **tour perdu mais objet conservé** (indulgent) |
| **Récompense répétée** | ✅ **symbolique/dégressive** (anti-farm or) ; souvenir unique à la 1ʳᵉ fois |
| **Souvenir unique** | trinket cosmétique « Chaussette de Dobby » **ou** simple or/consommable — à arbitrer |
| **Hook rumeur** | ✅ descriptif objet + 1 ligne (fantôme `idleRandom` ou bestiaire) ; PNJ elfe libre = V2 |
| **Pas de crédit de kill** | ✅ `endBattle(false)` (cohérent doFlee) — n'affecte ni quêtes `kill` ni Ironman |

## 4. Découpage en phases (verify)

1. **Objet & cible** — item `chaussette` (`effect:"gift"`) + entrée boutique ;
   `liberable:true` sur `elfe_rebelle`.
   → verify : item présent, vendu ; elfe marqué libérable.
2. **Geste en combat** — route `useItem`/`gift` + ciblage + `giftSockToEnemy` :
   libérable → `endBattle(false)` + présent (sans kill) ; non libérable → gag,
   tour perdu, chaussette conservée.
   → verify : chaussette sur l'elfe = fin pacifique + présent, `totalKills`
   et quêtes `kill` inchangés ; sur un non-elfe = no-op indulgent.
3. **Récompense & flag** — 1ʳᵉ libération : souvenir + `amiDesElfes` + scène ;
   répétitions symboliques ; badge fiche perso.
   → verify : flag posé une fois ; badge affiché ssi `amiDesElfes`.
4. **Hook & persistance** — descriptif + ligne d'ambiance ; sérialisation +
   reset `startGame` ; MANIFEST loader (`amiDesElfes`, `giftSockToEnemy`).
   → verify : round-trip save conserve `amiDesElfes`.
5. **Smoke** — `scenarioFreeHouseElf` : chaussette→elfe = libération (fin
   sans kill, présent), chaussette→non-elfe = no-op, 1ʳᵉ fois = flag, save.
   → verify : `node tests/smoke.js` vert.

## 5. Hors-scope V1
- PNJ « elfe libre » donneur de rumeur/quête — V2.
- Icône painterly dédiée de la chaussette (emoji 🧦 en V1).
- Gratitude croissante (`elvesFreed`) / cadeaux escaladés — V2.
- Transformer l'elfe libéré en allié/compagnon — hors-scope.

## Suivi
- [x] Concept retenu par l'utilisateur : **Dobby & la chaussette**.
- [x] Vérifié : `elfe_rebelle` existe ; flux d'objet jeté (`throw`) et sortie
      pacifique (`endBattle(false)`) réemployables.
- [ ] §3 — décisions à confirmer (souvenir unique, récompense répétée).
- [ ] Phases 1-5 — à implémenter une fois le plan validé.
- [ ] Réserve : **dialogues** (joie de l'elfe à la Dobby, gag non-elfe,
      ligne d'ambiance) à relire/valider avant implémentation.
