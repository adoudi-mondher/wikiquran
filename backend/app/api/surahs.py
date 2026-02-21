from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_pg_session
from app.models.surah import Surah
from app.schemas.surah import SurahResponse, SurahListResponse

# Préfixe automatique : tous les endpoints ici seront sous /surahs
router = APIRouter(prefix="/surahs", tags=["Sourates"])


@router.get("", response_model=SurahListResponse)
def get_surahs(db: Session = Depends(get_pg_session)):
    """
    Retourne la liste des 114 sourates triées par numéro.
    """
    surahs = db.query(Surah).order_by(Surah.number).all()

    return SurahListResponse(
        total=len(surahs),
        surahs=surahs,
    )


@router.get("/{number}", response_model=SurahResponse)
def get_surah(number: int, db: Session = Depends(get_pg_session)):
    """
    Retourne le détail d'une sourate par son numéro (1-114).
    """
    surah = db.query(Surah).filter(Surah.number == number).first()

    if not surah:
        raise HTTPException(status_code=404, detail=f"Sourate {number} introuvable")

    return surah
