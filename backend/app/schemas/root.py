from pydantic import BaseModel


class AyahInRoot(BaseModel):
    """Schema d'un verset dans le contexte d'une racine."""

    surah_number: int
    surah_name_arabic: str
    ayah_number:  int
    text_arabic:  str

    model_config = {"from_attributes": True}


class RootResponse(BaseModel):
    """Schema de réponse pour une racine — avec ses versets paginés."""

    buckwalter:        str          # clé technique ex: ktb
    arabic:            str          # affichage ex: كتب
    occurrences_count: int          # total des occurrences dans le Coran
    page:              int          # page courante
    limit:             int          # versets par page
    total_pages:       int          # nombre total de pages
    ayahs:             list[AyahInRoot]  # versets de la page courante

    model_config = {"from_attributes": True}
