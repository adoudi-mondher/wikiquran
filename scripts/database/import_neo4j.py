"""
WikiQuran — scripts/database/import_neo4j.py
Synchronise PostgreSQL → Neo4j.
Crée les nœuds, les relations, et calcule SHARES_ROOT.

Règle fondamentale : Neo4j est reconstruit depuis PostgreSQL.
                     pg_id = pont vers la source de vérité.

Usage : python scripts/database/import_neo4j.py
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# Configuration
# ============================================================
PG_CONFIG = {
    "host"    : os.getenv("DB_HOST", "localhost"),
    "port"    : os.getenv("DB_PORT", "5432"),
    "dbname"  : os.getenv("DB_NAME", "wikiquran"),
    "user"    : os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD"),
}

NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# Batch size pour les imports Neo4j
BATCH_SIZE = 500


def separator(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


# ============================================================
# Connexions
# ============================================================
def get_pg_connection():
    """Connexion PostgreSQL."""
    try:
        conn = psycopg2.connect(**PG_CONFIG, cursor_factory=RealDictCursor)
        print(f"  ✅ PostgreSQL connecté — {PG_CONFIG['dbname']}")
        return conn
    except psycopg2.OperationalError as e:
        print(f"  ❌ PostgreSQL : {e}")
        sys.exit(1)


def get_neo4j_driver():
    """Driver Neo4j Bolt."""
    try:
        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        driver.verify_connectivity()
        print(f"  ✅ Neo4j connecté — {NEO4J_URI}")
        return driver
    except Exception as e:
        print(f"  ❌ Neo4j : {e}")
        sys.exit(1)


# ============================================================
# ÉTAPE 1 — Contraintes et index
# ============================================================
def create_constraints(driver):
    """Crée les contraintes d'unicité et les index."""
    separator("ÉTAPE 1 — Contraintes & Index")

    queries = [
        # Contraintes d'unicité (équivalent PK)
        "CREATE CONSTRAINT surah_pg_id IF NOT EXISTS FOR (s:Surah) REQUIRE s.pg_id IS UNIQUE",
        "CREATE CONSTRAINT ayah_pg_id  IF NOT EXISTS FOR (a:Ayah)  REQUIRE a.pg_id IS UNIQUE",
        "CREATE CONSTRAINT word_pg_id  IF NOT EXISTS FOR (w:Word)  REQUIRE w.pg_id IS UNIQUE",
        "CREATE CONSTRAINT root_bw     IF NOT EXISTS FOR (r:Root)  REQUIRE r.buckwalter IS UNIQUE",

        # Index pour les traversées analytiques
        "CREATE INDEX idx_surah_number IF NOT EXISTS FOR (s:Surah) ON (s.number)",
        "CREATE INDEX idx_ayah_ref     IF NOT EXISTS FOR (a:Ayah)  ON (a.surah_number, a.ayah_number)",
        "CREATE INDEX idx_surah_type   IF NOT EXISTS FOR (s:Surah) ON (s.type)",
    ]

    with driver.session() as session:
        for q in queries:
            session.run(q)
            label = q.split("FOR")[1].split("REQUIRE")[0].strip()
            print(f"  ✅ {label}")

    print(f"\n  ✅ {len(queries)} contraintes/index créés")


# ============================================================
# ÉTAPE 2 — Nœuds Surah
# ============================================================
def import_surah_nodes(driver, pg_conn):
    """Importe les nœuds Surah depuis PostgreSQL."""
    separator("ÉTAPE 2 — Nœuds Surah")

    with pg_conn.cursor() as cur:
        cur.execute("SELECT id, number, name_arabic, revelation_order, type, ayas_count FROM surah ORDER BY number")
        rows = [dict(r) for r in cur.fetchall()]

    query = """
        UNWIND $batch AS s
        MERGE (n:Surah {pg_id: s.id})
        SET n.number           = s.number,
            n.name_arabic      = s.name_arabic,
            n.revelation_order = s.revelation_order,
            n.type             = s.type,
            n.ayas_count       = s.ayas_count
    """

    with driver.session() as session:
        session.run(query, batch=rows)

    print(f"  ✅ {len(rows)} nœuds Surah importés")


# ============================================================
# ÉTAPE 3 — Nœuds Root
# ============================================================
def import_root_nodes(driver, pg_conn):
    """Importe les nœuds Root depuis PostgreSQL."""
    separator("ÉTAPE 3 — Nœuds Root")

    with pg_conn.cursor() as cur:
        cur.execute("SELECT id, buckwalter, arabic, occurrences_count FROM root ORDER BY id")
        rows = [dict(r) for r in cur.fetchall()]

    query = """
        UNWIND $batch AS r
        MERGE (n:Root {buckwalter: r.buckwalter})
        SET n.pg_id             = r.id,
            n.arabic            = r.arabic,
            n.occurrences_count = r.occurrences_count
    """

    with driver.session() as session:
        for i in range(0, len(rows), BATCH_SIZE):
            session.run(query, batch=rows[i:i + BATCH_SIZE])

    print(f"  ✅ {len(rows)} nœuds Root importés")


# ============================================================
# ÉTAPE 4 — Nœuds Ayah + relation HAS_AYAH
# ============================================================
def import_ayah_nodes(driver, pg_conn):
    """Importe les nœuds Ayah et crée HAS_AYAH depuis Surah."""
    separator("ÉTAPE 4 — Nœuds Ayah + HAS_AYAH")

    with pg_conn.cursor() as cur:
        cur.execute("""
            SELECT a.id, a.surah_id, a.number AS ayah_number,
                   s.number AS surah_number
            FROM ayah a
            JOIN surah s ON s.id = a.surah_id
            ORDER BY a.id
        """)
        rows = [dict(r) for r in cur.fetchall()]

    query = """
        UNWIND $batch AS a
        MERGE (n:Ayah {pg_id: a.id})
        SET n.surah_number = a.surah_number,
            n.ayah_number  = a.ayah_number

        WITH n, a
        MATCH (s:Surah {pg_id: a.surah_id})
        MERGE (s)-[:HAS_AYAH]->(n)
    """

    total = len(rows)
    with driver.session() as session:
        for i in range(0, total, BATCH_SIZE):
            session.run(query, batch=rows[i:i + BATCH_SIZE])
            done = min(i + BATCH_SIZE, total)
            if done % 2000 == 0 or done == total:
                print(f"  ⏳ {done}/{total} ({done*100//total}%)")

    print(f"  ✅ {total} nœuds Ayah + relations HAS_AYAH importés")


# ============================================================
# ÉTAPE 5 — Nœuds Word + relations CONTAINS + DERIVED_FROM
# ============================================================
def import_word_nodes(driver, pg_conn):
    """Importe Word et crée CONTAINS (Ayah→Word) et DERIVED_FROM (Word→Root)."""
    separator("ÉTAPE 5 — Nœuds Word + CONTAINS + DERIVED_FROM")

    with pg_conn.cursor() as cur:
        cur.execute("""
            SELECT w.id, w.text_arabic, w.pos,
                   r.buckwalter AS root_bw,
                   wo.ayah_id, wo.position
            FROM word w
            JOIN word_occurrence wo ON wo.word_id = w.id
            LEFT JOIN root r ON r.id = w.root_id
            ORDER BY wo.ayah_id, wo.position
        """)
        rows = [dict(r) for r in cur.fetchall()]

    # Nœuds Word (uniques)
    query_words = """
        UNWIND $batch AS w
        MERGE (n:Word {pg_id: w.id})
        SET n.text_arabic = w.text_arabic,
            n.pos         = w.pos
    """

    # Relations CONTAINS + DERIVED_FROM
    query_relations = """
        UNWIND $batch AS w
        MATCH (a:Ayah    {pg_id: w.ayah_id})
        MATCH (wn:Word   {pg_id: w.id})
        MERGE (a)-[:CONTAINS {position: w.position}]->(wn)

        WITH wn, w
        WHERE w.root_bw IS NOT NULL
        MATCH (r:Root {buckwalter: w.root_bw})
        MERGE (wn)-[:DERIVED_FROM]->(r)
    """

    total = len(rows)
    with driver.session() as session:
        for i in range(0, total, BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            session.run(query_words, batch=batch)
            session.run(query_relations, batch=batch)
            done = min(i + BATCH_SIZE, total)
            if done % 10000 == 0 or done == total:
                print(f"  ⏳ {done}/{total} ({done*100//total}%)")

    print(f"  ✅ {total} Word + CONTAINS + DERIVED_FROM importés")


# ============================================================
# ÉTAPE 6 — Calcul SHARES_ROOT (la relation analytique clé)
# ============================================================
def compute_shares_root(driver, pg_conn):
    """
    Calcule et crée la relation SHARES_ROOT entre versets.
    Deux versets sont connectés s'ils partagent au moins une racine.
    count = nombre de racines communes (poids de la relation).

    C'est la relation différenciante de WikiQuran.
    """
    separator("ÉTAPE 6 — Calcul SHARES_ROOT")

    print("  ⏳ Calcul des racines partagées depuis PostgreSQL...")

    # On calcule les paires de versets partageant une racine directement en SQL
    # C'est beaucoup plus rapide que de le faire dans Neo4j
    with pg_conn.cursor() as cur:
        cur.execute("""
            SELECT
                wo1.ayah_id   AS ayah1_id,
                wo2.ayah_id   AS ayah2_id,
                r.buckwalter  AS root_bw,
                r.arabic      AS root_arabic,
                COUNT(*)      AS shared_count
            FROM word_occurrence wo1
            JOIN word w1 ON w1.id = wo1.word_id AND w1.root_id IS NOT NULL
            JOIN word_occurrence wo2 ON wo2.word_id != wo1.word_id
            JOIN word w2 ON w2.id = wo2.word_id AND w2.root_id = w1.root_id
            JOIN root r ON r.id = w1.root_id
            WHERE wo1.ayah_id < wo2.ayah_id  -- éviter les doublons A→B et B→A
            GROUP BY wo1.ayah_id, wo2.ayah_id, r.buckwalter, r.arabic
            HAVING COUNT(*) >= 1
            ORDER BY wo1.ayah_id, wo2.ayah_id
        """)
        rows = [dict(r) for r in cur.fetchall()]

    print(f"  ✅ {len(rows):,} paires de versets avec racines communes calculées")

    # Import dans Neo4j par batch
    query = """
        UNWIND $batch AS sr
        MATCH (a1:Ayah {pg_id: sr.ayah1_id})
        MATCH (a2:Ayah {pg_id: sr.ayah2_id})
        MERGE (a1)-[r:SHARES_ROOT {root_bw: sr.root_bw}]->(a2)
        SET r.root_arabic = sr.root_arabic,
            r.count       = sr.shared_count
    """

    total = len(rows)
    print(f"  ⏳ Import SHARES_ROOT dans Neo4j...")

    with driver.session() as session:
        for i in range(0, total, BATCH_SIZE):
            session.run(query, batch=rows[i:i + BATCH_SIZE])
            done = min(i + BATCH_SIZE, total)
            if done % 50000 == 0 or done == total:
                print(f"  ⏳ {done:>7}/{total:,} ({done*100//total}%)")

    print(f"  ✅ {total:,} relations SHARES_ROOT créées")


# ============================================================
# ÉTAPE 7 — Validation
# ============================================================
def validate(driver, pg_conn):
    """Validation croisée PostgreSQL ↔ Neo4j."""
    separator("ÉTAPE 7 — Validation")

    # Counts PostgreSQL
    with pg_conn.cursor() as cur:
        counts_pg = {}
        for table in ['surah', 'ayah', 'root', 'word']:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            counts_pg[table] = cur.fetchone()['count']

    # Counts Neo4j
    with driver.session() as session:
        counts_neo4j = {}
        for label in ['Surah', 'Ayah', 'Root', 'Word']:
            result = session.run(f"MATCH (n:{label}) RETURN count(n) AS c")
            counts_neo4j[label] = result.single()['c']

        # Relations
        for rel in ['HAS_AYAH', 'CONTAINS', 'DERIVED_FROM', 'SHARES_ROOT']:
            result = session.run(f"MATCH ()-[r:{rel}]->() RETURN count(r) AS c")
            counts_neo4j[rel] = result.single()['c']

    # Affichage
    print("  Nœuds :")
    for pg_key, neo_key in [('surah','Surah'), ('ayah','Ayah'), ('root','Root'), ('word','Word')]:
        pg_val  = counts_pg[pg_key]
        neo_val = counts_neo4j[neo_key]
        status  = "✅" if pg_val == neo_val else "❌"
        print(f"    {status} {neo_key:<10} PG={pg_val:>6} | Neo4j={neo_val:>6}")

    print("\n  Relations :")
    for rel in ['HAS_AYAH', 'CONTAINS', 'DERIVED_FROM', 'SHARES_ROOT']:
        count = counts_neo4j[rel]
        print(f"    ✅ {rel:<20} : {count:>10,}")


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print("\n🕌 WikiQuran — import_neo4j.py\n")

    separator("Connexions")
    pg_conn = get_pg_connection()
    driver  = get_neo4j_driver()

    try:
        create_constraints(driver)
        import_surah_nodes(driver, pg_conn)
        import_root_nodes(driver, pg_conn)
        import_ayah_nodes(driver, pg_conn)
        import_word_nodes(driver, pg_conn)
        compute_shares_root(driver, pg_conn)
        validate(driver, pg_conn)

    except Exception as e:
        print(f"\n  ❌ Erreur : {e}")
        raise
    finally:
        pg_conn.close()
        driver.close()
        print("\n  🔌 Connexions fermées")

    print("\n✅ import_neo4j.py terminé avec succès !")
    print("   → Neo4j prêt — graphe WikiQuran opérationnel !\n")
