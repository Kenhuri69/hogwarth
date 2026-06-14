// ============================================================
// HERO BARKS — la voix des héros (ÉTAPE 2, ch05 §5.4)
// ------------------------------------------------------------
// Surcouche purement COSMÉTIQUE : de courtes répliques jouées sur des
// événements rares (apparition de boss, crit décisif, allié à terre,
// level-up, palier de Maison, transition de tranche). Aucun levier
// mécanique — ce module n'altère jamais la logique de combat/quête.
//
// Deux surfaces :
//   • HERO_BARKS         — données pures (registre par héros × événement).
//   • pickHeroBark(...)  — résolveur PUR (testé dans tests/units.js).
//   • heroBark(...)      — orchestrateur défensif (call-sites du jeu) :
//                          garde `barksEnabled`, anti-spam, anti-répétition,
//                          puis affiche via UX.logCombat (combat) / addMsg.
//
// Chargé après data.js, avant battle.js (cf. index.html). Inerte tant
// qu'aucun call-site ne le consomme. Au MANIFEST loader (obj, optional).
// ============================================================

// Registre des répliques. Clés d'événement reconnues :
//   bossAppear · crit · allyDown · levelUp · houseTier · tierTransition · darkLoop
// `darkLoop` (V2, ch.11 §11.8.2) : voix au franchissement d'un niveau de Boucle.
// `houseTension` = variantes jouées quand la Maison CANON du héros diffère
// de `chosenHouse` (rejouabilité, ch05 §5.4.3) — indexées par chosenHouse.
const HERO_BARKS = {
  harry: {
    bossAppear: ["Bon. On fait comme d'habitude — on tient, on frappe."],
    crit:       ["Ça, c'était pour rester poli.", "Voilà. On avance."],
    allyDown:   ["Debout ! On n'a pas fini, toi et moi !"],
    levelUp:    ["Encore un cran. On descend plus loin."],
    darkLoop:   ["Encore un tour. Le château se souvient de nous — et il a plus froid à chaque fois."],
    houseTier:  ["Le château reconnaît les siens. Tant mieux — on en aura besoin."],
    tierTransition: ["L'air change. On n'est plus à l'école, là."],
    // Enjeu intime (05 §5.4.2 / §5.2) — sa raison de descendre, au seuil 3↔4.
    descentStake: ["Encore lui, encore en bas. Personne d'autre ne devrait avoir à descendre ici — alors ce sera moi. Comme toujours."],
    houseTension: {
      Serpentard: ["Un raccourci, vraiment ? La dernière fois que j'ai pris un raccourci, j'ai fini face à lui."]
    }
  },
  hermione: {
    bossAppear: ["Trois capacités, deux résistances. J'ai vu pire. Concentre-toi."],
    crit:       ["Mécaniquement imparable."],
    allyDown:   ["Tiens bon — Episkey, tout de suite !"],
    levelUp:    ["Note méthodique : progresser, c'est survivre deux fois."],
    darkLoop:   ["Boucle suivante. Les variables changent à peine ; nous, beaucoup. Restons méthodiques."],
    houseTier:  ["Un palier de plus. J'ai lu ce que ça débloque — c'est précieux."],
    tierTransition: ["Nouvelle strate, nouvelles règles. J'actualise nos hypothèses."],
    // Enjeu intime (05 §5.4.2 / §5.2) — comprendre pour résoudre, au seuil 3↔4.
    descentStake: ["On me dit « une terreur ». Moi, je vois un problème. Et un problème, ça se résout — même en descendant le chercher."]
  },
  draco: {
    bossAppear: ["Ce masque… je l'ai déjà vu à ma table de Noël.", "Ne me déçois pas. J'ai une réputation."],
    crit:       ["Un Malefoy ne rate jamais deux fois."],
    allyDown:   ["Relève-toi. Je refuse de perdre devant ça."],
    levelUp:    ["La fierté, ça se mérite. Et je commence à la mériter."],
    darkLoop:   ["Encore un tour de spirale. Élégant, le désespoir, vu d'assez bas."],
    houseTier:  ["Voilà ce que valent les vrais. Prenez-en de la graine."],
    tierTransition: ["Plus on descend, plus ça sent ma famille. Charmant."],
    // Beat scénarisé (05 §5.4.2) — première rencontre d'un Mangemort.
    firstMangemort: ["Ce masque… je l'ai déjà vu à ma table de Noël."],
    houseTension: {
      Gryffondor: ["Vous croyez les connaître. Moi je les reconnais."]
    }
  },
  cho: {
    bossAppear: ["Je le vois venir avant qu'il bouge. Restons mobiles."],
    crit:       ["Attrapé. Comme un Vif d'Or."],
    allyDown:   ["Tiens encore une seconde — j'arrive !"],
    levelUp:    ["Plus vive, plus haut. On ne me rattrape pas."],
    darkLoop:   ["Un tour de plus, plus profond. Je sens le courant avant de le voir."],
    houseTier:  ["Un cran de plus. Mes réflexes suivent, eux."],
    tierTransition: ["Le terrain s'ouvre autrement. Adaptons notre vol."]
  },
  cedric: {
    bossAppear: ["Un tournoi de plus. On le passe ensemble ou pas du tout."],
    crit:       ["Loyal et franc — jusque dans les coups."],
    allyDown:   ["Personne ne tombe sous ma garde. Tiens bon !"],
    levelUp:    ["On progresse droit. C'est la seule façon que je connaisse."],
    darkLoop:   ["Un tour de plus. On le passe ensemble — c'est toujours la règle, même ici."],
    houseTier:  ["Le mérite paie. On l'a gagné ensemble."],
    tierTransition: ["Plus de salles de classe en dessous. À partir d'ici, on passe l'examen."],
    // Beat scénarisé (05 §5.4.2) — transition 3↔4, on quitte l'école.
    leaveSchool: ["Plus de salles de classe en dessous. À partir d'ici, on ne révise plus : on passe l'examen."],
    houseTension: {
      Poufsouffle: ["Plus de salles de classe en dessous. À partir d'ici, on passe l'examen."]
    }
  },
  celeste: {
    bossAppear: ["Les astres le disaient. Je n'espérais pas avoir raison."],
    crit:       ["La lune a guidé ma main."],
    allyDown:   ["Ne t'éteins pas. La nuit a encore besoin de toi."],
    levelUp:    ["Un palier de plus vers la lumière froide."],
    darkLoop:   ["La spirale tourne encore. Les astres, eux, ne descendent pas si bas."],
    houseTier:  ["Les constellations s'alignent un peu mieux pour nous."],
    tierTransition: ["La voûte s'efface. Plus de plafond — juste le vide et ce qu'il garde."],
    // Beat scénarisé (05 §5.4.2) — devant la première fontaine glacée (ét. 2).
    fountainCold: ["Même l'eau a peur, ici. Elle se souvient d'avant les Fondateurs."],
    // Enjeu intime (05 §5.4.2 / §5.2) — les astres l'ont menée ici, au seuil 3↔4.
    descentStake: ["Les astres m'ont montré ce fond avant que j'y pose le pied. Descendre, ce n'est pas du courage — c'est leur donner raison."]
  },
  iris: {
    bossAppear: ["Oh, le grand méchant ! Quelqu'un a un appareil photo ?"],
    crit:       ["La chance ? Non non. Le talent. (Bon, un peu la chance.)"],
    allyDown:   ["Eh, pas le droit de partir, on n'a pas fini de rire !"],
    levelUp:    ["Plus forte ET plus mignonne, c'est injuste pour les autres."],
    darkLoop:   ["Encore un tour ?! Bon, au moins le décor change. Un peu."],
    houseTier:  ["Ma Maison brille un peu plus fort. Comme moi, quoi."],
    tierTransition: ["Nouveau décor ! J'espère qu'il y a de meilleurs éclairages."],
    // Enjeu intime (05 §5.4.2 / §5.2) — rendre la couleur au château, au seuil 3↔4.
    descentStake: ["Le château vire au gris, tu as remarqué ? Quelqu'un doit descendre lui rendre ses couleurs. Autant que ce soit moi — je suis la mieux assortie."]
  },
  maxence: {
    bossAppear: ["Il a la même odeur que moi. C'est mauvais signe."],
    crit:       ["Le sang ne ment pas."],
    allyDown:   ["…Reste. Je n'ai pas envie d'être seul ici."],
    levelUp:    ["Plus fort. Donc plus dangereux. Pour eux."],
    darkLoop:   ["Encore plus bas. Mon sang aime ça, et ça m'inquiète."],
    houseTier:  ["Le pouvoir s'accumule. Reste à savoir qui le tient."],
    tierTransition: ["Plus bas. Mon sang le sent avant moi."],
    // Enjeu intime (05 §5.4.2 / §5.2) — tenir son sang en laisse, au seuil 3↔4.
    descentStake: ["Mon sang m'appelle vers le bas. Je préfère y descendre en le tenant en laisse plutôt qu'il m'y traîne."],
    // Beat scénarisé (05 §5.4.2) — avant Voldemort, Pacte des Cachots défié.
    preVoldemortDefiance: ["Je connaissais ta voix, Salazar. Je ne lui ai juste pas obéi."],
    houseTension: {
      Gryffondor: ["Le courage… c'est plus simple quand on n'a rien à cacher dans le sang."]
    }
  },
  anastasia: {
    bossAppear: ["J'ai lu sa fiche. Maintenant je la corrige en duel."],
    crit:       ["La Bannière est plantée. C'est mathématique."],
    allyDown:   ["Tiens — j'ai calculé qu'on s'en sortait. Ne me contredis pas."],
    levelUp:    ["Un cran de plus. La descente m'apprend plus que n'importe quel cours."],
    darkLoop:   ["Boucle suivante. J'ajoute une décimale à la peur et je continue."],
    houseTier:  ["Le palier était dans mes calculs. Le mérite, un peu moins."],
    tierTransition: ["Strate suivante. J'ajuste les variables et on continue."],
    // Enjeu intime (05 §5.4.2 / §5.2) — sa logique implacable, au seuil 3↔4.
    descentStake: ["J'ai fait le calcul : si personne ne descend, tout finit par remonter. Donc on descend. C'est arithmétique."],
    // Beat scénarisé (05 §5.4.2) — avant Voldemort, signature Gryffondor faite.
    preVoldemortGryff: ["La Bannière est plantée. Maintenant, il ne peut plus nous faire reculer — c'est mathématique."]
  },
  louis: {
    bossAppear: ["Plus gros qu'un dragon ? On verra ça."],
    crit:       ["Ça brûle, hein ? C'est le principe."],
    allyDown:   ["Garde la flamme allumée, je te couvre !"],
    levelUp:    ["Ma baguette pulse plus fort. Bon présage."],
    darkLoop:   ["On replonge. Tant qu'il reste une braise, on descend."],
    houseTier:  ["La braise monte. Notre Maison aussi."],
    tierTransition: ["Ça chauffe en descendant. J'aime ça."]
  },
  jeanne: {
    bossAppear: ["Oh, il est tout grognon. On va lui chanter quelque chose."],
    crit:       ["Mes sortilèges chantent comme des étoiles, tu trouves pas ?"],
    allyDown:   ["Non non non, relève-toi, on n'a pas fini de jouer !"],
    levelUp:    ["Encore un petit pas — et une étoile de plus."],
    darkLoop:   ["La spirale chante plus grave à chaque tour. J'apprends la mélodie."],
    houseTier:  ["Notre Maison scintille un peu plus ! Joli, non ?"],
    tierTransition: ["Nouvel étage ! Les échos résonnent différemment ici."]
  },
  margaux: {
    bossAppear: ["Oh ! Une grosse bête. J'ai lu un sort pour ça, attends…"],
    crit:       ["Pile poil sur l'étoile filante ! Tu as vu ça ?"],
    allyDown:   ["Bouge pas, je connais un enchantement — ça va aller !"],
    levelUp:    ["Encore une page comprise. Le ciel s'éclaire un peu plus."],
    darkLoop:   ["On retourne en bas ? Les astres y brillent autrement. J'aime bien."],
    houseTier:  ["Serdaigle monte d'un cran ! L'aigle aime ça."],
    tierTransition: ["Nouvel étage — de nouvelles constellations à déchiffrer."]
  },
  agathe: {
    bossAppear: ["Même ici, quelque chose peut pousser. Tenons bon."],
    crit:       ["La vie est tenace. Elle frappe fort quand il le faut."],
    allyDown:   ["Reste avec moi — je te soigne, je te garde."],
    levelUp:    ["On s'enracine plus profond. On tiendra."],
    darkLoop:   ["Un tour de plus sous la pierre. Même ici, on tient racine."],
    houseTier:  ["Notre Maison fleurit, même sous la pierre."],
    tierTransition: ["La terre change de souffle. On s'y adapte, comme toujours."]
  },
  olivier: {
    bossAppear: ["Une cible de plus à foudroyer. Au travail."],
    crit:       ["Chaque sortilège frappe comme la foudre. Celui-là aussi."],
    allyDown:   ["Tiens bon — je nettoie le terrain et je reviens."],
    levelUp:    ["Plus de puissance à canaliser. Tant mieux."],
    darkLoop:   ["Encore un cran vers le fond. La foudre porte loin, même dans le noir."],
    houseTier:  ["Plus de puissance pour la Maison. Je sais quoi en faire."],
    tierTransition: ["Terrain neuf à foudroyer. Restons concentrés."],
    houseTension: {
      Poufsouffle: ["On perd du temps à les ramener. (…) Non. Tu as raison. On les ramène."]
    }
  },
  nathalie: {
    bossAppear: ["Reste derrière moi. Tant que je tiens, tu avances."],
    crit:       ["Patience… et le bon coup au bon moment."],
    allyDown:   ["Pas toi. Tiens bon, je te relève — j'ai vu pire au potager."],
    levelUp:    ["Plus solide. On encaissera ce qui vient."],
    darkLoop:   ["Encore un étage sous la pierre. On tient le mur, comme toujours."],
    houseTier:  ["La Maison s'enracine. On ne lâche personne."],
    tierTransition: ["Sol nouveau, mêmes racines. On tient."]
  },
  chatillon: {
    bossAppear: ["Bruyant. Il ne verra pas venir l'ombre qui l'attend."],
    crit:       ["La ruse frappe là où la lumière n'ose pas."],
    allyDown:   ["Recule dans l'ombre — je couvre, tu récupères."],
    levelUp:    ["Plus de pouvoir. La discrétion n'en sera que plus mortelle."],
    darkLoop:   ["Plus profond, plus sombre. C'est là que je suis le mieux."],
    houseTier:  ["Serpentard remonte la lumière. Ironique, et délicieux."],
    tierTransition: ["L'ombre s'épaissit. Tant mieux."],
    houseTension: {
      Gryffondor:  ["Tout ce courage… et personne pour regarder dans le dos. Heureusement, moi si."]
    }
  }
};

// ── Résolveur PUR ────────────────────────────────────────────
// Retourne une réplique (string) pour (heroKey, event) ou `null` si rien
// n'est défini → call-site silencieux. Préfère la variante `houseTension`
// quand `ctx.canonHouse` (Maison canon du héros) diffère de `ctx.chosenHouse`
// ET qu'une entrée existe pour cette Maison. `ctx.rng` (défaut Math.random)
// rend le tirage déterministe en test.
function pickHeroBark(heroKey, event, ctx) {
  const reg = (typeof HERO_BARKS !== 'undefined') ? HERO_BARKS : null;
  if (!reg) return null;
  const hero = reg[heroKey];
  if (!hero) return null;
  ctx = ctx || {};
  const rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  // 1. Variante de tension (Maison canon ≠ Maison jouée) prioritaire.
  if (ctx.canonHouse && ctx.chosenHouse && ctx.canonHouse !== ctx.chosenHouse &&
      hero.houseTension && Array.isArray(hero.houseTension[ctx.chosenHouse]) &&
      hero.houseTension[ctx.chosenHouse].length) {
    const arr = hero.houseTension[ctx.chosenHouse];
    return arr[Math.floor(rng() * arr.length)];
  }

  // 2. Réplique standard de l'événement.
  const arr = hero[event];
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[Math.floor(rng() * arr.length)];
}

// ── Orchestrateur défensif (call-sites du jeu) ───────────────
// Anti-spam global (1 bark / `_BARK_COOLDOWN_MS`) + anti-répétition des
// événements one-shot (`ctx.once` → clé mémorisée dans `_barkSeen`).
// Affichage : combat → UX.logCombat ; exploration → addMsg.
let _barkCooldownUntil = 0;
const _BARK_COOLDOWN_MS = 2500;

function _heroCanonHouse(heroKey) {
  try {
    const c = (typeof CHARACTERS !== 'undefined') ? CHARACTERS[heroKey] : null;
    if (!c || !c.class) return null;
    // "Élève de Gryffondor" → "Gryffondor"
    const m = c.class.match(/(Gryffondor|Serpentard|Serdaigle|Poufsouffle)/);
    return m ? m[1] : null;
  } catch (_) { return null; }
}

function heroBark(heroKey, event, opts) {
  // Toggle joueur (défaut true) + présence du registre. `barksEnabled` est
  // un `let` global (scope déclaratif, pas sur window) → référence nue.
  if (typeof barksEnabled !== 'undefined' && barksEnabled === false) return null;
  if (typeof HERO_BARKS === 'undefined') return null;
  if (!heroKey) return null;
  opts = opts || {};

  // Anti-répétition des beats rares (one-shot par session).
  let seenKey = null;
  if (opts.once) {
    seenKey = heroKey + ':' + event + ':' + opts.once;
    if (typeof _barkSeen !== 'undefined' && _barkSeen && _barkSeen.has(seenKey)) return null;
  }

  // Anti-spam global (sauf événements one-shot, toujours autorisés).
  const now = (typeof Date !== 'undefined') ? Date.now() : 0;
  if (!opts.once && now < _barkCooldownUntil) return null;

  const text = pickHeroBark(heroKey, event, {
    canonHouse:  _heroCanonHouse(heroKey),
    chosenHouse: (typeof chosenHouse !== 'undefined') ? chosenHouse : null
  });
  if (!text) return null;

  const name = (() => {
    try {
      const c = (typeof CHARACTERS !== 'undefined') ? CHARACTERS[heroKey] : null;
      return (c && c.name) ? c.name.split(' ')[0] : heroKey;
    } catch (_) { return heroKey; }
  })();

  // Mémorise le one-shot et arme le cooldown.
  if (seenKey && typeof _barkSeen !== 'undefined' && _barkSeen) _barkSeen.add(seenKey);
  _barkCooldownUntil = now + _BARK_COOLDOWN_MS;

  // Affichage : combat → journal UX ; exploration → addMsg.
  const html = `💬 <i>${name} : « ${text} »</i>`;
  if (opts.channel === 'explore') {
    if (typeof addMsg === 'function') addMsg(html, 'narrative');
  } else if (typeof window !== 'undefined' && window.UX && typeof UX.logCombat === 'function') {
    UX.logCombat(html, 'info');
  } else if (typeof addMsg === 'function') {
    addMsg(html, 'narrative');
  }

  // Voix parlée optionnelle (L7) — OGG dédié si produit, sinon synthèse FR.
  // Gardée par le toggle « Voix » (voiceEnabled) côté AudioSystem.speakBark.
  try {
    if (typeof AudioSystem !== 'undefined' && AudioSystem.speakBark) {
      AudioSystem.speakBark(text, heroKey + '_' + event);
    }
  } catch (_) { /* no-op */ }

  return text;
}

// Vrai si `heroKey` est présent ET vivant dans le groupe actif.
function _heroInPartyAlive(heroKey) {
  try {
    if (typeof party === 'undefined' || !Array.isArray(party)) return false;
    const n = (typeof partySize === 'number') ? partySize : party.length;
    return party.slice(0, n).some(c => c && c.heroKey === heroKey && c.hp > 0);
  } catch (_) { return false; }
}

// ── Beats de trame scénarisés (L8 — étages-scènes fixes, 05 §5.4.2) ──
// Contrairement à heroBark (où le LOCUTEUR est le héros actif), un beat
// scénarisé est délivré par un héros PRÉCIS et n'a de sens que s'il est dans
// le groupe (Céleste à la fontaine, Drago au 1ᵉʳ Mangemort…). Toujours
// one-shot. No-op silencieux si le héros n'est pas présent/vivant.
function heroBarkScripted(heroKey, event, opts) {
  if (!_heroInPartyAlive(heroKey)) return null;
  opts = Object.assign({ once: 'scripted:' + event, channel: 'explore' }, opts || {});
  return heroBark(heroKey, event, opts);
}

// Expose l'orchestrateur (les call-sites de battle.js/main.js l'appellent
// via le scope global ; on publie aussi sur window pour les gardes `window.`).
if (typeof window !== 'undefined') {
  window.HERO_BARKS       = HERO_BARKS;
  window.pickHeroBark     = pickHeroBark;
  window.heroBark         = heroBark;
  window.heroBarkScripted = heroBarkScripted;
}
