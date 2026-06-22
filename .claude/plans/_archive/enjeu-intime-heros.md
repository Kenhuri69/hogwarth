# Plan — ⚠️3 Enjeu intime par héros (Doc + beats)

> Branche : fraîche depuis `origin/master`. Décision validée par l'utilisateur :
> **Doc + beats** — l'enjeu intime est une **couche de beats scénarisés cosmétiques**
> (zéro nouvelle mécanique, cf. 05 §8.5.3 / guidelines §2), pas un sous-arc/quête.

## Constat

- Ch.05 donne déjà à chaque héros une **Motivation + Arc personnel + Interaction
  Signature**, mais en `💡 proposition` ; Ch.01 §1.3 et Ch.03 point #2 disent encore
  « aucun arc propre à un héros… non tranché ». → contradiction = ⚠️3.
- Infra de livraison déjà là : `heroBarkScripted()` (one-shot, défensif, no-op si
  héros absent). Les 5 beats d'exemple de §5.4.2 sont **déjà câblés** (celeste
  fountainCold, cedric leaveSchool, draco firstMangemort, maxence preVoldemortDefiance,
  anastasia preVoldemortGryff).
- **Vrai trou** : parmi les **6 héros jouables** (harry, hermione, celeste, iris,
  maxence, anastasia), seuls celeste (fountain) + maxence/anastasia (conditionnels)
  ont un beat intime. **Harry, Hermione, Iris** n'en ont aucun qui tire.

## Décision tranchée

L'**enjeu intime** = un beat `descentStake` par héros jouable, voix de sa raison
*personnelle* de descendre, joué **une fois au franchissement 3↔4** (seuil canon
« on quitte l'école, on passe l'examen ») par le **meneur présent**. Cosmétique,
one-shot, défensif. Ne gate rien.

## Étapes & vérifications

1. [x] **hero-barks.js** : ajouter `descentStake` aux 6 héros jouables (harry,
   hermione, celeste, iris, maxence, anastasia), ancré sur leur Motivation/Arc Ch.05.
   → verify : `units` checks présence.
2. [x] **movement-floors.js** : au 3↔4, après le beat Cedric, jouer le `descentStake`
   du meneur présent (one-shot `descent-stake`, supprime le bark générique de tranche).
   → verify : pas de double-parole ; smoke vert.
3. [x] **tests/units.js** : 6 checks `HERO_BARKS.<hero>.descentStake` présent +
   `pickHeroBark` non-null. → verify : `node tests/units.js`.
4. [x] **Docs** : Ch.01 §1.3 (❓→✅), Ch.03 #2 (❓→✅), Ch.05 §5.4.2 (documenter le
   beat `descentStake` + canoniser la couche enjeu intime), roadmap ⚠️3→✅.
5. [x] **Cache PWA** (skill cache-bump) : hero-barks.js + movement-floors.js bumpés
   (index.html + sw.js PRECACHE) + CACHE_VERSION. → `check_cache_versions.js`,
   `pwa-smoke.js`.
6. [x] **Suite** : `node tests/units.js` + `node tests/smoke.js` verts.
7. [~] commit-guard + push + PR + merge.

## Notes
- Cedric/Draco ne sont **pas** jouables → leurs beats ne tirent quasi jamais
  (no-op) ; conservés tels quels (aspirationnels si un jour jouables).
- Pas de mass-edit 💡→✅ des profils Ch.05 (non surgical) : on canonise la couche
  dans §5.4.2 et on tranche les deux énoncés de gap.
