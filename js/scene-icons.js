// ============================================================
// SCENE-ICONS.JS — SVG inline des cellules interactives
// ============================================================
// Centralise les SVG inline utilisés par `_showExploreOverlay()`
// (movement.js) pour les cases CHEST, SHOP, STAIRS_D, STAIRS_U,
// FOUNTAIN. La logique d'overlay reste dans movement.js ; ce
// fichier ne contient que de l'art vectoriel.
//
// Chargé après `icons.js` dans index.html.
// ============================================================

const SCENE_ICONS = {

  chest: `<svg viewBox="0 0 110 100" width="120" height="110" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <linearGradient id="chestWoodG" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#7a5018"/><stop offset="1" stop-color="#3a2008"/>
      </linearGradient>
      <linearGradient id="chestLidG" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#8a5a20"/><stop offset="1" stop-color="#4a2a0a"/>
      </linearGradient>
      <radialGradient id="chestGlow" cx="0.5" cy="0.4" r="0.5">
        <stop offset="0" stop-color="#fff8d8" stop-opacity="0.95"/>
        <stop offset="0.6" stop-color="#f0d080" stop-opacity="0.4"/>
        <stop offset="1" stop-color="#7a5c1e" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="55" cy="94" rx="44" ry="5" fill="#000" opacity="0.55"/>
    <ellipse cx="55" cy="38" rx="38" ry="22" fill="url(#chestGlow)"/>
    <rect x="14" y="46" width="82" height="44" rx="2" fill="url(#chestWoodG)" stroke="#1a0f05" stroke-width="1.5"/>
    <line x1="32" y1="48" x2="32" y2="88" stroke="#2a1808" stroke-width="1"/>
    <line x1="55" y1="48" x2="55" y2="88" stroke="#2a1808" stroke-width="1"/>
    <line x1="78" y1="48" x2="78" y2="88" stroke="#2a1808" stroke-width="1"/>
    <path d="M22 56 Q26 64 22 72 M44 54 Q48 68 44 78 M66 54 Q62 70 66 80 M86 56 Q82 66 86 76"
          stroke="#5a3a10" stroke-width="0.6" fill="none" opacity="0.5"/>
    <path d="M14 46 Q55 14 96 46 L96 50 Q55 22 14 50 Z"
          fill="url(#chestLidG)" stroke="#1a0f05" stroke-width="1.5"/>
    <path d="M14 46 Q55 14 96 46" fill="none" stroke="#c9a84c" stroke-width="0.8" opacity="0.7"/>
    <rect x="14" y="46" width="82" height="3" fill="#c9a84c"/>
    <rect x="14" y="68" width="82" height="2.5" fill="#c9a84c"/>
    <rect x="14" y="86" width="82" height="3" fill="#c9a84c"/>
    <rect x="13" y="45" width="5" height="46" fill="#7a5c1e"/>
    <rect x="92" y="45" width="5" height="46" fill="#7a5c1e"/>
    <g>
      <circle cx="16" cy="51" r="1.5" fill="#a89870"/><circle cx="15.6" cy="50.6" r="0.7" fill="#fff" opacity="0.6"/>
      <circle cx="94" cy="51" r="1.5" fill="#a89870"/><circle cx="93.6" cy="50.6" r="0.7" fill="#fff" opacity="0.6"/>
      <circle cx="16" cy="71" r="1.5" fill="#a89870"/><circle cx="15.6" cy="70.6" r="0.7" fill="#fff" opacity="0.6"/>
      <circle cx="94" cy="71" r="1.5" fill="#a89870"/><circle cx="93.6" cy="70.6" r="0.7" fill="#fff" opacity="0.6"/>
      <circle cx="16" cy="88" r="1.5" fill="#a89870"/><circle cx="15.6" cy="87.6" r="0.7" fill="#fff" opacity="0.6"/>
      <circle cx="94" cy="88" r="1.5" fill="#a89870"/><circle cx="93.6" cy="87.6" r="0.7" fill="#fff" opacity="0.6"/>
    </g>
    <rect x="46" y="56" width="18" height="20" rx="2" fill="#c9a84c" stroke="#5a3a08" stroke-width="0.8"/>
    <rect x="48" y="58" width="14" height="16" rx="1" fill="#7a5c1e" opacity="0.4"/>
    <circle cx="55" cy="64" r="2.2" fill="#1a0f05"/>
    <rect x="54" y="65" width="2" height="7" fill="#1a0f05"/>
    <g opacity="0.95">
      <path d="M55 30 L58 38 L66 41 L58 44 L55 52 L52 44 L44 41 L52 38 Z" fill="#fff" opacity="0.85"/>
      <circle cx="55" cy="41" r="2.2" fill="#fff"/>
    </g>
    <circle cx="28" cy="32" r="1.1" fill="#c9a84c" opacity="0.85">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="82" cy="36" r="1.3" fill="#c9a84c" opacity="0.85">
      <animate attributeName="opacity" values="1;0.45;1" dur="2.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="20" cy="42" r="0.9" fill="#fff" opacity="0.7">
      <animate attributeName="opacity" values="0.3;0.9;0.3" dur="3.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="90" cy="28" r="0.9" fill="#fff" opacity="0.7">
      <animate attributeName="opacity" values="0.9;0.35;0.9" dur="2.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="36" cy="22" r="0.7" fill="#fff8d8" opacity="0.8"/>
    <circle cx="74" cy="22" r="0.7" fill="#fff8d8" opacity="0.8"/>
  </svg>`,

  shop: `<svg viewBox="0 0 130 110" width="140" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <linearGradient id="shopAwning1" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#7a3020"/><stop offset="1" stop-color="#3a1408"/>
      </linearGradient>
      <linearGradient id="shopAwning2" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#c9a84c"/><stop offset="1" stop-color="#7a5c1e"/>
      </linearGradient>
      <linearGradient id="shopCounter" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#5a3a14"/><stop offset="1" stop-color="#1a0f05"/>
      </linearGradient>
    </defs>
    <ellipse cx="65" cy="104" rx="58" ry="5" fill="#000" opacity="0.55"/>
    <line x1="65" y1="6" x2="65" y2="14" stroke="#7a5c1e" stroke-width="1.5"/>
    <rect x="38" y="14" width="54" height="16" rx="2" fill="#3a2410" stroke="#c9a84c" stroke-width="1.2"/>
    <rect x="40" y="16" width="50" height="12" rx="1" fill="#1a0f05" opacity="0.4"/>
    <text x="65" y="25" text-anchor="middle" font-family="Cinzel, serif" font-size="9" font-weight="bold" fill="#c9a84c" letter-spacing="1">ÉCHOPPE</text>
    <circle cx="44" cy="14" r="1.3" fill="#7a5c1e"/>
    <circle cx="86" cy="14" r="1.3" fill="#7a5c1e"/>
    <polygon points="14,42 116,42 102,30 28,30" fill="url(#shopAwning1)" stroke="#2a1408" stroke-width="1"/>
    <polygon points="22,38 108,38 102,30 28,30" fill="url(#shopAwning2)" opacity="0.45"/>
    <line x1="35" y1="32" x2="22" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
    <line x1="50" y1="32" x2="42" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
    <line x1="65" y1="32" x2="65" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
    <line x1="80" y1="32" x2="88" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
    <line x1="95" y1="32" x2="108" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
    <path d="M14 42 L20 48 L26 42 L32 48 L38 42 L44 48 L50 42 L56 48 L62 42 L68 48 L74 42 L80 48 L86 42 L92 48 L98 42 L104 48 L110 42 L116 42 Z"
          fill="url(#shopAwning1)" stroke="#2a1408" stroke-width="0.8"/>
    <rect x="18" y="48" width="94" height="48" fill="url(#shopCounter)" stroke="#1a0f05" stroke-width="1"/>
    <rect x="18" y="48" width="94" height="6" fill="#7a5018"/>
    <line x1="18" y1="74" x2="112" y2="74" stroke="#1a0f05" stroke-width="0.8"/>
    <path d="M30 56 L30 72 M50 56 L50 72 M76 56 L76 72 M96 56 L96 72"
          stroke="#3a2410" stroke-width="0.5" opacity="0.6"/>
    <g transform="translate(30 56)">
      <rect x="-3" y="0" width="6" height="3" fill="#7a5c1e"/>
      <path d="M-4 3 L-4 12 Q-4 15 0 15 Q4 15 4 12 L4 3 Z" fill="#4aa86a" opacity="0.9" stroke="#1a0f05" stroke-width="0.5"/>
      <ellipse cx="-2" cy="7" rx="0.8" ry="2.5" fill="#fff" opacity="0.5"/>
    </g>
    <g transform="translate(46 56)">
      <rect x="-3" y="0" width="6" height="3" fill="#7a5c1e"/>
      <path d="M-4 3 L-4 12 Q-4 15 0 15 Q4 15 4 12 L4 3 Z" fill="#4080d8" opacity="0.9" stroke="#1a0f05" stroke-width="0.5"/>
      <ellipse cx="-2" cy="7" rx="0.8" ry="2.5" fill="#fff" opacity="0.5"/>
    </g>
    <g transform="translate(64 60)">
      <ellipse cx="0" cy="0" rx="9" ry="3" fill="#d4c08a"/>
      <ellipse cx="0" cy="0" rx="2" ry="3" fill="#a89870"/>
      <ellipse cx="0" cy="-1" rx="9" ry="2" fill="#e8d4a0"/>
      <line x1="-7" y1="-1" x2="7" y2="-1" stroke="#7a5c1e" stroke-width="0.4" opacity="0.6"/>
    </g>
    <g transform="translate(88 58) rotate(-15)">
      <rect x="-1" y="-8" width="2" height="16" fill="#3a2410"/>
      <rect x="-1.5" y="6" width="3" height="3" fill="#5a3a14"/>
      <circle cx="0" cy="-8" r="1.5" fill="#c9a84c"/>
      <circle cx="0" cy="-8" r="0.6" fill="#fff8d8"/>
    </g>
    <g transform="translate(34 86)">
      <ellipse cx="0" cy="3" rx="6" ry="1.5" fill="#7a5c1e"/>
      <ellipse cx="0" cy="0" rx="6" ry="1.5" fill="#c9a84c"/>
      <ellipse cx="0" cy="-3" rx="6" ry="1.5" fill="#e8c860"/>
      <ellipse cx="0" cy="-3" rx="3" ry="0.6" fill="#fff8d8" opacity="0.7"/>
    </g>
    <g transform="translate(60 82)">
      <rect x="-8" y="0" width="16" height="10" fill="#5a1818" stroke="#2a0808" stroke-width="0.8"/>
      <rect x="-8" y="0" width="16" height="2" fill="#7a2828"/>
      <rect x="-1" y="2" width="2" height="6" fill="#c9a84c"/>
      <line x1="-6" y1="6" x2="6" y2="6" stroke="#c9a84c" stroke-width="0.4" opacity="0.6"/>
    </g>
    <g transform="translate(86 82)">
      <polygon points="0,-7 5,-2 4,5 -4,5 -5,-2" fill="#8a4ac8" opacity="0.9" stroke="#3a1858" stroke-width="0.5"/>
      <polygon points="0,-7 5,-2 0,0 -5,-2" fill="#a86ad8" opacity="0.75"/>
      <polygon points="-5,-2 0,0 -4,5" fill="#5a1c8a" opacity="0.55"/>
      <polygon points="0,-7 0,0 -2,-4" fill="#fff" opacity="0.4"/>
    </g>
    <circle cx="22" cy="22" r="0.9" fill="#fff" opacity="0.85"/>
    <circle cx="108" cy="20" r="1.1" fill="#c9a84c" opacity="0.85"/>
    <circle cx="14" cy="36" r="0.7" fill="#fff" opacity="0.65"/>
    <circle cx="116" cy="38" r="0.8" fill="#fff" opacity="0.65"/>
  </svg>`,

  stairs_d: `<svg viewBox="0 0 100 110" width="110" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <linearGradient id="stoneTopD" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#a89870"/><stop offset="1" stop-color="#5a4a32"/>
      </linearGradient>
      <radialGradient id="holeD" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#1a1208"/>
      </radialGradient>
      <linearGradient id="stairDFog" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#000"   stop-opacity="0.6"/>
        <stop offset="1" stop-color="#1a1208" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="6,108 94,108 72,12 28,12" fill="#2a2010" stroke="#c9a84c" stroke-width="1.2"/>
    <rect x="6" y="12" width="88" height="40" fill="url(#stairDFog)"/>
    <g>
      <polygon points="10,104 90,104 80,90 20,90" fill="url(#stoneTopD)"/>
      <rect x="20" y="90" width="60" height="6" fill="#2a1e10"/>
      <polygon points="22,86 78,86 71,74 29,74" fill="#7a6a4a"/>
      <rect x="29" y="74" width="42" height="5" fill="#1a1208"/>
      <polygon points="31,71 69,71 64,61 36,61" fill="#6a5a3a"/>
      <rect x="36" y="61" width="28" height="4" fill="#0e0904"/>
      <polygon points="38,58 62,58 58,50 42,50" fill="#4a3a22"/>
      <rect x="42" y="50" width="16" height="3" fill="#0a0604"/>
      <ellipse cx="50" cy="38" rx="14" ry="15" fill="url(#holeD)"/>
      <ellipse cx="50" cy="38" rx="9" ry="10" fill="#000"/>
    </g>
    <line x1="10" y1="104" x2="90" y2="104" stroke="#c9a84c" stroke-width="1" opacity="0.7"/>
    <line x1="22" y1="86" x2="78" y2="86" stroke="#c9a84c" stroke-width="0.8" opacity="0.45"/>
    <line x1="31" y1="71" x2="69" y2="71" stroke="#c9a84c" stroke-width="0.6" opacity="0.3"/>
    <line x1="14" y1="80" x2="22" y2="80" stroke="#1a1208" stroke-width="0.8"/>
    <line x1="78" y1="80" x2="86" y2="80" stroke="#1a1208" stroke-width="0.8"/>
    <line x1="20" y1="60" x2="26" y2="60" stroke="#1a1208" stroke-width="0.6"/>
    <line x1="74" y1="60" x2="80" y2="60" stroke="#1a1208" stroke-width="0.6"/>
    <path d="M50 26 L50 44 M44 38 L50 46 L56 38" stroke="#c9a84c" stroke-width="2.2"
          fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  </svg>`,

  stairs_u: `<svg viewBox="0 0 100 110" width="110" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <radialGradient id="stairULight" cx="0.5" cy="0.4" r="0.5">
        <stop offset="0" stop-color="#fff8d8" stop-opacity="0.55"/>
        <stop offset="0.7" stop-color="#f0d080" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="stairUStone" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#b8a878"/><stop offset="1" stop-color="#5a4a32"/>
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="20" rx="40" ry="18" fill="url(#stairULight)"/>
    <path d="M30 18 L30 36 L70 36 L70 18 Q70 4 50 4 Q30 4 30 18 Z"
          fill="#2a2010" stroke="#c9a84c" stroke-width="1"/>
    <path d="M36 22 L36 36 L64 36 L64 22 Q64 12 50 12 Q36 12 36 22 Z" fill="#0a0604"/>
    <polygon points="46,4 54,4 56,12 44,12" fill="#a89870" stroke="#3a2e1c" stroke-width="0.5"/>
    <circle cx="50" cy="8" r="1" fill="#fff8d8" opacity="0.7"/>
    <line x1="38" y1="22" x2="44" y2="22" stroke="#3a2e1c" stroke-width="0.6"/>
    <line x1="56" y1="22" x2="62" y2="22" stroke="#3a2e1c" stroke-width="0.6"/>
    <line x1="36" y1="30" x2="42" y2="30" stroke="#3a2e1c" stroke-width="0.6"/>
    <line x1="58" y1="30" x2="64" y2="30" stroke="#3a2e1c" stroke-width="0.6"/>
    <g>
      <polygon points="38,36 62,36 58,44 42,44" fill="url(#stairUStone)"/>
      <rect x="38" y="36" width="24" height="2" fill="#f0d080" opacity="0.6"/>
      <polygon points="34,44 66,44 62,54 38,54" fill="#8a7a5a"/>
      <rect x="38" y="44" width="24" height="2" fill="#c9a84c" opacity="0.5"/>
      <line x1="46" y1="46" x2="46" y2="54" stroke="#1a1208" stroke-width="0.5"/>
      <line x1="54" y1="46" x2="54" y2="54" stroke="#1a1208" stroke-width="0.5"/>
      <polygon points="28,54 72,54 68,68 32,68" fill="#9a8a6a"/>
      <rect x="34" y="54" width="32" height="3" fill="#c9a84c" opacity="0.45"/>
      <line x1="44" y1="57" x2="44" y2="68" stroke="#1a1208" stroke-width="0.6"/>
      <line x1="56" y1="57" x2="56" y2="68" stroke="#1a1208" stroke-width="0.6"/>
      <polygon points="18,68 82,68 76,86 24,86" fill="url(#stairUStone)"/>
      <rect x="28" y="68" width="44" height="4" fill="#c9a84c" opacity="0.5"/>
      <line x1="40" y1="72" x2="40" y2="86" stroke="#1a1208" stroke-width="0.7"/>
      <line x1="52" y1="72" x2="52" y2="86" stroke="#1a1208" stroke-width="0.7"/>
      <line x1="64" y1="72" x2="64" y2="86" stroke="#1a1208" stroke-width="0.7"/>
      <polygon points="10,86 90,86 86,108 14,108" fill="#3a2e1c"/>
      <line x1="14" y1="96" x2="86" y2="96" stroke="#1a1208" stroke-width="0.7" opacity="0.6"/>
    </g>
    <path d="M50 80 L50 64 M44 70 L50 62 L56 70" stroke="#c9a84c" stroke-width="2.2"
          fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  </svg>`,

  // La fontaine est paramétrée par son état (active / tarie).
  fountain(opts) {
    const dried = !!(opts && opts.dried);
    return `<svg viewBox="0 0 120 130" width="130" height="140" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <defs>
        <radialGradient id="fntWater" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0"   stop-color="#cfe6ff"/>
          <stop offset="0.6" stop-color="#5e9bd6"/>
          <stop offset="1"   stop-color="#1c4a7a"/>
        </radialGradient>
        <linearGradient id="fntStoneTop" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#b8a878"/><stop offset="1" stop-color="#7a6a4a"/>
        </linearGradient>
        <linearGradient id="fntStoneBase" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#6a5a3a"/><stop offset="1" stop-color="#3a2e1c"/>
        </linearGradient>
        <radialGradient id="fntGlow" cx="0.5" cy="0.4" r="0.55">
          <stop offset="0"   stop-color="#cfe6ff" stop-opacity="0.55"/>
          <stop offset="0.6" stop-color="#5e9bd6" stop-opacity="0.18"/>
          <stop offset="1"   stop-color="#000"    stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="124" rx="52" ry="5" fill="#000" opacity="0.55"/>
      <ellipse cx="60" cy="56" rx="56" ry="38" fill="url(#fntGlow)" opacity="${dried ? 0.25 : 1}"/>
      <ellipse cx="60" cy="116" rx="50" ry="10" fill="url(#fntStoneBase)" stroke="#1a1208" stroke-width="1.2"/>
      <ellipse cx="60" cy="92"  rx="50" ry="14" fill="url(#fntStoneTop)" stroke="#1a1208" stroke-width="1.2"/>
      <circle cx="22" cy="93" r="2.2" fill="#c9a84c"/>
      <circle cx="60" cy="100" r="2.2" fill="#c9a84c"/>
      <circle cx="98" cy="93" r="2.2" fill="#c9a84c"/>
      <ellipse cx="60" cy="86"  rx="44" ry="9"  fill="${dried ? '#3a2e1c' : 'url(#fntWater)'}"/>
      <ellipse cx="60" cy="84"  rx="36" ry="5"  fill="${dried ? '#1a1208' : '#cfe6ff'}" opacity="${dried ? 0.4 : 0.6}"/>
      ${dried ? '' : `
      <ellipse cx="60" cy="84" rx="20" ry="3"  fill="none" stroke="#fff" stroke-width="0.6" opacity="0.55"/>
      <ellipse cx="60" cy="86" rx="30" ry="4"  fill="none" stroke="#fff" stroke-width="0.4" opacity="0.35"/>`}
      <rect x="54" y="50" width="12" height="36" fill="url(#fntStoneBase)" stroke="#1a1208" stroke-width="0.8"/>
      <rect x="50" y="48" width="20" height="4" fill="url(#fntStoneTop)" stroke="#1a1208" stroke-width="0.8"/>
      <ellipse cx="60" cy="36" rx="11" ry="13" fill="url(#fntStoneTop)" stroke="#1a1208" stroke-width="0.8"/>
      <circle  cx="60" cy="22" r="9"  fill="url(#fntStoneTop)" stroke="#1a1208" stroke-width="0.8"/>
      <circle cx="56" cy="22" r="2" fill="#0d0705"/>
      <circle cx="64" cy="22" r="2" fill="#0d0705"/>
      <circle cx="56" cy="22" r="0.6" fill="${dried ? '#5a4a32' : '#cfe6ff'}"/>
      <circle cx="64" cy="22" r="0.6" fill="${dried ? '#5a4a32' : '#cfe6ff'}"/>
      <polygon points="60,26 58,30 62,30" fill="#c9a84c"/>
      <path d="M50 32 Q42 38 48 44 M70 32 Q78 38 72 44"
            stroke="#1a1208" stroke-width="1" fill="none"/>
      ${dried ? '' : `
      <path d="M60 34 Q56 50 60 60" stroke="#cfe6ff" stroke-width="2" fill="none" opacity="0.85">
        <animate attributeName="opacity" values="0.55;0.95;0.55" dur="2.4s" repeatCount="indefinite"/>
      </path>
      <path d="M60 34 Q64 50 60 60" stroke="#cfe6ff" stroke-width="2" fill="none" opacity="0.85"/>
      <circle cx="48" cy="78" r="1.2" fill="#cfe6ff" opacity="0.85">
        <animate attributeName="cy" values="78;72;78" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="72" cy="78" r="1.2" fill="#cfe6ff" opacity="0.85">
        <animate attributeName="cy" values="78;73;78" dur="2.6s" repeatCount="indefinite"/>
      </circle>
      <circle cx="60" cy="74" r="1" fill="#fff" opacity="0.95"/>`}
      <path d="M14 110 Q24 106 32 110 M88 110 Q98 106 106 110"
            stroke="#3a5e2a" stroke-width="1.4" fill="none" opacity="0.6"/>
    </svg>`;
  },

  // Refuge de Maison (Ch.13 P3) — foyer chaleureux sous une bannière dont la
  // couleur reprend l'accent de la Maison (`opts.accent`, défaut or Poufsouffle).
  // Le feu reste chaud (un foyer l'est, quelle que soit la Maison). `spent`
  // éteint le feu (braises ternes). viewBox 120×130 (proportions de la fontaine
  // pour drawRefugeSprite).
  refuge(opts) {
    const spent  = !!(opts && opts.spent);
    const accent = (opts && opts.accent) || '#f0c84a';   // accent de Maison (bannière)
    return `<svg viewBox="0 0 120 130" width="130" height="140" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <defs>
        <radialGradient id="refGlow" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0"   stop-color="#ffe6a8" stop-opacity="${spent ? 0.2 : 0.7}"/>
          <stop offset="0.6" stop-color="#e8a13a" stop-opacity="${spent ? 0.08 : 0.25}"/>
          <stop offset="1"   stop-color="#000"    stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="refFlame" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#fff2b0"/><stop offset="0.5" stop-color="#ffb347"/><stop offset="1" stop-color="#d24a16"/>
        </linearGradient>
        <linearGradient id="refLog" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#7a5a36"/><stop offset="1" stop-color="#3a2a18"/>
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="124" rx="50" ry="5" fill="#000" opacity="0.55"/>
      <ellipse cx="60" cy="80" rx="54" ry="40" fill="url(#refGlow)"/>
      <rect x="56" y="14" width="3" height="40" fill="#2a2018"/>
      <path d="M59 16 H92 L86 24 L92 32 H59 Z" fill="${accent}" stroke="#2a2018" stroke-width="1"/>
      <ellipse cx="74" cy="24" rx="5" ry="4" fill="#2a2018"/>
      <ellipse cx="74" cy="24" rx="2.4" ry="3.2" fill="${accent}"/>
      <rect x="36" y="96" width="48" height="9" rx="3" fill="url(#refLog)" stroke="#1a1208" stroke-width="1" transform="rotate(8 60 100)"/>
      <rect x="36" y="96" width="48" height="9" rx="3" fill="url(#refLog)" stroke="#1a1208" stroke-width="1" transform="rotate(-8 60 100)"/>
      ${spent ? `
      <ellipse cx="60" cy="92" rx="12" ry="4" fill="#5a3a1a" opacity="0.8"/>
      <circle cx="55" cy="91" r="1.6" fill="#a8521f" opacity="0.7"/>
      <circle cx="64" cy="92" r="1.4" fill="#a8521f" opacity="0.6"/>
      <path d="M58 88 Q56 82 60 78" stroke="#777" stroke-width="1.4" fill="none" opacity="0.5"/>` : `
      <path d="M60 92 Q48 78 60 58 Q72 78 60 92 Z" fill="url(#refFlame)">
        <animate attributeName="opacity" values="0.85;1;0.85" dur="1.4s" repeatCount="indefinite"/>
      </path>
      <path d="M60 90 Q54 80 60 68 Q66 80 60 90 Z" fill="#fff2b0" opacity="0.9">
        <animate attributeName="d"
          values="M60 90 Q54 80 60 68 Q66 80 60 90 Z;M60 90 Q56 78 60 64 Q64 78 60 90 Z;M60 90 Q54 80 60 68 Q66 80 60 90 Z"
          dur="1.1s" repeatCount="indefinite"/>
      </path>
      <circle cx="50" cy="70" r="1.2" fill="#ffd27a" opacity="0.9">
        <animate attributeName="cy" values="70;58;70" dur="2.0s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.9;0;0.9" dur="2.0s" repeatCount="indefinite"/>
      </circle>
      <circle cx="70" cy="72" r="1" fill="#ffd27a" opacity="0.9">
        <animate attributeName="cy" values="72;60;72" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.9;0;0.9" dur="2.4s" repeatCount="indefinite"/>
      </circle>`}
    </svg>`;
  },

  // Jardin d'herbes (Potions P6.b3) — carré de terre magique d'où jaillissent
  // des pousses luminescentes. Le `tier` (1-4) adapte la palette aux herbes
  // qui poussent au palier de l'étage : T1 vert d'école · T2 aqua
  // (branchiflore/asphodèle) · T3 violet magique (aconit/dictame) · T4
  // sombre/Ténèbres (asphodèle noire). Plus le palier monte, plus le jardin
  // est dense et chargé de fleurs.
  garden(tier) {
    const PAL = {
      1: { gA:'#bfffb0', gB:'#4fae5e', leafA:'#9fe27a', leafB:'#2f7a3a', stem:'#3f8a44',
           soilA:'#5a3e26', soilB:'#2c1c10', soilTop:'#3a2818', leafEdge:'#1a3a14',
           f1:'#eaffb0', f2:'#bfe6ff', f3:'#e2b0ff' },
      2: { gA:'#b0fff0', gB:'#2f9e86', leafA:'#7ad9c0', leafB:'#23715f', stem:'#2f8a78',
           soilA:'#3e5246', soilB:'#10241c', soilTop:'#1a3a30', leafEdge:'#123a30',
           f1:'#c0fff0', f2:'#8fe6ff', f3:'#b0ffe0' },
      3: { gA:'#e0b0ff', gB:'#7a3ea8', leafA:'#b48ce0', leafB:'#4a2f7a', stem:'#6a3e9a',
           soilA:'#4a2e56', soilB:'#1a1024', soilTop:'#2e1a3a', leafEdge:'#2a1240',
           f1:'#f0c0ff', f2:'#c08fff', f3:'#fff0b0' },
      4: { gA:'#ff8a8a', gB:'#7a1a1a', leafA:'#8a5a6a', leafB:'#2a1018', stem:'#6a2a3a',
           soilA:'#3a1a22', soilB:'#160608', soilTop:'#2a1014', leafEdge:'#200810',
           f1:'#ff6060', f2:'#c050ff', f3:'#ff3050' }
    };
    const p = PAL[tier] || PAL[1];
    // Pousses & fleurs supplémentaires à partir du palier 2 / 3.
    const extraSprouts = (tier >= 2)
      ? `<path d="M52 100 Q49 86 46 78 Q49 88 52 100Z" fill="url(#grdLeaf)" stroke="${p.leafEdge}" stroke-width="0.5"/>
         <path d="M68 100 Q71 86 74 78 Q71 88 68 100Z" fill="url(#grdLeaf)" stroke="${p.leafEdge}" stroke-width="0.5"/>` : '';
    const extraFlower = (tier >= 3)
      ? `<circle cx="48" cy="58" r="2.6" fill="${p.f1}">
           <animate attributeName="opacity" values="0.5;0.95;0.5" dur="2.5s" repeatCount="indefinite"/>
         </circle>
         <circle cx="74" cy="74" r="2.4" fill="${p.f3}">
           <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.9s" repeatCount="indefinite"/>
         </circle>` : '';
    return `<svg viewBox="0 0 120 130" width="130" height="140" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <defs>
        <radialGradient id="grdGlow" cx="0.5" cy="0.55" r="0.6">
          <stop offset="0"   stop-color="${p.gA}" stop-opacity="0.55"/>
          <stop offset="0.6" stop-color="${p.gB}" stop-opacity="0.18"/>
          <stop offset="1"   stop-color="#000"    stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="grdSoil" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="${p.soilA}"/><stop offset="1" stop-color="${p.soilB}"/>
        </linearGradient>
        <linearGradient id="grdLeaf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="${p.leafA}"/><stop offset="1" stop-color="${p.leafB}"/>
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="124" rx="52" ry="5" fill="#000" opacity="0.55"/>
      <ellipse cx="60" cy="80" rx="56" ry="42" fill="url(#grdGlow)"/>
      <ellipse cx="60" cy="104" rx="46" ry="13" fill="url(#grdSoil)" stroke="#1a1208" stroke-width="1.2"/>
      <ellipse cx="60" cy="100" rx="40" ry="9"  fill="${p.soilTop}"/>
      <!-- pousses -->
      <path d="M60 100 Q56 70 60 52 Q64 70 60 100Z" fill="url(#grdLeaf)" stroke="${p.leafEdge}" stroke-width="0.6"/>
      <path d="M60 78 Q48 70 42 60" stroke="${p.stem}" stroke-width="2.4" fill="none"/>
      <path d="M60 82 Q72 72 78 62" stroke="${p.stem}" stroke-width="2.4" fill="none"/>
      <path d="M44 100 Q40 84 36 74 Q40 86 44 100Z" fill="url(#grdLeaf)" stroke="${p.leafEdge}" stroke-width="0.5"/>
      <path d="M76 100 Q80 84 84 74 Q80 86 76 100Z" fill="url(#grdLeaf)" stroke="${p.leafEdge}" stroke-width="0.5"/>
      ${extraSprouts}
      <!-- fleurs luminescentes -->
      <circle cx="60" cy="50" r="4.5" fill="${p.f1}">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.6s" repeatCount="indefinite"/>
      </circle>
      <circle cx="60" cy="50" r="2" fill="#fff"/>
      <circle cx="36" cy="72" r="3" fill="${p.f2}">
        <animate attributeName="opacity" values="0.5;0.95;0.5" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="84" cy="60" r="3" fill="${p.f3}">
        <animate attributeName="opacity" values="0.5;0.95;0.5" dur="3s" repeatCount="indefinite"/>
      </circle>
      ${extraFlower}
      <circle cx="50" cy="44" r="1.2" fill="#fff" opacity="0.9">
        <animate attributeName="cy" values="44;38;44" dur="2.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="72" cy="46" r="1" fill="#fff" opacity="0.85">
        <animate attributeName="cy" values="46;40;46" dur="2.4s" repeatCount="indefinite"/>
      </circle>
    </svg>`;
  },

  // ── Forge des Ténèbres (endgame Tranche 2) ───────────────────
  // Enclume sur charbons rougeoyants avec étincelles ascendantes.
  forge: `<svg viewBox="0 0 120 110" width="130" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <radialGradient id="forgeGlow" cx="50%" cy="80%" r="60%">
        <stop offset="0%" stop-color="#ff7530" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="#a04060" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#3a1a3a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="anvilMetal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5a5050"/>
        <stop offset="100%" stop-color="#1a1818"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="85" rx="55" ry="22" fill="url(#forgeGlow)"/>
    <path d="M 25 100 L 95 100 L 88 92 L 32 92 Z" fill="#3a2a1a" stroke="#5a4030" stroke-width="1"/>
    <path d="M 38 92 L 82 92 L 78 86 L 42 86 Z" fill="#ff5020"/>
    <circle cx="48" cy="88" r="2.5" fill="#ffb060">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="60" cy="89" r="2"   fill="#ffd080">
      <animate attributeName="opacity" values="1;0.5;1" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="72" cy="88" r="2.5" fill="#ff9050">
      <animate attributeName="opacity" values="0.7;1;0.7" dur="2.1s" repeatCount="indefinite"/>
    </circle>
    <path d="M 40 80 L 80 80 L 76 64 L 60 60 L 44 64 Z" fill="url(#anvilMetal)" stroke="#7a6868" stroke-width="1.2"/>
    <rect x="32" y="56" width="56" height="8" rx="2" fill="#3a3434" stroke="#787070" stroke-width="1"/>
    <path d="M 88 60 L 102 62 L 102 66 L 88 64 Z" fill="#3a3434" stroke="#787070" stroke-width="0.8"/>
    <circle cx="50" cy="45" r="1.3" fill="#ffcc66" opacity="0.9">
      <animate attributeName="cy" values="45;25;45" dur="2.4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.9;0;0.9" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="60" cy="40" r="1.5" fill="#ff9933" opacity="0.85">
      <animate attributeName="cy" values="40;18;40" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.85;0;0.85" dur="3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="70" cy="48" r="1.2" fill="#ffaa44" opacity="0.9">
      <animate attributeName="cy" values="48;28;48" dur="2.1s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.9;0;0.9" dur="2.1s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  // ── Bibliothèque interdite (endgame Tranche 2) ───────────────
  // Pupitre + grimoire ouvert avec runes flottantes pourpres.
  library: `<svg viewBox="0 0 120 110" width="130" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <radialGradient id="libGlow" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#9060c0" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#2a1a3a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="bookCover" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a1a4a"/>
        <stop offset="100%" stop-color="#1a0a26"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="55" rx="50" ry="32" fill="url(#libGlow)"/>
    <path d="M 20 100 L 100 100 L 90 78 L 30 78 Z" fill="#3a2a1a" stroke="#5a3a26" stroke-width="1.2"/>
    <path d="M 30 78 L 90 78 L 84 70 L 36 70 Z" fill="#48321a" stroke="#5a3a26" stroke-width="1"/>
    <path d="M 38 70 L 60 66 L 82 70 L 82 56 L 60 52 L 38 56 Z" fill="#e4d6b4" stroke="#7a5a3a" stroke-width="1"/>
    <path d="M 38 70 L 60 66 L 60 50 L 36 54 Z" fill="url(#bookCover)" stroke="#7a5a3a" stroke-width="1"/>
    <path d="M 82 70 L 60 66 L 60 50 L 84 54 Z" fill="url(#bookCover)" stroke="#7a5a3a" stroke-width="1"/>
    <line x1="60" y1="52" x2="60" y2="66" stroke="#c9a84c" stroke-width="1.5"/>
    <line x1="42" y1="60" x2="56" y2="58" stroke="#5a4030" stroke-width="0.5" opacity="0.7"/>
    <line x1="42" y1="63" x2="56" y2="61" stroke="#5a4030" stroke-width="0.5" opacity="0.7"/>
    <line x1="42" y1="66" x2="56" y2="64" stroke="#5a4030" stroke-width="0.5" opacity="0.7"/>
    <line x1="64" y1="58" x2="78" y2="60" stroke="#5a4030" stroke-width="0.5" opacity="0.7"/>
    <line x1="64" y1="61" x2="78" y2="63" stroke="#5a4030" stroke-width="0.5" opacity="0.7"/>
    <line x1="64" y1="64" x2="78" y2="66" stroke="#5a4030" stroke-width="0.5" opacity="0.7"/>
    <text x="48" y="40" font-family="serif" font-size="10" fill="#c060ff" opacity="0.85">✶
      <animate attributeName="opacity" values="0.85;0.3;0.85" dur="2.4s" repeatCount="indefinite"/>
      <animate attributeName="y"       values="40;34;40" dur="2.4s" repeatCount="indefinite"/>
    </text>
    <text x="68" y="36" font-family="serif" font-size="10" fill="#a040e0" opacity="0.9">✦
      <animate attributeName="opacity" values="0.9;0.4;0.9" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="y"       values="36;30;36" dur="3s" repeatCount="indefinite"/>
    </text>
    <text x="58" y="32" font-family="serif" font-size="8" fill="#d080ff" opacity="0.85">✧
      <animate attributeName="opacity" values="0.85;0.5;0.85" dur="2.1s" repeatCount="indefinite"/>
    </text>
  </svg>`,

  // ── Chaudron des Ruines (Potions 2.0 — Lot P11) ──────────────
  // Chaudron de fer noir sur braises runiques, vapeur verte montante.
  cauldron: `<svg viewBox="0 0 120 110" width="130" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <radialGradient id="cauldGlow" cx="50%" cy="78%" r="60%">
        <stop offset="0%" stop-color="#5fd070" stop-opacity="0.6"/>
        <stop offset="55%" stop-color="#2a8050" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#1a2a2a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="cauldIron" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a3a42"/>
        <stop offset="100%" stop-color="#14141a"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="92" rx="48" ry="18" fill="url(#cauldGlow)"/>
    <path d="M 36 96 L 50 96 L 48 102 L 38 102 Z" fill="#3a2a1a" stroke="#5a4030" stroke-width="1"/>
    <path d="M 70 96 L 84 96 L 82 102 L 72 102 Z" fill="#3a2a1a" stroke="#5a4030" stroke-width="1"/>
    <ellipse cx="60" cy="98" rx="30" ry="6" fill="#ff6020" opacity="0.85"/>
    <circle cx="48" cy="98" r="2" fill="#ffc060"><animate attributeName="opacity" values="0.6;1;0.6" dur="1.7s" repeatCount="indefinite"/></circle>
    <circle cx="72" cy="98" r="2" fill="#ff9040"><animate attributeName="opacity" values="1;0.5;1" dur="1.4s" repeatCount="indefinite"/></circle>
    <path d="M 26 60 Q 24 92 60 92 Q 96 92 94 60 Z" fill="url(#cauldIron)" stroke="#000" stroke-width="2"/>
    <path d="M 24 60 Q 8 64 22 78" fill="none" stroke="#2a2a32" stroke-width="5" stroke-linecap="round"/>
    <path d="M 96 60 Q 112 64 98 78" fill="none" stroke="#2a2a32" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="60" cy="60" rx="36" ry="10" fill="#101016"/>
    <ellipse cx="60" cy="59" rx="31" ry="7.5" fill="#3a9d60"/>
    <ellipse cx="60" cy="57.5" rx="25" ry="5" fill="#7fe0a0" opacity="0.5"/>
    <circle cx="52" cy="48" r="1.6" fill="#9fe8b0" opacity="0.85">
      <animate attributeName="cy" values="50;30;50" dur="2.6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.85;0;0.85" dur="2.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="62" cy="44" r="1.9" fill="#7fd890" opacity="0.8">
      <animate attributeName="cy" values="44;22;44" dur="3.2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0;0.8" dur="3.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="70" cy="50" r="1.4" fill="#a8f0c0" opacity="0.85">
      <animate attributeName="cy" values="50;32;50" dur="2.2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.85;0;0.85" dur="2.2s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  // ── Autel Ancien (enrichissement du donjon §2.B) ─────────────
  // Dalle de pierre runique sur socle, orbe pulsé violet-or au sommet.
  altar: `<svg viewBox="0 0 120 110" width="130" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <radialGradient id="altarGlow" cx="50%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#e0b840" stop-opacity="0.8"/>
        <stop offset="55%" stop-color="#9050c0" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#2a1a3a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="altarStone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6a6068"/>
        <stop offset="100%" stop-color="#2a2630"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="50" rx="46" ry="34" fill="url(#altarGlow)"/>
    <path d="M 26 100 L 94 100 L 86 90 L 34 90 Z" fill="#3a3038" stroke="#5a4a52" stroke-width="1.2"/>
    <rect x="40" y="60" width="40" height="30" fill="url(#altarStone)" stroke="#7a6a72" stroke-width="1.2"/>
    <path d="M 34 60 L 86 60 L 80 52 L 40 52 Z" fill="#7a6e78" stroke="#9a8a92" stroke-width="1"/>
    <path d="M 47 67 L 53 73 M 53 67 L 47 73" stroke="#b078e0" stroke-width="1.6" opacity="0.85">
      <animate attributeName="opacity" values="0.85;0.3;0.85" dur="2.6s" repeatCount="indefinite"/>
    </path>
    <circle cx="67" cy="70" r="3.4" fill="none" stroke="#b078e0" stroke-width="1.6" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.35;0.8" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="60" cy="46" r="6" fill="#e8c860">
      <animate attributeName="r" values="6;7.5;6" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="60" cy="46" r="11" fill="none" stroke="#c89be0" stroke-width="1" opacity="0.6">
      <animate attributeName="r" values="11;15;11" dur="2.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0;0.6" dur="2.8s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  // Stèle d'énigme (V2 Phase 3) — monolithe gravé, lueur cyan « savoir ».
  stele: `<svg viewBox="0 0 120 110" width="130" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <radialGradient id="steleGlow" cx="50%" cy="40%" r="62%">
        <stop offset="0%" stop-color="#7fe0f0" stop-opacity="0.75"/>
        <stop offset="58%" stop-color="#3a7aa0" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#10202a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="steleStone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7a7e86"/>
        <stop offset="100%" stop-color="#2e3038"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="54" rx="44" ry="42" fill="url(#steleGlow)"/>
    <path d="M 28 100 L 92 100 L 84 91 L 36 91 Z" fill="#3a3a42" stroke="#5a5a64" stroke-width="1.2"/>
    <path d="M 44 91 L 76 91 L 72 26 L 60 15 L 48 26 Z" fill="url(#steleStone)" stroke="#9098a2" stroke-width="1.3"/>
    <g stroke="#8fe6f4" stroke-width="1.7" fill="none" opacity="0.88" stroke-linecap="round">
      <path d="M 53 40 L 67 40"/>
      <path d="M 60 47 L 60 59 M 55 53 L 65 53"/>
      <path d="M 53 68 L 67 68 M 53 68 L 56 74 M 67 68 L 64 74"/>
      <animate attributeName="opacity" values="0.88;0.32;0.88" dur="2.8s" repeatCount="indefinite"/>
    </g>
    <circle cx="60" cy="24" r="5" fill="#aef0fa">
      <animate attributeName="r" values="5;6.6;5" dur="2.1s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="1;0.65;1" dur="2.1s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  // Salle sur Demande V2 (room-of-requirement-v2.md §4) — porte cintrée
  // gravée dans un pan de mur, vantail de bois patiné cerclé de fer, arche
  // dorée et halo chaud « magie ancienne ». ViewBox 120×130 (modèle jardin).
  requirement: `<svg viewBox="0 0 120 130" width="130" height="140" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <radialGradient id="reqGlow" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stop-color="#ffe6a8" stop-opacity="0.7"/>
        <stop offset="55%" stop-color="#c79338" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#1a1208" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="reqStone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6a5e4a"/>
        <stop offset="100%" stop-color="#2a2218"/>
      </linearGradient>
      <linearGradient id="reqWood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5a3c1e"/>
        <stop offset="100%" stop-color="#311e0e"/>
      </linearGradient>
      <linearGradient id="reqGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f0d27a"/>
        <stop offset="100%" stop-color="#9a7320"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="124" rx="50" ry="5" fill="#000" opacity="0.55"/>
    <ellipse cx="60" cy="58" rx="50" ry="50" fill="url(#reqGlow)">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="3s" repeatCount="indefinite"/>
    </ellipse>
    <!-- pan de mur -->
    <rect x="22" y="20" width="76" height="98" rx="2" fill="url(#reqStone)" stroke="#1a1208" stroke-width="1.4"/>
    <path d="M30 40 H90 M30 64 H90 M30 88 H90" stroke="#1a1208" stroke-width="0.8" opacity="0.5"/>
    <!-- embrasure cintrée -->
    <path d="M38 116 V58 A22 22 0 0 1 82 58 V116 Z" fill="#120c06" stroke="url(#reqGold)" stroke-width="2.4"/>
    <!-- vantail de bois -->
    <path d="M41 114 V58 A19 19 0 0 1 79 58 V114 Z" fill="url(#reqWood)" stroke="#1a1208" stroke-width="1"/>
    <path d="M60 38 V114" stroke="#1a1208" stroke-width="1" opacity="0.7"/>
    <path d="M50 46 V114 M70 46 V114" stroke="#2a1a0c" stroke-width="0.7" opacity="0.6"/>
    <!-- ferrures -->
    <rect x="41" y="74" width="38" height="4" fill="url(#reqGold)" opacity="0.85"/>
    <rect x="41" y="96" width="38" height="4" fill="url(#reqGold)" opacity="0.85"/>
    <!-- anneau-poignée -->
    <circle cx="52" cy="88" r="4.2" fill="none" stroke="url(#reqGold)" stroke-width="2"/>
    <!-- clef de voûte lumineuse -->
    <circle cx="60" cy="40" r="4" fill="#ffe6a8">
      <animate attributeName="opacity" values="1;0.5;1" dur="2.4s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

};
