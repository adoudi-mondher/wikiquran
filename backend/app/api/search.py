from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_pg_session
from app.schemas.search import SearchResponse
from app.services import search as search_service

# Préfixe automatique : tous les endpoints ici seront sous /search
router = APIRouter(prefix="/search", tags=["Recherche"])


@router.get("", response_model=SearchResponse)
def search(
    q:     str = Query(...,        min_length=2, description="Terme de recherche en arabe"),
    page:  int = Query(default=1,  ge=1,         description="Numéro de page (commence à 1)"),
    limit: int = Query(default=20, ge=1, le=100, description="Nombre de résultats par page (max 100)"),
    db: Session = Depends(get_pg_session),
):
    """
    Recherche full-text dans les versets du Coran.
    Exemple : GET /search?q=الله&page=1&limit=20
    """
    # Sécurité — refuser une recherche vide ou trop courte après strip
    q = q.strip()
    if not q:
        raise HTTPException(
            status_code=422,
            detail="Le terme de recherche ne peut pas être vide",
        )

    return search_service.search_ayahs(db, q, page, limit)
