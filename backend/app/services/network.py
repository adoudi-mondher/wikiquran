from neo4j import Session as Neo4jSession
from app.schemas.network import (
    NetworkResponse,
    GraphCenter,
    GraphNode,
    GraphLink,
    NetworkMeta,
)


# ─────────────────────────────────────────────
# REQUÊTES CYPHER
# ─────────────────────────────────────────────

# Sous-graphe SHARES_ROOT d'un verset — agrégé par voisin
_CYPHER_AYAH_NETWORK = """
    MATCH (a:Ayah {surah_number: $surah, ayah_number: $verse})
    MATCH (a)-[r:SHARES_ROOT]-(b:Ayah)
    WITH a, b,
         count(r) AS weight,
         collect(r.root_bw) AS roots_bw,
         collect(r.root_arabic) AS roots_ar
    WHERE weight >= $min_roots
    ORDER BY weight DESC
    LIMIT $limit
    RETURN b.surah_number AS tgt_surah,
           b.ayah_number  AS tgt_ayah,
           weight,
           roots_bw,
           roots_ar
"""

# Vérification d'existence d'un verset
_CYPHER_AYAH_EXISTS = """
    MATCH (a:Ayah {surah_number: $surah, ayah_number: $verse})
    RETURN a.surah_number AS surah_number, a.ayah_number AS ayah_number
"""


# ─────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────

def _make_node_id(surah: int, ayah: int) -> str:
    """Construit l'identifiant react-force-graph : '2:255'."""
    return f"{surah}:{ayah}"


def _deduplicate_roots(roots_bw: list[str], roots_ar: list[str]) -> tuple[list[str], list[str]]:
    """
    Dédoublonne les racines tout en gardant la correspondance bw ↔ ar.
    Nécessaire car le Design A peut produire des doublons
    (ex: deux mots dérivés de la même racine dans le même verset).
    """
    seen = set()
    unique_bw = []
    unique_ar = []
    for bw, ar in zip(roots_bw, roots_ar):
        if bw not in seen:
            seen.add(bw)
            unique_bw.append(bw)
            unique_ar.append(ar)
    return unique_bw, unique_ar


# ─────────────────────────────────────────────
# SERVICE PRINCIPAL
# ─────────────────────────────────────────────

def get_ayah_network(
    session: Neo4jSession,
    surah_number: int,
    ayah_number: int,
    min_roots: int,
    limit: int,
) -> NetworkResponse | None:
    """
    Récupère le sous-graphe SHARES_ROOT autour d'un verset.
    Retourne None si le verset n'existe pas dans Neo4j.
    Retourne un NetworkResponse vide si le verset existe mais n'a pas de voisins au seuil demandé.
    """

    # 1. Requête principale — voisins du verset
    result = session.run(
        _CYPHER_AYAH_NETWORK,
        surah=surah_number,
        verse=ayah_number,
        min_roots=min_roots,
        limit=limit,
    )
    records = list(result)

    # 2. Si aucun résultat, vérifier si le verset existe
    if not records:
        exists = session.run(
            _CYPHER_AYAH_EXISTS,
            surah=surah_number,
            verse=ayah_number,
        ).single()

        if not exists:
            return None  # Verset inexistant → la route renverra 404

        # Verset existe mais isolé au seuil demandé → réponse vide
        center_id = _make_node_id(surah_number, ayah_number)
        return NetworkResponse(
            center=GraphCenter(
                id=center_id,
                surah_number=surah_number,
                ayah_number=ayah_number,
            ),
            nodes=[GraphNode(
                id=center_id,
                surah_number=surah_number,
                ayah_number=ayah_number,
                group=surah_number,
            )],
            links=[],
            meta=NetworkMeta(
                min_roots=min_roots,
                limit=limit,
                total_links=0,
            ),
        )

    # 3. Construire le nœud central
    center_id = _make_node_id(surah_number, ayah_number)
    center = GraphCenter(
        id=center_id,
        surah_number=surah_number,
        ayah_number=ayah_number,
    )

    # 4. Construire les nœuds (center + voisins)
    nodes = [GraphNode(
        id=center_id,
        surah_number=surah_number,
        ayah_number=ayah_number,
        group=surah_number,
    )]

    # 5. Construire les liens + nœuds voisins
    links = []
    for record in records:
        tgt_surah = record["tgt_surah"]
        tgt_ayah = record["tgt_ayah"]
        tgt_id = _make_node_id(tgt_surah, tgt_ayah)

        # Nœud voisin
        nodes.append(GraphNode(
            id=tgt_id,
            surah_number=tgt_surah,
            ayah_number=tgt_ayah,
            group=tgt_surah,
        ))

        # Lien dédoublonné
        clean_bw, clean_ar = _deduplicate_roots(
            record["roots_bw"],
            record["roots_ar"],
        )
        links.append(GraphLink(
            source=center_id,
            target=tgt_id,
            weight=len(clean_bw),  # Le vrai poids = nombre de racines uniques
            roots_bw=clean_bw,
            roots_ar=clean_ar,
        ))

    # 6. Assembler la réponse
    return NetworkResponse(
        center=center,
        nodes=nodes,
        links=links,
        meta=NetworkMeta(
            min_roots=min_roots,
            limit=limit,
            total_links=len(links),
        ),
    )
