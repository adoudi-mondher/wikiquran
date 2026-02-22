from neo4j import Session as Neo4jSession
from app.schemas.analytics import (
    TopRootsResponse,
    RootRank,
    TopRootsMeta,
    MeccanMedinanResponse,
    PeriodRoot,
    MeccanMedinanMeta,
)


# ─────────────────────────────────────────────
# REQUÊTES CYPHER
# ─────────────────────────────────────────────

# Racines classées par nombre de versets distincts
_CYPHER_TOP_ROOTS = """
    MATCH (r:Root)<-[:DERIVED_FROM]-(:Word)<-[:CONTAINS]-(a:Ayah)
    RETURN r.buckwalter AS buckwalter,
           r.arabic AS arabic,
           r.occurrences_count AS occurrences_count,
           count(DISTINCT a) AS ayah_count
    ORDER BY ayah_count DESC
    LIMIT $limit
"""

# Top racines pour un type de sourate (meccan ou medinan)
_CYPHER_PERIOD_ROOTS = """
    MATCH (s:Surah {type: $period})-[:HAS_AYAH]->(a:Ayah)
          -[:CONTAINS]->(:Word)-[:DERIVED_FROM]->(r:Root)
    RETURN r.buckwalter AS buckwalter,
           r.arabic AS arabic,
           count(DISTINCT a) AS ayah_count
    ORDER BY ayah_count DESC
    LIMIT $limit
"""

# Nombre total de versets par type de sourate
_CYPHER_PERIOD_COUNTS = """
    MATCH (s:Surah)-[:HAS_AYAH]->(a:Ayah)
    RETURN s.type AS period, count(a) AS total
"""


# ─────────────────────────────────────────────
# TOP ROOTS
# ─────────────────────────────────────────────

def get_top_roots(
    session: Neo4jSession,
    limit: int,
) -> TopRootsResponse:
    """Retourne les racines classées par nombre de versets distincts."""

    records = list(session.run(_CYPHER_TOP_ROOTS, limit=limit))

    roots = [
        RootRank(
            rank=i + 1,
            buckwalter=r["buckwalter"],
            arabic=r["arabic"],
            ayah_count=r["ayah_count"],
            occurrences_count=r["occurrences_count"],
        )
        for i, r in enumerate(records)
    ]

    return TopRootsResponse(
        roots=roots,
        meta=TopRootsMeta(limit=limit),
    )


# ─────────────────────────────────────────────
# MECCAN VS MEDINAN
# ─────────────────────────────────────────────

def get_meccan_vs_medinan(
    session: Neo4jSession,
    limit: int,
) -> MeccanMedinanResponse:
    """Compare les top racines entre sourates mecquoises et médinoises."""

    # 1. Top racines mecquoises
    meccan_records = list(session.run(_CYPHER_PERIOD_ROOTS, period="meccan", limit=limit))
    meccan = [
        PeriodRoot(
            buckwalter=r["buckwalter"],
            arabic=r["arabic"],
            ayah_count=r["ayah_count"],
        )
        for r in meccan_records
    ]

    # 2. Top racines médinoises
    medinan_records = list(session.run(_CYPHER_PERIOD_ROOTS, period="medinan", limit=limit))
    medinan = [
        PeriodRoot(
            buckwalter=r["buckwalter"],
            arabic=r["arabic"],
            ayah_count=r["ayah_count"],
        )
        for r in medinan_records
    ]

    # 3. Totaux par période (pour contextualiser les chiffres)
    count_records = list(session.run(_CYPHER_PERIOD_COUNTS))
    counts = {r["period"]: r["total"] for r in count_records}

    return MeccanMedinanResponse(
        meccan=meccan,
        medinan=medinan,
        meta=MeccanMedinanMeta(
            limit=limit,
            meccan_ayahs=counts.get("meccan", 0),
            medinan_ayahs=counts.get("medinan", 0),
        ),
    )
