"""
WikiQuran — scripts/database/import_postgres.py
Importe wikiquran_final.json dans PostgreSQL.
Idempotent : relançable sans créer de doublons (UPSERT).

Usage : python scripts/database/import_postgres.py
"""

import json
import os
import sys
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# Configuration
# ============================================================
DB_CONFIG = {
    "host"    : os.getenv("DB_HOST", "localhost"),
    "port"    : os.getenv("DB_PORT", "5432"),
    "dbname"  : os.getenv("DB_NAME", "wikiquran"),
    "user"    : os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD"),
}

DATA_FINAL = "data/quran_enriched/wikiquran_final.json"

# Batch size pour les inserts (performance)
BATCH_SIZE = 500


def separator(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


# ============================================================
# Connexion
# ============================================================
def get_connection():
    """Crée et retourne une connexion PostgreSQL."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print(f"  ✅ Connecté à PostgreSQL — {DB_CONFIG['dbname']}")
        return conn
    except psycopg2.OperationalError as e:
        print(f"  ❌ Connexion échouée : {e}")
        print("     → Vérifie que docker-compose est lancé et que .env est correct")
        sys.exit(1)


# ============================================================
# Chargement du JSON final
# ============================================================
def load_data() -> dict:
    """Charge wikiquran_final.json."""
    separator("Chargement des données")

    if not os.path.exists(DATA_FINAL):
        print(f"  ❌ Fichier introuvable : {DATA_FINAL}")
        print("     → Lance d'abord scripts/extraction/normalize.py")
        sys.exit(1)

    with open(DATA_FINAL, encoding='utf-8') as f:
        data = json.load(f)

    stats = data['meta']['stats']
    print(f"  ✅ wikiquran_final.json chargé")
    print(f"     Sourates    : {stats['surahs_total']}")
    print(f"     Versets     : {stats['ayahs_total']}")
    print(f"     Racines     : {stats['roots_total']}")
    print(f"     Mots        : {stats['words_total']}")
    print(f"     Occurrences : {stats['occurrences_total']}")

    return data


# ============================================================
# Import Surah
# ============================================================
def import_surahs(conn, surahs: list):
    """
    Importe les sourates.
    UPSERT : met à jour si déjà existant.
    """
    separator("Import — surah")

    sql = """
        INSERT INTO surah (
            id, number, name_arabic, name_en, name_transliteration,
            revelation_order, type, ayas_count, rukus
        ) VALUES (
            %(id)s, %(number)s, %(name_arabic)s, %(name_en)s,
            %(name_transliteration)s, %(revelation_order)s,
            %(type)s, %(ayas_count)s, %(rukus)s
        )
        ON CONFLICT (id) DO UPDATE SET
            name_arabic          = EXCLUDED.name_arabic,
            revelation_order     = EXCLUDED.revelation_order,
            type                 = EXCLUDED.type,
            ayas_count           = EXCLUDED.ayas_count;
    """

    with conn.cursor() as cur:
        execute_batch(cur, sql, surahs, page_size=BATCH_SIZE)
        # Synchroniser la séquence SERIAL avec le max ID importé
        cur.execute("SELECT setval('surah_id_seq', (SELECT MAX(id) FROM surah))")

    conn.commit()
    print(f"  ✅ {len(surahs)} sourates importées")


# ============================================================
# Import Root
# ============================================================
def import_roots(conn, roots: list):
    """Importe les racines arabes."""
    separator("Import — root")

    sql = """
        INSERT INTO root (
            id, buckwalter, arabic, occurrences_count
        ) VALUES (
            %(id)s, %(buckwalter)s, %(arabic)s, %(occurrences_count)s
        )
        ON CONFLICT (id) DO UPDATE SET
            occurrences_count = EXCLUDED.occurrences_count;
    """

    with conn.cursor() as cur:
        execute_batch(cur, sql, roots, page_size=BATCH_SIZE)
        cur.execute("SELECT setval('root_id_seq', (SELECT MAX(id) FROM root))")

    conn.commit()
    print(f"  ✅ {len(roots)} racines importées")


# ============================================================
# Import Ayah
# ============================================================
def import_ayahs(conn, ayahs: list):
    """Importe les versets."""
    separator("Import — ayah")

    sql = """
        INSERT INTO ayah (
            id, surah_id, number, text_arabic
        ) VALUES (
            %(id)s, %(surah_id)s, %(number)s, %(text_arabic)s
        )
        ON CONFLICT (id) DO UPDATE SET
            text_arabic = EXCLUDED.text_arabic;
    """

    with conn.cursor() as cur:
        execute_batch(cur, sql, ayahs, page_size=BATCH_SIZE)
        cur.execute("SELECT setval('ayah_id_seq', (SELECT MAX(id) FROM ayah))")

    conn.commit()
    print(f"  ✅ {len(ayahs)} versets importés")


# ============================================================
# Import Word
# ============================================================
def import_words(conn, words: list):
    """Importe les mots uniques."""
    separator("Import — word")

    sql = """
        INSERT INTO word (
            id, text_arabic, root_id, lemma_buckwalter, pos
        ) VALUES (
            %(id)s, %(form_buckwalter)s, %(root_id)s,
            %(lemma_bw)s, %(pos)s
        )
        ON CONFLICT (id) DO UPDATE SET
            root_id          = EXCLUDED.root_id,
            lemma_buckwalter = EXCLUDED.lemma_buckwalter,
            pos              = EXCLUDED.pos;
    """

    with conn.cursor() as cur:
        execute_batch(cur, sql, words, page_size=BATCH_SIZE)
        cur.execute("SELECT setval('word_id_seq', (SELECT MAX(id) FROM word))")

    conn.commit()
    print(f"  ✅ {len(words)} mots importés")


# ============================================================
# Import Word Occurrence
# ============================================================
def import_occurrences(conn, occurrences: list):
    """
    Importe les occurrences.
    C'est la table la plus volumineuse (77 915 lignes).
    """
    separator("Import — word_occurrence")

    sql = """
        INSERT INTO word_occurrence (
            ayah_id, word_id, position
        ) VALUES (
            %(ayah_id)s, %(word_id)s, %(position)s
        )
        ON CONFLICT (ayah_id, position) DO NOTHING;
    """

    total = len(occurrences)
    imported = 0

    with conn.cursor() as cur:
        # On traite par batch avec affichage de progression
        for i in range(0, total, BATCH_SIZE):
            batch = occurrences[i:i + BATCH_SIZE]
            execute_batch(cur, sql, batch, page_size=BATCH_SIZE)
            imported += len(batch)
            # Progression toutes les 10 000 lignes
            if imported % 10000 == 0 or imported == total:
                pct = (imported / total) * 100
                print(f"  ⏳ {imported:>6}/{total} ({pct:.0f}%)")

    conn.commit()
    print(f"  ✅ {total} occurrences importées")


# ============================================================
# Validation finale
# ============================================================
def validate(conn, expected: dict):
    """
    Vérifie que les counts en base correspondent aux données source.
    """
    separator("Validation finale")

    checks = [
        ("surah",          expected['surahs_total']),
        ("ayah",           expected['ayahs_total']),
        ("root",           expected['roots_total']),
        ("word",           expected['words_total']),
        ("word_occurrence", expected['occurrences_total']),
    ]

    all_ok = True
    with conn.cursor() as cur:
        for table, expected_count in checks:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            actual = cur.fetchone()[0]
            status = "✅" if actual == expected_count else "❌"
            print(f"  {status} {table:<20} : {actual:>6} / {expected_count:>6}")
            if actual != expected_count:
                all_ok = False

    if all_ok:
        print("\n  ✅ Toutes les validations passées !")
    else:
        print("\n  ❌ Certaines validations ont échoué — vérifie les logs")

    return all_ok


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print("\n🕌 WikiQuran — import_postgres.py\n")

    # 1. Charger les données
    data = load_data()
    stats = data['meta']['stats']

    # 2. Connexion
    separator("Connexion PostgreSQL")
    conn = get_connection()

    try:
        # 3. Import dans l'ordre des FK
        # surah et root d'abord (pas de dépendances)
        # puis ayah (dépend de surah)
        # puis word (dépend de root)
        # puis word_occurrence (dépend de ayah + word)
        import_surahs(conn, data['surahs'])
        import_roots(conn, data['roots'])
        import_ayahs(conn, data['ayahs'])
        import_words(conn, data['words'])
        import_occurrences(conn, data['occurrences'])

        # 4. Validation
        validate(conn, stats)

    except Exception as e:
        conn.rollback()
        print(f"\n  ❌ Erreur durant l'import : {e}")
        raise
    finally:
        conn.close()
        print("\n  🔌 Connexion fermée")

    print("\n✅ import_postgres.py terminé avec succès !")
    print("   → PostgreSQL prêt pour la synchronisation Neo4j !\n")
