from math import ceil
from sqlalchemy.orm import Session
from app.models.root import Root
from app.models.word import Word
from app.models.word_occurrence import WordOccurrence
from app.models.ayah import Ayah
from app.models.surah import Surah
from app.schemas.root import RootResponse, AyahInRoot


def get_root(
    db: Session,
    buckwalter: str,
    page: int = 1,
    limit: int = 20,
) -> RootResponse | None:
    """
    Récupère une racine par son code Buckwalter avec ses versets paginés.
    Retourne None si la racine n'existe pas.
    """
    # Étape 1 : vérifier que la racine existe
    root = db.query(Root).filter(Root.buckwalter == buckwalter).first()

    if not root:
        return None

    # Étape 2 : construire la requête de base — 4 jointures
    # root → word → word_occurrence → ayah → surah
    base_query = (
        db.query(Ayah)
        .join(WordOccurrence, WordOccurrence.ayah_id == Ayah.id)
        .join(Word,           Word.id == WordOccurrence.word_id)
        .join(Root,           Root.id == Word.root_id)
        .join(Surah,          Surah.id == Ayah.surah_id)
        .filter(Root.buckwalter == buckwalter)
        .distinct(Ayah.id)   # un verset peut contenir plusieurs mots de la même racine
    )

    # Étape 3 : compter le total des versets distincts pour la pagination
    total = base_query.count()
    total_pages = ceil(total / limit) if total > 0 else 1

    # Étape 4 : récupérer les versets de la page courante
    ayahs = (
        base_query
        .order_by(Ayah.id)                  # ordre stable : surah 1→114, verset 1→n
        .offset((page - 1) * limit)         # sauter les pages précédentes
        .limit(limit)                        # limiter au nombre demandé
        .all()
    )

    # Étape 5 : assembler la réponse
    return RootResponse(
        buckwalter=root.buckwalter,
        arabic=root.arabic,
        occurrences_count=root.occurrences_count,
        page=page,
        limit=limit,
        total_pages=total_pages,
        ayahs=[
            AyahInRoot(
                surah_number=ayah.surah.number,
                ayah_number=ayah.number,
                surah_name_arabic=ayah.surah.name_arabic,
                text_arabic=ayah.text_arabic,
            )
            for ayah in ayahs
        ],
    )
