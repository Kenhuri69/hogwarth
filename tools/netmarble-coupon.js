#!/usr/bin/env node
/*
 * netmarble-coupon.js — Redemption automatique de codes coupon Netmarble
 * Jeu : Solo Leveling: ARISE  (https://coupon.netmarble.com/sololv)
 *
 * Zéro dépendance — utilise le `fetch` natif de Node 18+ (testé sur Node 22).
 *
 * USAGE
 *   node tools/netmarble-coupon.js <CODE> [CODE2 ...]
 *   node tools/netmarble-coupon.js --code LIUZHIGANGGANG
 *   node tools/netmarble-coupon.js --dry-run            # valide juste les comptes
 *   node tools/netmarble-coupon.js --pid <PID> CODE     # cible un seul pid ad hoc
 *
 * OPTIONS
 *   --dry-run         N'envoie aucun code : vérifie seulement que chaque pid existe.
 *   --pid <PID>       Remplace la liste de comptes par ce seul pid (répétable).
 *   --lang <LANGCD>   Code langue des messages (défaut EN_US).
 *   --game <CODE>     gameCode Netmarble (défaut sololv).
 *   --no-validate     Saute la vérification /api/sign/userInfo avant redemption.
 *   -h, --help        Affiche cette aide.
 *
 * SORTIE : code de sortie 0 si toutes les redemptions ont réussi, 1 sinon.
 *
 * NB : un code coupon est en général à usage unique PAR COMPTE — relancer un
 * code déjà utilisé renverra une erreur "déjà utilisé" (et c'est attendu).
 */

'use strict';

const BASE = 'https://coupon.netmarble.com';

// --- Comptes ciblés (pid = NMPlayerID, copié depuis le jeu : Options > Account) ---
const ACCOUNTS = [
  { label: 'Compte 1', pid: '1BDA6DC4F0D648CF9AE140A7A3F9A569' },
  { label: 'Compte 2', pid: 'BB82DE2F44B64F5F80F1F749530C0007' },
];

const DEFAULTS = { gameCode: 'sololv', langCd: 'EN_US' };

const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Origin: BASE,
  Referer: `${BASE}/sololv`,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/123.0 Safari/537.36',
};

function parseArgs(argv) {
  const opts = {
    codes: [],
    pids: [],
    dryRun: false,
    validate: true,
    gameCode: DEFAULTS.gameCode,
    langCd: DEFAULTS.langCd,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h': case '--help': opts.help = true; break;
      case '--dry-run': opts.dryRun = true; break;
      case '--no-validate': opts.validate = false; break;
      case '--code': opts.codes.push(argv[++i]); break;
      case '--pid': opts.pids.push(argv[++i]); break;
      case '--lang': opts.langCd = argv[++i]; break;
      case '--game': opts.gameCode = argv[++i]; break;
      default:
        if (a && a.startsWith('--')) { console.error(`Option inconnue : ${a}`); process.exit(2); }
        else if (a) opts.codes.push(a); // argument nu = code coupon
    }
  }
  return opts;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function httpJson(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* corps non-JSON */ }
  return { status: res.status, data };
}

// Vérifie qu'un pid existe pour ce jeu. Renvoie resultData ou null.
async function validatePid(pid, gameCode) {
  const q = new URLSearchParams({ gameCode, pid }).toString();
  const { data } = await httpJson('GET', `/api/sign/userInfo?${q}`);
  if (data && data.success && data.resultData) return data.resultData;
  return null;
}

// Tente la redemption d'un code pour un pid. Renvoie {ok, code, message}.
async function redeem(couponCode, pid, gameCode, langCd) {
  const { data } = await httpJson('POST', '/api/coupon', {
    gameCode, couponCode, langCd, pid,
  });
  if (!data) return { ok: false, code: 'NO_RESPONSE', message: 'Réponse vide/non-JSON' };
  if (data.success) {
    return { ok: true, code: data.errorCode ?? 200, message: 'Succès', resultData: data.resultData };
  }
  // Échec : forme {errorCode, errorMessage, errorCause} ou {success:false, errorCode}
  return {
    ok: false,
    code: data.errorCode ?? 'UNKNOWN',
    message: data.errorCause || data.errorMessage || 'Échec',
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log(require('fs').readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, ''));
    return 0;
  }

  // Comptes : --pid override la liste par défaut
  const accounts = opts.pids.length
    ? opts.pids.map((pid, i) => ({ label: `pid#${i + 1}`, pid }))
    : ACCOUNTS;

  console.log(`Jeu       : ${opts.gameCode}`);
  console.log(`Langue    : ${opts.langCd}`);
  console.log(`Comptes   : ${accounts.length}`);
  console.log(`Codes     : ${opts.codes.length ? opts.codes.join(', ') : '(aucun)'}`);
  console.log('');

  // 1) Validation des comptes
  const valid = [];
  for (const acc of accounts) {
    if (!opts.validate) { valid.push(acc); continue; }
    const info = await validatePid(acc.pid, opts.gameCode);
    if (info) {
      valid.push(acc);
      console.log(`✓ ${acc.label} (${acc.pid}) — OK [${info.joinedCountryCode || '?'} / ${info.gameRegion || '?'}]`);
    } else {
      console.log(`✗ ${acc.label} (${acc.pid}) — pid INVALIDE, ignoré`);
    }
    await sleep(300);
  }
  console.log('');

  if (opts.dryRun) {
    console.log('--dry-run : aucune redemption envoyée.');
    return valid.length === accounts.length ? 0 : 1;
  }
  if (!opts.codes.length) {
    console.log('Aucun code fourni — rien à rendre. (Passe un code en argument.)');
    return 0;
  }

  // 2) Redemption croisée codes × comptes
  let failures = 0;
  for (const code of opts.codes) {
    console.log(`=== Code : ${code} ===`);
    for (const acc of valid) {
      const r = await redeem(code, acc.pid, opts.gameCode, opts.langCd);
      const tag = r.ok ? '✓ OK' : `✗ ÉCHEC [${r.code}]`;
      console.log(`  ${tag.padEnd(18)} ${acc.label} — ${r.message}`);
      if (!r.ok) failures++;
      await sleep(600); // poli envers le serveur
    }
    console.log('');
  }

  const total = opts.codes.length * valid.length;
  console.log(`Terminé : ${total - failures}/${total} redemption(s) réussie(s).`);
  return failures ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => { console.error('Erreur fatale :', err); process.exit(1); });
