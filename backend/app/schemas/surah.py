from pydantic import BaseModel
from typing import Optional


class SurahResponse(BaseModel):
    """Schema de réponse pour une sourate — ce que l'API retourne au client."""

    id:                   int
    number:               int
    name_arabic:          str
    name_en:              Optional[str]
    name_transliteration: Optional[str]
    revelation_order:     int
    type:                 str            # 'meccan' | 'medinan'
    ayas_count:           int
    juz_start:            Optional[int]
    hizb_start:           Optional[int]
    page_start:           Optional[int]
    rukus:                Optional[int]

    model_config = {"from_attributes": True}  # Pydantic v2 : lit les attributs SQLAlchemy


class SurahListResponse(BaseModel):
    """Schema de réponse pour la liste complète des sourates."""

    total:   int
    surahs:  list[SurahResponse]
