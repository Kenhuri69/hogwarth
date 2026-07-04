# Changelog — Poudlard & Magie

> Curaté par thèmes (pas commit par commit). Le détail vit dans
> l'historique des pull requests et les plans archivés
> (`.claude/plans/_archive/`).

## Mise à jour majeure « Le Sceau des Fondateurs » — juillet 2026

La version finale du jeu, aboutissement de la phase Release Candidate.

### 🗝️ Les Poches du Sceau (escape game)
- Nouveaux étages cachés temporaires déclenchés par les pièges de la Boucle
  Ténébreuse (étages 11+) : le groupe est projeté dans un écho figé du
  scellement des Fondateurs et n'en ressort qu'en résolvant l'épreuve.
- 3 types d'épreuve thématisés : **L'Énigme des Quatre** (stèles de Rowena),
  **Le Miroir de Salazar** (fragments à déposer dans l'ordre, un écho du
  groupe brouille), **L'Écho du Scellement** (budget serré, brasiers de
  Godric et Helga, échos hostiles).
- Variantes selon votre Maison (biais de tirage, indice gratuit, budget +20 %,
  sort des Ruines en avance), jauge de corruption, malus d'échec — et un
  boss Écho Corrompu si vous échouez en Ironman.
- Récompenses : Éclat de Vitalité, butin curaté, entrées Codex, quête
  répétable « Endurer les Poches », voix murmurées des quatre Fondateurs.

### 📖 Les six Maîtrises élémentaires
- 6 livres légendaires (feu, glace, foudre, lumière, ténèbres, physique) à
  arracher aux plus grands boss — +12 % de dégâts permanents de l'élément
  pour tout le groupe.
- Collection cosmétique cross-run « Bibliothèque des Maîtrises » dans le
  Codex du Sorcier (profil persistant, zéro héritage de puissance).

### 🌙 L'arc de Manon, achevé
- L'arc complet de la fille cachée de Lupin : 6 quêtes du secret au pardon,
  le grimoire de givre d'Élara (Actes II-III), et le capstone « Clair de
  Lune » — le livre de Lumière du père.
- Nouvelles side-quests de liens : la lettre jamais envoyée d'Élara (première
  quête de **livraison** inter-PNJ), l'aconit de la meute, Sirius × Lupin,
  Pomfresh × Élara, Bill × Élara, la rédemption de Lockhart.
- Voix : Manon (timbre dédié, prosodie évolutive), Lupin, Élara (voix
  posthume à signature de réverbe « mémoire »).

### ⚔️ Sorts & Magie 2.0, Artefacts 2.0, Potions 2.0
- **Sorts 2.0** : taxonomie complète, sorts par Maison, familiers, sorts
  environnementaux, variantes Premium, sorts évolutifs (mono→mono fort,
  AoE→AoE fort), sorts corrompus et jauge de corruption avec contrecoup.
- **Artefacts & Reliquaires 2.0** : 12 formes (bâton, orbe, grimoire,
  masque, reliques vocales…), artefacts actifs en combat (1 charge/combat),
  variantes Premium par rareté, synergies Artefact ↔ Sort.
- **Potions 2.0** : potions évolutives, synergies déclaratives, Premium par
  Maison, risques & effets secondaires en Boucle, Chaudron des Ruines,
  huiles d'arme et poudres utilitaires.

### ♾️ Boucle Ténébreuse enrichie (endgame)
- 10 boss inédits ou canon ajoutés : Basilic Ancestral, Moremplis, Magyar
  Ancestral, Spectre de Givre, Héraut de l'Orage, Héraut de l'Aube, et les
  4 Gardiens des Chambres des Fondateurs (avec placement en chambre dédiée).
- Tranche D « Ruines Anciennes » (étages 14+) : tileset runique, ambiance
  abyssale, événements de zone, échos temporels corrompus.
- PNJ recyclés en Boucle avec leurs quêtes (Kingsley, Bill, Sirius,
  Scamander, Mimi, Ollivander…), scaling raidi (« R1 marqué »), Le Dormeur
  des Fondations personnifié.
- « Briser le Cycle » : la vraie fin, avec ses illustrations dédiées.

### ✦ New Game+ & profil du Sorcier
- New Game+ « vrai » : mode challenge **empilable** (cran = victoires,
  ennemis +15 %/cran, butin +25 %/cran, zéro héritage).
- Profil persistant hors-save : titres honorifiques, fins découvertes,
  Codex du Sorcier au hub de démarrage.

### 🦸 Personnages jouables
- 15 héros sélectionnables — dont les nouveaux Nathalie Finch (Poufsouffle),
  Olivier de Châtillon (Serpentard) et Margaux Aiglebrume (Serdaigle) — avec
  répliques par événement (barks), beats scénarisés et sprites plein corps.

### 🧭 Interface & accessibilité
- Polish UX en 12 lots : thème de Maison persistant, indicateur d'autosave,
  tooltips tactiles, échelle de texte + contraste élevé, filtre/tri du sac,
  comparaison d'équipement au survol, raccourcis numériques en combat,
  Réglages en accordéon, navigation inter-modales du Grimoire.
- Ergonomie clavier complète : Échap universel, raccourcis remappables,
  navigation clavier des grilles et boutiques, isolation de modale
  (focus-trap + `inert`), finitions ARIA.

### ⚡ Performance & PWA
- Compression des images : `img/` **44 → 20 Mo** (−55 %) — quantization
  palette des 78 sprites de monstres, portraits redimensionnés, icônes.
- Première visite : lazy-load des images hors-viewport (LCP 29,7 s → 6,1 s),
  scripts différés, Service Worker tolérant aux 404.
- Runtime : log de combat borné, cache d'étages LRU, bestiaire lazy,
  redraw en pause quand l'onglet est caché.

### 🔊 Audio
- ~200 échantillons de voix (Dumbledore, chefs de Maison, Lupin, Élara,
  Manon, Fondateurs, narrateur, incantations de tous les sorts).
- Musiques d'ambiance zonées + musiques de combat par contexte (boss épique,
  étages profonds, danger critique) + thème de fin « Briser le Cycle ».

---

## Jalons antérieurs (2026)

- **Mode Ironman & Hall of Fame** : permadeath stricte, score équitable
  Solo/Duo, classement en ligne avec blasons de Maison.
- **Mondes Parallèles** : visites asynchrones inter-mondes (Cheminette),
  combats astraux, Verrous de Sang, Atelier du Voyageur, duels PvP.
- **Maisons 2.0** : paliers de prestige jusqu'à l'Apothéose ★N, sets de
  Maison, quêtes Signature, don à la Maison (gold-sink).
- **Rework des statistiques** : Fortune (LCK) et Célérité (AGI) — des
  débouchés réels pour chaque point de stat.
- **Système élémentaire** : 6 éléments, résistances/faiblesses, 4 statuts
  persistants (brûlure, poison, saignement, gel) + peur et étourdissement.
- **PWA** : installable, jouable 100 % hors-ligne, multi-slots de sauvegarde.
