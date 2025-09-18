// js/lesson-detail.js
document.addEventListener('DOMContentLoaded', () => {
  const lessonTitle = document.getElementById('lesson-title');
  const lessonContent = document.getElementById('lesson-content');
  const timerDisplay = document.getElementById('timer');
  const pointsEarned = document.getElementById('points-earned');
  const exitToggle = document.getElementById('exit-toggle');
  const exitMenu = document.getElementById('exit-menu');
  const themeToggle = document.getElementById('theme-toggle');
  const reloadTimer = document.getElementById('reload-timer');
  const pageIndicator = document.getElementById('page-indicator');

  let timerInterval;
  let timeRemaining = 10 * 60 * 1000; // 10 menit dalam ms
  let minutesCompleted = 0;
  let points = 0;
  let isTabActive = true;
  let currentPage = 0;
  let pages = [];
  let isDragging = false;
  let startX = 0;
  let startTouchX = 0;

  // Tentukan sesi berdasarkan waktu WIB
  function getCurrentSession() {
    const now = new Date();
    const hours = now.getHours();
    let date = now.toISOString().split('T')[0]; // Tanggal YYYY-MM-DD
    let sessionName;

    if (hours >= 6 && hours < 9) {
      sessionName = 'Pagi1';
    } else if (hours >= 9 && hours < 12) {
      sessionName = 'Pagi2';
    } else if (hours >= 12 && hours < 15) {
      sessionName = 'Siang';
    } else if (hours >= 15 && hours < 18) {
      sessionName = 'Sore';
    } else if (hours >= 18 && hours < 21) {
      sessionName = 'Malam';
    } else {
      sessionName = 'Pagi1';
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      date = tomorrow.toISOString().split('T')[0];
    }
    return { sessionName, sessionKey: `session_${sessionName}_${date}`, date };
  }

  // Inisialisasi sesi
  const { sessionName, sessionKey, date } = getCurrentSession();
  let currentSessionKey = localStorage.getItem('currentSessionKey') || sessionKey;

  // Cek sesi baru
  const savedSessionDate = localStorage.getItem('currentSessionDate');
  const savedSessionKey = localStorage.getItem('currentSessionKey');
  if (savedSessionDate !== date || savedSessionKey !== sessionKey) {
    localStorage.setItem('currentSessionDate', date);
    localStorage.setItem('currentSessionKey', sessionKey);
    const progress = getUserProgress();
    delete progress.sessionCompleted;
    delete progress[`sessionTimer_${currentSessionKey}`];
    setUserProgress(progress);
  }
  localStorage.setItem('currentSessionKey', currentSessionKey);

  // Dark/Light Mode
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.toggle('dark', savedTheme === 'dark');
  themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  });

  // Get lesson ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('id');

  if (!lessonId) {
    lessonTitle.textContent = 'Error';
    lessonContent.innerHTML = '<div class="page active" data-page="0"><p>ID pelajaran tidak ditemukan di URL.</p></div><div id="page-indicator" class="page-indicator">Halaman 1</div>';
    pages = ['<p>ID pelajaran tidak ditemukan di URL.</p>'];
    updatePageNavigation();
    console.error('[Lesson Detail] No lesson ID provided in URL');
    return;
  }

  async function loadLesson() {
    try {
      console.log('[Lesson Detail] Fetching lessons.json...');
      const response = await fetch('data/lessons.json');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const lessons = await response.json();
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson) {
        lessonTitle.textContent = lesson.title;
        lessonTitle.dataset.fullTitle = lesson.title;
        const fullContent = lesson.fullContent || '<p>Konten pelajaran belum tersedia.</p>';
        console.log('[Lesson Detail] Full content loaded:', fullContent);
        splitContentIntoPages(fullContent);
      } else {
        lessonTitle.textContent = 'Pelajaran Tidak Ditemukan';
        lessonContent.innerHTML = '<div class="page active" data-page="0"><p>Pelajaran dengan ID ini tidak ditemukan.</p></div><div id="page-indicator" class="page-indicator">Halaman 1</div>';
        pages = ['<p>Pelajaran dengan ID ini tidak ditemukan.</p>'];
        updatePageNavigation();
        console.error('[Lesson Detail] No lesson found with id:', lessonId);
      }
    } catch (err) {
      console.error('[Lesson Detail] Failed to load lesson:', err.message);
      lessonTitle.textContent = 'Error';
      lessonTitle.dataset.fullTitle = 'Error';
      lessonContent.innerHTML = '<div class="page active" data-page="0"><p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid.</p></div><div id="page-indicator" class="page-indicator">Halaman 1</div>';
      pages = ['<p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid.</p>'];
      updatePageNavigation();
    }
  }

  // Pecah konten menjadi halaman berdasarkan tinggi layar
  function splitContentIntoPages(content) {
    console.log('[splitContentIntoPages] Starting with content:', content);
    lessonContent.innerHTML = ''; // Kosongkan konten
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = lessonContent.offsetWidth + 'px';
    tempDiv.style.padding = '15px';
    tempDiv.style.fontSize = '1rem';
    tempDiv.style.lineHeight = '1.8';
    tempDiv.style.fontFamily = '"Nunito", sans-serif';
    tempDiv.style.color = document.body.classList.contains('dark') ? '#9ca3af' : '#4b5563';
    document.body.appendChild(tempDiv);

    // Wrap seluruh konten dalam <div> untuk memastikan parsing
    tempDiv.innerHTML = `<div>${content}</div>`;
    const contentDiv = tempDiv.firstElementChild;
    const paragraphs = Array.from(contentDiv.childNodes).filter(node => node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim()));
    console.log('[splitContentIntoPages] Elements found:', paragraphs.length);

    let currentPageContent = '';
    let pageHeight = 0;
    const maxHeight = window.innerHeight - 120; // Tinggi maksimum per halaman
    pages = [];

    paragraphs.forEach((el, index) => {
      let elContent;
      if (el.nodeType === 1) {
        elContent = el.outerHTML;
      } else {
        elContent = `<p>${el.textContent.trim()}</p>`;
      }
      tempDiv.innerHTML = `<div>${currentPageContent + elContent}</div>`;
      const newHeight = tempDiv.firstElementChild.scrollHeight;
      console.log(`[splitContentIntoPages] Element ${index}, newHeight: ${newHeight}, maxHeight: ${maxHeight}`);
      if (newHeight > maxHeight && currentPageContent) {
        pages.push(currentPageContent);
        console.log(`[splitContentIntoPages] Page ${pages.length} created with content length: ${currentPageContent.length}`);
        currentPageContent = elContent;
        pageHeight = newHeight;
      } else {
        currentPageContent += elContent;
        pageHeight = newHeight;
      }
    });

    // Tambahkan halaman terakhir
    if (currentPageContent) {
      pages.push(currentPageContent);
      console.log(`[splitContentIntoPages] Final page created with content length: ${currentPageContent.length}`);
    }

    // Fallback jika tidak ada halaman
    if (pages.length === 0) {
      pages.push('<p>Konten tidak dapat dipisah menjadi halaman. Silakan periksa data.</p>');
      console.warn('[splitContentIntoPages] No pages created, using fallback content');
    }

    document.body.removeChild(tempDiv);
    console.log('[splitContentIntoPages] Total pages:', pages.length);

    // Tampilkan halaman
    lessonContent.innerHTML = pages.map((page, index) => 
      `<div class="page ${index === 0 ? 'active' : ''}" data-page="${index}">${page}</div>`
    ).join('') + `<div id="page-indicator" class="page-indicator">Halaman ${currentPage + 1} / ${pages.length}</div>`;
    currentPage = 0;

    // Tambahkan pesan sesi selesai jika diperlukan
    const progress = getUserProgress();
    if (progress.sessionCompleted) {
      lessonContent.innerHTML = '<div class="page active" data-page="0"><p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p></div><div id="page-indicator" class="page-indicator">Halaman 1</div>';
      pages = ['<p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p>'];
      console.log('[splitContentIntoPages] Session completed, showing message');
    }

    updatePageNavigation();
  }

  // Perbarui indikator halaman
  function updatePageNavigation() {
    const indicator = lessonContent.querySelector('#page-indicator');
    indicator.textContent = `Halaman ${currentPage + 1} / ${pages.length}`;
  }

  // Navigasi ke halaman berikutnya
  function goToNextPage() {
    if (currentPage < pages.length - 1) {
      const current = lessonContent.querySelector(`.page[data-page="${currentPage}"]`);
      current.classList.remove('active');
      current.classList.add('prev');
      currentPage++;
      const next = lessonContent.querySelector(`.page[data-page="${currentPage}"]`);
      next.classList.add('active');
      setTimeout(() => current.classList.remove('prev'), 600); // Reset setelah animasi
      updatePageNavigation();
    }
  }

  // Navigasi ke halaman sebelumnya
  function goToPrevPage() {
    if (currentPage > 0) {
      const current =
