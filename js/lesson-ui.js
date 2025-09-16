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
  const searchSuggestions = document.getElementById('search-suggestions');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const errorMessage = document.getElementById('error-message');

  let lessonsData = [];
  let currentPage = 1;
  const itemsPerPage = 10;
  let currentSlotKey = localStorage.getItem('currentSlotKey') || '';
  let timeRemaining = 10 * 60 * 1000; // 10 menit dalam ms
  let timerInterval = null;

  // Load lessons from JSON
  async function loadLessons() {
    try {
      const response = await fetch('data/lessons.json');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      lessonsData = await response.json();
      errorMessage.style.display = 'none';
      renderLessons();
    } catch (err) {
      console.error('[Lessons] Failed to load lessons:', err.message);
      errorMessage.textContent = 'Gagal memuat pelajaran. Pastikan file data/lessons.json ada.';
      errorMessage.style.display = 'block';
      lessonsGrid.innerHTML = '';
    }
  }

  // Format time for timer
  function formatTime(ms) {
    if (ms < 0) ms = 0;
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Render lessons with pagination and filters
  function renderLessons() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const jenjang = jenjangFilter ? jenjangFilter.value : '';
    const filteredData = lessonsData.filter(lesson => {
      return (
        (lesson.title.toLowerCase().includes(searchTerm) ||
         lesson.category.toLowerCase().includes(searchTerm)) &&
        (jenjang === '' || lesson.jenjang === jenjang)
      );
    });

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredData.slice(start, end);

    lessonsGrid.innerHTML = '';
    if (pageData.length === 0) {
      lessonsGrid.innerHTML = '<p>Tidak ada pelajaran ditemukan.</p>';
    } else {
      pageData.forEach(lesson => {
        const card = document.createElement('div');
        card.className = 'lesson-card'; // Changed from mission-card to lesson-card
        card.innerHTML = `
          <h4>${lesson.title}</h4>
          <p><strong>${lesson.category}</strong> - ${lesson.jenjang}</p>
          <p>${lesson.description}</p>
          <button class="btn btn-lesson" data-id="${lesson.id}" data-slot="${currentSlotKey}">Baca</button>
        `;
        lessonsGrid.appendChild(card);
      });
    }

    // Update pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;

    // Add click handlers for lesson buttons
    document.querySelectorAll('.btn-lesson').forEach(btn => {
      btn.addEventListener('click', () => {
        const lessonId = btn.dataset.id;
        const slotKey = btn.dataset.slot;
        const lesson = lessonsData.find(l => l.id == lessonId);
        startReading(lesson, slotKey);
      });
    });
  }

  // Search suggestions
  function updateSuggestions() {
    const searchTerm = searchInput.value.toLowerCase();
    searchSuggestions.innerHTML = '';
    if (searchTerm.length < 2) {
      searchSuggestions.classList.remove('show');
      return;
    }

    const suggestions = lessonsData
      .filter(lesson => 
        lesson.title.toLowerCase().includes(searchTerm) || 
        lesson.category.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5) // Limit to 5 suggestions
      .map(lesson => `${lesson.title} - ${lesson.category} (${lesson.jenjang})`);

    if (suggestions.length > 0) {
      suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.textContent = suggestion;
        div.addEventListener('click', () => {
          searchInput.value = suggestion.split(' - ')[0];
          searchSuggestions.classList.remove('show');
          currentPage = 1;
          renderLessons();
        });
        searchSuggestions.appendChild(div);
      });
      searchSuggestions.classList.add('show');
    } else {
      searchSuggestions.classList.remove('show');
    }
  }

  // Timer and reading logic
  function startReading(lesson, slotKey) {
    currentSlotKey = slotKey;
    const progress = JSON.parse(localStorage.getItem('userProgress') || '{}');
    const timerKey = `lessonTimer_${slotKey}`;
    const slotProgress = progress[timerKey] || { remaining: 10 * 60 * 1000, slotStart: new Date().toISOString() };
    timeRemaining = slotProgress.remaining;

    // Create reading popup
    const popup = document.createElement('div');
    popup.className = 'reading-popup';
    popup.innerHTML = `
      <h3>${lesson.title} (${lesson.category})</h3>
      <p>Sisa waktu: <span class="timer">${formatTime(timeRemaining)}</span></p>
      <p>${lesson.content}</p>
      <button class="btn" id="close-popup">Tutup</button>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('show'), 10);

    const timerEl = popup.querySelector('.timer');
    const closeBtn = popup.querySelector('#close-popup');

    // Start or resume timer
    if (timeRemaining > 0) {
      timerInterval = setInterval(() => {
        timeRemaining -= 1000;
        timerEl.textContent = formatTime(timeRemaining);
        progress[timerKey] = { remaining: timeRemaining, slotStart: slotProgress.slotStart };
        setUserProgress(progress);

        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          const points = Math.min(500, Math.floor((10 * 60 * 1000 - timeRemaining) / (60 * 1000)) * 50);
          progress[`lesson_${lesson.id}_${slotKey}`] = { completed: true, points, timestamp: new Date().toISOString() };
          setUserProgress(progress);
          addRecentActivity(`Selesai membaca: ${lesson.title} (+${points} poin)`, new Date());
          alert(`✅ Selesai membaca ${lesson.title}! (+${points} poin)`);
          popup.remove();
        }
      }, 1000);
    }

    closeBtn.addEventListener('click', () => {
      clearInterval(timerInterval);
      const points = Math.min(500, Math.floor((10 * 60 * 1000 - timeRemaining) / (60 * 1000)) * 50);
      if (points > 0) {
        progress[`lesson_${lesson.id}_${slotKey}`] = { completed: true, points, timestamp: new Date().toISOString() };
        setUserProgress(progress);
        addRecentActivity(`Membaca: ${lesson.title} (+${points} poin)`, new Date());
      }
      popup.remove();
    });
  }

  // User progress and activities
  function getUserProgress() {
    return JSON.parse(localStorage.getItem('userProgress') || '{}');
  }

  function setUserProgress(p) {
    localStorage.setItem('userProgress', JSON.stringify(p));
  }

  function addRecentActivity(action, time) {
    const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
    activities.unshift({ action, time: new Date(time).toLocaleString('id-ID') });
    if (activities.length > 5) activities.pop();
    localStorage.setItem('recentActivities', JSON.stringify(activities));
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
    updateSuggestions();
    renderLessons();
  });

  jenjangFilter.addEventListener('change', () => {
    currentPage = 1;
    renderLessons();
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
      searchSuggestions.classList.remove('show');
    }
  });

  // Sidebar and profile
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

  sidebarToggle.addEventListener('click', (e) => {
    e.preventDefault();
    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      sidebar.classList.add('closed');
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
    } else {
      sidebar.classList.remove('closed');
      sidebar.classList.add('open');
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'true');
    }
  });

  overlay.addEventListener('click', (e) => {
    e.preventDefault();
    sidebar.classList.remove('open');
    sidebar.classList.add('closed');
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
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
