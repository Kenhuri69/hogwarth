// ============================================================
// ICONS.JS — Icônes SVG des créatures — Version 2.0
// ============================================================
// Chaque SVG utilise fill="currentColor" comme couleur principale.
// La propriété CSS `color` du conteneur contrôle toute la palette.
// Les détails sombres (yeux, crocs…) sont codés en #0d0705.
// ============================================================

const MONSTER_ICONS = {

  // ── BÊTES ──────────────────────────────────────────────────

  chat_norris: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps -->
    <ellipse cx="50" cy="64" rx="26" ry="20" fill="currentColor"/>
    <!-- Tête -->
    <ellipse cx="50" cy="38" rx="20" ry="18" fill="currentColor"/>
    <!-- Oreilles pointues -->
    <polygon points="32,28 26,8 42,24" fill="currentColor"/>
    <polygon points="68,28 74,8 58,24" fill="currentColor"/>
    <!-- Oreilles intérieures -->
    <polygon points="34,27 30,14 41,24" fill="#0d0705" opacity=".35"/>
    <polygon points="66,27 70,14 59,24" fill="#0d0705" opacity=".35"/>
    <!-- Yeux en amande (ambre) -->
    <ellipse cx="42" cy="34" rx="6" ry="5" fill="#c87820"/>
    <ellipse cx="58" cy="34" rx="6" ry="5" fill="#c87820"/>
    <ellipse cx="42" cy="35" rx="2.5" ry="4" fill="#0d0705"/>
    <ellipse cx="58" cy="35" rx="2.5" ry="4" fill="#0d0705"/>
    <circle cx="40" cy="32" r="1.2" fill="white" opacity=".7"/>
    <circle cx="56" cy="32" r="1.2" fill="white" opacity=".7"/>
    <!-- Nez et bouche -->
    <ellipse cx="50" cy="41" rx="3" ry="2" fill="#0d0705" opacity=".6"/>
    <path d="M48 43 Q50 45 52 43" stroke="#0d0705" stroke-width="1.2" fill="none" opacity=".5"/>
    <!-- Moustaches -->
    <path d="M40 41 Q32 40 24 42 M60 41 Q68 40 76 42" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".55"/>
    <path d="M40 44 Q33 45 26 44 M60 44 Q67 45 74 44" stroke="#0d0705" stroke-width="1.2" fill="none" opacity=".4"/>
    <!-- Queue touffue -->
    <path d="M76 70 Q92 58 90 75 Q88 88 78 82" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- Pattes -->
    <path d="M36 82 L32 92 M44 84 L42 94 M56 84 L58 94 M64 82 L68 92" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
  </svg>`,

  luciole: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps allongé d'insecte -->
    <ellipse cx="50" cy="60" rx="10" ry="18" fill="currentColor"/>
    <!-- Tête -->
    <circle cx="50" cy="38" r="11" fill="currentColor"/>
    <!-- Yeux composés -->
    <circle cx="44" cy="35" r="4" fill="#0d0705" opacity=".9"/>
    <circle cx="56" cy="35" r="4" fill="#0d0705" opacity=".9"/>
    <circle cx="43" cy="34" r="1.5" fill="white" opacity=".5"/>
    <circle cx="55" cy="34" r="1.5" fill="white" opacity=".5"/>
    <!-- Antennes -->
    <path d="M46 28 Q42 18 38 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M54 28 Q58 18 62 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="38" cy="11" r="3" fill="currentColor"/>
    <circle cx="62" cy="11" r="3" fill="currentColor"/>
    <!-- Ailes translucides gauches -->
    <ellipse cx="30" cy="52" rx="16" ry="8" fill="currentColor" opacity=".35" transform="rotate(-20 30 52)"/>
    <ellipse cx="32" cy="62" rx="13" ry="6" fill="currentColor" opacity=".25" transform="rotate(-15 32 62)"/>
    <!-- Ailes translucides droites -->
    <ellipse cx="70" cy="52" rx="16" ry="8" fill="currentColor" opacity=".35" transform="rotate(20 70 52)"/>
    <ellipse cx="68" cy="62" rx="13" ry="6" fill="currentColor" opacity=".25" transform="rotate(15 68 62)"/>
    <!-- Lueur abdominale -->
    <ellipse cx="50" cy="68" rx="8" ry="6" fill="#f0e040" opacity=".7"/>
    <ellipse cx="50" cy="68" rx="4" ry="3" fill="white" opacity=".6"/>
    <!-- Pattes -->
    <path d="M42 54 L30 48 M42 60 L28 60 M42 66 L30 70" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M58 54 L70 48 M58 60 L72 60 M58 66 L70 70" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,

  cornichon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps compact -->
    <ellipse cx="50" cy="55" rx="16" ry="20" fill="currentColor"/>
    <!-- Tête plus grosse que le corps -->
    <ellipse cx="50" cy="32" rx="18" ry="16" fill="currentColor"/>
    <!-- Oreilles pointues de farfadet -->
    <polygon points="34,26 26,8 42,22" fill="currentColor"/>
    <polygon points="66,26 74,8 58,22" fill="currentColor"/>
    <!-- Yeux ronds expressifs -->
    <circle cx="42" cy="28" r="5.5" fill="#0d0705" opacity=".9"/>
    <circle cx="58" cy="28" r="5.5" fill="#0d0705" opacity=".9"/>
    <circle cx="40" cy="26" r="2" fill="white" opacity=".6"/>
    <circle cx="56" cy="26" r="2" fill="white" opacity=".6"/>
    <!-- Sourire espiègle -->
    <path d="M44 38 Q50 43 56 38" stroke="#0d0705" stroke-width="2" fill="none" opacity=".7"/>
    <path d="M44 38 L42 42 M56 38 L58 42" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".5"/>
    <!-- Petites ailes de chauve-souris -->
    <path d="M34 48 Q20 38 16 46 Q14 56 30 56 Z" fill="currentColor" opacity=".7"/>
    <path d="M66 48 Q80 38 84 46 Q86 56 70 56 Z" fill="currentColor" opacity=".7"/>
    <!-- Nervures des ailes -->
    <path d="M34 48 Q26 44 20 48 M34 52 Q24 50 18 54" stroke="currentColor" stroke-width="1" fill="none" opacity=".4"/>
    <!-- Bras et mains -->
    <path d="M34 52 L20 44 L18 52 M66 52 L80 44 L82 52" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
    <!-- Pieds -->
    <path d="M42 73 L38 82 M58 73 L62 82" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/>
  </svg>`,

  chouette_envoutee: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps plumeux -->
    <ellipse cx="50" cy="62" rx="24" ry="26" fill="currentColor"/>
    <!-- Tête ronde -->
    <circle cx="50" cy="34" r="22" fill="currentColor"/>
    <!-- Disque facial (chouette) -->
    <ellipse cx="50" cy="36" rx="16" ry="15" fill="currentColor" opacity=".6"/>
    <!-- Grands yeux ronds de chouette -->
    <circle cx="40" cy="32" r="9" fill="#0d0705" opacity=".9"/>
    <circle cx="60" cy="32" r="9" fill="#0d0705" opacity=".9"/>
    <!-- Iris dorés -->
    <circle cx="40" cy="32" r="6" fill="#d4a820"/>
    <circle cx="60" cy="32" r="6" fill="#d4a820"/>
    <!-- Pupilles verticales -->
    <ellipse cx="40" cy="32" rx="2" ry="4" fill="#0d0705"/>
    <ellipse cx="60" cy="32" rx="2" ry="4" fill="#0d0705"/>
    <circle cx="38" cy="30" r="1.5" fill="white" opacity=".7"/>
    <circle cx="58" cy="30" r="1.5" fill="white" opacity=".7"/>
    <!-- Bec crochu -->
    <polygon points="50,42 46,48 54,48" fill="#c87820"/>
    <!-- Aigrettes -->
    <path d="M38 14 Q34 6 30 10 M46 12 Q44 4 40 6 M54 12 Q56 4 60 6 M62 14 Q66 6 70 10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- Ailes -->
    <path d="M26 58 Q8 46 6 62 Q8 76 26 72 Z" fill="currentColor"/>
    <path d="M74 58 Q92 46 94 62 Q92 76 74 72 Z" fill="currentColor"/>
    <!-- Plumes ailes -->
    <path d="M26 58 Q18 52 10 56 M26 64 Q16 62 8 66 M26 70 Q16 70 8 72" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".3"/>
    <!-- Serres -->
    <path d="M40 86 L36 96 L42 94 L44 86 M50 88 L48 98 L52 98 L54 88 M60 86 L58 94 L64 96 L60 86" stroke="#0d0705" stroke-width="2" fill="none" opacity=".6"/>
    <!-- Aura magique -->
    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 6" opacity=".3"/>
  </svg>`,

  araignee: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Abdomen -->
    <ellipse cx="50" cy="62" rx="21" ry="18" fill="currentColor"/>
    <!-- Motif abdomen -->
    <ellipse cx="50" cy="62" rx="12" ry="10" fill="#0d0705" opacity=".25"/>
    <path d="M50 46 L50 78" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".2"/>
    <!-- Céphalothorax -->
    <ellipse cx="50" cy="38" rx="15" ry="13" fill="currentColor"/>
    <!-- 8 yeux en rangées -->
    <circle cx="40" cy="32" r="3.5" fill="#0d0705" opacity=".9"/>
    <circle cx="48" cy="30" r="3" fill="#0d0705" opacity=".9"/>
    <circle cx="56" cy="30" r="3" fill="#0d0705" opacity=".9"/>
    <circle cx="62" cy="33" r="3.5" fill="#0d0705" opacity=".9"/>
    <circle cx="43" cy="38" r="2.5" fill="#0d0705" opacity=".7"/>
    <circle cx="57" cy="38" r="2.5" fill="#0d0705" opacity=".7"/>
    <!-- Chélicères -->
    <path d="M44 49 L40 56 L46 54 M56 49 L60 56 L54 54" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".7"/>
    <!-- 8 pattes articulées -->
    <path d="M35 34 Q20 24 8 18" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M35 40 Q18 36 5 36" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M36 46 Q20 50 8 58" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M38 52 Q24 62 14 74" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M65 34 Q80 24 92 18" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M65 40 Q82 36 95 36" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M64 46 Q80 50 92 58" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M62 52 Q76 62 86 74" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  </svg>`,

  mandragore_sauvage: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps racine bifide -->
    <path d="M36 58 Q26 64 24 76 Q22 88 36 90 Q48 92 54 82 Q58 92 64 90 Q78 88 76 76 Q74 64 64 58 Z" fill="currentColor"/>
    <!-- Tête humanoïde hurlante -->
    <ellipse cx="50" cy="44" rx="19" ry="20" fill="currentColor"/>
    <!-- Bouche grand ouverte (cri) -->
    <ellipse cx="50" cy="53" rx="10" ry="7" fill="#0d0705" opacity=".9"/>
    <path d="M40 50 Q50 47 60 50" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".4"/>
    <!-- Dents -->
    <path d="M42 50 L44 55 L47 51 L50 56 L53 51 L56 55 L58 50" stroke="white" stroke-width="1.5" fill="none" opacity=".6"/>
    <!-- Yeux écarquillés -->
    <circle cx="40" cy="40" r="5.5" fill="#0d0705" opacity=".85"/>
    <circle cx="60" cy="40" r="5.5" fill="#0d0705" opacity=".85"/>
    <circle cx="39" cy="39" r="2" fill="white" opacity=".5"/>
    <circle cx="59" cy="39" r="2" fill="white" opacity=".5"/>
    <!-- Froncement de sourcils furieux -->
    <path d="M34 35 Q40 31 46 35 M54 35 Q60 31 66 35" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".6"/>
    <!-- Feuilles sur la tête -->
    <path d="M50 26 Q46 14 38 8" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M50 26 Q54 14 62 8" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M50 26 Q50 12 50 4" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="38" cy="6" rx="6" ry="4" fill="currentColor"/>
    <ellipse cx="62" cy="6" rx="6" ry="4" fill="currentColor"/>
    <ellipse cx="50" cy="3" rx="6" ry="4" fill="currentColor"/>
    <!-- Radicelles bras -->
    <path d="M28 60 Q16 54 12 62 M28 68 Q14 68 10 76" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M72 60 Q84 54 88 62 M72 68 Q86 68 90 76" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`,

  kappa_douves: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Carapace de tortue -->
    <ellipse cx="50" cy="58" rx="30" ry="24" fill="currentColor"/>
    <!-- Motif carapace hexagonal -->
    <path d="M50 36 L50 80 M34 45 L66 71 M66 45 L34 71" stroke="#0d0705" stroke-width="2" fill="none" opacity=".3"/>
    <!-- Tête de reptile -->
    <ellipse cx="50" cy="36" rx="18" ry="16" fill="currentColor"/>
    <!-- Coupe sur la tête (eau magique) -->
    <ellipse cx="50" cy="28" rx="11" ry="7" fill="#0d0705" opacity=".5"/>
    <ellipse cx="50" cy="28" rx="8" ry="5" fill="#1a4a6a" opacity=".7"/>
    <!-- Yeux globuleux -->
    <circle cx="40" cy="33" r="5" fill="#0d0705" opacity=".9"/>
    <circle cx="60" cy="33" r="5" fill="#0d0705" opacity=".9"/>
    <circle cx="39" cy="32" r="2" fill="#d4a820" opacity=".8"/>
    <circle cx="59" cy="32" r="2" fill="#d4a820" opacity=".8"/>
    <!-- Bec de tortue -->
    <path d="M44 43 Q50 47 56 43" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".7"/>
    <!-- Bras avec mains palmées -->
    <path d="M22 60 Q8 54 6 64 Q8 74 22 70" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M6 62 L2 58 M6 66 L2 64 M6 70 L2 70" stroke="#0d0705" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M78 60 Q92 54 94 64 Q92 74 78 70" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M94 62 L98 58 M94 66 L98 64 M94 70 L98 70" stroke="#0d0705" stroke-width="2" fill="none" opacity=".5"/>
    <!-- Pattes -->
    <path d="M32 80 Q28 90 22 92 M50 82 L50 94 M68 80 Q72 90 78 92" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`,

  hippogriffe_courroux: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps de cheval -->
    <ellipse cx="58" cy="65" rx="28" ry="18" fill="currentColor"/>
    <!-- Pattes -->
    <path d="M36 80 L32 96 M46 82 L44 96 M70 82 L72 96 M80 80 L84 96" stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="none"/>
    <!-- Queue de cheval -->
    <path d="M86 65 Q96 52 94 68 Q96 60 100 72" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- Avant-corps aigle -->
    <ellipse cx="34" cy="48" rx="20" ry="18" fill="currentColor"/>
    <!-- Cou et tête d'aigle -->
    <ellipse cx="26" cy="28" rx="14" ry="13" fill="currentColor"/>
    <!-- Bec crochu d'aigle -->
    <polygon points="13,28 26,22 22,36" fill="#c87820"/>
    <!-- Œil d'aigle perçant -->
    <circle cx="22" cy="24" r="4.5" fill="#0d0705" opacity=".9"/>
    <circle cx="21" cy="23" r="2" fill="#d4a820"/>
    <circle cx="20" cy="22" r="1" fill="white" opacity=".7"/>
    <!-- Crête de plumes -->
    <path d="M26 16 Q20 8 16 10 M30 14 Q28 6 24 6 M34 14 Q36 6 40 8" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- Aile gauche déployée -->
    <path d="M30 44 Q10 28 4 42 Q8 58 30 58 Z" fill="currentColor"/>
    <path d="M30 44 Q18 36 8 40 M30 50 Q16 48 6 52 M30 56 Q14 56 6 58" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".3"/>
    <!-- Aile droite déployée -->
    <path d="M54 42 Q72 26 80 38 Q80 56 58 58 Z" fill="currentColor" opacity=".8"/>
    <path d="M54 42 Q68 36 76 40 M54 50 Q70 48 78 52 M54 56 Q68 56 76 58" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".3"/>
    <!-- Serres -->
    <path d="M24 60 L20 70 L24 68 M30 62 L28 72 L32 70 M36 62 L36 72 L40 70" stroke="#0d0705" stroke-width="2" fill="none" opacity=".7"/>
  </svg>`,

  acromantula_jeune: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Gros abdomen velu -->
    <ellipse cx="50" cy="63" rx="24" ry="20" fill="currentColor"/>
    <!-- Poils abdomen -->
    <path d="M28 56 L24 50 M34 48 L32 42 M50 44 L50 38 M66 48 L68 42 M72 56 L76 50" stroke="currentColor" stroke-width="2" fill="none" opacity=".5"/>
    <!-- Céphalothorax -->
    <ellipse cx="50" cy="40" rx="18" ry="16" fill="currentColor"/>
    <!-- Poils tête -->
    <path d="M36 28 L32 22 M44 26 L42 20 M56 26 L58 20 M64 28 L68 22" stroke="currentColor" stroke-width="2" fill="none" opacity=".5"/>
    <!-- 8 yeux en rangée -->
    <circle cx="36" cy="34" r="4" fill="#0d0705" opacity=".95"/>
    <circle cx="44" cy="30" r="3.5" fill="#0d0705" opacity=".95"/>
    <circle cx="52" cy="29" r="3.5" fill="#0d0705" opacity=".95"/>
    <circle cx="60" cy="30" r="3.5" fill="#0d0705" opacity=".95"/>
    <circle cx="66" cy="35" r="4" fill="#0d0705" opacity=".95"/>
    <circle cx="43" cy="38" r="2.5" fill="#0d0705" opacity=".8"/>
    <circle cx="57" cy="38" r="2.5" fill="#0d0705" opacity=".8"/>
    <!-- Reflets yeux -->
    <circle cx="35" cy="33" r="1.5" fill="white" opacity=".4"/>
    <circle cx="65" cy="34" r="1.5" fill="white" opacity=".4"/>
    <!-- Chélicères avec crochets -->
    <path d="M42 52 L38 60 L44 58" stroke="#0d0705" stroke-width="3" fill="none" opacity=".8"/>
    <path d="M58 52 L62 60 L56 58" stroke="#0d0705" stroke-width="3" fill="none" opacity=".8"/>
    <!-- 8 pattes articulées en 2 segments -->
    <path d="M34 36 Q20 26 10 20" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M32 44 Q14 40 4 42" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M32 52 Q16 56 8 66" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M36 60 Q24 72 18 82" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M66 36 Q80 26 90 20" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M68 44 Q86 40 96 42" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M68 52 Q84 56 92 66" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M64 60 Q76 72 82 82" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`,

  // ── FANTÔMES ───────────────────────────────────────────────

  peeves: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps de poltergeist ondulant -->
    <ellipse cx="50" cy="42" rx="28" ry="30" fill="currentColor" opacity=".88"/>
    <!-- Queue de fantôme dentelée -->
    <path d="M22 56 Q22 76 30 80 Q38 82 38 68 Q38 80 47 82 Q56 80 56 68 Q56 80 64 82 Q72 80 72 68 Q72 80 80 76 Q82 56 78 56 Z" fill="currentColor" opacity=".86"/>
    <!-- Yeux fous exorbités -->
    <ellipse cx="38" cy="36" rx="8" ry="10" fill="#0d0705" opacity=".9"/>
    <ellipse cx="62" cy="36" rx="8" ry="10" fill="#0d0705" opacity=".9"/>
    <circle cx="38" cy="36" r="4" fill="white" opacity=".7"/>
    <circle cx="62" cy="36" r="4" fill="white" opacity=".7"/>
    <circle cx="40" cy="35" r="2" fill="#0d0705"/>
    <circle cx="64" cy="35" r="2" fill="#0d0705"/>
    <!-- Gros sourire malicieux -->
    <path d="M34 52 Q38 62 50 64 Q62 62 66 52" fill="currentColor" opacity=".3"/>
    <path d="M34 52 Q42 60 50 62 Q58 60 66 52" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".7"/>
    <!-- Dents de farfadet -->
    <path d="M40 56 L42 62 M46 58 L47 64 M53 58 L53 64 M58 56 L60 62" stroke="#0d0705" stroke-width="2" fill="none" opacity=".5"/>
    <!-- Objets qui volent autour -->
    <circle cx="20" cy="22" r="4" fill="currentColor" opacity=".45"/>
    <rect x="72" y="14" width="8" height="6" rx="1" fill="currentColor" opacity=".4"/>
    <circle cx="78" cy="28" r="3" fill="currentColor" opacity=".35"/>
    <circle cx="16" cy="38" r="3" fill="currentColor" opacity=".3"/>
  </svg>`,

  myrtle: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps de fantôme translucide -->
    <ellipse cx="50" cy="42" rx="24" ry="28" fill="currentColor" opacity=".72"/>
    <!-- Queue ondulante -->
    <path d="M26 55 Q22 76 34 80 Q42 82 42 68 Q42 80 54 82 Q66 80 66 68 Q66 80 74 76 Q78 56 74 55 Z" fill="currentColor" opacity=".70"/>
    <!-- Lunettes rondes iconiques -->
    <circle cx="40" cy="38" r="8" fill="none" stroke="#0d0705" stroke-width="2.5" opacity=".7"/>
    <circle cx="60" cy="38" r="8" fill="none" stroke="#0d0705" stroke-width="2.5" opacity=".7"/>
    <path d="M48 38 L52 38" stroke="#0d0705" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M32 36 Q30 32 28 34" stroke="#0d0705" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M68 36 Q70 32 72 34" stroke="#0d0705" stroke-width="2" fill="none" opacity=".5"/>
    <!-- Yeux pleurant derrière les lunettes -->
    <ellipse cx="40" cy="38" rx="4" ry="5" fill="#0d0705" opacity=".7"/>
    <ellipse cx="60" cy="38" rx="4" ry="5" fill="#0d0705" opacity=".7"/>
    <!-- Larmes -->
    <path d="M38 46 Q36 52 38 56 M42 46 Q44 52 42 56" stroke="#4a90d9" stroke-width="2" fill="none" opacity=".6"/>
    <!-- Bouche triste -->
    <path d="M42 54 Q50 50 58 54" stroke="#0d0705" stroke-width="2" fill="none" opacity=".55"/>
    <!-- Bras fantôme -->
    <path d="M28 50 Q18 56 16 50 M72 50 Q82 56 84 50" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>
    <!-- Cheveux courts -->
    <ellipse cx="50" cy="20" rx="16" ry="8" fill="currentColor" opacity=".7"/>
  </svg>`,

  // ── CRÉATURES ─────────────────────────────────────────────

  serpent_cachot: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps serpentin en S -->
    <path d="M50 92 Q22 86 18 66 Q14 44 38 38 Q60 32 60 16 Q60 8 54 5" stroke="currentColor" stroke-width="14" fill="none" stroke-linecap="round"/>
    <!-- Écailles suggérées -->
    <path d="M50 92 Q22 86 18 66 Q14 44 38 38 Q60 32 60 16 Q60 8 54 5" stroke="#0d0705" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="3 11" opacity=".4"/>
    <!-- Tête du serpent -->
    <ellipse cx="53" cy="4" rx="13" ry="9" fill="currentColor" transform="rotate(-15 53 4)"/>
    <!-- Pupilles verticales -->
    <ellipse cx="48" cy="2" rx="2.5" ry="3.5" fill="#0d0705"/>
    <ellipse cx="58" cy="2" rx="2.5" ry="3.5" fill="#0d0705"/>
    <!-- Langue fourchue -->
    <path d="M53 12 L48 18 M53 12 L58 18" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Crochets -->
    <path d="M46 10 L42 15 M62 10 L66 14" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".6"/>
    <!-- Anneau de corps -->
    <ellipse cx="34" cy="62" rx="10" ry="6" fill="currentColor" opacity=".3"/>
    <ellipse cx="54" cy="82" rx="8" ry="5" fill="currentColor" opacity=".25"/>
  </svg>`,

  gobelin: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps compact -->
    <path d="M28 54 Q26 84 38 88 L62 88 Q74 84 72 54 Q72 44 50 42 Q28 44 28 54 Z" fill="currentColor"/>
    <!-- Grosse tête de gobelin -->
    <ellipse cx="50" cy="32" rx="24" ry="22" fill="currentColor"/>
    <!-- Grandes oreilles pointues pointant vers le haut -->
    <polygon points="28,30 14,18 30,40" fill="currentColor"/>
    <polygon points="72,30 86,18 70,40" fill="currentColor"/>
    <polygon points="30,30 18,22 31,36" fill="#0d0705" opacity=".25"/>
    <polygon points="70,30 82,22 69,36" fill="#0d0705" opacity=".25"/>
    <!-- Yeux verts bridés -->
    <ellipse cx="40" cy="29" rx="6.5" ry="8" fill="#0d0705" opacity=".85"/>
    <ellipse cx="60" cy="29" rx="6.5" ry="8" fill="#0d0705" opacity=".85"/>
    <ellipse cx="40" cy="29" rx="3" ry="4" fill="#2a6a20"/>
    <ellipse cx="60" cy="29" rx="3" ry="4" fill="#2a6a20"/>
    <!-- Grand nez crochu -->
    <path d="M48 36 Q44 42 46 46 Q50 48 54 46 Q56 42 52 36" fill="currentColor" opacity=".8"/>
    <!-- Bouche avec dents -->
    <path d="M42 50 Q50 56 58 50" stroke="#0d0705" stroke-width="2" fill="none" opacity=".65"/>
    <path d="M44 52 L44 57 M48 53 L48 58 M52 53 L52 58 M56 52 L56 57" stroke="#0d0705" stroke-width="2" fill="none" opacity=".45"/>
    <!-- Bras avec mains crochues -->
    <path d="M28 54 L12 46 L14 62 L24 60" fill="currentColor"/>
    <path d="M72 54 L88 46 L86 62 L76 60" fill="currentColor"/>
    <!-- Sac d'or -->
    <ellipse cx="65" cy="72" rx="10" ry="8" fill="#c87820" opacity=".7"/>
    <path d="M65 64 Q62 60 66 58 Q70 60 67 64" stroke="#c87820" stroke-width="2" fill="none"/>
  </svg>`,

  troll: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Torse massif -->
    <path d="M22 50 Q20 86 34 90 L66 90 Q80 86 78 50 Q76 38 50 36 Q24 38 22 50 Z" fill="currentColor"/>
    <!-- Grosse tête ronde -->
    <ellipse cx="50" cy="28" rx="28" ry="24" fill="currentColor"/>
    <!-- Cornes -->
    <path d="M38 8 L34 -2 L42 10" fill="currentColor"/>
    <path d="M62 8 L66 -2 L58 10" fill="currentColor"/>
    <!-- Petit front bas, sourcils proéminents -->
    <path d="M22 22 Q36 14 50 18 Q64 14 78 22" fill="#0d0705" opacity=".3"/>
    <!-- Yeux enfoncés sous les arcades -->
    <ellipse cx="38" cy="26" rx="7" ry="7.5" fill="#0d0705" opacity=".85"/>
    <ellipse cx="62" cy="26" rx="7" ry="7.5" fill="#0d0705" opacity=".85"/>
    <circle cx="38" cy="25" r="2.5" fill="#c87820" opacity=".6"/>
    <circle cx="62" cy="25" r="2.5" fill="#c87820" opacity=".6"/>
    <!-- Nez plat et épaté -->
    <ellipse cx="50" cy="34" rx="6" ry="5" fill="#0d0705" opacity=".4"/>
    <!-- Bouche avec défenses -->
    <path d="M38 40 Q50 46 62 40" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".6"/>
    <path d="M44 40 L42 48 M56 40 L58 48" stroke="white" stroke-width="3" fill="none" opacity=".5"/>
    <!-- Bras puissants -->
    <path d="M22 50 L4 58 L6 76 L20 70" fill="currentColor"/>
    <path d="M78 50 L96 58 L94 76 L80 70" fill="currentColor"/>
    <!-- Massue -->
    <rect x="84" y="42" width="10" height="36" rx="4" fill="currentColor" opacity=".8" transform="rotate(15 84 42)"/>
    <ellipse cx="96" cy="43" rx="8" ry="7" fill="currentColor" opacity=".9" transform="rotate(15 96 43)"/>
    <!-- Pieds énormes -->
    <ellipse cx="38" cy="92" rx="14" ry="6" fill="currentColor"/>
    <ellipse cx="62" cy="92" rx="14" ry="6" fill="currentColor"/>
  </svg>`,

  troll_grotte: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Torse encore plus massif (dos voûté) -->
    <path d="M18 56 Q16 88 32 92 L68 92 Q84 88 82 56 Q78 40 50 38 Q22 40 18 56 Z" fill="currentColor"/>
    <!-- Bosse dans le dos -->
    <ellipse cx="62" cy="46" rx="22" ry="12" fill="currentColor" opacity=".6"/>
    <!-- Tête avec crâne aplati -->
    <ellipse cx="46" cy="28" rx="26" ry="20" fill="currentColor"/>
    <!-- Éclats de roche incrustés -->
    <polygon points="30,16 28,8 36,18" fill="#0d0705" opacity=".35"/>
    <polygon points="56,14 60,6 64,16" fill="#0d0705" opacity=".35"/>
    <!-- Petit yeux enfoncés -->
    <ellipse cx="36" cy="26" rx="6" ry="7" fill="#0d0705" opacity=".85"/>
    <ellipse cx="58" cy="26" rx="6" ry="7" fill="#0d0705" opacity=".85"/>
    <circle cx="36" cy="25" r="2" fill="#c87820" opacity=".5"/>
    <circle cx="58" cy="25" r="2" fill="#c87820" opacity=".5"/>
    <!-- Gros nez et mâchoire proéminente -->
    <ellipse cx="48" cy="34" rx="7" ry="6" fill="currentColor" opacity=".8"/>
    <path d="M34 40 Q48 46 62 40" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".6"/>
    <!-- Deux défenses -->
    <path d="M42 40 L40 50 M54 40 L56 50" stroke="white" stroke-width="3.5" fill="none" opacity=".6"/>
    <!-- Bras en piliers -->
    <path d="M18 56 L2 62 L4 80 L18 74" fill="currentColor"/>
    <path d="M82 56 L98 62 L96 80 L82 74" fill="currentColor"/>
    <!-- Pieds -->
    <ellipse cx="36" cy="94" rx="16" ry="6" fill="currentColor"/>
    <ellipse cx="64" cy="94" rx="16" ry="6" fill="currentColor"/>
  </svg>`,

  bundimun: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps fongique vert visqueux -->
    <ellipse cx="50" cy="60" rx="34" ry="26" fill="currentColor"/>
    <!-- Protubérances fongiques -->
    <circle cx="28" cy="52" r="12" fill="currentColor" opacity=".8"/>
    <circle cx="72" cy="52" r="12" fill="currentColor" opacity=".8"/>
    <circle cx="50" cy="40" r="14" fill="currentColor" opacity=".9"/>
    <circle cx="36" cy="66" r="9" fill="currentColor" opacity=".7"/>
    <circle cx="64" cy="66" r="9" fill="currentColor" opacity=".7"/>
    <!-- Réseau de spores/veines -->
    <path d="M36 50 Q50 44 64 50 M26 60 Q38 56 50 60 Q62 56 74 60 M30 70 Q50 66 70 70" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".3"/>
    <!-- Yeux multiples et globuleux -->
    <circle cx="40" cy="46" r="7" fill="#0d0705" opacity=".9"/>
    <circle cx="60" cy="46" r="7" fill="#0d0705" opacity=".9"/>
    <circle cx="50" cy="36" r="5" fill="#0d0705" opacity=".8"/>
    <circle cx="39" cy="45" r="3" fill="#c0d020" opacity=".7"/>
    <circle cx="59" cy="45" r="3" fill="#c0d020" opacity=".7"/>
    <circle cx="50" cy="35" r="2" fill="#c0d020" opacity=".6"/>
    <!-- Gouttelettes de venin -->
    <path d="M20 68 Q16 74 18 80 M50 84 Q48 90 50 94 M80 68 Q84 74 82 80" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
    <!-- Filaments tentaculaires -->
    <path d="M50 86 Q40 94 34 98 M50 86 Q60 94 66 98 M28 70 Q18 78 12 84 M72 70 Q82 78 88 84" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".5"/>
  </svg>`,

  meduse_noire: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Cloche de méduse -->
    <path d="M18 42 Q18 10 50 8 Q82 10 82 42 Q82 56 50 58 Q18 56 18 42 Z" fill="currentColor" opacity=".88"/>
    <!-- Motif translucide intérieur -->
    <path d="M26 38 Q26 18 50 16 Q74 18 74 38 Q74 48 50 50 Q26 48 26 38 Z" fill="currentColor" opacity=".3"/>
    <!-- Organes bioluminescents -->
    <ellipse cx="50" cy="32" rx="12" ry="8" fill="currentColor" opacity=".5"/>
    <ellipse cx="50" cy="32" rx="6" ry="4" fill="white" opacity=".3"/>
    <!-- Yeux noirs -->
    <circle cx="40" cy="28" r="4" fill="#0d0705" opacity=".8"/>
    <circle cx="60" cy="28" r="4" fill="#0d0705" opacity=".8"/>
    <!-- Bouche tentaculaire -->
    <path d="M40 44 Q50 50 60 44" stroke="#0d0705" stroke-width="2" fill="none" opacity=".5"/>
    <!-- Tentacules longs et sinueux -->
    <path d="M26 56 Q22 68 18 80 Q20 90 24 96" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M34 58 Q32 72 28 84 Q28 92 32 96" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M42 58 Q42 72 38 86 Q36 94 40 98" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M50 58 Q50 74 48 88 Q47 96 50 100" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M58 58 Q58 72 62 86 Q64 94 60 98" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M66 58 Q68 72 72 84 Q72 92 68 96" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M74 56 Q78 68 82 80 Q80 90 76 96" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`,

  homme_araignee: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Bas du corps araignée (abdomen) -->
    <ellipse cx="50" cy="72" rx="22" ry="18" fill="currentColor"/>
    <!-- Haut du corps humain -->
    <path d="M30 48 Q28 66 38 72 L62 72 Q72 66 70 48 Q68 38 50 36 Q32 38 30 48 Z" fill="currentColor"/>
    <!-- Tête humaine -->
    <ellipse cx="50" cy="28" rx="16" ry="16" fill="currentColor"/>
    <!-- Yeux multiples d'araignée sur visage humain -->
    <circle cx="40" cy="24" r="4.5" fill="#0d0705" opacity=".9"/>
    <circle cx="50" cy="22" r="4" fill="#0d0705" opacity=".9"/>
    <circle cx="60" cy="24" r="4.5" fill="#0d0705" opacity=".9"/>
    <circle cx="36" cy="30" r="3" fill="#0d0705" opacity=".7"/>
    <circle cx="64" cy="30" r="3" fill="#0d0705" opacity=".7"/>
    <circle cx="40" cy="24" r="2" fill="white" opacity=".4"/>
    <circle cx="60" cy="24" r="2" fill="white" opacity=".4"/>
    <!-- Chélicères humano-araignéen -->
    <path d="M44 38 L40 44 L46 42 M56 38 L60 44 L54 42" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".7"/>
    <!-- Bras humains -->
    <path d="M30 48 L14 40 L12 56 L26 54" fill="currentColor"/>
    <path d="M70 48 L86 40 L88 56 L74 54" fill="currentColor"/>
    <!-- Pattes d'araignée supplémentaires -->
    <path d="M36 64 Q22 58 12 68" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M36 70 Q20 72 12 80" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M64 64 Q78 58 88 68" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M64 70 Q80 72 88 80" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`,

  portrait_hostile: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Cadre doré du portrait -->
    <rect x="6" y="6" width="88" height="88" rx="4" fill="none" stroke="#c87820" stroke-width="6"/>
    <rect x="10" y="10" width="80" height="80" rx="3" fill="none" stroke="#c87820" stroke-width="2" opacity=".5"/>
    <!-- Fond du tableau (parchemin peint) -->
    <rect x="12" y="12" width="76" height="76" rx="2" fill="currentColor" opacity=".85"/>
    <!-- Personnage peint furieux -->
    <!-- Corps en robe noire -->
    <path d="M28 60 Q26 88 38 92 L62 92 Q74 88 72 60 Q70 50 50 48 Q30 50 28 60 Z" fill="#0d0705" opacity=".7"/>
    <!-- Tête -->
    <ellipse cx="50" cy="38" rx="18" ry="20" fill="currentColor" opacity=".9"/>
    <!-- Sourcils très froncés (en colère) -->
    <path d="M32 28 Q40 22 48 28" stroke="#0d0705" stroke-width="4" fill="none" opacity=".8"/>
    <path d="M52 28 Q60 22 68 28" stroke="#0d0705" stroke-width="4" fill="none" opacity=".8"/>
    <!-- Yeux en colère -->
    <ellipse cx="40" cy="32" rx="5" ry="6" fill="#0d0705" opacity=".9"/>
    <ellipse cx="60" cy="32" rx="5" ry="6" fill="#0d0705" opacity=".9"/>
    <!-- Bouche hurlante -->
    <ellipse cx="50" cy="46" rx="9" ry="6" fill="#0d0705" opacity=".8"/>
    <!-- Bras gestiulant -->
    <path d="M28 58 L10 48 L12 64" fill="#0d0705" opacity=".6"/>
    <path d="M72 58 L90 48 L88 64" fill="#0d0705" opacity=".6"/>
    <!-- Craquelures du tableau (vieux) -->
    <path d="M15 20 Q18 30 15 40 M85 60 Q82 70 85 80 M20 75 Q30 78 40 75" stroke="#0d0705" stroke-width="1" fill="none" opacity=".3"/>
  </svg>`,

  // ── HUMAINS ───────────────────────────────────────────────

  centaure: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps de cheval (arrière-train) -->
    <ellipse cx="58" cy="68" rx="30" ry="18" fill="currentColor"/>
    <!-- Queue de cheval -->
    <path d="M88 65 Q98 52 96 68 Q100 58 100 74" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- Pattes -->
    <path d="M36 84 L30 98 M48 86 L44 98 M68 86 L72 98 M80 84 L86 98" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/>
    <!-- Torse humain -->
    <path d="M30 50 Q28 68 40 72 Q50 74 60 70 Q68 68 68 50 Q64 38 50 36 Q36 38 30 50 Z" fill="currentColor"/>
    <!-- Tête -->
    <ellipse cx="50" cy="24" rx="14" ry="14" fill="currentColor"/>
    <!-- Crin/cheveux longs -->
    <path d="M38 20 Q28 22 24 34 M62 20 Q70 18 70 30" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- Yeux perçants -->
    <circle cx="44" cy="21" r="3.5" fill="#0d0705" opacity=".85"/>
    <circle cx="56" cy="21" r="3.5" fill="#0d0705" opacity=".85"/>
    <!-- Arc et flèche -->
    <path d="M62 42 Q76 28 74 50" stroke="#c87820" stroke-width="2.5" fill="none"/>
    <line x1="62" y1="42" x2="78" y2="20" stroke="#c87820" stroke-width="2"/>
    <polygon points="78,18 74,24 82,22" fill="#c87820"/>
  </svg>`,

  detraqueur: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Grande robe sombre flottante -->
    <path d="M50 6 Q32 6 24 22 L14 54 Q12 70 24 80 Q20 86 22 94 L44 88 Q44 76 50 72 Q56 76 56 88 L78 94 Q80 86 76 80 Q88 70 86 54 L76 22 Q68 6 50 6 Z" fill="currentColor" opacity=".94"/>
    <!-- Capuche encore plus sombre -->
    <path d="M30 20 Q30 8 50 6 Q70 8 70 20 Q60 16 50 18 Q40 16 30 20 Z" fill="#0d0705" opacity=".5"/>
    <!-- Visage comme une béance -->
    <path d="M34 52 Q38 42 50 46 Q62 42 66 52 Q62 66 50 68 Q38 66 34 52 Z" fill="#0d0705" opacity=".9"/>
    <!-- Bouche aspirante (trou vide) -->
    <ellipse cx="50" cy="58" rx="12" ry="8" fill="#0d0705"/>
    <!-- Mains squelettiques -->
    <path d="M24 80 Q14 88 10 98" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" opacity=".85"/>
    <path d="M10 98 L8 86 M10 98 L14 84 M10 98 L18 82" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".7"/>
    <path d="M76 80 Q86 88 90 98" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" opacity=".85"/>
    <path d="M90 98 L92 86 M90 98 L86 84 M90 98 L82 82" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".7"/>
    <!-- Filaments d'âme aspirés -->
    <path d="M44 62 Q40 68 38 76 M50 66 Q50 72 50 78 M56 62 Q60 68 62 76" stroke="white" stroke-width="1.5" fill="none" opacity=".3"/>
  </svg>`,

  detraqueur_gardien: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Grande robe encore plus imposante -->
    <path d="M50 4 Q28 4 20 22 L8 56 Q4 74 18 84 Q12 90 14 98 L38 92 Q38 78 50 74 Q62 78 62 92 L86 98 Q88 90 82 84 Q96 74 92 56 L80 22 Q72 4 50 4 Z" fill="currentColor" opacity=".96"/>
    <!-- Aura de froid (cercles) -->
    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 8" opacity=".25"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 6" opacity=".18"/>
    <!-- Capuche profonde -->
    <path d="M28 22 Q28 8 50 4 Q72 8 72 22 Q60 16 50 18 Q40 16 28 22 Z" fill="#0d0705" opacity=".65"/>
    <!-- Visage néant -->
    <ellipse cx="50" cy="50" rx="18" ry="14" fill="#0d0705" opacity=".95"/>
    <!-- Couronne glacée (gardien plus puissant) -->
    <path d="M32 16 L30 4 L38 14 L44 4 L50 12 L56 4 L62 14 L70 4 L68 16" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".6"/>
    <!-- Mains tendues squelettiques -->
    <path d="M18 84 Q6 90 2 100" stroke="currentColor" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"/>
    <path d="M2 100 L1 88 M2 100 L8 86 M2 100 L14 84" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".75"/>
    <path d="M82 84 Q94 90 98 100" stroke="currentColor" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"/>
    <path d="M98 100 L99 88 M98 100 L92 86 M98 100 L86 84" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".75"/>
  </svg>`,

  loup_garou: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps en pleine transformation -->
    <path d="M50 92 L26 74 Q10 66 10 50 Q10 26 34 22 L38 6 L44 24 Q50 18 56 24 L62 6 L66 22 Q90 26 90 50 Q90 66 74 74 Z" fill="currentColor"/>
    <!-- Texture fourrure (hachures) -->
    <path d="M30 42 L26 36 M38 36 L36 30 M50 34 L50 28 M62 36 L64 30 M70 42 L74 36" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".3"/>
    <path d="M22 58 L16 54 M24 66 L18 64 M76 58 L84 54 M76 66 L82 64" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".3"/>
    <!-- Museau de loup allongé -->
    <path d="M38 44 Q42 38 50 40 Q58 38 62 44" fill="#0d0705" opacity=".35"/>
    <!-- Yeux jaunes sauvages -->
    <ellipse cx="38" cy="40" rx="6" ry="6.5" fill="#0d0705" opacity=".85"/>
    <ellipse cx="62" cy="40" rx="6" ry="6.5" fill="#0d0705" opacity=".85"/>
    <ellipse cx="38" cy="40" rx="2.5" ry="3.5" fill="#d4a820"/>
    <ellipse cx="62" cy="40" rx="2.5" ry="3.5" fill="#d4a820"/>
    <!-- Crocs -->
    <path d="M42 54 Q50 60 58 54" stroke="#0d0705" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M44 54 L42 62 L46 60 M56 54 L58 62 L54 60" stroke="white" stroke-width="2.5" fill="none" opacity=".55"/>
    <!-- Griffes -->
    <path d="M26 74 L20 82 L22 90 M74 74 L80 82 L78 90" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M20 88 L16 82 L22 82 M78 88 L84 82 L80 82" stroke="#0d0705" stroke-width="2" fill="none" opacity=".5"/>
  </svg>`,

  inferius: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps de mort-vivant décharné -->
    <ellipse cx="50" cy="62" rx="24" ry="22" fill="currentColor" opacity=".9"/>
    <!-- Tête -->
    <ellipse cx="50" cy="36" rx="20" ry="20" fill="currentColor" opacity=".9"/>
    <!-- Peau étirée, dents visibles -->
    <ellipse cx="38" cy="32" rx="7" ry="8.5" fill="#0d0705" opacity=".9"/>
    <ellipse cx="62" cy="32" rx="7" ry="8.5" fill="#0d0705" opacity=".9"/>
    <!-- Yeux révulsés (blanc) -->
    <circle cx="38" cy="32" r="3" fill="white" opacity=".6"/>
    <circle cx="62" cy="32" r="3" fill="white" opacity=".6"/>
    <!-- Bouche ouverte, dents pourries -->
    <path d="M38 46 Q50 52 62 46" stroke="#0d0705" stroke-width="2" fill="none" opacity=".55"/>
    <path d="M40 48 L40 54 L44 50 L44 56 L48 52 L48 57 L52 52 L52 57 L56 50 L56 55 L60 48" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".5"/>
    <!-- Côtes visibles sous la peau -->
    <path d="M30 62 Q40 58 50 62 Q60 58 70 62 M28 68 Q40 64 50 68 Q60 64 72 68" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".3"/>
    <!-- Bras tendus (mort-vivant marchant) -->
    <path d="M26 54 Q10 52 10 66 Q10 76 26 72" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M74 54 Q90 52 90 66 Q90 76 74 72" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round"/>
    <!-- Doigts décharnés -->
    <path d="M10 64 L2 60 M10 68 L2 68 M10 72 L4 76 M10 76 L6 82" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M90 64 L98 60 M90 68 L98 68 M90 72 L96 76 M90 76 L94 82" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>
    <!-- Jambes qui traînent -->
    <path d="M38 82 L30 94 M50 84 L50 96 M62 82 L70 94" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`,

  mangemort: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps en robe noire -->
    <path d="M50 14 Q26 14 20 36 Q14 56 28 68 Q26 78 34 82 L66 82 Q74 78 72 68 Q86 56 80 36 Q74 14 50 14 Z" fill="currentColor"/>
    <!-- Masque de mort caractéristique -->
    <ellipse cx="38" cy="46" rx="10" ry="12" fill="#0d0705" opacity=".9"/>
    <ellipse cx="62" cy="46" rx="10" ry="12" fill="#0d0705" opacity=".9"/>
    <!-- Détail des trous du masque -->
    <ellipse cx="38" cy="44" rx="4" ry="5" fill="currentColor" opacity=".3"/>
    <ellipse cx="62" cy="44" rx="4" ry="5" fill="currentColor" opacity=".3"/>
    <!-- Fente de bouche du masque -->
    <path d="M40 58 Q50 62 60 58" stroke="currentColor" stroke-width="2" fill="none" opacity=".4"/>
    <!-- Capuche sur crâne -->
    <path d="M28 24 Q50 10 72 24 Q60 18 50 20 Q40 18 28 24 Z" fill="#0d0705" opacity=".4"/>
    <!-- Baguette en main -->
    <line x1="80" y1="58" x2="96" y2="78" stroke="#c87820" stroke-width="5" stroke-linecap="round"/>
    <circle cx="97" cy="79" r="3" fill="#c87820" opacity=".7"/>
    <!-- Bras tendant la baguette -->
    <path d="M72 58 L84 54 L88 68 L76 68" fill="currentColor"/>
    <!-- Bas de robe -->
    <path d="M34 82 L28 96 M42 84 L40 96 M50 84 L50 96 M58 84 L60 96 M66 82 L72 96" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
  </svg>`,

  mangemort_masque: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps robuste -->
    <path d="M22 52 Q20 84 34 88 L66 88 Q80 84 78 52 Q76 40 50 38 Q24 40 22 52 Z" fill="currentColor"/>
    <!-- Chapeau à large bord -->
    <path d="M30 30 Q30 18 50 16 Q70 18 70 30" fill="#0d0705" opacity=".8"/>
    <ellipse cx="50" cy="30" rx="30" ry="8" fill="#0d0705" opacity=".9"/>
    <!-- Tête avec masque argenté intégral -->
    <ellipse cx="50" cy="44" rx="20" ry="18" fill="currentColor"/>
    <ellipse cx="50" cy="44" rx="18" ry="16" fill="#c0c0c0" opacity=".7"/>
    <!-- Détails du masque : fentes pour yeux en amande -->
    <path d="M34 40 Q38 37 44 40" stroke="#0d0705" stroke-width="3" fill="none" opacity=".8"/>
    <path d="M56 40 Q62 37 66 40" stroke="#0d0705" stroke-width="3" fill="none" opacity=".8"/>
    <!-- Volutes décoratives du masque -->
    <path d="M36 44 Q38 48 42 46 M58 44 Q62 48 64 46" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".5"/>
    <!-- Marque des Ténèbres sur la main -->
    <ellipse cx="68" cy="60" rx="8" ry="6" fill="#0d0705" opacity=".6"/>
    <path d="M64 62 Q68 56 72 62" stroke="currentColor" stroke-width="2" fill="none" opacity=".7"/>
    <!-- Baguette levée -->
    <line x1="76" y1="52" x2="94" y2="34" stroke="#c87820" stroke-width="5" stroke-linecap="round"/>
    <path d="M72 50 L82 48 L88 60 L78 60" fill="currentColor"/>
  </svg>`,

  mangemort_elite: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Armure noire -->
    <path d="M20 54 Q18 86 32 92 L68 92 Q82 86 80 54 Q76 40 50 38 Q24 40 20 54 Z" fill="currentColor"/>
    <!-- Épaulières -->
    <path d="M20 54 Q6 48 4 60 Q6 72 20 68" fill="currentColor" opacity=".8"/>
    <path d="M80 54 Q94 48 96 60 Q94 72 80 68" fill="currentColor" opacity=".8"/>
    <!-- Pointes d'épaule -->
    <polygon points="6,52 2,44 14,52" fill="currentColor"/>
    <polygon points="94,52 98,44 86,52" fill="currentColor"/>
    <!-- Casque intégral avec crête -->
    <ellipse cx="50" cy="36" rx="22" ry="20" fill="currentColor"/>
    <path d="M38 18 Q50 6 62 18" fill="currentColor"/>
    <path d="M50 6 L50 18" stroke="#c87820" stroke-width="3" fill="none" opacity=".7"/>
    <!-- Visière en T du casque -->
    <rect x="38" y="28" width="24" height="8" rx="2" fill="#0d0705" opacity=".9"/>
    <rect x="46" y="26" width="8" height="18" rx="2" fill="#0d0705" opacity=".9"/>
    <!-- Yeux brillants de fanatisme -->
    <circle cx="42" cy="32" r="3" fill="#c0392b" opacity=".8"/>
    <circle cx="58" cy="32" r="3" fill="#c0392b" opacity=".8"/>
    <!-- Marque des Ténèbres sur la poitrine -->
    <path d="M40 62 Q50 56 60 62" stroke="#c87820" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M50 56 L46 68 M50 56 L54 68" stroke="#c87820" stroke-width="1.5" fill="none" opacity=".5"/>
    <!-- Baguette -->
    <line x1="80" y1="60" x2="98" y2="44" stroke="#c87820" stroke-width="5" stroke-linecap="round"/>
  </svg>`,

  sorcier_renegat: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps en robe déchirée -->
    <path d="M50 82 L28 66 L22 42 L38 28 L50 30 L62 28 L78 42 L72 66 Z" fill="currentColor"/>
    <!-- Robe déchirée bas -->
    <path d="M28 66 L20 78 L26 82 M50 82 L48 94 L54 92 M72 66 L80 78 L74 82" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
    <!-- Tête -->
    <ellipse cx="50" cy="20" rx="16" ry="16" fill="currentColor"/>
    <!-- Chapeau pointu de sorcier -->
    <path d="M34 28 L50 2 L66 28 Z" fill="currentColor" opacity=".8"/>
    <!-- Yeux rouges de magie noire -->
    <circle cx="43" cy="18" r="4" fill="#0d0705" opacity=".85"/>
    <circle cx="57" cy="18" r="4" fill="#0d0705" opacity=".85"/>
    <circle cx="43" cy="18" r="2" fill="#c0392b"/>
    <circle cx="57" cy="18" r="2" fill="#c0392b"/>
    <!-- Cicatrice sinistre -->
    <path d="M38 24 Q42 26 46 24" stroke="#c0392b" stroke-width="2" fill="none" opacity=".6"/>
    <!-- Grimoire en main gauche -->
    <rect x="16" y="44" width="18" height="22" rx="2" fill="#c87820" opacity=".7"/>
    <path d="M17 48 L32 48 M17 52 L32 52 M17 56 L32 56 M17 60 L32 60" stroke="#0d0705" stroke-width="1" fill="none" opacity=".4"/>
    <!-- Baguette lancant un sort -->
    <path d="M72 55 L90 44 L86 66" fill="currentColor" opacity=".8"/>
    <line x1="78" y1="50" x2="96" y2="30" stroke="#c87820" stroke-width="5" stroke-linecap="round"/>
    <!-- Étincelles magiques -->
    <circle cx="96" cy="28" r="5" fill="#c87820" opacity=".7"/>
    <path d="M94 24 L98 22 M98 26 L102 24 M96 30 L100 32" stroke="#c87820" stroke-width="2" fill="none" opacity=".7"/>
  </svg>`,

  // ── ÊTRES MAGIQUES ─────────────────────────────────────────

  boggart: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps en transformation (forme instable) -->
    <path d="M50 12 Q28 10 20 28 L14 54 Q12 70 24 78 Q20 84 22 92 L44 84 Q44 74 50 72 Q56 74 56 84 L78 92 Q80 84 76 78 Q88 70 86 54 L80 28 Q72 10 50 12 Z" fill="currentColor" opacity=".82"/>
    <!-- Distorsions de forme (effets de glitch) -->
    <path d="M24 38 Q14 30 16 42 M76 38 Q86 30 84 42" fill="currentColor" opacity=".4"/>
    <path d="M30 66 Q18 70 20 78 M70 66 Q82 70 80 78" fill="currentColor" opacity=".35"/>
    <!-- 4 yeux instables qui se déplacent -->
    <ellipse cx="34" cy="38" rx="9" ry="11" fill="#0d0705" opacity=".92"/>
    <ellipse cx="66" cy="38" rx="9" ry="11" fill="#0d0705" opacity=".92"/>
    <circle cx="36" cy="38" r="4.5" fill="white" opacity=".6"/>
    <circle cx="68" cy="38" r="4.5" fill="white" opacity=".6"/>
    <circle cx="38" cy="37" r="2.5" fill="#0d0705"/>
    <circle cx="70" cy="37" r="2.5" fill="#0d0705"/>
    <!-- Yeux supplémentaires qui apparaissent (transformation) -->
    <circle cx="50" cy="24" r="5" fill="#0d0705" opacity=".6"/>
    <circle cx="50" cy="24" r="2.5" fill="white" opacity=".5"/>
    <!-- Bouche large terrifiante -->
    <path d="M32 56 Q50 66 68 56" fill="currentColor" opacity=".25"/>
    <path d="M32 56 Q40 64 50 66 Q60 64 68 56" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".7"/>
    <path d="M36 58 L34 64 M44 62 L43 68 M50 63 L50 70 M56 62 L57 68 M64 58 L66 64" stroke="#0d0705" stroke-width="2" fill="none" opacity=".45"/>
    <!-- Particules flottantes -->
    <circle cx="16" cy="20" r="4" fill="currentColor" opacity=".35"/>
    <circle cx="82" cy="18" r="3" fill="currentColor" opacity=".3"/>
    <circle cx="90" cy="42" r="5" fill="currentColor" opacity=".25"/>
    <circle cx="10" cy="54" r="3" fill="currentColor" opacity=".3"/>
  </svg>`,

  basilic: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Énorme corps squameux -->
    <path d="M12 66 Q18 46 36 44 Q48 44 52 32 Q56 16 72 14 Q88 14 90 32 Q92 52 74 56 Q70 68 64 82 L38 82 Q30 70 20 68 Z" fill="currentColor"/>
    <!-- Motif d'écailles -->
    <path d="M20 60 Q28 56 36 60 Q44 56 52 52 Q60 56 68 52 Q76 56 84 50" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".3"/>
    <path d="M22 68 Q30 64 38 68 Q46 64 54 60 Q62 64 70 60 Q78 64 86 60" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".25"/>
    <!-- Crête de couronne -->
    <path d="M72 14 Q76 4 80 10 Q84 4 86 14" fill="#c0392b" opacity=".9"/>
    <path d="M62 18 Q64 8 68 12 Q70 6 74 12" fill="#c0392b" opacity=".8"/>
    <!-- Tête de serpent imposante -->
    <ellipse cx="80" cy="26" rx="14" ry="10" fill="currentColor" transform="rotate(-10 80 26)"/>
    <!-- Écailles de la tête -->
    <path d="M68 20 Q80 16 92 22" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".3"/>
    <!-- Pupilles verticales dorées -->
    <ellipse cx="76" cy="24" rx="3" ry="4.5" fill="#d4a820"/>
    <ellipse cx="76" cy="24" rx="1.5" ry="3" fill="#0d0705"/>
    <circle cx="75" cy="22" r="1" fill="white" opacity=".6"/>
    <!-- Langue fourchue -->
    <path d="M80 34 L74 40 M80 34 L86 40" stroke="#c0392b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Crocs venimeux -->
    <path d="M72 32 L68 40 M88 30 L90 38" stroke="white" stroke-width="2.5" fill="none" opacity=".7"/>
    <!-- Queue et anneaux -->
    <path d="M38 82 L32 94 L52 82 L54 96 L64 82" fill="currentColor" opacity=".75"/>
    <!-- Anneau visible -->
    <ellipse cx="36" cy="56" rx="8" ry="5" fill="currentColor" opacity=".3"/>
  </svg>`,

  nagini: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps en S géant, épais -->
    <path d="M54 94 Q22 90 16 70 Q10 48 36 40 Q58 32 58 16 Q58 8 52 5" stroke="currentColor" stroke-width="16" fill="none" stroke-linecap="round"/>
    <!-- Écailles (motif diamant régulier) -->
    <path d="M54 94 Q22 90 16 70 Q10 48 36 40 Q58 32 58 16 Q58 8 52 5" stroke="#0d0705" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="3 13" opacity=".45"/>
    <!-- Bandes latérales -->
    <path d="M54 94 Q22 90 16 70 Q10 48 36 40 Q58 32 58 16 Q58 8 52 5" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="1 16" opacity=".2"/>
    <!-- Anneau de corps en premier plan -->
    <ellipse cx="32" cy="64" rx="12" ry="7" fill="currentColor" opacity=".35"/>
    <ellipse cx="54" cy="84" rx="10" ry="6" fill="currentColor" opacity=".28"/>
    <!-- Tête large et menaçante -->
    <ellipse cx="51" cy="4" rx="15" ry="10" fill="currentColor" transform="rotate(-20 51 4)"/>
    <!-- Pupilles verticales jaunes -->
    <ellipse cx="46" cy="2" rx="2.5" ry="3.5" fill="#d4a820"/>
    <ellipse cx="46" cy="2" rx="1" ry="2.2" fill="#0d0705"/>
    <ellipse cx="56" cy="0" rx="2.5" ry="3.5" fill="#d4a820" transform="rotate(-20 56 0)"/>
    <!-- Langue -->
    <path d="M51 12 L46 18 M51 12 L56 18" stroke="#c0392b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Crochets -->
    <path d="M44 10 L40 16 M60 8 L62 14" stroke="white" stroke-width="2" fill="none" opacity=".7"/>
  </svg>`,

  chimere: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps de lion massif -->
    <ellipse cx="52" cy="66" rx="30" ry="22" fill="currentColor"/>
    <!-- Pattes -->
    <path d="M28 84 L22 98 M42 86 L38 98 M62 86 L66 98 M76 84 L82 98" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/>
    <!-- Tête de lion (gauche) -->
    <ellipse cx="30" cy="36" rx="18" ry="17" fill="currentColor"/>
    <!-- Crinière -->
    <circle cx="30" cy="36" r="22" fill="none" stroke="currentColor" stroke-width="6" stroke-dasharray="5 3" opacity=".5"/>
    <!-- Œil de lion -->
    <circle cx="24" cy="32" r="4" fill="#0d0705" opacity=".85"/>
    <circle cx="24" cy="32" r="2" fill="#d4a820"/>
    <!-- Nez et bouche de lion -->
    <path d="M22 40 Q30 44 38 40" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".6"/>
    <!-- Tête de chèvre/bouc (milieu dos) -->
    <ellipse cx="66" cy="28" rx="14" ry="14" fill="currentColor"/>
    <path d="M60 16 Q60 6 66 6 Q72 6 72 16" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <polygon points="63,22 61,10 65,18" fill="currentColor" opacity=".6"/>
    <polygon points="69,22 71,10 67,18" fill="currentColor" opacity=".6"/>
    <circle cx="62" cy="26" r="3.5" fill="#0d0705" opacity=".85"/>
    <circle cx="70" cy="26" r="3.5" fill="#0d0705" opacity=".85"/>
    <!-- Aile gauche -->
    <path d="M24 52 Q8 36 4 52 Q6 68 24 64 Z" fill="currentColor" opacity=".7"/>
    <!-- Queue-serpent -->
    <path d="M82 66 Q96 52 92 68 Q98 58 94 78" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round"/>
    <!-- Tête du serpent-queue -->
    <ellipse cx="94" cy="80" rx="6" ry="4" fill="currentColor"/>
    <path d="M94 84 L91 88 M94 84 L97 88" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,

  ombre_quirrell: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps professeur Quirrell -->
    <ellipse cx="50" cy="62" rx="24" ry="24" fill="currentColor" opacity=".9"/>
    <!-- Tête avec turban -->
    <ellipse cx="50" cy="36" rx="16" ry="16" fill="currentColor" opacity=".9"/>
    <!-- Turban enroulé avec le visage caché de Voldemort -->
    <ellipse cx="50" cy="18" rx="20" ry="14" fill="currentColor" opacity=".85"/>
    <path d="M30 16 Q40 10 50 14 Q60 10 70 16 Q60 22 50 20 Q40 22 30 16 Z" fill="currentColor" opacity=".5"/>
    <!-- Plis du turban -->
    <path d="M32 18 Q50 10 68 18 M30 22 Q50 14 70 22 M32 26 Q50 18 68 26" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".2"/>
    <!-- Yeux de Quirrell (terrifiés) -->
    <circle cx="43" cy="34" r="4" fill="#0d0705" opacity=".82"/>
    <circle cx="57" cy="34" r="4" fill="#0d0705" opacity=".82"/>
    <circle cx="43" cy="33" r="1.5" fill="white" opacity=".5"/>
    <!-- Visage caché de Voldemort (sur l'arrière de la tête) -->
    <ellipse cx="50" cy="14" rx="10" ry="8" fill="currentColor" opacity=".6"/>
    <ellipse cx="44" cy="12" rx="3.5" ry="4" fill="#0d0705" opacity=".7"/>
    <ellipse cx="56" cy="12" rx="3.5" ry="4" fill="#0d0705" opacity=".7"/>
    <ellipse cx="44" cy="12" rx="1.5" ry="2" fill="#c0392b" opacity=".7"/>
    <ellipse cx="56" cy="12" rx="1.5" ry="2" fill="#c0392b" opacity=".7"/>
    <!-- Aura sombre flottant -->
    <path d="M30 54 Q18 58 14 50 Q12 40 26 38" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M70 54 Q82 58 86 50 Q88 40 74 38" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
    <!-- Jambes de robe -->
    <path d="M38 84 L32 96 M50 86 L50 96 M62 84 L68 96" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`,

  bellatrix: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps en robe de prison déchirée -->
    <path d="M28 52 Q26 84 38 90 L62 90 Q74 84 72 52 Q68 40 50 38 Q32 40 28 52 Z" fill="currentColor"/>
    <!-- Corsage robe -->
    <path d="M38 52 Q44 58 50 56 Q56 58 62 52" fill="#0d0705" opacity=".3"/>
    <!-- Tête -->
    <ellipse cx="50" cy="28" rx="17" ry="18" fill="currentColor"/>
    <!-- Cheveux sauvages et fous (plusieurs mèches) -->
    <path d="M34 20 Q24 12 22 4 M30 26 Q20 22 14 14 M66 20 Q76 12 78 4 M70 26 Q80 22 86 14" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M36 16 Q30 8 28 2 M50 10 Q50 2 52 -4 M64 16 Q70 8 72 2" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- Yeux fous et maniaques -->
    <ellipse cx="40" cy="24" rx="6" ry="7" fill="#0d0705" opacity=".9"/>
    <ellipse cx="60" cy="24" rx="6" ry="7" fill="#0d0705" opacity=".9"/>
    <circle cx="40" cy="24" r="3" fill="white" opacity=".4"/>
    <circle cx="60" cy="24" r="3" fill="white" opacity=".4"/>
    <circle cx="42" cy="23" r="1.5" fill="#0d0705"/>
    <circle cx="62" cy="23" r="1.5" fill="#0d0705"/>
    <!-- Sourire dément -->
    <path d="M40 34 Q50 42 60 34" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".65"/>
    <!-- Baguette levée haut -->
    <path d="M68 48 L74 40 L82 52 L74 54" fill="currentColor"/>
    <line x1="74" y1="38" x2="90" y2="18" stroke="#c87820" stroke-width="5" stroke-linecap="round"/>
    <circle cx="91" cy="16" r="4" fill="#c87820" opacity=".7"/>
    <!-- Marque des Ténèbres sur le bras -->
    <path d="M62 66 Q68 60 74 66 M68 60 L64 72 M68 60 L72 72" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".5"/>
  </svg>`,

  voldemort_affaibli: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps semi-translucide, presque inexistant -->
    <ellipse cx="50" cy="36" rx="22" ry="26" fill="currentColor" opacity=".65"/>
    <path d="M28 52 Q22 74 28 86 Q36 96 50 94 Q64 96 72 86 Q78 74 72 52 Z" fill="currentColor" opacity=".58"/>
    <!-- Bras de brume -->
    <path d="M18 62 Q8 74 12 90 L30 82" fill="currentColor" opacity=".38"/>
    <path d="M82 62 Q92 74 88 90 L70 82" fill="currentColor" opacity=".38"/>
    <!-- Tête crânienne (pas de nez, fentes de narines) -->
    <ellipse cx="50" cy="22" rx="19" ry="20" fill="currentColor" opacity=".72"/>
    <!-- Yeux comme des trous rouges brillants -->
    <ellipse cx="40" cy="18" rx="7" ry="9" fill="#0d0705" opacity=".9"/>
    <ellipse cx="60" cy="18" rx="7" ry="9" fill="#0d0705" opacity=".9"/>
    <ellipse cx="40" cy="18" rx="3" ry="4" fill="#c0392b" opacity=".8"/>
    <ellipse cx="60" cy="18" rx="3" ry="4" fill="#c0392b" opacity=".8"/>
    <!-- Fentes de narines (pas de nez) -->
    <ellipse cx="46" cy="30" rx="3" ry="4" fill="#0d0705" opacity=".5"/>
    <ellipse cx="54" cy="30" rx="3" ry="4" fill="#0d0705" opacity=".5"/>
    <!-- Bouche fine et cruelle -->
    <path d="M40 36 Q50 30 60 36" stroke="#0d0705" stroke-width="2" fill="none" opacity=".6"/>
    <!-- Aura de néant flottant -->
    <path d="M32 10 Q22 2 18 12 Q26 22 34 18" fill="currentColor" opacity=".38"/>
    <path d="M68 10 Q78 2 82 12 Q74 22 66 18" fill="currentColor" opacity=".38"/>
    <path d="M48 4 Q44 -2 40 4 Q46 12 52 8" fill="currentColor" opacity=".3"/>
  </svg>`,

  voldemort_revenu: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps imposant en robe noire -->
    <path d="M28 58 Q24 88 40 94 L60 94 Q76 88 72 58 Q68 42 50 40 Q32 42 28 58 Z" fill="currentColor"/>
    <!-- Bras squelettiques -->
    <path d="M28 58 L10 64 L12 82 L26 76" fill="currentColor"/>
    <path d="M72 58 L90 64 L88 82 L74 76" fill="currentColor"/>
    <!-- Doigts longs comme des araignées -->
    <path d="M12 80 L6 74 M12 80 L8 86 M12 80 L16 72 M12 80 L4 80" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M88 80 L94 74 M88 80 L92 86 M88 80 L84 72 M88 80 L96 80" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>
    <!-- Tête crânienne totalement chauve -->
    <ellipse cx="50" cy="28" rx="20" ry="22" fill="currentColor"/>
    <!-- Contour crâne anguleux -->
    <path d="M32 36 Q28 22 36 14 Q44 8 50 8 Q56 8 64 14 Q72 22 68 36" fill="none" stroke="#0d0705" stroke-width="2" opacity=".3"/>
    <!-- Yeux de serpent rouge vif (fentes verticales) -->
    <ellipse cx="40" cy="24" rx="7.5" ry="9" fill="#0d0705" opacity=".92"/>
    <ellipse cx="60" cy="24" rx="7.5" ry="9" fill="#0d0705" opacity=".92"/>
    <ellipse cx="40" cy="24" rx="3" ry="5" fill="#c0392b"/>
    <ellipse cx="60" cy="24" rx="3" ry="5" fill="#c0392b"/>
    <ellipse cx="40" cy="24" rx="1" ry="3.5" fill="#0d0705"/>
    <ellipse cx="60" cy="24" rx="1" ry="3.5" fill="#0d0705"/>
    <!-- Fentes de nez (comme Voldemort) -->
    <ellipse cx="46" cy="34" rx="2.5" ry="3.5" fill="#0d0705" opacity=".6"/>
    <ellipse cx="54" cy="34" rx="2.5" ry="3.5" fill="#0d0705" opacity=".6"/>
    <!-- Bouche fine dédaigneuse -->
    <path d="M40 40 Q50 36 60 40" stroke="#0d0705" stroke-width="2" fill="none" opacity=".65"/>
    <!-- Baguette de sureau -->
    <line x1="74" y1="64" x2="94" y2="44" stroke="#f0e0c0" stroke-width="5" stroke-linecap="round"/>
    <path d="M70 62 L80 58 L86 70 L76 72" fill="currentColor"/>
    <!-- Aura de pouvoir absolu -->
    <circle cx="50" cy="28" r="28" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" opacity=".2"/>
  </svg>`,

  // ── FALLBACKS PAR CATÉGORIE ────────────────────────────────

  fantôme: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="42" rx="26" ry="28" fill="currentColor" opacity=".82"/>
    <path d="M24 56 Q22 78 34 80 Q44 80 44 68 Q44 80 56 80 Q68 78 76 56 Z" fill="currentColor" opacity=".82"/>
    <ellipse cx="40" cy="38" rx="6" ry="8" fill="#0d0705" opacity=".72"/>
    <ellipse cx="60" cy="38" rx="6" ry="8" fill="#0d0705" opacity=".72"/>
    <path d="M43 54 Q50 58 57 54" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".4"/>
    <path d="M36 58 Q34 66 32 68 M64 58 Q66 66 68 68" stroke="currentColor" stroke-width="2.5" fill="none" opacity=".4"/>
  </svg>`,

  bête: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="58" rx="28" ry="22" fill="currentColor"/>
    <ellipse cx="50" cy="34" rx="18" ry="16" fill="currentColor"/>
    <circle cx="43" cy="30" r="4.5" fill="#0d0705" opacity=".82"/>
    <circle cx="57" cy="30" r="4.5" fill="#0d0705" opacity=".82"/>
    <polygon points="36,24 32,12 42,22" fill="currentColor"/>
    <polygon points="64,24 68,12 58,22" fill="currentColor"/>
    <path d="M42 40 Q50 44 58 40" stroke="#0d0705" stroke-width="2" fill="none" opacity=".5"/>
  </svg>`,

  humain: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="28" rx="16" ry="18" fill="currentColor"/>
    <path d="M30 48 Q30 85 42 88 L58 88 Q70 85 70 48 Q70 38 50 36 Q30 38 30 48 Z" fill="currentColor"/>
    <path d="M30 48 L14 56 L16 74 L28 68" fill="currentColor"/>
    <path d="M70 48 L86 56 L84 74 L72 68" fill="currentColor"/>
    <circle cx="43" cy="24" r="4" fill="#0d0705" opacity=".75"/>
    <circle cx="57" cy="24" r="4" fill="#0d0705" opacity=".75"/>
    <path d="M43 33 Q50 37 57 33" stroke="#0d0705" stroke-width="1.5" fill="none" opacity=".45"/>
  </svg>`,

  créature: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 88 L24 70 Q10 62 10 48 Q10 26 34 22 L38 6 L46 28 Q50 20 54 28 L62 6 L66 22 Q90 26 90 48 Q90 62 76 70 Z" fill="currentColor"/>
    <circle cx="40" cy="42" r="5" fill="#0d0705" opacity=".82"/>
    <circle cx="60" cy="42" r="5" fill="#0d0705" opacity=".82"/>
    <path d="M42 56 Q50 60 58 56" stroke="#0d0705" stroke-width="2.5" fill="none" opacity=".5"/>
  </svg>`,

  "être magique": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10 Q30 12 24 30 L20 58 Q18 72 30 80 Q28 88 32 94 L68 94 Q72 88 70 80 Q82 72 80 58 L76 30 Q70 12 50 10 Z" fill="currentColor" opacity=".9"/>
    <ellipse cx="40" cy="46" rx="7" ry="8" fill="#0d0705" opacity=".88"/>
    <ellipse cx="60" cy="46" rx="7" ry="8" fill="#0d0705" opacity=".88"/>
    <path d="M44 62 Q50 67 56 62" stroke="#0d0705" stroke-width="2" fill="none" opacity=".6"/>
    <!-- Aura magique -->
    <circle cx="50" cy="52" r="36" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 6" opacity=".25"/>
  </svg>`,

};

// ── Couleurs de base par catégorie ─────────────────────────
const MONSTER_BASE_COLORS = {
  bête:           '#7a5c30',
  humain:         '#607880',
  fantôme:        '#90aab8',
  créature:       '#4e6e40',
  'être magique': '#6a3898',
};

// ── Couleurs des variantes ──────────────────────────────────
const VARIANT_COLORS = {
  normal:  null,
  fierce:  '#b84010',
  ancient: '#4a2070',
  shiny:   '#c8920a',
};

// ── Fonction principale ─────────────────────────────────────
function getMonsterIconHtml(monster, sizePx) {
  const svgStr  = MONSTER_ICONS[monster.id] || MONSTER_ICONS[monster.category] || null;
  const variant = monster.variant || 'normal';

  const baseColor  = monster.color || MONSTER_BASE_COLORS[monster.category] || '#8a6840';
  const finalColor = VARIANT_COLORS[variant] || baseColor;

  if (svgStr) {
    return `<div class="monster-icon variant-${variant}"
                 style="width:${sizePx}px;height:${sizePx}px;color:${finalColor}">
              ${svgStr}
            </div>`;
  }
  return `<div class="monster-icon variant-${variant} monster-emoji-fallback"
               style="font-size:${Math.floor(sizePx * 0.75)}px;color:${finalColor};
                      width:${sizePx}px;height:${sizePx}px">
            ${monster.icon}
          </div>`;
}
