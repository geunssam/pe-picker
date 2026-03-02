/**
 * PEPick Landing Page — Main Script
 * Intersection Observer animations + Nav highlight + Smooth scroll + Mobile menu
 */

// ── Reveal Animation (Intersection Observer) ──
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Nav Shadow on Scroll ──
const nav = document.getElementById('landing-nav');

const handleNavScroll = () => {
  if (window.scrollY > 10) {
    nav.classList.add('landing-nav--scrolled');
  } else {
    nav.classList.remove('landing-nav--scrolled');
  }
};

window.addEventListener('scroll', handleNavScroll, { passive: true });
handleNavScroll();

// ── Nav Tab Highlight (Intersection Observer) ──
const navLinks = document.querySelectorAll('.landing-nav__link[data-section]');
const sections = document.querySelectorAll('.landing-section[id]');

const sectionObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('landing-nav__link--active', link.dataset.section === id);
        });
      }
    });
  },
  {
    rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--landing-nav-h')) || 64}px 0px -50% 0px`,
  }
);

sections.forEach(sec => sectionObserver.observe(sec));

// ── Smooth Scroll with Nav Offset ──
const NAV_HEIGHT =
  parseInt(getComputedStyle(document.documentElement).getPropertyValue('--landing-nav-h')) || 64;

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    const targetId = anchor.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    if (!target) return;

    const top = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT;
    window.scrollTo({ top, behavior: 'smooth' });

    // 모바일 드로워 닫기
    closeDrawer();
  });
});

// ── Mobile Hamburger Menu ──
const hamburgerBtn = document.getElementById('hamburger-btn');
const drawer = document.getElementById('nav-drawer');

const closeDrawer = () => {
  drawer.classList.remove('landing-nav__drawer--open');
};

hamburgerBtn.addEventListener('click', () => {
  drawer.classList.toggle('landing-nav__drawer--open');
});

// 드로워 외부 클릭 시 닫기
document.addEventListener('click', e => {
  if (
    drawer.classList.contains('landing-nav__drawer--open') &&
    !drawer.contains(e.target) &&
    !hamburgerBtn.contains(e.target)
  ) {
    closeDrawer();
  }
});
