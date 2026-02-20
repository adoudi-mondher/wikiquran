"""
WikiQuran — scripts/extraction/normalize.py
Fusionne et nettoie les 5 fichiers JSON en un format final
prêt pour l'import en base de données (Phase 2).

Entrées :
  - data/quran_enriched/surahs.json
  - data/quran_enriched/ayahs.json
  - data/quran_enriched/roots.json
  - data/quran_enriched/words.json
  - data/quran_enriched/occurrences.json

Sortie :
  - data/quran_enriched/wikiquran_final.json

Usage : python scripts/extraction/normalize.py
"""

import json
import os
from collections import defaultdict

# ============================================================
# Chemins
# ============================================================
DATA_ENRICHED   = "data/quran_enriched"
IN_SURAHS       = os.path.join(DATA_ENRICHED, "surahs.json")
IN_AYAHS        = os.path.join(DATA_ENRICHED, "ayahs.json")
IN_ROOTS        = os.path.join(DATA_ENRICHED, "roots.json")
IN_WORDS        = os.path.join(DATA_ENRICHED, "words.json")
IN_OCCURRENCES  = os.path.join(DATA_ENRICHED, "occurrences.json")
OUT_FINAL       = os.path.join(DATA_ENRICHED, "wikiquran_final.json")


def separator(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


# ============================================================
# ÉTAPE 1 — Chargement des fichiers sources
# ============================================================
def load_sources() -> tuple:
    """Charge les 5 fichiers JSON sources."""
    separator("ÉTAPE 1 — Chargement des sources")

    sources = {
        "surahs"      : IN_SURAHS,
        "ayahs"       : IN_AYAHS,
        "roots"       : IN_ROOTS,
        "words"       : IN_WORDS,
        "occurrences" : IN_OCCURRENCES,
    }

    data = {}
    for key, path in sources.items():
        if not os.path.exists(path):
            print(f"❌ Fichier manquant : {path}")
            print("   → Lance d'abord parse_tanzil.py et parse_corpus.py")
            exit(1)
        with open(path, encoding='utf-8') as f:
            data[key] = json.load(f)
        print(f"  ✅ {key:<15} : {len(data[key]):>6} entrées")

    return (
        data["surahs"],
        data["ayahs"],
        data["roots"],
        data["words"],
        data["occurrences"],
    )


# ============================================================
# ÉTAPE 2 — Normalisation et attribution des IDs
# ============================================================
def assign_ids(surahs, ayahs, roots, words, occurrences) -> tuple:
    """
    Attribue des IDs stables à chaque entité.
    Ces IDs seront les PK dans PostgreSQL et les pg_id dans Neo4j.

    Convention :
        - IDs commencent à 1 (comme PostgreSQL SERIAL)
        - Clé de lookup : surah.number, root.buckwalter, word.form_buckwalter
    """
    separator("ÉTAPE 2 — Attribution des IDs")

    # --- Surahs : index = numéro de sourate ---
    surah_index = {}  # number → surah enrichi
    for i, s in enumerate(surahs, start=1):
        s['id'] = i
        surah_index[s['number']] = s
    print(f"  ✅ {len(surah_index)} surahs indexées")

    # --- Ayahs : index par (surah_number, ayah_number) ---
    ayah_index = {}  # (surah_number, number) → ayah enrichi
    for i, a in enumerate(ayahs, start=1):
        a['id'] = i
        # Récupère l'ID de la sourate parente
        surah = surah_index.get(a['surah_number'])
        a['surah_id'] = surah['id'] if surah else None
        ayah_index[(a['surah_number'], a['number'])] = a
    print(f"  ✅ {len(ayah_index)} ayahs indexées")

    # --- Roots : index par buckwalter ---
    root_index = {}  # buckwalter → root enrichi
    for i, r in enumerate(roots, start=1):
        r['id'] = i
        root_index[r['buckwalter']] = r
    print(f"  ✅ {len(root_index)} roots indexées")

    # --- Words : index par form_buckwalter ---
    word_index = {}  # form_buckwalter → word enrichi
    for i, w in enumerate(words, start=1):
        w['id'] = i
        # Lier le mot à sa racine
        root = root_index.get(w['root_bw'])
        w['root_id'] = root['id'] if root else None
        word_index[w['form_buckwalter']] = w
    print(f"  ✅ {len(word_index)} words indexés")

    # --- Occurrences : enrichissement avec IDs ---
    occurrences_enriched = []
    skipped = 0
    for o in occurrences:
        ayah = ayah_index.get((o['surah_number'], o['ayah_number']))
        word = word_index.get(o['form_bw'])

        if not ayah or not word:
            skipped += 1
            continue

        occurrences_enriched.append({
            "ayah_id"       : ayah['id'],
            "word_id"       : word['id'],
            "position"      : o['word_position'],
            # Dénormalisé pour faciliter les requêtes Neo4j
            "surah_number"  : o['surah_number'],
            "ayah_number"   : o['ayah_number'],
            "root_bw"       : o['root_bw'],
        })

    print(f"  ✅ {len(occurrences_enriched)} occurrences enrichies")
    if skipped:
        print(f"  ⚠️  {skipped} occurrences ignorées (référence manquante)")

    return surah_index, ayah_index, root_index, word_index, occurrences_enriched


# ============================================================
# ÉTAPE 3 — Construction du JSON final
# ============================================================
def build_final(surah_index, ayah_index, root_index,
                word_index, occurrences_enriched) -> dict:
    """
    Construit le document JSON final structuré pour l'import.

    Structure :
    {
        "meta": { stats globales },
        "surahs": [...],
        "ayahs": [...],
        "roots": [...],
        "words": [...],
        "occurrences": [...]
    }
    """
    separator("ÉTAPE 3 — Construction du JSON final")

    surahs_clean = []
    for s in surah_index.values():
        surahs_clean.append({
            "id"                  : s['id'],
            "number"              : s['number'],
            "name_arabic"         : s['name_arabic'],
            "name_en"             : s.get('name_en', ''),
            "name_transliteration": s.get('name_transliteration', ''),
            "revelation_order"    : s['revelation_order'],
            "type"                : s['type'],
            "ayas_count"          : s['ayas_count'],
            "rukus"               : s.get('rukus'),
        })

    ayahs_clean = []
    for a in ayah_index.values():
        ayahs_clean.append({
            "id"           : a['id'],
            "surah_id"     : a['surah_id'],
            "surah_number" : a['surah_number'],
            "number"       : a['number'],
            "text_arabic"  : a['text_arabic'],
        })

    roots_clean = []
    for r in root_index.values():
        roots_clean.append({
            "id"               : r['id'],
            "buckwalter"       : r['buckwalter'],
            "arabic"           : r['arabic'],
            "arabic_display"   : r['arabic_display'],
            "occurrences_count": r['occurrences_count'],
        })

    words_clean = []
    for w in word_index.values():
        words_clean.append({
            "id"              : w['id'],
            "form_buckwalter" : w['form_buckwalter'],
            "root_id"         : w['root_id'],
            "root_bw"         : w['root_bw'],
            "lemma_bw"        : w['lemma_bw'],
            "pos"             : w['pos'],
        })

    # Trier par ID pour cohérence
    surahs_clean.sort(key=lambda x: x['id'])
    ayahs_clean.sort(key=lambda x: x['id'])
    roots_clean.sort(key=lambda x: x['id'])
    words_clean.sort(key=lambda x: x['id'])

    # Métadonnées globales
    meccan  = sum(1 for s in surahs_clean if s['type'] == 'meccan')
    medinan = sum(1 for s in surahs_clean if s['type'] == 'medinan')

    final = {
        "meta": {
            "version"         : "1.0.0",
            "source_tanzil"   : "quran-uthmani.xml + quran-data.xml",
            "source_corpus"   : "quranic-corpus-morphology-0.4.txt",
            "stats": {
                "surahs_total"   : len(surahs_clean),
                "surahs_meccan"  : meccan,
                "surahs_medinan" : medinan,
                "ayahs_total"    : len(ayahs_clean),
                "roots_total"    : len(roots_clean),
                "words_total"    : len(words_clean),
                "occurrences_total": len(occurrences_enriched),
            }
        },
        "surahs"      : surahs_clean,
        "ayahs"       : ayahs_clean,
        "roots"       : roots_clean,
        "words"       : words_clean,
        "occurrences" : occurrences_enriched,
    }

    print(f"  ✅ JSON final construit")
    return final


# ============================================================
# ÉTAPE 4 — Validation finale
# ============================================================
def validate_final(final: dict):
    """Validation croisée du JSON final."""
    separator("ÉTAPE 4 — Validation finale")

    stats = final['meta']['stats']

    assert stats['surahs_total']  == 114,  f"❌ Surahs : {stats['surahs_total']}"
    assert stats['ayahs_total']   == 6236, f"❌ Ayahs  : {stats['ayahs_total']}"
    assert stats['roots_total']   > 1500,  f"❌ Roots  : {stats['roots_total']}"
    assert stats['words_total']   > 10000, f"❌ Words  : {stats['words_total']}"

    # Vérifier que tous les ayahs ont un surah_id valide
    surah_ids = {s['id'] for s in final['surahs']}
    invalides = [a for a in final['ayahs'] if a['surah_id'] not in surah_ids]
    assert not invalides, f"❌ Ayahs sans surah_id valide : {len(invalides)}"

    # Vérifier que tous les words ont un root_id valide ou None
    root_ids = {r['id'] for r in final['roots']}
    invalides = [w for w in final['words']
                 if w['root_id'] is not None and w['root_id'] not in root_ids]
    assert not invalides, f"❌ Words avec root_id invalide : {len(invalides)}"

    print("  ✅ Toutes les validations croisées passées")


# ============================================================
# ÉTAPE 5 — Export
# ============================================================
def export_final(final: dict):
    """Exporte le JSON final."""
    separator("ÉTAPE 5 — Export")

    with open(OUT_FINAL, 'w', encoding='utf-8') as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    size_mb = os.path.getsize(OUT_FINAL) / (1024 * 1024)
    print(f"  💾 {OUT_FINAL} ({size_mb:.1f} Mo)")

    # Affichage des stats finales
    stats = final['meta']['stats']
    print(f"\n  📊 Résumé final :")
    print(f"     Sourates    : {stats['surahs_total']}")
    print(f"     ├ Mecquoises: {stats['surahs_meccan']}")
    print(f"     └ Médinoises: {stats['surahs_medinan']}")
    print(f"     Versets     : {stats['ayahs_total']}")
    print(f"     Racines     : {stats['roots_total']}")
    print(f"     Mots uniques: {stats['words_total']}")
    print(f"     Occurrences : {stats['occurrences_total']}")


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print("\n🕌 WikiQuran — normalize.py\n")

    # Pipeline complet
    surahs, ayahs, roots, words, occurrences = load_sources()

    surah_index, ayah_index, root_index, word_index, occurrences_enriched = \
        assign_ids(surahs, ayahs, roots, words, occurrences)

    final = build_final(
        surah_index, ayah_index, root_index,
        word_index, occurrences_enriched
    )

    validate_final(final)
    export_final(final)

    print("\n✅ normalize.py terminé avec succès !")
    print("   → data/quran_enriched/wikiquran_final.json prêt pour l'import Phase 2 !\n")