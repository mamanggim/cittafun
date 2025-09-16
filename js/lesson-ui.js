// js/lesson-ui.js
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  const profileToggle = document.getElementById('profile-menu-toggle');
  const profileMenu = document.getElementById('profile-menu');
  const logoutBtn = document.getElementById('logout-btn-2');
  const themeToggle = document.getElementById('theme-toggle');
  const lessonsGrid = document.querySelector('.lessons-grid');
  const searchInput = document.getElementById('search-input');
  const jenjangFilter = document.getElementById('jenjang-filter');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  let lessonsData = [];
  let currentPage = 1;
  const itemsPerPage = 10;

  // Load lessons from JSON
  async function loadLessons() {
    try {
      const response = await fetch('data/lessons.json');
      lessonsData = await response.json();
      renderLessons();
    } catch (err) {
      console.error('[Lessons] Failed to load lessons:', err.message);
      lessonsGrid.innerHTML = '<p>Gagal memuat pelajaran.</p>';
    }
  }

  // Render lessons with pagination and filters
  function renderLessons() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const jenjang = jenjangFilter ? jenjangFilter.value : '';
    const filteredData = lessonsData.filter(lesson => {
      return (
        lesson.title.toLowerCase().includes(searchTerm) &&
        (jenjang === '' || lesson.jenjang === jenjang)
      );
    });

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredData.slice(start, end);

    lessonsGrid.innerHTML = '';
    pageData.forEach(lesson => {
      const card = document.createElement('div');
      card.className = 'mission-card'; // Reuse mission-card style from dashboard.css
      card.innerHTML = `
        <h4>${lesson.title}</h4>
        <p>${lesson.description}</p>
        <button class="btn btn-lesson" data-id="${lesson.id}">Baca</button>
      `;
      lessonsGrid.appendChild(card);
    });

    // Update pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages || 1}`;
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages || totalPages === 0;

    // Add click handlers for lesson buttons
    document.querySelectorAll('.btn-lesson').forEach(btn => {
      btn.addEventListener('click', () => {
        const lessonId = btn.dataset.id;
        const lesson = lessonsData.find(l => l.id == lessonId);
        showLessonContent(lesson);
      });
    });
  }

  // Show lesson content (placeholder for reading page)
  function showLessonContent(lesson) {
    // Placeholder: In production, redirect to a reading page or show modal
    const modal = document.createElement('div');
    modal.className = 'game-popup';
    modal.style.background = 'var(--card-bg)';
    modal.style.padding = '20px';
    modal.style.maxWidth = '600px';
    modal.innerHTML = `
      <h3>${lesson.title}</h3>
      <p>${lesson.content}</p>
      <button class="btn" onclick="this.parentElement.remove()">Tutup</button>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  }

  // Pagination handlers
  prevPage.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderLessons();
    }
  });

  nextPage.addEventListener('click', () => {
    const totalPages = Math.ceil(lessonsData.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderLessons();
    }
  });

  // Search and filter handlers
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    renderLessons();
  });

  jenjangFilter.addEventListener('change', () => {
    currentPage = 1;
    renderLessons();
  });

  // Sidebar and profile (reused from dashboard-ui.js)
  function setInitialSidebarState() {
    if (window.innerWidth <= 900) {
      sidebar.classList.add('closed');
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
    } else {
      sidebar.classList.add('open');
      sidebar.classList.remove('closed');
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }
  setInitialSidebarState();

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setInitialSidebarState, 120);
  });

  function openSidebar() {
    sidebar.classList.remove('closed');
    sidebar.classList.add('open');
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebar.classList.add('closed');
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  sidebarToggle.addEventListener('click', (e) => {
    e.preventDefault();
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  });

  overlay.addEventListener('click', (e) => {
    e.preventDefault();
    closeSidebar();
  });

  profileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = profileMenu.classList.toggle('show');
    profileMenu.setAttribute('aria-hidden', !isShown);
  });

  document.addEventListener('click', (e) => {
    if (!profileMenu.contains(e.target) && e.target !== profileToggle) {
      profileMenu.classList.remove('show');
      profileMenu.setAttribute('aria-hidden', 'true');
    }
  });

  // Theme toggle
  function applyTheme(mode) {
    if (mode === 'dark') {
      document.body.classList.add('dark');
      themeToggle.textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      themeToggle.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    }
  }

  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isDark = document.body.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
  });

  // Logout handler
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    logoutBtn.disabled = true;
    try {
      await firebase.auth().signOut();
      window.location.href = 'index.html';
    } catch (err) {
      console.error('[Logout] Failed:', err.message);
      window.location.href = 'index.html';
    } finally {
      logoutBtn.disabled = false;
    }
  });

  // Firebase auth check
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'index.html';
    } else {
      document.getElementById('user-name').textContent = user.displayName || 'Pengguna';
      document.getElementById('user-email').textContent = user.email || '-';
      if (user.photoURL) document.getElementById('user-photo').src = user.photoURL;
    }
  });

  // Initialize
  loadLessons();
  console.log('[lesson-ui] Initialized');
});
