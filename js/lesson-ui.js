// js/lesson-ui.js
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const exitToggle = document.getElementById('exit-toggle');
  const exitMenu = document.getElementById('exit-menu');
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

  // Render lessons with pagination and filters
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
      pageData.forEach(lesson => {
        const card = document.createElement('div');
        card.className = 'lesson-card';
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

  // Search suggestions (autocomplete)
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

  // Exit dropdown
  exitToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = exitMenu.classList.toggle('show');
    exitMenu.setAttribute('aria-hidden', !isShown);
  });

  document.addEventListener('click', (e) => {
    if (!exitMenu.contains(e.target) && e.target !== exitToggle) {
      exitMenu.classList.remove('show');
      exitMenu.setAttribute('aria-hidden', 'true');
    }
  });

  // Load lessons
  loadLessons();
});
