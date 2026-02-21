from pydantic import BaseModel


class AyahInSearch(BaseModel):
    """Schema d'un verset dans le contexte d'une recherche."""

    surah_number:      int
    surah_name_arabic: str
    ayah_number:       int
    text_arabic:       str

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    """Schema de réponse pour une recherche full-text — avec résultats paginés."""

    query:       str               # terme recherché tel que saisi par l'utilisateur
    total:       int               # nombre total de versets correspondants
    page:        int               # page courante
    limit:       int               # résultats par page
    total_pages: int               # nombre total de pages
    results:     list[AyahInSearch]  # versets de la page courante
