# Plan — Automatisation des codes coupon Netmarble (Solo Leveling: ARISE)

Objectif : script pour rendre (redeem) des codes coupon sur
https://coupon.netmarble.com/sololv pour plusieurs identifiants de compte (pid).

## Contrat API (rétro-ingénierie de la page Next.js)

- Base same-origin : `https://coupon.netmarble.com`
- `gameCode` = `sololv`
- Validation d'un compte (facultatif) :
  `GET /api/sign/userInfo?gameCode=sololv&pid=<PID>`
  → `{ success:true, resultData:{ playerId, gameCode, joinedCountryCode, ... } }`
- Redemption :
  `POST /api/coupon`  (JSON)
  body : `{ gameCode, couponCode, langCd, pid }`
  → succès : `{ success:true, resultData:{...} }`
  → échec : `{ errorCode, errorMessage, errorCause, httpStatus }`
    (ex. `24002` = code invalide)
- Pas d'authentification, pas de captcha, pas de CSRF token observé.

## Comptes ciblés

| # | pid (NMPlayerID)                   | Pays  |
|---|------------------------------------|-------|
| 1 | 1BDA6DC4F0D648CF9AE140A7A3F9A569   | FR    |
| 2 | BB82DE2F44B64F5F80F1F749530C0007   | (à valider) |

## Étapes

1. [x] Identifier l'endpoint réel + champs (fait par inspection des chunks JS).
2. [x] Confirmer pid #1 valide via `/api/sign/userInfo`.
3. [x] Probe sûr du POST avec code bidon → `24002` (endpoint OK, pas d'auth).
4. [x] Écrire `tools/netmarble-coupon.js` (Node 18+, zéro dépendance, `fetch` natif).
   → vérifier : `node tools/netmarble-coupon.js --dry-run` valide les 2 pid.
5. [x] Redemption réelle du code `LIUZHIGANGGANG` sur les 2 comptes (sur accord
   utilisateur, 2026-06-11) → 2/2 succès.
6. [x] Commit + push sur `claude/coupon-automation-script-5genbx`.

## Hors-scope / notes

- Action externe (redemption) non lancée sans accord explicite : un code coupon
  est en général à usage unique par compte.
- Aucun fichier servi au navigateur du jeu n'est touché → pas de bump cache PWA,
  pas de `tests/smoke.js` concerné (script CLI autonome).
