# Plan — Voix in-game V2 : extensions

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au démarrage : **non démarré** — items hors-scope V1 de
> `voice-dumbledore-chain.md` (toujours actif, encore bloqué Phase A).
> Pré-requis : `voice-dumbledore-chain` Phase A-D livrée et stabilisée.

## 1. Contexte

`voice-intro-dumbledore.md` (archivé PR #76) a livré la voix narrative
Dumbledore sur l'écran d'intro (2 pages OGG).

`voice-dumbledore-chain.md` (encore ouvert, code prêt, attend la
génération MP3 par l'utilisateur) ajoutera 15 lignes vocales pour les
5 quêtes Dumbledore.

Plusieurs **extensions naturelles** sont listées hors scope :

| Extension | Source |
|-----------|--------|
| Voix pour autres PNJ majeurs (Chefs de Maison, Pomfresh, Hagrid) | `voice-dumbledore-chain.md §10` |
| Voix sur incantation de sorts (alternative à `SpeechSynthesis`) | idem |
| Sous-titres karaoké (synchronisation parole/texte) | idem |
| Localisation FR/EN (alternance langues selon `navigator.language`) | idem |

Ce plan les regroupe en 3 vagues, chacune indépendante.

## 2. Vagues

### Vague A — Voix des 4 Chefs de Maison (priorité haute)

**Pourquoi en premier** : les chefs de Maison délivrent les quêtes de
Set (palier 12 d'`houses-2.0`). Leur donner une voix est cohérent
avec l'investissement narratif du joueur dans son House.

**PNJ ciblés** :
- McGonagall (Gryffondor)
- Rogue (Serpentard)
- Flitwick (Serdaigle)
- Chourave (Poufsouffle)

**Lignes vocales par PNJ** : 5 lignes (cohérent avec le pattern
Dumbledore) :
1. Greeting (1 phrase courte)
2. Quest Intro (introduction de la quête de Set)
3. Quest In Progress (rappel d'objectif)
4. Quest Done (remise de la récompense)
5. Farewell (au revoir)

**Total** : 4 PNJ × 5 lignes = **20 fichiers OGG**.

**Acteurs vocaux ElevenLabs recommandés** :
- McGonagall : voix féminine âgée (Charlotte, Lily) accent écossais.
- Rogue : voix masculine grave (Adam, Antoni) lente, presque chuchotée.
- Flitwick : voix masculine aiguë (Sam, Josh) avec pitch +20 % en post.
- Chourave : voix féminine chaleureuse moyenne (Nicole, Emily).

**Implémentation** :
- Réutiliser le système `AudioSystem.playVoice(id)` existant.
- IDs : `mcgonagall_greeting`, `mcgonagall_quest_intro`, etc.
- Hook : dans `npc-dialog.js — openNpcDialog`, déclencher `playVoice`
  selon état narratif (`getNpcQuestState`).
- Fallback silencieux (déjà géré par `AudioSystem.playVoice`).

**Smoke** : `scenarioHeadOfHouseVoice` : ouvrir dialogue McGonagall,
vérifier `playVoice('mcgonagall_greeting')` appelé.

### Vague B — Voix sur incantation des sorts (refonte audio)

**Spec actuelle** : `AudioSystem.speakSpell(name)` utilise
`SpeechSynthesis` browser (qualité variable, accent forcé `en-GB`).

**Spec V2** : remplacer par samples OGG enregistrés (Hermione voix sur
sorts incantés) :
- 12 sorts × 1 sample = 12 fichiers OGG (~150 ko total).
- Mapping `SPELL_VOICE_MAP[spellName] = 'spell_<spellname>.ogg'`.
- Fallback `SpeechSynthesis` si OGG manquant ou échec chargement.

**Cibles sorts** : Expelliarmus, Stupefix, Episkey, Protego, Incendio,
Reparo, Wingardium Leviosa, Accio, Ferula, Diffindo, Sectumsempra,
Avada Kedavra, Portus.

**Acteur** : voix Hermione (féminine jeune, prononciation soignée).

### Vague C — Sous-titres karaoké (qualité de vie)

**Spec** :
- Pendant lecture vocale, surligner mot par mot dans le texte du
  dialogue (équivalent karaoké).
- Synchronisation : enregistrer un fichier `.json` côté assets avec
  timestamps `[{word: "Bienvenue", t: 0.2}, ...]`.
- Génération : ElevenLabs renvoie un timecodes JSON optionnel à l'API.

**Implémentation** :
- Dans `npc-dialog.js`, parser le texte du dialogue, wrapper chaque mot
  en `<span data-w-idx="N">`.
- `AudioSystem.playVoice(id)` retourne un `<audio>` ; `setInterval` à
  100 ms compare `currentTime` au JSON timecodes, ajoute `.spoken`
  class au span courant.

**ROI** : cosmétique, mais très immersif si bien fait.

### Vague D — Localisation FR/EN

**Spec** :
- Champ `dialogues` devient `dialogues: { fr: [...], en: [...] }`.
- `AudioSystem.playVoice(id)` cherche `audio/voice/<lang>/<id>.ogg`.
- Détection langue : `navigator.language.startsWith('fr')` → `fr`,
  sinon `en`.
- Toggle UI dans le menu options.

**Coût** : doubler tous les samples vocaux + tous les textes des
dialogues. Probablement à différer V3 sauf si demande communautaire
forte.

## 3. Étapes (Vague A à C)

### Vague A — 20 lignes Chefs de Maison

- [ ] Rédiger les 20 textes (5 par PNJ) dans `npcs.js — dialogues`.
- [ ] Briefing ElevenLabs : 4 acteurs choisis + textes dans un .md de prompt.
- [ ] Génération MP3 (utilisateur).
- [ ] Encodage OGG Vorbis (`tools/encode_voice.sh` à créer ou réutiliser).
- [ ] Placement dans `audio/voice/<id>.ogg`.
- [ ] Hook dans `npc-dialog.js` (5 sites par PNJ × 4 = 20 sites).
- [ ] Smoke `scenarioHeadOfHouseVoice` (4 sous-cas).
- [ ] Commit + push.

### Vague B — Voix incantation sorts

- [ ] Briefing ElevenLabs Hermione (1 acteur, 12 prompts).
- [ ] Génération MP3 + encodage OGG.
- [ ] `SPELL_VOICE_MAP` dans `audio-sfx.js`.
- [ ] Modifier `speakSpell` : tenter OGG d'abord, fallback `SpeechSynthesis`.
- [ ] Smoke `scenarioSpellVoiceMapping` (3 sorts au minimum).
- [ ] Commit + push.

### Vague C — Sous-titres karaoké

- [ ] Choisir un dialogue pilote (intro Dumbledore, déjà OGG).
- [ ] Récupérer timecodes JSON ElevenLabs ou générer manuellement.
- [ ] Wrapper texte en `<span data-w-idx>` dans `intro.js — _renderIntroPage`.
- [ ] Boucle 100 ms compare `currentTime` ↔ timecodes.
- [ ] CSS `.spoken { background: rgba(255, 215, 0, 0.3); }`.
- [ ] Itération polissage UX (vitesse, opacité).
- [ ] Smoke `scenarioKaraokeIntro` (vérifier au moins 1 span `.spoken`
      après 1 s de lecture).
- [ ] Commit + push.

### Vague D — Localisation (différée)

- Décision GO/NO-GO basée sur demandes utilisateurs.

## 4. Risques

- Vague A : 20 OGG ≈ 600 ko (acceptable pour GitHub Pages).
- Vague B : remplacer `SpeechSynthesis` par OGG = +1.5 Mo total.
  Mitigation : lazy-load (charger sur premier cast).
- Vague C : synchronisation fragile, dépend des timecodes ElevenLabs
  → tester sur 3 dialogues avant de généraliser.
