from neo4j import Session as Neo4jSession
from app.schemas.network import (
    NetworkResponse,
    GraphCenter,
    GraphNode,
    GraphLink,
    NetworkMeta,
    RootNetworkResponse,
    RootInfo,
    RootNetworkMeta,
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

# Infos racine + ses versets (limités à max_nodes, ordre Mushaf)
_CYPHER_ROOT_AYAHS = """
    MATCH (r:Root {buckwalter: $bw})<-[:DERIVED_FROM]-(:Word)<-[:CONTAINS]-(a:Ayah)
    WITH r, collect(DISTINCT a) AS all_ayahs
    WITH r, all_ayahs, size(all_ayahs) AS total_ayahs
    UNWIND all_ayahs AS a
    WITH r, total_ayahs, a
    ORDER BY a.surah_number, a.ayah_number
    LIMIT $max_nodes
    RETURN r.buckwalter AS root_bw,
           r.arabic AS root_ar,
           r.occurrences_count AS occurrences_count,
           total_ayahs,
           collect(a) AS ayahs
"""

# Infos racine + TOUS ses versets (sans limite, pour scoring connectivité)
_CYPHER_ROOT_ALL_AYAHS = """
    MATCH (r:Root {buckwalter: $bw})<-[:DERIVED_FROM]-(:Word)<-[:CONTAINS]-(a:Ayah)
    WITH r, collect(DISTINCT a) AS all_ayahs
    RETURN r.buckwalter AS root_bw,
           r.arabic AS root_ar,
           r.occurrences_count AS occurrences_count,
           size(all_ayahs) AS total_ayahs,
           [a IN all_ayahs | a.pg_id] AS all_pg_ids
"""

# Score de connectivité de chaque verset par rapport au groupe
_CYPHER_ROOT_CONNECTIVITY = """
    UNWIND $pg_ids AS pid
    MATCH (a:Ayah {pg_id: pid})-[r:SHARES_ROOT]-(b:Ayah)
    WHERE b.pg_id IN $pg_ids
    RETURN a.pg_id AS pg_id,
           a.surah_number AS surah_number,
           a.ayah_number AS ayah_number,
           count(r) AS connectivity
    ORDER BY connectivity DESC
    LIMIT $max_nodes
"""

# Liens SHARES_ROOT entre un ensemble de versets (par pg_id)
_CYPHER_ROOT_LINKS = """
    UNWIND $pg_ids AS id1
    UNWIND $pg_ids AS id2
    WITH id1, id2
    WHERE id1 < id2
    MATCH (a1:Ayah {pg_id: id1})-[r:SHARES_ROOT]-(a2:Ayah {pg_id: id2})
    WITH a1, a2,
         count(r) AS weight,
         collect(r.root_bw) AS roots_bw,
         collect(r.root_arabic) AS roots_ar
    WHERE weight >= $min_roots
    ORDER BY weight DESC
    LIMIT $limit
    RETURN a1.surah_number AS src_surah, a1.ayah_number AS src_ayah,
           a2.surah_number AS tgt_surah, a2.ayah_number AS tgt_ayah,
           weight, roots_bw, roots_ar
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


# ─────────────────────────────────────────────
# SOUS-GRAPHE D'UNE RACINE
# ─────────────────────────────────────────────

def get_root_network(
    session: Neo4jSession,
    buckwalter: str,
    max_nodes: int,
    min_roots: int,
    limit: int,
    sort: str,
) -> RootNetworkResponse | None:
    """
    Récupère le sous-graphe des versets contenant une racine,
    avec leurs connexions SHARES_ROOT mutuelles.
    Retourne None si la racine n'existe pas dans Neo4j.

    Tri disponible :
    - "mushaf"    : ordre d'apparition dans le Coran (rapide)
    - "connected" : versets les plus connectés entre eux (2 requêtes supplémentaires)
    """

    if sort == "connected":
        return _get_root_network_connected(session, buckwalter, max_nodes, min_roots, limit)
    else:
        return _get_root_network_mushaf(session, buckwalter, max_nodes, min_roots, limit)


def _get_root_network_mushaf(
    session: Neo4jSession,
    buckwalter: str,
    max_nodes: int,
    min_roots: int,
    limit: int,
) -> RootNetworkResponse | None:
    """Sélection des versets par ordre Mushaf (v1 — rapide)."""

    # 1. Récupérer la racine + ses versets (limités à max_nodes, ordre Mushaf)
    result = session.run(
        _CYPHER_ROOT_AYAHS,
        bw=buckwalter,
        max_nodes=max_nodes,
    ).single()

    if not result:
        return None

    # 2. Construire les nœuds + récupérer les pg_ids
    root_info, nodes, pg_ids = _build_root_nodes(result)

    # 3. Récupérer les liens et assembler la réponse
    return _build_root_response(session, root_info, nodes, pg_ids, "mushaf", max_nodes, min_roots, limit)


def _get_root_network_connected(
    session: Neo4jSession,
    buckwalter: str,
    max_nodes: int,
    min_roots: int,
    limit: int,
) -> RootNetworkResponse | None:
    """Sélection des versets par connectivité (v2 — insights inter-sourates)."""

    # 1. Récupérer la racine + TOUS ses pg_ids
    result = session.run(
        _CYPHER_ROOT_ALL_AYAHS,
        bw=buckwalter,
    ).single()

    if not result:
        return None

    root_info = RootInfo(
        buckwalter=result["root_bw"],
        arabic=result["root_ar"],
        occurrences_count=result["occurrences_count"],
        total_ayahs=result["total_ayahs"],
    )

    all_pg_ids = result["all_pg_ids"]

    # 2. Scorer la connectivité et garder les top max_nodes
    scored_records = list(session.run(
        _CYPHER_ROOT_CONNECTIVITY,
        pg_ids=all_pg_ids,
        max_nodes=max_nodes,
    ))

    # Si aucun verset connecté, réponse vide
    if not scored_records:
        return RootNetworkResponse(
            root=root_info,
            nodes=[],
            links=[],
            meta=RootNetworkMeta(
                sort="connected",
                max_nodes=max_nodes,
                min_roots=min_roots,
                limit=limit,
                total_nodes=0,
                total_links=0,
            ),
        )

    # 3. Construire les nœuds depuis les versets les plus connectés
    nodes = []
    pg_ids = []
    for record in scored_records:
        s = record["surah_number"]
        v = record["ayah_number"]
        nodes.append(GraphNode(
            id=_make_node_id(s, v),
            surah_number=s,
            ayah_number=v,
            group=s,
        ))
        pg_ids.append(record["pg_id"])

    # 4. Récupérer les liens et assembler la réponse
    return _build_root_response(session, root_info, nodes, pg_ids, "connected", max_nodes, min_roots, limit)


def _build_root_nodes(result) -> tuple[RootInfo, list[GraphNode], list[int]]:
    """Extrait les infos racine, construit les nœuds et la liste des pg_ids."""
    root_info = RootInfo(
        buckwalter=result["root_bw"],
        arabic=result["root_ar"],
        occurrences_count=result["occurrences_count"],
        total_ayahs=result["total_ayahs"],
    )

    nodes = []
    pg_ids = []
    for a in result["ayahs"]:
        s = a["surah_number"]
        v = a["ayah_number"]
        nodes.append(GraphNode(
            id=_make_node_id(s, v),
            surah_number=s,
            ayah_number=v,
            group=s,
        ))
        pg_ids.append(a["pg_id"])

    return root_info, nodes, pg_ids


def _build_root_response(
    session: Neo4jSession,
    root_info: RootInfo,
    nodes: list[GraphNode],
    pg_ids: list[int],
    sort: str,
    max_nodes: int,
    min_roots: int,
    limit: int,
) -> RootNetworkResponse:
    """Récupère les liens entre les versets sélectionnés et assemble la réponse."""

    # Si 0 ou 1 verset, pas de liens possibles
    if len(pg_ids) < 2:
        return RootNetworkResponse(
            root=root_info,
            nodes=nodes,
            links=[],
            meta=RootNetworkMeta(
                sort=sort,
                max_nodes=max_nodes,
                min_roots=min_roots,
                limit=limit,
                total_nodes=len(nodes),
                total_links=0,
            ),
        )

    # Chercher les liens SHARES_ROOT entre ces versets
    link_records = list(session.run(
        _CYPHER_ROOT_LINKS,
        pg_ids=pg_ids,
        min_roots=min_roots,
        limit=limit,
    ))

    # Construire les liens
    links = []
    for record in link_records:
        src_id = _make_node_id(record["src_surah"], record["src_ayah"])
        tgt_id = _make_node_id(record["tgt_surah"], record["tgt_ayah"])

        clean_bw, clean_ar = _deduplicate_roots(
            record["roots_bw"],
            record["roots_ar"],
        )
        links.append(GraphLink(
            source=src_id,
            target=tgt_id,
            weight=len(clean_bw),
            roots_bw=clean_bw,
            roots_ar=clean_ar,
        ))

    return RootNetworkResponse(
        root=root_info,
        nodes=nodes,
        links=links,
        meta=RootNetworkMeta(
            sort=sort,
            max_nodes=max_nodes,
            min_roots=min_roots,
            limit=limit,
            total_nodes=len(nodes),
            total_links=len(links),
        ),
    )