from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import close_neo4j
from app.api import surahs
from app.api import ayahs
from app.api import roots
from app.api import search
from app.api import network
from app.api import analytics
from app.models import surah  # noqa
from app.models import ayah   # noqa
from app.models import root          # noqa
from app.models import word          # noqa
from app.models import word_occurrence  # noqa


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestion du cycle de vie de l'app :
    - Démarrage : rien à faire (SQLAlchemy + Neo4j se connectent à la première requête)
    - Arrêt     : fermeture propre du driver Neo4j
    """
    yield  # L'app tourne ici
    close_neo4j()


app = FastAPI(
    title="Quranic data API",
    description="Knowledge Graph du Coran — API REST",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS — origines chargées depuis .env (dev et prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ─── Routers ───────────────────────────────────────────────
app.include_router(surahs.router)
app.include_router(ayahs.router)
app.include_router(roots.router)
app.include_router(search.router)
app.include_router(network.router)
app.include_router(analytics.router)

# ─── Healthcheck ───────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    """Vérifie que l'API est en ligne — utilisé par Docker healthcheck."""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
    }

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
        "docs": "https://api.quranicdata.org/docs",  # ← guide vers /docs
    }