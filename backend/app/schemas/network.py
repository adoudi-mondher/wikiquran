from pydantic import BaseModel, Field


# ─────────────────────────────────────────────
# NŒUDS & LIENS — Format react-force-graph
# ─────────────────────────────────────────────

class GraphNode(BaseModel):
    """Nœud du graphe — un verset pour react-force-graph."""

    id:           str          # "2:255" — identifiant unique pour react-force-graph
    surah_number: int
    ayah_number:  int
    group:        int          # = surah_number — pour colorer par sourate


class GraphLink(BaseModel):
    """Lien du graphe — connexion SHARES_ROOT entre deux versets."""

    source:   str              # id du nœud source ("2:255")
    target:   str              # id du nœud cible ("3:18")
    weight:   int              # Nombre de racines partagées
    roots_bw: list[str]        # Racines en Buckwalter ["Elm", "Hkm"]
    roots_ar: list[str]        # Racines en arabe ["علم", "حكم"]


# ─────────────────────────────────────────────
# RÉPONSE COMPLÈTE — Endpoint /network/ayah
# ─────────────────────────────────────────────

class GraphCenter(BaseModel):
    """Le nœud source — positionné au centre du graphe."""

    id:           str
    surah_number: int
    ayah_number:  int


class NetworkMeta(BaseModel):
    """Métadonnées de la requête — pour le frontend."""

    min_roots:   int           # Seuil appliqué
    limit:       int           # Limite appliquée
    total_links: int           # Nombre de liens retournés


class NetworkResponse(BaseModel):
    """Réponse complète pour GET /network/ayah/{surah}/{verse}."""

    center: GraphCenter
    nodes:  list[GraphNode]
    links:  list[GraphLink]
    meta:   NetworkMeta


# ─────────────────────────────────────────────
# RÉPONSE COMPLÈTE — Endpoint /network/root
# ─────────────────────────────────────────────

class RootInfo(BaseModel):
    """Infos de la racine recherchée."""

    buckwalter:        str
    arabic:            str
    occurrences_count: int
    total_ayahs:       int     # Nombre total de versets (avant max_nodes)


class RootNetworkMeta(BaseModel):
    """Métadonnées spécifiques à /network/root."""

    sort:        str           # Tri appliqué : "mushaf" ou "connected"
    max_nodes:   int           # Plafond de nœuds demandé
    min_roots:   int           # Seuil appliqué
    limit:       int           # Limite de liens appliquée
    total_nodes: int           # Nœuds effectivement retournés
    total_links: int           # Liens effectivement retournés


class RootNetworkResponse(BaseModel):
    """Réponse complète pour GET /network/root/{buckwalter}."""

    root:  RootInfo
    nodes: list[GraphNode]
    links: list[GraphLink]
    meta:  RootNetworkMeta