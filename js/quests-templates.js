// ============================================================
// QUESTS — Catalogue des templates (données inertes)
// ============================================================
// QUEST_TEMPLATES : catalogue inerte lu par getQuestTemplate() (quests.js),
// _ensureActiveKillQuestTargets() (dungeon-spawning.js) et les migrations de
// save. Chargé AVANT quests.js. Aucune logique.
// ============================================================
const QUEST_TEMPLATES = [
  {
    id: "intro_tutoriel",
    title: "Bienvenue à Poudlard",
    giver: "Albus Dumbledore",
    desc: "Avance dans le donjon et descends jusqu'à l'étage 2 pour faire tes premiers pas.",
    objectives: [
      { type: "floor", floor: 2, progress: 0, amount: 1, completed: false }
    ],
    reward: { xp: 30, gold: 20, stats: { hp: 5, atk: 1, def: 1, mag: 1 } },
    location: "Hall d'entrée (étage 1)"
  },
  // ── Quête principale « La Descente » (fil d'Ariane — Lot 1 revue 2026-07) ──
  // Rend VISIBLE la colonne vertébrale (descendre → Voldemort) dans le
  // quest-tracker : 4 étapes chaînées, épinglées en tête (flag `main`).
  // NON-GATING (le seul verrou reste `victoryAchieved`) et SANS remise PNJ :
  // `autoTurnIn` — la remise EST la descente. Chaîne pilotée par
  // _ensureMainQuestProgress (quests.js), amorcée à la fin de l'intro.
  // Hors des questsGiven de Dumbledore : jamais offerte en dialogue.
  {
    id: "descente_1",
    main: true, autoTurnIn: true,
    title: "La Descente I — Les Cachots",
    giver: "Albus Dumbledore",
    desc: "La fêlure vient d'en bas. Trouve les grands escaliers et descends jusqu'aux Cachots (étage 4).",
    objectives: [
      { type: "floor", floor: 4, progress: 0, amount: 1, completed: false }
    ],
    reward: { xp: 60, gold: 30 },
    location: "En descendant — étage 4"
  },
  {
    id: "descente_2",
    main: true, autoTurnIn: true, prereq: "descente_1",
    title: "La Descente II — Les Profondeurs",
    giver: "Albus Dumbledore",
    desc: "Sous les Cachots s'ouvrent des Profondeurs qu'aucun cours n'enseigne. Continue de descendre jusqu'à l'étage 7.",
    objectives: [
      { type: "floor", floor: 7, progress: 0, amount: 1, completed: false }
    ],
    reward: { xp: 120, gold: 60 },
    location: "En descendant — étage 7"
  },
  {
    id: "descente_3",
    main: true, autoTurnIn: true, prereq: "descente_2",
    title: "La Descente III — Le Dixième Étage",
    giver: "Albus Dumbledore",
    desc: "Chaque boss tombé affaiblit le sceau. Atteins l'étage 10 — là où l'ombre se reforme.",
    objectives: [
      { type: "floor", floor: 10, progress: 0, amount: 1, completed: false }
    ],
    reward: { xp: 200, gold: 100 },
    location: "En descendant — étage 10"
  },
  {
    id: "descente_finale",
    main: true, autoTurnIn: true, prereq: "descente_3",
    title: "La Descente — L'Ombre au Fond",
    giver: "Albus Dumbledore",
    desc: "Voldemort, pleinement reformé, garde la source de la fêlure. Mets fin à l'arc : affronte-le et scelle ta victoire.",
    objectives: [
      { type: "kill", monsterId: "voldemort_revenu", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 400, gold: 200 },
    location: "Le fond — étage 10"
  },
  // ── Chaîne d'épreuves de Dumbledore (Phase 3) ─────────────────
  // Une chaîne de 5 quêtes (intro_tutoriel + 4 nouvelles) qui boost
  // permanent les stats du groupe et débloque sorts/items. La quête N+1
  // n'apparaît qu'après remise de la quête N (champ `prereq`).
  {
    id: "dumbledore_eveil",
    title: "L'éveil du Sorcier",
    giver: "Albus Dumbledore",
    desc: "Affronte un Épouvantard ou un Détraqueur. Les peurs qu'on défie nous rendent plus forts.",
    prereq: "intro_tutoriel",
    objectives: [
      { type: "kill", monsterId: "boggart", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 120, gold: 50, stats: { hp: 5, lck: 1 }, spell: "Wingardium Leviosa" },
    location: "Hall d'entrée (étage 1) — cible étage 3+"
  },
  {
    id: "dumbledore_courage",
    title: "Le Courage et la Ruse",
    giver: "Albus Dumbledore",
    desc: "Élimine deux Mangemorts qui rôdent dans les couloirs profonds. Apporte-moi cette preuve de bravoure.",
    prereq: "dumbledore_eveil",
    objectives: [
      { type: "kill", monsterId: "mangemort", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 220, gold: 100, stats: { hp: 10, atk: 1, mag: 1 }, item: "potion_m" },
    location: "Hall d'entrée (étage 1) — cible étage 5+",
    spawnOnAccept: { targetMonsterId: "mangemort", extraRandomCount: 1 }
  },
  {
    id: "dumbledore_resistance",
    title: "L'Ordre du Phénix",
    giver: "Albus Dumbledore",
    desc: "Un Mangemort d'élite a infiltré nos défenses. Trouve-le et neutralise-le. L'Ordre compte sur toi.",
    prereq: "dumbledore_courage",
    objectives: [
      { type: "kill", monsterId: "mangemort_elite", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 340, gold: 160, stats: { hp: 10, atk: 2, def: 2 }, item: "amulette" },
    location: "Hall d'entrée (étage 1) — cible étage 7+",
    spawnOnAccept: { targetMonsterId: "mangemort_elite", extraRandomCount: 1 }
  },
  {
    id: "dumbledore_revelation",
    title: "La Révélation",
    giver: "Albus Dumbledore",
    desc: "Au plus profond, une ombre se reforme. Affronte Bellatrix Lestrange — pour Poudlard, pour ceux que nous avons perdus.",
    prereq: "dumbledore_resistance",
    objectives: [
      { type: "kill", monsterId: "bellatrix", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 500, gold: 250, stats: { hp: 20, atk: 2, def: 2, mag: 2, lck: 2 } },
    location: "Hall d'entrée (étage 1) — cible étage 10+"
  },
  // ── Fil rouge « Clé de Voûte des Quatre » (déclencheur narratif) ──
  // Quête optionnelle hors-chaîne donnée par Dumbledore (étage 1). PAS de
  // prereq : elle coexiste avec la chaîne d'épreuves (cf. rework multi-quête
  // de _npcDialogActions). Type `item` → recomptage live depuis l'inventaire
  // + consommation des éclats à la remise. La descente reste la seule colonne
  // obligatoire — cette quête ne gate rien (cf. plan clef-de-voute §0).
  {
    id: "eclats_clef_voute",
    title: "Les Éclats de la Clé de Voûte",
    giver: "Albus Dumbledore",
    desc: "Rapporte trois Éclats de la Clé de Voûte, glanés sur les créatures des profondeurs. Reconstituée, la relique brisée des Fondateurs dira ce qu'elle taisait.",
    objectives: [
      { type: "item", itemId: "eclat_voute", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 300, gold: 150 },
    location: "Hall d'entrée (étage 1)"
  },
  {
    id: "mandragore_pomfresh",
    title: "Herboristerie urgente",
    giver: "Madame Pomfresh",
    desc: "Rapporte 3 Racines de Mandragore à l'infirmerie. Les élèves sont encore pétrifiés !",
    objectives: [
      { type: "item", itemId: "mandragore", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 80, gold: 40, item: "potion_m", spell: "Episkey" },
    location: "Infirmerie (étage 2)"
  },
  // Quête de déverrouillage de la concoction de potions. Tant qu'elle
  // n'est pas remise, l'action « Concocter » de Slughorn reste masquée.
  // Voir .claude/plans/farming-potion-system.md.
  {
    id: "quest_potions_slughorn",
    title: "L'Apprenti Potionniste",
    giver: "Horace Slughorn",
    desc: "Slughorn ne confie son chaudron qu'aux élèves sérieux. Rapporte-lui 3 Racines de Mandragore pour prouver ta valeur.",
    objectives: [
      { type: "item", itemId: "mandragore", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 60, gold: 40, recipes: ["brew_potion_s", "brew_potion_m", "brew_potion_soin_mineure"] },
    location: "Salle des Potions (étage 2)"
  },
  // Quête de suivi Slughorn : déverrouille les recettes de Grande Potion.
  {
    id: "quest_potions_slughorn_2",
    title: "Ingrédients de Maître",
    giver: "Horace Slughorn",
    desc: "Slughorn veut des ingrédients frais. Élimine 3 Mandragores Sauvages — leurs racines valent de l'or pour un potionniste.",
    prereq: "quest_potions_slughorn",
    objectives: [
      { type: "kill", monsterId: "mandragore_sauvage", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 180, gold: 90, recipes: ["brew_potion_l", "brew_potion_l_sp"] },
    location: "Salle des Potions (étage 2)"
  },
  // 3ᵉ quête Slughorn : déverrouille les recettes avancées (buff/résistance/PM
  // suprême). Pré-enseigne — les recettes restent découvrables par
  // expérimentation (cf. potions-enrichment.md §6bis).
  {
    id: "quest_potions_slughorn_3",
    title: "L'Art des Élixirs",
    giver: "Horace Slughorn",
    desc: "Slughorn convoite la sécrétion corrosive des Bundimuns pour ses élixirs avancés. Élimine 3 Bundimuns Venimeux et il t'enseignera ses recettes les plus précieuses.",
    prereq: "quest_potions_slughorn_2",
    objectives: [
      { type: "kill", monsterId: "bundimun", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 300, gold: 150, recipes: ["brew_potion_force", "brew_potion_resistance", "brew_potion_xl_sp"] },
    location: "Salle des Potions (étage 2)"
  },
  // ── Chaîne « Jardins de Chourave » (Potions P6.b3-suite) ──────────
  // Quête A : découvrir un jardin d'herbes caché (révélé par Revelio ou
  // fouille). Objectif type "discover_garden" (flag global gardenDiscovered).
  {
    id: "quest_garden_sprout",
    title: "Le Jardin Oublié",
    giver: "Professeur Pomona Chourave",
    desc: "Chourave murmure qu'au fil des siècles, des jardins d'herbes magiques se sont retrouvés murés dans la pierre du château. Dévoiles-en un — un sortilège de révélation ou une fouille attentive suffira — et reviens lui conter ta trouvaille.",
    objectives: [
      { type: "discover_garden", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 120, gold: 80, recipes: ["brew_elixir_regen"] },
    location: "Serres de Poudlard (étage 3)"
  },
  // Quête B : répétable — rapporter des herbes fraîches à Chourave. Objectif
  // type "herb" (consommé dans la besace player.herbs). Prereq = quête A.
  {
    id: "quest_garden_sprout_2",
    title: "Cueillette pour Chourave",
    giver: "Professeur Pomona Chourave",
    desc: "Maintenant que tu sais débusquer les jardins, Chourave te confie une tâche régulière : récolte des herbes fraîches et rapporte-les-lui pour garnir ses réserves.",
    prereq: "quest_garden_sprout",
    objectives: [
      { type: "herb", amount: 4, progress: 0, completed: false }
    ],
    reward: { xp: 90, gold: 120, recipes: ["brew_elixir_antidote"] },
    location: "Serres de Poudlard (étage 3)",
    // Répétable tous les 2 niveaux. La recette n'est offerte qu'à la 1ʳᵉ
    // remise : ensuite, récompense allégée en or/XP.
    repeatable: { everyLevels: 2 },
    repeatableReward: { xp: 70, gold: 140 }
  },
  {
    id: "livre_interdit",
    title: "Le livre qui mord",
    giver: "Gilderoy Lockhart",
    desc: "Récupère le Livre des Monstres qui mord dans la Bibliothèque Interdite.",
    objectives: [
      { type: "item", itemId: "book_monsters", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 120, gold: 25, item: "wand1" },
    location: "Bibliothèque Interdite (étage 3)"
  },
  {
    id: "troll_toilettes",
    title: "Nettoyage des toilettes",
    giver: "Mimi Geignarde",
    desc: "Élimine le Troll des Toilettes qui bloque l'accès aux cachots.",
    objectives: [
      { type: "kill", monsterId: "troll", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 150, gold: 60, item: "robe1" },
    location: "Toilettes du 2e étage"
  },
  {
    id: "chouette_perdue",
    title: "Chouette ensorcelée",
    giver: "Hagrid",
    desc: "Capture une Chouette Ensorcelée et rapporte-la à Hagrid (dans la Forêt).",
    objectives: [
      { type: "kill", monsterId: "chouette_envoutee", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 90, gold: 30, item: "broom" },
    location: "Forêt Interdite (étage 4+)",
    // Quête répétable : Hagrid en redemande tous les 3 niveaux.
    repeatable: { everyLevels: 3 },
    // À partir de la 2e remise, le balai est déjà au sac : on bascule
    // sur une récompense allégée plutôt que d'empiler des doublons.
    repeatableReward: { xp: 60, gold: 35 },
    // À l'acceptation : 1 chouette + 2 mobs aléatoires de l'étage,
    // pour donner du grain à moudre dans des salles déjà nettoyées.
    spawnOnAccept: { targetMonsterId: "chouette_envoutee", extraRandomCount: 2 }
  },
  {
    id: "defense_cabane",
    title: "Défense de la Cabane",
    giver: "Hagrid",
    desc: "Des araignées rôdent autour de la cabane d'Hagrid. Élimine-en 3 pour qu'il puisse dormir tranquille.",
    objectives: [
      { type: "kill", monsterId: "araignee", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 140, gold: 60, item: "potion_m" },
    location: "Forêt Interdite (étage 4+)"
  },
  {
    id: "niffleurs_trésor",
    title: "L'invasion des Niffleurs",
    giver: "Newton Scamander",
    desc: "Les Niffleurs ont envahi les sous-sols ! Élimine-en 3 avant qu'ils volent tout l'or.",
    objectives: [
      { type: "kill", monsterId: "niffleur", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 100, gold: 80, item: "amulette" },
    location: "Sous-sols de Poudlard (étage 2+)"
  },
  {
    id: "golem_passage",
    title: "Le Gardien Endormi",
    giver: "Professeur McGonagall",
    desc: "Un Gardien du Portail bloque l'accès à la bibliothèque interdite. Neutralise-le.",
    objectives: [
      { type: "kill", monsterId: "gardien_portail", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 180, gold: 70, item: "livre_bombarda" },
    location: "Passages secrets (étage 5+)"
  },
  {
    id: "lumiere_desespoir",
    title: "La Lumière contre le Désespoir",
    giver: "Professeur Lupin",
    desc: "Affronte un Détraqueur pour prouver ton courage, puis rapporte un Chocolat aux Sorciers à Lupin pour qu'il t'enseigne le Patronus.",
    objectives: [
      { type: "kill", monsterId: "detraqueur",    amount: 1, progress: 0, completed: false },
      { type: "item", itemId:    "choco_sorcier", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 200, gold: 50, spell: "Patronum" },
    location: "Classe de Défense (étage 4+)"
  },
  // ── Phase 3 — Tranche étage 8 « Le Seuil » ──────────────────────
  // (cf. .claude/plans/content-audit-stabilization.md §5.1)
  // 3 quêtes données par Kingsley Shacklebolt à l'étage 8.
  {
    id: "chasse_greyback",
    title: "Chasse au loup-garou",
    giver: "Kingsley Shacklebolt",
    desc: "Abats Fenrir Greyback. Il rôde dans les Profondeurs depuis trop longtemps — pour Lupin, pour Bill Weasley, pour toutes ses victimes.",
    objectives: [
      { type: "kill", monsterId: "fenrir_greyback", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 280, gold: 150, stats: { hp: 15, atk: 2 }, item: "essence_tenebres" },
    location: "Avant-garde de l'Ordre (étage 8)"
  },
  {
    id: "garde_seuil",
    title: "Le passage scellé",
    giver: "Kingsley Shacklebolt",
    desc: "Neutralise le Veilleur du Seuil pour ouvrir la voie vers les Profondeurs. Ses runes sont anciennes — mais pas éternelles.",
    objectives: [
      { type: "kill", monsterId: "veilleur_seuil", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 320, gold: 200, stats: { def: 2, mag: 2 }, item: "page_grimoire" },
    location: "Avant-garde de l'Ordre (étage 8)"
  },
  {
    id: "herbes_lupin",
    title: "Aconit pour le loup",
    giver: "Kingsley Shacklebolt",
    desc: "Récolte 5 brins d'Aconit pour Lupin. Sans sa potion mensuelle, il devient un danger pour tous — et il sait que tu peux le sauver.",
    objectives: [
      { type: "item", itemId: "herbe_aconit", amount: 5, progress: 0, completed: false }
    ],
    reward: { xp: 200, gold: 100, item: "potion_lune" },
    location: "Avant-garde de l'Ordre (étage 8)"
  },
  // ── Phase 3 — Tranche étage 9 « Les Profondeurs » ────────────────
  // (cf. .claude/plans/content-audit-stabilization.md §5.2)
  // 3 quêtes données par Bill Weasley à l'étage 9.
  {
    id: "chasse_aragog",
    title: "L'ami de Hagrid",
    giver: "Bill Weasley",
    desc: "Aragog est devenu trop dangereux pour le château. Hagrid a déjà fait son deuil — accomplis ce qu'il ne peut faire lui-même.",
    objectives: [
      { type: "kill", monsterId: "aragog", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 360, gold: 200, stats: { hp: 15, lck: 2 }, item: "essence_tenebres" },
    location: "Profondeurs araneennes (étage 9)"
  },
  {
    id: "baiser_detraqueur",
    title: "Le Maître des Glaces",
    giver: "Bill Weasley",
    desc: "Affronte le Maître des Détraqueurs avant qu'il ne pratique le Baiser sur l'un des nôtres. Garde un Patronus prêt — ou un Élixir de Lune.",
    objectives: [
      { type: "kill", monsterId: "maitre_detraqueur", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 400, gold: 240, stats: { def: 2, mag: 3 }, item: "page_grimoire" },
    location: "Cellules glacées (étage 9)"
  },
  {
    id: "dictame_bill",
    title: "Du Dictame pour les cicatrices",
    giver: "Bill Weasley",
    desc: "Récolte 5 brins de Dictame. Bill veut soulager ses cicatrices laissées par Greyback — la guérison n'existe plus, seul l'apaisement.",
    objectives: [
      { type: "item", itemId: "herbe_dictame", amount: 5, progress: 0, completed: false }
    ],
    reward: { xp: 240, gold: 130, item: "potion_l" },
    location: "Refuge de Bill (étage 9)"
  },
  // ── Phase 3 — Tranche étage 10 « Le Précipice » ──────────────────
  // (cf. .claude/plans/content-audit-stabilization.md §5.3)
  // 3 quêtes données par l'Esprit de Sirius Black à l'étage 10.
  {
    id: "chasse_dolohov",
    title: "La courbe violette",
    giver: "Esprit de Sirius Black",
    desc: "Antonin Dolohov a torturé un ami à moi, Caradoc Dearborn, jusqu'à la disparition. Abats-le — pour Caradoc, pour Hermione qu'il a presque tuée, pour moi qui ne peux plus lever la baguette.",
    objectives: [
      { type: "kill", monsterId: "antonin_dolohov", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 450, gold: 280, stats: { atk: 3, mag: 2 }, item: "essence_tenebres" },
    location: "Antichambre des Profondeurs (étage 10)"
  },
  {
    id: "chasse_heraut",
    title: "Faire taire le cor",
    giver: "Esprit de Sirius Black",
    desc: "Le Héraut sonne le retour du Maître. Tant qu'il chante, Voldemort puise dans son hymne. Brise le cor et tu gagneras un peu de temps.",
    objectives: [
      { type: "kill", monsterId: "heraut_tenebres", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 500, gold: 320, stats: { def: 3, mag: 3 }, item: "page_grimoire" },
    location: "Antichambre des Profondeurs (étage 10)"
  },
  {
    id: "purification_sirius",
    title: "Repos des spectres",
    giver: "Esprit de Sirius Black",
    desc: "Trois spectres renforcés errent sans repos depuis qu'ils ont franchi le Voile sans accepter. Détruis-les — c'est la seule façon de les libérer. Je le sais mieux que personne.",
    objectives: [
      { type: "kill", monsterId: "spectre_renforce", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 400, gold: 220, stats: { hp: 20, lck: 2 }, item: "larme_phenix_mineure" },
    location: "Couloirs hantés (étage 10)"
  },
  // ── Boucle Ténébreuse — Gardien de la Boucle (étage 11) ──────────
  // 3 quêtes répétables endgame (cf. gardien_boucle dans npcs.js).
  // Cibles : boss déjà connus qui se reforment à chaque récurrence
  // (Greyback à floor 18 via effectiveFloor=8, etc.). Reward réduit
  // sur les re-runs pour éviter le farm trivial.
  {
    id: "purge_loups",
    title: "Purge de la meute",
    giver: "Gardien de la Boucle",
    desc: "Abats 2 Fenrir Greyback Ténébreux. La Boucle reforme la meute à chaque récurrence — chaque purge soulage un peu le palier.",
    objectives: [
      { type: "kill", monsterId: "fenrir_greyback", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 300, gold: 250, item: "essence_tenebres", spell: "Flamme Dévorante" },
    repeatable: { everyLevels: 2 },
    repeatableReward: { xp: 200, gold: 180, item: "essence_tenebres" },
    location: "Boucle Ténébreuse (étage 11+)"
  },
  {
    id: "purge_acromantules",
    title: "Purge des araignées",
    giver: "Gardien de la Boucle",
    desc: "Abats 2 Aragog Ténébreux. La Boucle ressuscite le roi-Acromantule sous une forme plus dense à chaque récurrence.",
    objectives: [
      { type: "kill", monsterId: "aragog", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 320, gold: 260, item: "page_grimoire", spell: "Venin du Cachot" },
    repeatable: { everyLevels: 2 },
    repeatableReward: { xp: 220, gold: 190, item: "page_grimoire" },
    location: "Boucle Ténébreuse (étage 11+)"
  },
  {
    id: "purge_mangemorts",
    title: "Purge du serment noir",
    giver: "Gardien de la Boucle",
    desc: "Abats 2 Antonin Dolohov Ténébreux. Sa courbe violette signe la Marque — efface-la d'autant de cycles que possible.",
    objectives: [
      { type: "kill", monsterId: "antonin_dolohov", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 350, gold: 280, item: "essence_tenebres", spell: "Savoir Interdit" },
    repeatable: { everyLevels: 2 },
    repeatableReward: { xp: 240, gold: 200, item: "essence_tenebres" },
    location: "Boucle Ténébreuse (étage 11+)"
  },
  {
    id: "purge_moremplis",
    title: "Purge des linceuls",
    giver: "Gardien de la Boucle",
    desc: "Abats 2 Moremplis. Le Lethifold se retisse des ombres de la Boucle ; dissipe-le avec la lumière avant qu'il ne t'enveloppe.",
    objectives: [
      { type: "kill", monsterId: "moremplis", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 330, gold: 270, item: "page_grimoire", spell: "Fardeau Partagé" },
    repeatable: { everyLevels: 2 },
    repeatableReward: { xp: 230, gold: 195, item: "page_grimoire" },
    location: "Boucle Ténébreuse (étage 11+)"
  },
  // « Endurer les Poches » (escape-game-traps.md — Lot 4). Objectif `escape` :
  // re-sceller 2 Poches du Sceau (compteur via checkEscapePocketQuests à la
  // sortie réussie). Répétable everyLevels:2 → alimente le farm Forge/Biblio.
  {
    id: "endurer_poches",
    title: "Endurer les Poches",
    giver: "Gardien de la Boucle",
    desc: "Les gardes runiques du Sceau te happeront encore. Re-scelle deux Poches — chaque épreuve traversée raffermit le verrou, et la Boucle te paiera en matière.",
    objectives: [
      { type: "escape", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 320, gold: 240, item: "essence_tenebres" },
    repeatable: { everyLevels: 2 },
    repeatableReward: { xp: 240, gold: 180, item: "page_grimoire" },
    location: "Boucle Ténébreuse (étage 11+)"
  },
  // ── Ruines Anciennes — purges & chasse (Gardien de la Boucle) ────
  // Cibles propres à la Zone D (Spectre de Givre, Spectre Renforcé,
  // Basilic Ancestral). Modèle identique aux purge_* (kill, repeatable).
  {
    id: "purge_givre",
    title: "Purge du givre ancien",
    giver: "Gardien de la Boucle",
    desc: "Disperse 2 Spectres de Givre. Le froid surnaturel des Ruines se condense en eux ; chaque purge recule le gel d'un pas.",
    objectives: [
      { type: "kill", monsterId: "spectre_givre", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 340, gold: 270, item: "essence_tenebres" },
    repeatable: { everyLevels: 2 },
    repeatableReward: { xp: 230, gold: 200, item: "essence_tenebres" },
    location: "Ruines Anciennes (Boucle)"
  },
  {
    id: "purge_spectres",
    title: "Purge des spectres renforcés",
    giver: "Gardien de la Boucle",
    desc: "Abats 2 Spectres Renforcés. La Boucle les retisse plus denses à chaque récurrence — la lumière les délie le mieux.",
    objectives: [
      { type: "kill", monsterId: "spectre_renforce", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 360, gold: 285, item: "page_grimoire" },
    repeatable: { everyLevels: 2 },
    repeatableReward: { xp: 245, gold: 205, item: "page_grimoire" },
    location: "Ruines Anciennes (Boucle)"
  },
  {
    id: "chasse_basilic_ancestral",
    title: "Chasse — le Basilic Ancestral",
    giver: "Gardien de la Boucle",
    desc: "Au plus profond des Ruines mue un Basilic plus vieux que la Chambre des Secrets. L'affronter est un défi de cycles entiers — sa dépouille recèle une Essence des Ténèbres concentrée.",
    objectives: [
      { type: "kill", monsterId: "basilic_ancestral", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 520, gold: 500, item: "essence_tenebres" },
    repeatable: { everyLevels: 3 },
    repeatableReward: { xp: 360, gold: 340, item: "essence_tenebres" },
    location: "Ruines Anciennes (Boucle, étage 22+)"
  },
  // Q2 (ch.11 P1) — Pomfresh en Boucle : soigner le froid surnaturel.
  // Collecte de Cristaux de Givre (drop Zone D, Spectre de Givre) contre une
  // Essence de Chaleur. Repeatable everyLevels:2 → boucle de farm de soin.
  {
    id: "givre_pomfresh",
    title: "Le froid qui ronge",
    giver: "Madame Pomfresh",
    desc: "La Boucle me ramène des blessés gelés jusqu'à l'os par un froid qui n'est pas de ce monde. Rapporte-moi 3 Cristaux de Givre arrachés aux spectres des Ruines — j'en distillerai une Essence de Chaleur pour les réchauffer, toi compris.",
    objectives: [
      { type: "item", itemId: "cristal_givre", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 280, gold: 120, item: "essence_chaleur" },
    repeatable: { everyLevels: 2 },
    repeatableReward: { xp: 200, gold: 90, item: "essence_chaleur" },
    location: "Infirmerie (Boucle, étage 12+)",
    minFloor: 11
  },
  // ── Boucle Ténébreuse — quêtes des PNJ recyclés (étages 11+) ──────
  // Rallume les PNJ recyclés en Boucle (Kingsley 18, Bill 19, Sirius 20,
  // Marchand 18, Apothicaire 19, Forgeron 20) qui n'avaient plus rien à
  // proposer une fois leurs quêtes one-shot rendues. Réutilise la machinerie
  // existante : `rollOnAccept` (chasse), `item`/`herb` (collecte), `search`
  // (fouille), `spawnOnAccept` (boss). Gate `minFloor: 11` (Boucle uniquement,
  // étages scellés sans victoire) lu par isQuestOfferable.
  //
  // CHASSE — primes farming (cible aléatoire de l'étage, tirée à l'acceptation).
  {
    id: "chasse_kingsley_boucle",
    title: "Battue de l'Ordre",
    giver: "Kingsley Shacklebolt",
    desc: "L'Ordre a repéré une concentration de créatures sur cet étage. Disperse-la.",
    farming: true,
    objectives: [
      { type: "kill", monsterId: null, amount: 0, progress: 0, completed: false }
    ],
    reward: { xp: 420, gold: 240, item: "essence_tenebres" },
    keepRewardItem: true,
    location: "Boucle Ténébreuse (Kingsley, étage 18)",
    minFloor: 11,
    repeatable: { everyLevels: 1 },
    rollOnAccept: { kind: "kill", minFloor: 11, maxFloor: 99, minAmount: 3, maxAmount: 6, spawnBonus: 2 }
  },
  {
    id: "chasse_bill_boucle",
    title: "Nettoyage de galerie",
    giver: "Bill Weasley",
    desc: "Une meute s'est reformée dans les galeries. Brise-la avant qu'elle n'enfle.",
    farming: true,
    objectives: [
      { type: "kill", monsterId: null, amount: 0, progress: 0, completed: false }
    ],
    reward: { xp: 450, gold: 250, item: "page_grimoire" },
    keepRewardItem: true,
    location: "Boucle Ténébreuse (Bill, étage 19)",
    minFloor: 11,
    repeatable: { everyLevels: 1 },
    rollOnAccept: { kind: "kill", minFloor: 11, maxFloor: 99, minAmount: 3, maxAmount: 6, spawnBonus: 2 }
  },
  {
    id: "chasse_sirius_boucle",
    title: "Apaiser le précipice",
    giver: "Esprit de Sirius Black",
    desc: "Des présences hostiles s'attardent près du Voile. Renvoie-les au silence.",
    farming: true,
    objectives: [
      { type: "kill", monsterId: null, amount: 0, progress: 0, completed: false }
    ],
    reward: { xp: 480, gold: 260, item: "essence_tenebres" },
    keepRewardItem: true,
    location: "Boucle Ténébreuse (Sirius, étage 20)",
    minFloor: 11,
    repeatable: { everyLevels: 1 },
    rollOnAccept: { kind: "kill", minFloor: 11, maxFloor: 99, minAmount: 3, maxAmount: 6, spawnBonus: 2 }
  },
  // FOUILLE — récupération de butin en fouillant les recoins (type `search`).
  {
    id: "recup_marchand_boucle",
    title: "Récupération sur le terrain",
    giver: "Marchand Clandestin",
    desc: "Le château regorge de butin oublié. Fouille les recoins de cet étage et le Marchand t'en récompensera.",
    objectives: [
      { type: "search", amount: 5, progress: 0, completed: false }
    ],
    reward: { xp: 280, gold: 200, item: "page_grimoire" },
    repeatableReward: { xp: 220, gold: 240 },
    location: "Boucle Ténébreuse (Marchand, étage 18)",
    minFloor: 11,
    repeatable: { everyLevels: 1 }
  },
  // COLLECTE — ravitaillement des vendeurs (herbes / matériaux).
  {
    id: "collecte_apothicaire_boucle",
    title: "Réassort d'herbes interdites",
    giver: "Apothicaire Ténébreux",
    desc: "L'Apothicaire manque de plantes pour ses distillations. Rapporte-lui 6 herbes de ta besace.",
    objectives: [
      { type: "herb", amount: 6, progress: 0, completed: false }
    ],
    reward: { xp: 260, gold: 220, item: "potion_l_sp" },
    repeatableReward: { xp: 200, gold: 260 },
    location: "Boucle Ténébreuse (Apothicaire, étage 19)",
    minFloor: 11,
    repeatable: { everyLevels: 1 }
  },
  {
    id: "collecte_forgeron_boucle",
    title: "Approvisionnement de la forge",
    giver: "Forgeron Ténébreux",
    desc: "La forge dévore l'Essence des Ténèbres. Apporte-en 3 et le Forgeron paiera grassement ton surplus.",
    objectives: [
      { type: "item", itemId: "essence_tenebres", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 320, gold: 560 },
    repeatableReward: { xp: 240, gold: 520 },
    location: "Boucle Ténébreuse (Forgeron, étage 20)",
    minFloor: 11,
    repeatable: { everyLevels: 2 }
  },
  // BOSS — prime de boss du Gardien (cible garantie via spawnOnAccept).
  {
    id: "prime_boss_gardien",
    title: "Prime du Dragon Ancestral",
    giver: "Gardien de la Boucle",
    desc: "Le Magyar Ancestral se reforme au cœur de la Boucle. Terrasse-le — peu y survivent, mais la récompense est à la hauteur du péril.",
    objectives: [
      { type: "kill", monsterId: "magyar_ancestral", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 700, gold: 600, item: "essence_primordiale" },
    repeatableReward: { xp: 500, gold: 500, item: "essence_primordiale" },
    location: "Boucle Ténébreuse (Gardien, étage 11+)",
    minFloor: 11,
    repeatable: { everyLevels: 3 },
    spawnOnAccept: { targetMonsterId: "magyar_ancestral", extraRandomCount: 0 }
  },
  // ── Boucle Ténébreuse — PNJ lore recyclés (suivi 2) ──────────────
  // Rallume Pomfresh (f12), Ollivander (f13), Manon+Lockhart (f13) en Boucle.
  // FABRICATION — Pomfresh demande des potions concoctées (craft-only).
  {
    id: "fabrique_pomfresh",
    title: "Réserves de l'infirmerie",
    giver: "Madame Pomfresh",
    desc: "L'infirmerie de la Boucle ne désemplit pas. Concocte 3 Potions de Soin Mineure au chaudron et rapporte-les à Madame Pomfresh.",
    objectives: [
      { type: "item", itemId: "potion_soin_mineure", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 280, gold: 200, item: "eclat_vitalite" },
    repeatableReward: { xp: 220, gold: 240 },
    location: "Boucle Ténébreuse (Pomfresh, étage 12)",
    minFloor: 11,
    repeatable: { everyLevels: 1 }
  },
  // FOUILLE — Ollivander cherche un bois rare ; récompense une baguette épique.
  {
    id: "bois_ollivander_boucle",
    title: "Le bois qui chuchote",
    giver: "Mr Ollivander",
    desc: "Ollivander a senti, quelque part dans la Boucle, un if des Profondeurs qui n'attend qu'un sorcier. Fouille 4 recoins pour en retrouver une branche — il t'en taillera une baguette.",
    objectives: [
      { type: "search", amount: 4, progress: 0, completed: false }
    ],
    reward: { xp: 360, gold: 200, item: "baguette_if_boucle" },
    repeatableReward: { xp: 240, gold: 280 },
    location: "Boucle Ténébreuse (Ollivander, étage 13)",
    minFloor: 11,
    repeatable: { everyLevels: 2 }
  },
  // RÉDEMPTION Lockhart×Manon — chaîne one-shot : Manon confie son histoire,
  // Lockhart en fait un mémoire véridique (cf. AskUserQuestion « rédemption »).
  {
    id: "manon_confier",
    title: "Les souvenirs d'Élara",
    giver: "Manon",
    desc: "Dans la Boucle, Manon veut enfin que l'histoire de sa mère soit dite — vraiment. Retrouve 3 souvenirs épars d'Élara en fouillant les recoins, et elle les mettra en mots pour toi.",
    objectives: [
      { type: "search", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 300, gold: 120, item: "recit_manon" },
    location: "Boucle Ténébreuse (Manon, étage 13)",
    minFloor: 11
  },
  {
    id: "memoire_lockhart",
    title: "Un mémoire, pour une fois, véridique",
    giver: "Gilderoy Lockhart",
    desc: "Lockhart, lassé de ses fables, veut écrire une histoire vraie : celle de Manon. Apporte-lui le récit qu'elle t'a confié — il y mettra son nom, mais, pour une fois, pas ses mensonges.",
    prereq: "manon_confier",
    objectives: [
      { type: "item", itemId: "recit_manon", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 400, gold: 300, item: "livre_lumos_solem", stats: { lck: 2 } },
    location: "Boucle Ténébreuse (Lockhart, étage 13)",
    minFloor: 11
  },
  // ── Boucle — derniers PNJ lore + arcs vivants (suivi 3) ──────────
  // CHASSE — Scamander : variante Boucle de la chasse magizoologiste (la fixe
  // est capée maxFloor:8). keepRewardItem → drop matériau à chaque cycle.
  {
    id: "chasse_magizoologiste_boucle",
    title: "Recensement des Profondeurs",
    giver: "Newton Scamander",
    desc: "Scamander veut recenser les créatures que la Boucle ramène. Élimine celles qu'il a repérées sur cet étage.",
    farming: true,
    objectives: [
      { type: "kill", monsterId: null, amount: 0, progress: 0, completed: false }
    ],
    reward: { xp: 400, gold: 220, item: "page_grimoire" },
    keepRewardItem: true,
    location: "Boucle Ténébreuse (Scamander, étage 12)",
    minFloor: 11,
    repeatable: { everyLevels: 1 },
    rollOnAccept: { kind: "kill", minFloor: 11, maxFloor: 99, minAmount: 4, maxAmount: 7, spawnBonus: 1 }
  },
  // CHASSE — Mimi : apaiser les esprits qui hantent ses canalisations.
  {
    id: "mimi_esprits",
    title: "Les esprits des canalisations",
    giver: "Mimi Geignarde",
    desc: "Mimi n'est plus seule à hanter ces lieux — d'autres esprits, plus méchants, remontent par les tuyaux. Détruis 2 Spectres Maudits pour qu'elle pleure en paix.",
    objectives: [
      { type: "kill", monsterId: "spectre_maudit", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 320, gold: 180, item: "perle_mimi" },
    repeatableReward: { xp: 240, gold: 260 },
    location: "Boucle Ténébreuse (Mimi, étage 12)",
    minFloor: 11,
    repeatable: { everyLevels: 2 },
    spawnOnAccept: { targetMonsterId: "spectre_maudit", extraRandomCount: 0 }
  },
  // CHASSE — Sir Patrick : chevaucher la Chasse Sans Tête (morts-vivants).
  {
    id: "chasse_sans_tete_boucle",
    title: "La Chevauchée Sans Tête",
    giver: "Sir Patrick Delaney-Podmore",
    desc: "La Chasse Sans Tête galope encore dans la Boucle ! Sir Patrick t'invite à la chevauchée : terrasse 3 Chevaliers Fantômes et tu seras des nôtres.",
    objectives: [
      { type: "kill", monsterId: "chevalier_fantome", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 360, gold: 200, item: "cor_chasse" },
    repeatableReward: { xp: 260, gold: 280 },
    location: "Boucle Ténébreuse (Sir Patrick, étage 16)",
    minFloor: 11,
    repeatable: { everyLevels: 2 },
    spawnOnAccept: { targetMonsterId: "chevalier_fantome", extraRandomCount: 1 }
  },
  // COLLECTE — Guipure : soie d'Acromantule (kill) → confection d'une cape.
  {
    id: "confection_guipure",
    title: "Soie pour une cape d'exception",
    giver: "Madame Guipure",
    desc: "Madame Guipure ne tisse que la meilleure soie d'Acromantule. Abats 3 Jeunes Acromantules pour qu'elle t'en confectionne une cape digne de la Boucle.",
    objectives: [
      { type: "kill", monsterId: "acromantula_jeune", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 340, gold: 180, item: "cape_soie_acromantule" },
    repeatableReward: { xp: 260, gold: 300 },
    location: "Boucle Ténébreuse (Guipure, étage 15)",
    minFloor: 11,
    repeatable: { everyLevels: 2 },
    spawnOnAccept: { targetMonsterId: "acromantula_jeune", extraRandomCount: 1 }
  },
  // RÉDEMPTION (suite) — Lockhart répétable : récolter des anecdotes (fouille).
  {
    id: "chroniques_lockhart",
    title: "Chroniques de la Boucle",
    giver: "Gilderoy Lockhart",
    desc: "Galvanisé par sa première histoire vraie, Lockhart veut chroniquer la Boucle entière. Fouille 4 recoins pour lui dénicher de quoi remplir un nouveau chapitre.",
    objectives: [
      { type: "search", amount: 4, progress: 0, completed: false }
    ],
    reward: { xp: 320, gold: 220, item: "plume_lockhart" },
    repeatableReward: { xp: 240, gold: 300 },
    location: "Boucle Ténébreuse (Lockhart, étage 13)",
    minFloor: 11,
    repeatable: { everyLevels: 1 }
  },
  // Manon — visite répétable (elle redoute la solitude de la Boucle).
  {
    id: "manon_compagnie",
    title: "Ne pas rester seule",
    giver: "Manon",
    desc: "La Boucle est longue, et Manon redoute le silence. Disperse 2 Spectres Maudits qui rôdent près de sa salle, puis reviens lui tenir compagnie.",
    objectives: [
      { type: "kill", monsterId: "spectre_maudit", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 260, gold: 200 },
    repeatableReward: { xp: 220, gold: 220 },
    location: "Boucle Ténébreuse (Manon, étage 13)",
    minFloor: 11,
    repeatable: { everyLevels: 2 },
    spawnOnAccept: { targetMonsterId: "spectre_maudit", extraRandomCount: 0 }
  },
  // ── Manon, fille cachée de Lupin — pseudo-quête en deux volets ──
  // Données et rendues par Manon (PNJ étage 3, cf. npcs.js). Le volet 2
  // (`prereq`) ne s'ouvre qu'après remise du volet 1 — chaîne classique.
  // La révélation progressive de l'histoire passe par `dialoguesByQuest`
  // de Manon. Cf. .claude/plans/Manon.md.
  {
    id: "manon_secret",
    title: "L'inconnue du troisième étage",
    giver: "Manon",
    desc: "Manon, cachée à l'étage 3, cherche son père. Descends jusqu'à la classe de Défense (étage 4) et reviens lui confirmer que le professeur Lupin existe vraiment.",
    objectives: [
      { type: "floor", floor: 4, progress: 0, amount: 1, completed: false }
    ],
    reward: { xp: 90, gold: 30 },
    location: "Étage 3 — salles de classe désertes"
  },
  {
    id: "manon_pardon",
    title: "Ce que la lune a laissé",
    giver: "Manon",
    desc: "Manon a trouvé le courage d'affronter Lupin. Rapporte-lui un Chocolat aux Sorciers — le geste qu'il offre à tous les élèves, sauf à elle.",
    prereq: "manon_secret",
    objectives: [
      { type: "item", itemId: "choco_sorcier", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 260, gold: 120, stats: { hp: 12, lck: 2, agi: 1 } },
    location: "Étage 3 — salles de classe désertes"
  },
  // ── Manon, Acte II — le grimoire de givre d'Élara ──────────
  // Suite de `manon_pardon`. Volet 1 (`manon_revelio`) enseigne le sort
  // Revelio ; volet 2 (`manon_grimoire`) collecte les 5 pages dispersées.
  // Cf. .claude/plans/manon-grimoire-pages.md.
  {
    id: "manon_revelio",
    title: "Le vrai du faux",
    giver: "Manon",
    desc: "Manon a trouvé le grimoire déchiré de sa mère. Pour accorder le charme Revelio, rapporte-lui la trace d'une créature de froid : terrasse un Strangulot dans les douves.",
    prereq: "manon_pardon",
    objectives: [
      { type: "kill", monsterId: "strangulot", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 200, gold: 80, spell: "Revelio" },
    location: "Étage 3 — salles de classe désertes"
  },
  {
    id: "manon_grimoire",
    title: "Les pages d'Élara",
    giver: "Manon",
    desc: "Élara a dispersé les pages de son grimoire de givre dans le château — étages 2, 3, 5, 7 et 9. Lance Revelio pour les dévoiler sur la carte, fouille les salles pour les ramasser, puis rends les 5 pages à Manon.",
    prereq: "manon_revelio",
    objectives: [
      { type: "pages", amount: 5, progress: 0, completed: false }
    ],
    reward: { xp: 420, gold: 180, item: "livre_glacius_tempete" },
    location: "Étage 3 — salles de classe désertes"
  },
  // ── Manon, Acte III — les feuillets clairs d'Élara ─────────
  // Easter egg lumineux : déclenché par rumeurs (Manon idleRandom + PNJ
  // lore), ouvert IMPLICITEMENT quand le joueur trouve le 1ᵉʳ feuillet
  // (acceptQuest depuis _tryCollectPage). `implicitAccept` l'exclut de
  // l'amorce `availableQuests` (cf. main.js) → aucun bouton « Accepter »
  // chez Manon tant que l'egg n'est pas mordu. Remise à l'établi
  // (fuseAct3). Récompense : passif « Hiver Clair » posé par fuseAct3 (la
  // vraie récompense est narrative). Cf. .claude/plans/manon-grimoire-easter-egg.md.
  {
    id: "manon_acte3",
    title: "Les feuillets clairs d'Élara",
    giver: "Manon",
    desc: "Élara avait gardé à part trois feuillets — non des secrets, mais de la joie : des sorts de givre heureux semés dans le château pour sa fille. Dévoile-les avec Revelio (étages 2, 6, 9), réunis-les, puis rapporte-les à Manon.",
    prereq: "manon_grimoire",
    implicitAccept: true,
    objectives: [
      { type: "pages", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 500, gold: 220 },
    location: "Étage 3 — auprès de Manon"
  },
  // ── Manon, capstone — « Clair de Lune » (lien PÈRE, Lupin) ──
  // Vraie dernière quête de l'arc de Manon : après la mère (Actes II-III,
  // givre), l'arc culmine enfin sur le père. Gated par `manon_acte3`.
  // L'élément du père = la LUMIÈRE (Lupin enseigne le Patronus, « la Lumière
  // contre le Désespoir »). Récompense = Livre de Maîtrise Lumière (buff
  // permanent), jamais un sort déjà acquis. Cible (Détraqueur) toujours
  // disponible via _ensureActiveKillQuestTargets. Cf. quest-system-revision.md §4.
  {
    id: "manon_clair_de_lune",
    title: "Clair de Lune",
    giver: "Manon",
    desc: "Manon veut comprendre la part de son père en elle — non la malédiction de la lune, mais la lumière qu'il oppose au désespoir. Disperse deux Détraqueurs en son nom, et reviens : elle a quelque chose à t'offrir, de la part de Lupin.",
    prereq: "manon_acte3",
    objectives: [
      { type: "kill", monsterId: "detraqueur", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 560, gold: 240, item: "livre_lumiere_patronus", stats: { mag: 1, lck: 1 } },
    location: "Étage 3 — auprès de Manon"
  },
  // ── Quêtes secondaires de LIENS (révision quêtes §6) ───────
  // Tissent la constellation Manon / Lupin / Élara avec d'autres PNJ.
  // Cibles/items 100 % existants (cohérence référentielle) et accessibles
  // (cibles kill garanties par _ensureActiveKillQuestTargets).
  // 1) Sirius × Lupin × Manon — Sirius, dernier ami de Remus, sait pour la
  //    fille cachée et porte le fardeau du silence de son ami.
  {
    id: "fardeau_de_sirius",
    title: "Le fardeau du dernier ami",
    giver: "Esprit de Sirius Black",
    desc: "Sirius fut le dernier ami de Remus — et l'un des rares à savoir qu'il avait une fille. « Lupin n'a jamais su affronter le désespoir en face : ni les Détraqueurs, ni l'idée de regarder son enfant. Fais-le pour lui, filleul. Disperse deux Détraqueurs ici, et qu'un peu de sa lâcheté s'apaise avec eux. »",
    objectives: [
      { type: "kill", monsterId: "detraqueur", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 420, gold: 200, item: "larme_phenix_mineure", stats: { lck: 1 } },
    location: "Étage 10 — antichambre du Voile"
  },
  // 2) Pomfresh × Élara — l'infirmière reconnaît la magie de givre d'Élara
  //    dans une vieille fiche de soin et veut en sauver la recette.
  {
    id: "derniere_recette_elara",
    title: "La dernière recette d'Élara",
    giver: "Madame Pomfresh",
    desc: "Pomfresh retourne une fiche de soin jaunie : « Cette écriture… Élara. Elle soignait avec le froid, cette femme — un givre qui apaise au lieu de mordre. Sa fille hante les étages, paraît-il. Rapporte-moi deux Cristaux de Givre : je veux refaire sa recette, pour qu'il reste d'elle autre chose qu'un mensonge. »",
    minFloor: 11,
    objectives: [
      { type: "item", itemId: "cristal_givre", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 280, gold: 160, item: "potion_l" },
    location: "Infirmerie de la Boucle (étage 12+)"
  },
  // 3) Bill × Élara — le briseur de sortilèges reconnaît, sur les spectres
  //    de givre, la même magie de dissimulation que celle du grimoire d'Élara.
  {
    id: "givre_ancien",
    title: "Le givre qui cache",
    giver: "Bill Weasley",
    desc: "Bill passe la main au-dessus d'un spectre gelé : « Briseur de sortilèges, c'est mon métier — et ce givre-là, je le connais. La même magie de dissimulation que sur ces pages qu'on récolte plus haut, celles d'une certaine Élara. Brise-m'en un, le plus ancien : je veux lire ce qu'il protège. »",
    objectives: [
      { type: "kill", monsterId: "spectre_givre", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 360, gold: 180, item: "page_grimoire", stats: { int: 1 } },
    location: "Étage 9 — galeries gelées"
  },
  // 4) Manon × Élara × Lupin — clôture épistolaire du triangle (P6a,
  //    final-polish §1.2). LIVRAISON inter-PNJ : donnée par Manon
  //    (grantOnAccept → la lettre entre au sac, objectif rempli d'emblée),
  //    remise chez LUPIN uniquement (questsTurnedIn du destinataire —
  //    Manon ne la clôt pas). L'épilogue est porté par le
  //    dialoguesByQuest.questReady de Lupin.
  {
    id: "lettre_jamais_envoyee",
    title: "La lettre jamais envoyée",
    giver: "Manon",
    desc: "Au fond de la malle d'Élara restait une dernière lettre — adressée à Remus Lupin, cachetée, jamais envoyée. Manon n'a plus la force de descendre cet escalier une seconde fois : porte la lettre à son père, à l'étage de la Défense. Il doit lire la fin.",
    prereq: "manon_clair_de_lune",
    grantOnAccept: "lettre_elara",
    objectives: [
      { type: "item", itemId: "lettre_elara", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 380, gold: 180 },
    location: "Étage 4 — classe de Défense (remise à Lupin)"
  },
  // 5) Lupin × Manon — le père assume sa condition devant sa fille (P6a).
  //    L'aconit (herbe tier 3, besace) se cueille dans les jardins d'herbes
  //    des étages profonds ou s'achète à l'Apothicaire. NB : le plan notait
  //    « minFloor 5 », écarté — minFloor gate l'OFFRE par étage courant et
  //    Lupin est placé étage 4 : la quête serait devenue inoffrable hors
  //    Boucle. Le prereq manon_pardon suffit comme gate de progression.
  {
    id: "aconit_de_la_meute",
    title: "L'aconit de la meute",
    giver: "Professeur Lupin",
    desc: "Lupin ne cache plus rien : « Ma fille sait ce que je suis. Alors cette potion, je la brasserai devant elle, plus jamais dans une cave. Rapporte-moi trois brins d'aconit — c'est amer, c'est laid, et c'est ce qui me garde homme. Elle doit voir ça aussi. »",
    prereq: "manon_pardon",
    objectives: [
      { type: "herb", itemId: "herbe_aconit", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 300, gold: 150, item: "potion_tue_loup" },
    location: "Étage 4 — classe de Défense"
  },
  // ── Easter egg « La Chasse Sans Tête » (comique) ───────────
  // Hôte : Sir Patrick Delaney-Podmore (PNJ déterministe ét. 6, ghost).
  // Objectif : terrasser 2 Chevaliers Fantômes restés casqués. Récompense
  // purement cosmétique (flag `headlessHuntMember` posé par completeQuest)
  // + xp/gold — PAS de levier de combat. Offre classique : aucune amorce
  // tant que le joueur n'a pas trouvé Sir Patrick en profondeur.
  // Cf. .claude/plans/headless-hunt-easter-egg.md.
  {
    id: "chasse_sans_tete",
    title: "La Chasse Sans Tête",
    giver: "Sir Patrick Delaney-Podmore",
    desc: "Sir Patrick doute qu'un fantôme à la tête mal tranchée mérite sa Chasse. Prouve qu'un revenant sait encore chasser : terrasse 2 Chevaliers Fantômes restés casqués et rapporte leurs heaumes en guise de trophées.",
    objectives: [
      { type: "kill", monsterId: "chevalier_fantome", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 260, gold: 120 },
    location: "Étage 6 — galeries profondes"
  },
  // ── Phase 3b : quêtes secondaires PNJ → équipement étendu ──
  {
    id: "bottines_ollivander",
    title: "Le cuir volé d'Ollivander",
    giver: "Mr Ollivander",
    desc: "Un Hippogriffe en colère a éventré une caisse de cuir de dragon que je gardais pour un client. Élimine la bête : ses serres trahissent les bottes qu'elle a piétinées.",
    objectives: [
      { type: "kill", monsterId: "hippogriffe_courroux", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 220, gold: 80, item: "bottes_dragon" },
    location: "Atelier d'Ollivander (étage 3)"
  },
  {
    id: "fil_acromantule",
    title: "Le fil de l'Acromantule",
    giver: "Madame Guipure",
    desc: "Pour broder une cape qui résiste aux sortilèges, il me faut trois fils tirés d'Acromantules vivantes. Tue trois jeunes Acromantules et récupère-les pour moi.",
    objectives: [
      { type: "kill", monsterId: "acromantula_jeune", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 260, gold: 90, item: "cape_voyageur" },
    location: "Atelier de couture (étage 5)"
  },
  {
    id: "anneau_dumbledore",
    title: "L'Anneau de la Résurrection",
    giver: "Portrait d'Albus Dumbledore",
    desc: "Une ombre rôde dans les couloirs — un fragment d'âme qui hante un vieil anneau de famille. Vaincs cette ombre, et l'anneau te reviendra.",
    objectives: [
      { type: "kill", monsterId: "ombre_quirrell", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 320, gold: 120, item: "anneau_resurrection" },
    location: "Galerie des portraits (étage 6)"
  },
  // ── Épreuve de la Lumière Éternelle — 2ᵉ quête de grimoire ──────
  // Suite de `anneau_dumbledore`. Épreuve combinée en 3 temps :
  // collecte (item) → énigme (riddle) → boss (kill).
  // Cf. .claude/plans/dumbledore-lux-aeterna.md.
  {
    id: "dumbledore_lumiere",
    title: "L'Épreuve de la Lumière Éternelle",
    giver: "Portrait d'Albus Dumbledore",
    desc: "Le portrait de Dumbledore garde le grimoire scellé de Lux Aeterna. Pour le mériter : réunis 3 Éclats de Lumière sur les morts-vivants, affronte les énigmes du portrait, puis défais le Bibliothécaire d'Ombre qui garde le livre.",
    prereq: "anneau_dumbledore",
    objectives: [
      { type: "item",   itemId: "eclat_lumiere",          amount: 3, progress: 0, completed: false },
      { type: "riddle",                                   amount: 3, progress: 0, completed: false },
      { type: "kill",   monsterId: "bibliothecaire_ombre", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 600, gold: 250, item: "livre_lux_aeterna" },
    location: "Galerie des portraits (étage 6)"
  },
  {
    id: "bouclier_phenix",
    title: "Le Bouclier du Phénix",
    giver: "Fumseck",
    desc: "Cinq Mangemorts profanent les couloirs du château. Élimine-les, et je te confierai une de mes larmes — un baume qui te soignera dans la durée.",
    objectives: [
      { type: "kill", monsterId: "mangemort", amount: 5, progress: 0, completed: false }
    ],
    reward: { xp: 380, gold: 150, item: "larmes_phenix" },
    location: "Volière de Fumseck (étage 7)"
  },
  // ── Quêtes répétables de farming (cf. .claude/plans/farming-quests.md) ──
  // Cible (monsterId / itemId / amount) tirée à l'acceptation par
  // `_rollFarmingTarget()`. Le template ci-dessous est inerte ; le clone
  // créé par `acceptQuest()` reçoit les valeurs dynamiques + un `_dynamicDesc`.
  {
    id: "chasse_magizoologiste",
    title: "Chasse du Magizoologiste",
    giver: "Newton Scamander",
    desc: "Élimine les créatures que Scamander a repérées dans cet étage.",
    farming: true,
    objectives: [
      { type: "kill", monsterId: null, amount: 0, progress: 0, completed: false }
    ],
    reward: { xp: 230, gold: 75 },
    location: "Étages 3 à 8",
    repeatable: { everyLevels: 2 },
    rollOnAccept: { kind: "kill", minFloor: 3, maxFloor: 8, minAmount: 4, maxAmount: 8, spawnBonus: 1 }
  },
  {
    id: "course_hagrid",
    title: "Course pour Hagrid",
    giver: "Hagrid",
    desc: "Rapporte les ingrédients qu'Hagrid t'a demandés.",
    farming: true,
    objectives: [
      { type: "item", itemId: null, amount: 0, progress: 0, completed: false }
    ],
    reward: { xp: 190, gold: 65 },
    location: "Étages 4 à 9",
    repeatable: { everyLevels: 3 },
    rollOnAccept: { kind: "item", pool: ["mandragore", "choco_sorcier", "potion_s", "potion_m"], minAmount: 3, maxAmount: 5 }
  },
  // ── Quêtes de Maison (Maisons 2.0 §C) ──────────────────────────────
  // Débloquées au franchissement du palier 12 (Maître Or, 8000 pts) par
  // `unlockHouseQuest(chosenHouse)`. Données par le Chef de Maison
  // correspondant ; à la remise, la pièce #4 du set de Maison entre dans
  // `pendingHouseRewards` (réception cérémonielle au prochain dialogue,
  // pas un drop direct). Cf. .claude/plans/houses-2.0.md §B/D.
  {
    id: "quest_set_gryff",
    title: "L'épreuve du Lion",
    giver: "Professeur McGonagall",
    desc: "Une Chimère de Poudlard rôde dans les profondeurs. Abats-en trois — leurs trois têtes cachent toujours un cœur de lion. Reviens me voir : tu auras gagné ta dernière relique.",
    objectives: [
      { type: "kill", monsterId: "chimere", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 600, gold: 300, houseSetReward: "coeur_lion" },
    location: "Tour de Gryffondor (étage 5)",
    houseSetQuest: true,
    house: "Gryffondor"
  },
  {
    id: "quest_set_slyth",
    title: "Le souffle du Serpent",
    giver: "Professeur Rogue",
    desc: "Trois Basilics Mineurs hantent les cachots oubliés. Élimine-les en silence et rapporte-moi leur preuve — la couronne du grand Salazar t'attendra.",
    objectives: [
      { type: "kill", monsterId: "basilic", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 600, gold: 300, houseSetReward: "couronne_basilic" },
    location: "Cachots (étage 4)",
    houseSetQuest: true,
    house: "Serpentard"
  },
  {
    id: "quest_set_raven",
    title: "Le savoir de l'Aigle",
    giver: "Professeur Flitwick",
    desc: "Hécate la Maudisseuse dévore les grimoires interdits. Anéantis trois de ses avatars pour préserver ce que nous savons — le savoir de l'Aigle te récompensera.",
    objectives: [
      { type: "kill", monsterId: "hecate_sorciere", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 600, gold: 300, houseSetReward: "anneau_savoir" },
    location: "Salle de Sortilèges (étage 6)",
    houseSetQuest: true,
    house: "Serdaigle"
  },
  {
    id: "quest_set_pouf",
    title: "Le serment du Blaireau",
    giver: "Professeur Chourave",
    desc: "Trois Trolls des Cavernes terrorisent les passages du château. Tiens bon, abats-les — la patience et la loyauté seront récompensées.",
    objectives: [
      { type: "kill", monsterId: "troll_grotte", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 600, gold: 300, houseSetReward: "medaillon_helga" },
    location: "Serres de Botanique (étage 3)",
    houseSetQuest: true,
    house: "Poufsouffle"
  },
  // ── Quêtes de don de Maison (palier 17 « Mythe » — gold-sink endgame) ──
  // Débloquées par `unlockHouseMytheQuest(chosenHouse)` au franchissement
  // du palier Mythe. Objectif `donate` : faire don de 3000 Gallions à la
  // Maison via le Chef de Maison. L'or est consommé à la remise.
  {
    id: "quest_don_gryff",
    title: "Le tribut du Lion",
    giver: "Professeur McGonagall",
    desc: "Gryffondor finance ses œuvres et ses jeunes recrues. Fais don de 3000 Gallions à ta Maison — la générosité est une autre forme de courage.",
    objectives: [
      { type: "donate", amount: 3000, progress: 0, completed: false }
    ],
    reward: { xp: 1200, item: "felix" },
    location: "Tour de Gryffondor (étage 5)",
    houseMytheQuest: true,
    house: "Gryffondor"
  },
  {
    id: "quest_don_slyth",
    title: "Le trésor du Serpent",
    giver: "Professeur Rogue",
    desc: "Serpentard sait que l'influence a un prix. Verse 3000 Gallions au trésor de ta Maison — l'ambition se nourrit aussi de moyens.",
    objectives: [
      { type: "donate", amount: 3000, progress: 0, completed: false }
    ],
    reward: { xp: 1200, item: "felix" },
    location: "Cachots (étage 4)",
    houseMytheQuest: true,
    house: "Serpentard"
  },
  {
    id: "quest_don_raven",
    title: "Le legs de l'Aigle",
    giver: "Professeur Flitwick",
    desc: "Le savoir se protège, et protéger coûte cher. Offre 3000 Gallions à Serdaigle pour préserver ses grimoires et ses esprits.",
    objectives: [
      { type: "donate", amount: 3000, progress: 0, completed: false }
    ],
    reward: { xp: 1200, item: "felix" },
    location: "Salle de Sortilèges (étage 6)",
    houseMytheQuest: true,
    house: "Serdaigle"
  },
  {
    id: "quest_don_pouf",
    title: "Le partage du Blaireau",
    giver: "Professeur Chourave",
    desc: "Poufsouffle prend soin des siens, sans exception. Fais don de 3000 Gallions — la loyauté se mesure aussi au partage.",
    objectives: [
      { type: "donate", amount: 3000, progress: 0, completed: false }
    ],
    reward: { xp: 1200, item: "felix" },
    location: "Serres de Botanique (étage 3)",
    houseMytheQuest: true,
    house: "Poufsouffle"
  },

  // ── Quêtes Signature de Maison (Actes I-III) ─────────────────
  // Gatées par `chosenHouse` + l'étage (unlockHouseSignatureQuest, appelée
  // au franchissement de l'étage déclencheur via checkFloorQuests), distinctes
  // du set (tier 12) et du don (Mythe). Une seule active par partie ; remise
  // cérémonielle de la relique (houseSetReward → pendingHouseRewards). À la
  // remise, completeQuest pose le flag <house>SignatureDone (levier one-shot
  // avant Voldemort). Cf. docs/histoire/08 §8.5.
  {
    id: "quest_signature_gryff",
    title: "L'Étendard de Godric",
    giver: "Chevalier Fantôme",
    desc: "Trois brasiers du courage se sont éteints, étouffés par la peur que les Épouvantards font lever. Rallume-les en les dissipant, avance jusqu'à la Tour sans jamais reculer, puis reprends l'Étendard de Godric au Porte-Étendard Déchu — la bannière qui ne s'incline jamais. Un meneur passe devant pour que les autres passent.",
    objectives: [
      // 1. Rallumer les 3 brasiers du courage = dissiper la peur (Épouvantards).
      { type: "kill",  monsterId: "boggart", amount: 3, progress: 0, completed: false },
      // 2. Tenir bon et avancer jusqu'à la Tour sans reculer (floor-proxy).
      { type: "floor", floor: 5, amount: 1, progress: 0, completed: false },
      // 3. Climax — reprendre l'Étendard au Chevalier Fantôme.
      { type: "kill",  monsterId: "chevalier_fantome", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 700, gold: 320, houseSetReward: "banniere_godric", spell: "Cœur de Lion", item: "elixir_lion_ardent", recipes: ["brew_resilience_maison"] },
    location: "Tour de Gryffondor (étage 5) — cible en Acte III",
    houseSignatureQuest: true,
    house: "Gryffondor"
  },
  {
    id: "quest_signature_slyth",
    title: "Le Pacte des Cachots",
    giver: "Écho de Salazar",
    desc: "Sous les cachots, l'écho de Salazar murmure — scellé avec la corruption qu'il a aidé à enfermer. Descends ouvrir son passage secret, franchis les serpents qui le gardent, puis arrache au Basilic le secret des Fondateurs. Alors seulement tu choisiras : sceller le Pacte, ou défier l'écho.",
    objectives: [
      // 1. Ouvrir le passage secret de Salazar = descendre dans les cachots.
      { type: "floor", floor: 4, amount: 1, progress: 0, completed: false },
      // 2. Franchir les serpents gardiens du passage.
      { type: "kill",  monsterId: "serpent_cachot", amount: 2, progress: 0, completed: false },
      // 3. Climax — le secret des Fondateurs gardé par le Basilic.
      //    Le choix gris (Pacte/Défiance) se joue à la remise (turnInSlythSignature).
      { type: "kill",  monsterId: "basilic", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 720, gold: 300, houseSetReward: "langue_de_plomb", spell: "Pacte du Serpent", item: "venin_serpent", recipes: ["brew_resilience_maison"] },
    location: "Cachots de Serpentard (étage 4) — cible en Acte II/III",
    houseSignatureQuest: true,
    house: "Serpentard"
  },
  {
    id: "quest_signature_raven",
    title: "Le Codex de Rowena",
    giver: "Professeur Flitwick",
    desc: "Le Codex de Rowena — le traité perdu décrivant ce que la Clé scellait vraiment — a été dispersé. Force les trois portraits-gardiens qui en dissimulent les premiers feuillets, descends jusqu'à la Salle des Aigles, puis arrache au Gardien du Portail les derniers. Comprendre, c'est désamorcer : recompose le Codex et révèle la faille.",
    objectives: [
      // 1. Forcer les 3 portraits-gardiens dissimulant les premiers feuillets.
      { type: "kill",  monsterId: "portrait_hostile", amount: 3, progress: 0, completed: false },
      // 2. Gagner la Salle des Aigles, en profondeur (floor-proxy).
      { type: "floor", floor: 6, amount: 1, progress: 0, completed: false },
      // 3. Climax — le Gardien du Portail veille sur les derniers feuillets.
      { type: "kill",  monsterId: "gardien_portail", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 720, gold: 300, houseSetReward: "codex_rowena_eclat", spell: "Verbe de Rowena", item: "sagesse_aigle", recipes: ["brew_elixir_immunite", "brew_resilience_maison"] },
    location: "Salle des Aigles (étage 6) — cible en Acte III",
    houseSignatureQuest: true,
    house: "Serdaigle"
  },
  {
    id: "quest_signature_pouf",
    title: "Ceux qu'on ne laisse pas derrière",
    giver: "Professeur Chourave",
    desc: "Quand le château bascule, tous regardent vers le bas. Toi, regarde autour : des égarés sont restés coincés. Rassemble des vivres pour les blessés, escorte les égarés en lieu sûr plus bas, puis repousse la vague d'Inferi qui déferle sur le Refuge du Blaireau — que personne ne soit oublié au fond.",
    objectives: [
      // 1. Vivres pour les blessés — jardins de Chourave (besace d'herbes, 08 §8.5).
      { type: "herb",  amount: 2, progress: 0, completed: false },
      // 2. Escorter/ramener les égarés en lieu sûr plus bas (floor-proxy, 08 §8.5).
      { type: "floor", floor: 4, amount: 1, progress: 0, completed: false },
      // 3. Climax — repousser la vague d'Inferi qui menace le Refuge.
      { type: "kill",  monsterId: "inferius", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 700, gold: 320, houseSetReward: "coeur_refuge", spell: "Serment du Blaireau", item: "vigueur_blaireau", recipes: ["brew_baume_patronus", "brew_resilience_maison"] },
    location: "Refuge du Blaireau (étage 3) — vague en Acte II/III",
    houseSignatureQuest: true,
    house: "Poufsouffle"
  }
];
