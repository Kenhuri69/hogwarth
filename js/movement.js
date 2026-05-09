// ============================================================
// DÉPLACEMENT ET ÉVÉNEMENTS DE CELLULE
// ============================================================

function canMove(dir) {
  if (inBattle) return false;
  const [dx, dy] = DIRECTIONS[dir];
  const nx = playerX + dx, ny = playerY + dy;
  if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return false;
  return dungeon[ny][nx] !== CELL.WALL;
}

function move(dir) {
  if (inBattle) return;
  playerDir = dir;
  if (!canMove(dir)) {
    setNarrative("Un mur de pierre solide bloque le passage.");
    updateCompass();
    drawDungeon();
    return;
  }
  const [dx, dy] = DIRECTIONS[dir];
  playerX += dx; playerY += dy;
  visited[playerY][playerX] = true;
  if (restCooldown > 0) restCooldown--;
  AudioSystem.playFootstep();

  const cell = dungeon[playerY][playerX];
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateUI();

  _updateSearchBtn();

  if (enemyMap[playerY][playerX]) {
    _hideExploreOverlay();
    startBattle(enemyMap[playerY][playerX]);
    return;
  }

  handleCellEntry(cell);
}

// ── Overlay exploration (coffre / escalier / boutique) ──────
function _showExploreOverlay(cell) {
  const overlay = document.getElementById('explore-overlay');
  const icon    = document.getElementById('explore-icon');
  const title   = document.getElementById('explore-title');
  const desc    = document.getElementById('explore-desc');
  const actions = document.getElementById('explore-actions');

  let iconHtml, titleText, descText, btns;

  if (cell === CELL.CHEST) {
    iconHtml  = `<svg viewBox="0 0 110 100" width="120" height="110" xmlns="http://www.w3.org/2000/svg" style="display:block">
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
      <!-- ombre -->
      <ellipse cx="55" cy="94" rx="44" ry="5" fill="#000" opacity="0.55"/>
      <!-- halo magique sortant -->
      <ellipse cx="55" cy="38" rx="38" ry="22" fill="url(#chestGlow)"/>
      <!-- corps du coffre (bas) -->
      <rect x="14" y="46" width="82" height="44" rx="2" fill="url(#chestWoodG)" stroke="#1a0f05" stroke-width="1.5"/>
      <!-- planches verticales (grain de bois) -->
      <line x1="32" y1="48" x2="32" y2="88" stroke="#2a1808" stroke-width="1"/>
      <line x1="55" y1="48" x2="55" y2="88" stroke="#2a1808" stroke-width="1"/>
      <line x1="78" y1="48" x2="78" y2="88" stroke="#2a1808" stroke-width="1"/>
      <!-- veines bois -->
      <path d="M22 56 Q26 64 22 72 M44 54 Q48 68 44 78 M66 54 Q62 70 66 80 M86 56 Q82 66 86 76"
            stroke="#5a3a10" stroke-width="0.6" fill="none" opacity="0.5"/>
      <!-- couvercle bombé -->
      <path d="M14 46 Q55 14 96 46 L96 50 Q55 22 14 50 Z"
            fill="url(#chestLidG)" stroke="#1a0f05" stroke-width="1.5"/>
      <path d="M14 46 Q55 14 96 46" fill="none" stroke="#c9a84c" stroke-width="0.8" opacity="0.7"/>
      <!-- ferrures or -->
      <rect x="14" y="46" width="82" height="3" fill="#c9a84c"/>
      <rect x="14" y="68" width="82" height="2.5" fill="#c9a84c"/>
      <rect x="14" y="86" width="82" height="3" fill="#c9a84c"/>
      <!-- cornières -->
      <rect x="13" y="45" width="5" height="46" fill="#7a5c1e"/>
      <rect x="92" y="45" width="5" height="46" fill="#7a5c1e"/>
      <!-- clous (rivetés, ombre+lumière) -->
      <g>
        <circle cx="16" cy="51" r="1.5" fill="#a89870"/><circle cx="15.6" cy="50.6" r="0.7" fill="#fff" opacity="0.6"/>
        <circle cx="94" cy="51" r="1.5" fill="#a89870"/><circle cx="93.6" cy="50.6" r="0.7" fill="#fff" opacity="0.6"/>
        <circle cx="16" cy="71" r="1.5" fill="#a89870"/><circle cx="15.6" cy="70.6" r="0.7" fill="#fff" opacity="0.6"/>
        <circle cx="94" cy="71" r="1.5" fill="#a89870"/><circle cx="93.6" cy="70.6" r="0.7" fill="#fff" opacity="0.6"/>
        <circle cx="16" cy="88" r="1.5" fill="#a89870"/><circle cx="15.6" cy="87.6" r="0.7" fill="#fff" opacity="0.6"/>
        <circle cx="94" cy="88" r="1.5" fill="#a89870"/><circle cx="93.6" cy="87.6" r="0.7" fill="#fff" opacity="0.6"/>
      </g>
      <!-- serrure centrale ornée -->
      <rect x="46" y="56" width="18" height="20" rx="2" fill="#c9a84c" stroke="#5a3a08" stroke-width="0.8"/>
      <rect x="48" y="58" width="14" height="16" rx="1" fill="#7a5c1e" opacity="0.4"/>
      <circle cx="55" cy="64" r="2.2" fill="#1a0f05"/>
      <rect x="54" y="65" width="2" height="7" fill="#1a0f05"/>
      <!-- éclat magique central -->
      <g opacity="0.95">
        <path d="M55 30 L58 38 L66 41 L58 44 L55 52 L52 44 L44 41 L52 38 Z" fill="#fff" opacity="0.85"/>
        <circle cx="55" cy="41" r="2.2" fill="#fff"/>
      </g>
      <!-- petites étincelles dispersées (scintillement SMIL léger) -->
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
    </svg>`;
    titleText = 'Coffre Magique';
    descText  = 'Un vieux coffre verrouillé trône contre le mur de pierre. Qui sait ce qu\'il contient ?';
    btns = `<button class="explore-btn" onclick="openChest();_hideExploreOverlay()">Ouvrir le coffre</button>
            <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Ignorer</button>`;
  } else if (cell === CELL.SHOP) {
    iconHtml  = `<svg viewBox="0 0 130 110" width="140" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
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
      <!-- ombre -->
      <ellipse cx="65" cy="104" rx="58" ry="5" fill="#000" opacity="0.55"/>
      <!-- enseigne suspendue -->
      <line x1="65" y1="6" x2="65" y2="14" stroke="#7a5c1e" stroke-width="1.5"/>
      <rect x="38" y="14" width="54" height="16" rx="2" fill="#3a2410" stroke="#c9a84c" stroke-width="1.2"/>
      <rect x="40" y="16" width="50" height="12" rx="1" fill="#1a0f05" opacity="0.4"/>
      <text x="65" y="25" text-anchor="middle" font-family="Cinzel, serif" font-size="9" font-weight="bold" fill="#c9a84c" letter-spacing="1">ÉCHOPPE</text>
      <!-- chaînes -->
      <circle cx="44" cy="14" r="1.3" fill="#7a5c1e"/>
      <circle cx="86" cy="14" r="1.3" fill="#7a5c1e"/>
      <!-- toit / auvent rayé bicolore -->
      <polygon points="14,42 116,42 102,30 28,30" fill="url(#shopAwning1)" stroke="#2a1408" stroke-width="1"/>
      <polygon points="22,38 108,38 102,30 28,30" fill="url(#shopAwning2)" opacity="0.45"/>
      <line x1="35" y1="32" x2="22" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
      <line x1="50" y1="32" x2="42" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
      <line x1="65" y1="32" x2="65" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
      <line x1="80" y1="32" x2="88" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
      <line x1="95" y1="32" x2="108" y2="42" stroke="#1a0f05" stroke-width="0.8" opacity="0.7"/>
      <!-- frange dentelée -->
      <path d="M14 42 L20 48 L26 42 L32 48 L38 42 L44 48 L50 42 L56 48 L62 42 L68 48 L74 42 L80 48 L86 42 L92 48 L98 42 L104 48 L110 42 L116 42 Z"
            fill="url(#shopAwning1)" stroke="#2a1408" stroke-width="0.8"/>
      <!-- comptoir / étal -->
      <rect x="18" y="48" width="94" height="48" fill="url(#shopCounter)" stroke="#1a0f05" stroke-width="1"/>
      <rect x="18" y="48" width="94" height="6" fill="#7a5018"/>
      <line x1="18" y1="74" x2="112" y2="74" stroke="#1a0f05" stroke-width="0.8"/>
      <!-- veines bois sur le comptoir -->
      <path d="M30 56 L30 72 M50 56 L50 72 M76 56 L76 72 M96 56 L96 72"
            stroke="#3a2410" stroke-width="0.5" opacity="0.6"/>
      <!-- objets sur l'étal -->
      <!-- fiole verte -->
      <g transform="translate(30 56)">
        <rect x="-3" y="0" width="6" height="3" fill="#7a5c1e"/>
        <path d="M-4 3 L-4 12 Q-4 15 0 15 Q4 15 4 12 L4 3 Z" fill="#4aa86a" opacity="0.9" stroke="#1a0f05" stroke-width="0.5"/>
        <ellipse cx="-2" cy="7" rx="0.8" ry="2.5" fill="#fff" opacity="0.5"/>
      </g>
      <!-- fiole bleue -->
      <g transform="translate(46 56)">
        <rect x="-3" y="0" width="6" height="3" fill="#7a5c1e"/>
        <path d="M-4 3 L-4 12 Q-4 15 0 15 Q4 15 4 12 L4 3 Z" fill="#4080d8" opacity="0.9" stroke="#1a0f05" stroke-width="0.5"/>
        <ellipse cx="-2" cy="7" rx="0.8" ry="2.5" fill="#fff" opacity="0.5"/>
      </g>
      <!-- parchemin roulé -->
      <g transform="translate(64 60)">
        <ellipse cx="0" cy="0" rx="9" ry="3" fill="#d4c08a"/>
        <ellipse cx="0" cy="0" rx="2" ry="3" fill="#a89870"/>
        <ellipse cx="0" cy="-1" rx="9" ry="2" fill="#e8d4a0"/>
        <line x1="-7" y1="-1" x2="7" y2="-1" stroke="#7a5c1e" stroke-width="0.4" opacity="0.6"/>
      </g>
      <!-- baguette -->
      <g transform="translate(88 58) rotate(-15)">
        <rect x="-1" y="-8" width="2" height="16" fill="#3a2410"/>
        <rect x="-1.5" y="6" width="3" height="3" fill="#5a3a14"/>
        <circle cx="0" cy="-8" r="1.5" fill="#c9a84c"/>
        <circle cx="0" cy="-8" r="0.6" fill="#fff8d8"/>
      </g>
      <!-- pièces empilées -->
      <g transform="translate(34 86)">
        <ellipse cx="0" cy="3" rx="6" ry="1.5" fill="#7a5c1e"/>
        <ellipse cx="0" cy="0" rx="6" ry="1.5" fill="#c9a84c"/>
        <ellipse cx="0" cy="-3" rx="6" ry="1.5" fill="#e8c860"/>
        <ellipse cx="0" cy="-3" rx="3" ry="0.6" fill="#fff8d8" opacity="0.7"/>
      </g>
      <!-- livre -->
      <g transform="translate(60 82)">
        <rect x="-8" y="0" width="16" height="10" fill="#5a1818" stroke="#2a0808" stroke-width="0.8"/>
        <rect x="-8" y="0" width="16" height="2" fill="#7a2828"/>
        <rect x="-1" y="2" width="2" height="6" fill="#c9a84c"/>
        <line x1="-6" y1="6" x2="6" y2="6" stroke="#c9a84c" stroke-width="0.4" opacity="0.6"/>
      </g>
      <!-- cristal facetté violet -->
      <g transform="translate(86 82)">
        <polygon points="0,-7 5,-2 4,5 -4,5 -5,-2" fill="#8a4ac8" opacity="0.9" stroke="#3a1858" stroke-width="0.5"/>
        <polygon points="0,-7 5,-2 0,0 -5,-2" fill="#a86ad8" opacity="0.75"/>
        <polygon points="-5,-2 0,0 -4,5" fill="#5a1c8a" opacity="0.55"/>
        <polygon points="0,-7 0,0 -2,-4" fill="#fff" opacity="0.4"/>
      </g>
      <!-- étincelles magiques -->
      <circle cx="22" cy="22" r="0.9" fill="#fff" opacity="0.85"/>
      <circle cx="108" cy="20" r="1.1" fill="#c9a84c" opacity="0.85"/>
      <circle cx="14" cy="36" r="0.7" fill="#fff" opacity="0.65"/>
      <circle cx="116" cy="38" r="0.8" fill="#fff" opacity="0.65"/>
    </svg>`;
    titleText = 'Échoppe Ambulante';
    descText  = 'Une aile de la bibliothèque transformée en échoppe de fortune. Des articles magiques sont disponibles.';
    btns = `<button class="explore-btn" onclick="openShop();_hideExploreOverlay()">Entrer dans la boutique</button>
            <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Passer son chemin</button>`;
  } else if (cell === CELL.STAIRS_D) {
    iconHtml  = `<svg viewBox="0 0 100 110" width="110" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
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
      <!-- encadrement -->
      <polygon points="6,108 94,108 72,12 28,12" fill="#2a2010" stroke="#c9a84c" stroke-width="1.2"/>
      <!-- voile sombre haut -->
      <rect x="6" y="12" width="88" height="40" fill="url(#stairDFog)"/>
      <!-- marches descendantes -->
      <g>
        <!-- marche 1 (avant) -->
        <polygon points="10,104 90,104 80,90 20,90" fill="url(#stoneTopD)"/>
        <rect x="20" y="90" width="60" height="6" fill="#2a1e10"/>
        <!-- marche 2 -->
        <polygon points="22,86 78,86 71,74 29,74" fill="#7a6a4a"/>
        <rect x="29" y="74" width="42" height="5" fill="#1a1208"/>
        <!-- marche 3 -->
        <polygon points="31,71 69,71 64,61 36,61" fill="#6a5a3a"/>
        <rect x="36" y="61" width="28" height="4" fill="#0e0904"/>
        <!-- marche 4 -->
        <polygon points="38,58 62,58 58,50 42,50" fill="#4a3a22"/>
        <rect x="42" y="50" width="16" height="3" fill="#0a0604"/>
        <!-- trou noir profond -->
        <ellipse cx="50" cy="38" rx="14" ry="15" fill="url(#holeD)"/>
        <ellipse cx="50" cy="38" rx="9" ry="10" fill="#000"/>
      </g>
      <!-- highlights bord avant -->
      <line x1="10" y1="104" x2="90" y2="104" stroke="#c9a84c" stroke-width="1" opacity="0.7"/>
      <line x1="22" y1="86" x2="78" y2="86" stroke="#c9a84c" stroke-width="0.8" opacity="0.45"/>
      <line x1="31" y1="71" x2="69" y2="71" stroke="#c9a84c" stroke-width="0.6" opacity="0.3"/>
      <!-- joints de pierre sur les murs latéraux -->
      <line x1="14" y1="80" x2="22" y2="80" stroke="#1a1208" stroke-width="0.8"/>
      <line x1="78" y1="80" x2="86" y2="80" stroke="#1a1208" stroke-width="0.8"/>
      <line x1="20" y1="60" x2="26" y2="60" stroke="#1a1208" stroke-width="0.6"/>
      <line x1="74" y1="60" x2="80" y2="60" stroke="#1a1208" stroke-width="0.6"/>
      <!-- flèche dorée subtile -->
      <path d="M50 26 L50 44 M44 38 L50 46 L56 38" stroke="#c9a84c" stroke-width="2.2"
            fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    </svg>`;
    titleText = 'Escalier Descendant';
    descText  = 'Un escalier en colimaçon disparaît dans les profondeurs. Le danger augmente en descendant.';
    btns = `<button class="explore-btn" onclick="_hideExploreOverlay();goDeeper()">Descendre</button>
            <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Rester ici</button>`;
  } else if (cell === CELL.STAIRS_U) {
    iconHtml  = `<svg viewBox="0 0 100 110" width="110" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
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
      <!-- lumière chaude au sommet -->
      <ellipse cx="50" cy="20" rx="40" ry="18" fill="url(#stairULight)"/>
      <!-- arche en haut -->
      <path d="M30 18 L30 36 L70 36 L70 18 Q70 4 50 4 Q30 4 30 18 Z"
            fill="#2a2010" stroke="#c9a84c" stroke-width="1"/>
      <path d="M36 22 L36 36 L64 36 L64 22 Q64 12 50 12 Q36 12 36 22 Z" fill="#0a0604"/>
      <!-- clé d'arche -->
      <polygon points="46,4 54,4 56,12 44,12" fill="#a89870" stroke="#3a2e1c" stroke-width="0.5"/>
      <circle cx="50" cy="8" r="1" fill="#fff8d8" opacity="0.7"/>
      <!-- briques visibles dans l'arche -->
      <line x1="38" y1="22" x2="44" y2="22" stroke="#3a2e1c" stroke-width="0.6"/>
      <line x1="56" y1="22" x2="62" y2="22" stroke="#3a2e1c" stroke-width="0.6"/>
      <line x1="36" y1="30" x2="42" y2="30" stroke="#3a2e1c" stroke-width="0.6"/>
      <line x1="58" y1="30" x2="64" y2="30" stroke="#3a2e1c" stroke-width="0.6"/>
      <!-- marches montantes -->
      <g>
        <!-- marche 4 (haut, étroite) -->
        <polygon points="38,36 62,36 58,44 42,44" fill="url(#stairUStone)"/>
        <rect x="38" y="36" width="24" height="2" fill="#f0d080" opacity="0.6"/>
        <!-- marche 3 -->
        <polygon points="34,44 66,44 62,54 38,54" fill="#8a7a5a"/>
        <rect x="38" y="44" width="24" height="2" fill="#c9a84c" opacity="0.5"/>
        <line x1="46" y1="46" x2="46" y2="54" stroke="#1a1208" stroke-width="0.5"/>
        <line x1="54" y1="46" x2="54" y2="54" stroke="#1a1208" stroke-width="0.5"/>
        <!-- marche 2 -->
        <polygon points="28,54 72,54 68,68 32,68" fill="#9a8a6a"/>
        <rect x="34" y="54" width="32" height="3" fill="#c9a84c" opacity="0.45"/>
        <line x1="44" y1="57" x2="44" y2="68" stroke="#1a1208" stroke-width="0.6"/>
        <line x1="56" y1="57" x2="56" y2="68" stroke="#1a1208" stroke-width="0.6"/>
        <!-- marche 1 (bas, plus large) -->
        <polygon points="18,68 82,68 76,86 24,86" fill="url(#stairUStone)"/>
        <rect x="28" y="68" width="44" height="4" fill="#c9a84c" opacity="0.5"/>
        <line x1="40" y1="72" x2="40" y2="86" stroke="#1a1208" stroke-width="0.7"/>
        <line x1="52" y1="72" x2="52" y2="86" stroke="#1a1208" stroke-width="0.7"/>
        <line x1="64" y1="72" x2="64" y2="86" stroke="#1a1208" stroke-width="0.7"/>
        <!-- sol -->
        <polygon points="10,86 90,86 86,108 14,108" fill="#3a2e1c"/>
        <line x1="14" y1="96" x2="86" y2="96" stroke="#1a1208" stroke-width="0.7" opacity="0.6"/>
      </g>
      <!-- flèche dorée subtile -->
      <path d="M50 80 L50 64 M44 70 L50 62 L56 70" stroke="#c9a84c" stroke-width="2.2"
            fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    </svg>`;
    titleText = 'Escalier Montant';
    descText  = 'Un escalier de pierre remonte vers les étages supérieurs, moins dangereux.';
    btns = `<button class="explore-btn" onclick="_hideExploreOverlay();goUp()">Remonter</button>
            <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Rester ici</button>`;
  } else if (cell === CELL.FOUNTAIN) {
    const dried = usedFountains && usedFountains.has(`${playerX},${playerY}`);
    iconHtml = `<svg viewBox="0 0 120 130" width="130" height="140" xmlns="http://www.w3.org/2000/svg" style="display:block">
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
      <!-- ombre -->
      <ellipse cx="60" cy="124" rx="52" ry="5" fill="#000" opacity="0.55"/>
      <!-- halo bleu -->
      <ellipse cx="60" cy="56" rx="56" ry="38" fill="url(#fntGlow)" opacity="${dried ? 0.25 : 1}"/>
      <!-- socle bas -->
      <ellipse cx="60" cy="116" rx="50" ry="10" fill="url(#fntStoneBase)" stroke="#1a1208" stroke-width="1.2"/>
      <!-- bassin -->
      <ellipse cx="60" cy="92"  rx="50" ry="14" fill="url(#fntStoneTop)" stroke="#1a1208" stroke-width="1.2"/>
      <!-- gravures cabochons or sur le bassin -->
      <circle cx="22" cy="93" r="2.2" fill="#c9a84c"/>
      <circle cx="60" cy="100" r="2.2" fill="#c9a84c"/>
      <circle cx="98" cy="93" r="2.2" fill="#c9a84c"/>
      <!-- eau -->
      <ellipse cx="60" cy="86"  rx="44" ry="9"  fill="${dried ? '#3a2e1c' : 'url(#fntWater)'}"/>
      <ellipse cx="60" cy="84"  rx="36" ry="5"  fill="${dried ? '#1a1208' : '#cfe6ff'}" opacity="${dried ? 0.4 : 0.6}"/>
      <!-- ondes -->
      ${dried ? '' : `
      <ellipse cx="60" cy="84" rx="20" ry="3"  fill="none" stroke="#fff" stroke-width="0.6" opacity="0.55"/>
      <ellipse cx="60" cy="86" rx="30" ry="4"  fill="none" stroke="#fff" stroke-width="0.4" opacity="0.35"/>`}
      <!-- pied central -->
      <rect x="54" y="50" width="12" height="36" fill="url(#fntStoneBase)" stroke="#1a1208" stroke-width="0.8"/>
      <rect x="50" y="48" width="20" height="4" fill="url(#fntStoneTop)" stroke="#1a1208" stroke-width="0.8"/>
      <!-- statue de chouette stylisée au sommet -->
      <ellipse cx="60" cy="36" rx="11" ry="13" fill="url(#fntStoneTop)" stroke="#1a1208" stroke-width="0.8"/>
      <circle  cx="60" cy="22" r="9"  fill="url(#fntStoneTop)" stroke="#1a1208" stroke-width="0.8"/>
      <circle cx="56" cy="22" r="2" fill="#0d0705"/>
      <circle cx="64" cy="22" r="2" fill="#0d0705"/>
      <circle cx="56" cy="22" r="0.6" fill="${dried ? '#5a4a32' : '#cfe6ff'}"/>
      <circle cx="64" cy="22" r="0.6" fill="${dried ? '#5a4a32' : '#cfe6ff'}"/>
      <polygon points="60,26 58,30 62,30" fill="#c9a84c"/>
      <!-- ailes -->
      <path d="M50 32 Q42 38 48 44 M70 32 Q78 38 72 44"
            stroke="#1a1208" stroke-width="1" fill="none"/>
      <!-- jet d'eau (caché si tarie) -->
      ${dried ? '' : `
      <path d="M60 34 Q56 50 60 60" stroke="#cfe6ff" stroke-width="2" fill="none" opacity="0.85">
        <animate attributeName="opacity" values="0.55;0.95;0.55" dur="2.4s" repeatCount="indefinite"/>
      </path>
      <path d="M60 34 Q64 50 60 60" stroke="#cfe6ff" stroke-width="2" fill="none" opacity="0.85"/>
      <!-- gouttes / éclaboussures -->
      <circle cx="48" cy="78" r="1.2" fill="#cfe6ff" opacity="0.85">
        <animate attributeName="cy" values="78;72;78" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="72" cy="78" r="1.2" fill="#cfe6ff" opacity="0.85">
        <animate attributeName="cy" values="78;73;78" dur="2.6s" repeatCount="indefinite"/>
      </circle>
      <circle cx="60" cy="74" r="1" fill="#fff" opacity="0.95"/>`}
      <!-- moisissure / mousse au pied -->
      <path d="M14 110 Q24 106 32 110 M88 110 Q98 106 106 110"
            stroke="#3a5e2a" stroke-width="1.4" fill="none" opacity="0.6"/>
    </svg>`;
    titleText = 'Fontaine de Pierre';
    descText  = dried
      ? "L'eau de la fontaine s'est tarie. Vous devrez quitter cet étage et revenir plus tard pour qu'elle se remplisse à nouveau."
      : "Une vasque sculptée laisse s'écouler une eau bleutée luminescente. Boire ici restaurera entièrement la santé et la magie du groupe.";
    btns = dried
      ? `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
      : `<button class="explore-btn" onclick="useFountain();_hideExploreOverlay()">Boire à la fontaine</button>
         <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`;
  } else return;

  icon.innerHTML      = iconHtml;
  title.textContent   = titleText;
  desc.textContent    = descText;
  actions.innerHTML   = btns;
  overlay.style.display = 'flex';
}

function _hideExploreOverlay() {
  document.getElementById('explore-overlay').style.display = 'none';
}

// ── Transition d'étage ───────────────────────────────────────
function _floorTransition(level, locationName, callback) {
  const overlay = document.getElementById('floor-transition');
  document.getElementById('ft-level').textContent = `Niveau ${level}`;
  document.getElementById('ft-name').textContent  = locationName;
  overlay.classList.add('active');
  setTimeout(() => {
    if (callback) callback();
    setTimeout(() => overlay.classList.remove('active'), 600);
  }, 1400);
}

function handleCellEntry(cell) {
  const btn = document.getElementById('btn-interact');
  btn.style.display = 'none';
  _hideExploreOverlay();
  updateRoomStatus();

  if (cell === CELL.STAIRS_D || cell === CELL.STAIRS_U ||
      cell === CELL.SHOP     || cell === CELL.CHEST    ||
      cell === CELL.FOUNTAIN) {
    _showExploreOverlay(cell);
  } else {
    if (Math.random() < 0.15) {
      if (Math.random() < 0.08) {
        setNarrative(NARRATIVES.trap);
        const alive  = party.filter(c => c.hp > 0);
        const target = alive[Math.floor(Math.random() * alive.length)];
        const dmg    = Math.ceil(Math.random() * 5 + 2);
        target.hp    = Math.max(0, target.hp - dmg);
        addMsg(`Piège ! ${target.name} perd ${dmg} PV`, 'bad');
        updateUI();
        if (party.every(c => c.hp <= 0)) triggerDeath("Un piège sournois a vaincu le groupe...");
      }
    } else {
      setNarrative(NARRATIVES.floor[Math.floor(Math.random() * NARRATIVES.floor.length)]);
    }
  }
}

// ── Sauvegarde / restauration d'un étage dans le cache ──────
function _saveFloorToCache(floor) {
  floorDungeons[floor] = {
    dungeon:      JSON.parse(JSON.stringify(dungeon)),
    visited:      JSON.parse(JSON.stringify(visited)),
    enemyMap:     JSON.parse(JSON.stringify(enemyMap)),
    itemMap:      JSON.parse(JSON.stringify(itemMap)),
    px: playerX, py: playerY, dir: playerDir,
    searchedCells: Array.from(searchedCells)
    // Note : on n'archive PAS usedFountains : la fontaine se ré-active
    // à la prochaine visite (cf. règle d'usage 1×/visite).
  };
}

function _restoreFloorFromCache(floor) {
  const c = floorDungeons[floor];
  if (!c) return false;
  dungeon  = c.dungeon;
  visited  = c.visited;
  enemyMap = c.enemyMap;
  itemMap  = c.itemMap;
  playerX  = c.px; playerY = c.py; playerDir = c.dir;
  searchedCells = new Set(c.searchedCells || []);
  // Nouvelle visite = nouvelle eau dans la fontaine
  usedFountains = new Set();
  return true;
}

function goDeeper() {
  _saveFloorToCache(currentFloor);
  currentFloor++;

  const locName = LOCATIONS[Math.min(currentFloor - 1, LOCATIONS.length - 1)];

  _floorTransition(currentFloor, locName, () => {
    if (!_restoreFloorFromCache(currentFloor)) {
      searchedCells = new Set();
      generateDungeon(currentFloor);
    }
    restCooldown = 0;
    updateLocationDisplay();
    document.getElementById('btn-interact').style.display = 'none';
    _updateSearchBtn();
    renderMinimap();
    drawDungeon();
    updateCompass();
    addMsg(`Niveau ${currentFloor} atteint !`, 'good');
    AudioSystem.playAmbientMusic(currentFloor);
    if (typeof autoSave === 'function') autoSave('floor-down');
  });
  setNarrative(`Le groupe descend au niveau ${currentFloor} des donjons de Poudlard...`);
}

function goUp() {
  if (currentFloor <= 1) return;
  _saveFloorToCache(currentFloor);
  currentFloor--;

  const locName = LOCATIONS[Math.min(currentFloor - 1, LOCATIONS.length - 1)];

  _floorTransition(currentFloor, locName, () => {
    if (!_restoreFloorFromCache(currentFloor)) {
      searchedCells = new Set();
      generateDungeon(currentFloor);
    }
    restCooldown = 0;
    updateLocationDisplay();
    document.getElementById('btn-interact').style.display = 'none';
    _updateSearchBtn();
    renderMinimap();
    drawDungeon();
    updateCompass();
    AudioSystem.playAmbientMusic(currentFloor);
    if (typeof autoSave === 'function') autoSave('floor-up');
  });
  setNarrative(`Le groupe remonte au niveau ${currentFloor}...`);
}

function openChest() {
  dungeon[playerY][playerX] = CELL.FLOOR;
  document.getElementById('btn-interact').style.display = 'none';
  AudioSystem.playChestOpen();

  // Livres de sorts disponibles selon l'étage courant
  const booksAvailable = ITEMS.filter(i => {
    if (i.type !== 'spellbook') return false;
    if (i.id === 'livre_sortileges') return currentFloor >= 2;
    if (i.id === 'livre_soin')       return currentFloor >= 3;
    if (i.id === 'book_monsters')    return currentFloor >= 3;
    if (i.id === 'livre_prince')     return currentFloor >= 6; // rare et puissant
    return false;
  });

  const roll = Math.random();
  // 38% or | 30% consommable | 22% équipement | 10% livre (si dispo)
  const hasBook = booksAvailable.length > 0;

  if (roll < 0.38) {
    // Or
    const gold = Math.floor(Math.random() * 30 + 10) * currentFloor;
    player.gold += gold;
    setNarrative(NARRATIVES.gold_found(gold));
    addMsg(`+${gold} Gallions`, 'good');
    updateUI();

  } else if (roll < 0.68) {
    // Consommable
    const possItems = ITEMS.filter(i => i.type === 'consumable');
    const item = possItems[Math.floor(Math.random() * possItems.length)];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${item.icon} ${item.name}`, 'good');
    }

  } else if (roll < 0.90 || !hasBook) {
    // Équipement (wand / armor / acc)
    const gear = ITEMS.filter(i => ['wand','armor','acc'].includes(i.type));
    const item  = gear[Math.floor(Math.random() * gear.length)];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${item.icon} ${item.name}`, 'good');
    }

  } else {
    // Livre de sorts — drop rare et précieux
    const item = booksAvailable[Math.floor(Math.random() * booksAvailable.length)];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(`Un vieux grimoire poussiéreux est là, dans le coffre : ${item.name} !`);
      addMsg(`📚 Grimoire trouvé : ${item.name} !`, 'magic');
    }
  }

  renderMinimap();
}

// ── Mise à jour visuelle du bouton Fouiller ──────────────────
function _updateSearchBtn() {
  const btn = document.getElementById('btn-search');
  if (!btn) return;
  const key = `${playerX},${playerY}`;
  const already = searchedCells.has(key);
  btn.classList.toggle('searched', already);
  btn.title = already ? 'Case déjà fouillée' : 'Fouiller la pièce';
  if (typeof updateRoomStatus === 'function') updateRoomStatus();
}

function searchRoom() {
  if (inBattle) return;

  const key = `${playerX},${playerY}`;
  if (searchedCells.has(key)) {
    setNarrative("Vous avez déjà fouillé cet endroit. Il ne reste rien ici.");
    addMsg("Déjà fouillé.", '');
    return;
  }
  searchedCells.add(key);
  _updateSearchBtn();

  const roll = Math.random();
  if (roll < 0.2) {
    const gold = Math.floor(Math.random() * 15 + 5);
    player.gold += gold;
    setNarrative(NARRATIVES.gold_found(gold));
    addMsg(`+${gold} Gallions`, 'good');
    updateUI();
  } else if (roll < 0.35) {
    const item = ITEMS.find(i => i.id === 'mandragore') || ITEMS[0];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Trouvé : ${item.name}`, 'good');
    }
  } else {
    setNarrative(NARRATIVES.nothing);
    addMsg("Rien trouvé.", '');
  }
}

// ── Fontaine de pierre — soin total 1×/visite d'étage ──────
function useFountain() {
  if (inBattle) return;
  if (dungeon[playerY][playerX] !== CELL.FOUNTAIN) return;
  const key = `${playerX},${playerY}`;
  if (usedFountains.has(key)) {
    addMsg("La fontaine est tarie : revenez sur cet étage plus tard.", 'bad');
    return;
  }
  party.forEach(c => {
    if (c.hp <= 0) return;
    c.hp = c.hpMax;
    c.sp = c.spMax;
  });
  usedFountains.add(key);
  setNarrative("L'eau bleutée scintille. Le groupe boit longuement — la fatigue s'évanouit, la magie se ravive entièrement.");
  addMsg("Fontaine bue : PV et PM entièrement restaurés.", 'good');
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
  updateUI();
  if (typeof autoSave === 'function') autoSave('fountain-used');
}

function rest() {
  if (inBattle) return;
  if (restCooldown > 0) {
    setNarrative(`Le groupe est encore agité. Encore ${restCooldown} déplacement${restCooldown > 1 ? 's' : ''} avant de pouvoir se reposer.`);
    addMsg(`Repos impossible (${restCooldown} pas restants)`, 'bad');
    return;
  }
  if (Math.random() < 0.3) {
    addMsg("Une rencontre vous interrompt !", 'bad');
    const restFloor = Math.max(1, currentFloor - 1);
    const restPool  = MONSTERS.filter(m => m.minFloor <= restFloor);
    const pool      = restPool.length ? restPool : MONSTERS;
    const enemy     = scaleMonster(weightedPick(pool), restFloor);
    startBattle(enemy);
    return;
  }
  party.forEach(c => {
    const healAmt = Math.floor(c.hpMax * 0.3);
    const spAmt   = Math.floor(c.spMax * 0.3);
    c.hp = Math.min(c.hpMax, c.hp + healAmt);
    c.sp = Math.min(c.spMax, c.sp + spAmt);
  });
  restCooldown = 5;
  setNarrative("Le groupe se repose quelques instants. Les forces se restaurent partiellement.");
  addMsg(`Repos : HP et PM restaurés (repos disponible dans 5 pas)`, 'good');
  updateUI();
}
