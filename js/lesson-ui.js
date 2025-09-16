// js/lesson-ui.js
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const lessonButtons = document.querySelectorAll('.btn-lesson');
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const userPhotoEl = document.getElementById('user-photo');

  // User progress
  function getUserProgress() {
    return JSON.parse(localStorage.getItem('userProgress') || '{}');
  }

  function setUserProgress(p) {
    localStorage.setItem('userProgress', JSON.stringify(p));
  }

  // Saldo
  function getSaldo() {
    return parseInt(localStorage.getItem('saldo') || '0', 10);
  }

  function setSaldo(v) {
    localStorage.setItem('saldo', v);
  }

  // Recent activities
  function addRecentActivity(action, time) {
    const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
    activities.unshift({ action, time: new Date(time).toLocaleString('id-ID') });
    if (activities.length > 5) activities.pop();
    localStorage.setItem('recentActivities', JSON.stringify(activities));
  }

  // Populate user
  function populateUser(user) {
    if (!user) return;
    if (userNameEl) userNameEl.textContent = user.displayName || 'Pengguna';
    if (userEmailEl) userEmailEl.textContent = user.email || '-';
    if (userPhotoEl && user.photoURL) userPhotoEl.src = user.photoURL;
  }

  // Firebase auth check
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        console.log('[Auth] No user authenticated. Redirecting to index.html.');
        window.location.href = 'index.html';
        return;
      }
      console.log('[Auth] User authenticated:', user.email);
      populateUser(user);
    });
  } else {
    console.warn('[Auth] Firebase not detected. Running in dev preview mode.');
    populateUser({ displayName: 'Tamu', email: 'tamu@example.com' });
  }

  // Timer logic
  let timerInterval = null;
  let timeRemaining = 10 * 60 * 1000; // 10 menit dalam ms
  let minutesCompleted = 0;
  let currentSubject = null;
  let slotEndTime = null;

  function formatTime(ms) {
    if (ms < 0) ms = 0;
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function triggerAd() {
    // Placeholder untuk iklan popunder Monetag
    console.log('[Monetag] Iklan popunder ditampilkan');
    // Ganti dengan skrip Monetag sebenarnya, misalnya:
    // window.open('https://monetag-ad-url', '_blank');
  }

  function startReading(subject, subjectName, slotStart, slotEnd) {
    currentSubject = subject;
    slotEndTime = new Date(slotEnd);
    lessonListSection.classList.remove('active');
    lessonReadSection.classList.add('active');
    readingTitle.textContent = `Membaca: ${subjectName}`;
    readingContent.textContent = `Ini adalah konten placeholder untuk ${subjectName}. Bacalah materi ini selama 10 menit untuk mendapatkan poin.`;

    const progress = getUserProgress();
    const today = new Date().toISOString().split('T')[0];
    const lessonProgress = progress[`lesson_${subject}`] || { minutes: 0, date: today, slotStart };

    if (lessonProgress.date === today && lessonProgress.slotStart === slotStart) {
      minutesCompleted = lessonProgress.minutes;
      timeRemaining = Math.max(0, (10 - lessonProgress.minutes) * 60 * 1000);
    } else {
      minutesCompleted = 0;
      timeRemaining = 10 * 60 * 1000;
    }

    timerEl.textContent = formatTime(timeRemaining);
    continueReadingBtn.textContent = timeRemaining > 0 ? 'Lanjutkan Membaca' : 'Baca Lagi (Tanpa Poin)';
    continueReadingBtn.disabled = false;

    if (timeRemaining > 0 && new Date() <= slotEndTime) {
      timerInterval = setInterval(() => {
        timeRemaining -= 1000;
        timerEl.textContent = formatTime(timeRemaining);

        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          minutesCompleted = 10;
          progress[`lesson_${subject}`] = { minutes: 10, date: today, slotStart, points: 500 };
          setUserProgress(progress);
          addRecentActivity(`Selesai Membaca: ${subjectName} (+500 poin)`, new Date());
          alert(`✅ Selesai membaca ${subjectName}! (+500 poin)`);
          continueReadingBtn.textContent = 'Baca Lagi (Tanpa Poin)';
          continueReadingBtn.disabled = false;
        } else if (timeRemaining % (60 * 1000) === 0) {
          minutesCompleted++;
          triggerAd();
          const points = minutesCompleted * 50;
          progress[`lesson_${subject}`] = { minutes: minutesCompleted, date: today, slotStart, points };
          setUserProgress(progress);
          addRecentActivity(`Membaca ${subjectName} (${minutesCompleted} menit, +50 poin)`, new Date());
          alert(`✅ ${minutesCompleted} menit selesai untuk ${subjectName}! (+50 poin)`);
        }

        // Cek apakah slot waktu masih aktif
        if (new Date() > slotEndTime) {
          clearInterval(timerInterval);
          continueReadingBtn.textContent = 'Slot Waktu Berakhir';
          continueReadingBtn.disabled = true;
        }
      }, 1000);
    } else if (new Date() > slotEndTime) {
      continueReadingBtn.textContent = 'Slot Waktu Berakhir';
      continueReadingBtn.disabled = true;
    }
  }

  // Continue reading (tanpa poin setelah selesai)
  continueReadingBtn.addEventListener('click', () => {
    if (timeRemaining > 0 && new Date() <= slotEndTime) {
      // Timer sudah berjalan, biarkan berlanjut
      return;
    } else {
      // Membaca bebas tanpa poin
      readingContent.textContent = `Anda membaca ${readingTitle.textContent.replace('Membaca: ', '')} tanpa poin tambahan.`;
      timerEl.textContent = 'Bebas';
      continueReadingBtn.disabled = true;
    }
  });

  // Reset daily progress at 00:00 WIB
  function resetDailyProgress() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilReset = tomorrow - now;

    setTimeout(() => {
      const progress = getUserProgress();
      for (let key in progress) {
        if (key.startsWith('lesson_')) {
          delete progress[key];
        }
      }
      setUserProgress(progress);
      console.log('[Daily Reset] Lesson progress reset at 00:00 WIB');
      setInterval(resetDailyProgress, 24 * 60 * 60 * 1000);
    }, timeUntilReset);
  }
  resetDailyProgress();

  console.log('[lesson-ui] Initialized');
});
