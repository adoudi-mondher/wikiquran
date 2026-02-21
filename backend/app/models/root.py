from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Root(Base):
    """Modèle SQLAlchemy — table `root`."""

    __tablename__ = "root"

    id                = Column(Integer,     primary_key=True)
    buckwalter        = Column(String(10),  nullable=False, unique=True)  # clé technique ex: ktb
    arabic            = Column(String(20),  nullable=False)               # affichage ex: كتب
    occurrences_count = Column(Integer,     default=0)                    # calculé à l'import
    created_at        = Column(DateTime,    server_default=func.now())

    # Relation vers les mots dérivés de cette racine
    words = relationship("Word", back_populates="root", lazy="select")
