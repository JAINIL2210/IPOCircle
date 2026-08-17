/**
 * IPOCircle Main SPA Router & UI Controller
 */

// Global State
const state = {
  user: null,
  token: localStorage.getItem('ipocircle_token') || null,
  ipos: [],
  gmpData: [],
  subscriptions: [],
  currentPath: window.location.pathname
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadTopTicker();
  await loadIPOsData();
  handleRoute(window.location.pathname);

  window.addEventListener('popstate', () => {
    handleRoute(window.location.pathname);
  });
});

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

  // Highlight active nav links
  document.querySelectorAll('.nav-link').forEach(el => {
    const href = el.getAttribute('href');
    if (href === path) {
      el.classList.add('bg-gray-800', 'text-white');
    } else {
      el.classList.remove('bg-gray-800');
    }
  });

  if (path === '/' || path === '') {
    renderHomePage(container);
  } else if (path === '/gmp') {
    renderGmpPage(container);
  } else if (path === '/screener') {
    renderScreenerPage(container);
  } else if (path === '/subscription') {
    renderSubscriptionPage(container);
  } else if (path === '/allotment') {
    renderAllotmentPage(container);
  } else if (path === '/calendar') {
    renderCalendarPage(container);
  } else if (path === '/calculator') {
    renderCalculatorPage(container);
  } else if (path.startsWith('/ipo/')) {
    const slug = path.replace('/ipo/', '');
    renderIpoDetailPage(container, slug);
  } else if (path === '/reviews') {
    renderReviewsPage(container);
  } else if (path === '/blog') {
    renderBlogListPage(container);
  } else if (path.startsWith('/blog/')) {
    const slug = path.replace('/blog/', '');
    renderBlogDetailPage(container, slug);
  } else if (path === '/watchlist') {
    renderWatchlistPage(container);
  } else if (path === '/admin') {
    renderAdminPage(container);
  } else {
    renderHomePage(container);
  }

  setTimeout(() => lucide.createIcons(), 50);
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
        <a href="/watchlist" onclick="navigateTo('/watchlist'); return false;" class="text-xs font-semibold text-gray-300 hover:text-white flex items-center bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
          <i data-lucide="bookmark" class="w-3.5 h-3.5 mr-1 text-amber-400"></i> ${state.user.name.split(' ')[0]}
        </a>
        <button onclick="handleLogout()" class="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-gray-800">
          <i data-lucide="log-out" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  } else {
    area.innerHTML = `
      <button onclick="openAuthModal()" class="px-3 py-1.5 border border-gray-700 hover:border-gray-600 rounded-lg text-xs font-semibold text-gray-200 hover:bg-gray-800 transition">
        Login / Sign Up
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
    tickerEl.innerHTML = `<span class="text-emerald-400 font-bold flex items-center"><i data-lucide="loader-2" class="w-3 h-3 animate-spin mr-1"></i> Syncing live market GMP & IPO data...</span>`;
    lucide.createIcons();
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
      const tickerEl = document.getElementById('top-gmp-ticker');
      if (tickerEl) {
        tickerEl.innerHTML = data.gmp_data.slice(0, 8).map(g => `
          <div class="inline-flex items-center space-x-2 cursor-pointer hover:text-white" onclick="navigateTo('/ipo/${g.slug}')">
            <span class="font-bold text-white">${g.ipo_name}</span>
            <span class="text-emerald-400 font-bold">₹${g.gmp_amount}</span>
            <span class="text-xs px-1.5 py-0.5 rounded ${g.gmp_change >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}">
              ${g.gmp_change >= 0 ? '+' : ''}${g.gmp_percent}%
            </span>
          </div>
        `).join('<span class="text-gray-700">•</span>');
      }
    }
  } catch (err) {
    console.error('Ticker fetch error', err);
  }
}

async function loadIPOsData() {
  try {
    const res = await fetch('/api/ipos');
    const data = await res.json();
    if (data.success) {
      state.ipos = data.ipos;
      populateModalIpoDropdown();
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
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-gray-900 to-indigo-950 border border-blue-900/40 p-8 sm:p-12 shadow-2xl">
        <div class="relative z-10 max-w-2xl space-y-4">
          <div class="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1 text-xs text-blue-400 font-semibold">
            <span class="pulse-dot"></span>
            <span>Live IPO Ingestion & Registrar Sync Active</span>
          </div>
          <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Track Live IPO <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">GMP & Allotment</span> in Real-Time
          </h1>
          <p class="text-gray-300 text-sm sm:text-base leading-relaxed">
            Production-ready Indian IPO tracking suite. Instant Grey Market Premium rates, live QIB/Retail subscription statistics, bulk PAN allotment status checking, and deep financial research.
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <a href="/allotment" onclick="navigateTo('/allotment'); return false;" class="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition flex items-center">
              <i data-lucide="check-circle" class="w-4 h-4 mr-2"></i> Check IPO Allotment
            </a>
            <a href="/gmp" onclick="navigateTo('/gmp'); return false;" class="px-5 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 font-bold rounded-xl text-sm transition flex items-center">
              <i data-lucide="zap" class="w-4 h-4 mr-2"></i> View Live GMP Dashboard
            </a>
            <a href="/calculator" onclick="navigateTo('/calculator'); return false;" class="px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-sm transition flex items-center">
              <i data-lucide="calculator" class="w-4 h-4 mr-2"></i> Allotment Calculator
            </a>
          </div>
        </div>
      </div>

      <!-- Live GMP Highlights Grid -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-extrabold text-white flex items-center">
            <i data-lucide="flame" class="w-5 h-5 text-amber-400 mr-2"></i> Today's Live GMP Highlights
          </h2>
          <a href="/gmp" onclick="navigateTo('/gmp'); return false;" class="text-xs font-semibold text-blue-400 hover:underline">View All GMP &rarr;</a>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${state.ipos.slice(0, 4).map(ipo => {
            const g = ipo.gmp || { gmp_amount: 0, gmp_percent: 0, estimated_listing_price: ipo.upper_price, estimated_profit_per_lot: 0 };
            return `
              <div onclick="navigateTo('/ipo/${ipo.slug}')" class="stat-card cursor-pointer space-y-3 relative group">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="badge ${ipo.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'} mb-1">${ipo.category}</span>
                    <h3 class="font-bold text-white text-base group-hover:text-blue-400 transition">${ipo.name}</h3>
                  </div>
                  <span class="badge ${ipo.status === 'Ongoing' ? 'badge-open' : (ipo.status === 'Listed' ? 'badge-listed' : 'badge-upcoming')}">${ipo.status}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800">
                  <div>
                    <span class="text-[11px] text-gray-400">Issue Price</span>
                    <div class="text-sm font-bold text-white">₹${ipo.upper_price}</div>
                  </div>
                  <div>
                    <span class="text-[11px] text-gray-400">Live GMP</span>
                    <div class="text-sm font-extrabold text-emerald-400">+₹${g.gmp_amount} (${g.gmp_percent}%)</div>
                  </div>
                </div>
                <div class="bg-gray-900 p-2 rounded-lg flex justify-between items-center text-xs">
                  <span class="text-gray-400">Est. Profit/Lot:</span>
                  <span class="font-bold text-emerald-400">₹${g.estimated_profit_per_lot.toLocaleString()}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Ongoing & Upcoming IPO Split View -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Ongoing IPOs -->
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold text-white flex items-center">
              <span class="pulse-dot mr-2"></span> Ongoing IPO Bidding
            </h3>
            <span class="text-xs text-gray-400">Open for subscription</span>
          </div>
          <div class="space-y-3">
            ${ongoing.length > 0 ? ongoing.map(ipo => `
              <div onclick="navigateTo('/ipo/${ipo.slug}')" class="p-4 bg-gray-800/60 hover:bg-gray-800 rounded-xl border border-gray-700/50 cursor-pointer transition flex justify-between items-center">
                <div>
                  <div class="font-bold text-white text-sm">${ipo.name}</div>
                  <div class="text-xs text-gray-400">Closes: <span class="text-rose-400 font-semibold">${ipo.close_date || 'N/A'}</span> • Lot: ${ipo.lot_size} shares</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-extrabold text-emerald-400">+₹${ipo.gmp ? ipo.gmp.gmp_amount : 0} GMP</div>
                  <div class="text-xs text-blue-400 font-medium">${ipo.subscription ? ipo.subscription.total_x + 'x Subscribed' : 'Live Data'}</div>
                </div>
              </div>
            `).join('') : '<div class="text-xs text-gray-400 py-4 text-center">No ongoing IPOs today. Check upcoming list.</div>'}
          </div>
        </div>

        <!-- Quick Allotment Lookup Widget -->
        <div class="bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 class="text-lg font-bold text-white flex items-center">
            <i data-lucide="shield-check" class="w-5 h-5 text-blue-400 mr-2"></i> Quick IPO Allotment Checker
          </h3>
          <p class="text-xs text-gray-300">
            Check your IPO application status across Link Intime, KFintech, Bigshare, and Maashitla directly.
          </p>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-400 mb-1">Select IPO</label>
              <select id="home-ipo-select" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-blue-500">
                ${state.ipos.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-400 mb-1">PAN Number</label>
              <input type="text" id="home-pan-input" uppercase placeholder="Enter 10-digit PAN (e.g. ABCDE1234F)" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 font-mono uppercase">
            </div>
            <div class="flex space-x-3">
              <button onclick="handleHomeQuickCheck()" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition">
                Check Status
              </button>
              <a href="/allotment" onclick="navigateTo('/allotment'); return false;" class="px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold rounded-xl text-sm transition text-center">
                Bulk Check
              </a>
            </div>
            <div id="home-check-result" class="hidden"></div>
          </div>
        </div>

      </div>

      <!-- Educational & Guides Section -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold text-white flex items-center">
            <i data-lucide="book-open" class="w-5 h-5 text-indigo-400 mr-2"></i> Educational Guides & IPO News
          </h3>
          <a href="/blog" onclick="navigateTo('/blog'); return false;" class="text-xs text-blue-400 font-semibold hover:underline">Explore All Guides &rarr;</a>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div onclick="navigateTo('/blog/how-to-check-ipo-allotment-status-online')" class="p-4 bg-gray-800/60 hover:bg-gray-800 rounded-xl border border-gray-700/50 cursor-pointer space-y-2">
            <span class="badge badge-mainboard">Guide</span>
            <h4 class="font-bold text-white text-sm">How to Check IPO Allotment Status Online</h4>
            <p class="text-xs text-gray-400">Step-by-step guide for Link Intime, KFintech, and BSE status checking.</p>
          </div>
          <div onclick="navigateTo('/blog/what-is-ipo-gmp-how-it-is-calculated')" class="p-4 bg-gray-800/60 hover:bg-gray-800 rounded-xl border border-gray-700/50 cursor-pointer space-y-2">
            <span class="badge badge-open">GMP Explained</span>
            <h4 class="font-bold text-white text-sm">What is IPO GMP & How to Calculate Return</h4>
            <p class="text-xs text-gray-400">Learn how estimated listing price and profit per lot are computed.</p>
          </div>
          <div onclick="navigateTo('/blog/mainboard-vs-sme-ipo-key-differences')" class="p-4 bg-gray-800/60 hover:bg-gray-800 rounded-xl border border-gray-700/50 cursor-pointer space-y-2">
            <span class="badge badge-sme">SME vs Mainboard</span>
            <h4 class="font-bold text-white text-sm">Mainboard IPO vs SME IPO Differences</h4>
            <p class="text-xs text-gray-400">Compare issue size, lot sizes, trading rules, and risk profiles.</p>
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
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl">
        <div>
          <div class="flex items-center space-x-2">
            <span class="pulse-dot"></span>
            <h1 class="text-2xl font-black text-white">Live IPO GMP Dashboard</h1>
          </div>
          <p class="text-xs text-gray-400 mt-1">Real-time Grey Market Premium rates, estimated listing prices, and estimated profit per lot.</p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <button onclick="loadGmpData('highest_gmp')" class="px-3 py-2 bg-blue-600 text-white font-semibold rounded-lg">Sort by Highest GMP</button>
          <button onclick="loadGmpData('highest_percent')" class="px-3 py-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg border border-gray-700">Sort by Highest %</button>
        </div>
      </div>

      <!-- Disclaimer Alert -->
      <div class="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs leading-relaxed flex items-start space-x-3">
        <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400 shrink-0 mt-0.5"></i>
        <div>
          <strong class="text-amber-200 font-bold">Grey Market Premium (GMP) Disclaimer:</strong> 
          GMP is unofficial over-the-counter market information provided for reference and educational purposes only. It is not regulated by SEBI, NSE, or BSE. Formula used: 
          <code class="bg-amber-900/60 px-1 py-0.5 rounded">Est. Listing Price = Upper Price + GMP</code> and 
          <code class="bg-amber-900/60 px-1 py-0.5 rounded">Est. Profit = GMP × Lot Size</code>.
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row gap-3">
        <input type="text" id="gmp-search-input" oninput="filterGmpTable()" placeholder="Search IPO name..." class="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
        <select id="gmp-category-select" onchange="filterGmpTable()" class="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white">
          <option value="All">All Categories (Mainboard & SME)</option>
          <option value="Mainboard">Mainboard IPOs Only</option>
          <option value="SME">SME IPOs Only</option>
        </select>
      </div>

      <!-- GMP Table Container -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
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
              <tr><td colspan="9" class="text-center py-8 text-gray-400">Loading live GMP rates...</td></tr>
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
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-gray-400">No matching GMP records found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(g => `
    <tr onclick="navigateTo('/ipo/${g.slug}')" class="cursor-pointer">
      <td class="font-bold text-white">${g.ipo_name}</td>
      <td><span class="badge ${g.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'}">${g.category}</span></td>
      <td class="font-medium text-gray-300">₹${g.upper_price}</td>
      <td class="font-extrabold text-emerald-400">+₹${g.gmp_amount}</td>
      <td class="font-bold text-emerald-300">${g.gmp_percent}%</td>
      <td class="font-bold text-blue-400">₹${g.estimated_listing_price}</td>
      <td class="font-extrabold text-emerald-400">₹${g.estimated_profit_per_lot.toLocaleString()}</td>
      <td><span class="badge ${g.status === 'Ongoing' ? 'badge-open' : (g.status === 'Listed' ? 'badge-listed' : 'badge-upcoming')}">${g.status}</span></td>
      <td class="text-xs text-gray-400">${g.last_updated}</td>
    </tr>
  `).join('');
}

// ----------------------------------------------------
// 3. IPO SCREENER RENDER
// ----------------------------------------------------
async function renderScreenerPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      
      <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4">
        <h1 class="text-2xl font-black text-white flex items-center">
          <i data-lucide="filter" class="w-6 h-6 text-blue-500 mr-2"></i> IPO Screener
        </h1>
        <p class="text-xs text-gray-400">Filter Indian IPOs by market segment, issue status, price range, GMP premium, and subscription multiple.</p>
        
        <!-- Screener Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-400 mb-1">Status</label>
            <select id="screener-status" onchange="runScreenerQuery()" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white">
              <option value="All">All Statuses</option>
              <option value="Ongoing">Ongoing Bidding</option>
              <option value="Upcoming">Upcoming IPOs</option>
              <option value="Listed">Listed IPOs</option>
              <option value="Closed">Closed IPOs</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-400 mb-1">Market Category</label>
            <select id="screener-category" onchange="runScreenerQuery()" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white">
              <option value="All">All Categories</option>
              <option value="Mainboard">Mainboard</option>
              <option value="SME">SME</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-400 mb-1">Min GMP (₹)</label>
            <input type="number" id="screener-min-gmp" oninput="runScreenerQuery()" placeholder="e.g. 10" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-400 mb-1">Search</label>
            <input type="text" id="screener-search" oninput="runScreenerQuery()" placeholder="Company or symbol..." class="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white">
          </div>
        </div>
      </div>

      <!-- Screener Results Container -->
      <div id="screener-results-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="col-span-full py-12 text-center text-gray-400">Running IPO screener...</div>
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
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-gray-400 bg-gray-900 border border-gray-800 rounded-2xl">No IPOs matched your custom screener filters.</div>`;
        return;
      }
      grid.innerHTML = data.ipos.map(ipo => {
        const g = ipo.gmp || { gmp_amount: 0, gmp_percent: 0, estimated_profit_per_lot: 0 };
        return `
          <div onclick="navigateTo('/ipo/${ipo.slug}')" class="stat-card cursor-pointer space-y-3">
            <div class="flex justify-between items-start">
              <div>
                <span class="badge ${ipo.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'} mb-1">${ipo.category}</span>
                <h3 class="font-bold text-white text-base">${ipo.name}</h3>
                <div class="text-xs text-gray-400">${ipo.sector}</div>
              </div>
              <span class="badge ${ipo.status === 'Ongoing' ? 'badge-open' : (ipo.status === 'Listed' ? 'badge-listed' : 'badge-upcoming')}">${ipo.status}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-800">
              <div>
                <span class="text-gray-400">Price Band:</span>
                <div class="font-semibold text-white">₹${ipo.min_price} - ₹${ipo.upper_price}</div>
              </div>
              <div>
                <span class="text-gray-400">Issue Size:</span>
                <div class="font-semibold text-white">₹${ipo.issue_size_cr} Cr</div>
              </div>
              <div>
                <span class="text-gray-400">Lot Size:</span>
                <div class="font-semibold text-white">${ipo.lot_size} shares</div>
              </div>
              <div>
                <span class="text-gray-400">Live GMP:</span>
                <div class="font-bold text-emerald-400">+₹${g.gmp_amount} (${g.gmp_percent}%)</div>
              </div>
            </div>

            <div class="bg-gray-900 p-2 rounded-lg text-xs flex justify-between items-center text-gray-300">
              <span>Open: <strong class="text-white">${ipo.open_date || 'TBA'}</strong></span>
              <span>Close: <strong class="text-rose-400">${ipo.close_date || 'TBA'}</strong></span>
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
      <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-2">
        <h1 class="text-2xl font-black text-white flex items-center">
          <i data-lucide="bar-chart-3" class="w-6 h-6 text-emerald-400 mr-2"></i> Live IPO Subscription Tracking
        </h1>
        <p class="text-xs text-gray-400">Category-wise bidding updates (QIB, NII/HNI, Retail) sourced directly from NSE & BSE bidding engines.</p>
      </div>

      <div id="subscription-cards-container" class="space-y-6">
        <div class="text-center py-12 text-gray-400">Loading live subscription metrics...</div>
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/subscription/live');
    const data = await res.json();
    if (data.success && data.subscriptions) {
      const containerEl = document.getElementById('subscription-cards-container');
      if (data.subscriptions.length === 0) {
        containerEl.innerHTML = `<div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-400">No active bidding subscription data right now.</div>`;
        return;
      }

      containerEl.innerHTML = data.subscriptions.map(s => `
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-800 pb-4">
            <div>
              <span class="badge ${s.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'} mb-1">${s.category}</span>
              <h2 class="text-xl font-bold text-white cursor-pointer hover:text-blue-400" onclick="navigateTo('/ipo/${s.slug}')">${s.ipo_name}</h2>
              <p class="text-xs text-gray-400">Closing Date: ${s.close_date || 'TBA'} • Total Bids: ${s.total_applications.toLocaleString()} Applications</p>
            </div>
            <div class="text-right">
              <span class="text-xs text-gray-400">Total Subscription</span>
              <div class="text-2xl font-black text-emerald-400">${s.total_x}x</div>
              <span class="text-[10px] text-gray-500 font-mono">${s.data_status}</span>
            </div>
          </div>

          <!-- Progress Bars -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-gray-400">QIB Quota</span>
                <span class="text-blue-400">${s.qib_x}x</span>
              </div>
              <div class="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div class="bg-blue-500 h-2.5 rounded-full" style="width: ${Math.min(s.qib_x * 10, 100)}%"></div>
              </div>
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-gray-400">NII / HNI Quota</span>
                <span class="text-indigo-400">${s.nii_x}x</span>
              </div>
              <div class="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${Math.min(s.nii_x * 10, 100)}%"></div>
              </div>
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-gray-400">Retail (RII) Quota</span>
                <span class="text-emerald-400">${s.retail_x}x</span>
              </div>
              <div class="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div class="bg-emerald-500 h-2.5 rounded-full" style="width: ${Math.min(s.retail_x * 10, 100)}%"></div>
              </div>
            </div>
          </div>

          <div class="text-[11px] text-gray-500 text-right font-mono">Last updated: ${s.last_updated}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Subscription fetch error', err);
  }
}

// ----------------------------------------------------
// 5. ALLOTMENT STATUS CHECKER RENDER (SINGLE & BULK)
// ----------------------------------------------------
function renderAllotmentPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      
      <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-2">
        <h1 class="text-2xl font-black text-white flex items-center">
          <i data-lucide="check-circle" class="w-6 h-6 text-blue-500 mr-2"></i> Dedicated IPO Allotment Status Checker
        </h1>
        <p class="text-xs text-gray-400">Check single PAN status or upload bulk CSV files for multi-account allotment verification across official registrars.</p>
      </div>

      <!-- Mode Selector Tabs -->
      <div class="flex border-b border-gray-800">
        <button id="tab-single-btn" onclick="switchAllotmentTab('single')" class="px-6 py-3 font-bold text-sm text-blue-400 border-b-2 border-blue-500 flex items-center">
          <i data-lucide="user" class="w-4 h-4 mr-2"></i> Single PAN Check
        </button>
        <button id="tab-bulk-btn" onclick="switchAllotmentTab('bulk')" class="px-6 py-3 font-bold text-sm text-gray-400 hover:text-white flex items-center">
          <i data-lucide="users" class="w-4 h-4 mr-2"></i> Bulk PAN Check (CSV/Batch)
        </button>
      </div>

      <!-- Single PAN View -->
      <div id="allotment-single-view" class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 max-w-2xl">
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Select IPO</label>
            <select id="single-ipo-select" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-blue-500">
              ${state.ipos.map(i => `<option value="${i.id}">${i.name} (${i.status})</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">PAN Number</label>
            <input type="text" id="single-pan-input" uppercase placeholder="Enter 10-character PAN (e.g. ABCDE1234F)" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white font-mono uppercase focus:border-blue-500">
          </div>
          <button onclick="handleSingleCheckSubmit()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition">
            Check Allotment Status
          </button>
          <div id="single-result-output" class="hidden pt-2"></div>
        </div>
      </div>

      <!-- Bulk PAN View -->
      <div id="allotment-bulk-view" class="hidden bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-300 mb-1">Select IPO</label>
              <select id="bulk-ipo-select" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white">
                ${state.ipos.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
              </select>
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-gray-300 mb-1">Enter PANs (One per line or comma separated)</label>
              <textarea id="bulk-pans-text" rows="6" placeholder="ABCDE1234F&#10;PQRST5678G&#10;XYZAB9999M" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-white font-mono uppercase focus:border-blue-500"></textarea>
            </div>

            <div class="flex items-center space-x-3">
              <button onclick="handleBulkCheckSubmit()" class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex-1">
                Process Bulk Allotment Check
              </button>
            </div>
          </div>

          <!-- Drag and Drop CSV Box -->
          <div class="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-gray-800/40">
            <i data-lucide="file-spreadsheet" class="w-12 h-12 text-blue-400"></i>
            <div class="font-bold text-white text-sm">Upload CSV File with Multiple PANs</div>
            <p class="text-xs text-gray-400">Drag and drop your CSV or click to select file.</p>
            <input type="file" id="csv-file-input" accept=".csv, .txt" onchange="handleCsvFileUpload(event)" class="hidden">
            <button onclick="document.getElementById('csv-file-input').click()" class="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg">
              Browse CSV File
            </button>
          </div>

        </div>

        <!-- Bulk Results Output -->
        <div id="bulk-results-output" class="hidden space-y-4 pt-4 border-t border-gray-800"></div>
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
    singleBtn.className = 'px-6 py-3 font-bold text-sm text-blue-400 border-b-2 border-blue-500 flex items-center';
    bulkBtn.className = 'px-6 py-3 font-bold text-sm text-gray-400 hover:text-white flex items-center';
  } else {
    singleView.classList.add('hidden');
    bulkView.classList.remove('hidden');
    bulkBtn.className = 'px-6 py-3 font-bold text-sm text-blue-400 border-b-2 border-blue-500 flex items-center';
    singleBtn.className = 'px-6 py-3 font-bold text-sm text-gray-400 hover:text-white flex items-center';
  }
  lucide.createIcons();
}

async function handleSingleCheckSubmit() {
  const ipoId = document.getElementById('single-ipo-select').value;
  const pan = document.getElementById('single-pan-input').value.trim();
  const out = document.getElementById('single-result-output');
  out.classList.remove('hidden');

  out.innerHTML = `<div class="p-3 bg-gray-800 rounded-xl text-gray-300 text-xs flex items-center justify-center"><i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Querying registrar status...</div>`;
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
        <div class="p-6 ${data.allotted ? 'bg-emerald-950/80 border-emerald-700 text-emerald-100' : 'bg-gray-800 border-gray-700 text-gray-200'} border rounded-2xl space-y-3">
          <div class="flex justify-between items-center">
            <span class="font-bold text-base">${data.ipo_name}</span>
            <span class="font-mono bg-black/50 px-2.5 py-1 rounded text-xs">${data.pan_masked}</span>
          </div>
          <div class="text-lg font-black ${data.allotted ? 'text-emerald-400' : 'text-rose-400'}">${data.status_text}</div>
          <div class="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-700/60">
            <div>Shares Allotted: <strong class="text-white">${data.shares_allotted} shares</strong></div>
            <div>Application No: <strong class="text-white">${data.application_no}</strong></div>
            <div>DP / Client ID: <strong class="text-white">${data.dp_id}</strong></div>
            <div>Registrar: <strong class="text-white">${data.registrar}</strong></div>
          </div>
        </div>
      `;
    } else {
      out.innerHTML = `<div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold">${data.error}</div>`;
    }
  } catch (err) {
    out.innerHTML = `<div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold">Error querying allotment database.</div>`;
  }
}

function handleCsvFileUpload(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('bulk-pans-text').value = e.target.result;
  };
  reader.readAsText(file);
}

async function handleBulkCheckSubmit() {
  const ipoId = document.getElementById('bulk-ipo-select').value;
  const text = document.getElementById('bulk-pans-text').value.trim();
  const out = document.getElementById('bulk-results-output');
  out.classList.remove('hidden');

  if (!text) {
    out.innerHTML = `<div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold">Please enter or upload at least one PAN number.</div>`;
    return;
  }

  out.innerHTML = `<div class="p-4 bg-gray-800 rounded-xl text-gray-300 text-xs text-center">Processing batch request...</div>`;

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
            <div class="bg-gray-800 p-3 rounded-xl border border-gray-700">
              <span class="text-[11px] text-gray-400">Total Processed</span>
              <div class="text-lg font-bold text-white">${s.total_processed}</div>
            </div>
            <div class="bg-emerald-950/60 p-3 rounded-xl border border-emerald-800">
              <span class="text-[11px] text-emerald-300">Allotted PANs</span>
              <div class="text-lg font-bold text-emerald-400">${s.allotted_count}</div>
            </div>
            <div class="bg-gray-800 p-3 rounded-xl border border-gray-700">
              <span class="text-[11px] text-gray-400">Non-Allotted</span>
              <div class="text-lg font-bold text-rose-400">${s.non_allotted_count}</div>
            </div>
            <div class="bg-gray-800 p-3 rounded-xl border border-gray-700">
              <span class="text-[11px] text-gray-400">Invalid Format</span>
              <div class="text-lg font-bold text-amber-400">${s.invalid_pans}</div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto border border-gray-800 rounded-xl">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>PAN Number</th>
                  <th>Application No</th>
                  <th>Allotment Status</th>
                  <th>Shares Allotted</th>
                  <th>Registrar</th>
                </tr>
              </thead>
              <tbody>
                ${data.results.map(r => `
                  <tr>
                    <td class="font-mono font-bold">${r.pan_masked}</td>
                    <td class="text-xs text-gray-300">${r.application_no || 'N/A'}</td>
                    <td class="font-bold text-xs ${r.allotted ? 'text-emerald-400' : 'text-rose-400'}">${r.status}</td>
                    <td class="font-bold text-white">${r.shares_allotted}</td>
                    <td class="text-xs text-gray-400">${r.registrar || 'Official Registrar'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  } catch (err) {
    out.innerHTML = `<div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs">Failed processing bulk batch.</div>`;
  }
}

// ----------------------------------------------------
// 6. UPCOMING IPO CALENDAR RENDER
// ----------------------------------------------------
async function renderCalendarPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-2">
        <h1 class="text-2xl font-black text-white flex items-center">
          <i data-lucide="calendar" class="w-6 h-6 text-blue-400 mr-2"></i> Upcoming IPO Calendar
        </h1>
        <p class="text-xs text-gray-400">Key milestone dates: Bidding Open/Close, Allotment Declaration, and Listing Dates.</p>
      </div>

      <div id="calendar-timeline-container" class="space-y-4">
        <div class="text-center py-12 text-gray-400">Loading calendar events...</div>
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
            <div onclick="navigateTo('/ipo/${ev.slug}')" class="p-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl cursor-pointer flex items-center justify-between transition">
              <div class="space-y-1">
                <span class="badge ${ev.event.includes('Opens') ? 'badge-open' : (ev.event.includes('Closes') ? 'badge-closed' : 'badge-upcoming')}">${ev.event}</span>
                <div class="font-bold text-white text-base">${ev.name}</div>
                <div class="text-xs text-gray-400">${ev.category}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-extrabold text-blue-400">${ev.date}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
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
      
      <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-2">
        <h1 class="text-2xl font-black text-white flex items-center">
          <i data-lucide="calculator" class="w-6 h-6 text-amber-400 mr-2"></i> Allotment Chances Calculator
        </h1>
        <p class="text-xs text-gray-400">Educational lottery probability estimator based on retail computer draw mechanics and oversubscription ratios.</p>
      </div>

      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Select IPO</label>
            <select id="calc-ipo-select" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white">
              ${state.ipos.map(i => `<option value="${i.id}">${i.name} (Sub: ${i.subscription ? i.subscription.total_x : 1}x)</option>`).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Investor Category</label>
            <select id="calc-category-select" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white">
              <option value="Retail (RII)">Retail Investor (Up to ₹2 Lakhs)</option>
              <option value="Small NII (sNII)">Small NII (₹2 Lakhs - ₹10 Lakhs)</option>
              <option value="Big NII (bNII)">Big NII (Above ₹10 Lakhs)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Subscription Multiple (x)</label>
            <input type="number" step="0.1" id="calc-sub-x" value="15.0" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white">
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Lots Applied</label>
            <input type="number" id="calc-lots" value="1" min="1" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white">
          </div>
        </div>

        <button onclick="handleCalculateEstimate()" class="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-extrabold py-3.5 rounded-xl text-sm transition">
          Calculate Estimated Allotment Probability
        </button>

        <div id="calc-result-output" class="hidden pt-4 border-t border-gray-800"></div>
      </div>

    </div>
  `;
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
        <div class="bg-gray-800/80 border border-gray-700 rounded-2xl p-6 space-y-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-bold text-white text-base">${c.ipo_name}</h3>
              <span class="text-xs text-gray-400">${c.category}</span>
            </div>
            <div class="text-right">
              <span class="text-xs text-gray-400">Winning Chance</span>
              <div class="text-2xl font-black text-amber-400">${c.probability_percent}%</div>
            </div>
          </div>

          <div class="p-4 bg-gray-900 rounded-xl border border-gray-700 space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-gray-400">Lottery Odds:</span>
              <strong class="text-white">${c.chance_ratio}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Total Investment Required:</span>
              <strong class="text-white">₹${c.min_investment.toLocaleString()}</strong>
            </div>
          </div>

          <div class="text-xs text-gray-300 leading-relaxed bg-blue-950/40 p-3 rounded-lg border border-blue-900/60">
            <strong class="text-blue-300">Explanation:</strong> ${c.explanation}
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
  container.innerHTML = `<div class="text-center py-20 text-gray-400">Loading comprehensive IPO research breakdown...</div>`;

  try {
    const res = await fetch(`/api/ipos/${slug}`);
    const data = await res.json();
    if (!data.success || !data.ipo) {
      container.innerHTML = `<div class="text-center py-20 text-rose-400">IPO not found.</div>`;
      return;
    }

    const ipo = data.ipo;
    const g = ipo.gmp || { gmp_amount: 0, gmp_percent: 0, estimated_listing_price: ipo.upper_price, estimated_profit_per_lot: 0 };
    const rev = ipo.review || { summary: 'Under research analysis', rating: 'Neutral', strengths: [], risks: [] };

    container.innerHTML = `
      <div class="space-y-8">
        
        <!-- Header -->
        <div class="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div class="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div class="flex items-center space-x-2 mb-2">
                <span class="badge ${ipo.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'}">${ipo.category}</span>
                <span class="badge ${ipo.status === 'Ongoing' ? 'badge-open' : (ipo.status === 'Listed' ? 'badge-listed' : 'badge-upcoming')}">${ipo.status}</span>
              </div>
              <h1 class="text-3xl font-black text-white">${ipo.name}</h1>
              <p class="text-xs text-gray-400 mt-1">${ipo.company_name} • Sector: ${ipo.sector} • Exchange: ${ipo.exchange}</p>
            </div>
            
            <div class="bg-gray-800 border border-gray-700 p-4 rounded-2xl text-right">
              <span class="text-xs text-gray-400">Live Grey Market Premium</span>
              <div class="text-2xl font-black text-emerald-400">+₹${g.gmp_amount} (${g.gmp_percent}%)</div>
              <div class="text-xs text-gray-300">Est. Profit/Lot: <strong class="text-emerald-300">₹${g.estimated_profit_per_lot.toLocaleString()}</strong></div>
            </div>
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="stat-card">
            <span class="text-xs text-gray-400">Price Band</span>
            <div class="text-lg font-bold text-white">₹${ipo.min_price} - ₹${ipo.upper_price}</div>
          </div>
          <div class="stat-card">
            <span class="text-xs text-gray-400">Lot Size</span>
            <div class="text-lg font-bold text-white">${ipo.lot_size} shares</div>
          </div>
          <div class="stat-card">
            <span class="text-xs text-gray-400">Min Investment</span>
            <div class="text-lg font-bold text-white">₹${ipo.min_investment.toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <span class="text-xs text-gray-400">Total Issue Size</span>
            <div class="text-lg font-bold text-white">₹${ipo.issue_size_cr} Cr</div>
          </div>
        </div>

        <!-- 3-Year Financial Table & Chart -->
        ${ipo.financials && ipo.financials.length > 0 ? `
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 class="text-lg font-bold text-white flex items-center">
              <i data-lucide="line-chart" class="w-5 h-5 text-blue-400 mr-2"></i> Company Financial Performance
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
                      <td class="font-bold text-white">${f.fiscal_year}</td>
                      <td class="font-semibold text-emerald-400">₹${f.revenue_cr.toLocaleString()}</td>
                      <td>₹${f.ebitda_cr.toLocaleString()}</td>
                      <td class="font-semibold text-blue-400">₹${f.pat_cr.toLocaleString()}</td>
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

        <!-- Research Review Verdict -->
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div class="flex justify-between items-center border-b border-gray-800 pb-3">
            <h3 class="text-lg font-bold text-white flex items-center">
              <i data-lucide="award" class="w-5 h-5 text-amber-400 mr-2"></i> Analyst Research Review
            </h3>
            <span class="badge badge-open text-sm px-3 py-1">Rating: ${rev.overall_rating}</span>
          </div>
          <p class="text-sm text-gray-200 leading-relaxed">${rev.summary}</p>
        </div>

      </div>
    `;
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
      <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-2">
        <h1 class="text-2xl font-black text-white flex items-center">
          <i data-lucide="file-text" class="w-6 h-6 text-indigo-400 mr-2"></i> IPO Reviews & Research Ratings
        </h1>
        <p class="text-xs text-gray-400">Expert quantitative and qualitative breakdown for active Indian IPOs.</p>
      </div>

      <div id="reviews-list-container" class="space-y-4">
        <div class="text-center py-12 text-gray-400">Loading research reviews...</div>
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/reviews');
    const data = await res.json();
    if (data.success && data.reviews) {
      const containerEl = document.getElementById('reviews-list-container');
      containerEl.innerHTML = data.reviews.map(r => `
        <div onclick="navigateTo('/ipo/${r.slug}')" class="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 space-y-3 cursor-pointer transition">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-white text-lg">${r.ipo_name}</h3>
            <span class="badge badge-open">${r.overall_rating}</span>
          </div>
          <p class="text-xs text-gray-300 leading-relaxed">${r.summary}</p>
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
      <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-2">
        <h1 class="text-2xl font-black text-white flex items-center">
          <i data-lucide="book-open" class="w-6 h-6 text-emerald-400 mr-2"></i> Educational IPO Guides & News
        </h1>
        <p class="text-xs text-gray-400">Learn how IPO allotment works, GMP calculation rules, and SME investing strategies.</p>
      </div>

      <div id="blogs-grid-container" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="col-span-full text-center py-12 text-gray-400">Loading articles...</div>
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/blogs');
    const data = await res.json();
    if (data.success && data.posts) {
      const grid = document.getElementById('blogs-grid-container');
      grid.innerHTML = data.posts.map(p => `
        <div onclick="navigateTo('/blog/${p.slug}')" class="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 cursor-pointer space-y-3 transition flex flex-col justify-between">
          <div class="space-y-2">
            <span class="badge badge-mainboard">${p.category}</span>
            <h3 class="font-bold text-white text-base leading-snug">${p.title}</h3>
            <p class="text-xs text-gray-400 leading-relaxed">${p.summary}</p>
          </div>
          <div class="text-[11px] text-gray-500 pt-3 border-t border-gray-800 flex justify-between">
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
  container.innerHTML = `<div class="text-center py-20 text-gray-400">Loading article...</div>`;
  try {
    const res = await fetch(`/api/blogs/${slug}`);
    const data = await res.json();
    if (!data.success || !data.post) {
      container.innerHTML = `<div class="text-center py-20 text-rose-400">Article not found.</div>`;
      return;
    }
    const p = data.post;
    container.innerHTML = `
      <div class="max-w-3xl mx-auto space-y-6">
        <button onclick="navigateTo('/blog')" class="text-xs font-semibold text-blue-400 hover:underline flex items-center">
          &larr; Back to All Educational Guides
        </button>
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
          <span class="badge badge-mainboard">${p.category}</span>
          <h1 class="text-3xl font-black text-white leading-tight">${p.title}</h1>
          <div class="flex justify-between items-center text-xs text-gray-400 border-b border-gray-800 pb-4">
            <span>By ${p.author}</span>
            <span>${p.date} • ${p.read_time}</span>
          </div>
          <div class="text-gray-300 text-sm leading-relaxed space-y-4 whitespace-pre-line">
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
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
        <i data-lucide="lock" class="w-12 h-12 text-amber-400 mx-auto"></i>
        <h2 class="text-xl font-bold text-white">Login Required</h2>
        <p class="text-xs text-gray-400">Please sign in to save your favorite IPOs and frequently checked PAN numbers.</p>
        <button onclick="openAuthModal()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition">
          Sign In / Register
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-6 max-w-4xl mx-auto">
      <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-2">
        <h1 class="text-2xl font-black text-white flex items-center">
          <i data-lucide="bookmark" class="w-6 h-6 text-amber-400 mr-2"></i> My Saved Watchlist & PAN Profiles
        </h1>
        <p class="text-xs text-gray-400">Manage tracked IPOs and saved PAN numbers for instant status checking.</p>
      </div>

      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 class="font-bold text-white text-base">Your Account: ${state.user.name} (${state.user.email})</h3>
        <p class="text-xs text-gray-400">You can save your family members' PAN numbers for 1-click allotment verification.</p>
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
      
      <div class="bg-gray-900 border border-rose-900/60 p-6 rounded-2xl space-y-2">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-white flex items-center">
            <i data-lucide="sliders" class="w-6 h-6 text-rose-400 mr-2"></i> Admin Control Panel
          </h1>
          <span class="badge badge-closed">System Administrator</span>
        </div>
        <p class="text-xs text-gray-400">Manage IPOs, live GMP updates, subscription numbers, and monitor external data source health.</p>
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Live GMP Editor -->
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 class="font-bold text-white text-base flex items-center">
            <i data-lucide="zap" class="w-4 h-4 text-emerald-400 mr-2"></i> Quick GMP Rate Updater
          </h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-300 mb-1">Select IPO</label>
              <select id="admin-gmp-ipo" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white">
                ${state.ipos.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-300 mb-1">New GMP Amount (₹)</label>
              <input type="number" id="admin-gmp-val" placeholder="e.g. 125" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white">
            </div>
            <button onclick="handleAdminGmpUpdate()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition">
              Update Live GMP Rate
            </button>
            <div id="admin-gmp-msg" class="hidden text-xs text-emerald-400 font-semibold"></div>
          </div>
        </div>

        <!-- Add IPO Form -->
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 class="font-bold text-white text-base flex items-center">
            <i data-lucide="plus-circle" class="w-4 h-4 text-blue-400 mr-2"></i> Add New IPO Record
          </h3>
          <div class="space-y-2 text-xs">
            <input type="text" id="admin-new-name" placeholder="IPO Name (e.g. Swiggy Limited IPO)" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-2 text-white">
            <div class="grid grid-cols-2 gap-2">
              <input type="number" id="admin-new-price" placeholder="Upper Price Band (₹)" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-2 text-white">
              <input type="number" id="admin-new-lot" placeholder="Lot Size" class="w-full bg-gray-800 border border-gray-700 rounded-xl p-2 text-white">
            </div>
            <button onclick="handleAdminCreateIpo()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition">
              Publish New IPO
            </button>
            <div id="admin-create-msg" class="hidden text-xs text-emerald-400 font-semibold"></div>
          </div>
        </div>

      </div>

      <!-- Data Source Health Monitor -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 class="font-bold text-white text-base flex items-center">
          <i data-lucide="activity" class="w-5 h-5 text-emerald-400 mr-2"></i> External Data Source & API Ingestion Health
        </h3>
        <div id="admin-sources-grid" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-xs text-gray-400">Loading source metrics...</div>
        </div>
      </div>

    </div>
  `;

  loadAdminDataSources();
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
          <div class="p-4 bg-gray-800 border border-gray-700 rounded-xl space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-bold text-white text-xs">${s.name}</span>
              <span class="badge badge-open">${s.status}</span>
            </div>
            <div class="text-[11px] text-gray-400">${s.endpoint_type} • Ping: ${s.response_time_ms}ms</div>
            <div class="text-[10px] text-gray-500">Last Sync: ${s.last_success}</div>
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
  document.getElementById('quick-allotment-modal').classList.remove('hidden');
}
function closeQuickAllotmentModal() {
  document.getElementById('quick-allotment-modal').classList.add('hidden');
}

async function handleQuickCheckSubmit() {
  const ipoId = document.getElementById('modal-ipo-select').value;
  const pan = document.getElementById('modal-pan-input').value.trim();
  const out = document.getElementById('modal-result-output');
  out.classList.remove('hidden');

  out.innerHTML = `<div class="p-3 bg-gray-800 rounded-xl text-gray-300 text-xs">Querying registrar...</div>`;

  try {
    const res = await fetch('/api/allotment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipo_id: ipoId, pan: pan })
    });
    const data = await res.json();
    if (data.success) {
      out.innerHTML = `
        <div class="p-4 ${data.allotted ? 'bg-emerald-950/80 border-emerald-700 text-emerald-100' : 'bg-gray-800 border-gray-700 text-gray-300'} border rounded-xl space-y-2 text-xs">
          <div class="font-bold text-sm text-white">${data.ipo_name}</div>
          <div class="font-extrabold ${data.allotted ? 'text-emerald-400' : 'text-rose-400'}">${data.status_text}</div>
          <div>Shares Allotted: <strong>${data.shares_allotted}</strong></div>
        </div>
      `;
    } else {
      out.innerHTML = `<div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs">${data.error}</div>`;
    }
  } catch (err) {
    out.innerHTML = `<div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs">Error querying.</div>`;
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
