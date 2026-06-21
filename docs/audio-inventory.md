# Inventaire audio (P2.6)

> Généré par `node tools/audio_inventory.js --write`. Croise les samples
> `audio/….ogg` référencés par `js/` avec les fichiers présents sous `audio/`.
> **SFX** (coups, sorts, UI) sont **100 % procéduraux** (`audio-sfx.js`) — pas
> de samples. Les **barks** héros passent par `speakBark` (synthèse vocale par
> défaut) ; un OGG n'est lu que s'il est enregistré dans `_VOICE_SAMPLES`.

## Récap par catégorie

| Catégorie | Référencés | Présents | Manquants |
|-----------|-----------:|---------:|----------:|
| ambient | 5 | 5 | 0 |
| autre | 1 | 1 | 0 |
| combat | 5 | 5 | 0 |
| menu | 1 | 1 | 0 |
| voice | 181 | 353 | 0 |

**Total** : 193 référencés · 365 présents · 0 manquants · 172 orphelins.

## Samples référencés MANQUANTS (repli synthèse / 404 au runtime)

_Aucun — tout sample référencé par le code est présent._

## Fichiers ORPHELINS (présents, jamais référencés)

- `audio/voice/_raw/dumbledore_courage_active_1.mp3`
- `audio/voice/_raw/dumbledore_courage_offer_1.mp3`
- `audio/voice/_raw/dumbledore_courage_ready_1.mp3`
- `audio/voice/_raw/dumbledore_eveil_active_1.mp3`
- `audio/voice/_raw/dumbledore_eveil_offer_1.mp3`
- `audio/voice/_raw/dumbledore_eveil_ready_1.mp3`
- `audio/voice/_raw/dumbledore_resistance_active_1.mp3`
- `audio/voice/_raw/dumbledore_resistance_offer_1.mp3`
- `audio/voice/_raw/dumbledore_resistance_ready_1.mp3`
- `audio/voice/_raw/dumbledore_revelation_active_1.mp3`
- `audio/voice/_raw/dumbledore_revelation_offer_1.mp3`
- `audio/voice/_raw/dumbledore_revelation_ready_1.mp3`
- `audio/voice/_raw/dumbledore_tutoriel_active_1.mp3`
- `audio/voice/_raw/dumbledore_tutoriel_offer_1.mp3`
- `audio/voice/_raw/dumbledore_tutoriel_ready_1.mp3`
- `audio/voice/_raw/flitwick_active_1.mp3`
- `audio/voice/_raw/flitwick_apotheose_star.mp3`
- `audio/voice/_raw/flitwick_apotheose_star_first.mp3`
- `audio/voice/_raw/flitwick_apotheose_star_milestone.mp3`
- `audio/voice/_raw/flitwick_donation_intro.mp3`
- `audio/voice/_raw/flitwick_donation_large.mp3`
- `audio/voice/_raw/flitwick_donation_offer.mp3`
- `audio/voice/_raw/flitwick_donation_refuse.mp3`
- `audio/voice/_raw/flitwick_donation_small.mp3`
- `audio/voice/_raw/flitwick_greeting_1.mp3`
- `audio/voice/_raw/flitwick_greeting_2.mp3`
- `audio/voice/_raw/flitwick_idle_1.mp3`
- `audio/voice/_raw/flitwick_idle_2.mp3`
- `audio/voice/_raw/flitwick_idle_3.mp3`
- `audio/voice/_raw/flitwick_idle_4.mp3`
- `audio/voice/_raw/flitwick_idle_5.mp3`
- `audio/voice/_raw/flitwick_idle_6.mp3`
- `audio/voice/_raw/flitwick_idle_7.mp3`
- `audio/voice/_raw/flitwick_offer_1.mp3`
- `audio/voice/_raw/flitwick_ready_1.mp3`
- `audio/voice/_raw/hagrid_course_active_1.mp3`
- `audio/voice/_raw/hagrid_course_offer_1.mp3`
- `audio/voice/_raw/hagrid_course_ready_1.mp3`
- `audio/voice/_raw/mcgonagall_active_1.mp3`
- `audio/voice/_raw/mcgonagall_apotheose_star.mp3`
- `audio/voice/_raw/mcgonagall_apotheose_star_first.mp3`
- `audio/voice/_raw/mcgonagall_apotheose_star_milestone.mp3`
- `audio/voice/_raw/mcgonagall_donation_intro.mp3`
- `audio/voice/_raw/mcgonagall_donation_large.mp3`
- `audio/voice/_raw/mcgonagall_donation_offer.mp3`
- `audio/voice/_raw/mcgonagall_donation_refuse.mp3`
- `audio/voice/_raw/mcgonagall_donation_small.mp3`
- `audio/voice/_raw/mcgonagall_done_1.mp3`
- `audio/voice/_raw/mcgonagall_golem_active_1.mp3`
- `audio/voice/_raw/mcgonagall_golem_offer_1.mp3`
- `audio/voice/_raw/mcgonagall_golem_ready_1.mp3`
- `audio/voice/_raw/mcgonagall_greeting_1.mp3`
- `audio/voice/_raw/mcgonagall_greeting_2.mp3`
- `audio/voice/_raw/mcgonagall_help_1.mp3`
- `audio/voice/_raw/mcgonagall_help_10.mp3`
- `audio/voice/_raw/mcgonagall_help_11.mp3`
- `audio/voice/_raw/mcgonagall_help_12.mp3`
- `audio/voice/_raw/mcgonagall_help_13.mp3`
- `audio/voice/_raw/mcgonagall_help_14.mp3`
- `audio/voice/_raw/mcgonagall_help_15.mp3`
- `audio/voice/_raw/mcgonagall_help_2.mp3`
- `audio/voice/_raw/mcgonagall_help_3.mp3`
- `audio/voice/_raw/mcgonagall_help_4.mp3`
- `audio/voice/_raw/mcgonagall_help_5.mp3`
- `audio/voice/_raw/mcgonagall_help_6.mp3`
- `audio/voice/_raw/mcgonagall_help_7.mp3`
- `audio/voice/_raw/mcgonagall_help_8.mp3`
- `audio/voice/_raw/mcgonagall_help_9.mp3`
- `audio/voice/_raw/mcgonagall_idle_1.mp3`
- `audio/voice/_raw/mcgonagall_idle_2.mp3`
- `audio/voice/_raw/mcgonagall_idle_3.mp3`
- `audio/voice/_raw/mcgonagall_idle_4.mp3`
- `audio/voice/_raw/mcgonagall_idle_5.mp3`
- `audio/voice/_raw/mcgonagall_idle_6.mp3`
- `audio/voice/_raw/mcgonagall_idle_7.mp3`
- `audio/voice/_raw/mcgonagall_offer_1.mp3`
- `audio/voice/_raw/mcgonagall_ready_1.mp3`
- `audio/voice/_raw/narrator_difficulty.mp3`
- `audio/voice/_raw/narrator_heroes.mp3`
- `audio/voice/_raw/narrator_house.mp3`
- `audio/voice/_raw/narrator_mode.mp3`
- `audio/voice/_raw/narrator_welcome.mp3`
- `audio/voice/_raw/rogue_active_1.mp3`
- `audio/voice/_raw/rogue_apotheose_star.mp3`
- `audio/voice/_raw/rogue_apotheose_star_first.mp3`
- `audio/voice/_raw/rogue_apotheose_star_milestone.mp3`
- `audio/voice/_raw/rogue_donation_intro.mp3`
- `audio/voice/_raw/rogue_donation_large.mp3`
- `audio/voice/_raw/rogue_donation_offer.mp3`
- `audio/voice/_raw/rogue_donation_refuse.mp3`
- `audio/voice/_raw/rogue_donation_small.mp3`
- `audio/voice/_raw/rogue_greeting_1.mp3`
- `audio/voice/_raw/rogue_greeting_2.mp3`
- `audio/voice/_raw/rogue_idle_1.mp3`
- `audio/voice/_raw/rogue_idle_2.mp3`
- `audio/voice/_raw/rogue_idle_3.mp3`
- `audio/voice/_raw/rogue_idle_4.mp3`
- `audio/voice/_raw/rogue_idle_5.mp3`
- `audio/voice/_raw/rogue_idle_6.mp3`
- `audio/voice/_raw/rogue_idle_7.mp3`
- `audio/voice/_raw/rogue_offer_1.mp3`
- `audio/voice/_raw/rogue_ready_1.mp3`
- `audio/voice/_raw/scamander_chasse_active_1.mp3`
- `audio/voice/_raw/scamander_chasse_offer_1.mp3`
- `audio/voice/_raw/scamander_chasse_ready_1.mp3`
- `audio/voice/_raw/spell_accio.mp3`
- `audio/voice/_raw/spell_aguamenti.mp3`
- `audio/voice/_raw/spell_alohomora.mp3`
- `audio/voice/_raw/spell_avada.mp3`
- `audio/voice/_raw/spell_bombarda.mp3`
- `audio/voice/_raw/spell_cheminette_inter_mondes.mp3`
- `audio/voice/_raw/spell_crucio.mp3`
- `audio/voice/_raw/spell_diffindo.mp3`
- `audio/voice/_raw/spell_diffindo_maxima.mp3`
- `audio/voice/_raw/spell_episkey.mp3`
- `audio/voice/_raw/spell_expelliarmus.mp3`
- `audio/voice/_raw/spell_ferula.mp3`
- `audio/voice/_raw/spell_ferula_maxima.mp3`
- `audio/voice/_raw/spell_fiendfyre.mp3`
- `audio/voice/_raw/spell_fulgari.mp3`
- `audio/voice/_raw/spell_fulgur_catena.mp3`
- `audio/voice/_raw/spell_glacius.mp3`
- `audio/voice/_raw/spell_glacius_tempete.mp3`
- `audio/voice/_raw/spell_incendio.mp3`
- `audio/voice/_raw/spell_legilimens.mp3`
- `audio/voice/_raw/spell_lumos_maxima.mp3`
- `audio/voice/_raw/spell_lumos_solem.mp3`
- `audio/voice/_raw/spell_lux_aeterna.mp3`
- `audio/voice/_raw/spell_maledictus.mp3`
- `audio/voice/_raw/spell_marque_pelerin.mp3`
- `audio/voice/_raw/spell_memoire_outremonde.mp3`
- `audio/voice/_raw/spell_morsmordre.mp3`
- `audio/voice/_raw/spell_nox_vorax.mp3`
- `audio/voice/_raw/spell_patronum.mp3`
- `audio/voice/_raw/spell_patronus_maxima.mp3`
- `audio/voice/_raw/spell_portus.mp3`
- `audio/voice/_raw/spell_protego.mp3`
- `audio/voice/_raw/spell_rappel_astral.mp3`
- `audio/voice/_raw/spell_recolte_magique.mp3`
- `audio/voice/_raw/spell_reparo.mp3`
- `audio/voice/_raw/spell_revelio.mp3`
- `audio/voice/_raw/spell_riddikulus.mp3`
- `audio/voice/_raw/spell_sanguini.mp3`
- `audio/voice/_raw/spell_sceau_du_voyageur.mp3`
- `audio/voice/_raw/spell_sectumsempra.mp3`
- `audio/voice/_raw/spell_sectumsempra_imperius.mp3`
- `audio/voice/_raw/spell_stupefix.mp3`
- `audio/voice/_raw/spell_tarantallegra.mp3`
- `audio/voice/_raw/spell_vampyrus.mp3`
- `audio/voice/_raw/spell_verrou_de_sang.mp3`
- `audio/voice/_raw/spell_vulnera_sanentur.mp3`
- `audio/voice/_raw/spell_wingardium_leviosa.mp3`
- `audio/voice/_raw/sprout_active_1.mp3`
- `audio/voice/_raw/sprout_apotheose_star.mp3`
- `audio/voice/_raw/sprout_apotheose_star_first.mp3`
- `audio/voice/_raw/sprout_apotheose_star_milestone.mp3`
- `audio/voice/_raw/sprout_donation_intro.mp3`
- `audio/voice/_raw/sprout_donation_large.mp3`
- `audio/voice/_raw/sprout_donation_offer.mp3`
- `audio/voice/_raw/sprout_donation_refuse.mp3`
- `audio/voice/_raw/sprout_donation_small.mp3`
- `audio/voice/_raw/sprout_greeting_1.mp3`
- `audio/voice/_raw/sprout_greeting_2.mp3`
- `audio/voice/_raw/sprout_idle_1.mp3`
- `audio/voice/_raw/sprout_idle_2.mp3`
- `audio/voice/_raw/sprout_idle_3.mp3`
- `audio/voice/_raw/sprout_idle_4.mp3`
- `audio/voice/_raw/sprout_idle_5.mp3`
- `audio/voice/_raw/sprout_idle_6.mp3`
- `audio/voice/_raw/sprout_idle_7.mp3`
- `audio/voice/_raw/sprout_offer_1.mp3`
- `audio/voice/_raw/sprout_ready_1.mp3`

## Gaps prioritaires pour P3.2

- **Musique manquante** (catégories ambient/combat/menu ci-dessus) : repli
  procédural fonctionnel mais moins immersif — cibles d'enregistrement n°1.
- **SFX** : aucun sample (choix de design procédural) — enregistrement
  optionnel si l'on veut remplacer la synthèse des impacts/sorts.
- **Barks** : synthèse vocale par défaut ; enregistrer des OGG par héros×event
  serait un chantier lourd (faible priorité).
