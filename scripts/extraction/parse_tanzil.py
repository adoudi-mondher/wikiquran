"""
WikiQuran — scripts/extraction/parse_tanzil.py
Parse les deux fichiers Tanzil :
  - quran-uthmani.xml  → texte arabe des versets
  - quran-data.xml     → métadonnées des sourates
Produit : data/quran_enriched/surahs.json + ayahs.json
Usage : python scripts/extraction/parse_tanzil.py
"""

import json
import os
from lxml import etree

# ============================================================
# Chemins
# ============================================================
DATA_RAW      = "data/quran_raw"
DATA_ENRICHED = "data/quran_enriched"
FILE_UTHMANI  = os.path.join(DATA_RAW, "quran-uthmani.xml")
FILE_METADATA = os.path.join(DATA_RAW, "quran-data.xml")
OUT_SURAHS    = os.path.join(DATA_ENRICHED, "surahs.json")
OUT_AYAHS     = os.path.join(DATA_ENRICHED, "ayahs.json")


# ============================================================
# ÉTAPE 1 — Parser quran-data.xml (métadonnées sourates)
# ============================================================
def parse_metadata() -> dict:
    """
    Parse quran-data.xml et retourne un dictionnaire indexé par
    le numéro de sourate.

    Retourne :
        {
            "1": {
                "revelation_order": 5,
                "type": "meccan",
                "ayas_count": 7,
                "rukus": 1,
                "name_en": "The Opening",
                "name_transliteration": "Al-Faatiha"
            },
            ...
        }
    """
    print("📖 Parsing quran-data.xml ...")
    tree = etree.parse(FILE_METADATA)
    root = tree.getroot()

    metadata = {}
    suras = root.find('suras')

    for sura in suras:
        index = sura.attrib['index']
        metadata[index] = {
            # Ordre de révélation chronologique (clé analytique)
            "revelation_order"     : int(sura.attrib['order']),
            # Type mecquois/médinois → on normalise en minuscules
            "type"                 : sura.attrib['type'].lower(),  # 'meccan' | 'medinan'
            # Nombre de versets
            "ayas_count"           : int(sura.attrib['ayas']),
            # Sections de récitation
            "rukus"                : int(sura.attrib['rukus']),
            # Noms alternatifs (pour future recherche)
            "name_en"              : sura.attrib.get('ename', ''),
            "name_transliteration" : sura.attrib.get('tname', ''),
        }

    print(f"  ✅ {len(metadata)} sourates parsées")
    return metadata


# ============================================================
# ÉTAPE 2 — Parser quran-uthmani.xml (texte + fusion métadonnées)
# ============================================================
def parse_uthmani(metadata: dict) -> tuple[list, list]:
    """
    Parse quran-uthmani.xml et fusionne avec les métadonnées.
    Produit deux listes : surahs et ayahs.

    Args:
        metadata: dictionnaire retourné par parse_metadata()

    Retourne :
        surahs : liste de dicts sourates enrichies
        ayahs  : liste de dicts versets
    """
    print("📖 Parsing quran-uthmani.xml ...")
    tree = etree.parse(FILE_UTHMANI)
    root = tree.getroot()

    surahs = []
    ayahs  = []

    for sura in root:
        surah_number = int(sura.attrib['index'])
        surah_index  = str(surah_number)

        # Récupération des métadonnées depuis quran-data.xml
        meta = metadata.get(surah_index, {})

        # Construction du nœud Surah
        surah = {
            "number"              : surah_number,
            "name_arabic"         : sura.attrib['name'],
            "name_en"             : meta.get('name_en', ''),
            "name_transliteration": meta.get('name_transliteration', ''),
            "revelation_order"    : meta.get('revelation_order'),
            "type"                : meta.get('type'),          # 'meccan' | 'medinan'
            "ayas_count"          : meta.get('ayas_count'),
            "rukus"               : meta.get('rukus'),
        }
        surahs.append(surah)

        # Construction des nœuds Ayah
        for aya in sura:
            ayah = {
                "surah_number" : surah_number,
                "number"       : int(aya.attrib['index']),
                "text_arabic"  : aya.attrib['text'],
            }
            ayahs.append(ayah)

    print(f"  ✅ {len(surahs)} sourates construites")
    print(f"  ✅ {len(ayahs)} versets construits")
    return surahs, ayahs


# ============================================================
# ÉTAPE 3 — Validation des données
# ============================================================
def validate(surahs: list, ayahs: list):
    """
    Vérifie la cohérence des données parsées.
    Lève une exception si une anomalie est détectée.
    """
    print("🔍 Validation ...")

    # Nombre de sourates
    assert len(surahs) == 114, f"❌ Attendu 114 sourates, obtenu {len(surahs)}"

    # Nombre de versets
    assert len(ayahs) == 6236, f"❌ Attendu 6236 versets, obtenu {len(ayahs)}"

    # Vérification que tous les types sont valides
    types_invalides = [s for s in surahs if s['type'] not in ('meccan', 'medinan')]
    assert not types_invalides, f"❌ Types invalides : {types_invalides}"

    # Vérification que l'ordre de révélation est entre 1 et 114
    for s in surahs:
        rev = s['revelation_order']
        assert 1 <= rev <= 114, f"❌ Ordre révélation invalide : {rev} pour sourate {s['number']}"

    # Vérification que chaque verset a du texte arabe
    sans_texte = [a for a in ayahs if not a['text_arabic']]
    assert not sans_texte, f"❌ Versets sans texte : {len(sans_texte)}"

    print("  ✅ Toutes les validations passées")


# ============================================================
# ÉTAPE 4 — Export JSON
# ============================================================
def export_json(surahs: list, ayahs: list):
    """
    Exporte les données parsées en JSON dans data/quran_enriched/.
    """
    os.makedirs(DATA_ENRICHED, exist_ok=True)

    # Export surahs.json
    with open(OUT_SURAHS, 'w', encoding='utf-8') as f:
        json.dump(surahs, f, ensure_ascii=False, indent=2)
    size = os.path.getsize(OUT_SURAHS) / 1024
    print(f"  💾 {OUT_SURAHS} ({size:.1f} Ko)")

    # Export ayahs.json
    with open(OUT_AYAHS, 'w', encoding='utf-8') as f:
        json.dump(ayahs, f, ensure_ascii=False, indent=2)
    size = os.path.getsize(OUT_AYAHS) / 1024
    print(f"  💾 {OUT_AYAHS} ({size:.1f} Ko)")


# ============================================================
# APERÇU — Affiche quelques exemples pour vérification visuelle
# ============================================================
def print_preview(surahs: list, ayahs: list):
    """Affiche un aperçu des données pour vérification visuelle."""

    print("\n--- Aperçu : 3 premières sourates ---")
    for s in surahs[:3]:
        print(f"  Sourate {s['number']:>3} | {s['name_arabic']:<15} | "
              f"type={s['type']:<8} | révélation={s['revelation_order']:>3} | "
              f"versets={s['ayas_count']:>3}")

    print("\n--- Aperçu : 5 premiers versets ---")
    for a in ayahs[:5]:
        print(f"  {a['surah_number']}:{a['number']:>3} | {a['text_arabic']}")

    print("\n--- Aperçu : statistiques analytiques ---")
    meccan  = sum(1 for s in surahs if s['type'] == 'meccan')
    medinan = sum(1 for s in surahs if s['type'] == 'medinan')
    print(f"  Sourates mecquoises  : {meccan}")
    print(f"  Sourates médinoises  : {medinan}")

    # Sourate révélée en premier
    first_revealed = min(surahs, key=lambda s: s['revelation_order'])
    print(f"  1ère révélée         : Sourate {first_revealed['number']} "
          f"({first_revealed['name_arabic']}) — ordre {first_revealed['revelation_order']}")

    # Sourate révélée en dernier
    last_revealed = max(surahs, key=lambda s: s['revelation_order'])
    print(f"  Dernière révélée     : Sourate {last_revealed['number']} "
          f"({last_revealed['name_arabic']}) — ordre {last_revealed['revelation_order']}")


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print("\n🕌 WikiQuran — parse_tanzil.py\n")

    # Vérification fichiers source
    for f in [FILE_UTHMANI, FILE_METADATA]:
        if not os.path.exists(f):
            print(f"❌ Fichier introuvable : {f}")
            exit(1)

    # Pipeline
    metadata        = parse_metadata()
    surahs, ayahs   = parse_uthmani(metadata)
    validate(surahs, ayahs)

    print("\n💾 Export JSON ...")
    export_json(surahs, ayahs)

    print_preview(surahs, ayahs)

    print("\n✅ parse_tanzil.py terminé avec succès !\n")