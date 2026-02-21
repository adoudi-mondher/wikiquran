from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_pg_session
from app.schemas.root import RootResponse
from app.services import root as root_service

# Préfixe automatique : tous les endpoints ici seront sous /root
router = APIRouter(prefix="/root", tags=["Racines"])


@router.get("/{buckwalter}", response_model=RootResponse)
def get_root(
    buckwalter: str,
    page:  int = Query(default=1,  ge=1,          description="Numéro de page (commence à 1)"),
    limit: int = Query(default=20, ge=1,  le=100,  description="Nombre de versets par page (max 100)"),
    db: Session = Depends(get_pg_session),
):
    """
    Retourne une racine arabe avec ses versets paginés.
    Exemple : GET /root/ktb?page=1&limit=20 → racine كتب + 20 premiers versets
    """
    root = root_service.get_root(db, buckwalter, page, limit)

    if not root:
        raise HTTPException(
            status_code=404,
            detail=f"Racine '{buckwalter}' introuvable",
        )

    return root
