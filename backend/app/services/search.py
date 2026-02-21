import re
from math import ceil
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.ayah import Ayah
from app.models.surah import Surah
from app.schemas.search import SearchResponse, AyahInSearch


# ─── Normalisation arabes ───────────────────────────────────────────────────

# Plage complète des diacritiques + signes coraniques Uthmani — pour Python re.sub
DIACRITICS_PATTERN_PY = (
    "[\u0610-\u061A"   # Arabic extended (signes coraniques)
    "\u064B-\u065F"    # Tashkeel standard (fatha, damma, kasra...)
    "\u0670"           # Superscript alef (ٰ)
    "\u06D6-\u06DC"    # Signes coraniques supérieurs
    "\u06DF-\u06ED]"   # Autres signes Uthmani
)

# Même plage pour PostgreSQL regexp_replace — raw string
DIACRITICS_PATTERN_PG = (
    r"[\u0610-\u061A"
    r"\u064B-\u065F"
    r"\u0670"
    r"\u06D6-\u06DC"
    r"\u06DF-\u06ED]"
)

# Variantes d'Alef dans le texte Uthmani → Alef simple ا
ALEF_MAP = {
    "\u0671": "\u0627",  # ٱ Alef Wasla  → ا (très fréquent en Uthmani)
    "\u0622": "\u0627",  # آ Alef Madda  → ا
    "\u0623": "\u0627",  # أ Alef Hamza dessus → ا
    "\u0625": "\u0627",  # إ Alef Hamza dessous → ا
}


def _normalize_py(text: str) -> str:
    """
    Normalise un texte arabe côté Python :
    1. Supprime tous les diacritiques et signes coraniques Uthmani
    2. Normalise les variantes d'Alef vers Alef simple ا
    """
    text = re.sub(DIACRITICS_PATTERN_PY, "", text)
    for variante, alef_simple in ALEF_MAP.items():
        text = text.replace(variante, alef_simple)
    return text


def _normalize_pg(column):
    """
    Normalise une colonne arabe côté PostgreSQL :
    1. Supprime les diacritiques via regexp_replace
    2. Normalise les variantes d'Alef via translate()
    """
    stripped = func.regexp_replace(column, DIACRITICS_PATTERN_PG, "", "g")
    return func.translate(stripped, "\u0671\u0622\u0623\u0625", "\u0627\u0627\u0627\u0627")


# ─── Service ────────────────────────────────────────────────────────────────

def search_ayahs(
    db: Session,
    query: str,
    page: int = 1,
    limit: int = 20,
) -> SearchResponse:
    """
    Recherche des versets contenant le terme arabe donné.
    - Diacritiques ignorés des deux côtés (Python + PostgreSQL)
    - Variantes d'Alef normalisées (Alef Wasla, Madda, Hamza...)
    - Utilise l'index trigramme GIN pour la performance
    """
    # Normalisation du terme côté Python
    query_normalized = _normalize_py(query)
    terme = f"%{query_normalized}%"

    # Requête de base — jointure Ayah → Surah
    base_query = (
        db.query(Ayah)
        .join(Surah, Surah.id == Ayah.surah_id)
        .filter(_normalize_pg(Ayah.text_arabic).like(terme))
        .order_by(Ayah.id)
    )

    # Compter le total pour la pagination
    total = base_query.count()
    total_pages = ceil(total / limit) if total > 0 else 1

    # Récupérer la page courante
    ayahs = (
        base_query
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    # Assembler la réponse
    return SearchResponse(
        query=query,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        results=[
            AyahInSearch(
                surah_number=ayah.surah.number,
                surah_name_arabic=ayah.surah.name_arabic,
                ayah_number=ayah.number,
                text_arabic=ayah.text_arabic,
            )
            for ayah in ayahs
        ],
    )