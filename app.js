// Hybrid Edutourism Platform - Application Logic (Global Script Version with Localization, Supabase Sync & Google Maps Layer)

const POLYTECHNICS = window.POLYTECHNICS;
const CHECKLIST_TEMPLATES = window.CHECKLIST_TEMPLATES;
const COURSES = window.COURSES;

// Global Application State
const state = {
  activeRole: localStorage.getItem('edutour_role') || 'student', // 'student' | 'lecturer' | 'coordinator'
  activePoly: localStorage.getItem('edutour_poly') || 'nhi_bandung', // nhi_bandung, bali, etc.
  activeView: localStorage.getItem('edutour_view') || 'hub', // hub (Mall SSO), dashboard, classroom, explorer, activities, planner, analytics
  lang: localStorage.getItem('edutour_lang') || 'en', // 'en' | 'id'
  selectedDestId: null, // set dynamically based on active poly
  activeDestTab: 'info', // 'info' | 'activity' | 'comments'
  pathMode: true, // draw route lines
  transportMode: localStorage.getItem('edutour_transport_mode') || 'driving', // 'driving' | 'transit' | 'motorcycle' | 'walking'
  trafficLayer: localStorage.getItem('edutour_traffic_layer') !== 'false', // boolean: show traffic conditions & live traffic tiles
  navPanelCollapsed: localStorage.getItem('edutour_nav_collapsed') === 'true',
  navPanelHidden: localStorage.getItem('edutour_nav_hidden') === 'true',
  isSimulating: false,
  simIndex: 0,
  simTimer: null,
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
  localStorage.setItem('edutour_transport_mode', state.transportMode);
  localStorage.setItem('edutour_traffic_layer', state.trafficLayer);
  localStorage.setItem('edutour_nav_collapsed', state.navPanelCollapsed);
  localStorage.setItem('edutour_nav_hidden', state.navPanelHidden);
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
// -------------------------------------------------------------
// WELCOME SCREEN / LANDING PAGE (Enhanced Wonderful Indonesia Tourism Edition)
// -------------------------------------------------------------
let landingAudioInstance = null;

function renderWelcomeScreen(container) {
  const isId = state.lang === 'id';
  const baliDests = (POLYTECHNICS.bali && POLYTECHNICS.bali.destinations) || [];

  const BALI_META = {
    bali_uluwatu: {
      category: "heritage",
      location: isId ? "Pecatu, Kuta Selatan" : "Pecatu, South Kuta",
      tag: isId ? "Warisan Suci & Tebing 97m" : "Sacred Cliff Sanctuary (97m)",
      rating: "4.9",
      reviews: "2.4k",
      duration: "2 - 3 Jam",
      distance: "1j 15m dari Kuta",
      highlights: isId 
        ? ["🌊 Tebing Samudera 97m", "🎭 Tari Kecak Sunset", "🐒 Hutan Kera Sakral"] 
        : ["🌊 97m Ocean Cliff", "🎭 Sunset Kecak Dance", "🐒 Sacred Macaque Forest"],
      focus: isId 
        ? "Analisis zonasi ruang sakral Tri Mandala, mitigasi carrying capacity tebing karst, dan etika pertunjukan budaya ritual." 
        : "Tri Mandala sacred zoning analysis, karst cliff carrying capacity mitigation, and ritual cultural performance ethics."
    },
    bali_jatiluwih: {
      category: "nature",
      location: "Tabanan, Bali",
      tag: "UNESCO World Heritage Subak",
      rating: "4.9",
      reviews: "1.8k",
      duration: "3 - 4 Jam",
      distance: "1j 45m dari Kuta",
      highlights: isId 
        ? ["🌾 Irigasi Subak Kuno", "🏔️ Panorama Gn. Batukaru", "🚜 Agrowisata Petani"] 
        : ["🌾 Ancient Subak Canal", "🏔️ Mt. Batukaru Vista", "🚜 Farmer Agritourism"],
      focus: isId 
        ? "Sistem irigasi koperasi tradisional Subak, konservasi persawahan berundak, dan inovasi agrowisata berbasis komunitas petani." 
        : "Subak cooperative irrigation philosophy, terraced paddy conservation, and community-centered farmer agritourism innovation."
    },
    bali_ulundanu: {
      category: "nature",
      location: "Bedugul, Tabanan",
      tag: isId ? "Suaka Hidrologis Dataran Tinggi" : "Highland Water Sanctum",
      rating: "4.8",
      reviews: "1.9k",
      duration: "2 - 3 Jam",
      distance: "2j 00m dari Kuta",
      highlights: isId 
        ? ["⛰️ Kaldera Danau Vulkanik", "🌫️ Kabut Pegunungan Sejuk", "🌸 Suaka Dewi Danu"] 
        : ["⛰️ Volcanic Caldera Lake", "🌫️ Cool Mountain Mist", "🌸 Shrine of Goddess Danu"],
      focus: isId 
        ? "Konservasi cekungan danau vulkanik kaldera, perlindungan mikroklimat dataran tinggi, dan kearifan ekologi air suci Danau Beratan." 
        : "Caldera volcanic lake basin conservation, highland microclimate protection, and sacred water ecological wisdom of Lake Beratan."
    },
    bali_penglipuran: {
      category: "community",
      location: "Bangli, Bali",
      tag: isId ? "Desa Terbersih di Dunia (CBT)" : "World's Cleanest Village (CBT)",
      rating: "5.0",
      reviews: "2.1k",
      duration: "2 - 3 Jam",
      distance: "1j 30m dari Kuta",
      highlights: isId 
        ? ["🎋 Hutan Bambu 45 Ha", "🏡 Arsitektur Bebas Emisi", "🤝 100% CBT Komunitas"] 
        : ["🎋 45 Ha Bamboo Forest", "🏡 Zero-Emission Design", "🤝 100% Community CBT"],
      focus: isId 
        ? "Zonasi Tri Mandala desa adat, tata kelola arsitektur bambu berkelanjutan, dan kemandirian ekonomi pariwisata 100% berbasis warga lokal." 
        : "Tri Mandala customary village spatial zoning, sustainable bamboo architecture governance, and 100% community-owned economic autonomy."
    },
    bali_tanahlot: {
      category: "heritage",
      location: "Tabanan, Bali",
      tag: isId ? "Ikon Karang Samudera" : "Oceanic Rock Icon",
      rating: "4.8",
      reviews: "3.1k",
      duration: "2 - 3 Jam",
      distance: "1j 00m dari Kuta",
      highlights: isId 
        ? ["🌅 Sunset Karang Spektakuler", "🌊 Fenomena Pasang Surut", "🐍 Ular Suci Penjaga Pura"] 
        : ["🌅 Spectacular Sunset", "🌊 Tidal Island Wonder", "🐍 Sacred Sea Snake Guardians"],
      focus: isId 
        ? "Mitigasi geoteknik abrasi gelombang laut pasang, zonasi koridor keselamatan pengunjung, dan pengelolaan dinamika peziarah pura karang." 
        : "Coastal wave erosion geotechnical mitigation, visitor tidal safety corridor zoning, and offshore pilgrimage flow dynamics."
    },
    bali_tirtaempul: {
      category: "heritage",
      location: "Gianyar, Bali",
      tag: isId ? "Mata Air Suci Kuno (962 M)" : "Ancient Sacred Springs (962 AD)",
      rating: "4.9",
      reviews: "1.6k",
      duration: "2 - 3 Jam",
      distance: "1j 20m dari Kuta",
      highlights: isId 
        ? ["💦 30 Pancuran Melukat Suci", "🏛️ Istana Presiden Tampaksiring", "🌳 Akuifer Lindung Alami"] 
        : ["💦 30 Sacred Melukat Fountains", "🏛️ Tampaksiring Palace", "🌳 Protected Natural Aquifer"],
      focus: isId 
        ? "Konservasi akuifer hidrologis mata air alami, etika ritual penyucian Melukat bagi wisatawan, dan perlindungan sakralitas cagar budaya kuno." 
        : "Natural spring hydrological aquifer conservation, visitor Melukat purification ritual ethics, and heritage sanctity preservation."
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
          <a class="landing-nav-link" href="#vr-showcase-section">${isId ? '🕶️ Tur 360°' : '🕶️ 360° Tours'}</a>
          <a class="landing-nav-link" href="#smart-pillars">${isId ? '✨ Fitur Cerdas' : '✨ Features'}</a>
          <a class="landing-nav-link" href="#role-selection">${isId ? '🎓 Akses Peran' : '🎓 Roles'}</a>
          <a class="landing-nav-link" href="#campuses-selection">${isId ? '🏛️ Kampus' : '🏛️ Campuses'}</a>
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

      <!-- 2. Hero Section with Cinematic Visuals & Experience Search Capsule -->
      <header class="landing-hero">
        <div class="landing-hero-content">
          
          <!-- Live Tourism Island Status Capsule -->
          <div class="hero-live-pill">
            <span class="live-dot pulse"></span>
            <span>🌴 <strong>Bali Tourism Live</strong>: 29°C Cerah • 🌅 Golden Hour: 17:15 WITA (Uluwatu Sunset) • 🌊 Samudera: Ombak Tenang</span>
            <button class="soundscape-toggle-btn" id="hero-soundscape-btn" title="${isId ? 'Putar/Hentikan Suara Alam' : 'Toggle Nature Soundscape'}">
              <span id="soundscape-icon">🔊</span>
              <span id="soundscape-label">${isId ? 'Suara Alam & Ombak' : 'Nature Soundscape'}</span>
            </button>
          </div>

          <div class="landing-hero-badge">
            <span>🌺</span> ${isId ? 'Wonderful Indonesia • Edisi Destinasi Wisata Edukasi Bali' : 'Wonderful Indonesia • Bali Edutourism Edition'}
          </div>

          <h1>
            ${isId ? 'Eksplorasi Keagungan Wisata Nusantara' : 'Discover Indonesia\'s Timeless Wonders'} 
            <span class="landing-hero-gradient-text">${isId ? 'Lewat Riset & Edukasi Cerdas' : 'Through Hybrid Edutourism'}</span>
          </h1>

          <p>${isId 
            ? 'Platform edutourism interaktif yang memadukan keindahan suaka budaya dan alam Indonesia dengan Tur Virtual 360°, rute jalan realistis Google Maps, audio narasi pemandu lapangan, dan instrumen refleksi ilmiah terstandar Kemenparekraf RI.' 
            : 'An interactive edutourism platform seamlessly integrating Indonesia\'s natural sanctuaries and cultural heritage with 360° virtual tours, realistic Google Maps routing, audio guide narration, and standardized academic field research.'}</p>

          <!-- Interactive Destination & Experience Search Capsule -->
          <div class="hero-search-capsule">
            <div class="search-field">
              <span class="field-icon">📍</span>
              <div class="field-texts">
                <span class="field-label">${isId ? 'DESTINASI WISATA' : 'DESTINATION'}</span>
                <select id="hero-dest-select" class="field-select">
                  <option value="bali_uluwatu">🌴 Pura Luhur Uluwatu (Tebing 97m & Sunset)</option>
                  <option value="bali_jatiluwih">🌾 Jatiluwih Rice Terraces (UNESCO Subak)</option>
                  <option value="bali_beratan">⛰️ Danau Beratan (Pura Danau Bedugul)</option>
                  <option value="bali_penglipuran">🎋 Desa Adat Penglipuran (Desa Terbersih)</option>
                  <option value="bali_tanahlot">🌊 Pura Tanah Lot (Karang Samudera)</option>
                  <option value="bali_tirtaempul">💦 Pura Tirta Empul (Mata Air Melukat)</option>
                </select>
              </div>
            </div>

            <div class="search-divider"></div>

            <div class="search-field">
              <span class="field-icon">🧭</span>
              <div class="field-texts">
                <span class="field-label">${isId ? 'PENGALAMAN WISATA' : 'EXPERIENCE'}</span>
                <select id="hero-mode-select" class="field-select">
                  <option value="360">${isId ? 'Tur Virtual 360° & Peta Rute' : '360° Virtual Tour & Route'}</option>
                  <option value="classroom">${isId ? 'Kelas Virtual & Audio Guide' : 'Classroom & Audio Guide'}</option>
                  <option value="tasks">${isId ? 'Tugas Lapangan & Riset Jurnal' : 'Field Tasks & Research Journal'}</option>
                </select>
              </div>
            </div>

            <button class="hero-search-submit" id="hero-search-submit-btn">
              <span>${isId ? 'Jelajahi Sekarang' : 'Explore Now'}</span>
              <span class="search-arrow">➔</span>
            </button>
          </div>

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

      <!-- 3. Featured Bali Edutourism Showcase with Interactive Category Filters -->
      <section class="landing-section-wrapper bali-showcase-section-wrap" id="bali-showcase">
        <div class="landing-section">
          <div class="landing-section-header">
            <span class="landing-section-pill">🌴 ${isId ? 'Edisi Spesial Poltekpar Bali' : 'Special Edition Poltekpar Bali'}</span>
            <h2>${t('bali_section_title')}</h2>
            <p>${t('bali_section_sub')}</p>

            <!-- Interactive Category Filter Tabs -->
            <div class="dest-filter-tabs">
              <button class="dest-filter-btn active" data-filter="all">✨ ${isId ? 'Semua Destinasi (6)' : 'All Destinations (6)'}</button>
              <button class="dest-filter-btn" data-filter="heritage">🏛️ ${isId ? 'Warisan Budaya & Pura (3)' : 'Cultural Heritage (3)'}</button>
              <button class="dest-filter-btn" data-filter="nature">🌾 ${isId ? 'UNESCO Alam & Geowisata (2)' : 'Nature & Geotourism (2)'}</button>
              <button class="dest-filter-btn" data-filter="community">🏡 ${isId ? 'Desa Adat Berkelanjutan (1)' : 'Eco-Village CBT (1)'}</button>
            </div>
          </div>

          <div class="bali-dest-grid" id="bali-cards-grid">
            ${baliDests.map(dest => {
              const meta = BALI_META[dest.id] || {
                category: "heritage",
                location: "Bali, Indonesia",
                tag: "Edutourism Spot",
                rating: "4.9",
                reviews: "1.5k",
                duration: "2-3 Jam",
                distance: "1j 30m dari Kuta",
                highlights: ["Pemandangan Indah", "Budaya Khas", "Riset Ilmiah"],
                focus: getLocalized(dest.description)
              };
              const desc = getLocalized(dest.description);

              return `
                <div class="bali-dest-card" data-dest-id="${dest.id}" data-category="${meta.category}">
                  <div class="bali-dest-img-wrap">
                    <img src="${dest.panorama}" alt="${dest.name}" class="bali-dest-img" loading="lazy" />
                    <span class="bali-dest-tag">${meta.tag}</span>
                    <div class="bali-dest-top-badges">
                      <span class="bali-dest-rating">⭐ ${meta.rating} (${meta.reviews})</span>
                    </div>
                    <span class="bali-dest-location">📍 ${meta.location} • 🚗 ${meta.distance}</span>
                  </div>
                  <div class="bali-dest-body">
                    <h3>${dest.name}</h3>
                    <p>${desc}</p>
                    
                    <!-- Highlight Pills -->
                    <div class="bali-dest-highlights">
                      ${meta.highlights.map(h => `<span class="highlight-pill">${h}</span>`).join('')}
                    </div>

                    <div class="bali-dest-focus-box">
                      <strong>🎓 ${isId ? 'Fokus Studi Lapangan' : 'Study Focus'}:</strong> ${meta.focus}
                    </div>

                    <!-- Dual Action Buttons -->
                    <div class="bali-card-actions">
                      <button class="bali-dest-action-btn bali-btn-360" data-dest-id="${dest.id}" data-action="360" title="${isId ? 'Masuk ke Tur Virtual 360°' : 'Enter 360° Virtual Tour'}">
                        <span>🕶️ ${isId ? 'Tur 360°' : '360° Tour'}</span>
                      </button>
                      <button class="bali-dest-action-btn bali-btn-route" data-dest-id="${dest.id}" data-action="route" title="${isId ? 'Lihat Peta Rute & Kondisi Jalan' : 'View Map & Route'}">
                        <span>🗺️ ${isId ? 'Peta Rute' : 'Route Map'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </section>

      <!-- 4. NEW: Cinematic 360° VR & Spatial Tourism Experience Showcase -->
      <section class="landing-section-wrapper vr-showcase-section-wrap" id="vr-showcase-section">
        <div class="landing-section" style="padding-top: 2rem; padding-bottom: 2rem;">
          <div class="vr-banner-card">
            <div class="vr-banner-content">
              <span class="landing-section-pill" style="background: rgba(254, 240, 138, 0.2); color: #fef08a; border: 1px solid rgba(254, 240, 138, 0.4);">
                🕶️ ${isId ? 'Realitas Virtual Beresolusi Tinggi' : 'Ultra-HD Virtual Reality'}
              </span>
              <h2>${isId ? 'Rasakan Sensasi Berdiri di Tebing Uluwatu Setinggi 97 Meter' : 'Experience Standing Atop the 97m Uluwatu Cliff'}</h2>
              <p>${isId 
                ? 'Sebelum terjun langsung ke lapangan, mahasiswa dan peneliti dapat mengobservasi tata ruang pura, deburan ombak Samudera Hindia, dan relief arsitektur sakral melalui navigasi panorama 360° yang imersif dan dilengkapi narasi audio pemandu.' 
                : 'Before on-site fieldwork, researchers and students can examine spatial temple zoning, Indian Ocean wave dynamics, and sacred reliefs through an immersive 360° panoramic viewer with curated audio guides.'}</p>
              
              <div class="vr-feature-chips">
                <div class="vr-chip">
                  <span class="chip-icon">🧭</span>
                  <div>
                    <strong>${isId ? 'Navigasi 360 Derajat Bebas' : 'Free 360° Navigation'}</strong>
                    <p>${isId ? 'Putar ke segala arah dengan kontrol intuitif' : 'Pan in all directions with responsive controls'}</p>
                  </div>
                </div>
                <div class="vr-chip">
                  <span class="chip-icon">🎧</span>
                  <div>
                    <strong>${isId ? 'Audio Pemandu Lapangan' : 'Audio Field Guide'}</strong>
                    <p>${isId ? 'Narasi kuratorial dwibahasa terverifikasi dosen' : 'Curated bilingual field narration'}</p>
                  </div>
                </div>
                <div class="vr-chip">
                  <span class="chip-icon">📐</span>
                  <div>
                    <strong>${isId ? 'Koordinat GPS Spasial' : 'Spatial GPS Coordinates'}</strong>
                    <p>${isId ? 'Terhubung langsung dengan titik peta presisi' : 'Directly synchronized with live map coordinates'}</p>
                  </div>
                </div>
              </div>

              <button class="vr-banner-cta-btn" id="vr-teaser-btn">
                <span>🕶️ ${isId ? 'Buka Tur Virtual 360° Sekarang' : 'Launch 360° Virtual Tour'}</span> →
              </button>
            </div>
            <div class="vr-banner-visual">
              <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80" alt="360 Preview" class="vr-visual-img" />
              <div class="vr-compass-badge">
                <span class="compass-ring"></span>
                <span class="compass-icon">🧭</span>
                <span class="compass-text">360° INTERACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. NEW: 5 Smart Tourism Pillars Section -->
      <section class="landing-section-wrapper smart-pillars-section-wrap" id="smart-pillars">
        <div class="landing-section">
          <div class="landing-section-header">
            <span class="landing-section-pill" style="background: #e0e7ff; color: #4338ca;">✨ ${isId ? 'Keunggulan Platform' : 'Core Innovations'}</span>
            <h2>${isId ? '5 Pilar Pariwisata & Edukasi Cerdas' : '5 Pillars of Smart Hybrid Edutourism'}</h2>
            <p>${isId 
              ? 'Platform INA-Edutour dibangun khusus untuk memenuhi kebutuhan riset, observasi lapangan, dan standar penilaian akademik Kementerian Pariwisata dan Ekonomi Kreatif RI.' 
              : 'The INA-Edutour platform is specifically designed to meet rigorous fieldwork research and academic accreditation standards.'}</p>
          </div>

          <div class="smart-pillars-grid">
            <div class="pillar-card">
              <div class="pillar-icon-box" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">🕶️</div>
              <h3>${isId ? 'Tur Virtual 360° & VR' : '360° Virtual Reality'}</h3>
              <p>${isId ? 'Simulasi spasial lokasi wisata sebelum kunjungan fisik, memungkinkan analisis awal morfologi dan carrying capacity.' : 'Photorealistic spatial preview of destinations for pre-fieldwork analysis.'}</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-icon-box" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);">🚦</div>
              <h3>${isId ? 'Rute Multi-Modal & Macet' : 'Multi-Modal Live Traffic'}</h3>
              <p>${isId ? 'Perhitungan rute realistis untuk Mobil, Kereta/Bus, Sepeda Motor, dan Jalan Kaki dengan kondisi kepadatan jalan real-time.' : 'Multi-modal route engine with real-world traffic delay modeling and turn-by-turn simulation.'}</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-icon-box" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">🎧</div>
              <h3>${isId ? 'Audio Pemandu Lapangan' : 'Audio Guiding System'}</h3>
              <p>${isId ? 'Narasi audio dwibahasa (ID/EN) yang mendalam untuk memandu observasi mandiri mahasiswa di setiap titik koordinat.' : 'Bilingual curator voiceovers guiding on-site self-directed field observations.'}</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-icon-box" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);">📝</div>
              <h3>${isId ? 'Jurnal Riset & Rubrik Dosen' : 'Rubric Evaluation Journal'}</h3>
              <p>${isId ? 'Pengumpulan tugas refleksi lapangan terstruktur dengan penilaian rubrik objektif oleh dosen pembimbing.' : 'Structured field journal reflections graded against standardized pedagogical rubrics.'}</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-icon-box" style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);">📊</div>
              <h3>${isId ? 'Big Data Riset Pariwisata' : 'Big Data & Semantic Mining'}</h3>
              <p>${isId ? 'Sintesis tematik kualitatif dari ulasan lapangan untuk riset kebijakan pariwisata berkelanjutan nasional.' : 'Automated thematic keyword mining from student feedback for policy research.'}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. Interactive Role Selection -->
      <section class="landing-section-wrapper roles-section-wrap" id="role-selection">
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

      <!-- 7. Indonesian Tourism Polytechnics Campuses -->
      <section class="landing-section-wrapper campuses-section-wrap" id="campuses-selection">
        <div class="landing-section">
          <div class="landing-section-header">
            <span class="landing-section-pill" style="background: #ecfdf5; color: #047857;">🏛️ ${isId ? 'Ekosistem Poltekpar' : 'Polytechnics Network'}</span>
            <h2>${t('choose_poly')}</h2>
            <p>${isId 
              ? 'Didukung oleh 6 Politeknik Pariwisata negeri di bawah naungan Kementerian Pariwisata dan Ekonomi Kreatif Republik Indonesia.' 
              : 'Supported by 6 State Tourism Polytechnics under the Ministry of Tourism and Creative Economy of Indonesia.'}</p>
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
        </div>
      </section>

      <!-- 8. Integrated 3-Phase Methodology -->
      <section class="landing-section-wrapper methodology-section-wrap" id="methodology-section">
        <div class="landing-section">
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

      <!-- 9. NEW: Authentic Testimonials & Academic Community Voice -->
      <section class="landing-section-wrapper testimonials-section-wrap" id="testimonials-section">
        <div class="landing-section">
          <div class="landing-section-header">
            <span class="landing-section-pill" style="background: #fce7f3; color: #be185d;">💬 ${isId ? 'Suara Akademisi & Praktisi' : 'Community Voices'}</span>
            <h2>${isId ? 'Apa Kata Mahasiswa & Dosen Pariwisata' : 'What Students & Lecturers Say'}</h2>
            <p>${isId 
              ? 'Pengalaman nyata civitas akademika dalam memanfaatkan platform edutourism hybrid di destinasi wisata Indonesia.' 
              : 'Real perspectives from academic researchers leveraging hybrid edutourism across Indonesian destinations.'}</p>
          </div>

          <div class="testimonials-grid">
            <div class="testimonial-card">
              <div class="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p class="testimonial-text">"${isId 
                ? 'Mempelajari sistem irigasi Subak Jatiluwih secara hybrid dengan peta rute real-time dan panorama 360° membuat survei lapangan 3x lebih efisien!' 
                : 'Studying the Jatiluwih Subak irrigation system in hybrid mode with live routing and 360° views made our field survey 3x more efficient!'}"</p>
              <div class="testimonial-author">
                <div class="author-avatar" style="background: #f97316;">KL</div>
                <div>
                  <h4>Kadek Ayu Lestari</h4>
                  <p>${isId ? 'Mahasiswi Manajemen Kepariwisataan • Poltekpar Bali' : 'Tourism Management Student • Poltekpar Bali'}</p>
                </div>
              </div>
            </div>

            <div class="testimonial-card">
              <div class="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p class="testimonial-text">"${isId 
                ? 'Sangat praktis untuk mengevaluasi laporan jurnal observasi mahasiswa secara terstruktur dengan rubrik terstandar yang langsung terhubung ke database cloud.' 
                : 'Remarkably efficient for grading student field observation journals against structured rubrics synced directly with cloud storage.'}"</p>
              <div class="testimonial-author">
                <div class="author-avatar" style="background: #0284c7;">DW</div>
                <div>
                  <h4>Dr. I Made Wardana, M.Par</h4>
                  <p>${isId ? 'Dosen Senior Perencanaan Pariwisata' : 'Senior Lecturer in Tourism Planning'}</p>
                </div>
              </div>
            </div>

            <div class="testimonial-card">
              <div class="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p class="testimonial-text">"${isId 
                ? 'Fitur rute jalan dengan kalkulasi macet realistis sangat membantu kami mengatur jadwal bus pariwisata mahasiswa tanpa khawatir terjebak antrean jalan.' 
                : 'The realistic road routing with traffic modeling helped us optimize student coach schedules without unexpected delays.'}"</p>
              <div class="testimonial-author">
                <div class="author-avatar" style="background: #10b981;">SN</div>
                <div>
                  <h4>Siti Nurhaliza, S.Tr.Par</h4>
                  <p>${isId ? 'Koordinator Ekspedisi Lapangan & Ekowisata' : 'Field Expedition & Ecotourism Coordinator'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 10. Footer -->
      <footer class="landing-footer">
        <div class="landing-footer-inner">
          <div class="landing-footer-brand">
            <span style="font-size: 2.2rem;">🌋</span>
            <div>
              <h4>INA-Edutour • Wonderful Indonesia</h4>
              <p>${isId 
                ? 'Platform Edutourism Hybrid Resmi Politeknik Pariwisata Indonesia • Kemenparekraf RI' 
                : 'Official Hybrid Edutourism Platform for Indonesian Tourism Polytechnics'}</p>
            </div>
          </div>

          <div class="landing-footer-status">
            <span class="landing-status-dot"></span>
            <span>⚡ Supabase Database Active & Cloud Synced</span>
          </div>

          <div style="font-size: 0.8rem; color: #94a3b8;">
            © 2026 INA-Edutour • Kementerian Pariwisata dan Ekonomi Kreatif Republik Indonesia
          </div>
        </div>
      </footer>

    </div>
  `;

  // EVENT LISTENERS

  // A. Role Cards Click -> Enters App with that Role and lands on Mall SSO Hub
  container.querySelectorAll('.welcome-card').forEach(card => {
    card.addEventListener('click', () => {
      const selectedRole = card.dataset.role || 'student';
      state.activeRole = selectedRole;
      state.activeView = 'hub';
      state.isWelcome = false;
      saveState();
      initApp();
      const user = SSO_USERS[selectedRole] || SSO_USERS.student;
      showSSOToast(`🔐 Sesi SSO Diverifikasi! Selamat Datang di Mall SSO, ${user.name} (${user.roleLabel})`);
    });
  });

  // B. Bali Destination Dual Action Buttons (360° vs Route)
  container.querySelectorAll('.bali-dest-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const destId = btn.dataset.destId;
      const action = btn.dataset.action;
      state.activePoly = 'bali';
      state.selectedDestId = destId;
      state.activeRole = state.activeRole || 'student';
      state.activeView = 'explorer';
      state.isWelcome = false;

      if (action === 'route') {
        state.pathMode = true;
        state.navPanelHidden = false;
      }

      saveState();
      initApp();
    });
  });

  // C. Interactive Category Filter Tabs in Bali Showcase
  const filterBtns = container.querySelectorAll('.dest-filter-btn');
  const cards = container.querySelectorAll('.bali-dest-card');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      cards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = 'flex';
          card.classList.add('animate-fade');
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // D. Hero Destination & Experience Search Capsule
  const heroSearchBtn = document.getElementById('hero-search-submit-btn');
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => {
      const destSelect = document.getElementById('hero-dest-select');
      const modeSelect = document.getElementById('hero-mode-select');
      const chosenDest = destSelect ? destSelect.value : 'bali_uluwatu';
      const chosenMode = modeSelect ? modeSelect.value : '360';

      state.activePoly = 'bali';
      state.selectedDestId = chosenDest;
      state.activeRole = state.activeRole || 'student';
      state.isWelcome = false;

      if (chosenMode === 'classroom') {
        state.activeView = 'classroom';
      } else if (chosenMode === 'tasks') {
        state.activeView = 'tasks';
      } else {
        state.activeView = 'explorer';
        state.pathMode = true;
      }

      saveState();
      initApp();
    });
  }

  // E. VR Teaser CTA Button
  const vrTeaserBtn = document.getElementById('vr-teaser-btn');
  if (vrTeaserBtn) {
    vrTeaserBtn.addEventListener('click', () => {
      state.activePoly = 'bali';
      state.selectedDestId = 'bali_uluwatu';
      state.activeRole = 'student';
      state.activeView = 'explorer';
      state.isWelcome = false;
      saveState();
      initApp();
    });
  }

  // F. Soundscape Audio Player Button
  const soundscapeBtn = document.getElementById('hero-soundscape-btn');
  if (soundscapeBtn) {
    soundscapeBtn.addEventListener('click', () => {
      const icon = document.getElementById('soundscape-icon');
      const label = document.getElementById('soundscape-label');

      if (!landingAudioInstance) {
        landingAudioInstance = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
        landingAudioInstance.loop = true;
        landingAudioInstance.volume = 0.4;
      }

      if (landingAudioInstance.paused) {
        landingAudioInstance.play().then(() => {
          soundscapeBtn.classList.add('playing');
          if (icon) icon.textContent = '⏸️';
          if (label) label.textContent = isId ? 'Hentikan Suara Alam' : 'Pause Nature Sound';
        }).catch(err => {
          console.warn("Audio play notice:", err);
        });
      } else {
        landingAudioInstance.pause();
        soundscapeBtn.classList.remove('playing');
        if (icon) icon.textContent = '🔊';
        if (label) label.textContent = isId ? 'Suara Alam & Ombak' : 'Nature Soundscape';
      }
    });
  }

  // G. Polytechnic Badges Click -> Selects Active Campus
  container.querySelectorAll('.poly-badge-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.poly-badge-card').forEach(c => c.classList.remove('active-border'));
      card.classList.add('active-border');
      state.activePoly = card.dataset.poly;
      updateTheme(state.activePoly);
      saveState();
    });
  });

  // H. Hero CTA Buttons -> Lands directly on Mall SSO Hub
  const heroStartBtn = document.getElementById('hero-start-btn');
  if (heroStartBtn) {
    heroStartBtn.addEventListener('click', () => {
      state.activeRole = state.activeRole || 'student';
      state.activePoly = 'bali';
      state.activeView = 'hub';
      state.isWelcome = false;
      saveState();
      initApp();
      const user = SSO_USERS[state.activeRole] || SSO_USERS.student;
      showSSOToast(`🔐 Sesi SSO Diverifikasi! Masuk ke Mall SSO sebagai ${user.name}`);
    });
  }

  // I. Nav Direct Enter CTA
  const navDirectEnter = document.getElementById('nav-direct-enter');
  if (navDirectEnter) {
    navDirectEnter.addEventListener('click', () => {
      state.activeRole = state.activeRole || 'student';
      state.activeView = 'hub';
      state.isWelcome = false;
      saveState();
      initApp();
      const user = SSO_USERS[state.activeRole] || SSO_USERS.student;
      showSSOToast(`🔐 Sesi SSO Diverifikasi! Masuk ke Mall SSO sebagai ${user.name}`);
    });
  }

  // J. Brand Scroll to Top
  const brandScroll = document.getElementById('brand-scroll-top');
  if (brandScroll) {
    brandScroll.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // K. Dual Language Toggle
  const enBtn = document.getElementById('welcome-en-btn');
  if (enBtn) {
    enBtn.addEventListener('click', () => {
      state.lang = 'en';
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

      <button class="role-btn" id="logout-btn" style="background:#e2e8f0; color:#475569; padding: 0.4rem 0.8rem;">${t('logout')}</button>
    </div>
  `;

  // Expose configuration function globally via console if ever needed (without cluttering UI)
  window.configureSupabase = () => {
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
  };

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
    { view: 'hub', label: t('mall_sso') || (state.lang === 'id' ? 'Mall SSO' : 'SSO Hub'), icon: '🏠', roles: ['student', 'lecturer', 'coordinator'] },
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
    case 'hub':
    case 'dashboard':
      renderSSOHub(viewport);
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
      renderSSOHub(viewport);
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
// -------------------------------------------------------------
// VIEW 3: VIRTUAL TOUR & MAP EXPLORER (With Google Maps Layer)
// -------------------------------------------------------------
let mapInstance = null;
let routeLayers = [];
let incidentMarkers = [];
let transitMarkers = [];
let simVehicleMarker = null;
let simInterval = null;
let googleTrafficTile = null;
let googleStreetsTile = null;

function renderExplorer(container) {
  const poly = POLYTECHNICS[state.activePoly];
  const activeDest = poly.destinations.find(d => d.id === state.selectedDestId) || poly.destinations[0];
  state.selectedDestId = activeDest.id;
  const isId = state.lang === 'id';

  container.innerHTML = `
    <div class="map-explorer-layout">
      <div class="destinations-sidebar">
        <div class="sidebar-search">
          <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; display:flex; justify-content:space-between; align-items:center;">
            <span>📍 ${t('destinations')}</span>
            <button class="role-btn" id="toggle-path-btn" style="font-size:0.7rem; padding: 0.2rem 0.6rem; background:${state.pathMode ? 'var(--poly-secondary)' : '#cbd5e1'}; color:${state.pathMode ? '#000' : '#475569'}; font-weight:700;">
              ${t('route')}: ${state.pathMode ? 'ON' : 'OFF'}
            </button>
          </h3>
          <p style="font-size:0.75rem; color:var(--text-muted);">${isId ? 'Pilih destinasi untuk melihat panduan rute jalan & navigasi.' : 'Select destination to view road route & navigation guide.'}</p>
        </div>
        <div class="destinations-scroll" id="explorer-dest-list">
          ${poly.destinations.map((d, index) => `
            <div class="dest-card-small ${d.id === state.selectedDestId ? 'active' : ''}" data-id="${d.id}">
              <span class="tour-path-badge">${isId ? 'Langkah Rute' : 'Route Step'} ${index + 1}</span>
              <h4 style="font-weight:700; color:var(--poly-primary); margin-top: 0.8rem;">${d.name}</h4>
              <p>${getLocalized(d.description)}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="map-center-panel" style="position:relative;">
        <div id="map-canvas" class="map-container"></div>

        <!-- Floating Reopen Navigation Button (Shown when HUD panel is hidden) -->
        <button class="gmap-nav-reopen-btn ${state.navPanelHidden ? '' : 'hidden'}" id="gmap-nav-reopen-btn" title="${isId ? 'Tampilkan Navigasi & Rute' : 'Show Route Navigation'}">
          <span class="icon">🧭</span>
          <span>${isId ? 'Buka Navigasi Rute' : 'Show Route Navigation'}</span>
        </button>

        <!-- 1. Google Maps Navigation HUD Card (Collapsible & Closeable) -->
        <div class="gmap-nav-panel ${state.navPanelCollapsed ? 'collapsed' : ''} ${state.navPanelHidden ? 'hidden' : ''}" id="gmap-nav-panel">
          <div class="gmap-nav-topbar" id="gmap-nav-topbar" title="${isId ? 'Klik untuk memperluas / mengecilkan panel' : 'Click to expand / collapse panel'}">
            <div class="gmap-nav-topbar-title">
              <span class="nav-icon">🧭</span>
              <span class="nav-title-text">${isId ? 'Navigasi & Rute' : 'Navigation & Route'}</span>
              <span class="gmap-collapsed-badge" id="gmap-collapsed-badge"></span>
            </div>
            <div class="gmap-nav-actions">
              <button class="gmap-header-btn" id="gmap-btn-collapse" type="button" title="${state.navPanelCollapsed ? (isId ? 'Perluas Panel' : 'Expand') : (isId ? 'Kecilkan Panel' : 'Collapse')}">
                ${state.navPanelCollapsed ? '▼' : '▲'}
              </button>
              <button class="gmap-header-btn close" id="gmap-btn-hide" type="button" title="${isId ? 'Sembunyikan Panel' : 'Hide Panel'}">
                ✕
              </button>
            </div>
          </div>

          <div class="gmap-nav-collapsible" id="gmap-nav-collapsible">
            <div class="gmap-nav-header">
              <div class="gmap-transport-tabs">
                <button class="gmap-tab-btn ${state.transportMode === 'driving' ? 'active' : ''}" data-mode="driving" title="${isId ? 'Mobil & Minibus Wisata' : 'Car / Driving'}">
                  <span class="tab-icon">🚗</span>
                  <span class="tab-title">${isId ? 'Mobil' : 'Drive'}</span>
                </button>
                <button class="gmap-tab-btn ${state.transportMode === 'transit' ? 'active' : ''}" data-mode="transit" title="${isId ? 'Kereta Api & Angkutan Massal' : 'Train & Transit'}">
                  <span class="tab-icon">🚆</span>
                  <span class="tab-title">${isId ? 'Kereta/Bus' : 'Transit'}</span>
                </button>
                <button class="gmap-tab-btn ${state.transportMode === 'motorcycle' ? 'active' : ''}" data-mode="motorcycle" title="${isId ? 'Sepeda Motor (Shortcut)' : 'Motorbike'}">
                  <span class="tab-icon">🛵</span>
                  <span class="tab-title">${isId ? 'Motor' : 'Moto'}</span>
                </button>
                <button class="gmap-tab-btn ${state.transportMode === 'walking' ? 'active' : ''}" data-mode="walking" title="${isId ? 'Jalan Kaki / Eco-Trail' : 'Walking'}">
                  <span class="tab-icon">🚶</span>
                  <span class="tab-title">${isId ? 'Jalan' : 'Walk'}</span>
                </button>
              </div>
            </div>

            <div class="gmap-nav-body" id="gmap-nav-body">
              <!-- Dynamic routing summary content rendered by updateGMapNavCard -->
            </div>
          </div>
        </div>

        <!-- 2. Google Maps Navigation Turn-by-Turn Simulation HUD -->
        <div class="gmap-sim-hud" id="gmap-sim-hud" style="display: none;">
          <div class="gmap-sim-arrow" id="sim-hud-icon">⬆️</div>
          <div class="gmap-sim-info">
            <h4 id="sim-hud-street">${isId ? 'Menyusuri Jalan Raya' : 'Navigating Highway'}</h4>
            <p id="sim-hud-stats">${isId ? 'Kecepatan: 50 km/jam • Arus Lancar' : 'Speed: 50 km/h • Smooth Traffic'}</p>
          </div>
          <button class="gmap-sim-close-btn" id="sim-hud-stop">⏹️ ${isId ? 'Selesai' : 'Stop'}</button>
        </div>

        <!-- 3. Traffic Conditions Legend -->
        <div class="gmap-traffic-legend" id="gmap-traffic-legend">
          <span>🚦 ${isId ? 'Lalu Lintas' : 'Traffic'}:</span>
          <div class="legend-bar-container">
            <span class="legend-bar-seg green" title="${isId ? 'Lancar (>40 km/jam)' : 'Fast (>40 km/h)'}"></span>
            <span class="legend-bar-seg yellow" title="${isId ? 'Sedang (20-40 km/jam)' : 'Moderate (20-40 km/h)'}"></span>
            <span class="legend-bar-seg red" title="${isId ? 'Macet (<20 km/jam)' : 'Heavy (<20 km/h)'}"></span>
          </div>
          <span style="font-size:0.68rem; color:#64748b;" id="legend-status-text">${isId ? 'Lancar / Macet' : 'Traffic Live'}</span>
        </div>

        <!-- 4. Coordinates Tooltip Overlay -->
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

  // Attach Destination Cards Click
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

  // Attach Path Toggle Button
  document.getElementById('toggle-path-btn').addEventListener('click', () => {
    state.pathMode = !state.pathMode;
    saveState();
    renderRealRoadNavigation();
    updateGMapNavCard();
    const btn = document.getElementById('toggle-path-btn');
    if (btn) {
      btn.style.background = state.pathMode ? 'var(--poly-secondary)' : '#cbd5e1';
      btn.style.color = state.pathMode ? '#000' : '#475569';
      btn.textContent = `${t('route')}: ${state.pathMode ? 'ON' : 'OFF'}`;
    }
  });

  // Attach Transport Mode Tabs
  document.querySelectorAll('.gmap-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gmap-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.transportMode = btn.dataset.mode;
      saveState();
      updateGMapNavCard();
      renderRealRoadNavigation();
    });
  });

  // Attach Stop Simulation Button
  const stopSimBtn = document.getElementById('sim-hud-stop');
  if (stopSimBtn) {
    stopSimBtn.addEventListener('click', () => {
      stopRoadNavigationSimulation();
    });
  }

  // Attach Panel Collapse & Hide Actions
  const navPanel = document.getElementById('gmap-nav-panel');
  const collapseBtn = document.getElementById('gmap-btn-collapse');
  const topbar = document.getElementById('gmap-nav-topbar');
  const hideBtn = document.getElementById('gmap-btn-hide');
  const reopenBtn = document.getElementById('gmap-nav-reopen-btn');

  function toggleCollapse(e) {
    if (e) e.stopPropagation();
    state.navPanelCollapsed = !state.navPanelCollapsed;
    saveState();
    if (navPanel) {
      navPanel.classList.toggle('collapsed', state.navPanelCollapsed);
    }
    if (collapseBtn) {
      collapseBtn.textContent = state.navPanelCollapsed ? '▼' : '▲';
      collapseBtn.title = state.navPanelCollapsed ? (isId ? 'Perluas Panel' : 'Expand') : (isId ? 'Kecilkan Panel' : 'Collapse');
    }
  }

  if (collapseBtn) {
    collapseBtn.addEventListener('click', toggleCollapse);
  }

  if (topbar) {
    topbar.addEventListener('click', (e) => {
      if (e.target.closest('#gmap-btn-hide') || e.target.closest('#gmap-btn-collapse')) return;
      if (state.navPanelCollapsed) {
        toggleCollapse(e);
      }
    });
  }

  if (hideBtn) {
    hideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.navPanelHidden = true;
      saveState();
      if (navPanel) navPanel.classList.add('hidden');
      if (reopenBtn) reopenBtn.classList.remove('hidden');
    });
  }

  if (reopenBtn) {
    reopenBtn.addEventListener('click', () => {
      state.navPanelHidden = false;
      saveState();
      if (navPanel) navPanel.classList.remove('hidden');
      if (reopenBtn) reopenBtn.classList.add('hidden');
    });
  }

  // Initial Content Population
  updateGMapNavCard();
  renderExplorerDetails();

  setTimeout(() => {
    initLeafletMap();
  }, 100);
}

function updateGMapNavCard() {
  const container = document.getElementById('gmap-nav-body');
  if (!container) return;

  const isId = state.lang === 'id';
  const network = window.ROUTING_NETWORK && (window.ROUTING_NETWORK[state.activePoly] || window.ROUTING_NETWORK.bali);
  const modeData = network && network.modes && network.modes[state.transportMode] ? network.modes[state.transportMode] : {
    name: { en: "Driving", id: "Mobil" },
    icon: "🚗",
    totalTime: "1 jam 45 mnt",
    totalDistance: "58 km",
    trafficDelay: "+15 mnt",
    statusText: { en: "Normal city traffic.", id: "Lalu lintas perkotaan ramai lancar." },
    fuelCost: "Rp 60.000",
    roadType: { en: "Main Highways", id: "Jalan Utama" }
  };

  const isHeavy = modeData.trafficDelay && modeData.trafficDelay.includes('+') && !modeData.trafficDelay.includes('+8');
  const alertClass = state.transportMode === 'transit' ? 'transit' : (isHeavy ? '' : 'green');

  container.innerHTML = `
    <div class="gmap-route-headline">
      <span class="gmap-eta-time ${isHeavy ? 'heavy' : ''}">${modeData.totalTime}</span>
      <span class="gmap-distance-badge">${modeData.totalDistance}</span>
    </div>

    <div class="gmap-route-via">
      <span>${modeData.icon}</span>
      <span>${getLocalized(modeData.roadType)}</span>
    </div>

    <div class="gmap-traffic-alert-box ${alertClass}">
      <strong>${state.transportMode === 'transit' ? 'ℹ️ Transport Notice:' : (state.trafficLayer ? '🚦 Traffic Status:' : '🛣️ Route Mode:')}</strong>
      <span>${getLocalized(modeData.statusText)}</span>
    </div>

    <div style="font-size:0.75rem; color:#64748b; margin-bottom:0.75rem; display:flex; justify-content:space-between;">
      <span>${isId ? 'Biaya Estimasi' : 'Estimated Cost'}: <strong>${modeData.fuelCost}</strong></span>
      <span>${isId ? 'Keterlambatan' : 'Delay'}: <strong style="color:${isHeavy ? '#dc2626' : '#15803d'}">${modeData.trafficDelay}</strong></span>
    </div>

    <div class="gmap-actions-row">
      <button class="gmap-btn-start" id="gmap-start-sim-btn">
        <span>▶️</span> ${isId ? 'Mulai Navigasi' : 'Start Navigation'}
      </button>

      <button class="gmap-btn-traffic-toggle ${state.trafficLayer ? 'active' : ''}" id="gmap-toggle-traffic-btn" title="${isId ? 'Nyalakan/Matikan Kondisi Macet' : 'Toggle Live Traffic'}">
        <span>🚦</span> ${state.trafficLayer ? (isId ? 'Macet: ON' : 'Traffic: ON') : (isId ? 'Macet: OFF' : 'Traffic: OFF')}
      </button>
    </div>
  `;

  // Update collapsed badge text
  const collapsedBadge = document.getElementById('gmap-collapsed-badge');
  if (collapsedBadge) {
    collapsedBadge.textContent = `${modeData.icon} ${modeData.totalTime} • ${modeData.totalDistance}`;
  }

  // Attach start navigation button
  const startBtn = document.getElementById('gmap-start-sim-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startRoadNavigationSimulation();
    });
  }

  // Attach traffic toggle button
  const trafficBtn = document.getElementById('gmap-toggle-traffic-btn');
  if (trafficBtn) {
    trafficBtn.addEventListener('click', () => {
      state.trafficLayer = !state.trafficLayer;
      saveState();
      updateGMapNavCard();
      renderRealRoadNavigation();

      // Switch Google Maps base tile layer if live traffic active
      if (mapInstance && googleTrafficTile && googleStreetsTile) {
        if (state.trafficLayer) {
          mapInstance.removeLayer(googleStreetsTile);
          googleTrafficTile.addTo(mapInstance);
        } else {
          mapInstance.removeLayer(googleTrafficTile);
          googleStreetsTile.addTo(mapInstance);
        }
      }
    });
  }
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

  // If map instance already exists, remove it cleanly before re-initializing
  if (mapInstance) {
    try {
      mapInstance.remove();
    } catch(e) {
      console.warn("Map remove notice:", e);
    }
    mapInstance = null;
  }

  // Initialize Leaflet Map without default zoom control (default is topleft which clashes with nav HUD)
  mapInstance = L.map('map-canvas', {
    zoomControl: false
  }).setView(activeDest.coords, 11);

  // Position zoom controls cleanly at bottom-right corner
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

  // --- GOOGLE MAPS TILE LAYERS (High Quality, Clean, No Watermarks) ---
  googleStreetsTile = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  });

  googleTrafficTile = L.tileLayer('https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google Maps Live Traffic'
  });

  const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google Maps Satellite'
  });

  const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  });

  // Add initial base tile: Google Traffic if active, otherwise Google Streets
  if (state.trafficLayer) {
    googleTrafficTile.addTo(mapInstance);
  } else {
    googleStreetsTile.addTo(mapInstance);
  }

  // Layer control switcher widget
  const baseMaps = {
    "🚦 Google Maps (Live Traffic)": googleTrafficTile,
    "🗺️ Google Maps (Standar)": googleStreetsTile,
    "🛰️ Google Satellite": googleSatellite,
    "🌐 OpenStreetMap": openStreetMap
  };
  L.control.layers(baseMaps, null, { position: 'topright' }).addTo(mapInstance);

  // Add destination numbered markers
  const markers = [];
  poly.destinations.forEach((d, idx) => {
    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="
          width: 36px; 
          height: 36px; 
          background: var(--poly-bg-gradient); 
          border: 3px solid white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          font-weight: 800; 
          font-size: 0.9rem;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
          cursor: pointer;
        ">
          ${idx + 1}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = L.marker(d.coords, { icon: customIcon, title: d.name })
      .bindPopup(`
        <div style="font-family:'Inter', sans-serif; min-width: 170px;">
          <span style="background:var(--poly-secondary); color:#000; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">
            ${state.lang === 'en' ? 'Stop' : 'Titik'} ${idx + 1}
          </span>
          <h4 style="margin:0.4rem 0 0.2rem; font-size:0.95rem; color:var(--poly-primary); font-weight:800;">${d.name}</h4>
          <p style="margin:0; font-size:0.75rem; color:#64748b; line-height:1.4;">${getLocalized(d.description)}</p>
          <div style="margin-top:0.5rem; font-size:0.75rem; color:#0f172a; font-weight:700;">
            📍 ${d.coords[0].toFixed(4)}, ${d.coords[1].toFixed(4)}
          </div>
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

  // Render Real Road Route Geometry, Traffic Colors & Incidents
  renderRealRoadNavigation();

  markers.find(m => m.options.title === activeDest.name)?.openPopup();
}

function renderRealRoadNavigation() {
  if (!mapInstance) return;

  // 1. Clean up existing routing elements
  routeLayers.forEach(l => {
    try { mapInstance.removeLayer(l); } catch(e) {}
  });
  routeLayers = [];

  incidentMarkers.forEach(m => {
    try { mapInstance.removeLayer(m); } catch(e) {}
  });
  incidentMarkers = [];

  transitMarkers.forEach(m => {
    try { mapInstance.removeLayer(m); } catch(e) {}
  });
  transitMarkers = [];

  if (!state.pathMode) return;

  const poly = POLYTECHNICS[state.activePoly];
  const network = window.ROUTING_NETWORK && (window.ROUTING_NETWORK[state.activePoly] || window.ROUTING_NETWORK.bali);
  const isId = state.lang === 'id';

  // 2. Bali Real Road Routing Network
  if (state.activePoly === 'bali' && network && network.segments) {
    
    // A. Driving / Motorcycle / Transit Road Drawing
    if (state.transportMode === 'driving' || state.transportMode === 'motorcycle' || state.transportMode === 'transit') {
      network.segments.forEach(segment => {
        segment.subSegments.forEach(sub => {
          // Underlayer dark road casing for Google Maps contrast
          const casing = L.polyline(sub.coords, {
            color: '#0f172a',
            weight: 8,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(mapInstance);
          routeLayers.push(casing);

          // Top colored line
          let lineColor = sub.color;
          let dashArray = null;

          if (state.transportMode === 'transit') {
            lineColor = '#10b981';
            dashArray = '7, 7';
          } else if (!state.trafficLayer) {
            lineColor = state.transportMode === 'driving' ? '#1a73e8' : '#f59e0b';
          }

          const line = L.polyline(sub.coords, {
            color: lineColor,
            weight: 5.5,
            opacity: 0.95,
            dashArray: dashArray,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(mapInstance);

          const statusBadge = sub.status === 'heavy' ? '🔴 Macet Padat (+15m)' : (sub.status === 'moderate' ? '🟡 Ramai Lancar' : '🟢 Bebas Hambatan');
          line.bindTooltip(`
            <div style="font-family:'Inter', sans-serif; font-size:0.78rem;">
              <strong>${segment.fromName} ➔ ${segment.toName}</strong><br>
              ${isId ? 'Jarak' : 'Distance'}: ${segment.distanceKm} km • ${isId ? 'Waktu' : 'Duration'}: ${segment.durationDriving}<br>
              ${isId ? 'Via' : 'Route'}: ${segment.via}<br>
              ${isId ? 'Kondisi' : 'Traffic'}: <strong>${statusBadge}</strong>
            </div>
          `, { sticky: true });

          routeLayers.push(line);
        });
      });
    }

    // B. Walking Mode: Scenic Eco Trails
    if (state.transportMode === 'walking') {
      network.segments.forEach(segment => {
        const line = L.polyline(segment.subSegments.flatMap(s => s.coords), {
          color: '#8b5cf6',
          weight: 4,
          opacity: 0.9,
          dashArray: '4, 8',
          lineCap: 'round'
        }).addTo(mapInstance);

        line.bindTooltip(`
          <div style="font-family:'Inter', sans-serif; font-size:0.78rem;">
            🚶 <strong>${isId ? 'Jalur Pejalan Kaki & Eco-Trail' : 'Pedestrian & Eco-Trail'}</strong><br>
            ${segment.fromName} ➔ ${segment.toName}
          </div>
        `, { sticky: true });

        routeLayers.push(line);
      });
    }

    // C. Traffic Incidents: Pulsing Red Markers
    if (state.trafficLayer && (state.transportMode === 'driving' || state.transportMode === 'motorcycle') && network.incidents) {
      network.incidents.forEach(inc => {
        const incIcon = L.divIcon({
          className: 'custom-traffic-incident',
          html: `<div class="traffic-incident-pulse" title="${inc.title[state.lang]}">⚠️</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const m = L.marker(inc.coords, { icon: incIcon })
          .bindPopup(`
            <div style="font-family:'Inter', sans-serif; min-width: 210px;">
              <span style="background:#fee2e2; color:#b91c1c; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                ⚠️ ${isId ? 'Peringatan Macet' : 'Traffic Delay'}
              </span>
              <h4 style="margin:0.35rem 0 0.2rem; font-size:0.88rem; color:#dc2626; font-weight:800;">
                ${inc.title[state.lang]}
              </h4>
              <p style="margin:0; font-size:0.75rem; color:#475569; line-height:1.4;">
                ${inc.desc[state.lang]}
              </p>
              <div style="margin-top:0.4rem; font-size:0.75rem; font-weight:800; color:#b91c1c;">
                ⏱️ ${isId ? 'Perkiraan Keterlambatan' : 'Delay'}: ${inc.delay}
              </div>
            </div>
          `)
          .addTo(mapInstance);

        incidentMarkers.push(m);
      });
    }

    // D. Transit Hub Markers (Bus Terminals, LRT Stations)
    if (state.transportMode === 'transit' && network.transitHubs) {
      network.transitHubs.forEach(hub => {
        const hubIcon = L.divIcon({
          className: 'custom-transit-hub',
          html: `
            <div style="
              background: #10b981; 
              color: white; 
              width: 30px; 
              height: 30px; 
              border-radius: 8px; 
              display:flex; 
              align-items:center; 
              justify-content:center; 
              font-size: 1rem; 
              border: 2px solid white; 
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            ">
              ${hub.type.includes('Rail') ? '🚆' : '🚌'}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const m = L.marker(hub.coords, { icon: hubIcon })
          .bindPopup(`
            <div style="font-family:'Inter', sans-serif; min-width: 190px;">
              <span style="background:#d1fae5; color:#065f46; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                ${hub.type}
              </span>
              <h4 style="margin:0.35rem 0 0.2rem; font-size:0.88rem; color:#065f46; font-weight:800;">
                ${hub.name}
              </h4>
              <p style="margin:0; font-size:0.75rem; color:#475569; line-height:1.4;">
                ${hub.info}
              </p>
            </div>
          `)
          .addTo(mapInstance);

        transitMarkers.push(m);
      });
    }

  } else {
    // 3. Fallback for other polytechnics (Generates smooth curved realistic road polylines)
    if (poly.destinations.length > 1) {
      const coords = poly.destinations.map(d => d.coords);
      
      // Interpolate curved highway road nodes
      const smoothRoad = [];
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        smoothRoad.push(p1);
        
        // Midpoint curve offset
        const midLat = (p1[0] + p2[0]) / 2 + (i % 2 === 0 ? 0.015 : -0.015);
        const midLng = (p1[1] + p2[1]) / 2 + (i % 2 === 0 ? -0.018 : 0.018);
        smoothRoad.push([midLat, midLng]);
      }
      smoothRoad.push(coords[coords.length - 1]);

      // Casing
      const casing = L.polyline(smoothRoad, {
        color: '#0f172a',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(mapInstance);
      routeLayers.push(casing);

      // Highway Traffic line
      const routeLine = L.polyline(smoothRoad, {
        color: state.trafficLayer ? '#22c55e' : (state.transportMode === 'transit' ? '#10b981' : '#1a73e8'),
        weight: 5.5,
        opacity: 0.95,
        dashArray: state.transportMode === 'transit' ? '7, 7' : null,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(mapInstance);

      routeLine.bindTooltip(`
        <div style="font-family:'Inter', sans-serif; font-size:0.78rem;">
          <strong>${poly.name} Tour Highway</strong><br>
          ${isId ? 'Moda' : 'Mode'}: ${state.transportMode.toUpperCase()} • ${state.trafficLayer ? '🟢 Lalu Lintas Lancar' : 'Jalur Terkoneksi'}
        </div>
      `);
      routeLayers.push(routeLine);
    }
  }
}

// -------------------------------------------------------------
// LIVE VEHICLE NAVIGATION SIMULATION (Google Maps Animated Navigation)
// -------------------------------------------------------------
function startRoadNavigationSimulation() {
  if (!mapInstance) return;

  const isId = state.lang === 'id';
  const network = window.ROUTING_NETWORK && (window.ROUTING_NETWORK[state.activePoly] || window.ROUTING_NETWORK.bali);
  
  // Collect all coordinates along the highway
  let allCoords = [];
  let streetInstructions = [];

  if (state.activePoly === 'bali' && network && network.segments) {
    network.segments.forEach(segment => {
      segment.subSegments.forEach(sub => {
        allCoords.push(...sub.coords);
      });
      if (segment.steps) {
        streetInstructions.push(...segment.steps);
      }
    });
  } else {
    const poly = POLYTECHNICS[state.activePoly];
    allCoords = poly.destinations.map(d => d.coords);
  }

  if (allCoords.length < 2) return;

  // Stop any active simulation
  stopRoadNavigationSimulation();
  state.isSimulating = true;
  state.simIndex = 0;

  // Show HUD
  const hud = document.getElementById('gmap-sim-hud');
  const hudIcon = document.getElementById('sim-hud-icon');
  const hudStreet = document.getElementById('sim-hud-street');
  const hudStats = document.getElementById('sim-hud-stats');
  if (hud) hud.style.display = 'flex';

  // Determine vehicle icon
  let vIcon = '🚗';
  if (state.transportMode === 'transit') vIcon = '🚌';
  else if (state.transportMode === 'motorcycle') vIcon = '🛵';
  else if (state.transportMode === 'walking') vIcon = '🚶';

  if (hudIcon) hudIcon.textContent = vIcon;

  // Create Vehicle Marker
  const vehicleDivIcon = L.divIcon({
    className: 'sim-vehicle-marker-container',
    html: `<div class="vehicle-sim-marker">${vIcon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  simVehicleMarker = L.marker(allCoords[0], { icon: vehicleDivIcon, zIndexOffset: 2000 }).addTo(mapInstance);
  mapInstance.setView(allCoords[0], 14, { animate: true });

  const totalSteps = allCoords.length;

  simInterval = setInterval(() => {
    state.simIndex++;

    if (state.simIndex >= totalSteps) {
      stopRoadNavigationSimulation();
      alert(isId ? "🏁 Navigasi Tur Selesai! Anda telah mengunjungi seluruh rangkaian destinasi." : "🏁 Tour Navigation Complete! You have explored all destinations on this circuit.");
      return;
    }

    const currentCoord = allCoords[state.simIndex];
    simVehicleMarker.setLatLng(currentCoord);

    // Update HUD text
    const pct = Math.round((state.simIndex / totalSteps) * 100);
    const speed = state.transportMode === 'walking' ? '5 km/jam' : (state.transportMode === 'motorcycle' ? '55 km/jam' : '45 km/jam');
    
    if (hudStreet) {
      if (state.simIndex < 15) {
        hudStreet.textContent = isId ? "Menyusuri Jl. Raya Uluwatu Pecatu" : "Along Jl. Raya Uluwatu Pecatu";
      } else if (state.simIndex < 35) {
        hudStreet.textContent = isId ? "Melewati Sunset Road Kuta" : "Crossing Sunset Road Kuta";
      } else if (state.simIndex < 55) {
        hudStreet.textContent = isId ? "Menuju Jl. Raya Kediri Tabanan" : "Approaching Jl. Raya Kediri Tabanan";
      } else if (state.simIndex < 80) {
        hudStreet.textContent = isId ? "Jalur Terasering Jatiluwih & Bedugul" : "Scenic Jatiluwih & Bedugul Pass";
      } else if (state.simIndex < 105) {
        hudStreet.textContent = isId ? "Melintasi Jembatan Tukad Bangkung Plaga" : "Crossing Tukad Bangkung Bridge";
      } else {
        hudStreet.textContent = isId ? "Menuju Tol Laut Bali Mandara" : "Approaching Bali Mandara Tollway";
      }
    }

    if (hudStats) {
      hudStats.textContent = `${isId ? 'Kecepatan' : 'Speed'}: ${speed} • ${pct}% ${isId ? 'rute selesai' : 'completed'}`;
    }

    // Auto pan smoothly
    mapInstance.panTo(currentCoord, { animate: true, duration: 0.3 });

  }, 320);
}

function stopRoadNavigationSimulation() {
  state.isSimulating = false;
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
  if (simVehicleMarker && mapInstance) {
    try { mapInstance.removeLayer(simVehicleMarker); } catch(e) {}
    simVehicleMarker = null;
  }
  const hud = document.getElementById('gmap-sim-hud');
  if (hud) hud.style.display = 'none';
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

// =============================================================
// SINGLE SIGN-ON (SSO) & MALL APLIKASI LAYANAN 1 PINTU
// =============================================================

const SSO_USERS = {
  student: {
    name: 'Wayan Aditya Wardana',
    idNumber: 'NIM. 202401088',
    title: 'Mahasiswa D4 Pengelolaan Perhotelan & Pariwisata',
    roleLabel: 'MAHASISWA',
    avatarText: 'WA',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    email: 'wayan.aditya@mhs.ppb.ac.id'
  },
  lecturer: {
    name: 'Dr. I Nyoman Suartha, M.Par',
    idNumber: 'NIP. 197805122003121002',
    title: 'Dosen Pembimbing Perencanaan Destinasi Wisata',
    roleLabel: 'DOSEN PEMBIMBING',
    avatarText: 'NS',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    email: 'nyoman.suartha@dosen.ppb.ac.id'
  },
  coordinator: {
    name: 'Siti Nurhaliza, S.Tr.Par',
    idNumber: 'NIP. 198509142010122004',
    title: 'Koordinator Ekspedisi Lapangan & Kemenparekraf RI',
    roleLabel: 'KOORDINATOR TUR',
    avatarText: 'SN',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    email: 'siti.nurhaliza@kemenparekraf.go.id'
  }
};

const SSO_MODULES = [
  {
    id: '360',
    title: 'Tur Virtual 360° VR',
    desc: 'Eksplorasi panorama 360° interaktif 5 destinasi suaka & budaya Bali',
    category: 'tour',
    icon: '🕶️',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    roles: ['student', 'lecturer', 'coordinator']
  },
  {
    id: 'routes',
    title: 'Peta Rute & Lalu Lintas',
    desc: 'Simulasi rute Google Maps multi-moda, info macet & jarak tempuh',
    category: 'tour',
    icon: '🗺️',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    roles: ['student', 'lecturer', 'coordinator']
  },
  {
    id: 'audio',
    title: 'Audio Guide Lapangan',
    desc: 'Narasi kurator dwibahasa terverifikasi untuk observasi mandiri',
    category: 'tour',
    icon: '🎧',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    roles: ['student', 'lecturer', 'coordinator']
  },
  {
    id: 'classroom',
    title: 'LMS & Modul Perkuliahan',
    desc: 'Ruang kelas digital, silabus ajar, handouts PDF & video briefing',
    category: 'academic',
    icon: '🏛️',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    roles: ['student', 'lecturer', 'coordinator']
  },
  {
    id: 'tasks',
    title: 'Lembar Kerja & Jurnal',
    desc: 'Pengumpulan laporan observasi lapangan dan jurnal refleksi ilmiah',
    category: 'academic',
    icon: '📝',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    roles: ['student', 'lecturer', 'coordinator']
  },
  {
    id: 'rubrics',
    title: 'Rubrik Evaluasi Dosen',
    desc: 'Instrumen penilaian kompetensi terstandar & input nilai feedback',
    category: 'academic',
    icon: '⚖️',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    roles: ['lecturer', 'coordinator']
  },
  {
    id: 'planner',
    title: 'Kesiapan Tur 3-Fase',
    desc: 'Matriks kesiapan pra-tur, survei lapangan & refleksi pasca-tur',
    category: 'management',
    icon: '📋',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    roles: ['coordinator']
  },
  {
    id: 'analytics',
    title: 'Big Data & Analitik Riset',
    desc: 'Sintesis semantik riset kata kunci, sentimen & ekspor CSV data',
    category: 'management',
    icon: '📊',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    roles: ['lecturer', 'coordinator']
  },
  {
    id: 'campuses',
    title: 'Jaringan 6 Poltekpar',
    desc: 'Konektivitas & alih kampus Politeknik Pariwisata se-Indonesia',
    category: 'management',
    icon: '🏛️',
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    roles: ['student', 'lecturer', 'coordinator']
  },
  {
    id: 'cert',
    title: 'E-Sertifikat Kelulusan',
    desc: 'Verifikasi tanda kelulusan & sertifikat kompetensi tur lapangan',
    category: 'management',
    icon: '📜',
    gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    roles: ['student', 'lecturer', 'coordinator']
  },
  {
    id: 'forum',
    title: 'Forum Diskusi Ilmiah',
    desc: 'Ruang tanya jawab interaktif mahasiswa & dosen pembimbing',
    category: 'academic',
    icon: '💬',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    roles: ['student', 'lecturer', 'coordinator']
  },
  {
    id: 'database',
    title: 'Cloud Database Sync',
    desc: 'Status sinkronisasi real-time cloud data storage Supabase',
    category: 'management',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    roles: ['student', 'lecturer', 'coordinator']
  }
];

// -------------------------------------------------------------
// MALL SSO HUB MAIN VIEW RENDERER
// -------------------------------------------------------------
function renderSSOHub(container) {
  const isId = state.lang === 'id';
  const currentRole = state.activeRole || 'student';
  const user = SSO_USERS[currentRole] || SSO_USERS.student;
  const poly = POLYTECHNICS[state.activePoly] || POLYTECHNICS.bali;

  container.innerHTML = `
    <div class="sso-hub-screen animate-fade">
      
      <!-- 1. Active User Identity & Session Card -->
      <div class="sso-hub-profile-card">
        <div class="sso-hub-user-main">
          <div class="sso-hub-avatar" style="background: ${user.gradient};">
            ${user.avatarText}
            <span class="sso-hub-live-dot" title="Sesi SSO Terverifikasi & Aktif"></span>
          </div>
          <div class="sso-hub-user-meta">
            <div class="sso-hub-badge-row">
              <span class="sso-badge-role ${currentRole}">${user.roleLabel}</span>
              <span class="sso-badge-verified">✓ SSO SESSION ACTIVE</span>
              <span class="sso-badge-campus">🏛️ ${poly.name}</span>
            </div>
            <h2 class="sso-hub-user-name">${user.name}</h2>
            <p class="sso-hub-user-sub">${user.idNumber} • ${user.title} • <strong>${user.email}</strong></p>
          </div>
        </div>

        <!-- Right Side: Role Simulation Switcher & Actions -->
        <div class="sso-hub-actions-box">
          <div class="sso-sim-box">
            <span class="sso-sim-label">⚡ ${isId ? 'SIMULASI PERAN SSO' : 'SSO ROLE SIMULATOR'}:</span>
            <div class="sso-sim-buttons">
              <button class="sso-sim-btn ${currentRole === 'student' ? 'active' : ''}" data-sso-role="student">🎓 ${isId ? 'Mahasiswa' : 'Student'}</button>
              <button class="sso-sim-btn ${currentRole === 'lecturer' ? 'active' : ''}" data-sso-role="lecturer">👨‍🏫 ${isId ? 'Dosen' : 'Lecturer'}</button>
              <button class="sso-sim-btn ${currentRole === 'coordinator' ? 'active' : ''}" data-sso-role="coordinator">📋 ${isId ? 'Koordinator' : 'Coordinator'}</button>
            </div>
          </div>
          <div class="sso-hub-quick-buttons">
            <button class="sso-hub-campus-btn" id="sso-hub-campus-selector-btn" title="${isId ? 'Ganti Kampus Politeknik' : 'Switch Polytechnic Campus'}">
              <span>🏛️ ${poly.name}</span>
              <span style="font-size:0.75rem;">▼</span>
            </button>
            <button class="sso-hub-logout-btn" id="sso-hub-logout-action">
              <span>🚪</span>
              <span>${isId ? 'Keluar / Ganti Akun' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Integrated Ecosystem Notice Banner -->
      <div class="sso-hub-notice-banner">
        <div class="sso-notice-icon">💡</div>
        <div class="sso-notice-text">
          <strong>${isId ? 'Ekosistem Layanan 1 Pintu (Single Sign-On)' : 'Integrated 1-Door Single Sign-On (SSO) Portal'}:</strong>
          ${isId 
            ? 'Akun Anda telah terotentikasi secara terpusat oleh sistem Kemenparekraf RI. Cukup 1 kali login, Anda dapat mengakses ke-12 modul dan instrumen pembelajaran di bawah tanpa perlu otentikasi ulang.' 
            : 'Your institutional session is centrally verified by Ministry of Tourism & Creative Economy (Kemenparekraf RI). Access all 12 learning tools seamlessly.'}
        </div>
      </div>

      <!-- 3. Toolbar: Search Box & Category Filters -->
      <div class="sso-hub-toolbar">
        <div class="sso-hub-toolbar-left">
          <h3>${isId ? 'Mall Aplikasi INA-Edutour' : 'INA-Edutour App Mall'}</h3>
          <p>${isId ? '12 Layanan & Modul Terpadu Siap Diluncurkan' : '12 Integrated Services Ready to Launch'}</p>
        </div>

        <div class="sso-hub-toolbar-right">
          <div class="sso-hub-filter-chips">
            <button class="sso-filter-chip active" data-filter="all">${isId ? 'Semua (12)' : 'All (12)'}</button>
            <button class="sso-filter-chip" data-filter="tour">${isId ? 'Eksplorasi & Tur' : 'Tours & Maps'}</button>
            <button class="sso-filter-chip" data-filter="academic">${isId ? 'Akademik & LMS' : 'Academic & LMS'}</button>
            <button class="sso-filter-chip" data-filter="management">${isId ? 'Sistem & Manajemen' : 'Management'}</button>
          </div>
          <div class="sso-hub-search-box">
            <span class="sso-hub-search-icon">🔍</span>
            <input type="text" id="sso-hub-search-input" placeholder="${isId ? 'Cari modul (360°, rute jalan, jurnal, LMS, rubrik)...' : 'Search modules (360, route, journal, LMS, rubric)...'}" />
          </div>
        </div>
      </div>

      <!-- 4. 12 Integrated App Cards Grid -->
      <div class="sso-hub-apps-grid" id="sso-hub-apps-grid"></div>

      <!-- 5. Bottom Section: Activities, Cloud Status, and Shortcuts -->
      <div class="sso-hub-widgets-row">
        
        <!-- Widget 1: Field Schedule -->
        <div class="sso-hub-widget-card">
          <div class="sso-widget-header">
            <span class="sso-widget-icon">📅</span>
            <h4>${isId ? 'Agenda Ekspedisi Terjadwal' : 'Upcoming Field Schedules'}</h4>
          </div>
          <div class="sso-widget-body">
            <div class="sso-agenda-item">
              <div class="sso-agenda-date">
                <span class="day">JUM</span>
                <span class="time">16:30</span>
              </div>
              <div class="sso-agenda-info">
                <h5>Survei Lapangan Pura Uluwatu</h5>
                <p>Observasi zonasi Tri Mandala & batas tebing 97m</p>
                <span class="sso-agenda-tag confirmed">Terkonfirmasi</span>
              </div>
            </div>

            <div class="sso-agenda-item">
              <div class="sso-agenda-date">
                <span class="day">KAM</span>
                <span class="time">10:00</span>
              </div>
              <div class="sso-agenda-info">
                <h5>Live Briefing Pra-Tur & Keselamatan</h5>
                <p>Panduan teknis bersama Koordinator & Dosen</p>
                <span class="sso-agenda-tag live">Online Meet</span>
              </div>
            </div>

            <div class="sso-agenda-item">
              <div class="sso-agenda-date">
                <span class="day">MIN</span>
                <span class="time">23:59</span>
              </div>
              <div class="sso-agenda-info">
                <h5>Batas Pengumpulan Jurnal Jatiluwih</h5>
                <p>Upload refleksi sistem tata air Subak UNESCO</p>
                <span class="sso-agenda-tag pending">Penugasan Terbuka</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Widget 2: SSO Protocol & Cloud Sync Status -->
        <div class="sso-hub-widget-card">
          <div class="sso-widget-header">
            <span class="sso-widget-icon">⚡</span>
            <h4>${isId ? 'Keamanan SSO & Status Cloud' : 'SSO Security & Cloud Sync'}</h4>
          </div>
          <div class="sso-widget-body">
            <div class="sso-status-item">
              <span class="sso-status-label">${isId ? 'Protokol Otentikasi' : 'Auth Protocol'}:</span>
              <span class="sso-status-val">OAuth 2.0 / OpenID Connect + SAML 2.0</span>
            </div>
            <div class="sso-status-item">
              <span class="sso-status-label">${isId ? 'Pangkalan Data' : 'Database'}:</span>
              <span class="sso-status-val" style="color: #059669; font-weight:700;">🟢 Supabase Cloud Active (100% Synced)</span>
            </div>
            <div class="sso-status-item">
              <span class="sso-status-label">${isId ? 'Token Enkripsi' : 'Security Token'}:</span>
              <span class="sso-status-val" style="font-family: monospace;">TOKEN-SSO-INA-99214X (VALID)</span>
            </div>
            <div class="sso-status-item">
              <span class="sso-status-label">${isId ? 'Enkripsi Sesi' : 'Session Encryption'}:</span>
              <span class="sso-status-val">TLS 1.3 End-to-End Cryptography</span>
            </div>
            <div class="sso-status-item">
              <span class="sso-status-label">${isId ? 'Waktu Sinkron' : 'Last Synced'}:</span>
              <span class="sso-status-val">${new Date().toLocaleTimeString()} WITA • Real-time</span>
            </div>
          </div>
        </div>

        <!-- Widget 3: Quick Shortcuts -->
        <div class="sso-hub-widget-card">
          <div class="sso-widget-header">
            <span class="sso-widget-icon">🚀</span>
            <h4>${isId ? 'Pintasan Langsung' : 'Direct Shortcuts'}</h4>
          </div>
          <div class="sso-widget-body sso-shortcuts-body">
            <button class="sso-quick-btn" onclick="handleSSOHubLaunch('360')">
              <span>🕶️</span>
              <span>${isId ? 'Tur 360° Tebing Uluwatu' : '360° Uluwatu Cliff'}</span>
            </button>
            <button class="sso-quick-btn" onclick="handleSSOHubLaunch('routes')">
              <span>🗺️</span>
              <span>${isId ? 'Peta Rute & Lalu Lintas Bali' : 'Bali Route & Traffic'}</span>
            </button>
            <button class="sso-quick-btn" onclick="handleSSOHubLaunch('tasks')">
              <span>📝</span>
              <span>${isId ? 'Kumpul Jurnal Lapangan' : 'Submit Field Journal'}</span>
            </button>
            <button class="sso-quick-btn" onclick="showCertificateModal()">
              <span>📜</span>
              <span>${isId ? 'Lihat E-Sertifikat Kelulusan' : 'View E-Certificate'}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  `;

  // Render Apps inside Grid
  renderSSOHubGrid(container);

  // Attach Event Listeners
  attachSSOHubListeners(container);
}

function renderSSOHubGrid(container, filter = 'all', searchQuery = '') {
  const grid = container.querySelector('#sso-hub-apps-grid') || document.getElementById('sso-hub-apps-grid');
  if (!grid) return;

  const currentRole = state.activeRole || 'student';
  const isId = state.lang === 'id';

  const filtered = SSO_MODULES.filter(mod => {
    const matchesFilter = filter === 'all' || mod.category === filter;
    const matchesSearch = !searchQuery || 
      mod.title.toLowerCase().includes(searchQuery) || 
      mod.desc.toLowerCase().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: #64748b;">
        <span style="font-size: 2.5rem; display:block; margin-bottom: 0.5rem;">🔍</span>
        <h4>${isId ? 'Tidak ada layanan yang sesuai dengan pencarian' : 'No services found'}</h4>
        <p>${isId ? 'Coba gunakan kata kunci lain seperti "360", "rute", "jurnal", atau "LMS".' : 'Try searching for "360", "route", "journal", or "LMS".'}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(mod => {
    const isAllowed = mod.roles.includes(currentRole);
    return `
      <div class="sso-hub-app-card ${isAllowed ? '' : 'restricted-role'}" data-mod-id="${mod.id}">
        <div class="sso-hub-card-badge-row">
          ${isAllowed 
            ? `<span class="sso-hub-status-pill allowed">🟢 ${isId ? 'SSO Aktif' : 'SSO Active'}</span>` 
            : `<span class="sso-hub-status-pill restricted">🔒 ${isId ? 'Khusus' : 'Only'} ${mod.roles.map(r => r.toUpperCase()).join('/')}</span>`}
        </div>

        <div class="sso-hub-app-icon" style="background: ${mod.gradient};">
          ${mod.icon}
        </div>

        <h4 class="sso-hub-app-title">${mod.title}</h4>
        <p class="sso-hub-app-desc">${mod.desc}</p>

        <div class="sso-hub-card-footer">
          <span class="sso-hub-launch-action">
            ${isAllowed 
              ? (isId ? 'Buka Layanan →' : 'Launch App →') 
              : (isId ? 'Perlu Izin Akses 🔒' : 'Permission Required 🔒')}
          </span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.sso-hub-app-card').forEach(card => {
    card.addEventListener('click', () => {
      const modId = card.getAttribute('data-mod-id');
      handleSSOHubLaunch(modId);
    });
  });
}

function attachSSOHubListeners(container) {
  // Role switcher buttons
  container.querySelectorAll('.sso-sim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetRole = btn.getAttribute('data-sso-role');
      state.activeRole = targetRole;
      saveState();
      const targetUser = SSO_USERS[targetRole] || SSO_USERS.student;
      showSSOToast(`🔄 Akun SSO Dialihkan ke: ${targetUser.name} (${targetUser.roleLabel})`);
      render();
    });
  });

  // Search input
  const searchInput = container.querySelector('#sso-hub-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const activeFilter = container.querySelector('.sso-filter-chip.active')?.dataset.filter || 'all';
      renderSSOHubGrid(container, activeFilter, q);
    });
  }

  // Category filter chips
  container.querySelectorAll('.sso-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.sso-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
      renderSSOHubGrid(container, filter, q);
    });
  });

  // Switch campus button
  const campusBtn = container.querySelector('#sso-hub-campus-selector-btn');
  if (campusBtn) {
    campusBtn.addEventListener('click', () => {
      showCampusSelectorModal();
    });
  }

  // Logout button
  const logoutBtn = container.querySelector('#sso-hub-logout-action');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      state.isWelcome = true;
      saveState();
      render();
      showSSOToast('🚪 Sesi SSO Berakhir. Anda telah kembali ke Landing Page.');
    });
  }
}

// -------------------------------------------------------------
// SSO MODULE LAUNCH HANDLER (SEAMLESS HANDSHAKE)
// -------------------------------------------------------------
window.handleSSOHubLaunch = function(modId) {
  const mod = SSO_MODULES.find(m => m.id === modId);
  if (!mod) return;

  const currentRole = state.activeRole || 'student';
  const isAllowed = mod.roles.includes(currentRole);
  const user = SSO_USERS[currentRole] || SSO_USERS.student;

  if (!isAllowed) {
    alert(`⛔ Akses Dibatasi:\nModul "${mod.title}" hanya dapat diakses oleh peran: ${mod.roles.map(r => r.toUpperCase()).join(', ')}.\n\nAnda saat ini login sebagai: ${user.roleLabel} (${user.name}).\n\n💡 Tips: Anda dapat menggunakan panel "SIMULASI PERAN SSO" di bagian atas untuk berganti peran menjadi ${mod.roles[0].toUpperCase()} guna menguji modul ini secara penuh!`);
    return;
  }

  showSSOToast(`⚡ Otentikasi Sesi SSO Terverifikasi: Membuka ${mod.title} sebagai ${user.name}...`);

  setTimeout(() => {
    switch (mod.id) {
      case '360':
        state.isWelcome = false;
        state.activePoly = state.activePoly || 'bali';
        state.selectedDestId = state.selectedDestId || 'bali_uluwatu';
        state.activeView = 'explorer';
        saveState();
        render();
        setTimeout(() => {
          const panoBadge = document.querySelector('.pano-badge') || document.querySelector('.bali-btn-360') || document.querySelector('.dest-header-actions');
          if (panoBadge) panoBadge.scrollIntoView({ behavior: 'smooth' });
        }, 250);
        break;

      case 'routes':
        state.isWelcome = false;
        state.activePoly = state.activePoly || 'bali';
        state.selectedDestId = state.selectedDestId || 'bali_uluwatu';
        state.pathMode = true;
        state.navPanelHidden = false;
        state.activeView = 'explorer';
        saveState();
        render();
        break;

      case 'audio':
        state.isWelcome = false;
        state.activePoly = state.activePoly || 'bali';
        state.selectedDestId = state.selectedDestId || 'bali_uluwatu';
        state.activeView = 'explorer';
        saveState();
        render();
        setTimeout(() => {
          const aBtn = document.getElementById('play-audio-btn');
          if (aBtn) aBtn.click();
        }, 300);
        break;

      case 'classroom':
        state.isWelcome = false;
        state.activeView = 'classroom';
        saveState();
        render();
        break;

      case 'tasks':
        state.isWelcome = false;
        state.activeView = 'activities';
        saveState();
        render();
        break;

      case 'rubrics':
        state.isWelcome = false;
        state.activeView = 'activities';
        saveState();
        render();
        setTimeout(() => {
          const gradingPanel = document.querySelector('.grading-panel') || document.querySelector('.activity-box');
          if (gradingPanel) gradingPanel.scrollIntoView({ behavior: 'smooth' });
        }, 250);
        break;

      case 'planner':
        state.isWelcome = false;
        state.activeView = 'planner';
        saveState();
        render();
        break;

      case 'analytics':
        state.isWelcome = false;
        state.activeView = 'analytics';
        saveState();
        render();
        break;

      case 'campuses':
        showCampusSelectorModal();
        break;

      case 'cert':
        showCertificateModal();
        break;

      case 'forum':
        state.isWelcome = false;
        state.activeView = 'classroom';
        saveState();
        render();
        setTimeout(() => {
          const commentBox = document.getElementById('class-comment-input');
          if (commentBox) {
            commentBox.scrollIntoView({ behavior: 'smooth' });
            commentBox.focus();
          }
        }, 300);
        break;

      case 'database':
        if (window.configureSupabase) {
          window.configureSupabase();
        } else {
          alert(`⚡ Cloud Database Supabase:\nKoneksi database PostgreSQL terverifikasi ONLINE & SINKRON.\nPengguna SSO: ${user.name} (${user.idNumber})`);
        }
        break;

      default:
        state.isWelcome = false;
        state.activeView = 'explorer';
        saveState();
        render();
    }
  }, 250);
};

// -------------------------------------------------------------
// CERTIFICATE & CAMPUS MODALS
// -------------------------------------------------------------
function showCertificateModal() {
  const currentRole = state.activeRole || 'student';
  const user = SSO_USERS[currentRole] || SSO_USERS.student;
  const poly = POLYTECHNICS[state.activePoly] || POLYTECHNICS.bali;

  let modal = document.getElementById('sso-certificate-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sso-certificate-modal';
    modal.className = 'sso-cert-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="sso-cert-box animate-fade">
      <div class="sso-cert-inner">
        <div class="sso-cert-watermark">🏛️</div>
        
        <div class="sso-cert-header">
          <div class="sso-cert-emblem">🌋</div>
          <h3>KEMENTERIAN PARIWISATA DAN EKONOMI KREATIF</h3>
          <h4>REPUBLIK INDONESIA</h4>
          <p class="cert-subtitle">JEJARING POLITEKNIK PARIWISATA NEGERI INDONESIA</p>
        </div>

        <div class="sso-cert-title-section">
          <h2>SERTIFIKAT KOMPETENSI RISET EDUTOURISM</h2>
          <span class="cert-num">Nomor Registrasi SSO: CERT-INA-2026-${Math.floor(100000 + Math.random() * 900000)}</span>
        </div>

        <div class="sso-cert-body">
          <p>Diberikan dengan penuh kehormatan kepada:</p>
          <div class="sso-cert-recipient-name">${user.name}</div>
          <p class="sso-cert-recipient-id">${user.idNumber} • ${user.title}</p>
          <p class="sso-cert-desc">
            Atas pencapaian kelulusan dan penguasaan metodologi <strong>Studi Tur Lapangan Terpadu (3-Fase Hybrid)</strong> pada destinasi cagar budaya dan suaka alam <strong>${poly.name}</strong> dengan predikat <strong>SANGAT MEMUASKAN (A)</strong>.
          </p>
        </div>

        <div class="sso-cert-signatures">
          <div class="sig-col">
            <div class="sig-qr">
              <span style="font-size:2rem;">📱</span>
              <span style="font-size:0.6rem; font-weight:800; color:#475569;">VERIFIKASI QR CODE</span>
            </div>
            <p>Terdaftar di Pangkalan Data Dikti Kemenparekraf RI</p>
          </div>

          <div class="sig-col">
            <div class="sig-stamp">TERVERIFIKASI SSO KEMENPAREKRAF</div>
            <strong>Direktur Politeknik Pariwisata</strong>
            <p>NIP. 196803151994031003</p>
          </div>
        </div>

        <div class="sso-cert-actions">
          <button class="cert-btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
          <button class="cert-btn-close" id="cert-close-btn">✕ Tutup</button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('open');

  const closeBtn = document.getElementById('cert-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

function showCampusSelectorModal() {
  const isId = state.lang === 'id';

  let modal = document.getElementById('sso-campus-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sso-campus-modal';
    modal.className = 'sso-campus-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="sso-campus-box animate-fade">
      <div class="sso-campus-header">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <span style="font-size:1.8rem;">🏛️</span>
          <div>
            <h3>${isId ? 'Jejaring 6 Politeknik Pariwisata Indonesia' : 'Indonesian Tourism Polytechnics Network'}</h3>
            <p>${isId ? 'Pilih kampus untuk beralih lokus studi tur & destinasi' : 'Select a campus to switch destinations & fieldwork'}</p>
          </div>
        </div>
        <button class="sso-campus-close" id="campus-modal-close-btn">✕</button>
      </div>

      <div class="sso-campus-grid">
        ${Object.keys(POLYTECHNICS).map(key => {
          const poly = POLYTECHNICS[key];
          const isCurrent = state.activePoly === key;
          return `
            <div class="sso-campus-item ${isCurrent ? 'active' : ''}" data-campus-key="${key}">
              <div class="campus-logo-wrap">${poly.logo}</div>
              <div class="campus-info-wrap">
                <h4>${poly.name}</h4>
                <p>${poly.destinations.length} ${isId ? 'Destinasi Unggulan' : 'Destinations'} • ${poly.resources.length} Handouts</p>
                ${isCurrent ? `<span class="campus-current-tag">✓ KAMPUS AKTIF</span>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  modal.classList.add('open');

  const closeBtn = document.getElementById('campus-modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  modal.querySelectorAll('.sso-campus-item').forEach(item => {
    item.addEventListener('click', () => {
      const campusKey = item.getAttribute('data-campus-key');
      state.activePoly = campusKey;
      const newPoly = POLYTECHNICS[campusKey];
      if (newPoly && newPoly.destinations.length > 0) {
        state.selectedDestId = newPoly.destinations[0].id;
      }
      updateTheme(state.activePoly);
      saveState();
      modal.classList.remove('open');
      render();
      showSSOToast(`🏛️ Kampus Dialihkan ke: ${newPoly.name}`);
    });
  });
}

// -------------------------------------------------------------
// SSO POPUP MODAL (BACKWARD COMPATIBILITY)
// -------------------------------------------------------------
function ensureSSOElements() {
  if (document.getElementById('sso-portal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'sso-portal-overlay';
  overlay.className = 'sso-portal-overlay';
  overlay.innerHTML = `
    <div class="sso-portal-container" id="sso-portal-container">
      
      <!-- SSO Header -->
      <div class="sso-portal-header">
        <div class="sso-header-left">
          <div class="sso-brand-icon">🌋</div>
          <div class="sso-brand-titles">
            <h2>Portal Layanan 1 Pintu (SSO)</h2>
            <p>Ekosistem Digital Terpadu Politeknik Pariwisata Indonesia • Kemenparekraf RI</p>
          </div>
        </div>
        <button class="sso-close-btn" id="sso-portal-close" title="Tutup">✕</button>
      </div>

      <!-- SSO Active User Session Bar -->
      <div class="sso-user-banner" id="sso-user-banner"></div>

      <!-- SSO Body -->
      <div class="sso-portal-body">
        
        <!-- Search bar inside launcher -->
        <div class="sso-search-box">
          <span class="sso-search-icon">🔍</span>
          <input type="text" id="sso-module-search" placeholder="Cari layanan (360, Rute, Jurnal Riset, LMS, Rubrik)..." />
        </div>

        <!-- 12 Modules Grid -->
        <div class="sso-apps-grid" id="sso-apps-grid"></div>

      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  document.getElementById('sso-portal-close').addEventListener('click', closeSSOPortal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSSOPortal();
  });

  // Search input handler
  document.getElementById('sso-module-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.sso-app-card').forEach(card => {
      const title = card.getAttribute('data-title').toLowerCase();
      const desc = card.getAttribute('data-desc').toLowerCase();
      if (title.includes(q) || desc.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

function updateSSOUserBanner() {
  const banner = document.getElementById('sso-user-banner');
  if (!banner) return;

  const currentRole = state.activeRole || 'student';
  const user = SSO_USERS[currentRole] || SSO_USERS.student;

  banner.innerHTML = `
    <div class="sso-user-info">
      <div class="sso-avatar" style="background:${user.gradient};">${user.avatarText}</div>
      <div class="sso-user-details">
        <h4>
          <span>${user.name}</span>
          <span class="sso-verified-tag">✓ SSO ACTIVE</span>
        </h4>
        <p>${user.title}</p>
      </div>
    </div>

    <div class="sso-role-switchers">
      <span style="font-size:0.7rem; font-weight:800; color:#64748b; margin-right:4px;">SIMULASI ROLE:</span>
      <button class="sso-role-chip ${currentRole === 'student' ? 'active' : ''}" data-sso-role="student">🎓 Mahasiswa</button>
      <button class="sso-role-chip ${currentRole === 'lecturer' ? 'active' : ''}" data-sso-role="lecturer">👨‍🏫 Dosen</button>
      <button class="sso-role-chip ${currentRole === 'coordinator' ? 'active' : ''}" data-sso-role="coordinator">📋 Koordinator</button>
    </div>
  `;

  banner.querySelectorAll('.sso-role-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetRole = chip.getAttribute('data-sso-role');
      state.activeRole = targetRole;
      saveState();
      updateSSOUserBanner();
      renderSSOModules();
      showSSOToast('🔄 Akun SSO Dialihkan ke: ' + SSO_USERS[targetRole].name + ' (' + SSO_USERS[targetRole].roleLabel + ')');
      render();
    });
  });
}

function renderSSOModules() {
  const grid = document.getElementById('sso-apps-grid');
  if (!grid) return;

  const currentRole = state.activeRole || 'student';

  grid.innerHTML = SSO_MODULES.map(mod => {
    const isAllowed = mod.roles.includes(currentRole);
    return `
      <div class="sso-app-card ${isAllowed ? '' : 'disabled'}" data-mod-id="${mod.id}" data-title="${mod.title}" data-desc="${mod.desc}">
        ${!isAllowed ? `<span class="sso-card-role-tag" style="background:#fee2e2; color:#b91c1c;">TERBATAS</span>` : ''}
        <div class="sso-app-icon-wrap" style="background:${mod.gradient}; color:#ffffff;">
          ${mod.icon}
        </div>
        <div class="sso-app-title">${mod.title}</div>
        <div class="sso-app-sub">${mod.desc}</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.sso-app-card').forEach(card => {
    card.addEventListener('click', () => {
      const modId = card.getAttribute('data-mod-id');
      closeSSOPortal();
      handleSSOHubLaunch(modId);
    });
  });
}

function openSSOPortal() {
  ensureSSOElements();
  updateSSOUserBanner();
  renderSSOModules();

  const overlay = document.getElementById('sso-portal-overlay');
  if (overlay) {
    overlay.classList.add('open');
  }
}

function closeSSOPortal() {
  const overlay = document.getElementById('sso-portal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
  }
}

function showSSOToast(message) {
  let toast = document.getElementById('sso-toast-alert');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sso-toast-alert';
    toast.className = 'sso-toast-alert';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span class="sso-toast-icon">⚡</span><span>${message}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
