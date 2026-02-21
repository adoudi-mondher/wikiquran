from sqlalchemy import Column, Integer, SmallInteger, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Surah(Base):
    """Modèle SQLAlchemy — table `surah`."""

    __tablename__ = "surah"

    id                   = Column(Integer,      primary_key=True, index=True)
    number               = Column(SmallInteger, nullable=False, unique=True)
    name_arabic          = Column(String(50),   nullable=False)
    name_en              = Column(String(100))
    name_transliteration = Column(String(100))
    revelation_order     = Column(SmallInteger, nullable=False)
    type                 = Column(String(10),   nullable=False)   # 'meccan' | 'medinan'
    ayas_count           = Column(SmallInteger, nullable=False)
    juz_start            = Column(SmallInteger)
    hizb_start           = Column(SmallInteger)
    page_start           = Column(SmallInteger)
    rukus                = Column(SmallInteger)
    created_at           = Column(DateTime, server_default=func.now())
