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
- [x] `parse_corpus.py` — extraction racines + morphologie
- [x] `normalize.py` — fusion et normalisation → `wikiquran_final.json`
- [x] Validation : 114 sourates | 6 236 versets | 1 642 racines | 12 113 mots | 77 915 occurrences

---

## 🔄 Phase 2 — Base de données `EN COURS`

### Docker ✅
- [x] `docker-compose.yml` — PostgreSQL 17 + Neo4j 5.26 LTS
- [x] PostgreSQL healthy — 5 tables créées automatiquement
- [x] Neo4j healthy — base vide prête

### Import PostgreSQL ⏳
- [ ] `scripts/database/import_postgres.py`
  - [ ] Connexion PostgreSQL via `.env`
  - [ ] Import `surah` (114 lignes)
  - [ ] Import `ayah` (6 236 lignes)
  - [ ] Import `root` (1 642 lignes)
  - [ ] Import `word` (12 113 lignes)
  - [ ] Import `word_occurrence` (77 915 lignes)
  - [ ] Validation counts après import
  - [ ] Gestion des conflits (idempotent — relançable sans doublons)

### Synchronisation Neo4j ⏳
- [ ] `scripts/database/import_neo4j.py`
  - [ ] Création contraintes d'unicité
  - [ ] Import nœuds `Surah`, `Ayah`, `Word`, `Root`
  - [ ] Import relations `HAS_AYAH`, `CONTAINS`, `DERIVED_FROM`
  - [ ] Calcul et import `SHARES_ROOT` (la relation clé analytique)
  - [ ] Validation counts nœuds + relations

---

## ⏳ Phase 3 — Backend API `À VENIR`

- [ ] Setup FastAPI + SQLAlchemy + Pydantic
- [ ] Connexion PostgreSQL (config + session)
- [ ] Connexion Neo4j (driver Bolt)
- [ ] `GET /surahs` — liste des sourates
- [ ] `GET /surah/{number}` — détail sourate + versets
- [ ] `GET /ayah/{surah}/{verse}` — détail verset
- [ ] `GET /search?q=...` — recherche full-text arabe
- [ ] `GET /root/{buckwalter}` — détail racine + versets
- [ ] `GET /network/{ayah}` — sous-graphe `SHARES_ROOT`
- [ ] `GET /analytics/top-roots` — racines les plus fréquentes
- [ ] `GET /analytics/meccan-vs-medinan` — comparaison analytique
- [ ] Documentation Swagger auto-générée

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
- [ ] Table `morpheme` (préfixes/suffixes Phase 1 ignorés)
- [ ] API publique documentée (versionnée)

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
| Migrations | Pas d'Alembic en Phase 2 — ajout en Phase 5 |
| Déploiement | VPS OVH (pas Render/Vercel pour le backend) |
| Versioning deps | `venv` + `pip` + `requirements.txt` |

---

**Dernière mise à jour :** Février 2026
**Prochaine étape :** `import_postgres.py`
