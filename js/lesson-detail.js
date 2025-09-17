// js/lesson-detail.js
document.addEventListener('DOMContentLoaded', () => {
  const lessonTitle = document.getElementById('lesson-title');
  const lessonContent = document.getElementById('lesson-content');
  const startTimerBtn = document.getElementById('start-timer');
  const stopTimerBtn = document.getElementById('stop-timer');
  const timerDisplay = document.getElementById('timer');
  const exitToggle = document.getElementById('exit-toggle');
  const exitMenu = document.getElementById('exit-menu');

  let timerInterval;
  let seconds = 0;
  let isTimerRunning = false;

  // Get lesson ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('id');

  // Load lesson data
  async function loadLesson() {
    try {
      const response = await fetch('data/lessons.json');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const lessons = await response.json();
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson) {
        lessonTitle.textContent = lesson.title;
        lessonContent.innerHTML = lesson.fullContent || '<p>Konten pelajaran belum tersedia.</p>';
      } else {
        lessonTitle.textContent = 'Pelajaran Tidak Ditemukan';
        lessonContent.innerHTML = '<p>Pelajaran dengan ID ini tidak ditemukan.</p>';
      }
    } catch (err) {
      console.error('[Lesson Detail] Failed to load lesson:', err.message);
      lessonTitle.textContent = 'Error';
      lessonContent.innerHTML = '<p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada.</p>';
    }
  }

  // Timer logic
  function updateTimer() {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (seconds >= 600) { // 10 menit
      stopTimer();
      showPopup('Selesai membaca! Anda mendapatkan 500 poin!');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }

  function startTimer() {
    if (!isTimerRunning) {
      isTimerRunning = true;
      startTimerBtn.disabled = true;
      stopTimerBtn.disabled = false;
      timerInterval = setInterval(updateTimer, 1000);
    }
  }

  function stopTimer() {
    if (isTimerRunning) {
      isTimerRunning = false;
      clearInterval(timerInterval);
      startTimerBtn.disabled = false;
      stopTimerBtn.disabled = true;
      const points = Math.min(seconds * 50, 500); // 50 poin/menit, maks 500
      showPopup(`Anda mendapatkan ${points} poin!`);
      confetti({ particleCount: 50, spread: 60 });
    }
  }

  function showPopup(message) {
    const popup = document.createElement('div');
    popup.className = 'game-popup';
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => {
      popup.classList.add('show');
      setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
      }, 2000);
    }, 100);
  }

  // Event listeners
  startTimerBtn.addEventListener('click', startTimer);
  stopTimerBtn.addEventListener('click', stopTimer);

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

  // Load lesson
  loadLesson();
});
