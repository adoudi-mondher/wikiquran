from fastapi import APIRouter, Depends, Query
from neo4j import Session as Neo4jSession
from app.database import get_neo4j_session
from app.schemas.analytics import TopRootsResponse, MeccanMedinanResponse
from app.services import analytics as analytics_service

# Préfixe automatique : tous les endpoints analytiques sous /analytics
router = APIRouter(prefix="/analytics", tags=["Analytique"])


@router.get("/top-roots", response_model=TopRootsResponse)
def get_top_roots(
    limit: int = Query(default=20, ge=1, le=100, description="Nombre de racines à retourner"),
    session: Neo4jSession = Depends(get_neo4j_session),
):
    """
    Retourne les racines classées par nombre de versets distincts.
    Exemple : GET /analytics/top-roots?limit=20
    """
    return analytics_service.get_top_roots(session, limit)


@router.get("/meccan-vs-medinan", response_model=MeccanMedinanResponse)
def get_meccan_vs_medinan(
    limit: int = Query(default=20, ge=1, le=100, description="Nombre de racines par période"),
    session: Neo4jSession = Depends(get_neo4j_session),
):
    """
    Compare les top racines entre sourates mecquoises et médinoises.
    Exemple : GET /analytics/meccan-vs-medinan?limit=20
    """
    return analytics_service.get_meccan_vs_medinan(session, limit)
