// js/lesson-ui.js
document.addEventListener('DOMContentLoaded', () => {
  const lessonsGrid = document.querySelector('.lessons-grid');
  const searchInput = document.getElementById('search-input');
  const jenjangFilter = document.getElementById('jenjang-filter');
  const searchSuggestions = document.getElementById('search-suggestions');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const errorMessage = document.getElementById('error-message');
  const profile = document.getElementById('profile');
  const profileMenu = document.getElementById('profile-menu');
  const userPhoto = document.getElementById('user-photo');
  const loading = document.createElement('div');
  loading.id = 'loading';
  loading.textContent = 'Memuat data...';
  document.body.appendChild(loading);

  let lessonsData = [];
  let currentPage = 1;
  const itemsPerPage = 10;

  // Load Theme from localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.body.classList.add(savedTheme);
  }

  // Sync Theme with Dashboard
  function setTheme(theme) {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
    localStorage.setItem('theme', theme);
  }

  // Load User Photo from Firebase Auth with Redirect
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html'; // Redirect ke login jika belum login
    } else {
      const photoUrl = user.photoURL || 'assets/icons/user-placeholder.png';
      userPhoto.src = photoUrl;
      userPhoto.onerror = () => {
        console.warn('Gagal memuat photo profile, menggunakan placeholder.');
        userPhoto.src = 'assets/icons/user-placeholder.png';
      };
    }
  });

  // Toggle Profile Menu
  profile.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = profileMenu.classList.toggle('show');
    profileMenu.setAttribute('aria-hidden', !isShown);
  });

  document.addEventListener('click', (e) => {
    if (!profile.contains(e.target)) {
      profileMenu.classList.remove('show');
      profileMenu.setAttribute('aria-hidden', 'true');
    }
  });

  async function loadLessons() {
    loading.style.display = 'block';
    try {
      const response = await fetch('data/lessons.json'); // Pastikan path sesuai
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) throw new Error('Data lessons.json kosong atau tidak valid');
      lessonsData = data; // Gunakan 'lessons' sebagai array
      errorMessage.style.display = 'none';
      renderLessons();
    } catch (err) {
      console.error('[Lessons] Failed to load lessons:', err.message);
      errorMessage.textContent = 'Gagal memuat pelajaran. Pastikan file data/lessons.json ada di folder /data/ atau coba lagi nanti.';
      errorMessage.style.display = 'block';
      lessonsGrid.innerHTML = '';
    } finally {
      loading.style.display = 'none';
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
