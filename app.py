"""
DTE Punjab - Big Data & Data Science Training Dashboard
Flask backend: loads XLSX, exposes JSON API endpoints.
"""

import os
import io
import json
import pandas as pd
from flask import Flask, render_template, jsonify, send_file, request
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "DTE_all_Batch.xlsx")
GMAP_KEY  = os.getenv("GOOGLE_MAPS_API_KEY", "")


# ── Data Loading ──────────────────────────────────────────────────────────────

def load_data() -> pd.DataFrame:
    raw = pd.read_excel(DATA_FILE, sheet_name=0, header=None)

    headers = raw.iloc[6].tolist()
    headers = [str(h).strip() if pd.notna(h) else f"col_{i}"
               for i, h in enumerate(headers)]

    df = raw.iloc[7:].copy()
    df.columns = headers
    df = df.reset_index(drop=True)
    df.dropna(how="all", inplace=True)

    rename_map = {
        "SNo.": "sno", "Full Name": "name", "Gender": "gender",
        "Mobile No.": "mobile", "Designation": "designation",
        "Branch/Trade": "branch", "Email Id": "email",
        "College Name": "college", "District": "district",
    }
    df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns}, inplace=True)

    def batch_label(sno):
        try:
            n = int(float(sno))
            if n <= 30:  return "Batch 1 (9–13 Feb)"
            if n <= 53:  return "Batch 2 (16–20 Feb)"
            return "Batch 3 (23–27 Feb)"
        except Exception:
            return "Unknown"

    df["batch"] = df["sno"].apply(batch_label)

    for col in ["name","gender","designation","branch","college","district","email","mobile"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().replace("nan", "N/A")

    if "designation" in df.columns:
        df["designation"] = df["designation"].str.upper()
        df["designation"] = df["designation"].str.replace(r'\s+', ' ', regex=True).str.strip()
        desig_map = {
            "SR. LECTURER": "Senior Lecturer", "SR LECTURER": "Senior Lecturer",
            "SENIOR LECTURER": "Senior Lecturer", "LECTURER": "Lecturer",
            "SYSTEM ANALYST": "System Analyst", "HOD": "HOD"
        }
        df["designation"] = df["designation"].map(desig_map).fillna(df["designation"].str.title())

    branch_map = {
        "computer science and engineering": "CSE",
        "information technology": "IT",
        "information technology ": "IT",
        "computer engineering": "CE",
    }
    if "branch" in df.columns:
        df["branch"] = df["branch"].str.lower().map(branch_map).fillna(df["branch"])

    return df


# ── District Coordinates ──────────────────────────────────────────────────────

DISTRICT_COORDS = {
    "Amritsar":                  (31.6340, 74.8723),
    "Ludhiana":                  (30.9010, 75.8573),
    "Patiala":                   (30.3398, 76.3869),
    "Jalandhar":                 (31.3260, 75.5762),
    "Bathinda":                  (30.2110, 74.9455),
    "Rupnagar":                  (30.9686, 76.5253),
    "Mohali":                    (30.7046, 76.7179),
    "SAS Nagar Mohali":          (30.7046, 76.7179),
    "Hoshiarpur":                (31.5347, 75.9114),
    "Moga":                      (30.8171, 75.1683),
    "Gurdaspur":                 (32.0398, 75.4058),
    "Ferozepur":                 (30.9233, 74.6150),
    "Tarn Taran":                (31.4519, 74.9282),
    "Faridkot":                  (30.6645, 74.7550),
    "Barnala":                   (30.3776, 75.5483),
    "Mansa":                     (29.9877, 75.3974),
    "Fatehgarh sahib":           (30.6492, 76.3903),
    "Shaheed Bhagat Singh Nagar":(31.1285, 76.1148),
}


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.route("/api/dashboard-data")
def dashboard_data():
    df = load_data()
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/summary")
def summary():
    df = load_data()
    gender_counts  = df["gender"].value_counts().to_dict()
    desig_counts   = df["designation"].value_counts().to_dict()
    branch_counts  = df["branch"].value_counts().to_dict()
    district_counts= df["district"].value_counts().to_dict()
    batch_counts   = df["batch"].value_counts().to_dict()
    college_counts = df["college"].value_counts().head(10).to_dict()

    total      = len(df)
    female_pct = round(gender_counts.get("Female", 0) / total * 100, 1)
    senior_pct = round(desig_counts.get("Senior Lecturer", 0) / total * 100, 1)
    hod_count  = desig_counts.get("HOD", 0)

    # Batch-wise gender breakdown
    batch_gender = {}
    for batch in df["batch"].unique():
        b_df = df[df["batch"] == batch]
        batch_gender[batch] = b_df["gender"].value_counts().to_dict()

    return jsonify({
        "total_participants": total,
        "total_colleges":     df["college"].nunique(),
        "total_districts":    df["district"].nunique(),
        "female_pct":         female_pct,
        "hod_count":          hod_count,
        "senior_pct":         senior_pct,
        "gender_counts":      gender_counts,
        "designation_counts": desig_counts,
        "branch_counts":      branch_counts,
        "district_counts":    district_counts,
        "batch_counts":       batch_counts,
        "top_colleges":       college_counts,
        "batch_gender":       batch_gender,
    })


@app.route("/api/map-data")
def map_data():
    df = load_data()
    grouped = df.groupby("district").agg(
        count=("name", "count"),
        colleges=("college", lambda x: list(x.unique())),
        names=("name", list),
        designations=("designation", lambda x: x.value_counts().to_dict()),
        genders=("gender", lambda x: x.value_counts().to_dict()),
    ).reset_index()

    features = []
    for _, row in grouped.iterrows():
        coords = DISTRICT_COORDS.get(row["district"])
        if coords:
            features.append({
                "district":     row["district"],
                "count":        int(row["count"]),
                "lat":          coords[0],
                "lng":          coords[1],
                "colleges":     row["colleges"],
                "sample":       row["names"][:5],
                "designations": row["designations"],
                "genders":      row["genders"],
            })

    return jsonify({"features": features, "gmaps_key": GMAP_KEY})


@app.route("/api/export")
def export_csv():
    """Export filtered data as CSV."""
    df = load_data()
    batch   = request.args.get("batch", "")
    desig   = request.args.get("designation", "")
    district= request.args.get("district", "")

    if batch:    df = df[df["batch"] == batch]
    if desig:    df = df[df["designation"] == desig]
    if district: df = df[df["district"] == district]

    cols = ["sno","name","gender","designation","branch","college","district","email","mobile","batch"]
    cols = [c for c in cols if c in df.columns]

    buf = io.StringIO()
    df[cols].to_csv(buf, index=False)
    buf.seek(0)

    return send_file(
        io.BytesIO(buf.getvalue().encode()),
        mimetype="text/csv",
        as_attachment=True,
        download_name="DTE_participants.csv"
    )


@app.route("/api/stats/advanced")
def advanced_stats():
    """Return advanced statistics for the insights panel."""
    df = load_data()

    # College with most participants
    top_college = df["college"].value_counts().idxmax()
    top_college_count = int(df["college"].value_counts().max())

    # District with most participants
    top_district = df["district"].value_counts().idxmax()
    top_district_count = int(df["district"].value_counts().max())

    # Gender per batch
    pivot = df.pivot_table(index="batch", columns="gender", aggfunc="size", fill_value=0)
    pivot_dict = pivot.to_dict()

    return jsonify({
        "top_college": top_college,
        "top_college_count": top_college_count,
        "top_district": top_district,
        "top_district_count": top_district_count,
        "gender_by_batch": pivot_dict,
        "avg_per_district": round(len(df) / df["district"].nunique(), 1),
        "unique_colleges": int(df["college"].nunique()),
    })


# ── Pages ──────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
