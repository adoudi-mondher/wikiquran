"""
WikiQuran — scripts/extraction/explore_tanzil.py
Script d'exploration des fichiers Tanzil et Corpus Quran.
Objectif : comprendre la structure des données avant d'écrire l'extraction.
Usage : python scripts/extraction/explore_tanzil.py
"""

from lxml import etree
import os

# ============================================================
# Chemins des fichiers
# ============================================================
DATA_RAW = "data/quran_raw"
FILE_UTHMANI  = os.path.join(DATA_RAW, "quran-uthmani.xml")
FILE_METADATA = os.path.join(DATA_RAW, "quran-data.xml")
FILE_MORPHO   = os.path.join(DATA_RAW, "quranic-corpus-morphology-0.4.txt")


def separator(title: str):
    """Affiche un séparateur visuel."""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


# ============================================================
# PARTIE 1 — quran-uthmani.xml
# ============================================================
def explore_uthmani():
    separator("PARTIE 1 — quran-uthmani.xml (texte arabe)")

    tree = etree.parse(FILE_UTHMANI)
    root = tree.getroot()

    # Structure générale
    print(f"🏷️  Tag racine      : {root.tag}")
    print(f"📋 Attributs       : {dict(root.attrib)}")
    print(f"📚 Nb de sourates  : {len(root)}\n")

    # Première sourate — structure
    first_sura = root[0]
    print(f"--- Sourate 1 ---")
    print(f"  Attributs sura    : {dict(first_sura.attrib)}")
    print(f"  Nb de versets     : {len(first_sura)}\n")

    # 5 premiers versets
    print("--- 5 premiers versets ---")
    for aya in first_sura[:5]:
        print(f"  Aya {aya.attrib.get('index'):>3} | {aya.attrib.get('text')}")

    # Dernière sourate pour vérifier la cohérence
    last_sura = root[-1]
    print(f"\n--- Dernière sourate (index {last_sura.attrib.get('index')}) ---")
    print(f"  Attributs         : {dict(last_sura.attrib)}")
    print(f"  Nb de versets     : {len(last_sura)}")

    # Comptage total des versets
    total_ayas = sum(len(sura) for sura in root)
    print(f"\n✅ Total versets   : {total_ayas} (attendu: 6236)")


# ============================================================
# PARTIE 2 — quran-data.xml
# ============================================================
def explore_metadata():
    separator("PARTIE 2 — quran-data.xml (métadonnées)")

    tree = etree.parse(FILE_METADATA)
    root = tree.getroot()

    # Structure générale
    print(f"🏷️  Tag racine      : {root.tag}")
    print(f"📋 Enfants directs : {[child.tag for child in root]}\n")

    # Section <suras>
    suras = root.find('suras')
    if suras is not None:
        print(f"--- Section <suras> ---")
        print(f"  Nb de suras       : {len(suras)}\n")

        print("--- 3 premières sourates ---")
        for sura in suras[:3]:
            print(f"  {dict(sura.attrib)}")

        print("\n--- Clés disponibles sur une sura ---")
        print(f"  {list(suras[0].attrib.keys())}")

    # Section <juzs>
    juzs = root.find('juzs')
    if juzs is not None:
        print(f"\n--- Section <juzs> ---")
        print(f"  Nb de juzs        : {len(juzs)}")
        print(f"  Exemple juz 1     : {dict(juzs[0].attrib)}")

    # Section <sajdas>
    sajdas = root.find('sajdas')
    if sajdas is not None:
        print(f"\n--- Section <sajdas> ---")
        print(f"  Nb de sajdas      : {len(sajdas)}")


# ============================================================
# PARTIE 3 — quranic-corpus-morphology-0.4.txt
# ============================================================
def explore_morphology():
    separator("PARTIE 3 — quranic-corpus-morphology-0.4.txt (morphologie)")

    with open(FILE_MORPHO, encoding='utf-8') as f:
        lines = f.readlines()

    # Lignes de commentaires en tête
    print("--- En-tête du fichier (commentaires) ---")
    header_lines = [l for l in lines[:15] if l.startswith('#')]
    for line in header_lines:
        print(f"  {line.rstrip()}")

    # Premières lignes de données
    data_lines = [l for l in lines if not l.startswith('#') and l.strip()]

    print(f"\n--- Statistiques ---")
    print(f"  Total lignes          : {len(lines)}")
    print(f"  Lignes de données     : {len(data_lines)}")

    print(f"\n--- 10 premières lignes de données ---")
    for line in data_lines[:10]:
        print(f"  {line.rstrip()}")

    # Analyse d'une ligne
    print(f"\n--- Analyse d'une ligne ---")
    sample = data_lines[0].rstrip()
    parts = sample.split('\t')
    print(f"  Ligne brute  : {sample}")
    print(f"  Nb colonnes  : {len(parts)}")
    for i, part in enumerate(parts):
        print(f"  Colonne {i}    : {part}")

    # Chercher quelques racines comme exemple
    print(f"\n--- Exemples de ROOT trouvés ---")
    roots_found = []
    for line in data_lines[:200]:
        parts = line.split('\t')
        if len(parts) >= 4:
            features = parts[3] if len(parts) > 3 else ''
            for tag in features.split():
                if tag.startswith('ROOT:'):
                    roots_found.append(tag.replace('ROOT:', ''))
                    break
    unique_roots = list(dict.fromkeys(roots_found))  # dédupliqué, ordre préservé
    print(f"  {unique_roots[:15]}")


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print("\n🔍 WikiQuran — Exploration des fichiers sources\n")

    # Vérification que les fichiers existent
    for filepath in [FILE_UTHMANI, FILE_METADATA, FILE_MORPHO]:
        if not os.path.exists(filepath):
            print(f"❌ Fichier introuvable : {filepath}")
            print("   → Place les fichiers dans data/quran_raw/")
            exit(1)
        else:
            size_mb = os.path.getsize(filepath) / (1024 * 1024)
            print(f"✅ {os.path.basename(filepath):45} ({size_mb:.1f} Mo)")

    explore_uthmani()
    explore_metadata()
    explore_morphology()

    print(f"\n{'=' * 60}")
    print("  ✅ Exploration terminée — structure comprise !")
    print(f"{'=' * 60}\n")
