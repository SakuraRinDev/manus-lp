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
    anchor.addEventListener('click', function(e) {
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
