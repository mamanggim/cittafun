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

  // --- INIT STATE ---
  // pastikan sidebar tertutup di mobile, terbuka di desktop
  function setInitialSidebarState() {
    if (window.innerWidth <= 900) {
      sidebar.classList.add('closed');
      sidebar.classList.remove('open');
    } else {
      sidebar.classList.add('open');
      sidebar.classList.remove('closed');
    }
  }
  setInitialSidebarState();

  // update state kalau resize
  window.addEventListener('resize', setInitialSidebarState);

  // --- SIDEBAR OPEN/CLOSE ---
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

  sidebarToggle?.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay?.addEventListener('click', closeSidebar);

  // --- PROFILE MENU ---
  profileToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!profileMenu.contains(e.target) && e.target !== profileToggle) {
      profileMenu.classList.remove('show');
    }
  });

  // --- NAVIGATION ---
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const target = link.getAttribute('data-section');
      sections.forEach(sec => {
        sec.classList.toggle('active', sec.id === `section-${target}`);
      });

      // close sidebar on mobile
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  // --- LOGOUT ---
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.firebase && firebase.auth) {
        try {
          await firebase.auth().signOut();
        } catch (err) {
          console.warn('Logout error', err);
        }
      }
      window.location.href = 'index.html';
    });
  });

  // --- USER DATA ---
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
        window.location.href = 'index.html';
        return;
      }
      populateUser(user);

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
            if (rupEl && data.points != null) rupEl.textContent = `Rp${(data.points/10).toLocaleString('id-ID')}`;
            if (refEl && data.referralCount != null) refEl.textContent = data.referralCount;
          }
        }
      } catch (err) {
        console.warn('Firestore read error', err);
      }
    });
  } else {
    console.warn('Firebase not detected. Add firebase-config.js for full functionality.');
  }
})();

// --- DARK/LIGHT MODE TOGGLE ---
const toggleDarkMode = document.getElementById("toggle-darkmode");

function applyMode(isDark) {
  if (isDark) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("theme", "dark");
    toggleDarkMode.innerHTML = "☀️ Light Mode";
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
    toggleDarkMode.innerHTML = "🌙 Dark Mode";
  }
}

if (toggleDarkMode) {
  const savedTheme = localStorage.getItem("theme");
  applyMode(savedTheme === "dark");

  toggleDarkMode.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark-mode");
    applyMode(isDark);
  });
}
