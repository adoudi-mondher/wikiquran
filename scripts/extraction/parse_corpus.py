"""
WikiQuran — scripts/extraction/parse_corpus.py
Parse le fichier de morphologie du Corpus Quran :
  - quranic-corpus-morphology-0.4.txt
Produit :
  - data/quran_enriched/words.json   → mots uniques + racine + POS + lemme
  - data/quran_enriched/occurrences.json → chaque apparition d'un mot dans un verset
Usage : python scripts/extraction/parse_corpus.py
"""

import json
import os
from collections import defaultdict

# ============================================================
# Chemins
# ============================================================
DATA_RAW        = "data/quran_raw"
DATA_ENRICHED   = "data/quran_enriched"
FILE_MORPHO     = os.path.join(DATA_RAW, "quranic-corpus-morphology-0.4.txt")
OUT_WORDS       = os.path.join(DATA_ENRICHED, "words.json")
OUT_OCCURRENCES = os.path.join(DATA_ENRICHED, "occurrences.json")
OUT_ROOTS       = os.path.join(DATA_ENRICHED, "roots.json")

# Import du convertisseur Buckwalter
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.buckwalter import buckwalter_to_arabic, arabic_root_display


# ============================================================
# ÉTAPE 1 — Parser une ligne du fichier morphologie
# ============================================================
def parse_location(location: str) -> tuple:
    """
    Parse la colonne LOCATION du fichier morphologie.

    Exemple :
        "(1:1:1:2)" → (1, 1, 1, 2)
         sourate:verset:mot:segment

    Args:
        location: chaîne de la forme "(s:v:w:seg)"

    Retourne :
        tuple (surah, ayah, word_pos, segment)
    """
    # Enlever les parenthèses puis splitter sur ':'
    clean = location.strip('()')
    parts = clean.split(':')
    return tuple(int(p) for p in parts)


def parse_features(features: str) -> dict:
    """
    Parse la colonne FEATURES du fichier morphologie.
    Les features sont séparées par '|'.

    Exemple :
        "STEM|POS:N|LEM:{som|ROOT:smw|M|GEN"
        → {
            "segment_type": "STEM",
            "pos": "N",
            "lemma_bw": "{som",
            "root_bw": "smw",
          }

    Args:
        features: chaîne de features séparées par '|'

    Retourne :
        dict avec les clés extraites
    """
    result = {
        "segment_type" : None,   # STEM | PREFIX | SUFFIX
        "pos"          : None,   # N, V, P, ADJ, CONJ...
        "lemma_bw"     : None,   # Lemme en Buckwalter
        "root_bw"      : None,   # Racine en Buckwalter
    }

    tags = features.strip().split('|')

    for tag in tags:
        if tag in ('STEM', 'PREFIX', 'SUFFIX'):
            result['segment_type'] = tag
        elif tag.startswith('POS:'):
            result['pos'] = tag.replace('POS:', '')
        elif tag.startswith('LEM:'):
            result['lemma_bw'] = tag.replace('LEM:', '')
        elif tag.startswith('ROOT:'):
            result['root_bw'] = tag.replace('ROOT:', '')

    return result


# ============================================================
# ÉTAPE 2 — Parser le fichier complet
# ============================================================
def parse_morphology() -> tuple[list, list, list]:
    """
    Parse le fichier morphologie complet.
    Ne garde que les segments STEM (le mot racine, pas les préfixes/suffixes).

    Retourne :
        words       : liste de mots uniques
        occurrences : liste d'occurrences (word -> ayah + position)
        roots       : liste de racines uniques
    """
    print("📖 Parsing quranic-corpus-morphology-0.4.txt ...")

    # Dictionnaires pour dédupliquer
    words_dict = {}   # text_arabic → word dict
    roots_dict = {}   # root_bw     → root dict

    occurrences   = []
    lines_parsed  = 0
    stems_found   = 0
    skipped       = 0

    with open(FILE_MORPHO, encoding='utf-8') as f:
        for line in f:
            line = line.rstrip()

            # Ignorer commentaires et ligne d'en-tête
            if line.startswith('#') or line.startswith('LOCATION'):
                continue

            # Parser la ligne
            parts = line.split('\t')
            if len(parts) < 4:
                skipped += 1
                continue

            location_str, form, tag, features = parts[0], parts[1], parts[2], parts[3]
            lines_parsed += 1

            # Parser la location
            try:
                surah, ayah_num, word_pos, segment = parse_location(location_str)
            except Exception:
                skipped += 1
                continue

            # Parser les features
            feat = parse_features(features)

            # On ne garde que les STEM (pas les préfixes bi+, al+, etc.)
            if feat['segment_type'] != 'STEM':
                continue

            stems_found += 1

            # --- Traitement de la racine ---
            root_bw = feat['root_bw']
            if root_bw and root_bw not in roots_dict:
                roots_dict[root_bw] = {
                    "buckwalter"  : root_bw,
                    "arabic"      : buckwalter_to_arabic(root_bw),
                    "arabic_display" : arabic_root_display(root_bw),
                    "occurrences_count": 0  # calculé après
                }

            # --- Traitement du mot ---
            text_arabic = form  # forme Buckwalter du mot (on convertit)
            # La forme arabe vient du fichier uthmani — ici on a le form en Buckwalter
            # On utilise le form tel quel comme clé unique
            word_key = form

            if word_key not in words_dict:
                words_dict[word_key] = {
                    "form_buckwalter" : form,
                    "root_bw"         : root_bw,
                    "root_arabic"     : buckwalter_to_arabic(root_bw) if root_bw else None,
                    "lemma_bw"        : feat['lemma_bw'],
                    "pos"             : feat['pos'],
                }

            # --- Occurrence ---
            occurrences.append({
                "surah_number" : surah,
                "ayah_number"  : ayah_num,
                "word_position": word_pos,
                "form_bw"      : form,
                "root_bw"      : root_bw,
            })

            # Comptage occurrences par racine
            if root_bw:
                roots_dict[root_bw]['occurrences_count'] += 1

    # Conversion en listes
    words = list(words_dict.values())
    roots = list(roots_dict.values())

    print(f"  ✅ Lignes parsées       : {lines_parsed:>7}")
    print(f"  ✅ Segments STEM gardés : {stems_found:>7}")
    print(f"  ✅ Mots uniques         : {len(words):>7}")
    print(f"  ✅ Racines uniques      : {len(roots):>7}")
    print(f"  ✅ Occurrences          : {len(occurrences):>7}")
    print(f"  ⚠️  Lignes ignorées      : {skipped:>7}")

    return words, occurrences, roots


# ============================================================
# ÉTAPE 3 — Validation
# ============================================================
def validate(words: list, occurrences: list, roots: list):
    """Vérifie la cohérence des données extraites."""
    print("🔍 Validation ...")

    # Racines attendues : ~1750
    assert len(roots) > 1500, f"❌ Trop peu de racines : {len(roots)}"
    assert len(roots) < 2000, f"❌ Trop de racines : {len(roots)}"

    # Occurrences attendues : ~80 000 (STEMs uniquement)
    assert len(occurrences) > 50000, f"❌ Trop peu d'occurrences : {len(occurrences)}"

    # Chaque occurrence doit avoir une position valide
    invalides = [o for o in occurrences if o['word_position'] < 1]
    assert not invalides, f"❌ Positions invalides : {len(invalides)}"

    # Vérifier que les roots ont bien arabic et buckwalter
    sans_arabic = [r for r in roots if not r['arabic']]
    if sans_arabic:
        print(f"  ⚠️  {len(sans_arabic)} racines sans conversion arabe")

    print("  ✅ Toutes les validations passées")


# ============================================================
# ÉTAPE 4 — Export JSON
# ============================================================
def export_json(words: list, occurrences: list, roots: list):
    """Exporte les 3 fichiers JSON."""
    os.makedirs(DATA_ENRICHED, exist_ok=True)

    for data, path in [
        (roots,       OUT_ROOTS),
        (words,       OUT_WORDS),
        (occurrences, OUT_OCCURRENCES),
    ]:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        size_kb = os.path.getsize(path) / 1024
        print(f"  💾 {path} ({size_kb:.0f} Ko)")


# ============================================================
# APERÇU
# ============================================================
def print_preview(words: list, occurrences: list, roots: list):
    """Affiche un aperçu pour vérification visuelle."""

    print("\n--- Aperçu : 5 premières racines (triées par occurrences) ---")
    top_roots = sorted(roots, key=lambda r: r['occurrences_count'], reverse=True)
    for r in top_roots[:5]:
        print(f"  {r['buckwalter']:<8} → {r['arabic_display']:<12} "
              f"({r['occurrences_count']} occurrences)")

    print("\n--- Aperçu : 5 premiers mots uniques ---")
    for w in words[:5]:
        root_ar = w['root_arabic'] or '—'
        print(f"  form={w['form_buckwalter']:<20} "
              f"root={w['root_bw'] or '—':<8} "
              f"({root_ar}) "
              f"pos={w['pos']}")

    print("\n--- Aperçu : 5 premières occurrences ---")
    for o in occurrences[:5]:
        print(f"  {o['surah_number']}:{o['ayah_number']}:{o['word_position']}"
              f"  form={o['form_bw']:<20}  root={o['root_bw'] or '—'}")

    print("\n--- Statistiques analytiques ---")
    # Top POS
    pos_count = defaultdict(int)
    for w in words:
        if w['pos']:
            pos_count[w['pos']] += 1
    top_pos = sorted(pos_count.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"  Top POS (parties du discours) : {top_pos}")

    # Racines sans occurrences
    sans_occ = [r for r in roots if r['occurrences_count'] == 0]
    print(f"  Racines sans occurrences      : {len(sans_occ)}")


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print("\n🕌 WikiQuran — parse_corpus.py\n")

    if not os.path.exists(FILE_MORPHO):
        print(f"❌ Fichier introuvable : {FILE_MORPHO}")
        exit(1)

    # Pipeline
    words, occurrences, roots = parse_morphology()
    validate(words, occurrences, roots)

    print("\n💾 Export JSON ...")
    export_json(words, occurrences, roots)

    print_preview(words, occurrences, roots)

    print("\n✅ parse_corpus.py terminé avec succès !\n")