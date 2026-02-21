from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import Session as Neo4jSession
from app.database import get_neo4j_session
from app.schemas.network import NetworkResponse, RootNetworkResponse
from app.services import network as network_service

# Préfixe automatique : tous les endpoints réseau seront sous /network
router = APIRouter(prefix="/network", tags=["Réseau sémantique"])


@router.get("/ayah/{surah_number}/{ayah_number}", response_model=NetworkResponse)
def get_ayah_network(
    surah_number: int,
    ayah_number: int,
    min_roots: int = Query(default=2, ge=1, le=10, description="Seuil minimum de racines partagées"),
    limit: int = Query(default=50, ge=1, le=200, description="Nombre max de voisins retournés"),
    session: Neo4jSession = Depends(get_neo4j_session),
):
    """
    Retourne le sous-graphe SHARES_ROOT autour d'un verset.
    Format compatible react-force-graph : {nodes, links}.
    Exemple : GET /network/ayah/2/255?min_roots=2&limit=50
    """
    result = network_service.get_ayah_network(
        session, surah_number, ayah_number, min_roots, limit,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Verset {surah_number}:{ayah_number} introuvable",
        )

    return result


@router.get("/root/{buckwalter}", response_model=RootNetworkResponse)
def get_root_network(
    buckwalter: str,
    max_nodes: int = Query(default=30, ge=5, le=100, description="Nombre max de versets affichés"),
    min_roots: int = Query(default=2, ge=1, le=10, description="Seuil minimum de racines partagées"),
    limit: int = Query(default=100, ge=1, le=500, description="Nombre max de liens retournés"),
    session: Neo4jSession = Depends(get_neo4j_session),
):
    """
    Retourne le sous-graphe des versets contenant une racine,
    avec leurs connexions SHARES_ROOT mutuelles.
    Format compatible react-force-graph : {nodes, links}.
    Exemple : GET /network/root/Elm?max_nodes=30&min_roots=2&limit=100
    """
    result = network_service.get_root_network(
        session, buckwalter, max_nodes, min_roots, limit,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Racine '{buckwalter}' introuvable",
        )

    return result