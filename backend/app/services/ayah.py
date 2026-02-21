from sqlalchemy.orm import Session
from app.models.ayah import Ayah
from app.models.surah import Surah
from app.schemas.ayah import AyahResponse


def get_ayah(db: Session, surah_number: int, ayah_number: int) -> AyahResponse | None:
    """
    Récupère un verset par son numéro de sourate et son numéro de verset.
    Retourne None si le verset n'existe pas.
    """
    # Jointure Ayah → Surah pour récupérer les infos de la sourate en une seule requête
    ayah = (
        db.query(Ayah)
        .join(Surah, Ayah.surah_id == Surah.id)
        .filter(Surah.number == surah_number)
        .filter(Ayah.number == ayah_number)
        .first()
    )

    if not ayah:
        return None

    # Assemblage de la réponse plate depuis les deux modèles
    return AyahResponse(
        id=ayah.id,
        surah_number=ayah.surah.number,
        surah_name_arabic=ayah.surah.name_arabic,
        number=ayah.number,
        text_arabic=ayah.text_arabic,
    )
