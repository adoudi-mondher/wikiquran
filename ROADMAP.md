# 🕌 WikiQuran — Roadmap détaillée

> Suivi des tâches par phase — mis à jour en Février 2026

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
- Pas d'Alembic — ajout prévu en Phase 5 (prod)

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
- [x] `GET /search?q=...` — recherche full-text arabe (normalisation diacritiques Uthmani)
- [x] `GET /root/{buckwalter}` — détail racine + versets associés (pagination)

### Endpoints Neo4j ✅
- [x] `GET /network/ayah/{surah}/{verse}` — sous-graphe `SHARES_ROOT` d'un verset
  - [x] Leviers A (min_roots) + B (limit), profondeur 1
  - [x] Format react-force-graph : `{nodes, links, center, meta}`
- [x] `GET /network/root/{buckwalter}` — sous-graphe des versets d'une racine
  - [x] v1 : tri Mushaf (ordre Coran)
  - [x] v2 : tri connectivité (versets les plus connectés entre eux)
  - [x] Paramètre `?sort=mushaf|connected`
- [x] `GET /analytics/top-roots` — racines classées par nombre de versets distincts
- [x] `GET /analytics/meccan-vs-medinan` — comparaison vocabulaire par période de révélation

### Qualité ✅
- [x] Schemas Pydantic pour chaque endpoint
- [x] Gestion des erreurs (404, 422) — validation déclarative via FastAPI Query
- [x] Documentation Swagger auto-générée (`/docs`)
- [x] Tests manuels edge cases (6/6 passés)
- [x] Fix SAWarning back_populates Ayah ↔ WordOccurrence

### Notes Phase 3
- Architecture SOLID : routes (HTTP) / services (logique) / schemas (contrats)
- Approche B pour les défauts : valeurs par défaut uniquement dans les routes
- Design A pour SHARES_ROOT : une relation par racine partagée (granularité maximale)
- Performance `sort=connected` : ~4.6s pour racines fréquentes (optimisation prévue Phase 5)
- 9 endpoints au total : 5 PostgreSQL + 4 Neo4j

---

## ⏳ Phase 4 — Frontend `À VENIR`

- [ ] Setup React + Vite + TailwindCSS + TypeScript
- [ ] Support RTL natif (arabe)
- [ ] Page liste / recherche sourates
- [ ] Page détail verset (texte arabe + métadonnées)
- [ ] Page racine (liste des versets liés)
- [ ] Page graphe interactif (`react-force-graph` / ForceGraph2D)
  - [ ] Visualisation `SHARES_ROOT`
  - [ ] Filtres par type (mecquois/médinois)
  - [ ] Filtres par racine
  - [ ] Click sur nœud → détail verset

---

## ⏳ Phase 5 — Déploiement VPS OVH `À VENIR`

- [ ] Configuration VPS OVH (Ubuntu + Docker)
- [ ] `Dockerfile` backend FastAPI
- [ ] `docker-compose.prod.yml` (PostgreSQL + Neo4j + Backend + Nginx)
- [ ] Configuration Nginx (reverse proxy)
- [ ] Certificat SSL (Let's Encrypt)
- [ ] Alembic — migrations PostgreSQL
- [ ] CI/CD GitHub Actions → déploiement automatique
- [ ] Frontend → Vercel (ou VPS)
- [ ] Monitoring basique (logs + healthchecks)

---

## 🔮 Phase 6 — Enrichissement `FUTUR`

- [ ] Personnages & Prophètes (`Person`, `CO_MENTIONED`)
  - [ ] Extraction depuis corpus.quran.com (tag `PN`)
  - [ ] Import PostgreSQL + Neo4j
- [ ] Thèmes & Concepts (`Theme`, `HAS_THEME`)
  - [ ] Évaluation ontologie corpus.quran.com
  - [ ] ou enrichissement via LLM (à décider)
- [ ] Table `morpheme` (préfixes/suffixes ignorés en Phase 1)
- [ ] API publique documentée et versionnée

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
| Migrations | Pas d'Alembic en Phase 2-4 — ajout en Phase 5 |
| Déploiement | VPS OVH (nginx + docker-compose) |
| Versioning deps | `venv` + `pip` + `requirements.txt` |
| Interpréteur VSCode | `.venv\Scripts\python.exe` (Pylance) |
| SHARES_ROOT Design | Design A — une relation par racine (granularité maximale) |
| Défauts Query params | Approche B — défauts uniquement dans les routes |
| Format graphe API | react-force-graph : `{nodes, links}` avec `group` = surah_number |
| Performance SHARES_ROOT | Leviers A (min_roots) + B (limit), profondeur 1 |
| Architecture backend | SOLID : routes / services / schemas (3 couches) |

---

## 📊 Stats finales Phase 2

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

**Dernière mise à jour :** Février 2026
**Statut :** ✅ Phase 1, 2 & 3 terminées — ⏳ Phase 4 Frontend à venir
**Version :** 0.4.0