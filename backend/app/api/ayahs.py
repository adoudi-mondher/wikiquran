from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_pg_session
from app.schemas.ayah import AyahResponse
from app.services import ayah as ayah_service

# Préfixe automatique : tous les endpoints ici seront sous /ayah
router = APIRouter(prefix="/ayah", tags=["Versets"])


@router.get("/{surah_number}/{ayah_number}", response_model=AyahResponse)
def get_ayah(
    surah_number: int,
    ayah_number: int,
    db: Session = Depends(get_pg_session),
):
    """
    Retourne un verset par son numéro de sourate et son numéro de verset.
    Exemple : GET /ayah/2/255 → Ayat al-Kursi
    """
    ayah = ayah_service.get_ayah(db, surah_number, ayah_number)

    if not ayah:
        raise HTTPException(
            status_code=404,
            detail=f"Verset {surah_number}:{ayah_number} introuvable",
        )

    return ayah
