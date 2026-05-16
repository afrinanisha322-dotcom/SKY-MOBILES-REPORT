/**
 * SKY MOBILES — Sales & Expense Dashboard
 * Data persisted in localStorage
 */

const STORAGE_KEY = "sky_mobiles_data_v1";
const SESSION_KEY = "sky_mobiles_session";
const AUTH_KEY = "sky_mobiles_auth";
const DEMO_EMAIL = "admin@skymobiles.in";
const DEMO_PASS = "sky2026";
const APP_BASE_PATH = "/sky-mobiles";

const state = {
  activeDate: todayKey(),
  calendarMonth: new Date(),
  data: loadData(),
  profile: loadProfile(),
  charts: {},
};

function todayKey() {
  return formatDateKey(new Date());
}

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { email: DEMO_EMAIL, password: DEMO_PASS };
}

function saveAuth(email, password) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ email, password }));
}

function getLoginEmail() {
  return loadAuth().email || DEMO_EMAIL;
}

function checkPassword(pass) {
  return pass === loadAuth().password;
}

function loadProfile() {
  try {
    const raw = localStorage.getItem("sky_mobiles_profile");
    return raw
      ? JSON.parse(raw)
      : { name: "Admin", email: DEMO_EMAIL, shop: "SKY MOBILES" };
  } catch {
    return { name: "Admin", email: DEMO_EMAIL, shop: "SKY MOBILES" };
  }
}

function saveProfile() {
  localStorage.setItem("sky_mobiles_profile", JSON.stringify(state.profile));
}

function ensureDay(key) {
  if (!state.data[key]) {
    state.data[key] = { sales: [], expenses: [] };
  }
  return state.data[key];
}

function getDay(key = state.activeDate) {
  return ensureDay(key);
}

function calcDayTotals(day) {
  let items = 0;
  let revenue = 0;
  day.sales.forEach((s) => {
    const q = Number(s.qty) || 0;
    const p = Number(s.price) || 0;
    items += q;
    revenue += p * q;
  });
  let expenses = 0;
  day.expenses.forEach((e) => {
    expenses += Number(e.amount) || 0;
  });
  const profit = revenue - expenses;
  return { items, revenue, expenses, profit };
}

function formatINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

let lastHistoryDate = null;

function showToast(message, type = "success") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

function migrateData() {
  Object.values(state.data).forEach((day) => {
    day.sales?.forEach((s) => {
      if (!s.product && !s.name) s.product = "General item";
    });
  });
}

/* ——— Boot ——— */
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  setTimeout(() => {
    loader?.classList.add("is-hidden");
    initApp();
  }, 1400);
});

function initApp() {
  const session = sessionStorage.getItem(SESSION_KEY);
  if (session === "ok") {
    showApp();
  } else {
    showLogin();
  }
  bindAuth();
  bindNavigation();
  bindForms();
  bindCalendar();
  bindHistoryPanel();
  bindMisc();
  bindSaleLinePreview();
  migrateData();
  seedDemoDataIfEmpty();
  const fy = document.getElementById("footer-year");
  if (fy) fy.textContent = String(new Date().getFullYear());
  renderAppUrls();
  if (sessionStorage.getItem(SESSION_KEY) === "ok") {
    refreshAll();
  }
}

function renderAppUrls() {
  const ul = document.getElementById("app-url-list");
  if (!ul) return;
  const origin = window.location.origin || "http://localhost:5173";
  const base = origin + APP_BASE_PATH + "/";
  const paths = [
    { label: "This device", href: base },
    { label: "Localhost", href: `http://localhost:5173${APP_BASE_PATH}/` },
  ];
  ul.innerHTML = paths
    .map(
      (p) =>
        `<li><strong>${p.label}:</strong> <a href="${p.href}" target="_blank" rel="noopener">${p.href}</a></li>`
    )
    .join("");
}

function showLogin() {
  document.getElementById("login-screen")?.removeAttribute("hidden");
  document.getElementById("app")?.setAttribute("hidden", "");
  const emailInput = document.getElementById("login-email");
  if (emailInput && !emailInput.value) emailInput.value = getLoginEmail();
}

function showApp() {
  document.getElementById("login-screen")?.setAttribute("hidden", "");
  document.getElementById("app")?.removeAttribute("hidden");
  applyProfileUI();
}

function bindAuth() {
  document.getElementById("login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value.trim();
    const pass = document.getElementById("login-password")?.value;
    const err = document.getElementById("login-error");
    const auth = loadAuth();
    if (email === auth.email && pass === auth.password) {
      if (err) err.hidden = true;
      sessionStorage.setItem(SESSION_KEY, "ok");
      showApp();
      refreshAll();
      showToast("Welcome back!");
    } else {
      if (err) {
        err.textContent = `Invalid email or password. Try: ${getLoginEmail()} / (your password)`;
        err.hidden = false;
      }
    }
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
    showToast("Signed out", "success");
  });
}

function bindNavigation() {
  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");
      switchView(view);
      closeSidebar();
    });
  });

  document.getElementById("profile-open")?.addEventListener("click", () => {
    switchView("settings");
  });

  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("is-open");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (backdrop) backdrop.hidden = !document.getElementById("sidebar")?.classList.contains("is-open");
  });

  document.getElementById("sidebar-backdrop")?.addEventListener("click", closeSidebar);
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("is-open");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (backdrop) backdrop.hidden = true;
}

const viewTitles = {
  dashboard: "Dashboard",
  sales: "Daily Sales",
  expenses: "Expenses",
  reports: "Reports",
  history: "History",
  settings: "Settings",
};

function switchView(view) {
  document.querySelectorAll(".nav-item[data-view]").forEach((n) => {
    n.classList.toggle("is-active", n.getAttribute("data-view") === view);
  });
  document.querySelectorAll(".view").forEach((v) => {
    const match = v.getAttribute("data-view") === view || v.id === `view-${view}`;
    v.classList.toggle("is-visible", match);
    v.hidden = !match;
  });
  const title = document.getElementById("page-title");
  if (title) title.textContent = viewTitles[view] || "Dashboard";
  if (view === "reports") renderReports();
  if (view === "history") mountHistoryCalendar();
  if (view === "sales" || view === "expenses" || view === "dashboard") refreshAll();
}

function bindForms() {
  document.getElementById("sale-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    addSale(
      document.getElementById("sale-product")?.value,
      document.getElementById("sale-price")?.value,
      document.getElementById("sale-qty")?.value
    );
    e.target.reset();
    const qty = document.getElementById("sale-qty");
    if (qty) qty.value = "1";
    updateSaleLinePreview("sale-price", "sale-qty", "sale-line-preview");
  });

  document.getElementById("expense-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    addExpense(
      document.getElementById("expense-name")?.value,
      document.getElementById("expense-amount")?.value
    );
    e.target.reset();
  });

  document.getElementById("sale-form-alt")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    addSale(
      form.querySelector(".sale-product-alt")?.value,
      form.querySelector(".sale-price-alt")?.value,
      form.querySelector(".sale-qty-alt")?.value
    );
    form.reset();
    form.querySelector(".sale-qty-alt").value = "1";
    const priceAlt = form.querySelector(".sale-price-alt");
    const previewAlt = form.querySelector(".sale-line-preview-alt");
    const qtyAlt = form.querySelector(".sale-qty-alt");
    if (previewAlt) previewAlt.textContent = formatINR(0);
    if (qtyAlt) qtyAlt.value = "1";
  });

  document.getElementById("expense-form-alt")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    addExpense(form.querySelector(".expense-name-alt")?.value, form.querySelector(".expense-amount-alt")?.value);
    form.reset();
  });

  document.getElementById("password-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const current = document.getElementById("pw-current")?.value || "";
    const next = document.getElementById("pw-new")?.value || "";
    const confirm = document.getElementById("pw-confirm")?.value || "";
    const msg = document.getElementById("password-msg");

    const showPwMsg = (text, ok) => {
      if (!msg) return;
      msg.textContent = text;
      msg.className = "form-msg " + (ok ? "success" : "error");
      msg.hidden = false;
    };

    if (!checkPassword(current)) {
      showPwMsg("Current password is incorrect.", false);
      return;
    }
    if (next.length < 6) {
      showPwMsg("New password must be at least 6 characters.", false);
      return;
    }
    if (next !== confirm) {
      showPwMsg("New passwords do not match.", false);
      return;
    }

    const auth = loadAuth();
    saveAuth(auth.email, next);
    e.target.reset();
    showPwMsg("Password updated successfully.", true);
    showToast("Password changed");
  });

  document.getElementById("profile-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    state.profile.name = document.getElementById("settings-name")?.value.trim() || "Admin";
    state.profile.shop = document.getElementById("settings-shop")?.value.trim() || "SKY MOBILES";
    const newEmail = document.getElementById("settings-email")?.value.trim() || DEMO_EMAIL;
    state.profile.email = newEmail;
    const auth = loadAuth();
    saveAuth(newEmail, auth.password);
    saveProfile();
    applyProfileUI();
    renderAppUrls();
    showToast("Profile saved");
  });

  document.getElementById("clear-data-btn")?.addEventListener("click", () => {
    if (confirm("Delete ALL sales and expense records? This cannot be undone.")) {
      state.data = {};
      saveData();
      refreshAll();
      showToast("All data reset");
    }
  });
}

function calcLineTotal(priceVal, qtyVal) {
  return (Number(priceVal) || 0) * (Number(qtyVal) || 0);
}

function bindSaleLinePreview() {
  const setups = [
    { price: "sale-price", qty: "sale-qty", out: "sale-line-preview" },
  ];
  const altForm = document.getElementById("sale-form-alt");
  if (altForm) {
    setups.push({
      priceEl: altForm.querySelector(".sale-price-alt"),
      qtyEl: altForm.querySelector(".sale-qty-alt"),
      outEl: altForm.querySelector(".sale-line-preview-alt"),
    });
  }

  setups.forEach((cfg) => {
    const priceEl = cfg.priceEl || document.getElementById(cfg.price);
    const qtyEl = cfg.qtyEl || document.getElementById(cfg.qty);
    const outEl = cfg.outEl || document.getElementById(cfg.out);
    if (!priceEl || !qtyEl || !outEl) return;

    const update = () => {
      outEl.textContent = formatINR(calcLineTotal(priceEl.value, qtyEl.value));
    };
    priceEl.addEventListener("input", update);
    qtyEl.addEventListener("input", update);
    update();
  });
}

function updateSaleLinePreview(priceId, qtyId, outId) {
  const priceEl = document.getElementById(priceId);
  const qtyEl = document.getElementById(qtyId);
  const outEl = document.getElementById(outId);
  if (outEl && priceEl && qtyEl) {
    outEl.textContent = formatINR(calcLineTotal(priceEl.value, qtyEl.value));
  }
}

function saleProductName(item) {
  const name = String(item.product || item.name || "").trim();
  return name || "Unnamed product";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function saleRowHtml(item, withRemove) {
  const price = Number(item.price);
  const qty = Number(item.qty);
  const line = price * qty;
  const name = escapeHtml(saleProductName(item));
  const removeBtn = withRemove
    ? `<button type="button" aria-label="Remove">×</button>`
    : "";
  return `
    <span class="sale-col-product" title="${name}">${name}</span>
    <span class="sale-col-qty">${qty}</span>
    <span class="sale-col-price">${formatINR(price)}</span>
    <span class="sale-col-total">${formatINR(line)}</span>
    ${removeBtn}`;
}

function addSale(productVal, priceVal, qtyVal) {
  const product = String(productVal || "").trim();
  const price = Number(priceVal);
  const qty = Number(qtyVal) || 1;
  if (!product || price <= 0 || qty < 1) return;
  const day = getDay();
  day.sales.push({ id: uid(), product, price, qty });
  saveData();
  refreshAll();
  showToast("Sale added");
}

function addExpense(name, amountVal) {
  const amount = Number(amountVal);
  const label = String(name || "").trim();
  if (!label || !amount || amount < 0) return;
  const day = getDay();
  day.expenses.push({ id: uid(), name: label, amount });
  saveData();
  refreshAll();
  showToast("Expense added");
}

function removeSale(id) {
  const day = getDay();
  day.sales = day.sales.filter((s) => s.id !== id);
  saveData();
  refreshAll();
}

function removeExpense(id) {
  const day = getDay();
  day.expenses = day.expenses.filter((e) => e.id !== id);
  saveData();
  refreshAll();
}

function expenseRowHtml(item, withRemove) {
  const name = escapeHtml(item.name);
  const btn = withRemove ? `<button type="button" aria-label="Remove">×</button>` : "";
  return `<span class="sale-col-product">${name}</span><span class="exp-col-amount">${formatINR(item.amount)}</span>${btn}`;
}

function renderEntryList(containerId, items, type) {
  const ul = document.getElementById(containerId);
  if (!ul) return;
  ul.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    if (type === "sale") {
      li.innerHTML = saleRowHtml(item, true);
      li.querySelector("button").addEventListener("click", () => removeSale(item.id));
    } else {
      li.innerHTML = expenseRowHtml(item, true);
      li.querySelector("button").addEventListener("click", () => removeExpense(item.id));
    }
    ul.appendChild(li);
  });
}

function applyProfitStyles(profit) {
  const els = [
    document.getElementById("net-profit"),
    document.getElementById("stat-profit"),
  ];
  const card = document.getElementById("profit-card");
  const statCard = document.getElementById("stat-profit-card");
  const positive = profit >= 0;
  els.forEach((el) => {
    if (!el) return;
    el.textContent = formatINR(profit);
    el.classList.toggle("profit-positive", positive);
    el.classList.toggle("profit-negative", !positive);
  });
  card?.classList.toggle("positive", positive);
  card?.classList.toggle("negative", !positive);
  statCard?.classList.toggle("highlight-profit", positive);
}

function refreshAll() {
  const day = getDay();
  const { items, revenue, expenses, profit } = calcDayTotals(day);

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  set("total-items-sold", String(items));
  set("total-revenue", formatINR(revenue));
  set("total-items-sold-alt", String(items));
  set("total-revenue-alt", formatINR(revenue));
  set("total-expenses", formatINR(expenses));
  set("total-expenses-alt", formatINR(expenses));
  set("stat-revenue", formatINR(revenue));
  set("stat-items", String(items));
  set("stat-expenses", formatINR(expenses));
  set("profit-sales-ref", formatINR(revenue));
  set("profit-expenses-ref", formatINR(expenses));
  set("stat-profit", formatINR(profit));
  applyProfitStyles(profit);

  renderEntryList("sales-list", day.sales, "sale");
  renderEntryList("expenses-list", day.expenses, "expense");
  renderEntryList("sales-list-alt", day.sales, "sale");
  renderEntryList("expenses-list-alt", day.expenses, "expense");

  const dateLabel = new Date(state.activeDate + "T12:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const pageDate = document.getElementById("page-date");
  if (pageDate) pageDate.textContent = dateLabel;
  document.querySelectorAll(".active-date-label").forEach((el) => {
    el.textContent = dateLabel;
  });
  const footerShop = document.getElementById("footer-shop");
  if (footerShop) footerShop.textContent = state.profile.shop || "SKY MOBILES";

  const dateInput = document.getElementById("global-date-search");
  if (dateInput && dateInput !== document.activeElement) {
    dateInput.value = state.activeDate;
  }

  renderCalendar("calendar-grid");
  updateCharts(revenue, expenses, profit);
}

function bindCalendar() {
  document.getElementById("prev-month")?.addEventListener("click", () => {
    state.calendarMonth = new Date(
      state.calendarMonth.getFullYear(),
      state.calendarMonth.getMonth() - 1,
      1
    );
    renderCalendar("calendar-grid");
  });
  document.getElementById("next-month")?.addEventListener("click", () => {
    state.calendarMonth = new Date(
      state.calendarMonth.getFullYear(),
      state.calendarMonth.getMonth() + 1,
      1
    );
    renderCalendar("calendar-grid");
  });
}

function renderCalendar(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const y = state.calendarMonth.getFullYear();
  const m = state.calendarMonth.getMonth();
  const monthText = state.calendarMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const label = document.getElementById("calendar-month-label");
  if (label) label.textContent = monthText;
  const histLabel = document.getElementById("hist-month-label");
  if (histLabel) histLabel.textContent = monthText;

  grid.innerHTML = "";
  const first = new Date(y, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayKey();

  for (let i = 0; i < startPad; i++) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.className = "cal-day is-empty";
    empty.disabled = true;
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day";
    btn.textContent = String(d);

    const record = state.data[key];
    if (record) {
      const t = calcDayTotals(record);
      if (t.revenue || t.expenses) {
        btn.classList.add("has-data");
        if (t.profit < 0) btn.classList.add("is-loss");
        const mini = document.createElement("span");
        mini.className = "mini-profit";
        mini.textContent = t.profit >= 0 ? "+" + formatINR(t.profit) : formatINR(t.profit);
        btn.appendChild(mini);
      }
    }

    if (key === today) btn.classList.add("is-today");
    if (key === state.activeDate) btn.classList.add("is-selected");

    btn.addEventListener("click", () => {
      if (gridId === "calendar-grid") {
        state.activeDate = key;
        refreshAll();
      }
      openHistoryPanel(key);
    });

    grid.appendChild(btn);
  }
}

function mountHistoryCalendar() {
  const mount = document.getElementById("history-calendar-mount");
  if (!mount || mount.dataset.mounted) return;
  mount.innerHTML = `
    <div class="month-nav" style="margin-bottom:1rem">
      <button type="button" class="btn-icon-sm" id="hist-prev-month">‹</button>
      <span id="hist-month-label"></span>
      <button type="button" class="btn-icon-sm" id="hist-next-month">›</button>
    </div>
    <div class="calendar-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
    <div id="hist-calendar-grid" class="calendar-grid"></div>
  `;

  mount.dataset.mounted = "1";
  document.getElementById("hist-prev-month")?.addEventListener("click", () => {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
    renderCalendar("hist-calendar-grid");
  });
  document.getElementById("hist-next-month")?.addEventListener("click", () => {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
    renderCalendar("hist-calendar-grid");
  });
  renderCalendar("hist-calendar-grid");
}

function bindHistoryPanel() {
  document.getElementById("close-history")?.addEventListener("click", closeHistoryPanel);
  document.getElementById("history-backdrop")?.addEventListener("click", closeHistoryPanel);
}

function openHistoryPanel(dateKey) {
  lastHistoryDate = dateKey;
  const panel = document.getElementById("history-panel");
  const backdrop = document.getElementById("history-backdrop");
  const day = state.data[dateKey] || { sales: [], expenses: [] };
  const t = calcDayTotals(day);

  document.getElementById("history-panel-date").textContent = new Date(
    dateKey + "T12:00:00"
  ).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  document.getElementById("hist-qty").textContent = String(t.items);
  document.getElementById("hist-sales").textContent = formatINR(t.revenue);
  document.getElementById("hist-expenses").textContent = formatINR(t.expenses);
  const histProfit = document.getElementById("hist-profit");
  histProfit.textContent = formatINR(t.profit);
  histProfit.classList.toggle("profit-positive", t.profit >= 0);
  histProfit.classList.toggle("profit-negative", t.profit < 0);

  const salesUl = document.getElementById("hist-sales-list");
  const expUl = document.getElementById("hist-expenses-list");
  salesUl.innerHTML = "";
  expUl.innerHTML = "";

  day.sales.forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = saleRowHtml(s, false);
    salesUl.appendChild(li);
  });
  day.expenses.forEach((e) => {
    const li = document.createElement("li");
    li.innerHTML = expenseRowHtml(e, false);
    expUl.appendChild(li);
  });

  panel?.classList.add("is-open");
  panel?.setAttribute("aria-hidden", "false");
  backdrop?.classList.add("is-visible");
  backdrop?.removeAttribute("hidden");
}

function closeHistoryPanel() {
  document.getElementById("history-panel")?.classList.remove("is-open");
  document.getElementById("history-panel")?.setAttribute("aria-hidden", "true");
  const backdrop = document.getElementById("history-backdrop");
  backdrop?.classList.remove("is-visible");
  backdrop?.setAttribute("hidden", "");
}

function goToToday() {
  state.activeDate = todayKey();
  state.calendarMonth = new Date();
  refreshAll();
  showToast("Showing today");
}

function exportCSV() {
  const day = getDay();
  const rows = [["Type", "Product/Name", "Quantity", "Price", "Line Total", "Date"]];
  day.sales.forEach((s) => {
    rows.push(["Sale", saleProductName(s), s.qty, s.price, Number(s.price) * Number(s.qty), state.activeDate]);
  });
  day.expenses.forEach((e) => {
    rows.push(["Expense", e.name, "", "", e.amount, state.activeDate]);
  });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SKY-MOBILES-${state.activeDate}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("CSV downloaded");
}

function exportJSON() {
  const payload = { exported: new Date().toISOString(), data: state.data, profile: state.profile };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sky-mobiles-backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Backup exported");
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (parsed.data) state.data = parsed.data;
      if (parsed.profile) {
        state.profile = parsed.profile;
        saveProfile();
      }
      saveData();
      migrateData();
      refreshAll();
      showToast("Backup imported");
    } catch {
      showToast("Invalid backup file", "error");
    }
  };
  reader.readAsText(file);
}

function bindMisc() {
  document.getElementById("global-date-search")?.addEventListener("change", (e) => {
    state.activeDate = e.target.value;
    refreshAll();
    openHistoryPanel(state.activeDate);
  });

  document.getElementById("go-today-btn")?.addEventListener("click", goToToday);
  document.getElementById("export-pdf-btn")?.addEventListener("click", exportPDF);
  document.getElementById("export-pdf-alt")?.addEventListener("click", exportPDF);
  document.getElementById("export-csv-btn")?.addEventListener("click", exportCSV);
  document.getElementById("export-csv-alt")?.addEventListener("click", exportCSV);
  document.getElementById("export-json-btn")?.addEventListener("click", exportJSON);
  document.getElementById("import-json-input")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJSON(file);
    e.target.value = "";
  });

  document.getElementById("hist-load-day")?.addEventListener("click", () => {
    if (lastHistoryDate) {
      state.activeDate = lastHistoryDate;
      closeHistoryPanel();
      switchView("dashboard");
      refreshAll();
      showToast("Day loaded in dashboard");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeHistoryPanel();
  });
}

function applyProfileUI() {
  const initials = (state.profile.name || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const set = (id, val, prop = "textContent") => {
    const el = document.getElementById(id);
    if (!el) return;
    if (prop === "value") el.value = val;
    else el[prop] = val;
  };
  set("avatar-initials", initials);
  set("profile-display-name", state.profile.name);
  set("settings-name", state.profile.name, "value");
  set("settings-shop", state.profile.shop, "value");
  set("settings-email", state.profile.email, "value");
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#7da8c8", font: { family: "Outfit" } },
      },
    },
    scales: {
      x: {
        ticks: { color: "#7da8c8" },
        grid: { color: "rgba(0,212,255,0.08)" },
      },
      y: {
        ticks: { color: "#7da8c8" },
        grid: { color: "rgba(0,212,255,0.08)" },
      },
    },
  };
}

function updateCharts(revenue, expenses) {
  if (typeof Chart === "undefined") return;

  const dailyCtx = document.getElementById("daily-chart");
  if (dailyCtx) {
    state.charts.daily?.destroy();
    state.charts.daily = new Chart(dailyCtx, {
      type: "doughnut",
      data: {
        labels: ["Revenue", "Expenses"],
        datasets: [
          {
            data: [revenue, expenses],
            backgroundColor: ["rgba(0, 212, 255, 0.75)", "rgba(248, 113, 113, 0.65)"],
            borderColor: ["#00d4ff", "#f87171"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        ...chartDefaults(),
        plugins: { ...chartDefaults().plugins, legend: { position: "bottom" } },
      },
    });
  }

  const monthlyCtx = document.getElementById("monthly-chart");
  if (monthlyCtx) {
    const { labels, salesData, profitData } = getMonthSeries();
    state.charts.monthly?.destroy();
    state.charts.monthly = new Chart(monthlyCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Sales (₹)",
            data: salesData,
            borderColor: "#00d4ff",
            backgroundColor: "rgba(0, 212, 255, 0.12)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Profit (₹)",
            data: profitData,
            borderColor: "#34d399",
            backgroundColor: "transparent",
            tension: 0.4,
          },
        ],
      },
      options: chartDefaults(),
    });
  }
}

function getMonthSeries() {
  const y = state.calendarMonth.getFullYear();
  const m = state.calendarMonth.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const labels = [];
  const salesData = [];
  const profitData = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    labels.push(String(d));
    const record = state.data[key];
    if (record) {
      const t = calcDayTotals(record);
      salesData.push(t.revenue);
      profitData.push(t.profit);
    } else {
      salesData.push(0);
      profitData.push(0);
    }
  }
  return { labels, salesData, profitData };
}

function renderReports() {
  const dl = document.getElementById("report-summary");
  if (!dl) return;

  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  let totalSales = 0;
  let totalExp = 0;
  let daysActive = 0;

  Object.keys(state.data).forEach((key) => {
    const d = new Date(key + "T12:00:00");
    if (d.getFullYear() === y && d.getMonth() === m) {
      const t = calcDayTotals(state.data[key]);
      if (t.revenue || t.expenses) daysActive++;
      totalSales += t.revenue;
      totalExp += t.expenses;
    }
  });

  let monthQty = 0;
  Object.keys(state.data).forEach((key) => {
    const d = new Date(key + "T12:00:00");
    if (d.getFullYear() === y && d.getMonth() === m) {
      monthQty += calcDayTotals(state.data[key]).items;
    }
  });

  dl.innerHTML = `
    <dt>Total sales</dt><dd>${formatINR(totalSales)}</dd>
    <dt>Total quantity sold</dt><dd>${monthQty}</dd>
    <dt>Month expenses</dt><dd>${formatINR(totalExp)}</dd>
    <dt>Net profit</dt><dd class="${totalSales - totalExp >= 0 ? "profit-positive" : "profit-negative"}">${formatINR(totalSales - totalExp)}</dd>
    <dt>Active days</dt><dd>${daysActive}</dd>
  `;

  renderTopProducts(y, m);

  const ctx = document.getElementById("reports-chart");
  if (ctx && typeof Chart !== "undefined") {
    const { labels, salesData } = getMonthSeries();
    state.charts.reports?.destroy();
    state.charts.reports = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Daily sales",
            data: salesData,
            backgroundColor: "rgba(0, 212, 255, 0.55)",
            borderRadius: 6,
          },
        ],
      },
      options: chartDefaults(),
    });
  }
}

function renderTopProducts(year, month) {
  const ul = document.getElementById("top-products-list");
  if (!ul) return;
  const map = {};
  Object.keys(state.data).forEach((key) => {
    const d = new Date(key + "T12:00:00");
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    state.data[key].sales.forEach((s) => {
      const name = saleProductName(s);
      const rev = Number(s.price) * Number(s.qty);
      map[name] = (map[name] || 0) + rev;
    });
  });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  ul.innerHTML = "";
  if (!sorted.length) return;
  sorted.forEach(([name, rev]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(name)}</span><strong>${formatINR(rev)}</strong>`;
    ul.appendChild(li);
  });
}

function exportPDF() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    showToast("PDF library loading — try again", "error");
    return;
  }

  const day = getDay();
  const t = calcDayTotals(day);
  const doc = new jsPDF();
  const dateLabel = new Date(state.activeDate + "T12:00:00").toLocaleDateString("en-IN");

  doc.setFillColor(3, 7, 18);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(22);
  const shop = state.profile.shop || "SKY MOBILES";
  doc.text(shop.toUpperCase(), 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(200, 220, 240);
  doc.text("Daily Sales & Expense Report", 14, 26);
  doc.text(dateLabel, 14, 33);

  doc.setTextColor(30, 40, 60);
  doc.setFontSize(12);
  let y = 52;
  doc.text(`Total Sales: ${formatINR(t.revenue)}`, 14, y);
  y += 10;
  doc.text(`Total Quantity: ${t.items}`, 14, y);
  y += 10;
  doc.text(`Total Expenses: ${formatINR(t.expenses)}`, 14, y);
  y += 10;
  doc.text(`Net Profit: ${formatINR(t.profit)}`, 14, y);
  y += 16;

  doc.setFontSize(11);
  doc.text("Sales", 14, y);
  y += 8;
  day.sales.forEach((s) => {
    doc.setFontSize(9);
    const line = formatINR(Number(s.price) * Number(s.qty));
    doc.text(
      `  ${saleProductName(s)} | Qty ${s.qty} × ${formatINR(s.price)} = ${line}`,
      14,
      y
    );
    y += 7;
  });
  y += 6;
  doc.setFontSize(11);
  doc.text("Expenses", 14, y);
  y += 8;
  day.expenses.forEach((e) => {
    doc.setFontSize(9);
    doc.text(`  ${e.name}: ${formatINR(e.amount)}`, 14, y);
    y += 7;
  });

  doc.save(`SKY-MOBILES-${state.activeDate}.pdf`);
  showToast("PDF downloaded");
}

function seedDemoDataIfEmpty() {
  if (Object.keys(state.data).length > 0) return;

  const today = new Date();
  const samples = [
    {
      offset: 0,
      sales: [
        { product: "Samsung Galaxy A15", price: 12000, qty: 1 },
        { product: "Phone case", price: 850, qty: 2 },
      ],
      expenses: [{ name: "Tea & snacks", amount: 120 }],
    },
    {
      offset: -1,
      sales: [{ product: "iPhone 15", price: 24999, qty: 1 }],
      expenses: [
        { name: "Courier", amount: 80 },
        { name: "Packaging", amount: 200 },
      ],
    },
    {
      offset: -2,
      sales: [
        { product: "Earbuds", price: 450, qty: 3 },
        { product: "Screen guard", price: 1999, qty: 1 },
      ],
      expenses: [{ name: "Rent share", amount: 500 }],
    },
    {
      offset: -5,
      sales: [{ product: "Redmi Note 13", price: 15999, qty: 2 }],
      expenses: [{ name: "Electricity", amount: 350 }],
    },
  ];

  samples.forEach((s) => {
    const d = new Date(today);
    d.setDate(d.getDate() + s.offset);
    const key = formatDateKey(d);
    state.data[key] = {
      sales: s.sales.map((x) => ({ ...x, id: uid() })),
      expenses: s.expenses.map((x) => ({ ...x, id: uid() })),
    };
  });
  saveData();
}
