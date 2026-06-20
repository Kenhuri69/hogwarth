// ============================================================
// ITEM ICONS — resolver d'icônes par item / type / status
// ============================================================
//
// Architecture pour permettre un enrichissement progressif :
//   1. ITEM_ICON_REGISTRY[item.id] = chemin PNG    → priorité 1 (per-item)
//   2. EQUIPMENT_SLOT_ICONS[item.type] = PNG       → priorité 2 (per-slot)
//   3. fallback emoji (item.icon)                  → priorité 3
//
// Phase 2 : seuls les slots génériques sont peuplés. Phase 4 ajoutera
// des entrées dans ITEM_ICON_REGISTRY pour chaque baguette/robe/etc.
// L'intégration UI ne change pas — tout passe par getItemIconHtml().

const EQUIPMENT_SLOT_ICONS = {
  // ── Slots historiques (PNG dédiés) ─────────────────────────
  wand:      'img/icons/wand.png',
  armor:     'img/icons/armor.png',
  acc:       'img/icons/accessory.png',
  spellbook: 'img/icons/spellbook.png',
  // ── Slots étendus (Phase 2 : aliasés sur PNG existants jusqu'à
  //    génération des sprites dédiés en Phase 4 — voir
  //    .claude/plans/equipment-extended.md §2.4 et §7) ──────────
  head:      'img/icons/accessory.png',
  body:      'img/icons/armor.png',
  hands:     'img/icons/accessory.png',
  feet:      'img/icons/accessory.png',
  cloak:     'img/icons/armor.png',
  amulet:    'img/icons/accessory.png',
  ring:      'img/icons/accessory.png',
  ring1:     'img/icons/accessory.png',
  ring2:     'img/icons/accessory.png',
  belt:      'img/icons/accessory.png',
  trinket:   'img/icons/accessory.png'
};

// Registre des icônes per-item (Phase 4 — peuplé pour tous les ITEMS[])
const ITEM_ICON_REGISTRY = {
  // Artefacts & Reliquaires 2.0 — P1 (plan §1.4 A/B). Repli legacy (PNG
  // painterly dédiés en priorité 1 dans ITEM_ICON_NEW_REGISTRY) : réutilise
  // un PNG legacy de famille proche pour la couverture.
  orbe_flamme:          'img/icons/items/amulette.png',
  orbe_givre:           'img/icons/items/amulette.png',
  orbe_runique:         'img/icons/items/amulette.png',
  cristal_focalisation: 'img/icons/items/amulette.png',
  talisman_fondateurs:  'img/icons/items/amulette.png',
  gantelets_combat:     'img/icons/items/gants_apprenti.png',
  gantelets_aurors:     'img/icons/items/gants_apprenti.png',
  baton_apprenti:       'img/icons/items/wand1.png',
  baton_ancestral:      'img/icons/items/wand2.png',
  cape_funambule:       'img/icons/items/cape_voyageur.png',
  masque_courage:       'img/icons/items/chapeau_pointu.png',
  masque_rituel:        'img/icons/items/chapeau_pointu.png',
  grimoire_flottant:    'img/icons/items/book_monsters.png',
  // Consommables
  potion_s:           'img/icons/items/potion_s.png',
  potion_m:           'img/icons/items/potion_m.png',
  // Chaîne de soin à paliers + Éclat (P4) — fallback legacy (PNG painterly
  // dédiés dans ITEM_ICON_NEW_REGISTRY).
  potion_soin_mineure:      'img/icons/items/potion_s.png',
  potion_soin_mineure_plus: 'img/icons/items/potion_s.png',
  potion_soin_mineure_pp:   'img/icons/items/potion_s.png',
  eclat_vitalite:           'img/icons/items/potion_s.png',
  // Versions "++" étage 5+ : réutilisent les PNG des petites en attendant
  // la génération de sprites dédiés via tools/gen_icons.py.
  potion_l:           'img/icons/items/potion_s.png',
  potion_l_sp:        'img/icons/items/potion_m.png',
  felix:              'img/icons/items/felix.png',
  potion_force:       'img/icons/items/potion_force.png',
  // Potions de buff P2 — fallback legacy (PNG painterly dans le new registry).
  potion_defense:     'img/icons/items/potion_m.png',
  elixir_celerite:    'img/icons/items/potion_m.png',
  potion_precision:   'img/icons/items/potion_force.png',
  elixir_puissance:   'img/icons/items/potion_m.png',
  mandragore:         'img/icons/items/mandragore.png',
  choco_sorcier:      'img/icons/items/choco_sorcier.png',
  // Baguettes / armes
  wand1:              'img/icons/items/wand1.png',
  wand2:              'img/icons/items/wand2.png',
  // Baguette d'If des Profondeurs (récompense Ollivander, Boucle) : rendue via
  // le système de tint `ebony` au runtime ; ce PNG sert de fallback/couverture.
  baguette_if_boucle: 'img/icons/items/wand2.png',
  // Récompenses Boucle (suivi 3) : le rendu réel passe par les PNG painterly
  // d'ITEM_ICON_NEW_REGISTRY (priorité 1) ; ces entrées satisfont la couverture.
  perle_mimi:            'img/icons_new/perle_mimi_64.png',
  cor_chasse:            'img/icons_new/cor_chasse_64.png',
  cape_soie_acromantule: 'img/icons_new/cape_soie_acromantule_64.png',
  plume_lockhart:        'img/icons_new/plume_lockhart_64.png',
  sword_gryff:        'img/icons/items/sword_gryff.png',
  // Armures
  robe1:              'img/icons/items/robe1.png',
  coupe_poufsouffle:  'img/icons/items/coupe_poufsouffle.png',
  // Mondes parallèles Phase H §6.10 — Set Voyageur. Painterly dédiés
  // (priorité 1 dans ITEM_ICON_NEW_REGISTRY). Ces alias legacy ne sont
  // jamais consommés mais satisfont la couverture 100 % du smoke test
  // (`covered = NEW || LEGACY || SVG`) et offrent un fallback PNG si
  // un futur path court-circuite NEW_REGISTRY.
  voyageur_diademe:   'img/icons/items/diademe_serdaigle.png',
  voyageur_cape:      'img/icons/items/cape_voyageur.png',
  voyageur_bottes:    'img/icons/items/bottes_dragon.png',
  voyageur_anneau:    'img/icons/items/anneau_runique.png',
  voyageur_amulette:  'img/icons/items/amulette.png',
  chapeau_pointu:     'img/icons/items/chapeau_pointu.png',
  // Accessoires
  amulette:           'img/icons/items/amulette.png',
  broom:              'img/icons/items/broom.png',
  locket_slytherin:   'img/icons/items/locket_slytherin.png',
  diademe_serdaigle:  'img/icons/items/diademe_serdaigle.png',
  cape_invis:         'img/icons/items/cape_invis.png',
  // Phase 3 extension — sprites dédiés générés par gen_icons.py
  // (gen_item_*, 48×48 RGBA pixel art, palette cohérente).
  gants_apprenti:      'img/icons/items/gants_apprenti.png',
  bottes_apprenti:     'img/icons/items/bottes_apprenti.png',
  chapeau_apprenti:    'img/icons/items/chapeau_apprenti.png',
  ceinture_cuir:       'img/icons/items/ceinture_cuir.png',
  anneau_argent:       'img/icons/items/anneau_argent.png',
  cape_voyageur:       'img/icons/items/cape_voyageur.png',
  // Lot E1 — uncommons : repli legacy (PNG existant réutilisé). serre_tete /
  // bottes_lestes / ceinture_etudiant ont aussi une icône painterly dédiée
  // (ITEM_ICON_NEW_REGISTRY, prioritaire) ; plastron/cape réutilisent (pas de
  // part SVG body/cloak — convention robe_combat/cape_combat).
  serre_tete_etude:    'img/icons/items/circlet_serdaigle.png',
  plastron_renforce:   'img/icons/items/robe1.png',
  bottes_lestes:       'img/icons/items/bottes_apprenti.png',
  cape_doublee:        'img/icons/items/cape_voyageur.png',
  ceinture_etudiant:   'img/icons/items/ceinture_cuir.png',
  ceinture_aurors:     'img/icons/items/ceinture_alchimiste.png',  // Lot E2 (repli)
  amulette_protection: 'img/icons/items/amulette_protection.png',
  circlet_serdaigle:   'img/icons/items/circlet_serdaigle.png',
  // Easter egg « Salle sur Demande » — réemploi du visuel circlet (cf. diademe_antique).
  tiare_poussiereuse:  'img/icons/items/circlet_serdaigle.png',
  anneau_runique:      'img/icons/items/anneau_runique.png',
  ceinture_alchimiste: 'img/icons/items/ceinture_alchimiste.png',
  bottes_dragon:       'img/icons/items/bottes_dragon.png',
  retourneur_temps:    'img/icons/items/retourneur_temps.png',
  // Cor du Pégase (equipment-bonuses-v2 Vague B) — fallback legacy ; le
  // rendu effectif passe par le PNG painterly d'ITEM_ICON_NEW_REGISTRY.
  cor_pegasse:         'img/icons/items/retourneur_temps.png',
  // Phase 3b — récompenses de quêtes PNJ
  anneau_resurrection: 'img/icons/items/anneau_resurrection.png',
  larmes_phenix:       'img/icons/items/larmes_phenix.png',
  // Phase 3c — équipements mid-game (réutilisent les PNG des variantes
  // rares en attendant la génération de sprites dédiés via gen_icons.py).
  gants_duelliste:     'img/icons/items/gants_apprenti.png',
  casque_aurore:       'img/icons/items/chapeau_pointu.png',
  ceinture_force:      'img/icons/items/ceinture_alchimiste.png',
  anneau_courage:      'img/icons/items/anneau_runique.png',
  bottes_silence:      'img/icons/items/bottes_dragon.png',
  talisman_tactique:   'img/icons/items/retourneur_temps.png',
  // Phase 3 — Tranche étage 8 « Le Seuil » : équipement Auror clandestin
  // Réutilisent les PNG des variantes rares en attendant des sprites dédiés.
  casque_auror:        'img/icons/items/chapeau_pointu.png',
  bottes_renforcees:   'img/icons/items/bottes_dragon.png',
  cape_combat:         'img/icons/items/cape_voyageur.png',
  anneau_anti_magie:   'img/icons/items/anneau_runique.png',
  potion_lune:         'img/icons/items/potion_m.png',
  // Phase 3 — Tranche étage 9 « Les Profondeurs » : équipement endgame mid
  diademe_antique:     'img/icons/items/circlet_serdaigle.png',
  bague_protection:    'img/icons/items/anneau_argent.png',
  robe_combat:         'img/icons/items/robe1.png',
  // Phase 3 — Tranche étage 10 « Le Précipice » : équipement antichambre Voldemort
  pectoral_auror:        'img/icons/items/robe1.png',
  larme_phenix_mineure:  'img/icons/items/larmes_phenix.png',
  grimoire_avance:       'img/icons/items/livre_sortileges.png',
  // Endgame — réutilisent les PNG existants en attendant la génération
  // de sprites dédiés via gen_icons.py. Cf. ENDGAME_PLAN.md §7.3/§7.10.
  potion_xl:           'img/icons/items/potion_s.png',
  potion_xl_sp:        'img/icons/items/potion_m.png',
  larme_phenix_pure:   'img/icons/items/larmes_phenix.png',
  cape_voldemort:      'img/icons/items/cape_invis.png',
  cendres_phenix:      'img/icons/items/larmes_phenix.png',
  oeil_basilic:        'img/icons/items/retourneur_temps.png',
  // Matériaux endgame (Tranche 2) — réutilisent les PNG existants.
  essence_tenebres:    'img/icons/items/larmes_phenix.png',
  page_grimoire:       'img/icons/items/livre_sortileges.png',
  essence_primordiale: 'img/icons/items/felix.png',
  // Items Tier 2 Maison (cf. .claude/plans/house-intermediate-tier.md) —
  // alias legacy vers le PNG du slot le plus proche. Le rendu effectif
  // passe par ITEM_ICON_NEW_REGISTRY (painterly, priorité 1 au runtime).
  brassard_lion:       'img/icons/items/gants_apprenti.png',
  anneau_serpent:      'img/icons/items/anneau_runique.png',
  plume_aigle:         'img/icons/items/retourneur_temps.png',
  ceinture_blaireau:   'img/icons/items/ceinture_cuir.png',
  // Items Tier 5 Maison (Tranche 2) — réutilisent les PNG des items Tier 4.
  lame_godric:         'img/icons/items/sword_gryff.png',
  bague_salazar:       'img/icons/items/locket_slytherin.png',
  bouclier_helga:      'img/icons/items/coupe_poufsouffle.png',
  codex_rowena:        'img/icons/items/diademe_serdaigle.png',
  // Sets Maison 2.0 — pièces #2/#3/#4. Les PNG painterly dédiés
  // (générés par tools/icon_factory.py) sont déclarés dans
  // ITEM_ICON_NEW_REGISTRY plus bas (priorité 1 au runtime). Les
  // entrées ci-dessous servent de fallback legacy si jamais le
  // _64.png échoue à charger (et satisfont la couverture 100 % du
  // smoke `scenarioItemIcons`).
  // Set du Lion (Gryffondor)
  heaume_vaillant:     'img/icons/items/chapeau_pointu.png',
  cape_godric:         'img/icons/items/cape_invis.png',
  coeur_lion:          'img/icons/items/locket_slytherin.png',
  // Reliques des Quêtes Signature de Maison — alias legacy (fallback +
  // couverture du test ; le rendu réel passe par ITEM_ICON_NEW_REGISTRY).
  banniere_godric:     'img/icons/items/sword_gryff.png',
  langue_de_plomb:     'img/icons/items/locket_slytherin.png',
  codex_rowena_eclat:  'img/icons/items/livre_sortileges.png',
  coeur_refuge:        'img/icons/items/coupe_poufsouffle.png',
  // Set du Serpent (Serpentard)
  pendentif_mamba:     'img/icons/items/locket_slytherin.png',
  cape_sibylline:      'img/icons/items/cape_invis.png',
  couronne_basilic:    'img/icons/items/diademe_serdaigle.png',
  // Set de l'Aigle (Serdaigle)
  manteau_encre:       'img/icons/items/cape_invis.png',
  oeil_aigle:          'img/icons/items/locket_slytherin.png',
  anneau_savoir:       'img/icons/items/anneau_runique.png',
  // Set du Blaireau (Poufsouffle)
  cape_loyaute:        'img/icons/items/cape_invis.png',
  coiffe_blaireau:     'img/icons/items/chapeau_pointu.png',
  medaillon_helga:     'img/icons/items/locket_slytherin.png',
  // Livres de sorts
  livre_sortileges:   'img/icons/items/livre_sortileges.png',
  livre_soin:         'img/icons/items/livre_soin.png',
  // livre_ferula : painterly dédié dans ITEM_ICON_NEW_REGISTRY (priorité 1) ;
  // alias legacy de secours + couverture smoke.
  livre_ferula:       'img/icons/items/livre_soin.png',
  book_monsters:      'img/icons/items/book_monsters.png',
  livre_prince:       'img/icons/items/livre_prince.png',
  livre_bombarda:     'img/icons/items/livre_bombarda.png',
  livre_patronum:     'img/icons/items/livre_patronum.png',
  livre_glacius:      'img/icons/items/livre_glacius.png',
  livre_fulgari:      'img/icons/items/livre_fulgari.png',
  livre_lumos_solem:  'img/icons/items/livre_lumos_solem.png',
  livre_sanguini:     'img/icons/items/livre_sanguini.png',
  livre_vampyrus:     'img/icons/items/livre_vampyrus.png',
  livre_taranta:      'img/icons/items/livre_taranta.png',
  livre_maledictus:   'img/icons/items/livre_maledictus.png',
  livre_crucio:       'img/icons/items/livre_crucio.png',
  livre_morsmordre:   'img/icons/items/livre_morsmordre.png',
  // Cf. .claude/plans/teleportation-spell.md — icône reprise du sort.
  livre_portus:       'img/icons/items/livre_portus.png',
  // Grimoires de zone (AoE) — fallback legacy ; PNG painterly dédiés
  // en priorité 1 dans ITEM_ICON_NEW_REGISTRY.
  livre_glacius_tempete: 'img/icons/items/livre_glacius.png',
  livre_fulgur_catena:   'img/icons/items/livre_fulgari.png',
  livre_lux_aeterna:     'img/icons/items/livre_lumos_solem.png',
  livre_nox_vorax:       'img/icons/items/livre_vampyrus.png',
  livre_diffindo_maxima: 'img/icons/items/book_monsters.png',
  livre_vulnera:         'img/icons/items/livre_soin.png',
  // Sinks endgame V1 (combo A+E) — alias legacy ; le rendu effectif
  // passe par les PNG painterly dans ITEM_ICON_NEW_REGISTRY (priorité 1).
  // Cf. .claude/plans/game-economy-gold-audit.md §5.6 + §7 Étape 6.
  elixir_perma_hp:       'img/icons/items/potion_s.png',
  elixir_perma_mp:       'img/icons/items/potion_m.png',
  pierre_ame:            'img/icons/items/amulette.png',
  grimoire_interdit:     'img/icons/items/livre_morsmordre.png',
  pendentif_ombre:       'img/icons/items/amulette_protection.png',
  reliquaire_lunaire:    'img/icons/items/coupe_poufsouffle.png',
  philtre_endurance:     'img/icons/items/potion_force.png',
  // Consommables à effet + équipement trade-off (réutilisent des PNG existants).
  elixir_antidote:       'img/icons/items/potion_s.png',
  elixir_regen:          'img/icons/items/potion_s.png',
  potion_resistance:     'img/icons/items/potion_m.png',
  lame_sanguinaire:      'img/icons/items/sword_gryff.png',
  armure_lourde:         'img/icons/items/robe1.png',
  anneau_furie:          'img/icons/items/anneau_runique.png',
  // Artefacts P2 — variantes Premium (repli legacy ; painterly/Gemini en
  // priorité 1 via ITEM_ICON_NEW_REGISTRY). Réutilise un PNG de famille proche.
  talisman_blaireau:                'img/icons/items/amulette.png',
  voix_godric_relique:              'img/icons/items/amulette.png',
  voix_salazar_relique:             'img/icons/items/amulette.png',
  voix_rowena_relique:              'img/icons/items/amulette.png',
  voix_helga_relique:               'img/icons/items/amulette.png',
  orbe_runique_premium_gryff:       'img/icons/items/amulette.png',
  masque_rituel_premium_slyth:      'img/icons/items/chapeau_pointu.png',
  baton_ancestral_premium_serd:     'img/icons/items/wand2.png',
  talisman_fondateurs_premium_pouf: 'img/icons/items/amulette.png'
};

// Mapping painterly pipeline (étape 9 — voir SVG_PLAN / tools/icon_factory.py)
const ITEM_ICON_NEW_REGISTRY = {
  // Récompenses des quêtes de PNJ en Boucle (suivi 3) — PNG painterly dédiés.
  perle_mimi:            'img/icons_new/perle_mimi_64.png',
  cor_chasse:            'img/icons_new/cor_chasse_64.png',
  cape_soie_acromantule: 'img/icons_new/cape_soie_acromantule_64.png',
  plume_lockhart:        'img/icons_new/plume_lockhart_64.png',
  // Artefacts & Reliquaires 2.0 — P3.3b reliques vocales (§1.4 C).
  voix_godric_relique:  'img/icons_new/voix_godric_relique_64.png',
  voix_salazar_relique: 'img/icons_new/voix_salazar_relique_64.png',
  voix_rowena_relique:  'img/icons_new/voix_rowena_relique_64.png',
  voix_helga_relique:   'img/icons_new/voix_helga_relique_64.png',
  // Artefacts & Reliquaires 2.0 — P3 forme défensive Poufsouffle.
  talisman_blaireau:    'img/icons_new/talisman_blaireau_64.png',
  // Artefacts & Reliquaires 2.0 — P2 variantes Premium par Maison.
  orbe_runique_premium_gryff:       'img/icons_new/orbe_runique_premium_gryff_64.png',
  masque_rituel_premium_slyth:      'img/icons_new/masque_rituel_premium_slyth_64.png',
  baton_ancestral_premium_serd:     'img/icons_new/baton_ancestral_premium_serd_64.png',
  talisman_fondateurs_premium_pouf: 'img/icons_new/talisman_fondateurs_premium_pouf_64.png',
  // Artefacts & Reliquaires 2.0 — P1 nouvelles formes (plan §1.4 A/B).
  orbe_flamme:          'img/icons_new/orbe_flamme_64.png',
  orbe_givre:           'img/icons_new/orbe_givre_64.png',
  orbe_runique:         'img/icons_new/orbe_runique_64.png',
  cristal_focalisation: 'img/icons_new/cristal_focalisation_64.png',
  gantelets_combat:     'img/icons_new/gantelets_combat_64.png',
  gantelets_aurors:     'img/icons_new/gantelets_aurors_64.png',
  baton_apprenti:       'img/icons_new/baton_apprenti_64.png',
  baton_ancestral:      'img/icons_new/baton_ancestral_64.png',
  cape_funambule:       'img/icons_new/cape_funambule_64.png',
  masque_courage:       'img/icons_new/masque_courage_64.png',
  masque_rituel:        'img/icons_new/masque_rituel_64.png',
  grimoire_flottant:    'img/icons_new/grimoire_flottant_64.png',
  talisman_fondateurs:  'img/icons_new/talisman_fondateurs_64.png',
  potion_s:             'img/icons_new/potion_s_64.png',
  felix:                'img/icons_new/felix_64.png',
  wand2:                'img/icons_new/wand2_64.png',
  anneau_runique:       'img/icons_new/anneau_runique_64.png',
  livre_sortileges:     'img/icons_new/livre_sortileges_64.png',
  potion_m:             'img/icons_new/potion_m_64.png',
  potion_soin_mineure:      'img/icons_new/potion_soin_mineure_64.png',
  potion_soin_mineure_plus: 'img/icons_new/potion_soin_mineure_plus_64.png',
  potion_soin_mineure_pp:   'img/icons_new/potion_soin_mineure_pp_64.png',
  eclat_vitalite:           'img/icons_new/eclat_vitalite_64.png',
  eclat_voute:              'img/icons_new/eclat_voute_64.png',
  potion_force:         'img/icons_new/potion_force_64.png',
  potion_defense:       'img/icons_new/potion_defense_64.png',
  elixir_celerite:      'img/icons_new/elixir_celerite_64.png',
  potion_precision:     'img/icons_new/potion_precision_64.png',
  elixir_puissance:     'img/icons_new/elixir_puissance_64.png',
  potion_resistance:    'img/icons_new/potion_resistance_64.png',
  larmes_phenix:        'img/icons_new/larmes_phenix_64.png',
  wand1:                'img/icons_new/wand1_64.png',
  livre_soin:           'img/icons_new/livre_soin_64.png',
  livre_ferula:         'img/icons_new/livre_ferula_64.png',
  book_monsters:        'img/icons_new/book_monsters_64.png',
  livre_prince:         'img/icons_new/livre_prince_64.png',
  livre_bombarda:       'img/icons_new/livre_bombarda_64.png',
  livre_patronum:       'img/icons_new/livre_patronum_64.png',
  livre_sanguini:       'img/icons_new/livre_sanguini_64.png',
  livre_vampyrus:       'img/icons_new/livre_vampyrus_64.png',
  livre_taranta:        'img/icons_new/livre_taranta_64.png',
  livre_maledictus:     'img/icons_new/livre_maledictus_64.png',
  livre_crucio:         'img/icons_new/livre_crucio_64.png',
  livre_morsmordre:     'img/icons_new/livre_morsmordre_64.png',
  livre_glacius:        'img/icons_new/livre_glacius_64.png',
  livre_fulgari:        'img/icons_new/livre_fulgari_64.png',
  livre_lumos_solem:    'img/icons_new/livre_lumos_solem_64.png',
  livre_glacius_tempete:'img/icons_new/livre_glacius_tempete_64.png',
  livre_fulgur_catena:  'img/icons_new/livre_fulgur_catena_64.png',
  livre_lux_aeterna:    'img/icons_new/livre_lux_aeterna_64.png',
  livre_nox_vorax:      'img/icons_new/livre_nox_vorax_64.png',
  livre_diffindo_maxima:'img/icons_new/livre_diffindo_maxima_64.png',
  livre_vulnera:        'img/icons_new/livre_vulnera_64.png',
  amulette:             'img/icons_new/amulette_64.png',
  amulette_protection:  'img/icons_new/amulette_protection_64.png',
  locket_slytherin:     'img/icons_new/locket_slytherin_64.png',
  robe1:                'img/icons_new/robe1_64.png',
  cape_voyageur:        'img/icons_new/cape_voyageur_64.png',
  cape_invis:           'img/icons_new/cape_invis_64.png',
  anneau_argent:        'img/icons_new/anneau_argent_64.png',
  anneau_resurrection:  'img/icons_new/anneau_resurrection_64.png',
  sword_gryff:          'img/icons_new/sword_gryff_64.png',
  broom:                'img/icons_new/broom_64.png',
  bottes_apprenti:      'img/icons_new/bottes_apprenti_64.png',
  bottes_dragon:        'img/icons_new/bottes_dragon_64.png',
  gants_apprenti:       'img/icons_new/gants_apprenti_64.png',
  // Lot E1 — icônes painterly dédiées (tiara / boot / belt)
  serre_tete_etude:     'img/icons_new/serre_tete_etude_64.png',
  bottes_lestes:        'img/icons_new/bottes_lestes_64.png',
  ceinture_etudiant:    'img/icons_new/ceinture_etudiant_64.png',
  ceinture_aurors:      'img/icons_new/ceinture_aurors_64.png',   // Lot E2
  // Art raster bespoke (LLM image) — plastron/cape passent du repli legacy
  // à une icône dédiée icons_new.
  plastron_renforce:    'img/icons_new/plastron_renforce_64.png',
  cape_doublee:         'img/icons_new/cape_doublee_64.png',
  ceinture_cuir:        'img/icons_new/ceinture_cuir_64.png',
  ceinture_alchimiste:  'img/icons_new/ceinture_alchimiste_64.png',
  chapeau_apprenti:     'img/icons_new/chapeau_apprenti_64.png',
  chapeau_pointu:       'img/icons_new/chapeau_pointu_64.png',
  circlet_serdaigle:    'img/icons_new/circlet_serdaigle_64.png',
  diademe_serdaigle:    'img/icons_new/diademe_serdaigle_64.png',
  tiare_poussiereuse:   'img/icons_new/tiare_poussiereuse_64.png',
  coupe_poufsouffle:    'img/icons_new/coupe_poufsouffle_64.png',
  retourneur_temps:     'img/icons_new/retourneur_temps_64.png',
  cor_pegasse:          'img/icons_new/cor_pegasse_64.png',
  mandragore:           'img/icons_new/mandragore_64.png',
  choco_sorcier:        'img/icons_new/choco_sorcier_64.png',
  // Tier 2 Maison (cf. .claude/plans/house-intermediate-tier.md)
  brassard_lion:        'img/icons_new/brassard_lion_64.png',
  anneau_serpent:       'img/icons_new/anneau_serpent_64.png',
  plume_aigle:          'img/icons_new/plume_aigle_64.png',
  ceinture_blaireau:    'img/icons_new/ceinture_blaireau_64.png',
  // Sets de Maison 2.0 — pièces #2/#3/#4 (cf. .claude/plans/houses-2.0.md §B)
  // Générées via `python3 tools/icon_factory.py <id…>` — recettes dans
  // tools/icon_factory.py, emblème de Maison via accent symbol.
  // Set du Lion (Gryffondor)
  heaume_vaillant:      'img/icons_new/heaume_vaillant_64.png',
  cape_godric:          'img/icons_new/cape_godric_64.png',
  coeur_lion:           'img/icons_new/coeur_lion_64.png',
  // Reliques des Quêtes Signature de Maison (painterly, priorité runtime)
  banniere_godric:      'img/icons_new/banniere_godric_64.png',
  langue_de_plomb:      'img/icons_new/langue_de_plomb_64.png',
  codex_rowena:         'img/icons_new/codex_rowena_64.png',
  // Récompense Quête Signature Serdaigle (epic) — id distinct du legendary
  // Tier-5 `codex_rowena` ; réutilise l'art painterly existant.
  codex_rowena_eclat:   'img/icons_new/codex_rowena_64.png',
  coeur_refuge:         'img/icons_new/coeur_refuge_64.png',
  // Set du Serpent (Serpentard)
  pendentif_mamba:      'img/icons_new/pendentif_mamba_64.png',
  cape_sibylline:       'img/icons_new/cape_sibylline_64.png',
  couronne_basilic:     'img/icons_new/couronne_basilic_64.png',
  // Set de l'Aigle (Serdaigle)
  manteau_encre:        'img/icons_new/manteau_encre_64.png',
  oeil_aigle:           'img/icons_new/oeil_aigle_64.png',
  anneau_savoir:        'img/icons_new/anneau_savoir_64.png',
  // Set du Blaireau (Poufsouffle)
  cape_loyaute:         'img/icons_new/cape_loyaute_64.png',
  coiffe_blaireau:      'img/icons_new/coiffe_blaireau_64.png',
  medaillon_helga:      'img/icons_new/medaillon_helga_64.png',
  // Équipements mid-game (cf. .claude/plans/difficulty-polish-v3.md Vague A)
  gants_duelliste:      'img/icons_new/gants_duelliste_64.png',
  casque_aurore:        'img/icons_new/casque_aurore_64.png',
  ceinture_force:       'img/icons_new/ceinture_force_64.png',
  anneau_courage:       'img/icons_new/anneau_courage_64.png',
  bottes_silence:       'img/icons_new/bottes_silence_64.png',
  talisman_tactique:    'img/icons_new/talisman_tactique_64.png',
  // Sinks endgame V1 (combo A+E) — cf. game-economy-gold-audit.md §5.6 + §7 Étape 6.
  elixir_perma_hp:      'img/icons_new/elixir_perma_hp_64.png',
  elixir_perma_mp:      'img/icons_new/elixir_perma_mp_64.png',
  pierre_ame:           'img/icons_new/pierre_ame_64.png',
  grimoire_interdit:    'img/icons_new/grimoire_interdit_64.png',
  pendentif_ombre:      'img/icons_new/pendentif_ombre_64.png',
  reliquaire_lunaire:   'img/icons_new/reliquaire_lunaire_64.png',
  philtre_endurance:    'img/icons_new/philtre_endurance_64.png',
  // Mondes parallèles Phase H §6.10 — Set du Voyageur (5 pièces).
  // Painterly multi-tailles via tools/icon_factory.py. Palette violet
  // astral + or pâle, distincte des sets Maison.
  voyageur_diademe:     'img/icons_new/voyageur_diademe_64.png',
  voyageur_cape:        'img/icons_new/voyageur_cape_64.png',
  voyageur_bottes:      'img/icons_new/voyageur_bottes_64.png',
  voyageur_anneau:      'img/icons_new/voyageur_anneau_64.png',
  voyageur_amulette:    'img/icons_new/voyageur_amulette_64.png'
};

// Status effects (battle.js consomme ce registre via STATUS_DEFS[id].iconSrc)
const STATUS_ICON_REGISTRY = {
  burn:             'img/icons/burn.png',
  poison:           'img/icons/poison.png',
  bleed:            'img/icons/bleed.png',
  gel:              'img/icons/gel.png',
  weaken:           'img/icons/weaken.png',
  protego:          'img/icons/protego.png',
  disarm:           'img/icons/disarm.png',
  regen:            'img/icons/regen.png',
  regen_ferula_max: 'img/icons/regen_ferula_max.png',
  stun:             'img/icons/stun.png',
  fear:             'img/icons/fear.png',
  imperius:         'img/icons/imperius.png',
  heal:             'img/icons/heal.png',
  dead:             'img/icons/dead.png',
  // Buffs de stat & Résistance : icône = la stat impactée (cf.
  // BUFF_STAT_BY_ID, battle.js). PNG existants — pas d'asset dédié.
  // `buff_lck` réutilise xp.png (convention luck du jeu : la fiche perso
  // affiche Chance/Fortune avec xp.png). resist_buff → bouclier de
  // déflexion bleu (resist.png), distinct de def/protego.
  buff_atk:         'img/icons/atk.png',
  buff_def:         'img/icons/def.png',
  buff_agi:         'img/icons/agi.png',
  buff_lck:         'img/icons/xp.png',
  buff_mag:         'img/icons/mag.png',
  resist_buff:      'img/icons/resist.png'
};

// Sortilèges (priorité 1 par nom canonique, fallback emoji icon)
const SPELL_ICON_REGISTRY = {
  'Expelliarmus':       'img/icons/spells/expelliarmus.png',
  'Stupefix':           'img/icons/spells/stupefix.png',
  'Episkey':            'img/icons/spells/episkey.png',
  'Ferula':             'img/icons/spells/ferula.png',
  'Ferula Maxima':      'img/icons/spells/ferula_maxima.png',
  'Protego':            'img/icons/spells/protego.png',
  'Incendio':           'img/icons/spells/incendio.png',
  'Incendio Majeur':    'img/icons/spells/incendio.png',  // forme évoluée (synergie P1) — réutilise l'icône feu
  'Accio':              'img/icons/spells/accio.png',
  'Wingardium Leviosa': 'img/icons/spells/wingardium_leviosa.png',
  'Diffindo':           'img/icons/spells/diffindo.png',
  'Reparo':             'img/icons/spells/reparo.png',
  'Sectumsempra':       'img/icons/spells/sectumsempra.png',
  'Lumos Maxima':       'img/icons/spells/lumos_maxima.png',
  'Aguamenti':          'img/icons/spells/aguamenti.png',
  'Bombarda':           'img/icons/spells/bombarda.png',
  'Riddikulus':         'img/icons/spells/riddikulus.png',
  'Alohomora':          'img/icons/spells/alohomora.png',
  'Patronum':           'img/icons/spells/patronum.png',
  'Avada...':           'img/icons/spells/avada.png',
  'Sanguini':           'img/icons/spells/sanguini.png',
  'Vampyrus':           'img/icons/spells/vampyrus.png',
  'Tarantallegra':      'img/icons/spells/tarantallegra.png',
  'Maledictus':         'img/icons/spells/maledictus.png',
  'Crucio':             'img/icons/spells/crucio.png',
  'Morsmordre':         'img/icons/spells/morsmordre.png',
  'Portus':             'img/icons/spells/teleportation.png',
  'Revelio':            'img/icons/spells/revelio.png',
  'Glacius':            'img/icons/spells/glacius.png',
  'Fulgari':            'img/icons/spells/fulgari.png',
  'Lumos Solem':        'img/icons/spells/lumos_solem.png',
  // Sorts de Maison — palier 17 « Mythe »
  'Patronus Maxima':       'img/icons/spells/patronus_maxima.png',
  'Sectumsempra Imperius': 'img/icons/spells/sectumsempra_imperius.png',
  'Legilimens':            'img/icons/spells/legilimens.png',
  'Récolte Magique':       'img/icons/spells/recolte_magique.png',
  // Sorts de zone (AoE) — PNG dédiés (tools/gen_element_spell_icons.py).
  'Glacius Tempête':       'img/icons/spells/glacius_tempete.png',
  'Fulgur Catena':         'img/icons/spells/fulgur_catena.png',
  'Lux Aeterna':           'img/icons/spells/lux_aeterna.png',
  'Nox Vorax':             'img/icons/spells/nox_vorax.png',
  'Diffindo Maxima':       'img/icons/spells/diffindo_maxima.png',
  'Vulnera Sanentur':      'img/icons/spells/vulnera_sanentur.png',
  // Sort exclusif endgame (Grimoire Interdit) — sinks A+E. PNG dédié
  // généré par tools/gen_element_spell_icons.py (Feu Maudit : flammes
  // crimson + escarbilles ascendantes, plus sombre que Incendio).
  'Fiendfyre':             'img/icons/spells/fiendfyre.png',
  // Cheminette Inter-Mondes (V1a Phase A — parallel-worlds.md §4).
  // PNG dédié généré par tools/gen_floo_icon.py : flammes vertes
  // torsadées + 4 runes dorées en cardinal. Palette distincte de
  // teleportation.png (Portus, vortex violet) pour éviter la confusion.
  'Cheminette Inter-Mondes': 'img/icons/spells/cheminette_inter_mondes.png',
  // Verrou de Sang (V1c Phase H — parallel-worlds.md §6.9). PNG dédié
  // généré par tools/gen_blood_seal_icon.py : sceau circulaire écarlate
  // + or pâle, 4 runes triangulaires aux cardinaux pointant vers le
  // centre. Palette distincte de Cheminette (rouge sang vs. vert flamme)
  // pour signaler l'engagement contractuel violent vs. le voyage paisible.
  'Verrou de Sang': 'img/icons/spells/verrou_de_sang.png',
  // V1c.1 §6.10 — sorts exclusifs cross-plan (achetés à l'Atelier).
  // Pas d'icônes PNG dédiées pour le MVP V1c.1 — alias temporaires
  // sur des PNG existants thématiquement proches. À régénérer via
  // tools/gen_*.py dans une vague future si l'usage le justifie.
  'Sceau du Voyageur':     'img/icons/spells/verrou_de_sang.png',
  "Mémoire d'Outremonde":  'img/icons/spells/cheminette_inter_mondes.png',
  'Marque du Pèlerin':     'img/icons/spells/cheminette_inter_mondes.png',
  'Rappel Astral':         'img/icons/spells/cheminette_inter_mondes.png',
  // ── Sorts & Magie 2.0 Lot P2 — alias temporaires sur PNG existants
  // thématiquement proches (même approche que les sorts cross-plan ci-dessus).
  // À régénérer en art dédié dans un lot ultérieur (plan §2.8). ──
  'Resonare':          'img/icons/spells/revelio.png',          // révélation
  'Éclat de Voûte':    'img/icons/spells/nox_vorax.png',        // projectile ténèbres
  'Sceau des Quatre':  'img/icons/spells/protego.png',          // bouclier
  'Avis Praesidium':   'img/icons/spells/patronum.png',         // familier lumineux
  'Patronus Corporel': 'img/icons/spells/patronus_maxima.png',  // Patronus
  'Fontis':            'img/icons/spells/aguamenti.png',        // eau
  'Purgo':             'img/icons/spells/lumos_solem.png',      // purification
  'Aedificium':        'img/icons/spells/reparo.png'            // édification
};

// ── Registre d'icônes SVG inline (herbes + potions) ──────────
// Voir .claude/plans/farming-potion-system.md. Consulté EN PREMIER
// par getItemIconHtml() : si l'id y figure, on rend le SVG inline.
// Sinon, comportement inchangé (PNG painterly → PNG legacy → emoji).
// Chaque <clipPath> porte un id unique pour éviter les collisions
// quand plusieurs icônes sont inlinées sur la même page.
const ITEM_ICON_SVG_REGISTRY = {
  herbe_armoise: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 56 L32 14" stroke="#3c7a2e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 44 Q18 40 14 28 Q26 30 32 42 Z" fill="#5fae3f"/><path d="M32 44 Q46 40 50 28 Q38 30 32 42 Z" fill="#6fbf4a"/><path d="M32 32 Q20 28 17 18 Q28 21 32 31 Z" fill="#5fae3f"/><path d="M32 32 Q44 28 47 18 Q36 21 32 31 Z" fill="#6fbf4a"/><path d="M32 20 Q26 14 32 7 Q38 14 32 20 Z" fill="#7fce5a"/></svg>`,
  herbe_ortie: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 56 L32 16" stroke="#5a6b2a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 40 L16 34 L22 32 L14 26 L24 26 L20 19 L30 24 L32 38 Z" fill="#6e7d33"/><path d="M32 40 L48 34 L42 32 L50 26 L40 26 L44 19 L34 24 L32 38 Z" fill="#828f3f"/><path d="M32 24 L24 18 L29 16 L24 10 L32 13 L40 10 L35 16 L40 18 Z" fill="#909a4a"/></svg>`,
  herbe_asphodele: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 58 L32 20" stroke="#2f8f7e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 46 Q22 44 20 36 Q30 38 32 44 Z" fill="#3aa890"/><path d="M32 40 Q42 38 44 30 Q34 32 32 38 Z" fill="#3aa890"/><g fill="#eef6f2"><circle cx="32" cy="16" r="6.5"/><circle cx="22" cy="24" r="5"/><circle cx="42" cy="22" r="5"/></g><g fill="#ffd24a"><circle cx="32" cy="16" r="2.2"/><circle cx="22" cy="24" r="1.7"/><circle cx="42" cy="22" r="1.7"/></g></svg>`,
  herbe_branchiflore: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-width="4.2" stroke-linecap="round"><path d="M32 58 Q22 46 30 36 Q40 26 30 13" stroke="#2a8d9d"/><path d="M32 58 Q42 46 34 36 Q26 26 36 13" stroke="#37a7b5"/><path d="M32 50 Q24 42 30 31" stroke="#52c8d2"/></g></svg>`,
  herbe_aconit: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 58 L32 26" stroke="#3c6a3e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 40 Q22 38 20 30 Q30 32 32 38 Z" fill="#4c8a4e"/><path d="M32 40 Q42 38 44 30 Q34 32 32 38 Z" fill="#5c9a5e"/><g fill="#7a3a9d"><path d="M32 27 Q23 25 25 15 Q32 18 32 27 Z"/><path d="M32 27 Q41 25 39 15 Q32 18 32 27 Z"/></g><g fill="#9a5abd"><path d="M32 18 Q26 16 28 7 Q33 11 32 18 Z"/><path d="M32 18 Q38 16 36 7 Q31 11 32 18 Z"/></g></svg>`,
  herbe_dictame: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 58 L32 24" stroke="#6a7a5a" stroke-width="3" fill="none" stroke-linecap="round"/><g><circle cx="21" cy="35" r="9.5" fill="#b89ac8"/><circle cx="44" cy="31" r="9.5" fill="#c8aad8"/><circle cx="32" cy="17" r="9.5" fill="#d8bae8"/></g><g fill="#9a7aaa" opacity="0.55"><circle cx="21" cy="35" r="4"/><circle cx="44" cy="31" r="4"/><circle cx="32" cy="17" r="4"/></g></svg>`,
  // Palier 4 — asphodèle corrompue : fleurs fanées, teinte ténèbres (violet
  // sombre + cœur noir), tige flétrie. Miroir sombre de l'asphodèle (tier 2).
  herbe_asphodele_noire: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 58 L32 20" stroke="#2a1838" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 46 Q22 46 20 38 Q30 39 32 45 Z" fill="#4a2a6a"/><path d="M32 41 Q42 41 44 33 Q34 34 32 40 Z" fill="#3a1f56"/><g fill="#5a3a7a"><circle cx="32" cy="16" r="6.5"/><circle cx="22" cy="24" r="5"/><circle cx="42" cy="22" r="5"/></g><g fill="#1a0a2a"><circle cx="32" cy="16" r="2.4"/><circle cx="22" cy="24" r="1.8"/><circle cx="42" cy="22" r="1.8"/></g></svg>`,
  potion_s: _potionSvg('cl_ps', 40, '#d83a3a', '#f06a6a', '#b07a3a'),
  potion_m: _potionSvg('cl_pm', 40, '#9a3ad8', '#b86ae0', '#b07a3a'),
  potion_l: _potionSvg('cl_pl', 33, '#d83a3a', '#f06a6a', '#b07a3a'),
  potion_l_sp: _potionSvg('cl_plsp', 33, '#9a3ad8', '#b86ae0', '#b07a3a'),
  potion_force: _potionSvg('cl_pf', 33, '#e8862a', '#f4a85a', '#b07a3a'),
  // Flacons offensifs (P6.c) — fioles teintées par élément/rôle.
  flacon_feu:   _potionSvg('cl_ffeu', 33, '#e8421a', '#ff7a3a', '#7a3a1a'),
  flacon_givre: _potionSvg('cl_fgiv', 33, '#2aa8d8', '#7ad6f0', '#5a6a7a'),
  flacon_venin: _potionSvg('cl_fven', 33, '#4aa82a', '#8ad65a', '#3a5a2a'),
  // Flacons à dispersion (AOE) — teinte vive + éclat pour signaler la zone.
  flacon_deflagration:  _potionSvg('cl_fdef', 40, '#e85a14', '#ffb04a', '#7a2a0a', true),
  flacon_brume_toxique: _potionSvg('cl_fbru', 40, '#6aa82a', '#aee05a', '#3a4a1a', true),
  potion_xl: _potionSvg('cl_pxl', 27, '#e8324a', '#ff6a78', '#e8c14a', true),
  // Éclat de Lumière (objet de quête — dumbledore_lumiere) : étoile de
  // clarté à 4 branches, halo doux. SVG inline (pas de PNG dédié).
  eclat_lumiere: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="21" fill="#fff3b0" opacity="0.28"/><path d="M32 5 L38 26 L59 32 L38 38 L32 59 L26 38 L5 32 L26 26 Z" fill="#ffe98a"/><path d="M32 15 L36 28 L49 32 L36 36 L32 49 L28 36 L15 32 L28 28 Z" fill="#fff7d8"/><circle cx="32" cy="32" r="3.6" fill="#ffffff"/></svg>`,
  // Éclat de la Clé de Voûte (fil rouge — eclats_clef_voute) : fragment de
  // cristal/pierre givré, facettes bleu glacé. Fallback vectoriel ; le rendu
  // painterly PNG (img/icons_new/eclat_voute_*) reste prioritaire en jeu.
  eclat_voute: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="34" r="20" fill="#aaccee" opacity="0.22"/><path d="M32 6 L46 24 L40 52 L24 50 L18 26 Z" fill="#9cc3e8"/><path d="M32 6 L46 24 L34 30 Z" fill="#cfe6fa"/><path d="M32 6 L34 30 L18 26 Z" fill="#bcd9f2"/><path d="M34 30 L40 52 L24 50 Z" fill="#7fb0db"/><path d="M18 26 L34 30 L24 50 Z" fill="#6fa3d0"/><path d="M32 6 L34 30" stroke="#eaf6ff" stroke-width="1.2" fill="none" opacity="0.85"/></svg>`,
  // Le récit de Manon (objet de quête, chaîne manon_confier → memoire_lockhart) :
  // un parchemin roulé, scellé d'un ruban lunaire.
  recit_manon: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="10" width="32" height="44" rx="3" fill="#e8d9b0"/><rect x="16" y="10" width="32" height="44" rx="3" fill="none" stroke="#b89b63" stroke-width="1.5"/><path d="M22 20 H42 M22 27 H42 M22 34 H38 M22 41 H40" stroke="#9c8048" stroke-width="1.4" fill="none" opacity="0.8"/><path d="M12 14 a4 4 0 0 1 4 -4 v44 a4 4 0 0 0 -4 4 Z" fill="#cdb985"/><path d="M52 14 a4 4 0 0 0 -4 -4 v44 a4 4 0 0 1 4 4 Z" fill="#cdb985"/><circle cx="32" cy="50" r="5" fill="#7c6cae"/><path d="M30 49 a2 2 0 1 1 4 0 a2 2 0 1 1 -4 0" fill="#cfc4ec"/></svg>`,
  // Clé du Donjon (salle scellée §2.C) : clé de fer à anneau et panneton.
  cle_donjon: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(45 32 32)"><circle cx="32" cy="17" r="9" fill="none" stroke="#c9a23c" stroke-width="5"/><circle cx="32" cy="17" r="3.2" fill="#3a2c12"/><rect x="29.5" y="24" width="5" height="27" fill="#d4af45"/><rect x="34.5" y="40" width="8" height="4.5" fill="#d4af45"/><rect x="34.5" y="47" width="6" height="4.5" fill="#d4af45"/></g></svg>`,
};

// Génère le SVG d'une fiole : `liqY` = niveau du liquide (y, plus petit
// = plus rempli), `liq`/`liq2` couleurs, `cap` couleur du bouchon,
// `sparkle` ajoute des étincelles (potion suprême).
function _potionSvg(clipId, liqY, liq, liq2, cap, sparkle) {
  const body = 'M27 25 L27 31 A17 17 0 1 0 37 31 L37 25 Z';
  const stars = sparkle
    ? '<g fill="#fff7d0"><circle cx="45" cy="19" r="1.8"/><circle cx="19" cy="45" r="1.4"/></g>'
    : '';
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">`
    + `<defs><clipPath id="${clipId}"><path d="${body}"/></clipPath></defs>`
    + `<path d="${body}" fill="#1a2230" opacity="0.22"/>`
    + `<g clip-path="url(#${clipId})"><rect x="10" y="${liqY}" width="44" height="44" fill="${liq}"/>`
    + `<ellipse cx="32" cy="${liqY}" rx="14" ry="3" fill="${liq2}"/></g>`
    + `<path d="${body}" fill="none" stroke="#d6e4ee" stroke-width="2.4"/>`
    + `<rect x="27" y="12" width="10" height="14" fill="none" stroke="#d6e4ee" stroke-width="2.4"/>`
    + `<rect x="24" y="7" width="16" height="8" rx="2.5" fill="${cap}"/>`
    + `<ellipse cx="25" cy="40" rx="2.6" ry="7" fill="#ffffff" opacity="0.4"/>`
    + stars
    + `</svg>`;
}

// ── API publique ────────────────────────────────────────────

function getItemIconSrc(item) {
  if (!item) return null;
  // Painterly pipeline (étape 9) — prioritaire si l'item y figure
  if (item.id && ITEM_ICON_NEW_REGISTRY[item.id]) return ITEM_ICON_NEW_REGISTRY[item.id];
  if (item.id && ITEM_ICON_REGISTRY[item.id]) return ITEM_ICON_REGISTRY[item.id];
  if (item.type && EQUIPMENT_SLOT_ICONS[item.type]) return EQUIPMENT_SLOT_ICONS[item.type];
  return null;
}

// Retourne soit un <img> HTML, soit l'emoji item.icon en fallback.
// Sécurise les noms d'item (escape minimal sur ").
// Si l'item porte un champ `tint` (ex: variante par teinte), applique
// un drop-shadow coloré pour différencier visuellement les variantes
// d'une même famille — voir .claude/plans/equipment-extended.md §2.4.
function getItemIconHtml(item, sizeClass) {
  const cls = sizeClass || 'ui-icon-md';
  // SVG inline dédié (herbes, potions) — priorité absolue.
  if (item && item.id
      && typeof ITEM_ICON_SVG_REGISTRY !== 'undefined'
      && ITEM_ICON_SVG_REGISTRY[item.id]) {
    return `<span class="ui-icon svg-icon ${cls}">${ITEM_ICON_SVG_REGISTRY[item.id]}</span>`;
  }
  // Le pipeline painterly (étape 9) supplante le système tinted 2-calques
  // pour les items mappés : si l'id figure dans ITEM_ICON_NEW_REGISTRY,
  // on utilise directement le PNG painterly (déjà coloré par recipe).
  const hasPainterly = item && item.id
    && typeof ITEM_ICON_NEW_REGISTRY !== 'undefined'
    && ITEM_ICON_NEW_REGISTRY[item.id];
  // Architecture tint 2-calques : si l'item a `tinted: true` et déclare
  // un blade (silhouette teintable) + un hilt (overlay détails fixes),
  // on rend un wrapper <span> avec deux layers superposés. Voir
  // css/style.css `.tinted-icon` et img/icons/_tint_demo.html.
  if (item && item.tinted && !hasPainterly) {
    const html = _getTintedItemHtml(item, cls);
    if (html) return html;
  }
  const src = getItemIconSrc(item);
  const tint = item && item.tint;
  // Style inline ne sécurise QUE les couleurs hex bien formées (#abc / #abcdef)
  // — toute autre valeur de `tint` est ignorée pour éviter une injection CSS.
  const safeTint = (tint && /^#[0-9a-f]{3,8}$/i.test(tint)) ? tint : null;
  const tintAttr = safeTint
    ? ` style="filter: drop-shadow(0 0 1px ${safeTint}) drop-shadow(0 0 3px ${safeTint});"`
    : '';
  if (src) {
    const alt = (item && item.name ? item.name : '').replace(/"/g, '&quot;');
    return `<img class="ui-icon ${cls}" src="${src}" alt="${alt}"${tintAttr}>`;
  }
  if (item && item.icon) {
    return safeTint
      ? `<span class="ui-icon-emoji"${tintAttr}>${item.icon}</span>`
      : item.icon;
  }
  return '';
}

// Tint 2-calques : produit le wrapper HTML pour un item à variantes
// (métaux, bois, ...). Refuse silencieusement (retourne null → fallback
// path normal) si les valeurs ne passent pas la whitelist anti-injection
// CSS. Les noms `tintMask` / `tintOverlay` correspondent aux deux PNG
// sources (silhouette teintable + overlay de détails fixes).
const _TINT_NAME_RE = /^[a-z0-9_]+$/i;
const _TINT_ALLOWED_VALUES = [
  // métaux
  'iron', 'copper', 'bronze', 'silver', 'gold', 'platinum',
  // bois (baguettes)
  'oak', 'ebony', 'willow', 'holly', 'elder', 'vine',
];
function _getTintedItemHtml(item, cls) {
  const mask    = String(item.tintMask    || '');
  const overlay = String(item.tintOverlay || '');
  const tint    = String(item.tint        || 'silver');
  if (!_TINT_NAME_RE.test(mask))    return null;
  if (!_TINT_NAME_RE.test(overlay)) return null;
  if (_TINT_ALLOWED_VALUES.indexOf(tint) === -1) return null;
  const alt = (item && item.name ? item.name : '').replace(/"/g, '&quot;');
  // ⚠️ Piège des url() dans les custom properties CSS : elles sont
  // résolues relativement au fichier CSS qui CONSOMME la var, pas au
  // document HTML qui la DÉFINIT. style.css est dans /css/, donc on
  // préfixe par `../` pour pointer vers /img/icons/items/. Sans ça,
  // le navigateur cherche /css/img/icons/items/... (404 silencieux).
  const maskUrl    = `url('../img/icons/items/${mask}.png')`;
  const overlayUrl = `url('../img/icons/items/${overlay}.png')`;
  return `<span class="ui-icon tinted-icon ${cls} tint-${tint}" `
       + `data-mask="${mask}" data-overlay="${overlay}" data-tint="${tint}" `
       + `role="img" aria-label="${alt}">`
       +   `<span class="tint-mask"    style="--tint-mask:${maskUrl}"></span>`
       +   `<span class="tint-overlay" style="--tint-overlay:${overlayUrl}"></span>`
       + `</span>`;
}

// Pour les emplacements d'équipement (fiche perso, panneau gauche)
// quand on veut juste représenter le slot type sans item équipé.
function getEquipmentSlotIconHtml(slotType, sizeClass) {
  const cls = sizeClass || 'ui-icon-md';
  const src = EQUIPMENT_SLOT_ICONS[slotType];
  if (!src) return '';
  return `<img class="ui-icon ${cls}" src="${src}" alt="">`;
}

// Pour status effects (badges combat).
function getStatusIconHtml(statusId, sizeClass) {
  const cls = sizeClass || 'ui-icon-sm';
  const src = STATUS_ICON_REGISTRY[statusId];
  if (!src) return '';
  return `<img class="ui-icon ${cls}" src="${src}" alt="">`;
}

// Pour sortilèges (modale sorts, log combat).
// Accepte soit l'objet spell complet, soit son name (string).
function getSpellIconHtml(spell, sizeClass) {
  const cls = sizeClass || 'ui-icon-md';
  const name = (spell && spell.name) ? spell.name : spell;
  const src = SPELL_ICON_REGISTRY[name];
  if (src) {
    const alt = (name || '').replace(/"/g, '&quot;');
    return `<img class="ui-icon ${cls}" src="${src}" alt="${alt}">`;
  }
  return (spell && spell.icon) ? spell.icon : '';
}

// Substitution centrale emoji → PNG pour le texte du Journal / log de combat.
// Évite d'éditer ~170 call-sites : appelée au rendu (setBattleLog, logCombat).
// Table curée emoji → chemin PNG (statuts, actions, éléments, effets). Les
// purs symboles typographiques (− → ≈ ✕ ✓ ►) restent en texte. Ordre
// longest-first pour les composés (🩹✨, 🛡️↓, 🪄↓ avant leurs parties).
const _COMBAT_LOG_ICON_MAP = [
  ['🩹✨', 'img/icons/regen_ferula_max.png'],
  ['🛡️↓', 'img/icons/weaken.png'],
  ['🪄↓', 'img/icons/disarm.png'],
  ['🔥', 'img/icons/burn.png'],
  ['☠️', 'img/icons/poison.png'],
  ['🩸', 'img/icons/bleed.png'],
  ['❄️', 'img/icons/gel.png'],
  ['🌨️', 'img/icons/gel.png'],
  ['💫', 'img/icons/stun.png'],
  ['😱', 'img/icons/fear.png'],
  ['🌀', 'img/icons/imperius.png'],
  ['🩹', 'img/icons/regen.png'],
  ['🛡️', 'img/icons/protego.png'],
  ['⚔️', 'img/icons/atk.png'],
  ['💚', 'img/icons/heal.png'],
  ['💗', 'img/icons/heal.png'],
  ['🪙', 'img/icons/gold.png'],
  ['💧', 'img/icons/mp.png'],
  ['🔎', 'img/icons/search.png'],
  // Réutilisation d'icônes de sorts / items existantes
  ['👁️', 'img/icons/spells/legilimens.png'],
  ['🧪', 'img/icons/items/potion_m.png'],
  ['☀️', 'img/icons/spells/lumos_solem.png'],
  ['🦌', 'img/icons/spells/patronum.png'],
  ['🌾', 'img/icons/spells/recolte_magique.png'],
  // Nouveaux PNG (tools/gen_combat_log_icons.py)
  ['💥', 'img/icons/crit.png'],
  ['✨', 'img/icons/sparkle.png'],
  ['🔰', 'img/icons/resist.png'],
  ['⚡', 'img/icons/celerity.png'],
  ['❌', 'img/icons/fail.png'],
  ['💨', 'img/icons/dodge.png'],
  ['🐍', 'img/icons/serpent.png'],
  ['🌑', 'img/icons/tenebres.png'],
  ['🦁', 'img/icons/lion.png']
];
function iconizeCombatLog(html) {
  if (typeof html !== 'string' || !html) return html;
  let out = html;
  for (const [emoji, src] of _COMBAT_LOG_ICON_MAP) {
    if (out.indexOf(emoji) === -1) continue;
    out = out.split(emoji).join(`<img class="ui-icon ui-icon-sm" src="${src}" alt="">`);
  }
  return out;
}
