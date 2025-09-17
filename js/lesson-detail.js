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
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageIndicator = document.getElementById('page-indicator');

  let timerInterval;
  let timeRemaining = 10 * 60 * 1000; // 10 menit dalam ms
  let minutesCompleted = 0;
  let points = 0;
  let isTabActive = true;
  let currentPage = 0;
  let pages = [];

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
      // Di luar sesi (21:00–05:59 WIB), anggap sesi berikutnya Pagi 1 hari berikutnya
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
    // Hapus status sessionCompleted dan semua timer saat sesi baru
    const progress = getUserProgress();
    delete progress.sessionCompleted;
    Object.keys(progress).forEach(key => {
      if (key.startsWith('lessonTimer_')) {
        delete progress[key];
      }
    });
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
    lessonContent.innerHTML = '<div class="page active"><p>ID pelajaran tidak ditemukan di URL.</p></div>';
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
        splitContentIntoPages(fullContent);
      } else {
        lessonTitle.textContent = 'Pelajaran Tidak Ditemukan';
        lessonContent.innerHTML = '<div class="page active"><p>Pelajaran dengan ID ini tidak ditemukan.</p></div>';
        pages = ['<p>Pelajaran dengan ID ini tidak ditemukan.</p>'];
        updatePageNavigation();
        console.error('[Lesson Detail] No lesson found with id:', lessonId);
      }
    } catch (err) {
      console.error('[Lesson Detail] Failed to load lesson:', err.message);
      lessonTitle.textContent = 'Error';
      lessonTitle.dataset.fullTitle = 'Error';
      lessonContent.innerHTML = '<div class="page active"><p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid.</p></div>';
      pages = ['<p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid.</p>'];
      updatePageNavigation();
    }
  }

  // Pecah konten menjadi halaman berdasarkan tinggi layar
  function splitContentIntoPages(content) {
    lessonContent.innerHTML = ''; // Kosongkan konten
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = lessonContent.offsetWidth + 'px';
    tempDiv.style.padding = '15px';
    tempDiv.style.fontSize = '1rem';
    tempDiv.style.lineHeight = '1.8';
    document.body.appendChild(tempDiv);
    
    tempDiv.innerHTML = content;
    const paragraphs = Array.from(tempDiv.children).filter(p => p.tagName === 'P');
    
    let currentPageContent = '';
    let pageHeight = 0;
    const maxHeight = window.innerHeight - 120; // Tinggi maksimum per halaman
    pages = [];

    paragraphs.forEach(p => {
      tempDiv.innerHTML = currentPageContent + p.outerHTML;
      const newHeight = tempDiv.offsetHeight;
      if (newHeight > maxHeight && currentPageContent) {
        // Simpan halaman saat ini dan mulai baru
        pages.push(currentPageContent);
        currentPageContent = p.outerHTML;
        pageHeight = p.offsetHeight || 30;
      } else {
        currentPageContent += p.outerHTML;
        pageHeight = newHeight;
      }
    });

    // Tambahkan halaman terakhir
    if (currentPageContent) {
      pages.push(currentPageContent);
    }

    document.body.removeChild(tempDiv);

    // Tampilkan halaman
    lessonContent.innerHTML = pages.map((page, index) => 
      `<div class="page ${index === 0 ? 'active' : ''}" data-page="${index}">${page}</div>`
    ).join('');
    currentPage = 0;

    // Tambahkan pesan sesi selesai jika diperlukan
    const progress = getUserProgress();
    if (progress.sessionCompleted) {
      lessonContent.innerHTML = '<div class="page active" data-page="0"><p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p></div>';
      pages = ['<p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p>'];
    }

    updatePageNavigation();
  }

  // Perbarui navigasi halaman
  function updatePageNavigation() {
    pageIndicator.textContent = `Halaman ${currentPage + 1} / ${pages.length}`;
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = currentPage === pages.length - 1;
  }

  // Navigasi halaman
  nextPageBtn.addEventListener('click', () => {
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
  });

  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      const current = lessonContent.querySelector(`.page[data-page="${currentPage}"]`);
      current.classList.remove('active');
      current.classList.add('next');
      currentPage--;
      const prev = lessonContent.querySelector(`.page[data-page="${currentPage}"]`);
      prev.classList.add('active');
      setTimeout(() => current.classList.remove('next'), 600); // Reset setelah animasi
      updatePageNavigation();
    }
  });

  // Title Popup
  lessonTitle.addEventListener('click', () => {
    const fullTitle = lessonTitle.dataset.fullTitle || lessonTitle.textContent;
    const popup = document.createElement('div');
    popup.className = 'title-popup';
    popup.textContent = fullTitle;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('show'), 10);
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 300);
    }, 3000); // Popup 3 detik
  });

  function formatTime(ms) {
    if (ms < 0) ms = 0;
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function triggerAd() {
    console.log('[Monetag] Iklan popunder ditampilkan');
    // Ganti dengan skrip Monetag sebenarnya, misalnya:
    // window.open('https://monetag-ad-url', '_blank');
  }

  function showFloatingPoints(pointsToAdd) {
    const pointsRect = pointsEarned.getBoundingClientRect();
    const floatEl = document.createElement('span');
    floatEl.className = 'floating-points';
    floatEl.textContent = `+${pointsToAdd}`;
    floatEl.style.position = 'absolute';
    floatEl.style.left = `${pointsRect.left + pointsRect.width / 2}px`;
    floatEl.style.top = `${pointsRect.top + 30}px`;
    document.body.appendChild(floatEl);

    let opacity = 1;
    let y = 30;
    const animate = () => {
      y -= 1;
      opacity -= 0.02;
      floatEl.style.transform = `translate(-50%, ${-y}px)`;
      floatEl.style.opacity = opacity;
      if (y <= 0 || opacity <= 0) {
        floatEl.remove();
      } else {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  function showGamePopup(message) {
    const popup = document.createElement('div');
    popup.className = 'game-popup';
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('show'), 10);
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 300);
    }, 4000); // Popup durasi 4 detik
  }

  function savePoints(pointsToAdd) {
    const progress = getUserProgress();
    progress.points = (progress.points || 0) + pointsToAdd;
    setUserProgress(progress);
  }

  function getUserProgress() {
    return JSON.parse(localStorage.getItem('userProgress') || '{}');
  }

  function setUserProgress(p) {
    localStorage.setItem('userProgress', JSON.stringify(p));
  }

  function startTimer() {
    const progress = getUserProgress();
    const timerKey = `lessonTimer_${lessonId}_${currentSessionKey}`;

    // Cek apakah sesi sudah selesai secara global
    if (progress.sessionCompleted) {
      timerDisplay.textContent = '00:00';
      pointsEarned.textContent = `Poin: 500`;
      splitContentIntoPages('<p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p>');
      return;
    }

    timeRemaining = progress[timerKey]?.remaining || 10 * 60 * 1000;
    minutesCompleted = Math.floor((10 * 60 * 1000 - timeRemaining) / (60 * 1000));
    points = minutesCompleted * 50;
    pointsEarned.textContent = `Poin: ${points}`;

    timerDisplay.textContent = formatTime(timeRemaining);
    timerInterval = setInterval(() => {
      if (isTabActive) {
        timeRemaining -= 1000;
        timerDisplay.textContent = formatTime(timeRemaining);
        progress[timerKey] = { remaining: timeRemaining };
        setUserProgress(progress);

        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          progress.sessionCompleted = true; // Tandai sesi selesai secara global
          setUserProgress(progress);
          showGamePopup('Waktu membaca selesai! Anda mendapatkan 500 poin.');
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, duration: 2000 });
          points = 500;
          pointsEarned.textContent = `Poin: ${points}`;
          savePoints(500);
          setTimeout(() => {
            window.location.href = 'dashboard.html#section-missions';
          }, 4000);
        } else if (timeRemaining % (60 * 1000) === 0) {
          minutesCompleted++;
          triggerAd();
          showFloatingPoints(50);
          showGamePopup('1 menit selesai! +50 poin');
          confetti({ particleCount: 50, spread: 60, duration: 2000 });
          points += 50;
          pointsEarned.textContent = `Poin: ${points}`;
          savePoints(50);
        }
      }
    }, 1000);
  }

  // Reload page
  reloadTimer.addEventListener('click', () => {
    window.location.reload(); // Refresh browser
  });

  // Jeda timer ketika tab tidak aktif
  document.addEventListener('visibilitychange', () => {
    isTabActive = document.visibilityState === 'visible';
    if (!isTabActive && timerInterval) {
      clearInterval(timerInterval);
      const progress = getUserProgress();
      progress[`lessonTimer_${lessonId}_${currentSessionKey}`] = { remaining: timeRemaining };
      setUserProgress(progress);
    } else if (isTabActive && !timerInterval) {
      startTimer(); // Lanjutkan timer saat tab aktif kembali
    }
  });

  // Stop timer when page is closed
  window.addEventListener('beforeunload', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      const progress = getUserProgress();
      progress[`lessonTimer_${lessonId}_${currentSessionKey}`] = { remaining: timeRemaining };
      setUserProgress(progress);
    }
  });

  // Automatically start timer on load
  loadLesson();
  startTimer();

  // Exit dropdown
  exitToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = exitMenu.classList.toggle('show');
    exitToggle.classList.toggle('active', isShown);
    exitMenu.setAttribute('aria-hidden', !isShown);
  });

  document.addEventListener('click', (e) => {
    if (!exitMenu.contains(e.target) && e.target !== exitToggle) {
      exitMenu.classList.remove('show');
      exitToggle.classList.remove('active');
      exitMenu.setAttribute('aria-hidden', 'true');
    }
  });
});
