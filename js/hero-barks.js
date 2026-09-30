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
//   bossAppear · bossPhase · crit · allyDown · levelUp · houseTier · tierTransition · darkLoop · loopEcho · darkBoss · darkBossDown
// `bossPhase` (P2, combat-system-synthesis §1.4) : voix one-shot au franchissement
// d'un seuil de phase de boss (capacité `phase` débloquée). Joué par le héros actif.
// `darkLoop` (V2, ch.11 §11.8.2) : voix au franchissement d'un niveau de Boucle.
// `loopEcho` (Phase 3, ch.11 §11.7.3) : voix quand un écho temporel affleure en
// Boucle (movement.js, seenEchoes) — évoque « le Dormeur » (10 §10.3) sans le nommer.
// `darkBoss` (Phase 3, ch.11 §11.9.2) : voix one-shot face à un boss revenu en variante
// Ténébreuse (« Tu m'as déjà tué une fois »). Remplace `bossAppear` pour les
// boss epic à `variant === 'darkness'`. Défensif : héros sans entrée → silence.
// `darkBossDown` (Phase 3, ch.11 §11.9.2) : beat de clôture one-shot quand le
// même boss Ténébreux est À NOUVEAU vaincu (« Et te revoilà à terre »). Joué
// par le héros actif depuis endBattle (battle-rewards.js). Symétrique de darkBoss.
// `houseTension` = variantes jouées quand la Maison CANON du héros diffère
// de `chosenHouse` (rejouabilité, ch05 §5.4.3) — indexées par chosenHouse.
const HERO_BARKS = {
  harry: {
    bossAppear: ["Bon. On fait comme d'habitude — on tient, on frappe."],
    bossPhase:  ["Il change de registre — accroche-toi, ça va frapper plus fort !"],
    crit:       ["Ça, c'était pour rester poli.", "Voilà. On avance."],
    allyDown:   ["Debout ! On n'a pas fini, toi et moi !"],
    levelUp:    ["Encore un cran. On descend plus loin."],
    darkLoop:   ["Encore un tour. Le château se souvient de nous — et il a plus froid à chaque fois.",
                 "On recommence. Je connais le chemin par cœur, maintenant — c'est ça qui me dérange.",
                 "Un tour de plus vers le bas. Tant que je tiens debout, on continue de descendre."],
    loopEcho:   ["Là — un bout de passé qui remonte. Et tout en dessous, quelque chose respire, lentement. Avançons."],
    darkBoss:   ["Je t'ai déjà mis à terre une fois. La Boucle t'a recousu — pas en mieux."],
    darkBossDown: ["Et te revoilà à terre. Recommence autant que tu veux — moi aussi, je reviens."],
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
    bossPhase:  ["Seuil critique franchi — son schéma d'attaque vient de changer. Adapte-toi."],
    crit:       ["Mécaniquement imparable."],
    allyDown:   ["Tiens bon — Episkey, tout de suite !"],
    levelUp:    ["Note méthodique : progresser, c'est survivre deux fois."],
    darkLoop:   ["Boucle suivante. Les variables changent à peine ; nous, beaucoup. Restons méthodiques.",
                 "Itération suivante. Mêmes couloirs, paramètres décalés. Je relève les écarts au fur et à mesure.",
                 "On reboucle. Chaque tour est plus dur — donc on doit être plus précis, pas plus pressés."],
    loopEcho:   ["Un écho du passé — daté, reproductible. Et sous tout ça, un battement régulier. Quelque chose dort, et compte le temps."],
    darkBoss:   ["Donnée connue : je t'ai déjà vaincu. La répétition ne joue pas en ta faveur."],
    darkBossDown: ["Résultat reproduit. Conclusion : la Boucle te ramène, jamais plus fort."],
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
    darkLoop:   ["Encore un tour de spirale. Élégant, le désespoir, vu d'assez bas.",
                 "Encore plus bas. À ce stade, descendre devient presque une affaire de standing.",
                 "La spirale se répète. Au moins, elle a le bon goût de me garder en tête d'affiche."],
    loopEcho:   ["Une scène d'autrefois qui rejoue. Et plus bas, un souffle énorme, endormi. Même ma famille n'a jamais creusé jusque-là."],
    darkBoss:   ["Encore toi ? Je t'ai déjà tué. Recommencer ne te rendra pas plus distingué."],
    darkBossDown: ["Deux fois à terre. À ce stade, ta défaite est presque une tradition — la mienne."],
    houseTier:  ["Voilà ce que valent les vrais. Prenez-en de la graine."],
    tierTransition: ["Plus on descend, plus ça sent ma famille. Charmant."],
    // Enjeu intime (05 §5.4.2 / §5.2) — prouver qu'il vaut mieux que son nom, au seuil 3↔4.
    descentStake: ["On attend d'un Malefoy qu'il regarde les autres descendre. Justement — je préfère qu'on me voie en bas, debout, qu'en haut, à l'abri."],
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
    darkLoop:   ["Un tour de plus, plus profond. Je sens le courant avant de le voir.",
                 "On replonge. L'air descend plus vite que nous — je le rattrape quand même.",
                 "Encore un cran sous terre. Le froid file devant ; moi, je file plus vite."],
    loopEcho:   ["Le passé affleure une seconde. Et dessous, une respiration lente, immense — je la sens monter avant de l'entendre."],
    darkBoss:   ["Je t'ai déjà attrapé une fois. Tu n'es pas devenu plus rapide en mourant."],
    darkBossDown: ["Rattrapé, encore. La mort ne t'a rien appris sur la vitesse."],
    houseTier:  ["Un cran de plus. Mes réflexes suivent, eux."],
    tierTransition: ["Le terrain s'ouvre autrement. Adaptons notre vol."],
    // Enjeu intime (05 §5.4.2 / §5.2) — rattraper ce qui a fui vers le fond, au seuil 3↔4.
    descentStake: ["Quelque chose a filé vers le bas — une réponse, un visage. J'attrape toujours ce qui fuit. Toujours."]
  },
  cedric: {
    bossAppear: ["Un tournoi de plus. On le passe ensemble ou pas du tout."],
    crit:       ["Loyal et franc — jusque dans les coups."],
    allyDown:   ["Personne ne tombe sous ma garde. Tiens bon !"],
    levelUp:    ["On progresse droit. C'est la seule façon que je connaisse."],
    darkLoop:   ["Un tour de plus. On le passe ensemble — c'est toujours la règle, même ici.",
                 "On redescend. Côte à côte, comme au premier tour — rien ne change là-dessus.",
                 "Encore une spirale à franchir. On la prend d'un seul pas, tous les deux."],
    loopEcho:   ["Une image d'avant nous, qui remonte. Et tout au fond, un cœur qui bat sans se presser. On n'est pas seuls à descendre — gardons-nous."],
    darkBoss:   ["On s'est déjà affrontés — et tu es tombé. Rien n'a changé de ce côté-ci."],
    darkBossDown: ["Tombé une seconde fois. Toujours ensemble, toujours debout — c'est la règle."],
    houseTier:  ["Le mérite paie. On l'a gagné ensemble."],
    tierTransition: ["Plus de salles de classe en dessous. À partir d'ici, on passe l'examen."],
    // Beat scénarisé (05 §5.4.2) — transition 3↔4, on quitte l'école.
    leaveSchool: ["Plus de salles de classe en dessous. À partir d'ici, on ne révise plus : on passe l'examen."],
    // Enjeu intime (05 §5.4.2 / §5.2) — une parole donnée, au seuil 3↔4.
    descentStake: ["Un champion ne descend pas pour la gloire — il descend parce qu'il a dit qu'il le ferait. J'ai donné ma parole. On y va."],
    houseTension: {
      Poufsouffle: ["Plus de salles de classe en dessous. À partir d'ici, on passe l'examen."]
    }
  },
  celeste: {
    bossAppear: ["Les astres le disaient. Je n'espérais pas avoir raison."],
    crit:       ["La lune a guidé ma main."],
    allyDown:   ["Ne t'éteins pas. La nuit a encore besoin de toi."],
    levelUp:    ["Un palier de plus vers la lumière froide."],
    darkLoop:   ["La spirale tourne encore. Les astres, eux, ne descendent pas si bas.",
                 "Un tour de plus vers le fond. Ici, la seule lumière, c'est celle qu'on porte.",
                 "On replonge sous les étoiles. Elles me suivent du regard, sans pouvoir me suivre."],
    loopEcho:   ["Un fragment du passé scintille puis s'éteint. Sous lui, un battement plus vieux que toute lumière. Ce qui dort là n'a pas de constellation — il les précède."],
    darkBoss:   ["Les astres t'ont déjà vu chuter une fois. Ils ne se répètent pas pour rien."],
    darkBossDown: ["Ta chute était déjà écrite dans le ciel — deux fois. Les astres ne mentent pas."],
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
    darkLoop:   ["Encore un tour ?! Bon, au moins le décor change. Un peu.",
                 "On recommence ? Sérieux ? Je vais finir par le redécorer moi-même, à ce rythme.",
                 "Re-spirale ! J'avais dit « jolie sortie », pas « visite guidée illimitée », moi."],
    loopEcho:   ["Oh, un souvenir qui rejoue ! …et ce gros « boum-boum » en dessous, c'est qui qui dort ? Faudrait pas le réveiller, hein."],
    darkBoss:   ["Toi ?! Je t'ai DÉJÀ battu. Tu fais le service après-vente ou quoi ?"],
    darkBossDown: ["Et de deux ! Service après-vente terminé. Tu repasses quand, exactement ?"],
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
    darkLoop:   ["Encore plus bas. Mon sang aime ça, et ça m'inquiète.",
                 "On replonge. Plus on descend, plus mon sang se tait — et son silence me glace.",
                 "Un tour de plus vers le fond. Quelque chose en bas appelle mon sang. Je réponds en serrant les dents."],
    loopEcho:   ["Le passé remonte par bouffées. Et dessous, une respiration que mon sang reconnaît. Quelque chose dort là — et ça m'appelle par mon nom."],
    darkBoss:   ["Ton odeur, je la connais — je l'ai déjà éteinte une fois."],
    darkBossDown: ["Ton odeur s'éteint de nouveau. Mon sang, lui, reste calme. Tant mieux."],
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
    darkLoop:   ["Boucle suivante. J'ajoute une décimale à la peur et je continue.",
                 "Itération suivante. La courbe de danger monte ; ma marge d'erreur, elle, descend.",
                 "On reboucle. Je recalcule tout depuis le début — la peur n'a jamais changé un résultat."],
    loopEcho:   ["Écho temporel : période constante. Le battement, plus bas, a la même. Ce qui dort là tient le tempo — j'en prends note, et je continue."],
    darkBoss:   ["Récidive enregistrée. Issue identique : tu retombes. C'est statistique."],
    darkBossDown: ["Récidive close. Issue identique, comme calculé. C'est arithmétique."],
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
    darkLoop:   ["On replonge. Tant qu'il reste une braise, on descend.",
                 "Encore un cran vers le fond. Le froid mord plus fort — je chauffe d'autant plus.",
                 "Un tour de plus sous la pierre. Ma flamme baisse, mais elle ne s'éteint pas. Avançons."],
    loopEcho:   ["Une braise du passé qui rougeoie encore. Et dessous, un souffle lent qui pourrait tout rallumer. Ce qui dort là, mieux vaut ne pas l'attiser."],
    darkBoss:   ["Je t'ai déjà réduit en cendres. La Boucle a juste rallumé la mèche."],
    darkBossDown: ["En cendres, encore. Rallume la mèche si tu veux — j'ai des braises à revendre."],
    houseTier:  ["La braise monte. Notre Maison aussi."],
    tierTransition: ["Ça chauffe en descendant. J'aime ça."],
    // Enjeu intime (05 §5.4.2 / §5.2) — éteindre le dragon avant qu'il ne remonte, au seuil 3↔4.
    descentStake: ["Un dragon qu'on n'affronte pas finit par tout brûler. Je descends éteindre celui-là avant qu'il ne remonte."]
  },
  jeanne: {
    bossAppear: ["Oh, il est tout grognon. On va lui chanter quelque chose."],
    crit:       ["Mes sortilèges chantent comme des étoiles, tu trouves pas ?"],
    allyDown:   ["Non non non, relève-toi, on n'a pas fini de jouer !"],
    levelUp:    ["Encore un petit pas — et une étoile de plus."],
    darkLoop:   ["La spirale chante plus grave à chaque tour. J'apprends la mélodie.",
                 "On redescend. La gamme glisse vers les basses — je la suis note à note.",
                 "Encore un tour de spirale. Le silence d'en bas a son propre rythme ; je me mets en mesure."],
    loopEcho:   ["Tu entends ? Un air d'avant, qui rejoue. Et tout en bas, une basse lente — quelque chose dort en mesure. Je ne voudrais pas être la fausse note qui le réveille."],
    darkBoss:   ["On t'a déjà chanté ton requiem une fois. Tu veux le bis ?"],
    darkBossDown: ["Bis chanté ! Ton requiem connaît la mélodie par cœur, maintenant."],
    houseTier:  ["Notre Maison scintille un peu plus ! Joli, non ?"],
    tierTransition: ["Nouvel étage ! Les échos résonnent différemment ici."],
    // Enjeu intime (05 §5.4.2 / §5.2) — rendre sa voix au château, au seuil 3↔4.
    descentStake: ["En bas, plus personne ne chante. Alors je descends — quelqu'un doit rendre sa voix au château, et j'ai la plus jolie."]
  },
  margaux: {
    bossAppear: ["Oh ! Une grosse bête. J'ai lu un sort pour ça, attends…"],
    crit:       ["Pile poil sur l'étoile filante ! Tu as vu ça ?"],
    allyDown:   ["Bouge pas, je connais un enchantement — ça va aller !"],
    levelUp:    ["Encore une page comprise. Le ciel s'éclaire un peu plus."],
    darkLoop:   ["On retourne en bas ? Les astres y brillent autrement. J'aime bien.",
                 "On replonge ! Chaque tour, c'est un nouveau chapitre — un peu plus sombre, mais tant pis.",
                 "Encore un étage sous les autres ? Le ciel d'ici est écrit tout petit. Je plisse les yeux et je lis."],
    loopEcho:   ["Une page d'autrefois qui se rouvre toute seule ! Et dessous… un battement, comme un livre énorme qui respire en dormant. Je n'ose pas tourner cette page-là."],
    darkBoss:   ["Attends… je t'ai déjà vaincu, toi ! Le ciel n'oublie pas une page lue."],
    darkBossDown: ["Re-vaincu ! Le ciel n'oublie pas une page — et moi non plus."],
    houseTier:  ["Serdaigle monte d'un cran ! L'aigle aime ça."],
    tierTransition: ["Nouvel étage — de nouvelles constellations à déchiffrer."],
    // Enjeu intime (05 §5.4.2 / §5.2) — lire la dernière page avant qu'elle ne s'efface, au seuil 3↔4.
    descentStake: ["Mon grimoire s'assombrit page après page à mesure qu'on descend. Je veux lire la dernière avant qu'elle ne s'efface."]
  },
  agathe: {
    bossAppear: ["Même ici, quelque chose peut pousser. Tenons bon."],
    crit:       ["La vie est tenace. Elle frappe fort quand il le faut."],
    allyDown:   ["Reste avec moi — je te soigne, je te garde."],
    levelUp:    ["On s'enracine plus profond. On tiendra."],
    darkLoop:   ["Un tour de plus sous la pierre. Même ici, on tient racine.",
                 "On redescend. Le sol est plus froid à chaque tour — mes racines s'enfoncent juste plus loin.",
                 "Encore une spirale vers le fond. Rien ne pousse ici, alors c'est nous qui prenons racine."],
    loopEcho:   ["Le passé affleure comme une pousse entre les dalles. Et plus bas, une respiration de bête endormie. Quelque chose dort sous la terre — ne piétinons pas son sommeil."],
    darkBoss:   ["Je t'ai déjà couché en terre une fois. Tu repousses bien mal."],
    darkBossDown: ["Recouché en terre. Repousse si tu veux : je sais désherber."],
    houseTier:  ["Notre Maison fleurit, même sous la pierre."],
    tierTransition: ["La terre change de souffle. On s'y adapte, comme toujours."],
    // Enjeu intime (05 §5.4.2 / §5.2) — semer la vie là où elle manque le plus, au seuil 3↔4.
    descentStake: ["Rien ne pousse là où je vais — c'est bien pour ça qu'il faut y descendre. Là où la vie manque le plus, c'est là qu'on la sème."]
  },
  olivier: {
    bossAppear: ["Une cible de plus à foudroyer. Au travail."],
    crit:       ["Chaque sortilège frappe comme la foudre. Celui-là aussi."],
    allyDown:   ["Tiens bon — je nettoie le terrain et je reviens."],
    levelUp:    ["Plus de puissance à canaliser. Tant mieux."],
    darkLoop:   ["Encore un cran vers le fond. La foudre porte loin, même dans le noir.",
                 "On replonge. Plus c'est noir, plus mes éclairs se voient — autant en profiter.",
                 "Un tour de plus sous terre. L'orage me suit ; il n'a jamais eu peur du fond."],
    loopEcho:   ["Un éclair de passé, puis plus rien. Et dessous, une décharge lente, sourde — un cœur qui dort et qui couve l'orage. On ne le réveille pas, celui-là."],
    darkBoss:   ["Déjà foudroyé une fois. La seconde sera plus rapide."],
    darkBossDown: ["Foudroyé, deuxième prise. Plus rapide, comme promis."],
    houseTier:  ["Plus de puissance pour la Maison. Je sais quoi en faire."],
    tierTransition: ["Terrain neuf à foudroyer. Restons concentrés."],
    // Enjeu intime (05 §5.4.2 / §5.2) — l'orage tombe là où l'air est le plus lourd, au seuil 3↔4.
    descentStake: ["L'orage ne choisit pas où il tombe : il tombe là où l'air est le plus lourd. En bas, donc. Je descends avec lui."],
    houseTension: {
      Poufsouffle: ["On perd du temps à les ramener. (…) Non. Tu as raison. On les ramène."]
    }
  },
  nathalie: {
    bossAppear: ["Reste derrière moi. Tant que je tiens, tu avances."],
    crit:       ["Patience… et le bon coup au bon moment."],
    allyDown:   ["Pas toi. Tiens bon, je te relève — j'ai vu pire au potager."],
    levelUp:    ["Plus solide. On encaissera ce qui vient."],
    darkLoop:   ["Encore un étage sous la pierre. On tient le mur, comme toujours.",
                 "On redescend. Mêmes coups, mur plus épais — j'ai eu le temps de l'apprendre.",
                 "Un tour de plus vers le bas. Je passe devant ; tant que je tiens, tu avances."],
    loopEcho:   ["Un morceau d'autrefois remonte du sol. Et dessous, une respiration lente, patiente. Quelque chose dort là depuis toujours — on passe devant, sans le déranger."],
    darkBoss:   ["Je t'ai déjà arrêté net une fois. Reviens autant que tu veux — le mur tient."],
    darkBossDown: ["Arrêté net, encore. Le mur tient. Il tiendra autant de fois qu'il faudra."],
    houseTier:  ["La Maison s'enracine. On ne lâche personne."],
    tierTransition: ["Sol nouveau, mêmes racines. On tient."],
    // Enjeu intime (05 §5.4.2 / §5.2) — ne pas laisser les siens descendre seuls, au seuil 3↔4.
    descentStake: ["On ne laisse pas les siens descendre seuls dans le froid. Je passe devant — c'est tout ce que je sais faire, et je le fais bien."]
  },
  chatillon: {
    bossAppear: ["Bruyant. Il ne verra pas venir l'ombre qui l'attend."],
    crit:       ["La ruse frappe là où la lumière n'ose pas."],
    allyDown:   ["Recule dans l'ombre — je couvre, tu récupères."],
    levelUp:    ["Plus de pouvoir. La discrétion n'en sera que plus mortelle."],
    darkLoop:   ["Plus profond, plus sombre. C'est là que je suis le mieux.",
                 "On replonge dans le noir. Chaque tour, l'ombre me connaît un peu mieux.",
                 "Encore un cran vers le fond. Ici, la lumière ment ; moi, je m'y retrouve."],
    loopEcho:   ["Une ombre du passé se redresse une seconde. Et tout au fond, une respiration que même moi je n'irais pas troubler. Ce qui dort là vaut mieux qu'on le laisse dormir."],
    darkBoss:   ["Je t'ai déjà fait tomber dans l'ombre une fois. Tu n'en étais jamais ressorti — jusqu'ici."],
    darkBossDown: ["Retombé dans l'ombre. Cette fois, fais-moi plaisir : n'en ressors pas."],
    houseTier:  ["Serpentard remonte la lumière. Ironique, et délicieux."],
    tierTransition: ["L'ombre s'épaissit. Tant mieux."],
    // Enjeu intime (05 §5.4.2 / §5.2) — l'ombre le sert là où la lumière renonce, au seuil 3↔4.
    descentStake: ["La lumière renonce toujours la première, en bas. Moi, l'ombre m'y suit — autant descendre là où elle me sert."],
    houseTension: {
      Gryffondor:  ["Tout ce courage… et personne pour regarder dans le dos. Heureusement, moi si."]
    }
  }
};

// ── Dénouement des arcs de héros (Lot A, revue 2026-09 — axe 1c) ──────
// Une phrase par héros, dite sur le palier de la victoire (endgame.js,
// _victorySpeechVariants). Elle referme l'arc léger du héros (05 §5.1/§5.2)
// sans branche ni fin alternative : texte posé sur la même cinématique.
const HERO_VICTORY_PAYOFF = {
  harry:     "Je suis descendu devant, comme toujours. Mais pour la première fois, je n'ai pas refusé qu'on me tende la main.",
  hermione:  "Je n'ai pas tout compris, là-dessous. Et pour une fois… ça ne m'a pas empêchée de réussir.",
  draco:     "Ils ont prononcé mon nom, en bas. Je n'ai pas répondu. C'est tout ce que j'avais à prouver.",
  cho:       "J'ai eu peur à chaque marche. Je suis descendue quand même. Je crois que c'est ça, garder les yeux ouverts.",
  cedric:    "Je n'ai pas été un exemple, en bas. J'ai été un camarade. Je crois que c'est mieux.",
  celeste:   "Les astres l'avaient écrit. Mais c'est nous qui avons descendu les marches.",
  iris:      "Vous voyez ? Les couleurs reviennent. Je vous avais dit qu'on pouvait en rire.",
  maxence:   "Le sang m'a appelé à chaque étage. Je n'ai répondu qu'à ce que j'avais choisi.",
  anastasia: "Aucun de mes plans n'a tenu. Et pourtant, on est là. Je devrais peut-être m'y habituer.",
  louis:     "Il y avait des feux, en bas, que personne ne dompte. J'ai appris à tenir le mien.",
  jeanne:    "J'ai vu des choses que je n'oublierai pas. Mais regardez : l'escalier vient encore de changer de sens !",
  margaux:   "Je n'ai pas tout noté. J'avais les mains prises — il fallait bien aider.",
  agathe:    "Il a fallu arracher avant de faire pousser. Maintenant, ça peut repousser.",
  olivier:   "Chaque sortilège avait enfin une raison. C'est la première fois que je me bats pour quelqu'un.",
  nathalie:  "J'ai dû frapper la première. Mais personne n'est tombé derrière moi.",
  chatillon: "Tout le monde m'a vu, en bas. Étrangement, je n'ai rien perdu."
};

// ── Répliques de paire (Lot A, revue 2026-09 — axe 2a) ─────────────────
// Clé = les deux heroKey triés, joints par « | ». Par événement, puis par
// LOCUTEUR : ce que ce héros dit quand l'AUTRE est son partenaire de duo.
// Prioritaires sur la réplique générique (cf. heroBark). `victory` = échange
// du palier de fin (une chaîne par héros, lue par endgame.js).
const HERO_PAIR_BARKS = {
  'harry|hermione': {
    allyDown:       { harry:    ["Hermione ! Ne me fais pas ça — pas toi !"],
                      hermione: ["Harry ! Tu fonces toujours sans regarder… Relève-toi, je te couvre !"] },
    tierTransition: { harry:    ["Comme au bon vieux temps, hein ? Toi qui réfléchis, moi qui fonce."],
                      hermione: ["J'ai lu tout ce qu'on sait de cette partie du château. C'est-à-dire presque rien. Reste près de moi."] },
    bossAppear:     { harry:    ["Tu as un plan ? … Oui, bien sûr que tu as un plan."],
                      hermione: ["Harry, cette fois, tu attends mon signal. S'il te plaît."] },
    victory:        { harry:    "Tu te rends compte ? On l'a encore fait.",
                      hermione: "Oui. Et cette fois, tu ne l'as pas fait seul." }
  },
  'draco|harry': {
    allyDown:       { draco: ["Potter ! Tu ne vas pas me laisser finir ça seul, quand même ?"],
                      harry: ["Malefoy ! Accroche-toi. Je ne te laisse pas ici."] },
    tierTransition: { draco: ["Si on m'avait dit que je descendrais ici avec toi, Potter…"],
                      harry: ["Tu aurais pu rester en haut, Malefoy. Pourquoi tu ne l'as pas fait ?"] },
    bossAppear:     { draco: ["Ne le prends pas mal, Potter, mais je frappe le premier."],
                      harry: ["Malefoy, sur la gauche. Pour une fois, fais-moi confiance."] },
    victory:        { draco: "Ne va pas t'imaginer qu'on est amis, Potter.",
                      harry: "Je n'imagine rien. Mais tu es resté." }
  },
  'cedric|cho': {
    allyDown:       { cedric: ["Cho ! Reste avec moi, tu m'entends ? Reste avec moi !"],
                      cho:    ["Cedric ! Non, non, non — pas toi. Relève-toi !"] },
    tierTransition: { cedric: ["On descend ensemble, Cho. Personne ne remonte seul."],
                      cho:    ["Chaque étage me rappelle le labyrinthe. Reste là où je peux te voir."] },
    bossAppear:     { cedric: ["Je le tiens de face — toi, sois plus rapide que lui."],
                      cho:    ["Je le vois venir. Cedric, à ta droite !"] },
    victory:        { cedric: "On remonte ensemble. Comme promis.",
                      cho:    "Je ne t'ai pas quitté des yeux une seule fois." }
  },
  'draco|hermione': {
    allyDown:       { draco:    ["Granger ! Relève-toi — j'ai besoin de quelqu'un qui sait ce qu'il fait."],
                      hermione: ["Malefoy ! Ne bouge pas, je m'en occupe. Et ne dis rien."] },
    tierTransition: { draco:    ["Granger, tu as sûrement lu quelque chose sur cet endroit. Pour une fois, je t'écoute."],
                      hermione: ["On ne s'apprécie pas, Malefoy. Mais en bas, ça n'a aucune importance."] },
    victory:        { draco:    "Tu avais raison sur presque tout, Granger. Ne le répète pas.",
                      hermione: "Je n'en aurai pas besoin. Tout le monde t'a vu." }
  },
  'iris|louis': {
    allyDown:       { iris:  ["Louis ! Allez, lève-toi — qui va me faire rire avec ses brûlures, sinon ?"],
                      louis: ["Iris ! Tiens bon, je fais barrage. Personne ne te touche !"] },
    tierTransition: { iris:  ["Plus on descend, plus tout devient gris. Heureusement que tes étincelles mettent de la couleur."],
                      louis: ["Il fait froid en bas. Reste près de ma baguette, elle chauffe."] },
    victory:        { iris:  "Tu as vu ? Tout est redevenu en couleurs.",
                      louis: "Et rien n'a brûlé. Enfin… presque rien." }
  },
  'celeste|margaux': {
    allyDown:       { celeste: ["Margaux ! Non… Les étoiles ne l'avaient pas écrit. Relève-toi."],
                      margaux: ["Céleste ! Tu disais que tu avais tout vu venir ! Réveille-toi !"] },
    tierTransition: { celeste: ["Regarde bien, Margaux. Ici, le ciel est sous nos pieds."],
                      margaux: ["Céleste, tu crois que les constellations continuent sous la terre ? Je note, au cas où."] },
    victory:        { celeste: "Tu vois, Margaux ? Les astres avaient raison.",
                      margaux: "Oui. Mais c'est nous qui avons fait tout le chemin !" }
  },
  'chatillon|maxence': {
    allyDown:       { maxence:   ["Châtillon ! Ne t'avise pas de disparaître pour de bon."],
                      chatillon: ["Ravenwood ! Garde ta soif pour eux, et relève-toi."] },
    tierTransition: { maxence:   ["Tu sens ça, Châtillon ? L'obscurité nous reconnaît."],
                      chatillon: ["Tiens ta soif, Ravenwood. Moi, je tiens l'ombre. Ce sera suffisant."] },
    bossAppear:     { maxence:   ["Je le prends de face. Occupe-toi de ce qu'il ne verra pas."],
                      chatillon: ["Occupe-le, Ravenwood. Je frappe là où il ne regarde pas."] },
    victory:        { maxence:   "Deux Serpentard du bon côté. Personne ne va nous croire.",
                      chatillon: "Tant mieux. Personne n'a besoin de le savoir." }
  },
  'anastasia|jeanne': {
    allyDown:       { anastasia: ["Jeanne ! Reste avec moi — on suit le plan, d'accord ? Il y a toujours un plan."],
                      jeanne:    ["Anastasia ! Tu disais que tu avais tout prévu ! Relève-toi !"] },
    tierTransition: { anastasia: ["Jeanne, reste derrière moi. J'ai compté chaque marche."],
                      jeanne:    ["Anastasia, et si on improvisait ? Juste un peu ?"] },
    victory:        { anastasia: "Rien ne s'est passé comme prévu.",
                      jeanne:    "C'était bien mieux comme ça !" }
  },
  'agathe|nathalie': {
    allyDown:       { agathe:   ["Nathalie ! Tu as tenu le mur pour tout le monde — laisse-moi te tenir, toi."],
                      nathalie: ["Agathe ! Personne ne te touche tant que je suis debout. Relève-toi."] },
    tierTransition: { agathe:   ["Même ici, il y a de la mousse entre les pierres. Rien n'est jamais tout à fait mort."],
                      nathalie: ["Plus bas, la terre est plus froide. On plantera quand même."] },
    victory:        { agathe:   "On a fait pousser quelque chose, là-dessous.",
                      nathalie: "Et personne n'est tombé derrière nous." }
  },
  'chatillon|olivier': {
    allyDown:       { olivier:   ["Châtillon ! Tu ne vas pas me laisser finir ça seul ? Debout !"],
                      chatillon: ["De Clairval ! Ta belle technique ne sert à rien si tu restes à terre."] },
    tierTransition: { olivier:   ["Deux Olivier pour une descente. Essaie de suivre, Châtillon."],
                      chatillon: ["Frappe fort, de Clairval. Je m'occupe de ce que tu ne vois pas."] },
    bossAppear:     { olivier:   ["Je l'attaque de front, proprement."],
                      chatillon: ["Va de front. Je passe derrière."] },
    victory:        { olivier:   "Belle manœuvre, Châtillon. Je ne l'ai même pas vue venir.",
                      chatillon: "C'est tout l'intérêt, de Clairval." }
  }
};

// Résolveur PUR (testé dans tests/units.js) : réplique de `speaker` pour
// `event` quand `partner` est son partenaire de duo, ou null. Accepte une
// chaîne ou un tableau (tirage via `rng`, défaut Math.random).
function pickPairBark(speaker, partner, event, rng) {
  if (!speaker || !partner || speaker === partner) return null;
  const key = [speaker, partner].sort().join('|');
  const pair = (typeof HERO_PAIR_BARKS !== 'undefined') ? HERO_PAIR_BARKS[key] : null;
  const byEvent = pair && pair[event];
  const v = byEvent && byEvent[speaker];
  if (typeof v === 'string') return v || null;
  if (!Array.isArray(v) || !v.length) return null;
  const r = (typeof rng === 'function') ? rng : Math.random;
  return v[Math.floor(r() * v.length)];
}

// Partenaire de duo de `heroKey` dans le groupe actif (même KO), ou null.
function _heroPartnerKey(heroKey) {
  try {
    const keys = (typeof activeParty === 'function' ? activeParty() : [])
      .map(c => c && c.heroKey).filter(Boolean);
    return keys.find(k => k !== heroKey) || null;
  } catch (_) { return null; }
}

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

  // Réplique de paire (Lot A) prioritaire quand le partenaire de duo en a une ;
  // sinon réplique du héros seul (houseTension puis standard).
  const text = pickPairBark(heroKey, _heroPartnerKey(heroKey), event)
    || pickHeroBark(heroKey, event, {
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
    return activeParty().some(c => c && c.heroKey === heroKey && c.hp > 0);
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
  window.HERO_PAIR_BARKS  = HERO_PAIR_BARKS;
  window.pickPairBark     = pickPairBark;
}
