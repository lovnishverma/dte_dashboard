---
license: mit
title: DTE Punjab — Training Dashboard v2
sdk: docker
colorFrom: yellow
short_description: A full-featured Flask dashboard for the BDDS, DTE, NIELIT.
emoji: 📈
colorTo: indigo
pinned: true
thumbnail: >-
  https://cdn-uploads.huggingface.co/production/uploads/6575c3025da75f987f12c909/F1EpaSFzebxHn1otUVgJD.jpeg
---

<div align="center">

<a href="https://www.nielit.gov.in/index.php">
  <img src="https://www.nielit.gov.in/images/NIELIT_logo.jpg" alt="NIELIT Logo" height="80"/>
</a>

# DTE Punjab — Big Data & Data Science Training Dashboard v2

**Analytics portal for the Big Data & Data Science Training Programme**  
*Department of Technical Education & Industrial Training, Government of Punjab*  
*Under FutureSkills PRIME · NIELIT Ropar*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-HuggingFace_Spaces-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)](https://nielitropar-dte.hf.space/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/lovnishverma/dte_dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](Dockerfile)

</div>

---

<img width="1910" alt="DTE Punjab Dashboard Screenshot" src="https://github.com/user-attachments/assets/4c9a6b22-f98f-4022-aef7-03c96a98b970" />

---

## What Was Built

This is a production-grade full-stack web application built entirely from scratch for NIELIT Ropar to track, visualize, and analyze participant data from a government Big Data & Data Science training programme spanning 3 batches (Feb 2026) across Punjab's polytechnic colleges.

### Backend (`app.py`)
- **Flask REST API** with 5 JSON endpoints: `/api/dashboard-data`, `/api/summary`, `/api/map-data`, `/api/stats/advanced`, `/api/export`
- **Pandas-powered data pipeline** that reads a raw multi-header `.xlsx` file (headers at row 7, data from row 8), normalizes messy real-world inputs — de-duplicating 30+ spelling variants of college names, standardizing designations (`SR. LECTURER` → `Senior Lecturer`), and mapping branches to canonical codes (CSE, IT, CE)
- **`@lru_cache`** on data load so the Excel file is parsed only once per server lifetime
- **Geospatial preprocessing** — hardcoded GPS coordinates for 18 Punjab districts and 19 colleges, with automatic bubble-offset logic to prevent overlapping markers for multi-college districts
- **Filtered CSV export** endpoint supporting server-side filtering by batch, designation, and district

### Frontend (`templates/index.html` + `static/`)
- **Single-page dashboard** with 6 sections: Overview, Analytics, Insights, Map, Gallery, Participants
- **9 Chart.js charts**: district bar, gender doughnut, branch doughnut, designation horizontal bar, batch-gender grouped bar, top colleges horizontal bar, plus 3 overview mini-charts — all re-rendered on theme switch
- **Dual-map system**: Google Maps JavaScript API (AdvancedMarkerElement with scaled PinElements, InfoWindow popups) as primary, with automatic Leaflet.js fallback on auth failure — tile layer swaps dynamically on dark/light toggle
- **Smart insights engine**: 6 auto-generated analytical cards with animated progress bars (gender inclusion, district dominance, designation breakdown, college diversity, batch distribution, geographic spread)
- **Participants table**: real-time search + 3 filter dropdowns + multi-column sort + windowed pagination (20 rows/page) + per-row detail modal with avatar image (with initials fallback)
- **Lightbox photo gallery** for batch group photographs
- **Dark/Light theme** via CSS custom properties (`[data-theme]`) persisted to `localStorage`, with all Chart.js defaults updated on toggle
- **Client-side CSV export** for filtered table views using Blob API
- **Fully responsive** — collapsible sidebar with hamburger + overlay, stacked layouts on mobile

### Infrastructure
- **Docker-ready** with a `python:3.11-slim` image, non-root user, and Gunicorn on port 7860 for HuggingFace Spaces deployment
- **Environment-variable driven** — Google Maps key injected via `.env` / `python-dotenv`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, Flask 3.x, Pandas 2.x, OpenPyXL, python-dotenv |
| Frontend | Vanilla JS (ES6+), Chart.js 4.4, Leaflet.js 1.9 |
| Mapping | Google Maps JS API (AdvancedMarkerElement) + Leaflet fallback |
| Deployment | Docker, Gunicorn, HuggingFace Spaces |

---

## Quick Start

```bash
git clone https://github.com/lovnishverma/dte_dashboard.git
cd dte_dashboard
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Create `.env`:
```env
GOOGLE_MAPS_API_KEY=your_key_here
FLASK_ENV=development
```

```bash
python app.py
# → http://localhost:5000
```

---

## Project Structure

```
dte_dashboard/
├── app.py                  # Flask backend — data pipeline + 5 API routes
├── requirements.txt
├── Dockerfile              # python:3.11-slim, Gunicorn on :7860
├── .env                    # API keys (gitignored)
├── data/
│   └── DTE_all_Batch.xlsx  # Source dataset (79 participants, 3 batches)
├── templates/
│   └── index.html          # Single-page dashboard UI
└── static/
    ├── css/style.css       # Dark/Light theme via CSS variables (~600 lines)
    ├── js/main.js          # All frontend logic (~650 lines)
    ├── img/                # Per-participant avatar images (B1_01.png …)
    └── images/             # Batch group photographs
```

---

## v2 Bug Fixes

- Fixed `gm_authFailure` crash on `AdvancedMarkerElement` with an auth guard + graceful Leaflet fallback
- Resolved designation normalization edge cases (`SR. LECTURER` vs `SENIOR LECTURER`)
- Windowed pagination prevents overflow on large datasets
- Count-up animations correctly target first text node (not the `<span>` unit suffix)
- Charts and maps redraw correctly on theme toggle and section re-visit

---

## Credits

**Copyright © 2026 NIELIT Ropar** · MIT License

Built by **Lovnish Verma** (Project Engineer) and **Ravi Kant** (Project Assistant), NIELIT Ropar  
Under the guidance of **Dr. Sarwan Singh** and **Anita Budhiraja**

<div align="center">
<a href="https://www.nielit.gov.in/index.php">
  <img src="https://img.shields.io/badge/NIELIT-National_Institute_of_Electronics_%26_IT-003087?style=flat-square&logo=data:image/png;base64,iVBORw0KGgo=" />
</a>
&nbsp;
<img src="https://img.shields.io/badge/FutureSkills-PRIME-FF6B00?style=flat-square" />
&nbsp;
<img src="https://img.shields.io/badge/Govt._of-Punjab-003087?style=flat-square" />
</div>
