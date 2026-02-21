from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from neo4j import GraphDatabase
from app.config import settings


# ─────────────────────────────────────────────
# POSTGRESQL — SQLAlchemy (mode synchrone)
# ─────────────────────────────────────────────

# Moteur de connexion PostgreSQL
engine = create_engine(
    settings.postgres_url,
    pool_pre_ping=True,   # Vérifie que la connexion est vivante avant chaque requête
    echo=False,           # Passer à True pour afficher les requêtes SQL en dev
)

# Fabrique de sessions PostgreSQL
SessionLocal = sessionmaker(
    autocommit=False,  # On gère les transactions manuellement
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Classe de base dont héritent tous les modèles SQLAlchemy."""
    pass


def get_pg_session():
    """
    Générateur de session PostgreSQL.
    Utilisé comme dépendance FastAPI : Depends(get_pg_session).
    Ferme automatiquement la session après chaque requête.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────
# NEO4J — Driver Bolt officiel
# ─────────────────────────────────────────────

# Driver Neo4j — connexion unique partagée (thread-safe)
neo4j_driver = GraphDatabase.driver(
    settings.NEO4J_URI,
    auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
)


def get_neo4j_session():
    """
    Générateur de session Neo4j.
    Utilisé comme dépendance FastAPI : Depends(get_neo4j_session).
    Ferme automatiquement la session après chaque requête.
    """
    session = neo4j_driver.session()
    try:
        yield session
    finally:
        session.close()


def close_neo4j():
    """Ferme le driver Neo4j proprement — appelé au shutdown de l'app."""
    neo4j_driver.close()
