from sqlalchemy import Column, Integer, SmallInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WordOccurrence(Base):
    """Modèle SQLAlchemy — table `word_occurrence`.
    Table pivot entre word et ayah — chaque apparition d'un mot dans un verset.
    """

    __tablename__ = "word_occurrence"

    id         = Column(Integer,      primary_key=True)
    word_id    = Column(Integer,      ForeignKey("word.id"),  nullable=False)
    ayah_id    = Column(Integer,      ForeignKey("ayah.id"),  nullable=False)
    position   = Column(SmallInteger, nullable=False)          # position du mot dans le verset (1-based)
    created_at = Column(DateTime,     server_default=func.now())

    # Relation vers le mot
    word = relationship("Word", back_populates="occurrences", lazy="joined")

    # Relation vers le verset — lazy="joined" pour récupérer le texte arabe directement
    ayah = relationship("Ayah", lazy="joined")
