---
name: commit-guard
description: Garde-fou à dérouler avant de committer/pousser tout changement de code sur le projet Poudlard & Magie. Enchaîne les 3 règles obligatoires des guidelines : plan écrit à jour (§5) → test headless node tests/smoke.js (§7) → vérification de l'état de la PR avant push (§6). Utiliser systématiquement avant un commit/push, ou dès qu'on dit « commit », « pousse », « finalise », « c'est bon, envoie ». Ne remplace pas une revue de code (skill code-review) ni une vérification fonctionnelle manuelle (skill verify).
---

# Garde-fou commit (plan → test → état PR)

Applique dans l'ordre les 3 règles obligatoires de `.claude/guidelines.md`.
Ne jamais sauter une étape sans le dire explicitement à l'utilisateur.

## 1. Plan écrit (guidelines §5)
Un fichier Markdown de plan doit exister et être à jour dans
`.claude/plans/<feature>.md` :
- liste des étapes avec critères de vérification (§4) ;
- cocher les étapes franchies, noter écarts et décisions ;
- le plan reste vivant jusqu'à la fin du changement.

Exception : changement vraiment trivial (typo, renommage local) → mentionner
explicitement l'absence de plan plutôt que l'éluder.

## 2. Test headless (guidelines §7)
Prérequis (env web vierge → `node_modules`/Chromium absents) :
```bash
node -e "require('playwright')" 2>/dev/null || npm ci
npx playwright install chromium
node tests/smoke.js
```
Si l'install échoue (politique réseau bloquant npm/Playwright), le signaler.
- Échec → **corriger avant de committer**. Jamais « le test échoue mais le
  code est bon ».
- Nouveau comportement → ajouter le scénario dans `tests/smoke.js` (ou test
  dédié) **dans le même commit**.
- Si la zone modifiée n'est pas couverte par le smoke test, le **dire
  explicitement** à l'utilisateur (ne pas prétendre la non-régression).
- Changement purement documentaire (markdown, commentaires) → test recommandé
  mais omissible si justifié.

Autres harnais selon la zone touchée :
```bash
node tests/pwa-smoke.js   # si shell PWA / sw.js / manifest
node tests/select.js      # si flow de sélection de héros
```

## 3. État de la PR avant push (guidelines §6)
**Ne JAMAIS pousser sur la branche d'une PR déjà mergée ou fermée.**

Avant `git push`, si une PR est liée à la branche courante, vérifier son état
via `mcp__github__pull_request_read` (champ `state` + `merged`).

Si la PR est `merged` ou `closed` :
1. Repartir de master : `git fetch origin master && git checkout master && git pull`
2. Créer une **nouvelle branche** descriptive (`claude/<feature>-followup`)
3. Cherry-pick / recréer les commits orphelins
4. Pousser et ouvrir une **nouvelle PR**

Pousser sur une branche post-merge laisse des commits orphelins (hors review)
— erreur silencieuse à éviter. Vaut aussi pour les retours après merge :
ne pas amender l'ancienne PR, en ouvrir une nouvelle.

## 4. Push
Branche de dev imposée pour cette session : voir la consigne de session
(ex. `claude/identify-useful-skills-RRbHO`). Ne jamais pousser sur une autre
branche sans permission explicite. Ne PAS créer de PR sauf demande explicite.
```bash
git push -u origin <branche>
```
Retry uniquement sur erreur réseau, backoff exponentiel (2s, 4s, 8s, 16s).

## Message de commit
Clair et descriptif. Committer/pousser **uniquement** quand l'utilisateur le
demande.
