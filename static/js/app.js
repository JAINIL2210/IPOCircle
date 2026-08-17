/**
 * IPOCircle / IPO Pulse Main SPA Router & UI Controller
 */

// ----------------------------------------------------
// THEME CONTROLLER & LIVE CLOCK (LIGHT / DARK)
// ----------------------------------------------------
function safeCreateIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn("Lucide render note:", e);
    }
  }
}
window.safeCreateIcons = safeCreateIcons;

function toggleThemeMode() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  
  if (isDark) {
    html.classList.remove('dark');
    html.classList.add('light');
    localStorage.setItem('theme', 'light');
  } else {
    html.classList.remove('light');
    html.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
  
  setTimeout(safeCreateIcons, 30);
}
window.toggleThemeMode = toggleThemeMode;

function startLiveClock() {
  const clockEl = document.getElementById('ist-live-clock');
  if (!clockEl) return;
  
  function updateClock() {
    const now = new Date();
    const istOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const istTime = now.toLocaleTimeString('en-IN', istOptions);
    clockEl.innerText = `IST: ${istTime}`;
  }
  updateClock();
  setInterval(updateClock, 1000);
}
window.startLiveClock = startLiveClock;

// Global State
const state = {
  user: null,
  token: localStorage.getItem('ipocircle_token') || null,
  ipos: [],
  gmpData: [],
  subscriptions: [],
  currentPath: window.location.pathname
};

// Initialize Application (Instant Non-Blocking Initialization)
async function init() {
  try {
    startLiveClock();
  } catch (e) {}

  // Render initial route immediately without waiting for API
  const path = window.location.pathname;
  handleRoute(path);

  // Fetch data in background and update views
  try {
    checkAuth();
    loadTopTicker();
    await loadIPOsData();
  } catch (e) {
    console.error("Init data load error:", e);
  }

  // 30-Second live frontend polling for active GMP & ticker data
  setInterval(async () => {
    try {
      const res = await fetch('/api/gmp/live');
      const json = await res.json();
      if (json.success && json.gmp_data) {
        state.gmpData = json.gmp_data;
        updateTopTickerUI(json.gmp_data);
      }
    } catch (e) {
      console.warn("Live polling note:", e);
    }
  }, 30000);

  window.addEventListener('popstate', () => {
    handleRoute(window.location.pathname);
  });
}

// Ensure init executes whether script loads before or after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Client-side Router
function navigateTo(path) {
  window.history.pushState({}, '', path);
  state.currentPath = path;
  handleRoute(path);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleRoute(path) {
  const container = document.getElementById('app-content');
  if (!container) return;

  // Highlight active desktop nav links
  document.querySelectorAll('.nav-link').forEach(el => {
    const href = el.getAttribute('href');
    if (href === path) {
      el.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-blue-600', 'dark:text-blue-400');
    } else {
      el.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-blue-600', 'dark:text-blue-400');
    }
  });

  // Highlight active mobile bottom navigation
  document.querySelectorAll('.mobile-bottom-link').forEach(el => {
    const href = el.getAttribute('href');
    if (href === path) {
      el.classList.add('text-blue-600', 'dark:text-blue-400', 'font-black');
      el.classList.remove('text-slate-500', 'dark:text-slate-400');
    } else {
      el.classList.remove('text-blue-600', 'dark:text-blue-400', 'font-black');
      el.classList.add('text-slate-500', 'dark:text-slate-400');
    }
  });

  if (path === '/' || path === '') {
    renderHomePage(container);
  } else if (path === '/gmp') {
    renderGmpPage(container);
  } else if (path === '/screener' || path === '/ipo' || path === '/ipo/mainboard' || path === '/ipo/sme' || path === '/ipo/upcoming' || path === '/ipo/ongoing' || path === '/ipo/closed') {
    renderScreenerPage(container, path);
  } else if (path === '/subscription') {
    renderSubscriptionPage(container);
  } else if (path === '/allotment' || path === '/check-allotment' || path === '/check-allotment/bulk') {
    renderAllotmentPage(container, path);
  } else if (path === '/calendar') {
    renderCalendarPage(container);
  } else if (path === '/calculator') {
    renderCalculatorPage(container);
  } else if (path.startsWith('/ipo/')) {
    const slug = path.replace('/ipo/', '');
    renderIpoDetailPage(container, slug);
  } else if (path === '/reviews') {
    renderReviewsPage(container);
  } else if (path === '/blog' || path === '/blogs') {
    renderBlogListPage(container);
  } else if (path.startsWith('/blog/') || path.startsWith('/blogs/')) {
    const slug = path.replace('/blog/', '').replace('/blogs/', '');
    renderBlogDetailPage(container, slug);
  } else if (path === '/watchlist') {
    renderWatchlistPage(container);
  } else if (path === '/admin') {
    renderAdminPage(container);
  } else {
    renderHomePage(container);
  }

  setTimeout(safeCreateIcons, 50);
}

// ----------------------------------------------------
// API Data Handlers
// ----------------------------------------------------
async function checkAuth() {
  if (!state.token) {
    updateAuthHeaderUI();
    return;
  }
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success && data.authenticated) {
      state.user = data.user;
    } else {
      state.token = null;
      localStorage.removeItem('ipocircle_token');
    }
  } catch (err) {
    console.error('Auth verification failed', err);
  }
  updateAuthHeaderUI();
}

function updateAuthHeaderUI() {
  const area = document.getElementById('auth-header-area');
  if (!area) return;
  if (state.user) {
    area.innerHTML = `
      <div class="flex items-center space-x-2">
        <a href="/watchlist" onclick="navigateTo('/watchlist'); return false;" class="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition">
          <i data-lucide="bookmark" class="w-3.5 h-3.5 mr-1 text-amber-500"></i> ${state.user.name.split(' ')[0]}
        </a>
        <button onclick="handleLogout()" title="Logout" class="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <i data-lucide="log-out" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  } else {
    area.innerHTML = `
      <button onclick="openAuthModal()" class="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
        Login
      </button>
    `;
  }
}

function handleLogout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('ipocircle_token');
  updateAuthHeaderUI();
  navigateTo('/');
}

async function triggerLiveIngestionSync() {
  const tickerEl = document.getElementById('top-gmp-ticker');
  if (tickerEl) {
    tickerEl.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-bold flex items-center"><i data-lucide="loader-2" class="w-3 h-3 animate-spin mr-1"></i> Syncing live Indian market IPO data...</span>`;
    safeCreateIcons();
  }
  try {
    const res = await fetch('/api/admin/sync-live', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      await loadIPOsData();
      await loadTopTicker();
      const currentPath = window.location.pathname;
      if (currentPath === '/gmp') {
        await loadGmpData('highest_gmp');
      } else {
        handleRoute(currentPath);
      }
    }
  } catch (err) {
    console.error('Sync trigger error', err);
  }
}

async function loadTopTicker() {
  try {
    const res = await fetch('/api/gmp/live');
    const data = await res.json();
    if (data.success && data.gmp_data) {
      state.gmpData = data.gmp_data;
      updateTopTickerUI(data.gmp_data);
    }
  } catch (err) {
    console.error('Failed to load GMP ticker', err);
  }
}

function updateTopTickerUI(gmpList) {
  const tickerEl = document.getElementById('top-gmp-ticker');
  if (!tickerEl || !gmpList) return;
  tickerEl.innerHTML = gmpList.slice(0, 8).map(g => `
    <div class="inline-flex items-center space-x-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition" onclick="navigateTo('/ipo/${g.slug}')">
      <span class="font-bold text-slate-800 dark:text-slate-200">${g.ipo_name}</span>
      <span class="text-emerald-600 dark:text-emerald-400 font-bold">₹${g.gmp_amount}</span>
      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${g.gmp_change >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'}">
        ${g.gmp_change >= 0 ? '+' : ''}${g.gmp_percent}%
      </span>
    </div>
  `).join('<span class="text-slate-300 dark:text-slate-700">|</span>');
}

async function loadIPOsData() {
  try {
    const res = await fetch('/api/ipos');
    const data = await res.json();
    if (data.success && data.ipos) {
      state.ipos = data.ipos;
      populateModalIpoDropdown();
      const path = window.location.pathname;
      if (path === '/' || path === '' || path === '/gmp' || path.startsWith('/screener') || path === '/allotment' || path === '/calculator') {
        handleRoute(path);
      }
    }
  } catch (err) {
    console.error('Error loading IPOs', err);
  }
}

function populateModalIpoDropdown() {
  const sel = document.getElementById('modal-ipo-select');
  if (!sel) return;
  sel.innerHTML = state.ipos.map(ipo => `<option value="${ipo.id}">${ipo.name} (${ipo.status})</option>`).join('');
}

// Global Search
function handleGlobalSearch(query) {
  const drop = document.getElementById('search-results-dropdown');
  if (!drop) return;
  if (!query || query.length < 2) {
    drop.classList.add('hidden');
    return;
  }
  const term = query.toLowerCase();
  const filtered = state.ipos.filter(i => i.name.toLowerCase().includes(term) || i.company_name.toLowerCase().includes(term) || (i.symbol && i.symbol.toLowerCase().includes(term)));
  
  if (filtered.length === 0) {
    drop.innerHTML = `<div class="p-3 text-xs text-gray-400">No matching IPOs found</div>`;
  } else {
    drop.innerHTML = filtered.map(i => `
      <div onclick="navigateTo('/ipo/${i.slug}'); document.getElementById('search-results-dropdown').classList.add('hidden');" class="p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 flex justify-between items-center">
        <div>
          <div class="text-sm font-bold text-white">${i.name}</div>
          <div class="text-xs text-gray-400">${i.category} • Price: ₹${i.upper_price}</div>
        </div>
        <span class="badge ${i.status === 'Ongoing' ? 'badge-open' : (i.status === 'Listed' ? 'badge-listed' : 'badge-upcoming')}">${i.status}</span>
      </div>
    `).join('');
  }
  drop.classList.remove('hidden');
}

// ----------------------------------------------------
// 1. HOME PAGE RENDER
// ----------------------------------------------------
function renderHomePage(container) {
  const ongoing = state.ipos.filter(i => i.status === 'Ongoing');
  const upcoming = state.ipos.filter(i => i.status === 'Upcoming');
  const listed = state.ipos.filter(i => i.status === 'Listed' || i.status === 'Closed');

  container.innerHTML = `
    <div class="space-y-10">
      
      <!-- Hero Banner -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-8 sm:p-12 shadow-xl">
        <div class="relative z-10 max-w-2xl space-y-4">
          <div class="inline-flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-blue-100">
            <span class="pulse-dot bg-emerald-400"></span>
            <span>Live IPO Ingestion & Registrar Sync Active</span>
          </div>
          <h1 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Track Indian IPOs <span class="text-emerald-300">GMP & Allotment</span> in Real Time
          </h1>
          <p class="text-blue-100 text-sm sm:text-base leading-relaxed">
            Live Grey Market Premium rates, QIB/Retail subscription figures, single & bulk PAN allotment status checking, and deep financial research.
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <a href="/allotment" onclick="navigateTo('/allotment'); return false;" class="px-5 py-3 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-xl text-sm shadow-md transition flex items-center">
              <i data-lucide="check-circle" class="w-4 h-4 mr-2 text-blue-600"></i> Check IPO Allotment
            </a>
            <a href="/gmp" onclick="navigateTo('/gmp'); return false;" class="px-5 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-300/40 text-white font-bold rounded-xl text-sm transition flex items-center">
              <i data-lucide="zap" class="w-4 h-4 mr-2 text-emerald-300"></i> View Live GMP Dashboard
            </a>
            <a href="/calculator" onclick="navigateTo('/calculator'); return false;" class="px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-300/40 text-amber-200 font-bold rounded-xl text-sm transition flex items-center">
              <i data-lucide="calculator" class="w-4 h-4 mr-2 text-amber-300"></i> Allotment Calculator
            </a>
          </div>
        </div>
      </div>

      <!-- Live GMP Highlights Grid -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-black text-slate-900 flex items-center">
            <i data-lucide="flame" class="w-5 h-5 text-amber-500 mr-2"></i> Today's Live GMP Highlights
          </h2>
          <a href="/gmp" onclick="navigateTo('/gmp'); return false;" class="text-xs font-semibold text-blue-600 hover:underline">View All GMP &rarr;</a>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${state.ipos.slice(0, 4).map(ipo => {
            const g = ipo.gmp || { gmp_amount: 0, gmp_percent: 0, estimated_listing_price: ipo.upper_price, estimated_profit_per_lot: 0 };
            return `
              <div onclick="navigateTo('/ipo/${ipo.slug}')" class="stat-card cursor-pointer space-y-3 relative group bg-white border border-slate-200">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="badge ${ipo.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'} mb-1">${ipo.category}</span>
                    <h3 class="font-bold text-slate-900 text-base group-hover:text-blue-600 transition">${ipo.name}</h3>
                  </div>
                  <span class="badge ${ipo.status === 'Ongoing' ? 'badge-open' : (ipo.status === 'Listed' ? 'badge-listed' : 'badge-upcoming')}">${ipo.status}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span class="text-[11px] text-slate-500">Issue Price</span>
                    <div class="text-sm font-bold text-slate-900">₹${ipo.upper_price}</div>
                  </div>
                  <div>
                    <span class="text-[11px] text-slate-500">Live GMP</span>
                    <div class="text-sm font-black text-emerald-600">+₹${g.gmp_amount} (${g.gmp_percent}%)</div>
                  </div>
                </div>
                <div class="bg-slate-50 p-2 rounded-lg flex justify-between items-center text-xs border border-slate-100">
                  <span class="text-slate-600">Est. Profit/Lot:</span>
                  <span class="font-bold text-emerald-700">₹${g.estimated_profit_per_lot.toLocaleString()}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Ongoing & Quick Allotment Split View -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Ongoing IPOs -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold text-slate-900 flex items-center">
              <span class="pulse-dot mr-2"></span> Ongoing IPO Bidding
            </h3>
            <span class="text-xs text-slate-500">Open for subscription</span>
          </div>
          <div class="space-y-3">
            ${ongoing.length > 0 ? ongoing.map(ipo => `
              <div onclick="navigateTo('/ipo/${ipo.slug}')" class="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition flex justify-between items-center">
                <div>
                  <div class="font-bold text-slate-900 text-sm">${ipo.name}</div>
                  <div class="text-xs text-slate-500">Closes: <span class="text-rose-600 font-semibold">${ipo.close_date || 'N/A'}</span> • Lot: ${ipo.lot_size} shares</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-black text-emerald-600">+₹${ipo.gmp ? ipo.gmp.gmp_amount : 0} GMP</div>
                  <div class="text-xs text-blue-600 font-bold">${ipo.subscription ? ipo.subscription.total_x + 'x Subscribed' : 'Live Data'}</div>
                </div>
              </div>
            `).join('') : '<div class="text-xs text-slate-500 py-4 text-center">No ongoing IPOs today. Check upcoming list.</div>'}
          </div>
        </div>

        <!-- Quick Allotment Lookup Widget -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 class="text-lg font-bold text-slate-900 flex items-center">
            <i data-lucide="shield-check" class="w-5 h-5 text-blue-600 mr-2"></i> Quick IPO Allotment Checker
          </h3>
          <p class="text-xs text-slate-600">
            Check your application status across Link Intime, KFintech, Bigshare, and Maashitla directly.
          </p>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Select IPO</label>
              <select id="home-ipo-select" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:border-blue-600">
                ${state.ipos.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
              <input type="text" id="home-pan-input" uppercase placeholder="Enter 10-digit PAN (e.g. ABCDE1234F)" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:border-blue-600 font-mono uppercase">
            </div>
            <div class="flex space-x-3">
              <button onclick="handleHomeQuickCheck()" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition">
                Check Status
              </button>
              <a href="/allotment" onclick="navigateTo('/allotment'); return false;" class="px-4 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition text-center">
                Bulk Check
              </a>
            </div>
            <div id="home-check-result" class="hidden"></div>
          </div>
        </div>

      </div>

      <!-- Educational & Guides Section -->
      <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold text-slate-900 flex items-center">
            <i data-lucide="book-open" class="w-5 h-5 text-indigo-600 mr-2"></i> Educational Guides & IPO News
          </h3>
          <a href="/blog" onclick="navigateTo('/blog'); return false;" class="text-xs text-blue-600 font-semibold hover:underline">Explore All Guides &rarr;</a>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div onclick="navigateTo('/blog/how-to-check-ipo-allotment-status-online')" class="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer space-y-2">
            <span class="badge badge-mainboard">Guide</span>
            <h4 class="font-bold text-slate-900 text-sm">How to Check IPO Allotment Status Online</h4>
            <p class="text-xs text-slate-600">Step-by-step guide for Link Intime, KFintech, and BSE status checking.</p>
          </div>
          <div onclick="navigateTo('/blog/what-is-ipo-gmp-how-it-is-calculated')" class="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer space-y-2">
            <span class="badge badge-open">GMP Explained</span>
            <h4 class="font-bold text-slate-900 text-sm">What is IPO GMP & How to Calculate Return</h4>
            <p class="text-xs text-slate-600">Learn how estimated listing price and profit per lot are computed.</p>
          </div>
          <div onclick="navigateTo('/blog/mainboard-vs-sme-ipo-key-differences')" class="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer space-y-2">
            <span class="badge badge-sme">SME vs Mainboard</span>
            <h4 class="font-bold text-slate-900 text-sm">Mainboard IPO vs SME IPO Differences</h4>
            <p class="text-xs text-slate-600">Compare issue size, lot sizes, trading rules, and risk profiles.</p>
          </div>
        </div>
      </div>

    </div>
  `;
}

async function handleHomeQuickCheck() {
  const ipoId = document.getElementById('home-ipo-select').value;
  const pan = document.getElementById('home-pan-input').value.trim();
  const out = document.getElementById('home-check-result');
  out.classList.remove('hidden');

  if (!pan) {
    out.innerHTML = `<div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold">Please enter a valid 10-character PAN number.</div>`;
    return;
  }

  out.innerHTML = `<div class="p-3 bg-gray-800 rounded-xl text-gray-300 text-xs flex items-center justify-center"><i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Querying registrar database...</div>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/allotment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipo_id: ipoId, pan: pan })
    });
    const data = await res.json();
    if (data.success) {
      out.innerHTML = `
        <div class="p-4 ${data.allotted ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-gray-800 border-gray-700 text-gray-300'} border rounded-xl space-y-2 text-xs">
          <div class="flex justify-between items-center">
            <span class="font-bold text-sm">${data.ipo_name}</span>
            <span class="font-mono bg-black/40 px-2 py-0.5 rounded">${data.pan_masked}</span>
          </div>
          <div class="text-sm font-extrabold ${data.allotted ? 'text-emerald-400' : 'text-rose-400'}">${data.status_text}</div>
          <div class="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-700/50">
            <div>Shares Allotted: <strong class="text-white">${data.shares_allotted}</strong></div>
            <div>App No: <strong class="text-white">${data.application_no}</strong></div>
            <div>Registrar: <strong class="text-white">${data.registrar}</strong></div>
          </div>
        </div>
      `;
    } else {
      out.innerHTML = `<div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold">${data.error || 'Allotment check failed.'}</div>`;
    }
  } catch (err) {
    out.innerHTML = `<div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold">Network error checking allotment.</div>`;
  }
}

// ----------------------------------------------------
// 2. LIVE GMP DASHBOARD RENDER
// ----------------------------------------------------
async function renderGmpPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div class="flex items-center space-x-2">
            <span class="pulse-dot"></span>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white">Live IPO GMP Dashboard</h1>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">Real-time Grey Market Premium rates, estimated listing prices, and estimated profit per lot.</p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <button onclick="loadGmpData('highest_gmp')" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition">Sort by Highest GMP</button>
          <button onclick="loadGmpData('highest_percent')" class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 rounded-xl border border-slate-300 dark:border-slate-700 font-bold transition">Sort by Highest %</button>
        </div>
      </div>

      <!-- Disclaimer Alert -->
      <div class="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start space-x-3 shadow-sm">
        <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"></i>
        <div>
          <strong class="text-amber-900 dark:text-amber-200 font-bold">Grey Market Premium (GMP) Disclaimer:</strong> 
          GMP is unofficial over-the-counter market data provided for reference and educational purposes only. It is not regulated by SEBI, NSE, or BSE. Formulas used: 
          <code class="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-[11px]">Est. Listing Price = Upper Price + GMP</code> and 
          <code class="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-[11px]">Est. Profit = GMP × Lot Size</code>.
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row gap-3">
        <input type="text" id="gmp-search-input" oninput="filterGmpTable()" placeholder="Search IPO by name or symbol..." class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600">
        <select id="gmp-category-select" onchange="filterGmpTable()" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white">
          <option value="All">All Categories (Mainboard & SME)</option>
          <option value="Mainboard">Mainboard IPOs Only</option>
          <option value="SME">SME IPOs Only</option>
        </select>
      </div>

      <!-- GMP Table Container -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="custom-table">
            <thead>
              <tr>
                <th>IPO Name</th>
                <th>Category</th>
                <th>Price Band</th>
                <th>Live GMP</th>
                <th>GMP %</th>
                <th>Est. Listing Price</th>
                <th>Est. Profit / Lot</th>
                <th>Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody id="gmp-table-body">
              <tr><td colspan="9" class="text-center py-8 text-slate-500">Loading live GMP rates...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  await loadGmpData('highest_gmp');
}

async function loadGmpData(sortBy) {
  try {
    const res = await fetch(`/api/gmp/live?sort=${sortBy}`);
    const data = await res.json();
    if (data.success) {
      window._gmpRaw = data.gmp_data;
      filterGmpTable();
    }
  } catch (err) {
    console.error('Error loading GMP data', err);
  }
}

function filterGmpTable() {
  const tbody = document.getElementById('gmp-table-body');
  if (!tbody || !window._gmpRaw) return;

  const search = (document.getElementById('gmp-search-input')?.value || '').toLowerCase();
  const category = document.getElementById('gmp-category-select')?.value || 'All';

  const filtered = window._gmpRaw.filter(item => {
    const matchesSearch = item.ipo_name.toLowerCase().includes(search) || item.company_name.toLowerCase().includes(search);
    const matchesCat = category === 'All' || item.category === category;
    return matchesSearch && matchesCat;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500">No matching GMP records found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(g => `
    <tr onclick="navigateTo('/ipo/${g.slug}')" class="cursor-pointer">
      <td class="font-bold text-slate-900 dark:text-white">${g.ipo_name}</td>
      <td><span class="badge ${g.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'}">${g.category}</span></td>
      <td class="font-medium text-slate-700 dark:text-slate-300">₹${g.upper_price}</td>
      <td class="font-black text-emerald-600 dark:text-emerald-400">+₹${g.gmp_amount}</td>
      <td class="font-bold text-emerald-700 dark:text-emerald-300">${g.gmp_percent}%</td>
      <td class="font-bold text-blue-600 dark:text-blue-400">₹${g.estimated_listing_price}</td>
      <td class="font-black text-emerald-700 dark:text-emerald-400">₹${g.estimated_profit_per_lot.toLocaleString()}</td>
      <td><span class="badge ${g.status === 'Ongoing' ? 'badge-open' : (g.status === 'Listed' ? 'badge-listed' : 'badge-upcoming')}">${g.status}</span></td>
      <td class="text-xs text-slate-500 dark:text-slate-400">${g.last_updated}</td>
    </tr>
  `).join('');
}

// ----------------------------------------------------
// 3. IPO SCREENER RENDER
// ----------------------------------------------------
async function renderScreenerPage(container, path = '') {
  let defaultCategory = 'All';
  let defaultStatus = 'All';

  if (path === '/ipo/mainboard') defaultCategory = 'Mainboard';
  if (path === '/ipo/sme') defaultCategory = 'SME';
  if (path === '/ipo/upcoming') defaultStatus = 'Upcoming';
  if (path === '/ipo/ongoing') defaultStatus = 'Ongoing';
  if (path === '/ipo/closed') defaultStatus = 'Closed';

  container.innerHTML = `
    <div class="space-y-6">
      
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center">
          <i data-lucide="filter" class="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2"></i> IPO Directory & Screener
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">Filter Indian IPOs by market segment, issue status, price range, GMP premium, and subscription multiple.</p>
        
        <!-- Screener Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select id="screener-status" onchange="runScreenerQuery()" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white">
              <option value="All" ${defaultStatus === 'All' ? 'selected' : ''}>All Statuses</option>
              <option value="Ongoing" ${defaultStatus === 'Ongoing' ? 'selected' : ''}>Ongoing Bidding</option>
              <option value="Upcoming" ${defaultStatus === 'Upcoming' ? 'selected' : ''}>Upcoming IPOs</option>
              <option value="Listed" ${defaultStatus === 'Listed' ? 'selected' : ''}>Listed IPOs</option>
              <option value="Closed" ${defaultStatus === 'Closed' ? 'selected' : ''}>Closed IPOs</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Market Category</label>
            <select id="screener-category" onchange="runScreenerQuery()" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white">
              <option value="All" ${defaultCategory === 'All' ? 'selected' : ''}>All Categories</option>
              <option value="Mainboard" ${defaultCategory === 'Mainboard' ? 'selected' : ''}>Mainboard</option>
              <option value="SME" ${defaultCategory === 'SME' ? 'selected' : ''}>SME</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Min GMP (₹)</label>
            <input type="number" id="screener-min-gmp" oninput="runScreenerQuery()" placeholder="e.g. 10" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Search</label>
            <input type="text" id="screener-search" oninput="runScreenerQuery()" placeholder="Company or symbol..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white">
          </div>
        </div>
      </div>

      <!-- Screener Results Container -->
      <div id="screener-results-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">Running IPO screener...</div>
      </div>

    </div>
  `;

  await runScreenerQuery();
}

async function runScreenerQuery() {
  const status = document.getElementById('screener-status')?.value || 'All';
  const category = document.getElementById('screener-category')?.value || 'All';
  const minGmp = document.getElementById('screener-min-gmp')?.value || '';
  const search = document.getElementById('screener-search')?.value || '';

  const grid = document.getElementById('screener-results-grid');
  if (!grid) return;

  try {
    let url = `/api/ipos/screener?status=${status}&category=${category}&search=${encodeURIComponent(search)}`;
    if (minGmp) url += `&min_gmp=${minGmp}`;

    const res = await fetch(url);
    const data = await res.json();
    if (data.success && data.ipos) {
      if (data.ipos.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl">No IPOs matched your custom screener filters.</div>`;
        return;
      }
      grid.innerHTML = data.ipos.map(ipo => {
        const g = ipo.gmp || { gmp_amount: 0, gmp_percent: 0, estimated_profit_per_lot: 0 };
        return `
          <div onclick="navigateTo('/ipo/${ipo.slug}')" class="stat-card cursor-pointer space-y-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <div class="flex justify-between items-start">
              <div>
                <span class="badge ${ipo.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'} mb-1">${ipo.category}</span>
                <h3 class="font-bold text-slate-900 dark:text-white text-base hover:text-blue-600 transition">${ipo.name}</h3>
                <div class="text-xs text-slate-500 dark:text-slate-400">${ipo.sector}</div>
              </div>
              <span class="badge ${ipo.status === 'Ongoing' ? 'badge-open' : (ipo.status === 'Listed' ? 'badge-listed' : 'badge-upcoming')}">${ipo.status}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span class="text-slate-500 dark:text-slate-400">Price Band:</span>
                <div class="font-bold text-slate-900 dark:text-white">₹${ipo.min_price} - ₹${ipo.upper_price}</div>
              </div>
              <div>
                <span class="text-slate-500 dark:text-slate-400">Issue Size:</span>
                <div class="font-bold text-slate-900 dark:text-white">₹${ipo.issue_size_cr} Cr</div>
              </div>
              <div>
                <span class="text-slate-500 dark:text-slate-400">Lot Size:</span>
                <div class="font-bold text-slate-900 dark:text-white">${ipo.lot_size} shares</div>
              </div>
              <div>
                <span class="text-slate-500 dark:text-slate-400">Live GMP:</span>
                <div class="font-black text-emerald-600 dark:text-emerald-400">+₹${g.gmp_amount} (${g.gmp_percent}%)</div>
              </div>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl text-xs flex justify-between items-center border border-slate-200 dark:border-slate-700/50">
              <span class="text-slate-600 dark:text-slate-400">Open: <strong class="text-slate-900 dark:text-white">${ipo.open_date || 'TBA'}</strong></span>
              <span class="text-slate-600 dark:text-slate-400">Close: <strong class="text-rose-600 dark:text-rose-400">${ipo.close_date || 'TBA'}</strong></span>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Screener fetch error', err);
  }
}

// ----------------------------------------------------
// 4. LIVE SUBSCRIPTION RENDER
// ----------------------------------------------------
async function renderSubscriptionPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-2 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center">
          <i data-lucide="bar-chart-3" class="w-6 h-6 text-emerald-600 dark:text-emerald-400 mr-2"></i> Live IPO Subscription Tracking
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">Category-wise bidding updates (QIB, NII/HNI, Retail) sourced directly from NSE & BSE bidding engines.</p>
      </div>

      <div id="subscription-cards-container" class="space-y-6">
        <div class="text-center py-12 text-slate-500">Loading live subscription metrics...</div>
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/subscription/live');
    const data = await res.json();
    if (data.success && data.subscriptions) {
      const containerEl = document.getElementById('subscription-cards-container');
      if (data.subscriptions.length === 0) {
        containerEl.innerHTML = `<div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500">No active bidding subscription data right now.</div>`;
        return;
      }

      containerEl.innerHTML = data.subscriptions.map(s => `
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span class="badge ${s.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'} mb-1">${s.category}</span>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">${s.ipo_name}</h3>
              <div class="text-xs text-slate-500 dark:text-slate-400">Closing Date: <strong class="text-rose-600 dark:text-rose-400">${s.close_date}</strong></div>
            </div>
            <div class="text-left sm:text-right">
              <div class="text-2xl font-black text-blue-600 dark:text-blue-400">${s.total_x}x</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Total Oversubscribed</div>
            </div>
          </div>

          <!-- Category Progress Bars -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl space-y-2">
              <div class="flex justify-between text-xs">
                <span class="font-bold text-slate-700 dark:text-slate-300">QIB (Institutions)</span>
                <span class="font-black text-blue-600 dark:text-blue-400">${s.qib_x}x</span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: ${Math.min(100, s.qib_x * 5)}%"></div>
              </div>
            </div>

            <div class="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl space-y-2">
              <div class="flex justify-between text-xs">
                <span class="font-bold text-slate-700 dark:text-slate-300">NII / HNI</span>
                <span class="font-black text-purple-600 dark:text-purple-400">${s.nii_x}x</span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div class="bg-purple-600 h-2 rounded-full" style="width: ${Math.min(100, s.nii_x * 5)}%"></div>
              </div>
            </div>

            <div class="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl space-y-2">
              <div class="flex justify-between text-xs">
                <span class="font-bold text-slate-700 dark:text-slate-300">Retail Individual</span>
                <span class="font-black text-emerald-600 dark:text-emerald-400">${s.retail_x}x</span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div class="bg-emerald-600 h-2 rounded-full" style="width: ${Math.min(100, s.retail_x * 5)}%"></div>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Subscription load error', err);
  }
}

// ----------------------------------------------------
// 5. ALLOTMENT STATUS CHECKER RENDER (SINGLE & BULK)
// ----------------------------------------------------
function renderAllotmentPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-2 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center">
          <i data-lucide="check-circle" class="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2"></i> Dedicated IPO Allotment Status Checker
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">Check single PAN status or upload bulk CSV files for multi-account allotment verification across official registrars.</p>
      </div>

      <!-- Mode Selector Tabs -->
      <div class="flex border-b border-slate-200 dark:border-slate-800">
        <button id="tab-single-btn" onclick="switchAllotmentTab('single')" class="px-6 py-3 font-bold text-sm text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 flex items-center">
          <i data-lucide="user" class="w-4 h-4 mr-2"></i> Single PAN Check
        </button>
        <button id="tab-bulk-btn" onclick="switchAllotmentTab('bulk')" class="px-6 py-3 font-bold text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center">
          <i data-lucide="users" class="w-4 h-4 mr-2"></i> Bulk PAN Check (CSV/Batch)
        </button>
      </div>

      <!-- Single PAN View -->
      <div id="allotment-single-view" class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 max-w-2xl shadow-sm">
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select IPO</label>
            <select id="single-ipo-select" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-600">
              ${state.ipos.map(i => `<option value="${i.id}">${i.name} (${i.status})</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">PAN Number</label>
            <input type="text" id="single-pan-input" uppercase placeholder="Enter 10-character PAN (e.g. ABCDE1234F)" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white font-mono uppercase focus:border-blue-600">
          </div>
          <button onclick="handleSingleCheckSubmit()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm shadow-md transition">
            Check Allotment Status
          </button>
          <div id="single-result-output" class="hidden pt-2"></div>
        </div>
      </div>

      <!-- Bulk PAN View -->
      <div id="allotment-bulk-view" class="hidden bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select IPO</label>
              <select id="bulk-ipo-select" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white">
                ${state.ipos.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
              </select>
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Enter PANs (One per line or comma separated)</label>
              <textarea id="bulk-pans-text" rows="6" placeholder="ABCDE1234F&#10;PQRST5678G&#10;XYZAB9999M" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-mono uppercase focus:border-blue-600"></textarea>
            </div>

            <div class="flex items-center space-x-3">
              <button onclick="handleBulkCheckSubmit()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition flex-1 shadow-md">
                Process Bulk Allotment Check
              </button>
            </div>
          </div>

          <!-- Drag and Drop CSV Box -->
          <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50 dark:bg-slate-800/40">
            <i data-lucide="file-spreadsheet" class="w-12 h-12 text-blue-600 dark:text-blue-400"></i>
            <div class="font-bold text-slate-900 dark:text-white text-sm">Upload CSV File with Multiple PANs</div>
            <p class="text-xs text-slate-500 dark:text-slate-400">Drag and drop your CSV or click to select file.</p>
            <input type="file" id="csv-file-input" accept=".csv, .txt" onchange="handleCsvFileUpload(event)" class="hidden">
            <button onclick="document.getElementById('csv-file-input').click()" class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg shadow-sm">
              Browse CSV File
            </button>
          </div>

        </div>

        <!-- Bulk Results Output -->
        <div id="bulk-results-output" class="hidden space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800"></div>
      </div>

    </div>
  `;
}

function switchAllotmentTab(tab) {
  const singleView = document.getElementById('allotment-single-view');
  const bulkView = document.getElementById('allotment-bulk-view');
  const singleBtn = document.getElementById('tab-single-btn');
  const bulkBtn = document.getElementById('tab-bulk-btn');

  if (tab === 'single') {
    singleView.classList.remove('hidden');
    bulkView.classList.add('hidden');
    singleBtn.className = 'px-6 py-3 font-bold text-sm text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 flex items-center';
    bulkBtn.className = 'px-6 py-3 font-bold text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center';
  } else {
    singleView.classList.add('hidden');
    bulkView.classList.remove('hidden');
    bulkBtn.className = 'px-6 py-3 font-bold text-sm text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 flex items-center';
    singleBtn.className = 'px-6 py-3 font-bold text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center';
  }
  lucide.createIcons();
}

async function handleSingleCheckSubmit() {
  const ipoId = document.getElementById('single-ipo-select').value;
  const pan = document.getElementById('single-pan-input').value.trim();
  const out = document.getElementById('single-result-output');
  out.classList.remove('hidden');

  out.innerHTML = `<div class="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-xs flex items-center justify-center"><i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Querying registrar allotment database...</div>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/allotment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipo_id: ipoId, pan: pan })
    });
    const data = await res.json();
    if (data.success) {
      out.innerHTML = `
        <div class="p-6 ${data.allotted ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100' : 'bg-slate-50 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'} border rounded-2xl space-y-4 shadow-md">
          
          <!-- Header Status -->
          <div class="flex flex-wrap justify-between items-start gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-3">
            <div>
              <span class="badge ${data.allotted ? 'badge-open' : 'badge-closed'} text-xs px-3 py-1 mb-1">
                ${data.allotted ? 'ALLOTMENT CONFIRMED' : 'NON-ALLOTTED'}
              </span>
              <h3 class="font-black text-lg text-slate-900 dark:text-white mt-1">${data.ipo_name}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Investor: <strong class="text-slate-900 dark:text-white">${data.investor_name}</strong></p>
            </div>
            <div class="text-right">
              <span class="font-mono bg-slate-200 dark:bg-black/60 text-slate-900 dark:text-slate-100 px-3 py-1 rounded-lg text-xs font-bold">${data.pan_masked}</span>
            </div>
          </div>

          <!-- Status Message -->
          <div class="text-xl font-black ${data.allotted ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} flex items-center">
            <i data-lucide="${data.allotted ? 'check-circle' : 'x-circle'}" class="w-6 h-6 mr-2"></i>
            ${data.status_text}
          </div>

          <!-- Detailed Allotment Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div class="space-y-1">
              <span class="text-slate-500 dark:text-slate-400 text-[11px]">Application Number:</span>
              <div class="font-bold text-slate-900 dark:text-white font-mono">${data.application_no}</div>
            </div>
            <div class="space-y-1">
              <span class="text-slate-500 dark:text-slate-400 text-[11px]">Category Applied:</span>
              <div class="font-bold text-slate-900 dark:text-white">${data.category_applied}</div>
            </div>
            <div class="space-y-1">
              <span class="text-slate-500 dark:text-slate-400 text-[11px]">Shares Applied:</span>
              <div class="font-bold text-slate-900 dark:text-white">${data.shares_applied} shares (₹${data.amount_blocked.toLocaleString()})</div>
            </div>
            <div class="space-y-1">
              <span class="text-slate-500 dark:text-slate-400 text-[11px]">Shares Allotted:</span>
              <div class="font-black text-sm ${data.allotted ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${data.shares_allotted} shares</div>
            </div>
            <div class="space-y-1 sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span class="text-slate-500 dark:text-slate-400 text-[11px]">Bank / Demat Status:</span>
              <div class="font-semibold text-slate-800 dark:text-slate-200">${data.refund_status}</div>
            </div>
          </div>

          <!-- Official Registrar Link -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div class="text-xs text-slate-500 dark:text-slate-400">
              Official Registrar: <strong class="text-slate-800 dark:text-slate-200">${data.registrar}</strong>
            </div>
            <a href="${data.registrar_url}" target="_blank" rel="noopener" class="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center shadow transition">
              <i data-lucide="external-link" class="w-3.5 h-3.5 mr-1.5"></i> Verify on Official Registrar Portal
            </a>
          </div>

        </div>
      `;
      lucide.createIcons();
    } else {
      out.innerHTML = `<div class="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">${data.error}</div>`;
    }
  } catch (err) {
    out.innerHTML = `<div class="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">Error querying allotment database.</div>`;
  }
}

async function handleBulkCheckSubmit() {
  const ipoId = document.getElementById('bulk-ipo-select').value;
  const text = document.getElementById('bulk-pans-text').value.trim();
  const out = document.getElementById('bulk-results-output');
  out.classList.remove('hidden');

  if (!text) {
    out.innerHTML = `<div class="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">Please enter or upload at least one PAN number.</div>`;
    return;
  }

  out.innerHTML = `<div class="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-xs text-center"><i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Processing batch request...</div>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/allotment/bulk-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipo_id: ipoId, pans: text })
    });
    const data = await res.json();
    if (data.success) {
      const s = data.summary;
      out.innerHTML = `
        <div class="space-y-4">
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span class="text-[11px] text-slate-500 dark:text-slate-400">Total Processed</span>
              <div class="text-lg font-bold text-slate-900 dark:text-white">${s.total_processed}</div>
            </div>
            <div class="bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-sm">
              <span class="text-[11px] text-emerald-700 dark:text-emerald-300">Allotted PANs</span>
              <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">${s.allotted_count}</div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span class="text-[11px] text-slate-500 dark:text-slate-400">Non-Allotted</span>
              <div class="text-lg font-bold text-rose-600 dark:text-rose-400">${s.non_allotted_count}</div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span class="text-[11px] text-slate-500 dark:text-slate-400">Invalid Format</span>
              <div class="text-lg font-bold text-amber-600 dark:text-amber-400">${s.invalid_pans}</div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Investor Name</th>
                  <th>PAN Number</th>
                  <th>App Number</th>
                  <th>Status</th>
                  <th>Shares Allotted</th>
                  <th>Refund Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.results.map(r => `
                  <tr>
                    <td class="font-bold text-slate-900 dark:text-white text-xs">${r.investor_name || 'Individual'}</td>
                    <td class="font-mono font-bold text-xs">${r.pan_masked}</td>
                    <td class="text-xs text-slate-600 dark:text-slate-300 font-mono">${r.application_no || 'N/A'}</td>
                    <td class="font-bold text-xs ${r.allotted ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${r.status}</td>
                    <td class="font-black text-slate-900 dark:text-white text-xs">${r.shares_allotted}</td>
                    <td class="text-xs text-slate-500 dark:text-slate-400">${r.refund_status || 'Released'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      safeCreateIcons();
    }
  } catch (err) {
    out.innerHTML = `<div class="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs">Failed processing bulk batch.</div>`;
  }
}

// ----------------------------------------------------
// 6. UPCOMING IPO CALENDAR RENDER
// ----------------------------------------------------
async function renderCalendarPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-2 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center">
          <i data-lucide="calendar" class="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2"></i> Upcoming IPO Calendar
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">Key milestone dates: Bidding Open/Close, Allotment Declaration, and Listing Dates.</p>
      </div>

      <div id="calendar-timeline-container" class="space-y-4">
        <div class="text-center py-12 text-slate-500">Loading calendar events...</div>
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/calendar');
    const data = await res.json();
    if (data.success && data.events) {
      const containerEl = document.getElementById('calendar-timeline-container');
      containerEl.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${data.events.map(ev => `
            <div onclick="navigateTo('/ipo/${ev.slug}')" class="p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl cursor-pointer flex items-center justify-between shadow-sm transition">
              <div class="space-y-1">
                <span class="badge ${ev.event.includes('Opens') ? 'badge-open' : (ev.event.includes('Closes') ? 'badge-closed' : 'badge-upcoming')}">${ev.event}</span>
                <div class="font-bold text-slate-900 dark:text-white text-base">${ev.name}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${ev.category}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-black text-blue-600 dark:text-blue-400">${ev.date}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      safeCreateIcons();
    }
  } catch (err) {
    console.error('Calendar error', err);
  }
}

// ----------------------------------------------------
// 7. ALLOTMENT CHANCES CALCULATOR RENDER
// ----------------------------------------------------
function renderCalculatorPage(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-3xl mx-auto">
      
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-2 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center">
          <i data-lucide="calculator" class="w-6 h-6 text-amber-600 dark:text-amber-400 mr-2"></i> Allotment Chances Calculator
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">Educational lottery probability estimator based on retail computer draw mechanics and oversubscription ratios.</p>
      </div>

      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select IPO</label>
            <select id="calc-ipo-select" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white">
              ${state.ipos.map(i => `<option value="${i.id}">${i.name} (Sub: ${i.subscription ? i.subscription.total_x : 1}x)</option>`).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Investor Category</label>
            <select id="calc-category-select" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white">
              <option value="Retail (RII)">Retail Investor (Up to ₹2 Lakhs)</option>
              <option value="Small NII (sNII)">Small NII (₹2 Lakhs - ₹10 Lakhs)</option>
              <option value="Big NII (bNII)">Big NII (Above ₹10 Lakhs)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subscription Multiple (x)</label>
            <input type="number" step="0.1" id="calc-sub-x" value="15.0" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white">
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Lots Applied</label>
            <input type="number" id="calc-lots" value="1" min="1" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white">
          </div>
        </div>

        <button onclick="handleCalculateEstimate()" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3.5 rounded-xl text-sm shadow-md transition">
          Calculate Estimated Allotment Probability
        </button>

        <div id="calc-result-output" class="hidden pt-4 border-t border-slate-200 dark:border-slate-800"></div>
      </div>

    </div>
  `;
  safeCreateIcons();
}

async function handleCalculateEstimate() {
  const ipoId = document.getElementById('calc-ipo-select').value;
  const category = document.getElementById('calc-category-select').value;
  const subX = document.getElementById('calc-sub-x').value;
  const lots = document.getElementById('calc-lots').value;

  const out = document.getElementById('calc-result-output');
  out.classList.remove('hidden');

  try {
    const res = await fetch('/api/calculator/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipo_id: ipoId, category: category, subscription_x: subX, lots_applied: lots })
    });
    const data = await res.json();
    if (data.success) {
      const c = data.calculation;
      out.innerHTML = `
        <div class="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-bold text-slate-900 dark:text-white text-base">${c.ipo_name}</h3>
              <span class="text-xs text-slate-500 dark:text-slate-400">${c.category}</span>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-500 dark:text-slate-400">Winning Chance</span>
              <div class="text-2xl font-black text-amber-600 dark:text-amber-400">${c.probability_percent}%</div>
            </div>
          </div>

          <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">Lottery Odds:</span>
              <strong class="text-slate-900 dark:text-white">${c.chance_ratio}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">Total Investment Required:</span>
              <strong class="text-slate-900 dark:text-white">₹${c.min_investment.toLocaleString()}</strong>
            </div>
          </div>

          <div class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-100 dark:border-blue-900/60">
            <strong class="text-blue-700 dark:text-blue-300">Explanation:</strong> ${c.explanation}
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error('Calculator error', err);
  }
}

// ----------------------------------------------------
// 8. IPO DETAILS / RESEARCH PAGE RENDER
// ----------------------------------------------------
async function renderIpoDetailPage(container, slug) {
  container.innerHTML = `<div class="text-center py-20 text-slate-500">Loading comprehensive IPO research breakdown...</div>`;

  try {
    const res = await fetch(`/api/ipos/${slug}`);
    const data = await res.json();
    if (!data.success || !data.ipo) {
      container.innerHTML = `<div class="text-center py-20 text-rose-600 font-bold">IPO not found.</div>`;
      return;
    }

    const ipo = data.ipo;
    const g = ipo.gmp || { gmp_amount: 0, gmp_percent: 0, estimated_listing_price: ipo.upper_price, estimated_profit_per_lot: 0 };
    const sub = ipo.subscription || { qib_x: 1, nii_x: 1, retail_x: 1, total_x: 1 };
    const rev = ipo.review || { summary: 'Under research analysis', rating: 'Neutral', strengths: [], risks: [] };

    const regName = ipo.registrar_name || '';
    const regUrl = ipo.registrar_url || (
      regName.includes('KFin') ? 'https://kosmic.kfintech.com/ipostatus/' :
      (regName.includes('Bigshare') ? 'https://bigshareonline.com/ipo_gm.html' : 'https://linkintime.co.in/ipoallotment.html')
    );

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Breadcrumb -->
        <div class="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <a href="/" onclick="navigateTo('/'); return false;" class="hover:underline">Home</a>
          <span>/</span>
          <a href="/screener" onclick="navigateTo('/screener'); return false;" class="hover:underline">IPO Screener</a>
          <span>/</span>
          <span class="text-slate-900 dark:text-white font-semibold">${ipo.name}</span>
        </div>

        <!-- Header Card -->
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div class="flex flex-wrap justify-between items-start gap-4">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge ${ipo.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'}">${ipo.category}</span>
                <span class="badge ${ipo.status === 'Ongoing' ? 'badge-open' : (ipo.status === 'Listed' ? 'badge-listed' : 'badge-upcoming')}">${ipo.status}</span>
                <span class="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">Symbol: ${ipo.symbol}</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">${ipo.name}</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400">${ipo.company_name} • Sector: <strong class="text-slate-700 dark:text-slate-300">${ipo.sector}</strong> • Exchange: <strong class="text-slate-700 dark:text-slate-300">${ipo.exchange}</strong></p>
            </div>
            
            <div class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-right shrink-0">
              <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold">Live Grey Market Premium</span>
              <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400">+₹${g.gmp_amount} (${g.gmp_percent}%)</div>
              <div class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Est. Profit/Lot: <strong class="text-emerald-700 dark:text-emerald-300">₹${g.estimated_profit_per_lot.toLocaleString()}</strong></div>
            </div>
          </div>
        </div>

        <!-- Official Registrar & Actions Bar -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div class="flex items-center space-x-3 text-center sm:text-left">
            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <i data-lucide="shield-check" class="w-5 h-5 text-white"></i>
            </div>
            <div>
              <span class="text-xs text-blue-100 font-semibold uppercase tracking-wider">Official Registrar of Issue</span>
              <div class="text-base font-bold text-white">${ipo.registrar_name || 'Link Intime India Pvt Ltd'}</div>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 w-full sm:w-auto justify-center">
            <a href="${regUrl}" target="_blank" rel="noopener" class="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-xl text-xs flex items-center justify-center shadow transition">
              <i data-lucide="external-link" class="w-3.5 h-3.5 mr-1.5"></i> Verify Registrar Allotment Status
            </a>
            <a href="/allotment" onclick="navigateTo('/allotment'); return false;" class="px-4 py-2.5 bg-blue-800/80 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center justify-center transition">
              Quick PAN Check
            </a>
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="stat-card">
            <span class="text-xs text-slate-500 dark:text-slate-400">Price Band</span>
            <div class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">₹${ipo.min_price} - ₹${ipo.upper_price}</div>
          </div>
          <div class="stat-card">
            <span class="text-xs text-slate-500 dark:text-slate-400">Lot Size</span>
            <div class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">${ipo.lot_size} shares</div>
          </div>
          <div class="stat-card">
            <span class="text-xs text-slate-500 dark:text-slate-400">Min Investment</span>
            <div class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">₹${ipo.min_investment.toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <span class="text-xs text-slate-500 dark:text-slate-400">Total Issue Size</span>
            <div class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">₹${ipo.issue_size_cr} Cr</div>
          </div>
        </div>

        <!-- Milestone Important Dates Grid -->
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center">
            <i data-lucide="calendar-check" class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2"></i> Key Milestone IPO Dates
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Bidding Opens</span>
              <div class="text-xs font-black text-slate-900 dark:text-white">${ipo.open_date || 'TBA'}</div>
            </div>
            <div class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Bidding Closes</span>
              <div class="text-xs font-black text-slate-900 dark:text-white">${ipo.close_date || 'TBA'}</div>
            </div>
            <div class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Allotment Date</span>
              <div class="text-xs font-black text-blue-600 dark:text-blue-400">${ipo.allotment_date || 'TBA'}</div>
            </div>
            <div class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Refund Initiation</span>
              <div class="text-xs font-black text-slate-900 dark:text-white">${ipo.refund_date || 'TBA'}</div>
            </div>
            <div class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Demat Credit</span>
              <div class="text-xs font-black text-slate-900 dark:text-white">${ipo.credit_date || 'TBA'}</div>
            </div>
            <div class="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-300 dark:border-emerald-700 text-center space-y-1">
              <span class="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase">Listing Date</span>
              <div class="text-xs font-black text-emerald-700 dark:text-emerald-300">${ipo.listing_date || 'TBA'}</div>
            </div>
          </div>
        </div>

        <!-- Issue Details & Quotas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- Quota Distribution -->
          <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center">
              <i data-lucide="pie-chart" class="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2"></i> Category Quotas & Demand
            </h3>
            <div class="space-y-3 text-xs">
              <div>
                <div class="flex justify-between font-semibold mb-1">
                  <span class="text-slate-600 dark:text-slate-400">Retail Portion (RII): 35%</span>
                  <span class="font-bold text-slate-900 dark:text-white">${sub.retail_x || 1.0}x Subscribed</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div class="bg-blue-600 h-full rounded-full" style="width: ${Math.min(100, (sub.retail_x || 1) * 20)}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between font-semibold mb-1">
                  <span class="text-slate-600 dark:text-slate-400">QIB Portion: 50%</span>
                  <span class="font-bold text-slate-900 dark:text-white">${sub.qib_x || 1.0}x Subscribed</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div class="bg-emerald-600 h-full rounded-full" style="width: ${Math.min(100, (sub.qib_x || 1) * 20)}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between font-semibold mb-1">
                  <span class="text-slate-600 dark:text-slate-400">NII / HNI Portion: 15%</span>
                  <span class="font-bold text-slate-900 dark:text-white">${sub.nii_x || 1.0}x Subscribed</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div class="bg-amber-600 h-full rounded-full" style="width: ${Math.min(100, (sub.nii_x || 1) * 20)}%"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lot Size Application Breakdown -->
          <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center">
              <i data-lucide="layers" class="w-5 h-5 text-amber-500 mr-2"></i> Application Lot Breakdown
            </h3>
            <div class="overflow-x-auto">
              <table class="custom-table text-xs">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Lots</th>
                    <th>Shares</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-bold text-slate-900 dark:text-white">Retail (Min)</td>
                    <td>1 Lot</td>
                    <td>${ipo.lot_size}</td>
                    <td class="font-bold text-emerald-600 dark:text-emerald-400">₹${ipo.min_investment.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td class="font-bold text-slate-900 dark:text-white">Retail (Max)</td>
                    <td>13 Lots</td>
                    <td>${ipo.lot_size * 13}</td>
                    <td class="font-bold text-slate-900 dark:text-white">₹${(ipo.min_investment * 13).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td class="font-bold text-slate-900 dark:text-white">Small HNI (sNII)</td>
                    <td>14 Lots</td>
                    <td>${ipo.lot_size * 14}</td>
                    <td class="font-bold text-blue-600 dark:text-blue-400">₹${(ipo.min_investment * 14).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Company Overview & Business Model -->
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center">
            <i data-lucide="building" class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2"></i> About Company & Business Operations
          </h3>
          <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${ipo.business_overview || 'Comprehensive industrial business operations across India.'}</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div class="space-y-1">
              <span class="font-bold text-slate-900 dark:text-white">Promoters & Management:</span>
              <p class="text-slate-600 dark:text-slate-400">${ipo.promoters_info || 'Experienced corporate leadership team.'}</p>
            </div>
            <div class="space-y-1">
              <span class="font-bold text-slate-900 dark:text-white">Objects of the Issue:</span>
              <p class="text-slate-600 dark:text-slate-400">${ipo.objects_of_issue || 'Funding capital expenditure and working capital requirements.'}</p>
            </div>
          </div>
        </div>

        <!-- 3-Year Financial Performance -->
        ${ipo.financials && ipo.financials.length > 0 ? `
          <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center">
              <i data-lucide="line-chart" class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2"></i> Audited Financial Performance (Past Years)
            </h3>
            <div class="overflow-x-auto">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Fiscal Year</th>
                    <th>Revenue (₹ Cr)</th>
                    <th>EBITDA (₹ Cr)</th>
                    <th>PAT (₹ Cr)</th>
                    <th>EPS (₹)</th>
                    <th>ROE (%)</th>
                    <th>ROCE (%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${ipo.financials.map(f => `
                    <tr>
                      <td class="font-bold text-slate-900 dark:text-white">${f.fiscal_year}</td>
                      <td class="font-bold text-emerald-600 dark:text-emerald-400">₹${f.revenue_cr.toLocaleString()}</td>
                      <td class="font-medium text-slate-700 dark:text-slate-300">₹${f.ebitda_cr.toLocaleString()}</td>
                      <td class="font-bold text-blue-600 dark:text-blue-400">₹${f.pat_cr.toLocaleString()}</td>
                      <td>₹${f.eps}</td>
                      <td>${f.roe}%</td>
                      <td>${f.roce}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- Analyst Research Review & Rating -->
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center">
              <i data-lucide="award" class="w-5 h-5 text-amber-500 mr-2"></i> Analyst Research Review & Recommendation
            </h3>
            <span class="badge badge-open text-xs px-3 py-1 font-black">Recommendation: ${rev.overall_rating}</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${rev.summary}</p>
        </div>

      </div>
    `;
    safeCreateIcons();
  } catch (err) {
    console.error('Error fetching detail', err);
  }
}

// ----------------------------------------------------
// 9. IPO REVIEWS PAGE RENDER
// ----------------------------------------------------
async function renderReviewsPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-2 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center">
          <i data-lucide="file-text" class="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2"></i> IPO Reviews & Research Ratings
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">Expert quantitative and qualitative breakdown for active Indian IPOs.</p>
      </div>

      <div id="reviews-list-container" class="space-y-4">
        <div class="text-center py-12 text-slate-500">Loading research reviews...</div>
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/reviews');
    const data = await res.json();
    if (data.success && data.reviews) {
      const containerEl = document.getElementById('reviews-list-container');
      containerEl.innerHTML = data.reviews.map(r => `
        <div onclick="navigateTo('/ipo/${r.slug}')" class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-6 space-y-3 cursor-pointer transition shadow-sm">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-slate-900 dark:text-white text-lg">${r.ipo_name}</h3>
            <span class="badge badge-open">${r.overall_rating}</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${r.summary}</p>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error reviews', err);
  }
}

// ----------------------------------------------------
// 10. BLOGS & GUIDES PAGE RENDER
// ----------------------------------------------------
async function renderBlogListPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-2 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center">
          <i data-lucide="book-open" class="w-6 h-6 text-emerald-600 dark:text-emerald-400 mr-2"></i> Educational IPO Guides & News
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">Learn how IPO allotment works, GMP calculation rules, and SME investing strategies.</p>
      </div>

      <div id="blogs-grid-container" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="col-span-full text-center py-12 text-slate-500">Loading articles...</div>
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/blogs');
    const data = await res.json();
    if (data.success && data.posts) {
      const grid = document.getElementById('blogs-grid-container');
      grid.innerHTML = data.posts.map(p => `
        <div onclick="navigateTo('/blog/${p.slug}')" class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-6 cursor-pointer space-y-3 transition flex flex-col justify-between shadow-sm">
          <div class="space-y-2">
            <span class="badge badge-mainboard">${p.category}</span>
            <h3 class="font-bold text-slate-900 dark:text-white text-base leading-snug">${p.title}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">${p.summary}</p>
          </div>
          <div class="text-[11px] text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <span>${p.author}</span>
            <span>${p.read_time}</span>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error blogs', err);
  }
}

async function renderBlogDetailPage(container, slug) {
  container.innerHTML = `<div class="text-center py-20 text-slate-500">Loading article...</div>`;
  try {
    const res = await fetch(`/api/blogs/${slug}`);
    const data = await res.json();
    if (!data.success || !data.post) {
      container.innerHTML = `<div class="text-center py-20 text-rose-600">Article not found.</div>`;
      return;
    }
    const p = data.post;
    container.innerHTML = `
      <div class="max-w-3xl mx-auto space-y-6">
        <button onclick="navigateTo('/blog')" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center">
          &larr; Back to All Educational Guides
        </button>
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-6 shadow-sm">
          <span class="badge badge-mainboard">${p.category}</span>
          <h1 class="text-3xl font-black text-slate-900 dark:text-white leading-tight">${p.title}</h1>
          <div class="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-4">
            <span>By ${p.author}</span>
            <span>${p.date} • ${p.read_time}</span>
          </div>
          <div class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed space-y-4 whitespace-pre-line">
            ${p.content}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Blog detail error', err);
  }
}

// ----------------------------------------------------
// 11. WATCHLIST PAGE RENDER
// ----------------------------------------------------
function renderWatchlistPage(container) {
  if (!state.user) {
    container.innerHTML = `
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
        <i data-lucide="lock" class="w-12 h-12 text-amber-500 mx-auto"></i>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">Login Required</h2>
        <p class="text-xs text-slate-600 dark:text-slate-400">Please sign in to save your favorite IPOs and frequently checked PAN numbers.</p>
        <button onclick="openAuthModal()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition">
          Sign In / Register
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-6 max-w-4xl mx-auto">
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-2 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center">
          <i data-lucide="bookmark" class="w-6 h-6 text-amber-500 mr-2"></i> My Saved Watchlist & PAN Profiles
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">Manage tracked IPOs and saved PAN numbers for instant status checking.</p>
      </div>

      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 class="font-bold text-slate-900 dark:text-white text-base">Your Account: ${state.user.name} (${state.user.email})</h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">You can save your family members' PAN numbers for 1-click allotment verification.</p>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// 12. ADMIN DASHBOARD RENDER
// ----------------------------------------------------
async function renderAdminPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      
      <div class="bg-white dark:bg-[#111827] border border-rose-200 dark:border-rose-900/60 p-6 rounded-2xl space-y-2 shadow-sm">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center">
            <i data-lucide="sliders" class="w-6 h-6 text-rose-600 dark:text-rose-400 mr-2"></i> Admin Control Panel
          </h1>
          <span class="badge badge-closed">System Administrator</span>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-400">Manage IPOs, live GMP updates, subscription numbers, and monitor external data source health.</p>
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Live GMP Editor -->
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 class="font-bold text-slate-900 dark:text-white text-base flex items-center">
            <i data-lucide="zap" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-2"></i> Quick GMP Rate Updater
          </h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select IPO</label>
              <select id="admin-gmp-ipo" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white">
                ${state.ipos.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New GMP Amount (₹)</label>
              <input type="number" id="admin-gmp-val" placeholder="e.g. 125" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white">
            </div>
            <button onclick="handleAdminGmpUpdate()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition">
              Update Live GMP Rate
            </button>
            <div id="admin-gmp-msg" class="hidden text-xs text-emerald-600 dark:text-emerald-400 font-semibold"></div>
          </div>
        </div>

        <!-- Add IPO Form -->
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 class="font-bold text-slate-900 dark:text-white text-base flex items-center">
            <i data-lucide="plus-circle" class="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2"></i> Fast IPO Creator
          </h3>
          <form onsubmit="handleCreateIpo(event)" class="space-y-3">
            <div>
              <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Company / Issue Name</label>
              <input type="text" id="admin-new-name" required placeholder="e.g. Tata Capital Limited IPO" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <select id="admin-new-cat" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white">
                  <option value="Mainboard">Mainboard</option>
                  <option value="SME">SME</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Status</label>
                <select id="admin-new-status" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white">
                  <option value="Upcoming">Upcoming</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Listed">Listed</option>
                </select>
              </div>
            </div>
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition">
              Save IPO to Database
            </button>
            <div id="admin-create-msg" class="hidden text-xs text-emerald-600 dark:text-emerald-400 font-semibold"></div>
          </form>
        </div>

      </div>

      <!-- Data Source Status Card -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 class="font-bold text-slate-900 dark:text-white text-base flex items-center">
          <i data-lucide="activity" class="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2"></i> Real-time Ingestion & Source Health (Sync Every 30m)
        </h3>
        <div id="admin-sources-grid" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-xs text-slate-500">Loading source metrics...</div>
        </div>
      </div>

    </div>
  `;

  await loadAdminDataSources();
}

async function handleAdminGmpUpdate() {
  const ipoId = document.getElementById('admin-gmp-ipo').value;
  const gmp = document.getElementById('admin-gmp-val').value;
  const msg = document.getElementById('admin-gmp-msg');
  msg.classList.remove('hidden');

  try {
    const res = await fetch('/api/admin/gmp/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipo_id: ipoId, gmp_amount: gmp })
    });
    const data = await res.json();
    if (data.success) {
      msg.innerText = "GMP rate updated successfully! Live feeds updated.";
      await loadIPOsData();
      await loadTopTicker();
    }
  } catch (err) {
    console.error('Admin update error', err);
  }
}

async function handleAdminCreateIpo() {
  const name = document.getElementById('admin-new-name').value.trim();
  const price = document.getElementById('admin-new-price').value;
  const lot = document.getElementById('admin-new-lot').value;
  const msg = document.getElementById('admin-create-msg');
  msg.classList.remove('hidden');

  if (!name) return;

  try {
    const res = await fetch('/api/admin/ipos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, max_price: price, lot_size: lot, category: 'Mainboard', status: 'Upcoming' })
    });
    const data = await res.json();
    if (data.success) {
      msg.innerText = "New IPO published successfully!";
      await loadIPOsData();
    }
  } catch (err) {
    console.error('Admin create error', err);
  }
}

async function loadAdminDataSources() {
  try {
    const res = await fetch('/api/admin/data-sources');
    const data = await res.json();
    if (data.success && data.sources) {
      const grid = document.getElementById('admin-sources-grid');
      if (grid) {
        grid.innerHTML = data.sources.map(s => `
          <div class="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2 shadow-sm">
            <div class="flex justify-between items-center">
              <span class="font-bold text-slate-900 dark:text-white text-xs">${s.name}</span>
              <span class="badge badge-open">${s.status}</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">${s.endpoint_type} • Ping: <strong class="text-emerald-600 dark:text-emerald-400">${s.response_time_ms}ms</strong></div>
            <div class="text-[10px] text-slate-400 font-mono">Last Sync: ${s.last_success}</div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Sources error', err);
  }
}

// ----------------------------------------------------
// MODAL CONTROLLERS
// ----------------------------------------------------
function openQuickAllotmentModal() {
  const modal = document.getElementById('quick-allotment-modal');
  if (modal) modal.classList.remove('hidden');
}
function closeQuickAllotmentModal() {
  const modal = document.getElementById('quick-allotment-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleQuickCheckSubmit() {
  const ipoId = document.getElementById('modal-ipo-select').value;
  const pan = document.getElementById('modal-pan-input').value.trim();
  const out = document.getElementById('modal-result-output');
  out.classList.remove('hidden');

  out.innerHTML = `<div class="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-xs flex items-center justify-center"><i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Querying registrar...</div>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/allotment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipo_id: ipoId, pan: pan })
    });
    const data = await res.json();
    if (data.success) {
      out.innerHTML = `
        <div class="p-4 ${data.allotted ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'} border rounded-xl space-y-2 text-xs">
          <div class="font-bold text-sm text-slate-900 dark:text-white">${data.ipo_name}</div>
          <div class="font-black text-sm ${data.allotted ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${data.status_text}</div>
          <div class="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">Shares: <strong class="text-slate-900 dark:text-white">${data.shares_allotted}</strong> • App No: <strong class="text-slate-900 dark:text-white">${data.application_no}</strong></div>
        </div>
      `;
    } else {
      out.innerHTML = `<div class="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">${data.error}</div>`;
    }
  } catch (err) {
    out.innerHTML = `<div class="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">Network error querying allotment.</div>`;
  }
}

function openAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
}
function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}
let currentAuthMode = 'login';
function switchAuthTab(mode) {
  currentAuthMode = mode;
  const nameF = document.getElementById('auth-name-field');
  const btnL = document.getElementById('tab-login-btn');
  const btnR = document.getElementById('tab-register-btn');
  const submitB = document.getElementById('auth-submit-btn');

  if (mode === 'register') {
    nameF.classList.remove('hidden');
    btnR.className = 'flex-1 py-2 text-blue-400 border-b-2 border-blue-500 text-center';
    btnL.className = 'flex-1 py-2 text-gray-400 text-center';
    submitB.innerText = 'Create Account';
  } else {
    nameF.classList.add('hidden');
    btnL.className = 'flex-1 py-2 text-blue-400 border-b-2 border-blue-500 text-center';
    btnR.className = 'flex-1 py-2 text-gray-400 text-center';
    submitB.innerText = 'Sign In';
  }
}

async function handleAuthSubmit(evt) {
  evt.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value;
  const errEl = document.getElementById('auth-error-msg');
  errEl.classList.add('hidden');

  const endpoint = currentAuthMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const bodyData = currentAuthMode === 'register' ? { email, password, name } : { email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    const data = await res.json();
    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('ipocircle_token', data.token);
      updateAuthHeaderUI();
      closeAuthModal();
      navigateTo('/watchlist');
    } else {
      errEl.innerText = data.error;
      errEl.classList.remove('hidden');
    }
  } catch (err) {
    errEl.innerText = 'Authentication error.';
    errEl.classList.remove('hidden');
  }
}

function toggleMobileNav() {
  document.getElementById('mobile-nav').classList.toggle('hidden');
}
