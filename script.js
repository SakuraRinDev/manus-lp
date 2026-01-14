// ========================================
// Manus Works Collection - LP Scripts
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all animations and interactions
  initScrollAnimations();
  initSmoothScroll();
  initNavbarScroll();
  initHeroAnimation();
});

// Scroll-triggered fade-in animations
function initScrollAnimations() {
  // Add fade-in class to animatable elements
  const animatableElements = [
    '.about-text',
    '.about-stats',
    '.work-card',
    '.timeline-item',
    '.join-content',
    '.section-header'
  ];

  animatableElements.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.classList.add('fade-in');
    });
  });

  // Create intersection observer
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all fade-in elements
  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });
}

// Smooth scrolling for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const navHeight = document.querySelector('.nav').offsetHeight;
        const targetPosition = targetElement.offsetTop - navHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Navbar background change on scroll
function initNavbarScroll() {
  const nav = document.querySelector('.nav');
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    // Add/remove shadow based on scroll position
    if (currentScrollY > 50) {
      nav.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.05)';
    } else {
      nav.style.boxShadow = 'none';
    }

    // Hide/show navbar on scroll direction
    if (currentScrollY > lastScrollY && currentScrollY > 200) {
      nav.style.transform = 'translateY(-100%)';
    } else {
      nav.style.transform = 'translateY(0)';
    }

    lastScrollY = currentScrollY;
  });

  // Add transition for smooth hide/show
  nav.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
}

// Hero section entrance animation
function initHeroAnimation() {
  const heroContent = document.querySelector('.hero-content');
  const titleLines = document.querySelectorAll('.hero-title-line');
  const heroLabel = document.querySelector('.hero-label');
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const heroCta = document.querySelector('.hero-cta');

  // Set initial states
  heroLabel.style.opacity = '0';
  heroLabel.style.transform = 'translateY(20px)';
  heroSubtitle.style.opacity = '0';
  heroSubtitle.style.transform = 'translateY(20px)';
  heroCta.style.opacity = '0';
  heroCta.style.transform = 'translateY(20px)';

  titleLines.forEach(line => {
    line.style.opacity = '0';
    line.style.transform = 'translateY(100%)';
  });

  // Animate in sequence
  setTimeout(() => {
    heroLabel.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    heroLabel.style.opacity = '1';
    heroLabel.style.transform = 'translateY(0)';
  }, 200);

  titleLines.forEach((line, index) => {
    setTimeout(() => {
      line.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      line.style.opacity = '1';
      line.style.transform = 'translateY(0)';
    }, 400 + (index * 150));
  });

  setTimeout(() => {
    heroSubtitle.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    heroSubtitle.style.opacity = '1';
    heroSubtitle.style.transform = 'translateY(0)';
  }, 1000);

  setTimeout(() => {
    heroCta.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    heroCta.style.opacity = '1';
    heroCta.style.transform = 'translateY(0)';
  }, 1200);
}

// Add stagger delay to work cards
function initWorkCardsAnimation() {
  const cards = document.querySelectorAll('.work-card');
  cards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
  });
}

// Parallax effect for hero visual
function initParallax() {
  const heroVisual = document.querySelector('.hero-visual');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
      heroVisual.style.transform = `translateY(calc(-50% + ${scrollY * 0.3}px))`;
    }
  });
}

// Initialize parallax
initParallax();

// ========================================
// Gallery Module
// ========================================

// Configuration
const GALLERY_CONFIG = {
  // Google Apps Script Web App URL (set after deployment)
  API_URL: 'https://script.google.com/macros/s/AKfycbzi7loloNHdYq59NXkfth2T1elyVsdCz9zXlu2mYeysEqkD7SCgsdUkFDRXiOhKkhH8/exec',
  // Category mapping
  categories: {
    'apps': 'Apps & Tools',
    'documents': 'Documents',
    'data': 'Data & Analysis',
    'creative': 'Creative',
    'others': 'Others'
  },
  // Demo mode - set to true to show sample data when API_URL is empty
  demoMode: false
};

// Sample data for demo mode
const DEMO_WORKS = [
  {
    id: 1,
    title: 'Market Research Dashboard',
    author: 'Demo User',
    category: 'data',
    description: 'Manusを使って作成した市場調査ダッシュボード。競合分析と市場トレンドを自動で可視化します。',
    imageUrl: '',
    workUrl: '',
    manusUrl: ''
  },
  {
    id: 2,
    title: 'Auto Report Generator',
    author: 'Demo User',
    category: 'apps',
    description: 'データを入力すると自動でレポートを生成するWebアプリケーション。',
    imageUrl: '',
    workUrl: '',
    manusUrl: ''
  },
  {
    id: 3,
    title: 'Technical Documentation',
    author: 'Demo User',
    category: 'documents',
    description: 'プロジェクトの技術仕様書を自動生成。Manusの文書作成能力を活用。',
    imageUrl: '',
    workUrl: '',
    manusUrl: ''
  },
  {
    id: 4,
    title: 'AI Art Collection',
    author: 'Demo User',
    category: 'creative',
    description: 'Manusを使って制作したクリエイティブ作品集。',
    imageUrl: '',
    workUrl: '',
    manusUrl: ''
  }
];

// State
let galleryWorks = [];
let filteredWorks = [];
let currentFilter = 'all';

// Initialize Gallery
function initGallery() {
  const galleryGrid = document.getElementById('gallery-grid');
  if (!galleryGrid) return;

  // Set up filter button events
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      setActiveFilter(category);
      filterWorks(category);
    });
  });

  // Set up modal events
  const workModal = document.getElementById('work-modal');
  if (workModal) {
    workModal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    workModal.querySelector('.modal-close').addEventListener('click', closeModal);

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && workModal.classList.contains('open')) {
        closeModal();
      }
    });
  }

  // Set up retry button
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', fetchWorks);
  }

  // Fetch works data
  fetchWorks();
}

// Fetch works from Google Apps Script API
async function fetchWorks() {
  showLoading();

  // Use demo data if API_URL is not set
  if (!GALLERY_CONFIG.API_URL && GALLERY_CONFIG.demoMode) {
    setTimeout(() => {
      galleryWorks = [...DEMO_WORKS];
      filteredWorks = [...galleryWorks];
      renderWorks();
    }, 500);
    return;
  }

  if (!GALLERY_CONFIG.API_URL) {
    showEmpty();
    return;
  }

  try {
    const response = await fetch(GALLERY_CONFIG.API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    galleryWorks = data.works || [];
    filteredWorks = [...galleryWorks];

    if (galleryWorks.length === 0) {
      showEmpty();
    } else {
      renderWorks();
    }
  } catch (error) {
    console.error('Failed to fetch works:', error);
    showError();
  }
}

// Show loading state
function showLoading() {
  const galleryLoading = document.getElementById('gallery-loading');
  const galleryError = document.getElementById('gallery-error');
  const galleryEmpty = document.getElementById('gallery-empty');
  const galleryGrid = document.getElementById('gallery-grid');

  if (galleryLoading) galleryLoading.style.display = 'flex';
  if (galleryError) galleryError.style.display = 'none';
  if (galleryEmpty) galleryEmpty.style.display = 'none';
  if (galleryGrid) galleryGrid.style.display = 'none';
}

// Show error state
function showError() {
  const galleryLoading = document.getElementById('gallery-loading');
  const galleryError = document.getElementById('gallery-error');
  const galleryEmpty = document.getElementById('gallery-empty');
  const galleryGrid = document.getElementById('gallery-grid');

  if (galleryLoading) galleryLoading.style.display = 'none';
  if (galleryError) galleryError.style.display = 'block';
  if (galleryEmpty) galleryEmpty.style.display = 'none';
  if (galleryGrid) galleryGrid.style.display = 'none';
}

// Show empty state
function showEmpty() {
  const galleryLoading = document.getElementById('gallery-loading');
  const galleryError = document.getElementById('gallery-error');
  const galleryEmpty = document.getElementById('gallery-empty');
  const galleryGrid = document.getElementById('gallery-grid');

  if (galleryLoading) galleryLoading.style.display = 'none';
  if (galleryError) galleryError.style.display = 'none';
  if (galleryEmpty) galleryEmpty.style.display = 'block';
  if (galleryGrid) galleryGrid.style.display = 'none';
}

// Set active filter button
function setActiveFilter(category) {
  currentFilter = category;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
}

// Filter works by category
function filterWorks(category) {
  if (category === 'all') {
    filteredWorks = [...galleryWorks];
  } else {
    filteredWorks = galleryWorks.filter(work => work.category === category);
  }
  renderWorks();
}

// Render works to grid
function renderWorks() {
  const galleryLoading = document.getElementById('gallery-loading');
  const galleryError = document.getElementById('gallery-error');
  const galleryEmpty = document.getElementById('gallery-empty');
  const galleryGrid = document.getElementById('gallery-grid');

  if (galleryLoading) galleryLoading.style.display = 'none';
  if (galleryError) galleryError.style.display = 'none';
  if (galleryEmpty) galleryEmpty.style.display = 'none';
  if (galleryGrid) galleryGrid.style.display = 'grid';

  if (filteredWorks.length === 0) {
    galleryGrid.innerHTML = `
      <div class="gallery-no-results" style="grid-column: 1 / -1; text-align: center; padding: 48px;">
        <p style="color: var(--color-gray-500);">
          このカテゴリの作品はまだありません。
        </p>
      </div>
    `;
    return;
  }

  galleryGrid.innerHTML = filteredWorks.map((work, index) => createWorkCard(work, index)).join('');

  // Add click events to cards
  galleryGrid.querySelectorAll('.gallery-card').forEach((card, index) => {
    card.addEventListener('click', () => openModal(filteredWorks[index]));
  });

  // Fade-in animation
  const cards = galleryGrid.querySelectorAll('.gallery-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

// Create work card HTML
function createWorkCard(work, index) {
  const categoryLabel = GALLERY_CONFIG.categories[work.category] || work.category;
  const imageHtml = work.imageUrl
    ? `<img src="${escapeHtml(work.imageUrl)}" alt="${escapeHtml(work.title)}" loading="lazy">`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
       </svg>`;

  return `
    <article class="gallery-card" data-index="${index}">
      <div class="gallery-card-image ${work.imageUrl ? '' : 'no-image'}">
        ${imageHtml}
      </div>
      <div class="gallery-card-content">
        <span class="gallery-card-category">${escapeHtml(categoryLabel)}</span>
        <h4 class="gallery-card-title">${escapeHtml(work.title)}</h4>
        <p class="gallery-card-author">by ${escapeHtml(work.author)}</p>
      </div>
    </article>
  `;
}

// Open modal with work details (preview mode first)
function openModal(work) {
  const modal = document.getElementById('work-modal');
  if (!modal) return;

  const categoryLabel = GALLERY_CONFIG.categories[work.category] || work.category;

  // Update modal content
  const modalImage = document.getElementById('modal-image');
  const modalCategory = document.getElementById('modal-category');
  const modalTitle = document.getElementById('modal-title');
  const modalAuthor = document.getElementById('modal-author');
  const modalDescription = document.getElementById('modal-description');
  const modalTwitter = document.getElementById('modal-twitter');
  const modalDetail = document.getElementById('modal-detail');
  const toggleDetailBtn = document.getElementById('modal-toggle-detail');
  const workLink = document.getElementById('modal-work-link');

  if (modalImage) {
    modalImage.src = work.imageUrl || '';
    modalImage.alt = work.title;
  }
  if (modalCategory) modalCategory.textContent = categoryLabel;
  if (modalTitle) modalTitle.textContent = work.title;
  if (modalAuthor) modalAuthor.textContent = `by ${work.author}`;

  // Description with line breaks preserved
  if (modalDescription) {
    modalDescription.innerHTML = escapeHtml(work.description || '').replace(/\n/g, '<br>');
  }

  // X account link
  if (modalTwitter) {
    if (work.twitter) {
      const twitterHandle = work.twitter.replace('@', '');
      modalTwitter.innerHTML = `<a href="https://x.com/${escapeHtml(twitterHandle)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(twitterHandle)}</a>`;
    } else {
      modalTwitter.textContent = '';
    }
  }

  // Reset detail section to hidden
  if (modalDetail) {
    modalDetail.style.display = 'none';
  }
  if (toggleDetailBtn) {
    toggleDetailBtn.textContent = '詳細を見る';
    toggleDetailBtn.onclick = () => toggleDetail(work);
  }

  // Set up work link (with URL validation for security)
  if (workLink) {
    const safeWorkUrl = sanitizeUrl(work.workUrl);
    if (safeWorkUrl) {
      workLink.href = safeWorkUrl;
      workLink.style.display = 'inline-flex';
    } else {
      workLink.style.display = 'none';
    }
  }

  // Handle missing image
  const modalImageContainer = modal.querySelector('.modal-image');
  const modalBody = modal.querySelector('.modal-body');
  if (modalImageContainer && modalBody) {
    if (!work.imageUrl) {
      modalImageContainer.style.display = 'none';
      modalBody.style.gridTemplateColumns = '1fr';
    } else {
      modalImageContainer.style.display = 'block';
      modalBody.style.gridTemplateColumns = window.innerWidth > 768 ? '1fr 1fr' : '1fr';
    }
  }

  // Open modal
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Toggle detail view - expand to full modal
function toggleDetail(work) {
  const modal = document.getElementById('work-modal');
  const modalDetail = document.getElementById('modal-detail');
  const toggleDetailBtn = document.getElementById('modal-toggle-detail');
  const modalBody = modal.querySelector('.modal-body');
  const modalImage = document.getElementById('modal-image');
  const modalImageContainer = modal.querySelector('.modal-image');
  const modalContent = modal.querySelector('.modal-content');

  if (modalDetail && toggleDetailBtn) {
    if (modalDetail.style.display === 'none') {
      // 詳細表示モードに切り替え
      modalDetail.style.display = 'block';
      toggleDetailBtn.textContent = '詳細を隠す';

      // モーダルを拡大
      modalContent.classList.add('modal-expanded');
      modalBody.style.gridTemplateColumns = '1fr';

      // 画像をフルサイズで表示
      if (modalImageContainer) {
        modalImageContainer.classList.add('modal-image-expanded');
      }
    } else {
      // プレビューモードに戻す
      modalDetail.style.display = 'none';
      toggleDetailBtn.textContent = '詳細を見る';

      // モーダルを縮小
      modalContent.classList.remove('modal-expanded');
      if (window.innerWidth > 768) {
        modalBody.style.gridTemplateColumns = '1fr 1fr';
      }

      // 画像を元に戻す
      if (modalImageContainer) {
        modalImageContainer.classList.remove('modal-image-expanded');
      }
    }
  }
}

// Close modal
function closeModal() {
  const modal = document.getElementById('work-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// HTML escape helper
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// URL validation helper - prevents XSS via malicious URL schemes
function isValidUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return false;

  // Trim and check for empty
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'なし。' || trimmed === 'なし') return false;

  // Allowed schemes (default: http and https only)
  const allowedSchemes = options.allowedSchemes || ['http:', 'https:'];

  try {
    const parsed = new URL(trimmed, location.origin);
    return allowedSchemes.includes(parsed.protocol);
  } catch (e) {
    // Invalid URL
    return false;
  }
}

// Sanitize URL - returns null if invalid
function sanitizeUrl(url) {
  if (!isValidUrl(url)) return null;
  return url.trim();
}

// Initialize gallery when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('gallery-grid')) {
    initGallery();
  }
});
