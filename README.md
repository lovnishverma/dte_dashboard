# DTE Punjab — Training Dashboard v2

A full-featured Flask dashboard for the Big Data & Data Science training programme.

## Features

- **Overview** — KPI cards, batch strip, 3 mini-charts (gender/batch/branch)
- **Analytics** — District bar, gender doughnut, branch doughnut, designation bar, batch-gender grouped bar, top-10 colleges bar
- **Insights** — Auto-generated insight cards with animated progress bars
- **District Map** — Clickable bubble map; click any bubble to see a district detail panel and open Google Maps. Legend items also clickable.
- **Participants Table** — Search, filter by batch/designation/district, sort by any column, paginated. Row click opens a participant detail modal. "📍 Map" button opens the college/district in Google Maps.
- **Export CSV** — Export all participants or current filtered view
- **Dark / Light mode** — persisted in localStorage

## Bug Fixes (vs v1)

- `gm_authFailure` crash on AdvancedMarkerElement fixed (authFailed guard)
- Designation normalisation edge cases resolved
- Pagination now shows windowed page numbers (no overflow for large datasets)
- Count-up animation now correctly targets first text node
- Chart redraws correctly on theme toggle
- Canvas map redraws on section re-visit

## Setup

```bash
cd dte_dashboard
pip install -r requirements.txt
python app.py
```

Then open http://localhost:5000

## Project Structure

```
dte_dashboard/
├── app.py                  # Flask backend
├── requirements.txt
├── .env                    # Google Maps API key
├── data/
│   └── DTE_all_Batch.xlsx
├── templates/
│   └── index.html
└── static/
    ├── css/style.css
    └── js/main.js
```
