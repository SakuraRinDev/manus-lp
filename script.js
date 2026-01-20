// ========================================
// Manus Works Collection - LP Scripts
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all animations and interactions
  initHeroVideo();
  initScrollAnimations();
  initSmoothScroll();
  initNavbarScroll();
  initHeroAnimation();
  initBackgroundMusic();
});

// ========================================
// Background Music
// ========================================

function initBackgroundMusic() {
  const bgMusic = document.getElementById('bg-music');
  const musicControl = document.getElementById('music-control');

  console.log('initBackgroundMusic called', { bgMusic, musicControl });

  if (!bgMusic || !musicControl) {
    console.error('Missing elements:', { bgMusic, musicControl });
    return;
  }

  // Set volume to 0.6
  bgMusic.volume = 0.6;

  // Music control button handler
  musicControl.addEventListener('click', () => {
    console.log('Music control clicked, paused:', bgMusic.paused);
    if (bgMusic.paused) {
      bgMusic.play().then(() => {
        console.log('Music started playing');
        musicControl.classList.add('playing');
      }).catch((err) => {
        console.error('Failed to play music:', err);
      });
    } else {
      console.log('Music paused');
      bgMusic.pause();
      musicControl.classList.remove('playing');
    }
  });

  // Try to play immediately (may be blocked by browser)
  const playPromise = bgMusic.play();

  if (playPromise !== undefined) {
    playPromise.then(() => {
      // Autoplay succeeded
      musicControl.classList.add('playing');
    }).catch(() => {
      // Autoplay was blocked, wait for user interaction
      const startMusic = () => {
        bgMusic.play().then(() => {
          musicControl.classList.add('playing');
        }).catch(() => { });
        document.removeEventListener('click', startMusic);
        document.removeEventListener('touchstart', startMusic);
        document.removeEventListener('keydown', startMusic);
      };

      document.addEventListener('click', startMusic, { once: true });
      document.addEventListener('touchstart', startMusic, { once: true });
      document.addEventListener('keydown', startMusic, { once: true });
    });
  }
}

// ========================================
// Hero Background Video
// ========================================

const HERO_VIDEOS = {
  // Vertical videos (416x752) - for mobile
  mobile: [
    'Assets/background/mobile/grok-video-10f48f98-0e4c-4b16-879e-204d971305f9.mp4',
    'Assets/background/mobile/grok-video-17d08758-2de1-4818-92af-06aa31e3f83a.mp4',
    'Assets/background/mobile/grok-video-29589d91-8794-46aa-bf98-0519e5f1b501.mp4',
    'Assets/background/mobile/grok-video-3f895949-f41c-4a4b-8cdc-5e2767ccac42.mp4',
    'Assets/background/mobile/grok-video-410daabb-48c4-49c7-a2d7-de537b5f6567.mp4',
    'Assets/background/mobile/grok-video-4a05ae35-8237-4e7d-99b1-862acc7ce500.mp4',
    'Assets/background/mobile/grok-video-510c9527-e909-4fca-9219-e29e0dcdabe1.mp4',
    'Assets/background/mobile/grok-video-788f0618-32bc-4a13-819b-0b4a24d1e5e6.mp4',
    'Assets/background/mobile/grok-video-78dbda49-2cfb-4820-b4b1-2700931aa382.mp4',
    'Assets/background/mobile/grok-video-8a18a99a-494f-4e0f-897c-1b877e73001c.mp4',
    'Assets/background/mobile/grok-video-8c1d953e-2d0b-41a6-a744-1ed6cf2d82cb.mp4',
    'Assets/background/mobile/grok-video-a9dca478-5ef0-4f87-8683-7af8aad71491.mp4',
    'Assets/background/mobile/grok-video-b336bc5b-a70d-4938-82a1-31594df351e3.mp4',
    'Assets/background/mobile/grok-video-d4cbc2e0-301e-4914-8cb2-b65001c6ac31.mp4'
  ],
  // Horizontal videos (688x464) - for desktop
  desktop: [
    'Assets/background/desktop/grok-video-2082c614-ee35-4d75-bae5-e234d53b3292.mp4',
    'Assets/background/desktop/grok-video-9fa998d3-3f4a-4cd8-a8ea-56656b0b5765.mp4',
    'Assets/background/desktop/grok-video-e0e4a9b9-04db-41a3-b972-735c447b041a.mp4',
    'Assets/background/desktop/grok-video-e88b4754-8a3c-4599-953b-ba88d3d58422.mp4'
  ]
};

function initHeroVideo() {
  const video = document.getElementById('hero-video');
  if (!video) return;

  let lastVideoSrc = null;

  // Select video based on screen orientation/size (always different from last)
  function selectAndPlayVideo() {
    const isMobile = window.innerWidth <= 768;
    const videos = isMobile ? HERO_VIDEOS.mobile : HERO_VIDEOS.desktop;

    // Filter out the last played video to ensure variety
    const availableVideos = videos.filter(v => v !== lastVideoSrc);
    const videosToChooseFrom = availableVideos.length > 0 ? availableVideos : videos;

    const randomIndex = Math.floor(Math.random() * videosToChooseFrom.length);
    const videoSrc = videosToChooseFrom[randomIndex];

    lastVideoSrc = videoSrc;
    video.src = videoSrc;
    video.load();
    video.play().catch(e => {
      // Autoplay might be blocked, that's okay
      console.log('Video autoplay was prevented:', e);
    });
  }

  // When video ends, play a different one
  video.addEventListener('ended', () => {
    selectAndPlayVideo();
  });

  // Initial video selection
  selectAndPlayVideo();

  // Optionally: Change video on resize (debounced)
  let resizeTimeout;
  let lastIsMobile = window.innerWidth <= 768;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const currentIsMobile = window.innerWidth <= 768;
      // Only change video if we crossed the mobile/desktop threshold
      if (currentIsMobile !== lastIsMobile) {
        lastIsMobile = currentIsMobile;
        selectAndPlayVideo();
      }
    }, 500);
  });
}

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

// Parallax effect for hero video
function initParallax() {
  const heroVideo = document.querySelector('.hero-video');
  if (!heroVideo) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
      heroVideo.style.transform = `translate(-50%, calc(-50% + ${scrollY * 0.2}px))`;
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
  API_URL: 'https://script.google.com/macros/s/AKfycbzJQfZSjB1tdBs_Az7fjznJspkzgTbnrqhP3qAY1nNgG7dAQW3qn4wiAQ3o_gezVyUF/exec',
  // Category mapping
  categories: {
    'apps': 'Apps & Tools',
    'documents': 'Documents',
    'data': 'Data & Analysis',
    'creative': 'Creative',
    'others': 'Others'
  },
  // Demo mode - set to true to show sample data when API_URL is empty
  demoMode: false,
  // Debug mode - set to true to enable detailed logging
  debug: true
};

// ========================================
// Debug Logger for Gallery Images
// ========================================
const GalleryDebug = {
  enabled: GALLERY_CONFIG.debug,

  log(category, message, data = null) {
    if (!this.enabled) return;
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    const prefix = `[Gallery:${category}] ${timestamp}`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  },

  warn(category, message, data = null) {
    if (!this.enabled) return;
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    const prefix = `[Gallery:${category}] ${timestamp}`;
    if (data) {
      console.warn(prefix, message, data);
    } else {
      console.warn(prefix, message);
    }
  },

  error(category, message, data = null) {
    // Errors always log regardless of debug mode
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    const prefix = `[Gallery:${category}] ${timestamp}`;
    if (data) {
      console.error(prefix, message, data);
    } else {
      console.error(prefix, message);
    }
  },

  // Image loading status tracker
  imageStats: {
    total: 0,
    loaded: 0,
    failed: 0,
    pending: 0
  },

  resetImageStats() {
    this.imageStats = { total: 0, loaded: 0, failed: 0, pending: 0 };
  },

  trackImage(status) {
    this.imageStats[status]++;
    this.log('ImageStats', `Status: ${status}`, { ...this.imageStats });
  },

  printImageReport() {
    const { total, loaded, failed, pending } = this.imageStats;
    console.log('%c=== Gallery Image Load Report ===', 'font-weight: bold; color: #2196F3');
    console.log(`Total: ${total} | Loaded: ${loaded} | Failed: ${failed} | Pending: ${pending}`);
    console.log(`Success Rate: ${total > 0 ? ((loaded / total) * 100).toFixed(1) : 0}%`);
  }
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
  GalleryDebug.log('API', 'Fetching works from API...');
  GalleryDebug.resetImageStats();
  showLoading();

  // Use demo data if API_URL is not set
  if (!GALLERY_CONFIG.API_URL && GALLERY_CONFIG.demoMode) {
    GalleryDebug.log('API', 'Using demo data (no API URL)');
    setTimeout(() => {
      galleryWorks = [...DEMO_WORKS];
      filteredWorks = [...galleryWorks];
      renderWorks();
    }, 500);
    return;
  }

  if (!GALLERY_CONFIG.API_URL) {
    GalleryDebug.warn('API', 'No API URL configured');
    showEmpty();
    return;
  }

  try {
    GalleryDebug.log('API', 'Requesting:', GALLERY_CONFIG.API_URL);
    const startTime = performance.now();
    const response = await fetch(GALLERY_CONFIG.API_URL);
    const fetchTime = performance.now() - startTime;

    GalleryDebug.log('API', `Response received in ${fetchTime.toFixed(0)}ms`, {
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    GalleryDebug.log('API', 'Data parsed', {
      success: data.success,
      count: data.count,
      worksCount: data.works?.length
    });

    if (data.error) {
      throw new Error(data.error);
    }

    galleryWorks = data.works || [];
    filteredWorks = [...galleryWorks];

    // Log each work's image URL for debugging
    galleryWorks.forEach((work, i) => {
      GalleryDebug.log('Work', `[${i}] ${work.title}`, {
        imageUrl: work.imageUrl,
        author: work.author,
        category: work.category
      });
    });

    if (galleryWorks.length === 0) {
      GalleryDebug.warn('API', 'No works returned from API');
      showEmpty();
    } else {
      renderWorks();
    }
  } catch (error) {
    GalleryDebug.error('API', 'Failed to fetch works', error);
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
  GalleryDebug.log('Render', `Rendering ${filteredWorks.length} works`);
  GalleryDebug.resetImageStats();

  const galleryLoading = document.getElementById('gallery-loading');
  const galleryError = document.getElementById('gallery-error');
  const galleryEmpty = document.getElementById('gallery-empty');
  const galleryGrid = document.getElementById('gallery-grid');

  if (galleryLoading) galleryLoading.style.display = 'none';
  if (galleryError) galleryError.style.display = 'none';
  if (galleryEmpty) galleryEmpty.style.display = 'none';
  if (galleryGrid) galleryGrid.style.display = 'grid';

  if (filteredWorks.length === 0) {
    GalleryDebug.log('Render', 'No works to display');
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

  // Monitor image loading for each card
  const images = galleryGrid.querySelectorAll('.gallery-card-image img');
  GalleryDebug.log('Render', `Monitoring ${images.length} images`);

  images.forEach((img, index) => {
    const work = filteredWorks[index];
    if (work) {
      monitorImageLoad(img, work.title);
    }
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
  const rawImageUrl = convertToAccessibleImageUrl(work.imageUrl);
  const validImageUrl = isValidUrl(rawImageUrl) ? rawImageUrl : null;
  const imageHtml = validImageUrl
    ? `<img src="${escapeHtml(validImageUrl)}" alt="${escapeHtml(work.title)}" loading="lazy">`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
       </svg>`;

  return `
    <article class="gallery-card" data-index="${index}">
      <div class="gallery-card-image ${validImageUrl ? '' : 'no-image'}">
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
  const modalHeaderAuthor = document.getElementById('modal-header-author');
  const modalAvatar = document.getElementById('modal-avatar');
  const modalDescription = document.getElementById('modal-description');
  const modalTwitter = document.getElementById('modal-twitter');
  const workLink = document.getElementById('modal-work-link');

  const rawImageUrl = convertToAccessibleImageUrl(work.imageUrl);
  const validImageUrl = isValidUrl(rawImageUrl) ? rawImageUrl : '';
  if (modalImage) {
    modalImage.src = validImageUrl;
    modalImage.alt = work.title;
  }
  if (modalCategory) modalCategory.textContent = categoryLabel;
  if (modalTitle) modalTitle.textContent = work.title;

  // Set header author and avatar
  if (modalHeaderAuthor) modalHeaderAuthor.textContent = work.author;
  if (modalAvatar) {
    // Simple colored avatar with first letter
    const firstLetter = (work.author || '?').charAt(0).toUpperCase();
    modalAvatar.textContent = firstLetter;
    // Random-ish color based on author name length
    const colors = ['#FF9800', '#2196F3', '#9C27B0', '#E91E63', '#4CAF50'];
    const colorIndex = (work.author || '').length % colors.length;
    modalAvatar.style.backgroundColor = colors[colorIndex];
  }

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

// Convert Google Drive URL to thumbnail format (most reliable as of 2024-2025)
// See docs/GOOGLE_DRIVE_IMAGE_URL_GUIDE.md for details
function convertToAccessibleImageUrl(url) {
  if (!url || typeof url !== 'string') {
    GalleryDebug.warn('URL', 'convertToAccessibleImageUrl: Invalid input', { url });
    return url;
  }

  const trimmed = url.trim();
  const originalUrl = trimmed;
  let detectedFormat = 'unknown';
  let fileId = null;

  // 1. Check if already lh3 format - convert to thumbnail (lh3 is unreliable)
  if (trimmed.includes('lh3.googleusercontent.com')) {
    detectedFormat = 'lh3';
    const lh3Match = trimmed.match(/lh3\.googleusercontent\.com\/d\/([^=\/]+)/);
    if (lh3Match) {
      fileId = lh3Match[1];
    }
  }

  // 2. Check thumbnail?id=XXX format (already optimal)
  if (!fileId) {
    const thumbnailMatch = trimmed.match(/drive\.google\.com\/thumbnail\?.*id=([^&]+)/);
    if (thumbnailMatch) {
      detectedFormat = 'thumbnail';
      fileId = thumbnailMatch[1];
    }
  }

  // 3. Check ?id= or &id= format
  if (!fileId) {
    const idParamMatch = trimmed.match(/[?&]id=([^&]+)/);
    if (idParamMatch) {
      detectedFormat = 'id_param';
      fileId = idParamMatch[1];
    }
  }

  // 4. Check /file/d/XXX/ format
  if (!fileId) {
    const fileDMatch = trimmed.match(/\/file\/d\/([^\/]+)/);
    if (fileDMatch) {
      detectedFormat = 'file_d';
      fileId = fileDMatch[1];
    }
  }

  // 5. Check /d/XXX/view format
  if (!fileId) {
    const dViewMatch = trimmed.match(/\/d\/([^\/]+)\/view/);
    if (dViewMatch) {
      detectedFormat = 'd_view';
      fileId = dViewMatch[1];
    }
  }

  // 6. Check /uc?export= format
  if (!fileId) {
    const ucMatch = trimmed.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
    if (ucMatch) {
      detectedFormat = 'uc_export';
      fileId = ucMatch[1];
    }
  }

  // Convert to thumbnail format if we found a file ID
  if (fileId) {
    const resultUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    GalleryDebug.log('URL', 'Converted URL', {
      original: originalUrl.substring(0, 80) + (originalUrl.length > 80 ? '...' : ''),
      detectedFormat,
      fileId,
      result: resultUrl
    });
    return resultUrl;
  }

  // Return original URL if not a Google Drive URL
  GalleryDebug.log('URL', 'Non-Drive URL, keeping original', {
    url: trimmed.substring(0, 80) + (trimmed.length > 80 ? '...' : '')
  });
  return trimmed;
}

// ========================================
// Image Load Monitoring
// ========================================

/**
 * Monitor image loading and track success/failure
 * @param {HTMLImageElement} img - The image element to monitor
 * @param {string} workTitle - Title of the work for logging
 */
function monitorImageLoad(img, workTitle) {
  const startTime = performance.now();
  GalleryDebug.imageStats.total++;
  GalleryDebug.imageStats.pending++;

  const onLoad = () => {
    const loadTime = performance.now() - startTime;
    GalleryDebug.imageStats.pending--;

    if (img.naturalWidth > 0) {
      GalleryDebug.imageStats.loaded++;
      GalleryDebug.log('Image', `LOADED: "${workTitle}"`, {
        loadTime: `${loadTime.toFixed(0)}ms`,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        src: img.src.substring(0, 60) + '...'
      });
    } else {
      GalleryDebug.imageStats.failed++;
      GalleryDebug.warn('Image', `ZERO_WIDTH: "${workTitle}"`, {
        loadTime: `${loadTime.toFixed(0)}ms`,
        src: img.src
      });
    }

    checkAllImagesLoaded();
    cleanup();
  };

  const onError = (e) => {
    const loadTime = performance.now() - startTime;
    GalleryDebug.imageStats.pending--;
    GalleryDebug.imageStats.failed++;

    GalleryDebug.error('Image', `FAILED: "${workTitle}"`, {
      loadTime: `${loadTime.toFixed(0)}ms`,
      src: img.src,
      error: e.type || 'unknown'
    });

    checkAllImagesLoaded();
    cleanup();
  };

  const cleanup = () => {
    img.removeEventListener('load', onLoad);
    img.removeEventListener('error', onError);
  };

  img.addEventListener('load', onLoad);
  img.addEventListener('error', onError);

  // If image is already complete (cached), trigger appropriate handler
  if (img.complete) {
    if (img.naturalWidth > 0) {
      onLoad();
    } else {
      onError({ type: 'cached_error' });
    }
  }
}

/**
 * Check if all images are loaded and print report
 */
function checkAllImagesLoaded() {
  const { total, pending } = GalleryDebug.imageStats;
  if (pending === 0 && total > 0) {
    setTimeout(() => GalleryDebug.printImageReport(), 100);
  }
}

/**
 * Debug utility: Test all URL formats for a given file ID
 * Call from console: testDriveUrlFormats('your-file-id')
 */
window.testDriveUrlFormats = async function(fileId) {
  console.log('%c=== Testing Google Drive URL Formats ===', 'font-weight: bold; color: #4CAF50');
  console.log('File ID:', fileId);

  const formats = [
    { name: 'thumbnail', url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` },
    { name: 'thumbnail_s4000', url: `https://drive.google.com/thumbnail?id=${fileId}&sz=s4000` },
    { name: 'lh3', url: `https://lh3.googleusercontent.com/d/${fileId}=w1000` },
    { name: 'lh3_s', url: `https://lh3.googleusercontent.com/d/${fileId}=s1000` },
    { name: 'uc_view', url: `https://drive.google.com/uc?export=view&id=${fileId}` },
  ];

  for (const format of formats) {
    const img = new Image();
    const result = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ success: false, error: 'timeout' }), 5000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve({
          success: img.naturalWidth > 0,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve({ success: false, error: 'load_error' });
      };

      img.src = format.url;
    });

    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${format.name}:`, result);
    console.log(`   URL: ${format.url}`);
  }
};

/**
 * Debug utility: Check all gallery images
 * Call from console: checkGalleryImages()
 */
window.checkGalleryImages = function() {
  const imgs = document.querySelectorAll('.gallery-card-image img');
  console.log('%c=== Gallery Image Status ===', 'font-weight: bold; color: #2196F3');

  imgs.forEach((img, i) => {
    const status = img.naturalWidth > 0 ? '✅' : '❌';
    console.log(`${status} [${i}]`, {
      alt: img.alt,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      src: img.src
    });
  });
};

// Initialize gallery when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('gallery-grid')) {
    initGallery();
  }
});
