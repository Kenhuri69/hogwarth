# Réglages : modale système/audio + fix boutons son

## Contexte
Le bandeau d'actions mobile affiche ~17 boutons (6 lignes) → trop dense.
De plus, après chargement d'une sauvegarde, les boutons audio affichent un
emoji brut (🔕 / 🔇) au lieu de leur icône PNG.

## Décisions (validées avec l'utilisateur)
- Approche : **modale ⚙️ Réglages** regroupant uniquement les boutons
  système + audio. Toutes les actions d'aventure restent sur le bandeau.
- Boutons audio : **gardés séparés** (Musique on/off + Voix on/off), juste
  corriger l'affichage.

## Étapes

### 1. Fix bug audio après chargement de save — ✅ FAIT
- `js/audio.js` : ajout `refreshButtons()` qui resynchronise les `<img>`
  `#btn-music` / `#btn-voice` selon `isMuted` / `voiceEnabled`.
  `toggleMute()` / `toggleVoice()` l'appellent.
- `js/save.js` (`_applyState`) : remplacer `btn.textContent = '🔇'…`
  (qui détruisait le `<img>`) par un appel à `AudioSystem.refreshButtons()`.
- Vérif : `node tests/smoke.js` → 126 scénarios OK. ✅

### 2. Modale Réglages — déplacer système + audio — ✅ FAIT
- `index.html` :
  - Retirer du `.action-group` les boutons : btn-music, btn-voice,
    btn-visits, btn-atelier, Sauver, Charger, Diff, Aide.
  - Les replacer à l'identique (mêmes id/onclick/icônes) dans une nouvelle
    modale `#settings-modal`, avec libellés visibles.
  - Ajouter sur le bandeau un unique bouton `⚙️ Réglages` →
    `openSettingsModal()`.
  - Garder sur le bandeau : toutes les actions d'aventure + Carte (mobile).
- `css/style.css` : ajouter `#settings-modal` à la règle d'affichage des
  modales ; grille de boutons interne.
- JS : `openSettingsModal()` / fermeture via `closeModal('settings-modal')`.
- Vérif : `node tests/smoke.js` doit rester vert ; rendu visuel mobile.

## Vérification finale
- `node tests/smoke.js` vert.
- Chargement d'une save → icônes audio correctes (PNG, pas emoji).
- Bandeau mobile nettement moins dense.
