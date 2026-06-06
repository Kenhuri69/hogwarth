#!/usr/bin/env bash
# PreToolUse(Bash) — installe paresseusement Playwright + Chromium au PREMIER
# appel d'un test, puis laisse la commande s'exécuter normalement. No-op pour
# toute autre commande. Ne bloque JAMAIS la commande (exit 0 quoi qu'il arrive).
#
# Pourquoi un hook plutôt qu'un SessionStart : on ne paie le coût d'install que
# si la session lance réellement un test, pas à chaque démarrage de session.
set +e

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"

# Ne réagir qu'aux commandes qui lancent un harnais Playwright du projet.
case "$cmd" in
  *tests/smoke.js*|*tests/pwa-smoke.js*|*tests/select.js*) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || true

# Déjà installé ? rien à faire (idempotent : appels suivants instantanés).
if node -e "require('playwright')" 2>/dev/null; then
  exit 0
fi

echo "[ensure-test-deps] Playwright absent — npm ci + chromium…" >&2
npm ci >/dev/null 2>&1 || npm install >/dev/null 2>&1
npx playwright install chromium >/dev/null 2>&1

# Caveat politique réseau : si l'install a échoué, prévenir l'utilisateur via
# un systemMessage JSON, mais NE PAS bloquer (le test échouera lisiblement).
if ! node -e "require('playwright')" 2>/dev/null; then
  printf '{"systemMessage":"%s"}\n' "Echec install Playwright (politique reseau ?). Le test va echouer — installer manuellement: npm ci && npx playwright install chromium"
fi
exit 0
