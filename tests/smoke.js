// ============================================================
// Tests fumée — Hogwarth (runner)
// Usage : node tests/smoke.js [filtres] [--jobs=N]
// Pré-requis : Playwright installé (chromium).
//
// Depuis le découpage : les helpers partagés vivent dans
// tests/lib/harness.js et les scénarios dans tests/scenarios/<domaine>.js.
// Ce fichier ne fait qu'assembler et exécuter la liste, avec le filtre CLI
// et le pool de parallélisme.
// ============================================================

const os = require('os');
const util = require('util');
const { AsyncLocalStorage } = require('async_hooks');

// ── Capture de sortie par scénario ───────────────────────────
// `console.log` est redirigé vers le tampon du scénario courant quand il y en
// a un (mode parallèle), sinon vers la sortie réelle (mode séquentiel, en-têtes
// du runner). Les scénarios continuent d'appeler `console.log` normalement —
// aucun des 281 n'a besoin de savoir qu'il tourne peut-être en parallèle.
const OUTPUT  = new AsyncLocalStorage();
const realLog = console.log.bind(console);
const realErr = console.error.bind(console);
const capture = (real) => (...args) => {
  const buf = OUTPUT.getStore();
  if (buf) buf.push(util.formatWithOptions({ colors: false }, ...args));
  else real(...args);
};
console.log   = capture(realLog);
console.error = capture(realErr);

// ── Sélection de scénarios (filtre CLI / env) ────────────────
//   node tests/smoke.js crit visit         → scénarios contenant "crit" OU "visit"
//   node tests/smoke.js --only=crit,visit   → idem (forme explicite)
//   SMOKE_ONLY=crit,visit node tests/smoke.js
// Matching insensible à la casse sur le nom de fonction. Consommé par
// tests/select.js (mapping fichiers modifiés → scénarios).
function parseScenarioFilters() {
  const out = [];
  const fromEnv = (process.env.SMOKE_ONLY || '').trim();
  if (fromEnv) out.push(...fromEnv.split(','));
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--only=')) out.push(...arg.slice('--only='.length).split(','));
    else if (!arg.startsWith('-')) out.push(arg);
  }
  return out.map(s => s.trim().toLowerCase()).filter(Boolean);
}

// ── Parallélisme (pool de scénarios) ─────────────────────────
//   node tests/smoke.js --jobs=4     → 4 scénarios de front
//   SMOKE_JOBS=1 node tests/smoke.js → séquentiel (debug)
// Les scénarios sont indépendants par construction (chacun lance son propre
// Chromium, aucun n'écrit sur le disque ni n'ouvre de port) : les faire tourner
// de front ne demande aucune modification côté scénarios.
//
// Défaut = parallélisme disponible, borné à 8 (chaque scénario en vol coûte un
// Chromium en mémoire). Un scénario passe l'essentiel de son temps à ATTENDRE
// le navigateur, pas à occuper le CPU du process Node : c'est ce qui rend le
// gain possible bien au-delà d'un scénario par cœur.
function parseJobs() {
  const raw = process.env.SMOKE_JOBS
    || (process.argv.slice(2).find(a => a.startsWith('--jobs=')) || '').slice('--jobs='.length);
  const asked = parseInt(raw, 10);
  if (Number.isFinite(asked) && asked > 0) return asked;
  const cores = (os.availableParallelism ? os.availableParallelism() : os.cpus().length) || 1;
  return Math.max(1, Math.min(8, cores - 1));
}

// Exécute `list` avec au plus `jobs` scénarios en vol.
//
// Deux propriétés à tenir, sinon la parallélisation coûte plus qu'elle ne
// rapporte :
//   1. La SORTIE reste lisible et DÉTERMINISTE. Chaque scénario écrit dans son
//      propre tampon (AsyncLocalStorage : le contexte suit les `await`, donc
//      `console.log` retrouve le bon tampon sans qu'aucun scénario ne le sache),
//      et les tampons sont vidés dans l'ordre de la LISTE, pas dans l'ordre
//      d'achèvement. Le log d'un run parallèle est identique à celui d'un run
//      séquentiel.
//   2. La SÉMANTIQUE D'ÉCHEC ne change pas : à la première erreur on cesse
//      d'ordonnancer, on laisse finir ce qui est en vol, on vide les tampons,
//      et l'appelant sort en 1.
async function runPool(list, jobs) {
  if (jobs <= 1) {                     // chemin séquentiel strict (debug)
    for (const s of list) await s();
    return null;
  }
  const buffers = new Array(list.length).fill(null);
  const done    = new Array(list.length).fill(false);
  let flushed = 0;                     // pointeur d'écriture (ordre de la liste)
  let failure = null;
  let next    = 0;

  // `final` : après l'arrêt du pool, on ne peut plus attendre les trous (des
  // scénarios n'ont jamais démarré) — on saute les non-exécutés pour ne pas
  // perdre la sortie des scénarios qui, eux, ont tourné jusqu'au bout.
  const flushReady = (final = false) => {
    while (flushed < list.length && (done[flushed] || final)) {
      if (buffers[flushed]) for (const line of buffers[flushed]) realLog(line);
      buffers[flushed] = null;         // libère au fil de l'eau
      flushed++;
    }
  };

  const worker = async () => {
    while (!failure) {
      const i = next++;
      if (i >= list.length) return;
      const buf = [];
      buffers[i] = buf;
      try {
        await OUTPUT.run(buf, () => list[i]());
      } catch (err) {
        if (!failure) failure = err;   // on garde la PREMIÈRE erreur
      } finally {
        done[i] = true;
        flushReady();
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(jobs, list.length) }, worker));
  flushReady(true);                    // scénarios en vol terminés après l'arrêt
  return failure;
}

// Modules de scénarios par domaine. Chaque module exporte { scenarios: [...] }.
const modules = [
  require('./scenarios/audio.js'),
  require('./scenarios/codex.js'),
  require('./scenarios/combat.js'),
  require('./scenarios/controls.js'),
  require('./scenarios/dungeon.js'),
  require('./scenarios/fx.js'),
  require('./scenarios/houses.js'),
  require('./scenarios/inventory.js'),
  require('./scenarios/misc.js'),
  require('./scenarios/multiplayer.js'),
  require('./scenarios/npc.js'),
  require('./scenarios/potions.js'),
  require('./scenarios/quests.js'),
  require('./scenarios/save.js'),
  require('./scenarios/spells.js'),
  require('./scenarios/visuals.js'),
];
const scenarios = modules.flatMap(m => m.scenarios);

(async () => {
  const filters = parseScenarioFilters();
  const selected = filters.length
    ? scenarios.filter(s => filters.some(f => s.name.toLowerCase().includes(f)))
    : scenarios;
  if (filters.length) {
    console.log(`\n🎯 Filtre actif (${filters.join(', ')}) → ${selected.length}/${scenarios.length} scénario(s) sélectionné(s) :`);
    console.log('   ' + selected.map(s => s.name.replace(/^scenario/, '')).join(', '));
    if (!selected.length) {
      console.error('\n❌ Aucun scénario ne correspond au filtre : ' + filters.join(', '));
      process.exit(2);
    }
  }
  const jobs = parseJobs();
  if (jobs > 1) {
    console.log(`\n⚙️  Parallélisme : ${jobs} scénarios de front (--jobs=1 pour revenir au séquentiel).`);
  }

  const failure = await runPool(selected, jobs);
  if (failure) {
    console.error(`\n❌ Échec : ${failure.message}`);
    process.exit(1);
  }
  console.log(`\n✅ ${selected.length} scénario(s) passé(s)${filters.length ? ' (filtré)' : ' — suite complète'}.`);
})().catch(err => {
  console.error('\n❌ Échec :', err.message);
  process.exit(1);
});
