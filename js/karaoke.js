// ============================================================
// KARAOKÉ — surlignage progressif du texte au rythme de la voix
// ============================================================
// Vague C du plan .claude/plans/voice-extensions-v2.md.
//
// Synchronisation : timing proportionnel au nombre de caractères.
// edge-tts n'expose pas de `WordBoundary` fiable — plutôt que de
// dépendre d'une métadonnée absente, chaque mot est surligné à
// `frac = caractères cumulés / total`, comparé à la progression réelle
// de la voix (`AudioSystem.getVoiceProgress()`).
//
// Mobile vs desktop : logique identique. Sur mobile (≤700px), le mot
// courant est ramené dans la zone visible via `scrollIntoView` pour les
// modales scrollables (no-op s'il est déjà visible).

const Karaoke = {
  _timer:       null,
  _spans:       [],
  _startFrac:   [],
  _sawProgress: false,

  // Enveloppe chaque mot de `el` dans <span class="kw">, en préservant
  // les espaces. Repart du texte brut (`textContent`) — le pilote (intro
  // Dumbledore) n'a pas de balisage interne.
  wrap(el) {
    this.stop();
    this._spans = [];
    if (!el) return 0;
    const tokens = el.textContent.split(/(\s+)/);
    el.textContent = '';
    for (const tok of tokens) {
      if (tok === '') continue;
      if (/^\s+$/.test(tok)) {
        el.appendChild(document.createTextNode(tok));
      } else {
        const span = document.createElement('span');
        span.className = 'kw';
        span.textContent = tok;
        el.appendChild(span);
        this._spans.push(span);
      }
    }
    return this._spans.length;
  },

  // Démarre la boucle de surlignage. `el` doit déjà avoir été passé à
  // wrap(). Idempotent : annule toute boucle précédente.
  start(el) {
    this.stop();
    const spans = this._spans;
    if (!spans.length) return;

    // Fraction de départ de chaque mot, pondérée par sa longueur.
    const lens  = spans.map(s => s.textContent.length);
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    this._startFrac = [];
    let cum = 0;
    for (const l of lens) { this._startFrac.push(cum / total); cum += l; }

    this._sawProgress = false;
    const reduced = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const mobile  = window.innerWidth <= 700;

    const tick = () => {
      const frac = (typeof AudioSystem !== 'undefined' &&
                    typeof AudioSystem.getVoiceProgress === 'function')
        ? AudioSystem.getVoiceProgress() : -1;

      if (frac < 0) {
        // Voix terminée → tout surligner. Voix jamais lancée (muet,
        // sample absent) → laisser le texte neutre.
        if (this._sawProgress) spans.forEach(s => s.classList.add('spoken'));
        this.stop();
        return;
      }
      this._sawProgress = true;

      let lastIdx = -1;
      for (let i = 0; i < spans.length; i++) {
        if (this._startFrac[i] <= frac) {
          spans[i].classList.add('spoken');
          lastIdx = i;
        }
      }
      if (mobile && lastIdx >= 0) {
        spans[lastIdx].scrollIntoView({
          block: 'nearest', behavior: reduced ? 'auto' : 'smooth'
        });
      }
    };

    tick();
    this._timer = setInterval(tick, 90);
  },

  // Arrête la boucle sans toucher au surlignage déjà appliqué.
  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },

  // Arrête la boucle et retire tout surlignage.
  reset() {
    this.stop();
    this._spans.forEach(s => s.classList.remove('spoken'));
  },
};

window.Karaoke = Karaoke;
