// js/lesson-detail.js
document.addEventListener('DOMContentLoaded', () => {
  const lessonTitle = document.getElementById('lesson-title');
  const lessonContent = document.getElementById('lesson-content');
  const timerDisplay = document.getElementById('timer');
  const stopReadingBtn = document.getElementById('stop-reading');
  const exitToggle = document.getElementById('exit-toggle');
  const exitMenu = document.getElementById('exit-menu');

  let timerInterval;
  let timeRemaining = 10 * 60 * 1000; // 10 menit dalam ms
  let minutesCompleted = 0;
  let currentSlotKey = localStorage.getItem('currentSlotKey') || '';
  let pointsEarned = 0;

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
      const response = await fetch('data/lessons.json');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const lessons = await response.json();
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson) {
        lessonTitle.textContent = lesson.title;
        lessonContent.innerHTML = lesson.content || '<p>Konten pelajaran belum tersedia.</p>';
      } else {
        lessonTitle.textContent = 'Pelajaran Tidak Ditemukan';
        lessonContent.innerHTML = '<p>Pelajaran dengan ID ini tidak ditemukan.</p>';
      }
    } catch (err) {
      console.error('[Lesson Detail] Failed to load lesson:', err.message);
      lessonTitle.textContent = 'Error';
      lessonContent.innerHTML = '<p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid.</p>';
    }
  }

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

  function showFloatingPoints(points) {
    const timerRect = timerDisplay.getBoundingClientRect();
    const floatEl = document.createElement('span');
    floatEl.className = 'floating-points';
    floatEl.textContent = `+${points}`;
    floatEl.style.position = 'absolute';
    floatEl.style.left = `${timerRect.left + timerRect.width / 2}px`;
    floatEl.style.top = `${timerRect.top - 20}px`;
    document.body.appendChild(floatEl);

    let opacity = 1;
    let y = 0;
    const animate = () => {
      y -= 1;
      opacity -= 0.02;
      floatEl.style.transform = `translate(-50%, ${y}px)`;
      floatEl.style.opacity = opacity;
      if (opacity <= 0) {
        floatEl.remove();
      } else {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  function startTimer() {
    const progress = getUserProgress();
    const timerKey = `lessonTimer_${currentSlotKey}`;
    timeRemaining = progress[timerKey]?.remaining || 10 * 60 * 1000;
    minutesCompleted = Math.floor((10 * 60 * 1000 - timeRemaining) / (60 * 1000));

    timerDisplay.textContent = formatTime(timeRemaining);
    timerInterval = setInterval(() => {
      timeRemaining -= 1000;
      timerDisplay.textContent = formatTime(timeRemaining);
      progress[timerKey] = { remaining: timeRemaining };
      setUserProgress(progress);

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        showGamePopup('Waktu membaca selesai! Anda mendapatkan 500 poin.');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, duration: 4000 }); // Durasi 4 detik
        pointsEarned = 500;
        savePoints(pointsEarned);
      } else if (timeRemaining % (60 * 1000) === 0) {
        minutesCompleted++;
        triggerAd();
        showFloatingPoints(50);
        showGamePopup('1 menit selesai! +50 poin');
        confetti({ particleCount: 50, spread: 60, duration: 4000 });
        pointsEarned += 50;
      }
    }, 1000);
  }

  function savePoints(points) {
    const progress = getUserProgress();
    progress.points = (progress.points || 0) + points;
    setUserProgress(progress);
  }

  function getUserProgress() {
    return JSON.parse(localStorage.getItem('userProgress') || '{}');
  }

  function setUserProgress(p) {
    localStorage.setItem('userProgress', JSON.stringify(p));
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
    }, 2000);
  }

  // Automatically start timer on load
  loadLesson();
  startTimer();

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
});
