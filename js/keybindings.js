// ============================================================
// REMAPPAGE CONFIGURABLE DES TOUCHES (keybindings)
// ============================================================
// Dernier item ergonomie de ergonomics-improvement.md. Permet de rebinder
// les touches de déplacement, de raccourci d'exploration et d'action de
// combat. Auto-contenu : données + résolveur + rendu de la section Réglages.
//
// Deux CONTEXTES séparés ('explore' / 'combat') : une même touche physique
// (a, s, f) a un sens différent selon le contexte — exactement comme le
// handler historique de main.js. Le résolveur ne regarde que le contexte
// actif (le handler sait s'il est en combat).
//
// Persistance hors-save : localStorage 'hogwarts_rpg_keybindings' (même
// philosophie que les prefs audio / barksEnabled / nom de joueur). DÉFENSIF :
// localStorage indisponible → bindings par défaut, le jeu reste jouable.
//
// DÉFAUTS = comportement actuel au bit près → zéro régression « out of the
// box ». La perso n'existe que si le joueur la crée.
// ============================================================

const KB_STORAGE_KEY = 'hogwarts_rpg_keybindings';

// Catalogue des actions remappables. `def` = touches par défaut (réplique
// exacte de main.js). `ctx` = contexte de résolution. L'ORDRE compte : en cas
// de conflit (même touche sur 2 actions d'un contexte), la première l'emporte.
const KB_ACTIONS = [
  // ── Exploration ──────────────────────────────────────────
  { id: 'moveForward',  ctx: 'explore', move: true, label: 'Avancer',          def: ['ArrowUp', 'w', 'z'] },
  { id: 'moveBackward', ctx: 'explore', move: true, label: 'Reculer',          def: ['ArrowDown', 's'] },
  { id: 'turnLeft',     ctx: 'explore', move: true, label: 'Pivoter à gauche', def: ['ArrowLeft', 'a', 'q'] },
  { id: 'turnRight',    ctx: 'explore', move: true, label: 'Pivoter à droite', def: ['ArrowRight', 'd'] },
  { id: 'openInventory',ctx: 'explore', label: 'Ouvrir le sac',      def: ['i'] },
  { id: 'openSpells',   ctx: 'explore', label: 'Ouvrir les sorts',   def: ['p'] },
  { id: 'openCharacter',ctx: 'explore', label: 'Ouvrir la fiche',    def: ['c'] },
  { id: 'search',       ctx: 'explore', label: 'Fouiller',           def: ['f'] },
  { id: 'rest',         ctx: 'explore', label: 'Se reposer',         def: ['r'] },
  // ── Combat ───────────────────────────────────────────────
  { id: 'atkAttack',    ctx: 'combat',  label: 'Attaquer',  def: ['a'] },
  { id: 'atkSpell',     ctx: 'combat',  label: 'Sortilège', def: ['s'] },
  { id: 'atkGuard',     ctx: 'combat',  label: 'Garde',     def: ['g'] },
  { id: 'atkItem',      ctx: 'combat',  label: 'Objet',     def: ['o'] },
  { id: 'atkFlee',      ctx: 'combat',  label: 'Fuir',      def: ['f'] },
];

// Touches structurelles / a11y NON remappables (réservées par convention) :
// on refuse de les capturer comme binding personnalisé.
const KB_RESERVED = new Set(['Escape', 'Tab', 'Enter']);

// Map action de combat → argument de battleAction().
const KB_COMBAT_ARG = {
  atkAttack: 'attack', atkSpell: 'spell', atkGuard: 'guard',
  atkItem: 'item', atkFlee: 'flee',
};

// Overrides joueur : { actionId: [keys] }. Une entrée présente (même []) écrase
// le défaut → un joueur peut vider entièrement une action.
let _kbBindings = {};
let _kbCapturing = null;   // actionId en cours de capture, ou null

// Normalise une touche : lettres/chiffres/ponctuation 1-char → minuscule ;
// touches nommées (ArrowUp…) inchangées. Rend le matching insensible à la casse.
function _kbNorm(key) {
  if (typeof key !== 'string' || !key) return '';
  return key.length === 1 ? key.toLowerCase() : key;
}

// Libellé lisible d'une touche pour l'UI.
function _kbKeyLabel(key) {
  const map = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    ' ': 'Espace',
  };
  if (map[key]) return map[key];
  return key.length === 1 ? key.toUpperCase() : key;
}

function _kbActionById(id) {
  return KB_ACTIONS.find(a => a.id === id) || null;
}

// Touches effectives d'une action (override joueur sinon défaut).
function kbKeysFor(actionId) {
  if (Object.prototype.hasOwnProperty.call(_kbBindings, actionId)) {
    return _kbBindings[actionId];
  }
  const a = _kbActionById(actionId);
  return a ? a.def.slice() : [];
}

// La touche `eventKey` déclenche-t-elle `actionId` ?
function kbMatch(actionId, eventKey) {
  const n = _kbNorm(eventKey);
  return kbKeysFor(actionId).some(k => _kbNorm(k) === n);
}

// Résout une touche → id d'action du contexte donné (1ʳᵉ correspondance), ou null.
function _kbResolve(ctx, eventKey) {
  for (const a of KB_ACTIONS) {
    if (a.ctx !== ctx) continue;
    if (kbMatch(a.id, eventKey)) return a.id;
  }
  return null;
}
function kbResolveExplore(eventKey) { return _kbResolve('explore', eventKey); }
function kbResolveCombat(eventKey)  { return _kbResolve('combat', eventKey); }

// ── Persistance ──────────────────────────────────────────────
function kbLoad() {
  try {
    const raw = localStorage.getItem(KB_STORAGE_KEY);
    _kbBindings = raw ? (JSON.parse(raw) || {}) : {};
  } catch (_) { _kbBindings = {}; }
}
function kbSave() {
  try { localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(_kbBindings)); }
  catch (_) { /* localStorage indispo : binding en mémoire pour la session */ }
}

// ── Mutations ────────────────────────────────────────────────
function kbAddKey(actionId, rawKey) {
  const a = _kbActionById(actionId);
  if (!a) return false;
  if (KB_RESERVED.has(rawKey)) return false;
  const norm = _kbNorm(rawKey);
  if (!norm) return false;
  const cur = kbKeysFor(actionId).slice();
  if (cur.some(k => _kbNorm(k) === norm)) return false;   // déjà liée
  cur.push(norm);
  _kbBindings[actionId] = cur;
  kbSave();
  return true;
}
function kbRemoveKey(actionId, key) {
  const norm = _kbNorm(key);
  const cur = kbKeysFor(actionId).filter(k => _kbNorm(k) !== norm);
  _kbBindings[actionId] = cur;
  kbSave();
}
function kbResetAll() {
  _kbBindings = {};
  kbSave();
  kbRenderSettings();
}

// ── UI (section Réglages) ────────────────────────────────────
// Compte les conflits par contexte : touche normalisée → nb d'actions liées.
function _kbConflictMap(ctx) {
  const counts = {};
  for (const a of KB_ACTIONS) {
    if (a.ctx !== ctx) continue;
    for (const k of kbKeysFor(a.id)) {
      const n = _kbNorm(k);
      counts[n] = (counts[n] || 0) + 1;
    }
  }
  return counts;
}

function _kbActionRowHtml(a, conflicts) {
  const chips = kbKeysFor(a.id).map(k => {
    const n = _kbNorm(k);
    const clash = conflicts[n] > 1;
    return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:3px;
        font-family:'Cinzel',serif;font-size:11px;background:#0a0705;
        border:1px solid ${clash ? '#a04020' : 'var(--gold-dark)'};color:${clash ? '#e08050' : 'var(--gold-light)'}"
        title="${clash ? 'Conflit : touche partagée dans ce contexte' : ''}">
        ${clash ? '⚠ ' : ''}${htmlEscape(_kbKeyLabel(k))}
        <span role="button" tabindex="0" aria-label="Retirer la touche"
          onclick="kbRemoveKey('${a.id}','${n.replace(/'/g, "\\'")}');kbRenderSettings()"
          style="cursor:pointer;color:#8a6a40;font-weight:bold">×</span>
      </span>`;
  }).join('');
  const capturing = _kbCapturing === a.id;
  const addBtn = capturing
    ? `<span style="font-size:10px;color:#6a8030">⌨ Pressez une touche… (Échap pour annuler)</span>`
    : `<span role="button" tabindex="0" onclick="kbStartCapture('${a.id}')"
        style="cursor:pointer;padding:2px 7px;border-radius:3px;font-size:11px;
        background:#1a1208;border:1px dashed var(--gold-dark);color:#9a7a40">＋ touche</span>`;
  return `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:5px 0">
      <span style="min-width:140px;font-size:12px;color:#c9a84c">${a.label}</span>
      <span style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">${chips || '<span style="font-size:11px;color:#6a5030">(aucune)</span>'} ${addBtn}</span>
    </div>`;
}

function kbRenderSettings() {
  const host = document.getElementById('keybind-list');
  if (!host) return;
  const grp = (ctx, title) => {
    const conflicts = _kbConflictMap(ctx);
    const rows = KB_ACTIONS.filter(a => a.ctx === ctx)
      .map(a => _kbActionRowHtml(a, conflicts)).join('');
    return `<div style="margin-bottom:8px">
        <div style="font-family:'Cinzel',serif;font-size:11px;letter-spacing:1px;color:#8a6a40;margin:6px 0 2px">${title}</div>
        ${rows}</div>`;
  };
  host.innerHTML =
    grp('explore', 'Exploration') +
    grp('combat', 'Combat') +
    `<div style="margin-top:6px">
       <span role="button" tabindex="0" onclick="kbResetAll()"
         style="cursor:pointer;padding:3px 9px;border-radius:3px;font-family:'Cinzel',serif;font-size:11px;
         background:#0a0705;border:1px solid var(--gold-dark);color:#9a7a40">↺ Réinitialiser</span>
     </div>`;
}

// Capture de la prochaine touche pour la lier à `actionId`. Listener en phase
// capture + stopImmediatePropagation → le handler global de main.js ne se
// déclenche pas (pas de déplacement / d'action parasite pendant le rebind).
function kbStartCapture(actionId) {
  if (_kbCapturing) return;
  _kbCapturing = actionId;
  kbRenderSettings();
  const onKey = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    document.removeEventListener('keydown', onKey, true);
    _kbCapturing = null;
    if (e.key !== 'Escape' && !KB_RESERVED.has(e.key)) {
      kbAddKey(actionId, e.key);
    }
    kbRenderSettings();
  };
  document.addEventListener('keydown', onKey, true);
}

// Init au chargement du module (avant toute frappe).
kbLoad();
