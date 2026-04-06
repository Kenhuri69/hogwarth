// ============================================================
// ICONS.JS — Icônes SVG des créatures
// ============================================================
// Chaque SVG utilise fill="currentColor" comme couleur principale.
// La propriété CSS `color` du conteneur contrôle donc toute la palette.
// Les détails sombres (yeux, crocs…) sont codés en dur (#0d0705).
//
// Pour ajouter une icône à un monstre de monsters.js :
//   1. Ajoutez une clé avec l'id du monstre dans MONSTER_ICONS
//   2. Collez votre SVG (viewBox="0 0 100 100" recommandé)
//   3. Remplacez les fills par fill="currentColor"
//
// Si aucune icône n'est trouvée pour l'id, on cherche par catégorie,
// puis on repasse sur l'emoji défini dans monsters.js.
// ============================================================

const MONSTER_ICONS = {

  // ── Par ID ─────────────────────────────────────────────────

  chat_norris: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="62" rx="28" ry="22" fill="currentColor"/>
    <ellipse cx="50" cy="36" rx="20" ry="18" fill="currentColor"/>
    <polygon points="32,26 27,8 40,22" fill="currentColor"/>
    <polygon points="68,26 73,8 60,22" fill="currentColor"/>
    <ellipse cx="43" cy="33" rx="5" ry="6" fill="#0d0705" opacity=".8"/>
    <ellipse cx="57" cy="33" rx="5" ry="6" fill="#0d0705" opacity=".8"/>
    <circle cx="50" cy="40" r="2.5" fill="#0d0705" opacity=".6"/>
    <path d="M40 43 Q34 42 26 44 M60 43 Q66 42 74 44" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".5"/>
    <path d="M78 67 Q92 56 90 76 Q88 90 76 84" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/>
  </svg>`,

  peeves: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="40" rx="28" ry="30" fill="currentColor" opacity=".88"/>
    <path d="M22 56 Q22 78 33 80 Q44 80 44 66 Q44 80 55 80 Q66 80 66 66 Q66 80 78 80 Q79 56 78 56 Z" fill="currentColor" opacity=".88"/>
    <ellipse cx="40" cy="36" rx="6" ry="8" fill="#0d0705" opacity=".8"/>
    <ellipse cx="60" cy="36" rx="6" ry="8" fill="#0d0705" opacity=".8"/>
    <path d="M42 52 Q50 58 58 52" stroke="#0d0705" stroke-width="2" fill="none" opacity=".55"/>
    <circle cx="50" cy="15" r="5" fill="currentColor" opacity=".5"/>
    <circle cx="38" cy="12" r="3" fill="currentColor" opacity=".35"/>
    <circle cx="62" cy="12" r="3" fill="currentColor" opacity=".35"/>
  </svg>`,

  myrtle: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="40" rx="26" ry="28" fill="currentColor" opacity=".75"/>
    <path d="M24 54 Q20 78 34 80 Q44 80 44 65 Q44 80 56 80 Q70 78 76 54 Z" fill="currentColor" opacity=".75"/>
    <ellipse cx="41" cy="36" rx="5" ry="7" fill="#0d0705" opacity=".75"/>
    <ellipse cx="59" cy="36" rx="5" ry="7" fill="#0d0705" opacity=".75"/>
    <path d="M43 50 Q50 55 57 50" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".5"/>
    <path d="M38 56 Q36 65 32 68" stroke="currentColor" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M62 56 Q64 65 68 68" stroke="currentColor" stroke-width="2" fill="none" opacity=".5"/>
  </svg>`,

  serpent_cachot: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 88 Q25 86 20 68 Q15 48 35 42 Q55 36 55 20 Q55 10 50 8" stroke="currentColor" stroke-width="13" fill="none" stroke-linecap="round"/>
    <ellipse cx="49" cy="7" rx="11" ry="8" fill="currentColor" transform="rotate(-15,49,7)"/>
    <circle cx="44" cy="4" r="2.5" fill="#0d0705"/>
    <circle cx="54" cy="4" r="2.5" fill="#0d0705"/>
    <path d="M49 14 L44 20 M49 14 L54 20" stroke="#0d0705" stroke-width="1.5" fill="none"/>
    <ellipse cx="33" cy="62" rx="8" ry="5" fill="currentColor" opacity=".35"/>
  </svg>`,

  gobelin: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="34" rx="22" ry="20" fill="currentColor"/>
    <path d="M28 54 Q28 86 40 88 L60 88 Q72 86 72 54 Q72 44 50 42 Q28 44 28 54 Z" fill="currentColor"/>
    <polygon points="30,34 16,25 26,40" fill="currentColor"/>
    <polygon points="70,34 84,25 74,40" fill="currentColor"/>
    <ellipse cx="42" cy="31" rx="5.5" ry="7" fill="#0d0705" opacity=".8"/>
    <ellipse cx="58" cy="31" rx="5.5" ry="7" fill="#0d0705" opacity=".8"/>
    <path d="M43 44 Q50 50 57 44" stroke="#0d0705" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M28 54 L14 48 L18 65 L26 62" fill="currentColor" opacity=".85"/>
    <path d="M72 54 L86 48 L82 65 L74 62" fill="currentColor" opacity=".85"/>
    <rect x="58" y="54" width="22" height="6" rx="2" fill="currentColor" opacity=".7" transform="rotate(-15,58,54)"/>
  </svg>`,

  araignee: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="58" r="20" fill="currentColor"/>
    <ellipse cx="50" cy="36" rx="13" ry="11" fill="currentColor"/>
    <path d="M30 52 Q14 42 7 26" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M30 58 Q11 57 4 46" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M32 64 Q16 72 11 84" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M36 68 Q26 80 23 91" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M70 52 Q86 42 93 26" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M70 58 Q89 57 96 46" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M68 64 Q84 72 89 84" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M64 68 Q74 80 77 91" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="44" cy="33" r="3.5" fill="#0d0705" opacity=".85"/>
    <circle cx="56" cy="33" r="3.5" fill="#0d0705" opacity=".85"/>
    <circle cx="37" cy="28" r="2" fill="#0d0705" opacity=".7"/>
    <circle cx="63" cy="28" r="2" fill="#0d0705" opacity=".7"/>
  </svg>`,

  troll: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="30" rx="26" ry="22" fill="currentColor"/>
    <path d="M24 52 Q24 86 36 89 L64 89 Q76 86 76 52 Q76 40 50 38 Q24 40 24 52 Z" fill="currentColor"/>
    <path d="M24 52 L8 62 L10 78 L22 72" fill="currentColor"/>
    <path d="M76 52 L92 62 L90 78 L78 72" fill="currentColor"/>
    <ellipse cx="41" cy="26" rx="6" ry="7" fill="#0d0705" opacity=".8"/>
    <ellipse cx="59" cy="26" rx="6" ry="7" fill="#0d0705" opacity=".8"/>
    <path d="M41 18 L44 8 M59 18 L56 8" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <path d="M42 40 Q50 46 58 40" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".6"/>
    <rect x="62" y="44" width="28" height="8" rx="3" fill="currentColor" opacity=".7"/>
  </svg>`,

  centaure: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="56" cy="70" rx="32" ry="17" fill="currentColor"/>
    <path d="M28 80 L22 96 M40 83 L38 98 M72 83 L74 98 M82 80 L88 96" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M34 55 Q34 34 50 28 Q66 34 66 55 Q61 70 50 70 Q39 70 34 55 Z" fill="currentColor"/>
    <ellipse cx="50" cy="20" rx="14" ry="13" fill="currentColor"/>
    <circle cx="45" cy="18" r="3" fill="#0d0705" opacity=".8"/>
    <circle cx="55" cy="18" r="3" fill="#0d0705" opacity=".8"/>
    <path d="M64 42 Q78 30 73 52" stroke="currentColor" stroke-width="3" fill="none"/>
    <path d="M64 42 L82 18" stroke="#0d0705" stroke-width="2" opacity=".7"/>
    <path d="M60 52 L64 42" stroke="currentColor" stroke-width="2.5" fill="none"/>
  </svg>`,

  detraqueur: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8 Q34 8 28 20 L18 52 Q16 68 27 76 Q24 82 28 90 Q36 94 50 92 Q64 94 72 90 Q76 82 73 76 Q84 68 82 52 L72 20 Q66 8 50 8 Z" fill="currentColor" opacity=".92"/>
    <path d="M27 76 Q18 84 12 98 L34 92" fill="currentColor" opacity=".65"/>
    <path d="M73 76 Q82 84 88 98 L66 92" fill="currentColor" opacity=".65"/>
    <path d="M37 50 Q41 43 50 47 Q59 43 63 50 Q59 62 50 64 Q41 62 37 50 Z" fill="#0d0705" opacity=".9"/>
    <circle cx="41" cy="46" r="3.5" fill="#0d0705"/>
    <circle cx="59" cy="46" r="3.5" fill="#0d0705"/>
    <path d="M44 56 Q50 60 56 56" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".4"/>
  </svg>`,

  loup_garou: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 88 L28 72 Q12 66 12 50 Q12 28 34 24 L38 8 L44 26 Q50 20 56 26 L62 8 L66 24 Q88 28 88 50 Q88 66 72 72 Z" fill="currentColor"/>
    <path d="M36 44 Q42 38 50 41 Q58 38 64 44" fill="#0d0705" opacity=".4"/>
    <ellipse cx="39" cy="41" rx="5" ry="6" fill="#0d0705" opacity=".82"/>
    <ellipse cx="61" cy="41" rx="5" ry="6" fill="#0d0705" opacity=".82"/>
    <path d="M43 58 Q50 63 57 58" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".6"/>
    <path d="M43 58 L40 65 M57 58 L60 65" stroke="#0d0705" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M28 72 L18 82 L20 92" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M72 72 L82 82 L80 92" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`,

  mangemort: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 14 Q28 14 22 34 Q16 54 28 64 Q28 78 35 80 L65 80 Q72 78 72 64 Q84 54 78 34 Q72 14 50 14 Z" fill="currentColor"/>
    <ellipse cx="38" cy="44" rx="9" ry="11" fill="#0d0705" opacity=".88"/>
    <ellipse cx="62" cy="44" rx="9" ry="11" fill="#0d0705" opacity=".88"/>
    <path d="M36 72 L36 82 M44 72 L44 82 M56 72 L56 82 M64 72 L64 82" stroke="#0d0705" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>
    <ellipse cx="50" cy="64" rx="6" ry="3" fill="#0d0705" opacity=".5"/>
    <path d="M30 24 Q50 10 70 24" stroke="currentColor" stroke-width="4" fill="none" opacity=".5"/>
  </svg>`,

  sorcier_renegat: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 80 L28 65 L22 40 L38 28 L50 30 L62 28 L78 40 L72 65 Z" fill="currentColor"/>
    <ellipse cx="50" cy="22" rx="16" ry="15" fill="currentColor"/>
    <path d="M34 28 L20 10 L36 24" fill="currentColor"/>
    <circle cx="44" cy="19" r="3.5" fill="#0d0705" opacity=".8"/>
    <circle cx="56" cy="19" r="3.5" fill="#0d0705" opacity=".8"/>
    <path d="M72 55 L90 48 L85 70" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="90" cy="47" r="5" fill="currentColor" opacity=".6"/>
    <path d="M86 44 L96 36 M86 44 L94 54" stroke="currentColor" stroke-width="2" fill="none" opacity=".7"/>
  </svg>`,

  basilic: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 62 Q20 44 36 44 Q46 44 50 34 Q54 18 70 18 Q86 18 88 34 Q90 52 74 56 Q70 68 64 82 L38 82 Q32 68 22 68 Z" fill="currentColor"/>
    <polygon points="70,18 80,4 73,22" fill="currentColor" opacity=".82"/>
    <polygon points="88,34 100,26 87,42" fill="currentColor" opacity=".82"/>
    <ellipse cx="78" cy="27" rx="6" ry="5" fill="#0d0705" opacity=".9"/>
    <path d="M78 34 L73 42 M78 34 L83 42" stroke="#0d0705" stroke-width="2" fill="none"/>
    <path d="M38 82 L33 94 L50 82 L56 95 L64 82" fill="currentColor" opacity=".75"/>
    <path d="M36 56 Q46 50 60 54" stroke="currentColor" stroke-width="3" fill="none" opacity=".4"/>
  </svg>`,

  nagini: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 92 Q20 88 15 66 Q10 44 32 38 Q52 32 52 16 Q52 7 46 5" stroke="currentColor" stroke-width="15" fill="none" stroke-linecap="round"/>
    <ellipse cx="45" cy="4" rx="13" ry="9" fill="currentColor" transform="rotate(-20,45,4)"/>
    <circle cx="40" cy="1" r="3" fill="#0d0705"/>
    <circle cx="50" cy="1" r="3" fill="#0d0705"/>
    <path d="M45 12 L39 20 M45 12 L51 20" stroke="#0d0705" stroke-width="2" fill="none"/>
    <ellipse cx="30" cy="60" rx="10" ry="6" fill="currentColor" opacity=".3"/>
    <ellipse cx="52" cy="82" rx="8" ry="5" fill="currentColor" opacity=".25"/>
  </svg>`,

  voldemort_affaibli: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="36" rx="22" ry="25" fill="currentColor" opacity=".7"/>
    <path d="M28 50 Q18 70 24 86 Q34 95 50 92 Q66 95 76 86 Q82 70 72 50 Z" fill="currentColor" opacity=".6"/>
    <path d="M18 60 Q8 72 12 88 L28 80" fill="currentColor" opacity=".4"/>
    <path d="M82 60 Q92 72 88 88 L72 80" fill="currentColor" opacity=".4"/>
    <ellipse cx="40" cy="32" rx="7" ry="8" fill="#0d0705" opacity=".85"/>
    <ellipse cx="60" cy="32" rx="7" ry="8" fill="#0d0705" opacity=".85"/>
    <path d="M44 48 Q50 53 56 48" stroke="#0d0705" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M35 20 Q50 8 65 20 Q50 14 35 20" fill="currentColor" opacity=".5"/>
    <path d="M30 30 Q22 20 26 14 M70 30 Q78 20 74 14" stroke="currentColor" stroke-width="3" fill="none" opacity=".4"/>
  </svg>`,

  // ── Fallbacks par catégorie ──────────────────────────────────

  fantôme: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="42" rx="26" ry="28" fill="currentColor" opacity=".85"/>
    <path d="M24 56 Q22 80 34 82 Q44 82 44 68 Q44 82 56 82 Q68 80 76 56 Z" fill="currentColor" opacity=".85"/>
    <ellipse cx="41" cy="38" rx="5" ry="7" fill="#0d0705" opacity=".75"/>
    <ellipse cx="59" cy="38" rx="5" ry="7" fill="#0d0705" opacity=".75"/>
  </svg>`,

  bête: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="55" rx="28" ry="22" fill="currentColor"/>
    <ellipse cx="50" cy="34" rx="18" ry="16" fill="currentColor"/>
    <circle cx="43" cy="30" r="4" fill="#0d0705" opacity=".8"/>
    <circle cx="57" cy="30" r="4" fill="#0d0705" opacity=".8"/>
    <polygon points="36,24 32,12 42,22" fill="currentColor"/>
    <polygon points="64,24 68,12 58,22" fill="currentColor"/>
  </svg>`,

  humain: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="28" rx="16" ry="18" fill="currentColor"/>
    <path d="M30 48 Q30 85 42 88 L58 88 Q70 85 70 48 Q70 38 50 36 Q30 38 30 48 Z" fill="currentColor"/>
    <path d="M30 48 L14 56 L16 74 L28 68" fill="currentColor"/>
    <path d="M70 48 L86 56 L84 74 L72 68" fill="currentColor"/>
    <circle cx="43" cy="24" r="4" fill="#0d0705" opacity=".75"/>
    <circle cx="57" cy="24" r="4" fill="#0d0705" opacity=".75"/>
  </svg>`,

  créature: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 88 L24 70 Q10 62 10 48 Q10 26 34 22 L38 6 L46 28 Q50 20 54 28 L62 6 L66 22 Q90 26 90 48 Q90 62 76 70 Z" fill="currentColor"/>
    <circle cx="40" cy="42" r="5" fill="#0d0705" opacity=".82"/>
    <circle cx="60" cy="42" r="5" fill="#0d0705" opacity=".82"/>
  </svg>`,

  "être magique": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10 Q30 12 24 30 L20 58 Q18 72 30 80 Q28 88 32 94 L68 94 Q72 88 70 80 Q82 72 80 58 L76 30 Q70 12 50 10 Z" fill="currentColor" opacity=".9"/>
    <ellipse cx="40" cy="46" rx="7" ry="8" fill="#0d0705" opacity=".88"/>
    <ellipse cx="60" cy="46" rx="7" ry="8" fill="#0d0705" opacity=".88"/>
    <path d="M44 62 Q50 67 56 62" stroke="#0d0705" stroke-width="2" fill="none" opacity=".6"/>
  </svg>`,

};

// ── Couleurs de base par catégorie ───────────────────────────
// Chaque monstre hérite de sa catégorie, sauf si monsters.js définit une `color`
const MONSTER_BASE_COLORS = {
  bête:           '#7a5c30',
  humain:         '#607880',
  fantôme:        '#90aab8',
  créature:       '#4e6e40',
  'être magique': '#6a3898',
};

// ── Couleurs des variantes ───────────────────────────────────
// Ces couleurs remplacent la teinte de base quand un monstre est renforcé
const VARIANT_COLORS = {
  normal:  null,          // couleur de base inchangée
  fierce:  '#b84010',     // rouge ardent
  ancient: '#4a2070',     // violet sombre
  shiny:   '#c8920a',     // or brillant
};

// ── Fonction principale ──────────────────────────────────────
function getMonsterIconHtml(monster, sizePx) {
  const svgStr = MONSTER_ICONS[monster.id] || MONSTER_ICONS[monster.category] || null;
  const variant = monster.variant || 'normal';

  // Couleur : priorité monster.color > couleur variante > couleur catégorie
  const baseColor  = monster.color || MONSTER_BASE_COLORS[monster.category] || '#8a6840';
  const finalColor = VARIANT_COLORS[variant] || baseColor;

  if (svgStr) {
    return `<div class="monster-icon variant-${variant}"
                 style="width:${sizePx}px;height:${sizePx}px;color:${finalColor}">
              ${svgStr}
            </div>`;
  }
  // Fallback emoji
  return `<div class="monster-icon variant-${variant} monster-emoji-fallback"
               style="font-size:${Math.floor(sizePx * 0.75)}px;color:${finalColor};
                      width:${sizePx}px;height:${sizePx}px">
            ${monster.icon}
          </div>`;
}
