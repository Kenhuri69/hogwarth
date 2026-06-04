#!/usr/bin/env python3
"""Génère les voix PNJ via edge-tts — alternative gratuite à ElevenLabs.

edge-tts utilise les voix neurales de Microsoft Azure exposées par le
service « Read Aloud » d'Edge : gratuit, illimité, sans clé API ni compte.

Pré-requis :
    pip install edge-tts

Usage :
    python3 tools/gen_voice_edge.py                 # tout (4 chefs + sorts)
    python3 tools/gen_voice_edge.py mcgonagall      # un seul PNJ
    python3 tools/gen_voice_edge.py rogue flitwick  # plusieurs
    python3 tools/gen_voice_edge.py hermione        # les 13 incantations

Sortie : audio/voice/_raw/<key>.mp3

Conversion en OGG (format attendu par le jeu) — voir tools/encode_voice.sh :
    ffmpeg -i _raw/<key>.mp3 -ac 1 -ar 22050 -c:a libvorbis -q:a 3 <key>.ogg

Réseau : le endpoint edge-tts est `speech.platform.bing.com`. Il doit être
joignable. Dans un environnement à allowlist réseau, ce domaine doit être
explicitement autorisé (sinon le proxy renvoie « Host not in allowlist »).
"""
import asyncio
import os
import ssl
import sys

try:
    import edge_tts
    import edge_tts.communicate as _ec
    import edge_tts.voices as _ev
except ImportError:
    sys.exit("edge-tts manquant — installer avec : pip install edge-tts")

# Certains environnements interposent un proxy MITM avec un certificat
# auto-signé. edge-tts construit son contexte SSL avec le bundle `certifi`,
# qui ignore ce certificat. On le remplace par un contexte basé sur le
# bundle CA système — qui, lui, contient le certificat du proxy — de sorte
# que la vérification TLS reste active et passe à travers le proxy.
_SYS_CA = "/etc/ssl/certs/ca-certificates.crt"
if os.path.exists(_SYS_CA):
    _ctx = ssl.create_default_context(cafile=_SYS_CA)
    _ec._SSL_CTX = _ctx
    _ev._SSL_CTX = _ctx

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "audio", "voice", "_raw")

# Voix / rate / pitch par chef de Maison. edge-tts n'offre pas de voice
# design custom ; on approche le timbre des personnages via le choix de
# voix FR + ajustements rate/pitch.
VOICES = {
    # McGonagall : féminine posée, autoritaire. Voix multilingue —
    # lit le français nativement avec un timbre distinct des voix fr-FR.
    "mcgonagall": dict(voice="de-DE-SeraphinaMultilingualNeural", rate="-7%", pitch="+0Hz"),
    # Rogue : masculin grave, lent, presque chuchoté. Voix multilingue
    # au timbre sombre — lit le français nativement.
    "rogue": dict(voice="de-DE-FlorianMultilingualNeural", rate="-12%", pitch="-8Hz"),
    # Flitwick : registre aigu, vif. Voix multilingue jeune/légère
    # pitchée modérément — moins d'artefacts que l'ancien Henri +32 Hz.
    "flitwick": dict(voice="en-US-AndrewMultilingualNeural", rate="+10%", pitch="+24Hz"),
    # Chourave : féminine chaleureuse, ronde, médium.
    "sprout": dict(voice="fr-FR-VivienneMultilingualNeural", rate="-3%", pitch="+0Hz"),
    # Hermione : féminine jeune, claire — incantations des sortilèges.
    "hermione": dict(voice="fr-FR-EloiseNeural", rate="-4%", pitch="+0Hz"),
    # Tour guidé d'aide aux novices — narré par McGonagall. Voix FR
    # native (féminine posée, autoritaire) : le tutoriel s'adresse à des
    # débutants, la narration doit être en français sans accent étranger.
    "mcgonagall_help": dict(voice="fr-FR-DeniseNeural", rate="-7%", pitch="+0Hz"),
}

# Textes — copie exacte de npcs.js (dialogues.greeting + dialoguesByQuest).
LINES = {
    "mcgonagall": [
        ("mcgonagall_greeting_1",
         "Un Gardien du Portail s'est éveillé dans les passages secrets. "
         "Il bloque l'accès à des connaissances précieuses."),
        ("mcgonagall_greeting_2",
         "Soyez prudent : ce gardien est de pierre vivante, ses coups "
         "peuvent rompre un os. Préparez vos contre-sorts. Êtes-vous prêt "
         "à l'affronter ?"),
        ("mcgonagall_offer_1",
         "Une Chimère rôde dans les profondeurs. Trois de ces bêtes — pas "
         "une de moins — et vous aurez gagné le Cœur du Lion. M'accordez-vous "
         "ce service ?"),
        ("mcgonagall_active_1",
         "Les Chimères tiennent-elles encore tête à un lion ?"),
        ("mcgonagall_ready_1",
         "Trois Chimères abattues. Le Cœur du Lion vous revient — repassez "
         "le réclamer, comme il sied à un héritier de Godric."),
        # Quête golem_passage (2e quête de McGonagall) — clés dédiées pour
        # éviter le décalage texte/voix avec la quête de Set.
        ("mcgonagall_golem_offer_1",
         "Neutralisez le Gardien du Portail. Je vous récompenserai à la "
         "hauteur du danger."),
        ("mcgonagall_golem_active_1",
         "Le Gardien est-il vaincu ?"),
        ("mcgonagall_golem_ready_1",
         "Excellent travail. Voici votre récompense, bien méritée."),
        # idle — une clé par réplique de dialogues.idleRandom (npcs.js).
        # Ordre et texte = copie exacte ; la voix jouée suit l'index tiré.
        ("mcgonagall_idle_1",
         "Cinquante points pour le courage. Et cinquante de moins si "
         "vous claquez encore cette porte."),
        ("mcgonagall_idle_2",
         "L'ordre doit être maintenu, même dans ces souterrains."),
        ("mcgonagall_idle_3",
         "Vous avez prouvé votre valeur. Gryffondor peut être fier."),
        ("mcgonagall_idle_4",
         "Le courage n'est pas l'absence de peur, mais le choix de la "
         "regarder en face. Notez-le."),
        ("mcgonagall_idle_5",
         "J'ai vu des élèves que j'avais grondés le matin tomber au "
         "combat le soir même. Je gronde quand même : c'est ma façon de "
         "les garder en vie."),
        ("mcgonagall_idle_6",
         "Ce château, je l'ai défendu pierre par pierre. Certaines "
         "portent encore des noms que je préférerais oublier."),
        ("mcgonagall_idle_7",
         "On me croit de pierre. C'est faux. Je me suis seulement "
         "entraînée, très longtemps, à ne pas pleurer devant vous."),
        ("mcgonagall_done_1",
         "Vous avez prouvé votre valeur. Gryffondor peut être fier."),
        # ── Don récurrent à la Maison (gold-sink endgame) ──
        ("mcgonagall_donation_intro",
         "Vous êtes parvenu au cœur de notre Maison, Potter. Si la fortune "
         "vous sourit, sachez que Gryffondor accueille les contributions de "
         "ses fils et filles les plus fidèles."),
        ("mcgonagall_donation_offer",
         "Que comptez-vous offrir à Gryffondor aujourd'hui ?"),
        ("mcgonagall_donation_small",
         "Merci. Chaque galion compte pour les générations à venir."),
        ("mcgonagall_donation_large",
         "Voilà une générosité digne du Lion. Gryffondor n'oublie pas ce "
         "que vous faites pour elle aujourd'hui."),
        ("mcgonagall_donation_refuse",
         "Revenez quand vos poches seront plus garnies, Potter. Inutile "
         "d'humilier votre Maison."),
        # ── Série Apothéose ★ N (post-tier 18) ──
        ("mcgonagall_apotheose_star_first",
         "Vous voilà au-delà de tout ce que je pensais voir. Première étoile "
         "de l'Apothéose, Potter. Le Lion vous reconnaît parmi les siens."),
        ("mcgonagall_apotheose_star",
         "Une étoile de plus à votre constellation. Continuez, Potter."),
        ("mcgonagall_apotheose_star_milestone",
         "Dix étoiles. Vous franchissez un seuil que peu pourront même "
         "apercevoir. Gryffondor s'incline."),
    ],
    "rogue": [
        ("rogue_greeting_1",
         "Tiens, tiens... un élève de ma maison qui ose s'aventurer ici."),
        ("rogue_greeting_2",
         "L'ambition n'est rien sans la maîtrise. Voyons si vous méritez "
         "ce qui vous attend."),
        ("rogue_offer_1",
         "Trois Basilics Mineurs souillent les cachots oubliés. Élimine-les. "
         "Sans bruit, sans gloire. La Couronne du Basilic n'est pas pour les "
         "vantards."),
        ("rogue_active_1",
         "Encore en vie ? Surprenant. Le travail n'est pas terminé."),
        ("rogue_ready_1",
         "Trois Basilics, trois preuves. La Couronne vous attend — venez la "
         "chercher quand l'ambition vous le dictera."),
        # idle — copie exacte de dialogues.idleRandom (npcs.js).
        ("rogue_idle_1",
         "Trois élèves m'ont demandé aujourd'hui si une potion ratée "
         "pouvait exploser. Elle le peut. Eux aussi, désormais."),
        ("rogue_idle_2",
         "Concentrez-vous. La distraction tue plus vite que les sortilèges."),
        ("rogue_idle_3",
         "Je n'enseigne pas pour être aimé. L'affection est un luxe ; la "
         "survie, une discipline."),
        ("rogue_idle_4",
         "Vous me trouvez injuste. Bien. Le monde l'est davantage, et lui "
         "ne vous préviendra pas."),
        ("rogue_idle_5",
         "J'ai commis, étant jeune, une erreur dont le prix ne cesse "
         "jamais d'augmenter. Veillez à ne pas m'imiter."),
        ("rogue_idle_6",
         "Certaines fautes ne se rachètent pas. On apprend seulement à "
         "les porter sans trébucher."),
        ("rogue_idle_7",
         "Il y a un souvenir que je garderai jusqu'au dernier souffle. "
         "Toujours. Ne me demandez pas lequel."),
        # ── Don récurrent à la Maison (gold-sink endgame) ──
        ("rogue_donation_intro",
         "Tiens, Potter. Vous découvrez enfin que l'ambition se paie en or "
         "aussi bien qu'en sang. Serpentard accepte vos offrandes."),
        ("rogue_donation_offer",
         "Combien êtes-vous prêt à laisser sur la table aujourd'hui ?"),
        ("rogue_donation_small",
         "Soit. Un début."),
        ("rogue_donation_large",
         "Voilà qui ressemble enfin à une ambition. Serpentard saura quoi "
         "en faire — soyez assuré que vous ne reverrez pas un galion."),
        ("rogue_donation_refuse",
         "Mendier serait plus digne que ceci. Revenez avec quelque chose "
         "à offrir, ou ne revenez pas."),
        # ── Série Apothéose ★ N (post-tier 18) ──
        ("rogue_apotheose_star_first",
         "Une étoile au revers du Serpent. Vous m'étonnez, Potter. Une fois."),
        ("rogue_apotheose_star",
         "Une étoile de plus. Le venin se distille. Continuez."),
        ("rogue_apotheose_star_milestone",
         "Dix étoiles. Je consens à reconnaître la patience qu'il vous a "
         "fallu. Serpentard vous garde."),
    ],
    "flitwick": [
        ("flitwick_greeting_1",
         "Oh ! Un esprit aiguisé, n'est-ce pas ? L'aigle de Serdaigle se "
         "reconnaît au premier regard."),
        ("flitwick_greeting_2",
         "Approchez, approchez. Le savoir récompense ceux qui le cultivent "
         "avec assiduité."),
        ("flitwick_offer_1",
         "Hécate la Maudisseuse dévore nos grimoires interdits. Trois de ses "
         "avatars, voilà ce qu'il faut anéantir — et l'Anneau du Savoir sera "
         "vôtre."),
        ("flitwick_active_1",
         "Le savoir s'écrit dans le silence — combien d'avatars d'Hécate "
         "avez-vous réduits au néant ?"),
        ("flitwick_ready_1",
         "Trois maudisseuses, trois pages préservées. L'Anneau du Savoir "
         "vous attend — revenez le réclamer."),
        # idle — copie exacte de dialogues.idleRandom (npcs.js).
        ("flitwick_idle_1",
         "On me prend pour un bibelot posé sur une pile de livres. Puis je "
         "lève ma baguette. On me reprend rarement deux fois."),
        ("flitwick_idle_2",
         "J'ai fait léviter un piano à queue, une fois. Le pianiste jouait "
         "encore — il a très bien terminé son morceau."),
        ("flitwick_idle_3",
         "Un sortilège bien exécuté vaut mille incantations brouillonnes. "
         "Travaillez vos gestes."),
        ("flitwick_idle_4",
         "La taille d'un sorcier ne dit rien de la portée de sa baguette. "
         "Retenez-le."),
        ("flitwick_idle_5",
         "J'ai été champion de duel, jadis. Ce n'est pas un titre qu'on "
         "remporte sans laisser quelques adversaires… diminués."),
        ("flitwick_idle_6",
         "On néglige toujours les petites choses : une étincelle, un mot, "
         "un homme menu. C'est ce qu'on néglige qui finit par tout embraser."),
        ("flitwick_idle_7",
         "J'ai vu des duels où l'on riait au premier sort. Plus personne "
         "ne riait au dernier."),
        # ── Don récurrent à la Maison (gold-sink endgame) ──
        ("flitwick_donation_intro",
         "Oh, mais quelle agréable surprise ! Vous avez atteint le palier "
         "qui ouvre nos coffres aux contributions. Serdaigle vous remercie "
         "par avance."),
        ("flitwick_donation_offer",
         "Eh bien, eh bien ! Combien souhaitez-vous nous offrir ?"),
        ("flitwick_donation_small",
         "Magnifique ! Vous voyez, tout s'additionne."),
        ("flitwick_donation_large",
         "Stupéfiant ! Une telle générosité mérite tous nos honneurs. "
         "Serdaigle gravera votre nom dans le marbre."),
        ("flitwick_donation_refuse",
         "Hum, vos poches semblent un peu légères aujourd'hui. Revenez "
         "quand le compte y sera, voulez-vous ?"),
        # ── Série Apothéose ★ N (post-tier 18) ──
        ("flitwick_apotheose_star_first",
         "Première étoile ! Le calcul devient passionnant. Vous entrez dans "
         "la constellation Serdaigle."),
        ("flitwick_apotheose_star",
         "Une étoile de plus dans votre ciel ! Excellent, excellent."),
        ("flitwick_apotheose_star_milestone",
         "Dix étoiles ! Mathématiquement remarquable. Je consigne ce résultat "
         "dans nos archives sur-le-champ."),
    ],
    "sprout": [
        ("sprout_greeting_1",
         "Ah, un Poufsouffle ! La loyauté finit toujours par porter ses "
         "fruits — comme mes plantes."),
        ("sprout_greeting_2",
         "Ne sous-estimez jamais le travail acharné. C'est ce qui distingue "
         "les vrais sorciers."),
        ("sprout_offer_1",
         "Trois Trolls des Cavernes terrorisent les passages — patience et "
         "loyauté, racine après racine. Le Médaillon de Helga récompensera "
         "ton serment."),
        ("sprout_active_1",
         "Trois trolls, et pas un de moins. Garde la tête haute."),
        ("sprout_ready_1",
         "Trois trolls vaincus — le serment est tenu. Le Médaillon de Helga "
         "vous attend, repassez le réclamer."),
        # idle — copie exacte de dialogues.idleRandom (npcs.js).
        ("sprout_idle_1",
         "Une Tentacula vénéneuse m'a encore mordu le chapeau ce matin. "
         "Ce chapeau en a vu d'autres. Moi aussi."),
        ("sprout_idle_2",
         "Patience et persévérance, comme on l'enseigne aux racines."),
        ("sprout_idle_3",
         "Une plante pousse dans le noir sans se plaindre. Il y a là une "
         "leçon que bien des sorciers refusent d'apprendre."),
        ("sprout_idle_4",
         "Le terreau le plus riche est toujours celui qui a recouvert "
         "quelque chose. Ne creusez pas trop, parfois."),
        ("sprout_idle_5",
         "Le cri d'une Mandragore adulte tue net. Je fais répéter les "
         "protections à mes élèves jusqu'à ce qu'ils en rêvent."),
        ("sprout_idle_6",
         "Le Filet du Diable n'attaque jamais. Il attend, simplement, que "
         "vous cessiez de vous débattre."),
        ("sprout_idle_7",
         "On m'a un jour demandé des Mandragores pour ranimer des enfants "
         "pétrifiés. Je les ai cultivées en pleurant. Une serre garde bien "
         "les secrets."),
        # ── Don récurrent à la Maison (gold-sink endgame) ──
        ("sprout_donation_intro",
         "Oh, mon cher enfant, comme c'est gentil de penser à nous ! "
         "Poufsouffle accueille volontiers tout ce que tu voudras partager."),
        ("sprout_donation_offer",
         "Alors, dis-moi, combien souhaites-tu donner à notre Maison ?"),
        ("sprout_donation_small",
         "Merci, c'est très généreux. Cela ira aux serres, sois-en sûr."),
        ("sprout_donation_large",
         "Mon Dieu, quelle générosité ! Tu nourriras nos plantes et nos "
         "élèves pour des saisons entières. Poufsouffle te bénit."),
        ("sprout_donation_refuse",
         "Allons, allons, ne te mets pas dans l'embarras. Reviens quand "
         "tu auras quelques galions de plus."),
        # ── Série Apothéose ★ N (post-tier 18) ──
        ("sprout_apotheose_star_first",
         "Une première étoile, mon enfant. Comme une fleur qui s'ouvre. "
         "Poufsouffle est si fière de toi."),
        ("sprout_apotheose_star",
         "Encore une étoile. Tu fais notre joie."),
        ("sprout_apotheose_star_milestone",
         "Dix étoiles ! Les racines de Poudlard portent ton nom, mon enfant."),
    ],
    # Incantations des sortilèges (Vague B). Le texte synthétisé est
    # l'incantation prononcée ; la clé OGG est mappée 1:1 dans
    # AudioSystem.SPELL_VOICE_MAP (js/audio-sfx.js).
    "hermione": [
        ("spell_expelliarmus",       "Expelliarmus !"),
        ("spell_stupefix",           "Stupéfix !"),
        ("spell_episkey",            "Episkey."),
        ("spell_protego",            "Protego !"),
        ("spell_incendio",           "Incendio !"),
        ("spell_reparo",             "Reparo."),
        ("spell_wingardium_leviosa", "Wingardium Leviosa !"),
        ("spell_accio",              "Accio !"),
        ("spell_ferula",             "Ferula."),
        ("spell_diffindo",           "Diffindo !"),
        ("spell_sectumsempra",       "Sectumsempra !"),
        ("spell_avada",              "Avada Kedavra !"),
        ("spell_portus",             "Portus !"),
        # ── Vague C — incantations restantes (sorts sans voix enregistrée).
        # Clés mappées 1:1 dans SPELL_VOICE_MAP (js/audio-sfx.js) ;
        # texte = incantation prononcée pour le nom canonique de SPELLS.
        ("spell_ferula_maxima",        "Ferula Maxima !"),
        ("spell_aguamenti",            "Aguamenti !"),
        ("spell_bombarda",             "Bombarda !"),
        ("spell_riddikulus",           "Riddikulus !"),
        ("spell_alohomora",            "Alohomora !"),
        ("spell_patronum",             "Spero Patronum !"),
        ("spell_fulgari",              "Fulgari !"),
        ("spell_lumos_solem",          "Lumos Solem !"),
        ("spell_vampyrus",             "Vampyrus !"),
        ("spell_maledictus",           "Maledictus !"),
        ("spell_crucio",               "Crucio !"),
        ("spell_morsmordre",           "Morsmordre !"),
        ("spell_sectumsempra_imperius", "Sectumsempra Imperius !"),
        ("spell_legilimens",           "Legilimens !"),
        ("spell_recolte_magique",      "Récolte Magique !"),
        ("spell_fulgur_catena",        "Fulgur Catena !"),
        ("spell_lux_aeterna",          "Lux Aeterna !"),
        ("spell_nox_vorax",            "Nox Vorax !"),
        ("spell_diffindo_maxima",      "Diffindo Maxima !"),
        ("spell_vulnera_sanentur",     "Vulnera Sanentur."),
        ("spell_memoire_outremonde",   "Mémoire d'Outremonde !"),
        ("spell_marque_pelerin",       "Marque du Pèlerin !"),
        ("spell_rappel_astral",        "Rappel Astral !"),
        # ── Vague D — derniers sorts (couverture 100 % de SPELLS).
        ("spell_lumos_maxima",         "Lumos Maxima !"),
        ("spell_glacius",              "Glacius !"),
        ("spell_revelio",              "Revelio !"),
        ("spell_sanguini",             "Sanguini !"),
        ("spell_tarantallegra",        "Tarantallegra !"),
        ("spell_patronus_maxima",      "Patronus Maxima !"),
        ("spell_glacius_tempete",      "Glacius Tempête !"),
        ("spell_fiendfyre",            "Fiendfyre !"),
        ("spell_cheminette_inter_mondes", "Cheminette Inter-Mondes !"),
        ("spell_verrou_de_sang",       "Verrou de Sang !"),
        ("spell_sceau_du_voyageur",    "Sceau du Voyageur !"),
    ],
    # Tour guidé d'aide — une clé par étape de HELP_TOUR_STEPS
    # (js/help-tour.js). Texte = titre + paragraphe de l'étape.
    "mcgonagall_help": [
        ("mcgonagall_help_1",
         "Bienvenue à Poudlard ! Ce petit tour présente les commandes du "
         "jeu. Tu peux le passer à tout moment, et le relancer plus tard "
         "via le bouton Aide."),
        ("mcgonagall_help_2",
         "La vue du donjon. Le château se parcourt en vue trois "
         "dimensions : couloirs, portes en bois, coffres, escaliers et "
         "fontaines apparaissent devant toi."),
        ("mcgonagall_help_3",
         "Se déplacer. Avance, recule et pivote la caméra avec les touches "
         "directionnelles ou les flèches du clavier. Sur mobile, glisse un "
         "doigt sur la vue."),
        ("mcgonagall_help_4",
         "Te repérer. La minimap montre les salles explorées et ta "
         "position. La boussole indique la direction de ton regard."),
        ("mcgonagall_help_5",
         "Ton groupe. Chaque héros a des points de vie, en rouge, des "
         "points de magie, en bleu, pour lancer des sorts, et partage la "
         "barre d'expérience du groupe."),
        ("mcgonagall_help_6",
         "Le Sac. Ton inventaire : potions, objets et équipement. Clique "
         "un objet pour l'utiliser ou l'équiper sur un personnage."),
        ("mcgonagall_help_7",
         "Les Sortilèges. La liste des sorts appris. On apprend de "
         "nouveaux sorts en montant de niveau, via des livres ou certains "
         "équipements."),
        ("mcgonagall_help_8",
         "La Fiche personnage. Toutes les statistiques détaillées. À "
         "chaque montée de niveau, un badge signale des points de "
         "caractéristique à répartir ici."),
        ("mcgonagall_help_9",
         "Le Bestiaire. La fiche de chaque créature déjà rencontrée : son "
         "histoire, son niveau de danger, ses résistances et ses "
         "faiblesses élémentaires."),
        ("mcgonagall_help_10",
         "Les Quêtes. Le journal de tes objectifs en cours et leurs "
         "récompenses. Remets une quête terminée pour gagner de "
         "l'expérience, de l'or et des objets."),
        ("mcgonagall_help_11",
         "Fouiller. Inspecte la salle courante pour dénicher des objets "
         "cachés. Pense à fouiller chaque pièce que tu traverses."),
        ("mcgonagall_help_12",
         "Se reposer. Récupère des points de vie et de magie hors combat. "
         "Le repos a un délai de récupération : à utiliser entre deux "
         "affrontements."),
        ("mcgonagall_help_13",
         "Le combat. Les combats sont au tour par tour. À chaque tour : "
         "Attaquer, lancer un Sortilège, se mettre en Garde, utiliser un "
         "Objet ou Fuir. Exploite les faiblesses élémentaires des "
         "ennemis !"),
        ("mcgonagall_help_14",
         "Sauvegarder. Le bouton Réglages regroupe Sauver et Charger : "
         "trois emplacements manuels plus une sauvegarde automatique. Tu y "
         "ajustes aussi le son et la difficulté."),
        ("mcgonagall_help_15",
         "Besoin d'aide ? Le bouton Aide, dans les Réglages, rouvre ce "
         "guide quand tu veux. Bonne aventure à Poudlard !"),
    ],
}


async def gen_one(key, text, cfg):
    path = os.path.join(OUT_DIR, key + ".mp3")
    comm = edge_tts.Communicate(
        text, cfg["voice"], rate=cfg["rate"], pitch=cfg["pitch"]
    )
    await comm.save(path)
    size = os.path.getsize(path)
    print(f"  ✓ {key}.mp3  ({size // 1024} Ko)")


async def main(targets):
    os.makedirs(OUT_DIR, exist_ok=True)
    for npc in targets:
        if npc not in LINES:
            print(f"  ⚠️  PNJ inconnu : {npc} (ignoré)")
            continue
        cfg = VOICES[npc]
        print(f"── {npc} — {cfg['voice']} "
              f"(rate {cfg['rate']}, pitch {cfg['pitch']}) ──")
        for key, text in LINES[npc]:
            await gen_one(key, text, cfg)
    print("Terminé. MP3 dans audio/voice/_raw/ — convertir en OGG ensuite.")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    targets = args if args else list(LINES.keys())
    asyncio.run(main(targets))
