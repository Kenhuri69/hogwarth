// ============================================================
// AUDIO — Musique ambiante et musique de combat
// Ajout de méthodes à AudioSystem (défini dans audio.js)
// ============================================================

Object.assign(AudioSystem, {

  // ── Musique ambiante selon l'étage (5 zones progressives) ────
  // Chaque zone peut avoir un sample OGG. Si le sample existe, on le
  // joue avec crossfade ; sinon on retombe sur la synthèse procédurale.
  // Voir .claude/plans/audio-intro-sample.md.
  //
  // Registre zone → fichier (la map vit en bas via _ZONE_SAMPLES).
  playAmbientMusic(floor) {
    if (this.inCombat) return;
    // No-op si la même zone joue déjà — évite de couper/relancer le sample
    // entre showIntroScreen() et startGame() (cf. js/intro.js), ou entre
    // deux étages d'une même zone (1→2, 3→4, 5→6, 7→8).
    const targetFloor = (floor !== undefined) ? floor : this.currentFloor;
    if (this.musicPlaying && !this.isMuted && !this.inMenu &&
        this._sameAmbientZone(targetFloor, this.currentFloor)) {
      this.currentFloor = targetFloor;
      return;
    }
    this.stopMusic();
    // Quitte le thème de menu (intro UX) : on entre dans le jeu.
    this.inMenu = false;
    if (floor !== undefined) this.currentFloor = floor;
    if (this.isMuted) { this.musicPlaying = true; return; }
    this.init();
    this.musicPlaying = true;

    const f       = this.currentFloor;
    const zoneKey = this._zoneKeyForFloor(f);
    const sampleUrl = this._ZONE_SAMPLES[zoneKey];

    // Pas de sample déclaré pour cette zone → procédural direct
    if (!sampleUrl) {
      this._playProceduralAmbient(f);
      return;
    }

    // Sample déclaré : tenter le chargement, fallback procédural sur erreur
    this._loadZoneSample(zoneKey)
      .then(() => {
        if (this.musicPlaying && !this.inCombat &&
            this._zoneKeyForFloor(this.currentFloor) === zoneKey) {
          this._playZoneSampleLoop(zoneKey);
        }
      })
      .catch(err => {
        console.warn(`[audio] sample "${zoneKey}" unavailable, fallback to procedural:`, err && err.message);
        if (this.musicPlaying && !this.inCombat &&
            this._zoneKeyForFloor(this.currentFloor) === zoneKey) {
          this._playProceduralAmbient(this.currentFloor);
        }
      });
  },

  // ── Mapping étage → clé de zone (SoT FLOOR_THEMES) ────────────
  // intro / dungeon / depths en V1 ; tension / abyss restent dans
  // _ZONE_SAMPLES en réserve (variantes ou palier 14+).
  _zoneKeyForFloor(f) {
    return getFloorTheme(f).ambient;
  },

  // ── Deux étages tombent dans la même zone musicale ? ──────────
  _sameAmbientZone(a, b) {
    return this._zoneKeyForFloor(a) === this._zoneKeyForFloor(b);
  },

  // ── Registre zone → fichier OGG ───────────────────────────────
  // Une entrée absente (ou undefined) signifie : pas de sample, utilise
  // la synthèse procédurale pour cette zone.
  _ZONE_SAMPLES: {
    intro:   'audio/ambient_intro.ogg',
    tension: 'audio/ambient_tension.ogg',
    dungeon: 'audio/ambient_dungeon.ogg',
    depths:  'audio/ambient_depths.ogg',
    abyss:   'audio/ambient_abyss.ogg',
  },

  // ── Sample du thème de menu (phase d'intro) ───────────────────
  // Absent/undefined → synthèse procédurale (_playMenuTheme).
  _MENU_SAMPLE: 'audio/menu_theme.ogg',

  // ── Registre difficulté → fichier OGG de combat ───────────────
  // Mêmes règles que _ZONE_SAMPLES : entrée absente → procédural.
  // Les clés sont préfixées 'combat_' pour cohabiter dans le même
  // cache `_sampleBuffers` que les samples ambient.
  _COMBAT_SAMPLES: {
    combat_normal: 'audio/combat_normal.ogg',
    combat_late:   'audio/combat_late.ogg',   // étage ≥ 10 — repli combat_normal si 404
    combat_epic:   'audio/combat_epic.ogg',   // boss épique — repli combat_normal si 404
    combat_hard:   'audio/combat_hard.ogg',   // difficulté Difficile — repli combat_normal si 404
    combat_expert: 'audio/combat_expert.ogg', // difficulté Expert — repli combat_normal si 404
    tension:       'audio/ambient_tension.ogg', // groupe en danger critique (D4) — repli combat_normal si 404
  },

  // ── Registre voix narratives (un fichier par phrase) ──────────
  // Voir .claude/plans/voice-intro-dumbledore.md. Fallback silencieux
  // si l'entrée n'existe pas ou si le fetch échoue.
  _VOICE_SAMPLES: {
    dumbledore_intro_1: 'audio/voice/dumbledore_intro_1.ogg',
    dumbledore_intro_2: 'audio/voice/dumbledore_intro_2.ogg',
    // Cinématique Clé de Voûte : intro réécrite en 4 pages (Lot 1).
    dumbledore_intro_3: 'audio/voice/dumbledore_intro_3.ogg',
    dumbledore_intro_4: 'audio/voice/dumbledore_intro_4.ogg',
    // ── Voix narrative de la phase d'introduction (intro UX) ──
    // La voix guide le joueur AVANT toute révélation : aucun nom ni
    // portrait n'est affiché. C'est Dumbledore, mais le joueur ne le
    // comprend qu'à l'écran #intro-screen. Fallback silencieux tant
    // que les OGG ne sont pas générés (cf. .claude/plans/intro-ux-rework.md §5).
    narrator_welcome:    'audio/voice/narrator_welcome.ogg',
    narrator_mode:       'audio/voice/narrator_mode.ogg',
    narrator_heroes:     'audio/voice/narrator_heroes.ogg',
    narrator_difficulty: 'audio/voice/narrator_difficulty.ogg',
    narrator_house:      'audio/voice/narrator_house.ogg',
    // ── Chaîne d'épreuves Dumbledore (Phase 3) ──
    // 15 samples = 5 quêtes × 3 moments (offer / active / ready).
    // Cf. .claude/plans/voice-dumbledore-chain.md §3 pour les textes.
    // Fallback silencieux tant que les fichiers ne sont pas générés.
    dumbledore_tutoriel_offer_1:    'audio/voice/dumbledore_tutoriel_offer_1.ogg',
    dumbledore_tutoriel_active_1:   'audio/voice/dumbledore_tutoriel_active_1.ogg',
    dumbledore_tutoriel_ready_1:    'audio/voice/dumbledore_tutoriel_ready_1.ogg',
    dumbledore_eveil_offer_1:       'audio/voice/dumbledore_eveil_offer_1.ogg',
    dumbledore_eveil_active_1:      'audio/voice/dumbledore_eveil_active_1.ogg',
    dumbledore_eveil_ready_1:       'audio/voice/dumbledore_eveil_ready_1.ogg',
    dumbledore_courage_offer_1:     'audio/voice/dumbledore_courage_offer_1.ogg',
    dumbledore_courage_active_1:    'audio/voice/dumbledore_courage_active_1.ogg',
    dumbledore_courage_ready_1:     'audio/voice/dumbledore_courage_ready_1.ogg',
    dumbledore_resistance_offer_1:  'audio/voice/dumbledore_resistance_offer_1.ogg',
    dumbledore_resistance_active_1: 'audio/voice/dumbledore_resistance_active_1.ogg',
    dumbledore_resistance_ready_1:  'audio/voice/dumbledore_resistance_ready_1.ogg',
    dumbledore_revelation_offer_1:  'audio/voice/dumbledore_revelation_offer_1.ogg',
    dumbledore_revelation_active_1: 'audio/voice/dumbledore_revelation_active_1.ogg',
    dumbledore_revelation_ready_1:  'audio/voice/dumbledore_revelation_ready_1.ogg',
    // ── Fil rouge « Clé de Voûte des Quatre » (Lot 4) — quête éclats ──
    // questReady = scène de révélation en 3 pages → ready_1..3.
    dumbledore_eclats_offer_1:      'audio/voice/dumbledore_eclats_offer_1.ogg',
    dumbledore_eclats_active_1:     'audio/voice/dumbledore_eclats_active_1.ogg',
    dumbledore_eclats_ready_1:      'audio/voice/dumbledore_eclats_ready_1.ogg',
    dumbledore_eclats_ready_2:      'audio/voice/dumbledore_eclats_ready_2.ogg',
    dumbledore_eclats_ready_3:      'audio/voice/dumbledore_eclats_ready_3.ogg',
    // ── Quêtes farming (cf. .claude/plans/farming-quests.md §2) ──
    // 6 samples = 2 quêtes × 3 moments. Textes génériques (sans nom de
    // monstre / item, qui varient dynamiquement à l'écran).
    // Fallback silencieux tant que les OGG ne sont pas générés.
    scamander_chasse_offer_1:  'audio/voice/scamander_chasse_offer_1.ogg',
    scamander_chasse_active_1: 'audio/voice/scamander_chasse_active_1.ogg',
    scamander_chasse_ready_1:  'audio/voice/scamander_chasse_ready_1.ogg',
    hagrid_course_offer_1:     'audio/voice/hagrid_course_offer_1.ogg',
    hagrid_course_active_1:    'audio/voice/hagrid_course_active_1.ogg',
    hagrid_course_ready_1:     'audio/voice/hagrid_course_ready_1.ogg',
    // ── Chefs de Maison (Vague A voice-extensions-v2) ──
    // 4 PNJ × 5 OGG (greeting ×2 + offer/active/ready ×1) = 20 samples.
    // Mapping 1:1 sur les textes existants dans npcs.js
    // (dialogues.greeting + dialoguesByQuest.quest_set_<house>).
    // Fallback silencieux tant que les OGG ne sont pas générés.
    mcgonagall_greeting_1: 'audio/voice/mcgonagall_greeting_1.ogg',
    mcgonagall_greeting_2: 'audio/voice/mcgonagall_greeting_2.ogg',
    mcgonagall_offer_1:    'audio/voice/mcgonagall_offer_1.ogg',
    mcgonagall_active_1:   'audio/voice/mcgonagall_active_1.ogg',
    mcgonagall_ready_1:    'audio/voice/mcgonagall_ready_1.ogg',
    rogue_greeting_1:      'audio/voice/rogue_greeting_1.ogg',
    rogue_greeting_2:      'audio/voice/rogue_greeting_2.ogg',
    rogue_offer_1:         'audio/voice/rogue_offer_1.ogg',
    rogue_active_1:        'audio/voice/rogue_active_1.ogg',
    rogue_ready_1:         'audio/voice/rogue_ready_1.ogg',
    flitwick_greeting_1:   'audio/voice/flitwick_greeting_1.ogg',
    flitwick_greeting_2:   'audio/voice/flitwick_greeting_2.ogg',
    flitwick_offer_1:      'audio/voice/flitwick_offer_1.ogg',
    flitwick_active_1:     'audio/voice/flitwick_active_1.ogg',
    flitwick_ready_1:      'audio/voice/flitwick_ready_1.ogg',
    sprout_greeting_1:     'audio/voice/sprout_greeting_1.ogg',
    sprout_greeting_2:     'audio/voice/sprout_greeting_2.ogg',
    sprout_offer_1:        'audio/voice/sprout_offer_1.ogg',
    sprout_active_1:       'audio/voice/sprout_active_1.ogg',
    sprout_ready_1:        'audio/voice/sprout_ready_1.ogg',
    // ── Chefs de Maison : autres dialogues (extension Vague A) ──
    // McGonagall donne une 2e quête (golem_passage) → clés dédiées pour
    // éviter le décalage texte/voix. + idle des 4 chefs et questDone de
    // McGonagall (les 3 autres retombent sur idle en état 'done').
    mcgonagall_golem_offer_1:  'audio/voice/mcgonagall_golem_offer_1.ogg',
    mcgonagall_golem_active_1: 'audio/voice/mcgonagall_golem_active_1.ogg',
    mcgonagall_golem_ready_1:  'audio/voice/mcgonagall_golem_ready_1.ogg',
    // Une clé idle par réplique `dialogues.idleRandom` (7 par chef) — la
    // voix jouée suit la réplique tirée (cf. _voiceKeyForPage / idleIndex).
    mcgonagall_idle_1:         'audio/voice/mcgonagall_idle_1.ogg',
    mcgonagall_idle_2:         'audio/voice/mcgonagall_idle_2.ogg',
    mcgonagall_idle_3:         'audio/voice/mcgonagall_idle_3.ogg',
    mcgonagall_idle_4:         'audio/voice/mcgonagall_idle_4.ogg',
    mcgonagall_idle_5:         'audio/voice/mcgonagall_idle_5.ogg',
    mcgonagall_idle_6:         'audio/voice/mcgonagall_idle_6.ogg',
    mcgonagall_idle_7:         'audio/voice/mcgonagall_idle_7.ogg',
    mcgonagall_done_1:         'audio/voice/mcgonagall_done_1.ogg',
    rogue_idle_1:              'audio/voice/rogue_idle_1.ogg',
    rogue_idle_2:              'audio/voice/rogue_idle_2.ogg',
    rogue_idle_3:              'audio/voice/rogue_idle_3.ogg',
    rogue_idle_4:              'audio/voice/rogue_idle_4.ogg',
    rogue_idle_5:              'audio/voice/rogue_idle_5.ogg',
    rogue_idle_6:              'audio/voice/rogue_idle_6.ogg',
    rogue_idle_7:              'audio/voice/rogue_idle_7.ogg',
    flitwick_idle_1:           'audio/voice/flitwick_idle_1.ogg',
    flitwick_idle_2:           'audio/voice/flitwick_idle_2.ogg',
    flitwick_idle_3:           'audio/voice/flitwick_idle_3.ogg',
    flitwick_idle_4:           'audio/voice/flitwick_idle_4.ogg',
    flitwick_idle_5:           'audio/voice/flitwick_idle_5.ogg',
    flitwick_idle_6:           'audio/voice/flitwick_idle_6.ogg',
    flitwick_idle_7:           'audio/voice/flitwick_idle_7.ogg',
    sprout_idle_1:             'audio/voice/sprout_idle_1.ogg',
    sprout_idle_2:             'audio/voice/sprout_idle_2.ogg',
    sprout_idle_3:             'audio/voice/sprout_idle_3.ogg',
    sprout_idle_4:             'audio/voice/sprout_idle_4.ogg',
    sprout_idle_5:             'audio/voice/sprout_idle_5.ogg',
    sprout_idle_6:             'audio/voice/sprout_idle_6.ogg',
    sprout_idle_7:             'audio/voice/sprout_idle_7.ogg',
    // ── Don récurrent à la Maison + série Apothéose ★ N ──
    // Cf. .claude/plans/house-post-tier-18.md. 32 samples (8 par chef).
    mcgonagall_donation_intro:           'audio/voice/mcgonagall_donation_intro.ogg',
    mcgonagall_donation_offer:           'audio/voice/mcgonagall_donation_offer.ogg',
    mcgonagall_donation_small:           'audio/voice/mcgonagall_donation_small.ogg',
    mcgonagall_donation_large:           'audio/voice/mcgonagall_donation_large.ogg',
    mcgonagall_donation_refuse:          'audio/voice/mcgonagall_donation_refuse.ogg',
    mcgonagall_apotheose_star_first:     'audio/voice/mcgonagall_apotheose_star_first.ogg',
    mcgonagall_apotheose_star:           'audio/voice/mcgonagall_apotheose_star.ogg',
    mcgonagall_apotheose_star_milestone: 'audio/voice/mcgonagall_apotheose_star_milestone.ogg',
    rogue_donation_intro:                'audio/voice/rogue_donation_intro.ogg',
    rogue_donation_offer:                'audio/voice/rogue_donation_offer.ogg',
    rogue_donation_small:                'audio/voice/rogue_donation_small.ogg',
    rogue_donation_large:                'audio/voice/rogue_donation_large.ogg',
    rogue_donation_refuse:               'audio/voice/rogue_donation_refuse.ogg',
    rogue_apotheose_star_first:          'audio/voice/rogue_apotheose_star_first.ogg',
    rogue_apotheose_star:                'audio/voice/rogue_apotheose_star.ogg',
    rogue_apotheose_star_milestone:      'audio/voice/rogue_apotheose_star_milestone.ogg',
    flitwick_donation_intro:             'audio/voice/flitwick_donation_intro.ogg',
    flitwick_donation_offer:             'audio/voice/flitwick_donation_offer.ogg',
    flitwick_donation_small:             'audio/voice/flitwick_donation_small.ogg',
    flitwick_donation_large:             'audio/voice/flitwick_donation_large.ogg',
    flitwick_donation_refuse:            'audio/voice/flitwick_donation_refuse.ogg',
    flitwick_apotheose_star_first:       'audio/voice/flitwick_apotheose_star_first.ogg',
    flitwick_apotheose_star:             'audio/voice/flitwick_apotheose_star.ogg',
    flitwick_apotheose_star_milestone:   'audio/voice/flitwick_apotheose_star_milestone.ogg',
    sprout_donation_intro:               'audio/voice/sprout_donation_intro.ogg',
    sprout_donation_offer:               'audio/voice/sprout_donation_offer.ogg',
    sprout_donation_small:               'audio/voice/sprout_donation_small.ogg',
    sprout_donation_large:               'audio/voice/sprout_donation_large.ogg',
    sprout_donation_refuse:              'audio/voice/sprout_donation_refuse.ogg',
    sprout_apotheose_star_first:         'audio/voice/sprout_apotheose_star_first.ogg',
    sprout_apotheose_star:               'audio/voice/sprout_apotheose_star.ogg',
    sprout_apotheose_star_milestone:     'audio/voice/sprout_apotheose_star_milestone.ogg',
    // ── Tour guidé d'aide aux novices (js/help-tour.js) ──
    // Narration des 15 étapes de HELP_TOUR_STEPS par McGonagall.
    mcgonagall_help_1:         'audio/voice/mcgonagall_help_1.ogg',
    mcgonagall_help_2:         'audio/voice/mcgonagall_help_2.ogg',
    mcgonagall_help_3:         'audio/voice/mcgonagall_help_3.ogg',
    mcgonagall_help_4:         'audio/voice/mcgonagall_help_4.ogg',
    mcgonagall_help_5:         'audio/voice/mcgonagall_help_5.ogg',
    mcgonagall_help_6:         'audio/voice/mcgonagall_help_6.ogg',
    mcgonagall_help_7:         'audio/voice/mcgonagall_help_7.ogg',
    mcgonagall_help_8:         'audio/voice/mcgonagall_help_8.ogg',
    mcgonagall_help_9:         'audio/voice/mcgonagall_help_9.ogg',
    mcgonagall_help_10:        'audio/voice/mcgonagall_help_10.ogg',
    mcgonagall_help_11:        'audio/voice/mcgonagall_help_11.ogg',
    mcgonagall_help_12:        'audio/voice/mcgonagall_help_12.ogg',
    mcgonagall_help_13:        'audio/voice/mcgonagall_help_13.ogg',
    mcgonagall_help_14:        'audio/voice/mcgonagall_help_14.ogg',
    mcgonagall_help_15:        'audio/voice/mcgonagall_help_15.ogg',
    // ── Incantations des sortilèges (Vague B voice-extensions-v2) ──
    // 13 sorts ciblés ; mapping nom de sort → clé via SPELL_VOICE_MAP
    // (js/audio-sfx.js). speakSpell joue l'OGG si mappé, sinon retombe
    // sur SpeechSynthesis. Fallback silencieux si le fichier manque.
    spell_expelliarmus:       'audio/voice/spell_expelliarmus.ogg',
    spell_stupefix:           'audio/voice/spell_stupefix.ogg',
    spell_episkey:            'audio/voice/spell_episkey.ogg',
    spell_protego:            'audio/voice/spell_protego.ogg',
    spell_incendio:           'audio/voice/spell_incendio.ogg',
    spell_reparo:             'audio/voice/spell_reparo.ogg',
    spell_wingardium_leviosa: 'audio/voice/spell_wingardium_leviosa.ogg',
    spell_accio:              'audio/voice/spell_accio.ogg',
    spell_ferula:             'audio/voice/spell_ferula.ogg',
    spell_diffindo:           'audio/voice/spell_diffindo.ogg',
    spell_sectumsempra:       'audio/voice/spell_sectumsempra.ogg',
    spell_avada:              'audio/voice/spell_avada.ogg',
    spell_portus:             'audio/voice/spell_portus.ogg',
    // Vague C — incantations restantes (mappées dans SPELL_VOICE_MAP).
    spell_ferula_maxima:         'audio/voice/spell_ferula_maxima.ogg',
    spell_aguamenti:             'audio/voice/spell_aguamenti.ogg',
    spell_bombarda:              'audio/voice/spell_bombarda.ogg',
    spell_riddikulus:            'audio/voice/spell_riddikulus.ogg',
    spell_alohomora:             'audio/voice/spell_alohomora.ogg',
    spell_patronum:              'audio/voice/spell_patronum.ogg',
    spell_fulgari:               'audio/voice/spell_fulgari.ogg',
    spell_lumos_solem:           'audio/voice/spell_lumos_solem.ogg',
    spell_vampyrus:              'audio/voice/spell_vampyrus.ogg',
    spell_maledictus:            'audio/voice/spell_maledictus.ogg',
    spell_crucio:                'audio/voice/spell_crucio.ogg',
    spell_morsmordre:            'audio/voice/spell_morsmordre.ogg',
    spell_sectumsempra_imperius: 'audio/voice/spell_sectumsempra_imperius.ogg',
    spell_legilimens:            'audio/voice/spell_legilimens.ogg',
    spell_recolte_magique:       'audio/voice/spell_recolte_magique.ogg',
    spell_fulgur_catena:         'audio/voice/spell_fulgur_catena.ogg',
    spell_lux_aeterna:           'audio/voice/spell_lux_aeterna.ogg',
    spell_nox_vorax:             'audio/voice/spell_nox_vorax.ogg',
    spell_diffindo_maxima:       'audio/voice/spell_diffindo_maxima.ogg',
    spell_vulnera_sanentur:      'audio/voice/spell_vulnera_sanentur.ogg',
    spell_memoire_outremonde:    'audio/voice/spell_memoire_outremonde.ogg',
    spell_marque_pelerin:        'audio/voice/spell_marque_pelerin.ogg',
    spell_rappel_astral:         'audio/voice/spell_rappel_astral.ogg',
    // Vague D — derniers sorts (couverture 100 %).
    spell_lumos_maxima:          'audio/voice/spell_lumos_maxima.ogg',
    spell_glacius:               'audio/voice/spell_glacius.ogg',
    spell_revelio:               'audio/voice/spell_revelio.ogg',
    spell_sanguini:              'audio/voice/spell_sanguini.ogg',
    spell_tarantallegra:         'audio/voice/spell_tarantallegra.ogg',
    spell_patronus_maxima:       'audio/voice/spell_patronus_maxima.ogg',
    spell_glacius_tempete:       'audio/voice/spell_glacius_tempete.ogg',
    spell_fiendfyre:             'audio/voice/spell_fiendfyre.ogg',
    spell_cheminette_inter_mondes: 'audio/voice/spell_cheminette_inter_mondes.ogg',
    spell_verrou_de_sang:        'audio/voice/spell_verrou_de_sang.ogg',
    spell_sceau_du_voyageur:     'audio/voice/spell_sceau_du_voyageur.ogg',
    // ── Voix PNJ — révision quêtes §2.2 (Manon / Lupin / Élara) ──
    // Lupin (le père) : Edge-TTS, OGG livrés. Manon (cœur émotionnel) :
    // ElevenLabs — clés enregistrées, repli silencieux tant que les OGG
    // ne sont pas déposés (cf. .claude/plans/voix-manon-elara.md).
    lupin_greeting_1:            'audio/voice/lupin_greeting_1.ogg',
    lupin_greeting_2:            'audio/voice/lupin_greeting_2.ogg',
    lupin_offer_1:               'audio/voice/lupin_offer_1.ogg',
    lupin_active_1:              'audio/voice/lupin_active_1.ogg',
    lupin_ready_1:               'audio/voice/lupin_ready_1.ogg',
    manon_greeting_1:            'audio/voice/manon_greeting_1.ogg',
    manon_greeting_2:            'audio/voice/manon_greeting_2.ogg',
    manon_greeting_3:            'audio/voice/manon_greeting_3.ogg',
    manon_greeting_4:            'audio/voice/manon_greeting_4.ogg',
    // Élara (mère défunte) — voix posthume « mémoire » lue à la collecte des
    // feuillets clairs (Acte III). Edge-TTS (Emma) + signature réverbe.
    elara_feuillet_1:            'audio/voice/elara_feuillet_1.ogg',
    elara_feuillet_2:            'audio/voice/elara_feuillet_2.ogg',
    elara_feuillet_3:            'audio/voice/elara_feuillet_3.ogg',
  },

  // ── Lecture d'une voix narrative (one-shot, avec ducking music) ──
  // Charge le sample paresseusement, lance la lecture une seule fois,
  // applique un ducking 30 % sur la musique pendant la durée + 200 ms
  // de retombée. `stopVoice()` est appelée systématiquement avant de
  // démarrer une nouvelle voix pour éviter tout chevauchement.
  playVoice(voiceKey) {
    if (this.isMuted) return Promise.resolve();
    const url = this._VOICE_SAMPLES[voiceKey];
    if (!url) return Promise.resolve();  // fallback silencieux
    this.init();
    this.stopVoice();
    this._voicePending = voiceKey;
    return this._loadSample(voiceKey, url)
      .then(buf => {
        // Si une autre voix a été démarrée entre temps, on abandonne
        if (this._voicePending !== voiceKey) return;
        this._voicePending = null;
        if (!this.voiceGain) return;  // init pas encore prête
        const now  = this.ctx.currentTime;
        const src  = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.voiceGain);
        src.start(now);
        this._voiceSources.push(src);
        this._voicePlayback = { key: voiceKey, startAt: now, duration: buf.duration };
        this._duckMusic(true);
        src.onended = () => {
          const i = this._voiceSources.indexOf(src);
          if (i >= 0) this._voiceSources.splice(i, 1);
          if (this._voiceSources.length === 0) {
            this._duckMusic(false);
            this._voicePlayback = null;
          }
        };
      })
      .catch(err => {
        console.warn(`[audio] voice "${voiceKey}" unavailable:`, err && err.message);
        this._voicePending = null;
      });
  },

  // ── Sting de fin « Briser le Cycle » (ch.14 §14.6.1, P4) ──────
  // Nappe douce one-shot pour la cinématique C. Défensif : si le sample
  // `audio/ending_break.ogg` est absent (404) ou si l'audio n'est pas prêt,
  // repli sur le sting procédural `playVictory()` existant. Aucune dépendance
  // dure à l'asset — le comportement actuel (sans sample) reste inchangé.
  playEndingTheme() {
    if (this.isMuted) return;
    this.init();
    const url = this._ENDING_SAMPLE;
    this._loadSample('ending_break', url)
      .then(buf => {
        if (!this.musicGain || !this.ctx) { if (this.playVictory) this.playVictory(); return; }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.musicGain);
        src.start(this.ctx.currentTime);
      })
      .catch(() => { if (this.playVictory) this.playVictory(); });
  },

  // Sample de la cinématique de fin (P4). Absent par défaut → repli synthèse.
  _ENDING_SAMPLE: 'audio/ending_break.ogg',

  // ── Stoppe toutes les voix actives et restaure la musique ─────
  stopVoice() {
    this._voicePending = null;
    this._voicePlayback = null;
    for (const src of this._voiceSources) {
      try { src.stop(); } catch (_) { /* déjà arrêté */ }
    }
    this._voiceSources = [];
    this._duckMusic(false);
  },

  // ── Progression de la voix en cours (consommé par js/karaoke.js) ──
  // Renvoie une fraction 0..1, 0 si la voix est encore en chargement,
  // -1 si aucune voix n'est active (ou terminée).
  getVoiceProgress() {
    const p = this._voicePlayback;
    if (p && this.ctx) {
      const elapsed = this.ctx.currentTime - p.startAt;
      if (elapsed >= p.duration) return -1;
      return elapsed > 0 ? elapsed / p.duration : 0;
    }
    if (this._voicePending) return 0;   // sample en cours de fetch/décodage
    return -1;
  },

  // ── Ducking : musique × 0.30 pendant la voix, restaurée après ─
  _duckMusic(active) {
    if (!this.ctx || !this.musicGain) return;
    const now    = this.ctx.currentTime;
    const ramp   = this._duckRampSeconds || 0.20;
    const target = active ? 0.078 : 0.26;   // 0.26 × 0.30 ≈ 0.078
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(target, now + ramp);
  },

  // ── Chargement paresseux d'un sample (zone ou combat) ─────────
  _loadSample(key, url) {
    if (this._sampleBuffers[key]) return Promise.resolve(this._sampleBuffers[key]);
    if (this._sampleLoadPromises[key]) return this._sampleLoadPromises[key];
    if (!url) return Promise.reject(new Error('no sample url for ' + key));
    if (!this.ctx) this.init();
    const p = fetch(url, { cache: 'force-cache' })
      .then(r => {
        if (!r.ok) throw new Error('fetch ' + r.status);
        return r.arrayBuffer();
      })
      .then(buf => new Promise((resolve, reject) =>
        this.ctx.decodeAudioData(buf, resolve, reject)
      ))
      .then(audioBuf => {
        this._sampleBuffers[key] = audioBuf;
        return audioBuf;
      })
      .catch(err => {
        delete this._sampleLoadPromises[key];  // permet un retry
        throw err;
      });
    this._sampleLoadPromises[key] = p;
    return p;
  },

  // ── Wrapper rétrocompatible — appelle _loadSample avec l'URL du registre ──
  _loadZoneSample(zoneKey) {
    return this._loadSample(zoneKey, this._ZONE_SAMPLES[zoneKey]);
  },

  // ── Lecture loopée avec crossfade 1 s ─────────────────────────
  // `isRelevant` est une fonction qui retourne `true` tant que le sample
  // doit continuer à jouer ; quand elle retourne `false`, le loop arrête
  // de se reprogrammer (sans toucher aux sources déjà schedulées qui
  // finiront naturellement). Utilisée pour distinguer ambient vs combat
  // et pour stopper proprement à un changement de zone/contexte.
  // `gainBucket` (optionnel, F1) : tableau où pousser le GainNode de chaque
  // itération, pour pouvoir les fade-out lors d'un crossfade d'intensité de
  // combat. Les callers ambient/menu ne le passent pas (comportement inchangé).
  _playSampleLoop(bufKey, isRelevant, gainBucket) {
    const buf = this._sampleBuffers[bufKey];
    if (!buf || !this.musicPlaying) return;
    const CROSSFADE = 1.0;
    const duration  = buf.duration;
    if (duration <= 2 * CROSSFADE) return;  // sample trop court pour crossfader

    const schedule = (startAt) => {
      if (!this.musicPlaying || !isRelevant()) return;
      const src  = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      src.buffer = buf;
      src.connect(gain).connect(this.musicGain);
      // Fade in sur CROSSFADE
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(1, startAt + CROSSFADE);
      // Fade out sur les CROSSFADE dernières secondes
      gain.gain.setValueAtTime(1, startAt + duration - CROSSFADE);
      gain.gain.linearRampToValueAtTime(0, startAt + duration);
      src.start(startAt);
      src.stop(startAt + duration + 0.05);
      this._sampleSources.push(src);
      if (gainBucket) gainBucket.push(gain);
      src.onended = () => {
        const i = this._sampleSources.indexOf(src);
        if (i >= 0) this._sampleSources.splice(i, 1);
        if (gainBucket) {
          const j = gainBucket.indexOf(gain);
          if (j >= 0) gainBucket.splice(j, 1);
        }
      };
      const nextStart = startAt + duration - CROSSFADE;
      const delayMs   = Math.max(0, (nextStart - this.ctx.currentTime) * 1000 - 200);
      this._sampleLoopTimer = setTimeout(() => schedule(nextStart), delayMs);
    };

    schedule(this.ctx.currentTime);
  },

  // ── Wrapper rétrocompatible — ambient ─────────────────────────
  _playZoneSampleLoop(zoneKey) {
    this._playSampleLoop(zoneKey, () =>
      !this.inCombat && this._zoneKeyForFloor(this.currentFloor) === zoneKey
    );
  },

  // ── Synthèse procédurale (zones 3+ ou fallback zones 1-2) ─────
  _playProceduralAmbient(f) {
    let scale, tempo, oscType, filterHz, windChance, harmChance, bassDrone;

    if (f <= 2) {
      // Hauts couloirs de Poudlard — clair et mystérieux
      scale      = [261, 294, 330, 392, 440, 523, 659];
      tempo      = 750;
      oscType    = 'sine';
      filterHz   = 1800;
      windChance = 0.20;
      harmChance = 0.55;
      bassDrone  = null;
    } else if (f <= 4) {
      // Salles intermédiaires — tension naissante
      scale      = [220, 261, 294, 330, 392, 440];
      tempo      = 700;
      oscType    = 'sine';
      filterHz   = 1500;
      windChance = 0.28;
      harmChance = 0.45;
      bassDrone  = 55;   // La 1 (très grave, pulsé)
    } else if (f <= 6) {
      // Cachots — angoissant
      scale      = [196, 220, 261, 294, 330];
      tempo      = 640;
      oscType    = 'triangle';
      filterHz   = 1100;
      windChance = 0.35;
      harmChance = 0.35;
      bassDrone  = 49;   // Ré 1
    } else if (f <= 8) {
      // Profondeurs — oppressant
      scale      = [165, 196, 220, 261, 294];
      tempo      = 580;
      oscType    = 'triangle';
      filterHz   = 900;
      windChance = 0.45;
      harmChance = 0.25;
      bassDrone  = 41;   // Mi 1 — bourdon grave
    } else {
      // Abysses — pur cauchemar
      scale      = [130, 146, 165, 196, 220];
      tempo      = 520;
      oscType    = 'sawtooth';
      filterHz   = 700;
      windChance = 0.55;
      harmChance = 0.15;
      bassDrone  = 36;   // La 0 — grondement profond
    }

    let idx = 0;
    this.musicPlaying = true;

    // Bourdon grave continu (étages 3+)
    if (bassDrone) this._playBassDrone(bassDrone);

    const tick = () => {
      if (!this.musicPlaying || this.inCombat) return;

      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lpf  = this.ctx.createBiquadFilter();

      osc.type = oscType;
      osc.frequency.setValueAtTime(scale[idx % scale.length], this.ctx.currentTime);

      lpf.type            = 'lowpass';
      lpf.frequency.value = filterHz;

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.13, this.ctx.currentTime + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.6);

      osc.connect(lpf).connect(gain).connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 3.8);

      // Harmonique douce à l'octave
      if (Math.random() < harmChance) {
        const osc2  = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = scale[idx % scale.length] * 2;
        gain2.gain.setValueAtTime(0, this.ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.6);
        osc2.connect(gain2).connect(this.musicGain);
        osc2.start(this.ctx.currentTime);
        osc2.stop(this.ctx.currentTime + 2.8);
      }

      // Souffle de vent aléatoire
      if (Math.random() < windChance) this._playWind(f);

      idx++;
      this._noteTimer = setTimeout(tick, tempo + Math.random() * 200);
    };

    tick();
  },

  // ── Bourdon grave pour les étages profonds ────────────────────
  _playBassDrone(freq) {
    if (!this.ctx || !this.musicPlaying || this.inCombat) return;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lpf  = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    lpf.type = 'lowpass'; lpf.frequency.value = 200;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 2);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 14);

    osc.connect(lpf).connect(gain).connect(this.musicGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 15);
  },

  // ── Thème de menu (titre / hub / sélection) — procédural ──────
  // Distinct de l'ambiance de jeu : progression d'accords lumineuse
  // et féérique qui accompagne toute la phase d'introduction. À
  // l'entrée en jeu (`showIntroScreen` → `playAmbientMusic`), le
  // thème cède la place à l'ambiance du donjon.
  playMenuMusic() {
    // No-op si le thème de menu tourne déjà.
    if (this.musicPlaying && this.inMenu && !this.isMuted) return;
    this.stopMusic();
    this.inMenu = true;
    if (this.isMuted) return;   // restera muet jusqu'au toggleMute
    this.init();
    this.musicPlaying = true;

    // Sample OGG si disponible, sinon synthèse procédurale (fallback).
    const url = this._MENU_SAMPLE;
    if (!url) { this._playMenuTheme(); return; }
    this._loadSample('menu', url)
      .then(() => {
        if (this.musicPlaying && this.inMenu && !this.inCombat) {
          this._playSampleLoop('menu', () => this.inMenu && !this.inCombat);
        }
      })
      .catch(err => {
        console.warn('[audio] sample "menu" unavailable, fallback to procedural:', err && err.message);
        if (this.musicPlaying && this.inMenu && !this.inCombat) {
          this._playMenuTheme();
        }
      });
  },

  _playMenuTheme() {
    // 4 accords (Do – Sol – La min – Fa) : cadence douce et hopeful.
    const chords = [
      [261.63, 329.63, 392.00, 523.25],  // Do majeur
      [196.00, 246.94, 392.00, 493.88],  // Sol majeur
      [220.00, 261.63, 329.63, 440.00],  // La mineur
      [174.61, 261.63, 349.23, 440.00],  // Fa majeur
    ];
    const bass    = [65.41, 49.00, 55.00, 43.65];   // fondamentales graves
    const stepDur = 0.40;                            // durée d'un arpège (s)
    let step = 0;

    const tick = () => {
      if (!this.musicPlaying || !this.inMenu || this.inCombat) return;
      const ci    = (step >> 2) % chords.length;     // accord : change ttes les 4 notes
      const chord = chords[ci];
      const t0    = this.ctx.currentTime;
      const note  = chord[step % chord.length];

      // Note arpégée (sine douce)
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.11, t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);
      osc.connect(gain).connect(this.musicGain);
      osc.start(t0);
      osc.stop(t0 + 1.7);

      // Scintillement à l'octave (une note sur deux)
      if (step % 2 === 0) {
        const sp = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        sp.type = 'triangle';
        sp.frequency.value = note * 2;
        sg.gain.setValueAtTime(0, t0);
        sg.gain.linearRampToValueAtTime(0.03, t0 + 0.08);
        sg.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
        sp.connect(sg).connect(this.musicGain);
        sp.start(t0);
        sp.stop(t0 + 1.2);
      }

      // Basse + nappe douce à chaque changement d'accord
      if (step % 4 === 0) {
        const padDur = stepDur * 4;
        const b  = this.ctx.createOscillator();
        const bg = this.ctx.createGain();
        const bl = this.ctx.createBiquadFilter();
        b.type = 'triangle';
        b.frequency.value = bass[ci];
        bl.type = 'lowpass'; bl.frequency.value = 320;
        bg.gain.setValueAtTime(0, t0);
        bg.gain.linearRampToValueAtTime(0.10, t0 + 0.3);
        bg.gain.linearRampToValueAtTime(0.07, t0 + padDur - 0.2);
        bg.gain.exponentialRampToValueAtTime(0.001, t0 + padDur + 0.1);
        b.connect(bl).connect(bg).connect(this.musicGain);
        b.start(t0);
        b.stop(t0 + padDur + 0.2);

        [chord[1], chord[2]].forEach(f => {
          const p  = this.ctx.createOscillator();
          const pg = this.ctx.createGain();
          p.type = 'sine';
          p.frequency.value = f / 2;
          pg.gain.setValueAtTime(0, t0);
          pg.gain.linearRampToValueAtTime(0.035, t0 + 0.6);
          pg.gain.linearRampToValueAtTime(0.025, t0 + padDur - 0.4);
          pg.gain.exponentialRampToValueAtTime(0.001, t0 + padDur);
          p.connect(pg).connect(this.musicGain);
          p.start(t0);
          p.stop(t0 + padDur + 0.1);
        });
      }

      step++;
      this._noteTimer = setTimeout(tick, stepDur * 1000);
    };

    tick();
  },

  // ── Musique de combat ─────────────────────────────────────────
  // Difficulté Normale : sample OGG (audio/combat_normal.ogg) si dispo,
  // sinon procédural. Difficile / Expert : procédural (variantes
  // plus dures, samples à livrer plus tard si besoin).
  startCombatMusic(enemyGroup) {
    if (this.inCombat) return;
    this.inCombat = true;
    this.inMenu   = false;
    this.stopMusic();
    if (this.isMuted) return;
    this.init();
    this.musicPlaying = true;

    const combatKey = this._combatSampleKey(enemyGroup);
    const url = this._COMBAT_SAMPLES[combatKey];

    // F1 — réinitialise l'état de couche adaptative pour ce combat.
    this._activeCombatKey = null;
    this._combatGains = [];

    if (!url) {
      this._playProceduralCombat();
      return;
    }

    this._loadSample(combatKey, url)
      .then(() => {
        if (this.inCombat && this.musicPlaying) {
          this._activeCombatKey = combatKey;
          this._playSampleLoop(combatKey,
            () => this.inCombat && this._activeCombatKey === combatKey,
            this._combatGains);
        }
      })
      .catch(err => {
        console.warn(`[audio] sample "${combatKey}" unavailable:`, err && err.message);
        if (!(this.inCombat && this.musicPlaying)) return;
        // Repli : sample de tranche absent → on tente combat_normal (garanti)
        // avant de basculer sur la synthèse procédurale.
        if (combatKey !== 'combat_normal') {
          this._loadSample('combat_normal', this._COMBAT_SAMPLES.combat_normal)
            .then(() => {
              if (this.inCombat && this.musicPlaying) {
                this._activeCombatKey = 'combat_normal';
                this._playSampleLoop('combat_normal',
                  () => this.inCombat && this._activeCombatKey === 'combat_normal',
                  this._combatGains);
              }
            })
            .catch(() => {
              if (this.inCombat && this.musicPlaying) this._playProceduralCombat();
            });
        } else {
          this._playProceduralCombat();
        }
      });
  },

  // ── Musique adaptative de combat (F1) — crossfade par intensité ─
  // Re-évalue la couche de combat voulue (via _combatSampleKey, qui place
  // `tension` en tête quand le groupe est en danger critique) et, si elle
  // diffère de la couche active, crossfade vers elle SANS empiler de boucle
  // permanente : l'ancienne couche est fade-out (1 s), la nouvelle fade-in.
  // No-op si : hors combat, muet, pas de contexte, on est en synthèse
  // procédurale (_activeCombatKey null), ou le sample cible n'est pas chargé
  // (on tente alors un chargement paresseux puis on re-tentera). Idempotent.
  updateCombatIntensity() {
    if (!this.inCombat || !this.musicPlaying || this.isMuted) return;
    if (!this.ctx) return;
    // Sur couche procédurale (samples indisponibles) : pas de swap (éviterait
    // d'empiler un sample par-dessus la synthèse). On reste tel quel.
    if (!this._activeCombatKey) return;

    const desired = this._combatSampleKey();
    if (desired === this._activeCombatKey) return;

    const buf = this._sampleBuffers[desired];
    if (!buf) {
      // Sample cible pas encore chargé : on le charge en tâche de fond et on
      // re-tentera la transition au retour si elle est toujours pertinente.
      const url = this._COMBAT_SAMPLES[desired];
      if (url) {
        this._loadSample(desired, url)
          .then(() => { if (this.inCombat) this.updateCombatIntensity(); })
          .catch(() => {});
      }
      return;
    }

    // Crossfade : l'ancienne couche cesse de se reprogrammer (isRelevant
    // devient faux car _activeCombatKey change) puis on fade-out ses gains ;
    // la nouvelle couche démarre avec son fade-in intégré.
    this._activeCombatKey = desired;
    this._fadeOutCombatLayer();
    this._playSampleLoop(desired,
      () => this.inCombat && this._activeCombatKey === desired,
      this._combatGains);
  },

  // Fade-out (1 s) des gains de la couche de combat courante puis vide le
  // bucket (les sources restent schedulées et s'arrêteront seules, muettes).
  _fadeOutCombatLayer() {
    if (!this.ctx || !Array.isArray(this._combatGains)) return;
    const now = this.ctx.currentTime, CF = 1.0;
    for (const g of this._combatGains) {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + CF);
      } catch (_) { /* gain déjà libéré */ }
    }
    this._combatGains = [];
  },

  // ── Sélection du sample de combat — axes combinés ─────────────
  // Priorité : danger critique du groupe > boss épique > étage ≥ 10 >
  // difficulté courante. `enemyGroup` optionnel : à défaut, lit le global
  // `enemyGroup`. La couche `tension` (D4) prime : entamer un combat avec
  // un membre vivant sous 25 % PV est le moment le plus tendu, quel que
  // soit l'ennemi. Les boss épiques non critiques gardent `combat_epic`.
  _combatSampleKey(grpArg) {
    const grp = (grpArg != null) ? grpArg
              : (typeof enemyGroup !== 'undefined' ? enemyGroup : null);
    if (this._partyInCriticalDanger()) return 'tension';
    if (Array.isArray(grp) && grp.some(e => e && e.epic)) return 'combat_epic';
    if (typeof currentFloor === 'number' && currentFloor >= 10) return 'combat_late';
    const d = (typeof difficulty !== 'undefined') ? difficulty : 'Normal';
    if (d === 'Expert')    return 'combat_expert';
    if (d === 'Difficile') return 'combat_hard';
    return 'combat_normal';
  },

  // Vrai si un membre VIVANT du groupe est sous 25 % de ses PV max (même
  // seuil que la vignette de danger D2). Lecture pure des globals party/
  // partySize, gardée par typeof. Pur — n'altère aucun état.
  _partyInCriticalDanger() {
    if (typeof party === 'undefined' || !Array.isArray(party)) return false;
    const n = (typeof partySize === 'number') ? partySize : party.length;
    return party.slice(0, n).some(c =>
      c && c.hp > 0 && c.hpMax > 0 && c.hp / c.hpMax < 0.25);
  },

  // ── Synthèse procédurale de combat (fallback ou difficulté sans sample) ──
  _playProceduralCombat() {
    // Paramètres selon la difficulté
    const isExpert     = (typeof difficulty !== 'undefined') && difficulty === 'Expert';
    const isDifficile  = (typeof difficulty !== 'undefined') && difficulty === 'Difficile';
    const isHard       = isExpert || isDifficile;

    const melScale  = isExpert ? [130, 146, 165, 196] : isHard ? [165, 196, 220, 261] : [196, 220, 261, 294, 330];
    const beatFreq  = isExpert ? 60 : isHard ? 80 : 90;
    const melTempo  = isExpert ? 230 : isHard ? 280 : 340;
    const oscType   = isExpert ? 'sawtooth' : 'triangle';
    const melVol    = isExpert ? 0.32 : 0.26;

    let melIdx = 0;
    let beatIdx = 0;

    // ── Mélodie tendue ────────────────────────────────────────
    const melTick = () => {
      if (!this.inCombat || !this.musicPlaying) return;

      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lpf  = this.ctx.createBiquadFilter();

      osc.type = oscType;
      osc.frequency.setValueAtTime(melScale[melIdx % melScale.length], this.ctx.currentTime);

      lpf.type = 'lowpass';
      lpf.frequency.value = isExpert ? 800 : 1400;

      gain.gain.setValueAtTime(melVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

      osc.connect(lpf).connect(gain).connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 1.4);

      melIdx++;
      this._noteTimer = setTimeout(melTick, melTempo + Math.random() * 60);
    };

    // ── Battement rythmique (caisse claire procédurale) ───────
    const beatTick = () => {
      if (!this.inCombat || !this.musicPlaying) return;

      // Kick (toutes les 2 pulsations)
      if (beatIdx % 2 === 0) {
        const kickOsc  = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(beatFreq * 1.4, this.ctx.currentTime);
        kickOsc.frequency.exponentialRampToValueAtTime(beatFreq * 0.4, this.ctx.currentTime + 0.12);
        kickGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
        kickOsc.connect(kickGain).connect(this.musicGain);
        kickOsc.start(this.ctx.currentTime);
        kickOsc.stop(this.ctx.currentTime + 0.2);
      }

      // Snare bruit blanc bref (temps 2 et 4)
      if (beatIdx % 4 === 2) {
        const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.08), this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;
        const src  = this.ctx.createBufferSource();
        src.buffer = buf;
        const hpf  = this.ctx.createBiquadFilter();
        hpf.type   = 'highpass'; hpf.frequency.value = 1500;
        const sg   = this.ctx.createGain();
        sg.gain.setValueAtTime(isExpert ? 0.35 : 0.22, this.ctx.currentTime);
        sg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        src.connect(hpf).connect(sg).connect(this.musicGain);
        src.start(this.ctx.currentTime);
      }

      beatIdx++;
      this._combatTimer = setTimeout(beatTick, isExpert ? 150 : isHard ? 180 : 210);
    };

    melTick();
    beatTick();
  },

  stopCombatMusic() {
    if (!this.inCombat) return;
    this.inCombat = false;
    this.stopMusic();
    if (!this.isMuted) {
      // Courte pause avant de reprendre l'ambiance (transition naturelle)
      setTimeout(() => this.playAmbientMusic(this.currentFloor), 400);
    }
  },

  // ── Bruit de vent (intensité selon l'étage) ───────────────────
  _playWind(floor = 1) {
    const dur  = 1.5 + Math.random() * 1.5;
    const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;
    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    const vol = Math.min(0.12, 0.04 + floor * 0.008);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = Math.max(300, 700 - floor * 40);

    src.connect(lpf).connect(gain).connect(this.musicGain);
    src.start();
  }
});
