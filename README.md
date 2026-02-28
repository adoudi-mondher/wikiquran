# Quran · Knowledge Graph

> An analytical dataset of the Quran, visualized as a living knowledge graph — 100% data-driven, zero religious interpretation.

**🌐 Production:** [quranicdata.org](https://quranicdata.org)

---

<div align="center">

[العربية](./README.md) · [English](./README.en.md) · [Français](./README.fr.md)

</div>

---

## Vision & Positioning

WikiQuran is **not** a Quran viewer. It is the first tool that treats the Quran as an **analytical dataset** and visualizes it as a **living graph** — without religious interpretation, only the patterns the data reveals.

### What the graph reveals

- **Hidden semantic structure** — Arabic roots as the neural network of the Quran
- **Narrative evolution** — linguistic differences between Meccan and Medinan surahs
- **Structural patterns** — repetitions, connections and data-driven thematic clusters

### Non-negotiable principles

- ✅ **Scalable** — every technical decision allows future growth
- ✅ **Neutral** — insights emerge from data, not from authors
- ✅ **Analytical** — the Quran treated like any linguistic corpus

---

## The Data

**Sources:** [tanzil.net](https://tanzil.net/download) / [corpus.quran.com](https://corpus.quran.com/download/default.jsp) *(open data)*

| Element | Volume |
|---------|--------|
| Surahs | 114 |
| Verses (Ayat) | 6,236 |
| Unique words | 12,113 |
| Arabic roots | 1,642 |
| Occurrences | 77,429 |
| SHARES_ROOT relationships | 6,035,766 |

### Extraction strategy

| Source | File | Content |
|--------|------|---------|
| tanzil.net | `quran-uthmani.xml` | Arabic text (Uthmani script) |
| tanzil.net | `quran-data.xml` | Metadata: revelation order, surah type, juz, hizb |
| corpus.quran.com | `morphology.txt` (TSV) | Roots + morphology word by word |

---

## Data Architecture

### Core principle

> **PostgreSQL is the master. Neo4j is a derived graph index.**

- We **never** write directly to Neo4j without going through PostgreSQL
- If Neo4j is corrupted → full rebuild from PostgreSQL
- Every Neo4j node holds a `pg_id` → bridge to the source of truth

### ACID / BASE boundary

| | PostgreSQL (ACID) | Neo4j (BASE) |
|--|-------------------|--------------|
| **Role** | Source of truth | Exploration engine |
| **Guarantee** | Strict transactions | Availability + performance |
| **Data** | Text, metadata, occurrences | Relationships, connections, graph |
| **Typical query** | *"What does verse 2:255 say?"* | *"Which verses share these roots?"* |

---

## PostgreSQL Model

### Tables

```
surah ──< ayah ──< word_occurrence >── word >── root
```

| Table | Role | Key fields |
|-------|------|-----------|
| `surah` | Surahs + complete metadata | `revelation_order`, `type` |
| `ayah` | Verses + Uthmani Arabic text | `surah_id`, `number` |
| `root` | Unique roots | `buckwalter` (key), `arabic` (display) |
| `word` | Unique words | `root_id`, `lemma_buckwalter`, `pos` |
| `word_occurrence` | Each word appearance in a verse | `word_id`, `ayah_id`, `position` |

### Architectural decisions

- ✅ **Unique words** in `word` + occurrences in `word_occurrence` (many-to-many pattern)
- ✅ **Buckwalter** as technical key, **Arabic** for display (converted at import)
- ✅ **Complete Surah metadata** from Phase 1 (juz, hizb, Mushaf page)
- ⏭️ **Morphology in Phase 6**: `morpheme` table for prefixes/suffixes

---

## Neo4j Model

### Nodes

| Node | Key properties | Source |
|------|---------------|--------|
| `Surah` | `pg_id`, `number`, `type`, `revelation_order` | Phase 1 ✅ |
| `Ayah` | `pg_id`, `surah_number`, `ayah_number` | Phase 1 ✅ |
| `Word` | `pg_id`, `text_arabic`, `pos` | Phase 1 ✅ |
| `Root` | `pg_id`, `buckwalter`, `arabic`, `occurrences` | Phase 1 ✅ |
| `Person` | `pg_id`, `name_arabic`, `type` | Phase 6 ⏭️ |
| `Theme` | `pg_id`, `label_arabic` | Phase 6 ⏭️ |

### Relationships

```cypher
(Surah)-[:HAS_AYAH]---------------------------------------->(Ayah)
(Ayah)-[:CONTAINS {position}]----------------------------->(Word)
(Word)-[:DERIVED_FROM]------------------------------------>(Root)
(Ayah)-[:SHARES_ROOT {root_bw, root_ar, count}]---------->(Ayah)   ← analytical key — Phase 1
(Ayah)-[:MENTIONS]----------------------------------------->(Person) ← Phase 6
(Person)-[:CO_MENTIONED {count}]-------------------------->(Person) ← Phase 6
(Ayah)-[:HAS_THEME]---------------------------------------->(Theme)  ← Phase 6
```

### The differentiating relationship: `SHARES_ROOT`

Two verses are connected if they share at least one common root. `count` = number of shared roots (relationship weight). This is what **no existing tool** offers visually.

```cypher
// Example: verses most connected to Ayat al-Kursi
MATCH (a1:Ayah {surah_number: 2, ayah_number: 255})
      -[r:SHARES_ROOT]->(a2:Ayah)
RETURN a2.surah_number, a2.ayah_number, r.count AS shared_roots
ORDER BY shared_roots DESC
LIMIT 20;
```

---

## Tech Stack

### Frontend

| Tool | Role |
|------|------|
| **React 19 + Vite** | UI framework |
| **TailwindCSS v4** | Styling (native RTL support) |
| **react-force-graph** | Graph visualization (WebGL) |
| **TanStack Query v5** | API cache |
| **TypeScript** | Type safety |

### Backend

| Tool | Role |
|------|------|
| **FastAPI** (Python 3.12) | REST API — 9 endpoints |
| **SQLAlchemy 2.0** | PostgreSQL ORM |
| **Pydantic v2** | Data validation |

### Databases

| Tool | Role |
|------|------|
| **PostgreSQL 17-alpine** | Text, metadata, full-text search |
| **Neo4j 5.26 LTS Community** | Relationship graph (6M+ SHARES_ROOT) |

### Infrastructure

| Environment | Tools |
|-------------|-------|
| **Dev** | Docker Compose |
| **Prod** | VPS OVH Debian — Nginx Proxy Manager + Docker Compose |

---

## Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Data extraction | ✅ Done |
| Phase 2 | Database | ✅ Done |
| Phase 3 | Backend API | ✅ Done |
| Phase 4 | Frontend | ✅ Done |
| Phase 5 | VPS deployment | ✅ Done |
| Phase 6 | Enrichment | ⏳ In progress |

Full details in [ROADMAP.md](./ROADMAP.md).

---

## Project Structure

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
│       ├── services/      # Business logic
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
│   ├── database/          # PG import + Neo4j sync
│   └── utils/             # Buckwalter → Arabic, helpers
│
├── data/
│   ├── quran_raw/         # Raw source files
│   └── quran_enriched/    # Normalized intermediate JSON
│
├── schema_postgresql.sql
├── docker-compose.yml
├── docker-compose.prod.yml
├── ROADMAP.md
└── README.md
```

---

## Ethical Considerations

- ✅ Public, open-licensed data (CC-BY 3.0 / GNU GPL)
- ✅ Educational, research and journalistic use
- ✅ No religious interpretation added — raw data only
- ✅ No user data collection

---

**Last updated:** February 28, 2026
**Status:** ⏳ Phase 6 in progress
**Version:** 0.4.0
**URL:** https://quranicdata.org
**Author:** [Sidr Valley AI](https://mondher.ch)