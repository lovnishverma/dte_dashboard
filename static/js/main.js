/* ═══════════════════════════════════════════════════════════════════════
   DTE Punjab Dashboard — main.js  (v2)
   Vanilla JS: API calls, Chart.js charts, clickable bubble map, modal,
   insights panel, CSV export, participant detail modal, image gallery.
═══════════════════════════════════════════════════════════════════════ */
"use strict";

/* ── Global state ─────────────────────────────────────────────────────── */
let allRows = [];
let summaryData = {};
let mapData = {};
let advStats = {};

let tableFiltered = [];
let sortCol = "sno";
let sortDir = "asc";
const PAGE_SIZE = 20;
let currentPage = 1;

let selectedCollege = null;  // For map panel
let mapBubbles = [];    // [{feature, x, y, r}] for hit-testing

const charts = {};

/* ══════════════════════════════════════════════════════════════════════
   1. BOOT
══════════════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSidebar();
  initNavigation();
  initModal();
  initLightbox();
  fetchAll();
});

/* ══════════════════════════════════════════════════════════════════════
   2. THEME
══════════════════════════════════════════════════════════════════════ */
function initTheme() {
  const toggle = document.getElementById("themeToggle");
  const html = document.documentElement;
  const saved = localStorage.getItem("dte-theme");
  if (saved) {
    html.setAttribute("data-theme", saved);
    toggle.querySelector(".theme-icon").textContent = saved === "dark" ? "🌙" : "☀️";
  }
  toggle.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    toggle.querySelector(".theme-icon").textContent = next === "dark" ? "🌙" : "☀️";
    localStorage.setItem("dte-theme", next);
    if (summaryData.gender_counts) buildCharts();
    if (mapData.features) renderBubbleMap(mapData.features);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   3. SIDEBAR
══════════════════════════════════════════════════════════════════════ */
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  const overlay = document.getElementById("sidebarOverlay");
  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  });
}

/* ══════════════════════════════════════════════════════════════════════
   4. NAVIGATION
══════════════════════════════════════════════════════════════════════ */
function initNavigation() {
  document.querySelectorAll(".nav-item").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      showSection(link.dataset.section);
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("sidebarOverlay").classList.remove("open");
    });
  });
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const sec = document.getElementById(id);
  if (sec) sec.classList.add("active");
  const nav = document.querySelector(`.nav-item[data-section="${id}"]`);
  if (nav) nav.classList.add("active");
  if (id === "map" && mapData.features) {
    setTimeout(() => renderBubbleMap(mapData.features), 50);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   5. FETCH ALL DATA
══════════════════════════════════════════════════════════════════════ */
async function fetchAll() {
  try {
    const [rows, summary, map, adv] = await Promise.all([
      fetchJSON("/api/dashboard-data"),
      fetchJSON("/api/summary"),
      fetchJSON("/api/map-data"),
      fetchJSON("/api/stats/advanced"),
    ]);

    allRows = rows;
    summaryData = summary;
    mapData = map;
    advStats = adv;

    renderKPIs(summary);
    renderBatchStrip(summary);
    buildCharts();
    buildTable();
    renderMapLegend(map.features);
    renderInsights(summary, adv);
    initExportButtons();

    if (map.gmaps_key) {
      loadGoogleMaps(map.gmaps_key, map.features);
    }

    document.getElementById("lastUpdated").textContent =
      "Loaded " + new Date().toLocaleTimeString();
    document.getElementById("footerCount").textContent =
      `${summary.total_participants} participants · ${summary.total_colleges} colleges · ${summary.total_districts} districts`;

  } catch (err) {
    console.error("Dashboard load error:", err);
    document.getElementById("lastUpdated").textContent = "⚠ Data load failed";
  }
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

/* ══════════════════════════════════════════════════════════════════════
   6. KPI CARDS
══════════════════════════════════════════════════════════════════════ */
function renderKPIs(s) {
  countUp("kpi-total", s.total_participants, 0, 1200);
  countUp("kpi-colleges", s.total_colleges, 0, 900);
  countUp("kpi-districts", s.total_districts, 0, 700);
  countUp("kpi-female", s.female_pct, 1, 1000);
}

function countUp(id, target, decimals, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = (target * ease).toFixed(decimals);
    el.childNodes[0].textContent = val;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ══════════════════════════════════════════════════════════════════════
   7. BATCH STRIP
══════════════════════════════════════════════════════════════════════ */
function renderBatchStrip(s) {
  const bc = s.batch_counts || {};
  const keys = Object.keys(bc);
  const find = n => keys.find(k => k.startsWith(`Batch ${n}`));
  const b = n => document.querySelector(`#batch-${n} .batch-count`);
  [1, 2, 3].forEach(n => { const el = b(n); if (el) el.textContent = bc[find(n)] ?? "–"; });
}

/* ══════════════════════════════════════════════════════════════════════
   8. INSIGHTS PANEL
══════════════════════════════════════════════════════════════════════ */
function renderInsights(s, adv) {
  const grid = document.getElementById("insightsGrid");
  if (!grid) return;

  const total = s.total_participants;
  const femalePct = s.female_pct;
  const malePct = (100 - femalePct).toFixed(1);
  const seniorPct = s.senior_pct;
  const topDistPct = adv.top_district_count ? Math.round(adv.top_district_count / total * 100) : 0;

  const cards = [
    {
      icon: "♀️",
      title: "Gender Inclusion",
      value: `${femalePct}% Female`,
      desc: `${s.gender_counts?.Female ?? 0} female participants out of ${total} total. ${femalePct >= 40 ? "Strong gender representation." : "Scope to improve female participation."}`,
      fill: femalePct,
      color: "#fb7185",
    },
    {
      icon: "🏆",
      title: "Most Active District",
      value: adv.top_district,
      desc: `${adv.top_district} leads with ${adv.top_district_count} participants (${topDistPct}% of total). Average per district: ${adv.avg_per_district}.`,
      fill: topDistPct,
      color: "#4f8ef7",
    },
    {
      icon: "🎓",
      title: "Senior Lecturers",
      value: `${seniorPct}%`,
      desc: `${s.designation_counts?.["Senior Lecturer"] ?? 0} Senior Lecturers attended, forming the largest designation group across all batches.`,
      fill: seniorPct,
      color: "#2dd4bf",
    },
    {
      icon: "🏛️",
      title: "College Diversity",
      value: `${adv.unique_colleges} Colleges`,
      desc: `Top college: "${adv.top_college}" with ${adv.top_college_count} participants. High diversity ensures broad outreach.`,
      fill: Math.min(100, (adv.unique_colleges / total) * 200),
      color: "#a78bfa",
    },
    {
      icon: "📊",
      title: "Batch Distribution",
      value: `3 Batches`,
      desc: `Batch 1: ${Object.entries(s.batch_counts || {}).find(([k]) => k.includes("Batch 1"))?.[1] ?? "–"} · Batch 2: ${Object.entries(s.batch_counts || {}).find(([k]) => k.includes("Batch 2"))?.[1] ?? "–"} · Batch 3: ${Object.entries(s.batch_counts || {}).find(([k]) => k.includes("Batch 3"))?.[1] ?? "–"}`,
      fill: 100,
      color: "#fbbf24",
    },
    {
      icon: "📍",
      title: "Geographic Spread",
      value: `${s.total_districts} Districts`,
      desc: `Training reached ${s.total_districts} Punjab districts, covering a wide geographic and institutional footprint across the state.`,
      fill: Math.round(s.total_districts / 22 * 100),
      color: "#34d399",
    },
  ];

  grid.innerHTML = cards.map(c => `
    <div class="insight-card">
      <div class="insight-icon">${c.icon}</div>
      <div class="insight-title">${c.title}</div>
      <div class="insight-value">${c.value}</div>
      <div class="insight-desc">${c.desc}</div>
      <div class="insight-bar">
        <div class="insight-bar-fill" style="width:${Math.min(100, c.fill)}%;background:${c.color}"></div>
      </div>
    </div>`).join("");

  // Animate bars after render
  setTimeout(() => {
    grid.querySelectorAll(".insight-bar-fill").forEach(el => {
      const w = el.style.width;
      el.style.width = "0";
      setTimeout(() => { el.style.width = w; }, 50);
    });
  }, 100);
}

/* ══════════════════════════════════════════════════════════════════════
   9. CHARTS
══════════════════════════════════════════════════════════════════════ */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const PALETTE = [
  "#4f8ef7", "#a78bfa", "#2dd4bf", "#fb7185",
  "#fbbf24", "#34d399", "#f87171", "#60a5fa",
  "#c084fc", "#4ade80", "#f472b6", "#818cf8",
];

function buildCharts() {
  const s = summaryData;
  if (!s.district_counts) return;

  Chart.defaults.color = cssVar("--text-muted");
  Chart.defaults.borderColor = cssVar("--chart-grid");
  Chart.defaults.font.family = "'Inter', sans-serif";

  // District bar
  const distLabels = Object.keys(s.district_counts).sort((a, b) => s.district_counts[b] - s.district_counts[a]);
  const distValues = distLabels.map(k => s.district_counts[k]);
  buildChart("districtChart", {
    type: "bar",
    data: {
      labels: distLabels,
      datasets: [{
        label: "Participants",
        data: distValues,
        backgroundColor: distLabels.map((_, i) => PALETTE[i % PALETTE.length] + "cc"),
        borderColor: distLabels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 1, borderRadius: 6,
      }],
    },
    options: barOptions("Participants"),
  });

  // Gender doughnut
  buildChart("genderChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(s.gender_counts),
      datasets: [{
        data: Object.values(s.gender_counts),
        backgroundColor: ["#fb718599", "#4f8ef799"],
        borderColor: ["#fb7185", "#4f8ef7"], borderWidth: 2, hoverOffset: 8
      }],
    },
    options: doughnutOptions(),
  });

  // Branch doughnut
  buildChart("branchChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(s.branch_counts),
      datasets: [{
        data: Object.values(s.branch_counts),
        backgroundColor: ["#4f8ef799", "#a78bfa99", "#2dd4bf99", "#fbbf2499"],
        borderColor: ["#4f8ef7", "#a78bfa", "#2dd4bf", "#fbbf24"],
        borderWidth: 2, hoverOffset: 8
      }],
    },
    options: doughnutOptions(),
  });

  // Designation bar (Horizontal Fix)
  const desigLabels = Object.keys(s.designation_counts);
  const desigValues = desigLabels.map(k => s.designation_counts[k]);
  buildChart("designationChart", {
    type: "bar",
    data: {
      labels: desigLabels,
      datasets: [{
        label: "Count",
        data: desigValues,
        backgroundColor: desigLabels.map((_, i) => PALETTE[i % PALETTE.length] + "cc"),
        borderColor: desigLabels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 1, borderRadius: 6,
      }],
    },
    options: barOptions("Count", true),
  });

  // Batch-gender grouped bar
  if (s.batch_gender) {
    const batches = Object.keys(s.batch_gender).sort();
    const genders = ["Male", "Female"];
    const gColors = { Male: "#4f8ef7", Female: "#fb7185" };

    const bgOptions = barOptions("Count");
    bgOptions.plugins.legend = {
      display: true, position: "top",
      labels: { color: cssVar("--text-muted"), font: { size: 11 }, padding: 14, boxWidth: 12 }
    };

    buildChart("batchGenderChart", {
      type: "bar",
      data: {
        labels: batches,
        datasets: genders.map(g => ({
          label: g,
          data: batches.map(b => s.batch_gender[b]?.[g] ?? 0),
          backgroundColor: gColors[g] + "bb",
          borderColor: gColors[g],
          borderWidth: 1, borderRadius: 4,
        })),
      },
      options: bgOptions,
    });
  }

  // Top colleges (Horizontal Fix)
  if (s.top_colleges) {
    const colLabels = Object.keys(s.top_colleges);
    const colValues = colLabels.map(k => s.top_colleges[k]);
    buildChart("collegeChart", {
      type: "bar",
      data: {
        labels: colLabels,
        datasets: [{
          label: "Participants",
          data: colValues,
          backgroundColor: colLabels.map((_, i) => PALETTE[i % PALETTE.length] + "cc"),
          borderColor: colLabels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 1, borderRadius: 4,
        }],
      },
      options: barOptions("Count", true),
    });
  }

  // Overview mini charts
  buildChart("overviewGenderChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(s.gender_counts),
      datasets: [{
        data: Object.values(s.gender_counts),
        backgroundColor: ["#fb718599", "#4f8ef799"],
        borderColor: ["#fb7185", "#4f8ef7"], borderWidth: 2, hoverOffset: 6
      }],
    },
    options: doughnutOptions(),
  });

  const bOptions = barOptions("");
  buildChart("overviewBatchChart", {
    type: "bar",
    data: {
      labels: Object.keys(s.batch_counts).map(k => k.replace(/\s*\(.*\)/, "")),
      datasets: [{
        label: "Participants",
        data: Object.values(s.batch_counts),
        backgroundColor: ["#4f8ef799", "#a78bfa99", "#2dd4bf99"],
        borderColor: ["#4f8ef7", "#a78bfa", "#2dd4bf"],
        borderWidth: 1, borderRadius: 6,
      }],
    },
    options: bOptions,
  });

  buildChart("overviewBranchChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(s.branch_counts),
      datasets: [{
        data: Object.values(s.branch_counts),
        backgroundColor: ["#4f8ef799", "#a78bfa99", "#2dd4bf99", "#fbbf2499"],
        borderColor: ["#4f8ef7", "#a78bfa", "#2dd4bf", "#fbbf24"],
        borderWidth: 2, hoverOffset: 6
      }],
    },
    options: doughnutOptions(),
  });
}

function buildChart(id, config) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, config);
}

function barOptions(valueLabel, isHorizontal = false) {
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.parsed[isHorizontal ? 'x' : 'y']} participants`,
        }
      },
    },
    scales: {
      x: { grid: { color: cssVar("--chart-grid") }, ticks: { color: cssVar("--text-muted"), font: { size: 11 } } },
      y: { grid: { color: cssVar("--chart-grid") }, ticks: { color: cssVar("--text-muted"), font: { size: 11 } } },
    },
  };

  if (isHorizontal) {
    options.indexAxis = 'y';
    options.scales.x.title = { display: !!valueLabel, text: valueLabel, color: cssVar("--text-muted"), font: { size: 11 } };
  } else {
    options.scales.y.title = { display: !!valueLabel, text: valueLabel, color: cssVar("--text-muted"), font: { size: 11 } };
  }

  return options;
}

function doughnutOptions() {
  return {
    responsive: true, maintainAspectRatio: false, cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: cssVar("--text-muted"), font: { size: 11 }, padding: 14, boxWidth: 12 }
      },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } },
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════
   10. BUBBLE MAP — Clickable, opens Google Maps
══════════════════════════════════════════════════════════════════════ */
const PB = { minLat: 29.5, maxLat: 32.6, minLng: 73.8, maxLng: 76.9 };

function renderBubbleMap(features) {
  const canvas = document.getElementById("bubbleMapCanvas");
  if (!canvas || !features || !features.length) return;

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 900;
  const H = canvas.offsetHeight || 500;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const isDark = document.documentElement.getAttribute("data-theme") !== "light";

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, isDark ? "#12151f" : "#e8edfa");
  bg.addColorStop(1, isDark ? "#1a1d27" : "#f0f4ff");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.05)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(W * i / 6, 0); ctx.lineTo(W * i / 6, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H * i / 6); ctx.lineTo(W, H * i / 6); ctx.stroke();
  }

  function toXY(lat, lng) {
    const x = ((lng - PB.minLng) / (PB.maxLng - PB.minLng)) * (W - 100) + 50;
    const y = ((PB.maxLat - lat) / (PB.maxLat - PB.minLat)) * (H - 100) + 50;
    return [x, y];
  }

  const maxCount = Math.max(...features.map(f => f.count));
  mapBubbles = [];

  features.forEach(f => {
    const [x, y] = toXY(f.lat, f.lng);
    const r = 12 + (f.count / maxCount) * 36;
    const isSelected = selectedCollege === f.college;

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    glow.addColorStop(0, isSelected ? "rgba(45,212,191,.3)" : "rgba(79,142,247,.18)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = glow; ctx.fill();

    // Bubble
    const grad = ctx.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r);
    if (isSelected) {
      grad.addColorStop(0, "#67e8f9");
      grad.addColorStop(.6, "#06b6d4");
      grad.addColorStop(1, "#0e7490");
    } else {
      grad.addColorStop(0, "#6aafff");
      grad.addColorStop(.6, "#2563eb");
      grad.addColorStop(1, "#1e40af");
    }
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.globalAlpha = .85;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = isSelected ? "rgba(103,232,249,.8)" : "rgba(147,197,253,.5)";
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.stroke();

    // Count
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.max(10, Math.min(r * .7, 16))}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(f.count, x, y);

    // Label
    ctx.fillStyle = isDark ? "#c8d6ef" : "#1a1d2e";
    ctx.font = `${isSelected ? "bold " : ""}11px Inter, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(f.college, x, y + r + 5);

    mapBubbles.push({ feature: f, x, y, r });
  });

  // Title
  ctx.fillStyle = isDark ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.5)";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Punjab — Participant Distribution by College  (click bubble to view details & open in Google Maps)", 14, 10);

  // Attach click handler (once)
  canvas.onclick = null;
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);

    let hit = null;
    for (const bubble of mapBubbles) {
      const dx = mx - bubble.x;
      const dy = my - bubble.y;
      if (Math.sqrt(dx * dx + dy * dy) <= bubble.r + 4) {
        hit = bubble;
        break;
      }
    }

    if (hit) {
      selectedCollege = hit.feature.college;
      renderBubbleMap(features);
      showCollegePanel(hit.feature);
    } else {
      selectedCollege = null;
      renderBubbleMap(features);
      document.getElementById("collegePanel").style.display = "none";
    }
  };

  // Hover cursor
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);
    const isOver = mapBubbles.some(b => {
      const dx = mx - b.x, dy = my - b.y;
      return Math.sqrt(dx * dx + dy * dy) <= b.r + 4;
    });
    canvas.style.cursor = isOver ? "pointer" : "default";
  };
}

function showCollegePanel(f) {
  const panel = document.getElementById("collegePanel");
  panel.style.display = "block";
  document.getElementById("dpName").textContent = f.college;
  document.getElementById("dpCount").textContent = `${f.count} participants`;

  const dpDistrict = document.getElementById("dpDistrict");
  if (dpDistrict) dpDistrict.textContent = `District: ${f.district || 'Unknown'}`;

  const males = f.genders?.Male ?? 0;
  const females = f.genders?.Female ?? 0;

  document.getElementById("dpMale").innerHTML = `<strong>${males}</strong>Male`;
  document.getElementById("dpFemale").innerHTML = `<strong>${females}</strong>Female`;

  // Google Maps button
  const gmBtn = document.getElementById("dpGmapsBtn");
  gmBtn.onclick = () => openGoogleMaps(f.lat, f.lng, f.college, f.district);

  // Close button
  document.getElementById("dpCloseBtn").onclick = () => {
    panel.style.display = "none";
    selectedCollege = null;
    renderBubbleMap(mapData.features);
  };

  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function openGoogleMaps(lat, lng, name, district) {
  // Omit the lat/lng centering in the URL so Google Maps 
  // searches and opens the exact Polytechnic location rather than the district center.
  const query = `${name}, ${district || ''}, Punjab India`.replace(/, ,/g, ',');
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ══════════════════════════════════════════════════════════════════════
   11. MAP LEGEND GRID
══════════════════════════════════════════════════════════════════════ */
function renderMapLegend(features) {
  if (!features) return;
  const grid = document.getElementById("mapLegendGrid");
  if (!grid) return;
  const sorted = [...features].sort((a, b) => b.count - a.count);
  grid.innerHTML = sorted.map(f => `
    <div class="map-legend-item" data-college="${f.college}"
         onclick="legendClickCollege('${f.college}', ${f.lat}, ${f.lng})">
      <div style="display:flex; flex-direction:column; max-width:80%;">
        <span class="map-legend-district" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.college}</span>
        <span style="font-size:0.65rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.district}</span>
      </div>
      <span class="map-legend-count">${f.count}</span>
    </div>`).join("");
}

window.legendClickCollege = function (college, lat, lng) {
  // Switch to map section, highlight, and open Google Maps
  showSection("map");
  setTimeout(() => {
    const feat = mapData.features?.find(f => f.college === college);
    if (feat) {
      selectedCollege = college;
      renderBubbleMap(mapData.features);
      showCollegePanel(feat);
    }
  }, 80);
};

/* ══════════════════════════════════════════════════════════════════════
   12. GOOGLE MAPS (if API key present)
══════════════════════════════════════════════════════════════════════ */
function loadGoogleMaps(key, features) {
  let authFailed = false;
  window.gm_authFailure = () => { authFailed = true; showCanvasFallback(features); };

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=marker&v=weekly&callback=initGoogleMap`;
  script.async = true;
  script.defer = true;
  script.onerror = () => { authFailed = true; showCanvasFallback(features); };
  document.head.appendChild(script);

  window.initGoogleMap = async () => {
    if (authFailed) return;
    const mapDiv = document.getElementById("googleMap");
    const fallback = document.getElementById("mapFallback");
    if (!mapDiv) return;
    try {
      const { Map, InfoWindow } = await google.maps.importLibrary("maps");
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
      if (authFailed) return;
      mapDiv.style.display = "block";
      fallback.style.display = "none";

      const map = new Map(mapDiv, { center: { lat: 31.1, lng: 75.3 }, zoom: 8, mapId: "DEMO_MAP_ID" });
      const maxCount = Math.max(...features.map(f => f.count));
      let openInfo = null;

      features.forEach(f => {
        const scale = 0.8 + (f.count / maxCount) * 0.9;
        const pin = new PinElement({
          glyphText: String(f.count),
          glyphColor: "#ffffff",
          background: `hsl(${220 - (f.count / maxCount) * 40}, 85%, ${45 + (f.count / maxCount) * 10}%)`,
          borderColor: "#93c5fd",
          scale,
        });
        const marker = new AdvancedMarkerElement({
          position: { lat: f.lat, lng: f.lng },
          map, title: `${f.college} - ${f.count} participants`,
          content: pin,
        });
        const infoContent = `
          <div style="font-family:Inter,sans-serif;padding:12px;min-width:200px;max-width:280px">
            <strong style="font-size:14px;color:#1e293b">${f.college}</strong>
            <div style="color:#6b7280;font-size:12px;margin:2px 0 10px">${f.district} &bull; ${f.count} participants</div>
            <div style="display:flex;gap:12px;margin-bottom:10px;font-size:12px;color:#374151">
              <span>👨 ${f.genders?.Male ?? 0} Male</span>
              <span>👩 ${f.genders?.Female ?? 0} Female</span>
            </div>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(f.college + ', ' + f.district + ' Punjab India')}"
               target="_blank" rel="noopener"
               style="display:block;margin-top:10px;background:#2563eb;color:#fff;text-align:center;
                      padding:6px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">
              📍 Open in Google Maps
            </a>
          </div>`;
        const info = new InfoWindow({ content: infoContent });
        marker.addEventListener("gmp-click", () => {
          if (openInfo) openInfo.close();
          info.open({ anchor: marker, map });
          openInfo = info;
        });
      });
    } catch (err) {
      showCanvasFallback(features);
    }
  };
}

function showCanvasFallback(features) {
  const mapDiv = document.getElementById("googleMap");
  const fallback = document.getElementById("mapFallback");
  if (mapDiv) mapDiv.style.display = "none";
  if (fallback) fallback.style.display = "block";
  if (features) renderBubbleMap(features);
}

/* ══════════════════════════════════════════════════════════════════════
   13. PARTICIPANT TABLE
══════════════════════════════════════════════════════════════════════ */
function buildTable() {
  if (!allRows.length) return;
  populateFilter("filterBatch", [...new Set(allRows.map(r => r.batch).filter(Boolean))].sort());
  populateFilter("filterDesignation", [...new Set(allRows.map(r => r.designation).filter(Boolean))].sort());
  populateFilter("filterDistrict", [...new Set(allRows.map(r => r.district).filter(Boolean))].sort());

  document.getElementById("tableSearch").addEventListener("input", applyFilters);
  document.getElementById("filterBatch").addEventListener("change", applyFilters);
  document.getElementById("filterDesignation").addEventListener("change", applyFilters);
  document.getElementById("filterDistrict").addEventListener("change", applyFilters);

  document.querySelectorAll("#participantsTable th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      sortDir = sortCol === col ? (sortDir === "asc" ? "desc" : "asc") : "asc";
      sortCol = col;
      document.querySelectorAll("#participantsTable th").forEach(h => h.classList.remove("sort-asc", "sort-desc"));
      th.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
      applyFilters();
    });
  });
  applyFilters();
}

function populateFilter(id, values) {
  const sel = document.getElementById(id);
  if (!sel) return;
  values.forEach(v => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = v;
    sel.appendChild(opt);
  });
}

function applyFilters() {
  const q = document.getElementById("tableSearch").value.toLowerCase();
  const batch = document.getElementById("filterBatch").value;
  const desig = document.getElementById("filterDesignation").value;
  const district = document.getElementById("filterDistrict").value;

  tableFiltered = allRows.filter(r => {
    const hay = `${r.name} ${r.college} ${r.district} ${r.designation} ${r.branch}`.toLowerCase();
    return (!q || hay.includes(q)) &&
      (!batch || r.batch === batch) &&
      (!desig || r.designation === desig) &&
      (!district || r.district === district);
  });

  tableFiltered.sort((a, b) => {
    let va = a[sortCol] ?? "", vb = b[sortCol] ?? "";
    if (sortCol === "sno") { va = +va; vb = +vb; }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    return va < vb ? (sortDir === "asc" ? -1 : 1) :
      va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
  });

  currentPage = 1;
  renderTablePage();
  renderPagination();
  document.getElementById("tableCount").textContent = `${tableFiltered.length} of ${allRows.length}`;
}

function renderTablePage() {
  const tbody = document.getElementById("tableBody");
  const slice = tableFiltered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  tbody.innerHTML = slice.map((r, i) => `
    <tr class="row-link" onclick="openParticipantModal(${(currentPage - 1) * PAGE_SIZE + i})">
      <td>${r.sno ?? ""}</td>
      <td>
  <div style="display:flex; align-items:center; gap:10px;">
    <div style="width:32px; height:32px; border-radius:50%; background:var(--surface-2); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; overflow:hidden; flex-shrink:0;">
      <img src="${getParticipantImage(r.sno)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerHTML='${getInitials(r.name)}'">
    </div>
    <strong>${r.name ?? "—"}</strong>
  </div>
</td>
      <td>${genderPill(r.gender)}</td>
      <td>${designBadge(r.designation)}</td>
      <td>${r.branch ?? "—"}</td>
      <td style="max-width:220px;white-space:normal;line-height:1.3">${r.college ?? "—"}</td>
      <td>${r.district ?? "—"}</td>
      <td><span class="batch-tag">${r.batch ?? "—"}</span></td>
      <td>
        <button class="map-action-btn" onclick="event.stopPropagation();viewOnMap('${r.district ?? ""}', '${r.college ?? ""}')">📍 Map</button>
      </td>
    </tr>`).join("");
}

function genderPill(g) {
  if (!g || g === "N/A") return g ?? "—";
  return `<span class="pill ${g === "Female" ? "pill-female" : "pill-male"}">${g}</span>`;
}

function designBadge(d) {
  if (!d || d === "N/A") return d ?? "—";
  const m = { "HOD": "badge-hod", "Senior Lecturer": "badge-senior", "Lecturer": "badge-lect" };
  return `<span class="badge ${m[d] || "badge-other"}">${d}</span>`;
}

function renderPagination() {
  const total = Math.ceil(tableFiltered.length / PAGE_SIZE);
  const pag = document.getElementById("pagination");
  if (!pag) return;
  // Show max 10 page buttons around current page
  const range = [];
  const delta = 4;
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(total, currentPage + delta); i++) {
    range.push(i);
  }
  let html = "";
  if (range[0] > 1) html += `<button class="page-btn" data-page="1">1</button>${range[0] > 2 ? '<span style="color:var(--text-muted);padding:4px">…</span>' : ""}`;
  range.forEach(i => { html += `<button class="page-btn${i === currentPage ? " active" : ""}" data-page="${i}">${i}</button>`; });
  if (range[range.length - 1] < total) html += `${range[range.length - 1] < total - 1 ? '<span style="color:var(--text-muted);padding:4px">…</span>' : ""}<button class="page-btn" data-page="${total}">${total}</button>`;
  pag.innerHTML = html;
  pag.querySelectorAll(".page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentPage = +btn.dataset.page;
      renderTablePage();
      renderPagination();
      document.getElementById("table").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* ── Map action from table ───────────────────────────────────────────── */
window.viewOnMap = function (district, college) {
  if (district && district !== "N/A") {
    const query = college && college !== "N/A" ? `${college}, ${district}, Punjab India` : `${district} Punjab India`;
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
  }
};

/* ══════════════════════════════════════════════════════════════════════
   14. PARTICIPANT MODAL
══════════════════════════════════════════════════════════════════════ */
function initModal() {
  document.getElementById("modalClose").onclick = closeModal;
  document.getElementById("participantModal").onclick = function (e) {
    if (e.target === this) closeModal();
  };
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
}

function closeModal() {
  document.getElementById("participantModal").style.display = "none";
}

window.openParticipantModal = function (idx) {
  const r = tableFiltered[idx];
  if (!r) return;
  const modal = document.getElementById("participantModal");
  modal.style.display = "flex";

  const imgPath = getParticipantImage(r.sno);
  const initials = getInitials(r.name);
  const avatarEl = document.getElementById("modalAvatar");
  
  // Inject image with an onerror fallback to initials
  if (imgPath) {
    avatarEl.innerHTML = `<img src="${imgPath}" alt="${r.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentElement.innerHTML='${initials}'">`;
  } else {
    avatarEl.innerHTML = initials;
  }
  document.getElementById("modalName").textContent = r.name ?? "—";
  document.getElementById("modalDesig").textContent = r.designation ?? "—";

  const tags = [
    genderPill(r.gender),
    designBadge(r.designation),
    `<span class="batch-tag">${r.batch ?? ""}</span>`,
  ];
  document.getElementById("modalTags").innerHTML = tags.join("");

  const fields = [
    { label: "Branch", value: r.branch ?? "—" },
    { label: "District", value: r.district ?? "—" },
    { label: "College", value: r.college ?? "—" },
    { label: "Mobile", value: r.mobile && r.mobile !== "N/A" ? r.mobile : "—" },
    { label: "Email", value: r.email && r.email !== "N/A" ? r.email : "—" },
    { label: "Sr. No", value: r.sno ?? "—" },
  ];
  document.getElementById("modalGrid").innerHTML = fields.map(f => `
    <div class="modal-field">
      <div class="modal-field-label">${f.label}</div>
      <div class="modal-field-value">${f.value}</div>
    </div>`).join("");

  document.getElementById("modalMapBtn").onclick = () => {
    const q = r.college && r.college !== "N/A" ? `${r.college}, ${r.district}, Punjab` : `${r.district} Punjab India`;
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
  };
};

/* ══════════════════════════════════════════════════════════════════════
   15. LIGHTBOX GALLERY
══════════════════════════════════════════════════════════════════════ */
function initLightbox() {
  const lbModal = document.getElementById("lightboxModal");
  const lbClose = document.getElementById("lightboxClose");
  
  if (lbClose) lbClose.onclick = closeLightbox;
  if (lbModal) {
    lbModal.onclick = function (e) {
      if (e.target === this) closeLightbox();
    };
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeLightbox();
  });
}

window.openLightbox = function(src, caption) {
  const modal = document.getElementById("lightboxModal");
  const img = document.getElementById("lightboxImage");
  const cap = document.getElementById("lightboxCaption");
  
  img.src = src;
  cap.textContent = caption;
  modal.style.display = "flex";
};

function closeLightbox() {
  const modal = document.getElementById("lightboxModal");
  const img = document.getElementById("lightboxImage");
  if (modal) {
    modal.style.display = "none";
    img.src = ""; // Clear src to stop previous image flashing next time
  }
}

/* ── Avatar Image Helper ─────────────────────────────────────────────── */
function getParticipantImage(sno) {
  let num = parseInt(sno, 10);
  if (isNaN(num)) return null;

  let batch, index;
  if (num <= 30) {
    batch = 1;
    index = num; // 1 to 30
  } else if (num <= 53) {
    batch = 2;
    index = num - 30; // 1 to 23
  } else {
    batch = 3;
    index = num - 53; // 1 to 26
  }

  // Zero-pad the index (e.g., 1 -> '01', 12 -> '12')
  let paddedIndex = index.toString().padStart(2, '0');
  
  // Note: Matches your static/img folder path
  return `/static/img/B${batch}_${paddedIndex}.png`;
}

function getInitials(name) {
  return (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

/* ══════════════════════════════════════════════════════════════════════
   16. EXPORT CSV
══════════════════════════════════════════════════════════════════════ */
function initExportButtons() {
  // Full export (top bar)
  document.getElementById("exportBtn").onclick = () => {
    window.location.href = "/api/export";
  };

  // Filtered export (table toolbar)
  document.getElementById("exportTableBtn").onclick = () => {
    const batch = document.getElementById("filterBatch").value;
    const desig = document.getElementById("filterDesignation").value;
    const district = document.getElementById("filterDistrict").value;
    const q = document.getElementById("tableSearch").value;
    if (!q && !batch && !desig && !district) {
      window.location.href = "/api/export";
      return;
    }
    // Client-side CSV export for filtered results
    downloadCSV(tableFiltered, "DTE_filtered.csv");
  };
}

function downloadCSV(rows, filename) {
  const cols = ["sno", "name", "gender", "designation", "branch", "college", "district", "email", "mobile", "batch"];
  const header = cols.join(",");
  const body = rows.map(r =>
    cols.map(c => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [header, ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
