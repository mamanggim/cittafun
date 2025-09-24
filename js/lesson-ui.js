// js/lesson-ui.js
document.addEventListener('DOMContentLoaded', () => {
  const profile = document.getElementById('profile');
  const profileMenu = document.getElementById('profile-menu');
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

  // Update UI berdasarkan autentikasi Firebase
  import { auth } from './firebase-config.js';

  function updateUI(user) {
    const profilePhoto = document.getElementById('profile-photo');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');

    if (user) {
      profilePhoto.src = user.photoURL || 'https://via.placeholder.com/40';
      userName.textContent = user.displayName || 'Pengguna';
      userRole.textContent = 'Pengguna';
    } else {
      profilePhoto.src = 'https://via.placeholder.com/40';
      userName.textContent = 'Nama Pengguna';
      userRole.textContent = 'Pengguna';
      window.location.href = 'index.html'; // Redirect ke login jika tidak ada user
    }
  }

  auth.onAuthStateChanged(updateUI);

  // Toggle Profile Menu
  profile.addEventListener('click', (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!profile.contains(e.target)) {
      profileMenu.classList.remove('show');
    }
  });

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

  function renderLessons() {
    const searchTerm = searchInput.value.toLowerCase();
    const jenjang = jenjangFilter.value;
    const filteredData = lessonsData.filter(lesson => {
      return (
        (lesson.title.toLowerCase().includes(searchTerm) ||
         lesson.description.toLowerCase().includes(searchTerm)) &&
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
      pageData.forEach((lesson, index) => {
        const card = document.createElement('div');
        card.className = 'lesson-card';
        card.style.setProperty('--index', index);
        card.innerHTML = `
          <h4>${lesson.title}</h4>
          <p>${lesson.description}</p>
          <a href="lesson-detail.html?id=${lesson.id}" class="btn">Mulai Baca</a>
        `;
        lessonsGrid.appendChild(card);
      });
    }

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;
  }

  function updateSuggestions() {
    const searchTerm = searchInput.value.toLowerCase();
    searchSuggestions.innerHTML = '';
    if (searchTerm.length < 2) {
      searchSuggestions.classList.remove('show');
      return;
    }

    const suggestions = lessonsData.filter(lesson => lesson.title.toLowerCase().includes(searchTerm)).slice(0, 5);
    if (suggestions.length > 0) {
      suggestions.forEach(lesson => {
        const div = document.createElement('div');
        div.textContent = lesson.title;
        div.addEventListener('click', () => {
          searchInput.value = lesson.title;
          searchSuggestions.classList.remove('show');
          renderLessons();
        });
        searchSuggestions.appendChild(div);
      });
      searchSuggestions.classList.add('show');
    } else {
      searchSuggestions.classList.remove('show');
    }
  }

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

  loadLessons();
});
