# LOT E — Polish feedback de combat

> Branche : `claude/combat-feedback-e` (depuis `master` à jour).
> Issu de `.claude/plans/game-features-review.md` §3 LOT E.

## Objectif
Renforcer la lisibilité du combat (capitalise sur le LOT B) : retour sonore sur
les coups marquants, frise d'initiative fidèle, découverte du journal sur mobile.

## Réalisé
### E1 — SFX crit / faiblesse élémentaire
- [x] `AudioSystem.playCrit()` (audio-sfx.js) — ping métallique aigu ascendant
  (880/1320/1760 Hz, triangle) par-dessus `playHit`.
- [x] `AudioSystem.playWeakHit()` (audio-sfx.js) — éclat de verre brisé
  (bruit bandpass 2.6 kHz + ton sawtooth descendant).
- [x] Câblage **défensif** (`AudioSystem.playX` testé avant appel) :
  - `executeAttack` (battle.js) : crit physique → `playCrit`.
  - `_spellElementalDamage` (battle-spells.js) : crit de sort → `playCrit`,
    sinon faiblesse élémentaire touchée (`enemy.weak.includes(spell.element)`)
    → `playWeakHit`.

### E2 — Timeline live (frise fidèle)
- [x] `computeTurnOrder()` (ux-improvements.js) **masque les alliés KO** : un
  combattant à terre ne joue pas ce tour, sa présence dans l'ordre induisait en
  erreur. Visible sur sa carte de groupe. Les ennemis morts étaient déjà exclus.

### E3 — Journal de combat mobile
- [x] Choix existant conservé : sur ≤700 px le journal reste **replié** (ne
  masque pas le portrait du monstre). Ajout d'un **pulse de hint one-shot**
  (`clp-hint`, ux-improvements.css) au **tout premier combat** de la session
  pour signaler le journal sans le déplier — retiré après 4,5 s.

## Notes honnêtes
- E3 ne déplie volontairement pas le journal (revient sur un choix délibéré
  d'UX mobile) : le hint visuel est le compromis « afficher un hint » proposé
  dans la revue.
- SFX synthétisés (cohérent avec le reste d'audio-sfx.js, zéro asset).
- PWA : `audio-sfx.js` v2→3, `battle.js` v11→12, `battle-spells.js` v3→4,
  `ux-improvements.js` v1→2, `ux-improvements.css` v1→2 ; `CACHE_VERSION` v22→v23.

## Vérif
- [x] `scenarioCombatFeedback` (E1 méthodes SFX + chemin défensif, E2 KO masqué
  de la frise, E3 journal replié + hinté en viewport 400 px).
- [x] Suite complète **126/126** + `pwa-smoke` (cache v23, offline OK).

## Journal
| Date | Note |
|------|------|
| 2026-05-29 | LOT E (E1+E2+E3) implémenté et testé. |
