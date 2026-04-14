---
license: mit
title: DTE Punjab — Training Dashboard v2
sdk: docker
colorFrom: yellow
short_description: A full-featured Flask dashboard for the BDDS, DTE, NIELIT.
---



# 🎓 DTE Punjab — Training Dashboard v2

A comprehensive, full-featured Flask-based analytical dashboard designed for the Big Data & Data Science Training Programme conducted for the Department of Technical Education and Industrial Training (DTE), Government of Punjab.

## 🌐 Live Demo
[Experience the Dashboard Live](https://nielitropar-dte.hf.space/)


## 🌐 GITHUB REPO:

https://github.com/lovnishverma/dte_dashboard

---

<img width="1910" height="962" alt="image" src="https://github.com/user-attachments/assets/4c9a6b22-f98f-4022-aef7-03c96a98b970" />

## ✨ Key Features

* **📊 Comprehensive Analytics:** Real-time KPI cards, batch overview strips, and multi-dimensional mini-charts (gender/batch/branch splits).
* **📈 Advanced Visualizations:** Detailed district bar charts, branch/gender doughnuts, designation breakdowns, and batch-gender grouped metrics using Chart.js.
* **💡 Smart Insights Engine:** Auto-generated analytical insight cards with animated progress bars evaluating demographic and geographic distributions.
* **🗺️ Interactive Geospatial Mapping:** Clickable bubble map plotting participant density across Punjab districts. Features an integrated Google Maps fallback and click-to-open functionality for specific polytechnic colleges.
* **🗄️ Dynamic Participant Data:** Searchable, filterable (by batch, designation, district), and fully sortable paginated data table.
* **📥 Export Capabilities:** One-click CSV generation for both complete datasets and actively filtered views.
* **🌓 Modern UI/UX:** Fully responsive, premium interface with a persistent Dark / Light mode toggle powered by vanilla CSS variables and `localStorage`.
* **🖼️ Media Gallery:** Built-in lightbox gallery showcasing batch-wise group photographs.

---

## 🛠️ Technology Stack

* **Backend:** Python 3, Flask, Pandas, OpenPyXL, python-dotenv
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), Chart.js
* **APIs & Integrations:** Google Maps JavaScript API (Advanced Markers)

---

## ⚙️ Installation & Setup

**1. Clone the repository:**
```bash
git clone https://github.com/lovnishverma/dte_dashboard.git
cd dte_dashboard
```

**2. Create and activate a virtual environment (Recommended):**
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

**3. Install the required dependencies:**
```bash
pip install -r requirements.txt
```

**4. Configure Environment Variables:**
Ensure you have a `.env` file in the root directory containing your Google Maps API key (and optionally the Flask environment):
```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
FLASK_ENV=development
```

**5. Run the application:**
```bash
python app.py
```
*The dashboard will be available at `http://localhost:5000`*

---

## 🔧 Updates & Bug Fixes (v2)

* Fixed `gm_authFailure` crash on `AdvancedMarkerElement` with a robust authentication guard.
* Resolved designation normalization edge cases (e.g., standardizing "SR. LECTURER" vs "Senior Lecturer").
* Pagination now correctly displays windowed page numbers, preventing overflow for large datasets.
* Optimized count-up animations to correctly target the first text node.
* Charts and Canvas maps now seamlessly redraw on theme toggles and section re-visits.

---

## 📁 Project Structure

```text
dte_dashboard/
├── app.py                  # Core Flask backend & API routing
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (API Keys)
├── data/
│   └── DTE_all_Batch.xlsx  # Source dataset
├── templates/
│   └── index.html          # Main dashboard UI
└── static/
    ├── css/style.css       # Custom styling (Dark/Light themes)
    ├── js/main.js          # Frontend logic & Chart integrations
    └── images/             # Batch group photographs
```

---

## ©️ Copyright & Credits

**Copyright © NIELIT Ropar**

This dashboard was developed as part of a specialized training initiative under FutureSkills PRIME. 

Created by **Lovnish Verma** (Project Engineer) and **Ravi Kant** (Project Assistant), NIELIT ROPAR, under the expert guidance of **Dr. Sarwan Singh** and **Anita Budhiraja Mam**.
