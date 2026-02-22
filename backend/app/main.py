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
    title="WikiQuran API",
    description="Knowledge Graph du Coran — API REST",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS — autorise le frontend React (dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Port par défaut de Vite
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
@app.get("/", tags=["Health"])
def root():
    """Vérifie que l'API est en ligne."""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
    }