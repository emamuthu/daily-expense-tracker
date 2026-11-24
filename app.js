/* Daily Expense Tracker — Standalone GitHub Pages App synced with Private GitHub Repo */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORIES = [
  "Housing", "Food & Dining", "Groceries", "Auto & Gas", "Insurance",
  "Utilities & Telecom", "Shopping", "Kids & Family", "Health & Medical",
  "Pets", "Bills & Subscriptions", "Other",
];

const CATEGORY_COLORS = {
  "Housing": "#2563eb",
  "Food & Dining": "#f97316",
  "Groceries": "#16a34a",
  "Auto & Gas": "#0891b2",
  "Insurance": "#7c3aed",
  "Utilities & Telecom": "#ca8a04",
  "Shopping": "#db2777",
  "Kids & Family": "#e11d48",
  "Health & Medical": "#0d9488",
  "Pets": "#9333ea",
  "Bills & Subscriptions": "#4f46e5",
  "Other": "#64748b",
};

const RULES = [
  ["Housing", ["mortage", "mortgage", "hov", "hoa", "homedepot", "home depot", "lowes", "home", "rent", "lawn", "plumber", "repair", "furniture", "bobs", "ikea", "tax"]],
  ["Insurance", ["life insu", "auto insur", "metlife", "insurance", "insursance", "aaa", "geico"]],
  ["Utilities & Telecom", ["pseg", "sewage", "water", "njwater", "xfinity", "comcast", "verizon", "cell", "electric", "internet", "trash"]],
  ["Groceries", ["grocery", "costco", "sams club", "indian g", "patel", "shoprite", "aldi", "trader joe", "whole foods", "wegmans", "walmart", "bjs"]],
  ["Food & Dining", ["food", "rest", "pizza", "kfc", "mcdonald", "starbucks", "coffee", "dunkin", "chipotle", "panera", "cake", "bakery", "lunch", "dinner", "burger"]],
  ["Auto & Gas", ["gas", "auto", "car", "ezpass", "toll", "tire", "teir", "oil", "dmv", "parking", "wash", "uber", "lyft", "fuel"]],
  ["Pets", ["petco", "petsmart", "pet", "coco", "vet", "dog", "cat", "chewy"]],
  ["Health & Medical", ["doc", "doctor", "cvs", "walgreen", "pharmacy", "dental", "dentist", "hospital", "clinic", "med", "eye", "optom"]],
  ["Kids & Family", ["kids", "kid", "wife", "school", "college", "karate", "singing", "math", "eng", "kumon", "tuition", "sat", "camp", "toy", "yearbook", "gift"]],
  ["Bills & Subscriptions", ["netflix", "netfilx", "disney", "hulu", "spotify", "apple", "prime", "amex", "cc", "credit", "fee", "postoffice"]],
  ["Shopping", ["amazon", "target", "dress", "macys", "kohls", "shoe", "burlington", "marshalls", "tjmaxx", "ross", "nike", "old navy", "lulu", "bath", "bestbuy", "ent"]],
];

function guessCategory(item) {
  const low = String(item || "").trim().toLowerCase();
  if (!low) return "Other";
  if (low.includes("insu") || low.includes("metlife")) return "Insurance";
  if (low.includes("coco") || low.includes("pet") || low.includes("vet")) return "Pets";
  if (low === "auto" || low === "auto loan" || low === "car loan") return "Auto & Gas";
  for (const [cat, kws] of RULES) {
    for (const kw of kws) {
      if (low.includes(kw)) return cat;
    }
  }
  return "Other";
}

const DATA_REPO = "daily-expense-data";
const DATA_PATH = "expenses_db.json";
const STORAGE_TOKEN_KEY = "det_gh_token";
const STORAGE_OWNER_KEY = "det_gh_owner";

const state = {
  owner: localStorage.getItem(STORAGE_OWNER_KEY) || "emamuthu",
  token: localStorage.getItem(STORAGE_TOKEN_KEY) || "",
  sha: null,
  db: { next_id: 1, next_template_id: 1, expenses: [], recurring_templates: [] },
  curYear: new Date().getFullYear(),
  curMonth: new Date().getMonth() + 1,
  monthItems: [],
  activeView: "add",
  saving: false,
};

const $ = (id) => document.getElementById(id);

function fmtMoney(n, decimals = 2) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
function fmtWhole(n) { return fmtMoney(n, 0); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let toastTimer = null;
function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}

function setSyncBadge(text) {
  const el = $("sync-now-btn");
  if (el) el.textContent = text;
}

/* -------------------- GitHub Cloud Database Engine -------------------- */

function b64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function b64DecodeUtf8(b64) {
  const clean = b64.replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function fetchDatabaseFromGitHub() {
  setSyncBadge("Syncing...");
  const url = `https://api.github.com/repos/${encodeURIComponent(state.owner)}/${DATA_REPO}/contents/${DATA_PATH}?t=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${state.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Invalid or expired GitHub Token.");
  }
  if (res.status === 404) {
    throw new Error(`Private repo '${state.owner}/${DATA_REPO}' not found or token lacks 'repo' scope.`);
  }
  if (!res.ok) {
    throw new Error(`GitHub API error (${res.status})`);
  }
  const meta = await res.json();
  state.sha = meta.sha;

  let rawJson = "";
  if (meta.content) {
    rawJson = b64DecodeUtf8(meta.content);
  } else if (meta.git_url) {
    const blobRes = await fetch(meta.git_url, {
      headers: {
        Authorization: `Bearer ${state.token}`,
        Accept: "application/vnd.github+json",
      },
    });
    const blob = await blobRes.json();
    rawJson = b64DecodeUtf8(blob.content);
  }

  const parsed = JSON.parse(rawJson);
  const expenses = (parsed.expenses || []).map((r, idx) => ({
    id: Number(r.id || idx + 1),
    expense_date: String(r.expense_date),
    item: String(r.item || "Misc"),
    category: String(r.category || guessCategory(r.item)),
    amount: Number(r.amount || 0),
    is_recurring: Number(r.is_recurring ? 1 : 0),
    notes: String(r.notes || ""),
    created_at: String(r.created_at || ""),
  }));
  const templates = (parsed.recurring_templates || []).map((t, idx) => ({
    id: Number(t.id || idx + 1),
    item: String(t.item),
    category: String(t.category || guessCategory(t.item)),
    default_amount: Number(t.default_amount || 0),
    day_of_month: Number(t.day_of_month || 1),
    active: Number(t.active !== undefined ? (t.active ? 1 : 0) : 1),
  }));
  const maxId = expenses.reduce((m, r) => Math.max(m, r.id), 0);
  const maxTid = templates.reduce((m, t) => Math.max(m, t.id), 0);

  state.db = {
    version: 1,
    next_id: Math.max(Number(parsed.next_id || 0), maxId + 1),
    next_template_id: Math.max(Number(parsed.next_template_id || 0), maxTid + 1),
    expenses,
    recurring_templates: templates,
  };
  setSyncBadge("GitHub Synced ✓");
}

async function saveDatabaseToGitHub(commitMsg = "Update expenses") {
  setSyncBadge("Saving...");
  state.db.updated_at = new Date().toISOString();
  const raw = JSON.stringify(state.db);
  const url = `https://api.github.com/repos/${encodeURIComponent(state.owner)}/${DATA_REPO}/contents/${DATA_PATH}`;

  const body = {
    message: commitMsg,
    content: b64EncodeUtf8(raw),
  };
  if (state.sha) body.sha = state.sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${state.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 409) {
    // SHA conflict: fetch latest sha and retry once
    const latest = await fetch(url, {
      headers: { Authorization: `Bearer ${state.token}`, Accept: "application/vnd.github+json" },
    }).then((r) => r.json());
    body.sha = latest.sha;
    const retry = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${state.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!retry.ok) throw new Error(`Failed saving to GitHub (${retry.status})`);
    const rData = await retry.json();
    state.sha = rData.content.sha;
  } else if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    setSyncBadge("Save Error");
    throw new Error(err.message || `Failed saving to GitHub (${res.status})`);
  } else {
    const data = await res.json();
    state.sha = data.content.sha;
  }
  setSyncBadge("GitHub Synced ✓");
}

/* -------------------- Derived Metadata & Queries -------------------- */

function buildMeta() {
  const counts = new Map();
  const nonRecCounts = new Map();
  const yearsSet = new Set([new Date().getFullYear()]);

  for (const e of state.db.expenses) {
    const yr = Number(e.expense_date.slice(0, 4));
    if (yr) yearsSet.add(yr);
    const low = e.item.toLowerCase();
    counts.set(low, { label: counts.get(low)?.label || e.item, cnt: (counts.get(low)?.cnt || 0) + 1 });
    if (!e.is_recurring) {
      nonRecCounts.set(low, {
        label: nonRecCounts.get(low)?.label || e.item,
        cnt: (nonRecCounts.get(low)?.cnt || 0) + 1,
      });
    }
  }

  const quick_chips = [...nonRecCounts.values()]
    .sort((a, b) => b.cnt - a.cnt)
    .slice(0, 16)
    .map((x) => {
      let lbl = x.label;
      if (lbl === lbl.toLowerCase() && lbl.length > 2) {
        lbl = lbl.charAt(0).toUpperCase() + lbl.slice(1);
      }
      return { item: lbl, category: guessCategory(lbl), count: x.cnt };
    });

  const autocomplete_items = [...counts.values()]
    .sort((a, b) => b.cnt - a.cnt)
    .slice(0, 250)
    .map((x) => x.label);

  const years = [...yearsSet].sort((a, b) => b - a);
  return { categories: CATEGORIES, category_colors: CATEGORY_COLORS, quick_chips, autocomplete_items, years };
}

function queryExpenses({ year, month, q, category, is_recurring, limit = 1000 }) {
  const prefix = year && month
    ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-`
    : year
    ? `${String(year).padStart(4, "0")}-`
    : "";
  const qLow = (q || "").trim().toLowerCase();

  const filtered = state.db.expenses.filter((e) => {
    if (prefix && !e.expense_date.startsWith(prefix)) return false;
    if (category && category !== "ALL" && e.category !== category) return false;
    if (is_recurring !== undefined && is_recurring !== "" && String(e.is_recurring) !== String(is_recurring)) return false;
    if (qLow) {
      const hay = `${e.item} ${e.notes} ${e.category}`.toLowerCase();
      if (!hay.includes(qLow)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (a.expense_date !== b.expense_date) return b.expense_date.localeCompare(a.expense_date);
    if (a.is_recurring !== b.is_recurring) return a.is_recurring - b.is_recurring;
    return b.id - a.id;
  });

  const items = filtered.slice(0, limit);
  let total = 0;
  let recTotal = 0;
  for (const i of items) {
    total += Number(i.amount);
    if (Number(i.is_recurring) === 1) recTotal += Number(i.amount);
  }
  return {
    items,
    count: items.length,
    total: Math.round(total * 100) / 100,
    recurring_total: Math.round(recTotal * 100) / 100,
    daily_total: Math.round((total - recTotal) * 100) / 100,
  };
}

/* -------------------- Navigation & Boot -------------------- */

function switchView(view) {
  state.activeView = view;
  document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
  $(`view-${view}`).classList.add("active");
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  if (view === "month") loadMonthView();
  if (view === "trends") loadTrendsView();
  if (view === "manage") loadManageView();
  if (view === "add") loadQuickAddSnapshot();
  window.scrollTo({ top: 0, behavior: "instant" });
}

async function boot() {
  $("gh-owner").value = state.owner || "emamuthu";
  if (!state.token) {
    $("auth-overlay").classList.remove("hidden");
    $("app-shell").classList.add("hidden");
    $("login-password").focus();
    return;
  }

  try {
    await fetchDatabaseFromGitHub();
    $("auth-overlay").classList.add("hidden");
    $("app-shell").classList.remove("hidden");
    $("repo-indicator").textContent = `${state.owner}/${DATA_REPO}`;
    initAppData();
  } catch (err) {
    $("auth-overlay").classList.remove("hidden");
    $("app-shell").classList.add("hidden");
    $("login-error").textContent = err.message;
    $("login-error").classList.remove("hidden");
  }
}

function initAppData() {
  state.meta = buildMeta();
  populateSelectors();
  renderQuickChips();
  if (!$("add-date").value) $("add-date").value = todayISO();
  $("today-label").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  loadQuickAddSnapshot();
}

function populateSelectors() {
  const { categories, years, autocomplete_items } = state.meta;
  const catOptions = categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  $("add-category").innerHTML = `<option value="">Auto-detect</option>` + catOptions;
  $("edit-category").innerHTML = catOptions;
  $("tpl-category").innerHTML = catOptions;
  $("m-filter-cat").innerHTML = `<option value="ALL">All Categories</option>` + catOptions;

  $("item-datalist").innerHTML = autocomplete_items.map((it) => `<option value="${esc(it)}"></option>`).join("");

  $("select-month").innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
  const yearOpts = years.map((y) => `<option value="${y}">${y}</option>`).join("");
  $("select-year").innerHTML = yearOpts;
  $("select-month").value = String(state.curMonth);
  $("select-year").value = String(state.curYear);

  $("trends-year-select").innerHTML = `<option value="all">All Years</option>` + yearOpts;
  $("trends-year-select").value = String(state.curYear);
}

function renderQuickChips() {
  const chipsEl = $("quick-chips");
  chipsEl.innerHTML = state.meta.quick_chips
    .map((c) => `<button type="button" class="chip" data-item="${esc(c.item)}" data-cat="${esc(c.category)}">${esc(c.item)}</button>`)
    .join("");

  chipsEl.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      chipsEl.querySelectorAll(".chip").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      $("add-item").value = btn.dataset.item;
      $("add-category").value = btn.dataset.cat;
      if (!$("add-amount").value) $("add-amount").focus();
    });
  });
}

/* -------------------- View 1: Quick Add -------------------- */

function loadQuickAddSnapshot() {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth() + 1;
  const data = queryExpenses({ year: yr, month: mo, limit: 200 });

  $("header-month-pill").textContent = `${MONTHS_SHORT[mo - 1]} ${yr}: ${fmtWhole(data.total)}`;
  $("snap-total").textContent = fmtWhole(data.total);
  $("snap-daily").textContent = fmtWhole(data.daily_total);
  $("snap-fixed").textContent = fmtWhole(data.recurring_total);

  const recent = data.items.slice(0, 12);
  const listEl = $("recent-list");
  if (!recent.length) {
    listEl.innerHTML = `<div class="empty-state">No entries yet for ${MONTHS[mo - 1]} ${yr}. Add your first expense on the left!</div>`;
    return;
  }
  listEl.innerHTML = recent.map(renderTxRow).join("");
  bindTxRowClicks(listEl, recent);
}

function renderTxRow(tx) {
  const color = CATEGORY_COLORS[tx.category] || "#64748b";
  const fixedBadge = Number(tx.is_recurring) === 1 ? `<span class="pill-fixed">Fixed</span>` : "";
  const noteBit = tx.notes ? ` &middot; ${esc(tx.notes)}` : "";
  return `
    <div class="tx-row" data-id="${tx.id}">
      <div class="tx-left">
        <span class="cat-dot" style="background:${color}"></span>
        <div>
          <div class="tx-item">${esc(tx.item)}</div>
          <div class="tx-meta">
            <span>${esc(tx.expense_date)}</span>
            <span>&middot; ${esc(tx.category)}</span>
            ${fixedBadge}
            <span>${noteBit}</span>
          </div>
        </div>
      </div>
      <div class="tx-amt">${fmtMoney(tx.amount)}</div>
    </div>
  `;
}

function bindTxRowClicks(container, items) {
  const map = new Map(items.map((x) => [String(x.id), x]));
  container.querySelectorAll(".tx-row").forEach((row) => {
    row.addEventListener("click", () => {
      const tx = map.get(row.dataset.id);
      if (tx) openEditModal(tx);
    });
  });
}

async function handleQuickAdd(e) {
  e.preventDefault();
  const amount = Math.round(parseFloat($("add-amount").value) * 100) / 100;
  const item = $("add-item").value.trim();
  const category = $("add-category").value || guessCategory(item);
  const expense_date = $("add-date").value || todayISO();
  const notes = $("add-notes").value.trim();
  const is_recurring = $("add-recurring").checked ? 1 : 0;

  if (!amount || !item) return;

  const newEntry = {
    id: state.db.next_id++,
    expense_date,
    item,
    category,
    amount,
    is_recurring,
    notes,
    created_at: new Date().toISOString().slice(0, 19),
  };
  state.db.expenses.push(newEntry);

  $("add-amount").value = "";
  $("add-item").value = "";
  $("add-category").value = "";
  $("add-notes").value = "";
  $("add-recurring").checked = false;
  document.querySelectorAll("#quick-chips .chip").forEach((b) => b.classList.remove("selected"));
  $("add-amount").focus();

  loadQuickAddSnapshot();
  try {
    await saveDatabaseToGitHub(`Add ${item} ($${amount})`);
    showToast(`Saved ${item} (${fmtMoney(amount)}) to GitHub`);
  } catch (err) {
    showToast(err.message);
  }
}

/* -------------------- View 2: Monthly Log -------------------- */

function loadMonthView() {
  const yr = state.curYear;
  const mo = state.curMonth;
  $("select-month").value = String(mo);
  $("select-year").value = String(yr);

  const q = $("m-filter-q").value.trim();
  const category = $("m-filter-cat").value;
  const is_recurring = $("m-filter-type").value;

  const data = queryExpenses({ year: yr, month: mo, q, category, is_recurring, limit: 1000 });
  const prevData = queryExpenses({ year: yr - 1, month: mo, limit: 1000 });

  state.monthItems = data.items;
  $("m-total").textContent = fmtMoney(data.total);
  $("m-count").textContent = `${data.count} entries`;
  $("m-fixed").textContent = fmtMoney(data.recurring_total);
  const pct = data.total > 0 ? Math.round((data.recurring_total / data.total) * 100) : 0;
  $("m-fixed-pct").textContent = `${pct}% of month`;
  $("m-daily").textContent = fmtMoney(data.daily_total);

  const now = new Date();
  let daysElapsed = new Date(yr, mo, 0).getDate();
  if (yr === now.getFullYear() && mo === now.getMonth() + 1) {
    daysElapsed = Math.max(1, now.getDate());
  }
  $("m-daily-avg").textContent = `${fmtMoney(data.daily_total / daysElapsed)} / day`;

  const diffEl = $("m-yoy-diff");
  diffEl.classList.remove("accent-emerald", "accent-red");
  if (prevData.total > 0) {
    const diff = data.total - prevData.total;
    const sign = diff > 0 ? "+" : "";
    diffEl.textContent = `${sign}${fmtWhole(diff)}`;
    diffEl.classList.add(diff > 0 ? "accent-red" : "accent-emerald");
    $("m-yoy-prev").textContent = `${MONTHS_SHORT[mo - 1]} ${yr - 1} was ${fmtWhole(prevData.total)}`;
  } else {
    diffEl.textContent = "—";
    $("m-yoy-prev").textContent = `No data for ${MONTHS_SHORT[mo - 1]} ${yr - 1}`;
  }

  renderMonthEntries(data.items);
}

function renderMonthEntries(items) {
  const wrap = $("month-entries");
  if (!items.length) {
    wrap.innerHTML = `<div class="empty-state">No expenses match your filter for ${MONTHS[state.curMonth - 1]} ${state.curYear}.</div>`;
    return;
  }

  const groups = new Map();
  for (const tx of items) {
    if (!groups.has(tx.expense_date)) groups.set(tx.expense_date, []);
    groups.get(tx.expense_date).push(tx);
  }

  let html = "";
  for (const [dt, list] of groups.entries()) {
    const daySum = list.reduce((a, b) => a + Number(b.amount), 0);
    const [y, m, d] = dt.split("-").map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    html += `
      <div class="day-group">
        <div class="day-group-hdr">
          <span>${esc(label)}</span>
          <span>${fmtMoney(daySum)}</span>
        </div>
        <div class="tx-list">${list.map(renderTxRow).join("")}</div>
      </div>
    `;
  }
  wrap.innerHTML = html;
  bindTxRowClicks(wrap, items);
}

/* -------------------- View 3: Trends & YoY -------------------- */

function loadTrendsView() {
  const matrix = {};
  let allTotal = 0;
  let allCount = 0;

  for (const e of state.db.expenses) {
    const yr = Number(e.expense_date.slice(0, 4));
    const mo = Number(e.expense_date.slice(5, 7));
    if (!yr || !mo) continue;
    if (!matrix[yr]) {
      matrix[yr] = { year: yr, months: {}, total: 0, count: 0 };
      for (let m = 1; m <= 12; m++) matrix[yr].months[m] = 0;
    }
    matrix[yr].months[mo] += Number(e.amount);
    matrix[yr].total += Number(e.amount);
    matrix[yr].count += 1;
    allTotal += Number(e.amount);
    allCount += 1;
  }

  const years = Object.values(matrix).sort((a, b) => a.year - b.year);
  for (const y of years) {
    const active = Object.values(y.months).filter((v) => v > 0).length || 1;
    y.avg_monthly = y.total / active;
  }

  renderYoYMatrix({ years, all_time_total: allTotal, all_time_count: allCount });
  renderAnnualChart(years);
  loadYearBreakdown($("trends-year-select").value);
}

function renderYoYMatrix(yoy) {
  $("yoy-alltime-kpi").innerHTML = `
    <strong>${fmtWhole(yoy.all_time_total)}</strong>
    <span>${yoy.all_time_count.toLocaleString()} entries across ${yoy.years.length} years</span>
  `;

  const years = yoy.years;
  let html = `<thead><tr><th>Month</th>${years.map((y) => `<th>${y.year}</th>`).join("")}</tr></thead><tbody>`;
  for (let m = 1; m <= 12; m++) {
    html += `<tr><td>${MONTHS_SHORT[m - 1]}</td>`;
    for (const y of years) {
      const val = y.months[m] || 0;
      html += `<td class="yoy-cell" data-year="${y.year}" data-month="${m}">${val > 0 ? fmtWhole(val) : "—"}</td>`;
    }
    html += `</tr>`;
  }
  html += `<tr class="yoy-total-row"><td>12 Months</td>${years.map((y) => `<td>${fmtWhole(y.total)}</td>`).join("")}</tr>`;
  html += `<tr class="yoy-avg-row"><td>Monthly Avg</td>${years.map((y) => `<td>${fmtWhole(y.avg_monthly)}</td>`).join("")}</tr>`;
  html += `</tbody>`;

  const tbl = $("yoy-table");
  tbl.innerHTML = html;
  tbl.querySelectorAll(".yoy-cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      state.curYear = Number(cell.dataset.year);
      state.curMonth = Number(cell.dataset.month);
      switchView("month");
    });
  });
}

function renderAnnualChart(years) {
  const maxVal = Math.max(...years.map((y) => y.total), 1);
  const el = $("annual-chart");
  el.innerHTML = `<div class="annual-bars">
    ${years
      .map((y) => {
        const pct = Math.max(6, Math.round((y.total / maxVal) * 100));
        return `
          <div class="bar-col" data-year="${y.year}" title="${y.year}: ${fmtMoney(y.total)}">
            <div class="bar-val">$${(y.total / 1000).toFixed(1)}k</div>
            <div class="bar-fill" style="height:${pct}%"></div>
            <div class="bar-yr">${y.year}</div>
          </div>
        `;
      })
      .join("")}
  </div>`;

  el.querySelectorAll(".bar-col").forEach((col) => {
    col.addEventListener("click", () => {
      $("trends-year-select").value = col.dataset.year;
      loadYearBreakdown(col.dataset.year);
    });
  });
}

function loadYearBreakdown(year) {
  const prefix = year && year !== "all" ? `${year}-` : "";
  const catMap = new Map();
  const itemMap = new Map();
  let total = 0;

  for (const e of state.db.expenses) {
    if (prefix && !e.expense_date.startsWith(prefix)) continue;
    const amt = Number(e.amount);
    total += amt;

    const c = catMap.get(e.category) || { category: e.category, total: 0, count: 0 };
    c.total += amt;
    c.count += 1;
    catMap.set(e.category, c);

    const k = `${e.item.toLowerCase()}|${e.category}`;
    const it = itemMap.get(k) || { item: e.item, category: e.category, total: 0, count: 0 };
    it.total += amt;
    it.count += 1;
    itemMap.set(k, it);
  }

  const categories = [...catMap.values()].sort((a, b) => b.total - a.total);
  const topItems = [...itemMap.values()].sort((a, b) => b.total - a.total).slice(0, 15);
  const maxCat = Math.max(...categories.map((c) => c.total), 1);

  $("category-bars").innerHTML = categories
    .map((c) => {
      const pct = total > 0 ? ((c.total / total) * 100).toFixed(1) : "0.0";
      const barW = Math.max(3, Math.round((c.total / maxCat) * 100));
      const color = CATEGORY_COLORS[c.category] || "#64748b";
      return `
        <div class="cat-bar-row">
          <div class="cat-bar-top">
            <span>${esc(c.category)} <span class="muted-sm">(${c.count})</span></span>
            <span>${fmtWhole(c.total)} <span class="muted-sm">(${pct}%)</span></span>
          </div>
          <div class="cat-track">
            <div class="cat-fill" style="width:${barW}%;background:${color}"></div>
          </div>
        </div>
      `;
    })
    .join("") || `<div class="empty-state">No data for this period.</div>`;

  $("top-items-subtitle").textContent = year === "all" ? "All Time" : `${year} Total: ${fmtWhole(total)}`;
  $("top-items-list").innerHTML = topItems
    .map(
      (it) => `
      <div class="top-row">
        <div>
          <strong>${esc(it.item)}</strong>
          <span class="muted-sm">&middot; ${esc(it.category)} (${it.count}x)</span>
        </div>
        <strong>${fmtWhole(it.total)}</strong>
      </div>`
    )
    .join("") || `<div class="empty-state">No items yet.</div>`;
}

function handleGlobalSearch(e) {
  e.preventDefault();
  const q = $("global-search-input").value.trim().toLowerCase();
  const out = $("global-search-results");
  if (!q) { out.innerHTML = ""; return; }

  const matches = state.db.expenses
    .filter((x) => `${x.item} ${x.notes} ${x.category}`.toLowerCase().includes(q))
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date));

  if (!matches.length) {
    out.innerHTML = `<div class="empty-state">No entries found matching "${esc(q)}".</div>`;
    return;
  }

  let total = 0;
  const byYr = new Map();
  for (const m of matches) {
    total += Number(m.amount);
    const yr = Number(m.expense_date.slice(0, 4));
    const yObj = byYr.get(yr) || { year: yr, total: 0, count: 0 };
    yObj.total += Number(m.amount);
    yObj.count += 1;
    byYr.set(yr, yObj);
  }
  const byYearList = [...byYr.values()].sort((a, b) => b.year - a.year);

  out.innerHTML = `
    <div style="margin-bottom:8px;">
      <strong>${matches.length.toLocaleString()} matches</strong> totaling
      <strong class="accent-emerald">${fmtMoney(total)}</strong> across ${byYearList.length} year(s)
    </div>
    <div class="search-year-pills">
      ${byYearList.map((y) => `<div class="year-pill"><span class="muted-sm">${y.year} (${y.count}x)</span><strong>${fmtWhole(y.total)}</strong></div>`).join("")}
    </div>
    <div class="tx-list" id="search-tx-list">${matches.slice(0, 60).map(renderTxRow).join("")}</div>
  `;
  bindTxRowClicks($("search-tx-list"), matches.slice(0, 60));
}

/* -------------------- View 4: Manage & Backup -------------------- */

function loadManageView() {
  const templates = [...state.db.recurring_templates].sort((a, b) => b.default_amount - a.default_amount);
  const listEl = $("recurring-list");
  if (!templates.length) {
    listEl.innerHTML = `<div class="empty-state">No recurring bills configured yet.</div>`;
    return;
  }
  const activeSum = templates.filter((t) => Number(t.active) === 1).reduce((a, b) => a + Number(b.default_amount), 0);

  listEl.innerHTML =
    `<div class="muted-sm" style="margin-bottom:8px;">Total monthly fixed bills: <strong>${fmtMoney(activeSum)}</strong></div>` +
    templates
      .map((t) => {
        const color = CATEGORY_COLORS[t.category] || "#64748b";
        return `
          <div class="tx-row" data-tid="${t.id}">
            <div class="tx-left">
              <span class="cat-dot" style="background:${color}"></span>
              <div>
                <div class="tx-item">${esc(t.item)}</div>
                <div class="tx-meta">${esc(t.category)} &middot; Day ${t.day_of_month}</div>
              </div>
            </div>
            <div class="tx-amt">${fmtMoney(t.default_amount)}</div>
          </div>
        `;
      })
      .join("");

  listEl.querySelectorAll(".tx-row").forEach((row) => {
    row.addEventListener("click", () => {
      const tpl = state.db.recurring_templates.find((x) => String(x.id) === row.dataset.tid);
      if (tpl) openTemplateModal(tpl);
    });
  });
}

/* -------------------- Modals: Edit / Delete Expense -------------------- */

function openEditModal(tx) {
  $("edit-id").value = tx.id;
  $("edit-amount").value = tx.amount;
  $("edit-date").value = tx.expense_date;
  $("edit-item").value = tx.item;
  $("edit-category").value = tx.category;
  $("edit-notes").value = tx.notes || "";
  $("edit-recurring").checked = Number(tx.is_recurring) === 1;
  $("edit-modal").classList.remove("hidden");
}

function closeEditModal() {
  $("edit-modal").classList.add("hidden");
}

async function handleSaveEdit(e) {
  e.preventDefault();
  const id = Number($("edit-id").value);
  const idx = state.db.expenses.findIndex((x) => Number(x.id) === id);
  if (idx === -1) return;

  state.db.expenses[idx] = {
    ...state.db.expenses[idx],
    amount: Math.round(parseFloat($("edit-amount").value) * 100) / 100,
    expense_date: $("edit-date").value,
    item: $("edit-item").value.trim(),
    category: $("edit-category").value,
    notes: $("edit-notes").value.trim(),
    is_recurring: $("edit-recurring").checked ? 1 : 0,
  };
  closeEditModal();
  refreshCurrentView();
  try {
    await saveDatabaseToGitHub(`Update ${state.db.expenses[idx].item}`);
    showToast("Saved changes to GitHub");
  } catch (err) {
    showToast(err.message);
  }
}

async function handleDeleteExpense() {
  const id = Number($("edit-id").value);
  if (!confirm("Delete this expense entry?")) return;
  state.db.expenses = state.db.expenses.filter((x) => Number(x.id) !== id);
  closeEditModal();
  refreshCurrentView();
  try {
    await saveDatabaseToGitHub("Delete expense entry");
    showToast("Deleted and synced to GitHub");
  } catch (err) {
    showToast(err.message);
  }
}

/* -------------------- Modals: Apply Monthly Bills -------------------- */

function openApplyBillsModal() {
  const activeTemplates = state.db.recurring_templates
    .filter((t) => Number(t.active) === 1)
    .sort((a, b) => b.default_amount - a.default_amount);
  const existingNames = new Set(state.monthItems.map((i) => i.item.toLowerCase()));

  $("apply-bills-title").textContent = `Apply Monthly Bills — ${MONTHS[state.curMonth - 1]} ${state.curYear}`;
  const list = $("apply-bills-list");
  list.innerHTML = activeTemplates
    .map((t, idx) => {
      const alreadyExists = existingNames.has(t.item.toLowerCase());
      return `
        <div class="apply-row">
          <input type="checkbox" class="ab-check" data-idx="${idx}" ${alreadyExists ? "" : "checked"} />
          <div>
            <strong>${esc(t.item)}</strong>
            <div class="muted-sm">${esc(t.category)} ${alreadyExists ? " &middot; Already in this month" : ""}</div>
          </div>
          <input type="number" step="0.01" class="ab-amt" data-idx="${idx}" value="${t.default_amount}" />
        </div>
      `;
    })
    .join("");

  const updateTotal = () => {
    let sum = 0;
    let cnt = 0;
    list.querySelectorAll(".ab-check").forEach((chk) => {
      if (chk.checked) {
        const amt = parseFloat(list.querySelector(`.ab-amt[data-idx="${chk.dataset.idx}"]`).value) || 0;
        sum += amt;
        cnt += 1;
      }
    });
    $("apply-bills-total").textContent = `${cnt} bills selected (${fmtMoney(sum)})`;
  };
  list.oninput = updateTotal;
  list.onchange = updateTotal;
  updateTotal();
  state._activeTemplatesForApply = activeTemplates;
  $("apply-bills-modal").classList.remove("hidden");
}

async function handleConfirmApplyBills() {
  const list = $("apply-bills-list");
  const activeTemplates = state._activeTemplatesForApply || [];
  const maxDay = new Date(state.curYear, state.curMonth, 0).getDate();
  const nowIso = new Date().toISOString().slice(0, 19);
  let inserted = 0;

  list.querySelectorAll(".ab-check").forEach((chk) => {
    if (!chk.checked) return;
    const idx = Number(chk.dataset.idx);
    const tpl = activeTemplates[idx];
    const amt = Math.round((parseFloat(list.querySelector(`.ab-amt[data-idx="${idx}"]`).value) || 0) * 100) / 100;
    if (amt > 0) {
      const day = Math.max(1, Math.min(maxDay, Number(tpl.day_of_month || 1)));
      const dt = `${String(state.curYear).padStart(4, "0")}-${String(state.curMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      state.db.expenses.push({
        id: state.db.next_id++,
        expense_date: dt,
        item: tpl.item,
        category: tpl.category,
        amount: amt,
        is_recurring: 1,
        notes: "",
        created_at: nowIso,
      });
      inserted += 1;
    }
  });

  if (!inserted) {
    showToast("No bills selected");
    return;
  }

  $("apply-bills-modal").classList.add("hidden");
  loadMonthView();
  try {
    await saveDatabaseToGitHub(`Apply ${inserted} monthly bills for ${state.curYear}-${state.curMonth}`);
    showToast(`Added ${inserted} monthly bills & synced`);
  } catch (err) {
    showToast(err.message);
  }
}

/* -------------------- Modals: Recurring Template -------------------- */

function openTemplateModal(tpl = null) {
  $("tpl-id").value = tpl ? tpl.id : "";
  $("tpl-modal-title").textContent = tpl ? "Edit Recurring Bill" : "New Recurring Bill";
  $("tpl-item").value = tpl ? tpl.item : "";
  $("tpl-amount").value = tpl ? tpl.default_amount : "";
  $("tpl-category").value = tpl ? tpl.category : "Bills & Subscriptions";
  $("tpl-day").value = tpl ? tpl.day_of_month : 1;
  $("delete-tpl-btn").classList.toggle("hidden", !tpl);
  $("template-modal").classList.remove("hidden");
}

async function handleSaveTemplate(e) {
  e.preventDefault();
  const id = Number($("tpl-id").value || 0);
  const entry = {
    id: id || state.db.next_template_id++,
    item: $("tpl-item").value.trim(),
    default_amount: Math.round(parseFloat($("tpl-amount").value) * 100) / 100,
    category: $("tpl-category").value,
    day_of_month: parseInt($("tpl-day").value, 10) || 1,
    active: 1,
  };
  if (id) {
    const idx = state.db.recurring_templates.findIndex((t) => Number(t.id) === id);
    if (idx !== -1) state.db.recurring_templates[idx] = entry;
  } else {
    state.db.recurring_templates.push(entry);
  }
  $("template-modal").classList.add("hidden");
  loadManageView();
  try {
    await saveDatabaseToGitHub(`Save recurring template ${entry.item}`);
    showToast("Recurring bill saved to GitHub");
  } catch (err) {
    showToast(err.message);
  }
}

async function handleDeleteTemplate() {
  const id = Number($("tpl-id").value || 0);
  if (!id || !confirm("Delete this recurring bill template?")) return;
  state.db.recurring_templates = state.db.recurring_templates.filter((t) => Number(t.id) !== id);
  $("template-modal").classList.add("hidden");
  loadManageView();
  await saveDatabaseToGitHub("Delete recurring template");
  showToast("Template deleted");
}

/* -------------------- Export & Restore -------------------- */

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function refreshCurrentView() {
  state.meta = buildMeta();
  if (state.activeView === "add") loadQuickAddSnapshot();
  if (state.activeView === "month") loadMonthView();
  if (state.activeView === "trends") loadTrendsView();
  if (state.activeView === "manage") loadManageView();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("login-error").classList.add("hidden");
    state.owner = $("gh-owner").value.trim() || "emamuthu";
    state.token = $("login-password").value.trim();
    localStorage.setItem(STORAGE_OWNER_KEY, state.owner);
    localStorage.setItem(STORAGE_TOKEN_KEY, state.token);
    await boot();
  });

  $("logout-btn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    state.token = "";
    $("login-password").value = "";
    boot();
  });

  $("sync-now-btn").addEventListener("click", async () => {
    try {
      await fetchDatabaseFromGitHub();
      refreshCurrentView();
      showToast("Synced latest expenses from GitHub");
    } catch (err) {
      showToast(err.message);
    }
  });

  $("quick-add-form").addEventListener("submit", handleQuickAdd);
  $("jump-this-month").addEventListener("click", () => {
    const now = new Date();
    state.curYear = now.getFullYear();
    state.curMonth = now.getMonth() + 1;
    switchView("month");
  });

  $("prev-month-btn").addEventListener("click", () => {
    state.curMonth -= 1;
    if (state.curMonth < 1) { state.curMonth = 12; state.curYear -= 1; }
    loadMonthView();
  });
  $("next-month-btn").addEventListener("click", () => {
    state.curMonth += 1;
    if (state.curMonth > 12) { state.curMonth = 1; state.curYear += 1; }
    loadMonthView();
  });
  $("select-month").addEventListener("change", (e) => { state.curMonth = Number(e.target.value); loadMonthView(); });
  $("select-year").addEventListener("change", (e) => { state.curYear = Number(e.target.value); loadMonthView(); });
  $("m-filter-q").addEventListener("input", () => loadMonthView());
  $("m-filter-cat").addEventListener("change", () => loadMonthView());
  $("m-filter-type").addEventListener("change", () => loadMonthView());
  $("month-add-btn").addEventListener("click", () => {
    const y = state.curYear;
    const m = String(state.curMonth).padStart(2, "0");
    const today = todayISO();
    $("add-date").value = today.startsWith(`${y}-${m}`) ? today : `${y}-${m}-01`;
    switchView("add");
    $("add-amount").focus();
  });

  $("trends-year-select").addEventListener("change", (e) => loadYearBreakdown(e.target.value));
  $("global-search-form").addEventListener("submit", handleGlobalSearch);

  $("edit-expense-form").addEventListener("submit", handleSaveEdit);
  $("delete-expense-btn").addEventListener("click", handleDeleteExpense);
  $("close-edit-modal").addEventListener("click", closeEditModal);
  $("cancel-edit-modal").addEventListener("click", closeEditModal);
  $("edit-modal").querySelector(".modal-backdrop").addEventListener("click", closeEditModal);

  $("open-apply-bills-btn").addEventListener("click", openApplyBillsModal);
  $("confirm-apply-bills").addEventListener("click", handleConfirmApplyBills);
  $("close-apply-modal").addEventListener("click", () => $("apply-bills-modal").classList.add("hidden"));
  $("cancel-apply-modal").addEventListener("click", () => $("apply-bills-modal").classList.add("hidden"));
  $("apply-bills-modal").querySelector(".modal-backdrop").addEventListener("click", () => $("apply-bills-modal").classList.add("hidden"));

  $("add-template-btn").addEventListener("click", () => openTemplateModal(null));
  $("template-form").addEventListener("submit", handleSaveTemplate);
  $("delete-tpl-btn").addEventListener("click", handleDeleteTemplate);
  $("close-tpl-modal").addEventListener("click", () => $("template-modal").classList.add("hidden"));
  $("cancel-tpl-modal").addEventListener("click", () => $("template-modal").classList.add("hidden"));
  $("template-modal").querySelector(".modal-backdrop").addEventListener("click", () => $("template-modal").classList.add("hidden"));

  $("download-json-btn").addEventListener("click", () => {
    downloadBlob(JSON.stringify(state.db, null, 2), `expenses_backup_${todayISO()}.json`, "application/json");
  });

  $("download-csv-btn").addEventListener("click", () => {
    const rows = [["Date", "Item", "Category", "Amount", "Type", "Notes"]];
    for (const r of state.db.expenses) {
      rows.push([
        r.expense_date,
        `"${String(r.item).replace(/"/g, '""')}"`,
        `"${String(r.category).replace(/"/g, '""')}"`,
        Number(r.amount).toFixed(2),
        Number(r.is_recurring) === 1 ? "Recurring" : "Daily",
        `"${String(r.notes || "").replace(/"/g, '""')}"`,
      ]);
    }
    downloadBlob(rows.map((r) => r.join(",")).join("\n"), `expenses_all_${todayISO()}.csv`, "text/csv");
  });

  $("import-json-btn").addEventListener("click", async () => {
    const file = $("import-json-file").files[0];
    if (!file) { showToast("Select a JSON backup file first"); return; }
    if (!confirm("Replace cloud database with this backup file?")) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.expenses)) { showToast("Invalid backup JSON"); return; }
    state.db.expenses = parsed.expenses.map((r, i) => ({
      id: Number(r.id || i + 1),
      expense_date: String(r.expense_date),
      item: String(r.item),
      category: String(r.category || guessCategory(r.item)),
      amount: Number(r.amount),
      is_recurring: Number(r.is_recurring ? 1 : 0),
      notes: String(r.notes || ""),
      created_at: String(r.created_at || ""),
    }));
    state.db.next_id = state.db.expenses.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    await saveDatabaseToGitHub(`Restore ${state.db.expenses.length} records from backup`);
    initAppData();
    loadManageView();
    showToast(`Restored & synced ${state.db.expenses.length.toLocaleString()} records!`);
  });

  boot();
});
