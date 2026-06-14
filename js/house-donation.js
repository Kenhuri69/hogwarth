// ============================================================
// SYSTÈME DE DON À LA MAISON (gold-sink endgame illimité)
// ============================================================
// Plan : .claude/plans/house-post-tier-18.md (amendé 2026-05-25).
// Débloque dès tier 17 (Mythe) atteint. Permet au joueur de verser de
// l'or au Chef de Maison pour gagner des points de Maison (1 point pour
// 5 gold). Les paliers 18 (Apothéose) et 19+ (série Apothéose ★ N) sont
// franchissables via ce mécanisme, sous réserve des gates de Boucle
// Ténébreuse (`requiresDarkTier`).
//
// Surface publique :
//   donateGoldToHouse(amount)     — conversion or → points, sans UI
//   openHouseDonationModal()      — ouvre la modale dédiée
//   closeHouseDonationModal()     — ferme la modale
//   confirmHouseDonation()        — valide le montant saisi
//   _playDonationVoice(context)   — joue le sample du Chef (helper)
//   _previewDonationPoints(amount)— pure : montant → points (pour aperçu)
// ============================================================

// ── Conversion or → points de Maison ─────────────────────────
// Taux fixé à 5 G = 1 pt (cf. plan §3.2). Pas de bonus de difficulté ni
// d'amplification — la donation est un sink, pas une source de score.
const _DONATION_GOLD_PER_POINT = 5;

function _previewDonationPoints(amount) {
  const a = Math.max(0, Math.floor(Number(amount) || 0));
  return Math.floor(a / _DONATION_GOLD_PER_POINT);
}

// ── Helper voix off (chef de Maison) ─────────────────────────
function _playDonationVoice(context) {
  if (!chosenHouse) return;
  const bonuses = HOUSE_BONUSES[chosenHouse];
  if (!bonuses) return;
  const chef = bonuses.headOfHouseVoiceKey;
  if (!chef) return;
  if (typeof AudioSystem === 'undefined') return;
  if (typeof AudioSystem.playVoice !== 'function') return;
  AudioSystem.playVoice(`${chef}_${context}`);
}

// ── Conversion or → points ───────────────────────────────────
// Retourne true si la donation a réussi (au moins 1 point gagné), false
// sinon (pas de Maison choisie, pas de tier 17, fonds insuffisants…).
function donateGoldToHouse(amount) {
  if (!chosenHouse) return false;
  if (houseTier < 17) return false;
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric < 1) return false;
  const requested = Math.floor(numeric);
  const real      = Math.min(requested, player.gold | 0);
  if (real < _DONATION_GOLD_PER_POINT) return false;  // < 5 G = 0 pt, refusé

  const points = Math.floor(real / _DONATION_GOLD_PER_POINT);
  const spent  = points * _DONATION_GOLD_PER_POINT;   // pas de gaspillage
  player.gold -= spent;
  housePoints += points;

  if (typeof addMsg === 'function') {
    addMsg(`Don à ${chosenHouse} : −${spent} G · +${points} points`, 'magic');
  }
  if (typeof checkHouseLevelUp === 'function') checkHouseLevelUp();
  if (typeof updateUI === 'function') updateUI();
  return true;
}

// ── Modale de don ────────────────────────────────────────────
function openHouseDonationModal() {
  if (!chosenHouse) return;
  if (houseTier < 17) return;
  const modal = document.getElementById('house-donation-modal');
  if (!modal) return;

  // Voix off : intro à la 1ʳᵉ ouverture, offer ensuite.
  if (!donationIntroPlayed) {
    _playDonationVoice('donation_intro');
    donationIntroPlayed = true;
  } else {
    _playDonationVoice('donation_offer');
  }

  _renderHouseDonationModal();
  modal.style.display = 'flex';
}

function closeHouseDonationModal() {
  const modal = document.getElementById('house-donation-modal');
  if (modal) modal.style.display = 'none';
}

// Re-rendu interne de la modale (titre, aperçu, état du bouton).
// Idempotent — appelé à l'ouverture et après chaque changement d'input.
function _renderHouseDonationModal() {
  const modal = document.getElementById('house-donation-modal');
  if (!modal) return;
  const bonuses = HOUSE_BONUSES[chosenHouse];
  if (!bonuses) return;

  // Titre + en-tête (couleur + emoji Maison).
  const title = document.getElementById('house-donation-title');
  if (title) {
    title.textContent = `${bonuses.emoji} Don à ${bonuses.label}`;
    title.style.color = bonuses.accent;
  }

  // Or actuel.
  const goldEl = document.getElementById('house-donation-gold');
  if (goldEl) goldEl.textContent = `${player.gold | 0} G`;

  // Aperçu : points pour le montant courant + seuil de l'étoile suivante.
  const input  = document.getElementById('house-donation-amount');
  const amount = input ? Number(input.value) | 0 : 0;
  const points = _previewDonationPoints(amount);

  const previewEl = document.getElementById('house-donation-preview');
  if (previewEl) {
    previewEl.textContent = (amount > 0)
      ? `+${points} points (don de ${amount} G)`
      : '—';
  }

  // Étoile suivante (ou Apothéose si pas encore atteint).
  const nextEl = document.getElementById('house-donation-next');
  if (nextEl) {
    nextEl.textContent = _formatNextThreshold(bonuses);
  }

  // État du bouton confirmer.
  const btn = document.getElementById('house-donation-confirm');
  if (btn) {
    const valid = (amount >= _DONATION_GOLD_PER_POINT) && (amount <= (player.gold | 0));
    btn.disabled = !valid;
    btn.style.opacity = valid ? '1' : '0.45';
    btn.style.cursor  = valid ? 'pointer' : 'not-allowed';
  }
}

function _formatNextThreshold(bonuses) {
  // Avant Apothéose : on affiche le tier suivant connu dans `tiers[]`.
  if (houseTier < bonuses.tiers.length) {
    const next = bonuses.tiers[houseTier];  // tier index = houseTier (0-based dans le tableau)
    const remain = Math.max(0, next.threshold - housePoints);
    return `${next.label} — ${housePoints} / ${next.threshold} pts (manque ${remain})`;
  }
  // Tier 18+ : série Apothéose ★ N génératrice.
  const gen = bonuses.starGenerator;
  if (!gen) return `${housePoints} pts`;
  const starN = houseTier - 18;
  const next  = starN + 1;
  const threshold = 45000 + 15000 * next + 1000 * next * next;
  const remain    = Math.max(0, threshold - housePoints);
  return `Apothéose ★ ${next} — ${housePoints} / ${threshold} pts (manque ${remain})`;
}

// ── Boutons rapides : 1k / 5k / 10k / Max ────────────────────
function setHouseDonationAmount(value) {
  const input = document.getElementById('house-donation-amount');
  if (!input) return;
  let v;
  if (value === 'max') {
    v = player.gold | 0;
  } else {
    v = Math.min(Number(value) | 0, player.gold | 0);
  }
  input.value = Math.max(0, v);
  _renderHouseDonationModal();
}

// ── Confirmation (depuis l'UI) ───────────────────────────────
async function confirmHouseDonation() {
  const input = document.getElementById('house-donation-amount');
  if (!input) return;
  const amount = Math.floor(Number(input.value) || 0);

  if (amount < _DONATION_GOLD_PER_POINT || amount > (player.gold | 0)) {
    _playDonationVoice('donation_refuse');
    return;
  }

  if (amount >= 5000 && typeof confirmModal === 'function') {
    const ok = await confirmModal({
      title: 'Confirmer le don',
      body: `Verser ${amount} G à ${chosenHouse} ?`,
      confirmLabel: 'Faire le don'
    });
    if (!ok) return;
  }

  const ok = donateGoldToHouse(amount);
  if (!ok) {
    _playDonationVoice('donation_refuse');
    return;
  }

  _playDonationVoice(amount >= 5000 ? 'donation_large' : 'donation_small');

  // Reset input + redessiner. On laisse la modale ouverte pour faciliter
  // les dons en cascade (le joueur peut donner plusieurs fois de suite).
  input.value = 0;
  _renderHouseDonationModal();
}

// Hook : exposer le re-render comme listener d'input sur la modale.
// Appelé via `oninput=_onHouseDonationAmountChange()` dans le HTML statique.
function _onHouseDonationAmountChange() {
  _renderHouseDonationModal();
}
