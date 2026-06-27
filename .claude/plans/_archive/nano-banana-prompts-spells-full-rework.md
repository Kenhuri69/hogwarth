# Planches — régénération complète des images de sorts (icônes + FX)

> Reprise de TOUTES les images de sorts des commits « art dédié » (défaut :
> halo/liseré blanc baké → générées sur fond blanc). **Conservées** (phase 2,
> déjà bonnes) : icônes fulgari, fulgur_catena, glacius, glacius_tempete,
> diffindo_maxima, patronus_maxima, sectumsempra_imperius, verrou_de_sang,
> vulnera_sanentur, ferula_maxima ; FX diffindo_ultima, fulgur_imperium,
> glacius_cataclysme, lumos_solem_ardent, lux_suprema, nox_devorans,
> vulnera_maxima.
>
> **5 planches** : 3 d'icônes (4×3, 128²) + 2 de FX (3×3, 256²).

## RÈGLE ANTI-HALO (impérative)

- **Fond GRIS plat uni `#8C9298`** sur toute la planche — **JAMAIS blanc** (le
  blanc créait le halo au détourage). Aucune ombre/dégradé sur le fond.
- Chaque effet **centré, ~70 % de la case, marge grise ≥ 12 %** : il ne touche
  JAMAIS le bord de sa case ni le voisin, et s'estompe en transparence avant le
  bord.
- Style painterly lumineux, lisible sur fond de combat sombre (cœur brillant).
- **INTERDITS** : fond blanc, cadre, texte, glyphe plat, cerne noir, pixel art,
  UI, ombre rectangulaire.

---

## PLANCHE I1 — icônes Feu / Glace / Foudre (4×3, 12)

ids row-major : `coeur_de_lion, fiendfyre, flamme_devorante, incendio_majeur, incendio_royal, givre_rowena, glacius_profond, glacius_cataclysme, fulgur_imperium, diffindo_ultima, lumos_solem, lumos_solem_ardent`

> 4×3 grid of painterly magic spell icons, flat uniform mid-gray background
> (#8C9298), one luminous effect per cell centered ~70% with clear gray margin,
> fading to transparency before the edge. No white background, no frame, no flat
> symbol, no pixel art. Cells L-to-R, top-to-bottom:
> 1. A roaring lion's head wreathed in golden-red fire (Gryffindor, rally).
> 2. Living cursed fire — sinuous orange-red flame tendrils, sentient blaze.
> 3. A devouring vortex of orange flame.
> 4. A large amplified fireball, swirling orange-gold core.
> 5. A crown of golden flames (royal fire of Godric).
> 6. A blue-and-silver frost snowflake/star, icy crystalline (Rowena).
> 7. A deep-blue frost burst with hard ice crystals, cold glow.
> 8. A massive cyan ice cataclysm burst, shards exploding.
> 9. An electric storm sphere, blue-white lightning bolts.
> 10. Crossed silver-white slashing blades, razor gleam.
> 11. A bright golden sun-flare disc (solar light).
> 12. A concentrated vertical lance of brilliant golden sunfire.

## PLANCHE I2 — icônes Lumière / Ténèbres / Mental (4×3, 12)

ids : `lux_aeterna, lux_suprema, revelio, legilimens, verbe_de_rowena, nox_devorans, nox_vorax, savoir_interdit, le_mot_du_dormeur, sanguini_vorace, echo_fantome, protego_diabolica`

> 4×3 grid, same rules (flat #8C9298 gray bg, centered ~70%, gray margin, no
> white bg, luminous painterly). Cells:
> 1. A radiant eternal halo of golden-white light rays.
> 2. A blazing white-gold light mandala/sunburst.
> 3. A magnifying-glass of revealing light, soft golden glow (reveal).
> 4. A luminous mystic eye ringed with violet light (mind-reading).
> 5. A blue-and-gold runic choir of light, Ravenclaw arcane glow.
> 6. A swirling dark-violet void ringed with luminous magenta veins.
> 7. A dark sphere devouring purple energy, bright violet rim.
> 8. A sinister tome of forbidden knowledge leaking dark-purple smoke + green glow.
> 9. A drowsy dark-indigo rune/sigil with soft sleepy purple haze.
> 10. Corrupted crimson vampiric energy, dark-red swirl with bright red glow.
> 11. A ghostly translucent astral echo wisp, pale spectral blue.
> 12. A cursed shield sigil, dark with a violet-red reflective barrier glow.

## PLANCHE I3 — icônes Nature / Soin / Temps / Utilitaire (4×3, 12)

ids : `morsure_emeraude, venin_du_cachot, recolte_magique, pacte_du_serpent, soin_blaireau, serment_du_blaireau, vulnera_maxima, fardeau_partage, tempus_echo, reliquae_temporis, teleportation, cheminette_inter_mondes`

> 4×3 grid, same rules. Cells:
> 1. An emerald-green venomous fang/bite burst, toxic green glow.
> 2. A dripping poison-green cloud/serpent venom, sickly glow.
> 3. A golden harvest of magical wheat sheaves, warm amber glow.
> 4. A coiled emerald serpent with a dark-green pact aura (Slytherin).
> 5. A warm golden glowing heart of healing light (Hufflepuff badger).
> 6. A golden vow/oath emblem with phoenix-gold revival glow.
> 7. A radiant rose-pink and gold healing bloom of light.
> 8. A balanced golden link/yoke sharing two glowing orbs (shared burden).
> 9. A golden hourglass haloed by a blue-white time mandala.
> 10. A corrupted golden time-relic / shattered hourglass, violet-gold glow.
> 11. A swirling violet teleportation portal vortex.
> 12. A green-and-emerald inter-world floo portal swirl.

---

## PLANCHE F1 — FX splash Feu / Glace / Poison (3×3, 9, 256²)

ids : `coeur_de_lion, incendio_majeur, incendio_royal, givre_rowena, glacius_profond, morsure_emeraude, venin_du_cachot, pacte_du_serpent, sanguini_vorace`

> 3×3 grid of RPG spell-IMPACT VFX bursts (energy splash), flat uniform mid-gray
> background (#8C9298), one burst per cell centered ~75% fading to transparency
> before the edge, NO white background, luminous so it reads on black combat bg.
> Cells:
> 1. A fiery lion-shaped flame eruption, golden-red.
> 2. A ring explosion of orange fire.
> 3. A pillar/crown of royal golden fire.
> 4. A sapphire frost-star burst, icy blue-white.
> 5. A deep frost shard explosion, cold blue.
> 6. An emerald venom splash, toxic green spray.
> 7. A sickly green poison cloud burst.
> 8. An emerald serpent-coil energy burst, dark green + bright rim.
> 9. A crimson vampiric drain swirl, dark red with bright red veins.

## PLANCHE F2 — FX splash Lumière / Ténèbres / Support / Temps (3×3, 9, 256²)

ids : `savoir_interdit, echo_fantome, verbe_de_rowena, soin_blaireau, serment_du_blaireau, fardeau_partage, protego_diabolica, tempus_echo, reliquae_temporis`

> 3×3 grid, same rules (flat #8C9298 gray bg, luminous, transparent fade, no
> white bg). Cells:
> 1. A dark-violet forbidden-knowledge burst with green glow.
> 2. A pale spectral ghost-echo wisp burst, translucent blue.
> 3. A blue-gold runic light choir burst (Ravenclaw).
> 4. A warm golden healing bloom, soft gold sparkles.
> 5. A golden phoenix-revival flare (oath).
> 6. A twin-linked golden energy arc (shared burden).
> 7. A violet-red cursed reflective shield dome burst.
> 8. A golden clock-ring time burst, cyan-gold.
> 9. A shattered time-relic burst, corrupted violet-gold shards.

---

## Intégration (par planche, fond gris → floodfill)

```bash
# Icônes (128²) — ex. I1 :
python3 tools/sheet_extract.py plancheI1.png --cols 4 --rows 3 --side 128 --margin 0.08 \
  --ids coeur_de_lion,fiendfyre,flamme_devorante,incendio_majeur,incendio_royal,givre_rowena,glacius_profond,glacius_cataclysme,fulgur_imperium,diffindo_ultima,lumos_solem,lumos_solem_ardent \
  --out img/icons/spells --qc /tmp/I1_qc.png

# FX (256²) — ex. F1 :
python3 tools/sheet_extract.py plancheF1.png --cols 3 --rows 3 --side 256 --margin 0.05 \
  --ids coeur_de_lion,incendio_majeur,incendio_royal,givre_rowena,glacius_profond,morsure_emeraude,venin_du_cachot,pacte_du_serpent,sanguini_vorace \
  --out img/fx/spells --qc /tmp/F1_qc.png
```

> Vérif après chaque : pas de halo blanc (fond gris bien retiré), sujet net,
> centré. Chemins inchangés → bump CACHE_VERSION en fin de série (visibilité
> immédiate). `node tests/smoke.js spell` + `pwa-smoke`.
