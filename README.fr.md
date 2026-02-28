# Coran · Réseau de Connaissance

> Base de données analytique du Coran, visualisée comme un graphe vivant — 100% data-driven, zéro interprétation religieuse.

**🌐 Production :** [quranicdata.org](https://quranicdata.org)

---

<div align="center">

[العربية](./README.md) · [English](./README.en.md) · [Français](./README.fr.md)

</div>

---

## Vision & Positionnement

WikiQuran n'est **pas** un Quran viewer. C'est le premier outil qui traite le Coran comme un **dataset analytique** et le visualise comme un **graphe vivant** — sans interprétation religieuse, uniquement les patterns que les données révèlent.

### Ce que le graphe révèle

- **Structure sémantique cachée** — racines arabes comme réseau neuronal du Coran
- **Évolution narrative** — différences linguistiques entre sourates mecquoises et médinoises
- **Patterns structurels** — répétitions, connexions et clusters thématiques data-driven

### Principes non négociables

- ✅ **Scalable** — chaque décision technique permet d'évoluer
- ✅ **Neutre** — les insights émergent des données, pas des auteurs
- ✅ **Analytique** — le Coran traité comme n'importe quel corpus linguistique

---

## La donnée

**Sources :** [tanzil.net](https://tanzil.net/download) / [corpus.quran.com](https://corpus.quran.com/download/default.jsp) *(données libres)*

| Élément | Volume |
|--------|--------|
| Sourates | 114 |
| Versets (Ayat) | 6 236 |
| Mots uniques | 12 113 |
| Racines arabes | 1 642 |
| Occurrences | 77 429 |
| Relations SHARES_ROOT | 6 035 766 |

### Stratégie d'extraction

| Source | Fichier | Contenu |
|--------|---------|---------|
| tanzil.net | `quran-uthmani.xml` | Texte arabe (orthographe Uthmani) |
| tanzil.net | `quran-data.xml` | Métadonnées : ordre révélation, type sourate, juz, hizb |
| corpus.quran.com | `morphology.txt` (TSV) | Racines + morphologie mot par mot |

---

## Architecture des données

### Principe fondamental

> **PostgreSQL est le master. Neo4j est un index graphe dérivé.**

- On n'écrit **jamais** directement dans Neo4j sans passer par PostgreSQL
- Si Neo4j est corrompu → reconstruction complète depuis PostgreSQL
- Chaque nœud Neo4j contient un `pg_id` → pont vers la source de vérité

### Frontière ACID / BASE

| | PostgreSQL (ACID) | Neo4j (BASE) |
|--|-------------------|--------------|
| **Rôle** | Source de vérité | Moteur d'exploration |
| **Garantie** | Transactions strictes | Disponibilité + performance |
| **Données** | Texte, métadonnées, occurrences | Relations, connexions, graphe |
| **Question type** | *"Que dit le verset 2:255 ?"* | *"Quels versets partagent ces racines ?"* |

---

## Modèle PostgreSQL

### Tables

```
surah ──< ayah ──< word_occurrence >── word >── root
```

| Table | Rôle | Clés notables |
|-------|------|--------------|
| `surah` | Sourates + métadonnées complètes | `revelation_order`, `type` |
| `ayah` | Versets + texte arabe Uthmani | `surah_id`, `number` |
| `root` | Racines uniques | `buckwalter` (clé), `arabic` (affichage) |
| `word` | Mots uniques | `root_id`, `lemma_buckwalter`, `pos` |
| `word_occurrence` | Chaque apparition d'un mot dans un verset | `word_id`, `ayah_id`, `position` |

### Décisions d'architecture

- ✅ **Mots uniques** dans `word` + occurrences dans `word_occurrence` (pattern many-to-many)
- ✅ **Buckwalter** comme clé technique, **Arabe** pour l'affichage (conversion à l'import)
- ✅ **Métadonnées Surah complètes** dès Phase 1 (juz, hizb, page Mushaf)
- ⏭️ **Morphologie Phase 6** : table `morpheme` pour préfixes/suffixes

---

## Modèle Neo4j

### Nœuds

| Nœud | Propriétés clés | Source |
|------|----------------|--------|
| `Surah` | `pg_id`, `number`, `type`, `revelation_order` | Phase 1 ✅ |
| `Ayah` | `pg_id`, `surah_number`, `ayah_number` | Phase 1 ✅ |
| `Word` | `pg_id`, `text_arabic`, `pos` | Phase 1 ✅ |
| `Root` | `pg_id`, `buckwalter`, `arabic`, `occurrences` | Phase 1 ✅ |
| `Person` | `pg_id`, `name_arabic`, `type` | Phase 6 ⏭️ |
| `Theme` | `pg_id`, `label_arabic` | Phase 6 ⏭️ |

### Relations

```cypher
(Surah)-[:HAS_AYAH]---------------------------------------->(Ayah)
(Ayah)-[:CONTAINS {position}]----------------------------->(Word)
(Word)-[:DERIVED_FROM]------------------------------------>(Root)
(Ayah)-[:SHARES_ROOT {root_bw, root_ar, count}]---------->(Ayah)   ← clé analytique Phase 1
(Ayah)-[:MENTIONS]----------------------------------------->(Person) ← Phase 6
(Person)-[:CO_MENTIONED {count}]-------------------------->(Person) ← Phase 6
(Ayah)-[:HAS_THEME]---------------------------------------->(Theme)  ← Phase 6
```

### La relation différenciante : `SHARES_ROOT`

Deux versets sont connectés s'ils partagent au moins une racine commune. `count` = nombre de racines partagées (poids de la relation). C'est ce qu'**aucun outil existant** ne propose visuellement.

```cypher
// Exemple : versets les plus connectés à Ayat al-Kursi
MATCH (a1:Ayah {surah_number: 2, ayah_number: 255})
      -[r:SHARES_ROOT]->(a2:Ayah)
RETURN a2.surah_number, a2.ayah_number, r.count AS racines_communes
ORDER BY racines_communes DESC
LIMIT 20;
```

---

## Stack Technique

### Frontend

| Outil | Rôle |
|-------|------|
| **React 19 + Vite** | Framework UI |
| **TailwindCSS v4** | Styling (support RTL arabe) |
| **react-force-graph** | Visualisation graphe (WebGL) |
| **TanStack Query v5** | Cache API |
| **TypeScript** | Typage |

### Backend

| Outil | Rôle |
|-------|------|
| **FastAPI** (Python 3.12) | API REST — 9 endpoints |
| **SQLAlchemy 2.0** | ORM PostgreSQL |
| **Pydantic v2** | Validation des données |

### Bases de données

| Outil | Rôle |
|-------|------|
| **PostgreSQL 17-alpine** | Textes, métadonnées, full-text search |
| **Neo4j 5.26 LTS Community** | Graphe de relations (6M+ SHARES_ROOT) |

### Infrastructure

| Environnement | Outils |
|--------------|--------|
| **Dev** | Docker Compose |
| **Prod** | VPS OVH Debian — Nginx Proxy Manager + Docker Compose |

---

## Roadmap

| Phase | Description | Statut |
|-------|-------------|--------|
| Phase 1 | Extraction & Data | ✅ Terminée |
| Phase 2 | Base de données | ✅ Terminée |
| Phase 3 | Backend API | ✅ Terminée |
| Phase 4 | Frontend | ✅ Terminée |
| Phase 5 | Déploiement VPS | ✅ Terminée |
| Phase 6 | Enrichissement | ⏳ En cours |

Détail complet dans [ROADMAP.md](./ROADMAP.md).

---

## Structure du projet

```
wikiquran/
│
├── backend/
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/        # SQLAlchemy
│       ├── schemas/       # Pydantic
│       ├── api/           # Routes
│       ├── services/      # Logique métier
│       └── utils/         # Helpers (buckwalter, etc.)
│
├── frontend/
│   ├── public/            # favicon.svg, og-image.png
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── api/
│       └── lib/
│
├── scripts/
│   ├── extraction/        # Tanzil + Corpus Quran parsers
│   ├── database/          # Import PG + sync Neo4j
│   └── utils/             # Buckwalter → Arabe, helpers
│
├── data/
│   ├── quran_raw/         # Fichiers sources bruts
│   └── quran_enriched/    # JSON intermédiaire normalisé
│
├── schema_postgresql.sql
├── docker-compose.yml
├── docker-compose.prod.yml
├── ROADMAP.md
└── README.md
```

---

## Considérations éthiques

- ✅ Données publiques et libres de droits (CC-BY 3.0 / GNU GPL)
- ✅ Usage éducatif, recherche et journalisme
- ✅ Aucune interprétation religieuse ajoutée — données brutes uniquement
- ✅ Pas de collecte de données utilisateurs

---

**Dernière mise à jour :** 28 février 2026
**Statut :** ⏳ Phase 6 en cours
**Version :** 0.4.0
**URL prod :** https://quranicdata.org
**Auteur :** [Sidr Valley AI](https://mondher.ch)
