// ============================================================
// Tests fumée — Hogwarth (runner)
// Usage : node tests/smoke.js [filtres]
// Pré-requis : Playwright installé (chromium).
//
// Depuis le découpage : les helpers partagés vivent dans
// tests/lib/harness.js et les scénarios dans tests/scenarios/<domaine>.js.
// Ce fichier ne fait qu'assembler et exécuter la liste, avec le filtre CLI.
// ============================================================

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
  for (const s of selected) {
    await s();
  }
  console.log(`\n✅ ${selected.length} scénario(s) passé(s)${filters.length ? ' (filtré)' : ' — suite complète'}.`);
})().catch(err => {
  console.error('\n❌ Échec :', err.message);
  process.exit(1);
});
