from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Word(Base):
    """Modèle SQLAlchemy — table `word`."""

    __tablename__ = "word"

    id               = Column(Integer,      primary_key=True)
    text_arabic      = Column(String(100),  nullable=False, unique=True)  # forme exacte du mot
    root_id          = Column(Integer,      ForeignKey("root.id"), nullable=True)  # nullable : mots sans racine
    lemma_buckwalter = Column(String(50))   # forme de base (Buckwalter)
    pos              = Column(String(10))   # partie du discours : N, V, P, ADJ...
    created_at       = Column(DateTime,     server_default=func.now())

    # Relation vers la racine parente (nullable)
    root = relationship("Root", back_populates="words", lazy="joined")

    # Relation vers les occurrences de ce mot dans les versets
    occurrences = relationship("WordOccurrence", back_populates="word", lazy="select")
