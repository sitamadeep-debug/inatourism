// Hybrid Edutourism Platform - Application Logic (Global Script Version with Localization, Supabase Sync & Google Maps Layer)

const POLYTECHNICS = window.POLYTECHNICS;
const CHECKLIST_TEMPLATES = window.CHECKLIST_TEMPLATES;
const COURSES = window.COURSES;

// Global Application State
const state = {
  activeRole: localStorage.getItem('edutour_role') || 'student', // 'student' | 'lecturer' | 'coordinator'
  activePoly: localStorage.getItem('edutour_poly') || 'nhi_bandung', // nhi_bandung, bali, etc.
  activeView: localStorage.getItem('edutour_view') || 'dashboard', // dashboard, classroom, explorer, activities, planner, analytics
  lang: localStorage.getItem('edutour_lang') || 'en', // 'en' | 'id'
  selectedDestId: null, // set dynamically based on active poly
  activeDestTab: 'info', // 'info' | 'activity' | 'comments'
  pathMode: true, // draw route lines
  audioPlaying: false,
  audioProgress: 0,
  audioInterval: null,
  panoOffset: 0,
  isWelcome: !localStorage.getItem('edutour_role'), // show welcome if no role chosen yet

  // Submissions and logs
  comments: JSON.parse(localStorage.getItem('edutour_comments')) || {},
  checklists: JSON.parse(localStorage.getItem('edutour_checklists')) || {},
  tasks: JSON.parse(localStorage.getItem('edutour_tasks')) || {}
};

// Translate helper
function t(key) {
  const dict = window.TRANSLATIONS[state.lang];
  return dict ? (dict[key] || key) : key;
}

// Localized object helper (reads properties containing { en, id })
function getLocalized(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[state.lang] || obj['en'] || '';
}

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function saveState() {
  localStorage.setItem('edutour_role', state.activeRole);
  localStorage.setItem('edutour_poly', state.activePoly);
  localStorage.setItem('edutour_view', state.activeView);
  localStorage.setItem('edutour_lang', state.lang);
  localStorage.setItem('edutour_comments', JSON.stringify(state.comments));
  localStorage.setItem('edutour_checklists', JSON.stringify(state.checklists));
  localStorage.setItem('edutour_tasks', JSON.stringify(state.tasks));
}

function initApp() {
  // Try initializing Supabase if credentials exist
  if (window.initSupabase) {
    window.initSupabase();
  }

  // Setup theme variables for body
  updateTheme(state.activePoly);

  // Set default selected destination for current poly
  const poly = POLYTECHNICS[state.activePoly];
  if (poly && poly.destinations.length > 0) {
    state.selectedDestId = poly.destinations[0].id;
  }

  // Pre-seed mock comments and submissions from data if empty
  Object.keys(POLYTECHNICS).forEach(key => {
    POLYTECHNICS[key].destinations.forEach(dest => {
      if (!state.comments[dest.id]) {
        state.comments[dest.id] = [...dest.comments];
      }
    });
  });

  // Render initial frame
  render();
}

function updateTheme(polyId) {
  const poly = POLYTECHNICS[polyId];
  if (!poly) return;
  const { theme } = poly;
  const root = document.documentElement;
  root.style.setProperty('--poly-primary', theme.primary);
  root.style.setProperty('--poly-secondary', theme.secondary);
  root.style.setProperty('--poly-accent', theme.accent);
  root.style.setProperty('--poly-bg-gradient', theme.bgGradient);
  root.style.setProperty('--poly-text-light', theme.textLight);
  root.style.setProperty('--poly-shadow', theme.shadow);
}

function render() {
  const container = document.getElementById('app');
  if (!container) return;

  if (state.isWelcome) {
    renderWelcomeScreen(container);
    return;
  }

  container.innerHTML = `
    <div class="app-container">
      <!-- Navbar -->
      <header class="navbar" id="navbar-view"></header>
      
      <!-- Tab Navigation -->
      <nav class="tabs-bar" id="tabs-view"></nav>

      <!-- Viewport -->
      <main class="content-viewport" id="content-view"></main>
    </div>
  `;

  renderNavbar();
  renderTabs();
  renderActiveView();
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// WELCOME SCREEN / LANDING PAGE
// -------------------------------------------------------------
function renderWelcomeScreen(container) {
  const isId = state.lang === 'id';
  const baliDests = (POLYTECHNICS.bali && POLYTECHNICS.bali.destinations) || [];

  const BALI_META = {
    bali_uluwatu: {
      location: "Badung, Bali",
      tag: isId ? "Seni Sakral & Ekologi Tebing" : "Sacred Arts & Coastal Ecology",
      focus: isId ? "Manajemen carrying capacity tebing 70m, habitat kera liar, dan pementasan sakral tari Kecak." : "Managing 70m cliff carrying capacity, macaque habitat, and sacred Kecak dance rituals."
    },
    bali_jatiluwih: {
      location: "Tabanan, Bali",
      tag: "UNESCO World Heritage Subak",
      focus: isId ? "Sistem irigasi koperasi tradisional Subak dan inovasi agrowisata berkelanjutan berbasis petani lokal." : "Traditional Subak cooperative irrigation and sustainable farmer-centered agritourism models."
    },
    bali_ulundanu: {
      location: "Bedugul, Tabanan",
      tag: isId ? "Geowisata & Suaka Hidrologis" : "Geotourism & Water Sanctum",
      focus: isId ? "Konservasi cekungan danau vulkanik kaldera dan perlindungan kualitas air danau suci dataran tinggi." : "Caldera lake basin conservation and microclimate protection for sacred highland water bodies."
    },
    bali_penglipuran: {
      location: "Bangli, Bali",
      tag: isId ? "Desa Wisata Terbersih (CBT)" : "World-Renowned Clean Eco-Village",
      focus: isId ? "Zonasi Tri Mandala, arsitektur bambu lestari, dan 100% kepemilikan pariwisata berbasis komunitas adat." : "Tri Mandala spatial balance, sustainable bamboo forestry, and 100% community-owned tourism."
    },
    bali_tanahlot: {
      location: "Tabanan, Bali",
      tag: isId ? "Dinamika Karang Samudra" : "Oceanic Rock Dynamics",
      focus: isId ? "Mitigasi geoteknik abrasi gelombang laut, zonasi keselamatan pasang, dan arus peziarah pura karang." : "Wave erosion mitigation on offshore sea cliffs and visitor tide safety zoning."
    },
    bali_tirtaempul: {
      location: "Gianyar, Bali",
      tag: isId ? "Mata Air Suci Kuno (962 M)" : "Ancient Sacred Springs (962 AD)",
      focus: isId ? "Konservasi akuifer mata air alami, etika ritual penyucian Melukat, dan perlindungan sakralitas budaya." : "Aquifer spring hydrology conservation, Melukat spiritual ethics, and cultural integrity."
    }
  };

  container.innerHTML = `
    <div class="welcome-screen animate-fade">
      
      <!-- 1. Floating Glass Navbar -->
      <nav class="landing-nav">
        <div class="landing-nav-brand" id="brand-scroll-top">
          <span class="landing-nav-logo">🌋</span>
          <div>
            <span class="landing-nav-title">INA-Edutour</span>
            <span class="landing-nav-subtitle">Politeknik Pariwisata Indonesia</span>
          </div>
        </div>

        <div class="landing-nav-links">
          <a class="landing-nav-link" href="#bali-showcase">${isId ? '🌴 Pesona Bali' : '🌴 Bali Showcase'}</a>
          <a class="landing-nav-link" href="#role-selection">${isId ? '🎓 Pilih Peran' : '🎓 Select Role'}</a>
          <a class="landing-nav-link" href="#campuses-selection">${isId ? '🏛️ Kampus' : '🏛️ Campuses'}</a>
          <a class="landing-nav-link" href="#methodology-section">${isId ? '📖 Metodologi' : '📖 Methodology'}</a>
        </div>

        <div class="landing-nav-actions">
          <div class="landing-lang-toggle">
            <button class="landing-lang-btn ${state.lang === 'en' ? 'active' : ''}" id="welcome-en-btn">EN</button>
            <button class="landing-lang-btn ${state.lang === 'id' ? 'active' : ''}" id="welcome-id-btn">ID</button>
          </div>
          <button class="landing-nav-cta" id="nav-direct-enter">
            ${isId ? 'Mulai Eksplorasi 🚀' : 'Start Explore 🚀'}
          </button>
        </div>
      </nav>

      <!-- 2. Hero Section with Rich Visuals & Stats -->
      <header class="landing-hero">
        <div class="landing-hero-content">
          <div class="landing-hero-badge">
            <span>✨</span> ${t('hero_badge')}
          </div>

          <h1>
            ${isId ? 'Transformasi Riset & Studi Pariwisata' : 'Transforming Field Tourism Research'} 
            <span class="landing-hero-gradient-text">${isId ? 'Hybrid Masa Depan' : 'Through Hybrid Learning'}</span>
          </h1>

          <p>${t('hero_sub')}</p>

          <div class="landing-hero-btns">
            <a href="#bali-showcase" class="hero-btn-primary">
              🌴 ${t('hero_explore_bali')}
            </a>
            <button class="hero-btn-secondary" id="hero-start-btn">
              🚀 ${t('hero_start_learning')}
            </button>
          </div>

          <!-- Quick Metrics Bar -->
          <div class="landing-stats-grid">
            <div class="landing-stat-item">
              <span class="landing-stat-num">6</span>
              <span class="landing-stat-label">${t('stat_campuses')}</span>
            </div>
            <div class="landing-stat-item">
              <span class="landing-stat-num">16+</span>
              <span class="landing-stat-label">${t('stat_destinations')}</span>
            </div>
            <div class="landing-stat-item">
              <span class="landing-stat-num">360°</span>
              <span class="landing-stat-label">${t('stat_360')}</span>
            </div>
            <div class="landing-stat-item">
              <span class="landing-stat-num">100%</span>
              <span class="landing-stat-label">${t('stat_sync')}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- 3. Featured Bali Edutourism Showcase -->
      <section class="landing-section" id="bali-showcase">
        <div class="landing-section-header">
          <span class="landing-section-pill">🌴 ${isId ? 'Edisi Spesial Poltekpar Bali' : 'Special Edition Poltekpar Bali'}</span>
          <h2>${t('bali_section_title')}</h2>
          <p>${t('bali_section_sub')}</p>
        </div>

        <div class="bali-dest-grid">
          ${baliDests.map(dest => {
            const meta = BALI_META[dest.id] || {
              location: "Bali, Indonesia",
              tag: "Edutourism Spot",
              focus: getLocalized(dest.description)
            };
            const desc = getLocalized(dest.description);

            return `
              <div class="bali-dest-card" data-dest-id="${dest.id}">
                <div class="bali-dest-img-wrap">
                  <img src="${dest.panorama}" alt="${dest.name}" class="bali-dest-img" loading="lazy" />
                  <span class="bali-dest-tag">${meta.tag}</span>
                  <span class="bali-dest-location">📍 ${meta.location}</span>
                </div>
                <div class="bali-dest-body">
                  <h3>${dest.name}</h3>
                  <p>${desc}</p>
                  
                  <div class="bali-dest-focus-box">
                    <strong>🎓 ${isId ? 'Fokus Studi' : 'Study Focus'}:</strong> ${meta.focus}
                  </div>

                  <button class="bali-dest-action-btn" data-dest-id="${dest.id}">
                    <span>${t('explore_dest_btn')}</span> →
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- 4. Interactive Role Selection -->
      <section class="landing-section" id="role-selection" style="background: #f1f5f9; max-width: 100%; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <div class="roles-wrapper">
          <div class="landing-section-header">
            <span class="landing-section-pill" style="background: #e0f2fe; color: #0369a1;">👥 ${isId ? 'Akses Pengguna' : 'User Access'}</span>
            <h2>${t('enter_role')}</h2>
            <p>${isId 
              ? 'Pilih peran akademis Anda untuk membuka dasbor interaktif, instrumen penilaian, dan materi studi.' 
              : 'Choose your academic role to access interactive dashboards, evaluation rubrics, and field materials.'}</p>
          </div>

          <div class="welcome-grid">
            <div class="welcome-card" data-role="student">
              <div class="welcome-card-icon">🎓</div>
              <h3>${t('student')}</h3>
              <p>${isId 
                ? 'Jelajahi peta interaktif, masuk ke tur virtual 360°, dengarkan narasi audio pemandu lapangan, dan kumpulkan jurnal refleksi.' 
                : 'Explore interactive map routes, access virtual 360° tours, listen to audio guides, and submit analytical field journals.'}</p>
              <span class="welcome-card-btn">${isId ? 'Masuk Sebagai Mahasiswa →' : 'Enter as Student →'}</span>
            </div>

            <div class="welcome-card" data-role="lecturer">
              <div class="welcome-card-icon">👨‍🏫</div>
              <h3>${t('lecturer')}</h3>
              <p>${isId 
                ? 'Fasilitasi ruang kelas virtual, pantau pengumpulan tugas lapangan, dan evaluasi hasil refleksi mahasiswa dengan rubrik terstandar.' 
                : 'Facilitate virtual classrooms, manage submissions, and grade student field reflection journals with rubrics.'}</p>
              <span class="welcome-card-btn">${isId ? 'Masuk Sebagai Dosen →' : 'Enter as Lecturer →'}</span>
            </div>

            <div class="welcome-card" data-role="coordinator">
              <div class="welcome-card-icon">📋</div>
              <h3>${t('coordinator')}</h3>
              <p>${isId 
                ? 'Kelola kesiapan tur 3-fase (perencanaan, teknologi, keberlanjutan), tautan live briefing, dan unduh data analitik riset.' 
                : 'Design 3-phase hybrid tour readiness, distribute live orientation briefings, and export academic research analytics.'}</p>
              <span class="welcome-card-btn">${isId ? 'Masuk Sebagai Koordinator →' : 'Enter as Coordinator →'}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. Indonesian Tourism Polytechnics Campuses -->
      <section class="landing-section" id="campuses-selection">
        <div class="landing-section-header">
          <span class="landing-section-pill" style="background: #ecfdf5; color: #047857;">🏛️ ${isId ? 'Ekosistem Poltekpar' : 'Polytechnics Network'}</span>
          <h2>${t('choose_poly')}</h2>
          <p>${isId 
            ? 'Didukung oleh Politeknik Pariwisata di bawah naungan Kementerian Pariwisata dan Ekonomi Kreatif RI.' 
            : 'Supported by Tourism Polytechnics under the Ministry of Tourism and Creative Economy of Indonesia.'}</p>
        </div>

        <div class="poly-selection-grid">
          ${Object.keys(POLYTECHNICS).map(key => {
            const poly = POLYTECHNICS[key];
            const isBali = key === 'bali';
            return `
              <div class="poly-badge-card ${state.activePoly === key ? 'active-border' : ''}" data-poly="${key}">
                ${isBali ? `<span class="poly-special-pill">🌟 ${t('featured_campus')}</span>` : ''}
                <div class="poly-badge-logo">${poly.logo}</div>
                <div class="poly-badge-info">
                  <h4>${poly.name}</h4>
                  <p>${poly.destinations.length} ${t('destinations')} • ${poly.resources.length} Handouts</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- 6. Integrated 3-Phase Methodology -->
      <section class="landing-section" id="methodology-section" style="background: #fafaf9; max-width: 100%; border-top: 1px solid #e7e5e4;">
        <div style="max-width: 1200px; margin: 0 auto;">
          <div class="landing-section-header">
            <span class="landing-section-pill" style="background: #fef3c7; color: #b45309;">⚙️ ${isId ? 'Alur Studi Terpadu' : 'Study Workflow'}</span>
            <h2>${t('method_title')}</h2>
            <p>${t('method_sub')}</p>
          </div>

          <div class="method-grid">
            <div class="method-card">
              <span class="method-step-num">01</span>
              <div class="method-card-icon">🌐</div>
              <h3>${t('phase_1_title')}</h3>
              <p>${t('phase_1_desc')}</p>
            </div>

            <div class="method-card">
              <span class="method-step-num">02</span>
              <div class="method-card-icon">📍</div>
              <h3>${t('phase_2_title')}</h3>
              <p>${t('phase_2_desc')}</p>
            </div>

            <div class="method-card">
              <span class="method-step-num">03</span>
              <div class="method-card-icon">📊</div>
              <h3>${t('phase_3_title')}</h3>
              <p>${t('phase_3_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 7. Footer -->
      <footer class="landing-footer">
        <div class="landing-footer-inner">
          <div class="landing-footer-brand">
            <span style="font-size: 2rem;">🌋</span>
            <div>
              <h4>INA-Edutour</h4>
              <p>${isId 
                ? 'Platform Edutourism Hybrid Politeknik Pariwisata Indonesia' 
                : 'Hybrid Edutourism Platform for Indonesian Tourism Polytechnics'}</p>
            </div>
          </div>

          <div class="landing-footer-status">
            <span class="landing-status-dot"></span>
            <span>⚡ Supabase Database Active & Synced</span>
          </div>

          <div style="font-size: 0.8rem; color: #64748b;">
            © 2026 INA-Edutour • Kemenparekraf RI
          </div>
        </div>
      </footer>

    </div>
  `;

  // EVENT LISTENERS

  // A. Role Cards Click -> Enters App with that Role
  container.querySelectorAll('.welcome-card').forEach(card => {
    card.addEventListener('click', () => {
      state.activeRole = card.dataset.role;
      state.isWelcome = false;
      saveState();
      initApp();
    });
  });

  // B. Bali Destination "Jelajahi 360°" Buttons -> Enters directly to Poltekpar Bali Explorer
  container.querySelectorAll('.bali-dest-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const destId = btn.dataset.destId;
      state.activePoly = 'bali';
      state.selectedDestId = destId;
      state.activeRole = state.activeRole || 'student';
      state.activeView = 'explorer';
      state.isWelcome = false;
      saveState();
      initApp();
    });
  });

  // C. Polytechnic Badges Click -> Selects Active Campus
  container.querySelectorAll('.poly-badge-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.poly-badge-card').forEach(c => c.classList.remove('active-border'));
      card.classList.add('active-border');
      state.activePoly = card.dataset.poly;
      updateTheme(state.activePoly);
      saveState();
    });
  });

  // D. Hero CTA Buttons
  const heroStartBtn = document.getElementById('hero-start-btn');
  if (heroStartBtn) {
    heroStartBtn.addEventListener('click', () => {
      state.activeRole = 'student';
      state.activePoly = 'bali';
      state.selectedDestId = 'bali_uluwatu';
      state.activeView = 'explorer';
      state.isWelcome = false;
      saveState();
      initApp();
    });
  }

  // E. Nav Direct Enter CTA
  const navDirectEnter = document.getElementById('nav-direct-enter');
  if (navDirectEnter) {
    navDirectEnter.addEventListener('click', () => {
      state.activeRole = state.activeRole || 'student';
      state.isWelcome = false;
      saveState();
      initApp();
    });
  }

  // F. Brand Scroll to Top
  const brandScroll = document.getElementById('brand-scroll-top');
  if (brandScroll) {
    brandScroll.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // G. Dual Language Toggle
  const enBtn = document.getElementById('welcome-en-btn');
  if (enBtn) {
    enBtn.addEventListener('click', () => {
      state.lang = 'en';
      saveState();
      renderWelcomeScreen(container);
    });
  }

  const idBtn = document.getElementById('welcome-id-btn');
  if (idBtn) {
    idBtn.addEventListener('click', () => {
      state.lang = 'id';
      saveState();
      renderWelcomeScreen(container);
    });
  }
}

// -------------------------------------------------------------
// NAVBAR & NAVIGATION TABS
// -------------------------------------------------------------
function renderNavbar() {
  const nav = document.getElementById('navbar-view');
  if (!nav) return;

  const poly = POLYTECHNICS[state.activePoly];
  const isSupabaseConnected = window.supabaseClient !== null;

  nav.innerHTML = `
    <div class="nav-brand" id="nav-brand-btn">
      <span class="nav-logo">${poly.logo}</span>
      <span class="nav-title">${t('welcome_title')}</span>
    </div>
    
    <div class="nav-controls">
      <div class="poly-indicator">
        <span>${poly.name}</span>
      </div>

      <select class="nav-select" id="poly-selector">
        ${Object.keys(POLYTECHNICS).map(key => `
          <option value="${key}" ${state.activePoly === key ? 'selected' : ''}>${POLYTECHNICS[key].name}</option>
        `).join('')}
      </select>

      <div class="role-tag-container">
        <button class="role-btn ${state.activeRole === 'student' ? 'active' : ''}" data-role="student">${t('student')}</button>
        <button class="role-btn ${state.activeRole === 'lecturer' ? 'active' : ''}" data-role="lecturer">${t('lecturer')}</button>
        <button class="role-btn ${state.activeRole === 'coordinator' ? 'active' : ''}" data-role="coordinator">${t('coordinator')}</button>
      </div>

      <!-- IN/EN Switcher -->
      <div class="role-tag-container" style="border-color: var(--poly-secondary);">
        <button class="role-btn ${state.lang === 'en' ? 'active' : ''}" id="lang-en-btn">EN</button>
        <button class="role-btn ${state.lang === 'id' ? 'active' : ''}" id="lang-id-btn">ID</button>
      </div>

      <!-- Supabase Setup Button -->
      <button class="role-btn" id="supabase-config-btn" style="background:${isSupabaseConnected ? '#10b981' : '#3b82f6'}; color:white; padding: 0.4rem 0.8rem;">
        ${isSupabaseConnected ? '⚡ Supabase (Live)' : '⚡ Supabase'}
      </button>

      <button class="role-btn" id="logout-btn" style="background:#e2e8f0; color:#475569; padding: 0.4rem 0.8rem;">${t('logout')}</button>
    </div>
  `;

  document.getElementById('supabase-config-btn').addEventListener('click', () => {
    const currentUrl = localStorage.getItem('supabase_url') || '';
    const currentKey = localStorage.getItem('supabase_anon_key') || '';
    
    const newUrl = prompt("Enter your Supabase Project URL (e.g. https://xyz.supabase.co):", currentUrl);
    if (newUrl === null) return;
    const newKey = prompt("Enter your Supabase Anon API Key:", currentKey);
    if (newKey === null) return;

    localStorage.setItem('supabase_url', newUrl.trim());
    localStorage.setItem('supabase_anon_key', newKey.trim());
    window.SUPABASE_CONFIG.url = newUrl.trim();
    window.SUPABASE_CONFIG.anonKey = newKey.trim();
    
    if (window.initSupabase && window.initSupabase()) {
      alert("✅ Supabase Database Connected Successfully!");
    } else {
      alert("ℹ️ Configuration saved. The app will continue using Local Storage until valid credentials are verified.");
    }
    render();
  });

  document.getElementById('nav-brand-btn').addEventListener('click', () => {
    state.isWelcome = true;
    saveState();
    render();
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    state.isWelcome = true;
    localStorage.removeItem('edutour_role');
    saveState();
    render();
  });

  document.getElementById('poly-selector').addEventListener('change', (e) => {
    state.activePoly = e.target.value;
    const newPoly = POLYTECHNICS[state.activePoly];
    if (newPoly && newPoly.destinations.length > 0) {
      state.selectedDestId = newPoly.destinations[0].id;
    }
    updateTheme(state.activePoly);
    saveState();
    render();
  });

  nav.querySelectorAll('.role-tag-container button[data-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeRole = btn.dataset.role;
      saveState();
      render();
    });
  });

  document.getElementById('lang-en-btn').addEventListener('click', () => {
    state.lang = 'en';
    saveState();
    render();
  });

  document.getElementById('lang-id-btn').addEventListener('click', () => {
    state.lang = 'id';
    saveState();
    render();
  });
}

function renderTabs() {
  const tabs = document.getElementById('tabs-view');
  if (!tabs) return;

  const links = [
    { view: 'dashboard', label: t('dashboard'), icon: '📊', roles: ['student', 'lecturer', 'coordinator'] },
    { view: 'explorer', label: t('explorer'), icon: '🗺️', roles: ['student', 'lecturer', 'coordinator'] },
    { view: 'classroom', label: t('classroom'), icon: '🏛️', roles: ['student', 'lecturer', 'coordinator'] },
    { view: 'activities', label: t('tasks'), icon: '📝', roles: ['student', 'lecturer'] },
    { view: 'planner', label: t('planner'), icon: '📋', roles: ['coordinator'] },
    { view: 'analytics', label: t('analytics'), icon: '📈', roles: ['lecturer', 'coordinator'] }
  ];

  tabs.innerHTML = links
    .filter(link => link.roles.includes(state.activeRole))
    .map(link => `
      <button class="tab-link ${state.activeView === link.view ? 'active' : ''}" data-view="${link.view}">
        <span>${link.icon}</span> ${link.label}
      </button>
    `).join('');

  tabs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeView = btn.dataset.view;
      saveState();
      render();
    });
  });
}

function renderActiveView() {
  const viewport = document.getElementById('content-view');
  if (!viewport) return;

  viewport.className = "content-viewport animate-fade";

  switch (state.activeView) {
    case 'dashboard':
      renderDashboard(viewport);
      break;
    case 'classroom':
      renderClassroom(viewport);
      break;
    case 'explorer':
      renderExplorer(viewport);
      break;
    case 'activities':
      renderActivities(viewport);
      break;
    case 'planner':
      renderPlanner(viewport);
      break;
    case 'analytics':
      renderAnalytics(viewport);
      break;
    default:
      viewport.innerHTML = `<h3>View not found</h3>`;
  }
}

// -------------------------------------------------------------
// VIEW 1: DASHBOARD
// -------------------------------------------------------------
function renderDashboard(container) {
  const poly = POLYTECHNICS[state.activePoly];
  const courses = COURSES[state.activePoly] || [];
  
  let roleWidgetHtml = '';

  if (state.activeRole === 'student') {
    roleWidgetHtml = `
      <div class="db-card">
        <h3>📖 ${t('active_courses')} (${courses.length})</h3>
        <div class="dashboard-list">
          ${courses.map(c => `
            <div class="list-item-card">
              <div class="lic-left">
                <div class="lic-icon">📚</div>
                <div class="lic-title">
                  <h4>${c.name} (${c.code})</h4>
                  <p>Study Tour: ${c.activeTour}</p>
                </div>
              </div>
              <button class="role-btn active" style="font-size:0.75rem;" onclick="document.querySelector('[data-view=classroom]').click()">${t('enter_class')}</button>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="db-card" style="margin-top: 1.5rem;">
        <h3>🔔 ${t('upcoming_briefings')}</h3>
        <div class="list-item-card" style="border-left: 4px solid var(--success);">
          <div class="lic-left">
            <div class="lic-icon" style="background:#dcfce7; color:#166534">📡</div>
            <div class="lic-title">
              <h4>${t('live_briefing_title')}</h4>
              <p>${t('live_briefing_sub')}</p>
            </div>
          </div>
          <button class="role-btn" style="background:var(--success); color:white; font-size:0.75rem;" onclick="document.querySelector('[data-view=classroom]').click()">${t('join_link')}</button>
        </div>
      </div>
    `;
  } else if (state.activeRole === 'lecturer') {
    const ungradedTasksCount = Object.keys(state.tasks).filter(k => state.tasks[k].status === 'submitted').length;
    roleWidgetHtml = `
      <div class="db-card">
        <h3>📋 ${t('grading_pipeline')}</h3>
        <div class="list-item-card">
          <div class="lic-left">
            <div class="lic-icon">✍️</div>
            <div class="lic-title">
              <h4>${t('pending_submissions')}</h4>
              <p>${state.lang === 'en' ? 'Students have uploaded field journals needing feedback' : 'Mahasiswa telah mengunggah jurnal lapangan yang memerlukan penilaian'}</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:1rem;">
            <span class="chk-category planning" style="font-size:0.85rem; padding: 0.3rem 0.6rem;">${ungradedTasksCount} ${t('ungraded')}</span>
            <button class="role-btn active" style="font-size:0.75rem;" onclick="document.querySelector('[data-view=activities]').click()">${t('go_grading')}</button>
          </div>
        </div>
      </div>

      <div class="db-card" style="margin-top: 1.5rem;">
        <h3>🎓 ${t('enrolled_classrooms')}</h3>
        <div class="dashboard-list">
          ${courses.map(c => `
            <div class="list-item-card">
              <div class="lic-left">
                <div class="lic-icon">👥</div>
                <div class="lic-title">
                  <h4>${c.name} [${c.code}]</h4>
                  <p>${c.students} Students • Active Path: ${c.activeTour}</p>
                </div>
              </div>
              <button class="role-btn active" style="font-size:0.75rem;" onclick="document.querySelector('[data-view=classroom]').click()">${t('manage')}</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (state.activeRole === 'coordinator') {
    const score = calculateTotalReadinessScore();
    roleWidgetHtml = `
      <div class="db-card">
        <h3>⚙️ ${t('readiness_title')}</h3>
        <div class="list-item-card" style="align-items: flex-start; flex-direction:column; gap:1.2rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
            <div>
              <h4 style="font-size:1.1rem; font-weight:700;">Active Tour: ${courses[0]?.activeTour || 'National Tour'}</h4>
              <p style="color:var(--text-muted); font-size:0.85rem;">${t('readiness_sub')}</p>
            </div>
            <span class="chk-category sustainability" style="font-size: 1.1rem; padding: 0.4rem 0.8rem;">Score: ${score}%</span>
          </div>
          
          <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow:hidden;">
            <div style="width: ${score}%; height: 100%; background: var(--success); transition: width 0.5s;"></div>
          </div>
          
          <button class="role-btn active" style="align-self: flex-end;" onclick="document.querySelector('[data-view=planner]').click()">${t('manage_readiness')}</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="db-left">
        <div class="welcome-widget">
          <h2>Selamat Datang di ${poly.name}!</h2>
          <p>${getLocalized(poly.description)}</p>
          <div style="margin-top: 1rem; font-size: 0.9rem; font-weight: 500;">
            ${t('logged_in_as')} <strong style="text-transform: capitalize; color: var(--poly-secondary); font-weight: 700;">${state.activeRole}</strong>
          </div>
        </div>
        
        ${roleWidgetHtml}
      </div>

      <div class="db-right">
        <div class="db-card" style="height:100%;">
          <h3>📍 ${t('destinations')}</h3>
          <div class="dashboard-list">
            ${poly.destinations.map(d => `
              <div class="list-item-card" style="flex-direction:column; align-items:flex-start; gap:0.5rem; cursor:pointer;" data-dest="${d.id}">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                  <h4 style="font-weight:700; color:var(--poly-primary);">${d.name}</h4>
                  <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${d.coords[0].toFixed(3)}, ${d.coords[1].toFixed(3)}</span>
                </div>
                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4;">${getLocalized(d.description)}</p>
                <div style="display:flex; justify-content:space-between; width:100%; margin-top:0.4rem; font-size:0.75rem;">
                  <span>💬 ${state.comments[d.id]?.length || 0} ${t('discussions')}</span>
                  <span style="color:var(--poly-secondary); font-weight:600;">${t('explore_virtual')} →</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-dest]').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedDestId = card.dataset.dest;
      state.activeView = 'explorer';
      saveState();
      render();
    });
  });
}

// -------------------------------------------------------------
// VIEW 2: STUDY-TOUR CLASSROOM
// -------------------------------------------------------------
function renderClassroom(container) {
  const poly = POLYTECHNICS[state.activePoly];

  container.innerHTML = `
    <div class="classroom-grid">
      <div class="class-left">
        <div class="live-link-banner">
          <div class="live-banner-info">
            <div style="display:flex; align-items:center;">
              <h3>${t('live_stream_title')}</h3>
              <span class="live-badge">🔴 LIVE</span>
            </div>
            <p style="opacity:0.9; font-size:0.85rem; margin-top: 0.25rem;">${t('live_stream_sub')}</p>
          </div>
          <button class="join-live-btn" id="join-stream-btn">${t('launch_stream')}</button>
        </div>

        <div class="db-card">
          <h3>💬 ${t('general_qa')}</h3>
          <div class="discussion-board">
            <div class="discussion-input-block">
              <div class="comment-avatar">${state.activeRole === 'student' ? 'S' : state.activeRole === 'lecturer' ? 'L' : 'C'}</div>
              <form class="comment-input-form" id="general-comment-form">
                <textarea class="comment-field" placeholder="${t('post_placeholder')}" required id="general-comment-text"></textarea>
                <button type="submit" class="comment-submit-btn">${t('post_btn')}</button>
              </form>
            </div>
            
            <div class="comments-list" id="general-comments-list"></div>
          </div>
        </div>
      </div>

      <div class="class-right">
        <div class="db-card">
          <h3>📂 ${t('handouts')}</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom: 1rem;">${t('handouts_sub')}</p>
          <div class="dashboard-list">
            ${poly.resources.map(res => `
              <div class="res-card">
                <div class="res-info">
                  <span class="res-badge">${res.type}</span>
                  <div>
                    <h5 style="font-size:0.85rem; font-weight:700;">${res.title}</h5>
                    <p style="font-size:0.7rem; color:var(--text-muted);">${res.size}</p>
                  </div>
                </div>
                <button class="download-btn" onclick="alert('Downloading: ${res.title}')">📥</button>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="db-card" style="margin-top: 1.5rem; background:#fffdf5; border-color:#fef3c7;">
          <h3 style="color:#b45309;">⚠️ ${t('emergency_contacts')}</h3>
          <p style="font-size:0.85rem; color:#b45309; line-height:1.5; margin-bottom:0.8rem;">
            ${t('emergency_sub')}
          </p>
          <div style="font-size:0.8rem; font-family:monospace; display:flex; flex-direction:column; gap:0.4rem; color:#78350f;">
            <div>🏥 ${t('medical_center')}: (022) 201-1528</div>
            <div>🚒 ${t('safety_patrol')}: (0361) 894-1181</div>
            <div>🚨 ${t('hotline_coord')}: +62 811-2244-8899</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('join-stream-btn').addEventListener('click', () => {
    window.open('https://zoom.us', '_blank');
  });

  const classCommentsKey = `${state.activePoly}_classroom_general`;
  if (!state.comments[classCommentsKey]) {
    state.comments[classCommentsKey] = [
      { author: "Kadek Aditya", role: "Student", text: "Has anyone successfully downloaded the Subak mapping handout? The link opens properly.", likes: 3, date: "Yesterday" },
      { author: "Dr. Sri Rahayu", role: "Lecturer", text: "Yes, Kadek. I have re-uploaded a compressed version. Make sure to download prior to field departure.", likes: 5, date: "Yesterday" }
    ];
    saveState();
  }

  const renderClassComments = () => {
    const list = document.getElementById('general-comments-list');
    if (!list) return;
    const cList = state.comments[classCommentsKey] || [];
    
    list.innerHTML = cList.map((c, idx) => `
      <div class="comment-node ${c.role === 'Lecturer' ? 'lecturer-reply' : ''}">
        <div class="comment-avatar" style="${c.role === 'Lecturer' ? 'background:var(--poly-secondary); color:#000;' : ''}">${c.author[0]}</div>
        <div class="comment-details">
          <div class="comment-meta">
            <span class="comment-author">${c.author}</span>
            <span class="comment-role-tag">${c.role === 'Lecturer' ? t('lecturer') : t('student')}</span>
            <span>• ${c.date}</span>
          </div>
          <div class="comment-text">${c.text}</div>
          <div class="comment-actions">
            <button class="comment-action-btn" data-idx="${idx}">👍 ${c.likes || 0} Likes</button>
          </div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.comment-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.idx;
        cList[idx].likes = (cList[idx].likes || 0) + 1;
        saveState();
        renderClassComments();
      });
    });
  };

  renderClassComments();

  document.getElementById('general-comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const textEl = document.getElementById('general-comment-text');
    const authorName = state.activeRole === 'student' ? 'Student Learner' : state.activeRole === 'lecturer' ? 'Lecturer Curation' : 'Coordinator Plan';
    const roleTag = state.activeRole === 'student' ? 'Student' : state.activeRole === 'lecturer' ? 'Lecturer' : 'Coordinator';
    const commentText = textEl.value;

    const newComment = {
      author: authorName,
      role: roleTag,
      text: commentText,
      likes: 0,
      date: "Just now"
    };

    state.comments[classCommentsKey].unshift(newComment);
    saveState();

    if (window.dbInsertComment) {
      await window.dbInsertComment(classCommentsKey, authorName, roleTag, commentText);
    }

    textEl.value = '';
    renderClassComments();
  });
}

// -------------------------------------------------------------
// VIEW 3: VIRTUAL TOUR & MAP EXPLORER (With Google Maps Layer)
// -------------------------------------------------------------
let mapInstance = null;

function renderExplorer(container) {
  const poly = POLYTECHNICS[state.activePoly];
  const activeDest = poly.destinations.find(d => d.id === state.selectedDestId) || poly.destinations[0];
  state.selectedDestId = activeDest.id;

  container.innerHTML = `
    <div class="map-explorer-layout">
      <div class="destinations-sidebar">
        <div class="sidebar-search">
          <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; display:flex; justify-content:space-between; align-items:center;">
            <span>📍 ${t('destinations')}</span>
            <button class="role-btn" id="toggle-path-btn" style="font-size:0.7rem; padding: 0.2rem 0.5rem; background:${state.pathMode ? 'var(--poly-secondary)' : '#cbd5e1'}; color:${state.pathMode ? '#000' : '#475569'}">
              ${t('route')}: ${state.pathMode ? 'ON' : 'OFF'}
            </button>
          </h3>
          <p style="font-size:0.75rem; color:var(--text-muted);">${state.lang === 'en' ? 'Explore route destinations in sequencing.' : 'Jelajahi destinasi rute secara berurutan.'}</p>
        </div>
        <div class="destinations-scroll" id="explorer-dest-list">
          ${poly.destinations.map((d, index) => `
            <div class="dest-card-small ${d.id === state.selectedDestId ? 'active' : ''}" data-id="${d.id}">
              <span class="tour-path-badge">${state.lang === 'en' ? 'Route Step' : 'Langkah Rute'} ${index + 1}</span>
              <h4 style="font-weight:700; color:var(--poly-primary); margin-top: 0.8rem;">${d.name}</h4>
              <p>${getLocalized(d.description)}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="map-center-panel">
        <div id="map-canvas" class="map-container"></div>
        <div class="map-controls-overlay">
          <span>🎯 Coordinates: </span>
          <span style="font-family:monospace; color:var(--poly-primary);" id="overlay-coords">
            ${activeDest.coords[0].toFixed(4)}, ${activeDest.coords[1].toFixed(4)}
          </span>
        </div>
      </div>

      <div class="details-sidebar">
        <div class="details-scroll" id="explorer-details-box"></div>
      </div>
    </div>
  `;

  document.getElementById('explorer-dest-list').querySelectorAll('[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedDestId = card.dataset.id;
      saveState();
      
      document.getElementById('explorer-dest-list').querySelectorAll('.dest-card-small').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      renderExplorerDetails();

      const dest = poly.destinations.find(d => d.id === state.selectedDestId);
      if (dest && mapInstance) {
        mapInstance.setView(dest.coords, 14);
        mapInstance.eachLayer(layer => {
          if (layer.options && layer.options.title === dest.name) {
            layer.openPopup();
          }
        });
      }
    });
  });

  document.getElementById('toggle-path-btn').addEventListener('click', () => {
    state.pathMode = !state.pathMode;
    saveState();
    renderExplorer(container);
  });

  renderExplorerDetails();

  setTimeout(() => {
    initLeafletMap();
  }, 100);
}

function initLeafletMap() {
  const poly = POLYTECHNICS[state.activePoly];
  const activeDest = poly.destinations.find(d => d.id === state.selectedDestId) || poly.destinations[0];

  const mapContainer = document.getElementById('map-canvas');
  if (!mapContainer) return;

  if (typeof L === 'undefined') {
    mapContainer.innerHTML = `<div style="padding:2rem; text-align:center;">Leaflet Map Library Failed to Load from CDN. Make sure you are online.</div>`;
    return;
  }

  // Initialize Map
  mapInstance = L.map('map-canvas').setView(activeDest.coords, 13);

  // --- GOOGLE MAPS TILE LAYERS (High Quality, Clean, No Watermarks) ---
  const googleStreets = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>'
  });

  const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps Satellite</a>'
  });

  const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  // Default to Google Maps Roadmap
  googleStreets.addTo(mapInstance);

  // Layer control switcher widget
  const baseMaps = {
    "🗺️ Google Maps": googleStreets,
    "🛰️ Google Satellite": googleSatellite,
    "🌐 OpenStreetMap": openStreetMap
  };
  L.control.layers(baseMaps, null, { position: 'topright' }).addTo(mapInstance);

  const markers = [];
  poly.destinations.forEach((d, idx) => {
    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="
          width: 34px; 
          height: 34px; 
          background: var(--poly-bg-gradient); 
          border: 3px solid white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          font-weight: 800; 
          font-size: 0.85rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        ">
          ${idx + 1}
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker(d.coords, { icon: customIcon, title: d.name })
      .bindPopup(`
        <div style="font-family:'Inter', sans-serif;">
          <h4 style="margin:0; font-size:0.95rem; color:var(--poly-primary); font-weight:700;">${d.name}</h4>
          <p style="margin:0.25rem 0 0; font-size:0.75rem; color:#64748b;">${state.lang === 'en' ? 'Route Step' : 'Langkah Rute'} ${idx + 1}</p>
        </div>
      `)
      .addTo(mapInstance);

    markers.push(marker);

    marker.on('click', () => {
      state.selectedDestId = d.id;
      saveState();

      const sidebarCards = document.getElementById('explorer-dest-list');
      if (sidebarCards) {
        sidebarCards.querySelectorAll('.dest-card-small').forEach(c => c.classList.remove('active'));
        const card = sidebarCards.querySelector(`[data-id="${d.id}"]`);
        if (card) card.classList.add('active');
      }

      renderExplorerDetails();
    });
  });

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    mapInstance.fitBounds(group.getBounds().pad(0.2));
  }

  if (state.pathMode && poly.destinations.length > 1) {
    const pathCoords = poly.destinations.map(d => d.coords);
    L.polyline(pathCoords, {
      color: 'var(--poly-primary)',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8',
      lineJoin: 'round'
    }).addTo(mapInstance);
  }

  markers.find(m => m.options.title === activeDest.name)?.openPopup();
}

function renderExplorerDetails() {
  const detailsBox = document.getElementById('explorer-details-box');
  if (!detailsBox) return;

  const poly = POLYTECHNICS[state.activePoly];
  const activeDest = poly.destinations.find(d => d.id === state.selectedDestId) || poly.destinations[0];

  const coordsLabel = document.getElementById('overlay-coords');
  if (coordsLabel) {
    coordsLabel.textContent = `${activeDest.coords[0].toFixed(4)}, ${activeDest.coords[1].toFixed(4)}`;
  }

  detailsBox.innerHTML = `
    <div class="detail-header">
      <h2>${activeDest.name}</h2>
      <span class="detail-coords">Latitude: ${activeDest.coords[0]} | Longitude: ${activeDest.coords[1]}</span>
    </div>

    <div>
      <h3 style="font-size:1.05rem; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">🕶️ ${t('explore_virtual')}</h3>
      <div class="panorama-wrapper" id="pano-viewframe">
        <div class="panorama-canvas-sim" id="pano-scene" style="background-image: url('${activeDest.panorama}'); transform: translateX(${state.panoOffset}px);"></div>
        <div class="panorama-overlay"></div>
        <div class="pano-badge">${t('panoramic_view')}</div>
        
        <button style="
          position: absolute; 
          top: 45%; 
          left: 55%; 
          transform: translate(-50%, -50%);
          width: 38px; 
          height: 38px; 
          background: rgba(212,175,55,0.85); 
          border: 3px solid white; 
          color: black; 
          font-weight: bold; 
          border-radius: 50%; 
          cursor: pointer; 
          animation: pulseScale 2s infinite; 
          z-index: 10;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        " id="pano-hotspot-btn">ℹ️</button>
        
        <div class="pano-controls">
          <button class="pano-btn" id="pano-left-btn">◀</button>
          <button class="pano-btn" id="pano-right-btn">▶</button>
          <button class="pano-btn" id="pano-zoom-btn">🔍</button>
        </div>
      </div>
      <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem; text-align:center;">
        🖱️ ${t('drag_instructions')}
      </p>
    </div>

    <div class="audio-player-card">
      <div class="ap-row">
        <button class="ap-play-btn" id="audio-play-btn">
          ${state.audioPlaying ? '⏸' : '▶'}
        </button>
        <div style="flex:1;">
          <h5 style="font-size:0.85rem; font-weight:700;">${t('audio_guide')}</h5>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.15rem;">
            <div class="ap-progress-bar" id="audio-scrub-bar">
              <div class="ap-progress-fill" style="width: ${state.audioProgress}%"></div>
            </div>
            <span class="ap-time">${state.audioPlaying ? t('playing') : activeDest.duration}</span>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="info-tab-buttons">
        <button class="info-tab-btn ${state.activeDestTab === 'info' ? 'active' : ''}" data-tab="info">${t('educational_info')}</button>
        <button class="info-tab-btn ${state.activeDestTab === 'activity' ? 'active' : ''}" data-tab="activity">${t('field_task')}</button>
        <button class="info-tab-btn ${state.activeDestTab === 'comments' ? 'active' : ''}" data-tab="comments">${t('local_board')} (${state.comments[activeDest.id]?.length || 0})</button>
      </div>

      <div class="info-tab-content">
        ${renderDestTabContent(activeDest)}
      </div>
    </div>
  `;

  const panoFrame = document.getElementById('pano-viewframe');
  const panoScene = document.getElementById('pano-scene');
  let isDragging = false;
  let startX = 0;

  if (panoFrame && panoScene) {
    panoFrame.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - state.panoOffset;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    panoFrame.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      state.panoOffset = e.clientX - startX;
      if (state.panoOffset > 0) state.panoOffset = -800;
      if (state.panoOffset < -800) state.panoOffset = 0;
      panoScene.style.transform = `translateX(${state.panoOffset}px)`;
    });

    document.getElementById('pano-left-btn').addEventListener('click', () => {
      state.panoOffset += 80;
      if (state.panoOffset > 0) state.panoOffset = -800;
      panoScene.style.transform = `translateX(${state.panoOffset}px)`;
    });

    document.getElementById('pano-right-btn').addEventListener('click', () => {
      state.panoOffset -= 80;
      if (state.panoOffset < -800) state.panoOffset = 0;
      panoScene.style.transform = `translateX(${state.panoOffset}px)`;
    });

    document.getElementById('pano-zoom-btn').addEventListener('click', () => {
      alert("Virtual Zoom initialized: Lenses calibrated for VR display mode.");
    });

    document.getElementById('pano-hotspot-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      alert(`[Educational Hotspot] Welcome to ${activeDest.name}. Explore the visual architecture, flora, and community stalls located in this sector!`);
    });
  }

  const audioBtn = document.getElementById('audio-play-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      state.audioPlaying = !state.audioPlaying;
      saveState();

      if (state.audioPlaying) {
        audioBtn.textContent = '⏸';
        state.audioInterval = setInterval(() => {
          state.audioProgress += 2;
          if (state.audioProgress > 100) {
            state.audioProgress = 0;
            state.audioPlaying = false;
            clearInterval(state.audioInterval);
            saveState();
            renderExplorerDetails();
          } else {
            const fill = document.querySelector('.ap-progress-fill');
            if (fill) fill.style.width = `${state.audioProgress}%`;
          }
        }, 300);
      } else {
        audioBtn.textContent = '▶';
        clearInterval(state.audioInterval);
      }
    });
  }

  detailsBox.querySelectorAll('.info-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeDestTab = btn.dataset.tab;
      saveState();
      renderExplorerDetails();
    });
  });

  bindDestTabHandlers(activeDest);
}

function renderDestTabContent(dest) {
  if (state.activeDestTab === 'info') {
    return `
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        <div>
          <strong style="color:var(--poly-accent); font-weight:700;">🏨 ${t('tourism_hospitality')}:</strong>
          <p>${getLocalized(dest.educationalInfo.tourism)}</p>
        </div>
        <div>
          <strong style="color:var(--poly-accent); font-weight:700;">📘 ${t('educational_focus')}:</strong>
          <p>${getLocalized(dest.educationalInfo.education)}</p>
        </div>
        <div>
          <strong style="color:var(--poly-accent); font-weight:700;">👥 ${t('community_eco')}:</strong>
          <p>${getLocalized(dest.educationalInfo.community)}</p>
        </div>
      </div>
    `;
  } else if (state.activeDestTab === 'activity') {
    const tItem = dest.task;
    const submission = state.tasks[tItem.id];

    if (state.activeRole === 'student') {
      if (submission && submission.status === 'graded') {
        return `
          <div class="activity-badge" style="background:#dcfce7; color:#15803d; margin-bottom:0.5rem;">✅ ${t('graded').toUpperCase()}: ${submission.grade}/100</div>
          <p style="font-weight:600; margin-bottom:0.4rem;">${t('reflection_journal')}</p>
          <blockquote style="font-style:italic; background:#f8fafc; padding:0.6rem; border-left:3px solid var(--poly-secondary); font-size:0.85rem; margin-bottom:0.8rem;">
            "${submission.text}"
          </blockquote>
          <div style="background:#fffdf5; padding:0.6rem; border:1px solid #fef3c7; border-radius:4px; font-size:0.85rem;">
            <strong>${t('feedback')}</strong>
            <p style="margin-top:0.25rem;">"${submission.feedback || 'Excellent field notes, well structured.'}"</p>
          </div>
        `;
      }

      if (submission && submission.status === 'submitted') {
        return `
          <div class="activity-badge" style="background:#fef3c7; color:#b45309; margin-bottom:0.5rem;">⏳ ${t('pending_eval')}</div>
          <p style="font-size:0.85rem; color:var(--text-muted);">${t('pending_eval_sub')}</p>
          <blockquote style="font-style:italic; background:#f8fafc; padding:0.6rem; font-size:0.85rem; margin-top:0.5rem; border-left:3px solid var(--border-color);">
            "${submission.text}"
          </blockquote>
        `;
      }

      return `
        <div class="activity-box">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="activity-badge">${t('task_reflection')}</span>
          </div>
          <p style="font-weight:700; font-size:0.9rem;">${getLocalized(tItem.title)}</p>
          <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.4;">${getLocalized(tItem.question)}</p>
          
          <form id="task-submission-form" style="display:flex; flex-direction:column; gap:0.6rem; margin-top:0.4rem;">
            <textarea id="task-text-input" placeholder="${t('submit_instructions')}" required rows="4"></textarea>
            
            <div class="upload-box" id="task-upload-box">
              <span id="upload-label">📷 ${t('mock_upload')}</span>
            </div>
            
            <button type="submit" class="comment-submit-btn" style="width:100%; height:38px;">${t('submit_assignment')}</button>
          </form>
        </div>
      `;
    } else {
      if (submission) {
        if (submission.status === 'graded') {
          return `
            <div class="activity-badge" style="background:#dcfce7; color:#15803d; margin-bottom:0.5rem;">${t('graded').toUpperCase()}: ${submission.grade}/100</div>
            <p>Student: <strong>Budi Santoso</strong></p>
            <blockquote style="font-style:italic; background:#f8fafc; padding:0.6rem; font-size:0.85rem; margin: 0.5rem 0;">
              "${submission.text}"
            </blockquote>
            <p style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">${t('feedback')} "${submission.feedback}"</p>
          `;
        }

        return `
          <div class="activity-box">
            <span class="activity-badge" style="background:#fee2e2; color:#b91c1c;">${t('needs_grading')}</span>
            <p>Student: <strong>Budi Santoso</strong></p>
            <blockquote style="font-style:italic; background:white; border:1px solid var(--border-color); padding:0.6rem; font-size:0.85rem; margin:0.5rem 0;">
              "${submission.text}"
            </blockquote>
            
            <form id="grading-submission-form" style="display:flex; flex-direction:column; gap:0.6rem;">
              <div class="grading-panel">
                <h5 style="margin-bottom:0.5rem;">${t('rubrics_eval')}</h5>
                ${tItem.rubric.map((r, rIdx) => `
                  <div class="rubric-row">
                    <label>${r}</label>
                    <div class="rubric-slider-box">
                      <input type="range" class="rubric-slider" min="50" max="100" value="85" data-rubric-idx="${rIdx}">
                      <span class="rubric-val">85</span>
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <textarea id="grading-feedback-text" placeholder="${t('general_feedback_placeholder')}" rows="2"></textarea>
              
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.4rem;">
                <strong>${t('average_score')}: <span id="avg-grade-display">85</span>/100</strong>
                <button type="submit" class="comment-submit-btn" style="height:36px;">${t('submit_grade')}</button>
              </div>
            </form>
          </div>
        `;
      }

      return `
        <div class="activity-box" style="text-align:center;">
          <p style="font-size:0.85rem; color:var(--text-muted);">${t('no_submissions')}</p>
          <button class="role-btn active" style="margin-top:0.5rem; font-size:0.75rem;" id="mock-student-submit-btn">${t('simulate_submit')}</button>
        </div>
      `;
    }
  } else if (state.activeDestTab === 'comments') {
    const commentsList = state.comments[dest.id] || [];

    return `
      <div class="discussion-board">
        <div class="discussion-input-block">
          <div class="comment-avatar">${state.activeRole === 'student' ? 'S' : 'L'}</div>
          <form class="comment-input-form" id="dest-comment-form">
            <textarea class="comment-field" placeholder="${state.lang === 'en' ? 'Ask a question about this location...' : 'Tanyakan sesuatu tentang lokasi ini...'}" required id="dest-comment-text"></textarea>
            <button type="submit" class="comment-submit-btn">${state.lang === 'en' ? 'Send' : 'Kirim'}</button>
          </form>
        </div>

        <div class="comments-list">
          ${commentsList.length === 0 ? `
            <p style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:1rem 0;">${t('no_comments')}</p>
          ` : commentsList.map((c, idx) => `
            <div class="comment-node ${c.role === 'Lecturer' ? 'lecturer-reply' : ''}">
              <div class="comment-avatar" style="${c.role === 'Lecturer' ? 'background:var(--poly-secondary); color:#000;' : ''}">${c.author[0]}</div>
              <div class="comment-details">
                <div class="comment-meta">
                  <span class="comment-author">${c.author}</span>
                  <span class="comment-role-tag">${c.role === 'Lecturer' ? t('lecturer') : t('student')}</span>
                  <span>• ${c.date}</span>
                </div>
                <div class="comment-text">${c.text}</div>
                <div class="comment-actions">
                  <button class="comment-action-btn" data-dest-comment-idx="${idx}">👍 ${c.likes || 0} Likes</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

function bindDestTabHandlers(dest) {
  if (state.activeDestTab === 'activity') {
    const tItem = dest.task;

    const submitForm = document.getElementById('task-submission-form');
    if (submitForm) {
      const uploadBox = document.getElementById('task-upload-box');
      if (uploadBox) {
        uploadBox.addEventListener('click', () => {
          const lbl = document.getElementById('upload-label');
          lbl.textContent = state.lang === 'en' 
            ? "📸 File Attachment: field_observation_image.jpg (Loaded successfully)"
            : "📸 Lampiran File: gambar_observasi_lapangan.jpg (Berhasil dimuat)";
          uploadBox.style.borderColor = "var(--success)";
          uploadBox.style.background = "#f0fdf4";
        });
      }

      submitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textVal = document.getElementById('task-text-input').value;
        const taskPayload = {
          status: 'submitted',
          text: textVal,
          grade: null,
          feedback: null
        };
        state.tasks[tItem.id] = taskPayload;
        saveState();

        if (window.dbSaveTask) {
          await window.dbSaveTask(tItem.id, "Student Learner", "submitted", textVal);
        }

        renderExplorerDetails();
      });
    }

    const gradingForm = document.getElementById('grading-submission-form');
    if (gradingForm) {
      const sliders = gradingForm.querySelectorAll('.rubric-slider');
      const avgDisplay = document.getElementById('avg-grade-display');

      const updateAvg = () => {
        let total = 0;
        sliders.forEach(slider => {
          const valLabel = slider.nextElementSibling;
          valLabel.textContent = slider.value;
          total += parseInt(slider.value);
        });
        const avg = Math.round(total / sliders.length);
        avgDisplay.textContent = avg;
      };

      sliders.forEach(slider => {
        slider.addEventListener('input', updateAvg);
      });

      gradingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const finalGrade = parseInt(avgDisplay.textContent);
        const fbText = document.getElementById('grading-feedback-text').value || "Completed successfully.";

        state.tasks[tItem.id].status = 'graded';
        state.tasks[tItem.id].grade = finalGrade;
        state.tasks[tItem.id].feedback = fbText;

        saveState();

        if (window.dbSaveTask) {
          await window.dbSaveTask(tItem.id, "Student Learner", "graded", state.tasks[tItem.id].text, finalGrade, fbText);
        }

        renderExplorerDetails();
      });
    }

    const simBtn = document.getElementById('mock-student-submit-btn');
    if (simBtn) {
      simBtn.addEventListener('click', async () => {
        const textVal = `My analysis of ${dest.name} shows strong alignment with regional ecotourism standards, though carrying capacities could be improved to limit structural erosion.`;
        state.tasks[tItem.id] = {
          status: 'submitted',
          text: textVal,
          grade: null,
          feedback: null
        };
        saveState();

        if (window.dbSaveTask) {
          await window.dbSaveTask(tItem.id, "Student Learner", "submitted", textVal);
        }

        renderExplorerDetails();
      });
    }
  } else if (state.activeDestTab === 'comments') {
    const comForm = document.getElementById('dest-comment-form');
    if (comForm) {
      comForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textEl = document.getElementById('dest-comment-text');
        const authorName = state.activeRole === 'student' ? 'Tourism Student' : 'Lecturer Curator';
        const roleTag = state.activeRole === 'student' ? 'Student' : 'Lecturer';
        const commentText = textEl.value;

        const newCom = {
          author: authorName,
          role: roleTag,
          text: commentText,
          likes: 0,
          date: "Just now"
        };
        state.comments[dest.id].unshift(newCom);
        saveState();

        if (window.dbInsertComment) {
          await window.dbInsertComment(dest.id, authorName, roleTag, commentText);
        }

        renderExplorerDetails();
      });
    }

    const detailsBox = document.getElementById('explorer-details-box');
    detailsBox.querySelectorAll('[data-dest-comment-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.destCommentIdx;
        state.comments[dest.id][idx].likes = (state.comments[dest.id][idx].likes || 0) + 1;
        saveState();
        renderExplorerDetails();
      });
    });
  }
}

// -------------------------------------------------------------
// VIEW 4: LEARNING ACTIVITIES
// -------------------------------------------------------------
function renderActivities(container) {
  const poly = POLYTECHNICS[state.activePoly];
  
  if (state.activeRole === 'student') {
    container.innerHTML = `
      <div style="max-width:800px; margin:0 auto;">
        <h2 style="font-size:1.8rem; margin-bottom:0.5rem;">📝 ${t('tasks')}</h2>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">${state.lang === 'en' ? 'Review tasks associated with destination explorer coordinates.' : 'Tinjau tugas-tugas yang terkait dengan koordinat destinasi.'}</p>
        
        <div style="display:flex; flex-direction:column; gap:1.2rem;">
          ${poly.destinations.map(d => {
            const tItem = d.task;
            const sub = state.tasks[tItem.id];
            let statusBadge = `<span class="chk-category planning">${state.lang === 'en' ? 'Not Started' : 'Belum Mulai'}</span>`;
            if (sub?.status === 'submitted') statusBadge = `<span class="chk-category technology">${state.lang === 'en' ? 'Submitted' : 'Terkumpul'}</span>`;
            if (sub?.status === 'graded') statusBadge = `<span class="chk-category sustainability">${t('graded')}: ${sub.grade}/100</span>`;
            
            return `
              <div class="db-card" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <h4 style="font-size:1.1rem; color:var(--poly-primary);">${getLocalized(tItem.title)}</h4>
                    ${statusBadge}
                  </div>
                  <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">Destination: ${d.name}</p>
                  <p style="font-size:0.88rem; margin-top:0.5rem; line-height:1.4;">${getLocalized(tItem.question)}</p>
                </div>
                <button class="role-btn active" style="white-space:nowrap; margin-left:1.5rem;" onclick="state.selectedDestId='${d.id}'; state.activeDestTab='activity'; state.activeView='explorer'; saveState(); render();">
                  ${state.lang === 'en' ? 'Open Task' : 'Buka Tugas'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else {
    const submissions = [];
    poly.destinations.forEach(d => {
      const tItem = d.task;
      const sub = state.tasks[tItem.id];
      if (sub) {
        submissions.push({ dest: d, task: tItem, submission: sub });
      }
    });

    container.innerHTML = `
      <div style="max-width:850px; margin:0 auto;">
        <h2 style="font-size:1.8rem; margin-bottom:0.5rem;">👨‍🏫 ${t('student_submissions_panel')}</h2>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">${state.lang === 'en' ? 'Review, evaluate, and provide rubric-based grades to submitted reflections.' : 'Tinjau, evaluasi, dan berikan nilai berbasis rubrik pada refleksi yang dikirimkan.'}</p>
        
        <div style="display:flex; flex-direction:column; gap:1.2rem;">
          ${submissions.length === 0 ? `
            <div class="db-card" style="text-align:center; padding:3rem;">
              <div style="font-size:3rem; margin-bottom:1rem;">📬</div>
              <h4>No Submissions Yet</h4>
              <p style="color:var(--text-muted); font-size:0.9rem;">Once students submit reflections in the map explorer, they will appear here.</p>
              <button class="role-btn active" style="margin-top:1rem;" onclick="state.activeView='explorer'; state.activeDestTab='activity'; saveState(); render();">Go to Explorer</button>
            </div>
          ` : submissions.map(subItem => {
            const isGraded = subItem.submission.status === 'graded';
            return `
              <div class="db-card" style="border-left: 5px solid ${isGraded ? 'var(--success)' : 'var(--warning)'}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h4 style="font-size:1.1rem; color:var(--poly-primary);">${getLocalized(subItem.task.title)}</h4>
                    <p style="font-size:0.75rem; color:var(--text-muted);">Destination: ${subItem.dest.name} • Student: Budi Santoso</p>
                  </div>
                  <span class="chk-category ${isGraded ? 'sustainability' : 'technology'}">
                    ${isGraded ? `${t('graded')}: ${subItem.submission.grade}/100` : t('needs_grading')}
                  </span>
                </div>
                
                <blockquote style="font-style:italic; background:#f8fafc; padding:0.6rem; font-size:0.88rem; margin:1rem 0; border-left:3px solid var(--border-color);">
                  "${subItem.submission.text}"
                </blockquote>

                <div style="display:flex; justify-content:flex-end;">
                  <button class="role-btn active" onclick="state.selectedDestId='${subItem.dest.id}'; state.activeDestTab='activity'; state.activeView='explorer'; saveState(); render();">
                    ${isGraded ? t('review_feedback') : t('open_grading_rubric')}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

// -------------------------------------------------------------
// VIEW 5: TOUR PLANNER
// -------------------------------------------------------------
function calculateTotalReadinessScore() {
  let score = 0;
  let totalWeight = 0;
  
  Object.keys(CHECKLIST_TEMPLATES).forEach(phaseKey => {
    const list = CHECKLIST_TEMPLATES[phaseKey];
    const checked = state.checklists[phaseKey] || [];
    
    list.forEach(item => {
      totalWeight += item.weight;
      if (checked.includes(item.id)) {
        score += item.weight;
      }
    });
  });

  return totalWeight === 0 ? 0 : Math.round((score / totalWeight) * 100);
}

function renderPlanner(container) {
  const score = calculateTotalReadinessScore();
  let recommendation = "";
  if (score < 50) recommendation = state.lang === 'en' ? "⚠️ Critical: Heavy gaps in planning. Secure institutional permissions and tech contingencies." : "⚠️ Kritis: Kesenjangan besar dalam perencanaan. Amankan izin institusi dan rencana teknologi cadangan.";
  else if (score < 80) recommendation = state.lang === 'en' ? "💡 Fair: Operational. Complete community briefing and safety reviews to lock off stage." : "💡 Cukup: Operasional. Lengkapi pengarahan komunitas dan tinjauan keselamatan untuk mengunci tahap.";
  else recommendation = state.lang === 'en' ? "🌟 Excellent: Fully prepared. Edutourism platform ready to initiate hybrid streams." : "🌟 Luar Biasa: Siap sepenuhnya. Platform edutourism siap memulai siaran hybrid.";

  container.innerHTML = `
    <div style="max-width:1200px; margin:0 auto; display:grid; grid-template-columns: 2fr 1fr; gap:1.5rem;">
      <div class="planner-left">
        <h2 style="font-size:1.8rem; margin-bottom:0.5rem;">📋 ${t('planner')}</h2>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">${t('planning_outlines')}</p>

        <div class="planner-sections-container">
          ${renderPlannerPhase('virtual_prep', state.lang === 'en' ? 'Phase 1: Virtual Preparation & Classroom Pre-Tour' : 'Fase 1: Persiapan Virtual & Pra-Tur Kelas')}
          ${renderPlannerPhase('physical_tour', state.lang === 'en' ? 'Phase 2: On-Site Physical Study Tour' : 'Fase 2: Tur Studi Fisik di Lokasi')}
          ${renderPlannerPhase('virtual_reflection', state.lang === 'en' ? 'Phase 3: Virtual Reflection & Debriefing' : 'Fase 3: Refleksi Virtual & Tanya Jawab')}
        </div>
      </div>

      <div class="planner-right">
        <div class="readiness-score-widget">
          <h3>${t('ready_score_title')}</h3>
          <div class="score-gauge-ring">
            <svg style="position:absolute; width:100%; height:100%; transform: rotate(-90deg);">
              <circle cx="70" cy="70" r="55" fill="transparent" stroke="#f1f5f9" stroke-width="10"></circle>
              <circle cx="70" cy="70" r="55" fill="transparent" stroke="var(--poly-primary)" stroke-width="10" 
                      stroke-dasharray="345" stroke-dashoffset="${345 - (345 * score) / 100}" stroke-linecap="round" style="transition: stroke-dashoffset 0.5s;"></circle>
            </svg>
            <div class="score-gauge-text">${score}%</div>
          </div>
          <p class="gauge-description">${recommendation}</p>
        </div>

        <div class="db-card" style="margin-top: 1.5rem;">
          <h3>ℹ️ ${t('ready_score_title')} Framework</h3>
          <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5;">${t('ready_score_sub')}</p>
          <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.8rem; font-size:0.8rem; font-weight:600;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="chk-category planning">${t('ready_score_planning')}</span> Risk, insurance, permits
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="chk-category technology">${t('ready_score_tech')}</span> Connectivity, device tests
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="chk-category sustainability">${t('ready_score_sustainability')}</span> CBT, zero-waste compliance
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.checklist-item').forEach(item => {
    item.addEventListener('click', () => {
      const phase = item.dataset.phase;
      const id = item.dataset.id;
      
      if (!state.checklists[phase]) {
        state.checklists[phase] = [];
      }

      const idx = state.checklists[phase].indexOf(id);
      if (idx > -1) {
        state.checklists[phase].splice(idx, 1);
      } else {
        state.checklists[phase].push(id);
      }

      saveState();
      renderPlanner(container);
    });
  });
}

function renderPlannerPhase(phaseKey, phaseTitle) {
  const items = CHECKLIST_TEMPLATES[phaseKey];
  const checked = state.checklists[phaseKey] || [];
  const pct = items.length === 0 ? 0 : Math.round((checked.length / items.length) * 100);

  return `
    <div class="phase-card">
      <div class="phase-header">
        <h3>${phaseTitle}</h3>
        <span class="phase-progress-capsule">${pct}% ${t('complete')}</span>
      </div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; margin-bottom:1rem;">
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.2rem;">${t('target_date')}</label>
          <input type="date" value="2026-08-25" style="width:100%; border:1px solid var(--border-color); border-radius:4px; padding:0.4rem;">
        </div>
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.2rem;">${t('learning_outcomes')}</label>
          <input type="text" value="${state.lang === 'en' ? 'Evaluate community-based economic impact loops' : 'Evaluasi siklus dampak ekonomi berbasis masyarakat'}" style="width:100%; border:1px solid var(--border-color); border-radius:4px; padding:0.4rem;">
        </div>
      </div>

      <div class="checklist-box">
        ${items.map(item => {
          const isChecked = checked.includes(item.id);
          return `
            <div class="checklist-item ${isChecked ? 'checked' : ''}" data-phase="${phaseKey}" data-id="${item.id}">
              <div class="checkbox-custom"></div>
              <span style="flex:1; font-size:0.88rem;">${getLocalized(item.text)}</span>
              <span class="chk-category ${item.category}">${t('ready_score_' + item.category)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// VIEW 6: ANALYTICS
// -------------------------------------------------------------
function renderAnalytics(container) {
  const poly = POLYTECHNICS[state.activePoly];

  const tagFrequencies = [
    { tag: "Community Preservation", count: 18 },
    { tag: "Carrying Capacity Constraints", count: 14 },
    { tag: "Subak Cooperative Ecology", count: 12 },
    { tag: "Heritage Curation", count: 11 },
    { tag: "Tourism Leakage", count: 9 },
    { tag: "Zero Plastic Compliance", count: 8 },
    { tag: "Augmented Guided Systems", count: 6 }
  ];

  const chartData = poly.destinations.map(d => ({
    name: d.name,
    comments: state.comments[d.id]?.length || 0,
    tasks: state.tasks[d.task.id] ? 1 : 0
  }));

  container.innerHTML = `
    <div class="analytics-grid">
      <div class="db-card">
        <h3>📍 ${t('interaction_volume')}</h3>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">${t('interaction_sub')}</p>
        <div class="bar-chart-container">
          ${chartData.map(c => {
            const maxVal = Math.max(...chartData.map(o => o.comments), 5);
            const w = maxVal === 0 ? 0 : (c.comments / maxVal) * 100;
            return `
              <div class="chart-row">
                <span class="chart-label" title="${c.name}">${c.name}</span>
                <div class="chart-bar-bg">
                  <div class="chart-bar-fill" style="width: ${w}%"></div>
                </div>
                <span class="chart-val">${c.comments} pt</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="db-card">
        <h3>📝 ${t('theme_miner')}</h3>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">${t('theme_sub')}</p>
        
        <div class="research-tags-cluster">
          ${tagFrequencies.map(tItem => `
            <div class="research-tag-pill">
              ${tItem.tag} <span style="background:var(--poly-primary); color:white; font-size:0.7rem; padding:0.1rem 0.3rem; border-radius:10px; margin-left:0.25rem;">${tItem.count}</span>
            </div>
          `).join('')}
        </div>

        <div style="margin-top:1.5rem; display:flex; flex-direction:column; gap:0.5rem;">
          <button class="export-copy-btn" id="export-json-btn">${t('export_json')}</button>
          <button class="export-copy-btn" id="export-csv-btn" style="background:#475569;">${t('export_csv')}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('export-json-btn').addEventListener('click', () => {
    const reflections = [];
    poly.destinations.forEach(d => {
      const sub = state.tasks[d.task.id];
      if (sub) {
        reflections.push({
          destination: d.name,
          coordinates: d.coords,
          student: "Budi Santoso",
          status: sub.status,
          reflectionText: sub.text,
          rubricEvaluationGrade: sub.grade,
          feedback: sub.feedback
        });
      }
    });

    const jsonString = JSON.stringify(reflections, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      alert("Qualitative Findings JSON copied to clipboard!\n\nSample:\n" + jsonString.slice(0, 200) + "...");
    });
  });

  document.getElementById('export-csv-btn').addEventListener('click', () => {
    let csv = "Destination,Author,Role,Comment,Likes\n";
    poly.destinations.forEach(d => {
      const cList = state.comments[d.id] || [];
      cList.forEach(c => {
        csv += `"${d.name}","${c.author}","${c.role}","${c.text.replace(/"/g, '""')}",${c.likes || 0}\n`;
      });
    });

    navigator.clipboard.writeText(csv).then(() => {
      alert("CSV data copied to clipboard!\nFormat:\nDestination,Author,Role,Comment,Likes");
    });
  });
}
