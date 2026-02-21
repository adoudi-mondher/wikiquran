from sqlalchemy import Column, Integer, SmallInteger, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Ayah(Base):
    """Modèle SQLAlchemy — table `ayah`."""

    __tablename__ = "ayah"

    id          = Column(Integer,      primary_key=True)
    surah_id    = Column(Integer,      ForeignKey("surah.id"), nullable=False)
    number      = Column(SmallInteger, nullable=False)
    text_arabic = Column(Text,         nullable=False)
    created_at  = Column(DateTime,     server_default=func.now())

    # Relation vers le modèle Surah — JOIN automatique en une seule requête
    surah = relationship("Surah", back_populates="ayahs", lazy="joined")    
