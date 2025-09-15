// js/dashboard-ui.js
// CHAT-0910B-DASH-SEC1-JS (robust, DOM-ready, debounced resize, enhanced logout)

document.addEventListener('DOMContentLoaded', () => {
  // Elements (may be null — code handles absence gracefully)
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  const profileToggle = document.getElementById('profile-menu-toggle');
  const profileMenu = document.getElementById('profile-menu');
  const logoutBtn = document.getElementById('logout-btn-2'); // Only #logout-btn-2 exists in HTML
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const sections = Array.from(document.querySelectorAll('.section'));
  const themeToggle = document.getElementById('theme-toggle');

  // Helper: safe addEvent
  function safeAddEvent(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, fn);
  }

  // --- Sidebar initial state & helpers ---
  function setInitialSidebarState() {
    if (!sidebar) return;
    if (window.innerWidth <= 900) {
      sidebar.classList.add('closed');
      sidebar.classList.remove('open');
      if (overlay) {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
      }
    } else {
      sidebar.classList.add('open');
      sidebar.classList.remove('closed');
      if (overlay) {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
      }
    }
  }
  setInitialSidebarState();

  // Debounced resize to avoid flicker
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setInitialSidebarState, 120);
  });

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('closed');
    sidebar.classList.add('open');
    if (overlay) {
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    sidebar.classList.add('closed');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function toggleSidebar() {
    if (!sidebar) return;
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  }

  safeAddEvent(sidebarToggle, 'click', (e) => {
    e.preventDefault();
    toggleSidebar();
  });

  safeAddEvent(overlay, 'click', (e) => {
    e.preventDefault();
    closeSidebar();
  });

  // --- Profile menu ---
  safeAddEvent(profileToggle, 'click', (e) => {
    e.stopPropagation();
    if (!profileMenu) return;
    const isShown = profileMenu.classList.toggle('show');
    profileMenu.setAttribute('aria-hidden', !isShown);
  });

  // Close profile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!profileMenu) return;
    if (!profileMenu.contains(e.target) && e.target !== profileToggle) {
      profileMenu.classList.remove('show');
      profileMenu.setAttribute('aria-hidden', 'true');
    }
  });

  // --- Navigation (single-page-ish) ---
  if (navLinks.length && sections.length) {
    navLinks.forEach(link => {
      safeAddEvent(link, 'click', (e) => {
        e.preventDefault();

        // active class on nav
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        const key = link.getAttribute('data-section');

        // primary try: match id = section-{key}
        let matched = false;
        if (key) {
          sections.forEach(sec => {
            const expectedId = `section-${key}`;
            if (sec.id === expectedId) {
              sec.classList.add('active');
              matched = true;
            } else {
              sec.classList.remove('active');
            }
          });

          // fallback: find any section whose id contains the key substring
          if (!matched) {
            sections.forEach(sec => {
              if (sec.id.includes(key)) {
                sec.classList.add('active');
                matched = true;
              } else {
                sec.classList.remove('active');
              }
            });
          }
        }

        // if still not matched, show first section
        if (!matched) {
          sections.forEach((sec, idx) => sec.classList.toggle('active', idx === 0));
          console.warn(`No section found for data-section="${key}". Falling back to first section.`);
        }

        // auto-close sidebar on mobile
        if (window.innerWidth <= 900) closeSidebar();
      });
    });
  }

  // --- Logout handler ---
  if (logoutBtn) {
    let isLoggingOut = false; // Debounce flag
    safeAddEvent(logoutBtn, 'click', async (e) => {
      e.preventDefault();
      if (isLoggingOut) return; // Prevent multiple clicks
      isLoggingOut = true;
      console.log('[Logout] Initiating logout process...');

      if (window.firebase && firebase.auth) {
        try {
          if (firebase.auth().currentUser) {
            console.log('[Logout] User is authenticated, signing out...');
            await firebase.auth().signOut();
            console.log('[Logout] Firebase sign-out successful.');
            window.location.href = 'index.html';
          } else {
            console.warn('[Logout] No authenticated user found. Redirecting to index.html.');
            window.location.href = 'index.html';
          }
        } catch (err) {
          console.error('[Logout] Firebase sign-out failed:', err.message);
          window.location.href = 'index.html'; // Redirect even on error to avoid staying on dashboard
        }
      } else {
        console.warn('[Logout] Firebase not detected. Simulating logout in dev preview mode (no redirect).');
      }
      isLoggingOut = false;
    });
  } else {
    console.warn('[Logout] Logout button (#logout-btn-2) not found in DOM.');
  }

  // --- Populate user (if firebase available) ---
  function populateUser(user) {
    if (!user) return;
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const photoEl = document.getElementById('user-photo');

    if (nameEl) nameEl.textContent = user.displayName || 'Pengguna';
    if (emailEl) emailEl.textContent = user.email || '-';
    if (photoEl && user.photoURL) photoEl.src = user.photoURL;
  }

  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        console.log('[Auth] No user authenticated. Redirecting to index.html.');
        window.location.href = 'index.html';
        return;
      }
      console.log('[Auth] User authenticated:', user.email);
      populateUser(user);

      // optional firestore read (safe)
      try {
        if (firebase.firestore) {
          const db = firebase.firestore();
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists) {
            const data = doc.data();
            const pointsEl = document.getElementById('points-balance');
            const rupEl = document.getElementById('points-rupiah');
            const refEl = document.getElementById('ref-count');
            if (pointsEl && data.points != null) pointsEl.textContent = data.points;
            if (rupEl && data.points != null) rupEl.textContent = `Rp${(data.points / 10).toLocaleString('id-ID')}`;
            if (refEl && data.referralCount != null) refEl.textContent = data.referralCount;
          }
        }
      } catch (err) {
        console.warn('[Firestore] Read error:', err.message);
      }
    });
  } else {
    console.warn('[Auth] Firebase not detected. Authentication and Firestore functionality unavailable. Running in dev preview mode.');
  }

  // --- Theme (dark / light) toggle & persist ---
  function applyTheme(mode) {
    if (!mode) mode = 'light';
    if (mode === 'dark') {
      document.body.classList.add('dark-mode');
      if (themeToggle) themeToggle.textContent = '☀️ Light Mode';
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      if (themeToggle) themeToggle.textContent = '🌙 Dark Mode';
      localStorage.setItem('theme', 'light');
    }
  }

  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  safeAddEvent(themeToggle, 'click', (e) => {
    e.preventDefault();
    const isDark = document.body.classList.contains('dark-mode');
    applyTheme(isDark ? 'light' : 'dark');
  });

  // --- finished init ---
  console.log('[dashboard-ui] Initialized');
});

// --- REFERRAL COUNTDOWN ---
function updateCountdowns() {
  const slots = document.querySelectorAll(".referral-slot");
  const now = new Date();

  slots.forEach(slot => {
    const startStr = slot.getAttribute("data-start");
    const endStr = slot.getAttribute("data-end");
    const countdownEl = slot.querySelector(".countdown");

    if (!countdownEl) return;

    // Buat jam hari ini
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);

    const start = new Date(now);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(now);
    end.setHours(eh, em, 59, 999);

    if (now < start) {
      // Belum mulai
      const diff = start - now;
      countdownEl.textContent = "⏳ Mulai dalam " + formatTime(diff);
    } else if (now >= start && now <= end) {
      // Sedang berlangsung
      const diff = end - now;
      countdownEl.textContent = "⏳ Sisa waktu " + formatTime(diff);
    } else {
      // Sudah lewat
      countdownEl.textContent = "❌ Sudah berakhir";
    }
  });
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

setInterval(updateCountdowns, 1000);
updateCountdowns();
