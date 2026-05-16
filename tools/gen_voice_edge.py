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

# Certains environnements interposent un proxy MITM avec un certificat
# auto-signé. On désactive la vérification côté client : le trafic reste
# chiffré entre le proxy et Microsoft, seule la chaîne locale est ignorée.
_orig_ctx = ssl.create_default_context


def _unverified_ctx(*args, **kwargs):
    ctx = _orig_ctx(*args, **kwargs)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


ssl.create_default_context = _unverified_ctx
ssl._create_default_https_context = _unverified_ctx

try:
    import edge_tts
except ImportError:
    sys.exit("edge-tts manquant — installer avec : pip install edge-tts")

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "audio", "voice", "_raw")

# Voix / rate / pitch par chef de Maison. edge-tts n'offre pas de voice
# design custom ; on approche le timbre des personnages via le choix de
# voix FR + ajustements rate/pitch.
VOICES = {
    # McGonagall : féminine claire, posée, autoritaire.
    "mcgonagall": dict(voice="fr-FR-DeniseNeural", rate="-7%", pitch="+0Hz"),
    # Rogue : masculin grave, lent, presque chuchoté.
    "rogue": dict(voice="fr-FR-HenriNeural", rate="-12%", pitch="-8Hz"),
    # Flitwick : registre aigu, vif. Voix multilingue jeune/légère
    # pitchée modérément — moins d'artefacts que l'ancien Henri +32 Hz.
    "flitwick": dict(voice="en-US-AndrewMultilingualNeural", rate="+10%", pitch="+24Hz"),
    # Chourave : féminine chaleureuse, ronde, médium.
    "sprout": dict(voice="fr-FR-VivienneMultilingualNeural", rate="-3%", pitch="+0Hz"),
    # Hermione : féminine jeune, claire — incantations des sortilèges.
    "hermione": dict(voice="fr-FR-EloiseNeural", rate="-4%", pitch="+0Hz"),
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
        ("mcgonagall_idle_1",
         "L'ordre doit être maintenu, même dans ces souterrains."),
        ("mcgonagall_done_1",
         "Vous avez prouvé votre valeur. Gryffondor peut être fier."),
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
        ("rogue_idle_1",
         "Concentrez-vous. La distraction tue plus vite que les sortilèges."),
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
        ("flitwick_idle_1",
         "Un sortilège bien exécuté vaut mille incantations brouillonnes. "
         "Travaillez vos gestes."),
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
        ("sprout_idle_1",
         "Patience et persévérance, comme on l'enseigne aux racines."),
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
