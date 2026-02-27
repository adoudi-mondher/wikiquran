# 🕌 WikiQuran — Roadmap détaillée

> Suivi des tâches par phase — mis à jour le 27 février 2026

---

## ✅ Phase 1 — Extraction & Data `TERMINÉE`

- [x] Brainstorming vision & positionnement
- [x] Identification des sources (Tanzil + Corpus Quran)
- [x] Décisions d'architecture (ACID/BASE, PostgreSQL master, Neo4j dérivé)
- [x] Modélisation PostgreSQL (5 tables + indexes + vue analytique)
- [x] Modélisation Neo4j (4 nœuds + relations dont `SHARES_ROOT`)
- [x] Création structure projet + Git + venv
- [x] `buckwalter.py` — convertisseur Buckwalter → Arabe (sans lib externe)
- [x] `explore_tanzil.py` — exploration des fichiers sources
- [x] `parse_tanzil.py` — extraction texte arabe + métadonnées sourates
- [x] `parse_corpus.py` — extraction racines + morphologie (fix 486 doublons)
- [x] `normalize.py` — fusion et normalisation → `wikiquran_final.json`
- [x] Validation : 114 sourates | 6 236 versets | 1 642 racines | 12 113 mots | 77 429 occurrences

---

## ✅ Phase 2 — Base de données `TERMINÉE`

### Docker ✅
- [x] `docker-compose.yml` — PostgreSQL 17-alpine + Neo4j 5.26.21 LTS Community
- [x] PostgreSQL healthy — 5 tables créées automatiquement via `schema_postgresql.sql`
- [x] Neo4j healthy — base vide prête

### Import PostgreSQL ✅
- [x] `scripts/database/import_postgres.py`
  - [x] Connexion PostgreSQL via `.env`
  - [x] Import `surah` (114 lignes)
  - [x] Import `ayah` (6 236 lignes)
  - [x] Import `root` (1 642 lignes)
  - [x] Import `word` (12 113 lignes)
  - [x] Import `word_occurrence` (77 429 lignes)
  - [x] Validation 5/5 tables correctes
  - [x] Idempotent — relançable sans doublons (UPSERT)

### Synchronisation Neo4j ✅
- [x] `scripts/database/import_neo4j.py`
  - [x] Contraintes d'unicité + index analytiques
  - [x] Import nœuds : 114 Surah | 6 236 Ayah | 1 642 Root | 12 110 Word
  - [x] Relations : 6 236 HAS_AYAH | 77 429 CONTAINS | 11 644 DERIVED_FROM
  - [x] Calcul et import `SHARES_ROOT` : **6 035 766 relations** (différenciateur clé)
  - [x] Validation croisée PostgreSQL ↔ Neo4j

### Notes Phase 2
- 3 mots orphelins sans occurrence ignorés (artefacts parser, sans impact analytique)
- `SHARES_ROOT` calculé en SQL puis importé dans Neo4j (plus performant)
- Pas d'Alembic — ajout prévu en Phase 6

---

## ✅ Phase 3 — Backend API `TERMINÉE`

### Setup ✅
- [x] Structure `backend/app/` (FastAPI + SQLAlchemy + Pydantic)
- [x] Connexion PostgreSQL (config + session SQLAlchemy)
- [x] Connexion Neo4j (driver Bolt)
- [x] `main.py` — point d'entrée FastAPI
- [x] `config.py` — settings via `.env` (pydantic-settings)

### Endpoints PostgreSQL ✅
- [x] `GET /surahs` — liste des 114 sourates
- [x] `GET /surah/{number}` — détail sourate + ses versets
- [x] `GET /ayah/{surah}/{verse}` — détail verset
- [x] `GET /search?q=...` — recherche full-text arabe (normalisation diacritiques)
- [x] `GET /root/{buckwalter}` — détail racine + versets associés

### Endpoints Neo4j ✅
- [x] `GET /network/ayah/{surah}/{verse}` — sous-graphe `SHARES_ROOT` d'un verset
- [x] `GET /network/root/{buckwalter}` — tous les versets d'une racine (sort mushaf/connected)
- [x] `GET /analytics/top-roots` — racines les plus fréquentes (limit max 100)
- [x] `GET /analytics/meccan-vs-medinan` — comparaison analytique par période

### Qualité ✅
- [x] Schemas Pydantic pour chaque endpoint
- [x] Gestion des erreurs (404, 422, 500)
- [x] Documentation Swagger auto-générée (`/docs`)
- [ ] Tests endpoints basiques (reporté Phase 6)

### Architecture backend
- SOLID : routes / services / schemas séparés
- "Fail fast" : erreur au démarrage si variables manquantes
- Algorithme v2 connectivity-based sorting pour `/network/root/`

---

## ✅ Phase 4 — Frontend `TERMINÉE`

### Setup ✅
- [x] React 19 + Vite + TailwindCSS v4 + TypeScript
- [x] Support RTL natif (arabe)
- [x] Système i18n (`lib/i18n/ar.ts`)
- [x] Thème light/dark (ThemeProvider + ThemeToggle)
- [x] Client API centralisé (`api/client.ts` + proxy Vite)
- [x] TanStack Query (React Query v5) pour le cache

### Graphe interactif ✅
- [x] `SharesRootGraph` — ForceGraph2D (WebGL)
- [x] Mode verset : sous-graphe autour d'un verset
- [x] Mode racine : versets partageant une racine (sort=connected)
- [x] Toggle mode آية / جذر
- [x] Select racine (top 100 racines)
- [x] Filtres client : mecquois/médinois + racine secondaire
- [x] AyahPanel — panneau latéral au click sur nœud
- [x] GraphLegend — légende dynamique avec couleurs par sourate
- [x] GraphStats — stats en temps réel (sourates, ratio, top racine)
- [x] Bandeau racine active (mode racine)
- [x] Opacité adaptative des liens (densité → transparence)
- [x] Deep linking URL params (`?mode=root&root=ktb`)

### Dashboard analytique ✅
- [x] Page `/dashboard` — DashboardPage
- [x] Onglets الكل / مكّية / مدنية
- [x] Top 20 racines (barres horizontales cliquables)
- [x] Distribution Zipf (recharts AreaChart)
- [x] Click racine → deep link vers graphe mode racine

### Navigation & UX ✅
- [x] AppLayout avec liens الشبكة / تحليل الجذور
- [x] Routes : `/graph` + `/dashboard`
- [x] Guide d'utilisation (GuideModal) — auto premier visit + bouton ؟
- [x] Tooltips liens enrichis (16px bold)

### Restant (reporté Phase 6) ⏭️
- [ ] Surbrillance racine dans le texte du verset (nécessite endpoint `/ayah/{s}/{v}/words`)
- [ ] Recherche full-text arabe (page ou composant)
- [ ] Polish UX (responsive, animations, feedback utilisateur)

---

## ✅ Phase 5 — Déploiement VPS OVH `TERMINÉE`

### Infrastructure ✅
- [x] VPS OVH Debian — user non-root + Docker + Compose v2 + UFW
- [x] Swap 4Go configuré (nécessaire pour import Neo4j 6M relations)
- [x] Structure projet : `/opt/docker/wikiquran/`
- [x] Clone GitHub via HTTPS

### Fichiers de déploiement ✅
- [x] `Dockerfile` backend FastAPI (Python 3.12-slim, 2 workers uvicorn)
- [x] `docker-compose.prod.yml` (PG + Neo4j + Backend + Frontend nginx)
- [x] `nginx.frontend.conf` (SPA routing + gzip + cache assets Vite)
- [x] `.env.prod.example` — template variables (commité)
- [x] `frontend/.env.production` — `VITE_API_URL=https://api.quranicdata.org`

### Backend ✅
- [x] `config.py` — `CORS_ORIGINS` dynamique depuis `.env`
- [x] `main.py` — endpoint `/health` + CORS depuis settings
- [x] `client.ts` — `VITE_API_URL` avec fallback `/api` dev
- [x] `requirements.txt` déplacé dans `backend/`
- [x] Scripts import alignés sur variables `POSTGRES_*`

### Domaine & SSL ✅
- [x] Domaine `quranicdata.org` acheté sur Infomaniak
- [x] DNS A Records configurés (`@`, `www`, `api`)
- [x] Nginx Proxy Manager — Proxy Host `quranicdata.org` + SSL Let's Encrypt
- [x] Nginx Proxy Manager — Proxy Host `api.quranicdata.org` + SSL Let's Encrypt
- [x] `www.quranicdata.org` → redirect vers `quranicdata.org`

### Import données ✅
- [x] Schéma PostgreSQL créé via `schema_postgresql.sql`
- [x] Import PostgreSQL — 114 sourates | 6 236 versets | 77 429 occurrences
- [x] Import Neo4j — 6 035 766 relations SHARES_ROOT

### Notes Phase 5
- Réseau Docker NPM : `n8n_proxy-network` (héritage install n8n)
- Mot de passe Neo4j : hex uniquement (éviter `/` dans `NEO4J_AUTH`)
- Swap indispensable pour calcul SHARES_ROOT (OOM Killer sans swap)
- `nohup docker exec` pour import long sans risque de déconnexion SSH
- `APP_ENV` injecté via `env_file` dans docker-compose (pas `docker cp`)

### Restant (reporté) ⏭️
- [ ] Alembic — migrations PostgreSQL (avant Phase 6)
- [ ] `deploy.sh` — script de déploiement simplifié
- [ ] CI/CD GitHub Actions (Phase 6+)
- [ ] Audit sécurité (session dédiée)
- [ ] Monitoring basique (logs + healthchecks)

---

## ⏳ Phase 6 — Enrichissement `PROCHAINE ÉTAPE`

### Frontend (améliorations) ⏭️
- [ ] Polish UX (responsive mobile, animations, feedback utilisateur)
- [ ] Surbrillance racine dans le texte du verset (endpoint `/ayah/{s}/{v}/words`)
- [ ] Recherche full-text arabe (page ou composant)

### Données & Backend ⏭️
- [ ] Personnages & Prophètes (`Person`, `CO_MENTIONED`)
  - [ ] Extraction depuis corpus.quran.com (tag `PN`)
  - [ ] Import PostgreSQL + Neo4j
  - [ ] Person × Root : vocabulaire autour de chaque prophète
  - [ ] Person × meccan/medinan : évolution narrative
  - [ ] Réseau de co-mentions
- [ ] Thèmes & Concepts (`Theme`, `HAS_THEME`)
  - [ ] Clustering automatique par densité de racines (data-driven)
- [ ] Table `morpheme` (préfixes/suffixes ignorés en Phase 1)
- [ ] Alembic — migrations PostgreSQL
- [ ] Tests endpoints basiques

### Infrastructure ⏭️
- [ ] `deploy.sh` — script de déploiement simplifié
- [ ] CI/CD GitHub Actions
- [ ] Audit sécurité complet
- [ ] Monitoring basique (logs + healthchecks)
- [ ] API publique documentée et versionnée
- [ ] Support multilingue (français, anglais)

---

## 📐 Décisions d'architecture figées

| Décision | Choix |
|----------|-------|
| Texte arabe | Uthmani uniquement (Phase 1) |
| Stockage racines | Buckwalter (clé) + Arabe (affichage) |
| Mots | Uniques dans `word` + occurrences dans `word_occurrence` |
| PostgreSQL | Master ACID — source de vérité |
| Neo4j | Dérivé BASE — reconstruit depuis PostgreSQL |
| Pont PG ↔ Neo4j | `pg_id` sur chaque nœud Neo4j |
| SHARES_ROOT | Calculé en SQL, importé en batch dans Neo4j |
| Migrations | Alembic reporté en Phase 6 |
| Déploiement | VPS OVH Debian — Nginx Proxy Manager existant |
| Réseau Docker NPM | `n8n_proxy-network` (existant, partagé) |
| Réseau Docker WikiQuran | `wikiquran-internal` (isolé, BDD jamais exposées) |
| Frontend prod | nginx:alpine servant build Vite statique |
| Versioning deps | `venv` + `pip` + `requirements.txt` |
| Interpréteur VSCode | `.venv\Scripts\python.exe` (Pylance) |
| Docker backend local | Non — Dockerfile créé au déploiement |
| Tri mode racine | `sort=connected` par défaut |
| Node.js VPS | v22 LTS (build frontend uniquement) |
| Swap VPS | 4Go (nécessaire import Neo4j) |

---

## 📊 Stats finales

| Élément | PostgreSQL | Neo4j |
|---------|-----------|-------|
| Sourates | 114 | 114 |
| Versets | 6 236 | 6 236 |
| Racines | 1 642 | 1 642 |
| Mots | 12 113 | 12 110 |
| Occurrences | 77 429 | — |
| HAS_AYAH | — | 6 236 |
| CONTAINS | — | 77 429 |
| DERIVED_FROM | — | 11 644 |
| **SHARES_ROOT** | — | **6 035 766** |

---

**Dernière mise à jour :** 27 février 2026
**Statut :** ✅ Phases 1, 2, 3, 4, 5 terminées — ⏳ Phase 6 Enrichissement prochaine étape
**Version :** 0.4.0
**URL prod :** https://quranicdata.org