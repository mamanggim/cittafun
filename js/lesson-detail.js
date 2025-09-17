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

  let timerInterval;
  let timeRemaining = 10 * 60 * 1000; // 10 menit dalam ms
  let minutesCompleted = 0;
  let currentSlotKey = localStorage.getItem('currentSlotKey') || 'default';
  let points = 0;
  let isTabActive = true;

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
    lessonContent.innerHTML = '<p>ID pelajaran tidak ditemukan di URL.</p>';
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
        lessonTitle.dataset.fullTitle = lesson.title; // Simpan judul lengkap
        lessonContent.innerHTML = lesson.fullContent || '<p>Konten pelajaran belum tersedia.</p>';
      } else {
        lessonTitle.textContent = 'Pelajaran Tidak Ditemukan';
        lessonContent.innerHTML = '<p>Pelajaran dengan ID ini tidak ditemukan.</p>';
        console.error('[Lesson Detail] No lesson found with id:', lessonId);
      }
    } catch (err) {
      console.error('[Lesson Detail] Failed to load lesson:', err.message);
      lessonTitle.textContent = 'Error';
      lessonContent.innerHTML = '<p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid.</p>';
    }
  }

  // Title Popup
  lessonTitle.addEventListener('click', () => {
    const fullTitle = lessonTitle.dataset.fullTitle || lessonTitle.textContent;
    if (fullTitle.length > 20) { // Hanya tampilkan popup jika judul panjang
      const popup = document.createElement('div');
      popup.className = 'title-popup';
      popup.textContent = fullTitle;
      document.body.appendChild(popup);
      setTimeout(() => popup.classList.add('show'), 10);
      setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
      }, 3000); // Popup 3 detik
    }
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
    const timerKey = `lessonTimer_${currentSlotKey}`;
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
      progress[`lessonTimer_${currentSlotKey}`] = { remaining: timeRemaining };
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
      progress[`lessonTimer_${currentSlotKey}`] = { remaining: timeRemaining };
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
