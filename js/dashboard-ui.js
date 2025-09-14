// CHAT-0910B-DASH-SEC1-JS
// Dashboard UI: toggle sidebar, profile menu, nav routing, auth-check

(() => {
  // Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  const profileToggle = document.getElementById('profile-menu-toggle');
  const profileMenu = document.getElementById('profile-menu');
  const logoutBtns = document.querySelectorAll('#logout-btn, #logout-btn-2');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  // sidebar open/close for mobile
  function openSidebar() {
    sidebar.classList.remove('closed');
    sidebar.classList.add('open');
    overlay.classList.add('show');
  }
  function closeSidebar() {
    sidebar.classList.add('closed');
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }

  // init state: closed on small screens
  if (window.innerWidth <= 900) {
    sidebar.classList.add('closed');
  }

  // toggle button
  sidebarToggle?.addEventListener('click', () => {
    const closed = sidebar.classList.contains('closed');
    if (closed) openSidebar(); else closeSidebar();
  });

  overlay?.addEventListener('click', closeSidebar);

  // profile menu toggle
  profileToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle('show');
  });

  // close profile menu on outside click
  document.addEventListener('click', (e) => {
    if (!profileMenu.contains(e.target) && e.target !== profileToggle) {
      profileMenu.classList.remove('show');
    }
  });

  // nav link switching (single-page simple)
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const target = link.getAttribute('data-section');
      sections.forEach(sec => {
        sec.classList.toggle('active', sec.id === `section-${target}`);
      });

      // close sidebar on mobile after navigation
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  // logout handlers (if firebase available)
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.firebase && firebase.auth) {
        try {
          await firebase.auth().signOut();
        } catch (err) {
          console.warn('Logout error', err);
        }
      }
      // redirect to index (login)
      window.location.href = 'index.html';
    });
  });

  // AUTH check & populate user info if firebase is initialized
  function populateUser(user) {
    if (!user) return;
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const photoEl = document.getElementById('user-photo');

    if (nameEl) nameEl.textContent = user.displayName || 'Pengguna';
    if (emailEl) emailEl.textContent = user.email || '-';
    if (photoEl && user.photoURL) photoEl.src = user.photoURL;
  }

  // If firebase exists, attach auth listener and load user data (and small Firestore read for extra)
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        // not logged in -> back to landing
        window.location.href = 'index.html';
        return;
      }
      populateUser(user);

      // example: load basic user doc (if you use Firestore users collection)
      try {
        if (firebase.firestore) {
          const db = firebase.firestore();
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists) {
            const data = doc.data();
            // populate points & referral count if available
            const pointsEl = document.getElementById('points-balance');
            const rupEl = document.getElementById('points-rupiah');
            const refEl = document.getElementById('ref-count');
            if (pointsEl && data.points != null) pointsEl.textContent = data.points;
            if (rupEl && data.points != null) rupEl.textContent = `Rp${(data.points/10).toLocaleString('id-ID')}`; // example: 10 poin = Rp1
            if (refEl && data.referralCount != null) refEl.textContent = data.referralCount;
          }
        }
      } catch (err) {
        console.warn('Firestore read error', err);
      }
    });
  } else {
    // If firebase not configured, still allow developer to preview layout (no redirect).
    console.warn('Firebase not detected. For full functionality, add firebase-config.js with initialization.');
  }
})();

// Dark/Light Mode Toggle dari Dropdown
const themeToggle = document.getElementById("theme-toggle");

if (themeToggle) {
  themeToggle.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.toggle("dark-mode");

    // Ganti teks tombol sesuai mode
    if (document.body.classList.contains("dark-mode")) {
      themeToggle.textContent = "☀️ Light Mode";
    } else {
      themeToggle.textContent = "🌙 Dark Mode";
    }
  });
}
