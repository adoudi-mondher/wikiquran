# =============================================================================
# WikiQuran — Dockerfile backend FastAPI
# Chemin cible sur le VPS : /opt/docker/wikiquran/backend/Dockerfile
# =============================================================================

# --- Étape 1 : image de base Python 3.12 slim (légère, stable, prod-ready) ---
FROM python:3.12-slim

# Métadonnées
LABEL maintainer="WikiQuran"
LABEL description="Backend FastAPI — WikiQuran Knowledge Graph"

# Variables d'environnement Python
# PYTHONDONTWRITEBYTECODE : pas de fichiers .pyc inutiles
# PYTHONUNBUFFERED : logs visibles immédiatement dans docker logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Répertoire de travail dans le conteneur
WORKDIR /app

# --- Étape 2 : dépendances système ---
# gcc + libpq-dev nécessaires pour compiler psycopg2-binary sur slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# --- Étape 3 : dépendances Python ---
# Copier requirements en premier pour profiter du cache Docker
# Si requirements.txt ne change pas, cette couche est mise en cache
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# --- Étape 4 : copie du code applicatif ---
COPY ./app ./app

# --- Étape 5 : utilisateur non-root (sécurité) ---
RUN useradd --create-home --shell /bin/bash wikiquran
USER wikiquran

# Port exposé (interne au réseau Docker — pas publié directement)
EXPOSE 8000

# --- Commande de démarrage ---
# workers=2 : adapté à 4 vCores OVH VPS-1 (règle : 2*vCores/2 pour un service parmi d'autres)
# host 0.0.0.0 : écoute sur toutes les interfaces (nécessaire pour Docker)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
