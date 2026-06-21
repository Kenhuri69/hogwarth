// ============================================================
// DONNÉES — SORTILÈGES (SPELLS + helpers + GRIMOIRE + ARTIFACT_FORMS)
// (extrait de data.js — Lot A P3.3, pur couper-coller)
// ============================================================

const SPELLS = [
  // ── Sorts de base ────────────────────────────────────────────
  { name:"Expelliarmus",      icon:"✨",   desc:"Désarme l'ennemi (réduit son ATK)",  cost:4,  effect:"disarm",  power:3  },
  { name:"Stupefix",          icon:"⚡",   desc:"Étourdit l'ennemi (8 dégâts)",       cost:6,  effect:"stun",    element:"foudre",   power:8  },
  { name:"Episkey",           icon:"💚",   desc:"Soigne légèrement (12 PV)",          cost:5,  effect:"heal",    power:12 },
  { name:"Ferula",            icon:"🩹",   desc:"Bande un allié (+4 PV puis 4 PV/tour × 3 tours)", cost:6,  effect:"support_regen", power:4 },
  { name:"Ferula Maxima",     icon:"🩹",   desc:"Régénère PV + PM des deux alliés (3 tours)", cost:12, effect:"support_regen_aoe", power:1 },
  { name:"Protego",           icon:"🛡️",  desc:"Bouclier magique (durée selon MAG)",  cost:5,  effect:"shield",  power:5, evolvesTo:"Protego Diabolica", evolveCondition:{ type:"apotheose" } },
  { name:"Incendio",          icon:"🔥",   desc:"Flammes magiques (14 dégâts)",       cost:8,  effect:"burn",    element:"feu",      power:14, evolvesTo:"Incendio Majeur", evolveCondition:{ type:"artifact", value:"baton_ancestral" }, synergyArtifacts:["baton_ancestral"] },
  { name:"Accio",             icon:"🌀",   desc:"Tire un objet ennemi (+or)",         cost:6,  effect:"steal",   power:0  },
  // ── Sorts avancés (appris en jeu) ────────────────────────────
  { name:"Wingardium Leviosa",icon:"🌬️",  desc:"Soulève et assomme (10 dégâts)",     cost:7,  effect:"stun",    element:"physique", power:10 },
  { name:"Diffindo",          icon:"✂️",   desc:"Lacère l'ennemi (16 dégâts)",        cost:9,  effect:"burn",    element:"physique", power:16 },
  { name:"Reparo",            icon:"💛",   desc:"Soin renforcé (20 PV)",              cost:7,  effect:"heal",    power:20 },
  { name:"Sectumsempra",      icon:"🩸",   desc:"Sort maudit (24 dégâts)",            cost:14, effect:"burn",    element:"physique", power:24 },
  // ── Sorts intermédiaires ─────────────────────────────────────
  { name:"Lumos Maxima",      icon:"💡",   desc:"Éclat aveuglant (12 dégâts + stun)", cost:8,  effect:"stun",    element:"lumière",  power:12 },
  { name:"Aguamenti",         icon:"💧",   desc:"Jet d'eau (10 dégâts, -2 DEF)",      cost:7,  effect:"burn",    element:"glace",    power:10 },
  { name:"Bombarda",          icon:"💥",   desc:"Explosion : 20 dégâts + éclaboussure sur les autres ennemis", cost:15, effect:"burn",    element:"feu",      power:20, splash:true },
  { name:"Riddikulus",        icon:"🤡",   desc:"Neutralise les créatures du chaos",  cost:6,  effect:"stun",    element:"lumière",  power:8  },
  { name:"Alohomora",         icon:"🔓",   desc:"Vole une grosse bourse de Gallions", cost:5,  effect:"steal",   power:20 },
  { name:"Patronum",          icon:"✨",   desc:"Patronus : 18 dégâts anti-Détraqueur", cost:12, effect:"burn",  element:"lumière",  power:18 },
  // ── Sorts élémentaires (glace / foudre / lumière) ────────────
  { name:"Glacius",           icon:"❄️",   desc:"Givre mordant (14 dégâts, engelures)", cost:8,  effect:"stun",  element:"glace",    power:14, evolvesTo:"Glacius Profond", evolveCondition:{ type:"quest", value:"manon_grimoire" } },
  { name:"Fulgari",           icon:"⚡",   desc:"Foudre canalisée (16 dégâts)",         cost:9,  effect:"stun",  element:"foudre",   power:16 },
  { name:"Lumos Solem",       icon:"☀️",   desc:"Lumière solaire — ravage les morts-vivants", cost:10, effect:"burn", element:"lumière", power:16, bonusVsUndead:1.5, evolvesTo:"Lumos Solem Ardent", evolveCondition:{ type:"floor", value:9 } },
  // ── Sort interdit (débloqué au niveau 9) ─────────────────────
  { name:"Avada...",          icon:"💚✨", desc:"Malédiction mortelle (50 dégâts)",   cost:20, effect:"instant", element:"ténèbres", power:50, locked:true },
  // ── Sort utilitaire — Téléportation (Portus) ─────────────────
  // Achetable cher en boutique (livre_portus). Utilisable en combat
  // (déplace le groupe OU bannit un ennemi non-boss) et hors combat
  // (rejoint un étage déjà visité, case libre random).
  // Coût hors combat : `outOfCombatCost` (38 PM). Voir js/teleport.js.
  { name:"Portus",            icon:"🌀",   desc:"Téléportation tactique (combat ou hors combat)", cost:52, outOfCombatCost:38, effect:"teleport", power:0 },
  // ── Sort utilitaire — Révélation (Revelio) ───────────────────
  // Enseigné par la quête « Le vrai du faux » de Manon (Acte II).
  // Double usage : hors combat dissipe le brouillard alentour et
  // dévoile les pages dissimulées ; en combat révèle d'un coup le
  // panneau d'info du monstre ciblé. Voir .claude/plans/manon-grimoire-pages.md.
  { name:"Revelio",           icon:"🔎",   desc:"Dévoile : le brouillard et les pages cachées (hors combat) ou les secrets d'un monstre (combat)", cost:2, effect:"reveal", element:"lumière", power:0 },
  // ── Sorts de Vampirisme ─────────────────────────────────────
  { name:"Sanguini",          icon:"🩸",   desc:"Vol de vie (12 dégâts, +6 PV)",      cost:8,  effect:"lifesteal", element:"ténèbres", power:12, evolvesTo:"Sanguini Vorace", evolveCondition:{ type:"corruption", value:2 } },
  { name:"Vampyrus",          icon:"🦇",   desc:"Drain magique (18 dégâts, +9 PV)",   cost:14, effect:"lifesteal", element:"ténèbres", power:18 },
  // ── Sorts de Malédiction ────────────────────────────────────
  { name:"Tarantallegra",     icon:"💃",   desc:"Danse maudite (8 dégâts + étourdis)", cost:7, effect:"stun",   element:"foudre",   power:8  },
  { name:"Maledictus",        icon:"☠️",   desc:"Malédiction (10 dégâts, −3 ATK/DEF)", cost:9, effect:"curse",  element:"ténèbres", power:10 },
  { name:"Crucio",            icon:"😖",   desc:"Sort de douleur interdit (22 dégâts)", cost:14, effect:"burn", element:"feu",      power:22 },
  { name:"Morsmordre",        icon:"💀",   desc:"Marque des Ténèbres (26 dégâts)",     cost:18, effect:"burn", element:"ténèbres", power:26 },
  // ── Sorts de Maison — palier 17 « Mythe » (1 sort exclusif/Maison) ──
  // Enseignés au franchissement du palier Mythe via `grantsSpell`.
  // Synergie signature P1 (combat-synthesis §1.3) : équiper l'artefact Premium
  // de la Maison affine SURCHARGE le sort signature (resolveSpellForm + synergyForm).
  // Non destructif : déséquiper = retour immédiat à la forme de base.
  { name:"Patronus Maxima",       icon:"🦌", desc:"Bouclier de groupe (2 tours) + dissipe l'étourdissement", cost:22, effect:"patronus_maxima", power:0,
    synergyArtifact:"orbe_runique_premium_gryff",
    synergyForm:{ shieldTurnsBonus:1, dispelWeaken:true, desc:"Bouclier de groupe (3 tours) — dissipe étourdissement, peur ET affaiblissement" } },
  { name:"Sectumsempra Imperius", icon:"🩸", desc:"Saignement lourd + asservit la cible (2 tours)",          cost:24, effect:"imperius", element:"ténèbres", power:20,
    synergyArtifact:"masque_rituel_premium_slyth",
    synergyForm:{ bleedTurnsBonus:1, synergyLifestealFrac:0.225, desc:"Saignement aggravé + asservit + draine la vie (Masque de Salazar)" } },
  { name:"Legilimens",            icon:"👁️", desc:"Lit l'esprit ennemi : annule la prochaine capacité",      cost:18, effect:"legilimens", power:0,
    synergyArtifact:"baton_ancestral_premium_serd",
    synergyForm:{ cancelChargesBonus:1, noCostEscalation:true, desc:"Annule les 2 prochaines capacités ennemies — sans surcoût d'incrément" } },
  { name:"Récolte Magique",       icon:"🌾", desc:"Restaure tout le groupe · or du combat majoré (+50%)",    cost:26, effect:"recolte", power:0,
    synergyArtifact:"talisman_fondateurs_premium_pouf",
    synergyForm:{ cleanseDot:true, desc:"Restaure le groupe · purge les afflictions (DoT) · or +50% (Talisman de Helga)" } },
  // ── Sorts de zone (AoE) — un mode distinct par élément + soin ──
  // Modes : nappe (glace), chaîne (foudre), vague (lumière), drain
  // (ténèbres), fauchage (physique). Voir .claude/plans/aoe-spells.md.
  // Dégâts : base = power + mag/magDiv + stat2/stat2Div (cf. aoeBaseDamage).
  // magDiv/stat2Div varient par sort pour l'équilibrage — un sort à gros
  // rider (gel, vol de vie) scale plus doucement. Défaut 3/3.
  // Chaque sort de zone possède une forme évoluée — plus PUISSANTE mais
  // toujours de zone (jamais de bascule vers du mono-cible). Déblocage
  // PROGRESSIF, un sort par étage à partir de la tranche D « Ruines Anciennes »
  // (endgame/Boucle) : Glacius 14, Fulgur 15, Lux 16, Nox 17, Diffindo 18,
  // Vulnera 19. Formes définies plus bas (bloc « formes AoE évoluées »).
  { name:"Glacius Tempête",   icon:"🌨️", desc:"Blizzard : dégâts de glace à tous les ennemis + gel",            cost:16, effect:"aoe_field",  element:"glace",    power:12, stat2:"int", magDiv:3, stat2Div:3, evolvesTo:"Glacius Cataclysme", evolveCondition:{ type:"floor", value:14 } },
  { name:"Fulgur Catena",     icon:"⚡",  desc:"Arc électrique : chaîne d'ennemi en ennemi (dégâts décroissants)", cost:15, effect:"aoe_chain",  element:"foudre",   power:18, stat2:"agi", magDiv:2, stat2Div:4, evolvesTo:"Fulgur Imperium", evolveCondition:{ type:"floor", value:15 } },
  { name:"Lux Aeterna",       icon:"🌟",  desc:"Onde de lumière : frappe tous les ennemis (×1,5 morts-vivants)",  cost:17, effect:"aoe_wave",   element:"lumière",  power:15, bonusVsUndead:1.5, stat2:"int", magDiv:2, stat2Div:4, evolvesTo:"Lux Suprema", evolveCondition:{ type:"floor", value:16 } },
  { name:"Nox Vorax",         icon:"🌑",  desc:"Vague obscure : dégâts à tous + draine la vie pour le lanceur",   cost:18, effect:"aoe_drain",  element:"ténèbres", power:14, stat2:"end", magDiv:3, stat2Div:3, evolvesTo:"Nox Devorans", evolveCondition:{ type:"floor", value:17 } },
  { name:"Diffindo Maxima",   icon:"⚔️", desc:"Fauchage : tranche la cible et les ennemis adjacents",            cost:14, effect:"aoe_cleave", element:"physique", power:18, stat2:"str", magDiv:3, stat2Div:2, evolvesTo:"Diffindo Ultima", evolveCondition:{ type:"floor", value:18 } },
  { name:"Vulnera Sanentur",  icon:"💗",  desc:"Chant de guérison : soigne tout le groupe",                       cost:16, effect:"heal_aoe",  power:22, evolvesTo:"Vulnera Maxima", evolveCondition:{ type:"floor", value:19 } },
  // ── Sort exclusif endgame (Grimoire Interdit, sinks A+E) ──────
  // Feu Maudit : flammes vivantes, dégâts massifs single-target,
  // brûlure persistante. Coût prohibitif → utilisation parcimonieuse.
  { name:"Fiendfyre",         icon:"🔥",  desc:"Feu Maudit : flammes vivantes (35 dégâts + brûle)",                cost:32, effect:"burn", element:"feu", power:35 },
  // ── Sorts & Magie 2.0 — Lot P2 : Éclats, familiers, environnementaux ──
  // Voir .claude/plans/spells-magic-system.md §1.4. Tous les `effect` neufs sont
  // routés DÉFENSIVEMENT (handlers gardés : SPELL_HANDLERS combat, SPELL_OOC_
  // HANDLERS exploration). Étiquetage 2.0 dans SPELL_META plus bas.
  // A. Sorts d'Éclats de la Clé de Voûte — montent en puissance avec le nombre
  //    d'Éclats possédés (eclatProgress() RÉUTILISÉ — pas de compteur neuf).
  //    `requiresEclats` gate l'usage en amont (castSpellInBattle), avant débit PM.
  { name:"Resonare",         icon:"🔹", desc:"Rituel : révèle tout l'étage et les pages cachées (coût ↓ par Éclat). Hors combat, ≥ 1 Éclat.", cost:8, effect:"reveal_floor", power:0 },
  { name:"Éclat de Voûte",   icon:"💠", desc:"Projectile de scellement : dégâts de ténèbres ×(1 + 0,25·Éclats possédés). Nécessite ≥ 2 Éclats.", cost:14, effect:"eclat_bolt", element:"ténèbres", power:22, requiresEclats:2 },
  { name:"Sceau des Quatre", icon:"🛡️", desc:"Bouclier de groupe (2 tours) + immunise la peur — nécessite les 3 Éclats de la Clé de Voûte.", cost:18, effect:"seal_shield", power:0, requiresEclats:3 },
  // D. Sorts de familier (invocation côté joueur, combat).
  { name:"Avis Praesidium",  icon:"🦉", desc:"Invoque un familier protecteur qui frappe un ennemi pendant 3 tours", cost:12, effect:"summon_ally", element:"physique", power:10 },
  { name:"Patronus Corporel",icon:"🦌", desc:"Familier-Patronus : protège le groupe (mitigation 2 tours) et chasse la peur", cost:16, effect:"patronus_corporel", element:"lumière", power:0 },
  // E. Sorts environnementaux (hors combat — SPELL_OOC_HANDLERS).
  { name:"Fontis",           icon:"💧", desc:"Recharge une Fontaine tarie (hors combat, gros coût)", cost:30, effect:"recharge_fountain", power:0 },
  { name:"Purgo",            icon:"✨", desc:"Dissipe la corruption d'une salle (retire un événement d'étage hostile)", cost:14, effect:"purge_room", power:0 },
  { name:"Aedificium",       icon:"🏛️", desc:"Stabilise un sceau runique des Ruines pour ouvrir un passage scellé", cost:12, effect:"stabilize_rune", power:0 },
  // ── Sorts & Magie 2.0 — Lot P3 : formes évoluées + variantes Premium ──
  // Voir .claude/plans/spells-magic-system.md §1.5/§1.6. Étiquetage dans
  // SPELL_META. Les formes évoluées sont des entrées à part entière renvoyées
  // par resolveSpellForm quand l'evolveCondition de la base est satisfaite
  // (réversible : déséquiper l'artefact / quitter l'étage ré-affiche la base).
  { name:"Incendio Majeur",   icon:"🔥",  desc:"Incendio amplifié par le Bâton ancestral (24 dégâts + éclaboussure)", cost:11, effect:"burn",  element:"feu",   power:24, splash:true },
  { name:"Glacius Profond",   icon:"❄️",  desc:"Givre des profondeurs (20 dégâts, engelures renforcées)",          cost:12, effect:"stun",  element:"glace", power:20 },
  // Forme évoluée MONO-CIBLE de Lumos Solem (étage 9) : un sort de lumière
  // plus puissant — surtout PAS une bascule vers du multi-cible. Garde
  // l'élément lumière + le bonus ×1,5 contre les morts-vivants.
  { name:"Lumos Solem Ardent",icon:"☀️",  desc:"Brasier solaire concentré (26 dégâts, ×1,5 morts-vivants)",        cost:12, effect:"burn",  element:"lumière", power:26, bonusVsUndead:1.5 },
  // ── Formes AoE évoluées (étage 14, tranche D) — restent de ZONE ───────
  // Évolution des 6 sorts de zone : plus puissantes mais TOUJOURS multi-cible
  // (même effect/element/stat2/magDiv/stat2Div que la base, power ↑). Renvoyées
  // par resolveSpellForm quand la base atteint l'étage 14 (endgame/Boucle).
  { name:"Glacius Cataclysme",icon:"🌨️", desc:"Cataclysme de givre : ravage tous les ennemis + gel renforcé",     cost:20, effect:"aoe_field",  element:"glace",    power:18, stat2:"int", magDiv:3, stat2Div:3 },
  { name:"Fulgur Imperium",   icon:"⚡",  desc:"Tempête électrique : chaîne dévastatrice d'ennemi en ennemi",       cost:19, effect:"aoe_chain",  element:"foudre",   power:27, stat2:"agi", magDiv:2, stat2Div:4 },
  { name:"Lux Suprema",       icon:"🌟",  desc:"Déluge de lumière : frappe tous les ennemis (×1,5 morts-vivants)",  cost:21, effect:"aoe_wave",   element:"lumière",  power:23, bonusVsUndead:1.5, stat2:"int", magDiv:2, stat2Div:4 },
  { name:"Nox Devorans",      icon:"🌑",  desc:"Marée obscure : dégâts à tous + gros drain de vie pour le lanceur", cost:22, effect:"aoe_drain",  element:"ténèbres", power:21, stat2:"end", magDiv:3, stat2Div:3 },
  { name:"Diffindo Ultima",   icon:"⚔️", desc:"Fauchage absolu : tranche la cible et les ennemis adjacents",       cost:18, effect:"aoe_cleave", element:"physique", power:27, stat2:"str", magDiv:3, stat2Div:2 },
  { name:"Vulnera Maxima",    icon:"💗",  desc:"Grand chant de guérison : restaure pleinement tout le groupe",      cost:20, effect:"heal_aoe",  power:33 },
  // Variantes Premium signature (1/Maison, §1.5) — sort de base recoloré +
  // boosté (power = base × SPELL_PREMIUM_MULT['rare'] = ×1,20, pré-cuit), offert
  // EN PLUS au palier Apothéose de la Maison affine. `premium`/`premiumOf`/
  // `premiumFx`/`tint` = miroir EXACT des artefacts Premium (data.js ITEMS).
  { name:"Incendio Royal",    icon:"🔥",  desc:"Flammes dorées de Godric (17 dégâts) — Premium Gryffondor", cost:10, effect:"burn",      element:"feu",      power:17, premium:true, premiumOf:"incendio", houseAffinity:"Gryffondor", premiumFx:"gryff", tint:"#d3a625" },
  { name:"Morsure d'Émeraude",icon:"🐍",  desc:"Venin vert qui draine la vie (14 dégâts, +7 PV) — Premium Serpentard", cost:10, effect:"lifesteal", element:"ténèbres", power:14, premium:true, premiumOf:"sanguini", houseAffinity:"Serpentard", premiumFx:"slyth", tint:"#1a472a" },
  { name:"Givre de Rowena",   icon:"❄️",  desc:"Runes de givre bleu (17 dégâts, engelures) — Premium Serdaigle",    cost:10, effect:"stun",      element:"glace",    power:17, premium:true, premiumOf:"glacius",  houseAffinity:"Serdaigle",  premiumFx:"serd",  tint:"#0e1a40" },
  { name:"Soin du Blaireau",  icon:"💛",  desc:"Lueur ambrée réconfortante (24 PV) — Premium Poufsouffle",          cost:9,  effect:"heal",      power:24, premium:true, premiumOf:"reparo",   houseAffinity:"Poufsouffle",premiumFx:"pouf",  tint:"#f0c75e" },
  // ── Sorts & Magie 2.0 — Lot P4 : corrompus, temporels, légendaires ────
  // Voir .claude/plans/spells-magic-system.md §1.4.B/C, §1.7. Tous les `effect`
  // neufs sont routés DÉFENSIVEMENT (SPELL_HANDLERS gardés). Les sorts à
  // `corruptionRisk>0` (corruption contrôlée + Le Mot du Dormeur) sont gatés
  // Boucle (corruptSpellGateOpen) AVANT débit PM, et déclenchent un contrecoup
  // configurable (`backlash`) APRÈS l'effet. Réversible / non-bloquant.
  // C. Corruption contrôlée — 1/Maison (tier corrompu, houseAffinity, risque).
  { name:"Flamme Dévorante", icon:"🔥", desc:"Brûlure dévorante (30 dégâts de feu + embrase) — magie corrompue de Gryffondor", cost:24, effect:"burn", element:"feu", power:30, houseAffinity:"Gryffondor", corruptionRisk:0.15, backlash:{ type:"status", statusId:"burn", power:5, turns:3 } },
  { name:"Venin du Cachot",  icon:"🐍", desc:"Venin drainant (24 dégâts de ténèbres, +PV, empoisonne) — magie corrompue de Serpentard", cost:22, effect:"venom_drain", element:"ténèbres", power:24, houseAffinity:"Serpentard", corruptionRisk:0.15, backlash:{ type:"counter", amount:1 } },
  { name:"Savoir Interdit",  icon:"🦅", desc:"Retourne l'offense ennemie (26 dégâts de ténèbres, −ATK/DEF) — magie corrompue de Serdaigle", cost:24, effect:"curse", element:"ténèbres", power:26, houseAffinity:"Serdaigle", corruptionRisk:0.20, backlash:{ type:"selfdmg", frac:0.10 } },
  { name:"Fardeau Partagé",  icon:"🦡", desc:"Redistribue les PV du groupe vers ceux qui faiblissent — magie corrompue de Poufsouffle", cost:20, effect:"share_burden", power:0, houseAffinity:"Poufsouffle", corruptionRisk:0.10, backlash:{ type:"counter", amount:1 } },
  // B. Temporels / échos (Boucle/Ruines). Garde-fous 1×/combat.
  { name:"Tempus Echo",      icon:"⏳", desc:"Rejoue le dernier sort offensif du lanceur, gratuitement (1×/combat)", cost:16, effect:"tempus_echo", power:0 },
  { name:"Reliquae Temporis",icon:"🕰️", desc:"Retourneur tactique : restaure PV/PM du groupe au début du round (1×/combat, épuisant)", cost:24, effect:"time_rewind", power:0, staminaCost:12 },
  { name:"Écho Fantôme",     icon:"👻", desc:"Invoque un écho astral du lanceur qui frappe 2 tours (1×/combat)", cost:18, effect:"echo_self", element:"ténèbres", power:0 },
  // 1.7 — Légendaires de quête signature (octroi reward.spell) + Ruines.
  { name:"Cœur de Lion",     icon:"🦁", desc:"Cri de ralliement : dégâts de groupe ↑ et dissipe la peur, tant qu'aucun allié n'est à terre", cost:22, effect:"lion_heart", power:0, houseAffinity:"Gryffondor" },
  { name:"Pacte du Serpent", icon:"🐍", desc:"Sacrifie 15 % des PV max du lanceur pour doubler son prochain sort offensif", cost:16, effect:"serpent_pact", power:0, houseAffinity:"Serpentard" },
  { name:"Verbe de Rowena",  icon:"🦅", desc:"Chœur de savoir : chaque allié vivant frappe tous les ennemis (plus fort en duo)", cost:24, effect:"rowena_verb", element:"lumière", power:14, houseAffinity:"Serdaigle" },
  { name:"Serment du Blaireau", icon:"🦡", desc:"Relève un allié à terre à 30 % de ses PV (1×/combat)", cost:20, effect:"badger_oath", power:0, houseAffinity:"Poufsouffle" },
  { name:"Le Mot du Dormeur",icon:"🗿", desc:"Verbe ultime des Ruines : dégâts colossaux de ténèbres à tous les ennemis — au prix de soi", cost:40, effect:"aoe_wave", element:"ténèbres", power:40, stat2:"int", magDiv:2, stat2Div:3, corruptionRisk:0.5, staminaCost:15, backlash:{ type:"selfdmg", frac:0.18 } },
  // Reports P3 réintégrés : formes évoluées de Sanguini (corruption) et Protego
  // (Apothéose). Renvoyées par resolveSpellForm quand la condition est remplie.
  { name:"Sanguini Vorace",  icon:"🩸", desc:"Vampirisme corrompu (24 dégâts de ténèbres, gros drain)", cost:14, effect:"lifesteal", element:"ténèbres", power:24 },
  { name:"Protego Diabolica",icon:"🛡️", desc:"Bouclier maudit : bloque ET renvoie 20 % des coups physiques subis", cost:7, effect:"shield", power:5, reflectFrac:0.20 },
  // ── Sort de portail inter-mondes — Cheminette Inter-Mondes ────
  // Voir .claude/plans/parallel-worlds.md §4. Hors combat uniquement,
  // refusé en mode Ironman (§2.1). Apprentissage niv. 8 dans
  // _grantLevelSpells. Phase A : animation locale 2,8 s sans réseau ;
  // les phases suivantes brancheront le matchmaking Supabase.
  { name:"Cheminette Inter-Mondes", icon:"🌀", desc:"Ouvre un portail vers le monde d'un autre sorcier (hors combat)", cost:25, effect:"portal", power:0 },
  // ── Mondes parallèles Phase H §6.9 — Verrou de Sang ───────────
  // Lancé hors combat astral, en visite, sur une cellule libre. Coût
  // 5 PM + 1 Essence d'Outremonde. Insère une ligne dans `mp_threats` —
  // le host la résoudra plus tard (combat forcé sur la cellule) et le
  // visiteur récupérera des essences/fragments en asynchrone au
  // prochain démarrage.
  { name:"Verrou de Sang", icon:"🩸", desc:"Scelle une menace pour le sorcier hôte (1 essence + 5 PM, en visite)", cost:5, effect:"blood_seal", power:0 },
  // ── Mondes parallèles V1c.1 §6.10 — sorts exclusifs cross-plan ──
  // Achetés à l'Atelier du Voyageur contre essences. Tous OOC, gating
  // dans SPELL_OOC_HANDLERS. `_cross:true` marque ces sorts comme
  // exclusifs Atelier (filtrage UI).
  { name:"Sceau du Voyageur",    icon:"🪬", desc:"Ancrage astral : si tu meurs en combat astral, retour à ta cellule de départ (sans cooldown)", cost:8,  effect:"voyager_seal",      power:0, _cross:true },
  { name:"Mémoire d'Outremonde", icon:"🌌", desc:"Restaure 100 % PV + 100 % PM au début de ta prochaine visite",                                  cost:10, effect:"outremonde_memory", power:0, _cross:true },
  { name:"Marque du Pèlerin",    icon:"📍", desc:"Marque la cellule courante en visite — visible sur la minimap",                                 cost:4,  effect:"pilgrim_mark",      power:0, _cross:true },
  { name:"Rappel Astral",        icon:"🌠", desc:"Téléporte à la dernière Marque du Pèlerin posée",                                               cost:12, effect:"astral_recall",     power:0, _cross:true },
];

// Catégorie d'un sort pour le filtre de la modale Sorts. Soutien et
// utilitaire priment sur l'élément (ces sorts n'ont pas d'`element`) ;
// sinon on retombe sur l'élément du sort.
function spellCategory(spell) {
  if (!spell) return 'utilitaire';
  const e = spell.effect;
  if (e === 'heal' || e === 'support_regen' || e === 'support_regen_aoe' || e === 'shield'
      || e === 'patronus_maxima' || e === 'recolte' || e === 'heal_aoe') return 'soutien';
  if (e === 'disarm' || e === 'steal' || e === 'teleport' || e === 'legilimens'
      || e === 'reveal') return 'utilitaire';
  return spell.element || 'utilitaire';
}

// ============================================================
// SORTS & MAGIE AVANCÉE 2.0 — socle data (Lot P0)
// ------------------------------------------------------------
// Voir .claude/plans/spells-magic-system.md.
// Miroir EXACT du socle Artefacts (ARTIFACT_FORMS / PREMIUM_MULT /
// premiumStat) ci-dessous : registres + helpers PURS + un passe de
// normalisation idempotent. INERTE — aucun chemin chaud (castSpellInBattle,
// _spellSpCost, openSpells…) ne lit encore ces champs ; le seul effet est
// d'ajouter des champs d'identité par défaut aux entrées SPELLS. Aucun
// changement de gameplay visible. Consommé par les lots suivants (P1 liseré
// de tier dans la modale Sorts, P2 sorts de Maison, P3 Premium/évolutifs).
// ============================================================

// Multiplicateur de power des variantes Premium d'un sort (miroir de
// PREMIUM_MULT côté artefacts). Appliqué à la GÉNÉRATION des entrées Premium
// (power pré-cuit dans SPELLS), JAMAIS au runtime — aucun chemin chaud touché.
const SPELL_PREMIUM_MULT = { rare: 1.20, epic: 1.30, legendary: 1.40 };

// Rangs de maîtrise (tier) = puissance + ton qui s'assombrit avec la descente.
// `mult` : facteur de coût indicatif (formule §1.8, consommé par
// spellPmCostEstimate). `tint` : liseré coloré de la modale Sorts (P1),
// cohérent avec la bordure de rareté d'un item d'inventaire.
const SPELL_TIERS = {
  'basique':  { label: 'Basique',  rank: 0, mult: 1.0, tint: '#5fa85f' }, // 🌱 vert
  'avancé':   { label: 'Avancé',   rank: 1, mult: 1.4, tint: '#4a7bc0' }, // 🔆 bleu
  'maître':   { label: 'Maître',   rank: 2, mult: 2.0, tint: '#c9a227' }, // 🌟 or
  'corrompu': { label: 'Corrompu', rank: 3, mult: 2.8, tint: '#7a2f8a' }, // 🌑 violet sombre
};

// Multiplicateur de coût PM par rareté (formule §1.8 — distinct de
// SPELL_PREMIUM_MULT). Consommé par spellPmCostEstimate (sim/équilibrage).
const SPELL_RARITY_COST_MULT = { common: 1.0, uncommon: 1.1, rare: 1.25, epic: 1.4, legendary: 1.6 };

// Coloration FX par Maison affine (miroir de HOUSE_PREMIUM côté artefacts).
// `fx` : clé de variante de particules (CombatFX, P3) ; `tint` : couleur hex.
const HOUSE_SPELL_FX = {
  Gryffondor:  { fx: 'gryff', tint: '#d3a625' }, // 🦁 flammes dorées
  Serpentard:  { fx: 'slyth', tint: '#1a472a' }, // 🐍 venin vert
  Serdaigle:   { fx: 'serd',  tint: '#0e1a40' }, // 🦅 givre bleu runique
  Poufsouffle: { fx: 'pouf',  tint: '#f0c75e' }, // 🦡 ambre doré
};

// Forme canon du Patronus par héros — purement COSMÉTIQUE (texte/FX du sort
// Patronus, P2/P3). Aucun impact mécanique. Clés = clés de CHARACTERS.
const HERO_PATRONUS = {
  harry:     'Cerf',          hermione:  'Loutre',
  draco:     'Vipère',        cho:       'Cygne',
  cedric:    'Faucon',        celeste:   'Loup Argenté',
  iris:      'Papillon',      maxence:   'Corbeau',
  anastasia: 'Lionne',        louis:     'Salamandre',
  jeanne:    'Licorne',       margaux:   'Hibou',
  agathe:    'Biche',         olivier:   'Lynx',
  nathalie:  'Lièvre',        chatillon: 'Chauve-souris',
};

// Slug stable kebab/snake-case dérivé du nom d'affichage (PUR). Sert d'`id`
// par défaut quand l'entrée n'en déclare pas. Déterministe et sans accent.
//   "Incendio" → "incendio" · "Glacius Tempête" → "glacius_tempete"
//   "Avada..." → "avada"     · "Cheminette Inter-Mondes" → "cheminette_inter_mondes"
function _slugifySpell(name) {
  return String(name == null ? '' : name)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les diacritiques
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Catégorie 2.0 par DÉFAUT (taxonomie combat|exploration|defense|rituel|
// signature), dérivée mécaniquement de l'`effect`. Le curating fin (rituel/
// signature) est laissé au P1 — ici on ne pose qu'un défaut sûr. PUR.
const _SPELL_CAT_DEFENSE = new Set([
  'heal', 'heal_aoe', 'support_regen', 'support_regen_aoe', 'shield',
  'patronus_maxima', 'recolte', 'regen_buff',
]);
const _SPELL_CAT_EXPLORATION = new Set([
  'disarm', 'steal', 'reveal', 'teleport', 'legilimens', 'portal',
  'blood_seal', 'voyager_seal', 'outremonde_memory', 'pilgrim_mark', 'astral_recall',
]);
function _defaultSpellCategory(spell) {
  const e = (spell && spell.effect) || '';
  if (_SPELL_CAT_DEFENSE.has(e)) return 'defense';
  if (_SPELL_CAT_EXPLORATION.has(e)) return 'exploration';
  return 'combat';
}

// ── Étiquetage curaté des sorts existants (Lot P1) ──────────────
// Table de méta-données par NOM (clé runtime), source de vérité de
// l'identité 2.0 des ~47 sorts du catalogue. Tuple [category, tier, rarity,
// houseAffinity] — appliqué par _normalizeSpells SANS écraser une valeur
// déjà déclarée sur le littéral (précédence : littéral > SPELL_META > défaut
// dérivé). Centralisé ici plutôt qu'éparpillé sur 47 littéraux : diff lisible,
// idempotent, testable. Curating aligné sur le plan §1.3 / §1.10. Les seules
// affinités de Maison posées sont les 4 sorts « Mythe » (canon, §1.3 note).
const SPELL_META = {
  // ── Basiques (Acte I) ──
  'Expelliarmus':       ['exploration', 'basique', 'common',    null],
  'Stupefix':           ['combat',      'basique', 'common',    null],
  'Episkey':            ['defense',     'basique', 'common',    null],
  'Ferula':             ['defense',     'basique', 'common',    null],
  'Protego':            ['defense',     'basique', 'common',    null],
  'Incendio':           ['combat',      'basique', 'common',    null],
  'Accio':              ['exploration', 'basique', 'common',    null],
  'Wingardium Leviosa': ['combat',      'basique', 'common',    null],
  'Reparo':             ['defense',     'basique', 'common',    null],
  'Aguamenti':          ['combat',      'basique', 'common',    null],
  'Riddikulus':         ['combat',      'basique', 'common',    null],
  'Alohomora':          ['exploration', 'basique', 'common',    null],
  'Revelio':            ['exploration', 'basique', 'common',    null],
  'Tarantallegra':      ['combat',      'basique', 'common',    null],
  // ── Avancés (Acte II) ──
  'Ferula Maxima':      ['defense',     'avancé',  'uncommon',  null],
  'Diffindo':           ['combat',      'avancé',  'uncommon',  null],
  'Lumos Maxima':       ['combat',      'avancé',  'uncommon',  null],
  'Bombarda':           ['combat',      'avancé',  'rare',      null],
  'Glacius':            ['combat',      'avancé',  'uncommon',  null],
  'Fulgari':            ['combat',      'avancé',  'uncommon',  null],
  'Lumos Solem':        ['combat',      'avancé',  'rare',      null],
  'Sanguini':           ['combat',      'avancé',  'uncommon',  null],
  'Maledictus':         ['combat',      'avancé',  'uncommon',  null],
  'Verrou de Sang':     ['exploration', 'avancé',  'rare',      null],
  'Marque du Pèlerin':  ['exploration', 'avancé',  'uncommon',  null],
  // ── Maîtres (Acte III) ──
  'Sectumsempra':       ['combat',      'maître',  'epic',      null],
  'Patronum':           ['combat',      'maître',  'rare',      null],
  'Vampyrus':           ['combat',      'maître',  'rare',      null],
  'Crucio':             ['combat',      'maître',  'rare',      null],
  'Morsmordre':         ['combat',      'maître',  'epic',      null],
  'Glacius Tempête':    ['combat',      'maître',  'rare',      null],
  'Fulgur Catena':      ['combat',      'maître',  'rare',      null],
  'Lux Aeterna':        ['combat',      'maître',  'rare',      null],
  'Nox Vorax':          ['combat',      'maître',  'rare',      null],
  'Diffindo Maxima':    ['combat',      'maître',  'rare',      null],
  'Vulnera Sanentur':   ['defense',     'maître',  'rare',      null],
  'Portus':             ['exploration', 'maître',  'rare',      null],
  'Cheminette Inter-Mondes': ['exploration', 'maître', 'epic',  null],
  'Sceau du Voyageur':  ['exploration', 'maître',  'rare',      null],
  "Mémoire d'Outremonde": ['exploration', 'maître', 'rare',     null],
  'Rappel Astral':      ['exploration', 'maître',  'rare',      null],
  // ── Sorts « Mythe » de Maison (signature, affinité canon — §1.3) ──
  'Patronus Maxima':       ['signature', 'maître',   'epic', 'Gryffondor'],
  'Sectumsempra Imperius': ['signature', 'corrompu', 'epic', 'Serpentard'],
  'Legilimens':            ['signature', 'maître',   'epic', 'Serdaigle'],
  'Récolte Magique':       ['signature', 'maître',   'epic', 'Poufsouffle'],
  // ── Corrompus / interdits (legendary) ──
  'Avada...':           ['signature', 'corrompu', 'legendary', null],
  'Fiendfyre':          ['combat',    'corrompu', 'legendary', null],
  // ── Lot P2 : Éclats (rituel), familiers, environnementaux (§1.4) ──
  'Resonare':           ['rituel',      'avancé', 'rare',     null],
  'Éclat de Voûte':     ['combat',      'maître', 'epic',     null],
  'Sceau des Quatre':   ['defense',     'maître', 'epic',     null],
  'Avis Praesidium':    ['combat',      'avancé', 'rare',     null],
  'Patronus Corporel':  ['defense',     'maître', 'epic',     null],
  'Fontis':             ['exploration', 'maître', 'rare',     null],
  'Purgo':              ['rituel',      'avancé', 'rare',     null],
  'Aedificium':         ['rituel',      'maître', 'rare',     null],
  // ── Lot P3 : formes évoluées + variantes Premium signature (§1.5/§1.6) ──
  'Incendio Majeur':     ['combat',    'maître', 'rare', null],
  'Glacius Profond':     ['combat',    'maître', 'rare', null],
  // Forme mono-cible évoluée de Lumos Solem (ne bascule plus en AoE).
  'Lumos Solem Ardent':  ['combat',    'maître', 'rare', null],
  // Formes AoE évoluées (restent de zone) — pendant des 6 sorts de zone.
  'Glacius Cataclysme':  ['combat',    'maître', 'epic', null],
  'Fulgur Imperium':     ['combat',    'maître', 'epic', null],
  'Lux Suprema':         ['combat',    'maître', 'epic', null],
  'Nox Devorans':        ['combat',    'maître', 'epic', null],
  'Diffindo Ultima':     ['combat',    'maître', 'epic', null],
  'Vulnera Maxima':      ['defense',   'maître', 'epic', null],
  'Incendio Royal':      ['signature', 'maître', 'rare', 'Gryffondor'],
  "Morsure d'Émeraude":  ['signature', 'maître', 'rare', 'Serpentard'],
  'Givre de Rowena':     ['signature', 'maître', 'rare', 'Serdaigle'],
  'Soin du Blaireau':    ['signature', 'maître', 'rare', 'Poufsouffle'],
  // ── Lot P4 : corruption contrôlée, temporels, légendaires (§1.4.B/C, §1.7) ──
  'Flamme Dévorante':    ['combat',    'corrompu', 'epic',      'Gryffondor'],
  'Venin du Cachot':     ['combat',    'corrompu', 'epic',      'Serpentard'],
  'Savoir Interdit':     ['signature', 'corrompu', 'epic',      'Serdaigle'],
  'Fardeau Partagé':     ['defense',   'corrompu', 'epic',      'Poufsouffle'],
  'Tempus Echo':         ['rituel',    'maître',   'epic',      null],
  'Reliquae Temporis':   ['defense',   'corrompu', 'epic',      null],
  'Écho Fantôme':        ['combat',    'corrompu', 'epic',      null],
  'Cœur de Lion':        ['signature', 'maître',   'legendary', 'Gryffondor'],
  'Pacte du Serpent':    ['signature', 'maître',   'legendary', 'Serpentard'],
  'Verbe de Rowena':     ['signature', 'maître',   'legendary', 'Serdaigle'],
  'Serment du Blaireau': ['signature', 'maître',   'legendary', 'Poufsouffle'],
  'Le Mot du Dormeur':   ['combat',    'corrompu', 'legendary', null],
  'Sanguini Vorace':     ['combat',    'corrompu', 'epic',      null],
  'Protego Diabolica':   ['defense',   'corrompu', 'epic',      null],
};

// Passe de normalisation IDEMPOTENTE (miroir de _migrateEquippedSlots côté
// save) : ajoute les champs d'identité à chaque entrée SPELLS SANS écraser une
// valeur déjà déclarée. Précédence : littéral > SPELL_META (étiquetage curaté
// P1) > défaut dérivé. Rejouable sans effet de bord. Retourne la liste pour
// permettre un appel testable hors `SPELLS`.
function _normalizeSpells(list) {
  const spells = list || (typeof SPELLS !== 'undefined' ? SPELLS : null);
  if (!Array.isArray(spells)) return spells;
  for (const s of spells) {
    if (!s || typeof s !== 'object') continue;
    const meta = (s.name != null && SPELL_META[s.name]) || null;
    if (s.id == null)              s.id = _slugifySpell(s.name);
    if (s.category == null)        s.category = (meta && meta[0]) || _defaultSpellCategory(s);
    if (s.tier == null)            s.tier = (meta && meta[1]) || 'basique';
    if (s.rarity == null)          s.rarity = (meta && meta[2]) || 'common';
    if (s.houseAffinity === undefined) s.houseAffinity = meta ? meta[3] : null;
  }
  return spells;
}

// ── Helpers PURS (testés dans tests/units.js, façon _fortuneCurve) ──

// Résolution par id stable (Codex / variantes / synergies). `name` reste la
// clé runtime de char.spells — `id` est un canal parallèle (cf. plan §1.2).
function getSpellById(id) {
  if (id == null || typeof SPELLS === 'undefined') return null;
  return SPELLS.find(s => s && s.id === id) || null;
}
// Résolution par nom d'affichage (clé runtime du moteur de combat).
function getSpellByName(name) {
  if (name == null || typeof SPELLS === 'undefined') return null;
  return SPELLS.find(s => s && s.name === name) || null;
}
// Couleur de liseré du rang d'un sort (P1, modale Sorts). Repli sûr sur le
// tint « basique » pour un sort sans tier (legacy non normalisé).
function spellTierTint(spell) {
  const t = spell && spell.tier;
  return (SPELL_TIERS[t] && SPELL_TIERS[t].tint) || SPELL_TIERS['basique'].tint;
}
// Boost d'affinité de Maison (P2 — §2.2/§1.8) — réduction de coût PM pour les
// sorts dont `houseAffinity` == la Maison du joueur. PUR (façon _fortuneCurve) :
// ne lit QUE ses arguments → testable hors navigateur. POWER-NEUTRE (cf. biais
// Maison V2) : on ne touche jamais aux dégâts/power, seul le coût baisse — pas
// de power creep, règle d'or §0 respectée (zéro scaling monstre). Retourne une
// FRACTION de réduction [0..0.25], composée multiplicativement avec le −20 %
// Serdaigle de _spellSpCost. Cadence : 15 % dès que la Maison affine
// correspond, +5 % au palier Mythe (17), +5 % au palier Apothéose (18).
function houseSpellBoost(spell, house, tier) {
  if (!spell || !house) return 0;
  if (!spell.houseAffinity || spell.houseAffinity !== house) return 0;
  let r = 0.15;
  const t = (typeof tier === 'number') ? tier : 0;
  if (t >= 17) r += 0.05;
  if (t >= 18) r += 0.05;
  return r;
}
// Un personnage porte-t-il un artefact dont l'id OU la base Premium (premiumOf)
// vaut `value` ? PUR, défensif. Match sur les deux pour qu'une condition exprimée
// en base (ex. "baton_ancestral") réponde à la variante Premium équipée
// (id "baton_ancestral_premium_serd", premiumOf "baton_ancestral").
function _charHasArtifactForm(char, value) {
  if (!char || !char.equipped || value == null) return false;
  for (const slot of Object.keys(char.equipped)) {
    const it = char.equipped[slot];
    if (it && (it.id === value || it.premiumOf === value)) return true;
  }
  return false;
}
// Condition d'évolution d'un sort satisfaite ? (P3 §1.6). NON destructif :
// lit `char.equipped` (artefact) et, défensivement, quelques globals runtime
// (étage / quêtes / palier de Maison) via `typeof` — donc rejouable hors
// navigateur (les globals absents ⇒ false). `corruption` (Sanguini Vorace)
// est reporté au P4 : la branche existe mais reste inerte tant que
// `corruptionLevel` n'est pas défini.
function _spellEvolveConditionMet(cond, char) {
  if (!cond || !cond.type) return false;
  switch (cond.type) {
    case 'artifact':
      // P1 : match id OU premiumOf → la variante Premium déclenche l'évolution.
      return _charHasArtifactForm(char, cond.value);
    case 'floor':
      return (typeof currentFloor === 'number') && currentFloor >= cond.value;
    case 'quest':
      return (typeof completedQuests !== 'undefined') && !!completedQuests.has
        && completedQuests.has(cond.value);
    case 'apotheose':
      // Palier Apothéose (tier 18) de la Maison du sort (ou de toute Maison
      // si cond.value absent). `houseTier` est la source de vérité (main.js).
      return (typeof houseTier === 'number') && houseTier >= 18
        && (!cond.value || (typeof chosenHouse !== 'undefined' && chosenHouse === cond.value));
    case 'corruption':   // P4 — actif : lit le compteur de groupe spellCorruption.
      return (typeof spellCorruption === 'number') && spellCorruption >= (cond.value || 1);
    default:
      return false;
  }
}
// Forme EFFECTIVE d'un sort pour un personnage (non destructif, runtime).
// P3 §1.6 : évolution vers un AUTRE sort (`evolvesTo`/`evolveCondition`).
// P1 synergie (combat-synthesis §1.3) : surcharge signature (`synergyArtifact`/
// `synergyForm`) — même sort, riders, quand l'artefact Premium de Maison est
// équipé. RÉVERSIBLE : recalculé à chaque appel (modale + lancement) ; renvoie
// l'objet base PAR IDENTITÉ si rien n'est actif. PUR : ne mute JAMAIS char.spells.
function resolveSpellForm(spellName, char) {
  const base = getSpellByName(spellName);
  if (!base) return null;
  // 1) Évolution vers un autre sort (artefact pivot / étage / quête / Apothéose).
  if (base.evolvesTo && base.evolveCondition
      && _spellEvolveConditionMet(base.evolveCondition, char)) {
    return getSpellByName(base.evolvesTo) || base;
  }
  // 2) Surcharge signature (même sort, riders) — artefact Premium de Maison.
  if (base.synergyArtifact && base.synergyForm
      && _charHasArtifactForm(char, base.synergyArtifact)) {
    return Object.assign({}, base, base.synergyForm, { _synergy: true });
  }
  return base;
}
// Couples Artefact↔Sort↔Maison effectivement débloqués pour `char` (lecture du
// build, encart « Synergies actives » de la fiche perso). PUR. Ne liste que les
// sorts connus du perso dont l'artefact pivot/Premium est équipé.
function spellSynergiesFor(char) {
  if (typeof SPELLS === 'undefined' || !char) return [];
  const known = Array.isArray(char.spells) ? char.spells : [];
  const out = [];
  for (const base of SPELLS) {
    if (!base || !known.includes(base.name)) continue;
    if (base.synergyArtifact && base.synergyForm
        && _charHasArtifactForm(char, base.synergyArtifact)) {
      out.push({ spell: base.name, form: base.name, artifact: base.synergyArtifact,
                 house: base.houseAffinity || null, kind: 'override' });
    } else if (base.evolvesTo && base.evolveCondition && base.evolveCondition.type === 'artifact'
        && _charHasArtifactForm(char, base.evolveCondition.value)) {
      const ev = getSpellByName(base.evolvesTo);
      out.push({ spell: base.name, form: ev ? ev.name : base.evolvesTo,
                 artifact: base.evolveCondition.value, house: base.houseAffinity || null,
                 kind: 'evolution' });
    }
  }
  return out;
}
// Estimation du coût PM d'un sort (formule §1.8) — outil de SIMULATION /
// équilibrage, jamais consommé par un chemin chaud. PUR.
//   PM ≈ budget × tierMult × rarityMult
//   budget = power×0,5 (+ heal? power×0,4) (+ statut? 2) (+ lifesteal? 3) (× AoE? 1,5)
function spellPmCostEstimate(spell) {
  if (!spell || typeof spell !== 'object') return 0;
  const power = (typeof spell.power === 'number' && isFinite(spell.power)) ? Math.max(0, spell.power) : 0;
  const e = spell.effect || '';
  const isHeal      = (e === 'heal' || e === 'heal_aoe' || e === 'support_regen' || e === 'support_regen_aoe');
  const isAoe       = !!(spell.splash || spell.aoe || /^aoe_/.test(e) || e === 'heal_aoe' || e === 'support_regen_aoe');
  const hasStatus   = !!spell.statusId || !!spell.statusTurns || e === 'burn' || e === 'stun' || e === 'curse' || e === 'imperius';
  const isLifesteal = (e === 'lifesteal' || e === 'aoe_drain');

  let budget = power * 0.5;
  if (isHeal)      budget += power * 0.4;
  if (hasStatus)   budget += 2;
  if (isLifesteal) budget += 3;
  if (isAoe)       budget *= 1.5;

  const tierMult   = (SPELL_TIERS[spell.tier] && SPELL_TIERS[spell.tier].mult) || 1.0;
  const rarityMult = SPELL_RARITY_COST_MULT[spell.rarity] || 1.0;
  return Math.round(budget * tierMult * rarityMult);
}

// ── Lot P4 — corruption (helpers PURS, testés units.js) ─────────
// Modificateur de corruption (§2.6). Fraction saturante croissant avec
// `corruptionLevel` : majore le power des sorts corrompus ET augmente leur
// corruptionRisk → boucle risque/récompense. PUR (lit seulement son argument).
// Cadence : +12 %/niveau, plafonné à +40 %. Niveau ≤ 0 / non fini → 0 (no-op).
function corruptionSpellModifier(level) {
  const l = (typeof level === 'number' && isFinite(level) && level > 0) ? level : 0;
  return Math.min(0.40, 0.12 * l);
}

// Résolution PURE du contrecoup de corruption (❓5 — configurable par sort).
// Ne mute RIEN : retourne une description de l'effet à appliquer. L'applicateur
// (battle-spells.js `_applyCorruptionBacklash`) mute char/corruptionLevel.
//   { type:"selfdmg", frac } → auto-dégât en % des PV max (plancher 1 PV côté applicateur)
//   { type:"status",  statusId, power, turns } → statut (burn/bleed…)
//   { type:"counter", amount } → montée de corruptionLevel (défaut)
function resolveCorruptionBacklash(backlash, char) {
  const cfg = (backlash && typeof backlash === 'object') ? backlash : { type: 'counter' };
  switch (cfg.type) {
    case 'selfdmg': {
      const frac   = (typeof cfg.frac === 'number') ? cfg.frac : 0.10;
      const hpMax  = (char && typeof char.hpMax === 'number') ? char.hpMax : 0;
      const hpLoss = Math.max(1, Math.floor(hpMax * frac));
      return { kind: 'selfdmg', hpLoss };
    }
    case 'status':
      return { kind: 'status', statusId: cfg.statusId || 'burn',
               statusPower: (typeof cfg.power === 'number') ? cfg.power : 4,
               statusTurns: (typeof cfg.turns === 'number') ? cfg.turns : 3 };
    case 'counter':
    default:
      return { kind: 'counter', corruptionInc: (typeof cfg.amount === 'number') ? cfg.amount : 1 };
  }
}

// Gate Boucle des sorts corrompus (§2.6) — PUR. Un sort corrompu DANGEREUX
// (corruptionRisk>0) n'est lançable qu'en Boucle : `victoryAchieved` OU
// effectiveFloor(currentFloor) >= 11. Les corrompus legacy sans corruptionRisk
// (Avada.../Fiendfyre/Sectumsempra Imperius) ne passent JAMAIS par cette gate.
function corruptSpellGateOpen(floor, victory, effFloor) {
  if (victory) return true;
  const ef = (typeof effFloor === 'number') ? effFloor
           : (typeof floor === 'number') ? floor : 0;
  return ef >= 11;
}

// Application du socle : normalise SPELLS une fois au chargement (idempotent,
// pure data-prep ; n'ajoute que des champs d'identité inertes).
_normalizeSpells(SPELLS);

// ── Pages du grimoire de givre d'Élara (quête manon_grimoire) ──
// Cinq feuillets dispersés et dissimulés, un par étage porteur. Le
// joueur les dévoile avec Revelio puis les ramasse en fouillant. Une
// fois les cinq réunis, Manon reconstitue le grimoire (établi de
// fusion). Cf. .claude/plans/manon-grimoire-pages.md.
const GRIMOIRE_PAGES = [
  { id: "page_grimoire_1", name: "Page de garde", icon: "📄", floor: 2,
    lore: "« À ma fille, si ces lignes te trouvent : le froid n'est pas l'absence de chaleur. C'est une chaleur qui a appris la patience. » — É." },
  { id: "page_grimoire_2", name: "Le souffle de givre", icon: "📄", floor: 3,
    lore: "Premiers exercices : givrer la rosée sans la briser. Élara a noté en marge : « recommencé onze fois — la onzième tient »." },
  { id: "page_grimoire_3", name: "La rosée durcie", icon: "📄", floor: 5,
    lore: "Le gel comme armure et non comme arme. L'encre y est pâlie, comme soufflée par un hiver ancien." },
  { id: "page_grimoire_4", name: "Le miroir de glace", icon: "📄", floor: 7,
    lore: "Une page presque entièrement raturée — sauf une ligne : « ce qu'on gèle, on le garde ; ce qu'on garde, on finit par devoir rendre »." },
  { id: "page_grimoire_5", name: "La tempête apprivoisée", icon: "📄", floor: 9,
    lore: "La dernière page : le tracé complet du grand sortilège de blizzard. Sous le schéma, deux mots tremblés : « pour toi »." }
];

// Étages porteurs d'une page (dérivé — source de vérité GRIMOIRE_PAGES).
const PAGE_FLOORS = GRIMOIRE_PAGES.map(p => p.floor);

// Retourne la page définie pour un étage donné, ou null.
function getGrimoirePageForFloor(floor) {
  return GRIMOIRE_PAGES.find(p => p.floor === floor) || null;
}

// ── Feuillets clairs d'Élara (Acte III — quête manon_acte3) ────
// Trois feuillets LUMINEUX qu'Élara avait gardés à part « pour la joie » :
// des sorts de givre heureux (dessiner sur une vitre, figer une goutte en
// perle, faire neiger dans une pièce), semés dans le château pour que sa
// fille tombe un jour sur sa joie et non seulement sur son mensonge.
// Réutilisent le mécanisme de pages de l'Acte II via _activePageSet().
// Cf. .claude/plans/manon-grimoire-easter-egg.md.
const ACT3_PAGES = [
  { id: "feuillet_clair_1", name: "La fougère sur la vitre", icon: "❄️", floor: 2,
    lore: "« Premier jeu que je t'apprendrai : souffle sur le carreau et dessine. Une fougère, une étoile, ton prénom. Le givre garde tout ce qu'on lui confie en riant. » — É." },
  { id: "feuillet_clair_2", name: "La goutte en perle", icon: "❄️", floor: 6,
    lore: "« Fige une goutte de pluie avant qu'elle tombe : tu auras une perle qui ne coûte rien et ne se ternit pas. J'en ai fait des colliers entiers, les soirs où je pensais à toi. » — É." },
  { id: "feuillet_clair_3", name: "La neige en chambre", icon: "❄️", floor: 9,
    lore: "« Et si un soir ton cœur est lourd : ferme les fenêtres, lève ta baguette, et fais neiger dans la pièce. Personne n'a jamais boudé sous la neige. Essaie. » — É." }
];

// Étages porteurs d'un feuillet clair (dérivé — source ACT3_PAGES).
const ACT3_FLOORS = ACT3_PAGES.map(p => p.floor);

// ── Sélecteur de set de pages actif (Acte II / Acte III) ──────
// Source de vérité unique du « quel jeu de pages est en jeu maintenant ».
// Les structures d'état (pagePlacements / revealedPages /
// player.grimoirePages) sont RÉUTILISÉES — les actes sont exclusifs dans
// le temps (l'Acte II purge tout à sa fusion, l'Acte III reprend).
// Retourne un descripteur { questId, pages, floors, fuse } ou null.
// Cf. .claude/plans/manon-grimoire-easter-egg.md §4.
function _activePageSet() {
  if (typeof activeQuests !== 'undefined'
      && activeQuests.some(q => q.id === 'manon_grimoire')) {
    return { questId: 'manon_grimoire', pages: GRIMOIRE_PAGES,
             floors: PAGE_FLOORS, fuse: 'fuseGrimoire' };
  }
  if (typeof completedQuests !== 'undefined'
      && completedQuests.has('manon_grimoire')
      && !completedQuests.has('manon_acte3')) {
    return { questId: 'manon_acte3', pages: ACT3_PAGES,
             floors: ACT3_FLOORS, fuse: 'fuseAct3' };
  }
  return null;
}

// ── Énigmes de Dumbledore — Épreuve de la Lumière Éternelle ───
// 2ᵉ temps de la quête dumbledore_lumiere. QCM 4 choix ; `answer` est
// l'index de la bonne réponse. Cf. .claude/plans/dumbledore-lux-aeterna.md.
const RIDDLES_LUMIERE = [
  {
    question: "Je chasse l'ombre sans jamais la toucher ; on me partage sans jamais me diviser ; plus on me donne, plus on en a. Que suis-je ?",
    choices: ["La flamme", "La lumière", "Le savoir", "La chaleur"],
    answer: 1
  },
  {
    question: "« Ce sont nos ______, bien plus que nos aptitudes, qui montrent ce que nous sommes vraiment. » Complète la phrase que j'aimais répéter.",
    choices: ["nos peurs", "nos rêves", "nos choix", "nos amis"],
    answer: 2
  },
  {
    question: "Quel sortilège n'est pas un mur mais une lumière, et réclame non du courage mais un souvenir heureux ?",
    choices: ["Protego", "Lumos Maxima", "Le Patronus", "Fiendfyre"],
    answer: 2
  }
];

// ============================================================
// ARTEFACTS & RELIQUAIRES 2.0 — socle data (Lot P0)
// ------------------------------------------------------------
// Voir .claude/plans/artifacts-reliquary-system.md.
// INERTE au runtime : registres + helper PUR, consommés par les lots
// suivants (P1 nouvelles formes, P2 Premium, P3 shops). Aucune mutation
// d'état au top-level → chargeable tel quel dans le sandbox de tests/units.js.
// ============================================================

// Archétypes visuels/sémantiques d'un artefact (futur champ `formType` sur
// les entrées ITEMS), ORTHOGONAUX au `slot` mécanique : on enrichit la fiction
// et le visuel sans créer de nouveau slot d'équipement (les 11 slots existants
// — wand/head/body/hands/feet/cloak/amulet/ring/belt/trinket — sont conservés).
// `slot` = destination mécanique par défaut de la forme (null pour un
// consommable). Source de vérité pour les badges de forme (UI) et les recettes
// d'icônes (tools/icon_factory.py).
const ARTIFACT_FORMS = {
  baguette:       { label: "Baguette",                slot: "wand",    icon: "🪄" },
  baton:          { label: "Bâton ancestral",         slot: "wand",    icon: "🌳" },
  orbe:           { label: "Orbe runique",            slot: "trinket", icon: "🔮" },
  cristal:        { label: "Cristal de focalisation", slot: "amulet",  icon: "💠" },
  cape:           { label: "Cape enchantée",          slot: "cloak",   icon: "🧥" },
  grimoire:       { label: "Grimoire flottant",       slot: "trinket", icon: "📖" },
  talisman:       { label: "Talisman des Fondateurs", slot: "amulet",  icon: "📿" },
  masque:         { label: "Masque rituel",           slot: "head",    icon: "🎭" },
  gantelets:      { label: "Gantelets de combat",     slot: "hands",   icon: "🥊" },
  anneau:         { label: "Anneau",                  slot: "ring",    icon: "💍" },
  relique_vocale: { label: "Relique vocale",          slot: "trinket", icon: "🗣️" },
  elixir_perma:   { label: "Élixir permanent",        slot: null,      icon: "⚗️" },
};

