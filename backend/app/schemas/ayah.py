from pydantic import BaseModel


class AyahResponse(BaseModel):
    """Schema de réponse pour un verset — ce que l'API retourne au client."""

    id:                int
    surah_number:      int        # Numéro de la sourate parente
    surah_name_arabic: str        # Nom arabe de la sourate parente
    number:            int        # Numéro du verset dans la sourate
    text_arabic:       str        # Texte arabe complet (Uthmani)

    model_config = {"from_attributes": True}
